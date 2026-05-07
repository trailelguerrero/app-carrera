/**
 * camisetasConstants.js
 * T2.1: constantes compartidas entre Voluntarios.jsx y VoluntarioPortal.jsx
 * Fuente única de verdad para tallas, placeholders y guía de medidas.
 */

export const TALLAS = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"];

export const SHIRT_PLACEHOLDER_FRONT = "data:image/svg+xml," + encodeURIComponent(`
<svg width="400" height="450" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="450" fill="var(--bg)"/>
  <text x="200" y="200" text-anchor="middle" fill="#22d3ee" font-size="18" font-family="monospace">CAMISETA TRAIL</text>
  <text x="200" y="230" text-anchor="middle" fill="#22d3ee" font-size="14" font-family="monospace">EL GUERRERO 2026</text>
  <text x="200" y="270" text-anchor="middle" fill="#5a6a8a" font-size="12" font-family="monospace">PARTE DELANTERA</text>
  <text x="200" y="380" text-anchor="middle" fill="#1e2d50" font-size="11" font-family="monospace">Añade tu imagen en el código</text>
</svg>`);

export const SHIRT_PLACEHOLDER_BACK = "data:image/svg+xml," + encodeURIComponent(`
<svg width="400" height="450" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="450" fill="var(--bg)"/>
  <text x="200" y="200" text-anchor="middle" fill="#a78bfa" font-size="18" font-family="monospace">CAMISETA TRAIL</text>
  <text x="200" y="230" text-anchor="middle" fill="#a78bfa" font-size="14" font-family="monospace">EL GUERRERO 2026</text>
  <text x="200" y="270" text-anchor="middle" fill="#5a6a8a" font-size="12" font-family="monospace">PARTE TRASERA</text>
  <text x="200" y="380" text-anchor="middle" fill="#1e2d50" font-size="11" font-family="monospace">Añade tu imagen en el código</text>
</svg>`);

/** Guía de tallas en cm — usada en panel y portal */
export const GUIA_TALLAS = [
  { talla: "XXS", pecho: "76-80",   largo: "62", hombro: "36" },
  { talla: "XS",  pecho: "80-84",   largo: "64", hombro: "38" },
  { talla: "S",   pecho: "84-88",   largo: "66", hombro: "40" },
  { talla: "M",   pecho: "88-92",   largo: "68", hombro: "42" },
  { talla: "L",   pecho: "92-96",   largo: "70", hombro: "44" },
  { talla: "XL",  pecho: "96-104",  largo: "72", hombro: "46" },
  { talla: "XXL", pecho: "104-112", largo: "74", hombro: "48" },
  { talla: "3XL", pecho: "112-120", largo: "76", hombro: "50" },
  { talla: "4XL", pecho: "120-128", largo: "78", hombro: "52" },
];
