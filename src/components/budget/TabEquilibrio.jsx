import React from "react";
import { Tooltip, TooltipIcon } from "../common/Tooltip";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";

export const TabEquilibrio = ({
  totalInscritos,
  precioMedioDistancia,
  costesVarPorCorredor,
  costesFijos,
  totalIngresosConMerch,
  resultado,
  ingresosPorDistancia,
  peGlobal: pg,
  maximos,
  // MEJ-03: precio medio solo de inscritos de pago
  precioMedioPago,
  inscritosConPago,
  // MEJ-05: margenConfig para mostrar PE con colchón
  margenConfig,
}) => {
  const p        = pg || {};
  const totalN   = totalInscritos?.total ?? 0;
  const peG      = p.peGlobal ?? null;
  const viable   = p.viable !== false;
  const dif      = p.diferencia ?? (totalN - (peG || 0));
  const cobert   = p.coberturaPct ?? 0;

  // MEJ-05: PE con margen (solo si margenConfig activo y valor > 0)
  const margenActivo  = margenConfig?.alertaActiva && (margenConfig?.valor || 0) > 0;
  const peConMargen   = p.peGlobalConMargen ?? null;
  const peConMargenAlcanzado = p.peConMargenAlcanzado ?? true;
  const difConMargen  = totalN - (peConMargen || 0);
  // % de posición en la barra donde cae el PE con margen
  const cobertConMargen = peConMargen > 0 ? Math.min((totalN / peConMargen) * 100, 100) : 100;

  // MEJ-03: estado del precio medio de pago
  const hayPromo = inscritosConPago && (inscritosConPago.promo?.total || 0) > 0;
  // Para el cálculo de cobertura de fijos usar precio medio de pago si hay promo
  const pmUsado = hayPromo && precioMedioPago ? precioMedioPago : precioMedioDistancia;

  // Cobertura de fijos para el KPI
  const coberturaFijos = (costesFijos?.total > 0)
    ? Math.min(
        (DISTANCIAS.reduce((s, d) =>
          s + (pmUsado[d] - costesVarPorCorredor[d]) * (totalInscritos[d] || 0), 0)
          + totalIngresosConMerch) / costesFijos.total * 100,
        200)
    : 100;

  return (
    <>
      {/* ── KPIs ── */}
      <div className="kpi-grid">
        <div className="kpi amber">
          <div className="kpi-label">
            <Tooltip text={"Costes fijos totales menos patrocinios y merch.\nEsto es lo que deben cubrir las inscripciones."}>
              <span>Costes a cubrir</span><TooltipIcon />
            </Tooltip>
          </div>
          <div className="kpi-value">{(p.fijosNetos ?? 0).toFixed(0)} €</div>
          <div className="kpi-sub">
            {(p.fijosNetos ?? 0) === 0
              ? "✓ Cubiertos por patrocinios"
              : `de ${costesFijos?.total?.toFixed(0) ?? 0} € totales`}
          </div>
        </div>

        <div className="kpi cyan">
          <div className="kpi-label">
            <Tooltip text={"Margen medio por corredor ponderado con el mix de inscritos en el punto de equilibrio.\nCada inscripción adicional aporta esta cantidad para cubrir los costes fijos."}>
              <span>Margen medio</span><TooltipIcon />
            </Tooltip>
          </div>
          <div className="kpi-value">{(p.margenMedio ?? 0).toFixed(2)} €/cte</div>
          <div className="kpi-sub">precio medio − coste variable</div>
        </div>

        <div className={`kpi ${peG === null ? "red" : dif >= 0 ? "green" : viable ? "violet" : "red"}`}>
          <div className="kpi-label">
            <Tooltip text={"Total de corredores necesarios para que ingresos = costes.\nSe calcula dinámicamente con los inscritos reales actuales y respetando el aforo máximo de cada distancia."}>
              <span>PE Global</span><TooltipIcon />
            </Tooltip>
          </div>
          <div className="kpi-value">
            {peG === null ? "Inviable" : dif >= 0 ? `✓ ${peG}` : peG}
          </div>
          <div className="kpi-sub">
            {peG === null ? "sin margen positivo"
              : dif >= 0 ? "ya superado"
              : (
                <button
                  onClick={() => window.dispatchEvent(
                    new CustomEvent("teg-navigate", { detail: { block:"presupuesto", subtab:"inscripciones" } })
                  )}
                  style={{ background:"none", border:"none", cursor:"pointer",
                    fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                    color:"var(--amber)", fontWeight:700, padding:0,
                    textDecoration:"underline" }}>
                  faltan {Math.abs(dif)} corredores →
                </button>
              )
            }
          </div>
        </div>

        {/* MEJ-05: KPI de PE con colchón de reserva — solo si margen activo */}
        {margenActivo && peConMargen !== null && (
          <div className={`kpi ${(peConMargenAlcanzado || difConMargen >= 0) ? "green" : "amber"}`}>
            <div className="kpi-label">
              <Tooltip text={`PE más el colchón de reserva (${margenConfig.tipo === "porcentaje" ? `${margenConfig.valor}% de costes fijos` : `${margenConfig.valor} € absolutos`}).\nSuperarlo significa que el evento genera fondo para imprevistos.`}>
                <span>PE + colchón</span><TooltipIcon />
              </Tooltip>
            </div>
            <div className="kpi-value">
              {(peConMargenAlcanzado || difConMargen >= 0) ? `✓ ${peConMargen}` : peConMargen}
            </div>
            <div className="kpi-sub">
              {(peConMargenAlcanzado || difConMargen >= 0)
                ? "colchón cubierto"
                : `faltan ${Math.abs(difConMargen)} más`}
            </div>
          </div>
        )}

        <div className={`kpi ${coberturaFijos >= 100 ? "green" : coberturaFijos >= 75 ? "amber" : "red"}`}>
          <div className="kpi-label">
            <Tooltip text={"Margen de contribución actual + ingresos extra, sobre costes fijos totales.\n100% = equilibrio exacto."}>
              <span>Cobertura fijos</span><TooltipIcon />
            </Tooltip>
          </div>
          <div className="kpi-value">{coberturaFijos.toFixed(0)}%</div>
          <div className="kpi-sub">{totalN} inscritos actuales</div>
        </div>
      </div>

      {/* ── Alerta: evento no viable ── */}
      {!viable && peG !== null && (
        <div style={{ background:"var(--red-dim)",
          border:"1px solid rgba(248,113,113,0.3)", borderRadius:10,
          padding:"0.85rem 1rem", marginBottom:"1rem" }}>
          <div style={{ display:"flex", gap:"0.6rem", alignItems:"flex-start" }}>
            <span style={{ fontSize:"var(--fs-lg)", flexShrink:0 }}>⚠️</span>
            <div>
              <div style={{ fontWeight:700, fontSize:"var(--fs-base)",
                color:"var(--red)", marginBottom:"0.35rem" }}>
                Equilibrio no alcanzable aunque se vendieran todas las plazas
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                color:"var(--text-muted)", lineHeight:1.6 }}>
                Incluso llenando los {p.aforoTotal} dorsales disponibles quedaría
                un déficit de margen de{" "}
                <strong style={{ color:"var(--red)" }}>
                  {(p.margenFaltante || 0).toFixed(0)} €
                </strong>{" "}
                sin cubrir.
              </div>
              <div style={{ marginTop:"0.5rem", fontFamily:"var(--font-mono)",
                fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
                Soluciones: subir precios de inscripción, reducir costes fijos,
                ampliar el aforo máximo, o conseguir más patrocinios.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra de progreso ── */}
      {peG !== null && peG > 0 && (
        <div style={{ marginBottom:"1rem", padding:"0.85rem 1rem",
          background:"var(--surface2)", borderRadius:10, border:"1px solid var(--border)" }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:"0.55rem", flexWrap:"wrap", gap:"0.4rem" }}>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em" }}>
              Progreso hacia el equilibrio
            </span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", fontWeight:700,
              color: dif >= 0 ? "var(--green)" : dif >= -(peG*0.25) ? "var(--amber)" : "var(--red)" }}>
              {dif >= 0 && margenActivo && !peConMargenAlcanzado && difConMargen < 0
                ? `✓ Cubre costes · ⚠ Faltan ${Math.abs(difConMargen)} para el colchón`
                : dif >= 0
                  ? `✓ Superávit — ${dif} corredores por encima del PE`
                  : `Faltan ${Math.abs(dif)} inscripciones para el equilibrio`}
            </span>
          </div>
          <div style={{ position:"relative", height:24,
            background:"var(--surface3)", borderRadius:12 }}>
            <div style={{
              position:"absolute", left:0, top:0, height:"100%", borderRadius:12,
              width:`${Math.min(cobert, 100)}%`,
              background: dif >= 0
                ? "linear-gradient(90deg,var(--green),#10b981)"
                : dif >= -(peG*0.25)
                ? "linear-gradient(90deg,var(--amber),#f59e0b)"
                : "linear-gradient(90deg,var(--red),#ef4444)",
              transition:"width 0.6s ease", minWidth:4,
            }} />
            <div style={{
              position:"absolute", top:"50%", transform:"translateY(-50%)",
              left:`${Math.min(cobert, 100)}%`,
              marginLeft: dif >= 0 ? -28 : 2,
              background:"var(--surface)", borderRadius:20, padding:"0.1rem 0.45rem",
              border:`2px solid ${dif >= 0 ? "var(--green)" : "var(--amber)"}`,
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", fontWeight:800,
              color: dif >= 0 ? "var(--green)" : "var(--amber)",
              whiteSpace:"nowrap", zIndex:2, boxShadow:"0 2px 8px rgba(0,0,0,0.4)",
            }}>
              {dif >= 0 ? "✓ aquí" : "← aquí"}
            </div>
            {dif < 0 && (
              <div style={{ position:"absolute", top:-4, bottom:-4,
                left:"100%", width:2, background:"rgba(251,191,36,0.6)", borderRadius:1 }}>
                <div style={{ position:"absolute", top:"50%", left:4,
                  transform:"translateY(-50%)", fontFamily:"var(--font-mono)",
                  fontSize:"var(--fs-2xs)", color:"var(--amber)", fontWeight:700, whiteSpace:"nowrap" }}>
                  PE: {peG}
                </div>
              </div>
            )}
            {/* MEJ-05: línea punteada del PE+colchón — solo si margen activo y es mayor que el PE */}
            {margenActivo && peConMargen !== null && peConMargen > (peG || 0) && (() => {
              const pctMargen = p.aforoTotal > 0 ? Math.min((peConMargen / p.aforoTotal) * 100, 100) : 0;
              return (
                <div title={`PE con colchón: ${peConMargen} inscritos`} style={{
                  position:"absolute", top:-6, bottom:-6,
                  left:`${pctMargen}%`, width:2,
                  background:"rgba(167,139,250,0.7)",
                  borderRadius:1,
                  backgroundImage:"repeating-linear-gradient(to bottom, rgba(167,139,250,0.9) 0px, rgba(167,139,250,0.9) 4px, transparent 4px, transparent 8px)",
                }}>
                  <div style={{ position:"absolute", bottom:-16, left:4,
                    fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)",
                    color:"var(--violet)", fontWeight:700, whiteSpace:"nowrap" }}>
                    +colchón: {peConMargen}
                  </div>
                </div>
              );
            })()}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:"0.3rem" }}>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
              {totalN} actuales
            </span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--amber)" }}>
              PE: {peG}
            </span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
              Aforo máx: {p.aforoTotal || "—"}
            </span>
          </div>
        </div>
      )}

      {/* ── Franja de seguridad visual ── */}
      {peG !== null && peG > 0 && p.aforoTotal > 0 && (
        <div style={{ marginBottom:"1rem", padding:"0.85rem 1rem",
          background:"var(--surface2)", borderRadius:10, border:"1px solid var(--border)" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
            color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em",
            marginBottom:"0.75rem" }}>
            📐 Franja de seguridad · {dif >= 0 ? `+${dif} corredores sobre el PE` : `Faltan ${Math.abs(dif)} para el PE`}
          </div>
          {/* Barra dividida en zonas */}
          <div style={{ position:"relative", height:32, borderRadius:8, overflow:"hidden",
            background:"var(--surface3)" }}>
            {/* Zona PE alcanzado (inscritos actuales) */}
            {(() => {
              const pctActual = Math.min((totalN / p.aforoTotal) * 100, 100);
              const pctPE     = Math.min((peG   / p.aforoTotal) * 100, 100);
              return (
                <>
                  {/* Zona roja: inscripciones actuales (si no se alcanzó el PE) */}
                  {dif < 0 && (
                    <div style={{ position:"absolute", left:0, top:0, height:"100%",
                      width:`${pctActual}%`,
                      background:"linear-gradient(90deg,rgba(248,113,113,0.5),rgba(248,113,113,0.35))",
                      borderRight:"2px dashed rgba(248,113,113,0.6)" }} />
                  )}
                  {/* Zona verde: inscripciones actuales (si ya se superó el PE) */}
                  {dif >= 0 && (
                    <div style={{ position:"absolute", left:0, top:0, height:"100%",
                      width:`${pctActual}%`,
                      background:"linear-gradient(90deg,rgba(52,211,153,0.45),rgba(52,211,153,0.3))" }} />
                  )}
                  {/* Zona ámbar: desde inscritos actuales hasta el PE (si no se alcanzó) */}
                  {dif < 0 && (
                    <div style={{ position:"absolute", left:`${pctActual}%`, top:0, height:"100%",
                      width:`${pctPE - pctActual}%`,
                      background:"rgba(251,191,36,0.18)",
                      borderRight:"2px solid rgba(251,191,36,0.6)" }} />
                  )}
                  {/* Zona verde claro: margen de seguridad (PE → aforo máx) */}
                  {dif >= 0 && pctPE < 100 && (
                    <div style={{ position:"absolute", left:`${pctPE}%`, top:0, height:"100%",
                      width:`${100 - pctPE}%`,
                      background:"rgba(52,211,153,0.12)",
                      borderLeft:"2px dashed rgba(52,211,153,0.4)" }}>
                      {/* Label de margen */}
                      {(100 - pctPE) > 12 && (
                        <div style={{ position:"absolute", top:"50%", left:"50%",
                          transform:"translate(-50%,-50%)",
                          fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)",
                          color:"var(--green)", fontWeight:700, whiteSpace:"nowrap" }}>
                          +{p.aforoTotal - peG} margen
                        </div>
                      )}
                    </div>
                  )}
                  {/* Marcador PE */}
                  {pctPE > 0 && pctPE < 100 && (
                    <div style={{ position:"absolute", top:0, left:`${pctPE}%`,
                      width:2, height:"100%",
                      background:"rgba(251,191,36,0.8)",
                      transform:"translateX(-50%)" }}>
                      <div style={{ position:"absolute", top:-18, left:"50%",
                        transform:"translateX(-50%)",
                        fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)",
                        color:"var(--amber)", fontWeight:800, whiteSpace:"nowrap" }}>
                        PE: {peG}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          {/* Leyenda */}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:"0.5rem",
            flexWrap:"wrap", gap:"0.4rem" }}>
            <div style={{ display:"flex", gap:"0.85rem", flexWrap:"wrap" }}>
              <span style={{ display:"flex", alignItems:"center", gap:"0.3rem",
                fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
                <span style={{ width:10, height:10, borderRadius:2,
                  background: dif >= 0 ? "rgba(52,211,153,0.5)" : "rgba(248,113,113,0.5)",
                  display:"inline-block" }} />
                Actuales ({totalN})
              </span>
              {dif >= 0 && p.aforoTotal > peG && (
                <span style={{ display:"flex", alignItems:"center", gap:"0.3rem",
                  fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
                  <span style={{ width:10, height:10, borderRadius:2,
                    background:"rgba(52,211,153,0.15)", border:"1px dashed rgba(52,211,153,0.4)",
                    display:"inline-block" }} />
                  Margen seg. (+{p.aforoTotal - peG})
                </span>
              )}
            </div>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              color:"var(--text-dim)" }}>
              Aforo máx: {p.aforoTotal}
            </span>
          </div>
        </div>
      )}

      {/* ── Tabla por distancia ── */}
      <div className="card">
        <div className="card-title mb-2" style={{ color:"var(--amber)" }}>
          ⚖️ Equilibrio por distancia
        </div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
          color:"var(--text-dim)", padding:"0.4rem 0.75rem",
          background:"var(--surface2)", borderRadius:8,
          marginBottom:"0.85rem", borderLeft:"2px solid var(--border)" }}>
          ℹ️ El PE global es{" "}
          <strong style={{ color:"var(--amber)" }}>{peG ?? "∞"} corredores en total</strong>.
          La tabla muestra cuántos inscritos adicionales necesita cada distancia
          para alcanzarlo, priorizando las de mayor margen y sin superar el aforo máximo.
        </div>

        <div className="overflow-x">
          <table className="eq-table">
            <thead>
              <tr>
                <th>Distancia</th>
                <th>
                  <Tooltip position="top" text="Precio medio − coste variable por corredor. Cuánto aporta cada inscripción adicional.">
                    <span>Margen (€/cte)</span><TooltipIcon />
                  </Tooltip>
                </th>
                <th>Inscritos</th>
                <th>Aforo máx.</th>
                <th>Plazas libres</th>
                <th>
                  <Tooltip position="top" text="Inscritos adicionales necesarios en esta distancia para alcanzar el PE global, respetando el aforo máximo.">
                    <span>Faltan</span><TooltipIcon />
                  </Tooltip>
                </th>
                <th>
                  <Tooltip position="top" text="Inscritos actuales + los necesarios para el PE. Nunca supera el aforo máximo.">
                    <span>Total en PE</span><TooltipIcon />
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {DISTANCIAS.map(d => {
                const margen      = (precioMedioDistancia[d] || 0) - (costesVarPorCorredor[d] || 0);
                const inscritos   = totalInscritos[d] || 0;
                const maximo      = maximos?.[d] || 0;
                const libres      = Math.max(maximo - inscritos, 0);
                const necesarios  = p.inscritosNecesarios?.[d] ?? 0;
                const totalEnPE   = p.porDistancia?.[d] ?? inscritos;
                const yaOk        = necesarios === 0 && dif >= 0;

                return (
                  <tr key={d}>
                    <td style={{ fontWeight:700, color:DISTANCIA_COLORS[d] }}>
                      {DISTANCIA_LABELS[d]}
                    </td>
                    <td style={{ fontFamily:"var(--font-mono)",
                      color: margen > 0 ? "var(--green)" : "var(--red)", fontWeight:700 }}>
                      {margen.toFixed(2)} €
                    </td>
                    <td style={{ fontFamily:"var(--font-mono)" }}>{inscritos}</td>
                    <td style={{ fontFamily:"var(--font-mono)", color:"var(--text-muted)" }}>
                      {maximo > 0 ? maximo : "—"}
                    </td>
                    <td style={{ fontFamily:"var(--font-mono)",
                      color: libres === 0 ? "var(--red)" : "var(--text-muted)" }}>
                      {maximo > 0 ? libres : "—"}
                      {libres === 0 && maximo > 0 && (
                        <span style={{ fontSize:"var(--fs-xs)", marginLeft:"0.25rem" }}>🔴</span>
                      )}
                    </td>
                    <td style={{ fontFamily:"var(--font-mono)", fontWeight:700 }}>
                      {yaOk ? (
                        <span style={{ color:"var(--green)" }}>✓ 0</span>
                      ) : necesarios > 0 ? (
                        <span style={{ color: necesarios > libres ? "var(--red)" : "var(--amber)" }}>
                          +{necesarios}
                          {necesarios > libres && (
                            <span style={{ fontSize:"var(--fs-xs)", color:"var(--red)",
                              marginLeft:"0.25rem" }}>⚠ sin plazas</span>
                          )}
                        </span>
                      ) : (
                        <span style={{ color:"var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ fontFamily:"var(--font-mono)", fontWeight:700,
                      color: dif >= 0 ? "var(--green)" : "var(--text)" }}>
                      {totalEnPE}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ borderTop:"2px solid var(--border)",
                background:"var(--surface2)", fontWeight:700 }}>
                <td>TOTAL</td>
                <td style={{ fontFamily:"var(--font-mono)",
                  color:(p.margenMedio??0) > 0 ? "var(--green)" : "var(--red)", fontWeight:800 }}>
                  {(p.margenMedio ?? 0).toFixed(2)} €
                </td>
                <td style={{ fontFamily:"var(--font-mono)" }}>{totalN}</td>
                <td style={{ fontFamily:"var(--font-mono)", color:"var(--text-muted)" }}>
                  {p.aforoTotal > 0 ? p.aforoTotal : "—"}
                </td>
                <td style={{ fontFamily:"var(--font-mono)", color:"var(--text-muted)" }}>
                  {p.plazasTotal ?? "—"}
                </td>
                <td style={{ fontFamily:"var(--font-mono)", fontWeight:800,
                  color: dif >= 0 ? "var(--green)" : viable ? "var(--amber)" : "var(--red)" }}>
                  {dif >= 0 ? "✓ 0" : `+${Math.abs(dif)}`}
                </td>
                <td style={{ fontFamily:"var(--font-mono)", fontWeight:800,
                  color: dif >= 0 ? "var(--green)" : "var(--violet)" }}>
                  {peG ?? "∞"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
