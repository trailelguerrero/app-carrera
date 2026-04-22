import { useState, useCallback, useMemo } from "react";
import { useData } from "../lib/dataService";

const LS_KEY = "teg_scenarios_v1";
const LS_ACTIVE_SCENARIO = "teg_scenario_active_name";

/**
 * useScenario — Orquestador del sistema de escenarios de presupuesto.
 *
 * - Los escenarios guardados se persisten en Neon / localStorage via useData.
 * - El "draft" activo (edición en vuelo) vive solo en estado local de React;
 *   nunca toca los datos reales hasta que el usuario pulse "Guardar".
 * - Los datos reales (inscritos, conceptos) son inmutables desde la perspectiva
 *   del escenario: se pasan aquí como referencia, nunca se modifican.
 */
export const useScenario = (realInscritos, realConceptos, realIngresosExtra, realMerchandising) => {
  // ── Escenarios guardados (persistidos) ──────────────────────────────────
  const [savedScenarios, setSavedScenarios] = useData(LS_KEY, []);

  // ── Estado del escenario activo ─────────────────────────────────────────
  // null  → modo real (sin escenario activo)
  // { id, nombre, inscritos, conceptosExcluidos, conceptosOverride } → draft
  const [activeScenario, setActiveScenario] = useState(null);

  // ── Getters derivados ───────────────────────────────────────────────────
  const isScenarioMode = activeScenario !== null;

  /**
   * Aplica el override del escenario sobre los datos reales.
   * Devuelve { inscritos, conceptos } que se pasan a useBudgetLogic.
   */
  const scenarioInscritos = isScenarioMode
    ? (activeScenario.inscritos ?? realInscritos)
    : null;

  const scenarioConceptos = useMemo(() => {
    if (!isScenarioMode || !activeScenario) return null;
    return realConceptos.map((c) => ({
      ...c,
      ...(activeScenario.conceptosOverride?.[c.id] ?? {}),
      activo: !(activeScenario.conceptosExcluidos ?? []).includes(c.id),
    }));
  // Usar activeScenario completo — evita que optional chaining enmascare cambios
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScenarioMode, realConceptos, activeScenario]);

  const scenarioIngresosExtra = isScenarioMode
    ? (activeScenario.ingresosExtra ?? realIngresosExtra)
    : null;

  const scenarioMerchandising = isScenarioMode
    ? (activeScenario.merchandising ?? realMerchandising)
    : null;

  // ── Acciones sobre el draft activo ──────────────────────────────────────

  /** Crea un nuevo escenario a partir del estado real actual. */
  const createScenario = useCallback(
    (nombre = "Nuevo escenario", nota = "") => {
      setActiveScenario({
        id: null, // null = no guardado aún
        nombre,
        nota,
        inscritos: JSON.parse(JSON.stringify(realInscritos)), // deep clone
        conceptosExcluidos: realConceptos
          .filter((c) => !c.activo)
          .map((c) => c.id),
        conceptosOverride: {},
        ingresosExtra: JSON.parse(JSON.stringify(realIngresosExtra)),
        merchandising: JSON.parse(JSON.stringify(realMerchandising)),
        creadoEn: new Date().toISOString(),
      });
    },
    [realInscritos, realConceptos, realIngresosExtra, realMerchandising]
  );

  /** Carga un escenario guardado como draft activo. */
  const loadScenario = useCallback(
    (id) => {
      const sc = savedScenarios.find((s) => s.id === id);
      if (sc) {
        setActiveScenario(JSON.parse(JSON.stringify(sc)));
        try { localStorage.setItem(LS_ACTIVE_SCENARIO, sc.nombre || sc.id); } catch {}
      }
    },
    [savedScenarios]
  );

  /** Descarta el draft y vuelve a datos reales. */
  const exitScenario = useCallback(() => {
    setActiveScenario(null);
    try { localStorage.removeItem(LS_ACTIVE_SCENARIO); } catch {}
  }, []);

  /** Actualiza los inscritos del draft. */
  const updateScenarioInscritos = useCallback((tramoId, dist, value) => {
    setActiveScenario((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        inscritos: {
          ...prev.inscritos,
          tramos: {
            ...prev.inscritos.tramos,
            [tramoId]: {
              ...(prev.inscritos.tramos[tramoId] ?? {}),
              [dist]: value,
            },
          },
        },
      };
    });
  }, []);

  /** Activa o desactiva un concepto de coste dentro del draft. */
  const toggleScenarioConcepto = useCallback((conceptoId) => {
    setActiveScenario((prev) => {
      if (!prev) return prev;
      const excluded = prev.conceptosExcluidos ?? [];
      const isExcluded = excluded.includes(conceptoId);
      return {
        ...prev,
        conceptosExcluidos: isExcluded
          ? excluded.filter((id) => id !== conceptoId)
          : [...excluded, conceptoId],
      };
    });
  }, []);

  /** Sobreescribe un campo de un concepto en el draft (ej. costeTotal). */
  const overrideScenarioConcepto = useCallback((conceptoId, field, value) => {
    setActiveScenario((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        conceptosOverride: {
          ...prev.conceptosOverride,
          [conceptoId]: {
            ...(prev.conceptosOverride?.[conceptoId] ?? {}),
            [field]: value,
          },
        },
      };
    });
  }, []);

  /**
   * Sobreescribe el precio por distancia de un concepto variable.
   * Lee directamente del estado del draft (no del memo) para evitar valores stale.
   */
  const overrideScenarioConceptoCosteDist = useCallback((conceptoId, dist, value) => {
    setActiveScenario((prev) => {
      if (!prev) return prev;
      // Obtener el costePorDistancia actual: override existente o del concepto real
      const realConcepto = realConceptos.find(c => c.id === conceptoId);
      const currentOverride = prev.conceptosOverride?.[conceptoId] ?? {};
      const currentCostes = currentOverride.costePorDistancia
        ?? realConcepto?.costePorDistancia
        ?? {};
      const modoUniforme = currentOverride.modoUniforme ?? realConcepto?.modoUniforme ?? false;

      let newCostes = { ...currentCostes, [dist]: value };
      if (modoUniforme) {
        ["TG7", "TG13", "TG25"].forEach(d => { newCostes[d] = value; });
      }
      return {
        ...prev,
        conceptosOverride: {
          ...prev.conceptosOverride,
          [conceptoId]: {
            ...currentOverride,
            costePorDistancia: newCostes,
          },
        },
      };
    });
  }, [realConceptos]);

  /** Renombra el draft activo. */
  const renameScenario = useCallback((nombre) => {
    setActiveScenario((prev) => (prev ? { ...prev, nombre } : prev));
  }, []);

  const setScenarioIngresosExtra = useCallback((action) => {
    setActiveScenario((prev) => {
      if (!prev) return prev;
      const current = prev.ingresosExtra ?? realIngresosExtra;
      const next = typeof action === 'function' ? action(current) : action;
      return { ...prev, ingresosExtra: next };
    });
  }, [realIngresosExtra]);

  const setScenarioMerchandising = useCallback((action) => {
    setActiveScenario((prev) => {
      if (!prev) return prev;
      const current = prev.merchandising ?? realMerchandising;
      const next = typeof action === 'function' ? action(current) : action;
      return { ...prev, merchandising: next };
    });
  }, [realMerchandising]);

  // ── Persistencia ─────────────────────────────────────────────────────────

  /** Guarda el draft en la lista de escenarios persistidos. */
  const saveScenario = useCallback(() => {
    if (!activeScenario) return;

    setActiveScenario((prev) => {
      if (!prev) return prev;

      const id = prev.id ?? `sc_${Date.now()}`;
      const toSave = { ...prev, id };

      setSavedScenarios((scenarios) => {
        const existing = scenarios.findIndex((s) => s.id === id);
        if (existing >= 0) {
          const updated = [...scenarios];
          updated[existing] = toSave;
          return updated;
        }
        return [...scenarios, toSave];
      });

      return toSave; // actualiza el draft con el id generado
    });
  }, [activeScenario, setSavedScenarios]);

  /** Duplica un escenario guardado con un nombre nuevo. */
  const duplicateScenario = useCallback(
    (id) => {
      const sc = savedScenarios.find((s) => s.id === id);
      if (!sc) return;
      const clone = {
        ...JSON.parse(JSON.stringify(sc)),
        id: `sc_${Date.now()}`,
        nombre: `${sc.nombre} (copia)`,
        creadoEn: new Date().toISOString(),
      };
      setSavedScenarios((prev) => [...prev, clone]);
    },
    [savedScenarios, setSavedScenarios]
  );

  /** Elimina un escenario guardado. Si era el activo, sale del modo escenario. */
  const deleteScenario = useCallback(
    (id) => {
      setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
      setActiveScenario((prev) => (prev?.id === id ? null : prev));
    },
    [setSavedScenarios]
  );

  return {
    // Estado
    savedScenarios,
    activeScenario,
    isScenarioMode,

    // Overrides calculados (se pasan a useBudgetLogic)
    scenarioInscritos,
    scenarioConceptos,
    scenarioIngresosExtra,
    scenarioMerchandising,

    // Acciones
    createScenario,
    loadScenario,
    exitScenario,
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
  };
};
