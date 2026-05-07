import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  // T1.2 — SEC: protect setup endpoint with API key
  const apiKey = req.headers['x-api-key'];
  const configuredKey = process.env.API_KEY;
  if (!configuredKey) return res.status(503).json({ error: 'Setup endpoint not configured' });
  if (!apiKey || apiKey !== configuredKey) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Create a simple key-value JSON store table
    await sql`
      CREATE TABLE IF NOT EXISTS collections (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    return res.status(200).json({ message: 'Database setup successful!' });
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ error: error.message });
  }
}
