/**
 * ConflictModal.jsx — Fase 0, Tarea 0.4
 *
 * Modal bloqueante para conflictos de sincronización remota.
 * Reemplaza el toast.warning de Index.jsx para garantizar que
 * el usuario sea consciente del conflicto antes de continuar.
 *
 * Escucha el evento global `teg-conflict` emitido por dataService.
 * Si llegan varios conflictos mientras el modal está abierto,
 * se encolan y se muestran secuencialmente.
 */
import { useState, useEffect, useCallback } from "react";

function formatLabel(collection = "") {
  return collection
    .replace(/^teg_/, "")
    .replace(/_v\d+_?/g, " ")
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
    || "Datos";
}

export default function ConflictModal() {
  const [queue, setQueue]     = useState([]);   // array de { collection, message }
  const [current, setCurrent] = useState(null); // conflicto activo

  // Escuchar evento teg-conflict
  useEffect(() => {
    const handler = (e) => {
      const { collection, message } = e.detail || {};
      setQueue(prev => [...prev, { collection, message }]);
    };
    window.addEventListener("teg-conflict", handler);
    return () => window.removeEventListener("teg-conflict", handler);
  }, []);

  // Sacar el siguiente conflicto de la cola cuando no hay ninguno activo
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [current, queue]);

  const handleClose = useCallback(() => {
    setCurrent(null);
  }, []);

  if (!current) return null;

  const label = formatLabel(current.collection);
  const msg   = current.message || "Los datos remotos son más recientes que los locales.";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
          animation: "teg-fadein 0.18s ease",
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
        aria-describedby="conflict-desc"
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9001,
          width: "min(90vw, 380px)",
          background: "var(--teg-surface)",
          border: "1px solid rgba(251,191,36,0.35)",
          borderRadius: 16,
          padding: "1.5rem 1.5rem 1.25rem",
          boxShadow: "0 8px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(251,191,36,0.12)",
          animation: "teg-fadein-scale 0.22s cubic-bezier(0.34,1.3,0.64,1)",
        }}
      >
        {/* Icono + título */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.9rem" }}>
          <span style={{ fontSize: "1.5rem", flexShrink: 0, lineHeight: 1.2 }}>⚠️</span>
          <div>
            <div
              id="conflict-title"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: "var(--fs-base)",
                color: "var(--amber, #f59e0b)",
                marginBottom: "0.2rem",
              }}
            >
              Conflicto de sincronización
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--fs-xs)",
                color: "var(--teg-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {label}
            </div>
          </div>
        </div>

        {/* Descripción */}
        <p
          id="conflict-desc"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "var(--fs-sm)",
            color: "var(--teg-text-primary)",
            lineHeight: 1.6,
            margin: "0 0 1.25rem",
          }}
        >
          {msg}
          <br />
          <span style={{ color: "var(--teg-text-muted)", fontSize: "var(--fs-xs)" }}>
            Los datos remotos han sido descartados. Los cambios locales prevalecen.
          </span>
        </p>

        {/* Botón de cierre */}
        <button
          onClick={handleClose}
          autoFocus
          style={{
            width: "100%",
            padding: "0.6rem 1rem",
            borderRadius: 10,
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.35)",
            color: "var(--amber, #f59e0b)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-sm)",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(251,191,36,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(251,191,36,0.1)"; }}
        >
          Entendido
        </button>
      </div>
    </>
  );
}
