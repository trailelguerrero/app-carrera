/**
 * TabDash.jsx — Tarea 3.3
 * Tab de resumen/dashboard del módulo Proyecto.
 */
import { useState } from "react";
import { blockCls as cls } from "@/lib/blockStyles";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { diasHasta, fmt, AREAS, EST_CFG, PRI_CFG, getArea, iniciales } from "./proyectoConstants";

export function TabDash({ stats, equipo, setTab, setModal, setFicha, tareas, hitos, updEstado, isMobile, setFiltroArea, setFiltroResponsable, gestiones }) {
  const [cargaColapsada, setCargaColapsada] = useState(true); // colapsado por defecto
  return (
    <>
      {/* Semáforo por área */}
      <div className="card" style={{marginBottom:".85rem"}}>
        <div className="ct">🚦 Estado por área</div>
        <div className="area-grid">
          {stats.porArea.map(a => {
            const sc = {green:"#34d399", amber:"#fbbf24", red:"#f87171", blue:"#22d3ee"}[a.semaforo];
            return (
              <div key={a.id} className="area-card" style={{borderTopColor:a.color,cursor:"pointer"}}
                onClick={() => { setFiltroArea(a.id); setTab("tablón"); }}
                title={`Ver tareas de ${a.label}`}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".4rem"}}>
                  <div>
                    <div style={{fontSize:"var(--fs-lg)",marginBottom:".15rem"}}>{a.icon}</div>
                    <div style={{fontSize:"var(--fs-sm)",fontWeight:700,color:a.color,lineHeight:1.2}}>{a.label}</div>
                  </div>
                  <div style={{width:10,height:10,borderRadius:"50%",background:sc,boxShadow:`0 0 8px ${sc}88`,flexShrink:0,marginTop:2}}/>
                </div>
                <div>
                  <div className="pbar" style={{marginBottom:".3rem"}}>
                    <div className="pfill" style={{width:`${a.pct}%`,background:a.color}}/>
                  </div>
                  <div className="mono xs muted">{a.done}/{a.total} · {a.pct}%</div>
                  {a.venc > 0 && <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#f87171",marginTop:".15rem"}}>⚠ {a.venc} vencida{a.venc!==1?"s":""}</div>}
                </div>
                {{
                  permisos:       <button className="btn btn-ghost" style={{marginTop:".5rem",fontSize:"var(--fs-xs)",padding:".2rem .5rem",width:"100%"}} onClick={e=>{e.stopPropagation();window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"documentos"}}))}}>🏛️ Ver gestiones legales →</button>,
                  economico:      <button className="btn btn-ghost" style={{marginTop:".5rem",fontSize:"var(--fs-xs)",padding:".2rem .5rem",width:"100%"}} onClick={e=>{e.stopPropagation();window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"presupuesto"}}))}}>💰 Ver presupuesto →</button>,
                  comunicacion:   <button className="btn btn-ghost" style={{marginTop:".5rem",fontSize:"var(--fs-xs)",padding:".2rem .5rem",width:"100%"}} onClick={e=>{e.stopPropagation();window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"documentos"}}))}}>📁 Ver documentos →</button>,
                  patrocinadores: <button className="btn btn-ghost" style={{marginTop:".5rem",fontSize:"var(--fs-xs)",padding:".2rem .5rem",width:"100%"}} onClick={e=>{e.stopPropagation();window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"patrocinadores"}}))}}>🤝 Ver patrocinadores →</button>,
                  voluntarios:    <button className="btn btn-ghost" style={{marginTop:".5rem",fontSize:"var(--fs-xs)",padding:".2rem .5rem",width:"100%"}} onClick={e=>{e.stopPropagation();window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"voluntarios"}}))}}>👥 Ver voluntarios →</button>,
                  ruta:           <button className="btn btn-ghost" style={{marginTop:".5rem",fontSize:"var(--fs-xs)",padding:".2rem .5rem",width:"100%"}} onClick={e=>{e.stopPropagation();window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"logistica"}}))}}>🏔️ Ver logística →</button>,
                  logistica:      <button className="btn btn-ghost" style={{marginTop:".5rem",fontSize:"var(--fs-xs)",padding:".2rem .5rem",width:"100%"}} onClick={e=>{e.stopPropagation();window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"logistica"}}))}}>📦 Ver logística →</button>,
                  comercial:      <button className="btn btn-ghost" style={{marginTop:".5rem",fontSize:"var(--fs-xs)",padding:".2rem .5rem",width:"100%"}} onClick={e=>{e.stopPropagation();window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"camisetas"}}))}}>👕 Ver camisetas →</button>,
                  sanitario:      <button className="btn btn-ghost" style={{marginTop:".5rem",fontSize:"var(--fs-xs)",padding:".2rem .5rem",width:"100%"}} onClick={e=>{e.stopPropagation();window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"logistica"}}))}}>🏥 Ver logística →</button>,
                  diaD:           <button className="btn btn-ghost" style={{marginTop:".5rem",fontSize:"var(--fs-xs)",padding:".2rem .5rem",width:"100%"}} onClick={e=>{e.stopPropagation();window.dispatchEvent(new CustomEvent("teg-open-diacarrera"))}}>🏁 Vista día D →</button>,
                }[a.id] || null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="twocol">
        {/* Tareas urgentes */}
        <div className="card">
          <div className="ct">🔴 Urgente — próximos 14 días</div>
          {stats.criticas.length === 0 && stats.vencidas.length === 0 &&
            <div className="empty-sm">Sin tareas urgentes</div>}
          {[...stats.vencidas, ...stats.criticas].slice(0,8).map(t => {
            const area = getArea(t.area);
            const dias = diasHasta(t.fechaLimite);
            const p = equipo.find(e => e.id===t.responsableId);
            return (
              <div key={t.id} className="urg-row" style={{cursor:"pointer"}}
                onClick={() => setFicha("tarea", t)}
                title="Click para ver ficha de la tarea"
              >
                <div className="urg-dot" style={{background:area.color}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div className="urg-titulo">{t.titulo}</div>
                  <div className="mono xs muted">{area.icon} {area.label} {p ? `· ${p.nombre.split(" ")[0]}` : ""}</div>
                </div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                  color:dias<0?"#f87171":dias<=7?"#fbbf24":"#22d3ee",
                  background:dias<0?"rgba(248,113,113,.1)":dias<=7?"rgba(251,191,36,.1)":"rgba(34,211,238,.1)",
                  padding:".1rem .35rem",borderRadius:4,flexShrink:0}}>
                  {dias<0?`-${Math.abs(dias)}d`:`${dias}d`}
                </div>
              </div>
            );
          })}
          <button className="btn btn-ghost mt1 w100" onClick={() => setTab("tablón")}>Ver todas las tareas →</button>
        </div>

        {/* Carga por persona — colapsable */}
        <div className="card" style={{padding:0,overflow:"hidden"}}>
          <button
            onClick={() => setCargaColapsada(v => !v)}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:".75rem 1rem",background:"transparent",border:"none",
              cursor:"pointer",textAlign:"left",
              borderBottom: cargaColapsada ? "none" : "1px solid var(--border)"}}>
            <div>
              <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".1rem"}}>👥 Carga del equipo</div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>
                {stats.porPersona.filter(p=>p.urgentes>0).length > 0
                  ? `⚡ ${stats.porPersona.filter(p=>p.urgentes>0).length} persona${stats.porPersona.filter(p=>p.urgentes>0).length!==1?"s":"" } con tareas urgentes`
                  : `${stats.porPersona.length} personas · sin urgencias`}
              </div>
            </div>
            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-dim)",
              transform:cargaColapsada?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
          </button>
          {!cargaColapsada && <div style={{padding:".5rem 1rem 1rem"}}>
          {stats.porPersona.map(p => (
            <div key={p.id} className="carga-row" style={{cursor:"pointer"}}
              onClick={() => { setFiltroResponsable(String(p.id)); setTab("tablón"); }}
              title={`Ver tareas de ${p.nombre}`}>
              <div className="avatar" style={{background:p.color+"22",border:`2px solid ${p.color}55`,color:p.color}}>
                {iniciales(p.nombre)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"var(--fs-base)",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.nombre}</div>
                <div className="mono xs muted">{p.pendientes} pendiente{p.pendientes!==1?"s":""}{p.urgentes>0?` · ${p.urgentes} urgente${p.urgentes!==1?"s":""}`:""}</div>
                {/* Contacto directo — sin ir a otra pestaña */}
                <div style={{display:"flex",gap:".5rem",marginTop:".2rem"}} onClick={e=>e.stopPropagation()}>
                  {p.telefono && <a href={`tel:${p.telefono}`} className="mono xs" style={{color:"var(--cyan)",textDecoration:"none",opacity:.8}}>📞 {p.telefono}</a>}
                </div>
              </div>
              <div style={{display:"flex",gap:".25rem",flexShrink:0}}>
                {p.urgentes > 0 && <span className="badge" style={{background:"var(--red-dim)",color:"#f87171"}}>{p.urgentes}⚡</span>}
                <span className="badge" style={{background:"rgba(148,163,184,.1)",color:"#94a3b8"}}>{p.pendientes}</span>
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:".4rem",marginTop:".75rem"}}>
            <button className="btn btn-ghost" style={{flex:1}}
              onClick={() => setTab("equipo")}>Ver equipo completo →</button>
            <button className="btn btn-ghost btn-sm"
              onClick={() => setModal({tipo:"persona",data:null})}>+ Persona</button>
          </div>
          </div>}
        </div>
      </div>

      {/* ── GESTIONES LEGALES — panel de conexión con Documentos ── */}
      {gestiones && gestiones.length > 0 && (() => {
        const ESTADO_CFG = {
          pendiente:  { color:"#94a3b8", label:"Pendiente" },
          en_tramite: { color:"#22d3ee", label:"En trámite" },
          enviado:    { color:"#60a5fa", label:"Enviado" },
          firmado:    { color:"#a78bfa", label:"Firmado" },
          aprobado:   { color:"#34d399", label:"Aprobado ✓" },
          denegado:   { color:"#f87171", label:"Denegado ✗" },
        };
        const urgentes = gestiones.filter(g =>
          g.estado !== "aprobado" && g.estado !== "denegado"
        );
        return (
          <div className="card" style={{marginBottom:".85rem",borderLeft:"3px solid #38bdf8"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".65rem"}}>
              <div className="ct" style={{marginBottom:0}}>🏛️ Gestiones legales</div>
              <button className="btn btn-ghost btn-sm"
                onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"documentos"}}))}>
                Ver en Documentos →
              </button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:".35rem"}}>
              {urgentes.map(g => {
                const ec = ESTADO_CFG[g.estado] || ESTADO_CFG.pendiente;
                const diasV = g.fechaVencimiento
                  ? Math.ceil((new Date(g.fechaVencimiento)-new Date())/86400000)
                  : null;
                const vcolor = diasV===null?"var(--text-muted)":diasV<0?"#f87171":diasV<=30?"#fbbf24":"var(--text-muted)";
                return (
                  <div key={g.id} style={{
                    display:"flex",alignItems:"center",gap:".65rem",
                    padding:".5rem .65rem",borderRadius:8,
                    background:"var(--surface2)",border:"1px solid var(--border)",
                  }}>
                    <div style={{width:8,height:8,borderRadius:"50%",
                      background:ec.color,flexShrink:0,
                      boxShadow:`0 0 6px ${ec.color}66`}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"var(--fs-base)",fontWeight:600,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {g.nombre}
                      </div>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                        color:"var(--text-muted)"}}>
                        {g.subcategoria}
                        {g.fechaVencimiento && (
                          <span style={{color:vcolor,marginLeft:".5rem",fontWeight:700}}>
                            {diasV===null?"":diasV<0?`⚠ venció hace ${Math.abs(diasV)}d`:diasV===0?"⏰ hoy":`· ${diasV}d`}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                      color:ec.color,background:`${ec.color}15`,
                      border:`1px solid ${ec.color}33`,
                      borderRadius:3,padding:".1rem .4rem",flexShrink:0,
                    }}>{ec.label}</span>
                  </div>
                );
              })}
              {urgentes.length === 0 && (
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
                  color:"var(--green)",padding:".5rem 0",textAlign:"center"}}>
                  ✅ Todas las gestiones legales están aprobadas
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Próximos hitos */}
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem"}}>
          <div className="ct" style={{marginBottom:0}}>🏁 Próximos hitos</div>
          <button className="btn btn-sm btn-ghost" onClick={() => setTab("hitos")}>Ver todos</button>
        </div>
        <div className="hitos-timeline">
          {stats.hitosProx.map((h,i) => {
            const dias = diasHasta(h.fecha);
            const urgente = dias <= 30 && dias >= 0;
            const vencido = dias < 0;
            return (
              <div key={h.id} className="hito-row">
                <div className="hito-fecha">
                  <div className="mono xs" style={{color:vencido?"#f87171":urgente?"#fbbf24":"#22d3ee",fontWeight:700}}>{fmt(h.fecha)}</div>
                  <div className="mono xs muted">{vencido?`-${Math.abs(dias)}d`:`${dias}d`}</div>
                </div>
                <div className="hito-connector">
                  <div className="hito-gem" style={{background:h.critico?"#f87171":"#22d3ee",boxShadow:h.critico?"0 0 8px #f8717166":"0 0 8px #22d3ee66"}}/>
                  {i < stats.hitosProx.length-1 && <div className="hito-line"/>}
                </div>
                <div className="hito-label">
                  <div style={{fontSize:"var(--fs-base)",fontWeight:h.critico?700:500}}>{h.nombre}</div>
                  {h.critico && <span className="badge" style={{background:"rgba(248,113,113,.1)",color:"#f87171",fontSize:"var(--fs-2xs)"}}>CRÍTICO</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── TAB TABLÓN ───────────────────────────────────────────────────────────────
