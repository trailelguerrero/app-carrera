import React, { useState } from "react";
import { ModalEditarConcepto } from "./FichaConcepto";
import { Tooltip, TooltipIcon } from "../common/Tooltip";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";
import { Toggle } from "./common/Toggle";
import { cls, fmtN } from "../../lib/budgetUtils";

const TAB_CSS = `
  .text-right  { text-align: right; }
  .overflow-x  { overflow-x: auto; }
  .total-row   { background: var(--surface2); font-weight: 700; }
  .total-row td { border-top: 2px solid var(--border); padding: 0.75rem 0.6rem; }
  .card-title.fijo     { color: var(--cyan);   }
  .card-title.variable { color: var(--green);  }

  .num-input    { background: var(--surface2); border: 1px solid var(--border); color: var(--text);
    border-radius: 6px; padding: 0.3rem 0.5rem; width: 80px; text-align: right;
    font-family: var(--font-mono); font-size: 0.85rem; outline: none; }
  .num-input:focus { border-color: var(--cyan); }
  .num-input-sm { font-size: 0.75rem; padding: 0.2rem 0.4rem; width: 65px; }

  .text-input   { background: transparent; border: 1px solid transparent; color: var(--text);
    padding: 0.3rem; width: 100%; border-radius: 4px; font-family: var(--font-display);
    font-size: 0.85rem; outline: none; }
  .text-input:focus { background: var(--surface2); border-color: var(--border); }

  .modo-toggle  { padding: 0.2rem 0.5rem; border-radius: 5px; font-size: 0.7rem; font-weight: 700;
    cursor: pointer; border: 1px solid var(--border); background: var(--surface3);
    color: var(--text-muted); font-family: var(--font-mono); transition: all 0.15s;
    white-space: nowrap; }
  .modo-toggle.uniforme { background: var(--violet-dim); border-color: rgba(167,139,250,0.3);
    color: var(--violet); }

  .dist-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    margin-right: 4px; vertical-align: middle; }

  .mono { font-family: var(--font-mono); }
  .text-xs    { font-size: 0.72rem; }
  .text-muted { color: var(--text-muted); }
  .mb-2 { margin-bottom: 1rem; }

  /* Botones de reorden ▲▼ */
  .reorder-btn {
    display: flex; flex-direction: column; gap: 1px;
    background: none; border: none; cursor: pointer; padding: 0;
    opacity: 0.45; transition: opacity 0.15s;
  }
  .reorder-btn:hover { opacity: 1; }
  .reorder-btn span {
    display: block; width: 18px; height: 14px; line-height: 14px; text-align: center;
    font-size: 0.6rem; background: var(--surface3); border: 1px solid var(--border);
    border-radius: 3px; color: var(--text-muted); transition: all 0.1s;
  }
  .reorder-btn span:hover { background: var(--cyan-dim); border-color: var(--cyan);
    color: var(--cyan); opacity: 1; }
  .reorder-btn span:active { transform: scale(0.9); }
`;

