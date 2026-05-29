/**
 * useData.js — Hook React para sincronización con dataService.
 *
 * ARQ-04: La lógica de hook vive aquí (src/hooks/), no en src/lib/.
 * dataService.js es un módulo puro sin dependencias de React.
 *
 * IMPORTAR DESDE AQUÍ:
 *   import { useData, saveAll } from "@/hooks/useData";
 *
 * Los imports desde "@/lib/dataService" siguen funcionando vía shim
 * de compatibilidad hacia atrás (no rompe código existente).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import dataService from '@/lib/dataService';

const ADAPTER = dataService.getAdapterInfo().type;

/**
 * Hook para React — reemplaza useLS/useLocalStorage en los bloques.
 *
 * @param {string} key - Clave de la colección (e.g. "teg_voluntarios_v1_puestos")
 * @param {*} defaultValue - Valor por defecto si no existe
 * @returns {[any, Function, boolean]} [state, setValue, isLoading]
 */
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

    // Si usamos API, traemos la versión más reciente en background
    if (ADAPTER === 'api') {
      dataService.get(key, defaultValue).then(apiData => {
        if (mounted) {
          setState(prev => {
            // FIX: No sobreescribir si hay escritura pendiente (debounce activo).
            // El usuario acaba de guardar y el PUT a Neon aún no ha llegado —
            // Neon devolvería datos sin ese cambio, causando pérdida aparente del dato.
            if (dataService.hasPendingWrite(key)) return prev;
            // FIX: Tampoco sobreescribir si hubo escritura en los últimos 5s.
            // Protege el caso donde el debounce ya disparó pero Neon aún procesa
            // y el componente se remontó (navegar fuera y volver al bloque).
            const lastWrite = parseInt(localStorage.getItem(`__last_write_${key}`) || '0', 10);
            if (Date.now() - lastWrite < 5000) return prev;
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
      } catch { /* ignore parse errors from other tabs */ }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

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
 * @param {Object} entries - { key1: data1, key2: data2, ... }
 */
export async function saveAll(entries, batchKey) {
  const result = await dataService.setMultiple(entries, batchKey);
  dataService.notify();
  return result;
}
