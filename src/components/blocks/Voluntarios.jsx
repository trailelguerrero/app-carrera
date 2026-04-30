import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { exportarVoluntarios } from "@/lib/exportUtils";
import { toast } from "@/lib/toast";
import { genIdNum, scrollMainToTop } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/lib/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { getEventDate } from "@/lib/eventUtils";
import { LOCS_DEFAULT, LOCS_KEY } from "@/constants/localizaciones";
import { useData } from "@/lib/dataService";

import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";
// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TALLAS = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"];
const ESTADOS = { pendiente: "Pendiente", confirmado: "Confirmado", cancelado: "Cancelado", ausente: "Ausente" };
const TIPOS_PUESTO = ["Salida/Meta","Avituallamiento","Control","Seguridad","Señalización","Parking","Organización","Primeros Auxilios"];
const DISTANCIAS_PUESTO = ["TG7","TG13","TG25","Todas"];
const DIST_COLORS = { TG7: "#22d3ee", TG13: "#a78bfa", TG25: "#34d399", Todas: "#fbbf24" };
const LS_KEY = "teg_voluntarios_v1";

// ─── IMÁGENES CAMISETA (base64 placeholders — reemplazar con URLs reales) ──────
// Para producción: sustituir por URLs de tus imágenes reales
const SHIRT_PLACEHOLDER_FRONT = "data:image/svg+xml," + encodeURIComponent(`
<svg width="400" height="450" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="450" fill="var(--bg)"/>
  <text x="200" y="200" text-anchor="middle" fill="#22d3ee" font-size="18" font-family="monospace">CAMISETA TRAIL</text>
  <text x="200" y="230" text-anchor="middle" fill="#22d3ee" font-size="14" font-family="monospace">EL GUERRERO 2026</text>
  <text x="200" y="270" text-anchor="middle" fill="#5a6a8a" font-size="12" font-family="monospace">PARTE DELANTERA</text>
  <text x="200" y="380" text-anchor="middle" fill="#1e2d50" font-size="11" font-family="monospace">Añade tu imagen en el código</text>
</svg>`);
const SHIRT_PLACEHOLDER_BACK = "data:image/svg+xml," + encodeURIComponent(`
<svg width="400" height="450" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="450" fill="var(--bg)"/>
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
  { id: 1, nombre: "María García López", telefono: "612345678", email: "maria@trailelguerrero.es", talla: "S", puestoId: 1, rol: "responsable", estado: "confirmado", coche: true, notas: "Experiencia 3 ediciones anteriores", fechaRegistro: "2026-02-15" },
  { id: 2, nombre: "Carlos Martínez", telefono: "623456789", email: "carlos@trailelguerrero.es", talla: "L", puestoId: 2, rol: "apoyo", estado: "confirmado", coche: false, notas: "", fechaRegistro: "2026-02-20" },
  { id: 3, nombre: "Ana Rodríguez", telefono: "634567890", email: "ana@trailelguerrero.es", talla: "M", puestoId: 3, rol: "responsable", estado: "pendiente", coche: true, notas: "Habla inglés", fechaRegistro: "2026-03-01" },
];

// useData maneja la persistencia automáticamente

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function estadoColor(e) {
  return e === "confirmado" ? "var(--green)" : e === "cancelado" ? "var(--red)" : e === "ausente" ? "var(--orange)" : "var(--amber)";
}
function estadoBg(e) {
  return e === "confirmado" ? "var(--green-dim)" : e === "cancelado" ? "var(--red-dim)" : e === "ausente" ? "var(--orange-dim)" : "var(--amber-dim)";
}

// ─── PUBLIC REGISTRATION FORM ──────────────────────────────────────────────────
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
      nombre: `${form.nombre.trim()} ${form.apellidos.trim()}`,
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
            onClick={() => { try { window.close(); } catch(e) {} window.location.href = "/"; }}
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


function FormField({ label, error, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-base)", fontWeight: 600, color: error ? "var(--red)" : "var(--text)" }}>{label}</label>
      {hint && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "-0.2rem" }}>{hint}</div>}
      {children}
      {error && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)" }}>⚠ {error}</div>}
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
  const voluntarios = useMemo(() => {
    const raw = Array.isArray(rawVoluntarios) ? rawVoluntarios : [];
    // Migrar campo legado contactoEmergencia → telefonoEmergencia
    return raw.map(v => {
      if (v.contactoEmergencia && !v.telefonoEmergencia) {
        return { ...v, telefonoEmergencia: v.contactoEmergencia };
      }
      return v;
    });
  }, [rawVoluntarios]);
  const [locs] = useData(LOCS_KEY, LOCS_DEFAULT);
  // Material asignado a localizaciones (solo lectura, para mostrar en ficha de puesto)
  const [rawMat]  = useData("teg_logistica_v1_mat",  []);
  const [rawAsig] = useData("teg_logistica_v1_asig", []);
  const [rawRutas] = useData("teg_logistica_v1_rut", []);
  const rutas = Array.isArray(rawRutas) ? rawRutas : [];
  const matPorLoc = useMemo(() => {
    const mat   = Array.isArray(rawMat)  ? rawMat  : [];
    const asigs = Array.isArray(rawAsig) ? rawAsig : [];
    const lcsArr = Array.isArray(locs)   ? locs    : [];
    // Construir dos mapas: por localizacionId (ID robusto) y por nombre (fallback)
    const mapById = {};   // localizacionId → [{nombre, cantidad, unidad}]
    const mapByName = {}; // locNombre      → [{nombre, cantidad, unidad}]
    asigs.forEach(a => {
      const item = mat.find(m => m.id === a.materialId);
      if (!item) return;
      const entry = { nombre: item.nombre, cantidad: a.cantidad, unidad: item.unidad || "ud" };
      if (a.localizacionId) {
        if (!mapById[a.localizacionId]) mapById[a.localizacionId] = [];
        mapById[a.localizacionId].push(entry);
      }
      if (a.puesto) {
        if (!mapByName[a.puesto]) mapByName[a.puesto] = [];
        mapByName[a.puesto].push(entry);
      }
    });
    // Devolver mapa por nombre para compatibilidad con el código existente,
    // enriquecido con los datos por ID (si el puesto tiene localizacionId)
    const map = { ...mapByName };
    lcsArr.forEach(loc => {
      if (mapById[loc.id]) {
        // Fusionar sin duplicados por nombre
        const existentes = map[loc.nombre] || [];
        const nuevos = mapById[loc.id].filter(n => !existentes.some(e => e.nombre === n.nombre));
        map[loc.nombre] = [...existentes, ...nuevos];
      }
    });
    return map;
  }, [rawMat, rawAsig, locs]);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [imgFront, setImgFront] = useData(LS_KEY + "_imgFront", SHIRT_PLACEHOLDER_FRONT);
  const [imgBack, setImgBack] = useData(LS_KEY + "_imgBack", SHIRT_PLACEHOLDER_BACK);
  const [imgGuiaTallas, setImgGuiaTallas] = useData(LS_KEY + "_imgGuiaTallas", null);
  const [opcionPuesto, setOpcionPuesto] = useData(LS_KEY + "_opcionPuesto", true);
  const [opcionVehiculo, setOpcionVehiculo] = useData(LS_KEY + "_opcionVehiculo", true);
  const [opcionEmail, setOpcionEmail] = useData(LS_KEY + "_opcionEmail", false);
  const [opcionEmergencia, setOpcionEmergencia] = useData(LS_KEY + "_opcionEmergencia", false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroPuesto, setFiltroPuesto] = useState("todos");
  const [modalVol, setModalVol] = useState(null); // null | "nuevo" | voluntario
  const [modalPuesto, setModalPuesto] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeletePuesto, setConfirmDeletePuesto] = useState(null);
  const [urlCopiada, setUrlCopiada] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareMenuPos, setShareMenuPos] = useState({ top:0, left:0, right:'auto' });
  const shareMenuRef = useRef(null);
  const shareBtnRef  = useRef(null);

  // Cerrar dropdown al hacer click fuera — setTimeout evita race condition
  useEffect(() => {
    if (!shareMenuOpen) return;
    const handler = (e) => {
      if (shareMenuRef.current && shareMenuRef.current.contains(e.target)) return;
      if (shareBtnRef.current && shareBtnRef.current.contains(e.target)) return;
      setShareMenuOpen(false);
    };
    const t = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", handler); };
  }, [shareMenuOpen]);

  const openShareMenu = () => {
    if (shareMenuOpen) { setShareMenuOpen(false); return; }
    if (shareBtnRef.current) {
      const r = shareBtnRef.current.getBoundingClientRect();
      const menuW = 240;
      const vw = window.innerWidth;
      // Si el botón está en la mitad izquierda, anclar a la izquierda del botón
      // Si está en la mitad derecha, anclar a la derecha del botón
      const leftSpace  = r.left;
      const rightSpace = vw - r.right;
      let pos;
      if (rightSpace >= menuW - 20 || rightSpace >= leftSpace) {
        // Hay espacio a la derecha o es más cómodo abrir hacia la derecha
        pos = { top: r.bottom + 6, left: Math.min(r.left, vw - menuW - 8), right: 'auto' };
      } else {
        // Abrir hacia la izquierda anclado al borde derecho del botón
        pos = { top: r.bottom + 6, right: Math.max(8, vw - r.right), left: 'auto' };
      }
      setShareMenuPos(pos);
    }
    setShareMenuOpen(true);
  };
  // Ref para capturar el ID a eliminar antes de cualquier setState — solución definitiva al bug de eliminación
  const pendingDeleteRef = useRef(null);

  const ejecutarEliminacion = useCallback((id) => {
    if (id === null || id === undefined) return;
    const sid = String(id);
    // Usar prev para obtener el estado más reciente + force:true para saltarse hasChanged
    setVoluntarios(
      prev => Array.isArray(prev) ? prev.filter(v => String(v.id) !== sid) : prev,
      { force: true }
    );
    setConfirmDelete(null);
    pendingDeleteRef.current = null;
    toast.success('Voluntario eliminado');
  }, [setVoluntarios]);
  const [qrDataUrl, setQrDataUrl]   = useState(null);
  const [qrLoading, setQrLoading]   = useState(false);
  const [ficha, setFicha] = useState(null); // {tipo:'vol'|'puesto', data}
  const abrirFicha = (tipo, data) => { scrollMainToTop(); setFicha({ tipo, data }); };
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
    const enPuesto = vols.filter(v => v?.enPuesto).length;
    return { total, confirmados, pendientes, cancelados, totalNecesarios, asignados, conCoche, tallasCount, coberturaGlobal, enPuesto };
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
    window.dispatchEvent(new CustomEvent("teg-sync"));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const hashPinLocal = (pin) => { let h=0; for(let i=0;i<pin.length;i++){h=(Math.imul(31,h)+pin.charCodeAt(i))|0;} return String(h); };
  const pinInicialLocal = (tel) => { const d=(tel||'').replace(/\D/g,''); return d.slice(-4)||'0000'; };

  const addVoluntario = (data) => {
    const telNorm = (data.telefono || '').replace(/\D/g, '');
    if (telNorm.length >= 9) {
      const dup = voluntarios.find(v => (v.telefono || '').replace(/\D/g, '') === telNorm);
      if (dup) {
        toast.error(`Ya existe un voluntario con ese teléfono: ${dup.nombre}`);
        return false;
      }
    }
    const pinHash = hashPinLocal(pinInicialLocal(data.telefono || ''));
    const nuevo = { id: genIdNum(voluntarios), camisetaEntregada: false, enPuesto: false, horaLlegada: null, sessionToken: null, pinHash, ...data };
    setVoluntarios(prev => [...prev, nuevo]);
    toast.success("Voluntario añadido");
    return true;
  };

  // Importación masiva desde CSV
  const importarCSV = async (file) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) { toast.error("Archivo vacío"); return; }
    // Detectar separador
    const sep = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g,''));
    const idx = (names) => names.map(n => headers.findIndex(h => h.includes(n))).find(i => i >= 0) ?? -1;
    const iNombre = idx(['nombre','name']);
    const iApel   = idx(['apellido','surname','last']);
    const iTel    = idx(['telefono','phone','tel','móvil','movil','celular']);
    const iTalla  = idx(['talla','size']);
    const iEmail  = idx(['email','correo','mail']);
    if (iTel === -1) { toast.error("El CSV necesita una columna 'telefono'"); return; }

    let added = 0, dupes = 0;
    const genId = () => genIdNum([...voluntarios, ...(new Array(added).fill(0).map((_,i) => ({id: Date.now()+i})))]);

    const nuevos = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.trim().replace(/^['"]+|['"]+$/g,''));
      const tel = cols[iTel] || '';
      if (!tel) continue;
      const telNorm = tel.replace(/\D/g,'');
      const dup = voluntarios.find(v => (v.telefono||'').replace(/\D/g,'') === telNorm) ||
                  nuevos.find(v => (v.telefono||'').replace(/\D/g,'') === telNorm);
      if (dup) { dupes++; continue; }
      const nombre = iNombre >= 0 ? cols[iNombre] : '';
      const apellidos = iApel >= 0 ? cols[iApel] : '';
      const talla = iTalla >= 0 ? cols[iTalla].toUpperCase() : '';
      const email = iEmail >= 0 ? cols[iEmail] : '';
      const pinHash = hashPinLocal(pinInicialLocal(tel));
      nuevos.push({
        id: Date.now() + i,
        nombre, apellidos, telefono: tel, email, talla,
        estado: 'pendiente', camisetaEntregada: false,
        enPuesto: false, horaLlegada: null, sessionToken: null,
        pinHash, fechaRegistro: new Date().toISOString().split('T')[0],
        origenImportacion: 'csv',
      });
      added++;
    }
    if (nuevos.length > 0) {
      setVoluntarios(prev => [...prev, ...nuevos], { force: true });
    }
    toast.success(`Importados: ${added} voluntario${added !== 1 ? "s" : ""}${dupes > 0 ? ` · ${dupes} duplicado${dupes !== 1 ? "s" : ""} omitido${dupes !== 1 ? "s" : ""}` : ""}`);
  };

  // Registrar entrada en el historial de cambios del voluntario
  const registrarHistorial = (volActual, cambios) => {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-ES", { day:"2-digit", month:"2-digit", year:"numeric" });
    const hora  = ahora.toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" });
    const descripcion = [];
    if (cambios.estado !== undefined && cambios.estado !== volActual.estado)
      descripcion.push(`Estado: ${volActual.estado} → ${cambios.estado}`);
    if (cambios.puestoId !== undefined && cambios.puestoId !== volActual.puestoId)
      descripcion.push(`Puesto reasignado`);
    if (cambios.camisetaEntregada !== undefined && cambios.camisetaEntregada !== volActual.camisetaEntregada)
      descripcion.push(cambios.camisetaEntregada ? "Camiseta entregada" : "Camiseta: pendiente");
    if (cambios.mensajeOrganizador !== undefined)
      descripcion.push("Mensaje del organizador actualizado");
    if (cambios.enPuesto !== undefined && cambios.enPuesto)
      descripcion.push(`En puesto${cambios.horaLlegada ? " a las "+cambios.horaLlegada : ""}`);
    if (!descripcion.length) return volActual.historial || [];
    const entrada = { fecha, hora, texto: descripcion.join(" · ") };
    const histPrev = Array.isArray(volActual.historial) ? volActual.historial : [];
    return [entrada, ...histPrev].slice(0, 50); // máximo 50 entradas
  };

  const updateVoluntario = (id, data) => {
    setVoluntarios(prev => prev.map(v => {
      if (v.id !== id) return v;
      const historial = registrarHistorial(v, data);
      return { ...v, ...data, historial };
    }));
    if(data.estado==="confirmado") toast.success("Voluntario confirmado ✓");
    else if(data.estado==="cancelado") toast.warning("Voluntario cancelado");
    else if(!Object.prototype.hasOwnProperty.call(data, "estado")) toast.success("Voluntario actualizado");
  };
  const bulkUpdateVoluntarios = (ids, data) => {
    setVoluntarios(prev => prev.map(v => ids.includes(v.id) ? { ...v, ...data } : v));
    if (data.estado === "confirmado") toast.success(`${ids.length} voluntarios confirmados ✓`);
    else if (data.estado === "cancelado") toast.warning(`${ids.length} voluntarios cancelados`);
    else if (data.estado === "pendiente") toast.info(`${ids.length} voluntarios movidos a pendiente`);
  };
  const deleteVoluntario = (id) => { const sid = String(id); setVoluntarios(prev => prev.filter(v => String(v.id) !== sid)); setConfirmDelete(null); toast.success("Voluntario eliminado"); };
  const updatePuesto = (id, data) => { setPuestos(prev => prev.map(p => p.id === id ? { ...p, ...data } : p)); toast.success("Puesto actualizado"); };
  const addPuesto = (data) => { setPuestos(prev => [...prev, { id: genIdNum(puestos), ...data }]); toast.success("Puesto creado"); };
  const deletePuesto = (id) => { setPuestos(prev => prev.filter(p => p.id !== id)); setVoluntarios(prev => prev.map(v => v.puestoId === id ? { ...v, puestoId: null } : v)); toast.success("Puesto eliminado"); };

  const volsFiltrados = useMemo(() => voluntarios.filter(v => {
    const nombreCompleto = (v.nombre + " " + (v.apellidos||"")).toLowerCase();
    const matchBusqueda = !busqueda || nombreCompleto.includes(busqueda.toLowerCase()) || (v.telefono||"").includes(busqueda);
    const matchEstado = filtroEstado === "todos"
      ? true
      : filtroEstado === "en-puesto"
        ? Boolean(v.enPuesto)
        : v.estado === filtroEstado;
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
        opcionEmail={opcionEmail}
        opcionEmergencia={opcionEmergencia}
        config={config}
        onRegistrar={(data) => { addVoluntario(data); setVista("gestion"); setTab("voluntarios"); }}
      />
    </AppShell>
  );

  // Días hasta el evento — para reordenar tabs en semana de carrera
  const diasHastaEvento = Math.ceil((getEventDate(config) - new Date()) / 86400000);
  const esSemanaCarrera = diasHastaEvento >= 0 && diasHastaEvento <= 7;

  const TABS_BASE = [
    { id: "dashboard",  icon: "📊", label: "Dashboard" },
    { id: "voluntarios",icon: "👥", label: "Voluntarios", badge: stats.total },
    { id: "puestos",    icon: "📍", label: "Puestos",     badge: puestos.length },
    { id: "dia-d",      icon: "🏁", label: esSemanaCarrera ? "🚨 Día de Carrera" : "Día de Carrera",
      badge: stats.enPuesto > 0 ? stats.enPuesto : undefined, badgeColor: "badge-green" },
  ];
  // En semana de carrera, Día de Carrera sube a primera posición
  const TABS_VOL = esSemanaCarrera
    ? [TABS_BASE[3], ...TABS_BASE.slice(0, 3)]
    : TABS_BASE;

  return (
    <AppShell>
      <div className="block-container">

        {/* HEADER */}
        <div className="block-header">
          <div>
            <div style={{display:"flex",alignItems:"center",gap:".65rem",flexWrap:"wrap",marginBottom:".15rem"}}>
              <h1 className="block-title" style={{margin:0}}>👥 Voluntarios</h1>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"proyecto"}}))}
                style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".15rem .45rem",
                  borderRadius:4,border:"1px solid rgba(34,211,238,.3)",
                  background:"rgba(34,211,238,.1)",color:"var(--cyan)",cursor:"pointer"}}>
                📋 Ver en Proyecto →
              </button>
            </div>
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
            <button className="btn btn-ghost btn-sm"
              onClick={() => exportarVoluntarios(voluntarios, puestos)}
              title="Exportar lista de voluntarios a Excel">
              📊 Excel
            </button>
            <label className="btn btn-ghost btn-sm"
              title="Importar voluntarios desde un archivo CSV (columnas: nombre, apellidos, telefono, talla, email)"
              style={{ cursor:"pointer", margin:0 }}>
              📥 Importar CSV
              <input type="file" accept=".csv,.txt" style={{ display:"none" }}
                onChange={e => { if (e.target.files[0]) { importarCSV(e.target.files[0]); e.target.value = ''; } }} />
            </label>
            {/* Dropdown Compartir portal — consolida 3 acciones */}
            <div ref={shareMenuRef} style={{ position:"relative" }}>
              <button className="btn btn-ghost btn-sm"
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent("teg-navigate", {detail:{block:"configuracion"}})); }
                catch(e) {}
              }}
              title="Configurar contactos del organizador visibles para los voluntarios">
              ⚙️ Contacto org.
            </button>
            <button
                ref={shareBtnRef}
                className="btn btn-ghost btn-sm"
                onClick={openShareMenu}
                title="Compartir portal de voluntarios">
                🔗 Portal {shareMenuOpen ? "▲" : "▼"}
              </button>
              {shareMenuOpen && (
                <div
                  ref={shareMenuRef}
                  onClick={e => e.stopPropagation()}
                  style={{
                    position:"fixed", top:shareMenuPos.top,
                    left:shareMenuPos.left !== 'auto' ? shareMenuPos.left : undefined,
                    right:shareMenuPos.right !== 'auto' ? shareMenuPos.right : undefined,
                    zIndex:9999,
                    background:"#1a2540",
                    border:"1px solid rgba(148,163,184,.3)",
                    borderRadius:12, padding:".5rem", minWidth:240, maxWidth:"calc(100vw - 1rem)",
                    boxShadow:"0 16px 48px rgba(0,0,0,.85), 0 0 0 1px rgba(34,211,238,.12)",
                    display:"flex", flexDirection:"column", gap:".3rem"
                  }}>
                  <button
                    style={{ justifyContent:"flex-start", gap:".5rem",
                      display:"flex", alignItems:"center", width:"100%",
                      padding:".65rem .85rem", background:"transparent", border:"none",
                      borderRadius:8, cursor:"pointer", color:"#e2e8f0",
                      fontFamily:"var(--font-mono)", fontSize:".85rem", fontWeight:600,
                      transition:"background .1s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(34,211,238,.1)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    onClick={() => {
                      const url = window.location.origin + "/voluntarios/mi-ficha";
                      navigator.clipboard.writeText(url).then(() => {
                        setUrlCopiada(true);
                        setTimeout(() => setUrlCopiada(false), 2000);
                        toast.success("Enlace copiado ✓");
                        setShareMenuOpen(false);
                      });
                    }}>
                    📋 {urlCopiada ? "¡Copiado!" : "Copiar enlace"}
                  </button>
                  <button
                    style={{ justifyContent:"flex-start", gap:".5rem",
                      display:"flex", alignItems:"center", width:"100%",
                      padding:".65rem .85rem", background:"transparent", border:"none",
                      borderRadius:8, cursor:"pointer", color:"#e2e8f0",
                      fontFamily:"var(--font-mono)", fontSize:".85rem", fontWeight:600,
                      transition:"background .1s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(34,211,238,.1)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    onClick={async () => {
                      if (qrDataUrl) { setQrDataUrl(null); setShareMenuOpen(false); return; }
                      setQrLoading(true);
                      try {
                        const url = window.location.origin + "/voluntarios/mi-ficha";
                        const QRCode = (await import("qrcode")).default;
                        const dataUrl = await QRCode.toDataURL(url, { width:256, margin:2, color:{ dark:"#0f172a", light:"#ffffff" } });
                        setQrDataUrl(dataUrl);
                      } catch { toast.error("Error al generar QR"); }
                      finally { setQrLoading(false); setShareMenuOpen(false); }
                    }}>
                    {qrLoading ? "⏳ Generando…" : "🔲 Ver QR"}
                  </button>
                  <div style={{ height:1, background:"rgba(148,163,184,.2)", margin:".2rem .2rem" }}/>
                  <a href={window.location.origin + "/voluntarios/mi-ficha"} target="_blank" rel="noreferrer"
                    style={{ justifyContent:"flex-start", gap:".5rem",
                      display:"flex", alignItems:"center", width:"100%",
                      padding:".65rem .85rem", background:"transparent",
                      borderRadius:8, cursor:"pointer", color:"#22d3ee",
                      fontFamily:"var(--font-mono)", fontSize:".85rem", fontWeight:600,
                      textDecoration:"none", transition:"background .1s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(34,211,238,.1)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    ↗ Abrir en nueva pestaña
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>





        {/* ── Panel QR del formulario público ──────────────────────────────── */}
        {qrDataUrl && (
          <div className="card mb" style={{ padding:"1rem", display:"flex", flexDirection:"column",
            alignItems:"center", gap:".65rem", background:"var(--surface2)" }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
              color:"var(--cyan)", textTransform:"uppercase", letterSpacing:".06em" }}>
              🔲 QR — Formulario de voluntarios
            </div>
            <img src={qrDataUrl} alt="QR formulario voluntarios"
              style={{ borderRadius:8, border:"4px solid #fff", width:200, height:200 }} />
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
              textAlign:"center", wordBreak:"break-all", maxWidth:280 }}>
              {window.location.origin + "/voluntarios/mi-ficha"}
            </div>
            <div style={{ display:"flex", gap:".5rem" }}>
              <a href={qrDataUrl} download="qr-voluntarios-teg.png"
                className="btn btn-ghost btn-sm">
                ⬇ Descargar PNG
              </a>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigator.clipboard.writeText(window.location.origin + "/voluntarios/mi-ficha").then(() => toast.success("URL copiada al portapapeles"))}>
                📋 Copiar enlace
              </button>
            </div>
          </div>
        )}

        {/* OPCIONES FORMULARIO + IMÁGENES — colapsable */}
        <div className="card mb" style={{padding:"0.65rem 1rem"}}>
          <button
            onClick={() => setConfigOpen(v => !v)}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"none",border:"none",cursor:"pointer",padding:0}}>
            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}>
              ⚙️ Configuración formulario público
            </span>
            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-dim)"}}>
              {configOpen ? "▲ ocultar" : "▼ mostrar"}
            </span>
          </button>
          {configOpen && (
            <div className="flex-center gap" style={{flexWrap:"wrap",marginTop:"0.65rem",paddingTop:"0.65rem",borderTop:"1px solid var(--border)"}}>
              {[
                { label: "Elegir puesto",      val: opcionPuesto,      set: setOpcionPuesto },
                { label: "Vehículo propio",    val: opcionVehiculo,    set: setOpcionVehiculo },
                { label: "Email de contacto",  val: opcionEmail,       set: setOpcionEmail },
                { label: "Tel. emergencia",    val: opcionEmergencia,  set: setOpcionEmergencia },
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


        {/* Buscador global — siempre visible */}
        <div style={{ marginBottom:".6rem", display:"flex", gap:".5rem", alignItems:"center" }}>
          <div style={{ position:"relative", flex:1, maxWidth:380 }}>
            <span style={{ position:"absolute", left:".7rem", top:"50%", transform:"translateY(-50%)",
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-base)", color:"var(--text-dim)",
              pointerEvents:"none" }}>🔍</span>
            <input className="inp" value={busqueda}
              onChange={e => { setBusqueda(e.target.value); if (tab !== "voluntarios") setTab("voluntarios"); }}
              placeholder="Buscar voluntario por nombre o teléfono…"
              style={{ paddingLeft:"2.2rem", fontSize:"var(--fs-base)" }} />
          </div>
          {busqueda && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => setBusqueda("")}
              style={{ color:"var(--text-muted)", flexShrink:0 }}>✕ Limpiar</button>
          )}
        </div>
        {/* TABS */}
        <div className="tabs">
          {TABS_VOL.map(item => (
            <button key={item.id} className={cls("tab-btn", tab===item.id && "active")} onClick={() => setTab(item.id)}>
              {item.icon} {item.label}
              {item.badge !== undefined && (
                <span className={`badge ${item.badgeColor || "badge-cyan"}`} style={{marginLeft:"0.3rem"}}>{item.badge}</span>
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
              onUpdate={updateVoluntario} onBulkUpdate={bulkUpdateVoluntarios} onDelete={(id) => setConfirmDelete(id)}
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
          {tab==="dia-d"  && <TabDiaD puestosConStats={puestosConStats} voluntarios={voluntarios} onUpdateVol={updateVoluntario} diasHastaEvento={diasHastaEvento} />}
        </div>
      </div>

      {/* MODALES */}
      {ficha?.tipo==="vol" && createPortal(
        <FichaVoluntario
          voluntario={ficha.data} puestos={puestos}
          locs={locs} matPorLoc={matPorLoc}
          onClose={() => setFicha(null)}
          onEditar={() => { const m=document.querySelector("main");if(m)m.scrollTo({top:0,behavior:"instant"}); setFicha(null); setModalVol(ficha.data); }}
          onEliminar={() => {
            const id = ficha.data?.id;
            if (id === null || id === undefined) return;
            pendingDeleteRef.current = id;
            setFicha(null);
            setTimeout(() => setConfirmDelete(id), 30);
          }}
          onEliminarConfirmado={() => {
            const id = ficha.data?.id ?? pendingDeleteRef.current;
            if (id === null || id === undefined) return;
            pendingDeleteRef.current = id;
            setFicha(null);
            setTimeout(() => ejecutarEliminacion(id), 0);
          }}
          onUpdate={(data) => { updateVoluntario(ficha.data.id, data); setFicha(f => ({ ...f, data: { ...f.data, ...data } })); }}
        />
      , document.body)}
      {ficha?.tipo==="puesto" && createPortal(
        <FichaPuesto
          puesto={ficha.data} voluntarios={voluntarios}
          locs={locs} matPorLoc={matPorLoc} rutas={rutas}
          onClose={() => setFicha(null)}
          onFichaVol={(v) => { setFicha(null); setTimeout(() => abrirFicha("vol", v), 50); }}
          onEditar={() => { const m=document.querySelector("main");if(m)m.scrollTo({top:0,behavior:"instant"}); setFicha(null); setModalPuesto(ficha.data); }}
          onEliminar={() => { setFicha(null); setConfirmDeletePuesto(ficha.data.id); }}
        />
      , document.body)}
      {modalVol && createPortal(
        <ModalVoluntario
          key={modalVol==="nuevo" ? "nuevo" : modalVol.id}
          voluntario={modalVol==="nuevo" ? null : modalVol}
          puestos={puestos}
          onSave={(data) => { if (modalVol==="nuevo") addVoluntario(data); else updateVoluntario(modalVol.id, data); setModalVol(null); }}
          onClose={() => setModalVol(null)}
          onEliminar={modalVol!=="nuevo" ? () => { const id = modalVol?.id; if (!id) return; setModalVol(null); setConfirmDelete(id); } : undefined}
        />
      , document.body)}
      {modalPuesto && createPortal(
        <ModalPuesto
          key={modalPuesto==="nuevo" ? "nuevo" : modalPuesto.id}
          puesto={modalPuesto==="nuevo" ? null : modalPuesto}
          locs={locs}
          onSave={(data) => { if (modalPuesto==="nuevo") addPuesto(data); else updatePuesto(modalPuesto.id, data); setModalPuesto(null); }}
          onClose={() => setModalPuesto(null)}
        />
      , document.body)}
      {confirmDelete && createPortal(<ModalConfirm zIndex={400} mensaje="¿Eliminar este voluntario? Esta acción no se puede deshacer." onConfirm={() => ejecutarEliminacion(confirmDelete)} onCancel={() => { setConfirmDelete(null); pendingDeleteRef.current = null; }} />, document.body)}
      {confirmDeletePuesto && createPortal(<ModalConfirm zIndex={400} mensaje="¿Eliminar este puesto? Los voluntarios asignados quedarán sin puesto." onConfirm={() => { deletePuesto(confirmDeletePuesto); setConfirmDeletePuesto(null); }} onCancel={() => setConfirmDeletePuesto(null)} />, document.body)}
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
          <div style={{ width: 24, height: 24, borderRadius: 4, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-sm)", flexShrink: 0 }}>⏳</div>
        ) : !isPlaceholder ? (
          <img src={img} alt={label} style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: 4, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-sm)", flexShrink: 0 }}>📷</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: accent }}>{label}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
            {compressing ? "Comprimiendo…" : !isPlaceholder ? "✓ Imagen cargada" : "Subir imagen"}
          </div>
        </div>
        {!isPlaceholder && (
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); onImg(null); }}
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "var(--fs-sm)", flexShrink: 0 }}
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
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: var(--bg);
          --surface: var(--bg);
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
  const [alertasColapsadas, setAlertasColapsadas] = useState(true);
  const [sinPuestoColapsado, setSinPuestoColapsado] = useState(false);
  const alertas = puestosConStats.filter(p => p.coberturaConf < 50);
  const cobColor = stats.coberturaGlobal >= 80 ? "c-green" : stats.coberturaGlobal >= 50 ? "c-amber" : "c-red";

  return (
    <>
      <div className="kpi-grid">
        <div className={`kpi cursor-ptr ${stats.coberturaGlobal>=80?"green":stats.coberturaGlobal>=50?"amber":"red"}`}
          onClick={() => setTab("puestos")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>🎯 Cobertura global<Tooltip text={"Voluntarios confirmados ÷ plazas necesarias en todos los puestos.\n100% = todos los puestos cubiertos por voluntarios confirmados."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:stats.coberturaGlobal>=80?"var(--green)":stats.coberturaGlobal>=50?"var(--amber)":"var(--red)"}}>
            {stats.coberturaGlobal}%
          </div>
          <div className="kpi-sub">{stats.confirmados}/{stats.totalNecesarios} confirmados</div>
        </div>
        <div className="kpi cyan cursor-ptr" onClick={() => setTab("voluntarios")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>👥 Total voluntarios<Tooltip text={"Total de voluntarios registrados en el sistema, independientemente de su estado.\nIncluye confirmados, pendientes y cancelados."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"var(--cyan)"}}>{stats.total}</div>
          <div className="kpi-sub">
            <span style={{color:"var(--green)"}}>{stats.confirmados} ✓</span>
            {" · "}
            <span style={{color:"var(--amber)"}}>{stats.pendientes} ⏳</span>
            {stats.cancelados > 0 && <>{" · "}<span style={{color:"var(--red)"}}>{stats.cancelados} ✕</span></>}
          </div>
        </div>
        <div className={`kpi cursor-ptr ${alertas.length>0?"red":"violet"}`}
          onClick={() => setTab("puestos")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>📍 Puestos<Tooltip text={"Número de puestos operativos definidos para el evento.\nCada puesto tiene un número de voluntarios necesarios y un horario asignado."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:alertas.length>0?"var(--red)":"var(--violet)"}}>
            {puestosConStats.length}
          </div>
          <div className="kpi-sub">
            {alertas.length>0
              ? `${alertas.length} con cobertura insuficiente`
              : `${puestosConStats.filter(p=>p.coberturaConf>=100).length} confirmados al 100%`}
          </div>
        </div>
        <div className="kpi amber cursor-ptr" onClick={() => setTab("voluntarios")} title="Ver voluntarios con vehículo">
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>🚗 Con vehículo<Tooltip text={"Voluntarios confirmados que han indicado disponer de vehículo propio.\nÚtil para planificar rutas de reparto y acceso a puestos remotos."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"var(--amber)"}}>{stats.conCoche}</div>
          <div className="kpi-sub">{stats.total>0?Math.round(stats.conCoche/stats.total*100):0}% del total</div>
        </div>
        {stats.enPuesto > 0 && (
          <div className="kpi green cursor-ptr" onClick={() => setTab("dia-d")} title="Ver checklist día de carrera">
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>📍 En su puesto</div>
            <div className="kpi-value" style={{color:"var(--green)"}}>{stats.enPuesto}</div>
            <div className="kpi-sub">{stats.total>0?Math.round(stats.enPuesto/stats.total*100):0}% confirmados</div>
          </div>
        )}
      </div>

      {alertas.length > 0 && (
        <div style={{borderRadius:10,overflow:"hidden",marginBottom:".85rem",
          border:"1px solid rgba(248,113,113,.25)",background:"var(--red-dim)"}}>
          <button
            onClick={() => setAlertasColapsadas(v => !v)}
            style={{width:"100%",display:"flex",alignItems:"center",gap:".65rem",
              padding:".6rem .85rem",background:"transparent",border:"none",
              cursor:"pointer",textAlign:"left",
              borderBottom: alertasColapsadas ? "none" : "1px solid rgba(248,113,113,.2)"}}>
            <span style={{width:8,height:8,borderRadius:"50%",
              background:"var(--red)",flexShrink:0,display:"inline-block"}}/>
            <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:"var(--fs-sm)",
              color:"var(--red)",flex:1}}>
              ⚠️ Puestos con cobertura insuficiente
            </span>
            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
              color:"var(--red)",padding:".1rem .4rem",borderRadius:20,
              background:"rgba(248,113,113,.15)"}}>
              {alertas.length}
            </span>
            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
              color:"rgba(248,113,113,.6)",flexShrink:0,
              transform:alertasColapsadas?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
          </button>
          {!alertasColapsadas && (
            <div style={{padding:".35rem .85rem .6rem"}}>
              {alertas.map(p => (
                <div key={p.id}
                  onClick={() => onEditarPuesto(p)}
                  title="Click para abrir ficha del puesto"
                  style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"0.3rem 0.3rem",borderBottom:"1px solid rgba(248,113,113,0.1)",
                    fontSize:"var(--fs-base)",cursor:"pointer",borderRadius:4,transition:"background .12s"}}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(248,113,113,.08)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <span>{p.nombre}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
                    color:"var(--red)",fontWeight:700}}>
                    {p.confirmados}/{p.necesarios} conf. · {p.totalAsignados} asig. ({p.coberturaConf}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
        <div className="card">
          <div className="card-title">📍 Cobertura por puesto</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {puestosConStats.slice(0, 6).map(p => {
              const pct = Math.min(p.coberturaConf, 100);
              const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
              return (
                <div key={p.id} className="cursor-ptr"
                  onClick={() => onEditarPuesto(p)}
                  title="Click para abrir ficha del puesto">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span style={{ fontSize: "var(--fs-sm)", color: "var(--text)" }}>{p.nombre}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color }}>{p.totalAsignados}/{p.necesarios}</span>
                  </div>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
            {puestosConStats.length > 6 && (
              <button className="btn btn-ghost" style={{ fontSize: "var(--fs-sm)", marginTop: "0.25rem" }} onClick={() => setTab("puestos")}>
                Ver todos los puestos →
              </button>
            )}
          </div>
        </div>

        <div className="card">
          {(() => {
            const sinPuestoAll = voluntarios
              .filter(v => !v.puestoId && v.estado !== "cancelado");
            const sinPuesto = sinPuestoAll;
            const pendConf = voluntarios
              .filter(v => v.estado === "pendiente")
              .sort((a,b) => (a.fechaRegistro||"").localeCompare(b.fechaRegistro||""))
              .slice(0, 10);
            // Mostrar sin puesto si hay, si no los pendientes de confirmar
            const lista = sinPuesto.length > 0 ? sinPuesto : pendConf;
            const titulo = sinPuesto.length > 0
              ? `📍 Sin puesto asignado (${sinPuestoAll.length})`
              : `⏳ Pendientes de confirmar (${pendConf.length})`;
            if (lista.length === 0) return (
              <div style={{ textAlign:"center", padding:"1.5rem 0",
                fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", color:"var(--green)" }}>
                ✅ Todos asignados y confirmados
              </div>
            );
            return (
              <>
                <button
                  onClick={() => setSinPuestoColapsado(v => !v)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    width:"100%", background:"none", border:"none", cursor:"pointer", padding:0,
                    marginBottom: sinPuestoColapsado ? 0 : ".4rem" }}>
                  <div className="card-title" style={{marginBottom:0}}>{titulo}</div>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                    color:"var(--text-dim)", transition:"transform .18s",
                    transform: sinPuestoColapsado ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {!sinPuestoColapsado && (
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
                      <div style={{ position:"relative", width:26, height:26, flexShrink:0 }}>
                        <div style={{ width:26, height:26, borderRadius:"50%",
                          background:"var(--surface2)", border:"1px solid var(--border)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:"var(--fs-xs)", fontWeight:700, color:"var(--cyan)" }}>
                          {(v.nombre||"V").split(" ").map(n=>n[0]).slice(0,2).join("")}
                        </div>
                        <span style={{
                          position:"absolute", bottom:0, right:0,
                          width:8, height:8, borderRadius:"50%",
                          background: v.estado==="confirmado" ? "var(--green)" : v.estado==="cancelado" ? "var(--red)" : "var(--amber)",
                          border:"1.5px solid var(--surface)",
                          display:"block",
                        }} title={v.estado} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"0.74rem", fontWeight:600,
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {v.nombre||"Sin nombre"}{v.apellidos ? (" "+v.apellidos) : ""}
                        </div>
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.56rem",
                          color:"var(--text-muted)" }}>{v.telefono||"—"}</div>
                      </div>
                      <span className={`badge badge-${v.estado==="confirmado"?"green":v.estado==="cancelado"?"red":"amber"}`}>
                        {v.estado}
                      </span>
                      <div style={{ display:"flex", gap:".2rem", flexShrink:0 }}>
                        {v.camisetaEntregada && (
                          <span title="Camiseta entregada" style={{ fontSize:"var(--fs-xs)" }}>🎽</span>
                        )}
                        {v.enPuesto && (
                          <span title={"En puesto" + (v.horaLlegada ? " · " + v.horaLlegada : "")}
                            style={{ fontSize:"var(--fs-xs)" }}>📍</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Resumen de tallas — para coordinación con Camisetas ── */}
      {Object.values(stats.tallasCount || {}).some(n => n > 0) && (
        <div className="card" style={{ marginTop:".85rem" }}>
          <div className="card-title" style={{ marginBottom:".6rem", justifyContent:"space-between" }}>
            <span>
              👕 Tallas de voluntarios
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                color:"var(--text-dim)", fontWeight:400, marginLeft:".5rem" }}>
                (excluye cancelados)
              </span>
            </span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize:"var(--fs-xs)", padding:".2rem .5rem" }}
              onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block:"camisetas" } }))}>
              Ver en Camisetas →
            </button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:".35rem" }}>
            {Object.entries(stats.tallasCount || {})
              .filter(([, n]) => n > 0)
              .map(([talla, n]) => (
                <div key={talla} style={{
                  fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                  padding:".2rem .6rem", borderRadius:6,
                  background:"var(--surface2)", border:"1px solid var(--border)",
                  display:"flex", gap:".4rem", alignItems:"center",
                }}>
                  <span style={{ color:"var(--text-muted)" }}>{talla}</span>
                  <span style={{ fontWeight:800, color:"var(--cyan)" }}>{n}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── TAB VOLUNTARIOS ──────────────────────────────────────────────────────────
function TabVoluntarios({ voluntarios, todosVols, puestos, busqueda, setBusqueda, filtroEstado, setFiltroEstado, filtroPuesto, setFiltroPuesto, onUpdate, onBulkUpdate, onDelete, onNuevo, onEditar, onFicha }) {
  const [seleccionados, setSeleccionados] = useState([]);
  const [modoSeleccion, setModoSeleccion] = useState(false);

  const toggleSeleccion = (id) => setSeleccionados(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
  const seleccionarTodos = () => setSeleccionados(voluntarios.map(v => v.id));
  const deseleccionarTodos = () => setSeleccionados([]);
  const salirModo = () => { setModoSeleccion(false); setSeleccionados([]); };
  const [orden, setOrden]           = useState("nombre");
  const [colapsados, setColapsados] = useState({
    confirmado: true,
    pendiente:  true,
    cancelado:  true,
  });

  const toggleGrupo = (id) => setColapsados(prev => ({ ...prev, [id]: !prev[id] }));

  const colapsarTodos   = () => setColapsados({ confirmado: true,  pendiente: true,  cancelado: true  });
  const descolapsarTodos = () => setColapsados({ confirmado: false, pendiente: false, cancelado: false });

  const volsOrdenados = [...voluntarios].sort((a, b) => {
    if (orden === "nombre") return (a.nombre || "").localeCompare(b.nombre || "", "es");
    if (orden === "puesto") {
      const pa = puestos.find(p => p.id === a.puestoId)?.nombre || "zzz";
      const pb = puestos.find(p => p.id === b.puestoId)?.nombre || "zzz";
      return pa.localeCompare(pb, "es");
    }
    if (orden === "fecha") return (b.fechaRegistro || "").localeCompare(a.fechaRegistro || "");
    return 0;
  });

  // Paginación — se aplica al listado por nombre (no agrupado), mantenida para compatibilidad
  const { items: volsPaginados, total: totalVols, PaginadorUI } = usePaginacion(volsOrdenados, 20);

  // Grupos para la vista agrupada por estado
  const GRUPOS_ESTADO = [
    { id:"confirmado", label:"Confirmados", color:"var(--green)",  bg:"rgba(52,211,153,.08)"  },
    { id:"pendiente",  label:"Pendientes",  color:"var(--amber)",  bg:"rgba(251,191,36,.08)"  },
    { id:"cancelado",  label:"Cancelados",  color:"var(--red)",    bg:"rgba(248,113,113,.06)" },
  ];

  const volsFiltradosIds = volsOrdenados.map(v => v.id);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">👥 Voluntarios</div>
          <div className="page-desc">{todosVols.length} registrados · {voluntarios.length} mostrados · click para abrir ficha</div>
        </div>
        <div style={{ display:"flex", gap:".5rem" }}>
          <button className="btn btn-ghost" aria-label="Exportar lista de voluntarios"
            onClick={() => {
              const activos = todosVols.filter(v => v.estado !== "cancelado");
              const rows = [["Nombre","Teléfono","Email","Puesto","Talla","Rol","Estado","Tel.Emergencia","Vehículo","Notas"]];
              activos.forEach(v => {
                const puesto = puestos.find(p => p.id === v.puestoId);
                rows.push([
                  v.nombre||"", v.telefono||"", v.email||"",
                  puesto?.nombre||"Sin asignar", v.talla||"",
                  v.rol||"apoyo", v.estado||"pendiente",
                  v.telefonoEmergencia||v.contactoEmergencia||"",
                  v.coche?"Sí":"No", (v.notas||"").replace(/\n/g," ")
                ]);
              });
              const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
              const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "voluntarios_trail_el_guerrero.csv"; a.click();
              URL.revokeObjectURL(url);
            }}>
            📥 Exportar CSV
          </button>
          <button className={`btn btn-sm ${modoSeleccion ? "btn-cyan" : "btn-ghost"}`}
            onClick={() => modoSeleccion ? salirModo() : setModoSeleccion(true)}
            title="Selección masiva">
            {modoSeleccion ? `✕ Salir (${seleccionados.length})` : "☑ Seleccionar"}
          </button>
          <button className="btn btn-primary" onClick={onNuevo}>+ Nuevo voluntario</button>
        </div>
      </div>

      {/* Toolbar de acciones masivas */}
      {modoSeleccion && (
        <div style={{
          display:"flex", alignItems:"center", gap:".5rem", flexWrap:"wrap",
          padding:".65rem .85rem", background:"var(--cyan-dim)", borderRadius:8,
          border:"1px solid var(--cyan-border)", marginBottom:".65rem"
        }}>
          <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan)", fontWeight:700, flexShrink:0 }}>
            {seleccionados.length > 0 ? `${seleccionados.length} seleccionados` : "Haz click en filas para seleccionar"}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={seleccionarTodos}>Selec. todos ({voluntarios.length})</button>
          {seleccionados.length > 0 && (<>
            <div style={{ width:1, height:16, background:"var(--border)" }}/>
            <button className="btn btn-green btn-sm"
              onClick={() => { onBulkUpdate(seleccionados, { estado:"confirmado" }); salirModo(); }}>
              ✓ Confirmar
            </button>
            <button className="btn btn-ghost btn-sm"
              onClick={() => { onBulkUpdate(seleccionados, { estado:"pendiente" }); salirModo(); }}>
              ⏳ Pendiente
            </button>
            <button className="btn btn-red btn-sm"
              onClick={() => { onBulkUpdate(seleccionados, { estado:"cancelado" }); salirModo(); }}>
              ✕ Cancelar
            </button>
            <div style={{ width:1, height:16, background:"var(--border)" }}/>
            <button className="btn btn-ghost btn-sm"
              onClick={() => {
                // Exportar solo seleccionados
                const sels = todosVols.filter(v => seleccionados.includes(v.id));
                const rows = [["Nombre","Teléfono","Estado","Puesto","Talla"]];
                sels.forEach(v => {
                  const puesto = puestos.find(p => p.id === v.puestoId);
                  rows.push([v.nombre||"", v.telefono||"", v.estado||"", puesto?.nombre||"Sin asignar", v.talla||""]);
                });
                const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
                const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "seleccion_voluntarios.csv"; a.click();
                salirModo();
              }}>
              📊 Exportar CSV
            </button>
          </>)}
        </div>
      )}

      {/* Filtros + ordenación — Kinetik Ops quick-filter pills */}
      <div style={{ marginBottom:"0.85rem", display:"flex", flexDirection:"column", gap:"0.5rem" }}>
        {/* Búsqueda */}
        <input className="inp" placeholder="Buscar por nombre o teléfono…" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ maxWidth: 320, fontSize:"var(--fs-base)" }} />
        {/* Pills de estado */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"0.35rem", alignItems:"center" }}>
          {[
            { id:"todos",      label:"Todos",       count: todosVols.length,                                            color:"var(--text-muted)",  bg:"rgba(255,255,255,.08)" },
            { id:"confirmado", label:"Confirmados", count: todosVols.filter(v=>v.estado==="confirmado").length, color:"var(--green)",         bg:"rgba(52,211,153,.15)"  },
            { id:"pendiente",  label:"Pendientes",  count: todosVols.filter(v=>v.estado==="pendiente").length,  color:"var(--amber)",         bg:"rgba(251,191,36,.15)"  },
            { id:"cancelado",  label:"Cancelados",  count: todosVols.filter(v=>v.estado==="cancelado").length,  color:"var(--red)",           bg:"rgba(248,113,113,.15)" },
            { id:"en-puesto",  label:"En puesto",   count: todosVols.filter(v=>v.enPuesto).length,               color:"var(--green)",         bg:"rgba(52,211,153,.15)"  },
          ].filter(pill => pill.id !== "en-puesto" || pill.count > 0).map(({ id, label, count, color, bg }) => (
            <button key={id}
              className={`filter-pill${filtroEstado === id ? " active" : ""}`}
              onClick={() => setFiltroEstado(id)}>
              {label}
              <span style={{
                fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                color: filtroEstado === id ? color : "var(--text-dim)",
                background: filtroEstado === id ? bg : "transparent",
                borderRadius:10, padding:"0 .3rem", marginLeft:".15rem",
                minWidth:16, display:"inline-block", textAlign:"center",
                transition:"all .15s",
              }}>
                {count}
              </span>
            </button>
          ))}
          <div className="filter-pill-sep" />
          {/* Pills de puesto */}
          <button className={`filter-pill${filtroPuesto === "todos" ? " active" : ""}`}
            onClick={() => setFiltroPuesto("todos")}>Todos los puestos</button>
          <button className={`filter-pill${filtroPuesto === "sin-asignar" ? " active" : ""}`}
            onClick={() => setFiltroPuesto("sin-asignar")}>Sin asignar</button>
          <div className="filter-pill-sep" />
          {/* Ordenación */}
          <button className={`filter-pill${orden === "nombre" ? " active" : ""}`}
            onClick={() => setOrden("nombre")}>A–Z</button>
          <button className={`filter-pill${orden === "puesto" ? " active" : ""}`}
            onClick={() => setOrden("puesto")}>Por puesto</button>
          <button className={`filter-pill${orden === "fecha" ? " active" : ""}`}
            onClick={() => setOrden("fecha")}>Más recientes</button>
          {(busqueda || filtroEstado !== "todos" || filtroPuesto !== "todos") && (
            <button className="filter-pill"
              onClick={() => { setBusqueda(""); setFiltroEstado("todos"); setFiltroPuesto("todos"); }}
              style={{ color:"var(--red)", borderColor:"rgba(248,113,113,0.3)" }}>
              ✕ Limpiar
            </button>
          )}
          <div className="filter-pill-sep" />
          <button className="filter-pill" onClick={colapsarTodos} title="Colapsar todos los grupos">⊟ Colapsar</button>
          <button className="filter-pill" onClick={descolapsarTodos} title="Expandir todos los grupos">⊞ Expandir</button>
        </div>
      </div>

      {/* ── Acciones masivas — visible cuando hay filtro activo ── */}
      {onBulkUpdate && voluntarios.length > 0 && (filtroEstado !== "todos" || filtroPuesto !== "todos" || busqueda) && (
        <div style={{ display:"flex", alignItems:"center", gap:".6rem", padding:".55rem .85rem",
          borderRadius:8, background:"var(--surface2)", border:"1px solid var(--border)",
          marginBottom:".65rem", flexWrap:"wrap" }}>
          <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", flex:1, minWidth:120 }}>
            {voluntarios.length} voluntario{voluntarios.length===1?"":"s"} con este filtro
          </span>
          {filtroEstado === "pendiente" && (
            <button className="btn btn-green btn-sm"
              onClick={() => onBulkUpdate(voluntarios.map(v=>v.id), { estado:"confirmado" })}>
              ✓ Confirmar todos
            </button>
          )}
          {filtroEstado === "pendiente" && (
            <button className="btn btn-ghost btn-sm"
              style={{ color:"var(--red)", borderColor:"rgba(248,113,113,.3)" }}
              onClick={() => onBulkUpdate(voluntarios.map(v=>v.id), { estado:"cancelado" })}>
              ✕ Cancelar todos
            </button>
          )}
          {filtroEstado === "cancelado" && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => onBulkUpdate(voluntarios.map(v=>v.id), { estado:"pendiente" })}>
              ↩ Mover a pendiente
            </button>
          )}
          {filtroEstado === "confirmado" && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => onBulkUpdate(voluntarios.map(v=>v.id), { estado:"pendiente" })}>
              ↩ Mover todos a pendiente
            </button>
          )}
        </div>
      )}
      {/* Listado agrupado por estado — cada grupo colapsable */}
      {volsOrdenados.length === 0 ? (
        <EmptyState
          svg="people" color="var(--cyan)"
          title="Sin voluntarios"
          sub="No hay voluntarios que coincidan con los filtros activos"
          action={<button className="btn btn-ghost btn-sm" onClick={onNuevo}>+ Añadir voluntario</button>}
        />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
          {GRUPOS_ESTADO.map(grupo => {
            const items = volsOrdenados.filter(v => v.estado === grupo.id);
            if (items.length === 0) return null;
            const collapsed = colapsados[grupo.id];
            return (
              <div key={grupo.id} style={{
                borderRadius:10, overflow:"hidden",
                border:`1px solid ${grupo.color}2a`,
              }}>
                {/* Cabecera del grupo */}
                <button
                  onClick={() => toggleGrupo(grupo.id)}
                  style={{
                    width:"100%", display:"flex", alignItems:"center",
                    gap:".65rem", padding:".55rem .85rem",
                    background: grupo.bg, border:"none",
                    cursor:"pointer", textAlign:"left",
                    borderBottom: collapsed ? "none" : `1px solid ${grupo.color}1a`,
                  }}>
                  <span style={{
                    width:8, height:8, borderRadius:"50%",
                    background: grupo.color, flexShrink:0, display:"inline-block",
                  }}/>
                  <span style={{
                    fontFamily:"var(--font-mono)", fontWeight:700, fontSize:"var(--fs-base)",
                    color: grupo.color, flex:1,
                  }}>
                    {grupo.label}
                  </span>
                  <span style={{
                    fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                    color: grupo.color, fontWeight:700,
                    padding:".1rem .5rem", borderRadius:20,
                    background:`${grupo.color}18`,
                    border:`1px solid ${grupo.color}30`,
                  }}>
                    {todosVols.filter(v => v.estado === grupo.id).length}
                  </span>
                  <span style={{
                    fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                    color:"var(--text-dim)", flexShrink:0,
                    transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    transition:"transform .18s",
                  }}>▼</span>
                </button>

                {/* Cards del grupo */}
                {!collapsed && (
                  <div style={{
                    display:"flex", flexDirection:"column", gap:"0",
                    background:"var(--surface)",
                  }}>
                    {items.map((v, idx) => {
                      const puesto = puestos.find(p => p.id === v.puestoId);
                      return (
                        <div key={v.id}
                          className="list-item-anim"
                          onClick={() => modoSeleccion ? toggleSeleccion(v.id) : onFicha(v)}
                          style={{
                            background: seleccionados.includes(v.id) ? "rgba(34,211,238,.07)" : "var(--surface)",
                            padding:"0.65rem 0.85rem",
                            cursor:"pointer", transition:"background .12s",
                            borderLeft:`3px solid ${seleccionados.includes(v.id) ? "var(--cyan)" : grupo.color}`,
                            borderBottom: idx < items.length-1 ? "1px solid var(--border)" : "none",
                          }}
                          onMouseEnter={e=>e.currentTarget.style.background=seleccionados.includes(v.id)?"rgba(34,211,238,.12)":"var(--surface2)"}
                          onMouseLeave={e=>e.currentTarget.style.background=seleccionados.includes(v.id)?"rgba(34,211,238,.07)":"var(--surface)"}>
                          <div style={{ display:"flex", alignItems:"center", gap:"0.65rem" }}>
                            {/* Checkbox modo selección */}
                            {modoSeleccion && (
                              <div onClick={e => { e.stopPropagation(); toggleSeleccion(v.id); }}
                                style={{
                                  width:20, height:20, borderRadius:5, flexShrink:0, cursor:"pointer",
                                  border:`2px solid ${seleccionados.includes(v.id) ? "var(--cyan)" : "var(--border)"}`,
                                  background: seleccionados.includes(v.id) ? "var(--cyan)" : "transparent",
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  transition:"all .12s"
                                }}>
                                {seleccionados.includes(v.id) && (
                                  <span style={{ color:"#0f172a", fontSize:"0.6rem", fontWeight:900 }}>✓</span>
                                )}
                              </div>
                            )}
                            {/* Avatar Kinetik Ops — pill cuadrado redondeado con iniciales */}
                            <div style={{ position:"relative", flexShrink:0 }}>
                              <div style={{
                                width:34, height:34, borderRadius:10,
                                background: v.estado==="confirmado"
                                  ? "rgba(52,211,153,0.1)"
                                  : v.estado==="cancelado"
                                  ? "rgba(248,113,113,0.1)"
                                  : "rgba(251,191,36,0.1)",
                                border: `1px solid ${v.estado==="confirmado" ? "rgba(52,211,153,0.3)" : v.estado==="cancelado" ? "rgba(248,113,113,0.3)" : "rgba(251,191,36,0.3)"}`,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:"var(--fs-xs)", fontWeight:800,
                                color: v.estado==="confirmado" ? "var(--green)" : v.estado==="cancelado" ? "var(--red)" : "var(--amber)",
                                fontFamily:"var(--font-mono)",
                              }}>
                                {(v.nombre||"V").split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase()}
                              </div>
                            </div>
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
                                {v.coche && <span style={{ fontSize:"var(--fs-sm)" }} title="Tiene vehículo">🚗</span>}
                                {v.enPuesto && <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.5rem", fontWeight:700, color:"var(--green)", background:"rgba(52,211,153,.12)", border:"1px solid rgba(52,211,153,.25)", borderRadius:3, padding:"0 .3rem" }} title={`En puesto${v.horaLlegada ? " desde las "+v.horaLlegada : ""}`}>📍 EN PUESTO</span>}
                                {v.notaVoluntario && <span style={{ fontSize:"var(--fs-sm)" }} title={"Nota: "+v.notaVoluntario}>📝</span>}
                              </div>
                              <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
                                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                                  color:"var(--text-muted)" }}>{v.telefono||"—"}</span>
                                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                                  color:puesto?"var(--text-muted)":"var(--text-dim)" }}>
                                  📍 {puesto?puesto.nombre:"Sin asignar"}
                                </span>
                                {v.talla && (
                                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                                    color:"var(--cyan)" }}>👕 {v.talla}</span>
                                )}
                                {v.fechaRegistro && (() => {
                                  const dias = Math.floor((new Date() - new Date(v.fechaRegistro)) / 86400000);
                                  if (dias > 7) return null;
                                  return <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan)", fontWeight:700, background:"var(--cyan-dim)", borderRadius:4, padding:"0 .3rem" }}>
                                    🆕 {dias===0?"hoy":`${dias}d`}
                                  </span>;
                                })()}
                              </div>
                            </div>
                            <div onClick={e=>e.stopPropagation()} style={{ display:"flex",
                              alignItems:"center", gap:"0.3rem", flexShrink:0 }}>
                              <select className="inp inp-sm" value={v.estado}
                                onClick={e=>e.stopPropagation()}
                                onChange={e=>onUpdate(v.id,{estado:e.target.value})}
                                style={{ width:"auto", color:estadoColor(v.estado),
                                  background:estadoBg(v.estado), fontSize:"var(--fs-sm)" }}>
                                {Object.entries(ESTADOS).map(([k,lbl])=><option key={k} value={k}>{lbl}</option>)}
                              </select>
                              <button className="btn btn-ghost"
                                style={{ padding:"0.22rem 0.38rem", fontSize:"var(--fs-sm)" }}
                                onClick={e=>{e.stopPropagation();onEditar(v);}}>✏️</button>
                              <button className="btn btn-red"
                                style={{ padding:"0.22rem 0.38rem", fontSize:"var(--fs-sm)" }}
                                onClick={e=>{e.stopPropagation();onDelete(v.id);}}>✕</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
            <PaginadorUI />
      </div>
      )}

    </>
  );
}
// ─── TAB PUESTOS ──────────────────────────────────────────────────────────────
function TabPuestos({ puestosConStats, voluntarios, locs, matPorLoc = {}, onUpdatePuesto, onDeletePuesto, onNuevoPuesto, onEditPuesto, onFichaPuesto, onFichaVol }) {
  const [ordenAlfa, setOrdenAlfa]   = useState(false);
  const [busqPuesto, setBusqPuesto] = useState("");
  const [vistaAgrupada, setVistaAgrupada] = useState(false);
  const [colapsadosTipo, setColapsadosTipo] = useState({});

  const toggleTipo = (tipo) => setColapsadosTipo(prev => ({ ...prev, [tipo]: !prev[tipo] }));

  const puestosOrdenados = ordenAlfa
    ? [...puestosConStats].sort((a,b) => (a.nombre||"").localeCompare(b.nombre||"","es"))
    : puestosConStats;
  const puestosFiltrados = busqPuesto.trim()
    ? puestosOrdenados.filter(p => p.nombre.toLowerCase().includes(busqPuesto.toLowerCase()))
    : puestosOrdenados;

  // Agrupado por tipo
  const tiposUnicos = [...new Set(puestosOrdenados.map(p => p.tipo || "Sin tipo"))];
  const puestosPorTipo = tiposUnicos.map(tipo => ({
    tipo,
    items: puestosFiltrados.filter(p => (p.tipo || "Sin tipo") === tipo),
  })).filter(g => g.items.length > 0);
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">📍 Puestos</div>
          <div className="page-desc">{puestosConStats.length} puestos definidos</div>
        </div>
        <div style={{display:"flex",gap:".4rem",alignItems:"center"}}>
          <button className={`btn btn-sm ${vistaAgrupada?"btn-cyan":"btn-ghost"}`} onClick={()=>setVistaAgrupada(v=>!v)} title="Vista agrupada por tipo">⊞ Agrupar</button>
          <button className={`btn btn-sm ${ordenAlfa?"btn-cyan":"btn-ghost"}`} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={onNuevoPuesto}>+ Nuevo puesto</button>
        </div>
      </div>

      {/* Búsqueda de puestos */}
      <div style={{ marginBottom:".65rem", display:"flex", alignItems:"center", gap:".5rem" }}>
        <input className="inp" placeholder="🔍 Buscar puesto…" value={busqPuesto}
          onChange={e => setBusqPuesto(e.target.value)}
          style={{ maxWidth:280, fontSize:"var(--fs-base)" }} />
        {busqPuesto && (
          <button className="btn btn-ghost btn-sm" onClick={() => setBusqPuesto("")}>✕</button>
        )}
        <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginLeft:".25rem" }}>
          {puestosFiltrados.length}/{puestosConStats.length}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {vistaAgrupada ? (
          puestosPorTipo.map(({ tipo, items }) => {
            const collapsed = colapsadosTipo[tipo] ?? false;
            const cobTotal = items.reduce((s, p) => s + p.totalAsignados, 0);
            const necTotal = items.reduce((s, p) => s + (p.necesarios || 0), 0);
            const pctGrupo = necTotal > 0 ? Math.round((cobTotal / necTotal) * 100) : 0;
            const colorGrupo = pctGrupo >= 80 ? "var(--green)" : pctGrupo >= 50 ? "var(--amber)" : "var(--red)";
            return (
              <div key={tipo} style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${colorGrupo}28` }}>
                <button
                  onClick={() => toggleTipo(tipo)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: ".65rem",
                    padding: ".55rem .85rem", background: `${colorGrupo}08`, border: "none",
                    cursor: "pointer", textAlign: "left",
                    borderBottom: collapsed ? "none" : `1px solid ${colorGrupo}18` }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700,
                    fontSize: "var(--fs-base)", color: colorGrupo, flex: 1 }}>
                    {tipo}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                    color: colorGrupo, fontWeight: 700, padding: ".1rem .5rem",
                    borderRadius: 20, background: `${colorGrupo}18`, border: `1px solid ${colorGrupo}30` }}>
                    {cobTotal}/{necTotal} · {items.length} puestos
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                    color: "var(--text-dim)", flexShrink: 0,
                    transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    transition: "transform .18s" }}>▼</span>
                </button>
                {!collapsed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".5rem",
                    padding: ".5rem", background: "var(--surface)" }}>
                    {items.map(p => <PuestoCard key={p.id} p={p} locs={locs} matPorLoc={matPorLoc}
                      onFichaPuesto={onFichaPuesto} onFichaVol={onFichaVol}
                      onEditPuesto={onEditPuesto} onDeletePuesto={onDeletePuesto} />)}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          puestosFiltrados.map(p => (
            <PuestoCard key={p.id} p={p} locs={locs} matPorLoc={matPorLoc}
              onFichaPuesto={onFichaPuesto} onFichaVol={onFichaVol}
              onEditPuesto={onEditPuesto} onDeletePuesto={onDeletePuesto} />
          ))
        )}
      </div>
    </>
  );
}

