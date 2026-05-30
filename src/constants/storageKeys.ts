/**
 * storageKeys.ts — D3: capa de tipos TypeScript sobre storageKeys.js
 *
 * Re-exporta todas las constantes del .js original y añade:
 *   - StorageKey  → union literal de todos los valores de clave
 *   - isStorageKey() → type guard en runtime
 *
 * Los archivos .js siguen siendo la implementación real.
 * Este archivo solo añade tipos — cero rotura en importadores existentes.
 *
 * Uso en código nuevo:
 *   import { SK_VOL_VOLUNTARIOS, type StorageKey } from '@/constants/storageKeys';
 *   // Un typo en una clave producirá error de compilación TS, no bug silencioso.
 */

// Re-exportar constantes nombradas desde el .js para que los importadores
// existentes (import { SK_VOL_VOLUNTARIOS } from '@/constants/storageKeys')
// sigan funcionando sin cambios.
// NOTA: no re-exportamos `default` porque causaría definición circular
// al coexistir storageKeys.ts y storageKeys.js con el mismo nombre base.
// Los importadores que usan `import SK from '@/constants/storageKeys'`
// seguirán resueltos por Vite hacia el .js original.
export * from './storageKeys.js';

/**
 * Union literal de todos los valores de clave de colección conocidos.
 *
 * Se usa como tipo del parámetro `key` en dataService y useData para que
 * TypeScript detecte typos en tiempo de compilación.
 *
 * ⚠️  Al añadir una clave nueva en storageKeys.js, añadirla también aquí.
 *     El build fallará si hay un typo en la clave — ese es el objetivo.
 */
export type StorageKey =
  // ── Auth ──────────────────────────────────────────────────────────────────
  | 'teg_panel_pin_hash'
  | 'teg_panel_authed'
  | 'teg_panel_session_ver'
  | 'teg_panel_fail_count'
  | 'teg_panel_lockout_until'
  | 'teg_auth_lockout_v1'
  | 'teg_panel_pin_length'
  // ── UI ────────────────────────────────────────────────────────────────────
  | 'teg_onboarding_done'
  | 'teg_dash_alertas_open'
  | 'teg_codigos_initialized'
  | 'teg_codigos_promo_v1'
  | 'teg_last_backup'
  | 'teg_auto_backup_v1'
  | 'teg_auto_backup_ts'
  | 'teg_modo_evento_forzado'
  // ── Evento ────────────────────────────────────────────────────────────────
  | 'teg_event_config_v1'
  // ── Localización ─────────────────────────────────────────────────────────
  | 'teg_localizaciones_v1'
  // ── Presupuesto ──────────────────────────────────────────────────────────
  | 'teg_presupuesto_v1'
  | 'teg_presupuesto_v1_conceptos'
  | 'teg_presupuesto_v1_tramos'
  | 'teg_presupuesto_v1_inscritos'
  | 'teg_presupuesto_v1_ingresosExtra'
  | 'teg_presupuesto_v1_merchandising'
  | 'teg_presupuesto_v1_syncConfig'
  | 'teg_presupuesto_v1_maximos'
  | 'teg_presupuesto_v1_margenConfig'
  | 'teg_scenario_active_name'
  | 'teg_scenarios_v1'
  // ── Camisetas ─────────────────────────────────────────────────────────────
  | 'teg_camisetas_v1'
  | 'teg_camisetas_v1_corredores'
  | 'teg_camisetas_v1_nino'
  | 'teg_camisetas_v1_pedidos'
  | 'teg_camisetas_v1_coste'
  | 'teg_camisetas_v1_precio_plataforma'
  | 'teg_camisetas_v1_stats'
  | 'teg_camisetas_v1_fecha_pedido'
  | 'teg_camisetas_v1_estado_pedido'
  | 'teg_camisetas_v1_incluir_pendientes'
  | 'teg_camisetas_v1_margen_seguridad'
  | 'teg_camisetas_v1_fuentes'
  | 'teg_camisetas_v1_venta_publico'
  // ── Documentos ────────────────────────────────────────────────────────────
  | 'teg_documentos_v1'
  | 'teg_documentos_v1_gestiones'
  | 'teg_documentos_v1_subvenciones'
  // ── Logística ─────────────────────────────────────────────────────────────
  | 'teg_logistica_v1'
  | 'teg_logistica_v1_cont'
  | 'teg_logistica_v1_pedidos_prov'
  | 'teg_logistica_v1_rut'
  | 'teg_logistica_v1_tipos_cont'
  | 'teg_logistica_v1_veh'
  | 'teg_logistica_v1_mat'
  | 'teg_logistica_v1_asig'
  | 'teg_logistica_v1_tl'
  | 'teg_logistica_v1_ck'
  | 'teg_logistica_v1_inc'
  // ── Proyecto ──────────────────────────────────────────────────────────────
  | 'teg_proyecto_v1'
  | 'teg_proyecto_v1_tareas'
  | 'teg_proyecto_v1_hitos'
  | 'teg_proyecto_v1_equipo'
  // ── Voluntarios ───────────────────────────────────────────────────────────
  | 'teg_voluntarios_v1'
  | 'teg_voluntarios_v1_voluntarios'
  | 'teg_voluntarios_v1_puestos'
  | 'teg_voluntarios_v1_imgBack'
  | 'teg_voluntarios_v1_imgFront'
  | 'teg_voluntarios_v1_imgGuiaTallas'
  | 'teg_voluntarios_v1_opcionPuesto'
  | 'teg_voluntarios_v1_opcionVehiculo'
  | 'teg_voluntarios_v1_opcionEmail'
  | 'teg_voluntarios_v1_opcionEmergencia'
  | 'teg_vol_session'
  // ── Patrocinadores ────────────────────────────────────────────────────────
  | 'teg_patrocinadores_v1'
  | 'teg_patrocinadores_v1_pats'
  | 'teg_patrocinadores_v1_obj'
  // Prefijo dinámico — se usa como SK_PAT_LOG_PREFIX + id
  | `teg_pat_log_${string}`;

