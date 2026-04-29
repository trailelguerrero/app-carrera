import { neon } from '@neondatabase/serverless';

const LS_KEY = 'teg_voluntarios_v1_voluntarios';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Solo el organizador puede resetear PINs (requiere API key)
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { voluntarioId } = req.body || {};
  if (!voluntarioId) return res.status(400).json({ error: 'voluntarioId requerido' });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT value FROM collections WHERE key = ${LS_KEY}`;
    const voluntarios = result.length > 0 && Array.isArray(result[0].value) ? result[0].value : [];

    const voluntario = voluntarios.find(v => String(v.id) === String(voluntarioId));
    if (!voluntario) return res.status(404).json({ error: 'Voluntario no encontrado' });

    const pinReset = pinInicial(voluntario.telefono);
    const pinHash  = hashPin(pinReset);

    const updated = voluntarios.map(v =>
      String(v.id) === String(voluntarioId)
        ? { ...v, pinHash, sessionToken: null, pinPersonalizado: false }
        : v
    );
    const jsonValue = JSON.stringify(updated);
    await sql`
      INSERT INTO collections (key, value)
      VALUES (${LS_KEY}, ${jsonValue}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `;

    return res.status(200).json({ success: true, pinReset });
  } catch (err) {
    console.error('[reset-pin]', err.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}
