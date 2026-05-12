/**
 * MiniTimeline.jsx — extraído de Dashboard.jsx (Tarea 3.4)
 * Timeline de hitos y tramos del evento.
 */
import { blockCls as cls } from "@/lib/blockStyles";

export function MiniTimeline({ hitos, tramos, eventoFecha, diasHasta, yaFue, navigate }) {
  const hoy = new Date();

  // Rango: inicio = hoy - 90d (o primer fechaFin de tramo si es antes), fin = evento + 14d
  const primerTramo = tramos?.length > 0
    ? new Date(Math.min(...tramos.map(t => new Date(t.fechaFin).getTime())))
    : null;
  const inicio = primerTramo && primerTramo < hoy
    ? new Date(primerTramo.getTime() - 7 * 86400000)
    : new Date(hoy.getTime() - 60 * 86400000);
  const fin = eventoFecha
    ? new Date(new Date(eventoFecha).getTime() + 14 * 86400000)
    : new Date(hoy.getTime() + 30 * 86400000);
  const totalMs = fin - inicio;

  const pct = (fecha) => {
    if (!fecha) return null;
    const p = (new Date(fecha) - inicio) / totalMs * 100;
    return Math.max(2, Math.min(98, p));
  };

  const hoyPct = pct(hoy);
  const eventoPct = eventoFecha ? pct(eventoFecha) : null;

  // Hitos críticos con fecha válida dentro del rango
  const hitosMarcados = (hitos || [])
    .filter(h => h.fecha && !h.completado)
    .map(h => ({ ...h, p: pct(h.fecha) }))
    .filter(h => h.p !== null)
    .slice(0, 6);

  // Tramos: barras de apertura
  const tramosValidos = (tramos || [])
    .filter(t => t.fechaFin)
    .map(t => ({ ...t, p: pct(t.fechaFin) }))
    .filter(t => t.p !== null);

  const fmtFecha = (d) => new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });

  return (
    <div className="card dash-chart-card" style={{ padding: "0.85rem" }}>
      <div className="card-title amber" style={{ marginBottom: ".85rem" }}>📅 Arco temporal</div>

      {/* Barra principal del timeline */}
      <div style={{ position: "relative", height: 56, margin: "0.4rem 0 0.6rem" }}>

        {/* Track fondo */}
        <div style={{
          position: "absolute", top: 24, left: 0, right: 0, height: 4,
          background: "var(--surface3)", borderRadius: 2
        }} />

        {/* Relleno hasta el evento */}
        {eventoPct !== null && (
          <div style={{
            position: "absolute", top: 24, left: 0, width: `${eventoPct}%`,
            height: 4, borderRadius: 2, opacity: 0.5,
            background: "linear-gradient(90deg, var(--cyan), var(--violet))",
            transition: "width .5s"
          }} />
        )}

        {/* Cierres de tramo — líneas verticales pequeñas */}
        {tramosValidos.map(t => (
          <div key={t.id} title={`Cierre tramo: ${t.nombre}`}
            style={{
              position: "absolute", top: 18, left: `${t.p}%`,
              width: 2, height: 12, background: "rgba(34,211,238,0.35)",
              transform: "translateX(-50%)", borderRadius: 1
            }} />
        ))}

        {/* Hitos críticos — diamantes */}
        {hitosMarcados.map(h => (
          <div key={h.id}
            title={`${h.nombre} — ${fmtFecha(h.fecha)}`}
            onClick={() => navigate("proyecto")}
            style={{
              position: "absolute", top: h.critico ? 14 : 17,
              left: `${h.p}%`, transform: "translateX(-50%) rotate(45deg)",
              width: h.critico ? 10 : 7, height: h.critico ? 10 : 7,
              background: h.critico ? "var(--amber)" : "var(--violet)",
              border: "1.5px solid var(--surface)",
              cursor: "pointer", borderRadius: 1,
              boxShadow: h.critico ? "0 0 6px rgba(251,191,36,0.5)" : "none"
            }} />
        ))}

        {/* Marcador HOY */}
        <div style={{
          position: "absolute", top: 8, left: `${hoyPct}%`,
          transform: "translateX(-50%)", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 0
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)",
            color: "var(--cyan)", fontWeight: 800, letterSpacing: ".04em",
            lineHeight: 1, marginBottom: 2
          }}>HOY</div>
          <div style={{
            width: 2, height: 24, background: "var(--cyan)",
            borderRadius: 1, boxShadow: "0 0 8px rgba(34,211,238,0.5)"
          }} />
        </div>

        {/* Marcador del evento */}
        {eventoPct !== null && (
          <div title={yaFue ? "Evento completado" : "Día del evento"}
            style={{
              position: "absolute", top: 6, left: `${eventoPct}%`,
              transform: "translateX(-50%)", fontSize: "var(--fs-lg)",
              cursor: "default", lineHeight: 1
            }}>
            {yaFue ? "✅" : "🏁"}
          </div>
        )}
      </div>

      {/* Leyenda inferior */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)"
      }}>
        <span>{fmtFecha(inicio)}</span>
        <span style={{
          color: yaFue ? "var(--green)" : diasHasta <= 7 ? "var(--red)" : diasHasta <= 30 ? "var(--amber)" : "var(--cyan)",
          fontWeight: 700, fontSize: "var(--fs-sm)",
        }}>
          {yaFue ? "¡Evento completado!" : diasHasta === 0 ? "¡HOY es el evento!" : `${diasHasta}d para el evento`}
        </span>
        {eventoFecha && <span>{fmtFecha(eventoFecha)}</span>}
      </div>

      {/* Mini-lista de próximos hitos críticos */}
      {hitosMarcados.filter(h => h.critico).length > 0 && (
        <div style={{
          marginTop: ".65rem", paddingTop: ".5rem",
          borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: ".25rem"
        }}>
          {hitosMarcados.filter(h => h.critico).slice(0, 3).map(h => {
            const dias = Math.ceil((new Date(h.fecha) - hoy) / 86400000);
            const col = dias < 0 ? "var(--red)" : dias <= 7 ? "var(--amber)" : "var(--text-muted)";
            return (
              <div key={h.id} onClick={() => navigate("proyecto")}
                style={{
                  display: "flex", justifyContent: "space-between", cursor: "pointer",
                  padding: ".15rem .1rem", borderRadius: 3
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{
                  fontSize: "var(--fs-xs)", color: "var(--text-muted)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1
                }}>
                  ⚡ {h.nombre}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                  color: col, fontWeight: 700, flexShrink: 0, marginLeft: ".5rem"
                }}>
                  {dias < 0 ? `${Math.abs(dias)}d atrás` : dias === 0 ? "HOY" : `${dias}d`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
