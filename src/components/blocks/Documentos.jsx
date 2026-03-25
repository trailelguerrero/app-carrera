import { useState, useEffect, useCallback, useRef } from "react";
import dataService from "@/lib/dataService";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LS_KEY        = "teg_documentos_v1";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
const ALLOWED_EXT   = ".pdf,.png,.jpg,.jpeg,.webp";

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

// Estados del documento con colores
const ESTADOS_DOC = [
  { id: "pendiente",  label: "Pendiente",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  { id: "enviado",    label: "Enviado",    color: "#22d3ee", bg: "rgba(34,211,238,0.12)"  },
  { id: "firmado",    label: "Firmado",    color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  { id: "aprobado",   label: "Aprobado",   color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
];

const getEstadoCfg = (id) => ESTADOS_DOC.find(e => e.id === id) || ESTADOS_DOC[0];

const FILE_ICONS = {
  "application/pdf": "📄",
  "image/png":  "🖼️",
  "image/jpeg": "🖼️",
  "image/jpg":  "🖼️",
  "image/webp": "🖼️",
};
const getFileIcon = (mime) => FILE_ICONS[mime] || "📎";

const genId      = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const formatSize = (bytes) => {
  if (!bytes) return "0 B";
  if (bytes < 1024)       return bytes + " B";
  if (bytes < 1024*1024)  return (bytes/1024).toFixed(1) + " KB";
  return (bytes/(1024*1024)).toFixed(2) + " MB";
};
const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day:"2-digit", month:"short", year:"numeric" });
};
const diasHasta = (iso) => {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function Documentos() {
  const [docs, setDocs]         = useState([]);
  const [tab,  setTab]          = useState("presupuestos");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [subcat, setSubcat]     = useState("");
  const [nota,   setNota]       = useState("");
  const [estadoNuevo, setEstadoNuevo] = useState("pendiente");
  const [vencNuevo, setVencNuevo]     = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [uploadOpen, setUploadOpen] = useState(true); // colapsable en móvil
  const [editId,  setEditId]    = useState(null);
  const [editForm, setEditForm] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
    dataService.get(LS_KEY, []).then(setDocs);
    return dataService.onChange(() => dataService.get(LS_KEY, []).then(setDocs));
  }, []);

  const save = useCallback((next) => {
    setDocs(next);
    dataService.set(LS_KEY, next).then(() => dataService.notify());
  }, []);

  // ─── FILE HANDLING ────────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files) => {
    if (uploading) return;
    const validFiles = Array.from(files).filter(f => {
      const typeOk = ALLOWED_TYPES.includes(f.type) ||
        f.name.match(/\.(pdf|png|jpe?g|webp)$/i);
      if (!typeOk) { alert(`❌ Tipo no permitido: "${f.name}". Usa PDF, PNG, JPG o WebP.`); return false; }
      if (f.size > MAX_FILE_SIZE) { alert(`❌ "${f.name}" excede 10MB.`); return false; }
      return true;
    });
    if (!validFiles.length) return;
    setUploading(true);
    const newDocs = [];
    for (const file of validFiles) {
      const base64 = await fileToBase64(file);
      newDocs.push({
        id: genId(),
        nombre: file.name,
        categoria: tab,
        subcategoria: subcat || null,
        nota: nota || null,
        estado: estadoNuevo,
        fechaVencimiento: vencNuevo || null,
        size: file.size,
        tipo: file.type || (file.name.match(/\.pdf$/i) ? "application/pdf" : "image/jpeg"),
        data: base64,
        fechaSubida: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
      });
    }
    save([...docs, ...newDocs]);
    setNota(""); setSubcat(""); setVencNuevo(""); setEstadoNuevo("pendiente");
    setUploading(false);
  }, [docs, tab, subcat, nota, estadoNuevo, vencNuevo, uploading, save]);

  const fileToBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const handleDrop      = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };
  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); };

  const deleteDoc   = (id) => { if (!confirm("¿Eliminar este documento?")) return; save(docs.filter(d => d.id !== id)); };
  const downloadDoc = (doc) => { const a = document.createElement("a"); a.href = doc.data; a.download = doc.nombre; a.click(); };
  const viewDoc     = (doc) => {
    if (doc.tipo?.startsWith("image/")) {
      const w = window.open("", "_blank");
      w.document.write(`<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${doc.data}" style="max-width:100%;max-height:100vh" /></body></html>`);
    } else {
      const w = window.open();
      w.document.write(`<iframe src="${doc.data}" style="width:100%;height:100%;border:none" title="${doc.nombre}"></iframe>`);
    }
  };

  const startEdit = (doc) => {
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "instant" });
    setEditId(doc.id);
    setEditForm({
      nota: doc.nota || "",
      subcategoria: doc.subcategoria || "",
      estado: doc.estado || "pendiente",
      fechaVencimiento: doc.fechaVencimiento || "",
    });
  };

  const saveEdit = () => {
    save(docs.map(d => d.id === editId
      ? { ...d, ...editForm, fechaModificacion: new Date().toISOString() }
      : d
    ));
    // Si cambió de categoría, navegar a la nueva
    const doc = docs.find(d => d.id === editId);
    if (doc && editForm.categoria && editForm.categoria !== doc.categoria) {
      setTab(editForm.categoria);
    }
    setEditId(null);
  };

  const updateEstado = (id, estado) => {
    save(docs.map(d => d.id === id ? { ...d, estado, fechaModificacion: new Date().toISOString() } : d));
  };

  // ─── DERIVED ─────────────────────────────────────────────────────────────
  const catInfo   = CATEGORIAS.find(c => c.id === tab);
  const subcats   = SUBCATEGORIAS[tab] || [];
  const totalSize = docs.reduce((s, d) => s + (d.size || 0), 0);
  const storagePct = Math.min((totalSize / (100*1024*1024)) * 100, 100);
  const storageColor = storagePct > 80 ? "#f87171" : storagePct > 50 ? "#fbbf24" : "#34d399";

  // Documentos por vencer en <30 días (para alertas)
  const proxVencer = docs.filter(d => {
    const dias = diasHasta(d.fechaVencimiento);
    return dias !== null && dias >= 0 && dias <= 30 && d.estado !== "aprobado";
  }).sort((a,b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

  const vencidos = docs.filter(d => {
    const dias = diasHasta(d.fechaVencimiento);
    return dias !== null && dias < 0 && d.estado !== "aprobado";
  });

  // Filtrado: categoría + búsqueda
  const catDocs = docs
    .filter(d => d.categoria === tab)
    .filter(d => {
      if (!busqueda) return true;
      const q = busqueda.toLowerCase();
      return d.nombre.toLowerCase().includes(q)
        || (d.nota||"").toLowerCase().includes(q)
        || (d.subcategoria||"").toLowerCase().includes(q)
        || (d.estado||"").toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.fechaSubida) - new Date(a.fechaSubida));

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const DOC_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');
    @keyframes doc-pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.08)} }
    @keyframes doc-fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes doc-glow   { 0%,100%{box-shadow:0 0 12px rgba(34,211,238,0.2)} 50%{box-shadow:0 0 28px rgba(34,211,238,0.55)} }

    /* Storage */
    .doc-storage-bar  { height:6px; background:var(--surface3); border-radius:3px; overflow:hidden; }
    .doc-storage-fill { height:100%; border-radius:3px; transition:width .4s ease; }

    /* Tabs */
    .doc-tab { display:inline-flex; align-items:center; gap:6px; padding:.45rem .9rem; border-radius:30px;
      font-size:.7rem; font-weight:700; cursor:pointer; transition:all .18s;
      border:1.5px solid transparent; white-space:nowrap; background:none; }
    .doc-tab-count { font-size:.58rem; background:rgba(255,255,255,.08); border-radius:10px;
      padding:.05rem .4rem; font-family:var(--font-mono); }

    /* Upload zone */
    .doc-dropzone { border:2px dashed var(--border); border-radius:14px; padding:1.5rem 1rem;
      text-align:center; cursor:pointer; transition:all .22s; position:relative;
      background:rgba(255,255,255,0.02); }
    @media(max-width:640px){ .doc-dropzone { padding:1.25rem .75rem; } }
    .doc-dropzone:hover { border-color:var(--cyan); background:rgba(34,211,238,0.03); }
    .doc-dropzone.over { border-color:var(--cyan); background:rgba(34,211,238,0.07);
      animation:doc-glow .8s ease infinite; }
    .doc-dropzone-icon { font-size:2.8rem; margin-bottom:.6rem; transition:transform .2s; }
    .doc-dropzone.over .doc-dropzone-icon { animation:doc-pulse .6s ease infinite; }
    .doc-dropzone-msg  { font-size:.8rem; font-weight:700; color:var(--text); margin-bottom:.3rem; }
    .doc-dropzone-hint { font-size:.6rem; color:var(--text-muted); font-family:var(--font-mono); }
    .doc-dropzone-types{ display:flex; gap:.35rem; justify-content:center; margin-top:.5rem; flex-wrap:wrap; }
    .doc-type-pill { background:var(--surface2); border:1px solid var(--border); border-radius:4px;
      padding:.1rem .4rem; font-family:var(--font-mono); font-size:.58rem; color:var(--text-muted); }

    /* Upload fields */
    .doc-upload-fields { display:flex; gap:.5rem; flex-wrap:wrap; margin-bottom:.75rem; }
    .doc-select { background:var(--surface2); border:1px solid var(--border); border-radius:8px;
      color:var(--text); padding:.42rem .6rem; font-size:.72rem; font-family:var(--font-display);
      outline:none; transition:border-color .15s; }
    .doc-select:focus { border-color:var(--cyan); }
    .doc-input { background:var(--surface2); border:1px solid var(--border); border-radius:8px;
      color:var(--text); padding:.42rem .6rem; font-size:.72rem; font-family:var(--font-display);
      flex:1; min-width:140px; outline:none; transition:border-color .15s; }
    .doc-input:focus { border-color:var(--cyan); }
    .doc-input::placeholder { color:var(--text-dim); }

    /* Cards */
    .doc-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:.9rem; }
    .doc-card { background:var(--surface); border:1px solid var(--border); border-radius:12px;
      padding:1rem; display:flex; flex-direction:column; gap:.6rem;
      transition:transform .15s,box-shadow .15s; position:relative; overflow:hidden;
      animation:doc-fadein .2s ease both; }
    .doc-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.25); border-color:var(--border-light); }
    .doc-card-name  { font-size:.78rem; font-weight:800; word-break:break-word; line-height:1.3; }
    .doc-card-meta  { display:flex; flex-wrap:wrap; gap:5px; align-items:center; }
    .doc-card-meta-item { font-size:.58rem; color:var(--text-muted); font-family:var(--font-mono); }
    .doc-badge { display:inline-block; padding:.1rem .4rem; border-radius:20px;
      font-size:.55rem; font-weight:700; font-family:var(--font-mono); }
    .doc-card-note { font-size:.62rem; color:#8a9ab8; background:rgba(255,255,255,.03);
      border-radius:6px; padding:.35rem .5rem; border-left:2px solid var(--border); }
    .doc-card-actions { display:flex; gap:5px; flex-wrap:wrap; margin-top:auto; }

    /* Estado selector inline en cards */
    .doc-estado-sel { background:var(--surface2); border:1px solid var(--border); border-radius:6px;
      font-size:.58rem; font-family:var(--font-mono); padding:.15rem .3rem; cursor:pointer;
      outline:none; transition:border-color .15s; }
    .doc-estado-sel:focus { border-color:var(--cyan); }

    /* Alerta de vencimiento */
    .doc-venc-alert { display:flex; align-items:center; gap:.5rem; padding:.35rem .6rem;
      border-radius:6px; font-family:var(--font-mono); font-size:.65rem; font-weight:700; }
    .doc-venc-critico  { background:rgba(248,113,113,.08); color:#f87171; border:1px solid rgba(248,113,113,.2); }
    .doc-venc-proximo  { background:rgba(251,191,36,.08);  color:#fbbf24;  border:1px solid rgba(251,191,36,.2); }

    /* Botones */
    .doc-btn { padding:.3rem .6rem; border-radius:7px; font-size:.62rem; font-weight:700;
      cursor:pointer; border:1px solid; font-family:var(--font-display); transition:all .15s; white-space:nowrap; }
    .doc-btn-view  { background:rgba(34,211,238,.1);  color:#22d3ee; border-color:rgba(34,211,238,.3); }
    .doc-btn-view:hover  { background:rgba(34,211,238,.22); }
    .doc-btn-dl    { background:rgba(52,211,153,.1);  color:#34d399; border-color:rgba(52,211,153,.3); }
    .doc-btn-dl:hover    { background:rgba(52,211,153,.22); }
    .doc-btn-edit  { background:rgba(167,139,250,.1); color:#a78bfa; border-color:rgba(167,139,250,.3); }
    .doc-btn-edit:hover  { background:rgba(167,139,250,.22); }
    .doc-btn-del   { background:rgba(248,113,113,.1); color:#f87171; border-color:rgba(248,113,113,.25); margin-left:auto; }
    .doc-btn-del:hover   { background:rgba(248,113,113,.22); }
    .doc-btn-save  { background:rgba(52,211,153,.12); color:#34d399; border-color:rgba(52,211,153,.35); }
    .doc-btn-save:hover  { background:rgba(52,211,153,.22); }
    .doc-btn-cancel{ background:rgba(90,106,138,.12); color:var(--text-muted); border-color:rgba(90,106,138,.3); }

    /* Buscador */
    .doc-search { display:flex; align-items:center; gap:.4rem; background:var(--surface2);
      border:1px solid var(--border); border-radius:var(--r-sm); padding:.3rem .65rem;
      transition:border-color .15s; }
    .doc-search:focus-within { border-color:var(--cyan); }
    .doc-search input { background:none; border:none; color:var(--text); font-family:var(--font-display);
      font-size:.78rem; outline:none; width:180px; }
    .doc-search input::placeholder { color:var(--text-dim); }

    /* Empty state */
    .doc-empty { text-align:center; padding:3rem 1.5rem; color:var(--text-dim); }
    .doc-empty-icon { font-size:3rem; opacity:.35; margin-bottom:.75rem; }
    .doc-empty-text { font-size:.75rem; color:var(--text-muted); }

    /* Edit card */
    .doc-edit-card { display:flex; flex-direction:column; gap:8px; }
    /* Upload toggle visible en móvil */
    @media(max-width:640px){
      .doc-upload-fields { flex-direction:column; }
      .doc-input, .doc-select { width:100%; }
    }
  `;

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
            {/* Alertas de vencimiento en el header */}
            {vencidos.length > 0 && (
              <span className="badge badge-red" title={`${vencidos.map(d=>d.nombre).join(", ")}`}>
                ⚠️ {vencidos.length} vencido{vencidos.length>1?"s":""}
              </span>
            )}
            {proxVencer.length > 0 && (
              <span className="badge badge-amber" title={`Vencen pronto: ${proxVencer.map(d=>d.nombre).join(", ")}`}>
                ⏰ {proxVencer.length} próximo{proxVencer.length>1?"s":""}
              </span>
            )}
            <span className="badge badge-cyan">{docs.length} doc{docs.length!==1?"s":""}</span>

            {/* Buscador en el header */}
            <div className="doc-search">
              <span style={{opacity:.5, fontSize:".8rem", flexShrink:0}}>🔍</span>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar documentos…"
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")}
                  style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:".7rem",padding:0}}>✕</button>
              )}
            </div>
          </div>
        </div>

        {/* ── ALERTAS DE VENCIMIENTO ── */}
        {(vencidos.length > 0 || proxVencer.length > 0) && (
          <div className="card mb" style={{padding:".75rem 1rem"}}>
            {vencidos.length > 0 && (
              <div style={{marginBottom: proxVencer.length > 0 ? ".5rem" : 0}}>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,color:"var(--red)",
                  textTransform:"uppercase",letterSpacing:".08em",marginBottom:".35rem"}}>
                  🚨 {vencidos.length} documento{vencidos.length>1?"s":""} vencido{vencidos.length>1?"s":""}
                </div>
                {vencidos.map(d => {
                  const cat = CATEGORIAS.find(c => c.id === d.categoria);
                  return (
                    <div key={d.id} className="doc-venc-alert doc-venc-critico" style={{marginBottom:".25rem"}}>
                      <span>{cat?.icon}</span>
                      <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.nombre}</span>
                      <span>Venció {formatDate(d.fechaVencimiento)}</span>
                      <button className="doc-btn doc-btn-edit" style={{padding:".1rem .4rem",fontSize:".55rem"}}
                        onClick={() => { setTab(d.categoria); startEdit(d); }}>Actualizar</button>
                    </div>
                  );
                })}
              </div>
            )}
            {proxVencer.length > 0 && (
              <div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,color:"var(--amber)",
                  textTransform:"uppercase",letterSpacing:".08em",marginBottom:".35rem"}}>
                  ⏰ Vencen en los próximos 30 días
                </div>
                {proxVencer.map(d => {
                  const dias = diasHasta(d.fechaVencimiento);
                  const cat  = CATEGORIAS.find(c => c.id === d.categoria);
                  return (
                    <div key={d.id} className="doc-venc-alert doc-venc-proximo" style={{marginBottom:".25rem"}}>
                      <span>{cat?.icon}</span>
                      <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.nombre}</span>
                      <span>{dias === 0 ? "Hoy" : `en ${dias}d`}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── KPIs por categoría ── */}
        <div className="kpi-grid mb">
          {CATEGORIAS.map(c => {
            const cnt   = docs.filter(d => d.categoria === c.id).length;
            const alert = docs.filter(d => d.categoria === c.id && d.fechaVencimiento &&
              (diasHasta(d.fechaVencimiento) ?? 999) <= 30 &&
              (diasHasta(d.fechaVencimiento) ?? 999) >= 0 &&
              d.estado !== "aprobado").length;
            return (
              <div key={c.id} className="kpi" style={{cursor:"pointer",borderLeftColor:c.color,borderLeftWidth:3,borderLeftStyle:"solid"}}
                onClick={() => setTab(c.id)}>
                <div className="kpi-label">{c.icon} {c.label}</div>
                <div className="kpi-value" style={{color:c.color}}>{cnt}</div>
                <div className="kpi-sub">
                  {alert > 0
                    ? <span style={{color:"var(--amber)"}}>⏰ {alert} por vencer</span>
                    : cnt === 0 ? "sin documentos" : "documentos"
                  }
                </div>
              </div>
            );
          })}
          <div className="kpi" style={{borderLeftColor:"var(--text-dim)",borderLeftWidth:3,borderLeftStyle:"solid"}}>
            <div className="kpi-label">📦 Total</div>
            <div className="kpi-value">{docs.length}</div>
            <div className="kpi-sub">{formatSize(totalSize)}</div>
          </div>
        </div>

        {/* ── Storage bar ── */}
        <div className="card mb" style={{padding:".75rem 1rem"}}>
          <div className="flex-between mb-sm">
            <span className="mono xs muted" style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:storageColor,display:"inline-block",boxShadow:`0 0 6px ${storageColor}80`}}/>
              {formatSize(totalSize)} · Neon Storage
            </span>
            <span className="mono xs bold" style={{color:storageColor}}>{storagePct.toFixed(0)}% de 100 MB</span>
          </div>
          <div className="doc-storage-bar">
            <div className="doc-storage-fill" style={{width:`${storagePct}%`,background:`linear-gradient(90deg,${storageColor}99,${storageColor})`}}/>
          </div>
          <div className="mono" style={{fontSize:".55rem",color:"var(--text-dim)",marginTop:".3rem"}}>
            Documentos guardados en la base de datos. Accesibles desde cualquier dispositivo.
          </div>
        </div>

        {/* ── Category tabs ── */}
        <div className="tabs" style={{gap:".4rem",flexWrap:"wrap"}}>
          {CATEGORIAS.map(c => {
            const active = tab === c.id;
            const cnt    = docs.filter(d => d.categoria === c.id).length;
            return (
              <button key={c.id} className="doc-tab"
                onClick={() => { setTab(c.id); setSubcat(""); setBusqueda(""); }}
                style={{
                  background: active ? `${c.color}18` : "rgba(255,255,255,.03)",
                  color: active ? c.color : "var(--text-muted)",
                  borderColor: active ? `${c.color}55` : "var(--border)",
                  boxShadow: active ? `0 0 12px ${c.color}28` : "none",
                }}>
                {c.icon} {c.label}
                <span className="doc-tab-count">{cnt}</span>
              </button>
            );
          })}
        </div>

        {/* ── Upload zone — colapsable ── */}
        <div className="card mb" style={{padding: uploadOpen ? undefined : ".65rem 1rem"}}>
          <button
            onClick={() => setUploadOpen(v => !v)}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              width:"100%",background:"none",border:"none",cursor:"pointer",padding:0,
              marginBottom: uploadOpen ? ".65rem" : 0}}>
            <span className="card-title" style={{color:catInfo.color,margin:0}}>
              {catInfo.icon} Subir a {catInfo.label}
            </span>
            <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--text-dim)"}}>
              {uploadOpen ? "▲ ocultar" : "▼ mostrar"}
            </span>
          </button>
          {uploadOpen && (
            <div>

          {/* Campos de metadatos */}
          <div className="doc-upload-fields">
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
            <input value={nota} onChange={e => setNota(e.target.value)}
              placeholder="Nota descriptiva (opcional)" className="doc-input" />
          </div>

          {/* Drop zone — más visual con instrucción explícita */}
          <div
            className={cls("doc-dropzone", dragOver && "over")}
            onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept={ALLOWED_EXT} multiple style={{display:"none"}}
              onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />

            <div className="doc-dropzone-icon">
              {uploading ? "⏳" : dragOver ? "⬇️" : "📎"}
            </div>
            <div className="doc-dropzone-msg">
              {uploading
                ? "Subiendo documentos…"
                : dragOver
                  ? "✓ Suelta aquí para subir"
                  : "Arrastra archivos aquí · o haz clic para seleccionar"}
            </div>
            <div className="doc-dropzone-hint">
              {!uploading && !dragOver && (
                <>PDF, PNG, JPG, WebP · Máx. 10 MB<br/>
                Puedes subir varios archivos a la vez</>
              )}
            </div>
            {!uploading && !dragOver && (
              <div className="doc-dropzone-types">
                {["PDF","PNG","JPG","WebP"].map(t => (
                  <span key={t} className="doc-type-pill">{t}</span>
                ))}
              </div>
            )}
          </div>
            </div>
          )}
        </div>

        {/* ── Document list ── */}
        {catDocs.length === 0 ? (
          <div className="doc-empty">
            <div className="doc-empty-icon">{busqueda ? "🔍" : catInfo.icon}</div>
            <div className="doc-empty-text">
              {busqueda
                ? `Sin resultados para "${busqueda}"`
                : `No hay documentos en ${catInfo.label}`}
            </div>
          </div>
        ) : (
          <>
            {busqueda && (
              <div className="mono xs muted mb-sm">
                {catDocs.length} resultado{catDocs.length!==1?"s":""} para "{busqueda}"
              </div>
            )}
            <div className="doc-list">
              {catDocs.map(doc => {
                const estadoCfg = getEstadoCfg(doc.estado);
                const dVenc     = diasHasta(doc.fechaVencimiento);
                const vencColor = dVenc !== null
                  ? (dVenc < 0 ? "#f87171" : dVenc <= 7 ? "#f87171" : dVenc <= 30 ? "#fbbf24" : "var(--text-muted)")
                  : "var(--text-muted)";

                return (
                  <div key={doc.id} className="doc-card">
                    {/* Accent line */}
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:catInfo.color,borderRadius:"12px 12px 0 0"}} />

                    {editId === doc.id ? (
                      /* ── Edit mode ── */
                      <div className="doc-edit-card" style={{paddingTop:4}}>
                        <div style={{fontSize:".7rem",fontWeight:700,color:catInfo.color}}>✏️ Editando metadatos</div>
                        {/* Mover a otra categoría */}
                        <select value={editForm.categoria ?? doc.categoria}
                          onChange={e => setEditForm(p=>({...p,categoria:e.target.value}))}
                          className="doc-select" style={{width:"100%"}}>
                          {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                        </select>
                        {subcats.length > 0 && (
                          <select value={editForm.subcategoria} onChange={e => setEditForm(p=>({...p,subcategoria:e.target.value}))}
                            className="doc-select" style={{width:"100%"}}>
                            <option value="">— Subcategoría —</option>
                            {subcats.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                        <select value={editForm.estado} onChange={e => setEditForm(p=>({...p,estado:e.target.value}))}
                          className="doc-select" style={{width:"100%",color:getEstadoCfg(editForm.estado).color}}>
                          {ESTADOS_DOC.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                        </select>
                        <input type="date" value={editForm.fechaVencimiento}
                          onChange={e => setEditForm(p=>({...p,fechaVencimiento:e.target.value}))}
                          className="doc-select" style={{width:"100%"}} />
                        <input value={editForm.nota} onChange={e => setEditForm(p=>({...p,nota:e.target.value}))}
                          placeholder="Nota descriptiva" className="doc-input" style={{width:"100%",boxSizing:"border-box"}} />
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={saveEdit} className="doc-btn doc-btn-save">✅ Guardar</button>
                          <button onClick={() => setEditId(null)} className="doc-btn doc-btn-cancel">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      /* ── View mode ── */
                      <>
                        <div style={{display:"flex",alignItems:"flex-start",gap:10,paddingTop:4}}>
                          <span style={{fontSize:"2rem"}}>{getFileIcon(doc.tipo)}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div className="doc-card-name">{doc.nombre}</div>
                          </div>
                        </div>

                        {/* Estado + fecha vencimiento */}
                        <div style={{display:"flex",alignItems:"center",gap:".4rem",flexWrap:"wrap"}}>
                          {/* Selector de estado inline */}
                          <select
                            className="doc-estado-sel"
                            value={doc.estado || "pendiente"}
                            onChange={e => updateEstado(doc.id, e.target.value)}
                            style={{color:estadoCfg.color, background:estadoCfg.bg,
                              border:`1px solid ${estadoCfg.color}44`}}>
                            {ESTADOS_DOC.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                          </select>
                          {doc.fechaVencimiento && (
                            <span className="mono" style={{fontSize:".58rem",color:vencColor,fontWeight:700}}>
                              {dVenc === null ? "" :
                               dVenc < 0    ? `⚠ Venció ${formatDate(doc.fechaVencimiento)}` :
                               dVenc === 0  ? "⏰ Vence hoy" :
                                             `⏰ ${dVenc}d · ${formatDate(doc.fechaVencimiento)}`}
                            </span>
                          )}
                        </div>

                        <div className="doc-card-meta">
                          <span className="doc-card-meta-item">{formatSize(doc.size)}</span>
                          <span className="doc-card-meta-item" style={{color:"var(--text-dim)"}}>·</span>
                          <span className="doc-card-meta-item">{formatDate(doc.fechaSubida)}</span>
                          {doc.subcategoria && (
                            <span className="doc-badge" style={{
                              background:`${catInfo.color}18`,color:catInfo.color,border:`1px solid ${catInfo.color}44`
                            }}>{doc.subcategoria}</span>
                          )}
                        </div>

                        {doc.nota && <div className="doc-card-note">💬 {doc.nota}</div>}

                        <div className="doc-card-actions">
                          <button onClick={() => viewDoc(doc)} className="doc-btn doc-btn-view">👁 Ver</button>
                          <button onClick={() => downloadDoc(doc)} className="doc-btn doc-btn-dl">⬇ Guardar</button>
                          <button onClick={() => startEdit(doc)} className="doc-btn doc-btn-edit">✏️ Editar</button>
                          <button onClick={() => deleteDoc(doc.id)} className="doc-btn doc-btn-del">🗑</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
