/**
 * EVENT CONFIG — Configuración global del evento.
 * Fuente única de verdad para identidad y umbrales operativos.
 * Exportable a cualquier carrera modificando solo estos valores por defecto.
 */
export const EVENT_CONFIG_DEFAULT = {
  nombre:           "Trail El Guerrero",
  edicion:          "2026",
  lugar:            "Candeleda",
  provincia:        "Ávila",
  fecha:            "2026-08-29",
  organizador:      "Club Trail El Guerrero",
  emailContacto:    "",
  telefonoContacto: "",
  webEvento:        "",
  volDiasCritico:   7,
  volDiasAviso:     30,
};

export const LS_KEY_CONFIG = "teg_event_config_v1";
