import React from "react";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";

// ─── Helpers ────────────────────────────────────────────────────────────────
const getTramoStatus = (fechaFin) => {
  const now = new Date();
  const end = new Date(fechaFin);
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return { label: "Cerrado",  color: "#f87171", bg: "rgba(248,113,113,0.12)", glyph: "🔒" };
  if (diffDays <= 7) return { label: "Último plazo", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", glyph: "⚡" };
  if (diffDays <= 30) return { label: "Activo",   color: "#34d399", bg: "rgba(52,211,153,0.12)", glyph: "🟢" };
  return { label: "Próximo", color: "#a78bfa", bg: "rgba(167,139,250,0.12)", glyph: "⏳" };
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
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

// ─── Single tramo card ───────────────────────────────────────────────────────
const TramoCard = ({ t, idx, total, setTramos, updateTramoPrecio }) => {
  const status = getTramoStatus(t.fechaFin);

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
          onClick={() => setTramos(prev => prev.filter(x => x.id !== t.id))}
          style={{
            background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)",
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
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
export const TabTramos = ({ tramos, setTramos, updateTramoPrecio, addTramo }) => {
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
            {tramos.map((t, idx) => {
              const status = getTramoStatus(t.fechaFin);
              const widthPct = `${100 / tramos.length}%`;
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
                  <th key={d} className="text-right" style={{
                    color: DISTANCIA_COLORS[d],
                    borderBottom: "2px solid var(--border)",
                  }}>
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
                const status = getTramoStatus(t.fechaFin);
                const isOdd = idx % 2 === 1;
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
                    {DISTANCIAS.map(d => (
                      <td key={d} className="text-right mono" style={{
                        color: DISTANCIA_COLORS[d],
                        fontWeight: 700,
                        fontSize: "0.9rem",
                      }}>
                        {t.precios[d]} €
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
