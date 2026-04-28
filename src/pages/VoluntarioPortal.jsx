import React, { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "/api/voluntarios";
const SESSION_KEY = "teg_vol_session";

// ── Helpers ────────────────────────────────────────────────────────────────────
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

function loadSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (!raw) return null;
    // Verificar expiración de 7 días
    if (raw.ts && Date.now() - raw.ts > SESSION_TTL) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return raw;
  } catch { return null; }
}
function saveSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, ts: Date.now() }));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

const TALLAS = ["XS","S","M","L","XL","XXL","3XL"];

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { background: #0f172a; color: #e2e8f0; font-family: 'Syne', 'Inter', sans-serif;
    min-height: 100vh; }
  :root {
    --cyan:   #22d3ee; --cyan-dim: rgba(34,211,238,.1);
    --green:  #34d399; --green-dim: rgba(52,211,153,.1);
    --amber:  #fbbf24; --amber-dim: rgba(251,191,36,.1);
    --red:    #f87171; --red-dim: rgba(248,113,113,.1);
    --surface:  #1e293b; --surface2: #263347; --border: rgba(148,163,184,.15);
    --text:   #e2e8f0; --text-muted: #94a3b8; --text-dim: #475569;
    --radius: 12px;
  }
  .vp-wrap { max-width: 420px; margin: 0 auto; padding: 1rem 1rem 4rem; }
  .vp-card { background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 1.25rem; margin-bottom: .85rem; }
  .vp-label { font-family: 'DM Mono', monospace; font-size: .65rem; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted);
    margin-bottom: .3rem; }
  .vp-value { font-family: 'DM Mono', monospace; font-size: .85rem; color: var(--text); }
  .vp-btn { display: block; width: 100%; padding: .85rem; border-radius: 10px;
    font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 800;
    cursor: pointer; border: none; transition: all .15s; min-height: 52px;
    letter-spacing: .02em; }
  .vp-btn-cyan { background: var(--cyan); color: #0f172a; }
  .vp-btn-cyan:hover { filter: brightness(1.1); }
  .vp-btn-ghost { background: transparent; color: var(--text-muted);
    border: 1px solid var(--border); }
  .vp-btn-green { background: var(--green); color: #0f172a; }
  .vp-btn-done { background: var(--green-dim); color: var(--green);
    border: 1px solid rgba(52,211,153,.3); cursor: default; }
  .vp-input { width: 100%; padding: .65rem .85rem; background: var(--surface2);
    border: 1px solid var(--border); border-radius: 8px; color: var(--text);
    font-family: 'DM Mono', monospace; font-size: .85rem; outline: none;
    min-height: 44px; -webkit-appearance: none; }
  .vp-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34,211,238,.15); }
  .vp-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right .75rem center; padding-right: 2.5rem; }
  .vp-pin-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: .5rem; }
  .vp-pin-key { background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; padding: 1rem; font-size: 1.3rem; font-weight: 700;
    cursor: pointer; text-align: center; transition: all .1s; min-height: 56px;
    display: flex; align-items: center; justify-content: center; color: var(--text); }
  .vp-pin-key:active { transform: scale(.94); background: var(--cyan-dim); }
  .vp-dots { display: flex; gap: .5rem; justify-content: center; margin-bottom: 1.25rem; }
  .vp-dot { width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid var(--border); background: transparent; transition: all .15s; }
  .vp-dot.filled { background: var(--cyan); border-color: var(--cyan); }
  .vp-shake { animation: shake .4s ease; }
  @keyframes shake {
    0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)}
    40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)}
  }
  .vp-badge { display: inline-flex; align-items: center; gap: .3rem;
    padding: .2rem .6rem; border-radius: 99px; font-family: 'DM Mono', monospace;
    font-size: .65rem; font-weight: 700; }
  .vp-badge-green { background: var(--green-dim); color: var(--green); border: 1px solid rgba(52,211,153,.3); }
  .vp-badge-amber { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(251,191,36,.3); }
  .vp-badge-cyan  { background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(34,211,238,.3); }
  .vp-divider { height: 1px; background: var(--border); margin: .75rem 0; }
  .vp-row { display: flex; align-items: center; justify-content: space-between;
    padding: .45rem 0; }
  .vp-companion { display: flex; align-items: center; gap: .65rem;
    padding: .5rem 0; border-bottom: 1px solid var(--border); }
  .vp-companion:last-child { border-bottom: none; }
