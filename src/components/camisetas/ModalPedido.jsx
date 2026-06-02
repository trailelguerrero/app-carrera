/**
 * ModalPedido.jsx — Fase 3, Tarea 3.4
 * Modal crear/editar pedido de camisetas.
 */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useModalClose } from "@/hooks/useModalClose";
import { genIdNum, fmtEur2 } from "@/lib/utils";
import { blockCls as cls } from "@/lib/blockStyles";
import { TC, EP, EE, TALLAS, TALLAS_NINO, TIPOS, ESTADOS_PAGO, ESTADOS_ENTREGA, calcPedido } from "./camisetasConstants";
import { FormError } from "@/components/common/FormError";

export function ModalPedido({
 data, coste, onSave, onClose }) {
  const firstInputRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => firstInputRef.current?.focus(), 60); return () => clearTimeout(t); }, []);

  const { closing: mpedClosing, handleClose: mpedHandleClose } = useModalClose(onClose);
  const esEdit = !!data?.id;
  const [form,setForm] = useState(()=>data?{...data,lineas:data.lineas.map(l=>({...l}))}:{
    nombre:"",telefono:"",email:"",notas:"",
    lineas:[{id:1,tipo:"corredor",talla:"M",cantidad:1,precioVenta:0,estadoPago:"pendiente",estadoEntrega:"pendiente"}]
  });
  const upd      = (k,v)   => setForm(p=>({...p,[k]:v}));
  const updL     = (i,k,v) => setForm(p=>({...p,lineas:p.lineas.map((l,j)=>j===i?{...l,[k]:v}:l)}));
  const addL     = ()      => setForm(p=>({...p,lineas:[...p.lineas,{id:genIdNum(p.lineas),tipo:"corredor",talla:"M",cantidad:1,precioVenta:0,estadoPago:"pendiente",estadoEntrega:"pendiente"}]}));
  const delL     = (i)     => setForm(p=>({...p,lineas:p.lineas.filter((_,j)=>j!==i)}));
  const {totalVenta,totalCoste,beneficio,benRealizado,benPotencial,costeRegalos} = calcPedido(form,coste);
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [verAvanzado, setVerAvanzado] = useState(!!data?.id); // edición: mostrar todo
  const valido = form.nombre.trim()&&form.lineas.length>0&&form.lineas.every(l=>l.cantidad>=1);
  // fix(FUNC-02): validación de formato de teléfono español (9 dígitos, empieza por 6-9)
  const telefonoVacio  = !form.telefono || !form.telefono.trim();
  const telefonoValido = telefonoVacio || /^[6-9]\d{8}$/.test(form.telefono.replace(/\s/g,''));
  // Validación de email: solo si se ha rellenado
  const emailVacio  = !form.email || !form.email.trim();
  const emailValido = emailVacio || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const puedeGuardar   = valido && telefonoValido && emailValido;
  return createPortal(
    <div className={`modal-backdrop${mpedClosing ? " modal-backdrop-closing" : ""}`} onClick={e=>e.target===e.currentTarget&&mpedHandleClose()}>
      <div className={`modal modal-ficha${mpedClosing ? " modal-closing" : ""}`} style={{maxWidth:540}}>
        <div className="modal-header"><span className="modal-title">{esEdit?"✏️ Editar pedido":"👕 Nuevo pedido de camiseta"}</span><button className="btn btn-ghost btn-sm" onClick={mpedHandleClose} aria-label="Cerrar">✕</button></div>
        <div className="modal-body" style={{gap:".75rem"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
            <div style={{gridColumn:"1/-1"}}>
              <label className="fl" htmlFor="modal-pedido-nombre" style={{color:intentoGuardar&&!form.nombre.trim()?"var(--red)":undefined}}>Nombre *</label>
              <input ref={firstInputRef} id="modal-pedido-nombre" className="inp" value={form.nombre}
                onChange={e=>{upd("nombre",e.target.value);setIntentoGuardar(false);}}
                placeholder="Nombre completo"
                style={{borderColor:intentoGuardar&&!form.nombre.trim()?"var(--red)":undefined}}/>
              {intentoGuardar&&!form.nombre.trim()&&(
                <FormError msg="El nombre es obligatorio" />
              )}
            </div>
            {verAvanzado && <>
              <div>
                <label className="fl" htmlFor="modal-pedido-tel" style={{color:intentoGuardar&&!telefonoValido?"var(--red)":undefined}}>Teléfono</label>
                <input id="modal-pedido-tel" className="inp" value={form.telefono}
                  onChange={e=>upd("telefono",e.target.value)}
                  placeholder="6XX XXX XXX"
                  inputMode="tel"
                  style={{borderColor:intentoGuardar&&!telefonoValido?"var(--red)":undefined}} />
                {intentoGuardar&&!telefonoValido&&(
                  <FormError msg="9 dígitos, empieza por 6-9" />
                )}
              </div>
              <div><label className="fl" htmlFor="modal-pedido-email" style={{color:intentoGuardar&&!emailValido?"var(--red)":undefined}}>Email</label><input id="modal-pedido-email" className="inp" value={form.email} onChange={e=>upd("email",e.target.value)} placeholder="email@ejemplo.com" inputMode="email" style={{borderColor:intentoGuardar&&!emailValido?"var(--red)":undefined}} />{intentoGuardar&&!emailValido&&(<FormError msg="Formato de email inválido" />)}</div>
            </>}
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".5rem"}}><label className="fl" style={{margin:0}}>Líneas del pedido</label><button className="btn btn-ghost btn-sm" onClick={addL}>+ Añadir línea</button></div>
            <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
              {form.lineas.map((l,i)=>{
                const costeU=coste[l.tipo]||0; const ep=l.estadoPago||"pendiente"; const esR=ep==="regalo";
                const subV=esR?0:l.cantidad*(l.precioVenta||0); const subC=l.cantidad*costeU;
                const margen=esR?-subC:subV-subC;
                return (
                  <div key={i} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:".65rem .75rem"}}>
                    {/* Fila superior: Tipo · Talla · Cant. · € P.Corredores · € P.Venta · ✕ */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 56px 76px 32px",gap:".4rem",alignItems:"end",marginBottom:".4rem"}}>
                      <div><label className="fl">Tipo</label><select className="inp inp-sm" value={l.tipo} onChange={e=>{const newTipo=e.target.value;const defaultTalla=newTipo==="nino"?"4-6":"M";updL(i,"tipo",newTipo);updL(i,"talla",defaultTalla);}}>{TIPOS.map(t=><option key={t} value={t}>{TC[t].icon} {TC[t].label}</option>)}</select></div>
                      <div><label className="fl">Talla</label><select className="inp inp-sm" value={l.talla} onChange={e=>updL(i,"talla",e.target.value)}>{(l.tipo==="nino"?TALLAS_NINO:TALLAS).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                      <div><label className="fl">Cant.</label><input type="number" min="1" className="inp inp-sm inp-mono" value={l.cantidad} onChange={e=>updL(i,"cantidad",Math.max(1,parseInt(e.target.value)||1))} /></div>
                      <div>
                        <label className="fl" style={{color:"var(--cyan)"}}>€ Precio venta</label>
                        <input type="number" min="0" step="0.5" className="inp inp-sm inp-mono" value={l.precioVenta||0} onChange={e=>updL(i,"precioVenta",parseFloat(e.target.value)||0)} disabled={esR} style={{opacity:esR?.45:1,borderColor:"rgba(34,211,238,.3)"}} />
                      </div>
                      <button className="btn btn-red btn-sm" onClick={()=>delL(i)} disabled={form.lineas.length<=1} style={{marginBottom:1}} aria-label="Cerrar">✕</button>
                    </div>
                    {verAvanzado && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem",marginBottom:".35rem"}}>
                      <div><label className="fl">Estado de pago</label><select className="inp inp-sm" value={ep} onChange={e=>updL(i,"estadoPago",e.target.value)}>{ESTADOS_PAGO.map(s=><option key={s} value={s}>{EP[s].icon} {EP[s].label}</option>)}</select></div>
                      <div><label className="fl">Estado de entrega</label><select className="inp inp-sm" value={l.estadoEntrega||"pendiente"} onChange={e=>updL(i,"estadoEntrega",e.target.value)}>{ESTADOS_ENTREGA.map(s=><option key={s} value={s}>{EE[s].icon} {EE[s].label}</option>)}</select></div>
                    </div>}
                    <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",display:"flex",gap:".75rem",flexWrap:"wrap"}}>
                      <span>Coste fabricación: {fmtEur2(subC)}</span><span>Venta: {esR?"🎁 Regalo":fmtEur2(subV)}</span>
                      <span style={{color:margen>=0?"var(--green)":"var(--red)"}}>Margen: {fmtEur2(margen)}</span>
                    </div>
                    {!esR && (l.precioVenta||0)===0 && (
                      <div style={{marginTop:".3rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".2rem .5rem",borderRadius:4,background:"var(--violet-dim)",color:"var(--violet)",display:"inline-flex",alignItems:"center",gap:".3rem"}}>
                        💡 Precio 0 con estado pendiente — ¿es un regalo?
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button type="button"
            onClick={()=>setVerAvanzado(v=>!v)}
            style={{ background:"none", border:"none", cursor:"pointer", width:"100%",
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan)",
              padding:".3rem 0", textAlign:"left", display:"flex", alignItems:"center", gap:".3rem" }}>
            {verAvanzado ? "▲ Ocultar opciones avanzadas" : "▼ Precio, pago, entrega y contacto"}
          </button>

          <div style={{background:"var(--surface2)",borderRadius:8,padding:".65rem .85rem",display:"flex",justifyContent:"space-around",gap:".75rem",flexWrap:"wrap"}}>
            {[
              {l:"Total coste",      v:fmtEur2(totalCoste),      c:"var(--red)"},
              {l:"Total venta",      v:fmtEur2(totalVenta),      c:"var(--green)"},
              {l:"Ben. realizado",   v:fmtEur2(benRealizado),    c:benRealizado>=0?"var(--green)":"var(--red)"},
              {l:"Ben. potencial",   v:fmtEur2(benPotencial),    c:benPotencial>=0?"var(--cyan)":"var(--amber)"},
              {l:"Coste regalos",    v:fmtEur2(costeRegalos),    c:"var(--violet)"},
            ].map(({l,v,c})=>(
              <div key={l} style={{textAlign:"center"}}><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-2xs)",color:"var(--text-muted)",marginBottom:".15rem",textTransform:"uppercase"}}>{l}</div><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-base)",fontWeight:800,color:c}}>{v}</div></div>
            ))}
          </div>
          <div><label className="fl">Notas</label><input className="inp" value={form.notas} onChange={e=>upd("notas",e.target.value)} placeholder="Observaciones opcionales…" /></div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={mpedHandleClose}>Cancelar</button><button className="btn btn-primary" onClick={()=>{ if(puedeGuardar) onSave(form); else setIntentoGuardar(true); }} style={{opacity:puedeGuardar?1:.65}}>{esEdit?"Guardar cambios":"Crear pedido"}</button></div>
      </div>
    </div>,
    document.body
  );
}

