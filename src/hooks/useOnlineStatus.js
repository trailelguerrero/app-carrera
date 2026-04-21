import { useState, useEffect } from "react";

/**
 * Detecta si el navegador tiene conexión a internet.
 * Escucha los eventos nativos online/offline del navegador.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOn  = () => setOnline(true);
    const handleOff = () => setOnline(false);
    window.addEventListener("online",  handleOn);
    window.addEventListener("offline", handleOff);
    return () => {
      window.removeEventListener("online",  handleOn);
      window.removeEventListener("offline", handleOff);
    };
  }, []);
  return online;
}
