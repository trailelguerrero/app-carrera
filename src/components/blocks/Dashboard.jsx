import { useState } from "react";
import { fmtEur } from "@/lib/utils";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import {
  SK_PPTO_CONCEPTOS, SK_PPTO_TRAMOS, SK_PPTO_INSCRITOS, SK_PPTO_INGRESOS_EXTRA,
  SK_PPTO_MERCHANDISING, SK_PPTO_SYNC_CONFIG, SK_PPTO_MAXIMOS, SK_PPTO_SCENARIO_ACTIVE,
  SK_VOL_VOLUNTARIOS, SK_VOL_PUESTOS,
  SK_PAT_PATS, SK_PAT_OBJ,
  SK_LOG_MAT, SK_LOG_ASIG, SK_LOG_TL, SK_LOG_CK,
  SK_PROY_TAREAS, SK_PROY_HITOS,
  SK_DOC_DOCS, SK_DOC_GESTIONES,
  SK_UI_DASH_ALERTAS_OPEN,
  SK_CAM_PEDIDOS, SK_CAM_COSTE, SK_CAM_CORREDORES, SK_CAM_PRECIO_PLATAFORMA, SK_CAM_NINO,
} from "@/constants/storageKeys";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  Tooltip as RechartsTip,
} from "recharts";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import SkeletonBlock from "@/components/common/SkeletonBlock";
import { MiniDesglose } from "@/components/dashboard/MiniDesglose";
import { KPI } from "@/components/dashboard/KPI";
import { MiniTimeline } from "@/components/dashboard/MiniTimeline";
import { EmptyChart } from "@/components/dashboard/EmptyChart";
import { WidgetInscritos } from "@/components/dashboard/WidgetInscritos";
import SeccionBanners from "@/components/dashboard/SeccionBanners";
import SeccionHero from "@/components/dashboard/SeccionHero";
import SeccionAcciones from "@/components/dashboard/SeccionAcciones";
import SeccionAlertas from "@/components/dashboard/SeccionAlertas";

const ALL_KEYS = {
  [SK_PPTO_CONCEPTOS]:      [],
  [SK_PPTO_TRAMOS]:         [],
  [SK_PPTO_INSCRITOS]:      { tramos: {} },
  [SK_PPTO_INGRESOS_EXTRA]: [],
  [SK_PPTO_MERCHANDISING]:  [],
  [SK_PPTO_SYNC_CONFIG]:    {},
  [SK_PPTO_MAXIMOS]:        {},
  [SK_VOL_VOLUNTARIOS]:     [],
  [SK_VOL_PUESTOS]:         [],
  [SK_PAT_PATS]:            [],
  [SK_PAT_OBJ]:             8000,
  [SK_LOG_MAT]:             [],
  [SK_LOG_ASIG]:            [],
  [SK_LOG_TL]:              [],
  [SK_LOG_CK]:              [],
  [SK_PROY_TAREAS]:         [],
  [SK_PROY_HITOS]:          [],
  [SK_DOC_DOCS]:            [],
  [SK_DOC_GESTIONES]:       [],
  [LS_KEY_CONFIG]:          EVENT_CONFIG_DEFAULT,
  [SK_PPTO_SCENARIO_ACTIVE]: null,
};

const fmtD = (iso) => new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
const navigate = (block, subtab) => {
  // diaCarrera es un modal flotante (no un bloque registrado en BLOCKS[])
  // → se abre con su propio evento dedicado
  if (block === "diaCarrera") {
    window.dispatchEvent(new CustomEvent("teg-open-diacarrera"));
  } else {
    window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block, subtab } }));
  }
};

