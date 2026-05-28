import { neon } from '@neondatabase/serverless';
import { checkRateLimit } from '../lib/rateLimiter.js';

// MEJORA-02: instancia única a nivel de módulo — reutilizada entre requests
const sql = neon(process.env.DATABASE_URL);

// fix(SEC-CRIT-01): allowlist de colecciones — previene acceso no autorizado entre módulos
const ALLOWED_COLLECTIONS = /^teg_(voluntarios|logistica|presupuesto|camisetas|patrocinadores|pat_log|localizaciones|documentos|proyecto|event_config|scenarios|codigos_promo|panel_pin_hash|panel_pin_length|escenarios|dia_carrera|scenario_active_name|auto_backup)_?v?\d*(_[a-zA-Z0-9]+)*$/;

export default async function handler(req, res) {
  const { collection } = req.query;

  // Security check: API Key authorization
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
  }

  if (!collection || !ALLOWED_COLLECTIONS.test(collection)) {
    return res.status(403).json({ error: 'Collection not allowed' });
  }

  // Rate limiting: 60 peticiones/minuto por IP en endpoints autenticados
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';

  try {
    const limited = await checkRateLimit(sql, ip, 'data-collection', { max: 60, windowMs: 60_000 });
    if (limited) return res.status(429).json({ error: 'Demasiadas peticiones. Intenta en un momento.' });
  } catch (_) { /* Si falla el rate limiter no bloqueamos la petición */ }

  try {
    if (req.method === 'GET') {
      const result = await sql`SELECT value, version FROM collections WHERE key = ${collection}`;
      if (result.length > 0) {
        return res.status(200).json({ data: result[0].value, version: result[0].version || 1 });
      } else {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (req.method === 'PUT') {
      const body = req.body;
      // MISSING-02: soporte opcional de version para detección de conflictos
      const clientVersion = body?.__version;
      const jsonValue = JSON.stringify(body);

      if (clientVersion !== undefined) {
        const current = await sql`SELECT version FROM collections WHERE key = ${collection}`;
        const serverVersion = current[0]?.version || 0;
        if (serverVersion > 0 && clientVersion !== serverVersion) {
          return res.status(409).json({
            error: 'Conflict',
            serverVersion,
            clientVersion,
            message: 'Los datos fueron modificados por otro dispositivo. Recarga para ver los cambios.',
          });
        }
      }

      await sql`
        INSERT INTO collections (key, value, version)
        VALUES (${collection}, ${jsonValue}::jsonb, 1)
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            version = collections.version + 1,
            updated_at = CURRENT_TIMESTAMP
      `;
      const updated = await sql`SELECT version FROM collections WHERE key = ${collection}`;
      return res.status(200).json({ success: true, version: updated[0]?.version || 1 });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM collections WHERE key = ${collection}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error(`Collection ${collection} error:`, error);
    return res.status(500).json({ error: error.message });
  }
}
