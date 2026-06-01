/**
 * useLeafletReady — espera hasta que window.L (Leaflet CDN) esté disponible.
 *
 * Leaflet se carga desde CDN en index.html como <script>. Dependiendo de la
 * velocidad de red y del orden de hidratación de React, puede que el script
 * aún no haya ejecutado cuando los mapas intentan inicializarse.
 *
 * Este hook hace polling cada 100 ms hasta confirmar window.L, y devuelve
 * `true` cuando Leaflet está listo. Los componentes de mapa pueden usarlo
 * como dependencia de su useEffect de inicialización.
 *
 * @returns {boolean}  true cuando window.L está disponible
 */
import { useState, useEffect } from "react";

export function useLeafletReady() {
  const [ready, setReady] = useState(() => typeof window !== "undefined" && typeof window.L !== "undefined");

  useEffect(() => {
    // Ya disponible — nada que hacer
    if (typeof window.L !== "undefined") {
      setReady(true);
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 80; // 8 segundos máximo

    const id = setInterval(() => {
      attempts++;
      if (typeof window.L !== "undefined") {
        setReady(true);
        clearInterval(id);
      } else if (attempts >= MAX_ATTEMPTS) {
        clearInterval(id);
        console.warn("[useLeafletReady] Leaflet no disponible tras 8s — ¿fallo CDN?");
      }
    }, 100);

    return () => clearInterval(id);
  }, []);

  return ready;
}
