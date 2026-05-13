/**
 * SeccionAcciones.jsx — Fase 3, Tarea 3.4
 * Panel "Haz esto ahora": lista priorizada de acciones concretas
 * calculadas a partir de los KPIs del evento.
 */
import { fmtEur } from "@/lib/utils";

const navigate = (block) =>
  window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block } }));

/**
 * @param {{ d: object }} props  — d es el objeto de datos calculados por useDashboardKpis
 */
export default function SeccionAcciones({ d }) {
  const acciones = [];
  const hoy = new Date();
  const modulosEnCriticas = new Set((d.alertasCriticas || []).map(a => a.modulo));

  // Tramo de inscripción cerrando pronto
  const tramosAbiertos = (d.tramos || []).filter(t => {
    const fin = new Date(t.fechaFin);
    const dias = Math.ceil((fin - hoy) / 86400000);
    return dias >= 0 && dias <= 5;
  });
  tramosAbiertos.forEach(t => {
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
  const hitoCritico = d.hitosProximos?.find(h => h.critico && Math.ceil((new Date(h.fecha) - hoy) / 86400000) <= 14);
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

  // Fallback: si no hay acciones concretas, usar alertas críticas
  if (acciones.length === 0 && d.alertasCriticas.length > 0) {
    d.alertasCriticas.slice(0, 2).forEach(a => {
      acciones.push({ prioridad: "critica", icon: a.icon, accion: a.texto, cta: `Ir a ${a.modulo}`, modulo: a.modulo });
    });
  }

  if (acciones.length === 0) return null;

  const top = acciones.slice(0, 5);
  const colorPrio = { critica: "var(--red)", alta: "var(--amber)", media: "var(--cyan)" };
  const bgPrio    = { critica: "var(--red-dim)", alta: "var(--amber-dim)", media: "var(--cyan-dim)" };

  return (
    <div className="card mb" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{
        padding: ".75rem 1rem .5rem", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: ".5rem"
      }}>
        <span style={{ fontSize: "var(--fs-base)" }}>🎯</span>
        <span style={{ fontWeight: 800, fontSize: "var(--fs-base)", color: "var(--text)" }}>Haz esto ahora</span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)",
          background: "var(--surface2)", padding: ".1rem .4rem", borderRadius: 4, marginLeft: "auto"
        }}>
          {acciones.length} acción{acciones.length !== 1 ? "es" : ""}
        </span>
      </div>
      {top.map((ac, i) => (
        <div key={i}
          onClick={() => navigate(ac.modulo)}
          style={{
            display: "flex", alignItems: "center", gap: ".75rem",
            padding: ".65rem 1rem", cursor: "pointer", transition: "background .12s",
            borderBottom: i < top.length - 1 ? "1px solid var(--border)" : "none"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: bgPrio[ac.prioridad],
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "var(--fs-base)"
          }}>
            {ac.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "var(--fs-base)", fontWeight: 600, color: "var(--text)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
            }}>
              {ac.accion}
            </div>
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: colorPrio[ac.prioridad], fontWeight: 700, flexShrink: 0,
            background: bgPrio[ac.prioridad], padding: ".15rem .5rem", borderRadius: 4
          }}>
            {ac.cta} →
          </div>
        </div>
      ))}
    </div>
  );
}
