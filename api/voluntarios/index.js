/**
 * /api/voluntarios — Router único para todas las operaciones del portal del voluntario
 *
 * action=auth      POST  Login (teléfono + PIN)
 * action=check     GET   Verificar si PIN fue personalizado
 * action=ficha     GET   Datos de la ficha del voluntario
 * action=ficha     PATCH Editar datos del voluntario
 * action=presente  POST  Marcar llegada al puesto
 * action=cancelar  POST  Cancelar asistencia
 * action=cambiar-pin POST Cambiar PIN
 * action=reset-pin POST  Reset PIN (organizador, requiere x-api-key)
 * action=delete    POST  Eliminar voluntario (admin, requiere x-api-key)
 */
import { neon } from '@neondatabase/serverless';
import { checkRateLimit } from '../lib/rateLimiter.js';
import { logError, requestContext } from '../lib/logger.js';

import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto'; // fix(SEC-CRIT-02): CSPRNG para sessionToken

const LS_KEY    = 'teg_voluntarios_v1_voluntarios';
const LS_PUESTOS = 'teg_voluntarios_v1_puestos';
const LS_CONFIG  = 'teg_event_config_v1';

// SEC-01: hashPin uses bcrypt (PBKDF2-like, replaces djb2)
// hashPinLegacy kept for transparent migration of existing hashes
function hashPinLegacy(pin) {
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
  }
  return String(h);
}
function hashPin(pin) {
  return bcrypt.hashSync(String(pin), 10);
}
// Verify PIN against stored hash (supports both bcrypt and legacy djb2)
// Returns: { valid: boolean, needsUpgrade: boolean }
function verifyPinCompat(pin, storedHash) {
  if (!storedHash) return { valid: false, needsUpgrade: false };
  // bcrypt hashes always start with $2b$ or $2a$
  if (storedHash.startsWith('$2')) {
    return { valid: bcrypt.compareSync(String(pin), storedHash), needsUpgrade: false };
  }
  // Legacy djb2 hash
  const valid = hashPinLegacy(String(pin)) === storedHash;
  return { valid, needsUpgrade: valid }; // if valid, upgrade to bcrypt
}
function pinInicial(telefono) {
  const digits = (telefono || '').replace(/\D/g, '');
  return digits.slice(-4) || '0000';
}
function verifyToken(voluntario, token) {
  if (!voluntario || !voluntario.sessionToken || voluntario.sessionToken !== token) return false;
  if (voluntario.sessionTokenExpiry) {
    const expiry = new Date(voluntario.sessionTokenExpiry);
    if (isNaN(expiry.getTime()) || expiry < new Date()) return false;
  }
  return true;
}
async function getVols(sql) {
  const r = await sql`SELECT value FROM collections WHERE key = ${LS_KEY}`;
  return r.length > 0 && Array.isArray(r[0].value) ? r[0].value : [];
}
async function saveVols(sql, vols) {
  await sql`
    INSERT INTO collections (key, value) VALUES (${LS_KEY}, ${JSON.stringify(vols)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
  `;
}

// SEC-05: Rate limiting persistente en PostgreSQL (ver api/lib/rateLimiter.js)
// Reemplaza el Map en memoria que se reseteaba en cada deploy/cold-start.

