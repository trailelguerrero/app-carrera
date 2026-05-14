/**
 * SeccionCentroControl.jsx — Fase 7, Tarea DASH-01
 * Fusiona "Haz esto ahora" (SeccionAcciones) y "Alertas críticas / Avisos"
 * (SeccionAlertas) en una única sección unificada "Centro de control".
 *
 * Jerarquía visual:
 *   🔴 Crítico   — alertasCriticas + acciones con prioridad "critica"
 *   🟠 Alta      — acciones con prioridad "alta"
 *   🔵 Informativo — alertasAvisos + acciones con prioridad "media"
 *
 * Los avisos informativos son colapsables y persisten en localStorage.
 */
import { fmtEur } from "@/lib/utils";
import { SK_UI_DASH_ALERTAS_OPEN } from "@/constants/storageKeys";

const navigate = (block) =>
  window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block } }));

// Construye la lista de ítems de acciones (misma lógica que SeccionAcciones)
function buildAcciones(d) {
  const acciones = [];
  const hoy = new Date();
  const modulosEnCriticas = new Set((d.alertasCriticas || []).map((a) => a.modulo));

  // Tramo de inscripción cerrando pronto
  const tramosAbiertos = (d.tramos || []).filter((t) => {
    const fin = new Date(t.fechaFin);
    const dias = Math.ceil((fin - hoy) / 86400000);
    return dias >= 0 && dias <= 5;
  });
  tramosAbiertos.forEach((t) => {
    const dias = Math.ceil((new Date(t.fechaFin) - hoy) / 86400000);
    acciones.push({
      prioridad: "alta", icon: "⏰",
      accion: `Tramo "${t.nombre}" cierra en ${dias} día${dias !== 1 ? "s" : ""}`,
      cta: "Ver inscripciones", modulo: "presupuesto",
    });
  });

  // Voluntarios pendientes de confirmar
  if (d.volPendientes > 0 && d.diasHasta <= 30 && !modulosEnCriticas.has("voluntarios")) {
    acciones.push({
      prioridad: d.diasHasta <= 7 ? "critica" : "alta", icon: "👥",
      accion: `Confirmar ${d.volPendientes} voluntario${d.volPendientes !== 1 ? "s" : ""} pendiente${d.volPendientes !== 1 ? "s" : ""}`,
      cta: "Ir a voluntarios", modulo: "voluntarios",
    });
  }

  // Puestos sin cubrir
  if (d.puestosAlerta?.length > 0 && d.diasHasta <= 45 && !modulosEnCriticas.has("voluntarios")) {
    const pp = d.puestosAlerta[0];
    acciones.push({
      prioridad: "alta", icon: "🚩",
      accion: `"${pp.nombre}" sin cobertura — ${pp.asig || 0}/${pp.necesarios} asignados`,
      cta: "Gestionar puestos", modulo: "voluntarios",
    });
  }

  // Patrocinio lejos del objetivo
  if (d.patComprometido < d.objetivo * 0.5 && d.diasHasta <= 60) {
    const pct = d.objetivo > 0 ? Math.round(d.patComprometido / d.objetivo * 100) : 0;
    acciones.push({
      prioridad: "alta", icon: "🤝",
      accion: `Patrocinio al ${pct}% — quedan ${fmtEur(d.objetivo - d.patComprometido)} por conseguir`,
      cta: "Ver patrocinadores", modulo: "patrocinadores",
    });
  }

  // Contraprestaciones pendientes
  if (d.contPendientes > 0) {
    acciones.push({
      prioridad: "media", icon: "📋",
      accion: `${d.contPendientes} contraprestación${d.contPendientes !== 1 ? "es" : ""} de patrocinadores sin entregar`,
      cta: "Ver contraprestaciones", modulo: "patrocinadores",
    });
  }

  // Tareas vencidas
  if (d.tareasVencidas > 0) {
    acciones.push({
      prioridad: "alta", icon: "📌",
      accion: `${d.tareasVencidas} tarea${d.tareasVencidas !== 1 ? "s" : ""} vencida${d.tareasVencidas !== 1 ? "s" : ""}`,
      cta: "Ver proyecto", modulo: "proyecto",
    });
  }

  // Hito crítico próximo
  const hitoCritico = d.hitosProximos?.find(
    (h) => h.critico && Math.ceil((new Date(h.fecha) - hoy) / 86400000) <= 14
  );
  if (hitoCritico) {
    const dias = Math.ceil((new Date(hitoCritico.fecha) - hoy) / 86400000);
    acciones.push({
      prioridad: dias <= 7 ? "critica" : "alta", icon: "⚡",
      accion: `Hito crítico en ${dias}d: "${hitoCritico.nombre}"`,
      cta: "Ver proyecto", modulo: "proyecto",
    });
  }

  // Stock insuficiente
  if (d.stockAlerts?.length > 0) {
    acciones.push({
      prioridad: "media", icon: "📦",
      accion: `${d.stockAlerts.length} material${d.stockAlerts.length !== 1 ? "es" : ""} con stock insuficiente`,
      cta: "Ver logística", modulo: "logistica",
    });
  }

  return acciones;
}

