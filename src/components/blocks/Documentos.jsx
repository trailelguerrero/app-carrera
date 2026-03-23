import { useState, useEffect, useCallback, useRef } from "react";
import dataService from "@/lib/dataService";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LS_KEY = "teg_documentos_v1";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB por archivo (Neon JSONB)
const ALLOWED_TYPES = ["application/pdf"];

const CATEGORIAS = [
  { id: "presupuestos",   icon: "💰", label: "Presupuestos",   color: "#34d399" },
  { id: "facturas",       icon: "🧾", label: "Facturas",       color: "#22d3ee" },
  { id: "permisos",       icon: "📋", label: "Permisos",       color: "#a78bfa" },
  { id: "seguros",        icon: "🛡️", label: "Seguros",        color: "#fbbf24" },
  { id: "protocolos",     icon: "📑", label: "Protocolos",     color: "#fb923c" },
];

const SUBCATEGORIAS = {
  permisos:   ["Ayuntamiento", "Diputación", "Medio Ambiente", "Otro"],
  seguros:    ["Accidentes", "Responsabilidad Civil", "Otro"],
  protocolos: ["Actuación Accidentes", "Actuación RC", "Evacuación", "Otro"],
  presupuestos: [],
  facturas:   [],
};

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  wrap: { padding: "1rem", fontFamily: "'Space Mono', monospace", color: "#e8eef8", maxWidth: 900, margin: "0 auto" },
  title: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "#e8eef8", marginBottom: "0.2rem" },
  subtitle: { fontSize: "0.6rem", color: "#5a6a8a", marginBottom: "1rem" },
  tabs: { display: "flex", gap: "0.3rem", flexWrap: "wrap", marginBottom: "1rem" },
  tab: (active, color) => ({
    background: active ? `${color}22` : "rgba(30,45,80,0.3)",
    color: active ? color : "#5a6a8a",
    border: `1px solid ${active ? color + "55" : "#1e2d50"}`,
    borderRadius: 8, padding: "0.4rem 0.7rem", fontSize: "0.65rem", fontWeight: 700,
    cursor: "pointer", fontFamily: "'Space Mono', monospace", transition: "all 0.15s",
  }),
  card: { background: "#111827", border: "1px solid #1e2d50", borderRadius: 10, padding: "0.8rem", marginBottom: "0.5rem" },
  btn: (color = "#22d3ee") => ({
    background: `${color}18`, color, border: `1px solid ${color}40`,
    borderRadius: 6, padding: "0.35rem 0.7rem", fontSize: "0.6rem", fontWeight: 700,
    cursor: "pointer", fontFamily: "'Space Mono', monospace",
  }),
  btnDanger: {
    background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)",
    borderRadius: 6, padding: "0.3rem 0.5rem", fontSize: "0.55rem", fontWeight: 700,
    cursor: "pointer", fontFamily: "'Space Mono', monospace",
  },
  input: {
    background: "#0d1324", border: "1px solid #1e2d50", borderRadius: 6, color: "#e8eef8",
    padding: "0.4rem 0.6rem", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace", width: "100%",
  },
  select: {
    background: "#0d1324", border: "1px solid #1e2d50", borderRadius: 6, color: "#e8eef8",
    padding: "0.4rem 0.6rem", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace",
  },
  dropzone: (dragOver) => ({
    border: `2px dashed ${dragOver ? "#22d3ee" : "#1e2d50"}`,
    borderRadius: 10, padding: "2rem 1rem", textAlign: "center",
    background: dragOver ? "rgba(34,211,238,0.06)" : "rgba(13,19,36,0.5)",
    transition: "all 0.2s", cursor: "pointer",
  }),
  badge: (color) => ({
    display: "inline-block", background: `${color}22`, color,
    border: `1px solid ${color}44`, borderRadius: 4,
    padding: "0.1rem 0.4rem", fontSize: "0.5rem", fontWeight: 700,
  }),
  empty: { textAlign: "center", padding: "2rem", color: "#3a4a6a", fontSize: "0.7rem" },
  row: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
  meta: { fontSize: "0.55rem", color: "#5a6a8a" },
  fileName: { fontSize: "0.72rem", fontWeight: 700, color: "#e8eef8", wordBreak: "break-all" },
  storageBar: { height: 4, borderRadius: 2, background: "#1e2d50", overflow: "hidden", marginTop: "0.3rem" },
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function Documentos() {
  const [docs, setDocs] = useState([]);
  const [tab, setTab] = useState("presupuestos");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [subcat, setSubcat] = useState("");
  const [nota, setNota] = useState("");
  const [editId, setEditId] = useState(null);
  const [editNota, setEditNota] = useState("");
  const [editSubcat, setEditSubcat] = useState("");
  const fileRef = useRef(null);

  // ─── LOAD / SAVE ──────────────────────────────────────────────────────────
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
      if (!ALLOWED_TYPES.includes(f.type)) {
        alert(`❌ Solo se permiten archivos PDF. "${f.name}" no es válido.`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        alert(`❌ "${f.name}" excede 10MB. Comprime el PDF antes de subir.`);
        return false;
      }
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
        size: file.size,
        tipo: file.type,
        // FUTURO NEON: reemplazar 'data' por 'url' apuntando al storage
        data: base64,
        fechaSubida: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
      });
    }

    save([...docs, ...newDocs]);
    setNota("");
    setSubcat("");
    setUploading(false);
  }, [docs, tab, subcat, nota, uploading, save]);

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const deleteDoc = (id) => {
    if (!confirm("¿Eliminar este documento?")) return;
    save(docs.filter(d => d.id !== id));
  };

  const downloadDoc = (doc) => {
    // FUTURO NEON: usar doc.url directamente en lugar de base64
    const link = document.createElement("a");
    link.href = doc.data;
    link.download = doc.nombre;
    link.click();
  };

  const viewDoc = (doc) => {
    // FUTURO NEON: abrir doc.url en nueva pestaña
    const win = window.open();
    win.document.write(`<iframe src="${doc.data}" style="width:100%;height:100%;border:none" title="${doc.nombre}"></iframe>`);
  };

  const startEdit = (doc) => {
    setEditId(doc.id);
    setEditNota(doc.nota || "");
    setEditSubcat(doc.subcategoria || "");
  };

  const saveEdit = () => {
    save(docs.map(d => d.id === editId ? {
      ...d,
      nota: editNota || null,
      subcategoria: editSubcat || null,
      fechaModificacion: new Date().toISOString(),
    } : d));
    setEditId(null);
  };

  // ─── DERIVED ──────────────────────────────────────────────────────────────
  const catDocs = docs.filter(d => d.categoria === tab);
  const catInfo = CATEGORIAS.find(c => c.id === tab);
  const subcats = SUBCATEGORIAS[tab] || [];
  const totalSize = docs.reduce((sum, d) => sum + (d.size || 0), 0);
  const maxStorage = 100 * 1024 * 1024; // 100MB — límite práctico con Neon
  const storagePct = Math.min((totalSize / maxStorage) * 100, 100);

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={S.wrap}>
      <div style={S.title}>📁 Documentos</div>
      <div style={S.subtitle}>
        Gestión documental · Presupuestos, facturas, permisos, seguros y protocolos
      </div>

      {/* Storage indicator */}
      <div style={{ ...S.card, padding: "0.5rem 0.8rem", marginBottom: "0.8rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.55rem", color: "#5a6a8a" }}>
            💾 {formatSize(totalSize)} subidos · Neon Storage
          </span>
          <span style={{ fontSize: "0.5rem", color: storagePct > 80 ? "#f87171" : "#5a6a8a" }}>
            {storagePct.toFixed(0)}%
          </span>
        </div>
        <div style={S.storageBar}>
          <div style={{
            height: "100%", borderRadius: 2, transition: "width 0.3s",
            width: `${storagePct}%`,
            background: storagePct > 80 ? "#f87171" : storagePct > 50 ? "#fbbf24" : "#34d399",
          }} />
        </div>
        <div style={{ fontSize: "0.48rem", color: "#3a4a6a", marginTop: "0.2rem" }}>
          Los documentos se guardan en la base de datos compartida (Neon PostgreSQL). Accesibles desde cualquier dispositivo.
        </div>
      </div>

      {/* Category tabs */}
      <div style={S.tabs}>
        {CATEGORIAS.map(c => (
          <button key={c.id} onClick={() => { setTab(c.id); setSubcat(""); }} style={S.tab(tab === c.id, c.color)}>
            {c.icon} {c.label}
            <span style={{ opacity: 0.6, marginLeft: 4 }}>
              ({docs.filter(d => d.categoria === c.id).length})
            </span>
          </button>
        ))}
      </div>

      {/* Upload zone */}
      <div style={S.card}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: catInfo.color, marginBottom: "0.5rem" }}>
          {catInfo.icon} Subir a {catInfo.label}
        </div>

        {/* Subcategory + note */}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
          {subcats.length > 0 && (
            <select value={subcat} onChange={e => setSubcat(e.target.value)} style={{ ...S.select, flex: "0 0 auto" }}>
              <option value="">— Subcategoría —</option>
              {subcats.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <input
            value={nota} onChange={e => setNota(e.target.value)}
            placeholder="Nota descriptiva (opcional)"
            style={{ ...S.input, flex: 1, minWidth: 150 }}
          />
        </div>

        {/* Dropzone */}
        <div
          onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
          onClick={() => fileRef.current?.click()}
          style={S.dropzone(dragOver)}
        >
          <input
            ref={fileRef} type="file" accept=".pdf" multiple
            style={{ display: "none" }}
            onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
          />
          <div style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>📄</div>
          <div style={{ fontSize: "0.7rem", color: "#5a6a8a", fontWeight: 700 }}>
            {uploading ? "Subiendo..." : "Arrastra PDF aquí o haz clic para seleccionar"}
          </div>
          <div style={{ fontSize: "0.5rem", color: "#3a4a6a", marginTop: "0.2rem" }}>
            Máximo 10MB por archivo · Solo PDF
          </div>
        </div>
      </div>

      {/* Document list */}
      <div style={{ marginTop: "0.5rem" }}>
        {catDocs.length === 0 ? (
          <div style={S.empty}>
            {catInfo.icon} No hay documentos en {catInfo.label}
          </div>
        ) : (
          catDocs
            .sort((a, b) => new Date(b.fechaSubida) - new Date(a.fechaSubida))
            .map(doc => (
              <div key={doc.id} style={S.card}>
                {editId === doc.id ? (
                  /* Edit mode */
                  <div>
                    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                      {subcats.length > 0 && (
                        <select value={editSubcat} onChange={e => setEditSubcat(e.target.value)} style={S.select}>
                          <option value="">— Subcategoría —</option>
                          {subcats.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                      <input value={editNota} onChange={e => setEditNota(e.target.value)}
                        placeholder="Nota" style={{ ...S.input, flex: 1 }} />
                    </div>
                    <div style={{ display: "flex", gap: "0.3rem" }}>
                      <button onClick={saveEdit} style={S.btn("#34d399")}>✅ Guardar</button>
                      <button onClick={() => setEditId(null)} style={S.btn("#5a6a8a")}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <div style={{ flex: 1 }}>
                        <div style={S.fileName}>📄 {doc.nombre}</div>
                        <div style={S.row}>
                          <span style={S.meta}>{formatSize(doc.size)}</span>
                          <span style={S.meta}>·</span>
                          <span style={S.meta}>{formatDate(doc.fechaSubida)}</span>
                          {doc.subcategoria && (
                            <span style={S.badge(catInfo.color)}>{doc.subcategoria}</span>
                          )}
                        </div>
                        {doc.nota && (
                          <div style={{ fontSize: "0.58rem", color: "#8a9ab8", marginTop: "0.2rem" }}>
                            💬 {doc.nota}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
                      <button onClick={() => viewDoc(doc)} style={S.btn("#22d3ee")}>👁️ Ver</button>
                      <button onClick={() => downloadDoc(doc)} style={S.btn("#34d399")}>⬇️ Descargar</button>
                      <button onClick={() => startEdit(doc)} style={S.btn("#a78bfa")}>✏️ Editar</button>
                      <button onClick={() => deleteDoc(doc.id)} style={S.btnDanger}>🗑️ Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            ))
        )}
      </div>

    </div>
  );
}
