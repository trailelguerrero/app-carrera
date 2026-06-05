/**
 * logisticaSlice.ts — Estado de UI del módulo Logística
 *
 * Estructura plana: acciones al nivel raíz del store (refs estables).
 * Estado anidado bajo `logistica` para claridad.
 */

export type LogisticaTab =
  | 'dashboard'
  | 'material'
  | 'vehiculos'
  | 'timeline'
  | 'contactos'
  | 'checklist'
  | 'emergencias'
  | 'pedidos';

export interface LogisticaState {
  tab: LogisticaTab;
  filtroTareaId: string | null;
  ordenMat: boolean;
  ordenVeh: boolean;
  ordenTL: boolean;
  ordenCont: boolean;
  ordenCK: boolean;
}

export interface LogisticaActions {
  setLogisticaTab: (tab: LogisticaTab) => void;
  setLogisticaFiltroTareaId: (id: string | null) => void;
  toggleLogisticaOrden: (col: 'mat' | 'veh' | 'tl' | 'cont' | 'ck') => void;
  resetLogisticaUI: () => void;
}

export type LogisticaSlice = { logistica: LogisticaState } & LogisticaActions;

const initialLogisticaState: LogisticaState = {
  tab: 'dashboard',
  filtroTareaId: null,
  ordenMat: false,
  ordenVeh: false,
  ordenTL: false,
  ordenCont: false,
  ordenCK: false,
};

const ordenKey: Record<'mat' | 'veh' | 'tl' | 'cont' | 'ck', keyof LogisticaState> = {
  mat: 'ordenMat',
  veh: 'ordenVeh',
  tl: 'ordenTL',
  cont: 'ordenCont',
  ck: 'ordenCK',
};

export const createLogisticaSlice = (
  set: (
    partial:
      | Partial<LogisticaSlice>
      | ((state: LogisticaSlice) => Partial<LogisticaSlice>)
  ) => void
): LogisticaSlice => ({
  // ── Estado ─────────────────────────────────────────────────────────────────
  logistica: { ...initialLogisticaState },

  // ── Acciones al nivel raíz (refs estables entre renders) ──────────────────
  setLogisticaTab: (tab) =>
    set((s) => ({ logistica: { ...s.logistica, tab } })),

  setLogisticaFiltroTareaId: (id) =>
    set((s) => ({ logistica: { ...s.logistica, filtroTareaId: id } })),

  toggleLogisticaOrden: (col) =>
    set((s) => ({
      logistica: {
        ...s.logistica,
        [ordenKey[col]]: !s.logistica[ordenKey[col]],
      },
    })),

  resetLogisticaUI: () =>
    set((s) => ({
      logistica: { ...s.logistica, ...initialLogisticaState },
    })),
});
