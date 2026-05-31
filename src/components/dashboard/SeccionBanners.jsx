/**
 * SeccionBanners.jsx — Fase 3, Tarea 3.4 · MEJ-06
 * Banners condicionales del Dashboard:
 *   - Escenario activo en Presupuesto
 *   - Contador urgente cuando faltan ≤7 días para el evento
 *
 * MEJ-06: React.memo — evita re-render cuando cambia saludExpandida u otros
 * estados locales de Dashboard que no afectan a estos banners.
 */
import { memo } from "react";

/** Banner: hay un escenario de presupuesto activo */
function BannerEscenario({ scenarioActivo }) {
  if (!scenarioActivo) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: ".75rem", padding: ".7rem 1rem", marginBottom: ".85rem",
      borderRadius: 8, flexWrap: "wrap",
      background: "rgba(251,191,36,.1)",
      border: "2px solid rgba(251,191,36,.4)",
      boxShadow: "0 0 0 4px rgba(251,191,36,.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
        <span style={{ fontSize: "var(--fs-lg)" }}>🔬</span>
        <div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 800,
            color: "var(--amber)", textTransform: "uppercase", letterSpacing: ".06em"
          }}>
            ⚠️ MODO ESCENARIO ACTIVO
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
            Escenario «{scenarioActivo}» activo en Presupuesto. Este Dashboard siempre muestra <strong>datos reales</strong>, no del escenario.
          </div>
        </div>
      </div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "presupuesto" } }))}
        style={{
          fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".28rem .65rem",
          borderRadius: 6, border: "1px solid rgba(251,191,36,.4)",
          background: "rgba(251,191,36,.15)", color: "var(--amber)", cursor: "pointer",
          flexShrink: 0, whiteSpace: "nowrap", fontWeight: 700
        }}>
        Ver en Presupuesto →
      </button>
    </div>
  );
}

/** Banner: faltan ≤7 días para el evento */
function BannerDiaCarrera({ diasHasta, esSemana, yaFue }) {
  if (!esSemana || yaFue) return null;
  return (
    <div
      onClick={() => window.dispatchEvent(new CustomEvent("teg-open-diacarrera"))}
      style={{
        display: "flex", alignItems: "center", gap: ".75rem",
        padding: ".85rem 1rem", marginBottom: ".85rem",
        borderRadius: 10, cursor: "pointer",
        background: "linear-gradient(135deg, rgba(248,113,113,0.14) 0%, rgba(251,191,36,0.10) 100%)",
        border: "2px solid rgba(248,113,113,0.45)",
        boxShadow: "0 0 0 4px rgba(248,113,113,0.07), 0 4px 20px rgba(248,113,113,0.15)",
        animation: "teg-slidein .3s ease",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(248,113,113,0.22) 0%, rgba(251,191,36,0.14) 100%)"}
      onMouseLeave={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(248,113,113,0.14) 0%, rgba(251,191,36,0.10) 100%)"}
    >
      <span style={{ fontSize: "2rem", lineHeight: 1 }}>🏁</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: "var(--fs-base)", color: "#f87171", letterSpacing: "-.01em" }}>
          {diasHasta === 0 ? "¡HOY ES EL EVENTO!" : `¡FALTAN ${diasHasta} DÍAS!`}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: 2 }}>
          Abrir Panel Día de Carrera →
        </div>
      </div>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
        color: "#f87171", background: "rgba(248,113,113,0.12)",
        border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6,
        padding: ".3rem .65rem", flexShrink: 0,
      }}>⚡ Abrir</div>
    </div>
  );
}

/**
 * Props narrowed to only what's needed — memo comparison stays cheap.
 * @param {{ scenarioActivo: string|null, diasHasta: number, esSemana: boolean, yaFue: boolean }} props
 */
const SeccionBanners = memo(function SeccionBanners({ scenarioActivo, diasHasta, esSemana, yaFue }) {
  return (
    <>
      <BannerEscenario scenarioActivo={scenarioActivo} />
      <BannerDiaCarrera diasHasta={diasHasta} esSemana={esSemana} yaFue={yaFue} />
    </>
  );
});

export default SeccionBanners;
