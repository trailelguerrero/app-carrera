/**
 * TabPedidos.jsx — Fase 3, Tarea 3.4
 * Tab "Extras y familiares" del bloque Camisetas.
 */
import { useState, useEffect, useMemo } from "react";
import { fmtEur2 } from "@/lib/utils";
import { blockCls as cls } from "@/lib/blockStyles";
import EmptyState from "@/components/EmptyState";
import { Tooltip } from "@/components/common/Tooltip";
import { TC, EP, EE, ESTADOS_PAGO, ESTADOS_ENTREGA, estadoCombinado, calcPedido, badgePago, badgeEnt } from "./camisetasConstants";

export function TabPedidos({ pedidos, coste, abrirFicha, abrirModal, filtroExterno, onClearFiltro }) {
  const [vistaK,setVistaK]   = useState(false);
  const [alfa,  setAlfa]     = useState(false);
  const [fPago, setFPago]    = useState("todos");
  const [fEnt,  setFEnt]     = useState("todos");
  // Sincronizar filtro externo (cuando se navega desde el Dashboard con filtro predefinido)
  useEffect(() => {
    if (filtroExterno) {
      if (filtroExterno.pago) setFPago(filtroExterno.pago);
      if (filtroExterno.ent)  setFEnt(filtroExterno.ent);
    }
  }, [filtroExterno]);
  const [bus,   setBus]      = useState("");
  const [pedGrupos, setPedGrupos] = useState({ pendiente:true, preparado:true, entregado:true, cancelado:true }); // todos colapsados por defecto
  const filtrados = useMemo(()=>{
    let list = pedidos.filter(p=>{
      const q  = bus.toLowerCase();
      const mQ = !q||p.nombre.toLowerCase().includes(q)||(p.telefono||"").includes(q)||(p.email||"").toLowerCase().includes(q);
      const mP = fPago==="todos"||p.lineas.some(l=>(l.estadoPago||"pendiente")===fPago);
      const mE = fEnt==="todos" ||p.lineas.some(l=>(l.estadoEntrega||"pendiente")===fEnt);
      return mQ&&mP&&mE;
    });
    if (alfa) list=[...list].sort((sa,sb)=>sa.nombre.localeCompare(sb.nombre,"es"));
    return list;
  },[pedidos,bus,fPago,fEnt,alfa]);
  return (
    <>
      <div className="ph">
        <div><div className="pt">👕 Pedidos de camisetas</div><div className="pd">{pedidos.length} pedidos · {pedidos.reduce((s,p)=>s+p.lineas.reduce((a,l)=>a+l.cantidad,0),0)} unidades</div></div>
        <div className="fr g1" style={{flexWrap:"wrap"}}>
          <div style={{display:"flex",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",overflow:"hidden"}}>
            {[["lista","☰"],["kanban","⬛"]].map(([v,ic])=>(
              <button key={v} onClick={()=>setVistaK(v==="kanban")} style={{padding:".3rem .55rem",border:"none",cursor:"pointer",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,background:(vistaK&&v==="kanban")||(!vistaK&&v==="lista")?"rgba(99,102,241,.2)":"transparent",color:(vistaK&&v==="kanban")||(!vistaK&&v==="lista")?"#c4c6ff":"var(--text-muted)"}}>{ic}</button>
            ))}
          </div>
          <button className={cls("btn btn-sm",alfa?"btn-primary":"btn-ghost")} onClick={()=>setAlfa(v=>!v)}>{alfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={()=>abrirModal(null)}>+ Nuevo pedido</button>
        </div>
      </div>
      <div className="card" style={{marginBottom:".75rem",padding:".65rem .85rem"}}>
        <div style={{display:"flex",gap:".6rem",flexWrap:"wrap",alignItems:"center"}}>
          <input className="inp" placeholder="🔍 Nombre, teléfono o email…" value={bus} onChange={e=>setBus(e.target.value)} style={{maxWidth:240}} />
          <select className="inp" value={fPago} onChange={e=>setFPago(e.target.value)} style={{width:"auto"}}>
            <option value="todos">Pago: todos</option>
            {ESTADOS_PAGO.map(ep=><option key={ep} value={ep}>{EP[ep].icon} {EP[ep].label}</option>)}
          </select>
          <select className="inp" value={fEnt} onChange={e=>setFEnt(e.target.value)} style={{width:"auto"}}>
            <option value="todos">Entrega: todos</option>
            {ESTADOS_ENTREGA.map(ee=><option key={ee} value={ee}>{EE[ee].icon} {EE[ee].label}</option>)}
          </select>
          {(bus||fPago!=="todos"||fEnt!=="todos")&&<button className="btn btn-ghost btn-sm" onClick={()=>{setBus("");setFPago("todos");setFEnt("todos");}}>✕ Limpiar</button>}
        </div>
      </div>
      {filtrados.length===0 && pedidos.length===0 && (
        <EmptyState icon="👕" title="Sin pedidos de extras aún"
          sub="Aquí se registran pedidos individuales de camisetas para familiares, staff, patrocinadores y cualquier persona que no esté en tu plataforma de inscripción. Los corredores y voluntarios se gestionan automáticamente en la pestaña «Pedido al proveedor»." />
      )}
      {filtrados.length===0 && pedidos.length>0 && (
        <div className="empty-state"><div className="empty-state-icon">🔍</div>Sin pedidos con esos filtros</div>
      )}
      {vistaK ? (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:".65rem"}}>
          {ESTADOS_PAGO.map(estado=>{
            const cfg=EP[estado];
            const items=filtrados.filter(p=>{
              const counts={};
              p.lineas.forEach(l=>{counts[l.estadoPago||"pendiente"]=(counts[l.estadoPago||"pendiente"]||0)+l.cantidad;});
              return Object.entries(counts).sort((sa,sb)=>sb[1]-sa[1])[0]?.[0]===estado;
            });
            return (
              <div key={estado} style={{background:"var(--surface)",border:"1px solid var(--border)",borderTop:`2px solid ${cfg.color}`,borderRadius:"var(--r)",overflow:"hidden"}}>
                <div style={{padding:".6rem .75rem",background:"var(--surface2)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color:cfg.color}}>{cfg.icon} {cfg.label}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,background:cfg.bg,color:cfg.color}}>{items.length}</span>
                </div>
                {items.map(p=>{
                  const {totalVenta,totalUnid}=calcPedido(p,coste); const be=badgeEnt(p);
                  return (
                    <div key={p.id} style={{margin:".4rem .4rem 0",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:".6rem .7rem",cursor:"pointer",transition:"all .15s"}}
                      onClick={()=>abrirFicha(p)} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border-light)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                      <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".25rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                      <div style={{display:"flex",gap:".25rem",flexWrap:"wrap",marginBottom:".3rem"}}>
                        {p.lineas.map((l,i)=>(
                          <span key={i} style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".06rem .3rem",borderRadius:3,background:TC[l.tipo]?.dim,color:TC[l.tipo]?.color,border:`1px solid ${TC[l.tipo]?.color}33`}}>
                            {TC[l.tipo]?.icon}{l.talla}×{l.cantidad} {EP[l.estadoPago||"pendiente"]?.icon}
                          </span>
                        ))}
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span className="mono xs muted">{totalUnid} ud · {fmtEur2(totalVenta)}</span>
                        <span className="badge" style={{background:be.bg,color:be.color,fontSize:"var(--fs-2xs)"}}>{be.icon}</span>
                      </div>
                    </div>
                  );
                })}
                {items.length===0&&<div style={{padding:"1rem",textAlign:"center",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-dim)"}}>—</div>}
                <div style={{height:".4rem"}}/>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista lista agrupada por estado de pago */
        <div style={{display:"flex",flexDirection:"column",gap:".6rem"}}>
          {ESTADOS_PAGO.map(estado => {
            const cfg = EP[estado];
            const items = filtrados.filter(p => {
              const counts = {};
              p.lineas.forEach(l=>{counts[l.estadoPago||"pendiente"]=(counts[l.estadoPago||"pendiente"]||0)+l.cantidad;});
              return Object.entries(counts).sort((sa,sb)=>sb[1]-sa[1])[0]?.[0]===estado;
            });
            if (!items.length) return null;
            const collapsed = pedGrupos[estado];
            return (
              <div key={estado} style={{borderRadius:10,overflow:"hidden",
                border:`1px solid ${cfg.color}33`}}>
                <button
                  onClick={()=>setPedGrupos(p=>({...p,[estado]:!p[estado]}))}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:".65rem",
                    padding:".55rem .85rem",background:`${cfg.color}08`,
                    border:"none",cursor:"pointer",textAlign:"left",
                    borderBottom:collapsed?"none":`1px solid ${cfg.color}1a`}}>
                  <span style={{fontSize:"var(--fs-base)"}}>{cfg.icon}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:"var(--fs-sm)",
                    color:cfg.color,flex:1}}>{cfg.label}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                    color:"var(--text-dim)",padding:".1rem .4rem",borderRadius:20,
                    background:"rgba(255,255,255,.05)"}}>{items.length}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-dim)",
                    transform:collapsed?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
                </button>
                {!collapsed && (
                  <div style={{display:"flex",flexDirection:"column",
                    background:"var(--surface)"}}>
                    {items.map((p,idx)=>{
                      const {totalVenta}=calcPedido(p,coste); const ec=estadoCombinado(p.lineas);
                      return (
                        <div key={p.id} className="cam-row"
                          style={{borderBottom:idx<items.length-1?"1px solid var(--border)":"none",
                            borderRadius:0}}
                          onClick={()=>abrirFicha(p)}>
                          <div style={{display:"flex",alignItems:"center",gap:".6rem",flex:1,minWidth:0}}>
                            {/* Badge de estado combinado pago+entrega */}
                            <span title={ec.label} style={{fontSize:"var(--fs-md)",flexShrink:0}}>{ec.emoji}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontWeight:700,fontSize:"var(--fs-md)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                              <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",marginTop:".15rem"}}>
                                {p.lineas.map((l,i)=>(
                                  <span key={i} style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".08rem .35rem",borderRadius:3,background:TC[l.tipo]?.dim,color:TC[l.tipo]?.color,display:"flex",alignItems:"center",gap:".2rem"}}>
                                    {TC[l.tipo]?.icon} {l.talla}×{l.cantidad} {EE[l.estadoEntrega||"pendiente"]?.icon}
                                  </span>
                                ))}
                              </div>
                              {p.notas&&<div className="mono xs muted" style={{marginTop:".1rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.notas}</div>}
                            </div>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".3rem",flexShrink:0}}>
                            <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-md)",fontWeight:800}}>{fmtEur2(totalVenta)}</div>
                            <span className="badge" style={{background:ec.bg,color:ec.color,fontSize:"var(--fs-2xs)"}}>{ec.label}</span>
                          </div>
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

// ─── TAB TALLAS ───────────────────────────────────────────────────────────────
