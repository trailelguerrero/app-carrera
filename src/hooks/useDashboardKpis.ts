/**
 * useDashboardKpis.ts — tipos sobre useDashboardKpis.js
 */
import { useDashboardKpis as _useDashboardKpis } from './useDashboardKpis.js';

export interface SaludModulo {
  ok: boolean;
  score: number;
}

export interface DashboardKpis {
  // Evento
  eventoNombre: string;
  eventoEdicion: string;
  eventoFechaStr: string;
  eventoFecha: Date | null;
  diasHasta: number;
  yaFue: boolean;
  esSemana: boolean;
  // Presupuesto
  totalInscritos: number;
  inscritosPorDist: Record<string, number>;
  totalIngresos: number;
  totalCostesFijos: number;
  totalCostesVars: number;
  totalIngresosExtra: number;
  merchBeneficio: number;
  totalOtrosIngresos: number;
  resultado: number;
  roiGlobal: number;
  camisetasDesglose: unknown;
  maximosPorDist: Record<string, number>;
  ocupacionPorDist: Record<string, number>;
  ocupacionGlobal: number;
  totalMaximos: number;
  // Voluntarios
  voluntarios: number;
  volConfirmados: number;
  volPendientes: number;
  totalNecesarios: number;
  coberturaVol: number;
  puestosAlerta: number;
  // Patrocinadores
  pats: number;
  patComprometido: number;
  patCobrado: number;
  patPipeline: number;
  objetivo: number;
  contPendientes: number;
  patsSinSeguimiento: number;
  // Logística
  material: number;
  stockAlerts: number;
  materialesBajoMinimo: number;
  tlDone: number;
  tlTotal: number;
  ckDone: number;
  ckTotal: number;
  incidenciasActivas: number;
  // Proyecto
  tareasTotal: number;
  tareasCompletadas: number;
  tareasBloqueadas: number;
  tareasVencidas: number;
  progresoGlobal: number;
  hitosProximos: unknown[];
  // Salud
  saludModulos: Record<string, SaludModulo>;
  saludGlobal: number;
  alertasCriticas: number;
  alertasAvisos: number;
  // Documentos
  docsVencidos: number;
  docsProxVencer: number;
  gestionesDenegadas: number;
  gestionesVencidas: number;
  gestionesUrgentes: number;
  // Misc
  tramos: unknown[];
  rawInscritos: unknown;
  syncConfig: unknown;
  scenarioActivo: boolean;
}

export function useDashboardKpis(
  rawData: Record<string, unknown>,
  volDiasCritico?: number,
  volDiasAviso?: number
): DashboardKpis {
  return _useDashboardKpis(rawData, volDiasCritico, volDiasAviso) as DashboardKpis;
}
