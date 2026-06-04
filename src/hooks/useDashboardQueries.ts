/**
 * useDashboardQueries.ts — tipos sobre useDashboardQueries.js
 */
import {
  useDashboardQueries as _useDashboardQueries,
  dashboardKeys as _dashboardKeys,
} from './useDashboardQueries.js';

export interface ModuleStatus {
  isLoading: boolean;
  isError: boolean;
}

export interface UseDashboardQueriesReturn {
  rawData: Record<string, unknown>;
  loading: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  moduleStatus: Record<string, ModuleStatus>;
}

export function useDashboardQueries(): UseDashboardQueriesReturn {
  return _useDashboardQueries() as UseDashboardQueriesReturn;
}

// Re-export dashboardKeys con tipos
export const dashboardKeys = _dashboardKeys as {
  all: () => readonly unknown[];
  module: (mod: string) => readonly unknown[];
};
