// [VOL-01] Vista Kanban de voluntarios
// Modo A: por estado (Pendiente / Confirmado / Cancelado / En Puesto) — original
// Modo B: por puestos — columna por puesto, swimlanes con cobertura semáforo
// Desktop: HTML5 DnD nativo · Móvil: menú "Mover a →" por tap
import { useState, useRef, useMemo, useCallback, memo } from "react";
import { ESTADOS, estadoColor, estadoBg } from "@/constants/voluntariosConstants";

// ── Columnas modo estado ───────────────────────────────────────────────────────
const COLUMNAS_ESTADO = [
  { id: "pendiente",  label: "Pendiente",  icon: "⏳", color: "var(--amber)",  bg: "rgba(251,191,36,.07)",  border: "rgba(251,191,36,.25)"  },
  { id: "dudoso",     label: "Dudoso",     icon: "❓", color: "var(--violet)", bg: "rgba(167,139,250,.07)", border: "rgba(167,139,250,.25)" },
  { id: "confirmado", label: "Confirmado", icon: "✅", color: "var(--green)",  bg: "rgba(52,211,153,.07)",  border: "rgba(52,211,153,.25)"  },
  // [VOL-AUDIT-2] "Ausente" tenía su propia columna lógica (ver columnaDeVol) pero no
  // existía como columna real -> esos voluntarios desaparecían sin dejar rastro en el Kanban.
  { id: "ausente",    label: "Ausente",    icon: "⚠️", color: "var(--orange)", bg: "rgba(251,146,60,.07)",  border: "rgba(251,146,60,.25)"  },
  { id: "cancelado",  label: "Cancelado",  icon: "✕",  color: "var(--red)",    bg: "rgba(248,113,113,.06)", border: "rgba(248,113,113,.25)" },
  { id: "en-puesto",  label: "En Puesto",  icon: "📍", color: "var(--cyan)",   bg: "rgba(34,211,238,.07)",  border: "rgba(34,211,238,.25)"  },
];

// Devuelve la columna lógica de un voluntario (modo estado)
function columnaDeVol(v) {
  if (v.enPuesto) return "en-puesto";
  return v.estado || "pendiente";
}

// Color semáforo según cobertura
function colorCobertura(pct) {
  if (pct >= 80) return "var(--green)";
  if (pct >= 50) return "var(--amber)";
  return "var(--red)";
}

