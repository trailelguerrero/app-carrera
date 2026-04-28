import { neon } from '@neondatabase/serverless';

const LS_KEY = 'teg_voluntarios_v1_voluntarios';

// Hash idéntico al del panel del organizador (Index.jsx)
function hashPin(pin) {
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
  }
  return String(h);
}

// PIN inicial: últimos 4 dígitos del teléfono
function pinInicial(telefono) {
  const digits = (telefono || '').replace(/\D/g, '');
  return digits.slice(-4) || '0000';
}

// Rate limiting en memoria (se reinicia en cada cold start — suficiente para protección básica)
const intentos = new Map();
function isRateLimited(ip) {
  const ahora = Date.now();
  const registro = intentos.get(ip) || { count: 0, resetAt: ahora + 10 * 60 * 1000 };
  if (ahora > registro.resetAt) { intentos.set(ip, { count: 1, resetAt: ahora + 10 * 60 * 1000 }); return false; }
  if (registro.count >= 5) return true;
  registro.count++;
  intentos.set(ip, registro);
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  }

  const { telefono, pin } = req.body || {};
  if (!telefono || !pin) {
    return res.status(400).json({ error: 'Teléfono o PIN incorrecto' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT value FROM collections WHERE key = ${LS_KEY}`;
    const voluntarios = result.length > 0 && Array.isArray(result[0].value) ? result[0].value : [];

    const tel = String(telefono).replace(/\D/g, '');
    const voluntario = voluntarios.find(v => String(v.telefono || '').replace(/\D/g, '') === tel);

    if (!voluntario) {
      return res.status(401).json({ error: 'Teléfono o PIN incorrecto' });
    }

    // Si no tiene pinHash, generarlo a partir del teléfono (migración silenciosa)
    const pinHashEsperado = voluntario.pinHash || hashPin(pinInicial(voluntario.telefono));
    const pinHashRecibido = hashPin(String(pin));

    if (pinHashRecibido !== pinHashEsperado) {
      return res.status(401).json({ error: 'Teléfono o PIN incorrecto' });
    }

    // Generar sessionToken
    const sessionToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

    // Guardar sessionToken y pinHash en el voluntario
    const updatedVols = voluntarios.map(v =>
      String(v.telefono || '').replace(/\D/g, '') === tel
        ? { ...v, pinHash: pinHashEsperado, sessionToken }
        : v
    );
    const jsonValue = JSON.stringify(updatedVols);
    await sql`
      INSERT INTO collections (key, value)
      VALUES (${LS_KEY}, ${jsonValue}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `;

    // Devolver datos del voluntario (sin pinHash ni sessionToken)
    const { pinHash: _, sessionToken: __, ...volPublico } = voluntario;
    return res.status(200).json({ voluntario: { ...volPublico, sessionToken }, token: sessionToken });

  } catch (err) {
    console.error('[auth] Error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
