/**
 * useMapTiles.ts — tipos sobre useMapTiles.js
 */
import type { RefObject } from 'react';
import type { Map as LeafletMap, TileLayer } from 'leaflet';
import { useMapTiles as _useMapTiles } from './useMapTiles.js';

export type TileMode = 'map' | 'satellite';

export interface TileLayerConfig {
  url: string;
  attribution: string;
  maxZoom: number;
}

export interface UseMapTilesReturn {
  tileMode: TileMode;
  toggleTile: () => void;
  initTileLayer: (layer: TileLayer) => void;
  TILE_LAYERS: Record<TileMode, TileLayerConfig>;
}

export function useMapTiles(mapRef: RefObject<LeafletMap | null>): UseMapTilesReturn {
  return _useMapTiles(mapRef) as UseMapTilesReturn;
}
