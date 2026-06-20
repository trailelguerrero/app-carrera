/**
 * useDashboardKpis.js — Tarea 3.4 + Mejora 7
 * Encapsula todos los cálculos de KPIs del Dashboard.
 * Recibe rawData y devuelve el objeto data con métricas calculadas.
 *
 * MEJ-07: el useMemo monolítico (~300 líneas, deps [rawData]) se ha partido en
 * submemos por área. Cada área solo se recalcula cuando cambian SUS datos:
 *   - presupuesto: conceptos, tramos, inscritos, ingresosExtra, camisetas
 *   - voluntarios: voluntarios, puestos
 *   - patrocinadores: pats, obj
 *   - logistica: material, asigs, tl, ck, inc
 *   - proyecto: tareas, hitos
 *   - documentos: docs, gestiones
 *   - config: fecha, nombre, edición del evento
 *   - resultado final: composición de los anteriores + alertas + salud
 *
 * Cambiar un voluntario ya no recalcula logística ni presupuesto.
 */
import { useMemo } from "react";
import {
  calculateTotalInscritos,
  calculateIngresosPorDistancia,
  calculateCostesFijos,
  calculateCostesVariables,
  calculateResultado,
  calculateROI,
  calculateCamisetasPresupuesto,
  calculateMerchTotales,
  getImporteCobrado,
  getImporteComprometido,
} from "@/lib/budgetUtils";
import { fmtEur } from "@/lib/utils";
import { EVENT_DATE, CAMISETAS_SYNC_CONFIG_DEFAULT } from "@/constants/budgetConstants";
import { COSTE_DEFAULT as CAM_COSTE_DEFAULT, PRECIO_NO_CORREDOR_DEFAULT, FUENTES_DEFAULT as CAM_FUENTES_DEFAULT } from "@/components/camisetas/camisetasConstants";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { SK_EVENT_CONFIG as LS_KEY_CONFIG } from "@/constants/storageKeys"; // FIX-DEP: migrado desde alias deprecated
import {
  SK_PPTO_CONCEPTOS, SK_PPTO_TRAMOS, SK_PPTO_INSCRITOS, SK_PPTO_INGRESOS_EXTRA,
  SK_PPTO_MERCHANDISING, SK_PPTO_SYNC_CONFIG, SK_PPTO_CAM_SYNC_CONFIG, SK_PPTO_MAXIMOS, SK_PPTO_SCENARIO_ACTIVE,
  SK_VOL_VOLUNTARIOS, SK_VOL_PUESTOS,
  SK_PAT_PATS, SK_PAT_OBJ,
  SK_LOG_MAT, SK_LOG_ASIG, SK_LOG_TL, SK_LOG_CK, SK_LOG_INC,
  SK_PROY_TAREAS, SK_PROY_HITOS,
  SK_DOC_DOCS, SK_DOC_GESTIONES,
  SK_CAM_PEDIDOS, SK_CAM_COSTE, SK_CAM_CORREDORES, SK_CAM_PRECIO_PLATAFORMA,
  SK_CAM_NINO, SK_CAM_VENTA_PUBLICO, SK_CAM_NO_CORREDOR, SK_CAM_PRECIO_NO_CORREDOR, SK_CAM_INCLUIR_PENDIENTES,
  SK_CAM_FUENTES,
} from "@/constants/storageKeys";

// Helper estable (no cambia entre renders) para leer rawData con fallback
function makeGetter(d) {
  return function get(key, def) {
    const v = d[key];
    if (v === undefined || v === null) return def;
    if (Array.isArray(def) && !Array.isArray(v)) return def;
    return v;
  };
}

