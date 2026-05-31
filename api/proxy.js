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
// MEJORA-03: instancia compartida — evita múltiples conexiones por módulo
import { sql } from './lib/db.js';
import { logError, requestContext } from './lib/logger.js';
import { verifySessionToken, readSessionCookie, createSessionToken, buildSessionCookie } from './lib/session.js';

const ALLOWED_COLLECTIONS = /^teg_(voluntarios|logistica|presupuesto|camisetas|patrocinadores|pat_log|localizaciones|documentos|proyecto|event_config|scenarios|codigos_promo|panel_pin_hash|panel_pin_length|escenarios|dia_carrera|scenario_active_name|auto_backup)_?v?\d*(_[a-zA-Z0-9]+)*$/;

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = [
    process.env.ALLOWED_ORIGIN || '',
    'http://localhost:5173',
    'http://localhost:4173',
  ].filter(Boolean);
  // SEC-M1: igualdad EXACTA de origen (startsWith permitía bypass por prefijo/subdominio).
  if (origin && allowed.includes(origin)) {
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

/**
 * Reenvía la petición al endpoint /api/<pathStr> inyectando x-api-key server-side.
 * Relayea Set-Cookie del downstream (p.ej. la cookie de sesión que emite panel/auth)
 * salvo que ya se haya fijado una cookie (sesión deslizante de las rutas data/*).
 */
async function forwardWithApiKey(req, res, pathStr) {
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
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-forwarded-for': req.headers['x-forwarded-for'] || '',
      },
    };
    if (['PUT', 'POST'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    const response = await fetch(targetUrl, fetchOptions);

    // Relay de la cookie de sesión emitida por el downstream (panel/auth).
    const setCookies = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);
    if (setCookies.length && !res.getHeader('Set-Cookie')) {
      res.setHeader('Set-Cookie', setCookies);
    }

    const ct = response.headers.get('content-type') || '';
    res.status(response.status);
    if (ct.includes('application/json')) return res.json(await response.json());
    return res.send(await response.text());
  } catch (err) {
    logError('[proxy]', err, { ...requestContext(req), forward: true });
    return res.status(502).json({ error: 'Proxy error' });
  }
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
    const apiKey = process.env.API_KEY;
    const providedKey = req.headers['x-api-key'];
    if (!apiKey || providedKey !== apiKey) {
      return res.status(200).json({ status: 'ok' });
    }
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
        const vols = await sql`SELECT jsonb_array_length(value) as n FROM collections WHERE key='teg_voluntarios_v1_voluntarios'`;
        if (vols.length > 0) {
          // SEC-M2: solo conteos — sin nombres, teléfonos ni mensajes (PII fuera de diagnóstico).
          out.voluntarios_en_neon = `${vols[0].n} voluntarios`;
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

  // ── Datos de negocio: data/:collection y data/batch ───────────────────────
  // SEC-AUTHZ (Mejora 2): antes el proxy hablaba con Neon SIN autenticar (cualquiera
  // con curl/Postman leía/escribía/borraba todo; CORS no protege fuera del navegador).
  // Ahora exige una sesión de panel válida y REENVÍA a los endpoints /api/data/*
  // autenticados (única implementación: x-api-key + allowlist + optimistic locking),
  // eliminando la lógica Neon duplicada y divergente.
  const isBatch = pathStr === 'data/batch';
  const collMatch = !isBatch && pathStr.match(/^data\/([^/?]+)$/);
  if (isBatch || collMatch) {
    if (!verifySessionToken(readSessionCookie(req))) {
      return res.status(401).json({ error: 'Unauthorized: sesión de panel requerida' });
    }
    // Defensa en profundidad: validar allowlist también aquí (el downstream repite).
    if (collMatch && !ALLOWED_COLLECTIONS.test(collMatch[1])) {
      return res.status(403).json({ error: 'Collection not allowed' });
    }
    // Sesión deslizante: renovar 8 h en cada acceso autenticado.
    const fresh = createSessionToken();
    if (fresh) res.setHeader('Set-Cookie', buildSessionCookie(fresh));
    return forwardWithApiKey(req, res, pathStr);
  }

  // ── Resto de rutas: forward HTTP con x-api-key ──────────────────────────────
  const ALLOWED_FORWARD = /^(documents|budget-log|docs|voluntarios|panel\/auth|images)(\/[a-zA-Z0-9_\-\[\]{}@.]*)?$/;
  if (!ALLOWED_FORWARD.test(pathStr)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  return forwardWithApiKey(req, res, pathStr);
}