function PuestoCard({ p, locs, matPorLoc, onFichaPuesto, onFichaVol, onEditPuesto, onDeletePuesto }) {
          const pct = Math.min(p.coberturaConf, 100);
          const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
          return (
            <div key={p.id} className="card" style={{ padding: "1rem", cursor: "pointer" }}
              onClick={() => onFichaPuesto(p)}
              title="Click para ver ficha del puesto">
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                {/* Kinetik: icono pill de cobertura */}
                <div className="item-icon-pill" style={{ "--pill-color": color, marginTop: ".1rem" }}>
                  <span style={{ fontSize: "var(--fs-md)" }}>📍</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "var(--fs-md)" }}>{p.nombre}</span>
                    <span className="badge badge-cyan">{p.tipo}</span>
                    {p.localizacionId && (
                      <>
                        <span className="badge badge-gold" title="Vinculado a localización maestra">📍 Vinculado</span>
                        {(() => {
                          const loc = locs.find(l => l.id === p.localizacionId);
                          const items = loc ? (matPorLoc[loc.nombre] || []) : [];
                          if (!items.length) return null;
                          return (
                            <span
                              onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"logistica",subtab:"material"}})); }}
                              title="Ver material asignado en Logística"
                              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                                color: "var(--cyan)", background: "var(--cyan-dim)",
                                padding: ".1rem .4rem", borderRadius: 4, whiteSpace: "nowrap",
                                cursor:"pointer", border:"1px solid rgba(34,211,238,.2)" }}>
                              📦 {items.length} mat. →
                            </span>
                          );
                        })()}
                      </>
                    )}
                    {p.distancias.map(d => (
                      <span key={d} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: "0.1rem 0.35rem", borderRadius: 3, background: "rgba(34,211,238,0.08)", color: DIST_COLORS[d] || "var(--text-muted)", border: `1px solid ${DIST_COLORS[d] || "var(--border)"}33` }}>{d}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "1.25rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                    <span className="mono text-xs text-muted">🕐 {p.horaInicio} – {p.horaFin}</span>
                    <span className="mono text-xs" style={{ color }}>👤 {p.confirmados}/{p.necesarios} confirmados · {p.totalAsignados} asignados</span>
                    <span className="mono text-xs" style={{ color: "var(--green)" }}>✓ {p.confirmados} confirmados</span>
                  </div>
                  <div className="prog-bar" style={{ marginBottom: "0.4rem" }}>
                    <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  {p.notas && <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", fontStyle: "italic" }}>{p.notas}</div>}
                  {p.voluntariosAsignados.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.5rem" }}>
                      {p.voluntariosAsignados.map(v => (
                        <span key={v.id}
                          onClick={e => { e.stopPropagation(); onFichaVol && onFichaVol(v); }}
                          style={{ fontSize: "var(--fs-sm)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: "0.15rem 0.45rem", color: v.estado === "confirmado" ? "var(--green)" : "var(--text-muted)" }}>
                          {(v.nombre || "V").split(" ")[0]} {(v.nombre || "").split(" ")[1]?.[0] || ""}.
                        </span>
                      ))}
                    </div>
                  )}
                  {/* ── Material asignado desde Logística ─────────────── */}
                  {(() => {
                    const loc = locs.find(l => l.id === p.localizacionId);
                    const items = loc ? (matPorLoc[loc.nombre] || []) : [];
                    if (!items.length) return null;
                    return (
                      <div style={{ marginTop: "0.6rem", padding: "0.5rem 0.65rem",
                        background: "var(--surface2)", borderRadius: 8,
                        border: "1px solid rgba(34,211,238,0.15)",
                        borderLeft: "2px solid var(--cyan)" }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", marginBottom: "0.3rem" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                            color: "var(--cyan)", fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: ".04em" }}>
                            📦 Material asignado ({items.length})
                          </span>
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",
                              { detail: { block: "logistica", subtab: "material" } }))}
                            style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)",
                              padding: ".1rem .35rem", borderRadius: 3, cursor: "pointer",
                              border: "1px solid rgba(34,211,238,.25)",
                              background: "rgba(34,211,238,.08)", color: "var(--cyan)" }}>
                            Ver en Logística →
                          </button>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem" }}>
                          {items.map((item, i) => (
                            <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                              padding: ".15rem .45rem", borderRadius: 4,
                              background: "var(--surface)", border: "1px solid var(--border)",
                              color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                              {item.nombre}
                              <span style={{ color: "var(--cyan)", fontWeight: 700, marginLeft: ".25rem" }}>
                                ×{item.cantidad} {item.unidad}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost" style={{ padding: "0.28rem 0.45rem", fontSize: "var(--fs-sm)" }} onClick={() => onEditPuesto(p)} aria-label="Editar">✏️</button>
                  <button className="btn btn-red" style={{ padding: "0.28rem 0.45rem", fontSize: "var(--fs-sm)" }} onClick={() => onDeletePuesto(p.id)} aria-label="Cerrar">✕</button>
                </div>
              </div>
            </div>
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
    toast.success("CSV de tallas exportado");
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
    toast.success("Resumen de tallas exportado");
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

      {/* ── Banner de integración con Camisetas ── */}
      <div style={{ display:"flex", alignItems:"center", gap:".75rem", padding:".6rem .85rem",
        borderRadius:8, background:"rgba(34,211,238,.06)", border:"1px solid rgba(34,211,238,.15)",
        marginBottom:".85rem" }}>
        <span style={{ fontSize:"var(--fs-lg)", flexShrink:0 }}>👕</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700, color:"var(--cyan)" }}>
            Integración con Camisetas
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:".1rem" }}>
            Estos datos se sincronizan automáticamente con el bloque Camisetas como «Fuente Voluntarios».
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ flexShrink:0 }}
          onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail:{ block:"camisetas" } }))}>
          Ir a Camisetas →
        </button>
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
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, width: 36, textAlign: "right", color: n > 0 ? "var(--cyan)" : "var(--text-dim)" }}>{t}</span>
                <div style={{ flex: 1 }}>
                  <div className="prog-bar" style={{ height: 8 }}>
                    <div className="prog-fill" style={{ width: `${barPct}%`, background: n > 0 ? "var(--cyan)" : "var(--surface3)" }} />
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", width: 40, textAlign: "right", color: n > 0 ? "var(--text)" : "var(--text-dim)" }}>{n}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", width: 35, color: "var(--text-muted)" }}>{n > 0 ? `${pct}%` : ""}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--surface2)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>TOTAL CAMISETAS</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--cyan)" }}>{total}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Listado para pedido</div>
        <div className="tallas-grid">
          {TALLAS.filter(t => stats.tallasCount[t] > 0).map(t => (
            <div key={t} className="talla-cell">
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-lg)", fontWeight: 800, color: "var(--cyan)" }}>{stats.tallasCount[t]}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginTop: "0.15rem" }}>{t}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── TAB DÍA D ────────────────────────────────────────────────────────────────
function TabDiaD({ puestosConStats, voluntarios, onUpdateVol, diasHastaEvento = 999 }) {
  const [vista, setVista]                   = useState("puesto"); // "puesto" | "nombre"
  const [puestoSeleccionado, setPuestoSeleccionado] = useState("todos");
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [busquedaDiaD, setBusquedaDiaD]     = useState("");

  const marcarPresencia = (id, presente) => {
    const horaLlegada = presente ? new Date().toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' }) : null;
    onUpdateVol(id, { enPuesto: presente, ...(presente && horaLlegada ? { horaLlegada } : { horaLlegada: null }) });
    setUltimoGuardado(id);
    setTimeout(() => setUltimoGuardado(null), 1200);
  };

  const marcarAusente = (id) => {
    onUpdateVol(id, { estado: "ausente", enPuesto: false, horaLlegada: null });
    setUltimoGuardado(id);
    setTimeout(() => setUltimoGuardado(null), 1200);
  };

  // Detectar voluntarios confirmados que deberían estar en su puesto pero no han llegado
  const ahora = new Date();
  const horaActual = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
  const volsRetrasados = voluntarios.filter(v => {
    if (v.estado !== "confirmado" || v.enPuesto) return false;
    const puesto = (puestosConStats || []).find(p => p.id === v.puestoId);
    if (!puesto || !puesto.horaInicio) return false;
    // Resaltar si han pasado más de 30 min desde el inicio del puesto
    const [h, m] = puesto.horaInicio.split(":").map(Number);
    const minutosInicio = h * 60 + m;
    const minutosActual = ahora.getHours() * 60 + ahora.getMinutes();
    return minutosActual > minutosInicio + 30;
  });

  const volsBase = voluntarios.filter(v => v.estado === "confirmado" || v.estado === "pendiente" || v.estado === "ausente");

  // Voluntarios filtrados por búsqueda y puesto (para vista por nombre)
  const volsFiltrados = (() => {
    const base = puestoSeleccionado === "todos"
      ? volsBase
      : volsBase.filter(v => String(v.puestoId) === puestoSeleccionado);
    if (!busquedaDiaD.trim()) return base;
    const q = busquedaDiaD.toLowerCase();
    return base.filter(v =>
      (v.nombre + " " + (v.apellidos || "")).toLowerCase().includes(q) ||
      (v.telefono || "").includes(q)
    );
  })();

  // Datos agrupados por puesto (para vista por puesto)
  const puestosAgrupados = puestosConStats.map(p => {
    const vols = volsBase.filter(v => String(v.puestoId) === String(p.id));
    const presentes   = vols.filter(v => v.enPuesto).length;
    const confirmados = vols.filter(v => v.estado === "confirmado").length;
    return { puesto: p, vols, presentes, confirmados };
  }).filter(g => g.vols.length > 0)
    .sort((a, b) => (a.puesto.horaInicio || "").localeCompare(b.puesto.horaInicio || ""));

  // Sin puesto asignado
  const sinPuesto = volsBase.filter(v => !v.puestoId ||
    !puestosConStats.find(p => String(p.id) === String(v.puestoId)));

  const presentes = voluntarios.filter(v => v.enPuesto && v.estado === "confirmado").length;
  const totalConf = voluntarios.filter(v => v.estado === "confirmado").length;

  // Fila individual de voluntario reutilizable
  const FilaVol = ({ v, mostrarPuesto = false }) => {
    const puesto = puestosConStats.find(p => p.id === v.puestoId);
    return (
      <div className={cls("checklist-row", v.enPuesto ? "presente" : "")}
        style={{ borderLeft: v.estado === "pendiente" ? "3px solid var(--amber)" : undefined }}>
        <button onClick={() => marcarPresencia(v.id, !v.enPuesto)}
          style={{ width: 24, height: 24, borderRadius: 5, flexShrink: 0,
            border: `2px solid ${v.enPuesto ? "var(--green)" : ultimoGuardado===v.id ? "var(--cyan)" : "var(--border)"}`,
            background: v.enPuesto ? "var(--green)" : "transparent",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
            boxShadow: ultimoGuardado===v.id ? "0 0 8px rgba(34,211,238,0.4)" : "none" }}>
          {v.enPuesto && <span style={{ color: "#000", fontSize: "var(--fs-base)", fontWeight: 700 }}>✓</span>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "var(--fs-base)",
            color: v.enPuesto ? "var(--green)" : v.estado === "pendiente" ? "var(--amber)" : "var(--text)" }}>
            {v.nombre}{v.apellidos ? (" " + v.apellidos) : ""}
            {v.estado === "pendiente" && (
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                color:"var(--amber)", marginLeft:".4rem" }}>PENDIENTE</span>
            )}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
            {mostrarPuesto && puesto ? `${puesto.nombre} · ` : ""}{v.telefono || "Sin teléfono"}
          </div>
          {(v.telefonoEmergencia || v.contactoEmergencia) && (
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--red)" }}>
              🚨 {v.telefonoEmergencia || v.contactoEmergencia}
            </div>
          )}
        </div>
        {v.talla && <span className="badge badge-cyan">{v.talla}</span>}
        {v.coche && <span style={{ fontSize: "var(--fs-base)" }} title="Tiene coche">🚗</span>}
        {v.estado === "ausente" && (
          <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
            color:"var(--orange)", background:"var(--orange-dim)",
            border:"1px solid var(--orange-border)", borderRadius:4,
            padding:"0 .35rem", flexShrink:0 }}>
            ⚠ Ausente
          </span>
        )}
        {v.enPuesto && (
          <span title={"En puesto" + (v.horaLlegada ? " · " + v.horaLlegada : "")}
            style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
              color:"var(--green)", background:"rgba(52,211,153,.1)",
              border:"1px solid rgba(52,211,153,.25)", borderRadius:4,
              padding:"0 .35rem", flexShrink:0 }}>
            📍{v.horaLlegada || ""}
          </span>
        )}
        {v.camisetaEntregada && (
          <span title="Camiseta entregada"
            style={{ fontSize:"var(--fs-base)", flexShrink:0 }}>🎽</span>
        )}
        {!v.enPuesto && v.estado !== "ausente" && (
          <button
            title="Marcar como ausente (no ha aparecido)"
            onClick={e => { e.stopPropagation(); marcarAusente(v.id); }}
            style={{ background:"none", border:"1px solid var(--orange-border)", borderRadius:5,
              color:"var(--orange)", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              padding:".1rem .4rem", cursor:"pointer", flexShrink:0, opacity:.7 }}>
            ⚠
          </button>
        )}
        {v.telefono && (
          <a href={`tel:${v.telefono}`}
            style={{ fontSize: "var(--fs-base)", color: "var(--cyan)", textDecoration: "none", flexShrink: 0 }}
            title={`Llamar a ${v.nombre}`}>📞</a>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">🏁 Día de Carrera</div>
          <div className="page-desc">Checklist de asistencia · {diasHastaEvento >= 0 ? `${diasHastaEvento} días para el evento` : "¡Día de carrera!"}</div>
        </div>
        <div style={{ display:"flex", gap:".5rem" }}>

      {/* Alerta voluntarios retrasados */}
      {volsRetrasados.length > 0 && (
        <div style={{ background:"var(--orange-dim)", border:"1px solid var(--orange-border)",
          borderRadius:8, padding:".5rem .85rem", marginBottom:".65rem",
          display:"flex", alignItems:"center", gap:".65rem" }}>
          <span style={{ fontSize:"1.1rem" }}>⚠️</span>
          <div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700, color:"var(--orange)" }}>
              {volsRetrasados.length} voluntario{volsRetrasados.length > 1 ? "s" : ""} con más de 30 min de retraso
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", lineHeight:1.5 }}>
              {volsRetrasados.map(v => v.nombre?.split(" ")[0] || "V").join(", ")}
            </div>
          </div>
        </div>
      )}
          <div className="mono text-xs" style={{ color: "var(--green)", background: "var(--green-dim)",
            border: "1px solid rgba(52,211,153,0.2)", borderRadius: 6, padding: "0.4rem 0.75rem" }}>
            ✓ {presentes} / {totalConf} en su puesto
          </div>
          <div className="mono text-xs" style={{ color: "var(--cyan)", background: "var(--cyan-dim)",
            border: "1px solid rgba(34,211,238,0.2)", borderRadius: 6, padding: "0.4rem 0.75rem" }}>
            👥 {totalConf} confirmados
          </div>
        </div>
      </div>

      {/* Toggle vista + búsqueda */}
      <div style={{ display: "flex", gap: ".5rem", marginBottom: ".6rem", alignItems: "center" }}>
        <input
          value={busquedaDiaD}
          onChange={e => setBusquedaDiaD(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          style={{ flex: 1, padding: ".45rem .75rem", borderRadius: 8,
            border: "1px solid var(--border)", background: "var(--surface2)",
            color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", outline: "none" }}
        />
        <div style={{ display: "flex", gap: ".3rem", flexShrink: 0 }}>
          <button
            onClick={() => setVista("puesto")}
            className={"filter-pill" + (vista === "puesto" ? " active" : "")}
            style={{ whiteSpace: "nowrap" }}>
            📍 Por puesto
          </button>
          <button
            onClick={() => setVista("nombre")}
            className={"filter-pill" + (vista === "nombre" ? " active" : "")}
            style={{ whiteSpace: "nowrap" }}>
            👤 Por nombre
          </button>
        </div>
      </div>

      {/* ── VISTA POR PUESTO ──────────────────────────────────────────────── */}
      {vista === "puesto" && (
        <>
          {puestosAgrupados.map(({ puesto: p, vols, presentes: pres, confirmados: conf }) => {
            const colorBorde = pres >= conf && conf > 0 ? "var(--green)" : pres > 0 ? "var(--amber)" : "var(--red)";
            const volsFiltPuesto = busquedaDiaD.trim()
              ? vols.filter(v => {
                  const q = busquedaDiaD.toLowerCase();
                  return (v.nombre + " " + (v.apellidos || "")).toLowerCase().includes(q) ||
                    (v.telefono || "").includes(q);
                })
              : vols;
            if (busquedaDiaD.trim() && volsFiltPuesto.length === 0) return null;
            return (
              <div key={p.id} className="card" style={{ marginBottom: ".6rem", padding: 0, overflow: "hidden" }}>
                {/* Cabecera del puesto */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: ".6rem .85rem", borderBottom: "1px solid var(--border)",
                  borderLeft: `3px solid ${colorBorde}` }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>{p.nombre}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                      {p.horaInicio}–{p.horaFin}
                      {p.necesarios ? ` · ${p.necesarios} necesarios` : ""}
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 800,
                    color: colorBorde, flexShrink: 0 }}>
                    {pres}/{conf}
                  </span>
                </div>
                {/* Voluntarios del puesto */}
                <div style={{ padding: "0 .1rem" }}>
                  {volsFiltPuesto.map(v => <FilaVol key={v.id} v={v} mostrarPuesto={false} />)}
                </div>
              </div>
            );
          })}
          {/* Voluntarios sin puesto asignado */}
          {sinPuesto.length > 0 && !busquedaDiaD.trim() && (
            <div className="card" style={{ marginBottom: ".6rem", padding: 0, overflow: "hidden" }}>
              <div style={{ padding: ".6rem .85rem", borderBottom: "1px solid var(--border)",
                borderLeft: "3px solid var(--text-muted)" }}>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-base)", color: "var(--text-muted)" }}>Sin puesto asignado</div>
              </div>
              <div style={{ padding: "0 .1rem" }}>
                {sinPuesto.map(v => <FilaVol key={v.id} v={v} mostrarPuesto={false} />)}
              </div>
            </div>
          )}
          {puestosAgrupados.length === 0 && sinPuesto.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)" }}>
              Sin voluntarios confirmados ni pendientes
            </div>
          )}
        </>
      )}

      {/* ── VISTA POR NOMBRE ─────────────────────────────────────────────── */}
      {vista === "nombre" && (
        <>
          {/* Filtro por puesto en vista nombre */}
          <div className="filter-pill-group" style={{ marginBottom: "1rem" }}>
            <button className={"filter-pill" + (puestoSeleccionado === "todos" ? " active" : "")}
              onClick={() => setPuestoSeleccionado("todos")}>Todos</button>
            {puestosConStats.map(p => (
              <button key={p.id}
                className={"filter-pill" + (puestoSeleccionado === String(p.id) ? " active" : "")}
                onClick={() => setPuestoSeleccionado(String(p.id))}>
                {p.nombre}
              </button>
            ))}
          </div>
          <div className="card">
            {volsFiltrados.length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)",
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)" }}>
                No hay voluntarios para este filtro
              </div>
            )}
            {volsFiltrados.map(v => <FilaVol key={v.id} v={v} mostrarPuesto={true} />)}
          </div>
        </>
      )}
    </>
  );
}

