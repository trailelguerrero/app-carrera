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
function TabPuestos({ puestosConStats, voluntarios, locs, matPorLoc = {}, onUpdatePuesto, onDeletePuesto, onNuevoPuesto, onEditPuesto, onFichaPuesto, onFichaVol, onAddVoluntario, onDesasignarVol, onReasignarVol }) {
  const [ordenAlfa, setOrdenAlfa]     = useState(false);
  const [busqPuesto, setBusqPuesto]   = useState("");
  const [vistaAgrupada, setVistaAgrupada] = useState(false);
  const [colapsadosTipo, setColapsadosTipo] = useState({});

  // ── Filtros nuevos ────────────────────────────────────────────────────────
  const [filtroCobertura, setFiltroCobertura] = useState("todos");   // todos | completo | parcial | vacio | exceso
  const [filtroTipos, setFiltroTipos]         = useState([]);        // multi-select tipos
  const [filtroDistancias, setFiltroDistancias] = useState([]);      // multi-select distancias
  const [filtroGps, setFiltroGps]             = useState("todos");   // todos | con | sin

  const toggleTipo = (tipo) => setColapsadosTipo(prev => ({ ...prev, [tipo]: !prev[tipo] }));

  // Tipos presentes (dinámico, incluye personalizados)
  const tiposDisponibles = useMemo(
    () => [...new Set(puestosConStats.map(p => p.tipo || "Sin tipo"))].sort((a, b) => a.localeCompare(b, "es")),
    [puestosConStats]
  );

  // Stats globales para pills de cobertura
  const statsCobertura = useMemo(() => {
    let completo = 0, parcial = 0, vacio = 0, exceso = 0;
    puestosConStats.forEach(p => {
      const pct = p.necesarios > 0 ? (p.confirmados / p.necesarios) * 100 : 0;
      if (p.confirmados === 0) vacio++;
      else if (pct >= 100) completo++;
      else parcial++;
      if (p.confirmados > p.necesarios) exceso++;
    });
    return { completo, parcial, vacio, exceso };
  }, [puestosConStats]);

  // Pipeline de filtrado
  const puestosOrdenados = useMemo(() => {
    const base = ordenAlfa
      ? [...puestosConStats].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"))
      : puestosConStats;

    return base.filter(p => {
      // búsqueda texto
      if (busqPuesto.trim() && !p.nombre.toLowerCase().includes(busqPuesto.trim().toLowerCase())) return false;
      // cobertura
      if (filtroCobertura !== "todos") {
        const pct = p.necesarios > 0 ? (p.confirmados / p.necesarios) * 100 : 0;
        if (filtroCobertura === "completo"  && pct < 100)                                     return false;
        if (filtroCobertura === "parcial"   && (p.confirmados === 0 || pct >= 100))           return false;
        if (filtroCobertura === "vacio"     && p.confirmados > 0)                             return false;
        if (filtroCobertura === "exceso"    && p.confirmados <= p.necesarios)                 return false;
      }
      // tipos
      if (filtroTipos.length > 0 && !filtroTipos.includes(p.tipo || "Sin tipo")) return false;
      // distancias
      if (filtroDistancias.length > 0) {
        const distP = p.distancias || [];
        if (!filtroDistancias.some(d => distP.includes(d))) return false;
      }
      // GPS
      if (filtroGps === "con" && (p.lat == null || p.lng == null)) return false;
      if (filtroGps === "sin" && p.lat != null && p.lng != null)   return false;
      return true;
    });
  }, [puestosConStats, ordenAlfa, busqPuesto, filtroCobertura, filtroTipos, filtroDistancias, filtroGps]);

  // Agrupado por tipo (usa puestosOrdenados ya filtrados)
  const tiposUnicos = [...new Set(puestosOrdenados.map(p => p.tipo || "Sin tipo"))];
  const puestosPorTipo = tiposUnicos.map(tipo => ({
    tipo,
    items: puestosOrdenados.filter(p => (p.tipo || "Sin tipo") === tipo),
  })).filter(g => g.items.length > 0);

  const hayFiltrosActivos = filtroCobertura !== "todos" || filtroTipos.length > 0 || filtroDistancias.length > 0 || filtroGps !== "todos" || busqPuesto.trim();
  const limpiarFiltros = () => {
    setBusqPuesto(""); setFiltroCobertura("todos");
    setFiltroTipos([]); setFiltroDistancias([]); setFiltroGps("todos");
  };

  // Pill style helper
  const pillStyle = (active) => ({
    padding: ".2rem .55rem", borderRadius: 5, cursor: "pointer",
    fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
    border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`,
    background: active ? "var(--cyan-dim)" : "var(--surface)",
    color: active ? "var(--cyan)" : "var(--text-muted)",
    transition: "all .12s",
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">📍 Puestos</div>
          <div className="page-desc">{puestosOrdenados.length}/{puestosConStats.length} puestos · click para abrir ficha</div>
        </div>
        <div style={{display:"flex",gap:".4rem",alignItems:"center"}}>
          <button className={`btn btn-sm ${vistaAgrupada?"btn-cyan":"btn-ghost"}`} onClick={()=>setVistaAgrupada(v=>!v)} title="Vista agrupada por tipo">⊞ Agrupar</button>
          <button className={`btn btn-sm ${ordenAlfa?"btn-cyan":"btn-ghost"}`} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={onNuevoPuesto}>+ Nuevo puesto</button>
        </div>
      </div>

      {/* ── Barra de filtros ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: ".85rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>

        {/* Búsqueda */}
        <input className="inp" placeholder="🔍 Buscar puesto…" value={busqPuesto}
          onChange={e => setBusqPuesto(e.target.value)}
          style={{ maxWidth: 320, fontSize: "var(--fs-base)" }} />

        {/* Pills primera fila: cobertura + acciones */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem", alignItems: "center" }}>
          {[
            { id: "todos",    label: "Todos",     count: puestosConStats.length,       color: "var(--text-muted)", bg: "rgba(255,255,255,.08)" },
            { id: "completo", label: "✅ Completos",  count: statsCobertura.completo,  color: "var(--green)",       bg: "rgba(52,211,153,.15)" },
            { id: "parcial",  label: "⚡ Parciales",  count: statsCobertura.parcial,   color: "var(--amber)",       bg: "rgba(251,191,36,.15)" },
            { id: "vacio",    label: "🔴 Vacíos",     count: statsCobertura.vacio,     color: "var(--red)",         bg: "rgba(248,113,113,.15)" },
          ].map(({ id, label, count, color, bg }) => (
            <button key={id}
              className={`filter-pill${filtroCobertura === id ? " active" : ""}`}
              onClick={() => setFiltroCobertura(id)}>
              {label}
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                color: filtroCobertura === id ? color : "var(--text-dim)",
                background: filtroCobertura === id ? bg : "transparent",
                borderRadius: 10, padding: "0 .3rem", marginLeft: ".15rem",
                minWidth: 16, display: "inline-block", textAlign: "center", transition: "all .15s",
              }}>{count}</span>
            </button>
          ))}
          {statsCobertura.exceso > 0 && (
            <button
              className={`filter-pill${filtroCobertura === "exceso" ? " active" : ""}`}
              onClick={() => setFiltroCobertura("exceso")}>
              ⚠️ Exceso
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                color: filtroCobertura === "exceso" ? "var(--amber)" : "var(--text-dim)",
                background: filtroCobertura === "exceso" ? "rgba(251,191,36,.15)" : "transparent",
                borderRadius: 10, padding: "0 .3rem", marginLeft: ".15rem",
                minWidth: 16, display: "inline-block", textAlign: "center",
              }}>{statsCobertura.exceso}</span>
            </button>
          )}

          {hayFiltrosActivos && (
            <button className="filter-pill" onClick={limpiarFiltros}
              style={{ color: "var(--red)", borderColor: "rgba(248,113,113,0.3)" }}>
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Panel filtros avanzados: tipo + distancia + gps */}
        <div style={{
          padding: ".75rem .85rem", borderRadius: 8,
          background: "var(--surface2)", border: "1px solid var(--border)",
          display: "flex", flexDirection: "column", gap: ".6rem",
        }}>

          {/* Tipo de puesto */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: ".65rem", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 700, minWidth: 80, paddingTop: ".2rem" }}>
              📍 Tipo
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem" }}>
              {tiposDisponibles.map(t => {
                const active = filtroTipos.includes(t);
                return (
                  <button key={t}
                    onClick={() => setFiltroTipos(prev => active ? prev.filter(x => x !== t) : [...prev, t])}
                    style={pillStyle(active)}>
                    {t}
                    <span style={{
                      marginLeft: ".3rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                      color: active ? "var(--cyan)" : "var(--text-dim)",
                      background: active ? "rgba(34,211,238,.15)" : "transparent",
                      borderRadius: 10, padding: "0 .25rem",
                    }}>
                      {puestosConStats.filter(p => (p.tipo || "Sin tipo") === t).length}
                    </span>
                  </button>
                );
              })}
              {filtroTipos.length > 0 && (
                <button onClick={() => setFiltroTipos([])}
                  style={{ padding: ".2rem .45rem", borderRadius: 5, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", border: "1px solid rgba(248,113,113,.3)", background: "transparent", color: "var(--red)" }}>✕</button>
              )}
            </div>
          </div>

          {/* Distancia */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: ".65rem", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 700, minWidth: 80, paddingTop: ".2rem" }}>
              🏃 Distancia
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem" }}>
              {["TG7", "TG13", "TG25", "Todas"].map(d => {
                const active = filtroDistancias.includes(d);
                const distColors = { TG7: "#22d3ee", TG13: "#a78bfa", TG25: "#34d399", Todas: "#fbbf24" };
                const dc = distColors[d] || "var(--cyan)";
                return (
                  <button key={d}
                    onClick={() => setFiltroDistancias(prev => active ? prev.filter(x => x !== d) : [...prev, d])}
                    style={{
                      padding: ".2rem .55rem", borderRadius: 5, cursor: "pointer",
                      fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                      border: `1px solid ${active ? dc : "var(--border)"}`,
                      background: active ? `${dc}18` : "var(--surface)",
                      color: active ? dc : "var(--text-muted)",
                      transition: "all .12s",
                    }}>
                    {d}
                  </button>
                );
              })}
              {filtroDistancias.length > 0 && (
                <button onClick={() => setFiltroDistancias([])}
                  style={{ padding: ".2rem .45rem", borderRadius: 5, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", border: "1px solid rgba(248,113,113,.3)", background: "transparent", color: "var(--red)" }}>✕</button>
              )}
            </div>
          </div>

          {/* GPS */}
          <div style={{ display: "flex", alignItems: "center", gap: ".65rem", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 700, minWidth: 80 }}>
              🗺️ GPS
            </span>
            <div style={{ display: "flex", gap: ".3rem" }}>
              {[
                ["todos", "Todos",    puestosConStats.length],
                ["con",   "Con GPS",  puestosConStats.filter(p => p.lat != null && p.lng != null).length],
                ["sin",   "Sin GPS",  puestosConStats.filter(p => p.lat == null || p.lng == null).length],
              ].map(([v, lbl, count]) => {
                const active = filtroGps === v;
                return (
                  <button key={v} onClick={() => setFiltroGps(v)}
                    style={{ ...pillStyle(active), display: "flex", alignItems: "center", gap: ".3rem" }}>
                    {lbl}
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                      color: active ? "var(--cyan)" : "var(--text-dim)",
                      background: active ? "rgba(34,211,238,.15)" : "transparent",
                      borderRadius: 10, padding: "0 .25rem",
                    }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
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
                  <div className="item-grid" style={{ padding: ".65rem", background: "var(--surface)" }}>
                    {items.map(p => <PuestoCard key={p.id} p={p} locs={locs} matPorLoc={matPorLoc}
                      onFichaPuesto={onFichaPuesto} onFichaVol={onFichaVol}
                      onEditPuesto={onEditPuesto} onDeletePuesto={onDeletePuesto} onAddVoluntario={onAddVoluntario}
                      onDesasignarVol={onDesasignarVol} onReasignarVol={onReasignarVol} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="item-grid">
          {puestosOrdenados.map(p => (
            <PuestoCard key={p.id} p={p} locs={locs} matPorLoc={matPorLoc}
              onFichaPuesto={onFichaPuesto} onFichaVol={onFichaVol}
              onEditPuesto={onEditPuesto} onDeletePuesto={onDeletePuesto} onAddVoluntario={onAddVoluntario}
              onDesasignarVol={onDesasignarVol} onReasignarVol={onReasignarVol} />
          ))}
        </div>
      )}
    </>
  );
}

function PuestoCard({ p, locs, matPorLoc, onFichaPuesto, onFichaVol, onEditPuesto, onDeletePuesto, onAddVoluntario, onDesasignarVol, onReasignarVol }) {
  const pct   = Math.min(p.coberturaConf, 100);
  const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
  const deficit = Math.max(0, p.necesarios - p.confirmados);
  const loc  = locs.find(l => l.id === p.localizacionId);
  const matItems = loc ? (matPorLoc[loc.nombre] || []) : [];
  const conf = p.confirmados;
  const pend = p.totalAsignados - p.confirmados;

  return (
    <div className="item-card" style={{ "--item-accent": color, cursor: "pointer" }}
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
                style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: "var(--fs-xs)", fontFamily: "var(--font-mono)" }}>
                <span
                  onClick={e => { e.stopPropagation(); onFichaVol && onFichaVol(v); }}
                  style={{ display: "flex", alignItems: "center", gap: ".35rem", flex: 1, cursor: onFichaVol ? "pointer" : "default", minWidth: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: v.estado === "confirmado" ? "var(--green)" : v.estado === "pendiente" ? "var(--amber)" : "var(--text-dim)" }} />
                  <span style={{ color: "var(--text)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[v.nombre, v.apellidos].filter(Boolean).join(" ") || "Sin nombre"}
                  </span>
                  <span style={{ color: "var(--text-dim)", fontSize: "var(--fs-xs)", flexShrink: 0 }}>{v.estado}</span>
                </span>
                {/* Botones rápidos desasignar / reasignar */}
                <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: ".18rem", flexShrink: 0 }}>
                  {onReasignarVol && (
                    <button
                      title="Cambiar puesto"
                      onClick={e => { e.stopPropagation(); onReasignarVol(v); }}
                      style={{
                        padding: "0 .25rem", borderRadius: 3, cursor: "pointer",
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", fontWeight: 700,
                        background: "rgba(34,211,238,.08)", color: "var(--cyan)",
                        border: "1px solid rgba(34,211,238,.2)", lineHeight: "1.4",
                      }}>🔄</button>
                  )}
                  {onDesasignarVol && (
                    <button
                      title="Desasignar de este puesto"
                      onClick={e => { e.stopPropagation(); onDesasignarVol(v.id); }}
                      style={{
                        padding: "0 .25rem", borderRadius: 3, cursor: "pointer",
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", fontWeight: 700,
                        background: "rgba(248,113,113,.08)", color: "var(--red)",
                        border: "1px solid rgba(248,113,113,.2)", lineHeight: "1.4",
                      }}>✕</button>
                  )}
                </div>
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
