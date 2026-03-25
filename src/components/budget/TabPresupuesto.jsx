import React, { useState, useRef, useCallback } from "react";
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
  .num-input    { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 0.3rem 0.5rem; width: 80px; text-align: right; font-family: var(--font-mono); font-size: 0.85rem; outline: none; }
  .num-input:focus { border-color: var(--cyan); }
  .num-input-sm { font-size: 0.75rem; padding: 0.2rem 0.4rem; width: 65px; }
  .text-input   { background: transparent; border: 1px solid transparent; color: var(--text); padding: 0.3rem; width: 100%; border-radius: 4px; font-family: var(--font-display); font-size: 0.85rem; outline: none; }
  .text-input:focus { background: var(--surface2); border-color: var(--border); }
  .modo-toggle  { padding: 0.2rem 0.5rem; border-radius: 5px; font-size: 0.7rem; font-weight: 700; cursor: pointer; border: 1px solid var(--border); background: var(--surface3); color: var(--text-muted); font-family: var(--font-mono); transition: all 0.15s; white-space: nowrap; }
  .modo-toggle.uniforme { background: var(--violet-dim); border-color: rgba(167,139,250,0.3); color: var(--violet); }
  .dist-dot     { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
  .drag-over td:first-child { border-left: 3px solid var(--primary); }
  tr.dragging   { opacity: 0.35; }
  .mono { font-family: var(--font-mono); }
  .text-xs    { font-size: 0.72rem; }
  .text-muted { color: var(--text-muted); }
  .mb-2 { margin-bottom: 1rem; }
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
  const [dragId,        setDragId]        = useState(null);
  const [dragOverId,    setDragOverId]    = useState(null);

  const touchDragId  = useRef(null);
  const touchOverId  = useRef(null);
  const touchClone   = useRef(null);
  const originRowRef = useRef(null);

  // ── Touch drag ────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((id) => (e) => {
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "BUTTON") return;

    touchDragId.current = id;
    const row  = e.currentTarget;
    originRowRef.current = row;
    const rect = row.getBoundingClientRect();

    const clone = row.cloneNode(true);
    clone.style.cssText = [
      `position:fixed`,
      `top:${rect.top}px`,
      `left:${rect.left}px`,
      `width:${rect.width}px`,
      `height:${rect.height}px`,
      `opacity:0.88`,
      `background:var(--surface2)`,
      `border:2px solid var(--cyan)`,
      `box-shadow:0 8px 28px rgba(0,0,0,0.55)`,
      `z-index:9999`,
      `pointer-events:none`,
      `border-radius:6px`,
      `overflow:hidden`,
    ].join(";");
    document.body.appendChild(clone);
    touchClone.current = clone;
    row.style.opacity = "0.35";
  }, []);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    const y = e.touches[0].clientY;

    if (touchClone.current) {
      const h = touchClone.current.offsetHeight;
      touchClone.current.style.top = `${y - h / 2}px`;
    }

    const rows = document.querySelectorAll("tr[data-id]");
    let best = null, bestDist = Infinity;
    rows.forEach(r => {
      const rect = r.getBoundingClientRect();
      const mid  = rect.top + rect.height / 2;
      const dist = Math.abs(y - mid);
      if (dist < bestDist) { bestDist = dist; best = r; }
    });

    rows.forEach(r => r.style.outline = "");
    if (best && bestDist < 100) {
      touchOverId.current = best.dataset.id;
      if (best.dataset.id !== String(touchDragId.current)) {
        best.style.outline = "2px solid var(--cyan)";
        best.style.outlineOffset = "-2px";
      }
    }
  }, []);

  const onTouchEnd = useCallback((tipo) => () => {
    if (originRowRef.current) { originRowRef.current.style.opacity = ""; originRowRef.current = null; }
    if (touchClone.current)   { touchClone.current.remove(); touchClone.current = null; }
    document.querySelectorAll("tr[data-id]").forEach(r => { r.style.outline = ""; r.style.opacity = ""; });

    const fromId = touchDragId.current;
    const toId   = touchOverId.current;
    if (fromId && toId && String(fromId) !== String(toId)) {
      reorderConceptos(tipo, parseInt(fromId), parseInt(toId));
    }
    touchDragId.current = null;
    touchOverId.current = null;
  }, [reorderConceptos]);

  const sort = (arr, alfa) => alfa
    ? [...arr].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"))
    : arr;

  const conceptosFijos = sort(conceptos.filter(c => c.tipo === "fijo"),     ordenAlfaFijo);
  const conceptosVar   = sort(conceptos.filter(c => c.tipo === "variable"), ordenAlfaVar);

  // ── Fila FIJO ─────────────────────────────────────────────────────────────
  const renderFilaFija = (c) => {
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
      <tr key={c.id}
        data-id={c.id}
        draggable={!ordenAlfaFijo}
        onDragStart={!ordenAlfaFijo ? () => setDragId(c.id) : undefined}
        onDragEnd={() => { setDragId(null); setDragOverId(null); }}
        onDragOver={e => { e.preventDefault(); setDragOverId(c.id); }}
        onDrop={() => { reorderConceptos("fijo", dragId, c.id); setDragOverId(null); }}
        onTouchStart={!ordenAlfaFijo ? onTouchStart(c.id) : undefined}
        onTouchMove={!ordenAlfaFijo ? onTouchMove : undefined}
        onTouchEnd={!ordenAlfaFijo ? onTouchEnd("fijo") : undefined}
        className={cls(dragOverId === c.id && "drag-over", dragId === c.id && "dragging")}
      >
        <td style={{ cursor: ordenAlfaFijo ? "default" : "grab", textAlign: "center", opacity: ordenAlfaFijo ? 0.2 : 1 }}>
          ⠿
        </td>
        <td><Toggle value={c.activo} onChange={v => updateConcepto(c.id, "activo", v)} /></td>
        <td>
          <input className="text-input" value={c.nombre}
            onChange={e => updateConcepto(c.id, "nombre", e.target.value)}
            style={{ opacity: c.activo ? 1 : 0.4 }} />
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

  // ── Fila VARIABLE ─────────────────────────────────────────────────────────
  const renderFilaVariable = (c) => {
    const total = DISTANCIAS.reduce((s, d) => s + (c.costePorDistancia[d] || 0) * totalInscritos[d], 0);

    return (
      <tr key={c.id}
        data-id={c.id}
        draggable={!ordenAlfaVar}
        onDragStart={!ordenAlfaVar ? () => setDragId(c.id) : undefined}
        onDragEnd={() => { setDragId(null); setDragOverId(null); }}
        onDragOver={e => { e.preventDefault(); setDragOverId(c.id); }}
        onDrop={() => { reorderConceptos("variable", dragId, c.id); setDragOverId(null); }}
        onTouchStart={!ordenAlfaVar ? onTouchStart(c.id) : undefined}
        onTouchMove={!ordenAlfaVar ? onTouchMove : undefined}
        onTouchEnd={!ordenAlfaVar ? onTouchEnd("variable") : undefined}
        className={cls(dragOverId === c.id && "drag-over", dragId === c.id && "dragging")}
      >
        <td style={{ cursor: ordenAlfaVar ? "default" : "grab", textAlign: "center", opacity: ordenAlfaVar ? 0.2 : 1 }}>
          ⠿
        </td>
        <td><Toggle value={c.activo} onChange={v => updateConcepto(c.id, "activo", v)} /></td>
        <td>
          <input className="text-input" value={c.nombre}
            onChange={e => updateConcepto(c.id, "nombre", e.target.value)}
            style={{ opacity: c.activo ? 1 : 0.4 }} />
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

      {/* COSTES FIJOS */}
      <div className="card">
        <div className="flex-between mb-2">
          <div className="card-title fijo">📦 Costes Fijos — repartidos por corredores activos</div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className={`btn btn-sm ${ordenAlfaFijo ? "btn-cyan" : "btn-ghost"}`}
              onClick={() => setOrdenAlfaFijo(v => !v)}>
              {ordenAlfaFijo ? "A-Z ✓" : "A-Z"}
            </button>
            <button className="btn btn-cyan" onClick={() => addConcepto("fijo")}>+ Añadir</button>
          </div>
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
                    <span className="dist-dot" style={{ background: DISTANCIA_COLORS[d] }} />
                    {DISTANCIA_LABELS[d]}
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {conceptosFijos.map(renderFilaFija)}
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
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className={`btn btn-sm ${ordenAlfaVar ? "btn-green" : "btn-ghost"}`}
              onClick={() => setOrdenAlfaVar(v => !v)}>
              {ordenAlfaVar ? "A-Z ✓" : "A-Z"}
            </button>
            <button className="btn btn-green" onClick={() => addConcepto("variable")}>+ Añadir</button>
          </div>
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
                    <span className="dist-dot" style={{ background: DISTANCIA_COLORS[d] }} />
                    €/cte {DISTANCIA_LABELS[d]}
                  </th>
                ))}
                <th className="text-right">Total (€)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {conceptosVar.map(renderFilaVariable)}
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
