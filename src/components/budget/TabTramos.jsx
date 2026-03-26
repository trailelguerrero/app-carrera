import React, { useState } from "react";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";

// ─── Helpers ────────────────────────────────────────────────────────────────
const getTramoStatus = (fechaFin) => {
  const now = new Date();
  const end = new Date(fechaFin);
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)   return { label: "Cerrado",      color: "#f87171", bg: "rgba(248,113,113,0.12)", glyph: "🔒" };
  if (diffDays <= 7)  return { label: "Último plazo", color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  glyph: "⚡" };
  if (diffDays <= 30) return { label: "Activo",       color: "#34d399", bg: "rgba(52,211,153,0.12)",  glyph: "🟢" };
  return               { label: "Próximo",            color: "#a78bfa", bg: "rgba(167,139,250,0.12)", glyph: "⏳" };
};

const fmt = (n) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

// Calcular inscritos y ingresos de un tramo
const tramoStats = (t, inscritos) => {
  const total = DISTANCIAS.reduce((s, d) => s + (inscritos?.tramos?.[t.id]?.[d] || 0), 0);
  const ingresos = DISTANCIAS.reduce((s, d) => s + (inscritos?.tramos?.[t.id]?.[d] || 0) * (t.precios[d] || 0), 0);
  return { total, ingresos };
};

// ─── Price chip per distance ─────────────────────────────────────────────────
const PriceRow = ({ d, t, updateTramoPrecio }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0.55rem 0.75rem",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    border: `1px solid ${DISTANCIA_COLORS[d]}22`,
    marginBottom: 6,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 10, height: 10, borderRadius: "50%",
        background: DISTANCIA_COLORS[d],
        boxShadow: `0 0 6px ${DISTANCIA_COLORS[d]}80`,
        flexShrink: 0,
      }} />
      <span style={{ color: DISTANCIA_COLORS[d], fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.82rem" }}>
        {DISTANCIA_LABELS[d]}
      </span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>€/corredor</span>
      <NumInput value={t.precios[d]} onChange={v => updateTramoPrecio(t.id, d, v)} step={1} small />
    </div>
  </div>
);

// ─── Modal confirmación de eliminación ───────────────────────────────────────
const ModalConfirmDelete = ({ tramo, stats, onConfirm, onCancel }) => (
  <div
    onClick={e => e.target === e.currentTarget && onCancel()}
    style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }}
  >
    <div style={{
      background: "var(--surface)", border: "1px solid rgba(248,113,113,0.3)",
      borderRadius: 16, padding: "2rem 1.75rem", maxWidth: 380, width: "100%",
      textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
      animation: "slideUp 0.2s ease",
    }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>🗑️</div>
      <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.5rem" }}>
        ¿Eliminar «{tramo.nombre}»?
      </div>

      {stats.total > 0 ? (
        <div style={{
          background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)",
          borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1.25rem",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--red)", fontWeight: 700, marginBottom: "0.3rem" }}>
            ⚠️ Este tramo tiene datos de inscritos
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            {stats.total} corredor{stats.total !== 1 ? "es" : ""} · {fmt(stats.ingresos)} en ingresos
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>
            Al eliminar el tramo se perderán estos datos del presupuesto.
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
          El tramo no tiene inscritos asignados.<br />Esta acción no se puede deshacer.
        </div>
      )}

      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center" }}>
        <button
          onClick={onCancel}
          style={{
            background: "var(--surface2)", color: "var(--text-muted)",
            border: "1px solid var(--border)", borderRadius: 8,
            padding: "0.5rem 1.2rem", fontFamily: "var(--font-display)",
            fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          }}
        >Cancelar</button>
        <button
          onClick={onConfirm}
          style={{
            background: "rgba(248,113,113,0.15)", color: "var(--red)",
            border: "1px solid rgba(248,113,113,0.35)", borderRadius: 8,
            padding: "0.5rem 1.2rem", fontFamily: "var(--font-display)",
            fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          }}
        >Sí, eliminar</button>
      </div>
    </div>
  </div>
);

