import { SK_PROY_HITOS } from "@/constants/storageKeys";
import dataService from "@/lib/dataService";
import { HITOS0 } from "@/components/proyecto/proyectoConstants";

// ─── MEJ-04: vínculo Pedido ↔ Directorio de Contactos ───────────────────────
export function resolverProveedor(pedido, contactos = []) {
  if (!pedido) return null;
  const conts = Array.isArray(contactos) ? contactos : [];
  if (pedido.proveedorId != null) return conts.find(c => c.id === pedido.proveedorId) ?? null;
  if (pedido.proveedor)           return conts.find(c => c.nombre === pedido.proveedor) ?? null;
  return null;
}

// Lee los _pedidoIds de un hito con retrocompatibilidad: hitos antiguos
// pueden tener _pedidoId (singular) en vez de _pedidoIds (array).
export function getPedidoIdsHito(hito) {
  if (Array.isArray(hito?._pedidoIds)) return hito._pedidoIds;
  if (hito?._pedidoId != null) return [hito._pedidoId];
  return [];
}

// Calcula si un hito vinculado a pedidos debe estar completado:
// todos los pedidos vinculados deben estar "recibido" o "facturado".
export function calcCompletadoHitoPedido(pedidoIds, pedidosActuales) {
  if (!pedidoIds.length) return false;
  const pedidos = Array.isArray(pedidosActuales) ? pedidosActuales : [];
  return pedidoIds.every(id => {
    const p = pedidos.find(x => x.id === id);
    return p && (p.estado === "recibido" || p.estado === "facturado");
  });
}

// Sincroniza un hito de "fecha límite de pedido" con SK_PROY_HITOS.
// - hitoDestinoId == null  → comportamiento histórico: el pedido tiene/crea su propio hito (_pedidoIds: [pedido.id]).
// - hitoDestinoId != null  → el pedido se vincula (N:1) a un hito ya existente; no crea uno nuevo.
// pedidosActuales: lista completa de pedidos (incluyendo el que se está guardando), para calcular `completado`
// cuando el hito agrupa varios pedidos.
export async function syncHitoPedido(pedido, action = "upsert", hitoDestinoId = null, pedidosActuales = null) {
  try {
    const hitos = await dataService.get(SK_PROY_HITOS, HITOS0);
    const lista  = Array.isArray(hitos) ? hitos : [];
    const pedidos = Array.isArray(pedidosActuales) ? pedidosActuales : [pedido];

    // Hito que actualmente contiene a este pedido (propio o compartido)
    const idxActual = lista.findIndex(h => getPedidoIdsHito(h).includes(pedido.id));

    if (action === "remove") {
      if (idxActual === -1) return;
      const idsRestantes = getPedidoIdsHito(lista[idxActual]).filter(id => id !== pedido.id);
      let next;
      if (idsRestantes.length === 0) {
        // Sin pedidos restantes: si era un hito auto-generado (solo tenía este pedido), se elimina.
        next = lista.filter((_, i) => i !== idxActual);
      } else {
        next = lista.map((h, i) => i === idxActual
          ? { ...h, _pedidoIds: idsRestantes, completado: calcCompletadoHitoPedido(idsRestantes, pedidos) }
          : h);
      }
      await dataService.set(SK_PROY_HITOS, next);
      dataService.notify("logistica");
      return;
    }

    // Vínculo a hito EXISTENTE (N:1): añadir pedido.id a ese hito, sin crear uno nuevo.
    if (hitoDestinoId != null) {
      // Si el pedido estaba antes en otro hito (propio o distinto), lo retiramos de ahí primero.
      let working = lista;
      if (idxActual !== -1 && lista[idxActual].id !== hitoDestinoId) {
        const idsRestantes = getPedidoIdsHito(lista[idxActual]).filter(id => id !== pedido.id);
        working = idsRestantes.length === 0
          ? lista.filter((_, i) => i !== idxActual)
          : lista.map((h, i) => i === idxActual
              ? { ...h, _pedidoIds: idsRestantes, completado: calcCompletadoHitoPedido(idsRestantes, pedidos) }
              : h);
      }

      const idxDestino = working.findIndex(h => h.id === hitoDestinoId);
      if (idxDestino === -1) return; // hito destino no existe — no-op defensivo

      const idsDestino = Array.from(new Set([...getPedidoIdsHito(working[idxDestino]), pedido.id]));
      const next = working.map((h, i) => i === idxDestino
        ? { ...h, _pedidoIds: idsDestino, completado: calcCompletadoHitoPedido(idsDestino, pedidos) }
        : h);
      await dataService.set(SK_PROY_HITOS, next);
      dataService.notify("logistica");
      return;
    }

    // Sin hito destino explícito: el pedido gestiona su propio hito 1:1 (comportamiento histórico).
    if (!pedido.fechaLimitePedido) {
      if (idxActual === -1) return;
      await dataService.set(SK_PROY_HITOS, lista.filter((_, i) => i !== idxActual));
      dataService.notify("logistica");
      return;
    }

    // Si el pedido estaba vinculado a un hito compartido con OTROS pedidos, no lo "secuestramos":
    // lo sacamos de ahí y le creamos/actualizamos su propio hito 1:1.
    const compartidoConOtros = idxActual !== -1 && getPedidoIdsHito(lista[idxActual]).length > 1;
    let base = lista;
    if (compartidoConOtros) {
      const idsRestantes = getPedidoIdsHito(lista[idxActual]).filter(id => id !== pedido.id);
      base = lista.map((h, i) => i === idxActual
        ? { ...h, _pedidoIds: idsRestantes, completado: calcCompletadoHitoPedido(idsRestantes, pedidos) }
        : h);
    }

    const idxPropio = compartidoConOtros ? -1 : idxActual;
    const idsPropio = [pedido.id];
    const hitoData = {
      nombre:    `🛒 Pedido: ${pedido.nombre}`,
      fecha:     pedido.fechaLimitePedido,
      critico:   false,
      completado: calcCompletadoHitoPedido(idsPropio, pedidos),
      _pedidoIds: idsPropio,
    };

    let next;
    if (idxPropio === -1) {
      const maxId = base.reduce((m, h) => Math.max(m, typeof h.id === "number" ? h.id : 0), 0);
      next = [...base, { ...hitoData, id: maxId + 1 }];
    } else {
      next = base.map((h, i) => i === idxPropio ? { ...h, ...hitoData } : h);
    }
    await dataService.set(SK_PROY_HITOS, next);
    dataService.notify("logistica");
  } catch (e) {
    console.error("[LogisticaPedidos] syncHitoPedido:", e.message);
  }
}