`;

// ── Pantalla de Login ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [telefono, setTelefono] = useState("");
  const [pin, setPin]           = useState("");
  const [shake, setShake]       = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const telRef = useRef(null);

  useEffect(() => { setTimeout(() => telRef.current?.focus(), 200); }, []);

  const handlePinKey = (k) => {
    if (k === "⌫") { setPin(p => p.slice(0,-1)); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) setTimeout(() => handleSubmit(telefono, next), 50);
  };

  const handleSubmit = async (tel, p) => {
    if (!tel.trim() || p.length !== 4) { setError("Introduce tu teléfono y PIN de 4 dígitos"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: tel.trim(), pin: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShake(true); setPin(""); setError(data.error || "Teléfono o PIN incorrecto");
        setTimeout(() => setShake(false), 500);
      } else {
        saveSession({ token: data.token, ts: Date.now() });
        onLogin(data.token);
      }
    } catch {
      setError("Error de conexión. Comprueba tu internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vp-wrap" style={{ paddingTop: "2rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: ".5rem" }}>🏔️</div>
        <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--cyan)", marginBottom: ".25rem" }}>
          Trail El Guerrero 2026
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: ".7rem", color: "var(--text-muted)" }}>
          Portal del Voluntario
        </div>
      </div>

      <div className="vp-card">
        <div className="vp-label">Tu teléfono</div>
        <input ref={telRef} className="vp-input" type="tel" placeholder="6XX XXX XXX"
          value={telefono} onChange={e => setTelefono(e.target.value)}
          onKeyDown={e => e.key === "Enter" && pin.length === 4 && handleSubmit(telefono, pin)}
          inputMode="numeric" />

        <div className="vp-label" style={{ marginTop: "1rem", marginBottom: ".75rem" }}>PIN de 4 dígitos</div>
        <div className={`vp-dots${shake ? " vp-shake" : ""}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className={`vp-dot${i < pin.length ? " filled" : ""}`} />
          ))}
        </div>
        <div className="vp-pin-grid">
          {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k,i) => (
            k === "" ? <div key={i} /> :
            <button key={i} className="vp-pin-key" onClick={() => handlePinKey(k)}>{k}</button>
          ))}
        </div>

        {error && (
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: ".7rem",
            color: "var(--red)", textAlign: "center", marginTop: ".75rem" }}>
            ⚠ {error}
          </div>
        )}

        <button className="vp-btn vp-btn-cyan" style={{ marginTop: "1.25rem" }}
          onClick={() => handleSubmit(telefono, pin)}
          disabled={loading || !telefono.trim() || pin.length !== 4}>
          {loading ? "Verificando…" : "Entrar →"}
        </button>
      </div>

      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: ".62rem",
        color: "var(--text-dim)", textAlign: "center", lineHeight: 1.7 }}>
        ¿No recuerdas tu PIN? Tu PIN inicial son los últimos 4 dígitos de tu teléfono.<br/>
        Si tienes problemas, contacta con el organizador.
      </div>
    </div>
  );
}

