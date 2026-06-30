/**
 * registerServiceWorker.ts — Registro y auto-actualización del Service Worker (PWA-12)
 *
 * Por qué hace falta esto:
 * sw.js ya llama a self.skipWaiting() en el install y a self.clients.claim()
 * en el activate (ver public/sw.js), y /sw.js se sirve con
 * Cache-Control: no-cache, must-revalidate (vercel.json). Eso garantiza que
 * EN CUANTO el navegador comprueba si hay una versión nueva, la instala y
 * toma el control sin esperar a que se cierren las pestañas antiguas.
 *
 * El eslabón que faltaba es la comprobación en sí: por defecto el navegador
 * solo revisa si /sw.js cambió en navegaciones de nivel superior, y como
 * mucho una vez cada ~24h. Una PWA instalada (icono en pantalla de inicio)
 * o una pestaña abierta varios días puede tardar en disparar esa revisión
 * por su cuenta — ahí es donde un usuario se queda "atascado" en una
 * versión vieja sin que el código nuevo llegue nunca a comprobarse.
 *
 * Este módulo fuerza `registration.update()`:
 *   1) justo al registrar el SW,
 *   2) cada vez que la pestaña vuelve a primer plano (visibilitychange),
 *   3) cada UPDATE_CHECK_INTERVAL_MS mientras la app permanece abierta.
 *
 * Combinado con el ciclo de vida ya existente en sw.js, esto cierra el
 * círculo: cualquier usuario que abra o vuelva a la app recibe la última
 * versión automáticamente, sin tener que borrar caché ni desinstalar nada.
 */

export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1h

export interface AutoUpdateHandle {
  /** Detiene el polling periódico (uso en tests / cleanup). */
  stop: () => void;
}

export interface WireAutoUpdateOptions {
  win?: Pick<Window, "location">;
  doc?: Pick<Document, "addEventListener" | "removeEventListener" | "visibilityState">;
  swContainer?: Pick<ServiceWorkerContainer, "addEventListener" | "removeEventListener">;
  intervalMs?: number;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
  /** Se llama una vez, justo antes de recargar, para avisar al usuario (toast no bloqueante). */
  onUpdateAvailable?: () => void;
}

/**
 * Engancha el ciclo de auto-actualización a un `registration` ya obtenido.
 * Separado de `registerServiceWorker()` para poder testear la lógica de
 * actualización sin depender de `navigator.serviceWorker.register`.
 */
export function wireAutoUpdate(
  registration: Pick<ServiceWorkerRegistration, "update">,
  options: WireAutoUpdateOptions = {},
): AutoUpdateHandle {
  const {
    win = window,
    doc = document,
    swContainer = navigator.serviceWorker,
    intervalMs = UPDATE_CHECK_INTERVAL_MS,
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval,
    onUpdateAvailable,
  } = options;

  const checkForUpdate = () => {
    registration.update().catch(() => {
      // Sin red o SW no soportado en este contexto: no es un error fatal,
      // simplemente no hay comprobación esta vez.
    });
  };

  // 1) Revisar ya mismo si hay una versión nueva.
  checkForUpdate();

  // 2) Revisar cada vez que la pestaña vuelve a primer plano.
  const onVisibilityChange = () => {
    if (doc.visibilityState === "visible") checkForUpdate();
  };
  doc.addEventListener("visibilitychange", onVisibilityChange);

  // 3) Revisar periódicamente mientras la app sigue abierta — cubre PWAs
  //    instaladas o pestañas de larga duración que no navegan nunca.
  const intervalId = setIntervalFn(checkForUpdate, intervalMs);

  // 4) Cuando el nuevo SW toma el control (clients.claim() en sw.js, tras
  //    self.skipWaiting() automático en el install), recargar UNA sola vez.
  //    Guard contra "reload loops" si el evento se disparase más de una vez.
  let reloaded = false;
  const onControllerChange = () => {
    if (reloaded) return;
    reloaded = true;
    onUpdateAvailable?.();
    win.location.reload();
  };
  swContainer.addEventListener("controllerchange", onControllerChange);

  return {
    stop: () => {
      clearIntervalFn(intervalId);
      doc.removeEventListener("visibilitychange", onVisibilityChange);
      swContainer.removeEventListener("controllerchange", onControllerChange);
    },
  };
}

/**
 * Registra /sw.js y activa la auto-actualización. Solo debe llamarse en
 * producción (en dev el SW está desactivado, ver vite.config.ts).
 */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        wireAutoUpdate(registration, {
          onUpdateAvailable: () => {
            // Aviso breve y no bloqueante — la recarga ya está en marcha,
            // el usuario no necesita pulsar nada para recibirla.
            window.dispatchEvent(
              new CustomEvent("teg-toast", {
                detail: {
                  type: "info",
                  message: "🔄 Actualizando a la última versión…",
                  duration: 2500,
                  id: Date.now(),
                },
              }),
            );
          },
        });
      })
      .catch((err) => {
        // Error de registro no es crítico — la app funciona sin SW.
        console.warn("[SW] Error al registrar el service worker:", err);
      });
  });
}
