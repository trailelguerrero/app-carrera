/**
 * DATA SERVICE — Capa de abstracción para persistencia.
 * 
 * ACTUAL: localStorage
 * FUTURO: Neon PostgreSQL via API REST (Vercel)
 * 
 * Para migrar a Neon:
 * 1. Cambiar el adapter de 'localStorage' a 'api'
 * 2. Configurar API_BASE_URL
 * 3. Los bloques no necesitan cambios — usan este servicio
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const ADAPTER = 'api'; // 'localStorage' | 'api'
// SEC-01 fix: el frontend llama al BFF proxy (/api/proxy/*) que inyecta API_KEY
// server-side. Nunca se expone la key en el bundle del cliente.
const API_BASE_URL = '/api/proxy';

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
const apiAdapter = {
  async get(collection, defaultValue = null) {
    // Si hay escritura pendiente, usar local
    if (saveTimeouts.has(collection)) {
      return localAdapter.get(collection, defaultValue);
    }

    const lastSave  = parseInt(localStorage.getItem(`__last_save_${collection}`) || '0');
    const lastFetch = parseInt(localStorage.getItem(`__last_fetch_${collection}`) || '0');
    const localData = await localAdapter.get(collection, null);
    const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 horas — app monousuario, datos estables
    const SESSION_KEY = `__session_loaded_${collection}`;
    const sessionLoaded = sessionStorage.getItem(SESSION_KEY) === '1';

    // Usar caché local si:
    // 1. Se guardó hace menos de 5 min (datos propios, frescos)
    // 2. Se fetcheó hace menos de 5 min (datos de Neon, frescos)
    // 3. Hay escritura reciente (< 2s)
    // Si hay dato local y no hay registro de fetch, asumir dato reciente (evita GET innecesario)
    const cacheValida = localData !== null && (
      sessionLoaded || // Ya se cargó en esta sesión de navegador
      (Date.now() - lastSave  < CACHE_TTL) ||
      (Date.now() - lastFetch < CACHE_TTL) ||
      (Date.now() - lastSave  < 2000) ||
      (lastFetch === 0 && lastSave > 0) // dato guardado por el usuario, sin fetch previo
    );

    if (cacheValida) return localData;

    try {
      const res = await fetch(`${API_BASE_URL}/data/${collection}`, {
        headers: { 'Content-Type': 'application/json' }
        // SEC-01: sin x-api-key — el proxy BFF lo inyecta server-side
      });
      if (!res.ok) return localData ?? defaultValue;
      const response = await res.json();
      // MISSING-02: unwrap versioned response { data, version } or raw data (legacy)
      const data = response?.data !== undefined ? response.data : response;
      const version = response?.version;
      if (saveTimeouts.has(collection)) return localAdapter.get(collection, defaultValue);
      await localAdapter.set(collection, data);
      localStorage.setItem(`__last_fetch_${collection}`, Date.now().toString());
      if (version !== undefined) {
        localStorage.setItem(`__version_${collection}`, String(version));
      }
      sessionStorage.setItem(SESSION_KEY, '1');
      return data;
    } catch {
      return localData ?? defaultValue;
    }
  },

  async set(collection, data) {
    // Actualización optimista inmediata en local
    await localAdapter.set(collection, data);

    // Debounce de la llamada a la API
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
          // SEC-01: sin VITE_API_KEY — la key la inyecta el proxy BFF server-side
          const res = await fetch(`${API_BASE_URL}/data/${collection}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              // x-api-key eliminado del cliente (SEC-01)
            },
            body: JSON.stringify(data),
          });
          if (res.status === 409) {
            // MISSING-02: conflict — otro dispositivo guardó cambios más recientes
            const conflictData = await res.json().catch(() => ({}));
            window.dispatchEvent(new CustomEvent('teg-conflict', {
              detail: { collection, serverVersion: conflictData.serverVersion, message: conflictData.message }
            }));
            resolve({ success: false, conflict: true, serverVersion: conflictData.serverVersion });
            return;
          }
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          
          // MISSING-02: actualizar versión local desde la respuesta del servidor
          try {
            const resData = await res.json();
            if (resData?.version !== undefined) {
              localStorage.setItem(`__version_${collection}`, String(resData.version));
            }
          } catch { /* ignore */ }
          
          // Marcar éxito y timestamp
          localStorage.setItem(`__last_save_${collection}`, Date.now().toString());
          window.dispatchEvent(new CustomEvent('teg-save-status', { detail: { status: 'saved' } }));
          resolve({ success: true });
        } catch (e) {
          console.error(`[dataService] Error guardando "${collection}":`, e.message);
          window.dispatchEvent(new CustomEvent('teg-save-status', { detail: { status: 'error' } }));
          await localAdapter.set(`__pending_sync_${collection}`, Date.now());
          resolve({ success: true, offline: true });
        }
      }, 2000); // debounce de 2s — reduce tráfico a la DB

      saveTimeouts.set(collection, timeoutId);
    });
  },

  async remove(collection) {
    await localAdapter.remove(collection);
    try {
      await fetch(`${API_BASE_URL}/data/${collection}`, { 
        method: 'DELETE',
        // SEC-01: sin x-api-key — el proxy BFF lo inyecta server-side
      });
    } catch {}
    return { success: true };
  },

  async getMultiple(keys) {
    const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 horas

    // Comprobar si todos los keys tienen caché válida
    const allCached = await Promise.all(
      Object.keys(keys).map(async k => {
        const lastFetch = parseInt(localStorage.getItem(`__last_fetch_${k}`) || '0');
        const lastSave  = parseInt(localStorage.getItem(`__last_save_${k}`)  || '0');
        const local     = await localAdapter.get(k, null);
        return local !== null && (
          Date.now() - lastFetch < CACHE_TTL ||
          Date.now() - lastSave  < CACHE_TTL
        );
      })
    );

    // Si todos en caché, no ir a Neon
    if (allCached.every(Boolean)) {
      return localAdapter.getMultiple(keys);
    }

    try {
      const params = new URLSearchParams({ keys: Object.keys(keys).join(',') });
      const res = await fetch(`${API_BASE_URL}/data/batch?${params}`, {
        // SEC-01: sin x-api-key — el proxy BFF lo inyecta server-side
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const now = Date.now().toString();
      const result = {};
      for (const [key, defaultValue] of Object.entries(keys)) {
        result[key] = data[key] !== undefined ? data[key] : defaultValue;
        if (data[key] !== undefined) {
          await localAdapter.set(key, data[key]);
          localStorage.setItem(`__last_fetch_${key}`, now);
        }
      }
      return result;
    } catch {
      return localAdapter.getMultiple(keys);
    }
  },

  async setMultiple(entries) {
    // Actualización optimista
    await localAdapter.setMultiple(entries);

    // BUG-DS-02 fix: clave única por llamada — la clave compartida 'batch' causaba
    // que el segundo módulo cancelara los datos del primero en guardados simultáneos
    const collection = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
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
            headers: { 
              'Content-Type': 'application/json',
              // SEC-01: sin x-api-key — el proxy BFF lo inyecta server-side
            },
            body: JSON.stringify(entries),
          });
          if (!res.ok) throw new Error();
          
          // Marcar éxito para todas las entradas
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
  setMultiple: (entries) => adapter.setMultiple(entries),

  /**
   * Notificar a otros bloques que los datos han cambiado
   */
  notify: () => {
    window.dispatchEvent(new Event('teg-sync'));
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
};

export default dataService;

// ── T4.1 — Sincronización offline: cola de reintentos ─────────────────────────
// Cuando la conexión se recupera, reintenta sincronizar todas las colecciones
// que fallaron y quedaron marcadas con __pending_sync_* en localStorage.
// Implementa MISSING-01: el banner "sin conexión" ya no miente.
if (typeof window !== 'undefined' && ADAPTER === 'api') {
  const syncPendingQueue = async () => {
    // Paso 3 fix: solo reintentar pendientes — el mecanismo de retry ya está en cada
    // módulo via useData + teg-sync. Aquí solo limpiamos marcas obsoletas y notificamos.
    // NOTA: el reintento real con API key se hace cuando el módulo vuelve a guardar;
    // intentar PUT con x-api-key vacío desde el cliente siempre daría 401.
    const pendingKeys = Object.keys(localStorage)
      .filter(k => k.startsWith('__pending_sync_'));
    if (pendingKeys.length === 0) return;

    console.log(`[dataService] Conexión recuperada — ${pendingKeys.length} colección(es) pendiente(s) detectadas`);
    window.dispatchEvent(new CustomEvent('teg-save-status', { detail: { status: 'saving' } }));

    let synced = 0;
    for (const pendingKey of pendingKeys) {
      const collection = pendingKey.replace('__pending_sync_', '');
      try {
        const raw = localStorage.getItem(collection);
        if (!raw) { localStorage.removeItem(pendingKey); continue; }
        const data = JSON.parse(raw);
        // SEC-01: el reintento va al proxy BFF — sin x-api-key en el cliente
        // El proxy inyecta API_KEY server-side, nunca expuesto en el bundle
        const res = await fetch(`${API_BASE_URL}/data/${collection}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          localStorage.removeItem(pendingKey);
          localStorage.setItem(`__last_save_${collection}`, Date.now().toString());
          synced++;
        }
      } catch { /* seguir con la siguiente */ }
    }

    window.dispatchEvent(new CustomEvent('teg-save-status', { detail: { status: synced > 0 ? 'saved' : 'error' } }));
    if (synced > 0) {
      console.log(`[dataService] Sincronizadas ${synced} colección(es) pendiente(s)`);
      dataService.notify();
    }
  };

  window.addEventListener('online', () => {
    // Pequeño delay para asegurar conectividad real
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
      } catch {}
    });
    return () => { mounted = false; unsubscribe(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

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
