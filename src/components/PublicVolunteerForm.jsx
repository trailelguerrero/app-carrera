/**
 * PublicVolunteerForm — componente AUTÓNOMO para /voluntarios/registro
 * No depende de ningún otro bloque. Tiene todo lo necesario inline.
 * B2: formulario en 3 pasos con barra de progreso.
 */
import { useState, useEffect, useRef } from "react";

const LS_KEY = "teg_voluntarios_v1";

// ── Constantes ────────────────────────────────────────────────────────────────
const TALLAS = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"];
const DIST_COLORS = { TG7:"#22d3ee", TG13:"#a78bfa", TG25:"#34d399" };
const GUIA_TALLAS = [
  { talla:"XXS", pecho:"76-80",  largo:"62", hombro:"36" },
  { talla:"XS",  pecho:"80-84",  largo:"64", hombro:"38" },
  { talla:"S",   pecho:"84-88",  largo:"66", hombro:"40" },
  { talla:"M",   pecho:"88-92",  largo:"68", hombro:"42" },
  { talla:"L",   pecho:"92-96",  largo:"70", hombro:"44" },
  { talla:"XL",  pecho:"96-104", largo:"72", hombro:"46" },
  { talla:"XXL", pecho:"104-112",largo:"74", hombro:"48" },
  { talla:"3XL", pecho:"112-120",largo:"76", hombro:"50" },
  { talla:"4XL", pecho:"120-128",largo:"78", hombro:"52" },
];
const SHIRT_FRONT = "data:image/svg+xml," + encodeURIComponent(
  `<svg width="400" height="450" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="450" fill="#0f1629"/>
  <text x="200" y="200" text-anchor="middle" fill="#22d3ee" font-size="18" font-family="monospace">CAMISETA TRAIL</text>
  <text x="200" y="230" text-anchor="middle" fill="#22d3ee" font-size="14" font-family="monospace">EL GUERRERO 2026</text>
  <text x="200" y="270" text-anchor="middle" fill="#5a6a8a" font-size="12" font-family="monospace">PARTE DELANTERA</text></svg>`
);
const SHIRT_BACK = "data:image/svg+xml," + encodeURIComponent(
  `<svg width="400" height="450" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="450" fill="#0f1629"/>
  <text x="200" y="200" text-anchor="middle" fill="#a78bfa" font-size="18" font-family="monospace">CAMISETA TRAIL</text>
  <text x="200" y="230" text-anchor="middle" fill="#a78bfa" font-size="14" font-family="monospace">EL GUERRERO 2026</text>
  <text x="200" y="270" text-anchor="middle" fill="#5a6a8a" font-size="12" font-family="monospace">PARTE TRASERA</text></svg>`
);

const STEPS = [
  { n: 1, label: "¿Quién eres?",     icon: "👤" },
  { n: 2, label: "Tu participación", icon: "🏃" },
  { n: 3, label: "Confirmar",        icon: "✅" },
];

