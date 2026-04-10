import { useState, useEffect, useMemo } from "react";
import { useData } from "@/lib/dataService";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { BLOCK_CSS } from "@/lib/blockStyles";

const LS_LOG = "teg_logistica_v1";
const LS_VOL = "teg_voluntarios_v1";

// ─── COLORES CATEGORÍA TIMELINE ───────────────────────────────────────────────
const CAT_COLOR = {
  logistica:    "#fbbf24",
  organizacion: "#a78bfa",
  voluntarios:  "#34d399",
  carrera:      "#22d3ee",
  comunicacion: "#fb923c",
};
const CAT_ICON = {
  logistica:    "🚚",
  organizacion: "📋",
  voluntarios:  "👥",
  carrera:      "🏃",
  comunicacion: "📡",
};
const TIPO_CONTACTO_COLOR = {
  emergencia:   "#f87171",
  institucional: "#a78bfa",
  proveedor:    "#22d3ee",
  staff:        "#34d399",
};

const DC_CSS = `
  .dc-wrap {
    position: fixed; inset: 0;
    background: var(--bg);
    z-index: 200;
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .dc-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: .65rem 1rem;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .dc-title {
    font-family: var(--font-display); font-weight: 800;
    font-size: .95rem; color: var(--text);
  }
  .dc-subtitle {
    font-family: var(--font-mono); font-size: .58rem;
    color: var(--text-muted); margin-top: .1rem;
  }
  .dc-tabs {
    display: flex; gap: .3rem; overflow-x: auto;
    padding: .5rem 1rem; border-bottom: 1px solid var(--border);
    flex-shrink: 0; scrollbar-width: none;
  }
  .dc-tabs::-webkit-scrollbar { display: none; }
  .dc-tab {
    padding: .4rem .85rem; border-radius: 20px;
    font-family: var(--font-mono); font-size: .68rem; font-weight: 700;
    cursor: pointer; border: 1.5px solid var(--border);
    background: none; color: var(--text-muted); white-space: nowrap;
    transition: all .15s;
  }
  .dc-tab.active {
    background: rgba(34,211,238,.1); color: var(--cyan);
    border-color: rgba(34,211,238,.35);
  }
  .dc-body {
    flex: 1; overflow-y: auto;
    padding: .75rem 1rem;
    padding-bottom: 80px;
  }
  .dc-tl-item {
    display: flex; gap: .65rem;
    margin-bottom: .5rem;
    padding: .6rem .75rem;
    border-radius: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    transition: all .15s;
  }
  .dc-tl-item.done {
    opacity: .55;
    background: var(--surface2);
  }
  .dc-tl-hora {
    font-family: var(--font-mono); font-weight: 800;
    font-size: .8rem; color: var(--cyan);
    width: 40px; flex-shrink: 0; padding-top: .05rem;
  }
  .dc-tl-titulo {
    font-weight: 700; font-size: .82rem; line-height: 1.2;
    margin-bottom: .15rem;
  }
  .dc-tl-desc {
    font-family: var(--font-mono); font-size: .6rem;
    color: var(--text-muted); line-height: 1.5;
  }
  .dc-tl-resp {
    font-family: var(--font-mono); font-size: .58rem;
    color: var(--text-dim); margin-top: .2rem;
  }
  .dc-check-btn {
    width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
    border: 2px solid var(--border); background: transparent;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all .15s; margin-top: .1rem;
  }
  .dc-check-btn.checked {
    background: var(--green); border-color: var(--green);
  }
  .dc-vol-card {
    display: flex; align-items: center; gap: .6rem;
    padding: .6rem .75rem; border-radius: 10px;
    background: var(--surface); border: 1px solid var(--border);
    margin-bottom: .4rem;
  }
  .dc-vol-check {
    width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
    border: 2px solid var(--border); background: transparent;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all .15s;
  }
  .dc-vol-check.presente { background: var(--green); border-color: var(--green); }
  .dc-contacto {
    display: flex; align-items: center; gap: .6rem;
    padding: .6rem .75rem; border-radius: 10px;
    background: var(--surface); border: 1px solid var(--border);
    margin-bottom: .4rem;
  }
  .dc-puesto-card {
    padding: .75rem; border-radius: 10px;
    background: var(--surface); border: 1px solid var(--border);
    margin-bottom: .5rem;
  }
`;

