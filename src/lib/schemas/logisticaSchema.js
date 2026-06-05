/**
 * logisticaSchema.js — Fase 5
 *
 * Esquema Zod centralizado para pedidos a proveedores (módulo Logística).
 * Usado en:
 *   - ModalPedidoProv.jsx (validación cliente)
 *
 * Fuente única de verdad: cambiar aquí afecta a toda la validación del módulo.
 */
import { z } from 'zod';

export const ESTADOS_PEDIDO_VALIDOS  = ['borrador', 'enviado', 'confirmado', 'recibido', 'cancelado'];
export const ESTADOS_FACTURA_VALIDOS = ['pendiente', 'pagada', 'cancelada'];
export const FUENTES_ARTICULO_VALIDAS = ['manual', 'material', 'presupuesto'];

/** Artículo individual del pedido */
export const articuloPedidoSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre del artículo es obligatorio' })
    .min(1, 'El nombre del artículo es obligatorio')
    .max(200, 'El nombre es demasiado largo')
    .trim(),

  cantidad: z
    .number({ invalid_type_error: 'La cantidad debe ser un número' })
    .int('La cantidad debe ser un número entero')
    .min(1, 'La cantidad mínima es 1'),

  precioUnit: z
    .number({ invalid_type_error: 'El precio debe ser un número' })
    .min(0, 'El precio no puede ser negativo')
    .default(0),

  esFijo: z.boolean().optional().default(false),

  costeTotal: z
    .number()
    .min(0, 'El coste no puede ser negativo')
    .optional()
    .default(0),

  fuente: z
    .string()
    .refine((v) => FUENTES_ARTICULO_VALIDAS.includes(v), {
      message: 'Fuente de artículo no válida',
    })
    .optional()
    .default('manual'),

  materialId:  z.union([z.string(), z.number()]).nullable().optional(),
  conceptoId:  z.union([z.string(), z.number()]).nullable().optional(),
});

/** Factura vinculada (opcional) */
const facturaSchema = z
  .object({
    docId:   z.string().nullable().optional(),
    numero:  z.string().max(100).optional().default(''),
    importe: z.number().min(0).optional().default(0),
    estado:  z
      .string()
      .refine((v) => ESTADOS_FACTURA_VALIDOS.includes(v), {
        message: 'Estado de factura no válido',
      })
      .optional()
      .default('pendiente'),
    fecha:   z.string().optional().default(''),
    blobUrl: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

/** Esquema completo del pedido a proveedor */
export const pedidoProveedorSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre del pedido es obligatorio' })
    .min(1, 'El nombre del pedido es obligatorio')
    .max(200, 'El nombre es demasiado largo')
    .trim(),

  proveedor: z
    .string()
    .max(200, 'El nombre del proveedor es demasiado largo')
    .optional()
    .default(''),

  proveedorId: z.union([z.string(), z.number()]).nullable().optional(),

  estado: z
    .string()
    .refine((v) => ESTADOS_PEDIDO_VALIDOS.includes(v), {
      message: 'Estado de pedido no válido',
    })
    .optional()
    .default('borrador'),

  fechaLimitePedido: z
    .string()
    .optional()
    .default(''),

  fechaEntrega: z
    .string()
    .optional()
    .default(''),

  articulos: z
    .array(articuloPedidoSchema)
    .min(1, 'El pedido debe tener al menos un artículo'),

  importeEstimado: z.number().min(0).optional().default(0),
  importeTotal:    z.number().min(0).optional().default(0),

  factura: facturaSchema,

  notas: z.string().max(1000, 'Las notas son demasiado largas').optional().default(''),
});

/**
 * Valida un pedido a proveedor.
 * Devuelve { ok: true, data } o { ok: false, errors }.
 */
export function validarPedidoProveedor(data) {
  const result = pedidoProveedorSchema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
