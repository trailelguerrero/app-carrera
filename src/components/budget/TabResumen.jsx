import React from "react";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";

export const TabResumen = ({ 
  totalInscritos, 
  ingresosPorDistancia, 
  costesFijos, 
  costesVariables, 
  totalIngresosConMerch,
  totalIngresosExtra,
  merchTotales,
  resultado, 
  conceptos, 
  precioMedioDistancia, 
  costesVarPorCorredor,
  costesFijoPorCorredor
}) => {
  return (
    <>
      <div className="card">
        <div className="card-title resumen mb-2">🏁 Cuenta de Resultados</div>
        <div className="overflow-x">
          <table className="eq-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>TOTAL</th>
                {DISTANCIAS.map(d => <th key={d} style={{ color: DISTANCIA_COLORS[d] }}>{DISTANCIA_LABELS[d]}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Inscritos</td>
                <td className="mono">{totalInscritos.total}</td>
                {DISTANCIAS.map(d => <td key={d} className="mono" style={{ color: DISTANCIA_COLORS[d] }}>{totalInscritos[d]}</td>)}
              </tr>
              <tr>
                <td>Precio medio</td>
                <td className="mono">{precioMedioDistancia.total.toFixed(2)} €</td>
                {DISTANCIAS.map(d => <td key={d} className="mono">{precioMedioDistancia[d].toFixed(2)} €</td>)}
              </tr>
              <tr style={{ borderTop: "2px solid var(--border)" }}>
                <td style={{ fontWeight: 700, color: "var(--violet)" }}>↑ Ingresos inscripciones</td>
                <td className="mono" style={{ fontWeight: 700, color: "var(--violet)" }}>{ingresosPorDistancia.total.toFixed(2)} €</td>
                {DISTANCIAS.map(d => <td key={d} className="mono" style={{ color: "var(--violet)" }}>{ingresosPorDistancia[d].toFixed(2)} €</td>)}
              </tr>
              <tr>
                <td style={{ color: "var(--cyan)" }}>↓ Costes fijos</td>
                <td className="mono" style={{ color: "var(--cyan)" }}>{costesFijos.total.toFixed(2)} €</td>
                {DISTANCIAS.map(d => <td key={d} className="mono" style={{ color: "var(--cyan)" }}>{costesFijos[d].toFixed(2)} €</td>)}
              </tr>
              <tr>
                <td style={{ color: "var(--cyan)" }}>&nbsp;&nbsp;└ €/cte fijo</td>
                <td className="mono text-xs text-muted">—</td>
                {DISTANCIAS.map(d => (
                  <td key={d} className="mono text-xs" style={{ color: "var(--cyan)" }}>
                    {costesFijoPorCorredor[d] !== null
                      ? `${costesFijoPorCorredor[d].toFixed(2)} €/cte`
                      : <span style={{ color: "var(--text-dim)" }}>— sin inscritos</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ color: "var(--green)" }}>↓ Costes variables</td>
                <td className="mono" style={{ color: "var(--green)" }}>{costesVariables.total.toFixed(2)} €</td>
                {DISTANCIAS.map(d => <td key={d} className="mono" style={{ color: "var(--green)" }}>{costesVariables[d].toFixed(2)} €</td>)}
              </tr>
              <tr>
                <td style={{ color: "var(--green)" }}>&nbsp;&nbsp;└ €/cte variable</td>
                <td className="mono text-xs text-muted">—</td>
                {DISTANCIAS.map(d => (
                  <td key={d} className="mono text-xs" style={{ color: "var(--green)" }}>
                    {costesVarPorCorredor[d].toFixed(2)} €/cte
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ color: "var(--orange)" }}>↑ Patrocinios y extras</td>
                <td className="mono" style={{ color: "var(--orange)" }}>{(totalIngresosExtra ?? 0).toFixed(2)} €</td>
                {DISTANCIAS.map(d => <td key={d} className="mono text-muted">—</td>)}
              </tr>
              <tr>
                <td style={{ color: "var(--green)" }}>↑ Merchandising (beneficio neto)</td>
                <td className="mono" style={{ color: (merchTotales?.beneficio ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>
                  {((merchTotales?.beneficio ?? 0) >= 0 ? "+" : "")}{(merchTotales?.beneficio ?? 0).toFixed(2)} €
                </td>
                <td colSpan={3} className="mono text-xs text-muted" style={{ paddingLeft: "0.75rem" }}>
                  Ventas {(merchTotales?.ingresos ?? 0).toFixed(2)} € − Coste producto {(merchTotales?.costes ?? 0).toFixed(2)} €
                </td>
              </tr>
              <tr style={{ borderTop: "2px solid var(--border)", background: "var(--surface2)" }}>
                <td style={{ fontWeight: 800, fontSize: "0.9rem" }}>🏁 RESULTADO NETO</td>
                <td className="mono" style={{ fontWeight: 800, fontSize: "1rem", color: resultado.total >= 0 ? "var(--green)" : "var(--red)" }}>
                  {resultado.total >= 0 ? "+" : ""}{resultado.total.toFixed(2)} €
                </td>
                {DISTANCIAS.map(d => (
                  <td key={d} className="mono" style={{ fontWeight: 700, color: resultado[d] >= 0 ? "var(--green)" : "var(--red)" }}>
                    {resultado[d] >= 0 ? "+" : ""}{resultado[d].toFixed(2)} €
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="resumen-grid">
        <div className="card" style={{ marginBottom: 0, gridColumn: "span 3" }}>
          <div className="card-title resumen mb-2">Top Conceptos por Coste</div>
          <div className="overflow-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th className="text-right">Coste total (€)</th>
                  <th className="text-right">% sobre total</th>
                </tr>
              </thead>
              <tbody>
                {[...conceptos.filter(c => c.activo)].map(c => {
                  let coste = 0;
                  if (c.tipo === "fijo") coste = c.costeTotal;
                  else coste = DISTANCIAS.reduce((s, d) => s + (c.costePorDistancia[d] || 0) * totalInscritos[d], 0);
                  return { ...c, _coste: coste };
                }).sort((a, b) => b._coste - a._coste).slice(0, 10).map(c => {
                  const pct = (costesFijos.total + costesVariables.total) > 0 ? (c._coste / (costesFijos.total + costesVariables.total)) * 100 : 0;
                  return (
                    <tr key={c.id}>
                      <td>{c.nombre}</td>
                      <td><span className={`badge badge-${c.tipo}`}>{c.tipo}</span></td>
                      <td className="text-right mono">{c._coste.toFixed(2)} €</td>
                      <td className="text-right">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          <div style={{ width: 80, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: c.tipo === "fijo" ? "var(--cyan)" : "var(--green)", borderRadius: 2 }} />
                          </div>
                          <span className="mono text-xs">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};
