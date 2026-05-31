/**
 * DATA SERVICE — Capa de abstracción para persistencia.
 *
 * Adapter seleccionado vía variable de entorno VITE_ADAPTER:
 *   VITE_ADAPTER=localStorage  → almacenamiento local (offline/dev)
 *   VITE_ADAPTER=api           → Neon PostgreSQL via Vercel (producción)
 *
 * Si VITE_ADAPTER no está definida, el fallback es 'api'.
 * Cambia el adapter en .env.local o en las variables de entorno de Vercel
 * sin necesidad de modificar el código fuente.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ENV-02 fix: adapter configurable via variable de entorno — sin hardcode
const ADAPTER = import.meta.env.VITE_ADAPTER ?? 'api'; // 'localStorage' | 'api'
// SEC-01 fix: el frontend llama al BFF proxy (/api/proxy/*) que inyecta API_KEY
// server-side. Nunca se expone la key en el bundle del cliente.
const API_BASE_URL = '/api/proxy';

// SEC-AUTHZ (Mejora 2): cuando el proxy devuelve 401 (sesión expirada o cookie
// borrada), notificamos una sola vez al UI para que re-muestre el PinScreen.
// El debounce de 800ms absorbe ráfagas de fetches concurrentes que fallen al mismo tiempo.
let _sessionExpiredTimer = null;
function notifySessionExpired() {
  if (_sessionExpiredTimer) return; // ya avisado, esperar al handler de UI
  _sessionExpiredTimer = setTimeout(() => {
    _sessionExpiredTimer = null;
    window.dispatchEvent(new CustomEvent('teg-session-expired'));
  }, 800);
}

// ─── LOCAL STORAGE ADAPTER ──────────────────────────────────────────────────
const localAdapter = {
  async get(collection, defaultValue = null) {
    try {
      const raw = localStorage.getItem(collection);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  async set(collection, data) {
    try {
      localStorage.setItem(collection, JSON.stringify(data));
      return { success: true };
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        throw new Error('STORAGE_FULL');
      }
      throw e;
    }
  },

  async remove(collection) {
    localStorage.removeItem(collection);
    return { success: true };
  },

  async getMultiple(keys) {
    const result = {};
    for (const [key, defaultValue] of Object.entries(keys)) {
      result[key] = await this.get(key, defaultValue);
    }
    return result;
  },

  async setMultiple(entries) {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value);
    }
    return { success: true };
  },
};

const saveTimeouts = new Map();
const savePromises = new Map();

// ─── API ADAPTER (para Vercel + Neon) ───────────────────────────────────────
// PRINCIPIO: Neon es la única fuente de verdad para datos de negocio.
// localStorage se usa SOLO como:
//   1. Fallback offline (si Neon no responde)
//   2. Escritura optimista durante el debounce de 2s antes del PUT a Neon
// NUNCA se sirven datos de localStorage cuando Neon está accesible.
const apiAdapter = {
  async get(collection, defaultValue = null) {
    // Si hay escritura pendiente (debounce activo), devolver el dato local optimista
    // para que el usuario vea sus cambios inmediatamente mientras se envía a Neon.
    if (saveTimeouts.has(collection)) {
      return localAdapter.get(collection, defaultValue);
    }

    // Siempre intentar Neon primero — es la única fuente de verdad.
    try {
      const res = await fetch(`${API_BASE_URL}/data/${collection}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        if (res.status === 401) notifySessionExpired();
        throw new Error(`API error: ${res.status}`);
      }
      const response = await res.json();
      // Unwrap versioned response { data, version } o raw data (legado)
      const data = response?.data !== undefined ? response.data : response;
      const version = response?.version;
      // Actualizar caché local con el dato fresco de Neon (para uso offline)
      await localAdapter.set(collection, data);
      localStorage.setItem(`__last_fetch_${collection}`, Date.now().toString());
      if (version !== undefined) {
        localStorage.setItem(`__version_${collection}`, String(version));
      }
      return data;
    } catch {
      // Neon no accesible → fallback al dato local si existe
      const localData = await localAdapter.get(collection, null);
      return localData ?? defaultValue;
    }
  },

  async set(collection, data) {
    // Escritura optimista inmediata en local (el usuario ve sus cambios sin esperar)
    await localAdapter.set(collection, data);
    // FIX: Registrar timestamp de última escritura para que useData
    // no sobreescriba con datos de Neon durante la ventana de sincronización.
    localStorage.setItem(`__last_write_${collection}`, Date.now().toString());

    // Debounce del PUT a Neon (evita saturar la BD con cada keystroke)
    return new Promise((resolve) => {
      if (saveTimeouts.has(collection)) {
        clearTimeout(saveTimeouts.get(collection));
        const prevResolve = savePromises.get(collection);
        if (prevResolve) prevResolve({ success: true, superseded: true });
      }

      savePromises.set(collection, resolve);

      const timeoutId = setTimeout(async () => {
        saveTimeouts.delete(collection);
        savePromises.delete(collection);
        // MEJORA-03: 2 reintentos rápidos (300ms, 600ms) antes de marcar offline.
        // Absorbe fallos de red transitorios sin esperar al próximo evento 'online'.
        let lastFetchErr = null;
        let res = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, 300 * attempt));
          try {
            res = await fetch(`${API_BASE_URL}/data/${collection}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            lastFetchErr = null;
            break;
          } catch (fetchErr) {
            lastFetchErr = fetchErr;
          }
        }

        try {
          if (lastFetchErr) throw lastFetchErr;

          // MISSING-02: detección de conflictos entre dispositivos — emite teg-conflict con datos del servidor
          if (res.status === 409) {
            const conflictData = await res.json().catch(() => ({}));
            window.dispatchEvent(new CustomEvent('teg-conflict', {
              detail: {
                collection,
                localData: data,
                serverVersion: conflictData.serverVersion,
                message: conflictData.message,
                context: 'Guardado automático',
              }
            }));
            resolve({ success: false, conflict: true, serverVersion: conflictData.serverVersion });
            return;
          }
          if (!res.ok) {
            if (res.status === 401) notifySessionExpired();
            throw new Error(`API error: ${res.status}`);
          }
          
          // Actualizar versión local desde respuesta del servidor
          try {
            const resData = await res.json();
            if (resData?.version !== undefined) {
              localStorage.setItem(`__version_${collection}`, String(resData.version));
            }
          } catch { /* ignorar */ }
          
          localStorage.setItem(`__last_save_${collection}`, Date.now().toString());
          window.dispatchEvent(new CustomEvent('teg-save-status', { detail: { status: 'saved' } }));
          resolve({ success: true });
        } catch (e) {
          console.error(`[dataService] Error guardando "${collection}" en Neon:`, e.message);
          window.dispatchEvent(new CustomEvent('teg-save-status', { detail: { status: 'error' } }));
          // Marcar como pendiente para reintento cuando vuelva la conexión
          await localAdapter.set(`__pending_sync_${collection}`, Date.now());
          resolve({ success: true, offline: true });
        }
      }, 300); // debounce 300ms — reducido de 2s para persistencia más rápida

      saveTimeouts.set(collection, timeoutId);
    });
  },

  async remove(collection) {
    await localAdapter.remove(collection);
    try {
      await fetch(`${API_BASE_URL}/data/${collection}`, { method: 'DELETE' });
    } catch { /* ignorar errores DELETE */ }
    return { success: true };
  },

  async getMultiple(keys) {
    // Construir lista de colecciones que tienen escritura pendiente
    const pendingCollections = new Set(
      Object.keys(keys).filter(k => saveTimeouts.has(k))
    );

    // Si todas tienen escritura pendiente, usar local (datos optimistas frescos)
    if (pendingCollections.size === Object.keys(keys).length) {
      return localAdapter.getMultiple(keys);
    }

    // Intentar batch GET desde Neon para todas las claves
    try {
      const params = new URLSearchParams({ keys: Object.keys(keys).join(',') });
      const res = await fetch(`${API_BASE_URL}/data/batch?${params}`);
      if (!res.ok) {
        if (res.status === 401) notifySessionExpired();
        throw new Error();
      }
      const data = await res.json();
      const now = Date.now().toString();
      const result = {};
      for (const [key, defaultValue] of Object.entries(keys)) {
        if (pendingCollections.has(key)) {
          // Para claves con escritura pendiente, usar el dato local optimista
          result[key] = await localAdapter.get(key, defaultValue);
        } else {
          result[key] = data[key] !== undefined ? data[key] : defaultValue;
          if (data[key] !== undefined) {
            // Actualizar caché local con el dato fresco de Neon
            await localAdapter.set(key, data[key]);
            localStorage.setItem(`__last_fetch_${key}`, now);
          }
        }
      }
      return result;
    } catch {
      // Neon no accesible → fallback completo a localStorage
      return localAdapter.getMultiple(keys);
    }
  },

  async setMultiple(entries, batchKey = null) {
    // Escritura optimista en local
    await localAdapter.setMultiple(entries);

    const collection = batchKey ?? `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    return new Promise((resolve) => {
      if (saveTimeouts.has(collection)) {
        clearTimeout(saveTimeouts.get(collection));
        const prevResolve = savePromises.get(collection);
        if (prevResolve) prevResolve({ success: true, superseded: true });
      }

      savePromises.set(collection, resolve);

      const timeoutId = setTimeout(async () => {
        saveTimeouts.delete(collection);
        savePromises.delete(collection);
        try {
          const res = await fetch(`${API_BASE_URL}/data/batch`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entries),
          });
          if (!res.ok) throw new Error();
          const now = Date.now().toString();
          Object.keys(entries).forEach(k => localStorage.setItem(`__last_save_${k}`, now));
          resolve({ success: true });
        } catch {
          resolve({ success: true, offline: true });
        }
      }, 1000);

      saveTimeouts.set(collection, timeoutId);
    });
  },
};


// ─── SERVICIO PÚBLICO ───────────────────────────────────────────────────────
const adapter = ADAPTER === 'api' ? apiAdapter : localAdapter;

const dataService = {
  /**
   * Obtener datos de una colección
   * @param {string} key - Clave de la colección (e.g. "teg_voluntarios_v1_puestos")
   * @param {*} defaultValue - Valor por defecto si no existe
   */
  get: (key, defaultValue) => adapter.get(key, defaultValue),

  /**
   * Guardar datos en una colección
   * @param {string} key - Clave
   * @param {*} data - Datos a guardar
   */
  set: (key, data) => adapter.set(key, data),

  /**
   * Eliminar una colección
   */
  remove: (key) => adapter.remove(key),

  /**
   * Leer múltiples colecciones a la vez (batch)
   * @param {Object} keys - { key1: defaultValue1, key2: defaultValue2, ... }
   */
  getMultiple: (keys) => adapter.getMultiple(keys),

  /**
   * Guardar múltiples colecciones a la vez (batch)
   * @param {Object} entries - { key1: data1, key2: data2, ... }
   */
  setMultiple: (entries, batchKey) => adapter.setMultiple(entries, batchKey),

  /**
   * Notificar a otros bloques que los datos han cambiado.
   * Mejora 3: emite evento tipado al store Zustand (que a su vez sigue
   * disparando teg-sync en window para compatibilidad con código legacy).
   *
   * @param {string} [module] — módulo que notifica (ej: 'voluntarios')
   */
  notify: (module) => {
    // Importación dinámica para evitar circular dependency en tests
    import('@/store/useAppStore').then(({ useAppStore }) => {
      const { emitFromModule, emitEvent, EVENT_TYPES } = useAppStore.getState();
      if (module) {
        emitFromModule(module);
      } else {
        // Sin módulo: DATA_SYNC genérico (sigue emitiendo teg-sync via el slice)
        emitEvent(EVENT_TYPES.DATA_SYNC, 'unknown');
      }
    }).catch(() => {
      // Fallback si el store no está disponible (ej: tests sin Zustand)
      window.dispatchEvent(new CustomEvent('teg-sync', { detail: {} }));
    });
  },

  /**
   * Escuchar cambios de otros bloques
   * @param {Function} callback
   * @returns {Function} unsubscribe
   */
  onChange: (callback) => {
    // Escuchar tanto 'storage' (otras pestañas) como 'teg-sync' (mismo tab, otro bloque)
    // teg-sync se dispara cuando un bloque llama dataService.notify()
    // Necesario para que rawPats en useBudgetLogic se actualice cuando Patrocinadores guarda
    const handler = () => callback();
    window.addEventListener('storage', handler);
    window.addEventListener('teg-sync', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('teg-sync', handler);
    };
  },

  /** Info del adapter actual */
  getAdapterInfo: () => ({
    type: ADAPTER,
    apiUrl: ADAPTER === 'api' ? API_BASE_URL : null,
  }),

  /**
   * Indica si hay una escritura pendiente (debounce activo) para una clave.
   * Usado por useData para evitar sobreescribir estado optimista con datos de Neon.
   * @param {string} key
   * @returns {boolean}
   */
  hasPendingWrite: (key) => saveTimeouts.has(key),
};

export default dataService;

// ── Mejora 6 — Sincronización offline con backoff exponencial ────────────────
// Cuando la conexión se recupera, reintenta sincronizar todas las colecciones
// que fallaron y quedaron marcadas con __pending_sync_* en localStorage.
// Cada colección que falla se reintenta hasta MAX_ATTEMPTS veces con delays
// crecientes: 1s → 2s → 4s → 8s → 16s (backoff exponencial).
// Si todos los intentos fallan, la marca se conserva para el próximo 'online'.

if (typeof window !== 'undefined' && ADAPTER === 'api') {

  /**
   * Reintenta una función async con backoff exponencial.
   * @param {Function} fn            — función async que lanza si falla
   * @param {number}   maxAttempts   — número máximo de intentos (default 5)
   * @param {number}   baseDelayMs   — delay base en ms (default 1000)
   * @returns {Promise<boolean>}     — true si tuvo éxito, false si agotó intentos
   */
  const retryWithBackoff = async (fn, maxAttempts = 5, baseDelayMs = 1000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await fn();
        return true;
      } catch (err) {
        if (attempt === maxAttempts) {
          console.warn(`[dataService] Retry agotado tras ${maxAttempts} intentos:`, err?.message);
          return false;
        }
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s, 16s
        console.log(`[dataService] Reintento ${attempt}/${maxAttempts} en ${delay}ms…`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    return false;
  };

  const syncPendingQueue = async () => {
    const pendingKeys = Object.keys(localStorage)
      .filter(k => k.startsWith('__pending_sync_'));
    if (pendingKeys.length === 0) return;

    console.log(`[dataService] Conexión recuperada — ${pendingKeys.length} colección(es) pendiente(s)`);

    // Emitir estado con conteo para usePendingSync
    window.dispatchEvent(new CustomEvent('teg-save-status', {
      detail: { status: 'saving', count: pendingKeys.length }
    }));

    let synced = 0;
    for (const pendingKey of pendingKeys) {
      const collection = pendingKey.replace('__pending_sync_', '');

      const raw = localStorage.getItem(collection);
      if (!raw) {
        localStorage.removeItem(pendingKey);
        continue;
      }

      let data;
      try { data = JSON.parse(raw); }
      catch { localStorage.removeItem(pendingKey); continue; }

      // SEC-01: el reintento va al proxy BFF — la API key la inyecta el proxy server-side
      const success = await retryWithBackoff(async () => {
        const res = await fetch(`${API_BASE_URL}/data/${collection}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          if (res.status === 401) { notifySessionExpired(); throw new Error('session_expired'); }
          throw new Error(`HTTP ${res.status}`);
        }
        // Actualizar versión local desde respuesta
        try {
          const resData = await res.json();
          if (resData?.version !== undefined) {
            localStorage.setItem(`__version_${collection}`, String(resData.version));
          }
        } catch { /* ignorar — datos ya guardados */ }
      });

      if (success) {
        localStorage.removeItem(pendingKey);
        localStorage.setItem(`__last_save_${collection}`, Date.now().toString());
        synced++;
      }
      // Si falla, __pending_sync_ se conserva → próximo 'online' lo reintentará
    }

    const remaining = Object.keys(localStorage).filter(k => k.startsWith('__pending_sync_')).length;
    window.dispatchEvent(new CustomEvent('teg-save-status', {
      detail: {
        status: synced > 0 ? 'saved' : 'error',
        count: remaining,
      }
    }));

    if (synced > 0) {
      console.log(`[dataService] Sincronizadas ${synced} colección(es). Pendientes restantes: ${remaining}`);
      // dataService.notify() → emite teg-sync para que los módulos recarguen sus datos
      dataService.notify();
    }
  };

  window.addEventListener('online', () => {
    // Pequeño delay para asegurar conectividad real antes de reintentar
    setTimeout(syncPendingQueue, 1500);
  });
}
export { dataService };

