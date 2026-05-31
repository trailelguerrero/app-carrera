/**
 * OnboardingModal — CFG-01
 * Wizard guiado de 4 pasos para configuración inicial del evento.
 * Solo aparece cuando SK_UI_ONBOARDING_DONE no está en localStorage.
 * Al completar guarda SK_EVENT_CONFIG + SK_UI_ONBOARDING_DONE + PIN.
 * Al cerrar sin completar NO guarda nada.
 */

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { SK_EVENT_CONFIG, SK_UI_ONBOARDING_DONE, SK_VOL_PUESTOS } from "@/constants/storageKeys";
import { savePin } from "@/components/auth/pinAuth";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";

// ── Puestos por defecto ──────────────────────────────────────────────────────
const PUESTOS_DEFAULT = [
  { id: 1,  nombre: "Zona de Salida / Meta",     tipo: "Salida/Meta",       distancias: ["Todas"],            horaInicio: "06:30", horaFin: "18:00", necesarios: 8, responsableId: null, notas: "Control de dorsales, gestión de salidas escalonadas" },
  { id: 2,  nombre: "Avituallamiento KM 4",       tipo: "Avituallamiento",   distancias: ["TG7","TG13","TG25"],horaInicio: "07:30", horaFin: "14:00", necesarios: 4, responsableId: null, notas: "Agua, isotónico, fruta, barritas" },
  { id: 3,  nombre: "Avituallamiento KM 9",       tipo: "Avituallamiento",   distancias: ["TG13","TG25"],      horaInicio: "08:00", horaFin: "15:00", necesarios: 4, responsableId: null, notas: "Agua, isotónico, fruta, geles, sándwiches" },
  { id: 4,  nombre: "Avituallamiento KM 16",      tipo: "Avituallamiento",   distancias: ["TG25"],             horaInicio: "08:30", horaFin: "16:00", necesarios: 5, responsableId: null, notas: "Avituallamiento principal TG25 — comida caliente" },
  { id: 5,  nombre: "Punto Control KM 7",         tipo: "Control",           distancias: ["TG13","TG25"],      horaInicio: "08:00", horaFin: "13:00", necesarios: 2, responsableId: null, notas: "Registro de dorsales, corte de tiempos" },
  { id: 6,  nombre: "Punto Control KM 13",        tipo: "Control",           distancias: ["TG25"],             horaInicio: "09:00", horaFin: "15:00", necesarios: 2, responsableId: null, notas: "Registro de dorsales, corte de tiempos" },
  { id: 7,  nombre: "Seguridad Vial Cruce 1",     tipo: "Seguridad",         distancias: ["Todas"],            horaInicio: "07:00", horaFin: "14:00", necesarios: 2, responsableId: null, notas: "Control de tráfico en cruce principal" },
  { id: 8,  nombre: "Seguridad Vial Cruce 2",     tipo: "Seguridad",         distancias: ["TG13","TG25"],      horaInicio: "07:30", horaFin: "16:00", necesarios: 2, responsableId: null, notas: "Control de tráfico en cruce secundario" },
  { id: 9,  nombre: "Señalización Ruta Alta",     tipo: "Señalización",      distancias: ["TG25"],             horaInicio: "06:00", horaFin: "08:00", necesarios: 3, responsableId: null, notas: "Colocación de balizas tramo alto — madrugada" },
  { id: 10, nombre: "Parking y Accesos",          tipo: "Parking",           distancias: ["Todas"],            horaInicio: "06:00", horaFin: "12:00", necesarios: 4, responsableId: null, notas: "Gestión de aparcamiento y acceso peatonal" },
  { id: 11, nombre: "Zona de Llegada / Trofeos",  tipo: "Organización",      distancias: ["Todas"],            horaInicio: "09:00", horaFin: "18:00", necesarios: 5, responsableId: null, notas: "Recepción finishers, entrega medallas, clasificaciones" },
  { id: 12, nombre: "Primeros Auxilios Base",     tipo: "Primeros Auxilios", distancias: ["Todas"],            horaInicio: "06:30", horaFin: "18:00", necesarios: 3, responsableId: null, notas: "Titulación requerida: socorrismo o enfermería" },
];

