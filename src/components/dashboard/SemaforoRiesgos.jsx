/**
 * SemaforoRiesgos.jsx — MEJ-07
 * Panel ejecutivo de riesgo RAG (Rojo/Ámbar/Verde) con 4 dimensiones.
 */
import { useMemo } from "react";
import { calcSemaforoRiesgos } from "@/lib/semaforoRiesgos";

const COLOR = {
  verde: "var(--green)",
  ambar: "var(--amber)",
  rojo:  "var(--red)",
};
const BG = {
  verde: "rgba(52,211,153,.08)",
  ambar: "rgba(251,191,36,.08)",
  rojo:  "rgba(248,113,113,.08)",
};
const BORDER = {
  verde: "rgba(52,211,153,.25)",
  ambar: "rgba(251,191,36,.25)",
  rojo:  "rgba(248,113,113,.25)",
};
const LABEL = { verde: "BAJO", ambar: "MEDIO", rojo: "ALTO" };
const DOT   = { verde: "🟢",   ambar: "🟡",    rojo:  "🔴"   };

export function SemaforoRiesgos({ kpis, onNavigate }) {
  const { zonas, estadoGlobal, scoreGlobal, razonGlobal } =
    useMemo(() => calcSemaforoRiesgos(kpis), [kpis]);

  if (!kpis || zonas.length === 0) return null;

  return (
    <div className="card mb" style={{ padding: 0, overflow: "hidden" }}>

      {/* ── Cabecera con estado global ── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        gap:            ".75rem",
        padding:        ".65rem 1rem",
        background:     BG[estadoGlobal],
        borderBottom:   `1px solid ${BORDER[estadoGlobal]}`,
      }}>
        <div style={{ fontSize: "1.25rem", flexShrink: 0 }}>
          {estadoGlobal === "verde" ? "✅" : estadoGlobal === "ambar" ? "⚠️" : "🚨"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontWeight: 700,
            fontSize:   "var(--fs-sm)", color: COLOR[estadoGlobal],
          }}>
            Riesgo global: {LABEL[estadoGlobal]}
            <span style={{ marginLeft: ".5rem", fontWeight: 400,
              color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>
              ({scoreGlobal}/100)
            </span>
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "var(--text-muted)", marginTop: ".1rem",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {razonGlobal}
          </div>
        </div>
      </div>

      {/* ── Grid de 4 zonas ── */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap:                 0,
      }}>
        {zonas.map((z, i) => (
          <div
            key={z.area}
            onClick={() => onNavigate?.(z)}
            style={{
              padding:       ".65rem .85rem",
              borderRight:   i < zonas.length - 1 ? "1px solid var(--border)" : "none",
              borderBottom:  "none",
              cursor:        onNavigate ? "pointer" : "default",
              transition:    "background .12s",
            }}
            onMouseEnter={e => { if (onNavigate) e.currentTarget.style.background = BG[z.estado]; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            {/* Título de zona */}
            <div style={{
              display:     "flex",
              alignItems:  "center",
              gap:         ".3rem",
              marginBottom: ".35rem",
            }}>
              <span style={{ fontSize: "var(--fs-sm)" }}>{z.icon}</span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                fontWeight: 600, color: "var(--text-muted)",
              }}>
                {z.area}
              </span>
            </div>

            {/* Indicador RAG + score */}
            <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              <span style={{ fontSize: "var(--fs-sm)", flexShrink: 0 }}>{DOT[z.estado]}</span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                fontWeight: 700, color: COLOR[z.estado],
              }}>
                {LABEL[z.estado]}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                color: "var(--text-dim)", marginLeft: "auto",
              }}>
                {z.score}
              </span>
            </div>

            {/* Mini barra de score */}
            <div style={{
              marginTop:   ".3rem",
              height:       3,
              borderRadius: 2,
              background:   "var(--surface3)",
              overflow:     "hidden",
            }}>
              <div style={{
                height:     "100%",
                width:      `${z.score}%`,
                background: COLOR[z.estado],
                borderRadius: 2,
                transition: "width .3s",
              }} />
            </div>

            {/* Razón / primer problema */}
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
              color: z.estado === "verde" ? "var(--text-dim)" : COLOR[z.estado],
              marginTop: ".3rem",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.35,
            }}>
              {z.razon}
            </div>

            {/* Detalles adicionales (hasta 2) */}
            {z.detalles.length > 1 && (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                color: "var(--text-dim)", marginTop: ".2rem",
              }}>
                +{z.detalles.length - 1} más
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
