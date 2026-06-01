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
import { blockCls as cls } from "@/lib/blockStyles";
import { DIST_COLORS } from "@/constants/voluntariosConstants";

// ─── TAB PUESTOS ──────────────────────────────────────────────────────────────
function TabPuestos({ puestosConStats, voluntarios, locs, matPorLoc = {}, onUpdatePuesto, onDeletePuesto, onNuevoPuesto, onEditPuesto, onFichaPuesto, onFichaVol, onAddVoluntario }) {
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

      {vistaAgrupada ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {puestosPorTipo.map(({ tipo, items }) => {
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: ".65rem",
                    padding: ".65rem", background: "var(--surface)" }}>
                    {items.map(p => <PuestoCard key={p.id} p={p} locs={locs} matPorLoc={matPorLoc}
                      onFichaPuesto={onFichaPuesto} onFichaVol={onFichaVol}
                      onEditPuesto={onEditPuesto} onDeletePuesto={onDeletePuesto} onAddVoluntario={onAddVoluntario} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: ".65rem" }}>
          {puestosFiltrados.map(p => (
            <PuestoCard key={p.id} p={p} locs={locs} matPorLoc={matPorLoc}
              onFichaPuesto={onFichaPuesto} onFichaVol={onFichaVol}
              onEditPuesto={onEditPuesto} onDeletePuesto={onDeletePuesto} onAddVoluntario={onAddVoluntario} />
          ))}
        </div>
      )}
    </>
  );
}

