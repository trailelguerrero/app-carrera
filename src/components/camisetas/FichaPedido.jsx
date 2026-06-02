/**
 * FichaPedido.jsx — Fase 3, Tarea 3.4
 * Modal de detalle/ficha de un pedido de camisetas.
 */
import { useModalClose } from "@/hooks/useModalClose";
import { createPortal } from "react-dom";
import { fmtEur2 } from "@/lib/utils";
import { blockCls as cls } from "@/lib/blockStyles";
import { TC, EP, EE, ESTADOS_PAGO, ESTADOS_ENTREGA, estadoCombinado, calcPedido } from "./camisetasConstants";

export function FichaPedido({ pedido:p, coste, onClose, onEditar, onEliminar, updateLinea }) {
  const {totalVenta,totalCoste,totalUnid,beneficio,benRealizado,benPotencial,costeRegalos} = calcPedido(p,coste);
  const Row = ({label,value,color}) => (!value&&value!==0)?null:(
    <div style={{display:"flex",justifyContent:"space-between",padding:".4rem 0",borderBottom:"1px solid rgba(30,45,80,.3)"}}>
      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",flexShrink:0,marginRight:"1rem"}}>{label}</span>
      <span style={{fontSize:"var(--fs-base)",fontWeight:600,textAlign:"right",color:color||"var(--text)"}}>{value}</span>
    </div>
  );
  return createPortal(
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-ficha" style={{maxWidth:500}}>
        <div style={{borderTop:"3px solid var(--primary)",borderRadius:"16px 16px 0 0"}}>
          <div className="modal-header">
            <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
              <span style={{fontSize:"var(--fs-lg)"}}>👕</span>
              <div>
                <div style={{fontWeight:800,fontSize:"var(--fs-md)"}}>{p.nombre}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".1rem",textTransform:"uppercase"}}>{totalUnid} unidades · {p.lineas.length} línea{p.lineas.length!==1?"s":""}</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}><span aria-hidden="true">✕</span></button>
          </div>
        </div>
        <div className="modal-body" style={{gap:".4rem"}}>
          <Row label="Teléfono" value={p.telefono} />
          <Row label="Email"    value={p.email} />
          <div style={{background:"var(--surface2)",borderRadius:8,padding:".65rem .75rem",margin:".25rem 0"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".5rem",textTransform:"uppercase",letterSpacing:".08em"}}>Líneas del pedido</div>
            {p.lineas.map((l,i)=>{
              const costeU=coste[l.tipo]||0; const cfg=TC[l.tipo];
              const ep=l.estadoPago||"pendiente"; const ee=l.estadoEntrega||"pendiente";
              const epCfg=EP[ep]; const eeCfg=EE[ee];
              const subV=ep==="regalo"?0:l.cantidad*(l.precioVenta||0);
              return (
                <div key={l.id} style={{padding:".5rem 0",borderBottom:i<p.lineas.length-1?"1px solid rgba(30,45,80,.2)":"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".3rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                      <span style={{fontSize:"var(--fs-md)"}}>{cfg?.icon}</span>
                      <div>
                        <div style={{fontSize:"var(--fs-base)",fontWeight:700}}>{cfg?.label} — {l.talla}</div>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>{l.cantidad} ud · coste {fmtEur2(costeU)}/ud</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-base)",fontWeight:700,color:ep==="regalo"?"var(--violet)":cfg?.color}}>{ep==="regalo"?"🎁 Regalo":fmtEur2(subV)}</div>
                      {ep!=="regalo"&&<div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>{fmtEur2(l.precioVenta||0)}/ud</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:".35rem"}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>updateLinea(p.id,l.id,"estadoPago",ep==="pagado"?"pendiente":"pagado")} disabled={ep==="regalo"} style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,padding:".2rem .5rem",borderRadius:4,border:`1px solid ${epCfg.color}44`,background:epCfg.bg,color:epCfg.color,cursor:ep==="regalo"?"default":"pointer",transition:"all .15s"}}>{epCfg.icon} {epCfg.label}</button>
                    <button onClick={()=>updateLinea(p.id,l.id,"estadoEntrega",ee==="entregado"?"pendiente":"entregado")} style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,padding:".2rem .5rem",borderRadius:4,border:`1px solid ${eeCfg.color}44`,background:eeCfg.bg,color:eeCfg.color,cursor:"pointer",transition:"all .15s"}}>{eeCfg.icon} {eeCfg.label}</button>
                    <span className="mono xs muted" style={{marginLeft:"auto",alignSelf:"center"}}>margen {fmtEur2((ep==="regalo"?-costeU:(l.precioVenta||0)-costeU)*l.cantidad)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",display:"flex",justifyContent:"space-around",gap:".6rem",flexWrap:"wrap"}}>
            {[
              {l:"Coste total",    v:fmtEur2(totalCoste),   c:"var(--red)"},
              {l:"Venta total",    v:fmtEur2(totalVenta),   c:"var(--green)"},
              {l:"Ben. realizado", v:fmtEur2(benRealizado), c:benRealizado>=0?"var(--green)":"var(--red)"},
              {l:"Ben. potencial", v:fmtEur2(benPotencial), c:benPotencial>=0?"var(--cyan)":"var(--amber)"},
              {l:"Coste regalos",  v:fmtEur2(costeRegalos), c:"var(--violet)"},
            ].map(({l,v,c})=>(
              <div key={l} style={{textAlign:"center"}}><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-2xs)",color:"var(--text-muted)",marginBottom:".1rem",textTransform:"uppercase"}}>{l}</div><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-base)",fontWeight:800,color:c}}>{v}</div></div>
            ))}
          </div>
          {p.notas&&<div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:"2px solid var(--primary)"}}><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div><div style={{fontSize:"var(--fs-base)",lineHeight:1.5}}>{p.notas}</div></div>}
        </div>
        <div className="modal-footer" style={{justifyContent:"space-between"}}>
          <button className="btn btn-red" onClick={onEliminar}>🗑 Eliminar</button>
          <div style={{display:"flex",gap:".4rem"}}><button className="btn btn-ghost" onClick={onClose}>Cerrar</button><button className="btn btn-primary" onClick={onEditar}>✏️ Editar</button></div>
        </div>
      </div>
    </div>,
    document.body
  );
}
// ─── MODAL CREAR/EDITAR ───────────────────────────────────────────────────────
