/**
 * thresholds.js — umbrales de color compartidos entre módulos
 *
 * Centraliza la lógica de semáforo para evitar duplicación en
 * Dashboard, Voluntarios, Presupuesto y Patrocinadores.
 * Un cambio aquí se propaga a todos los módulos.
 */

/**
 * Color CSS para un porcentaje de cobertura (voluntarios, progreso, etc.)
 * Verde ≥ 80% · Ámbar ≥ 50% · Rojo < 50%
 */
export const coverageColor = (pct) =>
  pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";

/**
 * Clase CSS del sistema KPI para un porcentaje de cobertura
 * Devuelve "green" | "amber" | "red"
 */
export const coverageClass = (pct) =>
  pct >= 80 ? "green" : pct >= 50 ? "amber" : "red";

/**
 * Color CSS para un porcentaje de captación de patrocinio
 * Verde ≥ 80% · Ámbar ≥ 50% · Rojo < 50%
 */
export const sponsorshipColor = (pct) =>
  pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";

/**
 * Clase CSS del sistema KPI para patrocinio
 * Devuelve "green" | "amber" | "red"
 */
export const sponsorshipClass = (pct) =>
  pct >= 80 ? "green" : pct >= 50 ? "amber" : "red";
