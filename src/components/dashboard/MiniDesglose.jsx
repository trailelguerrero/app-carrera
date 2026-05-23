/**
 * MiniDesglose.jsx — extraído de Dashboard.jsx (Tarea 3.4)
 * Panel expandible con desglose financiero resumido.
 */
import { useState } from "react";
import { fmtEur } from "@/lib/utils";

export function MiniDesglose({ totalIngresos, totalIngresosExtra, camisetasDesglose, totalCostesFijos, totalCostesVars, resultado, roiGlobal, navigate }) {
  const [open, setOpen] = useState(false);
  const cam = camisetasDesglose || {};
  // BUG-DASH-04 fix: el resumen del header debe coincidir con el resultado.
  // resultado = totalIngresos + totalIngresosExtra + beneficioNeto(cam) - costesFijos - costesVar
  // Por tanto, los totales del header NO deben separar costes de camisetas del beneficio:
  // totalIng = inscripciones + extras (ya incluye beneficioNeto camisetas via totalIngresosExtra+merch)
  // totalCostes = fijos + var (costes de camisetas ya están descontados en beneficioNeto)
  // Calculamos como resultado + costes para garantizar que totalIng - totalCostes === resultado.
  const camCoste = cam.costeTotal || 0;
  const totalCostes = totalCostesFijos + totalCostesVars;
  const totalIng = resultado + totalCostes;
  const resColor = resultado >= 0 ? "var(--green)" : "var(--red)";

  return (
    <div className="card mb" style={{
      padding: 0, overflow: "hidden",
      borderLeft: `3px solid ${resColor}`,
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: ".65rem",
          padding: ".65rem 1rem", textAlign: "left",
        }}
      >
        <span style={{ fontSize: "var(--fs-base)" }}>💰</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".07em" }}>Desglose económico</span>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: 2 }}>
            Ingresos: <span style={{ color: "var(--green)" }}>{fmtEur(totalIngresos)}</span>
            {" · "}
            Costes: <span style={{ color: "var(--red)" }}>{fmtEur(totalCostes)}</span>
          </div>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 800, color: resColor, flexShrink: 0 }}>
          {resultado >= 0 ? "+" : ""}{fmtEur(resultado)}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", transition: "transform .2s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--border)", padding: ".65rem 1rem", display: "flex", flexDirection: "column", gap: ".4rem" }}>
          {[
            { label: "Inscripciones", val: totalIngresos, color: "#22d3ee", tipo: "+" },
            { label: "Patrocinios", val: totalIngresosExtra, color: "#34d399", tipo: "+" },
            cam.ingresosExterno > 0 && { label: `👕 Cam. corredor (${cam.unidCorredor || 0}u)`, val: cam.ingresosExterno, color: "#c084fc", tipo: "+" },
            cam.ingresosPedidos > 0 && { label: "📦 Cam. extra pedidos", val: cam.ingresosPedidos, color: "#a78bfa", tipo: "+" },
            camCoste > 0 && {
              label: `👕 Coste total cam. (${(cam.unidCorredor || 0) + (cam.unidVoluntario || 0) + (cam.unidNino || 0) + (cam.unidExtras || 0)}u)`,
              val: camCoste, color: "#f472b6", tipo: "-",
            },
            camCoste > 0 && cam.costeVoluntario > 0 && { label: `  ↳ Voluntarios (${cam.unidVoluntario || 0}u)`, val: cam.costeVoluntario, color: "#fb7185", tipo: "-" },
            camCoste > 0 && cam.costeNino > 0 && { label: `  ↳ Niños (${cam.unidNino || 0}u)`, val: cam.costeNino, color: "#fda4af", tipo: "-" },
            { label: "Costes fijos", val: totalCostesFijos, color: "#f87171", tipo: "-" },
            { label: "Costes var.", val: totalCostesVars, color: "#fb923c", tipo: "-" },
          ].filter(Boolean).map(item => {
            const max = Math.max(totalIngresos, totalCostes, 1);
            const pct = Math.min(Math.round(item.val / max * 100), 100);
            return (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".15rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>{item.tipo === "+" ? "↑" : "↓"} {item.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: item.color, fontWeight: 700 }}>{fmtEur(item.val)}</span>
                </div>
                <div style={{ height: 4, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: item.color, opacity: item.val <= 0 ? 0.2 : 0.8, borderRadius: 2, transition: "width .5s" }} />
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: ".3rem", paddingTop: ".45rem", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: ".4rem" }}>
              Margen
              <span className={`badge ${roiGlobal >= 0 ? "badge-green" : "badge-red"}`} style={{ fontSize: "var(--fs-2xs)" }}>{roiGlobal > 0 ? "+" : ""}{roiGlobal}%</span>
            </span>
            <button onClick={() => navigate("presupuesto")} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Ver en Presupuesto →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