export default function DiaCarrera({ onClose }) {
  const [tab, setTab] = useState("timeline");

  // ── Datos ──────────────────────────────────────────────────────────────────
  const [eventCfg]  = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config      = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };

  const [rawTl,  setTl]  = useData(LS_LOG + "_tl",   []);
  const [rawCont]        = useData(LS_LOG + "_cont",  []);
  const [rawCk,  setCk]  = useData(LS_LOG + "_ck",   []);
  const [rawPuestos]     = useData(LS_VOL + "_puestos", []);
  const [rawVols, setVols] = useData(LS_VOL + "_voluntarios", []);

  const tl       = Array.isArray(rawTl)  ? rawTl  : [];
  const contactos = Array.isArray(rawCont) ? rawCont : [];
  const ck       = Array.isArray(rawCk)  ? rawCk  : [];
  const puestos  = Array.isArray(rawPuestos) ? rawPuestos : [];
  const vols     = Array.isArray(rawVols) ? rawVols : [];

  // ── Reloj en tiempo real ──────────────────────────────────────────────────
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const horaActual = ahora.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  // ── Calcular próxima tarea del timeline ───────────────────────────────────
  const proxima = useMemo(() => {
    const hhmm = horaActual;
    return tl
      .filter(t => !t.done && t.hora >= hhmm)
      .sort((a, b) => a.hora.localeCompare(b.hora))[0] || null;
  }, [tl, horaActual]);

  // ── Stats voluntarios ─────────────────────────────────────────────────────
  const confirmados  = vols.filter(v => v.estado === "confirmado");
  const presentes    = vols.filter(v => v.presente);
  const emergencias  = contactos.filter(c => c.tipo === "emergencia");

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleTl = (id) =>
    setTl(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const togglePresente = (id) =>
    setVols(prev => prev.map(v => v.id === id ? { ...v, presente: !v.presente } : v));

  const TABS = [
    { id: "timeline",    label: "⏱ Timeline" },
    { id: "voluntarios", label: "👥 Voluntarios" },
    { id: "puestos",     label: "📍 Puestos" },
    { id: "emergencias", label: "🚨 Emergencias" },
    { id: "checklist",   label: "✅ Checklist" },
  ];

  return (
    <div className="dc-wrap">
      <style>{BLOCK_CSS + DC_CSS}</style>

      {/* Header */}
      <div className="dc-header">
        <div>
          <div className="dc-title">🏔️ Día de Carrera</div>
          <div className="dc-subtitle">
            {config.nombre} · {horaActual} ·{" "}
            <span style={{ color: "var(--green)" }}>
              {presentes.length}/{confirmados.length} voluntarios presentes
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: 8, color: "var(--text-muted)", cursor: "pointer",
            padding: ".35rem .7rem", fontFamily: "var(--font-mono)",
            fontSize: ".68rem", fontWeight: 700,
          }}>
          ✕ Salir
        </button>
      </div>

      {/* Tabs */}
      <div className="dc-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`dc-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Próxima tarea — siempre visible */}
      {proxima && (
        <div style={{
          padding: ".5rem 1rem", background: "rgba(34,211,238,.06)",
          borderBottom: "1px solid rgba(34,211,238,.15)",
          display: "flex", alignItems: "center", gap: ".65rem", flexShrink: 0,
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem",
            color: "var(--cyan)", fontWeight: 700 }}>PRÓXIMO</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: ".72rem",
            fontWeight: 700, color: "var(--cyan)" }}>{proxima.hora}</span>
          <span style={{ fontSize: ".78rem", fontWeight: 600, flex: 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {proxima.titulo}
          </span>
          <span style={{ fontSize: ".75rem" }}>{CAT_ICON[proxima.categoria] || "📌"}</span>
        </div>
      )}

      {/* Contenido */}
      <div className="dc-body">

        {/* ── TIMELINE ── */}
        {tab === "timeline" && (
          <>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem",
              color: "var(--text-muted)", marginBottom: ".65rem" }}>
              {tl.filter(t => t.done).length}/{tl.length} completados
            </div>
            {tl.sort((a, b) => a.hora.localeCompare(b.hora)).map(item => (
              <div key={item.id} className={`dc-tl-item${item.done ? " done" : ""}`}>
                <button className={`dc-check-btn${item.done ? " checked" : ""}`}
                  onClick={() => toggleTl(item.id)}>
                  {item.done && <span style={{ color: "#000", fontSize: ".75rem", fontWeight: 700 }}>✓</span>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".2rem" }}>
                    <span className="dc-tl-hora">{item.hora}</span>
                    <span style={{ fontSize: ".7rem" }}>{CAT_ICON[item.categoria] || "📌"}</span>
                  </div>
                  <div className="dc-tl-titulo"
                    style={{ textDecoration: item.done ? "line-through" : "none",
                      color: item.done ? "var(--text-dim)" : "var(--text)" }}>
                    {item.titulo}
                  </div>
                  {item.descripcion && (
                    <div className="dc-tl-desc">{item.descripcion}</div>
                  )}
                  {item.responsable && (
                    <div className="dc-tl-resp">👤 {item.responsable}</div>
                  )}
                </div>
              </div>
            ))}
            {tl.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem",
                color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: ".75rem" }}>
                Sin entradas en el timeline.<br/>Añádelas en Logística → Timeline.
              </div>
            )}
          </>
        )}

        {/* ── VOLUNTARIOS ── */}
        {tab === "voluntarios" && (
          <>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem",
              color: "var(--text-muted)", marginBottom: ".65rem" }}>
              {presentes.length} presentes · {confirmados.length - presentes.length} pendientes
            </div>
            {confirmados.map(v => {
              const puesto = puestos.find(p => p.id === v.puestoId);
              return (
                <div key={v.id} className="dc-vol-card">
                  <button className={`dc-vol-check${v.presente ? " presente" : ""}`}
                    onClick={() => togglePresente(v.id)}>
                    {v.presente && <span style={{ color: "#000", fontSize: ".75rem", fontWeight: 700 }}>✓</span>}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: ".82rem",
                      color: v.presente ? "var(--green)" : "var(--text)" }}>
                      {v.nombre}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: ".58rem",
                      color: "var(--text-muted)" }}>
                      {puesto?.nombre || "Sin puesto"} · {v.telefono || "—"}
                    </div>
                  </div>
                  {v.coche && <span title="Tiene coche">🚗</span>}
                  {v.talla && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem",
                      background: "var(--surface2)", border: "1px solid var(--border)",
                      borderRadius: 4, padding: ".1rem .35rem", color: "var(--text-muted)" }}>
                      {v.talla}
                    </span>
                  )}
                </div>
              );
            })}
            {confirmados.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem",
                color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: ".75rem" }}>
                Sin voluntarios confirmados.
              </div>
            )}
          </>
        )}

        {/* ── PUESTOS ── */}
        {tab === "puestos" && (
          <>
            {puestos.map(p => {
              const asignados = vols.filter(v => v.puestoId === p.id && v.estado === "confirmado");
              const presentes_ = asignados.filter(v => v.presente);
              const cobertura = asignados.length > 0
                ? Math.round((presentes_.length / asignados.length) * 100) : 0;
              const color = presentes_.length >= (p.necesarios || 1) ? "var(--green)"
                : presentes_.length > 0 ? "var(--amber)" : "var(--red)";
              return (
                <div key={p.id} className="dc-puesto-card"
                  style={{ borderLeft: `3px solid ${color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: ".35rem" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: ".82rem" }}>{p.nombre}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem",
                        color: "var(--text-muted)" }}>
                        {p.horaInicio} – {p.horaFin} · necesarios: {p.necesarios || 1}
                      </div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: ".75rem",
                      fontWeight: 800, color }}>
                      {presentes_.length}/{asignados.length}
                    </span>
                  </div>
                  {asignados.map(v => (
                    <div key={v.id} style={{ display: "flex", alignItems: "center",
                      gap: ".4rem", padding: ".25rem 0",
                      borderTop: "1px solid var(--border)" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: v.presente ? "var(--green)" : "var(--border)" }} />
                      <span style={{ fontSize: ".75rem", flex: 1,
                        color: v.presente ? "var(--text)" : "var(--text-muted)" }}>
                        {v.nombre}
                      </span>
                      {v.telefono && (
                        <a href={`tel:${v.telefono}`}
                          style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem",
                            color: "var(--cyan)", textDecoration: "none" }}>
                          📞
                        </a>
                      )}
                    </div>
                  ))}
                  {asignados.length === 0 && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem",
                      color: "var(--red)", marginTop: ".25rem" }}>
                      ⚠ Sin voluntarios asignados
                    </div>
                  )}
                </div>
              );
            })}
            {puestos.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem",
                color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: ".75rem" }}>
                Sin puestos definidos.
              </div>
            )}
          </>
        )}

        {/* ── EMERGENCIAS ── */}
        {tab === "emergencias" && (
          <>
            <div style={{ padding: ".5rem .75rem", borderRadius: 8, marginBottom: ".75rem",
              background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)",
              fontFamily: "var(--font-mono)", fontSize: ".65rem", color: "var(--red)",
              fontWeight: 700 }}>
              🚨 En caso de emergencia grave: llama al 112 primero
            </div>
            {contactos
              .sort((a, b) => {
                const orden = { emergencia: 0, institucional: 1, staff: 2, proveedor: 3 };
                return (orden[a.tipo] ?? 4) - (orden[b.tipo] ?? 4);
              })
              .map(c => {
                const color = TIPO_CONTACTO_COLOR[c.tipo] || "var(--text-muted)";
                return (
                  <div key={c.id} className="dc-contacto"
                    style={{ borderLeft: `3px solid ${color}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: ".82rem" }}>{c.nombre}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem",
                        color: "var(--text-muted)" }}>
                        {c.rol}
                        {c.notas && ` · ${c.notas}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column",
                      alignItems: "flex-end", gap: ".25rem", flexShrink: 0 }}>
                      {c.telefono && (
                        <a href={`tel:${c.telefono}`}
                          style={{ display: "flex", alignItems: "center", gap: ".3rem",
                            background: `${color}15`, border: `1px solid ${color}44`,
                            borderRadius: 8, padding: ".3rem .65rem",
                            fontFamily: "var(--font-mono)", fontSize: ".72rem",
                            fontWeight: 800, color, textDecoration: "none" }}>
                          📞 {c.telefono}
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`}
                          style={{ fontFamily: "var(--font-mono)", fontSize: ".58rem",
                            color: "var(--text-muted)", textDecoration: "none" }}>
                          ✉ {c.email}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            {contactos.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem",
                color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: ".75rem" }}>
                Sin contactos. Añádelos en Logística → Comunicaciones.
              </div>
            )}
          </>
        )}

        {/* ── CHECKLIST ── */}
        {tab === "checklist" && (
          <>
            {(() => {
              const fases = [...new Set(ck.map(t => t.fase))];
              return fases.map(fase => {
                const items = ck.filter(t => t.fase === fase);
                const completados = items.filter(t => t.estado === "completado").length;
                return (
                  <div key={fase} style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: ".4rem" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem",
                        fontWeight: 700, color: "var(--text-muted)",
                        textTransform: "uppercase", letterSpacing: ".06em" }}>
                        {fase}
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: ".62rem",
                        color: completados === items.length ? "var(--green)" : "var(--text-muted)" }}>
                        {completados}/{items.length}
                      </span>
                    </div>
                    {items.map(item => {
                      const hecho = item.estado === "completado";
                      return (
                        <div key={item.id} style={{
                          display: "flex", alignItems: "flex-start", gap: ".6rem",
                          padding: ".55rem .7rem", borderRadius: 8, marginBottom: ".3rem",
                          background: hecho ? "var(--surface2)" : "var(--surface)",
                          border: `1px solid ${hecho ? "rgba(52,211,153,.2)" : "var(--border)"}`,
                          opacity: hecho ? .6 : 1,
                        }}>
                          <button
                            onClick={() => setCk(prev => prev.map(t =>
                              t.id === item.id
                                ? { ...t, estado: hecho ? "pendiente" : "completado" }
                                : t
                            ))}
                            style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                              border: `2px solid ${hecho ? "var(--green)" : "var(--border)"}`,
                              background: hecho ? "var(--green)" : "transparent",
                              cursor: "pointer", display: "flex", alignItems: "center",
                              justifyContent: "center", marginTop: ".1rem", transition: "all .15s" }}>
                            {hecho && <span style={{ color: "#000", fontSize: ".65rem", fontWeight: 700 }}>✓</span>}
                          </button>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: ".78rem", fontWeight: 600,
                              textDecoration: hecho ? "line-through" : "none",
                              color: hecho ? "var(--text-dim)" : "var(--text)" }}>
                              {item.tarea}
                            </div>
                            {item.responsable && (
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: ".58rem",
                                color: "var(--text-dim)", marginTop: ".1rem" }}>
                                👤 {item.responsable}
                              </div>
                            )}
                          </div>
                          {item.prioridad === "alta" && !hecho && (
                            <span style={{ fontSize: ".6rem", color: "var(--red)",
                              fontFamily: "var(--font-mono)", fontWeight: 700,
                              flexShrink: 0 }}>ALTA</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
            {ck.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem",
                color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: ".75rem" }}>
                Sin tareas. Añádelas en Logística → Checklist.
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
