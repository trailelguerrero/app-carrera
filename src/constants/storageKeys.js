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
/** Número de intentos de PIN fallidos consecutivos (SEC-01) */
export const SK_AUTH_FAIL_COUNT  = "teg_panel_fail_count";
/** Timestamp (ms) hasta el que el panel está bloqueado (SEC-01) */
export const SK_AUTH_LOCKOUT_UNTIL = "teg_panel_lockout_until";
/** Estado serializado del lockout de autenticación (Fase 0.3) */
export const SK_AUTH_LOCKOUT     = "teg_auth_lockout_v1";
/** Longitud del PIN: 4 (defecto) o 6 dígitos (SEC-01) */
export const SK_AUTH_PIN_LENGTH  = "teg_panel_pin_length";

// ── UI / Estado global ────────────────────────────────────────────────────────
/** @deprecated B1 — OnboardingModal eliminado. Clave conservada para compatibilidad con instalaciones existentes. */
export const SK_UI_ONBOARDING_DONE    = "teg_onboarding_done";
export const SK_UI_DASH_ALERTAS_OPEN  = "teg_dash_alertas_open";
export const SK_UI_CODIGOS_INIT       = "teg_codigos_initialized";
/** Códigos promocionales activos (IU) */
export const SK_UI_CODIGOS_PROMO      = "teg_codigos_promo_v1";
export const SK_UI_LAST_BACKUP        = "teg_last_backup";
/** Backup automático JSON comprimido (CFG-02) — se sobreescribe cada 24h */
export const SK_UI_AUTO_BACKUP        = "teg_auto_backup_v1";
/** Timestamp ISO del último backup automático (CFG-02) */
export const SK_UI_AUTO_BACKUP_TS     = "teg_auto_backup_ts";
/** Modo evento forzado desde Dashboard (sessionStorage) — CORE-06 */
export const SK_UI_MODO_EVENTO_FORZADO = "teg_modo_evento_forzado";

// ── Configuración del evento ─────────────────────────────────────────────────
export const SK_EVENT_CONFIG = "teg_event_config_v1";

// ── Localización / Mapa ───────────────────────────────────────────────────────
/** Puntos de localización del recorrido */
export const SK_LOC_LOCALIZACIONES = "teg_localizaciones_v1";
/** Recorridos GPX de la carrera (array de tracks simplificados) */
export const SK_LOG_RECORRIDOS = "teg_logistica_v1_recorridos";

// ── Presupuesto ───────────────────────────────────────────────────────────────
/** Colección raíz de presupuesto */
export const SK_PPTO_ROOT             = "teg_presupuesto_v1";
export const SK_PPTO_CONCEPTOS        = "teg_presupuesto_v1_conceptos";
export const SK_PPTO_TRAMOS           = "teg_presupuesto_v1_tramos";
export const SK_PPTO_INSCRITOS        = "teg_presupuesto_v1_inscritos";
export const SK_PPTO_INGRESOS_EXTRA   = "teg_presupuesto_v1_ingresosExtra";
export const SK_PPTO_MERCHANDISING    = "teg_presupuesto_v1_merchandising";
export const SK_PPTO_SYNC_CONFIG      = "teg_presupuesto_v1_syncConfig";
/** ECO-08: toggles independientes de las 6 categorías de camisetas en Presupuesto */
export const SK_PPTO_CAM_SYNC_CONFIG  = "teg_presupuesto_v1_camSyncConfig";
export const SK_PPTO_MAXIMOS          = "teg_presupuesto_v1_maximos";
export const SK_PPTO_MARGEN_CONFIG    = "teg_presupuesto_v1_margenConfig";
export const SK_PPTO_SCENARIO_ACTIVE  = "teg_scenario_active_name";
/** Escenarios de presupuesto guardados */
export const SK_SCENARIOS             = "teg_scenarios_v1";

