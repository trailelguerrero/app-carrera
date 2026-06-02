/**
 * api/push/index.js — Router unificado para Push Notifications
 *
 * Consolida send, subscribe y unsubscribe en una sola serverless function
 * para cumplir el límite de 12 functions del plan Hobby de Vercel.
 *
 * Rutas (via query param ?action=):
 *   POST /api/push?action=subscribe    — guardar suscripción
 *   POST /api/push?action=unsubscribe  — eliminar suscripción
 *   POST /api/push?action=send         — enviar push a todos (requiere x-api-key)
 *
 * Compatibilidad: el frontend también puede llamar con las URLs legacy
 *   /api/push/subscribe, /api/push/unsubscribe, /api/push/send
 * pero Vercel las enruta todas aquí si se eliminan los archivos individuales.
 */
import { neon } from '@neondatabase/serverless';
import { createSign } from 'crypto';
import { verifySessionToken, readSessionCookie } from '../lib/session.js';
import { logError, logWarn, logInfo } from '../lib/logger.js';
import { checkRateLimit } from '../lib/rateLimiter.js'; // MEJ-22

const sql = neon(process.env.DATABASE_URL);

// ── Auth helpers ──────────────────────────────────────────────────────────

// MEJ-20 SEC-M1: igualdad EXACTA de origen (wildcard eliminado)
function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = [
    process.env.ALLOWED_ORIGIN || '',
    'http://localhost:5173',
    'http://localhost:4173',
  ].filter(Boolean);
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
}

// PWA-11: push/send requiere sesión del panel (cookie firmada) en lugar de
// x-api-key en el cliente. La API key era VITE_* → expuesta en el bundle JS.
const requirePanelSession = (req, res) => {
  if (verifySessionToken(readSessionCookie(req))) return true;
  // Fallback para llamadas server-side legítimas (webhooks, scripts de admin)
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.API_KEY) return true;
  res.status(401).json({ error: 'No autorizado — se requiere sesión del panel' });
  return false;
};

// ── VAPID helpers ─────────────────────────────────────────────────────────

function urlBase64ToBuffer(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

async function encryptPayload() {
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

// ── Handlers ──────────────────────────────────────────────────────────────

async function handleSubscribe(req, res) {
  // MEJ-22: rate limit — 5 suscripciones/min por IP
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (await checkRateLimit(sql, ip, 'push-subscribe', { max: 5, windowMs: 60 * 1000 })) {
    return res.status(429).json({ error: 'Demasiadas suscripciones. Inténtalo en un momento.' });
  }

  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Suscripción inválida — faltan campos obligatorios' });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint   TEXT PRIMARY KEY,
        p256dh     TEXT NOT NULL,
        auth       TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, updated_at)
      VALUES (${endpoint}, ${keys.p256dh}, ${keys.auth}, NOW())
      ON CONFLICT (endpoint) DO UPDATE
        SET p256dh = EXCLUDED.p256dh,
            auth   = EXCLUDED.auth,
            updated_at = NOW()
    `;
    return res.status(201).json({ ok: true });
  } catch (err) {
    logError('[push/subscribe]', err);
    return res.status(500).json({ error: 'Error al guardar suscripción' });
  }
}

async function handleUnsubscribe(req, res) {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'Falta endpoint' });

  try {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
    return res.status(200).json({ ok: true });
  } catch (err) {
    logError('[push/unsubscribe]', err);
    return res.status(500).json({ error: 'Error al eliminar suscripción' });
  }
}

async function handleSend(req, res) {
  if (!requirePanelSession(req, res)) return;

  const { title, body, gravedad = 'media', url = '/', tag } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'Faltan title y body' });

  let subscriptions;
  try {
    subscriptions = await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`;
  } catch (err) {
    logError('[push/send]', err, { step: 'leer_suscriptores' });
    return res.status(500).json({ error: 'Error al leer suscriptores' });
  }

  if (subscriptions.length === 0) {
    return res.status(200).json({ ok: true, sent: 0, message: 'Sin suscriptores' });
  }

  const payload = JSON.stringify({ title, body, gravedad, url, tag: tag || `inc-${Date.now()}` });
  const expiredEndpoints = [];
  let sent = 0;

  const { useWebPush, instance: webpush } = await encryptPayload();

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      try {
        if (useWebPush) {
          await webpush.sendNotification(pushSub, payload);
        } else {
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
          logWarn('[push/send]', 'Error enviando notificación', { endpoint: sub.endpoint.slice(0, 40), message: err?.message });
        }
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ANY(${expiredEndpoints})`;
    logInfo('[push/send]', 'Suscripciones expiradas eliminadas', { count: expiredEndpoints.length });
  }

  return res.status(200).json({ ok: true, sent, expired: expiredEndpoints.length });
}

// ── Router principal ──────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Detectar acción: query param ?action= o por la URL (legacy path segment)
  const action = req.query.action || req.query[0] || '';

  if (action === 'subscribe')   return handleSubscribe(req, res);
  if (action === 'unsubscribe') return handleUnsubscribe(req, res);
  if (action === 'send')        return handleSend(req, res);

  return res.status(400).json({ error: 'Falta ?action=subscribe|unsubscribe|send' });
}
