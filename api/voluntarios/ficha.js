import { neon } from '@neondatabase/serverless';

const LS_KEY = 'teg_voluntarios_v1_voluntarios';
const LS_PUESTOS = 'teg_voluntarios_v1_puestos';
const LS_CONFIG  = 'teg_event_config_v1';

function hashPin(pin) {
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
  }
  return String(h);
}

async function getVoluntarios(sql) {
  const result = await sql`SELECT value FROM collections WHERE key = ${LS_KEY}`;
  return result.length > 0 && Array.isArray(result[0].value) ? result[0].value : [];
}

async function saveVoluntarios(sql, voluntarios) {
  const jsonValue = JSON.stringify(voluntarios);
  await sql`
    INSERT INTO collections (key, value)
    VALUES (${LS_KEY}, ${jsonValue}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
  `;
}

function verifyToken(voluntario, token) {
  return voluntario && voluntario.sessionToken && voluntario.sessionToken === token;
}

function findVolByToken(voluntarios, token) {
  if (!token) return null;
  return voluntarios.find(v => v.sessionToken === token) || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers['authorization']?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  const { action } = req.query;

  try {
    const sql = neon(process.env.DATABASE_URL);
    const voluntarios = await getVoluntarios(sql);
    const voluntario = findVolByToken(voluntarios, token);

    if (!voluntario) return res.status(401).json({ error: 'Sesión inválida o expirada' });

    // ── GET /api/voluntarios/ficha — datos + puesto + compañeros ──
    if (req.method === 'GET') {
      const puestosRes = await sql`SELECT value FROM collections WHERE key = ${LS_PUESTOS}`;
      const puestos = puestosRes.length > 0 && Array.isArray(puestosRes[0].value) ? puestosRes[0].value : [];

      const configRes = await sql`SELECT value FROM collections WHERE key = ${LS_CONFIG}`;
      const config = configRes.length > 0 ? configRes[0].value : {};

      const puesto = puestos.find(p => p.id === voluntario.puestoId) || null;

      // Compañeros del mismo puesto — solo nombre y teléfono (excluye cancelados)
      const companerosEnPuesto = voluntario.puestoId
        ? voluntarios
            .filter(v => v.puestoId === voluntario.puestoId
                      && v.estado !== 'cancelado'
                      && String(v.id) !== String(voluntario.id))
            .map(v => ({ nombre: v.nombre, apellidos: v.apellidos || '', telefono: v.telefono || '' }))
        : [];

      const { pinHash, sessionToken, notas, ...volPublico } = voluntario;

      return res.status(200).json({
        voluntario: volPublico,
        puesto: puesto ? {
          nombre: puesto.nombre,
          tipo: puesto.tipo,
          horaInicio: puesto.horaInicio,
          horaFin: puesto.horaFin,
          distancias: puesto.distancias,
          notas: puesto.notas,
        } : null,
        companerosEnPuesto,
        config: { nombre: config.nombre, fecha: config.fecha, lugar: config.lugar },
      });
    }

    // ── PATCH /api/voluntarios/ficha — editar datos personales ──
    if (req.method === 'PATCH' && !action) {
      const { telefono, telefonoEmergencia, talla } = req.body || {};
      const update = {};
      if (telefono !== undefined) update.telefono = String(telefono).slice(0, 20);
      if (telefonoEmergencia !== undefined) update.telefonoEmergencia = String(telefonoEmergencia).slice(0, 20);
      if (talla !== undefined) update.talla = String(talla).slice(0, 5);

      const updated = voluntarios.map(v =>
        String(v.id) === String(voluntario.id) ? { ...v, ...update } : v
      );
      await saveVoluntarios(sql, updated);
      return res.status(200).json({ success: true });
    }

    // ── POST /api/voluntarios/ficha?action=presente ──
    if (req.method === 'POST' && action === 'presente') {
      const ahora = new Date();
      const horaLlegada = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const updated = voluntarios.map(v =>
        String(v.id) === String(voluntario.id)
          ? { ...v, enPuesto: true, horaLlegada }
          : v
      );
      await saveVoluntarios(sql, updated);
      return res.status(200).json({ success: true, enPuesto: true, horaLlegada });
    }

    // ── POST /api/voluntarios/ficha?action=cambiar-pin ──
    if (req.method === 'POST' && action === 'cambiar-pin') {
      const { pinNuevo } = req.body || {};
      if (!pinNuevo || String(pinNuevo).length !== 4 || !/^\d{4}$/.test(String(pinNuevo))) {
        return res.status(400).json({ error: 'El PIN debe ser exactamente 4 dígitos numéricos' });
      }
      const nuevoHash = hashPin(String(pinNuevo));
      const updated = voluntarios.map(v =>
        String(v.id) === String(voluntario.id) ? { ...v, pinHash: nuevoHash } : v
      );
      await saveVoluntarios(sql, updated);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[ficha] Error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
