/**
 * usePendingSync.ts — tipos sobre usePendingSync.js
 */
import { usePendingSync as _usePendingSync } from './usePendingSync.js';

export interface UsePendingSyncReturn {
  pendingCount: number;
  isSyncing: boolean;
}

export function usePendingSync(): UsePendingSyncReturn {
  return _usePendingSync() as UsePendingSyncReturn;
}
