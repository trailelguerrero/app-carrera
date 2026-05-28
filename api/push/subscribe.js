/**
 * api/push/subscribe.js — Guardar suscripción push de un dispositivo
 *
 * POST /api/push/subscribe
 * Body: PushSubscription JSON { endpoint, keys: { p256dh, auth } }
 *
 * Guarda la suscripción en la tabla push_subscriptions de Neon.
 * La tabla se crea automáticamente si no existe (idempotente).
 *
 * Sin autenticación de panel: cualquier dispositivo puede suscribirse.
 * El endpoint es el identificador único — duplicados se actualizan (upsert).
 */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Suscripción inválida — faltan campos obligatorios' });
  }

  try {
    // Crear tabla si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint   TEXT PRIMARY KEY,
        p256dh     TEXT NOT NULL,
        auth       TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Upsert: si el endpoint ya existe, actualizar claves
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
    console.error('[push/subscribe] Error:', err.message);
    return res.status(500).json({ error: 'Error al guardar suscripción' });
  }
}
