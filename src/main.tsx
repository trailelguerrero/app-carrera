import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

// ── Sentry — solo en producción ────────────────────────────────────────────
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: __APP_VERSION__,
    environment: "production",
    // Captura el 100% de errores, 10% de trazas de rendimiento
    tracesSampleRate: 0.1,
    // No enviar datos personales en breadcrumbs de UI
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "ui.input") return null;
      return breadcrumb;
    },
    // Filtrar errores de red esperados (offline) y del SW
    ignoreErrors: [
      "NetworkError",
      "Failed to fetch",
      "Load failed",
      /ServiceWorker/i,
    ],
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // datos frescos 60s — sin refetch innecesario
      gcTime:    5 * 60_000,      // caché en memoria 5min tras desmontar
      retry: 1,                   // 1 reintento en error de red
      refetchOnWindowFocus: false, // no refetch al cambiar de pestaña
    },
  },
});
import "./styles/blocks.css";
import "./styles/dashboard.css";
import "./styles/logistica.css";
import "./styles/proyecto.css";
import "./styles/diacarrera.css";
import "./styles/voluntario-portal.css";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

// ── Service Worker — solo en producción ────────────────────────────────────
// En desarrollo el SW está desactivado (devOptions.enabled: false en vite.config)
// para no interferir con el HMR ni cachear assets en caliente.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Detectar cuando hay una nueva versión disponible
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // Solo notificar si hay un SW previo activo (no en la primera instalación)
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Disparar toast via el bus de eventos de la app
              window.dispatchEvent(
                new CustomEvent("teg-toast", {
                  detail: {
                    type: "info",
                    message:
                      "🔄 Nueva versión disponible — recarga para actualizar",
                  },
                })
              );
            }
          });
        });
      })
      .catch((err) => {
        // Error de registro no es crítico — la app funciona sin SW
        console.warn("[SW] Error al registrar el service worker:", err);
      });
  });
}
