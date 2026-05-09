/**
 * BFF (Backend-For-Frontend) Proxy — SEC-01 Fix
 *
 * Recibe las peticiones del frontend SIN api-key y las reenvía
 * a los endpoints internos añadiendo el API_KEY desde las variables
 * de entorno del servidor (nunca expuesto al cliente).
 *
 * Rutas soportadas:
 *   GET/PUT/DELETE/POST /api/proxy/data/:collection
 *   GET/PUT             /api/proxy/data/batch
 *   GET/PUT/DELETE      /api/proxy/documents/:id
 *   GET/PUT/DELETE      /api/proxy/budget-log
 *   GET/POST/DELETE     /api/proxy/docs/:patId
 *   POST                /api/proxy/voluntarios  (action=reset-pin, action=delete)
 *
 * El frontend llama a /api/proxy/* y este módulo hace el forward interno.
 */

const ALLOWED_PATHS = /^\/api\/(data|documents|budget-log|docs|voluntarios)(\/[a-zA-Z0-9_\-[\]{}@.]*)?(\?.*)?$/;

export default async function handler(req, res) {
  // CORS — solo el propio dominio Vercel o localhost en dev
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    process.env.ALLOWED_ORIGIN || '',   // ej: https://app-carrera.vercel.app
    'http://localhost:5173',
    'http://localhost:4173',
  ].filter(Boolean);

  if (origin && allowedOrigins.some(o => origin.startsWith(o))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Validar que API_KEY está configurado en el servidor
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error('[proxy] API_KEY no configurada en el servidor');
    return res.status(503).json({ error: 'Service misconfigured' });
  }

  // Reconstruir la ruta real: /api/proxy/data/X → /api/data/X
  // req.url en Vercel incluye el path completo desde la función
  const proxyPath = req.query.path; // capturado por vercel.json rewrite
  if (!proxyPath) {
    return res.status(400).json({ error: 'Missing path param' });
  }

  // Normalizar a string si es array (Vercel catch-all)
  const pathStr = Array.isArray(proxyPath) ? proxyPath.join('/') : proxyPath;
  const targetPath = `/api/${pathStr}`;

  // Allowlist de rutas para evitar SSRF
  if (!ALLOWED_PATHS.test(targetPath)) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  // Solo permitir los métodos esperados
  const allowed = ['GET', 'PUT', 'DELETE', 'POST'];
  if (!allowed.includes(req.method)) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Construir la URL interna (llamada server-to-server dentro de Vercel)
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  // Preservar query params del request original (ej: keys=... para batch, id=... para documents)
  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query || {})) {
    if (k !== 'path') searchParams.set(k, v); // excluir el param 'path' que es interno al proxy
  }
  const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const targetUrl = `${baseUrl}${targetPath}${queryStr}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,          // ← inyectado server-side, nunca al cliente
        'x-forwarded-for': req.headers['x-forwarded-for'] || '',
      },
    };

    if (['PUT', 'POST'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    
    res.status(response.status);
    
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.json(data);
    }
    
    const text = await response.text();
    return res.send(text);

  } catch (err) {
    console.error('[proxy] Error forwarding request:', err.message);
    return res.status(502).json({ error: 'Proxy error' });
  }
}
