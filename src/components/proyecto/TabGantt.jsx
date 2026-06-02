/**
 * TabGantt.jsx — Tarea 3.3
 * Tab de vista por áreas (gantt) del módulo Proyecto.
 */
import { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { blockCls as cls } from "@/lib/blockStyles";
import { diasHasta, fmt, AREAS, EST_CFG, PRI_CFG, getArea } from "./proyectoConstants";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";

export function TabGantt({ tareas, hitos, equipo, setModal, setFicha, setFiltroArea, setTabParent, eventFecha }) {
  const [filtroGantt, setFiltroGantt] = useState("todas");
  const [ganttPopup, setGanttPopup]   = useState(null); // {area, tareas, x, y}

  // ── Rango del Gantt: memoizado — solo recalcula si cambia eventFecha ──────────
  const { ganttStart, ganttEnd, months, totalDays, pct, todayPct } = useMemo(() => {
    // MEJ-21: fallback via EVENT_CONFIG_DEFAULT — sin fechas hardcodeadas
    const eventoDate = eventFecha ? new Date(eventFecha) : new Date(EVENT_CONFIG_DEFAULT.fecha);
    const start = new Date(eventoDate); start.setMonth(start.getMonth() - 6); start.setDate(1);
    const end   = new Date(eventoDate); end.setMonth(end.getMonth() + 1);     end.setDate(28);

    const ms = [];
    let d = new Date(start); d.setDate(1);
    while (d <= end) { ms.push(new Date(d)); d.setMonth(d.getMonth() + 1); }

    const days = Math.ceil((end - start) / 86400000);
    const pctFn = (date) => Math.max(0, Math.min(100, (new Date(date) - start) / 86400000 / days * 100));
    const today = new Date();
    return {
      ganttStart: start, ganttEnd: end, months: ms, totalDays: days,
      pct: pctFn,
      todayPct: pctFn(today.toISOString().split("T")[0]),
    };
  }, [eventFecha]);

  // ── Rangos por área: memoizado — solo recalcula si cambian tareas ─────────────
  // BUG FIX: tieneVencidas/tienePendientes/todasCompletadas ahora se incluyen en
  // el objeto retornado para que los filtros funcionen correctamente.
  const areaRanges_all = useMemo(() => {
    const TODAY_g = new Date();
    return AREAS.map(a => {
      const at = tareas.filter(t => t.area === a.id && t.fechaLimite);
      if (!at.length) return null;
      const sorted = [...at].sort((x, y) => x.fechaLimite.localeCompare(y.fechaLimite));
      const tieneVencidas    = at.some(t => t.estado !== "completado" && new Date(t.fechaLimite) < TODAY_g);
      const tienePendientes  = at.some(t => t.estado === "pendiente" || t.estado === "en curso");
      const todasCompletadas = at.every(t => t.estado === "completado");
      const start = sorted[0].fechaLimite;
      const end   = sorted[sorted.length - 1].fechaLimite;
      const done  = at.filter(t => t.estado === "completado").length;
      return {
        ...a, start, end, total: at.length, done,
        pctDone: Math.round(done / at.length * 100),
        tieneVencidas, tienePendientes, todasCompletadas, // ← fix: incluidos ahora
      };
    }).filter(Boolean);
  }, [tareas]);

  const areaRanges = useMemo(() =>
    filtroGantt === "todas"       ? areaRanges_all
    : filtroGantt === "vencidas"  ? areaRanges_all.filter(a => a.tieneVencidas)
    : filtroGantt === "pendientes"? areaRanges_all.filter(a => a.tienePendientes)
    : filtroGantt === "completadas"? areaRanges_all.filter(a => a.todasCompletadas)
    : areaRanges_all
  , [areaRanges_all, filtroGantt]);

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📅 Calendario del Proyecto</div>
          <div className="pd">Marzo — Septiembre 2026 · Vista por área</div>
        </div>
        <div style={{display:"flex",gap:".5rem",flexWrap:"wrap",alignItems:"center"}}>
          <div className="filter-pill-group">
            <button className={"filter-pill"+(filtroGantt==="todas"?" active":"")} onClick={()=>setFiltroGantt("todas")}>Todas</button>
            <button className={"filter-pill"+(filtroGantt==="vencidas"?" active":"")}
              style={filtroGantt==="vencidas"?{color:"var(--red)",borderColor:"rgba(248,113,113,.5)",background:"var(--red-dim)"}:{}}
              onClick={()=>setFiltroGantt("vencidas")}>Vencidas</button>
            <button className={"filter-pill"+(filtroGantt==="pendientes"?" active":"")} onClick={()=>setFiltroGantt("pendientes")}>Pendientes</button>
            <button className={"filter-pill"+(filtroGantt==="completadas"?" active":"")}
              style={filtroGantt==="completadas"?{color:"var(--green)",borderColor:"rgba(52,211,153,.5)",background:"var(--green-dim)"}:{}}
              onClick={()=>setFiltroGantt("completadas")}>Completadas</button>
          </div>
          <button className="btn btn-ghost btn-sm" aria-label="Exportar Gantt a PDF"
            onClick={() => {
              const ahora = new Date();
              const fecha = ahora.toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"});
              const EST_CFG_LOC = { "pendiente":{ label:"Pendiente",color:"#f59e0b" }, "en curso":{ label:"En curso",color:"#3b82f6" }, "completado":{ label:"Completado",color:"#10b981" }, "bloqueado":{ label:"Bloqueado",color:"#ef4444" } };
              const meses = months.map(m => m.toLocaleDateString("es-ES",{month:"short"}).toUpperCase());
              const areasRows = AREAS.map(area => {
                const at = tareas.filter(t => t.area===area.id && t.fechaLimite);
                if(!at.length) return null;
                const sorted = [...at].sort((x,y) => x.fechaLimite.localeCompare(y.fechaLimite));
                const done = at.filter(t=>t.estado==="completado").length;
                const pctDone = Math.round(done/at.length*100);
                const start = sorted[0].fechaLimite;
                const end = sorted[sorted.length-1].fechaLimite;
                const left = Math.max(0,Math.min(100,(new Date(start)-ganttStart)/86400000/totalDays*100));
                const width = Math.max(1,Math.min(100-left,(new Date(end)-new Date(start))/86400000/totalDays*100));
                const tieneVencida = at.some(t=>t.estado!=="completado"&&new Date(t.fechaLimite)<ahora);
                return { area, at, done, pctDone, left, width, tieneVencida };
              }).filter(Boolean);
              const hitosRow = hitos.map(h => {
                const hp = Math.max(0,Math.min(100,(new Date(h.fecha)-ganttStart)/86400000/totalDays*100));
                return { ...h, pct: hp };
              });
              const todayPct = Math.max(0,Math.min(100,(ahora-ganttStart)/86400000/totalDays*100));

              const mesLabels = meses.map((m,i) =>
                "<span style=\"position:absolute;left:" + (i/meses.length*100) + "%;font-size:7pt;white-space:nowrap\">" + m + "</span>"
              ).join("");

              const areaRowsHtml = areasRows.map(r => {
                const barColor = r.pctDone===100 ? "#10b981" : r.tieneVencida ? "#ef4444" : "#3b82f6";
                const bgRow = r.tieneVencida ? "background:#fff5f5;" : "";
                const hitosHtml = hitosRow
                  .filter(h => h.area===r.area.id || !h.area)
                  .map(h => "<div class=\"hito-marker\" style=\"left:" + h.pct + "%;background:" + (h.critico?"#f59e0b":"#8b5cf6") + ";color:#fff\" title=\"" + (h.nombre||"") + "\">\u25C6</div>")
                  .join("");
                const taskListHtml = r.at.slice(0,5).map(t => {
                  const col = (EST_CFG_LOC[t.estado]||{color:"#888"}).color;
                  const icon = t.estado==="completado" ? "\u2713" : t.estado==="bloqueado" ? "\u2717" : "\u2192";
                  return "<span style=\"color:" + col + "\">" + icon + "</span> " + (t.titulo||"");
                }).join(" &nbsp;\u00B7&nbsp; ");
                const moreHtml = r.at.length>5 ? " <em>+" + (r.at.length-5) + " m\u00E1s</em>" : "";
                return "<tr style=\"" + bgRow + "\">" +
                  "<td class=\"area-name\">" + (r.area.icon||"") + " " + (r.area.nombre||r.area.id) + "</td>" +
                  "<td class=\"track-cell\">" +
                    "<div class=\"track-bg\"></div>" +
                    "<div class=\"track-bar\" style=\"left:" + r.left + "%;width:" + r.width + "%;background:" + barColor + "\"></div>" +
                    hitosHtml +
                    "<div class=\"today-line\" style=\"left:" + todayPct + "%\"></div>" +
                  "</td>" +
                  "<td class=\"pct\">" + r.pctDone + "%</td>" +
                  "</tr>" +
                  "<tr><td></td><td colspan=\"2\" class=\"task-list\">" + taskListHtml + moreHtml + "</td></tr>";
              }).join("");

              const html = "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"UTF-8\">" +
                "<title>Gantt Trail El Guerrero 2026</title>" +
                "<style>*{margin:0;padding:0;box-sizing:border-box}" +
                "body{font-family:Arial,sans-serif;font-size:9pt;color:#111;padding:16px}" +
                "h1{font-size:14pt;font-weight:900;color:#2B5468;margin-bottom:2px}" +
                ".meta{font-size:8pt;color:#666;margin-bottom:12px}" +
                ".gantt{width:100%;border-collapse:collapse}" +
                ".gantt th{background:#2B5468;color:#fff;padding:4px 6px;font-size:8pt;text-align:center;white-space:nowrap}" +
                ".gantt td{padding:3px 6px;border-bottom:1px solid #e5e5e5;vertical-align:middle}" +
                ".area-name{font-weight:700;font-size:8.5pt;white-space:nowrap;width:130px;max-width:130px;overflow:hidden;text-overflow:ellipsis}" +
                ".track-cell{position:relative;height:18px;padding:0;min-width:400px}" +
                ".track-bg{position:absolute;top:6px;left:0;right:0;height:6px;background:#f3f4f6;border-radius:3px}" +
                ".track-bar{position:absolute;top:6px;height:6px;border-radius:3px}" +
                ".hito-marker{position:absolute;top:2px;width:12px;height:12px;border-radius:50%;margin-left:-6px;font-size:6pt;display:flex;align-items:center;justify-content:center;font-weight:900}" +
                ".today-line{position:absolute;top:0;bottom:0;width:1.5px;background:#ef4444;opacity:.7}" +
                ".pct{font-size:7.5pt;color:#555;width:35px;text-align:right;padding-right:4px}" +
                ".task-list{font-size:7pt;color:#555;margin-top:1px}" +
                "@media print{body{padding:4px 8px}}</style></head><body>" +
                "<h1>\uD83D\uDCC5 Calendario del Proyecto — Trail El Guerrero 2026</h1>" +
                "<div class=\"meta\">Exportado el " + fecha + " \u00B7 " + areasRows.length + " \u00E1reas \u00B7 " + tareas.length + " tareas \u00B7 " + hitos.length + " hitos</div>" +
                "<table class=\"gantt\"><thead><tr>" +
                "<th style=\"width:130px;text-align:left\">\u00C1rea</th>" +
                "<th class=\"track-cell\" style=\"min-width:400px;text-align:left;padding:4px 6px\">" +
                "<div style=\"display:flex;position:relative;height:14px\">" + mesLabels + "</div></th>" +
                "<th style=\"width:35px\">%</th></tr></thead><tbody>" +
                areaRowsHtml +
                "</tbody></table>" +
                "<div style=\"margin-top:10px;display:flex;gap:12px;font-size:8pt;flex-wrap:wrap\">" +
                "<div style=\"display:flex;align-items:center;gap:4px\"><div style=\"width:10px;height:10px;border-radius:50%;background:#10b981;display:inline-block\"></div>Completado</div>" +
                "<div style=\"display:flex;align-items:center;gap:4px\"><div style=\"width:10px;height:10px;border-radius:50%;background:#3b82f6;display:inline-block\"></div>En curso/pendiente</div>" +
                "<div style=\"display:flex;align-items:center;gap:4px\"><div style=\"width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block\"></div>Con tareas vencidas</div>" +
                "</div></body></html>";
              const w = window.open("","_blank","width=950,height=700");
              if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
            }}>
            🖨️ PDF
          </button>
          {/* ⚡ Quick-create lives in the parent — setQuickCreate is not in TabGantt scope */}
          <button className="btn btn-ghost" onClick={() => setModal({tipo:"hito",data:null})}>+ Hito</button>
          <button className="btn btn-primary" onClick={() => setModal({tipo:"tarea",data:null})}>+ Tarea</button>
        </div>
      </div>

      <div className="gantt-wrap card">
        {/* Month headers */}
        <div className="gantt-header">
          <div className="gantt-label-col"/>
          <div className="gantt-track">
            {months.map(m => (
              <div key={m.getTime()} className="gantt-month" style={{left:`${pct(m.toISOString().split("T")[0])}%`,width:`${100/months.length}%`}}>
                <span>{m.toLocaleDateString("es-ES",{month:"short"}).toUpperCase()}</span>
              </div>
            ))}
            {/* Today line */}
            <div className="gantt-today" style={{left:`${todayPct}%`}}>
              <div className="gantt-today-label">HOY</div>
            </div>
          </div>
        </div>

        {/* Area rows */}
        {areaRanges.map(a => {
          const left = pct(a.start);
          const right = pct(a.end);
          const width = Math.max(right-left, 1);
          return (
            <div key={a.id} className="gantt-row">
              <div className="gantt-label-col">
                <span style={{color:a.color}}>{a.icon}</span>
                <span className="mono xs" style={{color:"var(--text)"}}>{a.label.split(" ")[0]}</span>
                <span className="mono xs muted">{a.pctDone}%</span>
              </div>
              <div className="gantt-track" style={{position:"relative",height:44}}>
                <div className="gantt-bar" style={{
                  left:`${left}%`, width:`${width}%`,
                  background:`linear-gradient(90deg, ${a.color}cc, ${a.color}66)`,
                  border:`1px solid ${a.color}44`,
                  cursor:"pointer",
                }} title={`Ver tareas de ${a.label}`}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setGanttPopup({ area: a, tareas: tareas.filter(t => t.area === a.id), x: rect.left, y: rect.bottom + 6 });
                  }}>
                  <div className="gantt-bar-fill" style={{width:`${a.pctDone}%`,background:a.color+"99"}}/>
                  <span className="gantt-bar-label">{a.done}/{a.total}</span>
                </div>
                {/* Today line in row */}
                <div style={{position:"absolute",top:0,bottom:0,left:`${todayPct}%`,width:1,background:"rgba(248,113,113,.4)",zIndex:5}}/>
              </div>
            </div>
          );
        })}

        {/* Hitos */}
        <div className="gantt-row" style={{borderTop:"1px solid var(--border)",marginTop:".4rem",paddingTop:".5rem"}}>
          <div className="gantt-label-col">
            <span>🏁</span><span className="mono xs" style={{color:"var(--text)"}}>Hitos</span>
          </div>
          <div className="gantt-track" style={{position:"relative",height:44}}>
            {hitos.map(h => (
              <div key={h.id} className="gantt-hito" style={{
                left:`${pct(h.fecha)}%`,
                transform:"translateX(-50%)",
                color:h.critico?"#f87171":"#22d3ee",
                cursor:"pointer",
              }} title={h.nombre} onClick={() => setFicha("hito", h)}>
                <div className="gantt-diamond" style={{background:h.completado?"#34d399":h.critico?"#f87171":"#22d3ee"}}/>
                <div className="gantt-hito-label mono">{h.nombre.split(" ").slice(0,3).join(" ")}</div>
              </div>
            ))}
            <div style={{position:"absolute",top:0,bottom:0,left:`${todayPct}%`,width:1,background:"rgba(248,113,113,.4)",zIndex:5}}/>
          </div>
        </div>

        {/* Legend */}
        <div style={{display:"flex",gap:".75rem",padding:".5rem 0 0",flexWrap:"wrap",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:".3rem"}}><div style={{width:8,height:8,borderRadius:"50%",background:"#f87171"}}/><span className="mono xs muted">Hito crítico</span></div>
          <div style={{display:"flex",alignItems:"center",gap:".3rem"}}><div style={{width:8,height:8,borderRadius:"50%",background:"#22d3ee"}}/><span className="mono xs muted">Hito</span></div>
          <div style={{display:"flex",alignItems:"center",gap:".3rem"}}><div style={{width:16,height:3,background:"rgba(248,113,113,.5)"}}/><span className="mono xs muted">Hoy</span></div>
          <div style={{display:"flex",alignItems:"center",gap:".3rem"}}><div style={{width:16,height:8,borderRadius:2,background:"rgba(34,211,238,.3)",border:"1px solid rgba(34,211,238,.3)"}}/><span className="mono xs muted">Rango de tareas (progreso)</span></div>
        </div>
      </div>
      {/* ── Popup de tareas al tap en barra del Gantt ── */}
      {ganttPopup && createPortal(
        <div style={{position:"fixed",inset:0,zIndex:400,background:"transparent"}}
          onClick={() => setGanttPopup(null)}>
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
              padding:".55rem .85rem",borderBottom:"1px solid var(--border)",background:"var(--surface2)"}}>
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
                    padding:".45rem .85rem",borderBottom:"1px solid var(--border-light)",cursor:"pointer"}}
                    onClick={() => { setGanttPopup(null); setFicha("tarea", t); }}>
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
                onClick={() => { setGanttPopup(null); setFiltroArea(ganttPopup.area.id); setTabParent("tablón"); }}>
                Ver todas en Tablón →
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─── TAB EQUIPO ───────────────────────────────────────────────────────────────
