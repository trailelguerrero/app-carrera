/**
 * sw.js — Service Worker offline-first · Trail El Guerrero 2026
 *
 * Estrategias de caché por recurso:
 *
 *  Cache First         → assets estáticos (JS, CSS, imágenes, fuentes)
 *                        Cambian solo en cada deploy (el hash del nombre los invalida).
 *                        Prioridad: velocidad > frescura.
 *
 *  Network First       → datos operativos de la API (/api/proxy/data/*)
 *                        Intenta la red primero; si falla, devuelve la caché.
 *                        Prioridad: frescura > disponibilidad inmediata.
 *
 *  Network Only        → presupuesto, patrocinadores, autenticación
 *                        Datos sensibles o de escritura que NUNCA deben servirse desde caché.
 *
 *  Background Sync     → escrituras pendientes (PUT /api/proxy/data/*)
 *                        Si el dispositivo está offline al guardar, el SW sincroniza
 *                        automáticamente en background cuando vuelve la conexión,
 *                        aunque la app esté cerrada.
 *
 *  Push Notifications  → incidencias DiaCarrera
 *                        Notificación nativa cuando se registra una incidencia nueva,
 *                        incluso con la app en segundo plano.
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
// PWA-11: workbox-build exige exactamente UNA ocurrencia del token de manifest.
// Lo asignamos a una constante local; el resto del archivo usa esa constante.
const WB_MANIFEST = self.__WB_MANIFEST;
const CACHE_VERSION = Array.isArray(WB_MANIFEST) && WB_MANIFEST.length > 0
  ? `pwa-${WB_MANIFEST[0].revision ?? WB_MANIFEST[0].url.slice(-8)}`
  : `dev-${Date.now()}`;

const CACHE_STATIC  = `${CACHE_VERSION}-static`;
const CACHE_DATA    = `${CACHE_VERSION}-data`;

// BUGFIX (jun-2026): "pending-writes" guarda escrituras offline pendientes de
// sincronizar (ver dataService.js / syncFromSW). No lleva CACHE_VERSION en el
// nombre porque debe sobrevivir a un deploy — si un voluntario guarda algo sin
// conexión justo cuando se publica una versión nueva, el activate de abajo no
// debe borrarla antes de que dataService.js o syncFromSW() la procesen.
const CACHE_PENDING = "pending-writes";

// ── Patrones de caché (inlineados) ─────────────────────────────────────────
// IMPORTANTE: mantener sincronizados con src/constants/swPatterns.ts,
// que es la fuente de verdad para los tests de Vitest.
// Rollup/Workbox procesa public/sw.js en un contexto aislado y NO puede
// resolver imports que crucen de public/ hacia src/ — ni .js ni .ts.
// TEST-01: src/test/sw-patterns.test.js sigue importando swPatterns.ts directamente.

/** PWA-11: URLs precacheadas durante el install del SW (app shell crítico). */
const PRECACHE_URLS = [
  '/',
  '/voluntarios/mi-ficha',
  '/manifest.json',
  '/icon-192.webp',
  '/icon-512.webp',
  '/logo.webp',
  '/offline.html',
];

/** Network First — intenta red primero, fallback a caché. */
const NETWORK_FIRST_PATTERNS = [
  /\/api\/proxy\/data\/teg_voluntarios_/,
  /\/api\/proxy\/data\/teg_logistica_/,
  /\/api\/proxy\/data\/teg_camisetas_/,
  /\/api\/proxy\/data\/teg_proyecto_/,
  /\/api\/proxy\/data\/teg_documentos_/,
];

/** @deprecated Alias de NETWORK_FIRST_PATTERNS (Mejora 10). */
const STALE_WHILE_REVALIDATE_PATTERNS = NETWORK_FIRST_PATTERNS;

/** Network Only — datos sensibles que NUNCA se sirven desde caché. */
const NETWORK_ONLY_PATTERNS = [
  /\/api\/voluntarios/,
  /\/api\/proxy\/data\/teg_presupuesto/,
  /\/api\/proxy\/data\/teg_scenario/,
  /\/api\/proxy\/data\/teg_pat/,
  /\/api\/proxy\/budget/,
  /\/api\/panel\/auth/,
  /\/api\/proxy\/documents/,
  /\/api\/proxy\/docs/,
  /\/api\/setup/,
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
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_DATA && k !== CACHE_PENDING)
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

  // POST/PUT/DELETE → nunca cachear (las escrituras van por Background Sync)
  if (request.method !== "GET") return;

  // Network Only — datos sensibles
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(url.pathname + url.search))) {
    event.respondWith(fetch(request));
    return;
  }

  // Network First — datos operativos de la API (offline: devuelve caché)
  if (NETWORK_FIRST_PATTERNS.some((p) => p.test(url.pathname + url.search))) {
    event.respondWith(networkFirst(request, CACHE_DATA));
    return;
  }

  // Cache First — assets estáticos y navegación
  event.respondWith(cacheFirst(request, CACHE_STATIC));
});

