// Auto-extracted from Voluntarios.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK, GUIA_TALLAS } from "@/constants/camisetasConstants";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/hooks/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";

// ─── TAB DASHBOARD ────────────────────────────────────────────────────────────
function TabDashboard({ stats, puestosConStats, voluntarios, setTab, onEditarVol, onEditarPuesto, sugerenciasReubicacion = [], onReasignar }) {
  const [alertasColapsadas, setAlertasColapsadas] = useState(true);
  const [sinPuestoColapsado, setSinPuestoColapsado] = useState(false);
  const alertas = puestosConStats.filter(p => p.coberturaConf < 50);
  const cobColor = stats.coberturaGlobal >= 80 ? "c-green" : stats.coberturaGlobal >= 50 ? "c-amber" : "c-red";

  return (
    <>
      <div className="kpi-grid">
        <div className={`kpi cursor-ptr ${stats.coberturaGlobal>=80?"green":stats.coberturaGlobal>=50?"amber":"red"}`}
          onClick={() => setTab("puestos")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>🎯 Cobertura global<Tooltip text={"Voluntarios confirmados ÷ plazas necesarias en todos los puestos.\n100% = todos los puestos cubiertos por voluntarios confirmados."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:stats.coberturaGlobal>=80?"var(--green)":stats.coberturaGlobal>=50?"var(--amber)":"var(--red)"}}>
            {stats.coberturaGlobal}%
          </div>
          <div className="kpi-sub">{stats.confirmados}/{stats.totalNecesarios} confirmados</div>
        </div>
        <div className="kpi cyan cursor-ptr" onClick={() => setTab("voluntarios")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>👥 Total voluntarios<Tooltip text={"Total de voluntarios registrados en el sistema, independientemente de su estado.\nIncluye confirmados, pendientes y cancelados."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"var(--cyan)"}}>{stats.total}</div>
          <div className="kpi-sub">
            <span style={{color:"var(--green)"}}>{stats.confirmados} ✓</span>
            {" · "}
            <span style={{color:"var(--amber)"}}>{stats.pendientes} ⏳</span>
            {stats.cancelados > 0 && <>{" · "}<span style={{color:"var(--red)"}}>{stats.cancelados} ✕</span></>}
          </div>
        </div>
        <div className={`kpi cursor-ptr ${alertas.length>0?"red":"violet"}`}
          onClick={() => setTab("puestos")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>📍 Puestos<Tooltip text={"Número de puestos operativos definidos para el evento.\nCada puesto tiene un número de voluntarios necesarios y un horario asignado."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:alertas.length>0?"var(--red)":"var(--violet)"}}>
            {puestosConStats.length}
          </div>
          <div className="kpi-sub">
            {alertas.length>0
              ? `${alertas.length} con cobertura insuficiente`
              : `${puestosConStats.filter(p=>p.coberturaConf>=100).length} confirmados al 100%`}
          </div>
        </div>
        <div className="kpi amber cursor-ptr" onClick={() => setTab("voluntarios")} title="Ver voluntarios con vehículo">
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>🚗 Con vehículo<Tooltip text={"Voluntarios confirmados que han indicado disponer de vehículo propio.\nÚtil para planificar rutas de reparto y acceso a puestos remotos."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value" style={{color:"var(--amber)"}}>{stats.conCoche}</div>
          <div className="kpi-sub">{stats.total>0?Math.round(stats.conCoche/stats.total*100):0}% del total</div>
        </div>
        {stats.enPuesto > 0 && (
          <div className="kpi green cursor-ptr" onClick={() => setTab("dia-d")} title="Ver checklist día de carrera">
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>📍 En su puesto</div>
            <div className="kpi-value" style={{color:"var(--green)"}}>{stats.enPuesto}</div>
            <div className="kpi-sub">{stats.total>0?Math.round(stats.enPuesto/stats.total*100):0}% confirmados</div>
          </div>
        )}
      </div>

      {alertas.length > 0 && (
        <div style={{borderRadius:10,overflow:"hidden",marginBottom:".85rem",
          border:"1px solid rgba(248,113,113,.25)",background:"var(--red-dim)"}}>
          <button
            onClick={() => setAlertasColapsadas(v => !v)}
            style={{width:"100%",display:"flex",alignItems:"center",gap:".65rem",
              padding:".6rem .85rem",background:"transparent",border:"none",
              cursor:"pointer",textAlign:"left",
              borderBottom: alertasColapsadas ? "none" : "1px solid rgba(248,113,113,.2)"}}>
            <span style={{width:8,height:8,borderRadius:"50%",
              background:"var(--red)",flexShrink:0,display:"inline-block"}}/>
            <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:"var(--fs-sm)",
              color:"var(--red)",flex:1}}>
              ⚠️ Puestos con cobertura insuficiente
            </span>
            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
              color:"var(--red)",padding:".1rem .4rem",borderRadius:20,
              background:"rgba(248,113,113,.15)"}}>
              {alertas.length}
            </span>
            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
              color:"rgba(248,113,113,.6)",flexShrink:0,
              transform:alertasColapsadas?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
          </button>
          {!alertasColapsadas && (
            <div style={{padding:".35rem .85rem .6rem"}}>
              {alertas.map(p => (
                <div key={p.id}
                  onClick={() => onEditarPuesto(p)}
                  title="Click para abrir ficha del puesto"
                  style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"0.3rem 0.3rem",borderBottom:"1px solid rgba(248,113,113,0.1)",
                    fontSize:"var(--fs-base)",cursor:"pointer",borderRadius:4,transition:"background .12s"}}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(248,113,113,.08)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <span>{p.nombre}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
                    color:"var(--red)",fontWeight:700}}>
                    {p.confirmados}/{p.necesarios} conf. · {p.totalAsignados} asig. ({p.coberturaConf}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
        <div className="card">
          <div className="card-title">📍 Cobertura por puesto</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {puestosConStats.slice(0, 6).map(p => {
              const pct = Math.min(p.coberturaConf, 100);
              const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
              return (
                <div key={p.id} className="cursor-ptr"
                  onClick={() => onEditarPuesto(p)}
                  title="Click para abrir ficha del puesto">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span style={{ fontSize: "var(--fs-sm)", color: "var(--text)" }}>{p.nombre}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color }}>{p.totalAsignados}/{p.necesarios}</span>
                  </div>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
            {puestosConStats.length > 6 && (
              <button className="btn btn-ghost" style={{ fontSize: "var(--fs-sm)", marginTop: "0.25rem" }} onClick={() => setTab("puestos")}>
                Ver todos los puestos →
              </button>
            )}
          </div>
        </div>

        <div className="card">
          {(() => {
            const sinPuestoAll = voluntarios
              .filter(v => !v.puestoId && v.estado !== "cancelado");
            const sinPuesto = sinPuestoAll;
            const pendConf = voluntarios
              .filter(v => v.estado === "pendiente")
              .sort((a,b) => (a.fechaRegistro||"").localeCompare(b.fechaRegistro||""))
              .slice(0, 10);
            // Mostrar sin puesto si hay, si no los pendientes de confirmar
            const lista = sinPuesto.length > 0 ? sinPuesto : pendConf;
            const titulo = sinPuesto.length > 0
              ? `📍 Sin puesto asignado (${sinPuestoAll.length})`
              : `⏳ Pendientes de confirmar (${pendConf.length})`;
            if (lista.length === 0) return (
              <div style={{ textAlign:"center", padding:"1.5rem 0",
                fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", color:"var(--green)" }}>
                ✅ Todos asignados y confirmados
              </div>
            );
            return (
              <>
                <button
                  onClick={() => setSinPuestoColapsado(v => !v)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    width:"100%", background:"none", border:"none", cursor:"pointer", padding:0,
                    marginBottom: sinPuestoColapsado ? 0 : ".4rem" }}>
                  <div className="card-title" style={{marginBottom:0}}>{titulo}</div>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                    color:"var(--text-dim)", transition:"transform .18s",
                    transform: sinPuestoColapsado ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {!sinPuestoColapsado && (
                <div style={{ display:"flex", flexDirection:"column", gap:"0.35rem" }}>
                  {lista.map(v => (
                    <div key={v.id}
                      onClick={() => onEditarVol(v)}
                      title="Click para abrir ficha"
                      style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                        padding:"0.3rem 0.25rem", borderBottom:"1px solid rgba(30,45,80,0.3)",
                        cursor:"pointer", borderRadius:4, transition:"background .12s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{ position:"relative", width:26, height:26, flexShrink:0 }}>
                        <div style={{ width:26, height:26, borderRadius:"50%",
                          background:"var(--surface2)", border:"1px solid var(--border)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:"var(--fs-xs)", fontWeight:700, color:"var(--cyan)" }}>
                          {(v.nombre||"V").split(" ").map(n=>n[0]).slice(0,2).join("")}
                        </div>
                        <span style={{
                          position:"absolute", bottom:0, right:0,
                          width:8, height:8, borderRadius:"50%",
                          background: v.estado==="confirmado" ? "var(--green)" : v.estado==="cancelado" ? "var(--red)" : "var(--amber)",
                          border:"1.5px solid var(--surface)",
                          display:"block",
                        }} title={v.estado} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"0.74rem", fontWeight:600,
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {v.nombre||"Sin nombre"}{v.apellidos ? (" "+v.apellidos) : ""}
                        </div>
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.56rem",
                          color:"var(--text-muted)" }}>{v.telefono||"—"}</div>
                      </div>
                      <span className={`badge badge-${v.estado==="confirmado"?"green":v.estado==="cancelado"?"red":"amber"}`}>
                        {v.estado}
                      </span>
                      <div style={{ display:"flex", gap:".2rem", flexShrink:0 }}>
                        {v.camisetaEntregada && (
                          <span title="Camiseta entregada" style={{ fontSize:"var(--fs-xs)" }}>🎽</span>
                        )}
                        {v.enPuesto && (
                          <span title={"En puesto" + (v.horaLlegada ? " · " + v.horaLlegada : "")}
                            style={{ fontSize:"var(--fs-xs)" }}>📍</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Resumen de tallas — para coordinación con Camisetas ── */}
      {Object.values(stats.tallasCount || {}).some(n => n > 0) && (
        <div className="card" style={{ marginTop:".85rem" }}>
          <div className="card-title" style={{ marginBottom:".6rem", justifyContent:"space-between" }}>
            <span>
              👕 Tallas de voluntarios
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                color:"var(--text-dim)", fontWeight:400, marginLeft:".5rem" }}>
                (excluye cancelados)
              </span>
            </span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize:"var(--fs-xs)", padding:".2rem .5rem" }}
              onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block:"camisetas" } }))}>
              Ver en Camisetas →
            </button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:".35rem" }}>
            {Object.entries(stats.tallasCount || {})
              .filter(([, n]) => n > 0)
              .map(([talla, n]) => (
                <div key={talla} style={{
                  fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                  padding:".2rem .6rem", borderRadius:6,
                  background:"var(--surface2)", border:"1px solid var(--border)",
                  display:"flex", gap:".4rem", alignItems:"center",
                }}>
                  <span style={{ color:"var(--text-muted)" }}>{talla}</span>
                  <span style={{ fontWeight:800, color:"var(--cyan)" }}>{n}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}


// Exports
export { TabDashboard };
