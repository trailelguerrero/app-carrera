/**
 * leafletLoader.ts — carga Leaflet desde el bundle npm (no CDN).
 *
 * Antes se cargaba desde unpkg.com en index.html. Eso fallaba en:
 *   - Tor Browser (bloquea CDNs externos)
 *   - Redes sin acceso a unpkg.com
 *   - Modo offline / PWA sin caché del CDN
 *
 * Ahora Leaflet está en package.json y va bundleado con la app.
 * Lo exponemos en window.L para compatibilidad con el código existente
 * que usa window.L (los componentes de mapa con useRef + useEffect).
 *
 * Este archivo se importa UNA VEZ en main.tsx.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ampliar Window para que TypeScript conozca window.L
declare global {
  interface Window { L: typeof L }
}

// Exponer globalmente para compatibilidad con los componentes de mapa
window.L = L;
