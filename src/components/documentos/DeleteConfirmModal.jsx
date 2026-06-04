import { createPortal } from "react-dom";

export function DeleteConfirmModal({ delConfirm, onCancel, onConfirm }) {
  if (!delConfirm) return null;

  return createPortal(
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: "1rem",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 14, padding: "1.5rem", maxWidth: 320, width: "100%",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "var(--fs-xl)", marginBottom: ".6rem" }}>🗑</div>
        <div style={{ fontWeight: 800, fontSize: "var(--fs-md)", marginBottom: ".35rem" }}>
          ¿Eliminar este {delConfirm.esGestion ? "trámite" : delConfirm.esSubvencion ? "subvención" : "documento"}?
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
          color: "var(--text-muted)", marginBottom: "1.25rem",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {delConfirm.nombre}
        </div>
        <div style={{ display: "flex", gap: ".5rem", justifyContent: "center" }}>
          <button onClick={onCancel} className="btn btn-ghost">Cancelar</button>
          <button onClick={onConfirm} className="btn btn-red">Eliminar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
