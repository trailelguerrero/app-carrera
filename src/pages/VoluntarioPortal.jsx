/**
 * VoluntarioPortal — URL única: /voluntarios/mi-ficha
 *
 * Estados principales:
 *   landing  → pantalla de bienvenida con dos opciones
 *   registro → formulario de registro en 3 pasos (incrustado)
 *   login    → autenticación en 2 pasos (teléfono + PIN)
 *   portal   → ficha personal del voluntario autenticado
 */
import React, { useState, useEffect, useRef, useCallback } from "react";

const API_BASE   = "/api/voluntarios";
const PUBLIC_API = "/api/data/public";
const LS_KEY_VOL = "teg_voluntarios_v1";
const SESSION_KEY = "teg_vol_session";
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

function loadSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (!raw) return null;
    if (raw.ts && Date.now() - raw.ts > SESSION_TTL) { localStorage.removeItem(SESSION_KEY); return null; }
    return raw;
  } catch { return null; }
}
function saveSession(data) { localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, ts: Date.now() })); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

async function fetchPublic(collection) {
  try {
    const res = await fetch(`${PUBLIC_API}?collection=${collection}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── Constantes ────────────────────────────────────────────────────────────────
const TALLAS = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"];
const TALLAS_PORTAL = ["XS","S","M","L","XL","XXL","3XL"];

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

const LOGO_TEG = "data:image/webp;base64,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";

// ── CSS unificado ─────────────────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { background: #0f172a; color: #e2e8f0;
    font-family: 'Syne', 'Inter', system-ui, sans-serif; min-height: 100dvh; }
  :root {
    --bg: #080c18; --bg2: #0f172a;
    --cyan:   #22d3ee; --cyan-dim:   rgba(34,211,238,.1);  --cyan-border: rgba(34,211,238,.25);
    --green:  #34d399; --green-dim:  rgba(52,211,153,.1);  --green-border: rgba(52,211,153,.3);
    --amber:  #fbbf24; --amber-dim:  rgba(251,191,36,.1);  --amber-border: rgba(251,191,36,.3);
    --violet: #a78bfa; --violet-dim: rgba(167,139,250,.1); --violet-border: rgba(167,139,250,.3);
    --red:    #f87171; --red-dim:    rgba(248,113,113,.1); --red-border:   rgba(248,113,113,.3);
    --surface:  #1e293b; --surface2: #263347; --surface3: #2d3f57;
    --border: rgba(148,163,184,.15); --border2: rgba(148,163,184,.25); --border-light: #2a3f6a;
    --text: #e2e8f0; --text-muted: #94a3b8; --text-dim: #475569;
    --font-display: 'Syne', sans-serif; --font-mono: 'DM Mono', monospace;
    --r: 12px; --r-sm: 8px;
  }

  /* ── Layout ── */
  .vp-page   { min-height: 100dvh; display: flex; flex-direction: column; }
  .vp-wrap   { max-width: 460px; margin: 0 auto; padding: 1.25rem 1rem 5rem; width: 100%; }
  .vp-topbar { display:flex; align-items:center; justify-content:space-between;
    padding:.75rem 1rem; background:var(--surface); border-bottom:1px solid var(--border);
    position:sticky; top:0; z-index:10; }

  /* ── Cards ── */
  .vp-card { background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r); padding: 1.1rem; margin-bottom: .75rem; }
  .vp-card-header { display: flex; align-items: center; justify-content: space-between;
    margin-bottom: .65rem; }

  /* ── Typography ── */
  .vp-label     { font-family: var(--font-mono); font-size: .75rem; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase; color: var(--text-muted); margin-bottom: .45rem; }
  .vp-step-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 800;
    color: var(--text); margin-bottom: .4rem; }
  .vp-step-desc  { font-family: var(--font-mono); font-size: .85rem; color: var(--text-muted);
    line-height: 1.7; margin-bottom: 1rem; }
  .vp-mono  { font-family: var(--font-mono); }
  .vp-value { font-family: var(--font-mono); font-size: .9rem; color: var(--text); }

  /* ── Botones globales ── */
  .vp-btn { display: flex; align-items: center; justify-content: center; gap: .4rem;
    width: 100%; padding: .85rem 1rem; border-radius: var(--r);
    font-family: var(--font-display); font-size: 1rem; font-weight: 800;
    cursor: pointer; border: none; transition: all .15s; min-height: 54px;
    letter-spacing: .02em; text-decoration: none; }
  .vp-btn:disabled { opacity: .5; cursor: not-allowed; }
  .vp-btn-primary { background: var(--cyan);      color: #0f172a; }
  .vp-btn-primary:not(:disabled):hover { filter: brightness(1.08); }
  .vp-btn-success { background: var(--green);     color: #0f172a; }
  .vp-btn-done    { background: var(--green-dim); color: var(--green);
    border: 1px solid var(--green-border); cursor: default; }
  .vp-btn-ghost   { background: transparent; color: var(--text-muted);
    border: 1px solid var(--border2); }
  .vp-btn-ghost:not(:disabled):hover { border-color: var(--cyan); color: var(--cyan); }
  .vp-btn-outline { background: transparent; color: var(--cyan);
    border: 2px solid var(--cyan-border); }
  .vp-btn-outline:not(:disabled):hover { background: var(--cyan-dim); border-color: var(--cyan); }
  .vp-btn-sm  { min-height: 40px; font-size: .78rem; padding: .45rem .85rem; font-weight: 700; width: auto; }

  /* ── Inputs ── */
  .vp-input { width: 100%; padding: .75rem .9rem; background: var(--surface2);
    border: 1.5px solid var(--border); border-radius: 10px; color: var(--text);
    font-family: var(--font-mono); font-size: 1rem; outline: none;
    min-height: 48px; -webkit-appearance: none; transition: border .15s; }
  .vp-input:focus  { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34,211,238,.12); }
  .vp-input.error  { border-color: var(--red); }
  .vp-input::placeholder { color: var(--text-dim); }
  .vp-textarea { width: 100%; padding: .7rem .9rem; background: var(--surface2);
    border: 1.5px solid var(--border); border-radius: 10px; color: var(--text);
    font-family: var(--font-mono); font-size: .88rem; outline: none; resize: vertical;
    min-height: 90px; transition: border .15s; line-height: 1.6; }
  .vp-textarea:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34,211,238,.12); }
  .vp-select { appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right .85rem center; padding-right: 2.5rem; }

  /* ── PIN numpad ── */
  .vp-pin-display { display: flex; gap: .6rem; justify-content: center; margin-bottom: 1.5rem; }
  .vp-pin-dot { width: 20px; height: 20px; border-radius: 50%;
    border: 2px solid var(--border2); background: transparent; transition: all .15s; }
  .vp-pin-dot.filled { background: var(--cyan); border-color: var(--cyan);
    box-shadow: 0 0 8px rgba(34,211,238,.4); }
  .vp-numpad { display: grid; grid-template-columns: repeat(3,1fr); gap: .5rem; }
  .vp-numpad-key { background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: 12px; font-size: 1.7rem; font-weight: 700;
    cursor: pointer; text-align: center; transition: all .1s; min-height: 66px;
    display: flex; align-items: center; justify-content: center; color: var(--text);
    font-family: var(--font-mono); }
  .vp-numpad-key:active, .vp-numpad-key.pressed { transform: scale(.92);
    background: var(--cyan-dim); border-color: var(--cyan-border); }
  .vp-numpad-key.backspace { color: var(--text-muted); font-size: 1.3rem; }

  /* ── Shake ── */
  .vp-shake { animation: shake .4s ease; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)}
    40%{transform:translateX(7px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }

  /* ── Badges ── */
  .vp-badge { display: inline-flex; align-items: center; gap: .25rem;
    padding: .2rem .65rem; border-radius: 99px;
    font-family: var(--font-mono); font-size: .65rem; font-weight: 700; }
  .vp-badge-green  { background: var(--green-dim);  color: var(--green);  border: 1px solid var(--green-border); }
  .vp-badge-amber  { background: var(--amber-dim);  color: var(--amber);  border: 1px solid var(--amber-border); }
  .vp-badge-cyan   { background: var(--cyan-dim);   color: var(--cyan);   border: 1px solid var(--cyan-border); }
  .vp-badge-red    { background: var(--red-dim);    color: var(--red);    border: 1px solid var(--red-border); }

  /* ── Misc ── */
  .vp-divider { height: 1px; background: var(--border); margin: .6rem 0; }
  .vp-row { display: flex; align-items: center; justify-content: space-between; padding: .4rem 0; }
  .vp-row-label { font-family:var(--font-mono); font-size:.72rem; color:var(--text-muted); }
  .vp-error { background:var(--red-dim); border:1px solid var(--red-border); border-radius:8px;
    padding:.65rem .9rem; font-family:var(--font-mono); font-size:.8rem;
    color:var(--red); text-align:center; margin-top:.75rem; }
  .vp-hint { font-family:var(--font-mono); font-size:.82rem; color:var(--text-muted);
    text-align:center; line-height:2; margin-top:.85rem; }
  .vp-toast { background:var(--green-dim); border:1px solid var(--green-border);
    border-radius:8px; padding:.55rem .9rem; margin-bottom:.75rem;
    font-family:var(--font-mono); font-size:.78rem; color:var(--green); }
  .vp-info { background:rgba(34,211,238,.05); border:1px solid var(--cyan-border);
    border-radius:8px; padding:.7rem .9rem; margin-bottom:.75rem;
    font-family:var(--font-mono); font-size:.75rem; color:var(--text-muted); line-height:1.8; }
  .vp-companion { display:flex; align-items:center; gap:.65rem;
    padding:.5rem 0; border-bottom:1px solid var(--border); }
  .vp-companion:last-child { border-bottom:none; }
  .vp-avatar { width:36px; height:36px; border-radius:50%; background:var(--surface2);
    border:1px solid var(--border); display:flex; align-items:center; justify-content:center;
    font-weight:800; font-size:.8rem; color:var(--cyan); flex-shrink:0; }
  .vp-material-row { display:flex; justify-content:space-between; align-items:center;
    padding:.3rem 0; border-bottom:1px solid var(--border); font-size:.82rem; }
  .vp-material-row:last-child { border-bottom:none; }

  /* ── Registro: stepper ── */
  .step-bar { display:flex; gap:6px; margin-bottom:1.75rem; }
  .step-seg { flex:1; height:4px; border-radius:99px; background:var(--border);
    transition:background 0.35s ease; }
  .step-seg.done   { background:var(--cyan); }
  .step-seg.active { background:var(--cyan); opacity:.55; }
  .step-header { display:flex; align-items:center; gap:.85rem; margin-bottom:.25rem; }
  .step-icon  { font-size:1.8rem; line-height:1; }
  .step-title { font-family:var(--font-display); font-size:1.05rem; font-weight:800; color:var(--text); }
  .step-sub   { font-family:var(--font-mono); font-size:.7rem; color:var(--text-muted); margin-top:.15rem; }
  .step-nav   { display:flex; gap:.6rem; margin-top:.5rem; }
  .step-nav > button { flex:1; }
  .pub-input  { background:var(--surface2); border:1px solid var(--border-light);
    border-radius:var(--r-sm); color:var(--text); font-family:var(--font-display);
    font-size:0.85rem; padding:0.55rem 0.75rem; outline:none; width:100%;
    transition:border-color 0.15s, box-shadow 0.15s; }
  .pub-input:focus { border-color:var(--cyan); box-shadow:0 0 0 3px rgba(34,211,238,0.1); }
  .pub-input::placeholder { color:var(--text-dim); }
  .pub-input.error { border-color:var(--red); }
  .pub-btn-primary { display:flex; align-items:center; justify-content:center; gap:.4rem;
    width:100%; padding:.7rem 1rem; border-radius:var(--r);
    font-family:var(--font-display); font-size:.88rem; font-weight:800;
    cursor:pointer; border:none; transition:all .15s; min-height:48px;
    background:var(--cyan); color:#0f172a; }
  .pub-btn-primary:disabled { opacity:.55; cursor:not-allowed; }
  .pub-btn-ghost { display:flex; align-items:center; justify-content:center; gap:.4rem;
    width:100%; padding:.7rem 1rem; border-radius:var(--r);
    font-family:var(--font-display); font-size:.88rem; font-weight:700;
    cursor:pointer; border:1px solid var(--border2); transition:all .15s; min-height:48px;
    background:transparent; color:var(--text-muted); }
  .pub-btn-ghost:hover { border-color:var(--cyan); color:var(--cyan); }
  .summary-row { display:flex; justify-content:space-between; align-items:center;
    padding:.4rem 0; border-bottom:1px solid var(--border); font-size:.82rem; }
  .summary-row:last-child { border-bottom:none; }
  .summary-key { font-family:var(--font-mono); font-size:.68rem; color:var(--text-muted); }
  .summary-val { font-family:var(--font-mono); font-size:.78rem; font-weight:700; color:var(--text); }

  /* ── Animaciones ── */
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTE: PIN Numpad
// ─────────────────────────────────────────────────────────────────────────────
function PinNumpad({ value, onChange, shake, disabled }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const [pressed, setPressed] = useState(null);
  const tap = (k) => {
    setPressed(k); setTimeout(() => setPressed(null), 150);
    if (disabled) return;
    if (k === "⌫") { onChange(value.slice(0,-1)); return; }
    if (value.length >= 4) return;
    onChange(value + k);
  };
  return (
    <div>
      <div className={`vp-pin-display${shake ? " vp-shake" : ""}`}>
        {[0,1,2,3].map(i => <div key={i} className={`vp-pin-dot${i < value.length ? " filled" : ""}`} />)}
      </div>
      <div className="vp-numpad">
        {keys.map((k, i) => k === "" ? <div key={i}/> :
          <button key={i}
            className={`vp-numpad-key${k==="⌫"?" backspace":""}${pressed===k?" pressed":""}`}
            onClick={() => tap(k)} disabled={disabled}>{k}</button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: LANDING — bienvenida con dos opciones
// ─────────────────────────────────────────────────────────────────────────────
function LandingScreen({ onNuevo, onLogin, loadingConfig, config }) {
  return (
    <div className="vp-page" style={{ background:"var(--bg2)" }}>
      <style>{CSS}</style>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", padding:"2rem 1.5rem",
        background:"radial-gradient(ellipse 80% 50% at 50% 0%, rgba(34,211,238,0.08) 0%, transparent 65%)" }}>

        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:"2.5rem", animation:"fadeUp .5s ease both" }}>
          <img src={LOGO_TEG} alt="Trail El Guerrero" width={96} height={96}
            style={{ marginBottom:".85rem", borderRadius:"50%",
              boxShadow:"0 0 0 3px rgba(34,211,238,.25), 0 8px 32px rgba(0,0,0,.4)" }} />
          <div style={{ fontWeight:800, fontSize:"1.6rem", color:"var(--cyan)",
            fontFamily:"var(--font-display)", marginBottom:".35rem", lineHeight:1.2 }}>
            Trail El Guerrero 2026
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:".85rem",
            color:"var(--text-muted)", marginBottom:".2rem" }}>
            Portal del Voluntario
          </div>
          {config?.fecha && (
            <div style={{ fontFamily:"var(--font-mono)", fontSize:".75rem", color:"var(--text-muted)" }}>
              {config.fecha} · {config.lugar || "Candeleda, Ávila"}
            </div>
          )}
        </div>

        {/* Opciones */}
        <div style={{ width:"100%", maxWidth:400, display:"flex", flexDirection:"column",
          gap:"1rem", animation:"fadeUp .55s .1s ease both", opacity:0,
          animationFillMode:"forwards" }}>

          {/* Nuevo voluntario */}
          <button className="vp-btn vp-btn-primary"
            style={{ fontSize:"1.05rem", minHeight:62, flexDirection:"column",
              gap:".2rem", lineHeight:1.3 }}
            onClick={onNuevo}>
            <span style={{ fontSize:"1.4rem" }}>✋</span>
            <span>Quiero ser voluntario</span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:".72rem",
              fontWeight:400, opacity:.8 }}>
              Registrarme por primera vez
            </span>
          </button>

          {/* Ya registrado */}
          <button className="vp-btn vp-btn-outline"
            style={{ fontSize:"1.05rem", minHeight:62, flexDirection:"column",
              gap:".2rem", lineHeight:1.3 }}
            onClick={onLogin}>
            <span style={{ fontSize:"1.4rem" }}>👤</span>
            <span>Ya soy voluntario</span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:".72rem",
              fontWeight:400, opacity:.8 }}>
              Acceder a mi ficha personal
            </span>
          </button>
        </div>

        {/* Footer */}
        <div style={{ marginTop:"2.5rem", fontFamily:"var(--font-mono)",
          fontSize:".8rem", color:"var(--text-muted)", textAlign:"center", lineHeight:2,
          animation:"fadeUp .6s .2s ease both", opacity:0, animationFillMode:"forwards" }}>
          Club Deportivo Trail Candeleda<br/>
          10ª Edición · Candeleda, Ávila
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: REGISTRO — formulario en 3 pasos
// ─────────────────────────────────────────────────────────────────────────────
function RegistroScreen({ onVolver, onRegistroOk }) {
  const [puestos,         setPuestos]         = useState([]);
  const [imgFront,        setImgFront]        = useState(null);
  const [imgBack,         setImgBack]         = useState(null);
  const [imgGuiaTallas,   setImgGuiaTallas]   = useState(null);
  const [opcionPuesto,    setOpcionPuesto]    = useState(true);
  const [opcionVehiculo,  setOpcionVehiculo]  = useState(true);
  const [opcionEmail,     setOpcionEmail]     = useState(false);
  const [opcionEmergencia,setOpcionEmergencia]= useState(false);
  const [loading,         setLoading]         = useState(true);
  const [enviando,        setEnviando]        = useState(false);
  const [errorEnvio,      setErrorEnvio]      = useState(null);
  const [telefonoEnviado, setTelefonoEnviado] = useState("");

  useEffect(() => {
    Promise.all([
      fetchPublic(LS_KEY_VOL + "_puestos"),
      fetchPublic(LS_KEY_VOL + "_imgFront"),
      fetchPublic(LS_KEY_VOL + "_imgBack"),
      fetchPublic(LS_KEY_VOL + "_imgGuiaTallas"),
      fetchPublic(LS_KEY_VOL + "_opcionPuesto"),
      fetchPublic(LS_KEY_VOL + "_opcionVehiculo"),
      fetchPublic(LS_KEY_VOL + "_opcionEmail"),
      fetchPublic(LS_KEY_VOL + "_opcionEmergencia"),
    ]).then(([psts, front, back, guia, opP, opV, opE, opEm]) => {
      if (Array.isArray(psts)) setPuestos(psts);
      if (front)               setImgFront(front);
      if (back)                setImgBack(back);
      if (guia)                setImgGuiaTallas(guia);
      if (opP  !== null) setOpcionPuesto(Boolean(opP));
      if (opV  !== null) setOpcionVehiculo(Boolean(opV));
      if (opE  !== null) setOpcionEmail(Boolean(opE));
      if (opEm !== null) setOpcionEmergencia(Boolean(opEm));
      setLoading(false);
    });
  }, []);

  const addVoluntario = async (data) => {
    setEnviando(true); setErrorEnvio(null);
    try {
      const res = await fetch(`${PUBLIC_API}?collection=${LS_KEY_VOL}_voluntarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, estado: "pendiente" }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setErrorEnvio("Ya existe un registro con ese teléfono. Si ya eres voluntario, accede con tu ficha personal.");
        } else {
          setErrorEnvio(json.error || "Error al enviar el registro. Inténtalo de nuevo.");
        }
        setEnviando(false); return;
      }
      setTelefonoEnviado(data.telefono || "");
      onRegistroOk(data.telefono || "", data.nombre || "");
    } catch {
      setErrorEnvio("Sin conexión. Comprueba tu red e inténtalo de nuevo.");
    }
    setEnviando(false);
  };

  if (loading) return (
    <div className="vp-page">
      <style>{CSS}</style>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        flexDirection:"column", gap:"1rem" }}>
        <div style={{ fontSize:"2rem", animation:"spin 1s linear infinite" }}>⟳</div>
        <div className="vp-mono" style={{ fontSize:".78rem", color:"var(--text-muted)" }}>
          Cargando formulario…
        </div>
      </div>
    </div>
  );

  return (
    <div className="vp-page">
      <style>{CSS}</style>
      {/* Header fijo */}
      <div className="vp-topbar">
        <button className="vp-btn vp-btn-ghost vp-btn-sm"
          style={{ width:"auto" }} onClick={onVolver}>
          ← Volver
        </button>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:".72rem", color:"var(--cyan)", fontWeight:700 }}>
          Registro de voluntario
        </div>
      </div>

      {errorEnvio && (
        <div style={{ position:"fixed", top:56, left:"50%", transform:"translateX(-50%)",
          background:"rgba(248,113,113,.15)", border:"1px solid rgba(248,113,113,.4)",
          borderRadius:8, padding:".6rem 1.2rem", fontFamily:"var(--font-mono)",
          fontSize:".7rem", color:"var(--red)", zIndex:999, maxWidth:"90vw", textAlign:"center" }}>
          ⚠️ {errorEnvio}
        </div>
      )}

      <div className="vp-wrap" style={{ paddingTop:"1.5rem" }}>
        <StepperForm
          puestos={puestos}
          imgFront={imgFront || SHIRT_FRONT}
          imgBack={imgBack || SHIRT_BACK}
          imgGuiaTallas={imgGuiaTallas}
          opcionPuesto={opcionPuesto}
          opcionVehiculo={opcionVehiculo}
          opcionEmail={opcionEmail}
          opcionEmergencia={opcionEmergencia}
          enviando={enviando}
          onRegistrar={addVoluntario}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: REGISTRO OK — confirmación post-registro
