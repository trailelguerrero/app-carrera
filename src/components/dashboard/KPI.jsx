/**
 * KPI.jsx — extraído de Dashboard.jsx (Tarea 3.4)
 * Tarjeta de indicador clave de rendimiento.
 */
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";

export function KPI({ icon, label, value, sub, color, colorClass, onClick, tooltip, progress }) {
  return (
    <div
      className={`kpi ${colorClass || ""}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", paddingBottom: progress !== undefined ? "0.85rem" : "1rem" }}
      title={onClick ? `Ir a ${label}` : undefined}
    >
      {/* Label uppercase con icono y tooltip */}
      <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ opacity: 0.7 }}>{icon}</span>
        <span>{label}</span>
        {tooltip && <Tooltip text={tooltip}><TooltipIcon size={10} /></Tooltip>}
      </div>

      {/* Valor principal — número ultra-bold Kinetik */}
      <div className="kpi-value" style={{ color }}>{value}</div>

      {/* Subtexto secundario */}
      <div className="kpi-sub">{sub}</div>

      {/* Progress bar siempre visible en la base si se pasa progress */}
      {progress !== undefined && (
        <div className="kpi-progress">
          <div
            className="kpi-progress-fill"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: color,
              boxShadow: `0 0 6px ${color}80`,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── MiniTimeline — arco temporal del evento ─────────────────────────────────
