/**
 * voluntarioSchema.js — Mejora 9
 *
 * Esquema Zod centralizado para el registro de voluntarios.
 * Usado en:
 *   - FormularioPublico.jsx   (validación cliente con react-hook-form)
 *   - VoluntarioPortal.jsx / StepperForm (validación cliente)
 *   - api/data/public.js      (validación servidor — se importa vía require/import)
 *
 * Fuente única de verdad: cambiar aquí afecta a cliente y servidor.
 */
import { z } from 'zod';

export const TALLAS_VALIDAS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

/** Normaliza el teléfono quitando espacios y guiones */
const normalizarTelefono = (val) =>
  typeof val === 'string' ? val.replace(/[\s-]/g, '') : val;

/**
 * Esquema base — siempre requerido.
 * Los campos opcionales según config (email, emergencia) se validan
 * con .superRefine en los esquemas contextuales de abajo.
 */
export const voluntarioBaseSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre es demasiado largo')
    .trim(),

  apellidos: z
    .string({ required_error: 'Los apellidos son obligatorios' })
    .min(1, 'Los apellidos son obligatorios')
    .max(100, 'Los apellidos son demasiado largos')
    .trim(),

  telefono: z
    .string({ required_error: 'El teléfono es obligatorio' })
    .transform(normalizarTelefono)
    .pipe(
      z
        .string()
        .regex(
          /^[6789]\d{8}$/,
          'Introduce un teléfono español válido (9 dígitos, empieza por 6, 7, 8 o 9)',
        ),
    ),

  email: z
    .string()
    .trim()
    .transform((v) => v || '')
    .pipe(
      z
        .string()
        .max(150, 'El email es demasiado largo')
        .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
          message: 'Introduce un email válido',
        }),
    )
    .optional()
    .default(''),

  talla: z
    .string({ required_error: 'Selecciona una talla' })
    .refine((v) => TALLAS_VALIDAS.includes(v), {
      message: 'Selecciona una talla válida',
    }),

  puestoId: z.union([z.string(), z.number()]).nullable().optional().default(null),

  coche: z.boolean().optional().default(false),

  telefonoEmergencia: z
    .string()
    .trim()
    .transform(normalizarTelefono)
    .optional()
    .default(''),

  // Honeypot — debe estar vacío siempre
  website: z.string().max(0, 'Campo no válido').optional().default(''),
});

/**
 * Esquema completo para el formulario público.
 * Recibe opciones de configuración del evento para validar
 * campos condicionales (email requerido, emergencia requerida).
 *
 * @param {object} opts
 * @param {boolean} opts.emailRequerido    - opcionEmail del evento
 * @param {boolean} opts.emergenciaRequerida - opcionEmergencia del evento
 */
export function crearEsquemaFormulario({ emailRequerido = false, emergenciaRequerida = false } = {}) {
  return voluntarioBaseSchema.superRefine((data, ctx) => {
    if (emailRequerido && (!data.email || data.email.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'El email es obligatorio para este evento',
      });
    }

    if (emergenciaRequerida) {
      const telEmergencia = normalizarTelefono(data.telefonoEmergencia || '');
      if (!telEmergencia) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['telefonoEmergencia'],
          message: 'El teléfono de emergencia es obligatorio para la seguridad del evento',
        });
      } else if (!/^[6789]\d{8}$/.test(telEmergencia)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['telefonoEmergencia'],
          message: 'Introduce un teléfono de emergencia válido (9 dígitos)',
        });
      }
    }
  });
}

/**
 * Esquema para validación server-side en api/data/public.js.
 * No depende de opciones de configuración — valida el mínimo
 * garantizado que todo voluntario debe cumplir.
 */
export const voluntarioServerSchema = voluntarioBaseSchema.pick({
  nombre: true,
  apellidos: true,
  telefono: true,
  talla: true,
}).extend({
  email: z.string().trim().optional().default('').transform((v) => v || ''),
  telefonoEmergencia: z.string().trim().optional().default(''),
  puestoId: z.union([z.string(), z.number()]).nullable().optional(),
  coche: z.boolean().optional().default(false),
  website: z.string().optional().default(''),
});
