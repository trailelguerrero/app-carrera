/**
 * thresholds.ts — umbrales de color compartidos entre módulos
 *
 * Centraliza la lógica de semáforo para evitar duplicación en
 * Dashboard, Voluntarios, Presupuesto y Patrocinadores.
 */

export type KpiClass = 'green' | 'amber' | 'red';

/** Color CSS para un porcentaje de cobertura (voluntarios, progreso, etc.) */
export const coverageColor = (pct: number): string =>
  pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';

/** Clase CSS del sistema KPI para un porcentaje de cobertura */
export const coverageClass = (pct: number): KpiClass =>
  pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red';

/** Color CSS para un porcentaje de captación de patrocinio */
export const sponsorshipColor = (pct: number): string =>
  pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';

/** Clase CSS del sistema KPI para patrocinio */
export const sponsorshipClass = (pct: number): KpiClass =>
  pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red';
