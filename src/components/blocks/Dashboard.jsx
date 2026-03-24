import { useState, useMemo, useEffect, useCallback } from "react";
import { BLOCK_CSS, blockCls } from "@/lib/blockStyles";
import dataService from "@/lib/dataService";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie,
} from "recharts";

// Claves de todas las colecciones que necesita el Dashboard
const ALL_KEYS = {
  "teg_presupuesto_v1_conceptos":     [],
  "teg_presupuesto_v1_tramos":         [],
  "teg_presupuesto_v1_inscritos":      { tramos: {} },
  "teg_presupuesto_v1_ingresosExtra":  [],
  "teg_presupuesto_v1_merchandising":  [],
  "teg_presupuesto_v1_maximos":        {},
  "teg_voluntarios_v1_voluntarios":    [],
  "teg_voluntarios_v1_puestos":        [],
  "teg_patrocinadores_v1_pats":        [],
  "teg_patrocinadores_v1_obj":         8000,
  "teg_logistica_v1_mat":              [],
  "teg_logistica_v1_asig":             [],
  "teg_logistica_v1_tl":               [],
  "teg_logistica_v1_ck":               [],
  "teg_proyecto_v1_tareas":            [],
  "teg_proyecto_v1_hitos":             [],
};

const EVENT_DATE = new Date("2026-08-29");
const fmt = (n) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export default function Dashboard() {
  const [rawData, setRawData]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const data = await dataService.getMultiple(ALL_KEYS);
      setRawData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard: error cargando datos", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Re-cargar cuando otro módulo notifique un cambio (sync local)
    // o cuando dataService confirme guardado exitoso en Neon (save-status)
    const handler = () => loadData();
    const saveHandler = (e) => { if (e.detail?.status === "saved") loadData(); };
    window.addEventListener("teg-sync", handler);
    window.addEventListener("teg-save-status", saveHandler);
    return () => {
      window.removeEventListener("teg-sync", handler);
      window.removeEventListener("teg-save-status", saveHandler);
    };
  }, [loadData]);

  const data = useMemo(() => {
    // Datos de la API (rawData) o defaults vacíos si aún cargando
    const d = rawData ?? {};
    const get = (key, def) => {
      const v = d[key];
      if (v === undefined || v === null) return def;
      if (Array.isArray(def) && !Array.isArray(v)) return def;
      return v;
    };

    const TODAY = new Date();
    const diasHasta = Math.ceil((EVENT_DATE - TODAY) / 86400000);

    // PRESUPUESTO
    const conceptos    = get("teg_presupuesto_v1_conceptos", []);
    const tramos       = get("teg_presupuesto_v1_tramos", []);
    const inscritos    = get("teg_presupuesto_v1_inscritos", { tramos: {} });
    const ingresosExtra  = get("teg_presupuesto_v1_ingresosExtra", []);
    const merchandising  = get("teg_presupuesto_v1_merchandising", []);
    const maximos        = get("teg_presupuesto_v1_maximos", {});

    const DISTANCIAS = ["TG7", "TG13", "TG25"];
    let totalInscritos = 0;
    const inscritosPorDist = { TG7: 0, TG13: 0, TG25: 0 };
    let totalIngresos = 0;
    tramos.forEach(t => {
      DISTANCIAS.forEach(d => {
        const n = inscritos.tramos?.[t.id]?.[d] || 0;
        inscritosPorDist[d] += n;
        totalInscritos += n;
        totalIngresos += n * (t.precios?.[d] || 0);
      });
    });

    // Ocupación por distancia (inscritos vs plazas máximas)
    const maximosPorDist = {
      TG7:  maximos?.TG7  || 0,
      TG13: maximos?.TG13 || 0,
      TG25: maximos?.TG25 || 0,
    };
    const totalMaximos = maximosPorDist.TG7 + maximosPorDist.TG13 + maximosPorDist.TG25;
    const ocupacionPorDist = {
      TG7:  maximosPorDist.TG7  > 0 ? Math.round(inscritosPorDist.TG7  / maximosPorDist.TG7  * 100) : null,
      TG13: maximosPorDist.TG13 > 0 ? Math.round(inscritosPorDist.TG13 / maximosPorDist.TG13 * 100) : null,
      TG25: maximosPorDist.TG25 > 0 ? Math.round(inscritosPorDist.TG25 / maximosPorDist.TG25 * 100) : null,
    };
    const ocupacionGlobal = totalMaximos > 0 ? Math.round(totalInscritos / totalMaximos * 100) : null;

    const totalCostesFijos = conceptos.filter(c => c.tipo === "fijo" && c.activo).reduce((s, c) => s + (c.costeTotal || 0), 0);
    const totalCostesVars = conceptos.filter(c => c.tipo === "variable" && c.activo).reduce((s, c) => {
      return s + DISTANCIAS.reduce((ss, dist) => ss + (c.costePorDistancia?.[dist] || 0) * inscritosPorDist[dist], 0);
    }, 0);
    const totalIngresosExtra = ingresosExtra.filter(i => i.activo).reduce((s, i) => s + (i.valor || 0), 0);
    const merchIngresos = merchandising.filter(m => m.activo).reduce((s, m) => s + m.unidades * m.precioVenta, 0);
    const merchCostes = merchandising.filter(m => m.activo).reduce((s, m) => s + m.unidades * m.costeUnitario, 0);
    const merchBeneficio = merchIngresos - merchCostes;
    const totalOtrosIngresos = totalIngresosExtra + merchBeneficio;
    const resultado = totalIngresos + totalOtrosIngresos - totalCostesFijos - totalCostesVars;

    // VOLUNTARIOS
    const voluntarios   = get("teg_voluntarios_v1_voluntarios", []);
    const puestos       = get("teg_voluntarios_v1_puestos", []);
    const volConfirmados = voluntarios.filter(v => v.estado === "confirmado").length;
    const volPendientes  = voluntarios.filter(v => v.estado === "pendiente").length;
    const totalNecesarios = puestos.reduce((s, p) => s + p.necesarios, 0);
    const coberturaVol = totalNecesarios > 0 ? Math.round((volConfirmados / totalNecesarios) * 100) : 0;
    const puestosAlerta = puestos.filter(p => {
      const asignados = voluntarios.filter(v => v.puestoId === p.id && v.estado !== "cancelado").length;
      return asignados < p.necesarios * 0.5;
    });

    // PATROCINADORES
    const pats     = get("teg_patrocinadores_v1_pats", []);
    const objetivo = get("teg_patrocinadores_v1_obj", 8000);
    const patComprometido = pats.filter(p => p.estado === "confirmado" || p.estado === "cobrado").reduce((s, p) => s + (p.importe || 0), 0);
    const patCobrado  = pats.filter(p => p.estado === "cobrado").reduce((s, p) => s + (p.importe || 0), 0);
    const patPipeline = pats.filter(p => p.estado === "negociando" || p.estado === "prospecto").reduce((s, p) => s + (p.importe || 0), 0);
    const contPendientes = pats.reduce((s, p) => s + (p.contraprestaciones || []).filter(c => c.estado === "pendiente").length, 0);

    // LOGÍSTICA
    const material  = get("teg_logistica_v1_mat", []);
    const asigs     = get("teg_logistica_v1_asig", []);
    const tl        = get("teg_logistica_v1_tl", []);
    const ck        = get("teg_logistica_v1_ck", []);
    const tlDone = tl.filter(t => t.estado === "completado").length;
    const ckDone = ck.filter(c => c.estado === "completado").length;
    const stockAlerts = material.filter(m => {
      const asignado = asigs.filter(a => a.materialId === m.id).reduce((s, a) => s + a.cantidad, 0);
      return asignado > m.stock;
    });

    // PROYECTO
    const tareas = get("teg_proyecto_v1_tareas", []);
    const hitos  = get("teg_proyecto_v1_hitos", []);
    const tareasTotal       = tareas.length;
    const tareasCompletadas = tareas.filter(t => t.estado === "completado").length;
    const tareasBloqueadas  = tareas.filter(t => t.estado === "bloqueado").length;
    const tareasVencidas    = tareas.filter(t => t.estado !== "completado" && t.fechaLimite && new Date(t.fechaLimite) < TODAY).length;
    const progresoGlobal    = tareasTotal > 0 ? Math.round((tareasCompletadas / tareasTotal) * 100) : 0;
    const hitosProximos     = hitos.filter(h => !h.completado && h.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5);

    // ALERTAS
    const alertas = [];
    if (tareasVencidas > 0) alertas.push({ tipo: "danger", icon: "🔴", texto: `${tareasVencidas} tareas vencidas sin completar`, modulo: "proyecto" });
    if (tareasBloqueadas > 0) alertas.push({ tipo: "warning", icon: "🟡", texto: `${tareasBloqueadas} tareas bloqueadas`, modulo: "proyecto" });
    if (coberturaVol < 50) alertas.push({ tipo: "danger", icon: "🔴", texto: `Cobertura de voluntarios crítica: ${coberturaVol}%`, modulo: "voluntarios" });
    else if (coberturaVol < 80) alertas.push({ tipo: "warning", icon: "🟡", texto: `Cobertura de voluntarios insuficiente: ${coberturaVol}%`, modulo: "voluntarios" });
    if (volPendientes > 0) alertas.push({ tipo: "info", icon: "🔵", texto: `${volPendientes} voluntarios pendientes de confirmar`, modulo: "voluntarios" });
    if (patComprometido < objetivo * 0.5) alertas.push({ tipo: "warning", icon: "🟡", texto: `Patrocinio al ${Math.round(patComprometido / objetivo * 100)}% del objetivo`, modulo: "patrocinadores" });
    if (contPendientes > 0) alertas.push({ tipo: "info", icon: "🔵", texto: `${contPendientes} contraprestaciones pendientes de entregar`, modulo: "patrocinadores" });
    if (stockAlerts.length > 0) alertas.push({ tipo: "warning", icon: "🟡", texto: `${stockAlerts.length} materiales con sobreasignación de stock`, modulo: "logistica" });
    if (puestosAlerta.length > 0) alertas.push({ tipo: "danger", icon: "🔴", texto: `${puestosAlerta.length} puestos con cobertura <50%`, modulo: "voluntarios" });
    if (resultado < 0) alertas.push({ tipo: "danger", icon: "🔴", texto: `Resultado negativo: ${fmt(resultado)}`, modulo: "presupuesto" });
    hitosProximos.forEach(h => {
      const dias = Math.ceil((new Date(h.fecha) - TODAY) / 86400000);
      if (dias <= 14 && dias >= 0 && h.critico) alertas.push({ tipo: "warning", icon: "⚡", texto: `Hito crítico en ${dias} días: ${h.nombre}`, modulo: "proyecto" });
    });

    return {
      diasHasta, totalInscritos, inscritosPorDist, totalIngresos, totalCostesFijos, totalCostesVars,
      totalIngresosExtra, merchBeneficio, merchIngresos, merchCostes, totalOtrosIngresos, resultado,
      maximosPorDist, ocupacionPorDist, ocupacionGlobal, totalMaximos,
      voluntarios: voluntarios.length, volConfirmados, volPendientes, totalNecesarios, coberturaVol, puestosAlerta,
      pats: pats.length, patComprometido, patCobrado, patPipeline, objetivo, contPendientes,
      material: material.length, stockAlerts, tlDone, tlTotal: tl.length, ckDone, ckTotal: ck.length,
      tareasTotal, tareasCompletadas, tareasBloqueadas, tareasVencidas, progresoGlobal, hitosProximos,
      alertas,
    };
  }, [rawData]);

  if (loading) {
    return (
      <>
        <style>{BLOCK_CSS}</style>
        <div className="block-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "1rem" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #1e2d50", borderTopColor: "#22d3ee", animation: "teg-spin 0.7s linear infinite" }} />
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "0.6rem", color: "#3a4a6a", letterSpacing: "0.1em" }}>Cargando datos…</div>
          <style>{`@keyframes teg-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  const d = data;
  const resColor = d.resultado >= 0 ? "var(--green)" : "var(--red)";
  const resBg = d.resultado >= 0 ? "var(--green-dim)" : "var(--red-dim)";

  return (
    <>
      <style>{BLOCK_CSS + DASH_EXTRA_CSS}</style>
      <div className="block-container">

        {/* ── HEADER ── */}
        <div className="block-header">
          <div>
            <h1 className="block-title">📊 Dashboard</h1>
            <div className="block-title-sub">
              Trail El Guerrero · 29 AGO 2026
              {lastUpdated && (
                <span className="mono" style={{marginLeft:"0.75rem", fontSize:"0.55rem", color:"var(--text-dim)"}}>
                  · act. {lastUpdated.toLocaleTimeString("es-ES", {hour:"2-digit", minute:"2-digit", second:"2-digit"})}
                </span>
              )}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setLoading(true); loadData(); }}
            title="Recargar datos de todos los módulos"
          >
            🔄 Actualizar
          </button>
        </div>

        {/* ── COUNTDOWN HERO ── */}
        <div className="dash-hero card mb">
          <div className="dash-hero-bg" />
          <div className="dash-hero-content">
            <div className="dash-eyebrow mono xs muted">🏔️ Trail El Guerrero 2026 · 29 AGO</div>
            <div className="dash-countdown">
              <span className="dash-countdown-num">{Math.max(0, d.diasHasta)}</span>
              <span className="dash-countdown-label mono muted">días para la carrera</span>
            </div>
            <div className="flex-center gap-sm" style={{ marginTop: "0.75rem" }}>
              <span className="mono xs muted" style={{ whiteSpace: "nowrap" }}>Progreso global</span>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-fill" style={{ width: `${d.progresoGlobal}%`, background: "linear-gradient(90deg,#22d3ee,#a78bfa)" }} />
              </div>
              <span className="mono xs bold" style={{ color: "#22d3ee", whiteSpace: "nowrap" }}>{d.progresoGlobal}%</span>
            </div>
          </div>
        </div>

        {/* ── ALERTAS ── */}
        {d.alertas.length > 0 && (
          <div className="card mb">
            <div className="card-title amber">⚡ Alertas y Avisos · click para ir al módulo</div>
            {d.alertas.map((a, i) => (
              <div key={i}
                className={blockCls("dash-alerta", `dash-alerta-${a.tipo}`, "dash-alerta-clickable")}
                onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: a.modulo } }))}
                title={`Ir a ${a.modulo}`}
              >
                <span>{a.icon}</span>
                <span className="dash-alerta-text">{a.texto}</span>
                <span className="badge badge-muted" style={{flexShrink:0}}>{a.modulo} →</span>
              </div>
            ))}
          </div>
        )}

        {/* ── KPIs ── */}
        <div className="card-title" style={{ marginBottom: "0.75rem" }}>📊 Indicadores Clave</div>
        <div className="kpi-grid mb">
          <KPI icon="💰" label="Resultado"          value={fmt(d.resultado)}                          sub={`Ingresos totales: ${fmt(d.totalIngresos + d.totalOtrosIngresos)}`}                                         color={resColor} colorClass={d.resultado >= 0 ? "green" : "red"} />
          <KPI icon="🏃" label="Inscritos"
            value={d.ocupacionGlobal !== null ? `${d.totalInscritos} / ${d.totalMaximos}` : d.totalInscritos}
            sub={`TG7: ${d.inscritosPorDist.TG7}${d.ocupacionPorDist.TG7!==null?` (${d.ocupacionPorDist.TG7}%)`:""}  ·  TG13: ${d.inscritosPorDist.TG13}${d.ocupacionPorDist.TG13!==null?` (${d.ocupacionPorDist.TG13}%)`:""}  ·  TG25: ${d.inscritosPorDist.TG25}${d.ocupacionPorDist.TG25!==null?` (${d.ocupacionPorDist.TG25}%)`:""}`}
            color="var(--cyan)" colorClass="cyan" />
          <KPI icon="👥" label="Voluntarios"         value={`${d.volConfirmados}/${d.totalNecesarios}`} sub={`${d.coberturaVol}% cobertura · ${d.volPendientes} pendientes`}                                            color={d.coberturaVol>=80?"var(--green)":d.coberturaVol>=50?"var(--amber)":"var(--red)"} colorClass={d.coberturaVol>=80?"green":d.coberturaVol>=50?"amber":"red"} />
          <KPI icon="🤝" label="Patrocinio"          value={fmt(d.patComprometido)}                    sub={`${Math.round(d.patComprometido/d.objetivo*100)}% de ${fmt(d.objetivo)}`}                                  color="var(--amber)"  colorClass="amber" />
          <KPI icon="📋" label="Tareas"              value={`${d.tareasCompletadas}/${d.tareasTotal}`} sub={`${d.progresoGlobal}% · ${d.tareasVencidas} vencidas`}                                                      color="var(--violet)" colorClass="violet" />
          <KPI icon="✅" label="Checklist Logística" value={`${d.ckDone}/${d.ckTotal}`}               sub={`Timeline: ${d.tlDone}/${d.tlTotal} completados`}                                                           color="var(--cyan)"   colorClass="cyan" />
        </div>

        {/* ── CHARTS ── */}
        <div className="card-title" style={{ marginBottom: "0.75rem" }}>📈 Visualizaciones</div>
        <div className="dash-charts-row mb">

          <div className="card dash-chart-card">
            <div className="card-title cyan">🏃 Inscritos por distancia</div>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={[
                    { name:"TG7",  value: d.inscritosPorDist.TG7  || 0, color:"#22d3ee" },
                    { name:"TG13", value: d.inscritosPorDist.TG13 || 0, color:"#a78bfa" },
                    { name:"TG25", value: d.inscritosPorDist.TG25 || 0, color:"#34d399" },
                  ]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                  {["#22d3ee","#a78bfa","#34d399"].map((c,i) => <Cell key={i} fill={c} opacity={0.9} />)}
                </Pie>
                <Tooltip contentStyle={{ background:"#0f1629", border:"1px solid #1e2d50", borderRadius:8, fontSize:"0.65rem", fontFamily:"'Space Mono',monospace" }} formatter={(v,n) => [`${v} corredores`,n]} />
              </PieChart>
            </ResponsiveContainer>
            {/* Leyenda con barras de ocupación */}
            <div style={{display:"flex", flexDirection:"column", gap:"0.4rem", marginTop:"0.4rem"}}>
              {[["TG7","#22d3ee"],["TG13","#a78bfa"],["TG25","#34d399"]].map(([dist,color]) => {
                const inscritos = d.inscritosPorDist[dist];
                const maximo = d.maximosPorDist[dist];
                const pct = d.ocupacionPorDist[dist];
                return (
                  <div key={dist}>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:"0.15rem"}}>
                      <span className="mono xs bold" style={{color}}>{dist}</span>
                      <span className="mono xs" style={{color:"var(--text-muted)"}}>
                        {inscritos}{maximo > 0 ? ` / ${maximo}` : ""}{pct !== null ? ` · ${pct}%` : ""}
                      </span>
                    </div>
                    {maximo > 0 && (
                      <div style={{height:4, background:"var(--surface3)", borderRadius:2, overflow:"hidden"}}>
                        <div style={{height:"100%", width:`${Math.min(pct,100)}%`, background:color, borderRadius:2,
                          transition:"width .5s", opacity: pct >= 90 ? 1 : 0.7}} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card dash-chart-card">
            <div className="card-title violet">💰 Ingresos vs Costes</div>
            <ResponsiveContainer width="100%" height={185}>
              <BarChart data={[
                  { name:"Inscripciones", val:d.totalIngresos,      color:"#22d3ee" },
                  { name:"Patrocinios",   val:d.totalIngresosExtra,  color:"#34d399" },
                  { name:"Merch",         val:d.merchBeneficio,     color:"#a78bfa" },
                  { name:"C. Fijos",      val:-d.totalCostesFijos,   color:"#f87171" },
                  { name:"C. Variables",  val:-d.totalCostesVars,    color:"#fb923c" },
                ]} margin={{ top:4, right:4, left:-24, bottom:22 }}>
                <XAxis dataKey="name" tick={{ fontSize:9, fontFamily:"'Space Mono',monospace", fill:"#5a6a8a" }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize:8, fontFamily:"'Space Mono',monospace", fill:"#5a6a8a" }} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background:"#0f1629", border:"1px solid #1e2d50", borderRadius:8, fontSize:"0.65rem", fontFamily:"'Space Mono',monospace" }} formatter={v=>[fmt(Math.abs(v)),""]} labelStyle={{ color:"#e8eef8" }} />
                <Bar dataKey="val" radius={[4,4,0,0]}>
                  {["#22d3ee","#34d399","#a78bfa","#f87171","#fb923c"].map((c,i)=><Cell key={i} fill={c} opacity={0.85}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card dash-chart-card">
            <div className="card-title amber">🎯 Objetivos clave</div>
            <ResponsiveContainer width="100%" height={150}>
              <RadialBarChart cx="50%" cy="50%" innerRadius={20} outerRadius={68}
                data={[
                  { name:"Voluntarios", value:Math.min(d.coberturaVol,100), fill: d.coberturaVol>=80?"#34d399":d.coberturaVol>=50?"#fbbf24":"#f87171" },
                  { name:"Patrocinio",  value:Math.min(Math.round(d.patComprometido/Math.max(d.objetivo,1)*100),100), fill:"#fbbf24" },
                  { name:"Tareas",      value:d.progresoGlobal, fill:"#a78bfa" },
                ]} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" background={{ fill:"#1a2540" }} cornerRadius={4} />
                <Tooltip contentStyle={{ background:"#0f1629", border:"1px solid #1e2d50", borderRadius:8, fontSize:"0.65rem", fontFamily:"'Space Mono',monospace" }} formatter={(v,n)=>[`${v}%`,n]} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem", marginTop:"0.25rem" }}>
              {[["👥 Voluntarios",`${d.coberturaVol}%`,d.coberturaVol>=80?"#34d399":d.coberturaVol>=50?"#fbbf24":"#f87171"],["🤝 Patrocinio",`${Math.min(Math.round(d.patComprometido/Math.max(d.objetivo,1)*100),100)}%`,"#fbbf24"],["📋 Proyecto",`${d.progresoGlobal}%`,"#a78bfa"]].map(([n,v,c])=>(
                <div key={n} className="flex-between">
                  <span className="mono xs muted">{n}</span>
                  <span className="mono xs bold" style={{ color:c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── HITOS ── */}
        {d.hitosProximos.length > 0 && (
          <div className="card mb">
            <div className="card-title">📅 Próximos Hitos</div>
            {d.hitosProximos.map(h => {
              const dias = Math.ceil((new Date(h.fecha) - new Date()) / 86400000);
              const c = dias<=7?"var(--red)":dias<=30?"var(--amber)":"var(--green)";
              return (
                <div key={h.id} className="dash-hito">
                  <div className="flex-center gap-sm" style={{ flex:1, minWidth:0 }}>
                    {h.critico && <span className="xs">⚡</span>}
                    <span className="sm bold" style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{h.nombre}</span>
                  </div>
                  <div className="flex-center gap-sm">
                    <span className="mono xs muted">{new Date(h.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"short"})}</span>
                    <span className="mono xs bold" style={{ color:c }}>{dias>0?`${dias}d`:dias===0?"HOY":"Pasado"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── DESGLOSE + ESTADO ── */}
        <div className="grid-2">
          <div className="card">
            <div className="card-title">💰 Desglose Económico</div>
            {[
              ["Ingresos inscripciones",  fmt(d.totalIngresos),      "var(--cyan)"],
              ["Patrocinios y subvenciones", fmt(d.totalIngresosExtra),"var(--green)"],
              ["Merchandising (neto)",    fmt(d.merchBeneficio),     "var(--violet)"],
              ["Costes fijos",            `-${fmt(d.totalCostesFijos)}`,"var(--red)"],
              ["Costes variables",        `-${fmt(d.totalCostesVars)}`,"var(--orange)"],
            ].map(([label,val,color])=>(
              <div key={label} className="flex-between" style={{ padding:"0.35rem 0", borderBottom:"1px solid rgba(30,45,80,0.4)" }}>
                <span className="mono xs muted">{label}</span>
                <span className="mono xs bold" style={{ color }}>{val}</span>
              </div>
            ))}
            <div className="flex-between" style={{ padding:"0.65rem 0 0", marginTop:"0.25rem", borderTop:"2px solid var(--border)" }}>
              <span className="mono xs bold">RESULTADO</span>
              <span className="mono sm bold" style={{ color:resColor }}>{fmt(d.resultado)}</span>
            </div>
          </div>

          <div className="card">
            <div className="card-title">📊 Estado por Módulo</div>
            {[
              { label:"Presupuesto",    icon:"💰", val:d.resultado>=0?"Positivo":"Negativo",           color:d.resultado>=0?"var(--green)":"var(--red)" },
              { label:"Voluntarios",   icon:"👥", val:`${d.coberturaVol}% cobertura`,                  color:d.coberturaVol>=80?"var(--green)":d.coberturaVol>=50?"var(--amber)":"var(--red)" },
              { label:"Patrocinadores",icon:"🤝", val:`${Math.round(d.patComprometido/d.objetivo*100)}% objetivo`, color:d.patComprometido>=d.objetivo*0.8?"var(--green)":d.patComprometido>=d.objetivo*0.5?"var(--amber)":"var(--red)" },
              { label:"Logística",     icon:"📦", val:`${d.ckDone}/${d.ckTotal} checklist`,            color:d.ckDone>=d.ckTotal*0.8?"var(--green)":d.ckDone>=d.ckTotal*0.5?"var(--amber)":"var(--red)" },
              { label:"Proyecto",      icon:"🏔️", val:`${d.progresoGlobal}% completado`,               color:d.progresoGlobal>=80?"var(--green)":d.progresoGlobal>=50?"var(--amber)":"var(--red)" },
            ].map(m=>(
              <div key={m.label} className="flex-between" style={{ padding:"0.4rem 0", borderBottom:"1px solid rgba(30,45,80,0.35)" }}>
                <div className="flex-center gap-sm">
                  <span>{m.icon}</span>
                  <span className="sm bold">{m.label}</span>
                </div>
                <div className="flex-center gap-sm">
                  <span className="mono xs" style={{ color:m.color }}>{m.val}</span>
                  <span className="dot" style={{ background:m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}

function KPI({ icon, label, value, sub, color, colorClass }) {
  return (
    <div className={`kpi ${colorClass || ""}`}>
      <div className="kpi-label">{icon} {label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

const DASH_EXTRA_CSS = `
  /* Hero countdown */
  .dash-hero { position:relative; overflow:hidden; padding:1.5rem 1.25rem; }
  .dash-hero-bg { position:absolute; inset:0; background:radial-gradient(ellipse 70% 50% at 50% 0%, rgba(34,211,238,0.1) 0%, transparent 60%); pointer-events:none; }
  .dash-hero-content { position:relative; z-index:1; }
  .dash-countdown { display:flex; align-items:baseline; gap:0.5rem; margin-bottom:0.85rem; }
  .dash-countdown-num {
    font-family:'Syne',sans-serif; font-size:2.8rem; font-weight:800; line-height:.9;
    background:linear-gradient(135deg,#fff 0%,#22d3ee 55%,#a78bfa 100%);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }
  @media(max-width:480px){ .dash-countdown-num{ font-size:2rem; } }

  /* Alertas */
  .dash-alerta {
    display:flex; align-items:center; gap:0.6rem; padding:0.55rem 0.8rem;
    border-radius:8px; margin-bottom:0.35rem; font-family:'Space Mono',monospace;
    font-size:0.7rem; border:1px solid;
  }
  .dash-alerta-text { flex:1; }
  .dash-alerta-danger  { background:rgba(248,113,113,0.06); border-color:rgba(248,113,113,0.2); color:#f87171; }
  .dash-alerta-warning { background:rgba(251,191,36,0.06);  border-color:rgba(251,191,36,0.2);  color:#fbbf24; }
  .dash-alerta-info    { background:rgba(34,211,238,0.06);  border-color:rgba(34,211,238,0.2);  color:#22d3ee; }

  /* Charts */
  .dash-charts-row {
    display:grid; grid-template-columns:repeat(3,1fr); gap:0.85rem; margin-bottom:1rem;
  }
  @media(max-width:700px) { .dash-charts-row { grid-template-columns:1fr; } }
  @media(min-width:701px) and (max-width:900px) {
    .dash-charts-row { grid-template-columns:1fr 1fr; }
    .dash-chart-card:last-child { grid-column:span 2; }
  }
  .dash-chart-card { padding:0; }
  .dash-hito {
    display:flex; align-items:center; justify-content:space-between;
    padding:0.45rem 0; border-bottom:1px solid rgba(30,45,80,0.4);
  }
  .dash-hito:last-child { border-bottom:none; }
`;
