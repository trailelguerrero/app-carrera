// FASE-7: instancia compartida — evita múltiples conexiones por módulo
import { sql } from '../lib/db.js';
import { logError, requestContext } from '../lib/logger.js';
import { checkRateLimit } from '../lib/rateLimiter.js'; // MEJ-22

const auth = (req, res) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
};

// FASE-7: DDL movido a /api/setup — tabla budget_log gestionada allí

export default async function handler(req, res) {
  // SEC-04: todos los métodos requieren API key — el GET expone datos financieros sensibles
  if (!auth(req, res)) return;
  try {
    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query.limit || '50'), 200);
      const rows = await sql`
        SELECT id, ts, concepto_id, concepto, campo, valor_antes, valor_nuevo, tipo
        FROM budget_log ORDER BY ts DESC LIMIT ${limit}
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      // MEJ-22: rate limit — 30 req/min por IP
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      if (await checkRateLimit(sql, ip, 'budget-log-write', { max: 30, windowMs: 60 * 1000 })) {
        return res.status(429).json({ error: 'Demasiadas peticiones. Inténtalo en un momento.' });
      }
      const { conceptoId, concepto, campo, valorAntes, valorNuevo, tipo } = req.body;
      if (!concepto || !campo) return res.status(400).json({ error: 'Faltan campos' });
      await sql`
        INSERT INTO budget_log (concepto_id, concepto, campo, valor_antes, valor_nuevo, tipo)
        VALUES (${conceptoId ?? null}, ${concepto}, ${campo},
                ${String(valorAntes ?? '')}, ${String(valorNuevo ?? '')}, ${tipo ?? null})
      `;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      // MEJ-22: rate limit — 30 req/min por IP (mismo scope que POST)
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      if (await checkRateLimit(sql, ip, 'budget-log-write', { max: 30, windowMs: 60 * 1000 })) {
        return res.status(429).json({ error: 'Demasiadas peticiones. Inténtalo en un momento.' });
      }
      await sql`DELETE FROM budget_log`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    logError('[budget-log]', error, requestContext(req));
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
