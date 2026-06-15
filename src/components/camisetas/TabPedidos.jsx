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
  const [pedGrupos, setPedGrupos] = useState({ pendiente:false, pagado:false, regalo:false }); // expandidos por defecto

  // Stats para pills — calculados sobre todos los pedidos (no los filtrados)
  const statsPago = useMemo(() => {
    const counts = {};
    ESTADOS_PAGO.forEach(e => { counts[e] = 0; });
    pedidos.forEach(p => {
      const dominant = (() => {
        const c = {};
        p.lineas.forEach(l => { const s = l.estadoPago||"pendiente"; c[s]=(c[s]||0)+l.cantidad; });
        return Object.entries(c).sort((a,b)=>b[1]-a[1])[0]?.[0] || "pendiente";
      })();
      counts[dominant] = (counts[dominant]||0) + 1;
    });
    return counts;
  }, [pedidos]);

  const statsEnt = useMemo(() => {
    const pendientes  = pedidos.filter(p => p.lineas.some(l=>(l.estadoEntrega||"pendiente")==="pendiente")).length;
    const entregados  = pedidos.filter(p => p.lineas.every(l=>(l.estadoEntrega||"pendiente")==="entregado")).length;
    return { pendiente: pendientes, entregado: entregados };
  }, [pedidos]);

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
        <div><div className="pt">👕 Pedidos de camisetas</div><div className="pd">{filtrados.length}/{pedidos.length} pedidos · {filtrados.reduce((s,p)=>s+p.lineas.reduce((a,l)=>a+l.cantidad,0),0)} unidades</div></div>
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
      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom:".85rem", display:"flex", flexDirection:"column", gap:".5rem" }}>

        {/* Búsqueda */}
        <input className="inp" placeholder="🔍 Nombre, teléfono o email…" value={bus}
          onChange={e=>setBus(e.target.value)} style={{ maxWidth:300, fontSize:"var(--fs-base)" }} />

        {/* Pills de estado de pago */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:".35rem", alignItems:"center" }}>
          {[
            { id:"todos",     label:"Todos",      count:pedidos.length,        color:"var(--text-muted)", bg:"rgba(255,255,255,.08)" },
            { id:"pendiente", label:"⏳ Pendiente",count:statsPago.pendiente||0,color:"var(--amber)",      bg:"rgba(251,191,36,.15)"  },
            { id:"pagado",    label:"✅ Pagado",   count:statsPago.pagado||0,   color:"var(--green)",      bg:"rgba(52,211,153,.15)"  },
            { id:"regalo",    label:"🎁 Regalo",   count:statsPago.regalo||0,   color:"var(--violet)",     bg:"rgba(167,139,250,.15)" },
          ].map(({ id, label, count, color, bg }) => (
            <button key={id}
              className={"filter-pill"+(fPago===id?" active":"")}
              onClick={() => setFPago(id)}>
              {label}
              <span style={{
                fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                color:fPago===id?color:"var(--text-dim)",
                background:fPago===id?bg:"transparent",
                borderRadius:10, padding:"0 .3rem", marginLeft:".15rem",
                minWidth:16, display:"inline-block", textAlign:"center", transition:"all .15s",
              }}>{count}</span>
            </button>
          ))}
          <div className="filter-pill-sep" />
          {/* Pills estado de entrega */}
          {[
            { id:"todos",     label:"Entrega: todas",count:pedidos.length,       color:"var(--text-muted)", bg:"rgba(255,255,255,.08)" },
            { id:"pendiente", label:"📦 Sin entregar",count:statsEnt.pendiente,  color:"var(--amber)",      bg:"rgba(251,191,36,.15)"  },
            { id:"entregado", label:"✔️ Entregado",   count:statsEnt.entregado,  color:"var(--green)",      bg:"rgba(52,211,153,.15)"  },
          ].map(({ id, label, count, color, bg }) => (
            <button key={"ent-"+id}
              className={"filter-pill"+(fEnt===id?" active":"")}
              onClick={() => setFEnt(id)}>
              {label}
              <span style={{
                fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                color:fEnt===id?color:"var(--text-dim)",
                background:fEnt===id?bg:"transparent",
                borderRadius:10, padding:"0 .3rem", marginLeft:".15rem",
                minWidth:16, display:"inline-block", textAlign:"center", transition:"all .15s",
              }}>{count}</span>
            </button>
          ))}
          {(bus||fPago!=="todos"||fEnt!=="todos") && (
            <button className="filter-pill" onClick={()=>{setBus("");setFPago("todos");setFEnt("todos");}}
              style={{ color:"var(--red)", borderColor:"rgba(248,113,113,0.3)" }}>
              ✕ Limpiar
            </button>
          )}
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
        <div className="k-grid">
          {ESTADOS_PAGO.map(estado=>{
            const cfg=EP[estado];
            const items=filtrados.filter(p=>{
              const counts={};
              p.lineas.forEach(l=>{counts[l.estadoPago||"pendiente"]=(counts[l.estadoPago||"pendiente"]||0)+l.cantidad;});
              return Object.entries(counts).sort((sa,sb)=>sb[1]-sa[1])[0]?.[0]===estado;
            });
            return (
              <div key={estado} className="k-col">
                <div className="k-col-hdr" style={{"--k-color": cfg.color}}>
                  <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color:cfg.color}}>{cfg.icon} {cfg.label}</span>
                  <span className="k-col-cnt" style={{background:cfg.bg,color:cfg.color}}>{items.length}</span>
                </div>
                {items.map(p=>{
                  const {totalVenta,totalUnid}=calcPedido(p,coste); const be=badgeEnt(p);
                  return (
                    <div key={p.id} className="k-card" style={{"--k-color": cfg.color}}
                      onClick={()=>abrirFicha(p)}>
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
                      const {totalVenta, costeRegalos}=calcPedido(p,coste); const ec=estadoCombinado(p.lineas);
                      const lineasRegalo = estado==="regalo" ? p.lineas.filter(l=>l.estadoPago==="regalo") : [];
                      const costePersona = lineasRegalo.reduce((s,l)=>s+l.cantidad*(coste[l.tipo]||0),0);
                      return (
                        <div key={p.id} className="cam-row"
                          style={{borderBottom:idx<items.length-1?"1px solid var(--border)":"none",
                            borderRadius:0}}
                          onClick={()=>abrirFicha(p)}>
                          <div style={{display:"flex",alignItems:"center",gap:".6rem",flex:1,minWidth:0}}>
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
                            {estado==="regalo"
                              ? <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",fontWeight:800,color:"var(--violet)"}}>{fmtEur2(costePersona)} fab.</div>
                              : <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-md)",fontWeight:800}}>{fmtEur2(totalVenta)}</div>
                            }
                            <span className="badge" style={{background:ec.bg,color:ec.color,fontSize:"var(--fs-2xs)"}}>{ec.label}</span>
                          </div>
                        </div>
                      );
                    })}
                    {/* Footer de coste total — solo en el grupo Regalo */}
                    {estado==="regalo" && (() => {
                      const totalUd   = items.reduce((s,p)=>s+p.lineas.filter(l=>l.estadoPago==="regalo").reduce((ss,l)=>ss+l.cantidad,0),0);
                      const totalCoste= items.reduce((s,p)=>s+p.lineas.filter(l=>l.estadoPago==="regalo").reduce((ss,l)=>ss+l.cantidad*(coste[l.tipo]||0),0),0);
                      return (
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                          padding:".55rem .85rem",borderTop:`1px solid ${cfg.color}22`,
                          background:`${cfg.color}06`}}>
                          <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>
                            🎁 {totalUd} unidades regaladas · coste fabricación
                          </span>
                          <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",fontWeight:800,color:"var(--violet)"}}>
                            {fmtEur2(totalCoste)}
                          </span>
                        </div>
                      );
                    })()}
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
