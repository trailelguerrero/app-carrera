/**
 * eventBusSlice.js — Mejora 5: Payloads tipados + contratos de dominio
 *
 * Catálogo de eventos de dominio con payloads explícitos por tipo.
 * Compatibilidad total: cada emit también dispara teg-sync en window.
 *
 * ── MAPA EMISOR → ESCUCHA ────────────────────────────────────────────────────
 *
 * VOLUNTARIO_ACTUALIZADO
 *   Emite:  Voluntarios.jsx (notify('voluntarios'))
 *   Escucha: useDashboardQueries → invalida [voluntarios, camisetas]
 *            useAlertasBadges   → recalcula módulo 'voluntarios'
 *
 * PRESUPUESTO_ACTUALIZADO
 *   Emite:  Patrocinadores.jsx, Camisetas.jsx, Documentos.jsx (notify('presupuesto'))
 *   Escucha: useDashboardQueries → invalida [presupuesto, camisetas, config, patrocinadores]
 *            useAlertasBadges   → recalcula módulo 'presupuesto'
 *
 * CAMISETAS_ACTUALIZADO
 *   Emite:  Camisetas.jsx (notify('camisetas'))
 *   Escucha: useDashboardQueries → invalida [camisetas, presupuesto]
 *
 * LOGISTICA_INCIDENCIA
 *   Emite:  DiaCarrera.jsx (notify('logistica')), Logistica.jsx (CK completado)
 *   Escucha: useDashboardQueries → invalida [logistica]
 *            useAlertasBadges   → recalcula módulo 'logistica'
 *
 * PROYECTO_TAREA_CAMBIADA (también por CK)
 *   Emite:  Logistica.jsx (setTareasProyecto → notify('proyecto'))
 *   Escucha: useDashboardQueries → invalida [proyecto]
 *
 * PROYECTO_TAREA_CAMBIADA
 *   Emite:  Proyecto.jsx (notify('proyecto')), Logistica.jsx (notify('proyecto'))
 *   Escucha: useDashboardQueries → invalida [proyecto]
 *            useAlertasBadges   → recalcula módulo 'proyecto'
 *
 * DOCUMENTO_ACTUALIZADO
 *   Emite:  Documentos.jsx (notify('documentos'))
 *   Escucha: useDashboardQueries → invalida [documentos]
 *
 * DIACARRERA_EVENTO
 *   Emite:  DiaCarrera.jsx (notify('diacarrera'))
 *   Escucha: useDashboardQueries → invalida [diacarrera] ← añadido en Mejora 5
 *
 * CONFIGURACION_CAMBIADA
 *   Emite:  Configuracion.jsx (notify('configuracion'))
 *   Escucha: useDashboardQueries → invalida [config] ← añadido en Mejora 5
 *            useAlertasBadges   → recalcula módulo 'configuracion'
 *
 * DATA_SYNC
 *   Emite:  fallback (sin módulo), navegación (Index.jsx)
 *   Escucha: useDashboardQueries → invalida [all] (todo el dashboard)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Catálogo de tipos de evento ───────────────────────────────────────────────
export const EVENT_TYPES = {
  /** Sync genérico — fallback cuando no hay módulo específico */
  DATA_SYNC:                  'DATA_SYNC',
  /** Presupuesto: conceptos, tramos, inscritos, ingresos extra, patrocinios */
  PRESUPUESTO_ACTUALIZADO:    'PRESUPUESTO_ACTUALIZADO',
  /** Camisetas: pedidos, precios, stock — tiene KPIs propios en Dashboard */
  CAMISETAS_ACTUALIZADO:      'CAMISETAS_ACTUALIZADO',
  /** Voluntarios: creado, editado, confirmado, eliminado */
  VOLUNTARIO_ACTUALIZADO:     'VOLUNTARIO_ACTUALIZADO',
  /** Logística: incidencia abierta, cerrada o actualizada */
  LOGISTICA_INCIDENCIA:       'LOGISTICA_INCIDENCIA',
  /** Documentos: doc o gestión cambia estado */
  DOCUMENTO_ACTUALIZADO:      'DOCUMENTO_ACTUALIZADO',
  /** Proyecto: tarea completada, vencida o modificada */
  PROYECTO_TAREA_CAMBIADA:    'PROYECTO_TAREA_CAMBIADA',
  /** Día de carrera: timeline o checklist actualizado */
  DIACARRERA_EVENTO:          'DIACARRERA_EVENTO',
  /** Configuración: reset o cambio de ajustes globales */
  CONFIGURACION_CAMBIADA:     'CONFIGURACION_CAMBIADA',
};

/**
 * Acciones válidas por tipo de evento.
 * Usar en el campo payload.accion para mayor precisión.
 *
 * @example
 * dataService.notify('voluntarios', { accion: EVENT_ACTIONS.VOLUNTARIO.CONFIRMADO, id: vol.id })
 */
