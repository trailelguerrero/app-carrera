/**
 * TabHitos.jsx — Tarea 3.3
 * Tab de hitos del módulo Proyecto.
 */
import { useState } from "react";
import { blockCls as cls } from "@/lib/blockStyles";
import { fmt, diasHasta, getArea } from "./proyectoConstants";

export function TabHitos({ hitos, updHito, setModal, setDelConf, setFicha }) {
  const [ordenAlfa, setOrdenAlfa] = useState(false);
  const sorted = ordenAlfa
    ? [...hitos].sort((ha,hb) => (ha.nombre||"").localeCompare(hb.nombre||"","es"))
    : [...hitos].sort((ha,hb) => ha.fecha.localeCompare(hb.fecha));
  const hitosPendientes  = hitos.filter(ht => !ht.completado).length;
  const hitosCompletados = hitos.filter(ht =>  ht.completado).length;

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🏁 Hitos del Proyecto</div>
          <div className="pd" style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}><span style={{background:"rgba(52,211,153,.12)",color:"var(--green)",border:"1px solid rgba(52,211,153,.25)",borderRadius:99,padding:".1rem .5rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700}}>📅 Fechas clave</span>{hitosPendientes} pendientes · {hitosCompletados} completados</div>
        </div>
        <div style={{display:"flex",gap:".4rem",alignItems:"center"}}>
          <button className={`btn btn-sm ${ordenAlfa?"btn-primary":"btn-ghost"}`} onClick={()=>setOrdenAlfa(ov=>!ov)} title={ordenAlfa?"Ordenar por fecha":"Ordenar A-Z"}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={() => setModal({tipo:"hito",data:null})}>+ Nuevo hito</button>
        </div>
      </div>

      {/* Progreso global de hitos */}
      {hitos.length > 0 && (() => {
        const pct  = Math.round(hitosCompletados/hitos.length*100);
        return (
          <div style={{marginBottom:".65rem",padding:".6rem .75rem",
            background:"var(--surface2)",borderRadius:8,
            border:"1px solid var(--border)"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:".35rem"}}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                color:"var(--text-muted)"}}>
                {hitosCompletados}/{hitos.length} hitos completados
              </span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
                fontWeight:700,
                color:pct===100?"var(--green)":pct>=60?"var(--cyan)":"var(--amber)"}}>
                {pct}%
              </span>
            </div>
            <div style={{height:4,background:"var(--surface3)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:2,transition:"width .5s",
                width:`${pct}%`,
                background:pct===100?"var(--green)":pct>=60?"var(--cyan)":"var(--amber)"}}/> 
            </div>
          </div>
        );
      })()}

      <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
        {sorted.map((h,i) => {
          const dias = diasHasta(h.fecha);
          const vencido = dias < 0 && !h.completado;
          return (
            <div key={h.id} className={cls("hito-card", h.completado&&"hito-done", vencido&&"hito-vencido")}
              style={{cursor:"pointer"}} onClick={() => setFicha("hito", h)}
              title="Click para ver ficha del hito">
              <div className="hito-card-gem" style={{background:h.completado?"#34d399":h.critico?"#f87171":"#22d3ee",boxShadow:h.completado?"0 0 8px #34d39966":h.critico?"0 0 8px #f8717166":"0 0 8px #22d3ee66"}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".2rem",flexWrap:"wrap"}}>
                  <span style={{fontSize:"var(--fs-base)",fontWeight:700,textDecoration:h.completado?"line-through":"none",color:h.completado?"var(--text-muted)":"var(--text)"}}>{h.nombre}</span>
                  {h.critico && !h.completado && <span className="badge" style={{background:"rgba(248,113,113,.1)",color:"#f87171",fontSize:"var(--fs-2xs)"}}>CRÍTICO</span>}
                  {h.completado && <span className="badge" style={{background:"rgba(52,211,153,.1)",color:"#34d399",fontSize:"var(--fs-2xs)"}}>COMPLETADO</span>}
                  {h._tareaId  && <span className="badge" style={{background:"rgba(34,211,238,.08)",color:"var(--cyan)",  fontSize:"var(--fs-2xs)",border:"1px solid rgba(34,211,238,.2)"}} title="Generado automáticamente desde tarea de Proyecto">auto · tarea</span>}
                  {h._pedidoId && <span className="badge" style={{background:"rgba(167,139,250,.08)",color:"var(--violet)",fontSize:"var(--fs-2xs)",border:"1px solid rgba(167,139,250,.2)"}} title="Generado automáticamente desde pedido a proveedor">auto · pedido</span>}
                </div>
                <div style={{display:"flex",gap:".75rem",alignItems:"center",flexWrap:"wrap"}}>
                  <span className="mono xs" style={{color:vencido?"#f87171":"var(--text-muted)"}}>{fmt(h.fecha)}</span>
                  {!h.completado && <span className="mono xs" style={{color:vencido?"#f87171":dias<=30?"#fbbf24":"#22d3ee",fontWeight:700}}>
                    {vencido?`¡Vencido! (${Math.abs(dias)} días)`:dias===0?"Hoy":dias<=30?`⚡ ${dias} días`:`${dias} días`}
                  </span>}
                </div>
              </div>
              <div style={{display:"flex",gap:".5rem",alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
                {/* Quick-complete: checkbox grande, área táctil 36x36px */}
                <button className="hito-ckbox"
                  title={h.completado ? "Marcar como pendiente" : "Marcar como completado"}
                  style={{borderColor:h.completado?"#34d399":"var(--border)",background:h.completado?"var(--green-dim)":"transparent"}}
                  onClick={() => updHito(h.id,"completado",!h.completado)}>
                  {h.completado
                    ? <span style={{color:"#34d399",fontSize:"var(--fs-md)",lineHeight:1}}>✓</span>
                    : <span style={{color:"var(--text-dim)",fontSize:"var(--fs-base)",lineHeight:1}}>○</span>
                  }
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── MODAL TAREA ──────────────────────────────────────────────────────────────
