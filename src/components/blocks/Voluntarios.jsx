import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { LOCS_DEFAULT, LOCS_KEY } from "@/constants/localizaciones";
import { useData } from "@/lib/dataService";

import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";
// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TALLAS = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"];
const ESTADOS = { pendiente: "Pendiente", confirmado: "Confirmado", cancelado: "Cancelado" };
const TIPOS_PUESTO = ["Salida/Meta","Avituallamiento","Control","Seguridad","Señalización","Parking","Organización","Primeros Auxilios"];
const DISTANCIAS_PUESTO = ["TG7","TG13","TG25","Todas"];
const DIST_COLORS = { TG7: "#22d3ee", TG13: "#a78bfa", TG25: "#34d399", Todas: "#fbbf24" };
const LS_KEY = "teg_voluntarios_v1";

// ─── IMÁGENES CAMISETA (base64 placeholders — reemplazar con URLs reales) ──────
// Para producción: sustituir por URLs de tus imágenes reales
const SHIRT_PLACEHOLDER_FRONT = "data:image/svg+xml," + encodeURIComponent(`
<svg width="400" height="450" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="450" fill="#0f1629"/>
  <text x="200" y="200" text-anchor="middle" fill="#22d3ee" font-size="18" font-family="monospace">CAMISETA TRAIL</text>
  <text x="200" y="230" text-anchor="middle" fill="#22d3ee" font-size="14" font-family="monospace">EL GUERRERO 2026</text>
  <text x="200" y="270" text-anchor="middle" fill="#5a6a8a" font-size="12" font-family="monospace">PARTE DELANTERA</text>
  <text x="200" y="380" text-anchor="middle" fill="#1e2d50" font-size="11" font-family="monospace">Añade tu imagen en el código</text>
</svg>`);
const SHIRT_PLACEHOLDER_BACK = "data:image/svg+xml," + encodeURIComponent(`
<svg width="400" height="450" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="450" fill="#0f1629"/>
  <text x="200" y="200" text-anchor="middle" fill="#a78bfa" font-size="18" font-family="monospace">CAMISETA TRAIL</text>
  <text x="200" y="230" text-anchor="middle" fill="#a78bfa" font-size="14" font-family="monospace">EL GUERRERO 2026</text>
  <text x="200" y="270" text-anchor="middle" fill="#5a6a8a" font-size="12" font-family="monospace">PARTE TRASERA</text>
  <text x="200" y="380" text-anchor="middle" fill="#1e2d50" font-size="11" font-family="monospace">Añade tu imagen en el código</text>
</svg>`);

// Guía de tallas (cm) — editable
const GUIA_TALLAS = [
  { talla: "XXS", pecho: "76-80",  largo: "62", hombro: "36" },
  { talla: "XS",  pecho: "80-84",  largo: "64", hombro: "38" },
  { talla: "S",   pecho: "84-88",  largo: "66", hombro: "40" },
  { talla: "M",   pecho: "88-92",  largo: "68", hombro: "42" },
  { talla: "L",   pecho: "92-96",  largo: "70", hombro: "44" },
  { talla: "XL",  pecho: "96-104", largo: "72", hombro: "46" },
  { talla: "XXL", pecho: "104-112",largo: "74", hombro: "48" },
  { talla: "3XL", pecho: "112-120",largo: "76", hombro: "50" },
  { talla: "4XL", pecho: "120-128",largo: "78", hombro: "52" },
];

const PUESTOS_DEFAULT = [
  { id: 1, nombre: "Zona de Salida / Meta", tipo: "Salida/Meta", distancias: ["Todas"], horaInicio: "06:30", horaFin: "18:00", necesarios: 8, responsableId: null, notas: "Control de dorsales, gestión de salidas escalonadas" },
  { id: 2, nombre: "Avituallamiento KM 4", tipo: "Avituallamiento", distancias: ["TG7","TG13","TG25"], horaInicio: "07:30", horaFin: "14:00", necesarios: 4, responsableId: null, notas: "Agua, isotónico, fruta, barritas" },
  { id: 3, nombre: "Avituallamiento KM 9", tipo: "Avituallamiento", distancias: ["TG13","TG25"], horaInicio: "08:00", horaFin: "15:00", necesarios: 4, responsableId: null, notas: "Agua, isotónico, fruta, geles, sándwiches" },
  { id: 4, nombre: "Avituallamiento KM 16", tipo: "Avituallamiento", distancias: ["TG25"], horaInicio: "08:30", horaFin: "16:00", necesarios: 5, responsableId: null, notas: "Avituallamiento principal TG25 — comida caliente" },
  { id: 5, nombre: "Punto Control KM 7", tipo: "Control", distancias: ["TG13","TG25"], horaInicio: "08:00", horaFin: "13:00", necesarios: 2, responsableId: null, notas: "Registro de dorsales, corte de tiempos" },
  { id: 6, nombre: "Punto Control KM 13", tipo: "Control", distancias: ["TG25"], horaInicio: "09:00", horaFin: "15:00", necesarios: 2, responsableId: null, tiempoLimite: "14:00", notas: "Registro de dorsales, corte de tiempos. Corredores que lleguen después del tiempo límite deben ser retirados de la competición." },
  { id: 7, nombre: "Seguridad Vial Cruce 1", tipo: "Seguridad", distancias: ["Todas"], horaInicio: "07:00", horaFin: "14:00", necesarios: 2, responsableId: null, notas: "Control de tráfico en cruce principal" },
  { id: 8, nombre: "Seguridad Vial Cruce 2", tipo: "Seguridad", distancias: ["TG13","TG25"], horaInicio: "07:30", horaFin: "16:00", necesarios: 2, responsableId: null, notas: "Control de tráfico en cruce secundario" },
  { id: 9, nombre: "Señalización Ruta Alta", tipo: "Señalización", distancias: ["TG25"], horaInicio: "06:00", horaFin: "08:00", necesarios: 3, responsableId: null, notas: "Colocación de balizas tramo alto — madrugada" },
  { id: 10, nombre: "Parking y Accesos", tipo: "Parking", distancias: ["Todas"], horaInicio: "06:00", horaFin: "12:00", necesarios: 4, responsableId: null, notas: "Gestión de aparcamiento y acceso peatonal" },
  { id: 11, nombre: "Zona de Llegada / Trofeos", tipo: "Organización", distancias: ["Todas"], horaInicio: "09:00", horaFin: "18:00", necesarios: 5, responsableId: null, notas: "Recepción finishers, entrega medallas, clasificaciones" },
  { id: 12, nombre: "Primeros Auxilios Base", tipo: "Primeros Auxilios", distancias: ["Todas"], horaInicio: "06:30", horaFin: "18:00", necesarios: 3, responsableId: null, notas: "Titulación requerida: socorrismo o enfermería" },
];

const VOLUNTARIOS_DEFAULT = [
  { id: 1, nombre: "María García López", telefono: "612345678", email: "maria@email.com", talla: "S", puestoId: 1, rol: "responsable", estado: "confirmado", coche: true, notas: "Experiencia 3 ediciones anteriores", fechaRegistro: "2026-02-15" },
  { id: 2, nombre: "Carlos Martínez", telefono: "623456789", email: "carlos@email.com", talla: "L", puestoId: 2, rol: "apoyo", estado: "confirmado", coche: false, notas: "", fechaRegistro: "2026-02-20" },
  { id: 3, nombre: "Ana Rodríguez", telefono: "634567890", email: "ana@email.com", talla: "M", puestoId: 3, rol: "responsable", estado: "pendiente", coche: true, notas: "Habla inglés", fechaRegistro: "2026-03-01" },
];

// useData maneja la persistencia automáticamente

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const genId = (arr) => arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;

function estadoColor(e) {
  return e === "confirmado" ? "var(--green)" : e === "cancelado" ? "var(--red)" : "var(--amber)";
}
function estadoBg(e) {
  return e === "confirmado" ? "var(--green-dim)" : e === "cancelado" ? "var(--red-dim)" : "var(--amber-dim)";
}

