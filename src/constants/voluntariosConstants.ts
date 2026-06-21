// Shared constants extracted from Voluntarios.jsx — Sprint 2 refactor

export type EstadoVoluntario = 'pendiente' | 'confirmado' | 'cancelado' | 'ausente' | 'dudoso';

export const ESTADOS: Record<EstadoVoluntario, string> = {
  pendiente:  'Pendiente',
  confirmado: 'Confirmado',
  cancelado:  'Cancelado',
  ausente:    'Ausente',
  dudoso:     'Dudoso',
};

export const TIPOS_PUESTO = [
  'Salida/Meta',
  'Avituallamiento',
  'Control',
  'Seguridad',
  'Señalización',
  'Parking',
  'Organización',
  'Primeros Auxilios',
] as const;

export type TipoPuesto = typeof TIPOS_PUESTO[number];

export const DISTANCIAS_PUESTO = ['TG7', 'TG13', 'TG25', 'Todas'] as const;
export type Distancia = typeof DISTANCIAS_PUESTO[number];

export const DIST_COLORS: Record<Distancia, string> = {
  TG7:   '#22d3ee',
  TG13:  '#a78bfa',
  TG25:  '#34d399',
  Todas: '#fbbf24',
};

/** Retorna el color del texto según el estado del voluntario. */
export function estadoColor(e: string): string {
  return e === 'confirmado' ? 'var(--green)'
    : e === 'cancelado'    ? 'var(--red)'
    : e === 'ausente'      ? 'var(--orange)'
    : e === 'dudoso'       ? 'var(--violet)'
    : 'var(--amber)';
}

/** Retorna el color de fondo según el estado del voluntario. */
export function estadoBg(e: string): string {
  return e === 'confirmado' ? 'var(--green-dim)'
    : e === 'cancelado'    ? 'var(--red-dim)'
    : e === 'ausente'      ? 'var(--orange-dim)'
    : e === 'dudoso'       ? 'var(--violet-dim)'
    : 'var(--amber-dim)';
}
