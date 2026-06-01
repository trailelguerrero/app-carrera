/**
 * useMapTiles.js — gestiona el cambio de capa de tiles del mapa.
 *
 * Capas disponibles:
 *   "map"       → OpenStreetMap estándar (predeterminado)
 *   "satellite" → Esri World Imagery (satélite, sin necesidad de API key)
 *
 * Esri World Imagery es gratuito para uso no comercial y tiene buena
 * cobertura global incluyendo zonas rurales y montañosas de España.
 *
 * @param {React.RefObject} mapRef  ref del objeto L.map
 * @returns {{ tileMode, toggleTile }}
 */
import { useState, useCallback, useRef } from "react";

const TILE_LAYERS = {
  map: {
    url:         "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom:     19,
  },
  satellite: {
    url:         "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri — Source: Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community",
    maxZoom:     19,
  },
};

export function useMapTiles(mapRef) {
  const [tileMode, setTileMode] = useState("map");
  const tileLayerRef = useRef(null);  // referencia a la capa L.tileLayer activa

  // Llamar después de crear el mapa para registrar la capa inicial
  const initTileLayer = useCallback((layer) => {
    tileLayerRef.current = layer;
  }, []);

  const toggleTile = useCallback(() => {
    const map = mapRef.current;
    if (!map || typeof window.L === "undefined") return;
    const L = window.L;

    const next = tileMode === "map" ? "satellite" : "map";
    const cfg  = TILE_LAYERS[next];

    // Quitar la capa actual
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    // Añadir la nueva capa
    const newLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom:     cfg.maxZoom,
    }).addTo(map);

    tileLayerRef.current = newLayer;
    setTileMode(next);
  }, [tileMode, mapRef]);

  return { tileMode, toggleTile, initTileLayer, TILE_LAYERS };
}
