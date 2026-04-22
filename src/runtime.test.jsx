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
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

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
  ['Dashboard',      () => import('./components/blocks/Dashboard.jsx')],
  ['Logistica',      () => import('./components/blocks/Logistica.jsx')],
  ['Voluntarios',    () => import('./components/blocks/Voluntarios.jsx')],
  ['Proyecto',       () => import('./components/blocks/Proyecto.jsx')],
  ['Camisetas',      () => import('./components/blocks/Camisetas.jsx')],
  ['Documentos',     () => import('./components/blocks/Documentos.jsx')],
  ['Patrocinadores', () => import('./components/blocks/Patrocinadores.jsx')],
  ['Presupuesto',    () => import('./components/blocks/Presupuesto.jsx')],
  ['Index',          () => import('./pages/Index.jsx')],
];

describe('Runtime smoke — todos los bloques', () => {
  for (const [name, loader] of BLOCKS) {
    it(`${name} renderiza sin ReferenceError`, async () => {
      const mod = await loader();
      const Comp = mod.default;
      expect(Comp, `${name} debe tener export default`).toBeDefined();
      expect(
        () => render(React.createElement(Comp)),
        `${name} no debe lanzar ReferenceError al renderizar`
      ).not.toThrow();
    });
  }
});