const DISTANCIAS_OPCIONES = [
  { id: "TG7",  label: "TG 7 km",  color: "#22d3ee" },
  { id: "TG13", label: "TG 13 km", color: "#a78bfa" },
  { id: "TG25", label: "TG 25 km", color: "#34d399" },
];

const TOTAL_PASOS = 4;

function estadoInicial() {
  return {
    nombre: "Trail El Guerrero", edicion: "2026", fecha: "",
    distancias: { TG7: false, TG13: false, TG25: false },
    maxInscritos: { TG7: "", TG13: "", TG25: "" },
    voluntariosNecesarios: "", cargarPuestos: false,
    nuevoPin: "", confirmarPin: "",
  };
}

function validarPaso(paso, d) {
  if (paso === 1) {
    if (!d.nombre.trim() || !d.edicion.trim() || !d.fecha) return false;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return new Date(d.fecha) > hoy;
  }
  if (paso === 2) {
    const activas = DISTANCIAS_OPCIONES.filter(x => d.distancias[x.id]);
    if (activas.length === 0) return false;
    return activas.every(x => {
      const v = parseInt(d.maxInscritos[x.id], 10);
      return d.maxInscritos[x.id] !== "" && !isNaN(v) && v >= 1;
    });
  }
  if (paso === 3) return true;
  if (paso === 4) {
    return /^\d{4}$/.test(d.nuevoPin)
      && d.nuevoPin !== "1975"
      && d.nuevoPin === d.confirmarPin;
  }
  return false;
}