export const TabPresupuesto = ({
  conceptos,
  totalInscritos,
  costesFijos,
  costesVariables,
  updateConcepto,
  updateCostePorDistancia,
  updateActivoDistancia,
  addConcepto,
  removeConcepto,
  reorderConceptos,
}) => {
  const [ordenAlfaFijo, setOrdenAlfaFijo] = useState(false);
  const [ordenAlfaVar,  setOrdenAlfaVar]  = useState(false);
  const [editando, setEditando] = useState(null);
  const [vistaResumen, setVistaResumen]   = useState(false);

  const abrirEditar = (c) => {
    const m = document.querySelector("main");
    if (m) m.scrollTo({ top: 0, behavior: "instant" });
    setEditando(c);
  };

  const handleSave = (updated) => {
    Object.entries(updated).forEach(([k, v]) => {
      if (k !== "id" && k !== "tipo") updateConcepto(updated.id, k, v);
    });
    setEditando(null);
  };

  const sort = (arr, alfa) => alfa
    ? [...arr].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"))
    : arr;

  const conceptosFijos = sort(conceptos.filter(c => c.tipo === "fijo"),     ordenAlfaFijo);
  const conceptosVar   = sort(conceptos.filter(c => c.tipo === "variable"), ordenAlfaVar);

  const moverFijo = (id, dir) => {
    const arr = conceptosFijos;
    const idx = arr.findIndex(c => c.id === id);
    const nuevoIdx = idx + dir;
    if (nuevoIdx < 0 || nuevoIdx >= arr.length) return;
    reorderConceptos("fijo", arr[idx].id, arr[nuevoIdx].id);
  };

  const moverVar = (id, dir) => {
    const arr = conceptosVar;
    const idx = arr.findIndex(c => c.id === id);
    const nuevoIdx = idx + dir;
    if (nuevoIdx < 0 || nuevoIdx >= arr.length) return;
    reorderConceptos("variable", arr[idx].id, arr[nuevoIdx].id);
  };

  const renderFilaFija = (c, idx, arr) => {
    const distActivas  = DISTANCIAS.filter(d => c.activoDistancias[d] && c.activo);
    const totalActivos = distActivas.reduce((s, d) => s + totalInscritos[d], 0);

    const distData = DISTANCIAS.map(d => {
      const prorrata = c.activo && c.activoDistancias[d] && totalActivos > 0
        ? (c.costeTotal * totalInscritos[d] / totalActivos)
        : (c.activo && c.activoDistancias[d] ? c.costeTotal / Math.max(distActivas.length, 1) : 0);
      const porCorredor = totalInscritos[d] > 0 && c.activoDistancias[d]
        ? prorrata / totalInscritos[d] : 0;
      return { d, porCorredor };
    });

    return (
      <tr key={c.id}>
        <td style={{ width: 22, padding: "0.3rem 0.2rem" }}>
          {!ordenAlfaFijo && (
            <button className="reorder-btn" title="Mover arriba / abajo">
              <span onClick={() => moverFijo(c.id, -1)} style={{ opacity: idx === 0 ? 0.2 : 1 }}>▲</span>
              <span onClick={() => moverFijo(c.id, +1)} style={{ opacity: idx === arr.length - 1 ? 0.2 : 1 }}>▼</span>
            </button>
          )}
        </td>
        <td><Toggle value={c.activo} onChange={v => updateConcepto(c.id, "activo", v)} /></td>
        <td>
          <button
            onClick={() => abrirEditar(c)}
            style={{ background:"none", border:"none", cursor:"pointer",
              padding:"0.3rem 0.4rem", textAlign:"left", width:"100%",
              borderRadius:6, display:"block" }}>
            <span style={{
              fontFamily:"var(--font-display)", fontSize:"0.85rem",
              fontWeight:600, color: c.activo ? "var(--text)" : "var(--text-muted)",
              display:"block", whiteSpace:"nowrap",
              overflow:"hidden", textOverflow:"ellipsis", maxWidth:"120px"
            }}>
              {c.nombre}
            </span>
            {(c.proveedor || c.notas || c.estadoPago || c.estadoPedido) && (
              <span style={{ fontSize:"var(--fs-xs)", opacity:0.6 }}>📋</span>
            )}
          </button>
        </td>
        <td className="text-right">
          <NumInput value={c.costeTotal} onChange={v => updateConcepto(c.id, "costeTotal", v)} step={1} />
        </td>
        {distData.map(({ d, porCorredor }) => (
          <td key={d} className="text-right" style={{ opacity: c.activo ? 1 : 0.35 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
              <Toggle value={c.activoDistancias[d]} onChange={v => updateActivoDistancia(c.id, d, v)} />
              <span className="mono text-xs" style={{ color: c.activoDistancias[d] ? DISTANCIA_COLORS[d] : "var(--text-muted)" }}>
                {fmtN(porCorredor)} €/cte
              </span>
            </div>
          </td>
        ))}
        <td>
          <button className="btn btn-red" onClick={() => removeConcepto(c.id)}>✕</button>
        </td>
      </tr>
    );
  };

  const renderFilaVariable = (c, idx, arr) => {
    const total = !c.activo ? 0 : DISTANCIAS.reduce((s, d) => {
      if (c.activoDistancias && c.activoDistancias[d] === false) return s;
      return s + (c.costePorDistancia[d] || 0) * totalInscritos[d];
    }, 0);

    return (
      <tr key={c.id}>
        <td style={{ width: 22, padding: "0.3rem 0.2rem" }}>
          {!ordenAlfaVar && (
            <button className="reorder-btn" title="Mover arriba / abajo">
              <span onClick={() => moverVar(c.id, -1)} style={{ opacity: idx === 0 ? 0.2 : 1 }}>▲</span>
              <span onClick={() => moverVar(c.id, +1)} style={{ opacity: idx === arr.length - 1 ? 0.2 : 1 }}>▼</span>
            </button>
          )}
        </td>
        <td><Toggle value={c.activo} onChange={v => updateConcepto(c.id, "activo", v)} /></td>
        <td>
          <button
            onClick={() => abrirEditar(c)}
            style={{ background:"none", border:"none", cursor:"pointer",
              padding:"0.3rem 0.4rem", textAlign:"left", width:"100%",
              borderRadius:6, display:"block" }}>
            <span style={{
              fontFamily:"var(--font-display)", fontSize:"0.85rem",
              fontWeight:600, color: c.activo ? "var(--text)" : "var(--text-muted)",
              display:"block", whiteSpace:"nowrap",
              overflow:"hidden", textOverflow:"ellipsis", maxWidth:"120px"
            }}>
              {c.nombre}
            </span>
            {(c.proveedor || c.notas || c.estadoPago || c.estadoPedido) && (
              <span style={{ fontSize:"var(--fs-xs)", opacity:0.6 }}>📋</span>
            )}
          </button>
        </td>
        <td>
          <button
            className={cls("modo-toggle", c.modoUniforme && "uniforme")}
            onClick={() => updateConcepto(c.id, "modoUniforme", !c.modoUniforme)}
            title={c.modoUniforme ? "Mismo precio en todas" : "Precio distinto por distancia"}
          >
            {c.modoUniforme ? "= Igual" : "≠ Dist."}
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
                small step={0.01}
              />
            </div>
          </td>
        ))}
        <td className="text-right mono text-xs" style={{ color: "var(--green)" }}>
          {c.activo ? total.toFixed(2) : "0,00"} €
        </td>
        <td>
          <button className="btn btn-red" onClick={() => removeConcepto(c.id)}>✕</button>
        </td>
      </tr>
    );
  };

  return (
    <>
      <style>{TAB_CSS}</style>

      {/* ── Toggle vista resumen / completa ── */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:".5rem" }}>
        <div style={{ display:"flex", background:"var(--surface2)", borderRadius:8,
          border:"1px solid var(--border)", overflow:"hidden" }}>
          <button
            className={"btn btn-sm" + (!vistaResumen ? " btn-cyan" : "")}
            style={{ borderRadius:0, border:"none", margin:0, minHeight:36, fontSize:"var(--fs-xs)" }}
            onClick={() => setVistaResumen(false)}>
            📊 Vista completa
          </button>
          <button
            className={"btn btn-sm" + (vistaResumen ? " btn-cyan" : "")}
            style={{ borderRadius:0, border:"none", margin:0, minHeight:36,
              borderLeft:"1px solid var(--border)", fontSize:"var(--fs-xs)" }}
            onClick={() => setVistaResumen(true)}>
            📋 Resumen
          </button>
        </div>
      </div>

      {/* COSTES FIJOS */}
      <div className="card">
        <div className="flex-between mb-2">
          <div className="card-title fijo">📦 Costes Fijos — repartidos por corredores activos</div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className={`btn btn-sm ${ordenAlfaFijo ? "btn-cyan" : "btn-ghost"}`}
              onClick={() => setOrdenAlfaFijo(v => !v)}
              title={ordenAlfaFijo ? "Volver a orden manual" : "Ordenar A-Z"}>
              {ordenAlfaFijo ? "A-Z ✓" : "A-Z"}
            </button>
            <button className="btn btn-cyan" onClick={() => addConcepto("fijo")}>+ Añadir</button>
          </div>
        </div>
        {/* Vista resumen — solo nombre + total + activo */}
        {vistaResumen ? (
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {conceptosFijos.map(c => (
              <div key={c.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:".4rem .5rem", borderBottom:"1px solid var(--border-light)",
                opacity: c.activo ? 1 : 0.45 }}>
                <div style={{ display:"flex", alignItems:"center", gap:".4rem", flex:1, minWidth:0 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                    background: c.activo ? "var(--green)" : "var(--text-dim)" }} />
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {c.nombre}
                  </span>
                </div>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                  color:"var(--text)", flexShrink:0, marginLeft:".5rem" }}>
                  {fmtN(c.costeTotal ?? c.total ?? 0)} €
                </span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between",
              padding:".45rem .5rem", borderTop:"2px solid var(--border)",
              background:"var(--surface2)" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:800 }}>TOTAL FIJOS</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:800 }}>
                {fmtN(costesFijos.total ?? 0)} €
              </span>
            </div>
          </div>
        ) : (
        <div className="overflow-x">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 22 }}></th>
                <th style={{ width: 30 }}>Act.</th>
                <th>Concepto</th>
                <th className="text-right">
  <Tooltip position="top" text={"Importe total del gasto fijo.\nSe prorratea entre distancias activas en proporción al número de inscritos de cada una."}>
    <span>Coste Total (€)</span><TooltipIcon />
  </Tooltip>
