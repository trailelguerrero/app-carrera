import React from "react";
import { DISTANCIAS, DISTANCIA_LABELS } from "../../constants/budgetConstants";

export const KpiGlobal = ({ 
  totalInscritos, 
  ingresosPorDistancia, 
  costesFijos, 
  costesVariables, 
  totalIngresosExtra, 
  merchTotales, 
  totalIngresosConMerch, 
  resultado, 
  maximos 
}) => {
  const costesTotal = costesFijos.total + costesVariables.total;
  const totalIngresosGlobal = ingresosPorDistancia.total + totalIngresosConMerch;
  const color = resultado.total > 0 ? "green" : resultado.total < 0 ? "red" : "amber";
  
  return (
    <div className="kpi-grid">
      <div className="kpi cyan">
        <div className="kpi-label">Inscritos totales</div>
        <div className="kpi-value">{totalInscritos.total}</div>
        <div className="kpi-sub">
          {DISTANCIAS.map(d => {
            const pct = maximos[d] > 0 ? Math.round(totalInscritos[d] / maximos[d] * 100) : 0;
            return (
              <span key={d} style={{ marginRight: 6 }}>
                {DISTANCIA_LABELS[d].split(" ")[0]}: {totalInscritos[d]}/{maximos[d]} ({pct}%)
              </span>
            );
          })}
        </div>
      </div>
      <div className="kpi violet">
        <div className="kpi-label">Ingresos inscripciones</div>
        <div className="kpi-value">{ingresosPorDistancia.total.toFixed(0)} €</div>
        <div className="kpi-sub">de {totalInscritos.total} corredores</div>
      </div>
      <div className="kpi orange">
        <div className="kpi-label">Otros ingresos</div>
        <div className="kpi-value">{totalIngresosConMerch.toFixed(0)} €</div>
        <div className="kpi-sub">
          Patrocinios: {totalIngresosExtra.toFixed(0)} € · Merch: {merchTotales.beneficio.toFixed(0)} €
        </div>
      </div>
      <div className="kpi amber">
        <div className="kpi-label">Costes totales</div>
        <div className="kpi-value">{costesTotal.toFixed(0)} €</div>
        <div className="kpi-sub">
          Fijos {costesFijos.total.toFixed(0)} · Var {costesVariables.total.toFixed(0)}
        </div>
      </div>
      <div className={`kpi ${color}`}>
        <div className="kpi-label">Resultado neto</div>
        <div className="kpi-value">{resultado.total >= 0 ? "+" : ""}{resultado.total.toFixed(0)} €</div>
        <div className="kpi-sub">
          {resultado.total >= 0 ? "✓ Superávit" : "✗ Déficit"} · Ingresos totales: {totalIngresosGlobal.toFixed(0)} €
        </div>
      </div>
    </div>
  );
};
