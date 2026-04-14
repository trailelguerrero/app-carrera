/**
 * API endpoint PÚBLICO para el formulario de registro de voluntarios.
 * 
 * SIN autenticación de panel — accesible desde /voluntarios/registro.
 * Lista blanca estricta: solo las colecciones necesarias para el formulario.
 * 
 * Colecciones de LECTURA permitidas (configuración del formulario):
 *   - teg_voluntarios_v1_puestos
 *   - teg_voluntarios_v1_imgFront
 *   - teg_voluntarios_v1_imgBack
 *   - teg_voluntarios_v1_imgGuiaTallas
 *   - teg_voluntarios_v1_opcionPuesto
 *   - teg_voluntarios_v1_opcionVehiculo
 * 
 * Colecciones de ESCRITURA permitidas (registro):
 *   - teg_voluntarios_v1_voluntarios  (solo APPEND, nunca sobreescribe el array)
 */
import { neon } from '@neondatabase/serverless';

// Lista blanca estricta — cualquier colección fuera de estas listas recibe 403
const READ_WHITELIST = new Set([
  'teg_voluntarios_v1_puestos',
  'teg_voluntarios_v1_imgFront',
  'teg_voluntarios_v1_imgBack',
  'teg_voluntarios_v1_imgGuiaTallas',
  'teg_voluntarios_v1_opcionPuesto',
  'teg_voluntarios_v1_opcionVehiculo',
]);

const WRITE_WHITELIST = new Set([
  'teg_voluntarios_v1_voluntarios',
]);

// CORS: solo GET y POST, sin credenciales
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // Añadir headers CORS a todas las respuestas
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  const { collection } = req.query;

  if (!collection) {
    return res.status(400).json({ error: 'Missing collection parameter' });
  }

  // GET — lectura de configuración del formulario
  if (req.method === 'GET') {
    if (!READ_WHITELIST.has(collection)) {
      return res.status(403).json({ error: 'Forbidden: esta colección no es accesible públicamente' });
    }

    try {
      const sql = neon(process.env.DATABASE_URL);
      const result = await sql`SELECT value FROM collections WHERE key = ${collection}`;
      if (result.length > 0) {
        return res.status(200).json(result[0].value);
      }
      return res.status(404).json(null); // colección no existe aún
    } catch (error) {
      console.error(`[public] GET ${collection}:`, error.message);
      return res.status(500).json({ error: 'Error interno' });
    }
  }

  // POST — registro de nuevo voluntario (SOLO append al array)
  if (req.method === 'POST') {
    if (!WRITE_WHITELIST.has(collection)) {
      return res.status(403).json({ error: 'Forbidden: escritura no permitida en esta colección' });
    }

    const newVoluntario = req.body;

    // Validación mínima del voluntario
    if (!newVoluntario || typeof newVoluntario !== 'object') {
      return res.status(400).json({ error: 'Datos de voluntario inválidos' });
    }
    if (!newVoluntario.nombre || typeof newVoluntario.nombre !== 'string') {
      return res.status(400).json({ error: 'El campo nombre es obligatorio' });
    }

    // Sanitizar — solo campos permitidos en el modelo público
    const sanitized = {
      id:                  newVoluntario.id              || `pub_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      nombre:              String(newVoluntario.nombre   || '').slice(0, 100),
      apellidos:           String(newVoluntario.apellidos|| '').slice(0, 100),
      telefono:            String(newVoluntario.telefono || '').slice(0, 20),
      email:               String(newVoluntario.email    || '').slice(0, 150),
      talla:               String(newVoluntario.talla    || '').slice(0, 5),
      puestoId:            newVoluntario.puestoId        || null,
      coche:               Boolean(newVoluntario.coche),
      notas:               String(newVoluntario.notas    || '').slice(0, 500),
      contactoEmergencia:  String(newVoluntario.contactoEmergencia || '').slice(0, 200),
      estado:              'pendiente', // SIEMPRE pendiente desde registro público
      fechaRegistro:       new Date().toISOString(),
      fuenteRegistro:      'formulario_publico',
    };

    try {
      const sql = neon(process.env.DATABASE_URL);

      // Leer array actual y hacer APPEND — nunca sobreescribir
      const result = await sql`SELECT value FROM collections WHERE key = ${collection}`;
      const current = result.length > 0 && Array.isArray(result[0].value)
        ? result[0].value
        : [];

      // Comprobar duplicado por email o teléfono
      const isDuplicate = current.some(v =>
        (sanitized.email    && v.email    === sanitized.email)    ||
        (sanitized.telefono && v.telefono === sanitized.telefono)
      );
      if (isDuplicate) {
        return res.status(409).json({ error: 'Ya existe un registro con ese email o teléfono' });
      }

      const updated = [...current, sanitized];
      const jsonValue = JSON.stringify(updated);

      await sql`
        INSERT INTO collections (key, value)
        VALUES (${collection}, ${jsonValue}::jsonb)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `;

      return res.status(201).json({ success: true, id: sanitized.id });
    } catch (error) {
      console.error(`[public] POST ${collection}:`, error.message);
      return res.status(500).json({ error: 'Error al registrar el voluntario' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
