/**
 * Utilidades centralizadas para la fecha y configuración del evento.
 * Importar desde aquí en lugar de hardcodear "2026-08-29".
 */
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";

/** Devuelve la fecha del evento como objeto Date. Usa config si está disponible. */
export function getEventDate(config) {
  const fecha = config?.fecha || EVENT_CONFIG_DEFAULT.fecha;
  try { return new Date(fecha); } catch { return new Date(EVENT_CONFIG_DEFAULT.fecha); }
}

/** Días hasta el evento (negativo si ya pasó). */
export function diasHastaEvento(config) {
  return Math.ceil((getEventDate(config) - new Date()) / 86400000);
}

/** Fecha como string localizado en español. */
export function eventDateStr(config) {
  return getEventDate(config).toLocaleDateString("es-ES", {
    day: "2-digit", month: "long", year: "numeric",
  });
}
