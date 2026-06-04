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

// Sincroniza un hito de "fecha límite de pedido" con SK_PROY_HITOS.
export async function syncHitoPedido(pedido, action = "upsert") {
  try {
    const hitos = await dataService.get(SK_PROY_HITOS, HITOS0);
    const lista  = Array.isArray(hitos) ? hitos : [];
    const idx    = lista.findIndex(h => h._pedidoId === pedido.id);

    if (action === "remove" || !pedido.fechaLimitePedido) {
      if (idx === -1) return;
      await dataService.set(SK_PROY_HITOS, lista.filter((_, i) => i !== idx));
      dataService.notify("logistica");
      return;
    }

    const hitoData = {
      nombre:    `🛒 Pedido: ${pedido.nombre}`,
      fecha:     pedido.fechaLimitePedido,
      critico:   false,
      completado: pedido.estado === "recibido" || pedido.estado === "facturado",
      _pedidoId: pedido.id,
    };

    let next;
    if (idx === -1) {
      const maxId = lista.reduce((m, h) => Math.max(m, typeof h.id === "number" ? h.id : 0), 0);
      next = [...lista, { ...hitoData, id: maxId + 1 }];
    } else {
      next = lista.map((h, i) => i === idx ? { ...h, ...hitoData } : h);
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
