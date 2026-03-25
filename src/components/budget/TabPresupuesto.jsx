import React, { useState, useRef, useCallback } from "react";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";
import { Toggle } from "./common/Toggle";
import { cls, fmtN } from "../../lib/budgetUtils";

// CSS local del componente (inyectado una sola vez)
const TAB_CSS = `
  /* ── Vista compacta móvil ─────────────────────────────────────────── */
  .tbl-dist-col { }
  .tbl-expand-btn {
    background: none; border: 1px solid var(--border); color: var(--text-muted);
    border-radius: 4px; padding: 0.15rem 0.4rem; font-size: 0.6rem;
    cursor: pointer; font-family: var(--font-mono); white-space: nowrap;
    transition: all 0.15s;
  }
  .tbl-expand-btn:hover { border-color: var(--cyan); color: var(--cyan); }
  .tbl-expand-btn.open  { border-color: var(--cyan); color: var(--cyan); background: var(--cyan-dim); }

  /* Detalle de distancias en fila expandida (mobile) */
  .tbl-dist-detail {
    display: none;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
    padding: 0.5rem 0.75rem;
    background: var(--surface2);
    border-top: 1px solid var(--border);
  }
  .tbl-dist-detail.open { display: grid; }
  .tbl-dist-chip {
    display: flex; flex-direction: column; gap: 0.2rem;
    padding: 0.4rem 0.5rem; border-radius: 6px;
    background: var(--surface3); border: 1px solid var(--border);
  }
  .tbl-dist-chip-label {
    font-family: var(--font-mono); font-size: 0.55rem; font-weight: 700;
    display: flex; align-items: center; gap: 0.25rem;
  }

  /* Columnas de distancia — ocultas en móvil */
  @media (max-width: 640px) {
    .tbl-dist-col { display: none; }
    .tbl-expand-col { display: table-cell !important; }
  }
  @media (min-width: 641px) {
    .tbl-expand-col { display: none !important; }
    .tbl-dist-detail { display: none !important; }
  }
`;

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
  reorderConceptos,
}) => {
  const [ordenAlfaFijo, setOrdenAlfaFijo] = useState(false);
  const [ordenAlfaVar,  setOrdenAlfaVar]  = useState(false);
  const [dragId,     setDragId]     = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({}); // {id: bool}

  const touchDragId = useRef(null);
  const touchOverId = useRef(null);
  const touchClone  = useRef(null);

  const toggleExpand = (id) =>
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Touch drag ──────────────────────────────────────────────────────────
  const onTouchStart = useCallback((id) => (e) => {
    touchDragId.current = id;
    const row = e.currentTarget;
    const rect = row.getBoundingClientRect();
    const clone = row.cloneNode(true);
    // Limpiar outline en caso de que quedase de un drag anterior
    clone.querySelectorAll("[style]").forEach(el => el.style.outline = "");
    clone.style.cssText = [
      `position:fixed`,
      `top:${rect.top}px`,
      `left:${rect.left}px`,
      `width:${rect.width}px`,
      `opacity:0.9`,
      `background:var(--surface2)`,
      `border:2px solid var(--cyan)`,
      `box-shadow:0 8px 24px rgba(0,0,0,0.5)`,
      `z-index:9999`,
      `pointer-events:none`,
      `border-radius:6px`,
      `transform:scale(1.02)`,
      `transition:transform 0.1s`,
    ].join(";");
    document.body.appendChild(clone);
    touchClone.current = clone;
    // Feedback visual en la fila origen
    row.style.opacity = "0.4";
    touchDragId._originRow = row;
  }, []);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const y = touch.clientY;

    // Mover el clon visual
    if (touchClone.current) {
      touchClone.current.style.top = `${y - touchClone.current.offsetHeight / 2}px`;
    }

    // Detectar fila destino por posición Y — más fiable que elementFromPoint
    // porque ignora el clon flotante y las filas de detalle sin data-id
    const rows = document.querySelectorAll("tr[data-id]");
    let closest = null;
    let closestDist = Infinity;
    rows.forEach(row => {
      const rect = row.getBoundingClientRect();
      const rowMid = rect.top + rect.height / 2;
      const dist = Math.abs(y - rowMid);
      if (dist < closestDist) {
        closestDist = dist;
        closest = row;
      }
    });
    if (closest && closestDist < 80) {
      touchOverId.current = closest.dataset.id;
      // Feedback visual: resaltar fila destino
      rows.forEach(r => r.style.outline = "");
      if (closest.dataset.id !== String(touchDragId.current)) {
        closest.style.outline = "2px solid var(--cyan)";
        closest.style.outlineOffset = "-2px";
      }
    }
  }, []);

  const onTouchEnd = useCallback((tipo) => () => {
    // Restaurar fila origen
    if (touchDragId._originRow) { touchDragId._originRow.style.opacity = ""; touchDragId._originRow = null; }
    // Limpiar clon visual
    if (touchClone.current) { touchClone.current.remove(); touchClone.current = null; }
    // Limpiar outline de fila destino
    document.querySelectorAll("tr[data-id]").forEach(r => { r.style.outline = ""; r.style.opacity = ""; });
    // Ejecutar reorder si hay destino válido
    if (touchDragId.current && touchOverId.current &&
        String(touchDragId.current) !== String(touchOverId.current)) {
      reorderConceptos(tipo, parseInt(touchDragId.current), parseInt(touchOverId.current));
    }
    touchDragId.current = null;
    touchOverId.current = null;
  }, [reorderConceptos]);

  const sort = (arr, alfa) => alfa
    ? [...arr].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"))
    : arr;

  const conceptosFijos = sort(conceptos.filter(c => c.tipo === "fijo"),     ordenAlfaFijo);
  const conceptosVar   = sort(conceptos.filter(c => c.tipo === "variable"), ordenAlfaVar);

  // ── Renderiza fila de costes fijos ────────────────────────────────────────
  const renderFilaFija = (c) => {
    const distActivas  = DISTANCIAS.filter(d => c.activoDistancias[d] && c.activo);
    const totalActivos = distActivas.reduce((s, d) => s + totalInscritos[d], 0);
    const expanded     = !!expandedRows[c.id];

    const distData = DISTANCIAS.map(d => {
      const prorrata = c.activo && c.activoDistancias[d] && totalActivos > 0
        ? (c.costeTotal * totalInscritos[d] / totalActivos)
        : (c.activo && c.activoDistancias[d] ? c.costeTotal / Math.max(distActivas.length, 1) : 0);
      const porCorredor = totalInscritos[d] > 0 && c.activoDistancias[d] ? prorrata / totalInscritos[d] : 0;
      return { d, prorrata, porCorredor };
    });

    return (
      <React.Fragment key={c.id}>
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
          <td style={{ cursor: ordenAlfaFijo ? "default" : "grab", textAlign: "center", opacity: ordenAlfaFijo ? 0.2 : 1 }}>
            <span className="drag-handle">⠿</span>
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

          {/* Columnas de distancia — ocultas en móvil */}
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

          {/* Botón expandir — solo visible en móvil */}
          <td className="tbl-expand-col" style={{ textAlign: "center" }}>
            <button className={cls("tbl-expand-btn", expanded && "open")}
              onClick={() => toggleExpand(c.id)}>
              {expanded ? "▲" : "▼"} dist
            </button>
          </td>

          <td>
            <button className="btn btn-red" onClick={() => removeConcepto(c.id)}>✕</button>
          </td>
        </tr>

        {/* Detalle de distancias expandido en móvil */}
        <tr className="tbl-expand-col" style={{ display: expanded ? "table-row" : "none" }}>
          <td colSpan={6} style={{ padding: 0 }}>
            <div className={cls("tbl-dist-detail", expanded && "open")}>
              {distData.map(({ d, porCorredor }) => (
                <div key={d} className="tbl-dist-chip">
                  <div className="tbl-dist-chip-label">
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: DISTANCIA_COLORS[d], display: "inline-block", flexShrink: 0 }} />
                    <span style={{ color: DISTANCIA_COLORS[d] }}>{d}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Toggle value={c.activoDistancias[d]} onChange={v => updateActivoDistancia(c.id, d, v)} />
                    <span className="mono text-xs" style={{ color: c.activoDistancias[d] ? DISTANCIA_COLORS[d] : "var(--text-muted)" }}>
                      {fmtN(porCorredor)} €/cte
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      </React.Fragment>
    );
  };

  // ── Renderiza fila de costes variables ────────────────────────────────────
  const renderFilaVariable = (c) => {
    const total    = DISTANCIAS.reduce((s, d) => s + (c.costePorDistancia[d] || 0) * totalInscritos[d], 0);
    const expanded = !!expandedRows[`v_${c.id}`];

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
          <td style={{ cursor: ordenAlfaVar ? "default" : "grab", textAlign: "center", opacity: ordenAlfaVar ? 0.2 : 1 }}>
            <span className="drag-handle">⠿</span>
          </td>
          <td><Toggle value={c.activo} onChange={v => updateConcepto(c.id, "activo", v)} /></td>
          <td>
            <input className="text-input" value={c.nombre}
              onChange={e => updateConcepto(c.id, "nombre", e.target.value)}
              style={{ opacity: c.activo ? 1 : 0.4 }} />
          </td>
          <td>
            <button className={cls("modo-toggle", c.modoUniforme && "uniforme")}
              onClick={() => updateConcepto(c.id, "modoUniforme", !c.modoUniforme)}
              title={c.modoUniforme ? "Mismo precio en todas" : "Precio distinto por distancia"}>
              {c.modoUniforme ? "= Igual" : "≠ Dist."}
            </button>
          </td>

          {/* Columnas de distancia — ocultas en móvil */}
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

          {/* Total — visible en desktop */}
          <td className="text-right mono text-xs tbl-dist-col" style={{ color: "var(--green)" }}>
            {c.activo ? total.toFixed(2) : "0,00"} €
          </td>

          {/* Botón expandir — solo visible en móvil */}
          <td className="tbl-expand-col" style={{ textAlign: "center" }}>
            <button className={cls("tbl-expand-btn", expanded && "open")}
              onClick={() => toggleExpand(`v_${c.id}`)}>
              {expanded ? "▲" : "▼"} dist
            </button>
          </td>

          <td>
            <button className="btn btn-red" onClick={() => removeConcepto(c.id)}>✕</button>
          </td>
        </tr>

        {/* Detalle de distancias expandido en móvil */}
        <tr className="tbl-expand-col" style={{ display: expanded ? "table-row" : "none" }}>
          <td colSpan={7} style={{ padding: 0 }}>
            <div className={cls("tbl-dist-detail", expanded && "open")}>
              {DISTANCIAS.map(d => (
                <div key={d} className="tbl-dist-chip">
                  <div className="tbl-dist-chip-label">
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: DISTANCIA_COLORS[d], display: "inline-block", flexShrink: 0 }} />
                    <span style={{ color: DISTANCIA_COLORS[d] }}>{d}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
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
      </React.Fragment>
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
              onClick={() => setOrdenAlfaFijo(v => !v)}
              title={ordenAlfaFijo ? "Orden manual (arrastrar)" : "Ordenar A-Z"}>
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
                <th className="text-right">Total (€)</th>
                {DISTANCIAS.map(d => (
                  <th key={d} className="text-right tbl-dist-col">
                    <span className="dist-dot" style={{ background: DISTANCIA_COLORS[d] }} /> {DISTANCIA_LABELS[d]}
                  </th>
                ))}
                <th className="tbl-expand-col" style={{ width: 60 }}></th>
                <th></th>
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
          <div className="card-title variable">🔄 Costes Variables — por corredor inscrito</div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className={`btn btn-sm ${ordenAlfaVar ? "btn-green" : "btn-ghost"}`}
              onClick={() => setOrdenAlfaVar(v => !v)}
              title={ordenAlfaVar ? "Orden manual (arrastrar)" : "Ordenar A-Z"}>
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
                  <th key={d} className="text-right tbl-dist-col">
                    <span className="dist-dot" style={{ background: DISTANCIA_COLORS[d] }} /> €/cte {DISTANCIA_LABELS[d]}
                  </th>
                ))}
                <th className="text-right tbl-dist-col">Total (€)</th>
                <th className="tbl-expand-col" style={{ width: 60 }}></th>
                <th></th>
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
