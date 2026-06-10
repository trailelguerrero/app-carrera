// MEJORA-03: instancia compartida — evita múltiples conexiones por módulo
import { sql } from '../../lib/db.js';
import { checkRateLimit } from '../../lib/rateLimiter.js';
import { logError, logWarn, requestContext } from '../../lib/logger.js';

// fix(SEC-CRIT-01): allowlist de colecciones — misma regex que [collection].js
const ALLOWED_COLLECTIONS = /^teg_(voluntarios|logistica|presupuesto|camisetas|patrocinadores|pat_log|localizaciones|documentos|proyecto|event_config|scenarios|codigos_promo|panel_pin_hash|panel_pin_length|escenarios|dia_carrera|scenario_active_name|auto_backup)_?v?\d*(_[a-zA-Z0-9]+)*$/;

export default async function handler(req, res) {
  // Cabeceras de seguridad HTTP — mismos valores que proxy.js/setSecurityHeaders()
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Security check: API Key authorization
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
  }

  // Rate limiting: 60 peticiones/minuto por IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  try {
    const limited = await checkRateLimit(sql, ip, 'data-batch', { max: 60, windowMs: 60_000 });
    if (limited) return res.status(429).json({ error: 'Demasiadas peticiones. Intenta en un momento.' });
  } catch (_) { /* Si falla el rate limiter no bloqueamos la petición */ }

  try {
    if (req.method === 'GET') {
      const keysParam = req.query.keys;
      if (!keysParam) return res.status(400).json({ error: 'Missing keys' });

      const keys = keysParam.split(',').map(k => k.trim());

      // MEJORA-03: límite de 10 claves por batch — evita saturar el pool de Neon
      if (keys.length > 10) return res.status(400).json({ error: 'Batch GET limitado a 10 claves por petición' });

      const invalidKey = keys.find(k => !ALLOWED_COLLECTIONS.test(k));
      if (invalidKey) return res.status(403).json({ error: 'Collection not allowed', key: invalidKey });

      // Queries paralelas con Promise.all
      const rows = await Promise.all(
        keys.map(key => sql`SELECT key, value FROM collections WHERE key = ${key}`)
      );

      const data = {};
      keys.forEach((key, i) => {
        if (rows[i].length) data[key] = rows[i][0].value;
      });

      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const entries = req.body;

      // MEJORA-03: límite de 10 claves por batch
      if (Object.keys(entries).length > 10) {
        return res.status(400).json({ error: 'Batch PUT limitado a 10 claves por petición' });
      }

      const invalidPutKey = Object.keys(entries).find(k => !ALLOWED_COLLECTIONS.test(k));
      if (invalidPutKey) return res.status(403).json({ error: 'Collection not allowed', key: invalidPutKey });

      // MEJORA-03: Promise.allSettled — errores parciales no abortan el batch completo
      const keys = Object.keys(entries);
      const results = await Promise.allSettled(
        Object.entries(entries).map(([key, value]) => {
          const jsonValue = JSON.stringify(value);
          return sql`
            INSERT INTO collections (key, value)
            VALUES (${key}, ${jsonValue}::jsonb)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
          `;
        })
      );

      const failed = keys.filter((_, i) => results[i].status === 'rejected');
      if (failed.length > 0) {
        logWarn('[data/batch]', 'Claves fallidas en batch PUT', { failed });
        return res.status(207).json({
          success: false,
          failed,
          saved: keys.filter((_, i) => results[i].status === 'fulfilled'),
        });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    logError('[data/batch]', error, requestContext(req));
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