// ── Compatibilidad ARQ-04: shims locales (sin re-export circular) ──────────────
// IMPORTANTE: NO importar '@/hooks/useData' aquí — crearía un ciclo:
//   dataService → useData → dataService
// En su lugar definimos versiones mínimas que delegan en la instancia local.
// La fuente canónica con lógica completa sigue siendo hooks/useData.js.

const _ADAPTER = dataService.getAdapterInfo().type;

/** Shim de compatibilidad — idéntico en comportamiento a hooks/useData#useData */
export function useData(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed !== null ? parsed : defaultValue;
    } catch { return defaultValue; }
  });

  const stateRef = useRef(state);
  stateRef.current = state;
  const [isLoading, setIsLoading] = useState(_ADAPTER === 'api');

  useEffect(() => {
    let mounted = true;
    if (_ADAPTER === 'api') {
      dataService.get(key, defaultValue)
        .then(apiData => {
          if (mounted) {
            setState(prev => JSON.stringify(prev) !== JSON.stringify(apiData) ? apiData : prev);
            setIsLoading(false);
          }
        })
        .catch(() => { if (mounted) setIsLoading(false); });
    } else {
      setIsLoading(false);
    }
    const unsubscribe = dataService.onChange(() => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          setState(prev => JSON.stringify(prev) !== raw ? parsed : prev);
        }
      } catch { /* ignore parse errors */ }
    });
    return () => { mounted = false; unsubscribe(); };
  // `defaultValue` se omite intencionalmente del array de dependencias.
  // Si el caller pasa un literal objeto/array, sería una nueva referencia
  // en cada render y provocaría un bucle infinito. Se usa [key] como única dep.
  // Para la versión canónica con useRef ver hooks/useData.js.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback((value, opts = {}) => {
    try {
      const v = value instanceof Function ? value(stateRef.current) : value;
      if (opts.force || JSON.stringify(stateRef.current) !== JSON.stringify(v)) {
        stateRef.current = v;
        setState(v);
        dataService.set(key, v);
      }
    } catch (e) { console.error(e); }
  }, [key]);

  return [state, setValue, isLoading];
}

/** Shim de compatibilidad — idéntico en comportamiento a hooks/useData#saveAll */
export async function saveAll(entries) {
  const result = await dataService.setMultiple(entries);
  dataService.notify();
  return result;
}
