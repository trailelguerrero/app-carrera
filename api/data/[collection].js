import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const { collection } = req.query;

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
      const result = await sql`SELECT value FROM collections WHERE key = ${collection}`;
      if (result.length > 0) {
        return res.status(200).json(result[0].value);
      } else {
        return res.status(404).json({ error: 'Not found' });
      }
    } 
    
    if (req.method === 'PUT') {
      const body = req.body;
      const jsonValue = JSON.stringify(body);
      
      await sql`
        INSERT INTO collections (key, value) 
        VALUES (${collection}, ${jsonValue}::jsonb)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM collections WHERE key = ${collection}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error(`Collection ${collection} error:`, error);
    return res.status(500).json({ error: error.message });
  }
}
