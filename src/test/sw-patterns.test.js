/**
 * sw-patterns.test.js — TEST-01
 *
 * Verifica que los patrones del Service Worker (swPatterns.js) coinciden
 * con las claves reales de storageKeys.js.
 *
 * Si alguien cambia una clave en storageKeys.js sin actualizar swPatterns.js,
 * este test falla antes de llegar a producción, evitando que el portal
 * de voluntarios deje de funcionar offline el día del evento.
 */
import { describe, it, expect } from 'vitest';
import {
  STALE_WHILE_REVALIDATE_PATTERNS,
  NETWORK_ONLY_PATTERNS,
  NETWORK_FIRST_PATTERNS,
  PRECACHE_URLS,
} from '@/constants/swPatterns';
import {
  SK_VOL_VOLUNTARIOS,
  SK_VOL_PUESTOS,
  SK_LOG_MAT,
  SK_LOG_TL,
  SK_LOG_CK,
  SK_LOG_INC,
  SK_PPTO_CONCEPTOS,
} from '@/constants/storageKeys';

/** Construye la URL que el apiAdapter genera para una clave dada */
const apiUrl = (key) => `/api/proxy/data/${key}`;

describe('TEST-01 — Service Worker patterns vs storageKeys', () => {
  describe('Claves de voluntarios cubiertas por STALE', () => {
    it('SK_VOL_VOLUNTARIOS queda cubierta', () => {
      expect(STALE_WHILE_REVALIDATE_PATTERNS.some(p => p.test(apiUrl(SK_VOL_VOLUNTARIOS)))).toBe(true);
    });
    it('SK_VOL_PUESTOS queda cubierta', () => {
      expect(STALE_WHILE_REVALIDATE_PATTERNS.some(p => p.test(apiUrl(SK_VOL_PUESTOS)))).toBe(true);
    });
  });

  describe('Claves de logística cubiertas por STALE', () => {
    it('SK_LOG_MAT queda cubierta', () => {
      expect(STALE_WHILE_REVALIDATE_PATTERNS.some(p => p.test(apiUrl(SK_LOG_MAT)))).toBe(true);
    });
    it('SK_LOG_TL queda cubierta', () => {
      expect(STALE_WHILE_REVALIDATE_PATTERNS.some(p => p.test(apiUrl(SK_LOG_TL)))).toBe(true);
    });
    it('SK_LOG_CK queda cubierta', () => {
      expect(STALE_WHILE_REVALIDATE_PATTERNS.some(p => p.test(apiUrl(SK_LOG_CK)))).toBe(true);
    });
  });

  describe('Presupuesto en NETWORK_ONLY (nunca caché)', () => {
    it('SK_PPTO_CONCEPTOS está en NETWORK_ONLY', () => {
      expect(NETWORK_ONLY_PATTERNS.some(p => p.test(apiUrl(SK_PPTO_CONCEPTOS)))).toBe(true);
    });
    it('SK_PPTO_CONCEPTOS NO está en STALE', () => {
      expect(STALE_WHILE_REVALIDATE_PATTERNS.some(p => p.test(apiUrl(SK_PPTO_CONCEPTOS)))).toBe(false);
    });
  });

  describe('Sin solapamiento entre STALE y NETWORK_ONLY', () => {
    it('ninguna URL de voluntarios está en NETWORK_ONLY', () => {
      expect(NETWORK_ONLY_PATTERNS.some(p => p.test(apiUrl(SK_VOL_VOLUNTARIOS)))).toBe(false);
    });
    it('ninguna URL de logística está en NETWORK_ONLY', () => {
      expect(NETWORK_ONLY_PATTERNS.some(p => p.test(apiUrl(SK_LOG_MAT)))).toBe(false);
    });
  });

  // Mejora 10: NETWORK_FIRST_PATTERNS cubre las mismas rutas operativas
  describe('Mejora 10 — Network First cubre rutas operativas', () => {
    it('SK_VOL_VOLUNTARIOS cubierta por NETWORK_FIRST', () => {
      expect(NETWORK_FIRST_PATTERNS.some(p => p.test(apiUrl(SK_VOL_VOLUNTARIOS)))).toBe(true);
    });
    it('SK_LOG_MAT cubierta por NETWORK_FIRST', () => {
      expect(NETWORK_FIRST_PATTERNS.some(p => p.test(apiUrl(SK_LOG_MAT)))).toBe(true);
    });
    it('SK_LOG_INC cubierta por NETWORK_FIRST', () => {
      expect(NETWORK_FIRST_PATTERNS.some(p => p.test(apiUrl(SK_LOG_INC)))).toBe(true);
    });
    it('STALE alias = NETWORK_FIRST (backward compat)', () => {
      // Los tests antiguos siguen pasando porque STALE ahora apunta a NETWORK_FIRST
      expect(STALE_WHILE_REVALIDATE_PATTERNS).toBe(NETWORK_FIRST_PATTERNS);
    });
  });

  // PWA-11: PRECACHE_URLS contiene los recursos críticos para offline
  describe('PWA-11 — PRECACHE_URLS contiene recursos críticos', () => {
    it('offline.html está en PRECACHE_URLS', () => {
      expect(PRECACHE_URLS).toContain('/offline.html');
    });
    it('/ (index) está en PRECACHE_URLS', () => {
      expect(PRECACHE_URLS).toContain('/');
    });
    it('/voluntarios/mi-ficha está en PRECACHE_URLS', () => {
      expect(PRECACHE_URLS).toContain('/voluntarios/mi-ficha');
    });
    it('manifest.json está en PRECACHE_URLS', () => {
      expect(PRECACHE_URLS).toContain('/manifest.json');
    });
  });
});
