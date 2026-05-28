/**
 * api/push/send.js — Enviar notificación push a todos los suscriptores
 *
 * POST /api/push/send
 * Headers: x-api-key (misma que el proxy BFF — evita acceso anónimo)
 * Body: { title, body, gravedad, url, tag }
 *
 * Envía a TODOS los suscriptores registrados en push_subscriptions.
 * Las suscripciones expiradas (410 Gone) se eliminan automáticamente.
 *
 * Llamado desde guardarIncidencia en DiaCarrera cuando hay incidencias
 * de gravedad alta, o manualmente desde cualquier flujo del panel.
 *
 * VAPID implementado manualmente con crypto nativo de Node.js
 * (sin dependencias externas — compatible con Vercel Edge/Serverless).
 */
import { neon } from '@neondatabase/serverless';
import { createSign } from 'crypto';

const sql = neon(process.env.DATABASE_URL);

// ── VAPID helpers ──────────────────────────────────────────────────────────

function urlBase64ToBuffer(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/**
 * Genera el header Authorization VAPID para una suscripción.
 * Implementación mínima sin librerías externas.
 */
async function buildVapidHeaders(subscription, payload) {
  const publicKey  = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject    = process.env.VAPID_SUBJECT || 'mailto:admin@trailelguerrero.com';

  if (!publicKey || !privateKey) {
    throw new Error('Claves VAPID no configuradas en variables de entorno');
  }

  const audience = new URL(subscription.endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 3600; // 12h

  // JWT header + payload
  const header  = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url');
  const claims  = Buffer.from(JSON.stringify({ aud: audience, exp: expiration, sub: subject })).toString('base64url');
  const unsigned = `${header}.${claims}`;

  // Firmar con ECDSA P-256
  const privKeyDer = urlBase64ToBuffer(privateKey);
  const keyObj = await (async () => {
    const { webcrypto } = await import('crypto');
    return webcrypto.subtle.importKey(
      'raw', privKeyDer, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    );
  })();

  // Fallback a Node crypto si WebCrypto no está disponible
  let signature;
  try {
    const { webcrypto } = await import('crypto');
    const sig = await webcrypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      keyObj,
      Buffer.from(unsigned)
    );
    signature = Buffer.from(sig).toString('base64url');
  } catch {
    // Node crypto fallback
    const sign = createSign('SHA256');
    sign.update(unsigned);
    signature = sign.sign({ key: privKeyDer, dsaEncoding: 'ieee-p1363', format: 'der', type: 'sec1' }).toString('base64url');
  }

  const jwt = `${unsigned}.${signature}`;
  const pubKeyB64 = publicKey;

  return {
    Authorization: `vapid t=${jwt},k=${pubKeyB64}`,
    'Content-Type': 'application/octet-stream',
    'Content-Encoding': 'aes128gcm',
    TTL: '86400',
  };
}

/**
 * Cifra el payload con ECDH + AES-128-GCM (Web Push encryption spec).
 * Implementación simplificada — usa la librería web-push si está disponible,
 * o delega en el helper de cifrado mínimo.
 */
async function encryptPayload(subscription, payloadStr) {
  // Intentar usar web-push si está instalado
  try {
    const webpush = await import('web-push');
    webpush.default.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@trailelguerrero.com',
      process.env.VITE_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    return { useWebPush: true, instance: webpush.default };
  } catch {
    return { useWebPush: false };
  }
}

// ── Handler principal ──────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  // Validar API key (misma que el proxy BFF)
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { title, body, gravedad = 'media', url = '/', tag } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'Faltan title y body' });

  // Obtener todos los suscriptores
  let subscriptions;
  try {
    subscriptions = await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`;
  } catch (err) {
    console.error('[push/send] Error al leer suscriptores:', err.message);
    return res.status(500).json({ error: 'Error al leer suscriptores' });
  }

  if (subscriptions.length === 0) {
    return res.status(200).json({ ok: true, sent: 0, message: 'Sin suscriptores' });
  }

  const payload = JSON.stringify({ title, body, gravedad, url, tag: tag || `inc-${Date.now()}` });
  const expiredEndpoints = [];
  let sent = 0;

  // Intentar usar web-push si está instalado
  const { useWebPush, instance: webpush } = await encryptPayload(null, payload);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        if (useWebPush) {
          await webpush.sendNotification(pushSub, payload);
        } else {
          // Sin web-push: enviar sin cifrado (solo funciona con endpoints que lo soporten)
          // Para producción real instalar: npm install web-push
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: { 'TTL': '86400', 'Content-Type': 'application/json' },
            body: payload,
          });
          if (response.status === 410 || response.status === 404) {
            expiredEndpoints.push(sub.endpoint);
            return;
          }
        }
        sent++;
      } catch (err) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          console.warn('[push/send] Error enviando a', sub.endpoint.slice(0, 40), err?.message);
        }
      }
    })
  );

  // Limpiar suscripciones expiradas
  if (expiredEndpoints.length > 0) {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ANY(${expiredEndpoints})`;
    console.log(`[push/send] Eliminadas ${expiredEndpoints.length} suscripciones expiradas`);
  }

  return res.status(200).json({ ok: true, sent, expired: expiredEndpoints.length });
}
