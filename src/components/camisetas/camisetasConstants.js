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
 * esVoluntarioElegibleCamiseta — política centralizada de elegibilidad de voluntarios
 * ──────────────────────────────────────────────────────────────────────────────────
 * FUENTE ÚNICA DE VERDAD para decidir si un voluntario debe recibir camiseta.
 *
 * Política:
 *   - "cancelado"  → NUNCA elegible (se retiró del evento)
 *   - "ausente"    → NUNCA elegible (no se presentó; no corresponde asignar camiseta)
 *   - "confirmado" → SIEMPRE elegible
 *   - "pendiente"  → elegible SOLO si inclPendientes === true
 *
 * Requisito adicional: el voluntario debe tener talla asignada.
 *
 * @param {object}  v               - Registro de voluntario
 * @param {boolean} inclPendientes  - Si true, los pendientes también son elegibles
 * @returns {boolean}
 */
export function esVoluntarioElegibleCamiseta(v, inclPendientes = false) {
  if (!v?.talla) return false;
  if (v.estado === "cancelado" || v.estado === "ausente") return false;
  if (v.estado === "confirmado") return true;
  if (v.estado === "pendiente") return inclPendientes === true;
  return false; // estados desconocidos: excluir por defecto
}

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
 * calcPedido — métricas financieras de un pedido individual
 * ──────────────────────────────────────────────────────────
 * Contrato de retorno:
 *
 * MÉTRICAS BASE
 *   totalUnid       {number} Unidades físicas totales (todas las líneas)
 *   totalCoste      {number} Gasto al proveedor: Σ cantidad × coste_unitario
 *   totalVenta      {number} Ingreso facturable: Σ cantidad × precioVenta (excluye regalos)
 *
 * MÉTRICAS DE MARGEN POR ESTADO DE COBRO (mutuamente excluyentes entre sí)
 *   benRealizado    {number} Margen bruto de líneas YA COBRADAS (estadoPago === "pagado")
 *   benPotencial    {number} Margen bruto de líneas PENDIENTES de cobro (estadoPago === "pendiente")
 *                            No incluye regalos (no generan ingreso futuro)
 *   costeRegalos    {number} Coste de fabricación de unidades sin ingreso (estadoPago === "regalo")
 *
 * MÉTRICAS COMPUESTAS (semánticamente puras)
 *   beneficioProyectado {number} benRealizado + benPotencial
 *                                Margen si se cobran todos los pendientes.
 *                                No resta costeRegalos: los regalos ya están excluidos
 *                                de benRealizado y benPotencial por construcción.
 *   margenBrutoTotal    {number} totalVenta - totalCoste
 *                                Techo teórico: margen si todo se cobra y no hay regalos.
 *
 * CAMPO DEPRECADO — se mantiene por retrocompatibilidad
 *   beneficio       {number} ALIAS de benRealizado.
 *                            El valor anterior (benRealizado + benPotencial - costeRegalos)
 *                            mezclaba tres certezas distintas en un número opaco.
 *                            Migrar a beneficioProyectado (proyectado) o benRealizado (cobrado).
 */
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
  const beneficioProyectado = benRealizado + benPotencial;
  const margenBrutoTotal    = totalVenta - totalCoste;
  const beneficio           = benRealizado; // alias deprecado
  return { totalVenta, totalCoste, totalUnid, beneficio, benRealizado, benPotencial, costeRegalos, beneficioProyectado, margenBrutoTotal };
};

export const badgePago = (p) => {
  const pagos = [...new Set(p.lineas.map(l => l.estadoPago||"pendiente"))];
  if (pagos.length===1) return EP[pagos[0]];
  if (pagos.includes("pendiente")) return { ...EP.pendiente, label:"Mixto" };
  return { ...EP.pagado, label:"Mixto" };
};
export const badgeEnt = (p) =>
  p.lineas.some(l => (l.estadoEntrega||"pendiente")==="pendiente") ? EE.pendiente : EE.entregado;

/**
 * estadoPagoPedido — estado de pago canónico de un pedido (INC-03)
 * ─────────────────────────────────────────────────────────────────
 * FUENTE ÚNICA DE VERDAD para clasificar un pedido en un grupo de pago.
 * Úsalo tanto en la clasificación kanban/lista COMO en el filtro de búsqueda
 * para garantizar coherencia: si el filtro "pendiente" devuelve un pedido,
 * ese pedido SIEMPRE estará en el grupo "Pendiente" del kanban/lista.
 *
 * Criterio: estado MÁS DESFAVORABLE de todas las líneas.
 * Jerarquía (de más a menos desfavorable): pendiente > regalo > pagado
 *
 *   - Si hay alguna línea "pendiente" → el pedido es "pendiente"
 *     (hay deuda de cobro sin resolver)
 *   - Si no hay pendientes pero hay algún "regalo" → el pedido es "regalo"
 *     (no hay cobro pendiente, pero tampoco está todo pagado)
 *   - Si todas las líneas son "pagado" → el pedido es "pagado"
 *
 * Un pedido con múltiples estados distintos se considera "mixto" a efectos
 * visuales (ver esMixto), pero sigue clasificándose en un único grupo.
 *
 * @param {object} p - Pedido con array p.lineas
 * @returns {"pendiente"|"regalo"|"pagado"}
 */
export function estadoPagoPedido(p) {
  const estados = p.lineas.map(l => l.estadoPago || "pendiente");
  if (estados.some(e => e === "pendiente")) return "pendiente";
  if (estados.some(e => e === "regalo"))    return "regalo";
  return "pagado";
}

/**
 * esPedidoMixto — true si el pedido tiene líneas en más de un estado de pago.
 * Útil para mostrar un indicador visual en la tarjeta kanban.
 * @param {object} p - Pedido con array p.lineas
 * @returns {boolean}
 */
export function esPedidoMixto(p) {
  const estados = new Set(p.lineas.map(l => l.estadoPago || "pendiente"));
  return estados.size > 1;
}

export const CORREDORES_DEFAULT = Object.fromEntries(TALLAS.map(t => [t, 0]));
export const NINO_DEFAULT       = Object.fromEntries(TALLAS_NINO.map(t => [t, 0]));

export const FUENTES_DEFAULT = {
  corredoresPlat: true,
  extrasCorredor: true,
  voluntariosAuto: true,
  extrasVoluntario: true,
  ninoManual: true,
  extrasNino: true,
};

/** Exporta consolidación de tallas como CSV para el proveedor */
export function exportarPedidoProveedor(grandTallasCor, grandTallasVol, ninoExt, margenPct = 5, eventRef = "evento") {
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
    download: `pedido-proveedor-${eventRef.toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

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
