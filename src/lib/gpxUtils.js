/**
 * gpxUtils.js — Utilidades para parsear y simplificar tracks GPX.
 *
 * Flujo completo:
 *   1. parseGpx(xmlText)         → array de [lat, lng]  (todos los puntos)
 *   2. simplifyTrack(pts, tol)   → array de [lat, lng]  (reducido con D-P)
 *   3. gpxFileToTrack(file)      → Promise<{ puntos, totalOriginal }>
 *
 * La tolerancia 0.0001° (~11 m) reduce TG25 de 9.219 pts a ~300 pts.
 * Almacenando sólo [lat,lng] en lugar del XML completo se ahorra ~98% de espacio.
 */

// ─── PARSER ──────────────────────────────────────────────────────────────────

/**
 * Extrae los puntos de track de un string XML GPX.
 * Soporta <trkpt> (tracks) y <wpt> (waypoints como fallback).
 * @param {string} xml
 * @returns {Array<[number, number]>}  [[lat, lng], ...]
 */
export function parseGpx(xml) {
  // Preferimos DOMParser si está disponible (navegador)
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const trkpts = Array.from(doc.querySelectorAll("trkpt"));
    if (trkpts.length > 0) {
      return trkpts
        .map(pt => [parseFloat(pt.getAttribute("lat")), parseFloat(pt.getAttribute("lon"))])
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
    }
    // Fallback: waypoints
    const wpts = Array.from(doc.querySelectorAll("wpt"));
    return wpts
      .map(pt => [parseFloat(pt.getAttribute("lat")), parseFloat(pt.getAttribute("lon"))])
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
  }

  // Fallback regex para entornos sin DOMParser
  const re = /trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
  const pts = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (!isNaN(lat) && !isNaN(lng)) pts.push([lat, lng]);
  }
  return pts;
}

// ─── SIMPLIFICADOR (Douglas-Peucker) ─────────────────────────────────────────

/**
 * Distancia perpendicular de un punto a la línea start→end.
 * Trabajamos en coordenadas planas (válido para distancias cortas en grados).
 */
function perpendicularDist(pt, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) {
    return Math.hypot(pt[0] - start[0], pt[1] - start[1]);
  }
  const len2 = dx * dx + dy * dy;
  return Math.abs(dy * pt[0] - dx * pt[1] + end[0] * start[1] - end[1] * start[0]) / Math.sqrt(len2);
}

/**
 * Algoritmo Douglas-Peucker recursivo.
 * @param {Array<[number,number]>} pts
 * @param {number} tolerance  en grados (0.0001° ≈ 11 m)
 * @returns {Array<[number,number]>}
 */
export function simplifyTrack(pts, tolerance = 0.0001) {
  if (pts.length < 3) return pts;

  let maxDist = 0;
  let maxIdx  = 0;

  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpendicularDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      maxIdx  = i;
    }
  }

  if (maxDist > tolerance) {
    const left  = simplifyTrack(pts.slice(0, maxIdx + 1), tolerance);
    const right = simplifyTrack(pts.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [pts[0], pts[pts.length - 1]];
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────

/**
 * Lee un archivo GPX (File API) y devuelve el track simplificado.
 *
 * @param {File}   file
 * @param {number} [tolerance=0.0001]  tolerancia D-P en grados
 * @returns {Promise<{ puntos: Array<[number,number]>, totalOriginal: number, nombre: string }>}
 */
export function gpxFileToTrack(file, tolerance = 0.0001) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo GPX"));
    reader.onload  = (e) => {
      try {
        const xml            = e.target.result;
        const allPts         = parseGpx(xml);
        if (allPts.length === 0) {
          reject(new Error("El archivo GPX no contiene puntos de track válidos"));
          return;
        }
        const puntos         = simplifyTrack(allPts, tolerance);
        const nombre         = extractGpxName(xml) || file.name.replace(/\.gpx$/i, "");
        resolve({ puntos, totalOriginal: allPts.length, nombre });
      } catch (err) {
        reject(new Error("Error parseando GPX: " + err.message));
      }
    };
    reader.readAsText(file);
  });
}

/**
 * Extrae el <name> del GPX si existe.
 * @param {string} xml
 * @returns {string|null}
 */
function extractGpxName(xml) {
  const m = xml.match(/<name[^>]*>\s*([^<]+?)\s*<\/name>/);
  return m ? m[1].trim() : null;
}

// ─── COLORES POR DEFECTO ──────────────────────────────────────────────────────

/** Paleta por defecto para hasta 6 recorridos distintos */
export const TRACK_COLORS_DEFAULT = [
  "#22d3ee",   // cyan    → TG7
  "#a78bfa",   // violeta → TG13
  "#34d399",   // verde   → TG25
  "#fbbf24",   // ámbar
  "#f87171",   // rojo
  "#60a5fa",   // azul
];

/**
 * Devuelve el color sugerido para un recorrido nuevo según su índice en la lista.
 * @param {number} index
 * @returns {string}  color hex
 */
export function defaultTrackColor(index) {
  return TRACK_COLORS_DEFAULT[index % TRACK_COLORS_DEFAULT.length];
}