// ─── FICHA VOLUNTARIO ─────────────────────────────────────────────────────────
// ─── HISTORIAL DE CAMBIOS ─────────────────────────────────────────────────────
function HistorialCambios({ historial }) {
  const [expandido, setExpandido] = useState(false);
  const visible = expandido ? historial : historial.slice(0, 3);
  return (
    <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
      borderLeft:"2px solid var(--border)", marginTop:"0.25rem" }}>
      <button
        onClick={() => setExpandido(v => !v)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          width:"100%", background:"none", border:"none", cursor:"pointer", padding:0 }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
          textTransform:"uppercase", fontWeight:700 }}>
          🕐 Historial de cambios
        </div>
        <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)",
          transform: expandido ? "rotate(0deg)" : "rotate(-90deg)", transition:"transform .15s" }}>▼</span>
      </button>
      <div style={{ marginTop:"0.4rem", display:"flex", flexDirection:"column", gap:"0.25rem" }}>
        {visible.map((e, i) => (
          <div key={i} style={{ display:"flex", gap:"0.6rem", fontSize:"var(--fs-sm)",
            padding:"0.25rem 0",
            borderBottom: i < visible.length - 1 ? "1px solid var(--border)" : "none" }}>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              color:"var(--text-dim)", flexShrink:0, minWidth:70 }}>
              {e.fecha}<br/>{e.hora}
            </span>
            <span style={{ color:"var(--text-muted)", lineHeight:1.4 }}>{e.texto}</span>
          </div>
        ))}
        {!expandido && historial.length > 3 && (
          <button onClick={() => setExpandido(true)}
            style={{ background:"none", border:"none", cursor:"pointer",
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan)",
              textAlign:"left", padding:"0.15rem 0" }}>
            + {historial.length - 3} entradas más…
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MENSAJE ORGANIZADOR (editable inline) ────────────────────────────────────
function MensajeOrganizadorEdit({ valor, onChange }) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState(valor);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(valor); }, [valor]);

  const guardar = async () => {
    setSaving(true);
    onChange(draft.trim());
    setSaving(false);
    setEditando(false);
  };

  return (
    <div style={{ background:"rgba(251,191,36,.05)", borderRadius:8, padding:"0.6rem 0.75rem",
      borderLeft:"2px solid var(--amber)", marginTop:"0.25rem",
      border:"1px solid rgba(251,191,36,.2)", borderLeftWidth:2 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:".3rem" }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--amber)",
          fontWeight:700, textTransform:"uppercase" }}>
          📢 Mensaje para el voluntario
        </div>
        <button className="btn btn-ghost btn-sm" style={{ padding:".15rem .45rem", fontSize:"var(--fs-xs)" }}
          onClick={() => { if(editando) { setDraft(valor); setEditando(false); } else setEditando(true); }}>
          {editando ? "✕" : "✏️"}
        </button>
      </div>
      {editando ? (
        <>
          <textarea
            className="inp"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Ej: Recuerda traer ropa de abrigo. El acceso al puesto es por la pista forestal."
            maxLength={300}
            rows={3}
            style={{ fontSize:"var(--fs-sm)", marginBottom:".4rem", resize:"vertical" }}
          />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
              {draft.length}/300 · Visible en el portal del voluntario
            </span>
            <button className="btn btn-ghost btn-sm" onClick={guardar} disabled={saving}>
              {saving ? "…" : "💾 Guardar"}
            </button>
          </div>
        </>
      ) : (
        <div style={{ fontSize:"var(--fs-sm)", lineHeight:1.5, color: valor ? "var(--text)" : "var(--text-dim)",
          fontStyle: valor ? "normal" : "italic" }}>
          {valor || "Sin mensaje — haz click en ✏️ para añadir uno"}
        </div>
      )}
    </div>
  );
}

