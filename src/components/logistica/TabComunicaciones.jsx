// Auto-extracted from Logistica.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ListaKanbanToggle } from "@/components/common/ListaKanbanToggle";
import { FASES_CHECKLIST, ESTADO_ENTREGA, ESTADO_TAREA, ESTADO_COLORES, PUESTOS_REF, TIPOS_LOC, LOC_ICONS, LOC_COLORS } from "./logisticaConstants.js";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";

// ─── COMUNICACIONES ───────────────────────────────────────────────────────────
const TIC={emergencia:"var(--red)",proveedor:"var(--amber)",staff:"var(--cyan)",institucional:"var(--violet)"};
const TICI={emergencia:"🚨",proveedor:"🏭",staff:"👤",institucional:"🏛️"};
const PROTO_PASOS=[
  {id:1,titulo:"Accidente de corredor en ruta",icon:"🏃",pasos:["Recibir aviso por walkie del puesto más cercano","Confirmar ubicación exacta (KM de ruta + puesto)","Contactar inmediatamente con Cruz Roja: 920 350 033","Notificar a Dirección de carrera","Si hay riesgo vital: llamar al 112","Enviar vehículo todoterreno si es necesario acceder","Registrar incidencia en el módulo"]},
  {id:2,titulo:"Corredor desaparecido / extraviado",icon:"❓",pasos:["Confirmar último control donde fue visto (hora, KM)","Contactar con delegado de la distancia correspondiente","Activar protocolo búsqueda: recorrer tramo a pie/vehículo","Contactar con Guardia Civil Candeleda: 920 380 100","No cerrar el puesto hasta localizar al corredor","Registrar toda la información en incidencias"]},
  {id:3,titulo:"Incidencia meteorológica grave",icon:"⛈️",pasos:["Evaluar gravedad con meteorología local","Consultar con organización y juez árbitro","Si hay peligro: detener la prueba por walkie general","Reunir a corredores en el punto de control más cercano","Activar vehículos de recogida para tramos lejanos","Decisión final de suspensión: Dirección + Juez árbitro"]},
  {id:4,titulo:"Problema en avituallamiento",icon:"🍎",pasos:["Identificar qué falta (agua, isotónico, otro)","Contactar con furgoneta de reparto","Si urgente: enviar voluntario con coche propio","Alternativa: reducir raciones hasta reponer","Registrar en incidencias para próxima edición"]},
];

// TIPOS_BASE fuera del componente — es constante, no necesita recrearse en cada render
const TIPOS_BASE = [
  {id:"emergencia",  nombre:"Emergencia",   icono:"🚨", color:"var(--red)"},
  {id:"proveedor",   nombre:"Proveedor",    icono:"🏭", color:"var(--amber)"},
  {id:"staff",       nombre:"Staff",        icono:"👤", color:"var(--cyan)"},
  {id:"institucional",nombre:"Institucional",icono:"🏛️",color:"var(--violet)"},
  {id:"medico",      nombre:"Médico",       icono:"🏥", color:"var(--green)"},
  {id:"media",       nombre:"Media/Prensa", icono:"📸", color:"var(--orange)"},
];

