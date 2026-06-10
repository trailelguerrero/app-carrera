/**
 * api/lib/rateLimiter.js — Rate limiting persistente con Neon PostgreSQL
 *
 * SEC-05: Reemplaza el rate limiting en memoria (Map) que se reseteaba en cada deploy
 * y era inútil en entornos serverless con múltiples instancias paralelas.
 *
 * Estrategia:
 *   - Una fila por (ip, scope) en la tabla `rate_limit`.
 *   - Cada fila almacena el conteo actual y cuándo expira la ventana.
 *   - `UPSERT` atómico evita race conditions entre invocaciones paralelas.
 *   - Limpieza automática de filas expiradas con cada llamada (housekeeping ligero).
 *
 * Uso:
 *   import { checkRateLimit } from '../lib/rateLimiter.js';
 *
 *   const sql = neon(process.env.DATABASE_URL);
 *   const limited = await checkRateLimit(sql, ip, 'auth', { max: 5, windowMs: 10 * 60 * 1000 });
 *   if (limited) return res.status(429).json({ error: 'Demasiados intentos.' });
 */

/**
 * C3: ensureTable es ahora un no-op.
 * La tabla rate_limit y el índice idx_rate_limit_window_end se crean en
 * /api/setup (ejecutado una sola vez en el setup inicial del entorno).
 * Mantener la firma por compatibilidad con las llamadas existentes en checkRateLimit.
 *
 * Historial:
 *   SEC-SERVERLESS → C2: guard _tableReady para evitar DDL en instancias calientes
 *   C3: DDL movido completamente a setup.js, esta función ya no hace nada
 */
// eslint-disable-next-line no-unused-vars
async function ensureTable(_sql) {
  // no-op: tabla gestionada por /api/setup
}

/**
 * Check and increment the rate limit counter for a given IP + scope.
 *
 * @param {import('@neondatabase/serverless').NeonQueryFunction} sql - Neon SQL client
 * @param {string} ip         - Client IP address
 * @param {string} scope      - Limiter identifier (e.g. 'auth', 'register')
 * @param {object} opts
 * @param {number} opts.max       - Maximum requests allowed in the window
 * @param {number} opts.windowMs  - Window duration in milliseconds
 * @returns {Promise<boolean>} - true if the request should be rate-limited (rejected)
 */
export async function checkRateLimit(sql, ip, scope, { max = 5, windowMs = 10 * 60 * 1000 } = {}) {
  await ensureTable(sql);

  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowMs);

  // Housekeeping: delete expired rows (lightweight, best-effort)
  // Run fire-and-forget — don't await, it's not critical for this request
  sql`DELETE FROM rate_limit WHERE window_end < NOW()`.catch(() => {});

  // Atomic UPSERT:
  //   - INSERT new row if (ip, scope) not seen yet → count = 1
  //   - If existing window is expired → reset (count = 1, new window_end)
  //   - If within active window → increment counter
  const rows = await sql`
    INSERT INTO rate_limit (ip, scope, window_end, count)
    VALUES (${ip}, ${scope}, ${windowEnd.toISOString()}, 1)
    ON CONFLICT (ip, scope) DO UPDATE SET
      count      = CASE
                     WHEN rate_limit.window_end < NOW() THEN 1
                     ELSE rate_limit.count + 1
                   END,
      window_end = CASE
                     WHEN rate_limit.window_end < NOW() THEN ${windowEnd.toISOString()}
                     ELSE rate_limit.window_end
                   END
    RETURNING count, window_end
  `;

  const current = rows[0]?.count ?? 1;
  return current > max;
}

/**
 * Read-only check of a rate-limit counter WITHOUT incrementing it.
 * Used as a pre-check (e.g. global lockout) before doing expensive work.
 *
 * @returns {Promise<boolean>} true if the (ip, scope) counter is already over `max`.
 */
export async function peekRateLimit(sql, ip, scope, { max = 5 } = {}) {
  const rows = await sql`
    SELECT count FROM rate_limit
    WHERE ip = ${ip} AND scope = ${scope} AND window_end >= NOW()
  `;
  const current = rows[0]?.count ?? 0;
  return current > max;
}

/**
 * Clear a rate-limit counter for (ip, scope). Best-effort.
 * Used to reset a global failure counter after a successful auth.
 */
export async function resetRateLimit(sql, ip, scope) {
  await sql`DELETE FROM rate_limit WHERE ip = ${ip} AND scope = ${scope}`.catch(() => {});
}
