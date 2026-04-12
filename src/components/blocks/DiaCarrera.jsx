import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useData } from "@/lib/dataService";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { getEventDate } from "@/lib/eventUtils";

const LS_LOG = "teg_logistica_v1";
const LS_VOL = "teg_voluntarios_v1";

const CAT_ICON  = { logistica:"🚚", organizacion:"📋", voluntarios:"👥", carrera:"🏃", comunicacion:"📡" };
const CAT_COLOR = { logistica:"#fbbf24", organizacion:"#a78bfa", voluntarios:"#34d399", carrera:"#22d3ee", comunicacion:"#fb923c" };
const TIPO_COLOR = { emergencia:"#f87171", institucional:"#a78bfa", proveedor:"#22d3ee", staff:"#34d399" };

const CSS = `
.dc{position:fixed;inset:0;background:var(--bg);z-index:9000;display:flex;flex-direction:column;overflow:hidden;font-family:'Syne',sans-serif;}
.dc-hdr{display:flex;align-items:center;justify-content:space-between;padding:.6rem 1rem;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0;}
.dc-title{font-weight:800;font-size:.95rem;}
.dc-sub{font-family:'DM Mono',monospace;font-size:.58rem;color:var(--text-muted);margin-top:.1rem;}
.dc-next{padding:.45rem 1rem;background:rgba(34,211,238,.06);border-bottom:1px solid rgba(34,211,238,.15);display:flex;align-items:center;gap:.6rem;flex-shrink:0;}
.dc-tabs{display:flex;gap:.3rem;overflow-x:auto;padding:.45rem 1rem;border-bottom:1px solid var(--border);flex-shrink:0;scrollbar-width:none;}
.dc-tabs::-webkit-scrollbar{display:none;}
.dc-tab{padding:.38rem .8rem;border-radius:20px;font-family:'DM Mono',monospace;font-size:.68rem;font-weight:700;cursor:pointer;border:1.5px solid var(--border);background:none;color:var(--text-muted);white-space:nowrap;transition:all .15s;}
.dc-tab.on{background:rgba(34,211,238,.1);color:#22d3ee;border-color:rgba(34,211,238,.35);}
.dc-body{flex:1;overflow-y:auto;padding:.75rem 1rem 5rem;}
.dc-row{display:flex;gap:.6rem;padding:.55rem .7rem;border-radius:10px;background:var(--surface);border:1px solid var(--border);margin-bottom:.4rem;}
.dc-row.done{opacity:.5;}
.dc-hora{font-family:'DM Mono',monospace;font-weight:800;font-size:.8rem;color:#22d3ee;width:42px;flex-shrink:0;padding-top:.1rem;}
.dc-chk{width:26px;height:26px;border-radius:7px;border:2px solid var(--border);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;}
.dc-chk.on{background:var(--green);border-color:var(--green);}
.dc-sect{font-family:'DM Mono',monospace;font-size:.6rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin:.75rem 0 .35rem;}
.dc-tel{display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .6rem;border-radius:8px;font-family:'DM Mono',monospace;font-size:.7rem;font-weight:800;text-decoration:none;transition:all .15s;}
`;

