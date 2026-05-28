/**
 * ConflictModal.jsx — Fase 0, Tarea 0.4
 *
 * Modal bloqueante para conflictos de sincronización (HTTP 409).
 * Reemplaza el toast pasivo para garantizar que el usuario tome
 * una decisión explícita antes de continuar.
 *
 * Escucha el evento global `teg-conflict` emitido por dataService.
 * Si llegan varios conflictos mientras el modal está abierto,
 * se encolan y se muestran secuencialmente.
 *
 * Acciones disponibles:
 *   - "Mantener mis cambios"   → PUT con forceOverwrite: true
 *   - "Recargar del servidor"  → elimina caché local e invalida TTL
 */
import { useState, useEffect, useCallback } from "react";
import { useAppStore, EVENT_TYPES } from "@/store/useAppStore";

const API_BASE = "/api/proxy";

/** Convierte una clave teg_xxx_v1_yyy en texto legible */
function formatLabel(collection = "") {
  const map = {
    presupuesto:    "Presupuesto",
    voluntarios:    "Voluntarios",
    logistica:      "Logística",
    patrocinadores: "Patrocinadores",
    camisetas:      "Camisetas",
    proyecto:       "Proyecto",
    documentos:     "Documentos",
    configuracion:  "Configuración",
  };
  const match = collection.replace(/^teg_/, "").match(/^([^_]+)/);
  const module = match?.[1] ?? "";
  return map[module] ?? (
    collection
      .replace(/^teg_/, "")
      .replace(/_v\d+_?/g, " ")
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase()) || "Datos"
  );
}

export default function ConflictModal() {
  const [queue,   setQueue]   = useState([]); // { collection, localData, message }
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(null); // "keep" | "reload" | null

  // Escuchar teg-conflict
  useEffect(() => {
    const handler = (e) => {
      const { collection, localData, message, context } = e.detail || {};
      setQueue(prev => [...prev, {
        collection,
        localData,
        message,
        context:   context ?? null,
        detectedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }]);
    };
    window.addEventListener("teg-conflict", handler);
    return () => window.removeEventListener("teg-conflict", handler);
  }, []);

  // Sacar el siguiente de la cola cuando no hay ninguno activo
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
      setLoading(null);
    }
  }, [current, queue]);

  const dismiss = useCallback(() => {
    setCurrent(null);
    setLoading(null);
  }, []);

  // "Mantener mis cambios" — PUT con forceOverwrite: true
  const handleKeep = useCallback(async () => {
    if (!current) return;
    setLoading("keep");
    try {
      const res = await fetch(`${API_BASE}/data/${current.collection}?forceOverwrite=true`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current.localData ?? {}),
      });
      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        if (resData?.version !== undefined) {
          localStorage.setItem(`__version_${current.collection}`, String(resData.version));
        }
        localStorage.setItem(`__last_save_${current.collection}`, Date.now().toString());
        window.dispatchEvent(new CustomEvent("teg-save-status", { detail: { status: "saved" } }));
      }
    } catch { /* dato local ya guardado; ignorar error de red */ }
    dismiss();
  }, [current, dismiss]);

  // "Recargar del servidor" — eliminar caché local para forzar refetch
  const emitEvent = useAppStore((s) => s.emitEvent);

  const handleReload = useCallback(() => {
    if (!current) return;
    setLoading("reload");
    try {
      localStorage.removeItem(`__cache_${current.collection}`);
      localStorage.removeItem(`__cache_ts_${current.collection}`);
      localStorage.removeItem(`__version_${current.collection}`);
      emitEvent(EVENT_TYPES.DATA_SYNC, 'conflict-modal');
    } catch { /* ignorar */ }
    dismiss();
  }, [current, dismiss, emitEvent]);

  if (!current) return null;

  const label = formatLabel(current.collection);

  return (
    <>
      {/* Backdrop */}
      <div
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
          width: "min(92vw, 400px)",
          background: "var(--surface)",
          border: "1px solid rgba(251,191,36,0.35)",
          borderRadius: 16,
          padding: "1.5rem 1.5rem 1.25rem",
          boxShadow: "0 8px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(251,191,36,0.12)",
          animation: "teg-fadein-scale 0.22s cubic-bezier(0.34,1.3,0.64,1)",
        }}
      >
        {/* Icono + título */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
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
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-xs)",
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
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
            color: "var(--text)",
            lineHeight: 1.6,
            margin: "0 0 0.6rem",
          }}
        >
          Otro dispositivo guardó cambios más recientes en <strong>{label}</strong>.
          ¿Qué versión quieres conservar?
        </p>

        {/* Contexto de operación + timestamp — Mejora 6 */}
        {(current.context || current.detectedAt) && (
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-xs)",
            color: "var(--text-dim)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6,
            padding: "0.35rem 0.6rem",
            marginBottom: "1rem",
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}>
            {current.context && (
              <span>📋 {current.context}</span>
            )}
            {current.detectedAt && (
              <span>🕐 Detectado a las {current.detectedAt}</span>
            )}
          </div>
        )}

        {/* Botones de acción */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <button
            onClick={handleKeep}
            disabled={!!loading}
            autoFocus
            style={{
              width: "100%",
              padding: "0.65rem 1rem",
              borderRadius: 10,
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.3)",
              color: "var(--cyan)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-sm)",
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              opacity: loading && loading !== "keep" ? 0.5 : 1,
              transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "rgba(34,211,238,0.14)"; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "rgba(34,211,238,0.08)"; }}
          >
            {loading === "keep" ? "Guardando…" : "💾 Mantener mis cambios"}
          </button>

          <button
            onClick={handleReload}
            disabled={!!loading}
            style={{
              width: "100%",
              padding: "0.65rem 1rem",
              borderRadius: 10,
              background: "rgba(251,191,36,0.07)",
              border: "1px solid rgba(251,191,36,0.25)",
              color: "var(--amber, #f59e0b)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-sm)",
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              opacity: loading && loading !== "reload" ? 0.5 : 1,
              transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "rgba(251,191,36,0.13)"; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "rgba(251,191,36,0.07)"; }}
          >
            {loading === "reload" ? "Recargando…" : "🔄 Recargar datos del servidor"}
          </button>
        </div>

        <p style={{
          marginTop: "0.9rem",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--fs-xs)",
          color: "var(--text-dim)",
          lineHeight: 1.5,
          textAlign: "center",
        }}>
          Esta acción no se puede deshacer.
        </p>
      </div>
    </>
  );
}
