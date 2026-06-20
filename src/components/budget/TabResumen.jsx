import React from "react";
import { Tooltip, TooltipIcon } from "../common/Tooltip";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";

export const TabResumen = ({ 
  totalInscritos, 
  ingresosPorDistancia, 
  costesFijos, 
  costesVariables, 
  totalIngresosConMerch,
  totalIngresosExtra,
  merchTotales,
  totalIngresosCamisetas,
  totalGastosCamisetas,
  resultado, 
  conceptos, 
  precioMedioDistancia, 
  costesVarPorCorredor,
  costesFijoPorCorredor,
  ingresosDesglosados,
  // MEJ-02: margen de seguridad
  margenConfig,
  // MEJ-03: inscritos de pago vs promo
  inscritosConPago,
  precioMedioPago,
}) => {
  // MEJ-02: cálculo del resultado objetivo (con colchón de seguridad)
  const margenActivo = margenConfig?.alertaActiva && (margenConfig?.valor || 0) > 0;
  const costes = costesFijos.total + costesVariables.total;
  let colchon = 0;
  if (margenActivo) {
    if ((margenConfig?.tipo || "porcentaje") === "porcentaje") {
      colchon = costes * (margenConfig.valor / 100);
    } else {
      colchon = margenConfig.valor;
    }
  }
  const resultadoObjetivo = resultado.total - colchon; // positivo = objetivo cumplido
  const estadoMargen = resultado.total >= colchon
    ? "ok"        // cubre costes Y el colchón
    : resultado.total >= 0
      ? "parcial"  // cubre costes pero no el colchón
      : "negativo"; // ni cubre costes

  // MEJ-03: hay inscritos promo si alguna distancia tiene precio 0 con inscritos
  const hayInscritosPromo = inscritosConPago && (inscritosConPago.promo?.total || 0) > 0;

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
                <td>
  <Tooltip position="top" text={"Ingresos totales de inscripción de esta distancia ÷ número de inscritos.\nEs el precio real ponderado entre todos los tramos, no el precio de lista."}>
    <span>Precio medio</span><TooltipIcon />
  </Tooltip>
</td>
                <td className="mono">{precioMedioDistancia.total.toFixed(2)} €</td>
                {DISTANCIAS.map(d => <td key={d} className="mono">{precioMedioDistancia[d].toFixed(2)} €</td>)}
              </tr>
              <tr style={{ borderTop: "2px solid var(--border)" }}>
                <td style={{ fontWeight: 700, color: "var(--violet)" }}>
  <Tooltip position="top" text={"Suma de: inscritos × precio de cada tramo, para cada distancia.\nEs el único ingreso operativo de la carrera."}>
    <span>↑ Ingresos inscripciones</span><TooltipIcon />
  </Tooltip>
</td>
                <td className="mono" style={{ fontWeight: 700, color: "var(--violet)" }}>{ingresosPorDistancia.total.toFixed(2)} €</td>
                {DISTANCIAS.map(d => <td key={d} className="mono" style={{ color: "var(--violet)" }}>{ingresosPorDistancia[d].toFixed(2)} €</td>)}
              </tr>
              <tr>
                <td style={{ color: "var(--cyan)" }}>
  <Tooltip position="top" text={`Gastos que no varían con el número de corredores (ambulancias, cronometraje, etc.).\nTotal fijo: ${costesFijos.total.toFixed(0)} €.\n\nLa distribución por distancia es orientativa: se calcula en proporción a los inscritos actuales de cada distancia. Si cambia el reparto de inscritos, los costes por distancia cambian — pero el total (${costesFijos.total.toFixed(0)} €) siempre es el mismo.\nPara decisiones financieras, usa el TOTAL.`}>
    <span>↓ Costes fijos</span><TooltipIcon />
  </Tooltip>
</td>
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
                <td style={{ color: "var(--green)" }}>
  <Tooltip position="top" text={"Gastos que escalan con cada corredor (medalla, dorsal, avituallamiento...).\nCoste unitario × número de inscritos por distancia."}>
    <span>↓ Costes variables</span><TooltipIcon />
  </Tooltip>
</td>
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
                <td style={{ color: "var(--orange)" }}>↑ Patrocinios y otros ingresos</td>
                <td className="mono" style={{ color: "var(--orange)" }}>{(totalIngresosExtra ?? 0).toFixed(2)} €</td>
                {DISTANCIAS.map(d => <td key={d} className="mono text-muted">—</td>)}
              </tr>
              <tr>
                <td style={{ color: "var(--violet)" }}>
  <Tooltip position="top" text={"Ingreso bruto por venta de camisetas del evento (corredores, no corredores, público, voluntarios, niño/a, otros).\nEl gasto de producción/compra de camisetas ya está incluido dentro de '↓ Costes fijos' (se prorratea por inscritos igual que cronometraje o ambulancias), por eso no se resta aquí otra vez."}>
    <span>↑ Camisetas (ingreso)</span><TooltipIcon />
  </Tooltip>
</td>
                <td className="mono" style={{ color: "var(--violet)" }}>{(totalIngresosCamisetas ?? 0).toFixed(2)} €</td>
                {DISTANCIAS.map(d => <td key={d} className="mono text-muted">—</td>)}
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>&nbsp;&nbsp;└ de los cuales, gasto camisetas (ya en ↓ Costes fijos)</td>
                <td className="mono text-xs text-muted">{(totalGastosCamisetas ?? 0).toFixed(2)} €</td>
                {DISTANCIAS.map(d => <td key={d} className="mono text-muted">—</td>)}
              </tr>
              <tr>
                <td style={{ color: "var(--green)" }}>↑ Merchandising local (beneficio neto)</td>
                <td className="mono" style={{ color: "var(--green)" }}>{(merchTotales?.beneficio ?? 0).toFixed(2)} €</td>
                {DISTANCIAS.map(d => <td key={d} className="mono text-muted">—</td>)}
              </tr>
              <tr style={{ borderTop: "2px solid var(--border)", background: "var(--surface2)" }}>
                <td style={{ fontWeight: 800, fontSize: "var(--fs-md)" }}>🏁 RESULTADO NETO</td>
                <td className="mono" style={{ fontWeight: 800, fontSize: "var(--fs-md)", color: resultado.total >= 0 ? "var(--green)" : "var(--red)" }}>
                  {resultado.total >= 0 ? "+" : ""}{resultado.total.toFixed(2)} €
                </td>
                {DISTANCIAS.map(d => (
                  <td key={d} className="mono" style={{ fontWeight: 700, color: resultado[d] >= 0 ? "var(--green)" : "var(--red)" }}>
                    {resultado[d] >= 0 ? "+" : ""}{resultado[d].toFixed(2)} €
                  </td>
                ))}
              </tr>
              {/* MEJ-02: fila del colchón de seguridad — solo si margen activo */}
              {margenActivo && (
                <tr style={{ background: estadoMargen === "ok" ? "rgba(52,211,153,0.06)" : estadoMargen === "parcial" ? "rgba(251,191,36,0.06)" : "rgba(248,113,113,0.06)" }}>
                  <td style={{ fontSize: "var(--fs-sm)", color: estadoMargen === "ok" ? "var(--green)" : estadoMargen === "parcial" ? "var(--amber)" : "var(--red)" }}>
                    {estadoMargen === "ok" ? "✅" : estadoMargen === "parcial" ? "⚠️" : "❌"}{" "}
                    Colchón de reserva ({margenConfig.tipo === "porcentaje" ? `${margenConfig.valor}% costes` : `${margenConfig.valor} €`})
                    <Tooltip content={`El colchón de reserva cubre imprevistos (reparaciones, seguro adicional, etc.).\nObjetivo: ${colchon.toFixed(0)} €. Resultado actual: ${resultado.total.toFixed(0)} €.\n${estadoMargen === "ok" ? "✅ Objetivo alcanzado." : estadoMargen === "parcial" ? "⚠️ Cubre costes pero falta el colchón." : "❌ No cubre costes."}`}>
                      <TooltipIcon />
                    </Tooltip>
                  </td>
                  <td className="mono" style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: estadoMargen === "ok" ? "var(--green)" : estadoMargen === "parcial" ? "var(--amber)" : "var(--red)" }}>
                    {estadoMargen === "ok" ? `+${(resultado.total - colchon).toFixed(2)} € sobre objetivo` : estadoMargen === "parcial" ? `Faltan ${(colchon - resultado.total).toFixed(2)} €` : `Déficit ${Math.abs(resultado.total).toFixed(2)} €`}
                  </td>
                  {DISTANCIAS.map(d => <td key={d} className="mono text-muted" style={{ fontSize: "var(--fs-xs)" }}>—</td>)}
                </tr>
              )}
              {/* MEJ-03: nota aclaratoria si hay inscritos con precio 0 */}
              {hayInscritosPromo && (
                <tr style={{ background: "rgba(167,139,250,0.04)" }}>
                  <td colSpan={1 + DISTANCIAS.length + 1} style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", padding: "0.4rem 0.75rem", fontStyle: "italic" }}>
                    ℹ️ Hay {inscritosConPago.promo.total} inscrito{inscritosConPago.promo.total !== 1 ? "s" : ""} con código promocional (precio 0) que no generan ingreso.
                    {" "}Precio medio de pago: {precioMedioPago?.total?.toFixed(2) ?? "—"} € · Precio medio total: {precioMedioDistancia?.total?.toFixed(2) ?? "—"} €
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:".75rem" }}>
            <div className="card-title resumen" style={{ marginBottom:0 }}>
              📊 Top Conceptos por Coste
            </div>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              color:"var(--text-muted)" }}>Análisis de estructura de costes</span>
          </div>
          <div className="overflow-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th className="text-right">Coste total (€)</th>
                  <th className="text-right">
  <Tooltip position="top" text={"Peso de este concepto sobre el total de costes (fijos + variables)."}>
    <span>% sobre total</span><TooltipIcon />
  </Tooltip>
</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...conceptos.filter(c => c.activo).map(c => {
                    let coste = 0;
                    if (c.tipo === "fijo") coste = c.costeTotal;
                    else coste = DISTANCIAS.reduce((s, d) => s + (c.costePorDistancia[d] || 0) * totalInscritos[d], 0);
                    return { ...c, _coste: coste };
                  }),
                  // Fix auditoría Hallazgo 2: el gasto de camisetas ya no vive en el array
                  // `conceptos` desde ECO-08 (se eliminó para evitar doble cómputo), por lo
                  // que sin esta fila sintética nunca aparecería en este ranking, aunque sea
                  // uno de los gastos más grandes del presupuesto. Se prorratea como "fijo"
                  // porque así se suma dentro de costesFijos.total (igual que cronometraje).
                  ...((totalGastosCamisetas ?? 0) > 0
                    ? [{ id: "_camisetas_sintetico", nombre: "Camisetas (evento)", tipo: "fijo", _coste: totalGastosCamisetas }]
                    : []),
                ].sort((a, b) => b._coste - a._coste).slice(0, 10).map(c => {
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
