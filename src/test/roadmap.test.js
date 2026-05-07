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
  it('usePaginacion retorna resetPage', () => {
    const hook = read('src/lib/usePaginacion.jsx');
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
    const syncBlock = ds.slice(syncIdx, syncIdx + 1500);
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
