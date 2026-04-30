import { neon } from '@neondatabase/serverless';

const LS_KEY = 'teg_voluntarios_v1_voluntarios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== (process.env.API_KEY || process.env.VITE_API_KEY || 'teg-admin-2026')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { nombre, id } = req.body || {};
  if (!nombre && !id) return res.status(400).json({ error: 'Falta nombre o id' });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT value FROM collections WHERE key = ${LS_KEY}`;
    if (!result.length) return res.status(404).json({ error: 'No hay voluntarios' });

    const voluntarios = result[0].value;
    const antes = voluntarios.length;

    let eliminados, filtrados;

    if (id) {
      eliminados = voluntarios.filter(v => String(v.id) === String(id));
      filtrados  = voluntarios.filter(v => String(v.id) !== String(id));
    } else {
      const nombreLower = nombre.toLowerCase();
      const parts = nombreLower.split(' ').filter(Boolean);
      eliminados = voluntarios.filter(v => parts.every(p => (v.nombre||'').toLowerCase().includes(p)));
      filtrados  = voluntarios.filter(v => !parts.every(p => (v.nombre||'').toLowerCase().includes(p)));
    }

    if (!eliminados.length) {
      return res.status(404).json({
        error: 'Voluntario no encontrado',
        buscado: nombre || id,
        total: antes,
        muestra: voluntarios.slice(0, 8).map(v => ({ id: v.id, nombre: v.nombre, estado: v.estado })),
      });
    }

    await sql`
      INSERT INTO collections (key, value) VALUES (${LS_KEY}, ${JSON.stringify(filtrados)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `;

    return res.status(200).json({
      ok: true,
      eliminados: eliminados.map(v => ({ id: v.id, nombre: v.nombre, estado: v.estado })),
      antes, despues: filtrados.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
