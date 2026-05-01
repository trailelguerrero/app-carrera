import React from "react";
import { Tooltip, TooltipIcon } from "../common/Tooltip";
import { NumInput } from "./common/NumInput";
import { Toggle } from "./common/Toggle";

export const TabIngresos = ({ 
  ingresosExtra, 
  setIngresosExtra, 
  totalIngresosExtra, 
  merchandising, 
  setMerchandising, 
  merchTotales, 
  totalIngresosConMerch, 
  ingresosPorDistancia,
  totalPatConfirmado = 0,
  totalPatCobrado = 0,
  totalMerchBeneficio = 0,
  syncConfig = { patrocinios: true, patrociniosCobrado: true, camisetas: true },
  setSyncConfig,
}) => {
  const addIngresosExtra = () => {
    const id = ingresosExtra.length > 0 ? Math.max(...ingresosExtra.map(x => x.id)) + 1 : 1;
    setIngresosExtra(prev => [...prev, { id: id, nombre: "Nuevo ingreso", valor: 0, activo: true }]);
  };
  const removeIngresosExtra = (id) => setIngresosExtra(prev => prev.filter(x => x.id !== id));

  const addMerch = () => {
    const id = merchandising.length > 0 ? Math.max(...merchandising.map(m => m.id)) + 1 : 1;
    setMerchandising(prev => [...prev, { id: id, nombre: "Nuevo producto", unidades: 0, costeUnitario: 0, precioVenta: 0, activo: true }]);
  };
  const removeMerch = (id) => setMerchandising(prev => prev.filter(m => m.id !== id));
  const updateMerch = (id, field, value) => setMerchandising(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));

  const totalIngresosTodos = ingresosPorDistancia.total + totalIngresosConMerch;
  const pctPatrocinios = totalIngresosTodos > 0 ? (totalIngresosExtra / totalIngresosTodos * 100) : 0;
  const pctMerch = totalIngresosTodos > 0 ? (merchTotales.beneficio / totalIngresosTodos * 100) : 0;
  const pctInscripciones = totalIngresosTodos > 0 ? (ingresosPorDistancia.total / totalIngresosTodos * 100) : 0;

  return (
    <>
      <div className="card">
        <div className="card-title" style={{ color: "var(--violet)" }}>💜 Resumen Global de Ingresos</div>
        <div className="kpi-grid" style={{ marginBottom: 0 }}>
          <div className="kpi violet">
            <div className="kpi-label">Inscripciones</div>
            <div className="kpi-value">{ingresosPorDistancia.total.toFixed(0)} €</div>
            <div className="kpi-sub">{pctInscripciones.toFixed(1)}% del total</div>
          </div>
          <div className="kpi green">
            <div className="kpi-label">Patrocinios y extras</div>
            <div className="kpi-value">{totalIngresosExtra.toFixed(0)} €</div>
            <div className="kpi-sub">{pctPatrocinios.toFixed(1)}% del total</div>
          </div>
          <div className="kpi orange">
            <div className="kpi-label">Merchandising (neto)</div>
            <div className="kpi-value">{merchTotales.beneficio.toFixed(0)} €</div>
            <div className="kpi-sub">{pctMerch.toFixed(1)}% del total</div>
          </div>
          <div className="kpi cyan">
            <div className="kpi-label">Total ingresos</div>
            <div className="kpi-value">{totalIngresosTodos.toFixed(0)} €</div>
            <div className="kpi-sub">Todas las fuentes combinadas</div>
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", background: "var(--surface3)" }}>
            {pctInscripciones > 0 && <div style={{ width: `${pctInscripciones}%`, background: "var(--violet)", transition: "width 0.4s" }} />}
            {pctPatrocinios > 0 && <div style={{ width: `${pctPatrocinios}%`, background: "var(--green)", transition: "width 0.4s" }} />}
            {pctMerch > 0 && <div style={{ width: `${pctMerch}%`, background: "var(--orange)", transition: "width 0.4s" }} />}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem", fontSize: "var(--fs-xs)", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            <span>🟣 Inscripciones {pctInscripciones.toFixed(0)}%</span>
            <span>🟢 Patrocinios {pctPatrocinios.toFixed(0)}%</span>
            <span>🟠 Merch {pctMerch.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* ── PANEL DE SINCRONIZACIÓN ── */}
      <div className="card" style={{ border: "1px dashed var(--border)", background: "rgba(34,211,238,0.02)" }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "var(--fs-base)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            🔗 Sincronización automática con otros bloques
          </div>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            Activa qué fuentes se incluyen automáticamente en el balance
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {/* Patrocinios captados */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.55rem 0.75rem", borderRadius: 8, background: "var(--surface2)",
            border: `1px solid ${syncConfig.patrocinios ? "var(--green-border)" : "var(--border)"}` }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                🤝 Patrocinios captados
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--green)",
                  background: "var(--green-dim)", padding: "0.1rem 0.35rem", borderRadius: 3 }}>
                  confirmado + cobrado
                </span>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                Total comprometido: acuerdos firmados aunque no ingresados aún
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 800,
                color: syncConfig.patrocinios ? "var(--green)" : "var(--text-dim)" }}>
                {totalPatConfirmado.toLocaleString("es-ES", { minimumFractionDigits: 0 })} €
              </span>
              <Toggle value={syncConfig.patrocinios} onChange={v => setSyncConfig({ ...syncConfig, patrocinios: v })} />
            </div>
          </div>
          {/* Patrocinios cobrados */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.55rem 0.75rem", borderRadius: 8, background: "var(--surface2)",
            border: `1px solid ${syncConfig.patrociniosCobrado ? "var(--cyan-border)" : "var(--border)"}` }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                💰 Patrocinios cobrados
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--cyan)",
                  background: "var(--cyan-dim)", padding: "0.1rem 0.35rem", borderRadius: 3 }}>
                  solo cobrado
                </span>
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                Dinero real en cuenta — tesorería efectiva
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 800,
                color: syncConfig.patrociniosCobrado ? "var(--cyan)" : "var(--text-dim)" }}>
                {totalPatCobrado.toLocaleString("es-ES", { minimumFractionDigits: 0 })} €
              </span>
              <Toggle value={syncConfig.patrociniosCobrado} onChange={v => setSyncConfig({ ...syncConfig, patrociniosCobrado: v })} />
            </div>
          </div>
          {/* Camisetas */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.55rem 0.75rem", borderRadius: 8, background: "var(--surface2)",
            border: `1px solid ${syncConfig.camisetas ? "var(--orange-border)" : "var(--border)"}` }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)" }}>🛍️ Merchandising</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                Beneficio neto venta de productos
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <Toggle value={syncConfig.camisetas} onChange={v => setSyncConfig({ ...syncConfig, camisetas: v })} />
              <button onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "camisetas" } }))}
                style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", padding:".2rem .55rem",
                  borderRadius:5, border:"1px solid rgba(251,146,60,.3)", background:"rgba(251,146,60,.08)", color:"var(--orange)", cursor:"pointer" }}>
                👕 Ver →
              </button>
              <button onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "patrocinadores" } }))}
                style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", padding:".2rem .55rem",
                  borderRadius:5, border:"1px solid rgba(52,211,153,.3)", background:"rgba(52,211,153,.08)", color:"var(--green)", cursor:"pointer" }}>
                🤝 Ver patrocinadores →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between mb-2">
          <div className="card-title ingresos">🤝 Patrocinios, Subvenciones y Otros Ingresos</div>
          <button className="btn" style={{ background: "rgba(167,139,250,0.15)", color: "var(--violet)", border: "1px solid rgba(167,139,250,0.3)" }} onClick={addIngresosExtra}>+ Añadir</button>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 30 }}>Act.</th>
              <th>Concepto</th>
              <th className="text-right">Importe (€)</th>
              <th className="text-right">% s/total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ingresosExtra.map(ie => {
              const isSynced = ie.synced;
              const pct = totalIngresosExtra > 0 ? (ie.valor / totalIngresosExtra * 100) : 0;
              return (
                <tr key={ie.id} style={{ opacity: ie.activo ? 1 : 0.4 }}>
                  <td><Toggle value={ie.activo} onChange={v => setIngresosExtra(prev => prev.map(x => x.id === ie.id ? { ...x, activo: v } : x))} /></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {isSynced ? (
                        <div style={{ fontSize: "var(--fs-base)", fontWeight: 700, color: "var(--text)" }}>{ie.nombre}</div>
                      ) : (
                        <input
                          className="text-input"
                          value={ie.nombre}
                          onChange={e => setIngresosExtra(prev => prev.map(x => x.id === ie.id ? { ...x, nombre: e.target.value } : x))}
                        />
                      )}
                      {isSynced && <span style={{ fontSize: "var(--fs-xs)", color: "var(--cyan)", fontFamily: "var(--font-mono)", background: "var(--cyan-dim)", padding: "0.1rem 0.35rem", borderRadius: 3, whiteSpace: "nowrap" }}>🔗 auto</span>}
                    </div>
                  </td>
                  <td className="text-right">
                    {isSynced ? (
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"0.2rem" }}>
                        <span className="mono" style={{ color:"var(--violet)", fontWeight:700 }}>{ie.valor.toFixed(2)} €</span>
                        <Tooltip
                          text={`Valor sincronizado desde ${ie.id === 1 ? 'Patrocinadores' : 'Camisetas'}.\nPuedes desactivarlo en el panel de arriba.`}
                          position="top"
                        >
                          <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan)",
                            background:"var(--cyan-dim)", border:"1px solid rgba(34,211,238,0.25)",
                            padding:"0.05rem 0.35rem", borderRadius:3, cursor:"help" }}>
                            ⚡ activo
                          </span>
                        </Tooltip>
                      </div>
                    ) : (
                      <NumInput value={ie.valor} onChange={v => setIngresosExtra(prev => prev.map(x => x.id === ie.id ? { ...x, valor: v } : x))} step={10} />
                    )}
                  </td>
                  <td className="text-right mono text-xs" style={{ color: "var(--text-muted)" }}>{pct.toFixed(1)}%</td>
                  <td>{!isSynced && <button className="btn btn-red" onClick={() => removeIngresosExtra(ie.id)}>✕</button>}</td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td colSpan={2}>Subtotal Patrocinios y Otros</td>
              <td className="text-right mono" style={{ color: "var(--violet)" }}>{totalIngresosExtra.toFixed(2)} €</td>
              <td className="text-right mono">100%</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="flex-between mb-2">
          <div className="card-title" style={{ color: "var(--orange)" }}>🛍️ Merchandising — Venta de Productos</div>
          <button className="btn" style={{ background: "rgba(251,146,60,0.15)", color: "var(--orange)", border: "1px solid rgba(251,146,60,0.3)" }} onClick={addMerch}>+ Añadir producto</button>
        </div>
        <div className="overflow-x">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }}>Act.</th>
                <th>Producto</th>
                <th className="text-right">Uds.</th>
                <th className="text-right">Coste unit. (€)</th>
                <th className="text-right">P.V.P. (€)</th>
                <th className="text-right">Beneficio (€)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {merchandising.map(m => {
                const beneficio = m.unidades * (m.precioVenta - m.costeUnitario);
                return (
                  <tr key={m.id} style={{ opacity: m.activo ? 1 : 0.4 }}>
                    <td><Toggle value={m.activo} onChange={v => updateMerch(m.id, "activo", v)} /></td>
                    <td>
                      <input className="text-input" value={m.nombre} onChange={e => updateMerch(m.id, "nombre", e.target.value)} />
                    </td>
                    <td className="text-right">
                      <NumInput value={m.unidades} onChange={v => updateMerch(m.id, "unidades", Math.round(v))} step={1} small />
                    </td>
                    <td className="text-right">
                      <NumInput value={m.costeUnitario} onChange={v => updateMerch(m.id, "costeUnitario", v)} small />
                    </td>
                    <td className="text-right">
                      <NumInput value={m.precioVenta} onChange={v => updateMerch(m.id, "precioVenta", v)} small />
                    </td>
                    <td className="text-right mono" style={{ color: beneficio >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                      {m.activo ? (beneficio >= 0 ? "+" : "") + beneficio.toFixed(2) : "—"} €
                    </td>
                    <td><button className="btn btn-red" onClick={() => removeMerch(m.id)}>✕</button></td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td colSpan={2}>Totales Merchandising</td>
                <td className="text-right mono">{merchandising.filter(m=>m.activo).reduce((s,m)=>s+m.unidades,0)} uds</td>
                <td className="text-right mono text-muted">{merchTotales.costes.toFixed(2)} €</td>
                <td className="text-right mono" style={{ color: "var(--orange)" }}>{merchTotales.ingresos.toFixed(2)} €</td>
                <td className="text-right mono" style={{ color: merchTotales.beneficio >= 0 ? "var(--green)" : "var(--red)", fontWeight: 800 }}>
                  {merchTotales.beneficio >= 0 ? "+" : ""}{merchTotales.beneficio.toFixed(2)} €
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
