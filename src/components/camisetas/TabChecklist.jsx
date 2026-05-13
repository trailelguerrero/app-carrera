/**
 * TabChecklist.jsx — Fase 3, Tarea 3.4
 * Tab "Entrega" del bloque Camisetas.
 */
import { useState } from "react";
import { fmtEur2 } from "@/lib/utils";
import { blockCls as cls } from "@/lib/blockStyles";
import EmptyState from "@/components/EmptyState";
import { TC, EP, EE, ESTADOS_ENTREGA, estadoCombinado, calcPedido, badgePago, badgeEnt, TALLAS, TALLAS_NINO } from "./camisetasConstants";

export function TabChecklist({ pedidos, updateLinea, abrirFicha, generarPedidosVoluntarios }) {
  const [filtro,setFiltro]   = useState("todos");
  const [pedColaps, setPedCo] = useState({});
  const [modoRapido, setModoRapido] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const todas = useMemo(()=>pedidos.flatMap(p=>p.lineas.map(l=>({...l,pedNombre:p.nombre,pedId:p.id,ped:p}))),[pedidos]);
  const filtradas = useMemo(()=>todas.filter(l=>{
    const ep=l.estadoPago||"pendiente"; const ee=l.estadoEntrega||"pendiente";
    if(filtro==="todos")        return true;
    if(filtro==="sin-entregar") return ee==="pendiente";
    if(filtro==="entregado")    return ee==="entregado";
    if(filtro==="sin-pagar")    return ep==="pendiente";
    if(filtro==="pagado")       return ep==="pagado";
    if(filtro==="regalo")       return ep==="regalo";
    return true;
  }).filter(l => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (l.pedNombre||"").toLowerCase().includes(q) ||
           (l.ped?.telefono||"").includes(q);
  }),[todas,filtro,busqueda]);
  const cPE=todas.filter(l=>(l.estadoEntrega||"pendiente")==="pendiente").length;
  const cPP=todas.filter(l=>(l.estadoPago||"pendiente")==="pendiente").length;
  const FILTROS=[
    {id:"todos",        label:`Todos (${todas.length})`,                                                   color:"var(--text-muted)"},
    {id:"sin-entregar", label:`Por entregar (${cPE})`,                                                    color:"var(--amber)"},
    {id:"entregado",    label:`Entregados (${todas.filter(l=>l.estadoEntrega==="entregado").length})`,    color:"var(--green)"},
    {id:"sin-pagar",    label:`Sin pagar (${cPP})`,                                                       color:"var(--amber)"},
    {id:"pagado",       label:`Pagados (${todas.filter(l=>l.estadoPago==="pagado").length})`,             color:"var(--green)"},
    {id:"regalo",       label:`Regalos (${todas.filter(l=>l.estadoPago==="regalo").length})`,             color:"var(--violet)"},
  ];
  return (
    <>
      <div className="ph">
        <div><div className="pt">📬 Entrega de camisetas</div><div className="pd">{cPE} líneas por entregar · {cPP} sin cobrar</div></div>
        <div style={{ display:"flex", gap:".4rem", flexWrap:"wrap" }}>
        <button className={`btn btn-sm${modoRapido?" btn-cyan":" btn-ghost"}`}
          onClick={()=>setModoRapido(v=>!v)}
          title={modoRapido?"Salir del modo entrega rápida":"Modo entrega rápida: lista plana con botones grandes"}>
          ⚡ {modoRapido?"Modo normal":"Entrega rápida"}
        </button>
        </div>
      </div>
      {/* Buscador — crítico para día de carrera */}
      <div style={{ position:"relative", marginBottom:".75rem" }}>
        <input
          className="inp"
          placeholder="🔍 Buscar por nombre o teléfono..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ paddingLeft:"2.5rem", fontSize:"var(--fs-md)" }}
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda("")}
            style={{ position:"absolute", right:".6rem", top:"50%", transform:"translateY(-50%)",
              background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)",
              fontSize:"1rem", lineHeight:1 }}>
            ✕
          </button>
        )}
      </div>

      {/* ── MODO ENTREGA RÁPIDA ── */}
      {modoRapido && (() => {
        const lineasPend = pedidos.flatMap(p =>
          (p.lineas||[])
            .filter(l => (l.estadoEntrega||"pendiente") === "pendiente")
            .map(l => ({ ...l, pedidoId: p.id, nombrePedido: p.nombre }))
        )
        .filter(l => {
          if (!busqueda.trim()) return true;
          const q = busqueda.toLowerCase();
          return (l.nombrePedido||"").toLowerCase().includes(q) ||
                 (pedidos.find(p=>p.id===l.pedidoId)?.telefono||"").includes(q);
        })
        .sort((a,b) => a.nombrePedido.localeCompare(b.nombrePedido, "es"));
        return (
          <div style={{ marginBottom:".85rem" }}>
            {lineasPend.length === 0 ? (
              <div style={{ textAlign:"center", padding:"2rem", fontFamily:"var(--font-mono)",
                fontSize:"var(--fs-sm)", color:"var(--green)" }}>
                ✅ Todas las camisetas han sido entregadas
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:".35rem" }}>
                {lineasPend.map((l,i) => (
                  <div key={l.pedidoId+"-"+l.id+i}
                    style={{ display:"flex", alignItems:"center", gap:".75rem",
                      padding:".65rem .9rem", borderRadius:8,
                      background:"var(--surface2)", border:"1px solid var(--border)" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:"var(--fs-base)",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {l.nombrePedido}
                      </div>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                        color:"var(--text-muted)", marginTop:".1rem" }}>
                        {TC[l.tipo]?.icon} {TC[l.tipo]?.label} · Talla {l.talla} · ×{l.cantidad}
                        {(l.estadoPago||"pendiente") !== "pagado" && l.estadoPago !== "regalo" && (
                          <span style={{ color:"var(--amber)", marginLeft:".4rem" }}>⚠ Sin cobrar</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn btn-green"
                      style={{ minHeight:52, minWidth:100, fontSize:"var(--fs-base)", fontWeight:800 }}
                      onClick={() => updateLinea(l.pedidoId, {...l, estadoEntrega:"entregado"})}>
                      ✓ Entregar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <div style={{display:"flex",gap:".4rem",flexWrap:"wrap",marginBottom:".85rem"}}>
        {FILTROS.map(f=>(
          <button key={f.id} onClick={()=>setFiltro(f.id)} style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,padding:".28rem .6rem",borderRadius:"var(--r-sm)",border:`1px solid ${filtro===f.id?f.color:"var(--border)"}`,background:filtro===f.id?`${f.color}18`:"transparent",color:filtro===f.id?f.color:"var(--text-muted)",cursor:"pointer",transition:"all .15s"}}>{f.label}</button>
        ))}
      </div>
      {filtradas.length===0&&<div className="empty-state"><div className="empty-state-icon">✅</div>Sin líneas con estos filtros</div>}

      {/* Agrupado por pedido — cada pedido colapsable */}
      {filtradas.length > 0 && (() => {
        // Agrupar líneas filtradas por pedido
        const porPedido = [];
        const pedIdsSeen = new Set();
        filtradas.forEach(l => {
          if (!pedIdsSeen.has(l.pedId)) {
            pedIdsSeen.add(l.pedId);
            porPedido.push({
              ped: l.ped,
              lineas: filtradas.filter(x => x.pedId === l.pedId),
            });
          }
        });

        return (
          <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
            {porPedido.map(({ ped, lineas }) => {
              const pendEnt = lineas.filter(l=>(l.estadoEntrega||"pendiente")==="pendiente").length;
              const pendPago = lineas.filter(l=>(l.estadoPago||"pendiente")==="pendiente" && l.estadoPago!=="regalo").length;
              const collapsed = !pedColaps[ped.id]; // por defecto colapsado (undefined=false→!false=true)
              const allEntregado = pendEnt === 0;

              return (
                <div key={ped.id} style={{borderRadius:10,overflow:"hidden",
                  border:`1px solid ${allEntregado?"var(--border)":"rgba(251,191,36,.2)"}`,
                  opacity: allEntregado ? .7 : 1}}>

                  {/* Cabecera del pedido */}
                  <button
                    onClick={()=>setPedCo(p=>({...p,[ped.id]:!p[ped.id]}))}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:".6rem",
                      padding:".6rem .85rem",background:allEntregado?"var(--surface2)":"rgba(251,191,36,.05)",
                      border:"none",cursor:"pointer",textAlign:"left",
                      borderBottom:collapsed?"none":"1px solid var(--border)"}}>
                    <span style={{fontWeight:700,fontSize:"var(--fs-base)",flex:1,minWidth:0,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                      textAlign:"left"}}>
                      {allEntregado ? "✅ " : "📦 "}{ped.nombre}
                    </span>
                    <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
                      {pendEnt > 0 && (
                        <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                          padding:".1rem .4rem",borderRadius:20,
                          background:"rgba(251,191,36,.15)",color:"var(--amber)",
                          border:"1px solid rgba(251,191,36,.3)"}}>
                          {pendEnt} por entregar
                        </span>
                      )}
                      {pendPago > 0 && (
                        <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                          padding:".1rem .4rem",borderRadius:20,
                          background:"rgba(248,113,113,.12)",color:"var(--red)",
                          border:"1px solid rgba(248,113,113,.25)"}}>
                          {pendPago} sin cobrar
                        </span>
                      )}
                      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
                        color:"var(--text-dim)",
                        transform:collapsed?"rotate(-90deg)":"rotate(0deg)",
                        transition:"transform .18s"}}>▼</span>
                    </div>
                  </button>

                  {/* Líneas del pedido */}
                  {!collapsed && (
                    <div style={{background:"var(--surface)"}}>
                      {lineas.map((l,idx) => {
                        const tcfg=TC[l.tipo]; const ep=l.estadoPago||"pendiente";
                        const ee=l.estadoEntrega||"pendiente";
                        const epCfg=EP[ep]; const eeCfg=EE[ee];
                        return (
                          <div key={`${l.pedId}-${l.id}`}
                            style={{padding:".6rem .85rem",
                              borderBottom:idx<lineas.length-1?"1px solid var(--border)":"none",
                              borderLeft:`3px solid ${eeCfg.color}`,
                              display:"flex",justifyContent:"space-between",
                              alignItems:"center",gap:".75rem",flexWrap:"wrap"}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
                                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
                                  padding:".1rem .4rem",borderRadius:4,
                                  background:tcfg?.dim,color:tcfg?.color,fontWeight:700}}>
                                  {tcfg?.icon} {tcfg?.label} — {l.talla} × {l.cantidad} ud
                                </span>
                                <span className="badge" style={{background:epCfg.bg,color:epCfg.color,fontSize:"var(--fs-xs)"}}>
                                  {epCfg.icon} {epCfg.label}
                                </span>
                              </div>
                            </div>
                            <div style={{display:"flex",gap:".35rem",flexShrink:0}}>
                              <button
                                onClick={()=>updateLinea(l.pedId,l.id,"estadoEntrega",ee==="entregado"?"pendiente":"entregado")}
                                style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                                  padding:".3rem .65rem",borderRadius:"var(--r-sm)",
                                  border:`1px solid ${eeCfg.color}44`,background:eeCfg.bg,
                                  color:eeCfg.color,cursor:"pointer",whiteSpace:"nowrap"}}>
                                {ee==="entregado"?"✔️ Entregado":"📦 Entregar"}
                              </button>
                              {ep!=="regalo" && (
                                <button
                                  onClick={()=>updateLinea(l.pedId,l.id,"estadoPago",ep==="pagado"?"pendiente":"pagado")}
                                  style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                                    padding:".3rem .65rem",borderRadius:"var(--r-sm)",
                                    border:`1px solid ${epCfg.color}44`,background:epCfg.bg,
                                    color:epCfg.color,cursor:"pointer",whiteSpace:"nowrap"}}>
                                  {ep==="pagado"?"✅ Pagado":"⏳ Cobrar"}
                                </button>
                              )}
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
        );
      })()}
    </>
  );
}

// ─── FICHA PEDIDO ─────────────────────────────────────────────────────────────
