/**
 * FormularioPublico.jsx — T2.2 / Mejora 9
 * Componente de registro público de voluntarios.
 * Extraído de Voluntarios.jsx para desacoplar el portal público del panel privado.
 * Las opciones del formulario y las imágenes se leen directamente de useData,
 * igual que en VoluntarioPortal — no dependen del orquestador padre.
 *
 * Mejora 9: validación con Zod + react-hook-form.
 * - Esquema centralizado en src/lib/schemas/voluntarioSchema.js
 * - Accesibilidad: aria-invalid + aria-describedby en cada campo
 * - Gestión del duplicado (409) con mensaje accionable
 */
import { useState, useId, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { crearEsquemaFormulario } from "@/lib/schemas/voluntarioSchema";
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK, GUIA_TALLAS } from "@/constants/camisetasConstants";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { DIST_COLORS } from "@/constants/voluntariosConstants";
import { useData } from "@/hooks/useData";
import {
  SK_VOL_IMG_FRONT, SK_VOL_IMG_BACK, SK_VOL_IMG_GUIA_TALLAS,
  SK_VOL_OPCION_PUESTO, SK_VOL_OPCION_VEHICULO,
  SK_VOL_OPCION_EMAIL, SK_VOL_OPCION_EMERGENCIA,
} from "@/constants/storageKeys";

