/**
 * toast.ts — sistema de toasts vía CustomEvent
 *
 * Uso en cualquier componente hijo:
 *   import { toast } from "@/lib/toast";
 *   toast.success("Exportación completada");
 *   toast.error("Error al guardar");
 *   toast.info("3 voluntarios confirmados");
 *   toast.warning("Stock por debajo del mínimo");
 *
 * El renderizado vive en Index.jsx y escucha CustomEvent("teg-toast").
 * No requiere contexto ni props.
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastDetail {
  type: ToastType;
  message: string;
  duration: number;
  id: number;
  /** Si se provee, el toast no se auto-descarta y muestra un botón de acción. */
  action?: ToastAction;
}

const DEFAULT_DURATION = 3500;

function emit(type: ToastType, message: string, duration: number = DEFAULT_DURATION, action?: ToastAction): void {
  window.dispatchEvent(new CustomEvent<ToastDetail>('teg-toast', {
    detail: { type, message, duration, id: Date.now() + Math.random(), action },
  }));
}

export const toast = {
  success: (msg: string, ms: number = DEFAULT_DURATION) => emit('success', msg, ms),
  error:   (msg: string, ms: number = DEFAULT_DURATION) => emit('error',   msg, ms),
  info:    (msg: string, ms: number = DEFAULT_DURATION) => emit('info',    msg, ms),
  warning: (msg: string, ms: number = DEFAULT_DURATION) => emit('warning', msg, ms),
  /** Toast con botón de acción — no se auto-descarta hasta que el usuario actúa o cierra. */
  action:  (type: ToastType, msg: string, action: ToastAction) => emit(type, msg, 0, action),
};
