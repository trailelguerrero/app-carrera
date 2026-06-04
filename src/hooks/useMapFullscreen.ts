/**
 * useMapFullscreen.ts
 *
 * Gestiona pantalla completa para un contenedor de mapa.
 * Usa la Fullscreen API del navegador + fallback CSS para iOS Safari.
 * Llama map.invalidateSize() automáticamente tras el cambio.
 */
import { useState, useEffect, useCallback, RefObject } from 'react';
import type { Map as LeafletMap } from 'leaflet';

// Ampliar tipos de Document/HTMLElement para APIs prefijadas
declare global {
  interface Document {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
  }
  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
  }
}

export function useMapFullscreen(
  wrapperRef: RefObject<HTMLElement | null>,
  mapRef: RefObject<LeafletMap | null>
) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const onChange = () => {
      const inFS =
        !!document.fullscreenElement ||
        !!document.webkitFullscreenElement ||
        !!document.mozFullScreenElement;
      setIsFullscreen(inFS);
      setTimeout(() => mapRef.current?.invalidateSize(), 120);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    document.addEventListener('mozfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      document.removeEventListener('mozfullscreenchange', onChange);
    };
  }, [mapRef]);

  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!isFullscreen) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
      if (req) req.call(el).catch(() => setIsFullscreen(true));
      else setIsFullscreen(true);
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
      if (exit && document.fullscreenElement) exit.call(document).catch(() => setIsFullscreen(false));
      else setIsFullscreen(false);
      setTimeout(() => mapRef.current?.invalidateSize(), 120);
    }
  }, [isFullscreen, wrapperRef, mapRef]);

  return { isFullscreen, toggleFullscreen };
}