// ── CSS autónomo ──────────────────────────────────────────────────────────────
const CSS = `
  :root {
    --bg:#080c18; --surface:#0f1629; --surface2:#151e35; --surface3:#1a2540;
    --border:#1e2d50; --border-light:#2a3f6a;
    --text:#e8eef8; --text-muted:#5a6a8a; --text-dim:#3a4a6a;
    --cyan:#22d3ee;   --cyan-dim:rgba(34,211,238,0.1);
    --violet:#a78bfa; --violet-dim:rgba(167,139,250,0.1);
    --green:#34d399;  --green-dim:rgba(52,211,153,0.1);
    --amber:#fbbf24;  --amber-dim:rgba(251,191,36,0.1);
    --red:#f87171;    --red-dim:rgba(248,113,113,0.1);
    --font-display:'Syne',sans-serif;
    --font-mono:'DM Mono', 'Space Mono', monospace,monospace;
    --r:12px; --r-sm:8px;
  }
  *, *::before, *::after { box-sizing:border-box; }
  body { background:var(--bg); color:var(--text); margin:0; font-family:var(--font-display); }

  .pub-input {
    background:var(--surface2); border:1px solid var(--border); border-radius:var(--r-sm);
    color:var(--text); font-family:var(--font-display); font-size:0.85rem;
    padding:0.55rem 0.75rem; outline:none; width:100%;
    transition:border-color 0.15s, box-shadow 0.15s;
  }
  .pub-input:focus { border-color:var(--cyan); box-shadow:0 0 0 3px rgba(34,211,238,0.1); }
  .pub-input::placeholder { color:var(--text-dim); }
  .pub-input.error { border-color:var(--red); }

  /* Stepper */
  .step-bar { display:flex; gap:6px; margin-bottom:1.75rem; }
  .step-seg {
    flex:1; height:4px; border-radius:99px;
    background:var(--border);
    transition:background 0.35s ease;
  }
  .step-seg.done    { background:var(--cyan); }
  .step-seg.active  { background:var(--cyan); opacity:.55; }

  .step-header {
    display:flex; align-items:center; gap:.55rem;
    margin-bottom:1.35rem;
  }
  .step-icon {
    width:34px; height:34px; border-radius:50%; flex-shrink:0;
    background:var(--cyan-dim); border:1.5px solid rgba(34,211,238,.3);
    display:flex; align-items:center; justify-content:center;
    font-size:1rem;
  }
  .step-title  { font-family:var(--font-display); font-weight:800; font-size:1.05rem; }
  .step-sub    { font-family:var(--font-mono); font-size:.62rem; color:var(--text-muted); margin-top:.1rem; }

  /* Buttons */
  .pub-btn-primary {
    width:100%; padding:.85rem;
    background:linear-gradient(135deg,rgba(34,211,238,0.2),rgba(167,139,250,0.15));
    border:1px solid rgba(34,211,238,0.35); border-radius:10;
    color:var(--text); font-family:var(--font-display);
    font-size:.9rem; font-weight:800; cursor:pointer;
    letter-spacing:.03em; transition:all 0.18s;
    border-radius:10px;
  }
  .pub-btn-primary:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(34,211,238,0.15); }
  .pub-btn-primary:active { transform:scale(.98); }

  .pub-btn-ghost {
    padding:.55rem 1.1rem; background:var(--surface2);
    border:1px solid var(--border); border-radius:8px;
    color:var(--text-muted); font-family:var(--font-display);
    font-size:.82rem; font-weight:600; cursor:pointer;
    transition:all 0.15s;
  }
  .pub-btn-ghost:hover { border-color:var(--border-light); color:var(--text); }

  /* Step nav */
  .step-nav { display:flex; gap:.6rem; margin-top:1rem; }
  .step-nav .pub-btn-primary { flex:1; }

  /* Summary card */
  .summary-row {
    display:flex; justify-content:space-between; align-items:center;
    padding:.45rem 0; border-bottom:1px solid rgba(30,45,80,.35);
    font-size:.82rem;
  }
  .summary-row:last-child { border-bottom:none; }
  .summary-key { color:var(--text-muted); font-family:var(--font-mono); font-size:.68rem; }
  .summary-val { font-family:var(--font-mono); font-weight:700; }

  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes stepIn  { from{opacity:0;transform:translateX(22px)} to{opacity:1;transform:translateX(0)} }
  @keyframes stepInBack { from{opacity:0;transform:translateX(-22px)} to{opacity:1;transform:translateX(0)} }
`;

// ── API ────────────────────────────────────────────────────────────────────────
const PUBLIC_API = "/api/data/public";