const SS = {
  input: {
    width: "100%", boxSizing: "border-box",
    background: "#0d1628", border: "1px solid #243460", borderRadius: 8,
    padding: ".55rem .8rem",
    fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "#e8eef8",
    outline: "none", transition: "border-color .15s",
  },
  err: { borderColor: "#f87171" },
  label: {
    display: "block", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
    color: "#7a8aaa", marginBottom: ".35rem", letterSpacing: ".04em", textTransform: "uppercase",
  },
  hintBad: { fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#f87171", marginTop: ".3rem" },
  hintOk:  { fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#34d399",  marginTop: ".3rem" },
};

function Campo({ label, errMsg, okMsg, children }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      {label && <label style={SS.label}>{label}</label>}
      {children}
      {errMsg && <div style={SS.hintBad}>⚠ {errMsg}</div>}
      {!errMsg && okMsg && <div style={SS.hintOk}>✓ {okMsg}</div>}
    </div>
  );
}

// ─── PASO 1 ───────────────────────────────────────────────────────────────────
function Paso1({ d, set }) {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const minDate = new Date(hoy.getTime() + 86400000).toISOString().split("T")[0];
  const errFecha = d.fecha && new Date(d.fecha) <= hoy ? "La fecha debe ser futura" : null;

  return (
    <>
      <Campo label="Nombre del evento *" errMsg={d.nombre !== "" && !d.nombre.trim() ? "Campo requerido" : null}>
        <input className="ob-input-focus"
          style={{ ...SS.input, ...(d.nombre !== "" && !d.nombre.trim() ? SS.err : {}) }}
          value={d.nombre} placeholder="Trail El Guerrero"
          onChange={e => set("nombre", e.target.value)} />
      </Campo>
      <Campo label="Edición *" errMsg={d.edicion !== "" && !d.edicion.trim() ? "Campo requerido" : null}>
        <input className="ob-input-focus"
          style={{ ...SS.input, ...(d.edicion !== "" && !d.edicion.trim() ? SS.err : {}) }}
          value={d.edicion} placeholder="2026"
          onChange={e => set("edicion", e.target.value)} />
      </Campo>
      <Campo label="Fecha del evento *" errMsg={errFecha}>
        <input type="date" className="ob-input-focus"
          style={{ ...SS.input, colorScheme: "dark", ...(errFecha ? SS.err : {}) }}
          value={d.fecha} min={minDate}
          onChange={e => set("fecha", e.target.value)} />
      </Campo>
    </>
  );
}

// ─── PASO 2 ───────────────────────────────────────────────────────────────────
function Paso2({ d, set }) {
  const toggle = (id) => set("distancias", { ...d.distancias, [id]: !d.distancias[id] });
  const setMax = (id, v) => set("maxInscritos", { ...d.maxInscritos, [id]: v });
  const hayActiva = DISTANCIAS_OPCIONES.some(x => d.distancias[x.id]);

  return (
    <>
      {!hayActiva && <div style={{ ...SS.hintBad, marginBottom: ".75rem" }}>⚠ Selecciona al menos una distancia</div>}
      {DISTANCIAS_OPCIONES.map(({ id, label, color }) => {
        const activa = d.distancias[id];
        const maxV = d.maxInscritos[id];
        const maxErr = activa && maxV !== "" && (isNaN(parseInt(maxV, 10)) || parseInt(maxV, 10) < 1);
        return (
          <div key={id} style={{
            marginBottom: ".85rem",
            border: `1px solid ${activa ? color + "55" : "#243460"}`,
            borderRadius: 10, overflow: "hidden",
            background: activa ? `${color}08` : "transparent", transition: "all .15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".7rem 1rem", cursor: "pointer" }}
              onClick={() => toggle(id)}>
              <div style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                border: `2px solid ${activa ? color : "#3a4a6a"}`,
                background: activa ? color : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
              }}>
                {activa && <span style={{ color: "#0d1628", fontSize: 13, fontWeight: 900, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "var(--fs-base)", color: activa ? color : "#5a6a8a", transition: "color .15s" }}>
                {label}
              </span>
            </div>
            {activa && (
              <div style={{ padding: ".2rem 1rem .85rem", borderTop: `1px solid ${color}22` }}>
                <label style={{ ...SS.label, color: color + "cc" }}>Máximo de inscritos</label>
                <input type="number" min="1" className="ob-input-focus"
                  style={{ ...SS.input, width: "50%", ...(maxErr ? SS.err : {}) }}
                  value={maxV} placeholder="300"
                  onChange={e => setMax(id, e.target.value)} />
                {maxErr && <div style={SS.hintBad}>⚠ Introduce un número válido ≥ 1</div>}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ─── PASO 3 ───────────────────────────────────────────────────────────────────
function Paso3({ d, set }) {
  const numErr = d.voluntariosNecesarios !== "" && (isNaN(parseInt(d.voluntariosNecesarios, 10)) || parseInt(d.voluntariosNecesarios, 10) < 1);
  return (
    <>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "#7a8aaa", lineHeight: 1.6, marginBottom: "1.25rem" }}>
        Este número se usa para el KPI de cobertura de voluntarios en el Dashboard.
        Puedes dejarlo vacío y configurarlo más tarde en Configuración.
      </p>
      <Campo label="Voluntarios necesarios en total" errMsg={numErr ? "Debe ser un número mayor que 0" : null}>
        <input type="number" min="1" className="ob-input-focus"
          style={{ ...SS.input, width: "50%", ...(numErr ? SS.err : {}) }}
          value={d.voluntariosNecesarios} placeholder="45"
          onChange={e => set("voluntariosNecesarios", e.target.value)} />
      </Campo>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: ".75rem", padding: ".85rem",
        borderRadius: 10, cursor: "pointer",
        border: `1px solid ${d.cargarPuestos ? "#22d3ee55" : "#243460"}`,
        background: d.cargarPuestos ? "rgba(34,211,238,0.05)" : "transparent", transition: "all .15s",
      }} onClick={() => set("cargarPuestos", !d.cargarPuestos)}>
        <div style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
          border: `2px solid ${d.cargarPuestos ? "#22d3ee" : "#3a4a6a"}`,
          background: d.cargarPuestos ? "#22d3ee" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
        }}>
          {d.cargarPuestos && <span style={{ color: "#0d1628", fontSize: 13, fontWeight: 900, lineHeight: 1 }}>✓</span>}
        </div>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "var(--fs-base)", color: d.cargarPuestos ? "#22d3ee" : "#9aabb8", marginBottom: ".2rem" }}>
            Cargar puestos de voluntario por defecto
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#5a6a8a", lineHeight: 1.5 }}>
            {PUESTOS_DEFAULT.length} puestos preconfigurados (salida/meta, avituallamientos, controles…).
            Editables en el módulo Voluntarios.
          </div>
        </div>
      </div>
    </>
  );
}

// ─── PASO 4 ───────────────────────────────────────────────────────────────────
function Paso4({ d, set }) {
  const [verPin, setVerPin]   = useState(false);
  const [verConf, setVerConf] = useState(false);

  const pVacio    = d.nuevoPin === "";
  const pCorto    = !pVacio && d.nuevoPin.length < 4;
  const pDefault  = !pVacio && d.nuevoPin.length === 4 && d.nuevoPin === "1975";
  const noMatch   = d.confirmarPin !== "" && d.nuevoPin !== d.confirmarPin;
  const pinOk     = /^\d{4}$/.test(d.nuevoPin) && d.nuevoPin !== "1975";
  const confOk    = pinOk && d.nuevoPin === d.confirmarPin;

  const errPin = pCorto   ? "El PIN debe tener 4 dígitos"
               : pDefault ? `No puedes usar el PIN por defecto (1975)`
               : null;

  const ToggleBtn = ({ ver, onToggle }) => (
    <button type="button" onClick={onToggle} style={{
      position: "absolute", right: ".6rem", background: "none", border: "none",
      cursor: "pointer", color: "#5a6a8a", fontSize: "var(--fs-base)", padding: 0,
    }}>
      {ver ? "🙈" : "👁"}
    </button>
  );

  return (
    <>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "#7a8aaa", lineHeight: 1.6, marginBottom: "1.25rem" }}>
        Debes cambiar el PIN de administrador por defecto antes de continuar.
        Este PIN protege el acceso al panel de gestión del evento.
      </p>
      <Campo label="Nuevo PIN (4 dígitos) *" errMsg={errPin} okMsg={pinOk ? "PIN válido" : null}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <input type={verPin ? "text" : "password"} inputMode="numeric" maxLength={4} className="ob-input-focus"
            style={{ ...SS.input, letterSpacing: verPin ? ".15em" : ".5em", paddingRight: "2.5rem", ...(errPin ? SS.err : {}) }}
            value={d.nuevoPin} placeholder="····"
            onChange={e => set("nuevoPin", e.target.value.replace(/\D/g, "").slice(0, 4))} />
          <ToggleBtn ver={verPin} onToggle={() => setVerPin(v => !v)} />
        </div>
      </Campo>
      <Campo label="Confirmar PIN *" errMsg={noMatch ? "Los PINs no coinciden" : null} okMsg={confOk ? "Los PINs coinciden" : null}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <input type={verConf ? "text" : "password"} inputMode="numeric" maxLength={4} className="ob-input-focus"
            style={{ ...SS.input, letterSpacing: verConf ? ".15em" : ".5em", paddingRight: "2.5rem", ...(noMatch ? SS.err : {}) }}
            value={d.confirmarPin} placeholder="····"
            onChange={e => set("confirmarPin", e.target.value.replace(/\D/g, "").slice(0, 4))} />
          <ToggleBtn ver={verConf} onToggle={() => setVerConf(v => !v)} />
        </div>
      </Campo>
      <div style={{
        padding: ".65rem .85rem",
        background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)",
        borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#f87171", lineHeight: 1.6,
      }}>
        🔒 El PIN por defecto <strong style={{ color: "#fca5a5" }}>(1975)</strong> es conocido
        por todos los usuarios de la app. Cambiarlo es obligatorio.
      </div>
    </>
  );
}

