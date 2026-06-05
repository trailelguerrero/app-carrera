/**
 * conceptoSchema.js — Fase 5
 *
 * Esquema Zod centralizado para conceptos del presupuesto.
 * Usado en:
 *   - FichaConcepto.jsx / ModalEditarConcepto (validación cliente)
 *
 * Fuente única de verdad: cambiar aquí afecta a toda la validación del módulo.
 */
import { z } from 'zod';

export const TIPOS_CONCEPTO_VALIDOS = ['fijo', 'variable'];

export const ESTADOS_PAGO_VALIDOS = [
  'pendiente_presupuesto',
  'presupuestado',
  'contratado',
  'pagado',
];

export const ESTADOS_PEDIDO_VALIDOS = [
  'pendiente',
  'solicitado',
  'confirmado',
  'recibido',
];

/** Coste por distancia: record de distancia → número */
const costePorDistanciaSchema = z.record(
  z.string(),
  z.number().min(0, 'El coste no puede ser negativo'),
);

/** Distancias activas: record de distancia → boolean */
const activoDistanciasSchema = z.record(z.string(), z.boolean());

/** Esquema base compartido entre concepto fijo y variable */
const conceptoBaseSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre del concepto es obligatorio' })
    .min(1, 'El nombre del concepto es obligatorio')
    .max(200, 'El nombre es demasiado largo')
    .trim(),

  activo: z.boolean().optional().default(true),

  tipo: z
    .string()
    .refine((v) => TIPOS_CONCEPTO_VALIDOS.includes(v), {
      message: 'El tipo debe ser "fijo" o "variable"',
    }),

  proveedor: z.string().max(200).optional().default(''),
  contacto:  z.string().max(200).optional().default(''),
  notas:     z.string().max(1000, 'Las notas son demasiado largas').optional().default(''),

  activoDistancias:  activoDistanciasSchema.optional().default({}),
  costePorDistancia: costePorDistanciaSchema.optional().default({}),
});

/** Esquema para concepto de coste FIJO */
export const conceptoFijoSchema = conceptoBaseSchema.extend({
  tipo: z.literal('fijo'),

  costeTotal: z
    .number({ invalid_type_error: 'El importe debe ser un número' })
    .min(0, 'El importe no puede ser negativo')
    .default(0),

  estadoPago: z
    .string()
    .refine((v) => ESTADOS_PAGO_VALIDOS.includes(v), {
      message: 'Estado de pago no válido',
    })
    .optional()
    .default('pendiente_presupuesto'),

  fechaPago:  z.string().optional().default(''),
  numFactura: z.string().max(100).optional().default(''),
});

/** Esquema para concepto de coste VARIABLE (por corredor) */
export const conceptoVariableSchema = conceptoBaseSchema.extend({
  tipo: z.literal('variable'),

  modoUniforme: z.boolean().optional().default(true),

  estadoPedido: z
    .string()
    .refine((v) => ESTADOS_PEDIDO_VALIDOS.includes(v), {
      message: 'Estado del pedido no válido',
    })
    .optional()
    .default('pendiente'),

  fechaEntrega: z.string().optional().default(''),

  costeUnitarioReal: z
    .union([z.number().min(0), z.literal('')])
    .optional()
    .default(''),
});

/** Discriminated union: valida según el tipo */
export const conceptoSchema = z.discriminatedUnion('tipo', [
  conceptoFijoSchema,
  conceptoVariableSchema,
]);

/**
 * Valida un concepto de presupuesto.
 * Devuelve { ok: true, data } o { ok: false, errors }.
 */
export function validarConcepto(data) {
  const result = conceptoSchema.safeParse(data);
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
