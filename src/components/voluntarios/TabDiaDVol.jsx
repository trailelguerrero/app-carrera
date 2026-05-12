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

// ─── TAB DÍA D ────────────────────────────────────────────────────────────────
function TabDiaD({ puestosConStats, voluntarios, onUpdateVol, diasHastaEvento = 999 }) {
  const [vista, setVista]                   = useState("puesto"); // "puesto" | "nombre"
  const [puestoSeleccionado, setPuestoSeleccionado] = useState("todos");
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [busquedaDiaD, setBusquedaDiaD]     = useState("");

  const marcarPresencia = (id, presente) => {
    const horaLlegada = presente ? new Date().toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' }) : null;
    onUpdateVol(id, { enPuesto: presente, ...(presente && horaLlegada ? { horaLlegada } : { horaLlegada: null }) });
    setUltimoGuardado(id);
    setTimeout(() => setUltimoGuardado(null), 1200);
  };

  const marcarAusente = (id) => {
    onUpdateVol(id, { estado: "ausente", enPuesto: false, horaLlegada: null });
    setUltimoGuardado(id);
    setTimeout(() => setUltimoGuardado(null), 1200);
  };

  // Detectar voluntarios confirmados que deberían estar en su puesto pero no han llegado
  const ahora = new Date();
  const horaActual = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
  const volsRetrasados = voluntarios.filter(v => {
    if (v.estado !== "confirmado" || v.enPuesto) return false;
    const puesto = (puestosConStats || []).find(p => p.id === v.puestoId);
    if (!puesto || !puesto.horaInicio) return false;
    // Resaltar si han pasado más de 30 min desde el inicio del puesto
    const [h, m] = puesto.horaInicio.split(":").map(Number);
    const minutosInicio = h * 60 + m;
    const minutosActual = ahora.getHours() * 60 + ahora.getMinutes();
    return minutosActual > minutosInicio + 30;
  });

  const volsBase = voluntarios.filter(v => v.estado === "confirmado" || v.estado === "pendiente" || v.estado === "ausente");

  // Voluntarios filtrados por búsqueda y puesto (para vista por nombre)
  const volsFiltrados = (() => {
    const base = puestoSeleccionado === "todos"
      ? volsBase
      : volsBase.filter(v => String(v.puestoId) === puestoSeleccionado);
    if (!busquedaDiaD.trim()) return base;
    const q = busquedaDiaD.toLowerCase();
    return base.filter(v =>
      (v.nombre + " " + (v.apellidos || "")).toLowerCase().includes(q) ||
      (v.telefono || "").includes(q)
    );
  })();

  // Datos agrupados por puesto (para vista por puesto)
  const puestosAgrupados = puestosConStats.map(p => {
    const vols = volsBase.filter(v => String(v.puestoId) === String(p.id));
    const presentes   = vols.filter(v => v.enPuesto).length;
    const confirmados = vols.filter(v => v.estado === "confirmado").length;
    return { puesto: p, vols, presentes, confirmados };
  }).filter(g => g.vols.length > 0)
    .sort((a, b) => (a.puesto.horaInicio || "").localeCompare(b.puesto.horaInicio || ""));

  // Sin puesto asignado
  const sinPuesto = volsBase.filter(v => !v.puestoId ||
    !puestosConStats.find(p => String(p.id) === String(v.puestoId)));

  const presentes = voluntarios.filter(v => v.enPuesto && v.estado === "confirmado").length;
  const totalConf = voluntarios.filter(v => v.estado === "confirmado").length;

  // Fila individual de voluntario reutilizable
  const FilaVol = ({ v, mostrarPuesto = false }) => {
    const puesto = puestosConStats.find(p => p.id === v.puestoId);
    return (
      <div className={cls("checklist-row", v.enPuesto ? "presente" : "")}
        style={{ borderLeft: v.estado === "pendiente" ? "3px solid var(--amber)" : undefined }}>
        <button onClick={() => marcarPresencia(v.id, !v.enPuesto)}
          style={{ width: 24, height: 24, borderRadius: 5, flexShrink: 0,
            border: `2px solid ${v.enPuesto ? "var(--green)" : ultimoGuardado===v.id ? "var(--cyan)" : "var(--border)"}`,
            background: v.enPuesto ? "var(--green)" : "transparent",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
            boxShadow: ultimoGuardado===v.id ? "0 0 8px rgba(34,211,238,0.4)" : "none" }}>
          {v.enPuesto && <span style={{ color: "#000", fontSize: "var(--fs-base)", fontWeight: 700 }}>✓</span>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "var(--fs-base)",
            color: v.enPuesto ? "var(--green)" : v.estado === "pendiente" ? "var(--amber)" : "var(--text)" }}>
            {v.nombre}{v.apellidos ? (" " + v.apellidos) : ""}
            {v.estado === "pendiente" && (
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                color:"var(--amber)", marginLeft:".4rem" }}>PENDIENTE</span>
            )}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
            {mostrarPuesto && puesto ? `${puesto.nombre} · ` : ""}{v.telefono || "Sin teléfono"}
          </div>
          {(v.telefonoEmergencia || v.contactoEmergencia) && (
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--red)" }}>
              🚨 {v.telefonoEmergencia || v.contactoEmergencia}
            </div>
          )}
        </div>
        {v.talla && <span className="badge badge-cyan">{v.talla}</span>}
        {v.coche && <span style={{ fontSize: "var(--fs-base)" }} title="Tiene coche">🚗</span>}
        {v.estado === "ausente" && (
          <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
            color:"var(--orange)", background:"var(--orange-dim)",
            border:"1px solid var(--orange-border)", borderRadius:4,
            padding:"0 .35rem", flexShrink:0 }}>
            ⚠ Ausente
          </span>
        )}
        {v.enPuesto && (
          <span title={"En puesto" + (v.horaLlegada ? " · " + v.horaLlegada : "")}
            style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
              color:"var(--green)", background:"rgba(52,211,153,.1)",
              border:"1px solid rgba(52,211,153,.25)", borderRadius:4,
              padding:"0 .35rem", flexShrink:0 }}>
            📍{v.horaLlegada || ""}
          </span>
        )}
        {v.camisetaEntregada && (
          <span title="Camiseta entregada"
            style={{ fontSize:"var(--fs-base)", flexShrink:0 }}>🎽</span>
        )}
        {!v.enPuesto && v.estado !== "ausente" && (
          <button
            title="Marcar como ausente (no ha aparecido)"
            onClick={e => { e.stopPropagation(); marcarAusente(v.id); }}
            style={{ background:"none", border:"1px solid var(--orange-border)", borderRadius:5,
              color:"var(--orange)", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              padding:".1rem .4rem", cursor:"pointer", flexShrink:0, opacity:.7 }}>
            ⚠
          </button>
        )}
        {v.telefono && (
          <a href={`tel:${v.telefono}`}
            style={{ fontSize: "var(--fs-base)", color: "var(--cyan)", textDecoration: "none", flexShrink: 0 }}
            title={`Llamar a ${v.nombre}`}>📞</a>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">🏁 Día de Carrera</div>
          <div className="page-desc">Checklist de asistencia · {diasHastaEvento >= 0 ? `${diasHastaEvento} días para el evento` : "¡Día de carrera!"}</div>
        </div>
        <div style={{ display:"flex", gap:".5rem" }}>

      {/* Alerta voluntarios retrasados */}
      {volsRetrasados.length > 0 && (
        <div style={{ background:"var(--orange-dim)", border:"1px solid var(--orange-border)",
          borderRadius:8, padding:".5rem .85rem", marginBottom:".65rem",
          display:"flex", alignItems:"center", gap:".65rem" }}>
          <span style={{ fontSize:"1.1rem" }}>⚠️</span>
          <div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700, color:"var(--orange)" }}>
              {volsRetrasados.length} voluntario{volsRetrasados.length > 1 ? "s" : ""} con más de 30 min de retraso
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", lineHeight:1.5 }}>
              {volsRetrasados.map(v => v.nombre?.split(" ")[0] || "V").join(", ")}
            </div>
          </div>
        </div>
      )}
          <div className="mono text-xs" style={{ color: "var(--green)", background: "var(--green-dim)",
            border: "1px solid rgba(52,211,153,0.2)", borderRadius: 6, padding: "0.4rem 0.75rem" }}>
            ✓ {presentes} / {totalConf} en su puesto
          </div>
          <div className="mono text-xs" style={{ color: "var(--cyan)", background: "var(--cyan-dim)",
            border: "1px solid rgba(34,211,238,0.2)", borderRadius: 6, padding: "0.4rem 0.75rem" }}>
            👥 {totalConf} confirmados
          </div>
        </div>
      </div>

      {/* Toggle vista + búsqueda */}
      <div style={{ display: "flex", gap: ".5rem", marginBottom: ".6rem", alignItems: "center" }}>
        <input
          value={busquedaDiaD}
          onChange={e => setBusquedaDiaD(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          style={{ flex: 1, padding: ".45rem .75rem", borderRadius: 8,
            border: "1px solid var(--border)", background: "var(--surface2)",
            color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", outline: "none" }}
        />
        <div style={{ display: "flex", gap: ".3rem", flexShrink: 0 }}>
          <button
            onClick={() => setVista("puesto")}
            className={"filter-pill" + (vista === "puesto" ? " active" : "")}
            style={{ whiteSpace: "nowrap" }}>
            📍 Por puesto
          </button>
          <button
            onClick={() => setVista("nombre")}
            className={"filter-pill" + (vista === "nombre" ? " active" : "")}
            style={{ whiteSpace: "nowrap" }}>
            👤 Por nombre
          </button>
        </div>
      </div>

      {/* ── VISTA POR PUESTO ──────────────────────────────────────────────── */}
      {vista === "puesto" && (
        <>
          {puestosAgrupados.map(({ puesto: p, vols, presentes: pres, confirmados: conf }) => {
            const colorBorde = pres >= conf && conf > 0 ? "var(--green)" : pres > 0 ? "var(--amber)" : "var(--red)";
            const volsFiltPuesto = busquedaDiaD.trim()
              ? vols.filter(v => {
                  const q = busquedaDiaD.toLowerCase();
                  return (v.nombre + " " + (v.apellidos || "")).toLowerCase().includes(q) ||
                    (v.telefono || "").includes(q);
                })
              : vols;
            if (busquedaDiaD.trim() && volsFiltPuesto.length === 0) return null;
            return (
              <div key={p.id} className="card" style={{ marginBottom: ".6rem", padding: 0, overflow: "hidden" }}>
                {/* Cabecera del puesto */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: ".6rem .85rem", borderBottom: "1px solid var(--border)",
                  borderLeft: `3px solid ${colorBorde}` }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>{p.nombre}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                      {p.horaInicio}–{p.horaFin}
                      {p.necesarios ? ` · ${p.necesarios} necesarios` : ""}
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 800,
                    color: colorBorde, flexShrink: 0 }}>
                    {pres}/{conf}
                  </span>
                </div>
                {/* Voluntarios del puesto */}
                <div style={{ padding: "0 .1rem" }}>
                  {volsFiltPuesto.map(v => <FilaVol key={v.id} v={v} mostrarPuesto={false} />)}
                </div>
              </div>
            );
          })}
          {/* Voluntarios sin puesto asignado */}
          {sinPuesto.length > 0 && !busquedaDiaD.trim() && (
            <div className="card" style={{ marginBottom: ".6rem", padding: 0, overflow: "hidden" }}>
              <div style={{ padding: ".6rem .85rem", borderBottom: "1px solid var(--border)",
                borderLeft: "3px solid var(--text-muted)" }}>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-base)", color: "var(--text-muted)" }}>Sin puesto asignado</div>
              </div>
              <div style={{ padding: "0 .1rem" }}>
                {sinPuesto.map(v => <FilaVol key={v.id} v={v} mostrarPuesto={false} />)}
              </div>
            </div>
          )}
          {puestosAgrupados.length === 0 && sinPuesto.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)" }}>
              Sin voluntarios confirmados ni pendientes
            </div>
          )}
        </>
      )}

      {/* ── VISTA POR NOMBRE ─────────────────────────────────────────────── */}
      {vista === "nombre" && (
        <>
          {/* Filtro por puesto en vista nombre */}
          <div className="filter-pill-group" style={{ marginBottom: "1rem" }}>
            <button className={"filter-pill" + (puestoSeleccionado === "todos" ? " active" : "")}
              onClick={() => setPuestoSeleccionado("todos")}>Todos</button>
            {puestosConStats.map(p => (
              <button key={p.id}
                className={"filter-pill" + (puestoSeleccionado === String(p.id) ? " active" : "")}
                onClick={() => setPuestoSeleccionado(String(p.id))}>
                {p.nombre}
              </button>
            ))}
          </div>
          <div className="card">
            {volsFiltrados.length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)",
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)" }}>
                No hay voluntarios para este filtro
              </div>
            )}
            {volsFiltrados.map(v => <FilaVol key={v.id} v={v} mostrarPuesto={true} />)}
          </div>
        </>
      )}
    </>
  );
}


// Exports
export { TabDiaD };
