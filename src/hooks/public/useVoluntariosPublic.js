/**
 * useVoluntariosPublic.js — Mejora 4: Contrato público del módulo Voluntarios
 *
 * Ventanilla oficial del módulo Voluntarios para consumidores externos.
 *
 * REGLA: Los consumidores externos (Dashboard, DiaCarrera, SemaforoRiesgos)
 *        SOLO leen datos de voluntarios a través de este hook.
 *
 * @module useVoluntariosPublic
 */
import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import {
  SK_VOL_VOLUNTARIOS,
  SK_VOL_PUESTOS,
  SK_VOL_OPCION_PUESTO,
} from "@/constants/storageKeys";

/**
 * @typedef {object} PuestoConCobertura
 * @property {string}  id
 * @property {string}  nombre
 * @property {number}  necesarios  - Plazas requeridas
 * @property {number}  asig        - Asignados (no cancelados)
 * @property {number}  confirmados - Confirmados
 * @property {number}  deficit     - necesarios - asig (mínimo 0)
 * @property {number}  pct         - % de cobertura (0-100+)
 */

/**
 * @typedef {object} VoluntariosPublic
 * @property {number}  total               - Total de voluntarios registrados
 * @property {number}  confirmados         - Voluntarios con estado "confirmado"
 * @property {number}  pendientes          - Voluntarios con estado "pendiente"
 * @property {number}  totalNecesarios     - Suma de plazas requeridas en todos los puestos
 * @property {number}  cobertura           - % de cobertura global (0-100)
 * @property {PuestoConCobertura[]} puestosConCobertura - Todos los puestos con métricas
 * @property {PuestoConCobertura[]} puestosAlerta       - Puestos con cobertura < 50%
 * @property {PuestoConCobertura[]} puestosBajos        - Puestos con cobertura 50-99%
 * @property {object[]} voluntarios         - Lista completa (solo lectura)
 * @property {object[]} puestos             - Lista de puestos (solo lectura)
 * @property {string[]} opcionesPuesto      - Nombres de puestos disponibles para formulario
 * @property {boolean}  loaded
 */

/**
 * Hook público del módulo Voluntarios.
 *
 * @returns {VoluntariosPublic}
 */
export function useVoluntariosPublic() {
  const [voluntarios]    = useData(SK_VOL_VOLUNTARIOS, []);
  const [puestos]        = useData(SK_VOL_PUESTOS, []);
  const [opcionesPuesto] = useData(SK_VOL_OPCION_PUESTO, []);

  return useMemo(() => {
    const safeVols    = Array.isArray(voluntarios)    ? voluntarios    : [];
    const safePuestos = Array.isArray(puestos)        ? puestos        : [];

    const confirmados   = safeVols.filter(v => v.estado === "confirmado").length;
    const pendientes    = safeVols.filter(v => v.estado === "pendiente").length;
    const totalNecesarios = safePuestos.reduce((s, p) => s + (p.necesarios || 0), 0);
    const cobertura       = totalNecesarios > 0
      ? Math.round(confirmados / totalNecesarios * 100)
      : 0;

    const puestosConCobertura = safePuestos.map(p => {
      const asig       = safeVols.filter(v => v.puestoId === p.id && v.estado !== "cancelado").length;
      const conf       = safeVols.filter(v => v.puestoId === p.id && v.estado === "confirmado").length;
      const deficit    = Math.max(0, (p.necesarios || 0) - asig);
      const pct        = (p.necesarios || 0) > 0 ? Math.round(asig / p.necesarios * 100) : 100;
      return { ...p, asig, confirmados: conf, deficit, pct };
    });

    return {
      total:              safeVols.length,
      confirmados,
      pendientes,
      totalNecesarios,
      cobertura,
      puestosConCobertura,
      puestosAlerta: puestosConCobertura.filter(p => p.pct < 50),
      puestosBajos:  puestosConCobertura.filter(p => p.pct >= 50 && p.pct < 100),
      voluntarios:   safeVols,
      puestos:       safePuestos,
      opcionesPuesto: Array.isArray(opcionesPuesto) ? opcionesPuesto : [],
      loaded: true,
    };
  }, [voluntarios, puestos, opcionesPuesto]);
}
