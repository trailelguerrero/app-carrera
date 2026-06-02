/**
 * SemaforoRiesgos.jsx — MEJ-07 · MEJ-06 · MEJ-16
 * Panel ejecutivo de riesgo RAG (Rojo/Ámbar/Verde) con 4 dimensiones.
 *
 * MEJ-06: React.memo — calcSemaforoRiesgos es costoso (score de 4 áreas).
 * No debe re-ejecutarse cuando el usuario expande la barra de salud.
 *
 * MEJ-16: expand inline por zona para ver z.detalles completos sin navegar.
 * El estado de expand es local a SemaforoRiesgos — el Dashboard padre no re-renderiza.
 */
import { useMemo, memo, useState, useCallback } from "react";
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

export const SemaforoRiesgos = memo(function SemaforoRiesgos({ kpis, onNavigate, moduleStatus }) {
  const { zonas, estadoGlobal, scoreGlobal, razonGlobal } =
    useMemo(() => calcSemaforoRiesgos(kpis), [kpis]);

  // MEJ-16: qué zona tiene los detalles expandidos (null = ninguna)
  const [zonaExpandida, setZonaExpandida] = useState(null);

  const toggleDetalle = useCallback((area, e) => {
    e.stopPropagation(); // no navegar al módulo
    setZonaExpandida(prev => prev === area ? null : area);
  }, []);

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
        {zonas.map((z, i) => {
          const expandido = zonaExpandida === z.area;
          const tieneDetalles = z.detalles.length > 1;
          return (
            <div
              key={z.area}
              style={{
                borderRight:  i < zonas.length - 1 ? "1px solid var(--border)" : "none",
                borderBottom: "none",
              }}
            >
              {/* Zona principal — click navega al módulo */}
              <div
                onClick={() => onNavigate?.(z)}
                style={{
                  padding:    ".65rem .85rem",
                  cursor:     onNavigate ? "pointer" : "default",
                  transition: "background .12s",
                  paddingBottom: tieneDetalles ? ".45rem" : ".65rem",
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
                  {/* Indicador de refresco granular */}
                  {moduleStatus && (() => {
                    const mapaZona = {
                      "Permisos":   "documentos",
                      "Económico":  "presupuesto",
                      "Logístico":  "logistica",
                      "Operativo":  "proyecto",
                    };
                    const mod = mapaZona[z.area];
                    return mod && moduleStatus[mod]?.isLoading
                      ? <span style={{ fontSize: "var(--fs-xs)", opacity: 0.5, animation: "pulse 1s infinite" }}>⟳</span>
                      : null;
                  })()}
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
              </div>

              {/* MEJ-16: botón "Ver detalles" — solo si hay más de 1 detalle */}
              {tieneDetalles && (
                <button
                  onClick={(e) => toggleDetalle(z.area, e)}
                  style={{
                    display:     "flex",
                    alignItems:  "center",
                    gap:         ".25rem",
                    width:       "100%",
                    padding:     ".25rem .85rem .5rem",
                    background:  "transparent",
                    border:      "none",
                    cursor:      "pointer",
                    fontFamily:  "var(--font-mono)",
                    fontSize:    "var(--fs-xs)",
                    color:       "var(--text-dim)",
                    textAlign:   "left",
                  }}
                >
                  <span style={{
                    display:    "inline-block",
                    transition: "transform .15s",
                    transform:  expandido ? "rotate(90deg)" : "rotate(0deg)",
                    fontSize:   "0.6rem",
                  }}>▶</span>
                  {expandido ? "Ocultar" : `+${z.detalles.length - 1} más`}
                </button>
              )}

              {/* MEJ-16: panel de detalles expandido */}
              {expandido && (
                <div style={{
                  padding:      "0 .85rem .65rem",
                  borderTop:    `1px solid ${BORDER[z.estado]}`,
                  background:   BG[z.estado],
                }}>
                  {z.detalles.map((det, di) => (
                    <div
                      key={di}
                      style={{
                        fontFamily:  "var(--font-mono)",
                        fontSize:    "var(--fs-xs)",
                        color:       z.estado === "verde" ? "var(--text-dim)" : COLOR[z.estado],
                        padding:     ".3rem 0",
                        borderBottom: di < z.detalles.length - 1 ? `1px solid ${BORDER[z.estado]}` : "none",
                        lineHeight:  1.4,
                        display:     "flex",
                        gap:         ".4rem",
                        alignItems:  "flex-start",
                      }}
                    >
                      <span style={{ flexShrink: 0, opacity: 0.6 }}>·</span>
                      <span>{det}</span>
                    </div>
                  ))}
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate(z)}
                      style={{
                        marginTop:  ".4rem",
                        background: "transparent",
                        border:     `1px solid ${BORDER[z.estado]}`,
                        borderRadius: 4,
                        padding:    ".2rem .5rem",
                        fontFamily: "var(--font-mono)",
                        fontSize:   "var(--fs-xs)",
                        color:      COLOR[z.estado],
                        cursor:     "pointer",
                      }}
                    >
                      Ir a {z.area} →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
