import React from "react";
import { Tooltip, TooltipIcon } from "../common/Tooltip";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";

export const TabEquilibrio = ({
  totalInscritos,
  precioMedioDistancia,
  costesVarPorCorredor,
  costesFijos,
  totalIngresosConMerch,
  puntoEquilibrio,   // PE por distancia independiente (heredado, no se elimina)
  resultado,
  ingresosPorDistancia,
  peGlobal,          // PE global real con distribución por mix
  maximos,
}) => {
  const pg = peGlobal || {};
  const totalN = totalInscritos?.total ?? 0;

  // ── Cobertura actual ────────────────────────────────────────────────────────
  const coberturaFijos = (costesFijos?.total > 0)
    ? Math.min(
        (DISTANCIAS.reduce((s, d) =>
          s + (precioMedioDistancia[d] - costesVarPorCorredor[d]) * (totalInscritos[d] || 0), 0)
          + totalIngresosConMerch) / costesFijos.total * 100,
        200)
    : 100;

  const peG       = pg.peGlobal ?? null;
  const viable    = pg.viable !== false;
  const diferencia = pg.diferencia ?? (totalN - (peG || 0));
  const cobertura  = pg.coberturaPct ?? 0;

  return (
    <>
      {/* ── KPIs ── */}
      <div className="kpi-grid">
        <div className="kpi amber">
          <div className="kpi-label">
            <Tooltip text={"Costes fijos totales menos patrocinios y beneficio de merchandising.\nEsto es lo que deben cubrir las inscripciones."}>
              <span>Costes Fijos a Cubrir</span><TooltipIcon />
            </Tooltip>
          </div>
          <div className="kpi-value">{(pg.fijosNetos ?? 0).toFixed(0)} €</div>
          <div className="kpi-sub">
            {(pg.fijosNetos ?? 0) === 0 ? "✓ Cubiertos" : `de ${costesFijos?.total?.toFixed(0) ?? 0} € totales`}
          </div>
        </div>

        <div className="kpi cyan">
          <div className="kpi-label">
            <Tooltip text={"Precio medio − coste variable por corredor, ponderado por el mix actual de distancias.\nCada inscripción adicional aporta esta cantidad para cubrir los costes fijos."}>
              <span>Margen Contribución Medio</span><TooltipIcon />
            </Tooltip>
          </div>
          <div className="kpi-value">{(pg.margenMedio ?? 0).toFixed(2)} €/cte</div>
          <div className="kpi-sub">Media ponderada por mix</div>
        </div>

        <div className={`kpi ${peG === 0 ? "green" : viable ? "violet" : "red"}`}>
          <div className="kpi-label">
            <Tooltip text={"Número mínimo de corredores en total — con el mix actual de distancias — para que ingresos = costes.\nFórmula: Costes fijos netos ÷ Margen medio ponderado.\nLa distribución por distancia se calcula respetando el aforo máximo de cada una."}>
              <span>PE Global (mix actual)</span><TooltipIcon />
            </Tooltip>
          </div>
          <div className="kpi-value">
            {peG === null ? "∞" : peG === 0 ? "✓ 0" : peG}
          </div>
          <div className="kpi-sub">corredores totales</div>
        </div>

        <div className={`kpi ${coberturaFijos >= 100 ? "green" : coberturaFijos >= 75 ? "amber" : "red"}`}>
          <div className="kpi-label">
            <Tooltip text={"(Margen de contribución actual + ingresos extra) ÷ Costes fijos totales.\n100% = equilibrio exacto. Por encima = superávit."}>
              <span>Cobertura de Fijos</span><TooltipIcon />
            </Tooltip>
          </div>
          <div className="kpi-value">{coberturaFijos.toFixed(0)}%</div>
          <div className="kpi-sub">{totalN} inscritos actuales</div>
        </div>
      </div>

      {/* ── Alerta: evento no viable ── */}
      {!viable && peG !== null && (
        <div style={{ background:"rgba(248,113,113,0.06)", border:"1px solid rgba(248,113,113,0.3)",
          borderRadius:10, padding:"0.85rem 1rem", marginBottom:"1rem" }}>
          <div style={{ display:"flex", gap:"0.6rem", alignItems:"flex-start" }}>
            <span style={{ fontSize:"1.1rem", flexShrink:0 }}>⚠️</span>
            <div>
              <div style={{ fontWeight:700, fontSize:"0.82rem", color:"var(--red)", marginBottom:"0.35rem" }}>
                Equilibrio no alcanzable con el aforo disponible
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.68rem", color:"var(--text-muted)", lineHeight:1.6 }}>
                El PE global es <strong style={{ color:"var(--red)" }}>{peG} corredores</strong> pero
                el aforo total máximo es <strong style={{ color:"var(--amber)" }}>{pg.aforoTotal}</strong>.
                Aunque se vendieran todas las plazas, el evento seguiría en pérdidas.
              </div>
              <div style={{ marginTop:"0.5rem", fontFamily:"var(--font-mono)", fontSize:"0.62rem", color:"var(--text-dim)" }}>
                Soluciones: subir precios, reducir costes fijos, aumentar el aforo máximo, o conseguir más patrocinios.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra de progreso global ── */}
      {peG !== null && peG > 0 && (
        <div style={{ marginBottom:"1rem", padding:"0.85rem 1rem",
          background:"var(--surface2)", borderRadius:10, border:"1px solid var(--border)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            marginBottom:"0.55rem", flexWrap:"wrap", gap:"0.4rem" }}>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem",
              color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em" }}>
              Progreso hacia el equilibrio global
            </span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.68rem", fontWeight:700,
              color: diferencia >= 0 ? "var(--green)" : diferencia >= -(peG*0.25) ? "var(--amber)" : "var(--red)" }}>
              {diferencia >= 0
                ? `✓ Superávit — ${diferencia} corredores por encima`
                : `Faltan ${Math.abs(diferencia)} corredores para el equilibrio`}
            </span>
          </div>
          <div style={{ position:"relative", height:24, background:"var(--surface3)", borderRadius:12 }}>
            <div style={{
              position:"absolute", left:0, top:0, height:"100%", borderRadius:12,
              width:`${Math.min(cobertura, 100)}%`,
              background: diferencia >= 0
                ? "linear-gradient(90deg,var(--green),#10b981)"
                : diferencia >= -(peG*0.25)
                ? "linear-gradient(90deg,var(--amber),#f59e0b)"
                : "linear-gradient(90deg,var(--red),#ef4444)",
              transition:"width 0.6s ease", minWidth:4,
            }} />
            <div style={{
              position:"absolute", top:"50%", transform:"translateY(-50%)",
              left:`${Math.min(cobertura, 100)}%`,
              marginLeft: diferencia >= 0 ? -28 : 2,
              background:"var(--surface)", borderRadius:20, padding:"0.1rem 0.45rem",
              border:`2px solid ${diferencia >= 0 ? "var(--green)" : "var(--amber)"}`,
              fontFamily:"var(--font-mono)", fontSize:"0.52rem", fontWeight:800,
              color: diferencia >= 0 ? "var(--green)" : "var(--amber)",
              whiteSpace:"nowrap", zIndex:2, boxShadow:"0 2px 8px rgba(0,0,0,0.4)",
            }}>
              {diferencia >= 0 ? "✓ aquí" : "← aquí"}
            </div>
            {diferencia < 0 && (
              <div style={{ position:"absolute", top:-4, bottom:-4, left:"100%",
                width:2, background:"rgba(251,191,36,0.6)", borderRadius:1 }}>
                <div style={{ position:"absolute", top:"50%", left:4,
                  transform:"translateY(-50%)", fontFamily:"var(--font-mono)",
                  fontSize:"0.5rem", color:"var(--amber)", fontWeight:700, whiteSpace:"nowrap" }}>
                  PE: {peG}
                </div>
              </div>
            )}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:"0.3rem" }}>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.55rem", color:"var(--text-dim)" }}>0</span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.55rem", color:"var(--amber)" }}>PE: {peG}</span>
            {pg.aforoTotal > 0 && (
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.55rem", color:"var(--text-dim)" }}>
                Aforo máx: {pg.aforoTotal}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Tabla: distribución del PE por distancia ── */}
      <div className="card">
        <div className="card-title mb-2" style={{ color:"var(--amber)" }}>
          ⚖️ Distribución del equilibrio por distancia
        </div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem", color:"var(--text-dim)",
          padding:"0.4rem 0.75rem", background:"var(--surface2)", borderRadius:8,
          marginBottom:"0.85rem", borderLeft:"2px solid var(--border)" }}>
          ℹ️ El PE global se distribuye entre distancias <strong>según el mix actual de inscripciones</strong>.
          Ninguna distancia supera su aforo máximo si el mix es realista.
          La columna "PE distancia" muestra cuántos corredores de cada modalidad
          son necesarios para alcanzar el equilibrio conjunto.
        </div>

        <div className="overflow-x">
          <table className="eq-table">
            <thead>
              <tr>
                <th>Distancia</th>
                <th>
                  <Tooltip position="top" text={"Precio medio − coste variable por corredor.\nSi es negativo, cada corredor adicional aumenta las pérdidas."}>
                    <span>Margen (€/cte)</span><TooltipIcon />
                  </Tooltip>
                </th>
                <th>Inscritos</th>
                <th>Mix actual</th>
                <th>
                  <Tooltip position="top" text={"Corredores necesarios en esta distancia para alcanzar el equilibrio GLOBAL,\ndistribuidos proporcionalmente al mix actual. Este número siempre respeta el aforo máximo."}>
                    <span>PE distancia</span><TooltipIcon />
                  </Tooltip>
                </th>
                <th>Aforo máx.</th>
                <th>
                  <Tooltip position="top" text={"Inscritos actuales menos PE de esta distancia.\nPositivo = ya superamos el equilibrio en esta distancia."}>
                    <span>Diferencia</span><TooltipIcon />
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {DISTANCIAS.map(d => {
                const margen    = (precioMedioDistancia[d] || 0) - (costesVarPorCorredor[d] || 0);
                const peDist    = pg.porDistancia?.[d] ?? null;
                const propPct   = pg.proporciones?.[d] != null
                  ? (pg.proporciones[d] * 100).toFixed(0) + "%"
                  : "—";
                const maximo    = maximos?.[d] || 0;
                const superaMax = maximo > 0 && peDist > maximo;
                const diff      = peDist !== null ? (totalInscritos[d] || 0) - peDist : null;

                return (
                  <tr key={d}>
                    <td style={{ fontWeight:700, color:DISTANCIA_COLORS[d] }}>{DISTANCIA_LABELS[d]}</td>
                    <td style={{ fontFamily:"var(--font-mono)", fontSize:"0.82rem",
                      color: margen > 0 ? "var(--green)" : "var(--red)", fontWeight:700 }}>
                      {margen.toFixed(2)} €
                    </td>
                    <td style={{ fontFamily:"var(--font-mono)" }}>{totalInscritos[d] || 0}</td>
                    <td style={{ fontFamily:"var(--font-mono)", fontSize:"0.75rem",
                      color:"var(--text-muted)" }}>{propPct}</td>
                    <td style={{ fontFamily:"var(--font-mono)", fontWeight:700 }}>
                      {peDist === null ? "—" : (
                        <span style={{ color: superaMax ? "var(--red)" : "var(--amber)" }}>
                          {peDist}
                          {superaMax && (
                            <span style={{ fontSize:"0.6rem", color:"var(--red)",
                              marginLeft:"0.25rem" }}>⚠ &gt;{maximo}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily:"var(--font-mono)", color:"var(--text-muted)" }}>
                      {maximo > 0 ? maximo : "—"}
                    </td>
                    <td style={{ fontFamily:"var(--font-mono)", fontWeight:700 }}>
                      {diff === null ? "—" : (
                        <span style={{ color: diff >= 0 ? "var(--green)" : "var(--red)" }}>
                          {diff >= 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ borderTop:"2px solid var(--border)", background:"var(--surface2)", fontWeight:700 }}>
                <td>TOTAL</td>
                <td style={{ fontFamily:"var(--font-mono)",
                  color:(pg.margenMedio??0) > 0 ? "var(--green)" : "var(--red)", fontWeight:800 }}>
                  {(pg.margenMedio ?? 0).toFixed(2)} €
                </td>
                <td style={{ fontFamily:"var(--font-mono)" }}>{totalN}</td>
                <td style={{ fontFamily:"var(--font-mono)", color:"var(--text-muted)" }}>100%</td>
                <td style={{ fontFamily:"var(--font-mono)",
                  color: viable ? "var(--amber)" : "var(--red)", fontWeight:800 }}>
                  {peG ?? "∞"}
                </td>
                <td style={{ fontFamily:"var(--font-mono)", color:"var(--text-muted)" }}>
                  {pg.aforoTotal > 0 ? pg.aforoTotal : "—"}
                </td>
                <td style={{ fontFamily:"var(--font-mono)", fontWeight:700,
                  color: diferencia >= 0 ? "var(--green)" : "var(--red)" }}>
                  {peG ? (diferencia >= 0 ? `+${diferencia}` : diferencia) : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