function FichaVoluntario({ voluntario: v, puestos, locs=[], matPorLoc={}, onClose, onEditar, onEliminar, onEliminarConfirmado, onUpdate }) {
  const { closing: fvClosing, handleClose: fvHandleClose } = useModalClose(onClose);
  const [confirmando, setConfirmando] = useState(false);
  const puesto = puestos.find(p => p.id === v.puestoId);
  const estadoColor = v.estado === "confirmado" ? "var(--green)" : v.estado === "cancelado" ? "var(--red)" : "var(--amber)";
  const iniciales = (n) => (n||"V").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  // Material asignado en Logística para la localización del puesto del voluntario
  const loc = puesto ? locs.find(l => l.id === puesto.localizacionId) : null;
  const materialEnLoc = loc ? (matPorLoc[loc.nombre] || []) : [];

  return (
    <div className={`modal-backdrop${fvClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target===e.currentTarget && fvHandleClose()}>
      <div className={`modal modal-ficha${fvClosing ? " modal-closing" : ""}`} style={{ maxWidth: 460 }}>
        <div style={{ borderTop: "3px solid var(--cyan)", borderRadius: "16px 16px 0 0" }}>
          <div className="modal-header">
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:"var(--cyan-dim)",
                border:"2px solid rgba(34,211,238,0.3)", display:"flex", alignItems:"center",
                justifyContent:"center", fontWeight:800, fontSize:"var(--fs-md)", color:"var(--cyan)", flexShrink:0 }}>
                {iniciales(v.nombre)}
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:"var(--fs-md)" }}>{v.nombre || "Sin nombre"}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:"0.1rem" }}>
                  <span style={{ color:estadoColor, fontWeight:700 }}>{v.estado}</span>
                  {v.rol && <> · {v.rol}</>}
                </div>
                {/* Badges inline de enPuesto y camiseta */}
                <div style={{ display:"flex", gap:".3rem", marginTop:".2rem", flexWrap:"wrap" }}>
                  {v.enPuesto && (
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", fontWeight:700,
                      color:"var(--green)", background:"rgba(52,211,153,.1)",
                      border:"1px solid rgba(52,211,153,.25)", borderRadius:4, padding:".05rem .3rem" }}>
                      📍{v.horaLlegada ? " "+v.horaLlegada : " En puesto"}
                    </span>
                  )}
                  {v.camisetaEntregada && (
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", fontWeight:700,
                      color:"var(--green)", background:"rgba(52,211,153,.1)",
                      border:"1px solid rgba(52,211,153,.25)", borderRadius:4, padding:".05rem .3rem" }}>
                      🎽 Camiseta ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:".35rem", alignItems:"center" }}>
              {onEliminar && (
                <button className="btn btn-ghost" aria-label="Eliminar voluntario"
                  style={{ padding:"0.2rem 0.5rem", fontSize:"var(--fs-sm)", color:"var(--red)", borderColor:"rgba(248,113,113,.25)" }}
                  onClick={() => setConfirmando(true)}>🗑</button>
              )}
              <button className="btn btn-ghost" style={{ padding:"0.2rem 0.5rem", fontSize:"var(--fs-md)" }} onClick={fvHandleClose} aria-label="Cerrar">✕</button>
            </div>
          </div>
        </div>
        <div className="modal-body">
          {/* ── Indicador de acceso al portal ── */}
          {(() => {
            const estadoAcceso = v.sessionToken
              ? (v.pinPersonalizado ? "🔐 PIN personalizado · Sesión activa" : "🔓 Sesión activa · PIN inicial")
              : (v.pinHash ? (v.pinPersonalizado ? "🔐 PIN personalizado · Sin sesión" : "⚪ Registrado · Sin sesión") : "⚠️ Sin acceso configurado");
            const colorAcceso = v.sessionToken ? "var(--green)" : v.pinHash ? "var(--cyan)" : "var(--text-dim)";
            return (
              <div style={{ display:"flex", justifyContent:"space-between",
                padding:".35rem .5rem", marginBottom:".3rem",
                background:"var(--surface2)", borderRadius:6, alignItems:"center" }}>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>🌐 Portal</span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:colorAcceso, fontWeight:700 }}>
                  {estadoAcceso}
                </span>
              </div>
            );
          })()}
          {[
            ["📞 Teléfono",   v.telefono],
            ["✉️ Email",      v.email],
            ["👕 Talla",      v.talla],
            ["🏷️ Rol",        v.rol ? (v.rol === "responsable" ? "Responsable de puesto" : "Voluntario de apoyo") : null],
            ["📍 Puesto",     puesto?.nombre || "Sin asignar"],
            ["🗓 Registrado", v.fechaRegistro],
            ["🚗 Vehículo",   v.coche ? "Sí, tiene coche" : "No"],
            ["🎂 Nacimiento", v.fechaNacimiento ? (() => {
              const años = Math.floor((new Date() - new Date(v.fechaNacimiento)) / (365.25 * 86400000));
              return `${v.fechaNacimiento} (${años} años)`;
            })() : null],
            ["🚨 Emergencia", v.telefonoEmergencia || v.contactoEmergencia],
            ["⚕️ Alergias",  v.alergias || null],
            ["💊 Medicación", v.medicacion || null],
          ].filter(([,val]) => val).map(([label, val]) => {
            const isMedical = label.includes("Alergias") || label.includes("Medicación");
            return (
            <div key={label} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start",
              padding:"0.4rem 0.4rem", borderBottom:"1px solid rgba(30,45,80,0.3)",
              background: isMedical ? "rgba(251,191,36,.05)" : undefined,
              borderLeft: isMedical ? "2px solid var(--amber)" : undefined,
              borderRadius: isMedical ? 4 : undefined,
            }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color: isMedical ? "var(--amber)" : "var(--text-muted)", flexShrink:0 }}>{label}</span>
              <span style={{ fontSize:"var(--fs-base)", fontWeight:600, color: isMedical ? "var(--amber)" : undefined, textAlign:"right", marginLeft:".5rem" }}>{val}</span>
            </div>
          )})}
          {v.notas && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--border)", marginTop:"0.25rem" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                marginBottom:"0.25rem", textTransform:"uppercase" }}>Notas del organizador</div>
              <div style={{ fontSize:"var(--fs-base)", lineHeight:1.5 }}>{v.notas}</div>
            </div>
          )}

          {/* Mensaje del organizador visible por el voluntario en su portal */}
          {onUpdate && (
            <MensajeOrganizadorEdit
              valor={v.mensajeOrganizador || ""}
              onChange={(msg) => onUpdate({ mensajeOrganizador: msg })}
            />
          )}

          {v.notaVoluntario && (
            <div style={{ background:"rgba(34,211,238,.08)", borderRadius:8, padding:"0.75rem 0.85rem",
              borderLeft:"3px solid var(--cyan)", marginTop:"0.5rem",
              border:"1px solid rgba(34,211,238,.2)", borderLeftWidth:3 }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan)",
                marginBottom:"0.35rem", textTransform:"uppercase", fontWeight:700, letterSpacing:".06em" }}>
                📝 Nota del voluntario
              </div>
              <div style={{ fontSize:"var(--fs-base)", lineHeight:1.6, color:"var(--text)" }}>{v.notaVoluntario}</div>
            </div>
          )}

          {/* Historial de cambios */}
          {Array.isArray(v.historial) && v.historial.length > 0 && (
            <HistorialCambios historial={v.historial} />
          )}

          {/* Material del puesto asignado (desde Logística) */}
          {puesto && loc && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--cyan)", marginTop:"0.25rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                marginBottom:"0.3rem" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--cyan)", textTransform:"uppercase", fontWeight:700 }}>
                  📦 Material en tu puesto
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",
                    {detail:{block:"logistica",subtab:"material"}}))}
                  style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", padding:".08rem .3rem",
                    borderRadius:3, border:"1px solid rgba(34,211,238,.3)",
                    background:"rgba(34,211,238,.1)", color:"var(--cyan)", cursor:"pointer" }}>
                  Ver →
                </button>
              </div>
              {materialEnLoc.length === 0 ? (
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--text-dim)" }}>Sin material asignado a {loc.nombre}</div>
              ) : materialEnLoc.slice(0, 5).map((item, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between",
                  fontSize:"var(--fs-sm)", padding:"0.18rem 0",
                  borderBottom: i < Math.min(materialEnLoc.length,5)-1 ? "1px solid var(--border)" : "none" }}>
                  <span className="fw-600">{item.nombre}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    color:"var(--cyan)" }}>{item.cantidad} {item.unidad}</span>
                </div>
              ))}
              {materialEnLoc.length > 5 && (
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--text-dim)", marginTop:"0.2rem" }}>
                  +{materialEnLoc.length - 5} ítems más
                </div>
              )}
            </div>
          )}
        </div>
        {/* Acciones rápidas de estado */}
        {onUpdate && v.estado !== "confirmado" && v.estado !== "cancelado" && (
          <div style={{ padding:"0.6rem 1.25rem", borderTop:"1px solid var(--border)",
            display:"flex", gap:"0.5rem" }}>
            <button
              className="btn btn-green"
              style={{ flex:1, fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)" }}
              onClick={() => onUpdate({ estado:"confirmado" })}>
              ✓ Confirmar voluntario
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
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
              style={{ width:"100%", fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                color:"var(--text-muted)" }}
              onClick={() => onUpdate({ estado:"pendiente" })}>
              ↩ Mover a pendiente
            </button>
          </div>
        )}
        <div className="modal-footer" style={{ justifyContent:"space-between" }}>
          {/* ── Entrega de camiseta (toggle organizador) ── */}
          {onUpdate && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:".65rem .85rem", borderTop:"1px solid var(--border)",
              background: v.camisetaEntregada ? "rgba(52,211,153,.06)" : "var(--surface2)",
              transition:"background .2s" }}>
              <div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                  color: v.camisetaEntregada ? "var(--green)" : "var(--text-muted)" }}>
                  🎽 Camiseta {v.talla ? `(${v.talla})` : ""}
                </div>
                {v.camisetaEntregada && (
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", color:"var(--green)", marginTop:"0.1rem" }}>
                    Entregada al voluntario
                  </div>
                )}
              </div>
              <button
                className={`btn btn-sm ${v.camisetaEntregada ? "btn-green" : "btn-ghost"}`}
                onClick={() => onUpdate({ camisetaEntregada: !v.camisetaEntregada })}
                style={{ minWidth:100, fontWeight:700 }}>
                {v.camisetaEntregada ? "✓ Entregada" : "Marcar entregada"}
              </button>
            </div>
          )}
          {!confirmando ? (
            <>
              <button className="btn btn-red" onClick={() => setConfirmando(true)}>🗑 Eliminar</button>
              <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
                {/* Botones del portal del voluntario */}
                {v.telefono && (
                  <button className="btn btn-ghost btn-sm"
                    title="Copiar enlace al portal del voluntario"
                    onClick={() => {
                      const url = window.location.origin + "/voluntarios/mi-ficha";
                      navigator.clipboard?.writeText(url).then(() => toast.success("Enlace al portal copiado"));
                    }}>
                    📱 Portal
                  </button>
                )}
                {v.telefono && onUpdate && (
                  <button className="btn btn-ghost btn-sm"
                    title="Resetear PIN al valor inicial (últimos 4 del teléfono)"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/voluntarios?action=reset-pin", {
                          method: "POST",
                          headers: { "Content-Type":"application/json", "x-api-key": import.meta.env.VITE_API_KEY },
                          body: JSON.stringify({ voluntarioId: v.id }),
                        });
                        const d = await res.json();
                        if(res.ok) {
                          // Actualizar estado local para reflejar el reset inmediatamente
                          if (onUpdate) onUpdate({ pinPersonalizado: false, sessionToken: null });
                          toast.success("PIN reseteado. El voluntario debe usar los últimos 4 dígitos de su teléfono.");
                        } else toast.error(d.error || "Error al resetear PIN");
                      } catch { toast.error("Error de conexión"); }
                    }}>
                    🔑 Reset PIN
                  </button>
                )}
                <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
                <button className="btn btn-cyan" onClick={onEditar}>✏️ Editar</button>
              </div>
            </>
          ) : (
            <>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--red)", flex:1 }}>¿Eliminar a {v.nombre}?</span>
              <button className="btn btn-ghost" onClick={() => setConfirmando(false)}>Cancelar</button>
              <button className="btn btn-red" onClick={() => { if(onEliminarConfirmado) onEliminarConfirmado(); else onEliminar(); }}>Sí, eliminar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FICHA PUESTO ─────────────────────────────────────────────────────────────
function FichaPuesto({ puesto: p, voluntarios, locs=[], matPorLoc={}, rutas=[], onClose, onEditar, onEliminar, onFichaVol }) {
  const { closing: fpuClosing, handleClose: fpuHandleClose } = useModalClose(onClose);
  const asignados = voluntarios.filter(v => v.puestoId === p.id && v.estado !== "cancelado");
  const confirmados = asignados.filter(v => v.estado === "confirmado").length;
  const cobertura = p.necesarios > 0 ? Math.round(asignados.length / p.necesarios * 100) : 0;
  const color = cobertura >= 100 ? "var(--green)" : cobertura >= 50 ? "var(--amber)" : "var(--red)";

  // Material asignado en Logística para la localización vinculada
  const loc = locs.find(l => l.id === p.localizacionId);
  const materialEnLoc = loc ? (matPorLoc[loc.nombre] || []) : [];

  // Rutas que pasan por esta localización (buscar nombre del puesto o de la loc en las paradas)
  const rutasPorAqui = rutas.filter(r =>
    (r.paradas || []).some(pa =>
      (loc && pa.puesto && pa.puesto.toLowerCase().includes(loc.nombre.toLowerCase())) ||
      pa.puesto?.toLowerCase().includes(p.nombre.toLowerCase())
    )
  );

  return (
    <div className={`modal-backdrop${fpuClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target===e.currentTarget && fpuHandleClose()}>
      <div className={`modal modal-ficha${fpuClosing ? " modal-closing" : ""}`} style={{ maxWidth: 460 }}>
        <div style={{ borderTop: "3px solid var(--violet)", borderRadius: "16px 16px 0 0" }}>
          <div className="modal-header">
            <div>
              <div style={{ fontWeight:800, fontSize:"var(--fs-md)" }}>{p.nombre}</div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:"0.1rem" }}>
                {p.tipo} · {p.horaInicio} – {p.horaFin}
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding:"0.2rem 0.5rem", fontSize:"var(--fs-md)" }} onClick={fpuHandleClose} aria-label="Cerrar">✕</button>
          </div>
        </div>
        <div className="modal-body">
          {/* Barra cobertura */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.35rem" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>Cobertura</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", fontWeight:700, color }}>
                {asignados.length}/{p.necesarios} ({cobertura}%)
              </span>
            </div>
            <div style={{ height:6, background:"var(--surface3)", borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.min(cobertura,100)}%`, background:color, borderRadius:3, transition:"width .4s" }}/>
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:"0.25rem" }}>
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
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>{label}</span>
              <span style={{ fontSize:"var(--fs-base)", fontWeight:600 }}>{val}</span>
            </div>
          ))}
          {p.tiempoLimite && (
            <div style={{ display:"flex", justifyContent:"space-between", padding:"0.5rem 0.75rem",
              margin:"0.3rem 0", borderRadius:8,
              background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.25)" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--amber)", fontWeight:700 }}>
                ⏱ Tiempo límite paso corredor
              </span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-md)", fontWeight:800, color:"var(--amber)" }}>
                {p.tiempoLimite}
              </span>
            </div>
          )}
          {/* Voluntarios asignados */}
          {asignados.length > 0 && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                marginBottom:"0.4rem", textTransform:"uppercase" }}>
                Voluntarios asignados ({asignados.length})
              </div>
              {asignados.map(v => (
                <div key={v.id}
                  onClick={() => onFichaVol && onFichaVol(v)}
                  style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"0.45rem 0.5rem", fontSize:"var(--fs-base)",
                    cursor: onFichaVol ? "pointer" : "default",
                    borderRadius:6, marginBottom:"0.15rem",
                    transition:"background .1s",
                  }}
                  onMouseEnter={e => { if(onFichaVol) e.currentTarget.style.background="var(--surface3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="transparent"; }}>
                  <div style={{ display:"flex", alignItems:"center", gap:".5rem" }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
                      background:"var(--surface3)", border:"1px solid var(--border)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                      color:"var(--cyan)" }}>
                      {((v.nombre||"V").trim().split(" ").map(n=>n[0]).slice(0,2).join("")).toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-600">{v.nombre}</div>
                      {v.telefono && (
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                          color:"var(--text-muted)" }}>{v.telefono}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:".4rem" }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color: v.estado==="confirmado"?"var(--green)":v.estado==="ausente"?"var(--orange)":"var(--amber)" }}>
                      {v.estado}
                    </span>
                    {v.enPuesto && (
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                        color:"var(--green)", background:"var(--green-dim)",
                        border:"1px solid var(--green-border)", borderRadius:4,
                        padding:"0 .3rem" }}>📍 {v.horaLlegada||"En puesto"}</span>
                    )}
                    {onFichaVol && <span style={{ color:"var(--text-dim)", fontSize:"var(--fs-xs)" }}>→</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {p.notas && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--border)" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                marginBottom:"0.25rem", textTransform:"uppercase" }}>Notas</div>
              <div style={{ fontSize:"var(--fs-base)", lineHeight:1.5 }}>{p.notas}</div>
            </div>
          )}

          {/* Material asignado en Logística */}
          {loc && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--cyan)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                marginBottom:"0.35rem" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--cyan)", textTransform:"uppercase", fontWeight:700 }}>
                  📦 Material en {loc.nombre}
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",
                    {detail:{block:"logistica",subtab:"material"}}))}
                  style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", padding:".1rem .35rem",
                    borderRadius:3, border:"1px solid rgba(34,211,238,.3)",
                    background:"rgba(34,211,238,.1)", color:"var(--cyan)", cursor:"pointer" }}>
                  Ver en Logística →
                </button>
              </div>
              {materialEnLoc.length === 0 ? (
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--text-dim)" }}>Sin material asignado aún</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"0.2rem" }}>
                  {materialEnLoc.map((item, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between",
                      fontSize:"var(--fs-sm)", padding:"0.2rem 0",
                      borderBottom: i < materialEnLoc.length-1 ? "1px solid var(--border)" : "none" }}>
                      <span className="fw-600">{item.nombre}</span>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                        color:"var(--cyan)" }}>{item.cantidad} {item.unidad}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rutas que pasan por este puesto */}
          {rutasPorAqui.length > 0 && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--amber)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                marginBottom:"0.35rem" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--amber)", textTransform:"uppercase", fontWeight:700 }}>
                  🗺️ Rutas que pasan por aquí
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",
                    {detail:{block:"logistica",subtab:"vehiculos"}}))}
                  style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", padding:".1rem .35rem",
                    borderRadius:3, border:"1px solid rgba(251,191,36,.3)",
                    background:"rgba(251,191,36,.1)", color:"var(--amber)", cursor:"pointer" }}>
                  Ver vehículos →
                </button>
              </div>
              {rutasPorAqui.map(r => {
                const parada = (r.paradas||[]).find(pa =>
                  (loc && pa.puesto?.toLowerCase().includes(loc.nombre.toLowerCase())) ||
                  pa.puesto?.toLowerCase().includes(p.nombre.toLowerCase())
                );
                return (
                  <div key={r.id} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"0.2rem 0",
                    borderBottom:"1px solid var(--border)", fontSize:"var(--fs-sm)" }}>
                    <span className="fw-600">{r.nombre}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"var(--amber)" }}>
                      {parada?.hora || r.horaInicio}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent:"space-between" }}>
          <button className="btn btn-red" onClick={onEliminar}>🗑 Eliminar</button>
          <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
            {asignados.length > 0 && (
              <button className="btn btn-ghost btn-sm"
                title="Exportar lista del puesto a CSV"
                onClick={() => {
                  const header = ["Nombre","Teléfono","Estado","Talla","Vehículo","En puesto","Hora llegada"];
                  const rows = asignados.map(v => [
                    v.nombre || "",
                    v.telefono || "",
                    v.estado || "",
                    v.talla || "",
                    v.coche ? "Sí" : "No",
                    v.enPuesto ? "Sí" : "No",
                    v.horaLlegada || "",
                  ]);
                  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
                  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `voluntarios-${p.nombre.replace(/\s+/g,"-").toLowerCase()}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("CSV exportado ✓");
                }}>
                📊 Exportar CSV
              </button>
            )}
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            <button className="btn btn-cyan" onClick={onEditar}>✏️ Editar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL VOLUNTARIO ─────────────────────────────────────────────────────────
function ModalVoluntario({ voluntario, puestos, onSave, onClose, onEliminar }) {
  const { closing: mvClosing, handleClose: mvHandleClose } = useModalClose(onClose);
  const firstInputRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => firstInputRef.current?.focus(), 60); return () => clearTimeout(t); }, []);
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
    fechaNacimiento: voluntario?.fechaNacimiento || "",
    telefonoEmergencia: voluntario?.telefonoEmergencia || voluntario?.contactoEmergencia || "",
    alergias: voluntario?.alergias || "",
    medicacion: voluntario?.medicacion || "",
  });
  const [errores, setErrores] = useState({});
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (!form.telefono.trim()) e.telefono = "Requerido";
    if (!form.talla) e.talla = "Requerido";
    if (!form.telefonoEmergencia?.trim()) e.telefonoEmergencia = "Requerido — evento deportivo";
    if (form.fechaNacimiento) {
      const años = Math.floor((new Date() - new Date(form.fechaNacimiento)) / (365.25 * 86400000));
      if (años < 18) e.fechaNacimiento = `Menor de edad (${años} años) — se requiere autorización parental`;
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validar()) return;
    // Guardar en telefonoEmergencia (campo canónico) y limpiar el alias viejo contactoEmergencia
    const { contactoEmergencia: _old, ...rest } = { ...form, puestoId: form.puestoId ? parseInt(form.puestoId) : null };
    onSave({ ...rest, telefonoEmergencia: form.telefonoEmergencia, contactoEmergencia: undefined });
  };

  return (
    <div className={`modal-backdrop${mvClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target === e.currentTarget && mvHandleClose()}>
      <div className={`modal modal-ficha${mvClosing ? " modal-closing" : ""}`}>
        <div className="modal-header">
          <span className="modal-title">{voluntario ? "✏️ Editar voluntario" : "➕ Nuevo voluntario"}</span>
          <button className="btn btn-ghost" style={{ padding: "0.2rem 0.5rem" }} onClick={mvHandleClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body">

          {/* ── SECCIÓN 1: Datos personales ───────────────────────────── */}
          <div className="form-section">
            <div className="form-section-label">👤 Datos personales</div>
            <div style={{display:"flex",flexDirection:"column",gap:".65rem"}}>
              <div>
                <label className="field-label" style={{ color: errores.nombre ? "var(--red)" : undefined }}>Nombre completo *</label>
                <input ref={firstInputRef} className="inp" value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Nombre y apellidos" />
                {errores.nombre && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", marginTop: "0.2rem" }}>⚠ {errores.nombre}</div>}
              </div>
              <div className="field-row">
                <div>
                  <label className="field-label" style={{ color: errores.telefono ? "var(--red)" : undefined }}>Teléfono *</label>
                  <input className="inp" value={form.telefono} onChange={e => upd("telefono", e.target.value)} placeholder="612345678" inputMode="tel" />
                  {errores.telefono && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", marginTop: "0.2rem" }}>⚠ {errores.telefono}</div>}
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input className="inp" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="correo@email.com" />
                </div>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 2: Datos operativos ───────────────────────────── */}
          <div className="form-section">
            <div className="form-section-label">🏃 Datos operativos</div>
            <div style={{display:"flex",flexDirection:"column",gap:".65rem"}}>
              <div>
                <label className="field-label" style={{ color: errores.talla ? "var(--red)" : undefined }}>Talla camiseta *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.3rem" }}>
                  {TALLAS.map(t => (
                    <button key={t} onClick={() => upd("talla", t)}
                      style={{ padding: "0.35rem 0.6rem", borderRadius: 6, border: `1px solid ${form.talla === t ? "var(--cyan)" : "var(--border)"}`, background: form.talla === t ? "var(--cyan-dim)" : "var(--surface2)", color: form.talla === t ? "var(--cyan)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, cursor: "pointer", transition: "all 0.12s", transform: form.talla === t ? "scale(1.05)" : "scale(1)" }}>
                      {t}
                    </button>
                  ))}
                </div>
                {errores.talla && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", marginTop: "0.2rem" }}>⚠ {errores.talla}</div>}
              </div>
              <div className="field-row">
                <div>
                  <label className="field-label">Puesto asignado</label>
                  <select className="inp" value={form.puestoId ?? ""} onChange={e => upd("puestoId", e.target.value || null)}>
                    <option value="">Sin asignar</option>
                    {puestos.map(p => {
                      const asig = p._totalAsignados ?? 0;
                      const nec  = p.necesarios ?? 0;
                      const pct  = nec > 0 ? Math.round(asig / nec * 100) : 0;
                      const ico  = pct >= 100 ? "🟢" : pct >= 50 ? "🟡" : "🔴";
                      return (
                        <option key={p.id} value={p.id}>
                          {ico} {p.nombre} · {p.horaInicio}-{p.horaFin} · {asig}/{nec}
                        </option>
                      );
                    })}
                  </select>
                  {form.puestoId && (() => {
                    const p = puestos.find(x => String(x.id) === String(form.puestoId));
                    if (!p) return null;
                    return (
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                        marginTop:".3rem", padding:".3rem .5rem", background:"var(--surface2)", borderRadius:5 }}>
                        🏷 {p.tipo} · {p.distancias?.join(", ")}
                        {p.notas && <> · {p.notas.slice(0, 60)}{p.notas.length > 60 ? "…" : ""}</>}
                      </div>
                    );
                  })()}
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "0.65rem 0.85rem" }}>
                <div>
                  <div style={{ fontSize: "var(--fs-base)", fontWeight: 600 }}>Vehículo propio</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>Facilita traslado a puestos</div>
                </div>
                <button className="toggle-pill" style={{ background: form.coche ? "var(--green)" : "var(--surface3)" }} onClick={() => upd("coche", !form.coche)}>
                  <span className="toggle-pill-dot" style={{ left: form.coche ? 23 : 3 }} />
                </button>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 3: Seguridad ───────────────────────────────────── */}
          <div className="form-section">
            <div className="form-section-label">🔒 Seguridad</div>
            <div style={{display:"flex",flexDirection:"column",gap:".65rem"}}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
                <div>
                  <label className="field-label">🎂 Fecha de nacimiento</label>
                  <input className="inp" type="date"
                    value={form.fechaNacimiento || ""}
                    onChange={e => upd("fechaNacimiento", e.target.value)} />
                  {form.fechaNacimiento && (() => {
                    const años = Math.floor((new Date() - new Date(form.fechaNacimiento)) / (365.25 * 86400000));
                    const esMenor = años < 18;
                    return <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color: esMenor ? "var(--red)" : "var(--text-dim)", marginTop:".2rem",
                      fontWeight: esMenor ? 700 : 400 }}>
                      {esMenor ? `⚠️ ${años} años — menor de edad` : `${años} años`}
                    </div>;
                  })()}
                  {errores.fechaNacimiento && (
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--red)", marginTop:".2rem" }}>
                      ⚠ {errores.fechaNacimiento}
                    </div>
                  )}
                </div>
                <div>
                  <label className="field-label" style={{ color: errores.telefonoEmergencia ? "var(--red)" : undefined }}>
                    🚨 Tel. emergencia *
                  </label>
                  <input className="inp" type="tel"
                    value={form.telefonoEmergencia || ""}
                    onChange={e => upd("telefonoEmergencia", e.target.value)}
                    placeholder="612 345 678"
                    inputMode="tel"
                    style={{ borderColor: errores.telefonoEmergencia ? "var(--red)" : undefined }} />
                  {errores.telefonoEmergencia && (
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"var(--red)", marginTop:".2rem" }}>⚠ {errores.telefonoEmergencia}</div>
                  )}
                </div>
              </div>
              <div>
                <label className="field-label" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span>📝 Notas / Observaciones</span>
                  {form.notas && <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--cyan)",fontWeight:400}}>{form.notas.length} car.</span>}
                </label>
                <textarea className="inp" rows={3} value={form.notas} onChange={e => upd("notas", e.target.value)}
                  placeholder="Experiencia previa, idiomas, titulaciones especiales, restricciones, observaciones del organizador…"
                  style={{ resize: "vertical", fontFamily: "var(--font-display)" }} />
              </div>
              {/* Información médica */}
              <div style={{ background:"rgba(251,191,36,.05)", border:"1px solid rgba(251,191,36,.2)",
                borderRadius:8, padding:".75rem", display:"flex", flexDirection:"column", gap:".6rem" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--amber)",
                  fontWeight:700, textTransform:"uppercase", letterSpacing:".05em" }}>
                  ⚕️ Información médica (seguridad en carrera)
                </div>
                <div>
                  <label className="field-label">⚕️ Alergias conocidas</label>
                  <input className="inp" value={form.alergias||""} onChange={e => upd("alergias", e.target.value)}
                    placeholder="Alimentos, picaduras, medicamentos…" maxLength={200} />
                </div>
                <div>
                  <label className="field-label">💊 Medicación relevante</label>
                  <input className="inp" value={form.medicacion||""} onChange={e => upd("medicacion", e.target.value)}
                    placeholder="Insulina, adrenalina, anticoagulantes…" maxLength={200} />
                </div>
              </div>
            </div>
          </div>

        </div>
        <div className="modal-footer">
          {onEliminar && (
            <button className="btn btn-red" style={{ marginRight:"auto" }} onClick={() => { if(window.confirm("¿Eliminar a "+(form.nombre||"este voluntario")+"?")) onEliminar(); }}>🗑 Eliminar</button>
          )}
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
  const firstInputRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => firstInputRef.current?.focus(), 60); return () => clearTimeout(t); }, []);
  const { closing: mpuClosing, handleClose: mpuHandleClose } = useModalClose(onClose);
  const [form, setForm] = useState(puesto || {
    nombre: "", tipo: "Avituallamiento", distancias: ["Todas"],
    horaInicio: "08:00", horaFin: "15:00", necesarios: 3, responsableId: null, tiempoLimite: "", notas: ""
  });
  const [errMP, setErrMP] = useState({});
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleDist = (d) => setForm(p => ({
    ...p, distancias: p.distancias.includes(d) ? p.distancias.filter(x => x !== d) : [...p.distancias, d]
  }));
  const validarPuesto = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "El nombre del puesto es obligatorio";
    if (!form.necesarios || form.necesarios < 1) e.necesarios = "Mínimo 1 voluntario necesario";
    if (!form.distancias || form.distancias.length === 0) e.distancias = "Selecciona al menos una distancia";
    setErrMP(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className={`modal-backdrop${mpuClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target === e.currentTarget && mpuHandleClose()}>
      <div className={`modal modal-ficha${mpuClosing ? " modal-closing" : ""}`}>
        <div className="modal-header">
          <span className="modal-title">{puesto ? "✏️ Editar puesto" : "📍 Nuevo puesto"}</span>
          <button className="btn btn-ghost" style={{ padding: "0.2rem 0.5rem" }} onClick={mpuHandleClose} aria-label="Cerrar">✕</button>
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
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
              Vincular a una localización maestra sincroniza el tipo y facilita la logística.
            </div>
          </div>
          <div>
            <label className="field-label" style={{ color: errMP.nombre ? "var(--red)" : undefined }}>Nombre del puesto *</label>
            <input ref={firstInputRef} className="inp" autoFocus value={form.nombre}
              onChange={e => { upd("nombre", e.target.value); if (e.target.value.trim()) setErrMP(p=>({...p,nombre:undefined})); }}
              placeholder="Ej: Avituallamiento KM 7"
              style={{ borderColor: errMP.nombre ? "var(--red)" : undefined }} />
            {errMP.nombre && <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--red)", marginTop:".2rem" }}>⚠ {errMP.nombre}</div>}
          </div>
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
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                Corredores que lleguen después de esta hora deben ser retirados de la competición.
              </div>
            </div>
          )}
          <div>
            <label className="field-label" style={{ color: errMP.distancias ? "var(--red)" : undefined }}>Distancias *</label>
            {errMP.distancias && <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--red)", marginBottom:".25rem" }}>⚠ {errMP.distancias}</div>}
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {DISTANCIAS_PUESTO.map(d => (
                <button key={d} onClick={() => toggleDist(d)}
                  style={{ padding: "0.3rem 0.65rem", borderRadius: 6, border: `1px solid ${form.distancias.includes(d) ? DIST_COLORS[d] : "var(--border)"}`, background: form.distancias.includes(d) ? `${DIST_COLORS[d]}18` : "var(--surface2)", color: form.distancias.includes(d) ? DIST_COLORS[d] : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
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
          <button className="btn btn-cyan" onClick={() => { if (validarPuesto()) onSave(form); }}>
            {puesto ? "Guardar cambios" : "Crear puesto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL CONFIRMAR ──────────────────────────────────────────────────────────
function ModalConfirm({ mensaje, onConfirm, onCancel, zIndex }) {
  return (
    <div className="modal-backdrop" style={zIndex ? { zIndex } : undefined} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 380 }}>
        <div className="modal-body" style={{ paddingTop: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "var(--fs-xl)", marginBottom: "0.75rem" }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: "var(--fs-md)", marginBottom: "0.5rem" }}>Confirmar acción</div>
          <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-base)", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>{mensaje}</div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-red" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}
