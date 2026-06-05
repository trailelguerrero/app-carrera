/**
 * camisetaSchema.js — Fase 5
 *
 * Esquema Zod centralizado para pedidos de camisetas.
 * Usado en:
 *   - ModalPedido.jsx (validación cliente)
 *
 * Fuente única de verdad: cambiar aquí afecta a toda la validación del módulo.
 */
import { z } from 'zod';

export const TIPOS_VALIDOS      = ['corredor', 'nino', 'voluntario', 'regalo'];
export const ESTADOS_PAGO_VALIDOS    = ['pendiente', 'pagado', 'regalo'];
export const ESTADOS_ENTREGA_VALIDOS = ['pendiente', 'entregado'];

/** Normaliza teléfono quitando espacios y guiones */
const normalizarTelefono = (val) =>
  typeof val === 'string' ? val.replace(/[\s-]/g, '') : val;

/** Línea individual del pedido */
export const lineaCamisetaSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),

  tipo: z
    .string()
    .refine((v) => TIPOS_VALIDOS.includes(v), {
      message: 'Tipo de camiseta no válido',
    })
    .default('corredor'),

  talla: z.string().min(1, 'Selecciona una talla'),

  cantidad: z
    .number({ invalid_type_error: 'La cantidad debe ser un número' })
    .int('La cantidad debe ser un número entero')
    .min(1, 'La cantidad mínima es 1'),

  precioVenta: z
    .number({ invalid_type_error: 'El precio debe ser un número' })
    .min(0, 'El precio no puede ser negativo')
    .default(0),

  estadoPago: z
    .string()
    .refine((v) => ESTADOS_PAGO_VALIDOS.includes(v), {
      message: 'Estado de pago no válido',
    })
    .default('pendiente'),

  estadoEntrega: z
    .string()
    .refine((v) => ESTADOS_ENTREGA_VALIDOS.includes(v), {
      message: 'Estado de entrega no válido',
    })
    .default('pendiente'),
});

/** Esquema completo del pedido */
export const pedidoCamisetaSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(1, 'El nombre es obligatorio')
    .max(150, 'El nombre es demasiado largo')
    .trim(),

  telefono: z
    .string()
    .trim()
    .transform(normalizarTelefono)
    .optional()
    .default('')
    .pipe(
      z
        .string()
        .refine(
          (v) => v === '' || /^[6-9]\d{8}$/.test(v),
          { message: 'Introduce un teléfono español válido (9 dígitos, empieza por 6-9)' },
        ),
    ),

  email: z
    .string()
    .trim()
    .optional()
    .default('')
    .pipe(
      z
        .string()
        .refine(
          (v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
          { message: 'Introduce un email válido' },
        ),
    ),

  notas: z.string().max(500, 'Las notas son demasiado largas').optional().default(''),

  lineas: z
    .array(lineaCamisetaSchema)
    .min(1, 'El pedido debe tener al menos una línea'),
});

/** Infiere el tipo TypeScript del pedido */
// export type PedidoCamiseta = z.infer<typeof pedidoCamisetaSchema>;

/**
 * Valida un pedido de camiseta.
 * Devuelve { ok: true, data } o { ok: false, errors }.
 * Compatible con el patrón de voluntarioValidation.js del servidor.
 */
export function validarPedidoCamiseta(data) {
  const result = pedidoCamisetaSchema.safeParse(data);
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
