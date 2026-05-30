/**
 * dataService.ts — D3: capa de tipos TypeScript sobre dataService.js
 *
 * Envuelve el dataService.js con tipos genéricos para que los llamadores
 * .tsx reciban inferencia de tipo completa y los errores de clave se detecten
 * en compilación, no en runtime.
 *
 * La implementación real sigue siendo dataService.js.
 * Este archivo solo añade tipos encima — cero cambio de comportamiento.
 *
 * Importar desde aquí en código nuevo (.ts/.tsx):
 *   import dataService from '@/lib/dataService';
 *   // key debe ser StorageKey → typo = error de compilación
 *
 * Los importadores .js existentes siguen funcionando sin cambios.
 */

import type { StorageKey } from '@/constants/storageKeys';

// Importar la implementación JS real
import _dataService from './dataService.js';

/** Resultado de una operación de guardado */
export interface SaveResult {
  success: boolean;
  offline?: boolean;
  superseded?: boolean;
  conflict?: boolean;
  serverVersion?: number;
}

/** Info del adapter activo */
export interface AdapterInfo {
  type: 'api' | 'localStorage';
  apiUrl: string | null;
}

/**
 * Interfaz tipada del dataService.
 * Usa genérico <T> en get/getMultiple para inferencia del tipo de dato.
 */
export interface TypedDataService {
  /**
   * Obtener datos de una colección.
   * @param key          Clave de colección — debe ser StorageKey (error de compilación si no)
   * @param defaultValue Valor por defecto si no existe
   */
  get<T>(key: StorageKey, defaultValue: T): Promise<T>;
  get<T>(key: StorageKey, defaultValue?: T): Promise<T | null>;

  /**
   * Guardar datos en una colección.
   * @param key  Clave de colección — debe ser StorageKey
   * @param data Datos a guardar (cualquier valor serializable a JSON)
   */
  set(key: StorageKey, data: unknown): Promise<SaveResult>;

  /** Eliminar una colección */
  remove(key: StorageKey): Promise<SaveResult>;

  /**
   * Leer múltiples colecciones en un solo batch.
   * @param keys Objeto { clave: valorPorDefecto }
   */
  getMultiple<T extends Record<StorageKey, unknown>>(
    keys: Partial<T>
  ): Promise<Partial<T>>;

  /**
   * Guardar múltiples colecciones en un solo batch.
   * @param entries  Objeto { clave: dato }
   * @param batchKey Clave interna para el debounce (opcional)
   */
  setMultiple(
    entries: Partial<Record<StorageKey, unknown>>,
    batchKey?: string
  ): Promise<SaveResult>;

  /**
   * Emitir evento de datos cambiados hacia otros módulos.
   * @param module Nombre del módulo que notifica (opcional)
   */
  notify(module?: string): void;

  /**
   * Suscribirse a cambios de otros módulos o pestañas.
   * @returns Función de cancelación de suscripción
   */
  onChange(callback: () => void): () => void;

  /** Información del adapter activo */
  getAdapterInfo(): AdapterInfo;

  /**
   * ¿Hay escritura pendiente (debounce activo) para esta clave?
   * Usado por useData para evitar sobreescribir estado optimista.
   */
  hasPendingWrite(key: StorageKey): boolean;
}

/**
 * dataService tipado.
 *
 * Se castea la instancia JS al interface tipado — la implementación real
 * no cambia, solo añadimos comprobación de tipos en los llamadores TS.
 */
const dataService = _dataService as unknown as TypedDataService;

export default dataService;
