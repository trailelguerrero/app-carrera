import React, { useState, useRef } from "react";
import { useData } from "@/hooks/useData";
import { Tooltip, TooltipIcon } from "../common/Tooltip";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";
import { cls } from "../../lib/budgetUtils";
import { SK_UI_CODIGOS_PROMO, SK_UI_CODIGOS_INIT } from "@/constants/storageKeys";
import { SeccionCodigos } from "./SeccionCodigos";

// MEJ-01: getTramoStatus ahora acepta fechaInicio (opcional) para distinguir
// "Próximo" (no abierto aún) de "Abierto" (plazo largo pero ya activo).
// Retrocompatibilidad: si fechaInicio está ausente se omite la comprobación
// y el tramo se considera siempre abierto mientras fechaFin sea futura.
//
// Estados:
//   fechaInicio > hoy                → "Próximo"      ⏳ (aún no ha comenzado)
//   fechaFin pasada                  → "Cerrado"      🔒
//   diffDías ≤ 7                     → "Último plazo" ⚡
//   diffDías ≤ 30                    → "Activo"       🟢
//   diffDías > 30                    → "Abierto"      📅
const getTramoStatus = (fechaFin, fechaInicio) => {
  const now   = new Date(); now.setHours(0,0,0,0);
  if (fechaInicio) {
    const start = new Date(fechaInicio);
    if (start > now) return { label: "Próximo", color: "#a78bfa", bg: "rgba(167,139,250,0.12)", glyph: "⏳" };
  }
  const end      = new Date(fechaFin);
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)   return { label: "Cerrado",       color: "#f87171", bg: "rgba(248,113,113,0.12)", glyph: "🔒" };
  if (diffDays <= 7)  return { label: "Último plazo",  color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  glyph: "⚡" };
  if (diffDays <= 30) return { label: "Activo",        color: "#34d399", bg: "rgba(52,211,153,0.12)",  glyph: "🟢" };
  return               { label: "Abierto",             color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  glyph: "📅" };
};

const fmt = (n) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

const tramoStats = (t, inscritos) => {
  const total    = DISTANCIAS.reduce((s, d) => s + (inscritos?.tramos?.[t.id]?.[d] || 0), 0);
  const ingresos = DISTANCIAS.reduce((s, d) => s + (inscritos?.tramos?.[t.id]?.[d] || 0) * (t.precios[d] || 0), 0);
  return { total, ingresos };
};

// ─── Modal confirmación de eliminación de tramo ───────────────────────────────
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
      <div style={{ fontSize: "var(--fs-xl)", marginBottom: "0.75rem" }}>🗑️</div>
      <div style={{ fontWeight: 800, fontSize: "var(--fs-md)", marginBottom: "0.5rem" }}>
        ¿Eliminar «{tramo.nombre}»?
      </div>
      {stats.total > 0 ? (
        <div style={{
          background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)",
          borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1.25rem",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--red)", fontWeight: 700, marginBottom: "0.3rem" }}>
            ⚠️ Este tramo tiene datos de inscritos
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", lineHeight: 1.6 }}>
            {stats.total} corredor{stats.total !== 1 ? "es" : ""} · {fmt(stats.ingresos)} en ingresos
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: "0.3rem" }}>
            Al eliminar el tramo se perderán estos datos del presupuesto.
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
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
            fontWeight: 700, fontSize: "var(--fs-base)", cursor: "pointer",
          }}
        >Cancelar</button>
        <button
          onClick={onConfirm}
          style={{
            background: "rgba(248,113,113,0.15)", color: "var(--red)",
            border: "1px solid rgba(248,113,113,0.35)", borderRadius: 8,
            padding: "0.5rem 1.2rem", fontFamily: "var(--font-display)",
            fontWeight: 700, fontSize: "var(--fs-base)", cursor: "pointer",
          }}
        >Sí, eliminar</button>
      </div>
    </div>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────
