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
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { SK_EVENT_CONFIG as LS_KEY_CONFIG } from "@/constants/storageKeys"; // FIX-DEP: migrado desde alias deprecated
import {
  SK_PROY_TAREAS, SK_PROY_HITOS, SK_PROY_EQUIPO,
  SK_DOC_DOCS, SK_DOC_GESTIONES,
  SK_VOL_VOLUNTARIOS,
  SK_LOG_CONT, SK_LOG_CK,
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

// Áreas que generan hito automático cuando prioridad=alta y tienen fechaLimite.
// Permite excluir áreas puramente administrativas (economico, comunicacion…).
const AREAS_CON_HITO_AUTO = new Set(["logistica","diaD","ruta","sanitario"]);

/**
 * Calcula si una tarea debe generar un hito automático y devuelve los datos del hito.
 * Función pura — no tiene efectos secundarios.
 * @returns {object|null} datos del hito, o null si la tarea no cumple los criterios.
 */
export function calcHitoDesdeArea(tarea) {
  if (!tarea) return null;
  if (!AREAS_CON_HITO_AUTO.has(tarea.area)) return null;
  if (tarea.prioridad !== "alta") return null;
  if (!tarea.fechaLimite) return null;
  return {
    nombre:    `📋 ${tarea.titulo}`,
    fecha:     tarea.fechaLimite,
    critico:   false,
    completado: tarea.estado === "completado",
    _tareaId:  tarea.id,   // vínculo de vuelta — identifica este hito como auto-generado
  };
}

/**
 * Aplica upsert/remove de un hito auto-generado en la lista de hitos.
 * @param {Array}  hitos       lista actual de hitos
 * @param {object} tarea       tarea que dispara el cambio
 * @param {"upsert"|"remove"} action
 * @returns {Array} nueva lista de hitos (sin mutar la original)
 */
export function syncHitoTarea(hitos, tarea, action = "upsert") {
  const lista = Array.isArray(hitos) ? hitos : [];
  const idx   = lista.findIndex(h => h._tareaId === tarea.id);

  if (action === "remove") {
    return idx === -1 ? lista : lista.filter((_, i) => i !== idx);
  }

  const datos = calcHitoDesdeArea(tarea);

  if (!datos) {
    // La tarea ya no cumple criterios (ej. bajó prioridad) → eliminar hito si existía
    return idx === -1 ? lista : lista.filter((_, i) => i !== idx);
  }

  if (idx === -1) {
    // Crear nuevo hito con id > máximo existente
    const maxId = lista.reduce((m, h) => Math.max(m, typeof h.id === "number" ? h.id : 0), 0);
    return [...lista, { ...datos, id: maxId + 1 }];
  }

  // Actualizar hito existente preservando el id y el flag critico manual si el usuario lo tocó
  return lista.map((h, i) =>
    i === idx ? { ...h, ...datos, id: h.id } : h
  );
}

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
  const [ficha, setFicha]     = useState(null); // {tipo,data} — vista previa
  const abrirFicha = (tipo, data) => {
    setFicha({ tipo, data });
  };
  const [delConf, setDelConf] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 850);
  const [busquedaGlobal, setBusquedaGlobal] = useState("");

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

  // filters — solo los de navegación cruzada (usados por múltiples tabs)
  const [filtroArea, setFiltroArea]           = useState("todas");
  const [filtroResponsable, setFiltroResponsable] = useState("todos");

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

  // tareasFiltradas: solo aplica los filtros de navegación cruzada.
  // filtroEstado, filtroPrioridad y busqueda se aplican internamente en TabTablon.
  const tareasFiltradas = useMemo(() => {
    return tareas.filter(t => {
      if (filtroArea !== "todas" && t.area !== filtroArea) return false;
      if (filtroResponsable !== "todos" && String(t.responsableId) !== filtroResponsable) return false;
      return true;
    });
  }, [tareas, filtroArea, filtroResponsable]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const saveTarea = (t) => {
    const esNuevo = !t.id;
    let tareaFinal = t;
    if (esNuevo) {
      setTareas(p => {
        tareaFinal = { ...t, id: genIdNum(p) };
        return [...p, tareaFinal];
      });
    } else {
      setTareas(p => p.map(x => x.id===t.id ? t : x));
    }
    // Sincronizar hito automático. Para tareas nuevas usamos un useEffect en la lista,
    // pero para evitar doble-render, la lógica de hito se dispara en el mismo ciclo
    // con un timeout mínimo que permite que setTareas haya resuelto el id.
    setTimeout(() => {
      setHitos(prev => syncHitoTarea(prev, esNuevo ? tareaFinal : t));
    }, 0);
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
    if (tipo==="tarea") {
      setTareas(p => p.filter(x => x.id!==id));
      // Eliminar hito auto-generado vinculado a esta tarea (si existía)
      setHitos(prev => syncHitoTarea(prev, { id }, "remove"));
    }
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

      const nextTareas = prevTareas.map(t => t.id === id ? { ...t, estado, historial } : t);
      const tareaActualizada = nextTareas.find(t => t.id === id);

      // SYNC-HITO: si la tarea actualizada tiene hito auto-generado, sincronizar completado.
      if (tareaActualizada) {
        setTimeout(() => setHitos(prev => syncHitoTarea(prev, tareaActualizada)), 0);
      }

      // SYNC-INV: propagar cambio de estado a ítems del pre-operativo (CK) vinculados a esta tarea.
      // Se hace async para no bloquear el render — error silencioso si CK no está disponible.
      import("@/lib/dataService").then(m => {
        m.default.get(SK_LOG_CK, []).then(ckActual => {
          if (!Array.isArray(ckActual)) return;
          const ckEstado = estado === "completado" ? "completado" : "pendiente";
          const ckNext = ckActual.map(c =>
            c.proyectoTareaId === id ? { ...c, estado: ckEstado } : c
          );
          const cambio = ckNext.some((c, i) => c.estado !== ckActual[i].estado);
          if (cambio) {
            m.default.set(SK_LOG_CK, ckNext);
            m.default.notify('logistica'); // notifica a Logística.jsx del cambio externo
          }
        }).catch(() => {/* CK no disponible — ignorar */});
      });

      return nextTareas;
    });
  };
  const updHito = (id, field, val) => {
    setHitos(p => p.map(h => h.id===id ? {...h,[field]:val} : h));
    if (field === "completado") {
      toast.success(val ? "Hito completado ✓" : "Hito reabierto");
      // GAP-E: notificar bus para que Dashboard invalide KPIs de proyecto
      import("@/lib/dataService").then(m => { m.default.notify('proyecto'); }).catch(() => {});
      // GAP-1: propagar cambio de hito al ítem CK vinculado (via _tareaId → proyectoTareaId)
      const hitoMod = hitos.find(h => h.id === id);
      if (hitoMod?._tareaId) {
        import("@/lib/dataService").then(async m => {
          const ckActual = await m.default.get(SK_LOG_CK, []);
          if (!Array.isArray(ckActual)) return;
          const ckEstado = val ? "completado" : "pendiente";
          const ckNext = ckActual.map(c =>
            c.proyectoTareaId === hitoMod._tareaId ? { ...c, estado: ckEstado } : c
          );
          const cambio = ckNext.some((c, i) => c.estado !== ckActual[i].estado);
          if (cambio) {
            await m.default.set(SK_LOG_CK, ckNext);
            m.default.notify('logistica');
          }
        }).catch(() => {/* CK no disponible — ignorar */});
      }
      // GAP-C: si el hito está vinculado a uno o varios pedidos (_pedidoIds, con retrocompat. _pedidoId),
      // reflejar el estado en LogisticaPedidos. Al marcar manualmente, todos los pedidos vinculados pasan
      // a "recibido" (si no lo estaban). Al desmarcar, los que estén "recibido" vuelven a "confirmado"
      // (los "facturado" no se tocan: facturar es un paso posterior que no se revierte aquí).
      const hitoActual = hitos.find(h => h.id === id);
      const pedidoIdsHito = Array.isArray(hitoActual?._pedidoIds)
        ? hitoActual._pedidoIds
        : (hitoActual?._pedidoId != null ? [hitoActual._pedidoId] : []);
      if (pedidoIdsHito.length > 0) {
        import("@/lib/dataService").then(async m => {
          const { SK_LOG_PEDIDOS_PROV } = await import("@/constants/storageKeys");
          const pedidos = await m.default.get(SK_LOG_PEDIDOS_PROV, []);
          if (!Array.isArray(pedidos)) return;
          let cambio = false;
          const next = pedidos.map(p => {
            if (!pedidoIdsHito.includes(p.id)) return p;
            if (val && (p.estado === "borrador" || p.estado === "confirmado")) {
              cambio = true;
              return { ...p, estado: "recibido" };
            }
            if (!val && p.estado === "recibido") {
              cambio = true;
              return { ...p, estado: "confirmado" };
            }
            return p;
          });
          if (cambio) {
            await m.default.set(SK_LOG_PEDIDOS_PROV, next);
            m.default.notify('logistica');
          }
        }).catch(() => {/* pedidos no disponibles — ignorar */});
      }
    }
  };

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
            {busquedaGlobal && (() => {
              const q = busquedaGlobal.toLowerCase();
              const cnt = tareas.filter(t => t.titulo.toLowerCase().includes(q) || (t.notas||"").toLowerCase().includes(q)).length;
              return <span className="badge badge-violet" style={{whiteSpace:"nowrap"}}>🔍 {cnt} resultado{cnt !== 1 ? "s" : ""}</span>;
            })()}
            {stats.vencidas.length > 0 && <span className="badge badge-red">⏰ {stats.vencidas.length} vencidas</span>}
            {stats.bloqueadas > 0 && <span className="badge badge-amber">🔒 {stats.bloqueadas} bloqueadas</span>}
            <span className={`badge ${stats.pct>=80?"badge-green":stats.pct>=50?"badge-amber":"badge-red"}`}>{stats.pct}% completado</span>
            <button className="btn btn-primary" onClick={() => setModal({tipo:"tarea",data:null})}>+ Nueva tarea</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid mb">
          <div className="kpi green cursor-ptr" onClick={() => setTab("tablón")}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>✅ Completadas<Tooltip text={"Porcentaje de tareas marcadas como completadas sobre el total.\nIncluye todas las áreas del proyecto: permisos, logística, comunicación, etc."}><TooltipIcon size={11}/></Tooltip></div>
            <div className="kpi-value" style={{color:"var(--green)"}}>{stats.pct}%</div>
            <div className="kpi-sub">{stats.completadas} de {stats.total} tareas</div>
            {/* C4.1: barra de progreso */}
            <div className="kpi-progress">
              <div className="kpi-progress-fill" style={{ width: `${stats.pct}%`, background: "var(--green)", boxShadow: "0 0 6px rgba(52,211,153,.5)" }}/>
            </div>
          </div>
          <div className="kpi cyan cursor-ptr" onClick={() => setTab("tablón")}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>▶️ En curso<Tooltip text={"Tareas actualmente en estado 'en curso': se están ejecutando pero no están terminadas."}><TooltipIcon size={11}/></Tooltip></div>
            <div className="kpi-value" style={{color:"var(--cyan)"}}>{stats.enCurso}</div>
            <div className="kpi-sub">tareas activas</div>
          </div>
          <div className={`kpi cursor-ptr ${stats.vencidas.length>0?"red":"green"}`} onClick={() => setTab("tablón")}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>⏰ Vencidas<Tooltip text={"Tareas cuya fecha límite ya pasó y no están completadas.\nRequieren atención inmediata — cada día que pasan aumenta el riesgo para el evento."}><TooltipIcon size={11}/></Tooltip></div>
            <div className="kpi-value" style={{color:stats.vencidas.length>0?"var(--red)":"var(--green)"}}>{stats.vencidas.length}</div>
            <div className="kpi-sub">fecha límite superada</div>
          </div>
          <div className={`kpi cursor-ptr ${stats.bloqueadas>0?"amber":"green"}`} onClick={() => setTab("tablón")}>
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
            busquedaGlobal={busquedaGlobal} setBusquedaGlobal={setBusquedaGlobal}
            updEstado={updEstado} setModal={setModal} setDelConf={setDelConf} setFicha={abrirFicha} />}
          {tab==="gantt"  && <TabGantt tareas={tareas} hitos={hitos} equipo={equipo} setModal={setModal} setFicha={abrirFicha} setFiltroArea={setFiltroArea} setTabParent={setTab} eventFecha={config?.fecha || EVENT_CONFIG_DEFAULT.fecha} />}
          {tab==="equipo" && <TabEquipo equipo={equipo} setEquipo={setEquipo} tareas={tareas} voluntarios={voluntarios} contLog={contLog} setModal={setModal} setDelConf={setDelConf} setFicha={abrirFicha} />}
          {tab==="hitos"  && <TabHitos hitos={hitos} updHito={updHito} setModal={setModal} setDelConf={setDelConf} setFicha={abrirFicha} />}
        </div>
      </div>

      {ficha?.tipo==="tarea"   && <FichaProyecto key={"f"+ficha.data.id} ficha={ficha} equipo={equipo} documentos={documentos} tareas={tareas} onClose={()=>setFicha(null)} onEditar={()=>{setFicha(null);setModal({tipo:ficha.tipo,data:ficha.data});}} onEliminar={()=>{setFicha(null);setDelConf({tipo:ficha.tipo,id:ficha.data.id});}} />}
      {ficha?.tipo==="hito"    && <FichaProyecto key={"f"+ficha.data.id} ficha={ficha} equipo={equipo} documentos={documentos} tareas={tareas} onClose={()=>setFicha(null)} onEditar={()=>{setFicha(null);setModal({tipo:ficha.tipo,data:ficha.data});}} onEliminar={()=>{setFicha(null);setDelConf({tipo:ficha.tipo,id:ficha.data.id});}} />}
      {ficha?.tipo==="persona" && <FichaProyecto key={"f"+ficha.data.id} ficha={ficha} equipo={equipo} documentos={documentos} tareas={tareas} onClose={()=>setFicha(null)} onEditar={()=>{setFicha(null);setModal({tipo:ficha.tipo,data:ficha.data});}} onEliminar={()=>{setFicha(null);setDelConf({tipo:ficha.tipo,id:ficha.data.id});}} />}
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
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="proy-del-title" style={{maxWidth:340,textAlign:"center"}}>
            <div className="modal-body" style={{paddingTop:"1.5rem"}}>
              <div style={{fontSize:"var(--fs-xl)",marginBottom:".6rem"}} aria-hidden="true">⚠️</div>
              <div id="proy-del-title" style={{fontWeight:700,fontSize:"var(--fs-md)",marginBottom:".4rem"}}>¿Eliminar este elemento?</div>
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
