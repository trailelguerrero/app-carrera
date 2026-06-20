import React, { useMemo } from "react";
import { Tooltip, TooltipIcon } from "../common/Tooltip";
import { NumInput } from "./common/NumInput";
import { Toggle } from "./common/Toggle";
import { SeccionCamisetasBudget } from "./SeccionCamisetasBudget";

// Configuración visual por syncKey
// ECO-08: 'camisetas' y 'balanceCamisetasTecnicas' eliminados — ese dominio económico
// ahora vive en SeccionCamisetasBudget (6 categorías independientes).
const SYNC_CFG = {
  patrocinios:              { icon:"🤝", label:"Patrocinios captados",          sublabel:"confirmado + cobrado",   color:"var(--green)",  dim:"var(--green-dim)",  border:"var(--green-border)",  desc:"Acuerdos firmados con importe comprometido, aunque no cobrados aún" },
  patrociniosCobrado:       { icon:"💰", label:"Patrocinios cobrados",          sublabel:"tesorería real",         color:"var(--cyan)",   dim:"var(--cyan-dim)",   border:"var(--cyan-border)",   desc:"Dinero efectivamente cobrado — refleja el estado real de la caja" },
  subvencionPublica:        { icon:"🏛️", label:"Subvenciones entidad pública",  sublabel:"Administración pública", color:"var(--violet)", dim:"var(--violet-dim)", border:"var(--violet-border)", desc:"Suma de patrocinadores con sector \"Administración pública\"" },
};

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
  totalSubvencionPublica = 0,
  syncConfig = SYNC_CFG,
  setSyncConfig,
  // ECO-08: props del bloque Camisetas — Ingresos
  camisetasPresupuesto,
  camSyncConfig,
  setCamSyncConfig,
  totalIngresosCamisetas,
  totalGastosCamisetas,
}) => {
  // Separar líneas sincronizadas y manuales
  const lineasSync   = ingresosExtra.filter(ie => !!ie.syncKey);
  const lineasManual = ingresosExtra.filter(ie => !ie.syncKey);

  // Toggle de una línea sincronizada
  // setSyncConfig es la ÚNICA fuente de verdad para toggles sincronizados
  // ingresosExtraConValores en useBudgetLogic lee syncConfig en cada render
  const toggleSync = (syncKey, value) => {
    // 1. Actualizar syncConfig (fuente de verdad - useMemo lo leerá en el mismo render)
    setSyncConfig(prev => ({ ...prev, [syncKey]: value }));
    // 2. Actualizar ie.activo en el estado base por consistencia al guardar
    //    También asegurar que syncKey esté en el dato (migración de datos sin syncKey)
    setIngresosExtra(prev => prev.map(ie => {
      const ID_SK = { 1: "patrocinios", 2: "camisetas", 3: "patrociniosCobrado", 10: "subvencionPublica", 13: "balanceCamisetasTecnicas" };
      const ieKey = ie.syncKey || ID_SK[ie.id] || null;
      if (ieKey !== syncKey) return ie;
      return { ...ie, syncKey: ieKey, activo: value, synced: true };
    }));
  };

  // Toggle de una línea manual
  const toggleManual = (id, value) => {
    setIngresosExtra(prev => prev.map(ie => ie.id === id ? { ...ie, activo: value } : ie));
  };

  const addIngresosExtra = () => {
    const id = ingresosExtra.length > 0 ? Math.max(...ingresosExtra.map(x => x.id)) + 1 : 100;
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
  const pctOtros = totalIngresosTodos > 0 ? (totalIngresosConMerch / totalIngresosTodos * 100) : 0;
  const pctInscripciones = totalIngresosTodos > 0 ? (ingresosPorDistancia.total / totalIngresosTodos * 100) : 0;

  return (
    <>
      {/* ── RESUMEN GLOBAL ── */}
      <div className="card">
        <div className="card-title" style={{ color: "var(--violet)" }}>💜 Resumen Global de Ingresos</div>
        <div className="kpi-grid" style={{ marginBottom: 0 }}>
          <div className="kpi violet">
            <div className="kpi-label">Inscripciones</div>
            <div className="kpi-value">{ingresosPorDistancia.total.toFixed(0)} €</div>
            <div className="kpi-sub">{pctInscripciones.toFixed(1)}% del total</div>
          </div>
          <div className="kpi green">
            <div className="kpi-label">Patrocinios y otros</div>
            <div className="kpi-value">{totalIngresosConMerch.toFixed(0)} €</div>
            <div className="kpi-sub">{pctOtros.toFixed(1)}% del total</div>
          </div>
          <div className="kpi cyan">
            <div className="kpi-label">Total ingresos</div>
            <div className="kpi-value">{totalIngresosTodos.toFixed(0)} €</div>
            <div className="kpi-sub">Todas las fuentes activas</div>
          </div>
        </div>
        {totalIngresosTodos > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: "var(--surface3)" }}>
              {pctInscripciones > 0 && <div style={{ width: `${pctInscripciones}%`, background: "var(--violet)", transition: "width 0.4s" }} />}
              {pctOtros > 0 && <div style={{ width: `${pctOtros}%`, background: "var(--green)", transition: "width 0.4s" }} />}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.35rem", fontSize: "var(--fs-xs)", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              <span>🟣 Inscripciones {pctInscripciones.toFixed(0)}%</span>
              <span>🟢 Otros {pctOtros.toFixed(0)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* ── PANEL UNIFICADO: PATROCINIOS, SUBVENCIONES Y OTROS INGRESOS ── */}
      <div className="card">
        <div className="flex-between mb-2">
          <div className="card-title ingresos">🤝 Patrocinios, Subvenciones y Otros Ingresos</div>
          <button className="btn" style={{ background: "rgba(167,139,250,0.15)", color: "var(--violet)", border: "1px solid rgba(167,139,250,0.3)", fontSize: "var(--fs-sm)" }} onClick={addIngresosExtra}>+ Añadir</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* ── Líneas sincronizadas (toggle grande + valor en tiempo real) ── */}
          {lineasSync.map(ie => {
            const cfg = SYNC_CFG[ie.syncKey] || {};
            const activo = ie.activo;
            const valor = ie.valor; // ya viene calculado en tiempo real de useBudgetLogic
            return (
              <div key={ie.id}
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.65rem 0.85rem", borderRadius: 10,
                  background: activo ? `rgba(${cfg.color === "var(--green)" ? "52,211,153" : cfg.color === "var(--cyan)" ? "34,211,238" : cfg.color === "var(--orange)" ? "251,146,60" : "167,139,250"},.06)` : "var(--surface2)",
                  border: `1px solid ${activo ? cfg.border : "var(--border)"}`,
                  transition: "all 0.2s",
                  opacity: activo ? 1 : 0.55,
                }}
              >
                {/* Toggle */}
                <div style={{ flexShrink: 0 }}>
                  <Toggle value={activo} onChange={v => toggleSync(ie.syncKey, v)} />
                </div>

                {/* Icono + info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "var(--fs-base)" }}>{cfg.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>{cfg.label}</span>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                      color: cfg.color, background: cfg.dim,
                      padding: "0.1rem 0.35rem", borderRadius: 3,
                    }}>{cfg.sublabel}</span>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                      color: "var(--cyan)", background: "var(--cyan-dim)",
                      padding: "0.1rem 0.3rem", borderRadius: 3,
                    }}>🔗 auto</span>
                  </div>
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                    {cfg.desc}
                  </div>
                </div>

                {/* Valor */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "var(--fs-md)", color: activo ? cfg.color : "var(--text-dim)" }}>
                    {valor.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                  </div>
                  {activo && valor > 0 && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--green)" }}>⚡ activo</div>
                  )}
                </div>

                {/* Navegación rápida */}
                {(ie.syncKey === "patrocinios" || ie.syncKey === "patrociniosCobrado" || ie.syncKey === "subvencionPublica") && (
                  <button onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "patrocinadores" } }))}
                    style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".2rem .45rem", borderRadius: 5, border: `1px solid ${cfg.border}`, background: cfg.dim, color: cfg.color, cursor: "pointer", flexShrink: 0 }}>
                    🤝 →
                  </button>
                )}
              </div>
            );
          })}

          {/* ── Separador ── */}
          {lineasManual.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.25rem 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                ✏️ Ingresos manuales
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
          )}

          {/* ── Líneas manuales ── */}
          {lineasManual.map(ie => {
            const pct = totalIngresosExtra > 0 ? (ie.valor / totalIngresosExtra * 100) : 0;
            return (
              <div key={ie.id}
                style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  padding: "0.5rem 0.7rem", borderRadius: 8,
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  opacity: ie.activo ? 1 : 0.45,
                }}
              >
                <Toggle value={ie.activo} onChange={v => toggleManual(ie.id, v)} />
                <input
                  className="text-input"
                  value={ie.nombre}
                  style={{ flex: 1, minWidth: 0 }}
                  onChange={e => setIngresosExtra(prev => prev.map(x => x.id === ie.id ? { ...x, nombre: e.target.value } : x))}
                />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", background: "var(--surface3)", padding: "0.1rem 0.3rem", borderRadius: 3, flexShrink: 0 }}>✏️</span>
                <div style={{ width: 90, flexShrink: 0 }}>
                  <NumInput value={ie.valor} onChange={v => setIngresosExtra(prev => prev.map(x => x.id === ie.id ? { ...x, valor: v } : x))} step={10} />
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", flexShrink: 0, minWidth: 36, textAlign: "right" }}>
                  {pct.toFixed(0)}%
                </span>
                <button className="btn btn-red" style={{ padding: "0.2rem 0.5rem", fontSize: "var(--fs-xs)", flexShrink: 0 }} onClick={() => removeIngresosExtra(ie.id)}>✕</button>
              </div>
            );
          })}
        </div>

        {/* ── Total ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: "0.85rem", paddingTop: "0.75rem",
          borderTop: "2px solid var(--border)",
        }}>
          <span style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>Total otros ingresos activos</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "var(--fs-md)", color: "var(--violet)" }}>
            {totalIngresosExtra.toFixed(2)} €
          </span>
        </div>
      </div>

      {/* ECO-08: bloque Camisetas — Ingresos. Categorías con ingreso real
          (corredores, no corredores, venta público, otros), sustituye a las
          antiguas líneas sincronizadas "Merchandising total" / "Balance camisetas técnicas". */}
      <SeccionCamisetasBudget
        modo="ingresos"
        camisetasPresupuesto={camisetasPresupuesto}
        camSyncConfig={camSyncConfig}
        setCamSyncConfig={setCamSyncConfig}
        totalIngresosCamisetas={totalIngresosCamisetas}
        totalGastosCamisetas={totalGastosCamisetas}
      />

      {/* ── MERCHANDISING ── */}
      <div className="card">
        <div className="flex-between mb-2">
          <div className="card-title" style={{ color: "var(--orange)" }}>🛍️ Merchandising — Venta de Productos</div>
          <button className="btn" style={{ background: "rgba(251,146,60,0.15)", color: "var(--orange)", border: "1px solid rgba(251,146,60,0.3)" }} onClick={addMerch}>+ Añadir producto</button>
        </div>
        {/* ECO-10: aviso de posible duplicidad — si hay una fila de Merchandising que
            parece ser una camiseta, su beneficio se sumaría aparte y por duplicado del
            bloque "Camisetas — Ingresos/Gastos" de arriba. Esto NO se borra automáticamente
            (puede ser legítimo, p.ej. una sudadera): el usuario decide si la elimina. */}
        {merchandising.some(m => m.activo && /camiset/i.test(m.nombre || "")) && (
          <div style={{ marginBottom: "0.6rem", padding: "0.5rem 0.7rem", borderRadius: 8,
            background: "rgba(226,75,74,.08)", border: "1px solid rgba(226,75,74,.3)",
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)" }}>
            ⚠️ Hay un producto con "camiseta" en el nombre. Si ya cuentas esas camisetas en el
            bloque "Camisetas — Ingresos/Gastos" de arriba, esta fila duplica ese beneficio —
            revísala y bórrala si corresponde.
          </div>
        )}
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
                    <td><input className="text-input" value={m.nombre} onChange={e => updateMerch(m.id, "nombre", e.target.value)} /></td>
                    <td className="text-right"><NumInput value={m.unidades} onChange={v => updateMerch(m.id, "unidades", Math.round(v))} step={1} small /></td>
                    <td className="text-right"><NumInput value={m.costeUnitario} onChange={v => updateMerch(m.id, "costeUnitario", v)} small /></td>
                    <td className="text-right"><NumInput value={m.precioVenta} onChange={v => updateMerch(m.id, "precioVenta", v)} small /></td>
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
                <td className="text-right mono muted">{merchTotales.costes.toFixed(2)} €</td>
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
