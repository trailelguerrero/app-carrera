/**
 * useDashboardQueries.js — Mejora 5
 *
 * Queries independientes por módulo con TanStack Query.
 * Cada módulo tiene su propia caché: cuando cambia Voluntarios,
 * solo se invalida la query de Voluntarios — el resto permanece intacto.
 *
 * Integración con Zustand (Mejora 3):
 *   El hook escucha `lastEvent` del store y llama a
 *   queryClient.invalidateQueries({ queryKey: [...] }) solo para el
 *   módulo afectado → cero trabajo innecesario.
 */

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dataService from "@/lib/dataService";
import { useLastEvent } from "@/store/useAppStore";
import { EVENT_TYPES } from "@/store/useAppStore";
import { LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import {
  SK_PPTO_CONCEPTOS, SK_PPTO_TRAMOS, SK_PPTO_INSCRITOS, SK_PPTO_INGRESOS_EXTRA,
  SK_PPTO_MERCHANDISING, SK_PPTO_SYNC_CONFIG, SK_PPTO_MAXIMOS, SK_PPTO_SCENARIO_ACTIVE,
  SK_VOL_VOLUNTARIOS, SK_VOL_PUESTOS,
  SK_PAT_PATS, SK_PAT_OBJ,
  SK_LOG_MAT, SK_LOG_ASIG, SK_LOG_TL, SK_LOG_CK, SK_LOG_INC,
  SK_PROY_TAREAS, SK_PROY_HITOS,
  SK_DOC_DOCS, SK_DOC_GESTIONES,
  SK_CAM_PEDIDOS, SK_CAM_COSTE, SK_CAM_CORREDORES, SK_CAM_PRECIO_PLATAFORMA,
  SK_CAM_NINO, SK_CAM_VENTA_PUBLICO,
} from "@/constants/storageKeys";

// ── Query Key Factory ──────────────────────────────────────────────────────────
// Fuente única de verdad para las query keys. Usar siempre estas funciones
// al invalidar — evita errores por typos en strings dispersos.
export const dashboardKeys = {
  all:             () => ["dashboard"],
  presupuesto:     () => ["dashboard", "presupuesto"],
  voluntarios:     () => ["dashboard", "voluntarios"],
  logistica:       () => ["dashboard", "logistica"],
  proyecto:        () => ["dashboard", "proyecto"],
  patrocinadores:  () => ["dashboard", "patrocinadores"],
  documentos:      () => ["dashboard", "documentos"],
  config:          () => ["dashboard", "config"],
  camisetas:       () => ["dashboard", "camisetas"],
};

// ── Mapa evento Zustand → query keys a invalidar ──────────────────────────────
const EVENT_TO_KEYS = {
  [EVENT_TYPES.PRESUPUESTO_ACTUALIZADO]: [
    dashboardKeys.presupuesto(),
    dashboardKeys.camisetas(),
    dashboardKeys.config(),
  ],
  [EVENT_TYPES.VOLUNTARIO_ACTUALIZADO]: [
    dashboardKeys.voluntarios(),
    dashboardKeys.camisetas(), // voluntarios activos afectan cálculo camisetas
  ],
  [EVENT_TYPES.LOGISTICA_INCIDENCIA]: [
    dashboardKeys.logistica(),
  ],
  [EVENT_TYPES.PROYECTO_TAREA_CAMBIADA]: [
    dashboardKeys.proyecto(),
  ],
  [EVENT_TYPES.DOCUMENTO_ACTUALIZADO]: [
    dashboardKeys.documentos(),
  ],
  [EVENT_TYPES.CONFIGURACION_CAMBIADA]: [
    dashboardKeys.config(),
  ],
  [EVENT_TYPES.DIACARRERA_EVENTO]: [
    dashboardKeys.logistica(),
    dashboardKeys.proyecto(),
  ],
  // DATA_SYNC (fallback anónimo) → invalida todo el dashboard
  [EVENT_TYPES.DATA_SYNC]: [dashboardKeys.all()],
};

// ── Fetchers por módulo ───────────────────────────────────────────────────────

const fetchPresupuesto = () => dataService.getMultiple({
  [SK_PPTO_CONCEPTOS]:       [],
  [SK_PPTO_TRAMOS]:          [],
  [SK_PPTO_INSCRITOS]:       { tramos: {} },
  [SK_PPTO_INGRESOS_EXTRA]:  [],
  [SK_PPTO_MERCHANDISING]:   [],
  [SK_PPTO_SYNC_CONFIG]:     {},
  [SK_PPTO_MAXIMOS]:         {},
  [SK_PPTO_SCENARIO_ACTIVE]: null,
});

const fetchVoluntarios = () => dataService.getMultiple({
  [SK_VOL_VOLUNTARIOS]: [],
  [SK_VOL_PUESTOS]:     [],
});

const fetchLogistica = () => dataService.getMultiple({
  [SK_LOG_MAT]:  [],
  [SK_LOG_ASIG]: [],
  [SK_LOG_TL]:   [],
  [SK_LOG_CK]:   [],
  [SK_LOG_INC]:  [],
});

const fetchProyecto = () => dataService.getMultiple({
  [SK_PROY_TAREAS]: [],
  [SK_PROY_HITOS]:  [],
});

const fetchPatrocinadores = () => dataService.getMultiple({
  [SK_PAT_PATS]: [],
  [SK_PAT_OBJ]:  8000,
});

const fetchDocumentos = () => dataService.getMultiple({
  [SK_DOC_DOCS]:      [],
  [SK_DOC_GESTIONES]: [],
});

const fetchConfig = () => dataService.getMultiple({
  [LS_KEY_CONFIG]: EVENT_CONFIG_DEFAULT,
});

const fetchCamisetas = () => dataService.getMultiple({
  [SK_CAM_PEDIDOS]:           [],
  [SK_CAM_COSTE]:             null,
  [SK_CAM_CORREDORES]:        {},
  [SK_CAM_PRECIO_PLATAFORMA]: { precio: 0 },
  [SK_CAM_NINO]:              {},
  [SK_CAM_VENTA_PUBLICO]:     { precio: 0, cantidad: 0 },
});

// ── Hook principal ─────────────────────────────────────────────────────────────

/**
 * Devuelve:
 *   - rawData: objeto unificado compatible con useDashboardKpis (mismo contrato)
 *   - loading: true solo en la carga inicial (todas las queries en isPending)
 *   - isRefreshing: true si alguna query está refetcheando en background
 *   - lastUpdated: Date de la última actualización más reciente
 *   - moduleStatus: { presupuesto, voluntarios, ... } → { isLoading, isError }
 *     para loading granular por sección del Dashboard
 */
export function useDashboardQueries() {
  const queryClient = useQueryClient();
  const lastEvent   = useLastEvent();

  // ── Queries por módulo ───────────────────────────────────────────────────────
  const qPresupuesto    = useQuery({ queryKey: dashboardKeys.presupuesto(),    queryFn: fetchPresupuesto });
  const qVoluntarios    = useQuery({ queryKey: dashboardKeys.voluntarios(),    queryFn: fetchVoluntarios });
  const qLogistica      = useQuery({ queryKey: dashboardKeys.logistica(),      queryFn: fetchLogistica });
  const qProyecto       = useQuery({ queryKey: dashboardKeys.proyecto(),       queryFn: fetchProyecto });
  const qPatrocinadores = useQuery({ queryKey: dashboardKeys.patrocinadores(), queryFn: fetchPatrocinadores });
  const qDocumentos     = useQuery({ queryKey: dashboardKeys.documentos(),     queryFn: fetchDocumentos });
  const qConfig         = useQuery({ queryKey: dashboardKeys.config(),         queryFn: fetchConfig });
  const qCamisetas      = useQuery({ queryKey: dashboardKeys.camisetas(),      queryFn: fetchCamisetas });

  const allQueries = [qPresupuesto, qVoluntarios, qLogistica, qProyecto,
                      qPatrocinadores, qDocumentos, qConfig, qCamisetas];

  // ── Invalidación selectiva desde Zustand ────────────────────────────────────
  useEffect(() => {
    if (!lastEvent) return;
    const keysToInvalidate = EVENT_TO_KEYS[lastEvent.type] ?? [dashboardKeys.all()];
    keysToInvalidate.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  }, [lastEvent, queryClient]);

  // ── rawData unificado (mismo contrato que antes para useDashboardKpis) ───────
  const rawData = {
    ...(qPresupuesto.data    ?? {}),
    ...(qVoluntarios.data    ?? {}),
    ...(qLogistica.data      ?? {}),
    ...(qProyecto.data       ?? {}),
    ...(qPatrocinadores.data ?? {}),
    ...(qDocumentos.data     ?? {}),
    ...(qConfig.data         ?? {}),
    ...(qCamisetas.data      ?? {}),
  };

  const loading      = allQueries.every(q => q.isPending);
  const isRefreshing = allQueries.some(q => q.isFetching) && !loading;
  const lastUpdated  = allQueries.reduce((latest, q) => {
    if (!q.dataUpdatedAt) return latest;
    return !latest || q.dataUpdatedAt > latest.getTime()
      ? new Date(q.dataUpdatedAt)
      : latest;
  }, null);

  // Estado granular por módulo — para mostrar skeletons individuales
  const moduleStatus = {
    presupuesto:    { isLoading: qPresupuesto.isPending,    isError: qPresupuesto.isError },
    voluntarios:    { isLoading: qVoluntarios.isPending,    isError: qVoluntarios.isError },
    logistica:      { isLoading: qLogistica.isPending,      isError: qLogistica.isError },
    proyecto:       { isLoading: qProyecto.isPending,       isError: qProyecto.isError },
    patrocinadores: { isLoading: qPatrocinadores.isPending, isError: qPatrocinadores.isError },
    documentos:     { isLoading: qDocumentos.isPending,     isError: qDocumentos.isError },
    config:         { isLoading: qConfig.isPending,         isError: qConfig.isError },
    camisetas:      { isLoading: qCamisetas.isPending,      isError: qCamisetas.isError },
  };

  return { rawData, loading, isRefreshing, lastUpdated, moduleStatus };
}