// ── Portal principal ───────────────────────────────────────────────────────────
function PortalMain({ token, onLogout }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [editando, setEditando] = useState(false);
  const [cambiandoPin, setCambiandoPin] = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");
  const [marcandoLlegada, setMarcandoLlegada] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/ficha`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.status === 401) { clearSession(); onLogout(); return; }
      const json = await res.json();
      setData(json);
      setForm({
        telefono: json.voluntario?.telefono || "",
        telefonoEmergencia: json.voluntario?.telefonoEmergencia || json.voluntario?.contactoEmergencia || "",
        talla: json.voluntario?.talla || "M",
      });
    } catch { setError("Error de conexión."); }
    finally { setLoading(false); }
  }, [token, onLogout]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const marcarLlegada = async () => {
    setMarcandoLlegada(true);
    try {
      const res = await fetch(`${API_BASE}/ficha?action=presente`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        setMsg(`✓ Llegada registrada a las ${json.horaLlegada}`);
        await fetchData();
      }
    } catch { setMsg("Error al registrar llegada."); }
    finally { setMarcandoLlegada(false); setTimeout(() => setMsg(""), 4000); }
  };

  const guardarDatos = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/ficha`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg("✓ Datos guardados");
        setEditando(false);
        await fetchData();
      }
    } catch { setMsg("Error al guardar."); }
    finally { setSaving(false); setTimeout(() => setMsg(""), 3000); }
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)",
      fontFamily: "'DM Mono',monospace", fontSize: ".75rem" }}>
      Cargando tu ficha…
    </div>
  );

  if (error) return (
    <div className="vp-wrap" style={{ paddingTop: "2rem", textAlign: "center" }}>
      <div style={{ color: "var(--red)", marginBottom: "1rem" }}>{error}</div>
      <button className="vp-btn vp-btn-ghost" onClick={fetchData}>Reintentar</button>
    </div>
  );

  const { voluntario: v, puesto, companerosEnPuesto = [], config } = data || {};

  return (
    <div className="vp-wrap" style={{ paddingTop: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
          Hola, {(v?.nombre || "").split(" ")[0]}{v?.apellidos ? "" : ""} 👋
        </div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:".72rem", color:"var(--text-muted)",
          marginTop:".1rem" }}>
          {v?.nombre}{v?.apellidos ? " " + v.apellidos : ""}
        </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: ".65rem", color: "var(--text-muted)", marginTop: ".1rem" }}>
            {config?.nombre || "Trail El Guerrero 2026"}
          </div>
        </div>
        <span className={`vp-badge ${v?.estado === "confirmado" ? "vp-badge-green" : "vp-badge-amber"}`}>
          {v?.estado === "confirmado" ? "✓ Confirmado" : v?.estado || "pendiente"}
        </span>
      </div>

      {/* Toast */}
      {msg && (
        <div style={{ background: "var(--green-dim)", border: "1px solid rgba(52,211,153,.3)",
          borderRadius: 8, padding: ".6rem .9rem", marginBottom: ".85rem",
          fontFamily: "'DM Mono',monospace", fontSize: ".72rem", color: "var(--green)" }}>
          {msg}
        </div>
      )}

      {/* Puesto */}
      {puesto ? (
        <div className="vp-card" style={{ borderLeft: "3px solid var(--cyan)" }}>
          <div className="vp-label">📍 Tu puesto</div>
          <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: ".3rem" }}>{puesto.nombre}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: ".7rem", color: "var(--text-muted)" }}>
            🕗 Incorporación: {puesto.horaInicio}
            {puesto.distancias?.length ? ` · ${puesto.distancias.join(" · ")}` : ""}
          </div>
          {puesto.notas && (
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: ".68rem",
              color: "var(--text-dim)", marginTop: ".4rem" }}>{puesto.notas}</div>
          )}
        </div>
      ) : (
        <div className="vp-card">
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: ".72rem", color: "var(--text-muted)" }}>
            ⏳ Puesto pendiente de asignación
          </div>
        </div>
      )}

      {/* Botón llegada */}
      <div style={{ marginBottom: ".85rem" }}>
        {v?.enPuesto ? (
          <button className="vp-btn vp-btn-done">
            ✓ Llegada registrada · {v.horaLlegada || ""}
          </button>
        ) : (
          <button className="vp-btn vp-btn-green" onClick={marcarLlegada}
            disabled={marcandoLlegada}>
            {marcandoLlegada ? "Registrando…" : "📍 Ya estoy en mi puesto"}
          </button>
        )}
      </div>

      {/* Compañeros */}
      {companerosEnPuesto.length > 0 && (
        <div className="vp-card">
          <div className="vp-label">👥 Compañeros en tu puesto ({companerosEnPuesto.length})</div>
          {companerosEnPuesto.map((c, i) => (
            <div key={i} className="vp-companion">
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface2)",
                border: "1px solid var(--border)", display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 700, fontSize: ".75rem",
                color: "var(--cyan)", flexShrink: 0 }}>
                {((c.nombre || "") + " " + (c.apellidos || "")).trim().split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: ".82rem" }}>
                  {c.nombre} {c.apellidos}
                </div>
                {c.telefono && (
                  <a href={`tel:${c.telefono}`}
                    style={{ fontFamily: "'DM Mono',monospace", fontSize: ".68rem",
                      color: "var(--cyan)", textDecoration: "none" }}>
                    📞 {c.telefono}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mis datos */}
      <div className="vp-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: ".75rem" }}>
          <div className="vp-label" style={{ marginBottom: 0 }}>Mis datos</div>
          {!editando && (
            <button className="vp-btn vp-btn-ghost"
              style={{ width: "auto", padding: ".3rem .75rem", fontSize: ".72rem", minHeight: 36 }}
              onClick={() => setEditando(true)}>
              ✏️ Editar
            </button>
          )}
        </div>

        {editando ? (
          <>
            <div className="vp-label">📞 Teléfono</div>
            <input className="vp-input" type="tel" value={form.telefono}
              onChange={e => setForm(f => ({...f, telefono: e.target.value}))}
              style={{ marginBottom: ".75rem" }} />

            <div className="vp-label">🚨 Teléfono de emergencia</div>
            <input className="vp-input" type="tel" value={form.telefonoEmergencia}
              onChange={e => setForm(f => ({...f, telefonoEmergencia: e.target.value}))}
              style={{ marginBottom: ".75rem" }} />

            <div className="vp-label">🎽 Talla de camiseta</div>
            <select className="vp-input vp-select" value={form.talla}
              onChange={e => setForm(f => ({...f, talla: e.target.value}))}
              style={{ marginBottom: "1rem" }}>
              {TALLAS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <div style={{ display: "flex", gap: ".5rem" }}>
              <button className="vp-btn vp-btn-ghost" style={{ minHeight: 44 }}
                onClick={() => setEditando(false)}>Cancelar</button>
              <button className="vp-btn vp-btn-cyan" style={{ minHeight: 44 }}
                onClick={guardarDatos} disabled={saving}>
                {saving ? "Guardando…" : "💾 Guardar"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="vp-row">
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: ".68rem", color: "var(--text-muted)" }}>📞 Teléfono</span>
              <span className="vp-value">{v?.telefono || "—"}</span>
            </div>
            <div className="vp-divider" />
            <div className="vp-row">
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: ".68rem", color: "var(--text-muted)" }}>🚨 Emergencia</span>
              <span className="vp-value">{v?.telefonoEmergencia || v?.contactoEmergencia || "—"}</span>
            </div>
            <div className="vp-divider" />
            <div className="vp-row">
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: ".68rem", color: "var(--text-muted)" }}>🎽 Talla</span>
              <span className="vp-value">{v?.talla || "—"}</span>
            </div>
            <div className="vp-divider" />
            <div className="vp-row">
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: ".68rem", color: "var(--text-muted)" }}>🎽 Camiseta</span>
              <span className={`vp-badge ${v?.camisetaEntregada ? "vp-badge-green" : "vp-badge-amber"}`}>
                {v?.camisetaEntregada ? "✓ Entregada" : "⏳ Pendiente"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Cambiar PIN */}
      {cambiandoPin ? (
        <CambiarPin token={token} onDone={() => { setCambiandoPin(false); setMsg("✓ PIN actualizado"); }} onCancel={() => setCambiandoPin(false)} />
      ) : (
        <button className="vp-btn vp-btn-ghost" onClick={() => setCambiandoPin(true)}
          style={{ marginBottom: ".75rem" }}>
          🔐 Cambiar mi PIN
        </button>
      )}

      {/* Cerrar sesión */}
      <button className="vp-btn vp-btn-ghost"
        style={{ fontSize: ".75rem", padding: ".5rem", minHeight: 40, color: "var(--text-dim)" }}
        onClick={() => { clearSession(); onLogout(); }}>
        Cerrar sesión
      </button>

      {/* Contacto organizador + Footer */}
      {(config?.telefonoContacto || config?.organizador) && (
        <div className="vp-card" style={{ marginBottom:".75rem" }}>
          <div className="vp-label">Contacto organizador</div>
          {config?.organizador && (
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:".8rem", fontWeight:600,
              marginBottom:".2rem" }}>{config.organizador}</div>
          )}
          {config?.telefonoContacto && (
            <a href={`tel:${config.telefonoContacto}`}
              style={{ fontFamily:"'DM Mono',monospace", fontSize:".82rem",
                color:"var(--cyan)", textDecoration:"none", display:"block" }}>
              📞 {config.telefonoContacto}
            </a>
          )}
          {config?.emailContacto && (
            <a href={`mailto:${config.emailContacto}`}
              style={{ fontFamily:"'DM Mono',monospace", fontSize:".7rem",
                color:"var(--text-muted)", textDecoration:"none", display:"block",
                marginTop:".2rem" }}>
              ✉ {config.emailContacto}
            </a>
          )}
        </div>
      )}
      <div style={{ marginTop: ".5rem", textAlign: "center", fontFamily: "'DM Mono',monospace",
        fontSize: ".6rem", color: "var(--text-dim)", lineHeight: 1.7 }}>
        Trail El Guerrero 2026 · Club Deportivo Trail Candeleda<br/>
        {config?.fecha ? `Evento: ${config.fecha}` : ""} {config?.lugar ? `· ${config.lugar}` : ""}
      </div>
    </div>
  );
}

