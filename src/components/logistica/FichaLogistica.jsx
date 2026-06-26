// Auto-extracted from Logistica.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { FASES_CHECKLIST, ESTADO_ENTREGA, ESTADO_TAREA, ESTADO_COLORES, PUESTOS_REF, TIPOS_LOC, LOC_COLORS, TLI, CAT_ICONS, CATS_MATERIAL } from "./logisticaConstants.js";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";
import { SK_DOC_DOCS } from "@/constants/storageKeys";
import { resolverDestinoAsignacion } from "./logisticaHelpers";

// ─── MEJ-06: Detección de solapamiento de horarios en Timeline ───────────────
// Pure helper — exported for testing.
// Returns the first conflicting task, or null if no overlap found.
// Two tasks overlap when same responsable (case-insensitive), diferent id,
// and |hora_a - hora_b| < UMBRAL_MIN minutes.
export const UMBRAL_SOLAP_MIN = 30;

export function detectarSolapamiento(tareasExistentes, nuevaTarea) {
  const { hora, responsable, id } = nuevaTarea;
  if (!responsable || responsable.trim() === "") return null;
  if (!hora) return null;

  const toMinutes = (h) => {
    const [hh, mm] = h.split(":").map(Number);
    return hh * 60 + mm;
  };

  const minNueva = toMinutes(hora);
  const respNorm = responsable.trim().toLowerCase();

  for (const t of tareasExistentes) {
    if (t.id === id) continue; // misma tarea (edición sin cambios)
    if (!t.responsable || !t.hora) continue;
    if (t.responsable.trim().toLowerCase() !== respNorm) continue;
    const diff = Math.abs(toMinutes(t.hora) - minNueva);
    if (diff <= UMBRAL_SOLAP_MIN) return t;
  }
  return null;
}

