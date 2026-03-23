import React from "react";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";

export const TabTramos = ({ tramos, setTramos, updateTramoPrecio, addTramo }) => {
  return (
    <>
      <div className="card">
        <div className="flex-between mb-2">
          <div className="card-title tramos">📅 Tramos de Inscripción y Precios</div>
          <button className="btn btn-amber" onClick={addTramo}>+ Nuevo Tramo</button>
        </div>
        <div className="tramos-grid">
          {tramos.map(t => (
            <div className="tramo-card" key={t.id}>
              <div className="tramo-header">
                <div>
                  <input
                    className="text-input"
                    value={t.nombre}
                    onChange={e => setTramos(prev => prev.map(x => x.id === t.id ? { ...x, nombre: e.target.value } : x))}
                    style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 4 }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span className="tramo-fecha">Hasta:</span>
                    <input
                      type="date"
                      className="date-input"
                      value={t.fechaFin}
                      onChange={e => setTramos(prev => prev.map(x => x.id === t.id ? { ...x, fechaFin: e.target.value } : x))}
                    />
                  </div>
                </div>
                <button
                  className="btn btn-red"
                  onClick={() => setTramos(prev => prev.filter(x => x.id !== t.id))}
                  style={{ alignSelf: "flex-start" }}
                >✕</button>
              </div>
              {DISTANCIAS.map(d => (
                <div className="tramo-row" key={d}>
                  <div className="tramo-dist">
                    <span className="dist-dot" style={{ background: DISTANCIA_COLORS[d] }} />
                    <span style={{ color: DISTANCIA_COLORS[d] }}>{DISTANCIA_LABELS[d]}</span>
                  </div>
                  <div className="tramo-inputs">
                    <span>€/cte:</span>
                    <NumInput value={t.precios[d]} onChange={v => updateTramoPrecio(t.id, d, v)} step={1} small />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title tramos mb-2">Comparativa de Precios por Tramo</div>
        <div className="overflow-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Tramo</th>
                <th>Fecha límite</th>
                {DISTANCIAS.map(d => (
                  <th key={d} className="text-right" style={{ color: DISTANCIA_COLORS[d] }}>
                    {DISTANCIA_LABELS[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tramos.map(t => (
                <tr key={t.id}>
                  <td className="mono" style={{ fontWeight: 600 }}>{t.nombre}</td>
                  <td className="mono text-xs text-muted">{t.fechaFin}</td>
                  {DISTANCIAS.map(d => (
                    <td key={d} className="text-right mono" style={{ color: DISTANCIA_COLORS[d] }}>
                      {t.precios[d]} €
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
