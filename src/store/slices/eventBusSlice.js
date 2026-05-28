/**
 * eventBusSlice.js — Mejora 3: Bus de eventos tipado
 *
 * Catálogo de eventos de dominio que reemplazan el teg-sync anónimo.
 * Compatibilidad total: cada emit también dispara teg-sync en window
 * para que el código existente siga funcionando sin cambios.
 */

// ── Catálogo de tipos de evento ───────────────────────────────────────────────
export const EVENT_TYPES = {
  /** Sync genérico — reemplaza el teg-sync anónimo como fallback */
  DATA_SYNC:                  'DATA_SYNC',
  /** Presupuesto: conceptos, tramos, inscritos, ingresos extra */
  PRESUPUESTO_ACTUALIZADO:    'PRESUPUESTO_ACTUALIZADO',
  /** Voluntarios: añadir, editar, confirmar, eliminar */
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

// Mapa módulo → evento tipado para uso en emitFromModule()
const MODULE_EVENT_MAP = {
  presupuesto:   EVENT_TYPES.PRESUPUESTO_ACTUALIZADO,
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
 * @property {Object} [payload]  — datos adicionales opcionales
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
   * @param {Object} [payload]
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
    // Todo el código existente que escucha window.addEventListener('teg-sync')
    // sigue funcionando sin modificaciones.
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
   * @param {Object} [payload]
   */
  emitFromModule: (module, payload = {}) => {
    const type = MODULE_EVENT_MAP[module] ?? EVENT_TYPES.DATA_SYNC;
    get().emitEvent(type, module, payload);
  },
});
