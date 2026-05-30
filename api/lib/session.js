/**
 * api/lib/session.js — Sesión firmada del panel (Mejora 2, SEC-AUTHZ)
 *
 * Problema que resuelve:
 *   Las rutas data/* del proxy BFF (api/proxy.js) hablaban directamente con Neon
 *   SIN comprobar autenticación: cualquiera (curl/Postman, ignorando CORS) podía
 *   leer/escribir/borrar todas las colecciones de negocio. Broken Function Level
 *   Authorization (OWASP API5).
 *
 * Diseño:
 *   - Tras un PIN correcto (api/panel/auth.js) se emite un token de sesión firmado
 *     con HMAC-SHA256 y un secreto de servidor.
 *   - El token viaja en una cookie httpOnly + Secure + SameSite=Strict, así que el
 *     JavaScript del navegador no puede leerlo (mitiga XSS) ni enviarse cross-site
 *     (mitiga CSRF).
 *   - El proxy valida la cookie antes de tocar datos. Sin sesión → 401.
 *
 * Secreto:
 *   Usa SESSION_SECRET; si no está, cae a API_KEY (también secreto de servidor de
 *   alta entropía) para no bloquear el panel si el entorno aún no define el nuevo
 *   secreto. Recomendado: configurar SESSION_SECRET propio en producción.
 */

import crypto from 'crypto';

export const COOKIE_NAME = 'panel_session';
export const DEFAULT_TTL_SEC = 8 * 60 * 60; // 8 h (sesión deslizante)

function getSecret() {
  return process.env.SESSION_SECRET || process.env.API_KEY || '';
}

/**
 * Crea un token de sesión firmado: base64url(payload).base64url(hmac).
 * @returns {string|null} token, o null si no hay secreto configurado.
 */
export function createSessionToken(ttlSec = DEFAULT_TTL_SEC) {
  const secret = getSecret();
  if (!secret) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = { iat: nowSec, exp: nowSec + ttlSec };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * Verifica firma + expiración en tiempo constante.
 * @returns {boolean}
 */
export function verifySessionToken(token) {
  const secret = getSecret();
  if (!secret || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [body, sig] = parts;

  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  if (typeof payload.exp !== 'number') return false;
  return payload.exp >= Math.floor(Date.now() / 1000);
}

/**
 * Construye el header Set-Cookie para la sesión.
 */
export function buildSessionCookie(token, ttlSec = DEFAULT_TTL_SEC) {
  return `${COOKIE_NAME}=${token}; Max-Age=${ttlSec}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * Lee el token de sesión desde la cookie de la petición.
 * @returns {string|null}
 */
export function readSessionCookie(req) {
  const raw = req.headers?.cookie || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return m ? m[1] : null;
}
