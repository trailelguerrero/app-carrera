import { useState, useEffect } from 'react';

/**
 * Detecta si el navegador tiene conexión a internet.
 * Escucha los eventos nativos online/offline del navegador.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  useEffect(() => {
    const handleOn  = () => setOnline(true);
    const handleOff = () => setOnline(false);
    window.addEventListener('online',  handleOn);
    window.addEventListener('offline', handleOff);
    return () => {
      window.removeEventListener('online',  handleOn);
      window.removeEventListener('offline', handleOff);
    };
  }, []);
  return online;
}
