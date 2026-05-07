// Auto-extracted from Voluntarios.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK, GUIA_TALLAS } from "@/constants/camisetasConstants";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/lib/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";

// ─── FICHA PUESTO ─────────────────────────────────────────────────────────────
function FichaPuesto({ puesto: p, voluntarios, locs=[], matPorLoc={}, rutas=[], onClose, onEditar, onEliminar, onFichaVol }) {
  const { closing: fpuClosing, handleClose: fpuHandleClose } = useModalClose(onClose);
  const asignados = voluntarios.filter(v => v.puestoId === p.id && v.estado !== "cancelado");
  const confirmados = asignados.filter(v => v.estado === "confirmado").length;
  const cobertura = p.necesarios > 0 ? Math.round(asignados.length / p.necesarios * 100) : 0;
  const color = cobertura >= 100 ? "var(--green)" : cobertura >= 50 ? "var(--amber)" : "var(--red)";

  // Material asignado en Logística para la localización vinculada
  const loc = locs.find(l => l.id === p.localizacionId);
  const materialEnLoc = loc ? (matPorLoc[loc.nombre] || []) : [];

  // Rutas que pasan por esta localización (buscar nombre del puesto o de la loc en las paradas)
  const rutasPorAqui = rutas.filter(r =>
    (r.paradas || []).some(pa =>
      (loc && pa.puesto && pa.puesto.toLowerCase().includes(loc.nombre.toLowerCase())) ||
      pa.puesto?.toLowerCase().includes(p.nombre.toLowerCase())
    )
  );

  return (
    <div className={`modal-backdrop${fpuClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target===e.currentTarget && fpuHandleClose()}>
      <div className={`modal modal-ficha${fpuClosing ? " modal-closing" : ""}`} style={{ maxWidth: 460 }}>
        <div style={{ borderTop: "3px solid var(--violet)", borderRadius: "16px 16px 0 0" }}>
          <div className="modal-header">
            <div>
              <div style={{ fontWeight:800, fontSize:"var(--fs-md)" }}>{p.nombre}</div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:"0.1rem" }}>
                {p.tipo} · {p.horaInicio} – {p.horaFin}
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding:"0.2rem 0.5rem", fontSize:"var(--fs-md)" }} onClick={fpuHandleClose} aria-label="Cerrar">✕</button>
          </div>
        </div>
        <div className="modal-body">
          {/* Barra cobertura */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.35rem" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>Cobertura</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", fontWeight:700, color }}>
                {asignados.length}/{p.necesarios} ({cobertura}%)
              </span>
            </div>
            <div style={{ height:6, background:"var(--surface3)", borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.min(cobertura,100)}%`, background:color, borderRadius:3, transition:"width .4s" }}/>
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:"0.25rem" }}>
              {confirmados} confirmados · {asignados.length - confirmados} pendientes
            </div>
          </div>
          {/* Datos */}
          {[
            ["📍 Tipo",       p.tipo],
            ["🕐 Horario",    `${p.horaInicio} – ${p.horaFin}`],
            ["👥 Necesarios", `${p.necesarios} voluntarios`],
          ].map(([label, val]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between",
              padding:"0.4rem 0", borderBottom:"1px solid rgba(30,45,80,0.3)" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>{label}</span>
              <span style={{ fontSize:"var(--fs-base)", fontWeight:600 }}>{val}</span>
            </div>
          ))}
          {p.tiempoLimite && (
            <div style={{ display:"flex", justifyContent:"space-between", padding:"0.5rem 0.75rem",
              margin:"0.3rem 0", borderRadius:8,
              background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.25)" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--amber)", fontWeight:700 }}>
                ⏱ Tiempo límite paso corredor
              </span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-md)", fontWeight:800, color:"var(--amber)" }}>
                {p.tiempoLimite}
              </span>
            </div>
          )}
          {/* Voluntarios asignados */}
          {asignados.length > 0 && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                marginBottom:"0.4rem", textTransform:"uppercase" }}>
                Voluntarios asignados ({asignados.length})
              </div>
              {asignados.map(v => (
                <div key={v.id}
                  onClick={() => onFichaVol && onFichaVol(v)}
                  style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"0.45rem 0.5rem", fontSize:"var(--fs-base)",
                    cursor: onFichaVol ? "pointer" : "default",
                    borderRadius:6, marginBottom:"0.15rem",
                    transition:"background .1s",
                  }}
                  onMouseEnter={e => { if(onFichaVol) e.currentTarget.style.background="var(--surface3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="transparent"; }}>
                  <div style={{ display:"flex", alignItems:"center", gap:".5rem" }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
                      background:"var(--surface3)", border:"1px solid var(--border)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                      color:"var(--cyan)" }}>
                      {((v.nombre||"V").trim().split(" ").map(n=>n[0]).slice(0,2).join("")).toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-600">{v.nombre}</div>
                      {v.telefono && (
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                          color:"var(--text-muted)" }}>{v.telefono}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:".4rem" }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color: v.estado==="confirmado"?"var(--green)":v.estado==="ausente"?"var(--orange)":"var(--amber)" }}>
                      {v.estado}
                    </span>
                    {v.enPuesto && (
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                        color:"var(--green)", background:"var(--green-dim)",
                        border:"1px solid var(--green-border)", borderRadius:4,
                        padding:"0 .3rem" }}>📍 {v.horaLlegada||"En puesto"}</span>
                    )}
                    {onFichaVol && <span style={{ color:"var(--text-dim)", fontSize:"var(--fs-xs)" }}>→</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {p.notas && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--border)" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                marginBottom:"0.25rem", textTransform:"uppercase" }}>Notas</div>
              <div style={{ fontSize:"var(--fs-base)", lineHeight:1.5 }}>{p.notas}</div>
            </div>
          )}

          {/* Material asignado en Logística */}
          {loc && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--cyan)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                marginBottom:"0.35rem" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--cyan)", textTransform:"uppercase", fontWeight:700 }}>
                  📦 Material en {loc.nombre}
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",
                    {detail:{block:"logistica",subtab:"material"}}))}
                  style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", padding:".1rem .35rem",
                    borderRadius:3, border:"1px solid rgba(34,211,238,.3)",
                    background:"rgba(34,211,238,.1)", color:"var(--cyan)", cursor:"pointer" }}>
                  Ver en Logística →
                </button>
              </div>
              {materialEnLoc.length === 0 ? (
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--text-dim)" }}>Sin material asignado aún</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"0.2rem" }}>
                  {materialEnLoc.map((item, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between",
                      fontSize:"var(--fs-sm)", padding:"0.2rem 0",
                      borderBottom: i < materialEnLoc.length-1 ? "1px solid var(--border)" : "none" }}>
                      <span className="fw-600">{item.nombre}</span>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                        color:"var(--cyan)" }}>{item.cantidad} {item.unidad}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rutas que pasan por este puesto */}
          {rutasPorAqui.length > 0 && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--amber)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                marginBottom:"0.35rem" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--amber)", textTransform:"uppercase", fontWeight:700 }}>
                  🗺️ Rutas que pasan por aquí
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",
                    {detail:{block:"logistica",subtab:"vehiculos"}}))}
                  style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", padding:".1rem .35rem",
                    borderRadius:3, border:"1px solid rgba(251,191,36,.3)",
                    background:"rgba(251,191,36,.1)", color:"var(--amber)", cursor:"pointer" }}>
                  Ver vehículos →
                </button>
              </div>
              {rutasPorAqui.map(r => {
                const parada = (r.paradas||[]).find(pa =>
                  (loc && pa.puesto?.toLowerCase().includes(loc.nombre.toLowerCase())) ||
                  pa.puesto?.toLowerCase().includes(p.nombre.toLowerCase())
                );
                return (
                  <div key={r.id} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"0.2rem 0",
                    borderBottom:"1px solid var(--border)", fontSize:"var(--fs-sm)" }}>
                    <span className="fw-600">{r.nombre}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"var(--amber)" }}>
                      {parada?.hora || r.horaInicio}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent:"space-between" }}>
          <button className="btn btn-red" onClick={onEliminar}>🗑 Eliminar</button>
          <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
            {asignados.length > 0 && (
              <button className="btn btn-ghost btn-sm"
                title="Exportar lista del puesto a CSV"
                onClick={() => {
                  const header = ["Nombre","Teléfono","Estado","Talla","Vehículo","En puesto","Hora llegada"];
                  const rows = asignados.map(v => [
                    v.nombre || "",
                    v.telefono || "",
                    v.estado || "",
                    v.talla || "",
                    v.coche ? "Sí" : "No",
                    v.enPuesto ? "Sí" : "No",
                    v.horaLlegada || "",
                  ]);
                  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
                  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `voluntarios-${p.nombre.replace(/\s+/g,"-").toLowerCase()}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("CSV exportado ✓");
                }}>
                📊 Exportar CSV
              </button>
            )}
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            <button className="btn btn-cyan" onClick={onEditar}>✏️ Editar</button>
          </div>
        </div>
      </div>
    </div>
  );
}


// Exports
export { FichaPuesto };
