/**
 * api/push/unsubscribe.js — Eliminar suscripción push de un dispositivo
 *
 * POST /api/push/unsubscribe
 * Body: { endpoint: string }
 */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'Falta endpoint' });

  try {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[push/unsubscribe] Error:', err.message);
    return res.status(500).json({ error: 'Error al eliminar suscripción' });
  }
}
