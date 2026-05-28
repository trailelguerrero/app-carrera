/**
 * usePresupuestoPublic.js — Mejora 4: Contrato público del módulo Presupuesto
 *
 * Ventanilla oficial del módulo Presupuesto para consumidores externos
 * (Dashboard, DiaCarrera, SemaforoRiesgos, etc.).
 *
 * REGLA: Los consumidores externos SOLO leen datos a través de este hook.
 *        Nunca importan SK_PPTO_* directamente ni llaman a dataService con
 *        claves internas de presupuesto.
 *
 * @module usePresupuestoPublic
 */
import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import {
  SK_PPTO_CONCEPTOS,
  SK_PPTO_TRAMOS,
  SK_PPTO_INSCRITOS,
  SK_PPTO_INGRESOS_EXTRA,
  SK_PPTO_MAXIMOS,
  SK_PPTO_MERCHANDISING,
  SK_PPTO_SYNC_CONFIG,
  SK_PPTO_SCENARIO_ACTIVE,
} from "@/constants/storageKeys";
import {
  calculateTotalInscritos,
  calculateIngresosPorDistancia,
  calculateCostesFijos,
  calculateCostesVariables,
  calculateResultado,
} from "@/lib/budgetUtils";

/**
 * @typedef {object} PresupuestoPublic
 * @property {number}  totalInscritos       - Total de corredores inscritos
 * @property {{ TG7: number, TG13: number, TG25: number }} inscritosPorDist
 * @property {number}  totalIngresos        - Ingresos brutos por inscripción
 * @property {number}  totalCostesFijos     - Suma de costes fijos activos
 * @property {number}  totalCostesVars      - Suma de costes variables activos
 * @property {number}  totalIngresosExtra   - Ingresos extra activos (patrocinios, etc.)
 * @property {number}  resultado            - Resultado neto (ingresos - costes)
 * @property {{ TG7: number, TG13: number, TG25: number }} maximosPorDist
 * @property {{ TG7: number|null, TG13: number|null, TG25: number|null }} ocupacionPorDist
 * @property {number|null} ocupacionGlobal  - % ocupación global (null si sin máximos)
 * @property {object[]} tramos              - Lista de tramos (solo para semaforoRiesgos)
 * @property {object}   rawInscritos        - Mapa de inscritos por tramo (solo para semaforoRiesgos)
 * @property {object}   syncConfig          - Configuración de sincronización
 * @property {string|null} scenarioActivo   - Nombre del escenario activo
 * @property {boolean}  loaded              - true cuando todos los datos están disponibles
 */

/**
 * Hook público del módulo Presupuesto.
 * Devuelve los KPIs financieros calculados sin exponer las claves internas.
 *
 * @returns {PresupuestoPublic}
 */
export function usePresupuestoPublic() {
  const [conceptos]       = useData(SK_PPTO_CONCEPTOS, []);
  const [tramos]          = useData(SK_PPTO_TRAMOS, []);
  const [inscritos]       = useData(SK_PPTO_INSCRITOS, { tramos: {} });
  const [ingresosExtra]   = useData(SK_PPTO_INGRESOS_EXTRA, []);
  const [maximos]         = useData(SK_PPTO_MAXIMOS, {});
  const [syncConfig]      = useData(SK_PPTO_SYNC_CONFIG, { patrocinios: true, camisetas: true });
  const [scenarioActivo]  = useData(SK_PPTO_SCENARIO_ACTIVE, null);

  return useMemo(() => {
    const safeConceptos     = Array.isArray(conceptos)     ? conceptos     : [];
    const safeTramos        = Array.isArray(tramos)        ? tramos        : [];
    const safeIngresosExtra = Array.isArray(ingresosExtra) ? ingresosExtra : [];

    const inscritosBU   = calculateTotalInscritos(safeTramos, inscritos);
    const ingresosBU    = calculateIngresosPorDistancia(safeTramos, inscritos);
    const costesFijosBU = calculateCostesFijos(safeConceptos, inscritosBU);
    const costesVarsBU  = calculateCostesVariables(safeConceptos, inscritosBU);

    const totalInscritos  = inscritosBU.total;
    const totalIngresos   = ingresosBU.total;
    const totalCostesFijos = costesFijosBU.total;
    const totalCostesVars  = costesVarsBU.total;

    const totalIngresosExtra = safeIngresosExtra
      .filter(ie => ie.activo)
      .reduce((s, ie) => s + (ie.valor || 0), 0);

    const resultadoObj = calculateResultado(
      inscritosBU, ingresosBU, costesFijosBU, costesVarsBU, totalIngresosExtra
    );

    const safeMaximos = maximos || {};
    const maximosPorDist = {
      TG7:  safeMaximos.TG7  || 0,
      TG13: safeMaximos.TG13 || 0,
      TG25: safeMaximos.TG25 || 0,
    };
    const totalMaximos = maximosPorDist.TG7 + maximosPorDist.TG13 + maximosPorDist.TG25;

    const inscritosPorDist = {
      TG7:  inscritosBU.TG7  || 0,
      TG13: inscritosBU.TG13 || 0,
      TG25: inscritosBU.TG25 || 0,
    };

    const ocupacionPorDist = {
      TG7:  maximosPorDist.TG7  > 0 ? Math.round(inscritosPorDist.TG7  / maximosPorDist.TG7  * 100) : null,
      TG13: maximosPorDist.TG13 > 0 ? Math.round(inscritosPorDist.TG13 / maximosPorDist.TG13 * 100) : null,
      TG25: maximosPorDist.TG25 > 0 ? Math.round(inscritosPorDist.TG25 / maximosPorDist.TG25 * 100) : null,
    };
    const ocupacionGlobal = totalMaximos > 0
      ? Math.round(totalInscritos / totalMaximos * 100)
      : null;

    return {
      totalInscritos,
      inscritosPorDist,
      totalIngresos,
      totalCostesFijos,
      totalCostesVars,
      totalIngresosExtra,
      resultado: resultadoObj.total,
      maximosPorDist,
      ocupacionPorDist,
      ocupacionGlobal,
      // Expuesto para semaforoRiesgos y Dashboard (lectura, no modificación)
      tramos: safeTramos,
      rawInscritos: inscritos,
      syncConfig: syncConfig || { patrocinios: true, camisetas: true },
      scenarioActivo,
      loaded: true,
    };
  }, [conceptos, tramos, inscritos, ingresosExtra, maximos, syncConfig, scenarioActivo]);
}
