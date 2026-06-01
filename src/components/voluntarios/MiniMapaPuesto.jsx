/**
 * MiniMapaPuesto.jsx — Mini-mapa Leaflet para el portal del voluntario.
 *
 * Muestra en una tarjeta compacta:
 *   • Marcador del puesto (con popup de nombre y tipo)
 *   • Polylines de los recorridos GPX que pasan cerca (todos los activos)
 *   • Botón "Cómo llegar" → Google Maps / navegación nativa
 *
 * Diseñado para móvil: altura fija de 240px, controles táctiles habilitados.
 * Se carga solo cuando el puesto tiene coordenadas lat/lng.
 *
 * Performance (react-component-performance skill):
 *   - Estado del mapa aislado en este componente — no re-renderiza el portal padre
 *   - useLeafletReady evita el race condition con la carga del bundle
 *   - Cleanup completo en el return del useEffect de mount
 */

import { useEffect, useRef } from "react";
import { useLeafletReady } from "@/hooks/useLeafletReady";

export function MiniMapaPuesto({ puesto, recorridos = [] }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const leafletReady = useLeafletReady();

  // Montar mapa cuando Leaflet esté disponible
  useEffect(() => {
    if (!leafletReady) return;
    if (!containerRef.current) return;
    if (mapRef.current) return; // ya montado
    if (!puesto?.lat || !puesto?.lng) return;

    const L = window.L;

    // Icono de pin para el puesto
    const pinIcon = L.divIcon({
      html: `<div style="
        width:36px;height:44px;
        display:flex;flex-direction:column;
        align-items:center;
      ">
        <div style="
          width:36px;height:36px;
          background:var(--cyan,#22d3ee);
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,.5);
          border:2px solid rgba(255,255,255,.8);
        ">
          <span style="transform:rotate(45deg);font-size:16px;line-height:1">📍</span>
        </div>
      </div>`,
      className: "",
      iconSize:   [36, 44],
      iconAnchor: [18, 44],
      popupAnchor:[0, -44],
    });

    const map = L.map(containerRef.current, {
      center:           [puesto.lat, puesto.lng],
      zoom:             15,
      zoomControl:      true,
      scrollWheelZoom:  false, // en móvil el scroll wheel hace scroll de página
      tap:              true,
      dragging:         true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    // Marcador del puesto
    L.marker([puesto.lat, puesto.lng], { icon: pinIcon })
      .addTo(map)
      .bindPopup(`<strong>${puesto.nombre}</strong>${puesto.tipo ? `<br><small>${puesto.tipo}</small>` : ""}`, { maxWidth: 180 })
      .openPopup();

    // Polylines de los recorridos activos
    const tracks = Array.isArray(recorridos) ? recorridos : [];
    tracks.filter(r => r.activo !== false && r.puntos?.length > 1).forEach(r => {
      const latLngs = r.puntos.map(p => [p[0], p[1]]);
      L.polyline(latLngs, {
        color:       r.color || "#22d3ee",
        weight:      3,
        opacity:     0.75,
        smoothFactor: 1,
      }).addTo(map).bindTooltip(
        r.nombre + (r.distanciaKm ? ` · ${r.distanciaKm} km` : ""),
        { permanent: false, sticky: true }
      );
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [leafletReady, puesto?.lat, puesto?.lng]); // recorridos no en deps — se pintan una vez al montar

  // Actualizar tracks si cambian los recorridos (ej: admin cambia un color)
  useEffect(() => {
    // Solo actualizamos si el mapa ya está montado
    // En el portal esto es rarísimo, pero lo hacemos correctamente
    const map = mapRef.current;
    if (!map || !leafletReady) return;
    // No hacemos nada — en el portal los tracks son de solo lectura
    // El map se desmonta/remonta al cambiar de puesto vía key prop en PuestoDetalle
  }, [recorridos, leafletReady]);

  if (!puesto?.lat || !puesto?.lng) return null;

  const gmapsUrl = `https://maps.google.com/?q=${puesto.lat},${puesto.lng}`;
  const wazeUrl  = `https://waze.com/ul?ll=${puesto.lat},${puesto.lng}&navigate=yes`;

  return (
    <div style={{ marginTop: ".75rem" }}>
      {/* Mini-mapa */}
      <div
        ref={containerRef}
        style={{
          height:       "240px",
          borderRadius: "10px",
          overflow:     "hidden",
          border:       "1px solid var(--border, rgba(30,50,80,.3))",
          isolation:    "isolate",
          background:   leafletReady ? undefined : "var(--surface2, #1a2540)",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
        }}
      >
        {!leafletReady && (
          <span style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize:   ".72rem",
            color:      "var(--text-dim, #64748b)",
          }}>
            ⏳ Cargando mapa…
          </span>
        )}
      </div>

      {/* Botones de navegación */}
      <div style={{ display: "flex", gap: ".5rem", marginTop: ".5rem" }}>
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem",
            padding: ".6rem .5rem",
            background: "rgba(66,133,244,.12)",
            border: "1px solid rgba(66,133,244,.3)",
            borderRadius: "8px",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: ".75rem",
            fontWeight: 700,
            color: "#4285F4",
            textDecoration: "none",
          }}
        >
          🗺️ Google Maps
        </a>
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem",
            padding: ".6rem .5rem",
            background: "rgba(0,160,214,.12)",
            border: "1px solid rgba(0,160,214,.3)",
            borderRadius: "8px",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: ".75rem",
            fontWeight: 700,
            color: "#00a0d6",
            textDecoration: "none",
          }}
        >
          🚗 Waze
        </a>
      </div>

      {/* Coordenadas */}
      <div style={{
        marginTop: ".35rem",
        fontFamily: "var(--font-mono, monospace)",
        fontSize:   ".65rem",
        color:      "var(--text-dim, #64748b)",
        textAlign:  "center",
      }}>
        {Number(puesto.lat).toFixed(5)}, {Number(puesto.lng).toFixed(5)}
      </div>
    </div>
  );
}
