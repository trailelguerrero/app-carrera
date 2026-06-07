// ModalReasignar — asignar / desasignar / intercambiar voluntarios entre puestos
import { useState, useMemo, useEffect, useRef } from "react";
import { useModalClose } from "@/hooks/useModalClose";

/**
 * Props:
 *   voluntario      — objeto voluntario a reasignar (con .nombre, .apellidos, .puestoId)
 *   puestos         — array de puestos con stats (necesarios, totalAsignados, voluntariosAsignados)
 *   voluntarios     — todos los voluntarios (para mostrar quién hay en cada puesto al intercambiar)
 *   onReasignar     — fn(volId, nuevoPuestoId|null) → void
 *   onIntercambiar  — fn(volIdA, volIdB) → void  (swap de puestos entre dos voluntarios)
 *   onClose         — fn() → void
 */
export function ModalReasignar({ voluntario, puestos, voluntarios, onReasignar, onIntercambiar, onClose }) {
  const { closing, handleClose } = useModalClose(onClose);
  const [busqueda, setBusqueda] = useState("");
  const [modoIntercambio, setModoIntercambio] = useState(false);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  const puestoActual = puestos.find(p => String(p.id) === String(voluntario.puestoId));

  const puestosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return puestos
      .filter(p => String(p.id) !== String(voluntario.puestoId)) // excluir el actual
      .filter(p => !q || p.nombre.toLowerCase().includes(q) || (p.tipo || "").toLowerCase().includes(q))
      .sort((a, b) => {
        // Primero los que tienen déficit
        const defA = Math.max(0, (a.necesarios || 0) - a.totalAsignados);
        const defB = Math.max(0, (b.necesarios || 0) - b.totalAsignados);
        return defB - defA;
      });
  }, [puestos, voluntario.puestoId, busqueda]);

  // Voluntarios del puesto destino seleccionado (para intercambio)
  const volsEnPuestoDestino = useMemo(() => {
    if (!puestoSeleccionado) return [];
    return voluntarios.filter(
      v => String(v.puestoId) === String(puestoSeleccionado.id) &&
           String(v.id) !== String(voluntario.id) &&
           v.estado !== "cancelado"
    );
  }, [puestoSeleccionado, voluntarios, voluntario.id]);

  const nombreVol = [voluntario.nombre, voluntario.apellidos].filter(Boolean).join(" ") || "Este voluntario";

  function pctColor(p) {
    const pct = p.necesarios > 0 ? Math.round((p.totalAsignados / p.necesarios) * 100) : 0;
    return pct >= 100 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
  }

  function handleDesasignar() {
    onReasignar(voluntario.id, null);
    onClose();
  }

  function handleAsignarA(puesto) {
    if (modoIntercambio) {
      setPuestoSeleccionado(puesto);
      return;
    }
    onReasignar(voluntario.id, puesto.id);
    onClose();
  }

  function handleIntercambiar(volDestino) {
    onIntercambiar(voluntario.id, volDestino.id);
    onClose();
  }

  return (
    <div
      className={`modal-backdrop${closing ? " modal-backdrop-closing" : ""}`}
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <div className={`modal${closing ? " modal-closing" : ""}`} style={{ maxWidth: 520 }}>

        {/* ── Header ── */}
        <div className="modal-header">
          <span className="modal-title">
            {modoIntercambio && puestoSeleccionado
              ? `↔ Intercambiar con ${puestoSeleccionado.nombre}`
              : modoIntercambio
              ? "↔ Intercambiar puesto"
              : "🔄 Reasignar puesto"}
          </span>
          <button className="btn btn-ghost" style={{ padding: "0.2rem 0.5rem" }}
            onClick={handleClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="modal-body">

          {/* ── Voluntario actual ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: ".75rem",
            padding: ".65rem .85rem", borderRadius: 8,
            background: "var(--surface2)", border: "1px solid var(--border)",
            marginBottom: ".75rem",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "rgba(34,211,238,.1)", border: "1px solid rgba(34,211,238,.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "var(--fs-sm)",
              color: "var(--cyan)",
            }}>
              {([voluntario.nombre, voluntario.apellidos].filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase() || "V")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>{nombreVol}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: ".1rem" }}>
                Puesto actual: {puestoActual
                  ? <strong style={{ color: "var(--cyan)" }}>{puestoActual.nombre}</strong>
                  : <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}>Sin asignar</span>}
              </div>
            </div>
          </div>

          {/* ── Modo intercambio: selección de voluntario destino ── */}
          {modoIntercambio && puestoSeleccionado ? (
            <>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                color: "var(--text-muted)", marginBottom: ".5rem", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: ".05em",
              }}>
                ↔ Elige con quién intercambiar en «{puestoSeleccionado.nombre}»
              </div>
              {volsEnPuestoDestino.length === 0 ? (
                <div style={{
                  padding: ".85rem", borderRadius: 8, background: "var(--surface2)",
                  border: "1px solid var(--border)", textAlign: "center",
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)",
                }}>
                  No hay voluntarios activos en este puesto para intercambiar
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                  {volsEnPuestoDestino.map(vd => (
                    <button key={vd.id}
                      onClick={() => handleIntercambiar(vd)}
                      style={{
                        display: "flex", alignItems: "center", gap: ".65rem",
                        padding: ".55rem .75rem", borderRadius: 8, cursor: "pointer",
                        background: "var(--surface2)", border: "1px solid var(--border)",
                        textAlign: "left", transition: "all .13s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(34,211,238,.4)"; e.currentTarget.style.background = "rgba(34,211,238,.06)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface2)"; }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: "rgba(139,92,246,.1)", border: "1px solid rgba(139,92,246,.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "var(--fs-xs)",
                        color: "var(--violet)",
                      }}>
                        {([vd.nombre, vd.apellidos].filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase() || "V")}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)" }}>
                          {[vd.nombre, vd.apellidos].filter(Boolean).join(" ") || "Sin nombre"}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
                          {vd.estado} · {vd.rol || "apoyo"}
                        </div>
                      </div>
                      <span style={{
                        marginLeft: "auto", fontFamily: "var(--font-mono)",
                        fontSize: "var(--fs-xs)", color: "var(--cyan)", flexShrink: 0,
                      }}>↔ Intercambiar</span>
                    </button>
                  ))}
                </div>
              )}
              <button className="btn btn-ghost btn-sm"
                style={{ marginTop: ".65rem" }}
                onClick={() => setPuestoSeleccionado(null)}>
                ← Volver a puestos
              </button>
            </>
          ) : (
            <>
              {/* ── Modos: asignar / intercambiar ── */}
              <div style={{ display: "flex", gap: ".4rem", marginBottom: ".65rem" }}>
                <button
                  className={`btn btn-sm ${!modoIntercambio ? "btn-cyan" : "btn-ghost"}`}
                  onClick={() => setModoIntercambio(false)}>
                  📍 Asignar a puesto
                </button>
                <button
                  className={`btn btn-sm ${modoIntercambio ? "btn-cyan" : "btn-ghost"}`}
                  onClick={() => setModoIntercambio(true)}>
                  ↔ Intercambiar
                </button>
              </div>

              {/* ── Desasignar (solo si tiene puesto) ── */}
              {voluntario.puestoId != null && (
                <button
                  className="btn btn-ghost"
                  style={{
                    width: "100%", marginBottom: ".65rem", justifyContent: "center",
                    display: "flex", alignItems: "center", gap: ".4rem",
                    border: "1px solid rgba(248,113,113,.3)", color: "var(--red)",
                    padding: ".5rem",
                  }}
                  onClick={handleDesasignar}>
                  🚫 Desasignar de «{puestoActual?.nombre || "puesto actual"}»
                </button>
              )}

              {/* ── Buscador de puestos ── */}
              <input
                ref={searchRef}
                className="inp"
                placeholder="🔍 Buscar puesto…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ marginBottom: ".5rem" }}
              />

              {/* ── Lista de puestos destino ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: ".3rem", maxHeight: 320, overflowY: "auto" }}>
                {puestosFiltrados.length === 0 ? (
                  <div style={{
                    padding: ".75rem", borderRadius: 8, background: "var(--surface2)",
                    border: "1px solid var(--border)", textAlign: "center",
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)",
                  }}>
                    {busqueda ? "Sin resultados" : "No hay otros puestos"}
                  </div>
                ) : puestosFiltrados.map(p => {
                  const pct = p.necesarios > 0 ? Math.round((p.totalAsignados / p.necesarios) * 100) : 0;
                  const clr = pctColor(p);
                  const lleno = pct >= 100;
                  return (
                    <button key={p.id}
                      onClick={() => handleAsignarA(p)}
                      style={{
                        display: "flex", alignItems: "center", gap: ".65rem",
                        padding: ".5rem .75rem", borderRadius: 8, cursor: "pointer",
                        background: "var(--surface2)",
                        border: `1px solid ${lleno ? "rgba(52,211,153,.2)" : "var(--border)"}`,
                        textAlign: "left", transition: "all .13s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(34,211,238,.4)"; e.currentTarget.style.background = "rgba(34,211,238,.06)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = lleno ? "rgba(52,211,153,.2)" : "var(--border)"; e.currentTarget.style.background = "var(--surface2)"; }}>
                      {/* Indicador de cobertura */}
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: clr, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)", marginBottom: ".1rem" }}>
                          {p.nombre}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                          {p.tipo && <span>{p.tipo}</span>}
                          {p.horaInicio && <span>🕐 {p.horaInicio}–{p.horaFin}</span>}
                          {(p.distancias || []).length > 0 && <span>{p.distancias.join(", ")}</span>}
                        </div>
                      </div>
                      {/* Cobertura */}
                      <div style={{
                        flexShrink: 0, textAlign: "right",
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                      }}>
                        <div style={{ color: clr, fontWeight: 700 }}>
                          {p.totalAsignados}/{p.necesarios || "?"}
                        </div>
                        {!modoIntercambio && (
                          <div style={{ color: "var(--cyan)", marginTop: ".1rem" }}>
                            {modoIntercambio ? "↔" : "Asignar →"}
                          </div>
                        )}
                        {modoIntercambio && (
                          <div style={{ color: "var(--cyan)", marginTop: ".1rem" }}>↔ Ver</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={handleClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