// ─── META PASOS ───────────────────────────────────────────────────────────────
const META = [
  { titulo: "El evento",              subtitulo: "Datos básicos del evento" },
  { titulo: "Las distancias",         subtitulo: "Distancias y aforos máximos" },
  { titulo: "Los voluntarios",        subtitulo: "Planificación de personal (opcional)" },
  { titulo: "El PIN de administrador",subtitulo: "Seguridad de acceso al panel" },
];

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function OnboardingModal({ onClose, onComplete }) {
  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState(estadoInicial);

  const set = useCallback((campo, valor) => setDatos(p => ({ ...p, [campo]: valor })), []);

  const valido = validarPaso(paso, datos);
  const meta   = META[paso - 1];

  const irSiguiente = () => { if (valido && paso < TOTAL_PASOS) setPaso(p => p + 1); };
  const irAtras     = () => { if (paso > 1) setPaso(p => p - 1); };
  const saltar      = () => setPaso(p => p + 1);

  const completar = () => {
    if (!valido) return;

    // Leer config existente para no pisarla
    let cfgExistente = {};
    try { cfgExistente = JSON.parse(localStorage.getItem(SK_EVENT_CONFIG) || "{}"); } catch (_e) { /* ignore parse error */ }

    const distanciasActivas = DISTANCIAS_OPCIONES.filter(x => datos.distancias[x.id]).map(x => x.id);
    const maxInscritosMapa = {};
    distanciasActivas.forEach(id => { maxInscritosMapa[id] = parseInt(datos.maxInscritos[id], 10) || 0; });

    const nuevaConfig = {
      ...EVENT_CONFIG_DEFAULT,
      ...cfgExistente,
      nombre:  datos.nombre.trim(),
      edicion: datos.edicion.trim(),
      fecha:   datos.fecha,
      distanciasActivas,
      maxInscritos: maxInscritosMapa,
      voluntariosNecesarios: datos.voluntariosNecesarios
        ? parseInt(datos.voluntariosNecesarios, 10)
        : (cfgExistente.voluntariosNecesarios || 0),
    };
    localStorage.setItem(SK_EVENT_CONFIG, JSON.stringify(nuevaConfig));

    // Cargar puestos por defecto solo si no hay ninguno ya
    if (datos.cargarPuestos) {
      let puestosActuales = [];
      try { puestosActuales = JSON.parse(localStorage.getItem(SK_VOL_PUESTOS) || "[]"); } catch (_e) { /* ignore parse error */ }
      if (puestosActuales.length === 0) {
        localStorage.setItem(SK_VOL_PUESTOS, JSON.stringify(PUESTOS_DEFAULT));
      }
    }

    // Cambiar PIN
    savePin(datos.nuevoPin);

    // Marcar onboarding completo
    localStorage.setItem(SK_UI_ONBOARDING_DONE, "1");

    onComplete();
  };

  const renderPaso = () => {
    if (paso === 1) return <Paso1 d={datos} set={set} />;
    if (paso === 2) return <Paso2 d={datos} set={set} />;
    if (paso === 3) return <Paso3 d={datos} set={set} />;
    if (paso === 4) return <Paso4 d={datos} set={set} />;
  };

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem", animation: "ob-fade 0.25s ease",
    }}>
      <style>{`
        @keyframes ob-fade  { from{opacity:0}                        to{opacity:1} }
        @keyframes ob-slide { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        .ob-input-focus:focus { border-color: #6366f1 !important; outline: none; }
        .ob-btn:hover:not(:disabled) { opacity: .85; }
        .ob-btn:active:not(:disabled) { transform: scale(.97); }
        .ob-skip:hover { color: #9aabb8 !important; }
      `}</style>

      <div style={{
        background: "var(--bg)", border: "1px solid #243460", borderRadius: 18,
        width: "100%", maxWidth: 520, maxHeight: "92vh", overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.75)", animation: "ob-slide 0.28s ease",
      }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ padding: "1.4rem 1.6rem .9rem", borderBottom: "1px solid #1e2d50" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".75rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#6366f1", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>
              Paso {paso} de {TOTAL_PASOS}
            </div>
            <button onClick={onClose} title="Cerrar sin guardar" style={{
              background: "none", border: "none", cursor: "pointer", color: "#3a4a6a",
              fontSize: "var(--fs-lg)", lineHeight: 1, padding: ".2rem", borderRadius: 6, transition: "color .15s",
            }}
              onMouseEnter={e => e.currentTarget.style.color = "#7a8aaa"}
              onMouseLeave={e => e.currentTarget.style.color = "#3a4a6a"}>
              ×
            </button>
          </div>

          {/* Barra de progreso */}
          <div style={{ height: 4, background: "#1e2d50", borderRadius: 4, marginBottom: "1rem", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${(paso / TOTAL_PASOS) * 100}%`,
              background: "linear-gradient(90deg, #6366f1, #a78bfa)", borderRadius: 4,
              transition: "width .35s cubic-bezier(.4,0,.2,1)",
            }} />
          </div>

          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "var(--fs-lg)", color: "#e8eef8", marginBottom: ".25rem" }}>
            {meta.titulo}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "#5a6a8a" }}>
            {meta.subtitulo}
          </div>
        </div>

        {/* ── Contenido ───────────────────────────────────────────────────── */}
        <div style={{ padding: "1.25rem 1.6rem", overflowY: "auto", flex: 1 }}>
          {renderPaso()}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{
          padding: ".9rem 1.6rem", borderTop: "1px solid #1e2d50",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem",
        }}>
          {/* Atrás */}
          <div style={{ minWidth: 80 }}>
            {paso > 1 && (
              <button className="ob-btn" onClick={irAtras} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid #243460", borderRadius: 8,
                padding: ".5rem 1rem", fontFamily: "'Syne', sans-serif", fontWeight: 700,
                fontSize: "var(--fs-sm)", color: "#7a8aaa", cursor: "pointer", transition: "all .15s",
              }}>
                ← Atrás
              </button>
            )}
          </div>

          {/* Saltar (solo paso 3) */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            {paso === 3 && (
              <button className="ob-skip" onClick={saltar} style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                color: "#5a6a8a", textDecoration: "underline", transition: "color .15s",
              }}>
                Saltar este paso
              </button>
            )}
          </div>

          {/* Siguiente / Empezar */}
          {paso < TOTAL_PASOS ? (
            <button className="ob-btn" onClick={irSiguiente} disabled={!valido} style={{
              background: valido ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.06)",
              color: valido ? "#a78bfa" : "#3a4a6a",
              border: `1px solid ${valido ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.1)"}`,
              borderRadius: 8, padding: ".5rem 1.25rem",
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: "var(--fs-base)", cursor: valido ? "pointer" : "not-allowed",
              transition: "all .15s", whiteSpace: "nowrap",
            }}>
              Siguiente →
            </button>
          ) : (
            <button className="ob-btn" onClick={completar} disabled={!valido} style={{
              background: valido ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(16,185,129,0.08)",
              color: valido ? "#fff" : "#3a4a6a",
              border: `1px solid ${valido ? "#10b981" : "rgba(16,185,129,0.15)"}`,
              borderRadius: 8, padding: ".55rem 1.4rem",
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: "var(--fs-base)", cursor: valido ? "pointer" : "not-allowed",
              transition: "all .15s", whiteSpace: "nowrap",
              boxShadow: valido ? "0 4px 16px rgba(16,185,129,0.3)" : "none",
            }}>
              ¡Empezar! 🚀
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
