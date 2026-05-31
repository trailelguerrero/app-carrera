/**
 * SeccionCodigos — Gestión de códigos promocionales
 *
 * Extraído de TabInscripciones para aislar sus 8 estados locales y la lógica
 * de inicialización de Neon. Cualquier cambio aquí no dispara re-renders
 * en la tabla de tramos ni en el panel de plazas.
 *
 * Props recibidas:
 *   - codigos, codigosLoading: del useData del padre
 *   - setCodigos: setter del useData del padre
 *   - rawCodigosInit, setCodigosInit: del useData del padre (guarda de init)
 *
 * Estado propio (aislado aquí):
 *   codigosTab, busquedaCod, importText, importDist, importMsg,
 *   editCodigo, delCodigo, importOpen, colapsadas
 */
import React, { useState, useEffect, useRef } from "react";
import { DISTANCIAS, DISTANCIA_COLORS } from "../../constants/budgetConstants";

export const SeccionCodigos = ({
  codigos,
  setCodigos,
  codigosLoading,
  rawCodigosInit,
  setCodigosInit,
}) => {
  const [codigosTab, setCodigosTab] = useState("todos");
  const [busquedaCod, setBusquedaCod] = useState("");
  const [importText, setImportText] = useState("");
  const [importDist, setImportDist] = useState("TG7");
  const [importMsg, setImportMsg] = useState(null);
  const [editCodigo, setEditCodigo] = useState(null);
  const [delCodigo, setDelCodigo] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [colapsadas, setColapsadas] = useState({ TG7: true, TG13: true, TG25: true });

  const toggleDistancia = (d) => setColapsadas(p => ({ ...p, [d]: !p[d] }));

  // Cargar códigos iniciales solo la primera vez (cuando Neon tampoco tiene datos).
  // FIX BUG-PROMO-02: esperar a que codigosLoading sea false (Neon ya respondió)
  // antes de decidir si inicializar. Así evitamos recrear códigos borrados en
  // otro dispositivo donde localStorage estaba vacío pero Neon ya tenía el array.
  const codigosRef = useRef(codigos);
  useEffect(() => { codigosRef.current = codigos; });
  useEffect(() => {
    if (codigosLoading) return;
    const yaInicializado = rawCodigosInit !== null && rawCodigosInit !== undefined;
    if (codigosRef.current.length === 0 && !yaInicializado) {
      setCodigos([
        { id: "7G7-1",    codigo: "7G7",      distancia: "TG7",  estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "KDZ145OX", codigo: "KDZ145OX", distancia: "TG7",  estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "LHNHNP8O", codigo: "LHNHNP8O", distancia: "TG7",  estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "Y24SA1TO", codigo: "Y24SA1TO", distancia: "TG7",  estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "H4D95XXK", codigo: "H4D95XXK", distancia: "TG7",  estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "INWPP2FZ", codigo: "INWPP2FZ", distancia: "TG7",  estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "UBUQ4P9H", codigo: "UBUQ4P9H", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "E4AXY9BB", codigo: "E4AXY9BB", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "CFW8V4YX", codigo: "CFW8V4YX", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "OSEQZJW8", codigo: "OSEQZJW8", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "AAWKNOY8", codigo: "AAWKNOY8", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "L3BBI448", codigo: "L3BBI448", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "E3Z05H0D", codigo: "E3Z05H0D", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "40ACCVZF", codigo: "40ACCVZF", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "K5RBRVHK", codigo: "K5RBRVHK", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "UUCTJWSV", codigo: "UUCTJWSV", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
      ]);
      setCodigosInit("1");
    }
  }, [codigosLoading, rawCodigosInit, setCodigos, setCodigosInit]);

  const fmtDate = (iso) => iso ? iso.split("T")[0] : "—";

  const renderCard = (c) => {
    const usado  = c.estado === "usado";
    const dColor = DISTANCIA_COLORS[c.distancia] || "var(--cyan)";
    return (
      <div key={c.id} style={{
        borderRadius: 10, background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${usado ? "var(--border)" : dColor}`,
        overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          gap: ".5rem", padding: ".75rem .85rem", minHeight: 56,
        }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "var(--fs-md)",
            letterSpacing: ".06em", flex: 1, minWidth: 0,
            color: usado ? "var(--text-dim)" : "var(--text)",
            textDecoration: usado ? "line-through" : "none",
          }}>
            {c.codigo}
          </span>

          <div style={{ flex: 2, minWidth: 0 }}>
            {usado ? (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                color: "var(--text-muted)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {c.usadoPor || "—"}
                {c.fechaUso && (
                  <span style={{ color: "var(--text-dim)", marginLeft: ".4rem" }}>
                    · {c.fechaUso}
                  </span>
                )}
              </div>
            ) : (
              <input
                placeholder="Inscrito... ↵"
                aria-label={`Marcar código ${c.codigo} como usado`}
                style={{
                  background: "transparent", border: "none",
                  borderBottom: "1px solid rgba(52,211,153,.35)",
                  color: "var(--text)", fontFamily: "var(--font-mono)",
                  fontSize: "var(--fs-sm)", outline: "none",
                  width: "100%", padding: ".15rem 0",
                  transition: "border-color .15s",
                }}
                onFocus={e => e.target.style.borderBottomColor = "var(--green)"}
                onBlur={e  => e.target.style.borderBottomColor = "rgba(52,211,153,.35)"}
                onKeyDown={e => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    const nombre = e.target.value.trim();
                    setCodigos(prev => prev.map(x => x.id === c.id
                      ? { ...x, estado: "usado", usadoPor: nombre, fechaUso: new Date().toISOString().split("T")[0] }
                      : x));
                    e.target.value = "";
                  }
                }}
              />
            )}
          </div>

          <div style={{ display: "flex", gap: ".25rem", flexShrink: 0 }}>
            {usado && (
              <button
                title="Liberar código" aria-label="Liberar código"
                onClick={() => setCodigos(prev => prev.map(x => x.id === c.id
                  ? { ...x, estado: "disponible", usadoPor: null, fechaUso: null } : x))}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 40, height: 40, borderRadius: 8,
                  background: "rgba(251,191,36,.12)", border: "1px solid rgba(251,191,36,.3)",
                  color: "var(--amber)", fontSize: "var(--fs-base)", cursor: "pointer",
                }}>
                ↩
              </button>
            )}
            <button title="Editar" aria-label="Editar código"
              onClick={() => setEditCodigo({ ...c })}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 40, height: 40, borderRadius: 8,
                background: "var(--surface3)", border: "1px solid var(--border)",
                color: "var(--text-muted)", fontSize: "var(--fs-base)", cursor: "pointer",
              }}>
              ✏️
            </button>
            <button title="Eliminar" aria-label="Eliminar código"
              onClick={() => setDelCodigo(c.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 40, height: 40, borderRadius: 8,
                background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.25)",
                color: "var(--red)", fontSize: "var(--fs-base)", fontWeight: 700, cursor: "pointer",
              }}>
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Lista filtrada
  const filtrados = codigos
    .filter(c => {
      if (codigosTab === "disponible") return c.estado === "disponible";
      if (codigosTab === "usado")      return c.estado === "usado";
      if (["TG7", "TG13", "TG25"].includes(codigosTab)) return c.distancia === codigosTab;
      return true;
    })
    .filter(c =>
      !busquedaCod ||
      c.codigo.toLowerCase().includes(busquedaCod.toLowerCase()) ||
      (c.usadoPor || "").toLowerCase().includes(busquedaCod.toLowerCase())
    );

  const grupos = ["TG7", "TG13", "TG25"].map(d => ({
    dist: d,
    items: filtrados.filter(c => c.distancia === d),
    color: DISTANCIA_COLORS[d] || "var(--cyan)",
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ marginBottom: "1.5rem" }}>

      {/* Header con stats */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: ".5rem", marginBottom: ".85rem",
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "var(--fs-md)", marginBottom: ".15rem" }}>
            🎟️ Códigos promocionales
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
            Inscripciones gratuitas · {codigos.filter(c => c.estado === "disponible").length} disponibles de {codigos.length}
          </div>
        </div>
        <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", alignItems: "center" }}>
          {["TG7", "TG13", "TG25"].map(d => {
            const disp = codigos.filter(c => c.distancia === d && c.estado === "disponible").length;
            const tot  = codigos.filter(c => c.distancia === d).length;
            const color = DISTANCIA_COLORS[d] || "var(--cyan)";
            return (
              <button key={d}
                onClick={() => setCodigosTab(codigosTab === d ? "todos" : d)}
                style={{
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700,
                  padding: ".25rem .6rem", borderRadius: 20, cursor: "pointer",
                  background: codigosTab === d ? color + "22" : "transparent",
                  color: codigosTab === d ? color : color + "99",
                  border: `1px solid ${codigosTab === d ? color : color + "44"}`,
                }}>
                {d} <span style={{ opacity: .75 }}>{disp}/{tot}</span>
              </button>
            );
          })}
          <button
            onClick={() => setEditCodigo({ id: null, codigo: "", distancia: "TG7", estado: "disponible", usadoPor: "", fechaUso: "" })}
            style={{
              padding: ".3rem .7rem", borderRadius: 8, cursor: "pointer", fontWeight: 700,
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
              background: "var(--primary)", color: "#fff", border: "none",
            }}>
            + Nuevo
          </button>
          <button
            onClick={() => setImportOpen(v => !v)}
            style={{
              padding: ".3rem .6rem", borderRadius: 8, cursor: "pointer", fontWeight: 700,
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
              background: importOpen ? "var(--cyan-dim)" : "var(--surface2)",
              color: importOpen ? "var(--cyan)" : "var(--text-muted)",
              border: `1px solid ${importOpen ? "rgba(34,211,238,.35)" : "var(--border)"}`,
            }}>
            📥 Lote
          </button>
        </div>
      </div>

      {/* Importar en lote — colapsable */}
      {importOpen && (
        <div style={{
          padding: ".75rem", borderRadius: 8, marginBottom: ".75rem",
          background: "var(--surface2)", border: "1px solid rgba(34,211,238,.2)",
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
            color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em",
            marginBottom: ".5rem",
          }}>Pega los códigos (uno por línea o separados por espacios)</div>
          <div style={{ display: "flex", gap: ".5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            <textarea value={importText} onChange={e => setImportText(e.target.value)}
              placeholder={"CODIGO1\nCODIGO2\nCODIGO3"}
              rows={4}
              style={{
                flex: 1, minWidth: 200, background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)",
                padding: ".4rem .55rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)",
                outline: "none", resize: "vertical",
              }} />
            <div style={{ display: "flex", flexDirection: "column", gap: ".3rem", minWidth: 90 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginBottom: ".15rem" }}>Distancia</div>
              {["TG7", "TG13", "TG25"].map(d => (
                <button key={d} onClick={() => setImportDist(d)}
                  style={{
                    padding: ".28rem .5rem", borderRadius: 6, cursor: "pointer",
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700,
                    border: `1px solid ${importDist === d ? "var(--cyan)" : "var(--border)"}`,
                    background: importDist === d ? "var(--cyan-dim)" : "transparent",
                    color: importDist === d ? "var(--cyan)" : "var(--text-muted)",
                  }}>
                  {d}
                </button>
              ))}
              <button
                disabled={!importText.trim()}
                style={{
                  marginTop: ".25rem", padding: ".35rem .5rem", borderRadius: 6, cursor: "pointer",
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700,
                  background: "var(--primary)", color: "#fff", border: "none",
                  opacity: importText.trim() ? 1 : .45,
                }}
                onClick={() => {
                  const nuevos = importText.split(/[,\s\n\r]+/)
                    .map(l => l.trim().toUpperCase()).filter(l => l.length >= 2)
                    .filter(cod => !codigos.find(c => c.codigo === cod))
                    .map(cod => ({
                      id: cod + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
                      codigo: cod, distancia: importDist, estado: "disponible", usadoPor: null, fechaUso: null,
                    }));
                  if (!nuevos.length) { setImportMsg({ ok: false, txt: "Todos los códigos ya existen." }); return; }
                  setCodigos(prev => [...prev, ...nuevos]);
                  setImportText("");
                  setImportMsg({ ok: true, txt: `✓ ${nuevos.length} código${nuevos.length > 1 ? "s" : ""} importados para ${importDist}` });
                  setTimeout(() => setImportMsg(null), 3500);
                }}>
                Importar
              </button>
            </div>
          </div>
          {importMsg && (
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", marginTop: ".4rem",
              color: importMsg.ok ? "var(--green)" : "var(--red)",
            }}>
              {importMsg.txt}
            </div>
          )}
        </div>
      )}

      {/* Buscador + filtros de estado */}
      <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", alignItems: "center", marginBottom: ".6rem" }}>
        <div style={{
          display: "flex", background: "var(--surface2)", border: "1px solid var(--border)",
          borderRadius: 8, overflow: "hidden", flexShrink: 0,
        }}>
          {[["todos", "Todos"], ["disponible", "✅ Libres"], ["usado", "✓ Usados"]].map(([v, l]) => (
            <button key={v} onClick={() => setCodigosTab(v)}
              style={{
                padding: ".28rem .6rem", border: "none", cursor: "pointer",
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700,
                background: codigosTab === v ? "rgba(34,211,238,.15)" : "transparent",
                color: codigosTab === v ? "var(--cyan)" : "var(--text-muted)",
                whiteSpace: "nowrap",
              }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{
          flex: 1, minWidth: 140, display: "flex", alignItems: "center",
          background: "var(--surface2)", border: "1px solid var(--border)",
          borderRadius: 8, padding: ".28rem .6rem", gap: ".4rem",
        }}>
          <span style={{ opacity: .5, fontSize: "var(--fs-base)", flexShrink: 0 }}>🔍</span>
          <input
            placeholder="Buscar código o nombre..."
            value={busquedaCod}
            onChange={e => setBusquedaCod(e.target.value)}
            style={{
              background: "none", border: "none", color: "var(--text)",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", outline: "none", width: "100%",
            }} />
          {busquedaCod && (
            <button onClick={() => setBusquedaCod("")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: "var(--fs-sm)", padding: 0, flexShrink: 0,
              }}>✕</button>
          )}
        </div>
      </div>

      {/* Lista de códigos — agrupada por distancia, colapsable */}
      {filtrados.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "2.5rem 1rem",
          fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)",
          color: "var(--text-dim)", background: "var(--surface2)",
          borderRadius: 10, border: "1px dashed var(--border)",
        }}>
          {codigos.length === 0
            ? <>Sin códigos. Pulsa <strong style={{ color: "var(--cyan)" }}>+ Nuevo</strong> o importa en lote.</>
            : "Sin resultados con ese filtro."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
          {grupos.map(({ dist, items, color }) => {
            const usados = items.filter(c => c.estado === "usado").length;
            const libres = items.length - usados;
            const collapsed = colapsadas[dist];
            return (
              <div key={dist} style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${color}33` }}>
                <button
                  onClick={() => toggleDistancia(dist)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    gap: ".65rem", padding: ".6rem .85rem",
                    background: `${color}0d`, border: "none",
                    cursor: "pointer", textAlign: "left",
                    borderBottom: collapsed ? "none" : `1px solid ${color}22`,
                  }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "var(--fs-base)", color, letterSpacing: ".04em" }}>
                    {dist}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", flex: 1 }}>
                    {items.length} código{items.length !== 1 ? "s" : ""}
                  </span>
                  <div style={{ display: "flex", gap: ".3rem" }}>
                    {libres > 0 && (
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                        padding: ".1rem .45rem", borderRadius: 20,
                        background: "rgba(52,211,153,.12)", color: "var(--green)",
                        border: "1px solid rgba(52,211,153,.25)",
                      }}>
                        {libres} libre{libres !== 1 ? "s" : ""}
                      </span>
                    )}
                    {usados > 0 && (
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                        padding: ".1rem .45rem", borderRadius: 20,
                        background: "rgba(148,163,184,.1)", color: "var(--text-dim)",
                        border: "1px solid var(--border)",
                      }}>
                        {usados} usado{usados !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                    color: "var(--text-dim)", flexShrink: 0,
                    transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    transition: "transform .18s",
                  }}>
                    ▼
                  </span>
                </button>

                {!collapsed && (
                  <div style={{
                    display: "flex", flexDirection: "column", gap: ".35rem",
                    padding: ".5rem .5rem", background: "var(--surface)",
                  }}>
                    {items.map(renderCard)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal editar/crear código */}
      {editCodigo && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setEditCodigo(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="modal-title">
                {editCodigo.id ? "✏️ Editar código" : "🎟️ Nuevo código"}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditCodigo(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ gap: ".6rem" }}>
              <div>
                <label className="fl">Código *</label>
                <input className="inp"
                  value={editCodigo.codigo || ""}
                  onChange={e => setEditCodigo(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  placeholder="ej. ABC12345"
                  style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: ".05em" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
                <div>
                  <label className="fl">Distancia</label>
                  <select className="inp" value={editCodigo.distancia || "TG7"}
                    onChange={e => setEditCodigo(p => ({ ...p, distancia: e.target.value }))}>
                    <option value="TG7">TG7</option>
                    <option value="TG13">TG13</option>
                    <option value="TG25">TG25</option>
                  </select>
                </div>
                <div>
                  <label className="fl">Estado</label>
                  <select className="inp" value={editCodigo.estado || "disponible"}
                    onChange={e => setEditCodigo(p => ({ ...p, estado: e.target.value }))}>
                    <option value="disponible">✅ Disponible</option>
                    <option value="usado">✓ Usado</option>
                  </select>
                </div>
              </div>
              {editCodigo.estado === "usado" && (
                <>
                  <div>
                    <label className="fl">Usado por</label>
                    <input className="inp"
                      value={editCodigo.usadoPor || ""}
                      onChange={e => setEditCodigo(p => ({ ...p, usadoPor: e.target.value }))}
                      placeholder="Nombre del inscrito" />
                  </div>
                  <div>
                    <label className="fl">Fecha de uso</label>
                    <input className="inp" type="date"
                      value={editCodigo.fechaUso || ""}
                      onChange={e => setEditCodigo(p => ({ ...p, fechaUso: e.target.value }))} />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditCodigo(null)}>Cancelar</button>
              <button className="btn btn-primary"
                disabled={!editCodigo.codigo?.trim()}
                style={{ opacity: editCodigo.codigo?.trim() ? 1 : .5 }}
                onClick={() => {
                  if (!editCodigo.codigo?.trim()) return;
                  const cod = {
                    ...editCodigo,
                    codigo:   editCodigo.codigo.trim().toUpperCase(),
                    usadoPor: editCodigo.estado === "usado" ? (editCodigo.usadoPor || null) : null,
                    fechaUso: editCodigo.estado === "usado" ? (editCodigo.fechaUso || null) : null,
                  };
                  if (cod.id) {
                    setCodigos(prev => prev.map(x => x.id === cod.id ? cod : x));
                  } else {
                    cod.id = cod.codigo + "-" + Date.now().toString(36);
                    setCodigos(prev => [...prev, cod]);
                  }
                  setEditCodigo(null);
                }}>
                {editCodigo.id ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar borrado de código */}
      {delCodigo && (
        <div className="modal-backdrop" style={{ zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setDelCodigo(null)}>
          <div className="modal" style={{ maxWidth: 320, textAlign: "center" }}>
            <div className="modal-body" style={{ paddingTop: "1.5rem" }}>
              <div style={{ fontSize: "var(--fs-xl)", marginBottom: ".5rem" }}>🗑️</div>
              <div style={{ fontWeight: 700, marginBottom: ".3rem" }}>¿Eliminar este código?</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: ".2rem" }}>
                {codigos.find(c => c.id === delCodigo)?.codigo}
              </div>
              <div className="mono xs muted">Esta acción no se puede deshacer.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDelCodigo(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={() => {
                setCodigos(prev => prev.filter(x => x.id !== delCodigo));
                setDelCodigo(null);
              }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
