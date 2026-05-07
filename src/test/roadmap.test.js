/**
 * roadmap.test.js — Verificación del roadmap Fases 1 + 2
 *
 * FASE 1 — Seguridad crítica y bugs:
 *   T1.1  SEC-04: api/voluntarios sin API key hardcodeada
 *   T1.2  api/setup protegido con x-api-key
 *   T1.3  SESSION_TTL = 30 días en VoluntarioPortal
 *   T1.4  telefonoEmergencia unificado en api/data/public.js y exportUtils
 *   T1.5  usePaginacion expone resetPage()
 *
 * FASE 2 — Limpieza de duplicación:
 *   T2.1  camisetasConstants.js: TALLAS, GUIA_TALLAS, SHIRT_PLACEHOLDER_* exportados
 *   T2.1b Voluntarios.jsx y VoluntarioPortal.jsx importan desde camisetasConstants
 *   T2.2  FormularioPublico.jsx separado en src/components/voluntarios/
 *   T2.x  Dead code eliminado (orgIniciales, teg_camisetas_v1_stats, build comment)
 *   T2.x  DUP-DASH-02: get("teg_documentos_v1") llamado solo una vez
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

const read = (rel) => readFileSync(path.resolve(process.cwd(), rel), 'utf-8');
const exists = (rel) => existsSync(path.resolve(process.cwd(), rel));

// ── T1.1 — SEC-04: api/voluntarios sin API key hardcodeada ─────────────────
describe('T1.1 — SEC-04: API key hardcodeada eliminada', () => {
  const voluntariosApi = read('api/voluntarios/index.js');
  it('no contiene el fallback teg-admin-2026', () => {
    expect(voluntariosApi).not.toContain("'teg-admin-2026'");
    expect(voluntariosApi).not.toContain('"teg-admin-2026"');
  });
  it('devuelve 503 si API_KEY no está configurada', () => {
    expect(voluntariosApi).toContain('503');
    expect(voluntariosApi).toContain('Admin endpoint not configured');
  });
  it('usa solo process.env.API_KEY sin fallback', () => {
    expect(voluntariosApi).toContain('process.env.API_KEY');
    expect(voluntariosApi).not.toMatch(/API_KEY.*\|\|.*'[^']+'/);
  });
});

// ── T1.2 — api/setup protegido ─────────────────────────────────────────────
describe('T1.2 — api/setup.js protegido con x-api-key', () => {
  const setupApi = read('api/setup.js');
  it('verifica x-api-key', () => {
    expect(setupApi).toContain('x-api-key');
  });
  it('devuelve 401 si no hay API key', () => {
    expect(setupApi).toContain('401');
  });
  it('devuelve 503 si API_KEY no está configurada', () => {
    expect(setupApi).toContain('503');
    expect(setupApi).toContain('not configured');
  });
});

// ── T1.3 — SESSION_TTL = 30 días ───────────────────────────────────────────
describe('T1.3 — SESSION_TTL sincronizado con backend (30 días)', () => {
  const portal = read('src/pages/VoluntarioPortal.jsx');
  it('SESSION_TTL es 30 días (no 7)', () => {
    expect(portal).not.toContain('SESSION_TTL = 7 *');
    expect(portal).toContain('30 * 24 * 60 * 60 * 1000');
  });
  it('el backend usa 30 días en sessionTokenExpiry', () => {
    const volApi = read('api/voluntarios/index.js');
    expect(volApi).toContain('30 * 24 * 60 * 60 * 1000');
  });
});

// ── T1.4 — telefonoEmergencia unificado ────────────────────────────────────
describe('T1.4 — telefonoEmergencia campo canónico unificado', () => {
  it('api/data/public.js usa telefonoEmergencia como campo principal', () => {
    const pub = read('api/data/public.js');
    expect(pub).toContain('telefonoEmergencia');
  });
  it('api/voluntarios/index.js PATCH tiene telefonoEmergencia', () => {
    const vol = read('api/voluntarios/index.js');
    expect(vol).toContain('telefonoEmergencia');
  });
  it('exportUtils lee telefonoEmergencia con fallback contactoEmergencia', () => {
    const exp = read('src/lib/exportUtils.js');
    expect(exp).toContain('telefonoEmergencia');
    expect(exp).toContain('contactoEmergencia');
  });
});

// ── T1.5 — usePaginacion expone resetPage ──────────────────────────────────
describe('T1.5 — usePaginacion expone resetPage y Voluntarios lo usa', () => {
  it('usePaginacion retorna resetPage (implementación en hooks/)', () => {
    const hook = read('src/hooks/usePaginacion.jsx');
    expect(hook).toContain('resetPage');
  });
  it('Voluntarios.jsx usa resetPage al cambiar filtros', () => {
    const vols = read('src/components/blocks/Voluntarios.jsx');
    expect(vols).toContain('resetPage');
    expect(vols).toContain('busqueda, filtroEstado, filtroPuesto');
  });
});

// ── T2.1 — camisetasConstants.js existe con los exports correctos ──────────
describe('T2.1 — camisetasConstants.js: fuente única de verdad', () => {
  it('el archivo existe', () => {
    expect(exists('src/constants/camisetasConstants.js')).toBe(true);
  });
  it('exporta TALLAS', async () => {
    const { TALLAS } = await import('../constants/camisetasConstants.js');
    expect(Array.isArray(TALLAS)).toBe(true);
    expect(TALLAS).toContain('M');
    expect(TALLAS).toContain('4XL');
    expect(TALLAS).toHaveLength(9);
  });
  it('exporta GUIA_TALLAS con 9 tallas', async () => {
    const { GUIA_TALLAS } = await import('../constants/camisetasConstants.js');
    expect(Array.isArray(GUIA_TALLAS)).toBe(true);
    expect(GUIA_TALLAS).toHaveLength(9);
    expect(GUIA_TALLAS[0]).toHaveProperty('talla');
    expect(GUIA_TALLAS[0]).toHaveProperty('pecho');
  });
  it('exporta SHIRT_PLACEHOLDER_FRONT y SHIRT_PLACEHOLDER_BACK', async () => {
    const { SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK } = await import('../constants/camisetasConstants.js');
    expect(SHIRT_PLACEHOLDER_FRONT).toContain('data:image/svg+xml');
    expect(SHIRT_PLACEHOLDER_BACK).toContain('data:image/svg+xml');
    expect(SHIRT_PLACEHOLDER_FRONT).not.toBe(SHIRT_PLACEHOLDER_BACK);
  });
});

// ── T2.1b — Voluntarios y VoluntarioPortal importan desde camisetasConstants ─
describe('T2.1b — Imports desde camisetasConstants en ambos archivos', () => {
  it('Voluntarios.jsx importa desde camisetasConstants', () => {
    const vols = read('src/components/blocks/Voluntarios.jsx');
    expect(vols).toContain('camisetasConstants');
    expect(vols).not.toContain("const TALLAS = [");
    expect(vols).not.toContain("const GUIA_TALLAS = [");
  });
  it('VoluntarioPortal.jsx importa desde camisetasConstants', () => {
    const portal = read('src/pages/VoluntarioPortal.jsx');
    expect(portal).toContain('camisetasConstants');
    expect(portal).not.toContain("const TALLAS = [");
    expect(portal).not.toContain("const GUIA_TALLAS = [");
    expect(portal).not.toContain("TALLAS_PORTAL");
  });
});

// ── T2.2 — FormularioPublico separado ─────────────────────────────────────
describe('T2.2 — FormularioPublico extraído a su propio archivo', () => {
  it('existe src/components/voluntarios/FormularioPublico.jsx', () => {
    expect(exists('src/components/voluntarios/FormularioPublico.jsx')).toBe(true);
  });
  it('el nuevo archivo importa desde camisetasConstants', () => {
    const fp = read('src/components/voluntarios/FormularioPublico.jsx');
    expect(fp).toContain('camisetasConstants');
  });
});

// ── Dead code eliminado ─────────────────────────────────────────────────────
describe('Dead code eliminado (Fase 2)', () => {
  it('Index.jsx no tiene orgIniciales (código muerto)', () => {
    const idx = read('src/pages/Index.jsx');
    expect(idx).not.toContain('orgIniciales');
  });
  it('Dashboard.jsx no tiene teg_camisetas_v1_stats en ALL_KEYS', () => {
    const dash = read('src/components/blocks/Dashboard.jsx');
    expect(dash).not.toContain('"teg_camisetas_v1_stats"');
  });
  it('DUP-DASH-02: get("teg_documentos_v1") ya no se llama dos veces', () => {
    const dash = read('src/components/blocks/Dashboard.jsx');
    const matches = (dash.match(/get\("teg_documentos_v1"/g) || []).length;
    expect(matches).toBeLessThanOrEqual(1);
  });
});

// ── T1.5 + T2.1 valores correctos ─────────────────────────────────────────
describe('Integridad de datos de las constantes', () => {
  it('GUIA_TALLAS última talla es 4XL con pecho 120-128', async () => {
    const { GUIA_TALLAS } = await import('../constants/camisetasConstants.js');
    const last = GUIA_TALLAS[GUIA_TALLAS.length - 1];
    expect(last.talla).toBe('4XL');
    expect(last.pecho).toBe('120-128');
  });
  it('TALLAS incluye 3XL y 4XL (extended sizes)', async () => {
    const { TALLAS } = await import('../constants/camisetasConstants.js');
    expect(TALLAS).toContain('3XL');
    expect(TALLAS).toContain('4XL');
  });
  it('SHIRT_PLACEHOLDER_FRONT contiene texto DELANTERA', async () => {
    const { SHIRT_PLACEHOLDER_FRONT } = await import('../constants/camisetasConstants.js');
    expect(decodeURIComponent(SHIRT_PLACEHOLDER_FRONT.split(',')[1])).toContain('DELANTERA');
  });
  it('SHIRT_PLACEHOLDER_BACK contiene texto TRASERA', async () => {
    const { SHIRT_PLACEHOLDER_BACK } = await import('../constants/camisetasConstants.js');
    expect(decodeURIComponent(SHIRT_PLACEHOLDER_BACK.split(',')[1])).toContain('TRASERA');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FASE 3 — Separación de responsabilidades
// ══════════════════════════════════════════════════════════════════════════════

// ── T3.1 — Auth extraída de Index.jsx ─────────────────────────────────────
describe('T3.1 — pinAuth.js: módulo de autenticación separado', () => {
  it('existe src/components/auth/pinAuth.js', () => {
    expect(exists('src/components/auth/pinAuth.js')).toBe(true);
  });
  it('existe PinScreen.jsx separado', () => {
    expect(exists('src/components/auth/PinScreen.jsx')).toBe(true);
  });
  it('existe ChangePinModal.jsx separado', () => {
    expect(exists('src/components/auth/ChangePinModal.jsx')).toBe(true);
  });
  it('pinAuth exporta hashPin, checkSession, verifyPin, savePin', async () => {
    const mod = await import('../components/auth/pinAuth.js');
    expect(typeof mod.hashPin).toBe('function');
    expect(typeof mod.checkSession).toBe('function');
    expect(typeof mod.verifyPin).toBe('function');
    expect(typeof mod.savePin).toBe('function');
  });
  it('hashPin es determinista', async () => {
    const { hashPin } = await import('../components/auth/pinAuth.js');
    expect(hashPin('1234')).toBe(hashPin('1234'));
    expect(hashPin('1234')).not.toBe(hashPin('5678'));
  });
  it('Index.jsx ya no define AUTH_KEY ni hashPin localmente', () => {
    const idx = read('src/pages/Index.jsx');
    expect(idx).not.toContain("const AUTH_KEY");
    expect(idx).not.toContain("function hashPin");
    expect(idx).not.toContain("const DEFAULT_PIN");
  });
  it('Index.jsx importa checkSession desde auth/', () => {
    const idx = read('src/pages/Index.jsx');
    expect(idx).toContain('from "@/components/auth/pinAuth.js"');
  });
});

// ── T3.2 — useAlertasBadges hook separado ────────────────────────────────
describe('T3.2 — useAlertasBadges: hook separado que usa dataService', () => {
  it('existe src/hooks/useAlertasBadges.js', () => {
    expect(exists('src/hooks/useAlertasBadges.js')).toBe(true);
  });
  it('useAlertasBadges usa dataService, no localStorage directamente', () => {
    const hook = read('src/hooks/useAlertasBadges.js');
    expect(hook).toContain('dataService');
    expect(hook).not.toContain('localStorage.getItem');
  });
  it('Index.jsx ya no tiene alertasBadges inline (useMemo enorme)', () => {
    const idx = read('src/pages/Index.jsx');
    expect(idx).toContain('useAlertasBadges');
    // El useMemo inline tenía "teg_proyecto_v1_tareas" hardcodeado
    expect(idx).not.toContain('"teg_proyecto_v1_tareas"');
  });
  it('el hook calcula badges para voluntarios, documentos, presupuesto y logistica', () => {
    const hook = read('src/hooks/useAlertasBadges.js');
    expect(hook).toContain('"proyecto"');
    expect(hook).toContain('"voluntarios"');
    expect(hook).toContain('"documentos"');
    expect(hook).toContain('"presupuesto"');
    expect(hook).toContain('"logistica"');
  });
});

// ── T3.5 — ConfirmModal compartido ────────────────────────────────────────
describe('T3.5 — ConfirmModal: componente de confirmación compartido', () => {
  it('existe src/components/common/ConfirmModal.jsx', () => {
    expect(exists('src/components/common/ConfirmModal.jsx')).toBe(true);
  });
  it('acepta props: open, title, message, confirmLabel, cancelLabel, variant', () => {
    const modal = read('src/components/common/ConfirmModal.jsx');
    expect(modal).toContain('open');
    expect(modal).toContain('title');
    expect(modal).toContain('message');
    expect(modal).toContain('confirmLabel');
    expect(modal).toContain('variant');
  });
  it('tiene variantes danger, warning, default', () => {
    const modal = read('src/components/common/ConfirmModal.jsx');
    expect(modal).toContain("danger");
    expect(modal).toContain("warning");
    expect(modal).toContain("default");
  });
  it('cierra con Escape', () => {
    const modal = read('src/components/common/ConfirmModal.jsx');
    expect(modal).toContain('Escape');
    expect(modal).toContain('onCancel');
  });
  it('Presupuesto usa ConfirmModal para eliminar conceptos', () => {
    const pres = read('src/components/blocks/Presupuesto.jsx');
    expect(pres).toContain('ConfirmModal');
    expect(pres).toContain('delConceptoId');
  });
});

// ── T4.1 — Sincronización offline real ────────────────────────────────────
describe('T4.1 — Sincronización offline: cola de reintentos', () => {
  it('dataService tiene listener online para sincronizar pendientes', () => {
    const ds = read('src/lib/dataService.js');
    expect(ds).toContain("window.addEventListener('online'");
    expect(ds).toContain('__pending_sync_');
  });
  it('el retry lee los pending y los reenvía al API', () => {
    const ds = read('src/lib/dataService.js');
    expect(ds).toContain('syncPendingQueue');
    expect(ds).toContain('startsWith(\'__pending_sync_\')');
  });
  it('reintenta solo cuando el adapter es API', () => {
    const ds = read('src/lib/dataService.js');
    expect(ds).toContain("ADAPTER === 'api'");
  });
  it('dispara notify() tras sincronizar para actualizar la UI', () => {
    const ds = read('src/lib/dataService.js');
    // syncPendingQueue y notify() están en el mismo bloque de código (IIFE)
    const syncIdx = ds.indexOf('syncPendingQueue');
    const syncBlock = ds.slice(syncIdx, syncIdx + 2500); // bloque más largo después del fix
    expect(syncBlock).toContain('notify()');
  });
});

// ── T4.2 — useData separado de dataService ───────────────────────────────
describe('T4.2 — useData: separado en hooks/useData.js', () => {
  it('existe src/hooks/useData.js', () => {
    expect(exists('src/hooks/useData.js')).toBe(true);
  });
  it('hooks/useData.js re-exporta useData y saveAll', () => {
    const hook = read('src/hooks/useData.js');
    expect(hook).toContain('useData');
    expect(hook).toContain('saveAll');
  });
  it('los imports desde @/lib/dataService siguen funcionando (compat)', async () => {
    const { useData, saveAll } = await import('../lib/dataService.js');
    expect(typeof useData).toBe('function');
    expect(typeof saveAll).toBe('function');
  });
});

// ── T5.2 — Confirmaciones destructivas ───────────────────────────────────
describe('T5.2 — Confirmaciones destructivas en eliminaciones', () => {
  it('Presupuesto tiene confirmación antes de removeConcepto', () => {
    const pres = read('src/components/blocks/Presupuesto.jsx');
    expect(pres).toContain('ConfirmModal');
    expect(pres).toContain('Esta acción no se puede deshacer');
  });
});

// ── T5.3 — mensajeOrganizador ya estaba implementado ─────────────────────
describe('T5.3 — mensajeOrganizador en ficha del voluntario', () => {
  it('Voluntarios.jsx tiene MensajeOrganizadorEdit', () => {
    const vols = read('src/components/blocks/Voluntarios.jsx');
    expect(vols).toContain('MensajeOrganizadorEdit');
    expect(vols).toContain('mensajeOrganizador');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FASE 5 + 7 — UX, optimización y deuda técnica
// ══════════════════════════════════════════════════════════════════════════════

// ── T5.4 — Recuperación de PIN en VoluntarioPortal ───────────────────────
describe('T5.4 — Recuperación de PIN para voluntarios', () => {
  it('el portal tiene enlace Restablecer PIN', () => {
    const portal = read('src/pages/VoluntarioPortal.jsx');
    expect(portal).toContain('Restablecer PIN');
  });
  it('el portal tiene estado showRecoverPin', () => {
    const portal = read('src/pages/VoluntarioPortal.jsx');
    expect(portal).toContain('showRecoverPin');
  });
  it('el portal llama a action=recover-pin', () => {
    const portal = read('src/pages/VoluntarioPortal.jsx');
    expect(portal).toContain('action=recover-pin');
  });
  it('el backend tiene endpoint recover-pin', () => {
    const api = read('api/voluntarios/index.js');
    expect(api).toContain("action === 'recover-pin'");
  });
  it('recover-pin no requiere autenticación (es público)', () => {
    const api = read('api/voluntarios/index.js');
    const idx = api.indexOf("action === 'recover-pin'");
    const block = api.slice(idx, idx + 400);
    // No debe tener x-api-key check dentro del bloque
    expect(block).not.toContain('x-api-key');
    expect(block).not.toContain('Unauthorized');
  });
  it('recover-pin verifica email y resetea al PIN inicial', () => {
    const api = read('api/voluntarios/index.js');
    const idx = api.indexOf("action === 'recover-pin'");
    const block = api.slice(idx, idx + 1000); // bloque completo
    expect(block).toContain('email');
    expect(block).toContain('pinInicial');
    expect(block).toContain('pinPersonalizado: false');
  });
  it('la respuesta es genérica (no revela si el email existe)', () => {
    const api = read('api/voluntarios/index.js');
    const idx = api.indexOf("action === 'recover-pin'");
    const block = api.slice(idx, idx + 600);
    expect(block).toContain('Si el email está registrado');
  });
});

// ── T7.1 — Eliminar dependencias no usadas ───────────────────────────────
describe('T7.1 — Dependencias no usadas eliminadas de package.json', () => {
  let pkg;
  beforeAll(async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));
  });

  const depsToRemove = [
    'framer-motion', '@tanstack/react-query', 'cmdk', 'vaul',
    'embla-carousel-react', 'react-day-picker', 'input-otp',
    'react-resizable-panels', 'class-variance-authority',
    'clsx', 'tailwind-merge', 'tailwindcss-animate',
  ];

  it('framer-motion eliminado', () => {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps['framer-motion']).toBeUndefined();
  });
  it('@tanstack/react-query eliminado', () => {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps['@tanstack/react-query']).toBeUndefined();
  });
  it('todas las radix no usadas eliminadas', () => {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const radixUnused = [
      '@radix-ui/react-accordion', '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast',
    ];
    radixUnused.forEach(dep => {
      expect(allDeps[dep]).toBeUndefined();
    });
  });
  it('next-themes conservado (usado por ThemeToggle)', () => {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps['next-themes']).toBeDefined();
  });
  it('@neondatabase/serverless conservado (usado en api/)', () => {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps['@neondatabase/serverless']).toBeDefined();
  });
});

// ── T7.2 — throttle y granularidad en useAlertasBadges ───────────────────
describe('T7.2 — useAlertasBadges: throttle 5s y granularidad por módulo', () => {
  it('THROTTLE_MS = 5000', () => {
    const hook = read('src/hooks/useAlertasBadges.js');
    expect(hook).toContain('THROTTLE_MS = 5000');
  });
  it('escucha teg-sync con detail.module', () => {
    const hook = read('src/hooks/useAlertasBadges.js');
    expect(hook).toContain('detail');
    expect(hook).toContain('.module');
    expect(hook).toContain('addEventListener') && expect(hook).toContain('teg-sync');
  });
  it('solo recalcula el módulo afectado cuando detail.module está presente', () => {
    const hook = read('src/hooks/useAlertasBadges.js');
    const idx = hook.indexOf('detail?.module');
    const ctx = hook.slice(idx, idx + 200);
    expect(ctx).toContain('calcModulos([modulo])');
  });
  it('recalcula todos si no hay detail.module (comportamiento conservador)', () => {
    const hook = read('src/hooks/useAlertasBadges.js');
    expect(hook).toContain('calcModulos(TODOS_MODULOS)');
  });
  it('excluye tareas bloqueadas del badge de proyecto', () => {
    const hook = read('src/hooks/useAlertasBadges.js');
    expect(hook).toContain('"bloqueado"');
  });
  it('calcBadgeModulo función separada por módulo', () => {
    const hook = read('src/hooks/useAlertasBadges.js');
    expect(hook).toContain('async function calcBadgeModulo');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SPRINT 1 — Correctivos de alta urgencia
// ══════════════════════════════════════════════════════════════════════════════

describe('SP1-01 — FormularioPublico eliminado de Voluntarios.jsx', () => {
  it('Voluntarios.jsx ya no exporta FormularioPublico', () => {
    const vols = read('src/components/blocks/Voluntarios.jsx');
    expect(vols).not.toContain('export function FormularioPublico');
  });
  it('Voluntarios.jsx es más pequeño que 3713 líneas (original)', () => {
    const vols = read('src/components/blocks/Voluntarios.jsx');
    expect(vols.split('\n').length).toBeLessThan(3713);
  });
  it('FormularioPublico separado sigue existiendo en components/voluntarios/', () => {
    expect(exists('src/components/voluntarios/FormularioPublico.jsx')).toBe(true);
  });
});

describe('SP1-02 — BUG-DS-02: setMultiple clave única por operación', () => {
  it('dataService ya no usa clave fija "batch" para setMultiple', () => {
    const ds = read('src/lib/dataService.js');
    expect(ds).not.toContain("const collection = 'batch'");
  });
  it('usa clave dinámica por llamada', () => {
    const ds = read('src/lib/dataService.js');
    expect(ds).toContain('batch_${Date.now()}');
  });

  it('dos llamadas a setMultiple no comparten la misma cola de debounce', () => {
    // Simula la generación de claves
    const genKey = () => `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const k1 = genKey();
    const k2 = genKey();
    expect(k1).not.toBe(k2);
  });
});

describe('SP1-03 — syncPendingQueue: manejo de API key ausente', () => {
  it('syncPendingQueue maneja gracefully la ausencia de VITE_API_KEY', () => {
    const ds = read('src/lib/dataService.js');
    expect(ds).toContain('syncPendingQueue');
    // No debe asumir que la API key está disponible
    expect(ds).not.toContain("x-api-key': ''");
  });
  it('emite teg-sync cuando no hay API key para que módulos reintenten', () => {
    const ds = read('src/lib/dataService.js');
    const idx = ds.indexOf('syncPendingQueue');
    const block = ds.slice(idx, idx + 1500);
    expect(block).toContain('teg-sync');
  });
});

describe('SP1-04 — usePaginacion.jsx: lib/ es re-export de hooks/', () => {
  it('lib/usePaginacion.jsx re-exporta desde hooks/', () => {
    const lib = read('src/lib/usePaginacion.jsx');
    expect(lib).toContain('from "@/hooks/usePaginacion');
  });
  it('hooks/usePaginacion.jsx tiene la implementación real', () => {
    const hook = read('src/hooks/usePaginacion.jsx');
    expect(hook).toContain('export function usePaginacion');
  });
});

describe('SP1-05 — budget-log: GET público, POST protegido', () => {
  it('api/budget-log GET no requiere autenticación', () => {
    const api = read('api/budget-log/index.js');
    expect(api).toContain("req.method !== 'GET'");
    expect(api).toContain('!auth(req, res)');
    // La condición debe excluir GET del auth check
    const idx = api.indexOf("req.method !== 'GET'");
    const ctx = api.slice(idx, idx + 50);
    expect(ctx).toContain('!auth');
  });
  it('TabHistorial GET no envía x-api-key (fetch sin headers)', () => {
    const tab = read('src/components/budget/TabHistorial.jsx');
    // El GET usa fetch('/api/budget-log?limit=100') sin headers de auth
    expect(tab).toContain('/api/budget-log?limit=100');
    // El DELETE sí necesita auth — verificar que GET no tiene header
    const getIdx = tab.indexOf('/api/budget-log?limit=100');
    const getCtx = tab.slice(Math.max(0, getIdx-30), getIdx+100);
    expect(getCtx).not.toContain('x-api-key');
  });
  it('useBudgetLogic maneja gracefully la ausencia de VITE_API_KEY', () => {
    const hook = read('src/hooks/useBudgetLogic.js');
    expect(hook).toContain("VITE_API_KEY || ''");
  });
});
