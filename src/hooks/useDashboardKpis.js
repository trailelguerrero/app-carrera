/**
 * useDashboardKpis.js — Tarea 3.4
 * Encapsula todos los cálculos de KPIs del Dashboard.
 * Recibe rawData y devuelve el objeto data con métricas calculadas.
 * Extrae el useMemo de ~200 líneas del componente Dashboard.
 */
import { useMemo } from "react";
import {
  calculateTotalInscritos,
  calculateIngresosPorDistancia,
  calculateCostesFijos,
  calculateCostesVariables,
  calculateResultadoFinanciero,
  getImporteCobrado,
} from "@/lib/budgetUtils";
import { fmtEur } from "@/lib/utils";
import { EVENT_DATE, COSTE_DEFAULT } from "@/constants/budgetConstants";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import {
  SK_PPTO_CONCEPTOS, SK_PPTO_TRAMOS, SK_PPTO_INSCRITOS, SK_PPTO_INGRESOS_EXTRA,
  SK_PPTO_MERCHANDISING, SK_PPTO_SYNC_CONFIG, SK_PPTO_MAXIMOS, SK_PPTO_SCENARIO_ACTIVE,
  SK_VOL_VOLUNTARIOS, SK_VOL_PUESTOS,
  SK_PAT_PATS, SK_PAT_OBJ,
  SK_LOG_MAT, SK_LOG_ASIG, SK_LOG_TL, SK_LOG_CK,
  SK_PROY_TAREAS, SK_PROY_HITOS,
  SK_DOC_DOCS, SK_DOC_GESTIONES,
  SK_CAM_PEDIDOS, SK_CAM_COSTE, SK_CAM_CORREDORES, SK_CAM_PRECIO_PLATAFORMA, SK_CAM_NINO,
} from "@/constants/storageKeys";

