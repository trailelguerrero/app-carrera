/**
 * TabCostesReales.jsx — MEJ-03
 * Muestra costes reales (pedidos recibidos/facturados) y comprometidos
 * (pedidos confirmados) vs estimados del presupuesto, con desviación por concepto.
 */
import React, { useMemo } from "react";
import { fmt } from "../../lib/budgetUtils";
import { Tooltip, TooltipIcon } from "../common/Tooltip";

const pctColor = (pct) => {
  if (pct === null) return "var(--text-muted)";
  if (pct > 10)  return "var(--red)";
  if (pct > 0)   return "var(--orange)";
  if (pct < -5)  return "var(--green)";
  return "var(--text-muted)";
};

const pctLabel = (pct) => {
  if (pct === null) return "—";
  return (pct > 0 ? "+" : "") + pct + "%";
};

const barWidth = (real, estimado) => {
  if (!estimado || estimado === 0) return real > 0 ? 100 : 0;
  return Math.min(200, Math.round((real / estimado) * 100)); // cap 200% para no romper layout
};

export function TabCostesReales({ costesReales, onNavigatePedidos }) {
  const { porConcepto = [], sinClasificar, totales } = costesReales || {};

  const conDatos = useMemo(() =>
    porConcepto.filter(r => r.costeEstimado > 0 || r.costeReal > 0 || r.costeComprometido > 0),
    [porConcepto]
  );

  const sinDatos = useMemo(() =>
    porConcepto.filter(r => r.costeEstimado > 0 && r.costeReal === 0 && r.costeComprometido === 0),
    [porConcepto]
  );

  const haySinClasificar = sinClasificar &&
    (sinClasificar.costeReal > 0 || sinClasificar.costeComprometido > 0);

  if (!costesReales || (conDatos.length === 0 && !haySinClasificar)) {
    return (
      <div style={{ padding: "2rem 0", textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "2rem", marginBottom: ".5rem" }}>📭</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)" }}>
          Sin pedidos confirmados, recibidos ni facturados aún.
        </div>
        <div style={{ fontSize: "var(--fs-xs)", marginTop: ".4rem", color: "var(--text-dim)" }}>
          Cuando confirmes pedidos a proveedores, aquí verás el gasto real vs el estimado.
        </div>
        {onNavigatePedidos && (
          <button className="btn btn-ghost" style={{ marginTop: "1rem", fontSize: "var(--fs-sm)" }}
            onClick={onNavigatePedidos}>
            Ir a Pedidos a Proveedores →
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── KPIs globales ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".75rem" }}>
        {[
          { label: "Estimado total", value: fmt(totales.costeEstimado), color: "var(--text-muted)", icon: "📋" },
          { label: "Comprometido", value: fmt(totales.costeComprometido), color: "var(--cyan)", icon: "🔒",
            tip: "Pedidos confirmados — encargados al proveedor pero no recibidos aún." },
          { label: "Real (recibido/facturado)", value: fmt(totales.costeReal), color: totales.costeReal > totales.costeEstimado ? "var(--red)" : "var(--green)", icon: "✅",
            tip: "Pedidos recibidos o facturados — gasto materializado." },
          { label: "Desviación", value: (totales.desviacion >= 0 ? "+" : "") + fmt(totales.desviacion),
            color: pctColor(totales.pct), icon: totales.desviacion > 0 ? "📈" : "📉",
            sub: totales.pct !== null ? pctLabel(totales.pct) + " sobre estimado" : null,
            tip: "Real − Estimado. Positivo = sobrecosto. Negativo = ahorro." },
        ].map(k => (
          <div key={k.label} style={{
            padding: ".75rem 1rem", borderRadius: "var(--r-md)",
            background: "var(--surface2)", border: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".3rem",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)",
              marginBottom: ".3rem" }}>
              {k.icon} {k.label}
              {k.tip && <TooltipIcon text={k.tip} />}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-lg)",
              fontWeight: 700, color: k.color }}>
              {k.value}
            </div>
            {k.sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
              color: k.color, marginTop: ".15rem" }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Tabla por concepto ── */}
      {conDatos.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: ".75rem 1rem", borderBottom: "1px solid var(--border)",
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)",
            display: "flex", gap: ".5rem", alignItems: "center" }}>
            📊 Desglose por concepto de presupuesto
            <TooltipIcon text="Solo muestra conceptos con pedidos vinculados (conceptoId) o con estimado > 0. Los pedidos sin conceptoId aparecen en 'Sin clasificar'." />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface3)" }}>
                  {["Concepto", "Tipo", "Estimado", "Comprometido", "Real", "Desviación"].map(h => (
                    <th key={h} style={{ padding: ".5rem .75rem", textAlign: h === "Concepto" ? "left" : "right",
                      fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                      color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conDatos.map((r, i) => {
                  const bw = barWidth(r.costeReal, r.costeEstimado);
                  return (
                    <tr key={r.conceptoId} style={{
                      borderBottom: "1px solid rgba(255,255,255,.04)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)",
                    }}>
                      <td style={{ padding: ".55rem .75rem" }}>
                        <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)" }}>{r.nombre}</div>
                        {/* Mini barra real vs estimado */}
                        {r.costeEstimado > 0 && (
                          <div style={{ marginTop: ".3rem", height: 3, borderRadius: 2,
                            background: "var(--surface3)", overflow: "hidden", maxWidth: 140 }}>
                            <div style={{
                              height: "100%", width: bw + "%", maxWidth: "100%",
                              background: bw > 100 ? "var(--red)" : bw > 80 ? "var(--orange)" : "var(--cyan)",
                              borderRadius: 2, transition: "width .3s",
                            }}/>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: ".55rem .75rem", textAlign: "right" }}>
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                          padding: ".1rem .35rem", borderRadius: 10,
                          background: r.tipo === "fijo" ? "rgba(34,211,238,.1)" : "rgba(167,139,250,.1)",
                          color: r.tipo === "fijo" ? "var(--cyan)" : "var(--violet)",
                        }}>
                          {r.tipo}
                        </span>
                      </td>
                      <td style={{ padding: ".55rem .75rem", textAlign: "right",
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                        color: "var(--text-muted)" }}>
                        {r.costeEstimado > 0 ? fmt(r.costeEstimado) : "—"}
                      </td>
                      <td style={{ padding: ".55rem .75rem", textAlign: "right",
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                        color: r.costeComprometido > 0 ? "var(--cyan)" : "var(--text-dim)" }}>
                        {r.costeComprometido > 0 ? fmt(r.costeComprometido) : "—"}
                      </td>
                      <td style={{ padding: ".55rem .75rem", textAlign: "right",
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700,
                        color: r.costeReal > 0 ? (r.costeReal > r.costeEstimado && r.costeEstimado > 0 ? "var(--red)" : "var(--green)") : "var(--text-dim)" }}>
                        {r.costeReal > 0 ? fmt(r.costeReal) : "—"}
                      </td>
                      <td style={{ padding: ".55rem .75rem", textAlign: "right",
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700,
                        color: r.costeReal === 0 ? "var(--text-dim)" : pctColor(r.pct) }}>
                        {r.costeReal === 0 ? "—" : (
                          <span title={`${(r.desviacion >= 0 ? "+" : "")}${fmt(r.desviacion)}`}>
                            {pctLabel(r.pct)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Sin clasificar */}
                {haySinClasificar && (
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,.04)",
                    background: "rgba(251,191,36,.04)" }}>
                    <td style={{ padding: ".55rem .75rem" }}>
                      <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)",
                        color: "var(--amber)" }}>Sin clasificar</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                        color: "var(--text-dim)", marginTop: ".1rem" }}>
                        Pedidos sin conceptoId en artículos
                      </div>
                    </td>
                    <td style={{ padding: ".55rem .75rem" }} />
                    <td style={{ padding: ".55rem .75rem", textAlign: "right",
                      color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)" }}>—</td>
                    <td style={{ padding: ".55rem .75rem", textAlign: "right",
                      fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                      color: sinClasificar.costeComprometido > 0 ? "var(--cyan)" : "var(--text-dim)" }}>
                      {sinClasificar.costeComprometido > 0 ? fmt(sinClasificar.costeComprometido) : "—"}
                    </td>
                    <td style={{ padding: ".55rem .75rem", textAlign: "right",
                      fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                      color: sinClasificar.costeReal > 0 ? "var(--amber)" : "var(--text-dim)" }}>
                      {sinClasificar.costeReal > 0 ? fmt(sinClasificar.costeReal) : "—"}
                    </td>
                    <td style={{ padding: ".55rem .75rem" }} />
                  </tr>
                )}

                {/* Fila de totales */}
                <tr style={{ background: "var(--surface3)", fontWeight: 700 }}>
                  <td style={{ padding: ".6rem .75rem", fontFamily: "var(--font-mono)",
                    fontSize: "var(--fs-sm)", color: "var(--text)" }}>TOTAL</td>
                  <td />
                  <td style={{ padding: ".6rem .75rem", textAlign: "right",
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                    color: "var(--text-muted)" }}>
                    {fmt(totales.costeEstimado)}
                  </td>
                  <td style={{ padding: ".6rem .75rem", textAlign: "right",
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                    color: "var(--cyan)" }}>
                    {totales.costeComprometido > 0 ? fmt(totales.costeComprometido) : "—"}
                  </td>
                  <td style={{ padding: ".6rem .75rem", textAlign: "right",
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                    color: totales.costeReal > totales.costeEstimado ? "var(--red)" : "var(--green)" }}>
                    {totales.costeReal > 0 ? fmt(totales.costeReal) : "—"}
                  </td>
                  <td style={{ padding: ".6rem .75rem", textAlign: "right",
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                    color: pctColor(totales.pct) }}>
                    {totales.costeReal > 0 ? pctLabel(totales.pct) : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Conceptos sin pedidos vinculados (sin cobertura) ── */}
      {sinDatos.length > 0 && (
        <div className="card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "var(--text-muted)", marginBottom: ".6rem" }}>
            ⚠️ Conceptos presupuestados sin pedido vinculado aún
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
            {sinDatos.map(r => (
              <span key={r.conceptoId} style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                padding: ".2rem .5rem", borderRadius: 10,
                background: "rgba(251,191,36,.08)",
                color: "var(--amber)", border: "1px solid rgba(251,191,36,.2)",
              }}>
                {r.nombre} · {fmt(r.costeEstimado)}
              </span>
            ))}
          </div>
        </div>
      )}

      {onNavigatePedidos && (
        <div style={{ textAlign: "right" }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--fs-xs)" }}
            onClick={onNavigatePedidos}>
            Ver pedidos a proveedores →
          </button>
        </div>
      )}
    </div>
  );
}
