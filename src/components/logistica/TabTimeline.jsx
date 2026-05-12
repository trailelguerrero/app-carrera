// Auto-extracted from Logistica.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { FASES_CHECKLIST, ESTADO_ENTREGA, ESTADO_TAREA, ESTADO_COLORES, PUESTOS_REF, TIPOS_LOC, LOC_ICONS, LOC_COLORS, TLC, TLI } from "./logisticaConstants.js";
import { eventDateStr } from "@/lib/eventUtils";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";

// ─── TIMELINE ─────────────────────────────────────────────────────────────────
function TabTL({tl,setTl,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,abrirModal,config}) {
  const [vistaKanban,setVistaKanban]=useState(false);
  const [ahora,setAhora] = useState(new Date());
  const [filtroResp,setFiltroResp] = useState("todos");
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const horaActual = ahora.toTimeString().slice(0,5); // "HH:MM"
  const responsables = useMemo(() =>
    [...new Set(tl.map(t0 => t0.responsable).filter(Boolean))].sort()
  , [tl]);
  const sorted=useMemo(()=>{
    let arr=[...tl];
    if(filtroResp !== "todos") arr = arr.filter(t0 => t0.responsable === filtroResp);
    if(ordenAlfa) arr.sort((a,b)=>(a.titulo||"").localeCompare(b.titulo||"","es"));
    else arr.sort((a,b)=>a.hora.localeCompare(b.hora));
    return arr;
  },[tl,ordenAlfa,filtroResp]);
  const mover=(id,dir)=>{
    if(ordenAlfa) return;
    setTl(prev=>{
      const arr=[...prev].sort((a,b)=>a.hora.localeCompare(b.hora));
      const i=arr.findIndex(x=>x.id===id);const j=i+dir;
      if(j<0||j>=arr.length)return prev;
      // Intercambiar las horas para mantener el orden
      const horaI=arr[i].hora,horaJ=arr[j].hora;
      return prev.map(x=>x.id===arr[i].id?{...x,hora:horaJ}:x.id===arr[j].id?{...x,hora:horaI}:x);
    });
  };
  const upd=(id,estado)=>setTl(p=>p.map(t=>t.id===id?{...t,estado,completadoEn:estado==="completado"?new Date().toTimeString().slice(0,5):undefined}:t));
  return(
    <>
      <div className="ph">
        <div><div className="pt">⏱️ Runbook del Evento</div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan-dim)", marginTop:".15rem", opacity:.8 }}>Secuencia de acciones cronológicas para el día D · marcar al ejecutar</div><div className="pd" style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}><span style={{background:"rgba(251,191,36,.12)",color:"var(--amber)",border:"1px solid rgba(251,191,36,.25)",borderRadius:99,padding:".1rem .5rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700}}>📅 Día del evento</span>{tl.filter(t=>t.estado==="completado").length}/{tl.length} completadas · {config?.fecha ? new Date(config.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"}) : eventDateStr(config)}</div></div>
        <div className="fr g1">
          <div className="filter-pill-group">
              <button className={`filter-pill${!vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(false)}>☰ Lista</button>
              <button className={`filter-pill${vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(true)}>⬛ Kanban</button>
            </div>
          {responsables.length > 0 && (
            <select
              value={filtroResp}
              onChange={e => setFiltroResp(e.target.value)}
              style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", padding:".3rem .6rem",
                borderRadius:6, border:"1px solid var(--border)", background:"var(--surface2)",
                color: filtroResp !== "todos" ? "var(--cyan)" : "var(--text-muted)",
                cursor:"pointer", maxWidth:150 }}
            >
              <option value="todos">👤 Todos</option>
              {responsables.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
          <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={()=>abrirModal({tipo:"tl"})}>+ Tarea</button>
        </div>
      </div>
      {vistaKanban?(
        <div className="log-kanban-grid" style={{gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))"}}>
          {["logistica","organizacion","voluntarios","carrera","comunicacion"].map(cat=>{
            const items=sorted.filter(t=>t.categoria===cat);
            if(!items.length) return null;
            const color=TLC[cat]||"var(--text-muted)";
            return(<div key={cat} className="log-k-col">
              <div className="log-k-hdr" style={{borderTopColor:color}}>
                <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color}}>{TLI[cat]} {cat}</span>
                <span className="log-k-cnt" style={{background:color+"22",color,border:`1px solid ${color}44`}}>{items.length}</span>
              </div>
              {items.map(t=>{const ec=ESTADO_COLORES[t.estado];return(<div key={t.id} className="log-k-card" style={{borderLeftColor:color,cursor:"pointer",opacity:t.estado==="completado"?.55:1}} onClick={()=>abrirFicha("tl",t)}>
                <div className="mono" style={{fontSize:"var(--fs-xs)",color,marginBottom:".2rem"}}>{t.hora}</div>
                <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".2rem"}}>{t.titulo}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:ec,background:ec+"18",padding:".1rem .35rem",borderRadius:4,display:"inline-block"}}>{t.estado}</div>
              </div>);})}
            </div>);
          })}
        </div>
      ):(
      <div className="tlcon">{sorted.map((t,i)=>{
        const color=TLC[t.categoria]||"var(--text-muted)";const ec=ESTADO_COLORES[t.estado];
        // Insertar línea "AHORA" entre la tarea anterior y la actual
        const esPrimeroFuturo = !ordenAlfa && t.hora >= horaActual &&
          (i === 0 || sorted[i-1].hora < horaActual);
        return(
          <div key={t.id} style={{display:"contents"}}>
          {esPrimeroFuturo && (
            <div style={{display:"flex",alignItems:"center",gap:".6rem",margin:".3rem 0",padding:"0 .5rem"}}>
              <div style={{flex:1,height:1,background:"rgba(34,211,238,0.35)"}}/>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                color:"var(--cyan)",padding:".12rem .5rem",borderRadius:20,
                background:"rgba(34,211,238,0.1)",border:"1px solid rgba(34,211,238,0.3)",
                whiteSpace:"nowrap"}}>
                ● AHORA {horaActual}
              </span>
              <div style={{flex:1,height:1,background:"rgba(34,211,238,0.35)"}}/>
            </div>
          )}
          <div className={cls("tlrow",t.estado==="completado"&&"tldone",t.estado==="bloqueado"&&"tlblk")}>
            <div className="tlleft">
              <div className="tltime">{t.hora}</div>
              <div className="tlconn">
                <div className="tlnode" style={{background:color,boxShadow:`0 0 8px ${color}66`}}><span>{TLI[t.categoria]}</span></div>
                {i<sorted.length-1&&<div className="tledge"/>}
              </div>
            </div>
            <div className="tlcard" style={{cursor:"pointer"}} onClick={()=>abrirFicha("tl",t)}>
              <div className="tlch">
                <span className="tlct">{t.titulo}</span>
                <div className="fr g1" onClick={e=>e.stopPropagation()}>
                  <select className="isml" value={t.estado} onChange={e=>upd(t.id,e.target.value)} style={{color:ec,background:`${ec}18`,border:`1px solid ${ec}44`,borderRadius:5,padding:"0.18rem 0.4rem",fontSize:"var(--fs-sm)",fontFamily:"var(--font-mono)",cursor:"pointer"}}>
                    {ESTADO_TAREA.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  
                </div>
              </div>
              <div className="tlcd">{t.descripcion}</div>
              <div className="tlcf">
                <span className="tlchip" style={{borderColor:`${color}44`,color}}>{TLI[t.categoria]} {t.categoria}</span>
                <span className="tlresp">👤 {t.responsable}</span>
              </div>
            </div>
          </div>
          </div>
        );
      })}</div>
      )}
    </>
  );
}


// Exports
export { TabTL };