// ── Tarjeta de voluntario (memo para evitar re-renders en DnD) ────────────────
// densidad: "compacta" | "expandida"
// Compacta (defecto): nombre + contexto (puesto/estado) + iconos inline
// Expandida: + teléfono completo, hora de incorporación, notas
const KanbanCard = memo(function KanbanCard({
  v, puesto, col, allColumnas, modoEstado,
  onDragStart, onDragEnd, onFicha, onMoverA,
  menuAbierto, setMenuAbierto,
  densidad = "compacta",
}) {
  const nombre = [v.nombre, v.apellidos].filter(Boolean).join(" ") || "Sin nombre";
  const isMenuOpen = menuAbierto === v.id;
  const esExpandida = densidad === "expandida";

  return (
    <div
      className={`kanban-card${esExpandida ? " kanban-card-exp" : ""}`}
      draggable
      onDragStart={e => onDragStart(e, v.id)}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (menuAbierto) { setMenuAbierto(null); return; }
        onFicha(v);
      }}
      style={{ borderLeft: `3px solid ${col.color}` }}
    >
      {/* ── Fila principal: nombre + iconos compactos ── */}
      <div style={{ display: "flex", alignItems: "center", gap: ".35rem", paddingRight: "1.4rem" }}>
        <div className="kanban-card-name" style={{ flex: 1, paddingRight: 0 }}>{nombre}</div>
        {/* Iconos siempre visibles en compacto */}
        {v.talla && (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "var(--cyan)", background: "rgba(34,211,238,.1)",
            border: "1px solid rgba(34,211,238,.2)", borderRadius: 4,
            padding: "0 .3rem", flexShrink: 0,
          }}>
            {v.talla}
          </span>
        )}
        {v.coche && <span title="Tiene vehículo" style={{ fontSize: ".75rem", flexShrink: 0 }}>🚗</span>}
        {v.grupoId && <span title={`Grupo: ${v.grupoNombre || "sin nombre"}`} style={{ fontSize: ".75rem", flexShrink: 0 }}>👥</span>}
        {v.telefono && (
          <a
            href={`tel:${v.telefono}`}
            onClick={e => e.stopPropagation()}
            title={`Llamar: ${v.telefono}`}
            style={{ color: "var(--cyan)", textDecoration: "none", fontSize: ".8rem", flexShrink: 0 }}
          >
            📞
          </a>
        )}
      </div>

      {/* ── Meta compacta: puesto/estado ── */}
      <div className="kanban-card-meta" style={{ marginTop: ".18rem" }}>
        {modoEstado
          ? puesto
            ? <span>📍 {puesto.nombre}</span>
            : <span style={{ color: "var(--text-dim)" }}>Sin puesto</span>
          : <span style={{ color: col.color, fontWeight: 700 }}>{col.icon} {col.label}</span>
        }
        {puesto?.horaInicio && modoEstado && (
          <span style={{ color: "var(--text-dim)" }}>· {puesto.horaInicio}</span>
        )}
      </div>

      {/* ── Detalles expandidos ── */}
      {esExpandida && (
        <div style={{
          marginTop: ".4rem", paddingTop: ".4rem",
          borderTop: "1px solid var(--border)",
          display: "flex", flexDirection: "column", gap: ".2rem",
          fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)",
        }}>
          {v.telefono && (
            <a
              href={`tel:${v.telefono}`}
              onClick={e => e.stopPropagation()}
              style={{ color: "var(--cyan)", textDecoration: "none", display: "flex", alignItems: "center", gap: ".3rem" }}
            >
              📞 {v.telefono}
            </a>
          )}
          {puesto?.horaInicio && (
            <span>⏰ Incorporación: {puesto.horaInicio}{puesto.horaFin ? `–${puesto.horaFin}` : ""}</span>
          )}
          {v.notas && (
            <span style={{ fontStyle: "italic", color: "var(--text-dim)" }}>💬 {v.notas}</span>
          )}
          {v.email && (
            <a
              href={`mailto:${v.email}`}
              onClick={e => e.stopPropagation()}
              style={{ color: "var(--text-muted)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              ✉ {v.email}
            </a>
          )}
        </div>
      )}

      {/* Botón menú "Mover a" */}
      <button
        className="kanban-menu-btn"
        title="Mover a otra columna"
        onClick={e => {
          e.stopPropagation();
          setMenuAbierto(isMenuOpen ? null : v.id);
        }}
        aria-label="Opciones de estado"
        aria-expanded={isMenuOpen}
      >
        ···
      </button>

      {/* Dropdown opciones */}
      {isMenuOpen && (
        <div className="kanban-dropdown" onClick={e => e.stopPropagation()}>
          <div style={{
            padding: ".3rem .75rem .2rem",
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "var(--text-dim)", borderBottom: "1px solid var(--border)",
          }}>
            Mover a →
          </div>
          {allColumnas.filter(c => c.id !== col.id).map(dest => (
            <button
              key={dest.id}
              className="kanban-dropdown-item"
              onClick={() => onMoverA(v.id, dest.id)}
            >
              <span style={{ marginRight: ".4rem" }}>{dest.icon}</span>
              <span style={{ color: dest.color }}>{dest.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// ── Columna modo estado ────────────────────────────────────────────────────────
const KanbanColumnaEstado = memo(function KanbanColumnaEstado({
  col, items, puestos, dropTarget,
  onDragOver, onDrop, onDragLeave,
  onDragStart, onDragEnd,
  onFicha, onMoverA,
  menuAbierto, setMenuAbierto,
  densidad,
}) {
  const isTarget = dropTarget === col.id;
  return (
    <div
      className={`kanban-col${isTarget ? " drop-active" : ""}`}
      onDragOver={e => onDragOver(e, col.id)}
      onDrop={e => onDrop(e, col.id)}
      onDragLeave={onDragLeave}
    >
      <div className="kanban-col-header" style={{ background: col.bg }}>
        <span style={{ fontSize: ".9rem" }}>{col.icon}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--fs-sm)", color: col.color }}>
          {col.label}
        </span>
        <span className="kanban-col-count" style={{ color: col.color, background: `${col.color}18`, border: `1px solid ${col.border}` }}>
          {items.length}
        </span>
      </div>
      <div className="kanban-cards">
        {items.length === 0 && <div className="kanban-empty">Sin voluntarios</div>}
        {items.map(v => {
          const puesto = puestos.find(p => p.id === v.puestoId);
          return (
            <KanbanCard
              key={v.id}
              v={v} puesto={puesto} col={col}
              allColumnas={COLUMNAS_ESTADO}
              modoEstado
              onDragStart={onDragStart} onDragEnd={onDragEnd}
              onFicha={onFicha} onMoverA={onMoverA}
              menuAbierto={menuAbierto} setMenuAbierto={setMenuAbierto}
              densidad={densidad}
            />
          );
        })}
      </div>
    </div>
  );
});

// ── Columna modo puestos ───────────────────────────────────────────────────────
const KanbanColumnaPuesto = memo(function KanbanColumnaPuesto({
  puesto, items, dropTarget,
  onDragOver, onDrop, onDragLeave,
  onDragStart, onDragEnd,
  onFicha, onMoverA,
  menuAbierto, setMenuAbierto,
  expandido, onToggle,
  densidad,
}) {
  const colId = puesto ? String(puesto.id) : "__sin_puesto__";
  const isTarget = dropTarget === colId;

  // Calcular cobertura para el header
  const necesarios = puesto?.necesarios || 0;
  const confirmados = items.filter(v => v.estado === "confirmado").length;
  const pct = necesarios > 0 ? Math.round((confirmados / necesarios) * 100) : 0;
  const colorCob = colorCobertura(pct);

  // Columnas de estado disponibles para "Mover a" en modo puestos
  const columnasEstadoPuesto = COLUMNAS_ESTADO;

  // Items ordenados: confirmados arriba, luego pendientes, cancelados al fondo
  const ordenEstado = { "confirmado": 0, "en-puesto": 0, "pendiente": 1, "dudoso": 1, "ausente": 2, "cancelado": 3 };
  const itemsOrdenados = [...items].sort((a, b) =>
    (ordenEstado[a.estado] ?? 1) - (ordenEstado[b.estado] ?? 1)
  );

  const label = puesto ? puesto.nombre : "Sin asignar";
  const icon = puesto ? "📍" : "❓";
  const color = puesto ? colorCob : "var(--text-dim)";
  const bg = puesto ? `${colorCob}08` : "rgba(255,255,255,.04)";

  return (
    <div
      className={`kanban-col kanban-col-puesto${isTarget ? " drop-active" : ""}`}
      onDragOver={e => onDragOver(e, colId)}
      onDrop={e => onDrop(e, colId)}
      onDragLeave={onDragLeave}
    >
      {/* Header del puesto con semáforo */}
      <button
        className="kanban-col-header kanban-col-header-btn"
        style={{ background: bg, cursor: "pointer", width: "100%", border: "none", textAlign: "left" }}
        onClick={onToggle}
        title={expandido ? "Colapsar" : "Expandir"}
      >
        <span style={{ fontSize: ".85rem" }}>{icon}</span>
        <span style={{
          fontFamily: "var(--font-mono)", fontWeight: 700,
          fontSize: "var(--fs-sm)", color,
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {label}
        </span>
        <span className="kanban-col-count" style={{
          color, background: `${color}18`,
          border: `1px solid ${color}30`,
          flexShrink: 0,
        }}>
          {items.length}
        </span>
        {puesto && (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color, fontWeight: 700, flexShrink: 0,
            padding: ".1rem .4rem", borderRadius: 10,
            background: `${colorCob}14`, border: `1px solid ${colorCob}25`,
          }}>
            {pct}%
          </span>
        )}
        <span style={{
          color: "var(--text-dim)", fontSize: "var(--fs-xs)", flexShrink: 0,
          transform: expandido ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform .15s",
        }}>▼</span>
      </button>

      {/* Barra de cobertura */}
      {puesto && (
        <div style={{ height: 3, background: "var(--border)", borderRadius: 0, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${Math.min(pct, 100)}%`,
            background: colorCob, transition: "width .3s",
          }} />
        </div>
      )}

      {/* Tarjetas (colapsables) */}
      {expandido && (
        <div className="kanban-cards">
          {itemsOrdenados.length === 0 && <div className="kanban-empty">Sin voluntarios</div>}
          {itemsOrdenados.map(v => {
            const col = COLUMNAS_ESTADO.find(c => c.id === columnaDeVol(v)) || COLUMNAS_ESTADO[0];
            return (
              <KanbanCard
                key={v.id}
                v={v} puesto={puesto} col={col}
                allColumnas={columnasEstadoPuesto}
                modoEstado={false}
                onDragStart={onDragStart} onDragEnd={onDragEnd}
                onFicha={onFicha}
                onMoverA={(volId, estadoId) => onMoverA(volId, estadoId)}
                menuAbierto={menuAbierto} setMenuAbierto={setMenuAbierto}
                densidad={densidad}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

// ── Componente principal ───────────────────────────────────────────────────────
export function TabKanbanVol({ voluntarios, puestos, onUpdate, onFicha }) {
  // Modo de vista: "estado" | "puesto"
  const [modo, setModo] = useState("estado");

  // DnD estado
  const dragId = useRef(null);
  const [dropTarget, setDropTarget] = useState(null);

  // Menú abierto en móvil
  const [menuAbierto, setMenuAbierto] = useState(null);

  // Densidad de tarjetas: "compacta" | "expandida"
  const [densidad, setDensidad] = useState("compacta");

  // Puestos expandidos en modo puesto (todos expandidos por defecto si ≤8 puestos)
  const initExpandidos = useMemo(() => {
    const m = {};
    if (puestos.length <= 8) {
      puestos.forEach(p => { m[String(p.id)] = true; });
      m["__sin_puesto__"] = true;
    }
    return m;
  }, [puestos]);
  const [expandidos, setExpandidos] = useState(initExpandidos);

  const toggleExpandido = useCallback((colId) => {
    setExpandidos(prev => ({ ...prev, [colId]: !prev[colId] }));
  }, []);

  const expandirTodos = useCallback(() => {
    const m = {};
    puestos.forEach(p => { m[String(p.id)] = true; });
    m["__sin_puesto__"] = true;
    setExpandidos(m);
  }, [puestos]);

  const colapsarTodos = useCallback(() => {
    setExpandidos({});
  }, []);

  // ── Mover voluntario ────────────────────────────────────────────────────────
  const moverA = useCallback((volId, targetId) => {
    // En modo estado: targetId = id de columna estado
    // En modo puesto: targetId = String(puesto.id) | "__sin_puesto__"
    if (modo === "estado") {
      if (targetId === "en-puesto") {
        onUpdate(volId, { enPuesto: true });
      } else {
        const vol = voluntarios.find(v => v.id === volId);
        const patch = { estado: targetId };
        if (vol?.enPuesto) patch.enPuesto = false;
        onUpdate(volId, patch);
      }
    } else {
      // modo puesto: mover estado
      if (targetId === "en-puesto") {
        onUpdate(volId, { enPuesto: true });
      } else {
        const vol = voluntarios.find(v => v.id === volId);
        const patch = { estado: targetId };
        if (vol?.enPuesto) patch.enPuesto = false;
        onUpdate(volId, patch);
      }
    }
    setMenuAbierto(null);
  }, [modo, voluntarios, onUpdate]);

  // ── DnD handlers ───────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, volId) => {
    dragId.current = volId;
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(colId);
  }, []);

  const handleDrop = useCallback((e, colId) => {
    e.preventDefault();
    if (!dragId.current) return;

    if (modo === "estado") {
      moverA(dragId.current, colId);
    } else {
      // En modo puesto: drop sobre columna de puesto → asignar puestoId
      const volId = dragId.current;
      const nuevoPuestoId = colId === "__sin_puesto__" ? null : (isNaN(colId) ? colId : Number(colId));
      onUpdate(volId, { puestoId: nuevoPuestoId });

      // [GRUPOS] Si pertenece a un grupo, ofrecer mover también a sus compañeros.
      const vol = voluntarios.find(v => v.id === volId);
      if (vol?.grupoId) {
        const companeros = voluntarios.filter(v => v.grupoId === vol.grupoId && v.id !== volId);
        if (companeros.length > 0) {
          const nombrePuesto = nuevoPuestoId != null ? (puestos.find(p => p.id === nuevoPuestoId)?.nombre || "este puesto") : null;
          const mensaje = nombrePuesto
            ? `${vol.nombre} forma parte del grupo "${vol.grupoNombre || "sin nombre"}" (${companeros.length} más). ¿Mover también a todo el grupo a «${nombrePuesto}»?`
            : `${vol.nombre} forma parte del grupo "${vol.grupoNombre || "sin nombre"}" (${companeros.length} más). ¿Desasignar también a todo el grupo?`;
          if (window.confirm(mensaje)) {
            companeros.forEach(c => onUpdate(c.id, { puestoId: nuevoPuestoId }));
          }
        }
      }
    }

    dragId.current = null;
    setDropTarget(null);
  }, [modo, moverA, onUpdate, voluntarios, puestos]);

  const handleDragEnd = useCallback(() => {
    dragId.current = null;
    setDropTarget(null);
  }, []);

  // ── Datos modo puesto ───────────────────────────────────────────────────────
  const columnasPuesto = useMemo(() => {
    const cols = puestos.map(p => ({
      ...p,
      colId: String(p.id),
      items: voluntarios.filter(v => String(v.puestoId) === String(p.id)),
    }));
    // Ordenar por cobertura ascendente (primero los más críticos)
    cols.sort((a, b) => {
      const pctA = a.necesarios > 0
        ? (a.items.filter(v => v.estado === "confirmado").length / a.necesarios)
        : 1;
      const pctB = b.necesarios > 0
        ? (b.items.filter(v => v.estado === "confirmado").length / b.necesarios)
        : 1;
      return pctA - pctB;
    });
    // Columna "Sin asignar" al final
    const sinPuesto = voluntarios.filter(v => !v.puestoId || !puestos.find(p => String(p.id) === String(v.puestoId)));
    cols.push({ id: "__sin_puesto__", colId: "__sin_puesto__", nombre: "Sin asignar", necesarios: 0, items: sinPuesto });
    return cols;
  }, [puestos, voluntarios]);

  // Stats resumen modo puesto
  const statsPuesto = useMemo(() => {
    const total = voluntarios.length;
    const confirmados = voluntarios.filter(v => v.estado === "confirmado").length;
    const sinPuesto = voluntarios.filter(v => !v.puestoId || !puestos.find(p => String(p.id) === String(v.puestoId))).length;
    const puestosOk = puestos.filter(p => {
      const conf = voluntarios.filter(v => String(v.puestoId) === String(p.id) && v.estado === "confirmado").length;
      return p.necesarios > 0 && conf >= p.necesarios;
    }).length;
    return { total, confirmados, sinPuesto, puestosOk, totalPuestos: puestos.length };
  }, [voluntarios, puestos]);

  return (
    <>
      <style>{`
        .kanban-modo-toggle {
          display: inline-flex;
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: .65rem;
        }
        .kanban-modo-btn {
          background: transparent;
          border: none;
          padding: .3rem .75rem;
          font-family: var(--font-mono);
          font-size: var(--fs-xs);
          font-weight: 700;
          cursor: pointer;
          color: var(--text-muted);
          transition: background .12s, color .12s;
          white-space: nowrap;
        }
        .kanban-modo-btn.active {
          background: var(--cyan);
          color: #0f172a;
        }
        .kanban-modo-btn + .kanban-modo-btn {
          border-left: 1px solid var(--border);
        }
        .kanban-toolbar {
          display: flex;
          align-items: center;
          gap: .65rem;
          margin-bottom: .65rem;
          flex-wrap: wrap;
        }
        .kanban-stats-pills {
          display: flex;
          gap: .35rem;
          flex-wrap: wrap;
        }
        .kanban-stat-pill {
          font-family: var(--font-mono);
          font-size: var(--fs-xs);
          font-weight: 700;
          padding: .15rem .5rem;
          border-radius: 20px;
          white-space: nowrap;
        }
        .kanban-board {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: .75rem;
          align-items: start;
        }
        .kanban-board-puesto {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: .65rem;
          align-items: start;
        }
        @media (max-width: 1100px) {
          .kanban-board-puesto { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 900px) {
          .kanban-board { grid-template-columns: repeat(2, 1fr); }
          .kanban-board-puesto { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .kanban-board, .kanban-board-puesto { grid-template-columns: 1fr; }
        }
        .kanban-col {
          border-radius: 10px;
          border: 1.5px solid var(--border);
          background: var(--surface);
          min-height: 80px;
          transition: border-color .15s, background .15s;
        }
        .kanban-col-puesto {
          border-radius: 10px;
          border: 1.5px solid var(--border);
          background: var(--surface);
          transition: border-color .15s, background .15s;
        }
        .kanban-col.drop-active,
        .kanban-col-puesto.drop-active {
          border-color: var(--cyan);
          background: rgba(34,211,238,.04);
        }
        .kanban-col-header {
          display: flex;
          align-items: center;
          gap: .5rem;
          padding: .55rem .75rem;
          border-bottom: 1px solid var(--border);
          border-radius: 10px 10px 0 0;
        }
        .kanban-col-header-btn {
          border-radius: 10px 10px 0 0;
          transition: background .12s;
        }
        .kanban-col-header-btn:hover {
          filter: brightness(1.08);
        }
        .kanban-col-count {
          margin-left: auto;
          font-family: var(--font-mono);
          font-size: var(--fs-xs);
          font-weight: 700;
          padding: .1rem .45rem;
          border-radius: 20px;
        }
        .kanban-cards {
          display: flex;
          flex-direction: column;
          gap: .4rem;
          padding: .5rem .45rem;
          min-height: 40px;
          max-height: 420px;
          overflow-y: auto;
        }
        .kanban-cards::-webkit-scrollbar { width: 4px; }
        .kanban-cards::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        .kanban-card {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: .5rem .6rem;
          cursor: grab;
          position: relative;
          transition: box-shadow .12s, transform .12s, border-color .12s;
          user-select: none;
        }
        .kanban-card:active { cursor: grabbing; }
        .kanban-card:hover {
          box-shadow: 0 2px 12px rgba(0,0,0,.18);
          border-color: var(--cyan);
          transform: translateY(-1px);
        }
        .kanban-card-exp {
          background: color-mix(in srgb, var(--surface2) 85%, var(--cyan) 15%);
        }
        .kanban-card-name {
          font-weight: 700;
          font-size: .82rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: .18rem;
          padding-right: 1.4rem;
        }
        .kanban-card-meta {
          font-family: var(--font-mono);
          font-size: var(--fs-xs);
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: .1rem;
        }
        .kanban-menu-btn {
          position: absolute;
          top: .3rem;
          right: .3rem;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-dim);
          font-size: .75rem;
          padding: .1rem .3rem;
          border-radius: 4px;
          line-height: 1;
          transition: background .1s, color .1s;
        }
        .kanban-menu-btn:hover {
          background: var(--surface);
          color: var(--text);
        }
        .kanban-dropdown {
          position: absolute;
          top: 1.7rem;
          right: .3rem;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,.25);
          z-index: 50;
          min-width: 148px;
          overflow: hidden;
        }
        .kanban-dropdown-item {
          display: block;
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          padding: .4rem .7rem;
          font-size: var(--fs-sm);
          cursor: pointer;
          transition: background .1s;
          white-space: nowrap;
        }
        .kanban-dropdown-item:hover { background: var(--surface); }
        .kanban-empty {
          padding: .5rem;
          font-family: var(--font-mono);
          font-size: var(--fs-xs);
          color: var(--text-dim);
          text-align: center;
        }
        @media (hover: none) {
          .kanban-card { cursor: pointer; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="kanban-toolbar">
        {/* Toggle modo */}
        <div className="kanban-modo-toggle">
          <button
            className={`kanban-modo-btn${modo === "estado" ? " active" : ""}`}
            onClick={() => setModo("estado")}
            title="Agrupar por estado del voluntario"
          >
            ☰ Por estado
          </button>
          <button
            className={`kanban-modo-btn${modo === "puesto" ? " active" : ""}`}
            onClick={() => setModo("puesto")}
            title="Agrupar por puesto — ver cobertura por puesto"
          >
            📍 Por puesto
          </button>
        </div>

        {/* Stats rápidas modo puesto */}
        {modo === "puesto" && (
          <div className="kanban-stats-pills">
            <span className="kanban-stat-pill" style={{ background: "rgba(52,211,153,.12)", color: "var(--green)", border: "1px solid rgba(52,211,153,.25)" }}>
              ✓ {statsPuesto.confirmados}/{statsPuesto.total}
            </span>
            <span className="kanban-stat-pill" style={{ background: "rgba(34,211,238,.1)", color: "var(--cyan)", border: "1px solid rgba(34,211,238,.2)" }}>
              📍 {statsPuesto.puestosOk}/{statsPuesto.totalPuestos} puestos OK
            </span>
            {statsPuesto.sinPuesto > 0 && (
              <span className="kanban-stat-pill" style={{ background: "rgba(251,191,36,.12)", color: "var(--amber)", border: "1px solid rgba(251,191,36,.25)" }}>
                ⚠ {statsPuesto.sinPuesto} sin puesto
              </span>
            )}
          </div>
        )}

        {/* Controles expandir/colapsar (solo modo puesto) */}
        {modo === "puesto" && (
          <div style={{ display: "flex", gap: ".35rem" }}>
            <button className="btn btn-ghost btn-sm" onClick={expandirTodos} title="Expandir todas las columnas">⊞</button>
            <button className="btn btn-ghost btn-sm" onClick={colapsarTodos} title="Colapsar todas las columnas">⊟</button>
          </div>
        )}

        {/* Toggle densidad tarjetas */}
        <div style={{ marginLeft: "auto", display: "inline-flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <button
            style={{
              background: densidad === "compacta" ? "var(--cyan)" : "transparent",
              color: densidad === "compacta" ? "#0f172a" : "var(--text-muted)",
              border: "none", padding: ".3rem .6rem",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
              cursor: "pointer", transition: "background .12s, color .12s",
            }}
            onClick={() => setDensidad("compacta")}
            title="Tarjetas compactas — nombre + iconos"
          >
            ▤ Compact
          </button>
          <button
            style={{
              background: densidad === "expandida" ? "var(--cyan)" : "transparent",
              color: densidad === "expandida" ? "#0f172a" : "var(--text-muted)",
              border: "none", borderLeft: "1px solid var(--border)", padding: ".3rem .6rem",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
              cursor: "pointer", transition: "background .12s, color .12s",
            }}
            onClick={() => setDensidad("expandida")}
            title="Tarjetas expandidas — teléfono, horario, notas"
          >
            ▦ Detalle
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", margin: "0 0 .6rem 0" }}>
        <span className="hide-mobile">Arrastra tarjetas entre columnas · </span>
        {modo === "puesto"
          ? "Arrastra para reasignar puesto · Usa ··· para cambiar estado"
          : "Pulsa ··· para mover desde móvil"
        }
        {" · "}Click en tarjeta para abrir ficha
      </p>

      {/* ── Modo estado ──────────────────────────────────────────────────────── */}
      {modo === "estado" && (
        <div className="kanban-board">
          {COLUMNAS_ESTADO.map(col => {
            const items = voluntarios.filter(v => columnaDeVol(v) === col.id);
            return (
              <KanbanColumnaEstado
                key={col.id}
                col={col} items={items} puestos={puestos}
                dropTarget={dropTarget}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={() => setDropTarget(null)}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onFicha={onFicha}
                onMoverA={moverA}
                menuAbierto={menuAbierto}
                setMenuAbierto={setMenuAbierto}
                densidad={densidad}
              />
            );
          })}
        </div>
      )}

      {/* ── Modo puesto ──────────────────────────────────────────────────────── */}
      {modo === "puesto" && (
        <div className="kanban-board-puesto">
          {columnasPuesto.map(col => {
            const esSinPuesto = col.id === "__sin_puesto__";
            const puestoObj = esSinPuesto ? null : puestos.find(p => String(p.id) === col.colId);
            return (
              <KanbanColumnaPuesto
                key={col.colId}
                puesto={puestoObj}
                items={col.items}
                dropTarget={dropTarget}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={() => setDropTarget(null)}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onFicha={onFicha}
                onMoverA={moverA}
                menuAbierto={menuAbierto}
                setMenuAbierto={setMenuAbierto}
                expandido={!!expandidos[col.colId]}
                onToggle={() => toggleExpandido(col.colId)}
                densidad={densidad}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
