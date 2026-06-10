/**
 * api/lib/voluntarioValidation.js — Mejora 9 (actualizado Mejora 7)
 *
 * Validación server-side del registro de voluntarios.
 * Usa Zod directamente (no depende de src/ que es solo frontend).
 *
 * IMPORTANTE: Este esquema debe mantenerse sincronizado con
 * src/lib/schemas/voluntarioSchema.js (voluntarioBaseSchema).
 * Regla de oro: si un campo es requerido en cliente, es requerido aquí también.
 */
import { z } from 'zod';

const TALLAS_VALIDAS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

const normalizarTelefono = (val) =>
  typeof val === 'string' ? val.replace(/[\s\-]/g, '') : String(val || '');

/**
 * Esquema server-side para el registro público de voluntarios.
 * Sincronizado con voluntarioBaseSchema (src/lib/schemas/voluntarioSchema.js).
 */
export const voluntarioServerSchema = z.object({
  nombre: z
    .string({ required_error: 'El campo nombre es obligatorio' })
    .min(1, 'El campo nombre es obligatorio')
    .max(100, 'El nombre es demasiado largo')
    .trim(),

  // SINCRONIZADO con cliente: apellidos es requerido (min 1)
  apellidos: z
    .string({ required_error: 'Los apellidos son obligatorios' })
    .min(1, 'Los apellidos son obligatorios')
    .max(100, 'Los apellidos son demasiado largos')
    .trim(),

  telefono: z
    .string({ required_error: 'El campo teléfono es obligatorio' })
    .transform(normalizarTelefono)
    .pipe(
      z
        .string()
        .min(9, 'El teléfono debe tener al menos 9 dígitos')
        .regex(
          /^[6789]\d{8}$/,
          'El teléfono debe ser un número español válido (9 dígitos, empieza por 6, 7, 8 o 9)',
        ),
    ),

  email: z
    .string()
    .trim()
    .optional()
    .default('')
    .transform((v) => v || '')
    .pipe(
      z
        .string()
        .max(150, 'El email es demasiado largo')
        .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
          message: 'El email no tiene un formato válido',
        }),
    ),

  talla: z
    .string({ required_error: 'La talla es obligatoria' })
    .refine((v) => TALLAS_VALIDAS.includes(v), {
      message: `La talla debe ser una de: ${TALLAS_VALIDAS.join(', ')}`,
    }),

  puestoId: z.union([z.string(), z.number()]).nullable().optional(),
  coche: z.boolean().optional().default(false),
  telefonoEmergencia: z.string().trim().optional().default(''),

  // Honeypot — debe estar vacío
  website: z.string().optional().default(''),
});

/**
 * Valida los datos del voluntario entrante.
 *
 * @param {object} data — req.body
 * @returns {{ ok: true, data: object } | { ok: false, errors: object }}
 */
export function validarVoluntario(data) {
  const result = voluntarioServerSchema.safeParse(data);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  // Convertir errores Zod a un objeto campo → mensaje legible
  const errors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[issue.path.length - 1] ?? '_general';
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { ok: false, errors };
}

