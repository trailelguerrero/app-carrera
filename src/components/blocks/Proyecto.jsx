/**
 * Proyecto.jsx — Orquestador (Tarea 3.3)
 * Gestión de tareas, hitos y equipo del evento.
 * La lógica y los sub-componentes viven en src/components/proyecto/.
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import {
  SK_PROY_TAREAS, SK_PROY_HITOS, SK_PROY_EQUIPO,
  SK_DOC_DOCS, SK_DOC_GESTIONES,
  SK_VOL_VOLUNTARIOS,
  SK_LOG_CONT,
} from "@/constants/storageKeys";

import {
  diasHasta, AREAS, ESTADOS, PRIORIDADES, EST_CFG, PRI_CFG,
  EQUIPO0, HITOS0, TAREAS0, getArea, iniciales,
} from "@/components/proyecto/proyectoConstants";
import { TabDash }        from "@/components/proyecto/TabDash";
import { TabTablon }      from "@/components/proyecto/TabTablon";
import { TabGantt }       from "@/components/proyecto/TabGantt";
import { TabEquipo }      from "@/components/proyecto/TabEquipo";
import { TabHitos }       from "@/components/proyecto/TabHitos";
import { validarTarea, QuickCreateTarea, ModalTarea, ModalHito, ModalPersona } from "@/components/proyecto/Modales";
import { FichaProyecto }  from "@/components/proyecto/FichaProyecto";

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:var(--font-display);min-height:100vh;
    background-image:radial-gradient(ellipse 80% 35% at 15% -5%,var(--cyan-dim) 0%,transparent 55%),
      radial-gradient(ellipse 60% 25% at 85% 5%,var(--violet-dim) 0%,transparent 50%)}
  .layout{display:flex;min-height:100vh}
  /* SIDEBAR */
  .sidebar{width:220px;min-height:100vh;height:100vh;position:sticky;top:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
  .slogo{padding:1.25rem 1rem .75rem;border-bottom:1px solid var(--border)}
  .sley{font-family:var(--font-mono);font-size:.48rem;color:var(--cyan);letter-spacing:.2em;text-transform:uppercase;margin-bottom:.3rem;opacity:.7}
  .sltitle{font-size:1.5rem;font-weight:800;background:linear-gradient(135deg,#fff 0%,var(--violet) 60%,var(--cyan) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1}
  .slsub{font-family:var(--font-mono);font-size:.55rem;color:var(--text-muted);margin-top:.25rem}
  .scountdown{padding:.85rem 1rem;border-bottom:1px solid var(--border);text-align:center;background:linear-gradient(135deg,var(--violet-dim),var(--cyan-dim))}
  .scd-label{font-family:var(--font-mono);font-size:.5rem;text-transform:uppercase;letter-spacing:.15em;color:var(--text-muted);margin-bottom:.2rem}
  .scd-val{font-family:var(--font-mono);font-size:2rem;font-weight:800;color:var(--violet);line-height:1}
  .scd-unit{font-family:var(--font-mono);font-size:.6rem;color:var(--text-muted);margin-top:.1rem}
  .sglobal{padding:.75rem 1rem;border-bottom:1px solid var(--border)}
  .sg-label{font-family:var(--font-mono);font-size:.5rem;text-transform:uppercase;letter-spacing:.12em;color:var(--text-muted);margin-bottom:.4rem}
  .sg-pct{font-family:var(--font-mono);font-size:1.1rem;font-weight:800;color:var(--green);margin-bottom:.3rem}
  .sg-bar{height:5px;background:var(--surface3);border-radius:3px;overflow:hidden;margin-bottom:.3rem}
  .sg-fill{height:100%;background:linear-gradient(90deg,var(--green),var(--cyan));border-radius:3px;transition:width .6s}
  .sg-nums{font-family:var(--font-mono);font-size:.55rem;color:var(--text-muted)}
  .snav{flex:1;padding:.5rem .4rem;display:flex;flex-direction:column;gap:.1rem;overflow-y:auto}
  .nitem{display:flex;align-items:center;gap:.5rem;padding:.5rem .7rem;border-radius:var(--r-sm);border:1px solid transparent;cursor:pointer;background:none;color:var(--text-muted);font-family:var(--font-display);font-size:.76rem;font-weight:500;text-align:left;width:100%;transition:all .15s;position:relative}
  .nitem::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:0 2px 2px 0;background:transparent;transition:background .15s}
  .nitem:hover{color:var(--text);background:var(--surface2)} .nitem.active{color:var(--text);background:var(--surface2);border-color:var(--border-light)} .nitem.active::before{background:var(--violet)}
  .nicon{font-size:.85rem;width:18px;text-align:center;flex-shrink:0}
  .nbadge{margin-left:auto;font-size:.52rem;font-family:var(--font-mono);padding:.1rem .3rem;border-radius:3px;font-weight:700}
  .sf{padding:.75rem;border-top:1px solid var(--border)}
  .bsave{width:100%;padding:.5rem;background:rgba(167,139,250,.1);color:var(--violet);border:1px solid rgba(167,139,250,.25);border-radius:var(--r-sm);font-family:var(--font-mono);font-size:.68rem;font-weight:700;cursor:pointer;transition:all .15s}
  .bsave:hover{background:rgba(167,139,250,.18)} .bsave.saved{background:var(--green-dim);color:var(--green);border-color:rgba(52,211,153,.25)}
  /* MAIN */
  .main{flex:1;min-width:0;padding:1.5rem 1.25rem 4rem;overflow-x:hidden}
  .tc{animation:fu .2s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  /* PAGE HEADER */
  .ph{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap}
  .pt{font-size:1.5rem;font-weight:900;letter-spacing:-0.02em} .pd{font-family:var(--font-mono);font-size:.62rem;color:var(--text-muted);margin-top:.25rem}
  /* KPIs */
  .kgrid4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: .75rem; margin-bottom: 1rem; }
  @media (max-width: 480px) { .kgrid4 { grid-template-columns: 1fr 1fr; gap: 0.5rem; } }
  .kpi:hover{transform:translateY(-2px);border-color:var(--border-light);box-shadow:0 4px 20px rgba(0,0,0,.4)}
  .kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
  .kpi.c-cyan::before,.kpi.c-cyan .kv{background:linear-gradient(90deg,var(--cyan),transparent)}.kpi.c-cyan .kv{background:none;color:var(--cyan)}
  .kpi.c-green::before{background:linear-gradient(90deg,var(--green),transparent)}.kpi.c-green .kv{color:var(--green)}
  .kpi.c-amber::before{background:linear-gradient(90deg,var(--amber),transparent)}.kpi.c-amber .kv{color:var(--amber)}
  .kpi.c-red::before{background:linear-gradient(90deg,var(--red),transparent)}.kpi.c-red .kv{color:var(--red)}
  .kpi.c-violet::before{background:linear-gradient(90deg,var(--violet),transparent)}.kpi.c-violet .kv{color:var(--violet)}
  .ki{font-size:1.2rem;margin-bottom:.4rem} .kl{font-size:.55rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.35rem;font-family:var(--font-mono)}
  .kv{font-size:1.5rem;font-weight:800;font-family:var(--font-mono);line-height:1} .ks{font-size:.58rem;color:var(--text-muted);margin-top:.25rem;font-family:var(--font-mono)}
  /* CARDS */
  .twocol{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-bottom:.85rem}
  @media(max-width:800px){.twocol{grid-template-columns:1fr}}
  .card:hover{border-color:var(--border-light)}
  .ct{font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:.75rem;color:var(--text-muted)}
  .filtros-card{margin-bottom:.75rem}
  /* AREA GRID */
  .area-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.5rem}
  .area-card{background:var(--surface2);border:1px solid var(--border);border-top:2px solid;border-radius:var(--r-sm);padding:.75rem;cursor:pointer;transition:all .15s}
  .area-card:hover{transform:translateY(-2px);border-color:var(--border-light);box-shadow:0 4px 12px rgba(0,0,0,.3)}
  /* PROGRESO */
  .pbar{height:4px;background:var(--surface3);border-radius:2px;overflow:hidden}
  .pfill{height:100%;border-radius:2px;transition:width .5s cubic-bezier(.4,0,.2,1)}
  /* URGENTES */
  .urg-row{display:flex;align-items:center;gap:.6rem;padding:.38rem 0;border-bottom:1px solid rgba(30,45,80,.3)}
  .urg-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .urg-titulo{font-size:.74rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .empty-sm{font-family:var(--font-mono);font-size:.7rem;color:var(--text-dim);padding:.5rem 0;text-align:center}
  /* CARGA */
  .carga-row{display:flex;align-items:center;gap:.6rem;padding:.4rem 0;border-bottom:1px solid rgba(30,45,80,.3)}
  /* AVATARS */
  .avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:.55rem;font-weight:700;flex-shrink:0}
  .avatar-lg{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:.75rem;font-weight:700;flex-shrink:0}
  /* HITOS */
  .hitos-timeline{display:flex;flex-direction:column}
  .hito-row{display:flex;align-items:flex-start;gap:0}
  .hito-fecha{width:64px;flex-shrink:0;padding-top:.6rem;text-align:right;padding-right:.75rem}
  .hito-connector{display:flex;flex-direction:column;align-items:center;padding-top:.55rem}
  .hito-gem{width:12px;height:12px;border-radius:2px;transform:rotate(45deg);flex-shrink:0}
  .hito-line{width:2px;flex:1;background:var(--border);min-height:16px;margin:3px 0}
  .hito-label{padding:.5rem 0 .5rem .75rem;flex:1}
  .hito-card{display:flex;align-items:center;gap:.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:.85rem;transition:all .15s}
  .hito-card:hover{border-color:var(--border-light)} .hito-card.hito-done{opacity:.55} .hito-card.hito-vencido{border-color:rgba(248,113,113,.3);background:var(--red-dim)}
  .hito-card-gem{width:14px;height:14px;border-radius:3px;transform:rotate(45deg);flex-shrink:0}
  /* TAREAS */
  .tarea-row{display:flex;align-items:flex-start;gap:.75rem;background:var(--surface);border:1px solid var(--border);border-left:3px solid;border-radius:var(--r);padding:.75rem;transition:all .15s}
  .tarea-row:hover{border-color:var(--border-light)}
  .tarea-row.tarea-vencida{background:var(--red-dim);border-color:rgba(248,113,113,.25)}
  .tarea-estado-col{flex-shrink:0}
  .est-sel{border-radius:5px;padding:.2rem .4rem;font-family:var(--font-mono);font-size:.65rem;cursor:pointer;outline:none;font-weight:700}
  /* GANTT */
  .gantt-wrap{padding:1rem;overflow-x:auto}
  .gantt-header{display:flex;margin-bottom:.5rem;height:24px}
  .gantt-label-col{width:140px;flex-shrink:0;display:flex;align-items:center;gap:.35rem;padding-right:.75rem}
  .gantt-track{flex:1;position:relative;min-width:0}
  .gantt-month{position:absolute;top:0;height:100%;border-left:1px solid rgba(30,45,80,.5);display:flex;align-items:center;overflow:hidden}
  .gantt-month span{font-family:var(--font-mono);font-size:.5rem;color:var(--text-muted);padding-left:.25rem;white-space:nowrap}
  .gantt-today{position:absolute;top:-4px;bottom:-4px;width:2px;background:rgba(248,113,113,.7);z-index:10}
  .gantt-today-label{position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-family:var(--font-mono);font-size:.45rem;color:#f87171;white-space:nowrap;font-weight:700}
  .gantt-row{display:flex;align-items:center;margin-bottom:.5rem;min-height:40px}
  .gantt-bar{position:absolute;top:50%;transform:translateY(-50%);height:32px;border-radius:8px;display:flex;align-items:center;overflow:hidden;min-width:6px}
  .gantt-bar-fill{position:absolute;top:0;left:0;height:100%;opacity:.5;border-radius:6px}
  .gantt-bar-label{position:relative;font-family:var(--font-mono);font-size:.55rem;font-weight:700;color:rgba(255,255,255,.9);padding:0 .4rem;white-space:nowrap;z-index:1}
  .gantt-hito{position:absolute;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;cursor:default}
  .gantt-diamond{width:10px;height:10px;border-radius:2px;transform:rotate(45deg)}
  .gantt-hito-label{font-size:.45rem;font-family:var(--font-mono);color:var(--text-muted);white-space:nowrap;margin-top:2px;max-width:60px;overflow:hidden;text-overflow:ellipsis}
  /* EQUIPO GRID */
  .equipo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:.85rem}
  .persona-card{background:var(--surface);border:1px solid var(--border);border-top:3px solid;border-radius:var(--r);padding:1rem;transition:all .15s}
  .persona-card:hover{border-color:var(--border-light);box-shadow:0 4px 16px rgba(0,0,0,.3)}
  /* UTILS */
  .inp:focus{border-color:var(--violet);box-shadow:0 0 0 2px rgba(167,139,250,.1)}
  .btn:hover{transform:translateY(-1px)}
  .btn.primary{background:var(--violet-dim);color:var(--violet);border:1px solid rgba(167,139,250,.3)} .btn.primary:hover{background:rgba(167,139,250,.25)}
  .btn.ghost{background:transparent;color:var(--text-muted);border:1px solid var(--border)} .btn.ghost:hover{color:var(--text);border-color:var(--border-light)}
  .btn.red{background:var(--red-dim);color:#f87171;border:1px solid rgba(248,113,113,.2)}
  .btn.xs{padding:.2rem .4rem;font-size:.65rem}
  .mt1{margin-top:.5rem} .w100{width:100%;justify-content:center}
  .empty{text-align:center;padding:2rem;color:var(--text-muted);font-family:var(--font-mono);font-size:.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--r)}
  /* MODAL */
  .overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;padding:1rem;animation:fi .15s ease}
  @keyframes fi{from{opacity:0}to{opacity:1}}
  .modal{background:var(--surface);border:1px solid var(--border-light);border-radius:16px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;animation:su .2s ease;box-shadow:0 24px 64px rgba(0,0,0,.6)}
  @keyframes su{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .mhdr{padding:1.1rem 1.4rem .9rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .mtit{font-size:.95rem;font-weight:700}
  .mbody{padding:1.1rem 1.4rem;display:flex;flex-direction:column;gap:.8rem}
  .mfoot{padding:.9rem 1.4rem;border-top:1px solid var(--border);display:flex;gap:.5rem;justify-content:flex-end}
  .fl{font-size:.72rem;font-weight:600;margin-bottom:.3rem;display:block;color:var(--text-muted)}
  .sidebar-toggle-open{display:none;position:sticky;top:0;z-index:9;width:100%;padding:.75rem;background:var(--surface2);border:none;border-bottom:1px solid var(--border);color:var(--violet);font-family:inherit;font-weight:700;font-size:.76rem;cursor:pointer;text-align:left}
  .sidebar-toggle-close{display:none;position:absolute;top:1rem;right:1rem;background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:var(--surface)}::-webkit-scrollbar-thumb{background:var(--border-light);border-radius:2px}

  @media(max-width:850px){
    .layout{flex-direction:column}
    .sidebar{
      width:100%;height:auto;min-height:initial;position:sticky;top:0;z-index:40;
      border-right:none;border-bottom:1px solid var(--border);
      background:rgba(6,9,18,0.95);backdrop-filter:blur(10px);
    }
    .snav{flex-direction:row;overflow-x:auto;padding:.4rem;gap:.4rem}
    .nitem{flex-shrink:0;width:auto;padding:.4rem .75rem;margin:0;border:1px solid var(--border)}
    .nitem::before{display:none}
    .nitem.active{border-color:var(--violet)}
    .main{padding:1rem .75rem 5rem}
    .kgrid4{grid-template-columns:repeat(2,1fr)}
    .area-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}
    .twocol{grid-template-columns:1fr}
    .ph{align-items:center}
    .pt{font-size:1.1rem}
    .sidebar-toggle-open,.sidebar-toggle-close{display:none}
    .mobile-header-tools{position:absolute;top:1rem;right:.75rem;z-index:50}
  }
  @media(max-width:480px){
    .kgrid4{grid-template-columns:1fr}
    .ph{flex-direction:row;justify-content:space-between;align-items:center;margin-bottom:1rem}
    .pd{display:none}
    .nitem span:not(.nicon){display:none}
    .nitem{padding:.5rem .8rem}
  }  /* ── KANBAN ─────────────────────────────────────────────────────────────── */
  .kanban-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;align-items:start}
  @media(max-width:700px){.kanban-grid{grid-template-columns:1fr}}
  @media(min-width:701px) and (max-width:960px){.kanban-grid{grid-template-columns:1fr 1fr}}
  .kanban-col{background:var(--surface);border:1px solid var(--border);border-top:3px solid;border-radius:var(--r);overflow:hidden;transition:border-color .15s}
  .kanban-col-hdr{padding:.6rem .85rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
  .kanban-cnt{border-radius:10px;font-family:var(--font-mono);font-size:.6rem;font-weight:700;padding:.05rem .45rem}
  .kanban-body{padding:.5rem;display:flex;flex-direction:column;gap:.4rem;min-height:80px}
  .kanban-empty{text-align:center;padding:1.25rem;color:var(--text-dim);font-family:var(--font-mono);font-size:.62rem}
  .kanban-card{background:var(--surface2);border:1px solid var(--border);border-left:3px solid;border-radius:var(--r-sm);padding:.65rem .75rem;cursor:pointer;transition:all .15s;user-select:none;display:flex;flex-direction:column;gap:.35rem}
  .kanban-card:hover{transform:translateY(-2px);box-shadow:0 4px 14px rgba(0,0,0,.35);border-color:var(--border-light)}
  .kanban-card-venc{border-color:rgba(248,113,113,.35)!important;background:var(--red-dim)!important}
  .kanban-card-bloq{opacity:.75;border-style:dashed}
  .kanban-bloq-badge{font-family:var(--font-mono);font-size:.52rem;font-weight:700;color:#f87171;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);border-radius:3px;padding:.1rem .35rem;align-self:flex-start}
  .kanban-card-titulo{font-size:.78rem;font-weight:700;line-height:1.35}
  .kanban-card-meta{display:flex;justify-content:space-between;align-items:center;gap:.25rem}
  .kanban-avatar{width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:.42rem;font-weight:700;flex-shrink:0}
  .kanban-acciones{display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.1rem}
  /* Botones de estado — área táctil mínima 36px */
  .kanban-btn-estado{min-height:36px;padding:.1rem .55rem;border-radius:5px;border:1px solid;font-family:var(--font-mono);font-size:.6rem;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap;display:flex;align-items:center;justify-content:center}
  .kanban-btn-estado:hover{filter:brightness(1.2);transform:translateY(-1px)}

  /* ── HITO QUICK-COMPLETE ──────────────────────────────────────────────── */
  .hito-ckbox{width:36px;height:36px;border-radius:8px;border:2px solid;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;background:transparent}
  .hito-ckbox:hover{transform:scale(1.1);box-shadow:0 2px 8px rgba(0,0,0,.3)}


`;

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]         = useState("dashboard");
  // FIX Guard más robusto: si la BD devuelve datos, usarlos; si no, cargar TAREAS0 como defaults
  // Esto protege contra el caso de dispositivo nuevo (sin localStorage) que sobreescribía con TAREAS0
  const [rawTareas, setTareas]   = useData(SK_PROY_TAREAS, TAREAS0);
  const [rawHitos, setHitos]     = useData(SK_PROY_HITOS, HITOS0);
  const [rawEquipo, setEquipo]   = useData(SK_PROY_EQUIPO, EQUIPO0);
  const [eventCfg]               = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [rawDocs]                = useData(SK_DOC_DOCS, []);
  const [rawGest]                = useData(SK_DOC_GESTIONES, []);
  const [rawVoluntarios]         = useData(SK_VOL_VOLUNTARIOS, []);
  const [rawContLog]             = useData(SK_LOG_CONT, []);

  const tareas = Array.isArray(rawTareas) ? rawTareas : [];
  const hitos = Array.isArray(rawHitos) ? rawHitos : [];
  const equipo = Array.isArray(rawEquipo) ? rawEquipo : [];
  const documentos  = [...(Array.isArray(rawDocs)?rawDocs:[]), ...(Array.isArray(rawGest)?rawGest:[])];
  const voluntarios = Array.isArray(rawVoluntarios) ? rawVoluntarios : [];
  const contLog     = Array.isArray(rawContLog) ? rawContLog : [];
  const [modal, setModal]     = useState(null);
  const [quickCreate, setQuickCreate] = useState(false);
  const [ganttPopup, setGanttPopup] = useState(null); // {area, tareas, x, y}
  const [ficha, setFicha]     = useState(null); // {tipo,data} — vista previa
  const abrirFicha = (tipo, data) => {
    setFicha({ tipo, data });
  };
  const [delConf, setDelConf] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 850);
  const [busquedaGlobal, setBusquedaGlobal] = useState("");
  const [vistaTablon, setVistaTablon] = useState("lista"); // "lista" | "kanban"

  // Escuchar evento de crear tarea desde otros módulos (ej. Documentos)
  useEffect(() => {
    const handler = (e) => {
      const { action, payload } = e.detail || {};
      if (action !== "nueva-tarea") return;
      // Navegar al Tablón y abrir modal de nueva tarea pre-rellenada
      setTab("tablón");
      setTimeout(() => {
        setModal({
          tipo: "tarea",
          data: null,
          prefill: payload || {},
        });
      }, 50);
    };
    window.addEventListener("teg-navigate", handler);
    return () => window.removeEventListener("teg-navigate", handler);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 850);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // filters
  const [filtroArea, setFiltroArea]           = useState("todas");
  const [filtroResponsable, setFiltroResponsable] = useState("todos");
  const [filtroEstado, setFiltroEstado]       = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [busqueda, setBusqueda]               = useState("");

  // Los datos se guardan automáticamente en Neon via useData().
  // Esta función solo sincroniza otras pestañas abiertas.

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const _eventFechaStr = config?.fecha || EVENT_CONFIG_DEFAULT.fecha;
    const diasEvento = diasHasta(_eventFechaStr);
    const total = tareas.length;
    const completadas = tareas.filter(t => t.estado === "completado").length;
    const bloqueadas = tareas.filter(t => t.estado === "bloqueado").length;
    const enCurso = tareas.filter(t => t.estado === "en curso").length;
    const pct = total ? Math.round(completadas/total*100) : 0;
    const criticas = tareas.filter(t =>
      t.estado !== "completado" && t.fechaLimite &&
      diasHasta(t.fechaLimite) <= 14 && diasHasta(t.fechaLimite) >= 0
    );
    const vencidas = tareas.filter(t =>
      t.estado !== "completado" && t.estado !== "bloqueado" &&
      t.fechaLimite && diasHasta(t.fechaLimite) < 0
    );
    const porArea = AREAS.map(a => {
      const at = tareas.filter(t => t.area === a.id);
      const done = at.filter(t => t.estado === "completado").length;
      const blk = at.filter(t => t.estado === "bloqueado").length;
      const venc = at.filter(t => t.estado !== "completado" && t.estado !== "bloqueado" && t.fechaLimite && diasHasta(t.fechaLimite) < 0).length;
      const semaforo = venc > 0 ? "red" : blk > 0 ? "amber" : done === at.length ? "green" : "blue";
      return { ...a, total:at.length, done, blk, venc, semaforo, pct: at.length ? Math.round(done/at.length*100) : 0 };
    });
    const porPersona = equipo.map(p => {
      const pt = tareas.filter(t => t.responsableId === p.id && t.estado !== "completado");
      const urgentes = pt.filter(t => t.fechaLimite && diasHasta(t.fechaLimite) <= 14);
      return { ...p, pendientes: pt.length, urgentes: urgentes.length };
    }).sort((a,b) => b.urgentes - a.urgentes);
    const hitosProx = [...hitos].filter(h => !h.completado).sort((a,b) => a.fecha.localeCompare(b.fecha)).slice(0,5);
    return { diasEvento, total, completadas, bloqueadas, enCurso, pct, criticas, vencidas, porArea, porPersona, hitosProx };
  }, [tareas, hitos, equipo, eventCfg]);

  // ── Tareas filtradas ───────────────────────────────────────────────────────
  const tareasFiltradas = useMemo(() => {
    return tareas.filter(t => {
      if (filtroArea !== "todas" && t.area !== filtroArea) return false;
      if (filtroResponsable !== "todos" && String(t.responsableId) !== filtroResponsable) return false;
      if (filtroEstado !== "todos" && t.estado !== filtroEstado) return false;
      if (filtroPrioridad !== "todas" && t.prioridad !== filtroPrioridad) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!t.titulo.toLowerCase().includes(q) && !(t.notas||"").toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a,b) => (a.fechaLimite||"").localeCompare(b.fechaLimite||""));
  }, [tareas, filtroArea, filtroResponsable, filtroEstado, filtroPrioridad, busqueda]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const saveTarea = (t) => {
    const esNuevo = !t.id;
    if (t.id) setTareas(p => p.map(x => x.id===t.id ? t : x));
    else setTareas(p => [...p, {...t, id:genIdNum(p)}]);
    setModal(null);
    toast.success(esNuevo ? "Tarea creada" : "Tarea actualizada");
  };
  const saveHito = (h) => {
    const esNuevo = !h.id;
    if (h.id) setHitos(p => p.map(x => x.id===h.id ? h : x));
    else setHitos(p => [...p, {...h, id:genIdNum(p)}]);
    setModal(null);
    toast.success(esNuevo ? "Hito creado" : "Hito actualizado");
  };
  const savePersona = (p) => {
    const esNuevo = !p.id;
    if (p.id) setEquipo(prev => prev.map(x => x.id===p.id ? p : x));
    else setEquipo(prev => [...prev, {...p, id:genIdNum(prev)}]);
    setModal(null);
    toast.success(esNuevo ? "Miembro añadido al equipo" : "Miembro actualizado");
  };
  const doDelete = () => {
    if (!delConf) return;
    const {tipo,id} = delConf;
    if (tipo==="tarea") setTareas(p => p.filter(x => x.id!==id));
    if (tipo==="hito") setHitos(p => p.filter(x => x.id!==id));
    if (tipo==="persona") setEquipo(p => p.filter(x => x.id!==id));
    setDelConf(null);
  };
  const updEstado = (id, estado) => {
    setTareas(prevTareas => {
      const tarea = prevTareas.find(t => t.id === id);
      if (!tarea) return prevTareas;

      // Aviso si hay dependencia sin completar
      if ((estado === "en curso" || estado === "completado") && tarea.dependeDe) {
        const dep = prevTareas.find(t => t.id === tarea.dependeDe);
        if (dep && dep.estado !== "completado") {
          setTimeout(() => toast.warning("\u26a0\ufe0f \"" + dep.titulo + "\" a\xc3\xban no est\xc3\xa1 completada"), 50);
        }
      }

      // Registrar en historial automático
      const entrada = {
        id:      String(Date.now()),
        fecha:   new Date().toISOString(),
        campo:   "estado",
        antes:   tarea.estado,
        despues: estado,
      };
      const historial = [...(Array.isArray(tarea.historial) ? tarea.historial : []), entrada].slice(-20);

      // Notificar tareas desbloqueadas
      if (estado === "completado") {
        const desbloqueadas = prevTareas.filter(t =>
          t.id !== id && t.dependeDe === id && t.estado === "pendiente"
        );
        if (desbloqueadas.length > 0) {
          setTimeout(() => toast.success("✅ Completada · Ahora puedes iniciar: " + desbloqueadas.slice(0,2).map(t => t.titulo).join(", ") + (desbloqueadas.length>2?" y más...":"")), 300);
        } else {
          setTimeout(() => toast.success("Tarea completada ✓"), 50);
        }
      }

      return prevTareas.map(t => t.id === id ? { ...t, estado, historial } : t);
    });
  };
  const updHito = (id, field, val) => { setHitos(p => p.map(h => h.id===id ? {...h,[field]:val} : h)); if(field==="completado") toast.success(val ? "Hito completado ✓" : "Hito reabierto"); };

  const TABS_VISTAS = [
    {id:"tablón",    icon:"📋", label:"Tablón"},
    {id:"dashboard", icon:"📊", label:"Resumen"},
    {id:"gantt",     icon:"📊", label:"Por Áreas"},
  ];
  const TABS_GESTION = [
    {id:"hitos",  icon:"🏁", label:"Hitos"},
    {id:"equipo", icon:"👥", label:"Equipo"},
  ];
  const TABS = [...TABS_VISTAS, ...TABS_GESTION];

  return (
    <>
      <style>{CSS}</style>
      <div className="block-container">

        {/* HEADER */}
        <div className="block-header">
          <div>
            <h1 className="block-title">🏔️ Proyecto</h1>
            <div className="block-title-sub">Gestión & Planificación · {stats.diasEvento} días para la carrera</div>
          </div>
          <div className="block-actions">
            {/* Búsqueda global */}
            <div style={{display:"flex",alignItems:"center",gap:".4rem",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",padding:".28rem .6rem",transition:"border-color .15s"}}
              onFocus={e=>e.currentTarget.style.borderColor="var(--violet)"}
              onBlur={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <span style={{fontSize:"var(--fs-base)",opacity:.5}}>🔍</span>
              <input
                value={busquedaGlobal}
                onChange={e=>{setBusquedaGlobal(e.target.value); if(e.target.value && tab!=="tablón") setTab("tablón");}}
                placeholder="Buscar en todo el proyecto…"
                style={{background:"none",border:"none",color:"var(--text)",fontFamily:"var(--font-display)",fontSize:"var(--fs-base)",outline:"none",width: isMobile ? 120 : 200}}
              />
              {busquedaGlobal && <button onClick={()=>setBusquedaGlobal("")} style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:"var(--fs-base)",padding:0}} aria-label="Cerrar">✕</button>}
            </div>
            {busquedaGlobal && tareasFiltradas && (
              <span className="badge badge-violet" style={{whiteSpace:"nowrap"}}>
                🔍 {tareasFiltradas.length} resultado{tareasFiltradas.length !== 1 ? "s" : ""}
              </span>
            )}
            {stats.vencidas.length > 0 && <span className="badge badge-red">⏰ {stats.vencidas.length} vencidas</span>}
            {stats.bloqueadas > 0 && <span className="badge badge-amber">🔒 {stats.bloqueadas} bloqueadas</span>}
            <span className={`badge ${stats.pct>=80?"badge-green":stats.pct>=50?"badge-amber":"badge-red"}`}>{stats.pct}% completado</span>
            <button className="btn btn-primary" onClick={() => setModal({tipo:"tarea",data:null})}>+ Nueva tarea</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid mb">
          <div className="kpi green">
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>✅ Completadas<Tooltip text={"Porcentaje de tareas marcadas como completadas sobre el total.\nIncluye todas las áreas del proyecto: permisos, logística, comunicación, etc."}><TooltipIcon size={11}/></Tooltip></div>
            <div className="kpi-value" style={{color:"var(--green)"}}>{stats.pct}%</div>
            <div className="kpi-sub">{stats.completadas} de {stats.total} tareas</div>
          </div>
          <div className="kpi cyan">
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>▶️ En curso<Tooltip text={"Tareas actualmente en estado 'en curso': se están ejecutando pero no están terminadas."}><TooltipIcon size={11}/></Tooltip></div>
            <div className="kpi-value" style={{color:"var(--cyan)"}}>{stats.enCurso}</div>
            <div className="kpi-sub">tareas activas</div>
          </div>
          <div className={`kpi ${stats.vencidas.length>0?"red":"green"}`}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>⏰ Vencidas<Tooltip text={"Tareas cuya fecha límite ya pasó y no están completadas.\nRequieren atención inmediata — cada día que pasan aumenta el riesgo para el evento."}><TooltipIcon size={11}/></Tooltip></div>
            <div className="kpi-value" style={{color:stats.vencidas.length>0?"var(--red)":"var(--green)"}}>{stats.vencidas.length}</div>
            <div className="kpi-sub">fecha límite superada</div>
          </div>
          <div className={`kpi ${stats.bloqueadas>0?"amber":"green"}`}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>🔒 Bloqueadas<Tooltip text={"Tareas que no pueden avanzar porque dependen de otra tarea pendiente.\nRevisa las dependencias en la ficha de cada tarea para desbloquearlas."}><TooltipIcon size={11}/></Tooltip></div>
            <div className="kpi-value" style={{color:stats.bloqueadas>0?"var(--amber)":"var(--green)"}}>{stats.bloqueadas}</div>
            <div className="kpi-sub">requieren acción</div>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={cls("tab-btn", tab===t.id && "active")} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
              {t.id==="tablón" && stats.vencidas.length>0 && <span className="badge badge-red" style={{marginLeft:"0.3rem"}}>{stats.vencidas.length}</span>}
              {t.id==="hitos" && <span className="badge badge-cyan" style={{marginLeft:"0.3rem"}}>{hitos.filter(h=>!h.completado).length}</span>}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div key={tab}>
          {tab==="dashboard" && <TabDash stats={stats} equipo={equipo} setTab={setTab} setModal={setModal} setFicha={abrirFicha} tareas={tareas} hitos={hitos} updEstado={updEstado} isMobile={isMobile} setFiltroArea={setFiltroArea} setFiltroResponsable={setFiltroResponsable} gestiones={Array.isArray(rawGest)?rawGest:[]} />}
          {tab==="tablón" && <TabTablon tareas={tareasFiltradas} todasTareas={tareas} equipo={equipo}
            filtroArea={filtroArea} setFiltroArea={setFiltroArea}
            filtroResponsable={filtroResponsable} setFiltroResponsable={setFiltroResponsable}
            filtroEstado={filtroEstado} setFiltroEstado={setFiltroEstado}
            filtroPrioridad={filtroPrioridad} setFiltroPrioridad={setFiltroPrioridad}
            busqueda={busquedaGlobal || busqueda} setBusqueda={(v)=>{setBusqueda(v); setBusquedaGlobal(v);}}
            updEstado={updEstado} setModal={setModal} setDelConf={setDelConf} setFicha={abrirFicha}
            vista={vistaTablon} setVista={setVistaTablon} />}
          {tab==="gantt"  && <TabGantt tareas={tareas} hitos={hitos} equipo={equipo} setModal={setModal} setFicha={abrirFicha} setFiltroArea={setFiltroArea} setTabParent={setTab} eventFecha={config?.fecha || EVENT_CONFIG_DEFAULT.fecha} setGanttPopup={setGanttPopup} />}
          {tab==="equipo" && <TabEquipo equipo={equipo} setEquipo={setEquipo} tareas={tareas} voluntarios={voluntarios} contLog={contLog} setModal={setModal} setDelConf={setDelConf} setFicha={abrirFicha} />}
          {tab==="hitos"  && <TabHitos hitos={hitos} updHito={updHito} setModal={setModal} setDelConf={setDelConf} setFicha={abrirFicha} />}
        </div>
      </div>

      {ficha?.tipo==="tarea"   && <FichaProyecto key={"f"+ficha.data.id} ficha={ficha} equipo={equipo} documentos={documentos} tareas={tareas} onClose={()=>setFicha(null)} onEditar={()=>{setFicha(null);setModal({tipo:ficha.tipo,data:ficha.data});}} onEliminar={()=>{setFicha(null);setDelConf({tipo:ficha.tipo,id:ficha.data.id});}} />}
      {ficha?.tipo==="hito"    && <FichaProyecto key={"f"+ficha.data.id} ficha={ficha} equipo={equipo} documentos={documentos} tareas={tareas} onClose={()=>setFicha(null)} onEditar={()=>{setFicha(null);setModal({tipo:ficha.tipo,data:ficha.data});}} onEliminar={()=>{setFicha(null);setDelConf({tipo:ficha.tipo,id:ficha.data.id});}} />}
      {ficha?.tipo==="persona" && <FichaProyecto key={"f"+ficha.data.id} ficha={ficha} equipo={equipo} documentos={documentos} tareas={tareas} onClose={()=>setFicha(null)} onEditar={()=>{setFicha(null);setModal({tipo:ficha.tipo,data:ficha.data});}} onEliminar={()=>{setFicha(null);setDelConf({tipo:ficha.tipo,id:ficha.data.id});}} />}
      {/* ── Popup de tareas al tap en barra del Gantt ── */}
      {ganttPopup && createPortal(
        <div style={{
          position:"fixed", inset:0, zIndex:400,
          background:"transparent",
        }} onClick={() => setGanttPopup(null)}>
          <div style={{
            position:"fixed",
            left: Math.min(ganttPopup.x, window.innerWidth - 320),
            top:  Math.min(ganttPopup.y, window.innerHeight - 300),
            width:300, maxHeight:280,
            background:"var(--surface)", border:"1px solid var(--border)",
            borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
            overflow:"hidden", zIndex:401,
          }} onClick={e => e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:".55rem .85rem",borderBottom:"1px solid var(--border)",
              background:"var(--surface2)"}}>
              <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                <span style={{color:ganttPopup.area.color,fontSize:"var(--fs-md)"}}>{ganttPopup.area.icon}</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:800,color:"var(--text)"}}>
                  {ganttPopup.area.label}
                </span>
              </div>
              <button onClick={() => setGanttPopup(null)}
                style={{background:"none",border:"none",color:"var(--text-dim)",cursor:"pointer",fontSize:"var(--fs-sm)",padding:"0 .2rem"}}>✕</button>
            </div>
            <div style={{overflowY:"auto",maxHeight:220}}>
              {ganttPopup.tareas.sort((a,b) => (a.fechaLimite||"").localeCompare(b.fechaLimite||"")).map(t => {
                const EST = {pendiente:{color:"var(--amber)"},en_curso:{color:"var(--cyan)"},"en curso":{color:"var(--cyan)"},completado:{color:"var(--green)"},bloqueado:{color:"var(--red)"}};
                const col = EST[t.estado]?.color || "var(--text-muted)";
                return (
                  <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:".5rem",
                    padding:".45rem .85rem",borderBottom:"1px solid var(--border-light)",
                    cursor:"pointer"}}
                    onClick={() => { setGanttPopup(null); abrirFicha("tarea", t); }}>
                    <span style={{color:col,fontSize:"var(--fs-xs)",marginTop:".1rem",flexShrink:0}}>●</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:600,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</div>
                      {t.fechaLimite && <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-2xs)",color:"var(--text-muted)"}}>
                        {new Date(t.fechaLimite).toLocaleDateString("es-ES",{day:"2-digit",month:"short"})}
                      </div>}
                    </div>
                  </div>
                );
              })}
              {ganttPopup.tareas.length === 0 && (
                <div style={{padding:"1rem",textAlign:"center",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>Sin tareas asignadas</div>
              )}
            </div>
            <div style={{padding:".45rem .85rem",borderTop:"1px solid var(--border)",background:"var(--surface2)"}}>
              <button className="btn btn-ghost btn-sm" style={{width:"100%",fontSize:"var(--fs-xs)"}}
                onClick={() => { setGanttPopup(null); setFiltroArea(ganttPopup.area.id); setTab("tablón"); }}>
                Ver todas en Tablón →
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {quickCreate && createPortal(
        <QuickCreateTarea
          areas={AREAS}
          onSave={(data) => { saveTarea(data); setQuickCreate(false); toast.success("Tarea creada ⚡"); }}
          onClose={() => setQuickCreate(false)}
        />, document.body)}
      {modal?.tipo==="tarea"   && <ModalTarea   key={modal.data?.id||"new"} data={modal.data} prefill={modal.prefill} equipo={equipo} tareas={tareas} documentos={documentos} onSave={saveTarea}   onClose={() => setModal(null)} />}
      {modal?.tipo==="hito"    && <ModalHito    key={modal.data?.id||"new"} data={modal.data}                                  onSave={saveHito}    onClose={() => setModal(null)} />}
      {modal?.tipo==="persona" && <ModalPersona key={modal.data?.id||"new"} data={modal.data}                                  onSave={savePersona} onClose={() => setModal(null)} />}
      {delConf && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setDelConf(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:340,textAlign:"center"}}>
            <div className="modal-body" style={{paddingTop:"1.5rem"}}>
              <div style={{fontSize:"var(--fs-xl)",marginBottom:".6rem"}}>⚠️</div>
              <div style={{fontWeight:700,fontSize:"var(--fs-md)",marginBottom:".4rem"}}>¿Eliminar este elemento?</div>
              <div className="mono xs muted">Esta acción no se puede deshacer.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDelConf(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={doDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
