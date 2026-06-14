/**
 * leafletLoader.ts — carga Leaflet bajo demanda (no en boot).
 *
 * Antes este módulo se importaba en main.tsx con efecto de lado, metiendo
 * Leaflet (~150 kB) en el bundle de entrada de TODA la app, incluido el
 * portal del voluntario donde el mapa es condicional y va below-the-fold.
 *
 * Ahora exporta ensureLeaflet(): importa Leaflet + su CSS de forma dinámica
 * (su propio chunk), expone window.L para el código existente basado en
 * window.L, cachea la promesa e idempotente. Lo invoca useLeafletReady()
 * cuando un componente de mapa se monta (admin o portal).
 */
import type L from 'leaflet';

// Ampliar Window para que TypeScript conozca window.L
declare global {
  interface Window { L: typeof L }
}

let leafletPromise: Promise<typeof L> | null = null;

export function ensureLeaflet(): Promise<typeof L> {
  if (typeof window !== 'undefined' && typeof window.L !== 'undefined') {
    return Promise.resolve(window.L);
  }
  if (!leafletPromise) {
    leafletPromise = Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([mod]) => {
      const Lmod = (mod as { default?: typeof L }).default ?? (mod as unknown as typeof L);
      window.L = Lmod;
      return Lmod;
    });
  }
  return leafletPromise;
}
