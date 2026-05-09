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
import { DIST_COLORS } from "@/constants/voluntariosConstants";

// ─── TAB PUESTOS ──────────────────────────────────────────────────────────────
function TabPuestos({ puestosConStats, voluntarios, locs, matPorLoc = {}, onUpdatePuesto, onDeletePuesto, onNuevoPuesto, onEditPuesto, onFichaPuesto, onFichaVol }) {
  const [ordenAlfa, setOrdenAlfa]   = useState(false);
  const [busqPuesto, setBusqPuesto] = useState("");
  const [vistaAgrupada, setVistaAgrupada] = useState(false);
  const [colapsadosTipo, setColapsadosTipo] = useState({});

  const toggleTipo = (tipo) => setColapsadosTipo(prev => ({ ...prev, [tipo]: !prev[tipo] }));

  const puestosOrdenados = ordenAlfa
    ? [...puestosConStats].sort((a,b) => (a.nombre||"").localeCompare(b.nombre||"","es"))
    : puestosConStats;
  const puestosFiltrados = busqPuesto.trim()
    ? puestosOrdenados.filter(p => p.nombre.toLowerCase().includes(busqPuesto.toLowerCase()))
    : puestosOrdenados;

  // Agrupado por tipo
  const tiposUnicos = [...new Set(puestosOrdenados.map(p => p.tipo || "Sin tipo"))];
  const puestosPorTipo = tiposUnicos.map(tipo => ({
    tipo,
    items: puestosFiltrados.filter(p => (p.tipo || "Sin tipo") === tipo),
  })).filter(g => g.items.length > 0);
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">📍 Puestos</div>
          <div className="page-desc">{puestosConStats.length} puestos definidos</div>
        </div>
        <div style={{display:"flex",gap:".4rem",alignItems:"center"}}>
          <button className={`btn btn-sm ${vistaAgrupada?"btn-cyan":"btn-ghost"}`} onClick={()=>setVistaAgrupada(v=>!v)} title="Vista agrupada por tipo">⊞ Agrupar</button>
          <button className={`btn btn-sm ${ordenAlfa?"btn-cyan":"btn-ghost"}`} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={onNuevoPuesto}>+ Nuevo puesto</button>
        </div>
      </div>

      {/* Búsqueda de puestos */}
      <div style={{ marginBottom:".65rem", display:"flex", alignItems:"center", gap:".5rem" }}>
        <input className="inp" placeholder="🔍 Buscar puesto…" value={busqPuesto}
          onChange={e => setBusqPuesto(e.target.value)}
          style={{ maxWidth:280, fontSize:"var(--fs-base)" }} />
        {busqPuesto && (
          <button className="btn btn-ghost btn-sm" onClick={() => setBusqPuesto("")}>✕</button>
        )}
        <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginLeft:".25rem" }}>
          {puestosFiltrados.length}/{puestosConStats.length}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {vistaAgrupada ? (
          puestosPorTipo.map(({ tipo, items }) => {
            const collapsed = colapsadosTipo[tipo] ?? false;
            const cobTotal = items.reduce((s, p) => s + p.totalAsignados, 0);
            const necTotal = items.reduce((s, p) => s + (p.necesarios || 0), 0);
            const pctGrupo = necTotal > 0 ? Math.round((cobTotal / necTotal) * 100) : 0;
            const colorGrupo = pctGrupo >= 80 ? "var(--green)" : pctGrupo >= 50 ? "var(--amber)" : "var(--red)";
            return (
              <div key={tipo} style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${colorGrupo}28` }}>
                <button
                  onClick={() => toggleTipo(tipo)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: ".65rem",
                    padding: ".55rem .85rem", background: `${colorGrupo}08`, border: "none",
                    cursor: "pointer", textAlign: "left",
                    borderBottom: collapsed ? "none" : `1px solid ${colorGrupo}18` }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700,
                    fontSize: "var(--fs-base)", color: colorGrupo, flex: 1 }}>
                    {tipo}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                    color: colorGrupo, fontWeight: 700, padding: ".1rem .5rem",
                    borderRadius: 20, background: `${colorGrupo}18`, border: `1px solid ${colorGrupo}30` }}>
                    {cobTotal}/{necTotal} · {items.length} puestos
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                    color: "var(--text-dim)", flexShrink: 0,
                    transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    transition: "transform .18s" }}>▼</span>
                </button>
                {!collapsed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".5rem",
                    padding: ".5rem", background: "var(--surface)" }}>
                    {items.map(p => <PuestoCard key={p.id} p={p} locs={locs} matPorLoc={matPorLoc}
                      onFichaPuesto={onFichaPuesto} onFichaVol={onFichaVol}
                      onEditPuesto={onEditPuesto} onDeletePuesto={onDeletePuesto} />)}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          puestosFiltrados.map(p => (
            <PuestoCard key={p.id} p={p} locs={locs} matPorLoc={matPorLoc}
              onFichaPuesto={onFichaPuesto} onFichaVol={onFichaVol}
              onEditPuesto={onEditPuesto} onDeletePuesto={onDeletePuesto} />
          ))
        )}
      </div>
    </>
  );
}

function PuestoCard({ p, locs, matPorLoc, onFichaPuesto, onFichaVol, onEditPuesto, onDeletePuesto }) {
          const pct = Math.min(p.coberturaConf, 100);
          const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
          return (
            <div key={p.id} className="card" style={{ padding: "1rem", cursor: "pointer" }}
              onClick={() => onFichaPuesto(p)}
              title="Click para ver ficha del puesto">
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                {/* Kinetik: icono pill de cobertura */}
                <div className="item-icon-pill" style={{ "--pill-color": color, marginTop: ".1rem" }}>
                  <span style={{ fontSize: "var(--fs-md)" }}>📍</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "var(--fs-md)" }}>{p.nombre}</span>
                    <span className="badge badge-cyan">{p.tipo}</span>
                    {p.localizacionId && (
                      <>
                        <span className="badge badge-gold" title="Vinculado a localización maestra">📍 Vinculado</span>
                        {(() => {
                          const loc = locs.find(l => l.id === p.localizacionId);
                          const items = loc ? (matPorLoc[loc.nombre] || []) : [];
                          if (!items.length) return null;
                          return (
                            <span
                              onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"logistica",subtab:"material"}})); }}
                              title="Ver material asignado en Logística"
                              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                                color: "var(--cyan)", background: "var(--cyan-dim)",
                                padding: ".1rem .4rem", borderRadius: 4, whiteSpace: "nowrap",
                                cursor:"pointer", border:"1px solid rgba(34,211,238,.2)" }}>
                              📦 {items.length} mat. →
                            </span>
                          );
                        })()}
                      </>
                    )}
                    {p.distancias.map(d => (
                      <span key={d} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: "0.1rem 0.35rem", borderRadius: 3, background: "rgba(34,211,238,0.08)", color: DIST_COLORS[d] || "var(--text-muted)", border: `1px solid ${DIST_COLORS[d] || "var(--border)"}33` }}>{d}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "1.25rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                    <span className="mono text-xs text-muted">🕐 {p.horaInicio} – {p.horaFin}</span>
                    <span className="mono text-xs" style={{ color }}>👤 {p.confirmados}/{p.necesarios} confirmados · {p.totalAsignados} asignados</span>
                    <span className="mono text-xs" style={{ color: "var(--green)" }}>✓ {p.confirmados} confirmados</span>
                  </div>
                  <div className="prog-bar" style={{ marginBottom: "0.4rem" }}>
                    <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  {p.notas && <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", fontStyle: "italic" }}>{p.notas}</div>}
                  {p.voluntariosAsignados.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.5rem" }}>
                      {p.voluntariosAsignados.map(v => (
                        <span key={v.id}
                          onClick={e => { e.stopPropagation(); onFichaVol && onFichaVol(v); }}
                          style={{ fontSize: "var(--fs-sm)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: "0.15rem 0.45rem", color: v.estado === "confirmado" ? "var(--green)" : "var(--text-muted)" }}>
                          {(v.nombre || "V").split(" ")[0]} {(v.nombre || "").split(" ")[1]?.[0] || ""}.
                        </span>
                      ))}
                    </div>
                  )}
                  {/* ── Material asignado desde Logística ─────────────── */}
                  {(() => {
                    const loc = locs.find(l => l.id === p.localizacionId);
                    const items = loc ? (matPorLoc[loc.nombre] || []) : [];
                    if (!items.length) return null;
                    return (
                      <div style={{ marginTop: "0.6rem", padding: "0.5rem 0.65rem",
                        background: "var(--surface2)", borderRadius: 8,
                        border: "1px solid rgba(34,211,238,0.15)",
                        borderLeft: "2px solid var(--cyan)" }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", marginBottom: "0.3rem" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                            color: "var(--cyan)", fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: ".04em" }}>
                            📦 Material asignado ({items.length})
                          </span>
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",
                              { detail: { block: "logistica", subtab: "material" } }))}
                            style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)",
                              padding: ".1rem .35rem", borderRadius: 3, cursor: "pointer",
                              border: "1px solid rgba(34,211,238,.25)",
                              background: "rgba(34,211,238,.08)", color: "var(--cyan)" }}>
                            Ver en Logística →
                          </button>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem" }}>
                          {items.map((item, i) => (
                            <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                              padding: ".15rem .45rem", borderRadius: 4,
                              background: "var(--surface)", border: "1px solid var(--border)",
                              color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                              {item.nombre}
                              <span style={{ color: "var(--cyan)", fontWeight: 700, marginLeft: ".25rem" }}>
                                ×{item.cantidad} {item.unidad}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost" style={{ padding: "0.28rem 0.45rem", fontSize: "var(--fs-sm)" }} onClick={() => onEditPuesto(p)} aria-label="Editar">✏️</button>
                  <button className="btn btn-red" style={{ padding: "0.28rem 0.45rem", fontSize: "var(--fs-sm)" }} onClick={() => onDeletePuesto(p.id)} aria-label="Cerrar">✕</button>
                </div>
              </div>
            </div>
          );
}


// Exports
export { TabPuestos };
export { PuestoCard };
