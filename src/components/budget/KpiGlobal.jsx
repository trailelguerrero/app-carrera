import React from "react";
import { Tooltip, TooltipIcon } from "../common/Tooltip";
import { DISTANCIAS, DISTANCIA_LABELS } from "../../constants/budgetConstants";

const fmt = (n) => Number(n ?? 0).toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";

export const KpiGlobal = ({
  totalInscritos, ingresosPorDistancia, costesFijos, costesVariables,
  totalIngresosExtra, merchTotales, totalIngresosConMerch, resultado, maximos,
  margenConfig,
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

  // Semáforo de margen — UX mejora
  const mc = margenConfig ?? { tipo: "porcentaje", valor: 10, alertaActiva: true };
  const margenObjetivo = mc.tipo === "porcentaje"
    ? costesCarrera * (mc.valor / 100)
    : mc.valor;
  const margenActual = res;
  // BUG-DASH-05 fix: denominador explicitado como costesCarrera (fijos+var, excluye merch).
  // El Dashboard usa el mismo denominador al calcular ROI (totalCostesFijos+totalCostesVars).
  // La diferencia con el % del Dashboard es que allí se llama "Margen" y aquí "% sobre objetivo".
  const pctMargen = costesCarrera > 0 ? Math.round(margenActual / costesCarrera * 100) : 0;
  const estadoMargen = margenActual >= margenObjetivo ? "verde"
    : margenActual >= margenObjetivo * 0.5 ? "ambar"
    : "rojo";
  const COLORES_SEMAFORO = { verde: "var(--green)", ambar: "var(--amber)", rojo: "var(--red)" };
  const colorMargen = COLORES_SEMAFORO[estadoMargen];
  // C2.1: clase del sistema (.kpi.green/.amber/.red) en vez de inline borderColor
  const estadoClase = { verde: "green", ambar: "amber", rojo: "red" }[estadoMargen];

  // Coste por corredor (UX-03)
  const totalIns = totalInscritos?.total ?? 0;
  const costePorCorredor = totalIns > 0 ? Math.round(costesCarrera / totalIns * 100) / 100 : null;

  return (
    <div className="kpi-grid mb">
      {/* ── Inscritos totales ── */}
      <div className="kpi cyan">
        <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          🏃 Inscritos totales
          <Tooltip text={"Total de corredores inscritos sumando todos los tramos y distancias.\nSe usa como base para calcular el prorrateo de costes fijos y el punto de equilibrio."}><TooltipIcon size={11}/></Tooltip>
        </div>
        <div className="kpi-value" style={{ color: "var(--cyan)" }}>{totalInscritos?.total ?? 0}</div>
        <div className="kpi-sub">
          {DISTANCIAS.map(d => {
            const ins = totalInscritos?.[d] ?? 0;
            const max = maximos?.[d] ?? 0;
            const pct = max > 0 ? Math.round(ins / max * 100) : 0;
            return <span key={d} style={{ marginRight: 8 }}>{DISTANCIA_LABELS[d].split(" ")[0]}: {ins}{max > 0 ? `/${max} (${pct}%)` : ""}</span>;
          })}
        </div>
        {/* Barra de progreso: inscritos / máximo total */}
        {(() => { const totalMax = Object.values(maximos || {}).reduce((s, v) => s + (v || 0), 0); const pct = totalMax > 0 ? Math.min(100, Math.round((totalInscritos?.total ?? 0) / totalMax * 100)) : undefined; return pct !== undefined ? (<div className="kpi-progress"><div className="kpi-progress-fill" style={{ width: `${pct}%`, background: "var(--cyan)", boxShadow: "0 0 6px rgba(34,211,238,.5)" }}/></div>) : null; })()}
      </div>

      {/* ── Ingresos inscripciones ── */}
      <div className="kpi violet">
        <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          💳 Ingresos inscripciones
          <Tooltip text={"Suma de: inscritos × precio de cada tramo, para todas las distancias.\nEs el ingreso operativo principal de la carrera."}><TooltipIcon size={11}/></Tooltip>
        </div>
        <div className="kpi-value" style={{ color: "var(--violet)" }}>{fmt(ingresosPorDistancia?.total)}</div>
        <div className="kpi-sub">de {totalInscritos?.total ?? 0} corredores</div>
      </div>

      {/* ── Patrocinios y extras ── */}
      <div className="kpi orange">
        <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          🤝 Patrocinios y extras
          <Tooltip text={"Ingresos adicionales que no provienen de inscripciones: patrocinadores, subvenciones, colaboraciones en especie.\nSe prorratean entre distancias en proporción a sus ingresos de inscripción."}><TooltipIcon size={11}/></Tooltip>
        </div>
        <div className="kpi-value" style={{ color: "var(--orange)" }}>{fmt(totalIngresosExtra)}</div>
        <div className="kpi-sub">Subvenciones · Colaboradores · Otros</div>
      </div>

      {/* ── Merchandising ── */}
      <div className="kpi green">
        <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          👕 Merchandising
          <Tooltip text={"Cuenta satélite independiente de la carrera.\nBeneficio neto = ingresos por ventas − coste del producto.\nSolo el beneficio neto se transfiere al resultado de la carrera."}><TooltipIcon size={11}/></Tooltip>
        </div>
        <div className="kpi-value" style={{ color: (merchTotales?.beneficio ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>
          {(merchTotales?.beneficio ?? 0) >= 0 ? "+" : ""}{fmt(merchTotales?.beneficio)}
        </div>
        <div className="kpi-sub">Ventas {fmt(merchTotales?.ingresos)} · Coste {fmt(costesMerch)}</div>
      </div>

      {/* ── Costes carrera ── */}
      <div className="kpi amber">
        <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          📦 Costes carrera
          <Tooltip text={"Costes fijos + costes variables de la carrera.\nNo incluye el coste del merchandising (gestionado como cuenta satélite)."}><TooltipIcon size={11}/></Tooltip>
        </div>
        <div className="kpi-value" style={{ color: "var(--amber)" }}>{fmt(costesCarrera)}</div>
        <div className="kpi-sub">Fijos {fmt(costesFijos?.total)} · Var {fmt(costesVariables?.total)}</div>
      </div>

      {/* ── Resultado neto ── */}
      <div className={`kpi ${resColorClass}`}>
        <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          ⚖️ Resultado neto
          <Tooltip text={"Ingresos inscripciones + Patrocinios + Beneficio merch − Costes fijos − Costes variables.\nPositivo = superávit. Negativo = déficit."}><TooltipIcon size={11}/></Tooltip>
        </div>
        <div className="kpi-value" style={{ color: resColor }}>{res >= 0 ? "+" : ""}{fmt(res)}</div>
        <div className="kpi-sub">{resPositivo ? "✓ Superávit" : "✗ Déficit"} · Ingresos totales: {fmt(ingresosTotal)}</div>
      </div>

      {/* ── Margen sobre objetivo — C2.1: usa clase del sistema en vez de inline style ── */}
      <div className={`kpi ${estadoClase}`}>
        <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          🎯 Margen sobre objetivo
          <Tooltip text={`Margen actual sobre los costes de carrera (fijos + variables, sin merch) (${pctMargen}%).\nObjetivo: ${mc.tipo === "porcentaje" ? mc.valor + "%" : fmt(mc.valor)} sobre costes.\nVerde ≥ objetivo · Ámbar ≥ 50% objetivo · Rojo < 50% objetivo.`}><TooltipIcon size={11}/></Tooltip>
        </div>
        <div className="kpi-value" style={{ color: colorMargen }}>
          {pctMargen >= 0 ? "+" : ""}{pctMargen}%
        </div>
        <div className="kpi-sub">
          {estadoMargen === "verde" ? "✓ Objetivo alcanzado" : estadoMargen === "ambar" ? "⚠ Margen justo" : "✗ Por debajo del objetivo"}
          {costePorCorredor !== null && ` · ${fmt(costePorCorredor)}/corredor`}
        </div>
        {/* C2.2: barra de progreso hacia el objetivo */}
        <div className="kpi-progress">
          <div className="kpi-progress-fill" style={{
            width: `${Math.min(100, Math.max(0, pctMargen))}%`,
            background: colorMargen,
            boxShadow: `0 0 6px ${colorMargen}80`,
          }}/>
        </div>
      </div>
    </div>
  );
};
