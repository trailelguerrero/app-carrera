import { neon } from '@neondatabase/serverless';
import { checkRateLimit } from '../lib/rateLimiter.js';

// MEJORA-02: instancia única a nivel de módulo — reutilizada entre requests
const sql = neon(process.env.DATABASE_URL);

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
      const invalidKey = keys.find(k => !ALLOWED_COLLECTIONS.test(k));
      if (invalidKey) return res.status(403).json({ error: 'Collection not allowed', key: invalidKey });

      // MEJORA-02: queries paralelas con Promise.all (ya estaba en PUT, ahora también en GET)
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
      const invalidPutKey = Object.keys(entries).find(k => !ALLOWED_COLLECTIONS.test(k));
      if (invalidPutKey) return res.status(403).json({ error: 'Collection not allowed', key: invalidPutKey });

      await Promise.all(
        Object.entries(entries).map(([key, value]) => {
          const jsonValue = JSON.stringify(value);
          return sql`
            INSERT INTO collections (key, value)
            VALUES (${key}, ${jsonValue}::jsonb)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
          `;
        })
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Batch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
