/**
 * FichaProyecto.jsx — Tarea 3.3
 * Panel lateral de detalle para tareas, hitos y personas del módulo Proyecto.
 */
import { blockCls as cls } from "@/lib/blockStyles";
import { fmt, diasHasta, EST_CFG, PRI_CFG, getArea, iniciales } from "./proyectoConstants";

function FichaRow({ label, value, color }) {
  if (!value) return null;
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
      padding:".45rem 0", borderBottom:"1px solid rgba(30,45,80,.3)" }}>
      <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
        flexShrink:0, marginRight:"1rem" }}>{label}</span>
      <span style={{ fontSize:"var(--fs-base)", fontWeight:600, textAlign:"right",
        color: color || "var(--text)" }}>{value}</span>
    </div>
  );
}

function FichaProyecto({ ficha, equipo, documentos, tareas, onClose, onEditar, onEliminar }) {
  const { closing: fpClosing, handleClose: fpHandleClose } = useModalClose(onClose);
  const { tipo, data } = ficha;
  const accent = tipo === "tarea" ? "var(--violet)" : tipo === "hito" ? "var(--cyan)" : "var(--green)";
  const icon   = tipo === "tarea" ? "📋" : tipo === "hito" ? "🏁" : "👤";
  const titulo = data.titulo || data.nombre;
  const docVinculado = documentos?.find(d => String(d.id) === String(data.documentoId));

  return createPortal(
    <div className={`modal-backdrop${fpClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target===e.currentTarget && fpHandleClose()}>
        <div className={`modal modal-ficha${fpClosing ? " modal-closing" : ""}`}>
          <div style={{ borderTop:`3px solid ${accent}`, borderRadius:"16px 16px 0 0" }}>
            <div className="modal-header">
              <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
                <span style={{ fontSize:"var(--fs-lg)" }}>{icon}</span>
                <div>
                  <div style={{ fontWeight:800, fontSize:"var(--fs-md)", lineHeight:1.2 }}>{titulo}</div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                    marginTop:".1rem", textTransform:"uppercase", letterSpacing:".08em" }}>
                    {tipo === "tarea" ? `Tarea · ${AREAS.find(a=>a.id===data.area)?.label||data.area}` :
                     tipo === "hito"  ? "Hito" : "Miembro del equipo"}
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding:".2rem .5rem" }} onClick={fpHandleClose} aria-label="Cerrar">✕</button>
            </div>
          </div>

          <div className="modal-body">
            {tipo === "tarea" && (<>
              <FichaRow label="Estado"       value={EST_CFG[data.estado]?.label}  color={EST_CFG[data.estado]?.color} />
              <FichaRow label="Prioridad"    value={data.prioridad}               color={PRI_CFG[data.prioridad]?.color} />
              <FichaRow label="Responsable"  value={equipo.find(p=>p.id===data.responsableId)?.nombre} />
              <FichaRow label="Fecha límite" value={data.fechaLimite
                ? new Date(data.fechaLimite).toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"})
                : null} />
              {docVinculado && (
                <div style={{ marginTop: ".8rem", padding: ".6rem 0", borderTop: "1px dashed var(--border)", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", textTransform:"uppercase", fontWeight:700 }}>Doc vinculado</div>
                  <a href="#" className="badge" style={{background:"var(--cyan-dim)",color:"var(--cyan)",textDecoration:"none",fontSize:"var(--fs-sm)",padding:".3rem .6rem",border:"1px solid rgba(34,211,238,.2)"}} 
                     onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "documentos" } })); }}>
                    📎 {docVinculado.nombre} →
                  </a>
                </div>
              )}
              {/* Crosslink → Pre-operativo en Logística */}
              {ficha.tipo === "tarea" && (
                <div style={{ marginTop: ".6rem", padding: ".5rem .65rem", borderRadius:8,
                  background:"rgba(167,139,250,.08)", border:"1px solid rgba(167,139,250,.2)",
                  display:"flex", alignItems:"center", justifyContent:"space-between", gap:".5rem" }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--violet)" }}>
                    ✅ Ver ítems Pre-operativo vinculados
                  </div>
                  <button className="btn btn-ghost btn-sm"
                    style={{fontSize:"var(--fs-xs)",padding:".2rem .5rem"}}
                    onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "logistica" } }))}>
                    Logística →
                  </button>
                </div>
              )}
              {/* Gestión legal relacionada — para tareas del área permisos */}
              {data.area === "permisos" && (() => {
                const gestRelacionada = documentos?.filter(d => d.subcategoria && !d.tipo)
                  .find(g => {
                    const t = (data.titulo || "").toLowerCase();
                    const n = (g.nombre || "").toLowerCase();
                    // Match por palabras clave compartidas
                    const words = n.split(/\s+/).filter(w => w.length > 4);
                    return words.some(w => t.includes(w));
                  });
                if (!gestRelacionada) return null;
                const ESTADO_CFG = {
                  pendiente:"#94a3b8", en_tramite:"#22d3ee",
                  enviado:"#60a5fa", firmado:"#a78bfa",
                  aprobado:"#34d399", denegado:"#f87171",
                };
                const ec = ESTADO_CFG[gestRelacionada.estado] || "#94a3b8";
                return (
                  <div style={{ marginTop: ".8rem", padding: ".65rem .75rem",
                    borderTop: "1px dashed var(--border)",
                    background:"rgba(56,189,248,.06)",
                    border:"1px solid rgba(56,189,248,.2)",
                    borderRadius:8 }}>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"#38bdf8", textTransform:"uppercase", fontWeight:700,
                      marginBottom:".35rem" }}>🏛️ Gestión legal relacionada</div>
                    <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
                      <div style={{width:8,height:8,borderRadius:"50%",
                        background:ec,boxShadow:`0 0 5px ${ec}66`,flexShrink:0}}/>
                      <span style={{fontSize:"var(--fs-base)",fontWeight:600,flex:1}}>
                        {gestRelacionada.nombre}
                      </span>
                      <button className="btn btn-ghost btn-sm" style={{fontSize:"var(--fs-xs)",padding:".15rem .45rem",flexShrink:0}}
                        onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"documentos"}}))}>
                        Ver →
                      </button>
                    </div>
                  </div>
                );
              })()}
              {/* Dependencias */}
              {(() => {
                if (!tareas) return null;
                const bloqueadaPor = data.dependeDe
                  ? tareas.find(t => t.id === data.dependeDe) : null;
                const bloqueaA = tareas.filter(t =>
                  t.dependeDe === data.id && t.estado !== "completado"
                );
                if (!bloqueadaPor && bloqueaA.length === 0) return null;
                return (
                  <div style={{ marginTop:".75rem", display:"flex", flexDirection:"column", gap:".4rem" }}>
                    {bloqueadaPor && (
                      <div style={{ padding:".5rem .65rem", borderRadius:8,
                        background: bloqueadaPor.estado === "completado"
                          ? "rgba(52,211,153,.07)" : "rgba(248,113,113,.06)",
                        border: bloqueadaPor.estado === "completado"
                          ? "1px solid rgba(52,211,153,.25)" : "1px solid rgba(248,113,113,.2)" }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center", marginBottom:".25rem" }}>
                          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                            color: bloqueadaPor.estado === "completado" ? "var(--green)" : "#f87171",
                            fontWeight:700, textTransform:"uppercase" }}>
                            {bloqueadaPor.estado === "completado" ? "✓ Dependencia resuelta" : "🔒 Bloqueada por"}
                          </div>
                          <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                            padding:".1rem .35rem", borderRadius:4,
                            background: EST_CFG[bloqueadaPor.estado]?.bg,
                            color: EST_CFG[bloqueadaPor.estado]?.color }}>
                            {EST_CFG[bloqueadaPor.estado]?.label}
                          </span>
                        </div>
                        <div style={{ fontSize:"var(--fs-base)", fontWeight:600 }}>{bloqueadaPor.titulo}</div>
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                          color:"var(--text-muted)", marginTop:".1rem" }}>
                          {EST_CFG[bloqueadaPor.estado]?.label} · {getArea(bloqueadaPor.area)?.label}
                        </div>
                      </div>
                    )}
                    {bloqueaA.length > 0 && (
                      <div style={{ padding:".5rem .65rem", borderRadius:8,
                        background:"rgba(251,191,36,.06)",
                        border:"1px solid rgba(251,191,36,.2)" }}>
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                          color:"var(--amber)", fontWeight:700, marginBottom:".3rem",
                          textTransform:"uppercase" }}>⏳ Desbloquea {bloqueaA.length} tarea{bloqueaA.length!==1?"s":""}</div>
                        {bloqueaA.map(t => (
                          <div key={t.id} style={{ fontSize:"var(--fs-sm)", color:"var(--text-muted)",
                            padding:".15rem 0", display:"flex", alignItems:"center", gap:".4rem" }}>
                            <span style={{ color:"var(--amber)", fontSize:"var(--fs-sm)" }}>→</span>
                            {t.titulo}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {data.notas && (
                <div style={{ background:"var(--surface2)", borderRadius:8,
                  padding:".65rem .75rem", borderLeft:`2px solid ${accent}`, marginTop:".5rem" }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                    marginBottom:".3rem", textTransform:"uppercase" }}>Notas</div>
                  <div style={{ fontSize:"var(--fs-base)", lineHeight:1.6 }}>{data.notas}</div>
                </div>
              )}
            </>)}

            {tipo === "hito" && (<>
              <FichaRow label="Fecha"   value={data.fecha
                ? new Date(data.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"})
                : "—"} />
              <FichaRow label="Estado"  value={data.completado ? "✓ Completado" : "Pendiente"}
                   color={data.completado ? "var(--green)" : "var(--amber)"} />
              <FichaRow label="Crítico" value={data.critico ? "⚡ Sí, es crítico" : "No"}
                   color={data.critico ? "var(--red)" : undefined} />
            </>)}

            {tipo === "persona" && (<>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:".5rem" }}>
                <div style={{ width:52, height:52, borderRadius:"50%",
                  background:(data.color||"#a78bfa")+"22",
                  border:`2px solid ${data.color||"#a78bfa"}66`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:800, fontSize:"var(--fs-lg)", color:data.color||"#a78bfa" }}>
                  {iniciales(data.nombre||"?")}
                </div>
              </div>
              <FichaRow label="Rol"      value={data.rol} />
              <FichaRow label="Área"     value={AREAS.find(a=>a.id===data.area)?.label||data.area} />
              <FichaRow label="Teléfono" value={data.telefono} />
              <FichaRow label="Email"    value={data.email} />
            </>)}

            {/* Historial de cambios de estado — solo para tareas */}
            {tipo === "tarea" && Array.isArray(data.historial) && data.historial.length > 0 && (
              <div style={{ marginTop:".8rem", borderTop:"1px dashed var(--border)", paddingTop:".7rem" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                  textTransform:"uppercase", fontWeight:700, letterSpacing:".05em", marginBottom:".5rem" }}>
                  🕐 Historial de cambios
                </div>
                {[...data.historial].reverse().map((e, i) => (
                  <div key={e.id || i} style={{ display:"flex", gap:".65rem", padding:".35rem 0",
                    borderBottom:"1px solid var(--border)", alignItems:"flex-start" }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"var(--text-dim)", flexShrink:0 }}>
                      {new Date(e.fecha).toLocaleDateString("es-ES", { day:"2-digit", month:"short" })}
                      {" "}
                      {new Date(e.fecha).toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" })}
                    </span>
                    <span style={{ fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>
                      {e.campo === "estado"
                        ? `${EST_CFG[e.antes]?.label || e.antes} → ${EST_CFG[e.despues]?.label || e.despues}`
                        : e.texto || `${e.campo}: ${e.antes} → ${e.despues}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-red" onClick={onEliminar}>🗑 Eliminar</button>
            <div style={{ display:"flex", gap:".4rem" }}>
              <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
              <button className="btn btn-primary" onClick={onEditar}>✏️ Editar</button>
            </div>
          </div>
        </div>
      </div>
  , document.body);
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

export { FichaRow, FichaProyecto };
