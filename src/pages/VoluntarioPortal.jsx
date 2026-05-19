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
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK, GUIA_TALLAS } from "@/constants/camisetasConstants";
import {
  SK_VOL_ROOT, SK_VOL_SESSION,
  SK_VOL_PUESTOS, SK_VOL_IMG_FRONT, SK_VOL_IMG_BACK, SK_VOL_IMG_GUIA_TALLAS,
  SK_VOL_OPCION_PUESTO, SK_VOL_OPCION_VEHICULO, SK_VOL_OPCION_EMAIL,
  SK_VOL_OPCION_EMERGENCIA, SK_VOL_VOLUNTARIOS,
} from "@/constants/storageKeys";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const API_BASE   = "/api/voluntarios";
const PUBLIC_API = "/api/data/public";
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // T1.3: sync with backend (30 days)

function loadSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(SK_VOL_SESSION) || "null");
    if (!raw) return null;
    if (raw.ts && Date.now() - raw.ts > SESSION_TTL) { localStorage.removeItem(SK_VOL_SESSION); return null; }
    return raw;
  } catch { return null; }
}
function saveSession(data) { localStorage.setItem(SK_VOL_SESSION, JSON.stringify({ ...data, ts: Date.now() })); }
function clearSession() { localStorage.removeItem(SK_VOL_SESSION); }

