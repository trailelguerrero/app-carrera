/**
 * usePendingSync.js — Mejora 6
 *
 * Hook reactivo que expone cuántas colecciones tienen escrituras
 * pendientes sin sincronizar con Neon.
 *
 * Se actualiza al escuchar:
 *   - 'teg-save-status'  → emitido por dataService tras cada operación
 *   - 'online'           → cuando vuelve la conexión y arranca el retry
 *
 * Uso:
 *   const { pendingCount, isSyncing } = usePendingSync();
 */
import { useState, useEffect, useCallback } from 'react';

export function usePendingSync() {
  const countPending = useCallback(() => {
    try {
      return Object.keys(localStorage).filter(k => k.startsWith('__pending_sync_')).length;
    } catch {
      return 0;
    }
  }, []);

  const [pendingCount, setPendingCount] = useState(countPending);
  const [isSyncing, setIsSyncing]       = useState(false);

  useEffect(() => {
    const handleStatus = (e) => {
      const status = e.detail?.status;
      if (status === 'saving') {
        setIsSyncing(true);
      } else {
        setIsSyncing(false);
        // Tras saved/error releer el contador real desde localStorage
        setPendingCount(countPending());
      }
    };

    const handleOnline = () => {
      setIsSyncing(true);
    };

    const handleOffline = () => {
      setIsSyncing(false);
      setPendingCount(countPending());
    };

    window.addEventListener('teg-save-status', handleStatus);
    window.addEventListener('online',          handleOnline);
    window.addEventListener('offline',         handleOffline);

    // Sincronizar al montar
    setPendingCount(countPending());

    return () => {
      window.removeEventListener('teg-save-status', handleStatus);
      window.removeEventListener('online',          handleOnline);
      window.removeEventListener('offline',         handleOffline);
    };
  }, [countPending]);

  return { pendingCount, isSyncing };
}
