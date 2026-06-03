// Auto-extracted from Logistica.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ListaKanbanToggle } from "@/components/common/ListaKanbanToggle";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";

// ─── VEHÍCULOS ────────────────────────────────────────────────────────────────

/** Construye la descripción de material de una parada a partir de asigIds.
 *  Si asigIds existe y no está vacío, resuelve contra asigs+material (inventario real).
 *  Fallback: campo material de texto libre.
 */
function buildMaterialLabel(parada, asigs = [], material = []) {
  if (!parada.asigIds || parada.asigIds.length === 0) return parada.material || "";
  const partes = parada.asigIds
    .map(id => {
      const asig = asigs.find(a => a.id === id);
      if (!asig) return null;
      const mat = material.find(m => m.id === asig.materialId);
      const nombre = mat ? mat.nombre : `Material #${asig.materialId}`;
      return `${nombre} x${asig.cantidad}`;
    })
    .filter(Boolean);
  return partes.length > 0 ? partes.join(", ") : (parada.material || "");
}

function TabVeh({veh,setVeh,rutas,setRutas,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,abrirModal,voluntariosConCoche=[],material=[],asigs=[]}) {
  const [vistaKanban,setVistaKanban]=useState(false);
  const [vehColapsado,setVehCol]=useState(true); // colapsado por defecto
  const [rutasColapsadas,setRutasCol]=useState(true); // colapsado por defecto
  const [poolColapsado,setPoolCol]=useState(true); // colapsado por defecto
  const [busqVeh,setBusqVeh]=useState("");
  const moverVeh=(id,dir)=>{
    if(ordenAlfa) return;
    setVeh(prev=>{const arr=[...prev];const i=arr.findIndex(x=>x.id===id);const j=i+dir;if(j<0||j>=arr.length)return arr;[arr[i],arr[j]]=[arr[j],arr[i]];return arr;});
  };
  const vehOrdenado=useMemo(()=>{let list=ordenAlfa?[...veh].sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es")):veh;if(busqVeh.trim()){const q=busqVeh.toLowerCase();list=list.filter(v=>(v.nombre||"").toLowerCase().includes(q)||(v.matricula||"").toLowerCase().includes(q)||(v.conductor||"").toLowerCase().includes(q));}return list;},[veh,ordenAlfa,busqVeh]);
  return(
    <>
      <div className="ph">
        <div><div className="pt">🚗 Vehículos y Rutas</div><div className="pd">{veh.length} vehículos · {rutas.length} rutas</div></div>
        <div className="fr g1">
          <ListaKanbanToggle vistaKanban={vistaKanban} setVistaKanban={setVistaKanban} />
          <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <input type="search" className="inp inp-sm"
            placeholder="Buscar vehículo…"
            value={busqVeh} onChange={e=>setBusqVeh(e.target.value)}
            style={{maxWidth:150,fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}
          />
          <button className="btn btn-primary" onClick={()=>abrirModal({tipo:"veh"})}>+ Vehículo</button>
          <button className="btn btn-amber" onClick={()=>abrirModal({tipo:"ruta"})}>+ Ruta</button>
        </div>
      </div>
      {vistaKanban?(
        <div className="k-grid" style={{gridTemplateColumns:"repeat(2,1fr)"}}>
          <div className="k-col">
            <div className="k-col-hdr" style={{borderTopColor:"var(--cyan)"}}>
              <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color:"var(--cyan)"}}>🚐 Flota</span>
              <span className="k-col-cnt" style={{background:"var(--cyan-dim)",color:"var(--cyan)",border:"1px solid rgba(34,211,238,.3)"}}>{veh.length}</span>
            </div>
            {vehOrdenado.map(v=>(<div key={v.id} className="k-card" style={{borderLeftColor:"var(--cyan)",cursor:"pointer"}} onClick={()=>abrirFicha("veh",v)}>
              <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".2rem"}}>{v.nombre}</div>
              <div className="mono xs muted">{v.matricula} · {v.conductor}</div>
              <div className="mono xs" style={{color:"var(--text-muted)",marginTop:".15rem"}}>{v.capacidad}</div>
              {v.notas&&<div style={{fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".2rem",fontStyle:"italic"}}>{v.notas}</div>}
            </div>))}

            {/* SECCIÓN VEHÍCULOS VOLUNTARIOS (POOL) */}
            {voluntariosConCoche.length > 0 && (
              <div style={{marginTop:"1.2rem"}}>
                <div className="k-col-hdr" style={{borderTopColor:"var(--violet)",background:"transparent",padding:"0.6rem 0.2rem"}}>
                  <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color:"var(--violet)"}}>🙋‍♂️ Pool Voluntarios</span>
                  <span className="k-col-cnt" style={{background:"var(--violet-dim)",color:"var(--violet)",border:"1px solid rgba(167,139,250,.3)"}}>{voluntariosConCoche.length}</span>
                </div>
                {voluntariosConCoche.map(vol => (
                  <div key={vol.id} className="k-card" style={{borderLeftColor:"var(--violet)",background:"var(--violet-dim)"}}>
                    <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".2rem"}}>{vol.nombre}</div>
                    <div className="mono xs muted">{vol.cocheMatricula ? `🚙 ${vol.cocheMatricula}` : "🚙 Vehículo propio"}{vol.cochePlazas ? ` · ${vol.cochePlazas} plazas` : ""}</div>
                    <a href={`tel:${vol.telefono}`} style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--violet)",textDecoration:"none"}}>📞 {vol.telefono}</a>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="k-col">
            <div className="k-col-hdr" style={{borderTopColor:"var(--amber)"}}>
              <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color:"var(--amber)"}}>🗺️ Rutas</span>
              <span className="k-col-cnt" style={{background:"var(--amber-dim)",color:"var(--amber)",border:"1px solid rgba(251,191,36,.3)"}}>{rutas.length}</span>
            </div>
            {rutas.map(r=>{const v=veh.find(x=>x.id===r.vehiculoId);return(<div key={r.id} className="k-card" style={{borderLeftColor:"var(--amber)",cursor:"pointer"}} onClick={()=>abrirFicha("ruta",r)}>
              <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".2rem"}}>{r.nombre}</div>
              <div className="mono xs muted">🚐 {v?.nombre||"—"} · 🕐 {r.horaInicio}</div>
              <div style={{fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".2rem"}}>{(r.paradas||[]).length} paradas</div>
            </div>);})}
          </div>
        </div>
      ):(
        <div className="twocol">
          <div>
            {/* Flota colapsable */}
            <button onClick={()=>setVehCol(v=>!v)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:".5rem",
                padding:".45rem .65rem",marginBottom:".4rem",background:"var(--surface2)",
                border:"1px solid var(--border)",borderRadius:"var(--r-sm)",cursor:"pointer",textAlign:"left"}}>
              <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:"var(--fs-sm)",flex:1}}>🚐 Flota de vehículos</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--cyan)",
                padding:".06rem .35rem",borderRadius:20,background:"var(--cyan-dim)"}}>{veh.length}</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-dim)",
                transform:vehColapsado?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
            </button>
            {!vehColapsado && vehOrdenado.map((v,i,arr)=>(
              <div key={v.id} className="card vcard" style={{cursor:"pointer"}} onClick={()=>abrirFicha("veh",v)}>
                <div className="vh">
                  {!ordenAlfa&&<div className="log-reorder" onClick={e=>e.stopPropagation()}><span onClick={()=>moverVeh(v.id,-1)} style={{opacity:i===0?.2:1}}>▲</span><span onClick={()=>moverVeh(v.id,+1)} style={{opacity:i===arr.length-1?.2:1}}>▼</span></div>}
                  <div className="vi">🚐</div>
                  <div style={{flex:1}}><div className="vn">{v.nombre}</div><div className="vm mono">{v.matricula}</div></div>
                </div>
                <div className="vmeta"><span>👤 {v.conductor}</span><span>📦 {v.capacidad}</span><span>📞 {v.telefono}</span></div>
                {v.notas&&<div className="vnota">{v.notas}</div>}
              </div>
            ))}

            {/* SECCIÓN VEHÍCULOS VOLUNTARIOS (POOL) — LISTA */}
            {voluntariosConCoche.length > 0 && (
              <div style={{marginTop:"1rem"}}>
                <button onClick={()=>setPoolCol(v=>!v)}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:".5rem",
                    padding:".45rem .65rem",marginBottom:".4rem",background:"var(--violet-dim)",
                    border:"1px solid rgba(167,139,250,.25)",borderRadius:"var(--r-sm)",cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:"var(--fs-sm)",color:"var(--violet)",flex:1}}>🙋‍♂️ Pool de Voluntarios</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--violet)",
                    padding:".06rem .35rem",borderRadius:20,background:"rgba(167,139,250,.15)"}}>{voluntariosConCoche.length}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"rgba(167,139,250,.5)",
                    transform:poolColapsado?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
                </button>
                {!poolColapsado && <>
                {voluntariosConCoche.map(vol => (
                  <div key={vol.id} className="card vcard" style={{borderLeft:"2px solid var(--violet)",background:"var(--violet-dim)"}}>
                    <div className="vh" style={{marginBottom:"0.5rem"}}>
                      <div className="vi" style={{color:"var(--violet)"}}>🚙</div>
                      <div style={{flex:1}}><div className="vn">{vol.nombre}</div><div className="vm mono" style={{color:"var(--violet)"}}>{vol.cocheMatricula ? vol.cocheMatricula : "Vehículo propio"}{vol.cochePlazas ? ` · ${vol.cochePlazas} plazas` : ""}</div></div>
                      <a href={`tel:${vol.telefono}`} className="btn btn-sm" style={{background:"var(--violet-dim)",color:"var(--violet)"}}>📞 Llamar</a>
                    </div>
                  </div>
                ))}
                </>}
              </div>
            )}
          </div>
          <div>
            {/* Rutas colapsable */}
            <button onClick={()=>setRutasCol(v=>!v)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:".5rem",
                padding:".45rem .65rem",marginBottom:".4rem",background:"var(--surface2)",
                border:"1px solid var(--border)",borderRadius:"var(--r-sm)",cursor:"pointer",textAlign:"left"}}>
              <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:"var(--fs-sm)",flex:1}}>🗺️ Rutas de reparto</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--amber)",
                padding:".06rem .35rem",borderRadius:20,background:"var(--amber-dim)"}}>{rutas.length}</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-dim)",
                transform:rutasColapsadas?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
            </button>
            {!rutasColapsadas && <>
            {rutas.map(r=>{const v=veh.find(x=>x.id===r.vehiculoId);return(
              <div key={r.id} className="card rcard" style={{cursor:"pointer"}} onClick={()=>abrirFicha("ruta",r)}>
                <div className="rh">
                  <div><div className="rn">{r.nombre}</div><div className="rm mono">🚐 {v?.nombre||"—"} · 🕐 {r.horaInicio}</div></div>
                </div>
                <div className="plist">{(r.paradas||[]).map((p,i)=>(
                  <div key={i} className="prow">
                    <div className="pcon"><div className="pdot"/>{i<(r.paradas||[]).length-1&&<div className="pline"/>}</div>
                    <div className="pcont">
                      <div className="ptop"><span className="pnom">{p.puesto}</span><span className="phora mono">{p.hora}</span></div>
                      <div className="pmat">{buildMaterialLabel(p,asigs,material)}</div>
                    </div>
                  </div>
                ))}</div>
              </div>
            );})}
            </>}
          </div>
        </div>
      )}
    </>
  );
}


// Exports
export { TabVeh };