export function useDashboardKpis(rawData, volDiasCritico, volDiasAviso) {
  // ── Extraer slices de rawData una sola vez ──────────────────────────────
  // Cada submemo depende solo de su slice, no de rawData completo.
  const d = rawData ?? {};
  const get = makeGetter(d);

  // Extraer primitivos/arrays estables para usar como deps de submemos
  const rawConfig       = d[LS_KEY_CONFIG];
  const rawConceptos    = d[SK_PPTO_CONCEPTOS];
  const rawTramos       = d[SK_PPTO_TRAMOS];
  const rawInscritos    = d[SK_PPTO_INSCRITOS];
  const rawSyncConfig   = d[SK_PPTO_SYNC_CONFIG];
  const rawIngresosExtra= d[SK_PPTO_INGRESOS_EXTRA];
  const rawMerchandising= d[SK_PPTO_MERCHANDISING];
  const rawMaximos      = d[SK_PPTO_MAXIMOS];
  const rawScenario     = d[SK_PPTO_SCENARIO_ACTIVE];
  const rawPats         = d[SK_PAT_PATS];
  const rawPatObj       = d[SK_PAT_OBJ];
  const rawVoluntarios  = d[SK_VOL_VOLUNTARIOS];
  const rawPuestos      = d[SK_VOL_PUESTOS];
  const rawMaterial     = d[SK_LOG_MAT];
  const rawAsigs        = d[SK_LOG_ASIG];
  const rawTl           = d[SK_LOG_TL];
  const rawCk           = d[SK_LOG_CK];
  const rawInc          = d[SK_LOG_INC];
  const rawTareas       = d[SK_PROY_TAREAS];
  const rawHitos        = d[SK_PROY_HITOS];
  const rawDocs         = d[SK_DOC_DOCS];
  const rawGestiones    = d[SK_DOC_GESTIONES];
  const rawCamPedidos   = d[SK_CAM_PEDIDOS];
  const rawCamCoste     = d[SK_CAM_COSTE];
  const rawCamCorredores= d[SK_CAM_CORREDORES];
  const rawCamPrecioPlat= d[SK_CAM_PRECIO_PLATAFORMA];
  const rawCamNino      = d[SK_CAM_NINO];
  const rawCamVentaPub  = d[SK_CAM_VENTA_PUBLICO];
  // ECO-08: no-corredores (plataforma) + sync config de las 6 categorías de camisetas
  const rawCamNoCorredor    = d[SK_CAM_NO_CORREDOR];
  const rawCamPrecioNoCorr  = d[SK_CAM_PRECIO_NO_CORREDOR];
  // ECO-11: respeta el toggle "incluir pendientes" del módulo Camisetas — antes este
  // hook siempre contaba confirmado+pendiente sin consultarlo, desincronizado del
  // panel informativo de Camisetas (y de useBudgetLogic, ya corregido igual).
  const rawCamInclPendientes = d[SK_CAM_INCLUIR_PENDIENTES];
  // AUD-CAM-04: fuentesActivas del módulo Camisetas, misma fuente que useBudgetLogic,
  // para que el desglose de "otros"/"regalos" respete extrasCorredor/extrasVoluntario/extrasNino.
  const rawCamFuentes = d[SK_CAM_FUENTES];
  const rawCamSyncConfig    = d[SK_PPTO_CAM_SYNC_CONFIG];

  // ── SUBMEMO: config del evento ──────────────────────────────────────────
  const configKpis = useMemo(() => {
    const cfg = { ...EVENT_CONFIG_DEFAULT, ...(rawConfig || {}) };
    const TODAY = new Date();
    const eventoFecha = cfg.fecha ? new Date(cfg.fecha) : EVENT_DATE;
    const diasHasta = Math.ceil((eventoFecha - TODAY) / 86400000);
    const yaFue = diasHasta < 0;
    const esSemana = diasHasta >= 0 && diasHasta <= cfg.volDiasCritico;
    const eventoFechaStr = eventoFecha.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
    return {
      cfg, eventoFecha, diasHasta, yaFue, esSemana, eventoFechaStr,
      eventoNombre: cfg.nombre, eventoEdicion: cfg.edicion,
      volDiasCritico: cfg.volDiasCritico, volDiasAviso: cfg.volDiasAviso,
    };
  }, [rawConfig]);

  // ── SUBMEMO: presupuesto ────────────────────────────────────────────────
  const presupuestoKpis = useMemo(() => {
    const conceptos   = Array.isArray(rawConceptos)    ? rawConceptos    : [];
    const tramos      = Array.isArray(rawTramos)       ? rawTramos       : [];
    const inscritos   = rawInscritos || { tramos: {} };
    const syncConfig  = { patrocinios: true, ...(rawSyncConfig || {}) };
    const camSyncConfig = { ...CAMISETAS_SYNC_CONFIG_DEFAULT, ...(rawCamSyncConfig || {}) };
    const ingresosExtra = Array.isArray(rawIngresosExtra) ? rawIngresosExtra : [];
    const maximos     = rawMaximos || {};
    const scenarioActivo = rawScenario ?? null;
    const merchandising = Array.isArray(rawMerchandising) ? rawMerchandising : [];

    const inscritosBU   = calculateTotalInscritos(tramos, inscritos);
    const ingresosBU    = calculateIngresosPorDistancia(tramos, inscritos);

    // ECO-08/ECO-09: desglose de camisetas en 6 categorías independientes con toggle propio,
    // misma fuente única de verdad que useBudgetLogic (calculateCamisetasPresupuesto).
    // Se calcula ANTES de costesFijosBU porque el gasto total de camisetas ahora se prorratea
    // como un coste fijo adicional (ver calculateCostesFijos, parámetro extraFijo).
    const _camVolActivos = (Array.isArray(rawVoluntarios) ? rawVoluntarios : [])
      .filter(v => (v.estado === "confirmado" || (rawCamInclPendientes && v.estado === "pendiente")) && v.talla);

    const camisetasDesglose = calculateCamisetasPresupuesto({
      camCoste: rawCamCoste || CAM_COSTE_DEFAULT,
      camPedidos: Array.isArray(rawCamPedidos) ? rawCamPedidos : [],
      corredoresExt: rawCamCorredores || {},
      precioCorrExt: rawCamPrecioPlat?.precio ?? 0,
      noCorredorExt: rawCamNoCorredor || {},
      precioNoCorrExt: rawCamPrecioNoCorr?.precio ?? PRECIO_NO_CORREDOR_DEFAULT,
      ventaPublico: rawCamVentaPub || { precio: 0, cantidad: 0 },
      voluntariosActivos: _camVolActivos,
      // ECO-11: ninoExt ahora SÍ llega al cálculo — antes faltaba este parámetro.
      ninoExt: rawCamNino || {},
      toggles: {
        corredores:   camSyncConfig.camCorredores,
        noCorredores: camSyncConfig.camNoCorredores,
        ventaPublico: camSyncConfig.camVentaPublico,
        otros:        camSyncConfig.camOtros,
        voluntarios:  camSyncConfig.camVoluntarios,
        regalos:      camSyncConfig.camRegalos,
        nino:         camSyncConfig.camNino,
      },
      // AUD-CAM-04 (fix Hallazgo 4): mismo fix que useBudgetLogic — filtra "otros"/"regalos"
      // por tipo respetando los 3 toggles del módulo Camisetas.
      fuentesExtras: {
        extrasCorredor:   rawCamFuentes?.extrasCorredor   ?? CAM_FUENTES_DEFAULT.extrasCorredor,
        extrasVoluntario: rawCamFuentes?.extrasVoluntario ?? CAM_FUENTES_DEFAULT.extrasVoluntario,
        extrasNino:       rawCamFuentes?.extrasNino       ?? CAM_FUENTES_DEFAULT.extrasNino,
      },
    });

    const costesFijosBU = calculateCostesFijos(conceptos, inscritosBU, camisetasDesglose.totalGastos);
    const costesVarsBU  = calculateCostesVariables(conceptos, inscritosBU);

    const totalInscritos     = inscritosBU.total;
    const inscritosPorDist   = { TG7: inscritosBU.TG7, TG13: inscritosBU.TG13, TG25: inscritosBU.TG25 };
    const totalIngresos      = ingresosBU.total;
    const totalCostesFijos   = costesFijosBU.total;
    const totalCostesVars    = costesVarsBU.total;
    const maximosPorDist     = { TG7: maximos?.TG7 || 0, TG13: maximos?.TG13 || 0, TG25: maximos?.TG25 || 0 };
    const totalMaximos       = maximosPorDist.TG7 + maximosPorDist.TG13 + maximosPorDist.TG25;
    const ocupacionPorDist   = {
      TG7:  maximosPorDist.TG7  > 0 ? Math.round(inscritosPorDist.TG7  / maximosPorDist.TG7  * 100) : null,
      TG13: maximosPorDist.TG13 > 0 ? Math.round(inscritosPorDist.TG13 / maximosPorDist.TG13 * 100) : null,
      TG25: maximosPorDist.TG25 > 0 ? Math.round(inscritosPorDist.TG25 / maximosPorDist.TG25 * 100) : null,
    };
    const ocupacionGlobal = totalMaximos > 0 ? Math.round(totalInscritos / totalMaximos * 100) : null;

    // Patrocinios live — fuente canónica: getImporteComprometido / getImporteCobrado (budgetUtils)
    // FIX-PAT-DUP: antes había 3 implementaciones inline del mismo cálculo.
    const _rawPatsSnap = Array.isArray(rawPats) ? rawPats : [];
    const _excluirPublicos = syncConfig?.subvencionPublica === true;
    const _totalPatLive = _rawPatsSnap
      .filter(p => !p.especie && (!_excluirPublicos || p.sector !== "Administración pública"))
      .reduce((s, p) => s + getImporteComprometido(p), 0);
    const _totalPatCobradoLive = _rawPatsSnap
      .filter(p => !p.especie && p.estado === "cobrado")
      .reduce((s, p) => s + getImporteCobrado(p), 0);
    const _totalSubvLive = _rawPatsSnap
      .filter(p => p.sector === "Administración pública" && !p.especie)
      .reduce((s, p) => s + getImporteComprometido(p), 0);

    const merchTotalesSnap = calculateMerchTotales(merchandising);
    // ECO-09: totalMerchBeneficio se mantiene como nombre histórico, pero ahora suma el
    // INGRESO BRUTO de camisetas (no el beneficio neto) + beneficio neto del merch local.
    // El gasto de camisetas ya no se resta aquí — vive en costesFijosBU (línea de arriba).
    const totalMerchBeneficio = camisetasDesglose.totalIngresos + merchTotalesSnap.beneficio;

    const totalIngresosExtra = ingresosExtra
      .filter(ie => ie.activo)
      .reduce((s, ie) => {
        if (ie.syncKey === "patrocinios")        return s + _totalPatLive;
        if (ie.syncKey === "patrociniosCobrado") return s + _totalPatCobradoLive;
        if (ie.syncKey === "subvencionPublica")  return s + _totalSubvLive;
        return s + (ie.valor || 0);
      }, 0);

    const totalIngresosConMerch = totalIngresosExtra + totalMerchBeneficio;
    const resultadoObj = calculateResultado(inscritosBU, ingresosBU, costesFijosBU, costesVarsBU, totalIngresosConMerch);
    const resultado = resultadoObj.total;
    const costes = totalCostesFijos + totalCostesVars;
    const totalIngresosBrutos = totalIngresos + totalIngresosExtra + totalMerchBeneficio;
    const roiGlobal = calculateROI(totalIngresosBrutos, costes);
    const totalOtrosIngresos = totalIngresosExtra + totalMerchBeneficio;

    return {
      conceptos, tramos, inscritos, syncConfig, camSyncConfig, scenarioActivo, maximos,
      totalInscritos, inscritosPorDist, totalIngresos, totalCostesFijos, totalCostesVars,
      maximosPorDist, ocupacionPorDist, ocupacionGlobal, totalMaximos,
      totalIngresosExtra, totalMerchBeneficio, totalOtrosIngresos,
      totalIngresosConMerch, resultado, roiGlobal, camisetasDesglose,
      merchBeneficio: totalMerchBeneficio,
    };
  }, [rawConceptos, rawTramos, rawInscritos, rawSyncConfig, rawCamSyncConfig, rawIngresosExtra,
      rawMerchandising, rawMaximos, rawScenario, rawPats,
      rawCamPedidos, rawCamCoste, rawCamCorredores, rawCamPrecioPlat,
      rawCamNino, rawCamVentaPub, rawCamNoCorredor, rawCamPrecioNoCorr, rawVoluntarios, rawCamInclPendientes, rawCamFuentes]);

  // ── SUBMEMO: voluntarios ────────────────────────────────────────────────
  const voluntariosKpis = useMemo(() => {
    const voluntarios = Array.isArray(rawVoluntarios) ? rawVoluntarios : [];
    const puestos     = Array.isArray(rawPuestos)     ? rawPuestos     : [];
    const volConfirmados  = voluntarios.filter(v => v.estado === "confirmado").length;
    const volPendientes   = voluntarios.filter(v => v.estado === "pendiente").length;
    const totalNecesarios = puestos.reduce((s, p) => s + p.necesarios, 0);
    const coberturaVol    = totalNecesarios > 0 ? Math.round(volConfirmados / totalNecesarios * 100) : 0;
    const puestosConCobertura = puestos.map(p => {
      const asig       = voluntarios.filter(v => v.puestoId === p.id && v.estado !== "cancelado").length;
      const confirmados= voluntarios.filter(v => v.puestoId === p.id && v.estado === "confirmado").length;
      const deficit    = Math.max(0, p.necesarios - asig);
      const pct        = p.necesarios > 0 ? Math.round(asig / p.necesarios * 100) : 100;
      return { ...p, asig, confirmados, deficit, pct };
    });
    const puestosAlerta = puestosConCobertura.filter(p => p.pct < 50);
    const puestosBajos  = puestosConCobertura.filter(p => p.pct >= 50 && p.pct < 100);
    return { voluntarios, volConfirmados, volPendientes, totalNecesarios, coberturaVol, puestosAlerta, puestosBajos };
  }, [rawVoluntarios, rawPuestos]);

  // ── SUBMEMO: patrocinadores ─────────────────────────────────────────────
  const patrociniosKpis = useMemo(() => {
    const TODAY = new Date();
    const objetivo = rawPatObj ?? 8000;
    const pats = Array.isArray(rawPats) ? rawPats : [];
    const patComprometido = pats.filter(p => !p.especie && (p.estado === "confirmado" || p.estado === "cobrado")).reduce((s, p) => s + (p.importe || 0), 0);
    const patCobrado  = pats.filter(p => !p.especie && p.estado === "cobrado").reduce((s, p) => s + getImporteCobrado(p), 0);
    const patPipeline = pats.filter(p => p.estado === "negociando" || p.estado === "prospecto").reduce((s, p) => s + (p.importe || 0), 0);
    const contPendientes = pats.reduce((s, p) => s + (p.contraprestaciones || []).filter(c => c.estado === "pendiente").length, 0);
    const patsSinSeguimiento = pats.filter(p =>
      p.estado === "negociando" && p.proximoContacto && new Date(p.proximoContacto) < TODAY
    );
    return { objetivo, pats, patComprometido, patCobrado, patPipeline, contPendientes, patsSinSeguimiento };
  }, [rawPats, rawPatObj]);

  // ── SUBMEMO: logística ──────────────────────────────────────────────────
  const logisticaKpis = useMemo(() => {
    const material = Array.isArray(rawMaterial) ? rawMaterial : [];
    const asigs    = Array.isArray(rawAsigs)    ? rawAsigs    : [];
    const tl       = Array.isArray(rawTl)       ? rawTl       : [];
    const ck       = Array.isArray(rawCk)       ? rawCk       : [];
    const inc      = Array.isArray(rawInc)      ? rawInc      : [];
    const tlDone   = tl.filter(t => t.estado === "completado").length;
    const ckDone   = ck.filter(c => c.estado === "completado").length;
    const incidenciasActivas = inc.filter(i => i.estado === "abierta").length;
    const stockAlerts = material.filter(m => {
      const asig = asigs.filter(a => a.materialId === m.id).reduce((s, a) => s + a.cantidad, 0);
      return asig > m.stock;
    });
    const materialesBajoMinimo = material.filter(m => m.stockMinimo > 0 && m.stock < m.stockMinimo);
    return { material, tlDone, tlTotal: tl.length, ckDone, ckTotal: ck.length, incidenciasActivas, stockAlerts, materialesBajoMinimo };
  }, [rawMaterial, rawAsigs, rawTl, rawCk, rawInc]);

  // ── SUBMEMO: proyecto ───────────────────────────────────────────────────
  const proyectoKpis = useMemo(() => {
    const TODAY = new Date();
    const tareas = Array.isArray(rawTareas) ? rawTareas : [];
    const hitos  = Array.isArray(rawHitos)  ? rawHitos  : [];
    const tareasTotal       = tareas.length;
    const tareasCompletadas = tareas.filter(t => t.estado === "completado").length;
    const tareasBloqueadas  = tareas.filter(t => t.estado === "bloqueado").length;
    const tareasVencidas    = tareas.filter(t => t.estado !== "completado" && t.fechaLimite && new Date(t.fechaLimite) < TODAY).length;
    const progresoGlobal    = tareasTotal > 0 ? Math.round(tareasCompletadas / tareasTotal * 100) : 0;
    const hitosProximos     = hitos.filter(h => !h.completado && h.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 20);
    return { tareas, tareasTotal, tareasCompletadas, tareasBloqueadas, tareasVencidas, progresoGlobal, hitosProximos };
  }, [rawTareas, rawHitos]);

  // ── SUBMEMO: documentos ─────────────────────────────────────────────────
  const documentosKpis = useMemo(() => {
    const TODAY = new Date();
    const _rawDocumentos = rawDocs;
    const documentos = Array.isArray(_rawDocumentos) ? _rawDocumentos : [];
    const gestiones  = Array.isArray(rawGestiones)   ? rawGestiones   : [];
    const diasHastaDoc = (iso) => iso ? Math.ceil((new Date(iso) - TODAY) / 86400000) : null;
    const docsVencidos    = documentos.filter(d => { const dias = diasHastaDoc(d.fechaVencimiento); return dias !== null && dias < 0 && d.estado !== "aprobado"; });
    const docsProxVencer  = documentos.filter(d => { const dias = diasHastaDoc(d.fechaVencimiento); return dias !== null && dias >= 0 && dias <= 30 && d.estado !== "aprobado"; });
    const gestionesDenegadas = gestiones.filter(g => g.estado === "denegado");
    const gestionesVencidas  = gestiones.filter(g => { const dias = diasHastaDoc(g.fechaVencimiento); return dias !== null && dias < 0 && g.estado !== "aprobado" && g.estado !== "denegado"; });
    const gestionesUrgentes  = gestiones.filter(g => { const dias = diasHastaDoc(g.fechaVencimiento); return dias !== null && dias >= 0 && dias <= 30 && g.estado !== "aprobado"; });
    return { documentos, gestiones, docsVencidos, docsProxVencer, gestionesDenegadas, gestionesVencidas, gestionesUrgentes };
  }, [rawDocs, rawGestiones]);

  // ── SUBMEMO FINAL: composición + alertas + salud ────────────────────────
  // Solo se recalcula cuando cambia alguno de los submemos anteriores.
  return useMemo(() => {
    const TODAY = new Date();
    const {
      eventoNombre, eventoEdicion, eventoFechaStr, eventoFecha,
      diasHasta, yaFue, esSemana,
      volDiasCritico: cfgVolDiasCritico, volDiasAviso: cfgVolDiasAviso,
    } = configKpis;

    const _volDiasCritico = volDiasCritico ?? cfgVolDiasCritico;
    const _volDiasAviso   = volDiasAviso   ?? cfgVolDiasAviso;

    const {
      totalInscritos, inscritosPorDist, totalIngresos, totalCostesFijos, totalCostesVars,
      maximosPorDist, ocupacionPorDist, ocupacionGlobal, totalMaximos,
      totalIngresosExtra, totalMerchBeneficio, totalOtrosIngresos,
      resultado, roiGlobal, camisetasDesglose, merchBeneficio,
      syncConfig, scenarioActivo, tramos, inscritos: rawInscritosVal,
    } = presupuestoKpis;

    const {
      voluntarios, volConfirmados, volPendientes, totalNecesarios, coberturaVol, puestosAlerta, puestosBajos,
    } = voluntariosKpis;

    const {
      objetivo, pats, patComprometido, patCobrado, patPipeline, contPendientes, patsSinSeguimiento,
    } = patrociniosKpis;

    const {
      material, tlDone, tlTotal, ckDone, ckTotal, incidenciasActivas, stockAlerts, materialesBajoMinimo,
    } = logisticaKpis;

    const {
      tareas, tareasTotal, tareasCompletadas, tareasBloqueadas, tareasVencidas, progresoGlobal, hitosProximos,
    } = proyectoKpis;

    const {
      documentos, gestiones, docsVencidos, docsProxVencer,
      gestionesDenegadas, gestionesVencidas, gestionesUrgentes,
    } = documentosKpis;

    // SALUD DEL EVENTO
    const saludModulos = [
      { label: "Proyecto",       icon: "🏔️", bloque: "proyecto",       score: progresoGlobal, color: progresoGlobal >= 80 ? "var(--green)" : progresoGlobal >= 50 ? "var(--amber)" : "var(--red)" },
      { label: "Voluntarios",    icon: "👥", bloque: "voluntarios",    score: coberturaVol,   color: coberturaVol >= 80 ? "var(--green)" : coberturaVol >= 50 ? "var(--amber)" : "var(--red)" },
      { label: "Logística",      icon: "📦", bloque: "logistica",      score: ckTotal > 0 ? Math.round(ckDone / ckTotal * 100) : 0, color: ckTotal === 0 ? "var(--text-muted)" : ckDone >= ckTotal * 0.8 ? "var(--green)" : ckDone >= ckTotal * 0.5 ? "var(--amber)" : "var(--red)" },
      { label: "Documentos",     icon: "📁", bloque: "documentos",     score: (() => { const total = documentos.length + gestiones.length; if (total === 0) return 100; const problemas = docsVencidos.length + gestionesDenegadas.length + gestionesVencidas.length; return Math.max(0, Math.round((1 - problemas / total) * 100)); })(), color: docsVencidos.length > 0 || gestionesDenegadas.length > 0 ? "var(--red)" : docsProxVencer.length > 0 || gestionesUrgentes.length > 0 ? "var(--amber)" : "var(--green)" },
      { label: "Presupuesto",    icon: "💰", bloque: "presupuesto",    score: resultado >= 0 ? 100 : Math.max(0, 100 + Math.round(resultado / Math.max(totalCostesFijos + totalCostesVars, 1) * 100)), color: resultado >= 0 ? "var(--green)" : resultado > -(totalCostesFijos + totalCostesVars) * 0.2 ? "var(--amber)" : "var(--red)" },
      { label: "Patrocinadores", icon: "🤝", bloque: "patrocinadores", score: objetivo > 0 ? Math.min(100, Math.round(patComprometido / objetivo * 100)) : 100, color: patComprometido >= objetivo * 0.8 ? "var(--green)" : patComprometido >= objetivo * 0.5 ? "var(--amber)" : "var(--red)" },
    ];
    const saludGlobal = Math.round(saludModulos.reduce((s, m) => s + m.score, 0) / saludModulos.length);

    // ALERTAS
    const alertasCriticas = [];
    const alertasAvisos   = [];

    if (tareasVencidas > 0)
      alertasCriticas.push({ icon: "🔴", texto: `${tareasVencidas} tarea${tareasVencidas !== 1 ? "s" : ""} vencida${tareasVencidas !== 1 ? "s" : ""} sin completar`, modulo: "proyecto" });
    const tareasProxVencer = tareas.filter(t => t.estado !== "completado" && t.estado !== "bloqueado" && t.fechaLimite && Math.ceil((new Date(t.fechaLimite) - TODAY) / 86400000) >= 0 && Math.ceil((new Date(t.fechaLimite) - TODAY) / 86400000) <= 7).length;
    if (tareasProxVencer > 0)
      alertasAvisos.push({ icon: "⚡", texto: `${tareasProxVencer} tarea${tareasProxVencer !== 1 ? "s" : ""} vence${tareasProxVencer === 1 ? "" : "n"} en ≤7 días`, modulo: "proyecto" });
    if (diasHasta >= 0 && diasHasta <= 7)
      alertasCriticas.push({ icon: "🏁", texto: `¡El evento es en ${diasHasta === 0 ? "HOY" : diasHasta + " días"}! Revisa el módulo Día de Carrera`, modulo: "diaCarrera" });
    if (diasHasta <= _volDiasCritico) {
      if (coberturaVol < 50) alertasCriticas.push({ icon: "🔴", texto: `Cobertura de voluntarios crítica: ${coberturaVol}%`, modulo: "voluntarios" });
      if (puestosAlerta.length > 0) alertasCriticas.push({ icon: "🔴", texto: `${puestosAlerta.length} puesto${puestosAlerta.length > 1 ? "s" : ""} con cobertura crítica: ${puestosAlerta.map(p => `${p.nombre} (${p.asig}/${p.necesarios})`).join(", ")}`, modulo: "voluntarios" });
      if (puestosBajos.length  > 0) alertasCriticas.push({ icon: "🟡", texto: `${puestosBajos.length}  puesto${puestosBajos.length  > 1 ? "s" : ""} sin cobertura completa: ${puestosBajos.map(p => `${p.nombre} (${p.asig}/${p.necesarios})`).join(", ")}`, modulo: "voluntarios" });
    } else if (diasHasta <= _volDiasAviso) {
      if (coberturaVol < 50) alertasAvisos.push({ icon: "🟡", texto: `Cobertura de voluntarios al ${coberturaVol}% — conviene confirmar puestos`, modulo: "voluntarios" });
      if (puestosAlerta.length > 0) alertasAvisos.push({ icon: "🟡", texto: `${puestosAlerta.length} puesto${puestosAlerta.length > 1 ? "s" : ""} pendientes de cubrir: ${puestosAlerta.map(p => `${p.nombre} (${p.asig}/${p.necesarios})`).join(", ")}`, modulo: "voluntarios" });
    }
    if (resultado < 0) alertasCriticas.push({ icon: "🔴", texto: `Resultado negativo: ${fmtEur(resultado)}`, modulo: "presupuesto" });

    // PPTO-02: Alertas de tramo próximo a agotar
    tramos.forEach(tramo => {
      const maximo = tramo.maximo ?? 0;
      if (maximo <= 0) return;
      const totalTramo = ["TG7","TG13","TG25"].reduce((s, d) => s + (rawInscritosVal?.tramos?.[tramo.id]?.[d] || 0), 0);
      const pct = totalTramo / maximo;
      if (pct >= 1.0) {
        alertasCriticas.push({ icon: "⛔", texto: `Tramo '${tramo.nombre}' completo (${totalTramo}/${maximo} plazas)`, modulo: "presupuesto" });
      } else if (pct >= 0.8) {
        alertasAvisos.push({ icon: "🔶", texto: `Tramo '${tramo.nombre}' al ${Math.round(pct * 100)}% de ocupación — considera ampliar el aforo`, modulo: "presupuesto" });
      }
    });
    if (docsVencidos.length > 0)  alertasCriticas.push({ icon: "🔴", texto: `${docsVencidos.length} documento${docsVencidos.length > 1 ? "s" : ""} vencido${docsVencidos.length > 1 ? "s" : ""}: ${docsVencidos.map(d => d.nombre).slice(0, 2).join(", ")}${docsVencidos.length > 2 ? "..." : ""}`, modulo: "documentos" });
    if (docsProxVencer.length > 0) alertasAvisos.push({ icon: "🟡", texto: `${docsProxVencer.length} documento${docsProxVencer.length > 1 ? "s" : ""} por vencer en ≤30 días`, modulo: "documentos" });
    if (gestionesDenegadas.length > 0) alertasCriticas.push({ icon: "🚫", texto: `Gestión${gestionesDenegadas.length > 1 ? "es" : ""} denegada${gestionesDenegadas.length > 1 ? "s" : ""}: ${gestionesDenegadas.map(g => g.nombre).join(", ")}`, modulo: "documentos" });
    if (gestionesVencidas.length  > 0) alertasCriticas.push({ icon: "🔴", texto: `Permiso${gestionesVencidas.length > 1 ? "s" : ""} vencido${gestionesVencidas.length > 1 ? "s" : ""} sin aprobar: ${gestionesVencidas.map(g => g.nombre).slice(0, 2).join(", ")}${gestionesVencidas.length > 2 ? "..." : ""}`, modulo: "documentos" });
    if (gestionesUrgentes.length  > 0) alertasAvisos.push({ icon: "🏛️", texto: `${gestionesUrgentes.length} gestión${gestionesUrgentes.length > 1 ? "es" : ""} legal${gestionesUrgentes.length > 1 ? "es" : ""} con plazo ≤30 días: ${gestionesUrgentes.map(g => g.nombre).slice(0, 2).join(", ")}${gestionesUrgentes.length > 2 ? "..." : ""}`, modulo: "documentos" });
    if (tareasBloqueadas > 0)     alertasAvisos.push({ icon: "🟡", texto: `${tareasBloqueadas} tareas bloqueadas`, modulo: "proyecto" });
    if (diasHasta <= _volDiasAviso && coberturaVol >= 50 && coberturaVol < 80)
      alertasAvisos.push({ icon: "🟡", texto: `Cobertura de voluntarios al ${coberturaVol}% — quedan ${diasHasta} días`, modulo: "voluntarios" });
    if (volPendientes > 0)        alertasAvisos.push({ icon: "🔵", texto: `${volPendientes} voluntarios pendientes de confirmar`, modulo: "voluntarios" });
    if (patComprometido < objetivo * 0.5)
      alertasAvisos.push({ icon: "🟡", texto: `Patrocinio al ${Math.round(patComprometido / objetivo * 100)}% del objetivo`, modulo: "patrocinadores" });
    if (contPendientes > 0)       alertasAvisos.push({ icon: "🔵", texto: `${contPendientes} contraprestaciones pendientes`, modulo: "patrocinadores" });
    if (patsSinSeguimiento.length > 0)
      alertasAvisos.push({ icon: "📞", texto: `${patsSinSeguimiento.length} patrocinador${patsSinSeguimiento.length !== 1 ? "es" : ""} con seguimiento vencido: ${patsSinSeguimiento.slice(0, 2).map(p => p.nombre).join(", ")}${patsSinSeguimiento.length > 2 ? "..." : ""}`, modulo: "patrocinadores" });
    if (stockAlerts.length > 0)   alertasAvisos.push({ icon: "🟡", texto: `${stockAlerts.length} materiales con sobreasignación de stock`, modulo: "logistica" });
    if (materialesBajoMinimo.length > 0)
      alertasAvisos.push({ icon: "📦", texto: `${materialesBajoMinimo.length} material${materialesBajoMinimo.length !== 1 ? "es" : ""} por debajo del stock mínimo: ${materialesBajoMinimo.slice(0, 2).map(m => m.nombre).join(", ")}${materialesBajoMinimo.length > 2 ? "..." : ""}`, modulo: "logistica" });
    hitosProximos.forEach(h => {
      const dias = Math.ceil((new Date(h.fecha) - TODAY) / 86400000);
      if (dias <= 14 && dias >= 0 && h.critico)
        alertasAvisos.push({ icon: "⚡", texto: `Hito crítico en ${dias}d: ${h.nombre}`, modulo: "proyecto" });
    });

    return {
      eventoNombre, eventoEdicion, eventoFechaStr, eventoFecha,
      diasHasta, yaFue, esSemana,
      totalInscritos, inscritosPorDist, totalIngresos, totalCostesFijos, totalCostesVars,
      totalIngresosExtra, merchBeneficio, totalOtrosIngresos, resultado, roiGlobal, camisetasDesglose,
      maximosPorDist, ocupacionPorDist, ocupacionGlobal, totalMaximos,
      voluntarios: voluntarios.length, volConfirmados, volPendientes, totalNecesarios, coberturaVol, puestosAlerta,
      pats: pats.length, patComprometido, patCobrado, patPipeline, objetivo, contPendientes, patsSinSeguimiento,
      material: material.length, stockAlerts, materialesBajoMinimo, tlDone, tlTotal, ckDone, ckTotal, incidenciasActivas,
      tareasTotal, tareasCompletadas, tareasBloqueadas, tareasVencidas, progresoGlobal, hitosProximos,
      saludModulos, saludGlobal,
      alertasCriticas, alertasAvisos,
      docsVencidos, docsProxVencer,
      gestionesDenegadas, gestionesVencidas, gestionesUrgentes,
      tramos, rawInscritos: rawInscritosVal, syncConfig, scenarioActivo,
    };
  }, [configKpis, presupuestoKpis, voluntariosKpis, patrociniosKpis,
      logisticaKpis, proyectoKpis, documentosKpis,
      volDiasCritico, volDiasAviso]);
}