export const EVENT_ACTIONS = {
  VOLUNTARIO: {
    CREADO:     'creado',
    EDITADO:    'editado',
    CONFIRMADO: 'confirmado',
    ELIMINADO:  'eliminado',
  },
  PRESUPUESTO: {
    CONCEPTO:       'concepto',
    TRAMO:          'tramo',
    INSCRITO:       'inscrito',
    MERCHANDISING:  'merchandising',
    EXTRA:          'extra',
    PATROCINIO:     'patrocinio',
  },
  CAMISETAS: {
    PEDIDO_CREADO:    'pedido_creado',
    PEDIDO_EDITADO:   'pedido_editado',
    PEDIDO_ELIMINADO: 'pedido_eliminado',
    PRECIO_CAMBIADO:  'precio_cambiado',
    ESTADO_PAGO:      'estado_pago',
  },
  LOGISTICA: {
    ABIERTA:        'abierta',
    CERRADA:        'cerrada',
    ACTUALIZADA:    'actualizada',
    // Pre-operativo (checklist)
    CK_COMPLETADO:  'ck_completado',
    CK_REABIERTO:   'ck_reabierto',
    FASE_COMPLETADA:'fase_completada',
  },
  DOCUMENTO: {
    SUBIDO:   'subido',
    ELIMINADO:'eliminado',
    GESTION:  'gestion',
  },
  PROYECTO: {
    COMPLETADA:  'completada',
    VENCIDA:     'vencida',
    MODIFICADA:  'modificada',
  },
  DIACARRERA: {
    TIMELINE:   'timeline',
    CHECKLIST:  'checklist',
    INCIDENCIA: 'incidencia',
  },
  CONFIGURACION: {
    RESET:       'reset',
    ACTUALIZADA: 'actualizada',
  },
};

/**
 * Shapes de payload por tipo de evento (documentación de contratos).
 *
 * @typedef {Object} PayloadVoluntario
 * @property {'creado'|'editado'|'confirmado'|'eliminado'} [accion]
 * @property {string} [id]
 *
 * @typedef {Object} PayloadPresupuesto
 * @property {'concepto'|'tramo'|'inscrito'|'merchandising'|'extra'|'patrocinio'} [accion]
 * @property {string} [id]
 *
 * @typedef {Object} PayloadCamisetas
 * @property {'pedido_creado'|'pedido_editado'|'pedido_eliminado'|'precio_cambiado'|'estado_pago'} [accion]
 * @property {string} [id]
 *
 * @typedef {Object} PayloadLogistica
 * @property {'abierta'|'cerrada'|'actualizada'} [accion]
 * @property {string} [id]
 * @property {'alta'|'media'|'baja'} [severidad]
 *
 * @typedef {Object} PayloadDocumento
 * @property {'subido'|'eliminado'|'gestion'} [accion]
 * @property {string} [id]
 *
 * @typedef {Object} PayloadProyecto
 * @property {'completada'|'vencida'|'modificada'} [accion]
 * @property {string} [id]
 *
 * @typedef {Object} PayloadDiaCarrera
 * @property {'timeline'|'checklist'|'incidencia'} [accion]
 * @property {string} [id]
 *
 * @typedef {Object} PayloadConfiguracion
 * @property {'reset'|'actualizada'} [accion]
 * @property {string} [campo]
 */

// Mapa módulo → evento tipado para uso en emitFromModule()
const MODULE_EVENT_MAP = {
  presupuesto:   EVENT_TYPES.PRESUPUESTO_ACTUALIZADO,
  camisetas:     EVENT_TYPES.CAMISETAS_ACTUALIZADO,
  voluntarios:   EVENT_TYPES.VOLUNTARIO_ACTUALIZADO,
  logistica:     EVENT_TYPES.LOGISTICA_INCIDENCIA,
  documentos:    EVENT_TYPES.DOCUMENTO_ACTUALIZADO,
  proyecto:      EVENT_TYPES.PROYECTO_TAREA_CAMBIADA,
  diacarrera:    EVENT_TYPES.DIACARRERA_EVENTO,
  configuracion: EVENT_TYPES.CONFIGURACION_CAMBIADA,
};

const MAX_HISTORY = 20;

/**
 * @typedef {Object} BusEvent
 * @property {string} type       — uno de EVENT_TYPES
 * @property {string} module     — módulo origen
 * @property {Object} [payload]  — datos adicionales (ver shapes arriba)
 * @property {number} timestamp  — Date.now()
 * @property {number} id         — contador incremental
 */

let _eventCounter = 0;

export const createEventBusSlice = (set, get) => ({
  // ── Estado ──────────────────────────────────────────────────────────────────
  /** Último evento emitido */
  lastEvent: null,
  /** Historial de los últimos MAX_HISTORY eventos (para debug) */
  eventHistory: [],

  // ── Acciones ────────────────────────────────────────────────────────────────

  /**
   * Emite un evento tipado.
   * También dispara teg-sync en window para compatibilidad con código legacy.
   *
   * @param {string} type    — EVENT_TYPES.*
   * @param {string} module  — módulo origen (ej: 'voluntarios')
   * @param {Object} [payload] — ver shapes de PayloadXxx arriba
   */
  emitEvent: (type, module, payload = {}) => {
    _eventCounter += 1;
    /** @type {BusEvent} */
    const event = {
      type,
      module,
      payload,
      timestamp: Date.now(),
      id: _eventCounter,
    };

    set((state) => ({
      lastEvent: event,
      eventHistory: [event, ...state.eventHistory].slice(0, MAX_HISTORY),
    }));

    // ── Compatibilidad legacy: seguir disparando teg-sync ────────────────────
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('teg-sync', { detail: { module, type } })
      );
    }
  },

  /**
   * Atajo: emite el evento tipado correspondiente al módulo.
   * Si el módulo no tiene evento específico, emite DATA_SYNC.
   *
   * @param {string} module
   * @param {Object} [payload] — ver shapes de PayloadXxx arriba
   */
  emitFromModule: (module, payload = {}) => {
    const type = MODULE_EVENT_MAP[module] ?? EVENT_TYPES.DATA_SYNC;
    get().emitEvent(type, module, payload);
  },
});
