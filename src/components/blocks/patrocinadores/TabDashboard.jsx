import { useState } from "react";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { fmtEur } from "@/lib/utils";
import { NIVELES, NIVEL_CFG, getCfg } from "./constants";
import { getEspecieValue } from "@/lib/budgetUtils";
import { sponsorshipClass } from "@/constants/thresholds";

export default function TabDashboard({ stats, pats, objetivo, setObjetivo, setTab, openNuevo, openDetalle, config }) {
  const [editObj, setEditObj] = useState(false);
  const [tmpObj, setTmpObj] = useState(objetivo);

  // INC-01: usar getEspecieValue (fuente única de verdad, Opción C) para coherencia con stats.especie
  const porNivel = NIVELES.map(n => {
    const np = pats.filter(p => p.nivel === n && p.estado !== "cancelado");
    const total = np.reduce((s, p) => s + (p.importe || 0) + getEspecieValue(p), 0);
    return { n, count: np.length, total, cfg: NIVEL_CFG[n] };
  });

  // Patrocinadores que requieren acción (en orden de urgencia)
  const requierenAtencion = (() => {
    const lista = [];
    // 1. Vencidos sin cobrar — máxima urgencia
    pats.filter(p => p.fechaVencimiento && p.estado !== "cobrado" && p.estado !== "cancelado" &&
      Math.ceil((new Date(p.fechaVencimiento) - new Date()) / 86400000) < 0)
      .forEach(p => lista.push({ ...p, _motivo:"vencido", _color:"var(--red)" }));
    // 2. Negociando (hay que cerrar)
    pats.filter(p => p.estado === "negociando")
      .forEach(p => lista.push({ ...p, _motivo:"negociando", _color:"#fbbf24" }));
    // 3. Confirmados sin cobrar
    pats.filter(p => p.estado === "confirmado")
      .forEach(p => lista.push({ ...p, _motivo:"pendiente cobro", _color:"var(--cyan)" }));
    // 4. Contraprestaciones pendientes
    pats.filter(p => (p.contraprestaciones||[]).some(c => c.estado === "pendiente") &&
      p.estado !== "cancelado")
      .filter(p => !lista.find(x => x.id === p.id)) // evitar duplicados
      .forEach(p => {
        const n = (p.contraprestaciones||[]).filter(c => c.estado === "pendiente").length;
        lista.push({ ...p, _motivo:`${n} compromisos`, _color:"var(--violet)" });
      });
    return lista.slice(0, 6);
  })();

  const vencProx = pats.filter(p => p && p.fechaVencimiento && p.estado !== "cobrado" && p.estado !== "cancelado")
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento)).slice(0, 4);

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📊 Dashboard de Patrocinios</div>
          <div className="pd">{config.nombre} {config.edicion} · {config.lugar}, {config.provincia}</div>
        </div>
        <button className="btn btn-primary" onClick={openNuevo}>+ Nuevo patrocinador</button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid mb">
        <div className={`kpi ${sponsorshipClass(stats.pctObj)} cursor-ptr`} onClick={()=>setTab("patrocinadores")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>🤝 Captado
            <Tooltip text={"Total comprometido: confirmado + cobrado. Incluye importe monetario y valor en especie. No modifica el módulo Presupuesto (que opera solo con ingresos monetarios)."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"#f59e0b"}}>{fmtEur(stats.comprometido)}</div>
          <div className="kpi-sub">{stats.pctObj}% del objetivo · {stats.confirmados} patrocinadores · incl. especie</div>
          {/* C6.1: barra de progreso hacia el objetivo */}
          <div className="kpi-progress">
            <div className="kpi-progress-fill" style={{
              width: `${Math.min(100, stats.pctObj)}%`,
              background: stats.pctObj >= 80 ? "var(--green)" : stats.pctObj >= 50 ? "var(--amber)" : "var(--red)",
              boxShadow: "0 0 6px rgba(251,191,36,.5)",
            }}/>
          </div>
        </div>
        <div className="kpi green cursor-ptr" onClick={()=>setTab("patrocinadores")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>💰 Cobrado
            <Tooltip text={"Dinero ya en cuenta: solo patrocinadores en estado cobrado. Tesorería real efectiva."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"var(--green)"}}>{fmtEur(stats.cobrado)}</div>
          <div className="kpi-sub">{stats.pctCobrado}% del objetivo</div>
          {/* C6.1: barra de progreso dinero cobrado */}
          <div className="kpi-progress">
            <div className="kpi-progress-fill" style={{
              width: `${Math.min(100, stats.pctCobrado)}%`,
              background: "var(--green)",
              boxShadow: "0 0 6px rgba(52,211,153,.5)",
            }}/>
          </div>
        </div>
        <div className="kpi cyan cursor-ptr" onClick={()=>setTab("patrocinadores")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>⏳ Pendiente cobro
            <Tooltip text={"Importe captado (comprometido) que aún no ha sido ingresado. Captado - Cobrado."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"var(--cyan)"}}>{fmtEur(stats.pendienteCobro)}</div>
          <div className="kpi-sub">por ingresar en cuenta</div>
        </div>
        <div className="kpi violet cursor-ptr" onClick={()=>setTab("patrocinadores")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>📦 En especie
            <Tooltip text={"Valor estimado de aportaciones no monetarias: material, servicios, productos."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"var(--violet)"}}>{fmtEur(stats.especie)}</div>
          <div className="kpi-sub">valor estimado</div>
        </div>
      </div>

      {/* Objetivo editable — compacto */}
      <div style={{ display:"flex", alignItems:"center", gap:".6rem",
        marginBottom:".85rem", padding:".55rem .85rem",
        background:"rgba(245,158,11,.05)", border:"1px solid rgba(245,158,11,.15)",
        borderRadius:"var(--r-sm)" }}>
        <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
          color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".06em" }}>
          🎯 Objetivo
        </span>
        {editObj ? (
          <>
            <input className="inp" type="number" value={tmpObj}
              onChange={e => setTmpObj(parseFloat(e.target.value)||0)}
              style={{ width:90, fontFamily:"var(--font-mono)", fontSize:"var(--fs-base)" }}
              autoFocus />
            <button className="btn btn-gold btn-sm"
              onClick={()=>{ setObjetivo(tmpObj); setEditObj(false); }}>OK</button>
            <button className="btn btn-ghost btn-sm"
              onClick={()=>setEditObj(false)}>✕</button>
          </>
        ) : (
          <>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-base)",
              fontWeight:800, color:"#f59e0b" }}>{fmtEur(objetivo)}</span>
            <div style={{ flex:1, height:4, background:"var(--surface3)",
              borderRadius:2, overflow:"hidden", maxWidth:160 }}>
              <div style={{ height:"100%", borderRadius:2, transition:"width .5s",
                width:`${stats.pctObj}%`,
                background:"linear-gradient(90deg,#f59e0b,#fbbf24)" }} />
            </div>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
              fontWeight:700, color:stats.pctObj>=80?"var(--green)":stats.pctObj>=50?"#f59e0b":"var(--red)" }}>
              {stats.pctObj}%
            </span>
            <button className="btn btn-ghost btn-sm"
              style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                color:"var(--text-dim)", marginLeft:"auto" }}
              onClick={()=>{ setTmpObj(objetivo); setEditObj(true); }}>
              ✏️ Editar
            </button>
          </>
        )}
      </div>

      <div className="twocol">
        {/* Por nivel */}
        <div className="card">
          <div className="ct">🏅 Captación por nivel</div>
          {porNivel.filter(x => x.count > 0 || x.n !== "Especie").map(x => (
            <div key={x.n} style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".75rem" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: x.cfg.dim, border: `1px solid ${x.cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-md)", flexShrink: 0 }}>{x.cfg.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-sm)", fontWeight: 600, marginBottom: ".2rem" }}>
                  <span style={{ color: x.cfg.color }}>{x.n}</span>
                  <span className="mono" style={{ color: "var(--text-muted)" }}>{x.count} patrocinador{x.count !== 1 ? "es" : ""}</span>
                </div>
                <div className="pbar">
                  <div className="pfill" style={{ width: x.cfg.objetivo > 0 ? `${Math.min(x.total / x.cfg.objetivo * 100, 100)}%` : "0%", background: x.cfg.color }} />
                </div>
                <div style={{ marginTop: ".15rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: x.cfg.color }}>
                  {fmtEur(x.total)}
                  {x.cfg.objetivo > 0 && (
                    <span style={{ color: "var(--text-dim)", fontSize: "var(--fs-xs)", fontWeight: 400, marginLeft: ".35rem" }}>
                      / {fmtEur(x.cfg.objetivo)} obj.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Vencimientos */}
        <div className="card">
          <div className="ct">⏰ Próximos vencimientos de cobro</div>
          {vencProx.length === 0 && <div className="empty">Sin vencimientos próximos</div>}
          {vencProx.map(p => {
            const dias = Math.ceil((new Date(p.fechaVencimiento) - new Date()) / 86400000);
            const urgente = dias < 30;
            return (
              <div key={p.id} className="list-item-anim" style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".45rem 0", borderBottom: "1px solid rgba(30,45,80,.3)", cursor:"pointer" }} onClick={()=>openDetalle(p)}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: getCfg(p.nivel).color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-base)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</div>
                  <div className="mono xs muted">{p.fechaVencimiento} · {fmtEur(p.importe)}</div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: urgente ? "#f87171" : "#fbbf24", background: urgente ? "rgba(248,113,113,.1)" : "rgba(251,191,36,.1)", padding: ".12rem .4rem", borderRadius: 4, flexShrink: 0 }}>
                  {dias < 0 ? "VENCIDO" : `${dias}d`}
                </div>
              </div>
            );
          })}
          <button className="btn ghost mt1" style={{ width: "100%" }} onClick={() => setTab("patrocinadores")}>
            Ver todos los patrocinadores →
          </button>
        </div>
      </div>

      {/* Requiere atención */}
      <div className="card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:".65rem" }}>
          <div className="ct" style={{ marginBottom:0 }}>⚡ Requiere atención</div>
          {requierenAtencion.length === 0 && (
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              color:"var(--green)" }}>✅ Todo en orden</span>
          )}
        </div>
        {requierenAtencion.length === 0 ? (
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
            color:"var(--text-muted)", textAlign:"center", padding:".75rem 0" }}>
            Sin acciones pendientes en patrocinadores
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:".35rem" }}>
            {requierenAtencion.map(p => {
              const cfg = getCfg(p.nivel) || NIVEL_CFG.Especie;
              return (
                <div key={p.id+p._motivo}
                  onClick={() => openDetalle(p)}
                  style={{ display:"flex", alignItems:"center", gap:".65rem",
                    padding:".5rem .65rem", borderRadius:8, cursor:"pointer",
                    background:"var(--surface2)", border:"1px solid var(--border)",
                    borderLeft:`3px solid ${p._color}`, transition:"border-color .12s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border-light)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"var(--fs-base)", fontWeight:700,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {p.nombre}
                    </div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"var(--text-muted)", marginTop:".1rem" }}>
                      {cfg.icon} {p.nivel} · {p.sector}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column",
                    alignItems:"flex-end", gap:".15rem", flexShrink:0 }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      fontWeight:700, color:p._color,
                      background:`${p._color}15`, border:`1px solid ${p._color}33`,
                      borderRadius:3, padding:".1rem .4rem", whiteSpace:"nowrap" }}>
                      {p._motivo}
                    </span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"var(--text-muted)" }}>
                      {p.especie > 0 ? `${fmtEur(p.especie)} especie` : fmtEur(p.importe)}
                    </span>
                  </div>
                </div>
              );
            })}
            <button className="btn btn-ghost" style={{ marginTop:".25rem", fontSize:"var(--fs-sm)" }}
              onClick={() => setTab("patrocinadores")}>
              Ver todos los patrocinadores →
            </button>
          </div>
        )}
      </div>

      {/* Ranking de dependencia económica */}
      {(() => {
        const totalIngresos = stats.comprometido + stats.especie;
        if (totalIngresos === 0) return null;
        const ranking = pats
          .filter(p => p.estado !== "cancelado")
          .map(p => {
            const aportacion = (p.importe || 0) + (p.especie || 0);
            const pct = Math.round(aportacion / totalIngresos * 100);
            const nivel = pct > 20 ? "critica" : pct > 10 ? "alta" : pct > 5 ? "media" : "baja";
            return { ...p, _aportacion: aportacion, _pct: pct, _dep: nivel };
          })
          .sort((a, b) => b._aportacion - a._aportacion)
          .slice(0, 6);
        const criticos = ranking.filter(p => p._dep === "critica" || p._dep === "alta");
        return (
          <div className="card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".65rem" }}>
              <div className="ct" style={{ marginBottom:0 }}>📊 Dependencia económica por patrocinador</div>
              {criticos.length > 0 && (
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--red)", background:"var(--red-dim)", border:"1px solid var(--red-border)",
                  borderRadius:4, padding:".1rem .45rem" }}>
                  ⚠ {criticos.length} con alta dependencia
                </span>
              )}
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginBottom:".65rem" }}>
              % que representa cada patrocinador sobre el total captado. Alta dependencia = riesgo si cancela.
            </div>
            {ranking.map(p => {
              const cfg = NIVEL_CFG[p.nivel] || NIVEL_CFG["Colaborador"];
              const depColor = p._dep === "critica" ? "var(--red)" : p._dep === "alta" ? "var(--amber)" : p._dep === "media" ? "var(--cyan)" : "var(--text-muted)";
              return (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:".6rem",
                  padding:".4rem .3rem", borderBottom:"1px solid var(--border)", cursor:"pointer" }}
                  onClick={() => openDetalle(p)}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".2rem" }}>
                      <span style={{ fontWeight:600, fontSize:"var(--fs-sm)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nombre}</span>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:depColor, fontWeight:700, flexShrink:0, marginLeft:".4rem" }}>
                        {p._pct}%
                      </span>
                    </div>
                    <div style={{ height:6, background:"var(--surface3)", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ width:`${Math.min(p._pct,100)}%`, height:"100%", background:depColor, borderRadius:3, transition:"width .4s" }} />
                    </div>
                  </div>
                  <div style={{ flexShrink:0, textAlign:"right" }}>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:cfg.color }}>{cfg.icon} {p.nivel}</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>{fmtEur(p._aportacion)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </>
  );
}
