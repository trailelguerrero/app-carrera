/**
 * ModoEvento.jsx — Fase 7, Tarea DASH-02
 * Vista simplificada del Dashboard para el día de la carrera.
 * Se activa automáticamente cuando diasHasta === 0, o manualmente
 * desde el botón de prueba (preferencia guardada en sessionStorage).
 *
 * Muestra solo:
 *  · Reloj digital grande (actualización cada segundo)
 *  · 4 KPIs a pantalla completa
 *  · Botón "🏁 Abrir Panel Día de Carrera"
 *  · Enlace "Ver panel completo →"
 */
import { useState, useEffect } from "react";

const navigateTo = (block) => {
  if (block === "diaCarrera") {
    window.dispatchEvent(new CustomEvent("teg-open-diacarrera"));
  } else {
    window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block } }));
  }
};

function Reloj() {
  const [hora, setHora] = useState(() =>
    new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setHora(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      fontFamily: "var(--font-mono)", fontSize: "clamp(2.5rem, 8vw, 5rem)",
      fontWeight: 900, color: "var(--text)", letterSpacing: ".06em",
      textShadow: "0 0 40px rgba(34,211,238,0.25)",
      lineHeight: 1,
    }}>
      {hora}
    </div>
  );
}

function KpiEvento({ icon, label, value, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: "1 1 160px", minWidth: 140,
        background: "var(--surface)", border: `1px solid ${color}33`,
        borderTop: `3px solid ${color}`,
        borderRadius: 12, padding: "1.25rem 1rem",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: ".4rem", cursor: onClick ? "pointer" : "default",
        transition: "transform .12s, box-shadow .12s",
      }}
      onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${color}22`; } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{icon}</span>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "clamp(1.6rem, 4vw, 2.5rem)",
        fontWeight: 900, color, lineHeight: 1, textAlign: "center",
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
        color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em",
        textAlign: "center",
      }}>
        {label}
      </div>
      {sub && (
        <div style={{
          fontSize: "var(--fs-xs)", color: "var(--text-dim)",
          textAlign: "center", lineHeight: 1.3,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/**
 * @param {{
 *   d: object,
 *   onVerPanelCompleto: function
 * }} props
 */
export default function ModoEvento({ d, onVerPanelCompleto }) {
  // KPI 1: Voluntarios en puesto
  const volValue = d.totalNecesarios > 0
    ? `${d.volConfirmados}/${d.totalNecesarios}`
    : String(d.volConfirmados);
  const volColor = d.totalNecesarios === 0 ? "var(--text-muted)"
    : d.coberturaVol >= 80 ? "var(--green)"
    : d.coberturaVol >= 50 ? "var(--amber)"
    : "var(--red)";

  // KPI 2: Incidencias activas
  const incColor = d.incidenciasActivas === 0 ? "var(--green)"
    : d.incidenciasActivas <= 2 ? "var(--amber)"
    : "var(--red)";

  // KPI 3: Checklist
  const ckPct = d.ckTotal > 0 ? Math.round(d.ckDone / d.ckTotal * 100) : 0;
  const ckValue = d.ckTotal > 0 ? `${ckPct}%` : "—";
  const ckColor = d.ckTotal === 0 ? "var(--text-muted)"
    : ckPct >= 80 ? "var(--green)"
    : ckPct >= 50 ? "var(--amber)"
    : "var(--red)";

  // KPI 4: Próximo item del timeline
  const now = new Date();
  const proximoTl = (d.tlItems || [])
    .filter((t) => t.estado !== "completado" && t.hora)
    .sort((a, b) => a.hora.localeCompare(b.hora))[0];
  const tlValue = proximoTl ? proximoTl.hora : "—";
  const tlSub = proximoTl ? proximoTl.nombre?.slice(0, 28) : "Sin items pendientes";

  return (
    <div className="block-container" style={{ maxWidth: 900, margin: "0 auto" }}>

      {/* ── Cabecera ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: ".75rem", marginBottom: "1.5rem",
      }}>
        <div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "var(--red)", textTransform: "uppercase", letterSpacing: ".1em",
            fontWeight: 700, marginBottom: ".25rem",
          }}>
            🏁 MODO EVENTO — DÍA DE LA CARRERA
          </div>
          <div style={{ fontSize: "var(--fs-lg)", fontWeight: 800, color: "var(--text)" }}>
            {d.eventoNombre} · {d.eventoEdicion}
          </div>
        </div>
        <button
          onClick={onVerPanelCompleto}
          style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "var(--text-dim)", background: "transparent",
            border: "1px solid var(--border)", borderRadius: 6,
            padding: ".35rem .75rem", cursor: "pointer",
          }}
        >
          Ver panel completo →
        </button>
      </div>

      {/* ── Reloj ── */}
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: "1.5rem 2rem", marginBottom: "1.5rem",
      }}>
        <Reloj />
      </div>

      {/* ── 4 KPIs ── */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "1rem",
        marginBottom: "1.5rem",
      }}>
        <KpiEvento
          icon="👥"
          label="Voluntarios en puesto"
          value={volValue}
          sub={d.totalNecesarios > 0 ? `${d.coberturaVol}% cobertura` : "Sin puestos definidos"}
          color={volColor}
          onClick={() => navigateTo("voluntarios")}
        />
        <KpiEvento
          icon="🚨"
          label="Incidencias activas"
          value={d.incidenciasActivas === 0 ? "0" : String(d.incidenciasActivas)}
          sub={d.incidenciasActivas === 0 ? "Sin incidencias" : "Ir a Logística →"}
          color={incColor}
          onClick={() => navigateTo("logistica")}
        />
        <KpiEvento
          icon="✅"
          label="Checklist"
          value={ckValue}
          sub={d.ckTotal > 0 ? `${d.ckDone}/${d.ckTotal} completados` : "Sin checklist"}
          color={ckColor}
          onClick={() => navigateTo("logistica")}
        />
        <KpiEvento
          icon="⏱️"
          label="Próximo en timeline"
          value={tlValue}
          sub={tlSub}
          color="var(--cyan)"
          onClick={() => navigateTo("logistica")}
        />
      </div>

      {/* ── CTA principal ── */}
      <button
        onClick={() => navigateTo("diaCarrera")}
        style={{
          width: "100%", padding: "1rem 1.5rem",
          background: "linear-gradient(135deg, var(--red) 0%, #c2410c 100%)",
          color: "#fff", border: "none", borderRadius: 12,
          fontSize: "var(--fs-lg)", fontWeight: 800, cursor: "pointer",
          letterSpacing: ".03em", boxShadow: "0 4px 20px rgba(239,68,68,0.35)",
          transition: "opacity .15s, transform .15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = ".9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = ""; }}
      >
        🏁 Abrir Panel Día de Carrera
      </button>

    </div>
  );
}