</th>
                {DISTANCIAS.map(d => (
                  <th key={d} className="text-right">
                    <Tooltip position="top" text={"Toggle: activa o desactiva este coste para esta distancia.\nEl valor €/cte muestra la parte prorrateada que le corresponde a cada corredor de esta distancia."}>
                      <span className="dist-dot" style={{ background: DISTANCIA_COLORS[d] }} />
                      <span>{DISTANCIA_LABELS[d]}</span>
                      <TooltipIcon />
                    </Tooltip>
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {conceptosFijos.map((c, i, arr) => renderFilaFija(c, i, arr))}
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
        )}
      </div>

      {/* COSTES VARIABLES */}
      <div className="card">
        <div className="flex-between mb-2">
          <div className="card-title variable">🔄 Costes Variables — por corredor inscrito</div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className={`btn btn-sm ${ordenAlfaVar ? "btn-green" : "btn-ghost"}`}
              onClick={() => setOrdenAlfaVar(v => !v)}
              title={ordenAlfaVar ? "Volver a orden manual" : "Ordenar A-Z"}>
              {ordenAlfaVar ? "A-Z ✓" : "A-Z"}
            </button>
            <button className="btn btn-green" onClick={() => addConcepto("variable")}>+ Añadir</button>
          </div>
        </div>
        {/* Vista resumen variables */}
        {vistaResumen ? (
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {conceptosVariables.map(c => {
              const totalVar = !c.activo ? 0 : DISTANCIAS.reduce((s, d) => {
                if (c.activoDistancias && c.activoDistancias[d] === false) return s;
                return s + (c.costePorDistancia[d] || 0) * (totalInscritos[d] || 0);
              }, 0);
              return (
              <div key={c.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:".4rem .5rem", borderBottom:"1px solid var(--border-light)",
                opacity: c.activo ? 1 : 0.45 }}>
                <div style={{ display:"flex", alignItems:"center", gap:".4rem", flex:1, minWidth:0 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                    background: c.activo ? "var(--cyan)" : "var(--text-dim)" }} />
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {c.nombre}
                  </span>
                </div>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                  color:"var(--text)", flexShrink:0, marginLeft:".5rem" }}>
                  {fmtN(totalVar)} €
                </span>
              </div>
              );
            })}
            <div style={{ display:"flex", justifyContent:"space-between",
              padding:".45rem .5rem", borderTop:"2px solid var(--border)",
              background:"var(--surface2)" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:800 }}>TOTAL VARIABLES</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:800 }}>
                {fmtN(costesVariables.total ?? 0)} €
              </span>
            </div>
          </div>
        ) : (
        <div className="overflow-x">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 22 }}></th>
                <th style={{ width: 30 }}>Act.</th>
                <th>Concepto</th>
                <th>Modo</th>
                {DISTANCIAS.map(d => (
                  <th key={d} className="text-right">
                    <span className="dist-dot" style={{ background: DISTANCIA_COLORS[d] }} />
                    €/cte {DISTANCIA_LABELS[d]}
                  </th>
                ))}
                <th className="text-right">Total (€)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {conceptosVar.map((c, i, arr) => renderFilaVariable(c, i, arr))}
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
        )}
      </div>
      {editando && (
        <ModalEditarConcepto
          concepto={editando}
          totalInscritos={totalInscritos}
          onSave={handleSave}
          onClose={() => setEditando(null)}
        />
      )}
    </>
  );
};