// Construye una clave única para deduplicar ítems entre las dos fuentes
function itemKey(modulo, texto) {
  return `${modulo}::${texto.slice(0, 60)}`;
}

/**
 * @param {{
 *   d: object,
 *   avisosExpandidos: boolean,
 *   setAvisosExpandidos: function
 * }} props
 */
export default function SeccionCentroControl({ d, avisosExpandidos, setAvisosExpandidos }) {
  const acciones = buildAcciones(d);

  // ── Nivel CRÍTICO ─────────────────────────────────────────────────────────
  // Fuente 1: alertasCriticas del hook
  // Fuente 2: acciones con prioridad "critica"
  const criticos = [];
  const seenCriticos = new Set();

  (d.alertasCriticas || []).forEach((a) => {
    const k = itemKey(a.modulo, a.texto);
    if (!seenCriticos.has(k)) {
      seenCriticos.add(k);
      criticos.push({ icon: a.icon || "⚠", accion: a.texto, cta: `Ir a ${a.modulo}`, modulo: a.modulo });
    }
  });
  acciones.filter((a) => a.prioridad === "critica").forEach((a) => {
    const k = itemKey(a.modulo, a.accion);
    if (!seenCriticos.has(k)) {
      seenCriticos.add(k);
      criticos.push(a);
    }
  });

  // ── Nivel ALTA PRIORIDAD ──────────────────────────────────────────────────
  const altas = [];
  const seenAltas = new Set();

  acciones.filter((a) => a.prioridad === "alta").forEach((a) => {
    const k = itemKey(a.modulo, a.accion);
    if (!seenAltas.has(k)) {
      seenAltas.add(k);
      altas.push(a);
    }
  });

  // ── Nivel INFORMATIVO ─────────────────────────────────────────────────────
  // Fuente 1: alertasAvisos del hook
  // Fuente 2: acciones con prioridad "media"
  const informativos = [];
  const seenInfo = new Set();

  (d.alertasAvisos || []).forEach((a) => {
    const k = itemKey(a.modulo, a.texto);
    if (!seenInfo.has(k)) {
      seenInfo.add(k);
      informativos.push({ icon: a.icon || "🔵", accion: a.texto, cta: `Ir a ${a.modulo}`, modulo: a.modulo });
    }
  });
  acciones.filter((a) => a.prioridad === "media").forEach((a) => {
    const k = itemKey(a.modulo, a.accion);
    if (!seenInfo.has(k)) {
      seenInfo.add(k);
      informativos.push(a);
    }
  });

  const totalItems = criticos.length + altas.length + informativos.length;

  // ── Estado OK: sin ningún ítem ────────────────────────────────────────────
  if (totalItems === 0) {
    return (
      <div className="card mb" style={{
        padding: ".7rem 1rem",
        background: "rgba(52,211,153,0.05)",
        border: "1px solid rgba(52,211,153,0.2)",
        borderLeft: "3px solid var(--green)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".65rem", marginBottom: ".5rem" }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "var(--fs-sm)", color: "var(--green)",
          }}>✓</div>
          <span style={{
            fontFamily: "var(--font-mono)", fontWeight: 800,
            fontSize: "var(--fs-sm)", color: "var(--green)", textTransform: "uppercase",
            letterSpacing: ".08em",
          }}>Todo en orden</span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "var(--text-dim)", marginLeft: "auto",
          }}>sin alertas activas</span>
        </div>
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          {d.totalInscritos > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--cyan)" }}>
              🏃 {d.totalInscritos} inscritos{d.ocupacionGlobal !== null ? ` (${d.ocupacionGlobal}%)` : ""}
            </span>
          )}
          {d.coberturaVol > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--green)" }}>
              👥 {d.coberturaVol}% voluntarios
            </span>
          )}
          {d.resultado > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--green)" }}>
              💰 {fmtEur(d.resultado)} resultado
            </span>
          )}
          {d.progresoGlobal > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--violet)" }}>
              📋 {d.progresoGlobal}% tareas
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Estilos por nivel ─────────────────────────────────────────────────────
  const nivel = {
    critico: {
      color: "var(--red)",
      bg: "var(--red-dim)",
      border: "rgba(248,113,113,0.3)",
      ctaClass: "dash-alert-cta-danger",
    },
    alta: {
      color: "var(--amber)",
      bg: "var(--amber-dim)",
      border: "rgba(251,191,36,0.25)",
      ctaClass: "dash-alert-cta-warning",
    },
    info: {
      color: "var(--cyan)",
      bg: "rgba(34,211,238,0.08)",
      border: "rgba(34,211,238,0.2)",
      ctaClass: "dash-alert-cta-info",
    },
  };

  const renderItem = (item, n, idx, total) => (
    <div
      key={idx}
      onClick={() => navigate(item.modulo)}
      style={{
        display: "flex", alignItems: "center", gap: ".75rem",
        padding: ".65rem 1rem", cursor: "pointer", transition: "background .12s",
        borderBottom: idx < total - 1 ? "1px solid var(--border)" : "none",
        borderLeft: `3px solid ${n.color}`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: n.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "var(--fs-base)",
      }}>
        {item.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "var(--fs-base)", fontWeight: 600, color: "var(--text)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {item.accion}
        </div>
      </div>
      <button
        className={`dash-alert-cta ${n.ctaClass}`}
        onClick={(e) => { e.stopPropagation(); navigate(item.modulo); }}
      >
        {item.cta} →
      </button>
    </div>
  );

  return (
    <div className="card mb" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: ".75rem 1rem .5rem", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: ".5rem",
      }}>
        <span style={{ fontSize: "var(--fs-base)" }}>🎯</span>
        <span style={{ fontWeight: 800, fontSize: "var(--fs-base)", color: "var(--text)" }}>
          Centro de control
        </span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)",
          background: "var(--surface2)", padding: ".1rem .4rem", borderRadius: 4, marginLeft: "auto",
        }}>
          {totalItems} acción{totalItems !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Ítems críticos */}
      {criticos.map((item, idx) =>
        renderItem(item, nivel.critico, `c-${idx}`, criticos.length + altas.length)
      )}

      {/* Ítems alta prioridad */}
      {altas.map((item, idx) =>
        renderItem(item, nivel.alta, `a-${idx}`, criticos.length + altas.length, idx + criticos.length)
      )}

      {/* Ítems informativos — colapsables */}
      {informativos.length > 0 && (
        <>
          <button
            className="dash-avisos-toggle"
            style={{ borderTop: (criticos.length + altas.length) > 0 ? "1px solid var(--border)" : "none" }}
            onClick={() => {
              const next = !avisosExpandidos;
              setAvisosExpandidos(next);
              localStorage.setItem(SK_UI_DASH_ALERTAS_OPEN, next ? "1" : "0");
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: ".45rem" }}>
              <div className="dash-alert-warning-icon dash-alert-warning-icon-amber">⚡</div>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase",
                letterSpacing: ".06em",
              }}>
                {informativos.length} aviso{informativos.length !== 1 ? "s" : ""}
              </span>
            </div>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
              color: "var(--text-dim)", transition: "transform .2s",
              display: "inline-block",
              transform: avisosExpandidos ? "rotate(180deg)" : "rotate(0deg)",
            }}>▼</span>
          </button>
          {avisosExpandidos && (
            <div className="dash-avisos-list">
              {informativos.map((item, idx) =>
                renderItem(item, nivel.info, `i-${idx}`, informativos.length)
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