// ── BACKGROUND SYNC — sincronizar escrituras pendientes ───────────────────
// Se activa cuando el dispositivo recupera la conexión, aunque la app esté cerrada.
// El cliente registra la tarea con: registration.sync.register('pending-sync')
// dataService.js ya gestiona la cola en localStorage; el SW solo dispara el proceso.
self.addEventListener("sync", (event) => {
  if (event.tag === "pending-sync") {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        if (clients.length > 0) {
          // Hay ventana abierta: notificar para que dataService procese la cola
          clients[0].postMessage({ type: "SW_TRIGGER_SYNC" });
        } else {
          // App cerrada: intentar sincronizar directamente desde el SW
          return syncFromSW();
        }
      })
    );
  }
});

// ── PUSH NOTIFICATIONS — incidencias DiaCarrera ───────────────────────────
// Recibe notificaciones del servidor cuando se registra una incidencia nueva.
// Payload esperado: { title, body, gravedad, tag }
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "🚨 Nueva incidencia", body: event.data.text() };
  }

  const gravedad = payload.gravedad || "media";
  const iconMap = { alta: "🔴", media: "🟠", baja: "🟡" };
  const icon = iconMap[gravedad] || "🟠";

  const options = {
    body: payload.body || "Se ha registrado una incidencia nueva en el evento.",
    icon: "/icon-192.webp",
    badge: "/icon-192.webp",
    tag: payload.tag || `incidencia-${Date.now()}`,
    renotify: true,
    data: { url: payload.url || "/" },
    actions: [
      { action: "open", title: "Ver incidencia" },
      { action: "dismiss", title: "Cerrar" },
    ],
    vibrate: gravedad === "alta" ? [200, 100, 200, 100, 200] : [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(`${icon} ${payload.title || "Nueva incidencia"}`, options)
  );
});

// Manejar clic en la notificación
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Si la app ya está abierta, enfocarla y navegar
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: "SW_NAVIGATE", url: targetUrl });
        return;
      }
      // Si no está abierta, abrirla
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ── MENSAJE desde el cliente ───────────────────────────────────────────────
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
    // Sin red y sin caché: devolver offline.html para navegación, 503 para assets
    if (request.headers.get("Accept")?.includes("text/html")) {
      const offline = await caches.match("/offline.html");
      if (offline) return offline;
    }
    return new Response("Sin conexión", { status: 503 });
  }
}

// ── Estrategia: Network First ───────────────────────────────────────────────
// Intenta la red primero. Si falla (offline), devuelve la caché.
// Siempre actualiza la caché tras una respuesta exitosa.
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sin red: devolver caché si existe
    const cached = await cache.match(request);
    if (cached) return cached;
    // Navegación sin caché → mostrar página offline
    if (request.headers.get("Accept")?.includes("text/html")) {
      const offline = await caches.match("/offline.html");
      if (offline) return offline;
    }
    return new Response(
      JSON.stringify({ error: "Sin conexión", offline: true }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ── Background Sync desde SW (app cerrada) ─────────────────────────────────
// Lee las claves __pending_sync_* de la caché del SW y reintenta el PUT.
// Esta es una ruta de último recurso: normalmente dataService.js lo hace.
async function syncFromSW() {
  // No tenemos acceso a localStorage desde el SW; usamos Cache Storage como puente.
  // El cliente escribe los datos pendientes en un cache especial antes de cerrar.
  const pendingCache = await caches.open(CACHE_PENDING);
  const keys = await pendingCache.keys();

  if (keys.length === 0) return;

  const results = await Promise.allSettled(
    keys.map(async (request) => {
      try {
        const cachedResponse = await pendingCache.match(request);
        if (!cachedResponse) return;

        const body = await cachedResponse.text();
        const response = await fetch(request.url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        });

        if (response.ok) {
          await pendingCache.delete(request);
        }
      } catch {
        // Dejamos la entrada en caché para el próximo intento
      }
    })
  );

  // Notificar a cualquier cliente que se abra después
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((c) => c.postMessage({ type: "SW_SYNC_COMPLETE" }));

  return results;
}
