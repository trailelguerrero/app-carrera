/**
 * useAlertasBadges.js — T3.2
 * Hook que calcula los badges de alerta para la navegación del panel.
 *
 * MEJORAS vs. el código inline anterior en Index.jsx:
 * - Lee los datos vía dataService.get() en lugar de localStorage directamente
 * - Si el adapter cambia de localStorage a API, los badges seguirán funcionando
 * - La lógica está aislada, testeable y reutilizable
 * - Se recalcula al cambiar activeBlock y al recibir teg-sync (igual que antes)
 *
 * NOTA: En Fase 7 (T7.2) se añadirá throttle y granularidad por módulo.
 */
import { useEffect, useMemo, useState } from "react";
import dataService from "@/lib/dataService";

export function useAlertasBadges({ activeBlock, syncTick }) {
  // Estado de los datos raw leídos desde dataService
  const [data, setData] = useState({});

  // Cargar todos los datos necesarios para los badges
  useEffect(() => {
    const load = async () => {
      try {
        const [tareas, vols, puestos, docs, gests, conceptos, tramos, inscritos, incidencias, ingresosExtraLS] =
          await Promise.all([
            dataService.get("teg_proyecto_v1_tareas",            []),
            dataService.get("teg_voluntarios_v1_voluntarios",    []),
            dataService.get("teg_voluntarios_v1_puestos",        []),
            dataService.get("teg_documentos_v1",                 []),
            dataService.get("teg_documentos_v1_gestiones",       []),
            dataService.get("teg_presupuesto_v1_conceptos",      []),
            dataService.get("teg_presupuesto_v1_tramos",         []),
            dataService.get("teg_presupuesto_v1_inscritos",      { tramos: {} }),
            dataService.get("teg_logistica_v1_inc",              []),
            dataService.get("teg_presupuesto_v1_ingresosExtra",  []),
          ]);
        setData({ tareas, vols, puestos, docs, gests, conceptos, tramos, inscritos, incidencias, ingresosExtraLS });
      } catch { /* silencioso — badges son informativos */ }
    };
    load();
  }, [activeBlock, syncTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const badges = useMemo(() => {
    const { tareas=[], vols=[], puestos=[], docs=[], gests=[], conceptos=[], tramos=[], inscritos={ tramos:{} }, incidencias=[], ingresosExtraLS=[] } = data;
    const result = {};

    try {
      // ── Proyecto: tareas vencidas ─────────────────────────────────────────
      const vencidas = Array.isArray(tareas) ? tareas.filter(t =>
        t.estado !== "completado" && t.estado !== "bloqueado" &&
        t.fechaLimite &&
        Math.ceil((new Date(t.fechaLimite) - new Date()) / 86400000) < 0
      ).length : 0;
      if (vencidas > 0) result["proyecto"] = vencidas;

      // ── Voluntarios: puestos con cobertura < 50% ─────────────────────────
      if (Array.isArray(puestos) && Array.isArray(vols)) {
        const criticos = puestos.filter(p => {
          const confirmados = vols.filter(v => v.puestoId === p.id && v.estado === "confirmado").length;
          return p.necesarios > 0 && confirmados / p.necesarios < 0.5;
        }).length;
        if (criticos > 0) result["voluntarios"] = criticos;
      }

      // ── Documentos: vencidos o denegados ─────────────────────────────────
      const docsV = Array.isArray(docs) ? docs.filter(d =>
        d.fechaVencimiento && d.estado !== "vigente" && d.estado !== "aprobado" &&
        Math.ceil((new Date(d.fechaVencimiento) - new Date()) / 86400000) < 0
      ).length : 0;
      const gestV = Array.isArray(gests) ? gests.filter(g =>
        g.estado === "denegado" ||
        (g.estado !== "aprobado" && g.fechaVencimiento &&
         Math.ceil((new Date(g.fechaVencimiento) - new Date()) / 86400000) < 0)
      ).length : 0;
      if (docsV + gestV > 0) result["documentos"] = docsV + gestV;

      // ── Presupuesto: resultado negativo ───────────────────────────────────
      if (Array.isArray(conceptos) && Array.isArray(tramos)) {
        const DIST = ["TG7","TG13","TG25"];
        const totalIns = DIST.reduce((s,d) =>
          s + tramos.reduce((ss,t) => ss + (inscritos?.tramos?.[t.id]?.[d]||0), 0), 0
        );
        const ingresos = tramos.reduce((s,t) =>
          s + DIST.reduce((ss,d) =>
            ss + (inscritos?.tramos?.[t.id]?.[d]||0) * (t.precios?.[d]||0), 0
          ), 0);
        const costes = conceptos.filter(c => c.activo).reduce((s,c) => {
          if (c.tipo === "fijo") return s + (c.costeTotal || 0);
          return s + DIST.reduce((ss,d) =>
            ss + (c.activoDistancias?.[d] ? (c.costePorDistancia?.[d]||0) * (tramos.reduce((st,t) => st + (inscritos?.tramos?.[t.id]?.[d]||0), 0)) : 0), 0
          );
        }, 0);
        const totalIngExtra = Array.isArray(ingresosExtraLS)
          ? ingresosExtraLS.filter(i => i.activo).reduce((s, i) => s + (i.valor || 0), 0)
          : 0;
        if ((ingresos + totalIngExtra) - costes < 0 && totalIns > 0) result["presupuesto"] = "!";
      }

      // ── Logística: incidencias abiertas ───────────────────────────────────
      const incAbiertas = Array.isArray(incidencias) ? incidencias.filter(i => i.estado === "abierta").length : 0;
      if (incAbiertas > 0) result["logistica"] = incAbiertas;

    } catch { /* silencioso */ }

    return result;
  }, [data]);

  return badges;
}
