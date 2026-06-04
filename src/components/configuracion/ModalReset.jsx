import { createPortal } from "react-dom";

export function ModalReset({ resetModal, resetInput, setResetInput, onCancel, onConfirm }) {
  if (!resetModal) return null;
  return createPortal(
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()} style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="mtit" style={{ color: "var(--red)" }}>⚠️ Esta acción no tiene vuelta atrás</span>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body" style={{ gap: ".75rem" }}>
          <div style={{ background: "rgba(248,113,113,.08)", borderRadius: 8, padding: ".65rem .85rem", fontSize: "var(--fs-sm)", fontFamily: "var(--font-mono)", lineHeight: 1.7, border: "1px solid rgba(248,113,113,.3)", color: "var(--text)" }}>
            Se borrarán permanentemente los siguientes datos:
            <ul style={{ margin: ".4rem 0 0 1rem", padding: 0, color: "var(--text-muted)" }}>
              <li>👥 Voluntarios y puestos</li>
              <li>💰 Presupuesto e inscripciones</li>
              <li>📦 Logística y materiales</li>
              <li>🤝 Patrocinadores</li>
              <li>🏔️ Proyecto, tareas e hitos</li>
              <li>⚙️ Configuración del evento</li>
            </ul>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", lineHeight: 1.6 }}>
            Escribe <strong style={{ color: "var(--red)" }}>BORRAR</strong> para confirmar:
          </div>
          <input
            className="cfg-input"
            type="text"
            placeholder="Escribe BORRAR para confirmar"
            value={resetInput}
            onChange={e => setResetInput(e.target.value)}
            autoFocus
            style={{ fontFamily: "var(--font-mono)", letterSpacing: ".05em" }}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-red"
            disabled={resetInput.trim() !== "BORRAR"}
            style={{ opacity: resetInput.trim() === "BORRAR" ? 1 : .4, cursor: resetInput.trim() === "BORRAR" ? "pointer" : "not-allowed" }}
            onClick={onConfirm}
          >
            🗑️ Borrar todo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
