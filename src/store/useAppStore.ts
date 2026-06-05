/**
 * useAppStore.ts — Store central Zustand (Fase 4)
 *
 * Combina slices por dominio. Todas las acciones al nivel raíz (refs estables).
 * Selectores atómicos (primitivos) para evitar re-renders innecesarios.
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import { createEventBusSlice } from './slices/eventBusSlice';
import type { UISlice, BlockId } from './slices/uiSlice';
import { createUISlice } from './slices/uiSlice';
import type { LogisticaSlice, LogisticaTab } from './slices/logisticaSlice';
import { createLogisticaSlice } from './slices/logisticaSlice';
import type { DiaCarreraSlice, DiaCarreraTab } from './slices/diaCarreraSlice';
import { createDiaCarreraSlice } from './slices/diaCarreraSlice';

export { EVENT_TYPES, EVENT_ACTIONS } from './slices/eventBusSlice';
export type { BlockId } from './slices/uiSlice';
export type { LogisticaTab } from './slices/logisticaSlice';
export type { DiaCarreraTab } from './slices/diaCarreraSlice';

type AppStore = UISlice & LogisticaSlice & DiaCarreraSlice & {
  lastEvent: unknown;
  eventHistory: unknown[];
  emitEvent: (type: string, module: string, payload?: Record<string, unknown>) => void;
  emitFromModule: (module: string, payload?: Record<string, unknown>) => void;
};

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector((...args) => {
      const [set] = args;
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(createEventBusSlice as any)(...args),
        ...createUISlice(set as Parameters<typeof createUISlice>[0]),
        ...createLogisticaSlice(set as Parameters<typeof createLogisticaSlice>[0]),
        ...createDiaCarreraSlice(set as Parameters<typeof createDiaCarreraSlice>[0]),
      };
    }),
    { name: 'AppCarrera' }
  )
);

// ── Selectores: eventBus ──────────────────────────────────────────────────────
export const useLastEvent      = () => useAppStore((s) => s.lastEvent);
export const useEmitFromModule = () => useAppStore((s) => s.emitFromModule);
export const useEmitEvent      = () => useAppStore((s) => s.emitEvent);
export const useEventHistory   = () => useAppStore((s) => s.eventHistory);

// ── Selectores: UI global ─────────────────────────────────────────────────────
export const useActiveBlock        = () => useAppStore((s) => s.activeBlock);
export const useSetActiveBlock     = () => useAppStore((s) => s.setActiveBlock);
export const useShowDiaCarrera     = () => useAppStore((s) => s.showDiaCarrera);
export const useSetShowDiaCarrera  = () => useAppStore((s) => s.setShowDiaCarrera);
export const useShowMoreNav        = () => useAppStore((s) => s.showMoreNav);
export const useSetShowMoreNav     = () => useAppStore((s) => s.setShowMoreNav);
export const useShowQuickNav       = () => useAppStore((s) => s.showQuickNav);
export const useSetShowQuickNav    = () => useAppStore((s) => s.setShowQuickNav);
export const usePendingSubtab      = () => useAppStore((s) => s.pendingSubtab);
export const useSetPendingSubtab   = () => useAppStore((s) => s.setPendingSubtab);
export const usePendingFilter      = () => useAppStore((s) => s.pendingFilter);
export const useSetPendingFilter   = () => useAppStore((s) => s.setPendingFilter);
export const useNavigateTo         = () => useAppStore((s) => s.navigateTo);

// ── Selectores: Logística (primitivos — evitan re-renders) ────────────────────
export const useLogisticaTab             = () => useAppStore((s) => s.logistica.tab);
export const useSetLogisticaTab          = () => useAppStore((s) => s.setLogisticaTab);
export const useLogisticaFiltro          = () => useAppStore((s) => s.logistica.filtroTareaId);
export const useSetLogisticaFiltro       = () => useAppStore((s) => s.setLogisticaFiltroTareaId);
export const useToggleLogisticaOrden     = () => useAppStore((s) => s.toggleLogisticaOrden);
export const useResetLogisticaUI         = () => useAppStore((s) => s.resetLogisticaUI);
// Ordenaciones individuales (primitivo booleano = ref estable)
export const useLogisticaOrdenMat        = () => useAppStore((s) => s.logistica.ordenMat);
export const useLogisticaOrdenVeh        = () => useAppStore((s) => s.logistica.ordenVeh);
export const useLogisticaOrdenTL         = () => useAppStore((s) => s.logistica.ordenTL);
export const useLogisticaOrdenCont       = () => useAppStore((s) => s.logistica.ordenCont);
export const useLogisticaOrdenCK         = () => useAppStore((s) => s.logistica.ordenCK);
/** @deprecated Usa los selectores individuales useLogisticaOrden* para evitar re-renders */
export const useLogisticaOrden           = () =>
  useAppStore((s) => s.logistica, (a, b) =>
    a.ordenMat === b.ordenMat &&
    a.ordenVeh === b.ordenVeh &&
    a.ordenTL  === b.ordenTL  &&
    a.ordenCont=== b.ordenCont &&
    a.ordenCK  === b.ordenCK
  );

// ── Selectores: Día de Carrera (primitivos) ───────────────────────────────────
export const useDiaCarreraTab              = () => useAppStore((s) => s.diaCarrera.tab);
export const useSetDiaCarreraTab           = () => useAppStore((s) => s.setDiaCarreraTab);
export const useDiaCarreraBusPresencia     = () => useAppStore((s) => s.diaCarrera.busPresencia);
export const useSetDiaCarreraBusPresencia  = () => useAppStore((s) => s.setDiaCarreraBusPresencia);
export const useResetDiaCarreraUI          = () => useAppStore((s) => s.resetDiaCarreraUI);
