import React from "react";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";
import { useBudgetLogic } from "../../hooks/useBudgetLogic";
import { KpiGlobal }      from "../budget/KpiGlobal";
import { TabPresupuesto } from "../budget/TabPresupuesto";
import { TabIngresos }    from "../budget/TabIngresos";
import { TabTramos }      from "../budget/TabTramos";
import { TabInscritos }   from "../budget/TabInscritos";
import { TabResumen }     from "../budget/TabResumen";
import { TabEquilibrio }  from "../budget/TabEquilibrio";

// ─── CSS específico del bloque ─────────────────────────────────────────────
const BUDGET_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');

  .text-right { text-align: right; }
  .overflow-x { overflow-x: auto; }

  .total-row { background: var(--surface2); font-weight: 700; }
  .total-row td { border-top: 2px solid var(--border); padding: 0.75rem 0.6rem; }
  .ra td { background: rgba(248,113,113,0.04); }

  .card-title.fijo     { color: var(--cyan);   }
  .card-title.variable { color: var(--green);  }
  .card-title.ingresos { color: var(--violet); }
  .card-title.resumen  { color: var(--amber);  }
  .card-title.tramos   { color: var(--amber);  }

  .eq-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .eq-table th { text-align: left; padding: 0.75rem; border-bottom: 2px solid var(--border); color: var(--text-muted); font-weight: 600; white-space: nowrap; }
  .eq-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--border); }
  .resumen-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; }
  @media (max-width: 768px) { .resumen-grid { grid-template-columns: 1fr; } }

  .num-input { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 0.3rem 0.5rem; width: 80px; text-align: right; font-family: var(--font-mono); font-size: 0.85rem; outline: none; }
  .num-input:focus { border-color: var(--cyan); }
  .num-input-sm { font-size: 0.75rem; padding: 0.2rem 0.4rem; width: 65px; }
  .text-input { background: transparent; border: 1px solid transparent; color: var(--text); padding: 0.3rem; width: 100%; border-radius: 4px; font-family: var(--font-display); font-size: 0.85rem; outline: none; }
  .text-input:focus { background: var(--surface2); border-color: var(--border); }
  .date-input { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 0.25rem 0.45rem; font-size: 0.72rem; font-family: var(--font-mono); cursor: pointer; outline: none; }
  .date-input:focus { border-color: var(--cyan); }

  .dist-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
  .badge-fijo     { background: var(--cyan-dim);  color: var(--cyan);  border: 1px solid rgba(34,211,238,0.2); }
  .badge-variable { background: var(--green-dim); color: var(--green); border: 1px solid rgba(52,211,153,0.2); }

  .modo-toggle { padding: 0.2rem 0.5rem; border-radius: 5px; font-size: 0.7rem; font-weight: 700; cursor: pointer; border: 1px solid var(--border); background: var(--surface3); color: var(--text-muted); font-family: var(--font-mono); transition: all 0.15s; white-space: nowrap; }
  .modo-toggle.uniforme { background: var(--violet-dim); border-color: rgba(167,139,250,0.3); color: var(--violet); }

  .drag-over td:first-child { border-left: 3px solid var(--primary); }

  .mono { font-family: var(--font-mono); }
  .text-xs    { font-size: 0.72rem; }
  .text-muted { color: var(--text-muted); }
  .f6  { font-weight: 600; }
  .mb-2 { margin-bottom: 1rem; }

  /* Labels responsive en tabs */
  .tab-label-short { display: none; }
  @media (max-width: 640px) {
    .tab-label-full  { display: none; }
    .tab-label-short { display: inline; }
  }
`;

const TABS = [
  { id: "presupuesto", icon: "💰", label: "Costes",        short: "Costes"   },
  { id: "ingresos",    icon: "🟣", label: "Otros ingresos",short: "Ingresos" },
  { id: "tramos",      icon: "📅", label: "Tramos",        short: "Tramos"   },
  { id: "inscritos",   icon: "🏃", label: "Inscritos",     short: "Inscritos"},
  { id: "resumen",     icon: "📉", label: "P&L Resumen",   short: "P&L"      },
  { id: "equilibrio",  icon: "⚖️", label: "Equilibrio",    short: "Equil."   },
];

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
    puntoEquilibrio,
  } = useBudgetLogic();

  const resPositivo = (resultado?.total ?? 0) >= 0;

  const saveCls   = saveStatus === "saving" ? "btn btn-amber"
                  : saveStatus === "saved"  ? "btn btn-green"
                  : saveStatus === "error"  ? "btn btn-red"
                  : "btn btn-green";
  const saveLabel = saveStatus === "saving" ? "⏳ Guardando…"
                  : saveStatus === "saved"  ? "✓ Guardado"
                  : saveStatus === "error"  ? "✗ Error"
                  : "Guardar";

  return (
    <>
      <style>{BLOCK_CSS + BUDGET_CSS}</style>
      <div className="block-container">

        {/* ── HEADER ── */}
        <div className="block-header">
          <div>
            <h1 className="block-title">💰 Presupuesto</h1>
            <div className="block-title-sub">Trail El Guerrero 2026 · Gestión económica</div>
          </div>
          <div className="block-actions">
            <span className={`badge ${resPositivo ? "badge-green" : "badge-red"}`}>
              {resPositivo ? "▲" : "▼"} {Math.abs(resultado?.total ?? 0).toFixed(0)} €
            </span>
            <span className="badge badge-cyan">
              🏃 {totalInscritos?.total ?? 0} corredores
            </span>
            <button className="btn btn-ghost btn-sm" onClick={resetAllData}>
              Restablecer
            </button>
            <button className={saveCls} onClick={saveData} disabled={saveStatus === "saving"}>
              {saveLabel}
            </button>
          </div>
        </div>

        {/* ── KPIs GLOBALES ── */}
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

        {/* ── TABS ── */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id}
              className={cls("tab-btn", tab === t.id && "active")}
              onClick={() => setTab(t.id)}>
              {t.icon}{" "}
              <span className="tab-label-full">{t.label}</span>
              <span className="tab-label-short">{t.short}</span>
            </button>
          ))}
        </div>

        {/* ── CONTENIDO ── */}
        <div key={tab}>
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
    </>
  );
};

export default Presupuesto;
