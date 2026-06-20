/**
 * lib/voluntarioAuthGuard.js — FIX-PIN-RACE
 *
 * Bug original: el panel de organizador (Logística, Camisetas, Proyecto,
 * DiaCarrera, etc.) lee la colección completa de voluntarios a memoria
 * (React/Zustand), y cualquier edición normal (cambiar talla, asignar
 * puesto, marcar coche...) vuelve a guardar el ARRAY ENTERO vía
 * PUT /api/data/[collection] o PUT /api/data/batch.
 *
 * Si esa copia en memoria es anterior a un reset-pin, cambio de PIN del
 * propio voluntario, o login (que también persiste sessionToken), el PUT
 * siguiente sobreescribe esos campos con el valor viejo — revirtiendo
 * silenciosamente el reset. No depende de versión de app ni de caché;
 * depende de cuándo el organizador edita el panel.
 *
 * Fix: los campos de autenticación de cada voluntario SOLO pueden
 * cambiar a través de api/voluntarios/index.js (auth, cambiar-pin,
 * reset-pin, recover-pin). Cualquier escritura de la colección completa
 * de voluntarios que llegue por los endpoints genéricos de colección
 * debe preservar el valor que ya existe en BD para estos campos,
 * ignorando lo que traiga el cliente.
 */

const VOLUNTARIOS_KEY = 'teg_voluntarios_v1_voluntarios';

/** Campos de autenticación que nunca deben venir del panel de organizador. */
const AUTH_FIELDS = ['pinHash', 'pinPersonalizado', 'sessionToken', 'sessionTokenExpiry'];

/**
 * @param {string} collectionKey - clave de la colección que se va a escribir
 * @returns {boolean} true si esta colección requiere protección de campos de auth
 */
export function isVoluntariosCollection(collectionKey) {
  return collectionKey === VOLUNTARIOS_KEY;
}

/**
 * Combina el array entrante (del panel) con el array actual en BD,
 * preservando los campos de auth del valor ya persistido.
 *
 * - Empareja por `id`.
 * - Si un voluntario del array entrante no existe en BD (alta nueva desde
 *   el panel), se deja tal cual — no hay nada que proteger todavía.
 * - Si un voluntario existe en ambos, los AUTH_FIELDS se toman SIEMPRE
 *   del valor en BD, el resto de campos se toman del valor entrante.
 * - Si un voluntario existía en BD pero no llega en el array entrante
 *   (eliminado desde el panel), simplemente no aparece — el panel sigue
 *   controlando altas/bajas con normalidad.
 *
 * @param {Array} incoming - array recibido en el PUT (lo que envía el panel)
 * @param {Array} current  - array actualmente en BD
 * @returns {Array} array a persistir, con campos de auth protegidos
 */
export function protegerCamposAuth(incoming, current) {
  if (!Array.isArray(incoming)) return incoming;
  if (!Array.isArray(current) || current.length === 0) return incoming;

  const currentById = new Map(current.map(v => [String(v?.id), v]));

  return incoming.map(v => {
    if (!v || v.id == null) return v;
    const real = currentById.get(String(v.id));
    if (!real) return v; // alta nueva — nada que proteger aún

    const merged = { ...v };
    for (const field of AUTH_FIELDS) {
      merged[field] = real[field];
    }
    return merged;
  });
}
