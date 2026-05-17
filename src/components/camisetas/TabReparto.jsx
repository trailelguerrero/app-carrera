/**
 * TabReparto.jsx — Pestaña "Reparto del día" (MEJ-04)
 * Lista plana de todas las líneas de camiseta para gestionar la entrega
 * durante el evento. Filtrable por nombre, teléfono y talla.
 *
 * Props:
 *   pedidos     {Array}    — array de pedidos del orquestador Camisetas.jsx
 *   updateLinea {Function} — (pedId, lineaId, campo, valor) → actualiza una línea
 *   rawVols     {Array}    — array de voluntarios (para enriquecer el puesto)
 *
 * Extraído de Camisetas.jsx (líneas 37-238) como parte de MEJ-04.
 */
import { useState, useMemo } from "react";

export function TabReparto({ pedidos, updateLinea, rawVols }) {
  const [busqueda, setBusqueda] = useState("");
  const [soloSinEntregar, setSoloSinEntregar] = useState(true);

  // Construir lista plana de todas las líneas con su pedido padre
  const todasLineas = useMemo(() => {
    const vols = Array.isArray(rawVols) ? rawVols : [];
    return pedidos.flatMap(p =>
      p.lineas.map(l => {
        // Buscar puesto del voluntario si es tipo voluntario
        let puestoNombre = "";
        if (l.tipo === "voluntario" || l.tipo === "extra-voluntario" || l._esImportacionVol) {
          const vol = vols.find(v => {
            const nc = ((v.nombre || "") + " " + (v.apellidos || "")).toLowerCase().trim();
            const np = (p.nombre || "").toLowerCase().trim();
            return nc === np || nc.includes(np) || np.includes(nc);
          });
          if (vol?.puestoId) {
            puestoNombre = `Puesto #${vol.puestoId}`;
          }
        }
        return {
          ...l,
          pedNombre: p.nombre,
          pedTelefono: p.telefono || "",
          pedId: p.id,
          _puestoNombre: puestoNombre,
        };
      })
    );
  }, [pedidos, rawVols]);

  const filtradas = useMemo(() => {
    let lista = todasLineas;
    if (soloSinEntregar) lista = lista.filter(l => (l.estadoEntrega || "pendiente") !== "entregado");
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(l =>
        (l.pedNombre || "").toLowerCase().includes(q) ||
        (l.pedTelefono || "").includes(q) ||
        (l.talla || "").toLowerCase().includes(q)
      );
    }
    // Ordenar: voluntarios primero (por puesto), luego corredores (por tipo/talla), resto
    return [...lista].sort((a, b) => {
      const tipoOrd = t => t === "voluntario" || t === "extra-voluntario" ? 0 : t === "corredor" ? 1 : 2;
      if (tipoOrd(a.tipo) !== tipoOrd(b.tipo)) return tipoOrd(a.tipo) - tipoOrd(b.tipo);
      return (a._puestoNombre || "").localeCompare(b._puestoNombre || "") ||
             (a.pedNombre || "").localeCompare(b.pedNombre || "");
    });
  }, [todasLineas, soloSinEntregar, busqueda]);

  const totalPendientes = todasLineas.filter(l => (l.estadoEntrega || "pendiente") !== "entregado").length;
  const totalEntregados = todasLineas.filter(l => l.estadoEntrega === "entregado").length;
  const pct = todasLineas.length > 0 ? Math.round((totalEntregados / todasLineas.length) * 100) : 0;

  if (todasLineas.length === 0) {
    return (
      <div className="ph" style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, gap: ".5rem" }}>
        <div style={{ fontSize: "var(--fs-xl)" }}>📦</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
          No hay camisetas registradas todavía.
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
          Añade pedidos en la pestaña "Extras y familiares" o importa las tallas de voluntarios.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="ph">
        <div>
          <div className="pt">📦 Reparto del día</div>
          <div className="pd">{totalPendientes} pendientes · {totalEntregados} entregadas · {pct}% completado</div>
        </div>
      </div>

      {/* ── Barra de progreso ── */}
      <div style={{ height: 6, background: "var(--surface2)", borderRadius: 4, margin: "0 0 .85rem", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: pct === 100 ? "var(--green)" : "linear-gradient(90deg, var(--cyan), var(--primary))",
          borderRadius: 4, transition: "width .4s ease",
        }} />
      </div>

      {/* ── Filtros ── */}
      <div style={{ display: "flex", gap: ".6rem", alignItems: "center", marginBottom: ".75rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <input
            className="inp"
            placeholder="🔍 Buscar por nombre, teléfono o talla..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ paddingRight: busqueda ? "2rem" : undefined }}
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} style={{
              position: "absolute", right: ".5rem", top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "var(--fs-sm)",
            }}>×</button>
          )}
        </div>
        <button
          className={`btn btn-sm${soloSinEntregar ? " btn-amber" : " btn-ghost"}`}
          onClick={() => setSoloSinEntregar(v => !v)}
        >
          {soloSinEntregar ? "⏳ Solo pendientes" : "👁 Todas"}
        </button>
      </div>

      {/* ── Lista ── */}
      {filtradas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
          {soloSinEntregar && totalPendientes === 0
            ? "🎉 ¡Todas las camisetas han sido entregadas!"
            : "No hay resultados para esta búsqueda."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
          {filtradas.map((l, i) => {
            const entregado = l.estadoEntrega === "entregado";
            const tipoColor = l.tipo === "voluntario" || l.tipo === "extra-voluntario"
              ? "var(--cyan)" : l.tipo === "corredor" ? "var(--violet)" : "var(--green)";
            const tipoLabel = l.tipo === "voluntario" || l.tipo === "extra-voluntario"
              ? "Voluntario" : l.tipo === "corredor" ? "Corredor" : "Extra";
            return (
              <div key={`${l.pedId}-${l.id}-${i}`} style={{
                display: "flex", alignItems: "center", gap: ".75rem",
                padding: ".65rem .85rem", borderRadius: 8,
                background: entregado ? "rgba(52,211,153,0.04)" : "var(--surface2)",
                border: `1px solid ${entregado ? "rgba(52,211,153,0.2)" : "var(--border)"}`,
                opacity: entregado ? 0.6 : 1,
                transition: "all .15s",
              }}>
                {/* Checkbox táctil grande */}
                <button
                  onClick={() => updateLinea(l.pedId, l.id, "estadoEntrega", entregado ? "pendiente" : "entregado")}
                  title={entregado ? "Marcar como pendiente" : "Marcar como entregada"}
                  style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    border: `2px solid ${entregado ? "var(--green)" : "var(--border-light)"}`,
                    background: entregado ? "var(--green-dim)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all .15s", fontSize: "var(--fs-sm)",
                  }}
                >
                  {entregado ? <span style={{ color: "var(--green)", fontWeight: 900 }}>✓</span> : null}
                </button>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".4rem", marginBottom: ".15rem", flexWrap: "wrap" }}>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--fs-xs)",
                      color: tipoColor, background: tipoColor + "18",
                      border: `1px solid ${tipoColor}30`, padding: ".05rem .3rem", borderRadius: 3,
                    }}>
                      {tipoLabel}
                    </span>
                    {l._puestoNombre && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
                        {l._puestoNombre}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)", color: entregado ? "var(--text-muted)" : "var(--text)", textDecoration: entregado ? "line-through" : "none" }}>
                    {l.pedNombre || "—"}
                  </div>
                  {l.pedTelefono && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
                      {l.pedTelefono}
                    </div>
                  )}
                </div>

                {/* Talla + cantidad */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontWeight: 800,
                    fontSize: "var(--fs-base)", color: entregado ? "var(--text-muted)" : "var(--text)",
                  }}>
                    {l.talla || "?"}
                  </div>
                  {l.cantidad > 1 && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
                      × {l.cantidad}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
