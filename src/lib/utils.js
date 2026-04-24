/**
 * utils.js — Utilidades compartidas entre módulos
 *
 * Centraliza funciones que estaban duplicadas en múltiples módulos:
 *   genIdNum(arr)       — ID numérico autoincremental (max+1)
 *   genIdStr()          — ID string único (timestamp + random)
 *   fmtEur(n)           — Formato moneda EUR sin decimales (KPIs, dashboards)
 *   fmtEur2(n)          — Formato moneda EUR con 2 decimales (budgets)
 *   fmtNum2(n)          — Formato número con 2 decimales
 *   scrollMainToTop()   — Scroll al top del <main> (anti-TDZ standalone)
 */

/** ID numérico: max(ids existentes) + 1, o 1 si vacío */
export const genIdNum = (arr) =>
  Array.isArray(arr) && arr.length
    ? Math.max(...arr.map(x => Number(x.id) || 0)) + 1
    : 1;

/** ID string único: timestamp base36 + 4 chars aleatorios */
export const genIdStr = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Formato moneda EUR sin decimales: 1.234 € */
export const fmtEur = (n) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(n ?? 0);

/** Formato moneda EUR con 2 decimales: 1.234,56 € */
export const fmtEur2 = (n) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n ?? 0);

/** Formato número con 2 decimales: 1.234,56 */
export const fmtNum2 = (n) =>
  new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n ?? 0);

/**
 * Scroll al top del elemento <main>.
 * Declarado como función standalone (no closure) para evitar que Rollup
 * colapse su variable local con lambdas del componente padre (TDZ).
 */
export function scrollMainToTop() {
  const mainEl = document.querySelector('main');
  if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'instant' });
}
