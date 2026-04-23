import React from "react";
import { Tooltip, TooltipIcon } from "../common/Tooltip";
import { DISTANCIAS, DISTANCIA_LABELS } from "../../constants/budgetConstants";

const fmt = (n) => Number(n ?? 0).toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";

export const KpiGlobal = ({
  totalInscritos, ingresosPorDistancia, costesFijos, costesVariables,
  totalIngresosExtra, merchTotales, totalIngresosConMerch, resultado, maximos,
}) => {
  const costesCarrera   = (costesFijos?.total ?? 0) + (costesVariables?.total ?? 0);
  const costesMerch     = merchTotales?.costes ?? 0;
  const ingresosCarrera = (ingresosPorDistancia?.total ?? 0) + (totalIngresosExtra ?? 0);
  // A4 fix: usar beneficio neto (no ingresos brutos) para alinear con resultado.total
  const ingresosTotal   = ingresosCarrera + (merchTotales?.beneficio ?? 0);
  const res             = resultado?.total ?? 0;
  const resPositivo     = res >= 0;
  const resColor        = resPositivo ? "var(--green)" : "var(--red)";
  const resColorClass   = resPositivo ? "green" : "red";

  return (
    <div className="kpi-grid mb">
      <div className="kpi cyan">
        <div className="kpi-label"><Tooltip text={"Total de corredores inscritos sumando todos los tramos y distancias.\nSe usa como base para calcular el prorrateo de costes fijos y el punto de equilibrio."}><span>🏃 Inscritos totales</span><TooltipIcon /></Tooltip></div>
        <div className="kpi-value" style={{ color: "var(--cyan)" }}>{totalInscritos?.total ?? 0}</div>
        <div className="kpi-sub">
          {DISTANCIAS.map(d => {
            const ins = totalInscritos?.[d] ?? 0;
            const max = maximos?.[d] ?? 0;
            const pct = max > 0 ? Math.round(ins / max * 100) : 0;
            return <span key={d} style={{ marginRight: 8 }}>{DISTANCIA_LABELS[d].split(" ")[0]}: {ins}{max > 0 ? `/${max} (${pct}%)` : ""}</span>;
          })}
        </div>
      </div>
      <div className="kpi violet">
        <div className="kpi-label"><Tooltip text={"Suma de: inscritos × precio de cada tramo, para todas las distancias.\nEs el ingreso operativo principal de la carrera."}><span>💳 Ingresos inscripciones</span><TooltipIcon /></Tooltip></div>
        <div className="kpi-value" style={{ color: "var(--violet)" }}>{fmt(ingresosPorDistancia?.total)}</div>
        <div className="kpi-sub">de {totalInscritos?.total ?? 0} corredores</div>
      </div>
      <div className="kpi orange">
        <div className="kpi-label"><Tooltip text={"Ingresos adicionales que no provienen de inscripciones: patrocinadores, subvenciones, colaboraciones en especie.\nSe prorratean entre distancias en proporción a sus ingresos de inscripción."}><span>🤝 Patrocinios y extras</span><TooltipIcon /></Tooltip></div>
        <div className="kpi-value" style={{ color: "var(--orange)" }}>{fmt(totalIngresosExtra)}</div>
        <div className="kpi-sub">Subvenciones · Colaboradores · Otros</div>
      </div>
      <div className="kpi green">
        <div className="kpi-label"><Tooltip text={"Cuenta satélite independiente de la carrera.\nBeneficio neto = ingresos por ventas − coste del producto.\nSolo el beneficio neto se transfiere al resultado de la carrera."}><span>👕 Merchandising</span><TooltipIcon /></Tooltip></div>
        <div className="kpi-value" style={{ color: (merchTotales?.beneficio ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>
          {(merchTotales?.beneficio ?? 0) >= 0 ? "+" : ""}{fmt(merchTotales?.beneficio)}
        </div>
        <div className="kpi-sub">Ventas {fmt(merchTotales?.ingresos)} · Coste {fmt(costesMerch)}</div>
      </div>
      <div className="kpi amber">
        <div className="kpi-label"><Tooltip text={"Costes fijos + costes variables de la carrera.\nNo incluye el coste del merchandising (gestionado como cuenta satélite)."}><span>📦 Costes carrera</span><TooltipIcon /></Tooltip></div>
        <div className="kpi-value" style={{ color: "var(--amber)" }}>{fmt(costesCarrera)}</div>
        <div className="kpi-sub">Fijos {fmt(costesFijos?.total)} · Var {fmt(costesVariables?.total)}</div>
      </div>
      <div className={`kpi ${resColorClass}`}>
        <div className="kpi-label"><Tooltip text={"Ingresos inscripciones + Patrocinios + Beneficio merch − Costes fijos − Costes variables.\nPositivo = superávit. Negativo = déficit."}><span>⚖️ Resultado neto</span><TooltipIcon /></Tooltip></div>
        <div className="kpi-value" style={{ color: resColor }}>{res >= 0 ? "+" : ""}{fmt(res)}</div>
        <div className="kpi-sub">{resPositivo ? "✓ Superávit" : "✗ Déficit"} · Ingresos totales: {fmt(ingresosTotal)}</div>
      </div>
    </div>
  );
};
