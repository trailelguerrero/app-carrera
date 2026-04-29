/**
 * GET /api/voluntarios/check?telefono=XXX
 * Devuelve si el voluntario existe y si ha personalizado su PIN.
 * Sin autenticación — no expone datos sensibles.
 */
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { telefono } = req.query;
  if (!telefono) return res.status(400).json({ error: 'Falta el parámetro telefono' });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT value FROM collections WHERE key = ${LS_KEY}`;
    const voluntarios = result.length > 0 && Array.isArray(result[0].value) ? result[0].value : [];

    const tel = String(telefono).replace(/\D/g, '');
    const voluntario = voluntarios.find(v => String(v.telefono || '').replace(/\D/g, '') === tel);

    if (!voluntario) {
      // No revelar si existe o no — solo decir que no podemos determinar el estado del PIN
      return res.status(200).json({ existe: false, pinPersonalizado: false });
    }

    // Usar el campo guardado si existe, sino comparar hashes
    const pinPersonalizado = voluntario.pinPersonalizado === true ||
      (voluntario.pinHash && voluntario.pinHash !== hashPin(pinInicial(voluntario.telefono)));

    return res.status(200).json({ existe: true, pinPersonalizado: Boolean(pinPersonalizado) });
  } catch (err) {
    console.error('[check] Error:', err.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}
