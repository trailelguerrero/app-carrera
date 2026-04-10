import { list } from '@vercel/blob';

export default async function handler(req, res) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY)
    return res.status(401).json({ error: 'Unauthorized' });

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return res.status(200).json({
      ok: false,
      error: 'BLOB_READ_WRITE_TOKEN no está configurado en las variables de entorno de Vercel',
    });
  }

  try {
    // Intentar listar blobs — si el token es válido, funciona
    await list({ token, limit: 1 });
    return res.status(200).json({
      ok: true,
      mensaje: 'Token configurado y válido — Vercel Blob operativo',
      tokenPreview: token.slice(0, 12) + '…',
    });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      error: `Token presente pero no válido: ${e.message}`,
    });
  }
}
