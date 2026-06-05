import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
// Leaflet bundleado (no CDN) — funciona en Tor Browser, offline y sin unpkg.com
import "@/lib/leafletLoader";
import App from "./App.tsx";
import "./index.css";

// ── Sentry — solo en producción ────────────────────────────────────────────
// La release se construye como "version+commitSHA" para vincular errores a
// commits exactos en Sentry. VITE_SENTRY_RELEASE se inyecta en build por CI
// o via Vercel Environment Variables. Sin ella, __APP_VERSION__ es el fallback.
const SENTRY_RELEASE: string =
  (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) ??
  (typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "unknown");

// Campos que nunca deben llegar a Sentry (datos personales del evento)
const SCRUB_FIELDS = [
  "password", "token", "secret", "api_key", "apikey",
  "dni", "nif", "telefono", "phone", "email", "correo",
  "nombre", "name", "apellido",
] as const;

/** Elimina valores de campos sensibles de cualquier objeto plano */
function scrubSensitiveData(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const keyLower = k.toLowerCase();
    const isSensitive = SCRUB_FIELDS.some((f) => keyLower.includes(f));
    if (isSensitive) {
      out[k] = "[Filtered]";
    } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = scrubSensitiveData(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: SENTRY_RELEASE,
    environment: "production",
    integrations: [
      // Tracing de React Router v6: cada ruta aparece como transacción en Sentry
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    // 10% de trazas de rendimiento — suficiente para detectar regresiones
    tracesSampleRate: 0.1,
    // Propagación de trazas solo a nuestro propio dominio
    tracePropagationTargets: [/^\/api\//],
    // No enviar datos personales en breadcrumbs de UI (inputs de formularios)
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "ui.input") return null;
      return breadcrumb;
    },
    // Limpiar datos sensibles antes de enviar a Sentry (RGPD)
    beforeSend(event) {
      // Limpiar cuerpo de request
      if (event.request?.data && typeof event.request.data === "object") {
        event.request.data = scrubSensitiveData(
          event.request.data as Record<string, unknown>,
        );
      }
      // Limpiar extra
      if (event.extra && typeof event.extra === "object") {
        event.extra = scrubSensitiveData(
          event.extra as Record<string, unknown>,
        );
      }
      // Eliminar headers de autenticación
      if (event.request?.headers) {
        const h = event.request.headers as Record<string, string>;
        if (h["Authorization"]) h["Authorization"] = "[Filtered]";
        if (h["Cookie"])        h["Cookie"]        = "[Filtered]";
        if (h["X-Api-Key"])     h["X-Api-Key"]     = "[Filtered]";
      }
      return event;
    },
    // Filtrar errores de red esperados (offline), del SW y de extensiones
    ignoreErrors: [
      "NetworkError",
      "Failed to fetch",
      "Load failed",
      /ServiceWorker/i,
      /chrome-extension/i,
      /moz-extension/i,
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],
    // Ignorar eventos originados en extensiones de navegador
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
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
