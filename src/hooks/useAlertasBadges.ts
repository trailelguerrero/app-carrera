/**
 * useAlertasBadges.ts — tipos sobre useAlertasBadges.js
 */
import { useAlertasBadges as _useAlertasBadges } from './useAlertasBadges.js';

export type ModuloAlerta = 'voluntarios' | 'documentos' | 'presupuesto' | 'logistica' | 'proyecto';

export interface AlertaBadge {
  count: number;
  level: 'warning' | 'error';
}

export type AlertasBadges = Partial<Record<ModuloAlerta, AlertaBadge>>;

export interface UseAlertasBadgesParams {
  activeBlock: string;
  syncTick: number;
}

export function useAlertasBadges(params: UseAlertasBadgesParams): AlertasBadges {
  return _useAlertasBadges(params) as AlertasBadges;
}