export function FormularioPublico({ onVolver, puestos, onRegistrar, config: cfgProp, voluntarios: volsProp }) {
  const config = cfgProp || EVENT_CONFIG_DEFAULT;
  const vols = volsProp || [];

  // Textos configurables — con fallback a los valores por defecto
  const formSubtitulo    = config.formSubtitulo    || "Formulario de inscripción de voluntarios";
  const formBoton        = config.formBoton        || "✓ Registrarme como voluntario";
  const formConfirmacion = config.formConfirmacion || "Gracias por apuntarte como voluntario. El equipo organizador se pondrá en contacto contigo próximamente.";

  // Lee directamente de storage — misma fuente que VoluntarioPortal y Configuracion
  const [imgF]             = useData(SK_VOL_IMG_FRONT,       SHIRT_PLACEHOLDER_FRONT);
  const [imgB]             = useData(SK_VOL_IMG_BACK,        SHIRT_PLACEHOLDER_BACK);
  const [imgGuiaTallas]    = useData(SK_VOL_IMG_GUIA_TALLAS, null);
  const [opcionPuesto]     = useData(SK_VOL_OPCION_PUESTO,   true);
  const [opcionVehiculo]   = useData(SK_VOL_OPCION_VEHICULO, true);
  const [opcionEmail]      = useData(SK_VOL_OPCION_EMAIL,    false);
  const [opcionEmergencia] = useData(SK_VOL_OPCION_EMERGENCIA, false);

  // Esquema Zod con opciones del evento
  const schema = crearEsquemaFormulario({
    emailRequerido: opcionEmail,
    emergenciaRequerida: opcionEmergencia,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: "", apellidos: "", telefono: "", email: "",
      talla: "", puestoId: "", coche: false,
      telefonoEmergencia: "", website: "",
    },
  });

  const tallaActual = watch("talla");
  const telefonoActual = watch("telefono");
  const cocheActual = watch("coche");

  const [enviado, setEnviado] = useState(false);
  const [formSnapshot, setFormSnapshot] = useState(null);
  const [telefonoDuplicado, setTelefonoDuplicado] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [guiaTallas, setGuiaTallas] = useState(false);

  // ── Refs para gestión de foco en modales (a11y HAL-04, HAL-06) ──────────
  const lightboxCloseRef   = useRef(null);
  const guiaTallasCloseRef = useRef(null);
  const lightboxTriggerRef = useRef(null);
  const guiaTallasTriggerRef = useRef(null);

  // Mover foco al botón de cierre al abrir cada modal
  useEffect(() => {
    if (lightbox && lightboxCloseRef.current) {
      lightboxCloseRef.current.focus();
    }
  }, [lightbox]);

  useEffect(() => {
    if (guiaTallas && guiaTallasCloseRef.current) {
      guiaTallasCloseRef.current.focus();
    }
  }, [guiaTallas]);

  // Cerrar modales con Escape y restaurar foco al trigger
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (lightbox) {
        setLightbox(null);
        lightboxTriggerRef.current?.focus();
      } else if (guiaTallas) {
        setGuiaTallas(false);
        guiaTallasTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightbox, guiaTallas]);

  // IDs accesibles para aria-describedby
  const uid = useId();
  const errId = (campo) => `${uid}-err-${campo}`;
  const hintId = (campo) => `${uid}-hint-${campo}`;

  const handleSubmitForm = async (data) => {
    // Honeypot check (ya en servidor también, defensa en profundidad)
    if (data.website) return;

    // Verificar duplicado por teléfono antes de enviar
    const tel = (data.telefono || "").replace(/[\s-]/g, "");
    if (vols.some(v => v.telefono && v.telefono.replace(/[\s-]/g, "") === tel)) {
      setError("telefono", {
        type: "manual",
        message: "Este teléfono ya está registrado. ¿Ya eres voluntario?",
      });
      setTelefonoDuplicado(true);
      return;
    }

    try {
      await onRegistrar({
        nombre:    data.nombre,
        apellidos: data.apellidos,
        telefono:  data.telefono,
        ...(opcionEmail ? { email: data.email || "" } : {}),
        talla: data.talla,
        puestoId: data.puestoId ? parseInt(data.puestoId) : null,
        rol: "apoyo", estado: "pendiente", coche: data.coche,
        notas: "", fechaRegistro: new Date().toISOString().split("T")[0],
        ...(opcionEmergencia ? {
          telefonoEmergencia: data.telefonoEmergencia || "",
          contactoEmergencia: data.telefonoEmergencia || "",
        } : {}),
      });
      setFormSnapshot(data);
      setEnviado(true);
    } catch (err) {
      // onRegistrar puede lanzar error con status 409 (duplicado desde servidor)
      if (err?.status === 409 || err?.message?.includes("409")) {
        setError("telefono", {
          type: "manual",
          message: "Este teléfono ya está registrado. ¿Ya eres voluntario?",
        });
        setTelefonoDuplicado(true);
      }
    }
  };

  if (enviado) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 500, textAlign: "center", animation: "fadeUp 0.5s ease both" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 800, color: "var(--green)", marginBottom: "0.75rem" }}>¡Registro completado!</h2>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", lineHeight: 1.7, marginBottom: "1.25rem" }}>
          {formConfirmacion}
        </p>

        {/* Resumen del registro */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "1rem", textAlign: "left" }}>
          <div style={{ fontSize: "var(--fs-sm)", fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Tu registro</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {[[`Nombre`, `${formSnapshot?.nombre} ${formSnapshot?.apellidos}`], [`Teléfono`, formSnapshot?.telefono], ...(opcionEmail ? [[`Email`, formSnapshot?.email || "—"]] : []), [`Talla camiseta`, formSnapshot?.talla], ...(opcionEmergencia ? [[`🚨 Tel. emergencia`, formSnapshot?.telefonoEmergencia || "—"]] : [])].map(([k, v]) => (
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
            <div>2. Introduce tu teléfono: <strong style={{color:"var(--text)"}}>{formSnapshot?.telefono}</strong></div>
            <div>3. PIN inicial: <strong style={{color:"var(--cyan)",fontSize:"var(--fs-md)"}}>
              {(formSnapshot?.telefono || "").replace(/\D/g,"").slice(-4) || "últimos 4 dígitos"}
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
              fontWeight: 700, fontSize: "var(--fs-md)", cursor: "pointer" }}>
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Vista de camiseta"
          onClick={() => { setLightbox(null); lightboxTriggerRef.current?.focus(); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(8px)", animation: "fadeUp 0.15s ease" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: 480, width: "100%", animation: "slideUp 0.2s ease" }}>
            <div style={{ position: "absolute", top: -14, right: -14, zIndex: 10 }}>
              <button
                ref={lightboxCloseRef}
                onClick={() => { setLightbox(null); lightboxTriggerRef.current?.focus(); }}
                aria-label="Cerrar vista de camiseta"
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Guía de tallas"
          onClick={() => { setGuiaTallas(false); guiaTallasTriggerRef.current?.focus(); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(6px)", animation: "fadeUp 0.15s ease" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--surface)", border: "1px solid var(--border-light)", borderRadius: 16, maxWidth: 480, width: "100%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", animation: "slideUp 0.2s ease" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "var(--fs-md)" }}>📐 Guía de tallas</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.2rem" }}>Medidas en centímetros — mide sobre la camiseta plana</div>
              </div>
              <button
                ref={guiaTallasCloseRef}
                onClick={() => { setGuiaTallas(false); guiaTallasTriggerRef.current?.focus(); }}
                aria-label="Cerrar guía de tallas"
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "var(--fs-lg)" }}>✕</button>
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
                    <tr
                      key={row.talla}
                      tabIndex={0}
                      role="row"
                      aria-label={`Seleccionar talla ${row.talla}: pecho ${row.pecho} cm, largo ${row.largo} cm, hombro ${row.hombro} cm${tallaActual === row.talla ? " (seleccionada)" : ""}`}
                      style={{ background: i % 2 === 0 ? "transparent" : "rgba(30,45,80,0.2)", cursor: "pointer", outline: "none" }}
                      onClick={() => { setValue("talla", row.talla, { shouldValidate: true }); setGuiaTallas(false); guiaTallasTriggerRef.current?.focus(); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setValue("talla", row.talla, { shouldValidate: true });
                          setGuiaTallas(false);
                          guiaTallasTriggerRef.current?.focus();
                        }
                      }}
                      onFocus={e => { e.currentTarget.style.boxShadow = "inset 0 0 0 2px var(--cyan)"; }}
                      onBlur={e => { e.currentTarget.style.boxShadow = ""; }}>
                      <td style={{ padding: "0.5rem 1rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: tallaActual === row.talla ? "var(--cyan)" : "var(--text)", borderBottom: "1px solid rgba(30,45,80,0.3)" }}>
                        {row.talla} {tallaActual === row.talla && <span style={{ color: "var(--green)", fontSize: "var(--fs-sm)" }}>✓</span>}
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
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", color: "var(--text-muted)", marginBottom: "1.25rem" }}>{formSubtitulo}</div>
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
              <button
                key={key}
                type="button"
                ref={key === "front" ? lightboxTriggerRef : null}
                onClick={() => setLightbox(key)}
                aria-label={`Ver ${label} a tamaño completo`}
                style={{ cursor: "pointer", borderRadius: 12, overflow: "hidden", border: `1px solid ${accent}33`, background: "var(--surface)", position: "relative", transition: "all 0.18s", padding: 0, textAlign: "left", display: "block", width: "100%" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${accent}18`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${accent}33`; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                <img src={src} alt={label} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                <div style={{ padding: "0.45rem 0.65rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${accent}22` }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: accent }}>🔍 Ver</span>
                </div>
              </button>
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
                  tabIndex={-1}
                  autoComplete="off"
                  {...register("website")}
                />
              </div>

              <FormField label="Nombre *" error={errors.nombre?.message} errId={errId("nombre")}>
                <input
                  className="pub-input"
                  placeholder="Ej: María"
                  aria-invalid={!!errors.nombre}
                  aria-describedby={errors.nombre ? errId("nombre") : undefined}
                  {...register("nombre")}
                />
              </FormField>
              <FormField label="Apellidos *" error={errors.apellidos?.message} errId={errId("apellidos")}>
                <input
                  className="pub-input"
                  placeholder="Ej: García López"
                  aria-invalid={!!errors.apellidos}
                  aria-describedby={errors.apellidos ? errId("apellidos") : undefined}
                  {...register("apellidos")}
                />
              </FormField>
            </div>

            <FormField
              label="Teléfono *"
              error={errors.telefono?.message}
              hint="Se usará para coordinación el día de carrera"
              errId={errId("telefono")}
              hintId={hintId("telefono")}
            >
              <input
                className="pub-input"
                placeholder="612 345 678"
                inputMode="tel"
                aria-invalid={!!errors.telefono}
                aria-describedby={[
                  errors.telefono ? errId("telefono") : null,
                  hintId("telefono"),
                ].filter(Boolean).join(" ")}
                {...register("telefono", {
                  onBlur: (e) => {
                    const tel = e.target.value.replace(/[\s-]/g, "");
                    if (tel.length >= 9 && vols.some(v => v.telefono && v.telefono.replace(/[\s-]/g, "") === tel)) {
                      setTelefonoDuplicado(true);
                    } else {
                      setTelefonoDuplicado(false);
                    }
                  }
                })}
              />
              {telefonoDuplicado && (
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                  color: "var(--amber)", marginTop: ".3rem",
                  display: "flex", alignItems: "center", gap: ".35rem", flexWrap: "wrap",
                }}>
                  ⚠ Este teléfono ya está registrado.{" "}
                  <a href="/voluntarios/mi-ficha" style={{ color: "var(--cyan)", textDecoration: "underline" }}>
                    ¿Quieres acceder a tu ficha? →
                  </a>
                </div>
              )}
            </FormField>

            {opcionEmail && (
              <FormField
                label="Email"
                error={errors.email?.message}
                hint="Para comunicaciones previas a la carrera (instrucciones, cambios de horario)"
                errId={errId("email")}
                hintId={hintId("email")}
              >
                <input
                  className="pub-input"
                  type="email"
                  placeholder="tu@email.com"
                  inputMode="email"
                  autoCapitalize="none"
                  aria-invalid={!!errors.email}
                  aria-describedby={[
                    errors.email ? errId("email") : null,
                    hintId("email"),
                  ].filter(Boolean).join(" ")}
                  {...register("email")}
                />
              </FormField>
            )}

            {/* Talla con guía */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <label style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-base)", fontWeight: 600, color: errors.talla ? "var(--red)" : "var(--text)" }}>
                  Talla de camiseta *
                </label>
                <button
                  ref={guiaTallasTriggerRef}
                  type="button"
                  onClick={() => setGuiaTallas(true)}
                  style={{ background: "var(--cyan-dim)", color: "var(--cyan)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 5, padding: "0.18rem 0.55rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                  📐 Guía de tallas
                </button>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Recibirás una camiseta técnica de voluntario · Consulta la guía si tienes dudas
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }} role="group" aria-label="Talla de camiseta">
                {TALLAS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setValue("talla", t, { shouldValidate: true })}
                    aria-pressed={tallaActual === t}
                    style={{ padding: "0.45rem 0.7rem", borderRadius: 7, border: `1px solid ${tallaActual === t ? "var(--cyan)" : "var(--border)"}`, background: tallaActual === t ? "var(--cyan-dim)" : "var(--surface2)", color: tallaActual === t ? "var(--cyan)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, cursor: "pointer", transition: "all 0.15s", transform: tallaActual === t ? "scale(1.08)" : "scale(1)" }}>
                    {t}
                  </button>
                ))}
              </div>
              {errors.talla && (
                <div id={errId("talla")} role="alert" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", marginTop: "0.3rem" }}>
                  ⚠ {errors.talla.message}
                </div>
              )}
            </div>

            {opcionPuesto && (
              <FormField label="Puesto preferido" hint="Opcional — el organizador hará la asignación final" hintId={hintId("puesto")}>
                <select
                  className="pub-input"
                  style={{ appearance: "none" }}
                  aria-describedby={hintId("puesto")}
                  {...register("puestoId")}
                >
                  <option value="">Sin preferencia</option>
                  {puestos.map(p => {
                    const confirmados = vols.filter(v => v.puestoId === p.id && v.estado === "confirmado").length;
                    const disponibles = (p.necesarios || 0) - confirmados;
                    const completo = p.necesarios > 0 && disponibles <= 0;
                    const label = p.necesarios > 0
                      ? completo
                        ? `${p.nombre} (${p.tipo}) — completo`
                        : `${p.nombre} (${p.tipo}) · ${disponibles} plaza${disponibles !== 1 ? "s" : ""} disponible${disponibles !== 1 ? "s" : ""}`
                      : `${p.nombre} (${p.tipo})`;
                    return (
                      <option key={p.id} value={p.id} disabled={completo}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </FormField>
            )}

            {opcionVehiculo && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.85rem 1rem" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-base)", fontWeight: 600 }}>¿Dispones de vehículo propio?</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.15rem" }}>Puede facilitar el traslado a puestos remotos</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={cocheActual}
                  onClick={() => setValue("coche", !cocheActual)}
                  style={{ width: 48, height: 26, borderRadius: 13, background: cocheActual ? "var(--green)" : "var(--surface3)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 3, left: cocheActual ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                </button>
              </div>
            )}

            {opcionEmergencia && (
              <FormField
                label="🚨 Teléfono de emergencia"
                error={errors.telefonoEmergencia?.message}
                hint="Persona a avisar en caso de incidente el día del evento"
                errId={errId("telefonoEmergencia")}
                hintId={hintId("telefonoEmergencia")}
              >
                <input
                  className="pub-input"
                  type="tel"
                  placeholder="612 345 678"
                  inputMode="tel"
                  aria-invalid={!!errors.telefonoEmergencia}
                  aria-describedby={[
                    errors.telefonoEmergencia ? errId("telefonoEmergencia") : null,
                    hintId("telefonoEmergencia"),
                  ].filter(Boolean).join(" ")}
                  style={{ borderColor: errors.telefonoEmergencia ? "var(--red)" : undefined }}
                  {...register("telefonoEmergencia")}
                />
              </FormField>
            )}

            <button
              type="button"
              onClick={handleSubmit(handleSubmitForm)}
              disabled={isSubmitting}
              style={{ width: "100%", padding: "0.85rem", background: isSubmitting ? "var(--surface2)" : "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(167,139,250,0.15))", border: "1px solid rgba(34,211,238,0.35)", borderRadius: 10, color: isSubmitting ? "var(--text-muted)" : "var(--text)", fontFamily: "var(--font-display)", fontSize: "var(--fs-md)", fontWeight: 800, cursor: isSubmitting ? "not-allowed" : "pointer", letterSpacing: "0.03em", transition: "all 0.18s", marginTop: "0.25rem" }}
              onMouseEnter={e => { if (!isSubmitting) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(34,211,238,0.15)"; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
              {isSubmitting ? "Enviando…" : formBoton}
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

// ─── HELPER: FormField ────────────────────────────────────────────────────────
// Wrapper accesible para campos de formulario.
// errId / hintId conectan el campo con el mensaje de error y el hint via aria-describedby.
function FormField({ label, error, hint, children, errId, hintId }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <label style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-base)", fontWeight: 600, color: error ? "var(--red)" : "var(--text)" }}>
        {label}
      </label>
      {hint && (
        <div id={hintId} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "0.15rem" }}>
          {hint}
        </div>
      )}
      {children}
      {error && (
        <div id={errId} role="alert" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", marginTop: "0.15rem" }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
