// Auto-extracted from Logistica.jsx — Sprint 2 refactor
// LOC-SYNC-01: sincronización bidireccional loc ↔ puesto
// TRACK-01: mapa con recorridos GPX superpuestos
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
import { useLeafletReady } from "@/hooks/useLeafletReady";
import { useMapFullscreen } from "@/hooks/useMapFullscreen";
import { useMapTiles } from "@/hooks/useMapTiles";
import { MapControles } from "@/components/common/MapControles";

// ─── MAPA LEAFLET ─────────────────────────────────────────────────────────────
// LOC-SYNC-01 + TRACK-01: mapa con tracks GPX + marcadores de localizaciones.
// Recibe `recorridos` (array de tracks simplificados) para dibujar polylines.

function MapaLocalizaciones({ locs, matPorLoc = {}, recorridos = [] }) {
  const containerRef = useRef(null);
  const wrapperRef   = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);
  const linesRef     = useRef([]);

  const leafletReady = useLeafletReady();
  const { isFullscreen, toggleFullscreen } = useMapFullscreen(wrapperRef, mapRef);
  const { tileMode, toggleTile, initTileLayer, TILE_LAYERS } = useMapTiles(mapRef);

  // Estado de visibilidad de cada recorrido en el mapa (por id)
  const [visibilidad, setVisibilidad] = useState(() =>
    Object.fromEntries((recorridos || []).map(r => [r.id, r.activo !== false]))
  );

  // Sincronizar estado inicial si cambian los recorridos disponibles
  useEffect(() => {
    setVisibilidad(prev => {
      const next = { ...prev };
      (recorridos || []).forEach(r => {
        if (!(r.id in next)) next[r.id] = r.activo !== false;
      });
      return next;
    });
  }, [recorridos]);

  // Montar mapa — se ejecuta cuando Leaflet ya está listo
  useEffect(() => {
    if (!leafletReady) return;
    if (!containerRef.current) return;
    if (mapRef.current) return; // ya montado
    const L = window.L;
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({ iconRetinaUrl: "", iconUrl: "", shadowUrl: "" });
    const map = L.map(containerRef.current, {
      center: [40.175, -5.215],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
      tap: true,
    });
    const cfg = TILE_LAYERS["map"];
    const tileLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);
    initTileLayer(tileLayer);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      linesRef.current = [];
    };
  }, [leafletReady]);

  // Actualizar polylines cuando cambian recorridos o visibilidad
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !leafletReady) return;
    const L = window.L;
    linesRef.current.forEach(l => l.remove());
    linesRef.current = [];
    (recorridos || []).forEach(r => {
      if (!visibilidad[r.id]) return;
      if (!r.puntos?.length) return;
      const latLngs = r.puntos.map(p => [p[0], p[1]]);
      const line = L.polyline(latLngs, {
        color: r.color || "#22d3ee",
        weight: 3,
        opacity: 0.8,
        smoothFactor: 1,
      }).addTo(map);
      line.bindTooltip(r.nombre + (r.distanciaKm ? ` (${r.distanciaKm} km)` : ""), { permanent: false, sticky: true });
      linesRef.current.push(line);
    });
  }, [recorridos, visibilidad, leafletReady]);

  // Actualizar marcadores cuando cambian las localizaciones
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !leafletReady) return;
    const L = window.L;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    const locsConCoords = locs.filter(l => l.lat != null && l.lng != null);
    if (!locsConCoords.length) return;
    const bounds = [];
    locsConCoords.forEach(loc => {
      const emoji = LOC_ICONS[loc.tipo] || "📌";
      const color = LOC_COLORS[loc.tipo] || "var(--text-muted)";
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
      const matItems = (matPorLoc[loc.id] || []);
      const matHtml = matItems.length
        ? `<div style="margin-top:6px;font-size:11px;color:#555;max-height:80px;overflow-y:auto"><strong>📦 Material:</strong><br>${matItems.map(m => `${m.nombre} × ${m.cantidad} ${m.unidad}`).join("<br>")}</div>`
        : `<div style="margin-top:6px;font-size:11px;color:#888">Sin material asignado</div>`;
      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:13px;margin-bottom:2px">${emoji} ${loc.nombre}</div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:${color};font-weight:600">${loc.tipo}</div>
          ${loc.descripcion ? `<div style="font-size:11px;color:#666;margin-top:4px;font-style:italic">${loc.descripcion}</div>` : ""}
          ${matHtml}
          <a href="https://maps.google.com/?q=${loc.lat},${loc.lng}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;margin-top:8px;padding:4px 10px;background:#4285F4;color:#fff;border-radius:4px;font-size:11px;text-decoration:none;font-weight:600;">📍 Abrir en Google Maps</a>
        </div>`;
      const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map).bindPopup(popupHtml, { maxWidth: 260 });
      markersRef.current.push(marker);
      bounds.push([loc.lat, loc.lng]);
    });
    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [locs, matPorLoc, leafletReady]);

  const locsConCoords = locs.filter(l => l.lat != null && l.lng != null);
  const locsSinCoords = locs.filter(l => l.lat == null || l.lng == null);
  const tracksActivos = (recorridos || []).filter(r => r.puntos?.length > 1);

  return (
    <div
      ref={wrapperRef}
      className="card"
      style={{
        marginBottom: ".85rem",
        // Fullscreen CSS fallback (iOS Safari)
        ...(isFullscreen && !document.fullscreenElement ? {
          position: "fixed", inset: 0, zIndex: 9999,
          borderRadius: 0, margin: 0,
          display: "flex", flexDirection: "column",
        } : {}),
      }}
    >
      {/* Cabecera del mapa */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:".5rem", flexWrap:"wrap", gap:".5rem" }}>
        <div className="ct">🗺️ Mapa del recorrido</div>
        <div style={{ display:"flex", alignItems:"center", gap:".5rem", flexWrap:"wrap" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
            {locsConCoords.length} ubicaciones
            {locsSinCoords.length > 0 && <span style={{ color:"var(--amber)", marginLeft:".4rem" }}>· {locsSinCoords.length} sin coordenadas</span>}
          </div>
        </div>
      </div>

      {/* Toggles de visibilidad de recorridos */}
      {tracksActivos.length > 0 && (
        <div style={{ display:"flex", gap:".4rem", flexWrap:"wrap", marginBottom:".55rem" }}>
          {tracksActivos.map(r => {
            const visible = visibilidad[r.id] !== false;
            return (
              <button
                key={r.id}
                onClick={() => setVisibilidad(prev => ({ ...prev, [r.id]: !visible }))}
                style={{
                  display:"inline-flex", alignItems:"center", gap:".35rem",
                  padding:".2rem .55rem", borderRadius:20, cursor:"pointer",
                  fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                  background: visible ? `${r.color}18` : "rgba(100,100,120,.08)",
                  color:      visible ? r.color : "var(--text-dim)",
                  border:     `1px solid ${visible ? r.color + "50" : "var(--border)"}`,
                  transition: "all .15s",
                }}
              >
                <span style={{
                  width:8, height:8, borderRadius:"50%", flexShrink:0,
                  background: visible ? r.color : "var(--border)",
                  boxShadow: visible ? `0 0 5px ${r.color}` : "none",
                }} />
                {r.nombre}
                {r.distanciaKm && <span style={{ opacity:.7, fontWeight:400 }}>{r.distanciaKm} km</span>}
              </button>
            );
          })}
          {tracksActivos.length === 0 && (
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
              Sin tracks — sube los archivos .gpx en Configuración
            </span>
          )}
        </div>
      )}

      {/* Contenedor del mapa — position:relative para que MapControles se posicione sobre él */}
      <div style={{ position: "relative", flex: isFullscreen ? "1" : undefined }}>
        <MapControles
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          tileMode={tileMode}
          onToggleTile={toggleTile}
        />
        <div
          ref={containerRef}
          style={{
            height: isFullscreen ? "calc(100vh - 110px)" : "420px",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--border)",
            overflow: "hidden",
            isolation: "isolate",
            background: leafletReady ? undefined : "var(--surface2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "height .2s ease",
          }}
        >
          {!leafletReady && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-dim)" }}>
              ⏳ Cargando mapa…
            </span>
          )}
        </div>
      </div>

      {locsSinCoords.length > 0 && (
        <div style={{ marginTop:".5rem", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--amber)" }}>
          ⚠️ {locsSinCoords.map(l=>l.nombre).join(", ")} — edítalas para añadir coordenadas GPS
        </div>
      )}

      <div style={{ marginTop:".5rem", display:"flex", gap:"1rem", flexWrap:"wrap" }}>
        {tracksActivos.length === 0 && (
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
            🗺️ Sin recorridos — ve a <strong style={{color:"var(--cyan)"}}>⚙️ Configuración → Recorridos del evento</strong> para subir los .gpx
          </div>
        )}
        {locsConCoords.length === 0 && locs.length === 0 && (
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
            📍 Sin ubicaciones — pulsa <strong style={{color:"var(--cyan)"}}>+ Nueva</strong> para añadir localizaciones maestras con coordenadas GPS
          </div>
        )}
      </div>
    </div>
  );
}

// ─── UTILIDAD DE COBERTURA ───────────────────────────────────────────────────
export function calcularCobertura(tieneMaterial, tieneVoluntario) {
  if (!tieneMaterial && !tieneVoluntario) return null;
  if (tieneMaterial && tieneVoluntario)  return "completa";
  if (tieneMaterial && !tieneVoluntario) return "sin_voluntario";
  return "sin_material";
}

// ─── LOCALIZACIONES MAESTRAS ─────────────────────────────────────────────────
// LOC-SYNC-01: recibe `puestos` + `setPuestos` para propagar coords loc→puestos.

function TabLocalizaciones({ locs, setLocs, volsPorLoc = {}, matPorLoc = {}, recorridos = [], puestos = [], setPuestos = null }) {
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [form, setForm] = useState({ nombre: "", tipo: "otro", descripcion: "", lat: "", lng: "" });
  // Cuántos puestos serían actualizados al guardar la loc (se muestra en modal)
  const [puestosAfectados, setPuestosAfectados] = useState([]);

  const locsF = filtroTipo === "todos" ? locs : locs.filter(l0 => l0.tipo === filtroTipo);

  // Calcular puestos vinculados a la loc en edición (para mostrar aviso)
  useEffect(() => {
    if (!modal?.data) { setPuestosAfectados([]); return; }
    const vinculados = puestos.filter(p => p.localizacionId === modal.data.id);
    setPuestosAfectados(vinculados);
  }, [modal, puestos]);

  const resumenCobertura = useMemo(() => {
    const evaluables = locs.filter(l => {
      const tieneMat = (matPorLoc[l.id] || []).length > 0;
      const tieneVol = (volsPorLoc[l.id] || []).length > 0;
      return tieneMat || tieneVol;
    });
    const completos = evaluables.filter(l => {
      const tieneMat = (matPorLoc[l.id] || []).length > 0;
      const tieneVol = (volsPorLoc[l.id] || []).length > 0;
      return tieneMat && tieneVol;
    });
    return { completos: completos.length, total: evaluables.length };
  }, [locs, matPorLoc, volsPorLoc]);

  const openNueva = () => {
    setForm({ nombre: "", tipo: "otro", descripcion: "", lat: "", lng: "" });
    setModal({ data: null });
  };
  const openEditar = (l) => {
    setForm({ nombre: l.nombre, tipo: l.tipo, descripcion: l.descripcion || "", lat: l.lat ?? "", lng: l.lng ?? "" });
    setModal({ data: l });
  };

  const save = () => {
    if (!form.nombre.trim()) return;
    const latNum = form.lat !== "" ? parseFloat(form.lat) : undefined;
    const lngNum = form.lng !== "" ? parseFloat(form.lng) : undefined;
    const tieneCoordsValidas = !isNaN(latNum) && !isNaN(lngNum);
    const coordenadas = tieneCoordsValidas ? { lat: latNum, lng: lngNum } : {};

    if (modal.data) {
      // ── LOC-SYNC-01: propagar nuevas coords a puestos vinculados ──────────
      if (tieneCoordsValidas && setPuestos) {
        const locId = modal.data.id;
        setPuestos(prev =>
          prev.map(p =>
            p.localizacionId === locId
              ? { ...p, lat: latNum, lng: lngNum }
              : p
          )
        );
      }
      setLocs(prev => prev.map(l => l.id === modal.data.id ? { ...l, ...form, ...coordenadas } : l));
      toast.success("Localización actualizada" + (tieneCoordsValidas && puestosAfectados.length > 0 ? ` · ${puestosAfectados.length} puesto${puestosAfectados.length !== 1 ? "s" : ""} sincronizado${puestosAfectados.length !== 1 ? "s" : ""}` : ""));
    } else {
      setLocs(prev => [...prev, { id: genIdNum(prev), ...form, ...coordenadas }]);
      toast.success("Localización creada");
    }
    setModal(null);
  };

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📍 Localizaciones Maestras</div>
          <div className="pd">
            {locs.length} ubicaciones · Compartidas con Voluntarios ·{" "}
            <span style={{cursor:"pointer",color:"var(--text-dim)"}} onClick={()=>window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"configuracion"}}))} title="Abrir Configuración">⚙️ Configuración</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
          {resumenCobertura.total > 0 && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
              padding: ".2rem .55rem", borderRadius: 20,
              background: resumenCobertura.completos === resumenCobertura.total ? "rgba(34,197,94,.12)" : "rgba(251,191,36,.12)",
              color: resumenCobertura.completos === resumenCobertura.total ? "var(--green)" : "var(--amber)",
              border: `1px solid ${resumenCobertura.completos === resumenCobertura.total ? "rgba(34,197,94,.3)" : "rgba(251,191,36,.3)"}`,
              whiteSpace: "nowrap",
            }}>
              {resumenCobertura.completos === resumenCobertura.total ? "✅" : "⚠️"} {resumenCobertura.completos}/{resumenCobertura.total} cobertura completa
            </span>
          )}
          <select
            style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--r-sm)", padding: ".3rem .5rem" }}
            value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          >
            <option value="todos">Todos los tipos</option>
            {TIPOS_LOC.map(t0 => <option key={t0} value={t0}>{LOC_ICONS[t0]} {t0}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openNueva}>+ Nueva</button>
        </div>
      </div>

      {/* ── MAPA INTERACTIVO con recorridos GPX ── */}
      <MapaLocalizaciones locs={locs} matPorLoc={matPorLoc} recorridos={recorridos} />

      {/* ── CARDS DE LOCALIZACIONES ── */}
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
                <div style={{ display: "flex", gap: ".35rem", alignItems: "center", flexShrink: 0 }}>
                  {(() => {
                    const tieneMat = (matPorLoc[l.id] || []).length > 0;
                    const tieneVol = (volsPorLoc[l.id] || []).length > 0;
                    const cob = calcularCobertura(tieneMat, tieneVol);
                    if (!cob) return null;
                    const cfg = {
                      completa:       { label: "✅ Completa",       bg: "rgba(34,197,94,.12)",  color: "var(--green)", border: "rgba(34,197,94,.3)" },
                      sin_voluntario: { label: "⚠️ Sin voluntario", bg: "rgba(251,191,36,.12)", color: "var(--amber)", border: "rgba(251,191,36,.3)" },
                      sin_material:   { label: "📦 Sin material",   bg: "rgba(251,191,36,.12)", color: "var(--amber)", border: "rgba(251,191,36,.3)" },
                    }[cob];
                    return (
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)",
                        padding: ".1rem .4rem", borderRadius: 20,
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                        whiteSpace: "nowrap",
                      }}>{cfg.label}</span>
                    );
                  })()}
                  <button className="btn btn-sm btn-red" onClick={e => { e.stopPropagation(); setDel(l.id); }}
                    style={{ flexShrink: 0, padding: ".15rem .4rem", fontSize: "var(--fs-sm)" }}>✕</button>
                </div>
              </div>
              {l.descripcion && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", fontStyle: "italic", marginTop: ".2rem" }}>{l.descripcion}</div>}
              {l.lat != null && l.lng != null && (
                <div style={{ marginTop:".2rem", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
                  📌 {l.lat.toFixed(4)}, {l.lng.toFixed(4)}
                </div>
              )}
              {(() => {
                const asig = volsPorLoc[l.id] || [];
                if (!asig.length) return (
                  <div style={{ marginTop: ".45rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", borderTop: "1px solid var(--border)", paddingTop: ".4rem" }}>
                    👥 Sin voluntarios asignados
                  </div>
                );
                const conf = asig.filter(a0 => a0.vol.estado === "confirmado");
                const pend = asig.filter(a0 => a0.vol.estado === "pendiente");
                return (
                  <div style={{ marginTop: ".45rem", borderTop: "1px solid var(--border)", paddingTop: ".4rem" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: ".3rem", display: "flex", alignItems: "center", gap: ".4rem", flexWrap:"wrap" }}>
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
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: "var(--fs-xs)", fontFamily: "var(--font-mono)" }}>
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
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 700, marginBottom: ".4rem" }}>Sin localizaciones maestras</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-dim)", lineHeight: 1.6, marginBottom: ".75rem" }}>
              Las localizaciones definen dónde están los puestos de voluntarios y el material asignado.
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "configuracion" } }))}>
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

      {/* Modal edición/creación */}
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
                💡 Google Maps → click derecho sobre el punto → copiar coordenadas
              </div>
              {/* LOC-SYNC-01: aviso de puestos vinculados */}
              {modal.data && puestosAfectados.length > 0 && (form.lat !== "" || form.lng !== "") && (
                <div style={{
                  padding: ".55rem .75rem", borderRadius: "var(--r-sm)",
                  background: "rgba(34,211,238,.08)", border: "1px solid rgba(34,211,238,.2)",
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--cyan)",
                }}>
                  🔗 Al guardar, las coordenadas se propagarán a {puestosAfectados.length} puesto{puestosAfectados.length !== 1 ? "s" : ""} vinculado{puestosAfectados.length !== 1 ? "s" : ""}:
                  <span style={{ color: "var(--text-muted)", marginLeft: ".3rem" }}>
                    {puestosAfectados.map(p => p.nombre).join(", ")}
                  </span>
                </div>
              )}
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
              <button className="btn btn-red" onClick={() => { setLocs(prev => prev.filter(l => l.id !== del)); setDel(null); }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// Exports
export { TabLocalizaciones };
