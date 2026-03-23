import React from "react";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";

export const TabInscritos = ({ 
  tramos, 
  inscritos, 
  updateInscritos, 
  totalInscritos, 
  ingresosPorDistancia, 
  precioMedioDistancia, 
  maximos, 
  setMaximos 
}) => {
  return (
    <>
      <div className="card">
        <div className="card-title" style={{ color: "var(--cyan)" }}>🎯 Plazas Máximas por Distancia</div>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          {DISTANCIAS.map(d => {
            const pct = maximos[d] > 0 ? Math.min((totalInscritos[d] / maximos[d]) * 100, 100) : 0;
            const color = pct >= 90 ? "var(--red)" : pct >= 70 ? "var(--amber)" : "var(--green)";
            const libre = Math.max(maximos[d] - totalInscritos[d], 0);
            return (
              <div key={d} style={{ minWidth: 200, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ color: DISTANCIA_COLORS[d], fontWeight: 700, fontSize: "0.85rem" }}>{DISTANCIA_LABELS[d]}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>Máx. plazas:</span>
                  <NumInput value={maximos[d]} onChange={v => setMaximos(prev => ({ ...prev, [d]: Math.max(1, Math.round(v)) }))} step={10} small />
                </div>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: color, transition: "width 0.4s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color }}>{totalInscritos[d]} inscritos · {pct.toFixed(0)}%</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: libre <= 10 ? "var(--red)" : "var(--text-muted)" }}>{libre} libres</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ color: "var(--amber)" }}>🏃 Inscritos por Tramo y Distancia</div>
        <div className="overflow-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Tramo</th>
                <th>Fecha límite</th>
                {DISTANCIAS.map(d => (
                  <th key={d} className="text-right">
                    <span className="dist-dot" style={{ background: DISTANCIA_COLORS[d] }} /> {DISTANCIA_LABELS[d]}
                  </th>
                ))}
                <th className="text-right">Subtotal</th>
                <th className="text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {tramos.map(t => {
                const subtotal = DISTANCIAS.reduce((s, d) => s + (inscritos.tramos[t.id]?.[d] || 0), 0);
                const ing = DISTANCIAS.reduce((s, d) => s + (inscritos.tramos[t.id]?.[d] || 0) * t.precios[d], 0);
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.nombre}</td>
                    <td className="mono text-xs text-muted">{t.fechaFin}</td>
                    {DISTANCIAS.map(d => (
                      <td key={d} className="text-right">
                        <NumInput
                          value={inscritos.tramos[t.id]?.[d] || 0}
                          onChange={v => updateInscritos(t.id, d, Math.round(v))}
                          step={1}
                          small
                        />
                      </td>
                    ))}
                    <td className="text-right mono" style={{ fontWeight: 600 }}>{subtotal}</td>
                    <td className="text-right mono" style={{ color: "var(--violet)" }}>{ing.toFixed(0)} €</td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td colSpan={2}>TOTAL</td>
                {DISTANCIAS.map(d => (
                  <td key={d} className="text-right mono" style={{ color: DISTANCIA_COLORS[d] }}>
                    {totalInscritos[d]}
                  </td>
                ))}
                <td className="text-right mono">{totalInscritos.total}</td>
                <td className="text-right mono" style={{ color: "var(--violet)" }}>{ingresosPorDistancia.total.toFixed(0)} €</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
