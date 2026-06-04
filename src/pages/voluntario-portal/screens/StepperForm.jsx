import { useState, useEffect, useRef } from "react";
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK, GUIA_TALLAS } from "@/constants/camisetasConstants";
import { FormField } from "../components/FormField";

export function StepperForm({ puestos, imgFront, imgBack, imgGuiaTallas, opcionPuesto, opcionVehiculo, opcionEmail, opcionEmergencia, onRegistrar, enviando }) {
  const [paso, setPaso]   = useState(1);
  const [form, setForm]   = useState({ nombre:"", apellidos:"", telefono:"", email:"", talla:"", puestoId:"", coche:false, telefonoEmergencia:"", alergias:"", medicacion:"" });
  const [errores, setErrores] = useState({});
  const [lightbox, setLightbox]   = useState(null);
  const [guiaTallas, setGuiaTallas] = useState(false);
  const stepRef = useRef(null);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  useEffect(() => {
    const t = setTimeout(() => stepRef.current?.querySelector("input,select")?.focus(), 120);
    return () => clearTimeout(t);
  }, [paso]);

  const validarPaso1 = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (!form.apellidos.trim()) e.apellidos = "Requerido";
    if (!form.telefono.trim() || !/^\d{9}$/.test(form.telefono.replace(/\s/g,""))) e.telefono = "Teléfono de 9 dígitos";
    if (opcionEmail && form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Email no válido";
    if (opcionEmergencia && !form.telefonoEmergencia?.trim()) e.telefonoEmergencia = "El teléfono de emergencia es obligatorio";
    setErrores(e); return Object.keys(e).length === 0;
  };

  const validarPaso2 = () => {
    const e = {};
    if (!form.talla) e.talla = "Selecciona una talla";
    setErrores(e); return Object.keys(e).length === 0;
  };

  const irA = (n) => { setErrores({}); setPaso(n); };

  const siguiente = () => {
    if (paso===1 && !validarPaso1()) return;
    if (paso===2 && !validarPaso2()) return;
    irA(paso+1);
  };

  const handleSubmit = () => {
    onRegistrar({
      nombre:    form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      telefono: form.telefono.trim(),
      ...(opcionEmail ? { email: form.email?.trim()||"" } : {}),
      talla:    form.talla,
      puestoId: form.puestoId ? (parseInt(form.puestoId) || null) : null,
      coche:    form.coche,
      notas:    "",
      fechaRegistro: new Date().toISOString().split("T")[0],
      telefonoEmergencia: form.telefonoEmergencia?.trim()||"",
      contactoEmergencia: form.telefonoEmergencia?.trim()||"",
      alergias:    form.alergias?.trim()||"",
      medicacion:  form.medicacion?.trim()||"",
    });
  };

  const renderLightbox = () => lightbox ? (
    <div onClick={()=>setLightbox(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:200,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",backdropFilter:"blur(8px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{position:"relative",maxWidth:480,width:"100%"}}>
        <button onClick={()=>setLightbox(null)} style={{position:"absolute",top:-14,right:-14,zIndex:10,
          width:32,height:32,borderRadius:"50%",background:"var(--surface)",border:"1px solid var(--border)",
          color:"var(--text)",cursor:"pointer",fontSize:"0.9rem",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        <div style={{background:"var(--surface)",border:"1px solid var(--border-light)",borderRadius:16,overflow:"hidden"}}>
          <div style={{padding:".75rem 1rem",borderBottom:"1px solid var(--border)",
            fontFamily:"var(--font-mono)",fontSize:".7rem",color:"var(--text-muted)",display:"flex",gap:".75rem"}}>
            {["front","back"].map(side=>(
              <button key={side} onClick={()=>setLightbox(side)} style={{background:"none",border:"none",cursor:"pointer",
                color:lightbox===side?"var(--cyan)":"var(--text-muted)",fontFamily:"var(--font-mono)",fontSize:".7rem",fontWeight:700,
                paddingBottom:".15rem",borderBottom:lightbox===side?"2px solid var(--cyan)":"2px solid transparent"}}>
                {side==="front"?"Vista delantera":"Vista trasera"}
              </button>
            ))}
          </div>
          <img src={lightbox==="front"?imgFront:imgBack} alt="Camiseta"
            style={{width:"100%",display:"block",maxHeight:"70vh",objectFit:"contain"}} />
        </div>
      </div>
    </div>
  ) : null;

  const renderGuiaTallas = () => guiaTallas ? (
    <div onClick={()=>setGuiaTallas(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",backdropFilter:"blur(6px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"var(--surface)",border:"1px solid var(--border-light)",
        borderRadius:16,maxWidth:480,width:"100%",maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"1rem 1.25rem",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontWeight:700,fontSize:".9rem"}}>📐 Guía de tallas</span>
          <button onClick={()=>setGuiaTallas(false)} style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:"1.1rem"}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:"1rem"}}>
          {imgGuiaTallas ? (
            <img src={imgGuiaTallas} alt="Guía de tallas" style={{width:"100%",borderRadius:8}} />
          ) : (
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"var(--font-mono)",fontSize:".72rem"}}>
              <thead><tr>{["Talla","Pecho (cm)","Largo (cm)","Hombro (cm)"].map(h=>(
                <th key={h} style={{padding:".4rem .6rem",borderBottom:"1px solid var(--border)",color:"var(--text-muted)",textAlign:"left"}}>{h}</th>
              ))}</tr></thead>
              <tbody>{GUIA_TALLAS.map(({talla,pecho,largo,hombro})=>(
                <tr key={talla} style={{borderBottom:"1px solid var(--border)"}}>
                  {[talla,pecho,largo,hombro].map((v,i)=>(
                    <td key={i} style={{padding:".4rem .6rem",color:i===0?"var(--cyan)":"var(--text)"}}>{v}</td>
                  ))}
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const segs = [1,2,3];

  return (
    <div>
      {renderLightbox()}
      {renderGuiaTallas()}

      <div className="step-bar">
        {segs.map(n => (
          <div key={n} className={`step-seg${n<paso?" done":n===paso?" active":""}`} />
        ))}
      </div>

      <div ref={stepRef} className="vp-card">
        {/* PASO 1: Datos personales */}
        {paso === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
            <div className="step-header">
              <div className="step-icon">👤</div>
              <div><div className="step-title">¿Quién eres?</div><div className="step-sub">Datos personales para coordinación</div></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
              <FormField label="Nombre *" error={errores.nombre}>
                <input className={`pub-input${errores.nombre?" error":""}`} placeholder="Ej: María"
                  value={form.nombre} onChange={e=>set("nombre",e.target.value)} />
              </FormField>
              <FormField label="Apellidos *" error={errores.apellidos}>
                <input className={`pub-input${errores.apellidos?" error":""}`} placeholder="Ej: García"
                  value={form.apellidos} onChange={e=>set("apellidos",e.target.value)} />
              </FormField>
            </div>
            <FormField label="Teléfono *" error={errores.telefono} hint="Para coordinación el día de carrera">
              <input className={`pub-input${errores.telefono?" error":""}`} placeholder="612 345 678"
                inputMode="tel" value={form.telefono} onChange={e=>set("telefono",e.target.value)} />
            </FormField>
            {opcionEmail && (
              <FormField label="Email" error={errores.email} hint="Para comunicaciones previas">
                <input className={`pub-input${errores.email?" error":""}`} type="email"
                  placeholder="tu@email.com" inputMode="email" autoCapitalize="none"
                  value={form.email||""} onChange={e=>set("email",e.target.value)} />
              </FormField>
            )}
            <FormField label="🚨 Teléfono de emergencia *" error={errores.telefonoEmergencia}
              hint="Familiar o persona a avisar si ocurre alguna incidencia">
              <input className={`pub-input${errores.telefonoEmergencia?" error":""}`}
                type="tel" placeholder="612 345 678" inputMode="tel"
                value={form.telefonoEmergencia||""} onChange={e=>set("telefonoEmergencia",e.target.value)} />
            </FormField>
            <FormField label="⚕️ ¿Tienes alguna alergia que debamos conocer?" hint="Por seguridad en carrera: alimentos, picaduras, medicamentos... (opcional)">
              <input className="pub-input" placeholder="Ej: Polen, frutos secos, picaduras de abejas…"
                value={form.alergias||""} onChange={e=>set("alergias",e.target.value)} maxLength={200} />
            </FormField>
            <FormField label="💊 ¿Tomas alguna medicación que debamos conocer?" hint="Por seguridad: insulina, adrenalina, anticoagulantes... (opcional)">
              <input className="pub-input" placeholder="Ej: Adrenalina, insulina, anticoagulantes…"
                value={form.medicacion||""} onChange={e=>set("medicacion",e.target.value)} maxLength={200} />
            </FormField>
            <div className="step-nav"><button className="pub-btn-primary" onClick={siguiente}>Continuar →</button></div>
          </div>
        )}

        {/* PASO 2: Participación */}
        {paso === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
            <div className="step-header">
              <div className="step-icon">🏃</div>
              <div><div className="step-title">Tu participación</div><div className="step-sub">Talla y preferencias operativas</div></div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
              {[{side:"front",label:"Delantera",src:imgFront,accent:"var(--cyan)"},{side:"back",label:"Trasera",src:imgBack,accent:"var(--violet)"}].map(({side,label,src,accent})=>(
                <div key={side} onClick={()=>setLightbox(side)} style={{cursor:"pointer",borderRadius:10,overflow:"hidden",
                  border:`1px solid ${accent}33`,background:"var(--surface2)",transition:"all 0.18s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=`${accent}33`;}}>
                  <img src={src} alt={label} style={{width:"100%",height:110,objectFit:"cover",display:"block"}} />
                  <div style={{padding:".3rem .6rem",display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:`1px solid ${accent}22`}}>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)"}}>{label}</span>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:accent}}>🔍</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".4rem"}}>
                <label style={{fontFamily:"var(--font-display)",fontSize:".78rem",fontWeight:600,
                  color:errores.talla?"var(--red)":"var(--text)"}}>Talla de camiseta *</label>
                <button onClick={()=>setGuiaTallas(true)} style={{background:"var(--cyan-dim)",color:"var(--cyan)",
                  border:"1px solid rgba(34,211,238,0.2)",borderRadius:5,padding:".18rem .55rem",
                  fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,cursor:"pointer"}}>📐 Guía</button>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:".4rem"}}>
                {TALLAS.map(t=>(
                  <button key={t} onClick={()=>set("talla",t)} style={{padding:".45rem .7rem",borderRadius:7,
                    border:`1px solid ${form.talla===t?"var(--cyan)":"var(--border)"}`,
                    background:form.talla===t?"var(--cyan-dim)":"var(--surface2)",
                    color:form.talla===t?"var(--cyan)":"var(--text-muted)",
                    fontFamily:"var(--font-mono)",fontSize:".72rem",fontWeight:700,
                    cursor:"pointer",transition:"all 0.15s",transform:form.talla===t?"scale(1.08)":"scale(1)"}}>
                    {t}
                  </button>
                ))}
              </div>
              {errores.talla && <div style={{fontFamily:"var(--font-mono)",fontSize:".62rem",color:"var(--red)",marginTop:".3rem"}}>⚠ {errores.talla}</div>}
            </div>

            {opcionPuesto && (
              <FormField label="Puesto preferido" hint="Opcional — el organizador hará la asignación final">
                <select className="pub-input" value={form.puestoId} onChange={e=>set("puestoId",e.target.value)}
                  style={{appearance:"none"}}>
                  <option value="">Sin preferencia</option>
                  {puestos.map(p=><option key={p.id} value={p.id}>{p.nombre} ({p.tipo})</option>)}
                </select>
              </FormField>
            )}

            {opcionVehiculo && (
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:10,padding:".85rem 1rem"}}>
                <div>
                  <div style={{fontFamily:"var(--font-display)",fontSize:".82rem",fontWeight:600}}>¿Dispones de vehículo propio?</div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--text-muted)",marginTop:".15rem"}}>Facilita el acceso a puestos remotos</div>
                </div>
                <button onClick={()=>set("coche",!form.coche)} style={{width:48,height:26,borderRadius:13,flexShrink:0,
                  background:form.coche?"var(--green)":"var(--surface3)",border:"none",cursor:"pointer",
                  position:"relative",transition:"background 0.2s"}}>
                  <span style={{position:"absolute",top:3,width:20,height:20,borderRadius:"50%",
                    background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)",
                    left:form.coche?25:3}} />
                </button>
              </div>
            )}

            <div className="step-nav">
              <button className="pub-btn-ghost" onClick={()=>irA(1)}>← Atrás</button>
              <button className="pub-btn-primary" onClick={siguiente}>Revisar →</button>
            </div>
          </div>
        )}

        {/* PASO 3: Confirmación */}
        {paso === 3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
            <div className="step-header">
              <div className="step-icon">✅</div>
              <div><div className="step-title">Revisa y confirma</div><div className="step-sub">Comprueba tus datos antes de enviar</div></div>
            </div>
            <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,padding:"1rem 1.25rem"}}>
              <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--text-muted)",
                textTransform:"uppercase",letterSpacing:".09em",marginBottom:".75rem"}}>Tus datos</div>
              {[
                ["Nombre",   `${form.nombre} ${form.apellidos}`],
                ["Teléfono", form.telefono],
                ["Talla",    form.talla],
                ...(opcionPuesto && form.puestoId ? [["Puesto",puestos.find(p=>String(p.id)===String(form.puestoId))?.nombre||""]] : []),
                ...(opcionVehiculo ? [["Vehículo", form.coche?"Sí ✓":"No"]] : []),
                ["🚨 Tel. emergencia", form.telefonoEmergencia || "—"],
                ...(form.alergias ? [["⚕️ Alergias", form.alergias.slice(0,40)+(form.alergias.length>40?"…":"")]] : []),
                ...(form.medicacion ? [["💊 Medicación", form.medicacion.slice(0,40)+(form.medicacion.length>40?"…":"")]] : []),
              ].map(([k,v])=>(
                <div key={k} className="summary-row">
                  <span className="summary-key">{k}</span>
                  <span className="summary-val">{v}</span>
                </div>
              ))}
            </div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:".62rem",color:"var(--text-muted)",
              lineHeight:1.65,background:"var(--surface2)",borderRadius:8,padding:".75rem 1rem",
              borderLeft:"3px solid rgba(34,211,238,.3)"}}>
              Al registrarte aceptas que tus datos se usen exclusivamente para la coordinación del Trail El Guerrero 2026 · Candeleda, Ávila.
            </div>
            <div className="step-nav">
              <button className="pub-btn-ghost" onClick={()=>irA(2)}>← Atrás</button>
              <button className="pub-btn-primary" onClick={handleSubmit} disabled={enviando}
                style={{opacity:enviando?.65:1,cursor:enviando?"not-allowed":"pointer"}}>
                {enviando?"Enviando…":"✓ Registrarme como voluntario"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{textAlign:"center",marginTop:"1.25rem",fontFamily:"var(--font-mono)",
        fontSize:"var(--fs-xs)",color:"var(--text-muted)",lineHeight:1.9,
        padding:".6rem .75rem",background:"rgba(148,163,184,.05)",
        borderRadius:8,border:"1px solid var(--border)"}}>
        Tus datos se usan exclusivamente para la coordinación del Trail El Guerrero 2026.<br/>
        <span style={{color:"var(--text-dim)"}}>Organiza: Club Deportivo Trail Candeleda · Candeleda, Ávila</span>
      </div>
    </div>
  );
}
