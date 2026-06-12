// Auto-extracted from Logistica.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";

// ─── DIRECTORIO DE CONTACTOS ─────────────────────────────────────────────────
// Todos los contactos del evento, con tipos personalizables
// Helpers extraídos del scope de TabDirectorio para evitar conflictos
// de minimización de nombres (TDZ) con Rollup en producción.
// Al estar en un scope de módulo separado, Rollup les asigna nombres
// distintos a los de las lambdas internas del componente.
function crearIdTipoContacto(nombre) {
  return nombre.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
}
function filtrarContactosDir(lista, excluidos) {
  return lista.filter(function(contacto) { return !excluidos.includes(contacto.tipo); });
}
function ordenarContactosAlfa(lista) {
  return [...lista].sort(function(ca, cb) {
    return (ca.nombre||"").localeCompare(cb.nombre||"","es");
  });
}
function filtrarContactosPorTipo(lista, tipo) {
  return lista.filter(function(contacto) { return contacto.tipo === tipo; });
}

function TabDirectorio({cont,setCont,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,tiposContacto=[],setTiposContacto}) {
  const [filtroTipo,setFiltroTipo] = useState("todos");
  const [modalTipo,setModalTipo]   = useState(false);
  const [nuevoTipo,setNuevoTipo]   = useState({nombre:"",icono:"🏷️",color:"var(--text-muted)"});
  const [busqCont,setBusqCont]     = useState("");

  const TIPOS_BASE = [
    {id:"emergencia",  nombre:"Emergencia",    icono:"🚨", color:"var(--red)"},
    {id:"medico",      nombre:"Médico",        icono:"🏥", color:"var(--green)"},
    {id:"proveedor",   nombre:"Proveedor",     icono:"🏭", color:"var(--amber)"},
    {id:"staff",       nombre:"Staff",         icono:"👤", color:"var(--cyan)"},
    {id:"institucional",nombre:"Institucional",icono:"🏛️",color:"var(--violet)"},
    {id:"media",       nombre:"Media/Prensa",  icono:"📸", color:"var(--orange)"},
    {id:"voluntario",  nombre:"Voluntario",    icono:"🙋", color:"#818cf8"},
  ];
  const tiposCustom   = Array.isArray(tiposContacto) ? tiposContacto : [];
  const todosLosTipos = [...TIPOS_BASE, ...tiposCustom];
  function getTipo(tkId){return todosLosTipos.find(function(ttItem){return ttItem.id===tkId;})||{nombre:tkId,icono:"🏷️",color:"var(--text-muted)"};}

  // Excluir solo emergencia del directorio (están en la pestaña Emergencias)
  // Médico se muestra en ambos tabs: directorio y emergencias
  const TIPOS_EXCLUIDOS_DIR = ["emergencia"];
  const contDir      = filtrarContactosDir(cont, TIPOS_EXCLUIDOS_DIR);
  const contOrdenado = ordenAlfa ? ordenarContactosAlfa(contDir) : contDir;
  const contFiltradoPorTipo = filtroTipo==="todos" ? contOrdenado : filtrarContactosPorTipo(contOrdenado, filtroTipo);
  const contFiltrado = busqCont.trim()
    ? contFiltradoPorTipo.filter(function(ctDir) {
        var qDir2 = busqCont.toLowerCase();
        return (ctDir.nombre||"").toLowerCase().includes(qDir2)
          || (ctDir.rol||"").toLowerCase().includes(qDir2)
          || (ctDir.telefono||"").toLowerCase().includes(qDir2)
          || (ctDir.email||"").toLowerCase().includes(qDir2);
      })
    : contFiltradoPorTipo;

  const guardarTipo = () => {
    if (!nuevoTipo.nombre.trim()) return;
    const nuevoId = crearIdTipoContacto(nuevoTipo.nombre);
    if (todosLosTipos.find(t=>t.id===nuevoId)) return;
    setTiposContacto(prev=>[...(Array.isArray(prev)?prev:[]),{...nuevoTipo,id:nuevoId}]);
    setNuevoTipo({nombre:"",icono:"🏷️",color:"var(--text-muted)"});
    setModalTipo(false);
    toast.success("Tipo de contacto creado");
  };

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📋 Directorio de Contactos</div>
          <div className="pd">{contDir.length} contacto{contDir.length!==1?"s":""} · Emergencias críticas en pestaña Emergencias</div>
        </div>
        <div style={{display:"flex",gap:".4rem",flexWrap:"wrap"}}>
          <button className="btn btn-ghost btn-sm"
            style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)"}}
            onClick={()=>setModalTipo(true)}>+ Tipo</button>
          <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")}
            onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={()=>setModal({tipo:"cont"})}>+ Contacto</button>
        </div>
      </div>

      {/* Filtros por tipo */}
      <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",marginBottom:".65rem"}}>
        <button onClick={()=>setFiltroTipo("todos")}
          style={{padding:".2rem .55rem",borderRadius:20,cursor:"pointer",
            fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
            border:`1px solid ${filtroTipo==="todos"?"var(--cyan)":"var(--border)"}`,
            background:filtroTipo==="todos"?"var(--cyan-dim)":"transparent",
            color:filtroTipo==="todos"?"var(--cyan)":"var(--text-muted)"}}>
          Todos ({contDir.length})
        </button>
        {todosLosTipos.filter(t=>!TIPOS_EXCLUIDOS_DIR.includes(t.id)).map(t => {
          const n = contDir.filter(c=>c.tipo===t.id).length;
          if (!n) return null;
          return (
            <button key={t.id} onClick={()=>setFiltroTipo(filtroTipo===t.id?"todos":t.id)}
              style={{padding:".2rem .55rem",borderRadius:20,cursor:"pointer",
                fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                border:`1px solid ${filtroTipo===t.id?t.color:t.color+"55"}`,
                background:filtroTipo===t.id?t.color+"20":"transparent",
                color:filtroTipo===t.id?t.color:t.color+"cc",
                display:"flex",alignItems:"center",gap:".25rem"}}>
              {t.icono} {t.nombre}
              <span style={{background:t.color+"30",padding:"0 .3rem",borderRadius:10}}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* Tipos personalizados activos */}
      {tiposCustom.length > 0 && (
        <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",marginBottom:".5rem",
          padding:".35rem .6rem",background:"var(--surface2)",borderRadius:6,
          border:"1px solid var(--border)"}}>
          <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
            color:"var(--text-dim)",alignSelf:"center"}}>Tipos propios:</span>
          {tiposCustom.map(t=>(
            <span key={t.id} style={{display:"inline-flex",alignItems:"center",gap:".25rem",
              padding:".12rem .45rem",borderRadius:20,
              background:t.color+"18",color:t.color,
              border:`1px solid ${t.color}33`,fontFamily:"var(--font-mono)",
              fontSize:"var(--fs-xs)",fontWeight:700}}>
              {t.icono} {t.nombre}
              <button onClick={()=>setTiposContacto(function(tcPrev){return(Array.isArray(tcPrev)?tcPrev:[]).filter(function(tcItm){return tcItm.id!==t.id;});})}
                style={{background:"none",border:"none",cursor:"pointer",
                  color:"var(--text-dim)",fontSize:"var(--fs-xs)",padding:0,lineHeight:1}}>✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Grid de contactos */}
      {contFiltrado.length === 0 ? (
        <div className="card" style={{textAlign:"center",padding:"2rem",
          color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}>
          Sin contactos{filtroTipo!=="todos"?` de tipo "${getTipo(filtroTipo).nombre}"`:""}
        </div>
      ) : (
        <div className="item-grid" style={{"--item-minw": "260px"}}>
          {contFiltrado.map(citem=>{
            const t = getTipo(citem.tipo);
            return (
              <div key={citem.id} className="item-card item-card--top"
                style={{"--item-accent":t.color,cursor:"pointer"}}
                onClick={()=>abrirFicha("cont",citem)}>
                <div className="cch">
                  <div className="ccti" style={{fontSize:"var(--fs-lg)"}}>{t.icono}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="ccn">{citem.nombre}</div>
                    <div className="ccr">{citem.rol}</div>
                  </div>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                    padding:".1rem .35rem",borderRadius:10,flexShrink:0,
                    background:t.color+"18",color:t.color,border:`1px solid ${t.color}33`}}>
                    {t.nombre}
                  </span>
                </div>
                <div className="ccd">
                  <a href={`tel:${citem.telefono}`} className="ctel">📞 {citem.telefono}</a>
                  {citem.email&&<a href={`mailto:${citem.email}`} className="ceml">✉️ {citem.email}</a>}
                </div>
                {citem.web&&<div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",marginTop:".2rem"}}>
                  <a href={citem.web} target="_blank" rel="noreferrer"
                    style={{color:"var(--cyan)",textDecoration:"none"}}
                    onClick={e=>e.stopPropagation()}>🌐 {citem.web}</a>
                </div>}
                {citem.notas&&<div className="cnota">{citem.notas}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuevo tipo personalizado */}
      {modalTipo && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModalTipo(false)}>
          <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:360}}>
            <div className="modal-header">
              <span className="modal-title">🏷️ Nuevo tipo de contacto</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setModalTipo(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body" style={{gap:".5rem"}}>
              <div>
                <label className="fl">Nombre *</label>
                <input className="inp" placeholder="ej. Federación, Media, Patrocinador..."
                  value={nuevoTipo.nombre}
                  onChange={e=>setNuevoTipo(p=>({...p,nombre:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&guardarTipo()} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem"}}>
                <div>
                  <label className="fl">Emoji / Icono</label>
                  <input className="inp" placeholder="🏷️" maxLength={4}
                    value={nuevoTipo.icono}
                    onChange={e=>setNuevoTipo(p=>({...p,icono:e.target.value}))} />
                </div>
                <div>
                  <label className="fl">Color</label>
                  <div style={{display:"flex",gap:".35rem",alignItems:"center"}}>
                    <input type="color" value={nuevoTipo.color}
                      onChange={e=>setNuevoTipo(p=>({...p,color:e.target.value}))}
                      style={{width:36,height:32,border:"1px solid var(--border)",
                        borderRadius:6,cursor:"pointer",background:"none",padding:2}} />
                    <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                      color:"var(--text-muted)"}}>{nuevoTipo.color}</span>
                  </div>
                </div>
              </div>
              <div style={{padding:".4rem .6rem",borderRadius:6,
                background:"var(--surface2)",border:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  color:"var(--text-muted)",marginRight:".4rem"}}>Vista previa:</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                  padding:".12rem .45rem",borderRadius:20,
                  background:nuevoTipo.color+"20",color:nuevoTipo.color,
                  border:`1px solid ${nuevoTipo.color}44`}}>
                  {nuevoTipo.icono} {nuevoTipo.nombre||"Mi tipo"}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModalTipo(false)}>Cancelar</button>
              <button className="btn btn-primary"
                disabled={!nuevoTipo.nombre.trim()}
                style={{opacity:nuevoTipo.nombre.trim()?1:.5}}
                onClick={guardarTipo}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// Exports
export { filtrarContactosDir };
export { ordenarContactosAlfa };
export { filtrarContactosPorTipo };
export { TabDirectorio };
