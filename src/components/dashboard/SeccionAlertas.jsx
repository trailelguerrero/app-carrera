/**
 * SeccionAlertas.jsx — Fase 3, Tarea 3.4
 * Panel de alertas del Dashboard:
 *   - Alertas críticas (siempre visibles)
 *   - Avisos (colapsables, persisten en localStorage)
 *   - Estado OK cuando no hay ninguna
 */
import { fmtEur } from "@/lib/utils";
import { SK_UI_DASH_ALERTAS_OPEN } from "@/constants/storageKeys";

const navigate = (block) =>
  window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block } }));

/**
 * @param {{
 *   d: object,
 *   alertasExpandidas: boolean,
 *   setAlertasExpandidas: function
 * }} props
 */
export default function SeccionAlertas({ d, alertasExpandidas, setAlertasExpandidas }) {
  return (
    <>
      {/* Alertas críticas */}
      {d.alertasCriticas.length > 0 && (
        <div className="dash-alertas-criticas mb" role="alert">
          <div className="dash-alertas-header">
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
              <div className="dash-alert-warning-icon">⚠</div>
              <span style={{ textTransform: "uppercase", letterSpacing: ".08em" }}>
                {d.alertasCriticas.length} Alerta{d.alertasCriticas.length !== 1 ? "s" : ""} Crítica{d.alertasCriticas.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {d.alertasCriticas.map((a, i) => (
            <div key={i} className="dash-alerta dash-alerta-danger dash-alerta-clickable"
              onClick={() => navigate(a.modulo)}>
              <div className="dash-alert-icon-wrap dash-alert-icon-danger">
                <span style={{ fontSize: "var(--fs-sm)", lineHeight: 1 }}>⚠</span>
              </div>
              <div className="dash-alerta-body">
                <span className="dash-alerta-text">{a.texto}</span>
                <span className="dash-alerta-modulo">{a.modulo}</span>
              </div>
              <button className="dash-alert-cta dash-alert-cta-danger"
                onClick={e => { e.stopPropagation(); navigate(a.modulo); }}>
                Ver →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Avisos colapsables */}
      {d.alertasAvisos.length > 0 && (
        <div className="dash-avisos-container mb">
          <button className="dash-avisos-toggle"
            onClick={() => {
              const next = !alertasExpandidas;
              setAlertasExpandidas(next);
              localStorage.setItem(SK_UI_DASH_ALERTAS_OPEN, next ? "1" : "0");
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".45rem" }}>
              <div className="dash-alert-warning-icon dash-alert-warning-icon-amber">⚡</div>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                fontWeight: 700, color: "var(--amber)", textTransform: "uppercase",
                letterSpacing: ".06em"
              }}>
                {d.alertasAvisos.length} Aviso{d.alertasAvisos.length !== 1 ? "s" : ""}
              </span>
            </div>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
              color: "var(--text-dim)", transition: "transform .2s",
              display: "inline-block",
              transform: alertasExpandidas ? "rotate(180deg)" : "rotate(0deg)"
            }}>▼</span>
          </button>
          {alertasExpandidas && (
            <div className="dash-avisos-list">
              {d.alertasAvisos.map((a, i) => (
                <div key={i}
                  className={`dash-alerta ${a.icon === "🔵" ? "dash-alerta-info" : "dash-alerta-warning"} dash-alerta-clickable`}
                  onClick={() => navigate(a.modulo)}>
                  <div className={`dash-alert-icon-wrap ${a.icon === "🔵" ? "dash-alert-icon-info" : "dash-alert-icon-warning"}`}>
                    <span style={{ fontSize: "var(--fs-sm)", lineHeight: 1 }}>
                      {a.icon === "🔵" ? "ℹ" : "⚡"}
                    </span>
                  </div>
                  <div className="dash-alerta-body">
                    <span className="dash-alerta-text">{a.texto}</span>
                    <span className="dash-alerta-modulo">{a.modulo}</span>
                  </div>
                  <button className={`dash-alert-cta ${a.icon === "🔵" ? "dash-alert-cta-info" : "dash-alert-cta-warning"}`}
                    onClick={e => { e.stopPropagation(); navigate(a.modulo); }}>
                    Ver →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estado OK */}
      {d.alertasCriticas.length === 0 && d.alertasAvisos.length === 0 && (
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
              letterSpacing: ".08em"
            }}>Todo en orden</span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
              color: "var(--text-dim)", marginLeft: "auto"
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
      )}
    </>
  );
}
