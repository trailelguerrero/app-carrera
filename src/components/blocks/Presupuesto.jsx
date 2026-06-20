import React, { useState, useEffect, useCallback, useMemo } from "react";
import ConfirmModal from "@/components/common/ConfirmModal";
import { blockCls as cls } from "@/lib/blockStyles";
import SkeletonBlock from "@/components/common/SkeletonBlock";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { SK_EVENT_CONFIG as LS_KEY_CONFIG } from "@/constants/storageKeys"; // FIX-DEP: migrado desde alias deprecated
import { useData } from "@/hooks/useData";
import { SK_LOG_PEDIDOS_PROV } from "@/constants/storageKeys";
import { calcCostesRealesDesdePedidos, fmt } from "@/lib/budgetUtils";
import { useBudgetLogic } from "../../hooks/useBudgetLogic";
import { useScenario }    from "../../hooks/useScenario";
import { KpiGlobal }      from "../budget/KpiGlobal";
import { ScenarioBar }    from "../budget/ScenarioBar";
import { TabPresupuesto } from "../budget/TabPresupuesto";
import { TabIngresos }    from "../budget/TabIngresos";
import { TabInscripciones } from "../budget/TabInscripciones";
import { TabResumen }     from "../budget/TabResumen";
import { TabEquilibrio }  from "../budget/TabEquilibrio";
import { TabHistorial }   from "../budget/TabHistorial";
import { TabCostesReales } from "../budget/TabCostesReales";
import { DISTANCIAS }       from "@/constants/budgetConstants";

const FLOW_STEPS = [
  { id: "inscripciones",n: 1, icon: "🏃", label: "Inscripciones" },
  { id: "presupuesto",  n: 2, icon: "💰", label: "Costes"    },
  { id: "ingresos",     n: 3, icon: "🟣", label: "Ingresos"  },
  { id: "resumen",      n: 4, icon: "📉", label: "P&L"       },
  { id: "equilibrio",   n: 5, icon: "⚖️", label: "Equilibrio"},
];

const TABS = [
  { id: "inscripciones", label: "Inscripciones", short: "Inscripciones", icon: "🏃" },
  { id: "presupuesto", label: "Costes del Evento", short: "Costes", icon: "💰" },
  { id: "ingresos",    label: "Otros Ingresos",        short: "Otros ingresos", icon: "🟣" },
  { id: "resumen",     label: "Resumen P&L", short: "P&L Resumen", icon: "📉" },
  { id: "equilibrio",  label: "Puntos de Equilibrio", short: "Equilibrio", icon: "⚖️" },
  { id: "costesreales", label: "Costes Reales", short: "Real vs Est.", icon: "💸" },
  { id: "historial",   label: "Historial", short: "Historial", icon: "🕐" },
];

