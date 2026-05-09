/**
 * storageKeys.js — ARQ-02
 * Fuente única de verdad para todas las claves de localStorage.
 *
 * Convención de nombres: teg_<módulo>_<versión>_<entidad>
 * Al cambiar una clave aquí se refleja automáticamente en toda la app.
 *
 * ⚠️  NO usar strings literales "teg_..." fuera de este archivo.
 *     Importar siempre desde aquí.
 */

// ── Autenticación / Panel ────────────────────────────────────────────────────
export const SK_AUTH_PIN_HASH    = "teg_panel_pin_hash";
export const SK_AUTH_AUTHED      = "teg_panel_authed";
export const SK_AUTH_SESSION_VER = "teg_panel_session_ver";

// ── UI / Estado global ────────────────────────────────────────────────────────
export const SK_UI_ONBOARDING_DONE    = "teg_onboarding_done";
export const SK_UI_DASH_ALERTAS_OPEN  = "teg_dash_alertas_open";
export const SK_UI_CODIGOS_INIT       = "teg_codigos_initialized";
export const SK_UI_LAST_BACKUP        = "teg_last_backup";

// ── Configuración del evento ─────────────────────────────────────────────────
export const SK_EVENT_CONFIG = "teg_event_config_v1";

// ── Presupuesto ───────────────────────────────────────────────────────────────
export const SK_PPTO_CONCEPTOS        = "teg_presupuesto_v1_conceptos";
export const SK_PPTO_TRAMOS           = "teg_presupuesto_v1_tramos";
export const SK_PPTO_INSCRITOS        = "teg_presupuesto_v1_inscritos";
export const SK_PPTO_INGRESOS_EXTRA   = "teg_presupuesto_v1_ingresosExtra";
export const SK_PPTO_MERCHANDISING    = "teg_presupuesto_v1_merchandising";
export const SK_PPTO_SYNC_CONFIG      = "teg_presupuesto_v1_syncConfig";
export const SK_PPTO_MAXIMOS          = "teg_presupuesto_v1_maximos";

// ── Camisetas ─────────────────────────────────────────────────────────────────
export const SK_CAM_PEDIDOS = "teg_camisetas_v1_pedidos";
export const SK_CAM_COSTE   = "teg_camisetas_v1_coste";

// ── Documentos ────────────────────────────────────────────────────────────────
export const SK_DOC_DOCS      = "teg_documentos_v1";
export const SK_DOC_GESTIONES = "teg_documentos_v1_gestiones";

// ── Logística ─────────────────────────────────────────────────────────────────
export const SK_LOG_ASIG       = "teg_logistica_v1_asig";
export const SK_LOG_CK         = "teg_logistica_v1_ck";
export const SK_LOG_INC        = "teg_logistica_v1_inc";

// ── Proyecto / Tareas ─────────────────────────────────────────────────────────
export const SK_PROY_TAREAS = "teg_proyecto_v1_tareas";

// ── Voluntarios ───────────────────────────────────────────────────────────────
export const SK_VOL_VOLUNTARIOS = "teg_voluntarios_v1_voluntarios";
export const SK_VOL_PUESTOS     = "teg_voluntarios_v1_puestos";
export const SK_VOL_SESSION     = "teg_vol_session";

// ── Patrocinadores ────────────────────────────────────────────────────────────
export const SK_PAT_PATS        = "teg_patrocinadores_v1_pats";
/** Prefijo dinámico: SK_PAT_LOG_PREFIX + <id> */
export const SK_PAT_LOG_PREFIX  = "teg_pat_log_";

// ── Objeto indexado (para iteración en Configuracion.jsx, Dashboard.jsx, etc.) ──
/**
 * SK — Mapa de todas las claves por nombre semántico.
 * Úsalo cuando necesites iterar el conjunto completo o acceder por nombre.
 */
export const SK = {
  // Auth
  AUTH_PIN_HASH:    SK_AUTH_PIN_HASH,
  AUTH_AUTHED:      SK_AUTH_AUTHED,
  AUTH_SESSION_VER: SK_AUTH_SESSION_VER,

  // UI
  UI_ONBOARDING_DONE:   SK_UI_ONBOARDING_DONE,
  UI_DASH_ALERTAS_OPEN: SK_UI_DASH_ALERTAS_OPEN,
  UI_CODIGOS_INIT:      SK_UI_CODIGOS_INIT,
  UI_LAST_BACKUP:       SK_UI_LAST_BACKUP,

  // Evento
  EVENT_CONFIG: SK_EVENT_CONFIG,

  // Presupuesto
  PPTO_CONCEPTOS:      SK_PPTO_CONCEPTOS,
  PPTO_TRAMOS:         SK_PPTO_TRAMOS,
  PPTO_INSCRITOS:      SK_PPTO_INSCRITOS,
  PPTO_INGRESOS_EXTRA: SK_PPTO_INGRESOS_EXTRA,
  PPTO_MERCHANDISING:  SK_PPTO_MERCHANDISING,
  PPTO_SYNC_CONFIG:    SK_PPTO_SYNC_CONFIG,
  PPTO_MAXIMOS:        SK_PPTO_MAXIMOS,

  // Camisetas
  CAM_PEDIDOS: SK_CAM_PEDIDOS,
  CAM_COSTE:   SK_CAM_COSTE,

  // Documentos
  DOC_DOCS:      SK_DOC_DOCS,
  DOC_GESTIONES: SK_DOC_GESTIONES,

  // Logística
  LOG_ASIG: SK_LOG_ASIG,
  LOG_CK:   SK_LOG_CK,
  LOG_INC:  SK_LOG_INC,

  // Proyecto
  PROY_TAREAS: SK_PROY_TAREAS,

  // Voluntarios
  VOL_VOLUNTARIOS: SK_VOL_VOLUNTARIOS,
  VOL_PUESTOS:     SK_VOL_PUESTOS,
  VOL_SESSION:     SK_VOL_SESSION,

  // Patrocinadores
  PAT_PATS:       SK_PAT_PATS,
  PAT_LOG_PREFIX: SK_PAT_LOG_PREFIX,
};

export default SK;