/**
 * Type guard runtime: verifica que una cadena es una StorageKey conocida.
 * Útil para validar claves que llegan de fuentes externas (localStorage scan,
 * parámetros de URL, etc.).
 *
 * Nota: no incluye el patrón dinámico teg_pat_log_* por limitaciones de TS.
 */
const KNOWN_KEYS = new Set<string>([
  'teg_panel_pin_hash', 'teg_panel_authed', 'teg_panel_session_ver',
  'teg_panel_fail_count', 'teg_panel_lockout_until', 'teg_auth_lockout_v1',
  'teg_panel_pin_length', 'teg_onboarding_done', 'teg_dash_alertas_open',
  'teg_codigos_initialized', 'teg_codigos_promo_v1', 'teg_last_backup',
  'teg_auto_backup_v1', 'teg_auto_backup_ts', 'teg_modo_evento_forzado',
  'teg_event_config_v1', 'teg_localizaciones_v1', 'teg_presupuesto_v1',
  'teg_presupuesto_v1_conceptos', 'teg_presupuesto_v1_tramos',
  'teg_presupuesto_v1_inscritos', 'teg_presupuesto_v1_ingresosExtra',
  'teg_presupuesto_v1_merchandising', 'teg_presupuesto_v1_syncConfig',
  'teg_presupuesto_v1_maximos', 'teg_presupuesto_v1_margenConfig',
  'teg_scenario_active_name', 'teg_scenarios_v1', 'teg_camisetas_v1',
  'teg_camisetas_v1_corredores', 'teg_camisetas_v1_nino', 'teg_camisetas_v1_pedidos',
  'teg_camisetas_v1_coste', 'teg_camisetas_v1_precio_plataforma',
  'teg_camisetas_v1_stats', 'teg_camisetas_v1_fecha_pedido',
  'teg_camisetas_v1_estado_pedido', 'teg_camisetas_v1_incluir_pendientes',
  'teg_camisetas_v1_margen_seguridad', 'teg_camisetas_v1_fuentes',
  'teg_camisetas_v1_venta_publico', 'teg_documentos_v1',
  'teg_documentos_v1_gestiones', 'teg_documentos_v1_subvenciones',
  'teg_logistica_v1', 'teg_logistica_v1_cont', 'teg_logistica_v1_pedidos_prov',
  'teg_logistica_v1_rut', 'teg_logistica_v1_tipos_cont', 'teg_logistica_v1_veh',
  'teg_logistica_v1_mat', 'teg_logistica_v1_asig', 'teg_logistica_v1_tl',
  'teg_logistica_v1_ck', 'teg_logistica_v1_inc', 'teg_proyecto_v1',
  'teg_proyecto_v1_tareas', 'teg_proyecto_v1_hitos', 'teg_proyecto_v1_equipo',
  'teg_voluntarios_v1', 'teg_voluntarios_v1_voluntarios', 'teg_voluntarios_v1_puestos',
  'teg_voluntarios_v1_imgBack', 'teg_voluntarios_v1_imgFront',
  'teg_voluntarios_v1_imgGuiaTallas', 'teg_voluntarios_v1_opcionPuesto',
  'teg_voluntarios_v1_opcionVehiculo', 'teg_voluntarios_v1_opcionEmail',
  'teg_voluntarios_v1_opcionEmergencia', 'teg_vol_session',
  'teg_patrocinadores_v1', 'teg_patrocinadores_v1_pats', 'teg_patrocinadores_v1_obj',
]);

export function isStorageKey(key: string): key is StorageKey {
  return KNOWN_KEYS.has(key) || key.startsWith('teg_pat_log_');
}