// ── Cambiar PIN ────────────────────────────────────────────────────────────────
function CambiarPin({ token, onDone, onCancel }) {
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [shake, setShake] = useState(false);

  const handleKey = (k) => {
    const cur = step === 1 ? pin1 : pin2;
    const setCur = step === 1 ? setPin1 : setPin2;
    if (k === "⌫") { setCur(p => p.slice(0,-1)); return; }
    if (cur.length >= 4) return;
    const next = cur + k;
    setCur(next);
    if (next.length === 4) {
      if (step === 1) { setTimeout(() => setStep(2), 100); return; }
      setTimeout(() => confirmar(pin1, next), 100);
    }
  };

  const confirmar = async (p1, p2) => {
    if (p1 !== p2) {
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
        body: JSON.stringify({ pinNuevo: p1 }),
      });
      if (res.ok) onDone();
      else { const d = await res.json(); setError(d.error || "Error al cambiar PIN"); }
    } catch { setError("Error de conexión."); }
    finally { setSaving(false); }
  };

  const cur = step === 1 ? pin1 : pin2;

  return (
    <div className="vp-card" style={{ marginBottom: ".85rem" }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: ".8rem", fontWeight: 700,
        marginBottom: ".75rem" }}>
        {step === 1 ? "Nuevo PIN (4 dígitos)" : "Repite el PIN"}
      </div>
      <div className={`vp-dots${shake ? " vp-shake" : ""}`}>
        {[0,1,2,3].map(i => <div key={i} className={`vp-dot${i < cur.length ? " filled" : ""}`} />)}
      </div>
      <div className="vp-pin-grid">
        {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k,i) => (
          k === "" ? <div key={i} /> :
          <button key={i} className="vp-pin-key" onClick={() => handleKey(k)} disabled={saving}>{k}</button>
        ))}
      </div>
      {error && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: ".68rem",
        color: "var(--red)", marginTop: ".75rem", textAlign: "center" }}>⚠ {error}</div>}
      <button className="vp-btn vp-btn-ghost" style={{ marginTop: ".75rem", minHeight: 44 }}
        onClick={onCancel}>Cancelar</button>
    </div>
  );
}

// ── App principal del portal ───────────────────────────────────────────────────
export default function VoluntarioPortal() {
  const [token, setToken] = useState(() => loadSession()?.token || null);

  return (
    <>
      <style>{CSS}</style>
      {token ? (
        <PortalMain token={token} onLogout={() => setToken(null)} />
      ) : (
        <LoginScreen onLogin={(t) => setToken(t)} />
      )}
    </>
  );
}
