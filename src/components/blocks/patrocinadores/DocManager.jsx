import { useState, useEffect } from "react";
import { TIPOS_DOC } from "./constants";

// ─── DOC MANAGER (inside ModalDetalle) ───────────────────────────────────────
// SEC-01: la API key la inyecta el proxy BFF server-side; no se expone al cliente
export default function DocManager({ pat, addDoc, deleteDoc, cfg }) {
  const [uploadError, setUploadError] = useState(null);
  const API  = "/api/proxy/docs/" + pat.id;
  const headers = { "Content-Type": "application/json" };

  const [docs,   setDocs]   = useState([]);
  const [loading,setLoading]= useState(true);
  const [uploading,setUploading] = useState(false);
  const [dragging,setDragging]   = useState(false);
  const [tipo,   setTipo]   = useState(TIPOS_DOC[0]);
  const [preview,setPreview]= useState(null);

  useEffect(() => {
    fetch(API, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(rows => { setDocs(rows); setLoading(false); })
      .catch(() => setLoading(false));
  }, [pat.id]);

  const processFile = async (file) => {
    if (!file) return;
    const maxMB = 5;
    if (file.size > maxMB * 1024 * 1024) {
      setUploadError(`El archivo supera ${maxMB} MB.`); return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const body = {
          nombre: file.name, tipo, mime: file.type,
          data: e.target.result, size: file.size,
          fecha: new Date().toISOString().split("T")[0],
        };
        const res = await fetch(API, { method:"POST", headers, body: JSON.stringify(body) }); // proxy inyecta x-api-key
        if (!res.ok) { setUploadError("Error al subir el archivo."); setUploading(false); return; }
        const { id, blob_url } = await res.json();
        // Guardar con blob_url — necesario para Ver/Descargar sin recargar
        setDocs(prev => [{ ...body, id, blob_url, data: null }, ...prev]);
        addDoc(pat.id, { id, nombre: file.name, tipo, mime: file.type, size: file.size, fecha: body.fecha });
      } catch(e) { setUploadError("Error al subir el archivo."); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (docId) => {
    await fetch(`${API}?docId=${docId}`, { method:"DELETE", headers }); // proxy inyecta x-api-key
    setDocs(prev => prev.filter(d => d.id !== docId));
    deleteDoc(pat.id, docId);
  };

  const MIME_ICONS = {
    "application/pdf":"📄","image/png":"🖼️","image/jpeg":"🖼️",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":"📝",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"📊"
  };
  const getIcon = (mime) => MIME_ICONS[mime] || "📎";
  const totalKB = (docs.reduce((s,d) => s+(d.size||0), 0) / 1024).toFixed(0);

  return (
    <div>
      {/* Selector tipo */}
      <div style={{ marginBottom: ".75rem" }}>
        <label className="fl">Tipo de documento</label>
        <select className="inp" value={tipo} onChange={e => setTipo(e.target.value)}>
          {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Drop zone */}
      <label
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
        style={{
          display:"block", border:`2px dashed ${dragging ? cfg.color : "var(--border)"}`,
          borderRadius:10, padding:"1.25rem", textAlign:"center", cursor:"pointer",
          background: dragging ? cfg.dim : "var(--surface2)", transition:"all .2s", marginBottom:".75rem",
          opacity: uploading ? .6 : 1,
        }}>
        <input type="file" style={{ display:"none" }} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          onChange={e => processFile(e.target.files[0])} disabled={uploading} />
        <div style={{ fontSize:"1.8rem", marginBottom:".35rem" }}>
          {uploading ? "⏳" : dragging ? "⬇️" : "☁️"}
        </div>
        <div style={{ fontWeight:700, fontSize:"var(--fs-base)", marginBottom:".2rem" }}>
          {uploading ? "Subiendo a la nube…" : dragging ? "Suelta el archivo aquí" : "Arrastra o haz clic · Sube a Neon Cloud"}
        </div>
        <div className="mono xs muted">PDF, Word, Excel, imágenes · Máx. 5MB</div>
      </label>

      {/* Error de subida */}
      {uploadError && (
        <div className="mono xs" style={{ color:"var(--red)", marginBottom:".5rem" }}>⚠ {uploadError}</div>
      )}

      {/* Lista */}
      {loading && <div className="mono xs muted" style={{textAlign:"center",padding:"1rem"}}>Cargando documentos…</div>}
      {!loading && docs.length === 0 && (
        <div style={{ textAlign:"center", padding:"1rem", color:"var(--text-dim)", fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)" }}>
          Sin documentos en la nube
        </div>
      )}
      {!loading && docs.length > 0 && (<>
        <div className="mono xs muted" style={{ marginBottom:".4rem" }}>
          ☁️ {docs.length} documento{docs.length!==1?"s":""} · {totalKB} KB en Neon Cloud
        </div>
        {docs.map(d => (
          <div key={d.id} style={{ display:"flex", alignItems:"center", gap:".6rem", padding:".45rem .6rem",
            background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8, marginBottom:".3rem" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border-light)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
            <div style={{ fontSize:"var(--fs-lg)", flexShrink:0 }}>{getIcon(d.mime)}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:"var(--fs-sm)", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.nombre}</div>
              <div className="mono xs muted">{d.tipo} · {d.fecha} · {((d.size||0)/1024).toFixed(0)} KB</div>
            </div>
            <div style={{ display:"flex", gap:".3rem", flexShrink:0 }}>
              {(d.blob_url || d.data) && (d.mime==="application/pdf" || d.mime?.startsWith("image/")) && (
                <button className="btn btn-sm" style={{ background:cfg.dim, color:cfg.color, border:`1px solid ${cfg.border}` }}
                  onClick={() => setPreview(d)}>👁 Ver</button>
              )}
              {(d.blob_url || d.data) && (
                <a href={d.blob_url || d.data} download={d.nombre} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" style={{ textDecoration:"none" }}>⬇</a>
              )}
              <button className="btn btn-sm btn-red" onClick={() => handleDelete(d.id)} aria-label="Cerrar">✕</button>
            </div>
          </div>
        ))}
      </>)}

      {/* Preview */}
      {preview && (
        <div onClick={() => setPreview(null)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.9)", zIndex:200, display:"flex",
            flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"1rem",
            backdropFilter:"blur(6px)" }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:700, maxHeight:"90vh",
            display:"flex", flexDirection:"column", background:"var(--surface)", border:"1px solid var(--border-light)",
            borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:".75rem 1rem", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid var(--border)" }}>
              <div><div style={{ fontWeight:700, fontSize:"var(--fs-base)" }}>{preview.nombre}</div><div className="mono xs muted">{preview.tipo}</div></div>
              <div style={{ display:"flex", gap:".4rem" }}>
                {(preview.blob_url || preview.data) && <a href={preview.blob_url || preview.data} download={preview.nombre} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" style={{ textDecoration:"none" }}>⬇ Descargar</a>}
                <button className="btn btn-sm btn-ghost" onClick={() => setPreview(null)} aria-label="Cerrar">✕</button>
              </div>
            </div>
            <div style={{ flex:1, overflow:"auto", minHeight:0 }}>
              {preview.mime==="application/pdf" ? (() => {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const pdfSrc = preview.blob_url || preview.data;
                return isIOS ? (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    height:"60vh", gap:"1rem", color:"var(--text-muted)" }}>
                    <span style={{ fontSize:"3rem" }}>📄</span>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-base)" }}>{preview.nombre}</div>
                    <a href={pdfSrc} download={preview.nombre} style={{
                      background:"var(--cyan)", color:"var(--bg)", border:"none", borderRadius:10,
                      padding:".65rem 1.75rem", fontWeight:800, fontSize:"var(--fs-md)", cursor:"pointer",
                      textDecoration:"none", display:"inline-block",
                    }}>⬇ Descargar PDF</a>
                  </div>
                ) : (
                  <iframe src={pdfSrc} style={{ width:"100%", height:"68vh", border:"none" }} title={preview.nombre} />
                );
              })() : (
                <img src={preview.blob_url || preview.data} alt={preview.nombre}
                  style={{ maxWidth:"100%", display:"block", margin:"0 auto" }} />
              )}
            </div>
          </div>
          <div className="mono xs muted" style={{ marginTop:".5rem" }}>Toca fuera para cerrar</div>
        </div>
      )}
    </div>
  );
}
