/**
 * camisetasConstants.js — Fase 3, Tarea 3.4
 * Constantes y helpers compartidos entre los sub-componentes de Camisetas.
 */
import { SK_CAM_ROOT } from "@/constants/storageKeys";

export const LS = SK_CAM_ROOT;

export const TALLAS      = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"];
export const TALLAS_NINO = ["4-6","6-8","8-10","10-12"];
export const TIPOS       = ["corredor","voluntario","nino"];

export const TC = {
  corredor:   { label:"Corredor",   icon:"🏃",  color:"var(--cyan)",   dim:"var(--cyan-dim)"   },
  voluntario: { label:"Voluntario", icon:"👥",  color:"var(--violet)", dim:"var(--violet-dim)" },
  nino:       { label:"Niño/a",     icon:"👶",  color:"var(--green)",  dim:"var(--green-dim)"  },
};

export const EP = {
  pendiente: { label:"Pendiente", color:"var(--amber)", bg:"var(--amber-dim)",  icon:"⏳" },
  pagado:    { label:"Pagado",    color:"var(--green)", bg:"var(--green-dim)",  icon:"✅" },
  regalo:    { label:"Regalo",    color:"var(--violet)",bg:"var(--violet-dim)", icon:"🎁" },
};
export const EE = {
  pendiente: { label:"Pendiente", color:"var(--amber)", bg:"var(--amber-dim)", icon:"📦" },
  entregado: { label:"Entregado", color:"var(--green)", bg:"var(--green-dim)", icon:"✔️" },
};

export const ESTADOS_PAGO    = ["pendiente","pagado","regalo"];
export const ESTADOS_ENTREGA = ["pendiente","entregado"];

export const estadoCombinado = (lineas=[]) => {
  if (!lineas.length) return { emoji:"🟡", label:"Sin líneas",      color:"var(--amber)", bg:"var(--amber-dim)" };
  const allPagado    = lineas.every(l => l.estadoPago    === "pagado"    || l.estadoPago    === "regalo");
  const allEntregado = lineas.every(l => l.estadoEntrega === "entregado");
  const anyPagado    = lineas.some(l  => l.estadoPago    === "pagado"    || l.estadoPago    === "regalo");
  if (allPagado && allEntregado) return { emoji:"🟢", label:"Completado",        color:"var(--green)",  bg:"var(--green-dim)"  };
  if (allPagado)                  return { emoji:"🔵", label:"Pagado · pendiente", color:"var(--cyan)",   bg:"var(--cyan-dim)"   };
  if (!anyPagado)                 return { emoji:"🟡", label:"Pendiente pago",    color:"var(--amber)",  bg:"var(--amber-dim)"  };
  return                                 { emoji:"🟠", label:"Pago parcial",       color:"#fb923c",       bg:"rgba(251,146,60,.1)" };
};

export const PEDIDOS_DEFAULT = [];

/**
 * COSTE_DEFAULT — coste unitario de fabricación por tipo de camiseta.
 *
 * FUENTE ÚNICA DE VERDAD (ECO-03): este objeto es el único lugar donde se definen
 * estos valores. Cualquier otro módulo que los necesite debe importarlos desde aquí.
 *
 *   - budgetConstants.js     re-exporta este objeto (compatibilidad)
 *   - useBudgetLogic.js      importa CAM_COSTE_DEFAULT desde aquí como fallback de useData
 *   - budgetUtils.js         usa estos valores como default de parámetro
 *
 * Si el proveedor cambia precios, editar SOLO aquí.
 */
export const COSTE_DEFAULT   = { corredor:8, voluntario:7, nino:6 };

/**
 * PRECIO_NO_CORREDOR_DEFAULT — ECO-11: fuente única del precio por defecto de
 * "camiseta modelo corredor vendida a no corredores vía plataforma".
 *
 * Antes este default estaba hardcodeado en 3 sitios con valores DIFERENTES
 * (Camisetas.jsx: 18, useBudgetLogic.js: 0, useDashboardKpis.js: 0). Si la clave
 * de storage SK_CAM_PRECIO_NO_CORREDOR llegaba vacía/null en cualquiera de los 3
 * puntos de lectura, el panel Camisetas mostraba 18€ mientras que Presupuesto y
 * Dashboard calculaban con 0€ — mismo dato, dos resultados. Importar SOLO desde aquí.
 */
