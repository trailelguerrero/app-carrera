/**
 * TabGestiones.jsx — MEJ-23
 *
 * Subcomponente autónomo extraído de Documentos.jsx.
 * Gestiona la sección "Gestiones legales" con su estado propio:
 *   - Lista + inline edit de gestiones
 *   - Modal de nueva gestión
 *   - Log de comunicaciones
 *
 * Props recibidas del orquestador (Documentos.jsx):
 *   gestiones, saveGestiones        — datos y persistencia
 *   gestionesVencidas, gestionesCriticas — derivados para alertas (calculados arriba)
 *   setDelConfirm                   — modal de confirmación compartido
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  SUBCATEGORIAS, ESTADOS_DOC, getEstadoCfg, diasHasta, formatDate,
} from "@/constants/documentosConstants";

export default function TabGestiones({
  gestiones,
  saveGestiones,
  gestionesVencidas,
  gestionesCriticas,
  setDelConfirm,
}) {
  const [gModal,        setGModal]        = useState(false);
  const [gForm,         setGForm]         = useState({ nombre:"", subcategoria:"Ayuntamiento", estado:"pendiente", fechaVencimiento:"", fechaSolicitud:"", fechaConcesion:"", nota:"", url:"", responsable:"" });
  const [gEditId,       setGEditId]       = useState(null);
  const [logGestionId,  setLogGestionId]  = useState(null);
  const [nuevoLog,      setNuevoLog]      = useState("");

  const addLogEntry = (gestionId) => {
    const texto = nuevoLog.trim();
    if (!texto) return;
    const entrada = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      texto,
      autor: "Organización",
    };
    saveGestiones(gestiones.map(g =>
      g.id === gestionId
        ? { ...g, log: [...(g.log || []), entrada] }
        : g
    ));
    setNuevoLog("");
  };

  return (
    <>
      {/* ── SECCIÓN GESTIONES LEGALES — siempre visible ── */}
      <div style={{marginTop:"1.5rem"}}>
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:".75rem", paddingBottom:".6rem",
          borderBottom:"2px solid rgba(56,189,248,0.2)",
        }}>
          <div>
            <div style={{
              fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-md)",
              color:"#38bdf8", display:"flex", alignItems:"center", gap:".5rem",
            }}>
              🏛️ Gestiones legales
            </div>
            <div style={{
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              color:"var(--text-muted)", marginTop:".15rem",
            }}>
              Trámites y autorizaciones · sin archivo adjunto
            </div>
          </div>
          <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
            {(gestionesVencidas.length > 0 || gestionesCriticas.length > 0) && (
              <span style={{
                fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                color:"var(--red)", background:"var(--red-dim)",
                border:"1px solid rgba(248,113,113,0.25)",
                borderRadius:20, padding:".15rem .55rem",
              }}>
                ⚠️ {gestionesVencidas.length + gestionesCriticas.length} urgente{(gestionesVencidas.length+gestionesCriticas.length)>1?"s":""}
              </span>
            )}
            <button className="btn btn-primary btn-sm" onClick={()=>{
              setGForm({nombre:"",subcategoria:"Ayuntamiento",estado:"pendiente",fechaVencimiento:"",fechaSolicitud:"",fechaConcesion:"",nota:"",url:"",responsable:""});
              setGEditId(null); setGModal(true);
            }}>+ Nueva gestión</button>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:".45rem"}}>
          {gestiones.length === 0 && (
            <div style={{textAlign:"center",padding:"2rem",color:"var(--text-dim)",
              fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}>
              Sin gestiones registradas
            </div>
          )}
          {gestiones.map(g => {
            const ecfg = getEstadoCfg(g.estado);
            const dias = diasHasta(g.fechaVencimiento);
            const vcolor = dias===null?"var(--text-muted)":dias<0?"var(--red)":dias<=7?"var(--red)":dias<=30?"var(--amber)":"var(--text-muted)";
            const isEditing = gEditId === g.id;
            return (
              <div key={g.id} style={{background:"var(--surface2)",border:`1px solid ${ecfg.color}33`,
                borderLeft:`3px solid ${ecfg.color}`,borderRadius:8,padding:".65rem .85rem"}}>
                {isEditing ? (
                  <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
                    <input className="inp" value={gForm.nombre} onChange={e=>setGForm(p=>({...p,nombre:e.target.value}))} placeholder="Nombre de la gestión *" />
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem"}}>
                      <select className="inp inp-sm" value={gForm.subcategoria} onChange={e=>setGForm(p=>({...p,subcategoria:e.target.value}))}>
                        {(SUBCATEGORIAS.gestiones||[]).map(sc=><option key={sc} value={sc}>{sc}</option>)}
                      </select>
                      <select className="inp inp-sm" value={gForm.estado} onChange={e=>setGForm(p=>({...p,estado:e.target.value}))} style={{color:getEstadoCfg(gForm.estado).color}}>
                        {ESTADOS_DOC.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
                      </select>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem"}}>
                      <div><label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",display:"block",marginBottom:".2rem"}}>Fecha límite / vencimiento</label>
                        <input className="inp inp-sm" type="date" value={gForm.fechaVencimiento} onChange={e=>setGForm(p=>({...p,fechaVencimiento:e.target.value}))} /></div>
                      <div><label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",display:"block",marginBottom:".2rem"}}>URL / Referencia</label>
                        <input className="inp inp-sm" value={gForm.url||""} onChange={e=>setGForm(p=>({...p,url:e.target.value}))} placeholder="https://…" /></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem"}}>
                      <div><label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--cyan)",display:"block",marginBottom:".2rem"}}>📅 Fecha de solicitud</label>
                        <input className="inp inp-sm" type="date" value={gForm.fechaSolicitud||""} onChange={e=>setGForm(p=>({...p,fechaSolicitud:e.target.value}))} /></div>
                      <div><label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#34d399",display:"block",marginBottom:".2rem"}}>✅ Fecha de concesión</label>
                        <input className="inp inp-sm" type="date" value={gForm.fechaConcesion||""} onChange={e=>setGForm(p=>({...p,fechaConcesion:e.target.value}))} /></div>
                    </div>
                    <div><label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",display:"block",marginBottom:".2rem"}}>Responsable</label>
                        <input className="inp inp-sm" value={gForm.responsable||""} onChange={e=>setGForm(p=>({...p,responsable:e.target.value}))} placeholder="Nombre del responsable…" /></div>
                    <textarea className="inp" rows={2} value={gForm.nota||""} onChange={e=>setGForm(p=>({...p,nota:e.target.value}))} placeholder="Notas…" style={{resize:"vertical"}} />
                    <div style={{display:"flex",gap:".4rem"}}>
                      <button className="btn btn-primary btn-sm" onClick={()=>{
                        if(!gForm.nombre.trim()) return;
                        const prev = gestiones.find(x => x.id === g.id);
                        const cambioEstado = prev && prev.estado !== gForm.estado;
                        const entradaHist = cambioEstado ? [{
                          id:      String(Date.now()),
                          fecha:   new Date().toISOString(),
                          campo:   "estado",
                          antes:   prev.estado,
                          despues: gForm.estado,
                        }] : [];
                        saveGestiones(gestiones.map(x => x.id === g.id
                          ? { ...x, ...gForm, historial: [...(x.historial||[]), ...entradaHist].slice(-30) }
                          : x
                        ));
                        setGEditId(null);
                      }}>✅ Guardar</button>
                      <button className="btn btn-ghost btn-sm" onClick={()=>setGEditId(null)}>Cancelar</button>
                      <button className="btn btn-red btn-sm" style={{marginLeft:"auto"}} onClick={()=>{
                        setDelConfirm({ id: g.id, nombre: g.nombre, esGestion: true });
                      }}>🗑 Eliminar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{display:"flex",gap:".75rem",alignItems:"flex-start"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".2rem"}}>{g.nombre}</div>
                      <div style={{display:"flex",gap:".4rem",flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".08rem .35rem",
                          borderRadius:3,background:`${ecfg.color}18`,color:ecfg.color,border:`1px solid ${ecfg.color}33`}}>
                          {ecfg.label}
                        </span>
                        {g.subcategoria && <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>{g.subcategoria}</span>}
                        {g.fechaVencimiento && (
                          <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:vcolor,fontWeight:700}}>
                            {dias===null?"":dias<0?`⚠ Venció ${formatDate(g.fechaVencimiento)}`:dias===0?"⏰ Hoy":`⏰ ${dias}d · ${formatDate(g.fechaVencimiento)}`}
                          </span>
                        )}
                        {g.url && <a href={g.url} target="_blank" rel="noreferrer" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#38bdf8"}} onClick={e=>e.stopPropagation()}>🔗 Ver enlace</a>}
                      </div>
                      {(g.fechaSolicitud || g.fechaConcesion) && (
                        <div style={{display:"flex",gap:".75rem",flexWrap:"wrap",marginTop:".25rem"}}>
                          {g.fechaSolicitud && (
                            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#38bdf8",display:"flex",alignItems:"center",gap:".25rem"}}>
                              📅 Solicitado: <span style={{color:"var(--text)"}}>{formatDate(g.fechaSolicitud)}</span>
                            </span>
                          )}
                          {g.fechaConcesion && (
                            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#34d399",display:"flex",alignItems:"center",gap:".25rem"}}>
                              ✅ Concedido: <span style={{color:"var(--text)"}}>{formatDate(g.fechaConcesion)}</span>
                            </span>
                          )}
                        </div>
                      )}
                      {g.nota && <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".25rem",lineHeight:1.5}}>{g.nota}</div>}
                      {g.responsable && (
                        <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".2rem"}}>
                          👤 <span style={{color:"var(--text)"}}>{g.responsable}</span>
                        </div>
                      )}

                      {/* Log de comunicaciones — expandible */}
                      {((g.log||[]).length > 0 || logGestionId === g.id) && (
                        <div style={{marginTop:".5rem",paddingTop:".5rem",borderTop:"1px solid var(--border)"}}>
                          <button
                            onClick={() => setLogGestionId(logGestionId === g.id ? null : g.id)}
                            style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",
                              background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:".35rem",
                              display:"flex",alignItems:"center",gap:".3rem"}}>
                            {logGestionId === g.id ? "▲" : "▼"}
                            📋 Comunicaciones ({(g.log||[]).length})
                          </button>
                          {logGestionId === g.id && (
                            <div>
                              {(g.log||[]).length === 0 && (
                                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                                  color:"var(--text-dim)",marginBottom:".4rem"}}>
                                  Sin comunicaciones registradas aún
                                </div>
                              )}
                              {[...(g.log||[])].reverse().map(entry => (
                                <div key={entry.id} style={{display:"flex",gap:".5rem",
                                  padding:".35rem .5rem",borderRadius:6,
                                  background:"var(--surface)",marginBottom:".25rem",
                                  border:"1px solid var(--border)"}}>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:"var(--fs-sm)",lineHeight:1.5}}>{entry.texto}</div>
                                    <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                                      color:"var(--text-dim)",marginTop:".15rem"}}>
                                      {entry.autor} · {new Date(entry.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"2-digit"})} {new Date(entry.fecha).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <div style={{display:"flex",gap:".35rem",marginTop:".4rem"}}>
                                <input
                                  className="inp inp-sm"
                                  placeholder="Añadir comunicación…"
                                  value={nuevoLog}
                                  onChange={e => setNuevoLog(e.target.value)}
                                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && addLogEntry(g.id)}
                                  style={{flex:1,fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}
                                />
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => addLogEntry(g.id)}
                                  disabled={!nuevoLog.trim()}>
                                  + Añadir
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {(g.log||[]).length === 0 && logGestionId !== g.id && (
                        <button
                          onClick={() => setLogGestionId(g.id)}
                          style={{marginTop:".35rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                            color:"var(--text-dim)",background:"none",border:"none",
                            cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:".25rem"}}>
                          + Registrar comunicación
                        </button>
                      )}
                    </div>
                    <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
                      <button
                        title="Crear tarea en Proyecto"
                        onClick={() => {
                          const titulo = `Gestión: ${g.nombre}`;
                          const nota = `Vinculado desde Documentos → Gestiones legales. Estado: ${g.estado}${g.fechaVencimiento ? ` · Vence: ${g.fechaVencimiento}` : ""}.`;
                          window.dispatchEvent(new CustomEvent("teg-navigate", {
                            detail: { block: "proyecto", action: "nueva-tarea",
                              payload: { titulo, area: "permisos", notas: nota,
                                fechaLimite: g.fechaVencimiento || "" } }
                          }));
                        }}
                        style={{
                          fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                          padding:".2rem .45rem", borderRadius:5,
                          border:"1px solid rgba(167,139,250,.3)",
                          background:"rgba(167,139,250,.1)", color:"var(--violet)",
                          cursor:"pointer", flexShrink:0, whiteSpace:"nowrap",
                        }}>
                        ＋ Tarea
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{flexShrink:0}} onClick={()=>{
                        setGForm({nombre:g.nombre,subcategoria:g.subcategoria||"Ayuntamiento",estado:g.estado,fechaVencimiento:g.fechaVencimiento||"",fechaSolicitud:g.fechaSolicitud||"",fechaConcesion:g.fechaConcesion||"",nota:g.nota||"",url:g.url||"",responsable:g.responsable||""});
                        setGEditId(g.id);
                      }}>✏️</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal nueva gestión ── */}
      {gModal && createPortal(
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setGModal(false)}>
          <div className="modal modal-ficha" style={{maxWidth:480}}>
            <div className="modal-header">
              <span className="modal-title">🏛️ Nueva gestión legal</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setGModal(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body" style={{gap:".65rem"}}>
              <div>
                <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Nombre *</label>
                <input autoFocus className="inp" value={gForm.nombre} onChange={e=>setGForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Autorización Ayuntamiento" />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Tipo</label>
                  <select className="inp" value={gForm.subcategoria} onChange={e=>setGForm(p=>({...p,subcategoria:e.target.value}))}>
                    {(SUBCATEGORIAS.gestiones||[]).map(sc=><option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Estado</label>
                  <select className="inp" value={gForm.estado} onChange={e=>setGForm(p=>({...p,estado:e.target.value}))} style={{color:getEstadoCfg(gForm.estado).color}}>
                    {ESTADOS_DOC.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Fecha límite / vencimiento</label>
                  <input className="inp" type="date" value={gForm.fechaVencimiento} onChange={e=>setGForm(p=>({...p,fechaVencimiento:e.target.value}))} />
                </div>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>URL / Referencia</label>
                  <input className="inp" value={gForm.url} onChange={e=>setGForm(p=>({...p,url:e.target.value}))} placeholder="https://…" />
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"#38bdf8",display:"block",marginBottom:".3rem"}}>📅 Fecha de solicitud</label>
                  <input className="inp" type="date" value={gForm.fechaSolicitud||""} onChange={e=>setGForm(p=>({...p,fechaSolicitud:e.target.value}))} />
                </div>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"#34d399",display:"block",marginBottom:".3rem"}}>✅ Fecha de concesión</label>
                  <input className="inp" type="date" value={gForm.fechaConcesion||""} onChange={e=>setGForm(p=>({...p,fechaConcesion:e.target.value}))} />
                </div>
              </div>
              <div>
                <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Responsable</label>
                <input className="inp" value={gForm.responsable||""} onChange={e=>setGForm(p=>({...p,responsable:e.target.value}))} placeholder="Nombre del responsable…" />
              </div>
              <div>
                <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Notas</label>
                <textarea className="inp" rows={3} value={gForm.nota} onChange={e=>setGForm(p=>({...p,nota:e.target.value}))} placeholder="Instrucciones, contactos, requisitos previos…" style={{resize:"vertical"}} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setGModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={()=>{
                if(!gForm.nombre.trim()) return;
                const newG = {...gForm, id:"g"+Date.now(), fechaSubida:new Date().toISOString()};
                saveGestiones([...gestiones, newG]);
                setGModal(false);
              }} disabled={!gForm.nombre.trim()} style={{opacity:gForm.nombre.trim()?1:.5}}>
                Crear gestión
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
