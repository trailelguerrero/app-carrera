import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dataService from "@/lib/dataService";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LS_KEY       = "teg_documentos_v1";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_EXT   = ".pdf,.jpg,.jpeg,.png,.webp";

const ESTADOS_DOC = [
  { id: "pendiente",  label: "Pendiente",  color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  { id: "enviado",    label: "Enviado",    color: "#22d3ee", bg: "rgba(34,211,238,0.12)"  },
  { id: "firmado",    label: "Firmado",    color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  { id: "aprobado",   label: "Aprobado",   color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
];
const getEstadoCfg = (id) => ESTADOS_DOC.find(e => e.id === id) || ESTADOS_DOC[0];

const CATEGORIAS = [
  { id: "presupuestos", icon: "💰", label: "Presupuestos", color: "#34d399" },
  { id: "facturas",     icon: "🧾", label: "Facturas",     color: "#22d3ee" },
  { id: "permisos",     icon: "📋", label: "Permisos",     color: "#a78bfa" },
  { id: "seguros",      icon: "🛡️", label: "Seguros",      color: "#fbbf24" },
  { id: "protocolos",   icon: "📑", label: "Protocolos",   color: "#fb923c" },
];

const SUBCATEGORIAS = {
  permisos:     ["Ayuntamiento", "Diputación", "Medio Ambiente", "Otro"],
  seguros:      ["Accidentes", "Responsabilidad Civil", "Otro"],
  protocolos:   ["Actuación Accidentes", "Actuación RC", "Evacuación", "Otro"],
  presupuestos: [],
  facturas:     [],
};

const MIME_ICONS = {
  "application/pdf": "📄",
  "image/png":  "🖼️",
  "image/jpeg": "🖼️",
  "image/jpg":  "🖼️",
  "image/webp": "🖼️",
};
const getIcon  = (mime) => MIME_ICONS[mime] || "📎";
const isImage  = (mime) => mime?.startsWith("image/");
const genId    = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const formatSize = (bytes) => {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};
const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};
const diasHasta = (iso) => {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const DOC_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');

  /* Tabs de categoría */
  .doc-tab {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0.45rem 0.9rem; border-radius: 30px;
    font-size: 0.7rem; font-weight: 700; cursor: pointer;
    transition: all 0.18s; border: 1.5px solid transparent;
    white-space: nowrap; font-family: var(--font-display);
    background: rgba(255,255,255,0.03); color: var(--text-muted);
    border-color: var(--border);
  }
  .doc-tab.active { box-shadow: 0 0 12px rgba(255,255,255,0.08); }
  .doc-tab-count {
    font-size: 0.58rem; background: rgba(255,255,255,0.08);
    border-radius: 10px; padding: 0.05rem 0.4rem; font-family: var(--font-mono);
  }

  /* Dropzone */
  .doc-dropzone {
    border: 2px dashed var(--border); border-radius: 14px;
    padding: 2.5rem 1.5rem; text-align: center;
    background: rgba(13,19,36,0.6); cursor: pointer;
    transition: all 0.2s; position: relative; overflow: hidden;
  }
  .doc-dropzone:hover {
    border-color: var(--cyan); background: rgba(34,211,238,0.04);
  }
  .doc-dropzone.over {
    border-color: var(--cyan); background: rgba(34,211,238,0.08);
    box-shadow: 0 0 0 4px rgba(34,211,238,0.12), 0 0 32px rgba(34,211,238,0.1);
    animation: doc-pulse 1s ease infinite;
  }
  @keyframes doc-pulse {
    0%,100% { box-shadow: 0 0 0 4px rgba(34,211,238,0.12); }
    50%      { box-shadow: 0 0 0 8px rgba(34,211,238,0.06); }
  }
  .doc-dropzone-icon { font-size: 3rem; margin-bottom: 0.75rem; transition: transform 0.2s; }
  .doc-dropzone.over .doc-dropzone-icon { transform: scale(1.15) translateY(-4px); }
  .doc-dropzone-msg  { font-size: 0.82rem; font-weight: 700; color: var(--text); margin-bottom: 0.3rem; }
  .doc-dropzone-hint { font-size: 0.62rem; color: var(--text-muted); font-family: var(--font-mono); }

  /* Cards */
  .doc-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem;
    transition: transform 0.15s, box-shadow 0.15s; position: relative; overflow: hidden;
  }
  .doc-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
  .doc-card-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 12px 12px 0 0; }
  .doc-card-name { font-size: 0.78rem; font-weight: 800; word-break: break-word; line-height: 1.3; }
  .doc-card-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .doc-card-meta-item { font-size: 0.58rem; color: var(--text-muted); font-family: var(--font-mono); }
  .doc-card-note {
    font-size: 0.62rem; color: var(--text-muted); background: rgba(255,255,255,0.03);
    border-radius: 6px; padding: 0.35rem 0.5rem; border-left: 2px solid var(--border);
  }
  .doc-card-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; }

  /* Botones de doc */
  .doc-btn { padding: 0.3rem 0.6rem; border-radius: 7px; font-size: 0.62rem; font-weight: 700; cursor: pointer; border: 1px solid; font-family: var(--font-display); transition: all 0.15s; white-space: nowrap; }
  .doc-btn-view   { background: rgba(34,211,238,0.1);   color: #22d3ee; border-color: rgba(34,211,238,0.3); }
  .doc-btn-dl     { background: rgba(52,211,153,0.1);   color: #34d399; border-color: rgba(52,211,153,0.3); }
  .doc-btn-edit   { background: rgba(167,139,250,0.1);  color: #a78bfa; border-color: rgba(167,139,250,0.3); }
  .doc-btn-del    { background: rgba(248,113,113,0.1);  color: #f87171; border-color: rgba(248,113,113,0.25); margin-left: auto; }
  .doc-btn-save   { background: rgba(52,211,153,0.12);  color: #34d399; border-color: rgba(52,211,153,0.35); }
  .doc-btn-cancel { background: rgba(90,106,138,0.12);  color: var(--text-muted); border-color: rgba(90,106,138,0.3); }
  .doc-btn:hover  { filter: brightness(1.15); }

  /* Estado badge */
  .doc-estado-sel {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 6px;
    color: var(--text); font-family: var(--font-mono); font-size: 0.62rem;
    padding: 0.18rem 0.4rem; cursor: pointer; outline: none;
  }

  /* Vencimiento alerta */
  .doc-venc-urgente { color: #f87171; background: rgba(248,113,113,0.1); border-radius: 4px; padding: 0.1rem 0.35rem; }
  .doc-venc-pronto  { color: #fbbf24; background: rgba(251,191,36,0.1);   border-radius: 4px; padding: 0.1rem 0.35rem; }

  /* Preview imagen en card */
  .doc-thumb {
    width: 100%; height: 80px; object-fit: cover; border-radius: 8px;
    border: 1px solid var(--border); margin-bottom: 0.25rem;
  }

  /* Empty */
  .doc-empty { text-align: center; padding: 3rem 1.5rem; color: var(--text-dim); }
  .doc-empty-icon { font-size: 3rem; opacity: 0.4; margin-bottom: 0.75rem; }
  .doc-empty-text { font-size: 0.75rem; color: var(--text-muted); }
`;

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Documentos() {
  const [docs,        setDocs]        = useState([]);
  const [tab,         setTab]         = useState("presupuestos");
  const [dragOver,    setDragOver]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [subcat,      setSubcat]      = useState("");
  const [nota,        setNota]        = useState("");
  const [estadoNuevo, setEstadoNuevo] = useState("pendiente");
  const [vencNuevo,   setVencNuevo]   = useState("");
  const [editId,      setEditId]      = useState(null);
  const [editForm,    setEditForm]    = useState({});
  const [busqueda,    setBusqueda]    = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    dataService.get(LS_KEY, []).then(setDocs);
    return dataService.onChange(() => dataService.get(LS_KEY, []).then(setDocs));
  }, []);

  const save = useCallback((next) => {
    setDocs(next);
    dataService.set(LS_KEY, next).then(() => dataService.notify());
  }, []);

  // ─── FILE HANDLING ─────────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files) => {
    if (uploading) return;
    const validFiles = Array.from(files).filter(f => {
      if (!ALLOWED_TYPES.includes(f.type)) {
        alert(`❌ Tipo no soportado: "${f.name}". Se aceptan PDF, JPG, PNG y WEBP.`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        alert(`❌ "${f.name}" excede 10 MB.`);
        return false;
      }
      return true;
    });
    if (!validFiles.length) return;
    setUploading(true);
    const newDocs = [];
    for (const file of validFiles) {
      const data = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      newDocs.push({
        id: genId(), nombre: file.name, categoria: tab,
        subcategoria: subcat || null, nota: nota || null,
        estado: estadoNuevo,
        fechaVencimiento: vencNuevo || null,
        size: file.size, tipo: file.type, data,
        fechaSubida:       new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
      });
    }
    save([...docs, ...newDocs]);
    setNota(""); setSubcat(""); setVencNuevo(""); setEstadoNuevo("pendiente");
    setUploading(false);
  }, [docs, tab, subcat, nota, estadoNuevo, vencNuevo, uploading, save]);

  const handleDrop      = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };
  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const deleteDoc   = (id) => { if (!confirm("¿Eliminar este documento?")) return; save(docs.filter(d => d.id !== id)); };
  const downloadDoc = (doc) => { const a = document.createElement("a"); a.href = doc.data; a.download = doc.nombre; a.click(); };
  const viewDoc     = (doc) => {
    if (isImage(doc.tipo)) {
      const w = window.open(); w.document.write(`<img src="${doc.data}" style="max-width:100%;display:block;margin:auto" />`);
    } else {
      const w = window.open(); w.document.write(`<iframe src="${doc.data}" style="width:100%;height:100%;border:none" title="${doc.nombre}"></iframe>`);
    }
  };

  const startEdit = (doc) => {
    setEditId(doc.id);
    setEditForm({
      nota:            doc.nota || "",
      subcategoria:    doc.subcategoria || "",
      estado:          doc.estado || "pendiente",
      fechaVencimiento:doc.fechaVencimiento || "",
    });
  };
  const saveEdit = () => {
    save(docs.map(d => d.id === editId
      ? { ...d, ...editForm, nota: editForm.nota || null, subcategoria: editForm.subcategoria || null, fechaVencimiento: editForm.fechaVencimiento || null, fechaModificacion: new Date().toISOString() }
      : d
    ));
    setEditId(null);
  };
  const updEdit = (k, v) => setEditForm(p => ({ ...p, [k]: v }));

  // ─── DATOS DERIVADOS ────────────────────────────────────────────────────────
  const catInfo  = CATEGORIAS.find(c => c.id === tab);
  const subcats  = SUBCATEGORIAS[tab] || [];

  // Docs filtrados por búsqueda (si hay texto, ignora el tab activo)
  const docsMostrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return docs.filter(d => d.categoria === tab);
    return docs.filter(d =>
      d.nombre.toLowerCase().includes(q) ||
      (d.nota||"").toLowerCase().includes(q) ||
      (d.subcategoria||"").toLowerCase().includes(q) ||
      CATEGORIAS.find(c=>c.id===d.categoria)?.label.toLowerCase().includes(q)
    );
  }, [docs, tab, busqueda]);

  const totalSize  = docs.reduce((s, d) => s + (d.size || 0), 0);
  const maxStorage = 100 * 1024 * 1024;
  const storagePct = Math.min((totalSize / maxStorage) * 100, 100);
  const storageColor = storagePct > 80 ? "var(--red)" : storagePct > 50 ? "var(--amber)" : "var(--green)";

  // Documentos con vencimiento próximo (≤30 días) para alerta
  const vencProximos = useMemo(() =>
    docs.filter(d => {
      if (!d.fechaVencimiento || d.estado === "aprobado") return false;
      const dias = diasHasta(d.fechaVencimiento);
      return dias !== null && dias <= 30;
    }).sort((a, b) => (a.fechaVencimiento||"").localeCompare(b.fechaVencimiento||"")),
    [docs]
  );

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{BLOCK_CSS + DOC_CSS}</style>
      <div className="block-container">

        {/* ── HEADER ── */}
        <div className="block-header">
          <div>
            <h1 className="block-title">📁 Documentos</h1>
            <div className="block-title-sub">Gestión documental · Trail El Guerrero 2026</div>
          </div>
          <div className="block-actions">
            {/* Buscador */}
            <div style={{display:"flex",alignItems:"center",gap:".35rem",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",padding:".28rem .6rem",transition:"border-color .15s"}}
              onFocus={e=>e.currentTarget.style.borderColor="var(--cyan)"}
              onBlur={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <span style={{opacity:.5,fontSize:".8rem",flexShrink:0}}>🔍</span>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar documentos…"
                style={{background:"none",border:"none",color:"var(--text)",fontFamily:"var(--font-display)",fontSize:".78rem",outline:"none",width:160}}
              />
              {busqueda && (
                <button onClick={()=>setBusqueda("")} style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:".7rem",padding:0,flexShrink:0}}>✕</button>
              )}
            </div>
            <span className="badge badge-cyan">{docs.length} docs</span>
            {vencProximos.length > 0 && (
              <span className="badge badge-red" title="Documentos con vencimiento próximo">
                ⏰ {vencProximos.length} por vencer
              </span>
            )}
          </div>
        </div>

        {/* ── KPIs por categoría — clases del sistema ── */}
        <div className="kpi-grid mb">
          {CATEGORIAS.map(c => {
            const cnt = docs.filter(d => d.categoria === c.id).length;
            const venc = docs.filter(d => d.categoria === c.id && d.fechaVencimiento && diasHasta(d.fechaVencimiento) !== null && diasHasta(d.fechaVencimiento) <= 30 && d.estado !== "aprobado").length;
            return (
              <div key={c.id} className="kpi"
                style={{borderLeftColor: c.color, cursor:"pointer"}}
                onClick={() => { setBusqueda(""); setTab(c.id); }}>
                <div className="kpi-label">{c.icon} {c.label}</div>
                <div className="kpi-value" style={{color: c.color}}>{cnt}</div>
                <div className="kpi-sub">{venc > 0 ? <span style={{color:"var(--red)"}}>⏰ {venc} por vencer</span> : "documentos"}</div>
              </div>
            );
          })}
        </div>

        {/* ── Alerta vencimientos ── */}
        {vencProximos.length > 0 && (
          <div style={{background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:"var(--r)",padding:".75rem 1rem",marginBottom:"1rem"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,color:"var(--red)",marginBottom:".4rem",textTransform:"uppercase",letterSpacing:".08em"}}>
              ⏰ Documentos con vencimiento próximo
            </div>
            {vencProximos.map(d => {
              const dias = diasHasta(d.fechaVencimiento);
              const cat  = CATEGORIAS.find(c=>c.id===d.categoria);
              return (
                <div key={d.id} style={{display:"flex",alignItems:"center",gap:".6rem",padding:".3rem 0",borderBottom:"1px solid rgba(248,113,113,.1)"}}>
                  <span style={{fontSize:".75rem"}}>{cat?.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:".74rem",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.nombre}</div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)"}}>{cat?.label} · Vence: {formatDate(d.fechaVencimiento)}</div>
                  </div>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,
                    color: dias <= 0 ? "var(--red)" : dias <= 7 ? "var(--red)" : "var(--amber)",
                    background: dias <= 7 ? "rgba(248,113,113,.1)" : "rgba(251,191,36,.1)",
                    padding:".1rem .4rem",borderRadius:4,flexShrink:0}}>
                    {dias <= 0 ? "VENCIDO" : `${dias}d`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Barra de almacenamiento ── */}
        <div className="card mb" style={{padding:".85rem 1.1rem"}}>
          <div className="flex-between mb-sm">
            <span style={{display:"flex",alignItems:"center",gap:6,fontSize:".65rem",color:"var(--text-muted)"}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:storageColor,display:"inline-block",boxShadow:`0 0 6px ${storageColor}80`}} />
              {formatSize(totalSize)} · Neon Storage
            </span>
            <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",fontWeight:700,color:storageColor}}>{storagePct.toFixed(0)}% de 100 MB</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{width:`${storagePct}%`,background:storageColor}} />
          </div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-dim)",marginTop:".35rem"}}>
            Documentos guardados en la base de datos. Accesibles desde cualquier dispositivo.
          </div>
        </div>

        {/* ── Tabs de categoría ── */}
        <div className="tabs" style={{marginBottom:"1.25rem"}}>
          {CATEGORIAS.map(c => {
            const active = tab === c.id && !busqueda;
            const cnt    = docs.filter(d => d.categoria === c.id).length;
            return (
              <button key={c.id} className="doc-tab"
                onClick={() => { setTab(c.id); setBusqueda(""); }}
                style={{
                  background:   active ? `${c.color}18` : undefined,
                  color:        active ? c.color : undefined,
                  borderColor:  active ? `${c.color}55` : undefined,
                  boxShadow:    active ? `0 0 12px ${c.color}30` : undefined,
                }}>
                {c.icon} {c.label}
                <span className="doc-tab-count">{cnt}</span>
              </button>
            );
          })}
        </div>

        {/* ── Zona de subida ── */}
        {!busqueda && (
          <div className="card mb">
            <div style={{fontWeight:800,fontSize:".82rem",marginBottom:".75rem",display:"flex",alignItems:"center",gap:7,color:catInfo.color}}>
              {catInfo.icon} Subir documentos a {catInfo.label}
            </div>

            {/* Campos opcionales */}
            <div style={{display:"flex",gap:".5rem",flexWrap:"wrap",marginBottom:".75rem",alignItems:"flex-start"}}>
              {subcats.length > 0 && (
                <select value={subcat} onChange={e=>setSubcat(e.target.value)}
                  className="inp" style={{width:"auto"}}>
                  <option value="">— Subcategoría —</option>
                  {subcats.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <input value={nota} onChange={e=>setNota(e.target.value)}
                placeholder="Nota descriptiva (opcional)"
                className="inp" style={{flex:1,minWidth:140}} />
              <select value={estadoNuevo} onChange={e=>setEstadoNuevo(e.target.value)}
                className="inp doc-estado-sel" style={{width:"auto"}}
                title="Estado inicial del documento">
                {ESTADOS_DOC.map(e => (
                  <option key={e.id} value={e.id}>{e.label}</option>
                ))}
              </select>
              <input type="date" value={vencNuevo} onChange={e=>setVencNuevo(e.target.value)}
                className="inp" style={{width:"auto"}}
                title="Fecha de vencimiento (opcional)" />
            </div>

            {/* Dropzone mejorada */}
            <div
              className={`doc-dropzone${dragOver ? " over" : ""}`}
              onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept={ALLOWED_EXT} multiple style={{display:"none"}}
                onChange={e => { handleFiles(e.target.files); e.target.value=""; }} />
              <div className="doc-dropzone-icon">
                {uploading ? "⏳" : dragOver ? "⬇️" : "📂"}
              </div>
              <div className="doc-dropzone-msg">
                {uploading
                  ? "Procesando documentos…"
                  : dragOver
                    ? "¡Suelta para subir!"
                    : "Arrastra archivos aquí o haz clic para seleccionar"}
              </div>
              <div className="doc-dropzone-hint">
                PDF, JPG, PNG, WEBP · Máximo 10 MB por archivo · Múltiples archivos permitidos
              </div>
            </div>
          </div>
        )}

        {/* ── Resultado búsqueda ── */}
        {busqueda && (
          <div style={{marginBottom:".75rem",display:"flex",alignItems:"center",gap:".5rem"}}>
            <span className="badge badge-violet">🔍 {docsMostrados.length} resultado{docsMostrados.length!==1?"s":""}</span>
            <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-muted)"}}>para "{busqueda}"</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>setBusqueda("")}>✕ Limpiar</button>
          </div>
        )}

        {/* ── Lista de documentos ── */}
        {docsMostrados.length === 0 ? (
          <div className="doc-empty">
            <div className="doc-empty-icon">{busqueda ? "🔍" : catInfo.icon}</div>
            <div className="doc-empty-text">
              {busqueda
                ? `Sin resultados para "${busqueda}"`
                : `No hay documentos en ${catInfo.label}`}
            </div>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:".9rem"}}>
            {[...docsMostrados]
              .sort((a, b) => new Date(b.fechaSubida) - new Date(a.fechaSubida))
              .map(doc => {
                const cat      = CATEGORIAS.find(c => c.id === doc.categoria) || catInfo;
                const estadoCfg= getEstadoCfg(doc.estado || "pendiente");
                const vdias    = diasHasta(doc.fechaVencimiento);
                const vUrgente = vdias !== null && vdias <= 7;
                const vProximo = vdias !== null && vdias > 7 && vdias <= 30;

                return (
                  <div key={doc.id} className="doc-card">
                    <div className="doc-card-accent" style={{background: cat.color}} />

                    {editId === doc.id ? (
                      /* ── MODO EDICIÓN ── */
                      <div style={{display:"flex",flexDirection:"column",gap:8,paddingTop:4}}>
                        <div style={{fontSize:".7rem",fontWeight:700,color:cat.color}}>✏️ Editando</div>
                        {subcats.length > 0 && (
                          <select value={editForm.subcategoria} onChange={e=>updEdit("subcategoria",e.target.value)}
                            className="inp" style={{fontSize:".72rem"}}>
                            <option value="">— Subcategoría —</option>
                            {(SUBCATEGORIAS[doc.categoria]||[]).map(s=><option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                        <input value={editForm.nota} onChange={e=>updEdit("nota",e.target.value)}
                          placeholder="Nota descriptiva" className="inp" style={{fontSize:".72rem"}} />
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem"}}>
                          <select value={editForm.estado} onChange={e=>updEdit("estado",e.target.value)}
                            className="inp doc-estado-sel" style={{fontSize:".7rem"}}>
                            {ESTADOS_DOC.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
                          </select>
                          <input type="date" value={editForm.fechaVencimiento} onChange={e=>updEdit("fechaVencimiento",e.target.value)}
                            className="inp" style={{fontSize:".7rem"}} />
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={saveEdit} className="doc-btn doc-btn-save">✅ Guardar</button>
                          <button onClick={()=>setEditId(null)} className="doc-btn doc-btn-cancel">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      /* ── MODO VISTA ── */
                      <>
                        {/* Thumbnail para imágenes */}
                        {isImage(doc.tipo) && (
                          <img src={doc.data} alt={doc.nombre} className="doc-thumb" />
                        )}

                        <div style={{display:"flex",alignItems:"flex-start",gap:10,paddingTop:4}}>
                          <span style={{fontSize:"1.8rem",flexShrink:0}}>{getIcon(doc.tipo)}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div className="doc-card-name">{doc.nombre}</div>
                            {/* Categoría si estamos en búsqueda global */}
                            {busqueda && (
                              <span style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:cat.color}}>
                                {cat.icon} {cat.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Meta + Estado */}
                        <div className="doc-card-meta">
                          <span className="doc-card-meta-item">{formatSize(doc.size)}</span>
                          <span className="doc-card-meta-item" style={{color:"var(--text-dim)"}}>·</span>
                          <span className="doc-card-meta-item">{formatDate(doc.fechaSubida)}</span>
                          {doc.subcategoria && (
                            <span className="badge" style={{background:`${cat.color}18`,color:cat.color,border:`1px solid ${cat.color}44`,fontSize:".52rem",padding:".08rem .35rem"}}>
                              {doc.subcategoria}
                            </span>
                          )}
                        </div>

                        {/* Estado + Vencimiento */}
                        <div style={{display:"flex",alignItems:"center",gap:".4rem",flexWrap:"wrap"}}>
                          <span style={{
                            fontFamily:"var(--font-mono)",fontSize:".58rem",fontWeight:700,
                            background:estadoCfg.bg, color:estadoCfg.color,
                            padding:".1rem .4rem",borderRadius:4,
                          }}>● {estadoCfg.label}</span>
                          {doc.fechaVencimiento && (
                            <span className={`doc-card-meta-item ${vUrgente?"doc-venc-urgente":vProximo?"doc-venc-pronto":""}`}
                              style={{fontFamily:"var(--font-mono)"}}>
                              ⏰ {vdias !== null && vdias <= 0 ? "VENCIDO" : `${vdias}d · ${formatDate(doc.fechaVencimiento)}`}
                            </span>
                          )}
                        </div>

                        {doc.nota && <div className="doc-card-note">💬 {doc.nota}</div>}

                        <div className="doc-card-actions">
                          <button onClick={()=>viewDoc(doc)}     className="doc-btn doc-btn-view">👁 Ver</button>
                          <button onClick={()=>downloadDoc(doc)} className="doc-btn doc-btn-dl">⬇ Bajar</button>
                          <button onClick={()=>startEdit(doc)}   className="doc-btn doc-btn-edit">✏️</button>
                          <button onClick={()=>deleteDoc(doc.id)} className="doc-btn doc-btn-del">🗑</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        )}

      </div>
    </>
  );
}
