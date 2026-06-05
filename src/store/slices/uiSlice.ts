/**
 * uiSlice.ts — Estado global de navegación (UI)
 *
 * Gestiona qué módulo está activo, sidebar y overlays globales.
 * No persiste datos del servidor; eso es trabajo de React Query.
 *
 * Uso:
 *   import { useActiveBlock, useSetActiveBlock } from '@/store/useAppStore'
 *   const activeBlock = useActiveBlock()
 *   const setActiveBlock = useSetActiveBlock()
 */

export type BlockId =
  | 'dashboard'
  | 'presupuesto'
  | 'voluntarios'
  | 'logistica'
  | 'patrocinadores'
  | 'proyecto'
  | 'camisetas'
  | 'documentos'
  | 'diacarrera'
  | 'configuracion';

export interface UIState {
  /** Módulo activo en la navegación principal */
  activeBlock: BlockId;
  /** Overlay de día de carrera visible */
  showDiaCarrera: boolean;
  /** Menú "más nav" desplegado */
  showMoreNav: boolean;
  /** Navegación rápida desplegada */
  showQuickNav: boolean;
  /** Subtab pendiente de consumir por el módulo de destino */
  pendingSubtab: string | null;
  /** Filtro pendiente de consumir (p.ej. filtroTareaId desde Proyecto) */
  pendingFilter: Record<string, unknown> | null;
}

export interface UIActions {
  setActiveBlock: (block: BlockId) => void;
  setShowDiaCarrera: (show: boolean) => void;
  setShowMoreNav: (show: boolean) => void;
  setShowQuickNav: (show: boolean) => void;
  setPendingSubtab: (subtab: string | null) => void;
  setPendingFilter: (filter: Record<string, unknown> | null) => void;
  /** Navega a un módulo y opcionalmente inyecta subtab + filtro */
  navigateTo: (
    block: BlockId,
    opts?: { subtab?: string; filter?: Record<string, unknown> }
  ) => void;
}

export type UISlice = UIState & UIActions;

export const createUISlice = (
  set: (partial: Partial<UISlice> | ((state: UISlice) => Partial<UISlice>)) => void
): UISlice => ({
  // ── Estado inicial ──────────────────────────────────────────────────────────
  activeBlock: 'dashboard',
  showDiaCarrera: false,
  showMoreNav: false,
  showQuickNav: false,
  pendingSubtab: null,
  pendingFilter: null,

  // ── Acciones ─────────────────────────────────────────────────────────────────
  setActiveBlock: (block) => set({ activeBlock: block }),
  setShowDiaCarrera: (show) => set({ showDiaCarrera: show }),
  setShowMoreNav: (show) => set({ showMoreNav: show }),
  setShowQuickNav: (show) => set({ showQuickNav: show }),
  setPendingSubtab: (subtab) => set({ pendingSubtab: subtab }),
  setPendingFilter: (filter) => set({ pendingFilter: filter }),

  navigateTo: (block, opts) =>
    set({
      activeBlock: block,
      pendingSubtab: opts?.subtab ?? null,
      pendingFilter: opts?.filter ?? null,
      showMoreNav: false,
      showQuickNav: false,
    }),
});
