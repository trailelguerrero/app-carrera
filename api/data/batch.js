import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Security check: API Key authorization
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'GET') {
      const keysParam = req.query.keys;
      if (!keysParam) return res.status(400).json({ error: 'Missing keys' });
      
      const keys = keysParam.split(',');
      const result = await sql`SELECT key, value FROM collections WHERE key = ANY(${keys})`;
      
      const data = {};
      result.forEach(row => {
        data[row.key] = row.value;
      });
      
      return res.status(200).json(data);
    } 
    
    if (req.method === 'PUT') {
      const entries = req.body; 
      
      const promises = Object.entries(entries).map(([key, value]) => {
        const jsonValue = JSON.stringify(value);
        return sql`
          INSERT INTO collections (key, value) 
          VALUES (${key}, ${jsonValue}::jsonb)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
        `;
      });
      
      await Promise.all(promises);
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Batch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
