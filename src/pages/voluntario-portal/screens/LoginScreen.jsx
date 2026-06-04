import { useState, useRef, useEffect } from "react";
import { API_BASE, saveSession } from "../lib/session";
import { PinNumpad } from "../components/PinNumpad";

export function LoginScreen({ onLogin, onVolver, telefonoInicial, config }) {
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
  const [tieneEmail, setTieneEmail] = useState(true);
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

            {/* T5.4: Recuperación de PIN */}
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