// ─────────────────────────────────────────────────────────────────────────────
function RegistroOkScreen({ telefono, nombre, onAcceder }) {
  const pin = telefono.replace(/\D/g,"").slice(-4) || "????";
  return (
    <div className="vp-page">
      <style>{CSS}</style>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        padding:"2rem 1.25rem",
        background:"radial-gradient(ellipse 60% 40% at 50% 0%, rgba(52,211,153,0.1) 0%, transparent 60%)" }}>
        <div style={{ maxWidth:420, width:"100%", animation:"fadeUp .5s ease both" }}>

          <div style={{ textAlign:"center", marginBottom:"1.75rem" }}>
            <div style={{ fontSize:"3.5rem", marginBottom:".75rem" }}>🎉</div>
            <div style={{ fontWeight:800, fontSize:"1.5rem", color:"var(--green)",
              fontFamily:"var(--font-display)", marginBottom:".5rem" }}>
              ¡Registro completado!
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:".82rem",
              color:"var(--text-muted)", lineHeight:1.7 }}>
              {nombre ? `Hola ${nombre.split(" ")[0]}, ` : ""}hemos recibido tu solicitud.<br/>
              El equipo te confirmará pronto por teléfono.
            </div>
          </div>

          {/* Instrucciones de acceso */}
          <div className="vp-card" style={{ borderLeft:"3px solid var(--cyan)", marginBottom:"1rem" }}>
            <div className="vp-label" style={{ color:"var(--cyan)" }}>📱 Cómo acceder a tu ficha</div>
            <div style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
              {[
                ["1. Esta misma página", "Vuelve aquí cuando quieras"],
                ["2. Tu teléfono",  telefono],
                ["3. PIN inicial",  pin + " (últimos 4 dígitos de tu tel.)"],
              ].map(([k,v]) => (
                <div key={k} className="vp-row" style={{ padding:".3rem 0" }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:".72rem", color:"var(--text-muted)" }}>{k}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:".8rem",
                    fontWeight:700, color: k.includes("PIN") ? "var(--cyan)" : "var(--text)" }}>{v}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
              style={{ marginTop:".85rem", width:"100%", padding:".5rem",
                background:"var(--cyan-dim)", color:"var(--cyan)",
                border:"1px solid var(--cyan-border)", borderRadius:8,
                fontFamily:"var(--font-mono)", fontSize:".75rem", fontWeight:700,
                cursor:"pointer" }}>
              📋 Guardar enlace de esta página
            </button>
          </div>

          {/* CTA para acceder directamente */}
          <button className="vp-btn vp-btn-success" onClick={onAcceder}
            style={{ marginBottom:".75rem" }}>
            👤 Acceder ahora a mi ficha
          </button>
          <button className="vp-btn vp-btn-ghost"
            style={{ fontSize:".82rem", minHeight:44 }}
            onClick={() => { try { window.close(); } catch(e) {} }}>
            ✕ Cerrar ventana
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: LOGIN — 2 pasos (teléfono + PIN)
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onVolver, telefonoInicial }) {
  const [paso, setPaso]         = useState(telefonoInicial ? 2 : 1);
  const [telefono, setTelefono] = useState(telefonoInicial || "");
  const [pin, setPin]           = useState("");
  const [shake, setShake]       = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [checkingPin, setCheckingPin] = useState(false);
  const [pinCambiado, setPinCambiado] = useState(false);
  const telRef = useRef(null);

  useEffect(() => { if (paso === 1) setTimeout(() => telRef.current?.focus(), 100); }, [paso]);

  const telLimpio = telefono.replace(/\D/g,"");
  const telValido = telLimpio.length >= 9;

  const irAlPin = async (e) => {
    e?.preventDefault();
    if (!telValido) { setError("Introduce tu número de teléfono (mínimo 9 dígitos)"); return; }
    setError(""); setCheckingPin(true);
    try {
      const res = await fetch(`${API_BASE}/check?telefono=${encodeURIComponent(telefono.trim())}`);
      if (res.ok) {
        const d = await res.json();
        setPinCambiado(Boolean(d.pinPersonalizado));
      }
    } catch { /* silencioso */ }
    setCheckingPin(false);
    setPaso(2);
  };

  const handlePinChange = async (newPin) => {
    setPin(newPin);
    if (newPin.length === 4) await submit(newPin);
  };

  const submit = async (p = pin) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: telefono.trim(), pin: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShake(true); setPin(""); setError(data.error || "Teléfono o PIN incorrecto");
        setTimeout(() => setShake(false), 500);
      } else {
        saveSession({ token: data.token });
        onLogin(data.token);
      }
    } catch {
      setError("Error de conexión. Comprueba tu internet.");
    } finally { setLoading(false); }
  };

  return (
    <div className="vp-page">
      <style>{CSS}</style>

      <div className="vp-topbar">
        <button className="vp-btn vp-btn-ghost vp-btn-sm"
          style={{ width:"auto" }}
          onClick={() => paso === 2 && !telefonoInicial ? setPaso(1) : onVolver()}>
          ← {paso === 2 && !telefonoInicial ? "Cambiar teléfono" : "Volver"}
        </button>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:".72rem", color:"var(--cyan)", fontWeight:700 }}>
          Acceder a mi ficha
        </div>
      </div>

      <div className="vp-wrap" style={{ paddingTop:"1.5rem" }}>

        {paso === 1 && (
          <div>
            <div className="vp-card">
              <div className="vp-step-title">📱 Tu número de teléfono</div>
              <div className="vp-step-desc">El que usaste al registrarte como voluntario</div>
              <form onSubmit={irAlPin}>
                <input ref={telRef} className="vp-input" type="tel"
                  placeholder="612 345 678" value={telefono}
                  onChange={e => { setTelefono(e.target.value); setError(""); }}
                  inputMode="tel" autoComplete="tel" autoFocus
                  style={{ marginBottom:".75rem", fontSize:"1.35rem", letterSpacing:".06em" }}
                />
                {error && <div className="vp-error">⚠ {error}</div>}
                <button type="submit" className="vp-btn vp-btn-primary"
                  style={{ marginTop:".85rem", fontSize:"1.05rem" }} disabled={!telValido || checkingPin}>
                  {checkingPin ? "Comprobando…" : "Continuar →"}
                </button>
              </form>
            </div>
            <div className="vp-hint">¿Todavía no eres voluntario?<br/>Vuelve atrás y regístrate</div>
          </div>
        )}

        {paso === 2 && (
          <div>
            <div className="vp-card">
              <div style={{ textAlign:"center", marginBottom:"1.4rem" }}>
                <div className="vp-step-title">🔑 Introduce tu PIN</div>
                {pinCambiado ? (
                  <div className="vp-step-desc" style={{ marginBottom:".5rem" }}>
                    Usa tu <strong style={{color:"var(--text)"}}>PIN personalizado</strong>.<br/>
                    Si no lo recuerdas, contacta con el organizador para restablecerlo.
                  </div>
                ) : (
                  <div className="vp-step-desc" style={{ marginBottom:".5rem" }}>
                    Tu PIN son los <strong style={{color:"var(--text)"}}>últimos 4 dígitos</strong> de tu teléfono
                    {telLimpio.length >= 4 && (
                      <>: <span style={{color:"var(--cyan)",fontWeight:800,fontSize:"1.1rem",letterSpacing:".1em"}}>
                        {telLimpio.slice(-4)}
                      </span></>
                    )}
                  </div>
                )}
                <div className="vp-mono" style={{ fontSize:".9rem", color:"var(--text-muted)" }}>
                  {telefono.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}
                </div>
              </div>
              <PinNumpad value={pin} onChange={handlePinChange} shake={shake} disabled={loading} />
              {error && <div className="vp-error" style={{marginTop:".85rem"}}>⚠ {error}</div>}
              {loading && <div style={{ textAlign:"center", marginTop:"1rem",
                fontFamily:"var(--font-mono)", fontSize:".82rem", color:"var(--cyan)" }}>
                Verificando…
              </div>}
            </div>
            <div className="vp-hint">¿Problemas? Contacta con el organizador</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: PORTAL (ficha del voluntario autenticado)
// ─────────────────────────────────────────────────────────────────────────────
// ── Componente PuestoDetalle (solo lectura) ──────────────────────────────────
function PuestoDetalle({ puesto }) {
  const [expandido, setExpandido] = useState(false);
  if (!puesto) return (
    <div className="vp-card" style={{ borderLeft:"3px solid var(--border)" }}>
      <div className="vp-label">📍 Tu puesto</div>
      <div className="vp-mono" style={{ fontSize:".82rem", color:"var(--text-dim)" }}>
        ⏳ Pendiente de asignación. Te informaremos pronto.
      </div>
    </div>
  );
  return (
    <div className="vp-card" style={{ borderLeft:"3px solid var(--cyan)", padding:0, overflow:"hidden" }}>
      {/* Cabecera siempre visible */}
      <button
        onClick={() => setExpandido(v => !v)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"1rem 1.1rem", background:"none", border:"none", cursor:"pointer",
          textAlign:"left", gap:".75rem" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="vp-label" style={{ marginBottom:".2rem" }}>📍 Tu puesto</div>
          <div style={{ fontWeight:700, fontSize:"1.05rem", color:"var(--text)" }}>{puesto.nombre}</div>
          <div className="vp-mono" style={{ fontSize:".75rem", color:"var(--text-muted)", marginTop:".2rem" }}>
            🕗 {puesto.horaInicio}{puesto.horaFin ? ` – ${puesto.horaFin}` : ""}
            {puesto.tipo ? ` · ${puesto.tipo}` : ""}
          </div>
          {!expandido && (
            <div className="vp-mono" style={{ fontSize:".65rem", color:"var(--cyan)", marginTop:".2rem" }}>
              Toca para ver detalles completos →
            </div>
          )}
        </div>
        <span style={{ fontFamily:"var(--font-mono)", fontSize:".75rem", color:"var(--cyan)",
          flexShrink:0, transition:"transform .18s",
          transform: expandido ? "rotate(0deg)" : "rotate(-90deg)" }}>▼</span>
      </button>

      {/* Detalles expandidos */}
      {expandido && (
        <div style={{ padding:"0 1.1rem 1rem", borderTop:"1px solid var(--border)" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:".55rem", paddingTop:".75rem" }}>
            {puesto.tipo && (
              <div className="vp-row">
                <span className="vp-row-label">🏷 Tipo</span>
                <span className="vp-value">{puesto.tipo}</span>
              </div>
            )}
            {puesto.horaInicio && (
              <div className="vp-row">
                <span className="vp-row-label">🕗 Horario</span>
                <span className="vp-value">{puesto.horaInicio}{puesto.horaFin ? ` – ${puesto.horaFin}` : ""}</span>
              </div>
            )}
            {puesto.distancias?.length > 0 && (
              <div className="vp-row">
                <span className="vp-row-label">📏 Distancias</span>
                <div style={{ display:"flex", gap:".3rem", flexWrap:"wrap", justifyContent:"flex-end" }}>
                  {puesto.distancias.map(d => (
                    <span key={d} style={{ fontFamily:"var(--font-mono)", fontSize:".65rem",
                      padding:".15rem .45rem", borderRadius:4,
                      background:"rgba(34,211,238,.1)", color:"var(--cyan)",
                      border:"1px solid rgba(34,211,238,.25)", fontWeight:700 }}>{d}</span>
                  ))}
                </div>
              </div>
            )}
            {puesto.necesarios && (
              <div className="vp-row">
                <span className="vp-row-label">👥 Voluntarios</span>
                <span className="vp-value">{puesto.necesarios} necesarios</span>
              </div>
            )}
            {puesto.tiempoLimite && (
              <div className="vp-row">
                <span className="vp-row-label">⏱ Tiempo límite</span>
                <span className="vp-value" style={{color:"var(--amber)"}}>{puesto.tiempoLimite}</span>
              </div>
            )}
            {puesto.notas && (
              <div style={{ marginTop:".2rem", padding:".55rem .75rem",
                background:"var(--surface2)", borderRadius:8,
                borderLeft:"2px solid var(--cyan-border)" }}>
                <div className="vp-label" style={{ marginBottom:".25rem", color:"var(--cyan)" }}>📋 Instrucciones</div>
                <div className="vp-mono" style={{ fontSize:".78rem", color:"var(--text-muted)", lineHeight:1.7 }}>
                  {puesto.notas}
                </div>
              </div>
            )}
          </div>
          <div className="vp-mono" style={{ fontSize:".62rem", color:"var(--text-dim)",
            marginTop:".75rem", textAlign:"center" }}>
            Solo lectura · Contacta con el organizador para cambios
          </div>
        </div>
      )}
    </div>
  );
}

function PortalMain({ token, onLogout }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [editando,   setEditando]   = useState(false);
  const [cambiandoPin, setCPin]     = useState(false);
  const [form,       setForm]       = useState({});
  const [saving,     setSaving]     = useState(false);
  const [marcando,    setMarcando]    = useState(false);
  const [confirmLlegada, setConfirmLlegada] = useState(false);
  const [msg,         setMsg]         = useState("");

  const showMsg = (m, ms=3500) => { setMsg(m); setTimeout(() => setMsg(""), ms); };

  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const fetchData = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/ficha`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.status === 401) { clearSession(); onLogout(); return; }
      const json = await res.json();
      setData(json);
      setUltimaActualizacion(new Date());
      const v = json.voluntario || {};
      setForm({
        telefono:           v.telefono || "",
        telefonoEmergencia: v.telefonoEmergencia || v.contactoEmergencia || "",
        talla:              v.talla || "M",
        notaVoluntario:     v.notaVoluntario || "",
      });
    } catch { if (!silencioso) setError("Error de conexión. Tira abajo para recargar."); }
    finally  { if (!silencioso) setLoading(false); }
  }, [token, onLogout]);

  // Carga inicial
  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh cada 5 minutos (silencioso — no muestra spinner)
  useEffect(() => {
    const interval = setInterval(() => { fetchData(true); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const marcarLlegada = async () => {
    if (data?.voluntario?.enPuesto) return;
    setMarcando(true); setConfirmLlegada(false);
    try {
      const res = await fetch(`${API_BASE}/ficha?action=presente`, {
        method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) { showMsg(`✅ Llegada registrada a las ${json.horaLlegada}`); await fetchData(); }
    } catch { showMsg("❌ Error al registrar llegada."); }
    finally  { setMarcando(false); }
  };

  const guardar = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/ficha`, {
        method: "PATCH", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { showMsg("✅ Datos guardados"); setEditando(false); await fetchData(); }
      else showMsg("❌ Error al guardar");
    } catch { showMsg("❌ Error de conexión"); }
    finally  { setSaving(false); }
  };

  if (loading && !data) return (
    <><style>{CSS}</style>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
        minHeight:"100dvh", flexDirection:"column", gap:"1rem" }}>
        <div style={{ fontSize:"2rem", animation:"spin 1s linear infinite" }}>⟳</div>
        <div className="vp-mono" style={{ fontSize:".78rem", color:"var(--text-muted)" }}>Cargando tu ficha…</div>
      </div></>
  );

  if (error && !data) return (
    <><style>{CSS}</style>
      <div className="vp-wrap" style={{ paddingTop:"3rem", textAlign:"center" }}>
        <div style={{ fontSize:"2rem", marginBottom:"1rem" }}>⚠️</div>
        <div className="vp-mono" style={{ fontSize:".8rem", color:"var(--red)", marginBottom:"1.5rem" }}>{error}</div>
        <button className="vp-btn vp-btn-ghost" onClick={fetchData}>Reintentar</button>
      </div></>
  );

  const { voluntario:v={}, puesto, companerosEnPuesto=[], materialPuesto=[], config={} } = data || {};

  const organizadores = Array.isArray(config.organizadores) && config.organizadores.length > 0
    ? config.organizadores
    : (config.organizador || config.telefonoContacto)
      ? [{ nombre:config.organizador||"Organización", telefono:config.telefonoContacto||"", email:config.emailContacto||"" }]
      : [];

  return (
    <><style>{CSS}</style>
      <div className="vp-topbar">
        <div>
          <div style={{ fontWeight:800, fontSize:"1rem" }}>{(v.nombre||"").split(" ")[0]} 👋</div>
          <div className="vp-mono" style={{ fontSize:".6rem", color:"var(--text-muted)" }}>
            {config.nombre || "Trail El Guerrero 2026"}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:".25rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:".4rem" }}>
            <span className={`vp-badge ${v.estado==="confirmado"?"vp-badge-green":v.estado==="cancelado"?"vp-badge-red":"vp-badge-amber"}`}>
              {v.estado==="confirmado" ? "✓ Confirmado" : v.estado==="cancelado" ? "✕ Cancelado" : "⏳ Pendiente"}
            </span>
            <button onClick={() => fetchData(true)}
              title="Actualizar datos"
              style={{ background:"none", border:"none", cursor:"pointer",
                fontFamily:"var(--font-mono)", fontSize:".9rem", color:"var(--text-dim)",
                padding:".1rem", lineHeight:1 }}>⟳</button>
          </div>
          {config.fecha && (() => {
            const hoy = new Date();
            const evento = new Date(config.fecha);
            const dias = Math.ceil((evento - hoy) / 86400000);
            if (dias < 0) return null;
            const texto = dias === 0 ? "🏃 ¡Hoy es el día!" : dias === 1 ? "⚡ ¡Mañana!" : dias <= 7 ? `⚡ En ${dias} días` : `📅 ${dias} días`;
            const color = dias === 0 ? "var(--green)" : dias <= 3 ? "var(--amber)" : "var(--text-dim)";
            return <span className="vp-mono" style={{ fontSize:".6rem", color, fontWeight:700 }}>{texto}</span>;
          })()}
        </div>
      </div>

      <div className="vp-wrap">
        {msg && <div className="vp-toast">{msg}</div>}

        {/* Banner PIN temporal */}
        {!v.pinPersonalizado && v.estado !== "cancelado" && (
          <div style={{
            background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.3)",
            borderRadius:8, padding:".6rem .85rem", marginBottom:".75rem",
            display:"flex", alignItems:"flex-start", gap:".6rem"
          }}>
            <span style={{ fontSize:"1.1rem", flexShrink:0 }}>🔐</span>
            <div style={{ flex:1 }}>
              <div className="vp-mono" style={{ fontSize:".78rem", fontWeight:700, color:"var(--amber)", marginBottom:".2rem" }}>
                PIN temporal activo
              </div>
              <div className="vp-mono" style={{ fontSize:".7rem", color:"var(--text-muted)", lineHeight:1.65 }}>
                Tu PIN son los últimos 4 dígitos de tu teléfono. Por seguridad, te recomendamos personalizarlo.
              </div>
              <button onClick={() => {
                document.getElementById("vp-cambiar-pin-btn")?.click();
              }} style={{
                marginTop:".45rem", background:"rgba(251,191,36,.12)", color:"var(--amber)",
                border:"1px solid rgba(251,191,36,.3)", borderRadius:6,
                fontFamily:"var(--font-mono)", fontSize:".7rem", fontWeight:700,
                padding:".25rem .65rem", cursor:"pointer"
              }}>
                Cambiar PIN ahora →
              </button>
            </div>
          </div>
        )}

        {/* Puesto */}
        <div className="vp-card" style={{ borderLeft:`3px solid ${puesto?"var(--cyan)":"var(--border)"}` }}>
          <div className="vp-label">📍 Tu puesto</div>
          {puesto ? (<>
            <div style={{ fontWeight:700, fontSize:"1.1rem", marginBottom:".35rem" }}>{puesto.nombre}</div>
            <div className="vp-mono" style={{ fontSize:".78rem", color:"var(--text-muted)", lineHeight:1.9 }}>
              🕗 <strong style={{color:"var(--text)"}}>{puesto.horaInicio}</strong>
              {puesto.horaFin && ` · Hasta: ${puesto.horaFin}`}
              {puesto.distancias?.length > 0 && <><br/>📏 {puesto.distancias.join(" · ")}</>}
              {puesto.tipo && <><br/>🏷 {puesto.tipo}</>}
            </div>
            {puesto.notas && (
              <div className="vp-mono" style={{ fontSize:".72rem", color:"var(--text-dim)",
                marginTop:".5rem", padding:".4rem .6rem", background:"var(--surface2)",
                borderRadius:6, borderLeft:"2px solid var(--border)" }}>📋 {puesto.notas}</div>
            )}
          </>) : (
            <div className="vp-mono" style={{ fontSize:".82rem", color:"var(--text-dim)" }}>
              ⏳ Pendiente de asignación. Te informaremos pronto.
            </div>
          )}
        </div>

        {/* Material */}
        {materialPuesto.length > 0 && (
          <div className="vp-card" style={{ borderLeft:"3px solid var(--amber)" }}>
            <div className="vp-label">📦 Material en tu puesto</div>
            {materialPuesto.map((item,i) => (
              <div key={i} className="vp-material-row">
                <span style={{ fontWeight:600 }}>{item.nombre}</span>
                <span className="vp-mono" style={{ fontSize:".78rem", color:"var(--amber)", fontWeight:700 }}>
                  {item.cantidad} {item.unidad}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Botón en puesto */}
        <div style={{ marginBottom:".85rem" }}>
          {v.enPuesto ? (
            <button className="vp-btn vp-btn-done" disabled>✅ En puesto desde las {v.horaLlegada}</button>
          ) : confirmLlegada ? (
            <div style={{ display:"flex", flexDirection:"column", gap:".5rem" }}>
              <div style={{ background:"rgba(52,211,153,.08)", border:"1px solid var(--green-border)",
                borderRadius:10, padding:".75rem 1rem", textAlign:"center" }}>
                <div className="vp-mono" style={{ fontSize:".85rem", fontWeight:700, color:"var(--green)", marginBottom:".3rem" }}>
                  ¿Confirmas que ya estás en tu puesto?
                </div>
                <div className="vp-mono" style={{ fontSize:".72rem", color:"var(--text-muted)" }}>
                  {puesto ? puesto.nombre : "Puesto pendiente de asignación"}
                </div>
              </div>
              <div style={{ display:"flex", gap:".5rem" }}>
                <button className="vp-btn vp-btn-ghost" style={{ minHeight:48 }}
                  onClick={() => setConfirmLlegada(false)}>Cancelar</button>
                <button className="vp-btn vp-btn-success" style={{ minHeight:48 }}
                  onClick={marcarLlegada} disabled={marcando}>
                  {marcando ? "Registrando…" : "✅ Sí, estoy en mi puesto"}
                </button>
              </div>
            </div>
          ) : (
            <button className="vp-btn vp-btn-success"
              onClick={() => setConfirmLlegada(true)} disabled={marcando}>
              {marcando ? "Registrando…" : "📍 Ya estoy en mi puesto"}
            </button>
          )}
        </div>

        {/* Compañeros */}
        {companerosEnPuesto.length > 0 && (
          <div className="vp-card">
            <div className="vp-label">👥 Compañeros en tu puesto ({companerosEnPuesto.length})</div>
            {companerosEnPuesto.map((c,i) => {
              const ini = ((c.nombre||"")+" "+(c.apellidos||"")).trim().split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase();
              return (
                <div key={i} className="vp-companion">
                  <div className="vp-avatar" style={{
                    background:c.enPuesto?"rgba(52,211,153,.15)":undefined,
                    borderColor:c.enPuesto?"var(--green-border)":undefined,
                    color:c.enPuesto?"var(--green)":undefined }}>{ini}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:".4rem", flexWrap:"wrap" }}>
                      <span style={{ fontWeight:600, fontSize:".92rem" }}>{c.nombre}{c.apellidos?" "+c.apellidos:""}</span>
                      {c.enPuesto && <span style={{ fontFamily:"var(--font-mono)", fontSize:".6rem",
                        background:"var(--green-dim)", color:"var(--green)",
                        border:"1px solid var(--green-border)", borderRadius:4,
                        padding:".05rem .35rem", fontWeight:700 }}>📍 {c.horaLlegada||"En puesto"}</span>}
                    </div>
                    {c.telefono && <a href={`tel:${c.telefono.replace(/\s/g,"")}`}
                      style={{ fontFamily:"var(--font-mono)", fontSize:".74rem", color:"var(--cyan)", textDecoration:"none" }}>
                      📞 {c.telefono}</a>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mis datos */}
        <div className="vp-card">
          <div className="vp-card-header">
            <div className="vp-label" style={{marginBottom:0}}>Mis datos</div>
            {!editando && <button className="vp-btn vp-btn-ghost vp-btn-sm" onClick={() => setEditando(true)}>✏️ Editar</button>}
          </div>
          {editando ? (<>
            <div className="vp-label">📞 Teléfono</div>
            <input className="vp-input" type="tel" value={form.telefono}
              onChange={e => setForm(f=>({...f,telefono:e.target.value}))} style={{marginBottom:".75rem"}} />
            <div className="vp-label">🚨 Teléfono de emergencia</div>
            <input className="vp-input" type="tel" value={form.telefonoEmergencia}
              onChange={e => setForm(f=>({...f,telefonoEmergencia:e.target.value}))} style={{marginBottom:".75rem"}} />
            <div className="vp-label">🎽 Talla de camiseta</div>
            <select className="vp-input vp-select" value={form.talla}
              onChange={e => setForm(f=>({...f,talla:e.target.value}))} style={{marginBottom:".75rem"}}>
              {TALLAS_PORTAL.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="vp-label">📝 Nota para el organizador</div>
            <textarea className="vp-textarea"
              placeholder="Ej: Llegaré 15 min antes, traigo equipo de primeros auxilios..."
              value={form.notaVoluntario}
              onChange={e => setForm(f=>({...f,notaVoluntario:e.target.value}))}
              maxLength={500} style={{marginBottom:".4rem"}} />
            <div className="vp-mono" style={{fontSize:".65rem",color:"var(--text-dim)",textAlign:"right",marginBottom:".85rem"}}>
              {(form.notaVoluntario||"").length}/500</div>
            <div style={{display:"flex", gap:".5rem"}}>
              <button className="vp-btn vp-btn-ghost" style={{minHeight:48}} onClick={() => setEditando(false)}>Cancelar</button>
              <button className="vp-btn vp-btn-primary" style={{minHeight:48}} onClick={guardar} disabled={saving}>
                {saving ? "Guardando…" : "💾 Guardar"}</button>
            </div>
          </>) : (<>
            <div className="vp-row"><span className="vp-row-label">📞 Teléfono</span><span className="vp-value">{v.telefono||"—"}</span></div>
            <div className="vp-divider"/>
            <div className="vp-row"><span className="vp-row-label">🚨 Emergencia</span><span className="vp-value">{v.telefonoEmergencia||v.contactoEmergencia||"—"}</span></div>
            <div className="vp-divider"/>
            <div className="vp-row"><span className="vp-row-label">🎽 Talla</span><span className="vp-value">{v.talla||"—"}</span></div>
            <div className="vp-divider"/>
            <div className="vp-row"><span className="vp-row-label">🎽 Camiseta</span>
              <span className={`vp-badge ${v.camisetaEntregada?"vp-badge-green":"vp-badge-amber"}`}>
                {v.camisetaEntregada?"✅ Entregada":"⏳ Pendiente"}</span></div>
            {v.nombre && (<>
              <div className="vp-divider"/>
              <div className="vp-row"><span className="vp-row-label">👤 Nombre</span>
                <span className="vp-value">{v.nombre}{v.apellidos?" "+v.apellidos:""}</span></div>
            </>)}
            {v.mensajeOrganizador && (<>
              <div className="vp-divider"/>
              <div style={{paddingTop:".4rem"}}>
                <div className="vp-label" style={{marginBottom:".3rem", color:"var(--amber)"}}>📢 Mensaje del organizador</div>
                <div className="vp-mono" style={{fontSize:".8rem",color:"var(--text)",lineHeight:1.7,
                  background:"rgba(251,191,36,.06)",borderRadius:8,padding:".6rem .75rem",
                  border:"1px solid rgba(251,191,36,.25)",borderLeft:"3px solid var(--amber)"}}>{v.mensajeOrganizador}</div>
              </div>
            </>)}
            {v.notaVoluntario && (<>
              <div className="vp-divider"/>
              <div style={{paddingTop:".4rem"}}>
                <div className="vp-label" style={{marginBottom:".3rem"}}>📝 Tu nota</div>
                <div className="vp-mono" style={{fontSize:".8rem",color:"var(--text)",lineHeight:1.7,
                  background:"var(--surface2)",borderRadius:8,padding:".55rem .75rem",
                  borderLeft:"2px solid var(--cyan)"}}>{v.notaVoluntario}</div>
              </div>
            </>)}
          </>)}
        </div>

        {/* Cambiar PIN */}
        {cambiandoPin ? (
          <CambiarPin token={token}
            onDone={() => { setCPin(false); showMsg("✅ PIN actualizado correctamente"); }}
            onCancel={() => setCPin(false)} />
        ) : (
          <button id="vp-cambiar-pin-btn" className="vp-btn vp-btn-ghost" style={{marginBottom:".75rem"}} onClick={() => setCPin(true)}>
            🔐 Cambiar mi PIN
          </button>
        )}

        {/* Cancelar asistencia */}
        {v.estado !== "cancelado" && (
          <CancelarAsistencia token={token}
            nombreVoluntario={(v.nombre||"").split(" ")[0]}
            onCancelado={() => { showMsg("Hemos registrado que no podrás asistir. El organizador ha sido notificado."); fetchData(); }} />
        )}

        {/* Contacto organizador */}
        {organizadores.length > 0 && (
          <div className="vp-card" style={{marginBottom:".75rem",borderLeft:"3px solid var(--cyan)"}}>
            <div className="vp-label">📞 Contacto organizadores</div>
            {organizadores.map((org,i) => (
              <div key={i} style={{paddingTop:i>0?".65rem":0,marginTop:i>0?".65rem":0,borderTop:i>0?"1px solid var(--border)":"none"}}>
                {org.nombre && <div style={{fontWeight:700,fontSize:".95rem",marginBottom:".2rem"}}>{org.nombre}</div>}
                {org.telefono && <a href={`tel:${org.telefono.replace(/\s/g,"")}`}
                  style={{fontFamily:"var(--font-mono)",fontSize:"1rem",color:"var(--cyan)",textDecoration:"none",display:"block",fontWeight:700,marginBottom:".1rem"}}>
                  📞 {org.telefono}</a>}
                {org.email && <a href={`mailto:${org.email}`}
                  style={{fontFamily:"var(--font-mono)",fontSize:".76rem",color:"var(--text-muted)",textDecoration:"none",display:"block"}}>
                  ✉ {org.email}</a>}
              </div>
            ))}
          </div>
        )}

        <button className="vp-btn vp-btn-ghost"
          style={{fontSize:".78rem",minHeight:40,color:"var(--text-dim)",marginBottom:".5rem"}}
          onClick={() => { clearSession(); onLogout(); }}>
          Cerrar sesión
        </button>

        <div style={{marginTop:"1rem", fontFamily:"var(--font-mono)", fontSize:".8rem",
          color:"var(--text-muted)", textAlign:"center", lineHeight:2}}>
          Trail El Guerrero 2026 · Club Deportivo Trail Candeleda
          {config.fecha ? <><br/>Evento: {config.fecha}</> : ""}
          {config.lugar ? <> · {config.lugar}</> : ""}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTE: Cambiar PIN
// ─────────────────────────────────────────────────────────────────────────────
function CambiarPin({ token, onDone, onCancel }) {
  const [step, setStep]   = useState(1);
  const [pin1, setPin1]   = useState(""); const [pin2, setPin2] = useState("");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const cur = step===1?pin1:pin2; const setCur = step===1?setPin1:setPin2;
  const handleChange = async (val) => {
    setCur(val); if (val.length < 4) return;
    if (step===1) { setTimeout(()=>setStep(2),120); return; }
    if (val!==pin1) { setShake(true); setPin1(""); setPin2(""); setStep(1);
      setError("Los PINs no coinciden."); setTimeout(()=>setShake(false),500); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/ficha?action=cambiar-pin`, {
        method:"POST", headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({pinNuevo:val}),
      });
      if (res.ok) onDone(); else { const d=await res.json(); setError(d.error||"Error"); }
    } catch { setError("Error de conexión"); }
    finally { setSaving(false); }
  };
  return (
    <div className="vp-card" style={{marginBottom:".75rem"}}>
      <div className="vp-card-header">
        <div className="vp-mono" style={{fontWeight:700,fontSize:".88rem"}}>
          🔐 {step===1?"Nuevo PIN (4 dígitos)":"Repite el PIN"}
        </div>
        <button className="vp-btn vp-btn-ghost vp-btn-sm" onClick={onCancel}>✕</button>
      </div>
      {error && <div className="vp-error" style={{marginBottom:".75rem"}}>⚠ {error}</div>}
      <PinNumpad value={cur} onChange={handleChange} shake={shake} disabled={saving} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTE: StepperForm (formulario de registro en 3 pasos)
// ─────────────────────────────────────────────────────────────────────────────
function StepperForm({ puestos, imgFront, imgBack, imgGuiaTallas, opcionPuesto, opcionVehiculo, opcionEmail, opcionEmergencia, onRegistrar, enviando }) {
  const [paso, setPaso]   = useState(1);
  const [form, setForm]   = useState({ nombre:"", apellidos:"", telefono:"", email:"", talla:"", puestoId:"", coche:false, telefonoEmergencia:"" });
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
    if (opcionEmergencia && !form.telefonoEmergencia?.trim()) e.telefonoEmergencia = "Requerido";
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
      nombre:   `${form.nombre.trim()} ${form.apellidos.trim()}`,
      telefono: form.telefono.trim(),
      ...(opcionEmail ? { email: form.email?.trim()||"" } : {}),
      talla:    form.talla,
      puestoId: form.puestoId ? parseInt(form.puestoId) : null,
      coche:    form.coche,
      notas:    "",
      fechaRegistro: new Date().toISOString().split("T")[0],
      ...(opcionEmergencia ? { telefonoEmergencia: form.telefonoEmergencia?.trim()||"", contactoEmergencia: form.telefonoEmergencia?.trim()||"" } : {}),
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

      {/* Barra de progreso */}
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
            {opcionEmergencia && (
              <FormField label="Teléfono de emergencia" error={errores.telefonoEmergencia}
                hint="Persona a avisar en caso de incidente">
                <input className={`pub-input${errores.telefonoEmergencia?" error":""}`}
                  type="tel" placeholder="612 345 678" inputMode="tel"
                  value={form.telefonoEmergencia||""} onChange={e=>set("telefonoEmergencia",e.target.value)} />
              </FormField>
            )}
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

            {/* Imágenes camiseta */}
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

            {/* Selector talla */}
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

      <div style={{textAlign:"center",marginTop:"1rem",fontFamily:"var(--font-mono)",
        fontSize:".6rem",color:"var(--text-dim)",lineHeight:1.6}}>
        Tus datos se usarán exclusivamente para la coordinación del evento.<br/>
        Organiza: Club Trail El Guerrero · Candeleda, Ávila
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper FormField
// ─────────────────────────────────────────────────────────────────────────────
function FormField({ label, error, hint, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:".35rem" }}>
      <label style={{ fontFamily:"var(--font-display)", fontSize:".78rem", fontWeight:600,
        color:error?"var(--red)":"var(--text)" }}>{label}</label>
      {hint && <div style={{ fontFamily:"var(--font-mono)", fontSize:".6rem", color:"var(--text-muted)", marginTop:"-.15rem" }}>{hint}</div>}
      {children}
      {error && <div style={{ fontFamily:"var(--font-mono)", fontSize:".62rem", color:"var(--red)" }}>⚠ {error}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RAÍZ DEL PORTAL — máquina de estados
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTE: Cancelar asistencia
// ─────────────────────────────────────────────────────────────────────────────
function CancelarAsistencia({ token, nombreVoluntario, onCancelado }) {
  const [open,    setOpen]    = useState(false);
  const [motivo,  setMotivo]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const cancelar = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/ficha?action=cancelar`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) { setOpen(false); onCancelado(); }
      else setError(json.error || "Error al procesar la solicitud.");
    } catch { setError("Error de conexión. Inténtalo de nuevo."); }
    finally { setSaving(false); }
  };

  if (!open) return (
    <button className="vp-btn vp-btn-ghost"
      style={{ fontSize:".78rem", minHeight:40, color:"var(--red)", borderColor:"rgba(248,113,113,.25)",
        marginBottom:".75rem" }}
      onClick={() => setOpen(true)}>
      ⚠️ No puedo asistir al evento
    </button>
  );

  return (
    <div className="vp-card" style={{ borderLeft:"3px solid var(--red)", marginBottom:".75rem" }}>
      <div className="vp-card-header">
        <div className="vp-mono" style={{ fontWeight:700, fontSize:".88rem", color:"var(--red)" }}>
          ⚠️ Cancelar asistencia
        </div>
        <button className="vp-btn vp-btn-ghost vp-btn-sm" onClick={() => setOpen(false)}>✕</button>
      </div>
      <div className="vp-mono" style={{ fontSize:".78rem", color:"var(--text-muted)", lineHeight:1.65, marginBottom:".75rem" }}>
        Hola {nombreVoluntario}, lamentamos que no puedas asistir. El organizador recibirá un aviso
        para reorganizar el puesto.
      </div>
      <div className="vp-label">Motivo (opcional)</div>
      <textarea className="vp-textarea"
        placeholder="Ej: Lesión, compromisos de trabajo, problemas de transporte…"
        value={motivo}
        onChange={e => setMotivo(e.target.value)}
        maxLength={300}
        style={{ marginBottom:".75rem", minHeight:80 }} />
      {error && <div className="vp-error" style={{ marginBottom:".75rem" }}>⚠ {error}</div>}
      <div style={{ display:"flex", gap:".5rem" }}>
        <button className="vp-btn vp-btn-ghost" style={{ minHeight:48 }}
          onClick={() => setOpen(false)}>Volver</button>
        <button className="vp-btn"
          style={{ minHeight:48, background:"var(--red)", color:"#fff", flex:1 }}
          onClick={cancelar} disabled={saving}>
          {saving ? "Procesando…" : "Confirmar — No puedo asistir"}
        </button>
      </div>
    </div>
  );
}

export default function VoluntarioPortal() {
  // pantalla: 'landing' | 'registro' | 'registro-ok' | 'login' | 'portal'
  const [pantalla, setPantalla] = useState(() => {
    const sess = loadSession();
    return sess?.token ? "portal" : "landing";
  });
  const [token,    setToken]    = useState(() => loadSession()?.token || null);
  const [regTel,   setRegTel]   = useState("");  // teléfono usado en el registro
  const [regNombre,setRegNombre]= useState("");  // nombre para pantalla ok

  const goLanding  = () => setPantalla("landing");
  const goRegistro = () => setPantalla("registro");
  const goLogin    = (telPre) => { setPantalla("login"); };
  const goPortal   = (tok)    => { setToken(tok); saveSession({ token:tok }); setPantalla("portal"); };
  const goLogout   = () => { clearSession(); setToken(null); setPantalla("landing"); };

  const onRegistroOk = (tel, nombre) => {
    setRegTel(tel);
    setRegNombre(nombre);
    setPantalla("registro-ok");
  };

  if (pantalla === "landing")      return <LandingScreen onNuevo={goRegistro} onLogin={goLogin} />;
  if (pantalla === "registro")     return <RegistroScreen onVolver={goLanding} onRegistroOk={onRegistroOk} />;
  if (pantalla === "registro-ok")  return <RegistroOkScreen telefono={regTel} nombre={regNombre} onAcceder={() => goLogin(regTel)} />;
  if (pantalla === "login")        return <LoginScreen onLogin={goPortal} onVolver={goLanding} telefonoInicial={""} />;
  if (pantalla === "portal")       return <PortalMain token={token} onLogout={goLogout} />;
  return null;
}
