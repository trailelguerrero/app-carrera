/**
 * useAppStore.js — Mejora 3: Store central Zustand
 *
 * Store principal de la app. Combina slices por dominio.
 * Uso:
 *   import { useAppStore, EVENT_TYPES } from '@/store/useAppStore'
 *
 *   // Emitir evento tipado desde un módulo:
 *   const emitFromModule = useAppStore(s => s.emitFromModule)
 *   emitFromModule('voluntarios', { accion: 'confirmado', id: vol.id })
 *
 *   // Suscribirse a cambios de un módulo concreto:
 *   const lastEvent = useAppStore(s => s.lastEvent)
 *   useEffect(() => {
 *     if (lastEvent?.module === 'voluntarios') recalcular()
 *   }, [lastEvent])
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createEventBusSlice } from './slices/eventBusSlice';

export { EVENT_TYPES } from './slices/eventBusSlice';

export const useAppStore = create(
  devtools(
    (...args) => ({
      ...createEventBusSlice(...args),
    }),
    { name: 'AppCarrera' }
  )
);

// ── Selectores de conveniencia ────────────────────────────────────────────────
// Evitan re-renders innecesarios al extraer solo lo necesario del store.

/** Último evento emitido */
export const useLastEvent = () => useAppStore((s) => s.lastEvent);

/** Acción: emitir desde un módulo (referencia estable, no causa re-render) */
export const useEmitFromModule = () => useAppStore((s) => s.emitFromModule);

/** Acción: emitir evento tipado explícito */
export const useEmitEvent = () => useAppStore((s) => s.emitEvent);

/** Historial de eventos (para debug / DevTools) */
export const useEventHistory = () => useAppStore((s) => s.eventHistory);
