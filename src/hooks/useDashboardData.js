/**
 * useDashboardData.js — Mejora 5
 *
 * Wrapper de compatibilidad sobre useDashboardQueries.
 * Mantiene la firma exacta que espera Dashboard.jsx:
 *   { rawData, loading, isRefreshing, lastUpdated, loadData }
 *
 * `loadData` ahora invalida todas las queries del dashboard
 * en lugar de hacer un fetch monolítico.
 */
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardQueries, dashboardKeys } from "./useDashboardQueries";

export function useDashboardData(/* ALL_KEYS — ignorado, mantenido por compatibilidad */) {
  const queryClient = useQueryClient();
  const { rawData, loading, isRefreshing, lastUpdated, moduleStatus } =
    useDashboardQueries();

  // Invalidar todo el dashboard (equivalente al loadData(silent) anterior)
  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      // Refetch inmediato y visible (refresco manual)
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all() });
    } else {
      // Silencioso: invalida en background sin cambiar loading state
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all() });
    }
  }, [queryClient]);

  return { rawData, loading, isRefreshing, lastUpdated, loadData, moduleStatus };
}