// SEC-03: Lista blanca de orígenes — nunca wildcard en endpoints con autenticación
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const sql = neon(process.env.DATABASE_URL);

  try {
    // ── AUDIT: GET ?action=audit (solo lectura, requiere x-api-key) ────────
    if (action === 'audit') {
      if (req.method !== 'GET') return res.status(405).end();
      if (req.headers['x-api-key'] !== process.env.API_KEY)
        return res.status(401).json({ error: 'Unauthorized' });
      const vols = await getVols(sql);
      const ahora = new Date();
      const resultado = vols.map(v => {
        const tel = v.telefono || '';
        const ph  = v.pinHash;
        const pp  = v.pinPersonalizado;
        const nombre = `${v.nombre||''}${v.apellidos?' '+v.apellidos:''}`.trim();
        let flagBD = pp===true?'true': pp===false?'FALSE_EXPLICITO':'undefined';
        let esPersonalizadoReal=false, metodo='';
        if (pp===true)       { esPersonalizadoReal=true;  metodo='flag=true'; }
        else if (!ph)        { esPersonalizadoReal=false; metodo='sin_hash'; }
        else if (ph.startsWith('$2')) {
          const esInicial = bcrypt.compareSync(pinInicial(tel), ph);
          esPersonalizadoReal=!esInicial; metodo=esInicial?'bcrypt=inicial':'bcrypt=CAMBIADO';
        } else {
          const esInicial = hashPinLegacy(pinInicial(tel))===ph;
          esPersonalizadoReal=!esInicial; metodo=esInicial?'djb2=inicial':'djb2=CAMBIADO';
        }
        let sesionActiva=false;
        if (v.sessionToken&&v.sessionTokenExpiry) {
          const exp=new Date(v.sessionTokenExpiry);
          sesionActiva=!isNaN(exp.getTime())&&exp>ahora;
        }
        return { nombre, telefono:tel, estado:v.estado||'?',
          flagBD, esPersonalizadoReal, metodo, sesionActiva,
          bloqueado: pp===false, fechaRegistro:v.fechaRegistro||null };
      });
      return res.status(200).json({
        total: vols.length,
        bloqueados: resultado.filter(r=>r.bloqueado).length,
        conPinPropio: resultado.filter(r=>r.esPersonalizadoReal).length,
        voluntarios: resultado,
      });
    }

    // ── AUTH: POST ?action=auth ────────────────────────────────────────────
    if (action === 'auth') {
      if (req.method !== 'POST') return res.status(405).end();
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      // SEC-05: rate limiting persistente — survives deploys y múltiples instancias serverless
      if (await checkRateLimit(sql, ip, 'auth', { max: 5, windowMs: 10 * 60 * 1000 })) {
        return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
      }

      const { telefono, pin } = req.body || {};
      if (!telefono || !pin) return res.status(400).json({ error: 'Teléfono o PIN incorrecto' });

      const vols = await getVols(sql);
      const tel = String(telefono).replace(/\D/g, '');
      const v = vols.find(v => String(v.telefono || '').replace(/\D/g, '') === tel);
      if (!v) return res.status(401).json({ error: 'Teléfono o PIN incorrecto' });

      const pinHashEsperado = v.pinHash || hashPin(pinInicial(v.telefono));
      // SEC-01: verifyPinCompat soporta bcrypt y legacy djb2 (migración transparente)
      const { valid: pinCorrecto, needsUpgrade } = verifyPinCompat(String(pin), pinHashEsperado);
      // Auto-upgrade: si el hash es legacy djb2 y el PIN es correcto, actualizar a bcrypt
      if (pinCorrecto && needsUpgrade) {
        const upgradedHash = hashPin(String(pin)); // bcrypt
        await saveVols(sql, vols.map(x => String(x.id) === String(v.id)
          ? { ...x, pinHash: upgradedHash } : x));
      }
      if (!pinCorrecto) return res.status(401).json({ error: 'Teléfono o PIN incorrecto' });

      const sessionToken = randomBytes(32).toString('hex'); // fix(SEC-CRIT-02): 256 bits CSPRNG, no Math.random()
      const sessionTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const updated = vols.map(x => String(x.telefono || '').replace(/\D/g, '') === tel
        ? { ...x, pinHash: pinHashEsperado, sessionToken, sessionTokenExpiry } : x);
      await saveVols(sql, updated);
      // Normalizar pinPersonalizado antes del spread: undefined → false
      // Garantiza que pub.pinPersonalizado sea siempre boolean en la respuesta.
      const vNorm = { ...v, pinPersonalizado: v.pinPersonalizado === true };
      const { pinHash: _ph, sessionToken: _st, ...pub } = vNorm;
      return res.status(200).json({ voluntario: { ...pub, sessionToken }, token: sessionToken });
    }

    // ── CHECK: GET ?action=check&telefono=XXX ─────────────────────────────
    if (action === 'check') {
      if (req.method !== 'GET') return res.status(405).end();
      const { telefono } = req.query;
      // SEC-MISC-03: Rate limiting independiente del de 'auth' para prevenir enumeracion de telefonos.
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      if (await checkRateLimit(sql, ip, 'check', { max: 10, windowMs: 5 * 60 * 1000 })) {
        return res.status(429).json({ error: 'Demasiadas solicitudes. Intentalo mas tarde.' });
      }
      if (!telefono) return res.status(400).json({ error: 'Falta telefono' });
      const vols = await getVols(sql);
      const tel = String(telefono).replace(/\D/g, '');
      const v = vols.find(x => String(x.telefono || '').replace(/\D/g, '') === tel);
      if (!v) return res.status(200).json({ existe: false, pinPersonalizado: false });
      // SEC-BUG-02: bcrypt.hashSync() es no-determinista → nunca comparar hashes directamente.
      // Escenario A: flag explícito en BD (cortocircuito, el más fiable).
      // Escenario B: hash bcrypt sin flag → verificar con compareSync si el PIN ES el inicial.
      // Escenario C: hash legacy djb2 → comparación directa sí es válida (determinista).
      let pinPersonalizado = v.pinPersonalizado === true;
      if (!pinPersonalizado && v.pinHash) {
        if (v.pinHash.startsWith('$2')) {
          // Bcrypt: el PIN está personalizado si NO coincide con el PIN inicial
          const esInicial = bcrypt.compareSync(pinInicial(v.telefono), v.pinHash);
          pinPersonalizado = !esInicial;
        } else {
          // Legacy djb2: comparación directa es válida
          pinPersonalizado = hashPinLegacy(pinInicial(v.telefono)) !== v.pinHash;
        }
      }
      return res.status(200).json({ existe: true, pinPersonalizado: Boolean(pinPersonalizado), tieneEmail: Boolean(v.email && String(v.email).trim()) });
    }

    // ── RECOVER-PIN: POST ?action=recover-pin (portal público) ─────────────
    // T5.4: sin autenticación — el voluntario verifica con su email y recupera el PIN inicial
    if (action === 'recover-pin') {
      if (req.method !== 'POST') return res.status(405).end();
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: 'Email requerido' });
      const vols = await getVols(sql);
      const normalEmail = String(email).toLowerCase().trim();
      const v = vols.find(x => String(x.email || '').toLowerCase().trim() === normalEmail);
      // Respuesta genérica para no revelar si el email existe (seguridad)
      if (!v) return res.status(200).json({ success: true, message: 'Si el email está registrado, el PIN ha sido restablecido.' });
      // Resetear al PIN inicial (últimos 4 dígitos del teléfono)
      const pinReset = pinInicial(v.telefono);
      await saveVols(sql, vols.map(x => String(x.id) === String(v.id)
        ? { ...x, pinHash: hashPin(pinReset), sessionToken: null, pinPersonalizado: false } : x));
      return res.status(200).json({ success: true, message: 'Si el email está registrado, el PIN ha sido restablecido.' });
    }

    // ── RESET-PIN: POST ?action=reset-pin (organizador) ───────────────────
    if (action === 'reset-pin') {
      if (req.method !== 'POST') return res.status(405).end();
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.API_KEY) return res.status(401).json({ error: 'Unauthorized' });
      const { voluntarioId } = req.body || {};
      if (!voluntarioId) return res.status(400).json({ error: 'voluntarioId requerido' });
      const vols = await getVols(sql);
      const v = vols.find(x => String(x.id) === String(voluntarioId));
      if (!v) return res.status(404).json({ error: 'Voluntario no encontrado' });
      const pinReset = pinInicial(v.telefono);
      const updated = vols.map(x => String(x.id) === String(voluntarioId)
        ? { ...x, pinHash: hashPin(pinReset), sessionToken: null, pinPersonalizado: false } : x);
      await saveVols(sql, updated);
      return res.status(200).json({ success: true, pinReset });
    }

    // ── DELETE: POST ?action=delete (admin) ───────────────────────────────
    if (action === 'delete') {
      if (req.method !== 'POST') return res.status(405).end();
      const apiKey = req.headers['x-api-key'];
      // SEC-04 fix: never fall back to a hardcoded key
    const configuredKey = process.env.API_KEY;
    if (!configuredKey) return res.status(503).json({ error: 'Admin endpoint not configured' });
    if (!apiKey || apiKey !== configuredKey) return res.status(401).json({ error: 'Unauthorized' });
      const { nombre, id } = req.body || {};
      if (!nombre && !id) return res.status(400).json({ error: 'Falta nombre o id' });
      const vols = await getVols(sql);
      let eliminados, filtrados;
      if (id) {
        eliminados = vols.filter(v => String(v.id) === String(id));
        filtrados  = vols.filter(v => String(v.id) !== String(id));
      } else {
        const parts = nombre.toLowerCase().split(' ').filter(Boolean);
        eliminados = vols.filter(v => parts.every(p => (v.nombre || '').toLowerCase().includes(p)));
        filtrados  = vols.filter(v => !parts.every(p => (v.nombre || '').toLowerCase().includes(p)));
      }
      if (!eliminados.length) return res.status(404).json({ error: 'No encontrado', total: vols.length });
      await saveVols(sql, filtrados);
      return res.status(200).json({ ok: true, eliminados: eliminados.map(v => ({ id: v.id, nombre: v.nombre })), antes: vols.length, despues: filtrados.length });
    }

    // ── FICHA: requiere Authorization Bearer token ─────────────────────────
    const token = req.headers['authorization']?.replace('Bearer ', '') || req.query.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    const vols = await getVols(sql);
    const voluntario = vols.find(v => v.sessionToken === token) || null;
    if (!voluntario || !verifyToken(voluntario, token)) return res.status(401).json({ error: 'Sesión inválida o expirada' });

    // GET ficha
    if ((action === 'ficha' || !action) && req.method === 'GET') {
      const puestosRes = await sql`SELECT value FROM collections WHERE key = ${LS_PUESTOS}`;
      const configRes  = await sql`SELECT value FROM collections WHERE key = ${LS_CONFIG}`;
      const matRes     = await sql`SELECT value FROM collections WHERE key = 'teg_logistica_v1_mat'`;
      const asigRes    = await sql`SELECT value FROM collections WHERE key = 'teg_logistica_v1_asig'`;
      const locsRes    = await sql`SELECT value FROM collections WHERE key = 'teg_localizaciones_v1'`;
      const puestos  = puestosRes.length > 0 && Array.isArray(puestosRes[0].value) ? puestosRes[0].value : [];
      const orgConfig = configRes.length > 0 ? configRes[0].value : {};
      const allMat   = matRes.length > 0 && Array.isArray(matRes[0].value) ? matRes[0].value : [];
      const allAsig  = asigRes.length > 0 && Array.isArray(asigRes[0].value) ? asigRes[0].value : [];
      const allLocs  = locsRes.length > 0 && Array.isArray(locsRes[0].value) ? locsRes[0].value : [];

      // Coerción explícita: puestoId puede ser number o string según la fuente de registro
      const puesto = voluntario.puestoId != null
        ? puestos.find(p => String(p.id) === String(voluntario.puestoId)) || null
        : null;
      let materialPuesto = [];
      if (puesto && puesto.localizacionId) {
        const loc = allLocs.find(l => l.id === puesto.localizacionId);
        if (loc) {
          materialPuesto = allAsig
            .filter(a => (a.localizacionId && a.localizacionId === puesto.localizacionId) || (!a.localizacionId && a.puesto === loc.nombre))
            .map(a => { const item = allMat.find(m => m.id === a.materialId); return item ? { nombre: item.nombre, cantidad: a.cantidad, unidad: item.unidad || 'ud' } : null; })
            .filter(Boolean);
        }
      }

      // Construir array base de organizadores normalizando todas las fuentes:
      // 1. Si orgConfig.organizadores tiene entradas, usarlas como base.
      // 2. Si está vacío, construir desde los campos legacy (organizador + telefonoContacto).
      //    Esto evita que el mismo contacto aparezca en ambas fuentes y se duplique.
      // FIX: normalizar cada entrada — rellenar nombre vacío con fallback, descartar sin teléfono.
      const eventNombre = (orgConfig.nombre || '').trim(); // nombre del evento p.ej. "Trail El Guerrero 2026"
      const normOrg = (arr) => arr
        .filter(o => (o.telefono || '').trim())
        .map((o, idx) => ({
          ...o,
          nombre: (o.nombre || '').trim() ||
                  (orgConfig.organizador || '').trim() ||
                  (eventNombre ? `Organización ${eventNombre}` : '') ||
                  `Coordinador${arr.length > 1 ? ` ${idx + 1}` : ''}`,
        }));
      let organizadores;
      if (Array.isArray(orgConfig.organizadores) && orgConfig.organizadores.length > 0) {
        organizadores = normOrg(orgConfig.organizadores);
      } else if (orgConfig.organizador || orgConfig.telefonoContacto) {
        organizadores = [{
          nombre:   orgConfig.organizador     || 'Organizacion',
          telefono: orgConfig.telefonoContacto || '',
          email:    orgConfig.emailContacto    || '',
        }];
      } else {
        organizadores = [];
      }

      // Fusionar con contactos de logística relevantes, deduplicando por teléfono normalizado
      try {
        const contRes = await sql`SELECT value FROM collections WHERE key = 'teg_logistica_v1_cont'`;
        if (contRes.length > 0 && Array.isArray(contRes[0].value)) {
          const aptos = contRes[0].value.filter(c => ['organizacion','voluntarios','coordinacion'].includes(c.tipo))
            .map(c => ({ nombre: c.nombre || c.contacto, telefono: c.telefono || c.tel, email: c.email || '' }))
            .filter(c => c.nombre && c.telefono);
          const tels = new Set(organizadores.map(o => (o.telefono || '').replace(/\D/g, '')));
          const nuevos = aptos.filter(c => !tels.has((c.telefono || '').replace(/\D/g, '')));
          if (nuevos.length > 0) organizadores = [...organizadores, ...nuevos];
        }
      } catch {}

      const companerosEnPuesto = voluntario.puestoId != null
        ? vols.filter(v => v.puestoId != null && String(v.puestoId) === String(voluntario.puestoId) && (v.estado === 'confirmado' || v.estado === 'pendiente') && String(v.id) !== String(voluntario.id))
             .map(v => {
               // Normalizar nombre/apellidos: si apellidos está vacío pero nombre contiene espacio,
               // asumir "nombre apellidos" legacy para mostrar correctamente
               const nombreRaw = (v.nombre || '').trim();
               const apellidosRaw = (v.apellidos || '').trim();
               let nombreFinal = nombreRaw;
               let apellidosFinal = apellidosRaw;
               if (!apellidosRaw && nombreRaw.includes(' ')) {
                 const partes = nombreRaw.split(/\s+/);
                 nombreFinal = partes[0];
                 apellidosFinal = partes.slice(1).join(' ');
               }
               return { nombre: nombreFinal, apellidos: apellidosFinal, telefono: v.telefono || '', estado: v.estado || 'pendiente', enPuesto: v.enPuesto || false, horaLlegada: v.horaLlegada || null };
             })
        : [];

      // Enriquecer puesto con lat/lng: primero los coords explícitos del puesto,
      // luego fallback a los de la localización maestra vinculada (localizacionId)
      let puestoLat = null;
      let puestoLng = null;
      if (puesto) {  // puesto ya usa String() coercion arriba
        if (puesto.lat != null && puesto.lng != null) {
          puestoLat = puesto.lat;
          puestoLng = puesto.lng;
        } else if (puesto.localizacionId) {
          const locParaCoords = allLocs.find(l => l.id === puesto.localizacionId);
          if (locParaCoords) {
            puestoLat = locParaCoords.lat ?? null;
            puestoLng = locParaCoords.lng ?? null;
          }
        }
      }

      // Sin caché — los datos del voluntario deben ser siempre frescos
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');

      const { pinHash: _ph, sessionToken: _st, ...volPublico } = voluntario;
      // Migración on-the-fly: si no tiene telefonoEmergencia, usar el propio teléfono
      const telEmergencia = voluntario.telefonoEmergencia || voluntario.contactoEmergencia || voluntario.telefono || '';
      return res.status(200).json({
        voluntario: { ...volPublico, telefonoEmergencia: telEmergencia, contactoEmergencia: telEmergencia, mensajeOrganizador: voluntario.mensajeOrganizador || '', mensajeParaOrganizador: voluntario.mensajeParaOrganizador || '' },
        puesto: puesto ? { nombre: puesto.nombre, tipo: puesto.tipo, horaInicio: puesto.horaInicio, horaFin: puesto.horaFin, distancias: puesto.distancias, notas: puesto.notas, necesarios: puesto.necesarios || null, tiempoLimite: puesto.tiempoLimite || null, lat: puestoLat, lng: puestoLng } : null,
        companerosEnPuesto, materialPuesto,
        config: { nombre: orgConfig.nombre, fecha: orgConfig.fecha, lugar: orgConfig.lugar, organizador: orgConfig.organizador || '', telefonoContacto: orgConfig.telefonoContacto || '', emailContacto: orgConfig.emailContacto || '', organizadores },
      });
    }

    // PATCH ficha — editar datos
    if ((action === 'ficha' || !action) && req.method === 'PATCH') {
      const { telefono, telefonoEmergencia, talla, tallaConfirmadaEn, notaVoluntario, alergias, medicacion, email, mensajeParaOrganizador } = req.body || {};
      const upd = {};
      if (telefono !== undefined) upd.telefono = String(telefono).slice(0, 20);
      if (telefonoEmergencia !== undefined) { upd.telefonoEmergencia = String(telefonoEmergencia).slice(0, 20); upd.contactoEmergencia = String(telefonoEmergencia).slice(0, 20); }
      if (talla !== undefined) upd.talla = String(talla).slice(0, 5);
      if (tallaConfirmadaEn !== undefined) upd.tallaConfirmadaEn = String(tallaConfirmadaEn).slice(0, 30);
      if (notaVoluntario !== undefined) upd.notaVoluntario = String(notaVoluntario).slice(0, 500);
      if (alergias !== undefined) upd.alergias = String(alergias).slice(0, 200);
      if (medicacion !== undefined) upd.medicacion = String(medicacion).slice(0, 200);
      if (email !== undefined) upd.email = String(email).trim().slice(0, 100);
      if (mensajeParaOrganizador !== undefined) upd.mensajeParaOrganizador = String(mensajeParaOrganizador).trim().slice(0, 500);
      await saveVols(sql, vols.map(v => String(v.id) === String(voluntario.id) ? { ...v, ...upd } : v));
      return res.status(200).json({ success: true });
    }

    // POST presente
    if (action === 'presente' && req.method === 'POST') {
      const horaLlegada = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      await saveVols(sql, vols.map(v => String(v.id) === String(voluntario.id) ? { ...v, enPuesto: true, horaLlegada } : v));
      return res.status(200).json({ success: true, enPuesto: true, horaLlegada });
    }

    // POST salida — registra horaSalida y marca enPuesto=false
    if (action === 'salida' && req.method === 'POST') {
      const horaSalida = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      await saveVols(sql, vols.map(v => String(v.id) === String(voluntario.id) ? { ...v, enPuesto: false, horaSalida } : v));
      return res.status(200).json({ success: true, enPuesto: false, horaSalida });
    }

    // POST cancelar
    if (action === 'cancelar' && req.method === 'POST') {
      const { motivo } = req.body || {};
      await saveVols(sql, vols.map(v => String(v.id) === String(voluntario.id) ? { ...v, estado: 'cancelado', motivoCancelacion: motivo ? String(motivo).slice(0, 300) : '', fechaCancelacion: new Date().toISOString() } : v));
      return res.status(200).json({ success: true });
    }

    // POST cambiar-pin
    if (action === 'cambiar-pin' && req.method === 'POST') {
      const { pinNuevo } = req.body || {};
      if (!pinNuevo || String(pinNuevo).length !== 4 || !/^\d{4}$/.test(String(pinNuevo)))
        return res.status(400).json({ error: 'El PIN debe ser exactamente 4 dígitos numéricos' });
      await saveVols(sql, vols.map(v => String(v.id) === String(voluntario.id) ? { ...v, pinHash: hashPin(String(pinNuevo)), pinPersonalizado: true } : v));
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method or action not allowed' });

  } catch (err) {
    logError('[voluntarios]', err, requestContext(req));
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
/* deploy trigger Thu Apr 30 21:31:06 UTC 2026 */
