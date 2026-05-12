// Auto-extracted from Logistica.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { FASES_CHECKLIST, ESTADO_ENTREGA, ESTADO_TAREA, ESTADO_COLORES, PUESTOS_REF, TIPOS_LOC, LOC_ICONS, LOC_COLORS, TLC } from "./logisticaConstants.js";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function TabDash({ stats, tl, ck, setTab, config, patsConEspecie, material = [], asigs = [] }) {
  const prox = [...tl].filter(t=>t.estado!=="completado").sort((a,b)=>a.hora.localeCompare(b.hora)).slice(0,6);
  const porFase = FASES_CHECKLIST.map(f0 => { const it=ck.filter(c=>c.fase===f0); const d=it.filter(c=>c.estado==="completado").length; return {f:f0,d,t:it.length,pct:it.length?Math.round(d/it.length*100):0}; });
  const eventoFecha = config?.fecha ? new Date(config.fecha) : new Date(EVENT_CONFIG_DEFAULT.fecha);
  const diasHasta = Math.ceil((eventoFecha - new Date()) / 86400000);
  const yaFue = diasHasta < 0;
  const esSemana = diasHasta >= 0 && diasHasta <= 7;

  const KPIS = [
    { l:"⏱️ Timeline",   v:`${stats.tlDone}/${stats.tlTotal}`,
      s:"tareas completadas",
      color: stats.tlDone===stats.tlTotal && stats.tlTotal>0 ? "green" : "cyan",
      tab:"timeline",
      tip:"Tareas del Timeline completadas sobre el total.\nEl Timeline agrupa todas las acciones del día de carrera ordenadas por hora." },
    { l:"✅ Checklist",  v:`${Math.round(stats.ckDone/Math.max(stats.ckTotal,1)*100)}%`,
      s:`${stats.ckDone} de ${stats.ckTotal} ítems`,
      color: stats.ckDone===stats.ckTotal && stats.ckTotal>0 ? "green" : "cyan",
      tab:"checklist",
      tip:"Porcentaje de ítems completados del checklist pre-carrera.\nEl checklist se organiza por fases temporales: 3 meses antes, 1 mes antes, semana antes, etc." },
    { l:"📦 Stock",      v:stats.stockErr > 0 ? stats.stockErr : stats.stockBajoMinimo > 0 ? `${stats.stockBajoMinimo}⚠` : 0,
      s:"materiales en déficit",
      color: stats.stockErr>0 ? "red" : "green",
      tab:"material",
      tip:"Número de materiales cuya cantidad asignada supera el stock disponible.\nUn déficit significa que hay más asignaciones que unidades en almacén." },
    { l:"⚠️ Incidencias", v:stats.incOpen,
      s:"abiertas sin resolver",
      color: stats.incOpen>0 ? "red" : "green",
      tab:"contactos",
      tip:"Incidencias registradas en Emergencias que siguen abiertas.\nCada incidencia debe resolverse o documentarse antes del cierre del evento." },
  ];

  return (
    <>
      {/* ── KPIs — clases del sistema BLOCK_CSS ── */}
      <div className="kpi-grid mb">
        {KPIS.map(function(kpiItem) { return (
          <div key={kpiItem.l}
            className={`kpi ${kpiItem.color} log-kpi-link`}
            onClick={()=>setTab(kpiItem.tab)}
            title={`Ir a ${kpiItem.l}`}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>
              {kpiItem.l}{kpiItem.tip&&<Tooltip text={kpiItem.tip}><TooltipIcon size={11}/></Tooltip>}
            </div>
            <div className="kpi-value">{kpiItem.v}</div>
            <div className="kpi-sub">{kpiItem.s}</div>
            <div className="log-kpi-arrow">→ ver detalle</div>
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
              onClick={()=>setTab("contactos")}>🚨 Emergencias</button>
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
          <div className="ct">✅ Progreso checklist por fase</div>
          {porFase.map(f=>(
            <div key={f.f} style={{marginBottom:"0.6rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"var(--fs-sm)",marginBottom:"0.2rem"}}>
                <span style={{color: f.pct===100?"var(--text-muted)":"var(--text)"}}>{f.f}</span>
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
    </>
  );
}



// Exports
export { TabDash };
