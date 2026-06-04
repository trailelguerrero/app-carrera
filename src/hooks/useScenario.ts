/**
 * useScenario.ts — tipos sobre useScenario.js
 */
import { useScenario as _useScenario } from './useScenario.js';
import type {
  Concepto,
  IngresoExtra,
  Merchandising,
} from '@/constants/budgetConstants';

export interface Scenario {
  id: string;
  nombre: string;
  inscritos: Record<string, unknown>;
  conceptos: Concepto[];
  ingresosExtra: IngresoExtra[];
  merchandising: Merchandising[];
}

export interface UseScenarioReturn {
  savedScenarios: Scenario[];
  activeScenario: Scenario | null;
  isScenarioMode: boolean;
  scenarioInscritos: Record<string, unknown> | null;
  scenarioConceptos: Concepto[] | null;
  scenarioIngresosExtra: IngresoExtra[] | null;
  scenarioMerchandising: Merchandising[] | null;
  createScenario: (nombre: string) => void;
  loadScenario: (id: string) => void;
  exitScenario: () => void;
  saveScenario: () => void;
  duplicateScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  renameScenario: (id: string, nombre: string) => void;
  updateScenarioInscritos: (inscritos: unknown) => void;
  toggleScenarioConcepto: (id: number) => void;
  overrideScenarioConcepto: (id: number, field: string, value: unknown) => void;
  overrideScenarioConceptoCosteDist: (id: number, dist: string, value: number) => void;
  setScenarioIngresosExtra: (items: IngresoExtra[]) => void;
  setScenarioMerchandising: (items: Merchandising[]) => void;
}

export const useScenario = (
  realInscritos: unknown,
  realConceptos: Concepto[],
  realIngresosExtra: IngresoExtra[],
  realMerchandising: Merchandising[]
): UseScenarioReturn => {
  return _useScenario(realInscritos, realConceptos, realIngresosExtra, realMerchandising) as UseScenarioReturn;
};
