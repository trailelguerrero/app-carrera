import React from "react";
import { useBudgetLogic } from "../../hooks/useBudgetLogic";
import { KpiGlobal } from "../budget/KpiGlobal";
import { TabPresupuesto } from "../budget/TabPresupuesto";
import { TabIngresos } from "../budget/TabIngresos";
import { TabTramos } from "../budget/TabTramos";
import { TabInscritos } from "../budget/TabInscritos";
import { TabResumen } from "../budget/TabResumen";
import { TabEquilibrio } from "../budget/TabEquilibrio";
import { cls } from "../../lib/budgetUtils";

const Presupuesto = () => {
  const {
    tab, setTab,
    tramos, setTramos,
    conceptos,
    inscritos, setInscritos,
    ingresosExtra, setIngresosExtra,
    merchandising, setMerchandising,
    maximos, setMaximos,
    saveStatus,
    saveData,
    resetAllData,
    updateConcepto,
    updateCostePorDistancia,
    updateActivoDistancia,
    addConcepto,
    removeConcepto,
    reorderConceptos,
    updateTramoPrecio,
    addTramo,
    updateInscritos,
    totalInscritos,
    ingresosPorDistancia,
    precioMedioDistancia,
    costesFijos,
    costesVariables,
    costesVarPorCorredor,
    costesFijoPorCorredor,
    merchTotales,
    totalIngresosExtra,
    totalIngresosConMerch,
    resultado,
    puntoEquilibrio
  } = useBudgetLogic();

  return (
    <div className="budget-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');

        /* ── Layout propio ── */
        .budget-container { padding: 1rem; max-width: 1400px; margin: 0 auto; color: var(--text); }
        .text-right { text-align: right; }
        .total-row { background: var(--surface2); font-weight: 700; }
        .total-row td { border-top: 2px solid var(--border); padding: 0.75rem; }
        .ra td { background: rgba(248,113,113,0.04); }

        /* ── Card title variantes de color (específicas de Presupuesto) ── */
        .card-title.fijo { color: var(--cyan); }
        .card-title.variable { color: var(--green); }
        .card-title.ingresos { color: var(--violet); }
        .card-title.resumen { color: var(--amber); }
        .card-title.tramos { color: var(--amber); }

        /* ── Equilibrio / Resumen tables ── */
        .eq-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .eq-table th { text-align: left; padding: 0.75rem; border-bottom: 2px solid var(--border); color: var(--text-muted); font-weight: 600; white-space: nowrap; }
        .eq-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--border); }
        .resumen-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        @media (max-width: 768px) { .resumen-grid { grid-template-columns: 1fr; } }

        /* ── Toggle switch ── */
        .toggle-btn { width: 34px; height: 18px; border-radius: 9px; background: var(--surface3); border: 1px solid var(--border); cursor: pointer; position: relative; transition: background 0.2s, border-color 0.2s; padding: 0; flex-shrink: 0; }
        .toggle-btn.active { background: var(--green-dim); border-color: rgba(52,211,153,0.5); }
        .toggle-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--text-muted); position: absolute; top: 2px; left: 2px; transition: transform 0.2s, background 0.2s; }
        .toggle-btn.active .toggle-thumb { transform: translateX(16px); background: var(--green); }

        /* ── Drag & drop ── */
        .drag-handle { color: var(--text-muted); opacity: 0.3; transition: opacity 0.2s; user-select: none; }
        tr:hover .drag-handle { opacity: 1; }
        .dragging { opacity: 0.4; }
        .drag-over td:first-child { border-left: 3px solid var(--primary); }

        /* ── Inputs propios ── */
        .num-input { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 0.3rem 0.5rem; width: 80px; text-align: right; font-family: var(--font-mono); font-size: 0.85rem; }
        .num-input-sm { font-size: 0.75rem; padding: 0.2rem 0.4rem; width: 65px; }
        .num-input:focus { outline: none; border-color: var(--cyan); }
        .text-input { background: transparent; border: 1px solid transparent; color: var(--text); padding: 0.3rem; width: 100%; border-radius: 4px; font-family: var(--font-display); font-size: 0.85rem; }
        .text-input:focus { outline: none; background: var(--surface2); border-color: var(--border); }
        .date-input { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 0.25rem 0.45rem; font-size: 0.72rem; font-family: var(--font-mono); cursor: pointer; }
        .date-input:focus { outline: none; border-color: var(--cyan); }

        /* ── Dist dot ── */
        .dist-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }

        /* ── Badges específicos ── */
        .badge-fijo { background: var(--cyan-dim); color: var(--cyan); }
        .badge-variable { background: var(--green-dim); color: var(--green); }

        /* ── Modo toggle (uniforme/distinto) ── */
        .modo-toggle { padding: 0.2rem 0.5rem; border-radius: 5px; font-size: 0.7rem; font-weight: 700; cursor: pointer; border: 1px solid var(--border); background: var(--surface3); color: var(--text-muted); font-family: var(--font-mono); transition: all 0.15s; white-space: nowrap; }
        .modo-toggle.uniforme { background: var(--violet-dim); border-color: rgba(167,139,250,0.3); color: var(--violet); }

        /* ── Tabs de Presupuesto (estilo diferente al sistema) ── */
        .budget-tab-btn { padding: 0.6rem 1.25rem; border-radius: 10px; background: var(--surface2); color: var(--text-muted); border: 1px solid var(--border); cursor: pointer; white-space: nowrap; font-weight: 600; transition: all 0.2s; font-family: var(--font-display); }
        .budget-tab-btn.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
      `}</style>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"1rem", marginBottom:"2rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>📊 Presupuesto TEG 2026</h1>
        <div style={{ display:"flex" }} style={{ gap: "0.5rem" }}>
          <button className="btn btn-ghost" onClick={resetAllData}>Restablecer</button>
          <button className={cls("btn", saveStatus === "saving" ? "btn-amber" : "btn-green")} onClick={saveData} disabled={saveStatus === "saving"}>
            {saveStatus === "saving" ? "Guardando..." : saveStatus === "saved" ? "✓ Guardado" : "Guardar Cambios"}
          </button>
        </div>
      </div>

      <KpiGlobal 
        totalInscritos={totalInscritos}
        ingresosPorDistancia={ingresosPorDistancia}
        costesFijos={costesFijos}
        costesVariables={costesVariables}
        totalIngresosExtra={totalIngresosExtra}
        merchTotales={merchTotales}
        totalIngresosConMerch={totalIngresosConMerch}
        resultado={resultado}
        maximos={maximos}
      />

      <div className="tabs">
        <button className={cls("budget-tab-btn", tab === "presupuesto" && "active")} onClick={() => setTab("presupuesto")}>💰 Presupuesto</button>
        <button className={cls("budget-tab-btn", tab === "ingresos" && "active")} onClick={() => setTab("ingresos")}>🟣 Otros Ingresos</button>
        <button className={cls("budget-tab-btn", tab === "tramos" && "active")} onClick={() => setTab("tramos")}>📅 Tramos y Precios</button>
        <button className={cls("budget-tab-btn", tab === "inscritos" && "active")} onClick={() => setTab("inscritos")}>🏃 Inscritos</button>
        <button className={cls("budget-tab-btn", tab === "resumen" && "active")} onClick={() => setTab("resumen")}>📉 P&L Resumen</button>
        <button className={cls("budget-tab-btn", tab === "equilibrio" && "active")} onClick={() => setTab("equilibrio")}>⚖️ Equilibrio</button>
      </div>

      <div className="tab-content">
        {tab === "presupuesto" && (
          <TabPresupuesto 
            conceptos={conceptos}
            totalInscritos={totalInscritos}
            costesFijos={costesFijos}
            costesVariables={costesVariables}
            totalIngresosExtra={totalIngresosExtra}
            updateConcepto={updateConcepto}
            updateCostePorDistancia={updateCostePorDistancia}
            updateActivoDistancia={updateActivoDistancia}
            addConcepto={addConcepto}
            removeConcepto={removeConcepto}
            reorderConceptos={reorderConceptos}
          />
        )}
        {tab === "ingresos" && (
          <TabIngresos 
            ingresosExtra={ingresosExtra}
            setIngresosExtra={setIngresosExtra}
            totalIngresosExtra={totalIngresosExtra}
            merchandising={merchandising}
            setMerchandising={setMerchandising}
            merchTotales={merchTotales}
            totalIngresosConMerch={totalIngresosConMerch}
            ingresosPorDistancia={ingresosPorDistancia}
          />
        )}
        {tab === "tramos" && (
          <TabTramos 
            tramos={tramos}
            setTramos={setTramos}
            updateTramoPrecio={updateTramoPrecio}
            addTramo={addTramo}
          />
        )}
        {tab === "inscritos" && (
          <TabInscritos 
            tramos={tramos}
            inscritos={inscritos}
            updateInscritos={updateInscritos}
            totalInscritos={totalInscritos}
            ingresosPorDistancia={ingresosPorDistancia}
            precioMedioDistancia={precioMedioDistancia}
            maximos={maximos}
            setMaximos={setMaximos}
          />
        )}
        {tab === "resumen" && (
          <TabResumen 
            totalInscritos={totalInscritos}
            ingresosPorDistancia={ingresosPorDistancia}
            costesFijos={costesFijos}
            costesVariables={costesVariables}
            totalIngresosConMerch={totalIngresosConMerch}
            resultado={resultado}
            conceptos={conceptos}
            precioMedioDistancia={precioMedioDistancia}
            costesVarPorCorredor={costesVarPorCorredor}
            costesFijoPorCorredor={costesFijoPorCorredor}
          />
        )}
        {tab === "equilibrio" && (
          <TabEquilibrio 
            totalInscritos={totalInscritos}
            precioMedioDistancia={precioMedioDistancia}
            costesVarPorCorredor={costesVarPorCorredor}
            costesFijos={costesFijos}
            totalIngresosConMerch={totalIngresosConMerch}
            puntoEquilibrio={puntoEquilibrio}
            resultado={resultado}
            ingresosPorDistancia={ingresosPorDistancia}
          />
        )}
      </div>
    </div>
  );
};

export default Presupuesto;
