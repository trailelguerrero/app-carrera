/**
 * TabTablon.jsx — Tarea 3.3
 * Tab de tablón de tareas (lista + kanban) del módulo Proyecto.
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import { blockCls as cls } from "@/lib/blockStyles";
import { usePaginacion } from "@/hooks/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { diasHasta, fmt, AREAS, ESTADOS, PRIORIDADES, EST_CFG, PRI_CFG, getArea, iniciales } from "./proyectoConstants";

export function TabTablon({ tareas, todasTareas, equipo, filtroArea, setFiltroArea, filtroResponsable, setFiltroResponsable, busquedaGlobal, setBusquedaGlobal, updEstado, setModal, setDelConf, setFicha }) {
  // Estado local — no necesitan vivir en el orquestador
  const [filtroEstado, setFiltroEstado]       = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [vista, setVista]                     = useState("lista"); // "lista" | "kanban"
  const [busqueda, setBusqueda]               = useState("");

  // Sincronizar búsqueda local con la búsqueda global del orquestador
  const handleBusqueda = (v) => { setBusqueda(v); setBusquedaGlobal(v); };
  const busquedaActiva = busquedaGlobal || busqueda;

  // Stats sobre TODAS las tareas (sin filtrar) para los conteos de pills
  const statsEstado = useMemo(() => {
    const c = {};
    ESTADOS.forEach(e => { c[e] = 0; });
    todasTareas.forEach(t => { c[t.estado] = (c[t.estado]||0)+1; });
    return c;
  }, [todasTareas]);

  const statsPrioridad = useMemo(() => {
    const c = {};
    PRIORIDADES.forEach(p => { c[p] = 0; });
    todasTareas.forEach(t => { if (t.prioridad) c[t.prioridad] = (c[t.prioridad]||0)+1; });
    return c;
  }, [todasTareas]);

  const statsArea = useMemo(() => {
    const c = {};
    todasTareas.forEach(t => { c[t.area] = (c[t.area]||0)+1; });
    return c;
  }, [todasTareas]);

  // Aplicar filtros locales (estado, prioridad, búsqueda) sobre las tareas
  // pre-filtradas por área/responsable que llegan del orquestador.
  const tareasLocales = useMemo(() => tareas.filter(t => {
    if (filtroEstado !== "todos" && t.estado !== filtroEstado) return false;
    if (filtroPrioridad !== "todas" && t.prioridad !== filtroPrioridad) return false;
    if (busquedaActiva) {
      const q = busquedaActiva.toLowerCase();
      if (!t.titulo.toLowerCase().includes(q) && !(t.notas||"").toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a,b) => (a.fechaLimite||"").localeCompare(b.fechaLimite||"")),
  [tareas, filtroEstado, filtroPrioridad, busquedaActiva]);

  const { items: tareasPag, PaginadorUI } = usePaginacion(tareasLocales, 15);
  const hayFiltros = filtroArea!=="todas"||filtroResponsable!=="todos"||filtroEstado!=="todos"||filtroPrioridad!=="todas"||busquedaActiva;
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true); // panel siempre visible por defecto
  const limpiar = () => { setFiltroArea("todas"); setFiltroResponsable("todos"); setFiltroEstado("todos"); setFiltroPrioridad("todas"); setBusqueda(""); setBusquedaGlobal(""); };

  // Auto-expandir panel al activar cualquier filtro
  useEffect(() => {
    if (hayFiltros) setFiltrosAbiertos(true);
  }, [hayFiltros]);

  // Resumen de filtros activos para mostrar en el botón cuando están colapsados
  const resumenFiltros = [
    filtroArea !== "todas" && AREAS.find(a=>a.id===filtroArea)?.label,
    filtroResponsable !== "todos" && equipo.find(p=>String(p.id)===filtroResponsable)?.nombre.split(" ")[0],
    filtroEstado !== "todos" && EST_CFG[filtroEstado]?.label,
    filtroPrioridad !== "todas" && filtroPrioridad,
  ].filter(Boolean);

  return (
    <>
      <div className="ph" style={{
        borderLeft: filtroArea !== "todas"
          ? `3px solid ${AREAS.find(a=>a.id===filtroArea)?.color || "var(--violet)"}`
          : "none",
        paddingLeft: filtroArea !== "todas" ? ".75rem" : undefined,
        transition: "all .2s",
      }}>
        <div>
          <div className="pt">
            {filtroArea !== "todas"
              ? <>{AREAS.find(a=>a.id===filtroArea)?.icon} {AREAS.find(a=>a.id===filtroArea)?.label}</>
              : "📋 Tablón de Tareas"
            }
          </div>
          <div style={{marginTop:".25rem"}}>
            <span style={{background:"rgba(52,211,153,.12)",color:"var(--green)",border:"1px solid rgba(52,211,153,.25)",borderRadius:99,padding:".1rem .5rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700}}>
              📆 Planificación · meses antes del evento
            </span>
          </div>
          <div className="pd">{tareasLocales.length} de {todasTareas.length} tareas · click para ver ficha</div>
        </div>
        <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
          <div className="filter-pill-group">
            <button className={`filter-pill${vista==="lista"   ? " active" : ""}`}
              onClick={() => setVista("lista")}>☰ Lista</button>
            <button className={`filter-pill${vista==="kanban"  ? " active" : ""}`}
              onClick={() => setVista("kanban")}>⬛ Kanban</button>
          </div>
          <button className="btn btn-primary" onClick={() => setModal({tipo:"tarea",data:null})}>+ Nueva tarea</button>
        </div>
      </div>

      {/* Filtros — barra principal siempre visible */}
      <div className="card filtros-card" style={{padding:".55rem .75rem"}}>
        <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
          {/* Buscador — siempre visible */}
          <div style={{flex:1,display:"flex",alignItems:"center",gap:".35rem",
            background:"var(--surface2)",border:"1px solid var(--border)",
            borderRadius:6,padding:".3rem .6rem",minWidth:0}}>
            <span style={{opacity:.45,fontSize:"var(--fs-base)",flexShrink:0}}>🔍</span>
            <input placeholder="Buscar tareas..." value={busquedaActiva}
              onChange={e => handleBusqueda(e.target.value)}
              style={{background:"none",border:"none",color:"var(--text)",
                fontFamily:"var(--font-display)",fontSize:"var(--fs-base)",
                outline:"none",width:"100%",minWidth:0}}/>
            {busquedaActiva && (
              <button onClick={()=>handleBusqueda("")}
                style={{background:"none",border:"none",color:"var(--text-muted)",
                  cursor:"pointer",fontSize:"var(--fs-sm)",padding:0,flexShrink:0}}>✕</button>
            )}
          </div>

          {/* Botón de filtros — muestra resumen de activos */}
          <button
            onClick={() => setFiltrosAbiertos(v=>!v)}
            className={`filter-pill${hayFiltros ? " active-violet" : ""}`}
            style={{ flexShrink:0 }}>
            🎛 {hayFiltros ? `${resumenFiltros.length} filtro${resumenFiltros.length!==1?"s":""}` : "Filtrar"}
            <span style={{fontSize:"var(--fs-xs)",opacity:.7,marginLeft:2}}>{filtrosAbiertos?"▲":"▼"}</span>
          </button>

          {/* Limpiar — solo si hay filtros activos */}
          {hayFiltros && (
            <button onClick={limpiar}
              style={{background:"none",border:"none",color:"var(--text-muted)",
                cursor:"pointer",fontSize:"var(--fs-base)",padding:".3rem",flexShrink:0}}
              title="Limpiar filtros"><span aria-hidden="true">✕</span></button>
          )}
        </div>

        {/* Resumen de filtros activos (chips) */}
        {hayFiltros && !filtrosAbiertos && (
          <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",marginTop:".4rem"}}>
            {filtroArea!=="todas" && (
              <span style={{display:"inline-flex",alignItems:"center",gap:".25rem",
                fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                background:"rgba(167,139,250,.1)",color:"var(--violet)",
                border:"1px solid rgba(167,139,250,.25)",borderRadius:20,
                padding:".1rem .5rem"}}>
                {AREAS.find(a=>a.id===filtroArea)?.icon} {AREAS.find(a=>a.id===filtroArea)?.label}
                <button onClick={()=>setFiltroArea("todas")}
                  style={{background:"none",border:"none",color:"inherit",cursor:"pointer",
                    padding:0,fontSize:"var(--fs-xs)",opacity:.7,lineHeight:1}}>✕</button>
              </span>
            )}
            {filtroEstado!=="todos" && (
              <span style={{display:"inline-flex",alignItems:"center",gap:".25rem",
                fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                background:EST_CFG[filtroEstado]?.bg,color:EST_CFG[filtroEstado]?.color,
                border:`1px solid ${EST_CFG[filtroEstado]?.color}44`,borderRadius:20,
                padding:".1rem .5rem"}}>
                {EST_CFG[filtroEstado]?.label}
                <button onClick={()=>setFiltroEstado("todos")}
                  style={{background:"none",border:"none",color:"inherit",cursor:"pointer",
                    padding:0,fontSize:"var(--fs-xs)",opacity:.7,lineHeight:1}}>✕</button>
              </span>
            )}
            {filtroPrioridad!=="todas" && (
              <span style={{display:"inline-flex",alignItems:"center",gap:".25rem",
                fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                background:PRI_CFG[filtroPrioridad]?.bg,color:PRI_CFG[filtroPrioridad]?.color,
                border:`1px solid ${PRI_CFG[filtroPrioridad]?.color}44`,borderRadius:20,
                padding:".1rem .5rem"}}>
                {filtroPrioridad}
                <button onClick={()=>setFiltroPrioridad("todas")}
                  style={{background:"none",border:"none",color:"inherit",cursor:"pointer",
                    padding:0,fontSize:"var(--fs-xs)",opacity:.7,lineHeight:1}}>✕</button>
              </span>
            )}
            {filtroResponsable!=="todos" && (
              <span style={{display:"inline-flex",alignItems:"center",gap:".25rem",
                fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                background:"var(--surface3)",color:"var(--text-muted)",
                border:"1px solid var(--border)",borderRadius:20,padding:".1rem .5rem"}}>
                👤 {equipo.find(p=>String(p.id)===filtroResponsable)?.nombre.split(" ")[0]}
                <button onClick={()=>setFiltroResponsable("todos")}
                  style={{background:"none",border:"none",color:"inherit",cursor:"pointer",
                    padding:0,fontSize:"var(--fs-xs)",opacity:.7,lineHeight:1}}>✕</button>
              </span>
            )}
          </div>
        )}

        {/* Panel de filtros — siempre visible */}
        {filtrosAbiertos && (
          <div style={{display:"flex",flexDirection:"column",gap:".55rem",marginTop:".5rem"}}>

            {/* Estado */}
            <div style={{display:"flex",alignItems:"flex-start",gap:".65rem",flexWrap:"wrap"}}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",fontWeight:700,minWidth:72,paddingTop:".2rem"}}>Estado</span>
              <div style={{display:"flex",flexWrap:"wrap",gap:".3rem"}}>
                {[{id:"todos",label:"Todos",count:todasTareas.length,color:"var(--text-muted)",bg:"rgba(255,255,255,.08)"},
                  ...ESTADOS.map(s=>({id:s,label:EST_CFG[s].label,count:statsEstado[s]||0,color:EST_CFG[s].color,bg:EST_CFG[s].bg}))
                ].map(({id,label,count,color,bg})=>(
                  <button key={id} onClick={()=>setFiltroEstado(id)}
                    className={"filter-pill"+(filtroEstado===id?" active":"")}
                    style={filtroEstado===id?{borderColor:color,color,background:bg}:{}}>
                    {label}
                    <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                      color:filtroEstado===id?color:"var(--text-dim)",
                      background:filtroEstado===id?bg:"transparent",
                      borderRadius:10,padding:"0 .3rem",marginLeft:".15rem",
                      minWidth:16,display:"inline-block",textAlign:"center",transition:"all .15s"}}>{count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prioridad */}
            <div style={{display:"flex",alignItems:"flex-start",gap:".65rem",flexWrap:"wrap"}}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",fontWeight:700,minWidth:72,paddingTop:".2rem"}}>Prioridad</span>
              <div style={{display:"flex",flexWrap:"wrap",gap:".3rem"}}>
                {[{id:"todas",label:"Todas",count:todasTareas.length,color:"var(--text-muted)",bg:"rgba(255,255,255,.08)"},
                  ...PRIORIDADES.map(p=>({id:p,label:p.charAt(0).toUpperCase()+p.slice(1),count:statsPrioridad[p]||0,color:PRI_CFG[p].color,bg:PRI_CFG[p].bg}))
                ].map(({id,label,count,color,bg})=>(
                  <button key={id} onClick={()=>setFiltroPrioridad(id)}
                    className={"filter-pill"+(filtroPrioridad===id?" active":"")}
                    style={filtroPrioridad===id?{borderColor:color,color,background:bg}:{}}>
                    {label}
                    <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                      color:filtroPrioridad===id?color:"var(--text-dim)",
                      background:filtroPrioridad===id?bg:"transparent",
                      borderRadius:10,padding:"0 .3rem",marginLeft:".15rem",
                      minWidth:16,display:"inline-block",textAlign:"center",transition:"all .15s"}}>{count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Área */}
            <div style={{display:"flex",alignItems:"flex-start",gap:".65rem",flexWrap:"wrap"}}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",fontWeight:700,minWidth:72,paddingTop:".2rem"}}>Área</span>
              <div style={{display:"flex",flexWrap:"wrap",gap:".3rem"}}>
                <button onClick={()=>setFiltroArea("todas")}
                  className={"filter-pill"+(filtroArea==="todas"?" active":"")}>
                  Todas
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                    color:filtroArea==="todas"?"var(--text-muted)":"var(--text-dim)",
                    background:filtroArea==="todas"?"rgba(255,255,255,.08)":"transparent",
                    borderRadius:10,padding:"0 .3rem",marginLeft:".15rem",
                    minWidth:16,display:"inline-block",textAlign:"center"}}>{todasTareas.length}</span>
                </button>
                {AREAS.map(a => {
                  const count = statsArea[a.id]||0;
                  if (!count) return null;
                  const active = filtroArea===a.id;
                  return (
                    <button key={a.id} onClick={()=>setFiltroArea(active?"todas":a.id)}
                      className={"filter-pill"+(active?" active":"")}
                      style={active?{borderColor:a.color,color:a.color,background:a.color+"18"}:{}}>
                      {a.icon} {a.label}
                      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                        color:active?a.color:"var(--text-dim)",
                        background:active?a.color+"25":"transparent",
                        borderRadius:10,padding:"0 .3rem",marginLeft:".15rem",
                        minWidth:16,display:"inline-block",textAlign:"center"}}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Responsable */}
            {equipo.length > 0 && (
              <div style={{display:"flex",alignItems:"flex-start",gap:".65rem",flexWrap:"wrap"}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",fontWeight:700,minWidth:72,paddingTop:".2rem"}}>Responsable</span>
                <div style={{display:"flex",flexWrap:"wrap",gap:".3rem"}}>
                  <button onClick={()=>setFiltroResponsable("todos")}
                    className={"filter-pill"+(filtroResponsable==="todos"?" active":"")}>
                    Todos
                    <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                      color:filtroResponsable==="todos"?"var(--text-muted)":"var(--text-dim)",
                      background:filtroResponsable==="todos"?"rgba(255,255,255,.08)":"transparent",
                      borderRadius:10,padding:"0 .3rem",marginLeft:".15rem",
                      minWidth:16,display:"inline-block",textAlign:"center"}}>{todasTareas.length}</span>
                  </button>
                  {equipo.map(p => {
                    const cnt = todasTareas.filter(t=>String(t.responsableId)===String(p.id)).length;
                    if (!cnt) return null;
                    const active = filtroResponsable===String(p.id);
                    return (
                      <button key={p.id} onClick={()=>setFiltroResponsable(active?"todos":String(p.id))}
                        className={"filter-pill"+(active?" active":"")}
                        style={active?{borderColor:p.color||"var(--cyan)",color:p.color||"var(--cyan)",background:(p.color||"#22d3ee")+"18"}:{}}>
                        {iniciales(p.nombre)} {p.nombre.split(" ")[0]}
                        <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                          color:active?p.color||"var(--cyan)":"var(--text-dim)",
                          background:active?(p.color||"#22d3ee")+"25":"transparent",
                          borderRadius:10,padding:"0 .3rem",marginLeft:".15rem",
                          minWidth:16,display:"inline-block",textAlign:"center"}}>{cnt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vistas */}
      {tareasLocales.length === 0 && (
        <EmptyState
          svg="tasks" color="var(--violet)"
          title="Sin tareas"
          sub="No hay tareas que coincidan con los filtros activos"
          action={<button className="btn btn-ghost btn-sm" onClick={() => setModal({tipo:"tarea",data:null})}>+ Nueva tarea</button>}
        />
      )}

      {/* ── VISTA LISTA ── */}
      {vista === "lista" && (
        <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
          {tareasPag.map(t => {
            const area = getArea(t.area);
            const resp = equipo.find(e => e.id===t.responsableId);
            const dias = t.fechaLimite ? diasHasta(t.fechaLimite) : null;
            const ec = EST_CFG[t.estado];
            const pc = PRI_CFG[t.prioridad];
            const vencida = dias !== null && dias < 0 && t.estado !== "completado";
            const dep = t.dependeDe ? todasTareas.find(x => x.id===t.dependeDe) : null;
            return (
              <div key={t.id} className={cls("tarea-row", vencida&&"tarea-vencida")}
                style={{borderLeftColor:area.color, cursor:"pointer"}}
                onClick={() => setFicha("tarea", t)}
                title="Click para ver ficha">
                {/* Icono de área — Kinetik Ops item-icon-pill */}
                <div className="item-icon-pill-sm" style={{"--pill-color": area.color, flexShrink:0}}>
                  <span style={{fontSize:"var(--fs-base)"}}>{area.icon}</span>
                </div>
                {/* Cambio de estado rápido */}
                <div className="tarea-estado-col" onClick={e => e.stopPropagation()}>
                  <select className="est-sel" value={t.estado}
                    onChange={e => updEstado(t.id, e.target.value)}
                    style={{color:ec.color, background:ec.bg, border:`1px solid ${ec.color}44`}}>
                    {ESTADOS.map(s => <option key={s} value={s}>{EST_CFG[s].label}</option>)}
                  </select>
                </div>
                {/* Contenido */}
                <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:".2rem"}}>
                  <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
                    <span style={{fontSize:"var(--fs-base)",fontWeight:700,
                      color:t.estado==="completado"?"var(--text-muted)":"var(--text)",
                      textDecoration:t.estado==="completado"?"line-through":"none"}}>{t.titulo}</span>
                    <span className="badge" style={{background:pc.bg,color:pc.color,fontSize:"var(--fs-2xs)"}}>{t.prioridad}</span>
                    {t.documentoId && <span title="Documento vinculado" style={{fontSize:"var(--fs-sm)",cursor:"help"}}>📎</span>}
                    {dep && (
                      dep.estado === "completado" ? (
                        <span className="badge" style={{
                          background:"rgba(52,211,153,.1)", color:"var(--green)",
                          fontSize:"var(--fs-2xs)", border:"1px solid rgba(52,211,153,.25)" }}
                          title={`Depende de: "${dep.titulo}" — completada ✓`}>
                          ✓ dep. resuelta
                        </span>
                      ) : (
                        <span className="badge" style={{
                          background:"rgba(248,113,113,.12)", color:"#f87171",
                          fontSize:"var(--fs-2xs)", border:"1px solid rgba(248,113,113,.3)",
                          cursor:"help" }}
                          title={`Depende de: "${dep.titulo}" — estado: ${dep.estado}`}>
                          🔒 espera: {dep.titulo.slice(0,22)}{dep.titulo.length>22?"…":""}
                        </span>
                      )
                    )}
                  </div>
                  <div style={{display:"flex",gap:".75rem",flexWrap:"wrap"}}>
                    <span className="mono xs" style={{color:area.color}}>{area.label}</span>
                    {resp && (
                      <span style={{display:"flex",alignItems:"center",gap:".3rem"}}>
                        <div style={{width:14,height:14,borderRadius:"50%",background:resp.color+"33",border:`1px solid ${resp.color}66`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".45rem",fontWeight:700,color:resp.color}}>{iniciales(resp.nombre)}</div>
                        <span className="mono xs muted">{resp.nombre.split(" ")[0]}</span>
                      </span>
                    )}
                    {t.notas && <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-dim)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220,fontStyle:"italic"}}>{t.notas}</span>}
                  </div>
                </div>
                {/* Fecha */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".3rem",flexShrink:0}}>
                  {dias !== null && (
                    <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",fontWeight:700,
                      color:vencida?"#f87171":dias<=7?"#fbbf24":dias<=14?"#fb923c":"var(--text-muted)",
                      background:vencida?"rgba(248,113,113,.1)":dias<=14?"var(--amber-dim)":"transparent",
                      padding:".1rem .35rem",borderRadius:4}}>
                      {vencida?`VENCIDA (${Math.abs(dias)}d)`:dias===0?"Hoy":`${dias}d · ${fmt(t.fechaLimite)}`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <PaginadorUI />
        </div>
      )}

      {/* ── VISTA KANBAN — 4 columnas incluyendo Bloqueado ── */}
      {vista === "kanban" && (
        <div className="kanban-grid" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
          {["pendiente","en curso","bloqueado","completado"].map(estado => {
            const col = EST_CFG[estado];
            const tareasCol = tareasLocales.filter(t => t.estado === estado);
            return (
              <div key={estado} className="kanban-col">
                {/* Cabecera */}
                <div className="kanban-col-hdr" style={{borderTopColor: col.color}}>
                  <span className="mono" style={{fontSize:"var(--fs-sm)",fontWeight:700,color:col.color,textTransform:"uppercase",letterSpacing:".08em"}}>{col.label}</span>
                  <span className="kanban-cnt" style={{background:col.bg,color:col.color,border:`1px solid ${col.color}44`}}>{tareasCol.length}</span>
                </div>
                {/* Cuerpo */}
                <div className="kanban-body">
                  {tareasCol.length === 0 && (
                    <div className="kanban-empty">Sin tareas</div>
                  )}
                  {tareasCol.map(t => {
                    const area    = getArea(t.area);
                    const resp    = equipo.find(e => e.id===t.responsableId);
                    const dias    = t.fechaLimite ? diasHasta(t.fechaLimite) : null;
                    const vencida = dias !== null && dias < 0 && t.estado !== "completado";
                    const bloq    = t.estado === "bloqueado";
                    const pc      = PRI_CFG[t.prioridad];
                    return (
                      <div key={t.id} className={cls("kanban-card", vencida&&"kanban-card-venc", bloq&&"kanban-card-bloq")}
                        style={{borderLeftColor: area.color}}
                        onClick={() => setFicha("tarea", t)}>
                        {/* Badge bloqueado */}

                        <div className="kanban-card-titulo" style={{
                          textDecoration:t.estado==="completado"?"line-through":"none",
                          color:t.estado==="completado"?"var(--text-muted)":"var(--text)",
                          opacity:bloq?0.7:1}}>
                          {t.titulo}
                        </div>
                        <div className="kanban-card-meta">
                          <div style={{display:"flex",gap:".35rem",alignItems:"center",flex:1,minWidth:0}}>
                            <div className="item-icon-pill-sm"
                              style={{"--pill-color": area.color, width:20, height:20, borderRadius:5, fontSize:"var(--fs-xs)", flexShrink:0}}>
                              {area.icon}
                            </div>
                            <span className="badge" style={{background:pc.bg,color:pc.color,fontSize:"var(--fs-2xs)"}}>{t.prioridad}</span>
                            {t.documentoId && <span title="Documento vinculado" style={{fontSize:"var(--fs-sm)",marginLeft:"-2px"}}>📎</span>}
                            {(() => {
                              const depK = t.dependeDe ? todasTareas.find(x => x.id === t.dependeDe) : null;
                              if (!depK) return null;
                              return depK.estado === "completado" ? (
                                <span title={`Dep.: "${depK.titulo}" ✓`}
                                  style={{fontSize:"var(--fs-xs)",color:"var(--green)",flexShrink:0}}>✓</span>
                              ) : (
                                <span title={`Espera: "${depK.titulo}" (${depK.estado})`}
                                  style={{fontSize:"var(--fs-xs)",flexShrink:0}}>🔒</span>
                              );
                            })()}
                            {resp && (
                              <div className="kanban-avatar" style={{background:resp.color+"33",border:`1px solid ${resp.color}66`,color:resp.color}}>
                                {iniciales(resp.nombre)}
                              </div>
                            )}
                          </div>
                          {dias !== null && (
                            <span className="mono" style={{fontSize:"var(--fs-xs)",fontWeight:700,flexShrink:0,
                              color:vencida?"#f87171":dias<=7?"#fbbf24":"var(--text-muted)"}}>
                              {vencida?`-${Math.abs(dias)}d`:dias===0?"Hoy":`${dias}d`}
                            </span>
                          )}
                        </div>
                        {/* Botones de estado rápido — área táctil >= 36px */}
                        <div className="kanban-acciones" onClick={e=>e.stopPropagation()}>
                          {estado === "pendiente" && !bloq && (
                            <button className="kanban-btn-estado"
                              style={{color:"var(--cyan)",borderColor:"rgba(34,211,238,.3)",background:"var(--cyan-dim)"}}
                              onClick={()=>updEstado(t.id,"en curso")}>▶ En curso</button>
                          )}
                          {estado === "pendiente" && bloq && (
                            <button className="kanban-btn-estado"
                              style={{color:"#94a3b8",borderColor:"rgba(148,163,184,.3)",background:"var(--surface3)"}}
                              onClick={()=>updEstado(t.id,"pendiente")}>🔓 Desbloquear</button>
                          )}
                          {estado === "en curso" && (
                            <>
                              <button className="kanban-btn-estado"
                                style={{color:"var(--green)",borderColor:"rgba(52,211,153,.3)",background:"var(--green-dim)"}}
                                onClick={()=>updEstado(t.id,"completado")}>✓ Completar</button>
                              <button className="kanban-btn-estado"
                                style={{color:"#f87171",borderColor:"rgba(248,113,113,.3)",background:"var(--red-dim)"}}
                                onClick={()=>updEstado(t.id,"bloqueado")}>🔒 Bloquear</button>
                            </>
                          )}
                          {estado === "completado" && (
                            <button className="kanban-btn-estado"
                              style={{color:"#94a3b8",borderColor:"rgba(148,163,184,.3)",background:"var(--surface3)"}}
                              onClick={()=>updEstado(t.id,"pendiente")}>↩ Reabrir</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── TAB GANTT ────────────────────────────────────────────────────────────────
