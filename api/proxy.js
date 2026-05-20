/**
 * BFF (Backend-For-Frontend) Proxy — SEC-01
 *
 * Rutas /api/proxy/data/:collection → Neon directamente (sin HTTP interno).
 * Resto de rutas → forward HTTP con x-api-key inyectada server-side.
 *
 * La llamada HTTP interna (proxy→/api/data/*) causaba timeouts en Vercel
 * cuando VERCEL_PROJECT_PRODUCTION_URL no estaba configurada.
 * Solución: manejar /data/:collection aquí mismo con el SDK de Neon.
 */
import { neon } from '@neondatabase/serverless';

const ALLOWED_COLLECTIONS = /^teg_(voluntarios|logistica|presupuesto|camisetas|patrocinadores|pat_log|localizaciones|documentos|proyecto|event_config|scenarios|codigos_promo|panel_pin_hash|panel_pin_length|escenarios|dia_carrera|scenario_active_name|auto_backup)_?v?\d*(_[a-zA-Z0-9]+)*$/;

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = [
    process.env.ALLOWED_ORIGIN || '',
    'http://localhost:5173',
    'http://localhost:4173',
  ].filter(Boolean);
  if (origin && allowed.some(o => origin.startsWith(o))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const proxyPath = req.query.path;
  if (!proxyPath) return res.status(400).json({ error: 'Missing path param' });

  const pathStr = Array.isArray(proxyPath) ? proxyPath.join('/') : String(proxyPath);

  // ── Ruta directa: /api/proxy/data/:collection → Neon sin HTTP interno ──────
  const dataMatch = pathStr.match(/^data\/([^/?]+)$/);
  if (dataMatch) {
    const collection = dataMatch[1];
    if (!ALLOWED_COLLECTIONS.test(collection)) {
      return res.status(403).json({ error: 'Collection not allowed' });
    }
    if (!['GET','PUT','DELETE'].includes(req.method)) {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
      const sql = neon(process.env.DATABASE_URL);

      if (req.method === 'GET') {
        const result = await sql`SELECT value, version FROM collections WHERE key = ${collection}`;
        if (!result.length) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json({ data: result[0].value, version: result[0].version || 1 });
      }

      if (req.method === 'PUT') {
        const body = req.body;
        if (body === undefined || body === null) {
          console.error(`[proxy/data] PUT ${collection}: body vacío o undefined`);
          return res.status(400).json({ error: 'Body vacío' });
        }
        const jsonValue = JSON.stringify(body);
        console.log(`[proxy/data] PUT ${collection}: ${jsonValue.length} bytes`);
        await sql`
          INSERT INTO collections (key, value, version)
          VALUES (${collection}, ${jsonValue}::jsonb, 1)
          ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value,
              version = collections.version + 1,
              updated_at = CURRENT_TIMESTAMP
        `;
        const updated = await sql`SELECT version FROM collections WHERE key = ${collection}`;
        console.log(`[proxy/data] PUT ${collection}: OK, version=${updated[0]?.version}`);
        return res.status(200).json({ success: true, version: updated[0]?.version || 1 });
      }

      if (req.method === 'DELETE') {
        await sql`DELETE FROM collections WHERE key = ${collection}`;
        return res.status(200).json({ success: true });
      }
    } catch (err) {
      console.error('[proxy/data] Neon error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // ── Ruta directa: /api/proxy/data/batch → Neon sin HTTP interno ─────────────
  if (pathStr === 'data/batch') {
    try {
      const sql = neon(process.env.DATABASE_URL);
      if (req.method === 'GET') {
        const keys = (req.query.keys || '').split(',').filter(Boolean);
        const result = {};
        for (const key of keys) {
          if (!ALLOWED_COLLECTIONS.test(key)) continue;
          const rows = await sql`SELECT value, version FROM collections WHERE key = ${key}`;
          if (rows.length) result[key] = { data: rows[0].value, version: rows[0].version || 1 };
        }
        return res.status(200).json(result);
      }
      if (req.method === 'PUT') {
        const entries = req.body || {};
        for (const [key, value] of Object.entries(entries)) {
          if (!ALLOWED_COLLECTIONS.test(key)) continue;
          const jsonValue = JSON.stringify(value);
          await sql`
            INSERT INTO collections (key, value, version) VALUES (${key}, ${jsonValue}::jsonb, 1)
            ON CONFLICT (key) DO UPDATE
            SET value = EXCLUDED.value, version = collections.version + 1, updated_at = CURRENT_TIMESTAMP
          `;
        }
        return res.status(200).json({ success: true });
      }
    } catch (err) {
      console.error('[proxy/batch] Neon error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // ── Resto de rutas: forward HTTP con x-api-key ──────────────────────────────
  const ALLOWED_FORWARD = /^(documents|budget-log|docs|voluntarios|panel\/auth|images)(\/[a-zA-Z0-9_\-[\]{}@.]*)?$/;
  if (!ALLOWED_FORWARD.test(pathStr)) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  // API_KEY solo necesaria para forward HTTP (no para Neon directo)
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Service misconfigured: API_KEY not set' });
  }

  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : req.headers.host
        ? `https://${req.headers.host}`
        : null;

  if (!baseUrl) {
    return res.status(503).json({ error: 'Cannot determine server base URL' });
  }

  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query || {})) {
    if (k !== 'path') searchParams.set(k, v);
  }
  const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const targetUrl = `${baseUrl}/api/${pathStr}${queryStr}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey,
        'x-forwarded-for': req.headers['x-forwarded-for'] || '' },
    };
    if (['PUT','POST'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    const response = await fetch(targetUrl, fetchOptions);
    const ct = response.headers.get('content-type') || '';
    res.status(response.status);
    if (ct.includes('application/json')) return res.json(await response.json());
    return res.send(await response.text());
  } catch (err) {
    console.error('[proxy] HTTP forward error:', err.message);
    return res.status(502).json({ error: 'Proxy error' });
  }
}
