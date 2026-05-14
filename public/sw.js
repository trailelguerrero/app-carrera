/**
 * sw.js — Service Worker offline-first · Trail El Guerrero 2026
 *
 * Estrategias de caché por recurso:
 *
 *  Cache First         → assets estáticos (JS, CSS, imágenes, fuentes)
 *                        Cambian solo en cada deploy (el hash del nombre los invalida).
 *                        Prioridad: velocidad > frescura.
 *
 *  Stale While Revalidate → datos de voluntarios, logística y portal
 *                        Se muestra la caché mientras se actualiza en background.
 *                        Prioridad: disponibilidad > frescura inmediata.
 *
 *  Network Only        → presupuesto, patrocinadores, autenticación
 *                        Datos sensibles o de escritura que NUNCA deben servirse desde caché.
 *
 * Datos disponibles offline:
 *  ✅ Portal del voluntario (/voluntarios/mi-ficha)
 *  ✅ Lista de voluntarios y puestos
 *  ✅ Directorio de emergencias y checklist logístico
 *  ✅ Panel principal y assets de la app
 *
 * Datos NO disponibles offline (por diseño):
 *  ❌ Presupuesto y datos financieros
 *  ❌ Patrocinadores
 *  ❌ Autenticación (login, cambio de PIN)
 *  ❌ Documentos y gestiones legales
 */

// ── Versión de caché ────────────────────────────────────────────────────────
// Se inyecta en build por vite-plugin-pwa (injectManifest).
// En desarrollo se usa un timestamp para invalidar siempre.
const CACHE_VERSION = self.__WB_MANIFEST ? "pwa-v1" : `dev-${Date.now()}`;

const CACHE_STATIC  = `${CACHE_VERSION}-static`;
const CACHE_DATA    = `${CACHE_VERSION}-data`;

// Assets que se precargan en la instalación del SW
const PRECACHE_URLS = [
  "/",
  "/voluntarios/mi-ficha",
  "/manifest.json",
  "/icon-192.webp",
  "/icon-512.webp",
  "/logo.webp",
];

// ── Rutas con estrategia Network Only (datos sensibles) ────────────────────
const NETWORK_ONLY_PATTERNS = [
  /\/api\/proxy\/data\/teg_presupuesto/,
  /\/api\/proxy\/data\/teg_pat_/,
  /\/api\/proxy\/budget/,
  /\/api\/panel\/auth/,
  /\/api\/proxy\/documents/,
  /\/api\/proxy\/docs/,
  /\/api\/setup/,
];

// ── Rutas con estrategia Stale While Revalidate (datos operativos) ─────────
const STALE_WHILE_REVALIDATE_PATTERNS = [
  /\/api\/proxy\/data\/teg_vol_/,       // voluntarios
  /\/api\/proxy\/data\/teg_log_/,       // logística (directorio, checklist)
  /\/api\/proxy\/data\/teg_dia_/,       // día de carrera
  /\/api\/proxy\/voluntarios/,          // portal del voluntario
];

// ── INSTALL — precargar assets críticos ────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      // Precache silencioso: si algún recurso falla no bloquea la instalación
      return Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE — limpiar cachés de versiones anteriores ──────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_DATA)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — enrutar cada petición a su estrategia ──────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptamos peticiones al mismo origen
  if (url.origin !== self.location.origin) return;

  // POST/PUT/DELETE → nunca cachear
  if (request.method !== "GET") return;

  // Network Only — datos sensibles
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(url.pathname + url.search))) {
    event.respondWith(fetch(request));
    return;
  }

  // Stale While Revalidate — datos operativos de la API
  if (STALE_WHILE_REVALIDATE_PATTERNS.some((p) => p.test(url.pathname + url.search))) {
    event.respondWith(staleWhileRevalidate(request, CACHE_DATA));
    return;
  }

  // Cache First — assets estáticos y navegación
  event.respondWith(cacheFirst(request, CACHE_STATIC));
});

// ── MENSAJE desde el cliente (ej: forzar actualización) ───────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Estrategia: Cache First ─────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sin red y sin caché: devolver página de fallback si existe
    const fallback = await caches.match("/");
    return fallback || new Response("Sin conexión", { status: 503 });
  }
}

// ── Estrategia: Stale While Revalidate ─────────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Revalidar en background independientemente de si hay caché
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  // Devolver caché inmediatamente si existe; si no, esperar la red
  return cached || fetchPromise || new Response("Sin conexión", { status: 503 });
}
