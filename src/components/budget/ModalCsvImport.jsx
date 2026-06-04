import { useRef } from "react";

export const ModalCsvImport = ({
  open, onClose,
  tramos, inscritos,
  csvPreview, setCsvPreview,
  csvMergeMode, setCsvMergeMode,
  onFileChange, onConfirm,
}) => {
  const csvInputRef = useRef(null);
  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.75rem", maxWidth: 560, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", animation: "slideUp 0.2s ease", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ fontWeight: 800, fontSize: "var(--fs-md)" }}>📥 Importar inscritos desde CSV</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Instrucciones */}
        <div style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 10, padding: ".75rem 1rem", marginBottom: "1rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", lineHeight: 1.8 }}>
          <div style={{ color: "var(--violet)", fontWeight: 700, marginBottom: ".25rem" }}>Formato esperado del CSV:</div>
          <div>Columnas (en cualquier orden): <strong>distancia</strong>, <strong>tramo</strong>, <strong>numero</strong></div>
          <div>Separador: coma (<code>,</code>) o punto y coma (<code>;</code>) — detectado automáticamente</div>
          <div>Distancias válidas: <strong>TG7</strong>, <strong>TG13</strong>, <strong>TG25</strong></div>
          <div>Los nombres de tramo deben coincidir con los tramos configurados en esta tab.</div>
          <div style={{ marginTop: ".3rem" }}>Tamaño máximo: 2 MB</div>
        </div>

        {/* Selector de archivo */}
        <div style={{ marginBottom: "1rem" }}>
          <input ref={csvInputRef} type="file" accept=".csv,.txt" onChange={onFileChange} style={{ display: "none" }} id="csv-upload-input" />
          <label htmlFor="csv-upload-input" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            📂 Seleccionar archivo CSV
          </label>
        </div>

        {/* Preview */}
        {csvPreview && (
          <div>
            {csvPreview.errors.length > 0 && (
              <div style={{ background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.25)", borderRadius: 8, padding: ".65rem .9rem", marginBottom: ".75rem" }}>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--amber)", marginBottom: ".35rem" }}>
                  ⚠️ {csvPreview.errors.length} fila{csvPreview.errors.length !== 1 ? "s" : ""} con error de formato (se ignorarán):
                </div>
                {csvPreview.errors.slice(0, 5).map((e, i) => (
                  <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>{e}</div>
                ))}
                {csvPreview.errors.length > 5 && (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>...y {csvPreview.errors.length - 5} más</div>
                )}
              </div>
            )}

            {csvPreview.rows.length > 0 ? (
              <>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--green)", marginBottom: ".5rem" }}>
                  ✅ {csvPreview.rows.length} fila{csvPreview.rows.length !== 1 ? "s" : ""} válida{csvPreview.rows.length !== 1 ? "s" : ""} — preview (primeras 5):
                </div>
                <div className="overflow-x" style={{ marginBottom: ".75rem" }}>
                  <table className="tbl" style={{ minWidth: 300, fontSize: "var(--fs-xs)" }}>
                    <thead><tr><th>Distancia</th><th>Tramo</th><th className="text-right">Número</th></tr></thead>
                    <tbody>
                      {csvPreview.rows.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: "var(--font-mono)", color: "var(--violet)" }}>{r.distancia}</td>
                          <td style={{ color: "var(--text)" }}>{r.tramo}</td>
                          <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>{r.numero}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {Object.keys(inscritos?.tramos || {}).some(tid => Object.values(inscritos.tramos[tid] || {}).some(v => v > 0)) && (
                  <div style={{ background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 8, padding: ".65rem .9rem", marginBottom: ".75rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--red)", marginBottom: ".5rem" }}>
                      ⚠️ Ya existen datos de inscritos. ¿Cómo quieres proceder?
                    </div>
                    <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                      {[
                        { v: "reemplazar", label: "🔄 Reemplazar", desc: "Sobreescribir los valores actuales de cada tramo/distancia del CSV" },
                        { v: "sumar",      label: "➕ Sumar",      desc: "Añadir los valores del CSV a los ya existentes" },
                      ].map(opt => (
                        <label key={opt.v} style={{ display: "flex", alignItems: "flex-start", gap: ".5rem", cursor: "pointer", flex: "1 1 160px", background: csvMergeMode === opt.v ? "rgba(167,139,250,.1)" : "transparent", border: `1px solid ${csvMergeMode === opt.v ? "rgba(167,139,250,.4)" : "var(--border)"}`, borderRadius: 8, padding: ".5rem .65rem" }}>
                          <input type="radio" value={opt.v} checked={csvMergeMode === opt.v} onChange={() => setCsvMergeMode(opt.v)} style={{ marginTop: "2px", accentColor: "var(--violet)", flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)" }}>{opt.label}</div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", lineHeight: 1.5 }}>{opt.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setCsvPreview(null)}>← Volver</button>
                  <button className="btn btn-primary" onClick={onConfirm}>Confirmar importación ({csvPreview.rows.length} filas)</button>
                </div>
              </>
            ) : (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--red)", padding: ".5rem 0" }}>
                ❌ No se encontraron filas válidas en el archivo.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
