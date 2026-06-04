import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";

export const PanelPlazas = ({ totalInscritos, maximos, setMaximos }) => (
  <div className="card" style={{ marginBottom: "1rem" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: ".5rem" }}>
      <div className="card-title" style={{ color: "var(--cyan)", margin: 0 }}>🎯 Panel de Plazas y Volúmenes de Inscripción</div>
    </div>
    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
      {DISTANCIAS.map(d => {
        const pct   = maximos[d] > 0 ? Math.min((totalInscritos[d] / maximos[d]) * 100, 100) : 0;
        const color = pct >= 90 ? "var(--red)" : pct >= 70 ? "var(--amber)" : "var(--green)";
        const libre = Math.max(maximos[d] - totalInscritos[d], 0);
        return (
          <div key={d} style={{ minWidth: 200, flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ color: DISTANCIA_COLORS[d], fontWeight: 700, fontSize: "var(--fs-base)" }}>{DISTANCIA_LABELS[d]}</span>
              {pct >= 90 && maximos[d] > 0 && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, padding: ".1rem .45rem", borderRadius: 10, background: pct >= 100 ? "rgba(248,113,113,.15)" : "rgba(251,191,36,.15)", color: pct >= 100 ? "var(--red)" : "var(--amber)", border: `1px solid ${pct >= 100 ? "rgba(248,113,113,.3)" : "rgba(251,191,36,.3)"}` }}>
                  {pct >= 100 ? "⛔ Aforo completo" : `🔶 ${(100 - pct).toFixed(0)}% libre`}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", color: "var(--text-muted)" }}>Máx. plazas:</span>
              <NumInput value={maximos[d]} onChange={v => setMaximos(prev => ({ ...prev, [d]: Math.max(1, Math.round(v)) }))} step={10} small />
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: color, transition: "width 0.4s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color }}>{totalInscritos[d]} inscritos · {pct.toFixed(0)}%</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: libre <= 10 ? "var(--red)" : "var(--text-muted)" }}>{libre} libres</span>
            </div>
          </div>
        );
      })}
    </div>

    {DISTANCIAS.some(d => maximos[d] > 0 && totalInscritos[d] > maximos[d]) && (
      <div style={{ display: "flex", alignItems: "flex-start", gap: ".6rem", padding: ".65rem .9rem", borderRadius: 8, marginTop: "1rem", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.25)" }}>
        <span style={{ fontSize: "var(--fs-md)", flexShrink: 0 }}>⚠️</span>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", lineHeight: 1.6 }}>
          <span style={{ color: "var(--amber)", fontWeight: 700 }}>
            {DISTANCIAS.filter(d => maximos[d] > 0 && totalInscritos[d] > maximos[d]).map(d => `${DISTANCIA_LABELS[d]}: ${totalInscritos[d]}/${maximos[d]} (+${totalInscritos[d] - maximos[d]})`).join(" · ")}
          </span>
          <span style={{ color: "var(--text-muted)", marginLeft: ".5rem" }}>superan el aforo máximo.</span>
        </div>
      </div>
    )}
  </div>
);
