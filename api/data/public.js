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
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { checkRateLimit } from '../../lib/rateLimiter.js';
import { validarVoluntario } from '../../lib/voluntarioValidation.js';

const BCRYPT_SALT_ROUNDS = 10;

function pinInicial(telefono) {
  const digits = (telefono || '').replace(/\D/g, '');
  return digits.slice(-4) || '0000';
}

// Lista blanca estricta — cualquier colección fuera de estas listas recibe 403
const READ_WHITELIST = new Set([
  'teg_voluntarios_v1_puestos',
  'teg_voluntarios_v1_imgFront',
  'teg_voluntarios_v1_imgBack',
  'teg_voluntarios_v1_imgGuiaTallas',
  'teg_voluntarios_v1_opcionPuesto',
  'teg_voluntarios_v1_opcionVehiculo',
  'teg_voluntarios_v1_opcionEmail',
  'teg_voluntarios_v1_opcionEmergencia',
  'teg_event_config_v1', // para landing y login: fecha, lugar, telefonoContacto
  'teg_logistica_v1_recorridos', // para el mini-mapa del puesto en la ficha del voluntario
]);

const WRITE_WHITELIST = new Set([
  'teg_voluntarios_v1_voluntarios',
]);

// SEC-03: Lista blanca de orígenes — misma lógica que proxy.js y voluntarios/index.js
function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  const allowed = [
    process.env.ALLOWED_ORIGIN || '',
    'http://localhost:5173',
    'http://localhost:4173',
  ].filter(Boolean);
  // MEJ-20 SEC-M1: igualdad EXACTA — startsWith permitía bypass por prefijo/subdominio
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// SEC-05: Rate limiting persistente en PostgreSQL (ver api/lib/rateLimiter.js)
// Reemplaza el sliding-window Map en memoria que no sobrevivía deploys.

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    return res.status(204).end();
  }

  // Añadir headers CORS a todas las respuestas
  setCorsHeaders(req, res);

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

    // SEC-05: Rate limiting persistente en PostgreSQL (survives deploys y múltiples instancias)
    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const sqlRl = neon(process.env.DATABASE_URL);
    if (await checkRateLimit(sqlRl, clientIp, 'register', { max: 3, windowMs: 5 * 60 * 1000 })) {
      return res.status(429).json({ error: 'Demasiadas solicitudes. Inténtalo en unos minutos.' });
    }

    const newVoluntario = req.body;

    // Honeypot: si el campo oculto 'website' viene relleno, es un bot — respuesta silenciosa
    if (newVoluntario && newVoluntario.website) {
      return res.status(200).json({ success: true, id: `bot_${Date.now()}` });
    }

    // Mejora 9: Validación robusta con Zod (reemplaza la validación mínima anterior)
    if (!newVoluntario || typeof newVoluntario !== 'object') {
      return res.status(400).json({ error: 'Datos de voluntario inválidos' });
    }

    const validacion = validarVoluntario(newVoluntario);
    if (!validacion.ok) {
      return res.status(400).json({
        error: 'Datos incorrectos. Revisa el formulario.',
        campos: validacion.errors,
      });
    }

    const datosValidados = validacion.data;

    // Sanitizar — solo campos permitidos en el modelo público
    // PIN inicial = últimos 4 dígitos del teléfono (o '0000')
    const pinRaw = pinInicial(String(datosValidados.telefono || ''));
    const pinHashValue = await bcrypt.hash(pinRaw, BCRYPT_SALT_ROUNDS);

    const sanitized = {
      id:                  newVoluntario.id              || `pub_${Date.now()}_${randomBytes(4).toString('hex')}`,
      nombre:              datosValidados.nombre,
      apellidos:           datosValidados.apellidos,
      telefono:            datosValidados.telefono,
      email:               datosValidados.email,
      talla:               datosValidados.talla,
      puestoId:            datosValidados.puestoId        || null,
      coche:               Boolean(datosValidados.coche),
      notas:               String(newVoluntario.notas    || '').slice(0, 500),
      telefonoEmergencia:  String(datosValidados.telefonoEmergencia || datosValidados.telefono || '').slice(0, 200),
      contactoEmergencia:  String(datosValidados.telefonoEmergencia || datosValidados.telefono || '').slice(0, 200),
      alergias:            String(newVoluntario.alergias   || '').slice(0, 200),
      medicacion:          String(newVoluntario.medicacion || '').slice(0, 200),
      estado:              'pendiente', // SIEMPRE pendiente desde registro público
      fechaRegistro:       new Date().toISOString(),
      fuenteRegistro:      'formulario_publico',
      // Portal del voluntario — hash bcrypt ($2b$...)
      pinHash:             pinHashValue,
      enPuesto:            false,
      horaLlegada:         null,
      camisetaEntregada:   false,
      sessionToken:        null,
    };

    try {
      const sql = neon(process.env.DATABASE_URL);

      // C3: capacidad del puesto — lectura informativa, fuera de la query atómica.
      // No es la causa del bug de duplicados (eso es teléfono/email), así que no
      // necesita el mismo tratamiento de lock; basta con leerlo antes de intentar el
      // insert y rechazar pronto si ya no hay sitio, evitando una escritura innecesaria.
      if (sanitized.puestoId) {
        const puestosResult = await sql`SELECT value FROM collections WHERE key = 'teg_voluntarios_v1_puestos'`;
        const puestos = puestosResult.length > 0 && Array.isArray(puestosResult[0].value) ? puestosResult[0].value : [];
        const puesto = puestos.find(p => p.id === sanitized.puestoId);
        if (puesto && typeof puesto.necesarios === 'number') {
          const actualResult = await sql`SELECT value FROM collections WHERE key = ${collection}`;
          const actual = actualResult.length > 0 && Array.isArray(actualResult[0].value) ? actualResult[0].value : [];
          const ocupados = actual.filter(v => v.puestoId === sanitized.puestoId && v.estado !== 'cancelado').length;
          if (ocupados >= puesto.necesarios) {
            return res.status(409).json({ error: 'Puesto completo. No quedan plazas disponibles.' });
          }
        }
      }

      // FIX-DUP-01: alta atómica en una sola query — sustituye al patrón anterior
      // (SELECT ... FOR UPDATE seguido de un INSERT en una llamada sql`...` separada).
      //
      // Antes (MEJ-22), el SELECT ... FOR UPDATE y el INSERT posterior eran dos
      // llamadas sql`...` independientes: con el driver HTTP de @neondatabase/serverless,
      // cada sql`...` suelta abre y confirma su propia transacción, así que el lock se
      // liberaba antes de que el INSERT llegara a ejecutarse — la "atomicidad" no se
      // producía de verdad. Resultado observado: registros duplicados del mismo
      // voluntario (mismo teléfono) cuando el formulario se envía dos veces casi a la
      // vez (doble toque en el botón, reintento tras un timeout aparente de red).
      //
      // La query de abajo hace lock + check de duplicado + append en una sola
      // sentencia SQL (un único viaje de ida y vuelta, una sola transacción implícita
      // de Postgres): el UPDATE solo añade el nuevo voluntario al array si el
      // WHERE NOT EXISTS no encuentra ya un elemento con el mismo teléfono o email.
      // Postgres bloquea la fila (UPDATE siempre toma lock de fila) durante toda la
      // operación, así que una segunda petición concurrente con los mismos datos queda
      // esperando hasta que esta termine, y entonces su propio NOT EXISTS sí encuentra
      // el registro recién insertado — ya no hay hueco entre comprobar y escribir.
      const upsertResult = await sql`
        INSERT INTO collections (key, value, version)
        VALUES (${collection}, ${JSON.stringify([sanitized])}::jsonb, 1)
        ON CONFLICT (key) DO UPDATE SET
          value = CASE
            WHEN NOT EXISTS (
              SELECT 1 FROM jsonb_array_elements(collections.value) AS elem
              WHERE (${sanitized.email}::text <> '' AND elem->>'email' = ${sanitized.email}::text)
                 OR (${sanitized.telefono}::text <> '' AND elem->>'telefono' = ${sanitized.telefono}::text)
            )
            THEN collections.value || ${JSON.stringify([sanitized])}::jsonb
            ELSE collections.value
          END,
          version = CASE
            WHEN NOT EXISTS (
              SELECT 1 FROM jsonb_array_elements(collections.value) AS elem
              WHERE (${sanitized.email}::text <> '' AND elem->>'email' = ${sanitized.email}::text)
                 OR (${sanitized.telefono}::text <> '' AND elem->>'telefono' = ${sanitized.telefono}::text)
            )
            THEN collections.version + 1
            ELSE collections.version
          END,
          updated_at = CASE
            WHEN NOT EXISTS (
              SELECT 1 FROM jsonb_array_elements(collections.value) AS elem
              WHERE (${sanitized.email}::text <> '' AND elem->>'email' = ${sanitized.email}::text)
                 OR (${sanitized.telefono}::text <> '' AND elem->>'telefono' = ${sanitized.telefono}::text)
            )
            THEN CURRENT_TIMESTAMP
            ELSE collections.updated_at
          END
        RETURNING value
      `;

      const finalArr = Array.isArray(upsertResult?.[0]?.value) ? upsertResult[0].value : [];
      const wasInserted = finalArr.some(v => v.id === sanitized.id);

      if (!wasInserted) {
        return res.status(409).json({ error: 'Ya existe un registro con ese email o teléfono' });
      }

      return res.status(201).json({ success: true, id: sanitized.id });
    } catch (error) {
      console.error(`[public] POST ${collection}:`, error.message);
      return res.status(500).json({ error: 'Error al registrar el voluntario' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
