import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { BLOCK_CSS, blockCls } from "@/lib/blockStyles";
import { fmtEur } from "@/lib/utils";
import {
  calculateTotalInscritos,
  calculateIngresosPorDistancia,
  calculateCostesFijos,
  calculateCostesVariables,
  calculateResultadoFinanciero,
} from "@/lib/budgetUtils";
import { EVENT_DATE } from "@/constants/budgetConstants";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";

import dataService from "@/lib/dataService";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  Tooltip as RechartsTip,
} from "recharts";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";

const ALL_KEYS = {
  "teg_presupuesto_v1_conceptos":    [],
  "teg_presupuesto_v1_tramos":        [],
  "teg_presupuesto_v1_inscritos":     { tramos: {} },
  "teg_presupuesto_v1_ingresosExtra": [],
  "teg_presupuesto_v1_merchandising": [],
  "teg_presupuesto_v1_syncConfig":    {},
  "teg_camisetas_v1_stats":          {},
  "teg_presupuesto_v1_maximos":       {},
  "teg_voluntarios_v1_voluntarios":   [],
  "teg_voluntarios_v1_puestos":       [],
  "teg_patrocinadores_v1_pats":       [],
  "teg_patrocinadores_v1_obj":        8000,
  "teg_logistica_v1_mat":             [],
  "teg_logistica_v1_asig":            [],
  "teg_logistica_v1_tl":              [],
  "teg_logistica_v1_ck":              [],
  "teg_proyecto_v1_tareas":           [],
  "teg_proyecto_v1_hitos":            [],
  "teg_documentos_v1":                [],
  "teg_documentos_v1_gestiones":       [],
  [LS_KEY_CONFIG]:                      EVENT_CONFIG_DEFAULT,
  "teg_scenario_active_name":            null,
};

const fmtD  = (iso) => new Date(iso).toLocaleDateString("es-ES", { day:"2-digit", month:"short" });
const navigate = (block, subtab) => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block, subtab } }));

