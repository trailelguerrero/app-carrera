/**
 * Modales.jsx — Tarea 3.3
 * Modales de tarea, hito y persona del módulo Proyecto.
 */
import { useState, useEffect, useRef } from "react";
import { useModalClose } from "@/hooks/useModalClose";
import { blockCls as cls } from "@/lib/blockStyles";
import { genIdNum } from "@/lib/utils";
import { fmt, diasHasta, AREAS, ESTADOS, PRIORIDADES, EST_CFG, PRI_CFG, getArea, iniciales } from "./proyectoConstants";

function validarTarea(formData) {
  const validation = {};
  if (!formData.titulo.trim()) validation.titulo = "Requerido";
  return validation;
}

// ─── QUICK CREATE TAREA ───────────────────────────────────────────────────────
function QuickCreateTarea({ onSave, onClose, areas=AREAS, prefillArea="" }) {
  const [titulo,     setTitulo]     = useState("");
  const [area,       setArea]       = useState(prefillArea || areas[0]?.id || "permisos");
  const [fechaLimite,setFechaLimite]= useState("");
  const [err,        setErr]        = useState("");
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60); }, []);

  const handleSave = () => {
    if (!titulo.trim()) { setErr("El título es obligatorio"); return; }
    onSave({
      area, titulo: titulo.trim(), fechaLimite,
      estado: "pendiente", prioridad: "media",
      responsableId: null, notas: "", dependeDe: null, documentoId: null,
    });
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:420}}>
        <div className="modal-header">
          <span className="modal-title">⚡ Nueva tarea rápida</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{display:"flex",flexDirection:"column",gap:".75rem"}}>
          <div>
            <label className="fl">Título *</label>
            <input ref={inputRef} className={"inp"+(err?" inp-error":"")}
              placeholder="¿Qué hay que hacer?"
              value={titulo} onChange={e=>{setTitulo(e.target.value);setErr("");}} />
            {err && <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--red)",marginTop:".2rem"}}>⚠ {err}</div>}
          </div>
          <div>
            <label className="fl">Área</label>
            <select className="inp" value={area} onChange={e=>setArea(e.target.value)}>
              {areas.map(a => <option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="fl">Fecha límite</label>
            <input type="date" className="inp" value={fechaLimite}
              onChange={e=>setFechaLimite(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-cyan" onClick={handleSave}>⚡ Crear tarea</button>
        </div>
      </div>
    </div>
  );
}

function ModalTarea({
 data, prefill={}, equipo, tareas, documentos, onSave, onClose }) {
  const [form, setForm] = useState(data || {
    area: prefill.area || "permisos",
    titulo: prefill.titulo || "",
    responsableId: equipo[0]?.id || 1,
    fechaLimite: prefill.fechaLimite || "",
    estado: "pendiente", prioridad: "media",
    notas: prefill.notas || "",
    dependeDe: null, documentoId: null,
  });
  const [err, setErr] = useState({});
  const upd = (fkey, fval) => setForm(prev => ({...prev,[fkey]:fval}));
  const posiblesDeps = tareas.filter(td => td.id !== form.id && td.area === form.area);

  const submit = () => {
    const validation = validarTarea(form);
    setErr(validation);
    if (!Object.keys(validation).length) onSave({...form, responsableId:parseInt(form.responsableId), dependeDe:form.dependeDe?parseInt(form.dependeDe):null, documentoId:form.documentoId||null});
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <span className="mtit">{data?"✏️ Editar tarea":"➕ Nueva tarea"}</span>
          <button className="btn btn-sm btn-ghost" aria-label="Cerrar formulario de tarea" onClick={onClose}><span aria-hidden="true">✕</span></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="fl" style={{color:err.titulo?"#f87171":undefined}}>Título de la tarea *</label>
            <input className="inp" autoFocus value={form.titulo} onChange={e=>upd("titulo",e.target.value)} placeholder="Describe la tarea..." />
            {err.titulo && <div className="mono xs" style={{color:"#f87171",marginTop:".2rem"}}>⚠ {err.titulo}</div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
            <div>
              <label className="fl">Área</label>
              <select className="inp" value={form.area} onChange={e=>upd("area",e.target.value)}>
                {AREAS.map(a=><option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="fl">Responsable</label>
              <select className="inp" value={form.responsableId} onChange={e=>upd("responsableId",parseInt(e.target.value))}>
                {equipo.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:".75rem"}}>
            <div>
              <label className="fl">Fecha límite</label>
              <input className="inp" type="date" value={form.fechaLimite||""} onChange={e=>upd("fechaLimite",e.target.value)}/>
            </div>
            <div>
              <label className="fl">Estado</label>
              <select className="inp" value={form.estado} onChange={e=>upd("estado",e.target.value)} style={{color:EST_CFG[form.estado].color}}>
                {ESTADOS.map(s=><option key={s} value={s}>{EST_CFG[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="fl">Prioridad</label>
              <select className="inp" value={form.prioridad} onChange={e=>upd("prioridad",e.target.value)} style={{color:PRI_CFG[form.prioridad].color}}>
                {PRIORIDADES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {posiblesDeps.length > 0 && (
            <div>
              <label className="fl">Depende de (misma área)</label>
              <select className="inp" value={form.dependeDe||""} onChange={e=>upd("dependeDe",e.target.value||null)}>
                <option value="">Sin dependencia</option>
                {posiblesDeps.map(t=><option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="fl">Enlace a Documento (opcional)</label>
            <select className="inp" value={form.documentoId||""} onChange={e=>upd("documentoId",e.target.value||null)}>
              <option value="">Ninguno</option>
              {(() => {
                const docs  = (documentos||[]).filter(d => !String(d.id).startsWith('gestion'));
                const gests = (documentos||[]).filter(d =>  String(d.id).startsWith('gestion'));
                return (<>
                  {docs.length > 0 && <optgroup label="📄 Documentos">
                    {docs.map(d=><option key={d.id} value={d.id}>{d.nombreDisplay||d.nombre}</option>)}
                  </optgroup>}
                  {gests.length > 0 && <optgroup label="🏛️ Gestiones legales">
                    {gests.map(d=><option key={d.id} value={d.id}>{d.nombre||d.titulo}</option>)}
                  </optgroup>}
                </>);
              })()}
            </select>
          </div>
          <div>
            <label className="fl">Notas / Descripción</label>
            <textarea className="inp" rows={3} value={form.notas||""} onChange={e=>upd("notas",e.target.value)}
              placeholder="Contexto, detalles, links relevantes..." style={{resize:"vertical"}}/>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>{data?"💾 Guardar":"➕ Crear tarea"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL HITO ───────────────────────────────────────────────────────────────
function ModalHito({
 data, onSave, onClose }) {
  const firstInputRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => firstInputRef.current?.focus(), 60); return () => clearTimeout(t); }, []);
  const [form, setForm] = useState(data || {nombre:"", fecha:"", critico:false, completado:false});
  const [err, setErr] = useState({});
  const upd = (fkey, fval) => setForm(prev=>({...prev,[fkey]:fval}));
  const submit = () => {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre="Requerido";
    if (!form.fecha) errs.fecha="Requerido";
    setErr(errs);
    if (!Object.keys(errs).length) onSave(form);
  };
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:420}}>
        <div className="modal-header"><span className="mtit">{data?"✏️ Editar hito":"🏁 Nuevo hito"}</span><button className="btn btn-sm btn-ghost" aria-label="Cerrar formulario de tarea" onClick={onClose}><span aria-hidden="true">✕</span></button></div>
        <div className="modal-body">
          <div>
            <label className="fl" style={{color:err.nombre?"#f87171":undefined}}>Nombre del hito *</label>
            <input ref={firstInputRef} className="inp" autoFocus value={form.nombre} onChange={e=>upd("nombre",e.target.value)} placeholder="Ej: Apertura de inscripciones"/>
            {err.nombre && <div className="mono xs" style={{color:"#f87171",marginTop:".2rem"}}>⚠ {err.nombre}</div>}
          </div>
          <div>
            <label className="fl" style={{color:err.fecha?"#f87171":undefined}}>Fecha *</label>
            <input className="inp" type="date" value={form.fecha} onChange={e=>upd("fecha",e.target.value)}/>
            {err.fecha && <div className="mono xs" style={{color:"#f87171",marginTop:".2rem"}}>⚠ {err.fecha}</div>}
          </div>
          <div style={{display:"flex",gap:"1rem"}}>
            {[["critico","🔴 Hito crítico"],["completado","✅ Completado"]].map(([k,l])=>(
              <label key={k} style={{display:"flex",alignItems:"center",gap:".5rem",cursor:"pointer",fontSize:"var(--fs-base)"}}>
                <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${form[k]?"#22d3ee":"var(--border)"}`,background:form[k]?"#22d3ee":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .15s"}}
                  onClick={()=>upd(k,!form[k])}>
                  {form[k]&&<span style={{color:"#000",fontSize:"var(--fs-sm)",fontWeight:800}}>✓</span>}
                </div>
                {l}
              </label>
            ))}
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={submit}>{data?"💾 Guardar":"➕ Crear"}</button></div>
      </div>
    </div>
  );
}

// ─── MODAL PERSONA ────────────────────────────────────────────────────────────
const PERSONA_COLORS = ["#22d3ee","#f472b6","#fb923c","#a78bfa","#34d399","#fbbf24","#f87171","#818cf8","#2dd4bf","#e879f9"];

function ModalPersona({ data, onSave, onClose }) {
  const [form, setForm] = useState(data || {nombre:"", rol:"", area:"diaD", color:PERSONA_COLORS[0], email:"", telefono:""});
  const [err, setErr] = useState({});
  const upd = (fkey, fval) => setForm(prev=>({...prev,[fkey]:fval}));
  const submit = () => {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre="Requerido";
    if (!form.rol.trim()) errs.rol="Requerido";
    setErr(errs);
    if (!Object.keys(errs).length) onSave(form);
  };
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header"><span className="mtit">{data?"✏️ Editar persona":"👤 Nueva persona"}</span><button className="btn btn-sm btn-ghost" aria-label="Cerrar formulario de tarea" onClick={onClose}><span aria-hidden="true">✕</span></button></div>
        <div className="modal-body">
          <div style={{display:"flex",alignItems:"center",gap:"1rem",padding:".75rem",background:"var(--surface2)",borderRadius:10}}>
            <div className="avatar-lg" style={{background:form.color+"22",border:`2px solid ${form.color}66`,color:form.color,flexShrink:0}}>{iniciales(form.nombre||"??")}</div>
            <div style={{flex:1}}>
              <div className="fl" style={{marginBottom:".4rem"}}>Color de identificación</div>
              <div style={{display:"flex",gap:".3rem",flexWrap:"wrap"}}>
                {PERSONA_COLORS.map(c=>(
                  <div key={c} onClick={()=>upd("color",c)} style={{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",border:form.color===c?"3px solid white":"2px solid transparent",transition:"all .15s",transform:form.color===c?"scale(1.2)":"scale(1)"}}/>
                ))}
              </div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
            <div>
              <label className="fl" style={{color:err.nombre?"#f87171":undefined}}>Nombre completo *</label>
              <input className="inp" autoFocus value={form.nombre} onChange={e=>upd("nombre",e.target.value)} placeholder="Nombre Apellido"/>
              {err.nombre&&<div className="mono xs" style={{color:"#f87171",marginTop:".2rem"}}>⚠ {err.nombre}</div>}
            </div>
            <div>
              <label className="fl" style={{color:err.rol?"#f87171":undefined}}>Rol en el equipo *</label>
              <input className="inp" value={form.rol} onChange={e=>upd("rol",e.target.value)} placeholder="Director, Coordinador..."/>
              {err.rol&&<div className="mono xs" style={{color:"#f87171",marginTop:".2rem"}}>⚠ {err.rol}</div>}
            </div>
          </div>
          <div>
            <label className="fl">Área principal</label>
            <select className="inp" value={form.area} onChange={e=>upd("area",e.target.value)}>
              {AREAS.map(a=><option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
            <div>
              <label className="fl">Teléfono</label>
              <input className="inp" value={form.telefono||""} onChange={e=>upd("telefono",e.target.value)} placeholder="611 000 000" inputMode="tel"/>
            </div>
            <div>
              <label className="fl">Email</label>
              <input className="inp" value={form.email||""} onChange={e=>upd("email",e.target.value)} placeholder="nombre@email.es"/>
            </div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={submit}>{data?"💾 Guardar":"➕ Añadir"}</button></div>
      </div>
    </div>
  );
}

// ─── FICHA PROYECTO ───────────────────────────────────────────────────────────
// Componente Row reutilizable — fuera de FichaProyecto para evitar remount en cada render

export { validarTarea, QuickCreateTarea, ModalTarea, ModalHito, ModalPersona };
