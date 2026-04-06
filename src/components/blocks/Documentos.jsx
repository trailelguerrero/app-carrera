import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import dataService, { useData } from "@/lib/dataService";
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
  { id: "gestiones",    icon: "🏛️", label: "Gestiones",    color: "#38bdf8", esGestion: true },
];

const SUBCATEGORIAS = {
  permisos:     ["Ayuntamiento", "Diputación", "Medio Ambiente", "Otro"],
  seguros:      ["Accidentes", "Responsabilidad Civil", "Otro"],
  protocolos:   ["Actuación Accidentes", "Actuación RC", "Evacuación", "Otro"],
  presupuestos: [],
  facturas:     [],
  gestiones:    ["Ayuntamiento", "Federación", "Medio Ambiente", "Diputación", "Cruz Roja", "Seguro RC", "Otro"],
};

// Gestiones legales predefinidas (registro sin archivo)
const GESTIONES_DEFAULT = [
  { id:"g1", nombre:"Autorización Ayuntamiento Candeleda", subcategoria:"Ayuntamiento",
    estado:"pendiente", fechaVencimiento:"2026-08-29", nota:"Solicitud prevista reunión con alcaldía. Renovar anualmente.", url:"", fechaSubida: new Date(0).toISOString() },
  { id:"g2", nombre:"Licencia federativa colectiva (FEMM)", subcategoria:"Federación",
    estado:"pendiente", fechaVencimiento:"2026-08-29", nota:"Federación Española Montaña y Escalada. Requiere seguro RC previo.", url:"", fechaSubida: new Date(0).toISOString() },
  { id:"g3", nombre:"Seguro Responsabilidad Civil", subcategoria:"Seguro RC",
    estado:"pendiente", fechaVencimiento:"2026-08-29", nota:"Mínimo 600.000 € cobertura. Pedir presupuesto a Mapfre y Allianz.", url:"", fechaSubida: new Date(0).toISOString() },
  { id:"g4", nombre:"Autorización Medio Ambiente / JCYL", subcategoria:"Medio Ambiente",
    estado:"pendiente", fechaVencimiento:"2026-06-30", nota:"Necesaria para uso de montes de utilidad pública.", url:"", fechaSubida: new Date(0).toISOString() },
  { id:"g5", nombre:"Protocolo Cruz Roja / Servicio médico", subcategoria:"Cruz Roja",
    estado:"pendiente", fechaVencimiento:"2026-08-29", nota:"Ambulancia + 2 sanitarios titulados. Confirmar antes del 15 mayo.", url:"", fechaSubida: new Date(0).toISOString() },
];