async function fetchPublic(collection) {
  try {
    const res = await fetch(`${PUBLIC_API}?collection=${collection}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── Constantes ────────────────────────────────────────────────────────────────

// ── CSS unificado ─────────────────────────────────────────────────────────────

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
      
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", padding:"2rem 1.5rem",
        background:"radial-gradient(ellipse 80% 50% at 50% 0%, rgba(34,211,238,0.08) 0%, transparent 65%)" }}>

        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:"2.5rem", animation:"fadeUp .5s ease both" }}>
          <img src="/logo.webp" alt="Trail El Guerrero" width={96} height={96}
            style={{ marginBottom:".85rem", borderRadius:"50%",
              boxShadow:"0 0 0 3px rgba(34,211,238,.25), 0 8px 32px rgba(0,0,0,.4)" }} />
          <div style={{ fontWeight:800, fontSize:"1.9rem", color:"var(--cyan)",
            fontFamily:"var(--font-display)", marginBottom:".4rem", lineHeight:1.15 }}>
            Trail El Guerrero 2026
          </div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:"1.05rem", fontWeight:700,
            color:"var(--text-muted)", marginBottom:".3rem", letterSpacing:".04em" }}>
            Portal del Voluntario
          </div>
          {config?.fecha && (
            <div style={{ fontFamily:"var(--font-mono)", fontSize:".85rem", color:"var(--text-muted)" }}>
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
            style={{ fontSize:"1.15rem", minHeight:72, flexDirection:"column",
              gap:".3rem", lineHeight:1.35, padding:"1.1rem" }}
            onClick={onNuevo}>
            <span style={{ fontSize:"1.6rem" }}>✋</span>
            <span>Quiero ser voluntario</span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:".82rem",
              fontWeight:400, opacity:.85 }}>
              Registrarme por primera vez
            </span>
          </button>

          {/* Ya registrado */}
          <button className="vp-btn vp-btn-outline"
            style={{ fontSize:"1.15rem", minHeight:72, flexDirection:"column",
              gap:".3rem", lineHeight:1.35, padding:"1.1rem" }}
            onClick={() => onLogin("")}>
            <span style={{ fontSize:"1.6rem" }}>👤</span>
            <span>Ya soy voluntario</span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:".82rem",
              fontWeight:400, opacity:.85 }}>
              Acceder a mi ficha personal
            </span>
          </button>
        </div>

        {/* Footer */}
        <div style={{ marginTop:"2.5rem", fontFamily:"var(--font-mono)",
          fontSize:".8rem", color:"var(--text-muted)", textAlign:"center", lineHeight:2,
          animation:"fadeUp .6s .2s ease both", opacity:0, animationFillMode:"forwards" }}>
          Club Deportivo Trail Candeleda<br/>
          10ª Edición · Candeleda, Ávila · 29 Agosto 2026
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
      fetchPublic(SK_VOL_PUESTOS),
      fetchPublic(SK_VOL_IMG_FRONT),
      fetchPublic(SK_VOL_IMG_BACK),
      fetchPublic(SK_VOL_IMG_GUIA_TALLAS),
      fetchPublic(SK_VOL_OPCION_PUESTO),
      fetchPublic(SK_VOL_OPCION_VEHICULO),
      fetchPublic(SK_VOL_OPCION_EMAIL),
      fetchPublic(SK_VOL_OPCION_EMERGENCIA),
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
      const res = await fetch(`${PUBLIC_API}?collection=${SK_VOL_VOLUNTARIOS}`, {
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
          imgFront={imgFront || SHIRT_PLACEHOLDER_FRONT}
          imgBack={imgBack || SHIRT_PLACEHOLDER_BACK}
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
              El equipo organizador se pondrá en contacto contigo próximamente.
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
            onClick={() => { try { window.close(); } catch(e) { /* window.close() puede bloquearse sin opener */ } }}>
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
function LoginScreen({ onLogin, onVolver, telefonoInicial, config }) {
  const telInicial = typeof telefonoInicial === "string" ? telefonoInicial : "";
  const [paso, setPaso]         = useState(telInicial ? 2 : 1);
  const [telefono, setTelefono] = useState(telInicial);
  const [pin, setPin]           = useState("");
  const [shake, setShake]       = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [checkingPin, setCheckingPin] = useState(false);
  const [pinCambiado, setPinCambiado] = useState(false);
  const [showRecoverPin, setShowRecoverPin] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverStatus, setRecoverStatus] = useState(null); // null | 'sending' | 'done' | 'error'
  const [tieneEmail, setTieneEmail] = useState(true); // optimista: mostrar recuperación hasta saber que no hay email
  const telRef = useRef(null);

  useEffect(() => { if (paso === 1) setTimeout(() => telRef.current?.focus(), 100); }, [paso]);

  const telLimpio = telefono.replace(/\D/g,"");
  const telValido = telLimpio.length >= 9;

  const irAlPin = async (e) => {
    e?.preventDefault();
    if (!telValido) { setError("Introduce tu número de teléfono (mínimo 9 dígitos)"); return; }
    setError(""); setCheckingPin(true);
    try {
      const res = await fetch(`${API_BASE}?action=check&telefono=${encodeURIComponent(telefono.trim())}`);
      if (res.ok) {
        const d = await res.json();
        setPinCambiado(Boolean(d.pinPersonalizado));
        if (d.tieneEmail !== undefined) setTieneEmail(Boolean(d.tieneEmail));
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
      const res = await fetch(`${API_BASE}?action=auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: telefono.trim(), pin: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          // Rate limit alcanzado — no hacer shake, solo mostrar el mensaje
          setPin("");
          setError(data.error || "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
        } else {
          setShake(true); setPin(""); setError(data.error || "Teléfono o PIN incorrecto");
          setTimeout(() => setShake(false), 500);
        }
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
            {/* T5.4: Recuperación de PIN — solo si el voluntario tiene email registrado */}
            {tieneEmail ? (
              <>
            {!showRecoverPin ? (
              <div className="vp-hint">
                ¿Olvidaste tu PIN?{' '}
                <button
                  onClick={() => { setShowRecoverPin(true); setRecoverStatus(null); }}
                  style={{ background:'none', border:'none', color:'var(--cyan)', cursor:'pointer',
                    fontFamily:'var(--font-mono)', fontSize:'inherit', textDecoration:'underline', padding:0 }}
                >
                  Restablecer PIN
                </button>
              </div>
            ) : (
              <div className="vp-card" style={{ marginTop:'.75rem' }}>
                {recoverStatus === 'done' ? (
                  <div style={{ textAlign:'center', padding:'.5rem 0' }}>
                    <div style={{ fontSize:'1.5rem', marginBottom:'.4rem' }}>✅</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'var(--fs-sm)', color:'var(--green)' }}>
                      Si el email está registrado, tu PIN ha sido restablecido al PIN inicial (últimos 4 dígitos de tu teléfono).
                    </div>
                    <button className="vp-btn vp-btn-ghost" style={{ marginTop:'.75rem', minHeight:40, fontSize:'.82rem' }}
                      onClick={() => { setShowRecoverPin(false); setRecoverStatus(null); setRecoverEmail(''); }}>
                      ← Volver al login
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="vp-label">🔑 Restablecer PIN</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'var(--fs-xs)', color:'var(--text-muted)', marginBottom:'.75rem', lineHeight:1.7 }}>
                      Introduce el email con el que te registraste. Tu PIN se restablecerá a los últimos 4 dígitos de tu teléfono.
                    </div>
                    <input
                      className="vp-input" type="email" placeholder="tu@email.com"
                      value={recoverEmail}
                      onChange={e => setRecoverEmail(e.target.value)}
                      style={{ marginBottom:'.75rem' }}
                    />
                    {recoverStatus === 'error' && (
                      <div className="vp-error" style={{ marginBottom:'.5rem' }}>Error al procesar la solicitud. Inténtalo de nuevo.</div>
                    )}
                    <button
                      className="vp-btn vp-btn-primary"
                      disabled={!recoverEmail.includes('@') || recoverStatus === 'sending'}
                      onClick={async () => {
                        setRecoverStatus('sending');
                        try {
                          const res = await fetch(`${API_BASE}?action=recover-pin`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: recoverEmail }),
                          });
                          if (res.ok) setRecoverStatus('done');
                          else setRecoverStatus('error');
                        } catch { setRecoverStatus('error'); }
                      }}
                    >
                      {recoverStatus === 'sending' ? 'Enviando…' : 'Restablecer PIN'}
                    </button>
                    <button className="vp-btn vp-btn-ghost" style={{ marginTop:'.5rem', minHeight:40, fontSize:'.82rem' }}
                      onClick={() => { setShowRecoverPin(false); setRecoverStatus(null); setRecoverEmail(''); }}>
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            )}
              </>
            ) : (
              <div className="vp-hint">
                ¿Olvidaste tu PIN? Contacta con el organizador
                {config?.telefonoContacto ? (
                  <>
                    {" "}en el{" "}
                    <a href={`tel:${config.telefonoContacto}`}
                      style={{ color: "var(--cyan)", textDecoration: "underline", fontFamily: "var(--font-mono)" }}>
                      {config.telefonoContacto}
                    </a>
                  </>
                ) : "."}
              </div>
            )}
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
  const [expandido, setExpandido] = useState(true); // abierto por defecto
  if (!puesto) return (
    <div className="vp-card" style={{ borderLeft:"3px solid var(--border)", textAlign:"center", padding:"1.5rem 1rem" }}>
      <div style={{ fontSize:"2rem", marginBottom:".5rem" }}>⏳</div>
      <div style={{ fontWeight:700, fontSize:".92rem", color:"var(--text)", marginBottom:".3rem" }}>
        Tu puesto aún no está asignado
      </div>
      <div className="vp-mono" style={{ fontSize:".72rem", color:"var(--text-muted)", lineHeight:1.65 }}>
        El organizador te lo comunicará por email cuando esté confirmado.<br />
        No necesitas hacer nada por ahora.
      </div>
    </div>
  );
  return (
    <div className="vp-card" style={{ borderLeft:"3px solid var(--cyan)", padding:0, overflow:"hidden" }}>
      {/* Cabecera siempre visible */}
      <button
        onClick={() => setExpandido(v => !v)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"1rem 1.1rem", background:"transparent", border:"none", cursor:"pointer",
          textAlign:"left", gap:".75rem", minHeight:70, WebkitTapHighlightColor:"transparent" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="vp-label" style={{ marginBottom:".2rem" }}>📍 Tu puesto</div>
          <div style={{ fontWeight:700, fontSize:"1.05rem", color:"var(--text)" }}>{puesto.nombre}</div>
          <div className="vp-mono" style={{ fontSize:".75rem", color:"var(--text-muted)", marginTop:".2rem" }}>
            🕗 {puesto.horaInicio}{puesto.horaFin ? ` – ${puesto.horaFin}` : ""}
            {puesto.tipo ? ` · ${puesto.tipo}` : ""}
          </div>
          {!expandido && (
            <div className="vp-mono" style={{ fontSize:".65rem", color:"var(--cyan)", marginTop:".2rem" }}>
              👆 Toca para ver más detalles
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
          {/* PORTAL-02: enlace a Google Maps si el puesto tiene coordenadas */}
          {puesto.lat && puesto.lng && (
            <a
              href={`https://maps.google.com/?q=${puesto.lat},${puesto.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="vp-btn vp-btn-ghost"
              style={{ display:"block", textAlign:"center", marginTop:".75rem", textDecoration:"none" }}
            >
              📍 Cómo llegar
            </a>
          )}
          <div className="vp-mono" style={{ fontSize:"var(--fs-xs)", color:"var(--text-muted)",
            marginTop:".75rem", textAlign:"center",
            padding:".35rem",background:"rgba(148,163,184,.05)",borderRadius:6 }}>
            📋 Vista de consulta · Para cambios, contacta con el organizador
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
  // SEC-02: dismissal del banner de PIN automático — solo en sesión, no persistente
  const [bannerPinDismissed, setBannerPinDismissed] = useState(false);
  // SEC-06: forzar cambio de PIN en el primer login (PIN = últimos 4 dígitos del teléfono)
  const [mustChangePin, setMustChangePin] = useState(false);
  const [form,       setForm]       = useState({});
  const [saving,     setSaving]     = useState(false);
  const [marcando,    setMarcando]    = useState(false);
  const [confirmLlegada, setConfirmLlegada] = useState(false);
  const [msg,         setMsg]         = useState("");
  // PORTAL-01: estado del formulario de autoedición restringida
  const [editForm,   setEditForm]   = useState({ talla:"", email:"", telefonoEmergencia:"", mensajeParaOrganizador:"" });
  const [editOrig,   setEditOrig]   = useState({ talla:"", email:"", telefonoEmergencia:"", mensajeParaOrganizador:"" });
  const [editError,  setEditError]  = useState("");

  const showMsg = (m, ms=3500) => { setMsg(m); setTimeout(() => setMsg(""), ms); };

  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const fetchData = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}?action=ficha`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.status === 401) { clearSession(); onLogout(); return; }
      const json = await res.json();
      setData(json);
      setUltimaActualizacion(new Date());
      // SEC-06: si el PIN no ha sido personalizado, forzar cambio inmediato
      if (json.voluntario && json.voluntario.pinPersonalizado === false) {
        setMustChangePin(true);
      }
      const v = json.voluntario || {};
      setForm({
        telefono:           v.telefono || "",
        telefonoEmergencia: v.telefonoEmergencia || v.contactoEmergencia || "",
        talla:              v.talla || "M",
        notaVoluntario:     v.notaVoluntario || "",
        alergias:           v.alergias || "",
        medicacion:         v.medicacion || "",
      });
      // PORTAL-01: inicializar el formulario de autoedición restringida
      const orig = {
        talla:              v.talla || "M",
        email:              v.email || "",
        telefonoEmergencia: v.telefonoEmergencia || v.contactoEmergencia || "",
        mensajeParaOrganizador: v.mensajeParaOrganizador || "",
      };
      setEditForm(orig);
      setEditOrig(orig);
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
      const res = await fetch(`${API_BASE}?action=presente`, {
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
      const res = await fetch(`${API_BASE}?action=ficha`, {
        method: "PATCH", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      if (res.ok) { showMsg("✅ Datos guardados"); setEditando(false); await fetchData(); }
      else showMsg("❌ Error al guardar");
    } catch { showMsg("❌ Error de conexión"); }
    finally  { setSaving(false); }
  };

  // PORTAL-01: guardar solo los 3 campos editables con validación
  const validarEmail = (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const haycambiosEdit = editForm.talla !== editOrig.talla
    || editForm.email !== editOrig.email
    || editForm.telefonoEmergencia !== editOrig.telefonoEmergencia
    || editForm.mensajeParaOrganizador !== editOrig.mensajeParaOrganizador;

  const guardarEdit = async () => {
    setEditError("");
    if (!validarEmail(editForm.email)) {
      setEditError("El formato del email no es válido.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}?action=ficha`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          talla:              editForm.talla,
          email:              editForm.email,
          telefonoEmergencia: editForm.telefonoEmergencia,
          mensajeParaOrganizador: editForm.mensajeParaOrganizador,
        }),
      });
      if (res.ok) {
        setEditando(false);
        setEditError("");
        showMsg("✅ Datos actualizados");
        await fetchData();
      } else {
        let msg = "No se pudieron guardar los cambios. Inténtalo de nuevo.";
        try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
        setEditError(msg);
      }
    } catch {
      setEditError("Error de conexión. Comprueba tu red e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return (
    <>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
        minHeight:"100dvh", flexDirection:"column", gap:"1rem" }}>
        <div style={{ fontSize:"2rem", animation:"spin 1s linear infinite" }}>⟳</div>
        <div className="vp-mono" style={{ fontSize:".78rem", color:"var(--text-muted)" }}>Cargando tu ficha…</div>
      </div></>
  );

  if (error && !data) return (
    <>
      <div className="vp-wrap" style={{ paddingTop:"3rem", textAlign:"center" }}>
        <div style={{ fontSize:"2rem", marginBottom:"1rem" }}>⚠️</div>
        <div className="vp-mono" style={{ fontSize:".8rem", color:"var(--red)", marginBottom:"1.5rem" }}>{error}</div>
        <button className="vp-btn vp-btn-ghost" onClick={fetchData}>Reintentar</button>
      </div></>
  );

  // SEC-06: pantalla bloqueante de cambio de PIN obligatorio (primer login)
  if (mustChangePin) return (
    <>
      <div className="vp-page" style={{ minHeight:"100dvh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        background:"radial-gradient(ellipse 60% 40% at 50% 0%, rgba(251,191,36,0.08) 0%, transparent 60%)" }}>
        <div style={{ maxWidth:420, width:"100%", padding:"1.5rem 1.25rem", animation:"fadeUp .4s ease both" }}>
          <div style={{ textAlign:"center", marginBottom:"1.5rem" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:".6rem" }}>🔐</div>
            <div style={{ fontWeight:800, fontSize:"1.35rem", color:"var(--amber)",
              fontFamily:"var(--font-display)", marginBottom:".5rem" }}>
              Personaliza tu PIN
            </div>
            <div className="vp-mono" style={{ fontSize:".8rem", color:"var(--text-muted)", lineHeight:1.7 }}>
              Por seguridad, debes establecer un PIN personal antes de acceder a tu ficha.
              <br/>Tu PIN provisional eran los <strong style={{color:"var(--text)"}}>últimos 4 dígitos de tu teléfono</strong>.
            </div>
          </div>
          <CambiarPin
            token={token}
            hideCancel={true}
            onDone={() => { setMustChangePin(false); fetchData(true); }}
            onCancel={null}
          />
        </div>
      </div>
    </>
  );

  const { voluntario:v={}, puesto, companerosEnPuesto=[], materialPuesto=[], config={} } = data || {};

  const organizadores = Array.isArray(config.organizadores) && config.organizadores.length > 0
    ? config.organizadores
    : (config.organizador || config.telefonoContacto)
      ? [{ nombre:config.organizador||"Organización", telefono:config.telefonoContacto||"", email:config.emailContacto||"" }]
      : [];

  // Pantalla específica para voluntario con participación cancelada
  if (v.estado === "ausente") return (
    <>
      <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:"2rem 1.5rem",
        background:"var(--bg2)", textAlign:"center" }}>
        <div style={{ fontSize:"3rem", marginBottom:".75rem" }}>📋</div>
        <div style={{ fontWeight:800, fontSize:"var(--fs-xl)", color:"var(--amber)",
          fontFamily:"var(--font-display)", marginBottom:".5rem" }}>
          Registro de asistencia completado
        </div>
        <div className="vp-mono" style={{ fontSize:"var(--fs-sm)", color:"var(--text-muted)",
          maxWidth:340, lineHeight:1.6, marginBottom:"1.25rem" }}>
          Gracias por tu participación en Trail El Guerrero 2026.
          Si crees que hay un error, contacta con la organización.
        </div>
        {organizadores.length > 0 && (
          <div style={{ width:"100%", maxWidth:340 }}>
            {organizadores.map((o, i) => (
              <a key={i} href={`tel:${o.telefono}`} className="vp-btn vp-btn-ghost"
                style={{ display:"block", width:"100%", marginBottom:".5rem", textAlign:"center" }}>
                📞 {o.nombre || "Organización"} — {o.telefono}
              </a>
            ))}
          </div>
        )}
        <button className="vp-btn vp-btn-ghost"
          style={{ maxWidth:340, width:"100%", marginTop:".5rem" }}
          onClick={() => { clearSession(); onLogout(); }}>
          Cerrar sesión
        </button>
      </div>
    </>
  );

  if (v.estado === "cancelado") return (
    <>
      <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:"2rem 1.5rem",
        background:"var(--bg2)", textAlign:"center" }}>
        <div style={{ fontSize:"3rem", marginBottom:".75rem" }}>😔</div>
        <div style={{ fontWeight:800, fontSize:"var(--fs-xl)", color:"var(--red)",
          fontFamily:"var(--font-display)", marginBottom:".5rem" }}>
          Participación cancelada
        </div>
        <div className="vp-mono" style={{ fontSize:"var(--fs-sm)", color:"var(--text-muted)",
          lineHeight:1.8, maxWidth:360, marginBottom:"1.5rem" }}>
          Hola {(v.nombre||"").split(" ")[0]}, tu participación como voluntario
          en <strong style={{color:"var(--text)"}}>{config.nombre || "Trail El Guerrero 2026"}</strong> ha
          sido cancelada.
        </div>
        {v.motivoCancelacion && (
          <div style={{ background:"var(--red-dim)", border:"1px solid var(--red-border)",
            borderRadius:10, padding:".75rem 1rem", marginBottom:"1.5rem",
            maxWidth:360, width:"100%" }}>
            <div className="vp-mono" style={{ fontSize:"var(--fs-xs)", color:"var(--red)",
              fontWeight:700, marginBottom:".3rem" }}>Motivo indicado</div>
            <div className="vp-mono" style={{ fontSize:"var(--fs-sm)", color:"var(--text-muted)" }}>
              {v.motivoCancelacion}
            </div>
          </div>
        )}
        {organizadores.length > 0 && (
          <div className="vp-card" style={{ maxWidth:360, width:"100%", marginBottom:"1rem" }}>
            <div className="vp-label" style={{marginBottom:".5rem"}}>📞 Contacta con el organizador</div>
            {organizadores.map((org, i) => (
              <div key={i} style={{ paddingTop:i>0?".5rem":0, borderTop:i>0?"1px solid var(--border)":"none" }}>
                {org.nombre && <div style={{ fontWeight:700, marginBottom:".2rem" }}>{org.nombre}</div>}
                {org.telefono && (
                  <a href={`tel:${org.telefono.replace(/\s/g,"")}`}
                    style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                      color:"var(--cyan)", textDecoration:"none", display:"block" }}>
                    📞 {org.telefono}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        <button className="vp-btn vp-btn-ghost"
          style={{ maxWidth:360, width:"100%", fontSize:"var(--fs-xs)" }}
          onClick={() => { clearSession(); onLogout(); }}>
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
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
            <button onClick={() => { clearSession(); onLogout(); }}
              title="Cerrar sesión"
              style={{ background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)",
                borderRadius:8, cursor:"pointer", fontFamily:"var(--font-mono)",
                fontSize:".7rem", color:"var(--red)", padding:".4rem .7rem",
                fontWeight:700, letterSpacing:".02em",
                minHeight:"44px", display:"flex", alignItems:"center" }}>
              Salir
            </button>
            <button onClick={() => fetchData(true)}
              title="Actualizar mi ficha"
              style={{ background:"none", border:"none", cursor:"pointer",
                fontFamily:"var(--font-mono)", fontSize:"1rem", color:"var(--text-muted)",
                padding:".2rem .35rem", lineHeight:1, borderRadius:6,
                transition:"color .15s" }}
              onMouseEnter={e=>e.currentTarget.style.color="var(--cyan)"}
              onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}>⟳</button>
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

      {/* Índice de secciones — navegación rápida móvil */}
      <div style={{
        overflowX:"auto", display:"flex", gap:".35rem", padding:".45rem 1rem",
        background:"var(--surface)", borderBottom:"1px solid var(--border)",
        scrollbarWidth:"none"
      }}>
        {[
          { id:"sec-puesto",    icon:"📍", label:"Puesto" },
          ...(companerosEnPuesto.length > 0 ? [{ id:"sec-compan", icon:"👥", label:`Equipo (${companerosEnPuesto.length})` }] : []),
          // PORTAL-03: enlace a sección El día de la carrera (solo si diasHasta <= 7)
          ...(config.fecha && Math.ceil((new Date(config.fecha) - new Date()) / 86400000) <= 7 && Math.ceil((new Date(config.fecha) - new Date()) / 86400000) >= 0
            ? [{ id:"sec-diacarrera", icon:"🏁", label:"El día" }]
            : []),
          { id:"sec-datos",    icon:"👤", label:"Mis datos" },
          ...(organizadores.length > 0 ? [{ id:"sec-contacto", icon:"📞", label:"Contacto" }] : []),
        ].map(s => (
          <button key={s.id}
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior:"smooth", block:"start" })}
            style={{ flexShrink:0, background:"var(--surface2)", border:"1px solid var(--border)",
              borderRadius:20, padding:".25rem .75rem", fontFamily:"var(--font-mono)",
              fontSize:".65rem", color:"var(--text-muted)", cursor:"pointer", whiteSpace:"nowrap",
              display:"flex", alignItems:"center", gap:".3rem" }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div className="vp-wrap">
        {msg && <div className="vp-toast">{msg}</div>}

        {/* Banner PIN automático — SEC-02. PIN temporal activo: el voluntario usa el PIN inicial (últimos 4 dígitos del teléfono) sin haberlo personalizado. */}
        {!v.pinPersonalizado && v.estado !== "cancelado" && !bannerPinDismissed && (
          <div style={{
            background: "rgba(251,191,36,.07)",
            border: "1px solid rgba(251,191,36,.28)",
            borderRadius: 8,
            padding: ".55rem .85rem",
            marginBottom: ".75rem",
            display: "flex", alignItems: "center", gap: ".65rem",
          }}>
            <span style={{ fontSize: "1rem", flexShrink: 0, lineHeight: 1 }}>⚠️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="vp-mono" style={{
                fontSize: ".72rem", color: "var(--amber)", lineHeight: 1.55,
              }}>
                Estás usando el PIN automático.{" "}
                <button
                  onClick={() => setCPin(true)}
                  style={{
                    background: "none", border: "none", padding: 0,
                    fontFamily: "var(--font-mono)", fontSize: ".72rem",
                    fontWeight: 700, color: "var(--amber)",
                    textDecoration: "underline", cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}>
                  Cámbialo para mayor seguridad →
                </button>
              </span>
            </div>
            <button
              onClick={() => setBannerPinDismissed(true)}
              aria-label="Cerrar aviso"
              style={{
                background: "none", border: "none",
                color: "rgba(251,191,36,.5)", cursor: "pointer",
                fontSize: ".9rem", lineHeight: 1, padding: ".1rem .2rem",
                flexShrink: 0, transition: "color .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--amber)"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(251,191,36,.5)"}
            >✕</button>
          </div>
        )}

        {/* CTA prominente de llegada — antes que todo cuando confirmar es la acción clave */}
        {v.estado === "confirmado" && !v.enPuesto && puesto && (
          <div style={{ background:"linear-gradient(135deg, rgba(52,211,153,.12) 0%, rgba(34,211,238,.08) 100%)",
            border:"2px solid var(--green-border)", borderRadius:12, padding:"1rem",
            marginBottom:".85rem", textAlign:"center" }}
            onClick={() => !confirmLlegada && setConfirmLlegada(true)}>
            <div style={{ fontSize:"2rem", lineHeight:1, marginBottom:".4rem" }}>🏔️</div>
            <div style={{ fontWeight:800, fontSize:"var(--fs-md)", color:"var(--green)",
              fontFamily:"var(--font-display)", marginBottom:".2rem" }}>
              {confirmLlegada ? "¿Confirmas que estás en tu puesto?" : "¿Ya estás en tu puesto?"}
            </div>
            <div className="vp-mono" style={{ fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginBottom:".75rem" }}>
              {puesto.nombre}
            </div>
            {confirmLlegada ? (
              <div style={{ display:"flex", gap:".5rem", justifyContent:"center" }}>
                <button className="vp-btn vp-btn-ghost" style={{ flex:1, maxWidth:140 }}
                  onClick={e => { e.stopPropagation(); setConfirmLlegada(false); }}>Cancelar</button>
                <button className="vp-btn vp-btn-success" style={{ flex:1, maxWidth:180 }}
                  onClick={e => { e.stopPropagation(); marcarLlegada(); }} disabled={marcando}>
                  {marcando ? "Registrando…" : "✅ Confirmar llegada"}
                </button>
              </div>
            ) : (
              <button className="vp-btn vp-btn-success" style={{ width:"100%", maxWidth:280 }}>
                ✅ Confirmar llegada al puesto
              </button>
            )}
          </div>
        )}
        {v.enPuesto && (
          <div style={{ background:"rgba(52,211,153,.08)", border:"1px solid var(--green-border)",
            borderRadius:10, padding:".75rem 1rem", marginBottom:".85rem", textAlign:"center" }}>
            <div style={{ fontWeight:700, color:"var(--green)", fontSize:"var(--fs-md)" }}>
              ✅ En puesto desde las {v.horaLlegada}
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
            <div style={{ textAlign:"center", padding:".75rem 0" }}>
              <div style={{ fontSize:"1.5rem", marginBottom:".35rem" }}>⏳</div>
              <div style={{ fontWeight:700, fontSize:".85rem", color:"var(--text)", marginBottom:".2rem" }}>
                Tu puesto aún no está asignado
              </div>
              <div className="vp-mono" style={{ fontSize:".7rem", color:"var(--text-muted)", lineHeight:1.65 }}>
                Te lo comunicaremos por email cuando esté confirmado.
              </div>
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

        {/* Indicador de estado de llegada — solo informativo, sin acción (CTA superior es el punto de acción) */}
        {v.enPuesto && (
          <div style={{ marginBottom:".85rem" }}>
            <button className="vp-btn vp-btn-done" disabled>✅ En puesto desde las {v.horaLlegada}</button>
          </div>
        )}

        {/* Compañeros */}
        {companerosEnPuesto.length > 0 && (
          <div id="sec-compan" className="vp-card">
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

        {/* PORTAL-03: Sección "El día de la carrera" — visible solo cuando diasHasta <= 7 */}
        {config.fecha && (() => {
          const diasHasta = Math.ceil((new Date(config.fecha) - new Date()) / 86400000);
          if (diasHasta > 7 || diasHasta < 0) return null;

          const horaConcentracion  = config.concentracionHora  || "";
          const lugarConcentracion = config.concentracionLugar || "";
          const placeholder        = "A confirmar por el organizador";

          // Primer organizador disponible como contacto directo
          const contacto = organizadores[0] || null;

          const instrucciones      = config.instruccionesGenerales || "";

          const esHoy     = diasHasta === 0;
          const esManiana = diasHasta === 1;
          const labelDia  = esHoy ? "🏃 ¡Hoy es el día!" : esManiana ? "⚡ ¡Mañana!" : `⚡ En ${diasHasta} días`;

          return (
            <div id="sec-diacarrera" className="vp-card" style={{
              borderLeft:"3px solid var(--green)",
              background:"rgba(52,211,153,.04)"
            }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                marginBottom:".85rem", gap:".5rem" }}>
                <div className="vp-label" style={{ marginBottom:0, color:"var(--green)" }}>
                  🏁 El día de la carrera
                </div>
                <span className="vp-mono" style={{
                  fontSize:".62rem", fontWeight:700,
                  color: esHoy ? "var(--green)" : "var(--amber)",
                  background: esHoy ? "var(--green-dim)" : "rgba(251,191,36,.1)",
                  border: `1px solid ${esHoy ? "var(--green-border)" : "rgba(251,191,36,.3)"}`,
                  borderRadius:4, padding:".1rem .45rem"
                }}>{labelDia}</span>
              </div>

              {/* Concentración */}
              <div style={{
                display:"grid", gridTemplateColumns:"1fr 1fr", gap:".5rem",
                marginBottom:"1rem"
              }}>
                <div style={{
                  background:"var(--surface2)", borderRadius:8, padding:".65rem .8rem",
                  borderTop:"2px solid var(--cyan)"
                }}>
                  <div className="vp-mono" style={{ fontSize:".6rem", color:"var(--cyan)",
                    fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:".3rem" }}>
                    📍 Concentración
                  </div>
                  <div style={{ fontSize:".88rem", fontWeight:700, color:"var(--text)", lineHeight:1.4 }}>
                    {lugarConcentracion || <span style={{color:"var(--text-dim)",fontWeight:400,fontSize:".78rem"}}>{placeholder}</span>}
                  </div>
                </div>
                <div style={{
                  background:"var(--surface2)", borderRadius:8, padding:".65rem .8rem",
                  borderTop:"2px solid var(--cyan)"
                }}>
                  <div className="vp-mono" style={{ fontSize:".6rem", color:"var(--cyan)",
                    fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:".3rem" }}>
                    🕗 Hora
                  </div>
                  <div style={{ fontSize:"1.15rem", fontWeight:800, color:"var(--text)",
                    fontFamily:"var(--font-mono)", letterSpacing:".03em" }}>
                    {horaConcentracion || <span style={{color:"var(--text-dim)",fontWeight:400,fontSize:".78rem"}}>{placeholder}</span>}
                  </div>
                </div>
              </div>

              {/* Instrucciones del organizador — solo si están configuradas */}
              {instrucciones && (
                <div style={{
                  background:"var(--surface2)", borderRadius:8,
                  padding:".7rem .85rem", marginBottom:"1rem",
                  borderLeft:"2px solid var(--cyan-border)"
                }}>
                  <div className="vp-mono" style={{ fontSize:".6rem", color:"var(--text-muted)",
                    fontWeight:700, textTransform:"uppercase", letterSpacing:".05em",
                    marginBottom:".4rem" }}>
                    📋 Instrucciones
                  </div>
                  <div style={{ fontSize:".88rem", color:"var(--text)", lineHeight:1.65 }}>
                    {instrucciones}
                  </div>
                </div>
              )}

              {/* Contacto directo del responsable */}
              {contacto && (
                <div style={{
                  background:"var(--surface2)", borderRadius:8, padding:".65rem .85rem",
                  borderLeft:"2px solid var(--cyan-border)"
                }}>
                  <div className="vp-mono" style={{ fontSize:".6rem", color:"var(--text-muted)",
                    fontWeight:700, textTransform:"uppercase", letterSpacing:".05em",
                    marginBottom:".4rem" }}>
                    📞 Contacto directo
                  </div>
                  {contacto.nombre && (
                    <div style={{ fontWeight:700, fontSize:".9rem", marginBottom:".25rem" }}>
                      {contacto.nombre}
                    </div>
                  )}
                  {contacto.telefono && (
                    <a
                      href={`tel:${contacto.telefono.replace(/\s/g,"")}`}
                      style={{ display:"flex", alignItems:"center", gap:".5rem",
                        fontFamily:"var(--font-mono)", fontSize:"1.05rem", fontWeight:800,
                        color:"var(--cyan)", textDecoration:"none" }}
                    >
                      📞 {contacto.telefono}
                    </a>
                  )}
                </div>
              )}

              {/* CTA final tranquilizador */}
              <div className="vp-mono" style={{
                marginTop:".85rem", fontSize:".7rem", color:"var(--text-dim)",
                textAlign:"center", lineHeight:1.6,
                padding:".4rem", background:"rgba(52,211,153,.06)",
                borderRadius:6, border:"1px solid rgba(52,211,153,.15)"
              }}>
                Cuando llegues, dirígete directamente a tu puesto 📍<br/>
                <span style={{color:"var(--text-muted)"}}>Tu ficha tiene todos los detalles.</span>
              </div>
            </div>
          );
        })()}

        {/* Mis datos — PORTAL-01 */}
        {(() => {
          // Calcular diasHasta para lógica de bloqueo temporal
          const diasHasta = config.fecha
            ? Math.ceil((new Date(config.fecha) - new Date()) / 86400000)
            : 999;
          const bloqueado = diasHasta <= 7;
          const tooltipBloqueo = "Los datos se han bloqueado a 7 días del evento";

          // Estilos reutilizables para campos bloqueados
          const styleFieldWrap = { position:"relative", marginBottom:".75rem" };
          const styleInputBloq = {
            opacity:.55, cursor:"not-allowed",
            background:"var(--surface2)", borderColor:"var(--border)"
          };

          return (
            <div id="sec-datos" className="vp-card">
              <div className="vp-card-header">
                <div className="vp-label" style={{marginBottom:0}}>Mis datos</div>
                {!editando && (
                  <button
                    className="vp-btn vp-btn-ghost vp-btn-sm"
                    onClick={() => { setEditError(""); setEditando(true); }}
                    title={bloqueado ? tooltipBloqueo : "Editar mis datos"}
                  >
                    ✏️ Editar mis datos
                  </button>
                )}
              </div>

              {editando ? (
                <>
                  {/* Aviso de bloqueo cuando diasHasta <= 7 */}
                  {bloqueado && (
                    <div style={{
                      background:"rgba(248,113,113,.08)", border:"1px solid var(--red-border)",
                      borderRadius:8, padding:".55rem .85rem", marginBottom:"1rem",
                      display:"flex", alignItems:"center", gap:".5rem"
                    }}>
                      <span style={{fontSize:"1rem",flexShrink:0}}>🔒</span>
                      <span className="vp-mono" style={{fontSize:".72rem",color:"var(--red)",lineHeight:1.55}}>
                        {tooltipBloqueo}
                      </span>
                    </div>
                  )}

                  {/* Talla — editable (bloqueado cerca del evento) */}
                  <div style={styleFieldWrap}>
                    <div className="vp-label">🎽 Talla de camiseta</div>
                    <div title={bloqueado ? tooltipBloqueo : undefined} style={{position:"relative"}}>
                      <select
                        className="vp-input vp-select"
                        value={editForm.talla}
                        onChange={e => setEditForm(f=>({...f,talla:e.target.value}))}
                        disabled={bloqueado}
                        style={bloqueado ? styleInputBloq : undefined}
                      >
                        {TALLAS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Email — editable (bloqueado cerca del evento) */}
                  <div style={styleFieldWrap}>
                    <div className="vp-label">✉️ Email</div>
                    <div title={bloqueado ? tooltipBloqueo : undefined}>
                      <input
                        className="vp-input"
                        type="email"
                        placeholder="tu@email.com"
                        value={editForm.email}
                        onChange={e => setEditForm(f=>({...f,email:e.target.value}))}
                        disabled={bloqueado}
                        style={bloqueado ? styleInputBloq : undefined}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Teléfono emergencia — editable (bloqueado cerca del evento) */}
                  <div style={styleFieldWrap}>
                    <div className="vp-label">🚨 Teléfono de emergencia</div>
                    <div title={bloqueado ? tooltipBloqueo : undefined}>
                      <input
                        className="vp-input"
                        type="tel"
                        placeholder="Ej: 600 123 456"
                        value={editForm.telefonoEmergencia}
                        onChange={e => setEditForm(f=>({...f,telefonoEmergencia:e.target.value}))}
                        disabled={bloqueado}
                        style={bloqueado ? styleInputBloq : undefined}
                      />
                    </div>
                  </div>

                  {/* Mensaje para el organizador — siempre editable */}
                  <div style={styleFieldWrap}>
                    <div className="vp-label">💬 Mensaje para la organización</div>
                    <div className="vp-mono" style={{ fontSize:".68rem", color:"var(--text-muted)", marginBottom:".35rem", lineHeight:1.55 }}>
                      Cualquier pregunta, necesidad especial o comentario para el equipo organizador.
                    </div>
                    <textarea
                      className="vp-input"
                      placeholder="Ej: Tengo dudas sobre el horario, llegaré en transporte público…"
                      value={editForm.mensajeParaOrganizador}
                      onChange={e => setEditForm(f=>({...f,mensajeParaOrganizador:e.target.value}))}
                      maxLength={500}
                      rows={3}
                      style={{ resize:"vertical", minHeight:72, fontFamily:"var(--font-mono)", fontSize:".82rem" }}
                    />
                    <div className="vp-mono" style={{ fontSize:".65rem", color:"var(--text-dim)", textAlign:"right", marginTop:".2rem" }}>
                      {editForm.mensajeParaOrganizador.length}/500
                    </div>
                  </div>

                  {/* Nota: campos no editables */}
                  <div className="vp-mono" style={{
                    fontSize:".67rem", color:"var(--text-dim)", marginBottom:".9rem",
                    background:"var(--surface2)", borderRadius:6,
                    padding:".35rem .6rem", borderLeft:"2px solid var(--border)"
                  }}>
                    🔒 Nombre, teléfono y puesto solo pueden modificarlos los organizadores.
                  </div>

                  {/* Error inline */}
                  {editError && (
                    <div style={{
                      background:"rgba(248,113,113,.08)", border:"1px solid var(--red-border)",
                      borderRadius:8, padding:".5rem .8rem", marginBottom:".75rem",
                      display:"flex", alignItems:"center", gap:".4rem"
                    }}>
                      <span style={{flexShrink:0}}>⚠️</span>
                      <span className="vp-mono" style={{fontSize:".72rem",color:"var(--red)",lineHeight:1.5}}>
                        {editError}
                      </span>
                    </div>
                  )}

                  {/* Botones Guardar / Cancelar */}
                  <div style={{display:"flex", gap:".5rem"}}>
                    <button
                      className="vp-btn vp-btn-ghost"
                      style={{minHeight:48, flex:1}}
                      onClick={() => { setEditando(false); setEditError(""); setEditForm(editOrig); }}
                    >
                      Cancelar
                    </button>
                    <button
                      className="vp-btn vp-btn-primary"
                      style={{minHeight:48, flex:2}}
                      onClick={guardarEdit}
                      disabled={saving || !haycambiosEdit || bloqueado}
                      title={bloqueado ? tooltipBloqueo : !haycambiosEdit ? "No hay cambios que guardar" : undefined}
                    >
                      {saving ? "Guardando…" : "💾 Guardar cambios"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="vp-row">
                    <span className="vp-row-label">📞 Teléfono</span>
                    <span className="vp-value">{v.telefono||"—"}</span>
                  </div>
                  <div className="vp-divider"/>
                  <div className="vp-row">
                    <span className="vp-row-label">🚨 Emergencia</span>
                    <span className="vp-value">{v.telefonoEmergencia||v.contactoEmergencia||"—"}</span>
                  </div>
                  <div className="vp-divider"/>
                  <div className="vp-row">
                    <span className="vp-row-label">✉️ Email</span>
                    <span className="vp-value" style={{wordBreak:"break-all"}}>{v.email||"—"}</span>
                  </div>
                  <div className="vp-divider"/>
                  <div className="vp-row">
                    <span className="vp-row-label">🎽 Talla</span>
                    <span className="vp-value">{v.talla||"—"}</span>
                  </div>
                  <div className="vp-divider"/>
                  <div className="vp-row">
                    <span className="vp-row-label">🎽 Camiseta</span>
                    <span className={`vp-badge ${v.camisetaEntregada?"vp-badge-green":"vp-badge-amber"}`}>
                      {v.camisetaEntregada?"✅ Entregada":"📦 Por recoger el día del evento"}
                    </span>
                  </div>
                  {v.nombre && (<>
                    <div className="vp-divider"/>
                    <div className="vp-row">
                      <span className="vp-row-label">👤 Nombre</span>
                      <span className="vp-value">{v.nombre}{v.apellidos?" "+v.apellidos:""}</span>
                    </div>
                  </>)}
                  {(v.alergias || v.medicacion) && (
                    <div style={{ marginTop:".6rem", borderTop:"1px solid var(--border)", paddingTop:".6rem" }}>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                        color:"var(--amber)", fontWeight:700, marginBottom:".5rem",
                        textTransform:"uppercase", letterSpacing:".05em" }}>
                        ⚕️ Información médica
                      </div>
                      {v.alergias && (
                        <div style={{ background:"rgba(251,191,36,.08)", border:"1px solid var(--amber-border)",
                          borderRadius:8, padding:".6rem .8rem", marginBottom:".4rem" }}>
                          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                            color:"var(--amber)", fontWeight:700, marginBottom:".2rem" }}>Alergias</div>
                          <div style={{ fontSize:"var(--fs-base)", color:"var(--text)", lineHeight:1.5 }}>{v.alergias}</div>
                        </div>
                      )}
                      {v.medicacion && (
                        <div style={{ background:"rgba(251,191,36,.08)", border:"1px solid var(--amber-border)",
                          borderRadius:8, padding:".6rem .8rem" }}>
                          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                            color:"var(--amber)", fontWeight:700, marginBottom:".2rem" }}>Medicación</div>
                          <div style={{ fontSize:"var(--fs-base)", color:"var(--text)", lineHeight:1.5 }}>{v.medicacion}</div>
                        </div>
                      )}
                    </div>
                  )}
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
                  {/* Mensaje del voluntario a la organización — editable via ✏️ */}
                  <div className="vp-divider"/>
                  <div style={{paddingTop:".4rem"}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".3rem"}}>
                      <div className="vp-label" style={{marginBottom:0}}>💬 Tu mensaje a la organización</div>
                      <button className="vp-btn vp-btn-ghost vp-btn-sm"
                        onClick={() => { setEditError(""); setEditando(true); }}
                        style={{fontSize:".7rem", minHeight:28}}>
                        ✏️ Editar
                      </button>
                    </div>
                    {v.mensajeParaOrganizador ? (
                      <div className="vp-mono" style={{fontSize:".8rem",color:"var(--text)",lineHeight:1.7,
                        background:"rgba(34,211,238,.06)",borderRadius:8,padding:".6rem .75rem",
                        border:"1px solid rgba(34,211,238,.2)",borderLeft:"3px solid var(--cyan)"}}>
                        {v.mensajeParaOrganizador}
                      </div>
                    ) : (
                      <div className="vp-mono" style={{fontSize:".75rem",color:"var(--text-dim)",fontStyle:"italic",padding:".3rem 0"}}>
                        Sin mensaje — pulsa Editar para añadir uno
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })()}

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
          <div id="sec-contacto" className="vp-card" style={{marginBottom:".75rem",borderLeft:"3px solid var(--cyan)"}}>
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
function CambiarPin({ token, onDone, onCancel, hideCancel = false }) {
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
      const res = await fetch(`${API_BASE}?action=cambiar-pin`, {
        method:"POST", headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({pinNuevo:val}),
      });
      if (res.ok) {
        setStep(99); // pantalla de éxito
        setTimeout(() => onDone(), 1800);
      } else { const d=await res.json(); setError(d.error||"Error"); }
    } catch { setError("Error de conexión"); }
    finally { setSaving(false); }
  };
  return (
    <div className="vp-card" style={{marginBottom:".75rem"}}>
      <div className="vp-card-header">
        <div style={{fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-md)", color:"var(--text)"}}>
          🔐 {step===1?"Nuevo PIN":"Confirma el PIN"}
        </div>
        {!hideCancel && (
          <button className="vp-btn vp-btn-ghost vp-btn-sm"
            style={{minHeight:38, minWidth:38, borderRadius:"50%", padding:".3rem", fontSize:"1.1rem"}}
            onClick={onCancel}>✕</button>
        )}
      </div>
      {step === 99 ? (
        <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
          <div style={{ fontSize:"3rem", marginBottom:".6rem" }}>✅</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:"var(--fs-lg)", fontWeight:800, color:"var(--green)" }}>
            ¡PIN cambiado!
          </div>
          <div className="vp-mono" style={{ fontSize:"var(--fs-sm)", color:"var(--text-muted)", marginTop:".4rem" }}>
            Tu nuevo PIN está activo
          </div>
        </div>
      ) : (
        <>
      {error && <div className="vp-error" style={{marginBottom:".75rem"}}>⚠ {error}</div>}
      <PinNumpad value={cur} onChange={handleChange} shake={shake} disabled={saving} />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTE: StepperForm (formulario de registro en 3 pasos)
// ─────────────────────────────────────────────────────────────────────────────
function StepperForm({ puestos, imgFront, imgBack, imgGuiaTallas, opcionPuesto, opcionVehiculo, opcionEmail, opcionEmergencia, onRegistrar, enviando }) {
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
      puestoId: form.puestoId ? parseInt(form.puestoId) : null,
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
            <FormField label="🚨 Teléfono de emergencia *" error={errores.telefonoEmergencia}
              hint="Familiar o persona a avisar si ocurre alguna incidencia">
              <input className={`pub-input${errores.telefonoEmergencia?" error":""}`}
                type="tel" placeholder="612 345 678" inputMode="tel"
                value={form.telefonoEmergencia||""} onChange={e=>set("telefonoEmergencia",e.target.value)} />
            </FormField>
            )}
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
                ...(opcionEmergencia ? [["🚨 Tel. emergencia", form.telefonoEmergencia || "—"]] : []),
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

// ─────────────────────────────────────────────────────────────────────────────
// Helper FormField
// ─────────────────────────────────────────────────────────────────────────────
function FormField({ label, error, hint, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:".5rem" }}>
      <label style={{ fontFamily:"var(--font-display)", fontSize:"var(--fs-sm)", fontWeight:700,
        color:error?"var(--red)":"var(--text)" }}>{label}</label>
      {hint && <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:"-.2rem", lineHeight:1.6 }}>{hint}</div>}
      {children}
      {error && <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--red)", fontWeight:700 }}>⚠ {error}</div>}
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
      const res = await fetch(`${API_BASE}?action=cancelar`, {
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

// UX-10: estilos de foco accesibles — portal de voluntarios
const PORTAL_FOCUS_STYLES = `
  button:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 4px; }
  input:focus-visible  { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 4px; }
  select:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 4px; }
  textarea:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 4px; }
  a:focus-visible      { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 4px; }
`;

export default function VoluntarioPortal() {
  // Inyectar estilos focus-visible al montar (UX-10)
  React.useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-portal-focus', '');
    styleEl.textContent = PORTAL_FOCUS_STYLES;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, []);
  // pantalla: 'landing' | 'registro' | 'registro-ok' | 'login' | 'portal'
  const [pantalla, setPantalla] = useState(() => {
    const sess = loadSession();
    return sess?.token ? "portal" : "landing";
  });
  const [token,    setToken]    = useState(() => loadSession()?.token || null);
  const [regTel,   setRegTel]   = useState("");
  const [regNombre,setRegNombre]= useState("");
  const [loginTelPreload, setLoginTelPreload] = useState("");

  // Carga config pública para landing y login (telefonoContacto, fecha, lugar)
  const [publicConfig, setPublicConfig] = useState(null);
  React.useEffect(() => {
    fetchPublic("teg_event_config_v1").then(cfg => { if (cfg && typeof cfg === "object") setPublicConfig(cfg); });
  }, []);

  // PWA-03: detectar estado de conexión para mostrar banner offline
  const isOnline = useOnlineStatus();

  const goLanding  = () => setPantalla("landing");
  const goRegistro = () => setPantalla("registro");
  const goLogin    = (tel) => { setLoginTelPreload(typeof tel === "string" ? tel : ""); setPantalla("login"); };
  const goPortal   = (tok)    => { setToken(tok); saveSession({ token:tok }); setPantalla("portal"); };
  const goLogout   = () => { clearSession(); setToken(null); setPantalla("landing"); };

  const onRegistroOk = (tel, nombre) => {
    setRegTel(tel);
    setRegNombre(nombre);
    setPantalla("registro-ok");
  };

  // Banner offline — visible en todas las pantallas del portal
  const bannerOffline = !isOnline && (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      background: "var(--teg-amber-solid, #f59e0b)",
      color: "#08091a",
      textAlign: "center",
      padding: "0.45rem 1rem",
      fontFamily: "var(--font-mono, monospace)",
      fontSize: "var(--fs-sm, 0.8rem)",
      fontWeight: 700,
      letterSpacing: ".04em",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: ".5rem",
      boxShadow: "0 2px 12px rgba(245,158,11,0.35)",
    }}>
      <span>⚠️</span>
      <span>Sin conexión · Mostrando datos guardados</span>
    </div>
  );

  if (pantalla === "landing")      return <>{bannerOffline}<LandingScreen onNuevo={goRegistro} onLogin={goLogin} config={publicConfig} /></>;
  if (pantalla === "registro")     return <>{bannerOffline}<RegistroScreen onVolver={goLanding} onRegistroOk={onRegistroOk} /></>;
  if (pantalla === "registro-ok")  return <>{bannerOffline}<RegistroOkScreen telefono={regTel} nombre={regNombre} onAcceder={() => goLogin(regTel)} /></>;
  if (pantalla === "login")        return <>{bannerOffline}<LoginScreen onLogin={goPortal} onVolver={goLanding} telefonoInicial={loginTelPreload} config={publicConfig} /></>;
  if (pantalla === "portal")       return <>{bannerOffline}<PortalMain token={token} onLogout={goLogout} /></>;
  return null;
}
