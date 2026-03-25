import React, { useState, useRef, useCallback } from "react";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";
import { Toggle } from "./common/Toggle";
import { cls, fmtN } from "../../lib/budgetUtils";

const TAB_CSS = `
  /* ── Columnas de distancia: ocultas en móvil ───────────────── */
  @media (max-width: 640px) {
    .tbl-dist-col  { display: none !important; }
    .tbl-expand-col { display: table-cell !important; }
  }
  @media (min-width: 641px) {
    .tbl-expand-col { display: none !important; }
  }

  /* ── Botón expandir ─────────────────────────────────────────── */
  .tbl-expand-btn {
    background: none; border: 1px solid var(--border); color: var(--text-muted);
    border-radius: 4px; padding: 0.2rem 0.45rem; font-size: 0.62rem;
    cursor: pointer; font-family: var(--font-mono); white-space: nowrap;
    transition: all 0.15s; min-height: 30px;
  }
  .tbl-expand-btn:hover { border-color: var(--cyan); color: var(--cyan); }
  .tbl-expand-btn.open  { border-color: var(--cyan); color: var(--cyan); background: var(--cyan-dim); }

  /* ── Panel de distancias inline (fuera de <table>) ─────────── */
  .dist-panel-row { display: none; }
  @media (max-width: 640px) {
    .dist-panel-row { display: block; }
  }
  .dist-panel {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
    padding: 0.55rem 0.6rem;
    background: var(--surface2);
    border-bottom: 1px solid var(--border);
    border-left: 2px solid var(--cyan);
  }
  .dist-chip {
    display: flex; flex-direction: column; gap: 0.25rem;
    padding: 0.4rem 0.5rem; border-radius: 6px;
    background: var(--surface3); border: 1px solid var(--border);
  }
  .dist-chip-label {
    display: flex; align-items: center; gap: 0.25rem;
    font-family: var(--font-mono); font-size: 0.58rem; font-weight: 700;
  }
  .dist-chip-val {
    font-family: var(--font-mono); font-size: 0.6rem;
  }

  /* ── Drag visual ────────────────────────────────────────────── */
  .drag-over td:first-child { border-left: 3px solid var(--primary); }
  tr.dragging { opacity: 0.35; }

  /* Misc */
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
  .modo-toggle { padding: 0.2rem 0.5rem; border-radius: 5px; font-size: 0.7rem; font-weight: 700; cursor: pointer; border: 1px solid var(--border); background: var(--surface3); color: var(--text-muted); font-family: var(--font-mono); transition: all 0.15s; white-space: nowrap; }
  .modo-toggle.uniforme { background: var(--violet-dim); border-color: rgba(167,139,250,0.3); color: var(--violet); }
  .dist-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
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
  const [expandedRows,  setExpandedRows]  = useState({});

  const touchDragId  = useRef(null);
  const touchOverId  = useRef(null);
  const touchClone   = useRef(null);
  const originRowRef = useRef(null);

  const toggleExpand = (key) =>
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Touch drag ────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((id) => (e) => {
    // No iniciar drag si viene de un control interactivo
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "BUTTON") return;

    touchDragId.current = id;
    const row = e.currentTarget;
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
      `display:flex`,
      `align-items:center`,
    ].join(";");
    document.body.appendChild(clone);
    touchClone.current = clone;
    row.style.opacity = "0.35";
  }, []);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;

    if (touchClone.current) {
      const h = touchClone.current.offsetHeight;
      touchClone.current.style.top = `${y - h / 2}px`;
    }

    // Solo buscar entre <tr data-id> — excluye filas de panel expandido
    const rows = document.querySelectorAll("tr[data-id]");
    let best = null, bestDist = Infinity;
    rows.forEach(r => {
      const rect = r.getBoundingClientRect();
      const mid  = rect.top + rect.height / 2;
      const dist = Math.abs(y - mid);
      if (dist < bestDist) { bestDist = dist; best = r; }
    });

    // Limpiar outlines anteriores
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
    // Restaurar fila origen
    if (originRowRef.current) {
      originRowRef.current.style.opacity = "";
      originRowRef.current = null;
    }
    // Limpiar clon
    if (touchClone.current) { touchClone.current.remove(); touchClone.current = null; }
    // Limpiar outlines
    document.querySelectorAll("tr[data-id]").forEach(r => {
      r.style.outline = "";
      r.style.opacity = "";
    });
    // Ejecutar reorder
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

  // ── Fila de coste FIJO ────────────────────────────────────────────────────
  const renderFilaFija = (c) => {
    const distActivas  = DISTANCIAS.filter(d => c.activoDistancias[d] && c.activo);
    const totalActivos = distActivas.reduce((s, d) => s + totalInscritos[d], 0);
    const expKey       = `f_${c.id}`;
    const expanded     = !!expandedRows[expKey];

    const distData = DISTANCIAS.map(d => {
      const prorrata = c.activo && c.activoDistancias[d] && totalActivos > 0
        ? (c.costeTotal * totalInscritos[d] / totalActivos)
        : (c.activo && c.activoDistancias[d] ? c.costeTotal / Math.max(distActivas.length, 1) : 0);
      const porCorredor = totalInscritos[d] > 0 && c.activoDistancias[d]
        ? prorrata / totalInscritos[d] : 0;
      return { d, porCorredor };
    });

    return (
      <React.Fragment key={c.id}>
        {/* Fila principal */}
        <tr
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
          <td style={{ cursor: ordenAlfaFijo ? "default" : "grab", textAlign: "center", opacity: ordenAlfaFijo ? 0.2 : 1, width: 22 }}>
            ⠿
          </td>
          <td style={{ width: 36 }}>
            <Toggle value={c.activo} onChange={v => updateConcepto(c.id, "activo", v)} />
          </td>
          <td>
            <input className="text-input" value={c.nombre}
              onChange={e => updateConcepto(c.id, "nombre", e.target.value)}
              style={{ opacity: c.activo ? 1 : 0.4 }} />
          </td>
          <td className="text-right">
            <NumInput value={c.costeTotal} onChange={v => updateConcepto(c.id, "costeTotal", v)} step={1} />
          </td>

          {/* Columnas de distancia — desktop */}
          {distData.map(({ d, porCorredor }) => (
            <td key={d} className="text-right tbl-dist-col" style={{ opacity: c.activo ? 1 : 0.35 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                <Toggle value={c.activoDistancias[d]} onChange={v => updateActivoDistancia(c.id, d, v)} />
                <span className="mono text-xs" style={{ color: c.activoDistancias[d] ? DISTANCIA_COLORS[d] : "var(--text-muted)" }}>
                  {fmtN(porCorredor)} €/cte
                </span>
              </div>
            </td>
          ))}

          {/* Botón expandir — móvil */}
          <td className="tbl-expand-col" style={{ textAlign: "center", width: 56 }}>
            <button
              className={cls("tbl-expand-btn", expanded && "open")}
              onTouchEnd={e => { e.stopPropagation(); toggleExpand(expKey); }}
              onClick={() => toggleExpand(expKey)}
            >
              {expanded ? "▲" : "▼"} dist
            </button>
          </td>

          <td style={{ width: 36 }}>
            <button className="btn btn-red" onClick={() => removeConcepto(c.id)}>✕</button>
          </td>
        </tr>

        {/* Panel de distancias — FUERA de la tabla, como div */}
        {expanded && (
          <tr className="dist-panel-row">
            <td colSpan={7} style={{ padding: 0, border: "none" }}>
              <div className="dist-panel">
                {distData.map(({ d, porCorredor }) => (
                  <div key={d} className="dist-chip">
                    <div className="dist-chip-label">
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: DISTANCIA_COLORS[d], display: "inline-block", flexShrink: 0 }} />
                      <span style={{ color: DISTANCIA_COLORS[d] }}>{DISTANCIA_LABELS[d]}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Toggle value={c.activoDistancias[d]} onChange={v => updateActivoDistancia(c.id, d, v)} />
                      <span className="dist-chip-val" style={{ color: c.activoDistancias[d] ? DISTANCIA_COLORS[d] : "var(--text-muted)" }}>
                        {fmtN(porCorredor)} €/cte
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  // ── Fila de coste VARIABLE ────────────────────────────────────────────────
  const renderFilaVariable = (c) => {
    const total   = DISTANCIAS.reduce((s, d) => s + (c.costePorDistancia[d] || 0) * totalInscritos[d], 0);
    const expKey  = `v_${c.id}`;
    const expanded = !!expandedRows[expKey];

    return (
      <React.Fragment key={c.id}>
        <tr
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
          <td style={{ cursor: ordenAlfaVar ? "default" : "grab", textAlign: "center", opacity: ordenAlfaVar ? 0.2 : 1, width: 22 }}>
            ⠿
          </td>
          <td style={{ width: 36 }}>
            <Toggle value={c.activo} onChange={v => updateConcepto(c.id, "activo", v)} />
          </td>
          <td>
            <input className="text-input" value={c.nombre}
              onChange={e => updateConcepto(c.id, "nombre", e.target.value)}
              style={{ opacity: c.activo ? 1 : 0.4 }} />
          </td>
          <td style={{ width: 72 }}>
            <button
              className={cls("modo-toggle", c.modoUniforme && "uniforme")}
              onClick={() => updateConcepto(c.id, "modoUniforme", !c.modoUniforme)}
              title={c.modoUniforme ? "Mismo precio en todas" : "Precio distinto por distancia"}
            >
              {c.modoUniforme ? "= Igual" : "≠ Dist."}
            </button>
          </td>

          {/* Columnas de distancia — desktop */}
          {DISTANCIAS.map(d => (
            <td key={d} className="text-right tbl-dist-col" style={{ opacity: c.activo ? 1 : 0.35 }}>
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

          {/* Total — desktop */}
          <td className="text-right mono text-xs tbl-dist-col" style={{ color: "var(--green)" }}>
            {c.activo ? total.toFixed(2) : "0,00"} €
          </td>

          {/* Botón expandir — móvil */}
          <td className="tbl-expand-col" style={{ textAlign: "center", width: 56 }}>
            <button
              className={cls("tbl-expand-btn", expanded && "open")}
              onTouchEnd={e => { e.stopPropagation(); toggleExpand(expKey); }}
              onClick={() => toggleExpand(expKey)}
            >
              {expanded ? "▲" : "▼"} dist
            </button>
          </td>

          <td style={{ width: 36 }}>
            <button className="btn btn-red" onClick={() => removeConcepto(c.id)}>✕</button>
          </td>
        </tr>

        {/* Panel de distancias — como tr con td colSpan */}
        {expanded && (
          <tr className="dist-panel-row">
            <td colSpan={8} style={{ padding: 0, border: "none" }}>
              <div className="dist-panel">
                {DISTANCIAS.map(d => (
                  <div key={d} className="dist-chip">
                    <div className="dist-chip-label">
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: DISTANCIA_COLORS[d], display: "inline-block", flexShrink: 0 }} />
                      <span style={{ color: DISTANCIA_COLORS[d] }}>{DISTANCIA_LABELS[d]}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
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
                  </div>
                ))}
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      <style>{TAB_CSS}</style>

      {/* COSTES FIJOS */}
      <div className="card">
        <div className="flex-between mb-2">
          <div className="card-title fijo">📦 Costes Fijos</div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className={`btn btn-sm ${ordenAlfaFijo ? "btn-cyan" : "btn-ghost"}`}
              onClick={() => setOrdenAlfaFijo(v => !v)}>
              {ordenAlfaFijo ? "A-Z ✓" : "A-Z"}
            </button>
            <button className="btn btn-cyan" onClick={() => addConcepto("fijo")}>+ Añadir</button>
          </div>
        </div>
        <div className="overflow-x">
          <table className="tbl" style={{ tableLayout: "auto" }}>
            <thead>
              <tr>
                <th style={{ width: 22 }}></th>
                <th style={{ width: 36 }}>Act.</th>
                <th>Concepto</th>
                <th className="text-right">Total (€)</th>
                {DISTANCIAS.map(d => (
                  <th key={d} className="text-right tbl-dist-col">
                    <span className="dist-dot" style={{ background: DISTANCIA_COLORS[d] }} />
                    {DISTANCIA_LABELS[d]}
                  </th>
                ))}
                <th className="tbl-expand-col" style={{ width: 56 }}></th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {conceptosFijos.map(renderFilaFija)}
              <tr className="total-row">
                <td colSpan={3}>Subtotal Fijos</td>
                <td className="text-right mono">{costesFijos.total.toFixed(2)} €</td>
                {DISTANCIAS.map(d => (
                  <td key={d} className="text-right mono tbl-dist-col" style={{ color: DISTANCIA_COLORS[d] }}>
                    {costesFijos[d].toFixed(2)} €
                  </td>
                ))}
                <td className="tbl-expand-col"></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* COSTES VARIABLES */}
      <div className="card">
        <div className="flex-between mb-2">
          <div className="card-title variable">🔄 Costes Variables</div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className={`btn btn-sm ${ordenAlfaVar ? "btn-green" : "btn-ghost"}`}
              onClick={() => setOrdenAlfaVar(v => !v)}>
              {ordenAlfaVar ? "A-Z ✓" : "A-Z"}
            </button>
            <button className="btn btn-green" onClick={() => addConcepto("variable")}>+ Añadir</button>
          </div>
        </div>
        <div className="overflow-x">
          <table className="tbl" style={{ tableLayout: "auto" }}>
            <thead>
              <tr>
                <th style={{ width: 22 }}></th>
                <th style={{ width: 36 }}>Act.</th>
                <th>Concepto</th>
                <th style={{ width: 72 }}>Modo</th>
                {DISTANCIAS.map(d => (
                  <th key={d} className="text-right tbl-dist-col">
                    <span className="dist-dot" style={{ background: DISTANCIA_COLORS[d] }} />
                    €/cte {DISTANCIA_LABELS[d]}
                  </th>
                ))}
                <th className="text-right tbl-dist-col">Total (€)</th>
                <th className="tbl-expand-col" style={{ width: 56 }}></th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {conceptosVar.map(renderFilaVariable)}
              <tr className="total-row">
                <td colSpan={4}>Subtotal Variables</td>
                {DISTANCIAS.map(d => (
                  <td key={d} className="text-right mono tbl-dist-col" style={{ color: DISTANCIA_COLORS[d] }}>
                    {costesVariables[d].toFixed(2)} €
                  </td>
                ))}
                <td className="text-right mono tbl-dist-col">{costesVariables.total.toFixed(2)} €</td>
                <td className="tbl-expand-col"></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
