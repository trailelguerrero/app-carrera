/**
 * useData.ts — D3: capa de tipos TypeScript sobre useData.js
 *
 * Re-exporta useData y saveAll con genéricos tipados para que los
 * componentes .tsx reciban inferencia completa del tipo de dato y
 * error de compilación si usan una StorageKey incorrecta.
 *
 * La implementación real sigue siendo useData.js.
 *
 * Importar desde aquí en código nuevo (.ts/.tsx):
 *   import { useData, saveAll } from '@/hooks/useData';
 *
 * Los importadores .js existentes siguen funcionando sin cambios.
 */

import type { StorageKey } from '@/constants/storageKeys';

// Importar implementación real desde el .js
import {
  useData as _useData,
  saveAll as _saveAll,
} from './useData.js';

import type { SaveResult } from '@/lib/dataService';

/**
 * Hook para leer y escribir una colección de datos.
 *
 * @template T  Tipo del dato almacenado (inferido desde defaultValue)
 * @param key          Clave de colección — debe ser StorageKey
 * @param defaultValue Valor por defecto si no existe en BD/localStorage
 * @returns [estado, setEstado, isLoading]
 *
 * @example
 * const [voluntarios, setVoluntarios, loading] = useData<Voluntario[]>(
 *   SK_VOL_VOLUNTARIOS,
 *   []
 * );
 */
export function useData<T>(
  key: StorageKey,
  defaultValue: T
): [T, (value: T | ((prev: T) => T), opts?: { force?: boolean }) => void, boolean] {
  return (_useData as (key: string, defaultValue: T) => [T, (v: T | ((prev: T) => T), opts?: { force?: boolean }) => void, boolean])(key, defaultValue);
}

/**
 * Guardar múltiples colecciones en un solo batch y notificar cambios.
 *
 * @param entries Objeto { clave: dato } — las claves deben ser StorageKey
 * @returns Promesa con resultado del guardado
 *
 * @example
 * await saveAll({
 *   [SK_VOL_VOLUNTARIOS]: voluntariosActualizados,
 *   [SK_VOL_PUESTOS]: puestosActualizados,
 * });
 */
export async function saveAll(
  entries: Partial<Record<StorageKey, unknown>>
): Promise<SaveResult> {
  return (_saveAll as (entries: Record<string, unknown>) => Promise<SaveResult>)(
    entries as Record<string, unknown>
  );
}
