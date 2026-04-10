import { useState, useEffect, useCallback } from "react";

const CAMPO_LABELS = {
  nombre:       "Nombre",
  activo:       "Activo",
  costeTotal:   "Importe total",
  modoUniforme: "Modo precio",
  estadoPago:   "Estado pago",
  estadoPedido: "Estado pedido",
  proveedor:    "Proveedor",
  contacto:     "Contacto",
  fechaPago:    "Fecha pago",
  fechaEntrega: "Fecha entrega",
  costeUnitarioReal: "Coste real (€/ud)",
};

const fmt = (campo, valor) => {
  if (valor === "" || valor === "undefined" || valor === "null") return "—";
  if (campo === "activo" || campo.includes("activo")) {
    return valor === "true" ? "✓ Activo" : "✗ Inactivo";
  }
  if (campo === "modoUniforme") {
    return valor === "true" ? "= Igual en todas" : "≠ Por distancia";
  }
  if (campo.startsWith("precio")) {
    return `${parseFloat(valor).toFixed(2)} €`;
  }
  if (campo === "costeTotal" || campo === "costeUnitarioReal") {
    const n = parseFloat(valor);
    return isNaN(n) ? valor : `${n.toFixed(2)} €`;
  }
  return valor;
};

const fmtTs = (ts) => {
  const d = new Date(ts);
  return d.toLocaleString("es-ES", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
};

const TIPO_COLOR = { fijo: "var(--cyan)", variable: "var(--green)" };

export function TabHistorial() {
  const [log,     setLog]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/budget-log?limit=100", {
        headers: { "x-api-key": import.meta.env.VITE_API_KEY },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setLog(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const borrarHistorial = async () => {
    await fetch("/api/budget-log", {
      method: "DELETE",
      headers: { "x-api-key": import.meta.env.VITE_API_KEY },
    });
    setLog([]);
    setConfirm(false);
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "3rem",
      fontFamily: "var(--font-mono)", fontSize: ".75rem", color: "var(--text-muted)" }}>
      Cargando historial…
    </div>
  );

  if (error) return (
    <div style={{ textAlign: "center", padding: "3rem",
      fontFamily: "var(--font-mono)", fontSize: ".75rem", color: "var(--red)" }}>
      Error al cargar el historial: {error}
    </div>
  );

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: ".85rem" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: ".88rem" }}>🕐 Historial de cambios</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem",
            color: "var(--text-muted)", marginTop: ".1rem" }}>
            Últimos {log.length} cambios en costes e ingresos
          </div>
        </div>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button onClick={load} className="btn btn-ghost btn-sm">↺ Actualizar</button>
          {log.length > 0 && (
            <button onClick={() => setConfirm(true)} className="btn btn-red btn-sm">
              🗑 Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Lista de cambios */}
      {log.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem",
          color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: ".75rem" }}>
          Sin cambios registrados.<br/>
          Los cambios en costes e ingresos aparecerán aquí.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
          {log.map((entry, i) => {
            const campoLabel = CAMPO_LABELS[entry.campo] || entry.campo;
            const color = TIPO_COLOR[entry.tipo] || "var(--text-muted)";
            const isPrice = entry.campo.startsWith("precio") ||
                            entry.campo === "costeTotal" ||
                            entry.campo === "costeUnitarioReal";
            const antes  = fmt(entry.campo, entry.valor_antes);
            const nuevo  = fmt(entry.campo, entry.valor_nuevo);
            const subio  = isPrice && parseFloat(entry.valor_nuevo) > parseFloat(entry.valor_antes);
            const bajo   = isPrice && parseFloat(entry.valor_nuevo) < parseFloat(entry.valor_antes);

            return (
              <div key={entry.id || i} style={{
                display: "flex", gap: ".75rem", alignItems: "flex-start",
                padding: ".55rem .75rem", borderRadius: 8,
                background: "var(--surface)", border: "1px solid var(--border)",
              }}>
                {/* Indicador tipo */}
                <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2,
                  background: color, flexShrink: 0, marginTop: ".1rem" }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Concepto + campo */}
                  <div style={{ display: "flex", alignItems: "center",
                    gap: ".5rem", marginBottom: ".2rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: ".78rem" }}>
                      {entry.concepto}
                    </span>
                    {entry.tipo && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: ".55rem",
                        color, background: `${color}15`,
                        border: `1px solid ${color}33`,
                        borderRadius: 3, padding: ".05rem .35rem" }}>
                        {entry.tipo}
                      </span>
                    )}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: ".62rem",
                      color: "var(--text-muted)" }}>
                      → {campoLabel}
                    </span>
                  </div>

                  {/* Antes → Después */}
                  <div style={{ display: "flex", alignItems: "center",
                    gap: ".5rem", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem",
                      color: "var(--text-dim)",
                      textDecoration: antes !== "—" ? "line-through" : "none" }}>
                      {antes}
                    </span>
                    <span style={{ color: "var(--text-dim)", fontSize: ".65rem" }}>→</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: ".7rem",
                      fontWeight: 700,
                      color: subio ? "var(--red)" : bajo ? "var(--green)" : "var(--text)" }}>
                      {subio ? "↑ " : bajo ? "↓ " : ""}{nuevo}
                    </span>
                  </div>
                </div>

                {/* Timestamp */}
                <div style={{ fontFamily: "var(--font-mono)", fontSize: ".57rem",
                  color: "var(--text-dim)", flexShrink: 0, textAlign: "right",
                  paddingTop: ".1rem" }}>
                  {fmtTs(entry.ts)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal confirmación borrar */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onClick={() => setConfirm(false)}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "1.5rem", maxWidth: 320, textAlign: "center",
            margin: "1rem" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "2rem", marginBottom: ".5rem" }}>🗑</div>
            <div style={{ fontWeight: 700, marginBottom: ".4rem" }}>¿Borrar historial?</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem",
              color: "var(--text-muted)", marginBottom: "1rem" }}>
              Se eliminarán todos los {log.length} registros. No se puede deshacer.
            </div>
            <div style={{ display: "flex", gap: ".5rem", justifyContent: "center" }}>
              <button onClick={() => setConfirm(false)} className="btn btn-ghost">
                Cancelar
              </button>
              <button onClick={borrarHistorial} className="btn btn-red">
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
