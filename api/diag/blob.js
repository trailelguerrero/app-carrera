import { list } from '@vercel/blob';

export default async function handler(req, res) {
  // Endpoint temporal de diagnóstico — sin auth para poder llamarlo desde móvil
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return res.status(200).json({
      ok: false,
      error: 'BLOB_READ_WRITE_TOKEN no está configurado',
    });
  }

  try {
    await list({ token, limit: 1 });
    return res.status(200).json({
      ok: true,
      mensaje: 'Vercel Blob operativo ✓',
      token: token.slice(0, 8) + '…',
    });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      error: e.message,
    });
  }
}
