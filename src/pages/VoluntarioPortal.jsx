import React, { useState, useEffect, useRef, useCallback } from "react";

const API_BASE  = "/api/voluntarios";
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

const TALLAS = ["XS","S","M","L","XL","XXL","3XL"];

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { background: #0f172a; color: #e2e8f0;
    font-family: 'Syne', 'Inter', system-ui, sans-serif; min-height: 100dvh; }
  :root {
    --cyan:   #22d3ee; --cyan-dim:   rgba(34,211,238,.1);  --cyan-border: rgba(34,211,238,.25);
    --green:  #34d399; --green-dim:  rgba(52,211,153,.1);  --green-border: rgba(52,211,153,.3);
    --amber:  #fbbf24; --amber-dim:  rgba(251,191,36,.1);  --amber-border: rgba(251,191,36,.3);
    --red:    #f87171; --red-dim:    rgba(248,113,113,.1); --red-border:  rgba(248,113,113,.3);
    --surface:  #1e293b; --surface2: #263347; --surface3: #2d3f57;
    --border: rgba(148,163,184,.15); --border2: rgba(148,163,184,.25);
    --text: #e2e8f0; --text-muted: #94a3b8; --text-dim: #475569;
    --r: 12px;
  }
  .vp-page { min-height: 100dvh; display: flex; flex-direction: column; }
  .vp-wrap { max-width: 440px; margin: 0 auto; padding: 1.25rem 1rem 5rem; width: 100%; }
  .vp-card { background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r); padding: 1.1rem; margin-bottom: .75rem; }
  .vp-card-header { display: flex; align-items: center; justify-content: space-between;
    margin-bottom: .65rem; }
  /* ── Typography — login con letras más grandes ── */
  .vp-label { font-family: 'DM Mono',monospace; font-size: .75rem; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase; color: var(--text-muted); margin-bottom: .45rem; }
  .vp-label-lg { font-family: 'DM Mono',monospace; font-size: .9rem; font-weight: 700;
    letter-spacing: .04em; text-transform: uppercase; color: var(--text-muted); margin-bottom: .55rem; }
  .vp-mono  { font-family: 'DM Mono',monospace; }
  .vp-value { font-family: 'DM Mono',monospace; font-size: .9rem; color: var(--text); }
  /* ── Buttons ── */
  .vp-btn { display: flex; align-items: center; justify-content: center; gap: .4rem;
    width: 100%; padding: .85rem 1rem; border-radius: var(--r);
    font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 800;
    cursor: pointer; border: none; transition: all .15s; min-height: 54px;
    letter-spacing: .02em; text-decoration: none; }
  .vp-btn:disabled { opacity: .5; cursor: not-allowed; }
  .vp-btn-primary  { background: var(--cyan);        color: #0f172a; }
  .vp-btn-primary:not(:disabled):hover  { filter: brightness(1.08); }
  .vp-btn-success  { background: var(--green);       color: #0f172a; }
  .vp-btn-success:not(:disabled):hover  { filter: brightness(1.08); }
  .vp-btn-done     { background: var(--green-dim);   color: var(--green);
    border: 1px solid var(--green-border); cursor: default; }
  .vp-btn-ghost    { background: transparent; color: var(--text-muted);
    border: 1px solid var(--border2); }
  .vp-btn-ghost:not(:disabled):hover { border-color: var(--cyan); color: var(--cyan); }
  .vp-btn-sm       { min-height: 40px; font-size: .78rem; padding: .45rem .85rem; font-weight: 700; width: auto; }
  /* ── Inputs ── */
  .vp-input { width: 100%; padding: .75rem .9rem; background: var(--surface2);
    border: 1.5px solid var(--border); border-radius: 10px; color: var(--text);
    font-family: 'DM Mono',monospace; font-size: 1.1rem; outline: none;
    min-height: 52px; -webkit-appearance: none; transition: border .15s; }
  .vp-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34,211,238,.12); }
  .vp-textarea { width: 100%; padding: .7rem .9rem; background: var(--surface2);
    border: 1.5px solid var(--border); border-radius: 10px; color: var(--text);
    font-family: 'DM Mono',monospace; font-size: .88rem; outline: none; resize: vertical;
    min-height: 90px; -webkit-appearance: none; transition: border .15s; line-height: 1.6; }
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
    border-radius: 12px; padding: 1rem; font-size: 1.7rem; font-weight: 700;
    cursor: pointer; text-align: center; transition: all .1s; min-height: 66px;
    display: flex; align-items: center; justify-content: center; color: var(--text);
    font-family: 'DM Mono',monospace; }
  .vp-numpad-key:active, .vp-numpad-key.pressed { transform: scale(.92);
    background: var(--cyan-dim); border-color: var(--cyan-border); }
  .vp-numpad-key.backspace { color: var(--text-muted); font-size: 1.3rem; }
  /* ── Login step hint — letras más grandes ── */
  .vp-step-title { font-family: 'Syne',sans-serif; font-size: 1.2rem; font-weight: 800;
    color: var(--text); margin-bottom: .4rem; }
  .vp-step-desc { font-family: 'DM Mono',monospace; font-size: .85rem; color: var(--text-muted);
    line-height: 1.7; margin-bottom: 1rem; }
  /* ── Shake ── */
  .vp-shake { animation: shake .4s ease; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)}
    40%{transform:translateX(7px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
  /* ── Badges ── */
  .vp-badge { display: inline-flex; align-items: center; gap: .25rem;
    padding: .2rem .65rem; border-radius: 99px;
    font-family: 'DM Mono',monospace; font-size: .65rem; font-weight: 700; }
  .vp-badge-green  { background: var(--green-dim);  color: var(--green);  border: 1px solid var(--green-border); }
  .vp-badge-amber  { background: var(--amber-dim);  color: var(--amber);  border: 1px solid var(--amber-border); }
  .vp-badge-cyan   { background: var(--cyan-dim);   color: var(--cyan);   border: 1px solid var(--cyan-border); }
  .vp-badge-red    { background: var(--red-dim);    color: var(--red);    border: 1px solid var(--red-border); }
  .vp-divider { height: 1px; background: var(--border); margin: .6rem 0; }
  .vp-row { display: flex; align-items: center; justify-content: space-between; padding: .4rem 0; }
  .vp-row-label { font-family:'DM Mono',monospace; font-size:.72rem; color:var(--text-muted); }
  .vp-companion { display:flex; align-items:center; gap:.65rem;
    padding:.5rem 0; border-bottom:1px solid var(--border); }
  .vp-companion:last-child { border-bottom:none; }
  .vp-avatar { width:36px; height:36px; border-radius:50%; background:var(--surface2);
    border:1px solid var(--border); display:flex; align-items:center; justify-content:center;
    font-weight:800; font-size:.8rem; color:var(--cyan); flex-shrink:0; }
  .vp-error { background:var(--red-dim); border:1px solid var(--red-border); border-radius:8px;
    padding:.65rem .9rem; font-family:'DM Mono',monospace; font-size:.8rem;
    color:var(--red); text-align:center; margin-top:.75rem; }
  .vp-hint { font-family:'DM Mono',monospace; font-size:.75rem; color:var(--text-dim);
    text-align:center; line-height:1.9; margin-top:.85rem; }
  .vp-toast { background:var(--green-dim); border:1px solid var(--green-border);
    border-radius:8px; padding:.55rem .9rem; margin-bottom:.75rem;
    font-family:'DM Mono',monospace; font-size:.78rem; color:var(--green); }
  .vp-topbar { display:flex; align-items:center; justify-content:space-between;
    padding:.75rem 1rem; background:var(--surface); border-bottom:1px solid var(--border);
    position:sticky; top:0; z-index:10; }
  .vp-info { background:rgba(34,211,238,.05); border:1px solid var(--cyan-border);
    border-radius:8px; padding:.7rem .9rem; margin-bottom:.75rem;
    font-family:'DM Mono',monospace; font-size:.75rem; color:var(--text-muted); line-height:1.8; }
  .vp-material-row { display:flex; justify-content:space-between; align-items:center;
    padding:.3rem 0; border-bottom:1px solid var(--border); font-size:.82rem; }
  .vp-material-row:last-child { border-bottom:none; }
`;

function PinNumpad({ value, onChange, shake, disabled }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const [pressed, setPressed] = useState(null);

  const handleKey = (k) => {
    if (disabled) return;
    if (k === "⌫") { onChange(value.slice(0,-1)); return; }
    if (value.length >= 4) return;
    onChange(value + k);
  };

  const tap = (k) => {
    setPressed(k);
    setTimeout(() => setPressed(null), 150);
    handleKey(k);
  };

  return (
    <div>
      <div className={`vp-pin-display${shake ? " vp-shake" : ""}`}>
        {[0,1,2,3].map(i => (
          <div key={i} className={`vp-pin-dot${i < value.length ? " filled" : ""}`} />
        ))}
      </div>
      <div className="vp-numpad">
        {keys.map((k, i) => (
          k === "" ? <div key={i} /> :
          <button key={i}
            className={`vp-numpad-key${k === "⌫" ? " backspace" : ""}${pressed === k ? " pressed" : ""}`}
            onClick={() => tap(k)}
            disabled={disabled}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [paso, setPaso]         = useState(1);
  const [telefono, setTelefono] = useState("");
  const [pin, setPin]           = useState("");
  const [shake, setShake]       = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const telRef = useRef(null);

  useEffect(() => { if (paso === 1) setTimeout(() => telRef.current?.focus(), 100); }, [paso]);

  const telLimpio = telefono.replace(/\D/g, "");
  const telValido = telLimpio.length >= 9;

  const irAlPin = (e) => {
    e?.preventDefault();
    if (!telValido) { setError("Introduce tu número de teléfono (mínimo 9 dígitos)"); return; }
    setError("");
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
      <div style={{ textAlign:"center", padding:"2.5rem 1rem 1.5rem" }}>
        <div style={{ fontSize:"3rem", marginBottom:".6rem" }}>🏔️</div>
        <div style={{ fontWeight:800, fontSize:"1.45rem", color:"var(--cyan)", marginBottom:".3rem" }}>
          Trail El Guerrero 2026
        </div>
        <div className="vp-mono" style={{ fontSize:".85rem", color:"var(--text-muted)" }}>
          Portal del Voluntario
        </div>
      </div>

      <div className="vp-wrap" style={{ paddingTop:0, paddingBottom:"2rem" }}>

        {paso === 1 && (
          <div>
            <div className="vp-card">
              <div className="vp-step-title">📱 Tu número de teléfono</div>
              <div className="vp-step-desc">
                Introduce el número con el que te registraste como voluntario
              </div>
              <form onSubmit={irAlPin}>
                <input
                  ref={telRef}
                  className="vp-input"
                  type="tel"
                  placeholder="612 345 678"
                  value={telefono}
                  onChange={e => { setTelefono(e.target.value); setError(""); }}
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  style={{ marginBottom:".75rem", fontSize:"1.4rem", letterSpacing:".06em" }}
                />
                {error && <div className="vp-error">⚠ {error}</div>}
                <button type="submit" className="vp-btn vp-btn-primary"
                  style={{ marginTop:".85rem", fontSize:"1.1rem" }} disabled={!telValido}>
                  Continuar →
                </button>
              </form>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div>
            <button className="vp-btn vp-btn-ghost vp-btn-sm"
              style={{ width:"auto", marginBottom:".85rem", display:"inline-flex" }}
              onClick={() => { setPaso(1); setPin(""); setError(""); }}>
              ← Cambiar teléfono
            </button>

            <div className="vp-card">
              <div style={{ textAlign:"center", marginBottom:"1.4rem" }}>
                <div className="vp-step-title">🔑 Introduce tu PIN</div>
                <div className="vp-step-desc" style={{ marginBottom:".5rem" }}>
                  Son los <strong style={{color:"var(--text)"}}>últimos 4 dígitos</strong> de tu teléfono
                  {telLimpio.length >= 4 && (
                    <> · <span style={{color:"var(--cyan)",fontWeight:800,fontSize:"1rem"}}>
                      {telLimpio.slice(-4)}
                    </span></>
                  )}
                </div>
                <div className="vp-mono" style={{ fontSize:".9rem", color:"var(--text-muted)" }}>
                  {telefono.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}
                </div>
              </div>

              <PinNumpad value={pin} onChange={handlePinChange} shake={shake} disabled={loading} />

              {error && <div className="vp-error" style={{marginTop:".85rem"}}>⚠ {error}</div>}

              {loading && (
                <div style={{ textAlign:"center", marginTop:"1rem",
                  fontFamily:"'DM Mono',monospace", fontSize:".82rem", color:"var(--cyan)" }}>
                  Verificando…
                </div>
              )}
            </div>

            <div className="vp-hint">
              ¿Problemas para entrar? Contacta con el organizador
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function PortalMain({ token, onLogout }) {
  const [data,   setData]   = useState(null);
  const [loading,setLoading]= useState(true);
  const [error,  setError]  = useState("");
  const [editando,setEditando]     = useState(false);
  const [cambiandoPin,setCPin]     = useState(false);
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [marcando,setMarcando]     = useState(false);
  const [msg,    setMsg]    = useState("");

  const showMsg = (m, ms=3500) => { setMsg(m); setTimeout(() => setMsg(""), ms); };

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/ficha`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.status === 401) { clearSession(); onLogout(); return; }
      const json = await res.json();
      setData(json);
      const v = json.voluntario || {};
      setForm({
        telefono:           v.telefono || "",
        telefonoEmergencia: v.telefonoEmergencia || v.contactoEmergencia || "",
        talla:              v.talla || "M",
        notaVoluntario:     v.notaVoluntario || "",
      });
    } catch { setError("Error de conexión. Tira abajo para recargar."); }
    finally  { setLoading(false); }
  }, [token, onLogout]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const marcarLlegada = async () => {
    if (data?.voluntario?.enPuesto) return;
    setMarcando(true);
    try {
      const res = await fetch(`${API_BASE}/ficha?action=presente`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        showMsg(`✅ Llegada registrada a las ${json.horaLlegada}`);
        await fetchData();
      }
    } catch { showMsg("❌ Error al registrar llegada."); }
    finally { setMarcando(false); }
  };

  const guardar = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/ficha`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { showMsg("✅ Datos guardados"); setEditando(false); await fetchData(); }
      else showMsg("❌ Error al guardar");
    } catch { showMsg("❌ Error de conexión"); }
    finally { setSaving(false); }
  };

  if (loading && !data) return (
    <>
      <style>{CSS}</style>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
        minHeight:"100dvh", flexDirection:"column", gap:"1rem" }}>
        <div style={{ fontSize:"2rem", animation:"spin 1s linear infinite" }}>⟳</div>
        <div className="vp-mono" style={{ fontSize:".78rem", color:"var(--text-muted)" }}>
          Cargando tu ficha…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );

  if (error && !data) return (
    <>
      <style>{CSS}</style>
      <div className="vp-wrap" style={{ paddingTop:"3rem", textAlign:"center" }}>
        <div style={{ fontSize:"2rem", marginBottom:"1rem" }}>⚠️</div>
        <div className="vp-mono" style={{ fontSize:".8rem", color:"var(--red)", marginBottom:"1.5rem" }}>{error}</div>
        <button className="vp-btn vp-btn-ghost" onClick={fetchData}>Reintentar</button>
      </div>
    </>
  );

  const {
    voluntario: v = {},
    puesto,
    companerosEnPuesto = [],
    materialPuesto = [],
    config = {}
  } = data || {};

  // Organizadores: puede venir como array o campo simple
  const organizadores = Array.isArray(config.organizadores) && config.organizadores.length > 0
    ? config.organizadores
    : (config.organizador || config.telefonoContacto)
      ? [{ nombre: config.organizador || "Organización", telefono: config.telefonoContacto || "", email: config.emailContacto || "" }]
      : [];

  return (
    <>
      <style>{CSS}</style>

      <div className="vp-topbar">
        <div>
          <div style={{ fontWeight:800, fontSize:"1rem" }}>
            {(v.nombre || "").split(" ")[0]} 👋
          </div>
          <div className="vp-mono" style={{ fontSize:".65rem", color:"var(--text-muted)" }}>
            {config.nombre || "Trail El Guerrero 2026"}
          </div>
        </div>
        <span className={`vp-badge ${v.estado === "confirmado" ? "vp-badge-green" : "vp-badge-amber"}`}>
          {v.estado === "confirmado" ? "✓ Confirmado" : v.estado || "pendiente"}
        </span>
      </div>

      <div className="vp-wrap">

        {msg && <div className="vp-toast">{msg}</div>}

        {/* ── PUESTO ── */}
        <div className="vp-card" style={{ borderLeft:`3px solid ${puesto ? "var(--cyan)" : "var(--border)"}` }}>
          <div className="vp-label">📍 Tu puesto</div>
          {puesto ? (
            <>
              <div style={{ fontWeight:700, fontSize:"1.1rem", marginBottom:".35rem" }}>{puesto.nombre}</div>
              <div className="vp-mono" style={{ fontSize:".78rem", color:"var(--text-muted)", lineHeight:1.9 }}>
                🕗 Incorporación: <strong style={{color:"var(--text)"}}>{puesto.horaInicio}</strong>
                {puesto.horaFin && ` · Hasta: ${puesto.horaFin}`}
                {puesto.distancias?.length > 0 && (
                  <><br/>📏 Distancias: {puesto.distancias.join(" · ")}</>
                )}
                {puesto.tipo && <><br/>🏷 Tipo: {puesto.tipo}</>}
              </div>
              {puesto.notas && (
                <div className="vp-mono" style={{ fontSize:".72rem", color:"var(--text-dim)",
                  marginTop:".5rem", padding:".4rem .6rem", background:"var(--surface2)",
                  borderRadius:6, borderLeft:"2px solid var(--border)" }}>
                  📋 {puesto.notas}
                </div>
              )}
            </>
          ) : (
            <div className="vp-mono" style={{ fontSize:".82rem", color:"var(--text-dim)" }}>
              ⏳ Pendiente de asignación. Te informaremos pronto.
            </div>
          )}
        </div>

        {/* ── MATERIAL DEL PUESTO ── */}
        {materialPuesto.length > 0 && (
          <div className="vp-card" style={{ borderLeft:"3px solid var(--amber)" }}>
            <div className="vp-label">📦 Material en tu puesto</div>
            {materialPuesto.map((item, i) => (
              <div key={i} className="vp-material-row">
                <span style={{ fontWeight:600 }}>{item.nombre}</span>
                <span className="vp-mono" style={{ fontSize:".78rem", color:"var(--amber)", fontWeight:700 }}>
                  {item.cantidad} {item.unidad}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── BOTÓN EN PUESTO ── */}
        <div style={{ marginBottom:".85rem" }}>
          {v.enPuesto ? (
            <button className="vp-btn vp-btn-done" disabled>
              ✅ En puesto desde las {v.horaLlegada}
            </button>
          ) : (
            <button className="vp-btn vp-btn-success" onClick={marcarLlegada}
              disabled={marcando}>
              {marcando ? "Registrando…" : "📍 Ya estoy en mi puesto"}
            </button>
          )}
        </div>

        {/* ── COMPAÑEROS DE PUESTO ── */}
        {companerosEnPuesto.length > 0 && (
          <div className="vp-card">
            <div className="vp-label">👥 Compañeros en tu puesto ({companerosEnPuesto.length})</div>
            {companerosEnPuesto.map((c, i) => {
              const iniciales = ((c.nombre||"") + " " + (c.apellidos||""))
                .trim().split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase();
              return (
                <div key={i} className="vp-companion">
                  <div className="vp-avatar" style={{
                    background: c.enPuesto ? "rgba(52,211,153,.15)" : undefined,
                    borderColor: c.enPuesto ? "var(--green-border)" : undefined,
                    color: c.enPuesto ? "var(--green)" : undefined,
                  }}>{iniciales}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:".4rem", flexWrap:"wrap" }}>
                      <span style={{ fontWeight:600, fontSize:".92rem" }}>
                        {c.nombre}{c.apellidos ? " " + c.apellidos : ""}
                      </span>
                      {c.enPuesto && (
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:".6rem",
                          background:"var(--green-dim)", color:"var(--green)",
                          border:"1px solid var(--green-border)", borderRadius:4,
                          padding:".05rem .35rem", fontWeight:700 }}>
                          📍 {c.horaLlegada || "En puesto"}
                        </span>
                      )}
                      {!c.enPuesto && c.estado === "confirmado" && (
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:".6rem",
                          background:"var(--amber-dim)", color:"var(--amber)",
                          border:"1px solid var(--amber-border)", borderRadius:4,
                          padding:".05rem .35rem", fontWeight:700 }}>
                          En camino
                        </span>
                      )}
                    </div>
                    {c.telefono && (
                      <a href={`tel:${c.telefono.replace(/\s/g,"")}`}
                        style={{ fontFamily:"'DM Mono',monospace", fontSize:".74rem",
                          color:"var(--cyan)", textDecoration:"none" }}>
                        📞 {c.telefono}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MIS DATOS ── */}
        <div className="vp-card">
          <div className="vp-card-header">
            <div className="vp-label" style={{marginBottom:0}}>Mis datos</div>
            {!editando && (
              <button className="vp-btn vp-btn-ghost vp-btn-sm"
                onClick={() => setEditando(true)}>✏️ Editar</button>
            )}
          </div>

          {editando ? (
            <>
              <div className="vp-label">📞 Teléfono</div>
              <input className="vp-input" type="tel" value={form.telefono}
                onChange={e => setForm(f=>({...f,telefono:e.target.value}))}
                style={{marginBottom:".75rem"}} />

              <div className="vp-label">🚨 Teléfono de emergencia</div>
              <input className="vp-input" type="tel" value={form.telefonoEmergencia}
                onChange={e => setForm(f=>({...f,telefonoEmergencia:e.target.value}))}
                style={{marginBottom:".75rem"}} />

              <div className="vp-label">🎽 Talla de camiseta</div>
              <select className="vp-input vp-select" value={form.talla}
                onChange={e => setForm(f=>({...f,talla:e.target.value}))}
                style={{marginBottom:".75rem"}}>
                {TALLAS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <div className="vp-label">📝 Nota para el organizador</div>
              <textarea
                className="vp-textarea"
                placeholder="Ej: Llegaré 15 min antes, traigo equipo de primeros auxilios, tengo una alergia..."
                value={form.notaVoluntario}
                onChange={e => setForm(f=>({...f,notaVoluntario:e.target.value}))}
                maxLength={500}
                style={{marginBottom:".75rem"}}
              />
              <div className="vp-mono" style={{fontSize:".65rem",color:"var(--text-dim)",textAlign:"right",marginTop:"-.5rem",marginBottom:".85rem"}}>
                {(form.notaVoluntario||"").length}/500
              </div>

              <div style={{display:"flex", gap:".5rem"}}>
                <button className="vp-btn vp-btn-ghost" style={{minHeight:48}}
                  onClick={() => setEditando(false)}>Cancelar</button>
                <button className="vp-btn vp-btn-primary" style={{minHeight:48}}
                  onClick={guardar} disabled={saving}>
                  {saving ? "Guardando…" : "💾 Guardar"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="vp-row">
                <span className="vp-row-label">📞 Teléfono</span>
                <span className="vp-value">{v.telefono || "—"}</span>
              </div>
              <div className="vp-divider"/>
              <div className="vp-row">
                <span className="vp-row-label">🚨 Emergencia</span>
                <span className="vp-value">{v.telefonoEmergencia || v.contactoEmergencia || "—"}</span>
              </div>
              <div className="vp-divider"/>
              <div className="vp-row">
                <span className="vp-row-label">🎽 Talla</span>
                <span className="vp-value">{v.talla || "—"}</span>
              </div>
              <div className="vp-divider"/>
              <div className="vp-row">
                <span className="vp-row-label">🎽 Camiseta</span>
                <span className={`vp-badge ${v.camisetaEntregada ? "vp-badge-green" : "vp-badge-amber"}`}>
                  {v.camisetaEntregada ? "✅ Entregada" : "⏳ Pendiente"}
                </span>
              </div>
              {v.nombre && (
                <>
                  <div className="vp-divider"/>
                  <div className="vp-row">
                    <span className="vp-row-label">👤 Nombre</span>
                    <span className="vp-value">{v.nombre}{v.apellidos ? " "+v.apellidos : ""}</span>
                  </div>
                </>
              )}
              {v.notaVoluntario && (
                <>
                  <div className="vp-divider"/>
                  <div style={{paddingTop:".4rem"}}>
                    <div className="vp-label" style={{marginBottom:".3rem"}}>📝 Tu nota</div>
                    <div className="vp-mono" style={{fontSize:".8rem",color:"var(--text)",lineHeight:1.7,
                      background:"var(--surface2)",borderRadius:8,padding:".55rem .75rem",
                      borderLeft:"2px solid var(--cyan)"}}>
                      {v.notaVoluntario}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* ── CAMBIAR PIN ── */}
        {cambiandoPin ? (
          <CambiarPin token={token}
            onDone={() => { setCPin(false); showMsg("✅ PIN actualizado correctamente"); }}
            onCancel={() => setCPin(false)} />
        ) : (
          <button className="vp-btn vp-btn-ghost" style={{marginBottom:".75rem"}}
            onClick={() => setCPin(true)}>
            🔐 Cambiar mi PIN
          </button>
        )}

        {/* ── CONTACTO ORGANIZADOR ── */}
        {organizadores.length > 0 && (
          <div className="vp-card" style={{marginBottom:".75rem", borderLeft:"3px solid var(--cyan)"}}>
            <div className="vp-label">📞 Contacto organizadores</div>
            {organizadores.map((org, i) => (
              <div key={i} style={{
                paddingTop: i > 0 ? ".65rem" : 0,
                marginTop:  i > 0 ? ".65rem" : 0,
                borderTop:  i > 0 ? "1px solid var(--border)" : "none"
              }}>
                {org.nombre && (
                  <div style={{fontWeight:700, fontSize:".95rem", marginBottom:".2rem"}}>{org.nombre}</div>
                )}
                {org.telefono && (
                  <a href={`tel:${org.telefono.replace(/\s/g,"")}`}
                    style={{fontFamily:"'DM Mono',monospace", fontSize:"1rem",
                      color:"var(--cyan)", textDecoration:"none", display:"block",
                      fontWeight:700, marginBottom:".1rem"}}>
                    📞 {org.telefono}
                  </a>
                )}
                {org.email && (
                  <a href={`mailto:${org.email}`}
                    style={{fontFamily:"'DM Mono',monospace", fontSize:".76rem",
                      color:"var(--text-muted)", textDecoration:"none", display:"block"}}>
                    ✉ {org.email}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <button className="vp-btn vp-btn-ghost"
          style={{fontSize:".78rem", minHeight:40, color:"var(--text-dim)", marginBottom:".5rem"}}
          onClick={() => { clearSession(); onLogout(); }}>
          Cerrar sesión
        </button>

        <div className="vp-hint" style={{marginTop:"1rem"}}>
          Trail El Guerrero 2026 · Club Deportivo Trail Candeleda
          {config.fecha ? <><br/>Evento: {config.fecha}</> : ""}
          {config.lugar ? <> · {config.lugar}</> : ""}
        </div>
      </div>
    </>
  );
}

function CambiarPin({ token, onDone, onCancel }) {
  const [step,   setStep]   = useState(1);
  const [pin1,   setPin1]   = useState("");
  const [pin2,   setPin2]   = useState("");
  const [shake,  setShake]  = useState(false);
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const cur    = step === 1 ? pin1 : pin2;
  const setCur = step === 1 ? setPin1 : setPin2;

  const handleChange = async (val) => {
    setCur(val);
    if (val.length < 4) return;
    if (step === 1) { setTimeout(() => setStep(2), 120); return; }
    if (val !== pin1) {
      setShake(true); setPin1(""); setPin2(""); setStep(1);
      setError("Los PINs no coinciden. Inténtalo de nuevo.");
      setTimeout(() => setShake(false), 500);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/ficha?action=cambiar-pin`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pinNuevo: val }),
      });
      if (res.ok) onDone();
      else { const d = await res.json(); setError(d.error || "Error"); }
    } catch { setError("Error de conexión"); }
    finally { setSaving(false); }
  };

  return (
    <div className="vp-card" style={{marginBottom:".75rem"}}>
      <div className="vp-card-header">
        <div className="vp-mono" style={{fontWeight:700, fontSize:".88rem"}}>
          🔐 {step === 1 ? "Nuevo PIN (4 dígitos)" : "Repite el PIN para confirmar"}
        </div>
        <button className="vp-btn vp-btn-ghost vp-btn-sm" onClick={onCancel}>✕</button>
      </div>
      {error && <div className="vp-error" style={{marginBottom:".75rem"}}>⚠ {error}</div>}
      <PinNumpad value={cur} onChange={handleChange} shake={shake} disabled={saving} />
      {saving && (
        <div style={{textAlign:"center", marginTop:".75rem",
          fontFamily:"'DM Mono',monospace", fontSize:".78rem", color:"var(--cyan)"}}>
          Actualizando PIN…
        </div>
      )}
    </div>
  );
}

export default function VoluntarioPortal() {
  const [token, setToken] = useState(() => loadSession()?.token || null);
  if (token) return <PortalMain token={token} onLogout={() => setToken(null)} />;
  return <LoginScreen onLogin={(t) => setToken(t)} />;
}