async function fetchPublic(collection) {
  try {
    const res = await fetch(`${PUBLIC_API}?collection=${collection}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── Componente raíz ───────────────────────────────────────────────────────────
export default function PublicVolunteerForm() {
  const [puestos,        setPuestos]        = useState([]);
  const [imgFront,       setImgFront]       = useState(null);
  const [imgBack,        setImgBack]        = useState(null);
  const [imgGuiaTallas,  setImgGuiaTallas]  = useState(null);
  const [opcionPuesto,   setOpcionPuesto]   = useState(true);
  const [opcionVehiculo, setOpcionVehiculo] = useState(true);
  const [opcionEmail,    setOpcionEmail]    = useState(false);
  const [opcionEmergencia, setOpcionEmergencia] = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [enviando,       setEnviando]       = useState(false);
  const [registroOk,     setRegistroOk]     = useState(false);
  const [errorEnvio,     setErrorEnvio]     = useState(null);

  useEffect(() => {
    Promise.all([
      fetchPublic(LS_KEY + "_puestos"),
      fetchPublic(LS_KEY + "_imgFront"),
      fetchPublic(LS_KEY + "_imgBack"),
      fetchPublic(LS_KEY + "_imgGuiaTallas"),
      fetchPublic(LS_KEY + "_opcionPuesto"),
      fetchPublic(LS_KEY + "_opcionVehiculo"),
      fetchPublic(LS_KEY + "_opcionEmail"),
      fetchPublic(LS_KEY + "_opcionEmergencia"),
    ]).then(([psts, front, back, guia, opPuesto, opVehiculo, opEmail, opEmergencia]) => {
      if (Array.isArray(psts))   setPuestos(psts);
      if (front)                 setImgFront(front);
      if (back)                  setImgBack(back);
      if (guia)                  setImgGuiaTallas(guia);
      if (opPuesto    !== null) setOpcionPuesto(Boolean(opPuesto));
      if (opVehiculo  !== null) setOpcionVehiculo(Boolean(opVehiculo));
      if (opEmail     !== null) setOpcionEmail(Boolean(opEmail));
      if (opEmergencia !== null) setOpcionEmergencia(Boolean(opEmergencia));
      setLoading(false);
    });
  }, []);

  const addVoluntario = async (data) => {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const res = await fetch(`${PUBLIC_API}?collection=${LS_KEY + "_voluntarios"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, estado: "pendiente" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorEnvio(json.error || "Error al enviar el registro. Inténtalo de nuevo.");
        setEnviando(false);
        return;
      }
      setRegistroOk(true);
    } catch {
      setErrorEnvio("Sin conexión. Comprueba tu red e inténtalo de nuevo.");
    }
    setEnviando(false);
  };

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex",
        alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontFamily:"var(--font-mono)", color:"var(--cyan)", fontSize:".8rem" }}>
          Cargando formulario…
        </div>
      </div>
    </>
  );

  if (registroOk) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex",
        alignItems:"center", justifyContent:"center", padding:"2rem" }}>
        <div style={{ textAlign:"center", maxWidth:400, animation:"fadeUp .5s ease both" }}>
          <div style={{ fontSize:"3.5rem", marginBottom:"1rem" }}>🎉</div>
          <div style={{ fontWeight:800, fontSize:"1.3rem", color:"var(--green)", marginBottom:".5rem" }}>
            ¡Registro completado!
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:".72rem", color:"var(--text-muted)", lineHeight:1.7 }}>
            Hemos recibido tu solicitud.<br/>El equipo organizador la revisará y te confirmará por teléfono o email.
          </div>

          {/* Bloque de acceso al portal */}
          <div style={{ background:"rgba(34,211,238,.06)", border:"1px solid rgba(34,211,238,.2)",
            borderRadius:10, padding:".9rem 1rem", marginTop:"1.25rem", textAlign:"left" }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:".7rem", fontWeight:800,
              color:"var(--cyan)", marginBottom:".5rem" }}>
              📱 Tu ficha personal de voluntario
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:".65rem", color:"var(--text-muted)", lineHeight:1.8 }}>
              Cuando te confirmemos, accede con:<br/>
              · Tu número de teléfono<br/>
              · PIN inicial: <strong style={{color:"var(--cyan)"}}>
                {form.telefono ? form.telefono.replace(/\D/g,'').slice(-4) : 'últimos 4 dígitos'}
              </strong>
              <span style={{opacity:.7}}> (últimos 4 dígitos de tu teléfono)</span>
            </div>
            <div style={{ marginTop:".75rem", display:"flex", gap:".5rem" }}>
              <button
                style={{ flex:1, padding:".55rem", background:"var(--cyan)", color:"#0f172a",
                  border:"none", borderRadius:8, fontWeight:800, fontSize:".72rem",
                  cursor:"pointer", fontFamily:"var(--font-mono)" }}
                onClick={() => {
                  const url = window.location.origin + "/voluntarios/mi-ficha";
                  navigator.clipboard?.writeText(url).then(() => {
                    const btn = document.getElementById("copy-portal-btn");
                    if(btn) { btn.textContent = "✓ Copiado"; setTimeout(() => { btn.textContent = "Guardar enlace"; }, 2000); }
                  });
                }}
                id="copy-portal-btn">
                Guardar enlace
              </button>
            </div>
          </div>

          <button onClick={() => window.close()} className="pub-btn-primary" style={{ marginTop:"1rem" }}>
            ✕ Cerrar ventana
          </button>
          <div style={{ marginTop:".75rem", fontFamily:"var(--font-mono)",
            fontSize:".58rem", color:"var(--text-dim)", lineHeight:1.6 }}>
            Si el botón no funciona, cierra esta pestaña manualmente.
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:"var(--bg)",
        backgroundImage:"radial-gradient(ellipse 70% 50% at 50% 0%, rgba(34,211,238,0.07) 0%, transparent 60%)" }}>
        {errorEnvio && (
          <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)",
            background:"rgba(248,113,113,.15)", border:"1px solid rgba(248,113,113,.4)",
            borderRadius:8, padding:".6rem 1.2rem", fontFamily:"var(--font-mono)",
            fontSize:".7rem", color:"var(--red)", zIndex:999, maxWidth:"90vw",
            textAlign:"center" }}>
            ⚠️ {errorEnvio}
          </div>
        )}
        <StepperForm
          puestos={puestos}
          imgFront={imgFront   || SHIRT_FRONT}
          imgBack={imgBack     || SHIRT_BACK}
          imgGuiaTallas={imgGuiaTallas}
          opcionPuesto={opcionPuesto}
          opcionVehiculo={opcionVehiculo}
          opcionEmail={opcionEmail}
          opcionEmergencia={opcionEmergencia}
          enviando={enviando}
          onRegistrar={addVoluntario}
        />
      </div>
    </>
  );
}