// ── Camisetas ─────────────────────────────────────────────────────────────────
/** Colección raíz de camisetas */
export const SK_CAM_ROOT              = "teg_camisetas_v1";
/** Pedidos de corredores adultos */
export const SK_CAM_CORREDORES        = "teg_camisetas_v1_corredores";
/** Pedidos categoría niño */
export const SK_CAM_NINO              = "teg_camisetas_v1_nino";
export const SK_CAM_PEDIDOS           = "teg_camisetas_v1_pedidos";
export const SK_CAM_COSTE             = "teg_camisetas_v1_coste";
/** Precio de plataforma de venta de camisetas */
export const SK_CAM_PRECIO_PLATAFORMA = "teg_camisetas_v1_precio_plataforma";
/** Estadísticas calculadas de camisetas */
export const SK_CAM_STATS             = "teg_camisetas_v1_stats";
export const SK_CAM_FECHA_PEDIDO       = "teg_camisetas_v1_fecha_pedido";
export const SK_CAM_ESTADO_PEDIDO      = "teg_camisetas_v1_estado_pedido";
export const SK_CAM_INCLUIR_PENDIENTES = "teg_camisetas_v1_incluir_pendientes";
export const SK_CAM_MARGEN_SEGURIDAD   = "teg_camisetas_v1_margen_seguridad";
export const SK_CAM_FUENTES            = "teg_camisetas_v1_fuentes";

/**
 * Configuración de venta al público general (precio unitario y cantidad estimada).
 * Prerequisito de ECO-04: esta clave debe existir aquí para que el Presupuesto
 * y el Dashboard puedan leerla y el backup/reset la gestionen correctamente.
 * Invariante: el valor del string DEBE coincidir con LS + "_venta_publico"
 * (LS = SK_CAM_ROOT = "teg_camisetas_v1") para no invalidar datos ya guardados.
 */
export const SK_CAM_VENTA_PUBLICO     = "teg_camisetas_v1_venta_publico";

/**
 * Camisetas modelo corredor vendidas a NO corredores desde la plataforma de
 * inscripción (p.ej. familiares que compran camiseta sin inscribirse a la carrera).
 * Se introduce manualmente por talla, igual que SK_CAM_CORREDORES.
 */
export const SK_CAM_NO_CORREDOR           = "teg_camisetas_v1_no_corredor";
/** Precio de venta propio para la fuente "no corredores (plataforma)" */
export const SK_CAM_PRECIO_NO_CORREDOR    = "teg_camisetas_v1_precio_no_corredor";

// ── Documentos ────────────────────────────────────────────────────────────────
export const SK_DOC_DOCS         = "teg_documentos_v1";
export const SK_DOC_GESTIONES    = "teg_documentos_v1_gestiones";
export const SK_DOC_SUBVENCIONES = "teg_documentos_v1_subvenciones";

// ── Logística ─────────────────────────────────────────────────────────────────
/** Colección raíz de logística */
export const SK_LOG_ROOT        = "teg_logistica_v1";
/** Contenedores / almacenes */
export const SK_LOG_CONT        = "teg_logistica_v1_cont";
/** Pedidos a proveedores */
export const SK_LOG_PEDIDOS_PROV = "teg_logistica_v1_pedidos_prov";
/** Rutas del evento */
export const SK_LOG_RUT         = "teg_logistica_v1_rut";
/** Tipos de contenedor */
export const SK_LOG_TIPOS_CONT  = "teg_logistica_v1_tipos_cont";
/** Vehículos asignados */
export const SK_LOG_VEH         = "teg_logistica_v1_veh";
export const SK_LOG_MAT         = "teg_logistica_v1_mat";
export const SK_LOG_ASIG        = "teg_logistica_v1_asig";
export const SK_LOG_TL          = "teg_logistica_v1_tl";
export const SK_LOG_CK          = "teg_logistica_v1_ck";
export const SK_LOG_INC         = "teg_logistica_v1_inc";

// ── Proyecto / Tareas ─────────────────────────────────────────────────────────
/** Colección raíz de proyecto */
export const SK_PROY_ROOT   = "teg_proyecto_v1";
export const SK_PROY_TAREAS = "teg_proyecto_v1_tareas";
export const SK_PROY_HITOS  = "teg_proyecto_v1_hitos";
/** Equipo del proyecto */
export const SK_PROY_EQUIPO = "teg_proyecto_v1_equipo";

