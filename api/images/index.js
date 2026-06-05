/**
 * api/images/index.js
 * Gestión de imágenes binarias en Vercel Blob
 *
 * POST  — recibe base64, sube a Vercel Blob, devuelve { url }
 * DELETE — borra la URL indicada de Vercel Blob
 *
 * fix: STOR-CRIT-01 — Migrar imágenes de camisetas de base64/localStorage a Vercel Blob
 */
import { put, del } from '@vercel/blob';
import { sql } from '../lib/db.js'; // FASE-7: singleton compartido
import { checkRateLimit } from '../lib/rateLimiter.js'; // MEJ-22

const auth = (req, res) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
};

export default async function handler(req, res) {
  if (!auth(req, res)) return;

  // POST — subir imagen
  if (req.method === 'POST') {
    // MEJ-22: rate limit — 10 uploads/min por IP
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (await checkRateLimit(sql, ip, 'images-upload', { max: 10, windowMs: 60 * 1000 })) {
      return res.status(429).json({ error: 'Demasiados uploads. Inténtalo en un momento.' });
    }
    const { base64, filename, mimeType = 'image/jpeg' } = req.body || {};
    if (!base64 || !filename) {
      return res.status(400).json({ error: 'Faltan base64 o filename' });
    }
    // Validar MIME permitido
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_MIME.includes(mimeType)) {
      return res.status(400).json({ error: 'Tipo de imagen no permitido' });
    }
    // Convertir base64 → Buffer (admite data URL o base64 puro)
    const dataOnly = base64.includes(',') ? base64.split(',')[1] : base64;
    const buffer   = Buffer.from(dataOnly, 'base64');
    const blob     = await put(`images/${filename}`, buffer, {
      access:      'public',
      contentType: mimeType,
      token:       process.env.BLOB_READ_WRITE_TOKEN,
    });
    return res.status(200).json({ url: blob.url });
  }

  // DELETE — borrar imagen
  if (req.method === 'DELETE') {
    const { url } = req.body || {};
    if (url) {
      await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
