import { neon } from '@neondatabase/serverless';

const auth = (req, res) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
};

let tableReady = false;

const ensureTable = async (sql) => {
  await sql`
    CREATE TABLE IF NOT EXISTS budget_log (
      id          SERIAL PRIMARY KEY,
      ts          TIMESTAMPTZ DEFAULT NOW(),
      concepto_id INTEGER,
      concepto    TEXT NOT NULL,
      campo       TEXT NOT NULL,
      valor_antes TEXT,
      valor_nuevo TEXT,
      tipo        TEXT
    )
  `;
};

export default async function handler(req, res) {
  if (!auth(req, res)) return;
  try {
    const sql = neon(process.env.DATABASE_URL);
    if (!tableReady) { await ensureTable(sql); tableReady = true; }

    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query.limit || '50'), 200);
      const rows = await sql`
        SELECT id, ts, concepto_id, concepto, campo, valor_antes, valor_nuevo, tipo
        FROM budget_log ORDER BY ts DESC LIMIT ${limit}
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { conceptoId, concepto, campo, valorAntes, valorNuevo, tipo } = req.body;
      if (!concepto || !campo) return res.status(400).json({ error: 'Faltan campos' });
      await sql`
        INSERT INTO budget_log (concepto_id, concepto, campo, valor_antes, valor_nuevo, tipo)
        VALUES (${conceptoId ?? null}, ${concepto}, ${campo},
                ${String(valorAntes ?? '')}, ${String(valorNuevo ?? '')}, ${tipo ?? null})
      `;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM budget_log`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('[budget-log]', error);
    return res.status(500).json({ error: error.message });
  }
}