const Presupuesto = () => {
  const [eventCfg, , isLoading] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [rawPedidosProv] = useData(SK_LOG_PEDIDOS_PROV, []);
  const [confirmReset, setConfirmReset] = useState(false);
  const [limpiarHistorial, setLimpiarHistorial] = useState(false);
  const [resettingData, setResettingData] = useState(false);
  // FIX-RESET-2: el usuario debe escribir "RESTABLECER" para confirmar — previene resets accidentales
  const [confirmResetText, setConfirmResetText] = useState('');
  const [delConceptoId, setDelConceptoId] = useState(null); // T5.2

  const [scenarioOverrides, setScenarioOverrides] = useState({
    scenarioInscritos: null,
    scenarioConceptos: null,
    scenarioIngresosExtra: null,
    scenarioMerchandising: null,
  });

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
    backupBeforeReset,
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
    inscritosConPago,
    precioMedioPago,
    costesFijos,
    costesVariables,
    costesVarPorCorredor,
    costesFijoPorCorredor,
    merchTotales,
    totalIngresosExtra,
    totalIngresosConMerch,
    resultado,
    puntoEquilibrio,
    peGlobal,
    totalPatConfirmado,
    totalPatCobrado,
    totalSubvencionPublica,
    camisetasPresupuesto,
    camSyncConfig, setCamSyncConfig,
    totalIngresosCamisetas,
    totalGastosCamisetas,
    syncConfig, setSyncConfig,
    margenConfig, setMargenConfig,
    ingresosDesglosados,
    realTotalInscritos,
    realResultado,
  } = useBudgetLogic(scenarioOverrides);

  const {
    savedScenarios,
    activeScenario,
    isScenarioMode,
    scenarioInscritos,
    scenarioConceptos,
    scenarioIngresosExtra,
    scenarioMerchandising,
    createScenario,
    loadScenario,
    exitScenario: _exitScenario,
    saveScenario,
    duplicateScenario,
    deleteScenario,
    renameScenario,
    updateScenarioInscritos,
    toggleScenarioConcepto,
    overrideScenarioConcepto,
    overrideScenarioConceptoCosteDist,
    setScenarioIngresosExtra,
    setScenarioMerchandising,
  } = useScenario(inscritos, conceptos, ingresosExtra, merchandising);

  useEffect(() => {
    setScenarioOverrides({ 
      scenarioInscritos, 
      scenarioConceptos,
      scenarioIngresosExtra,
      scenarioMerchandising,
    });
  }, [scenarioInscritos, scenarioConceptos, scenarioIngresosExtra, scenarioMerchandising]);

  const exitScenario = useCallback(() => {
    _exitScenario();
    setScenarioOverrides({ scenarioInscritos: null, scenarioConceptos: null, scenarioIngresosExtra: null, scenarioMerchandising: null });
  }, [_exitScenario]);

  const handleUpdateConcepto = useCallback((id, field, value) => {
    if (isScenarioMode) {
      if (field === "activo") toggleScenarioConcepto(id);
      else overrideScenarioConcepto(id, field, value);
    } else {
      updateConcepto(id, field, value);
    }
  }, [isScenarioMode, toggleScenarioConcepto, overrideScenarioConcepto, updateConcepto]);

  const handleUpdateCostePorDistancia = useCallback((id, dist, value) => {
    if (isScenarioMode) {
      overrideScenarioConceptoCosteDist(id, dist, value);
    } else {
      updateCostePorDistancia(id, dist, value);
    }
  }, [isScenarioMode, overrideScenarioConceptoCosteDist, updateCostePorDistancia]);

  const handleUpdateActivoDistancia = useCallback((id, dist, value) => {
    if (isScenarioMode) {
      const curr = (scenarioConceptos || conceptos).find(c => c.id === id);
      if (!curr) return;
      const newActivos = { ...curr.activoDistancias, [dist]: value };
      overrideScenarioConcepto(id, "activoDistancias", newActivos);
    } else {
      updateActivoDistancia(id, dist, value);
    }
  }, [isScenarioMode, scenarioConceptos, conceptos, overrideScenarioConcepto, updateActivoDistancia]);

  const resPositivo = (resultado?.total ?? 0) >= 0;

  // perf: memoizar el cálculo de completitud de conceptos — se usa en el header
  const conceptosCompletitud = useMemo(() => {
    const conceptosActivos = conceptos.filter(c => c.activo !== false);
    const tieneCoste = (c) => c.tipo === 'fijo'
      ? c.costeTotal > 0
      : Object.values(c.costePorDistancia || {}).some(v => v > 0);
    const conReal = conceptosActivos.filter(tieneCoste).length;
    return { conReal, total: conceptosActivos.length, isComplete: conReal === conceptosActivos.length };
  }, [conceptos]);

  const saveCls   = saveStatus === "saving" ? "btn btn-amber"
                  : saveStatus === "saved"  ? "btn btn-green"
                  : saveStatus === "error"  ? "btn btn-red"
                  : "btn btn-green";
  const saveLabel = saveStatus === "saving" ? "⏳ Guardando…"
                  : saveStatus === "saved"  ? "✓ Guardado"
                  : saveStatus === "error"  ? "✗ Error"
                  : "Guardar";

  // BUG-P6 fix: eliminado argumento innecesario `true`
  // INC-P3 fix: persiste el estado tras el reset para evitar reversión si el autosave tarda
  // C2: async con spinner + borrado opcional de historial [F3-02/03]
  const handleReset = async () => {
    setResettingData(true);
    // FIX-RESET-1: Guardar backup en Neon ANTES de resetear.
    // Si el reset fue accidental, los datos se pueden recuperar de teg_auto_backup_presupuesto_v1.
    await backupBeforeReset(tramos, conceptos, inscritos, ingresosExtra, merchandising, maximos);
    resetAllData();
    // Eliminar escenarios guardados — sus datos base ya no existen tras el reset
    deleteScenario && savedScenarios?.forEach(sc => deleteScenario(sc.id));
    // Persistir inmediatamente sin esperar al autosave
    await new Promise(resolve => setTimeout(resolve, 50));
    await saveData();
    if (limpiarHistorial) {
      try { await fetch('/api/budget-log', { method: 'DELETE' }); } catch { /* ignore */ }
    }
    setResettingData(false);
    setConfirmReset(false);
    setLimpiarHistorial(false);
    setConfirmResetText('');
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.subtab && TABS.some(t => t.id === e.detail.subtab)) {
        setTab(e.detail.subtab);
      }
    };
    window.addEventListener("teg-navigate", handler);
    return () => window.removeEventListener("teg-navigate", handler);
  }, [setTab]);

  if (isLoading) return <SkeletonBlock variant="presupuesto" />;

  return (
    <>
      <div className="block-container">

        <div className="block-header">
          <div>
            <h1 className="block-title">💰 Presupuesto</h1>
            <div className="block-title-sub">
              {config.nombre} {config.edicion} · Gestión económica
              {conceptos.length > 0 && (
                  <span style={{
                    marginLeft:".6rem", padding:".08rem .45rem",
                    borderRadius:10, fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    background: conceptosCompletitud.isComplete ? "var(--green-dim)" : "var(--amber-dim)",
                    color: conceptosCompletitud.isComplete ? "var(--green)" : "var(--amber)",
                    border: "1px solid",
                    borderColor: conceptosCompletitud.isComplete ? "rgba(52,211,153,.3)" : "rgba(251,191,36,.3)",
                  }}>
                    {`${conceptosCompletitud.conReal}/${conceptosCompletitud.total} conceptos con coste`}
                  </span>
              )}
            </div>
          </div>
          <div className="block-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const prev = document.title;
                document.title = isScenarioMode
                  ? `Presupuesto — ${activeScenario?.nombre ?? "Escenario"} — ${config.nombre} ${config.edicion}`
                  : `Presupuesto — Datos reales — ${config.nombre} ${config.edicion}`;
                window.print();
                document.title = prev;
              }}
              title="Imprimir o exportar como PDF"
            >🖨️ PDF</button>
            <button
              className="btn btn-ghost btn-sm"
              title="Restablecer todos los datos"
              onClick={() => { const m = document.querySelector("main"); if (m) m.scrollTo({ top:0, behavior:"instant" }); setConfirmResetText(''); setConfirmReset(true); }}
              style={{ color: "var(--text-dim)", fontSize: "var(--fs-xs)" }}
            >↺</button>
            <button className={saveCls} onClick={saveData} disabled={saveStatus === "saving"}>
              {saveLabel}
            </button>
            {saveStatus === "error" && (
              <span style={{
                fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                color:"var(--red)", padding:".3rem .6rem",
                background:"rgba(248,113,113,.1)", borderRadius:20,
                border:"1px solid rgba(248,113,113,.25)",
                animation:"fadeIn .2s ease",
              }}>
                Sin conexión — revisa tu red
              </span>
            )}
          </div>
        </div>

        {(isScenarioMode || savedScenarios.length > 0) ? (
          <ScenarioBar
            isScenarioMode={isScenarioMode}
            activeScenario={activeScenario}
            savedScenarios={savedScenarios}
            realResultado={realResultado}
            realTotalInscritos={realTotalInscritos}
            scenarioResultado={resultado}
            scenarioTotalInscritos={totalInscritos}
            realConceptos={conceptos}
            realInscritos={inscritos}
            realIngresosExtra={ingresosExtra}
            realTramos={tramos}
            onCreateScenario={createScenario}
            onLoadScenario={loadScenario}
            onSaveScenario={saveScenario}
            onExitScenario={exitScenario}
            onDuplicateScenario={duplicateScenario}
            onDeleteScenario={deleteScenario}
            onRenameScenario={renameScenario}
          />
        ) : (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            marginBottom: ".65rem",
          }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => createScenario()}
              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                color: "var(--text-dim)", opacity:.6, gap: ".3rem" }}
            >
              + Crear escenario hipotético
            </button>
          </div>
        )}

        {tab !== "equilibrio" && tab !== "historial" && (
          <div style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "var(--bg)",
            paddingBottom: ".4rem",
          }}>
            <KpiGlobal
              totalInscritos={totalInscritos}
              ingresosPorDistancia={ingresosPorDistancia}
              costesFijos={costesFijos}
              costesVariables={costesVariables}
              totalIngresosExtra={totalIngresosExtra}
              merchTotales={merchTotales}
              totalIngresosConMerch={totalIngresosConMerch}
              totalIngresosCamisetas={totalIngresosCamisetas}
              totalGastosCamisetas={totalGastosCamisetas}
              resultado={resultado}
              maximos={maximos}
              margenConfig={margenConfig}
            />
          </div>
        )}

        {/* ── Insight Punto de Equilibrio ── */}
        {(() => {
          const dif = peGlobal?.diferencia ?? null;
          if (dif === null) return null;
          const superado  = dif >= 0;
          const abs = Math.abs(Math.round(dif));
          return (
            <div style={{
              display:"flex", alignItems:"center", gap:".65rem",
              padding:".55rem .9rem", borderRadius:8, marginBottom:".75rem",
              background: superado ? "rgba(52,211,153,.07)" : "rgba(248,113,113,.07)",
              border: superado ? "1px solid rgba(52,211,153,.25)" : "1px solid rgba(248,113,113,.25)",
            }}>
              <span style={{ fontSize:"var(--fs-md)", flexShrink:0 }}>
                {superado ? "✅" : "⚠️"}
              </span>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", flex:1 }}>
                {superado ? (
                  <span style={{ color:"var(--green)", fontWeight:700 }}>
                    Punto de equilibrio superado · {abs} inscripciones por encima del PE
                  </span>
                ) : (
                  <span style={{ color:"var(--red)", fontWeight:700 }}>
                    Faltan {abs} inscripciones para cubrir los costes fijos
                    <span style={{ fontWeight:400, color:"var(--text-muted)", marginLeft:".3rem" }}>
                      · PE global: {Math.round(peGlobal?.peGlobal ?? 0)} inscritos
                    </span>
                  </span>
                )}
              </div>
              <button className="btn btn-ghost btn-sm"
                style={{ fontSize:"var(--fs-2xs)", flexShrink:0 }}
                onClick={() => setTab("equilibrio")}>
                Ver PE →
              </button>
            </div>
          );
        })()}

        {/* ── Insight Desviación Costes Reales ── */}
        {(() => {
          const pedidos   = Array.isArray(rawPedidosProv) ? rawPedidosProv : [];
          const conceptosParaCalc = Array.isArray(conceptos) ? conceptos : [];
          const { totales } = calcCostesRealesDesdePedidos(pedidos, conceptosParaCalc);
          if (totales.costeReal === 0) return null;
          const sobre = totales.desviacion > 0;
          const ahorro = totales.desviacion < 0;
          return (
            <div style={{
              display:"flex", alignItems:"center", gap:".65rem",
              padding:".55rem .9rem", borderRadius:8, marginBottom:".75rem",
              background: sobre ? "rgba(248,113,113,.07)" : "rgba(52,211,153,.07)",
              border: sobre ? "1px solid rgba(248,113,113,.25)" : "1px solid rgba(52,211,153,.25)",
            }}>
              <span style={{ fontSize:"var(--fs-md)", flexShrink:0 }}>
                {sobre ? "📈" : "📉"}
              </span>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", flex:1 }}>
                {sobre ? (
                  <span style={{ color:"var(--red)", fontWeight:700 }}>
                    Sobrecosto real: +{fmt(totales.desviacion)} ({totales.pct !== null ? `+${totales.pct}%` : ""} sobre estimado)
                  </span>
                ) : ahorro ? (
                  <span style={{ color:"var(--green)", fontWeight:700 }}>
                    Ahorro real: {fmt(Math.abs(totales.desviacion))} ({totales.pct !== null ? `${totales.pct}%` : ""} bajo estimado)
                  </span>
                ) : (
                  <span style={{ color:"var(--green)", fontWeight:700 }}>
                    Costes reales = estimado · Sin desviación
                  </span>
                )}
                <span style={{ fontWeight:400, color:"var(--text-muted)", marginLeft:".4rem" }}>
                  · Real: {fmt(totales.costeReal)} · Est: {fmt(totales.costeEstimado)}
                </span>
              </div>
              <button className="btn btn-ghost btn-sm"
                style={{ fontSize:"var(--fs-2xs)", flexShrink:0 }}
                onClick={() => setTab("costesreales")}>
                Ver detalle →
              </button>
            </div>
          );
        })()}

        <div className="tabs">
          {TABS.map(t => {
            const isDone = (() => {
              if (t.id === "historial") return false;
              if (t.id === tab) return false;
              if (t.id === "inscripciones" && (totalInscritos?.total ?? 0) > 0) return true;
              if (t.id === "presupuesto"   && conceptos.length > 0)            return true;
              if (t.id === "ingresos"      && ingresosExtra.length > 0)        return true;
              return false;
            })();
            return (
              <button key={t.id}
                className={cls("tab-btn", tab === t.id && "active")}
                onClick={() => setTab(t.id)}
                style={{ position: "relative" }}>
                {isDone && (
                  <span style={{
                    position: "absolute", top: 3, right: 3,
                    width: 7, height: 7, borderRadius: "50%",
                    background: "var(--green)",
                    boxShadow: "0 0 4px var(--green)",
                  }} />
                )}
                {t.icon}{" "}
                <span className="tab-label-full">{t.label}</span>
                <span className="tab-label-short">{t.short}</span>
              </button>
            );
          })}
        </div>

        <div key={tab}>
          {tab === "presupuesto" && (
            <TabPresupuesto
              conceptos={isScenarioMode ? (scenarioConceptos ?? conceptos) : conceptos}
              totalInscritos={totalInscritos}
              costesFijos={costesFijos}
              costesVariables={costesVariables}
              totalIngresosExtra={totalIngresosExtra}
              updateConcepto={handleUpdateConcepto}
              updateCostePorDistancia={handleUpdateCostePorDistancia}
              updateActivoDistancia={handleUpdateActivoDistancia}
              addConcepto={addConcepto}
              removeConcepto={(id) => setDelConceptoId(id)}
              isScenarioMode={isScenarioMode}
              reorderConceptos={isScenarioMode ? () => {} : reorderConceptos}
              camisetasPresupuesto={camisetasPresupuesto}
              camSyncConfig={camSyncConfig}
              setCamSyncConfig={setCamSyncConfig}
              totalIngresosCamisetas={totalIngresosCamisetas}
              totalGastosCamisetas={totalGastosCamisetas}
            />
          )}
          {tab === "ingresos" && (
            <TabIngresos
              ingresosExtra={isScenarioMode ? (scenarioIngresosExtra ?? ingresosExtra) : ingresosExtra}
              setIngresosExtra={isScenarioMode ? setScenarioIngresosExtra : setIngresosExtra}
              totalIngresosExtra={totalIngresosExtra}
              merchandising={isScenarioMode ? (scenarioMerchandising ?? merchandising) : merchandising}
              setMerchandising={isScenarioMode ? setScenarioMerchandising : setMerchandising}
              merchTotales={merchTotales}
              totalIngresosConMerch={totalIngresosConMerch}
              ingresosPorDistancia={ingresosPorDistancia}
              totalPatConfirmado={totalPatConfirmado}
              totalPatCobrado={totalPatCobrado}
              totalSubvencionPublica={totalSubvencionPublica}
              syncConfig={syncConfig}
              setSyncConfig={setSyncConfig}
              camisetasPresupuesto={camisetasPresupuesto}
              camSyncConfig={camSyncConfig}
              setCamSyncConfig={setCamSyncConfig}
              totalIngresosCamisetas={totalIngresosCamisetas}
              totalGastosCamisetas={totalGastosCamisetas}
            />
          )}
          {isScenarioMode && (tab === "inscripciones" || tab === "presupuesto" || tab === "ingresos") && (
            <div style={{
              display:"flex", alignItems:"center", gap:".6rem",
              padding:".5rem .85rem", marginBottom:".65rem",
              borderRadius:6, background:"rgba(251,191,36,.1)",
              border:"1px solid rgba(251,191,36,.3)",
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
            }}>
              <span style={{fontSize:"var(--fs-md)"}}>🔬</span>
              <span style={{color:"var(--amber)",fontWeight:700}}>
                Modo Escenario: «{activeScenario?.nombre || "Sin nombre"}»
              </span>
              <span style={{color:"var(--text-muted)"}}>— Los cambios NO afectan a datos reales</span>
            </div>
          )}

          {tab === "inscripciones" && (
            <TabInscripciones
              tramos={tramos}
              setTramos={setTramos}
              updateTramoPrecio={updateTramoPrecio}
              addTramo={addTramo}
              inscritos={isScenarioMode ? (scenarioInscritos ?? inscritos) : inscritos}
              setInscritos={setInscritos}
              updateInscritos={isScenarioMode ? updateScenarioInscritos : updateInscritos}
              totalInscritos={totalInscritos}
              ingresosPorDistancia={ingresosPorDistancia}
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
              totalIngresosExtra={totalIngresosExtra}
              merchTotales={merchTotales}
              totalIngresosCamisetas={totalIngresosCamisetas}
              totalGastosCamisetas={totalGastosCamisetas}
              resultado={resultado}
              conceptos={isScenarioMode ? (scenarioConceptos ?? conceptos) : conceptos}
              precioMedioDistancia={precioMedioDistancia}
              costesVarPorCorredor={costesVarPorCorredor}
              costesFijoPorCorredor={costesFijoPorCorredor}
              ingresosDesglosados={ingresosDesglosados}
              margenConfig={margenConfig}
              inscritosConPago={inscritosConPago}
              precioMedioPago={precioMedioPago}
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
              peGlobal={peGlobal}
              maximos={maximos}
              margenConfig={margenConfig}
              inscritosConPago={inscritosConPago}
              precioMedioPago={precioMedioPago}
            />
          )}
          {tab === "historial" && <TabHistorial />}

          {tab === "costesreales" && (() => {
            const pedidos   = Array.isArray(rawPedidosProv) ? rawPedidosProv : [];
            const conceptosParaCalc = Array.isArray(conceptos) ? conceptos : [];
            const costesReales = calcCostesRealesDesdePedidos(pedidos, conceptosParaCalc);
            return (
              <TabCostesReales
                costesReales={costesReales}
                onNavigatePedidos={() => window.dispatchEvent(
                  new CustomEvent("teg-navigate", { detail: { block: "logistica", subtab: "pedidosprov" } })
                )}
              />
            );
          })()}
        </div>

      </div>

      {confirmReset && (
        <div className="reset-overlay" onClick={() => !resettingData && (setConfirmReset(false), setConfirmResetText(''))}>
          <div className="reset-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "var(--fs-xl)", marginBottom: "0.75rem" }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: "var(--fs-md)", marginBottom: "0.5rem", color: "var(--text)" }}>
              ¿Restablecer todos los datos?
            </div>
            <div className="mono" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1rem" }}>
              Se eliminarán todos los tramos, inscritos, conceptos de coste e ingresos.
              Esta acción <strong style={{ color: "var(--red)" }}>no se puede deshacer</strong>.
              Se guardará un backup automático antes de borrar.
            </div>
            {/* FIX-RESET-2: confirmación explícita escribiendo la palabra clave */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                Escribe <strong style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>RESTABLECER</strong> para confirmar:
              </div>
              <input
                type="text"
                value={confirmResetText}
                onChange={e => setConfirmResetText(e.target.value)}
                placeholder="RESTABLECER"
                disabled={resettingData}
                autoFocus
                style={{
                  width: "100%", padding: "0.4rem 0.6rem",
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 6, color: "var(--text)", boxSizing: "border-box",
                  borderColor: confirmResetText === "RESTABLECER" ? "var(--red)" : "var(--border)",
                }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: "1.25rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={limpiarHistorial}
                onChange={e => setLimpiarHistorial(e.target.checked)}
                disabled={resettingData}
              />
              Limpiar también el historial de cambios
            </label>
            {resettingData ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
                ⏳ Guardando backup y borrando datos...
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center" }}>
                <button className="btn btn-ghost" onClick={() => { setConfirmReset(false); setConfirmResetText(''); }}>
                  Cancelar
                </button>
                <button
                  className="btn btn-red"
                  onClick={handleReset}
                  disabled={confirmResetText !== "RESTABLECER"}
                  style={{ opacity: confirmResetText === "RESTABLECER" ? 1 : 0.4, cursor: confirmResetText === "RESTABLECER" ? "pointer" : "not-allowed" }}
                >
                  Sí, restablecer todo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!delConceptoId}
        title="Eliminar concepto"
        message={(() => {
          const c = conceptos.find(x => x.id === delConceptoId);
          return c ? `¿Eliminar "${c.nombre}"? Esta acción no se puede deshacer.` : undefined;
        })()}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => { removeConcepto(delConceptoId); setDelConceptoId(null); }}
        onCancel={() => setDelConceptoId(null)}
      />
    </>
  );
};

export default Presupuesto; 