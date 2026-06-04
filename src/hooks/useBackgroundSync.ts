/**
 * useBackgroundSync.ts — tipos sobre useBackgroundSync.js
 */
import { useBackgroundSync as _useBackgroundSync } from './useBackgroundSync.js';

export interface UseBackgroundSyncReturn {
  supported: boolean;
  registerSync: () => Promise<void>;
}

export function useBackgroundSync(): UseBackgroundSyncReturn {
  return _useBackgroundSync() as UseBackgroundSyncReturn;
}
