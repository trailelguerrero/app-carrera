/**
 * useLeafletReady — asegura que Leaflet (window.L) esté cargado y disponible.
 *
 * Dispara la carga dinámica de Leaflet (ensureLeaflet) al montar un componente
 * de mapa, de modo que Leaflet ya no viaja en el bundle de entrada de la app.
 * Devuelve true en cuanto window.L está disponible.
 */
import { useState, useEffect } from 'react';
import { ensureLeaflet } from '@/lib/leafletLoader';

export function useLeafletReady(): boolean {
  const [ready, setReady] = useState<boolean>(
    () => typeof window !== 'undefined' && typeof window.L !== 'undefined'
  );

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    ensureLeaflet()
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => { console.error('[useLeafletReady] No se pudo cargar Leaflet'); });
    return () => { cancelled = true; };
  }, [ready]);

  return ready;
}
