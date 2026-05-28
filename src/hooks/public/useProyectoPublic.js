/**
 * useProyectoPublic.js — Mejora 4: Contrato público del módulo Proyecto
 *
 * Ventanilla oficial del módulo Proyecto para consumidores externos.
 *
 * REGLA: Los consumidores externos (Dashboard, SemaforoRiesgos)
 *        SOLO leen datos de proyecto a través de este hook.
 *
 * @module useProyectoPublic
 */
import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import {
  SK_PROY_TAREAS,
  SK_PROY_HITOS,
  SK_PROY_EQUIPO,
} from "@/constants/storageKeys";

/**
 * @typedef {object} ProyectoPublic
 * @property {number}   tareasTotal        - Total de tareas registradas
 * @property {number}   tareasCompletadas  - Tareas con estado "completado"
 * @property {number}   tareasBloqueadas   - Tareas con estado "bloqueado"
 * @property {number}   tareasVencidas     - Tareas sin completar con fecha límite pasada
 * @property {number}   progresoGlobal     - % de progreso global (0-100)
 * @property {object[]} hitosProximos      - Próximos 5 hitos pendientes ordenados por fecha
 * @property {object[]} tareas             - Lista completa de tareas (solo lectura)
 * @property {object[]} hitos              - Lista completa de hitos (solo lectura)
 * @property {object[]} equipo             - Miembros del equipo (solo lectura)
 * @property {boolean}  loaded
 */

/**
 * Hook público del módulo Proyecto.
 *
 * @returns {ProyectoPublic}
 */
export function useProyectoPublic() {
  const [tareas] = useData(SK_PROY_TAREAS, []);
  const [hitos]  = useData(SK_PROY_HITOS,  []);
  const [equipo] = useData(SK_PROY_EQUIPO, []);

  return useMemo(() => {
    const safeTareas = Array.isArray(tareas) ? tareas : [];
    const safeHitos  = Array.isArray(hitos)  ? hitos  : [];
    const TODAY      = new Date();

    const tareasCompletadas = safeTareas.filter(t => t.estado === "completado").length;
    const tareasBloqueadas  = safeTareas.filter(t => t.estado === "bloqueado").length;
    const tareasVencidas    = safeTareas.filter(t =>
      t.estado !== "completado" &&
      t.fechaLimite &&
      new Date(t.fechaLimite) < TODAY
    ).length;

    const progresoGlobal = safeTareas.length > 0
      ? Math.round(tareasCompletadas / safeTareas.length * 100)
      : 0;

    const hitosProximos = safeHitos
      .filter(h => !h.completado && h.fecha)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 5);

    return {
      tareasTotal:      safeTareas.length,
      tareasCompletadas,
      tareasBloqueadas,
      tareasVencidas,
      progresoGlobal,
      hitosProximos,
      tareas:  safeTareas,
      hitos:   safeHitos,
      equipo:  Array.isArray(equipo) ? equipo : [],
      loaded: true,
    };
  }, [tareas, hitos, equipo]);
}
