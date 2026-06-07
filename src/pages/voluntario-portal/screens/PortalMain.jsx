import { useState, useEffect, useCallback } from "react";
import { TALLAS } from "@/constants/camisetasConstants";
import { SK_LOG_RECORRIDOS } from "@/constants/storageKeys";
import { API_BASE, clearSession, fetchPublic } from "../lib/session";
import { PuestoDetalle } from "../components/PuestoDetalle";
import { CronometroTurno } from "../components/CronometroTurno";
import { CambiarPin } from "../components/CambiarPin";
import { CancelarAsistencia } from "../components/CancelarAsistencia";

export function PortalMain({ token, onLogout }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [editando,   setEditando]   = useState(false);
  const [cambiandoPin, setCPin]     = useState(false);
  // SEC-02: dismissal del banner de PIN automático — solo en sesión, no persistente
  const [bannerPinDismissed, setBannerPinDismissed] = useState(false);
  // SEC-06: forzar cambio de PIN en el primer login
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
  // PORTAL-MAP: recorridos GPX para el mini-mapa del puesto
  const [recorridos, setRecorridosState] = useState([]);

  const showMsg = (m, ms=3500) => { setMsg(m); setTimeout(() => setMsg(""), ms); };

  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10000);
    return () => clearInterval(t);
  }, []);

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
      setUltimaActualizacion(Date.now());
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
        telefonoEmergencia: v.telefonoEmergencia || v.contactoEmergencia || v.telefono || "",
        mensajeParaOrganizador: v.mensajeParaOrganizador || "",
      };
      setEditForm(orig);
      setEditOrig(orig);
    } catch { if (!silencioso) setError("Error de conexión. Tira abajo para recargar."); }
    finally  { if (!silencioso) setLoading(false); }
  }, [token, onLogout]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // PORTAL-MAP: cargar recorridos GPX una sola vez al montar
  useEffect(() => {
    fetchPublic(SK_LOG_RECORRIDOS).then(data => {
      if (Array.isArray(data)) setRecorridosState(data);
    }).catch(() => {});
  }, []);

  // Auto-refresh cada 30 segundos (silencioso)
  useEffect(() => {
    const interval = setInterval(() => { fetchData(true); }, 30 * 1000);
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

  const marcarSalida = async () => {
    if (!data?.voluntario?.enPuesto) return;
    setMarcando(true);
    try {
      const res = await fetch(`${API_BASE}?action=salida`, {
        method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) { showMsg(`👋 Salida registrada a las ${json.horaSalida}. ¡Gracias por tu ayuda!`); await fetchData(); }
    } catch { showMsg("❌ Error al registrar salida."); }
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
          tallaConfirmadaEn:  editForm.talla !== editOrig.talla ? new Date().toISOString() : undefined,
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
        try { const j = await res.json(); if (j.error) msg = j.error; } catch (_e) { /* ignore */ }
        setEditError(msg);
      }
    } catch {
      setEditError("Error de conexión. Comprueba tu red e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / Error states ──
  if (loading && !data) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      minHeight:"100dvh", flexDirection:"column", gap:"1rem" }}>
      <div style={{ fontSize:"2rem", animation:"spin 1s linear infinite" }}>⟳</div>
      <div className="vp-mono" style={{ fontSize:".78rem", color:"var(--text-muted)" }}>Cargando tu ficha…</div>
    </div>
  );

  if (error && !data) return (
    <div className="vp-wrap" style={{ paddingTop:"3rem", textAlign:"center" }}>
      <div style={{ fontSize:"2rem", marginBottom:"1rem" }}>⚠️</div>
      <div className="vp-mono" style={{ fontSize:".8rem", color:"var(--red)", marginBottom:"1.5rem" }}>{error}</div>
      <button className="vp-btn vp-btn-ghost" onClick={fetchData}>Reintentar</button>
    </div>
  );

  // SEC-06: pantalla bloqueante de cambio de PIN obligatorio (primer login)
  if (mustChangePin) return (
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
  );

  const { voluntario:v={}, puesto, companerosEnPuesto=[], materialPuesto=[], config={} } = data || {};

  const organizadores = Array.isArray(config.organizadores) && config.organizadores.length > 0
    ? config.organizadores
    : (config.organizador || config.telefonoContacto)
      ? [{ nombre:config.organizador||"Organización", telefono:config.telefonoContacto||"", email:config.emailContacto||"" }]
      : [];

  // Estado: voluntario ausente
  if (v.estado === "ausente") return (
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
  );

  // Estado: participación cancelada
  if (v.estado === "cancelado") return (
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
          {organizadores.map((org, i) => {
            const nombreMostrado = (org.nombre || '').trim()
              || (config.organizador || '').trim()
              || (config.nombre ? `Organización ${config.nombre}` : '')
              || 'Organización Trail El Guerrero';
            return (
            <div key={i} style={{ paddingTop:i>0?".5rem":0, borderTop:i>0?"1px solid var(--border)":"none" }}>
              <div style={{ fontWeight:700, marginBottom:".2rem" }}>{nombreMostrado}</div>
              {org.telefono && (
                <a href={`tel:${org.telefono.replace(/\s/g,"")}`}
                  style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                    color:"var(--cyan)", textDecoration:"none", display:"block" }}>
                  📞 {org.telefono}
                </a>
              )}
            </div>
          );})}
        </div>
      )}
      <button className="vp-btn vp-btn-ghost"
        style={{ maxWidth:360, width:"100%", fontSize:"var(--fs-xs)" }}
        onClick={() => { clearSession(); onLogout(); }}>
        Cerrar sesión
      </button>
    </div>
  );

  // ── Main portal render ──
  return (
    <>
      {/* Topbar */}
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
              title="Actualizar mi ficha"
              style={{ background:"rgba(34,211,238,.1)", border:"1px solid rgba(34,211,238,.3)",
                borderRadius:8, cursor:"pointer", fontFamily:"var(--font-mono)",
                fontSize:".75rem", color:"var(--cyan)", padding:".4rem .6rem",
                fontWeight:700, minHeight:"44px", display:"flex", alignItems:"center", gap:".25rem" }}>
              ⟳ Actualizar
            </button>
            <button onClick={() => { clearSession(); onLogout(); }}
              title="Cerrar sesión"
              style={{ background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)",
                borderRadius:8, cursor:"pointer", fontFamily:"var(--font-mono)",
                fontSize:".7rem", color:"var(--red)", padding:".4rem .7rem",
                fontWeight:700, letterSpacing:".02em",
                minHeight:"44px", display:"flex", alignItems:"center" }}>
              Salir
            </button>
          </div>
          {ultimaActualizacion && (
            <div className="vp-mono" style={{ fontSize:".58rem", color:"var(--text-dim)" }}>
              Actualizado {(() => {
                const s = Math.round((Date.now() - ultimaActualizacion) / 1000);
                if (s < 60) return `hace ${s}s`;
                return `hace ${Math.round(s/60)}min`;
              })()}
            </div>
          )}
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
          { id:"sec-mensaje",  icon:"💬", label:"Mensaje" },
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
              <span className="vp-mono" style={{ fontSize: ".72rem", color: "var(--amber)", lineHeight: 1.55 }}>
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

        {/* CTA prominente de llegada */}
        {(v.estado === "confirmado" || (v.estado === "pendiente" && puesto)) && !v.enPuesto && (
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
              {puesto ? puesto.nombre : "Confirmar llegada al puesto"}
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
              ✅ En tu puesto desde las {v.horaLlegada}
            </div>
          </div>
        )}

        {/* Puesto */}
        <PuestoDetalle puesto={puesto} recorridos={recorridos} />

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

        {/* Cronómetro de turno */}
        {v.enPuesto && (
          <CronometroTurno
            voluntario={v}
            puesto={puesto}
            marcarSalida={marcarSalida}
            marcando={marcando}
          />
        )}

        {/* Barra de progreso del equipo */}
        {companerosEnPuesto.length > 0 && puesto && (() => {
          const enPuesto = companerosEnPuesto.filter(c => c.enPuesto).length;
          const total = companerosEnPuesto.length;
          const pct = total > 0 ? Math.round(enPuesto / total * 100) : 0;
          const col = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
          return (
            <div style={{ marginBottom:".6rem", padding:".55rem .85rem",
              background:"var(--surface2)", borderRadius:8,
              border:"1px solid var(--border)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                marginBottom:".3rem" }}>
                <span className="vp-mono" style={{ fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>
                  👥 Equipo en el puesto
                </span>
                <span className="vp-mono" style={{ fontSize:"var(--fs-xs)", color: col, fontWeight:700 }}>
                  {enPuesto}/{total} ya están aquí
                </span>
              </div>
              <div style={{ height:5, background:"var(--surface3)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background: col, borderRadius:3, transition:"width .4s" }} />
              </div>
            </div>
          );
        })()}

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
          const contacto = organizadores[0] || null;
          const instrucciones = config.instruccionesGenerales || "";
          const esHoy     = diasHasta === 0;
          const esManiana = diasHasta === 1;
          const labelDia  = esHoy ? "🏃 ¡Hoy es el día!" : esManiana ? "⚡ ¡Mañana!" : `⚡ En ${diasHasta} días`;

          return (
            <div id="sec-diacarrera" className="vp-card" style={{
              borderLeft:"3px solid var(--green)",
              background:"rgba(52,211,153,.04)"
            }}>
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

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".5rem", marginBottom:"1rem" }}>
                <div style={{ background:"var(--surface2)", borderRadius:8, padding:".65rem .8rem", borderTop:"2px solid var(--cyan)" }}>
                  <div className="vp-mono" style={{ fontSize:".6rem", color:"var(--cyan)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:".3rem" }}>
                    📍 Concentración
                  </div>
                  <div style={{ fontSize:".88rem", fontWeight:700, color:"var(--text)", lineHeight:1.4 }}>
                    {lugarConcentracion || <span style={{color:"var(--text-dim)",fontWeight:400,fontSize:".78rem"}}>{placeholder}</span>}
                  </div>
                </div>
                <div style={{ background:"var(--surface2)", borderRadius:8, padding:".65rem .8rem", borderTop:"2px solid var(--cyan)" }}>
                  <div className="vp-mono" style={{ fontSize:".6rem", color:"var(--cyan)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:".3rem" }}>
                    🕗 Hora
                  </div>
                  <div style={{ fontSize:"1.15rem", fontWeight:800, color:"var(--text)", fontFamily:"var(--font-mono)", letterSpacing:".03em" }}>
                    {horaConcentracion || <span style={{color:"var(--text-dim)",fontWeight:400,fontSize:".78rem"}}>{placeholder}</span>}
                  </div>
                </div>
              </div>

              {instrucciones && (
                <div style={{ background:"var(--surface2)", borderRadius:8, padding:".7rem .85rem", marginBottom:"1rem", borderLeft:"2px solid var(--cyan-border)" }}>
                  <div className="vp-mono" style={{ fontSize:".6rem", color:"var(--text-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:".4rem" }}>
                    📋 Instrucciones
                  </div>
                  <div style={{ fontSize:".88rem", color:"var(--text)", lineHeight:1.65 }}>
                    {instrucciones}
                  </div>
                </div>
              )}

              {contacto && (
                <div style={{ background:"var(--surface2)", borderRadius:8, padding:".65rem .85rem", borderLeft:"2px solid var(--cyan-border)" }}>
                  <div className="vp-mono" style={{ fontSize:".6rem", color:"var(--text-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:".4rem" }}>
                    📞 Contacto directo
                  </div>
                  <div style={{ fontWeight:700, fontSize:".9rem", marginBottom:".25rem" }}>{contacto.nombre || 'Organización'}</div>
                  {contacto.telefono && (
                    <a href={`tel:${contacto.telefono.replace(/\s/g,"")}`}
                      style={{ display:"flex", alignItems:"center", gap:".5rem",
                        fontFamily:"var(--font-mono)", fontSize:"1.05rem", fontWeight:800,
                        color:"var(--cyan)", textDecoration:"none" }}>
                      📞 {contacto.telefono}
                    </a>
                  )}
                </div>
              )}

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
          const diasHasta = config.fecha
            ? Math.ceil((new Date(config.fecha) - new Date()) / 86400000)
            : 999;
          const bloqueado = diasHasta <= 7;
          const tooltipBloqueo = "Los datos se han bloqueado a 7 días del evento";
          const styleFieldWrap = { position:"relative", marginBottom:".75rem" };
          const styleInputBloq = { opacity:.55, cursor:"not-allowed", background:"var(--surface2)", borderColor:"var(--border)" };

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

                  <div style={styleFieldWrap}>
                    <div className="vp-label">💬 Mensaje para la organización</div>
                    <div className="vp-mono" style={{ fontSize:".68rem", color:"var(--text-muted)", marginBottom:".35rem", lineHeight:1.55 }}>
                      Cualquier pregunta, necesidad especial o comentario para el equipo organizador.
                    </div>
                    <textarea
                      className="vp-textarea"
                      placeholder="Ej: Tengo dudas sobre el horario, llegaré en transporte público…"
                      value={editForm.mensajeParaOrganizador}
                      onChange={e => setEditForm(f=>({...f,mensajeParaOrganizador:e.target.value}))}
                      maxLength={500}
                      rows={3}
                      style={{ resize:"vertical" }}
                    />
                    <div className="vp-mono" style={{ fontSize:".65rem", color:"var(--text-dim)", textAlign:"right", marginTop:".2rem" }}>
                      {editForm.mensajeParaOrganizador.length}/500
                    </div>
                  </div>

                  <div className="vp-mono" style={{
                    fontSize:".67rem", color:"var(--text-dim)", marginBottom:".9rem",
                    background:"var(--surface2)", borderRadius:6,
                    padding:".35rem .6rem", borderLeft:"2px solid var(--border)"
                  }}>
                    🔒 Nombre, teléfono y puesto solo pueden modificarlos los organizadores.
                  </div>

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

                  {(() => {
                    const soloMensaje = bloqueado
                      && editForm.talla === editOrig.talla
                      && editForm.email === editOrig.email
                      && editForm.telefonoEmergencia === editOrig.telefonoEmergencia
                      && editForm.mensajeParaOrganizador !== editOrig.mensajeParaOrganizador;
                    const puedeGuardar = haycambiosEdit && (!bloqueado || soloMensaje);
                    return (
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
                          disabled={saving || !puedeGuardar}
                          title={!puedeGuardar && bloqueado && !soloMensaje ? tooltipBloqueo : !haycambiosEdit ? "No hay cambios que guardar" : undefined}
                        >
                          {saving ? "Guardando…" : "💾 Guardar cambios"}
                        </button>
                      </div>
                    );
                  })()}
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
                  <div className="vp-divider"/>
                  <div id="sec-mensaje" style={{paddingTop:".4rem"}}>
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
            {organizadores.map((org,i) => {
              const nombreMostrado = (org.nombre || '').trim()
                || (config.organizador || '').trim()
                || (config.nombre ? `Organización ${config.nombre}` : '')
                || 'Organización Trail El Guerrero';
              return (
              <div key={i} style={{paddingTop:i>0?".65rem":0,marginTop:i>0?".65rem":0,borderTop:i>0?"1px solid var(--border)":"none"}}>
                <div style={{fontWeight:700,fontSize:".95rem",marginBottom:".2rem"}}>{nombreMostrado}</div>
                {org.telefono && <a href={`tel:${org.telefono.replace(/\s/g,"")}`}
                  style={{fontFamily:"var(--font-mono)",fontSize:"1rem",color:"var(--cyan)",textDecoration:"none",display:"block",fontWeight:700,marginBottom:".1rem"}}>
                  📞 {org.telefono}</a>}
                {org.email && <a href={`mailto:${org.email}`}
                  style={{fontFamily:"var(--font-mono)",fontSize:".76rem",color:"var(--text-muted)",textDecoration:"none",display:"block"}}>
                  ✉ {org.email}</a>}
              </div>
            );})}
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
