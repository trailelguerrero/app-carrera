/**
 * pinAuth.js — T3.1 + SEC-01 (Fase 0)
 * Lógica de autenticación por PIN para el panel de gestión.
 * Extraído de Index.jsx para separar responsabilidades.
 *
 * Lockout (SEC-01):
 *   - Hasta MAX_FAILS intentos fallidos consecutivos.
 *   - Al superarlos: bloqueo de LOCKOUT_MS ms (5 min).
 *   - Un intento correcto limpia el contador.
 *
 * NOTA: hashPin usa djb2 (no criptográfico, SEC-01 pendiente Fase 7).
 * Para PIN de 4-6 dígitos es suficiente para protección casual del panel.
 */

import {
  SK_AUTH_PIN_HASH,
  SK_AUTH_AUTHED,
  SK_AUTH_SESSION_VER,
  SK_AUTH_FAIL_COUNT,
  SK_AUTH_LOCKOUT_UNTIL,
  SK_AUTH_PIN_LENGTH,
} from "../../constants/storageKeys";

/** @deprecated Usar SK_AUTH_PIN_HASH de storageKeys */
export const PIN_KEY           = SK_AUTH_PIN_HASH;
/** @deprecated Usar SK_AUTH_AUTHED de storageKeys */
export const AUTH_KEY          = SK_AUTH_AUTHED;
/** @deprecated Usar SK_AUTH_SESSION_VER de storageKeys */
export const SESSION_VER       = SK_AUTH_SESSION_VER;
/** @deprecated Usar SK_AUTH_FAIL_COUNT de storageKeys */
export const FAIL_COUNT_KEY    = SK_AUTH_FAIL_COUNT;
/** @deprecated Usar SK_AUTH_LOCKOUT_UNTIL de storageKeys */
export const LOCKOUT_UNTIL_KEY = SK_AUTH_LOCKOUT_UNTIL;
/** Incrementar para invalidar todas las sesiones activas */
export const CURRENT_VER       = "2";
export const DEFAULT_PIN       = "1975";
/** Duración de sesión del panel: 8 horas */
export const SESSION_TTL_PANEL = 8 * 3600 * 1000;
/** Intentos fallidos antes de bloquear */
export const MAX_FAILS         = 10;
/** Duración del bloqueo: 5 minutos */
export const LOCKOUT_MS        = 5 * 60 * 1000;

/**
 * Hash djb2 no criptográfico.
 * SEC-01: suficiente para un panel con acceso físico controlado.
 * Migrar a bcrypt/PBKDF2 en Fase 7 si se requiere seguridad elevada.
 */
export function hashPin(pin) {
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
  }
  return String(h);
}

/** Verifica si la sesión activa es válida */
export function checkSession() {
  try {
    const exp = Number(localStorage.getItem(AUTH_KEY) || 0);
    const ver = localStorage.getItem(SESSION_VER);
    if (exp > Date.now() && ver === CURRENT_VER) return true;
    localStorage.removeItem(AUTH_KEY);
    return false;
  } catch { return false; }
}

/** Crea una sesión tras PIN correcto */
export function createSession() {
  localStorage.setItem(AUTH_KEY, String(Date.now() + SESSION_TTL_PANEL));
  localStorage.setItem(SESSION_VER, CURRENT_VER);
}

/** Verifica el PIN introducido contra el hash almacenado */
export function verifyPin(pin) {
  const stored = localStorage.getItem(PIN_KEY) || hashPin(DEFAULT_PIN);
  return hashPin(pin) === stored;
}

/** Guarda un nuevo hash de PIN */
export function savePin(pin) {
  localStorage.setItem(PIN_KEY, hashPin(pin));
}

/**
 * Devuelve la longitud configurada del PIN: 4 (defecto) o 6.
 * Si SK_AUTH_PIN_LENGTH no existe o tiene un valor inesperado, devuelve 4
 * para garantizar compatibilidad con PINs existentes.
 */
