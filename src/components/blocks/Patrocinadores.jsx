import { useState, useMemo, useEffect } from "react";
import { useModalClose } from "@/hooks/useModalClose";
import { exportarPatrocinadores } from "@/lib/exportUtils";
import { toast } from "@/lib/toast";
import { genIdNum, fmtEur, scrollMainToTop } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/lib/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { useData } from "@/lib/dataService";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";
// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LS = "teg_patrocinadores_v1";

const NIVELES = ["Oro", "Plata", "Bronce", "Colaborador", "Especie"];
const NIVEL_CFG = {
  Oro:         { color: "#f59e0b", dim: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", icon: "🥇", objetivo: 2000 },
  Plata:       { color: "#94a3b8", dim: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)", icon: "🥈", objetivo: 1000 },
  Bronce:      { color: "#c47b3a", dim: "rgba(196,123,58,0.12)", border: "rgba(196,123,58,0.3)", icon: "🥉", objetivo: 500 },
  Colaborador: { color: "#34d399", dim: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.25)", icon: "🤝", objetivo: 200 },
  Especie:     { color: "#a78bfa", dim: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)", icon: "📦", objetivo: 0 },
};

const getCfg  = (nivel) => NIVEL_CFG[nivel] || NIVEL_CFG.Colaborador;

const ESTADOS = ["prospecto", "negociando", "confirmado", "cobrado", "cancelado"];
const ESTADO_CFG = {
  prospecto:  { color: "var(--text-muted)", bg: "rgba(90,106,138,0.12)", label: "Prospecto" },
  negociando: { color: "#fbbf24", bg: "var(--amber-dim)",  label: "Negociando" },
  confirmado: { color: "#22d3ee", bg: "var(--cyan-dim)",  label: "Confirmado" },
  cobrado:    { color: "#34d399", bg: "var(--green-dim)",  label: "Cobrado" },
  cancelado:  { color: "#f87171", bg: "var(--red-dim)", label: "Cancelado" },
};

const CONTRAPRESTACIONES_TIPO = [
  "Logo en camiseta voluntarios",
  "Logo en camiseta corredores",
  "Banner en zona meta",
  "Banner en avituallamiento",
  "Mención en RRSS (x posts)",
  "Mención en web oficial",
  "Dorsales gratuitos",
  "Stand/carpa en meta",
  "Logo en diptico/programa",
  "Mención en megafonía",
  "Logo en medallas",
  "Producto en bolsa del corredor"
];

const TIPOS_DOC = ["Contrato","Presupuesto","Factura","Justificante de pago","Póliza de seguro","Cobertura seguro","Acuerdo patrocinio","Otro"];

const SECTORES = ["Deportes / Outdoor", "Alimentación / Nutrición", "Salud / Fisioterapia", "Hostelería / Turismo", "Comercio local", "Administración pública", "Transporte / Automoción", "Tecnología", "Medios / Comunicación", "Otro"];

// ─── DATOS DEFAULT ────────────────────────────────────────────────────────────
const PAT0 = [
  {
    id: 1, nombre: "Decathlon Ávila", sector: "Deportes / Outdoor", nivel: "Oro",
    contacto: "Carlos Méndez", telefono: "920 111 222", email: "cmendez@decathlon.es",
    importe: 2000, importeCobrado: 0, especie: 0, estado: "confirmado",
    fechaAcuerdo: "2026-02-01", fechaVencimiento: "2026-06-01",
    notas: "Interesados en imagen de marca en camiseta y banner en meta. Reunión el 3 de marzo.",
    contraprestaciones: [
      { id:1, tipo:"Logo en camiseta corredores", detalle:"Logo 8x4cm pecho derecho", estado:"pendiente" },
      { id:2, tipo:"Banner en zona meta", detalle:"Banner 2x1m fondo meta", estado:"pendiente" },
      { id:3, tipo:"Mención en RRSS (x posts)", detalle:"3 posts en Instagram + story apertura inscripciones", estado:"pendiente" },
    ]
  ,
    docs: []
  },
  {
    id: 2, nombre: "Turismo Candeleda", sector: "Hostelería / Turismo", nivel: "Plata",
    contacto: "Ana Rodríguez (Ayuntamiento)", telefono: "920 380 001", email: "turismo@candeleda.es",
    importe: 800, importeCobrado: 800, especie: 0, estado: "cobrado",
    fechaAcuerdo: "2026-01-15", fechaVencimiento: "2026-03-01",
    notas: "Apoyo institucional confirmado. Importe ya transferido. Piden mención en todos los comunicados.",
    contraprestaciones: [
      { id:1, tipo:"Logo en camiseta corredores", detalle:"Logo trasero parte inferior", estado:"entregado" },
      { id:2, tipo:"Mención en web oficial", detalle:"Logo + enlace en sección patrocinadores", estado:"entregado" },
      { id:3, tipo:"Mención en RRSS (x posts)", detalle:"2 posts mencionando Candeleda como sede", estado:"pendiente" },
    ]
  ,
    docs: []
  },
  {
    id: 3, nombre: "Clínica Fisio TrailRun", sector: "Salud / Fisioterapia", nivel: "Bronce",
    contacto: "Marta Jiménez", telefono: "612 333 444", email: "marta@fisiotrailrun.es",
    importe: 500, importeCobrado: 0, especie: 0, estado: "negociando",
    fechaAcuerdo: "", fechaVencimiento: "2026-05-01",
    notas: "Ofrecen servicio de fisio gratuito en meta además del patrocinio económico. Pendiente firma contrato.",
    contraprestaciones: [
      { id:1, tipo:"Banner en avituallamiento", detalle:"Banner KM 16 (tramo TG25)", estado:"pendiente" },
      { id:2, tipo:"Logo en diptico/programa", detalle:"Logo en programa oficial", estado:"pendiente" },
    ]
  ,
    docs: []
  },
  {
    id: 4, nombre: "GU Energy Labs", sector: "Alimentación / Nutrición", nivel: "Especie",
    contacto: "Distribuidor ES", telefono: "93 000 1111", email: "iberia@guenergy.com",
    importe: 0, importeCobrado: 0, especie: 800, estado: "confirmado",
    fechaAcuerdo: "2026-02-20", fechaVencimiento: "",
    notas: "Patrocinio en especie: 250 geles + 100 barritas para avituallamiento TG25 y TG13. Envío previsto julio.",
    contraprestaciones: [
      { id:1, tipo:"Producto en bolsa del corredor", detalle:"1 gel + 1 barrita en bolsa de cada corredor", estado:"pendiente" },
      { id:2, tipo:"Logo en camiseta voluntarios", detalle:"Logo pequeño manga derecha", estado:"pendiente" },
    ]
  ,
    docs: [],
    especieItems: [
      { id:1, nombre:"Geles energéticos", cantidad:250, unidad:"unidades", recibido:false },
      { id:2, nombre:"Barritas energéticas", cantidad:100, unidad:"unidades", recibido:false },
    ]
  },
  {
    id: 5, nombre: "Hotel Gredos Sierra", sector: "Hostelería / Turismo", nivel: "Colaborador",
    contacto: "José Luis Parra", telefono: "920 380 050", email: "jlparra@hotelgredos.es",
    importe: 300, importeCobrado: 0, especie: 0, estado: "prospecto",
    fechaAcuerdo: "", fechaVencimiento: "",
    notas: "Primera toma de contacto por correo. Sin respuesta aún. Seguimiento pendiente.",
    contraprestaciones: []
  ,
    docs: []
  },
  {
    id: 6, nombre: "Bar Restaurante El Guerrero", sector: "Hostelería / Turismo", nivel: "Colaborador",
    contacto: "Pedro Alonso", telefono: "920 380 090", email: "",
    importe: 150, importeCobrado: 150, especie: 0, estado: "cobrado",
    fechaAcuerdo: "2026-01-10", fechaVencimiento: "2026-02-01",
    notas: "Colaborador local histórico. Cede el local para la pasta-party pre-carrera.",
    contraprestaciones: [
      { id:1, tipo:"Mención en megafonía", detalle:"Mención en acto inaugural y entrega trofeos", estado:"pendiente" },
      { id:2, tipo:"Banner en zona meta", detalle:"Lona 1x0.5m en zona de llegada", estado:"pendiente" },
    ]
  ,
    docs: []
  },
];

// Objetivo de patrocinadores: valor inicial 8.000€, editable desde el UI

// ─── STORAGE ──────────────────────────────────────────────────────────────────


// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [eventCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [tab, setTab] = useState("dashboard");
  const [rawPats, setPats] = useData(LS + "_pats", PAT0);
  const [objetivo, setObjetivo] = useData(LS + "_obj", 8000);
  const pats = Array.isArray(rawPats) ? rawPats : [];
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
    const cobrado = valid.filter(p => p.estado === "cobrado").reduce((s, p) => s + (p.importe || 0), 0);
    const comprometido = confirmados.reduce((s, p) => s + (p.importe || 0), 0);
    const especie = activos.reduce((s, p) => s + (p.especie || 0), 0);
    const pipeline = valid.filter(p => p.estado === "negociando" || p.estado === "prospecto").reduce((s, p) => s + (p.importe || 0), 0);
    const pctObj = objetivo > 0 ? Math.min(Math.round(comprometido / objetivo * 100), 100) : 0;
    const pctCobrado = objetivo > 0 ? Math.min(Math.round(cobrado / objetivo * 100), 100) : 0;
    const contPend = activos.reduce((s, p) => s + (p.contraprestaciones || []).filter(c => c && c.estado === "pendiente").length, 0);
    return { activos: activos.length, confirmados: confirmados.length, cobrado, comprometido, especie, pipeline, pctObj, pctCobrado, contPend };
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

  const savePat = (pat) => {
    if (pat.id) {
      // Preserve docs, contraprestaciones y especieItems — el modal solo toca metadata
      setPats(prev => prev.map(p => p.id === pat.id
        ? { ...pat, docs: p.docs || [], contraprestaciones: p.contraprestaciones || [], especieItems: p.especieItems || [] }
        : p
      ));
    } else {
      setPats(prev => [...prev, { ...pat, id: genIdNum(pats), contraprestaciones: [], docs: [], especieItems: [] }]);
    }
    setModal(null);
  };

  const deletePat = () => {
    setPats(prev => prev.filter(p => p.id !== delId));
    setDelId(null);
  };

  const updateEstado = (id, estado) => { setPats(prev => prev.map(p => p.id === id ? { ...p, estado } : p)); if(estado==="cobrado") toast.success("Patrocinador marcado como cobrado ✓"); };

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

  return (
    <>
      <style>{BLOCK_CSS + CSS}</style>
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
      {modal?.tipo==="pat" && <ModalPat key={modal.data?.id||"nuevo"} data={modal.data} onSave={savePat} onClose={() => setModal(null)} />}
      {modal?.tipo==="detalle" && (
        <ModalDetalle key={modal.data.id} pat={pats.find(p=>p.id===modal.data.id)||modal.data}
          onClose={() => setModal(null)}
          onEditar={() => setModal({tipo:"pat",data:pats.find(p=>p.id===modal.data.id)||modal.data})}
          updateContraprestacion={updateContraprestacion} addContraprestacion={addContraprestacion}
          deleteContraprestacion={deleteContraprestacion} updateEstado={updateEstado}
          addDoc={addDoc} deleteDoc={deleteDoc}
          addEspecieItem={addEspecieItem} updateEspecieItem={updateEspecieItem} deleteEspecieItem={deleteEspecieItem}
          config={config}
        />
      )}
      {delId && (
        <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && setDelId(null)}>
          <div className="modal" style={{maxWidth:340,textAlign:"center"}}>
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
      )}
    </>
  );
}

