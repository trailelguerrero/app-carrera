/**
 * api/lib/logger.js — Logging estructurado para endpoints serverless
 *
 * D1: Reemplaza console.error/log dispersos con logging estructurado
 * que Vercel Logs Explorer puede filtrar y buscar fácilmente.
 *
 * NO incluir datos personales: PIN, tokens, nombres, emails.
 */

/**
 * Anonimiza una IP: conserva los primeros 3 octetos (IPv4) o
 * los primeros 3 grupos (IPv6) y enmascara el resto.
 */
function anonymizeIp(ip) {
  if (!ip) return 'unknown';
  // IPv4
  const v4 = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  if (v4) return `${v4[1]}.xxx`;
  // IPv6
  const v6parts = ip.split(':');
  if (v6parts.length >= 4) return `${v6parts.slice(0, 3).join(':')}:xxxx`;
  return 'unknown';
}

/**
 * Extrae contexto de la request sin datos personales.
 */
function requestContext(req) {
  return {
    method: req?.method || 'UNKNOWN',
    url: req?.url || 'unknown',
    ip: anonymizeIp(
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.socket?.remoteAddress
    ),
  };
}

/**
 * logError — registra un error con contexto estructurado.
 *
 * @param {string} label     Prefijo del módulo, p.ej. '[proxy/data]'
 * @param {Error|unknown} err  El error capturado
 * @param {object} context   Contexto adicional (endpoint, collection, etc.)
 *                           NO incluir PIN, tokens ni nombres de usuario.
 */
export function logError(label, err, context = {}) {
  const entry = {
    level: 'error',
    label,
    message: err instanceof Error ? err.message : String(err),
    ...context,
    ts: new Date().toISOString(),
  };
  // JSON en una sola línea → Vercel lo indexa correctamente
  console.error(JSON.stringify(entry));
}

/**
 * logWarn — registra un aviso estructurado.
 */
export function logWarn(label, message, context = {}) {
  const entry = {
    level: 'warn',
    label,
    message,
    ...context,
    ts: new Date().toISOString(),
  };
  console.warn(JSON.stringify(entry));
}

/**
 * logInfo — registra un evento informativo estructurado.
 * Usar con moderación — solo eventos relevantes para ops.
 */
export function logInfo(label, message, context = {}) {
  const entry = {
    level: 'info',
    label,
    message,
    ...context,
    ts: new Date().toISOString(),
  };
  console.log(JSON.stringify(entry));
}

export { requestContext };
