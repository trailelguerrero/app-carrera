/**
 * EmptyChart.jsx — extraído de Dashboard.jsx (Tarea 3.4)
 * Estado vacío para gráficas sin datos.
 */

export function EmptyChart({ mensaje, sub }) {
  return (
    <div className="dash-empty-chart">
      <div className="dash-empty-icon">📊</div>
      <div className="mono xs bold" style={{ color: "var(--text-muted)" }}>{mensaje}</div>
      {sub && <div className="mono" style={{ fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: "0.25rem", textAlign: "center", lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}
