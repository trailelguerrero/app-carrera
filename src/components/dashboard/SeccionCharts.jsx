/**
 * SeccionCharts.jsx — extraído de Dashboard.jsx (CORE-12)
 * Gráfico de inscritos por distancia, barras de ingresos vs costes, y MiniTimeline.
 * Props: d (datos KPIs), fmtEur (formateador), TOOLTIP_STYLE, navigate (fn)
 */
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  Tooltip as RechartsTip,
} from "recharts";
import { EmptyChart } from "@/components/dashboard/EmptyChart";
import { MiniTimeline } from "@/components/dashboard/MiniTimeline";

export function SeccionCharts({ d, fmtEur, TOOLTIP_STYLE, navigate }) {
  const resColor = d.resultado >= 0 ? "var(--green)" : "var(--red)";

  return (
    <div className="dash-charts-row mb">

      {/* Inscritos */}
      <div className="card dash-chart-card">
        <div className="card-title cyan">🏃 Inscritos por distancia</div>
        {d.totalInscritos === 0
          ? <EmptyChart mensaje="Sin inscritos aún" sub="Introduce datos en Presupuesto → Inscritos" />
          : <>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={[
                  { name: "TG7",  value: d.inscritosPorDist.TG7  || 0 },
                  { name: "TG13", value: d.inscritosPorDist.TG13 || 0 },
                  { name: "TG25", value: d.inscritosPorDist.TG25 || 0 },
                ]} cx="50%" cy="50%" innerRadius={36} outerRadius={55} paddingAngle={3} dataKey="value">
                  {["#22d3ee", "#a78bfa", "#34d399"].map((c, i) => <Cell key={i} fill={c} opacity={0.9} />)}
                </Pie>
                <RechartsTip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${v} corredores`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {[["TG7", "#22d3ee"], ["TG13", "#a78bfa"], ["TG25", "#34d399"]].map(([dist, color]) => {
                const ins = d.inscritosPorDist[dist];
                const max = d.maximosPorDist[dist];
                const pct = d.ocupacionPorDist[dist];
                return (
                  <div key={dist}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.12rem" }}>
                      <span className="mono xs bold" style={{ color }}>{dist}</span>
                      <span className="mono xs muted">{ins}{max > 0 ? `/${max} (${pct}%)` : "corredores"}</span>
                    </div>
                    {max > 0 && (
                      <div style={{ height: 3, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: "width .5s" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        }
      </div>

      {/* Ingresos vs Costes */}
      <div className="card dash-chart-card">
        <div className="card-title violet">💰 Ingresos vs Costes</div>
        {d.totalIngresos === 0 && d.totalCostesFijos === 0
          ? <EmptyChart mensaje="Sin datos económicos" sub="Configura costes e inscritos en Presupuesto" />
          : (() => {
            const cam = d.camisetasDesglose || {};
            const items = [
              { label: "Inscripciones", val: d.totalIngresos, color: "#22d3ee", tipo: "+" },
              { label: "Patrocinios", val: d.totalIngresosExtra, color: "#34d399", tipo: "+" },
              cam.ingresosExterno > 0 && { label: `👕 Cam. corredor (${cam.unidCorredor || 0}u)`, val: cam.ingresosExterno, color: "#c084fc", tipo: "+" },
              cam.ingresosPedidos > 0 && { label: `📦 Cam. pedidos extra`, val: cam.ingresosPedidos, color: "#a78bfa", tipo: "+" },
              cam.costeTotal > 0 && { label: `👕 Coste camisetas`, val: cam.costeTotal, color: "#f472b6", tipo: "-" },
              { label: "C. Fijos", val: d.totalCostesFijos, color: "#f87171", tipo: "-" },
              { label: "C. Variables", val: d.totalCostesVars, color: "#fb923c", tipo: "-" },
            ].filter(Boolean);
            const maxVal = Math.max(...items.map(i => i.val), 1);
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", marginTop: ".25rem" }}>
                {items.map(item => {
                  const pct = Math.min(Math.round(item.val / maxVal * 100), 100);
                  return (
                    <div key={item.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".18rem" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                          {item.tipo === "+" ? "↑" : "↓"} {item.label}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: item.color, fontWeight: 700 }}>
                          {fmtEur(item.val)}
                        </span>
                      </div>
                      <div style={{ height: 5, background: "var(--surface3)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${pct}%`, background: item.color,
                          borderRadius: 3, opacity: item.val <= 0 ? 0.3 : 0.85, transition: "width .5s"
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        }
        {/* Resultado — resumen al pie */}
        {(d.totalIngresos > 0 || d.totalCostesFijos > 0) && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: ".6rem", paddingTop: ".5rem",
            borderTop: "1px solid var(--border)",
          }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
              color: "var(--text-muted)", display: "flex", alignItems: "center", gap: ".4rem"
            }}>
              Resultado
              <span className={`badge ${d.roiGlobal >= 0 ? "badge-green" : "badge-red"}`}
                style={{ fontSize: "var(--fs-2xs)" }}>
                Margen {d.roiGlobal > 0 ? "+" : ""}{d.roiGlobal}%
              </span>
            </span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)",
              fontWeight: 800, color: resColor
            }}>
              {fmtEur(d.resultado)}
            </span>
          </div>
        )}
      </div>

      {/* Arco temporal del evento */}
      <MiniTimeline
        hitos={d.hitosProximos}
        tramos={d.tramos}
        eventoFecha={d.eventoFecha}
        diasHasta={d.diasHasta}
        yaFue={d.yaFue}
        navigate={navigate}
      />

    </div>
  );
}
