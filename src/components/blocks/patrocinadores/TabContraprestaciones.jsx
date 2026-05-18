import { useState } from "react";
import { CONTRAPRESTACIONES_TIPO, getCfg } from "./constants.js";

// ─── TAB CONTRAPRESTACIONES ───────────────────────────────────────────────────
export default function TabContraprestaciones({
  pats, updateContraprestacion, addContraprestacion, deleteContraprestacion,
  onDetalle, ordenAlfa, setOrdenAlfa,
}) {
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
  // CON-05: separar canceladas para que el usuario pueda reconciliar los contadores
  const canceladas = allConts.filter(c => c.estado === "cancelado");
  const activosBase = filtroPatId === "todos" ? activos : activos.filter(p => String(p.id) === filtroPatId);
  const activosFiltrados = ordenAlfa ? [...activosBase].sort((a,b) => a.nombre.localeCompare(b.nombre,"es")) : activosBase;

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🎁 Compromisos con patrocinadores</div>
          <div className="pd">
            {pendientes.length} pendientes · {entregados.length} entregados
            {canceladas.length > 0 ? ` · ${canceladas.length} canceladas` : ""}
          </div>
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

      {/* ── LISTA ── */}
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
              <div key={c.id} className={`cont-row${c.estado === "entregado" ? " cont-done" : ""}`} onClick={e=>e.stopPropagation()}>
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
