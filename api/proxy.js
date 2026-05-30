/**
 * BFF (Backend-For-Frontend) Proxy — SEC-01
 *
 * Rutas /api/proxy/data/:collection → Neon directamente (sin HTTP interno).
 * Resto de rutas → forward HTTP con x-api-key inyectada server-side.
 *
 * MEJORA-02: sql instanciado a nivel de módulo para reutilizar la conexión
 * HTTP de Neon entre peticiones en la misma instancia serverless.
 * Batch GET usa Promise.all para queries paralelas (~4-6× más rápido).
 */
import { neon } from '@neondatabase/serverless';

const ALLOWED_COLLECTIONS = /^teg_(voluntarios|logistica|presupuesto|camisetas|patrocinadores|pat_log|localizaciones|documentos|proyecto|event_config|scenarios|codigos_promo|panel_pin_hash|panel_pin_length|escenarios|dia_carrera|scenario_active_name|auto_backup)_?v?\d*(_[a-zA-Z0-9]+)*$/;

// MEJORA-02: instancia única a nivel de módulo — reutilizada entre requests
const sql = neon(process.env.DATABASE_URL);

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
}

/**
 * SEC-HTTP: Cabeceras de seguridad HTTP en todas las respuestas del proxy.
 */
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'"
  );
  // SEC-HSTS: fuerza HTTPS en visitas futuras (1 año). Previene downgrade a HTTP.
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

export default async function handler(req, res) {
  setCors(req, res);
  setSecurityHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const proxyPath = req.query.path;
  if (!proxyPath) return res.status(400).json({ error: 'Missing path param' });

  const pathStr = Array.isArray(proxyPath) ? proxyPath.join('/') : String(proxyPath);

  // ── Ruta de diagnóstico: /api/proxy/health ───────────────────────────────
  if (pathStr === 'health') {
    const out = {};
    out.env_DATABASE_URL    = process.env.DATABASE_URL    ? '✓ configurada' : '✗ NO CONFIGURADA — ESTE ES EL PROBLEMA';
    out.env_DIRECT_URL      = process.env.DIRECT_URL      ? '✓ configurada (DDL usará conexión directa)' : '✗ no configurada (DDL usa DATABASE_URL pooled — recomendado configurar)';
    out.env_API_KEY         = process.env.API_KEY         ? '✓ configurada' : '✗ no configurada (solo necesaria para auth de panel)';
    out.env_ALLOWED_ORIGIN  = process.env.ALLOWED_ORIGIN  || '(no configurada — OK si mismo dominio)';
    out.env_VERCEL_URL      = process.env.VERCEL_URL      || '(no configurada)';
    if (!process.env.DATABASE_URL) return res.status(200).json(out);
    try {
      const tableCheck = await sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collections') as exists`;
      out.table_collections = tableCheck[0]?.exists ? '✓ existe' : '✗ NO EXISTE — ejecutar /api/setup';
      if (tableCheck[0]?.exists) {
        const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='collections' ORDER BY ordinal_position`;
        out.columns = cols.map(c => c.column_name).join(', ');
        const count = await sql`SELECT COUNT(*) as n FROM collections`;
        out.total_collections = parseInt(count[0]?.n || 0);
        const vols = await sql`SELECT jsonb_array_length(value) as n, value as data FROM collections WHERE key='teg_voluntarios_v1_voluntarios'`;
        if (vols.length > 0) {
          const arr = vols[0].data;
          out.voluntarios_en_neon = `${vols[0].n} voluntarios`;
          out.muestra_voluntarios = arr.slice(0, 5).map(v => ({
            id: v.id,
            nombre: `${v.nombre || ''} ${v.apellidos || ''}`.trim(),
            estado: v.estado,
            puestoId: v.puestoId ?? 'null',
            puestoId_tipo: typeof v.puestoId,
            tieneSessionToken: !!v.sessionToken,
            mensajeOrganizador: v.mensajeOrganizador ? v.mensajeOrganizador.substring(0,30)+'...' : null,
            mensajeParaOrg: v.mensajeParaOrganizador ? v.mensajeParaOrganizador.substring(0,30)+'...' : null,
          }));
          out.con_puesto = arr.filter(v => v.puestoId != null).length;
          out.sin_puesto = arr.filter(v => v.puestoId == null).length;
        } else {
          out.voluntarios_en_neon = '✗ colección no existe aún';
        }
        const testKey = '__health_test__';
        const testVal = JSON.stringify({ ts: new Date().toISOString() });
        await sql`INSERT INTO collections (key,value,version) VALUES (${testKey},${testVal}::jsonb,1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP`;
        const rb = await sql`SELECT value FROM collections WHERE key=${testKey}`;
        out.write_test = rb.length > 0 ? '✓ escritura y lectura OK' : '✗ escritura falló';
        await sql`DELETE FROM collections WHERE key=${testKey}`;
      }
      out.status = '✅ Neon funciona correctamente';
    } catch(err) {
      out.neon_error = err.message;
      out.status = '❌ ERROR DE NEON';
    }
    return res.status(200).json(out);
  }

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
      if (req.method === 'GET') {
        const keys = (req.query.keys || '').split(',').filter(Boolean);
        // MEJORA-02: queries paralelas con Promise.all en lugar de bucle serie
        const validKeys = keys.filter(k => ALLOWED_COLLECTIONS.test(k));
        const rows = await Promise.all(
          validKeys.map(key => sql`SELECT value, version FROM collections WHERE key = ${key}`)
        );
        const result = {};
        validKeys.forEach((key, i) => {
          if (rows[i].length) result[key] = { data: rows[i][0].value, version: rows[i][0].version || 1 };
        });
        return res.status(200).json(result);
      }
      if (req.method === 'PUT') {
        const entries = req.body || {};
        await Promise.all(
          Object.entries(entries)
            .filter(([key]) => ALLOWED_COLLECTIONS.test(key))
            .map(([key, value]) => {
              const jsonValue = JSON.stringify(value);
              return sql`
                INSERT INTO collections (key, value, version) VALUES (${key}, ${jsonValue}::jsonb, 1)
                ON CONFLICT (key) DO UPDATE
                SET value = EXCLUDED.value, version = collections.version + 1, updated_at = CURRENT_TIMESTAMP
              `;
            })
        );
        return res.status(200).json({ success: true });
      }
    } catch (err) {
      console.error('[proxy/batch] Neon error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // ── Resto de rutas: forward HTTP con x-api-key ──────────────────────────────
  const ALLOWED_FORWARD = /^(documents|budget-log|docs|voluntarios|panel\/auth|images)(\/[a-zA-Z0-9_\-\[\]{}@.]*)?$/;
  if (!ALLOWED_FORWARD.test(pathStr)) {
    return res.status(400).json({ error: 'Invalid path' });
  }

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
