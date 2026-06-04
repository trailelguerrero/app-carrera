/**
 * usePaginacion.ts — tipos sobre usePaginacion.jsx
 */
import type { ComponentType } from 'react';
import { usePaginacion as _usePaginacion } from './usePaginacion.jsx';

export interface UsePaginacionReturn<T> {
  pagina: number;
  setPagina: (p: number | ((prev: number) => number)) => void;
  resetPage: () => void;
  items: T[];
  total: number;
  porPagina: number;
  paginas: number;
  PaginadorUI: ComponentType;
}

export function usePaginacion<T>(items: T[], porPagina?: number): UsePaginacionReturn<T> {
  return _usePaginacion(items, porPagina) as UsePaginacionReturn<T>;
}
