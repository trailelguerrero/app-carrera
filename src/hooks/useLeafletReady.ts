/**
 * useLeafletReady — confirma que window.L (Leaflet) está disponible.
 *
 * Con Leaflet bundleado vía npm (leafletLoader.ts importado en main.tsx),
 * window.L se asigna de forma síncrona antes de que React monte nada.
 * El hook devuelve true inmediatamente en ese caso.
 *
 * Mantiene el polling como fallback por si el entorno fuera distinto
 * (tests, SSR parcial, orden de imports alterado).
 */
import { useState, useEffect } from 'react';

export function useLeafletReady(): boolean {
  const [ready, setReady] = useState<boolean>(
    () => typeof window !== 'undefined' && typeof window.L !== 'undefined'
  );

  useEffect(() => {
    if (ready) return;
    let attempts = 0;
    const id = setInterval(() => {
      if (typeof window.L !== 'undefined') {
        setReady(true);
        clearInterval(id);
      } else if (++attempts >= 50) {
        clearInterval(id);
        console.error('[useLeafletReady] Leaflet no disponible — revisa leafletLoader.ts');
      }
    }, 100);
    return () => clearInterval(id);
  }, [ready]);

  return ready;
}
