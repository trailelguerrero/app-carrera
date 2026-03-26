import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { BLOCK_CSS, blockCls } from "@/lib/blockStyles";
import { EVENT_DATE } from "@/constants/budgetConstants";

import dataService from "@/lib/dataService";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie,
} from "recharts";

const ALL_KEYS = {
  "teg_presupuesto_v1_conceptos":    [],
  "teg_presupuesto_v1_tramos":        [],
  "teg_presupuesto_v1_inscritos":     { tramos: {} },
  "teg_presupuesto_v1_ingresosExtra": [],
  "teg_presupuesto_v1_merchandising": [],
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
};

const fmt   = (n) => new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n ?? 0);
const fmtD  = (iso) => new Date(iso).toLocaleDateString("es-ES", { day:"2-digit", month:"short" });
const navigate = (block) => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block } }));

// ─── Componente ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [rawData,     setRawData]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);  // refresco silencioso
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alertasExpandidas, setAlertasExpandidas] = useState(false); // avisos colapsables
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
    const diasHasta = Math.ceil((EVENT_DATE - TODAY) / 86400000);
    const yaFue     = diasHasta < 0;
    const esSemana  = diasHasta >= 0 && diasHasta <= 7;

    // PRESUPUESTO
    const conceptos    = get("teg_presupuesto_v1_conceptos", []);
    const tramos       = get("teg_presupuesto_v1_tramos", []);
    const inscritos    = get("teg_presupuesto_v1_inscritos", { tramos: {} });
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
      s + DISTANCIAS.reduce((ss,dist) => ss + (c.costePorDistancia?.[dist]||0)*inscritosPorDist[dist], 0), 0);
    const totalIngresosExtra = ingresosExtra.filter(i => i.activo).reduce((s,i) => s+(i.valor||0), 0);
    const merchIngresos    = merchandising.filter(m => m.activo).reduce((s,m) => s+m.unidades*m.precioVenta, 0);
    const merchCostes      = merchandising.filter(m => m.activo).reduce((s,m) => s+m.unidades*m.costeUnitario, 0);
    const merchBeneficio   = merchIngresos - merchCostes;
    const totalOtrosIngresos = totalIngresosExtra + merchBeneficio;
    const resultado        = totalIngresos + totalOtrosIngresos - totalCostesFijos - totalCostesVars;

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
    const pats            = get("teg_patrocinadores_v1_pats", []);
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
        score: ck.length > 0 ? Math.round(ckDone/ck.length*100) : 100,
        color: ckDone >= ck.length*0.8 ? "var(--green)" : ckDone >= ck.length*0.5 ? "var(--amber)" : "var(--red)" },
      { label:"Proyecto",      icon:"🏔️", bloque:"proyecto",
        score: progresoGlobal,
        color: progresoGlobal >= 80 ? "var(--green)" : progresoGlobal >= 50 ? "var(--amber)" : "var(--red)" },
    ];
    const saludGlobal = Math.round(saludModulos.reduce((s,m) => s+m.score, 0) / saludModulos.length);

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

    // ── ALERTAS con prioridad ──────────────────────────────────────────────
    const alertasCriticas = [];
    const alertasAvisos   = [];

    if (tareasVencidas > 0)
      alertasCriticas.push({ icon:"🔴", texto:`${tareasVencidas} tareas vencidas sin completar`, modulo:"proyecto" });
    if (coberturaVol < 50)
      alertasCriticas.push({ icon:"🔴", texto:`Cobertura de voluntarios crítica: ${coberturaVol}%`, modulo:"voluntarios" });
    if (puestosAlerta.length > 0) {
      const resumen = puestosAlerta.map(p => `${p.nombre} (${p.asig}/${p.necesarios})`).join(", ");
      alertasCriticas.push({ icon:"🔴", texto:`${puestosAlerta.length} puesto${puestosAlerta.length>1?"s":""} con cobertura crítica: ${resumen}`, modulo:"voluntarios" });
    }
    if (puestosBajos.length > 0) {
      const resumen = puestosBajos.map(p => `${p.nombre} (${p.asig}/${p.necesarios})`).join(", ");
      alertasAvisos.push({ icon:"🟡", texto:`${puestosBajos.length} puesto${puestosBajos.length>1?"s":""} sin cobertura completa: ${resumen}`, modulo:"voluntarios" });
    }
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
    if (coberturaVol >= 50 && coberturaVol < 80)
      alertasAvisos.push({ icon:"🟡", texto:`Cobertura de voluntarios insuficiente: ${coberturaVol}%`, modulo:"voluntarios" });
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

    return {
      diasHasta, yaFue, esSemana,
      totalInscritos, inscritosPorDist, totalIngresos, totalCostesFijos, totalCostesVars,
      totalIngresosExtra, merchBeneficio, totalOtrosIngresos, resultado,
      maximosPorDist, ocupacionPorDist, ocupacionGlobal, totalMaximos,
      voluntarios: voluntarios.length, volConfirmados, volPendientes, totalNecesarios, coberturaVol, puestosAlerta,
      pats: pats.length, patComprometido, patCobrado, patPipeline, objetivo, contPendientes,
      material: material.length, stockAlerts, tlDone, tlTotal: tl.length, ckDone, ckTotal: ck.length,
      tareasTotal, tareasCompletadas, tareasBloqueadas, tareasVencidas, progresoGlobal, hitosProximos,
      saludModulos, saludGlobal,
      alertasCriticas, alertasAvisos,
      docsVencidos, docsProxVencer,
    };
  }, [rawData]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{BLOCK_CSS}</style>
        <div className="block-container" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:"1rem" }}>
          <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid #1e2d50", borderTopColor:"#22d3ee", animation:"teg-spin 0.7s linear infinite" }} />
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"0.6rem", color:"#3a4a6a", letterSpacing:"0.1em" }}>Cargando datos…</div>
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
              Trail El Guerrero · 29 AGO 2026
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
          <button className="btn btn-ghost btn-sm"
            onClick={() => loadData(false)} title="Recargar datos">
            🔄 Actualizar
          </button>
        </div>

        {/* ── HERO: COUNTDOWN + SALUD ── */}
        <div className={`dash-hero card mb ${d.esSemana ? "dash-hero-urgente" : ""}`}>
          <div className="dash-hero-bg" />
          <div className="dash-hero-content">
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"1rem", flexWrap:"wrap" }}>

              {/* Countdown */}
              <div>
                <div className="dash-eyebrow mono xs muted">
                  {d.yaFue ? "🏁 Trail El Guerrero 2026 · COMPLETADO" : "🏔️ Trail El Guerrero 2026 · 29 AGO"}
                </div>
                <div className="dash-countdown">
                  {d.yaFue
                    ? <span className="dash-countdown-num" style={{ fontSize:"2rem" }}>¡Completado!</span>
                    : <>
                        <span className="dash-countdown-num">{d.diasHasta}</span>
                        <span className="dash-countdown-label mono muted">
                          {d.esSemana ? "⚡ días — ¡SEMANA DE CARRERA!" : "días para la carrera"}
                        </span>
                      </>
                  }
                </div>
                {/* Progreso global */}
                <div className="flex-center gap-sm" style={{ marginTop:"0.5rem" }}>
                  <span className="mono xs muted" style={{ whiteSpace:"nowrap" }}>Progreso global</span>
                  <div className="progress-bar" style={{ flex:1, minWidth:80 }}>
                    <div className="progress-fill" style={{ width:`${d.progresoGlobal}%`, background:"linear-gradient(90deg,#22d3ee,#a78bfa)" }} />
                  </div>
                  <span className="mono xs bold" style={{ color:"#22d3ee", whiteSpace:"nowrap" }}>{d.progresoGlobal}%</span>
                </div>
              </div>

              {/* Barra de salud del evento */}
              <div className="dash-salud-box">
                <div className="mono xs muted" style={{ marginBottom:"0.5rem", textTransform:"uppercase", letterSpacing:"0.08em", fontSize:"0.55rem" }}>
                  Salud del evento
                </div>
                <div className="dash-salud-score" style={{ color: saludColor }}>
                  {d.saludGlobal}%
                </div>
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
                      <span className="mono" style={{ fontSize:"0.58rem", color: m.color, minWidth:28, textAlign:"right" }}>{m.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── ALERTAS CRÍTICAS ── */}
        {d.alertasCriticas.length > 0 && (
          <div className="dash-alertas-criticas mb">
            <div className="dash-alertas-header">
              <span>🚨 {d.alertasCriticas.length} alerta{d.alertasCriticas.length !== 1 ? "s" : ""} crítica{d.alertasCriticas.length !== 1 ? "s" : ""}</span>
            </div>
            {d.alertasCriticas.map((a,i) => (
              <div key={i} className="dash-alerta dash-alerta-danger dash-alerta-clickable"
                onClick={() => navigate(a.modulo)} title={`Ir a ${a.modulo}`}>
                <span>{a.icon}</span>
                <span className="dash-alerta-text">{a.texto}</span>
                <span className="badge badge-muted" style={{ flexShrink:0 }}>{a.modulo} →</span>
              </div>
            ))}
          </div>
        )}

        {/* ── AVISOS (colapsables) ── */}
        {d.alertasAvisos.length > 0 && (
          <div className="card mb" style={{ padding:"0.75rem 1rem" }}>
            <button className="dash-avisos-toggle" onClick={() => setAlertasExpandidas(v => !v)}>
              <span className="mono xs" style={{ color:"var(--amber)" }}>
                ⚡ {d.alertasAvisos.length} aviso{d.alertasAvisos.length !== 1 ? "s" : ""} pendiente{d.alertasAvisos.length !== 1 ? "s" : ""}
              </span>
              <span className="mono xs muted">{alertasExpandidas ? "▲ ocultar" : "▼ mostrar"}</span>
            </button>
            {alertasExpandidas && (
              <div style={{ marginTop:"0.5rem", display:"flex", flexDirection:"column", gap:"0.3rem" }}>
                {d.alertasAvisos.map((a,i) => (
                  <div key={i} className={`dash-alerta ${a.icon==="🔵" ? "dash-alerta-info" : "dash-alerta-warning"} dash-alerta-clickable`}
                    onClick={() => navigate(a.modulo)} title={`Ir a ${a.modulo}`}>
                    <span>{a.icon}</span>
                    <span className="dash-alerta-text">{a.texto}</span>
                    <span className="badge badge-muted" style={{ flexShrink:0 }}>{a.modulo} →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Estado OK — sin alertas */}
        {d.alertasCriticas.length === 0 && d.alertasAvisos.length === 0 && (
          <div className="card mb" style={{ padding:"0.65rem 1rem", display:"flex", alignItems:"center", gap:"0.6rem", background:"rgba(52,211,153,0.04)", borderColor:"rgba(52,211,153,0.2)" }}>
            <span style={{ fontSize:"1rem" }}>✅</span>
            <span className="mono xs" style={{ color:"var(--green)" }}>Todo en orden — sin alertas activas</span>
          </div>
        )}

        {/* ── KPIs ── */}
        <div className="kpi-grid mb">
          <KPI icon="💰" label="Resultado"
            value={fmt(d.resultado)}
            sub={`Ingresos: ${fmt(d.totalIngresos + d.totalOtrosIngresos)}`}
            color={resColor} colorClass={d.resultado >= 0 ? "green" : "red"}
            onClick={() => navigate("presupuesto")} />
          <KPI icon="🏃" label="Inscritos"
            value={d.ocupacionGlobal !== null ? `${d.totalInscritos}/${d.totalMaximos}` : String(d.totalInscritos)}
            sub={`TG7 ${d.inscritosPorDist.TG7}${d.ocupacionPorDist.TG7!==null?` (${d.ocupacionPorDist.TG7}%)`:""}  ·  TG13 ${d.inscritosPorDist.TG13}${d.ocupacionPorDist.TG13!==null?` (${d.ocupacionPorDist.TG13}%)`:""}  ·  TG25 ${d.inscritosPorDist.TG25}${d.ocupacionPorDist.TG25!==null?` (${d.ocupacionPorDist.TG25}%)`:""}`}
            color="var(--cyan)" colorClass="cyan"
            onClick={() => navigate("presupuesto")} />
          <KPI icon="👥" label="Voluntarios"
            value={`${d.volConfirmados}/${d.totalNecesarios}`}
            sub={`${d.coberturaVol}% cobertura · ${d.volPendientes} pendientes`}
            color={d.coberturaVol>=80?"var(--green)":d.coberturaVol>=50?"var(--amber)":"var(--red)"}
            colorClass={d.coberturaVol>=80?"green":d.coberturaVol>=50?"amber":"red"}
            onClick={() => navigate("voluntarios")} />
          <KPI icon="🤝" label="Patrocinio"
            value={fmt(d.patComprometido)}
            sub={`${Math.round(d.patComprometido/Math.max(d.objetivo,1)*100)}% de ${fmt(d.objetivo)}`}
            color="var(--amber)" colorClass="amber"
            onClick={() => navigate("patrocinadores")} />
          <KPI icon="📋" label="Tareas"
            value={`${d.tareasCompletadas}/${d.tareasTotal}`}
            sub={`${d.progresoGlobal}% · ${d.tareasVencidas} vencidas`}
            color="var(--violet)" colorClass="violet"
            onClick={() => navigate("proyecto")} />
          <KPI icon="✅" label="Checklist"
            value={`${d.ckDone}/${d.ckTotal}`}
            sub={`Timeline: ${d.tlDone}/${d.tlTotal} completados`}
            color="var(--cyan)" colorClass="cyan"
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
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v,n) => [`${v} corredores`,n]} />
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

          {/* Ingresos vs Costes */}
          <div className="card dash-chart-card">
            <div className="card-title violet">💰 Ingresos vs Costes</div>
            {d.totalIngresos === 0 && d.totalCostesFijos === 0
              ? <EmptyChart mensaje="Sin datos económicos" sub="Configura costes e inscritos en Presupuesto" />
              : <ResponsiveContainer width="100%" height={185}>
                  <BarChart data={[
                      { name:"Inscripciones", val: d.totalIngresos,      color:"#22d3ee" },
                      { name:"Patrocinios",   val: d.totalIngresosExtra,  color:"#34d399" },
                      { name:"Merch",         val: d.merchBeneficio,     color:"#a78bfa" },
                      { name:"C. Fijos",      val:-d.totalCostesFijos,   color:"#f87171" },
                      { name:"C. Variables",  val:-d.totalCostesVars,    color:"#fb923c" },
                    ]} margin={{ top:4, right:4, left:-24, bottom:22 }}>
                    <XAxis dataKey="name" tick={{ fontSize:9, fontFamily:"'Space Mono',monospace", fill:"#5a6a8a" }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize:8, fontFamily:"'Space Mono',monospace", fill:"#5a6a8a" }} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>[fmt(Math.abs(v)),""]} labelStyle={{ color:"#e8eef8" }} />
                    <Bar dataKey="val" radius={[4,4,0,0]}>
                      {["#22d3ee","#34d399","#a78bfa","#f87171","#fb923c"].map((c,i) => <Cell key={i} fill={c} opacity={0.85}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>

          {/* Objetivos */}
          <div className="card dash-chart-card">
            <div className="card-title amber">🎯 Objetivos clave</div>
            {d.tareasTotal === 0 && d.totalNecesarios === 0
              ? <EmptyChart mensaje="Sin objetivos definidos" sub="Añade tareas en Proyecto y puestos en Voluntarios" />
              : <>
                  <ResponsiveContainer width="100%" height={140}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius={18} outerRadius={65}
                      data={[
                        { name:"Voluntarios", value:Math.min(d.coberturaVol,100), fill: d.coberturaVol>=80?"#34d399":d.coberturaVol>=50?"#fbbf24":"#f87171" },
                        { name:"Patrocinio",  value:Math.min(Math.round(d.patComprometido/Math.max(d.objetivo,1)*100),100), fill:"#fbbf24" },
                        { name:"Tareas",      value:d.progresoGlobal, fill:"#a78bfa" },
                      ]} startAngle={90} endAngle={-270}>
                      <RadialBar dataKey="value" background={{ fill:"#1a2540" }} cornerRadius={4} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v,n)=>[`${v}%`,n]} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem" }}>
                    {[
                      ["👥 Voluntarios", `${d.coberturaVol}%`,   d.coberturaVol>=80?"#34d399":d.coberturaVol>=50?"#fbbf24":"#f87171", "voluntarios"],
                      ["🤝 Patrocinio",  `${Math.min(Math.round(d.patComprometido/Math.max(d.objetivo,1)*100),100)}%`, "#fbbf24", "patrocinadores"],
                      ["📋 Proyecto",    `${d.progresoGlobal}%`, "#a78bfa", "proyecto"],
                    ].map(([n,v,c,bloque])=>(
                      <div key={n} className="flex-between dash-objetivo-row" onClick={() => navigate(bloque)}>
                        <span className="mono xs muted">{n}</span>
                        <span className="mono xs bold" style={{ color:c }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </>
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
              const c    = dias<=0?"var(--red)":dias<=7?"var(--red)":dias<=30?"var(--amber)":"var(--green)";
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

        {/* ── DESGLOSE ECONÓMICO ── */}
        <div className="card">
          <div className="flex-between mb-sm">
            <div className="card-title" style={{ marginBottom:0 }}>💰 Desglose Económico</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("presupuesto")}>Ver detalle →</button>
          </div>
          {[
            ["Ingresos inscripciones",    fmt(d.totalIngresos),           "var(--cyan)"],
            ["Patrocinios y subvenciones",fmt(d.totalIngresosExtra),      "var(--green)"],
            ["Merchandising (neto)",      fmt(d.merchBeneficio),          "var(--violet)"],
            ["Costes fijos",              `-${fmt(d.totalCostesFijos)}`,  "var(--red)"],
            ["Costes variables",          `-${fmt(d.totalCostesVars)}`,   "var(--orange)"],
          ].map(([label,val,color]) => (
            <div key={label} className="flex-between" style={{ padding:"0.35rem 0", borderBottom:"1px solid rgba(30,45,80,0.35)" }}>
              <span className="mono xs muted">{label}</span>
              <span className="mono xs bold" style={{ color }}>{val}</span>
            </div>
          ))}
          <div className="flex-between" style={{ padding:"0.65rem 0 0", borderTop:"2px solid var(--border)", marginTop:"0.2rem" }}>
            <span className="mono xs bold">RESULTADO</span>
            <span className="mono sm bold" style={{ color:resColor }}>{fmt(d.resultado)}</span>
          </div>
        </div>

      </div>
    </>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function KPI({ icon, label, value, sub, color, colorClass, onClick }) {
  return (
    <div className={`kpi ${colorClass||""} ${onClick?"dash-kpi-clickable":""}`}
      onClick={onClick} title={onClick ? `Ir a ${label}` : undefined}>
      <div className="kpi-label">{icon} {label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-sub">{sub}</div>
      {onClick && <div className="dash-kpi-arrow">→</div>}
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
  borderRadius:8, fontSize:"0.65rem", fontFamily:"'Space Mono',monospace",
};

const DASH_EXTRA_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Space+Mono:wght@400;700&display=swap');
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
  .dash-countdown-label { font-family:'Space Mono',monospace; font-size:0.72rem; color:var(--text-muted); }
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

  /* Alertas críticas */
  .dash-alertas-criticas {
    background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.3);
    border-radius:var(--r); overflow:hidden;
    animation:teg-slidein 0.2s ease;
  }
  .dash-alertas-header {
    padding:0.55rem 1rem; background:rgba(248,113,113,0.1);
    font-family:'Space Mono',monospace; font-size:0.68rem;
    font-weight:700; color:#f87171; letter-spacing:0.05em;
    border-bottom:1px solid rgba(248,113,113,0.2);
  }
  .dash-alertas-criticas .dash-alerta { margin:0; border-radius:0; border:none; border-bottom:1px solid rgba(248,113,113,0.1); }
  .dash-alertas-criticas .dash-alerta:last-child { border-bottom:none; }

  /* Toggle avisos */
  .dash-avisos-toggle {
    display:flex; justify-content:space-between; align-items:center;
    width:100%; background:none; border:none; cursor:pointer; padding:0;
  }
  .dash-avisos-toggle:hover .mono { color:var(--text) !important; }

  /* Alertas base */
  .dash-alerta {
    display:flex; align-items:center; gap:0.6rem; padding:0.55rem 0.85rem;
    font-family:'Space Mono',monospace; font-size:0.68rem;
  }
  .dash-alerta-text { flex:1; line-height:1.4; }
  .dash-alerta-danger  { background:rgba(248,113,113,0.06); color:#f87171; }
  .dash-alerta-warning { background:rgba(251,191,36,0.05);  color:#fbbf24; }
  .dash-alerta-info    { background:rgba(34,211,238,0.05);  color:#22d3ee; }
  .dash-alerta-clickable { cursor:pointer; transition:filter .15s; }
  .dash-alerta-clickable:hover { filter:brightness(1.15); }

  /* KPIs clickables */
  .dash-kpi-clickable { cursor:pointer; }
  .dash-kpi-clickable:hover { transform:translateY(-2px); border-color:var(--border-light) !important; }
  .dash-kpi-arrow {
    font-family:'Space Mono',monospace; font-size:0.6rem;
    color:var(--text-dim); margin-top:0.35rem; transition:color .15s;
  }
  .dash-kpi-clickable:hover .dash-kpi-arrow { color:var(--cyan); }

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
