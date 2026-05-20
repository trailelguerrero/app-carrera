// Auto-extracted from Voluntarios.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK, GUIA_TALLAS } from "@/constants/camisetasConstants";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/hooks/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { blockCls as cls } from "@/lib/blockStyles";

// ─── TAB TALLAS ───────────────────────────────────────────────────────────────
function TabTallas({ stats, voluntarios, puestos = [] }) {
  const total = Object.values(stats.tallasCount).reduce((s, v) => s + v, 0);
  const maxVal = Math.max(...Object.values(stats.tallasCount), 1);

  // Exportar CSV nombre + talla
  const exportCSV = () => {
    const activos = voluntarios.filter(v => v.estado !== "cancelado" && v.talla);
    const rows = [
      ["Nombre", "Apellidos", "Talla", "Confirmada", "Puesto", "Estado"],
      ...activos.map(v => {
        const nombrePuesto = v.puestoId
          ? (puestos.find(p => p.id === v.puestoId)?.nombre || `Puesto ${v.puestoId}`)
          : "Sin asignar";
        const confirmada = v.tallaConfirmadaEn
          ? new Date(v.tallaConfirmadaEn).toLocaleDateString("es-ES") : "—";
        return [
          `"${(v.nombre || "").replace(/"/g, '""')}"`,
          `"${(v.apellidos || "").replace(/"/g, '""')}"`,
          v.talla || "",
          confirmada,
          `"${nombrePuesto.replace(/"/g, '""')}"`,
          v.estado || "",
        ];
      })
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    // BOM UTF-8 (\uFEFF) para compatibilidad con Excel en Windows y macOS
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "tallas_voluntarios_TEG2026.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV de tallas exportado");
  };

  // Exportar resumen de tallas
  const exportResumenCSV = () => {
    const rows = [
      ["Talla", "Cantidad"],
      ...TALLAS.filter(t => stats.tallasCount[t] > 0)
               .map(t => [t, stats.tallasCount[t]])
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    // BOM UTF-8 para compatibilidad con Excel
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "resumen_tallas_TEG2026.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Resumen de tallas exportado");
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">👕 Tallas de Camiseta</div>
          <div className="page-desc">{total} camisetas necesarias (voluntarios activos)</div>
        </div>
        <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
          <button className="btn btn-ghost btn-sm" onClick={exportResumenCSV}
            title="Exportar resumen de tallas">
            📥 Resumen CSV
          </button>
          <button className="btn btn-cyan btn-sm" onClick={exportCSV}
            title="Exportar listado completo nombre + talla">
            📥 Lista CSV
          </button>
        </div>
      </div>

      {/* ── Banner de integración con Camisetas ── */}
      <div style={{ display:"flex", alignItems:"center", gap:".75rem", padding:".6rem .85rem",
        borderRadius:8, background:"rgba(34,211,238,.06)", border:"1px solid rgba(34,211,238,.15)",
        marginBottom:".85rem" }}>
        <span style={{ fontSize:"var(--fs-lg)", flexShrink:0 }}>👕</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700, color:"var(--cyan)" }}>
            Integración con Camisetas
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:".1rem" }}>
            Estos datos se sincronizan automáticamente con el bloque Camisetas como «Fuente Voluntarios».
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ flexShrink:0 }}
          onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail:{ block:"camisetas" } }))}>
          Ir a Camisetas →
        </button>
      </div>
      <div className="card">
        <div className="card-title">Distribución por talla</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {TALLAS.map(t => {
            const n = stats.tallasCount[t] || 0;
            const pct = Math.round((n / Math.max(total, 1)) * 100);
            const barPct = Math.round((n / maxVal) * 100);
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, width: 36, textAlign: "right", color: n > 0 ? "var(--cyan)" : "var(--text-dim)" }}>{t}</span>
                <div style={{ flex: 1 }}>
                  <div className="prog-bar" style={{ height: 8 }}>
                    <div className="prog-fill" style={{ width: `${barPct}%`, background: n > 0 ? "var(--cyan)" : "var(--surface3)" }} />
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", width: 40, textAlign: "right", color: n > 0 ? "var(--text)" : "var(--text-dim)" }}>{n}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", width: 35, color: "var(--text-muted)" }}>{n > 0 ? `${pct}%` : ""}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--surface2)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>TOTAL CAMISETAS</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--cyan)" }}>{total}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Listado para pedido</div>
        {(() => {
          const activos = voluntarios.filter(v => v.estado !== "cancelado" && v.talla);
          const confirmadas = activos.filter(v => v.tallaConfirmadaEn).length;
          const pctConf = activos.length > 0 ? Math.round(confirmadas / activos.length * 100) : 0;
          const col = pctConf >= 80 ? "var(--green)" : pctConf >= 50 ? "var(--amber)" : "var(--red)";
          return (
            <div style={{ display:"flex", alignItems:"center", gap:".75rem",
              padding:".5rem .75rem", borderRadius:6, marginBottom:".75rem",
              background: pctConf >= 80 ? "rgba(52,211,153,.06)" : "rgba(251,191,36,.06)",
              border: `1px solid ${pctConf >= 80 ? "rgba(52,211,153,.2)" : "rgba(251,191,36,.2)"}` }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color: col, fontWeight:700 }}>
                {pctConf >= 80 ? "✅" : "⚠️"} {confirmadas}/{activos.length} tallas confirmadas por los voluntarios ({pctConf}%)
              </span>
              {pctConf < 80 && (
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>
                  · Las restantes son las introducidas por el organizador o importadas
                </span>
              )}
            </div>
          );
        })()}
        <div className="tallas-grid">
          {TALLAS.filter(t => stats.tallasCount[t] > 0).map(t => (
            <div key={t} className="talla-cell">
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-lg)", fontWeight: 800, color: "var(--cyan)" }}>{stats.tallasCount[t]}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginTop: "0.15rem" }}>{t}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}


// Exports
export { TabTallas };
