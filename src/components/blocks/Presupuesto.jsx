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
        /* ── Design tokens ── */
        :root {
          --bg: #080c18;
          --surface: #0f1629;
          --surface2: #151e35;
          --surface3: #1a2540;
          --border: #1e2d50;
          --border-light: #2a3f6a;
          --text: #e8eef8;
          --text-muted: #5a6a8a;
          --text-dim: #3a4a6a;
          --cyan: #22d3ee; --cyan-dim: rgba(34,211,238,0.1);
          --violet: #a78bfa; --violet-dim: rgba(167,139,250,0.1);
          --green: #34d399; --green-dim: rgba(52,211,153,0.1);
          --amber: #fbbf24; --amber-dim: rgba(251,191,36,0.1);
          --red: #f87171; --red-dim: rgba(248,113,113,0.1);
          --orange: #fb923c; --orange-dim: rgba(251,146,60,0.1);
          --primary: #6366f1;
          --font-display: 'Syne', sans-serif;
          --font-mono: 'Space Mono', monospace;
        }

        /* ── Layout ── */
        .budget-container { padding: 1rem; max-width: 1400px; margin: 0 auto; color: var(--text); }
        .flex-between { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
        .flex { display: flex; }
        .mb-2 { margin-bottom: 1rem; }
        .mb-4 { margin-bottom: 2rem; }
        .overflow-x { overflow-x: auto; }

        /* ── Cards ── */
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .card-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .card-title.fijo { color: var(--cyan); }
        .card-title.variable { color: var(--green); }
        .card-title.ingresos { color: var(--violet); }
        .card-title.resumen { color: var(--amber); }

        /* ── Buttons ── */
        .btn { padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; font-size: 0.85rem; }
        .btn-amber { background: var(--amber); color: #080c18; }
        .btn-red { background: rgba(248,113,113,0.1); color: var(--red); border: 1px solid rgba(248,113,113,0.2); }
        .btn-red:hover { background: var(--red); color: white; }
        .btn-green { background: var(--green-dim); color: var(--green); border: 1px solid rgba(52,211,153,0.3); }
        .btn-green:hover { background: var(--green); color: #080c18; }
        .btn-cyan { background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(34,211,238,0.3); }
        .btn-cyan:hover { background: var(--cyan); color: #080c18; }

        /* ── Tabs ── */
        .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 0.5rem; }
        .tab-btn { padding: 0.6rem 1.25rem; border-radius: 10px; background: var(--surface2); color: var(--text-muted); border: 1px solid var(--border); cursor: pointer; white-space: nowrap; font-weight: 600; transition: all 0.2s; font-family: var(--font-display); }
        .tab-btn.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }

        /* ── Tables ── */
        .tbl { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .tbl th { text-align: left; padding: 0.75rem; border-bottom: 2px solid var(--border); color: var(--text-muted); font-weight: 600; white-space: nowrap; }
        .tbl td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .tbl tr:last-child td { border-bottom: none; }
        .text-right { text-align: right; }
        .mono { font-family: var(--font-mono); }
        .text-xs { font-size: 0.72rem; }
        .text-muted { color: var(--text-muted); }
        .total-row { background: var(--surface2); font-weight: 700; }
        .total-row td { border-top: 2px solid var(--border); padding: 0.75rem; }

        /* ── Equilibrio / Resumen tables ── */
        .eq-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .eq-table th { text-align: left; padding: 0.75rem; border-bottom: 2px solid var(--border); color: var(--text-muted); font-weight: 600; white-space: nowrap; }
        .eq-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--border); }
        .resumen-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        @media (max-width: 768px) { .resumen-grid { grid-template-columns: 1fr; } }

        /* ── KPIs ── */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .kpi { padding: 1.25rem; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); }
        .kpi-label { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .kpi-value { font-size: 1.6rem; font-weight: 800; margin: 0.25rem 0; font-family: var(--font-mono); }
        .kpi-sub { font-size: 0.68rem; color: var(--text-muted); }
        .kpi.green { border-left: 4px solid var(--green); }
        .kpi.red { border-left: 4px solid var(--red); }
        .kpi.amber { border-left: 4px solid var(--amber); }
        .kpi.cyan { border-left: 4px solid var(--cyan); }
        .kpi.violet { border-left: 4px solid var(--violet); }
        .kpi.orange { border-left: 4px solid var(--orange); }

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

        /* ── Inputs ── */
        .num-input { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 0.3rem 0.5rem; width: 80px; text-align: right; font-family: var(--font-mono); font-size: 0.85rem; }
        .num-input-sm { font-size: 0.75rem; padding: 0.2rem 0.4rem; width: 65px; }
        .num-input:focus { outline: none; border-color: var(--cyan); }
        .text-input { background: transparent; border: 1px solid transparent; color: var(--text); padding: 0.3rem; width: 100%; border-radius: 4px; font-family: var(--font-display); font-size: 0.85rem; }
        .text-input:focus { outline: none; background: var(--surface2); border-color: var(--border); }
        .date-input { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 0.25rem 0.45rem; font-size: 0.72rem; font-family: var(--font-mono); cursor: pointer; }
        .date-input:focus { outline: none; border-color: var(--cyan); }

        /* ── Card title variants ── */
        .card-title.tramos { color: var(--amber); }

        /* ── Dist dot & labels ── */
        .dist-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }

        /* ── Badges ── */
        .badge { padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; font-family: var(--font-mono); text-transform: uppercase; }
        .badge-fijo { background: var(--cyan-dim); color: var(--cyan); }
        .badge-variable { background: var(--green-dim); color: var(--green); }

        /* ── Modo toggle (uniforme/distinto) ── */
        .modo-toggle { padding: 0.2rem 0.5rem; border-radius: 5px; font-size: 0.7rem; font-weight: 700; cursor: pointer; border: 1px solid var(--border); background: var(--surface3); color: var(--text-muted); font-family: var(--font-mono); transition: all 0.15s; white-space: nowrap; }
        .modo-toggle.uniforme { background: var(--violet-dim); border-color: rgba(167,139,250,0.3); color: var(--violet); }
      `}</style>

      <div className="flex-between mb-4">
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>📊 Presupuesto TEG 2026</h1>
        <div className="flex" style={{ gap: "0.5rem" }}>
          <button className="btn" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} onClick={resetAllData}>Restablecer</button>
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
        <button className={cls("tab-btn", tab === "presupuesto" && "active")} onClick={() => setTab("presupuesto")}>💰 Presupuesto</button>
        <button className={cls("tab-btn", tab === "ingresos" && "active")} onClick={() => setTab("ingresos")}>🟣 Otros Ingresos</button>
        <button className={cls("tab-btn", tab === "tramos" && "active")} onClick={() => setTab("tramos")}>📅 Tramos y Precios</button>
        <button className={cls("tab-btn", tab === "inscritos" && "active")} onClick={() => setTab("inscritos")}>🏃 Inscritos</button>
        <button className={cls("tab-btn", tab === "resumen" && "active")} onClick={() => setTab("resumen")}>📉 P&L Resumen</button>
        <button className={cls("tab-btn", tab === "equilibrio" && "active")} onClick={() => setTab("equilibrio")}>⚖️ Equilibrio</button>
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