export const PRECIO_NO_CORREDOR_DEFAULT = 18;

export const calcPedido = (p, coste) => {
  const totalVenta    = p.lineas.reduce((s,l) => s + (l.estadoPago==="regalo" ? 0 : l.cantidad*(l.precioVenta||0)), 0);
  const totalCoste    = p.lineas.reduce((s,l) => s + l.cantidad*(coste[l.tipo]||0), 0);
  const totalUnid     = p.lineas.reduce((s,l) => s + l.cantidad, 0);
  const benRealizado  = p.lineas.filter(l=>l.estadoPago==="pagado")
    .reduce((s,l) => s + l.cantidad*((l.precioVenta||0)-(coste[l.tipo]||0)), 0);
  const benPotencial  = p.lineas.filter(l=>(l.estadoPago||"pendiente")==="pendiente")
    .reduce((s,l) => s + l.cantidad*((l.precioVenta||0)-(coste[l.tipo]||0)), 0);
  const costeRegalos  = p.lineas.filter(l=>l.estadoPago==="regalo")
    .reduce((s,l) => s + l.cantidad*(coste[l.tipo]||0), 0);
  const beneficio     = benRealizado + benPotencial - costeRegalos;
  return { totalVenta, totalCoste, totalUnid, beneficio, benRealizado, benPotencial, costeRegalos };
};

export const badgePago = (p) => {
  const pagos = [...new Set(p.lineas.map(l => l.estadoPago||"pendiente"))];
  if (pagos.length===1) return EP[pagos[0]];
  if (pagos.includes("pendiente")) return { ...EP.pendiente, label:"Mixto" };
  return { ...EP.pagado, label:"Mixto" };
};
export const badgeEnt = (p) =>
  p.lineas.some(l => (l.estadoEntrega||"pendiente")==="pendiente") ? EE.pendiente : EE.entregado;

export const CORREDORES_DEFAULT = Object.fromEntries(TALLAS.map(t => [t, 0]));
export const NINO_DEFAULT       = Object.fromEntries(TALLAS_NINO.map(t => [t, 0]));
/** Default por talla para la fuente "no corredores" (modelo corredor vendido a no corredores) */
export const NOCORREDOR_DEFAULT = Object.fromEntries(TALLAS.map(t => [t, 0]));

export const FUENTES_DEFAULT = {
  corredoresPlat: true,
  extrasCorredor: true,
  voluntariosAuto: true,
  extrasVoluntario: true,
  // ECO-11: las tallas de niño manuales AHORA SÍ llegan al cálculo de Presupuesto/
  // Ingresos vía calculateCamisetasPresupuesto (categoría "nino", solo gasto, igual
  // tratamiento que "voluntarios"). Activado por defecto para coherencia con el resto
  // de fuentes — si ya tenías tallas de niño manuales cargadas, su coste empezará a
  // aparecer en el balance económico del evento (antes desaparecía silenciosamente).
  ninoManual: true,
  extrasNino: true,
  noCorredoresPlat: true,
};

