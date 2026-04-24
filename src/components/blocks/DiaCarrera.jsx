import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useData, dataService } from "@/lib/dataService";
import { toast } from "@/lib/toast";
import EmptyState from "@/components/EmptyState";
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
.dc-fab{position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));right:20px;width:52px;height:52px;border-radius:50%;background:rgba(248,113,113,0.92);border:2px solid rgba(248,113,113,0.5);font-size:1.35rem;cursor:pointer;box-shadow:0 4px 24px rgba(248,113,113,0.45);z-index:9100;display:flex;align-items:center;justify-content:center;transition:transform .15s;}
.dc-fab:active{transform:scale(0.92);}
.dc-prog{padding:.35rem 1rem;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0;}
.dc-prog-bar{height:3px;background:var(--surface3);border-radius:2px;overflow:hidden;margin-top:.25rem;}
.dc-prog-fill{height:100%;background:var(--cyan);border-radius:2px;transition:width .5s;}
.dc-inc-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:9200;display:flex;align-items:flex-end;justify-content:center;padding:0;}
@media(min-width:641px){.dc-inc-backdrop{align-items:center;padding:1rem;}}
.dc-inc-modal{background:var(--surface);border-radius:20px 20px 0 0;width:100%;max-width:440px;padding:1rem 1.25rem 1.5rem;border-top:3px solid rgba(248,113,113,0.5);}
@media(min-width:641px){.dc-inc-modal{border-radius:16px;}}
`;

export default function DiaCarrera({ onClose }) {
  const [tab, setTab] = useState("timeline");
  const [ahora, setAhora] = useState(new Date());
  const [showInc, setShowInc] = useState(false);
  const [incForm, setIncForm] = useState({ tipo: "médica", gravedad: "media", descripcion: "" });
  const [incGuardado, setIncGuardado] = useState(false);

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

  const toggleTl  = id => { setTl(prev => prev.map(t => t.id===id ? {...t, done:!t.done} : t)); dataService.notify(); };
  const toggleVol = id => { setVols(prev => prev.map(v => v.id===id ? {...v, presente:!v.presente} : v)); dataService.notify(); };
  const toggleCk  = id => { setCk(prev => prev.map(t => t.id===id
    ? {...t, estado: t.estado==="completado" ? "pendiente" : "completado"} : t)); dataService.notify(); };

  const guardarIncidencia = async () => {
    if (!incForm.descripcion.trim()) return;
    const nueva = {
      id: `inc_${Date.now()}`,
      hora: new Date().toTimeString().slice(0, 5),
      tipo: incForm.tipo,
      gravedad: incForm.gravedad,
      descripcion: incForm.descripcion.trim(),
      responsable: "Día de Carrera",
      estado: "abierta",
      resolucion: "",
    };
    const incs = await dataService.get(LS_LOG + "_inc", []);
    await dataService.set(LS_LOG + "_inc", [...(Array.isArray(incs) ? incs : []), nueva]);
    dataService.notify();
    toast.success("Incidencia registrada correctamente");
    setIncGuardado(true);
    setTimeout(() => {
      setShowInc(false);
      setIncGuardado(false);
      setIncForm({ tipo: "médica", gravedad: "media", descripcion: "" });
    }, 1000);
  };

  const tlCompletadas = tl.filter(t => t.done).length;
  const progresoDia   = tl.length > 0 ? Math.round(tlCompletadas / tl.length * 100) : 0;
  const proximaSig    = tl.find(t => !t.done);

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
            {config.nombre} ·{" "}
            <span style={{color:"var(--cyan)"}}>
              {(() => {
                const ev = getEventDate(config);
                const dias = Math.ceil((ev - new Date()) / 86400000);
                return dias === 0 ? "¡HOY!" : dias > 0 ? `${dias}d para el evento` : ev.toLocaleDateString("es-ES",{day:"numeric",month:"long"});
              })()}
            </span>
            {" "}· {hora} · <span style={{color:"var(--green)"}}>{presentes}/{confirmados.length} presentes</span>
          </div>
        </div>
        <button onClick={onClose} aria-label="Cerrar vista Día de la Carrera" style={{
          background:"var(--surface2)", border:"1px solid var(--border)",
          borderRadius:8, color:"var(--text-muted)", cursor:"pointer",
          padding:".35rem .7rem", fontFamily:"'DM Mono',monospace",
          fontSize:"var(--fs-sm)", fontWeight:700,
        }}>✕ Salir</button>
      </div>

      {/* Próxima tarea */}
      {proxima && (
        <div className="dc-next">
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"#22d3ee",fontWeight:700}}>PRÓXIMO</span>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-sm)",fontWeight:800,color:"#22d3ee"}}>{proxima.hora}</span>
          <span style={{fontSize:"var(--fs-base)",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {proxima.titulo}
          </span>
          <span>{CAT_ICON[proxima.categoria] || "📌"}</span>
        </div>
      )}

      {/* Barra de progreso del día */}
      {tl.length > 0 && (
        <div className="dc-prog">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>
              {tlCompletadas}/{tl.length} tareas
            </span>
            {proximaSig ? (
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",
                color:"var(--cyan)",overflow:"hidden",textOverflow:"ellipsis",
                whiteSpace:"nowrap",maxWidth:"60%",textAlign:"right"}}>
                ▶ {proximaSig.hora} {proximaSig.titulo}
              </span>
            ) : (
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--green)",fontWeight:700}}>
                ✓ Completado
              </span>
            )}
          </div>
          <div className="dc-prog-bar">
            <div className="dc-prog-fill" style={{width:`${progresoDia}%`}} />
          </div>
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
            {tl.length === 0 ? (
              <EmptyState icon="⏱" title="Sin tareas en el timeline" sub="Añade tareas en Logística → Timeline para verlas aquí el día del evento." />
            ) : (
            <>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".5rem"}}>
              {tl.filter(t=>t.done).length}/{tl.length} completados
            </div>
            {tl.map(item => (
              <div key={item.id} className={`dc-row${item.done?" done":""}`}>
                <button className={`dc-chk${item.done?" on":""}`} onClick={() => toggleTl(item.id)}>
                  {item.done && <span style={{color:"#000",fontSize:"var(--fs-sm)",fontWeight:700}}>✓</span>}
                </button>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:".4rem",marginBottom:".15rem"}}>
                    <span className="dc-hora">{item.hora}</span>
                    <span style={{fontSize:"var(--fs-sm)"}}>{CAT_ICON[item.categoria]||"📌"}</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:"var(--fs-base)",textDecoration:item.done?"line-through":"none",
                    color:item.done?"var(--text-dim)":"var(--text)"}}>{item.titulo}</div>
                  {item.descripcion && (
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".15rem",lineHeight:1.5}}>
                      {item.descripcion}
                    </div>
                  )}
                  {item.responsable && (
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--text-dim)",marginTop:".15rem"}}>
                      👤 {item.responsable}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
            )}
          </>
        )}

        {tab === "voluntarios" && (
          <>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".5rem"}}>
              {presentes} presentes · {confirmados.length - presentes} pendientes
            </div>
            {confirmados.map(v => {
              const puesto = puestos.find(p => p.id === v.puestoId);
              return (
                <div key={v.id} className="dc-row">
                  <button className={`dc-chk${v.presente?" on":""}`} onClick={() => toggleVol(v.id)}>
                    {v.presente && <span style={{color:"#000",fontSize:"var(--fs-sm)",fontWeight:700}}>✓</span>}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:"var(--fs-base)",color:v.presente?"var(--green)":"var(--text)"}}>
                      {v.nombre}
                    </div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>
                      {puesto?.nombre || "Sin puesto"} · {v.telefono || "—"}
                    </div>
                  </div>
                  {v.talla && <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",
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
                      <div style={{fontWeight:700,fontSize:"var(--fs-base)"}}>{p.nombre}</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>
                        {p.horaInicio}–{p.horaFin} · necesarios: {p.necesarios||1}
                      </div>
                    </div>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-base)",fontWeight:800,color,flexShrink:0}}>
                      {pres}/{asig.length}
                    </span>
                  </div>
                  {asig.map(v => (
                    <div key={v.id} style={{display:"flex",alignItems:"center",gap:".4rem",
                      padding:".2rem 0",borderTop:"1px solid var(--border)"}}>
                      <span style={{width:7,height:7,borderRadius:"50%",flexShrink:0,
                        background:v.presente?"var(--green)":"var(--border)"}} />
                      <span style={{fontSize:"var(--fs-base)",flex:1,color:v.presente?"var(--text)":"var(--text-muted)"}}>
                        {v.nombre}
                      </span>
                      {v.telefono && (
                        <a href={`tel:${v.telefono}`} style={{color:"var(--cyan)",fontSize:"var(--fs-base)",textDecoration:"none"}}>
                          📞
                        </a>
                      )}
                    </div>
                  ))}
                  {asig.length===0 && (
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--red)",marginTop:".25rem"}}>
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
              fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-sm)",color:"var(--red)",fontWeight:700}}>
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
                      <div style={{fontWeight:700,fontSize:"var(--fs-base)"}}>{c.nombre}</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>
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
                          {hecho && <span style={{color:"#000",fontSize:"var(--fs-sm)",fontWeight:700}}>✓</span>}
                        </button>
                        <div style={{flex:1}}>
                          <div style={{fontSize:"var(--fs-base)",fontWeight:600,
                            textDecoration:hecho?"line-through":"none",
                            color:hecho?"var(--text-dim)":"var(--text)"}}>
                            {item.tarea}
                          </div>
                          {item.responsable && (
                            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",
                              color:"var(--text-dim)",marginTop:".1rem"}}>
                              👤 {item.responsable}
                            </div>
                          )}
                        </div>
                        {item.prioridad==="alta" && !hecho && (
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",
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

      {/* ── FAB: botón flotante de incidencia rápida ─────────────────────── */}
      <button
        className="dc-fab"
        onClick={() => setShowInc(true)}
        title="Registrar incidencia urgente"
        aria-label="Registrar incidencia"
      >
        🚨
      </button>

      {/* ── Modal de incidencia rápida ───────────────────────────────────── */}
      {showInc && (
        <div className="dc-inc-backdrop" onClick={e => e.target===e.currentTarget && setShowInc(false)}>
          <div className="dc-inc-modal">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".85rem" }}>
              <span style={{ fontWeight:800, fontSize:"var(--fs-md)" }}>🚨 Incidencia urgente</span>
              <button onClick={() => setShowInc(false)} style={{
                background:"none", border:"none", color:"var(--text-muted)",
                cursor:"pointer", fontSize:"var(--fs-md)", padding:".2rem",
              }}>✕</button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".65rem", marginBottom:".65rem" }}>
              <div>
                <label style={{ display:"block", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  fontWeight:700, color:"var(--text-muted)", marginBottom:".3rem",
                  textTransform:"uppercase", letterSpacing:".04em" }}>Tipo</label>
                <select
                  value={incForm.tipo}
                  onChange={e => setIncForm(p => ({...p, tipo: e.target.value}))}
                  style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)",
                    borderRadius:8, color:"var(--text)", padding:".45rem .6rem",
                    fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", outline:"none" }}
                >
                  {["médica","señalización","avituallamiento","corredor perdido","meteorológica","otra"]
                    .map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  fontWeight:700, color:"var(--text-muted)", marginBottom:".3rem",
                  textTransform:"uppercase", letterSpacing:".04em" }}>Gravedad</label>
                <select
                  value={incForm.gravedad}
                  onChange={e => setIncForm(p => ({...p, gravedad: e.target.value}))}
                  style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)",
                    borderRadius:8, color:"var(--text)", padding:".45rem .6rem",
                    fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", outline:"none" }}
                >
                  {[["baja","🟢"],["media","🟡"],["alta","🔴"]]
                    .map(([g, ic]) => <option key={g} value={g}>{ic} {g}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:".85rem" }}>
              <label style={{ display:"block", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                fontWeight:700, color:"var(--text-muted)", marginBottom:".3rem",
                textTransform:"uppercase", letterSpacing:".04em" }}>Descripción *</label>
              <textarea
                value={incForm.descripcion}
                onChange={e => setIncForm(p => ({...p, descripcion: e.target.value}))}
                placeholder="Qué ha pasado, dónde, quién está implicado…"
                rows={3}
                style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)",
                  borderRadius:8, color:"var(--text)", padding:".55rem .7rem",
                  fontFamily:"var(--font-mono)", fontSize:"var(--fs-base)", outline:"none",
                  resize:"vertical", boxSizing:"border-box",
                  borderColor: !incForm.descripcion.trim() && incGuardado ? "var(--red)" : undefined }}
              />
            </div>

            <button
              onClick={guardarIncidencia}
              disabled={incGuardado}
              style={{
                width:"100%", padding:".7rem", borderRadius:10,
                background: incGuardado ? "var(--green)" : "rgba(248,113,113,0.9)",
                border:"none", color:"#fff", fontFamily:"var(--font-mono)",
                fontSize:"var(--fs-base)", fontWeight:800, cursor: incGuardado ? "default" : "pointer",
                transition:"background .2s",
              }}
            >
              {incGuardado ? "✓ Incidencia registrada" : "🚨 Registrar incidencia"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modal, document.body);
}

function Empty({ msg }) {
  return (
    <div style={{textAlign:"center",padding:"3rem 1rem",color:"var(--text-muted)",
      fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-base)"}}>
      {msg}
    </div>
  );
}
