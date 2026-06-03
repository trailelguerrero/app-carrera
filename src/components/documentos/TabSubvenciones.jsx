/**
 * TabSubvenciones.jsx — MEJ-23
 *
 * Subcomponente autónomo extraído de Documentos.jsx.
 * Gestiona la sección "Subvenciones" con su estado propio:
 *   - Lista de subvenciones con KPIs
 *   - Modal de nueva/editar subvención
 *
 * Props recibidas del orquestador (Documentos.jsx):
 *   subvenciones, saveSubvenciones   — datos y persistencia (con sync a Presupuesto)
 *   setDelConfirm                    — modal de confirmación compartido
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import {
  ESTADOS_SUBVENCION, ORGANISMOS_SUBVENCION, getSvEstado,
  SUBVENCION_EMPTY, formatImporte, formatDate,
} from "@/constants/documentosConstants";

export default function TabSubvenciones({ subvenciones, saveSubvenciones, setDelConfirm }) {
  const [svModal,  setSvModal]  = useState(false);
  const [svForm,   setSvForm]   = useState({ ...SUBVENCION_EMPTY });
  const [svEditId, setSvEditId] = useState(null);

  const totalSolicitado = subvenciones.reduce((s,sv) => s + (parseFloat(String(sv.importeSolicitado||"").replace(",",".")) || 0), 0);
  const totalConcedido  = subvenciones.filter(sv => ["concedida","justificada","cerrada"].includes(sv.estado))
    .reduce((s,sv) => s + (parseFloat(String(sv.importeConcedido||"").replace(",",".")) || 0), 0);

  return (
    <>
      {/* ── SECCIÓN SUBVENCIONES ── */}
      <div style={{marginTop:"1rem"}}>
        {/* Cabecera */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem",paddingBottom:".6rem",borderBottom:"2px solid rgba(52,211,153,0.2)"}}>
          <div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"var(--fs-md)",color:"#34d399",display:"flex",alignItems:"center",gap:".5rem"}}>
              🏅 Subvenciones
            </div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".15rem"}}>
              Solicitudes y resoluciones · se sincroniza con Presupuesto
            </div>
          </div>
          <div style={{display:"flex",gap:".5rem",alignItems:"center",flexWrap:"wrap"}}>
            {totalConcedido > 0 && (
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,color:"#34d399",background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.25)",borderRadius:20,padding:".15rem .55rem"}}>
                ✅ {formatImporte(totalConcedido)} concedidos
              </span>
            )}
            {totalSolicitado > 0 && totalSolicitado !== totalConcedido && (
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#60a5fa",background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.25)",borderRadius:20,padding:".15rem .55rem"}}>
                📤 {formatImporte(totalSolicitado)} solicitados
              </span>
            )}
            <button className="btn btn-primary btn-sm" onClick={()=>{
              setSvForm({...SUBVENCION_EMPTY}); setSvEditId(null); setSvModal(true);
            }}>+ Nueva subvención</button>
          </div>
        </div>

        {/* Lista */}
        {subvenciones.length === 0 ? (
          <div style={{textAlign:"center",padding:"2rem",color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}>
            <div style={{fontSize:"2rem",marginBottom:".5rem"}}>🏅</div>
            <div>Sin subvenciones registradas</div>
            <div style={{fontSize:"var(--fs-xs)",marginTop:".25rem"}}>Añade subvenciones para hacer seguimiento y sincronizarlas con el Presupuesto</div>
          </div>
        ) : subvenciones.map(sv => {
          const est = getSvEstado(sv.estado);
          const impSol = parseFloat(String(sv.importeSolicitado||"").replace(",",".")) || 0;
          const impConc = parseFloat(String(sv.importeConcedido||"").replace(",",".")) || 0;
          const isConcedida = ["concedida","justificada","cerrada"].includes(sv.estado);
          return (
            <div key={sv.id} className="card mb" style={{padding:"1rem",border:isConcedida?"1px solid rgba(52,211,153,0.3)":undefined}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:".75rem",flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:"var(--fs-base)",display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
                    <span>{sv.nombre}</span>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:est.color,background:est.bg,border:`1px solid ${est.color}44`,borderRadius:20,padding:".1rem .45rem",whiteSpace:"nowrap"}}>
                      {est.icon} {est.label}
                    </span>
                    {isConcedida && impConc > 0 && (
                      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",fontWeight:700,color:"#34d399"}}>
                        💶 {formatImporte(impConc)}
                      </span>
                    )}
                  </div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".2rem",display:"flex",gap:".75rem",flexWrap:"wrap"}}>
                    <span>🏢 {sv.organismo}</span>
                    {sv.convocatoria && <span>📌 {sv.convocatoria}</span>}
                    {sv.responsable && <span>👤 {sv.responsable}</span>}
                  </div>
                  <div style={{display:"flex",gap:".75rem",marginTop:".35rem",flexWrap:"wrap"}}>
                    {impSol > 0 && !isConcedida && (
                      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#60a5fa"}}>📤 Solicitado: {formatImporte(impSol)}</span>
                    )}
                    {impSol > 0 && isConcedida && (
                      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>Solicitado: {formatImporte(impSol)}</span>
                    )}
                  </div>
                  <div style={{display:"flex",gap:".75rem",marginTop:".25rem",flexWrap:"wrap"}}>
                    {sv.fechaConvocatoria && <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>📅 Conv: {formatDate(sv.fechaConvocatoria)}</span>}
                    {sv.fechaSolicitud    && <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#38bdf8"}}>📤 Sol: {formatDate(sv.fechaSolicitud)}</span>}
                    {sv.fechaResolucion   && <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#34d399"}}>✅ Res: {formatDate(sv.fechaResolucion)}</span>}
                    {sv.fechaJustificacion && <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#a78bfa"}}>📋 Just: {formatDate(sv.fechaJustificacion)}</span>}
                  </div>
                  {sv.nota && <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".35rem",fontStyle:"italic"}}>{sv.nota}</div>}
                  {sv.url && <a href={sv.url} target="_blank" rel="noreferrer" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#38bdf8",display:"block",marginTop:".25rem"}}>🔗 Ver convocatoria</a>}
                </div>
                <div style={{display:"flex",gap:".4rem",flexShrink:0}}>
                  <button className="btn btn-ghost btn-sm" title="Editar" onClick={()=>{
                    setSvForm({
                      id:sv.id, nombre:sv.nombre, organismo:sv.organismo||"Ayuntamiento",
                      convocatoria:sv.convocatoria||"", importeSolicitado:sv.importeSolicitado||"",
                      importeConcedido:sv.importeConcedido||"", fechaConvocatoria:sv.fechaConvocatoria||"",
                      fechaSolicitud:sv.fechaSolicitud||"", fechaResolucion:sv.fechaResolucion||"",
                      fechaJustificacion:sv.fechaJustificacion||"", estado:sv.estado,
                      nota:sv.nota||"", url:sv.url||"", responsable:sv.responsable||"", docIds:sv.docIds||[],
                    });
                    setSvEditId(sv.id); setSvModal(true);
                  }}>✏️</button>
                  <button className="btn btn-ghost btn-sm" title="Eliminar" onClick={()=>setDelConfirm({id:sv.id,nombre:sv.nombre,esSubvencion:true})}>🗑</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal subvención ── */}
      {svModal && createPortal(
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setSvModal(false)}>
          <div className="modal modal-ficha" style={{maxWidth:520}}>
            <div className="modal-header">
              <span className="modal-title">🏅 {svEditId ? "Editar subvención" : "Nueva subvención"}</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setSvModal(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body" style={{gap:".65rem"}}>
              <div>
                <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Nombre *</label>
                <input autoFocus className="inp" value={svForm.nombre} onChange={e=>setSvForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Subvención Diputación Provincial 2026" />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Organismo</label>
                  <select className="inp" value={svForm.organismo} onChange={e=>setSvForm(p=>({...p,organismo:e.target.value}))}>
                    {ORGANISMOS_SUBVENCION.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Estado</label>
                  <select className="inp" value={svForm.estado} onChange={e=>setSvForm(p=>({...p,estado:e.target.value}))}
                    style={{color:getSvEstado(svForm.estado).color}}>
                    {ESTADOS_SUBVENCION.map(e=><option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Nombre de la convocatoria</label>
                <input className="inp" value={svForm.convocatoria} onChange={e=>setSvForm(p=>({...p,convocatoria:e.target.value}))} placeholder="Ej: Plan de Fomento del Deporte 2026" />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"#60a5fa",display:"block",marginBottom:".3rem"}}>📤 Importe solicitado (€)</label>
                  <input className="inp" type="number" min="0" step="0.01" value={svForm.importeSolicitado} onChange={e=>setSvForm(p=>({...p,importeSolicitado:e.target.value}))} placeholder="0.00" />
                </div>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"#34d399",display:"block",marginBottom:".3rem"}}>✅ Importe concedido (€)</label>
                  <input className="inp" type="number" min="0" step="0.01" value={svForm.importeConcedido} onChange={e=>setSvForm(p=>({...p,importeConcedido:e.target.value}))} placeholder="0.00" />
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>📅 Fecha convocatoria</label>
                  <input className="inp" type="date" value={svForm.fechaConvocatoria} onChange={e=>setSvForm(p=>({...p,fechaConvocatoria:e.target.value}))} />
                </div>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"#38bdf8",display:"block",marginBottom:".3rem"}}>📤 Fecha solicitud</label>
                  <input className="inp" type="date" value={svForm.fechaSolicitud} onChange={e=>setSvForm(p=>({...p,fechaSolicitud:e.target.value}))} />
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"#34d399",display:"block",marginBottom:".3rem"}}>✅ Fecha resolución</label>
                  <input className="inp" type="date" value={svForm.fechaResolucion} onChange={e=>setSvForm(p=>({...p,fechaResolucion:e.target.value}))} />
                </div>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"#a78bfa",display:"block",marginBottom:".3rem"}}>📋 Fecha justificación</label>
                  <input className="inp" type="date" value={svForm.fechaJustificacion} onChange={e=>setSvForm(p=>({...p,fechaJustificacion:e.target.value}))} />
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Responsable</label>
                  <input className="inp" value={svForm.responsable} onChange={e=>setSvForm(p=>({...p,responsable:e.target.value}))} placeholder="Nombre del responsable…" />
                </div>
                <div>
                  <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>URL convocatoria</label>
                  <input className="inp" value={svForm.url} onChange={e=>setSvForm(p=>({...p,url:e.target.value}))} placeholder="https://…" />
                </div>
              </div>
              <div>
                <label style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)",display:"block",marginBottom:".3rem"}}>Notas</label>
                <textarea className="inp" rows={3} value={svForm.nota} onChange={e=>setSvForm(p=>({...p,nota:e.target.value}))}
                  placeholder="Requisitos, documentación necesaria, observaciones…" style={{resize:"vertical"}} />
              </div>
              {(["concedida","justificada","cerrada"].includes(svForm.estado)) && (
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#34d399",background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:8,padding:".5rem .75rem"}}>
                  💡 Al guardar, el importe concedido se sincronizará automáticamente con <strong>Presupuesto → Ingresos extra → Subvención entidad pública</strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setSvModal(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={!svForm.nombre.trim()} style={{opacity:svForm.nombre.trim()?1:.5}}
                onClick={()=>{
                  if (!svForm.nombre.trim()) return;
                  if (svEditId) {
                    saveSubvenciones(subvenciones.map(sv => sv.id === svEditId ? { ...svForm } : sv));
                    toast.success("Subvención actualizada");
                  } else {
                    saveSubvenciones([...subvenciones, { ...svForm, id: "sv" + Date.now(), fechaSubida: new Date().toISOString() }]);
                    toast.success("Subvención añadida");
                  }
                  setSvModal(false);
                }}>
                {svEditId ? "Guardar cambios" : "Crear subvención"}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