// ─── Componente ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [rawData,     setRawData]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);  // refresco silencioso
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alertasExpandidas, setAlertasExpandidas] = useState(
    () => localStorage.getItem("teg_dash_alertas_open") === "1"
  ); // avisos: colapsados por defecto, persiste si el usuario los abre
  const [saludExpandida, setSaludExpandida] = useState(false); // colapsada por defecto
  const intervalRef = useRef(null);

  const loadData = useCallback(async (silent = false) => {
    // Carga optimista: usar localStorage inmediatamente para mostrar algo al usuario
    if (!silent) {
      try {
        const localData = {};
        let hasLocal = false;
        for (const [key, def] of Object.entries(ALL_KEYS)) {
          const raw = localStorage.getItem(key);
          if (raw) { localData[key] = JSON.parse(raw); hasLocal = true; }
          else localData[key] = def;
        }
        if (hasLocal) {
          setRawData(localData);
          setLoading(false); // Mostrar datos locales inmediatamente
        }
      } catch {}
    }
    if (!silent) setLoading(prev => prev); // mantener loading si no hubo local
    else setRefreshing(true);
    try {
      const data = await dataService.getMultiple(ALL_KEYS);
      setRawData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard: error cargando datos", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // teg-sync throttled — no recargar más de 1 vez cada 10 segundos
    let lastSync = 0;
    const handler = () => {
      const now = Date.now();
      if (now - lastSync > 10000) {
        lastSync = now;
        loadData(true);
      }
    };
    window.addEventListener("teg-sync", handler);
    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener("teg-sync", handler);
    };
  }, [loadData]);

  // ─── Cálculo de datos ─────────────────────────────────────────────────────
  const data = useMemo(() => {
    const d = rawData ?? {};
    const get = (key, def) => {
      const v = d[key];
      if (v === undefined || v === null) return def;
      if (Array.isArray(def) && !Array.isArray(v)) return def;
      return v;
    };

    const TODAY    = new Date();
    const cfg = { ...EVENT_CONFIG_DEFAULT, ...(get(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT) || {}) };
    const eventoFecha    = cfg.fecha ? new Date(cfg.fecha) : EVENT_DATE;
    const diasHasta      = Math.ceil((eventoFecha - TODAY) / 86400000);
    const yaFue          = diasHasta < 0;
    const esSemana       = diasHasta >= 0 && diasHasta <= cfg.volDiasCritico;
    const volDiasCritico = cfg.volDiasCritico;
    const volDiasAviso   = cfg.volDiasAviso;
    const eventoNombre   = cfg.nombre;
    const eventoEdicion  = cfg.edicion;

    // PRESUPUESTO
    const conceptos    = get("teg_presupuesto_v1_conceptos", []);
    const tramos       = get("teg_presupuesto_v1_tramos", []);
    const inscritos    = get("teg_presupuesto_v1_inscritos", { tramos: {} });
    const syncConfig     = get("teg_presupuesto_v1_syncConfig", { patrocinios: true, camisetas: true });
    const scenarioActivo = get("teg_scenario_active_name", null);
    // Camisetas: leer pedidos y coste directamente (igual que useBudgetLogic)
    // teg_camisetas_v1_stats nunca se escribe — se calcula aquí en tiempo real
    const camPedidos     = get("teg_camisetas_v1_pedidos", []);
    const camCoste       = get("teg_camisetas_v1_coste", { corredor: 7.5, voluntario: 7.5 });
    // Cálculo de camisetas delegado a calculateResultadoFinanciero
    const pats           = get("teg_patrocinadores_v1_pats", []);
    const ingresosExtra  = get("teg_presupuesto_v1_ingresosExtra", []);
    const merchandising  = get("teg_presupuesto_v1_merchandising", []);
    const maximos        = get("teg_presupuesto_v1_maximos", {});

    // ── Cálculos financieros — usando budgetUtils (fuente única de verdad)
    // Misma lógica que useBudgetLogic.js para garantizar consistencia con Presupuesto
    const inscritosBU    = calculateTotalInscritos(tramos, inscritos);
    const ingresosBU     = calculateIngresosPorDistancia(tramos, inscritos);
    const costesFijosBU  = calculateCostesFijos(conceptos, inscritosBU);
    const costesVarsBU   = calculateCostesVariables(conceptos, inscritosBU);

    const totalInscritos   = inscritosBU.total;
    const inscritosPorDist = { TG7: inscritosBU.TG7, TG13: inscritosBU.TG13, TG25: inscritosBU.TG25 };
    const totalIngresos    = ingresosBU.total;
    const totalCostesFijos = costesFijosBU.total;
    const totalCostesVars  = costesVarsBU.total;

    const maximosPorDist   = { TG7: maximos?.TG7||0, TG13: maximos?.TG13||0, TG25: maximos?.TG25||0 };
    const totalMaximos     = maximosPorDist.TG7 + maximosPorDist.TG13 + maximosPorDist.TG25;
    const ocupacionPorDist = {
      TG7:  maximosPorDist.TG7  > 0 ? Math.round(inscritosPorDist.TG7  / maximosPorDist.TG7  * 100) : null,
      TG13: maximosPorDist.TG13 > 0 ? Math.round(inscritosPorDist.TG13 / maximosPorDist.TG13 * 100) : null,
      TG25: maximosPorDist.TG25 > 0 ? Math.round(inscritosPorDist.TG25 / maximosPorDist.TG25 * 100) : null,
    };
    const ocupacionGlobal  = totalMaximos > 0 ? Math.round(totalInscritos / totalMaximos * 100) : null;

    // ── Resultado financiero — fuente única de verdad via calculateResultadoFinanciero
    const {
      totalIngresosExtra, totalMerchBeneficio: merchBeneficio,
      totalOtrosIngresos, resultado, roiGlobal,
    } = calculateResultadoFinanciero({
      totalIngresos, totalCostesFijos, totalCostesVars,
      pats, ingresosExtra, camPedidos, camCoste: camCoste || { corredor: 7.5, voluntario: 7.5 },
      merchandising, syncConfig,
    });

    // VOLUNTARIOS
    const voluntarios      = get("teg_voluntarios_v1_voluntarios", []);
    const puestos          = get("teg_voluntarios_v1_puestos", []);
    const volConfirmados   = voluntarios.filter(v => v.estado==="confirmado").length;
    const volPendientes    = voluntarios.filter(v => v.estado==="pendiente").length;
    const totalNecesarios  = puestos.reduce((s,p) => s+p.necesarios, 0);
    const coberturaVol     = totalNecesarios > 0 ? Math.round(volConfirmados/totalNecesarios*100) : 0;
    const puestosConCobertura = puestos.map(p => {
      const asig = voluntarios.filter(v => v.puestoId===p.id && v.estado!=="cancelado").length;
      const confirmados = voluntarios.filter(v => v.puestoId===p.id && v.estado==="confirmado").length;
      const deficit = Math.max(0, p.necesarios - asig);
      const pct = p.necesarios > 0 ? Math.round(asig/p.necesarios*100) : 100;
      return { ...p, asig, confirmados, deficit, pct };
    });
    const puestosAlerta    = puestosConCobertura.filter(p => p.pct < 50);
    const puestosBajos     = puestosConCobertura.filter(p => p.pct >= 50 && p.pct < 100);

    // PATROCINADORES
    const objetivo        = get("teg_patrocinadores_v1_obj", 8000);
    const patComprometido = pats.filter(p => p.estado==="confirmado"||p.estado==="cobrado").reduce((s,p) => s+(p.importe||0), 0);
    const patCobrado      = pats.filter(p => p.estado==="cobrado").reduce((s,p) => s+(p.importe||0), 0);
    const patPipeline     = pats.filter(p => p.estado==="negociando"||p.estado==="prospecto").reduce((s,p) => s+(p.importe||0), 0);
    const contPendientes  = pats.reduce((s,p) => s+(p.contraprestaciones||[]).filter(c=>c.estado==="pendiente").length, 0);
    const patsSinSeguimiento = pats.filter(p =>
      p.estado === "negociando" &&
      p.proximoContacto &&
      new Date(p.proximoContacto) < TODAY
    );

    // LOGÍSTICA
    const material   = get("teg_logistica_v1_mat", []);
    const asigs      = get("teg_logistica_v1_asig", []);
    const tl         = get("teg_logistica_v1_tl", []);
    const ck         = get("teg_logistica_v1_ck", []);
    const tlDone     = tl.filter(t => t.estado==="completado").length;
    const ckDone     = ck.filter(c => c.estado==="completado").length;
    const stockAlerts = material.filter(m => {
      const asig = asigs.filter(a => a.materialId===m.id).reduce((s,a) => s+a.cantidad, 0);
      return asig > m.stock;
    });
    const materialesBajoMinimo = material.filter(m => m.stockMinimo > 0 && m.stock < m.stockMinimo);

    // PROYECTO
    const tareas          = get("teg_proyecto_v1_tareas", []);
    const hitos           = get("teg_proyecto_v1_hitos", []);
    const tareasTotal     = tareas.length;
    const tareasCompletadas = tareas.filter(t => t.estado==="completado").length;
    const tareasBloqueadas  = tareas.filter(t => t.estado==="bloqueado").length;
    const tareasVencidas    = tareas.filter(t => t.estado!=="completado" && t.fechaLimite && new Date(t.fechaLimite)<TODAY).length;
    const progresoGlobal  = tareasTotal > 0 ? Math.round(tareasCompletadas/tareasTotal*100) : 0;
    const hitosProximos   = hitos.filter(h => !h.completado && h.fecha).sort((a,b) => a.fecha.localeCompare(b.fecha)).slice(0,5);


    // ── DOCUMENTOS — vencidos y próximos ─────────────────────────────────
    const documentos     = Array.isArray(get("teg_documentos_v1", [])) ? get("teg_documentos_v1", []) : [];
    const diasHastaDoc   = (iso) => iso ? Math.ceil((new Date(iso) - TODAY) / 86400000) : null;
    const docsVencidos   = documentos.filter(d => {
      const dias = diasHastaDoc(d.fechaVencimiento);
      return dias !== null && dias < 0 && d.estado !== "aprobado";
    });
    const docsProxVencer = documentos.filter(d => {
      const dias = diasHastaDoc(d.fechaVencimiento);
      return dias !== null && dias >= 0 && dias <= 30 && d.estado !== "aprobado";
    });

    // ── GESTIONES LEGALES — permisos, licencias, seguros ──────────────────
    const gestiones          = Array.isArray(get("teg_documentos_v1_gestiones", [])) ? get("teg_documentos_v1_gestiones", []) : [];
    const gestionesDenegadas = gestiones.filter(g => g.estado === "denegado");
    const gestionesVencidas  = gestiones.filter(g => {
      const dias = diasHastaDoc(g.fechaVencimiento);
      return dias !== null && dias < 0 && g.estado !== "aprobado" && g.estado !== "denegado";
    });
    const gestionesUrgentes  = gestiones.filter(g => {
      const dias = diasHastaDoc(g.fechaVencimiento);
      return dias !== null && dias >= 0 && dias <= 30 && g.estado !== "aprobado";
    });

    // ── SALUD DEL EVENTO (barra semáforo global) ───────────────────────────
    // Cada módulo aporta un % ponderado a la "salud" total del evento
    const saludModulos = [
      // ── Módulos principales (en orden de criticidad operativa) ───────────
      { label:"Proyecto",      icon:"🏔️", bloque:"proyecto",
        score: progresoGlobal,
        color: progresoGlobal >= 80 ? "var(--green)" : progresoGlobal >= 50 ? "var(--amber)" : "var(--red)" },
      { label:"Voluntarios",   icon:"👥", bloque:"voluntarios",
        score: coberturaVol,
        color: coberturaVol >= 80 ? "var(--green)" : coberturaVol >= 50 ? "var(--amber)" : "var(--red)" },
      { label:"Logística",     icon:"📦", bloque:"logistica",
        score: ck.length > 0 ? Math.round(ckDone/ck.length*100) : 0,
        color: ck.length === 0 ? "var(--text-muted)" : ckDone >= ck.length*0.8 ? "var(--green)" : ckDone >= ck.length*0.5 ? "var(--amber)" : "var(--red)" },
      { label:"Documentos",    icon:"📁", bloque:"documentos",
        score: (() => {
          const total = documentos.length + gestiones.length;
          if (total === 0) return 100;
          const problemas = docsVencidos.length + gestionesDenegadas.length + gestionesVencidas.length;
          return Math.max(0, Math.round((1 - problemas / total) * 100));
        })(),
        color: docsVencidos.length > 0 || gestionesDenegadas.length > 0 ? "var(--red)" : docsProxVencer.length > 0 || gestionesUrgentes.length > 0 ? "var(--amber)" : "var(--green)" },
      // ── Indicadores financieros ──────────────────────────────────────────
      { label:"Presupuesto",   icon:"💰", bloque:"presupuesto",
        score: resultado >= 0 ? 100 : Math.max(0, 100 + Math.round(resultado / Math.max(totalCostesFijos+totalCostesVars,1) * 100)),
        color: resultado >= 0 ? "var(--green)" : resultado > -(totalCostesFijos+totalCostesVars)*0.2 ? "var(--amber)" : "var(--red)" },
      { label:"Patrocinadores",icon:"🤝", bloque:"patrocinadores",
        score: objetivo > 0 ? Math.min(100, Math.round(patComprometido/objetivo*100)) : 100,
        color: patComprometido >= objetivo*0.8 ? "var(--green)" : patComprometido >= objetivo*0.5 ? "var(--amber)" : "var(--red)" },
    ];
    const saludGlobal = Math.round(saludModulos.reduce((s,m) => s+m.score, 0) / saludModulos.length);

    // ── ALERTAS con prioridad ──────────────────────────────────────────────
    const alertasCriticas = [];
    const alertasAvisos   = [];

    if (tareasVencidas > 0)
      alertasCriticas.push({ icon:"🔴", texto:`${tareasVencidas} tarea${tareasVencidas!==1?"s":""} vencida${tareasVencidas!==1?"s":""} sin completar`, modulo:"proyecto" });
    // Alertas preventivas: próximas a vencer ≤7 días (no vencidas)
    const tareasProxVencer = tareas.filter(t =>
      t.estado !== "completado" && t.estado !== "bloqueado" && t.fechaLimite &&
      Math.ceil((new Date(t.fechaLimite) - TODAY) / 86400000) >= 0 &&
      Math.ceil((new Date(t.fechaLimite) - TODAY) / 86400000) <= 7
    ).length;
    if (tareasProxVencer > 0)
      alertasAvisos.push({ icon:"⚡", texto:`${tareasProxVencer} tarea${tareasProxVencer!==1?"s":""} vence${tareasProxVencer===1?"":"n"} en ≤7 días`, modulo:"proyecto" });
    // Alerta contextual DíaCarrera cuando el evento está próximo (≤7 días)
    // diasHasta ya está calculado arriba usando eventoFecha y cfg
    if (diasHasta >= 0 && diasHasta <= 7)
      alertasCriticas.push({ icon:"🏁", texto:`¡El evento es en ${diasHasta === 0 ? "HOY" : diasHasta + " días"}! Revisa el módulo Día de Carrera`, modulo:"diaCarrera" });
    // ── Alertas de voluntarios — sensibles al tiempo restante ───────────────
    // La cobertura de puestos es una tarea de los últimos días antes de la carrera.
    // Alertar en rojo a 3 meses vista genera ruido sin valor operativo.
    //
    //  > 30 días:  sin alertas de voluntarios (proceso en curso, normal)
    //  8–30 días:  avisos amarillos (conviene ir confirmando)
    //  ≤ 7 días:   críticas rojas (la carrera es inminente, hay que actuar ya)
    if (diasHasta <= volDiasCritico) {
      // Semana de carrera — cualquier hueco es crítico
      if (coberturaVol < 50)
        alertasCriticas.push({ icon:"🔴", texto:`Cobertura de voluntarios crítica: ${coberturaVol}%`, modulo:"voluntarios" });
      if (puestosAlerta.length > 0) {
        const resumen = puestosAlerta.map(p => `${p.nombre} (${p.asig}/${p.necesarios})`).join(", ");
        alertasCriticas.push({ icon:"🔴", texto:`${puestosAlerta.length} puesto${puestosAlerta.length>1?"s":""} con cobertura crítica: ${resumen}`, modulo:"voluntarios" });
      }
      if (puestosBajos.length > 0) {
        const resumen = puestosBajos.map(p => `${p.nombre} (${p.asig}/${p.necesarios})`).join(", ");
        alertasCriticas.push({ icon:"🟡", texto:`${puestosBajos.length} puesto${puestosBajos.length>1?"s":""} sin cobertura completa: ${resumen}`, modulo:"voluntarios" });
      }
    } else if (diasHasta <= volDiasAviso) {
      // Mes previo — avisos para ir gestionando
      if (coberturaVol < 50)
        alertasAvisos.push({ icon:"🟡", texto:`Cobertura de voluntarios al ${coberturaVol}% — conviene confirmar puestos`, modulo:"voluntarios" });
      if (puestosAlerta.length > 0) {
        const resumen = puestosAlerta.map(p => `${p.nombre} (${p.asig}/${p.necesarios})`).join(", ");
        alertasAvisos.push({ icon:"🟡", texto:`${puestosAlerta.length} puesto${puestosAlerta.length>1?"s":""} pendientes de cubrir: ${resumen}`, modulo:"voluntarios" });
      }
    }
    // > 30 días: sin alertas de voluntarios — es pronto para preocuparse
    if (resultado < 0)
      alertasCriticas.push({ icon:"🔴", texto:`Resultado negativo: ${fmtEur(resultado)}`, modulo:"presupuesto" });
    if (docsVencidos.length > 0)
      alertasCriticas.push({ icon:"🔴", texto:`${docsVencidos.length} documento${docsVencidos.length>1?"s":""} vencido${docsVencidos.length>1?"s":""}: ${docsVencidos.map(d=>d.nombre).slice(0,2).join(", ")}${docsVencidos.length>2?"...":""}`, modulo:"documentos" });
    if (docsProxVencer.length > 0)
      alertasAvisos.push({ icon:"🟡", texto:`${docsProxVencer.length} documento${docsProxVencer.length>1?"s":""} por vencer en ≤30 días`, modulo:"documentos" });
    // Gestiones legales — máxima prioridad
    if (gestionesDenegadas.length > 0)
      alertasCriticas.push({ icon:"🚫", texto:`Gestión${gestionesDenegadas.length>1?"es":""} denegada${gestionesDenegadas.length>1?"s":""}: ${gestionesDenegadas.map(g=>g.nombre).join(", ")}`, modulo:"documentos" });
    if (gestionesVencidas.length > 0)
      alertasCriticas.push({ icon:"🔴", texto:`Permiso${gestionesVencidas.length>1?"s":""} vencido${gestionesVencidas.length>1?"s":""} sin aprobar: ${gestionesVencidas.map(g=>g.nombre).slice(0,2).join(", ")}${gestionesVencidas.length>2?"...":""}`, modulo:"documentos" });
    if (gestionesUrgentes.length > 0)
      alertasAvisos.push({ icon:"🏛️", texto:`${gestionesUrgentes.length} gestión${gestionesUrgentes.length>1?"es":""} legal${gestionesUrgentes.length>1?"es":""} con plazo ≤30 días: ${gestionesUrgentes.map(g=>g.nombre).slice(0,2).join(", ")}${gestionesUrgentes.length>2?"...":""}`, modulo:"documentos" });
    if (tareasBloqueadas > 0)
      alertasAvisos.push({ icon:"🟡", texto:`${tareasBloqueadas} tareas bloqueadas`, modulo:"proyecto" });
    if (diasHasta <= volDiasAviso && coberturaVol >= 50 && coberturaVol < 80)
      alertasAvisos.push({ icon:"🟡", texto:`Cobertura de voluntarios al ${coberturaVol}% — quedan ${diasHasta} días`, modulo:"voluntarios" });
    if (volPendientes > 0)
      alertasAvisos.push({ icon:"🔵", texto:`${volPendientes} voluntarios pendientes de confirmar`, modulo:"voluntarios" });
    if (patComprometido < objetivo*0.5)
      alertasAvisos.push({ icon:"🟡", texto:`Patrocinio al ${Math.round(patComprometido/objetivo*100)}% del objetivo`, modulo:"patrocinadores" });
    if (contPendientes > 0)
      alertasAvisos.push({ icon:"🔵", texto:`${contPendientes} contraprestaciones pendientes`, modulo:"patrocinadores" });
    if (patsSinSeguimiento.length > 0)
      alertasAvisos.push({ icon:"📞", texto:`${patsSinSeguimiento.length} patrocinador${patsSinSeguimiento.length!==1?"es":""} con seguimiento vencido: ${patsSinSeguimiento.slice(0,2).map(p=>p.nombre).join(", ")}${patsSinSeguimiento.length>2?"...":""}`, modulo:"patrocinadores" });
    if (stockAlerts.length > 0)
      alertasAvisos.push({ icon:"🟡", texto:`${stockAlerts.length} materiales con sobreasignación de stock`, modulo:"logistica" });
    if (materialesBajoMinimo.length > 0)
      alertasAvisos.push({ icon:"📦", texto:`${materialesBajoMinimo.length} material${materialesBajoMinimo.length!==1?"es":""} por debajo del stock mínimo: ${materialesBajoMinimo.slice(0,2).map(m=>m.nombre).join(", ")}${materialesBajoMinimo.length>2?"...":""}`, modulo:"logistica" });
    hitosProximos.forEach(h => {
      const dias = Math.ceil((new Date(h.fecha) - TODAY) / 86400000);
      if (dias <= 14 && dias >= 0 && h.critico)
        alertasAvisos.push({ icon:"⚡", texto:`Hito crítico en ${dias}d: ${h.nombre}`, modulo:"proyecto" });
    });

    const eventoFechaStr = eventoFecha.toLocaleDateString("es-ES", { day:"2-digit", month:"long", year:"numeric" });

    return {
      eventoNombre, eventoEdicion, eventoFechaStr,
      eventoFecha,
      diasHasta, yaFue, esSemana,
      totalInscritos, inscritosPorDist, totalIngresos, totalCostesFijos, totalCostesVars,
      totalIngresosExtra, merchBeneficio, totalOtrosIngresos, resultado, roiGlobal,
      maximosPorDist, ocupacionPorDist, ocupacionGlobal, totalMaximos,
      voluntarios: voluntarios.length, volConfirmados, volPendientes, totalNecesarios, coberturaVol, puestosAlerta,
      pats: pats.length, patComprometido, patCobrado, patPipeline, objetivo, contPendientes, patsSinSeguimiento,
      material: material.length, stockAlerts, materialesBajoMinimo, tlDone, tlTotal: tl.length, ckDone, ckTotal: ck.length,
      tareasTotal, tareasCompletadas, tareasBloqueadas, tareasVencidas, progresoGlobal, hitosProximos,
      saludModulos, saludGlobal,
      alertasCriticas, alertasAvisos,
      docsVencidos, docsProxVencer,
      tramos, rawInscritos: inscritos, syncConfig,
    };
  }, [rawData]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{BLOCK_CSS + DASH_EXTRA_CSS}</style>
        <div className="block-container">
          {/* Header skeleton */}
          <div className="block-header" style={{ marginBottom:"1rem" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:".4rem" }}>
              <div className="skel" style={{ width:160, height:20 }} />
              <div className="skel" style={{ width:120, height:12 }} />
            </div>
          </div>
          {/* Barra de salud skeleton */}
          <div className="card" style={{ marginBottom:"1rem", padding:"1rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".65rem" }}>
              <div className="skel" style={{ width:140, height:14 }} />
              <div className="skel" style={{ width:48, height:20 }} />
            </div>
            <div className="skel" style={{ width:"100%", height:8, borderRadius:99 }} />
          </div>
          {/* KPI grid skeleton — 6 cards */}
          <div className="kpi-grid mb">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="kpi" style={{ gap:".5rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div className="skel" style={{ width:80, height:11 }} />
                  <div className="skel" style={{ width:20, height:11, borderRadius:99 }} />
                </div>
                <div className="skel" style={{ width:"60%", height:28 }} />
                <div className="skel" style={{ width:"85%", height:10 }} />
                <div className="skel" style={{ width:"100%", height:4, borderRadius:99, marginTop:".25rem" }} />
              </div>
            ))}
          </div>
          {/* Timeline skeleton */}
          <div className="card" style={{ marginBottom:"1rem", padding:".85rem 1rem" }}>
            <div className="skel" style={{ width:120, height:13, marginBottom:".75rem" }} />
            {[1,2,3].map(i => (
              <div key={i} style={{ display:"flex", gap:".65rem", alignItems:"center", marginBottom:".5rem" }}>
                <div className="skel" style={{ width:42, height:11, flexShrink:0 }} />
                <div className="skel" style={{ flex:1, height:11 }} />
                <div className="skel" style={{ width:60, height:11, flexShrink:0 }} />
              </div>
            ))}
          </div>
          {/* Alertas skeleton */}
          <div className="card" style={{ padding:".75rem 1rem" }}>
            <div className="skel" style={{ width:100, height:13, marginBottom:".65rem" }} />
            {[1,2].map(i => (
              <div key={i} style={{ display:"flex", gap:".5rem", alignItems:"center", marginBottom:".4rem" }}>
                <div className="skel" style={{ width:16, height:16, borderRadius:"50%", flexShrink:0 }} />
                <div className="skel" style={{ flex:1, height:11 }} />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  const d = data;
  const resColor = d.resultado >= 0 ? "var(--green)" : "var(--red)";
  const saludColor = d.saludGlobal >= 80 ? "var(--green)" : d.saludGlobal >= 55 ? "var(--amber)" : "var(--red)";
  const saludLabel = d.saludGlobal >= 80 ? "Evento en buen estado" : d.saludGlobal >= 55 ? "Atención requerida" : "Acción urgente necesaria";

  return (
    <>
      <style>{BLOCK_CSS + DASH_EXTRA_CSS}</style>
      <div className="block-container">

        {/* ── HEADER ── */}
        <div className="block-header">
          <div>
            <h1 className="block-title">📊 Dashboard</h1>
            <div className="block-title-sub" style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
              {d.eventoNombre} · {d.eventoEdicion}
              {/* Dot de refresco silencioso */}
              <span className={`dash-sync-dot ${refreshing ? "dash-sync-pulsing" : ""}`}
                title={lastUpdated ? `Actualizado a las ${lastUpdated.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}` : "Sin datos"} />
              {lastUpdated && (
                <span className="mono" style={{ fontSize:"0.52rem", color:"var(--text-dim)" }}>
                  {lastUpdated.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}
                </span>
              )}
            </div>
          </div>

        </div>

        {/* ── Banner de escenario activo — SIEMPRE PRIMERO ── */}
        {d.scenarioActivo && (
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            gap:".75rem", padding:".7rem 1rem", marginBottom:".85rem",
            borderRadius:8, flexWrap:"wrap",
            background:"rgba(251,191,36,.1)",
            border:"2px solid rgba(251,191,36,.4)",
            boxShadow:"0 0 0 4px rgba(251,191,36,.06)",
          }}>
            <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
              <span style={{fontSize:"var(--fs-lg)"}}>🔬</span>
              <div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",fontWeight:800,
                  color:"var(--amber)",textTransform:"uppercase",letterSpacing:".06em"}}>
                  ⚠️ MODO ESCENARIO ACTIVO
                </div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>
                  Escenario «{d.scenarioActivo}» activo en Presupuesto. Este Dashboard siempre muestra <strong>datos reales</strong>, no del escenario.
                </div>
              </div>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"presupuesto"}}))}
              style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".28rem .65rem",
                borderRadius:6,border:"1px solid rgba(251,191,36,.4)",
                background:"rgba(251,191,36,.15)",color:"var(--amber)",cursor:"pointer",
                flexShrink:0,whiteSpace:"nowrap",fontWeight:700}}>
              Ver en Presupuesto →
            </button>
          </div>
        )}

                {/* ── SPRINT 2.3: Botón DíaCarrera prominente ≤7 días ── */}
        {d.esSemana && !d.yaFue && (
          <div
            onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "diaCarrera" } }))}
            style={{
              display: "flex", alignItems: "center", gap: ".75rem",
              padding: ".85rem 1rem", marginBottom: ".85rem",
              borderRadius: 10, cursor: "pointer",
              background: "linear-gradient(135deg, rgba(248,113,113,0.14) 0%, rgba(251,191,36,0.10) 100%)",
              border: "2px solid rgba(248,113,113,0.45)",
              boxShadow: "0 0 0 4px rgba(248,113,113,0.07), 0 4px 20px rgba(248,113,113,0.15)",
              animation: "teg-slidein .3s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(248,113,113,0.22) 0%, rgba(251,191,36,0.14) 100%)"}
            onMouseLeave={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(248,113,113,0.14) 0%, rgba(251,191,36,0.10) 100%)"}
          >
            <span style={{ fontSize: "2rem", lineHeight: 1 }}>🏁</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: "var(--fs-base)", color: "#f87171", letterSpacing: "-.01em" }}>
                {d.diasHasta === 0 ? "¡HOY ES EL EVENTO!" : `¡FALTAN ${d.diasHasta} DÍAS!`}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                Abrir Panel Día de Carrera →
              </div>
            </div>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
              color: "#f87171", background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6,
              padding: ".3rem .65rem", flexShrink: 0,
            }}>⚡ Abrir</div>
          </div>
        )}

        {/* ── HERO: COUNTDOWN + SALUD ── */}
        <div className={`dash-hero card mb ${d.esSemana ? "dash-hero-urgente" : ""}`}>
          <div className="dash-hero-bg" />
          <div className="dash-hero-content">
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"1rem", flexWrap:"wrap" }}>

              {/* Countdown */}
              <div>
                <div className="dash-eyebrow mono xs muted">
                  {d.yaFue ? `🏁 ${d.eventoNombre} ${d.eventoEdicion} · COMPLETADO` : `🏔️ ${d.eventoNombre} ${d.eventoEdicion}`}
                </div>
                <div className="dash-countdown">
                  {d.yaFue
                    ? <span className="dash-countdown-num" style={{ fontSize:"var(--fs-xl)" }}>¡Completado!</span>
                    : <>
                        <span className="dash-countdown-num">{d.diasHasta}</span>
                        <span className="dash-countdown-label mono muted">
                          {d.esSemana ? "⚡ días — ¡SEMANA DE CARRERA!" : "días para la carrera"}
                        </span>
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                          color:"var(--cyan)", marginTop:".4rem", letterSpacing:".02em" }}>
                          📅 {d.eventoFechaStr}
                        </div>
                      </>
                  }
                </div>

              </div>

              {/* Barra de salud del evento — colapsada si todo va bien */}
              <div className="dash-salud-box">
                <button
                  onClick={() => setSaludExpandida(v => !v)}
                  style={{ width:"100%", background:"none", border:"none", cursor:"pointer",
                    padding:0, textAlign:"left" }}>
                  <div style={{ display:"flex", alignItems:"center",
                    justifyContent:"space-between", marginBottom: saludExpandida ? "0.5rem" : 0 }}>
                    <div className="mono xs muted" style={{ textTransform:"uppercase",
                      letterSpacing:"0.08em", fontSize:"var(--fs-xs)" }}>
                      Salud del evento
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                      <span className="dash-salud-score" style={{ color: saludColor, fontSize:"var(--fs-md)" }}>
                        {d.saludGlobal}%
                      </span>
                      <span className="mono" style={{ color: saludColor, fontSize:"var(--fs-sm)" }}>
                        {saludExpandida ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>
                  {!saludExpandida && (
                    <div className="mono xs" style={{ color: saludColor }}>
                      {saludLabel}
                    </div>
                  )}
                </button>
                {saludExpandida && (
                  <>
                    <div className="mono xs" style={{ color: saludColor, marginBottom:"0.6rem" }}>
                      {saludLabel}
                    </div>
                    <div className="dash-salud-bars">
                      {d.saludModulos.map(m => (
                        <div key={m.label}
                          className="dash-salud-bar-row"
                          onClick={() => navigate(m.bloque)}
                          title={`Ir a ${m.label}`}>
                          <span className="dash-salud-bar-icon">{m.icon}</span>
                          <div className="dash-salud-bar-track">
                            <div className="dash-salud-bar-fill"
                              style={{ width:`${m.score}%`, background: m.color }} />
                          </div>
                          <span className="mono" style={{ fontSize:"var(--fs-xs)", color: m.color,
                            minWidth:28, textAlign:"right" }}>{m.score}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── HAZ ESTO AHORA ─────────────────────────────────────────────── */}
        {(() => {
          // Generar lista de acciones concretas priorizadas
          const acciones = [];

          // 1. Alertas críticas — solo si no hay acciones específicas mejores
          // No las duplicamos aquí porque ya aparecen en el panel de alertas.
          // Solo añadimos la más crítica si no hay ninguna otra acción concreta.

          // 2. Tramo de inscripción cerrando pronto
          const hoy = new Date();
          const tramosAbiertos = (d.tramos||[]).filter(t => {
            const fin = new Date(t.fechaFin);
            const dias = Math.ceil((fin - hoy) / 86400000);
            return dias >= 0 && dias <= 5;
          });
          tramosAbiertos.forEach(t => {
            const dias = Math.ceil((new Date(t.fechaFin) - hoy) / 86400000);
            acciones.push({
              prioridad: "alta",
              icon: "⏰",
              accion: `Tramo "${t.nombre}" cierra en ${dias} día${dias!==1?"s":""}`,
              cta: "Ver inscripciones",
              modulo: "presupuesto",
            });
          });

          // 3. Voluntarios pendientes de confirmar
          if (d.volPendientes > 0 && d.diasHasta <= 30) {
            acciones.push({
              prioridad: d.diasHasta <= 7 ? "critica" : "alta",
              icon: "👥",
              accion: `Confirmar ${d.volPendientes} voluntario${d.volPendientes!==1?"s":""} pendiente${d.volPendientes!==1?"s":""}`,
              cta: "Ir a voluntarios",
              modulo: "voluntarios",
            });
          }

          // 4. Puestos sin cubrir
          if (d.puestosAlerta?.length > 0 && d.diasHasta <= 45) {
            const pp = d.puestosAlerta[0];
            acciones.push({
              prioridad: "alta",
              icon: "🚩",
              accion: `"${pp.nombre}" sin cobertura — ${pp.asig||0}/${pp.necesarios} asignados`,
              cta: "Gestionar puestos",
              modulo: "voluntarios",
            });
          }

          // 5. Patrocinio lejos del objetivo
          if (d.patComprometido < d.objetivo * 0.5 && d.diasHasta <= 60) {
            const pct = d.objetivo > 0 ? Math.round(d.patComprometido/d.objetivo*100) : 0;
            acciones.push({
              prioridad: "alta",
              icon: "🤝",
              accion: `Patrocinio al ${pct}% — quedan ${fmtEur(d.objetivo - d.patComprometido)} por conseguir`,
              cta: "Ver patrocinadores",
              modulo: "patrocinadores",
            });
          }

          // 6. Contraprestaciones pendientes
          if (d.contPendientes > 0) {
            acciones.push({
              prioridad: "media",
              icon: "📋",
              accion: `${d.contPendientes} contraprestación${d.contPendientes!==1?"es":""} de patrocinadores sin entregar`,
              cta: "Ver contraprestaciones",
              modulo: "patrocinadores",
            });
          }

          // 7. Tareas vencidas
          if (d.tareasVencidas > 0) {
            acciones.push({
              prioridad: "alta",
              icon: "📌",
              accion: `${d.tareasVencidas} tarea${d.tareasVencidas!==1?"s":""} vencida${d.tareasVencidas!==1?"s":""}`,
              cta: "Ver proyecto",
              modulo: "proyecto",
            });
          }

          // 8. Hito crítico próximo
          const hitoCritico = d.hitosProximos?.find(h => h.critico && Math.ceil((new Date(h.fecha)-hoy)/86400000) <= 14);
          if (hitoCritico) {
            const dias = Math.ceil((new Date(hitoCritico.fecha)-hoy)/86400000);
            acciones.push({
              prioridad: dias <= 7 ? "critica" : "alta",
              icon: "⚡",
              accion: `Hito crítico en ${dias}d: "${hitoCritico.nombre}"`,
              cta: "Ver proyecto",
              modulo: "proyecto",
            });
          }

          // 9. Stock insuficiente
          if (d.stockAlerts?.length > 0) {
            acciones.push({
              prioridad: "media",
              icon: "📦",
              accion: `${d.stockAlerts.length} material${d.stockAlerts.length!==1?"es":""} con stock insuficiente`,
              cta: "Ver logística",
              modulo: "logistica",
            });
          }

          // Fallback: si no hay acciones concretas pero sí alertas críticas, añadir las 2 primeras
          if (acciones.length === 0 && d.alertasCriticas.length > 0) {
            d.alertasCriticas.slice(0,2).forEach(a => {
              acciones.push({ prioridad:"critica", icon:a.icon, accion:a.texto,
                cta:`Ir a ${a.modulo}`, modulo:a.modulo });
            });
          }

          // Solo mostrar si hay acciones
          if (acciones.length === 0) return null;

          const top = acciones.slice(0, 5);
          const colorPrio = { critica: "var(--red)", alta: "var(--amber)", media: "var(--cyan)" };
          const bgPrio    = { critica: "var(--red-dim)", alta: "var(--amber-dim)", media: "var(--cyan-dim)" };

          return (
            <div className="card mb" style={{ padding:0, overflow:"hidden" }}>
              <div style={{ padding:".75rem 1rem .5rem", borderBottom:"1px solid var(--border)",
                display:"flex", alignItems:"center", gap:".5rem" }}>
                <span style={{ fontSize:"var(--fs-base)" }}>🎯</span>
                <span style={{ fontWeight:800, fontSize:"var(--fs-base)", color:"var(--text)" }}>Haz esto ahora</span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                  background:"var(--surface2)", padding:".1rem .4rem", borderRadius:4, marginLeft:"auto" }}>
                  {acciones.length} acción{acciones.length!==1?"es":""}
                </span>
              </div>
              {top.map((ac, i) => (
                <div key={i}
                  onClick={() => navigate(ac.modulo)}
                  style={{ display:"flex", alignItems:"center", gap:".75rem",
                    padding:".65rem 1rem", cursor:"pointer", transition:"background .12s",
                    borderBottom: i < top.length-1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
                    background: bgPrio[ac.prioridad],
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"var(--fs-base)" }}>
                    {ac.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"var(--fs-base)", fontWeight:600, color:"var(--text)",
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {ac.accion}
                    </div>
                  </div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    color: colorPrio[ac.prioridad], fontWeight:700, flexShrink:0,
                    background: bgPrio[ac.prioridad], padding:".15rem .5rem", borderRadius:4 }}>
                    {ac.cta} →
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── ALERTAS CRÍTICAS — Kinetik Ops style ── */}
        {d.alertasCriticas.length > 0 && (
          <div className="dash-alertas-criticas mb" role="alert">
            {/* Header con contador */}
            <div className="dash-alertas-header">
              <div style={{ display:"flex", alignItems:"center", gap:".5rem" }}>
                <div className="dash-alert-warning-icon">⚠</div>
                <span style={{ textTransform:"uppercase", letterSpacing:".08em" }}>
                  {d.alertasCriticas.length} Alerta{d.alertasCriticas.length !== 1 ? "s" : ""} Crítica{d.alertasCriticas.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            {/* Filas de alerta */}
            {d.alertasCriticas.map((a, i) => (
              <div key={i} className="dash-alerta dash-alerta-danger dash-alerta-clickable"
                onClick={() => navigate(a.modulo)}>
                {/* Icono de warning */}
                <div className="dash-alert-icon-wrap dash-alert-icon-danger">
                  <span style={{ fontSize:"var(--fs-sm)", lineHeight:1 }}>⚠</span>
                </div>
                {/* Texto */}
                <div className="dash-alerta-body">
                  <span className="dash-alerta-text">{a.texto}</span>
                  <span className="dash-alerta-modulo">{a.modulo}</span>
                </div>
                {/* CTA */}
                <button className="dash-alert-cta dash-alert-cta-danger"
                  onClick={e => { e.stopPropagation(); navigate(a.modulo); }}>
                  Ver →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── AVISOS — Kinetik Ops style ── */}
        {d.alertasAvisos.length > 0 && (
          <div className="dash-avisos-container mb">
            <button className="dash-avisos-toggle"
              onClick={() => {
                const next = !alertasExpandidas;
                setAlertasExpandidas(next);
                localStorage.setItem("teg_dash_alertas_open", next?"1":"0");
              }}>
              <div style={{ display:"flex", alignItems:"center", gap:".45rem" }}>
                <div className="dash-alert-warning-icon dash-alert-warning-icon-amber">⚡</div>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                  fontWeight:700, color:"var(--amber)", textTransform:"uppercase",
                  letterSpacing:".06em" }}>
                  {d.alertasAvisos.length} Aviso{d.alertasAvisos.length !== 1 ? "s" : ""}
                </span>
              </div>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                color:"var(--text-dim)", transition:"transform .2s",
                display:"inline-block",
                transform: alertasExpandidas ? "rotate(180deg)" : "rotate(0deg)" }}>
                ▼
              </span>
            </button>
            {alertasExpandidas && (
              <div className="dash-avisos-list">
                {d.alertasAvisos.map((a, i) => (
                  <div key={i}
                    className={`dash-alerta ${a.icon==="🔵" ? "dash-alerta-info" : "dash-alerta-warning"} dash-alerta-clickable`}
                    onClick={() => navigate(a.modulo)}>
                    <div className={`dash-alert-icon-wrap ${a.icon==="🔵" ? "dash-alert-icon-info" : "dash-alert-icon-warning"}`}>
                      <span style={{ fontSize:"var(--fs-sm)", lineHeight:1 }}>
                        {a.icon==="🔵" ? "ℹ" : "⚡"}
                      </span>
                    </div>
                    <div className="dash-alerta-body">
                      <span className="dash-alerta-text">{a.texto}</span>
                      <span className="dash-alerta-modulo">{a.modulo}</span>
                    </div>
                    <button className={`dash-alert-cta ${a.icon==="🔵" ? "dash-alert-cta-info" : "dash-alert-cta-warning"}`}
                      onClick={e => { e.stopPropagation(); navigate(a.modulo); }}>
                      Ver →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* Estado OK — Kinetik Ops style */}
        {d.alertasCriticas.length === 0 && d.alertasAvisos.length === 0 && (
          <div className="card mb" style={{
            padding:".7rem 1rem",
            background:"rgba(52,211,153,0.05)",
            border:"1px solid rgba(52,211,153,0.2)",
            borderLeft:"3px solid var(--green)",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:".65rem", marginBottom:".5rem" }}>
              <div style={{
                width:26, height:26, borderRadius:6, flexShrink:0,
                background:"rgba(52,211,153,0.15)", border:"1px solid rgba(52,211,153,0.3)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"var(--fs-sm)", color:"var(--green)",
              }}>✓</div>
              <span style={{ fontFamily:"var(--font-mono)", fontWeight:800,
                fontSize:"var(--fs-sm)", color:"var(--green)", textTransform:"uppercase",
                letterSpacing:".08em" }}>
                Todo en orden
              </span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                color:"var(--text-dim)", marginLeft:"auto" }}>
                sin alertas activas
              </span>
            </div>
            <div style={{ display:"flex", gap:".75rem", flexWrap:"wrap" }}>
              {d.totalInscritos > 0 && (
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--cyan)" }}>
                  🏃 {d.totalInscritos} inscritos
                  {d.ocupacionGlobal !== null ? ` (${d.ocupacionGlobal}%)` : ""}
                </span>
              )}
              {d.coberturaVol > 0 && (
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--green)" }}>
                  👥 {d.coberturaVol}% voluntarios
                </span>
              )}
              {d.resultado > 0 && (
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--green)" }}>
                  💰 {fmtEur(d.resultado)} resultado
                </span>
              )}
              {d.progresoGlobal > 0 && (
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--violet)" }}>
                  📋 {d.progresoGlobal}% tareas
                </span>
              )}
            </div>
          </div>
        )}



        {/* ── KPIs — Sprint 2.1 KPIs accionables ── */}
        <div className="kpi-grid mb">
          <KPI icon="💰" label="Resultado"
            tooltip="Ingresos totales (inscripciones + patrocinios + merch) menos costes fijos y variables.\nPositivo = superávit. Negativo = déficit."
            value={fmtEur(d.resultado)}
            sub={(() => {
              const totalCostes = d.totalCostesFijos + d.totalCostesVars;
              if (d.resultado >= 0) return totalCostes > 0 ? `✓ Por encima del punto de equilibrio (+${fmtEur(d.resultado)})` : `Ingresos: ${fmtEur(d.totalIngresos + d.totalOtrosIngresos)}`;
              const pctFaltante = totalCostes > 0 ? Math.round(Math.abs(d.resultado) / totalCostes * 100) : 0;
              return `⚠ Déficit del ${pctFaltante}% — Costes: ${fmtEur(totalCostes)}`;
            })()}
            color={resColor} colorClass={d.resultado >= 0 ? "green" : "red"}
            progress={d.resultado >= 0 && (d.totalCostesFijos+d.totalCostesVars) > 0
              ? Math.min(100, Math.round(d.resultado / (d.totalCostesFijos+d.totalCostesVars) * 100))
              : undefined}
            onClick={() => navigate("presupuesto")} />
          <KPI icon="🏃" label="Inscritos"
            tooltip="Corredores inscritos en todos los tramos y distancias.\nEl denominador es el aforo máximo configurado en Presupuesto → Inscripciones."
            value={d.ocupacionGlobal !== null ? `${d.ocupacionGlobal}%` : (d.totalInscritos > 0 ? String(d.totalInscritos) : "—")}
            sub={(() => {
              if (d.totalMaximos > 0 && d.totalInscritos < d.totalMaximos) {
                const libres = d.totalMaximos - d.totalInscritos;
                return `Quedan ${libres} plazas libres de ${d.totalMaximos}`;
              }
              if (d.ocupacionGlobal >= 100) return "✓ Aforo completo";
              if (d.totalInscritos > 0) return `TG7 ${d.inscritosPorDist.TG7} · TG13 ${d.inscritosPorDist.TG13} · TG25 ${d.inscritosPorDist.TG25}`;
              return "Sin inscritos aún — ir a Presupuesto";
            })()}
            color="var(--cyan)" colorClass="cyan"
            progress={d.ocupacionGlobal}
            onClick={() => navigate("presupuesto", "inscritos")} />
          <KPI icon="👥" label="Voluntarios"
            tooltip="Voluntarios confirmados sobre el total de plazas necesarias definidas en los puestos.\nEl % es la cobertura global: confirmados ÷ necesarios."
            value={d.totalNecesarios > 0 ? `${d.coberturaVol}%` : (d.volConfirmados > 0 ? String(d.volConfirmados) : "—")}
            sub={(() => {
              if (d.totalNecesarios === 0) return "Sin puestos definidos — ir a Voluntarios";
              if (d.coberturaVol >= 100) return "✓ Cobertura completa";
              const faltan = d.totalNecesarios - d.volConfirmados;
              return `Faltan ${faltan} voluntario${faltan !== 1 ? "s" : ""} para el 100%`;
            })()}
            color={d.totalNecesarios===0?"var(--text-muted)":d.coberturaVol>=80?"var(--green)":d.coberturaVol>=50?"var(--amber)":"var(--red)"}
            colorClass={d.totalNecesarios===0?"muted":d.coberturaVol>=80?"green":d.coberturaVol>=50?"amber":"red"}
            progress={d.totalNecesarios>0?d.coberturaVol:undefined}
            onClick={() => navigate("voluntarios")} />
          <KPI icon="🤝" label="Patrocinio"
            tooltip="Importe comprometido (confirmado + cobrado) de todos los patrocinadores activos.\nEl % indica el avance respecto al objetivo de captación.\nEl importe cobrado es el dinero realmente recibido."
            value={`${Math.round(d.patComprometido/Math.max(d.objetivo,1)*100)}%`}
            sub={(() => {
              const pct = d.objetivo > 0 ? Math.round(d.patComprometido / d.objetivo * 100) : 0;
              if (pct >= 100) return `✓ Objetivo superado · ${fmtEur(d.patCobrado)} cobrado`;
              const faltan = d.objetivo - d.patComprometido;
              return `Faltan ${fmtEur(faltan)} para el objetivo · ${fmtEur(d.patCobrado)} cobrado`;
            })()}
            color={d.patComprometido>=d.objetivo*0.8?"var(--green)":d.patComprometido>=d.objetivo*0.5?"var(--amber)":"var(--red)"}
            colorClass={d.patComprometido>=d.objetivo*0.8?"green":d.patComprometido>=d.objetivo*0.5?"amber":"red"}
            progress={d.objetivo>0?Math.min(100,Math.round(d.patComprometido/d.objetivo*100)):undefined}
            onClick={() => navigate("patrocinadores")} />
          <KPI icon="📋" label="Tareas"
            tooltip="Tareas completadas del bloque Proyecto sobre el total.\nIncluye todas las áreas: permisos, logística, comunicación, etc."
            value={d.tareasTotal > 0 ? `${d.progresoGlobal}%` : "—"}
            sub={(() => {
              if (d.tareasTotal === 0) return "Sin tareas definidas — ir a Proyecto";
              if (d.tareasVencidas > 0) return `⚠ ${d.tareasVencidas} tarea${d.tareasVencidas !== 1 ? "s" : ""} vencida${d.tareasVencidas !== 1 ? "s" : ""} — acción urgente`;
              if (d.progresoGlobal >= 100) return "✓ Todas las tareas completadas";
              return `${d.tareasCompletadas}/${d.tareasTotal} completadas · sin vencidas`;
            })()}
            color={d.tareasTotal===0?"var(--text-muted)":"var(--violet)"} colorClass={d.tareasTotal===0?"muted":"violet"}
            progress={d.tareasTotal>0?d.progresoGlobal:undefined}
            onClick={() => navigate("proyecto")} />
          <KPI icon="✅" label="Checklist"
            tooltip="Ítems completados del checklist de Logística sobre el total.\nEl checklist se organiza por fases temporales antes del evento."
            value={d.ckTotal > 0 ? `${Math.round(d.ckDone/d.ckTotal*100)}%` : "—"}
            sub={(() => {
              if (d.ckTotal === 0) return "Sin checklist definido — ir a Logística";
              if (d.ckDone >= d.ckTotal) return "✓ Checklist completado";
              const pendientes = d.ckTotal - d.ckDone;
              return `${pendientes} ítem${pendientes !== 1 ? "s" : ""} pendiente${pendientes !== 1 ? "s" : ""} · Timeline: ${d.tlDone}/${d.tlTotal}`;
            })()}
            color={d.ckTotal===0?"var(--text-muted)":"var(--cyan)"} colorClass={d.ckTotal===0?"muted":"cyan"}
            progress={d.ckTotal>0?Math.round(d.ckDone/d.ckTotal*100):undefined}
            onClick={() => navigate("logistica")} />
        </div>

        {/* ── SPRINT 2.2: Mini-desglose económico ── */}
        {(d.totalIngresos > 0 || d.totalCostesFijos > 0) && (
          <MiniDesglose
            totalIngresos={d.totalIngresos}
            totalIngresosExtra={d.totalIngresosExtra}
            merchBeneficio={d.merchBeneficio}
            totalCostesFijos={d.totalCostesFijos}
            totalCostesVars={d.totalCostesVars}
            resultado={d.resultado}
            roiGlobal={d.roiGlobal}
            navigate={navigate}
          />
        )}

        {/* ── CHARTS ── */}
        <div className="dash-charts-row mb">

          {/* Inscritos */}
          <div className="card dash-chart-card">
            <div className="card-title cyan">🏃 Inscritos por distancia</div>
            {d.totalInscritos === 0
              ? <EmptyChart mensaje="Sin inscritos aún" sub="Introduce datos en Presupuesto → Inscritos" />
              : <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={[
                          { name:"TG7",  value: d.inscritosPorDist.TG7  || 0 },
                          { name:"TG13", value: d.inscritosPorDist.TG13 || 0 },
                          { name:"TG25", value: d.inscritosPorDist.TG25 || 0 },
                        ]} cx="50%" cy="50%" innerRadius={36} outerRadius={55} paddingAngle={3} dataKey="value">
                        {["#22d3ee","#a78bfa","#34d399"].map((c,i) => <Cell key={i} fill={c} opacity={0.9} />)}
                      </Pie>
                      <RechartsTip contentStyle={TOOLTIP_STYLE} formatter={(v,n) => [`${v} corredores`,n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.35rem" }}>
                    {[["TG7","#22d3ee"],["TG13","#a78bfa"],["TG25","#34d399"]].map(([dist,color]) => {
                      const ins = d.inscritosPorDist[dist];
                      const max = d.maximosPorDist[dist];
                      const pct = d.ocupacionPorDist[dist];
                      return (
                        <div key={dist}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.12rem" }}>
                            <span className="mono xs bold" style={{ color }}>{dist}</span>
                            <span className="mono xs muted">{ins}{max>0?`/${max} (${pct}%)`:"corredores"}</span>
                          </div>
                          {max > 0 && (
                            <div style={{ height:3, background:"var(--surface3)", borderRadius:2, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:color, borderRadius:2, transition:"width .5s" }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
            }
          </div>

          {/* Ingresos vs Costes — barras horizontales legibles en mobile */}
          <div className="card dash-chart-card">
            <div className="card-title violet">💰 Ingresos vs Costes</div>
            {d.totalIngresos === 0 && d.totalCostesFijos === 0
              ? <EmptyChart mensaje="Sin datos económicos" sub="Configura costes e inscritos en Presupuesto" />
              : (() => {
                  const items = [
                    { label:"Inscripciones", val:d.totalIngresos,      color:"#22d3ee", tipo:"+" },
                    { label:"Patrocinios",   val:d.totalIngresosExtra,  color:"#34d399", tipo:"+" },
                    { label:"Merch",         val:d.merchBeneficio,     color:"#a78bfa", tipo:"+" },
                    { label:"C. Fijos",      val:d.totalCostesFijos,   color:"#f87171", tipo:"-" },
                    { label:"C. Variables",  val:d.totalCostesVars,    color:"#fb923c", tipo:"-" },
                  ];
                  const maxVal = Math.max(...items.map(i => i.val), 1);
                  return (
                    <div style={{ display:"flex", flexDirection:"column", gap:".5rem", marginTop:".25rem" }}>
                      {items.map(item => {
                        const pct = Math.min(Math.round(item.val / maxVal * 100), 100);
                        return (
                          <div key={item.label}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:".18rem" }}>
                              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>
                                {item.tipo === "+" ? "↑" : "↓"} {item.label}
                              </span>
                              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:item.color, fontWeight:700 }}>
                                {fmtEur(item.val)}
                              </span>
                            </div>
                            <div style={{ height:5, background:"var(--surface3)", borderRadius:3, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${pct}%`, background:item.color,
                                borderRadius:3, opacity:item.val <= 0 ? 0.3 : 0.85, transition:"width .5s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
            }
            {/* Resultado — resumen al pie del gráfico */}
            {(d.totalIngresos > 0 || d.totalCostesFijos > 0) && (
              <div style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                marginTop:".6rem", paddingTop:".5rem",
                borderTop:"1px solid var(--border)",
              }}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  color:"var(--text-muted)",display:"flex",alignItems:"center",gap:".4rem"}}>
                  Resultado
                  <span className={`badge ${d.roiGlobal>=0?"badge-green":"badge-red"}`}
                    style={{fontSize:"var(--fs-2xs)"}}>
                    Margen {d.roiGlobal>0?"+":""}{d.roiGlobal}%
                  </span>
                </span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-base)",
                  fontWeight:800,color:resColor}}>
                  {fmtEur(d.resultado)}
                </span>
              </div>
            )}
          </div>

          {/* Arco temporal del evento — reemplaza "Objetivos clave" */}
          <MiniTimeline
            hitos={d.hitosProximos}
            tramos={d.tramos}
            eventoFecha={d.eventoFecha}
            diasHasta={d.diasHasta}
            yaFue={d.yaFue}
            navigate={navigate}
          />
        </div>

        {/* ── PRÓXIMOS HITOS ── */}
        {d.hitosProximos.length > 0 && (
          <div className="card mb">
            <div className="flex-between mb-sm">
              <div className="card-title" style={{ marginBottom:0 }}>📅 Próximos Hitos</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("proyecto")}>Ver todos →</button>
            </div>
            {d.hitosProximos.map(h => {
              const dias = Math.ceil((new Date(h.fecha) - new Date()) / 86400000);
              const c    = dias<0?"#ff4444":dias===0?"var(--red)":dias<=7?"var(--orange)":dias<=30?"var(--amber)":"var(--green)";
              const label = dias < 0 ? `Vencido (${Math.abs(dias)}d)` : dias===0 ? "HOY" : `${dias}d`;
              return (
                <div key={h.id} className="dash-hito dash-hito-clickable"
                  onClick={() => navigate("proyecto")}>
                  <div className="flex-center gap-sm" style={{ flex:1, minWidth:0 }}>
                    <div className="dash-hito-gem" style={{ background: h.completado?"#34d399":h.critico?"#f87171":"#22d3ee" }} />
                    {h.critico && !h.completado && <span className="xs">⚡</span>}
                    <span className="sm bold" style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                      textDecoration: h.completado?"line-through":"none", opacity: h.completado?0.5:1 }}>
                      {h.nombre}
                    </span>
                  </div>
                  <div className="flex-center gap-sm" style={{ flexShrink:0 }}>
                    <span className="mono xs muted">{fmtD(h.fecha)}</span>
                    <span className="mono xs bold" style={{ color:c, minWidth:40, textAlign:"right" }}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── WIDGET INSCRITOS — al final, contexto correcto ── */}
        <WidgetInscritos tramos={d.tramos} inscritos={d.rawInscritos}
          onSave={async (tramoId, newVals) => {
            const next = { ...d.rawInscritos, tramos: { ...(d.rawInscritos?.tramos || {}), [tramoId]: newVals } };
            await dataService.set("teg_presupuesto_v1_inscritos", next);
            window.dispatchEvent(new CustomEvent("teg-sync"));
          }}
        />

      </div>
    </>
  );
}

// ─── Sprint 2.2: Mini-desglose económico ────────────────────────────────────
function MiniDesglose({ totalIngresos, totalIngresosExtra, merchBeneficio, totalCostesFijos, totalCostesVars, resultado, roiGlobal, navigate }) {
  const [open, setOpen] = useState(false);
  const totalIng = totalIngresos + totalIngresosExtra + merchBeneficio;
  const totalCostes = totalCostesFijos + totalCostesVars;
  const resColor = resultado >= 0 ? "var(--green)" : "var(--red)";

  return (
    <div className="card mb" style={{
      padding: 0, overflow: "hidden",
      borderLeft: `3px solid ${resColor}`,
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: ".65rem",
          padding: ".65rem 1rem", textAlign: "left",
        }}
      >
        <span style={{ fontSize: "var(--fs-base)" }}>💰</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".07em" }}>Desglose económico</span>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: 2 }}>
            Ingresos: <span style={{ color: "var(--green)" }}>{fmtEur(totalIngresos)}</span>
            {" · "}
            Costes: <span style={{ color: "var(--red)" }}>{fmtEur(totalCostes)}</span>
          </div>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 800, color: resColor, flexShrink: 0 }}>
          {resultado >= 0 ? "+" : ""}{fmtEur(resultado)}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", transition: "transform .2s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--border)", padding: ".65rem 1rem", display: "flex", flexDirection: "column", gap: ".4rem" }}>
          {[
            { label: "Inscripciones", val: totalIngresos,      color: "#22d3ee", tipo: "+" },
            { label: "Patrocinios",   val: totalIngresosExtra,  color: "#34d399", tipo: "+" },
            { label: "Merchandising", val: merchBeneficio,      color: "#a78bfa", tipo: "+" },
            { label: "Costes fijos",  val: totalCostesFijos,    color: "#f87171", tipo: "-" },
            { label: "Costes var.",   val: totalCostesVars,     color: "#fb923c", tipo: "-" },
          ].map(item => {
            const max = Math.max(totalIngresos, totalCostes, 1);
            const pct = Math.min(Math.round(item.val / max * 100), 100);
            return (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".15rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>{item.tipo === "+" ? "↑" : "↓"} {item.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: item.color, fontWeight: 700 }}>{fmtEur(item.val)}</span>
                </div>
                <div style={{ height: 4, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: item.color, opacity: item.val <= 0 ? 0.2 : 0.8, borderRadius: 2, transition: "width .5s" }} />
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: ".3rem", paddingTop: ".45rem", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: ".4rem" }}>
              Margen
              <span className={`badge ${roiGlobal >= 0 ? "badge-green" : "badge-red"}`} style={{ fontSize: "var(--fs-2xs)" }}>{roiGlobal > 0 ? "+" : ""}{roiGlobal}%</span>
            </span>
            <button onClick={() => navigate("presupuesto")} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Ver en Presupuesto →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function KPI({ icon, label, value, sub, color, colorClass, onClick, tooltip, progress }) {
  return (
    <div
      className={`kpi ${colorClass||""}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", paddingBottom: progress !== undefined ? "0.85rem" : "1rem" }}
      title={onClick ? `Ir a ${label}` : undefined}
    >
      {/* Label uppercase con icono y tooltip */}
      <div className="kpi-label" style={{ display:"flex", alignItems:"center", gap:5 }}>
        <span style={{ opacity:0.7 }}>{icon}</span>
        <span>{label}</span>
        {tooltip && <Tooltip text={tooltip}><TooltipIcon size={10}/></Tooltip>}
      </div>

      {/* Valor principal — número ultra-bold Kinetik */}
      <div className="kpi-value" style={{ color }}>{value}</div>

      {/* Subtexto secundario */}
      <div className="kpi-sub">{sub}</div>

      {/* Progress bar siempre visible en la base si se pasa progress */}
      {progress !== undefined && (
        <div className="kpi-progress">
          <div
            className="kpi-progress-fill"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: color,
              boxShadow: `0 0 6px ${color}80`,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── MiniTimeline — arco temporal del evento ─────────────────────────────────
function MiniTimeline({ hitos, tramos, eventoFecha, diasHasta, yaFue, navigate }) {
  const hoy = new Date();

  // Rango: inicio = hoy - 90d (o primer fechaFin de tramo si es antes), fin = evento + 14d
  const primerTramo = tramos?.length > 0
    ? new Date(Math.min(...tramos.map(t => new Date(t.fechaFin).getTime())))
    : null;
  const inicio = primerTramo && primerTramo < hoy
    ? new Date(primerTramo.getTime() - 7 * 86400000)
    : new Date(hoy.getTime() - 60 * 86400000);
  const fin = eventoFecha
    ? new Date(new Date(eventoFecha).getTime() + 14 * 86400000)
    : new Date(hoy.getTime() + 30 * 86400000);
  const totalMs = fin - inicio;

  const pct = (fecha) => {
    if (!fecha) return null;
    const p = (new Date(fecha) - inicio) / totalMs * 100;
    return Math.max(2, Math.min(98, p));
  };

  const hoyPct    = pct(hoy);
  const eventoPct = eventoFecha ? pct(eventoFecha) : null;

  // Hitos críticos con fecha válida dentro del rango
  const hitosMarcados = (hitos || [])
    .filter(h => h.fecha && !h.completado)
    .map(h => ({ ...h, p: pct(h.fecha) }))
    .filter(h => h.p !== null)
    .slice(0, 6);

  // Tramos: barras de apertura
  const tramosValidos = (tramos || [])
    .filter(t => t.fechaFin)
    .map(t => ({ ...t, p: pct(t.fechaFin) }))
    .filter(t => t.p !== null);

  const fmtFecha = (d) => new Date(d).toLocaleDateString("es-ES", { day:"2-digit", month:"short" });

  return (
    <div className="card dash-chart-card" style={{ padding:"0.85rem" }}>
      <div className="card-title amber" style={{ marginBottom:".85rem" }}>📅 Arco temporal</div>

      {/* Barra principal del timeline */}
      <div style={{ position:"relative", height:56, margin:"0.4rem 0 0.6rem" }}>

        {/* Track fondo */}
        <div style={{ position:"absolute", top:24, left:0, right:0, height:4,
          background:"var(--surface3)", borderRadius:2 }} />

        {/* Relleno hasta el evento */}
        {eventoPct !== null && (
          <div style={{ position:"absolute", top:24, left:0, width:`${eventoPct}%`,
            height:4, borderRadius:2, opacity:0.5,
            background:"linear-gradient(90deg, var(--cyan), var(--violet))",
            transition:"width .5s" }} />
        )}

        {/* Cierres de tramo — líneas verticales pequeñas */}
        {tramosValidos.map(t => (
          <div key={t.id} title={`Cierre tramo: ${t.nombre}`}
            style={{ position:"absolute", top:18, left:`${t.p}%`,
              width:2, height:12, background:"rgba(34,211,238,0.35)",
              transform:"translateX(-50%)", borderRadius:1 }} />
        ))}

        {/* Hitos críticos — diamantes */}
        {hitosMarcados.map(h => (
          <div key={h.id}
            title={`${h.nombre} — ${fmtFecha(h.fecha)}`}
            onClick={() => navigate("proyecto")}
            style={{ position:"absolute", top:h.critico ? 14 : 17,
              left:`${h.p}%`, transform:"translateX(-50%) rotate(45deg)",
              width: h.critico ? 10 : 7, height: h.critico ? 10 : 7,
              background: h.critico ? "var(--amber)" : "var(--violet)",
              border:"1.5px solid var(--surface)",
              cursor:"pointer", borderRadius:1,
              boxShadow: h.critico ? "0 0 6px rgba(251,191,36,0.5)" : "none" }} />
        ))}

        {/* Marcador HOY */}
        <div style={{ position:"absolute", top:8, left:`${hoyPct}%`,
          transform:"translateX(-50%)", display:"flex", flexDirection:"column",
          alignItems:"center", gap:0 }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)",
            color:"var(--cyan)", fontWeight:800, letterSpacing:".04em",
            lineHeight:1, marginBottom:2 }}>HOY</div>
          <div style={{ width:2, height:24, background:"var(--cyan)",
            borderRadius:1, boxShadow:"0 0 8px rgba(34,211,238,0.5)" }} />
        </div>

        {/* Marcador del evento */}
        {eventoPct !== null && (
          <div title={yaFue ? "Evento completado" : "Día del evento"}
            style={{ position:"absolute", top:6, left:`${eventoPct}%`,
              transform:"translateX(-50%)", fontSize:"var(--fs-lg)",
              cursor:"default", lineHeight:1 }}>
            {yaFue ? "✅" : "🏁"}
          </div>
        )}
      </div>

      {/* Leyenda inferior */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
        <span>{fmtFecha(inicio)}</span>
        <span style={{
          color: yaFue ? "var(--green)" : diasHasta <= 7 ? "var(--red)" : diasHasta <= 30 ? "var(--amber)" : "var(--cyan)",
          fontWeight:700, fontSize:"var(--fs-sm)",
        }}>
          {yaFue ? "¡Evento completado!" : diasHasta === 0 ? "¡HOY es el evento!" : `${diasHasta}d para el evento`}
        </span>
        {eventoFecha && <span>{fmtFecha(eventoFecha)}</span>}
      </div>

      {/* Mini-lista de próximos hitos críticos */}
      {hitosMarcados.filter(h => h.critico).length > 0 && (
        <div style={{ marginTop:".65rem", paddingTop:".5rem",
          borderTop:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:".25rem" }}>
          {hitosMarcados.filter(h => h.critico).slice(0, 3).map(h => {
            const dias = Math.ceil((new Date(h.fecha) - hoy) / 86400000);
            const col  = dias < 0 ? "var(--red)" : dias <= 7 ? "var(--amber)" : "var(--text-muted)";
            return (
              <div key={h.id} onClick={() => navigate("proyecto")}
                style={{ display:"flex", justifyContent:"space-between", cursor:"pointer",
                  padding:".15rem .1rem", borderRadius:3 }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
                  ⚡ {h.nombre}
                </span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:col, fontWeight:700, flexShrink:0, marginLeft:".5rem" }}>
                  {dias < 0 ? `${Math.abs(dias)}d atrás` : dias === 0 ? "HOY" : `${dias}d`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyChart({ mensaje, sub }) {
  return (
    <div className="dash-empty-chart">
      <div className="dash-empty-icon">📊</div>
      <div className="mono xs bold" style={{ color:"var(--text-muted)" }}>{mensaje}</div>
      {sub && <div className="mono" style={{ fontSize:"var(--fs-xs)", color:"var(--text-dim)", marginTop:"0.25rem", textAlign:"center", lineHeight:1.4 }}>{sub}</div>}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  background:"var(--bg)", border:"1px solid #1e2d50",
  borderRadius:8, fontSize:"var(--fs-sm)", fontFamily:"var(--font-mono)",
};

const DASH_EXTRA_CSS = `
  @keyframes teg-spin    { to { transform:rotate(360deg); } }
  @keyframes teg-pulse   { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes teg-slidein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

  /* Sync dot */
  .dash-sync-dot {
    width:6px; height:6px; border-radius:50%;
    background:var(--green); opacity:0.7; flex-shrink:0;
    transition: background 0.3s;
  }
  .dash-sync-pulsing { animation:teg-pulse 1s ease infinite; background:var(--cyan); }

  /* Hero */
  .dash-hero { position:relative; overflow:hidden; padding:1.25rem; }
  .dash-hero-bg {
    position:absolute; inset:0; pointer-events:none;
    background:
      radial-gradient(ellipse 80% 60% at 50% -10%, rgba(34,211,238,0.12) 0%, transparent 55%),
      radial-gradient(ellipse 40% 30% at 85% 80%, rgba(167,139,250,0.08) 0%, transparent 50%);
  }
  .dash-hero-content { position:relative; z-index:1; animation: dash-hero-enter 0.45s cubic-bezier(0.34,1.2,0.64,1) both; }
  @keyframes dash-hero-enter {
    from { opacity:0; transform:translateY(12px) scale(0.98); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  .dash-hero-urgente { border-color:rgba(248,113,113,0.4) !important; }
  .dash-hero-urgente .dash-hero-bg { background:radial-gradient(ellipse 70% 50% at 50% 0%, rgba(248,113,113,0.1) 0%, transparent 60%) !important; }
  .dash-countdown { display:flex; align-items:baseline; gap:0.5rem; margin-bottom:0.6rem; }
  .dash-countdown-num {
    font-family:'Syne',sans-serif; font-size:4.5rem; font-weight:900; line-height:.85;
    background: linear-gradient(135deg, #ffffff 0%, #22d3ee 40%, #a78bfa 80%, #f472b6 100%);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    filter: drop-shadow(0 0 32px rgba(34,211,238,0.25));
    letter-spacing: -0.04em;
  }
  .dash-countdown-label { font-family:var(--font-mono); font-size:0.72rem; color:var(--text-muted); }
  @media(max-width:480px){ .dash-countdown-num{ font-size:3rem; } }

  /* Salud del evento */
  .dash-salud-box {
    background:var(--surface2); border:1px solid var(--border);
    border-radius:var(--r-sm); padding:0.85rem 1rem; min-width:200px; flex-shrink:0;
  }
  .dash-salud-score {
    font-family:'Syne',sans-serif; font-size:1.8rem; font-weight:800; line-height:1; margin-bottom:0.2rem;
  }
  .dash-salud-bars { display:flex; flex-direction:column; gap:0.3rem; }
  .dash-salud-bar-row {
    display:flex; align-items:center; gap:0.4rem; cursor:pointer;
    padding:0.1rem 0.2rem; border-radius:3px; transition:background .12s;
  }
  .dash-salud-bar-row:hover { background:rgba(255,255,255,0.04); }
  .dash-salud-bar-icon { font-size:0.75rem; width:16px; text-align:center; }
  .dash-salud-bar-track { flex:1; height:4px; background:var(--surface3); border-radius:2px; overflow:hidden; }
  .dash-salud-bar-fill  { height:100%; border-radius:2px; transition:width .5s; }

  /* ── Alertas — Kinetik Ops style ── */
  /* Contenedor alertas críticas */
  .dash-alertas-criticas {
    border-radius: var(--r);
    overflow: hidden;
    border: 1px solid rgba(248,113,113,0.25);
    background: rgba(248,113,113,0.04);
    animation: teg-slidein 0.25s ease;
    margin-bottom: 1rem;
  }
  .dash-alertas-header {
    padding: 0.55rem 1rem;
    background: rgba(248,113,113,0.09);
    border-bottom: 1px solid rgba(248,113,113,0.15);
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--red);
    letter-spacing: 0.08em;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .dash-alertas-criticas .dash-alerta {
    margin: 0; border-radius: 0; border: none;
    border-bottom: 1px solid rgba(248,113,113,0.08);
  }
  .dash-alertas-criticas .dash-alerta:last-child { border-bottom: none; }

  /* Icono de warning estilo Kinetik — triángulo */
  .dash-alert-warning-icon {
    width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0;
    background: rgba(248,113,113,0.15);
    border: 1px solid rgba(248,113,113,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: .7rem; color: var(--red); font-weight: 900;
  }
  .dash-alert-warning-icon-amber {
    background: rgba(251,191,36,0.12);
    border-color: rgba(251,191,36,0.25);
    color: var(--amber);
  }

  /* Icono inline por fila de alerta */
  .dash-alert-icon-wrap {
    width: 22px; height: 22px; border-radius: 5px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .dash-alert-icon-danger  { background: rgba(248,113,113,0.15); color: var(--red);    border: 1px solid rgba(248,113,113,0.25); }
  .dash-alert-icon-warning { background: rgba(251,191,36,0.12);  color: var(--amber);  border: 1px solid rgba(251,191,36,0.22); }
  .dash-alert-icon-info    { background: rgba(34,211,238,0.1);   color: var(--cyan);   border: 1px solid rgba(34,211,238,0.2); }

  /* Cuerpo del texto */
  .dash-alerta-body {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: .1rem;
  }
  .dash-alerta-text {
    font-family: var(--font-mono); font-size: 0.68rem;
    line-height: 1.4; color: inherit;
  }
  .dash-alerta-modulo {
    font-family: var(--font-mono); font-size: 0.58rem;
    color: var(--text-dim); text-transform: uppercase; letter-spacing: .06em;
  }

  /* Botón CTA inline */
  .dash-alert-cta {
    flex-shrink: 0;
    padding: .2rem .6rem; border-radius: 20px;
    font-family: var(--font-mono); font-size: .6rem; font-weight: 700;
    letter-spacing: .04em; cursor: pointer; border: 1px solid;
    transition: all .15s; white-space: nowrap;
  }
  .dash-alert-cta-danger  { color: var(--red);   border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.08); }
  .dash-alert-cta-danger:hover  { background: rgba(248,113,113,0.18); }
  .dash-alert-cta-warning { color: var(--amber); border-color: rgba(251,191,36,0.3);  background: rgba(251,191,36,0.08); }
  .dash-alert-cta-warning:hover { background: rgba(251,191,36,0.18); }
  .dash-alert-cta-info    { color: var(--cyan);  border-color: rgba(34,211,238,0.3);  background: rgba(34,211,238,0.08); }
  .dash-alert-cta-info:hover    { background: rgba(34,211,238,0.18); }

  /* Contenedor de avisos */
  .dash-avisos-container {
    background: var(--surface);
    border: 1px solid rgba(251,191,36,0.2);
    border-left: 3px solid var(--amber);
    border-radius: var(--r);
    overflow: hidden;
  }
  .dash-avisos-toggle {
    display: flex; justify-content: space-between; align-items: center;
    width: 100%; background: none; border: none; cursor: pointer;
    padding: .65rem 1rem;
    transition: background .15s;
  }
  .dash-avisos-toggle:hover { background: rgba(251,191,36,0.04); }
  .dash-avisos-list {
    border-top: 1px solid rgba(251,191,36,0.12);
    display: flex; flex-direction: column;
  }

  /* Fila base de alerta */
  .dash-alerta {
    display: flex; align-items: center; gap: .65rem;
    padding: .55rem 1rem;
  }
  .dash-alerta-danger  { color: var(--red);   }
  .dash-alerta-warning { color: var(--amber); }
  .dash-alerta-info    { color: var(--cyan);  }
  .dash-alerta-clickable { cursor: pointer; transition: background .12s; }
  .dash-alerta-clickable:hover { background: rgba(255,255,255,0.03); }

  /* Kinetik: KPIs clickables */
  .dash-kpi-clickable { cursor: pointer; }

  /* Charts */
  .dash-charts-row {
    display:grid; grid-template-columns:repeat(3,1fr); gap:0.85rem;
  }
  @media(max-width:700px)  { .dash-charts-row { grid-template-columns:1fr; } }
  @media(min-width:701px) and (max-width:900px) {
    .dash-charts-row { grid-template-columns:1fr 1fr; }
    .dash-chart-card:last-child { grid-column:span 2; }
  }
  .dash-chart-card { padding:0.85rem !important; }

  /* Estado vacío en gráficos */
  .dash-empty-chart {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    height:160px; gap:0.4rem;
  }
  .dash-empty-icon { font-size:1.8rem; opacity:0.25; }

  /* Hitos */
  .dash-hito {
    display:flex; align-items:center; justify-content:space-between; gap:0.75rem;
    padding:0.45rem 0.3rem; border-bottom:1px solid rgba(30,45,80,0.35);
    border-radius:4px; transition:background .12s;
  }
  .dash-hito:last-child { border-bottom:none; }
  .dash-hito-clickable { cursor:pointer; }
  .dash-hito-clickable:hover { background:var(--surface2); }
  .dash-hito-gem {
    width:10px; height:10px; border-radius:2px; transform:rotate(45deg); flex-shrink:0;
  }

  /* Objetivos clickables */
  .dash-objetivo-row {
    padding:0.2rem 0.25rem; border-radius:3px; cursor:pointer; transition:background .12s;
  }
  .dash-objetivo-row:hover { background:rgba(255,255,255,0.04); }

  /* Grid 2 col */
  .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:0.85rem; }
  @media(max-width:700px) { .grid-2 { grid-template-columns:1fr; } }
`;

// ─── WIDGET EXPRESS DE INSCRITOS ───────────────────────────────────────────────
function WidgetInscritos({ tramos, inscritos, onSave }) {
  const [open, setOpen] = useState(false);
  // Por defecto, usa el último tramo creado (suele ser el 'actual')
  const defaultTramo = tramos && tramos.length > 0 ? tramos[tramos.length - 1].id : "";
  const [tramoSel, setTramoSel] = useState(defaultTramo);
  const [vals, setVals] = useState({ TG7:0, TG13:0, TG25:0 });
  const [saving, setSaving] = useState(false);

  // Sincronizar inputs si cambian de tramo o se abren
  useEffect(() => {
    if (open && tramoSel && inscritos?.tramos?.[tramoSel]) {
      const v = inscritos.tramos[tramoSel];
      setVals({ TG7: v.TG7||0, TG13: v.TG13||0, TG25: v.TG25||0 });
    } else if (open) {
      setVals({ TG7:0, TG13:0, TG25:0 });
    }
  }, [open, tramoSel, inscritos]);

  if (!tramos || tramos.length === 0) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(tramoSel, vals);
    setSaving(false);
    setOpen(false); // Colapsar tras éxito
  };

  return (
    <div className="card mb" style={{ padding:"0.6rem 1rem", borderLeft:"3px solid var(--cyan)" }}>
      <div 
        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", userSelect:"none" }}
        onClick={() => setOpen(!open)}
      >
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
          <span style={{ fontSize:"var(--fs-lg)" }}>🏃</span>
          <div>
            <div style={{ fontSize:"var(--fs-base)", fontWeight:700, color:"var(--cyan)" }}>Actualización rápida de inscritos</div>
            <div className="mono xs muted" style={{ marginTop:2 }}>Volcar datos de la plataforma externa al presupuesto</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ padding:"0.2rem 0.4rem", color:"var(--text-muted)" }}>{open ? "▲ Ocultar" : "▼ Actualizar"}</button>
      </div>

      {open && (
        <div style={{ marginTop:"0.8rem", paddingTop:"0.8rem", borderTop:"1px solid var(--border)", animation:"teg-fade 0.2s ease" }}>
          <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap" }}>
            
            <div style={{ flex:1, minWidth:200 }}>
              <label style={{ display:"block", fontSize:"var(--fs-xs)", fontFamily:"var(--font-mono)", fontWeight:700, textTransform:"uppercase", color:"var(--text-muted)", marginBottom:"0.3rem" }}>Tramo activo</label>
              <select 
                value={tramoSel} 
                onChange={e => setTramoSel(parseInt(e.target.value))}
                style={{ width:"100%", padding:"0.4rem 0.5rem", borderRadius:"6px", background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text)", outline:"none", fontFamily:"var(--font-display)", fontSize:"0.85rem" }}
              >
                {tramos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{ flex:2, display:"flex", gap:"0.6rem", flexWrap:"wrap" }}>
              {["TG7", "TG13", "TG25"].map(dist => (
                <div key={dist} style={{ flex:1, minWidth:80 }}>
                  <label style={{ display:"block", fontSize:"var(--fs-xs)", fontFamily:"var(--font-mono)", fontWeight:700, textTransform:"uppercase", color:"var(--cyan)", marginBottom:"0.3rem" }}>{dist}</label>
                  <input 
                    type="number" min="0" 
                    value={vals[dist]} 
                    onChange={e => setVals(prev => ({ ...prev, [dist]: Math.max(0, parseInt(e.target.value)||0) }))}
                    style={{ width:"100%", padding:"0.4rem 0.5rem", borderRadius:"6px", background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text)", outline:"none", fontFamily:"var(--font-mono)", fontSize:"0.85rem", textAlign:"right" }}
                  />
                </div>
              ))}
            </div>
            
            <div style={{ alignSelf:"flex-end" }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ height:34, padding:"0 1rem" }}>
                {saving ? "⏳" : "✓ Vuelco rápido"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
