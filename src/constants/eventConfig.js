/**
 * EVENT CONFIG — Configuración global del evento
 * Fuente única de verdad para identidad y umbrales operativos.
 * Los valores por defecto corresponden a Trail El Guerrero 2026.
 * Para exportar a otra carrera: editar desde ⚙️ Configuración.
 */

export const EVENT_CONFIG_DEFAULT = {
  // ── Identidad ────────────────────────────────────────────────────────────
  nombre:   "Trail El Guerrero",
  edicion:  "2026",
  lugar:    "Candeleda",
  provincia: "Ávila",
  fecha:    "2026-08-29",
  organizador: "Club Trail El Guerrero",

  // ── Umbrales de alerta de voluntarios ────────────────────────────────────
  // Días antes de la carrera a partir de los cuales se activan las alertas.
  // Cubrir puestos es una tarea de los últimos días — no alertar antes.
  volDiasCritico: 7,    // ≤ N días → alerta roja (semana de carrera)
  volDiasAviso:   30,   // ≤ N días → aviso amarillo (mes previo)
};

export const LS_KEY_CONFIG = "teg_event_config_v1";
