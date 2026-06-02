// Auto-extracted from Logistica.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { FASES_CHECKLIST, ESTADO_ENTREGA, ESTADO_TAREA, ESTADO_COLORES, PUESTOS_REF, TIPOS_LOC, LOC_ICONS, LOC_COLORS, TLC, ESCALA_CON_INSCRITOS } from "./logisticaConstants.js";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { SK_PROY_TAREAS } from "@/constants/storageKeys";

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function TabDash({ stats, tl, ck, setTab, config, patsConEspecie, material = [], asigs = [], totalInscritos = 0 }) {
  const prox = [...tl].filter(t=>t.estado!=="completado").sort((a,b)=>a.hora.localeCompare(b.hora)).slice(0,6);
  const porFase = FASES_CHECKLIST.map(f0 => { const it=ck.filter(c=>c.fase===f0); const d=it.filter(c=>c.estado==="completado").length; return {f:f0,d,t:it.length,pct:it.length?Math.round(d/it.length*100):0}; });

  // Widget cruzado: tareas de Proyecto de área logistica/ruta/diaD/sanitario
  const [rawTareasProyecto] = useData(SK_PROY_TAREAS, []);
  const tareasLogProyecto = useMemo(() => {
    const ts = Array.isArray(rawTareasProyecto) ? rawTareasProyecto : [];
    return ts.filter(t => ["logistica","ruta","diaD","sanitario"].includes(t.area));
  }, [rawTareasProyecto]);
  const tareasLogPendientes = tareasLogProyecto.filter(t => t.estado !== "completado");
  const tareasLogCompletadas = tareasLogProyecto.filter(t => t.estado === "completado");
  const pctLogProyecto = tareasLogProyecto.length > 0
    ? Math.round(tareasLogCompletadas.length / tareasLogProyecto.length * 100)
    : 0;
  // fix(FUNC-01): parseo explícito en hora local — new Date("YYYY-MM-DD") parsea como
  // medianoche UTC, lo que en España (UTC+2) adelanta el evento 2h al día anterior.
  // new Date(y, m-1, d, 23, 59, 59) siempre usa hora local del navegador (ECMAScript spec).
  const parseEventDate = (fechaStr) => {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59); // hora local garantizada
  };
  const eventoFecha = parseEventDate(config?.fecha || EVENT_CONFIG_DEFAULT.fecha);
  const diasHasta = Math.ceil((eventoFecha - new Date()) / 86400000);
  const yaFue = diasHasta < 0;
  const esSemana = diasHasta >= 0 && diasHasta <= 7;

  // M18: fase activa según diasHasta (misma lógica que TabCK)
  const faseActiva = (() => {
    if (diasHasta < 0)   return "Post-carrera";
    if (diasHasta <= 1)  return "Mañana carrera";
    if (diasHasta <= 2)  return "Día antes";
    if (diasHasta <= 7)  return "Semana antes";
    if (diasHasta <= 30) return "1 mes antes";
    if (diasHasta <= 60) return "2 meses antes";
    return "3 meses antes";
  })();
  const [faseSeleccionada, setFaseSeleccionada] = useState(null); // null = Todas

  // Filtrado del mini-checklist por fase seleccionada
  const porFaseFiltrado = useMemo(() => {
    if (!faseSeleccionada) return porFase;
    return porFase.filter(f => f.f === faseSeleccionada);
  }, [porFase, faseSeleccionada]);

  const KPIS = [
    { l:"⏱️ Timeline",   v:`${stats.tlDone}/${stats.tlTotal}`,
      s:"tareas completadas",
      color: stats.tlDone===stats.tlTotal && stats.tlTotal>0 ? "green" : "cyan",
      tab:"timeline",
      tip:"Tareas del Timeline completadas sobre el total.\nEl Timeline agrupa todas las acciones del día de carrera ordenadas por hora." },
    { l:"✅ Checklist",  v:`${Math.round(stats.ckDone/Math.max(stats.ckTotal,1)*100)}%`,
      s:`${stats.ckDone} de ${stats.ckTotal} ítems`,
      color: stats.ckDone===stats.ckTotal && stats.ckTotal>0 ? "green" : "cyan",
      progress: stats.ckTotal > 0 ? Math.round(stats.ckDone/stats.ckTotal*100) : undefined,
      tab:"checklist",
      tip:"Porcentaje de ítems completados del checklist pre-carrera.\nEl checklist se organiza por fases temporales: 3 meses antes, 1 mes antes, semana antes, etc." },
    { l:"📦 Stock",      v:stats.stockErr > 0 ? stats.stockErr : stats.stockBajoMinimo > 0 ? `${stats.stockBajoMinimo}⚠` : 0,
      s: stats.stockErr > 0 ? "materiales en déficit" : stats.stockBajoMinimo > 0 ? "bajo mínimo configurado" : "sin alertas",
      color: stats.stockErr>0 ? "red" : stats.stockBajoMinimo>0 ? "amber" : "green",
      tab:"material",
      tip:"Número de materiales cuya cantidad asignada supera el stock disponible.\nUn déficit significa que hay más asignaciones que unidades en almacén." },
    { l:"⚠️ Incidencias", v:stats.incOpen,
      s:"abiertas sin resolver",
      color: stats.incOpen>0 ? "red" : "green",
      tab:"emergencias",
      tip:"Incidencias registradas en Emergencias que siguen abiertas.\nCada incidencia debe resolverse o documentarse antes del cierre del evento.\nHaz clic para ir al tab Emergencias." },
  ];

  return (
    <>
      {/* ── KPIs — clases del sistema BLOCK_CSS ── */}
      <div className="kpi-grid mb">
        {KPIS.map(function(kpiItem) { return (
          <div key={kpiItem.l}
            className={`kpi ${kpiItem.color} cursor-ptr`}
            onClick={()=>setTab(kpiItem.tab)}
            title={`Ir a ${kpiItem.l}`}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>
              {kpiItem.l}{kpiItem.tip&&<Tooltip text={kpiItem.tip}><TooltipIcon size={11}/></Tooltip>}
            </div>
            <div className="kpi-value">{kpiItem.v}</div>
            <div className="kpi-sub">{kpiItem.s}</div>
            {kpiItem.progress !== undefined && (
              <div className="kpi-progress">
                <div className="kpi-progress-fill" style={{
                  width: `${kpiItem.progress}%`,
                  background: kpiItem.progress === 100 ? "var(--green)" : "var(--cyan)",
                  boxShadow: `0 0 6px ${kpiItem.progress === 100 ? "rgba(52,211,153,.5)" : "rgba(34,211,238,.5)"}`,
                }}/>
              </div>
            )}
          </div>
        );})}
      </div>

      {/* ── Panel de déficit de stock — solo si hay problemas ── */}
      {stats.stockErr > 0 && (() => {
        const enDeficit = material.map(m => {
          const totalAsig = asigs.filter(a0 => a0.materialId === m.id)
            .reduce((s, a) => s + a.cantidad, 0);
          const def = totalAsig - m.stock;
          return def > 0 ? { ...m, def, totalAsig } : null;
        }).filter(Boolean);
        if (!enDeficit.length) return null;
        return (
          <div style={{
            marginBottom: ".85rem", padding: ".65rem .85rem",
            background: "rgba(248,113,113,.05)",
            border: "1px solid rgba(248,113,113,.2)",
            borderLeft: "3px solid var(--red)",
            borderRadius: "var(--r-sm)",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:".45rem" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                fontWeight:700, color:"var(--red)", textTransform:"uppercase",
                letterSpacing:".06em" }}>
                ⚠ Stock insuficiente
              </span>
              <button className="btn btn-ghost btn-sm"
                style={{ fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}
                onClick={() => setTab("material")}>
                Ver material →
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:".3rem" }}>
              {enDeficit.map(m => (
                <div key={m.id} style={{
                  display:"flex", alignItems:"center", gap:".6rem",
                  fontSize:"var(--fs-base)",
                }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    fontWeight:800, color:"var(--red)",
                    background:"rgba(248,113,113,.1)", padding:".08rem .4rem",
                    borderRadius:3, flexShrink:0, minWidth:48, textAlign:"center" }}>
                    -{m.def} {m.unidad}
                  </span>
                  <span style={{ fontWeight:600, flex:1, minWidth:0,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {m.nombre}
                  </span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    color:"var(--text-muted)", flexShrink:0 }}>
                    {m.stock} stock · {m.totalAsig} asig.
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Panel de avituallamiento bajo mínimo configurado [LOG-04 / DIS-01] ── */}
      {/* Solo alerta si el material tiene stockMinimo > 0 configurado explícitamente.  */}
      {/* El umbral genérico (UMBRAL_GENERICO = 0.5 ud/corredor) fue eliminado porque   */}
      {/* generaba falsos positivos: 60 bidones de 8L / 250 corredores = 0.24 < 0.5    */}
      {/* disparaba alerta aunque 480L de agua sea más que suficiente para la carrera.   */}
      {/* M18: condición ampliada — mostrar siempre que haya stockMinimo configurado,   */}
      {/* independientemente de totalInscritos. El panel es preventivo, no reactivo.    */}
      {(() => {
        const insuficientes = material
          .filter(m => m.categoria === "Avituallamiento" && m.stockMinimo > 0)
          .map(m => {
            return m.stock < m.stockMinimo
              ? { ...m, falta: m.stockMinimo - m.stock }
              : null;
          })
          .filter(Boolean);
        if (!insuficientes.length) return null;
        return (
          <div style={{
            marginBottom: ".85rem", padding: ".65rem .85rem",
            background: "rgba(251,191,36,.05)",
            border: "1px solid rgba(251,191,36,.25)",
            borderLeft: "3px solid var(--amber)",
            borderRadius: "var(--r-sm)",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:".45rem" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                fontWeight:700, color:"var(--amber)", textTransform:"uppercase",
                letterSpacing:".06em" }}>
                🍎 Avituallamiento bajo mínimo configurado
              </span>
              <button className="btn btn-ghost btn-sm"
                style={{ fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}
                onClick={() => setTab("material")}>
                Ver material →
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:".3rem" }}>
              {insuficientes.map(m => (
                <div key={m.id} style={{
                  display:"flex", alignItems:"center", gap:".6rem",
                  fontSize:"var(--fs-base)",
                }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    fontWeight:800, color:"var(--amber)",
                    background:"rgba(251,191,36,.1)", padding:".08rem .4rem",
                    borderRadius:3, flexShrink:0, minWidth:48, textAlign:"center" }}>
                    -{m.falta} {m.unidad}
                  </span>
                  <span style={{ fontWeight:600, flex:1, minWidth:0,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {m.nombre}
                  </span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    color:"var(--text-muted)", flexShrink:0 }}>
                    {m.stock} ud · mín {m.stockMinimo}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Panel de materiales que escalan con inscritos [BUG-03] ── */}
      {/* Detecta déficit en dorsales, medallas, chips y camisetas de corredor  */}
      {/* cuando stock < totalInscritos. Usa los patrones de ESCALA_CON_INSCRITOS */}
      {/* exportados desde logisticaConstants.js (antes declarado pero nunca usado). */}
      {totalInscritos > 0 && (() => {
        const enDeficitPorInscritos = material
          .filter(m => ESCALA_CON_INSCRITOS.some(e => e.patron.test(m.nombre)))
          .map(m => {
            const deficit = totalInscritos - m.stock;
            return deficit > 0 ? { ...m, deficit } : null;
          })
          .filter(Boolean);
        if (!enDeficitPorInscritos.length) return null;
        return (
          <div style={{
            marginBottom: ".85rem", padding: ".65rem .85rem",
            background: "rgba(248,113,113,.05)",
            border: "1px solid rgba(248,113,113,.2)",
            borderLeft: "3px solid var(--red)",
            borderRadius: "var(--r-sm)",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:".45rem" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                fontWeight:700, color:"var(--red)", textTransform:"uppercase",
                letterSpacing:".06em" }}>
                🏅 Stock insuficiente para {totalInscritos} inscritos
              </span>
              <button className="btn btn-ghost btn-sm"
                style={{ fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}
                onClick={() => setTab("material")}>
                Ver material →
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:".3rem" }}>
              {enDeficitPorInscritos.map(m => (
                <div key={m.id} style={{
                  display:"flex", alignItems:"center", gap:".6rem",
                  fontSize:"var(--fs-base)",
                }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    fontWeight:800, color:"var(--red)",
                    background:"rgba(248,113,113,.1)", padding:".08rem .4rem",
                    borderRadius:3, flexShrink:0, minWidth:48, textAlign:"center" }}>
                    -{m.deficit} {m.unidad}
                  </span>
                  <span style={{ fontWeight:600, flex:1, minWidth:0,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {m.nombre}
                  </span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    color:"var(--text-muted)", flexShrink:0 }}>
                    {m.stock} stock · {totalInscritos} inscritos
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Countdown hero compacto ── */}
      <div className="card mb log-hero" style={{
        background: esSemana
          ? "linear-gradient(135deg,var(--red-dim),var(--red-dim))"
          : "linear-gradient(135deg,var(--cyan-dim),var(--violet-dim))",
        borderColor: esSemana ? "rgba(248,113,113,0.3)" : "var(--border)",
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"0.75rem"}}>
          <div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.2rem"}}>
              🏔️ {config.nombre} {config.edicion} · {config.lugar}, {config.provincia}
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:"0.4rem"}}>
              {yaFue ? (
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-lg)",fontWeight:800,color:"var(--green)"}}>¡Completado!</span>
              ) : (
                <>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"1.8rem",fontWeight:800,
                    color: esSemana ? "var(--red)" : "var(--amber)",lineHeight:1}}>
                    {diasHasta}
                  </span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)"}}>
                    {esSemana ? "⚡ días — SEMANA DE CARRERA" : "días para el evento"}
                  </span>
                </>
              )}
            </div>
          </div>
          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setTab("checklist")}>✅ Checklist</button>
            <button className="btn btn-sm" style={{background:"rgba(248,113,113,0.1)",color:"var(--red)",border:"1px solid rgba(248,113,113,0.25)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)"}}
              onClick={()=>setTab("emergencias")}>🚨 Emergencias</button>
          </div>
        </div>
      </div>

      {/* ── Especie de patrocinadores ── */}
      {patsConEspecie && patsConEspecie.length > 0 && (
        <div className="card mb">
          <div className="ct">📦 Material en especie (patrocinadores)</div>
          {patsConEspecie.map(pat => {
            const items = pat.especieItems || [];
            const recibidos = items.filter(i0 => i0.recibido).length;
            return (
              <div key={pat.id} style={{ display: "flex", alignItems: "flex-start", gap: ".6rem", padding: ".45rem 0", borderBottom: "1px solid rgba(30,45,80,.25)" }}>
                <span style={{ fontSize: "var(--fs-md)" }}>📦</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-base)", fontWeight: 700 }}>{pat.nombre}</div>
                  <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginTop: ".2rem" }}>
                    {items.map(i => (
                      <span key={i.id} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".1rem .35rem", borderRadius: 4,
                        background: i.recibido ? "rgba(52,211,153,.12)" : "rgba(251,191,36,.08)",
                        color: i.recibido ? "var(--green)" : "var(--amber)" }}>
                        {i.recibido ? "✓" : "⏳"} {i.nombre} ({i.cantidad} {i.unidad})
                      </span>
                    ))}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: recibidos === items.length ? "var(--green)" : "var(--amber)" }}>
                  {recibidos}/{items.length}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dos columnas: Timeline + Checklist ── */}
      <div className="twocol">
        <div className="card">
          <div className="ct">⏱️ Próximas tareas pendientes</div>
          {prox.length === 0 && (
            <div style={{textAlign:"center",padding:"1rem",color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}>
              ✓ Sin tareas pendientes
            </div>
          )}
          {prox.map(t=>(
            <div key={t.id} className="tlmr">
              <div className="tlh">{t.hora}</div>
              <div className="tld" style={{background:TLC[t.categoria]||"var(--text-muted)"}} />
              <div style={{flex:1,minWidth:0}}>
                <div className="tlt">{t.titulo}</div>
                <div className="tlr">{t.responsable}</div>
              </div>
              <div className="tls" style={{color:ESTADO_COLORES[t.estado]}}>{t.estado}</div>
            </div>
          ))}
          <button className="btn btn-ghost mt1" style={{width:"100%"}} onClick={()=>setTab("timeline")}>Ver timeline completo →</button>
        </div>
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".5rem"}}>
            <div className="ct" style={{marginBottom:0}}>✅ Progreso checklist por fase</div>
            {faseActiva && (
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-2xs)",fontWeight:700,
                background:"var(--cyan-dim)",color:"var(--cyan)",
                border:"1px solid rgba(34,211,238,0.3)",borderRadius:3,
                padding:"0.05rem 0.3rem",lineHeight:1.4,flexShrink:0}}>
                AHORA: {faseActiva}
              </span>
            )}
          </div>
          {/* Selector de fase */}
          <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",marginBottom:".65rem"}}>
            <button
              onClick={()=>setFaseSeleccionada(null)}
              style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-2xs)",padding:".15rem .45rem",
                borderRadius:99,border:`1px solid ${!faseSeleccionada?"var(--cyan)":"var(--border)"}`,
                background:!faseSeleccionada?"var(--cyan-dim)":"transparent",
                color:!faseSeleccionada?"var(--cyan)":"var(--text-muted)",cursor:"pointer",
                transition:"all .15s"}}>
              Todas
            </button>
            {FASES_CHECKLIST.map(f=>(
              <button key={f}
                onClick={()=>setFaseSeleccionada(faseSeleccionada===f?null:f)}
                style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-2xs)",padding:".15rem .45rem",
                  borderRadius:99,cursor:"pointer",transition:"all .15s",
                  border:`1px solid ${faseSeleccionada===f?"var(--cyan)":f===faseActiva?"rgba(34,211,238,0.3)":"var(--border)"}`,
                  background:faseSeleccionada===f?"var(--cyan-dim)":f===faseActiva?"rgba(34,211,238,0.06)":"transparent",
                  color:faseSeleccionada===f?"var(--cyan)":f===faseActiva?"var(--cyan)":"var(--text-muted)"}}>
                {f}
              </button>
            ))}
          </div>
          {porFaseFiltrado.map(f=>(
            <div key={f.f} style={{marginBottom:"0.6rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"var(--fs-sm)",marginBottom:"0.2rem"}}>
                <span style={{color: f.pct===100?"var(--text-muted)":"var(--text)",
                  fontWeight: f.f===faseActiva?700:400}}>
                  {f.f}{f.f===faseActiva&&" ★"}
                </span>
                <span className="mono" style={{color:f.pct===100?"var(--green)":"var(--text-muted)",fontSize:"var(--fs-xs)"}}>{f.d}/{f.t}</span>
              </div>
              <div className="pbar">
                <div className="pfill" style={{width:`${f.pct}%`,background:f.pct===100?"var(--green)":f.pct>50?"var(--cyan)":"var(--amber)"}}/>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost mt1" style={{width:"100%"}} onClick={()=>setTab("checklist")}>Ir al checklist →</button>
        </div>
      </div>
      {/* ── Widget: Tareas logísticas en Proyecto ── */}
      {tareasLogProyecto.length > 0 && (
        <div className="card mb">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".6rem" }}>
            <div>
              <div className="ct" style={{ marginBottom:".1rem" }}>🏔️ Planificación · Logística &amp; Día D</div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>
                {tareasLogCompletadas.length}/{tareasLogProyecto.length} tareas completadas en Proyecto
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize:"var(--fs-xs)", flexShrink:0 }}
              onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail:{ block:"proyecto" } }))}>
              Ver en Proyecto →
            </button>
          </div>
          {/* Barra de progreso */}
          <div style={{ marginBottom:".65rem" }}>
            <div className="pbar">
              <div className="pfill" style={{
                width:`${pctLogProyecto}%`,
                background: pctLogProyecto===100 ? "var(--green)" : pctLogProyecto>60 ? "var(--cyan)" : "var(--amber)"
              }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:".2rem" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                color: pctLogProyecto===100 ? "var(--green)" : "var(--text-muted)" }}>
                {pctLogProyecto}%
              </span>
            </div>
          </div>
          {/* Tareas pendientes — máx 5 */}
          {tareasLogPendientes.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:".3rem" }}>
              {tareasLogPendientes.slice(0,5).map(t => {
                const dias = t.fechaLimite
                  ? Math.ceil((new Date(t.fechaLimite) - new Date()) / 86400000)
                  : null;
                const vencida = dias !== null && dias < 0;
                const urgente = dias !== null && dias >= 0 && dias <= 7;
                const colorFecha = vencida ? "var(--red)" : urgente ? "var(--orange)" : "var(--text-muted)";
                const AREA_LABELS = { logistica:"📦 Logística", ruta:"🏔️ Ruta", diaD:"🏁 Día D", sanitario:"🏥 Sanitario" };
                const estadoC = { pendiente:"var(--text-muted)", "en curso":"var(--cyan)", bloqueado:"var(--red)" };
                return (
                  <div key={t.id} style={{
                    display:"flex", alignItems:"center", gap:".5rem",
                    padding:".35rem .5rem", borderRadius:"var(--r-sm)",
                    background:"var(--surface2)", border:"1px solid var(--border)",
                  }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"var(--text-dim)", flexShrink:0, minWidth:68 }}>
                      {AREA_LABELS[t.area] || t.area}
                    </span>
                    <span style={{ flex:1, fontSize:"var(--fs-sm)", fontWeight:600,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                      color: estadoC[t.estado] || "var(--text)" }}>
                      {t.titulo}
                    </span>
                    {dias !== null && (
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                        color:colorFecha, flexShrink:0 }}>
                        {vencida ? `⚠ ${Math.abs(dias)}d` : urgente ? `⚡ ${dias}d` : `${dias}d`}
                      </span>
                    )}
                  </div>
                );
              })}
              {tareasLogPendientes.length > 5 && (
                <div style={{ textAlign:"center", fontFamily:"var(--font-mono)",
                  fontSize:"var(--fs-xs)", color:"var(--text-dim)", padding:".25rem 0" }}>
                  +{tareasLogPendientes.length - 5} más pendientes
                </div>
              )}
            </div>
          )}
          {tareasLogPendientes.length === 0 && (
            <div style={{ textAlign:"center", padding:".5rem 0",
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", color:"var(--green)" }}>
              ✓ Todas las tareas logísticas completadas
            </div>
          )}
        </div>
      )}
    </>
  );
}



// Exports
export { TabDash };
