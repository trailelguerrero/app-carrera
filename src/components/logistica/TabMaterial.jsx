// Auto-extracted from Logistica.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { FASES_CHECKLIST, ESTADO_ENTREGA, ESTADO_TAREA, ESTADO_COLORES, PUESTOS_REF, TIPOS_LOC, LOC_ICONS, LOC_COLORS, CATS_MATERIAL, CAT_COLORS, CAT_ICONS, ESCALA_CON_INSCRITOS } from "./logisticaConstants.js";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import { usePaginacion } from "@/hooks/usePaginacion.jsx";
import EmptyState from "@/components/EmptyState";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";

// ─── MATERIAL ─────────────────────────────────────────────────────────────────
function TabMat({material,setMaterial,asigs,setAsigs,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,abrirModal,locs,patsConEspecie,totalInscritos=0,totalMaximos=0,rawInscritos={},rawTramos=[],conceptosPres=[]}) {
  const [vistaAsig,setVistaAsig]=useState(false);
  const [vistaKanban,setVistaKanban]=useState(false);
  const [cat,setCat]=useState("todas");
  const [busqMat,setBusqMat]=useState("");

  // (rawTramos, rawInscritos, totalInscritos, totalMaximos vienen del componente padre vía props)
  // ESCALA_CON_INSCRITOS se importa desde logisticaConstants.js (exportado desde ahí)
  const ms=useMemo(()=>material.map(m=>{const a=asigs.filter(x=>x.materialId===m.id);const asig=a.reduce((s,x)=>s+x.cantidad,0);const ent=a.filter(x=>x.estado==="entregado").reduce((s,x)=>s+x.cantidad,0);return{...m,asig,ent,def:Math.max(asig-m.stock,0)}}),[material,asigs]);
  const mf=useMemo(()=>{
    let list = ms.filter(m => cat === "todas" || m.categoria === cat);
    if(busqMat.trim()) {
      const q = busqMat.toLowerCase();
      list = list.filter(m => (m.nombre||"").toLowerCase().includes(q) || (m.categoria||"").toLowerCase().includes(q));
    }
    if(ordenAlfa) list=[...list].sort((sa,sb)=>(sa.nombre||"").localeCompare(sb.nombre||"","es"));
    return list;
  },[ms,cat,ordenAlfa,busqMat]);
  const { items: mfPag, total: totalMat, PaginadorUI: PagMat } = usePaginacion(mf, 20);
  const mover=(id,dir)=>{
    if(ordenAlfa) return;
    setMaterial(prev=>{
      const arr=[...prev]; const i=arr.findIndex(x=>x.id===id); const j=i+dir;
      if(j<0||j>=arr.length) return arr;
      [arr[i],arr[j]]=[arr[j],arr[i]]; return arr;
    });
  };
  return(
    <>
      <div className="ph">
        <div><div className="pt">📦 Inventario de Material</div><div className="pd">{material.length} artículos · {asigs.length} asignaciones</div></div>
        <div className="fr g1">
          <button className={cls("btn",!vistaAsig?"btn-cyan":"btn-ghost")} onClick={()=>setVistaAsig(false)}>Catálogo<span style={{marginLeft:"0.3rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",background:!vistaAsig?"rgba(0,0,0,0.15)":"var(--surface3)",padding:"0.05rem 0.35rem",borderRadius:3}}>{material.length}</span></button>
          <button className={cls("btn",vistaAsig?"btn-cyan":"btn-ghost")} onClick={()=>setVistaAsig(true)}>Asignaciones<span style={{marginLeft:"0.3rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",background:vistaAsig?"rgba(0,0,0,0.15)":"var(--surface3)",padding:"0.05rem 0.35rem",borderRadius:3}}>{asigs.length}</span></button>
          {!vistaAsig && (<>
            <div className="filter-pill-group">
              <button className={`filter-pill${!vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(false)}>☰ Lista</button>
              <button className={`filter-pill${vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(true)}>⬛ Kanban</button>
            </div>
            <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          </>)}
          <input type="search" className="inp inp-sm"
            placeholder="🔍 Buscar material…"
            value={busqMat} onChange={e=>setBusqMat(e.target.value)}
            style={{maxWidth:180,fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}
          />
          <button className="btn btn-primary" onClick={()=>abrirModal({tipo:vistaAsig?"asig":"mat",conceptosPres:conceptosPres})}>+ Añadir</button>
        </div>
      </div>
      {!vistaAsig?(<>
        {material.length === 0 && (
          <div style={{ padding:"0 0 .85rem" }}><SkeletonRows n={5} /></div>
        )}
        <div className="chips">
          <button className={cls("chip",cat==="todas"&&"ca")} onClick={()=>setCat("todas")}>Todas</button>
          {CATS_MATERIAL.map(c=><button key={c} className={cls("chip",cat===c&&"ca")} onClick={()=>setCat(c)} style={cat===c?{borderColor:CAT_COLORS[c],color:CAT_COLORS[c],background:`${CAT_COLORS[c]}18`}:{}}>{CAT_ICONS[c]} {c}</button>)}
        </div>
        {vistaKanban?(
          <div className="log-kanban-grid">
            {CATS_MATERIAL.map(catK=>{
              const items=mf.filter(m=>m.categoria===catK);
              if(!items.length) return null;
              const color=CAT_COLORS[catK];
              return(<div key={catK} className="log-k-col">
                <div className="log-k-hdr" style={{borderTopColor:color}}>
                  <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color}}>{CAT_ICONS[catK]} {catK}</span>
                  <span className="log-k-cnt" style={{background:color+"22",color,border:`1px solid ${color}44`}}>{items.length}</span>
                </div>
                {items.map(m=>(<div key={m.id} className="log-k-card" style={{borderLeftColor:color,cursor:"pointer"}} onClick={()=>abrirFicha("mat",m)}>
                  <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".3rem"}}>{m.nombre}</div>
                  <div style={{display:"flex",gap:".5rem",flexWrap:"wrap",fontSize:"var(--fs-xs)",fontFamily:"var(--font-mono)"}}>
                    <span style={{color:"var(--text-muted)"}}>Stock: <span style={{color:"var(--text)",fontWeight:700}}>{m.stock} {m.unidad}</span></span>
                    {m.def>0&&<span style={{color:"var(--red)",fontWeight:700}}>⚠ -{m.def}</span>}
                  </div>
                </div>))}
              </div>);
            })}
          </div>
        ):(<>
          <div className="card p0"><div className="ox"><table className="tbl">
            <thead><tr><th style={{width:22}}></th><th>Material</th><th>Categoría</th><th className="tr">Stock</th><th className="tr">Asignado</th><th className="tr">Déficit</th></tr></thead>
            <tbody>{mfPag.map((m,i,arr)=>(
              <tr key={m.id} className={m.def>0?"ra":""} style={{cursor:"pointer"}} onClick={()=>abrirFicha("mat",m)}>
                <td onClick={e=>e.stopPropagation()} style={{padding:"0.3rem 0.4rem"}}>
                  {/* Icono siempre visible — Kinetik Ops Fase E */}
                  <div className="item-icon-pill-sm" style={{"--pill-color": CAT_COLORS[m.categoria]||"var(--cyan)"}}>
                    <span style={{fontSize:"var(--fs-base)"}}>{CAT_ICONS[m.categoria]||"📦"}</span>
                  </div>
                </td>
                <td className="f6">
                  <div style={{display:"flex",alignItems:"center",gap:".35rem",flexWrap:"wrap"}}>
                    {m.nombre}
                    {m.presupuestoConceptoId && (() => {
                      const conceptoPresu=conceptosPres.find(function(cp){return cp.id===m.presupuestoConceptoId;});
                      return conceptoPresu ? (
                        <button
                          onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("teg-navigate", { detail:{ block:"presupuesto" } })); }}
                          title="Ver en Presupuesto"
                          style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                            padding:".06rem .3rem",borderRadius:10,cursor:"pointer",
                            background:"var(--violet-dim)",color:"var(--violet)",
                            border:"1px solid rgba(167,139,250,.25)"}}>
                          💰 {conceptoPresu.nombre} →
                        </button>
                      ) : null;
                    })()}
                  </div>
                </td>
                <td><span className="badge" style={{background:`${CAT_COLORS[m.categoria]}18`,color:CAT_COLORS[m.categoria],border:`1px solid ${CAT_COLORS[m.categoria]}33`}}>{CAT_ICONS[m.categoria]} {m.categoria}</span></td>
                <td className="tr mono">
                  {m.stock} {m.unidad}
                  {m.stockMinimo > 0 && m.stock < m.stockMinimo && (
                    <span style={{marginLeft:".35rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                      padding:".1rem .35rem",borderRadius:4,
                      background:"var(--red-dim)",color:"var(--red)",fontWeight:700}}>
                      ⚠ bajo mín.
                    </span>
                  )}
                </td>
                <td className="tr mono" style={{color:m.asig>0?"var(--cyan)":"var(--text-muted)"}}>{m.asig} {m.unidad}</td>
                <td className="tr mono">{m.def>0?<span style={{color:"var(--red)",fontWeight:700}}>-{m.def}</span>:<span style={{color:"var(--text-dim)"}}>—</span>}</td>
              </tr>
            ))}</tbody>
          </table></div></div>
          <PagMat />
        </>)}
      </>):(
        <div className="card p0"><div className="ox"><table className="tbl">
          <thead><tr><th>Material</th><th>Puesto destino</th><th className="tr">Cantidad</th><th>Estado</th></tr></thead>
          <tbody>{asigs.map(a=>{const m=material.find(x=>x.id===a.materialId);return(
            <tr key={a.id} style={{cursor:"pointer"}} onClick={()=>abrirFicha("asig",{...a,materialNombre:m?.nombre,unidad:m?.unidad})}>
              <td className="f6">{m?.nombre||"—"}</td>
              <td><span className="pbadge">{a.puesto}</span></td>
              <td className="tr mono">{a.cantidad} {m?.unidad}</td>
              <td onClick={e=>e.stopPropagation()}><select className="isml" value={a.estado} onChange={e=>setAsigs(p=>p.map(x=>x.id===a.id?{...x,estado:e.target.value}:x))} style={{color:ESTADO_COLORES[a.estado]}}>{ESTADO_ENTREGA.map(s=><option key={s} value={s}>{s}</option>)}</select></td>
            </tr>
          );})}
          </tbody>
        </table></div></div>
      )}
    </>
  );
}


// Exports
export { TabMat };
