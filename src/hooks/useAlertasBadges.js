/**
 * useAlertasBadges.js — T3.2 + T7.2
 * Hook que calcula los badges de alerta para la navegación del panel.
 *
 * T3.2: Lee datos vía dataService.get() en lugar de localStorage directo.
 * T7.2: Throttle de 5 segundos. Solo recalcula el módulo que emitió teg-sync.
 *       teg-sync puede incluir detail.module para indicar qué módulo cambió.
 *       Si no hay detail.module, recalcula todos (comportamiento conservador).
 */
import { useEffect, useRef, useState, useCallback } from "react";
import dataService from "@/lib/dataService";
import { useLastEvent } from "@/store/useAppStore";
import {
  SK_PROY_TAREAS,
  SK_VOL_VOLUNTARIOS,
  SK_VOL_PUESTOS,
  SK_DOC_DOCS,
  SK_DOC_GESTIONES,
  SK_PPTO_CONCEPTOS,
  SK_PPTO_TRAMOS,
  SK_PPTO_INSCRITOS,
  SK_PPTO_INGRESOS_EXTRA,
  SK_LOG_INC,
  SK_LOG_MAT,
  SK_LOG_ASIG,
} from "@/constants/storageKeys";

const THROTTLE_MS = 5000; // T7.2: no recalcular más de 1 vez cada 5s por módulo

// Mapeo clave de localStorage → módulo que la usa
const KEY_MODULE = {
  [SK_PROY_TAREAS]:        "proyecto",
  [SK_VOL_VOLUNTARIOS]:    "voluntarios",
  [SK_VOL_PUESTOS]:        "voluntarios",
  [SK_DOC_DOCS]:           "documentos",
  [SK_DOC_GESTIONES]:      "documentos",
  [SK_PPTO_CONCEPTOS]:     "presupuesto",
  [SK_PPTO_TRAMOS]:        "presupuesto",
  [SK_PPTO_INSCRITOS]:     "presupuesto",
  [SK_PPTO_INGRESOS_EXTRA]:"presupuesto",
  [SK_LOG_INC]:            "logistica",
};

