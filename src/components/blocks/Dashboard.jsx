import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { BLOCK_CSS, blockCls } from "@/lib/blockStyles";
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

const fmt   = (n) => new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n ?? 0);
const fmtD  = (iso) => new Date(iso).toLocaleDateString("es-ES", { day:"2-digit", month:"short" });
const navigate = (block, subtab) => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block, subtab } }));

// ─── Componente ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [rawData,     setRawData]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);  // refresco silencioso
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alertasExpandidas, setAlertasExpandidas] = useState(
    () => localStorage.getItem("teg_dash_alertas_open") !== "0"
  ); // avisos: persiste estado de colapso
  const [saludExpandida, setSaludExpandida] = useState(true);      // salud siempre expandida por defecto
  const intervalRef = useRef(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
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

    // Refresco silencioso cada 60 segundos
    intervalRef.current = setInterval(() => loadData(true), 60000);

    const handler     = () => loadData(true);
    const saveHandler = (e) => { if (e.detail?.status === "saved") loadData(true); };
    window.addEventListener("teg-sync", handler);
    window.addEventListener("teg-save-status", saveHandler);
    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener("teg-sync", handler);
      window.removeEventListener("teg-save-status", saveHandler);
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
    const merchStats     = get("teg_camisetas_v1_stats", {});
    const pats           = get("teg_patrocinadores_v1_pats", []);
    const ingresosExtra  = get("teg_presupuesto_v1_ingresosExtra", []);
    const merchandising  = get("teg_presupuesto_v1_merchandising", []);
    const maximos        = get("teg_presupuesto_v1_maximos", {});

    const DISTANCIAS = ["TG7", "TG13", "TG25"];
    let totalInscritos = 0;
    const inscritosPorDist = { TG7:0, TG13:0, TG25:0 };
    let totalIngresos = 0;
    tramos.forEach(t => {
      DISTANCIAS.forEach(dist => {
        const n = inscritos.tramos?.[t.id]?.[dist] || 0;
        inscritosPorDist[dist] += n;
        totalInscritos += n;
        totalIngresos  += n * (t.precios?.[dist] || 0);
      });
    });

    const maximosPorDist   = { TG7: maximos?.TG7||0, TG13: maximos?.TG13||0, TG25: maximos?.TG25||0 };
    const totalMaximos     = maximosPorDist.TG7 + maximosPorDist.TG13 + maximosPorDist.TG25;
    const ocupacionPorDist = {
      TG7:  maximosPorDist.TG7  > 0 ? Math.round(inscritosPorDist.TG7  / maximosPorDist.TG7  * 100) : null,
      TG13: maximosPorDist.TG13 > 0 ? Math.round(inscritosPorDist.TG13 / maximosPorDist.TG13 * 100) : null,
      TG25: maximosPorDist.TG25 > 0 ? Math.round(inscritosPorDist.TG25 / maximosPorDist.TG25 * 100) : null,
    };
    const ocupacionGlobal  = totalMaximos > 0 ? Math.round(totalInscritos / totalMaximos * 100) : null;

    const totalCostesFijos = conceptos.filter(c => c.tipo==="fijo" && c.activo).reduce((s,c) => s+(c.costeTotal||0), 0);
    const totalCostesVars  = conceptos.filter(c => c.tipo==="variable" && c.activo).reduce((s,c) =>
      s + DISTANCIAS.reduce((ss,dist) => {
        if (c.activoDistancias && !c.activoDistancias[dist]) return ss;
        return ss + (c.costePorDistancia?.[dist]||0)*inscritosPorDist[dist];
      }, 0), 0);
    
    // PATROCINIOS: Sync vs Manual
    const totalIngresosExtra = syncConfig.patrocinios 
      ? pats.filter(p => p.estado==="cobrado" || p.estado === "confirmado").reduce((s,p) => s+(p.importe||0), 0)
      : ingresosExtra.filter(i => i.activo).reduce((s,i) => s+(i.valor||0), 0);
    
    // MERCHANDISING: Sync vs Manual
    const merchIngresos = syncConfig.camisetas 
      ? (merchStats.totalIngresos || 0) 
      : merchandising.filter(m => m.activo).reduce((s,m) => s+m.unidades*m.precioVenta, 0);
    const merchCostes = syncConfig.camisetas 
      ? (merchStats.totalCostes || 0) 
      : merchandising.filter(m => m.activo).reduce((s,m) => s+m.unidades*m.costeUnitario, 0);
    const merchBeneficio = merchIngresos - merchCostes;

    const totalOtrosIngresos = totalIngresosExtra + merchBeneficio;
    const resultado = totalIngresos + totalOtrosIngresos - totalCostesFijos - totalCostesVars;
    const roiGlobal = (totalCostesFijos + totalCostesVars) > 0 
      ? Math.round(((totalIngresos + totalOtrosIngresos - (totalCostesFijos + totalCostesVars)) / (totalCostesFijos + totalCostesVars)) * 100)
      : 0;

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
      { label:"Presupuesto",    icon:"💰", bloque:"presupuesto",
        score: resultado >= 0 ? 100 : Math.max(0, 100 + Math.round(resultado / Math.max(totalCostesFijos+totalCostesVars,1) * 100)),
        color: resultado >= 0 ? "var(--green)" : resultado > -(totalCostesFijos+totalCostesVars)*0.2 ? "var(--amber)" : "var(--red)" },
      { label:"Voluntarios",   icon:"👥", bloque:"voluntarios",
        score: coberturaVol,
        color: coberturaVol >= 80 ? "var(--green)" : coberturaVol >= 50 ? "var(--amber)" : "var(--red)" },
      { label:"Patrocinadores",icon:"🤝", bloque:"patrocinadores",
        score: objetivo > 0 ? Math.min(100, Math.round(patComprometido/objetivo*100)) : 100,
        color: patComprometido >= objetivo*0.8 ? "var(--green)" : patComprometido >= objetivo*0.5 ? "var(--amber)" : "var(--red)" },
      { label:"Logística",     icon:"📦", bloque:"logistica",
        score: ck.length > 0 ? Math.round(ckDone/ck.length*100) : 0,
        color: ck.length === 0 ? "var(--text-muted)" : ckDone >= ck.length*0.8 ? "var(--green)" : ckDone >= ck.length*0.5 ? "var(--amber)" : "var(--red)" },
      { label:"Proyecto",      icon:"🏔️", bloque:"proyecto",
        score: progresoGlobal,
        color: progresoGlobal >= 80 ? "var(--green)" : progresoGlobal >= 50 ? "var(--amber)" : "var(--red)" },
      { label:"Documentos",    icon:"📁", bloque:"documentos",
        score: (() => {
          const total = documentos.length + gestiones.length;
          if (total === 0) return 100;
          const problemas = docsVencidos.length + gestionesDenegadas.length + gestionesVencidas.length;
          return Math.max(0, Math.round((1 - problemas / total) * 100));
        })(),
        color: docsVencidos.length > 0 || gestionesDenegadas.length > 0 ? "var(--red)" : docsProxVencer.length > 0 || gestionesUrgentes.length > 0 ? "var(--amber)" : "var(--green)" },
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
      alertasCriticas.push({ icon:"🔴", texto:`Resultado negativo: ${fmt(resultado)}`, modulo:"presupuesto" });
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
    if (stockAlerts.length > 0)
      alertasAvisos.push({ icon:"🟡", texto:`${stockAlerts.length} materiales con sobreasignación de stock`, modulo:"logistica" });
    hitosProximos.forEach(h => {
      const dias = Math.ceil((new Date(h.fecha) - TODAY) / 86400000);
      if (dias <= 14 && dias >= 0 && h.critico)
        alertasAvisos.push({ icon:"⚡", texto:`Hito crítico en ${dias}d: ${h.nombre}`, modulo:"proyecto" });
    });

    const eventoFechaStr = eventoFecha.toLocaleDateString("es-ES", { day:"2-digit", month:"long", year:"numeric" });

    return {
      eventoNombre, eventoEdicion, eventoFechaStr,
      diasHasta, yaFue, esSemana,
      totalInscritos, inscritosPorDist, totalIngresos, totalCostesFijos, totalCostesVars,
      totalIngresosExtra, merchBeneficio, totalOtrosIngresos, resultado, roiGlobal,
      maximosPorDist, ocupacionPorDist, ocupacionGlobal, totalMaximos,
      voluntarios: voluntarios.length, volConfirmados, volPendientes, totalNecesarios, coberturaVol, puestosAlerta,
      pats: pats.length, patComprometido, patCobrado, patPipeline, objetivo, contPendientes,
      material: material.length, stockAlerts, tlDone, tlTotal: tl.length, ckDone, ckTotal: ck.length,
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
        <style>{BLOCK_CSS}</style>
        <div className="block-container" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:"1rem" }}>
          <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid #1e2d50", borderTopColor:"#22d3ee", animation:"teg-spin 0.7s linear infinite" }} />
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem", color:"var(--text-dim)", letterSpacing:"0.1em" }}>Cargando datos…</div>
          <style>{`@keyframes teg-spin { to { transform:rotate(360deg); } }`}</style>
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
              <span style={{fontSize:"1.2rem"}}>🔬</span>
              <div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".68rem",fontWeight:800,
                  color:"var(--amber)",textTransform:"uppercase",letterSpacing:".06em"}}>
                  ⚠️ MODO ESCENARIO ACTIVO
                </div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".62rem",color:"var(--text-muted)"}}>
                  Los KPIs reflejan «{d.scenarioActivo}» — NO son datos reales
                </div>
              </div>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"presupuesto"}}))}
              style={{fontFamily:"var(--font-mono)",fontSize:".62rem",padding:".28rem .65rem",
                borderRadius:6,border:"1px solid rgba(251,191,36,.4)",
                background:"rgba(251,191,36,.15)",color:"var(--amber)",cursor:"pointer",
                flexShrink:0,whiteSpace:"nowrap",fontWeight:700}}>
              Ver en Presupuesto →
            </button>
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
                    ? <span className="dash-countdown-num" style={{ fontSize:"2rem" }}>¡Completado!</span>
                    : <>
                        <span className="dash-countdown-num">{d.diasHasta}</span>
                        <span className="dash-countdown-label mono muted">
                          {d.esSemana ? "⚡ días — ¡SEMANA DE CARRERA!" : "días para la carrera"}
                        </span>
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:".58rem",
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
                      letterSpacing:"0.08em", fontSize:"0.55rem" }}>
                      Salud del evento
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                      <span className="dash-salud-score" style={{ color: saludColor, fontSize:"1rem" }}>
                        {d.saludGlobal}%
                      </span>
                      <span className="mono" style={{ color: saludColor, fontSize:"0.65rem" }}>
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
                          <span className="mono" style={{ fontSize:"0.58rem", color: m.color,
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
              accion: `Patrocinio al ${pct}% — quedan ${fmt(d.objetivo - d.patComprometido)} por conseguir`,
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
                <span style={{ fontSize:".85rem" }}>🎯</span>
                <span style={{ fontWeight:800, fontSize:".82rem", color:"var(--text)" }}>Haz esto ahora</span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:".6rem", color:"var(--text-muted)",
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
                    fontSize:".82rem" }}>
                    {ac.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:".78rem", fontWeight:600, color:"var(--text)",
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {ac.accion}
                    </div>
                  </div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:".6rem",
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
                  <span style={{ fontSize:".7rem", lineHeight:1 }}>⚠</span>
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
                <span style={{ fontFamily:"var(--font-mono)", fontSize:".68rem",
                  fontWeight:700, color:"var(--amber)", textTransform:"uppercase",
                  letterSpacing:".06em" }}>
                  {d.alertasAvisos.length} Aviso{d.alertasAvisos.length !== 1 ? "s" : ""}
                </span>
              </div>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:".6rem",
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
                      <span style={{ fontSize:".65rem", lineHeight:1 }}>
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
                fontSize:".72rem", color:"var(--green)",
              }}>✓</div>
              <span style={{ fontFamily:"var(--font-mono)", fontWeight:800,
                fontSize:".72rem", color:"var(--green)", textTransform:"uppercase",
                letterSpacing:".08em" }}>
                Todo en orden
              </span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:".6rem",
                color:"var(--text-dim)", marginLeft:"auto" }}>
                sin alertas activas
              </span>
            </div>
            <div style={{ display:"flex", gap:".75rem", flexWrap:"wrap" }}>
              {d.totalInscritos > 0 && (
                <span style={{ fontFamily:"var(--font-mono)", fontSize:".62rem",
                  color:"var(--cyan)" }}>
                  🏃 {d.totalInscritos} inscritos
                  {d.ocupacionGlobal !== null ? ` (${d.ocupacionGlobal}%)` : ""}
                </span>
              )}
              {d.coberturaVol > 0 && (
                <span style={{ fontFamily:"var(--font-mono)", fontSize:".62rem",
                  color:"var(--green)" }}>
                  👥 {d.coberturaVol}% voluntarios
                </span>
              )}
              {d.resultado > 0 && (
                <span style={{ fontFamily:"var(--font-mono)", fontSize:".62rem",
                  color:"var(--green)" }}>
                  💰 {fmt(d.resultado)} resultado
                </span>
              )}
              {d.progresoGlobal > 0 && (
                <span style={{ fontFamily:"var(--font-mono)", fontSize:".62rem",
                  color:"var(--violet)" }}>
                  📋 {d.progresoGlobal}% tareas
                </span>
              )}
            </div>
          </div>
        )}



        {/* ── KPIs ── */}
        <div className="kpi-grid mb">
          <KPI icon="💰" label="Resultado"
            tooltip="Ingresos totales (inscripciones + patrocinios + merch) menos costes fijos y variables.\nPositivo = superávit. Negativo = déficit."
            value={fmt(d.resultado)}
            sub={`Ingresos: ${fmt(d.totalIngresos + d.totalOtrosIngresos)}`}
            color={resColor} colorClass={d.resultado >= 0 ? "green" : "red"}
            progress={d.resultado >= 0 && (d.totalCostesFijos+d.totalCostesVars) > 0
              ? Math.min(100, Math.round(d.resultado / (d.totalCostesFijos+d.totalCostesVars) * 100))
              : undefined}
            onClick={() => navigate("presupuesto")} />
          <KPI icon="🏃" label="Inscritos"
            tooltip="Corredores inscritos en todos los tramos y distancias.\nEl denominador es el aforo máximo configurado en Presupuesto → Inscripciones."
            value={d.ocupacionGlobal !== null ? `${d.ocupacionGlobal}%` : (d.totalInscritos > 0 ? String(d.totalInscritos) : "—")}
            sub={d.ocupacionGlobal !== null
              ? `${d.totalInscritos}/${d.totalMaximos} · TG7 ${d.inscritosPorDist.TG7} · TG13 ${d.inscritosPorDist.TG13} · TG25 ${d.inscritosPorDist.TG25}`
              : d.totalInscritos > 0 ? `TG7 ${d.inscritosPorDist.TG7} · TG13 ${d.inscritosPorDist.TG13} · TG25 ${d.inscritosPorDist.TG25}` : "Sin inscritos aún — ir a Presupuesto"
            }
            color="var(--cyan)" colorClass="cyan"
            progress={d.ocupacionGlobal}
            onClick={() => navigate("presupuesto", "inscritos")} />
          <KPI icon="👥" label="Voluntarios"
            tooltip="Voluntarios confirmados sobre el total de plazas necesarias definidas en los puestos.\nEl % es la cobertura global: confirmados ÷ necesarios."
            value={d.totalNecesarios > 0 ? `${d.coberturaVol}%` : (d.volConfirmados > 0 ? String(d.volConfirmados) : "—")}
            sub={d.totalNecesarios > 0
              ? `${d.volConfirmados}/${d.totalNecesarios} · ${d.volPendientes} pendientes`
              : "Sin puestos definidos — ir a Voluntarios"
            }
            color={d.totalNecesarios===0?"var(--text-muted)":d.coberturaVol>=80?"var(--green)":d.coberturaVol>=50?"var(--amber)":"var(--red)"}
            colorClass={d.totalNecesarios===0?"muted":d.coberturaVol>=80?"green":d.coberturaVol>=50?"amber":"red"}
            progress={d.totalNecesarios>0?d.coberturaVol:undefined}
            onClick={() => navigate("voluntarios")} />
          <KPI icon="🤝" label="Patrocinio"
            tooltip="Importe comprometido (confirmado + cobrado) de todos los patrocinadores activos.\nEl % indica el avance respecto al objetivo de captación.\nEl importe cobrado es el dinero realmente recibido."
            value={`${Math.round(d.patComprometido/Math.max(d.objetivo,1)*100)}%`}
            sub={`${fmt(d.patCobrado)} cobrado · ${fmt(d.patComprometido)} comprometido`}
            color={d.patComprometido>=d.objetivo*0.8?"var(--green)":d.patComprometido>=d.objetivo*0.5?"var(--amber)":"var(--red)"}
            colorClass={d.patComprometido>=d.objetivo*0.8?"green":d.patComprometido>=d.objetivo*0.5?"amber":"red"}
            progress={d.objetivo>0?Math.min(100,Math.round(d.patComprometido/d.objetivo*100)):undefined}
            onClick={() => navigate("patrocinadores")} />
          <KPI icon="📋" label="Tareas"
            tooltip="Tareas completadas del bloque Proyecto sobre el total.\nIncluye todas las áreas: permisos, logística, comunicación, etc."
            value={d.tareasTotal > 0 ? `${d.progresoGlobal}%` : "—"}
            sub={d.tareasTotal > 0
              ? `${d.tareasCompletadas}/${d.tareasTotal} · ${d.tareasVencidas > 0 ? `⚠ ${d.tareasVencidas} vencidas` : "sin vencidas"}`
              : "Sin tareas definidas — ir a Proyecto"
            }
            color={d.tareasTotal===0?"var(--text-muted)":"var(--violet)"} colorClass={d.tareasTotal===0?"muted":"violet"}
            progress={d.tareasTotal>0?d.progresoGlobal:undefined}
            onClick={() => navigate("proyecto")} />
          <KPI icon="✅" label="Checklist"
            tooltip="Ítems completados del checklist de Logística sobre el total.\nEl checklist se organiza por fases temporales antes del evento."
            value={d.ckTotal > 0 ? `${Math.round(d.ckDone/d.ckTotal*100)}%` : "—"}
            sub={d.ckTotal > 0
              ? `${d.ckDone}/${d.ckTotal} ítems · Timeline: ${d.tlDone}/${d.tlTotal}`
              : "Sin checklist definido — ir a Logística"
            }
            color={d.ckTotal===0?"var(--text-muted)":"var(--cyan)"} colorClass={d.ckTotal===0?"muted":"cyan"}
            progress={d.ckTotal>0?Math.round(d.ckDone/d.ckTotal*100):undefined}
            onClick={() => navigate("logistica")} />
        </div>

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
                              <span style={{ fontFamily:"var(--font-mono)", fontSize:".62rem", color:"var(--text-muted)" }}>
                                {item.tipo === "+" ? "↑" : "↓"} {item.label}
                              </span>
                              <span style={{ fontFamily:"var(--font-mono)", fontSize:".62rem", color:item.color, fontWeight:700 }}>
                                {fmt(item.val)}
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
                <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
                  color:"var(--text-muted)",display:"flex",alignItems:"center",gap:".4rem"}}>
                  Resultado
                  <span className={`badge ${d.roiGlobal>=0?"badge-green":"badge-red"}`}
                    style={{fontSize:".5rem"}}>
                    Margen {d.roiGlobal>0?"+":""}{d.roiGlobal}%
                  </span>
                </span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:".78rem",
                  fontWeight:800,color:resColor}}>
                  {fmt(d.resultado)}
                </span>
              </div>
            )}
          </div>

          {/* Objetivos clave — barras de progreso lineales, legibles en mobile */}
          <div className="card dash-chart-card">
            <div className="card-title amber">🎯 Objetivos clave</div>
            {d.tareasTotal === 0 && d.totalNecesarios === 0 && d.objetivo === 0
              ? <EmptyChart mensaje="Sin objetivos definidos" sub="Añade tareas en Proyecto y puestos en Voluntarios" />
              : <div style={{ display:"flex", flexDirection:"column", gap:".65rem", marginTop:".2rem" }}>
                  {[
                    { icon:"👥", label:"Voluntarios", bloque:"voluntarios",
                      pct: d.coberturaVol,
                      sub: d.totalNecesarios > 0 ? `${d.volConfirmados}/${d.totalNecesarios}` : "Sin puestos",
                      color: d.coberturaVol>=80?"#34d399":d.coberturaVol>=50?"#fbbf24":"#f87171" },
                    { icon:"🤝", label:"Patrocinio", bloque:"patrocinadores",
                      pct: d.objetivo > 0 ? Math.min(100,Math.round(d.patComprometido/d.objetivo*100)) : 0,
                      sub: d.objetivo > 0 ? `${fmt(d.patCobrado)} cobrado` : "Sin objetivo",
                      color: d.patComprometido>=d.objetivo*0.8?"#34d399":d.patComprometido>=d.objetivo*0.5?"#fbbf24":"#f87171" },
                    { icon:"📋", label:"Proyecto", bloque:"proyecto",
                      pct: d.progresoGlobal,
                      sub: d.tareasTotal > 0 ? `${d.tareasCompletadas}/${d.tareasTotal} tareas` : "Sin tareas",
                      color: d.progresoGlobal>=80?"#34d399":d.progresoGlobal>=50?"#fbbf24":"#f87171" },
                    { icon:"✅", label:"Checklist", bloque:"logistica",
                      pct: d.ckTotal > 0 ? Math.round(d.ckDone/d.ckTotal*100) : 0,
                      sub: d.ckTotal > 0 ? `${d.ckDone}/${d.ckTotal} ítems` : "Sin checklist",
                      color: d.ckTotal>0&&d.ckDone>=d.ckTotal*0.8?"#34d399":d.ckDone>=d.ckTotal*0.5?"#fbbf24":"#f87171" },
                    { icon:"📁", label:"Permisos", bloque:"documentos",
                      pct: (() => { const v=d.docsVencidos?.length||0; const t=d.documentos?.length||0; return t===0?100:Math.max(0,Math.round((1-v/t)*100)); })(),
                      sub: d.docsVencidos?.length > 0 ? `⚠ ${d.docsVencidos.length} vencido${d.docsVencidos.length!==1?"s":""}` : d.docsProxVencer?.length > 0 ? `${d.docsProxVencer.length} próximo${d.docsProxVencer.length!==1?"s":""}` : "Sin urgencias",
                      color: d.docsVencidos?.length > 0 ? "#f87171" : d.docsProxVencer?.length > 0 ? "#fbbf24" : "#34d399" },
                  ].map(item => (
                    <div key={item.label} onClick={() => navigate(item.bloque)}
                      style={{ cursor:"pointer" }}
                      onMouseEnter={e=>e.currentTarget.style.opacity=".85"}
                      onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".2rem" }}>
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:".65rem", color:"var(--text-muted)", display:"flex", alignItems:"center", gap:".3rem" }}>
                          <span>{item.icon}</span><span>{item.label}</span>
                        </span>
                        <div style={{ display:"flex", alignItems:"center", gap:".5rem" }}>
                          <span style={{ fontFamily:"var(--font-mono)", fontSize:".58rem", color:"var(--text-dim)" }}>{item.sub}</span>
                          <span style={{ fontFamily:"var(--font-mono)", fontSize:".72rem", fontWeight:800, color:item.color, minWidth:32, textAlign:"right" }}>{item.pct}%</span>
                        </div>
                      </div>
                      <div style={{ height:5, background:"var(--surface3)", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${item.pct}%`, background:item.color, borderRadius:3, transition:"width .5s", opacity:.85 }} />
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
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

function EmptyChart({ mensaje, sub }) {
  return (
    <div className="dash-empty-chart">
      <div className="dash-empty-icon">📊</div>
      <div className="mono xs bold" style={{ color:"var(--text-muted)" }}>{mensaje}</div>
      {sub && <div className="mono" style={{ fontSize:"0.58rem", color:"var(--text-dim)", marginTop:"0.25rem", textAlign:"center", lineHeight:1.4 }}>{sub}</div>}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  background:"#0f1629", border:"1px solid #1e2d50",
  borderRadius:8, fontSize:"0.65rem", fontFamily:"var(--font-mono)",
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
  .dash-hero-bg { position:absolute; inset:0; background:radial-gradient(ellipse 70% 50% at 50% 0%, rgba(34,211,238,0.08) 0%, transparent 60%); pointer-events:none; }
  .dash-hero-content { position:relative; z-index:1; }
  .dash-hero-urgente { border-color:rgba(248,113,113,0.4) !important; }
  .dash-hero-urgente .dash-hero-bg { background:radial-gradient(ellipse 70% 50% at 50% 0%, rgba(248,113,113,0.1) 0%, transparent 60%) !important; }
  .dash-countdown { display:flex; align-items:baseline; gap:0.5rem; margin-bottom:0.6rem; }
  .dash-countdown-num {
    font-family:'Syne',sans-serif; font-size:2.6rem; font-weight:800; line-height:.9;
    background:linear-gradient(135deg,#fff 0%,#22d3ee 55%,#a78bfa 100%);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }
  .dash-countdown-label { font-family:var(--font-mono); font-size:0.72rem; color:var(--text-muted); }
  @media(max-width:480px){ .dash-countdown-num{ font-size:2rem; } }

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
          <span style={{ fontSize:"1.2rem" }}>🏃</span>
          <div>
            <div style={{ fontSize:"0.82rem", fontWeight:700, color:"var(--cyan)" }}>Actualización rápida de inscritos</div>
            <div className="mono xs muted" style={{ marginTop:2 }}>Volcar datos de la plataforma externa al presupuesto</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ padding:"0.2rem 0.4rem", color:"var(--text-muted)" }}>{open ? "▲ Ocultar" : "▼ Actualizar"}</button>
      </div>

      {open && (
        <div style={{ marginTop:"0.8rem", paddingTop:"0.8rem", borderTop:"1px solid var(--border)", animation:"teg-fade 0.2s ease" }}>
          <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap" }}>
            
            <div style={{ flex:1, minWidth:200 }}>
              <label style={{ display:"block", fontSize:"0.62rem", fontFamily:"var(--font-mono)", fontWeight:700, textTransform:"uppercase", color:"var(--text-muted)", marginBottom:"0.3rem" }}>Tramo activo</label>
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
                  <label style={{ display:"block", fontSize:"0.62rem", fontFamily:"var(--font-mono)", fontWeight:700, textTransform:"uppercase", color:"var(--cyan)", marginBottom:"0.3rem" }}>{dist}</label>
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
