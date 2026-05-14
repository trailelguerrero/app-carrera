// [VOL-01] Vista Kanban de voluntarios por estado
// Desktop: HTML5 DnD nativo para arrastrar tarjetas entre columnas
// Móvil: menú "Mover a →" por tap (sin drag)
import { useState, useRef } from "react";
import { ESTADOS, estadoColor, estadoBg } from "@/constants/voluntariosConstants";

// Las 4 columnas del Kanban
const COLUMNAS = [
  {
    id: "pendiente",
    label: "Pendiente",
    icon: "⏳",
    color: "var(--amber)",
    bg: "rgba(251,191,36,.07)",
    border: "rgba(251,191,36,.25)",
  },
  {
    id: "confirmado",
    label: "Confirmado",
    icon: "✅",
    color: "var(--green)",
    bg: "rgba(52,211,153,.07)",
    border: "rgba(52,211,153,.25)",
  },
  {
    id: "cancelado",
    label: "Cancelado",
    icon: "✕",
    color: "var(--red)",
    bg: "rgba(248,113,113,.06)",
    border: "rgba(248,113,113,.25)",
  },
  {
    id: "en-puesto",
    label: "En Puesto",
    icon: "📍",
    color: "var(--cyan)",
    bg: "rgba(34,211,238,.07)",
    border: "rgba(34,211,238,.25)",
  },
];

// Devuelve la columna lógica de un voluntario
function columnaDeVol(v) {
  if (v.enPuesto) return "en-puesto";
  return v.estado || "pendiente";
}

export function TabKanbanVol({ voluntarios, puestos, onUpdate, onFicha }) {
  // ID de la tarjeta que se está arrastrando
  const dragId = useRef(null);
  // Columna sobre la que se está haciendo hover al arrastrar
  const [dropTarget, setDropTarget] = useState(null);
  // Menú abierto en móvil (ID del voluntario)
  const [menuAbierto, setMenuAbierto] = useState(null);

  // Mover un voluntario a otra columna
  function moverA(volId, columnaId) {
    if (columnaId === "en-puesto") {
      onUpdate(volId, { enPuesto: true });
    } else {
      // Si venía de en-puesto, quitar el flag
      const vol = voluntarios.find(v => v.id === volId);
      const patch = { estado: columnaId };
      if (vol?.enPuesto) patch.enPuesto = false;
      onUpdate(volId, patch);
    }
    setMenuAbierto(null);
  }

  // ── DnD handlers ──────────────────────────────────────────────
  function handleDragStart(e, volId) {
    dragId.current = volId;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, columnaId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(columnaId);
  }

  function handleDrop(e, columnaId) {
    e.preventDefault();
    if (dragId.current) moverA(dragId.current, columnaId);
    dragId.current = null;
    setDropTarget(null);
  }

  function handleDragEnd() {
    dragId.current = null;
    setDropTarget(null);
  }

  return (
    <>
      <style>{`
        .kanban-board {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: .75rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .kanban-board {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 560px) {
          .kanban-board {
            grid-template-columns: 1fr;
          }
        }
        .kanban-col {
          border-radius: 10px;
          border: 1.5px solid var(--border);
          background: var(--surface);
          min-height: 120px;
          transition: border-color .15s, background .15s;
        }
        .kanban-col.drop-active {
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
          gap: .45rem;
          padding: .55rem .5rem;
          min-height: 60px;
        }
        .kanban-card {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: .55rem .65rem;
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
        .kanban-card-name {
          font-weight: 700;
          font-size: .82rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: .18rem;
        }
        .kanban-card-meta {
          font-family: var(--font-mono);
          font-size: var(--fs-xs);
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: .1rem;
        }
        /* Botón de menú móvil */
        .kanban-menu-btn {
          position: absolute;
          top: .35rem;
          right: .35rem;
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
          top: 1.8rem;
          right: .35rem;
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
          padding: .45rem .75rem;
          font-size: var(--fs-sm);
          cursor: pointer;
          transition: background .1s;
          white-space: nowrap;
        }
        .kanban-dropdown-item:hover { background: var(--surface); }
        .kanban-empty {
          padding: .6rem .5rem;
          font-family: var(--font-mono);
          font-size: var(--fs-xs);
          color: var(--text-dim);
          text-align: center;
        }
        /* Ocultar grab cursor en móvil */
        @media (hover: none) {
          .kanban-card { cursor: pointer; }
          .kanban-card:active { cursor: pointer; }
        }
      `}</style>

      {/* Leyenda de uso */}
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", margin: "0 0 .65rem 0" }}>
        <span className="hide-mobile">Arrastra las tarjetas entre columnas para cambiar el estado · </span>
        Pulsa <strong>···</strong> para mover desde móvil · Click en la tarjeta para abrir la ficha
      </p>

      <div className="kanban-board">
        {COLUMNAS.map(col => {
          const items = voluntarios.filter(v => columnaDeVol(v) === col.id);
          const isTarget = dropTarget === col.id;

          return (
            <div
              key={col.id}
              className={`kanban-col${isTarget ? " drop-active" : ""}`}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={e => handleDrop(e, col.id)}
              onDragLeave={() => setDropTarget(null)}
            >
              {/* Cabecera de columna */}
              <div className="kanban-col-header" style={{ background: col.bg }}>
                <span style={{ fontSize: ".9rem" }}>{col.icon}</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontWeight: 700,
                  fontSize: "var(--fs-sm)", color: col.color,
                }}>
                  {col.label}
                </span>
                <span className="kanban-col-count" style={{
                  color: col.color,
                  background: `${col.color}18`,
                  border: `1px solid ${col.border}`,
                }}>
                  {items.length}
                </span>
              </div>

              {/* Tarjetas */}
              <div className="kanban-cards">
                {items.length === 0 && (
                  <div className="kanban-empty">Sin voluntarios</div>
                )}
                {items.map(v => {
                  const puesto = puestos.find(p => p.id === v.puestoId);
                  const nombre = [v.nombre, v.apellidos].filter(Boolean).join(" ") || "Sin nombre";
                  const isMenuOpen = menuAbierto === v.id;

                  return (
                    <div
                      key={v.id}
                      className="kanban-card"
                      draggable
                      onDragStart={e => handleDragStart(e, v.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (menuAbierto) { setMenuAbierto(null); return; }
                        onFicha(v);
                      }}
                      style={{ borderLeft: `3px solid ${col.color}` }}
                    >
                      <div className="kanban-card-name">{nombre}</div>
                      <div className="kanban-card-meta">
                        {puesto
                          ? <span>📍 {puesto.nombre}</span>
                          : <span style={{ color: "var(--text-dim)" }}>Sin puesto</span>
                        }
                        {v.talla && <span>👕 {v.talla}</span>}
                      </div>

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

                      {/* Dropdown de opciones */}
                      {isMenuOpen && (
                        <div
                          className="kanban-dropdown"
                          onClick={e => e.stopPropagation()}
                        >
                          <div style={{
                            padding: ".3rem .75rem .2rem",
                            fontFamily: "var(--font-mono)",
                            fontSize: "var(--fs-xs)",
                            color: "var(--text-dim)",
                            borderBottom: "1px solid var(--border)",
                          }}>
                            Mover a →
                          </div>
                          {COLUMNAS.filter(c => c.id !== col.id).map(dest => (
                            <button
                              key={dest.id}
                              className="kanban-dropdown-item"
                              onClick={() => moverA(v.id, dest.id)}
                            >
                              <span style={{ marginRight: ".4rem" }}>{dest.icon}</span>
                              <span style={{ color: dest.color }}>{dest.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