/** Exporta consolidación de tallas como CSV para el proveedor */
export function exportarPedidoProveedor(grandTallasCor, grandTallasVol, ninoExt, margenPct = 5) {
  const filas = [["Tipo","Talla","Unidades_Base","Margen_%","Total_A_Pedir","Coste_Unitario","Total_Coste"]];
  const agregar = (tipo, tallas, mapa) => {
    tallas.forEach(t => {
      const base = mapa[t] || 0;
      if (base <= 0) return;
      const total = Math.ceil(base * (1 + margenPct / 100));
      filas.push([tipo, t, base, margenPct + "%", total, "", ""]);
    });
  };
  agregar("corredor",   TALLAS,      grandTallasCor);
  agregar("voluntario", TALLAS,      grandTallasVol);
  agregar("nino",       TALLAS_NINO, ninoExt);
  const csv = "﻿" + filas.map(r => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `pedido-proveedor-teg-${new Date().toISOString().slice(0,10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

/** Placeholders SVG para la vista previa de camiseta (delantera/trasera) */
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

/** Guía de tallas en cm — usada en panel, portal y voluntarios */
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

/** CSS local de Camisetas — inyectado una sola vez con <style> en el orquestador */
export const CAM_CSS = `
  .ph{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap}
  .pt{font-size:1.5rem;font-weight:900;letter-spacing:-0.02em}.pd{font-family:var(--font-mono);font-size:.62rem;color:var(--text-muted);margin-top:.25rem}
  .fr{display:flex;align-items:center;flex-wrap:wrap}.g1{gap:.5rem}.mt1{margin-top:.5rem}
  .fl{font-size:.72rem;font-weight:600;margin-bottom:.3rem;display:block;color:var(--text-muted)}
  .cam-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:.75rem 1rem;cursor:pointer;transition:all .15s;margin-bottom:.4rem}
  .cam-row:hover{border-color:var(--border-light);box-shadow:0 2px 8px rgba(0,0,0,.2)}
  @media(max-width:640px){.ph{flex-direction:column;gap:.75rem}}
`;

/**
 * ECO-10/ECO-11 — CLAVES_FUENTES_COMPARTIDAS: mapa de las claves de fuentesActivas
 * (módulo Camisetas) que tienen un equivalente exacto 1:1 en camSyncConfig (módulo
 * Presupuesto). Antes eran toggles independientes con su propio storage, que podían
 * quedar desincronizados: desactivar "Corredores" en el módulo Camisetas no movía
 * nada en Presupuesto/Ingresos, y viceversa. A partir de ahora son el mismo estado.
 *
 * ECO-11: ninoManual se añade aquí porque ahora calculateCamisetasPresupuesto SÍ
 * recibe ninoExt (antes no llegaba al presupuesto en absoluto — ver budgetUtils.js).
 *
 * No incluye extrasCorredor/extrasVoluntario/extrasNino porque Presupuesto los
 * agrupa todos juntos bajo "camOtros"/"camRegalos" según estadoPago — no hay
 * equivalente 1:1 para esas 3 claves sin cambiar el modelo de datos de Presupuesto.
 */
export const CLAVES_FUENTES_COMPARTIDAS = {
  corredoresPlat:   "camCorredores",
  noCorredoresPlat: "camNoCorredores",
  voluntariosAuto:  "camVoluntarios",
  ninoManual:       "camNino",
};

/**
 * combinarFuentesActivas — función pura (ECO-10): construye el objeto fuentesActivas
 * "visible" combinando los datos locales del módulo Camisetas (fuentesLocal, claves de
 * extras) con los 3 toggles compartidos que ahora viven en camSyncConfig (Presupuesto).
 *
 * @param {object} fuentesLocal     - valor crudo de SK_CAM_FUENTES (puede tener forma antigua)
 * @param {object} camSyncConfig    - valor crudo de SK_PPTO_CAM_SYNC_CONFIG
 * @param {object} fuentesDefault   - FUENTES_DEFAULT
 * @param {object} camSyncDefault   - CAMISETAS_SYNC_CONFIG_DEFAULT
 * @returns {object} fuentesActivas combinado, listo para usar en la UI
 */
export function combinarFuentesActivas(fuentesLocal, camSyncConfig, fuentesDefault, camSyncDefault) {
  const local = (fuentesLocal && typeof fuentesLocal === "object" && !Array.isArray(fuentesLocal))
    ? { ...fuentesDefault, ...fuentesLocal } : fuentesDefault;
  const sync = (camSyncConfig && typeof camSyncConfig === "object" && !Array.isArray(camSyncConfig))
    ? { ...camSyncDefault, ...camSyncConfig } : camSyncDefault;
  const combinado = { ...local };
  Object.entries(CLAVES_FUENTES_COMPARTIDAS).forEach(([claveLocal, claveSync]) => {
    combinado[claveLocal] = sync[claveSync];
  });
  return combinado;
}
