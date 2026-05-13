/**
 * Proyecto.jsx — Orquestador (Tarea 3.3)
 * Gestión de tareas, hitos y equipo del evento.
 * La lógica y los sub-componentes viven en src/components/proyecto/.
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import {
  SK_PROY_TAREAS, SK_PROY_HITOS, SK_PROY_EQUIPO,
  SK_DOC_DOCS, SK_DOC_GESTIONES,
  SK_VOL_VOLUNTARIOS,
  SK_LOG_CONT,
} from "@/constants/storageKeys";

import {
  diasHasta, AREAS, ESTADOS, PRIORIDADES, EST_CFG, PRI_CFG,
  EQUIPO0, HITOS0, TAREAS0, getArea, iniciales,
} from "@/components/proyecto/proyectoConstants";
import { TabDash }        from "@/components/proyecto/TabDash";
import { TabTablon }      from "@/components/proyecto/TabTablon";
import { TabGantt }       from "@/components/proyecto/TabGantt";
import { TabEquipo }      from "@/components/proyecto/TabEquipo";
import { TabHitos }       from "@/components/proyecto/TabHitos";
import { validarTarea, QuickCreateTarea, ModalTarea, ModalHito, ModalPersona } from "@/components/proyecto/Modales";
import { FichaProyecto }  from "@/components/proyecto/FichaProyecto";

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]         = useState("dashboard");
  // FIX Guard más robusto: si la BD devuelve datos, usarlos; si no, cargar TAREAS0 como defaults
  // Esto protege contra el caso de dispositivo nuevo (sin localStorage) que sobreescribía con TAREAS0
  const [rawTareas, setTareas]   = useData(SK_PROY_TAREAS, TAREAS0);
  const [rawHitos, setHitos]     = useData(SK_PROY_HITOS, HITOS0);
  const [rawEquipo, setEquipo]   = useData(SK_PROY_EQUIPO, EQUIPO0);
  const [eventCfg]               = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [rawDocs]                = useData(SK_DOC_DOCS, []);
  const [rawGest]                = useData(SK_DOC_GESTIONES, []);
  const [rawVoluntarios]         = useData(SK_VOL_VOLUNTARIOS, []);
  const [rawContLog]             = useData(SK_LOG_CONT, []);

  const tareas = Array.isArray(rawTareas) ? rawTareas : [];
  const hitos = Array.isArray(rawHitos) ? rawHitos : [];
  const equipo = Array.isArray(rawEquipo) ? rawEquipo : [];
  const documentos  = [...(Array.isArray(rawDocs)?rawDocs:[]), ...(Array.isArray(rawGest)?rawGest:[])];
  const voluntarios = Array.isArray(rawVoluntarios) ? rawVoluntarios : [];
  const contLog     = Array.isArray(rawContLog) ? rawContLog : [];
  const [modal, setModal]     = useState(null);
  const [quickCreate, setQuickCreate] = useState(false);
  const [ganttPopup, setGanttPopup] = useState(null); // {area, tareas, x, y}
  const [ficha, setFicha]     = useState(null); // {tipo,data} — vista previa
  const abrirFicha = (tipo, data) => {
    setFicha({ tipo, data });
  };
  const [delConf, setDelConf] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 850);
  const [busquedaGlobal, setBusquedaGlobal] = useState("");
  const [vistaTablon, setVistaTablon] = useState("lista"); // "lista" | "kanban"

  // Escuchar evento de crear tarea desde otros módulos (ej. Documentos)
  useEffect(() => {
    const handler = (e) => {
      const { action, payload } = e.detail || {};
      if (action !== "nueva-tarea") return;
      // Navegar al Tablón y abrir modal de nueva tarea pre-rellenada
      setTab("tablón");
      setTimeout(() => {
        setModal({
          tipo: "tarea",
          data: null,
          prefill: payload || {},
        });
      }, 50);
    };
    window.addEventListener("teg-navigate", handler);
    return () => window.removeEventListener("teg-navigate", handler);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 850);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // filters
  const [filtroArea, setFiltroArea]           = useState("todas");
  const [filtroResponsable, setFiltroResponsable] = useState("todos");
  const [filtroEstado, setFiltroEstado]       = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [busqueda, setBusqueda]               = useState("");

  // Los datos se guardan automáticamente en Neon via useData().
  // Esta función solo sincroniza otras pestañas abiertas.

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const _eventFechaStr = config?.fecha || EVENT_CONFIG_DEFAULT.fecha;
    const diasEvento = diasHasta(_eventFechaStr);
    const total = tareas.length;
    const completadas = tareas.filter(t => t.estado === "completado").length;
    const bloqueadas = tareas.filter(t => t.estado === "bloqueado").length;
    const enCurso = tareas.filter(t => t.estado === "en curso").length;
    const pct = total ? Math.round(completadas/total*100) : 0;
    const criticas = tareas.filter(t =>
      t.estado !== "completado" && t.fechaLimite &&
      diasHasta(t.fechaLimite) <= 14 && diasHasta(t.fechaLimite) >= 0
    );
    const vencidas = tareas.filter(t =>
      t.estado !== "completado" && t.estado !== "bloqueado" &&
      t.fechaLimite && diasHasta(t.fechaLimite) < 0
    );
    const porArea = AREAS.map(a => {
      const at = tareas.filter(t => t.area === a.id);
      const done = at.filter(t => t.estado === "completado").length;
      const blk = at.filter(t => t.estado === "bloqueado").length;
      const venc = at.filter(t => t.estado !== "completado" && t.estado !== "bloqueado" && t.fechaLimite && diasHasta(t.fechaLimite) < 0).length;
      const semaforo = venc > 0 ? "red" : blk > 0 ? "amber" : done === at.length ? "green" : "blue";
      return { ...a, total:at.length, done, blk, venc, semaforo, pct: at.length ? Math.round(done/at.length*100) : 0 };
    });
    const porPersona = equipo.map(p => {
      const pt = tareas.filter(t => t.responsableId === p.id && t.estado !== "completado");
      const urgentes = pt.filter(t => t.fechaLimite && diasHasta(t.fechaLimite) <= 14);
      return { ...p, pendientes: pt.length, urgentes: urgentes.length };
    }).sort((a,b) => b.urgentes - a.urgentes);
    const hitosProx = [...hitos].filter(h => !h.completado).sort((a,b) => a.fecha.localeCompare(b.fecha)).slice(0,5);
    return { diasEvento, total, completadas, bloqueadas, enCurso, pct, criticas, vencidas, porArea, porPersona, hitosProx };
  }, [tareas, hitos, equipo, eventCfg]);

  // ── Tareas filtradas ───────────────────────────────────────────────────────
  const tareasFiltradas = useMemo(() => {
    return tareas.filter(t => {
      if (filtroArea !== "todas" && t.area !== filtroArea) return false;
      if (filtroResponsable !== "todos" && String(t.responsableId) !== filtroResponsable) return false;
      if (filtroEstado !== "todos" && t.estado !== filtroEstado) return false;
      if (filtroPrioridad !== "todas" && t.prioridad !== filtroPrioridad) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!t.titulo.toLowerCase().includes(q) && !(t.notas||"").toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a,b) => (a.fechaLimite||"").localeCompare(b.fechaLimite||""));
  }, [tareas, filtroArea, filtroResponsable, filtroEstado, filtroPrioridad, busqueda]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const saveTarea = (t) => {
    const esNuevo = !t.id;
    if (t.id) setTareas(p => p.map(x => x.id===t.id ? t : x));
    else setTareas(p => [...p, {...t, id:genIdNum(p)}]);
    setModal(null);
    toast.success(esNuevo ? "Tarea creada" : "Tarea actualizada");
  };
  const saveHito = (h) => {
    const esNuevo = !h.id;
    if (h.id) setHitos(p => p.map(x => x.id===h.id ? h : x));
    else setHitos(p => [...p, {...h, id:genIdNum(p)}]);
    setModal(null);
    toast.success(esNuevo ? "Hito creado" : "Hito actualizado");
  };
  const savePersona = (p) => {
    const esNuevo = !p.id;
    if (p.id) setEquipo(prev => prev.map(x => x.id===p.id ? p : x));
    else setEquipo(prev => [...prev, {...p, id:genIdNum(prev)}]);
    setModal(null);
    toast.success(esNuevo ? "Miembro añadido al equipo" : "Miembro actualizado");
  };
  const doDelete = () => {
    if (!delConf) return;
    const {tipo,id} = delConf;
    if (tipo==="tarea") setTareas(p => p.filter(x => x.id!==id));
    if (tipo==="hito") setHitos(p => p.filter(x => x.id!==id));
    if (tipo==="persona") setEquipo(p => p.filter(x => x.id!==id));
    setDelConf(null);
  };
  const updEstado = (id, estado) => {
    setTareas(prevTareas => {
      const tarea = prevTareas.find(t => t.id === id);
      if (!tarea) return prevTareas;

      // Aviso si hay dependencia sin completar
      if ((estado === "en curso" || estado === "completado") && tarea.dependeDe) {
        const dep = prevTareas.find(t => t.id === tarea.dependeDe);
        if (dep && dep.estado !== "completado") {
          setTimeout(() => toast.warning("\u26a0\ufe0f \"" + dep.titulo + "\" a\xc3\xban no est\xc3\xa1 completada"), 50);
        }
      }

      // Registrar en historial automático
      const entrada = {
        id:      String(Date.now()),
        fecha:   new Date().toISOString(),
        campo:   "estado",
        antes:   tarea.estado,
        despues: estado,
      };
      const historial = [...(Array.isArray(tarea.historial) ? tarea.historial : []), entrada].slice(-20);

      // Notificar tareas desbloqueadas
      if (estado === "completado") {
        const desbloqueadas = prevTareas.filter(t =>
          t.id !== id && t.dependeDe === id && t.estado === "pendiente"
        );
        if (desbloqueadas.length > 0) {
          setTimeout(() => toast.success("✅ Completada · Ahora puedes iniciar: " + desbloqueadas.slice(0,2).map(t => t.titulo).join(", ") + (desbloqueadas.length>2?" y más...":"")), 300);
        } else {
          setTimeout(() => toast.success("Tarea completada ✓"), 50);
        }
      }

      return prevTareas.map(t => t.id === id ? { ...t, estado, historial } : t);
    });
  };
  const updHito = (id, field, val) => { setHitos(p => p.map(h => h.id===id ? {...h,[field]:val} : h)); if(field==="completado") toast.success(val ? "Hito completado ✓" : "Hito reabierto"); };

  const TABS_VISTAS = [
    {id:"tablón",    icon:"📋", label:"Tablón"},
    {id:"dashboard", icon:"📊", label:"Resumen"},
    {id:"gantt",     icon:"📊", label:"Por Áreas"},
  ];
  const TABS_GESTION = [
    {id:"hitos",  icon:"🏁", label:"Hitos"},
    {id:"equipo", icon:"👥", label:"Equipo"},
  ];
  const TABS = [...TABS_VISTAS, ...TABS_GESTION];

  return (
    <>
      
      <div className="block-container">

        {/* HEADER */}
        <div className="block-header">
          <div>
            <h1 className="block-title">🏔️ Proyecto</h1>
            <div className="block-title-sub">Gestión & Planificación · {stats.diasEvento} días para la carrera</div>
          </div>
          <div className="block-actions">
            {/* Búsqueda global */}
            <div style={{display:"flex",alignItems:"center",gap:".4rem",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",padding:".28rem .6rem",transition:"border-color .15s"}}
              onFocus={e=>e.currentTarget.style.borderColor="var(--violet)"}
              onBlur={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <span style={{fontSize:"var(--fs-base)",opacity:.5}}>🔍</span>
              <input
                value={busquedaGlobal}
                onChange={e=>{setBusquedaGlobal(e.target.value); if(e.target.value && tab!=="tablón") setTab("tablón");}}
                placeholder="Buscar en todo el proyecto…"
                style={{background:"none",border:"none",color:"var(--text)",fontFamily:"var(--font-display)",fontSize:"var(--fs-base)",outline:"none",width: isMobile ? 120 : 200}}
              />
              {busquedaGlobal && <button onClick={()=>setBusquedaGlobal("")} style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:"var(--fs-base)",padding:0}} aria-label="Cerrar">✕</button>}
            </div>
            {busquedaGlobal && tareasFiltradas && (
              <span className="badge badge-violet" style={{whiteSpace:"nowrap"}}>
                🔍 {tareasFiltradas.length} resultado{tareasFiltradas.length !== 1 ? "s" : ""}
              </span>
            )}
            {stats.vencidas.length > 0 && <span className="badge badge-red">⏰ {stats.vencidas.length} vencidas</span>}
            {stats.bloqueadas > 0 && <span className="badge badge-amber">🔒 {stats.bloqueadas} bloqueadas</span>}
            <span className={`badge ${stats.pct>=80?"badge-green":stats.pct>=50?"badge-amber":"badge-red"}`}>{stats.pct}% completado</span>
            <button className="btn btn-primary" onClick={() => setModal({tipo:"tarea",data:null})}>+ Nueva tarea</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid mb">
          <div className="kpi green">
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>✅ Completadas<Tooltip text={"Porcentaje de tareas marcadas como completadas sobre el total.\nIncluye todas las áreas del proyecto: permisos, logística, comunicación, etc."}><TooltipIcon size={11}/></Tooltip></div>
            <div className="kpi-value" style={{color:"var(--green)"}}>{stats.pct}%</div>
            <div className="kpi-sub">{stats.completadas} de {stats.total} tareas</div>
          </div>
          <div className="kpi cyan">
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>▶️ En curso<Tooltip text={"Tareas actualmente en estado 'en curso': se están ejecutando pero no están terminadas."}><TooltipIcon size={11}/></Tooltip></div>
            <div className="kpi-value" style={{color:"var(--cyan)"}}>{stats.enCurso}</div>
            <div className="kpi-sub">tareas activas</div>
          </div>
          <div className={`kpi ${stats.vencidas.length>0?"red":"green"}`}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>⏰ Vencidas<Tooltip text={"Tareas cuya fecha límite ya pasó y no están completadas.\nRequieren atención inmediata — cada día que pasan aumenta el riesgo para el evento."}><TooltipIcon size={11}/></Tooltip></div>
            <div className="kpi-value" style={{color:stats.vencidas.length>0?"var(--red)":"var(--green)"}}>{stats.vencidas.length}</div>
            <div className="kpi-sub">fecha límite superada</div>
          </div>
          <div className={`kpi ${stats.bloqueadas>0?"amber":"green"}`}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>🔒 Bloqueadas<Tooltip text={"Tareas que no pueden avanzar porque dependen de otra tarea pendiente.\nRevisa las dependencias en la ficha de cada tarea para desbloquearlas."}><TooltipIcon size={11}/></Tooltip></div>
            <div className="kpi-value" style={{color:stats.bloqueadas>0?"var(--amber)":"var(--green)"}}>{stats.bloqueadas}</div>
            <div className="kpi-sub">requieren acción</div>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={cls("tab-btn", tab===t.id && "active")} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
              {t.id==="tablón" && stats.vencidas.length>0 && <span className="badge badge-red" style={{marginLeft:"0.3rem"}}>{stats.vencidas.length}</span>}
              {t.id==="hitos" && <span className="badge badge-cyan" style={{marginLeft:"0.3rem"}}>{hitos.filter(h=>!h.completado).length}</span>}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div key={tab}>
          {tab==="dashboard" && <TabDash stats={stats} equipo={equipo} setTab={setTab} setModal={setModal} setFicha={abrirFicha} tareas={tareas} hitos={hitos} updEstado={updEstado} isMobile={isMobile} setFiltroArea={setFiltroArea} setFiltroResponsable={setFiltroResponsable} gestiones={Array.isArray(rawGest)?rawGest:[]} />}
          {tab==="tablón" && <TabTablon tareas={tareasFiltradas} todasTareas={tareas} equipo={equipo}
            filtroArea={filtroArea} setFiltroArea={setFiltroArea}
            filtroResponsable={filtroResponsable} setFiltroResponsable={setFiltroResponsable}
            filtroEstado={filtroEstado} setFiltroEstado={setFiltroEstado}
            filtroPrioridad={filtroPrioridad} setFiltroPrioridad={setFiltroPrioridad}
            busqueda={busquedaGlobal || busqueda} setBusqueda={(v)=>{setBusqueda(v); setBusquedaGlobal(v);}}
            updEstado={updEstado} setModal={setModal} setDelConf={setDelConf} setFicha={abrirFicha}
            vista={vistaTablon} setVista={setVistaTablon} />}
          {tab==="gantt"  && <TabGantt tareas={tareas} hitos={hitos} equipo={equipo} setModal={setModal} setFicha={abrirFicha} setFiltroArea={setFiltroArea} setTabParent={setTab} eventFecha={config?.fecha || EVENT_CONFIG_DEFAULT.fecha} setGanttPopup={setGanttPopup} />}
          {tab==="equipo" && <TabEquipo equipo={equipo} setEquipo={setEquipo} tareas={tareas} voluntarios={voluntarios} contLog={contLog} setModal={setModal} setDelConf={setDelConf} setFicha={abrirFicha} />}
          {tab==="hitos"  && <TabHitos hitos={hitos} updHito={updHito} setModal={setModal} setDelConf={setDelConf} setFicha={abrirFicha} />}
        </div>
      </div>

      {ficha?.tipo==="tarea"   && <FichaProyecto key={"f"+ficha.data.id} ficha={ficha} equipo={equipo} documentos={documentos} tareas={tareas} onClose={()=>setFicha(null)} onEditar={()=>{setFicha(null);setModal({tipo:ficha.tipo,data:ficha.data});}} onEliminar={()=>{setFicha(null);setDelConf({tipo:ficha.tipo,id:ficha.data.id});}} />}
      {ficha?.tipo==="hito"    && <FichaProyecto key={"f"+ficha.data.id} ficha={ficha} equipo={equipo} documentos={documentos} tareas={tareas} onClose={()=>setFicha(null)} onEditar={()=>{setFicha(null);setModal({tipo:ficha.tipo,data:ficha.data});}} onEliminar={()=>{setFicha(null);setDelConf({tipo:ficha.tipo,id:ficha.data.id});}} />}
      {ficha?.tipo==="persona" && <FichaProyecto key={"f"+ficha.data.id} ficha={ficha} equipo={equipo} documentos={documentos} tareas={tareas} onClose={()=>setFicha(null)} onEditar={()=>{setFicha(null);setModal({tipo:ficha.tipo,data:ficha.data});}} onEliminar={()=>{setFicha(null);setDelConf({tipo:ficha.tipo,id:ficha.data.id});}} />}
      {/* ── Popup de tareas al tap en barra del Gantt ── */}
      {ganttPopup && createPortal(
        <div style={{
          position:"fixed", inset:0, zIndex:400,
          background:"transparent",
        }} onClick={() => setGanttPopup(null)}>
          <div style={{
            position:"fixed",
            left: Math.min(ganttPopup.x, window.innerWidth - 320),
            top:  Math.min(ganttPopup.y, window.innerHeight - 300),
            width:300, maxHeight:280,
            background:"var(--surface)", border:"1px solid var(--border)",
            borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
            overflow:"hidden", zIndex:401,
          }} onClick={e => e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:".55rem .85rem",borderBottom:"1px solid var(--border)",
              background:"var(--surface2)"}}>
              <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                <span style={{color:ganttPopup.area.color,fontSize:"var(--fs-md)"}}>{ganttPopup.area.icon}</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:800,color:"var(--text)"}}>
                  {ganttPopup.area.label}
                </span>
              </div>
              <button onClick={() => setGanttPopup(null)}
                style={{background:"none",border:"none",color:"var(--text-dim)",cursor:"pointer",fontSize:"var(--fs-sm)",padding:"0 .2rem"}}>✕</button>
            </div>
            <div style={{overflowY:"auto",maxHeight:220}}>
              {ganttPopup.tareas.sort((a,b) => (a.fechaLimite||"").localeCompare(b.fechaLimite||"")).map(t => {
                const EST = {pendiente:{color:"var(--amber)"},en_curso:{color:"var(--cyan)"},"en curso":{color:"var(--cyan)"},completado:{color:"var(--green)"},bloqueado:{color:"var(--red)"}};
                const col = EST[t.estado]?.color || "var(--text-muted)";
                return (
                  <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:".5rem",
                    padding:".45rem .85rem",borderBottom:"1px solid var(--border-light)",
                    cursor:"pointer"}}
                    onClick={() => { setGanttPopup(null); abrirFicha("tarea", t); }}>
                    <span style={{color:col,fontSize:"var(--fs-xs)",marginTop:".1rem",flexShrink:0}}>●</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:600,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</div>
                      {t.fechaLimite && <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-2xs)",color:"var(--text-muted)"}}>
                        {new Date(t.fechaLimite).toLocaleDateString("es-ES",{day:"2-digit",month:"short"})}
                      </div>}
                    </div>
                  </div>
                );
              })}
              {ganttPopup.tareas.length === 0 && (
                <div style={{padding:"1rem",textAlign:"center",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>Sin tareas asignadas</div>
              )}
            </div>
            <div style={{padding:".45rem .85rem",borderTop:"1px solid var(--border)",background:"var(--surface2)"}}>
              <button className="btn btn-ghost btn-sm" style={{width:"100%",fontSize:"var(--fs-xs)"}}
                onClick={() => { setGanttPopup(null); setFiltroArea(ganttPopup.area.id); setTab("tablón"); }}>
                Ver todas en Tablón →
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {quickCreate && createPortal(
        <QuickCreateTarea
          areas={AREAS}
          onSave={(data) => { saveTarea(data); setQuickCreate(false); toast.success("Tarea creada ⚡"); }}
          onClose={() => setQuickCreate(false)}
        />, document.body)}
      {modal?.tipo==="tarea"   && <ModalTarea   key={modal.data?.id||"new"} data={modal.data} prefill={modal.prefill} equipo={equipo} tareas={tareas} documentos={documentos} onSave={saveTarea}   onClose={() => setModal(null)} />}
      {modal?.tipo==="hito"    && <ModalHito    key={modal.data?.id||"new"} data={modal.data}                                  onSave={saveHito}    onClose={() => setModal(null)} />}
      {modal?.tipo==="persona" && <ModalPersona key={modal.data?.id||"new"} data={modal.data}                                  onSave={savePersona} onClose={() => setModal(null)} />}
      {delConf && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setDelConf(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:340,textAlign:"center"}}>
            <div className="modal-body" style={{paddingTop:"1.5rem"}}>
              <div style={{fontSize:"var(--fs-xl)",marginBottom:".6rem"}}>⚠️</div>
              <div style={{fontWeight:700,fontSize:"var(--fs-md)",marginBottom:".4rem"}}>¿Eliminar este elemento?</div>
              <div className="mono xs muted">Esta acción no se puede deshacer.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDelConf(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={doDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
