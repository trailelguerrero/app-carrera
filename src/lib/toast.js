/**
 * useToast — hook para emitir toasts desde cualquier módulo
 *
 * Uso en cualquier componente hijo:
 *   import { toast } from "@/lib/toast";
 *   toast.success("Exportación completada");
 *   toast.error("Error al guardar");
 *   toast.info("3 voluntarios confirmados");
 *   toast.warning("Stock por debajo del mínimo");
 *
 * El sistema de renderizado vive en Index.jsx y escucha el evento
 * CustomEvent("teg-toast") — no requiere contexto ni props.
 */

const DEFAULT_DURATION = 3500;

function emit(type, message, duration = DEFAULT_DURATION) {
  window.dispatchEvent(new CustomEvent("teg-toast", {
    detail: { type, message, duration, id: Date.now() + Math.random() }
  }));
}

export const toast = {
  success: (msg, ms = DEFAULT_DURATION) => emit("success", msg, ms),
  error:   (msg, ms = DEFAULT_DURATION) => emit("error",   msg, ms),
  info:    (msg, ms = DEFAULT_DURATION) => emit("info",    msg, ms),
  warning: (msg, ms = DEFAULT_DURATION) => emit("warning", msg, ms),
};
