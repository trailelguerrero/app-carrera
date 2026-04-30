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

const LS_KEY    = 'teg_voluntarios_v1_voluntarios';
const LS_PUESTOS = 'teg_voluntarios_v1_puestos';
const LS_CONFIG  = 'teg_event_config_v1';

function hashPin(pin) {
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
  }
  return String(h);
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

// Rate limiting básico
const intentos = new Map();
function isRateLimited(ip) {
  const ahora = Date.now();
  const r = intentos.get(ip) || { count: 0, resetAt: ahora + 10 * 60 * 1000 };
  if (ahora > r.resetAt) { intentos.set(ip, { count: 1, resetAt: ahora + 10 * 60 * 1000 }); return false; }
  if (r.count >= 5) return true;
  r.count++; intentos.set(ip, r); return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const sql = neon(process.env.DATABASE_URL);

  try {
    // ── AUTH: POST ?action=auth ────────────────────────────────────────────
    if (action === 'auth') {
      if (req.method !== 'POST') return res.status(405).end();
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      if (isRateLimited(ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });

      const { telefono, pin } = req.body || {};
      if (!telefono || !pin) return res.status(400).json({ error: 'Teléfono o PIN incorrecto' });

      const vols = await getVols(sql);
      const tel = String(telefono).replace(/\D/g, '');
      const v = vols.find(v => String(v.telefono || '').replace(/\D/g, '') === tel);
      if (!v) return res.status(401).json({ error: 'Teléfono o PIN incorrecto' });

      const pinHashEsperado = v.pinHash || hashPin(pinInicial(v.telefono));
      if (hashPin(String(pin)) !== pinHashEsperado) return res.status(401).json({ error: 'Teléfono o PIN incorrecto' });

      const sessionToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const sessionTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const updated = vols.map(x => String(x.telefono || '').replace(/\D/g, '') === tel
        ? { ...x, pinHash: pinHashEsperado, sessionToken, sessionTokenExpiry } : x);
      await saveVols(sql, updated);
      const { pinHash: _ph, sessionToken: _st, ...pub } = v;
      return res.status(200).json({ voluntario: { ...pub, sessionToken }, token: sessionToken });
    }

    // ── CHECK: GET ?action=check&telefono=XXX ─────────────────────────────
    if (action === 'check') {
      if (req.method !== 'GET') return res.status(405).end();
      const { telefono } = req.query;
      if (!telefono) return res.status(400).json({ error: 'Falta telefono' });
      const vols = await getVols(sql);
      const tel = String(telefono).replace(/\D/g, '');
      const v = vols.find(x => String(x.telefono || '').replace(/\D/g, '') === tel);
      if (!v) return res.status(200).json({ existe: false, pinPersonalizado: false });
      const pinPersonalizado = v.pinPersonalizado === true ||
        (v.pinHash && v.pinHash !== hashPin(pinInicial(v.telefono)));
      return res.status(200).json({ existe: true, pinPersonalizado: Boolean(pinPersonalizado) });
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
      if (!apiKey || apiKey !== (process.env.API_KEY || 'teg-admin-2026')) return res.status(401).json({ error: 'Unauthorized' });
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

      const puesto = puestos.find(p => p.id === voluntario.puestoId) || null;
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

      // Fusionar organizadores de config + logística
      let organizadores = Array.isArray(orgConfig.organizadores) ? orgConfig.organizadores : [];
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

      const companerosEnPuesto = voluntario.puestoId
        ? vols.filter(v => v.puestoId === voluntario.puestoId && (v.estado === 'confirmado' || v.estado === 'pendiente') && String(v.id) !== String(voluntario.id))
             .map(v => ({ nombre: v.nombre, apellidos: v.apellidos || '', telefono: v.telefono || '', estado: v.estado || 'pendiente', enPuesto: v.enPuesto || false, horaLlegada: v.horaLlegada || null }))
        : [];

      const { pinHash: _ph, sessionToken: _st, ...volPublico } = voluntario;
      return res.status(200).json({
        voluntario: { ...volPublico, mensajeOrganizador: voluntario.mensajeOrganizador || '' },
        puesto: puesto ? { nombre: puesto.nombre, tipo: puesto.tipo, horaInicio: puesto.horaInicio, horaFin: puesto.horaFin, distancias: puesto.distancias, notas: puesto.notas, necesarios: puesto.necesarios || null } : null,
        companerosEnPuesto, materialPuesto,
        config: { nombre: orgConfig.nombre, fecha: orgConfig.fecha, lugar: orgConfig.lugar, organizador: orgConfig.organizador || '', telefonoContacto: orgConfig.telefonoContacto || '', emailContacto: orgConfig.emailContacto || '', organizadores },
      });
    }

    // PATCH ficha — editar datos
    if ((action === 'ficha' || !action) && req.method === 'PATCH') {
      const { telefono, telefonoEmergencia, talla, notaVoluntario, alergias, medicacion } = req.body || {};
      const upd = {};
      if (telefono !== undefined) upd.telefono = String(telefono).slice(0, 20);
      if (telefonoEmergencia !== undefined) { upd.telefonoEmergencia = String(telefonoEmergencia).slice(0, 20); upd.contactoEmergencia = String(telefonoEmergencia).slice(0, 20); }
      if (talla !== undefined) upd.talla = String(talla).slice(0, 5);
      if (notaVoluntario !== undefined) upd.notaVoluntario = String(notaVoluntario).slice(0, 500);
      if (alergias !== undefined) upd.alergias = String(alergias).slice(0, 200);
      if (medicacion !== undefined) upd.medicacion = String(medicacion).slice(0, 200);
      await saveVols(sql, vols.map(v => String(v.id) === String(voluntario.id) ? { ...v, ...upd } : v));
      return res.status(200).json({ success: true });
    }

    // POST presente
    if (action === 'presente' && req.method === 'POST') {
      const horaLlegada = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      await saveVols(sql, vols.map(v => String(v.id) === String(voluntario.id) ? { ...v, enPuesto: true, horaLlegada } : v));
      return res.status(200).json({ success: true, enPuesto: true, horaLlegada });
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
    console.error('[voluntarios]', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
