// Auto-extracted from Logistica.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { FASES_CHECKLIST, ESTADO_ENTREGA, ESTADO_TAREA, ESTADO_COLORES, PUESTOS_REF, TIPOS_LOC, LOC_ICONS, LOC_COLORS } from "./logisticaConstants.js";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";

// ─── LOCALIZACIONES MAESTRAS ─────────────────────────────────────────────────
function TabLocalizaciones({ locs, setLocs, volsPorLoc = {} }) {
    const [modal, setModal] = useState(null); // null | {data: loc|null}
  const [del, setDel] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [form, setForm] = useState({ nombre: "", tipo: "otro", descripcion: "" });

  const locsF = filtroTipo === "todos" ? locs : locs.filter(l0 => l0.tipo === filtroTipo);

  const openNueva = () => { setForm({ nombre: "", tipo: "otro", descripcion: "" }); setModal({ data: null }); };
  const openEditar = (l) => { setForm({ nombre: l.nombre, tipo: l.tipo, descripcion: l.descripcion || "" }); setModal({ data: l }); };
  const save = () => {
    if (!form.nombre.trim()) return;
    if (modal.data) {
      setLocs(function(locsPrev){return locsPrev.map(function(locItm){return locItm.id===modal.data.id?{...locItm,...form}:locItm;});});
      toast.success("Localización actualizada");
    } else {
      setLocs(function(locsPrev){return [...locsPrev,{id:genIdNum(locsPrev),...form}];});
      toast.success("Localización creada");
    }
    setModal(null);
  };

  return (
    <>
      <div className="ph">
        <div><div className="pt">📍 Localizaciones Maestras</div><div className="pd">{locs.length} ubicaciones · Compartidas con Voluntarios · <span style={{cursor:"pointer",color:"var(--text-dim)"}} onClick={()=>window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"configuracion"}}))} title="Abrir Configuración">⚙️ Configuración</span></div></div>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          <select style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--r-sm)", padding: ".3rem .5rem" }}
            value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="todos">Todos los tipos</option>
            {TIPOS_LOC.map(t0 => <option key={t0} value={t0}>{LOC_ICONS[t0]} {t0}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openNueva}>+ Nueva</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: ".65rem" }}>
        {locsF.map(l => {
          const color = LOC_COLORS[l.tipo] || "var(--text-muted)";
          const icon  = LOC_ICONS[l.tipo]  || "📌";
          return (
            <div key={l.id} className="card" style={{ borderLeft: `3px solid ${color}`, cursor: "pointer" }} onClick={() => openEditar(l)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: ".4rem" }}>
                <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "var(--fs-lg)" }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>{l.nombre}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color, textTransform: "uppercase", letterSpacing: ".06em" }}>{l.tipo}</div>
                  </div>
                </div>
                <button className="btn btn-sm btn-red" onClick={e => { e.stopPropagation(); setDel(l.id); }}
                  style={{ flexShrink: 0, padding: ".15rem .4rem", fontSize: "var(--fs-sm)" }}>✕</button>
              </div>
              {l.descripcion && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", fontStyle: "italic", marginTop: ".2rem" }}>{l.descripcion}</div>}
              {(() => {
                const asig = volsPorLoc[l.id] || [];
                if (!asig.length) return (
                  <div style={{ marginTop: ".45rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                    color: "var(--text-dim)", borderTop: "1px solid var(--border)", paddingTop: ".4rem" }}>
                    👥 Sin voluntarios asignados
                  </div>
                );
                const conf = asig.filter(a0 => a0.vol.estado === "confirmado");
                const pend = asig.filter(a0 => a0.vol.estado === "pendiente");
                return (
                  <div style={{ marginTop: ".45rem", borderTop: "1px solid var(--border)", paddingTop: ".4rem" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)",
                      marginBottom: ".3rem", display: "flex", alignItems: "center", gap: ".4rem", flexWrap:"wrap" }}>
                      👥 <span style={{ fontWeight: 700 }}>{asig.length} voluntario{asig.length!==1?"s":""}</span>
                      {conf.length > 0 && <span style={{ color: "var(--green)", fontWeight: 700 }}>· {conf.length} ✓</span>}
                      {pend.length > 0 && <span style={{ color: "var(--amber)" }}>· {pend.length} pend.</span>}
                      <button
                        onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"voluntarios"}})); }}
                        style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", padding:".06rem .3rem",
                          borderRadius:3, border:"1px solid rgba(34,211,238,.3)",
                          background:"rgba(34,211,238,.1)", color:"var(--cyan)", cursor:"pointer",
                          marginLeft:"auto", flexShrink:0 }}>
                        Ver →
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: ".18rem" }}>
                      {asig.slice(0,4).map((a, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: ".4rem",
                          fontSize: "var(--fs-xs)", fontFamily: "var(--font-mono)" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                            background: a.vol.estado === "confirmado" ? "var(--green)" :
                              a.vol.estado === "pendiente" ? "var(--amber)" : "var(--text-dim)" }} />
                          <span style={{ color: "var(--text)", fontWeight: 600 }}>{a.vol.nombre}</span>
                          <span style={{ color: "var(--text-dim)", fontSize: "var(--fs-xs)" }}>— {a.puesto.nombre}</span>
                        </div>
                      ))}
                      {asig.length > 4 && (
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-dim)", fontFamily: "var(--font-mono)", paddingLeft: ".6rem" }}>
                          +{asig.length-4} más…
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
        {locsF.length === 0 && locs.length > 0 && (
          <div className="card" style={{ textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", padding: "2rem" }}>
            Sin localizaciones con ese filtro
          </div>
        )}
        {locs.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "var(--fs-lg)", marginBottom: ".5rem" }}>📍</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 700, marginBottom: ".4rem" }}>
              Sin localizaciones maestras
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-dim)", lineHeight: 1.6, marginBottom: ".75rem" }}>
              Las localizaciones definen dónde están los puestos de voluntarios
              y el material asignado. Puedes crearlas aquí o desde Configuración.
            </div>
            <button className="btn btn-ghost btn-sm"
              onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "configuracion" } }))}>
              ⚙️ Ir a Configuración
            </button>
          </div>
        )}
      </div>

      {/* Resumen por tipo */}
      <div className="card" style={{ marginTop: ".85rem" }}>
        <div className="ct" style={{ marginBottom: ".5rem" }}>📊 Resumen por tipo</div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          {TIPOS_LOC.map(t => {
            const n = locs.filter(l0 => l0.tipo === t).length;
            if (!n) return null;
            const color = LOC_COLORS[t] || "var(--text-muted)";
            return (
              <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", padding: ".2rem .6rem", borderRadius: 20,
                background: `${color}15`, color, border: `1px solid ${color}33`, cursor: "pointer" }}
                onClick={() => setFiltroTipo(filtroTipo === t ? "todos" : t)}>
                {LOC_ICONS[t]} {t} ({n})
              </span>
            );
          })}
        </div>
      </div>

      {/* Modal edición */}
      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div style={{ fontWeight: 700 }}>{modal.data ? "✏️ Editar localización" : "📍 Nueva localización"}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>Nombre *</span>
                <input className="inp" placeholder="ej. Avituallamiento KM 4" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>Tipo</span>
                <select className="inp" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS_LOC.map(t0 => <option key={t0} value={t0}>{LOC_ICONS[t0]} {t0}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>Descripción</span>
                <textarea className="inp" rows={2} placeholder="Descripción opcional" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>{modal.data ? "Guardar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {del && (
        <div className="modal-backdrop" style={{ zIndex: 200 }} onClick={e => e.target === e.currentTarget && setDel(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 320, textAlign: "center" }}>
            <div className="modal-body" style={{ paddingTop: "1.5rem" }}>
              <div style={{ fontSize: "var(--fs-xl)", marginBottom: ".5rem" }}>⚠️</div>
              <div style={{ fontWeight: 700 }}>¿Eliminar localización?</div>
              <div className="mono xs muted">Los puestos de voluntarios que la referenciaban quedarán sin localización maestra.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDel(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={() => { setLocs(function(locsPrev){return locsPrev.filter(function(locItm){return locItm.id!==del;});}); setDel(null); }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// Exports
export { TabLocalizaciones };