async function calcBadgeModulo(modulo) {
  try {
    switch (modulo) {
      case "proyecto": {
        const tareas = await dataService.get(SK_PROY_TAREAS, []);
        const vencidas = Array.isArray(tareas) ? tareas.filter(t =>
          t.estado !== "completado" && t.estado !== "bloqueado" &&
          t.fechaLimite &&
          Math.ceil((new Date(t.fechaLimite) - new Date()) / 86400000) < 0
        ).length : 0;
        return vencidas > 0 ? { proyecto: vencidas } : {};
      }
      case "voluntarios": {
        const vols = await dataService.get(SK_VOL_VOLUNTARIOS, []);
        const puestos = await dataService.get(SK_VOL_PUESTOS, []);
        if (!Array.isArray(puestos) || !Array.isArray(vols)) return {};
        const criticos = puestos.filter(p => {
          const confirmados = vols.filter(v => v.puestoId === p.id && v.estado === "confirmado").length;
          return p.necesarios > 0 && confirmados / p.necesarios < 0.5;
        }).length;
        return criticos > 0 ? { voluntarios: criticos } : {};
      }
      case "documentos": {
        const docs = await dataService.get(SK_DOC_DOCS, []);
        const gests = await dataService.get(SK_DOC_GESTIONES, []);
        const docsV = Array.isArray(docs) ? docs.filter(d =>
          d.fechaVencimiento && d.estado !== "vigente" && d.estado !== "aprobado" &&
          Math.ceil((new Date(d.fechaVencimiento) - new Date()) / 86400000) < 0
        ).length : 0;
        const gestV = Array.isArray(gests) ? gests.filter(g =>
          g.estado === "denegado" ||
          (g.estado !== "aprobado" && g.fechaVencimiento &&
            Math.ceil((new Date(g.fechaVencimiento) - new Date()) / 86400000) < 0)
        ).length : 0;
        return docsV + gestV > 0 ? { documentos: docsV + gestV } : {};
      }
      case "presupuesto": {
        const conceptos = await dataService.get(SK_PPTO_CONCEPTOS, []);
        const tramos = await dataService.get(SK_PPTO_TRAMOS, []);
        const inscritos = await dataService.get(SK_PPTO_INSCRITOS, { tramos: {} });
        const ingExt = await dataService.get(SK_PPTO_INGRESOS_EXTRA, []);
        if (!Array.isArray(conceptos) || !Array.isArray(tramos)) return {};
        const DIST = ["TG7", "TG13", "TG25"];
        const totalIns = DIST.reduce((s, d) =>
          s + tramos.reduce((ss, t) => ss + (inscritos?.tramos?.[t.id]?.[d] || 0), 0), 0);
        const ingresos = tramos.reduce((s, t) =>
          s + DIST.reduce((ss, d) =>
            ss + (inscritos?.tramos?.[t.id]?.[d] || 0) * (t.precios?.[d] || 0), 0), 0);
        const costes = conceptos.filter(c => c.activo).reduce((s, c) => {
          if (c.tipo === "fijo") return s + (c.costeTotal || 0);
          return s + DIST.reduce((ss, d) =>
            ss + (c.activoDistancias?.[d] ? (c.costePorDistancia?.[d] || 0) *
              (tramos.reduce((st, t) => st + (inscritos?.tramos?.[t.id]?.[d] || 0), 0)) : 0), 0);
        }, 0);
        const totalIngExtra = Array.isArray(ingExt)
          ? ingExt.filter(i => i.activo).reduce((s, i) => s + (i.valor || 0), 0) : 0;
        return ((ingresos + totalIngExtra) - costes < 0 && totalIns > 0) ? { presupuesto: "!" } : {};
      }
      case "logistica": {
        const inc = await dataService.get(SK_LOG_INC, []);
        const abiertas = Array.isArray(inc) ? inc.filter(i => i.estado === "abierta").length : 0;

        // [LOG-04] Alertas de avituallamiento insuficiente basadas en inscritos
        let avitInsuficientes = 0;
        try {
          const material  = await dataService.get(SK_LOG_MAT,  []);
          const asigs     = await dataService.get(SK_LOG_ASIG, []);
          const inscrData = await dataService.get(SK_PPTO_INSCRITOS, { tramos: {} });
          const tramos    = await dataService.get(SK_PPTO_TRAMOS, []);
          const DIST = ["TG7", "TG13", "TG25"];
          const totalInscritos = Array.isArray(tramos)
            ? tramos.reduce((s, t) =>
                s + DIST.reduce((ss, d) => ss + (inscrData?.tramos?.[t.id]?.[d] || 0), 0), 0)
            : 0;
          if (totalInscritos > 0) {
            const UMBRAL = 0.5;
            avitInsuficientes = material.filter(m => {
              if (m.categoria !== "Avituallamiento") return false;
              const umbral = m.stockMinimo > 0 ? m.stockMinimo : UMBRAL;
              return (m.stock / totalInscritos) < umbral;
            }).length;
          }
        } catch { /* si falla la lectura de logística, no bloquear */ }

        const total = abiertas + avitInsuficientes;
        return total > 0 ? { logistica: total } : {};
      }
      default:
        return {};
    }
  } catch { return {}; }
}

export function useAlertasBadges({ activeBlock, syncTick }) {
  const [badges, setBadges] = useState({});
  const lastCalcRef = useRef({}); // { modulo: timestamp }
  const TODOS_MODULOS = ["proyecto", "voluntarios", "documentos", "presupuesto", "logistica"];

  const calcModulos = useCallback(async (modulos) => {
    const now = Date.now();
    // Filtrar los que han superado el throttle
    const toCalc = modulos.filter(m => (now - (lastCalcRef.current[m] || 0)) >= THROTTLE_MS);
    if (toCalc.length === 0) return;

    const results = await Promise.all(toCalc.map(m => calcBadgeModulo(m)));
    const newPartial = Object.assign({}, ...results);

    setBadges(prev => {
      const next = { ...prev };
      // Solo actualizar los módulos calculados; limpiar los que devolvieron {}
      toCalc.forEach((m, i) => {
        const result = results[i];
        if (Object.keys(result).length > 0) {
          Object.assign(next, result);
        } else {
          delete next[m]; // sin alertas en este módulo
        }
      });
      return JSON.stringify(next) !== JSON.stringify(prev) ? next : prev;
    });

    toCalc.forEach(m => { lastCalcRef.current[m] = now; });
  }, []);

  // Recalcular al cambiar de bloque activo o al recibir syncTick
  useEffect(() => {
    calcModulos(TODOS_MODULOS);
  }, [activeBlock, syncTick, calcModulos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mejora 3: suscribirse al store Zustand con granularidad por módulo.
  // lastEvent cambia solo cuando hay un evento nuevo → reacción precisa.
  const lastEvent = useLastEvent();
  useEffect(() => {
    if (!lastEvent) return;
    const modulo = lastEvent.module;
    if (modulo && TODOS_MODULOS.includes(modulo)) {
      calcModulos([modulo]);
    } else {
      calcModulos(TODOS_MODULOS);
    }
  }, [lastEvent, calcModulos]); // eslint-disable-line react-hooks/exhaustive-deps

  return badges;
}
