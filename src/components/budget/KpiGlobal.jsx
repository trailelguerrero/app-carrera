import React from "react";
import { DISTANCIAS, DISTANCIA_LABELS } from "../../constants/budgetConstants";

const fmt = (n) => Number(n ?? 0).toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";

export const KpiGlobal = ({
  totalInscritos,
  ingresosPorDistancia,
  costesFijos,
  costesVariables,
  totalIngresosExtra,
  merchTotales,
  totalIngresosConMerch,
  resultado,
  maximos,
}) => {
  const costesTotal     = (costesFijos?.total ?? 0) + (costesVariables?.total ?? 0);
  const ingresosTotal   = (ingresosPorDistancia?.total ?? 0) + (totalIngresosConMerch ?? 0);
  const res             = resultado?.total ?? 0;
  const resPositivo     = res >= 0;
  const resColor        = resPositivo ? "var(--green)" : "var(--red)";
  const resColorClass   = resPositivo ? "green" : "red";

  return (
    <div className="kpi-grid mb">

      {/* Inscritos */}
      <div className="kpi cyan">
        <div className="kpi-label">🏃 Inscritos totales</div>
        <div className="kpi-value" style={{ color: "var(--cyan)" }}>
          {totalInscritos?.total ?? 0}
        </div>
        <div className="kpi-sub">
          {DISTANCIAS.map(d => {
            const ins = totalInscritos?.[d] ?? 0;
            const max = maximos?.[d] ?? 0;
            const pct = max > 0 ? Math.round(ins / max * 100) : 0;
            return (
              <span key={d} style={{ marginRight: 8 }}>
                {DISTANCIA_LABELS[d].split(" ")[0]}: {ins}{max > 0 ? `/${max} (${pct}%)` : ""}
              </span>
            );
          })}
        </div>
      </div>

      {/* Ingresos inscripciones */}
      <div className="kpi violet">
        <div className="kpi-label">💳 Ingresos inscripciones</div>
        <div className="kpi-value" style={{ color: "var(--violet)" }}>
          {fmt(ingresosPorDistancia?.total)}
        </div>
        <div className="kpi-sub">de {totalInscritos?.total ?? 0} corredores</div>
      </div>

      {/* Otros ingresos */}
      <div className="kpi orange">
        <div className="kpi-label">🎁 Otros ingresos</div>
        <div className="kpi-value" style={{ color: "var(--orange)" }}>
          {fmt(totalIngresosConMerch)}
        </div>
        <div className="kpi-sub">
          Patrocinios: {fmt(totalIngresosExtra)} · Merch: {fmt(merchTotales?.beneficio)}
        </div>
      </div>

      {/* Costes totales */}
      <div className="kpi amber">
        <div className="kpi-label">📦 Costes totales</div>
        <div className="kpi-value" style={{ color: "var(--amber)" }}>
          {fmt(costesTotal)}
        </div>
        <div className="kpi-sub">
          Fijos {fmt(costesFijos?.total)} · Var {fmt(costesVariables?.total)}
        </div>
      </div>

      {/* Resultado */}
      <div className={`kpi ${resColorClass}`}>
        <div className="kpi-label">⚖️ Resultado neto</div>
        <div className="kpi-value" style={{ color: resColor }}>
          {res >= 0 ? "+" : ""}{fmt(res)}
        </div>
        <div className="kpi-sub">
          {resPositivo ? "✓ Superávit" : "✗ Déficit"} · Total ingresos: {fmt(ingresosTotal)}
        </div>
      </div>

    </div>
  );
};