export function useDashboardKpis(rawData, volDiasCritico, volDiasAviso) {
  return useMemo(() => {
    const d = rawData ?? {};
    const get = (key, def) => {
      const v = d[key];
      if (v === undefined || v === null) return def;
      if (Array.isArray(def) && !Array.isArray(v)) return def;
      return v;
    };

    const TODAY = new Date();
    const cfg = { ...EVENT_CONFIG_DEFAULT, ...(get(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT) || {}) };
    const eventoFecha = cfg.fecha ? new Date(cfg.fecha) : EVENT_DATE;
    const diasHasta = Math.ceil((eventoFecha - TODAY) / 86400000);
    const yaFue = diasHasta < 0;
    const esSemana = diasHasta >= 0 && diasHasta <= cfg.volDiasCritico;
    const _volDiasCritico = volDiasCritico ?? cfg.volDiasCritico;
    const _volDiasAviso   = volDiasAviso   ?? cfg.volDiasAviso;
    const eventoNombre = cfg.nombre;
    const eventoEdicion = cfg.edicion;

    // PRESUPUESTO
    const conceptos = get(SK_PPTO_CONCEPTOS, []);
    const tramos = get(SK_PPTO_TRAMOS, []);
    const inscritos = get(SK_PPTO_INSCRITOS, { tramos: {} });
    const syncConfig = get(SK_PPTO_SYNC_CONFIG, { patrocinios: true, camisetas: true });
    const scenarioActivo = get(SK_PPTO_SCENARIO_ACTIVE, null);
    const camPedidos = get(SK_CAM_PEDIDOS, []);
    const camCoste = get(SK_CAM_COSTE, COSTE_DEFAULT);
    const camCorredoresExt = get(SK_CAM_CORREDORES, {});
    const camPrecioCorrExt = get(SK_CAM_PRECIO_PLATAFORMA, { precio: 0 })?.precio ?? 0;
    const camNinoExt = get(SK_CAM_NINO, {});
    const pats = get(SK_PAT_PATS, []);
    const ingresosExtra = get(SK_PPTO_INGRESOS_EXTRA, []);
    const merchandising = get(SK_PPTO_MERCHANDISING, []);
    const maximos = get(SK_PPTO_MAXIMOS, {});

    const inscritosBU = calculateTotalInscritos(tramos, inscritos);
    const ingresosBU = calculateIngresosPorDistancia(tramos, inscritos);
    const costesFijosBU = calculateCostesFijos(conceptos, inscritosBU);
    const costesVarsBU = calculateCostesVariables(conceptos, inscritosBU);

    const totalInscritos = inscritosBU.total;
    const inscritosPorDist = { TG7: inscritosBU.TG7, TG13: inscritosBU.TG13, TG25: inscritosBU.TG25 };
    const totalIngresos = ingresosBU.total;
    const totalCostesFijos = costesFijosBU.total;
    const totalCostesVars = costesVarsBU.total;

    const maximosPorDist = { TG7: maximos?.TG7 || 0, TG13: maximos?.TG13 || 0, TG25: maximos?.TG25 || 0 };
    const totalMaximos = maximosPorDist.TG7 + maximosPorDist.TG13 + maximosPorDist.TG25;
    const ocupacionPorDist = {
      TG7:  maximosPorDist.TG7  > 0 ? Math.round(inscritosPorDist.TG7  / maximosPorDist.TG7  * 100) : null,
      TG13: maximosPorDist.TG13 > 0 ? Math.round(inscritosPorDist.TG13 / maximosPorDist.TG13 * 100) : null,
      TG25: maximosPorDist.TG25 > 0 ? Math.round(inscritosPorDist.TG25 / maximosPorDist.TG25 * 100) : null,
    };
    const ocupacionGlobal = totalMaximos > 0 ? Math.round(totalInscritos / totalMaximos * 100) : null;

    const _rawVols = get(SK_VOL_VOLUNTARIOS, []);
    const camVoluntarios = Array.isArray(_rawVols)
      ? _rawVols.filter(v => (v.estado === "confirmado" || v.estado === "pendiente") && v.talla)
      : [];

    const {
      totalIngresosExtra, totalMerchBeneficio: merchBeneficio,
      totalOtrosIngresos, resultado, roiGlobal, camisetasDesglose,
    } = calculateResultadoFinanciero({
      totalIngresos, totalCostesFijos, totalCostesVars,
      pats, ingresosExtra, camPedidos, camCoste: camCoste || COSTE_DEFAULT,
      camCorredoresExt, camPrecioCorrExt, camNinoExt, camVoluntarios,
      merchandising, syncConfig,
    });

    // VOLUNTARIOS
    const voluntarios = get(SK_VOL_VOLUNTARIOS, []);
    const puestos = get(SK_VOL_PUESTOS, []);
    const volConfirmados = voluntarios.filter(v => v.estado === "confirmado").length;
    const volPendientes  = voluntarios.filter(v => v.estado === "pendiente").length;
    const totalNecesarios = puestos.reduce((s, p) => s + p.necesarios, 0);
    const coberturaVol = totalNecesarios > 0 ? Math.round(volConfirmados / totalNecesarios * 100) : 0;
    const puestosConCobertura = puestos.map(p => {
      const asig = voluntarios.filter(v => v.puestoId === p.id && v.estado !== "cancelado").length;
      const confirmados = voluntarios.filter(v => v.puestoId === p.id && v.estado === "confirmado").length;
      const deficit = Math.max(0, p.necesarios - asig);
      const pct = p.necesarios > 0 ? Math.round(asig / p.necesarios * 100) : 100;
      return { ...p, asig, confirmados, deficit, pct };
    });
    const puestosAlerta = puestosConCobertura.filter(p => p.pct < 50);
    const puestosBajos  = puestosConCobertura.filter(p => p.pct >= 50 && p.pct < 100);

    // PATROCINADORES
    const objetivo = get(SK_PAT_OBJ, 8000);
    const patComprometido = pats.filter(p => p.estado === "confirmado" || p.estado === "cobrado").reduce((s, p) => s + (p.importe || 0), 0);
    const patCobrado  = pats.filter(p => p.estado === "cobrado").reduce((s, p) => s + getImporteCobrado(p), 0);
    const patPipeline = pats.filter(p => p.estado === "negociando" || p.estado === "prospecto").reduce((s, p) => s + (p.importe || 0), 0);
    const contPendientes = pats.reduce((s, p) => s + (p.contraprestaciones || []).filter(c => c.estado === "pendiente").length, 0);
    const patsSinSeguimiento = pats.filter(p =>
      p.estado === "negociando" && p.proximoContacto && new Date(p.proximoContacto) < TODAY
    );

    // LOGÍSTICA
    const material = get(SK_LOG_MAT, []);
    const asigs = get(SK_LOG_ASIG, []);
    const tl = get(SK_LOG_TL, []);
    const ck = get(SK_LOG_CK, []);
    const tlDone = tl.filter(t => t.estado === "completado").length;
    const ckDone = ck.filter(c => c.estado === "completado").length;
    const stockAlerts = material.filter(m => {
      const asig = asigs.filter(a => a.materialId === m.id).reduce((s, a) => s + a.cantidad, 0);
      return asig > m.stock;
    });
    const materialesBajoMinimo = material.filter(m => m.stockMinimo > 0 && m.stock < m.stockMinimo);

    // PROYECTO
    const tareas = get(SK_PROY_TAREAS, []);
    const hitos  = get(SK_PROY_HITOS,  []);
    const tareasTotal       = tareas.length;
    const tareasCompletadas = tareas.filter(t => t.estado === "completado").length;
    const tareasBloqueadas  = tareas.filter(t => t.estado === "bloqueado").length;
    const tareasVencidas    = tareas.filter(t => t.estado !== "completado" && t.fechaLimite && new Date(t.fechaLimite) < TODAY).length;
    const progresoGlobal    = tareasTotal > 0 ? Math.round(tareasCompletadas / tareasTotal * 100) : 0;
    const hitosProximos     = hitos.filter(h => !h.completado && h.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5);

    // DOCUMENTOS
    const _rawDocumentos = get(SK_DOC_DOCS, []);
    const documentos = Array.isArray(_rawDocumentos) ? _rawDocumentos : [];
    const diasHastaDoc = (iso) => iso ? Math.ceil((new Date(iso) - TODAY) / 86400000) : null;
    const docsVencidos   = documentos.filter(d => { const dias = diasHastaDoc(d.fechaVencimiento); return dias !== null && dias < 0 && d.estado !== "aprobado"; });
    const docsProxVencer = documentos.filter(d => { const dias = diasHastaDoc(d.fechaVencimiento); return dias !== null && dias >= 0 && dias <= 30 && d.estado !== "aprobado"; });

    // GESTIONES LEGALES
    const gestiones = Array.isArray(get(SK_DOC_GESTIONES, [])) ? get(SK_DOC_GESTIONES, []) : [];
    const gestionesDenegadas = gestiones.filter(g => g.estado === "denegado");
    const gestionesVencidas  = gestiones.filter(g => { const dias = diasHastaDoc(g.fechaVencimiento); return dias !== null && dias < 0 && g.estado !== "aprobado" && g.estado !== "denegado"; });
    const gestionesUrgentes  = gestiones.filter(g => { const dias = diasHastaDoc(g.fechaVencimiento); return dias !== null && dias >= 0 && dias <= 30 && g.estado !== "aprobado"; });

    // SALUD DEL EVENTO
    const saludModulos = [
      { label: "Proyecto",       icon: "🏔️", bloque: "proyecto",       score: progresoGlobal, color: progresoGlobal >= 80 ? "var(--green)" : progresoGlobal >= 50 ? "var(--amber)" : "var(--red)" },
      { label: "Voluntarios",    icon: "👥", bloque: "voluntarios",    score: coberturaVol,   color: coberturaVol >= 80 ? "var(--green)" : coberturaVol >= 50 ? "var(--amber)" : "var(--red)" },
      { label: "Logística",      icon: "📦", bloque: "logistica",      score: ck.length > 0 ? Math.round(ckDone / ck.length * 100) : 0, color: ck.length === 0 ? "var(--text-muted)" : ckDone >= ck.length * 0.8 ? "var(--green)" : ckDone >= ck.length * 0.5 ? "var(--amber)" : "var(--red)" },
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
    if (resultado < 0)            alertasCriticas.push({ icon: "🔴", texto: `Resultado negativo: ${fmtEur(resultado)}`, modulo: "presupuesto" });
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

    const eventoFechaStr = eventoFecha.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

    return {
      eventoNombre, eventoEdicion, eventoFechaStr, eventoFecha,
      diasHasta, yaFue, esSemana,
      totalInscritos, inscritosPorDist, totalIngresos, totalCostesFijos, totalCostesVars,
      totalIngresosExtra, merchBeneficio, totalOtrosIngresos, resultado, roiGlobal, camisetasDesglose,
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
  }, [rawData, volDiasCritico, volDiasAviso]);
}
