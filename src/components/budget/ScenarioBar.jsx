import React, { useState } from "react";
import { DISTANCIAS, DISTANCIA_LABELS, DISTANCIA_COLORS } from "../../constants/budgetConstants";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";

const SCENARIO_CSS = `
  .sc-bar {
    margin-bottom: 1rem;
    border-radius: var(--r);
    border: 1px solid var(--border);
    overflow: hidden;
    transition: all 0.2s;
  }

  /* ── modo real ── */
  .sc-bar.real {
    background: var(--surface);
  }

  /* ── modo escenario ── */
  .sc-bar.active {
    background: linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(167,139,250,0.05) 100%);
    border-color: rgba(99,102,241,0.4);
    box-shadow: 0 0 0 1px rgba(99,102,241,0.15) inset,
                0 4px 24px rgba(99,102,241,0.08);
  }

  .sc-bar-main {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.9rem;
    flex-wrap: wrap;
  }

  .sc-mode-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.55rem;
    border-radius: 20px;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .sc-mode-pill.real {
    background: var(--surface3);
    color: var(--text-muted);
    border: 1px solid var(--border);
  }
  .sc-mode-pill.scenario {
    background: var(--primary-dim);
    color: #c4c6ff;
    border: 1px solid rgba(99,102,241,0.4);
    animation: sc-pulse 2.5s ease-in-out infinite;
  }
  @keyframes sc-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.3); }
    50%       { box-shadow: 0 0 0 4px rgba(99,102,241,0.0); }
  }

  .sc-name {
    font-family: var(--font-display);
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text);
    flex: 1;
    min-width: 0;
  }
  .sc-name input {
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    outline: none;
    width: 100%;
    padding: 0;
  }
  .sc-name input:focus {
    text-decoration: underline;
    text-decoration-color: rgba(99,102,241,0.5);
    text-decoration-style: dotted;
  }

  .sc-actions {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  /* ── deltas ── */
  .sc-deltas {
    display: flex;
    gap: 1rem;
    padding: 0.45rem 0.9rem 0.6rem;
    border-top: 1px solid rgba(99,102,241,0.15);
    flex-wrap: wrap;
  }
  .sc-delta-item {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
  }
  .sc-delta-label {
    font-family: var(--font-mono);
    font-size: 0.56rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .sc-delta-val {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 700;
  }
  .sc-delta-val.pos { color: var(--green); }
  .sc-delta-val.neg { color: var(--red); }
  .sc-delta-val.neu { color: var(--text-muted); }

  /* ── lista de escenarios guardados ── */
  .sc-list-overlay {
    position: fixed; inset: 0; z-index: 150;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    animation: fadeIn 0.15s ease;
  }
  .sc-list-modal {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: 16px;
    width: 100%; max-width: 520px;
    max-height: 85vh;
    display: flex; flex-direction: column;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    animation: slideUp 0.2s ease;
  }
  .sc-list-header {
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; background: var(--surface); z-index: 1;
    border-radius: 16px 16px 0 0;
  }
  .sc-list-body {
    overflow-y: auto;
    flex: 1;
    padding: 0.75rem;
  }
  .sc-list-item {
    display: flex; align-items: center; gap: 0.65rem;
    padding: 0.75rem 0.85rem;
    border-radius: var(--r-sm);
    border: 1px solid var(--border);
    background: var(--surface2);
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .sc-list-item:hover { border-color: var(--border-light); background: var(--surface3); }
  .sc-list-item.is-active { border-color: rgba(99,102,241,0.5); background: var(--primary-dim); }
  .sc-list-item-info { flex: 1; min-width: 0; }
  .sc-list-item-name { font-weight: 700; font-size: 0.85rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sc-list-item-meta { font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-muted); margin-top: 0.15rem; }
  .sc-list-actions { display: flex; gap: 0.3rem; flex-shrink: 0; }

  /* ── modal nuevo escenario ── */
  .sc-new-overlay {
    position: fixed; inset: 0; z-index: 160;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    animation: fadeIn 0.15s ease;
  }
  .sc-new-modal {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: 16px;
    padding: 1.5rem;
    width: 100%; max-width: 380px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    animation: slideUp 0.2s ease;
  }
`;

/**
 * ScenarioBar — Barra de control del sistema de escenarios.
 * Se renderiza entre el header y el KpiGlobal en Presupuesto.jsx.
 */
