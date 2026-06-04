export function ModalImportPreview({ importPreview, onCancel, onConfirm }) {
  if (!importPreview) return null;
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="mtit">⬆️ Confirmar restauración</span>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body" style={{ gap: ".65rem" }}>
          <div style={{ background: "var(--surface2)", borderRadius: 8, padding: ".65rem .85rem", fontSize: "var(--fs-sm)", fontFamily: "var(--font-mono)", lineHeight: 1.7, border: "1px solid var(--border)" }}>
            <div><span style={{ color: "var(--text-muted)" }}>Versión backup:</span> <strong>{importPreview.meta.version}</strong></div>
            <div><span style={{ color: "var(--text-muted)" }}>Fecha de creación:</span> <strong>{importPreview.meta.fecha}</strong></div>
            <div><span style={{ color: "var(--text-muted)" }}>Evento:</span> <strong>{importPreview.meta.evento}</strong></div>
          </div>
          <div style={{ background: "var(--amber-dim)", borderRadius: 6, padding: ".55rem .75rem", fontSize: "var(--fs-sm)", fontFamily: "var(--font-mono)", color: "var(--amber)", border: "1px solid rgba(251,191,36,.25)", display: "flex", alignItems: "flex-start", gap: ".5rem" }}>
            <span style={{ flexShrink: 0, fontSize: "var(--fs-base)" }}>⚠️</span>
            <span>Se sobreescribirán los datos actuales con los del backup. Esta acción <strong>no se puede deshacer</strong>.</span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", marginBottom: ".4rem" }}>
              Colecciones a restaurar ({importPreview.totalClaves})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
              {importPreview.resumen.map(r => (
                <div key={r.modulo} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".3rem .5rem", borderRadius: 4, background: "var(--surface2)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)" }}>
                  <span style={{ color: "var(--text)" }}>{r.modulo}</span>
                  <span style={{ color: "var(--text-muted)" }}>{r.claves} colecc. · {r.items} registros</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-red" onClick={onConfirm}>🔄 Restaurar y sobreescribir</button>
        </div>
      </div>
    </div>
  );
}
