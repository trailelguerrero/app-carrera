/**
 * useLogisticaPublic.js — Mejora 4: Contrato público del módulo Logística
 *
 * Ventanilla oficial del módulo Logística para consumidores externos.
 *
 * REGLA: Los consumidores externos (Dashboard, DiaCarrera, SemaforoRiesgos)
 *        SOLO leen datos de logística a través de este hook.
 *
 * @module useLogisticaPublic
 */
import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import {
  SK_LOG_MAT,
  SK_LOG_ASIG,
  SK_LOG_TL,
  SK_LOG_CK,
  SK_LOG_INC,
  SK_LOG_CONT,
  SK_LOG_VEH,
  SK_LOG_RUT,
} from "@/constants/storageKeys";

/**
 * @typedef {object} LogisticaPublic
 * @property {number}   totalMaterial         - Número de materiales registrados
 * @property {object[]} stockAlerts           - Materiales con sobreasignación
 * @property {object[]} materialesBajoMinimo  - Materiales por debajo del stock mínimo
 * @property {number}   tlDone                - Tareas de timeline completadas
 * @property {number}   tlTotal               - Total de tareas de timeline
 * @property {number}   ckDone                - Items de checklist completados
 * @property {number}   ckTotal               - Total items de checklist
 * @property {number}   incidenciasActivas    - Incidencias con estado "abierta"
 * @property {object[]} incidencias           - Lista completa de incidencias (solo lectura)
 * @property {object[]} timeline              - Lista completa de timeline (solo lectura)
 * @property {object[]} checklist             - Lista completa de checklist (solo lectura)
 * @property {object[]} contenedores          - Contenedores/almacenes (solo lectura)
 * @property {object[]} vehiculos             - Vehículos asignados (solo lectura)
 * @property {object[]} rutas                 - Rutas del evento (solo lectura)
 * @property {boolean}  loaded
 */

/**
 * Hook público del módulo Logística.
 *
 * @returns {LogisticaPublic}
 */
export function useLogisticaPublic() {
  const [material]     = useData(SK_LOG_MAT,  []);
  const [asigs]        = useData(SK_LOG_ASIG, []);
  const [timeline]     = useData(SK_LOG_TL,   []);
  const [checklist]    = useData(SK_LOG_CK,   []);
  const [incidencias]  = useData(SK_LOG_INC,  []);
  const [contenedores] = useData(SK_LOG_CONT, []);
  const [vehiculos]    = useData(SK_LOG_VEH,  []);
  const [rutas]        = useData(SK_LOG_RUT,  []);

  return useMemo(() => {
    const safeMat  = Array.isArray(material)    ? material    : [];
    const safeAsig = Array.isArray(asigs)       ? asigs       : [];
    const safeTl   = Array.isArray(timeline)    ? timeline    : [];
    const safeCk   = Array.isArray(checklist)   ? checklist   : [];
    const safeInc  = Array.isArray(incidencias) ? incidencias : [];

    const stockAlerts = safeMat.filter(m => {
      const asig = safeAsig
        .filter(a => a.materialId === m.id)
        .reduce((s, a) => s + (a.cantidad || 0), 0);
      return asig > (m.stock || 0);
    });

    const materialesBajoMinimo = safeMat.filter(
      m => (m.stockMinimo || 0) > 0 && (m.stock || 0) < m.stockMinimo
    );

    const tlDone = safeTl.filter(t => t.estado === "completado").length;
    const ckDone = safeCk.filter(c => c.estado === "completado").length;
    const incidenciasActivas = safeInc.filter(i => i.estado === "abierta").length;

    return {
      totalMaterial:       safeMat.length,
      stockAlerts,
      materialesBajoMinimo,
      tlDone,
      tlTotal:             safeTl.length,
      ckDone,
      ckTotal:             safeCk.length,
      incidenciasActivas,
      incidencias:         safeInc,
      timeline:            safeTl,
      checklist:           safeCk,
      contenedores:        Array.isArray(contenedores) ? contenedores : [],
      vehiculos:           Array.isArray(vehiculos)    ? vehiculos    : [],
      rutas:               Array.isArray(rutas)        ? rutas        : [],
      loaded: true,
    };
  }, [material, asigs, timeline, checklist, incidencias, contenedores, vehiculos, rutas]);
}