// ─── PUBLIC REGISTRATION FORM ──────────────────────────────────────────────────
export function FormularioPublico({ onVolver, puestos, onRegistrar, imgFront: imgF, imgBack: imgB, imgGuiaTallas, opcionPuesto, opcionVehiculo, config: cfgProp }) {
  const config = cfgProp || { nombre:"Trail El Guerrero", edicion:"2026", lugar:"Candeleda", provincia:"Ávila", organizador:"Club Trail El Guerrero", fecha:"2026-08-29" };
  const [form, setForm] = useState({ nombre: "", apellidos: "", telefono: "", email: "", talla: "", puestoId: "", coche: false });
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
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Email no válido";
    if (!form.talla) e.talla = "Selecciona talla";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validar()) return;
    onRegistrar({
      nombre: `${form.nombre.trim()} ${form.apellidos.trim()}`,
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      talla: form.talla,
      puestoId: form.puestoId ? parseInt(form.puestoId) : null,
      rol: "apoyo", estado: "pendiente", coche: form.coche,
      notas: "", fechaRegistro: new Date().toISOString().split("T")[0],
    });
    setEnviado(true);
  };

  if (enviado) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 480, textAlign: "center", animation: "fadeUp 0.5s ease both" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 800, color: "var(--green)", marginBottom: "0.75rem" }}>¡Registro completado!</h2>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.85rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
          Gracias por apuntarte como voluntario del <strong style={{ color: "var(--text)" }}>Trail El Guerrero 2026</strong>.<br />
          El equipo organizador se pondrá en contacto contigo próximamente por WhatsApp o teléfono.
        </p>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "1.5rem", textAlign: "left" }}>
          <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Tu registro</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {[["Nombre", `${form.nombre} ${form.apellidos}`], ["Teléfono", form.telefono], ["Email", form.email || "—"], ["Talla camiseta", form.talla]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-muted)" }}>{k}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text)" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => window.location.href = "/"} style={{ background: "var(--green-dim)", color: "var(--green)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 8, padding: "0.6rem 1.5rem", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
          ← Volver al Inicio
        </button>
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
                style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border-light)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", gap: "0.75rem" }}>
                <button onClick={() => setLightbox("front")} style={{ background: "none", border: "none", cursor: "pointer", color: lightbox === "front" ? "var(--cyan)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 700, paddingBottom: "0.15rem", borderBottom: lightbox === "front" ? "2px solid var(--cyan)" : "2px solid transparent" }}>Vista delantera</button>
                <button onClick={() => setLightbox("back")} style={{ background: "none", border: "none", cursor: "pointer", color: lightbox === "back" ? "var(--violet)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 700, paddingBottom: "0.15rem", borderBottom: lightbox === "back" ? "2px solid var(--violet)" : "2px solid transparent" }}>Vista trasera</button>
              </div>
              <img src={lightbox === "front" ? (imgF || SHIRT_PLACEHOLDER_FRONT) : (imgB || SHIRT_PLACEHOLDER_BACK)}
                alt={lightbox === "front" ? "Camiseta delantera" : "Camiseta trasera"}
                style={{ width: "100%", display: "block", maxHeight: "70vh", objectFit: "contain" }} />
            </div>
            <div style={{ textAlign: "center", marginTop: "0.6rem", fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>Toca fuera para cerrar</div>
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
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem" }}>📐 Guía de tallas</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Medidas en centímetros — mide sobre la camiseta plana</div>
              </div>
              <button onClick={() => setGuiaTallas(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
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
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 700, color: c }}>{n}: </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)" }}>{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface2)" }}>
                    <th style={{ padding: "0.5rem 1rem", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>TALLA</th>
                    <th style={{ padding: "0.5rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--cyan)", borderBottom: "1px solid var(--border)" }}>PECHO (cm)</th>
                    <th style={{ padding: "0.5rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--violet)", borderBottom: "1px solid var(--border)" }}>LARGO (cm)</th>
                    <th style={{ padding: "0.5rem 1rem", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--green)", borderBottom: "1px solid var(--border)" }}>HOMBRO (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {GUIA_TALLAS.map((row, i) => (
                    <tr key={row.talla} style={{ background: i % 2 === 0 ? "transparent" : "rgba(30,45,80,0.2)", cursor: "pointer" }}
                      onClick={() => { update("talla", row.talla); setGuiaTallas(false); }}>
                      <td style={{ padding: "0.5rem 1rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: form.talla === row.talla ? "var(--cyan)" : "var(--text)", borderBottom: "1px solid rgba(30,45,80,0.3)" }}>
                        {row.talla} {form.talla === row.talla && <span style={{ color: "var(--green)", fontSize: "0.7rem" }}>✓</span>}
                      </td>
                      <td style={{ padding: "0.5rem", textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--text)", borderBottom: "1px solid rgba(30,45,80,0.3)" }}>{row.pecho}</td>
                      <td style={{ padding: "0.5rem", textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--text)", borderBottom: "1px solid rgba(30,45,80,0.3)" }}>{row.largo}</td>
                      <td style={{ padding: "0.5rem 1rem", textAlign: "center", fontFamily: "var(--font-mono)", color: "var(--text)", borderBottom: "1px solid rgba(30,45,80,0.3)" }}>{row.hombro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>
                💡 Toca una fila para seleccionar esa talla directamente
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem", animation: "fadeUp 0.4s ease both" }}>
          <div style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", color: "var(--cyan)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.5rem" }}>🏔️ {config.lugar} · {config.provincia} · {new Date(config.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric"})}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 5vw, 2.6rem)", fontWeight: 800, background: "linear-gradient(135deg, #fff 0%, var(--cyan) 60%, var(--violet) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1, marginBottom: "0.5rem" }}>
            Trail El Guerrero
          </h1>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Formulario de inscripción de voluntarios</div>
          <div style={{ display: "inline-flex", gap: "1.5rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.6rem 1.25rem" }}>
            {[["TG7","7 km"],["TG13","13 km"],["TG25","25 km"]].map(([k,v]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 700, color: DIST_COLORS[k] }}>{k}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOTOS CAMISETA */}
        <div style={{ marginBottom: "1.25rem", animation: "fadeUp 0.4s 0.05s ease both", opacity: 0, animationFillMode: "forwards" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.6rem" }}>👕 Camiseta técnica de voluntario</div>
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
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: accent }}>🔍 Ver</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", animation: "fadeUp 0.5s 0.1s ease both", opacity: 0, animationFillMode: "forwards" }}>
          <div style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.1), rgba(167,139,250,0.08))", borderBottom: "1px solid var(--border)", padding: "1rem 1.5rem" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem" }}>Datos del voluntario</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Todos los campos con * son obligatorios</div>
          </div>

          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
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

            <FormField label="Email" error={errores.email} hint="Para comunicaciones previas a la carrera (instrucciones, cambios de horario)">
              <input className="pub-input" type="email" placeholder="tu@email.com" value={form.email} onChange={e => update("email", e.target.value)} inputMode="email" autoCapitalize="none" />
            </FormField>

            {/* Talla con guía */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <label style={{ fontFamily: "var(--font-display)", fontSize: "0.78rem", fontWeight: 600, color: errores.talla ? "var(--red)" : "var(--text)" }}>
                  Talla de camiseta *
                </label>
                <button onClick={() => setGuiaTallas(true)}
                  style={{ background: "var(--cyan-dim)", color: "var(--cyan)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 5, padding: "0.18rem 0.55rem", fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                  📐 Guía de tallas
                </button>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Recibirás una camiseta técnica de voluntario · Consulta la guía si tienes dudas
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {TALLAS.map(t => (
                  <button key={t} onClick={() => update("talla", t)}
                    style={{ padding: "0.45rem 0.7rem", borderRadius: 7, border: `1px solid ${form.talla === t ? "var(--cyan)" : "var(--border)"}`, background: form.talla === t ? "var(--cyan-dim)" : "var(--surface2)", color: form.talla === t ? "var(--cyan)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s", transform: form.talla === t ? "scale(1.08)" : "scale(1)" }}>
                    {t}
                  </button>
                ))}
              </div>
              {errores.talla && <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--red)", marginTop: "0.3rem" }}>⚠ {errores.talla}</div>}
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
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "0.82rem", fontWeight: 600 }}>¿Dispones de vehículo propio?</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>Puede facilitar el traslado a puestos remotos</div>
                </div>
                <button onClick={() => update("coche", !form.coche)}
                  style={{ width: 48, height: 26, borderRadius: 13, background: form.coche ? "var(--green)" : "var(--surface3)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 3, left: form.coche ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                </button>
              </div>
            )}

            <button onClick={handleSubmit}
              style={{ width: "100%", padding: "0.85rem", background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(167,139,250,0.15))", border: "1px solid rgba(34,211,238,0.35)", borderRadius: 10, color: "var(--text)", fontFamily: "var(--font-display)", fontSize: "0.9rem", fontWeight: 800, cursor: "pointer", letterSpacing: "0.03em", transition: "all 0.18s", marginTop: "0.25rem" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(34,211,238,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
              ✓ Registrarme como voluntario
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
          Tus datos se usarán exclusivamente para la coordinación del evento.<br />
          Organiza: {config.organizador} · {config.lugar}, {config.provincia}
        </div>
        <button onClick={onVolver} style={{ display: "block", margin: "1rem auto 0", background: "none", border: "none", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "0.65rem", cursor: "pointer", textDecoration: "underline" }}>
          ← Volver al panel de organización
        </button>
      </div>
    </div>
  );
}


function FormField({ label, error, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontFamily: "var(--font-display)", fontSize: "0.78rem", fontWeight: 600, color: error ? "var(--red)" : "var(--text)" }}>{label}</label>
      {hint && <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "-0.2rem" }}>{hint}</div>}
      {children}
      {error && <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--red)" }}>⚠ {error}</div>}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [eventCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [vista, setVista] = useState("gestion"); // "gestion" | "formulario"
  const [tab, setTab] = useState("dashboard");
  const [rawPuestos, setPuestos] = useData(LS_KEY + "_puestos", PUESTOS_DEFAULT);
  const puestos = Array.isArray(rawPuestos) ? rawPuestos : [];
  const [rawVoluntarios, setVoluntarios] = useData(LS_KEY + "_voluntarios", VOLUNTARIOS_DEFAULT);
  const voluntarios = Array.isArray(rawVoluntarios) ? rawVoluntarios : [];
  const [locs] = useData(LOCS_KEY, LOCS_DEFAULT);
  // Material asignado a localizaciones (solo lectura, para mostrar en ficha de puesto)
  const [rawMat]  = useData("teg_logistica_v1_mat",  []);
  const [rawAsig] = useData("teg_logistica_v1_asig", []);
  const matPorLoc = useMemo(() => {
    const mat   = Array.isArray(rawMat)  ? rawMat  : [];
    const asigs = Array.isArray(rawAsig) ? rawAsig : [];
    const map = {}; // locNombre → [{nombre, cantidad, unidad}]
    asigs.forEach(a => {
      if (!a.puesto) return;
      const item = mat.find(m => m.id === a.materialId);
      if (!item) return;
      if (!map[a.puesto]) map[a.puesto] = [];
      map[a.puesto].push({ nombre: item.nombre, cantidad: a.cantidad, unidad: item.unidad || "ud" });
    });
    return map;
  }, [rawMat, rawAsig]);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [imgFront, setImgFront] = useData(LS_KEY + "_imgFront", SHIRT_PLACEHOLDER_FRONT);
  const [imgBack, setImgBack] = useData(LS_KEY + "_imgBack", SHIRT_PLACEHOLDER_BACK);
  const [imgGuiaTallas, setImgGuiaTallas] = useData(LS_KEY + "_imgGuiaTallas", null);
  const [opcionPuesto, setOpcionPuesto] = useData(LS_KEY + "_opcionPuesto", true);
  const [opcionVehiculo, setOpcionVehiculo] = useData(LS_KEY + "_opcionVehiculo", true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroPuesto, setFiltroPuesto] = useState("todos");
  const [modalVol, setModalVol] = useState(null); // null | "nuevo" | voluntario
  const [modalPuesto, setModalPuesto] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeletePuesto, setConfirmDeletePuesto] = useState(null);
  const [urlCopiada, setUrlCopiada] = useState(false);
  const [ficha, setFicha] = useState(null); // {tipo:'vol'|'puesto', data}
  const abrirFicha = (tipo, data) => {
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "instant" });
    setFicha({ tipo, data });
  };
  const [configOpen, setConfigOpen] = useState(false); // config camisetas colapsada por defecto

  // ── Métricas ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const vols = voluntarios || [];
    const pts = puestos || [];
    const total = vols.length;
    const confirmados = vols.filter(v => v?.estado === "confirmado").length;
    const pendientes = vols.filter(v => v?.estado === "pendiente").length;
    const cancelados = vols.filter(v => v?.estado === "cancelado").length;
    const totalNecesarios = pts.reduce((s, p) => s + (p?.necesarios || 0), 0);
    const asignados = vols.filter(v => v?.puestoId).length;
    const conCoche = vols.filter(v => v?.coche).length;
    const tallasCount = TALLAS.reduce((acc, t) => {
      acc[t] = vols.filter(v => v?.talla === t && v?.estado !== "cancelado").length;
      return acc;
    }, {});
    const coberturaGlobal = totalNecesarios > 0 ? Math.round((confirmados / totalNecesarios) * 100) : 0;
    return { total, confirmados, pendientes, cancelados, totalNecesarios, asignados, conCoche, tallasCount, coberturaGlobal };
  }, [voluntarios, puestos]);

  const puestosConStats = useMemo(() => (puestos || []).map(p => {
    const vols = (voluntarios || []).filter(v => v?.puestoId === p?.id && v?.estado !== "cancelado");
    const confirmados = vols.filter(v => v?.estado === "confirmado").length;
    const cobertura = p?.necesarios > 0 ? Math.round((vols.length / p.necesarios) * 100) : 0;
    const coberturaConf = p?.necesarios > 0 ? Math.round((confirmados / p.necesarios) * 100) : 0;
    return { ...p, voluntariosAsignados: vols, totalAsignados: vols.length, confirmados, cobertura, coberturaConf };
  }), [puestos, voluntarios]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const guardar = () => {
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
    // useData ya se encarga de persistir y notificar.
  };

  const addVoluntario = (data) => {
    const nuevo = { id: genId(voluntarios), ...data };
    setVoluntarios(prev => [...prev, nuevo]);
  };

  const updateVoluntario = (id, data) => setVoluntarios(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
  const deleteVoluntario = (id) => { setVoluntarios(prev => prev.filter(v => v.id !== id)); setConfirmDelete(null); };
  const updatePuesto = (id, data) => setPuestos(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  const addPuesto = (data) => setPuestos(prev => [...prev, { id: genId(puestos), ...data }]);
  const deletePuesto = (id) => { setPuestos(prev => prev.filter(p => p.id !== id)); setVoluntarios(prev => prev.map(v => v.puestoId === id ? { ...v, puestoId: null } : v)); };

  const volsFiltrados = useMemo(() => voluntarios.filter(v => {
    const matchBusqueda = !busqueda || v.nombre.toLowerCase().includes(busqueda.toLowerCase()) || v.telefono.includes(busqueda);
    const matchEstado = filtroEstado === "todos" || v.estado === filtroEstado;
    const matchPuesto = filtroPuesto === "todos" || String(v.puestoId) === filtroPuesto || (filtroPuesto === "sin-asignar" && !v.puestoId);
    return matchBusqueda && matchEstado && matchPuesto;
  }), [voluntarios, busqueda, filtroEstado, filtroPuesto]);

  // ── Formulario público ────────────────────────────────────────────────────
  if (vista === "formulario") return (
    <AppShell>
      <FormularioPublico
        onVolver={() => setVista("gestion")}
        puestos={puestos}
        imgFront={imgFront}
        imgBack={imgBack}
        imgGuiaTallas={imgGuiaTallas}
        opcionPuesto={opcionPuesto}
        opcionVehiculo={opcionVehiculo}
        config={config}
        onRegistrar={(data) => { addVoluntario(data); setVista("gestion"); setTab("voluntarios"); }}
      />
    </AppShell>
  );

  // Días hasta el evento — para reordenar tabs en semana de carrera
  const diasHastaEvento = Math.ceil(((config?.fecha ? new Date(config.fecha) : new Date("2026-08-29")) - new Date()) / 86400000);
  const esSemanaCarrera = diasHastaEvento >= 0 && diasHastaEvento <= 7;

  const TABS_BASE = [
    { id: "dashboard",  icon: "📊", label: "Dashboard" },
    { id: "voluntarios",icon: "👥", label: "Voluntarios", badge: stats.total },
    { id: "puestos",    icon: "📍", label: "Puestos",     badge: puestos.length },
    { id: "dia-d",      icon: "🏁", label: esSemanaCarrera ? "🚨 Día de Carrera" : "Día de Carrera" },
  ];
  // En semana de carrera, Día de Carrera sube a primera posición
  const TABS_VOL = esSemanaCarrera
    ? [TABS_BASE[4], ...TABS_BASE.slice(0, 4)]
    : TABS_BASE;

  return (
    <AppShell>
      <div className="block-container">

        {/* HEADER */}
        <div className="block-header">
          <div>
            <h1 className="block-title">👥 Voluntarios</h1>
            <div className="block-title-sub">
              Módulo de gestión · Trail El Guerrero 2026
              {esSemanaCarrera && <span style={{marginLeft:"0.5rem",color:"var(--red)",fontWeight:700}}>⚡ SEMANA DE CARRERA</span>}
            </div>
          </div>
          <div className="block-actions">
            <span className={`badge ${stats.coberturaGlobal>=80?"badge-green":stats.coberturaGlobal>=50?"badge-amber":"badge-red"}`}>
              🎯 {stats.coberturaGlobal}% cobertura
            </span>
            <button className="btn btn-primary" onClick={() => setModalVol("nuevo")}>+ Voluntario</button>
            <button
              onClick={() => {
                const url = window.location.origin + "/voluntarios/registro";
                navigator.clipboard.writeText(url).then(() => {
                  setUrlCopiada(true);
                  setTimeout(() => setUrlCopiada(false), 2000);
                });
              }}
              className="btn btn-ghost btn-sm"
              title={`Copiar URL del formulario público: ${window.location.origin}/voluntarios/registro`}
              style={{ fontFamily:"var(--font-mono)", fontSize:".68rem" }}>
              {urlCopiada ? "✓ URL copiada" : "🔗 Copiar URL"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setVista("formulario")}
              title="Previsualizar formulario público">
              ↗ Formulario
            </button>
          </div>
        </div>





        {/* OPCIONES FORMULARIO + IMÁGENES — colapsable */}
        <div className="card mb" style={{padding:"0.65rem 1rem"}}>
          <button
            onClick={() => setConfigOpen(v => !v)}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"none",border:"none",cursor:"pointer",padding:0}}>
            <span style={{fontFamily:"var(--font-mono)",fontSize:"0.62rem",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}>
              ⚙️ Configuración formulario público
            </span>
            <span style={{fontFamily:"var(--font-mono)",fontSize:"0.6rem",color:"var(--text-dim)"}}>
              {configOpen ? "▲ ocultar" : "▼ mostrar"}
            </span>
          </button>
          {configOpen && (
            <div className="flex-center gap" style={{flexWrap:"wrap",marginTop:"0.65rem",paddingTop:"0.65rem",borderTop:"1px solid var(--border)"}}>
              {[
                { label: "Elegir puesto", val: opcionPuesto, set: setOpcionPuesto },
                { label: "Vehículo propio", val: opcionVehiculo, set: setOpcionVehiculo },
              ].map(opt => (
                <div key={opt.label} className="flex-center gap-sm">
                  <button className={cls("toggle-btn", opt.val && "active")} onClick={() => opt.set(!opt.val)}>
                    <div className="toggle-thumb" />
                  </button>
                  <span className="xs">{opt.label}</span>
                </div>
              ))}
              <div className="flex-center gap-sm" style={{marginLeft:"auto"}}>
                <ImagenUploader label="Camiseta ▶" img={imgFront}      onImg={setImgFront}      accent="var(--cyan)" />
                <ImagenUploader label="Camiseta ◀" img={imgBack}       onImg={setImgBack}       accent="var(--violet)" />
                <ImagenUploader label="Tallas"     img={imgGuiaTallas} onImg={setImgGuiaTallas} accent="var(--green)" />
              </div>
            </div>
          )}
        </div>

        {/* TABS */}
        <div className="tabs">
          {TABS_VOL.map(item => (
            <button key={item.id} className={cls("tab-btn", tab===item.id && "active")} onClick={() => setTab(item.id)}>
              {item.icon} {item.label}
              {item.badge !== undefined && (
                <span className="badge badge-cyan" style={{marginLeft:"0.3rem"}}>{item.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div key={tab}>
          {tab==="dashboard" && <TabDashboard stats={stats} puestosConStats={puestosConStats} voluntarios={voluntarios} setTab={setTab} onEditarVol={(v) => abrirFicha("vol", v)} onEditarPuesto={(p) => abrirFicha("puesto", p)} />}
          {tab==="voluntarios" && (
            <TabVoluntarios
              voluntarios={volsFiltrados} todosVols={voluntarios} puestos={puestos}
              busqueda={busqueda} setBusqueda={setBusqueda}
              filtroEstado={filtroEstado} setFiltroEstado={setFiltroEstado}
              filtroPuesto={filtroPuesto} setFiltroPuesto={setFiltroPuesto}
              onUpdate={updateVoluntario} onDelete={(id) => setConfirmDelete(id)}
              onNuevo={() => setModalVol("nuevo")} onEditar={(v) => setModalVol(v)}
              onFicha={(v) => abrirFicha("vol", v)}
            />
          )}
          {tab==="puestos" && (
            <TabPuestos
              puestosConStats={puestosConStats} voluntarios={voluntarios}
              locs={locs}
              onUpdatePuesto={updatePuesto} onDeletePuesto={(id) => setConfirmDeletePuesto(id)}
              onNuevoPuesto={() => setModalPuesto("nuevo")} onEditPuesto={(p) => setModalPuesto(p)}
              onEditarVol={(v) => setModalVol(v)}
              onFichaPuesto={(p) => abrirFicha("puesto", p)}
              onFichaVol={(v) => abrirFicha("vol", v)}
            />
          )}
          {tab==="dia-d"  && <TabDiaD puestosConStats={puestosConStats} voluntarios={voluntarios} onUpdateVol={updateVoluntario} />}
        </div>
      </div>

      {/* MODALES */}
      {ficha?.tipo==="vol" && (
        <FichaVoluntario
          voluntario={ficha.data} puestos={puestos}
          onClose={() => setFicha(null)}
          onEditar={() => { const m=document.querySelector("main");if(m)m.scrollTo({top:0,behavior:"instant"}); setFicha(null); setModalVol(ficha.data); }}
          onEliminar={() => { setFicha(null); setConfirmDelete(ficha.data.id); }}
          onUpdate={(data) => { updateVoluntario(ficha.data.id, data); setFicha(f => ({ ...f, data: { ...f.data, ...data } })); }}
        />
      )}
      {ficha?.tipo==="puesto" && (
        <FichaPuesto
          puesto={ficha.data} voluntarios={voluntarios}
          onClose={() => setFicha(null)}
          onEditar={() => { const m=document.querySelector("main");if(m)m.scrollTo({top:0,behavior:"instant"}); setFicha(null); setModalPuesto(ficha.data); }}
          onEliminar={() => { setFicha(null); setConfirmDeletePuesto(ficha.data.id); }}
        />
      )}
      {modalVol && (
        <ModalVoluntario
          key={modalVol==="nuevo" ? "nuevo" : modalVol.id}
          voluntario={modalVol==="nuevo" ? null : modalVol}
          puestos={puestos}
          onSave={(data) => { if (modalVol==="nuevo") addVoluntario(data); else updateVoluntario(modalVol.id, data); setModalVol(null); }}
          onClose={() => setModalVol(null)}
        />
      )}
      {modalPuesto && (
        <ModalPuesto
          key={modalPuesto==="nuevo" ? "nuevo" : modalPuesto.id}
          puesto={modalPuesto==="nuevo" ? null : modalPuesto}
          locs={locs}
          onSave={(data) => { if (modalPuesto==="nuevo") addPuesto(data); else updatePuesto(modalPuesto.id, data); setModalPuesto(null); }}
          onClose={() => setModalPuesto(null)}
        />
      )}
      {confirmDelete && <ModalConfirm mensaje="¿Eliminar este voluntario? Esta acción no se puede deshacer." onConfirm={() => deleteVoluntario(confirmDelete)} onCancel={() => setConfirmDelete(null)} />}
      {confirmDeletePuesto && <ModalConfirm mensaje="¿Eliminar este puesto? Los voluntarios asignados quedarán sin puesto." onConfirm={() => { deletePuesto(confirmDeletePuesto); setConfirmDeletePuesto(null); }} onCancel={() => setConfirmDeletePuesto(null)} />}
    </AppShell>
  );
}

// ─── IMAGEN UPLOADER ─────────────────────────────────────────────────────────
function ImagenUploader({ label, img, onImg, accent }) {
  const isPlaceholder = !img || img === SHIRT_PLACEHOLDER_FRONT || img === SHIRT_PLACEHOLDER_BACK;
  const [compressing, setCompressing] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setCompressing(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 900;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.75);
        onImg(compressed);
        setCompressing(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  return (
    <label style={{ display: "block", cursor: "pointer", marginBottom: "0.25rem" }}>
      <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} disabled={compressing} />
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--surface2)", border: `1px solid ${accent}33`, borderRadius: "var(--radius-sm)", padding: "0.35rem 0.6rem", transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = `${accent}33`; }}>
        {compressing ? (
          <div style={{ width: 24, height: 24, borderRadius: 4, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", flexShrink: 0 }}>⏳</div>
        ) : !isPlaceholder ? (
          <img src={img} alt={label} style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: 4, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", flexShrink: 0 }}>📷</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 700, color: accent }}>{label}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.55rem", color: "var(--text-dim)" }}>
            {compressing ? "Comprimiendo…" : !isPlaceholder ? "✓ Imagen cargada" : "Subir imagen"}
          </div>
        </div>
        {!isPlaceholder && (
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); onImg(null); }}
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.7rem", flexShrink: 0 }}
            title="Eliminar imagen">✕</button>
        )}
      </div>
    </label>
  );
}

// ─── APP SHELL (CSS + fonts) ──────────────────────────────────────────────────
function AppShell({ children }) {
  return (
    <>
      <style>{BLOCK_CSS}</style>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #080c18;
          --surface: #0f1629;
          --surface2: #151e35;
          --surface3: #1a2540;
          --border: #263754;
          --border-light: #344d7a;
          --text: #e8eef8;
          --text-muted: #8a9dba;
          --text-dim: #7080a0;
          --cyan: #22d3ee;
          --cyan-dim: rgba(34,211,238,0.1);
          --violet: #a78bfa;
          --violet-dim: rgba(167,139,250,0.1);
          --green: #34d399;
          --green-dim: rgba(52,211,153,0.1);
          --amber: #fbbf24;
          --amber-dim: rgba(251,191,36,0.1);
          --red: #f87171;
          --red-dim: rgba(248,113,113,0.1);
          --orange: #fb923c;
          --font-display: 'Syne', sans-serif;
          --font-mono: 'DM Mono', 'Space Mono', monospace;
          --radius: 12px;
          --radius-sm: 8px;
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font-display); min-height: 100vh;
          background-image: radial-gradient(ellipse 80% 40% at 50% -5%, rgba(34,211,238,0.06) 0%, transparent 55%); }

        /* LAYOUT */
        .layout { display: flex; min-height: 100vh; }
        @media (max-width: 900px) {
          .layout { flex-direction: column; }
          .sidebar { width: 100% !important; height: auto !important; position: relative !important; top: 0 !important; border-right: none !important; border-bottom: 1px solid var(--border); padding-bottom: 1rem !important; }
          .sidebar-nav { display: flex !important; flex-direction: row !important; overflow-x: auto; padding: 0.5rem !important; gap: 0.5rem !important; }
          .nav-item { flex-shrink: 0; width: auto !important; margin-bottom: 0 !important; }
          .sidebar-logo, .sidebar-stats, .sidebar-actions { padding: 0.75rem !important; }
          .sidebar-stats { display: flex; flex-direction: row !important; gap: 0.75rem; overflow-x: auto; }
          .sidebar-stat { flex-shrink: 0; min-width: 100px; border-bottom: none !important; border-right: 1px solid rgba(30,45,80,0.4); padding-right: 0.75rem !important; }
        }

        /* SIDEBAR */
        .sidebar { width: 210px; min-height: 100vh; height: 100vh; position: sticky; top: 0;
          background: var(--surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; flex-shrink: 0; z-index: 10; }
        .sidebar-logo { padding: 1.25rem 1rem 1rem; border-bottom: 1px solid var(--border); }
        .logo-tag { font-family: var(--font-mono); font-size: 0.52rem; color: var(--cyan);
          letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 0.3rem; opacity: 0.8; }
        .logo-title { font-size: 1.25rem; font-weight: 800;
          background: linear-gradient(135deg, #fff 0%, var(--cyan) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; }
        .logo-sub { font-family: var(--font-mono); font-size: 0.58rem; color: var(--text-muted); margin-top: 0.25rem; }
        .sidebar-nav { flex: 1; padding: 0.6rem 0.4rem; display: flex; flex-direction: column; gap: 0.12rem; overflow-y: auto; }
        .nav-label { font-size: 0.52rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;
          color: var(--text-dim); padding: 0.5rem 0.6rem 0.25rem; font-family: var(--font-mono); }
        .nav-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.65rem;
          border-radius: var(--radius-sm); border: 1px solid transparent; cursor: pointer;
          background: none; color: var(--text-muted); font-family: var(--font-display);
          font-size: 0.76rem; font-weight: 600; text-align: left; width: 100%;
          transition: all 0.15s; position: relative; overflow: hidden; }
        .nav-item::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
          border-radius: 0 2px 2px 0; background: transparent; transition: background 0.15s; }
        .nav-item:hover { color: var(--text); background: var(--surface2); }
        .nav-item.active { color: var(--text); background: var(--surface2); border-color: var(--border-light); }
        .nav-item.active::before { background: var(--cyan); }
        .nav-icon { font-size: 0.85rem; width: 18px; text-align: center; flex-shrink: 0; }
        .nav-badge { margin-left: auto; font-size: 0.52rem; font-family: var(--font-mono);
          padding: 0.1rem 0.3rem; border-radius: 3px; font-weight: 700; }
        .nav-badge-cyan { background: var(--cyan-dim); color: var(--cyan); }
        .sidebar-stats { display: flex; flex-direction: column; gap: 0.3rem; padding: 0 0.6rem 0.25rem; }
        .sidebar-stat { display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; border-bottom: 1px solid rgba(30,45,80,0.4); }
        .sidebar-actions { padding: 0.75rem; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 0.4rem; }
        .btn-link-registro { width: 100%; padding: 0.5rem; background: var(--violet-dim); color: var(--violet);
          border: 1px solid rgba(167,139,250,0.25); border-radius: var(--radius-sm); font-family: var(--font-mono);
          font-size: 0.65rem; font-weight: 700; cursor: pointer; transition: all 0.15s; text-align: center; }
        .btn-link-registro:hover { background: rgba(167,139,250,0.18); transform: translateY(-1px); }
        .btn-action { display: flex; align-items: center; justify-content: center; gap: 0.35rem;
          font-family: var(--font-mono); font-size: 0.68rem; font-weight: 700; padding: 0.5rem;
          border-radius: var(--radius-sm); border: none; cursor: pointer; transition: all 0.15s; width: 100%; }
        .btn-save { background: var(--green-dim); color: var(--green); border: 1px solid rgba(52,211,153,0.25); }
        .btn-save:hover { background: rgba(52,211,153,0.2); }
        .btn-save.saved { background: rgba(52,211,153,0.2); }

        /* MAIN */
        .main { flex: 1; min-width: 0; padding: 1.5rem 1.25rem 4rem; overflow-x: hidden; }
        .tab-content { animation: fadeUp 0.2s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        /* PAGE HEADER */
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .page-title { font-size: 1.3rem; font-weight: 800; color: var(--text); }
        .page-desc { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-muted); margin-top: 0.25rem; }

        /* CARDS */
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
          padding: 1.1rem; margin-bottom: 0.85rem; transition: border-color 0.2s; }
        .card:hover { border-color: var(--border-light); }
        .card-title { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.4rem; color: var(--text-muted); }

        /* KPI GRID */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.65rem; margin-bottom: 1.1rem; }
        .kpi { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
          padding: 0.9rem 1rem; position: relative; overflow: hidden; transition: all 0.2s; cursor: default; }
        .kpi:hover { transform: translateY(-2px); border-color: var(--border-light); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
        .kpi::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
        .kpi.c-green::before { background: linear-gradient(90deg, var(--green), transparent); }
        .kpi.c-amber::before { background: linear-gradient(90deg, var(--amber), transparent); }
        .kpi.c-red::before { background: linear-gradient(90deg, var(--red), transparent); }
        .kpi.c-cyan::before { background: linear-gradient(90deg, var(--cyan), transparent); }
        .kpi.c-violet::before { background: linear-gradient(90deg, var(--violet), transparent); }
        .kpi-label { font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.35rem; font-family: var(--font-mono); }
        .kpi-value { font-size: 1.5rem; font-weight: 800; font-family: var(--font-mono); line-height: 1; }
        .kpi.c-green .kpi-value { color: var(--green); }
        .kpi.c-amber .kpi-value { color: var(--amber); }
        .kpi.c-red .kpi-value { color: var(--red); }
        .kpi.c-cyan .kpi-value { color: var(--cyan); }
        .kpi.c-violet .kpi-value { color: var(--violet); }
        .kpi-sub { font-size: 0.6rem; color: var(--text-muted); margin-top: 0.25rem; font-family: var(--font-mono); }

        .tbl td { padding: 0.5rem 0.6rem; border-bottom: 1px solid rgba(30,45,80,0.35); vertical-align: middle; }
        @media (max-width: 768px) {
          .tbl thead { display: none; }
          .tbl tr { display: block; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 0.75rem; padding: 0.75rem; }
          .tbl td { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(30,45,80,0.2); padding: 0.4rem 0; width: 100%; text-align: right; }
          .tbl td::before { content: attr(data-label); font-family: var(--font-mono); font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase; float: left; font-weight: 700; }
          .tbl td:last-child { border-bottom: none; margin-top: 0.5rem; justify-content: flex-end; }
        }
        .tbl tr:last-child td { border-bottom: none; }
        .tbl tr:hover td { background: rgba(34,211,238,0.02); }

        /* INPUTS */
        .inp { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm);
          color: var(--text); font-family: var(--font-display); font-size: 0.78rem; padding: 0.4rem 0.6rem;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s; width: 100%; }
        .inp:focus { border-color: var(--cyan); box-shadow: 0 0 0 2px rgba(34,211,238,0.08); }
        .inp-sm { padding: 0.28rem 0.4rem; font-size: 0.72rem; }
        .pub-input { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm);
          color: var(--text); font-family: var(--font-display); font-size: 0.85rem; padding: 0.55rem 0.75rem;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s; width: 100%; }
        .pub-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34,211,238,0.1); }

        /* BTNS */
        .btn { padding: 0.38rem 0.8rem; border: none; border-radius: var(--radius-sm);
          font-family: var(--font-display); font-size: 0.72rem; font-weight: 700;
          cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 0.3rem; }
        .btn:hover { transform: translateY(-1px); }
        .btn-cyan { background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(34,211,238,0.25); }
        .btn-cyan:hover { background: rgba(34,211,238,0.18); }
        .btn-green { background: var(--green-dim); color: var(--green); border: 1px solid rgba(52,211,153,0.25); }
        .btn-green:hover { background: rgba(52,211,153,0.18); }
        .btn-red { background: var(--red-dim); color: var(--red); border: 1px solid rgba(248,113,113,0.2); }
        .btn-amber { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(251,191,36,0.2); }
        .btn-ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
        .btn-ghost:hover { color: var(--text); border-color: var(--border-light); }

        /* BADGES */
        .badge { display: inline-block; padding: 0.12rem 0.4rem; border-radius: 4px;
          font-size: 0.6rem; font-weight: 700; font-family: var(--font-mono); text-transform: uppercase; }
        .badge-green { background: var(--green-dim); color: var(--green); }
        .badge-amber { background: var(--amber-dim); color: var(--amber); }
        .badge-red { background: var(--red-dim); color: var(--red); }
        .badge-cyan { background: var(--cyan-dim); color: var(--cyan); }
        .badge-violet { background: var(--violet-dim); color: var(--violet); }

        /* PROGRESS */
        .prog-bar { height: 5px; background: var(--surface3); border-radius: 3px; overflow: hidden; }
        .prog-fill { height: 100%; border-radius: 3px; transition: width 0.5s cubic-bezier(0.4,0,0.2,1); }

        /* CHECKBOX / TOGGLE */
        .toggle-pill { width: 42px; height: 22px; border-radius: 11px; border: none; cursor: pointer;
          position: relative; transition: background 0.2s; flex-shrink: 0; }
        .toggle-pill-dot { position: absolute; top: 3px; width: 16px; height: 16px; border-radius: 50%;
          background: #fff; transition: left 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }

        /* TALLAS GRID */
        .tallas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.5rem; }
        .talla-cell { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm);
          padding: 0.65rem 0.5rem; text-align: center; }

        /* CHECKLIST */
        .checklist-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem;
          border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface2);
          margin-bottom: 0.4rem; transition: all 0.15s; }
        .checklist-row.presente { border-color: rgba(52,211,153,0.3); background: rgba(52,211,153,0.05); }
        .checklist-row.ausente { border-color: rgba(248,113,113,0.25); background: var(--red-dim); }

        /* OVERFLOW */
        .overflow-x { overflow-x: auto; }
        .flex-between { display: flex; align-items: center; justify-content: space-between; }
        .flex-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .mono { font-family: var(--font-mono); }
        .text-muted { color: var(--text-muted); }
        .text-xs { font-size: 0.62rem; }
        .mb-1 { margin-bottom: 0.5rem; }
        .mb-2 { margin-bottom: 1rem; }

        /* SCROLLBAR */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: var(--surface); }
        ::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 2px; }
        @media(max-width:900px){.layout{grid-template-columns:1fr;display:flex;flex-direction:column}.sidebar{border-right:none;border-bottom:1px solid rgba(30,45,80,.4);position:relative;height:auto;padding-bottom:.5rem}.sidebar-nav{display:flex;overflow-x:auto;padding-bottom:.5rem}.nav-item{flex-shrink:0}}
      `}</style>
      {children}
    </>
  );
}

// ─── TAB DASHBOARD ────────────────────────────────────────────────────────────
function TabDashboard({ stats, puestosConStats, voluntarios, setTab, onEditarVol, onEditarPuesto }) {
  const alertas = puestosConStats.filter(p => p.cobertura < 50);
  const cobColor = stats.coberturaGlobal >= 80 ? "c-green" : stats.coberturaGlobal >= 50 ? "c-amber" : "c-red";

  return (
    <>
      <div className="kpi-grid">
        <div className={`kpi ${stats.coberturaGlobal>=80?"green":stats.coberturaGlobal>=50?"amber":"red"}`}
          style={{cursor:"pointer"}} onClick={() => setTab("puestos")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>🎯 Cobertura global<Tooltip text={"Voluntarios confirmados ÷ plazas necesarias en todos los puestos.\n100% = todos los puestos cubiertos por voluntarios confirmados."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:stats.coberturaGlobal>=80?"var(--green)":stats.coberturaGlobal>=50?"var(--amber)":"var(--red)"}}>
            {stats.coberturaGlobal}%
          </div>
          <div className="kpi-sub">{stats.confirmados}/{stats.totalNecesarios} confirmados</div>
        </div>
        <div className="kpi cyan" style={{cursor:"pointer"}} onClick={() => setTab("voluntarios")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>👥 Total voluntarios<Tooltip text={"Total de voluntarios registrados en el sistema, independientemente de su estado.\nIncluye confirmados, pendientes y cancelados."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"var(--cyan)"}}>{stats.total}</div>
          <div className="kpi-sub">
            <span style={{color:"var(--green)"}}>{stats.confirmados} ✓</span>
            {" · "}
            <span style={{color:"var(--amber)"}}>{stats.pendientes} ⏳</span>
            {stats.cancelados > 0 && <>{" · "}<span style={{color:"var(--red)"}}>{stats.cancelados} ✕</span></>}
          </div>
        </div>
        <div className={`kpi ${alertas.length>0?"red":"violet"}`}
          style={{cursor:"pointer"}} onClick={() => setTab("puestos")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>📍 Puestos<Tooltip text={"Número de puestos operativos definidos para el evento.\nCada puesto tiene un número de voluntarios necesarios y un horario asignado."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:alertas.length>0?"var(--red)":"var(--violet)"}}>
            {puestosConStats.length}
          </div>
          <div className="kpi-sub">
            {alertas.length>0
              ? `${alertas.length} con cobertura insuficiente`
              : `${puestosConStats.filter(p=>p.cobertura>=100).length} al 100%`}
          </div>
        </div>
        <div className="kpi amber">
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>🚗 Con vehículo<Tooltip text={"Voluntarios confirmados que han indicado disponer de vehículo propio.\nÚtil para planificar rutas de reparto y acceso a puestos remotos."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"var(--amber)"}}>{stats.conCoche}</div>
          <div className="kpi-sub">{stats.total>0?Math.round(stats.conCoche/stats.total*100):0}% del total</div>
        </div>
      </div>

      {alertas.length > 0 && (
        <div style={{ background: "var(--red-dim)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "var(--radius)", padding: "0.85rem 1rem", marginBottom: "0.85rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>⚠️ Puestos con cobertura insuficiente</div>
          {alertas.map(p => (
            <div key={p.id}
              onClick={() => onEditarPuesto(p)}
              title="Click para abrir ficha del puesto"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.3rem 0.3rem", borderBottom: "1px solid rgba(248,113,113,0.1)", fontSize: "0.78rem", cursor: "pointer", borderRadius: 4, transition: "background .12s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--red-dim)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span>{p.nombre}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--red)", fontWeight: 700 }}>{p.totalAsignados}/{p.necesarios} ({p.cobertura}%)</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
        <div className="card">
          <div className="card-title">📍 Cobertura por puesto</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {puestosConStats.slice(0, 6).map(p => {
              const pct = Math.min(p.cobertura, 100);
              const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
              return (
                <div key={p.id} style={{cursor:"pointer"}}
                  onClick={() => onEditarPuesto(p)}
                  title="Click para abrir ficha del puesto">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text)" }}>{p.nombre}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color }}>{p.totalAsignados}/{p.necesarios}</span>
                  </div>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
            {puestosConStats.length > 6 && (
              <button className="btn btn-ghost" style={{ fontSize: "0.65rem", marginTop: "0.25rem" }} onClick={() => setTab("puestos")}>
                Ver todos los puestos →
              </button>
            )}
          </div>
        </div>

        <div className="card">
          {(() => {
            const sinPuesto = voluntarios
              .filter(v => !v.puestoId && v.estado !== "cancelado")
              .slice(0, 7);
            const pendConf = voluntarios
              .filter(v => v.estado === "pendiente")
              .sort((a,b) => (a.fechaRegistro||"").localeCompare(b.fechaRegistro||""))
              .slice(0, 7);
            // Mostrar sin puesto si hay, si no los pendientes de confirmar
            const lista = sinPuesto.length > 0 ? sinPuesto : pendConf;
            const titulo = sinPuesto.length > 0
              ? `📍 Sin puesto asignado (${sinPuesto.length})`
              : `⏳ Pendientes de confirmar (${pendConf.length})`;
            if (lista.length === 0) return (
              <div style={{ textAlign:"center", padding:"1.5rem 0",
                fontFamily:"var(--font-mono)", fontSize:"0.7rem", color:"var(--green)" }}>
                ✅ Todos asignados y confirmados
              </div>
            );
            return (
              <>
                <div className="card-title">{titulo}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.35rem" }}>
                  {lista.map(v => (
                    <div key={v.id}
                      onClick={() => onEditarVol(v)}
                      title="Click para abrir ficha"
                      style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                        padding:"0.3rem 0.25rem", borderBottom:"1px solid rgba(30,45,80,0.3)",
                        cursor:"pointer", borderRadius:4, transition:"background .12s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{ width:26, height:26, borderRadius:"50%",
                        background:"var(--surface2)", border:"1px solid var(--border)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"0.58rem", fontWeight:700, color:"var(--cyan)", flexShrink:0 }}>
                        {(v.nombre||"V").split(" ").map(n=>n[0]).slice(0,2).join("")}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"0.74rem", fontWeight:600,
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {v.nombre||"Sin nombre"}
                        </div>
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.56rem",
                          color:"var(--text-muted)" }}>{v.telefono||"—"}</div>
                      </div>
                      <span className={`badge badge-${v.estado==="confirmado"?"green":v.estado==="cancelado"?"red":"amber"}`}>
                        {v.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
}

// ─── TAB VOLUNTARIOS ──────────────────────────────────────────────────────────
function TabVoluntarios({ voluntarios, todosVols, puestos, busqueda, setBusqueda, filtroEstado, setFiltroEstado, filtroPuesto, setFiltroPuesto, onUpdate, onDelete, onNuevo, onEditar, onFicha }) {
  const [orden, setOrden] = useState("nombre"); // "nombre" | "puesto"

  const volsOrdenados = [...voluntarios].sort((a, b) => {
    if (orden === "nombre") return (a.nombre || "").localeCompare(b.nombre || "", "es");
    if (orden === "puesto") {
      const pa = puestos.find(p => p.id === a.puestoId)?.nombre || "zzz";
      const pb = puestos.find(p => p.id === b.puestoId)?.nombre || "zzz";
      return pa.localeCompare(pb, "es");
    }
    return 0;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">👥 Voluntarios</div>
          <div className="page-desc">{todosVols.length} registrados · {voluntarios.length} mostrados · click para abrir ficha</div>
        </div>
        <button className="btn btn-primary" onClick={onNuevo}>+ Nuevo voluntario</button>
      </div>

      {/* Filtros + ordenación */}
      <div className="card" style={{ marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          <input className="inp" placeholder="🔍 Buscar por nombre o teléfono..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)} style={{ maxWidth: 240 }} />
          <select className="inp" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ width: "auto" }}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="inp" value={filtroPuesto} onChange={e => setFiltroPuesto(e.target.value)} style={{ width: "auto" }}>
            <option value="todos">Todos los puestos</option>
            <option value="sin-asignar">Sin asignar</option>
            {puestos.map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
          </select>
          {/* Ordenación */}
          <div style={{ display: "flex", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden", marginLeft: "auto" }}>
            {[["nombre", "A–Z Nombre"], ["puesto", "Por puesto"]].map(([v, label]) => (
              <button key={v} onClick={() => setOrden(v)}
                style={{ padding: "0.28rem 0.65rem", border: "none", cursor: "pointer",
                  fontFamily: "var(--font-mono)", fontSize: "0.62rem", fontWeight: 700,
                  background: orden === v ? "rgba(34,211,238,0.15)" : "transparent",
                  color: orden === v ? "var(--cyan)" : "var(--text-muted)",
                  transition: "all .15s", whiteSpace: "nowrap" }}>
                {label}
              </button>
            ))}
          </div>
          {(busqueda || filtroEstado !== "todos" || filtroPuesto !== "todos") && (
            <button className="btn btn-ghost" onClick={() => { setBusqueda(""); setFiltroEstado("todos"); setFiltroPuesto("todos"); }}>✕ Limpiar</button>
          )}
        </div>
      </div>

      {/* VISTA UNIFICADA — cards adaptativas (funciona en móvil y desktop) */}
      {volsOrdenados.length === 0 && (
        <div style={{ textAlign:"center", color:"var(--text-muted)", padding:"2rem",
          fontFamily:"var(--font-mono)", fontSize:"0.75rem",
          background:"var(--surface)", border:"1px solid var(--border)",
          borderRadius:"var(--radius-sm)" }}>
          No hay voluntarios con estos filtros
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:"0.45rem" }}>
        {volsOrdenados.map(v => {
          const puesto = puestos.find(p => p.id === v.puestoId);
          return (
            <div key={v.id}
              onClick={() => onFicha(v)}
              style={{ background:"var(--surface)", border:"1px solid var(--border)",
                borderRadius:"var(--radius-sm)", padding:"0.65rem 0.85rem",
                cursor:"pointer", transition:"border-color .15s",
                borderLeft:`3px solid ${v.estado==="confirmado"?"var(--green)":v.estado==="cancelado"?"var(--red)":"var(--amber)"}` }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border-light)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.65rem" }}>
                {/* Avatar */}
                <div style={{ width:34, height:34, borderRadius:"50%",
                  background:"var(--surface2)", border:"1px solid var(--border)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:"0.62rem", fontWeight:700, color:"var(--cyan)", flexShrink:0 }}>
                  {(v.nombre||"V").split(" ").map(n=>n[0]).slice(0,2).join("")}
                </div>
                {/* Nombre + meta */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.45rem",
                    flexWrap:"wrap", marginBottom:"0.2rem" }}>
                    <span style={{ fontWeight:700, fontSize:"0.84rem",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {v.nombre||"Sin nombre"}
                    </span>
                    <span className={`badge ${v.rol==="responsable"?"badge-violet":"badge-cyan"}`}
                      style={{ fontSize:"0.5rem" }}>
                      {v.rol||"apoyo"}
                    </span>
                    {v.coche && <span style={{ fontSize:"0.65rem" }} title="Tiene vehículo">🚗</span>}
                  </div>
                  <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem",
                      color:"var(--text-muted)" }}>{v.telefono||"—"}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem",
                      color:puesto?"var(--text-muted)":"var(--text-dim)" }}>
                      📍 {puesto?puesto.nombre:"Sin asignar"}
                    </span>
                    {v.talla && (
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem",
                        color:"var(--cyan)" }}>👕 {v.talla}</span>
                    )}
                  </div>
                </div>
                {/* Estado inline — stopPropagation para no abrir ficha */}
                <div onClick={e=>e.stopPropagation()} style={{ display:"flex",
                  alignItems:"center", gap:"0.3rem", flexShrink:0 }}>
                  <select className="inp inp-sm" value={v.estado}
                    onChange={e=>onUpdate(v.id,{estado:e.target.value})}
                    style={{ width:"auto", color:estadoColor(v.estado),
                      background:estadoBg(v.estado), fontSize:"0.65rem" }}>
                    {Object.entries(ESTADOS).map(([k,lbl])=><option key={k} value={k}>{lbl}</option>)}
                  </select>
                  <button className="btn btn-ghost"
                    style={{ padding:"0.22rem 0.38rem", fontSize:"0.65rem" }}
                    onClick={()=>onEditar(v)}>✏️</button>
                  <button className="btn btn-red"
                    style={{ padding:"0.22rem 0.38rem", fontSize:"0.65rem" }}
                    onClick={()=>onDelete(v.id)}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── TAB PUESTOS ──────────────────────────────────────────────────────────────
function TabPuestos({ puestosConStats, voluntarios, locs, matPorLoc = {}, onUpdatePuesto, onDeletePuesto, onNuevoPuesto, onEditPuesto, onEditarVol, onFichaPuesto, onFichaVol }) {
  const [ordenAlfa, setOrdenAlfa] = useState(false);
  const puestosOrdenados = ordenAlfa
    ? [...puestosConStats].sort((a,b) => (a.nombre||"").localeCompare(b.nombre||"","es"))
    : puestosConStats;
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">📍 Puestos</div>
          <div className="page-desc">{puestosConStats.length} puestos definidos</div>
        </div>
        <div style={{display:"flex",gap:".4rem",alignItems:"center"}}>
          <button className={`btn btn-sm ${ordenAlfa?"btn-cyan":"btn-ghost"}`} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={onNuevoPuesto}>+ Nuevo puesto</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {puestosOrdenados.map(p => {
          const pct = Math.min(p.cobertura, 100);
          const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
          return (
            <div key={p.id} className="card" style={{ padding: "1rem", cursor: "pointer" }}
              onClick={() => onFichaPuesto(p)}
              title="Click para ver ficha del puesto">
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{p.nombre}</span>
                    <span className="badge badge-cyan">{p.tipo}</span>
                    {p.localizacionId && (
                      <>
                        <span className="badge badge-gold" title="Vinculado a localización maestra">📍 Vinculado</span>
                        {(() => {
                          const loc = locs.find(l => l.id === p.localizacionId);
                          const items = loc ? (matPorLoc[loc.nombre] || []) : [];
                          if (!items.length) return null;
                          return (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: ".58rem",
                              color: "var(--cyan)", background: "var(--cyan-dim)",
                              padding: ".1rem .4rem", borderRadius: 4, whiteSpace: "nowrap" }}>
                              📦 {items.length} mat.
                            </span>
                          );
                        })()}
                      </>
                    )}
                    {p.distancias.map(d => (
                      <span key={d} style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", padding: "0.1rem 0.35rem", borderRadius: 3, background: "rgba(34,211,238,0.08)", color: DIST_COLORS[d] || "var(--text-muted)", border: `1px solid ${DIST_COLORS[d] || "var(--border)"}33` }}>{d}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "1.25rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                    <span className="mono text-xs text-muted">🕐 {p.horaInicio} – {p.horaFin}</span>
                    <span className="mono text-xs" style={{ color }}>👤 {p.totalAsignados}/{p.necesarios} voluntarios</span>
                    <span className="mono text-xs" style={{ color: "var(--green)" }}>✓ {p.confirmados} confirmados</span>
                  </div>
                  <div className="prog-bar" style={{ marginBottom: "0.4rem" }}>
                    <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  {p.notas && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic" }}>{p.notas}</div>}
                  {p.voluntariosAsignados.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.5rem" }}>
                      {p.voluntariosAsignados.map(v => (
                        <span key={v.id}
                          onClick={e => { e.stopPropagation(); onFichaVol && onFichaVol(v); }}
                          style={{ fontSize: "0.65rem", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: "0.15rem 0.45rem", color: v.estado === "confirmado" ? "var(--green)" : "var(--text-muted)" }}>
                          {(v.nombre || "V").split(" ")[0]} {(v.nombre || "").split(" ")[1]?.[0] || ""}.
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost" style={{ padding: "0.28rem 0.45rem", fontSize: "0.68rem" }} onClick={() => onEditPuesto(p)}>✏️</button>
                  <button className="btn btn-red" style={{ padding: "0.28rem 0.45rem", fontSize: "0.68rem" }} onClick={() => onDeletePuesto(p.id)}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── TAB TALLAS ───────────────────────────────────────────────────────────────
function TabTallas({ stats, voluntarios }) {
  const total = Object.values(stats.tallasCount).reduce((s, v) => s + v, 0);
  const maxVal = Math.max(...Object.values(stats.tallasCount), 1);

  // Exportar CSV nombre + talla
  const exportCSV = () => {
    const activos = voluntarios.filter(v => v.estado !== "cancelado" && v.talla);
    const rows = [
      ["Nombre", "Talla", "Puesto", "Estado"],
      ...activos.map(v => [
        `"${v.nombre || ""}"`,
        v.talla || "",
        `"${v.puestoId || ""}"`,
        v.estado || "",
      ])
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "tallas_voluntarios_TEG2026.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exportar resumen de tallas
  const exportResumenCSV = () => {
    const rows = [
      ["Talla", "Cantidad"],
      ...TALLAS.filter(t => stats.tallasCount[t] > 0)
               .map(t => [t, stats.tallasCount[t]])
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "resumen_tallas_TEG2026.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">👕 Tallas de Camiseta</div>
          <div className="page-desc">{total} camisetas necesarias (voluntarios activos)</div>
        </div>
        <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
          <button className="btn btn-ghost btn-sm" onClick={exportResumenCSV}
            title="Exportar resumen de tallas">
            📥 Resumen CSV
          </button>
          <button className="btn btn-cyan btn-sm" onClick={exportCSV}
            title="Exportar listado completo nombre + talla">
            📥 Lista CSV
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Distribución por talla</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {TALLAS.map(t => {
            const n = stats.tallasCount[t] || 0;
            const pct = Math.round((n / Math.max(total, 1)) * 100);
            const barPct = Math.round((n / maxVal) * 100);
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 700, width: 36, textAlign: "right", color: n > 0 ? "var(--cyan)" : "var(--text-dim)" }}>{t}</span>
                <div style={{ flex: 1 }}>
                  <div className="prog-bar" style={{ height: 8 }}>
                    <div className="prog-fill" style={{ width: `${barPct}%`, background: n > 0 ? "var(--cyan)" : "var(--surface3)" }} />
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", width: 40, textAlign: "right", color: n > 0 ? "var(--text)" : "var(--text-dim)" }}>{n}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", width: 35, color: "var(--text-muted)" }}>{n > 0 ? `${pct}%` : ""}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--surface2)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)" }}>TOTAL CAMISETAS</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", fontWeight: 700, color: "var(--cyan)" }}>{total}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Listado para pedido</div>
        <div className="tallas-grid">
          {TALLAS.filter(t => stats.tallasCount[t] > 0).map(t => (
            <div key={t} className="talla-cell">
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 800, color: "var(--cyan)" }}>{stats.tallasCount[t]}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>{t}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── TAB DÍA D ────────────────────────────────────────────────────────────────
function TabDiaD({ puestosConStats, voluntarios, onUpdateVol }) {
  const [puestoSeleccionado, setPuestoSeleccionado] = useState("todos");

  const volsFiltrados = puestoSeleccionado === "todos"
    ? voluntarios.filter(v => v.estado === "confirmado")
    : voluntarios.filter(v => String(v.puestoId) === puestoSeleccionado && v.estado === "confirmado");

  const presentes = voluntarios.filter(v => v.presente).length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">🏁 Día de Carrera</div>
          <div className="page-desc">Checklist de asistencia — 29 agosto 2026</div>
        </div>
        <div className="mono text-xs" style={{ color: "var(--green)", background: "var(--green-dim)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 6, padding: "0.4rem 0.75rem" }}>
          ✓ {presentes} / {voluntarios.filter(v => v.estado === "confirmado").length} presentes
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button className={cls("btn", puestoSeleccionado === "todos" ? "btn-cyan" : "btn-ghost")} onClick={() => setPuestoSeleccionado("todos")}>
          Todos los confirmados
        </button>
        {puestosConStats.map(p => (
          <button key={p.id} className={cls("btn", puestoSeleccionado === String(p.id) ? "btn-cyan" : "btn-ghost")}
            style={{ fontSize: "0.68rem" }} onClick={() => setPuestoSeleccionado(String(p.id))}>
            {p.nombre}
          </button>
        ))}
      </div>

      <div className="card">
        {volsFiltrados.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
            No hay voluntarios confirmados en este puesto
          </div>
        )}
        {volsFiltrados.map(v => {
          const puesto = puestosConStats.find(p => p.id === v.puestoId);
          return (
            <div key={v.id} className={cls("checklist-row", v.presente ? "presente" : v.presente === false ? "ausente" : "")}>
              <button onClick={() => onUpdateVol(v.id, { presente: !v.presente })}
                style={{ width: 24, height: 24, borderRadius: 5, border: `2px solid ${v.presente ? "var(--green)" : "var(--border)"}`, background: v.presente ? "var(--green)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                {v.presente && <span style={{ color: "#000", fontSize: "0.75rem", fontWeight: 700 }}>✓</span>}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: v.presente ? "var(--green)" : "var(--text)" }}>{v.nombre}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>
                  {puesto?.nombre || "Sin puesto"} · {v.telefono}
                </div>
              </div>
              <span className="badge badge-cyan">{v.talla}</span>
              {v.coche && <span style={{ fontSize: "0.75rem" }} title="Tiene coche">🚗</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── FICHA VOLUNTARIO ─────────────────────────────────────────────────────────
function FichaVoluntario({ voluntario: v, puestos, onClose, onEditar, onEliminar, onUpdate }) {
  const puesto = puestos.find(p => p.id === v.puestoId);
  const estadoColor = v.estado === "confirmado" ? "var(--green)" : v.estado === "cancelado" ? "var(--red)" : "var(--amber)";
  const iniciales = (n) => (n||"V").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div style={{ borderTop: "3px solid var(--cyan)", borderRadius: "16px 16px 0 0" }}>
          <div className="modal-header">
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:"var(--cyan-dim)",
                border:"2px solid rgba(34,211,238,0.3)", display:"flex", alignItems:"center",
                justifyContent:"center", fontWeight:800, fontSize:"1rem", color:"var(--cyan)", flexShrink:0 }}>
                {iniciales(v.nombre)}
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:"1rem" }}>{v.nombre || "Sin nombre"}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem", color:"var(--text-muted)", marginTop:"0.1rem" }}>
                  <span style={{ color:estadoColor, fontWeight:700 }}>{v.estado}</span>
                  {v.rol && <> · {v.rol}</>}
                </div>
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding:"0.2rem 0.5rem", fontSize:"1rem" }} onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          {[
            ["📞 Teléfono",   v.telefono],
            ["✉️ Email",      v.email],
            ["👕 Talla",      v.talla],
            ["📍 Puesto",     puesto?.nombre || "Sin asignar"],
            ["🗓 Registrado", v.fechaRegistro],
            ["🚗 Vehículo",   v.coche ? "Sí, tiene coche" : "No"],
          ].filter(([,val]) => val).map(([label, val]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between",
              padding:"0.4rem 0", borderBottom:"1px solid rgba(30,45,80,0.3)" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem", color:"var(--text-muted)" }}>{label}</span>
              <span style={{ fontSize:"0.78rem", fontWeight:600 }}>{val}</span>
            </div>
          ))}
          {v.notas && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--border)", marginTop:"0.25rem" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.55rem", color:"var(--text-muted)",
                marginBottom:"0.25rem", textTransform:"uppercase" }}>Notas</div>
              <div style={{ fontSize:"0.78rem", lineHeight:1.5 }}>{v.notas}</div>
            </div>
          )}
        </div>
        {/* Acciones rápidas de estado */}
        {onUpdate && v.estado !== "confirmado" && v.estado !== "cancelado" && (
          <div style={{ padding:"0.6rem 1.25rem", borderTop:"1px solid var(--border)",
            display:"flex", gap:"0.5rem" }}>
            <button
              className="btn btn-green"
              style={{ flex:1, fontFamily:"var(--font-mono)", fontSize:"0.72rem" }}
              onClick={() => onUpdate({ estado:"confirmado" })}>
              ✓ Confirmar voluntario
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontFamily:"var(--font-mono)", fontSize:"0.72rem",
                color:"var(--red)", border:"1px solid rgba(248,113,113,.3)" }}
              onClick={() => onUpdate({ estado:"cancelado" })}>
              ✕ Cancelar
            </button>
          </div>
        )}
        {onUpdate && v.estado === "confirmado" && (
          <div style={{ padding:"0.5rem 1.25rem", borderTop:"1px solid var(--border)" }}>
            <button
              className="btn btn-ghost"
              style={{ width:"100%", fontFamily:"var(--font-mono)", fontSize:"0.68rem",
                color:"var(--text-muted)" }}
              onClick={() => onUpdate({ estado:"pendiente" })}>
              ↩ Mover a pendiente
            </button>
          </div>
        )}
        <div className="modal-footer" style={{ justifyContent:"space-between" }}>
          <button className="btn btn-red" onClick={onEliminar}>🗑 Eliminar</button>
          <div style={{ display:"flex", gap:"0.4rem" }}>
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            <button className="btn btn-cyan" onClick={onEditar}>✏️ Editar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FICHA PUESTO ─────────────────────────────────────────────────────────────
function FichaPuesto({ puesto: p, voluntarios, onClose, onEditar, onEliminar }) {
  const asignados = voluntarios.filter(v => v.puestoId === p.id && v.estado !== "cancelado");
  const confirmados = asignados.filter(v => v.estado === "confirmado").length;
  const cobertura = p.necesarios > 0 ? Math.round(asignados.length / p.necesarios * 100) : 0;
  const color = cobertura >= 100 ? "var(--green)" : cobertura >= 50 ? "var(--amber)" : "var(--red)";

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div style={{ borderTop: "3px solid var(--violet)", borderRadius: "16px 16px 0 0" }}>
          <div className="modal-header">
            <div>
              <div style={{ fontWeight:800, fontSize:"1rem" }}>{p.nombre}</div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem", color:"var(--text-muted)", marginTop:"0.1rem" }}>
                {p.tipo} · {p.horaInicio} – {p.horaFin}
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding:"0.2rem 0.5rem", fontSize:"1rem" }} onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          {/* Barra cobertura */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.35rem" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem", color:"var(--text-muted)" }}>Cobertura</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.72rem", fontWeight:700, color }}>
                {asignados.length}/{p.necesarios} ({cobertura}%)
              </span>
            </div>
            <div style={{ height:6, background:"var(--surface3)", borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.min(cobertura,100)}%`, background:color, borderRadius:3, transition:"width .4s" }}/>
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.58rem", color:"var(--text-muted)", marginTop:"0.25rem" }}>
              {confirmados} confirmados · {asignados.length - confirmados} pendientes
            </div>
          </div>
          {/* Datos */}
          {[
            ["📍 Tipo",       p.tipo],
            ["🕐 Horario",    `${p.horaInicio} – ${p.horaFin}`],
            ["👥 Necesarios", `${p.necesarios} voluntarios`],
          ].map(([label, val]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between",
              padding:"0.4rem 0", borderBottom:"1px solid rgba(30,45,80,0.3)" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem", color:"var(--text-muted)" }}>{label}</span>
              <span style={{ fontSize:"0.78rem", fontWeight:600 }}>{val}</span>
            </div>
          ))}
          {p.tiempoLimite && (
            <div style={{ display:"flex", justifyContent:"space-between", padding:"0.5rem 0.75rem",
              margin:"0.3rem 0", borderRadius:8,
              background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.25)" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem", color:"var(--amber)", fontWeight:700 }}>
                ⏱ Tiempo límite paso corredor
              </span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.88rem", fontWeight:800, color:"var(--amber)" }}>
                {p.tiempoLimite}
              </span>
            </div>
          )}
          {/* Voluntarios asignados */}
          {asignados.length > 0 && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.55rem", color:"var(--text-muted)",
                marginBottom:"0.4rem", textTransform:"uppercase" }}>Voluntarios asignados</div>
              {asignados.map(v => (
                <div key={v.id} style={{ display:"flex", justifyContent:"space-between",
                  padding:"0.25rem 0", fontSize:"0.75rem" }}>
                  <span style={{ fontWeight:600 }}>{v.nombre}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem",
                    color: v.estado==="confirmado"?"var(--green)":"var(--amber)" }}>{v.estado}</span>
                </div>
              ))}
            </div>
          )}
          {p.notas && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--border)" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.55rem", color:"var(--text-muted)",
                marginBottom:"0.25rem", textTransform:"uppercase" }}>Notas</div>
              <div style={{ fontSize:"0.78rem", lineHeight:1.5 }}>{p.notas}</div>
            </div>
          )}
        </div>
        {/* Acciones rápidas de estado */}
        {onUpdate && v.estado !== "confirmado" && v.estado !== "cancelado" && (
          <div style={{ padding:"0.6rem 1.25rem", borderTop:"1px solid var(--border)",
            display:"flex", gap:"0.5rem" }}>
            <button
              className="btn btn-green"
              style={{ flex:1, fontFamily:"var(--font-mono)", fontSize:"0.72rem" }}
              onClick={() => onUpdate({ estado:"confirmado" })}>
              ✓ Confirmar voluntario
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontFamily:"var(--font-mono)", fontSize:"0.72rem",
                color:"var(--red)", border:"1px solid rgba(248,113,113,.3)" }}
              onClick={() => onUpdate({ estado:"cancelado" })}>
              ✕ Cancelar
            </button>
          </div>
        )}
        {onUpdate && v.estado === "confirmado" && (
          <div style={{ padding:"0.5rem 1.25rem", borderTop:"1px solid var(--border)" }}>
            <button
              className="btn btn-ghost"
              style={{ width:"100%", fontFamily:"var(--font-mono)", fontSize:"0.68rem",
                color:"var(--text-muted)" }}
              onClick={() => onUpdate({ estado:"pendiente" })}>
              ↩ Mover a pendiente
            </button>
          </div>
        )}
        <div className="modal-footer" style={{ justifyContent:"space-between" }}>
          <button className="btn btn-red" onClick={onEliminar}>🗑 Eliminar</button>
          <div style={{ display:"flex", gap:"0.4rem" }}>
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            <button className="btn btn-cyan" onClick={onEditar}>✏️ Editar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL VOLUNTARIO ─────────────────────────────────────────────────────────
function ModalVoluntario({ voluntario, puestos, onSave, onClose }) {
  // Split nombre into nombre/apellidos for display if needed
  const partes = (voluntario && voluntario.nombre) ? voluntario.nombre.split(" ") : [];
  const nombreInicial = partes[0] || "";
  const apellidosInicial = partes.slice(1).join(" ") || "";

  const [form, setForm] = useState({
    nombre: voluntario ? voluntario.nombre : "",
    telefono: voluntario?.telefono || "",
    email: voluntario?.email || "",
    talla: voluntario?.talla || "M",
    puestoId: voluntario?.puestoId ?? null,
    rol: voluntario?.rol || "apoyo",
    estado: voluntario?.estado || "pendiente",
    coche: voluntario?.coche ?? false,
    notas: voluntario?.notas || "",
    fechaRegistro: voluntario?.fechaRegistro || new Date().toISOString().split("T")[0],
  });
  const [errores, setErrores] = useState({});
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (!form.telefono.trim()) e.telefono = "Requerido";
    if (!form.talla) e.talla = "Requerido";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validar()) return;
    onSave({ ...form, puestoId: form.puestoId ? parseInt(form.puestoId) : null });
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{voluntario ? "✏️ Editar voluntario" : "➕ Nuevo voluntario"}</span>
          <button className="btn btn-ghost" style={{ padding: "0.2rem 0.5rem" }} onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div>
            <label className="field-label" style={{ color: errores.nombre ? "var(--red)" : undefined }}>Nombre completo *</label>
            <input className="inp" value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Nombre y apellidos" />
            {errores.nombre && <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--red)", marginTop: "0.2rem" }}>⚠ {errores.nombre}</div>}
          </div>
          <div className="field-row">
            <div>
              <label className="field-label" style={{ color: errores.telefono ? "var(--red)" : undefined }}>Teléfono *</label>
              <input className="inp" value={form.telefono} onChange={e => upd("telefono", e.target.value)} placeholder="612345678" inputMode="tel" />
              {errores.telefono && <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--red)", marginTop: "0.2rem" }}>⚠ {errores.telefono}</div>}
            </div>
            <div>
              <label className="field-label">Email</label>
              <input className="inp" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="correo@email.com" />
            </div>
          </div>

          <div>
            <label className="field-label" style={{ color: errores.talla ? "var(--red)" : undefined }}>Talla camiseta *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.3rem" }}>
              {TALLAS.map(t => (
                <button key={t} onClick={() => upd("talla", t)}
                  style={{ padding: "0.35rem 0.6rem", borderRadius: 6, border: `1px solid ${form.talla === t ? "var(--cyan)" : "var(--border)"}`, background: form.talla === t ? "var(--cyan-dim)" : "var(--surface2)", color: form.talla === t ? "var(--cyan)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer", transition: "all 0.12s", transform: form.talla === t ? "scale(1.05)" : "scale(1)" }}>
                  {t}
                </button>
              ))}
            </div>
            {errores.talla && <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--red)", marginTop: "0.2rem" }}>⚠ {errores.talla}</div>}
          </div>

          <div className="field-row">
            <div>
              <label className="field-label">Puesto asignado</label>
              <select className="inp" value={form.puestoId ?? ""} onChange={e => upd("puestoId", e.target.value || null)}>
                <option value="">Sin asignar</option>
                {puestos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Rol</label>
              <select className="inp" value={form.rol} onChange={e => upd("rol", e.target.value)}>
                <option value="apoyo">Apoyo</option>
                <option value="responsable">Responsable</option>
              </select>
            </div>
          </div>

          <div className="field-row">
            <div>
              <label className="field-label">Estado</label>
              <select className="inp" value={form.estado} onChange={e => upd("estado", e.target.value)}
                style={{ color: estadoColor(form.estado), background: estadoBg(form.estado) }}>
                {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Fecha de registro</label>
              <input className="inp" type="date" value={form.fechaRegistro} onChange={e => upd("fechaRegistro", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.65rem 0.85rem" }}>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>Vehículo propio</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--text-muted)" }}>Facilita traslado a puestos</div>
            </div>
            <button className="toggle-pill" style={{ background: form.coche ? "var(--green)" : "var(--surface3)" }} onClick={() => upd("coche", !form.coche)}>
              <span className="toggle-pill-dot" style={{ left: form.coche ? 23 : 3 }} />
            </button>
          </div>

          <div>
            <label className="field-label" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>📝 Notas / Observaciones</span>
              {form.notas && <span style={{fontFamily:"var(--font-mono)",fontSize:"0.55rem",color:"var(--cyan)",fontWeight:400}}>{form.notas.length} car.</span>}
            </label>
            <textarea className="inp" rows={3} value={form.notas} onChange={e => upd("notas", e.target.value)}
              placeholder="Experiencia previa, idiomas, titulaciones especiales, restricciones, observaciones del organizador…"
              style={{ resize: "vertical", fontFamily: "var(--font-display)" }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-cyan" onClick={handleSave}>
            {voluntario ? "💾 Guardar cambios" : "➕ Añadir voluntario"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── MODAL PUESTO ─────────────────────────────────────────────────────────────
function ModalPuesto({ puesto, locs, onSave, onClose }) {
  const [form, setForm] = useState(puesto || {
    nombre: "", tipo: "Avituallamiento", distancias: ["Todas"],
    horaInicio: "08:00", horaFin: "15:00", necesarios: 3, responsableId: null, tiempoLimite: "", notas: ""
  });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleDist = (d) => setForm(p => ({
    ...p, distancias: p.distancias.includes(d) ? p.distancias.filter(x => x !== d) : [...p.distancias, d]
  }));

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{puesto ? "✏️ Editar puesto" : "📍 Nuevo puesto"}</span>
          <button className="btn btn-ghost" style={{ padding: "0.2rem 0.5rem" }} onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: "0.5rem" }}>
            <label className="field-label">📍 Localización Maestra (opcional)</label>
            <select className="inp" value={form.localizacionId || ""} 
              onChange={e => {
                const locId = e.target.value ? parseInt(e.target.value) : null;
                const loc = locs.find(l => l.id === locId);
                const newData = { localizacionId: locId };
                if (loc && !form.nombre) newData.nombre = loc.nombre;
                if (loc) newData.tipo = loc.tipo;
                setForm(p => ({ ...p, ...newData }));
              }}>
              <option value="">-- Sin vincular --</option>
              {locs.map(l => <option key={l.id} value={l.id}>{l.nombre} ({l.tipo})</option>)}
            </select>
            <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
              Vincular a una localización maestra sincroniza el tipo y facilita la logística.
            </div>
          </div>
          <div><label className="field-label">Nombre del puesto *</label><input className="inp" value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Ej: Avituallamiento KM 7" /></div>
          <div className="field-row">
            <div>
              <label className="field-label">Tipo</label>
              <select className="inp" value={form.tipo} onChange={e => upd("tipo", e.target.value)}>
                {TIPOS_PUESTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Voluntarios necesarios</label>
              <input className="inp" type="number" min={1} value={form.necesarios} onChange={e => upd("necesarios", parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <div className="field-row">
            <div><label className="field-label">Hora de inicio (voluntario)</label><input className="inp" type="time" value={form.horaInicio} onChange={e => upd("horaInicio", e.target.value)} /></div>
            <div><label className="field-label">Hora de fin (voluntario)</label><input className="inp" type="time" value={form.horaFin} onChange={e => upd("horaFin", e.target.value)} /></div>
          </div>
          {form.tipo === "Control" && (
            <div style={{ background: "var(--amber-dim)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 8, padding: "0.65rem 0.85rem" }}>
              <label className="field-label" style={{ color: "var(--amber)" }}>⏱ Tiempo límite de paso (corredor)</label>
              <input className="inp" type="time" value={form.tiempoLimite || ""} onChange={e => upd("tiempoLimite", e.target.value)}
                placeholder="Hora máxima de paso" />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                Corredores que lleguen después de esta hora deben ser retirados de la competición.
              </div>
            </div>
          )}
          <div>
            <label className="field-label">Distancias</label>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {DISTANCIAS_PUESTO.map(d => (
                <button key={d} onClick={() => toggleDist(d)}
                  style={{ padding: "0.3rem 0.65rem", borderRadius: 6, border: `1px solid ${form.distancias.includes(d) ? DIST_COLORS[d] : "var(--border)"}`, background: form.distancias.includes(d) ? `${DIST_COLORS[d]}18` : "var(--surface2)", color: form.distancias.includes(d) ? DIST_COLORS[d] : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div><label className="field-label">Notas / Instrucciones</label>
            <textarea className="inp" rows={2} value={form.notas} onChange={e => upd("notas", e.target.value)} placeholder="Material necesario, instrucciones específicas..." style={{ resize: "vertical" }} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-cyan" onClick={() => { if (form.nombre) onSave(form); }}>
            {puesto ? "Guardar cambios" : "Crear puesto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL CONFIRMAR ──────────────────────────────────────────────────────────
function ModalConfirm({ mensaje, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-body" style={{ paddingTop: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.5rem" }}>Confirmar acción</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>{mensaje}</div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-red" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}
