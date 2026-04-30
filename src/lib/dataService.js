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

const ADAPTER = 'api'; // 'localStorage' | 'api'
const API_BASE_URL = '/api'; // Para cuando se despliegue en Vercel con Neon

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
        headers: { 'x-api-key': import.meta.env.VITE_API_KEY }
      });
      if (!res.ok) return localData ?? defaultValue;
      const data = await res.json();
      if (saveTimeouts.has(collection)) return localAdapter.get(collection, defaultValue);
      await localAdapter.set(collection, data);
      localStorage.setItem(`__last_fetch_${collection}`, Date.now().toString());
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
          const apiKey = import.meta.env.VITE_API_KEY;
          if (!apiKey) throw new Error('VITE_API_KEY no configurada en Vercel');

          const res = await fetch(`${API_BASE_URL}/data/${collection}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'x-api-key': apiKey
            },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          
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
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY
        }
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
        headers: { 'x-api-key': import.meta.env.VITE_API_KEY }
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

    // Debounce también para batch
    const collection = 'batch';
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
              'x-api-key': import.meta.env.VITE_API_KEY
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
    // Solo 'storage' (cambios desde otras pestañas) — NO teg-sync para evitar bucles
    // Los bloques se actualizan por setState inmediato en setValue; no necesitan releer
    const handler = () => callback();
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('storage', handler);
    };
  },

  /** Info del adapter actual */
  getAdapterInfo: () => ({
    type: ADAPTER,
    apiUrl: ADAPTER === 'api' ? API_BASE_URL : null,
  }),
};

export default dataService;
export { dataService };


/**
 * Hook para React — reemplaza useLS/useLocalStorage en los bloques.
 * 
 * USO:
 *   import { useData } from '@/lib/dataService';
 *   const [puestos, setPuestos] = useData('teg_voluntarios_v1_puestos', DEFAULTS);
 * 
 * Cuando se migre a API, este hook se encarga de todo automáticamente.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useData(key, defaultValue) {
  const [state, setState] = useState(() => {
    // Sync initial load (localStorage es síncrono)
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed !== null ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const stateRef = useRef(state);
  // Mantener stateRef sincronizado con el estado React en cada render
  stateRef.current = state;
  const [isLoading, setIsLoading] = useState(ADAPTER === 'api');

  useEffect(() => {
    let mounted = true;
    
    // Si usamos API, traemos la versión más reciente silenciada en background
    if (ADAPTER === 'api') {
      dataService.get(key, defaultValue).then(apiData => {
        if (mounted) {
          setState(prev => {
            const isDifferent = JSON.stringify(prev) !== JSON.stringify(apiData);
            if (isDifferent) {
              stateRef.current = apiData;
              return apiData;
            }
            return prev;
          });
          setIsLoading(false);
        }
      }).catch(() => {
        if (mounted) setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    // Suscribirse a cambios desde otros bloques o pestañas
    const unsubscribe = dataService.onChange(() => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          setState(prev => {
            // Solo actualizar si el dato es realmente diferente (evita loops infinitos)
            const currentRaw = JSON.stringify(prev);
            if (currentRaw !== raw) {
              stateRef.current = parsed;
              return parsed;
            }
            return prev;
          });
        }
      } catch {}
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [key]);

  const setValue = useCallback((value, opts = {}) => {
    try {
      const valueToStore = value instanceof Function ? value(stateRef.current) : value;

      // Permitir forzar el guardado aunque el valor parezca igual (necesario para eliminaciones)
      const hasChanged = opts.force || JSON.stringify(stateRef.current) !== JSON.stringify(valueToStore);

      if (hasChanged) {
        stateRef.current = valueToStore;
        setState(valueToStore);
        dataService.set(key, valueToStore);
        // NO llamar notify() aquí — cada setValue no debe triggear recarga del Dashboard
        // notify() solo se llama explícitamente cuando se quiere comunicar a otros bloques
      }
    } catch (e) {
      console.error(e);
    }
  }, [key]);

  return [state, setValue, isLoading];
}

/**
 * Guardar múltiples claves de una vez
 */
export async function saveAll(entries) {
  const result = await dataService.setMultiple(entries);
  dataService.notify();
  return result;
}
