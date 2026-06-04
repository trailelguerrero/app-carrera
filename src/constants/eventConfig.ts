/**
 * eventConfig.ts — Configuración global del evento.
 * Fuente única de verdad para identidad y umbrales operativos.
 */

export interface Organizador {
  nombre: string;
  telefono: string;
  email: string;
}

export interface EventConfig {
  nombre: string;
  edicion: string;
  lugar: string;
  provincia: string;
  fecha: string;
  organizador: string;
  emailContacto: string;
  telefonoContacto: string;
  organizadores: Organizador[];
  webEvento: string;
  volDiasCritico: number;
  volDiasAviso: number;
  autoOpenDia: boolean;
  formSubtitulo: string;
  formBoton: string;
  formConfirmacion: string;
  concentracionHora: string;
  concentracionLugar: string;
  instruccionesGenerales: string;
}

export const EVENT_CONFIG_DEFAULT: EventConfig = {
  nombre:           'Trail El Guerrero',
  edicion:          '2026',
  lugar:            'Candeleda',
  provincia:        'Ávila',
  fecha:            '2026-08-29',
  organizador:      'Club Trail El Guerrero',
  emailContacto:    '',
  telefonoContacto: '',
  organizadores:    [],
  webEvento:        '',
  volDiasCritico:   7,
  volDiasAviso:     30,
  autoOpenDia:      false,
  formSubtitulo:    'Formulario de inscripción de voluntarios',
  formBoton:        '✓ Registrarme como voluntario',
  formConfirmacion: 'Gracias por apuntarte como voluntario. El equipo organizador se pondrá en contacto contigo próximamente.',
  concentracionHora:      '',
  concentracionLugar:     '',
  instruccionesGenerales: '',
};

/**
 * @deprecated LS_KEY_CONFIG — alias eliminado de todos los componentes (FIX-DEP).
 * Todos los usos han sido migrados a SK_EVENT_CONFIG de @/constants/storageKeys.
 * Esta re-exportación se mantiene solo por compatibilidad con tests externos.
 */
export { SK_EVENT_CONFIG as LS_KEY_CONFIG } from '@/constants/storageKeys';
