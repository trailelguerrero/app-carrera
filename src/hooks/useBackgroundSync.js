/**
 * useBackgroundSync.js — Hook para Background Sync de escrituras pendientes
 *
 * Registra una tarea de Background Sync en el SW cuando hay datos pendientes.
 * Si el dispositivo está offline al guardar, el navegador sincronizará
 * automáticamente cuando vuelva la conexión, aunque la app esté cerrada.
 *
 * Integración con dataService.js:
 *   El hook escucha el evento 'teg-save-status' que emite dataService.
 *   Cuando hay pendientes, registra la tarea sync en el SW.
 *
 * También escucha mensajes del SW ('SW_TRIGGER_SYNC') para disparar la
 * cola de dataService cuando el SW detecta conexión recuperada en background.
 *
 * PWA-11: SW_TRIGGER_SYNC ahora llama dataService.triggerSync() en lugar de
 * despachar un fake 'online' event que activaba listeners no relacionados.
 */

import { useEffect, useCallback } from 'react';
import { useAppStore, EVENT_TYPES } from '@/store/useAppStore';
import dataService from '@/lib/dataService';

const SYNC_TAG = 'pending-sync';

export function useBackgroundSync() {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'SyncManager' in window;

  // Mejora 5: emitir via store en lugar de dispatchEvent directo
  const emitEvent = useAppStore((s) => s.emitEvent);

  /**
   * Registra una tarea de Background Sync en el SW.
   * Si ya existe una tarea con el mismo tag, el navegador la deduplica.
   */
  const registerSync = useCallback(async () => {
    if (!supported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register(SYNC_TAG);
    } catch {
      // Background Sync no disponible en este contexto — el retry de dataService cubre esto
    }
  }, [supported]);

  // Escuchar el evento de estado de guardado de dataService
  useEffect(() => {
    const onSaveStatus = (event) => {
      const { status, count } = event.detail || {};
      // Si hay pendientes sin sincronizar, registrar tarea de Background Sync
      if ((status === 'saving' || status === 'error') && count > 0) {
        registerSync();
      }
    };

    window.addEventListener('teg-save-status', onSaveStatus);
    return () => window.removeEventListener('teg-save-status', onSaveStatus);
  }, [registerSync]);

  // Escuchar mensajes del SW para disparar la cola cuando la app está abierta
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onSwMessage = (event) => {
      if (event.data?.type === 'SW_TRIGGER_SYNC') {
        // PWA-11: trigger directo de syncPendingQueue — evita el fake 'online' event
        // que activaba useOnlineStatus y otros listeners no relacionados.
        dataService.triggerSync();
      }
      if (event.data?.type === 'SW_SYNC_COMPLETE') {
        // Sincronización completada desde SW (app estaba cerrada) — Mejora 5: via store
        emitEvent(EVENT_TYPES.DATA_SYNC, 'sw-background-sync');
      }
      if (event.data?.type === 'SW_NAVIGATE') {
        // Notificación push: navegar a la URL indicada
        const url = event.data.url;
        if (url && url !== window.location.pathname) {
          window.location.href = url;
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
  }, [emitEvent]);

  return { supported, registerSync };
}
