/**
 * PublicVolunteerForm — componente AUTÓNOMO para /voluntarios/registro
 * No depende de ningún otro bloque. Tiene todo lo necesario inline.
 */
import { useState, useEffect } from "react";
// Sin useData — este formulario usa el endpoint público /api/data/public
// que NO requiere la clave privada del panel de gestión.

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

  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
`;

// ── Componente principal ──────────────────────────────────────────────────────
// Usa /api/data/public — endpoint SIN clave privada con lista blanca estricta.
// No usa useData ni la VITE_API_KEY del panel de gestión.
const PUBLIC_API = "/api/data/public";

async function fetchPublic(collection) {
  try {
    const res = await fetch(`${PUBLIC_API}?collection=${collection}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export default function PublicVolunteerForm() {
  const [puestos,       setPuestos]       = useState([]);
  const [imgFront,      setImgFront]      = useState(null);
  const [imgBack,       setImgBack]       = useState(null);
  const [imgGuiaTallas, setImgGuiaTallas] = useState(null);
  const [opcionPuesto,  setOpcionPuesto]  = useState(true);
  const [opcionVehiculo,setOpcionVehiculo]= useState(true);
  const [loading,       setLoading]       = useState(true);
  const [enviando,      setEnviando]      = useState(false);
  const [registroOk,    setRegistroOk]    = useState(false);
  const [errorEnvio,    setErrorEnvio]    = useState(null);

  // Cargar configuración del formulario desde el endpoint público
  useEffect(() => {
    Promise.all([
      fetchPublic(LS_KEY + "_puestos"),
      fetchPublic(LS_KEY + "_imgFront"),
      fetchPublic(LS_KEY + "_imgBack"),
      fetchPublic(LS_KEY + "_imgGuiaTallas"),
      fetchPublic(LS_KEY + "_opcionPuesto"),
      fetchPublic(LS_KEY + "_opcionVehiculo"),
    ]).then(([psts, front, back, guia, opPuesto, opVehiculo]) => {
      if (Array.isArray(psts))        setPuestos(psts);
      if (front)                      setImgFront(front);
      if (back)                       setImgBack(back);
      if (guia)                       setImgGuiaTallas(guia);
      if (opPuesto  !== null)         setOpcionPuesto(Boolean(opPuesto));
      if (opVehiculo !== null)        setOpcionVehiculo(Boolean(opVehiculo));
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
        <div style={{ textAlign:"center", maxWidth:400 }}>
          <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>✅</div>
          <div style={{ fontWeight:800, fontSize:"1.2rem", color:"var(--green)", marginBottom:".5rem" }}>
            ¡Registro completado!
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:".72rem", color:"var(--text-muted)", lineHeight:1.6 }}>
            Hemos recibido tu solicitud. El equipo organizador la revisará y te confirmará por teléfono o email.
          </div>
          <div style={{ marginTop:"1.5rem", fontFamily:"var(--font-mono)",
            fontSize:".62rem", color:"var(--text-dim)", lineHeight:1.6 }}>
            Puedes cerrar esta ventana.
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
        <Formulario
          puestos={puestos}
          imgFront={imgFront || SHIRT_FRONT}
          imgBack={imgBack   || SHIRT_BACK}
          imgGuiaTallas={imgGuiaTallas}
          opcionPuesto={opcionPuesto}
          opcionVehiculo={opcionVehiculo}
          enviando={enviando}
          onRegistrar={addVoluntario}
        />
      </div>
    </>
  );
}

// ── Formulario (self-contained) ───────────────────────────────────────────────
function Formulario({ puestos, imgFront, imgBack, imgGuiaTallas, opcionPuesto, opcionVehiculo, onRegistrar, enviando }) {
  const [form, setForm]       = useState({ nombre:"", apellidos:"", telefono:"", talla:"", puestoId:"", coche:false });
  const [errores, setErrores] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [lightbox, setLightbox]   = useState(null);   // null | "front" | "back"
  const [guiaTallas, setGuiaTallas] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validar = () => {
    const e = {};
    if (!form.nombre.trim())    e.nombre    = "Requerido";
    if (!form.apellidos.trim()) e.apellidos = "Requerido";
    if (!form.telefono.trim() || !/^\d{9}$/.test(form.telefono.replace(/\s/g,"")))
      e.telefono = "Teléfono de 9 dígitos";
    if (!form.talla) e.talla = "Selecciona talla";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validar()) return;
    onRegistrar({
      nombre:   `${form.nombre.trim()} ${form.apellidos.trim()}`,
      telefono: form.telefono.trim(),
      email:    "",
      talla:    form.talla,
      puestoId: form.puestoId ? parseInt(form.puestoId) : null,
      coche:    form.coche,
      notas:    "",
    });
    setEnviado(true);
  };

  // ── Pantalla de éxito ────────────────────────────────────────────────────
  if (enviado) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem" }}>
      <div style={{ maxWidth:480, textAlign:"center", animation:"fadeUp 0.5s ease both" }}>
        <div style={{ fontSize:"4rem", marginBottom:"1rem" }}>🎉</div>
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:"1.8rem", fontWeight:800, color:"var(--green)", marginBottom:"0.75rem" }}>
          ¡Registro completado!
        </h2>
        <p style={{ color:"var(--text-muted)", fontFamily:"var(--font-mono)", fontSize:"0.85rem", lineHeight:1.7, marginBottom:"1.5rem" }}>
          Gracias por apuntarte como voluntario del{" "}
          <strong style={{ color:"var(--text)" }}>Trail El Guerrero 2026</strong>.<br />
          El equipo organizador se pondrá en contacto contigo próximamente por WhatsApp o teléfono.
        </p>
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:"1rem 1.5rem", marginBottom:"1.5rem", textAlign:"left" }}>
          <div style={{ fontSize:"0.65rem", fontFamily:"var(--font-mono)", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.75rem" }}>
            Tu registro
          </div>
          {[["Nombre",`${form.nombre} ${form.apellidos}`],["Teléfono",form.telefono],["Talla",form.talla]].map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:"0.82rem", marginBottom:"0.3rem" }}>
              <span style={{ color:"var(--text-muted)" }}>{k}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontWeight:700 }}>{v}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );

  // ── Lightbox camiseta ────────────────────────────────────────────────────
  const renderLightbox = () => (
    <div onClick={() => setLightbox(null)}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:200,
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"1rem", backdropFilter:"blur(8px)", animation:"fadeUp 0.15s ease" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ position:"relative", maxWidth:480, width:"100%", animation:"slideUp 0.2s ease" }}>
        <button onClick={() => setLightbox(null)}
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
          <button onClick={() => setGuiaTallas(false)}
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

        {/* Fotos camiseta */}
        <div style={{ marginBottom:"1.25rem" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem", color:"var(--text-muted)",
            textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.6rem" }}>
            👕 Camiseta técnica de voluntario
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
            {[
              { side:"front", label:"Vista delantera", src:imgFront, accent:"var(--cyan)" },
              { side:"back",  label:"Vista trasera",   src:imgBack,  accent:"var(--violet)" },
            ].map(({ side, label, src, accent }) => (
              <div key={side} onClick={() => setLightbox(side)}
                style={{ cursor:"pointer", borderRadius:12, overflow:"hidden",
                  border:`1px solid ${accent}33`, background:"var(--surface)",
                  transition:"all 0.18s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=accent; e.currentTarget.style.transform="translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=`${accent}33`; e.currentTarget.style.transform=""; }}>
                <img src={src} alt={label}
                  style={{ width:"100%", height:160, objectFit:"cover", display:"block" }} />
                <div style={{ padding:"0.45rem 0.65rem", display:"flex", alignItems:"center",
                  justifyContent:"space-between", borderTop:`1px solid ${accent}22` }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem", color:"var(--text-muted)" }}>{label}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem", color:accent }}>🔍 Ver</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tarjeta del formulario */}
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16,
          overflow:"hidden", animation:"fadeUp 0.5s 0.1s ease both" }}>
          <div style={{ background:"linear-gradient(135deg,rgba(34,211,238,0.1),rgba(167,139,250,0.08))",
            borderBottom:"1px solid var(--border)", padding:"1rem 1.5rem" }}>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.9rem" }}>Datos del voluntario</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem", color:"var(--text-muted)", marginTop:"0.2rem" }}>
              Todos los campos con * son obligatorios
            </div>
          </div>

          <div style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.1rem" }}>

            {/* Nombre + Apellidos */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
              <Field label="Nombre *" error={errores.nombre}>
                <input className="pub-input" placeholder="Ej: María"
                  value={form.nombre} onChange={e => set("nombre", e.target.value)} />
              </Field>
              <Field label="Apellidos *" error={errores.apellidos}>
                <input className="pub-input" placeholder="Ej: García López"
                  value={form.apellidos} onChange={e => set("apellidos", e.target.value)} />
              </Field>
            </div>

            {/* Teléfono */}
            <Field label="Teléfono *" error={errores.telefono} hint="Se usará para coordinación el día de carrera">
              <input className="pub-input" placeholder="612 345 678" inputMode="tel"
                value={form.telefono} onChange={e => set("telefono", e.target.value)} />
            </Field>

            {/* Talla */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.4rem" }}>
                <label style={{ fontFamily:"var(--font-display)", fontSize:"0.78rem", fontWeight:600,
                  color: errores.talla ? "var(--red)" : "var(--text)" }}>
                  Talla de camiseta *
                </label>
                <button onClick={() => setGuiaTallas(true)}
                  style={{ background:"var(--cyan-dim)", color:"var(--cyan)",
                    border:"1px solid rgba(34,211,238,0.2)", borderRadius:5,
                    padding:"0.18rem 0.55rem", fontFamily:"var(--font-mono)",
                    fontSize:"0.6rem", fontWeight:700, cursor:"pointer" }}>
                  📐 Guía de tallas
                </button>
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem", color:"var(--text-muted)", marginBottom:"0.5rem" }}>
                Recibirás una camiseta técnica · Consulta la guía si tienes dudas
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem" }}>
                {TALLAS.map(t => (
                  <button key={t} onClick={() => set("talla", t)}
                    style={{ padding:"0.45rem 0.7rem", borderRadius:7,
                      border:`1px solid ${form.talla===t ? "var(--cyan)" : "var(--border)"}`,
                      background: form.talla===t ? "var(--cyan-dim)" : "var(--surface2)",
                      color: form.talla===t ? "var(--cyan)" : "var(--text-muted)",
                      fontFamily:"var(--font-mono)", fontSize:"0.72rem", fontWeight:700,
                      cursor:"pointer", transition:"all 0.15s",
                      transform: form.talla===t ? "scale(1.08)" : "scale(1)" }}>
                    {t}
                  </button>
                ))}
              </div>
              {errores.talla && (
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem", color:"var(--red)", marginTop:"0.3rem" }}>
                  ⚠ {errores.talla}
                </div>
              )}
            </div>

            {/* Puesto (opcional) */}
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

            {/* Vehículo (opcional) */}
            {opcionVehiculo && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                background:"var(--surface2)", border:"1px solid var(--border)",
                borderRadius:10, padding:"0.85rem 1rem" }}>
                <div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:"0.82rem", fontWeight:600 }}>
                    ¿Dispones de vehículo propio?
                  </div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem", color:"var(--text-muted)", marginTop:"0.15rem" }}>
                    Puede facilitar el traslado a puestos remotos
                  </div>
                </div>
                <button onClick={() => set("coche", !form.coche)}
                  style={{ width:48, height:26, borderRadius:13, flexShrink:0,
                    background: form.coche ? "var(--green)" : "var(--surface3)",
                    border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
                  <span style={{ position:"absolute", top:3, width:20, height:20, borderRadius:"50%",
                    background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)",
                    left: form.coche ? 25 : 3 }} />
                </button>
              </div>
            )}

            {/* Botón envío */}
            <button onClick={handleSubmit}
              style={{ width:"100%", padding:"0.85rem",
                background:"linear-gradient(135deg,rgba(34,211,238,0.2),rgba(167,139,250,0.15))",
                border:"1px solid rgba(34,211,238,0.35)", borderRadius:10,
                color:"var(--text)", fontFamily:"var(--font-display)",
                fontSize:"0.9rem", fontWeight:800, cursor:"pointer",
                letterSpacing:"0.03em", transition:"all 0.18s", marginTop:"0.25rem" }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(34,211,238,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}>
              ✓ Registrarme como voluntario
            </button>
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
