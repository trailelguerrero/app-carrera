/**
 * api/panel/auth.js — Autenticación bcrypt del panel de gestión (Fase 4)
 *
 * Modelo de amenaza:
 *   - Protege el PIN del panel contra extracción offline desde Neon.
 *   - El hash bcrypt ($2b$10$) es computacionalmente costoso de romper.
 *   - Rate limiting persistente en PostgreSQL protege contra fuerza bruta
 *     remota (sobrevive cold starts y múltiples instancias serverless).
 *   - El lockout en localStorage (Fase 0) protege acceso físico al dispositivo.
 *   - NO se revela si el PIN es correcto o incorrecto más allá de { valid: boolean }.
 *
 * Limitaciones serverless:
 *   - bcrypt con 10 rondas tarda ~100 ms en Vercel Edge — aceptable.
 *   - NO usar > 12 rondas: riesgo de timeout en funciones con límite de 10 s.
 *
 * Acciones:
 *   POST { action: "verify", pin: "..." }
 *     → { valid: boolean }
 *   POST { action: "change", currentPin: "...", newPin: "..." }
 *     → { ok: boolean }
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from '../lib/rateLimiter.js';

// Clave en Neon donde se almacena el hash del PIN del panel
const PANEL_PIN_KEY = 'teg_panel_pin_v1';

// Hash djb2 legacy (solo para migración transparente de hashes anteriores a Fase 4)
function hashPinLegacy(pin) {
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
  }
  return String(h);
}

// DEFAULT_PIN eliminado [F10-01] — sin hash almacenado → acceso denegado.
// Usar flujo de primer uso para establecer el PIN inicial.

function getCorsHeaders(req) {
  const origin = req.headers.origin || '';
  const allowed = [
    process.env.ALLOWED_ORIGIN || '',
    'http://localhost:5173',
    'http://localhost:4173',
  ].filter(Boolean);
  return allowed.some(o => origin.startsWith(o)) ? origin : null;
}

/**
 * Obtiene el hash almacenado en Neon para la clave del panel.
 * Devuelve null si no existe — en ese caso el acceso es denegado (no hay fallback).
 */
async function getStoredHash(sql) {
  try {
    const rows = await sql`SELECT value FROM collections WHERE key = ${PANEL_PIN_KEY}`;
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Guarda el hash bcrypt en Neon (upsert).
 */
async function saveHash(sql, hash) {
  await sql`
    INSERT INTO collections (key, value)
    VALUES (${PANEL_PIN_KEY}, ${JSON.stringify(hash)}::jsonb)
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
  `;
}

/**
 * Verifica el PIN contra el hash almacenado.
 * Soporta migración transparente djb2 → bcrypt:
 *   - Si el hash empieza con $2b$ o $2a$: usar bcrypt.compareSync
 *   - Si no: comparar como djb2 y, si es válido, migrar a bcrypt
 *
 * @returns {{ valid: boolean, needsUpgrade: boolean, upgradedHash?: string }}
 */
async function verifyAndMaybeUpgrade(sql, pin) {
  let stored = await getStoredHash(sql);

  // Sin hash almacenado → PIN no establecido → acceso denegado. Usar flujo de primer uso.
  if (!stored) {
    return { valid: false, needsUpgrade: false };
  }

  // El value en Neon viene como JSON string — desenvuelto por el driver
  const hashStr = typeof stored === 'string' ? stored : String(stored);

  if (hashStr.startsWith('$2')) {
    // Hash bcrypt — comparación segura
    const valid = bcrypt.compareSync(String(pin), hashStr);
    return { valid, needsUpgrade: false };
  }

  // Hash djb2 legacy — migrar si el PIN es correcto
  const valid = hashPinLegacy(String(pin)) === hashStr;
  if (valid) {
    const newHash = bcrypt.hashSync(String(pin), 10);
    await saveHash(sql, newHash).catch(() => {});
  }
  return { valid, needsUpgrade: valid };
}

export default async function handler(req, res) {
  // SEC-HTTP: Cabeceras de seguridad en todas las respuestas
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  // SEC-HSTS: fuerza HTTPS en visitas futuras (1 año). Previene downgrade a HTTP.
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // CORS
  const corsOrigin = getCorsHeaders(req);
  if (corsOrigin) res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Autenticación server-to-server (llamado desde proxy.js con x-api-key)
  const apiKey = process.env.API_KEY;
  if (!apiKey || req.headers['x-api-key'] !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.DATABASE_URL) {
    console.error('[panel/auth] DATABASE_URL no configurada');
    return res.status(503).json({ error: 'Servicio no disponible' });
  }

  const sql = neon(process.env.DATABASE_URL);

  // Rate limiting: 10 intentos por IP en 5 minutos
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const limited = await checkRateLimit(sql, ip, 'panel-auth', {
    max: 10,
    windowMs: 5 * 60 * 1000,
  });
  if (limited) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  }

  const { action, pin, currentPin, newPin } = req.body || {};

  // ── Acción: verify ────────────────────────────────────────────────────────
  if (action === 'verify') {
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ error: 'Parámetro inválido' });
    }

    try {
      const { valid } = await verifyAndMaybeUpgrade(sql, pin);
      // Respuesta mínima — no revelar información adicional
      return res.json({ valid });
    } catch (err) {
      console.error('[panel/auth] verify error:', err.message);
      return res.status(500).json({ error: 'Error interno' });
    }
  }

  // ── Acción: change ────────────────────────────────────────────────────────
  if (action === 'change') {
    if (!currentPin || !newPin ||
        typeof currentPin !== 'string' || typeof newPin !== 'string') {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }
    if (newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      return res.status(400).json({ error: 'El nuevo PIN debe tener entre 4 y 8 dígitos' });
    }

    try {
      const { valid } = await verifyAndMaybeUpgrade(sql, currentPin);
      if (!valid) {
        return res.json({ ok: false });
      }

      const newHash = bcrypt.hashSync(String(newPin), 10);
      await saveHash(sql, newHash);
      return res.json({ ok: true });
    } catch (err) {
      console.error('[panel/auth] change error:', err.message);
      return res.status(500).json({ error: 'Error interno' });
    }
  }

  return res.status(400).json({ error: 'Acción no reconocida' });
}
