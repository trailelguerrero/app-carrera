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

// ─── MAPA LEAFLET ─────────────────────────────────────────────────────────────
// Leaflet manipula el DOM directamente, por eso se integra con useRef + useEffect,
// NO con imports directos en el render. El CSS se carga desde CDN en index.html.

function MapaLocalizaciones({ locs, matPorLoc = {} }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null); // instancia L.map
  const markersRef   = useRef([]);   // array de L.marker activos

  // Inicializar el mapa UNA sola vez
  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof window.L === "undefined") return; // Leaflet no cargado aún (CDN lento)

    const L = window.L;

    // Fix para el icono por defecto roto en Webpack/Vite
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({ iconRetinaUrl: "", iconUrl: "", shadowUrl: "" });

    const map = L.map(containerRef.current, {
      center: [40.175, -5.190],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
      tap: true, // touch en iOS Safari
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current   = null;
      markersRef.current = [];
    };
  }, []); // solo al montar

  // Actualizar marcadores cuando cambian las localizaciones
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof window.L === "undefined") return;

    const L = window.L;

    // Limpiar marcadores anteriores
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Solo las localizaciones con coordenadas válidas
    const locsConCoords = locs.filter(l => l.lat != null && l.lng != null);
    if (!locsConCoords.length) return;

    const bounds = [];

    locsConCoords.forEach(loc => {
      const emoji = LOC_ICONS[loc.tipo] || "📌";
      const color = LOC_COLORS[loc.tipo] || "var(--text-muted)";

      // DivIcon con el emoji del tipo — tamaño táctil mínimo 44x44px para móvil
      const icon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${color};
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 6px rgba(0,0,0,.4);
          border:2px solid rgba(255,255,255,.7);
        "><span style="transform:rotate(45deg);font-size:16px;line-height:1">${emoji}</span></div>`,
        className: "",
        iconSize:   [36, 36],
        iconAnchor: [18, 36],
        popupAnchor:[0, -36],
      });

      // Construir contenido del popup
      const matItems = (matPorLoc[loc.id] || []);
      const matHtml = matItems.length
        ? `<div style="margin-top:6px;font-size:11px;color:#555;max-height:80px;overflow-y:auto">
            <strong>📦 Material:</strong><br>
            ${matItems.map(m => `${m.nombre} × ${m.cantidad} ${m.unidad}`).join("<br>")}
           </div>`
        : `<div style="margin-top:6px;font-size:11px;color:#888">Sin material asignado</div>`;

      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:13px;margin-bottom:2px">${emoji} ${loc.nombre}</div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:${color};font-weight:600">${loc.tipo}</div>
          ${loc.descripcion ? `<div style="font-size:11px;color:#666;margin-top:4px;font-style:italic">${loc.descripcion}</div>` : ""}
          ${matHtml}
          <a href="https://maps.google.com/?q=${loc.lat},${loc.lng}"
             target="_blank" rel="noopener noreferrer"
             style="
               display:inline-block;margin-top:8px;padding:4px 10px;
               background:#4285F4;color:#fff;border-radius:4px;
               font-size:11px;text-decoration:none;font-weight:600;
             ">📍 Abrir en Google Maps</a>
        </div>`;

      const marker = L.marker([loc.lat, loc.lng], { icon })
        .addTo(map)
        .bindPopup(popupHtml, { maxWidth: 260 });

      markersRef.current.push(marker);
      bounds.push([loc.lat, loc.lng]);
    });

    // fitBounds — ajustar la vista a todos los marcadores
    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [locs, matPorLoc]);

  const locsConCoords    = locs.filter(l => l.lat != null && l.lng != null);
  const locsSinCoords    = locs.filter(l => l.lat == null || l.lng == null);

  return (
    <div className="card" style={{ marginBottom: ".85rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".5rem", flexWrap:"wrap", gap:".4rem" }}>
        <div className="ct">🗺️ Mapa del recorrido</div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
          {locsConCoords.length} ubicaciones
          {locsSinCoords.length > 0 && <span style={{ color:"var(--amber)", marginLeft:".4rem" }}>· {locsSinCoords.length} sin coordenadas</span>}
        </div>
      </div>

      {/* Contenedor del mapa — Leaflet monta aquí directamente */}
      <div
        ref={containerRef}
        style={{
          height: "380px",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border)",
          overflow: "hidden",
          // Aislar el z-index de los controles de Leaflet del resto de la app
          isolation: "isolate",
        }}
      />

      {locsSinCoords.length > 0 && (
        <div style={{ marginTop:".5rem", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--amber)" }}>
          ⚠️ {locsSinCoords.map(l=>l.nombre).join(", ")} — edítalas para añadir coordenadas GPS
        </div>
      )}
    </div>
  );
}

// ─── LOCALIZACIONES MAESTRAS ─────────────────────────────────────────────────
function TabLocalizaciones({ locs, setLocs, volsPorLoc = {}, matPorLoc = {} }) {
    const [modal, setModal] = useState(null); // null | {data: loc|null}
  const [del, setDel] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [form, setForm] = useState({ nombre: "", tipo: "otro", descripcion: "", lat: "", lng: "" });

  const locsF = filtroTipo === "todos" ? locs : locs.filter(l0 => l0.tipo === filtroTipo);

  const openNueva = () => { setForm({ nombre: "", tipo: "otro", descripcion: "", lat: "", lng: "" }); setModal({ data: null }); };
  const openEditar = (l) => {
    setForm({ nombre: l.nombre, tipo: l.tipo, descripcion: l.descripcion || "", lat: l.lat ?? "", lng: l.lng ?? "" });
    setModal({ data: l });
  };
  const save = () => {
    if (!form.nombre.trim()) return;
    const latNum = form.lat !== "" ? parseFloat(form.lat) : undefined;
    const lngNum = form.lng !== "" ? parseFloat(form.lng) : undefined;
    const coordenadas = (!isNaN(latNum) && !isNaN(lngNum)) ? { lat: latNum, lng: lngNum } : {};
    if (modal.data) {
      setLocs(function(locsPrev){return locsPrev.map(function(locItm){return locItm.id===modal.data.id?{...locItm,...form,...coordenadas}:locItm;});});
      toast.success("Localización actualizada");
    } else {
      setLocs(function(locsPrev){return [...locsPrev,{id:genIdNum(locsPrev),...form,...coordenadas}];});
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

      {/* ── MAPA INTERACTIVO ── solo cuando hay localizaciones */}
      {locs.length > 0 && <MapaLocalizaciones locs={locs} matPorLoc={matPorLoc} />}

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
              {/* Coordenadas GPS si existen */}
              {l.lat != null && l.lng != null && (
                <div style={{ marginTop:".2rem", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
                  📌 {l.lat.toFixed(4)}, {l.lng.toFixed(4)}
                </div>
              )}
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
              {/* Coordenadas GPS */}
              <div style={{ display: "flex", gap: ".5rem" }}>
                <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: ".2rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>Latitud</span>
                  <input className="inp" type="number" step="0.0001" placeholder="ej. 40.1562"
                    value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} />
                </label>
                <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: ".2rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>Longitud</span>
                  <input className="inp" type="number" step="0.0001" placeholder="ej. -5.2041"
                    value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} />
                </label>
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
                💡 Consejo: abre Google Maps, haz click derecho en el punto y copia las coordenadas
              </div>
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