// ── Voluntarios ───────────────────────────────────────────────────────────────
/** Colección raíz de voluntarios */
export const SK_VOL_ROOT              = "teg_voluntarios_v1";
export const SK_VOL_VOLUNTARIOS       = "teg_voluntarios_v1_voluntarios";
export const SK_VOL_PUESTOS           = "teg_voluntarios_v1_puestos";
/** Imagen reverso de la camiseta de voluntario */
export const SK_VOL_IMG_BACK          = "teg_voluntarios_v1_imgBack";
/** Imagen frente de la camiseta de voluntario */
export const SK_VOL_IMG_FRONT         = "teg_voluntarios_v1_imgFront";
/** Guía de tallas para voluntarios */
export const SK_VOL_IMG_GUIA_TALLAS   = "teg_voluntarios_v1_imgGuiaTallas";
/** Opciones de puesto disponibles */
export const SK_VOL_OPCION_PUESTO     = "teg_voluntarios_v1_opcionPuesto";
/** Opciones de vehículo disponibles */
export const SK_VOL_OPCION_VEHICULO   = "teg_voluntarios_v1_opcionVehiculo";
/** Opción de mostrar campo email en formulario público */
export const SK_VOL_OPCION_EMAIL      = "teg_voluntarios_v1_opcionEmail";
/** Opción de mostrar campo teléfono emergencia en formulario público */
export const SK_VOL_OPCION_EMERGENCIA = "teg_voluntarios_v1_opcionEmergencia";
export const SK_VOL_SESSION           = "teg_vol_session";

// ── Patrocinadores ────────────────────────────────────────────────────────────
/** Colección raíz de patrocinadores */
export const SK_PAT_ROOT        = "teg_patrocinadores_v1";
export const SK_PAT_PATS        = "teg_patrocinadores_v1_pats";
export const SK_PAT_OBJ         = "teg_patrocinadores_v1_obj";
/** Prefijo dinámico: SK_PAT_LOG_PREFIX + <id> */
export const SK_PAT_LOG_PREFIX  = "teg_pat_log_";

// ── Objeto indexado (para iteración en Configuracion.jsx, Dashboard.jsx, etc.) ──
/**
 * SK — Mapa de todas las claves por nombre semántico.
 * Úsalo cuando necesites iterar el conjunto completo o acceder por nombre.
 */
