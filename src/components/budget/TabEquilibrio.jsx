import React, { useState } from "react";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";

export const TabEquilibrio = ({ 
  totalInscritos, 
  precioMedioDistancia, 
  costesVarPorCorredor, 
  costesFijos, 
  totalIngresosConMerch, 
  puntoEquilibrio, 
  resultado,
  ingresosPorDistancia
}) => {
  const costosFijosNetos = Math.max(costesFijos.total - totalIngresosConMerch, 0);
  const totalN = totalInscritos.total;
  const margenTotal = totalN > 0
    ? DISTANCIAS.reduce((s, d) => {
        const margen = precioMedioDistancia[d] - costesVarPorCorredor[d];
        const prop = totalInscritos[d] / totalN;
        return s + margen * prop;
      }, 0)
    : 0;

  const peTotal = margenTotal > 0 && costosFijosNetos > 0
    ? Math.ceil(costosFijosNetos / margenTotal)
    : costosFijosNetos <= 0 ? 0 : null;

  const margenContribActual = totalN > 0
    ? DISTANCIAS.reduce((s, d) => s + (precioMedioDistancia[d] - costesVarPorCorredor[d]) * totalInscritos[d], 0)
    : 0;
  const coberturaFijos = (costesFijos.total > 0)
    ? Math.min((margenContribActual + totalIngresosConMerch) / costesFijos.total * 100, 200)
    : 100;

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi amber">
          <div className="kpi-label">Costes Fijos a Cubrir</div>
          <div className="kpi-value">{costosFijosNetos.toFixed(0)} €</div>
          <div className="kpi-sub">{costosFijosNetos === 0 ? "✓ Cubiertos" : `de ${costesFijos.total.toFixed(0)}€ totales`}</div>
        </div>
        <div className="kpi cyan">
          <div className="kpi-label">Margen Contribución Medio</div>
          <div className="kpi-value">{margenTotal.toFixed(2)} €/cte</div>
          <div className="kpi-sub">Media ponderada</div>
        </div>
        <div className="kpi violet">
          <div className="kpi-label">Punto Equilibrio Total</div>
          <div className="kpi-value">{peTotal === 0 ? "✓ 0" : (peTotal ?? "∞")}</div>
          <div className="kpi-sub">corredores necesarios</div>
        </div>
        <div className={`kpi ${coberturaFijos >= 100 ? "green" : coberturaFijos >= 75 ? "amber" : "red"}`}>
          <div className="kpi-label">Cobertura de Fijos</div>
          <div className="kpi-value">{coberturaFijos.toFixed(0)}%</div>
          <div className="kpi-sub">{totalInscritos.total} inscritos actuales</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title mb-2" style={{ color: "var(--amber)" }}>⚖️ Análisis por Distancia</div>

        {/* Barra "Estás aquí" — posición actual vs punto de equilibrio */}
        {peTotal !== null && peTotal > 0 && (
          <div style={{ marginBottom: "1.25rem", padding: "0.85rem 1rem", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.55rem", flexWrap: "wrap", gap: "0.4rem" }}>
              <span className="mono" style={{ fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Progreso hacia el equilibrio
              </span>
              <span className="mono" style={{ fontSize: "0.68rem", fontWeight: 700,
                color: totalN >= peTotal ? "var(--green)" : totalN >= peTotal * 0.75 ? "var(--amber)" : "var(--red)" }}>
                {totalN >= peTotal
                  ? `✓ Superávit — ${totalN - peTotal} corredores por encima`
                  : `${peTotal - totalN} corredores para el equilibrio`}
              </span>
            </div>
            <div style={{ position: "relative", height: 24, background: "var(--surface3)", borderRadius: 12, overflow: "visible" }}>
              {/* Barra de progreso */}
              <div style={{
                position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 12,
                width: `${Math.min(totalN / Math.max(peTotal, 1) * 100, 100)}%`,
                background: totalN >= peTotal
                  ? "linear-gradient(90deg, var(--green), #10b981)"
                  : totalN >= peTotal * 0.75
                    ? "linear-gradient(90deg, var(--amber), #f59e0b)"
                    : "linear-gradient(90deg, var(--red), #ef4444)",
                transition: "width 0.6s ease",
                minWidth: 4,
              }} />
              {/* Marcador "Estás aquí" */}
              <div style={{
                position: "absolute", top: "50%", transform: "translateY(-50%)",
                left: `${Math.min(totalN / Math.max(peTotal, 1) * 100, 100)}%`,
                marginLeft: totalN >= peTotal ? -24 : 0,
                background: "var(--surface)", border: `2px solid ${totalN >= peTotal ? "var(--green)" : "var(--amber)"}`,
                borderRadius: 20, padding: "0.1rem 0.45rem",
                fontFamily: "var(--font-mono)", fontSize: "0.52rem", fontWeight: 800,
                color: totalN >= peTotal ? "var(--green)" : "var(--amber)",
                whiteSpace: "nowrap", zIndex: 2,
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}>
                {totalN >= peTotal ? "✓ aquí" : "← aquí"}
              </div>
              {/* Marcador de equilibrio */}
              {totalN < peTotal && (
                <div style={{
                  position: "absolute", top: -4, bottom: -4,
                  left: "100%", width: 2,
                  background: "rgba(251,191,36,0.6)",
                  borderRadius: 1,
                }}>
                  <div style={{
                    position: "absolute", top: "50%", transform: "translateY(-50%) translateX(4px)",
                    fontFamily: "var(--font-mono)", fontSize: "0.5rem", color: "var(--amber)",
                    fontWeight: 700, whiteSpace: "nowrap",
                  }}>
                    PE: {peTotal}
                  </div>
                </div>
              )}
            </div>
            {/* Escala */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
              <span className="mono" style={{ fontSize: "0.55rem", color: "var(--text-dim)" }}>0</span>
              <span className="mono" style={{ fontSize: "0.55rem", color: "var(--amber)" }}>PE: {peTotal}</span>
              {peTotal < totalN * 1.2 && (
                <span className="mono" style={{ fontSize: "0.55rem", color: "var(--text-dim)" }}>{Math.ceil(peTotal * 1.3)}</span>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x">
          <table className="eq-table">
            <thead>
              <tr>
                <th>Distancia</th>
                <th>Margen contrib. (€/cte)</th>
                <th>Inscritos est.</th>
                <th>Equilibrio est.</th>
                <th>Diferencia</th>
                <th>Ingresos inscr.</th>
              </tr>
            </thead>
            <tbody>
              {DISTANCIAS.map(d => {
                const margen = precioMedioDistancia[d] - costesVarPorCorredor[d];
                const pe = puntoEquilibrio[d];
                const diff = typeof pe === "number" ? totalInscritos[d] - pe : null;
                return (
                  <tr key={d}>
                    <td style={{ fontWeight: 700, color: DISTANCIA_COLORS[d] }}>{DISTANCIA_LABELS[d]}</td>
                    <td className="mono" style={{ color: margen > 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                      {margen.toFixed(2)} €
                    </td>
                    <td className="mono">{totalInscritos[d]}</td>
                    <td className="mono" style={{ color: "var(--amber)" }}>{pe}</td>
                    <td className="mono" style={{ color: diff === null ? "var(--text-muted)" : diff >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                      {diff === null ? "—" : (diff >= 0 ? `+${diff}` : diff)}
                    </td>
                    <td className="mono" style={{ color: "var(--violet)" }}>{(precioMedioDistancia[d] * totalInscritos[d]).toFixed(0)} €</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: "2px solid var(--border)", background: "var(--surface2)", fontWeight: 700 }}>
                <td>TOTAL</td>
                <td className="mono" style={{ color: margenTotal > 0 ? "var(--green)" : "var(--red)", fontWeight: 800 }}>{margenTotal.toFixed(2)} €</td>
                <td className="mono">{totalInscritos.total}</td>
                <td className="mono" style={{ color: "var(--amber)" }}>{peTotal ?? "∞"}</td>
                <td className="mono" style={{ fontWeight: 700, color: peTotal && totalInscritos.total >= peTotal ? "var(--green)" : "var(--red)" }}>
                  {peTotal ? (totalInscritos.total >= peTotal ? `+${totalInscritos.total - peTotal}` : `${totalInscritos.total - peTotal}`) : "—"}
                </td>
                <td className="mono" style={{ color: "var(--violet)" }}>{ingresosPorDistancia.total.toFixed(0)} €</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
