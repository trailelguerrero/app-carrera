/**
 * ConfirmModal.jsx — T3.5
 * Modal de confirmación reutilizable para operaciones destructivas.
 * Muestra el nombre del elemento a eliminar y botones Confirmar/Cancelar.
 *
 * Uso:
 *   <ConfirmModal
 *     open={!!delId}
 *     title="Eliminar voluntario"
 *     message={`¿Eliminar a ${vol.nombre}? Esta acción no se puede deshacer.`}
 *     confirmLabel="Eliminar"
 *     variant="danger"          // "danger" | "warning" | "default"
 *     onConfirm={() => { deleteFn(); setDelId(null); }}
 *     onCancel={() => setDelId(null)}
 *   />
 */
import { useEffect } from "react";
import { createPortal } from "react-dom";

const VARIANT = {
  danger:  { color: "var(--red)",   bg: "var(--red-dim)",   border: "var(--red-border)",   icon: "🗑️" },
  warning: { color: "var(--amber)", bg: "var(--amber-dim)", border: "var(--amber-border)", icon: "⚠️" },
  default: { color: "var(--cyan)",  bg: "var(--cyan-dim)",  border: "var(--cyan-border)",  icon: "❓" },
};

export default function ConfirmModal({
  open,
  title = "Confirmar acción",
  message,
  confirmLabel = "Confirmar",
  cancelLabel  = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}) {
  const v = VARIANT[variant] || VARIANT.default;

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="modal" style={{ maxWidth: 380, textAlign: "center" }}>
        {/* Icono */}
        <div style={{ fontSize: "2.5rem", marginBottom: ".65rem" }}>{v.icon}</div>

        {/* Título */}
        <div id="confirm-modal-title" style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "var(--fs-md)", color: v.color, marginBottom: ".5rem",
        }}>
          {title}
        </div>

        {/* Mensaje */}
        {message && (
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
            color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem",
          }}>
            {message}
          </div>
        )}

        {/* Botones */}
        <div style={{ display: "flex", gap: ".75rem", justifyContent: "center" }}>
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            className="btn"
            style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}` }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
