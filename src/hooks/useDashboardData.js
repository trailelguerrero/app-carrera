/**
 * useDashboardData.js — Tarea 3.4
 * Encapsula el fetching de datos del Dashboard.
 * Extrae rawData, loading, isRefreshing, lastUpdated y loadData
 * del componente Dashboard para que solo renderice.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import dataService from "@/lib/dataService";

export function useDashboardData(ALL_KEYS) {
  const [rawData, setRawData]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated]   = useState(null);
  const intervalRef                     = useRef(null);

  const loadData = useCallback(async (silent = false) => {
    // Carga optimista: usar localStorage inmediatamente para mostrar algo al usuario
    if (!silent) {
      try {
        const localData = {};
        let hasLocal = false;
        for (const [key, def] of Object.entries(ALL_KEYS)) {
          const raw = localStorage.getItem(key);
          if (raw) { localData[key] = JSON.parse(raw); hasLocal = true; }
          else localData[key] = def;
        }
        if (hasLocal) {
          setRawData(localData);
          setLoading(false);
        }
      } catch { /* localStorage no disponible — se continúa sin datos locales */ }
    }
    if (!silent) setLoading(prev => prev);
    else setIsRefreshing(true);
    try {
      const data = await dataService.getMultiple(ALL_KEYS);
      setRawData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard: error cargando datos", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [ALL_KEYS]);

  useEffect(() => {
    loadData();
    const intervalId = intervalRef.current;
    let lastSync = 0;
    const handler = () => {
      const now = Date.now();
      if (now - lastSync > 10000) {
        lastSync = now;
        loadData(true);
      }
    };
    window.addEventListener("teg-sync", handler);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("teg-sync", handler);
    };
  }, [loadData]);

  return { rawData, loading, isRefreshing, lastUpdated, loadData };
}
