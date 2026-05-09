import { useState } from "react";
import { getCfg, TIPOS_DOC } from "./constants";

export default function TabDocumentos({ pats, addDoc, deleteDoc }) {
  const [preview, setPreview] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroPat, setFiltroPat] = useState("todos");

  const allDocs = pats.flatMap(p =>
    (p.docs || []).map(d => ({ ...d, patNombre: p.nombre, patId: p.id, patNivel: p.nivel }))
  );
  const filtrados = allDocs.filter(d => {
    const mt = filtroTipo === "todos" || d.tipo === filtroTipo;
    const mp = filtroPat === "todos" || String(d.patId) === filtroPat;
    return mt && mp;
  });

  const totalBytes = allDocs.reduce((s, d) => s + (d.size || 0), 0);
  const pctLS = Math.min((totalBytes / (5 * 1024 * 1024)) * 100, 100).toFixed(0);
  const MIME_ICONS = {
    "application/pdf": "📄", "image/png": "🖼️", "image/jpeg": "🖼️",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊"
  };
  const getIcon = (mime) => MIME_ICONS[mime] || "📎";

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📁 Documentos</div>
          <div className="pd">
            {allDocs.length} documentos adjuntos en {pats.filter(p => (p.docs || []).length > 0).length} patrocinadores
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: ".75rem", background: parseFloat(pctLS) > 70 ? "rgba(248,113,113,.04)" : "var(--surface)", borderColor: parseFloat(pctLS) > 70 ? "rgba(248,113,113,.2)" : "var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".4rem" }}>
          <span style={{ fontSize: "var(--fs-sm)", fontWeight: 600 }}>💾 Almacenamiento local utilizado</span>
          <span className="mono xs" style={{ color: parseFloat(pctLS) > 70 ? "#f87171" : "var(--text-muted)" }}>
            {(totalBytes / 1024).toFixed(0)} KB · {pctLS}% del límite
          </span>
        </div>
        <div className="pbar">
          <div className="pfill" style={{ width: `${pctLS}%`, background: parseFloat(pctLS) > 70 ? "#f87171" : parseFloat(pctLS) > 40 ? "#fbbf24" : "#34d399" }} />
        </div>
        {parseFloat(pctLS) > 70 && (
          <div className="mono xs" style={{ color: "#f87171", marginTop: ".4rem" }}>
            ⚠️ Espacio escaso. Considera eliminar documentos antiguos o usar enlaces externos.
          </div>
        )}
        <div className="mono xs muted" style={{ marginTop: ".4rem" }}>
          Los documentos se guardan en el navegador (localStorage).
        </div>
      </div>

      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: ".75rem" }}>
        <select className="inp" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ width: "auto" }}>
          <option value="todos">Todos los tipos</option>
          {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="inp" value={filtroPat} onChange={e => setFiltroPat(e.target.value)} style={{ width: "auto" }}>
          <option value="todos">Todos los patrocinadores</option>
          {pats.filter(p => (p.docs || []).length > 0).map(p => (
            <option key={p.id} value={String(p.id)}>{p.nombre}</option>
          ))}
        </select>
        {(filtroTipo !== "todos" || filtroPat !== "todos") && (
          <button className="btn btn-ghost" onClick={() => { setFiltroTipo("todos"); setFiltroPat("todos"); }}>✕ Limpiar</button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="empty">
          {allDocs.length === 0
            ? "Sin documentos adjuntos. Abre el detalle de un patrocinador para subir archivos."
            : "No hay documentos con estos filtros."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: ".6rem" }}>
          {filtrados.map(d => {
            const ncfg = getCfg(d.patNivel);
            return (
              <div key={d.patId + "-" + d.id}
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: ".85rem", display: "flex", flexDirection: "column", gap: ".4rem", transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-light)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: ".6rem" }}>
                  <div style={{ fontSize: "var(--fs-lg)", flexShrink: 0 }}>{getIcon(d.mime)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--fs-base)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.nombre}</div>
                    <div className="mono xs muted">{d.tipo}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: ncfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.patNombre}</span>
                </div>
                <div className="mono xs muted">{d.fecha} · {((d.size || 0) / 1024).toFixed(0)} KB</div>
                <div style={{ display: "flex", gap: ".3rem", marginTop: ".1rem" }}>
                  {(d.mime === "application/pdf" || d.mime?.startsWith("image/")) && (
                    <button className="btn btn-sm" style={{ background: "rgba(34,211,238,.1)", color: "#22d3ee", border: "1px solid rgba(34,211,238,.2)" }}
                      onClick={() => setPreview(d)}>👁 Ver</button>
                  )}
                  <a href={d.data} download={d.nombre} className="btn btn-sm btn-ghost" style={{ textDecoration: "none" }}>⬇ Bajar</a>
                  <button className="btn btn-sm btn-red" onClick={() => deleteDoc(d.patId, d.id)} aria-label="Cerrar">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {preview && (
        <div onClick={() => setPreview(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(6px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 700, maxHeight: "90vh", display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--border-light)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: ".75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>{preview.nombre}</div>
                <div className="mono xs muted">{preview.tipo} · {preview.patNombre}</div>
              </div>
              <div style={{ display: "flex", gap: ".4rem" }}>
                <a href={preview.data} download={preview.nombre} className="btn btn-sm btn-ghost" style={{ textDecoration: "none" }}>⬇ Descargar</a>
                <button className="btn btn-sm btn-ghost" onClick={() => setPreview(null)} aria-label="Cerrar">✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
              {preview.mime === "application/pdf"
                ? <iframe src={preview.data} style={{ width: "100%", height: "70vh", border: "none" }} title={preview.nombre} />
                : <img src={preview.data} alt={preview.nombre} style={{ maxWidth: "100%", display: "block", margin: "0 auto" }} />
              }
            </div>
          </div>
          <div className="mono xs muted" style={{ marginTop: ".5rem" }}>Toca fuera para cerrar</div>
        </div>
      )}
    </>
  );
}
