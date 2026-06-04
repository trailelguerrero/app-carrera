import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";
import { getTramoStatus } from "./TimelineTramos";

const fmt = (n) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";

const tramoStats = (t, inscritos) => {
  const total    = DISTANCIAS.reduce((s, d) => s + (inscritos?.tramos?.[t.id]?.[d] || 0), 0);
  const ingresos = DISTANCIAS.reduce((s, d) => s + (inscritos?.tramos?.[t.id]?.[d] || 0) * (t.precios[d] || 0), 0);
  return { total, ingresos };
};

export const TablaTramos = ({
  tramos, setTramos, updateTramoPrecio,
  inscritos, updateInscritos,
  totalInscritos, ingresosPorDistancia, maximos,
  codigos, addTramo, onRequestDelete, onOpenCsv,
}) => (
  <div className="card">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "var(--fs-md)", color: "var(--amber)", display: "flex", alignItems: "center", gap: 8 }}>
        <span>💰</span> Gestión de Precios y Volúmenes por Tramo
      </div>
      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={onOpenCsv} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--fs-sm)" }}>📥 Importar CSV</button>
        <button className="btn btn-amber" onClick={addTramo} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "var(--fs-md)", fontWeight: 400 }}>+</span> Añadir Tramo
        </button>
      </div>
    </div>

    <div className="overflow-x" style={{ paddingBottom: "1.5rem" }}>
      <table className="tbl" style={{ minWidth: 700 }}>
        <thead>
          <tr>
            <th style={{ minWidth: 160, paddingLeft: 8 }}>Información del Tramo</th>
            {DISTANCIAS.map(d => (
              <th key={d} className="text-right" style={{ width: 140, paddingRight: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: DISTANCIA_COLORS[d], display: "inline-block" }} />
                  <span style={{ color: DISTANCIA_COLORS[d], fontSize: "var(--fs-base)", fontWeight: 700 }}>{DISTANCIA_LABELS[d]}</span>
                </div>
              </th>
            ))}
            <th className="text-right" style={{ width: 100, paddingRight: 8 }}>Ingresos Brutos</th>
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {tramos.map((t, idx) => {
            const status = getTramoStatus(t.fechaFin, t.fechaInicio);
            const stats  = tramoStats(t, inscritos);
            const prev   = idx > 0 ? tramos[idx - 1] : null;
            return (
              <tr key={t.id} style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px dashed var(--border)" }}>
                <td style={{ verticalAlign: "top", paddingTop: "0.9rem", paddingLeft: 8 }}>
                  <input
                    className="input-inline"
                    value={t.nombre}
                    onChange={e => setTramos(prev => prev.map(x => x.id === t.id ? { ...x, nombre: e.target.value } : x))}
                    placeholder="Nombre tramo"
                    style={{ fontSize: "var(--fs-md)", marginBottom: 2 }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "0.4rem" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: status.bg, color: status.color, border: `1px solid ${status.color}44`, borderRadius: 20, padding: "0.15rem 0.5rem", fontSize: "var(--fs-xs)", fontWeight: 700, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                      {status.glyph} {status.label}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Inicio:</span>
                      <input type="date" className="date-inline" value={t.fechaInicio || ""} onChange={e => setTramos(prev => prev.map(x => x.id === t.id ? { ...x, fechaInicio: e.target.value || undefined } : x))} title="Fecha de apertura del tramo (opcional)" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Cierre:</span>
                      <input type="date" className="date-inline" value={t.fechaFin} onChange={e => setTramos(prev => prev.map(x => x.id === t.id ? { ...x, fechaFin: e.target.value } : x))} title="Fecha de cierre del tramo" />
                    </div>
                    {t.fechaInicio && t.fechaInicio > t.fechaFin && (
                      <span style={{ fontSize: "var(--fs-xs)", color: "#f87171" }} title="La fecha de inicio es posterior al cierre">⚠️</span>
                    )}
                  </div>
                </td>

                {DISTANCIAS.map(d => {
                  const delta = prev && t.precios[d] !== undefined ? t.precios[d] - prev.precios[d] : null;
                  return (
                    <td key={d} className="text-right" style={{ verticalAlign: "middle", padding: "0.9rem 0.5rem" }}>
                      <div className="cell-group">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>Precio:</span>
                          <NumInput value={t.precios[d]} onChange={v => updateTramoPrecio(t.id, d, v)} small step={1} />
                        </div>
                        {delta !== null && delta !== 0 && (
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: delta > 0 ? "var(--amber)" : "var(--red)", marginTop: "-4px" }}>
                            {delta > 0 ? `(+${Math.round(delta)}€)` : `(${Math.round(delta)}€)`}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem" }}>
                          <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>Volumen:</span>
                          <NumInput value={inscritos.tramos[t.id]?.[d] || 0} onChange={v => updateInscritos(t.id, d, Math.round(v))} step={1} small style={{ background: "rgba(0,0,0,0.2)" }} />
                        </div>
                      </div>
                    </td>
                  );
                })}

                <td className="text-right" style={{ verticalAlign: "middle", paddingRight: 8 }}>
                  <div className="mono" style={{ color: "var(--violet)", fontWeight: 700, fontSize: "var(--fs-md)" }}>{fmt(stats.ingresos)}</div>
                  <div className="mono" style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", marginTop: 4 }}>{stats.total} ctes</div>
                </td>

                <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                  <button onClick={() => onRequestDelete(t, tramoStats(t, inscritos))} title="Eliminar tramo"
                    style={{ background: "transparent", color: "var(--red-dim)", border: "none", cursor: "pointer", fontSize: "var(--fs-md)", padding: "0.3rem", transition: "color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--red-dim)"}>
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}

          <tr className="total-row">
            <td style={{ fontSize: "var(--fs-md)", color: "var(--text)", paddingLeft: 8 }}>TOTALES ACUMULADOS</td>
            {DISTANCIAS.map(d => {
              const supera = maximos[d] > 0 && totalInscritos[d] > maximos[d];
              const justo  = maximos[d] > 0 && totalInscritos[d] === maximos[d];
              return (
                <td key={d} className="text-right" style={{ padding: "0.9rem 0.5rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.15rem" }}>
                    <span className="mono" style={{ color: supera ? "var(--red)" : DISTANCIA_COLORS[d], fontWeight: supera ? 800 : 700, fontSize: "var(--fs-md)" }}>
                      {totalInscritos[d]}
                      {supera && <span style={{ fontSize: "var(--fs-sm)", marginLeft: "0.3rem" }}>⚠️</span>}
                      {justo  && <span style={{ fontSize: "var(--fs-sm)", marginLeft: "0.3rem" }}>✅</span>}
                    </span>
                    {supera && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", fontWeight: 700 }}>+{totalInscritos[d] - maximos[d]} max</span>}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--violet)", marginTop: 2 }}>{fmt((ingresosPorDistancia[d] || 0))}</span>
                  </div>
                </td>
              );
            })}
            <td className="text-right mono" style={{ paddingRight: 8 }}>
              <div style={{ color: "var(--violet)", fontWeight: 800, fontSize: "var(--fs-lg)" }}>{fmt(ingresosPorDistancia.total)}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-base)", marginTop: 2 }}>
                {totalInscritos.total} ctes totales
                {codigos.filter(c => c.estado === "usado").length > 0 && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", marginLeft: "0.4rem", padding: "0.05rem 0.3rem", borderRadius: 3, background: "rgba(167,139,250,.15)", color: "var(--violet)", border: "1px solid rgba(167,139,250,.25)", fontWeight: 700 }}>
                    🎟️ {codigos.filter(c => c.estado === "usado").length} promo
                  </span>
                )}
              </div>
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);
