import { createPortal } from "react-dom";
import { useState, useMemo, useEffect, useRef } from "react";
import { useModalClose } from "@/hooks/useModalClose";
import { exportarPatrocinadores } from "@/lib/exportUtils";
import { toast } from "@/lib/toast";
import { genIdNum, fmtEur, scrollMainToTop } from "@/lib/utils";
import { getImporteCobrado, detectarIncoherencias, calcularTotalEspecie } from "@/lib/budgetUtils";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/hooks/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { useData } from "@/hooks/useData";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { blockCls as cls } from "@/lib/blockStyles";
import SkeletonBlock from "@/components/common/SkeletonBlock";
import ModalDetalle from "./patrocinadores/ModalDetalle";
import DocManager from "./patrocinadores/DocManager";
import LogContactos from "./patrocinadores/LogContactos";
import TabDocumentos from "./patrocinadores/TabDocumentos";
import TabDashboard from "./patrocinadores/TabDashboard";
import TabPatrocinadores from "./patrocinadores/TabPatrocinadores";
import TabPipeline from "./patrocinadores/TabPipeline";
import dataService from "@/lib/dataService";
import TabContraprestaciones from "./patrocinadores/TabContraprestaciones";
import { LS, NIVELES, PLANTILLAS_CONTRAPRESTACION, NIVEL_CFG, getCfg, ESTADOS, ESTADO_CFG, CONTRAPRESTACIONES_TIPO, TIPOS_DOC, SECTORES, PAT0 } from "./patrocinadores/constants";
// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [eventCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [tab, setTab] = useState("dashboard");
  const [rawPats, setPats, isLoading] = useData(LS + "_pats", PAT0);
  const [objetivo, setObjetivo] = useData(LS + "_obj", 8000);
  // useMemo ensures pats is a stable reference — avoids exhaustive-deps re-computation on every render
  const pats = useMemo(() => (Array.isArray(rawPats) ? rawPats : []), [rawPats]);
  const [saved, setSaved] = useState(false);
  const [modal, setModal] = useState(null);
  const [delId, setDelId] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [showSidebar, setShowSidebar] = useState(false);
  const [ordenPats, setOrdenPats] = useState(false);  // A-Z patrocinadores
  const [ordenCont, setOrdenCont] = useState(false);  // A-Z compromisos

  // useData handles saving automatically.

  // ── Stats globales ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const valid = pats.filter(p => p && p.id);
    const activos = valid.filter(p => p.estado !== "cancelado");
    const confirmados = valid.filter(p => p.estado === "confirmado" || p.estado === "cobrado");
    const cobrado = valid.filter(p => p.estado === "cobrado").reduce((s, p) => s + getImporteCobrado(p), 0);
    // Captado: suma importes de confirmados+cobrados (comprometido)
    const comprometido = confirmados.reduce((s, p) => s + (p.importe || 0), 0);
    // Pendiente de cobro: comprometido - cobrado
    const pendienteCobro = comprometido - cobrado;
    const especie = activos.reduce((s, p) => s + (p.especie || 0), 0);
    const pipeline = valid.filter(p => p.estado === "negociando" || p.estado === "prospecto").reduce((s, p) => s + (p.importe || 0), 0);
    const pctObj = objetivo > 0 ? Math.min(Math.round(comprometido / objetivo * 100), 100) : 0;
    const pctCobrado = objetivo > 0 ? Math.min(Math.round(cobrado / objetivo * 100), 100) : 0;
    const contPend = activos.reduce((s, p) => s + (p.contraprestaciones || []).filter(c => c && c.estado === "pendiente").length, 0);
    return { activos: activos.length, confirmados: confirmados.length, cobrado, comprometido, pendienteCobro, especie, pipeline, pctObj, pctCobrado, contPend };
  }, [pats, objetivo]);

  const patsFiltrados = useMemo(() => {
    return pats.filter(pat => {
      const query = search.toLowerCase();
      const matchQ = !query || pat.nombre.toLowerCase().includes(query) || pat.contacto.toLowerCase().includes(query) || pat.sector.toLowerCase().includes(query);
      const matchN = filtroNivel === "todos" || pat.nivel === filtroNivel;
      const matchE = filtroEstado === "todos" || pat.estado === filtroEstado;
      return matchQ && matchN && matchE;
    });
  }, [pats, search, filtroNivel, filtroEstado]);

  const TABS = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "patrocinadores", icon: "🤝", label: "Patrocinadores" },
    { id: "pipeline", icon: "🔀", label: "Pipeline" },
    { id: "contraprestaciones", icon: "🎁", label: "Compromisos" },
    { id: "documentos", icon: "📁", label: "Documentos" },
  ];

  const scrollTop = () => { scrollMainToTop(); };
  const openNuevo   = () => { scrollTop(); setModal({ tipo: "pat",     data: null }); };
  const openEditar  = (p) => { scrollTop(); setModal({ tipo: "pat",    data: p    }); };
  const openDetalle = (p) => { scrollTop(); setModal({ tipo: "detalle",data: p    }); };

  const importarProspectos = async (file) => {
    const text = await file.text();
    const lines = text.split("\n").map(l => l.endsWith("\r") ? l.slice(0,-1) : l).filter(Boolean);
    if (lines.length < 2) { toast.error("CSV vacío o sin datos"); return; }
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => { let s = h.trim().toLowerCase(); while(s.startsWith("'") || s.startsWith('"')) s=s.slice(1); while(s.endsWith("'") || s.endsWith('"')) s=s.slice(0,-1); return s; });
    const idx = (names) => names.map(n => headers.findIndex(h => h.includes(n))).find(i => i >= 0) ?? -1;
    const iNombre = idx(["nombre","empresa","company","name"]);
    const iContacto = idx(["contacto","contact","persona","interlocutor"]);
    const iEmail = idx(["email","correo","mail"]);
    const iTel = idx(["telefono","phone","tel","movil"]);
    const iImporte = idx(["importe","amount","presupuesto"]);
    const iSector = idx(["sector","industria","industry"]);
    if (iNombre === -1) { toast.error("El CSV necesita columna 'nombre' o 'empresa'"); return; }
    let added = 0, dupes = 0;
    const nuevos = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => { let s = c.trim(); while(s.startsWith("'") || s.startsWith('"')) s=s.slice(1); while(s.endsWith("'") || s.endsWith('"')) s=s.slice(0,-1); return s; });
      const nombre = cols[iNombre] || "";
      if (!nombre) continue;
      const email = iEmail >= 0 ? cols[iEmail] || "" : "";
      const dup = pats.find(p => (p.email && p.email === email) || p.nombre.toLowerCase() === nombre.toLowerCase()) ||
                  nuevos.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
      if (dup) { dupes++; continue; }
      nuevos.push({
        id: Date.now() + i, nombre,
        contacto: iContacto >= 0 ? cols[iContacto] || "" : "",
        email, telefono: iTel >= 0 ? cols[iTel] || "" : "",
        importe: iImporte >= 0 ? parseFloat(cols[iImporte]) || 0 : 0,
        importeCobrado: 0, especie: 0,
        sector: iSector >= 0 ? cols[iSector] || SECTORES[0] : SECTORES[0],
        nivel: "Colaborador", tipoAportacion: "monetaria", estado: "prospecto",
        fechaAcuerdo: "", fechaVencimiento: "", proximoContacto: "", notas: "Importado desde CSV",
        docs: [], contraprestaciones: [], especieItems: [], historial: [],
        proximaAccion: { tipo: "", fecha: "", notas: "" },
      });
      added++;
    }
    if (nuevos.length > 0) setPats(prev => [...prev, ...nuevos]);
    toast.success(`${added} prospectos importados${dupes > 0 ? ` · ${dupes} duplicados omitidos` : ""}`);
  };

  const savePat = (pat) => {
    if (pat.id) {
      // Para edición: el modal ya trae las contraprestaciones actualizadas en form.contraprestaciones
      // Solo preservar docs y especieItems que el modal no maneja
      setPats(prev => prev.map(p => p.id === pat.id
        ? { ...pat, docs: p.docs || [], especieItems: p.especieItems || [] }
        : p
      ));
    } else {
      setPats(prev => [...prev, { ...pat, id: genIdNum(pats), docs: [], especieItems: [] }]);
    }
    setModal(null);
    toast.success(pat.id ? "Patrocinador actualizado" : "Patrocinador creado");
  };

  const deletePat = () => {
    setPats(prev => prev.filter(p => p.id !== delId));
    setDelId(null);
    toast.success("Patrocinador eliminado");
    dataService.notify(); // Sincronizar con Presupuesto tras eliminación
  };

  const updateEstado = (id, estado) => {
    setPats(prev => prev.map(p => {
      if (p.id !== id) return p;
      // Registrar en historial automáticamente
      const entrada = {
        id: String(Date.now()),
        fecha: new Date().toISOString(),
        tipo: "estado",
        texto: `Estado: ${p.estado} → ${estado}`,
        antes: p.estado,
        despues: estado,
      };
      const historial = [...(Array.isArray(p.historial) ? p.historial : []), entrada].slice(-50);
      return { ...p, estado, historial };
    }));
    if (estado === "cobrado") toast.success("Patrocinador marcado como cobrado ✓");
  };

  const addDoc = (patId, doc) => {
    setPats(prev => prev.map(p => p.id === patId ? { ...p, docs: [...(p.docs||[]), { ...doc, id: genIdNum(p.docs||[]) }] } : p));
  };
  const deleteDoc = (patId, docId) => {
    setPats(prev => prev.map(p => p.id === patId ? { ...p, docs: (p.docs||[]).filter(d => d.id !== docId) } : p));
  };

  const updateContraprestacion = (patId, cId, campo, valor) => {
    setPats(prev => prev.map(p => p.id === patId ? {
      ...p,
      contraprestaciones: (p.contraprestaciones || []).map(c => c.id === cId ? { ...c, ...(typeof campo === "object" ? campo : { [campo]: valor }) } : c)
    } : p));
  };

  const addContraprestacion = (patId, item) => {
    setPats(prev => prev.map(p => p.id === patId ? {
      ...p,
      contraprestaciones: [...(p.contraprestaciones || []), { ...item, id: genIdNum(p.contraprestaciones || []) }]
    } : p));
  };

  const deleteContraprestacion = (patId, cId) => {
    setPats(prev => prev.map(p => p.id === patId ? {
      ...p,
      contraprestaciones: (p.contraprestaciones || []).filter(c => c.id !== cId)
    } : p));
  };

  // ── Gestión ítems en especie ─────────────────────────────────────────────────
  const addEspecieItem = (patId, item) => {
    setPats(prev => prev.map(p => p.id === patId ? {
      ...p,
      especieItems: [...(p.especieItems || []), { ...item, id: genIdNum(p.especieItems || []) }]
    } : p));
  };
  const updateEspecieItem = (patId, itemId, campo, valor) => {
    setPats(prev => prev.map(p => p.id === patId ? {
      ...p,
      especieItems: (p.especieItems || []).map(i => i.id === itemId ? { ...i, ...(typeof campo === "object" ? campo : { [campo]: valor }) } : i)
    } : p));
  };
  const deleteEspecieItem = (patId, itemId) => {
    setPats(prev => prev.map(p => p.id === patId ? {
      ...p,
      especieItems: (p.especieItems || []).filter(i => i.id !== itemId)
    } : p));
  };

  if (isLoading) return <SkeletonBlock variant="patrocinadores" />;

  return (
    <>

      <div className="block-container">

        {/* HEADER */}
        <div className="block-header">
          <div>
            <div style={{display:"flex",alignItems:"center",gap:".65rem",flexWrap:"wrap",marginBottom:".15rem"}}>
              <h1 className="block-title" style={{margin:0}}>🤝 Patrocinadores</h1>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"proyecto"}}))}
                style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".15rem .45rem",
                  borderRadius:4,border:"1px solid rgba(52,211,153,.3)",
                  background:"rgba(52,211,153,.1)",color:"var(--green)",cursor:"pointer"}}>
                📋 Ver en Proyecto →
              </button>
            </div>
            <div className="block-title-sub">{config.nombre} {config.edicion} · Gestión Comercial</div>
          </div>
          <div className="block-actions">
            {stats.contPend > 0 && <span className="badge badge-amber">🎁 {stats.contPend} compromisos</span>}
            <span className="badge badge-amber">{fmtEur(stats.comprometido)} / {fmtEur(objetivo)}</span>
            <span className={`badge ${stats.pctObj>=80?"badge-green":stats.pctObj>=50?"badge-amber":"badge-red"}`}>{stats.pctObj}%</span>
            <button className="btn btn-ghost btn-sm"
              onClick={() => exportarPatrocinadores(pats)}
              title="Exportar patrocinadores a Excel">
              📊 Excel
            </button>
            <label className="btn btn-ghost" title="Importar prospectos desde CSV (columnas: nombre, contacto, email, telefono, importe, sector)"
              style={{ cursor:"pointer", margin:0 }}>
              📥 CSV
              <input type="file" accept=".csv,.txt" style={{ display:"none" }}
                onChange={e => { if (e.target.files[0]) { importarProspectos(e.target.files[0]); e.target.value=""; } }} />
            </label>
            <button className="btn btn-primary" onClick={openNuevo}>+ Nuevo</button>
          </div>
        </div>



        {/* TABS */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={cls("tab-btn", tab===t.id && "active")} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
              {t.id==="contraprestaciones" && stats.contPend>0 && <span className="badge badge-amber" style={{marginLeft:"0.3rem"}}>{stats.contPend}</span>}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div key={tab}>
          {tab==="dashboard" && <TabDashboard stats={stats} pats={pats} objetivo={objetivo} setObjetivo={setObjetivo} setTab={setTab} openNuevo={openNuevo} openDetalle={openDetalle}  config={config} />}
          {tab==="patrocinadores" && (
            <TabPatrocinadores
              pats={patsFiltrados} todosLen={pats.length}
              search={search} setSearch={setSearch}
              filtroNivel={filtroNivel} setFiltroNivel={setFiltroNivel}
              filtroEstado={filtroEstado} setFiltroEstado={setFiltroEstado}
              onEditar={openEditar} onDetalle={openDetalle}
              onDelete={(id) => setDelId(id)} onNuevo={openNuevo}
              updateEstado={updateEstado}
              ordenAlfa={ordenPats} setOrdenAlfa={setOrdenPats}
              onAddContra={openDetalle}
            />
          )}
          {tab==="pipeline" && <TabPipeline pats={pats} onEditar={openEditar} onDetalle={openDetalle} updateEstado={updateEstado} ordenAlfa={ordenPats} onNuevo={openNuevo} />}
          {tab==="contraprestaciones" && (
            <TabContraprestaciones pats={pats} updateContraprestacion={updateContraprestacion} addContraprestacion={addContraprestacion} deleteContraprestacion={deleteContraprestacion} onDetalle={openDetalle} ordenAlfa={ordenCont} setOrdenAlfa={setOrdenCont} />
          )}
          {tab==="documentos" && <TabDocumentos pats={pats} addDoc={addDoc} deleteDoc={deleteDoc} />}
        </div>
      </div>

      {/* DATALIST GLOBAL */}
      <datalist id="cont-options">
        {CONTRAPRESTACIONES_TIPO.map(t => <option key={t} value={t} />)}
      </datalist>

      {/* MODALES */}
      {modal?.tipo==="pat" && createPortal(<ModalPat key={modal.data?.id||"nuevo"} data={modal.data} onSave={savePat} onClose={() => setModal(null)} />, document.body)}
      {modal?.tipo==="detalle" && createPortal(
        <ModalDetalle key={modal.data.id} pat={pats.find(p=>p.id===modal.data.id)||modal.data}
          onClose={() => setModal(null)}
          onEditar={() => setModal({tipo:"pat",data:pats.find(p=>p.id===modal.data.id)||modal.data})}
          onDelete={(id) => { setModal(null); setDelId(id); }}
          updateContraprestacion={updateContraprestacion} addContraprestacion={addContraprestacion}
          deleteContraprestacion={deleteContraprestacion} updateEstado={updateEstado}
          addDoc={addDoc} deleteDoc={deleteDoc}
          addEspecieItem={addEspecieItem} updateEspecieItem={updateEspecieItem} deleteEspecieItem={deleteEspecieItem}
          config={config}
        />
      , document.body)}
      {delId && createPortal(
        <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && setDelId(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:340,textAlign:"center"}}>
            <div className="modal-body" style={{paddingTop:"1.5rem"}}>
              <div style={{fontSize:"var(--fs-xl)",marginBottom:".6rem"}}>⚠️</div>
              <div style={{fontWeight:700,marginBottom:".4rem"}}>¿Eliminar patrocinador?</div>
              <div className="muted mono xs">Se eliminarán también todas sus contraprestaciones.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDelId(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={deletePat}>Eliminar</button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}

// ─── TAB DASHBOARD ────────────────────────────────────────────────────────────
function ModalPat({
 data, onSave, onClose }) {
  const { closing: mpClosing, handleClose: mpHandleClose } = useModalClose(onClose);
  const firstInputRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => firstInputRef.current?.focus(), 60); return () => clearTimeout(t); }, []);
  const [form, setForm] = useState(data ? { ...data } : {
    nombre: "", sector: SECTORES[0], nivel: "Plata", tipoAportacion: "monetaria",
    contacto: "", telefono: "", email: "",
    importe: 0, importeCobrado: 0, especie: 0, estado: "prospecto",
    fechaAcuerdo: "", fechaVencimiento: "", proximoContacto: "", notas: "", docs: [],
    contraprestaciones: [], proximaAccion: { tipo: "", fecha: "", notas: "" },
  });
  const [err, setErr] = useState({});
  const upd = (k, v) => {
    const val = (k === "importe" || k === "especie" || k === "importeCobrado") ? Number(v) : v;
    setForm(p => ({ ...p, [k]: val }));
  };
  const validar = () => {
    const e = {};
    if (!form.nombre.trim())
      e.nombre = "El nombre de la empresa es obligatorio";
    if (!form.contacto.trim() && (form.estado === "confirmado" || form.estado === "cobrado"))
      e.contacto = "Añade un contacto para patrocinadores confirmados";
    if (form.importe < 0)
      e.importe = "El importe no puede ser negativo";
    if (form.importeCobrado > form.importe && form.importe > 0)
      e.importeCobrado = "Lo cobrado no puede superar el importe acordado";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Formato de email inválido";
    setErr(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className={`modal-backdrop${mpClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target === e.currentTarget && mpHandleClose()}>
      <div className={`modal modal-ficha${mpClosing ? " modal-closing" : ""}`}>
        <div className="modal-header">
          <span className="mtit">{data ? "✏️ Editar patrocinador" : "🤝 Nuevo patrocinador"}</span>
          <button className="btn btn-sm btn-ghost" onClick={mpHandleClose}><span aria-hidden="true">✕</span></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="fl" style={{ color: err.nombre ? "#f87171" : undefined }}>Nombre / Empresa *</label>
            <input ref={firstInputRef} className="inp" value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Decathlon Ávila" />
            {err.nombre && <div className="xs mono" style={{ color: "#f87171", marginTop: ".2rem" }}>⚠ {err.nombre}</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
            <div>
              <label className="fl">Nivel</label>
              <select className="inp" value={form.nivel} onChange={e => upd("nivel", e.target.value)}>
                {NIVELES.map(n => <option key={n} value={n}>{NIVEL_CFG[n].icon} {n}</option>)}
              </select>
            </div>
            <div>
              <label className="fl">Sector</label>
              <select className="inp" value={form.sector} onChange={e => upd("sector", e.target.value)}>
                {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
            <div>
              <label className="fl" style={{ color: err.contacto ? "var(--red)" : undefined }}>
                Persona de contacto
              </label>
              <input className="inp" value={form.contacto} onChange={e => upd("contacto", e.target.value)} placeholder="Nombre y apellidos"
                style={{ borderColor: err.contacto ? "var(--red)" : undefined }} />
              {err.contacto && <div className="xs mono" style={{ color:"var(--red)", marginTop:".2rem" }}>⚠ {err.contacto}</div>}
            </div>
            <div>
              <label className="fl">Teléfono</label>
              <input className="inp" value={form.telefono} onChange={e => upd("telefono", e.target.value)} placeholder="612 345 678" />
            </div>
          </div>

          <div>
            <label className="fl" style={{ color: err.email ? "var(--red)" : undefined }}>Email</label>
            <input className="inp" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="contacto@empresa.com"
              style={{ borderColor: err.email ? "var(--red)" : undefined }} />
            {err.email && <div className="xs mono" style={{ color:"var(--red)", marginTop:".2rem" }}>⚠ {err.email}</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".75rem" }}>
            <div>
              <label className="fl" style={{ color: err.importe ? "var(--red)" : undefined }}>Importe (€)</label>
              <input className="inp" type="number" min="0" value={form.importe}
                onChange={e => upd("importe", parseFloat(e.target.value) || 0)}
                style={{ borderColor: err.importe ? "var(--red)" : undefined }} />
              {err.importe && <div className="xs mono" style={{ color:"var(--red)", marginTop:".2rem" }}>⚠ {err.importe}</div>}
            </div>
            <div>
              <label className="fl" style={{ color: err.importeCobrado ? "var(--red)" : undefined }}>Cobrado (€)</label>
              <input className="inp" type="number" min="0" value={form.importeCobrado}
                onChange={e => upd("importeCobrado", parseFloat(e.target.value) || 0)}
                style={{ borderColor: err.importeCobrado ? "var(--red)" : undefined }} />
              {err.importeCobrado && <div className="xs mono" style={{ color:"var(--red)", marginTop:".2rem" }}>⚠ {err.importeCobrado}</div>}
            </div>
            <div>
              <label className="fl">
                Especie (€ valor)
                <span title="Patrocinio en productos o servicios en lugar de dinero. Ej: material deportivo, servicios de fisioterapia, alimentación para avituallamiento. Indica el valor económico estimado."
                  style={{ marginLeft: ".35rem", cursor: "help", opacity: .6, fontSize: "var(--fs-sm)" }}>ⓘ</span>
              </label>
              <input className="inp" type="number" value={form.especie} onChange={e => upd("especie", parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Sección de productos en especie dentro del modal de creación/edición */}
          {(form.nivel === "Especie" || form.especie > 0) && (
            <div style={{ background: "var(--surface2)", borderRadius: 8, padding: ".85rem", marginTop: ".25rem", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: "var(--fs-base)", marginBottom: ".5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📦 Detalle de productos/servicios</span>
                <button className="btn btn-sm btn-ghost" style={{ fontSize: "var(--fs-xs)", padding: ".2rem .4rem" }}
                  onClick={() => {
                    const newItem = { id: Date.now(), nombre: "", cantidad: 1, unidad: "ud", recibido: false };
                    setForm(p => ({ ...p, especieItems: [...(p.especieItems || []), newItem] }));
                  }}>+ Añadir ítem</button>
              </div>
              {(form.especieItems || []).length === 0 && (
                <div style={{ textAlign: "center", padding: ".5rem", fontSize: "var(--fs-sm)", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                  Sin ítems detallados aún.
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                {(form.especieItems || []).map((item, idx) => (
                  <div key={item.id} style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                    <input className="inp" style={{ flex: 2, fontSize: "var(--fs-sm)" }} placeholder="Nombre producto" value={item.nombre}
                      onChange={e => {
                        const newItems = [...form.especieItems];
                        newItems[idx].nombre = e.target.value;
                        setForm(p => ({ ...p, especieItems: newItems }));
                      }} />
                    <input className="inp" style={{ flex: 0.8, fontSize: "var(--fs-sm)" }} type="number" placeholder="Cant." value={item.cantidad}
                      onChange={e => {
                        const newItems = [...form.especieItems];
                        newItems[idx].cantidad = Number(e.target.value);
                        setForm(p => ({ ...p, especieItems: newItems }));
                      }} />
                    <input className="inp" style={{ flex: 1, fontSize: "var(--fs-sm)" }} placeholder="ud" value={item.unidad}
                      onChange={e => {
                        const newItems = [...form.especieItems];
                        newItems[idx].unidad = e.target.value;
                        setForm(p => ({ ...p, especieItems: newItems }));
                      }} />
                    <button className="btn btn-sm btn-red" style={{ padding: ".2rem .4rem" }}
                      onClick={() => {
                        setForm(p => ({ ...p, especieItems: p.especieItems.filter((_, i) => i !== idx) }));
                      }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
            <div>
              <label className="fl">Estado</label>
              <select className="inp" value={form.estado} onChange={e => upd("estado", e.target.value)}
                style={{ color: ESTADO_CFG[form.estado].color }}>
                {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_CFG[e].label}</option>)}
              </select>
            </div>
            <div>
              <label className="fl">Fecha de acuerdo</label>
              <input className="inp" type="date" value={form.fechaAcuerdo} onChange={e => upd("fechaAcuerdo", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="fl">Fecha vencimiento pago</label>
            <input className="inp" type="date" value={form.fechaVencimiento} onChange={e => upd("fechaVencimiento", e.target.value)} />
          </div>

          <div>
            <label className="fl" style={{ display:"flex", alignItems:"center", gap:".35rem" }}>
              📞 Próximo seguimiento
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                color:"var(--text-dim)", fontWeight:400 }}>
                (solo en negociando)
              </span>
            </label>
            <input className="inp" type="date" value={form.proximoContacto || ""}
              onChange={e => upd("proximoContacto", e.target.value)}
              style={{ borderColor: (() => {
                if (!form.proximoContacto) return undefined;
                const dias = Math.ceil((new Date(form.proximoContacto) - new Date()) / 86400000);
                return dias < 0 ? "var(--red)" : dias <= 3 ? "var(--amber)" : undefined;
              })() }} />
            {form.proximoContacto && (() => {
              const dias = Math.ceil((new Date(form.proximoContacto) - new Date()) / 86400000);
              if (dias < 0) return <div className="xs mono" style={{ color:"var(--red)", marginTop:".2rem" }}>⚠ Seguimiento vencido hace {Math.abs(dias)} día{Math.abs(dias)!==1?"s":""}</div>;
              if (dias === 0) return <div className="xs mono" style={{ color:"var(--amber)", marginTop:".2rem" }}>⚡ Seguimiento hoy</div>;
              if (dias <= 3) return <div className="xs mono" style={{ color:"var(--amber)", marginTop:".2rem" }}>📞 En {dias} día{dias!==1?"s":""}</div>;
              return null;
            })()}
          </div>

          {/* ── Próxima acción CRM ── */}
          <div style={{ background:"rgba(34,211,238,.04)", border:"1px solid var(--cyan-border)",
            borderRadius:8, padding:".75rem", display:"flex", flexDirection:"column", gap:".6rem" }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan)",
              fontWeight:700, textTransform:"uppercase", letterSpacing:".05em" }}>
              📞 Próxima acción
            </div>
            <div className="field-row">
              <div>
                <label className="field-label">Tipo de acción</label>
                <select className="inp" value={form.proximaAccion?.tipo || ""}
                  onChange={e => upd("proximaAccion", { ...(form.proximaAccion||{}), tipo: e.target.value })}>
                  <option value="">Sin programar</option>
                  <option value="llamar">📞 Llamar</option>
                  <option value="enviar-propuesta">📄 Enviar propuesta</option>
                  <option value="enviar-contrato">📝 Enviar contrato</option>
                  <option value="enviar-factura">💶 Enviar factura</option>
                  <option value="reunion">🤝 Reunión</option>
                  <option value="enviar-contraprestacion">🎁 Entregar contraprestación</option>
                  <option value="seguimiento">🔄 Seguimiento general</option>
                  <option value="otro">💬 Otro</option>
                </select>
              </div>
              <div>
                <label className="field-label">Fecha</label>
                <input type="date" className="inp"
                  value={form.proximaAccion?.fecha || ""}
                  onChange={e => upd("proximaAccion", { ...(form.proximaAccion||{}), fecha: e.target.value })} />
              </div>
            </div>
            {form.proximaAccion?.tipo && (
              <div>
                <label className="field-label">Notas de la acción</label>
                <input className="inp" placeholder="¿Qué hay que hacer exactamente?"
                  value={form.proximaAccion?.notas || ""}
                  onChange={e => upd("proximaAccion", { ...(form.proximaAccion||{}), notas: e.target.value })} />
              </div>
            )}
          </div>

          <div>
            <label className="fl">Notas internas</label>
            <textarea className="inp" rows={3} value={form.notas} onChange={e => upd("notas", e.target.value)}
              placeholder="Condiciones especiales, observaciones, historial de contactos..." style={{ resize: "vertical" }} />
          </div>

          {/* ── Contraprestaciones acordadas ── */}
          <div style={{ marginTop: ".75rem" }}>
            <label className="fl" style={{ marginBottom: ".5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>🎁 Contraprestaciones acordadas</span>
              <button type="button" className="btn btn-sm btn-ghost"
                style={{ fontSize: "var(--fs-xs)" }}
                onClick={() => {
                  const nueva = { id: Date.now(), tipo: "Logo en camiseta", detalle: "", estado: "pendiente" };
                  upd("contraprestaciones", [...(form.contraprestaciones || []), nueva]);
                }}>
                + Añadir
              </button>
            </label>
            {(!form.contraprestaciones || form.contraprestaciones.length === 0) ? (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)",
                padding: ".5rem .75rem", background: "var(--surface2)", borderRadius: 6 }}>
                Sin contraprestaciones registradas — pulsa "+ Añadir" para incluir qué recibe este colaborador
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                {(form.contraprestaciones || []).map((c, i) => (
                  <div key={c.id || i} style={{ display: "flex", gap: ".4rem", alignItems: "center",
                    padding: ".4rem .55rem", background: "var(--surface2)", borderRadius: 7,
                    border: "1px solid var(--border)" }}>
                    <input className="inp" placeholder="Tipo de contraprestación (ej: Logo en camiseta, Banner en meta...)"
                      value={c.tipo || ""}
                      list={`contra-tipos-${c.id || i}`}
                      style={{ flex: "0 0 auto", width: 230, fontSize: "var(--fs-xs)" }}
                      onChange={e => {
                        const updc = (form.contraprestaciones || []).map((x, j) => j === i ? { ...x, tipo: e.target.value } : x);
                        upd("contraprestaciones", updc);
                      }} />
                    <datalist id={`contra-tipos-${c.id || i}`}>
                      {["Logo en camiseta corredores","Logo en camiseta voluntarios","Banner en zona meta",
                        "Banner en avituallamiento","Mención en RRSS","Mención en megafonía",
                        "Logo en web oficial","Logo en díptico/programa","Producto en bolsa corredor",
                        "Stand en zona exposición"].map(t => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                    <input className="inp" placeholder="Detalle (tamaño, nº posts, ubicación...)"
                      value={c.detalle || ""}
                      style={{ flex: 1, fontSize: "var(--fs-xs)" }}
                      onChange={e => {
                        const updc = (form.contraprestaciones || []).map((x, j) => j === i ? { ...x, detalle: e.target.value } : x);
                        upd("contraprestaciones", updc);
                      }} />
                    <input type="date" className="inp"
                      title="Fecha límite de entrega"
                      value={c.fechaEntrega || ""}
                      style={{ flex: "0 0 auto", width: 130, fontSize: "var(--fs-xs)" }}
                      onChange={e => {
                        const updc = (form.contraprestaciones || []).map((x, j) => j === i ? { ...x, fechaEntrega: e.target.value } : x);
                        upd("contraprestaciones", updc);
                      }} />
                    <select className="inp" value={c.estado || "pendiente"}
                      style={{ flex: "0 0 auto", width: 100, fontSize: "var(--fs-xs)" }}
                      onChange={e => {
                        const updc = (form.contraprestaciones || []).map((x, j) => j === i ? { ...x, estado: e.target.value } : x);
                        upd("contraprestaciones", updc);
                      }}>
                      <option value="pendiente">⏳ Pendiente</option>
                      <option value="entregado">✅ Entregado</option>
                      <option value="cancelado">✕ Cancelado</option>
                    </select>
                    <button type="button" className="btn btn-red btn-sm"
                      onClick={() => upd("contraprestaciones", (form.contraprestaciones || []).filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={mpHandleClose}>Cancelar</button>
          <button className="btn btn-gold" onClick={() => { if (validar()) onSave(form); }}>
            {data ? "💾 Guardar cambios" : "🤝 Crear patrocinador"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DOC MANAGER (inside ModalDetalle) ───────────────────────────────────────
