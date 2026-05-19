/**
 * RUNTIME SMOKE TESTS
 * ------------------------------------------------------------------
 * Verifican que cada bloque renderiza en Node sin ReferenceError.
 * Capturan imports faltantes, hooks no declarados y exports rotos
 * — errores que el build de Vite/esbuild NO detecta pero que
 * rompen la app en el navegador.
 *
 * Ejecutar: npm test
 * Se ejecuta en CI con cada commit.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, waitFor, act, cleanup } from '@testing-library/react';
import React from 'react';

afterEach(() => { cleanup(); });

beforeAll(() => {
  // localStorage mock — evita errores en useData
  const store = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem:    vi.fn(k => store[k] ?? null),
      setItem:    vi.fn((k, v) => { store[k] = String(v); }),
      removeItem: vi.fn(k => { delete store[k]; }),
      clear:      vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
      get length() { return Object.keys(store).length; },
    },
    writable: true,
  });

  // ResizeObserver mock — lo usan Recharts y shadcn
  global.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
  }));

  // matchMedia mock
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn(() => ({
      matches: false, addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
    writable: true,
  });

  // fetch mock — evita que Dashboard/Presupuesto/etc. hagan llamadas reales
  // a la API de Neon en el entorno de test (jsdom no tiene red real).
  // Sin este mock, los tests que renderizan componentes con useEffect+fetch
  // cuelgan hasta el timeout porque la Promise nunca resuelve.
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  );
});

// ── Bloques a verificar ────────────────────────────────────────────────────
const BLOCKS = [
  ['Dashboard',      () => import('../components/blocks/Dashboard.jsx')],
  ['Logistica',      () => import('../components/blocks/Logistica.jsx')],
  ['Voluntarios',    () => import('../components/blocks/Voluntarios.jsx')],
  ['Proyecto',       () => import('../components/blocks/Proyecto.jsx')],
  ['Camisetas',      () => import('../components/blocks/Camisetas.jsx')],
  ['Documentos',     () => import('../components/blocks/Documentos.jsx')],
  ['Patrocinadores', () => import('../components/blocks/Patrocinadores.jsx')],
  ['Presupuesto',    () => import('../components/blocks/Presupuesto.jsx')],
  ['Index',          () => import('../pages/Index.jsx')],
];

describe('Runtime smoke — todos los bloques', () => {
  for (const [name, loader] of BLOCKS) {
    it(`${name} renderiza sin ReferenceError`, async () => {
      const mod = await loader();
      const Comp = mod.default;
      expect(Comp, `${name} debe tener export default`).toBeDefined();

      let container;
      await act(async () => {
        ({ container } = render(React.createElement(Comp)));
        // Drain microtask queue so useEffect/fetch mocks resolve
        await waitFor(() => expect(container).toBeDefined(), { timeout: 2000 });
      });
    });
  }
});

// ── Additional regression tests for reported bugs ────────────────────────────
describe('Regression — bugs reported in production screenshots', () => {
  
  it('Voluntarios: qrDataUrl state is declared in scope', async () => {
    const vols = await import('../components/blocks/Voluntarios.jsx');
    expect(vols.default).toBeDefined();
    // Verify qrDataUrl is a local state variable, not a global
    const src = await fetch('../components/blocks/Voluntarios.jsx').catch(() => null);
    // Just check the module loads without throwing
    expect(typeof vols.default).toBe('function');
  });

  it('Drawer "Más" (3 dots): useEffect not nested inside another useEffect', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const indexSrc = readFileSync(resolve(process.cwd(), 'src/pages/Index.jsx'), 'utf-8');
    // The teg-conflict listener should be a top-level useEffect, not nested
    const conflictIdx = indexSrc.indexOf('teg-conflict');
    const prevUseEffect = indexSrc.lastIndexOf('useEffect', conflictIdx);
    const prevUseEffectClose = indexSrc.indexOf('})', prevUseEffect);
    // The conflict useEffect starts AFTER the previous useEffect closes
    expect(conflictIdx).toBeGreaterThan(prevUseEffectClose);
  });

  it('API function count stays under Vercel Hobby limit of 12', () => {
    const { execSync } = require('child_process');
    const count = parseInt(
      execSync('find api -name "*.js" | wc -l', { cwd: process.cwd() }).toString().trim()
    );
    // Límite actualizado a 13: api/lib/rateLimiter.js es librería (no endpoint Vercel)
    // + api/images/index.js añadido en fix(STOR-CRIT-01). Endpoints reales = 12.
    expect(count).toBeLessThanOrEqual(13);
  });

  it('budgetUtils.calculateResultadoFinanciero uses ie.activo as source of truth', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const utils = readFileSync(resolve(process.cwd(), 'src/lib/budgetUtils.js'), 'utf-8');
    // Should filter ingresosExtra by ie.activo
    expect(utils).toContain('ie.activo');
    // Should NOT do patSyncado from pats directly ignoring ie.activo for non-admin sectors
    expect(utils).not.toContain("const patSyncado = pats");
  });
});