// ─── Single tramo card ───────────────────────────────────────────────────────
const TramoCard = ({ t, idx, total, setTramos, updateTramoPrecio, inscritos, onRequestDelete }) => {
  const status = getTramoStatus(t.fechaFin);
  const stats  = tramoStats(t, inscritos);

  return (
    <div style={{
      background: "linear-gradient(160deg, #111c38 0%, #0f1629 100%)",
      border: `1px solid var(--border)`,
      borderTop: `3px solid ${status.color}`,
      borderRadius: 14,
      padding: "1.25rem",
      position: "relative",
      transition: "transform 0.15s, box-shadow 0.15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px ${status.color}33`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      {/* Tramo number + delete */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
          borderRadius: 6, padding: "0.2rem 0.55rem",
          fontSize: "0.62rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)",
        }}>
          TRAMO {idx + 1}/{total}
        </div>
        <button
          onClick={() => onRequestDelete(t)}
          title="Eliminar tramo"
          style={{
            background: "rgba(248,113,113,0.08)", color: "#f87171",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >✕</button>
      </div>

      {/* Name */}
      <input
        className="text-input"
        value={t.nombre}
        onChange={e => setTramos(prev => prev.map(x => x.id === t.id ? { ...x, nombre: e.target.value } : x))}
        style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.75rem", width: "100%", color: "var(--text)" }}
      />

      {/* Status + Date row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: stats.total > 0 ? "0.6rem" : "1rem", flexWrap: "wrap" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: status.bg, color: status.color,
          border: `1px solid ${status.color}44`,
          borderRadius: 20, padding: "0.2rem 0.65rem",
          fontSize: "0.65rem", fontWeight: 700, fontFamily: "var(--font-mono)",
        }}>
          {status.glyph} {status.label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Hasta:</span>
          <input
            type="date"
            className="date-input"
            value={t.fechaFin}
            onChange={e => setTramos(prev => prev.map(x => x.id === t.id ? { ...x, fechaFin: e.target.value } : x))}
            style={{ fontSize: "0.72rem" }}
          />
        </div>
      </div>

      {/* Badge inscritos — solo si tiene datos */}
      {stats.total > 0 && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: status.label === "Cerrado" ? "rgba(52,211,153,0.08)" : "rgba(167,139,250,0.08)",
          border: `1px solid ${status.label === "Cerrado" ? "rgba(52,211,153,0.25)" : "rgba(167,139,250,0.25)"}`,
          borderRadius: 8, padding: "0.3rem 0.65rem", marginBottom: "1rem",
          fontFamily: "var(--font-mono)", fontSize: "0.65rem",
        }}>
          <span>{status.label === "Cerrado" ? "💰" : "📋"}</span>
          <span style={{ color: status.label === "Cerrado" ? "var(--green)" : "var(--violet)", fontWeight: 700 }}>
            {stats.total} inscritos
          </span>
          <span style={{ color: "var(--text-dim)" }}>·</span>
          <span style={{ color: status.label === "Cerrado" ? "var(--green)" : "var(--violet)", fontWeight: 700 }}>
            {fmt(stats.ingresos)}
          </span>
          {status.label === "Cerrado" && (
            <span style={{ color: "var(--text-dim)", fontSize: "0.58rem" }}>cobrado</span>
          )}
        </div>
      )}

      {/* Prices */}
      <div>
        {DISTANCIAS.map(d => (
          <PriceRow key={d} d={d} t={t} updateTramoPrecio={updateTramoPrecio} />
        ))}
      </div>
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
export const TabTramos = ({ tramos, setTramos, updateTramoPrecio, addTramo, inscritos }) => {
  const [pendingDelete, setPendingDelete] = useState(null); // tramo a confirmar

  const handleRequestDelete = (t) => {
    const stats = tramoStats(t, inscritos);
    setPendingDelete({ tramo: t, stats });
  };

  const handleConfirmDelete = () => {
    setTramos(prev => prev.filter(x => x.id !== pendingDelete.tramo.id));
    setPendingDelete(null);
  };

  return (
    <>
      {/* ── Header ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem",
      }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.4rem" }}>📅</span>
            Tramos de Inscripción y Precios
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 3 }}>
            {tramos.length} tramo{tramos.length !== 1 ? "s" : ""} · TG7, TG13, TG25
          </div>
        </div>
        <button className="btn btn-amber" onClick={addTramo} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 400 }}>+</span> Nuevo Tramo
        </button>
      </div>

      {/* ── Timeline bar ── */}
      {tramos.length > 0 && (
        <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Línea temporal
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {tramos.map((t) => {
              const status = getTramoStatus(t.fechaFin);
              return (
                <div key={t.id} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    height: 8, borderRadius: 4,
                    background: status.color,
                    opacity: status.label === "Cerrado" ? 0.3 : 1,
                    boxShadow: status.label !== "Cerrado" ? `0 0 8px ${status.color}80` : "none",
                  }} />
                  <div style={{
                    fontSize: "0.58rem", color: status.color, fontFamily: "var(--font-mono)",
                    marginTop: 4, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {t.nombre}
                  </div>
                  <div style={{ fontSize: "0.52rem", color: "var(--text-muted)" }}>{formatDate(t.fechaFin)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tramo cards grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}>
        {tramos.map((t, idx) => (
          <TramoCard
            key={t.id}
            t={t}
            idx={idx}
            total={tramos.length}
            setTramos={setTramos}
            updateTramoPrecio={updateTramoPrecio}
            inscritos={inscritos}
            onRequestDelete={handleRequestDelete}
          />
        ))}
      </div>

      {/* ── Comparative table ── */}
      <div className="card">
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "1rem", color: "var(--amber)", marginBottom: "1.25rem",
        }}>
          <span>📊</span> Comparativa de Precios por Tramo
        </div>
        <div className="overflow-x">
          <table className="tbl" style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "2px solid var(--border)" }}>Tramo</th>
                <th style={{ borderBottom: "2px solid var(--border)" }}>Fecha límite</th>
                <th style={{ borderBottom: "2px solid var(--border)", textAlign: "center" }}>Estado</th>
                {DISTANCIAS.map(d => (
                  <th key={d} className="text-right" style={{ color: DISTANCIA_COLORS[d], borderBottom: "2px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: DISTANCIA_COLORS[d], display: "inline-block" }} />
                      {DISTANCIA_LABELS[d]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tramos.map((t, idx) => {
                const status  = getTramoStatus(t.fechaFin);
                const prev    = idx > 0 ? tramos[idx - 1] : null;
                const isOdd   = idx % 2 === 1;
                return (
                  <tr key={t.id} style={{ background: isOdd ? "rgba(255,255,255,0.015)" : "transparent" }}>
                    <td>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text)" }}>{t.nombre}</span>
                    </td>
                    <td className="mono text-xs text-muted">{formatDate(t.fechaFin)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        background: status.bg, color: status.color,
                        border: `1px solid ${status.color}44`,
                        borderRadius: 20, padding: "0.15rem 0.5rem",
                        fontSize: "0.6rem", fontWeight: 700, fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
                      }}>
                        {status.glyph} {status.label}
                      </span>
                    </td>
                    {DISTANCIAS.map(d => {
                      const delta = prev ? t.precios[d] - prev.precios[d] : null;
                      return (
                        <td key={d} className="text-right">
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.1rem" }}>
                            <span className="mono" style={{ color: DISTANCIA_COLORS[d], fontWeight: 700, fontSize: "0.9rem" }}>
                              {t.precios[d]} €
                            </span>
                            {delta !== null && (
                              <span style={{
                                fontFamily: "var(--font-mono)", fontSize: "0.58rem", fontWeight: 700,
                                color: delta > 0 ? "var(--amber)" : delta < 0 ? "var(--red)" : "var(--text-dim)",
                              }}>
                                {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "="}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal confirmación de eliminación ── */}
      {pendingDelete && (
        <ModalConfirmDelete
          tramo={pendingDelete.tramo}
          stats={pendingDelete.stats}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
};
