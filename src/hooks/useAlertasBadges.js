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

const THROTTLE_MS = 5000; // T7.2: no recalcular más de 1 vez cada 5s por módulo

// Mapeo clave de localStorage → módulo que la usa
const KEY_MODULE = {
  teg_proyecto_v1_tareas:           "proyecto",
  teg_voluntarios_v1_voluntarios:   "voluntarios",
  teg_voluntarios_v1_puestos:       "voluntarios",
  teg_documentos_v1:                "documentos",
  teg_documentos_v1_gestiones:      "documentos",
  teg_presupuesto_v1_conceptos:     "presupuesto",
  teg_presupuesto_v1_tramos:        "presupuesto",
  teg_presupuesto_v1_inscritos:     "presupuesto",
  teg_presupuesto_v1_ingresosExtra: "presupuesto",
  teg_logistica_v1_inc:             "logistica",
};

async function calcBadgeModulo(modulo) {
  try {
    switch (modulo) {
      case "proyecto": {
        const tareas = await dataService.get("teg_proyecto_v1_tareas", []);
        const vencidas = Array.isArray(tareas) ? tareas.filter(t =>
          t.estado !== "completado" && t.estado !== "bloqueado" &&
          t.fechaLimite &&
          Math.ceil((new Date(t.fechaLimite) - new Date()) / 86400000) < 0
        ).length : 0;
        return vencidas > 0 ? { proyecto: vencidas } : {};
      }
      case "voluntarios": {
        const vols    = await dataService.get("teg_voluntarios_v1_voluntarios", []);
        const puestos = await dataService.get("teg_voluntarios_v1_puestos", []);
        if (!Array.isArray(puestos) || !Array.isArray(vols)) return {};
        const criticos = puestos.filter(p => {
          const confirmados = vols.filter(v => v.puestoId === p.id && v.estado === "confirmado").length;
          return p.necesarios > 0 && confirmados / p.necesarios < 0.5;
        }).length;
        return criticos > 0 ? { voluntarios: criticos } : {};
      }
      case "documentos": {
        const docs  = await dataService.get("teg_documentos_v1", []);
        const gests = await dataService.get("teg_documentos_v1_gestiones", []);
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
        const conceptos = await dataService.get("teg_presupuesto_v1_conceptos", []);
        const tramos    = await dataService.get("teg_presupuesto_v1_tramos", []);
        const inscritos = await dataService.get("teg_presupuesto_v1_inscritos", { tramos: {} });
        const ingExt    = await dataService.get("teg_presupuesto_v1_ingresosExtra", []);
        if (!Array.isArray(conceptos) || !Array.isArray(tramos)) return {};
        const DIST = ["TG7","TG13","TG25"];
        const totalIns = DIST.reduce((s,d) =>
          s + tramos.reduce((ss,t) => ss + (inscritos?.tramos?.[t.id]?.[d]||0), 0), 0);
        const ingresos = tramos.reduce((s,t) =>
          s + DIST.reduce((ss,d) =>
            ss + (inscritos?.tramos?.[t.id]?.[d]||0) * (t.precios?.[d]||0), 0), 0);
        const costes = conceptos.filter(c => c.activo).reduce((s,c) => {
          if (c.tipo === "fijo") return s + (c.costeTotal || 0);
          return s + DIST.reduce((ss,d) =>
            ss + (c.activoDistancias?.[d] ? (c.costePorDistancia?.[d]||0) *
              (tramos.reduce((st,t) => st + (inscritos?.tramos?.[t.id]?.[d]||0), 0)) : 0), 0);
        }, 0);
        const totalIngExtra = Array.isArray(ingExt)
          ? ingExt.filter(i => i.activo).reduce((s, i) => s + (i.valor || 0), 0) : 0;
        return ((ingresos + totalIngExtra) - costes < 0 && totalIns > 0) ? { presupuesto: "!" } : {};
      }
      case "logistica": {
        const inc = await dataService.get("teg_logistica_v1_inc", []);
        const abiertas = Array.isArray(inc) ? inc.filter(i => i.estado === "abierta").length : 0;
        return abiertas > 0 ? { logistica: abiertas } : {};
      }
      default:
        return {};
    }
  } catch { return {}; }
}

export function useAlertasBadges({ activeBlock, syncTick }) {
  const [badges, setBadges]           = useState({});
  const lastCalcRef                   = useRef({}); // { modulo: timestamp }
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

  // T7.2: escuchar teg-sync con granularidad por módulo
  useEffect(() => {
    const handler = (e) => {
      const modulo = e?.detail?.module;
      if (modulo && TODOS_MODULOS.includes(modulo)) {
        // Solo recalcular el módulo que cambió
        calcModulos([modulo]);
      } else {
        // Sin módulo específico: recalcular todos (conservador)
        calcModulos(TODOS_MODULOS);
      }
    };
    window.addEventListener("teg-sync", handler);
    return () => window.removeEventListener("teg-sync", handler);
  }, [calcModulos]); // eslint-disable-line react-hooks/exhaustive-deps

  return badges;
}