export const ScenarioBar = ({
  // Estado del escenario
  isScenarioMode,
  activeScenario,
  savedScenarios,

  // Resultados reales (para calcular deltas)
  realResultado,
  realTotalInscritos,

  // Resultados del escenario activo (calculados en Presupuesto.jsx)
  scenarioResultado,
  scenarioTotalInscritos,

  // Acciones
  onCreateScenario,
  onLoadScenario,
  onSaveScenario,
  onExitScenario,
  onDuplicateScenario,
  onDeleteScenario,
  onRenameScenario,

  // Datos reales para el diff
  realConceptos,
  realInscritos,
  realIngresosExtra,
  realTramos,
}) => {
  const [showList, setShowList] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingName, setEditingName] = useState(false);

  const computeDiffs = () => {
    if (!activeScenario) return [];
    const diffs = [];

    // Conceptos Excluidos
    if (activeScenario.conceptosExcluidos?.length > 0) {
      activeScenario.conceptosExcluidos.forEach(cid => {
        const c = realConceptos?.find(x => x.id === cid);
        if (c) diffs.push({ type: "coste", icon: "🗑️", ref: c.nombre, msg: "Concepto desactivado de forma temporal" });
      });
    }

    // Conceptos Modificados (Overrides)
    if (activeScenario.conceptosOverride) {
      Object.entries(activeScenario.conceptosOverride).forEach(([cid, over]) => {
        const c = realConceptos?.find(x => x.id === cid);
        if (c) {
          Object.keys(over).forEach(key => {
            if (JSON.stringify(over[key]) === JSON.stringify(c[key])) return;
            let varName = key;
            if (key === "costePorDistancia") varName = "Coste variable por distancia";
            if (key === "costeFijo") varName = "Coste fijo";
            diffs.push({ type: "coste", icon: "✏️", ref: c.nombre, msg: `Modificado: ${varName}` });
          });
        }
      });
    }

    // Inscritos
    if (activeScenario.inscritos?.tramos) {
      Object.entries(activeScenario.inscritos.tramos).forEach(([tId, dists]) => {
        const t = realTramos?.find(x => x.id === tId);
        const name = t ? t.nombre : "Tramo";
        Object.entries(dists).forEach(([d, val]) => {
          const realVal = realInscritos?.tramos?.[tId]?.[d] || 0;
          if (val !== realVal) {
             diffs.push({ type: "inscritos", icon: "🏃", ref: `${name} (${DISTANCIA_LABELS[d] || d})`, msg: `${realVal} → ${val} corredores` });
          }
        });
      });
    }

    // IngresosExtra
    if (activeScenario.ingresosExtra && realIngresosExtra) {
      activeScenario.ingresosExtra.forEach(ing => {
        const r = realIngresosExtra.find(x => x.id === ing.id);
        if (r && JSON.stringify(r) !== JSON.stringify(ing)) {
          let msg = "";
          if (r.importe !== ing.importe) msg += `Importe: ${fmt(r.importe)} → ${fmt(ing.importe)} `;
          if (r.concepto !== ing.concepto) msg += `Concepto: ${r.concepto} → ${ing.concepto} `;
          if (msg) {
            diffs.push({ type: "extra", icon: "💰", ref: `Ingreso Extra: ${r.concepto || 'Nuevo'}`, msg: msg.trim() });
          }
        }
      });
    }

    return diffs;
  };

  const handleCreate = () => {
    const name = newName.trim() || "Nuevo escenario";
    onCreateScenario(name);
    setNewName("");
    setShowNewModal(false);
  };

  // ── Deltas ────────────────────────────────────────────────────────────────
  const deltaRes =
    isScenarioMode
      ? (scenarioResultado?.total ?? 0) - (realResultado?.total ?? 0)
      : null;

  const deltaInscritos =
    isScenarioMode
      ? (scenarioTotalInscritos?.total ?? 0) - (realTotalInscritos?.total ?? 0)
      : null;

  const deltaSign = (v) => {
    if (v === null || v === undefined) return "neu";
    if (v > 0) return "pos";
    if (v < 0) return "neg";
    return "neu";
  };

  const fmtDelta = (v, unit = " €") => {
    if (v === null) return "—";
    const sign = v > 0 ? "+" : "";
    return `${sign}${Number(v).toLocaleString("es-ES", { maximumFractionDigits: 0 })}${unit}`;
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{SCENARIO_CSS}</style>

      <div className={`sc-bar ${isScenarioMode ? "active" : "real"}`}>
        <div className="sc-bar-main">
          {/* Pill de modo */}
          <div className={`sc-mode-pill ${isScenarioMode ? "scenario" : "real"}`}>
            {isScenarioMode ? (
              <>🔬 Escenario activo</>
            ) : (
              <>📊 Datos reales</>
            )}
          </div>

          {/* Nombre del escenario (editable en modo escenario) */}
          <div className="sc-name">
            {isScenarioMode ? (
              <input
                value={activeScenario?.nombre ?? ""}
                onChange={(e) => onRenameScenario(e.target.value)}
                onFocus={() => setEditingName(true)}
                onBlur={() => setEditingName(false)}
                aria-label="Nombre del escenario"
                placeholder="Nombre del escenario..."
              />
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 400 }}>
                Modifica inscritos o costes sin afectar los datos reales
              </span>
            )}
          </div>

          {/* Acciones */}
          <div className="sc-actions">
            {isScenarioMode ? (
              <>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowDiffModal(true)}
                  title="Ver qué he modificado"
                  style={{ color: "var(--amber)", fontWeight: 700 }}
                >
                  🔍 Cambios
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={onSaveScenario}
                  title="Guardar escenario"
                >
                  💾 Guardar
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowList(true)}
                  title="Ver escenarios guardados"
                >
                  📋 {savedScenarios.length > 0 ? savedScenarios.length : ""}
                </button>
                {/* Separador visual */}
                <span style={{
                  width: 1,
                  height: 24,
                  background: "var(--border-light)",
                  alignSelf: "center",
                  flexShrink: 0,
                }} />
                <button
                  className="btn btn-red btn-sm"
                  onClick={onExitScenario}
                  title="Salir del modo escenario y volver a ver los datos reales"
                  style={{ fontWeight: 700, letterSpacing: "0.02em" }}
                >
                  ⬅ Volver a datos reales
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowNewModal(true)}
                >
                  + Nuevo escenario
                </button>
                {savedScenarios.length > 0 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowList(true)}
                  >
                    📋 {savedScenarios.length} guardado{savedScenarios.length !== 1 ? "s" : ""}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Deltas (solo en modo escenario) ── */}
        {isScenarioMode && (
          <div className="sc-deltas">
            <div className="sc-delta-item">
              <div className="sc-delta-label">Δ Resultado neto</div>
              <div className={`sc-delta-val ${deltaSign(deltaRes)}`}>
                {fmtDelta(deltaRes)}
              </div>
            </div>
            <div className="sc-delta-item">
              <div className="sc-delta-label">Δ Inscritos</div>
              <div className={`sc-delta-val ${deltaSign(deltaInscritos)}`}>
                {fmtDelta(deltaInscritos, " corredores")}
              </div>
            </div>
            <div className="sc-delta-item">
              <div className="sc-delta-label">Resultado escenario</div>
              <div
                className={`sc-delta-val ${
                  (scenarioResultado?.total ?? 0) >= 0 ? "pos" : "neg"
                }`}
              >
                {(scenarioResultado?.total ?? 0) >= 0 ? "+" : ""}
                {fmt(scenarioResultado?.total)}
              </div>
            </div>
            <div className="sc-delta-item">
              <div className="sc-delta-label">Real actual</div>
              <div
                className={`sc-delta-val ${
                  (realResultado?.total ?? 0) >= 0 ? "pos" : "neg"
                }`}
              >
                {(realResultado?.total ?? 0) >= 0 ? "+" : ""}
                {fmt(realResultado?.total)}
              </div>
            </div>
            {DISTANCIAS.map((d) => {
              const delta =
                (scenarioTotalInscritos?.[d] ?? 0) -
                (realTotalInscritos?.[d] ?? 0);
              return (
                <div key={d} className="sc-delta-item">
                  <div className="sc-delta-label">
                    Δ {DISTANCIA_LABELS[d].split(" ")[0]}
                  </div>
                  <div
                    className={`sc-delta-val`}
                    style={{
                      color:
                        delta > 0
                          ? "var(--green)"
                          : delta < 0
                          ? "var(--red)"
                          : "var(--text-muted)",
                    }}
                  >
                    {fmtDelta(delta, "")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal: Nuevo escenario ── */}
      {showNewModal && (
        <div
          className="sc-new-overlay"
          onClick={() => { setShowNewModal(false); setNewName(""); }}
        >
          <div className="sc-new-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🔬</div>
            <div
              style={{
                fontWeight: 800,
                fontSize: "1rem",
                color: "var(--text)",
                marginBottom: "0.3rem",
              }}
            >
              Nuevo escenario
            </div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.68rem",
                color: "var(--text-muted)",
                lineHeight: 1.6,
                marginBottom: "1.25rem",
              }}
            >
              Podrás modificar inscritos y activar/desactivar conceptos de coste
              sin alterar los datos reales.
            </p>
            <input
              className="inp"
              placeholder="Ej: Escenario pesimista, Aforo completo…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
              style={{ marginBottom: "1rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                className="btn btn-ghost"
                onClick={() => { setShowNewModal(false); setNewName(""); }}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleCreate}>
                Crear escenario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Lista de escenarios guardados ── */}
      {showList && (
        <div
          className="sc-list-overlay"
          onClick={() => setShowList(false)}
        >
          <div className="sc-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sc-list-header">
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)" }}>
                  📋 Escenarios guardados
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    marginTop: "0.15rem",
                  }}
                >
                  {savedScenarios.length} escenario{savedScenarios.length !== 1 ? "s" : ""}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowList(false)}
              >
                ✕
              </button>
            </div>

            <div className="sc-list-body">
              {savedScenarios.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🔬</div>
                  <div>Aún no has guardado ningún escenario</div>
                  <div style={{ marginTop: "0.3rem", opacity: 0.7 }}>
                    Crea uno nuevo para empezar a simular
                  </div>
                </div>
              ) : (
                savedScenarios.map((sc) => (
                  <div
                    key={sc.id}
                    className={`sc-list-item ${
                      activeScenario?.id === sc.id ? "is-active" : ""
                    }`}
                    onClick={() => {
                      onLoadScenario(sc.id);
                      setShowList(false);
                    }}
                  >
                    <div style={{ fontSize: "1.2rem", flexShrink: 0 }}>🔬</div>
                    <div className="sc-list-item-info">
                      <div className="sc-list-item-name">{sc.nombre}</div>
                      <div className="sc-list-item-meta">
                        Creado {formatDate(sc.creadoEn)}
                        {sc.conceptosExcluidos?.length > 0 &&
                          ` · ${sc.conceptosExcluidos.length} concepto${
                            sc.conceptosExcluidos.length !== 1 ? "s" : ""
                          } excluido${sc.conceptosExcluidos.length !== 1 ? "s" : ""}`}
                      </div>
                    </div>
                    <div className="sc-list-actions">
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Duplicar escenario"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateScenario(sc.id);
                        }}
                      >
                        ⧉
                      </button>
                      <button
                        className="btn btn-red btn-sm btn-icon"
                        title="Eliminar escenario"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `¿Eliminar el escenario "${sc.nombre}"?`
                            )
                          ) {
                            onDeleteScenario(sc.id);
                          }
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                padding: "0.75rem 1rem",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setShowList(false);
                  setShowNewModal(true);
                }}
              >
                + Nuevo escenario
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowList(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ── Modal: Diferencias del Escenario ── */}
      {showDiffModal && (
        <div className="sc-list-overlay" onClick={() => setShowDiffModal(false)}>
          <div className="sc-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sc-list-header">
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)" }}>
                  🔍 Cambios vs Datos Reales
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                  ¿Qué has modificado en este escenario?
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDiffModal(false)}>✕</button>
            </div>
            <div className="sc-list-body" style={{ padding: "1rem" }}>
              {(() => {
                const diffs = computeDiffs();
                if (diffs.length === 0) {
                  return (
                    <div className="empty-state" style={{ minHeight: 150 }}>
                      <div className="empty-state-icon">🧘</div>
                      <div>No hay cambios</div>
                      <div style={{ marginTop: "0.3rem", opacity: 0.7 }}>Este escenario es idéntico a los datos reales actuales.</div>
                    </div>
                  );
                }
                return diffs.map((d, i) => (
                  <div key={i} style={{
                    display: "flex", gap: "0.75rem", padding: "0.75rem",
                    borderBottom: i < diffs.length - 1 ? "1px solid var(--border-light)" : "none",
                    alignItems: "center"
                  }}>
                    <div style={{ fontSize: "1.2rem", flexShrink: 0, opacity: 0.8 }}>{d.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)" }}>{d.ref}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>{d.msg}</div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
