/**
 * swPatterns.js — Patrones de caché del Service Worker
 *
 * Exportado como módulo ES para que tanto public/sw.js como los tests
 * de Vitest puedan importarlo. Esto garantiza que los patrones del SW
 * y las claves reales de storageKeys.js no se desincronicen silenciosamente.
 *
 * TEST-01: src/test/sw-patterns.test.js verifica que cada clave crítica
 * queda cubierta por algún patrón STALE y que presupuesto está en NETWORK_ONLY.
 */

/** Rutas servidas desde caché con actualización en background (Stale While Revalidate) */
export const STALE_WHILE_REVALIDATE_PATTERNS = [
  /\/api\/proxy\/data\/teg_voluntarios_/,  // SK_VOL_* — voluntarios y puestos (panel)
  /\/api\/proxy\/data\/teg_logistica_/,    // SK_LOG_* — logística completa
  /\/api\/proxy\/data\/teg_dia_/,          // día de carrera
];

/** Rutas que NUNCA se sirven desde caché (datos sensibles o de escritura) */
export const NETWORK_ONLY_PATTERNS = [
  /\/api\/voluntarios/,                    // portal del voluntario — datos personales en tiempo real
  /\/api\/proxy\/data\/teg_presupuesto/,   // SK_PPTO_* — datos financieros
  /\/api\/proxy\/data\/teg_pat_/,          // patrocinadores
  /\/api\/proxy\/budget/,                  // historial de presupuesto
  /\/api\/panel\/auth/,                    // autenticación del panel
  /\/api\/proxy\/documents/,               // documentos legales
  /\/api\/proxy\/docs/,                    // docs por patrocinador
  /\/api\/setup/,                          // inicialización de BD
];
