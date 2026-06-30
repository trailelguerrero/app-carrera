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
// PERF-F4: Leaflet ya no se carga en boot — useLeafletReady lo importa bajo demanda
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/registerServiceWorker";

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
//
// PWA-12 (jun-2026): antes, el SW nuevo se instalaba pero esperaba a que el
// usuario pulsase "Actualizar" en un toast — y encima sw.js ya llama a
// self.skipWaiting() automáticamente en el install, así que ese botón no
// tenía ningún efecto real y solo generaba confusión. Además, sin forzar
// `registration.update()`, el navegador solo revisaba si había una versión
// nueva en navegaciones de nivel superior y como mucho una vez cada ~24h —
// una PWA instalada o una pestaña abierta varios días podía quedarse
// atascada en una versión vieja indefinidamente.
//
// Ahora registerServiceWorker() fuerza la comprobación al registrar, al
// volver a primer plano y cada hora mientras la app sigue abierta, y
// recarga sola en cuanto el SW nuevo toma el control. Ningún usuario tiene
// que hacer nada manualmente. Ver src/lib/registerServiceWorker.ts.
if (import.meta.env.PROD) {
  registerServiceWorker();
}
