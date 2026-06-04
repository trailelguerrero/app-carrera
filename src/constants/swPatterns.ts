/**
 * swPatterns.ts — Patrones de caché del Service Worker
 *
 * Exportado como módulo ES para que tanto public/sw.js como los tests
 * de Vitest puedan importarlo. Garantiza que los patrones del SW
 * y las claves reales de storageKeys no se desincronicen silenciosamente.
 *
 * TEST-01: src/test/sw-patterns.test.js verifica cobertura de claves críticas.
 */

/** Rutas servidas con Network First — intenta la red primero, fallback a caché. */
export const NETWORK_FIRST_PATTERNS: RegExp[] = [
  /\/api\/proxy\/data\/teg_voluntarios_/,
  /\/api\/proxy\/data\/teg_logistica_/,
  /\/api\/proxy\/data\/teg_dia_/,
];

/**
 * @deprecated Mantenido para compatibilidad con tests existentes (TEST-01).
 * Idéntico a NETWORK_FIRST_PATTERNS — migrado a Network First en la Mejora 10.
 */
export const STALE_WHILE_REVALIDATE_PATTERNS: RegExp[] = NETWORK_FIRST_PATTERNS;

/** Rutas que NUNCA se sirven desde caché (datos sensibles o de escritura) */
export const NETWORK_ONLY_PATTERNS: RegExp[] = [
  /\/api\/voluntarios/,
  /\/api\/proxy\/data\/teg_presupuesto/,
  /\/api\/proxy\/data\/teg_pat_/,
  /\/api\/proxy\/budget/,
  /\/api\/panel\/auth/,
  /\/api\/proxy\/documents/,
  /\/api\/proxy\/docs/,
  /\/api\/setup/,
];

/** PWA-11: URLs precacheadas durante el install del SW (app shell crítico). */
export const PRECACHE_URLS: string[] = [
  '/',
  '/voluntarios/mi-ficha',
  '/manifest.json',
  '/icon-192.webp',
  '/icon-512.webp',
  '/logo.webp',
  '/offline.html',
];
