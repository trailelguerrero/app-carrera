/**
 * useMapFullscreen.js
 *
 * Hook que gestiona pantalla completa para un contenedor de mapa.
 *
 * Usa la Fullscreen API del navegador (requestFullscreen / exitFullscreen).
 * Cuando el contenedor entra en fullscreen, llama map.invalidateSize() para
 * que Leaflet recalcule sus dimensiones y redibuje los tiles correctamente.
 *
 * Compatibilidad:
 *   - Chrome/Edge/Firefox/Safari desktop: ✅
 *   - Android Chrome: ✅ (fullscreen nativo)
 *   - iOS Safari: no soporta Fullscreen API — fallback a position:fixed
 *
 * @param {React.RefObject} wrapperRef  ref del div envolvente del mapa
 * @param {React.RefObject} mapRef      ref del objeto L.map
 * @returns {{ isFullscreen, toggleFullscreen, isSupported }}
 */
import { useState, useEffect, useCallback } from "react";

export function useMapFullscreen(wrapperRef, mapRef) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Soporte nativo de Fullscreen API
  const isSupported =
    typeof document !== "undefined" &&
    (document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled);

  // Escuchar cambios de fullscreen (botón ESC, salida nativa)
  useEffect(() => {
    const onChange = () => {
      const inFS =
        !!document.fullscreenElement ||
        !!document.webkitFullscreenElement ||
        !!document.mozFullScreenElement;
      setIsFullscreen(inFS);
      // Dar tiempo al navegador a aplicar el resize antes de invalidar
      setTimeout(() => mapRef.current?.invalidateSize(), 120);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    document.addEventListener("mozfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      document.removeEventListener("mozfullscreenchange", onChange);
    };
  }, [mapRef]);

  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;

    if (!isFullscreen) {
      // Entrar en fullscreen
      const req =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen;
      if (req) {
        req.call(el).catch(() => {
          // iOS Safari u otro entorno sin soporte: fallback CSS
          setIsFullscreen(true);
        });
      } else {
        // Fallback CSS para iOS
        setIsFullscreen(true);
      }
    } else {
      // Salir de fullscreen
      const exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen;
      if (exit && document.fullscreenElement) {
        exit.call(document).catch(() => setIsFullscreen(false));
      } else {
        setIsFullscreen(false);
      }
      setTimeout(() => mapRef.current?.invalidateSize(), 120);
    }
  }, [isFullscreen, wrapperRef, mapRef]);

  return { isFullscreen, toggleFullscreen, isSupported: true }; // siempre true — fallback CSS cubre iOS
}
