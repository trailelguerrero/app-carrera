/**
 * SeccionCharts.jsx — extraído de Dashboard.jsx (CORE-12) · MEJ-06
 * Gráfico de inscritos por distancia, barras de ingresos vs costes, y MiniTimeline.
 * Props: d (datos KPIs), fmtEur (formateador), TOOLTIP_STYLE, navigate (fn)
 *
 * MEJ-06: React.memo — el PieChart de recharts es caro de re-renderizar.
 * Se evita cuando el usuario expande/colapsa saludExpandida o avisosExpandidos.
 */
import { useState, memo } from "react";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { EmptyChart } from "@/components/dashboard/EmptyChart";
import { MiniTimeline } from "@/components/dashboard/MiniTimeline";

const DIST_COLORS = ["#22d3ee", "#a78bfa", "#34d399"];
const DIST_NAMES  = ["TG7", "TG13", "TG25"];

export const SeccionCharts = memo(function SeccionCharts({ d, fmtEur, TOOLTIP_STYLE, navigate, moduleStatus }) {
  const resColor = d.resultado >= 0 ? "var(--green)" : "var(--red)";
  const [hoveredDist, setHoveredDist] = useState(null); // "TG7" | "TG13" | "TG25" | null

  return (
    <div className="dash-charts-row mb">

      {/* Inscritos */}
      <div className="card dash-chart-card">
        <div className="card-title cyan">🏃 Inscritos por distancia</div>
        {d.totalInscritos === 0
          ? <EmptyChart mensaje="Sin inscritos aún" sub="Introduce datos en Presupuesto → Inscritos" />
          : <>
            {/* Label de hover — fuera del SVG, encima de las barras */}
            <div style={{ height: 22, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.2rem" }}>
              {hoveredDist && (
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700,
                  color: DIST_COLORS[DIST_NAMES.indexOf(hoveredDist)],
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: 6, padding: "0.1rem 0.7rem",
                }}>
                  {hoveredDist} · {d.inscritosPorDist[hoveredDist]} corredores
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie
                  data={[
                    { name: "TG7",  value: d.inscritosPorDist.TG7  || 0 },
                    { name: "TG13", value: d.inscritosPorDist.TG13 || 0 },
                    { name: "TG25", value: d.inscritosPorDist.TG25 || 0 },
                  ]}
                  cx="50%" cy="50%" innerRadius={36} outerRadius={55} paddingAngle={3} dataKey="value"
                  onMouseEnter={(_, index) => setHoveredDist(DIST_NAMES[index])}
                  onMouseLeave={() => setHoveredDist(null)}
                >
                  {DIST_COLORS.map((c, i) => (
                    <Cell key={i} fill={c} opacity={hoveredDist === null || hoveredDist === DIST_NAMES[i] ? 0.9 : 0.4} />
                  ))}
                </Pie>
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
            // ECO-08/ECO-09: camisetasDesglose tiene shape de calculateCamisetasPresupuesto —
            // 6 categorías independientes, cada una con { ingreso, gasto, unidades }.
            // El gasto total (cam.totalGastos) ya está incluido en d.totalCostesFijos
            // (prorrateado por inscritos) — no se muestra aparte para no duplicarlo visualmente.
            const cam = d.camisetasDesglose || {};
            const camIngPlataforma = (cam.corredores?.ingreso || 0) + (cam.noCorredores?.ingreso || 0) + (cam.ventaPublico?.ingreso || 0);
            const camUdsPlataforma = (cam.corredores?.unidades || 0) + (cam.noCorredores?.unidades || 0) + (cam.ventaPublico?.unidades || 0);
            const camIngOtros = cam.otros?.ingreso || 0;
            const items = [
              { label: "Inscripciones", val: d.totalIngresos, color: "#22d3ee", tipo: "+" },
              { label: "Patrocinios", val: d.totalIngresosExtra, color: "#34d399", tipo: "+" },
              camIngPlataforma > 0 && { label: `👕 Cam. corredor/no corredor (${camUdsPlataforma}u)`, val: camIngPlataforma, color: "#c084fc", tipo: "+" },
              camIngOtros > 0 && { label: `📦 Cam. pedidos extra`, val: camIngOtros, color: "#a78bfa", tipo: "+" },
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
});