export const SK = {
  // Auth
  AUTH_PIN_HASH:      SK_AUTH_PIN_HASH,
  AUTH_AUTHED:        SK_AUTH_AUTHED,
  AUTH_SESSION_VER:   SK_AUTH_SESSION_VER,
  AUTH_FAIL_COUNT:    SK_AUTH_FAIL_COUNT,
  AUTH_LOCKOUT_UNTIL: SK_AUTH_LOCKOUT_UNTIL,
  AUTH_LOCKOUT:       SK_AUTH_LOCKOUT,
  AUTH_PIN_LENGTH:    SK_AUTH_PIN_LENGTH,

  // UI
  UI_ONBOARDING_DONE:   SK_UI_ONBOARDING_DONE,
  UI_DASH_ALERTAS_OPEN: SK_UI_DASH_ALERTAS_OPEN,
  UI_CODIGOS_INIT:      SK_UI_CODIGOS_INIT,
  UI_CODIGOS_PROMO:     SK_UI_CODIGOS_PROMO,
  UI_LAST_BACKUP:          SK_UI_LAST_BACKUP,
  UI_MODO_EVENTO_FORZADO:  SK_UI_MODO_EVENTO_FORZADO,

  // Evento
  EVENT_CONFIG: SK_EVENT_CONFIG,

  // Localización
  LOC_LOCALIZACIONES: SK_LOC_LOCALIZACIONES,
  LOG_RECORRIDOS:     SK_LOG_RECORRIDOS,

  // Presupuesto
  PPTO_ROOT:            SK_PPTO_ROOT,
  PPTO_CONCEPTOS:       SK_PPTO_CONCEPTOS,
  PPTO_TRAMOS:          SK_PPTO_TRAMOS,
  PPTO_INSCRITOS:       SK_PPTO_INSCRITOS,
  PPTO_INGRESOS_EXTRA:  SK_PPTO_INGRESOS_EXTRA,
  PPTO_MERCHANDISING:   SK_PPTO_MERCHANDISING,
  PPTO_SYNC_CONFIG:     SK_PPTO_SYNC_CONFIG,
  PPTO_CAM_SYNC_CONFIG: SK_PPTO_CAM_SYNC_CONFIG,
  PPTO_MAXIMOS:         SK_PPTO_MAXIMOS,
  PPTO_MARGEN_CONFIG:   SK_PPTO_MARGEN_CONFIG,
  PPTO_SCENARIO_ACTIVE: SK_PPTO_SCENARIO_ACTIVE,
  SCENARIOS:            SK_SCENARIOS,

  // Camisetas
  CAM_ROOT:              SK_CAM_ROOT,
  CAM_CORREDORES:        SK_CAM_CORREDORES,
  CAM_NINO:              SK_CAM_NINO,
  CAM_PEDIDOS:           SK_CAM_PEDIDOS,
  CAM_COSTE:             SK_CAM_COSTE,
  CAM_PRECIO_PLATAFORMA: SK_CAM_PRECIO_PLATAFORMA,
  CAM_STATS:             SK_CAM_STATS,
  CAM_VENTA_PUBLICO:     SK_CAM_VENTA_PUBLICO,
  CAM_FECHA_PEDIDO:       SK_CAM_FECHA_PEDIDO,
  CAM_ESTADO_PEDIDO:      SK_CAM_ESTADO_PEDIDO,
  CAM_INCLUIR_PENDIENTES: SK_CAM_INCLUIR_PENDIENTES,
  CAM_MARGEN_SEGURIDAD:   SK_CAM_MARGEN_SEGURIDAD,
  CAM_FUENTES:            SK_CAM_FUENTES,
  CAM_NO_CORREDOR:        SK_CAM_NO_CORREDOR,
  CAM_PRECIO_NO_CORREDOR: SK_CAM_PRECIO_NO_CORREDOR,

  // Documentos
  DOC_DOCS:         SK_DOC_DOCS,
  DOC_GESTIONES:    SK_DOC_GESTIONES,
  DOC_SUBVENCIONES: SK_DOC_SUBVENCIONES,

  // Logística
  LOG_ROOT:         SK_LOG_ROOT,
  LOG_CONT:         SK_LOG_CONT,
  LOG_PEDIDOS_PROV: SK_LOG_PEDIDOS_PROV,
  LOG_RUT:          SK_LOG_RUT,
  LOG_TIPOS_CONT:   SK_LOG_TIPOS_CONT,
  LOG_VEH:          SK_LOG_VEH,
  LOG_MAT:          SK_LOG_MAT,
  LOG_ASIG:         SK_LOG_ASIG,
  LOG_TL:           SK_LOG_TL,
  LOG_CK:           SK_LOG_CK,
  LOG_INC:          SK_LOG_INC,

  // Proyecto
  PROY_ROOT:   SK_PROY_ROOT,
  PROY_TAREAS: SK_PROY_TAREAS,
  PROY_HITOS:  SK_PROY_HITOS,
  PROY_EQUIPO: SK_PROY_EQUIPO,

  // Voluntarios
  VOL_ROOT:            SK_VOL_ROOT,
  VOL_VOLUNTARIOS:     SK_VOL_VOLUNTARIOS,
  VOL_PUESTOS:         SK_VOL_PUESTOS,
  VOL_IMG_BACK:        SK_VOL_IMG_BACK,
  VOL_IMG_FRONT:       SK_VOL_IMG_FRONT,
  VOL_IMG_GUIA_TALLAS: SK_VOL_IMG_GUIA_TALLAS,
  VOL_OPCION_PUESTO:   SK_VOL_OPCION_PUESTO,
  VOL_OPCION_VEHICULO: SK_VOL_OPCION_VEHICULO,
  VOL_OPCION_EMAIL:    SK_VOL_OPCION_EMAIL,
  VOL_OPCION_EMERGENCIA: SK_VOL_OPCION_EMERGENCIA,
  VOL_SESSION:         SK_VOL_SESSION,

  // Patrocinadores
  PAT_ROOT:       SK_PAT_ROOT,
  PAT_PATS:       SK_PAT_PATS,
  PAT_OBJ:        SK_PAT_OBJ,
  PAT_LOG_PREFIX: SK_PAT_LOG_PREFIX,
};

export default SK;