function TabCont({cont,setCont,inc,setInc,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,abrirModal,tiposContacto=[],setTiposContacto}) {
  const [sub,setSub]           = useState("directorio");
  const [proto,setProto]       = useState(null);
  const [filtroTipo,setFiltroTipo] = useState("todos");
  const [modalTipo,setModalTipo]   = useState(false); // modal añadir tipo personalizado
  const [nuevoTipo,setNuevoTipo]   = useState({nombre:"",icono:"🏷️",color:"var(--text-muted)"});
  const [busqCont,setBusqCont] = useState("");

  // ── Tipos: memoizado — recalcula solo si cambia tiposContacto ────────────────
  const tiposCustom   = useMemo(() => Array.isArray(tiposContacto) ? tiposContacto : [], [tiposContacto]);
  const todosLosTipos = useMemo(() => [...TIPOS_BASE, ...tiposCustom], [tiposCustom]);
  const getTipo       = useCallback((tkid) => todosLosTipos.find(tt=>tt.id===tkid) || {nombre:tkid,icono:"🏷️",color:"var(--text-muted)"}, [todosLosTipos]);

  // ── Lista filtrada: memoizado — recalcula solo cuando cambia lo que usa ──────
  const contFiltrado = useMemo(() => {
    let list = ordenAlfa
      ? [...cont].sort((a,b) => (a.nombre||"").localeCompare(b.nombre||"","es"))
      : cont;
    if (filtroTipo !== "todos") list = list.filter(c => c.tipo === filtroTipo);
    if (busqCont.trim()) {
      const q = busqCont.toLowerCase();
      list = list.filter(c => (c.nombre||"").toLowerCase().includes(q));
    }
    return list;
  }, [cont, ordenAlfa, filtroTipo, busqCont]);

  const contOrdenado = useMemo(() =>
    ordenAlfa ? [...cont].sort((a,b) => (a.nombre||"").localeCompare(b.nombre||"","es")) : cont
  , [cont, ordenAlfa]);

  const guardarTipo = useCallback(() => {
    if (!nuevoTipo.nombre.trim()) return;
    const id = nuevoTipo.nombre.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    if (todosLosTipos.find(t=>t.id===id)) return;
    setTiposContacto(prev=>[...(Array.isArray(prev)?prev:[]),{...nuevoTipo,id}]);
    setNuevoTipo({nombre:"",icono:"🏷️",color:"var(--text-muted)"});
    setModalTipo(false);
    toast.success("Tipo de contacto creado");
  }, [nuevoTipo, todosLosTipos, setTiposContacto]);

  const eliminarTipo = useCallback((id) => {
    setTiposContacto(function(tcPrev){return(Array.isArray(tcPrev)?tcPrev:[]).filter(function(tcItm){return tcItm.id!==id;});});
    toast.success("Tipo de contacto eliminado");
  }, [setTiposContacto]);

  const incAbiertas = useMemo(() => inc.filter(i=>i.estado==="abierta").length, [inc]);

  return(
    <>
      <div className="ph">
        <div>
          <div className="pt">🚨 Emergencias</div>
          <div className="pd">
            {cont.length} contactos · {inc.length} incidencias
            {incAbiertas>0 && <span style={{color:"var(--red)",marginLeft:".4rem"}}>· ⚠ {incAbiertas} abiertas</span>}
          </div>
        </div>
        <div className="fr g1">
          {sub==="directorio" && (
            <input type="search" className="inp inp-sm"
              placeholder="Buscar contacto…"
              value={busqCont} onChange={e=>setBusqCont(e.target.value)}
              style={{maxWidth:150,fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}
            />
          )}
          <button className="btn btn-primary" onClick={()=>abrirModal({tipo:"cont"})}>+ Contacto</button>

        </div>
      </div>

      {/* Sub-tabs — Kinetik filter-pills */}
      <div className="filter-pill-group" style={{marginBottom:".85rem"}}>
        {[
          {id:"directorio",  label:"📋 Directorio",  badge:cont.length},
          {id:"protocolo",   label:"📘 Protocolos",  badge:null},
          {id:"incidencias", label:"⚠️ Incidencias", badge:incAbiertas||null, badgeColor:"var(--red)"},
        ].map(t=>(
          <button key={t.id}
            className={"filter-pill" + (sub===t.id?" active":"")}
            onClick={()=>setSub(t.id)}
            style={sub===t.id&&t.badgeColor?{color:t.badgeColor,borderColor:t.badgeColor+"66",background:t.badgeColor+"18"}:{}}>
            {t.label}
            {t.badge!=null && t.badge>0 && (
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                padding:".05rem .35rem",borderRadius:10,fontWeight:800,
                background:t.badgeColor?t.badgeColor+"22":"rgba(34,211,238,.15)",
                color:t.badgeColor||"var(--cyan)"}}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── DIRECTORIO ── */}
      {sub==="directorio" && (
        <>
          {/* Filtros por tipo */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            gap:".5rem",flexWrap:"wrap",marginBottom:".65rem"}}>
            <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",flex:1}}>
              <button
                onClick={()=>setFiltroTipo("todos")}
                style={{padding:".22rem .6rem",borderRadius:20,border:`1px solid ${filtroTipo==="todos"?"var(--cyan)":"var(--border)"}`,
                  background:filtroTipo==="todos"?"var(--cyan-dim)":"transparent",
                  color:filtroTipo==="todos"?"var(--cyan)":"var(--text-muted)",
                  fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,cursor:"pointer"}}>
                Todos ({contOrdenado.length})
              </button>
              {todosLosTipos.map(t=>{
                const n = cont.filter(c=>c.tipo===t.id).length;
                if (!n && !tiposCustom.find(tc=>tc.id===t.id)) return null;
                return (
                  <button key={t.id}
                    onClick={()=>setFiltroTipo(filtroTipo===t.id?"todos":t.id)}
                    style={{padding:".22rem .6rem",borderRadius:20,
                      border:`1px solid ${filtroTipo===t.id?t.color:t.color+"44"}`,
                      background:filtroTipo===t.id?t.color+"20":"transparent",
                      color:filtroTipo===t.id?t.color:t.color+"bb",
                      fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,cursor:"pointer",
                      display:"flex",alignItems:"center",gap:".25rem"}}>
                    {t.icono} {t.nombre}
                    {n>0 && <span style={{background:t.color+"33",padding:"0 .3rem",borderRadius:10}}>{n}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
              <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")}
                onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
              <button className="btn btn-ghost btn-sm"
                onClick={()=>setModalTipo(true)}
                style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)"}}>
                + Tipo
              </button>
            </div>
          </div>

          {/* Tipos personalizados */}
          {tiposCustom.length > 0 && (
            <div style={{display:"flex",gap:".35rem",flexWrap:"wrap",
              marginBottom:".6rem",padding:".4rem .6rem",
              background:"var(--surface2)",borderRadius:6,
              border:"1px solid var(--border)"}}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                color:"var(--text-dim)",alignSelf:"center"}}>
                Tipos personalizados:
              </span>
              {tiposCustom.map(t=>(
                <span key={t.id} style={{display:"inline-flex",alignItems:"center",gap:".25rem",
                  padding:".15rem .5rem",borderRadius:20,
                  background:t.color+"15",color:t.color,
                  border:`1px solid ${t.color}33`,
                  fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700}}>
                  {t.icono} {t.nombre}
                  <button onClick={()=>eliminarTipo(t.id)}
                    style={{background:"none",border:"none",cursor:"pointer",
                      color:"var(--text-dim)",fontSize:"var(--fs-xs)",padding:0,lineHeight:1}}>✕</button>
                </span>
              ))}
            </div>
          )}

          {/* Grid de contactos */}
          {contFiltrado.length === 0 ? (
            <div className="card" style={{textAlign:"center",padding:"2rem",
              color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}>
              Sin contactos {filtroTipo!=="todos"?`de tipo "${getTipo(filtroTipo).nombre}"`:""}
            </div>
          ) : (
            <div className="item-grid" style={{"--item-minw":"260px"}}>
              {contFiltrado.map(c=>{
                const t = getTipo(c.tipo);
                return (
                  <div key={c.id} className="item-card item-card--top"
                    style={{"--item-accent":t.color,cursor:"pointer"}}
                    onClick={()=>abrirFicha("cont",c)}>
                    <div className="cch">
                      <div className="ccti" style={{fontSize:"var(--fs-lg)"}}>{t.icono}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="ccn">{c.nombre}</div>
                        <div className="ccr">{c.rol}</div>
                      </div>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                        padding:".1rem .4rem",borderRadius:10,flexShrink:0,
                        background:t.color+"18",color:t.color,border:`1px solid ${t.color}33`}}>
                        {t.nombre}
                      </span>
                    </div>
                    <div className="ccd">
                      <a href={`tel:${c.telefono}`} className="ctel">📞 {c.telefono}</a>
                      {c.email&&<a href={`mailto:${c.email}`} className="ceml">✉️ {c.email}</a>}
                    </div>
                    {c.web&&<div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                      color:"var(--cyan)",marginTop:".2rem"}}>
                      <a href={c.web} target="_blank" rel="noreferrer"
                        style={{color:"var(--cyan)",textDecoration:"none"}}
                        onClick={e=>e.stopPropagation()}>🌐 {c.web}</a>
                    </div>}
                    {c.notas&&<div className="cnota">{c.notas}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── PROTOCOLOS ── */}
      {sub==="protocolo" && (
        <div>
          <div className="pintro">
            <span style={{fontSize:"var(--fs-lg)"}}>🚨</span>
            <div>
              <div style={{fontWeight:700,marginBottom:".2rem"}}>Protocolo de emergencias</div>
              <div className="muted xs mono">Selecciona el tipo de incidencia para ver los pasos</div>
            </div>
          </div>
          <div className="pgrid">
            {PROTO_PASOS.map(p=>(
              <button key={p.id} className={cls("pbtn",proto===p.id&&"pactive")} onClick={()=>setProto(proto===p.id?null:p.id)}>
                <span style={{fontSize:"var(--fs-lg)"}}>{p.icon}</span><span>{p.titulo}</span>
              </button>
            ))}
          </div>
          {proto && (
            <div className="psteps">
              <div className="pst">{PROTO_PASOS.find(p=>p.id===proto)?.icon} {PROTO_PASOS.find(p=>p.id===proto)?.titulo}</div>
              {PROTO_PASOS.find(p=>p.id===proto)?.pasos.map((ps,i)=>(
                <div key={i} className="ps"><div className="psn">{i+1}</div><div className="pst2">{ps}</div></div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INCIDENCIAS ── */}
      {sub==="incidencias" && (
        <>
          <div className="pd" style={{marginBottom:".75rem"}}>
            {inc.length} incidencia{inc.length!==1?"s":""} ·{" "}
            {incAbiertas} abierta{incAbiertas!==1?"s":""}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:".55rem"}}>
            {inc.map(ic=>(
              <div key={ic.id} className={cls("icard",ic.estado==="resuelta"&&"ires")} style={{cursor:"pointer"}} onClick={()=>abrirFicha("inc",ic)}>
                <div className="ich">
                  <div className="fr g1">
                    <span className="mono" style={{fontSize:"var(--fs-sm)",color:"var(--amber)"}}>{ic.hora}</span>
                    <span className="badge" style={{background:ic.gravedad==="alta"?"var(--red-dim)":ic.gravedad==="media"?"var(--amber-dim)":"var(--green-dim)",color:ic.gravedad==="alta"?"var(--red)":ic.gravedad==="media"?"var(--amber)":"var(--green)"}}>{ic.gravedad}</span>
                    <span className="badge" style={{background:"var(--cyan-dim)",color:"var(--cyan)"}}>{ic.tipo}</span>
                  </div>
                  <div className="fr g1" onClick={e=>e.stopPropagation()}>
                    <button className="btn btn-sm" style={{background:"var(--green-dim)",color:"var(--green)",border:"1px solid rgba(52,211,153,0.2)"}}
                      onClick={()=>setInc(p=>p.map(x=>x.id===ic.id?{...x,estado:x.estado==="resuelta"?"abierta":"resuelta"}:x))}>
                      {ic.estado==="resuelta"?"✓ Resuelta":"Marcar resuelta"}
                    </button>
                  </div>
                </div>
                <div style={{fontWeight:600,fontSize:"var(--fs-base)",margin:".3rem 0"}}>{ic.descripcion}</div>
                {ic.responsable&&<div className="muted xs mono">👤 {ic.responsable}</div>}
                {ic.resolucion&&<div className="ires-txt">✓ {ic.resolucion}</div>}
              </div>
            ))}
            {inc.length===0&&<div className="empty">✅ Sin incidencias registradas</div>}
          </div>
        </>
      )}

      {/* Modal nuevo tipo de contacto */}
      {modalTipo && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModalTipo(false)}>
          <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:360}}>
            <div className="modal-header">
              <span className="modal-title">🏷️ Nuevo tipo de contacto</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setModalTipo(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body" style={{gap:".5rem"}}>
              <div>
                <label className="fl">Nombre del tipo *</label>
                <input className="inp" placeholder="ej. Federación, Patrocinador, Media..."
                  value={nuevoTipo.nombre}
                  onChange={e=>setNuevoTipo(p=>({...p,nombre:e.target.value}))} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem"}}>
                <div>
                  <label className="fl">Icono (emoji)</label>
                  <input className="inp" placeholder="🏷️" maxLength={2}
                    value={nuevoTipo.icono}
                    onChange={e=>setNuevoTipo(p=>({...p,icono:e.target.value}))} />
                </div>
                <div>
                  <label className="fl">Color</label>
                  <div style={{display:"flex",gap:".3rem",alignItems:"center"}}>
                    <input type="color" value={nuevoTipo.color}
                      onChange={e=>setNuevoTipo(p=>({...p,color:e.target.value}))}
                      style={{width:36,height:32,border:"1px solid var(--border)",borderRadius:6,cursor:"pointer",background:"none",padding:2}} />
                    <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                      color:"var(--text-muted)"}}>{nuevoTipo.color}</span>
                  </div>
                </div>
              </div>
              <div style={{padding:".4rem .6rem",borderRadius:6,
                background:"var(--surface2)",border:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  color:"var(--text-muted)",marginRight:".4rem"}}>Vista previa:</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                  padding:".12rem .45rem",borderRadius:20,
                  background:nuevoTipo.color+"20",color:nuevoTipo.color,
                  border:`1px solid ${nuevoTipo.color}44`}}>
                  {nuevoTipo.icono} {nuevoTipo.nombre||"Tipo"}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModalTipo(false)}>Cancelar</button>
              <button className="btn btn-primary"
                disabled={!nuevoTipo.nombre.trim()}
                style={{opacity:nuevoTipo.nombre.trim()?1:.5}}
                onClick={guardarTipo}>Crear tipo</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


function TabCK({ck,setCk,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,abrirModal,config,tareasProyecto=[],setTareasProyecto,onToggleSync,filtroTareaId=null,onClearFiltroTarea}) {
  const eventFecha = config?.fecha ? new Date(config.fecha) : new Date(EVENT_CONFIG_DEFAULT.fecha);
  const diasHasta = Math.ceil((eventFecha - new Date()) / 86400000);
  const faseActiva = (() => {
    if (diasHasta < 0)    return "Post-carrera";
    if (diasHasta <= 1)   return "Mañana carrera";
    if (diasHasta <= 2)   return "Día antes";
    if (diasHasta <= 7)   return "Semana antes";
    if (diasHasta <= 30)  return "1 mes antes";
    if (diasHasta <= 60)  return "2 meses antes";
    return "3 meses antes";
  })();
  const [fase,setFase]=useState(faseActiva);
  const [vistaKanban,setVistaKanban]=useState(false);
  // GAP-A: auto-cambiar a la fase que contiene el ítem vinculado a filtroTareaId
  React.useEffect(() => {
    if (filtroTareaId == null) return;
    const item = ck.find(c => c.proyectoTareaId === filtroTareaId);
    if (item?.fase) setFase(item.fase);
  }, [filtroTareaId]); // eslint-disable-line react-hooks/exhaustive-deps
  function toggle(ckId) {
    var ckNow = new Date().toTimeString().slice(0,5);
    setCk(function(ckPrev) {
      var ckNext = ckPrev.map(function(ckItm) {
        var nuevoEstado = ckItm.id===ckId ? (ckItm.estado==="completado" ? "pendiente" : "completado") : ckItm.estado;
        return ckItm.id===ckId ? {...ckItm, estado: nuevoEstado, completadoEn: nuevoEstado==="completado" ? ckNow : undefined} : ckItm;
      });
      var ckHit = ckNext.find(function(ckItm) { return ckItm.id===ckId; });
      if (ckHit && ckHit.proyectoTareaId && setTareasProyecto) {
        // ckHit.estado es ya el estado NUEVO (post-toggle desde ckNext).
        // Al desmarcar: volver a "pendiente", no "en curso" (en curso = trabajo activo, no deshacer).
        var ckNuevoEst = ckHit.estado==="completado" ? "completado" : "pendiente";
        setTareasProyecto(function(ckTrPrev) {
          return ckTrPrev.map(function(ckTr) {
            return ckTr.id===ckHit.proyectoTareaId ? {...ckTr, estado: ckNuevoEst} : ckTr;
          });
        });
      }
      // MEJ-05: sincronizar TL vinculado si existe _tlId
      if (ckHit?._tlId && onToggleSync) {
        onToggleSync(ckId, ckHit.estado, ckNow);
      }
      return ckNext;
    });
  }
  const upd=(id,f,v)=>setCk(p=>p.map(c=>c.id===id?{...c,[f]:v}:c));
  const pf=FASES_CHECKLIST.map(f=>{const it=ck.filter(c=>c.fase===f);const d=it.filter(c=>c.estado==="completado").length;return{f,it,d,t:it.length,pct:it.length?Math.round(d/it.length*100):0};});
  const fd=pf.find(x=>x.f===fase);
  return(
    <>
      <div className="ph">
        <div><div className="pt">✅ Pre-operativo</div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--violet-dim)", marginTop:".15rem", opacity:.8 }}>Checklist de preparación previa al evento · verificar antes de la salida</div><div className="pd" style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}><span style={{background:"rgba(167,139,250,.12)",color:"var(--violet)",border:"1px solid rgba(167,139,250,.25)",borderRadius:99,padding:".1rem .5rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700}}>📋 Semanas/días antes</span>{ck.filter(c=>c.estado==="completado").length}/{ck.length} completados</div></div>
        <div className="fr g1">
          <ListaKanbanToggle vistaKanban={vistaKanban} setVistaKanban={setVistaKanban} />
          <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={()=>abrirModal({tipo:"ck",fase:fase,tareasProyecto:tareasProyecto})}>+ Tarea</button>
        </div>
      </div>
      {/* GAP-A: Banner de filtro cuando se navega desde Ficha de tarea en Proyecto */}
      {filtroTareaId != null && (() => {
        const tareaRef = tareasProyecto.find(t => t.id === filtroTareaId);
        const ckVinculados = ck.filter(c => c.proyectoTareaId === filtroTareaId);
        return (
          <div style={{margin:".5rem 0",padding:".6rem .75rem",borderRadius:8,
            background:"rgba(34,211,238,.08)",border:"1px solid rgba(34,211,238,.3)",
            display:"flex",alignItems:"center",justifyContent:"space-between",gap:".5rem"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--cyan)"}}>
              🔗 Filtrado por tarea: <strong>{tareaRef?.titulo || `#${filtroTareaId}`}</strong>
              {ckVinculados.length > 0
                ? ` · ${ckVinculados.filter(c=>c.estado==="completado").length}/${ckVinculados.length} completados`
                : " · sin ítems vinculados"}
            </div>
            <button className="btn btn-ghost btn-sm"
              style={{fontSize:"var(--fs-xs)",padding:".15rem .4rem",flexShrink:0}}
              onClick={onClearFiltroTarea}>✕ Quitar filtro</button>
          </div>
        );
      })()}
      <div className="ftabs">
        {pf.map(f=>(
          <button key={f.f} className={cls("ftab",fase===f.f&&"fa",f.f===faseActiva&&"ftab-activa")} onClick={()=>setFase(f.f)}>
            <div style={{display:"flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.15rem"}}>
              <span style={{fontSize:"var(--fs-sm)",fontWeight:600}}>{f.f}</span>
              {f.f===faseActiva && (
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-2xs)",fontWeight:700,
                  background:"var(--cyan-dim)",color:"var(--cyan)",
                  border:"1px solid rgba(34,211,238,0.3)",borderRadius:3,
                  padding:"0.05rem 0.3rem",lineHeight:1.2,flexShrink:0}}>AHORA</span>
              )}
            </div>
            <span className="fprog mono" style={{color:f.pct===100?"var(--green)":f.pct>50?"var(--cyan)":"var(--text-muted)"}}>{f.d}/{f.t}</span>
            <div className="fbar"><div className="ffill" style={{width:`${f.pct}%`,background:f.pct===100?"var(--green)":f.pct>50?"var(--cyan)":"var(--amber)"}}/></div>
          </button>
        ))}
      </div>

      {/* ── KANBAN: columnas por fase ── */}
      {vistaKanban ? (
        <div style={{overflowX:"auto",paddingBottom:".5rem"}}>
          <div style={{display:"flex",gap:".6rem",minWidth:"max-content"}}>
            {pf.filter(f=>f.t>0).map(f=>{
              const esActiva = f.f===faseActiva;
              const color = f.pct===100?"var(--green)":esActiva?"var(--cyan)":"var(--text-muted)";
              const items = ordenAlfa ? [...f.it].sort((a,b)=>(a.tarea||"").localeCompare(b.tarea||"","es")) : f.it;
              return(
                <div key={f.f} style={{width:220,flexShrink:0,background:"var(--surface)",border:`1px solid ${esActiva?"rgba(34,211,238,.3)":"var(--border)"}`,borderTop:`2px solid ${color}`,borderRadius:"var(--r)",overflow:"hidden"}}>
                  <div style={{padding:".6rem .75rem",background:"var(--surface2)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:"var(--fs-sm)",fontWeight:700,color}}>{f.f}</div>
                      {esActiva && <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-2xs)",color:"var(--cyan)",marginTop:".1rem"}}>● AHORA</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".15rem"}}>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color,fontWeight:700}}>{f.d}/{f.t}</span>
                      <div style={{width:40,height:3,background:"var(--surface3)",borderRadius:2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${f.pct}%`,background:color,borderRadius:2}}/>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:".35rem .4rem",display:"flex",flexDirection:"column",gap:".3rem"}}>
                    {items.map(item=>{
                      const ec = item.estado==="completado"?"var(--green)":item.estado==="bloqueado"?"var(--red)":"var(--amber)";
                      return(
                        <div key={item.id} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:`3px solid ${ec}`,borderRadius:7,padding:".5rem .6rem",cursor:"pointer",opacity:item.estado==="completado"?.55:1}}
                          onClick={()=>abrirFicha("ck",item)}>
                          <div style={{fontSize:"var(--fs-sm)",fontWeight:600,marginBottom:".2rem",textDecoration:item.estado==="completado"?"line-through":"none",color:item.estado==="completado"?"var(--text-muted)":"var(--text)"}}>{item.tarea}{item.proyectoTareaId && <span title="Vinculada a tarea de Planificación" style={{marginLeft:".35rem",fontSize:"var(--fs-xs)",color:"var(--green)",fontFamily:"var(--font-mono)",verticalAlign:"middle"}}>↗ Proyecto</span>}{item._tlId && <span title="Vinculada a entrada del runbook del día D" style={{marginLeft:".35rem",fontSize:"var(--fs-xs)",color:"var(--violet)",fontFamily:"var(--font-mono)",verticalAlign:"middle"}}>↔ runbook</span>}{item.proyectoTareaId === filtroTareaId && filtroTareaId != null && <span style={{marginLeft:".35rem",fontSize:"var(--fs-xs)",color:"var(--cyan)",fontFamily:"var(--font-mono)",fontWeight:700,verticalAlign:"middle"}}>← filtrado</span>}</div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>👤 {item.responsable}</span>
                            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".08rem .3rem",borderRadius:3,background:item.prioridad==="alta"?"var(--red-dim)":"var(--amber-dim)",color:item.prioridad==="alta"?"var(--red)":"var(--amber)"}}>{item.prioridad}</span>
                          </div>
                          <div style={{marginTop:".3rem"}} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>toggle(item.id)}
                              style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,border:`1px solid ${item.estado==="completado"?"rgba(248,113,113,.3)":"rgba(52,211,153,.3)"}`,background:item.estado==="completado"?"var(--red-dim)":"var(--green-dim)",color:item.estado==="completado"?"var(--red)":"var(--green)",cursor:"pointer"}}>
                              {item.estado==="completado"?"↩ Reabrir":"✓ Completar"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {items.length===0 && <div style={{padding:".75rem",textAlign:"center",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-dim)"}}>—</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* ── LISTA: items de la fase seleccionada ── */}
          <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
            {(ordenAlfa?[...(fd?.it||[])].sort((a,b)=>(a.tarea||"").localeCompare(b.tarea||"","es")):fd?.it||[]).map(item=>(
              <div key={item.id} className={cls("cki",item.estado==="completado"&&"ckd",item.estado==="bloqueado"&&"ckb")} style={{cursor:"pointer"}} onClick={()=>abrirFicha("ck",item)}>
                <button className="ckbox" onClick={e=>{e.stopPropagation();toggle(item.id)}} style={{borderColor:item.estado==="completado"?"var(--green)":item.estado==="bloqueado"?"var(--red)":"var(--border)",background:item.estado==="completado"?"var(--green)":"transparent"}}>
                  {item.estado==="completado"&&<span style={{color:"#000",fontSize:"var(--fs-base)",fontWeight:800}}>✓</span>}
                  {item.estado==="bloqueado"&&<span style={{color:"var(--red)",fontSize:"var(--fs-base)"}}>!</span>}
                </button>
                <div style={{flex:1,minWidth:0}}>
                  <div className={cls("cktarea",item.estado==="completado"&&"ckdone")}>{item.tarea}</div>
                  <div className="ckmeta">👤 {item.responsable}{item.notas&&` · ${item.notas}`}</div>
                </div>
                <div className="fr g1" onClick={e=>e.stopPropagation()}>
                  <span className="badge" style={{background:item.prioridad==="alta"?"var(--red-dim)":"var(--amber-dim)",color:item.prioridad==="alta"?"var(--red)":"var(--amber)",fontSize:"var(--fs-xs)"}}>{item.prioridad}</span>
                  <select className="isml" value={item.estado} onChange={e=>upd(item.id,"estado",e.target.value)} style={{color:ESTADO_COLORES[item.estado],fontSize:"var(--fs-xs)",padding:"0.15rem 0.3rem"}}>
                    {ESTADO_TAREA.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}


// Exports
export { TabCont };
export { TabCK };
