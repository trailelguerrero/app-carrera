/**
 * useBudgetLogic.ts — tipos sobre useBudgetLogic.js
 */
import { useBudgetLogic as _useBudgetLogic } from './useBudgetLogic.js';
import type {
  Tramo,
  Concepto,
  IngresoExtra,
  Merchandising,
  SyncConfigKey,
} from '@/constants/budgetConstants';

export interface UseBudgetLogicParams {
  scenarioInscritos?: unknown;
  scenarioConceptos?: Concepto[] | null;
  scenarioIngresosExtra?: IngresoExtra[] | null;
  scenarioMerchandising?: Merchandising[] | null;
}

export interface UseBudgetLogicReturn {
  tab: string;
  setTab: (tab: string) => void;
  tramos: Tramo[];
  setTramos: (tramos: Tramo[]) => void;
  totalPatConfirmado: number;
  totalPatCobrado: number;
  totalMerchBeneficio: number;
  totalBalanceCamisetasTecnicas: number;
  syncConfig: Record<SyncConfigKey, boolean>;
  setSyncConfig: (cfg: Record<SyncConfigKey, boolean>) => void;
  totalSubvencionPublica: number;
  margenConfig: { tipo: string; valor: number; alertaActiva: boolean };
  setMargenConfig: (cfg: unknown) => void;
  conceptos: Concepto[];
  setConceptos: (conceptos: Concepto[]) => void;
  inscritos: unknown;
  setInscritos: (inscritos: unknown) => void;
  ingresosExtra: IngresoExtra[];
  setIngresosExtra: (items: IngresoExtra[]) => void;
  merchandising: Merchandising[];
  setMerchandising: (items: Merchandising[]) => void;
  maximos: Record<string, number>;
  setMaximos: (maximos: Record<string, number>) => void;
  saveStatus: string;
  saveData: () => Promise<void>;
  resetAllData: () => void;
  backupBeforeReset: () => void;
  updateConcepto: (id: number, field: string, value: unknown) => void;
  updateCostePorDistancia: (id: number, dist: string, value: number) => void;
  updateActivoDistancia: (id: number, dist: string, value: boolean) => void;
  addConcepto: (concepto: Partial<Concepto>) => void;
  removeConcepto: (id: number) => void;
  reorderConceptos: (conceptos: Concepto[]) => void;
  updateTramoPrecio: (tramoId: number, dist: string, precio: number) => void;
  addTramo: (tramo: Partial<Tramo>) => void;
  updateInscritos: (tramoId: number, dist: string, count: number) => void;
  totalInscritos: number;
  ingresosPorDistancia: Record<string, number>;
  precioMedioDistancia: Record<string, number>;
  inscritosConPago: number;
  precioMedioPago: number;
  costesFijos: number;
  costesVariables: number;
  costesVarPorCorredor: number;
  costesFijoPorCorredor: number;
  merchTotales: number;
  totalIngresosExtra: number;
  totalIngresosConMerch: number;
  resultado: number;
  puntoEquilibrio: Record<string, number>;
  peGlobal: number;
  ingresosDesglosados: unknown;
  realTotalInscritos: number;
  realResultado: number;
  getValorSincronizado: (key: string) => number;
  avisoDobleComputo: boolean;
}

export const useBudgetLogic = (params?: UseBudgetLogicParams): UseBudgetLogicReturn => {
  return _useBudgetLogic(params) as UseBudgetLogicReturn;
};