// ─── TAB DASHBOARD ────────────────────────────────────────────────────────────
function TabDashboard({ stats, pats, objetivo, setObjetivo, setTab, openNuevo, openDetalle, config }) {
  const [editObj, setEditObj] = useState(false);
  const [tmpObj, setTmpObj] = useState(objetivo);

  const porNivel = NIVELES.map(n => {
    const np = pats.filter(p => p.nivel === n && p.estado !== "cancelado");
    const total = np.reduce((s, p) => s + p.importe + (p.especie || 0), 0);
    return { n, count: np.length, total, cfg: NIVEL_CFG[n] };
  });

  // Patrocinadores que requieren acción (en orden de urgencia)
  const requierenAtencion = (() => {
    const lista = [];
    // 1. Vencidos sin cobrar — máxima urgencia
    pats.filter(p => p.fechaVencimiento && p.estado !== "cobrado" && p.estado !== "cancelado" &&
      Math.ceil((new Date(p.fechaVencimiento) - new Date()) / 86400000) < 0)
      .forEach(p => lista.push({ ...p, _motivo:"vencido", _color:"var(--red)" }));
    // 2. Negociando (hay que cerrar)
    pats.filter(p => p.estado === "negociando")
      .forEach(p => lista.push({ ...p, _motivo:"negociando", _color:"#fbbf24" }));
    // 3. Confirmados sin cobrar
    pats.filter(p => p.estado === "confirmado")
      .forEach(p => lista.push({ ...p, _motivo:"pendiente cobro", _color:"var(--cyan)" }));
    // 4. Contraprestaciones pendientes
    pats.filter(p => (p.contraprestaciones||[]).some(c => c.estado === "pendiente") &&
      p.estado !== "cancelado")
      .filter(p => !lista.find(x => x.id === p.id)) // evitar duplicados
      .forEach(p => {
        const n = (p.contraprestaciones||[]).filter(c => c.estado === "pendiente").length;
        lista.push({ ...p, _motivo:`${n} compromisos`, _color:"var(--violet)" });
      });
    return lista.slice(0, 6);
  })();

  const vencProx = pats.filter(p => p && p.fechaVencimiento && p.estado !== "cobrado" && p.estado !== "cancelado")
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento)).slice(0, 4);

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📊 Dashboard de Patrocinios</div>
          <div className="pd">{config.nombre} {config.edicion} · {config.lugar}, {config.provincia}</div>
        </div>
        <button className="btn btn-primary" onClick={openNuevo}>+ Nuevo patrocinador</button>
      </div>

      {/* KPIs — clases del sistema BLOCK_CSS */}
      <div className="kpi-grid mb">
        <div className="kpi amber" style={{cursor:"pointer"}} onClick={()=>setTab("patrocinadores")} title="Ver patrocinadores">
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>💰 Captado<Tooltip text={"Importe comprometido: suma de patrocinadores en estado 'confirmado' o 'cobrado'.\nNo incluye los que están en negociación o prospecto."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"#f59e0b"}}>{fmtEur(stats.comprometido)}</div>
          <div className="kpi-sub">comprometido / confirmado</div>
        </div>
        <div className="kpi green" style={{cursor:"pointer"}} onClick={()=>setTab("patrocinadores")} title="Ver cobrados">
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>✅ Cobrado<Tooltip text={"Importe efectivamente recibido en cuenta: solo patrocinadores en estado 'cobrado'.\nEs el dinero real disponible, a diferencia del comprometido que puede no haberse transferido aún."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"var(--green)"}}>{fmtEur(stats.cobrado)}</div>
          <div className="kpi-sub">{stats.pctCobrado}% del objetivo</div>
        </div>
        <div className="kpi violet" style={{cursor:"pointer"}} onClick={()=>setTab("patrocinadores")} title="Ver en especie">
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>📦 En especie<Tooltip text={"Valor estimado de las aportaciones no monetarias: material, servicios, productos.\nNo entra en la cuenta bancaria pero reduce costes del evento."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"var(--violet)"}}>{fmtEur(stats.especie)}</div>
          <div className="kpi-sub">valor estimado</div>
        </div>
        <div className="kpi cyan" style={{cursor:"pointer"}} onClick={()=>setTab("pipeline")} title="Ver pipeline">
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>🔀 Pipeline<Tooltip text={"Importe potencial de los patrocinadores en estado 'negociando' o 'prospecto'.\nNo está garantizado — es el máximo que podría captarse si todos confirman."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"var(--cyan)"}}>{fmtEur(stats.pipeline)}</div>
          <div className="kpi-sub">en negociación/prospecto</div>
        </div>
      </div>

      {/* Barra de progreso objetivo */}
      {/* Objetivo editable — compacto, sin duplicar KPIs */}
      <div style={{ display:"flex", alignItems:"center", gap:".6rem",
        marginBottom:".85rem", padding:".55rem .85rem",
        background:"rgba(245,158,11,.05)", border:"1px solid rgba(245,158,11,.15)",
        borderRadius:"var(--r-sm)" }}>
        <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
          color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".06em" }}>
          🎯 Objetivo
        </span>
        {editObj ? (
          <>
            <input className="inp" type="number" value={tmpObj}
              onChange={e => setTmpObj(parseFloat(e.target.value)||0)}
              style={{ width:90, fontFamily:"var(--font-mono)", fontSize:"var(--fs-base)" }}
              autoFocus />
            <button className="btn btn-gold btn-sm"
              onClick={()=>{ setObjetivo(tmpObj); setEditObj(false); }}>OK</button>
            <button className="btn btn-ghost btn-sm"
              onClick={()=>setEditObj(false)}>✕</button>
          </>
        ) : (
          <>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-base)",
              fontWeight:800, color:"#f59e0b" }}>{fmtEur(objetivo)}</span>
            <div style={{ flex:1, height:4, background:"var(--surface3)",
              borderRadius:2, overflow:"hidden", maxWidth:160 }}>
              <div style={{ height:"100%", borderRadius:2, transition:"width .5s",
                width:`${stats.pctObj}%`,
                background:"linear-gradient(90deg,#f59e0b,#fbbf24)" }} />
            </div>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
              fontWeight:700, color:stats.pctObj>=80?"var(--green)":stats.pctObj>=50?"#f59e0b":"var(--red)" }}>
              {stats.pctObj}%
            </span>
            <button className="btn btn-ghost btn-sm"
              style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                color:"var(--text-dim)", marginLeft:"auto" }}
              onClick={()=>{ setTmpObj(objetivo); setEditObj(true); }}>
              ✏️ Editar
            </button>
          </>
        )}
      </div>

      <div className="twocol">
        {/* Por nivel */}
        <div className="card">
          <div className="ct">🏅 Captación por nivel</div>
          {porNivel.filter(x => x.count > 0 || x.n !== "Especie").map(x => (
            <div key={x.n} style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".75rem" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: x.cfg.dim, border: `1px solid ${x.cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-md)", flexShrink: 0 }}>{x.cfg.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-sm)", fontWeight: 600, marginBottom: ".2rem" }}>
                  <span style={{ color: x.cfg.color }}>{x.n}</span>
                  <span className="mono" style={{ color: "var(--text-muted)" }}>{x.count} patrocinador{x.count !== 1 ? "es" : ""}</span>
                </div>
                <div className="pbar">
                  <div className="pfill" style={{ width: x.cfg.objetivo > 0 ? `${Math.min(x.total / x.cfg.objetivo * 100, 100)}%` : "0%", background: x.cfg.color }} />
                </div>
                <div style={{ marginTop: ".15rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: x.cfg.color }}>{fmtEur(x.total)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Vencimientos */}
        <div className="card">
          <div className="ct">⏰ Próximos vencimientos de cobro</div>
          {vencProx.length === 0 && <div className="empty">Sin vencimientos próximos</div>}
          {vencProx.map(p => {
            const dias = Math.ceil((new Date(p.fechaVencimiento) - new Date()) / 86400000);
            const urgente = dias < 30;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".45rem 0", borderBottom: "1px solid rgba(30,45,80,.3)", cursor:"pointer" }} onClick={()=>openDetalle(p)}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: getCfg(p.nivel).color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-base)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</div>
                  <div className="mono xs muted">{p.fechaVencimiento} · {fmtEur(p.importe)}</div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: urgente ? "#f87171" : "#fbbf24", background: urgente ? "rgba(248,113,113,.1)" : "rgba(251,191,36,.1)", padding: ".12rem .4rem", borderRadius: 4, flexShrink: 0 }}>
                  {dias < 0 ? "VENCIDO" : `${dias}d`}
                </div>
              </div>
            );
          })}
          <button className="btn ghost mt1" style={{ width: "100%" }} onClick={() => setTab("patrocinadores")}>
            Ver todos los patrocinadores →
          </button>
        </div>
      </div>

      {/* Requiere atención */}
      <div className="card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:".65rem" }}>
          <div className="ct" style={{ marginBottom:0 }}>⚡ Requiere atención</div>
          {requierenAtencion.length === 0 && (
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              color:"var(--green)" }}>✅ Todo en orden</span>
          )}
        </div>
        {requierenAtencion.length === 0 ? (
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
            color:"var(--text-muted)", textAlign:"center", padding:".75rem 0" }}>
            Sin acciones pendientes en patrocinadores
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:".35rem" }}>
            {requierenAtencion.map(p => {
              const cfg = getCfg(p.nivel) || NIVEL_CFG.Especie;
              return (
                <div key={p.id+p._motivo}
                  onClick={() => openDetalle(p)}
                  style={{ display:"flex", alignItems:"center", gap:".65rem",
                    padding:".5rem .65rem", borderRadius:8, cursor:"pointer",
                    background:"var(--surface2)", border:"1px solid var(--border)",
                    borderLeft:`3px solid ${p._color}`, transition:"border-color .12s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border-light)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"var(--fs-base)", fontWeight:700,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {p.nombre}
                    </div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"var(--text-muted)", marginTop:".1rem" }}>
                      {cfg.icon} {p.nivel} · {p.sector}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column",
                    alignItems:"flex-end", gap:".15rem", flexShrink:0 }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      fontWeight:700, color:p._color,
                      background:`${p._color}15`, border:`1px solid ${p._color}33`,
                      borderRadius:3, padding:".1rem .4rem", whiteSpace:"nowrap" }}>
                      {p._motivo}
                    </span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"var(--text-muted)" }}>
                      {p.especie > 0 ? `${fmtEur(p.especie)} especie` : fmtEur(p.importe)}
                    </span>
                  </div>
                </div>
              );
            })}
            <button className="btn btn-ghost" style={{ marginTop:".25rem", fontSize:"var(--fs-sm)" }}
              onClick={() => setTab("patrocinadores")}>
              Ver todos los patrocinadores →
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── TAB PATROCINADORES ───────────────────────────────────────────────────────
function TabPatrocinadores({ pats, todosLen, search, setSearch, filtroNivel, setFiltroNivel, filtroEstado, setFiltroEstado, onEditar, onDetalle, onDelete, onNuevo, updateEstado, ordenAlfa, setOrdenAlfa }) {
  const [vistaKanban, setVistaKanban] = useState(false);
  const patsOrdenados = ordenAlfa ? [...pats].sort((a,b) => a.nombre.localeCompare(b.nombre,"es")) : pats;
  const { items: patsPaginados, total: totalPats, PaginadorUI } = usePaginacion(patsOrdenados, 12);
  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🤝 Patrocinadores</div>
          <div className="pd">{todosLen} registrados · {pats.length} mostrados</div>
        </div>
        <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
          <div className="filter-pill-group">
            <button className={`filter-pill${!vistaKanban ? " active" : ""}`}
              onClick={() => setVistaKanban(false)}>☰ Lista</button>
            <button className={`filter-pill${vistaKanban ? " active" : ""}`}
              onClick={() => setVistaKanban(true)}>⬛ Kanban</button>
          </div>
          <button className={`btn btn-sm ${ordenAlfa?"btn-gold":"btn-ghost"}`} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={onNuevo}>+ Nuevo patrocinador</button>
        </div>
      </div>

      {/* Filtros — Kinetik Ops quick-filter pills */}
      <div style={{ marginBottom:".75rem", display:"flex", flexDirection:"column", gap:"0.45rem" }}>
        <input className="inp" placeholder="Buscar por nombre, contacto o sector…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth:320, fontSize:"var(--fs-base)" }} />
        <div className="filter-pill-group">
          {/* Estado */}
          {[
            { id:"todos",      label:"Todos" },
            { id:"prospecto",  label:"Prospecto" },
            { id:"negociando", label:"Negociando" },
            { id:"confirmado", label:"Confirmado" },
            { id:"cobrado",    label:"Cobrado" },
          ].map(({ id, label }) => (
            <button key={id}
              className={`filter-pill${filtroEstado === id ? " active" : ""}`}
              onClick={() => setFiltroEstado(id)}>
              {label}
            </button>
          ))}
          <div className="filter-pill-sep" />
          {/* Nivel */}
          <button className={`filter-pill${filtroNivel === "todos" ? " active" : ""}`}
            onClick={() => setFiltroNivel("todos")}>Todos</button>
          {NIVELES.map(n => (
            <button key={n}
              className={`filter-pill${filtroNivel === n ? " active" : ""}`}
              onClick={() => setFiltroNivel(n)}>
              {NIVEL_CFG[n].icon} {n}
            </button>
          ))}
          {(search || filtroNivel !== "todos" || filtroEstado !== "todos") && (
            <>
              <div className="filter-pill-sep" />
              <button className="filter-pill"
                onClick={() => { setSearch(""); setFiltroNivel("todos"); setFiltroEstado("todos"); }}
                style={{ color:"var(--red)", borderColor:"rgba(248,113,113,0.3)" }}>
                ✕ Limpiar
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── KANBAN por nivel ── */}
      {vistaKanban && (
        <div className="pat-kanban-grid">
          {NIVELES.map(nivel => {
            const items = patsOrdenados.filter(p => p.nivel === nivel);
            if (!items.length) return null;
            const cfg = getCfg(nivel);
            return (
              <div key={nivel} className="pat-k-col">
                <div className="pat-k-hdr" style={{borderTopColor:cfg.color}}>
                  <span style={{fontWeight:700,fontSize:"var(--fs-sm)",color:cfg.color}}>{cfg.icon} {nivel}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,background:cfg.dim,color:cfg.color}}>{items.length}</span>
                </div>
                {items.map(p => {
                  const ecfg = ESTADO_CFG[p.estado] || ESTADO_CFG.prospecto;
                  return (
                    <div key={p.id} className="pat-k-card" style={{borderLeftColor:cfg.color,cursor:"pointer"}}
                      onClick={()=>onDetalle(p)}>
                      <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".2rem"}}>{p.nombre}</div>
                      <div className="mono xs muted" style={{marginBottom:".3rem"}}>{p.sector}</div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-base)",fontWeight:700,color:cfg.color}}>{fmtEur(p.importe)}</span>
                        <span className="badge" style={{background:ecfg.bg,color:ecfg.color,fontSize:"var(--fs-2xs)"}}>{ecfg.label}</span>
                      {p.proximoContacto && p.estado === "negociando" && (() => {
                        const dias = Math.ceil((new Date(p.proximoContacto) - new Date()) / 86400000);
                        if (dias > 3) return null;
                        return (
                          <span style={{ padding:".1rem .4rem", borderRadius:4, fontSize:"var(--fs-xs)",
                            fontFamily:"var(--font-mono)", fontWeight:700,
                            background: dias < 0 ? "var(--red-dim)" : "var(--amber-dim)",
                            color: dias < 0 ? "var(--red)" : "var(--amber)",
                            marginLeft:".2rem" }}>
                            {dias < 0 ? `📞 ${Math.abs(dias)}d sin contacto` : dias === 0 ? "📞 HOY" : `📞 ${dias}d`}
                          </span>
                        );
                      })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── LISTA ── */}
      {!vistaKanban && (
      <div style={{ display: "flex", flexDirection: "column", gap: ".55rem" }}>
        {patsOrdenados.length === 0 && (
          <EmptyState
            svg="handshake" color="var(--amber)"
            title="Sin patrocinadores"
            sub="Añade el primer patrocinador o ajusta los filtros"
            action={<button className="btn btn-primary btn-sm" onClick={onNuevo}>+ Nuevo patrocinador</button>}
          />
        )}
        {patsPaginados.map(p => {
          if (!p) return null;
          const cfg = getCfg(p.nivel) || NIVEL_CFG.Especie;
          const ecfg = ESTADO_CFG[p.estado] || ESTADO_CFG.prospecto;
          const contPend = (p.contraprestaciones || []).filter(c => c && c.estado === "pendiente").length;
          const contTotal = (p.contraprestaciones || []).length;
          return (
            <div key={p.id} className="pat-row" style={{ borderLeftColor: cfg.color, cursor:"pointer" }} onClick={()=>onDetalle(p)}>
              {/* Kinetik Ops: pill de nivel con icono — mismo lenguaje que item-icon-pill */}
              <div style={{
                width: 44, flexShrink: 0,
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: ".2rem",
              }}>
                <div className="item-icon-pill"
                  style={{"--pill-color": cfg.color, width:38, height:38}}>
                  <span style={{fontSize:"var(--fs-lg)"}}>{cfg.icon}</span>
                </div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)",
                  color:cfg.color, fontWeight:700, textAlign:"center",
                  letterSpacing:".04em", textTransform:"uppercase",
                  whiteSpace:"nowrap" }}>
                  {p.nivel}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: ".25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "var(--fs-md)", fontWeight: 800 }}>{p.nombre}</span>
                  <span className="badge" style={{ background: ecfg.bg, color: ecfg.color, border: `1px solid ${ecfg.color}33` }}>{ecfg.label}</span>
                  {contPend > 0 && <span className="badge" style={{ background: "rgba(248,113,113,.1)", color: "#f87171" }}>⚠ {contPend} compromisos pendientes</span>}
                </div>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <span className="mono xs muted">🏭 {p.sector}</span>
                  <span className="mono xs muted">👤 {p.contacto}</span>
                  {p.telefono && <span className="mono xs muted">📞 {p.telefono}</span>}
                </div>
                {p.notas && <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 480 }}>{p.notas}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: ".35rem", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-md)", fontWeight: 800, color: cfg.color }}>
                  {p.especie > 0 ? fmtEur(p.especie) : fmtEur(p.importe)}
                  {p.especie > 0 && <span className="mono xs muted" style={{ marginLeft: ".3rem" }}>especie</span>}
                </div>
                {p.fechaVencimiento && (
                  <div className="mono xs muted">{p.estado !== "cobrado" ? `Vence: ${p.fechaVencimiento}` : "✓ Cobrado"}</div>
                )}
                <div style={{ display: "flex", gap: ".3rem" }}>
                  <button className="btn btn-sm" style={{ background: cfg.dim, color: cfg.color, border: `1px solid ${cfg.border}` }} onClick={e=>{e.stopPropagation();onDetalle(p)}}>Ver detalle</button>
                </div>
              </div>
            </div>
          );
        })}
        <PaginadorUI />
      </div>
      )}
    </>
  );
}

// ─── TAB PIPELINE ─────────────────────────────────────────────────────────────
function TabPipeline({ pats, onEditar, onDetalle, updateEstado, ordenAlfa, onNuevo }) {
  const patsOrdenados = ordenAlfa ? [...pats].sort((a,b) => a.nombre.localeCompare(b.nombre,"es")) : pats;
  const porEstado = ESTADOS.map(e => ({
    e, cfg: ESTADO_CFG[e],
    pats: patsOrdenados.filter(p => p.estado === e),
    total: patsOrdenados.filter(p => p.estado === e).reduce((s, p) => s + p.importe + (p.especie || 0), 0),
  }));

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🔀 Pipeline Comercial</div>
          <div className="pd">Vista kanban del estado · {ordenAlfa?"orden A-Z":"orden por defecto"}</div>
        </div>
        <div style={{ display:"flex", gap:".5rem", alignItems:"center" }}>
          {ordenAlfa && <span className="badge badge-amber">A-Z ✓</span>}
          <button className="btn btn-primary btn-sm" onClick={onNuevo}>+ Nuevo patrocinador</button>
        </div>
      </div>

      <div className="kanban">
        {porEstado.map(col => (
          <div key={col.e} className="kancol">
            <div className="kancol-header" style={{ borderTopColor: col.cfg.color }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "var(--fs-base)", color: col.cfg.color }}>{col.cfg.label}</span>
                <span className="badge" style={{ background: col.cfg.bg, color: col.cfg.color }}>{col.pats.length}</span>
              </div>
              {col.total > 0 && <div className="mono xs" style={{ color: col.cfg.color, marginTop: ".2rem" }}>{fmtEur(col.total)}</div>}
            </div>
            <div className="kancol-body">
              {col.pats.length === 0 && (
                <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)" }}>—</div>
              )}
              {col.pats.map(p => {
                const ncfg = getCfg(p.nivel);
                return (
                  <div key={p.id} className="kancard" style={{ borderTopColor: ncfg.color, cursor:"pointer" }} onClick={()=>onDetalle(p)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: ".35rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "var(--fs-base)", flex: 1, paddingRight: ".5rem" }}>{p.nombre}</span>
                      <span style={{ fontSize: "var(--fs-base)" }}>{ncfg.icon}</span>
                    </div>
                    <div className="mono xs muted" style={{ marginBottom: ".5rem" }}>{p.sector}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 700, color: ncfg.color }}>
                        {p.especie > 0 ? fmtEur(p.especie) : fmtEur(p.importe)}
                      </span>
                    </div>
                    {/* Mover de estado */}
                    <div style={{ marginTop: ".5rem", display: "flex", gap: ".25rem", flexWrap: "wrap" }}>
                      {ESTADOS.filter(s => s !== p.estado && s !== "cancelado").slice(0, 2).map(s => (
                        <button key={s} className="btn btn-sm btn-ghost" style={{ fontSize: "var(--fs-xs)", padding: ".1rem .35rem" }}
                          onClick={e=>{e.stopPropagation();updateEstado(p.id, s)}}>
                          → {ESTADO_CFG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── TAB CONTRAPRESTACIONES ───────────────────────────────────────────────────
function TabContraprestaciones({ pats, updateContraprestacion, addContraprestacion, deleteContraprestacion, onDetalle, ordenAlfa, setOrdenAlfa }) {
  const [addingTo, setAddingTo] = useState(null);
  const [newCont, setNewCont] = useState({ tipo: CONTRAPRESTACIONES_TIPO[0], detalle: "", fechaEntrega: "", estado: "pendiente" });
  const [filtroPatId, setFiltroPatId] = useState("todos");
  const [vistaKanban, setVistaKanban] = useState(false);
  const [editingCont, setEditingCont] = useState(null);
  const [editC, setEditC] = useState({ tipo: CONTRAPRESTACIONES_TIPO[0], detalle: "", fechaEntrega: "" });

  const activos = pats.filter(p => p.estado !== "cancelado");
  const allConts = activos.flatMap(p => (p.contraprestaciones || []).map(c => ({ ...c, patNombre: p.nombre, patId: p.id, patNivel: p.nivel })));
  const pendientes = allConts.filter(c => c.estado === "pendiente");
  const entregados = allConts.filter(c => c.estado === "entregado");
  const activosBase = filtroPatId === "todos" ? activos : activos.filter(p => String(p.id) === filtroPatId);
  const activosFiltrados = ordenAlfa ? [...activosBase].sort((a,b) => a.nombre.localeCompare(b.nombre,"es")) : activosBase;

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🎁 Compromisos con patrocinadores</div>
          <div className="pd">{pendientes.length} pendientes · {entregados.length} entregados · {allConts.length} total</div>
        </div>
        <div style={{display:"flex",gap:".4rem",flexWrap:"wrap",alignItems:"center"}}>
          <select className="inp" value={filtroPatId} onChange={e=>setFiltroPatId(e.target.value)} style={{width:"auto",maxWidth:200}}>
            <option value="todos">Todos los patrocinadores</option>
            {activos.map(p=><option key={p.id} value={String(p.id)}>{getCfg(p.nivel).icon} {p.nombre}</option>)}
          </select>
          <div style={{display:"flex",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",overflow:"hidden"}}>
            {[["lista","☰"],["kanban","⬛"]].map(([v,ic])=>(
              <button key={v} onClick={()=>setVistaKanban(v==="kanban")}
                style={{padding:".3rem .55rem",border:"none",cursor:"pointer",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                  background:(vistaKanban&&v==="kanban")||(!vistaKanban&&v==="lista")?"rgba(245,158,11,.2)":"transparent",
                  color:(vistaKanban&&v==="kanban")||(!vistaKanban&&v==="lista")?"#f59e0b":"var(--text-muted)"}}>
                {ic}
              </button>
            ))}
          </div>
          <button className={`btn btn-sm ${ordenAlfa?"btn-gold":"btn-ghost"}`} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
        </div>
      </div>

      {/* ── KANBAN pendiente / entregado ── */}
      {vistaKanban && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".65rem",marginBottom:".85rem"}}>
          {[
            {id:"pendiente",label:"⏳ Pendientes",color:"#f87171",bg:"rgba(248,113,113,.08)",items:pendientes},
            {id:"entregado",label:"✅ Entregados",color:"#34d399",bg:"rgba(52,211,153,.08)",items:entregados},
          ].map(col=>(
            <div key={col.id} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r)",overflow:"hidden"}}>
              <div style={{padding:".6rem .75rem",borderTop:`2px solid ${col.color}`,background:col.bg,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:700,fontSize:"var(--fs-sm)",color:col.color}}>{col.label}</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,background:col.color+"22",color:col.color}}>{col.items.length}</span>
              </div>
              {col.items.length===0 && <div style={{padding:"1rem",textAlign:"center",fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-dim)"}}>—</div>}
              {col.items.map(c=>{
                const pcfg=getCfg(c.patNivel);
                const isEditing = editingCont === `${c.patId}-${c.id}`;
                return(
                  isEditing ? (
                    <div key={c.patId+"-"+c.id} style={{margin:".35rem .4rem 0",background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:`3px solid ${pcfg.color}`,borderRadius:7,padding:".5rem .65rem",display:"flex",flexDirection:"column",gap:".45rem"}} onClick={e=>e.stopPropagation()}>
                      <input list="cont-options" className="inp" placeholder="Escribe un tipo o elige..." value={editC.tipo} onChange={e => setEditC(x => ({ ...x, tipo: e.target.value }))} />
                      <input className="inp" placeholder="Detalle (opcional)..." value={editC.detalle} onChange={e => setEditC(x => ({ ...x, detalle: e.target.value }))} />
                      <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => setEditingCont(null)}>Cancelar</button>
                        <button className="btn btn-sm btn-gold" onClick={() => { updateContraprestacion(c.patId, c.id, editC); setEditingCont(null); }}>Guardar</button>
                      </div>
                    </div>
                  ) : (
                  <div key={c.patId+"-"+c.id} style={{margin:".35rem .4rem 0",background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:`3px solid ${pcfg.color}`,borderRadius:7,padding:".5rem .65rem",cursor:"pointer"}}
                    onClick={()=>{ const p=pats.find(x=>x.id===c.patId); if(p) onDetalle(p); }}>
                    <div style={{fontWeight:700,fontSize:"var(--fs-sm)",marginBottom:".15rem"}}>{c.tipo}</div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>{pcfg.icon} {c.patNombre}</div>
                    {c.detalle&&<div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-dim)",marginTop:".1rem"}}>{c.detalle}</div>}
                    <div style={{marginTop:".35rem", display:"flex", justifyContent:"space-between", alignItems:"center"}} onClick={e=>e.stopPropagation()}>
                      <button style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".12rem .4rem",borderRadius:4,
                        border:`1px solid ${col.id==="pendiente"?"rgba(52,211,153,.3)":"rgba(248,113,113,.3)"}`,
                        background:col.id==="pendiente"?"var(--green-dim)":"var(--red-dim)",
                        color:col.id==="pendiente"?"var(--green)":"var(--red)",cursor:"pointer"}}
                        onClick={()=>updateContraprestacion(c.patId,c.id,"estado",col.id==="pendiente"?"entregado":"pendiente")}>
                        {col.id==="pendiente"?"✓ Entregar":"↩ Reabrir"}
                      </button>
                      <div style={{display:"flex", gap:".3rem"}}>
                        <button className="btn btn-sm btn-ghost" onClick={() => { setEditingCont(`${c.patId}-${c.id}`); setEditC({ tipo: c.tipo, detalle: c.detalle||"", fechaEntrega: c.fechaEntrega||"" }); }} aria-label="Editar">✏️</button>
                        <button className="btn btn-sm btn-red" onClick={() => deleteContraprestacion(c.patId, c.id)} aria-label="Cerrar">✕</button>
                      </div>
                    </div>
                  </div>
                  )
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── LISTA (resumen rápido + por patrocinador) ── */}
      {!vistaKanban && (<>
      {/* Resumen rápido */}
      <div className="twocol" style={{ marginBottom: ".85rem" }}>
        <div className="card" style={{ background: "rgba(248,113,113,.04)", border: "1px solid rgba(248,113,113,.15)" }}>
          <div className="ct" style={{ color: "#f87171" }}>⏳ Pendientes de entregar ({pendientes.length})</div>
          {pendientes.length === 0 && <div className="empty">¡Todo entregado! 🎉</div>}
          {pendientes.slice(0, 6).map(c => 
            editingCont === `${c.patId}-${c.id}` ? (
              <div key={"edit"+c.patId+"-"+c.id} style={{ display: "flex", flexDirection: "column", gap: ".45rem", padding: ".5rem", borderBottom: "1px solid rgba(30,45,80,.25)" }} onClick={e=>e.stopPropagation()}>
                <input list="cont-options" className="inp" placeholder="Escribe un tipo o elige..." value={editC.tipo} onChange={e => setEditC(x => ({ ...x, tipo: e.target.value }))} />
                <input className="inp" placeholder="Detalle..." value={editC.detalle} onChange={e => setEditC(x => ({ ...x, detalle: e.target.value }))} />
                <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditingCont(null)}>Cancelar</button>
                  <button className="btn btn-sm btn-gold" onClick={() => { updateContraprestacion(c.patId, c.id, editC); setEditingCont(null); }}>Guardar</button>
                </div>
              </div>
            ) : (
            <div key={c.patId + "-" + c.id} style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".35rem 0", borderBottom: "1px solid rgba(30,45,80,.25)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: getCfg(c.patNivel).color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.tipo}</div>
                <div className="mono xs muted">{c.patNombre}</div>
              </div>
              <div style={{display:"flex", gap:".25rem", flexShrink:0}}>
                <button className="btn btn-sm" style={{ background: "var(--green-dim)", color: "var(--green)", border: "1px solid rgba(52,211,153,.2)" }}
                  onClick={() => updateContraprestacion(c.patId, c.id, "estado", "entregado")}>Entregar</button>
                <button className="btn btn-sm btn-ghost" onClick={() => { setEditingCont(`${c.patId}-${c.id}`); setEditC({ tipo: c.tipo, detalle: c.detalle||"", fechaEntrega: c.fechaEntrega||"" }); }} aria-label="Editar">✏️</button>
                <button className="btn btn-sm btn-red" onClick={() => deleteContraprestacion(c.patId, c.id)} aria-label="Cerrar">✕</button>
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ background: "rgba(52,211,153,.04)", border: "1px solid rgba(52,211,153,.15)" }}>
          <div className="ct" style={{ color: "#34d399" }}>✅ Entregados ({entregados.length})</div>
          {entregados.length === 0 && <div className="empty">Ninguno entregado aún</div>}
          {entregados.slice(0, 6).map(c => 
            editingCont === `${c.patId}-${c.id}` ? (
              <div key={"edit"+c.patId+"-"+c.id} style={{ display: "flex", flexDirection: "column", gap: ".45rem", padding: ".5rem", borderBottom: "1px solid rgba(30,45,80,.25)" }} onClick={e=>e.stopPropagation()}>
                <input list="cont-options" className="inp" placeholder="Escribe un tipo o elige..." value={editC.tipo} onChange={e => setEditC(x => ({ ...x, tipo: e.target.value }))} />
                <input className="inp" placeholder="Detalle..." value={editC.detalle} onChange={e => setEditC(x => ({ ...x, detalle: e.target.value }))} />
                <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditingCont(null)}>Cancelar</button>
                  <button className="btn btn-sm btn-gold" onClick={() => { updateContraprestacion(c.patId, c.id, editC); setEditingCont(null); }}>Guardar</button>
                </div>
              </div>
            ) : (
            <div key={c.patId + "-" + c.id} style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".35rem 0", borderBottom: "1px solid rgba(30,45,80,.25)" }}>
              <div style={{ color: "#34d399", fontSize: "var(--fs-base)", flexShrink: 0 }}>✓</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "line-through", color: "var(--text-muted)" }}>{c.tipo}</div>
                <div className="mono xs muted">{c.patNombre}</div>
              </div>
              <div style={{display:"flex", gap:".25rem", flexShrink:0}}>
                <button className="btn btn-sm" style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}
                  onClick={() => updateContraprestacion(c.patId, c.id, "estado", "pendiente")}>↩ Reabrir</button>
                <button className="btn btn-sm btn-ghost" onClick={() => { setEditingCont(`${c.patId}-${c.id}`); setEditC({ tipo: c.tipo, detalle: c.detalle||"", fechaEntrega: c.fechaEntrega||"" }); }} aria-label="Editar">✏️</button>
                <button className="btn btn-sm btn-red" onClick={() => deleteContraprestacion(c.patId, c.id)} aria-label="Cerrar">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Por patrocinador */}
      <div className="ct" style={{ marginBottom: ".5rem" }}>Compromisos por patrocinador</div>
      {activosFiltrados.map(p => {
        const cfg = getCfg(p.nivel);
        const pend = (p.contraprestaciones || []).filter(c => c.estado === "pendiente").length;
        const entr = (p.contraprestaciones || []).filter(c => c.estado === "entregado").length;
        return (
          <div key={p.id} className="card" style={{ marginBottom: ".6rem", borderLeftWidth: 3, borderLeftColor: cfg.color, cursor:"pointer" }} onClick={()=>onDetalle(p)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                <span style={{ fontSize: "var(--fs-lg)" }}>{cfg.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>{p.nombre}</div>
                  <div className="mono xs muted">{p.contraprestaciones.length} compromisos · {pend} pendientes · {entr} entregados</div>
                </div>
              </div>
              <button className="btn btn-sm" style={{ background: cfg.dim, color: cfg.color, border: `1px solid ${cfg.border}` }}
                onClick={e=>{e.stopPropagation();setAddingTo(addingTo === p.id ? null : p.id)}}>+ Añadir</button>
            </div>

            {p.contraprestaciones.length === 0 && addingTo !== p.id && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-dim)", padding: ".5rem 0" }}>Sin compromisos registrados</div>
            )}

            {p.contraprestaciones.map(c => 
              editingCont === `${p.id}-${c.id}` ? (
                <div key={"edit"+c.id} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: ".65rem", marginTop: ".4rem", display: "flex", flexDirection: "column", gap: ".45rem" }} onClick={e=>e.stopPropagation()}>
                  <input list="cont-options" className="inp" placeholder="Escribe un tipo o elige..." value={editC.tipo} onChange={e => setEditC(x => ({ ...x, tipo: e.target.value }))} />
                  <input className="inp" placeholder="Detalle (tamaño logo, nº posts, etc.)" value={editC.detalle} onChange={e => setEditC(x => ({ ...x, detalle: e.target.value }))} />
                  <div>
                    <label className="fl">Fecha límite entrega <span className="muted" style={{fontWeight:400}}>(opcional)</span></label>
                    <input className="inp" type="date" value={editC.fechaEntrega || ""} onChange={e => setEditC(x => ({ ...x, fechaEntrega: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditingCont(null)}>Cancelar</button>
                    <button className="btn btn-sm btn-gold" onClick={() => { updateContraprestacion(p.id, c.id, editC); setEditingCont(null); }}>Guardar</button>
                  </div>
                </div>
              ) : (
              <div key={c.id} className={cls("cont-row", c.estado === "entregado" && "cont-done")} onClick={e=>e.stopPropagation()}>
                <button className="ckbox" onClick={() => updateContraprestacion(p.id, c.id, "estado", c.estado === "entregado" ? "pendiente" : "entregado")}
                  style={{ borderColor: c.estado === "entregado" ? "#34d399" : "var(--border)", background: c.estado === "entregado" ? "#34d399" : "transparent" }}>
                  {c.estado === "entregado" && <span style={{ color: "#000", fontSize: "var(--fs-sm)", fontWeight: 800 }}>✓</span>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-base)", fontWeight: 600, color: c.estado === "entregado" ? "var(--text-muted)" : "var(--text)", textDecoration: c.estado === "entregado" ? "line-through" : "none" }}>{c.tipo}</div>
                  {c.detalle && <div className="mono xs muted">{c.detalle}</div>}
                </div>
                {c.estado !== "entregado" && (() => {
                  if (!c.fechaEntrega) return null;
                  const dias = Math.ceil((new Date(c.fechaEntrega) - new Date()) / 86400000);
                  if (dias < 0)  return <span key="urg" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,background:"var(--red-dim)",color:"var(--red)",fontWeight:700,flexShrink:0}}>⚠ {Math.abs(dias)}d vencida</span>;
                  if (dias === 0) return <span key="urg" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,background:"var(--amber-dim)",color:"var(--amber)",fontWeight:700,flexShrink:0}}>🔔 HOY</span>;
                  if (dias <= 7) return <span key="urg" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,background:"var(--amber-dim)",color:"var(--amber)",fontWeight:700,flexShrink:0}}>📅 {dias}d</span>;
                  return <span key="urg" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-dim)",flexShrink:0}}>📅 {c.fechaEntrega}</span>;
                })()}
                <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setEditingCont(`${p.id}-${c.id}`); setEditC({ tipo: c.tipo, detalle: c.detalle||"", fechaEntrega: c.fechaEntrega||"" }); }} aria-label="Editar">✏️</button>
                  <button className="btn btn-sm btn-red" onClick={() => deleteContraprestacion(p.id, c.id)} aria-label="Cerrar">✕</button>
                </div>
              </div>
            ))}

            {addingTo === p.id && (
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: ".75rem", marginTop: ".5rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <input list="cont-options" className="inp" placeholder="Escribe un tipo o elige..." value={newCont.tipo} onChange={e => setNewCont(x => ({ ...x, tipo: e.target.value }))} />
                <input className="inp" placeholder="Detalle (opcional)..." value={newCont.detalle} onChange={e => setNewCont(x => ({ ...x, detalle: e.target.value }))} />
                <div>
                  <label className="fl">Fecha límite entrega <span className="muted" style={{fontWeight:400}}>(opcional)</span></label>
                  <input className="inp" type="date" value={newCont.fechaEntrega} onChange={e => setNewCont(x => ({ ...x, fechaEntrega: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setAddingTo(null)}>Cancelar</button>
                  <button className="btn btn-gold" onClick={() => {
                    addContraprestacion(p.id, { ...newCont, estado: "pendiente" });
                    setNewCont({ tipo: CONTRAPRESTACIONES_TIPO[0], detalle: "", fechaEntrega: "", estado: "pendiente" });
                    setAddingTo(null);
                  }}>Añadir</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      </>)}
    </>
  );
}

// ─── MODAL DETALLE ────────────────────────────────────────────────────────────
function ModalDetalle({ pat, onClose, onEditar, updateContraprestacion, addContraprestacion, deleteContraprestacion, updateEstado, addDoc, deleteDoc, addEspecieItem, updateEspecieItem, deleteEspecieItem, config = {} }) {
  const { closing: detClosing, handleClose: detHandleClose } = useModalClose(onClose);
  const cfg = getCfg(pat.nivel);
  const ecfg = ESTADO_CFG[pat.estado];
  const [subTab, setSubTab] = useState("info");
  const [addingCont, setAddingCont] = useState(false);
  const [newC, setNewC] = useState({ tipo: CONTRAPRESTACIONES_TIPO[0], detalle: "", fechaEntrega: "" });
  const [addingEspecie, setAddingEspecie] = useState(false);
  const [newEsp, setNewEsp] = useState({ nombre: "", cantidad: 0, unidad: "unidades" });
  const [editingCont, setEditingCont] = useState(null);
  const [editC, setEditC] = useState({ tipo: CONTRAPRESTACIONES_TIPO[0], detalle: "", fechaEntrega: "" });
  const [editingEspecie, setEditingEspecie] = useState(null);
  const [editEsp, setEditEsp] = useState({ nombre: "", cantidad: 0, unidad: "unidades" });
  const especieItems = pat.especieItems || [];
  const esPatEspecie = pat.nivel === "Especie" || pat.especie > 0;

  return (
    <div className={`modal-backdrop${detClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target === e.currentTarget && detHandleClose()}>
      <div className={`modal modal-ficha${detClosing ? " modal-closing" : ""}`} style={{ maxWidth: 560 }}>
        <div style={{ borderBottom: `2px solid ${cfg.color}33` }}>
          <div className="modal-header" style={{ borderBottom: "none", paddingBottom: ".5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.dim, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-lg)" }}>{cfg.icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--fs-md)" }}>{pat.nombre}</div>
                <div className="mono xs muted">{pat.sector} · {pat.nivel}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: ".4rem" }}>
              {subTab === "info" && <button className="btn btn-sm btn-ghost" onClick={onEditar}>✏️ Editar patrocinador</button>}
              {subTab === "informe" && <button className="btn btn-sm btn-ghost" onClick={() => generarInformePDF(pat, config)}>
                ⬇ Descargar PDF
              </button>}
              <button className="btn btn-sm btn-ghost" onClick={detHandleClose}><span aria-hidden="true">✕</span></button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0", padding: "0 1.4rem" }}>
            {[["info","ℹ️ Info"],["cont","🎁 Compromisos"],["especie","📦 En especie"],["docs","📁 Documentos"],["informe","📄 Informe"]].map(([id,label]) => (
              <button key={id} onClick={() => setSubTab(id)}
                style={{ background:"none", border:"none", borderBottom: subTab===id ? `2px solid ${cfg.color}` : "2px solid transparent", color: subTab===id ? cfg.color : "var(--text-muted)", fontFamily:"Syne,sans-serif", fontSize:"var(--fs-sm)", fontWeight: subTab===id?700:500, padding:".4rem .75rem .5rem", cursor:"pointer", transition:"all .15s" }}>
                {label}
                {id==="docs" && (() => {
                  const nDocs = (pat.docs||[]).length;
                  return nDocs > 0 ? (
                    <span style={{ marginLeft:".3rem", background:cfg.dim, color:cfg.color, fontSize:"var(--fs-xs)", padding:".05rem .3rem", borderRadius:3, fontFamily:"var(--font-mono)" }}>{nDocs}</span>
                  ) : null;
                })()}
                {id==="cont" && (pat.contraprestaciones || []).filter(c=>c.estado==="pendiente").length > 0 && <span style={{ marginLeft:".3rem", background:"rgba(248,113,113,.12)", color:"#f87171", fontSize:"var(--fs-xs)", padding:".05rem .3rem", borderRadius:3, fontFamily:"var(--font-mono)" }}>{(pat.contraprestaciones || []).filter(c=>c.estado==="pendiente").length}</span>}
                {id==="especie" && especieItems.length > 0 && <span style={{ marginLeft:".3rem", background:cfg.dim, color:cfg.color, fontSize:"var(--fs-xs)", padding:".05rem .3rem", borderRadius:3, fontFamily:"var(--font-mono)" }}>{especieItems.length}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-body">
          {subTab === "info" && <><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
            {[
              ["Contacto", pat.contacto], ["Teléfono", pat.telefono || "—"],
              ["Email", pat.email || "—"], ["Importe", pat.especie > 0 ? `${fmtEur(pat.especie)} (especie)` : fmtEur(pat.importe)],
              ["Fecha acuerdo", pat.fechaAcuerdo || "—"], ["Vencimiento", pat.fechaVencimiento || "—"],
              ["Próx. seguimiento", pat.proximoContacto ? (() => {
                const dias = Math.ceil((new Date(pat.proximoContacto) - new Date()) / 86400000);
                return `${pat.proximoContacto}${dias < 0 ? " ⚠ vencido" : dias === 0 ? " — HOY" : dias <= 7 ? ` — ${dias}d` : ""}`;
              })() : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="fl">{k}</div>
                <div style={{ fontSize: "var(--fs-base)", fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Estado */}
          <div>
            <div className="fl">Estado del acuerdo</div>
            <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
              {ESTADOS.map(s => {
                const sc = ESTADO_CFG[s];
                const active = pat.estado === s;
                return (
                  <button key={s} className="btn btn-sm" onClick={() => updateEstado(pat.id, s)}
                    style={{ background: active ? sc.bg : "transparent", color: active ? sc.color : "var(--text-muted)", border: `1px solid ${active ? sc.color + "55" : "var(--border)"}`, fontWeight: active ? 700 : 400 }}>
                    {active && "● "}{sc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {pat.notas && (
            <div>
              <div className="fl">Notas</div>
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.5 }}>{pat.notas}</div>
            </div>
          )}

          {/* Log de contactos */}
          <LogContactos patId={pat.id} cfg={cfg} />
          </>}
          {subTab === "cont" && <><div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
              <div className="fl" style={{ margin: 0 }}>Contraprestaciones ({pat.contraprestaciones.length})</div>
              <button className="btn btn-sm" style={{ background: cfg.dim, color: cfg.color, border: `1px solid ${cfg.border}` }}
                onClick={() => setAddingCont(!addingCont)}>+ Añadir</button>
            </div>
            {pat.contraprestaciones.map(c => 
              editingCont === c.id ? (
                <div key={"edit"+c.id} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: ".65rem", marginTop: ".4rem", display: "flex", flexDirection: "column", gap: ".45rem" }}>
                  <input list="cont-options" className="inp" placeholder="Escribe un tipo o elige..." value={editC.tipo} onChange={e => setEditC(x => ({ ...x, tipo: e.target.value }))} />
                  <input className="inp" placeholder="Detalle (tamaño logo, nº posts, etc.)" value={editC.detalle} onChange={e => setEditC(x => ({ ...x, detalle: e.target.value }))} />
                  <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditingCont(null)}>Cancelar</button>
                    <button className="btn btn-sm btn-gold" onClick={() => { updateContraprestacion(pat.id, c.id, editC); setEditingCont(null); }}>Guardar</button>
                  </div>
                </div>
              ) : (
              <div key={c.id} className={cls("cont-row", c.estado === "entregado" && "cont-done")}>
                <button className="ckbox" onClick={() => updateContraprestacion(pat.id, c.id, "estado", c.estado === "entregado" ? "pendiente" : "entregado")}
                  style={{ borderColor: c.estado === "entregado" ? "#34d399" : "var(--border)", background: c.estado === "entregado" ? "#34d399" : "transparent" }}>
                  {c.estado === "entregado" && <span style={{ color: "#000", fontSize: "var(--fs-sm)", fontWeight: 800 }}>✓</span>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, textDecoration: c.estado === "entregado" ? "line-through" : "none", color: c.estado === "entregado" ? "var(--text-muted)" : "var(--text)" }}>{c.tipo}</div>
                  {c.detalle && <div className="mono xs muted">{c.detalle}</div>}
                </div>
                <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
                  {c.estado !== "entregado" && (() => {
                    if (!c.fechaEntrega) return null;
                    const dias = Math.ceil((new Date(c.fechaEntrega) - new Date()) / 86400000);
                    if (dias < 0)  return <span key="urg" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,background:"var(--red-dim)",color:"var(--red)",fontWeight:700}}>⚠ {Math.abs(dias)}d</span>;
                    if (dias === 0) return <span key="urg" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,background:"var(--amber-dim)",color:"var(--amber)",fontWeight:700}}>🔔 HOY</span>;
                    if (dias <= 7) return <span key="urg" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,background:"var(--amber-dim)",color:"var(--amber)",fontWeight:700}}>📅 {dias}d</span>;
                    return null;
                  })()}
                  <button className="btn btn-sm btn-ghost" onClick={() => { setEditingCont(c.id); setEditC({ tipo: c.tipo, detalle: c.detalle||"", fechaEntrega: c.fechaEntrega||"" }); }} aria-label="Editar">✏️</button>
                  <button className="btn btn-sm btn-red" onClick={() => deleteContraprestacion(pat.id, c.id)} aria-label="Cerrar">✕</button>
                </div>
              </div>
            ))}
            {pat.contraprestaciones.length === 0 && !addingCont && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-dim)" }}>Sin compromisos registrados</div>
            )}
            {addingCont && (
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: ".65rem", marginTop: ".4rem", display: "flex", flexDirection: "column", gap: ".45rem" }}>
                <input list="cont-options" className="inp" placeholder="Escribe un tipo o elige..." value={newC.tipo} onChange={e => setNewC(x => ({ ...x, tipo: e.target.value }))} />
                <input className="inp" placeholder="Detalle (tamaño logo, nº posts, etc.)" value={newC.detalle} onChange={e => setNewC(x => ({ ...x, detalle: e.target.value }))} />
                <div>
                  <label className="fl">Fecha límite entrega <span className="muted" style={{fontWeight:400}}>(opcional)</span></label>
                  <input className="inp" type="date" value={newC.fechaEntrega} onChange={e => setNewC(x => ({ ...x, fechaEntrega: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setAddingCont(false)}>Cancelar</button>
                  <button className="btn btn-gold" onClick={() => { addContraprestacion(pat.id, { ...newC, estado: "pendiente" }); setAddingCont(false); }}>Añadir</button>
                </div>
              </div>
            )}
          </div>
          </>}

          {/* ── EN ESPECIE TAB ── */}
          {subTab === "especie" && <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".6rem" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>📦 Productos / servicios en especie</div>
                <div className="mono xs muted">{especieItems.filter(i=>i.recibido).length} recibidos · {especieItems.filter(i=>!i.recibido).length} pendientes</div>
              </div>
              <button className="btn btn-sm" style={{ background: cfg.dim, color: cfg.color, border: `1px solid ${cfg.border}` }}
                onClick={() => setAddingEspecie(!addingEspecie)}>+ Añadir ítem</button>
            </div>
            {especieItems.length === 0 && !addingEspecie && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-dim)", textAlign: "center", padding: "1rem 0" }}>
                Sin ítems en especie registrados. Usa el botón + Añadir ítem.
              </div>
            )}
            {especieItems.map(item => 
              editingEspecie === item.id ? (
                <div key={"edit"+item.id} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: ".65rem", marginTop: ".4rem", display: "flex", flexDirection: "column", gap: ".45rem" }}>
                  <input className="inp" placeholder="Nombre del producto/servicio" value={editEsp.nombre} onChange={e => setEditEsp(x => ({ ...x, nombre: e.target.value }))} />
                  <div style={{ display: "flex", gap: ".4rem" }}>
                    <input type="number" min="0" className="inp" placeholder="Cantidad" value={editEsp.cantidad} onChange={e => setEditEsp(x => ({ ...x, cantidad: parseInt(e.target.value) || 0 }))} style={{ flex: 1 }} />
                    <input className="inp" placeholder="Unidad (uds, kg, litros…)" value={editEsp.unidad} onChange={e => setEditEsp(x => ({ ...x, unidad: e.target.value }))} style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditingEspecie(null)}>Cancelar</button>
                    <button className="btn btn-sm btn-gold" onClick={() => { if(editEsp.nombre.trim()){ updateEspecieItem(pat.id, item.id, editEsp); setEditingEspecie(null); } }}>Guardar</button>
                  </div>
                </div>
              ) : (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: ".6rem", padding: ".45rem 0", borderBottom: "1px solid rgba(30,45,80,.25)" }}>
                <button onClick={() => updateEspecieItem(pat.id, item.id, "recibido", !item.recibido)}
                  style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${item.recibido ? "#34d399" : "var(--border)"}`, background: item.recibido ? "#34d399" : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.recibido && <span style={{ color: "#000", fontSize: "var(--fs-sm)", fontWeight: 800 }}>✓</span>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-base)", fontWeight: 600, textDecoration: item.recibido ? "line-through" : "none", color: item.recibido ? "var(--text-muted)" : "var(--text)" }}>{item.nombre}</div>
                  <div className="mono xs muted">{item.cantidad} {item.unidad}</div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".1rem .4rem", borderRadius: 4,
                  background: item.recibido ? "rgba(52,211,153,.12)" : "rgba(251,191,36,.1)",
                  color: item.recibido ? "#34d399" : "#fbbf24" }}>
                  {item.recibido ? "✓ Recibido" : "⏳ Pendiente"}
                </span>
                <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setEditingEspecie(item.id); setEditEsp({ nombre: item.nombre, cantidad: item.cantidad, unidad: item.unidad }); }} aria-label="Editar">✏️</button>
                  <button className="btn btn-sm btn-red" onClick={() => deleteEspecieItem(pat.id, item.id)} aria-label="Cerrar">✕</button>
                </div>
              </div>
            ))}
            {addingEspecie && (
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: ".65rem", marginTop: ".4rem", display: "flex", flexDirection: "column", gap: ".45rem" }}>
                <input className="inp" placeholder="Nombre del producto/servicio" value={newEsp.nombre} onChange={e => setNewEsp(x => ({ ...x, nombre: e.target.value }))} />
                <div style={{ display: "flex", gap: ".4rem" }}>
                  <input type="number" min="0" className="inp" placeholder="Cantidad" value={newEsp.cantidad} onChange={e => setNewEsp(x => ({ ...x, cantidad: parseInt(e.target.value) || 0 }))} style={{ flex: 1 }} />
                  <input className="inp" placeholder="Unidad (uds, kg, litros…)" value={newEsp.unidad} onChange={e => setNewEsp(x => ({ ...x, unidad: e.target.value }))} style={{ flex: 1 }} />
                </div>
                <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setAddingEspecie(false)}>Cancelar</button>
                  <button className="btn btn-gold" onClick={() => {
                    if (newEsp.nombre.trim()) { addEspecieItem(pat.id, { ...newEsp, recibido: false }); setNewEsp({ nombre: "", cantidad: 0, unidad: "unidades" }); setAddingEspecie(false); }
                  }}>Añadir</button>
                </div>
              </div>
            )}
          </>}

          {/* ── DOCUMENTOS TAB ── */}
          {subTab === "docs" && <DocManager pat={pat} addDoc={addDoc} deleteDoc={deleteDoc} cfg={cfg} />}

          {/* ── INFORME TAB ── */}
          {subTab === "informe" && <InformePatrocinador pat={pat} cfg={cfg} config={config} />}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ─── INFORME PATROCINADOR ─────────────────────────────────────────────────────

function generarInformePDF(pat, config = {}) {
  const evento = config.nombre || "Trail El Guerrero 2026";
  const fecha  = config.fecha  || "2026-08-29";
  const lugar  = config.lugar  || "Candeleda, Ávila";
  const org    = config.organizador || "Organización Trail El Guerrero";

  const contEntregadas = (pat.contraprestaciones || []).filter(c => c.estado === "entregado");
  const contPendientes = (pat.contraprestaciones || []).filter(c => c.estado === "pendiente");

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe patrocinador — ${pat.nombre}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; max-width: 750px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #22d3ee; }
    .evento-nombre { font-size: 22px; font-weight: 800; color: var(--surface); }
    .evento-meta { font-size: 12px; color: #666; margin-top: 4px; font-family: monospace; }
    .pat-block { background: #f8faff; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px; border-left: 4px solid #22d3ee; }
    .pat-nombre { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
    .pat-nivel { display: inline-block; background: #22d3ee22; color: var(--cyan); font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 20px; font-family: monospace; border: 1px solid #22d3ee44; }
    .seccion-titulo { font-size: 13px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin: 20px 0 10px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .dato { background: #f0f4ff; border-radius: 8px; padding: 10px 14px; }
    .dato-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; font-family: monospace; margin-bottom: 3px; }
    .dato-valor { font-size: 15px; font-weight: 700; color: #1a1a2e; }
    .cont-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
    .cont-done { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .cont-pend { background: #fffbeb; border: 1px solid #fde68a; }
    .ck { display: inline-block; width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; }
    .ck-done { background: #22c55e; }
    .ck-pend { background: #d1d5db; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; font-family: monospace; display: flex; justify-content: space-between; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="evento-nombre">🏔️ ${evento}</div>
      <div class="evento-meta">${fecha} · ${lugar}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:13px;font-weight:700;color:#22d3ee">INFORME DE PATROCINIO</div>
      <div style="font-size:11px;color:#999;font-family:monospace">${new Date().toLocaleDateString("es-ES")}</div>
    </div>
  </div>

  <div class="pat-block">
    <div class="pat-nombre">${pat.nombre}</div>
    <span class="pat-nivel">${pat.nivel || "Patrocinador"}</span>
    ${pat.contacto ? `<div style="margin-top:8px;font-size:12px;color:#555">👤 ${pat.contacto}${pat.email ? ` · ${pat.email}` : ""}${pat.telefono ? ` · ${pat.telefono}` : ""}</div>` : ""}
  </div>

  <div class="seccion-titulo">Acuerdo económico</div>
  <div class="grid-2">
    <div class="dato">
      <div class="dato-label">Importe acordado</div>
      <div class="dato-valor">${(pat.importe || 0).toLocaleString("es-ES")} €</div>
    </div>
    <div class="dato">
      <div class="dato-label">Cobrado</div>
      <div class="dato-valor">${(pat.importeCobrado || 0).toLocaleString("es-ES")} €</div>
    </div>
    ${pat.fechaAcuerdo ? `<div class="dato"><div class="dato-label">Fecha acuerdo</div><div class="dato-valor">${pat.fechaAcuerdo}</div></div>` : ""}
    <div class="dato">
      <div class="dato-label">Estado</div>
      <div class="dato-valor">${pat.estado || "—"}</div>
    </div>
  </div>

  ${(pat.contraprestaciones || []).length > 0 ? `
  <div class="seccion-titulo">Contraprestaciones (${contEntregadas.length}/${(pat.contraprestaciones||[]).length} entregadas)</div>
  ${contEntregadas.map(c => `
    <div class="cont-row cont-done">
      <span class="ck ck-done"></span>
      <span><strong>${c.tipo}</strong>${c.detalle ? ` — ${c.detalle}` : ""}</span>
      <span style="margin-left:auto;font-size:11px;color:#16a34a;font-family:monospace">✓ Entregado</span>
    </div>`).join("")}
  ${contPendientes.map(c => `
    <div class="cont-row cont-pend">
      <span class="ck ck-pend"></span>
      <span><strong>${c.tipo}</strong>${c.detalle ? ` — ${c.detalle}` : ""}${c.fechaEntrega ? ` · límite ${c.fechaEntrega}` : ""}</span>
      <span style="margin-left:auto;font-size:11px;color:#d97706;font-family:monospace">Pendiente</span>
    </div>`).join("")}
  ` : "<p style='font-size:13px;color:#999'>Sin contraprestaciones registradas.</p>"}

  ${pat.notas ? `<div class="seccion-titulo">Notas</div><div style="background:#f8faff;border-radius:8px;padding:12px 16px;font-size:13px;line-height:1.6;color:#555">${pat.notas}</div>` : ""}

  <div class="footer">
    <span>${org}</span>
    <span>Generado el ${new Date().toLocaleDateString("es-ES", {day:"2-digit",month:"long",year:"numeric"})}</span>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `informe-${(pat.nombre||"patrocinador").toLowerCase().replace(/\s+/g,"-")}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast.success(`Informe de ${pat.nombre || "patrocinador"} descargado`);
}

