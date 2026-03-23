import { useState, useEffect, useCallback, useRef } from "react";
import dataService from "@/lib/dataService";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LS_KEY = "teg_documentos_v1";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf"];

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

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg:       "#080c18",
  surface:  "#0f1629",
  surface2: "#151e35",
  surface3: "#1a2540",
  border:   "#1e2d50",
  text:     "#e8eef8",
  muted:    "#5a6a8a",
  dim:      "#3a4a6a",
  fontDisplay: "'Syne', sans-serif",
  fontMono:    "'Space Mono', monospace",
};

// ─── HELPER FUNTIONS ──────────────────────────────────────────────────────────
const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function Documentos() {
  const [docs, setDocs]       = useState([]);
  const [tab, setTab]         = useState("presupuestos");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [subcat, setSubcat]   = useState("");
  const [nota, setNota]       = useState("");
  const [editId, setEditId]   = useState(null);
  const [editNota, setEditNota] = useState("");
  const [editSubcat, setEditSubcat] = useState("");
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
      if (!ALLOWED_TYPES.includes(f.type)) { alert(`❌ Solo PDF. "${f.name}" no es válido.`); return false; }
      if (f.size > MAX_FILE_SIZE) { alert(`❌ "${f.name}" excede 10MB.`); return false; }
      return true;
    });
    if (!validFiles.length) return;
    setUploading(true);
    const newDocs = [];
    for (const file of validFiles) {
      const base64 = await fileToBase64(file);
      newDocs.push({
        id: genId(), nombre: file.name, categoria: tab,
        subcategoria: subcat || null, nota: nota || null,
        size: file.size, tipo: file.type, data: base64,
        fechaSubida: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
      });
    }
    save([...docs, ...newDocs]);
    setNota(""); setSubcat(""); setUploading(false);
  }, [docs, tab, subcat, nota, uploading, save]);

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleDrop      = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };
  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const deleteDoc   = (id) => { if (!confirm("¿Eliminar este documento?")) return; save(docs.filter(d => d.id !== id)); };
  const downloadDoc = (doc) => { const a = document.createElement("a"); a.href = doc.data; a.download = doc.nombre; a.click(); };
  const viewDoc     = (doc) => { const w = window.open(); w.document.write(`<iframe src="${doc.data}" style="width:100%;height:100%;border:none" title="${doc.nombre}"></iframe>`); };
  const startEdit   = (doc) => { setEditId(doc.id); setEditNota(doc.nota || ""); setEditSubcat(doc.subcategoria || ""); };
  const saveEdit    = () => {
    save(docs.map(d => d.id === editId ? { ...d, nota: editNota || null, subcategoria: editSubcat || null, fechaModificacion: new Date().toISOString() } : d));
    setEditId(null);
  };

  // ─── DERIVED ──────────────────────────────────────────────────────────────
  const catDocs    = docs.filter(d => d.categoria === tab);
  const catInfo    = CATEGORIAS.find(c => c.id === tab);
  const subcats    = SUBCATEGORIAS[tab] || [];
  const totalSize  = docs.reduce((s, d) => s + (d.size || 0), 0);
  const maxStorage = 100 * 1024 * 1024;
  const storagePct = Math.min((totalSize / maxStorage) * 100, 100);
  const storageColor = storagePct > 80 ? "#f87171" : storagePct > 50 ? "#fbbf24" : "#34d399";

  // ─── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    .doc-wrap         { padding: 1.25rem; max-width: 960px; margin: 0 auto; color: ${T.text}; font-family: ${T.fontDisplay}; }
    .doc-header       { margin-bottom: 1.5rem; }
    .doc-title        { font-size: 1.35rem; font-weight: 800; display: flex; align-items: center; gap: 10px; }
    .doc-title-icon   { font-size: 1.6rem; }
    .doc-subtitle     { font-size: 0.68rem; color: ${T.muted}; margin-top: 4px; font-family: ${T.fontMono}; }
    .doc-kpi-row      { display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap; }
    .doc-kpi          { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 10px; padding: 0.6rem 1rem; display: flex; flex-direction: column; gap: 2px; min-width: 90px; }
    .doc-kpi-value    { font-size: 1.1rem; font-weight: 800; font-family: ${T.fontMono}; }
    .doc-kpi-label    { font-size: 0.58rem; color: ${T.muted}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }

    .doc-storage      { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 12px; padding: 0.9rem 1.1rem; margin-bottom: 1.25rem; }
    .doc-storage-row  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .doc-storage-lbl  { font-size: 0.65rem; color: ${T.muted}; display: flex; align-items: center; gap: 6px; }
    .doc-storage-pct  { font-size: 0.65rem; font-weight: 700; font-family: ${T.fontMono}; }
    .doc-storage-bar  { height: 6px; background: ${T.border}; border-radius: 3px; overflow: hidden; }
    .doc-storage-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
    .doc-storage-hint { font-size: 0.55rem; color: ${T.dim}; margin-top: 0.35rem; }

    .doc-tabs         { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
    .doc-tab          { display: inline-flex; align-items: center; gap: 6px; padding: 0.45rem 0.9rem; border-radius: 30px; font-size: 0.7rem; font-weight: 700; cursor: pointer; transition: all 0.18s; border: 1.5px solid transparent; white-space: nowrap; font-family: ${T.fontDisplay}; }
    .doc-tab .doc-tab-count { font-size: 0.58rem; background: rgba(255,255,255,0.08); border-radius: 10px; padding: 0.05rem 0.4rem; font-family: ${T.fontMono}; }

    .doc-upload       { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 14px; padding: 1.25rem; margin-bottom: 1.25rem; }
    .doc-upload-title { font-size: 0.78rem; font-weight: 800; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 7px; }
    .doc-upload-fields{ display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .doc-select       { background: ${T.surface2}; border: 1px solid ${T.border}; border-radius: 8px; color: ${T.text}; padding: 0.45rem 0.6rem; font-size: 0.7rem; font-family: ${T.fontDisplay}; }
    .doc-input        { background: ${T.surface2}; border: 1px solid ${T.border}; border-radius: 8px; color: ${T.text}; padding: 0.45rem 0.6rem; font-size: 0.7rem; font-family: ${T.fontDisplay}; flex: 1; min-width: 140px; }
    .doc-input::placeholder, .doc-select option { color: ${T.muted}; }
    .doc-input:focus, .doc-select:focus { outline: none; border-color: #22d3ee; }
    .doc-dropzone     { border: 2px dashed ${T.border}; border-radius: 12px; padding: 2.2rem 1.5rem; text-align: center; background: rgba(13,19,36,0.6); cursor: pointer; transition: all 0.2s; }
    .doc-dropzone.over{ border-color: #22d3ee; background: rgba(34,211,238,0.06); box-shadow: 0 0 24px rgba(34,211,238,0.12); }
    .doc-dropzone-icon{ font-size: 2.5rem; margin-bottom: 0.5rem; filter: drop-shadow(0 0 8px rgba(34,211,238,0.4)); }
    .doc-dropzone-msg { font-size: 0.78rem; color: ${T.muted}; font-weight: 700; }
    .doc-dropzone-hint{ font-size: 0.58rem; color: ${T.dim}; margin-top: 6px; }

    .doc-list         { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.9rem; }
    .doc-card         { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; transition: transform 0.15s, box-shadow 0.15s; position: relative; overflow: hidden; }
    .doc-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 12px 12px 0 0; }
    .doc-card:hover   { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
    .doc-card-icon    { font-size: 2rem; }
    .doc-card-name    { font-size: 0.78rem; font-weight: 800; color: ${T.text}; word-break: break-word; line-height: 1.3; }
    .doc-card-meta    { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .doc-card-meta-item{ font-size: 0.58rem; color: ${T.muted}; font-family: ${T.fontMono}; }
    .doc-badge        { display: inline-block; padding: 0.1rem 0.4rem; border-radius: 20px; font-size: 0.55rem; font-weight: 700; font-family: ${T.fontMono}; }
    .doc-card-note    { font-size: 0.62rem; color: #8a9ab8; background: rgba(255,255,255,0.03); border-radius: 6px; padding: 0.35rem 0.5rem; border-left: 2px solid ${T.border}; }
    .doc-card-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; }
    .doc-btn          { padding: 0.3rem 0.6rem; border-radius: 7px; font-size: 0.62rem; font-weight: 700; cursor: pointer; border: 1px solid; font-family: ${T.fontDisplay}; transition: all 0.15s; white-space: nowrap; }
    .doc-btn-view     { background: rgba(34,211,238,0.1); color: #22d3ee; border-color: rgba(34,211,238,0.3); }
    .doc-btn-view:hover{ background: rgba(34,211,238,0.22); }
    .doc-btn-dl       { background: rgba(52,211,153,0.1); color: #34d399; border-color: rgba(52,211,153,0.3); }
    .doc-btn-dl:hover { background: rgba(52,211,153,0.22); }
    .doc-btn-edit     { background: rgba(167,139,250,0.1); color: #a78bfa; border-color: rgba(167,139,250,0.3); }
    .doc-btn-edit:hover{ background: rgba(167,139,250,0.22); }
    .doc-btn-del      { background: rgba(248,113,113,0.1); color: #f87171; border-color: rgba(248,113,113,0.25); margin-left: auto; }
    .doc-btn-del:hover{ background: rgba(248,113,113,0.22); }
    .doc-btn-save     { background: rgba(52,211,153,0.12); color: #34d399; border-color: rgba(52,211,153,0.35); }
    .doc-btn-save:hover{ background: rgba(52,211,153,0.22); }
    .doc-btn-cancel   { background: rgba(90,106,138,0.12); color: ${T.muted}; border-color: rgba(90,106,138,0.3); }

    .doc-empty        { text-align: center; padding: 3rem 1.5rem; color: ${T.dim}; }
    .doc-empty-icon   { font-size: 3rem; opacity: 0.4; margin-bottom: 0.75rem; }
    .doc-empty-text   { font-size: 0.75rem; color: ${T.muted}; }

    .doc-edit-card    { display: flex; flex-direction: column; gap: 8px; }
  `;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="doc-wrap">
      <style>{css}</style>

      {/* ── Header ── */}
      <div className="doc-header">
        <div className="doc-title">
          <span className="doc-title-icon">📁</span>
          Documentos
        </div>
        <div className="doc-subtitle">Gestión documental centralizada · Neon PostgreSQL</div>

        {/* KPI row: count per category */}
        <div className="doc-kpi-row">
          {CATEGORIAS.map(c => {
            const cnt = docs.filter(d => d.categoria === c.id).length;
            return (
              <div key={c.id} className="doc-kpi" style={{ borderTop: `2px solid ${c.color}` }}>
                <div className="doc-kpi-value" style={{ color: c.color }}>{cnt}</div>
                <div className="doc-kpi-label">{c.icon} {c.label}</div>
              </div>
            );
          })}
          <div className="doc-kpi" style={{ borderTop: "2px solid #5a6a8a" }}>
            <div className="doc-kpi-value" style={{ color: T.text }}>{docs.length}</div>
            <div className="doc-kpi-label">📦 Total</div>
          </div>
        </div>
      </div>

      {/* ── Storage bar ── */}
      <div className="doc-storage">
        <div className="doc-storage-row">
          <span className="doc-storage-lbl">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: storageColor, display: "inline-block", boxShadow: `0 0 6px ${storageColor}80` }} />
            {formatSize(totalSize)} utilizados · Neon Storage
          </span>
          <span className="doc-storage-pct" style={{ color: storageColor }}>{storagePct.toFixed(0)}% de 100 MB</span>
        </div>
        <div className="doc-storage-bar">
          <div className="doc-storage-fill" style={{ width: `${storagePct}%`, background: `linear-gradient(90deg, ${storageColor}99, ${storageColor})` }} />
        </div>
        <div className="doc-storage-hint">Los documentos se guardan en la base de datos compartida. Accesibles desde cualquier dispositivo.</div>
      </div>

      {/* ── Category tabs ── */}
      <div className="doc-tabs">
        {CATEGORIAS.map(c => {
          const active = tab === c.id;
          const cnt = docs.filter(d => d.categoria === c.id).length;
          return (
            <button
              key={c.id}
              className="doc-tab"
              onClick={() => { setTab(c.id); setSubcat(""); }}
              style={{
                background: active ? `${c.color}18` : "rgba(255,255,255,0.03)",
                color: active ? c.color : T.muted,
                borderColor: active ? `${c.color}55` : T.border,
                boxShadow: active ? `0 0 12px ${c.color}30` : "none",
              }}
            >
              {c.icon} {c.label}
              <span className="doc-tab-count">{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* ── Upload zone ── */}
      <div className="doc-upload">
        <div className="doc-upload-title" style={{ color: catInfo.color }}>
          {catInfo.icon} Subir documentos a {catInfo.label}
        </div>

        <div className="doc-upload-fields">
          {subcats.length > 0 && (
            <select value={subcat} onChange={e => setSubcat(e.target.value)} className="doc-select">
              <option value="">— Subcategoría —</option>
              {subcats.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <input
            value={nota} onChange={e => setNota(e.target.value)}
            placeholder="Nota descriptiva (opcional)"
            className="doc-input"
          />
        </div>

        <div
          className={`doc-dropzone${dragOver ? " over" : ""}`}
          onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: "none" }}
            onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
          <div className="doc-dropzone-icon">📄</div>
          <div className="doc-dropzone-msg">
            {uploading ? "⏳ Subiendo documentos..." : "Arrastra PDFs aquí o haz clic para seleccionar"}
          </div>
          <div className="doc-dropzone-hint">Solo archivos PDF · Máximo 10 MB por archivo</div>
        </div>
      </div>

      {/* ── Document list ── */}
      {catDocs.length === 0 ? (
        <div className="doc-empty">
          <div className="doc-empty-icon">{catInfo.icon}</div>
          <div className="doc-empty-text">No hay documentos en <strong>{catInfo.label}</strong></div>
        </div>
      ) : (
        <div className="doc-list">
          {catDocs
            .sort((a, b) => new Date(b.fechaSubida) - new Date(a.fechaSubida))
            .map(doc => (
              <div key={doc.id} className="doc-card" style={{ "--card-accent": catInfo.color }}>
                {/* Top accent line */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: catInfo.color, borderRadius: "12px 12px 0 0" }} />

                {editId === doc.id ? (
                  // ── Edit mode ──
                  <div className="doc-edit-card">
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: catInfo.color }}>✏️ Editando</div>
                    {subcats.length > 0 && (
                      <select value={editSubcat} onChange={e => setEditSubcat(e.target.value)} className="doc-select" style={{ width: "100%" }}>
                        <option value="">— Subcategoría —</option>
                        {subcats.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                    <input value={editNota} onChange={e => setEditNota(e.target.value)}
                      placeholder="Nota descriptiva" className="doc-input" style={{ width: "100%", boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={saveEdit} className="doc-btn doc-btn-save">✅ Guardar</button>
                      <button onClick={() => setEditId(null)} className="doc-btn doc-btn-cancel">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  // ── View mode ──
                  <>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingTop: 4 }}>
                      <span className="doc-card-icon">📄</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="doc-card-name">{doc.nombre}</div>
                      </div>
                    </div>

                    <div className="doc-card-meta">
                      <span className="doc-card-meta-item">{formatSize(doc.size)}</span>
                      <span className="doc-card-meta-item" style={{ color: T.dim }}>·</span>
                      <span className="doc-card-meta-item">{formatDate(doc.fechaSubida)}</span>
                      {doc.subcategoria && (
                        <span className="doc-badge" style={{
                          background: `${catInfo.color}18`, color: catInfo.color, border: `1px solid ${catInfo.color}44`,
                        }}>{doc.subcategoria}</span>
                      )}
                    </div>

                    {doc.nota && (
                      <div className="doc-card-note">💬 {doc.nota}</div>
                    )}

                    <div className="doc-card-actions">
                      <button onClick={() => viewDoc(doc)} className="doc-btn doc-btn-view">👁 Ver</button>
                      <button onClick={() => downloadDoc(doc)} className="doc-btn doc-btn-dl">⬇ Guardar</button>
                      <button onClick={() => startEdit(doc)} className="doc-btn doc-btn-edit">✏️ Editar</button>
                      <button onClick={() => deleteDoc(doc.id)} className="doc-btn doc-btn-del">🗑</button>
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
