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
  organizadores:    [], // Array de { nombre, telefono, email } — contactos visibles por voluntarios
  webEvento:        "",
  volDiasCritico:   7,
  volDiasAviso:     30,
  autoOpenDia:      false, // Abrir automáticamente DíaCarrera al iniciar la app
  // Textos personalizables del formulario público de voluntarios
  formSubtitulo:    "Formulario de inscripción de voluntarios",
  formBoton:        "✓ Registrarme como voluntario",
  formConfirmacion: "Gracias por apuntarte como voluntario. El equipo organizador se pondrá en contacto contigo próximamente.",
};

/** @deprecated Usar SK_EVENT_CONFIG de @/constants/storageKeys */
export { SK_EVENT_CONFIG as LS_KEY_CONFIG } from "@/constants/storageKeys";