function InformePatrocinador({ pat, cfg, config = {} }) {
  const contEntregadas = (pat.contraprestaciones || []).filter(c => c.estado === "entregado");
  const contPendientes = (pat.contraprestaciones || []).filter(c => c.estado === "pendiente");
  const evento = config.nombre || "Trail El Guerrero 2026";
  const fecha  = config.fecha  || "2026-08-29";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
      {/* Cabecera del informe */}
      <div style={{ padding: ".75rem 1rem", background: `${cfg.color}10`,
        borderRadius: 10, border: `1px solid ${cfg.color}30` }}>
        <div style={{ fontWeight: 700, fontSize: "var(--fs-md)" }}>{pat.nombre}</div>
        <div className="mono xs muted">{pat.nivel} · {pat.sector}</div>
      </div>

      {/* Acuerdo económico */}
      <div>
        <div className="ct" style={{ marginBottom: ".5rem" }}>Acuerdo económico</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
          {[
            ["Importe", `${(pat.importe||0).toLocaleString("es-ES")} €`],
            ["Cobrado", `${(pat.importeCobrado||0).toLocaleString("es-ES")} €`],
            ["Estado", pat.estado || "—"],
            ["Fecha acuerdo", pat.fechaAcuerdo || "—"],
          ].map(([k,v]) => (
            <div key={k} style={{ background:"var(--surface2)", borderRadius:8, padding:".5rem .75rem" }}>
              <div className="mono xs muted">{k}</div>
              <div style={{ fontSize:"var(--fs-base)", fontWeight:700, marginTop:".15rem" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contraprestaciones */}
      {(pat.contraprestaciones||[]).length > 0 && (
        <div>
          <div className="ct" style={{ marginBottom: ".5rem" }}>
            Contraprestaciones · {contEntregadas.length}/{(pat.contraprestaciones||[]).length} entregadas
          </div>
          {[...contEntregadas, ...contPendientes].map(c => (
            <div key={c.id||c.tipo} style={{ display:"flex", alignItems:"center", gap:".5rem",
              padding:".4rem .65rem", borderRadius:6, marginBottom:".3rem",
              background: c.estado==="entregado" ? "rgba(52,211,153,.08)" : "rgba(251,191,36,.07)",
              border: `1px solid ${c.estado==="entregado" ? "rgba(52,211,153,.25)" : "rgba(251,191,36,.25)"}` }}>
              <span style={{ fontSize:"var(--fs-sm)" }}>{c.estado==="entregado" ? "✅" : "⏳"}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:"var(--fs-base)", fontWeight:600 }}>{c.tipo}</div>
                {c.detalle && <div className="mono xs muted">{c.detalle}</div>}
              </div>
              {c.fechaEntrega && c.estado !== "entregado" && (
                <span className="mono" style={{ fontSize:"var(--fs-xs)", color:"var(--amber)", flexShrink:0 }}>
                  📅 {c.fechaEntrega}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notas */}
      {pat.notas && (
        <div>
          <div className="ct" style={{ marginBottom: ".5rem" }}>Notas internas</div>
          <div style={{ background:"var(--surface2)", borderRadius:8, padding:".65rem .85rem",
            fontSize:"var(--fs-base)", lineHeight:1.6, color:"var(--text-muted)" }}>
            {pat.notas}
          </div>
        </div>
      )}

      {/* Acción de descarga */}
      <div style={{ paddingTop:".5rem", borderTop:"1px solid var(--border)" }}>
        <div className="mono xs muted" style={{ marginBottom:".5rem" }}>
          Descarga el informe en HTML — imprimible desde el navegador como PDF
        </div>
        <button className="btn btn-ghost btn-sm"
          onClick={() => generarInformePDF(pat, config)}>
          ⬇ Descargar informe HTML
        </button>
      </div>
    </div>
  );
}

// ─── MODAL PAT (crear / editar) ───────────────────────────────────────────────
function ModalPat({ data, onSave, onClose }) {
  const { closing: mpClosing, handleClose: mpHandleClose } = useModalClose(onClose);
  const [form, setForm] = useState(data ? { ...data } : {
    nombre: "", sector: SECTORES[0], nivel: "Plata", contacto: "", telefono: "", email: "",
    importe: 0, importeCobrado: 0, especie: 0, estado: "prospecto",
    fechaAcuerdo: "", fechaVencimiento: "", proximoContacto: "", notas: "", docs: [],
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
            <input className="inp" value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Decathlon Ávila" />
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

          <div>
            <label className="fl">Notas internas</label>
            <textarea className="inp" rows={3} value={form.notas} onChange={e => upd("notas", e.target.value)}
              placeholder="Condiciones especiales, observaciones, historial de contactos..." style={{ resize: "vertical" }} />
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
function DocManager({ pat, addDoc, deleteDoc, cfg }) {
  const [uploadError, setUploadError] = useState(null);
  const API  = "/api/docs/" + pat.id;
  const AKEY = import.meta.env.VITE_API_KEY || "";
  const headers = { "Content-Type": "application/json", "x-api-key": AKEY };

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
        const res = await fetch(API, { method:"POST", headers, body: JSON.stringify(body) });
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
    await fetch(`${API}?docId=${docId}`, { method:"DELETE", headers });
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


// ─── LOG DE CONTACTOS ─────────────────────────────────────────────────────────
function LogContactos({ patId, cfg }) {
  const LS_LOG = `teg_pat_log_${patId}`;
  const [logs, setLogs] = useData(LS_LOG, []);
  const safeLogs = Array.isArray(logs) ? logs : [];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ fecha: new Date().toISOString().split("T")[0], tipo: "Llamada", nota: "" });

  const TIPOS_LOG = ["Llamada", "Email", "Reunión", "WhatsApp", "Otro"];

  const addLog = () => {
    if (!form.nota.trim()) return;
    const nuevo = { id: Date.now(), ...form };
    setLogs([nuevo, ...safeLogs]);
    setForm({ fecha: new Date().toISOString().split("T")[0], tipo: "Llamada", nota: "" });
    setAdding(false);
  };

  const deleteLog = (id) => setLogs(safeLogs.filter(l => l.id !== id));

  const TIPO_ICONS = { Llamada:"📞", Email:"✉️", Reunión:"🤝", WhatsApp:"💬", Otro:"📝" };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".4rem" }}>
        <div className="fl" style={{ margin:0 }}>📋 Log de contactos ({safeLogs.length})</div>
        <button className="btn btn-sm" style={{ background:cfg.dim, color:cfg.color, border:`1px solid ${cfg.border}` }}
          onClick={() => setAdding(v => !v)}>
          {adding ? "✕ Cancelar" : "+ Registrar"}
        </button>
      </div>

      {adding && (
        <div style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8, padding:".65rem", marginBottom:".5rem", display:"flex", flexDirection:"column", gap:".45rem" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".5rem" }}>
            <input className="inp" type="date" value={form.fecha} onChange={e => setForm(p=>({...p,fecha:e.target.value}))} />
            <select className="inp" value={form.tipo} onChange={e => setForm(p=>({...p,tipo:e.target.value}))}>
              {TIPOS_LOG.map(t => <option key={t} value={t}>{TIPO_ICONS[t]} {t}</option>)}
            </select>
          </div>
          <input className="inp" placeholder="Resultado del contacto, próximo paso..." value={form.nota}
            onChange={e => setForm(p=>({...p,nota:e.target.value}))}
            onKeyDown={e => e.key === "Enter" && addLog()} />
          <div style={{ display:"flex", justifyContent:"flex-end", gap:".4rem" }}>
            <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancelar</button>
            <button className="btn" style={{ background:cfg.dim, color:cfg.color, border:`1px solid ${cfg.border}` }}
              onClick={addLog}>Guardar</button>
          </div>
        </div>
      )}

      {safeLogs.length === 0 && !adding && (
        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", color:"var(--text-dim)", padding:".4rem 0" }}>
          Sin contactos registrados
        </div>
      )}

      {safeLogs.slice(0, 5).map(l => (
        <div key={l.id} style={{ display:"flex", gap:".5rem", alignItems:"flex-start", padding:".35rem 0", borderBottom:"1px solid rgba(30,45,80,.2)" }}>
          <span style={{ fontSize:"var(--fs-base)", flexShrink:0, marginTop:".05rem" }}>{TIPO_ICONS[l.tipo]||"📝"}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:"var(--fs-sm)", fontWeight:600, lineHeight:1.4 }}>{l.nota}</div>
            <div className="mono xs muted">{l.tipo} · {l.fecha}</div>
          </div>
          <button className="btn btn-sm btn-red" style={{ flexShrink:0, opacity:.6 }}
            onClick={() => deleteLog(l.id)}>✕</button>
        </div>
      ))}
      {safeLogs.length > 5 && (
        <div className="mono xs muted" style={{ marginTop:".3rem" }}>+{safeLogs.length - 5} contactos más</div>
      )}
    </div>
  );
}

// ─── TAB DOCUMENTOS (vista global) ────────────────────────────────────────────
function TabDocumentos({ pats, addDoc, deleteDoc }) {
  const [preview, setPreview] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroPat, setFiltroPat] = useState("todos");

  const allDocs = pats.flatMap(p => (p.docs || []).map(d => ({ ...d, patNombre: p.nombre, patId: p.id, patNivel: p.nivel })));
  const filtrados = allDocs.filter(d => {
    const mt = filtroTipo === "todos" || d.tipo === filtroTipo;
    const mp = filtroPat === "todos" || String(d.patId) === filtroPat;
    return mt && mp;
  });

  const totalBytes = allDocs.reduce((s, d) => s + (d.size || 0), 0);
  const pctLS = Math.min((totalBytes / (5 * 1024 * 1024)) * 100, 100).toFixed(0);
  const MIME_ICONS = { "application/pdf": "📄", "image/png": "🖼️", "image/jpeg": "🖼️", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊" };
  const getIcon = (mime) => MIME_ICONS[mime] || "📎";

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📁 Documentos</div>
          <div className="pd">{allDocs.length} documentos adjuntos en {pats.filter(p=>(p.docs||[]).length>0).length} patrocinadores</div>
        </div>
      </div>

      {/* Uso de almacenamiento */}
      <div className="card" style={{ marginBottom: ".75rem", background: parseFloat(pctLS) > 70 ? "rgba(248,113,113,.04)" : "var(--surface)", borderColor: parseFloat(pctLS) > 70 ? "rgba(248,113,113,.2)" : "var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".4rem" }}>
          <span style={{ fontSize: "var(--fs-sm)", fontWeight: 600 }}>💾 Almacenamiento local utilizado</span>
          <span className="mono xs" style={{ color: parseFloat(pctLS) > 70 ? "#f87171" : "var(--text-muted)" }}>{(totalBytes/1024).toFixed(0)} KB · {pctLS}% del límite</span>
        </div>
        <div className="pbar">
          <div className="pfill" style={{ width: `${pctLS}%`, background: parseFloat(pctLS) > 70 ? "#f87171" : parseFloat(pctLS) > 40 ? "#fbbf24" : "#34d399" }} />
        </div>
        {parseFloat(pctLS) > 70 && (
          <div className="mono xs" style={{ color: "#f87171", marginTop: ".4rem" }}>
            ⚠️ Espacio escaso. Considera eliminar documentos antiguos o usar enlaces externos (Google Drive, Dropbox).
          </div>
        )}
        <div className="mono xs muted" style={{ marginTop: ".4rem" }}>
          Los documentos se guardan en el navegador (localStorage). Para compartirlos entre dispositivos, usa el botón "Bajar" y guárdalos en la nube.
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: ".75rem" }}>
        <select className="inp" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ width: "auto" }}>
          <option value="todos">Todos los tipos</option>
          {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="inp" value={filtroPat} onChange={e => setFiltroPat(e.target.value)} style={{ width: "auto" }}>
          <option value="todos">Todos los patrocinadores</option>
          {pats.filter(p=>(p.docs||[]).length>0).map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
        </select>
        {(filtroTipo !== "todos" || filtroPat !== "todos") && (
          <button className="btn btn-ghost" onClick={() => { setFiltroTipo("todos"); setFiltroPat("todos"); }}>✕ Limpiar</button>
        )}
      </div>

      {/* Grid de documentos */}
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
                <div className="mono xs muted">{d.fecha} · {(d.size/1024).toFixed(0)} KB</div>
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

      {/* Preview */}
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

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  /* Layout dos columnas */
  .twocol { display: grid; grid-template-columns: 1fr 1fr; gap: .85rem; }
  @media(max-width:700px) { .twocol { grid-template-columns: 1fr; } }

  /* Estado vacío */

  /* Patrocinadores — solo estilos específicos de este bloque */

  /* Page layout */

  /* KPIs propios (clases c-* para colores) */

  /* Card objetivo */
  .obj-card{background:linear-gradient(135deg,var(--surface) 0%,rgba(245,158,11,.04) 100%);border-color:rgba(245,158,11,.2)}
  .ct{font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.75rem;color:var(--text-muted)}
  .pbar{height:5px;background:var(--surface3);border-radius:3px;overflow:hidden}
  .pfill{height:100%;border-radius:3px;transition:width .6s cubic-bezier(.4,0,.2,1)}

  /* Pat row */
  .pat-row{background:var(--surface);border:1px solid var(--border);border-left:3px solid;border-radius:var(--r);padding:.85rem;display:flex;gap:.85rem;align-items:flex-start;transition:all .15s;cursor:pointer}
  .pat-row:hover{border-color:var(--border-light);box-shadow:0 2px 12px rgba(0,0,0,.3);transform:translateY(-1px)}
  .pat-nivel{width:52px;flex-shrink:0;border-radius:10px;padding:.5rem .35rem;display:flex;flex-direction:column;align-items:center;gap:.25rem}
  @media(max-width:640px){
    .pat-row{flex-direction:column;align-items:flex-start;gap:0.75rem;position:relative;padding-top:1.25rem}
    .pat-row > div:last-child{width:100%;align-items:flex-start!important;margin-top:0.5rem;padding-top:0.75rem;border-top:1px solid var(--border)}
    .pat-nivel{position:absolute;top:0.75rem;right:1rem;width:40px!important;height:40px!important}
  }

  /* Recientes */
  .rec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.6rem}
  .rec-card{background:var(--surface2);border:1px solid var(--border);border-left:3px solid;border-radius:var(--r-sm);padding:.75rem;transition:all .15s;cursor:pointer}
  .rec-card:hover{border-color:var(--border-light);transform:translateY(-1px)}

  /* Kanban */
  /* Pipeline — scroll horizontal, 3 col principales visibles */
  .kanban{display:flex;gap:.6rem;overflow-x:auto;padding-bottom:.5rem;align-items:flex-start}
  .kanban::-webkit-scrollbar{height:4px}.kanban::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
  .kancol{min-width:220px;flex:0 0 220px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);display:flex;flex-direction:column;min-height:300px}
  @media(min-width:900px){.kancol{min-width:240px;flex:1 1 240px}}
  .kancol-header{padding:.75rem;border-top:3px solid transparent;border-bottom:1px solid var(--border)}
  .kancol-body{flex:1;padding:.4rem;display:flex;flex-direction:column;gap:.4rem}
  .kancard{background:var(--surface);border:1px solid var(--border);border-top:2px solid transparent;border-radius:var(--r-sm);padding:.65rem;transition:all .15s;cursor:pointer}
  .kancard:hover{border-color:var(--border-light);box-shadow:0 2px 8px rgba(0,0,0,.3)}

  /* Contraprestaciones */
  .cont-row{display:flex;align-items:center;gap:.5rem;padding:.4rem 0;border-bottom:1px solid rgba(30,45,80,.25)}
  .cont-row.cont-done{opacity:.55}
  .ckbox{width:20px;height:20px;border-radius:4px;border:2px solid;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}

  /* Modal propio */
  @keyframes fi{from{opacity:0}to{opacity:1}}
  @keyframes su{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .mhdr{padding:1.1rem 1.4rem .9rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .mtit{font-size:.95rem;font-weight:800}
  .mbody{padding:1.1rem 1.4rem;display:flex;flex-direction:column;gap:.8rem}
  .mfoot{padding:.9rem 1.4rem;border-top:1px solid var(--border);display:flex;gap:.5rem;justify-content:flex-end}
  .fl{font-size:.72rem;font-weight:600;margin-bottom:.3rem;display:block;color:var(--text-muted)}

  /* Botones propios (sin colisión con .btn del BLOCK_CSS) */
  .btn-gold{background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3)} .btn-gold:hover{background:rgba(245,158,11,.25)}

  /* Utils propios */
  .mt1{margin-top:.5rem} .mb1{margin-bottom:.5rem}
  .f6{font-weight:600}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:var(--surface)}::-webkit-scrollbar-thumb{background:var(--border-light);border-radius:2px}

  /* ── Kanban patrocinadores ─────────────────────────────────── */
  .pat-kanban-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.65rem;margin-bottom:.85rem}
  .pat-k-col{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
  .pat-k-hdr{padding:.6rem .75rem;border-top:2px solid;display:flex;align-items:center;justify-content:space-between;background:var(--surface2)}
  .pat-k-card{margin:.4rem .4rem 0;background:var(--surface2);border:1px solid var(--border);border-left:3px solid;border-radius:8px;padding:.6rem .7rem;transition:all .15s}
  .pat-k-card:last-child{margin-bottom:.4rem}
  .pat-k-card:hover{border-color:var(--border-light);box-shadow:0 2px 8px rgba(0,0,0,.2)}`;
