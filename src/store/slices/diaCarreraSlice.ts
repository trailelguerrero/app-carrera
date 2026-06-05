/**
 * diaCarreraSlice.ts — Estado de UI del módulo Día de Carrera
 *
 * Estructura plana: acciones al nivel raíz del store (refs estables).
 */

export type DiaCarreraTab = 'ahora' | 'timeline' | 'presencia' | 'mapa';

export interface DiaCarreraState {
  tab: DiaCarreraTab;
  busPresencia: string;
}

export interface DiaCarreraActions {
  setDiaCarreraTab: (tab: DiaCarreraTab) => void;
  setDiaCarreraBusPresencia: (q: string) => void;
  resetDiaCarreraUI: () => void;
}

export type DiaCarreraSlice = { diaCarrera: DiaCarreraState } & DiaCarreraActions;

const initialDiaCarreraState: DiaCarreraState = {
  tab: 'ahora',
  busPresencia: '',
};

export const createDiaCarreraSlice = (
  set: (
    partial:
      | Partial<DiaCarreraSlice>
      | ((state: DiaCarreraSlice) => Partial<DiaCarreraSlice>)
  ) => void
): DiaCarreraSlice => ({
  // ── Estado ─────────────────────────────────────────────────────────────────
  diaCarrera: { ...initialDiaCarreraState },

  // ── Acciones al nivel raíz (refs estables entre renders) ──────────────────
  setDiaCarreraTab: (tab) =>
    set((s) => ({ diaCarrera: { ...s.diaCarrera, tab } })),

  setDiaCarreraBusPresencia: (q) =>
    set((s) => ({ diaCarrera: { ...s.diaCarrera, busPresencia: q } })),

  resetDiaCarreraUI: () =>
    set((s) => ({
      diaCarrera: { ...s.diaCarrera, ...initialDiaCarreraState },
    })),
});
