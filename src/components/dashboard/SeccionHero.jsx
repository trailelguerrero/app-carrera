/**
 * SeccionHero.jsx — Fase 3, Tarea 3.4
 * Hero del Dashboard: countdown de días + barra de salud del evento.
 */

/**
 * @param {{
 *   d: object,
 *   saludExpandida: boolean,
 *   setSaludExpandida: function
 * }} props
 */
export default function SeccionHero({ d, saludExpandida, setSaludExpandida }) {
  const saludColor = d.saludGlobal >= 80 ? "var(--green)" : d.saludGlobal >= 55 ? "var(--amber)" : "var(--red)";
  const saludLabel = d.saludGlobal >= 80 ? "Evento en buen estado" : d.saludGlobal >= 55 ? "Atención requerida" : "Acción urgente necesaria";

  const navigate = (bloque) =>
    window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: bloque } }));

  return (
    <div className={`dash-hero card mb ${d.esSemana ? "dash-hero-urgente" : ""}`}>
      <div className="dash-hero-bg" />
      <div className="dash-hero-content">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>

          {/* Countdown */}
          <div>
            <div className="dash-eyebrow mono xs muted">
              {d.yaFue ? `🏁 ${d.eventoNombre} ${d.eventoEdicion} · COMPLETADO` : `🏔️ ${d.eventoNombre} ${d.eventoEdicion}`}
            </div>
            <div className="dash-countdown">
              {d.yaFue
                ? <span className="dash-countdown-num" style={{ fontSize: "var(--fs-xl)" }}>¡Completado!</span>
                : <>
                  <span className="dash-countdown-num">{d.diasHasta}</span>
                  <span className="dash-countdown-label mono muted">
                    {d.esSemana ? "⚡ días — ¡SEMANA DE CARRERA!" : "días para la carrera"}
                  </span>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                    color: "var(--cyan)", marginTop: ".4rem", letterSpacing: ".02em"
                  }}>
                    📅 {d.eventoFechaStr}
                  </div>
                </>
              }
            </div>
          </div>

          {/* Barra de salud del evento */}
          <div className="dash-salud-box">
            <button
              onClick={() => setSaludExpandida(v => !v)}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: saludExpandida ? "0.5rem" : 0
              }}>
                <div className="mono xs muted" style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "var(--fs-xs)" }}>
                  Salud del evento
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="dash-salud-score" style={{ color: saludColor, fontSize: "var(--fs-md)" }}>
                    {d.saludGlobal}%
                  </span>
                  <span className="mono" style={{ color: saludColor, fontSize: "var(--fs-sm)" }}>
                    {saludExpandida ? "▲" : "▼"}
                  </span>
                </div>
              </div>
              {!saludExpandida && (
                <>
                  <div className="mono xs" style={{ color: saludColor, marginBottom: ".35rem" }}>
                    {saludLabel}
                  </div>
                  {d.saludModulos.filter(m => m.color === "var(--red)" || m.color === "var(--amber)").length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem", marginTop: ".25rem" }}>
                      {d.saludModulos.filter(m => m.color === "var(--red)" || m.color === "var(--amber)").map(m => (
                        <span key={m.label}
                          onClick={(e) => { e.stopPropagation(); navigate(m.bloque); }}
                          style={{
                            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                            color: m.color, background: `${m.color}14`,
                            border: `1px solid ${m.color}44`,
                            borderRadius: 4, padding: ".1rem .35rem", cursor: "pointer",
                          }}>
                          {m.icon} {m.label} {m.score}%
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </button>
            {saludExpandida && (
              <>
                <div className="mono xs" style={{ color: saludColor, marginBottom: "0.6rem" }}>
                  {saludLabel}
                </div>
                <div className="dash-salud-bars">
                  {d.saludModulos.map(m => (
                    <div key={m.label}
                      className="dash-salud-bar-row"
                      onClick={() => navigate(m.bloque)}
                      title={`Ir a ${m.label}`}>
                      <span className="dash-salud-bar-icon">{m.icon}</span>
                      <div className="dash-salud-bar-track">
                        <div className="dash-salud-bar-fill"
                          style={{ width: `${m.score}%`, background: m.color }} />
                      </div>
                      <span className="mono" style={{
                        fontSize: "var(--fs-xs)", color: m.color,
                        minWidth: 28, textAlign: "right"
                      }}>{m.score}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