export function getPinLength() {
  try {
    const stored = Number(localStorage.getItem(SK_AUTH_PIN_LENGTH));
    return stored === 6 ? 6 : 4;
  } catch { return 4; }
}

/** Persiste la longitud del PIN elegida (4 o 6). */
export function savePinLength(length) {
  localStorage.setItem(SK_AUTH_PIN_LENGTH, String(length === 6 ? 6 : 4));
}

// ── Lockout (SEC-01) ─────────────────────────────────────────────────────────

/**
 * Devuelve el estado actual del lockout.
 * @returns {{ locked: boolean, secondsLeft: number, fails: number }}
 */
export function getLockoutStatus() {
  try {
    const until = Number(localStorage.getItem(LOCKOUT_UNTIL_KEY) || 0);
    const fails  = Number(localStorage.getItem(FAIL_COUNT_KEY) || 0);
    const now    = Date.now();
    if (until > now) {
      return { locked: true, secondsLeft: Math.ceil((until - now) / 1000), fails };
    }
    // Si el lockout expiró, limpiarlo automáticamente
    if (until > 0 && until <= now) {
      localStorage.removeItem(LOCKOUT_UNTIL_KEY);
      localStorage.removeItem(FAIL_COUNT_KEY);
    }
    return { locked: false, secondsLeft: 0, fails };
  } catch {
    return { locked: false, secondsLeft: 0, fails: 0 };
  }
}

/**
 * Registra un intento fallido. Si se alcanzan MAX_FAILS activa el lockout.
 * @returns {{ locked: boolean, secondsLeft: number, fails: number }}
 */
export function recordFailedAttempt() {
  try {
    const fails = Number(localStorage.getItem(FAIL_COUNT_KEY) || 0) + 1;
    localStorage.setItem(FAIL_COUNT_KEY, String(fails));
    if (fails >= MAX_FAILS) {
      const until = Date.now() + LOCKOUT_MS;
      localStorage.setItem(LOCKOUT_UNTIL_KEY, String(until));
      return { locked: true, secondsLeft: Math.ceil(LOCKOUT_MS / 1000), fails };
    }
    return { locked: false, secondsLeft: 0, fails };
  } catch {
    return { locked: false, secondsLeft: 0, fails: 0 };
  }
}

/**
 * Limpia el contador de fallos tras un intento correcto.
 */
export function clearFailedAttempts() {
  try {
    localStorage.removeItem(FAIL_COUNT_KEY);
    localStorage.removeItem(LOCKOUT_UNTIL_KEY);
  } catch { /* ignorar */ }
}

// ── Verificación remota bcrypt (Fase 4) ──────────────────────────────────────

/**
 * Verifica el PIN contra el endpoint bcrypt server-side.
 * Si el servidor no responde en 3 s, hace fallback a la verificación local djb2.
 *
 * Modelo de amenaza del fallback:
 *   - El fallback djb2 es válido mientras el servidor no esté disponible.
 *   - La migración a bcrypt en Neon ocurre la primera vez que el servidor
 *     responde correctamente, de forma transparente.
 *   - El fallback no degrada la seguridad frente a ataques remotos: si el
 *     servidor no responde, tampoco hay sesión de Neon que comprometer.
 *
 * @param {string} pin
 * @returns {Promise<boolean>}
 */
export async function verifyPinWithFallback(pin) {
  try {
    const res = await Promise.race([
      fetch('/api/proxy/panel/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', pin }),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      ),
    ]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { valid } = await res.json();
    return valid;
  } catch (err) {
    console.warn('[auth] Fallback a verificación local:', err.message);
    return verifyPin(pin);
  }
}

/**
 * Cambia el PIN llamando al endpoint server-side.
 * Devuelve { ok: boolean } o lanza error si el servidor no responde.
 *
 * @param {string} currentPin
 * @param {string} newPin
 * @returns {Promise<{ ok: boolean }>}
 */
export async function changePinRemote(currentPin, newPin) {
  const res = await Promise.race([
    fetch('/api/proxy/panel/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change', currentPin, newPin }),
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    ),
  ]);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { ok: boolean }
}