const TOOLTIP_STYLE = {
  background: "rgba(15,23,42,0.95)", border: "1px solid #334155",
  borderRadius: 8, fontSize: "var(--fs-sm)", fontFamily: "var(--font-mono)",
  color: "#e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
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

// ─── Componente ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [alertasExpandidas, setAlertasExpandidas] = useState(
    () => localStorage.getItem(SK_UI_DASH_ALERTAS_OPEN) === "1"
  ); // avisos: colapsados por defecto, persiste si el usuario los abre
  const [saludExpandida, setSaludExpandida] = useState(false); // colapsada por defecto

  const { rawData, loading, isRefreshing, lastUpdated, loadData } = useDashboardData(ALL_KEYS);
  const cfg = { ...EVENT_CONFIG_DEFAULT, ...((() => { try { const r = localStorage.getItem(LS_KEY_CONFIG); return r ? JSON.parse(r) : {}; } catch { return {}; } })()) };
  const data = useDashboardKpis(rawData, cfg.volDiasCritico, cfg.volDiasAviso);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{DASH_EXTRA_CSS}</style>
        <SkeletonBlock variant="dashboard" />
      </>
    );
  }

  const d = data;
  const resColor = d.resultado >= 0 ? "var(--green)" : "var(--red)";
  const saludColor = d.saludGlobal >= 80 ? "var(--green)" : d.saludGlobal >= 55 ? "var(--amber)" : "var(--red)";
  const saludLabel = d.saludGlobal >= 80 ? "Evento en buen estado" : d.saludGlobal >= 55 ? "Atención requerida" : "Acción urgente necesaria";

  return (
    <>
      <style>{DASH_EXTRA_CSS}</style>
      <div className="block-container">

        {/* ── HEADER ── */}
        {/* FRAG-DASH-01: indicador sutil de actualización de datos en curso */}
        {isRefreshing && (
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "var(--amber)", background: "rgba(251,191,36,.08)",
            border: "1px solid rgba(251,191,36,.2)",
            borderRadius: 6, padding: ".25rem .6rem",
            marginBottom: ".5rem", display: "inline-flex",
            alignItems: "center", gap: ".35rem",
          }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>↻</span>
            Actualizando datos…
          </div>
        )}
        <div className="block-header">
          <div>
            <h1 className="block-title">📊 Dashboard</h1>
            <div className="block-title-sub" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {d.eventoNombre} · {d.eventoEdicion}
              {/* Dot de refresco silencioso */}
              <span className={`dash-sync-dot ${isRefreshing ? "dash-sync-pulsing" : ""}`}
                title={lastUpdated ? `Actualizado a las ${lastUpdated.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Sin datos"} />
              {lastUpdated && (
                <span className="mono" style={{ fontSize: "0.52rem", color: "var(--text-dim)" }}>
                  {lastUpdated.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>

        </div>

        {/* ── Banners condicionales (escenario activo + día carrera inminente) ── */}
        <SeccionBanners d={d} />

        {/* ── Hero: countdown + salud del evento ── */}
        <SeccionHero d={d} saludExpandida={saludExpandida} setSaludExpandida={setSaludExpandida} />

        {/* ── Acciones priorizadas ── */}
        <SeccionAcciones d={d} />

        {/* ── Alertas críticas, avisos y estado OK ── */}
        <SeccionAlertas d={d} alertasExpandidas={alertasExpandidas} setAlertasExpandidas={setAlertasExpandidas} />



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
            progress={d.resultado >= 0 && (d.totalCostesFijos + d.totalCostesVars) > 0
              ? Math.min(100, Math.round(d.resultado / (d.totalCostesFijos + d.totalCostesVars) * 100))
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
            color={d.totalNecesarios === 0 ? "var(--text-muted)" : d.coberturaVol >= 80 ? "var(--green)" : d.coberturaVol >= 50 ? "var(--amber)" : "var(--red)"}
            colorClass={d.totalNecesarios === 0 ? "muted" : d.coberturaVol >= 80 ? "green" : d.coberturaVol >= 50 ? "amber" : "red"}
            progress={d.totalNecesarios > 0 ? d.coberturaVol : undefined}
            onClick={() => navigate("voluntarios")} />
          <KPI icon="🤝" label="Patrocinio"
            tooltip="Importe comprometido (confirmado + cobrado) de todos los patrocinadores activos.\nEl % indica el avance respecto al objetivo de captación.\nEl importe cobrado es el dinero realmente recibido."
            value={`${Math.round(d.patComprometido / Math.max(d.objetivo, 1) * 100)}%`}
            sub={(() => {
              const pct = d.objetivo > 0 ? Math.round(d.patComprometido / d.objetivo * 100) : 0;
              if (pct >= 100) return `✓ Objetivo superado · ${fmtEur(d.patCobrado)} cobrado`;
              const faltan = d.objetivo - d.patComprometido;
              return `Faltan ${fmtEur(faltan)} para el objetivo · ${fmtEur(d.patCobrado)} cobrado`;
            })()}
            color={d.patComprometido >= d.objetivo * 0.8 ? "var(--green)" : d.patComprometido >= d.objetivo * 0.5 ? "var(--amber)" : "var(--red)"}
            colorClass={d.patComprometido >= d.objetivo * 0.8 ? "green" : d.patComprometido >= d.objetivo * 0.5 ? "amber" : "red"}
            progress={d.objetivo > 0 ? Math.min(100, Math.round(d.patComprometido / d.objetivo * 100)) : undefined}
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
            color={d.tareasTotal === 0 ? "var(--text-muted)" : "var(--violet)"} colorClass={d.tareasTotal === 0 ? "muted" : "violet"}
            progress={d.tareasTotal > 0 ? d.progresoGlobal : undefined}
            onClick={() => navigate("proyecto")} />
          <KPI icon="✅" label="Checklist"
            tooltip="Ítems completados del checklist de Logística sobre el total.\nEl checklist se organiza por fases temporales antes del evento."
            value={d.ckTotal > 0 ? `${Math.round(d.ckDone / d.ckTotal * 100)}%` : "—"}
            sub={(() => {
              if (d.ckTotal === 0) return "Sin checklist definido — ir a Logística";
              if (d.ckDone >= d.ckTotal) return "✓ Checklist completado";
              const pendientes = d.ckTotal - d.ckDone;
              return `${pendientes} ítem${pendientes !== 1 ? "s" : ""} pendiente${pendientes !== 1 ? "s" : ""} · Timeline: ${d.tlDone}/${d.tlTotal}`;
            })()}
            color={d.ckTotal === 0 ? "var(--text-muted)" : "var(--cyan)"} colorClass={d.ckTotal === 0 ? "muted" : "cyan"}
            progress={d.ckTotal > 0 ? Math.round(d.ckDone / d.ckTotal * 100) : undefined}
            onClick={() => navigate("logistica")} />
        </div>

        {/* ── SPRINT 2.2: Mini-desglose económico ── */}
        {(d.totalIngresos > 0 || d.totalCostesFijos > 0) && (
          <MiniDesglose
            totalIngresos={d.totalIngresos}
            totalIngresosExtra={d.totalIngresosExtra}
            camisetasDesglose={d.camisetasDesglose}
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
                      { name: "TG7", value: d.inscritosPorDist.TG7 || 0 },
                      { name: "TG13", value: d.inscritosPorDist.TG13 || 0 },
                      { name: "TG25", value: d.inscritosPorDist.TG25 || 0 },
                    ]} cx="50%" cy="50%" innerRadius={36} outerRadius={55} paddingAngle={3} dataKey="value">
                      {["#22d3ee", "#a78bfa", "#34d399"].map((c, i) => <Cell key={i} fill={c} opacity={0.9} />)}
                    </Pie>
                    <RechartsTip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${v} corredores`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {[["TG7", "#22d3ee"], ["TG13", "#a78bfa"], ["TG25", "#34d399"]].map(([dist, color]) => {
                    const ins = d.inscritosPorDist[dist];
                    const max = d.maximosPorDist[dist];
                    const pct = d.ocupacionPorDist[dist];
                    return (
                      <div key={dist}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.12rem" }}>
                          <span className="mono xs bold" style={{ color }}>{dist}</span>
                          <span className="mono xs muted">{ins}{max > 0 ? `/${max} (${pct}%)` : "corredores"}</span>
                        </div>
                        {max > 0 && (
                          <div style={{ height: 3, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: "width .5s" }} />
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
                const cam = d.camisetasDesglose || {};
                const items = [
                  { label: "Inscripciones", val: d.totalIngresos, color: "#22d3ee", tipo: "+" },
                  { label: "Patrocinios", val: d.totalIngresosExtra, color: "#34d399", tipo: "+" },
                  // Camisetas desglosadas
                  cam.ingresosExterno > 0 && { label: `👕 Cam. corredor (${cam.unidCorredor || 0}u)`, val: cam.ingresosExterno, color: "#c084fc", tipo: "+" },
                  cam.ingresosPedidos > 0 && { label: `📦 Cam. pedidos extra`, val: cam.ingresosPedidos, color: "#a78bfa", tipo: "+" },
                  cam.costeTotal > 0 && { label: `👕 Coste camisetas`, val: cam.costeTotal, color: "#f472b6", tipo: "-" },
                  { label: "C. Fijos", val: d.totalCostesFijos, color: "#f87171", tipo: "-" },
                  { label: "C. Variables", val: d.totalCostesVars, color: "#fb923c", tipo: "-" },
                ].filter(Boolean);
                const maxVal = Math.max(...items.map(i => i.val), 1);
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", marginTop: ".25rem" }}>
                    {items.map(item => {
                      const pct = Math.min(Math.round(item.val / maxVal * 100), 100);
                      return (
                        <div key={item.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".18rem" }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                              {item.tipo === "+" ? "↑" : "↓"} {item.label}
                            </span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: item.color, fontWeight: 700 }}>
                              {fmtEur(item.val)}
                            </span>
                          </div>
                          <div style={{ height: 5, background: "var(--surface3)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${pct}%`, background: item.color,
                              borderRadius: 3, opacity: item.val <= 0 ? 0.3 : 0.85, transition: "width .5s"
                            }} />
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
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginTop: ".6rem", paddingTop: ".5rem",
                borderTop: "1px solid var(--border)",
              }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                  color: "var(--text-muted)", display: "flex", alignItems: "center", gap: ".4rem"
                }}>
                  Resultado
                  <span className={`badge ${d.roiGlobal >= 0 ? "badge-green" : "badge-red"}`}
                    style={{ fontSize: "var(--fs-2xs)" }}>
                    Margen {d.roiGlobal > 0 ? "+" : ""}{d.roiGlobal}%
                  </span>
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)",
                  fontWeight: 800, color: resColor
                }}>
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
              <div className="card-title" style={{ marginBottom: 0 }}>📅 Próximos Hitos</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("proyecto")}>Ver todos →</button>
            </div>
            {d.hitosProximos.map(h => {
              const dias = Math.ceil((new Date(h.fecha) - new Date()) / 86400000);
              const c = dias < 0 ? "#ff4444" : dias === 0 ? "var(--red)" : dias <= 7 ? "var(--orange)" : dias <= 30 ? "var(--amber)" : "var(--green)";
              const label = dias < 0 ? `Vencido (${Math.abs(dias)}d)` : dias === 0 ? "HOY" : `${dias}d`;
              return (
                <div key={h.id} className="dash-hito dash-hito-clickable"
                  onClick={() => navigate("proyecto")}>
                  <div className="flex-center gap-sm" style={{ flex: 1, minWidth: 0 }}>
                    <div className="dash-hito-gem" style={{ background: h.completado ? "#34d399" : h.critico ? "#f87171" : "#22d3ee" }} />
                    {h.critico && !h.completado && <span className="xs">⚡</span>}
                    <span className="sm bold" style={{
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      textDecoration: h.completado ? "line-through" : "none", opacity: h.completado ? 0.5 : 1
                    }}>
                      {h.nombre}
                    </span>
                  </div>
                  <div className="flex-center gap-sm" style={{ flexShrink: 0 }}>
                    <span className="mono xs muted">{fmtD(h.fecha)}</span>
                    <span className="mono xs bold" style={{ color: c, minWidth: 40, textAlign: "right" }}>{label}</span>
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
            await dataService.set(SK_PPTO_INSCRITOS, next);
            window.dispatchEvent(new CustomEvent("teg-sync"));
          }}
        />

      </div>
    </>
  );
}

// ─── Sprint 2.2: Mini-desglose económico ────────────────────────────────────