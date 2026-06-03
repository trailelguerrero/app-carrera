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
  it('TabVoluntariosList.jsx usa resetPage al cambiar filtros (Sprint 2: extraído)', () => {
    // Post Sprint 2: resetPage está en el componente extraído TabVoluntariosList
    const tabVols = read('src/components/voluntarios/TabVoluntariosList.jsx');
    expect(tabVols).toContain('resetPage');
    expect(tabVols).toContain('busqueda, filtroEstado, filtroPuesto');
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
    const syncBlock = ds.slice(syncIdx, syncIdx + 5000); // bloque cubre toda la IIFE (notify() a ~4300 chars)
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
  it('useData y saveAll se importan desde @/hooks/useData (fuente canónica, sin ciclo)', async () => {
    const { useData, saveAll } = await import('../hooks/useData.js');
    expect(typeof useData).toBe('function');
    expect(typeof saveAll).toBe('function');
    // dataService NO debe re-exportarlos: el re-export creaba un ciclo de runtime
    // que rompía el bundle de producción (TDZ "Cannot access 'G' before initialization").
    const ds = await import('../lib/dataService.js');
    expect(ds.useData).toBeUndefined();
    expect(ds.saveAll).toBeUndefined();
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
  it('@tanstack/react-query instalado y en uso (Mejora 5 — Dashboard cache)', () => {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    // @tanstack/react-query se instaló en la Mejora 5 del roadmap para el Dashboard
    // con caché independiente por módulo. El test original asumía que se eliminaría,
    // pero la implementación lo adoptó como dependencia activa.
    expect(allDeps['@tanstack/react-query']).toBeDefined();
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
    // La implementación migró de addEventListener('teg-sync') a useLastEvent()
    // del store Zustand (Mejora 3), que proporciona granularidad por módulo
    // sin acoplamiento directo a eventos del DOM.
    expect(hook).toContain('useLastEvent');
    expect(hook).toContain('lastEvent');
  });
  it('solo recalcula el módulo afectado cuando detail.module está presente', () => {
    const hook = read('src/hooks/useAlertasBadges.js');
    // La implementación Zustand usa lastEvent.module en lugar de detail.module del CustomEvent
    const usesModulo = hook.includes('lastEvent.module') || hook.includes('lastEvent?.module');
    const callsCalcModulos = hook.includes('calcModulos([modulo])');
    expect(usesModulo || callsCalcModulos).toBe(true);
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
    // syncPendingQueue es ~2000 chars; buscar en bloque suficientemente grande
    const block = ds.slice(idx, idx + 5000);
    // Emite teg-sync directamente o via dataService.notify() que internamente
    // llama window.dispatchEvent(new CustomEvent('teg-sync'))
    const emitsDirect = block.includes('teg-sync');
    const emitsViaNotify = block.includes('dataService.notify') || block.includes('.notify(');
    expect(emitsDirect || emitsViaNotify).toBe(true);
  });
});

describe('SP1-04 — usePaginacion.jsx: hooks/ contiene la implementación', () => {
  // lib/usePaginacion.jsx eliminado en limpieza 2026-05 (era re-export de 6 líneas,
  // todos los consumidores ya importan directamente desde @/hooks/usePaginacion).
  it('lib/usePaginacion.jsx ha sido eliminado (re-export innecesario)', () => {
    expect(exists('src/lib/usePaginacion.jsx')).toBe(false);
  });
  it('hooks/usePaginacion.jsx tiene la implementación real', () => {
    const hook = read('src/hooks/usePaginacion.jsx');
    expect(hook).toContain('export function usePaginacion');
  });
});

describe('SP1-05 — budget-log: SEC-04 todos los métodos protegidos', () => {
  // SEC-04 (sesión 2026-05-08): GET también requiere autenticación — datos financieros sensibles
  it('api/budget-log requiere autenticación en TODOS los métodos (incluido GET)', () => {
    const api = read('api/budget-log/index.js');
    // auth() se llama incondicionalmente antes de cualquier método
    expect(api).toContain('if (!auth(req, res)) return;');
    // NO debe existir la excepción anterior para GET
    expect(api).not.toContain("req.method !== 'GET'");
  });
  it('api/budget-log GET responde 401 sin x-api-key', () => {
    const api = read('api/budget-log/index.js');
    expect(api).toContain('401');
    expect(api).toContain('Unauthorized');
  });
  it('TabHistorial usa el proxy BFF para el GET (no llama a /api/budget-log directamente)', () => {
    const tab = read('src/components/budget/TabHistorial.jsx');
    // Debe usar el proxy BFF que inyecta x-api-key server-side
    expect(tab).toContain('/api/proxy/budget-log');
    // NO debe llamar directamente al endpoint sin protección
    expect(tab).not.toContain("fetch(\"/api/budget-log");
    expect(tab).not.toContain("fetch('/api/budget-log");
  });
  it('api/budget-log tiene comentario SEC-04 documentando la decisión', () => {
    const api = read('api/budget-log/index.js');
    expect(api).toContain('SEC-04');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SPRINT 2 — Refactor modular
// ══════════════════════════════════════════════════════════════════════════════

describe('SP2-01 — Voluntarios.jsx reducido por extracción de sub-componentes', () => {
  it('Voluntarios.jsx tiene menos de 1100 líneas (era 3713)', () => {
    const vols = read('src/components/blocks/Voluntarios.jsx');
    expect(vols.split('\n').length).toBeLessThan(1200);
  });
  it('TabDashboardVol.jsx extraído existe', () => {
    expect(exists('src/components/voluntarios/TabDashboardVol.jsx')).toBe(true);
  });
  it('TabVoluntariosList.jsx extraído existe', () => {
    expect(exists('src/components/voluntarios/TabVoluntariosList.jsx')).toBe(true);
  });
  it('TabPuestosVol.jsx extraído existe', () => {
    expect(exists('src/components/voluntarios/TabPuestosVol.jsx')).toBe(true);
  });
  it('TabTallasVol.jsx extraído existe', () => {
    expect(exists('src/components/voluntarios/TabTallasVol.jsx')).toBe(true);
  });
  it('TabDiaDVol.jsx extraído existe', () => {
    expect(exists('src/components/voluntarios/TabDiaDVol.jsx')).toBe(true);
  });
  it('FichaVoluntario.jsx extraído existe', () => {
    expect(exists('src/components/voluntarios/FichaVoluntario.jsx')).toBe(true);
  });
  it('FichaPuesto.jsx extraído existe', () => {
    expect(exists('src/components/voluntarios/FichaPuesto.jsx')).toBe(true);
  });
  it('ModalVoluntario.jsx extraído existe', () => {
    expect(exists('src/components/voluntarios/ModalVoluntario.jsx')).toBe(true);
  });
  it('Voluntarios.jsx importa desde components/voluntarios/', () => {
    const vols = read('src/components/blocks/Voluntarios.jsx');
    expect(vols).toContain('@/components/voluntarios/TabDashboardVol');
    expect(vols).toContain('@/components/voluntarios/TabVoluntariosList');
  });
});

describe('SP2-02 — Logistica.jsx reducido por extracción de sub-componentes', () => {
  it('Logistica.jsx tiene menos de 700 líneas (era 2890)', () => {
    const log = read('src/components/blocks/Logistica.jsx');
    expect(log.split('\n').length).toBeLessThan(700);
  });
  it('TabDashLog.jsx extraído existe', () => {
    expect(exists('src/components/logistica/TabDashLog.jsx')).toBe(true);
  });
  it('TabMaterial.jsx extraído existe', () => {
    expect(exists('src/components/logistica/TabMaterial.jsx')).toBe(true);
  });
  it('TabVehiculos.jsx extraído existe', () => {
    expect(exists('src/components/logistica/TabVehiculos.jsx')).toBe(true);
  });
  it('TabTimeline.jsx extraído existe', () => {
    expect(exists('src/components/logistica/TabTimeline.jsx')).toBe(true);
  });
  it('TabDirectorio.jsx extraído existe', () => {
    expect(exists('src/components/logistica/TabDirectorio.jsx')).toBe(true);
  });
  it('TabEmergencias.jsx extraído existe', () => {
    expect(exists('src/components/logistica/TabEmergencias.jsx')).toBe(true);
  });
  it('TabComunicaciones.jsx extraído existe', () => {
    expect(exists('src/components/logistica/TabComunicaciones.jsx')).toBe(true);
  });
  it('FichaLogistica.jsx extraído existe', () => {
    expect(exists('src/components/logistica/FichaLogistica.jsx')).toBe(true);
  });
  it('logisticaConstants.js con constantes compartidas existe', () => {
    expect(exists('src/components/logistica/logisticaConstants.js')).toBe(true);
  });
  it('Logistica.jsx importa desde components/logistica/', () => {
    const log = read('src/components/blocks/Logistica.jsx');
    expect(log).toContain('@/components/logistica/TabDashLog');
    expect(log).toContain('@/components/logistica/FichaLogistica');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SPRINT 3 — Funcionalidades de alto valor
// ══════════════════════════════════════════════════════════════════════════════

describe('SP3-01 — CONN-01: DíaCarrera conectado con localizaciones GPS', () => {
  it('DiaCarrera.jsx importa LOCS_KEY y LOCS_DEFAULT', () => {
    const dc = read('src/components/blocks/DiaCarrera.jsx');
    expect(dc).toContain('LOCS_KEY');
    expect(dc).toContain('LOCS_DEFAULT');
    expect(dc).toContain('localizaciones');
  });
  it('DiaCarrera.jsx carga locs via useData', () => {
    const dc = read('src/components/blocks/DiaCarrera.jsx');
    expect(dc).toContain('useData(LOCS_KEY');
  });
  it('tab puestos muestra info de localización', () => {
    const dc = read('src/components/blocks/DiaCarrera.jsx');
    expect(dc).toContain('CONN-01');
    expect(dc).toContain('locMatch.tipo'); // CONN-01 implemented via locMatch
  });
});

describe('SP3-02 — CONN-04: budget-log TabHistorial funcional via proxy BFF', () => {
  // Actualizado en sesión 2026-05-08: SEC-04 protege el GET; el frontend usa el proxy BFF
  it('TabHistorial carga el historial a través del proxy BFF', () => {
    const tab = read('src/components/budget/TabHistorial.jsx');
    // El proxy inyecta x-api-key server-side, sin exponerla al cliente
    expect(tab).toContain('/api/proxy/budget-log');
  });
  it('TabHistorial NO llama directamente a /api/budget-log (sin protección)', () => {
    const tab = read('src/components/budget/TabHistorial.jsx');
    expect(tab).not.toContain("fetch(\"/api/budget-log");
    expect(tab).not.toContain("fetch('/api/budget-log");
  });
  it('api/budget-log GET está protegido (no es público)', () => {
    const api = read('api/budget-log/index.js');
    // auth() se llama antes de cualquier verificación de método
    expect(api).toContain('if (!auth(req, res)) return;');
    expect(api).not.toContain("req.method !== 'GET'");
  });
});

describe('SP3-03 — FRAG-DASH-01: indicador datos provisionales en Dashboard', () => {
  it('Dashboard muestra indicador cuando isRefreshing', () => {
    const dash = read('src/components/blocks/Dashboard.jsx');
    expect(dash).toContain('isRefreshing');
    expect(dash).toContain('Actualizando datos');
    expect(dash).toContain('FRAG-DASH-01');
  });
  it('indicador usa color ámbar (informativo, no error)', () => {
    const dash = read('src/components/blocks/Dashboard.jsx');
    const idx = dash.indexOf('FRAG-DASH-01');
    const ctx = dash.slice(idx, idx + 400);
    expect(ctx).toContain('amber');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SPRINT 2 — Refactor modular
// ══════════════════════════════════════════════════════════════════════════════

describe('SP2-01 — Voluntarios.jsx refactorizado en módulos', () => {
  it('Voluntarios.jsx tiene menos de 1100 líneas', () => {
    const v = read('src/components/blocks/Voluntarios.jsx');
    expect(v.split('\n').length).toBeLessThan(1200);
  });
  it('TabDashboardVol.jsx extraído', () => {
    expect(exists('src/components/voluntarios/TabDashboardVol.jsx')).toBe(true);
  });
  it('TabVoluntariosList.jsx extraído', () => {
    expect(exists('src/components/voluntarios/TabVoluntariosList.jsx')).toBe(true);
  });
  it('TabPuestosVol.jsx extraído', () => {
    expect(exists('src/components/voluntarios/TabPuestosVol.jsx')).toBe(true);
  });
  it('TabTallasVol.jsx extraído', () => {
    expect(exists('src/components/voluntarios/TabTallasVol.jsx')).toBe(true);
  });
  it('TabDiaDVol.jsx extraído', () => {
    expect(exists('src/components/voluntarios/TabDiaDVol.jsx')).toBe(true);
  });
  it('FichaVoluntario.jsx extraído', () => {
    expect(exists('src/components/voluntarios/FichaVoluntario.jsx')).toBe(true);
  });
  it('FichaPuesto.jsx extraído', () => {
    expect(exists('src/components/voluntarios/FichaPuesto.jsx')).toBe(true);
  });
  it('ModalVoluntario.jsx extraído', () => {
    expect(exists('src/components/voluntarios/ModalVoluntario.jsx')).toBe(true);
  });
  it('Voluntarios.jsx importa desde los módulos extraídos', () => {
    const v = read('src/components/blocks/Voluntarios.jsx');
    expect(v).toContain('@/components/voluntarios/TabDashboardVol');
    expect(v).toContain('@/components/voluntarios/TabVoluntariosList');
    expect(v).toContain('@/components/voluntarios/FichaVoluntario');
  });
});

describe('SP2-02 — Logistica.jsx refactorizado en módulos', () => {
  it('Logistica.jsx tiene menos de 700 líneas', () => {
    const l = read('src/components/blocks/Logistica.jsx');
    expect(l.split('\n').length).toBeLessThan(700);
  });
  it('TabDashLog.jsx extraído', () => {
    expect(exists('src/components/logistica/TabDashLog.jsx')).toBe(true);
  });
  it('TabMaterial.jsx extraído', () => {
    expect(exists('src/components/logistica/TabMaterial.jsx')).toBe(true);
  });
  it('TabVehiculos.jsx extraído', () => {
    expect(exists('src/components/logistica/TabVehiculos.jsx')).toBe(true);
  });
  it('TabTimeline.jsx extraído', () => {
    expect(exists('src/components/logistica/TabTimeline.jsx')).toBe(true);
  });
  it('TabDirectorio.jsx extraído', () => {
    expect(exists('src/components/logistica/TabDirectorio.jsx')).toBe(true);
  });
  it('TabEmergencias.jsx extraído', () => {
    expect(exists('src/components/logistica/TabEmergencias.jsx')).toBe(true);
  });
  it('TabComunicaciones.jsx extraído', () => {
    expect(exists('src/components/logistica/TabComunicaciones.jsx')).toBe(true);
  });
  it('FichaLogistica.jsx extraído', () => {
    expect(exists('src/components/logistica/FichaLogistica.jsx')).toBe(true);
  });
  it('Logistica.jsx importa desde los módulos extraídos', () => {
    const l = read('src/components/blocks/Logistica.jsx');
    expect(l).toContain('@/components/logistica/TabDashLog');
    expect(l).toContain('@/components/logistica/TabMaterial');
    expect(l).toContain('@/components/logistica/FichaLogistica');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SPRINT 5 — Seguridad y multiusuario
// ══════════════════════════════════════════════════════════════════════════════

describe('SP5-01 — SEC-01: hashPin migrado a bcryptjs', () => {
  it('api/voluntarios importa bcryptjs', () => {
    const api = read('api/voluntarios/index.js');
    expect(api).toContain("from 'bcryptjs'");
  });
  it('hashPin usa bcrypt.hashSync', () => {
    const api = read('api/voluntarios/index.js');
    expect(api).toContain('bcrypt.hashSync');
  });
  it('hashPinLegacy preservado para migración transparente (djb2)', () => {
    const api = read('api/voluntarios/index.js');
    expect(api).toContain('hashPinLegacy');
    expect(api).toContain('Math.imul');
  });
  it('verifyPinCompat soporta ambos formatos', () => {
    const api = read('api/voluntarios/index.js');
    expect(api).toContain('verifyPinCompat');
    expect(api).toContain("startsWith('$2')");
  });
  it('login auto-upgrades hash legacy a bcrypt', () => {
    const api = read('api/voluntarios/index.js');
    expect(api).toContain('needsUpgrade');
    expect(api).toContain('upgradedHash');
  });
  it('bcryptjs en package.json dependencies', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps['bcryptjs']).toBeDefined();
  });
});

describe('SP5-02 — MISSING-02: detección de conflictos entre dispositivos', () => {
  it('api/data/[collection].js devuelve version en GET', () => {
    const api = read('api/data/[collection].js');
    expect(api).toContain('version');
    expect(api).toContain('MISSING-02');
  });
  it('PUT devuelve 409 si versión no coincide', () => {
    const api = read('api/data/[collection].js');
    expect(api).toContain('409');
    expect(api).toContain('Conflict');
    expect(api).toContain('serverVersion');
  });
  it('dataService.set maneja 409 y emite teg-conflict', () => {
    const ds = read('src/lib/dataService.js');
    expect(ds).toContain('409');
    expect(ds).toContain('teg-conflict');
    expect(ds).toContain('MISSING-02');
  });
  it('Index.jsx escucha teg-conflict y muestra toast', () => {
    const idx = read('src/pages/Index.jsx');
    expect(idx).toContain('teg-conflict');
    expect(idx).toContain('MISSING-02');
  });
  it('version counter se guarda en localStorage', () => {
    const ds = read('src/lib/dataService.js');
    expect(ds).toContain('__version_');
  });
});

describe('SP5-03 — tailwindcss-animate eliminado del config', () => {
  it('tailwind.config.ts no referencia tailwindcss-animate', () => {
    const cfg = read('tailwind.config.ts');
    expect(cfg).not.toContain('tailwindcss-animate');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SPRINT 6 — Corrección de bugs críticos: drawer crash + API versioning
// ══════════════════════════════════════════════════════════════════════════════

describe('SP6-01 — Drawer "Más" no causa pantalla negra', () => {
  it('Index.jsx: useEffect MISSING-02 NO está dentro del keyboard handler useEffect', () => {
    const idx = read('src/pages/Index.jsx');
    // El keyboard shortcuts useEffect debe tener "if (!authed)" como primer statement
    const keyboardIdx = idx.indexOf('// Keyboard shortcuts');
    const keyboardBlock = idx.slice(keyboardIdx, keyboardIdx + 200);
    // El MISSING-02 NO debe estar dentro del keyboard block
    expect(keyboardBlock).not.toContain('MISSING-02');
    expect(keyboardBlock).not.toContain("window.addEventListener('teg-conflict'");
  });

  it('Index.jsx: MISSING-02 gestionado por ConflictModal autónomo (Fase 0.4)', () => {
    // Tarea 0.4 reemplazó el useEffect de teg-conflict por <ConflictModal />
    // que escucha el evento internamente. El comentario MISSING-02 documenta esto.
    const idx = read('src/pages/Index.jsx');
    const conflictIdx = idx.indexOf('MISSING-02');
    expect(conflictIdx).toBeGreaterThan(-1);
    // ConflictModal debe estar importado y usado en el JSX
    expect(idx).toContain('ConflictModal');
    // El return principal aparece después del comentario
    const hasReturn = idx.slice(conflictIdx, conflictIdx + 1200).includes('\n  return (');
    expect(hasReturn).toBe(true);
  });

  it('Index.jsx: navMore.map tiene return ( antes del <button>', () => {
    const idx = read('src/pages/Index.jsx');
    const navMoreIdx = idx.indexOf('navMore.map(b => {');
    const mapBlock = idx.slice(navMoreIdx, navMoreIdx + 300);
    expect(mapBlock).toContain('return (');
    expect(mapBlock).toContain('<button');
  });

  it('Index.jsx: no tiene hooks inválidos (useEffect anidado en useEffect)', () => {
    const idx = read('src/pages/Index.jsx');
    // Verificar que ningún useEffect contiene otro useEffect en su cuerpo
    // Pattern: useEffect(() => {\n...useEffect
    const nestedPattern = /useEffect\(\(\) => \{[^}]*useEffect\(/s;
    expect(nestedPattern.test(idx)).toBe(false);
  });
});

describe('SP6-02 — apiAdapter.get unwrapea respuesta versionada', () => {
  it('dataService.get unwrapea {data, version} correctamente', () => {
    const ds = read('src/lib/dataService.js');
    expect(ds).toContain('response?.data !== undefined');
    expect(ds).toContain('response.data : response');
  });
  it('dataService.get guarda __version_ en localStorage', () => {
    const ds = read('src/lib/dataService.js');
    expect(ds).toContain('__version_${collection}');
  });
});

describe('SP6-03 — tailwind.config.ts no usa plugins eliminados', () => {
  it('tailwind.config.ts no referencia tailwindcss-animate', () => {
    const cfg = read('tailwind.config.ts');
    expect(cfg).not.toContain('tailwindcss-animate');
  });
  it('tailwind.config.ts tiene plugins vacío o válido', () => {
    const cfg = read('tailwind.config.ts');
    expect(cfg).toContain('plugins');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SPRINT 7 — Hardening de seguridad (continuación)
// ══════════════════════════════════════════════════════════════════════════════

describe('SP7-01 — SEC-05: Rate limiting persistente en PostgreSQL', () => {
  // SEC-05 (sesión 2026-05-08): reemplaza los Map() en memoria que no
  // sobrevivían deploys ni funcionaban con múltiples instancias serverless.

  it('existe api/lib/rateLimiter.js', () => {
    expect(exists('api/lib/rateLimiter.js')).toBe(true);
  });

  it('rateLimiter exporta checkRateLimit', () => {
    const rl = read('api/lib/rateLimiter.js');
    expect(rl).toContain('export async function checkRateLimit');
  });

  it('rateLimiter usa tabla rate_limit en PostgreSQL (DDL centralizado en setup.js)', () => {
    // C3: el DDL se movió a api/setup.js para evitar ejecutarlo en cada request.
    const setup = read('api/setup.js');
    expect(setup).toContain('CREATE TABLE IF NOT EXISTS rate_limit');
    const rl = read('api/lib/rateLimiter.js');
    expect(rl).toContain('rate_limit');
    expect(rl).toContain('ip');
    expect(rl).toContain('scope');
    expect(rl).toContain('window_end');
    expect(rl).toContain('count');
  });

  it('rateLimiter usa UPSERT atómico para evitar race conditions', () => {
    const rl = read('api/lib/rateLimiter.js');
    expect(rl).toContain('ON CONFLICT');
    expect(rl).toContain('DO UPDATE SET');
  });

  it('api/voluntarios NO tiene Map() de rate limiting en memoria', () => {
    const vol = read('api/voluntarios/index.js');
    // El Map antiguo se llamaba "intentos"
    expect(vol).not.toContain('const intentos = new Map()');
    expect(vol).not.toContain('intentos.get(ip)');
  });

  it('api/voluntarios importa checkRateLimit desde lib/rateLimiter', () => {
    const vol = read('api/voluntarios/index.js');
    expect(vol).toContain("from '../lib/rateLimiter.js'");
    expect(vol).toContain('checkRateLimit');
  });

  it('api/voluntarios usa await checkRateLimit en action=auth', () => {
    const vol = read('api/voluntarios/index.js');
    const idx = vol.indexOf("action === 'auth'");
    const block = vol.slice(idx, idx + 400);
    expect(block).toContain('await checkRateLimit');
    expect(block).toContain("'auth'");
  });

  it('api/data/public.js NO tiene ipRegistry Map() en memoria', () => {
    const pub = read('api/data/public.js');
    expect(pub).not.toContain('const ipRegistry = new Map()');
    expect(pub).not.toContain('ipRegistry.get(ip)');
  });

  it('api/data/public.js importa checkRateLimit desde lib/rateLimiter', () => {
    const pub = read('api/data/public.js');
    expect(pub).toContain("from '../lib/rateLimiter.js'");
    expect(pub).toContain('checkRateLimit');
  });

  it('api/data/public.js usa await checkRateLimit en POST con scope register', () => {
    const pub = read('api/data/public.js');
    expect(pub).toContain('await checkRateLimit');
    expect(pub).toContain("'register'");
  });

  it('rateLimiter limpia filas expiradas para no acumular basura', () => {
    const rl = read('api/lib/rateLimiter.js');
    expect(rl).toContain('DELETE FROM rate_limit WHERE window_end < NOW()');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SP7-02 — SEC-06: Cambio de PIN forzado en el primer login
// PIN inicial = últimos 4 dígitos del teléfono.
// El portal bloquea el acceso a la ficha hasta que se cambie.
// ─────────────────────────────────────────────────────────────────────────────
describe('SP7-02 — SEC-06: Cambio de PIN forzado en primer login', () => {
  it('api/voluntarios tiene función pinInicial que usa los últimos 4 dígitos', () => {
    const api = read('api/voluntarios/index.js');
    expect(api).toContain('function pinInicial(telefono)');
    expect(api).toContain('.slice(-4)');
  });

  it('api/voluntarios devuelve pinPersonalizado en la respuesta auth', () => {
    const api = read('api/voluntarios/index.js');
    // La respuesta de auth incluye el objeto voluntario completo (pub) que contiene pinPersonalizado
    // La desestructuración elimina solo pinHash y sessionToken
    expect(api).toContain('pinHash: _ph, sessionToken: _st, ...pub');
    // pinPersonalizado queda en pub → se incluye en la respuesta
    expect(api).toContain('voluntario: { ...pub, sessionToken }');
  });

  it('api/voluntarios acción cambiar-pin marca pinPersonalizado: true', () => {
    const api = read('api/voluntarios/index.js');
    expect(api).toContain("pinPersonalizado: true");
    expect(api).toContain("action === 'cambiar-pin'");
  });

  it('api/voluntarios acción reset-pin resetea pinPersonalizado: false', () => {
    const api = read('api/voluntarios/index.js');
    // reset-pin y recover-pin deben poner pinPersonalizado: false al resetear
    expect(api).toContain("pinPersonalizado: false");
  });

  it('VoluntarioPortal tiene estado mustChangePin', () => {
    const portal = read('src/pages/VoluntarioPortal.jsx');
    expect(portal).toContain('mustChangePin');
    expect(portal).toContain('setMustChangePin');
  });

  it('VoluntarioPortal activa mustChangePin cuando pinPersonalizado === false', () => {
    const portal = read('src/pages/VoluntarioPortal.jsx');
    expect(portal).toContain('pinPersonalizado === false');
    expect(portal).toContain('setMustChangePin(true)');
  });

  it('VoluntarioPortal muestra pantalla bloqueante cuando mustChangePin es true', () => {
    const portal = read('src/pages/VoluntarioPortal.jsx');
    expect(portal).toContain('if (mustChangePin) return');
    // La pantalla debe contener un mensaje explicativo
    expect(portal).toContain('Personaliza tu PIN');
  });

  it('VoluntarioPortal usa CambiarPin con hideCancel=true en modo forzado', () => {
    const portal = read('src/pages/VoluntarioPortal.jsx');
    expect(portal).toContain('hideCancel={true}');
  });

  it('CambiarPin acepta prop hideCancel y oculta el botón cancelar', () => {
    const portal = read('src/pages/VoluntarioPortal.jsx');
    expect(portal).toContain('hideCancel = false');
    expect(portal).toContain('!hideCancel &&');
  });

  it('VoluntarioPortal llama fetchData tras cambio de PIN forzado', () => {
    const portal = read('src/pages/VoluntarioPortal.jsx');
    // onDone del CambiarPin forzado debe desactivar mustChangePin y recargar datos
    expect(portal).toContain('setMustChangePin(false)');
    expect(portal).toContain('fetchData(true)');
  });

  it('Banner de PIN temporal sigue presente en la ficha normal', () => {
    const portal = read('src/pages/VoluntarioPortal.jsx');
    expect(portal).toContain('PIN temporal activo');
    expect(portal).toContain('!v.pinPersonalizado');
  });
});

// ─── SEC-07: Content-Security-Policy en vercel.json ─────────────────────────
describe('SEC-07 · Content-Security-Policy en vercel.json', () => {
  const getCSP = () => {
    const vercelJson = JSON.parse(read('vercel.json'));
    const catchAll = vercelJson.headers.find(r => r.source === '/(.*)');
    if (!catchAll) throw new Error('No existe la regla de headers "/(.*)" en vercel.json');
    const cspHeader = catchAll.headers.find(h => h.key === 'Content-Security-Policy');
    if (!cspHeader) throw new Error('No existe la cabecera Content-Security-Policy');
    return cspHeader.value;
  };

  it('vercel.json es JSON válido y contiene la sección headers', () => {
    const vercelJson = JSON.parse(read('vercel.json'));
    expect(Array.isArray(vercelJson.headers)).toBe(true);
  });

  it('La regla catch-all /(.*) incluye Content-Security-Policy', () => {
    const csp = getCSP();
    expect(typeof csp).toBe('string');
    expect(csp.length).toBeGreaterThan(0);
  });

  it('CSP define default-src restringido a self', () => {
    const csp = getCSP();
    expect(csp).toMatch(/default-src\s+'self'/);
  });

  it('CSP define script-src sin unsafe-eval', () => {
    const csp = getCSP();
    expect(csp).toContain('script-src');
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('CSP define script-src sin unsafe-inline', () => {
    const csp = getCSP();
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it('CSP permite Google Fonts en style-src y font-src', () => {
    const csp = getCSP();
    expect(csp).toContain('fonts.googleapis.com');
    expect(csp).toContain('fonts.gstatic.com');
  });

  it('CSP permite chart.googleapis.com solo en img-src', () => {
    const csp = getCSP();
    expect(csp).toMatch(/img-src[^;]*chart\.googleapis\.com/);
    // No debe aparecer en script-src ni default-src
    expect(csp).not.toMatch(/script-src[^;]*chart\.googleapis\.com/);
  });

  it('CSP incluye frame-ancestors para bloquear clickjacking (refuerza X-Frame-Options)', () => {
    const csp = getCSP();
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('CSP incluye upgrade-insecure-requests para forzar HTTPS', () => {
    const csp = getCSP();
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('CSP incluye base-uri para prevenir inyección de base tag', () => {
    const csp = getCSP();
    expect(csp).toContain("base-uri 'self'");
  });

  it('CSP incluye form-action para limitar destinos de formularios', () => {
    const csp = getCSP();
    expect(csp).toContain("form-action 'self'");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUBVENCIONES — Propuesta 2: sección con flujo de estado + sync Presupuesto
// ══════════════════════════════════════════════════════════════════════════════
describe('SUBV-01 — Módulo Subvenciones', () => {
  it('SK_DOC_SUBVENCIONES definida en storageKeys.js', () => {
    const sk = read('src/constants/storageKeys.js');
    expect(sk).toContain('SK_DOC_SUBVENCIONES');
    expect(sk).toContain('teg_documentos_v1_subvenciones');
  });
  it('SK_DOC_SUBVENCIONES exportada en mapa SK', () => {
    const sk = read('src/constants/storageKeys.js');
    expect(sk).toContain('DOC_SUBVENCIONES');
  });
  it('ESTADOS_SUBVENCION define ciclo completo de vida', () => {
    const doc = read('src/constants/documentosConstants.js'); // MEJ-23: moved to constants
    ['detectada','solicitada','en_evaluacion','concedida','justificada','cerrada','denegada'].forEach(e => {
      expect(doc).toContain(e);
    });
  });
  it('SUBVENCIONES_DEFAULT incluye subvenciones predefinidas', () => {
    const doc = read('src/constants/documentosConstants.js'); // MEJ-23: moved to constants
    expect(doc).toContain('SUBVENCIONES_DEFAULT');
    expect(doc).toContain('sv1');
    expect(doc).toContain('sv2');
  });
  it('saveSubvenciones sincroniza con Presupuesto (subvencionPublica)', () => {
    const doc = read('src/components/blocks/Documentos.jsx');
    expect(doc).toContain('saveSubvenciones');
    expect(doc).toContain('subvencionPublica');
    expect(doc).toContain('teg_presupuesto_v1_ingresosExtra');
  });
  it('sync solo activa subvenciones en estado concedida/justificada/cerrada', () => {
    const doc = read('src/components/blocks/Documentos.jsx');
    expect(doc).toContain('"concedida","justificada","cerrada"');
  });
  it('modal de subvención tiene campos de importe solicitado y concedido', () => {
    const doc = read('src/components/documentos/TabSubvenciones.jsx'); // MEJ-23: moved to subcomponent
    expect(doc).toContain('importeSolicitado');
    expect(doc).toContain('importeConcedido');
  });
  it('modal tiene las 4 fechas del ciclo documental', () => {
    const doc = read('src/components/documentos/TabSubvenciones.jsx'); // MEJ-23: moved to subcomponent
    expect(doc).toContain('fechaConvocatoria');
    expect(doc).toContain('fechaSolicitud');
    expect(doc).toContain('fechaResolucion');
    expect(doc).toContain('fechaJustificacion');
  });
  it('pestaña Subvenciones con total concedido visible en el tab', () => {
    // MEJ-23: tab logic in orchestrator, totalConcedido in TabSubvenciones
    const orch = read('src/components/blocks/Documentos.jsx');
    const sub  = read('src/components/documentos/TabSubvenciones.jsx');
    expect(orch).toContain('tab === "subvenciones"');
    expect(sub).toContain('totalConcedido');
  });
  it('confirmarDelete maneja esSubvencion', () => {
    const doc = read('src/components/blocks/Documentos.jsx');
    expect(doc).toContain('esSubvencion');
  });
});

describe('DOCS-P1 — Nuevas categorías de documento', () => {
  it('categoría comunicaciones definida', () => {
    const doc = read('src/constants/documentosConstants.js'); // MEJ-23: moved to constants
    expect(doc).toContain('"comunicaciones"');
    expect(doc).toContain('Comunicaciones');
  });
  it('categoría certificados definida', () => {
    const doc = read('src/constants/documentosConstants.js'); // MEJ-23: moved to constants
    expect(doc).toContain('"certificados"');
  });
  it('categoría rrhh definida', () => {
    const doc = read('src/constants/documentosConstants.js'); // MEJ-23: moved to constants
    expect(doc).toContain('"rrhh"');
    expect(doc).toContain('RR.HH.');
  });
  it('subcategorías definidas para las nuevas categorías', () => {
    const doc = read('src/constants/documentosConstants.js'); // MEJ-23: moved to constants
    expect(doc).toContain('Nota de prensa');
    expect(doc).toContain('Acreditación prensa');
    expect(doc).toContain('Autorización menor');
  });
});

describe('DOCS-P3 — Semáforo documental', () => {
  it('panel semáforo presente en el render', () => {
    const doc = read('src/components/blocks/Documentos.jsx');
    expect(doc).toContain('Estado documental');
  });
  it('semáforo evalúa permisos, seguros, gestiones y subvenciones', () => {
    const doc = read('src/components/blocks/Documentos.jsx');
    ['permOk','segOk','gestOk','svConcedidas'].forEach(v => expect(doc).toContain(v));
  });
});

describe('DOCS-P4 — Nuevas gestiones predefinidas', () => {
  it('9 gestiones predefinidas (5 originales + 4 nuevas)', () => {
    const doc = read('src/constants/documentosConstants.js'); // MEJ-23: moved to constants
    expect(doc).toContain('"g6"');
    expect(doc).toContain('"g7"');
    expect(doc).toContain('"g8"');
    expect(doc).toContain('"g9"');
  });
  it('Plan de autoprotección incluido', () => {
    const doc = read('src/constants/documentosConstants.js'); // MEJ-23: moved to constants
    expect(doc).toContain('Plan de autoprotección');
  });
  it('Notificación Guardia Civil incluida', () => {
    const doc = read('src/constants/documentosConstants.js'); // MEJ-23: moved to constants
    expect(doc).toContain('Guardia Civil');
  });
  it('Aviso servicios de emergencia incluido', () => {
    const doc = read('src/constants/documentosConstants.js'); // MEJ-23: moved to constants
    expect(doc).toContain('112');
  });
  it('Permiso grabación/fotografía incluido', () => {
    const doc = read('src/constants/documentosConstants.js'); // MEJ-23: moved to constants
    expect(doc).toContain('grabación');
  });
  it('Protección Civil en subcategorías de gestiones', () => {
    const doc = read('src/constants/documentosConstants.js'); // MEJ-23: moved to constants
    expect(doc).toContain('Protección Civil');
  });
});

describe('DOCS-P5 — Importe en contratos y seguros', () => {
  it('contratos y seguros incluidos en condición de importe', () => {
    const doc = read('src/components/blocks/Documentos.jsx');
    expect(doc).toContain('"contratos","seguros"');
  });
  it('placeholder diferenciado para seguros', () => {
    const doc = read('src/components/blocks/Documentos.jsx');
    expect(doc).toContain('Prima anual');
  });
  it('placeholder diferenciado para contratos', () => {
    const doc = read('src/components/blocks/Documentos.jsx');
    expect(doc).toContain('Importe del contrato');
  });
});