export default function DiaCarrera({ onClose }) {
  const [tab, setTab] = useState("timeline");
  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const [eventCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config     = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [rawTl,  setTl]   = useData(LS_LOG + "_tl",  []);
  const [rawCont]         = useData(LS_LOG + "_cont", []);
  const [rawCk,  setCk]   = useData(LS_LOG + "_ck",  []);
  const [rawPuestos]      = useData(LS_VOL + "_puestos", []);
  const [rawVols, setVols]= useData(LS_VOL + "_voluntarios", []);

  const tl       = Array.isArray(rawTl)      ? [...rawTl].sort((a,b)=>a.hora.localeCompare(b.hora)) : [];
  const contactos= Array.isArray(rawCont)    ? rawCont : [];
  const ck       = Array.isArray(rawCk)      ? rawCk  : [];
  const puestos  = Array.isArray(rawPuestos) ? rawPuestos : [];
  const vols     = Array.isArray(rawVols)    ? rawVols : [];

  const hora = ahora.toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" });
  const confirmados = vols.filter(v => v.estado === "confirmado");
  const presentes   = vols.filter(v => v.presente).length;

  const proxima = useMemo(() =>
    tl.find(t => !t.done && t.hora >= hora) || null
  , [tl, hora]);

  const toggleTl  = id => setTl(prev  => prev.map(t => t.id===id ? {...t, done:!t.done} : t));
  const toggleVol = id => setVols(prev => prev.map(v => v.id===id ? {...v, presente:!v.presente} : v));
  const toggleCk  = id => setCk(prev  => prev.map(t => t.id===id
    ? {...t, estado: t.estado==="completado" ? "pendiente" : "completado"} : t));

  const TABS = [
    {id:"timeline",    label:"⏱ Timeline"},
    {id:"voluntarios", label:"👥 Voluntarios"},
    {id:"puestos",     label:"📍 Puestos"},
    {id:"contactos",   label:"🚨 Contactos"},
    {id:"checklist",   label:"✅ Checklist"},
  ];

  const modal = (
    <div className="dc">
      <style>{CSS}</style>

      {/* Header */}
      <div className="dc-hdr">
        <div>
          <div className="dc-title">🏔️ Día de Carrera</div>
          <div className="dc-sub">
            {config.nombre} · {hora} ·{" "}
            <span style={{color:"var(--green)"}}>{presentes}/{confirmados.length} presentes</span>
          </div>
        </div>
        <button onClick={onClose} style={{
          background:"var(--surface2)", border:"1px solid var(--border)",
          borderRadius:8, color:"var(--text-muted)", cursor:"pointer",
          padding:".35rem .7rem", fontFamily:"'DM Mono',monospace",
          fontSize:".68rem", fontWeight:700,
        }}>✕ Salir</button>
      </div>

      {/* Próxima tarea */}
      {proxima && (
        <div className="dc-next">
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:".6rem",color:"#22d3ee",fontWeight:700}}>PRÓXIMO</span>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:".72rem",fontWeight:800,color:"#22d3ee"}}>{proxima.hora}</span>
          <span style={{fontSize:".78rem",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {proxima.titulo}
          </span>
          <span>{CAT_ICON[proxima.categoria] || "📌"}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="dc-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`dc-tab${tab===t.id?" on":""}`}
            onClick={() => setTab(t.id)}>{t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="dc-body">

        {tab === "timeline" && (
          <>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:".6rem",color:"var(--text-muted)",marginBottom:".5rem"}}>
              {tl.filter(t=>t.done).length}/{tl.length} completados
            </div>
            {tl.map(item => (
              <div key={item.id} className={`dc-row${item.done?" done":""}`}>
                <button className={`dc-chk${item.done?" on":""}`} onClick={() => toggleTl(item.id)}>
                  {item.done && <span style={{color:"#000",fontSize:".7rem",fontWeight:700}}>✓</span>}
                </button>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:".4rem",marginBottom:".15rem"}}>
                    <span className="dc-hora">{item.hora}</span>
                    <span style={{fontSize:".7rem"}}>{CAT_ICON[item.categoria]||"📌"}</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:".8rem",textDecoration:item.done?"line-through":"none",
                    color:item.done?"var(--text-dim)":"var(--text)"}}>{item.titulo}</div>
                  {item.descripcion && (
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:".6rem",color:"var(--text-muted)",marginTop:".15rem",lineHeight:1.5}}>
                      {item.descripcion}
                    </div>
                  )}
                  {item.responsable && (
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:".57rem",color:"var(--text-dim)",marginTop:".15rem"}}>
                      👤 {item.responsable}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {tl.length === 0 && <Empty msg="Sin timeline. Añade entradas en Logística → Timeline." />}
          </>
        )}

        {tab === "voluntarios" && (
          <>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:".6rem",color:"var(--text-muted)",marginBottom:".5rem"}}>
              {presentes} presentes · {confirmados.length - presentes} pendientes
            </div>
            {confirmados.map(v => {
              const puesto = puestos.find(p => p.id === v.puestoId);
              return (
                <div key={v.id} className="dc-row">
                  <button className={`dc-chk${v.presente?" on":""}`} onClick={() => toggleVol(v.id)}>
                    {v.presente && <span style={{color:"#000",fontSize:".7rem",fontWeight:700}}>✓</span>}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:".82rem",color:v.presente?"var(--green)":"var(--text)"}}>
                      {v.nombre}
                    </div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:".58rem",color:"var(--text-muted)"}}>
                      {puesto?.nombre || "Sin puesto"} · {v.telefono || "—"}
                    </div>
                  </div>
                  {v.talla && <span style={{fontFamily:"'DM Mono',monospace",fontSize:".6rem",
                    background:"var(--surface2)",border:"1px solid var(--border)",
                    borderRadius:4,padding:".1rem .35rem",color:"var(--text-muted)"}}>{v.talla}</span>}
                  {v.coche && <span title="Tiene coche">🚗</span>}
                </div>
              );
            })}
            {confirmados.length === 0 && <Empty msg="Sin voluntarios confirmados." />}
          </>
        )}

        {tab === "puestos" && (
          <>
            {puestos.map(p => {
              const asig = vols.filter(v => v.puestoId===p.id && v.estado==="confirmado");
              const pres = asig.filter(v => v.presente).length;
              const color = pres >= (p.necesarios||1) ? "var(--green)" : pres > 0 ? "var(--amber)" : "var(--red)";
              return (
                <div key={p.id} style={{padding:".7rem .85rem",borderRadius:10,
                  background:"var(--surface)",border:"1px solid var(--border)",
                  borderLeft:`3px solid ${color}`,marginBottom:".5rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".3rem"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:".82rem"}}>{p.nombre}</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:".6rem",color:"var(--text-muted)"}}>
                        {p.horaInicio}–{p.horaFin} · necesarios: {p.necesarios||1}
                      </div>
                    </div>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:".78rem",fontWeight:800,color,flexShrink:0}}>
                      {pres}/{asig.length}
                    </span>
                  </div>
                  {asig.map(v => (
                    <div key={v.id} style={{display:"flex",alignItems:"center",gap:".4rem",
                      padding:".2rem 0",borderTop:"1px solid var(--border)"}}>
                      <span style={{width:7,height:7,borderRadius:"50%",flexShrink:0,
                        background:v.presente?"var(--green)":"var(--border)"}} />
                      <span style={{fontSize:".75rem",flex:1,color:v.presente?"var(--text)":"var(--text-muted)"}}>
                        {v.nombre}
                      </span>
                      {v.telefono && (
                        <a href={`tel:${v.telefono}`} style={{color:"var(--cyan)",fontSize:".8rem",textDecoration:"none"}}>
                          📞
                        </a>
                      )}
                    </div>
                  ))}
                  {asig.length===0 && (
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:".6rem",color:"var(--red)",marginTop:".25rem"}}>
                      ⚠ Sin voluntarios asignados
                    </div>
                  )}
                </div>
              );
            })}
            {puestos.length===0 && <Empty msg="Sin puestos. Añade en Voluntarios → Puestos." />}
          </>
        )}

        {tab === "contactos" && (
          <>
            <div style={{padding:".5rem .75rem",borderRadius:8,marginBottom:".65rem",
              background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",
              fontFamily:"'DM Mono',monospace",fontSize:".65rem",color:"var(--red)",fontWeight:700}}>
              🚨 Emergencia grave → llama al 112 primero
            </div>
            {[...contactos]
              .sort((a,b) => ({emergencia:0,institucional:1,staff:2,proveedor:3}[a.tipo]??4)
                           - ({emergencia:0,institucional:1,staff:2,proveedor:3}[b.tipo]??4))
              .map(c => {
                const color = TIPO_COLOR[c.tipo] || "var(--text-muted)";
                return (
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:".65rem",
                    padding:".6rem .75rem",borderRadius:10,background:"var(--surface)",
                    border:"1px solid var(--border)",borderLeft:`3px solid ${color}`,marginBottom:".4rem"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:".82rem"}}>{c.nombre}</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:".6rem",color:"var(--text-muted)"}}>
                        {c.rol}{c.notas ? ` · ${c.notas}` : ""}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".2rem",flexShrink:0}}>
                      {c.telefono && (
                        <a href={`tel:${c.telefono}`} className="dc-tel"
                          style={{background:`${color}15`,border:`1px solid ${color}44`,color}}>
                          📞 {c.telefono}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            {contactos.length===0 && <Empty msg="Sin contactos. Añade en Logística → Emergencias." />}
          </>
        )}

        {tab === "checklist" && (
          <>
            {/* Solo mostrar fases relevantes para el día de carrera */}
            {(() => {
              const FASES_ORDEN = ["3 meses antes","2 meses antes","1 mes antes","Semana antes","Día antes","Mañana carrera","Post-carrera"];
              const dias = Math.ceil((getEventDate(config) - new Date()) / 86400000);
              const faseActiva = dias < 0 ? "Post-carrera" : dias <= 1 ? "Mañana carrera" : dias <= 2 ? "Día antes" : dias <= 7 ? "Semana antes" : null;
              // Mostrar solo fases a partir de "Semana antes" en DiaCarrera
              const FASES_DIA_D = ["Semana antes","Día antes","Mañana carrera","Post-carrera"];
              const fasesPresentes = [...new Set(ck.map(t=>t.fase))];
              const fasesAMostrar = fasesPresentes.filter(f => FASES_DIA_D.includes(f));
              const fasesOrdenadas = FASES_ORDEN.filter(f => fasesAMostrar.includes(f));
              if (fasesOrdenadas.length === 0) return (
                <Empty msg="Sin tareas para esta fase. Añade en Logística → Checklist." />
              );
              return fasesOrdenadas.map(fase => {
              const items = ck.filter(t=>t.fase===fase);
              const comp  = items.filter(t=>t.estado==="completado").length;
              const esActiva = fase === faseActiva;
              return (
                <div key={fase}>
                  <div className="dc-sect" style={{color: esActiva ? "#22d3ee" : undefined}}>
                    {esActiva ? "● " : ""}{fase} · {comp}/{items.length}
                  </div>
                  {items.map(item => {
                    const hecho = item.estado === "completado";
                    return (
                      <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:".55rem",
                        padding:".5rem .65rem",borderRadius:8,marginBottom:".3rem",
                        background:hecho?"var(--surface2)":"var(--surface)",
                        border:`1px solid ${hecho?"rgba(52,211,153,.2)":"var(--border)"}`,
                        opacity:hecho?.6:1}}>
                        <button className={`dc-chk${hecho?" on":""}`}
                          onClick={() => toggleCk(item.id)}
                          style={{marginTop:".1rem"}}>
                          {hecho && <span style={{color:"#000",fontSize:".65rem",fontWeight:700}}>✓</span>}
                        </button>
                        <div style={{flex:1}}>
                          <div style={{fontSize:".78rem",fontWeight:600,
                            textDecoration:hecho?"line-through":"none",
                            color:hecho?"var(--text-dim)":"var(--text)"}}>
                            {item.tarea}
                          </div>
                          {item.responsable && (
                            <div style={{fontFamily:"'DM Mono',monospace",fontSize:".57rem",
                              color:"var(--text-dim)",marginTop:".1rem"}}>
                              👤 {item.responsable}
                            </div>
                          )}
                        </div>
                        {item.prioridad==="alta" && !hecho && (
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:".6rem",
                            color:"var(--red)",fontWeight:700,flexShrink:0}}>ALTA</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }); // fin map fases
            })()}
            {ck.length===0 && <Empty msg="Sin checklist. Añade tareas en Logística → Checklist." />}
          </>
        )}

      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function Empty({ msg }) {
  return (
    <div style={{textAlign:"center",padding:"3rem 1rem",color:"var(--text-muted)",
      fontFamily:"'DM Mono',monospace",fontSize:".75rem"}}>
      {msg}
    </div>
  );
}