// ─── FICHA LOGÍSTICA ──────────────────────────────────────────────────────────
function FichaLogistica({ ficha, material, veh, onClose, onEditar, onEliminar, asigs = [], setAsigs = null, locs = [], puestos = [], voluntarios = [], abrirModal = null }) {
  const { tipo, data } = ficha;
  const accents = { tl:"var(--amber)", ck:"var(--green)", mat:"var(--cyan)", veh:"var(--violet)", ruta:"var(--amber)", cont:"var(--cyan)", asig:"var(--cyan)", inc:"var(--red)" };
  const icons   = { tl:"⏱️", ck:"✅", mat:"📦", veh:"🚐", ruta:"🗺️", cont:"📞", asig:"📍", inc:"⚠️" };
  const accent  = accents[tipo] || "var(--cyan)";
  const titulo  = data.titulo || data.tarea || data.nombre || data.descripcion || "—";

  // ── Documentos vinculados (solo para tipo=cont, proveedor) ────────────────
  const [todosLosDocs] = useData(SK_DOC_DOCS, []);
  const docsProveedor = useMemo(() => {
    if (tipo !== "cont" || data.tipo !== "proveedor" || !data.nombre) return [];
    const nombreNorm = data.nombre.trim().toLowerCase();
    return (Array.isArray(todosLosDocs) ? todosLosDocs : [])
      .filter(d => (d.emisor || "").trim().toLowerCase() === nombreNorm)
      .sort((a, b) => {
        // presupuestos primero, luego facturas, luego resto
        const order = { presupuestos: 0, facturas: 1 };
        const oa = order[a.categoria] ?? 2;
        const ob = order[b.categoria] ?? 2;
        return oa !== ob ? oa - ob : new Date(b.fechaSubida || 0) - new Date(a.fechaSubida || 0);
      });
  }, [tipo, data, todosLosDocs]);

  const totalPresupuestadoProv = useMemo(() =>
    docsProveedor
      .filter(d => d.categoria === "presupuestos" && d.importe != null)
      .reduce((s, d) => s + (typeof d.importe === "number" ? d.importe : parseFloat(String(d.importe).replace(",", ".")) || 0), 0),
  [docsProveedor]);

  const totalFacturadoProv = useMemo(() =>
    docsProveedor
      .filter(d => d.categoria === "facturas" && d.importe != null)
      .reduce((s, d) => s + (typeof d.importe === "number" ? d.importe : parseFloat(String(d.importe).replace(",", ".")) || 0), 0),
  [docsProveedor]);

  const Row = ({label, value, color}) => !value ? null : (
    <div style={{display:"flex",justifyContent:"space-between",padding:".4rem 0",borderBottom:"1px solid rgba(30,45,80,.3)"}}>
      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",flexShrink:0,marginRight:"1rem"}}>{label}</span>
      <span style={{fontSize:"var(--fs-base)",fontWeight:600,textAlign:"right",color:color||"var(--text)"}}>{value}</span>
    </div>
  );

  const matNombre = tipo==="asig" ? (material.find(m=>m.id===data.materialId)?.nombre || data.materialNombre) : null;
  const vehNombre = tipo==="ruta" ? (veh.find(v=>v.id===data.vehiculoId)?.nombre || "—") : null;

  return createPortal(
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="modal modal-ficha">
          <div style={{borderTop:`3px solid ${accent}`,borderRadius:"16px 16px 0 0"}}>
            <div style={{padding:"1.1rem 1.4rem .9rem",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
                <span style={{fontSize:"var(--fs-lg)"}}>{icons[tipo]}</span>
                <div>
                  <div style={{fontWeight:800,fontSize:"var(--fs-md)",lineHeight:1.2}}>{titulo}</div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".1rem",textTransform:"uppercase"}}>
                    {tipo==="tl"?"Entrada Runbook":tipo==="ck"?"Pre-operativo":tipo==="mat"?"Material":tipo==="veh"?"Vehículo":tipo==="ruta"?"Ruta":tipo==="cont"?"Contacto":tipo==="asig"?"Asignación":"Incidencia"}
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost" style={{padding:".2rem .5rem"}} onClick={onClose} aria-label="Cerrar">✕</button>
            </div>
          </div>
          <div style={{padding:"1.1rem 1.4rem",display:"flex",flexDirection:"column",gap:".4rem"}}>
            {tipo==="tl" && (<>
              <Row label="Hora"        value={data.hora} color={accent} />
              <Row label="Estado"      value={data.estado} color={ESTADO_COLORES[data.estado]} />
              <Row label="Categoría"   value={`${TLI[data.categoria]} ${data.categoria}`} />
              <Row label="Responsable" value={data.responsable} />
              {data.descripcion && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:`2px solid ${accent}`,marginTop:".25rem"}}><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Descripción</div><div style={{fontSize:"var(--fs-base)",lineHeight:1.5}}>{data.descripcion}</div></div>}
            </>)}
            {tipo==="ck" && (<>
              <Row label="Fase"        value={data.fase} />
              <Row label="Estado"      value={data.estado} color={ESTADO_COLORES[data.estado]} />
              <Row label="Prioridad"   value={data.prioridad} color={data.prioridad==="alta"?"var(--red)":data.prioridad==="media"?"var(--amber)":"var(--green)"} />
              <Row label="Responsable" value={data.responsable} />
              {data.notas && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:`2px solid ${accent}`,marginTop:".25rem"}}><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div><div style={{fontSize:"var(--fs-base)",lineHeight:1.5}}>{data.notas}</div></div>}
            </>)}
            {tipo==="mat" && (() => {
              // Asignaciones de este material a cada puesto
              const asigsMat = asigs.filter(a => a.materialId === data.id);
              const totalAsig = asigsMat.reduce((s, a) => s + (a.cantidad || 0), 0);
              const totalEnt  = asigsMat.filter(a => a.estado === "entregado").reduce((s, a) => s + (a.cantidad || 0), 0);
              const deficit   = Math.max(totalAsig - (data.stock || 0), 0);

              return (
                <>
                  <Row label="Categoría"      value={`${CAT_ICONS[data.categoria]} ${data.categoria}`} />
                  <Row label="Stock total"    value={`${data.stock} ${data.unidad}`} />
                  {data.stockMinimo > 0 && (
                    <Row
                      label="Stock mínimo"
                      value={`${data.stockMinimo} ${data.unidad}`}
                      color={data.stock < data.stockMinimo ? "var(--red)" : "var(--text-muted)"}
                    />
                  )}
                  {data.cantidadInicial != null && (
                    <Row label="Cantidad inicial" value={`${data.cantidadInicial} ${data.unidad}`} color="var(--text-muted)" />
                  )}
                  <Row label="Asignado total" value={`${totalAsig} ${data.unidad}`} color={totalAsig > 0 ? "var(--cyan)" : "var(--text-muted)"} />
                  {totalEnt > 0 && <Row label="Entregado"  value={`${totalEnt} ${data.unidad}`} color="var(--green)" />}
                  {deficit > 0  && <Row label="⚠️ Déficit" value={`-${deficit} ${data.unidad}`} color="var(--red)" />}

                  {/* ── Distribución por puestos / voluntarios ─────────────── */}
                  <div style={{ marginTop: ".75rem", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: ".75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>
                        📍 Distribución
                        <Tooltip text="Unidades de este material asignadas a cada puesto o voluntario. Edita el estado de entrega directamente desde aquí.">
                          <TooltipIcon size={10} style={{ marginLeft: 4 }} />
                        </Tooltip>
                      </div>
                      {abrirModal && (
                        <button
                          className="btn btn-cyan"
                          style={{ fontSize: "var(--fs-xs)", padding: ".2rem .55rem" }}
                          onClick={() => {
                            onClose();
                            abrirModal({ tipo: "asig", data: { materialId: data.id }, conceptosPres: [] });
                          }}
                        >
                          + Asignar
                        </button>
                      )}
                    </div>

                    {asigsMat.length === 0 ? (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", textAlign: "center", padding: ".5rem 0" }}>
                        Sin asignaciones. Usa "+ Asignar" para repartir este material entre puestos o voluntarios.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                        {asigsMat.map(a => {
                          const destino = resolverDestinoAsignacion(a, { puestos, voluntarios, locs });
                          const estadoColor = ESTADO_COLORES[a.estado] || "var(--text-muted)";
                          return (
                            <div key={a.id} style={{
                              display: "flex", alignItems: "center", gap: ".5rem",
                              padding: ".35rem .5rem", borderRadius: "var(--r-sm)",
                              background: "var(--surface2)", border: "1px solid var(--border)",
                              flexWrap: "wrap",
                            }}>
                              <span style={{ fontSize: "var(--fs-sm)", flexShrink: 0 }}>{destino.icono}</span>
                              <span style={{ flex: 1, fontSize: "var(--fs-sm)", fontWeight: 600, minWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {destino.nombre}
                              </span>
                              {destino.necesitaRevision && (
                                <span title="No se pudo resolver automáticamente — revísalo al editar esta asignación"
                                  style={{ fontSize: "var(--fs-2xs)", color: "var(--amber)", flexShrink: 0 }}>⚠️</span>
                              )}
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--cyan)", flexShrink: 0 }}>
                                {a.cantidad} {data.unidad}
                              </span>
                              {setAsigs ? (
                                <select
                                  value={a.estado}
                                  onChange={e => {
                                    const nuevoEstado = e.target.value;
                                    setAsigs(prev => prev.map(x => x.id === a.id ? { ...x, estado: nuevoEstado } : x));
                                  }}
                                  onClick={e => e.stopPropagation()}
                                  style={{
                                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                                    background: "var(--surface3)", border: "1px solid var(--border)",
                                    borderRadius: "var(--r-sm)", padding: ".15rem .35rem",
                                    color: estadoColor, flexShrink: 0, cursor: "pointer",
                                  }}
                                >
                                  {ESTADO_ENTREGA.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              ) : (
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: estadoColor, flexShrink: 0 }}>
                                  {a.estado}
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {asigsMat.length > 1 && (
                          <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginTop: ".2rem", paddingTop: ".35rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                            {["pendiente","en tránsito","entregado","recogido"].map(est => {
                              const n = asigsMat.filter(a => a.estado === est).length;
                              if (!n) return null;
                              return (
                                <span key={est} style={{
                                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)",
                                  padding: ".08rem .35rem", borderRadius: 20,
                                  background: `${ESTADO_COLORES[est] || "var(--text-muted)"}18`,
                                  color: ESTADO_COLORES[est] || "var(--text-muted)",
                                  border: `1px solid ${ESTADO_COLORES[est] || "var(--text-muted)"}33`,
                                }}>
                                  {est}: {n}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
            {tipo==="asig" && (() => {
              const destino = resolverDestinoAsignacion(data, { puestos, voluntarios, locs });
              return (<>
                <Row label="Material"    value={matNombre} />
                <Row label="Tipo destino" value={destino.tipo === "voluntario" ? "🙋 Voluntario" : destino.tipo === "puesto" ? "🧑‍🤝‍🧑 Puesto" : "⚠️ Sin resolver"} />
                <Row label="Destino"     value={destino.nombre} color={destino.necesitaRevision ? "var(--amber)" : undefined} />
                <Row label="Cantidad"    value={`${data.cantidad} ${data.unidad||""}`} />
                <Row label="Estado"      value={data.estado} color={ESTADO_COLORES[data.estado]} />
                {destino.necesitaRevision && (
                  <div style={{ marginTop: ".4rem", padding: ".5rem .65rem", borderRadius: 8, background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.25)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--amber)" }}>
                    ⚠️ Esta asignación necesita revisión: edítala y elige a qué puesto o voluntario pertenece.
                  </div>
                )}
              </>);
            })()}
            {tipo==="veh" && (<>
              <Row label="Matrícula"   value={data.matricula} />
              <Row label="Conductor"   value={data.conductor} />
              <Row label="Capacidad"   value={data.capacidad} />
              <Row label="Teléfono"    value={data.telefono} />
              {data.notas && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:`2px solid ${accent}`}}><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div><div style={{fontSize:"var(--fs-base)",lineHeight:1.5}}>{data.notas}</div></div>}
            </>)}
            {tipo==="ruta" && (<>
              <Row label="Vehículo"    value={vehNombre} />
              <Row label="Hora inicio" value={data.horaInicio} />
              <Row label="Paradas"     value={`${(data.paradas||[]).length} paradas`} />
              {(data.paradas||[]).length>0 && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",marginTop:".25rem"}}>{(data.paradas||[]).map((p,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:".25rem 0",borderBottom:i<data.paradas.length-1?"1px solid rgba(30,45,80,.2)":"none",fontSize:"var(--fs-sm)"}}><span style={{fontWeight:600}}>{p.puesto}</span><span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--cyan)"}}>{p.hora}</span></div>)}</div>}
            </>)}
            {tipo==="cont" && (<>
              <Row label="Rol"         value={data.rol} />
              <Row label="Tipo"        value={`${({"emergencia":"🚨","proveedor":"🏭","staff":"👤","institucional":"🏛️"})[data.tipo]||""} ${data.tipo}`} />
              <Row label="Teléfono"    value={data.telefono} color="var(--cyan)" />
              <Row label="Email"       value={data.email} />
              {data.notas && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:`2px solid ${accent}`}}><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div><div style={{fontSize:"var(--fs-base)",lineHeight:1.5}}>{data.notas}</div></div>}

              {/* ── Documentos vinculados del proveedor ── */}
              {data.tipo === "proveedor" && (
                <div style={{marginTop:".75rem",borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:".75rem"}}>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",fontWeight:700,letterSpacing:".05em",textTransform:"uppercase",marginBottom:".5rem"}}>
                    📁 Documentos vinculados
                    <Tooltip text="Documentos del módulo Documentos donde el emisor coincide con el nombre de este proveedor.">
                      <TooltipIcon size={10} style={{marginLeft:4}}/>
                    </Tooltip>
                  </div>
                  {docsProveedor.length === 0 ? (
                    <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",textAlign:"center",padding:".5rem 0"}}>
                      Sin documentos vinculados. Sube facturas o presupuestos en el módulo Documentos con este proveedor como emisor.
                    </div>
                  ) : (
                    <>
                      {/* Totales económicos */}
                      {(totalPresupuestadoProv > 0 || totalFacturadoProv > 0) && (
                        <div style={{display:"flex",gap:".75rem",flexWrap:"wrap",marginBottom:".5rem"}}>
                          {totalPresupuestadoProv > 0 && (
                            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#34d399",background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.25)",borderRadius:20,padding:".15rem .55rem"}}>
                              💰 Presupuestado: {new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(totalPresupuestadoProv)}
                            </span>
                          )}
                          {totalFacturadoProv > 0 && (
                            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#22d3ee",background:"rgba(34,211,238,0.1)",border:"1px solid rgba(34,211,238,0.25)",borderRadius:20,padding:".15rem .55rem"}}>
                              🧾 Facturado: {new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(totalFacturadoProv)}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Lista de documentos */}
                      <div style={{display:"flex",flexDirection:"column",gap:".3rem"}}>
                        {docsProveedor.map(doc => {
                          const catIcon = {"presupuestos":"💰","facturas":"🧾","contratos":"📝","seguros":"🛡️","permisos":"📋"}[doc.categoria] || "📎";
                          const estadoColor = {"aprobado":"#34d399","vigente":"#34d399","pendiente":"#94a3b8","vencido":"#f87171","firmado":"#a78bfa"}[doc.estado] || "#94a3b8";
                          return (
                            <div key={doc.id} style={{display:"flex",alignItems:"center",gap:".5rem",padding:".35rem .5rem",background:"var(--surface2)",borderRadius:6,flexWrap:"wrap"}}>
                              <span style={{fontSize:"var(--fs-sm)"}}>{catIcon}</span>
                              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                {doc.nombreDisplay || doc.nombre}
                              </span>
                              {doc.importe != null && (
                                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#34d399",flexShrink:0}}>
                                  {new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(typeof doc.importe==="number"?doc.importe:parseFloat(String(doc.importe).replace(",","."))||0)}
                                </span>
                              )}
                              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:estadoColor,flexShrink:0}}>{doc.estado||"—"}</span>
                              {doc.blobUrl && (
                                <a href={doc.blobUrl} target="_blank" rel="noreferrer"
                                  style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"#38bdf8",flexShrink:0,textDecoration:"underline"}}>
                                  Ver
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>)}
            {tipo==="inc" && (<>
              <Row label="Hora"        value={data.hora} />
              <Row label="Tipo"        value={data.tipo} />
              <Row label="Gravedad"    value={data.gravedad} color={data.gravedad==="alta"?"var(--red)":data.gravedad==="media"?"var(--amber)":"var(--green)"} />
              <Row label="Estado"      value={data.estado} color={data.estado==="resuelta"?"var(--green)":data.estado==="en gestión"?"var(--cyan)":"var(--amber)"} />
              <Row label="Responsable" value={data.responsable} />
              {data.resolucion && <Row label="Resolución" value={data.resolucion} color="var(--green)" />}
              {/* Protocolo de escalado automático según gravedad */}
              {data.gravedad && data.estado !== "resuelta" && (
                <div style={{marginTop:".5rem",padding:".6rem .75rem",borderRadius:8,
                  background:data.gravedad==="alta"?"var(--red-dim)":data.gravedad==="media"?"var(--amber-dim)":"var(--green-dim)",
                  border:`1px solid ${data.gravedad==="alta"?"rgba(248,113,113,0.25)":data.gravedad==="media"?"rgba(251,191,36,0.25)":"rgba(52,211,153,0.25)"}`}}>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                    color:data.gravedad==="alta"?"var(--red)":data.gravedad==="media"?"var(--amber)":"var(--green)",
                    marginBottom:".35rem",textTransform:"uppercase",letterSpacing:".06em"}}>
                    {data.gravedad==="alta"?"🔴 Protocolo ALTA — acción inmediata":
                     data.gravedad==="media"?"🟡 Protocolo MEDIA — monitorizar":
                     "🟢 Protocolo BAJA — registrar y gestionar"}
                  </div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",lineHeight:1.6}}>
                    {data.gravedad==="alta" && "1. Notificar Dirección de carrera inmediatamente · 2. Contactar Cruz Roja / 112 si hay riesgo vital · 3. No mover al afectado sin personal sanitario · 4. Mantener línea abierta por walkie hasta resolución"}
                    {data.gravedad==="media" && "1. Informar a Coordinación en próxima comunicación · 2. Evaluar si requiere apoyo de otro puesto · 3. Registrar evolución cada 15 min · 4. Escalar a ALTA si empeora"}
                    {data.gravedad==="baja" && "1. Gestionar en el propio puesto · 2. Registrar para informe post-carrera · 3. Informar a Coordinación al finalizar la jornada"}
                  </div>
                </div>
              )}
            </>)}
          </div>
          <div style={{padding:".9rem 1.4rem",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:".5rem"}}>
            <button className="btn btn-red" onClick={()=>onEliminar(tipo==="mat"?"material":tipo==="asig"?"asig":tipo==="veh"?"veh":tipo==="ruta"?"ruta":tipo==="cont"?"cont":tipo==="inc"?"inc":tipo==="tl"?"tl":"ck", data.id)}>🗑 Eliminar</button>
            <div style={{display:"flex",gap:".4rem"}}>
              <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
              <button className="btn btn-cyan" onClick={()=>onEditar(tipo,data)}>✏️ Editar</button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
}


function ModalRouter({modal,onClose,material,setMaterial,asigs,setAsigs,veh,setVeh,rutas,setRutas,tl,setTl,cont,setCont,inc,setInc,ck,setCk,locs,puestos=[],voluntarios=[],tiposContacto=[],conceptosPres=[]}) {
  useEffect(() => {
    const t = setTimeout(() => {
      const firstField = document.querySelector(".modal-backdrop .modal-body input, .modal-backdrop .modal-body select, .modal-backdrop .modal-body textarea");
      if (firstField) firstField.focus();
    }, 80);
    return () => clearTimeout(t);
  }, []);
  const {tipo,data}=modal;
  const locNames = locs && locs.length > 0 ? locs.map(function(locItem){return locItem.nombre;}) : PUESTOS_REF;
  const TIPO_LABELS = { material:"Material", asig:"Asignación", veh:"Vehículo", ruta:"Ruta", tl:"Entrada de runbook", cont:"Contacto", inc:"Incidencia", ck:"Tarea pre-operativa" };
  const sv=(stFn,stArr,stItem,tipo="elemento")=>{ const esNuevo=!stItem.id; if(esNuevo) stFn(prev=>[...prev,{...stItem,id:genIdNum(stArr)}]); else stFn(prev=>prev.map(x=>x.id===stItem.id?stItem:x)); onClose(); toast.success(esNuevo?`${TIPO_LABELS[tipo]||tipo} creado`:`${TIPO_LABELS[tipo]||tipo} actualizado`); };

  if(tipo==="mat") {
    const matConceptos = modal.matConceptosres || [];
    const camposConcepto = matConceptos.length > 0 ? [{
      k:"presupuestoConceptoId", l:"Concepto del presupuesto (opcional)",
      t:"sel",
      o:[null,...matConceptos.map(c=>c.id)],
      lb:["— Sin vínculo",...matConceptos.map(c=>`[${c.tipo==="variable"?"var":"fijo"}] ${c.nombre}`)],
      num:true, nullable:true,
    }] : [];
    return <MF title={data?"✏️ Editar material":"📦 Nuevo material"} onClose={onClose}
      fields={[
        {k:"nombre",l:"Nombre *",t:"text"},
        {k:"categoria",l:"Categoría",t:"sel",o:CATS_MATERIAL},
        {k:"stock",l:"Stock total (unidades en almacén)",t:"num"},
        {k:"stockMinimo",l:"Stock mínimo (alerta)",t:"num"},
        {k:"unidad",l:"Unidad (ud/kg/rollos...)",t:"text"},
        ...camposConcepto,
      ]}
      init={data||{nombre:"",categoria:"Avituallamiento",stock:0,stockMinimo:0,unidad:"ud",presupuestoConceptoId:null}}
      onSave={v=>sv(setMaterial,material,{...v,presupuestoConceptoId:v.presupuestoConceptoId?parseInt(v.presupuestoConceptoId):null},"material")} />;
  }

  if(tipo==="asig") return <ModalAsignacion data={data} material={material} asigs={asigs} puestos={puestos} voluntarios={voluntarios} locs={locs} onClose={onClose}
    onSave={v=>sv(setAsigs,asigs,v,"asig")} />;

  if(tipo==="veh") return <MF title={data?"✏️ Editar vehículo":"🚗 Nuevo vehículo"} onClose={onClose}
    fields={[{k:"nombre",l:"Nombre *",t:"text"},{k:"matricula",l:"Matrícula",t:"text"},{k:"conductor",l:"Conductor",t:"text"},{k:"capacidad",l:"Capacidad",t:"text"},{k:"telefono",l:"Teléfono",t:"text"},{k:"notas",l:"Notas",t:"text"}]}
    init={data||{nombre:"",matricula:"",conductor:"",capacidad:"",telefono:"",notas:""}}
    onSave={v=>sv(setVeh,veh,v,"veh")} />;

  if(tipo==="ruta") return <ModalRuta data={data} veh={veh} rutas={rutas} setRutas={setRutas} onClose={onClose} locs={locs} />;

  if(tipo==="tl") return <MF title={data?"✏️ Editar entrada":"⏱️ Nueva entrada del Runbook"} onClose={onClose}
    fields={[{k:"hora",l:"Hora",t:"time"},{k:"titulo",l:"Título *",t:"text"},{k:"descripcion",l:"Descripción",t:"text"},{k:"responsable",l:"Responsable",t:"text"},{k:"categoria",l:"Categoría",t:"sel",o:["logistica","organizacion","voluntarios","carrera","comunicacion"]},{k:"estado",l:"Estado",t:"sel",o:ESTADO_TAREA}]}
    init={data||{hora:"08:00",titulo:"",descripcion:"",responsable:"",categoria:"organizacion",estado:"pendiente"}}
    onSave={v=>{
      // MEJ-06: check overlap BEFORE saving — warning only, does NOT block save
      const conflicto = detectarSolapamiento(tl, { ...v, id: data?.id });
      if (conflicto) {
        toast.warning(`⚠ ${v.responsable} ya tiene asignada "${conflicto.titulo}" a las ${conflicto.hora}. Verifica que sea operativamente viable.`, 6000);
      }
      sv(setTl,tl,v,"tl");
    }} />;

  if(tipo==="cont") {
    const TIPOS_BASE_IDS = ["emergencia","proveedor","staff","institucional","medico","media"];
    const tiposBase = [
      {id:"emergencia",nombre:"Emergencia"},{id:"proveedor",nombre:"Proveedor"},
      {id:"staff",nombre:"Staff"},{id:"institucional",nombre:"Institucional"},
      {id:"medico",nombre:"Médico"},{id:"media",nombre:"Media/Prensa"},
    ];
    const tiposMerge = [...tiposBase, ...(tiposContacto||[])];
    return <MF title={data?"✏️ Editar contacto":"📞 Nuevo contacto"} onClose={onClose}
      fields={[
        {k:"nombre",l:"Nombre *",t:"text"},
        {k:"rol",l:"Rol / Cargo",t:"text"},
        {k:"telefono",l:"Teléfono *",t:"text"},
        {k:"email",l:"Email",t:"text"},
        {k:"web",l:"Web",t:"text"},
        {k:"tipo",l:"Tipo",t:"sel",o:tiposMerge.map(t=>t.id),lb:tiposMerge.map(t=>t.nombre)},
        {k:"notas",l:"Notas",t:"text"},
      ]}
      init={data||{nombre:"",rol:"",telefono:"",email:"",web:"",tipo:"staff",notas:""}}
      onSave={v=>sv(setCont,cont,v,"cont")} />;
  }

  if(tipo==="inc") {
    const esNueva = !data;
    const locOpts = (locs && locs.length > 0 ? locs.map(l=>l.nombre) : PUESTOS_REF);
    const puestosOpts = ["— Sin puesto específico", ...locOpts];
    return <MF title={esNueva?"⚠️ Registrar incidencia":"✏️ Editar incidencia"} onClose={onClose}
      fields={[
        {k:"hora",        l:"Hora",           t:"time"},
        {k:"puestoNombre",l:"Puesto",          t:"sel", o:puestosOpts},
        {k:"tipo",        l:"Tipo",            t:"sel", o:["médica","señalización","avituallamiento","corredor perdido","meteorológica","otra"]},
        {k:"gravedad",    l:"Gravedad",        t:"sel", o:["baja","media","alta"]},
        {k:"descripcion", l:"Descripción *",   t:"text"},
        {k:"responsable", l:"Responsable",     t:"text"},
        ...(esNueva ? [] : [
          {k:"estado",    l:"Estado",          t:"sel", o:["abierta","en gestión","resuelta"]},
          {k:"resolucion",l:"Resolución",       t:"text"},
        ]),
      ]}
      init={data || {
        hora:         new Date().toTimeString().slice(0,5),
        creadaEn:     new Date().toISOString(),
        puestoNombre: "— Sin puesto específico",
        tipo:         "médica",
        gravedad:     "media",
        descripcion:  "",
        responsable:  "",
        estado:       "abierta",
        resolucion:   "",
      }}
      onSave={v=>{
        const loc = locs && locs.find(l => l.nombre === v.puestoNombre);
        const resueltaAhora = v.estado === "resuelta" && !data?.resueltaEn;
        sv(setInc, inc, {
          ...v,
          puestoId:   loc?.id || null,
          creadaEn:   data?.creadaEn || v.creadaEn || new Date().toISOString(),
          resueltaEn: resueltaAhora ? new Date().toISOString() : (data?.resueltaEn || null),
        }, "inc");
      }} />;
  }

  if(tipo==="ck") {
    const tareasProy = Array.isArray(modal.tareasProyecto) ? modal.tareasProyecto : [];
    const camposVinculo = tareasProy.length > 0 ? [{
      k:"proyectoTareaId", l:"Vincular tarea de Proyecto (opcional)",
      t:"sel",
      o:[null,...tareasProy.map(t=>t.id)],
      lb:["— Sin vínculo",...tareasProy.map(t=>`[${t.area||""}] ${(t.titulo||"").slice(0,40)}`)],
      num:true, nullable:true
    }] : [];
    return <MF title={data?"✏️ Editar ítem":"✅ Nuevo ítem pre-operativo"} onClose={onClose}
      fields={[
        {k:"tarea",l:"Tarea *",t:"text"},
        {k:"fase",l:"Fase",t:"sel",o:FASES_CHECKLIST},
        {k:"responsable",l:"Responsable",t:"text"},
        {k:"prioridad",l:"Prioridad",t:"sel",o:["alta","media","baja"]},
        {k:"estado",l:"Estado",t:"sel",o:ESTADO_TAREA},
        ...camposVinculo,
        {k:"notas",l:"Notas",t:"text"},
      ]}
      init={data||{tarea:"",fase:modal.fase||"Semana antes",responsable:"",prioridad:"media",estado:"pendiente",proyectoTareaId:null,notas:""}}
      onSave={v=>sv(setCk,ck,{...v,proyectoTareaId:v.proyectoTareaId?parseInt(v.proyectoTareaId):null},"ck")} />;
  }

  return null;
}

function MF({title,fields,init,onSave,onClose}) {
  const { closing: mfClosing, handleClose: mfHandleClose } = useModalClose(onClose);
  const [form,setForm]=useState({...init});
  const [errs,setErrs]=useState({});
  function upd(fldKey,fldVal){ setForm(function(fPrev){return {...fPrev,[fldKey]:fldVal};}); if(errs[fldKey]) setErrs(function(ePrev){return {...ePrev,[fldKey]:null};}); }

  const validar=()=>{
    const mfErrs={};
    fields.forEach(function(mfFld){
      if(!mfFld.l.includes("*")) return;
      const mfVal=form[mfFld.k];
      if(mfFld.t==="num"){ if(!mfVal && mfVal!==0) mfErrs[mfFld.k]="Requerido"; }
      else if(!mfVal || (typeof mfVal==="string" && !mfVal.trim())) mfErrs[mfFld.k]="Requerido";
    });
    setErrs(mfErrs);
    return Object.keys(mfErrs).length===0;
  };

  // sin scroll-lock — causa freeze en Android
  useEffect(() => {
    const m = document.querySelector("main");
    if (m) m.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return createPortal(
    <div className={`modal-backdrop${mfClosing ? " modal-backdrop-closing" : ""}`} onClick={e=>e.target===e.currentTarget&&mfHandleClose()}>
      <div className={`modal modal-ficha${mfClosing ? " modal-closing" : ""}`}>
        <div className="modal-header"><span className="mtit">{title}</span><button className="btn btn-sm btn-ghost" aria-label="Cerrar formulario" onClick={mfHandleClose}><span aria-hidden="true">✕</span></button></div>
        <div className="modal-body">
          {fields.map(f=>(
            <div key={f.k}>
              <label className="fl" style={errs[f.k]?{color:"var(--red)"}:{}}>{f.l}</label>
              {f.t==="sel"?(
                <select className="inp" value={form[f.k]} onChange={e=>upd(f.k,f.num?parseInt(e.target.value):e.target.value)}
                  style={errs[f.k]?{borderColor:"var(--red)"}:{}}>
                  {(f.o||[]).map((o,i)=><option key={o} value={o}>{f.lb?.[i]||o}</option>)}
                </select>
              ):(
                <input className="inp" type={f.t==="num"?"number":f.t||"text"} value={form[f.k]||""}
                  onChange={e=>upd(f.k,f.t==="num"?parseFloat(e.target.value)||0:e.target.value)}
                  placeholder={f.l.replace(" *","")}
                  style={errs[f.k]?{borderColor:"var(--red)"}:{}} />
              )}
              {errs[f.k] && <div className="xs mono" style={{color:"var(--red)",marginTop:".2rem"}}>⚠ {errs[f.k]}</div>}
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={mfHandleClose}>Cancelar</button>
          <button className="btn btn-cyan" onClick={()=>{ if(validar()) onSave(form); }}>
            {init?.id?"💾 Guardar":"➕ Añadir"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ModalRuta({data,veh,rutas,setRutas,onClose,locs}) {
  const locNames = locs && locs.length > 0 ? locs.map(function(locItem){return locItem.nombre;}) : PUESTOS_REF;
  const [form,setForm]=useState(() => {
    const base = data || {nombre:"",vehiculoId:veh[0]?.id||1,horaInicio:"05:00",paradas:[]};
    return { ...base, paradas: Array.isArray(base.paradas) ? base.paradas : [] };
  });
  const { closing: rutaClosing, handleClose: rutaHandleClose } = useModalClose(onClose);
  const [formErr,setFormErr]=useState(false);
  function upd(kUpd,vUpd){setForm(function(rpUpd2){return {...rpUpd2,[kUpd]:vUpd};});}
  function addP(){setForm(function(rpAdd){return {...rpAdd,paradas:[...rpAdd.paradas,{puesto:locNames[0],hora:"06:00",material:""}]};});}
  function updP(iIdx,kKey,vVal){setForm(function(rpUpd){return {...rpUpd,paradas:rpUpd.paradas.map(function(xx,jj){return jj===iIdx?{...xx,[kKey]:vVal}:xx;})};});}
  function delP(iDel){setForm(function(rpDel){return {...rpDel,paradas:rpDel.paradas.filter(function(_,jj){return jj!==iDel;})};});}
  const save=()=>{
    if(!form.nombre){ setFormErr(true); return; }
    const rutaItem={...form,vehiculoId:parseInt(form.vehiculoId)};
    if(rutaItem.id) {
      setRutas(function(rsPrev){return rsPrev.map(function(rsItm){return rsItm.id===rutaItem.id?rutaItem:rsItm;});});
      toast.success("Ruta actualizada");
    }
    else {
      setRutas(function(rsPrev){return [...rsPrev,{...rutaItem,id:genIdNum(rutas)}];});
      toast.success("Ruta creada");
    }
    onClose();
  };
  // sin scroll-lock — causa freeze en Android
  return createPortal(
    <div className={`modal-backdrop${rutaClosing ? " modal-backdrop-closing" : ""}`} onClick={e=>e.target===e.currentTarget&&rutaHandleClose()}>
      <div className={`modal modal-ficha${rutaClosing ? " modal-closing" : ""}`} style={{maxWidth:560}}>
        <div className="modal-header"><span className="mtit">{data?"✏️ Editar ruta":"🗺️ Nueva ruta"}</span><button className="btn btn-sm btn-ghost" onClick={rutaHandleClose}><span aria-hidden="true">✕</span></button></div>
        <div className="modal-body">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
            <div>
              <label className="fl" style={{color:!form.nombre&&formErr?"var(--red)":undefined}}>Nombre *</label>
              <input className="inp" autoFocus value={form.nombre} onChange={e=>{upd("nombre",e.target.value);setFormErr(false);}}
                placeholder="Nombre de la ruta"
                style={{borderColor:!form.nombre&&formErr?"var(--red)":undefined}}/>
              {!form.nombre&&formErr&&<div className="xs mono" style={{color:"var(--red)",marginTop:".2rem"}}>⚠ El nombre es obligatorio</div>}
            </div>
            <div><label className="fl">Hora de salida</label><input className="inp" type="time" value={form.horaInicio} onChange={e=>upd("horaInicio",e.target.value)}/></div>
          </div>
          <div><label className="fl">Vehículo</label>
            <select className="inp" value={form.vehiculoId} onChange={e=>upd("vehiculoId",parseInt(e.target.value))}>
              {veh.map(v=><option key={v.id} value={v.id}>{v.nombre} — {v.conductor}</option>)}
            </select>
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.4rem"}}>
              <label className="fl" style={{margin:0}}>Paradas ({form.paradas.length})</label>
              <button className="btn btn-cyan" style={{fontSize:"var(--fs-sm)",padding:"0.2rem 0.6rem"}} onClick={addP}>+ Parada</button>
            </div>
            {Array.isArray(form.paradas) && form.paradas.map((p,i)=>(
              <div key={i} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"0.6rem",marginBottom:"0.4rem"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"0.4rem",marginBottom:"0.3rem",alignItems:"start"}}>
                  <select className="inp isml" style={{width:"100%",fontSize:"var(--fs-base)"}} value={p.puesto} onChange={e=>updP(i,"puesto",e.target.value)}>
                    {PUESTOS_REF.map(pr=><option key={pr} value={pr}>{pr}</option>)}
                  </select>
                  <div style={{display:"flex",gap:"0.3rem",alignItems:"center"}}>
                    <input className="inp isml" type="time" value={p.hora} onChange={e=>updP(i,"hora",e.target.value)} style={{width:80}}/>
                    <button className="btn btn-sm btn-red" onClick={()=>delP(i)} aria-label="Cerrar">✕</button>
                  </div>
                </div>
                <input className="inp isml" value={p.material} onChange={e=>updP(i,"material",e.target.value)} placeholder="Material a entregar..." style={{width:"100%",fontSize:"var(--fs-sm)"}}/>
              </div>
            ))}
            {form.paradas.length===0&&<div className="empty" style={{padding:"0.75rem"}}>Sin paradas — pulsa + Parada</div>}
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-cyan" onClick={save}>{data?"💾 Guardar":"➕ Crear ruta"}</button></div>
      </div>
    </div>,
    document.body
  );
}


// ─── MEJ-LOG-PUESTO: Modal dedicado de Asignación de material ───────────────
// Sustituye al antiguo formulario genérico (MF) que solo dejaba elegir la
// ubicación del mapa por nombre. Ahora el destino real es un Puesto concreto
// de Voluntarios o un Voluntario concreto (ej. su walkie-talkie personal).
function ModalAsignacion({ data, material, asigs, puestos = [], voluntarios = [], locs = [], onClose, onSave }) {
  const { closing: maClosing, handleClose: maHandleClose } = useModalClose(onClose);
  const [tipoDestino, setTipoDestino] = useState(data?.tipoDestino === "voluntario" ? "voluntario" : "puesto");
  const [materialId, setMaterialId] = useState(data?.materialId ?? material[0]?.id ?? null);
  const [puestoId, setPuestoId]     = useState(data?.puestoId ?? null);
  const [voluntarioId, setVolId]    = useState(data?.voluntarioId ?? null);
  const [cantidad, setCantidad]     = useState(data?.cantidad ?? 1);
  const [estado, setEstado]         = useState(data?.estado ?? "pendiente");
  const [busqDestino, setBusqDestino] = useState("");
  const [errs, setErrs] = useState({});

  const conteoPorLoc = useMemo(() => {
    const map = new Map();
    puestos.forEach(p => { if (p?.localizacionId != null) map.set(p.localizacionId, (map.get(p.localizacionId) || 0) + 1); });
    return map;
  }, [puestos]);

  const puestosFiltrados = useMemo(() => {
    const q = busqDestino.trim().toLowerCase();
    const lista = !q ? puestos : puestos.filter(p => (p.nombre || "").toLowerCase().includes(q) || (p.tipo || "").toLowerCase().includes(q));
    return [...lista].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
  }, [puestos, busqDestino]);

  const voluntariosFiltrados = useMemo(() => {
    const q = busqDestino.trim().toLowerCase();
    const lista = !q ? voluntarios : voluntarios.filter(v => {
      const nombreComp = [v.nombre, v.apellidos].filter(Boolean).join(" ").toLowerCase();
      return nombreComp.includes(q);
    });
    return [...lista].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
  }, [voluntarios, busqDestino]);

  const validar = () => {
    const e = {};
    if (!materialId) e.materialId = "Selecciona un material";
    if (tipoDestino === "puesto" && !puestoId) e.destino = "Selecciona un puesto";
    if (tipoDestino === "voluntario" && !voluntarioId) e.destino = "Selecciona un voluntario";
    if (!cantidad || cantidad < 1) e.cantidad = "La cantidad mínima es 1";
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validar()) return;
    const puestoElegido = tipoDestino === "puesto" ? puestos.find(p => p.id === puestoId) : null;
    onSave({
      ...(data?.id ? { id: data.id } : {}),
      materialId: parseInt(materialId),
      cantidad: parseInt(cantidad) || 1,
      estado,
      tipoDestino,
      puestoId: tipoDestino === "puesto" ? puestoId : null,
      voluntarioId: tipoDestino === "voluntario" ? voluntarioId : null,
      localizacionId: tipoDestino === "puesto" ? (puestoElegido?.localizacionId ?? null) : null,
    });
  };

  return createPortal(
    <div className={`modal-backdrop${maClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target === e.currentTarget && maHandleClose()}>
      <div className={`modal modal-ficha${maClosing ? " modal-closing" : ""}`}>
        <div className="modal-header">
          <span className="mtit">{data?.id ? "✏️ Editar asignación" : "📍 Nueva asignación"}</span>
          <button className="btn btn-sm btn-ghost" aria-label="Cerrar" onClick={maHandleClose}><span aria-hidden="true">✕</span></button>
        </div>
        <div className="modal-body">
          <div>
            <label className="fl" style={errs.materialId ? { color: "var(--red)" } : {}}>Material</label>
            <select className="inp" value={materialId ?? ""} onChange={e => setMaterialId(parseInt(e.target.value))}
              style={errs.materialId ? { borderColor: "var(--red)" } : {}}>
              {material.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>

          {/* ── Tipo de destino: puesto o voluntario ── */}
          <div>
            <label className="fl">¿A quién se asigna?</label>
            <div style={{ display: "flex", gap: ".4rem", marginBottom: ".45rem", flexWrap: "wrap" }}>
              {[
                { k: "puesto",     label: "🧑‍🤝‍🧑 A un puesto" },
                { k: "voluntario", label: "🙋 A un voluntario" },
              ].map(({ k, label }) => (
                <button key={k} onClick={() => { setTipoDestino(k); setBusqDestino(""); setErrs(p => ({ ...p, destino: undefined })); }}
                  style={{
                    padding: "0.25rem 0.65rem", borderRadius: 6, cursor: "pointer",
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                    border: `1px solid ${tipoDestino === k ? "var(--cyan)" : "var(--border)"}`,
                    background: tipoDestino === k ? "rgba(34,211,238,0.12)" : "var(--surface2)",
                    color: tipoDestino === k ? "var(--cyan)" : "var(--text-muted)",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            <input className="inp" type="search" placeholder={tipoDestino === "puesto" ? "🔍 Buscar puesto…" : "🔍 Buscar voluntario…"}
              value={busqDestino} onChange={e => setBusqDestino(e.target.value)}
              style={{ marginBottom: ".4rem" }} />

            {tipoDestino === "puesto" ? (
              <select className="inp" value={puestoId ?? ""} size={Math.min(6, Math.max(3, puestosFiltrados.length))}
                onChange={e => { setPuestoId(parseInt(e.target.value)); setErrs(p => ({ ...p, destino: undefined })); }}
                style={errs.destino ? { borderColor: "var(--red)" } : {}}>
                {puestosFiltrados.map(p => {
                  const loc = locs.find(l => l.id === p.localizacionId);
                  const compartido = p.localizacionId != null && (conteoPorLoc.get(p.localizacionId) || 0) > 1;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nombre}{loc ? ` — 📍 ${loc.nombre}` : ""}{compartido ? " (ubicación compartida)" : ""}
                    </option>
                  );
                })}
                {puestosFiltrados.length === 0 && <option disabled value="">Sin puestos que coincidan</option>}
              </select>
            ) : (
              <select className="inp" value={voluntarioId ?? ""} size={Math.min(6, Math.max(3, voluntariosFiltrados.length))}
                onChange={e => { setVolId(parseInt(e.target.value)); setErrs(p => ({ ...p, destino: undefined })); }}
                style={errs.destino ? { borderColor: "var(--red)" } : {}}>
                {voluntariosFiltrados.map(v => {
                  const puestoVol = puestos.find(p => p.id === v.puestoId);
                  return (
                    <option key={v.id} value={v.id}>
                      {[v.nombre, v.apellidos].filter(Boolean).join(" ")}{puestoVol ? ` — ${puestoVol.nombre}` : " — sin puesto"}
                    </option>
                  );
                })}
                {voluntariosFiltrados.length === 0 && <option disabled value="">Sin voluntarios que coincidan</option>}
              </select>
            )}
            {errs.destino && <div className="xs mono" style={{ color: "var(--red)", marginTop: ".2rem" }}>⚠ {errs.destino}</div>}
          </div>

          <div className="field-row">
            <div>
              <label className="fl" style={errs.cantidad ? { color: "var(--red)" } : {}}>Cantidad</label>
              <input className="inp" type="number" min={1} value={cantidad} onChange={e => setCantidad(parseInt(e.target.value) || 0)}
                style={errs.cantidad ? { borderColor: "var(--red)" } : {}} />
            </div>
            <div>
              <label className="fl">Estado entrega</label>
              <select className="inp" value={estado} onChange={e => setEstado(e.target.value)}>
                {ESTADO_ENTREGA.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={maHandleClose}>Cancelar</button>
          <button className="btn btn-cyan" onClick={save}>{data?.id ? "💾 Guardar" : "➕ Añadir"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Exports
export { FichaLogistica };
export { ModalRouter };
export { MF };
export { ModalRuta };
export { ModalAsignacion };
