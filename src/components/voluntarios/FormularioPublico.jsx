/**
 * FormularioPublico.jsx — T2.2
 * Componente de registro público de voluntarios.
 * Extraído de Voluntarios.jsx para desacoplar el portal público del panel privado.
 */
import { useState } from "react";
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK, GUIA_TALLAS } from "@/constants/camisetasConstants";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { DIST_COLORS } from "@/constants/voluntariosConstants";

export function FormularioPublico({ onVolver, puestos, onRegistrar, imgFront: imgF, imgBack: imgB, imgGuiaTallas, opcionPuesto, opcionVehiculo, opcionEmail, opcionEmergencia, config: cfgProp }) {
  const config = cfgProp || EVENT_CONFIG_DEFAULT;
  const [form, setForm] = useState({ nombre: "", apellidos: "", telefono: "", email: "", talla: "", puestoId: "", coche: false, telefonoEmergencia: "", contactoEmergencia: "", website: "" });
  const [enviado, setEnviado] = useState(false);
  const [errores, setErrores] = useState({});
  const [lightbox, setLightbox] = useState(null); // null | "front" | "back"
  const [guiaTallas, setGuiaTallas] = useState(false);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (!form.apellidos.trim()) e.apellidos = "Requerido";
    if (!form.telefono.trim() || !/^\d{9}$/.test(form.telefono.replace(/\s/g, ""))) e.telefono = "Teléfono de 9 dígitos";
    if (opcionEmail && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Email no válido";
    if (!form.talla) e.talla = "Selecciona talla";
    if (opcionEmergencia && !form.telefonoEmergencia?.trim()) e.telefonoEmergencia = "Requerido para la seguridad del evento";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validar()) return;
    onRegistrar({
      nombre:    form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      telefono: form.telefono.trim(),
      ...(opcionEmail ? { email: form.email.trim() } : {}),
      talla: form.talla,
      puestoId: form.puestoId ? parseInt(form.puestoId) : null,
      rol: "apoyo", estado: "pendiente", coche: form.coche,
      notas: "", fechaRegistro: new Date().toISOString().split("T")[0],
      ...(opcionEmergencia ? { telefonoEmergencia: form.telefonoEmergencia?.trim(), contactoEmergencia: form.telefonoEmergencia?.trim() } : {}),
    });
    setEnviado(true);
  };

  if (enviado) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 500, textAlign: "center", animation: "fadeUp 0.5s ease both" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 800, color: "var(--green)", marginBottom: "0.75rem" }}>¡Registro completado!</h2>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.85rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>
          Gracias por apuntarte como voluntario del <strong style={{ color: "var(--text)" }}>Trail El Guerrero 2026</strong>.<br />
          El equipo organizador se pondrá en contacto contigo próximamente.
        </p>

        {/* Resumen del registro */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "1rem", textAlign: "left" }}>
          <div style={{ fontSize: "var(--fs-sm)", fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Tu registro</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {[[`Nombre`, `${form.nombre} ${form.apellidos}`], [`Teléfono`, form.telefono], ...(opcionEmail ? [[`Email`, form.email || "—"]] : []), [`Talla camiseta`, form.talla], ...(opcionEmergencia ? [[`🚨 Tel. emergencia`, form.telefonoEmergencia || "—"]] : [])].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-base)" }}>
                <span style={{ color: "var(--text-muted)" }}>{k}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text)" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Instrucciones portal voluntario */}
        <div style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "1.25rem", textAlign: "left" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--cyan)", fontWeight: 700, marginBottom: "0.6rem" }}>
            📱 Cómo acceder a tu panel de voluntario
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", lineHeight: 1.9 }}>
            <div>1. Abre <strong style={{color:"var(--cyan)"}}>{typeof window !== "undefined" ? window.location.origin : ""}/voluntarios/mi-ficha</strong></div>
            <div>2. Introduce tu teléfono: <strong style={{color:"var(--text)"}}>{form.telefono}</strong></div>
            <div>3. PIN inicial: <strong style={{color:"var(--cyan)",fontSize:"var(--fs-md)"}}>
              {form.telefono.replace(/\D/g,"").slice(-4) || "últimos 4 dígitos"}
            </strong></div>
          </div>
          <button
            onClick={() => {
              const url = (typeof window !== "undefined" ? window.location.origin : "") + "/voluntarios/mi-ficha";
              navigator.clipboard?.writeText(url).then(() => {}).catch(() => {});
            }}
            style={{ marginTop: "0.75rem", background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.25)",
              borderRadius: 8, padding: "0.45rem 1rem", fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-sm)", color: "var(--cyan)", cursor: "pointer", fontWeight: 700 }}>
            📋 Copiar enlace del portal
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => { try { window.close(); } catch(e) { /* window.close() puede bloquearse en contextos sin opener */ } window.location.href = "/"; }}
            style={{ background: "var(--green-dim)", color: "var(--green)", border: "1px solid rgba(52,211,153,0.3)",
              borderRadius: 8, padding: "0.65rem 1.5rem", fontFamily: "var(--font-display)",
              fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
            ✓ Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", backgroundImage: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(34,211,238,0.07) 0%, transparent 60%)" }}>
      {/* LIGHTBOX */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(8px)", animation: "fadeUp 0.15s ease" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: 480, width: "100%", animation: "slideUp 0.2s ease" }}>
            <div style={{ position: "absolute", top: -14, right: -14, zIndex: 10 }}>
              <button onClick={() => setLightbox(null)}
                style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", fontSize: "var(--fs-md)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border-light)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", display: "flex", gap: "0.75rem" }}>
                <button onClick={() => setLightbox("front")} style={{ background: "none", border: "none", cursor: "pointer", color: lightbox === "front" ? "var(--cyan)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, paddingBottom: "0.15rem", borderBottom: lightbox === "front" ? "2px solid var(--cyan)" : "2px solid transparent" }}>Vista delantera</button>
                <button onClick={() => setLightbox("back")} style={{ background: "none", border: "none", cursor: "pointer", color: lightbox === "back" ? "var(--violet)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, paddingBottom: "0.15rem", borderBottom: lightbox === "back" ? "2px solid var(--violet)" : "2px solid transparent" }}>Vista trasera</button>
              </div>
              <img src={lightbox === "front" ? (imgF || SHIRT_PLACEHOLDER_FRONT) : (imgB || SHIRT_PLACEHOLDER_BACK)}
                alt={lightbox === "front" ? "Camiseta delantera" : "Camiseta trasera"}
                style={{ width: "100%", display: "block", maxHeight: "70vh", objectFit: "contain" }} />
            </div>
            <div style={{ textAlign: "center", marginTop: "0.6rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>Toca fuera para cerrar</div>
          </div>
        </div>
      )}

      {/* GUÍA DE TALLAS MODAL */}
      {guiaTallas && (
        <div onClick={() => setGuiaTallas(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(6px)", animation: "fadeUp 0.15s ease" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--surface)", border: "1px solid var(--border-light)", borderRadius: 16, maxWidth: 480, width: "100%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", animation: "slideUp 0.2s ease" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "var(--fs-md)" }}>📐 Guía de tallas</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.2rem" }}>Medidas en centímetros — mide sobre la camiseta plana</div>
              </div>
              <button onClick={() => setGuiaTallas(false)} aria-label="Cerrar guía de tallas" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "var(--fs-lg)" }}>✕</button>
            </div>
            {/* If custom guía image uploaded, show it prominently */}
            {imgGuiaTallas && (
              <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
                <img src={imgGuiaTallas} alt="Guía de tallas" style={{ width: "100%", borderRadius: 8, objectFit: "contain", maxHeight: "40vh" }} />
              </div>
            )}
            {/* Diagrama cuerpo */}
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", gap: "1.5rem", alignItems: "center" }}>
              <svg width="90" height="100" viewBox="0 0 90 100" style={{ flexShrink: 0 }}>
                <rect x="20" y="0" width="50" height="60" rx="4" fill="#1a2540" stroke="#1e2d50" strokeWidth="1.5"/>
                <rect x="0" y="0" width="22" height="35" rx="3" fill="#1a2540" stroke="#1e2d50" strokeWidth="1.5"/>
                <rect x="68" y="0" width="22" height="35" rx="3" fill="#1a2540" stroke="#1e2d50" strokeWidth="1.5"/>
                <rect x="25" y="60" width="40" height="40" rx="3" fill="#151e35" stroke="#1e2d50" strokeWidth="1"/>
                <line x1="22" y1="20" x2="68" y2="20" stroke="#22d3ee" strokeWidth="1.5" markerEnd="url(#arr)" markerStart="url(#arr2)"/>
                <text x="45" y="17" textAnchor="middle" fill="#22d3ee" fontSize="7" fontFamily="monospace">PECHO</text>
                <line x1="78" y1="2" x2="78" y2="58" stroke="#a78bfa" strokeWidth="1.5"/>
                <text x="85" y="32" textAnchor="middle" fill="#a78bfa" fontSize="7" fontFamily="monospace" transform="rotate(90, 85, 32)">LARGO</text>
                <line x1="22" y1="8" x2="45" y2="8" stroke="#34d399" strokeWidth="1.5"/>
                <text x="33" y="6" textAnchor="middle" fill="#34d399" fontSize="6" fontFamily="monospace">HOM.</text>
              </svg>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {[["var(--cyan)", "Pecho", "Contorno del pecho en la parte más ancha"],
                  ["var(--violet)", "Largo", "Desde el hombro hasta el bajo"],
                  ["var(--green)", "Hombro", "De hombro a hombro por la espalda"]].map(([c, n, desc]) => (
                  <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, marginTop: 3, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, color: c }}>{n}: </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-base)" }}>
                <thead>
                  <tr style={{ background: "var(--surface2)" }}>
                    <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>TALLA</th>
                    <th style={{ padding: "0.5rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--cyan)", borderBottom: "1px solid var(--border)" }}>PECHO (cm)</th>
                    <th style={{ padding: "0.5rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--violet)", borderBottom: "1px solid var(--border)" }}>LARGO (cm)</th>
                    <th style={{ padding: "0.5rem 1rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--green)", borderBottom: "1px solid var(--border)" }}>HOMBRO (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {GUIA_TALLAS.map((row, i) => (
                    <tr key={row.talla} style={{ background: i % 2 === 0 ? "transparent" : "rgba(30,45,80,0.2)", cursor: "pointer" }}
                      onClick={() => { update("talla", row.talla); setGuiaTallas(false); }}>
                      <td style={{ padding: "0.5rem 1rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: form.talla === row.talla ? "var(--cyan)" : "var(--text)", borderBottom: "1px solid rgba(30,45,80,0.3)" }}>
                        {row.talla} {form.talla === row.talla && <span style={{ color: "var(--green)", fontSize: "var(--fs-sm)" }}>✓</span>}
                      </td>
                      <td style={{ padding: "0.5rem", textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--text)", borderBottom: "1px solid rgba(30,45,80,0.3)" }}>{row.pecho}</td>
                      <td style={{ padding: "0.5rem", textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--text)", borderBottom: "1px solid rgba(30,45,80,0.3)" }}>{row.largo}</td>
                      <td style={{ padding: "0.5rem 1rem", textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--text)", borderBottom: "1px solid rgba(30,45,80,0.3)" }}>{row.hombro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
                💡 Toca una fila para seleccionar esa talla directamente
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem", animation: "fadeUp 0.4s ease both" }}>
          <div style={{ fontSize: "var(--fs-xs)", fontFamily: "var(--font-mono)", color: "var(--cyan)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.5rem" }}>🏔️ {config.lugar} · {config.provincia} · {new Date(config.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric"})}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 5vw, 2.6rem)", fontWeight: 800, background: "linear-gradient(135deg, #fff 0%, var(--cyan) 60%, var(--violet) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1, marginBottom: "0.5rem" }}>
            Trail El Guerrero
          </h1>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Formulario de inscripción de voluntarios</div>
          <div style={{ display: "inline-flex", gap: "1.5rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.6rem 1.25rem" }}>
            {[["TG7","7 km"],["TG13","13 km"],["TG25","25 km"]].map(([k,v]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, color: DIST_COLORS[k] }}>{k}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOTOS CAMISETA */}
        <div style={{ marginBottom: "1.25rem", animation: "fadeUp 0.4s 0.05s ease both", opacity: 0, animationFillMode: "forwards" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.6rem" }}>👕 Camiseta técnica de voluntario</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {[
              { key: "front", label: "Vista delantera", src: imgF || SHIRT_PLACEHOLDER_FRONT, accent: "var(--cyan)" },
              { key: "back",  label: "Vista trasera",   src: imgB || SHIRT_PLACEHOLDER_BACK,  accent: "var(--violet)" },
            ].map(({ key, label, src, accent }) => (
              <div key={key} onClick={() => setLightbox(key)}
                style={{ cursor: "pointer", borderRadius: 12, overflow: "hidden", border: `1px solid ${accent}33`, background: "var(--surface)", position: "relative", transition: "all 0.18s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${accent}18`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${accent}33`; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                <img src={src} alt={label} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                <div style={{ padding: "0.45rem 0.65rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${accent}22` }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: accent }}>🔍 Ver</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", animation: "fadeUp 0.5s 0.1s ease both", opacity: 0, animationFillMode: "forwards" }}>
          <div style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.1), rgba(167,139,250,0.08))", borderBottom: "1px solid var(--border)", padding: "1rem 1.5rem" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-md)" }}>Datos del voluntario</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.2rem" }}>Todos los campos con * son obligatorios</div>
          </div>

          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {/* ── Honeypot anti-spam: oculto para humanos, trampa para bots ── */}
              <div style={{ position: "absolute", opacity: 0, height: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true">
                <label>No rellenar este campo</label>
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={e => update("website", e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <FormField label="Nombre *" error={errores.nombre}>
                <input className="pub-input" placeholder="Ej: María" value={form.nombre} onChange={e => update("nombre", e.target.value)} />
              </FormField>
              <FormField label="Apellidos *" error={errores.apellidos}>
                <input className="pub-input" placeholder="Ej: García López" value={form.apellidos} onChange={e => update("apellidos", e.target.value)} />
              </FormField>
            </div>

            <FormField label="Teléfono *" error={errores.telefono} hint="Se usará para coordinación el día de carrera">
              <input className="pub-input" placeholder="612 345 678" value={form.telefono} onChange={e => update("telefono", e.target.value)} inputMode="tel" />
            </FormField>

            {opcionEmail && (
              <FormField label="Email" error={errores.email} hint="Para comunicaciones previas a la carrera (instrucciones, cambios de horario)">
                <input className="pub-input" type="email" placeholder="tu@email.com" value={form.email} onChange={e => update("email", e.target.value)} inputMode="email" autoCapitalize="none" />
              </FormField>
            )}

            {/* Talla con guía */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <label style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-base)", fontWeight: 600, color: errores.talla ? "var(--red)" : "var(--text)" }}>
                  Talla de camiseta *
                </label>
                <button onClick={() => setGuiaTallas(true)}
                  style={{ background: "var(--cyan-dim)", color: "var(--cyan)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 5, padding: "0.18rem 0.55rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                  📐 Guía de tallas
                </button>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Recibirás una camiseta técnica de voluntario · Consulta la guía si tienes dudas
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {TALLAS.map(t => (
                  <button key={t} onClick={() => update("talla", t)}
                    style={{ padding: "0.45rem 0.7rem", borderRadius: 7, border: `1px solid ${form.talla === t ? "var(--cyan)" : "var(--border)"}`, background: form.talla === t ? "var(--cyan-dim)" : "var(--surface2)", color: form.talla === t ? "var(--cyan)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, cursor: "pointer", transition: "all 0.15s", transform: form.talla === t ? "scale(1.08)" : "scale(1)" }}>
                    {t}
                  </button>
                ))}
              </div>
              {errores.talla && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", marginTop: "0.3rem" }}>⚠ {errores.talla}</div>}
            </div>

            {opcionPuesto && (
              <FormField label="Puesto preferido" hint="Opcional — el organizador hará la asignación final">
                <select className="pub-input" value={form.puestoId} onChange={e => update("puestoId", e.target.value)} style={{ appearance: "none" }}>
                  <option value="">Sin preferencia</option>
                  {puestos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.tipo})</option>)}
                </select>
              </FormField>
            )}

            {opcionVehiculo && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.85rem 1rem" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-base)", fontWeight: 600 }}>¿Dispones de vehículo propio?</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.15rem" }}>Puede facilitar el traslado a puestos remotos</div>
                </div>
                <button onClick={() => update("coche", !form.coche)}
                  style={{ width: 48, height: 26, borderRadius: 13, background: form.coche ? "var(--green)" : "var(--surface3)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 3, left: form.coche ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                </button>
              </div>
            )}

            {opcionEmergencia && (
              <FormField label="🚨 Teléfono de emergencia" error={errores.telefonoEmergencia}
                hint="Persona a avisar en caso de incidente el día del evento">
                <input className="pub-input" type="tel"
                  placeholder="612 345 678"
                  value={form.telefonoEmergencia || ""}
                  onChange={e => update("telefonoEmergencia", e.target.value)}
                  inputMode="tel"
                  style={{ borderColor: errores.telefonoEmergencia ? "var(--red)" : undefined }} />
              </FormField>
            )}

            <button onClick={handleSubmit}
              style={{ width: "100%", padding: "0.85rem", background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(167,139,250,0.15))", border: "1px solid rgba(34,211,238,0.35)", borderRadius: 10, color: "var(--text)", fontFamily: "var(--font-display)", fontSize: "var(--fs-md)", fontWeight: 800, cursor: "pointer", letterSpacing: "0.03em", transition: "all 0.18s", marginTop: "0.25rem" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(34,211,238,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
              ✓ Registrarme como voluntario
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.25rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", lineHeight: 1.6 }}>
          Tus datos se usarán exclusivamente para la coordinación del evento.<br />
          Organiza: {config.organizador} · {config.lugar}, {config.provincia}
        </div>
        <button onClick={onVolver} style={{ display: "block", margin: "1rem auto 0", background: "none", border: "none", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", cursor: "pointer", textDecoration: "underline" }}>
          ← Volver al panel de organización
        </button>
      </div>
    </div>
  );
}