// Estados del documento con colores
const ESTADOS_DOC = [
  { id: "pendiente",  label: "Pendiente",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  { id: "en_tramite", label: "En trámite", color: "#22d3ee", bg: "var(--cyan-dim)"  },
  { id: "enviado",    label: "Enviado",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)"   },
  { id: "firmado",    label: "Firmado",    color: "#a78bfa", bg: "var(--violet-dim)" },
  { id: "aprobado",   label: "Aprobado",   color: "#34d399", bg: "var(--green-dim)"  },
  { id: "denegado",   label: "Denegado",   color: "#f87171", bg: "var(--red-dim)" },
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
  const [eventCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [docs, setDocs]         = useState([]);
  const [gestiones, setGestiones] = useState([]);
  const [tab,  setTab]          = useState("presupuestos");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [subcat, setSubcat]     = useState("");
  const [nota,   setNota]       = useState("");
  const [estadoNuevo, setEstadoNuevo] = useState("pendiente");
  const [vencNuevo, setVencNuevo]     = useState("");
  const [emisorNuevo, setEmisorNuevo]   = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [busqGlobal, setBusqGlobal] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(true); // colapsable en móvil
  const [editId,  setEditId]    = useState(null);
  const [editForm, setEditForm] = useState({});
  // Modal nueva gestión
  const [gModal, setGModal] = useState(false);
  const [gForm, setGForm]   = useState({ nombre:"", subcategoria:"Ayuntamiento", estado:"pendiente", fechaVencimiento:"", nota:"", url:"" });
  const [gEditId, setGEditId] = useState(null);
  const fileRef = useRef(null);
  const [visorDoc, setVisorDoc] = useState(null); // doc a visualizar en modal

  // ── Carga inicial desde API ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // Documentos desde tabla dedicada (sin data base64 — solo metadatos)
        const apiKey = import.meta.env.VITE_API_KEY;
        const res = await fetch("/api/documents", {
          headers: { "x-api-key": apiKey }
        });
        if (res.ok) {
          const rows = await res.json();
          // Los docs de la API no tienen .data — se carga solo al ver/descargar
          setDocs(rows.map(r => ({ ...r, data: null })));
        } else {
          // Fallback a localStorage si la API no responde
          dataService.get(LS_KEY, []).then(d => setDocs(Array.isArray(d) ? d : []));
        }
      } catch {
        dataService.get(LS_KEY, []).then(d => setDocs(Array.isArray(d) ? d : []));
      }
      // Gestiones siguen en colección JSON normal
      dataService.get(LS_KEY + "_gestiones", GESTIONES_DEFAULT).then(setGestiones);
    };
    load();
  }, []);

  // save() solo actualiza el estado local — cada operación llama a la API directamente
  const save = useCallback((next) => { setDocs(next); }, []);
  const saveGestiones = useCallback((next) => {
    setGestiones(next);
    dataService.set(LS_KEY + "_gestiones", next).then(() => dataService.notify());
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
        nombreDisplay: nota ? nota.trim() : file.name.replace(/\.[^.]+$/, ""),
        emisor: emisorNuevo || null,
        categoria: tab,
        subcategoria: subcat || null,
        nota: null,
        estado: estadoNuevo,
        fechaVencimiento: vencNuevo || null,
        size: file.size,
        tipo: file.type || (file.name.match(/\.pdf$/i) ? "application/pdf" : "image/jpeg"),
        data: base64,
        fechaSubida: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
      });
    }
    // Subir cada documento a la API
    const apiKey = import.meta.env.VITE_API_KEY;
    const subidos = [];
    for (const doc of newDocs) {
      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify(doc),
        });
        if (res.ok) {
          // Guardar en estado local sin el data (ya está en la nube)
          subidos.push({ ...doc, data: null });
        }
      } catch (e) {
        console.error("Error subiendo documento:", e);
      }
    }
    save([...docs, ...subidos]);
    setNota(""); setSubcat(""); setVencNuevo(""); setEstadoNuevo("pendiente"); setEmisorNuevo("");
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

  const deleteDoc = async (id) => {
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      await fetch(`/api/documents?id=${id}`, {
        method: "DELETE",
        headers: { "x-api-key": import.meta.env.VITE_API_KEY }
      });
    } catch (e) { console.error("Error eliminando:", e); }
    save(docs.filter(d => d.id !== id));
  };
  const downloadDoc = async (doc) => {
    const data = await fetchDocData(doc);
    if (!data) return;
    const a = document.createElement("a");
    a.href = data; a.download = doc.nombre; a.click();
  };
  // Obtener el data del documento desde la API (lazy — no se descarga al listar)
  const fetchDocData = async (doc) => {
    if (doc.data) return doc.data; // ya en memoria (localStorage fallback)
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        headers: { "x-api-key": import.meta.env.VITE_API_KEY }
      });
      if (res.ok) {
        const { data } = await res.json();
        return data;
      }
    } catch (e) { console.error("Error obteniendo datos:", e); }
    return null;
  };

  const viewDoc = async (doc) => {
    // Obtener data — de memoria o de la API
    let data = doc.data || null;
    if (!data) {
      // Mostrar modal con spinner mientras carga
      setVisorDoc({ ...doc, _loading: true });
      data = await fetchDocData(doc);
    }

    if (!data) {
      setVisorDoc({ ...doc, _loading: false, _error: true });
      return;
    }

    const esPdf = doc.tipo === "application/pdf"
      || doc.nombre?.toLowerCase().endsWith(".pdf")
      || data.startsWith("data:application/pdf");

    const esImg = doc.tipo?.startsWith("image/")
      || !!doc.nombre?.match(/\.(png|jpe?g|webp)$/i);

    if (esPdf) {
      // PDFs: Blob URL + window.open — único método fiable en Android Chrome e iOS Safari
      // Los iframes con blob:// no renderizan PDFs en navegadores móviles
      try {
        const b64  = data.includes(",") ? data.split(",")[1] : data;
        const bin  = atob(b64);
        const buf  = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        const url  = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
        window.open(url, "_blank");
        // Liberar memoria tras un momento
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (e) {
        // Fallback: abrir base64 directamente
        window.open(data, "_blank");
      }
      return; // No abrir modal para PDFs — el sistema los maneja
    }

    if (esImg) {
      // Imágenes: mostrar en modal interno
      setVisorDoc({ ...doc, data, _loading: false });
      return;
    }

    // Tipo desconocido: intentar abrir igual
    window.open(data, "_blank");
  };

  const startEdit = (doc) => {
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "instant" });
    setEditId(doc.id);
    setEditForm({
      nombreDisplay: doc.nombreDisplay || doc.nombre.replace(/\.[^.]+$/, ""),
      emisor: doc.emisor || "",
      nota: doc.nota || "",
      subcategoria: doc.subcategoria || "",
      estado: doc.estado || "pendiente",
      fechaVencimiento: doc.fechaVencimiento || "",
    });
  };

  const saveEdit = async () => {
    try {
      await fetch(`/api/documents?id=${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_API_KEY },
        body: JSON.stringify(editForm),
      });
    } catch (e) { console.error("Error actualizando:", e); }
    save(docs.map(d => d.id === editId
      ? { ...d, ...editForm, fechaModificacion: new Date().toISOString() }
      : d
    ));
    const doc = docs.find(d => d.id === editId);
    if (doc && editForm.categoria && editForm.categoria !== doc.categoria) setTab(editForm.categoria);
    setEditId(null);
  };

  const updateEstado = async (id, estado) => {
    try {
      await fetch(`/api/documents?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_API_KEY },
        body: JSON.stringify({ estado }),
      });
    } catch (e) { console.error("Error actualizando estado:", e); }
    save(docs.map(d => d.id === id ? { ...d, estado, fechaModificacion: new Date().toISOString() } : d));
  };

  // ─── DERIVED ─────────────────────────────────────────────────────────────
  const catInfo   = CATEGORIAS.find(c => c.id === tab);
  const isGestion = catInfo?.esGestion === true;
  const subcats   = SUBCATEGORIAS[tab] || [];
  const totalSize = docs.reduce((s, d) => s + (d.size || 0), 0);
  const storagePct = Math.min((totalSize / (100*1024*1024)) * 100, 100);
  const storageColor = storagePct > 80 ? "#f87171" : storagePct > 50 ? "#fbbf24" : "#34d399";

  // Gestiones con vencimiento próximo o vencidas
  const gestionesProxVencer = gestiones.filter(g => {
    const dias = diasHasta(g.fechaVencimiento);
    return dias !== null && dias >= 0 && dias <= 30 && g.estado !== "aprobado";
  });
  const gestionesVencidas = gestiones.filter(g => {
    const dias = diasHasta(g.fechaVencimiento);
    return dias !== null && dias < 0 && g.estado !== "aprobado" && g.estado !== "denegado";
  });
  const gestionesCriticas = gestiones.filter(g => g.estado === "denegado");

  // Documentos por vencer en <30 días (para alertas)
  const proxVencer = docs.filter(d => {
    const dias = diasHasta(d.fechaVencimiento);
    return dias !== null && dias >= 0 && dias <= 30 && d.estado !== "aprobado";
  }).sort((a,b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

  const vencidos = docs.filter(d => {
    const dias = diasHasta(d.fechaVencimiento);
    return dias !== null && dias < 0 && d.estado !== "aprobado";
  });

  // Búsqueda global (todas las categorías)
  const resultadosGlobales = busqueda && busqGlobal
    ? docs.filter(d => {
        const q = busqueda.toLowerCase();
        return (d.nombreDisplay||d.nombre).toLowerCase().includes(q)
          || (d.emisor||"").toLowerCase().includes(q)
          || (d.nota||"").toLowerCase().includes(q)
          || (d.subcategoria||"").toLowerCase().includes(q);
      }).sort((a,b) => new Date(b.fechaSubida) - new Date(a.fechaSubida))
    : null;

  // Filtrado: categoría + búsqueda
  const catDocs = docs
    .filter(d => d.categoria === tab)
    .filter(d => {
      if (!busqueda || busqGlobal) return true;
      const q = busqueda.toLowerCase();
      return (d.nombreDisplay||d.nombre).toLowerCase().includes(q)
        || (d.emisor||"").toLowerCase().includes(q)
        || (d.nota||"").toLowerCase().includes(q)
        || (d.subcategoria||"").toLowerCase().includes(q)
        || (d.estado||"").toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.fechaSubida) - new Date(a.fechaSubida));

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const DOC_CSS = `
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
    .doc-dropzone:hover { border-color:var(--cyan); background:var(--cyan-dim); }
    .doc-dropzone.over { border-color:var(--cyan); background:var(--cyan-dim);
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
            <div className="block-title-sub">{config.nombre} {config.edicion} · Gestión documental</div>
          </div>
          <div className="block-actions">
            {/* Alertas de vencimiento en el header */}
            {(vencidos.length + gestionesVencidas.length + gestionesCriticas.length) > 0 && (
              <span className="badge badge-red">
                ⚠️ {vencidos.length + gestionesVencidas.length + gestionesCriticas.length} urgente{(vencidos.length+gestionesVencidas.length+gestionesCriticas.length)>1?"s":""}
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
                placeholder={busqGlobal ? "Buscar en todos…" : "Buscar aquí…"}
              />
              {busqueda && (
                <>
                  <button
                    onClick={() => setBusqGlobal(v => !v)}
                    title={busqGlobal ? "Buscar solo en esta categoría" : "Buscar en todas las categorías"}
                    style={{background:busqGlobal?"var(--cyan-dim)":"none",border:busqGlobal?"1px solid rgba(34,211,238,0.3)":"none",
                      color:busqGlobal?"var(--cyan)":"var(--text-muted)",cursor:"pointer",
                      fontSize:".6rem",padding:".1rem .35rem",borderRadius:4,
                      fontFamily:"var(--font-mono)",whiteSpace:"nowrap",flexShrink:0}}>
                    {busqGlobal ? "🌐 Global" : "📁 Esta"}
                  </button>
                  <button onClick={() => { setBusqueda(""); setBusqGlobal(false); }}
                    style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:".7rem",padding:0}}>✕</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── ALERTAS DE GESTIONES LEGALES ── */}
        {(gestionesVencidas.length > 0 || gestionesCriticas.length > 0 || gestionesProxVencer.length > 0) && (
          <div className="card mb" style={{padding:".75rem 1rem",borderLeft:"3px solid #38bdf8"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,color:"#38bdf8",
              textTransform:"uppercase",letterSpacing:".08em",marginBottom:".5rem"}}>
              🏛️ Gestiones legales — atención requerida
            </div>
            {[...gestionesCriticas.map(g=>({...g,_tipo:"denegado"})),
              ...gestionesVencidas.map(g=>({...g,_tipo:"vencida"})),
              ...gestionesProxVencer.map(g=>({...g,_tipo:"proxima"}))
            ].map(g => {
              const dias = diasHasta(g.fechaVencimiento);
              return (
                <div key={g.id} style={{display:"flex",alignItems:"center",gap:".5rem",
                  padding:".3rem .6rem",borderRadius:6,marginBottom:".25rem",
                  background: g._tipo==="denegado"?"var(--red-dim)":g._tipo==="vencida"?"var(--red-dim)":"var(--amber-dim)",
                  border:`1px solid ${g._tipo==="proxima"?"rgba(251,191,36,0.2)":"rgba(248,113,113,0.2)"}`}}>
                  <span style={{fontSize:".75rem"}}>{g._tipo==="denegado"?"🚫":g._tipo==="vencida"?"⚠️":"⏰"}</span>
                  <span style={{flex:1,fontFamily:"var(--font-mono)",fontSize:".65rem",fontWeight:600,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.nombre}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
                    color:g._tipo==="proxima"?"var(--amber)":"var(--red)",fontWeight:700,flexShrink:0}}>
                    {g._tipo==="denegado"?"Denegado":
                     g._tipo==="vencida"?`Venció ${formatDate(g.fechaVencimiento)}`:
                     dias===0?"Hoy":`en ${dias}d`}
                  </span>
                  <button style={{fontFamily:"var(--font-mono)",fontSize:".55rem",padding:".1rem .35rem",
                    borderRadius:4,border:"1px solid rgba(56,189,248,0.3)",background:"rgba(56,189,248,0.1)",
                    color:"#38bdf8",cursor:"pointer"}}
                    onClick={()=>{setTab("gestiones");setGEditId(g.id);}}>
                    Actualizar
                  </button>
                </div>
              );
            })}
          </div>
        )}

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
          <div className="kpi" style={{cursor:"pointer",borderLeftColor:"var(--text-dim)",borderLeftWidth:3,borderLeftStyle:"solid"}}
            onClick={()=>setTab("gestiones")}>
            <div className="kpi-label">📦 Total docs</div>
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

        {/* ── Upload zone / Formulario gestión — según categoría ── */}
        {isGestion ? (
          /* ── FORMULARIO GESTIONES LEGALES ── */
          <div className="card mb">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem"}}>
              <span className="card-title" style={{color:"#38bdf8",margin:0}}>🏛️ Gestiones legales pendientes</span>
              <button className="btn btn-primary btn-sm" onClick={()=>{
                setGForm({nombre:"",subcategoria:"Ayuntamiento",estado:"pendiente",fechaVencimiento:"",nota:"",url:""});
                setGEditId(null); setGModal(true);
              }}>+ Nueva gestión</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:".45rem"}}>
              {gestiones.length === 0 && (
                <div style={{textAlign:"center",padding:"2rem",color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:".72rem"}}>
                  Sin gestiones registradas
                </div>
              )}
              {gestiones.map(g => {
                const ecfg = getEstadoCfg(g.estado);
                const dias = diasHasta(g.fechaVencimiento);
                const vcolor = dias===null?"var(--text-muted)":dias<0?"var(--red)":dias<=7?"var(--red)":dias<=30?"var(--amber)":"var(--text-muted)";
                const isEditing = gEditId === g.id;
                return (
                  <div key={g.id} style={{background:"var(--surface2)",border:`1px solid ${ecfg.color}33`,
                    borderLeft:`3px solid ${ecfg.color}`,borderRadius:8,padding:".65rem .85rem"}}>
                    {isEditing ? (
                      /* Modo edición inline */
                      <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
                        <input className="inp" value={gForm.nombre} onChange={e=>setGForm(p=>({...p,nombre:e.target.value}))} placeholder="Nombre de la gestión *" />
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem"}}>
                          <select className="inp inp-sm" value={gForm.subcategoria} onChange={e=>setGForm(p=>({...p,subcategoria:e.target.value}))}>
                            {(SUBCATEGORIAS.gestiones||[]).map(sc=><option key={sc} value={sc}>{sc}</option>)}
                          </select>
                          <select className="inp inp-sm" value={gForm.estado} onChange={e=>setGForm(p=>({...p,estado:e.target.value}))} style={{color:getEstadoCfg(gForm.estado).color}}>
                            {ESTADOS_DOC.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
                          </select>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem"}}>
                          <div><label style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--text-muted)",display:"block",marginBottom:".2rem"}}>Fecha límite</label>
                            <input className="inp inp-sm" type="date" value={gForm.fechaVencimiento} onChange={e=>setGForm(p=>({...p,fechaVencimiento:e.target.value}))} /></div>
                          <div><label style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--text-muted)",display:"block",marginBottom:".2rem"}}>URL / Referencia</label>
                            <input className="inp inp-sm" value={gForm.url||""} onChange={e=>setGForm(p=>({...p,url:e.target.value}))} placeholder="https://…" /></div>
                        </div>
                        <textarea className="inp" rows={2} value={gForm.nota||""} onChange={e=>setGForm(p=>({...p,nota:e.target.value}))} placeholder="Notas / instrucciones…" style={{resize:"vertical"}} />
                        <div style={{display:"flex",gap:".4rem"}}>
                          <button className="btn btn-primary btn-sm" onClick={()=>{
                            if(!gForm.nombre.trim()) return;
                            saveGestiones(gestiones.map(x=>x.id===g.id?{...x,...gForm}:x));
                            setGEditId(null);
                          }}>✅ Guardar</button>
                          <button className="btn btn-ghost btn-sm" onClick={()=>setGEditId(null)}>Cancelar</button>
                          <button className="btn btn-red btn-sm" style={{marginLeft:"auto"}} onClick={()=>{
                            if(!confirm("¿Eliminar esta gestión?")) return;
                            saveGestiones(gestiones.filter(x=>x.id!==g.id));
                            setGEditId(null);
                          }}>🗑 Eliminar</button>
                        </div>
                      </div>
                    ) : (
                      /* Modo vista */
                      <div style={{display:"flex",gap:".75rem",alignItems:"flex-start"}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:".82rem",marginBottom:".2rem"}}>{g.nombre}</div>
                          <div style={{display:"flex",gap:".4rem",flexWrap:"wrap",alignItems:"center"}}>
                            <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",padding:".08rem .35rem",
                              borderRadius:3,background:`${ecfg.color}18`,color:ecfg.color,border:`1px solid ${ecfg.color}33`}}>
                              {ecfg.label}
                            </span>
                            {g.subcategoria && <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)"}}>{g.subcategoria}</span>}
                            {g.fechaVencimiento && (
                              <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:vcolor,fontWeight:700}}>
                                {dias===null?"":dias<0?`⚠ Venció ${formatDate(g.fechaVencimiento)}`:dias===0?"⏰ Hoy":`⏰ ${dias}d · ${formatDate(g.fechaVencimiento)}`}
                              </span>
                            )}
                            {g.url && <a href={g.url} target="_blank" rel="noreferrer" style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"#38bdf8"}} onClick={e=>e.stopPropagation()}>🔗 Ver enlace</a>}
                          </div>
                          {g.nota && <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--text-muted)",marginTop:".25rem",lineHeight:1.5}}>{g.nota}</div>}
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{flexShrink:0}} onClick={()=>{
                          setGForm({nombre:g.nombre,subcategoria:g.subcategoria||"Ayuntamiento",estado:g.estado,fechaVencimiento:g.fechaVencimiento||"",nota:g.nota||"",url:g.url||""});
                          setGEditId(g.id);
                        }}>✏️</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
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
            <input value={nota} onChange={e => setNota(e.target.value)}
              placeholder="Nombre descriptivo (ej: Seguro RC Mapfre 2026)" className="doc-input" style={{flexBasis:"100%"}} />
            <input value={emisorNuevo} onChange={e => setEmisorNuevo(e.target.value)}
              placeholder="Emisor / proveedor (ej: Mapfre, Cruz Roja…)" className="doc-input" />
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
        )} {/* fin ternario isGestion */}

        {/* ── Resultados búsqueda global ── */}
        {resultadosGlobales && (
          <div className="card mb" style={{padding:".75rem 1rem"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:".62rem",color:"var(--cyan)",
              fontWeight:700,marginBottom:".65rem"}}>
              🌐 {resultadosGlobales.length} resultado{resultadosGlobales.length!==1?"s":""} en todos los documentos para "{busqueda}"
            </div>
            <div className="doc-list">
              {resultadosGlobales.map(doc => {
                const cat = CATEGORIAS.find(c => c.id === doc.categoria) || CATEGORIAS[0];
                const ecfg = getEstadoCfg(doc.estado);
                const dV = diasHasta(doc.fechaVencimiento);
                const vc = dV !== null ? (dV < 0 ? "var(--red)" : dV <= 30 ? "var(--amber)" : "var(--text-muted)") : "var(--text-muted)";
                return (
                  <div key={doc.id} className="doc-card" onClick={() => setTab(doc.categoria)} style={{cursor:"pointer"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:cat.color,borderRadius:"12px 12px 0 0"}} />
                    <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:4}}>
                      <span style={{fontSize:"1.5rem"}}>{getFileIcon(doc.tipo)}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="doc-card-name" style={{fontSize:".75rem"}}>{doc.nombreDisplay || doc.nombre}</div>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:cat.color,marginTop:".1rem"}}>
                          {cat.icon} {cat.label}{doc.subcategoria ? ` · ${doc.subcategoria}` : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:".4rem",flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",padding:".08rem .35rem",
                        borderRadius:3,background:ecfg.bg,color:ecfg.color,border:`1px solid ${ecfg.color}33`}}>
                        {ecfg.label}
                      </span>
                      {doc.emisor && <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)"}}>🏢 {doc.emisor}</span>}
                      {doc.fechaVencimiento && dV !== null && (
                        <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:vc,fontWeight:700}}>
                          ⏰ {formatDate(doc.fechaVencimiento)}
                        </span>
                      )}
                    </div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-dim)"}}>
                      {formatSize(doc.size)} · {formatDate(doc.fechaSubida)}
                    </div>
                    <div className="doc-card-actions">
                      <button onClick={e=>{e.stopPropagation();viewDoc(doc);}} className="doc-btn doc-btn-view">👁 Ver</button>
                      <button onClick={e=>{e.stopPropagation();downloadDoc(doc);}} className="doc-btn doc-btn-dl">⬇</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {resultadosGlobales.length === 0 && (
              <div style={{textAlign:"center",padding:"1.5rem",color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:".72rem"}}>
                Sin resultados para "{busqueda}"
              </div>
            )}
          </div>
        )}

        {/* ── Document list ── */}
        {isGestion ? null : (!busqGlobal && catDocs.length === 0) ? (
          <div className="doc-empty">
            <div className="doc-empty-icon">{busqueda ? "🔍" : catInfo.icon}</div>
            <div className="doc-empty-text">
              {busqueda
                ? `Sin resultados para "${busqueda}"`
                : `No hay documentos en ${catInfo.label}`}
            </div>
          </div>
        ) : busqGlobal ? null : (
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
                        <div style={{fontSize:".7rem",fontWeight:700,color:catInfo.color,marginBottom:".25rem"}}>✏️ Editando documento</div>
                        <input value={editForm.nombreDisplay}
                          onChange={e => setEditForm(p=>({...p,nombreDisplay:e.target.value}))}
                          placeholder="Nombre descriptivo *" className="doc-input" style={{width:"100%",boxSizing:"border-box"}} />
                        <input value={editForm.emisor}
                          onChange={e => setEditForm(p=>({...p,emisor:e.target.value}))}
                          placeholder="Emisor / proveedor" className="doc-input" style={{width:"100%",boxSizing:"border-box"}} />
                        <select value={editForm.categoria ?? doc.categoria}
                          onChange={e => setEditForm(p=>({...p,categoria:e.target.value}))}
                          className="doc-select" style={{width:"100%"}}>
                          {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                        </select>
                        {(SUBCATEGORIAS[editForm.categoria ?? doc.categoria]||[]).length > 0 && (
                          <select value={editForm.subcategoria} onChange={e => setEditForm(p=>({...p,subcategoria:e.target.value}))}
                            className="doc-select" style={{width:"100%"}}>
                            <option value="">— Subcategoría —</option>
                            {(SUBCATEGORIAS[editForm.categoria ?? doc.categoria]||[]).map(sc => <option key={sc} value={sc}>{sc}</option>)}
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
                          placeholder="Notas adicionales" className="doc-input" style={{width:"100%",boxSizing:"border-box"}} />
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={saveEdit} className="doc-btn doc-btn-save">✅ Guardar</button>
                          <button onClick={() => setEditId(null)} className="doc-btn doc-btn-cancel">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      /* ── View mode ── */
                      <>
                        {/* Thumbnail para imágenes */}
                        {doc.tipo?.startsWith("image/") && doc.data && (
                          <div onClick={() => viewDoc(doc)} style={{
                            width:"100%", height:100, borderRadius:8,
                            overflow:"hidden", cursor:"pointer",
                            background:"var(--surface2)",
                            marginBottom:".25rem",
                          }}>
                            <img src={doc.data} alt={doc.nombreDisplay||doc.nombre}
                              style={{width:"100%",height:"100%",objectFit:"cover"}} />
                          </div>
                        )}

                        <div style={{display:"flex",alignItems:"flex-start",gap:8,paddingTop:doc.tipo?.startsWith("image/")?"0":"4px"}}>
                          {!doc.tipo?.startsWith("image/") && (
                            <span style={{fontSize:"1.8rem",flexShrink:0}}>{getFileIcon(doc.tipo)}</span>
                          )}
                          <div style={{flex:1,minWidth:0}}>
                            <div className="doc-card-name">{doc.nombreDisplay || doc.nombre}</div>
                            {doc.emisor && (
                              <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
                                color:"var(--text-muted)",marginTop:".1rem"}}>
                                🏢 {doc.emisor}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Estado + fecha vencimiento */}
                        <div style={{display:"flex",alignItems:"center",gap:".4rem",flexWrap:"wrap"}}>
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
                              background:`${catInfo.color}18`,color:catInfo.color,
                              border:`1px solid ${catInfo.color}44`
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

      {/* ── VISOR DE DOCUMENTOS — portal a document.body para evitar overflow:auto del main ── */}
      {visorDoc && createPortal(
        <div onClick={e => { if (e.target===e.currentTarget) { setVisorDoc(null); } }} style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",
          backdropFilter:"blur(8px)",zIndex:9999,
          display:"flex",flexDirection:"column",
        }}>
          {/* Header del visor */}
          <div style={{
            display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:".75rem 1rem",background:"rgba(0,0,0,0.6)",
            borderBottom:"1px solid rgba(255,255,255,0.1)",flexShrink:0,
          }}>
            <div>
              <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:".85rem",color:"#fff"}}>
                {getFileIcon(visorDoc.tipo)} {visorDoc.nombreDisplay || visorDoc.nombre}
              </div>
              {visorDoc.emisor && (
                <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"rgba(255,255,255,0.5)",marginTop:".15rem"}}>
                  🏢 {visorDoc.emisor}
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
              <button onClick={() => downloadDoc(visorDoc)} style={{
                background:"rgba(52,211,153,0.15)",color:"#34d399",
                border:"1px solid rgba(52,211,153,0.3)",borderRadius:8,
                padding:".35rem .75rem",fontFamily:"var(--font-display)",
                fontWeight:700,fontSize:".72rem",cursor:"pointer",
              }}>⬇ Descargar</button>
              <button onClick={() => { setVisorDoc(null); }} style={{
                background:"rgba(255,255,255,0.1)",color:"#fff",
                border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,
                padding:".35rem .75rem",fontFamily:"var(--font-display)",
                fontWeight:700,fontSize:".72rem",cursor:"pointer",
              }}>✕ Cerrar</button>
            </div>
          </div>

          {/* Contenido del visor — solo imágenes y spinner de carga */}
          <div style={{flex:1,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
            {visorDoc._loading ? (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1rem",textAlign:"center"}}>
                <div style={{width:40,height:40,borderRadius:"50%",
                  border:"3px solid rgba(255,255,255,0.15)",borderTopColor:"#22d3ee",
                  animation:"teg-spin 0.7s linear infinite"}} />
                <style>{`@keyframes teg-spin{to{transform:rotate(360deg)}}`}</style>
                <div style={{fontFamily:"monospace",fontSize:".72rem",color:"rgba(255,255,255,0.5)"}}>
                  Cargando documento…
                </div>
              </div>
            ) : visorDoc._error ? (
              <div style={{textAlign:"center",color:"rgba(255,255,255,0.7)"}}>
                <div style={{fontSize:"3rem",marginBottom:".75rem"}}>⚠️</div>
                <div style={{fontFamily:"monospace",fontSize:".78rem",marginBottom:"1rem"}}>
                  No se pudo cargar el documento
                </div>
                <button onClick={() => downloadDoc(visorDoc)} style={{
                  background:"#34d399",color:"#0f1629",border:"none",borderRadius:10,
                  padding:".6rem 1.5rem",fontWeight:800,fontSize:".85rem",cursor:"pointer",
                }}>⬇ Descargar</button>
              </div>
            ) : visorDoc.data ? (
              <img src={visorDoc.data}
                alt={visorDoc.nombreDisplay || visorDoc.nombre}
                style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",borderRadius:8}}
              />
            ) : null}
          </div>
        </div>
      , document.body)}
      {/* ── Modal nueva gestión ── */}
      {gModal && createPortal(
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setGModal(false)}>
          <div className="modal" style={{maxWidth:480}}>
            <div className="modal-header">
              <span className="modal-title">🏛️ Nueva gestión legal</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setGModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{gap:".65rem"}}>
              <div>
                <label style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Nombre *</label>
                <input className="inp" value={gForm.nombre} onChange={e=>setGForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Autorización Ayuntamiento" />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Tipo</label>
                  <select className="inp" value={gForm.subcategoria} onChange={e=>setGForm(p=>({...p,subcategoria:e.target.value}))}>
                    {(SUBCATEGORIAS.gestiones||[]).map(sc=><option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Estado</label>
                  <select className="inp" value={gForm.estado} onChange={e=>setGForm(p=>({...p,estado:e.target.value}))} style={{color:getEstadoCfg(gForm.estado).color}}>
                    {ESTADOS_DOC.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Fecha límite</label>
                  <input className="inp" type="date" value={gForm.fechaVencimiento} onChange={e=>setGForm(p=>({...p,fechaVencimiento:e.target.value}))} />
                </div>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>URL / Referencia</label>
                  <input className="inp" value={gForm.url} onChange={e=>setGForm(p=>({...p,url:e.target.value}))} placeholder="https://…" />
                </div>
              </div>
              <div>
                <label style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Notas</label>
                <textarea className="inp" rows={3} value={gForm.nota} onChange={e=>setGForm(p=>({...p,nota:e.target.value}))} placeholder="Instrucciones, contactos, requisitos previos…" style={{resize:"vertical"}} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setGModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={()=>{
                if(!gForm.nombre.trim()) return;
                const newG = {...gForm, id:"g"+Date.now(), fechaSubida:new Date().toISOString()};
                saveGestiones([...gestiones, newG]);
                setGModal(false);
              }} disabled={!gForm.nombre.trim()} style={{opacity:gForm.nombre.trim()?1:.5}}>
                Crear gestión
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
