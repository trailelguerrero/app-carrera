/**
 * usePushNotifications.js — Hook para push notifications de incidencias
 *
 * Gestiona el ciclo completo:
 *  1. Comprobar soporte del navegador
 *  2. Solicitar permiso al usuario
 *  3. Suscribirse al Push Service (VAPID)
 *  4. Guardar la suscripción en el servidor
 *  5. Exponer estado y toggle al componente
 *
 * Uso mínimo:
 *   const { enabled, supported, toggle, loading } = usePushNotifications();
 *
 * NOTA: Para que las notificaciones lleguen del servidor a los dispositivos,
 * el backend necesita las claves VAPID (VITE_VAPID_PUBLIC_KEY en el cliente,
 * VAPID_PRIVATE_KEY en Vercel). Sin claves VAPID configuradas, la suscripción
 * se registra en localStorage como "local-only" y solo funciona si la app
 * está en primer plano (útil para demo/desarrollo).
 */

import { useState, useEffect, useCallback } from 'react';

// Clave pública VAPID inyectada en build. Sin ella, el push funciona en modo local.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || null;
const LS_KEY = '__push_subscription__';

/**
 * Convierte una clave VAPID base64url a Uint8Array para la API de Push.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ¿El navegador soporta push?
  // PWA-11: en producción (PROD=true) requerir VAPID configurado — sin clave las
  // suscripciones se crean sin applicationServerKey y Chrome ≥127 las rechaza.
  // En desarrollo se permite sin VAPID para pruebas locales.
  const vapidReady = !!VAPID_PUBLIC_KEY || !import.meta.env.PROD;
  const supported =
    vapidReady &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const enabled = permission === 'granted' && !!subscription;

  // Al montar, comprobar si ya hay suscripción activa
  useEffect(() => {
    if (!supported) return;

    const checkExisting = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          setSubscription(existing);
          setPermission('granted');
        }
      } catch {
        // No hay suscripción previa — estado inicial correcto
      }
    };

    checkExisting();
  }, [supported]);

  /**
   * Activa las notificaciones push.
   * 1. Pide permiso al usuario
   * 2. Suscribe al Push Service
   * 3. Guarda suscripción en servidor (si hay endpoint configurado)
   */
  const enable = useCallback(async () => {
    if (!supported) {
      setError('Este navegador no soporta notificaciones push.');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Solicitar permiso
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        setError('Permiso denegado. Actívalo desde los ajustes del navegador.');
        return false;
      }

      // 2. Obtener SW registrado
      const reg = await navigator.serviceWorker.ready;

      // 3. Suscribirse al Push Service
      const subscribeOptions = {
        userVisibleOnly: true,
        ...(VAPID_PUBLIC_KEY
          ? { applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }
          : {}),
      };

      const pushSub = await reg.pushManager.subscribe(subscribeOptions);
      setSubscription(pushSub);

      // 4. Enviar suscripción al servidor (si hay API disponible)
      if (VAPID_PUBLIC_KEY) {
        try {
          await fetch('/api/push?action=subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pushSub.toJSON()),
          });
        } catch {
          // El servidor no tiene endpoint de push — modo local funcional
          console.info('[Push] Servidor sin endpoint /api/push?action=subscribe — modo local activo.');
        }
      }

      // Guardar en localStorage como fallback para modo local
      localStorage.setItem(LS_KEY, JSON.stringify(pushSub.toJSON()));

      return true;
    } catch (err) {
      setError(`Error al activar notificaciones: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  /**
   * Desactiva las notificaciones push y elimina la suscripción.
   */
  const disable = useCallback(async () => {
    if (!subscription) return;

    setLoading(true);
    try {
      await subscription.unsubscribe();

      // Informar al servidor
      if (VAPID_PUBLIC_KEY) {
        try {
          await fetch('/api/push?action=unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        } catch {
          // Ignorar — la suscripción local ya está cancelada
        }
      }

      localStorage.removeItem(LS_KEY);
      setSubscription(null);
    } catch (err) {
      setError(`Error al desactivar notificaciones: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  const toggle = useCallback(() => {
    return enabled ? disable() : enable();
  }, [enabled, enable, disable]);

  /**
   * Envía una notificación local (sin servidor) usando la API de Notifications.
   * Útil para modo desarrollo o cuando no hay VAPID configurado.
   * @param {string} title
   * @param {object} options
   */
  const notifyLocal = useCallback(async (title, options = {}) => {
    if (permission !== 'granted') return;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        icon: '/icon-192.webp',
        badge: '/icon-192.webp',
        ...options,
      });
    } catch {
      // Fallback a Notification API si el SW no está disponible
      new Notification(title, options);
    }
  }, [permission]);

  return {
    supported,
    enabled,
    permission,
    loading,
    error,
    toggle,
    enable,
    disable,
    notifyLocal,
  };
}
