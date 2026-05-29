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
  const [vista, setVista]                   = useState("puesto"); // "puesto" | "nombre" | "checkin"
  const [puestoSeleccionado, setPuestoSeleccionado] = useState("todos");
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [busquedaDiaD, setBusquedaDiaD]     = useState("");
  // Ref para enfocar el input de búsqueda en modo check-in
  const busquedaRef = useRef(null);

  // Enfocar búsqueda al entrar en modo check-in
  useEffect(() => {
    if (vista === "checkin" && busquedaRef.current) {
      busquedaRef.current.focus();
    }
  }, [vista]);

  const marcarPresencia = useCallback((id, presente) => {
    const horaLlegada = presente ? new Date().toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' }) : null;
    onUpdateVol(id, { enPuesto: presente, ...(presente && horaLlegada ? { horaLlegada } : { horaLlegada: null }) });
    setUltimoGuardado(id);
    setTimeout(() => setUltimoGuardado(null), 1200);
  }, [onUpdateVol]);

  const marcarAusente = useCallback((id) => {
    onUpdateVol(id, { estado: "ausente", enPuesto: false, horaLlegada: null });
    setUltimoGuardado(id);
    setTimeout(() => setUltimoGuardado(null), 1200);
  }, [onUpdateVol]);

  // ── Detección de retrasados ────────────────────────────────────────────────
  const volsRetrasados = useMemo(() => {
    const ahora = new Date();
    return voluntarios.filter(v => {
      if (v.estado !== "confirmado" || v.enPuesto) return false;
      const puesto = (puestosConStats || []).find(p => p.id === v.puestoId);
      if (!puesto || !puesto.horaInicio) return false;
      const [h, m] = puesto.horaInicio.split(":").map(Number);
      const minutosInicio = h * 60 + m;
      const minutosActual = ahora.getHours() * 60 + ahora.getMinutes();
      return minutosActual > minutosInicio + 30;
    });
  }, [voluntarios, puestosConStats]);

  const volsBase = useMemo(
    () => voluntarios.filter(v => v.estado === "confirmado" || v.estado === "pendiente" || v.estado === "ausente"),
    [voluntarios]
  );

  // ── Filtrado común (vistas por nombre y check-in) ──────────────────────────
  const volsFiltrados = useMemo(() => {
    const base = puestoSeleccionado === "todos"
      ? volsBase
      : volsBase.filter(v => String(v.puestoId) === puestoSeleccionado);
    if (!busquedaDiaD.trim()) return base;
    const q = busquedaDiaD.toLowerCase().replace(/\s/g, "");
    return base.filter(v =>
      (v.nombre + " " + (v.apellidos || "")).toLowerCase().includes(busquedaDiaD.toLowerCase()) ||
      (v.telefono || "").replace(/\s/g, "").includes(q)
    );
  }, [volsBase, busquedaDiaD, puestoSeleccionado]);

  // ── Vista check-in: todos ordenados por hora de puesto ────────────────────
  const volsCheckin = useMemo(() => {
    const q = busquedaDiaD.trim().toLowerCase().replace(/\s/g, "");
    const base = q
      ? volsBase.filter(v =>
          (v.nombre + " " + (v.apellidos || "")).toLowerCase().includes(busquedaDiaD.toLowerCase().trim()) ||
          (v.telefono || "").replace(/\s/g, "").includes(q)
        )
      : volsBase;

    return [...base].sort((a, b) => {
      // Primero los no marcados, luego los presentes, ausentes al final
      const prioA = a.enPuesto ? 1 : a.estado === "ausente" ? 2 : 0;
      const prioB = b.enPuesto ? 1 : b.estado === "ausente" ? 2 : 0;
      if (prioA !== prioB) return prioA - prioB;
      // Dentro del mismo grupo, ordenar por hora de puesto
      const pA = (puestosConStats || []).find(p => String(p.id) === String(a.puestoId));
      const pB = (puestosConStats || []).find(p => String(p.id) === String(b.puestoId));
      return (pA?.horaInicio || "99:99").localeCompare(pB?.horaInicio || "99:99");
    });
  }, [volsBase, busquedaDiaD, puestosConStats]);

  // ── Vista por puesto ───────────────────────────────────────────────────────
  const puestosAgrupados = useMemo(() =>
    puestosConStats.map(p => {
      const vols = volsBase.filter(v => String(v.puestoId) === String(p.id));
      const presentes   = vols.filter(v => v.enPuesto).length;
      const confirmados = vols.filter(v => v.estado === "confirmado").length;
      return { puesto: p, vols, presentes, confirmados };
    }).filter(g => g.vols.length > 0)
      .sort((a, b) => (a.puesto.horaInicio || "").localeCompare(b.puesto.horaInicio || "")),
    [puestosConStats, volsBase]
  );

  const sinPuesto = useMemo(
    () => volsBase.filter(v => !v.puestoId || !puestosConStats.find(p => String(p.id) === String(v.puestoId))),
    [volsBase, puestosConStats]
  );

  const presentes = useMemo(
    () => voluntarios.filter(v => v.enPuesto && v.estado === "confirmado").length,
    [voluntarios]
  );
  const totalConf = useMemo(
    () => voluntarios.filter(v => v.estado === "confirmado").length,
    [voluntarios]
  );

  // ── Fila normal (vistas por puesto / por nombre) ───────────────────────────
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
        {!v.enPuesto && v.horaSalida && (
          <span title={`Salida registrada a las ${v.horaSalida}`}
            style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              color:"var(--text-muted)", background:"var(--surface2)",
              border:"1px solid var(--border)", borderRadius:4,
              padding:"0 .35rem", flexShrink:0 }}>
            👋 {v.horaSalida}
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

  // ── Fila check-in compacta (modo check-in) ─────────────────────────────────
  const FilaCheckin = ({ v }) => {
    const puesto = (puestosConStats || []).find(p => String(p.id) === String(v.puestoId));
    const esRetrasado = volsRetrasados.some(r => r.id === v.id);
    const guardando = ultimoGuardado === v.id;

    return (
      <div
        style={{
          display: "flex", alignItems: "center", gap: ".65rem",
          padding: ".6rem .75rem",
          borderRadius: 10, marginBottom: ".35rem",
          border: `1px solid ${v.enPuesto ? "rgba(52,211,153,.35)" : v.estado === "ausente" ? "rgba(248,113,113,.3)" : esRetrasado ? "rgba(251,191,36,.35)" : "var(--border)"}`,
          background: v.enPuesto
            ? "rgba(52,211,153,.06)"
            : v.estado === "ausente"
              ? "rgba(248,113,113,.05)"
              : "var(--surface2)",
          transition: "all .15s",
          opacity: v.estado === "ausente" ? .65 : 1,
        }}
      >
        {/* Nombre + puesto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: ".9rem",
            color: v.enPuesto ? "var(--green)" : v.estado === "ausente" ? "var(--text-dim)" : "var(--text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {v.nombre}{v.apellidos ? " " + v.apellidos : ""}
            {esRetrasado && !v.enPuesto && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--amber)", marginLeft: ".4rem" }}>⚠ tarde</span>
            )}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: ".1rem" }}>
            {puesto && <span>📍 {puesto.nombre}{puesto.horaInicio ? ` · ${puesto.horaInicio}` : ""}</span>}
            {v.enPuesto && v.horaLlegada && <span style={{ color: "var(--green)", fontWeight: 700 }}>✓ {v.horaLlegada}</span>}
            {v.estado === "ausente" && <span style={{ color: "var(--orange)" }}>Ausente</span>}
          </div>
        </div>

        {/* Teléfono clickable */}
        {v.telefono && (
          <a
            href={`tel:${v.telefono}`}
            onClick={e => e.stopPropagation()}
            style={{ color: "var(--text-dim)", fontSize: "1.1rem", textDecoration: "none", flexShrink: 0 }}
            title={`Llamar: ${v.telefono}`}
          >
            📞
          </a>
        )}

        {/* Botón ⚠ ausente — solo si no está presente ni ausente ya */}
        {!v.enPuesto && v.estado !== "ausente" && (
          <button
            onClick={() => marcarAusente(v.id)}
            title="Marcar ausente"
            style={{
              background: "none", border: "1px solid var(--orange-border)", borderRadius: 6,
              color: "var(--orange)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
              padding: ".2rem .5rem", cursor: "pointer", flexShrink: 0,
            }}
          >
            ✗
          </button>
        )}

        {/* Botón principal: ✓ Llegó / Desmarcar */}
        {v.estado !== "ausente" && (
          <button
            onClick={() => marcarPresencia(v.id, !v.enPuesto)}
            style={{
              padding: ".4rem .9rem",
              borderRadius: 8, cursor: "pointer", flexShrink: 0,
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 800,
              border: "none",
              background: v.enPuesto
                ? "rgba(52,211,153,.15)"
                : guardando
                  ? "var(--cyan)"
                  : "var(--green)",
              color: v.enPuesto ? "var(--green)" : guardando ? "#0f172a" : "#0f172a",
              transition: "all .15s",
              minWidth: 72,
              boxShadow: guardando ? "0 0 12px rgba(34,211,238,.5)" : v.enPuesto ? "none" : "0 2px 8px rgba(52,211,153,.3)",
            }}
          >
            {v.enPuesto ? "✓ En puesto" : "✓ Llegó"}
          </button>
        )}
      </div>
    );
  };

  // ── Contadores para el header de check-in ─────────────────────────────────
  const pendientesCheckin = volsBase.filter(v => !v.enPuesto && v.estado !== "ausente").length;

  return (
    <>
      <style>{`
        .checkin-busqueda {
          font-size: 1rem !important;
          padding: .6rem .85rem !important;
        }
        .checkin-busqueda:focus {
          border-color: var(--cyan) !important;
          outline: none;
          box-shadow: 0 0 0 2px rgba(34,211,238,.15);
        }
        .vista-toggle {
          display: inline-flex;
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .vista-toggle-btn {
          background: transparent;
          border: none;
          padding: .3rem .65rem;
          font-family: var(--font-mono);
          font-size: var(--fs-xs);
          font-weight: 700;
          cursor: pointer;
          color: var(--text-muted);
          transition: background .12s, color .12s;
          white-space: nowrap;
        }
        .vista-toggle-btn.active {
          background: var(--cyan);
          color: #0f172a;
        }
        .vista-toggle-btn + .vista-toggle-btn {
          border-left: 1px solid var(--border);
        }
        .checkin-progress {
          height: 4px;
          background: var(--border);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: .65rem;
        }
        .checkin-progress-fill {
          height: 100%;
          background: var(--green);
          border-radius: 4px;
          transition: width .4s ease;
        }
      `}</style>

      <div className="page-header">
        <div>
          <div className="page-title">🏁 Día de Carrera</div>
          <div className="page-desc">Checklist de asistencia · {diasHastaEvento >= 0 ? `${diasHastaEvento} días para el evento` : "¡Día de carrera!"}</div>
        </div>
        <div style={{ display:"flex", gap:".5rem", flexWrap: "wrap", alignItems: "center" }}>

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

      {/* Toggle vistas + búsqueda */}
      <div style={{ display: "flex", gap: ".5rem", marginBottom: ".6rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          ref={busquedaRef}
          value={busquedaDiaD}
          onChange={e => setBusquedaDiaD(e.target.value)}
          placeholder={vista === "checkin" ? "🔍 Nombre o teléfono para marcar asistencia…" : "Buscar por nombre o teléfono…"}
          className={vista === "checkin" ? "inp checkin-busqueda" : "inp"}
          style={{ flex: 1, minWidth: 180,
            fontSize: vista === "checkin" ? "1rem" : undefined,
          }}
        />
        {busquedaDiaD && (
          <button
            onClick={() => setBusquedaDiaD("")}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem", padding: ".3rem" }}
            aria-label="Limpiar búsqueda"
          >✕</button>
        )}
        <div className="vista-toggle">
          <button
            className={"vista-toggle-btn" + (vista === "checkin" ? " active" : "")}
            onClick={() => setVista("checkin")}
            title="Vista check-in — optimizada para marcar asistencia rápidamente"
          >
            ✓ Check-in
          </button>
          <button
            className={"vista-toggle-btn" + (vista === "puesto" ? " active" : "")}
            onClick={() => setVista("puesto")}
            title="Ver voluntarios agrupados por puesto"
          >
            📍 Por puesto
          </button>
          <button
            className={"vista-toggle-btn" + (vista === "nombre" ? " active" : "")}
            onClick={() => setVista("nombre")}
            title="Ver todos los voluntarios por nombre"
          >
            👤 Por nombre
          </button>
        </div>
      </div>

      {/* ── VISTA CHECK-IN ────────────────────────────────────────────────── */}
      {vista === "checkin" && (
        <>
          {/* Barra de progreso */}
          {totalConf > 0 && (
            <div className="checkin-progress">
              <div className="checkin-progress-fill" style={{ width: `${Math.round(presentes / totalConf * 100)}%` }} />
            </div>
          )}

          {/* Resumen rápido */}
          <div style={{ display: "flex", gap: ".5rem", marginBottom: ".65rem", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
              padding: ".2rem .6rem", borderRadius: 20,
              background: "rgba(52,211,153,.1)", color: "var(--green)", border: "1px solid rgba(52,211,153,.25)" }}>
              ✓ {presentes} llegaron
            </span>
            {pendientesCheckin > 0 && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                padding: ".2rem .6rem", borderRadius: 20,
                background: "rgba(251,191,36,.1)", color: "var(--amber)", border: "1px solid rgba(251,191,36,.25)" }}>
                ⏳ {pendientesCheckin} pendientes
              </span>
            )}
            {voluntarios.filter(v => v.estado === "ausente").length > 0 && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                padding: ".2rem .6rem", borderRadius: 20,
                background: "rgba(248,113,113,.08)", color: "var(--red)", border: "1px solid rgba(248,113,113,.2)" }}>
                ✗ {voluntarios.filter(v => v.estado === "ausente").length} ausentes
              </span>
            )}
          </div>

          {/* Lista check-in */}
          {volsCheckin.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)" }}>
              {busquedaDiaD ? "Sin resultados para esta búsqueda" : "Sin voluntarios confirmados ni pendientes"}
            </div>
          )}
          {volsCheckin.map(v => <FilaCheckin key={v.id} v={v} />)}
        </>
      )}

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
