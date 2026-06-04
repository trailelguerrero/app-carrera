/**
 * useDashboardData.ts — tipos sobre useDashboardData.js
 */
import { useDashboardData as _useDashboardData } from './useDashboardData.js';

export interface UseDashboardDataReturn {
  rawData: Record<string, unknown>;
  loading: boolean;
  isRefreshing: boolean;
  lastUpdated: number | null;
  loadData: (silent?: boolean) => Promise<void>;
  moduleStatus: Record<string, unknown>;
}

export function useDashboardData(allKeys?: string[]): UseDashboardDataReturn {
  return _useDashboardData(allKeys) as UseDashboardDataReturn;
}