// ── StepperForm — 3 pasos ─────────────────────────────────────────────────────
function StepperForm({ puestos, imgFront, imgBack, imgGuiaTallas, opcionPuesto, opcionVehiculo, opcionEmail, opcionEmergencia, onRegistrar, enviando }) {
  const [paso, setPaso]       = useState(1);
  const [dir,  setDir]        = useState(1);   // 1 = adelante, -1 = atrás
  const [form, setForm]       = useState({
    nombre:"", apellidos:"", telefono:"",
    talla:"", puestoId:"", coche:false,
  });
  const [errores, setErrores] = useState({});
  const [lightbox, setLightbox]     = useState(null);
  const [guiaTallas, setGuiaTallas] = useState(false);
  const stepRef = useRef(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Focus al inicio del paso al cambiar
  useEffect(() => {
    const t = setTimeout(() => {
      const firstInput = stepRef.current?.querySelector("input, select");
      if (firstInput) firstInput.focus();
    }, 120);
    return () => clearTimeout(t);
  }, [paso]);

  // ── Validación por paso ──────────────────────────────────────────────────
  const validarPaso1 = () => {
    const e = {};
    if (!form.nombre.trim())    e.nombre    = "Requerido";
    if (!form.apellidos.trim()) e.apellidos = "Requerido";
    if (!form.telefono.trim() || !/^\d{9}$/.test(form.telefono.replace(/\s/g,"")))
      e.telefono = "Teléfono de 9 dígitos";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const validarPaso2 = () => {
    const e = {};
    if (!form.talla) e.talla = "Selecciona una talla";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const irA = (n) => {
    setDir(n > paso ? 1 : -1);
    setErrores({});
    setPaso(n);
  };

  const siguiente = () => {
    if (paso === 1 && !validarPaso1()) return;
    if (paso === 2 && !validarPaso2()) return;
    irA(paso + 1);
  };

  const anterior = () => irA(paso - 1);

  const handleSubmit = () => {
    onRegistrar({
      nombre:   `${form.nombre.trim()} ${form.apellidos.trim()}`,
      telefono: form.telefono.trim(),
      ...(opcionEmail ? { email: form.email?.trim() || "" } : {}),
      talla:    form.talla,
      puestoId: form.puestoId ? parseInt(form.puestoId) : null,
      coche:    form.coche,
      notas:    "",
      fechaRegistro: new Date().toISOString().split("T")[0],
      ...(opcionEmergencia ? { telefonoEmergencia: form.telefonoEmergencia?.trim() || "", contactoEmergencia: form.telefonoEmergencia?.trim() || "" } : {}),
    });
  };

  // ── Lightbox camiseta ────────────────────────────────────────────────────
  const renderLightbox = () => (
    <div onClick={() => setLightbox(null)}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:200,
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"1rem", backdropFilter:"blur(8px)", animation:"fadeUp 0.15s ease" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ position:"relative", maxWidth:480, width:"100%", animation:"slideUp 0.2s ease" }}>
        <button onClick={() => setLightbox(null)} aria-label="Cerrar"
          style={{ position:"absolute", top:-14, right:-14, zIndex:10, width:32, height:32,
            borderRadius:"50%", background:"var(--surface)", border:"1px solid var(--border)",
            color:"var(--text)", cursor:"pointer", fontSize:"0.9rem",
            display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        <div style={{ background:"var(--surface)", border:"1px solid var(--border-light)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"0.75rem 1rem", borderBottom:"1px solid var(--border)",
            fontFamily:"var(--font-mono)", fontSize:"0.7rem", color:"var(--text-muted)", display:"flex", gap:"0.75rem" }}>
            {["front","back"].map(side => (
              <button key={side} onClick={() => setLightbox(side)}
                style={{ background:"none", border:"none", cursor:"pointer",
                  color: lightbox===side ? "var(--cyan)" : "var(--text-muted)",
                  fontFamily:"var(--font-mono)", fontSize:"0.7rem", fontWeight:700,
                  paddingBottom:"0.15rem",
                  borderBottom: lightbox===side ? "2px solid var(--cyan)" : "2px solid transparent" }}>
                {side==="front" ? "Vista delantera" : "Vista trasera"}
              </button>
            ))}
          </div>
          <img src={lightbox==="front" ? imgFront : imgBack}
            alt={lightbox==="front" ? "Camiseta delantera" : "Camiseta trasera"}
            style={{ width:"100%", display:"block", maxHeight:"70vh", objectFit:"contain" }} />
        </div>
        <div style={{ textAlign:"center", marginTop:"0.6rem", fontFamily:"var(--font-mono)", fontSize:"0.6rem", color:"var(--text-dim)" }}>
          Toca fuera para cerrar
        </div>
      </div>
    </div>
  );

  // ── Modal guía de tallas ─────────────────────────────────────────────────
  const renderGuiaTallas = () => (
    <div onClick={() => setGuiaTallas(false)}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:200,
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"1rem", backdropFilter:"blur(6px)", animation:"fadeUp 0.15s ease" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:"var(--surface)", border:"1px solid var(--border-light)", borderRadius:16,
          maxWidth:480, width:"100%", maxHeight:"85vh", overflow:"hidden",
          display:"flex", flexDirection:"column", animation:"slideUp 0.2s ease" }}>
        <div style={{ padding:"1rem 1.25rem", borderBottom:"1px solid var(--border)",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.95rem" }}>📐 Guía de tallas</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem", color:"var(--text-muted)", marginTop:"0.2rem" }}>
              Medidas en cm — mide sobre la camiseta plana
            </div>
          </div>
          <button onClick={() => setGuiaTallas(false)} aria-label="Cerrar guía de tallas"
            style={{ background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", fontSize:"1.1rem" }}>✕</button>
        </div>
        {imgGuiaTallas && (
          <div style={{ padding:"0.75rem 1.25rem", borderBottom:"1px solid var(--border)" }}>
            <img src={imgGuiaTallas} alt="Guía de tallas"
              style={{ width:"100%", borderRadius:8, objectFit:"contain", maxHeight:"40vh" }} />
          </div>
        )}
        <div style={{ overflowY:"auto", flex:1 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
            <thead>
              <tr style={{ background:"var(--surface2)" }}>
                {["TALLA","PECHO (cm)","LARGO (cm)","HOMBRO (cm)"].map((h,i) => (
                  <th key={h} style={{ padding:"0.5rem 0.75rem", textAlign: i===0?"left":"center",
                    fontFamily:"var(--font-mono)", fontSize:"0.65rem", color:"var(--text-muted)",
                    borderBottom:"1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GUIA_TALLAS.map((row, i) => (
                <tr key={row.talla}
                  style={{ background: i%2===0?"transparent":"rgba(30,45,80,0.2)", cursor:"pointer" }}
                  onClick={() => { set("talla", row.talla); setGuiaTallas(false); }}>
                  <td style={{ padding:"0.5rem 0.75rem", fontFamily:"var(--font-mono)", fontWeight:700,
                    color: form.talla===row.talla ? "var(--cyan)" : "var(--text)",
                    borderBottom:"1px solid rgba(30,45,80,0.3)" }}>
                    {row.talla}{form.talla===row.talla && <span style={{ color:"var(--green)", fontSize:"0.7rem" }}> ✓</span>}
                  </td>
                  {[row.pecho, row.largo, row.hombro].map((v,j) => (
                    <td key={j} style={{ padding:"0.5rem 0.75rem", textAlign:"center",
                      fontFamily:"var(--font-mono)", color:"var(--text)",
                      borderBottom:"1px solid rgba(30,45,80,0.3)" }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding:"0.75rem 1rem", fontFamily:"var(--font-mono)", fontSize:"0.6rem", color:"var(--text-dim)" }}>
            💡 Toca una fila para seleccionar esa talla directamente
          </div>
        </div>
      </div>
    </div>
  );

  // ── Render principal ─────────────────────────────────────────────────────
  return (
    <>
      {lightbox    && renderLightbox()}
      {guiaTallas  && renderGuiaTallas()}

      <div style={{ maxWidth:560, margin:"0 auto", padding:"2rem 1.25rem 4rem" }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:"2rem", animation:"fadeUp 0.4s ease both" }}>
          <div style={{ fontSize:"0.6rem", fontFamily:"var(--font-mono)", color:"var(--cyan)",
            letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:"0.5rem" }}>
            🏔️ Candeleda · Ávila · 29 AGO 2026
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(1.8rem,5vw,2.6rem)",
            fontWeight:800, lineHeight:1, marginBottom:"0.5rem",
            background:"linear-gradient(135deg,#fff 0%,var(--cyan) 60%,var(--violet) 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            Trail El Guerrero
          </h1>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.85rem", color:"var(--text-muted)", marginBottom:"1.25rem" }}>
            Formulario de inscripción de voluntarios
          </div>
          <div style={{ display:"inline-flex", gap:"1.5rem", background:"var(--surface)",
            border:"1px solid var(--border)", borderRadius:10, padding:"0.6rem 1.25rem" }}>
            {Object.entries(DIST_COLORS).map(([k,c]) => (
              <div key={k} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.65rem", fontWeight:700, color:c }}>{k}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem", color:"var(--text-muted)" }}>
                  {k==="TG7"?"7 km":k==="TG13"?"13 km":"25 km"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tarjeta del stepper */}
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16,
          overflow:"hidden", animation:"fadeUp 0.5s 0.1s ease both" }}>

          {/* Cabecera con barra de progreso */}
          <div style={{ background:"linear-gradient(135deg,rgba(34,211,238,0.1),rgba(167,139,250,0.08))",
            borderBottom:"1px solid var(--border)", padding:"1rem 1.5rem" }}>
            {/* Barra de 3 segmentos */}
            <div className="step-bar">
              {STEPS.map(s => (
                <div key={s.n} className={
                  `step-seg ${s.n < paso ? "done" : s.n === paso ? "active" : ""}`
                } />
              ))}
            </div>
            {/* Etiqueta del paso actual */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:".62rem", color:"var(--text-muted)" }}>
                Paso {paso} de {STEPS.length}
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:".62rem", color:"var(--cyan)", fontWeight:700 }}>
                {STEPS[paso-1].icon} {STEPS[paso-1].label}
              </div>
            </div>
          </div>

          {/* Contenido del paso */}
          <div ref={stepRef} style={{ padding:"1.5rem",
            animation: dir >= 0 ? "stepIn .25s ease both" : "stepInBack .25s ease both" }}>

            {/* ── PASO 1: ¿Quién eres? ───────────────────────────────────── */}
            {paso === 1 && (
              <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
                <div className="step-header">
                  <div className="step-icon">👤</div>
                  <div>
                    <div className="step-title">¿Quién eres?</div>
                    <div className="step-sub">Datos personales básicos para contactarte</div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
                  <Field label="Nombre *" error={errores.nombre}>
                    <input className={`pub-input${errores.nombre?" error":""}`}
                      placeholder="Ej: María"
                      value={form.nombre} onChange={e => set("nombre", e.target.value)} />
                  </Field>
                  <Field label="Apellidos *" error={errores.apellidos}>
                    <input className={`pub-input${errores.apellidos?" error":""}`}
                      placeholder="Ej: García López"
                      value={form.apellidos} onChange={e => set("apellidos", e.target.value)} />
                  </Field>
                </div>
                <Field label="Teléfono *" error={errores.telefono}
                  hint="Se usará para coordinación el día de carrera">
                  <input className={`pub-input${errores.telefono?" error":""}`}
                    placeholder="612 345 678" inputMode="tel"
                    value={form.telefono} onChange={e => set("telefono", e.target.value)} />
                </Field>
                {opcionEmail && (
                  <Field label="Email" error={errores.email}
                    hint="Para comunicaciones previas a la carrera">
                    <input className={`pub-input${errores.email?" error":""}`}
                      type="email" placeholder="tu@email.com" inputMode="email"
                      autoCapitalize="none"
                      value={form.email || ""} onChange={e => set("email", e.target.value)} />
                  </Field>
                )}
                {opcionEmergencia && (
                  <Field label="Teléfono de emergencia" error={errores.telefonoEmergencia}
                    hint="Persona a avisar en caso de incidente el día del evento">
                    <input className={`pub-input${errores.telefonoEmergencia?" error":""}`}
                      type="tel" placeholder="612 345 678" inputMode="tel"
                      value={form.telefonoEmergencia || ""}
                      onChange={e => set("telefonoEmergencia", e.target.value)} />
                  </Field>
                )}
                <div className="step-nav">
                  <button className="pub-btn-primary" onClick={siguiente}>
                    Continuar →
                  </button>
                </div>
              </div>
            )}

            {/* ── PASO 2: Tu participación ───────────────────────────────── */}
            {paso === 2 && (
              <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
                <div className="step-header">
                  <div className="step-icon">🏃</div>
                  <div>
                    <div className="step-title">Tu participación</div>
                    <div className="step-sub">Talla de camiseta y preferencias operativas</div>
                  </div>
                </div>

                {/* Camiseta + selector talla */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
                  {[
                    { side:"front", label:"Delantera", src:imgFront, accent:"var(--cyan)" },
                    { side:"back",  label:"Trasera",   src:imgBack,  accent:"var(--violet)" },
                  ].map(({ side, label, src, accent }) => (
                    <div key={side} onClick={() => setLightbox(side)}
                      style={{ cursor:"pointer", borderRadius:10, overflow:"hidden",
                        border:`1px solid ${accent}33`, background:"var(--surface2)",
                        transition:"all 0.18s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor=accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=`${accent}33`; }}>
                      <img src={src} alt={label}
                        style={{ width:"100%", height:120, objectFit:"cover", display:"block" }} />
                      <div style={{ padding:".35rem .6rem", display:"flex", alignItems:"center",
                        justifyContent:"space-between", borderTop:`1px solid ${accent}22` }}>
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:".58rem", color:"var(--text-muted)" }}>{label}</span>
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:".58rem", color:accent }}>🔍</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:".4rem" }}>
                    <label style={{ fontFamily:"var(--font-display)", fontSize:".78rem", fontWeight:600,
                      color: errores.talla ? "var(--red)" : "var(--text)" }}>
                      Talla de camiseta *
                    </label>
                    <button onClick={() => setGuiaTallas(true)}
                      style={{ background:"var(--cyan-dim)", color:"var(--cyan)",
                        border:"1px solid rgba(34,211,238,0.2)", borderRadius:5,
                        padding:".18rem .55rem", fontFamily:"var(--font-mono)",
                        fontSize:".6rem", fontWeight:700, cursor:"pointer" }}>
                      📐 Guía de tallas
                    </button>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:".4rem" }}>
                    {TALLAS.map(t => (
                      <button key={t} onClick={() => set("talla", t)}
                        style={{ padding:".45rem .7rem", borderRadius:7,
                          border:`1px solid ${form.talla===t ? "var(--cyan)" : "var(--border)"}`,
                          background: form.talla===t ? "var(--cyan-dim)" : "var(--surface2)",
                          color: form.talla===t ? "var(--cyan)" : "var(--text-muted)",
                          fontFamily:"var(--font-mono)", fontSize:".72rem", fontWeight:700,
                          cursor:"pointer", transition:"all 0.15s",
                          transform: form.talla===t ? "scale(1.08)" : "scale(1)" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                  {errores.talla && (
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:".62rem", color:"var(--red)", marginTop:".3rem" }}>
                      ⚠ {errores.talla}
                    </div>
                  )}
                </div>

                {opcionPuesto && (
                  <Field label="Puesto preferido" hint="Opcional — el organizador hará la asignación final">
                    <select className="pub-input" value={form.puestoId}
                      onChange={e => set("puestoId", e.target.value)}
                      style={{ appearance:"none" }}>
                      <option value="">Sin preferencia</option>
                      {puestos.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} ({p.tipo})</option>
                      ))}
                    </select>
                  </Field>
                )}

                {opcionVehiculo && (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    background:"var(--surface2)", border:"1px solid var(--border)",
                    borderRadius:10, padding:".85rem 1rem" }}>
                    <div>
                      <div style={{ fontFamily:"var(--font-display)", fontSize:".82rem", fontWeight:600 }}>
                        ¿Dispones de vehículo propio?
                      </div>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:".6rem", color:"var(--text-muted)", marginTop:".15rem" }}>
                        Puede facilitar el traslado a puestos remotos
                      </div>
                    </div>
                    <button onClick={() => set("coche", !form.coche)}
                      aria-label={form.coche ? "Desactivar vehículo propio" : "Activar vehículo propio"}
                      style={{ width:48, height:26, borderRadius:13, flexShrink:0,
                        background: form.coche ? "var(--green)" : "var(--surface3)",
                        border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
                      <span style={{ position:"absolute", top:3, width:20, height:20, borderRadius:"50%",
                        background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)",
                        left: form.coche ? 25 : 3 }} />
                    </button>
                  </div>
                )}

                <div className="step-nav">
                  <button className="pub-btn-ghost" onClick={anterior}>← Atrás</button>
                  <button className="pub-btn-primary" onClick={siguiente}>
                    Revisar registro →
                  </button>
                </div>
              </div>
            )}

            {/* ── PASO 3: Confirmación ───────────────────────────────────── */}
            {paso === 3 && (
              <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
                <div className="step-header">
                  <div className="step-icon">✅</div>
                  <div>
                    <div className="step-title">Revisa y confirma</div>
                    <div className="step-sub">Comprueba tus datos antes de enviar</div>
                  </div>
                </div>

                <div style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                  borderRadius:12, padding:"1rem 1.25rem" }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:".6rem", color:"var(--text-muted)",
                    textTransform:"uppercase", letterSpacing:".09em", marginBottom:".75rem" }}>
                    Tus datos
                  </div>
                  {[
                    ["Nombre",   `${form.nombre} ${form.apellidos}`],
                    ["Teléfono", form.telefono],
                    ["Talla",    form.talla],
                    ...(opcionPuesto && form.puestoId
                      ? [["Puesto", puestos.find(p=>String(p.id)===String(form.puestoId))?.nombre || form.puestoId]]
                      : []),
                    ...(opcionVehiculo
                      ? [["Vehículo propio", form.coche ? "Sí ✓" : "No"]]
                      : []),
                  ].map(([k,v]) => (
                    <div key={k} className="summary-row">
                      <span className="summary-key">{k}</span>
                      <span className="summary-val">{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ fontFamily:"var(--font-mono)", fontSize:".62rem", color:"var(--text-muted)",
                  lineHeight:1.65, background:"var(--surface2)", borderRadius:8, padding:".75rem 1rem",
                  borderLeft:"3px solid rgba(34,211,238,.3)" }}>
                  Al registrarte aceptas que tus datos se usen exclusivamente para la coordinación
                  del Trail El Guerrero 2026 · Candeleda, Ávila.
                </div>

                <div className="step-nav">
                  <button className="pub-btn-ghost" onClick={anterior}>← Atrás</button>
                  <button className="pub-btn-primary" onClick={handleSubmit}
                    disabled={enviando}
                    style={{ opacity: enviando ? .65 : 1, cursor: enviando ? "not-allowed" : "pointer" }}>
                    {enviando ? "Enviando…" : "✓ Registrarme como voluntario"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        <div style={{ textAlign:"center", marginTop:"1.25rem", fontFamily:"var(--font-mono)",
          fontSize:"0.6rem", color:"var(--text-dim)", lineHeight:1.6 }}>
          Tus datos se usarán exclusivamente para la coordinación del evento.<br />
          Organiza: Club Trail El Guerrero · Candeleda, Ávila
        </div>

      </div>
    </>
  );
}

// ── Helper Field ──────────────────────────────────────────────────────────────
function Field({ label, error, hint, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"0.35rem" }}>
      <label style={{ fontFamily:"var(--font-display)", fontSize:"0.78rem", fontWeight:600,
        color: error ? "var(--red)" : "var(--text)" }}>{label}</label>
      {hint && (
        <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem", color:"var(--text-muted)", marginTop:"-0.15rem" }}>
          {hint}
        </div>
      )}
      {children}
      {error && (
        <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem", color:"var(--red)" }}>⚠ {error}</div>
      )}
    </div>
  );
}
