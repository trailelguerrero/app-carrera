/**
 * TabEquipo.jsx — Tarea 3.3
 * Tab de gestión del equipo del módulo Proyecto.
 */
import { useState } from "react";
import { blockCls as cls } from "@/lib/blockStyles";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { diasHasta, fmt, AREAS, EST_CFG, PRI_CFG, getArea, iniciales } from "./proyectoConstants";

export function TabEquipo({ equipo, setEquipo, tareas, setModal, setDelConf, setFicha, voluntarios=[], contLog=[] }) {
  const [vistaEquipo, setVistaEquipo]  = useState("cards");
  const [ordenAlfa, setOrdenAlfa]      = useState(false);
  // Inicializar todas las áreas colapsadas por defecto
  const [areasColapsadas, setAreasCol] = useState(
    () => Object.fromEntries(AREAS.map(a => [a.id, true]))
  );
  const toggleArea = (areaId) => setAreasCol(p => ({...p, [areaId]: !p[areaId]}));
  const expandirTodo  = () => setAreasCol(Object.fromEntries(AREAS.map(a => [a.id, false])));
  const colapsarTodo  = () => setAreasCol(Object.fromEntries(AREAS.map(a => [a.id, true])));

  // Mover persona dentro del array global de equipo (solo cuando no hay A-Z)
  const moverPersona = (id, dir) => {
    if (ordenAlfa) return;
    setEquipo(prev => {
      const arr = [...prev];
      const i = arr.findIndex(x => x.id === id);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const equipoOrdenado = ordenAlfa
    ? [...equipo].sort((a,b) => (a.nombre||"").localeCompare(b.nombre||"","es"))
    : equipo;
  const areasConPersonas = AREAS.filter(a => equipoOrdenado.some(p => p.area === a.id));
  return (
    <>
      {/* ── Banner de interconexiones ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".6rem", marginBottom:".85rem" }}>
        <div style={{ padding:".65rem .85rem", borderRadius:8, background:"rgba(167,139,250,.06)", border:"1px solid rgba(167,139,250,.15)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:".5rem" }}>
          <div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700, color:"var(--violet)" }}>👥 Voluntarios</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)", marginTop:".1rem" }}>
              {voluntarios.filter(v=>v.estado==="confirmado").length} confirmados · {voluntarios.filter(v=>v.estado==="pendiente").length} pendientes
            </div>
          </div>
          <button className="btn btn-ghost btn-sm"
            onClick={()=>window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"voluntarios"}}))}>
            Ver →
          </button>
        </div>
        <div style={{ padding:".65rem .85rem", borderRadius:8, background:"rgba(251,146,60,.06)", border:"1px solid rgba(251,146,60,.15)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:".5rem" }}>
          <div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700, color:"var(--amber)" }}>📋 Directorio Logística</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)", marginTop:".1rem" }}>
              {contLog.length} contactos registrados
            </div>
          </div>
          <button className="btn btn-ghost btn-sm"
            onClick={()=>window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"logistica", subtab:"contactos"}}))}>
            Ver →
          </button>
        </div>
      </div>
      <div className="ph">
        <div>
          <div className="pt">👥 Equipo Organizador</div>
          <div className="pd">{equipo.length} personas · Trail El Guerrero 2026</div>
        </div>
        <div style={{display:"flex",gap:".5rem",alignItems:"center",flexWrap:"wrap"}}>
          {vistaEquipo === "cards" && (
            <div className="filter-pill-group">
              <button className="filter-pill" onClick={expandirTodo} title="Expandir todas las áreas">⊞</button>
              <button className="filter-pill" onClick={colapsarTodo} title="Colapsar todas las áreas">⊟</button>
            </div>
          )}
          <div className="filter-pill-group">
            <button className={`filter-pill${vistaEquipo==="cards" ? " active" : ""}`}
              onClick={() => setVistaEquipo("cards")}>☰ Cards</button>
            <button className={`filter-pill${vistaEquipo==="kanban" ? " active" : ""}`}
              onClick={() => setVistaEquipo("kanban")}>⬛ Áreas</button>
          </div>
          <button className={`btn btn-sm ${ordenAlfa?"btn-primary":"btn-ghost"}`} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={() => setModal({tipo:"persona",data:null})}>+ Añadir persona</button>
        </div>
      </div>

      {/* ── KANBAN POR ÁREA ── */}
      {vistaEquipo === "kanban" && (
        <div className="kanban-grid" style={{gridTemplateColumns:`repeat(${Math.min(areasConPersonas.length,3)},1fr)`}}>
          {areasConPersonas.map(area => {
            const personas = equipoOrdenado.filter(p => p.area === area.id);
            return (
              <div key={area.id} className="kanban-col">
                <div className="kanban-col-hdr" style={{borderTopColor:area.color}}>
                  <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color:area.color}}>{area.icon} {area.label}</span>
                  <span className="kanban-cnt" style={{background:area.color+"22",color:area.color,border:`1px solid ${area.color}44`}}>{personas.length}</span>
                </div>
                <div className="kanban-body">
                  {personas.map(p => {
                    const pt = tareas.filter(t => t.responsableId===p.id && t.estado!=="completado");
                    const urgentes = pt.filter(t => t.fechaLimite && diasHasta(t.fechaLimite)<=14).length;
                    return (
                      <div key={p.id} className="kanban-card" style={{borderLeftColor:p.color,cursor:"pointer"}}
                        onClick={()=>setFicha("persona", p)}>
                        <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".35rem"}}>
                          <div className="kanban-avatar" style={{background:p.color+"33",border:`1px solid ${p.color}66`,color:p.color}}>
                            {iniciales(p.nombre)}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:"var(--fs-base)",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                            <div className="mono xs muted">{p.rol}</div>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",marginBottom:".35rem"}}>
                          {pt.length>0 && <span className="badge" style={{background:"rgba(148,163,184,.1)",color:"#94a3b8",fontSize:"var(--fs-2xs)"}}>{pt.length} tarea{pt.length!==1?"s":""}</span>}
                          {urgentes>0 && <span className="badge" style={{background:"rgba(251,191,36,.1)",color:"#fbbf24",fontSize:"var(--fs-2xs)"}}>⚡{urgentes} urgente{urgentes!==1?"s":""}</span>}
                        </div>
                        <div className="kanban-acciones" onClick={e=>e.stopPropagation()}>
                          <button className="kanban-btn-estado" style={{color:"var(--violet)",borderColor:"rgba(167,139,250,.3)",background:"var(--violet-dim)"}}
                            onClick={()=>setModal({tipo:"persona",data:p})}>✏️ Editar</button>
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

      {/* ── CARDS — agrupadas por área, colapsables ── */}
      {vistaEquipo === "cards" && (
        <div style={{display:"flex", flexDirection:"column", gap:".75rem"}}>
          {areasConPersonas.map(area => {
            const personas = equipoOrdenado.filter(p => p.area === area.id);
            const collapsed = areasColapsadas[area.id];
            const tareasArea = personas.flatMap(p => tareas.filter(t => t.responsableId===p.id && t.estado!=="completado"));
            const urgentesArea = tareasArea.filter(t => t.fechaLimite && diasHasta(t.fechaLimite) <= 7).length;
            return (
              <div key={area.id} style={{
                borderRadius:10, overflow:"hidden",
                border:`1px solid ${area.color}2a`,
              }}>
                {/* Cabecera del área */}
                <button
                  onClick={() => toggleArea(area.id)}
                  style={{
                    width:"100%", display:"flex", alignItems:"center", gap:".65rem",
                    padding:".6rem .9rem", background:`${area.color}0d`,
                    border:"none", cursor:"pointer", textAlign:"left",
                    borderBottom: collapsed ? "none" : `1px solid ${area.color}1a`,
                  }}>
                  <span style={{fontSize:"var(--fs-md)"}}>{area.icon}</span>
                  <span style={{fontFamily:"var(--font-mono)", fontWeight:700,
                    fontSize:"var(--fs-base)", color:area.color, flex:1}}>
                    {area.label}
                  </span>
                  {urgentesArea > 0 && (
                    <span style={{fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      fontWeight:700, padding:".1rem .4rem", borderRadius:20,
                      background:"rgba(251,191,36,.15)", color:"var(--amber)",
                      border:"1px solid rgba(251,191,36,.25)"}}>
                      ⚡ {urgentesArea} urgente{urgentesArea!==1?"s":""}
                    </span>
                  )}
                  <span style={{fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                    color:"var(--text-dim)", padding:".1rem .4rem",
                    borderRadius:20, background:"rgba(255,255,255,.05)"}}>
                    {personas.length} persona{personas.length!==1?"s":""}
                  </span>
                  <span style={{
                    fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                    color:"var(--text-dim)", flexShrink:0,
                    transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    transition:"transform .18s",
                  }}>▼</span>
                </button>

                {/* Grid de personas */}
                {!collapsed && (
                  <div style={{
                    display:"grid",
                    gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",
                    gap:".75rem", padding:".75rem",
                    background:"var(--surface)",
                  }}>
                    {personas.map(p => {
                      const pt = tareas.filter(t => t.responsableId===p.id);
                      const completadas = pt.filter(t => t.estado==="completado").length;
                      const pendientes = pt.filter(t => t.estado!=="completado").length;
                      const vencidas = pt.filter(t => t.estado!=="completado" && t.fechaLimite && diasHasta(t.fechaLimite) < 0).length;
                      const urgentes = pt.filter(t => t.estado!=="completado" && t.fechaLimite && diasHasta(t.fechaLimite) <= 14 && diasHasta(t.fechaLimite) >= 0).length;
                      const pct = pt.length ? Math.round(completadas/pt.length*100) : 0;
                      const areaP = getArea(p.area);
                      return (
                        <div key={p.id} className="persona-card" style={{borderTopColor:p.color, cursor:"pointer", position:"relative"}}
                          onClick={() => setFicha("persona", p)}
                          title={`Ver ficha de ${p.nombre}`}>
                          {/* Botones de reorden — solo sin A-Z */}
                          {!ordenAlfa && (
                            <div
                              onClick={e=>e.stopPropagation()}
                              style={{position:"absolute",top:".5rem",right:".5rem",
                                display:"flex",flexDirection:"column",gap:".15rem",zIndex:2}}>
                              {(() => {
                                const idxPersona = equipo.findIndex(x=>x.id===p.id);
                                const prevArea = equipo[idxPersona-1];
                                const nextArea = equipo[idxPersona+1];
                                return (<>
                                  <button
                                    title="Subir"
                                    disabled={idxPersona===0}
                                    onClick={()=>moverPersona(p.id,-1)}
                                    style={{width:22,height:22,borderRadius:4,border:"1px solid var(--border)",
                                      background:"var(--surface2)",cursor:idxPersona===0?"not-allowed":"pointer",
                                      color:idxPersona===0?"var(--text-dim)":"var(--text-muted)",
                                      fontSize:"var(--fs-xs)",display:"flex",alignItems:"center",justifyContent:"center",
                                      opacity:idxPersona===0?.35:1}}>▲</button>
                                  <button
                                    title="Bajar"
                                    disabled={idxPersona===equipo.length-1}
                                    onClick={()=>moverPersona(p.id,+1)}
                                    style={{width:22,height:22,borderRadius:4,border:"1px solid var(--border)",
                                      background:"var(--surface2)",cursor:idxPersona===equipo.length-1?"not-allowed":"pointer",
                                      color:idxPersona===equipo.length-1?"var(--text-dim)":"var(--text-muted)",
                                      fontSize:"var(--fs-xs)",display:"flex",alignItems:"center",justifyContent:"center",
                                      opacity:idxPersona===equipo.length-1?.35:1}}>▼</button>
                                </>);
                              })()}
                            </div>
                          )}
              <div style={{display:"flex",gap:".75rem",alignItems:"flex-start",marginBottom:".85rem"}}>
                <div className="avatar-lg" style={{background:p.color+"22",border:`2px solid ${p.color}66`,color:p.color}}>
                  {iniciales(p.nombre)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:"var(--fs-md)",marginBottom:".15rem",display:"flex",alignItems:"center",gap:".4rem"}}>
                    {p.nombre}
                    {voluntarios.some(v=>v.nombre?.toLowerCase().includes(p.nombre?.split(" ")[0]?.toLowerCase())&&v.estado==="confirmado") && (
                      <span title="También registrado como voluntario confirmado" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--green)",background:"rgba(52,211,153,.1)",borderRadius:4,padding:"0 .3rem"}}>✓ Vol</span>
                    )}
                  </div>
                  <div className="mono xs muted" style={{marginBottom:".25rem"}}>{p.rol}</div>
                  <div style={{display:"flex",alignItems:"center",gap:".3rem"}}>
                    <span style={{fontSize:"var(--fs-sm)"}}>{areaP.icon}</span>
                    <span className="mono xs" style={{color:areaP.color}}>{areaP.label}</span>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:".2rem",marginBottom:".75rem",padding:".5rem .65rem",background:"var(--surface2)",borderRadius:8}}>
                {p.telefono && <a href={`tel:${p.telefono}`} className="mono xs" style={{color:"var(--cyan)",textDecoration:"none"}}>📞 {p.telefono}</a>}
                {p.email && <a href={`mailto:${p.email}`} className="mono xs" style={{color:"var(--cyan)",textDecoration:"none"}}>✉️ {p.email}</a>}
              </div>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:".3rem"}}>
                  <span className="mono xs muted">Progreso de tareas</span>
                  <span className="mono xs" style={{color:p.color,fontWeight:700}}>{pct}%</span>
                </div>
                <div className="pbar" style={{marginBottom:".5rem"}}>
                  <div className="pfill" style={{width:`${pct}%`,background:p.color}}/>
                </div>
                <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
                  <span className="badge" style={{background:"rgba(52,211,153,.1)",color:"#34d399"}}>{completadas} hechas</span>
                  <span className="badge" style={{background:"rgba(148,163,184,.1)",color:"#94a3b8"}}>{pendientes} pendientes</span>
                  {vencidas > 0 && <span className="badge" style={{background:"var(--red-dim)",color:"#f87171"}}>⚠ {vencidas} vencida{vencidas!==1?"s":""}</span>}
                  {urgentes > 0 && <span className="badge" style={{background:"rgba(251,191,36,.1)",color:"#fbbf24"}}>⚡ {urgentes} urgente{urgentes!==1?"s":""}</span>}
                </div>
              </div>
              {pt.filter(t => t.estado!=="completado").length > 0 && (
                <div style={{marginTop:".75rem",borderTop:"1px solid var(--border)",paddingTop:".6rem"}}>
                  <div className="mono xs muted" style={{marginBottom:".3rem"}}>Próximas tareas</div>
                  {pt.filter(t => t.estado!=="completado" && t.fechaLimite).sort((a,b) => a.fechaLimite.localeCompare(b.fechaLimite)).slice(0,3).map(t => {
                    const dias = diasHasta(t.fechaLimite);
                    return (
                      <div key={t.id}
                        onClick={e => { e.stopPropagation(); setFicha("tarea", t); }}
                        style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                          padding:".25rem .35rem",borderBottom:"1px solid rgba(30,45,80,.2)",
                          cursor:"pointer",borderRadius:4,transition:"background .12s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="var(--surface3)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <span style={{fontSize:"var(--fs-sm)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,paddingRight:".5rem"}}>{t.titulo}</span>
                        <span className="mono xs" style={{color:dias<0?"#f87171":dias<=7?"#fbbf24":"var(--text-muted)",flexShrink:0}}>
                          {dias<0?`-${Math.abs(dias)}d`:`${dias}d`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── TAB HITOS ────────────────────────────────────────────────────────────────