// Sincroniza el stock de material cuando un pedido cambia de/a estado "recibido".
export function syncStockMaterial(pedido, estadoNuevo, material) {
  const estadoAnterior = pedido.estado;
  const articulos = Array.isArray(pedido.articulos) ? pedido.articulos : [];
  const mat = Array.isArray(material) ? material : [];

  const acreditar    = estadoAnterior !== "recibido" && estadoNuevo === "recibido";
  const desacreditar = estadoAnterior === "recibido" && estadoNuevo !== "recibido";

  if (!acreditar && !desacreditar) {
    return { pedidoActualizado: { ...pedido, estado: estadoNuevo }, materialActualizado: mat };
  }

  const articulosActualizados = articulos.map(a => {
    if (!a.materialId) return a;
    if (acreditar   && !a.stockAcreditado) return { ...a, stockAcreditado: true  };
    if (desacreditar &&  a.stockAcreditado) return { ...a, stockAcreditado: false };
    return a;
  });

  const delta = {};
  articulos.forEach((a, i) => {
    if (!a.materialId) return;
    const nuevo = articulosActualizados[i];
    if (acreditar   && !a.stockAcreditado && nuevo.stockAcreditado)  delta[a.materialId] = (delta[a.materialId] || 0) + (a.cantidad || 0);
    if (desacreditar &&  a.stockAcreditado && !nuevo.stockAcreditado) delta[a.materialId] = (delta[a.materialId] || 0) - (a.cantidad || 0);
  });

  const materialActualizado = mat.map(m =>
    delta[m.id] !== undefined ? { ...m, stock: Math.max(0, (m.stock || 0) + delta[m.id]) } : m
  );

  return {
    pedidoActualizado: { ...pedido, estado: estadoNuevo, articulos: articulosActualizados },
    materialActualizado,
  };
}

// Calcula el precio unitario de un concepto de presupuesto para usar en artículos de pedido.
export function calcPrecioUnitario(concepto, material = []) {
  if (!concepto) return { precio: 0, esFijo: false, costeTotal: 0 };

  if (concepto.tipo === "variable") {
    const dists = ["TG7", "TG13", "TG25"].filter(d =>
      concepto.activoDistancias?.[d] && (concepto.costePorDistancia?.[d] || 0) > 0
    );
    if (!dists.length) return { precio: 0, esFijo: false, costeTotal: 0 };
    const precio = concepto.modoUniforme
      ? (concepto.costePorDistancia?.TG7 || 0)
      : dists.reduce((s, d) => s + (concepto.costePorDistancia[d] || 0), 0) / dists.length;
    return { precio, esFijo: false, costeTotal: 0 };
  }

  // Concepto FIJO
  const matVinculado = material.find(m => m.presupuestoConceptoId === concepto.id);
  const unidades = matVinculado?.stock || 0;
  if (unidades > 0) {
    return { precio: concepto.costeTotal / unidades, esFijo: true, costeTotal: concepto.costeTotal, unidades };
  }
  return { precio: 0, esFijo: true, costeTotal: concepto.costeTotal, unidades: 0 };
}

export const ESTADOS_PEDIDO = [
  { id: "borrador",   label: "Borrador",   color: "var(--text-muted)", bg: "var(--surface2)"   },
  { id: "confirmado", label: "Confirmado", color: "var(--cyan)",       bg: "var(--cyan-dim)"   },
  { id: "recibido",   label: "Recibido",   color: "var(--green)",      bg: "var(--green-dim)"  },
  { id: "facturado",  label: "Facturado",  color: "var(--violet)",     bg: "var(--violet-dim)" },
];

export const ESTADOS_FACTURA = [
  { id: "pendiente", label: "Pendiente", color: "var(--amber)" },
  { id: "pagada",    label: "Pagada",    color: "var(--green)" },
];

export const genPedidoId = (arr) => arr.length ? Math.max(...arr.map(x => x.id || 0)) + 1 : 1;
