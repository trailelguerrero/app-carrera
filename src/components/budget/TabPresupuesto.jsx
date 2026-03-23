import React, { useState } from "react";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";
import { Toggle } from "./common/Toggle";
import { cls, fmtN } from "../../lib/budgetUtils";

export const TabPresupuesto = ({ 
  conceptos, 
  totalInscritos, 
  costesFijos, 
  costesVariables, 
  totalIngresosExtra, 
  updateConcepto, 
  updateCostePorDistancia, 
  updateActivoDistancia, 
  addConcepto, 
  removeConcepto, 
  reorderConceptos 
}) => {
  const conceptosFijos = conceptos.filter(c => c.tipo === "fijo");
  const conceptosVar = conceptos.filter(c => c.tipo === "variable");
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  return (
    <>
      {/* COSTES FIJOS */}
      <div className="card">
        <div className="flex-between mb-2">
          <div className="card-title fijo">📦 Costes Fijos — repartidos por corredores activos</div>
          <button className="btn btn-cyan" onClick={() => addConcepto("fijo")}>+ Añadir</button>
        </div>
        <div className="overflow-x">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 18 }}></th>
                <th style={{ width: 30 }}>Act.</th>
                <th>Concepto</th>
                <th className="text-right">Coste Total (€)</th>
                {DISTANCIAS.map(d => (
                  <th key={d} className="text-right">
                    <span className="dist-dot" style={{ background: DISTANCIA_COLORS[d] }} /> {DISTANCIA_LABELS[d]}
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {conceptosFijos.map(c => {
                const distActivas = DISTANCIAS.filter(d => c.activoDistancias[d] && c.activo);
                const totalActivos = distActivas.reduce((s, d) => s + totalInscritos[d], 0);
                return (
                  <tr key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                    onDragOver={e => { e.preventDefault(); setDragOverId(c.id); }}
                    onDrop={() => { reorderConceptos("fijo", dragId, c.id); setDragOverId(null); }}
                    className={cls(dragOverId === c.id && "drag-over", dragId === c.id && "dragging")}
                  >
                    <td style={{ cursor: "grab", textAlign: "center" }}><span className="drag-handle">⠿</span></td>
                    <td><Toggle value={c.activo} onChange={v => updateConcepto(c.id, "activo", v)} /></td>
                    <td>
                      <input
                        className="text-input"
                        value={c.nombre}
                        onChange={e => updateConcepto(c.id, "nombre", e.target.value)}
                        style={{ opacity: c.activo ? 1 : 0.4 }}
                      />
                    </td>
                    <td className="text-right">
                      <NumInput value={c.costeTotal} onChange={v => updateConcepto(c.id, "costeTotal", v)} step={1} />
                    </td>
                    {DISTANCIAS.map(d => {
                      const prorrata = c.activo && c.activoDistancias[d] && totalActivos > 0
                        ? (c.costeTotal * totalInscritos[d] / totalActivos)
                        : (c.activo && c.activoDistancias[d] ? c.costeTotal / Math.max(distActivas.length, 1) : 0);
                      const porCorredor = totalInscritos[d] > 0 && c.activoDistancias[d] ? prorrata / totalInscritos[d] : 0;
                      return (
                        <td key={d} className="text-right" style={{ opacity: c.activo ? 1 : 0.35 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                            <Toggle value={c.activoDistancias[d]} onChange={v => updateActivoDistancia(c.id, d, v)} />
                            <span className="mono text-xs" style={{ color: c.activoDistancias[d] ? DISTANCIA_COLORS[d] : "var(--text-muted)" }}>
                              {fmtN(porCorredor)} €/cte
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td><button className="btn btn-red" onClick={() => removeConcepto(c.id)}>✕</button></td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td colSpan={3}>Subtotal Fijos</td>
                <td className="text-right mono">{costesFijos.total.toFixed(2)} €</td>
                {DISTANCIAS.map(d => (
                  <td key={d} className="text-right mono" style={{ color: DISTANCIA_COLORS[d] }}>
                    {costesFijos[d].toFixed(2)} €
                  </td>
                ))}
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* COSTES VARIABLES */}
      <div className="card">
        <div className="flex-between mb-2">
          <div className="card-title variable">🔄 Costes Variables — por corredor inscrito</div>
          <button className="btn btn-green" onClick={() => addConcepto("variable")}>+ Añadir</button>
        </div>
        <div className="overflow-x">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 18 }}></th>
                <th style={{ width: 30 }}>Act.</th>
                <th>Concepto</th>
                <th>Modo</th>
                {DISTANCIAS.map(d => (
                  <th key={d} className="text-right">
                    <span className="dist-dot" style={{ background: DISTANCIA_COLORS[d] }} /> €/cte {DISTANCIA_LABELS[d]}
                  </th>
                ))}
                <th className="text-right">Total (€)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {conceptosVar.map(c => {
                const total = DISTANCIAS.reduce((s, d) => s + (c.costePorDistancia[d] || 0) * totalInscritos[d], 0);
                return (
                  <tr key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                    onDragOver={e => { e.preventDefault(); setDragOverId(c.id); }}
                    onDrop={() => { reorderConceptos("variable", dragId, c.id); setDragOverId(null); }}
                    className={cls(dragOverId === c.id && "drag-over", dragId === c.id && "dragging")}
                  >
                    <td style={{ cursor: "grab", textAlign: "center" }}><span className="drag-handle">⠿</span></td>
                    <td><Toggle value={c.activo} onChange={v => updateConcepto(c.id, "activo", v)} /></td>
                    <td>
                      <input
                        className="text-input"
                        value={c.nombre}
                        onChange={e => updateConcepto(c.id, "nombre", e.target.value)}
                        style={{ opacity: c.activo ? 1 : 0.4 }}
                      />
                    </td>
                    <td>
                      <button
                        className={cls("modo-toggle", c.modoUniforme && "uniforme")}
                        onClick={() => updateConcepto(c.id, "modoUniforme", !c.modoUniforme)}
                        title={c.modoUniforme ? "Mismo precio en todas" : "Precio distinto por distancia"}
                      >
                        {c.modoUniforme ? "= Igual" : "≠ Distinto"}
                      </button>
                    </td>
                    {DISTANCIAS.map(d => (
                      <td key={d} className="text-right" style={{ opacity: c.activo ? 1 : 0.35 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                          <Toggle
                            value={c.activoDistancias ? c.activoDistancias[d] !== false : true}
                            onChange={v => updateActivoDistancia(c.id, d, v)}
                          />
                          <NumInput
                            value={c.costePorDistancia[d] || 0}
                            onChange={v => updateCostePorDistancia(c.id, d, v)}
                            small
                            step={0.01}
                          />
                        </div>
                      </td>
                    ))}
                    <td className="text-right mono text-xs" style={{ color: "var(--green)" }}>
                      {c.activo ? total.toFixed(2) : "0,00"} €
                    </td>
                    <td><button className="btn btn-red" onClick={() => removeConcepto(c.id)}>✕</button></td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td colSpan={4}>Subtotal Variables</td>
                {DISTANCIAS.map(d => (
                  <td key={d} className="text-right mono" style={{ color: DISTANCIA_COLORS[d] }}>
                    {costesVariables[d].toFixed(2)} €
                  </td>
                ))}
                <td className="text-right mono">{costesVariables.total.toFixed(2)} €</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
