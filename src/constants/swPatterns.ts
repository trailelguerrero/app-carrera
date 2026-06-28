/**
 * swPatterns.ts — Patrones de caché del Service Worker
 *
 * Exportado como módulo ES para que tanto public/sw.js como los tests
 * de Vitest puedan importarlo. Garantiza que los patrones del SW
 * y las claves reales de storageKeys no se desincronicen silenciosamente.
 *
 * TEST-01: src/test/sw-patterns.test.js verifica cobertura de claves críticas.
 */

/**
 * Rutas servidas con Network First — intenta la red primero, fallback a caché.
 *
 * BUGFIX (jun-2026): teg_camisetas_, teg_proyecto_ y teg_documentos_ no estaban
 * cubiertas por ningún patrón y caían al "Cache First" por defecto del fetch
 * handler en sw.js — la primera respuesta se cacheaba para siempre y nunca se
 * volvía a pedir a red hasta el siguiente deploy (cambio de CACHE_VERSION).
 * Por eso esos módulos mostraban datos desactualizados salvo en incógnito/Tor.
 *
 * teg_dia_ se elimina: era un patrón muerto, ninguna storageKey real empieza
 * así (Día de Carrera reutiliza SK_LOG_TL/CK/INC y SK_VOL_VOLUNTARIOS, que ya
 * están cubiertas más abajo).
 */
export const NETWORK_FIRST_PATTERNS: RegExp[] = [
  /\/api\/proxy\/data\/teg_voluntarios_/,
  /\/api\/proxy\/data\/teg_logistica_/,
  /\/api\/proxy\/data\/teg_camisetas_/,
  /\/api\/proxy\/data\/teg_proyecto_/,
  /\/api\/proxy\/data\/teg_documentos_/,
];

/**
 * @deprecated Mantenido para compatibilidad con tests existentes (TEST-01).
 * Idéntico a NETWORK_FIRST_PATTERNS — migrado a Network First en la Mejora 10.
 */
export const STALE_WHILE_REVALIDATE_PATTERNS: RegExp[] = NETWORK_FIRST_PATTERNS;

/**
 * Rutas que NUNCA se sirven desde caché (datos sensibles o de escritura)
 *
 * BUGFIX (jun-2026): el patrón de patrocinadores era /teg_pat_/, que NO
 * matchea las claves reales "teg_patrocinadores_v1*" (no hay guión bajo
 * tras "pat") — solo matcheaba SK_PAT_LOG_PREFIX ("teg_pat_log_"). Los
 * datos principales de sponsors caían al "Cache First" por defecto,
 * justo lo contrario de lo que dice el comentario de cabecera de este
 * archivo. Se corrige a /teg_pat/ (sin guión final) para cubrir tanto
 * teg_patrocinadores_v1* como teg_pat_log_*.
 *
 * Se añade teg_scenario para que los escenarios de presupuesto
 * (teg_scenarios_v1 / teg_scenario_active_name) sigan la misma regla de
 * "presupuesto nunca se cachea" que el resto del módulo.
 */
export const NETWORK_ONLY_PATTERNS: RegExp[] = [
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
