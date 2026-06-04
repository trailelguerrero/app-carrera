import { useRef } from "react";
import { ALLOWED_EXT, ESTADOS_DOC, SUBCATEGORIAS } from "@/constants/documentosConstants";
import { blockCls as cls } from "@/lib/blockStyles";

export function UploadZone({
  tab, catInfoSafe,
  uploadOpen, setUploadOpen,
  nota, setNota,
  descripcionDoc, setDescripcionDoc,
  emisorNuevo, setEmisorNuevo,
  importeNuevo, setImporteNuevo,
  subcat, setSubcat,
  estadoNuevo, setEstadoNuevo,
  vencNuevo, setVencNuevo,
  uploading, dragOver,
  handleFiles, handleDrop, handleDragOver, handleDragLeave,
}) {
  const fileRef = useRef(null);
  const subcats = SUBCATEGORIAS[tab] || [];

  return (
    <div className="card mb" style={{ padding: uploadOpen ? undefined : ".65rem 1rem" }}>
      <button
        onClick={() => setUploadOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
          marginBottom: uploadOpen ? ".65rem" : 0 }}>
        <span className="card-title" style={{ color: catInfoSafe.color, margin: 0 }}>
          {catInfoSafe.icon} Subir a {catInfoSafe.label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
            PDF · JPG · PNG · máx. 10 MB
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
            {uploadOpen ? "▲ ocultar" : "▼ mostrar"}
          </span>
        </div>
      </button>

      {uploadOpen && (
        <div>
          <div className="doc-upload-fields">
            <input value={nota} onChange={e => setNota(e.target.value)}
              placeholder="Nombre descriptivo (ej: Seguro RC Mapfre 2026)" className="doc-input" style={{ flexBasis: "100%" }} />
            <input value={descripcionDoc} onChange={e => setDescripcionDoc(e.target.value)}
              placeholder="Notas / descripción (opcional: quién lo emite, qué cubre, observaciones…)" className="doc-input" style={{ flexBasis: "100%" }} />
            <input value={emisorNuevo} onChange={e => setEmisorNuevo(e.target.value)}
              placeholder="Emisor / proveedor (ej: Mapfre, Cruz Roja…)" className="doc-input" />
            {(["presupuestos", "facturas", "contratos", "seguros"].includes(tab)) && (
              <input
                value={importeNuevo}
                onChange={e => setImporteNuevo(e.target.value)}
                placeholder={tab === "seguros" ? "Prima anual (€)" : tab === "contratos" ? "Importe del contrato (€)" : "Importe (€)"}
                className="doc-input"
                type="number"
                min="0"
                step="0.01"
                style={{ maxWidth: 160 }}
              />
            )}
            {subcats.length > 0 && (
              <select value={subcat} onChange={e => setSubcat(e.target.value)} className="doc-select">
                <option value="">— Subcategoría —</option>
                {subcats.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <select value={estadoNuevo} onChange={e => setEstadoNuevo(e.target.value)} className="doc-select">
              {ESTADOS_DOC.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
            <input type="date" value={vencNuevo} onChange={e => setVencNuevo(e.target.value)}
              className="doc-select" title="Fecha de vencimiento (opcional)" />
          </div>

          <div
            className={cls("doc-dropzone", dragOver && "over")}
            onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept={ALLOWED_EXT} multiple style={{ display: "none" }}
              onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
            <div className="doc-dropzone-icon">
              {uploading ? "⏳" : dragOver ? "⬇️" : "📎"}
            </div>
            <div className="doc-dropzone-msg">
              {uploading ? "Subiendo documentos…" : dragOver ? "✓ Suelta aquí para subir" : "Arrastra archivos aquí · o haz clic para seleccionar"}
            </div>
            <div className="doc-dropzone-hint">
              {!uploading && !dragOver && (
                <>PDF, PNG, JPG, WebP · Máx. 10 MB<br />Puedes subir varios archivos a la vez</>
              )}
            </div>
            {!uploading && !dragOver && (
              <div className="doc-dropzone-types">
                {["PDF", "PNG", "JPG", "WebP"].map(t => (
                  <span key={t} className="doc-type-pill">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
