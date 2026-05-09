/**
 * pinAuth.js — T3.1
 * Lógica de autenticación por PIN para el panel de gestión.
 * Extraído de Index.jsx para separar responsabilidades.
 *
 * NOTA: hashPin usa djb2 (no criptográfico, SEC-01 pendiente Fase 7).
 * Para PIN de 4-6 dígitos es suficiente para protección casual del panel.
 */

export const PIN_KEY = "teg_panel_pin_hash";
export const AUTH_KEY = "teg_panel_authed";
export const SESSION_VER = "teg_panel_session_ver";
/** Incrementar para invalidar todas las sesiones activas */
export const CURRENT_VER = "2";
export const DEFAULT_PIN = "1975";
/** Duración de sesión del panel: 8 horas */
export const SESSION_TTL_PANEL = 8 * 3600 * 1000;

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
