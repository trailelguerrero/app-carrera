import React from "react";
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
  ingresosPorDistancia 
}) => {
  const addIngresosExtra = () => {
    const id = ingresosExtra.length > 0 ? Math.max(...ingresosExtra.map(x => x.id)) + 1 : 1;
    setIngresosExtra(prev => [...prev, { id, nombre: "Nuevo ingreso", valor: 0, activo: true }]);
  };
  const removeIngresosExtra = (id) => setIngresosExtra(prev => prev.filter(x => x.id !== id));

  const addMerch = () => {
    const id = merchandising.length > 0 ? Math.max(...merchandising.map(m => m.id)) + 1 : 1;
    setMerchandising(prev => [...prev, { id, nombre: "Nuevo producto", unidades: 0, costeUnitario: 0, precioVenta: 0, activo: true }]);
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
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem", fontSize: "0.58rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            <span>🟣 Inscripciones {pctInscripciones.toFixed(0)}%</span>
            <span>🟢 Patrocinios {pctPatrocinios.toFixed(0)}%</span>
            <span>🟠 Merch {pctMerch.toFixed(0)}%</span>
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
              const isSynced = ie.id === 1 || ie.id === 3;
              const pct = totalIngresosExtra > 0 ? (ie.valor / totalIngresosExtra * 100) : 0;
              return (
                <tr key={ie.id} style={{ opacity: ie.activo ? 1 : 0.4 }}>
                  <td><Toggle value={ie.activo} onChange={v => setIngresosExtra(prev => prev.map(x => x.id === ie.id ? { ...x, activo: v } : x))} /></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        className="text-input"
                        value={ie.nombre}
                        onChange={e => setIngresosExtra(prev => prev.map(x => x.id === ie.id ? { ...x, nombre: e.target.value } : x))}
                      />
                      {isSynced && <span style={{ fontSize: "0.55rem", color: "var(--cyan)", fontFamily: "var(--font-mono)", background: "var(--cyan-dim)", padding: "0.1rem 0.35rem", borderRadius: 3, whiteSpace: "nowrap" }}>🔗 auto</span>}
                    </div>
                  </td>
                  <td className="text-right">
                    {isSynced ? (
                      <span className="mono" style={{ color: "var(--violet)", fontWeight: 700 }}>{ie.valor.toFixed(2)} €</span>
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