function PuestoCard({ p, locs, matPorLoc, onFichaPuesto, onFichaVol, onEditPuesto, onDeletePuesto, onAddVoluntario }) {
  const pct   = Math.min(p.coberturaConf, 100);
  const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
  const deficit = Math.max(0, p.necesarios - p.confirmados);
  const loc  = locs.find(l => l.id === p.localizacionId);
  const matItems = loc ? (matPorLoc[loc.nombre] || []) : [];
  const conf = p.confirmados;
  const pend = p.totalAsignados - p.confirmados;

  return (
    <div className="card" style={{ borderLeft: `3px solid ${color}`, cursor: "pointer" }}
      onClick={() => onFichaPuesto(p)}
      title="Click para ver ficha del puesto">
      {/* ── Cabecera: icono + nombre + badges + botones ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: ".4rem" }}>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          <span style={{ fontSize: "var(--fs-lg)" }}>📍</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>{p.nombre}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color, textTransform: "uppercase", letterSpacing: ".06em" }}>
              {p.tipo}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: ".35rem", alignItems: "center", flexShrink: 0 }}>
          {/* Badge cobertura */}
          {(() => {
            if (!p.totalAsignados && !matItems.length) return null;
            const tieneMat = matItems.length > 0;
            const tieneVol = p.totalAsignados > 0;
            const cob = !tieneMat && !tieneVol ? null
              : tieneMat && tieneVol ? "completa"
              : tieneMat ? "sin_voluntario" : "sin_material";
            if (!cob) return null;
            const cfg = {
              completa:       { label: "✅ Completa",       bg: "rgba(34,197,94,.12)",  clr: "var(--green)", brd: "rgba(34,197,94,.3)" },
              sin_voluntario: { label: "⚠️ Sin voluntario", bg: "rgba(251,191,36,.12)", clr: "var(--amber)", brd: "rgba(251,191,36,.3)" },
              sin_material:   { label: "📦 Sin material",   bg: "rgba(251,191,36,.12)", clr: "var(--amber)", brd: "rgba(251,191,36,.3)" },
            }[cob];
            return (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", padding: ".1rem .4rem", borderRadius: 20, background: cfg.bg, color: cfg.clr, border: `1px solid ${cfg.brd}`, whiteSpace: "nowrap" }}>
                {cfg.label}
              </span>
            );
          })()}
          <button className="btn btn-sm btn-red"
            onClick={e => { e.stopPropagation(); onDeletePuesto(p.id); }}
            style={{ flexShrink: 0, padding: ".15rem .4rem", fontSize: "var(--fs-sm)" }}>✕</button>
        </div>
      </div>

      {/* ── Horario + distancias ── */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: ".3rem" }}>
        🕐 {p.horaInicio} – {p.horaFin}
        {(p.distancias || []).map(d => (
          <span key={d} style={{ marginLeft: ".4rem", padding: "0 .3rem", borderRadius: 3, background: "rgba(34,211,238,0.08)", color: DIST_COLORS[d] || "var(--text-muted)", border: `1px solid ${DIST_COLORS[d] || "var(--border)"}33` }}>{d}</span>
        ))}
      </div>

      {/* ── GPS (si tiene) ── */}
      {p.lat != null && p.lng != null && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginBottom: ".2rem" }}>
          📌 {Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}
        </div>
      )}

      {/* ── Notas ── */}
      {p.notas && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", fontStyle: "italic", marginTop: ".2rem" }}>{p.notas}</div>}

      {/* ── Sección voluntarios ── */}
      <div style={{ marginTop: ".45rem", borderTop: "1px solid var(--border)", paddingTop: ".4rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: ".3rem", display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap" }}>
          👥 <span style={{ fontWeight: 700 }}>{p.totalAsignados} voluntario{p.totalAsignados !== 1 ? "s" : ""}</span>
          {conf > 0 && <span style={{ color: "var(--green)", fontWeight: 700 }}>· {conf} ✓</span>}
          {pend > 0 && <span style={{ color: "var(--amber)" }}>· {pend} pend.</span>}
          <span style={{ color, fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)" }}>
            · {conf}/{p.necesarios} necesarios
          </span>
          {/* Botón añadir voluntario si faltan */}
          {deficit > 0 && onAddVoluntario && (
            <button
              onClick={e => { e.stopPropagation(); onAddVoluntario(p.id); }}
              style={{ display: "inline-flex", alignItems: "center", gap: ".25rem",
                padding: ".1rem .4rem", borderRadius: 4, cursor: "pointer",
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                background: pct < 50 ? "var(--red-dim)" : "var(--amber-dim)",
                color: pct < 50 ? "var(--red)" : "var(--amber)",
                border: `1px solid ${pct < 50 ? "rgba(248,113,113,.25)" : "rgba(251,191,36,.25)"}`,
                marginLeft: "auto", flexShrink: 0 }}>
              + {deficit} plaza{deficit !== 1 ? "s" : ""}
            </button>
          )}
          {/* Botón editar */}
          <button
            onClick={e => { e.stopPropagation(); onEditPuesto(p); }}
            style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", padding: ".06rem .3rem",
              borderRadius: 3, border: "1px solid rgba(34,211,238,.3)",
              background: "rgba(34,211,238,.1)", color: "var(--cyan)", cursor: "pointer",
              marginLeft: deficit > 0 ? undefined : "auto", flexShrink: 0 }}>
            Editar →
          </button>
        </div>
        {/* Lista de voluntarios asignados */}
        {p.voluntariosAsignados.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: ".18rem" }}>
            {p.voluntariosAsignados.slice(0, 4).map((v, i) => (
              <div key={i}
                onClick={e => { e.stopPropagation(); onFichaVol && onFichaVol(v); }}
                style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: "var(--fs-xs)", fontFamily: "var(--font-mono)", cursor: onFichaVol ? "pointer" : "default" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: v.estado === "confirmado" ? "var(--green)" : v.estado === "pendiente" ? "var(--amber)" : "var(--text-dim)" }} />
                <span style={{ color: "var(--text)", fontWeight: 600 }}>
                  {(v.nombre || "V").split(" ")[0]} {(v.nombre || "").split(" ")[1]?.[0] || ""}.
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: "var(--fs-xs)" }}>{v.estado}</span>
              </div>
            ))}
            {p.voluntariosAsignados.length > 4 && (
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-dim)", fontFamily: "var(--font-mono)", paddingLeft: ".6rem" }}>
                +{p.voluntariosAsignados.length - 4} más…
              </div>
            )}
          </div>
        )}
        {p.totalAsignados === 0 && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
            Sin voluntarios asignados aún
          </div>
        )}
      </div>
    </div>
  );
}


// Exports
export { TabPuestos };
export { PuestoCard };