export const TabInscripciones = ({
  tramos,
  setTramos,
  updateTramoPrecio,
  addTramo,
  inscritos,
  setInscritos,
  updateInscritos,
  totalInscritos,
  ingresosPorDistancia,
  maximos,
  setMaximos,
}) => {
  // ── Estado de esta sección (tramos + CSV) ────────────────────────────────
  const [pendingDelete, setPendingDelete] = useState(null);
  const [csvModalOpen,  setCsvModalOpen]  = useState(false);
  const [csvPreview,    setCsvPreview]    = useState(null);
  const [csvMergeMode,  setCsvMergeMode]  = useState("reemplazar");
  const [csvMsg,        setCsvMsg]        = useState(null);
  const csvInputRef = useRef(null);

  // ── Códigos promocionales — estado gestionado aquí, pasado a SeccionCodigos ──
  const [rawCodigos, setCodigos, codigosLoading] = useData(SK_UI_CODIGOS_PROMO, []);
  const [rawCodigosInit, setCodigosInit] = useData(SK_UI_CODIGOS_INIT, null);
  const codigos = Array.isArray(rawCodigos) ? rawCodigos : [];

  // ── Lógica CSV ─────────────────────────────────────────────────────────────
  const parseCsv = (text) => {
    const firstLine = text.split(/\r?\n/)[0] || "";
    const sep = (firstLine.split(";").length - 1) > (firstLine.split(",").length - 1) ? ";" : ",";
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return { rows: [], errors: ["El archivo no tiene datos o solo tiene cabecera."] };

    const rawHeaders = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/\s+/g, ""));
    const idxDistancia = rawHeaders.findIndex(h => h === "distancia");
    const idxTramo     = rawHeaders.findIndex(h => h === "tramo");
    const idxNumero    = rawHeaders.findIndex(h => h === "numero" || h === "número");

    const missing = [];
    if (idxDistancia < 0) missing.push("distancia");
    if (idxTramo     < 0) missing.push("tramo");
    if (idxNumero    < 0) missing.push("numero");
    if (missing.length > 0) return { rows: [], errors: [`Columnas no encontradas: ${missing.join(", ")}. Cabeceras detectadas: ${rawHeaders.join(", ")}`] };

    const DIST_VALID = ["TG7", "TG13", "TG25"];
    const rows = [];
    const errors = [];

    lines.slice(1).forEach((line, i) => {
      if (!line) return;
      const cells     = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ""));
      const distancia = (cells[idxDistancia] || "").toUpperCase();
      const tramo     = cells[idxTramo]     || "";
      const numero    = parseInt(cells[idxNumero] || "", 10);

      if (!DIST_VALID.includes(distancia)) { errors.push(`Fila ${i+2}: distancia inválida "${cells[idxDistancia]}"`); return; }
      if (!tramo)                          { errors.push(`Fila ${i+2}: tramo vacío`); return; }
      if (isNaN(numero) || numero < 0)     { errors.push(`Fila ${i+2}: número inválido "${cells[idxNumero]}"`); return; }
      rows.push({ distancia, tramo, numero });
    });

    return { rows, errors };
  };

  const handleCsvFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setCsvMsg({ type: "error", text: "El archivo supera el límite de 2 MB." }); return; }
    setCsvMsg(null);
    const reader = new FileReader();
    reader.onload = (ev) => { const { rows, errors } = parseCsv(ev.target.result); setCsvPreview({ rows, errors }); };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleCsvConfirm = () => {
    if (!csvPreview?.rows?.length) return;
    const { rows } = csvPreview;
    const grouped = {};
    rows.forEach(({ distancia, tramo, numero }) => {
      if (!grouped[tramo]) grouped[tramo] = {};
      grouped[tramo][distancia] = (grouped[tramo][distancia] || 0) + numero;
    });
    setInscritos(prev => {
      const newTramos = { ...(prev.tramos || {}) };
      Object.entries(grouped).forEach(([nombreTramo, distMap]) => {
        const tramoMatch = tramos.find(t => t.nombre.trim().toLowerCase() === nombreTramo.trim().toLowerCase());
        if (!tramoMatch) return;
        const tid    = tramoMatch.id;
        const merged = { ...(newTramos[tid] || {}) };
        Object.entries(distMap).forEach(([dist, n]) => {
          merged[dist] = csvMergeMode === "sumar" ? (newTramos[tid]?.[dist] || 0) + n : n;
        });
        newTramos[tid] = merged;
      });
      return { ...prev, tramos: newTramos };
    });
    const ignored = rows.filter(r => !tramos.find(t => t.nombre.trim().toLowerCase() === r.tramo.trim().toLowerCase())).length;
    setCsvMsg({
      type: "success",
      text: `✅ ${rows.length - ignored} inscritos importados (modo: ${csvMergeMode}). ${ignored > 0 ? `${ignored} filas ignoradas por tramo no encontrado.` : ""} ${csvPreview.errors.length > 0 ? `${csvPreview.errors.length} filas con error de formato.` : ""}`,
    });
    setCsvPreview(null);
    setCsvModalOpen(false);
  };

  const handleRequestDelete = (t) => setPendingDelete({ tramo: t, stats: tramoStats(t, inscritos) });

  const handleConfirmDelete = () => {
    const id = pendingDelete.tramo.id;
    setTramos(prev => prev.filter(x => x.id !== id));
    setInscritos(prev => {
      const { [id]: _dropped, ...restTramos } = prev.tramos || {};
      return { ...prev, tramos: restTramos };
    });
    setPendingDelete(null);
  };

  return (
    <>
      <style>{`
        .input-inline {
          background: transparent; border: 1px solid transparent; color: var(--text);
          padding: 0.15rem 0.3rem; border-radius: 4px; font-family: var(--font-display);
          font-weight: 700; width: 100%; min-width: 90px;
          outline: none; transition: background 0.15s;
        }
        .input-inline:focus { background: var(--surface2); border-color: var(--border); }
        .date-inline {
          background: transparent; color: var(--text-muted); border: none; outline: none;
          font-family: var(--font-mono); font-size: 0.72rem; cursor: pointer; padding: 0.1rem;
        }
        .date-inline::-webkit-calendar-picker-indicator { cursor: pointer; filter: invert(0.6); }
        .cell-group {
          display: flex; flex-direction: column; gap: 0.35rem; align-items: flex-end; justify-content: center;
        }
      `}</style>

      {/* ── SECCIÓN 1: PLAZAS MÁXIMAS ── */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: ".5rem" }}>
          <div className="card-title" style={{ color: "var(--cyan)", margin: 0 }}>🎯 Panel de Plazas y Volúmenes de Inscripción</div>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          {DISTANCIAS.map(d => {
            const pct   = maximos[d] > 0 ? Math.min((totalInscritos[d] / maximos[d]) * 100, 100) : 0;
            const color = pct >= 90 ? "var(--red)" : pct >= 70 ? "var(--amber)" : "var(--green)";
            const libre = Math.max(maximos[d] - totalInscritos[d], 0);
            return (
              <div key={d} style={{ minWidth: 200, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ color: DISTANCIA_COLORS[d], fontWeight: 700, fontSize: "0.85rem" }}>{DISTANCIA_LABELS[d]}</span>
                  {pct >= 90 && maximos[d] > 0 && (
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                      padding: ".1rem .45rem", borderRadius: 10,
                      background: pct >= 100 ? "rgba(248,113,113,.15)" : "rgba(251,191,36,.15)",
                      color: pct >= 100 ? "var(--red)" : "var(--amber)",
                      border: `1px solid ${pct >= 100 ? "rgba(248,113,113,.3)" : "rgba(251,191,36,.3)"}`,
                    }}>
                      {pct >= 100 ? "⛔ Aforo completo" : `🔶 ${(100-pct).toFixed(0)}% libre`}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", color: "var(--text-muted)" }}>Máx. plazas:</span>
                  <NumInput value={maximos[d]} onChange={v => setMaximos(prev => ({ ...prev, [d]: Math.max(1, Math.round(v)) }))} step={10} small />
                </div>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: color, transition: "width 0.4s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color }}>{totalInscritos[d]} inscritos · {pct.toFixed(0)}%</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: libre <= 10 ? "var(--red)" : "var(--text-muted)" }}>{libre} libres</span>
                </div>
              </div>
            );
          })}
        </div>
        {DISTANCIAS.some(d => maximos[d] > 0 && totalInscritos[d] > maximos[d]) && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: ".6rem",
            padding: ".65rem .9rem", borderRadius: 8, marginTop: "1rem",
            background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.25)",
          }}>
            <span style={{ fontSize: "var(--fs-md)", flexShrink: 0 }}>⚠️</span>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", lineHeight: 1.6 }}>
              <span style={{ color: "var(--amber)", fontWeight: 700 }}>
                {DISTANCIAS.filter(d => maximos[d] > 0 && totalInscritos[d] > maximos[d])
                  .map(d => `${DISTANCIA_LABELS[d]}: ${totalInscritos[d]}/${maximos[d]} (+${totalInscritos[d]-maximos[d]})`)
                  .join(" · ")}
              </span>
              <span style={{ color: "var(--text-muted)", marginLeft: ".5rem" }}>
                superan el aforo máximo. El P&L y el punto de equilibrio usan estos valores.
                Si es intencional, actualiza el máximo arriba.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Timeline bar ── */}
      {tramos.length > 0 && (
        <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Línea temporal de tramos
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {tramos.map((t) => {
              const status = getTramoStatus(t.fechaFin, t.fechaInicio);
              return (
                <div key={t.id} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    height: 8, borderRadius: 4,
                    background: status.color,
                    opacity: status.label === "Cerrado" ? 0.3 : 1,
                    boxShadow: status.label !== "Cerrado" ? `0 0 8px ${status.color}80` : "none",
                  }} />
                  <div style={{
                    fontSize: "var(--fs-xs)", color: status.color, fontFamily: "var(--font-mono)",
                    marginTop: 4, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {t.nombre}
                  </div>
                  <div style={{ fontSize: "0.52rem", color: "var(--text-muted)" }}>
                    {t.fechaInicio ? `${formatDate(t.fechaInicio)} → ` : ""}{formatDate(t.fechaFin)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECCIÓN 2: MATRIZ DE PRECIOS Y VOLÚMENES ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: "var(--fs-md)", color: "var(--amber)", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>💰</span> Gestión de Precios y Volúmenes por Tramo
          </div>
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <button
              className="btn btn-ghost"
              onClick={() => { setCsvPreview(null); setCsvMsg(null); setCsvModalOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--fs-sm)" }}
            >
              📥 Importar CSV
            </button>
            <button className="btn btn-amber" onClick={addTramo} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 400 }}>+</span> Añadir Tramo
            </button>
          </div>
        </div>

        <div className="overflow-x" style={{ paddingBottom: "1.5rem" }}>
          <table className="tbl" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 160, paddingLeft: 8 }}>Información del Tramo</th>
                {DISTANCIAS.map(d => (
                  <th key={d} className="text-right" style={{ width: 140, paddingRight: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: DISTANCIA_COLORS[d], display: "inline-block" }} />
                      <span style={{ color: DISTANCIA_COLORS[d], fontSize: "0.85rem", fontWeight: 700 }}>{DISTANCIA_LABELS[d]}</span>
                    </div>
                  </th>
                ))}
                <th className="text-right" style={{ width: 100, paddingRight: 8 }}>Ingresos Brutos</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {tramos.map((t, idx) => {
                const status = getTramoStatus(t.fechaFin, t.fechaInicio);
                const stats  = tramoStats(t, inscritos);
                const prev   = idx > 0 ? tramos[idx - 1] : null;

                return (
                  <tr key={t.id} style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px dashed var(--border)" }}>
                    <td style={{ verticalAlign: "top", paddingTop: "0.9rem", paddingLeft: 8 }}>
                      <input
                        className="input-inline"
                        value={t.nombre}
                        onChange={e => setTramos(prev => prev.map(x => x.id === t.id ? { ...x, nombre: e.target.value } : x))}
                        placeholder="Nombre tramo"
                        style={{ fontSize: "var(--fs-md)", marginBottom: 2 }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "0.4rem" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: status.bg, color: status.color,
                          border: `1px solid ${status.color}44`,
                          borderRadius: 20, padding: "0.15rem 0.5rem",
                          fontSize: "var(--fs-xs)", fontWeight: 700, fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
                        }}>
                          {status.glyph} {status.label}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Inicio:</span>
                          <input
                            type="date" className="date-inline"
                            value={t.fechaInicio || ""}
                            onChange={e => setTramos(prev => prev.map(x => x.id === t.id ? { ...x, fechaInicio: e.target.value || undefined } : x))}
                            title="Fecha de apertura del tramo (opcional)"
                          />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Cierre:</span>
                          <input
                            type="date" className="date-inline"
                            value={t.fechaFin}
                            onChange={e => setTramos(prev => prev.map(x => x.id === t.id ? { ...x, fechaFin: e.target.value } : x))}
                            title="Fecha de cierre del tramo"
                          />
                        </div>
                        {t.fechaInicio && t.fechaInicio > t.fechaFin && (
                          <span style={{ fontSize: "var(--fs-xs)", color: "#f87171" }} title="La fecha de inicio es posterior al cierre">⚠️</span>
                        )}
                      </div>
                    </td>

                    {DISTANCIAS.map(d => {
                      const delta = prev && t.precios[d] !== undefined ? t.precios[d] - prev.precios[d] : null;
                      return (
                        <td key={d} className="text-right" style={{ verticalAlign: "middle", padding: "0.9rem 0.5rem" }}>
                          <div className="cell-group">
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>Precio:</span>
                              <NumInput value={t.precios[d]} onChange={v => updateTramoPrecio(t.id, d, v)} small step={1} />
                            </div>
                            {delta !== null && delta !== 0 && (
                              <div style={{
                                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                                color: delta > 0 ? "var(--amber)" : "var(--red)", marginTop: "-4px",
                              }}>
                                {delta > 0 ? `(+${Math.round(delta)}€)` : `(${Math.round(delta)}€)`}
                              </div>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem" }}>
                              <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>Volumen:</span>
                              <NumInput
                                value={inscritos.tramos[t.id]?.[d] || 0}
                                onChange={v => updateInscritos(t.id, d, Math.round(v))}
                                step={1} small style={{ background: "rgba(0,0,0,0.2)" }}
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    <td className="text-right" style={{ verticalAlign: "middle", paddingRight: 8 }}>
                      <div className="mono" style={{ color: "var(--violet)", fontWeight: 700, fontSize: "var(--fs-md)" }}>
                        {fmt(stats.ingresos)}
                      </div>
                      <div className="mono" style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", marginTop: 4 }}>
                        {stats.total} ctes
                      </div>
                    </td>

                    <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                      <button
                        onClick={() => handleRequestDelete(t)}
                        title="Eliminar tramo"
                        style={{
                          background: "transparent", color: "var(--red-dim)", border: "none",
                          cursor: "pointer", fontSize: "var(--fs-md)", padding: "0.3rem", transition: "color 0.2s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--red-dim)"}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}

              <tr className="total-row">
                <td style={{ fontSize: "0.9rem", color: "var(--text)", paddingLeft: 8 }}>TOTALES ACUMULADOS</td>
                {DISTANCIAS.map(d => {
                  const supera = maximos[d] > 0 && totalInscritos[d] > maximos[d];
                  const justo  = maximos[d] > 0 && totalInscritos[d] === maximos[d];
                  return (
                    <td key={d} className="text-right" style={{ padding: "0.9rem 0.5rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.15rem" }}>
                        <span className="mono" style={{ color: supera ? "var(--red)" : DISTANCIA_COLORS[d], fontWeight: supera ? 800 : 700, fontSize: "var(--fs-md)" }}>
                          {totalInscritos[d]}
                          {supera && <span style={{ fontSize: "var(--fs-sm)", marginLeft: "0.3rem" }}>⚠️</span>}
                          {justo  && <span style={{ fontSize: "var(--fs-sm)", marginLeft: "0.3rem" }}>✅</span>}
                        </span>
                        {supera && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", fontWeight: 700 }}>
                            +{totalInscritos[d] - maximos[d]} max
                          </span>
                        )}
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--violet)", marginTop: 2 }}>
                          {fmt((ingresosPorDistancia[d] || 0))}
                        </span>
                      </div>
                    </td>
                  );
                })}
                <td className="text-right mono" style={{ paddingRight: 8 }}>
                  <div style={{ color: "var(--violet)", fontWeight: 800, fontSize: "var(--fs-lg)" }}>
                    {fmt(ingresosPorDistancia.total)}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-base)", marginTop: 2 }}>
                    {totalInscritos.total} ctes totales
                    {codigos.filter(c => c.estado === "usado").length > 0 && (
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                        marginLeft: "0.4rem", padding: "0.05rem 0.3rem",
                        borderRadius: 3, background: "rgba(167,139,250,.15)",
                        color: "var(--violet)", border: "1px solid rgba(167,139,250,.25)", fontWeight: 700,
                      }}>
                        🎟️ {codigos.filter(c => c.estado === "usado").length} promo
                      </span>
                    )}
                  </div>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CÓDIGOS PROMOCIONALES — componente propio ── */}
      <SeccionCodigos
        codigos={codigos}
        setCodigos={setCodigos}
        codigosLoading={codigosLoading}
        rawCodigosInit={rawCodigosInit}
        setCodigosInit={setCodigosInit}
      />

      {/* ── Modal confirmación eliminar tramo ── */}
      {pendingDelete && (
        <ModalConfirmDelete
          tramo={pendingDelete.tramo}
          stats={pendingDelete.stats}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {/* ── Modal importación CSV ── */}
      {csvModalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
          }}
          onClick={e => e.target === e.currentTarget && setCsvModalOpen(false)}
        >
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 16, padding: "1.75rem", maxWidth: 560, width: "100%",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)", animation: "slideUp 0.2s ease",
            maxHeight: "85vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 800, fontSize: "var(--fs-md)" }}>📥 Importar inscritos desde CSV</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setCsvModalOpen(false)}>✕</button>
            </div>

            <div style={{
              background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)",
              borderRadius: 10, padding: ".75rem 1rem", marginBottom: "1rem",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", lineHeight: 1.8,
            }}>
              <div style={{ color: "var(--violet)", fontWeight: 700, marginBottom: ".25rem" }}>Formato esperado del CSV:</div>
              <div>Columnas (en cualquier orden): <strong>distancia</strong>, <strong>tramo</strong>, <strong>numero</strong></div>
              <div>Separador: coma (<code>,</code>) o punto y coma (<code>;</code>) — detectado automáticamente</div>
              <div>Distancias válidas: <strong>TG7</strong>, <strong>TG13</strong>, <strong>TG25</strong></div>
              <div>Los nombres de tramo deben coincidir con los tramos configurados en esta tab.</div>
              <div style={{ marginTop: ".3rem" }}>Tamaño máximo: 2 MB</div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <input ref={csvInputRef} type="file" accept=".csv,.txt" onChange={handleCsvFile}
                style={{ display: "none" }} id="csv-upload-input" />
              <label htmlFor="csv-upload-input" className="btn btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                📂 Seleccionar archivo CSV
              </label>
            </div>

            {csvPreview && (
              <div>
                {csvPreview.errors.length > 0 && (
                  <div style={{
                    background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.25)",
                    borderRadius: 8, padding: ".65rem .9rem", marginBottom: ".75rem",
                  }}>
                    <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--amber)", marginBottom: ".35rem" }}>
                      ⚠️ {csvPreview.errors.length} fila{csvPreview.errors.length !== 1 ? "s" : ""} con error de formato (se ignorarán):
                    </div>
                    {csvPreview.errors.slice(0, 5).map((e, i) => (
                      <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>{e}</div>
                    ))}
                    {csvPreview.errors.length > 5 && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
                        ...y {csvPreview.errors.length - 5} más
                      </div>
                    )}
                  </div>
                )}

                {csvPreview.rows.length > 0 ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--green)", marginBottom: ".5rem" }}>
                      ✅ {csvPreview.rows.length} fila{csvPreview.rows.length !== 1 ? "s" : ""} válida{csvPreview.rows.length !== 1 ? "s" : ""} — preview (primeras 5):
                    </div>
                    <div className="overflow-x" style={{ marginBottom: ".75rem" }}>
                      <table className="tbl" style={{ minWidth: 300, fontSize: "var(--fs-xs)" }}>
                        <thead>
                          <tr>
                            <th>Distancia</th><th>Tramo</th><th className="text-right">Número</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.rows.slice(0, 5).map((r, i) => (
                            <tr key={i}>
                              <td style={{ fontFamily: "var(--font-mono)", color: "var(--violet)" }}>{r.distancia}</td>
                              <td style={{ color: "var(--text)" }}>{r.tramo}</td>
                              <td className="text-right" style={{ fontFamily: "var(--font-mono)" }}>{r.numero}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {Object.keys(inscritos?.tramos || {}).some(tid => Object.values(inscritos.tramos[tid] || {}).some(v => v > 0)) && (
                      <div style={{
                        background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.2)",
                        borderRadius: 8, padding: ".65rem .9rem", marginBottom: ".75rem",
                      }}>
                        <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--red)", marginBottom: ".5rem" }}>
                          ⚠️ Ya existen datos de inscritos. ¿Cómo quieres proceder?
                        </div>
                        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                          {[
                            { v: "reemplazar", label: "🔄 Reemplazar", desc: "Sobreescribir los valores actuales de cada tramo/distancia del CSV" },
                            { v: "sumar",      label: "➕ Sumar",      desc: "Añadir los valores del CSV a los ya existentes" },
                          ].map(opt => (
                            <label key={opt.v} style={{
                              display: "flex", alignItems: "flex-start", gap: ".5rem",
                              cursor: "pointer", flex: "1 1 160px",
                              background: csvMergeMode === opt.v ? "rgba(167,139,250,.1)" : "transparent",
                              border: `1px solid ${csvMergeMode === opt.v ? "rgba(167,139,250,.4)" : "var(--border)"}`,
                              borderRadius: 8, padding: ".5rem .65rem",
                            }}>
                              <input type="radio" value={opt.v} checked={csvMergeMode === opt.v}
                                onChange={() => setCsvMergeMode(opt.v)}
                                style={{ marginTop: "2px", accentColor: "var(--violet)", flexShrink: 0 }} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)" }}>{opt.label}</div>
                                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", lineHeight: 1.5 }}>{opt.desc}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end" }}>
                      <button className="btn btn-ghost" onClick={() => setCsvPreview(null)}>← Volver</button>
                      <button className="btn btn-primary" onClick={handleCsvConfirm}>
                        Confirmar importación ({csvPreview.rows.length} filas)
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--red)", padding: ".5rem 0" }}>
                    ❌ No se encontraron filas válidas en el archivo.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mensaje resultado importación ── */}
      {csvMsg && !csvModalOpen && (
        <div style={{
          position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
          zIndex: 9997, maxWidth: 520,
          background: csvMsg.type === "success" ? "rgba(52,211,153,.12)" : "rgba(248,113,113,.12)",
          border: `1px solid ${csvMsg.type === "success" ? "rgba(52,211,153,.35)" : "rgba(248,113,113,.35)"}`,
          color: csvMsg.type === "success" ? "var(--green)" : "var(--red)",
          borderRadius: 10, padding: ".75rem 1.1rem",
          fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700,
          display: "flex", alignItems: "center", gap: ".75rem",
          boxShadow: "0 8px 32px rgba(0,0,0,.4)",
        }}>
          <span style={{ flex: 1 }}>{csvMsg.text}</span>
          <button onClick={() => setCsvMsg(null)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontSize: "var(--fs-base)", opacity: .7 }}>
            ✕
          </button>
        </div>
      )}
    </>
  );
};
