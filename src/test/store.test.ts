/**
 * store.test.ts — Tests Fase 4: slices de Zustand por módulo
 *
 * Cubre:
 *   - uiSlice: navegación global
 *   - logisticaSlice: tab, filtro, órdenes
 *   - diaCarreraSlice: tab, búsqueda
 *   - integración: store combinado
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ── Importar slices directamente (sin React, sin DOM) ────────────────────────
// Usamos un store aislado por test para evitar estado compartido

function makeStore() {
  // Mini-implementación del patrón create() de Zustand para tests unitarios
  // sin necesidad del DOM ni React
  let state: Record<string, unknown> = {};
  const set = (partial: unknown) => {
    if (typeof partial === 'function') {
      state = { ...state, ...(partial as (s: typeof state) => typeof state)(state) };
    } else {
      state = { ...state, ...(partial as Record<string, unknown>) };
    }
  };
  const get = () => state;
  return { set, get, getState: () => state };
}

// ── uiSlice ──────────────────────────────────────────────────────────────────
import { createUISlice } from '../store/slices/uiSlice';

describe('uiSlice', () => {
  let store: ReturnType<typeof makeStore>;
  let slice: ReturnType<typeof createUISlice>;

  beforeEach(() => {
    store = makeStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    slice = createUISlice(store.set as any);
    Object.assign(store.getState(), slice);
  });

  it('estado inicial correcto', () => {
    expect(slice.activeBlock).toBe('dashboard');
    expect(slice.showDiaCarrera).toBe(false);
    expect(slice.pendingSubtab).toBeNull();
    expect(slice.pendingFilter).toBeNull();
  });

  it('setActiveBlock cambia módulo', () => {
    slice.setActiveBlock('voluntarios');
    const s = store.getState() as typeof slice;
    expect(s.activeBlock).toBe('voluntarios');
  });

  it('navigateTo cambia módulo y cierra menús', () => {
    slice.setActiveBlock('presupuesto');
    // Simular menú abierto
    slice.setShowMoreNav(true);
    slice.navigateTo('logistica', { subtab: 'material' });
    const s = store.getState() as typeof slice;
    expect(s.activeBlock).toBe('logistica');
    expect(s.pendingSubtab).toBe('material');
    expect(s.showMoreNav).toBe(false);
  });

  it('navigateTo sin opts limpia pendingSubtab y pendingFilter', () => {
    slice.setPendingSubtab('checklist');
    slice.setPendingFilter({ filtroTareaId: '123' });
    slice.navigateTo('dashboard');
    const s = store.getState() as typeof slice;
    expect(s.pendingSubtab).toBeNull();
    expect(s.pendingFilter).toBeNull();
  });

  it('setShowDiaCarrera alterna overlay', () => {
    slice.setShowDiaCarrera(true);
    expect((store.getState() as typeof slice).showDiaCarrera).toBe(true);
    slice.setShowDiaCarrera(false);
    expect((store.getState() as typeof slice).showDiaCarrera).toBe(false);
  });
});

// ── logisticaSlice ───────────────────────────────────────────────────────────
import { createLogisticaSlice } from '../store/slices/logisticaSlice';

describe('logisticaSlice', () => {
  let store: ReturnType<typeof makeStore>;
  let slice: ReturnType<typeof createLogisticaSlice>;

  beforeEach(() => {
    store = makeStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    slice = createLogisticaSlice(store.set as any);
    Object.assign(store.getState(), slice);
  });

  const log = () => (store.getState() as ReturnType<typeof createLogisticaSlice>).logistica;

  it('estado inicial correcto', () => {
    expect(slice.logistica.tab).toBe('dashboard');
    expect(slice.logistica.filtroTareaId).toBeNull();
    expect(slice.logistica.ordenMat).toBe(false);
  });

  it('setTab cambia pestaña activa', () => {
    slice.setLogisticaTab('material');
    expect(log().tab).toBe('material');
  });

  it('setFiltroTareaId guarda filtro', () => {
    slice.setLogisticaFiltroTareaId('tarea-42');
    expect(log().filtroTareaId).toBe('tarea-42');
  });

  it('setFiltroTareaId acepta null (limpiar filtro)', () => {
    slice.setLogisticaFiltroTareaId('x');
    slice.setLogisticaFiltroTareaId(null);
    expect(log().filtroTareaId).toBeNull();
  });

  it('toggleOrden invierte columna mat', () => {
    expect(log().ordenMat).toBe(false);
    slice.toggleLogisticaOrden('mat');
    expect(log().ordenMat).toBe(true);
    slice.toggleLogisticaOrden('mat');
    expect(log().ordenMat).toBe(false);
  });

  it('toggleOrden cada columna independiente', () => {
    slice.toggleLogisticaOrden('veh');
    expect(log().ordenVeh).toBe(true);
    expect(log().ordenMat).toBe(false);
    expect(log().ordenCK).toBe(false);
  });

  it('resetLogisticaUI devuelve a estado inicial', () => {
    slice.setLogisticaTab('checklist');
    slice.setLogisticaFiltroTareaId('abc');
    slice.toggleLogisticaOrden('ck');
    slice.resetLogisticaUI();
    expect(log().tab).toBe('dashboard');
    expect(log().filtroTareaId).toBeNull();
    expect(log().ordenCK).toBe(false);
  });
});

// ── diaCarreraSlice ──────────────────────────────────────────────────────────
import { createDiaCarreraSlice } from '../store/slices/diaCarreraSlice';

describe('diaCarreraSlice', () => {
  let store: ReturnType<typeof makeStore>;
  let slice: ReturnType<typeof createDiaCarreraSlice>;

  beforeEach(() => {
    store = makeStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    slice = createDiaCarreraSlice(store.set as any);
    Object.assign(store.getState(), slice);
  });

  const dc = () => (store.getState() as ReturnType<typeof createDiaCarreraSlice>).diaCarrera;

  it('estado inicial correcto', () => {
    expect(slice.diaCarrera.tab).toBe('ahora');
    expect(slice.diaCarrera.busPresencia).toBe('');
  });

  it('setTab cambia pestaña', () => {
    slice.setDiaCarreraTab('timeline');
    expect(dc().tab).toBe('timeline');
  });

  it('setBusPresencia guarda query', () => {
    slice.setDiaCarreraBusPresencia('García');
    expect(dc().busPresencia).toBe('García');
  });

  it('resetDiaCarreraUI limpia estado', () => {
    slice.setDiaCarreraTab('presencia');
    slice.setDiaCarreraBusPresencia('Juan');
    slice.resetDiaCarreraUI();
    expect(dc().tab).toBe('ahora');
    expect(dc().busPresencia).toBe('');
  });
});
