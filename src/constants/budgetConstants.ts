/**
 * budgetConstants.ts — Constantes del módulo Presupuesto.
 */
import { SK_PPTO_ROOT } from '@/constants/storageKeys';

export const EVENT_DATE_STR = '2026-08-29';
export const EVENT_DATE     = new Date(EVENT_DATE_STR);

/** @deprecated Usar SK_PPTO_ROOT de @/constants/storageKeys */
export { SK_PPTO_ROOT as LS_KEY } from '@/constants/storageKeys';

export type DistanciaBudget = 'TG7' | 'TG13' | 'TG25';
export const DISTANCIAS: DistanciaBudget[] = ['TG7', 'TG13', 'TG25'];

export const DISTANCIA_LABELS: Record<DistanciaBudget, string> = {
  TG7: 'TG 7 km', TG13: 'TG 13 km', TG25: 'TG 25 km',
};

export const DISTANCIA_COLORS: Record<DistanciaBudget, string> = {
  TG7: '#22d3ee', TG13: '#a78bfa', TG25: '#34d399',
};

export interface Tramo {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  precios: Record<DistanciaBudget, number>;
}

export const TRAMOS_DEFAULT: Tramo[] = [
  { id:1, nombre:'Early Bird',    fechaInicio:'2026-01-15', fechaFin:'2026-04-30', precios:{ TG7:18, TG13:28, TG25:38 } },
  { id:2, nombre:'Fase 1',        fechaInicio:'2026-05-01', fechaFin:'2026-06-15', precios:{ TG7:22, TG13:32, TG25:42 } },
  { id:3, nombre:'Fase 2',        fechaInicio:'2026-06-16', fechaFin:'2026-07-31', precios:{ TG7:25, TG13:35, TG25:45 } },
  { id:4, nombre:'Última semana', fechaInicio:'2026-08-01', fechaFin:'2026-08-27', precios:{ TG7:28, TG13:38, TG25:50 } },
];

export interface ConceptoFijo {
  id: number;
  nombre: string;
  tipo: 'fijo';
  activo: boolean;
  costeTotal: number;
  activoDistancias: Record<DistanciaBudget, boolean>;
  costePorDistancia: Record<DistanciaBudget, null>;
  categoria?: string;   // partida presupuestaria libre (ej. "Sanidad", "Premios")
}

export interface ConceptoVariable {
  id: number;
  nombre: string;
  tipo: 'variable';
  modoUniforme?: boolean;
  activo: boolean;
  activoDistancias: Record<DistanciaBudget, boolean>;
  costePorDistancia: Record<DistanciaBudget, number>;
  categoria?: string;   // partida presupuestaria libre
}

export type Concepto = ConceptoFijo | ConceptoVariable;

export const CONCEPTOS_DEFAULT: Concepto[] = [
  { id:1,  nombre:'Servicio cronometraje',   tipo:'fijo',     activo:true, costeTotal:968,  activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:null,TG13:null,TG25:null} },
  { id:2,  nombre:'Servicio ambulancias',    tipo:'fijo',     activo:true, costeTotal:2700, activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:null,TG13:null,TG25:null} },
  { id:3,  nombre:'Seguro',                  tipo:'fijo',     activo:true, costeTotal:600,  activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:null,TG13:null,TG25:null} },
  { id:4,  nombre:'Megafonía',               tipo:'fijo',     activo:true, costeTotal:450,  activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:null,TG13:null,TG25:null} },
  { id:5,  nombre:'Speaker',                 tipo:'fijo',     activo:true, costeTotal:300,  activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:null,TG13:null,TG25:null} },
  { id:6,  nombre:'Fotógrafos',              tipo:'fijo',     activo:true, costeTotal:400,  activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:null,TG13:null,TG25:null} },
  { id:7,  nombre:'Web',                     tipo:'fijo',     activo:true, costeTotal:226,  activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:null,TG13:null,TG25:null} },
  { id:8,  nombre:'Trofeos',                 tipo:'fijo',     activo:true, costeTotal:436,  activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:null,TG13:null,TG25:null} },
  { id:9,  nombre:'Punto control 1',         tipo:'fijo',     activo:true, costeTotal:121,  activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:null,TG13:null,TG25:null} },
  { id:10, nombre:'Punto control 2',         tipo:'fijo',     activo:true, costeTotal:121,  activoDistancias:{TG7:false,TG13:true, TG25:true},  costePorDistancia:{TG7:null,TG13:null,TG25:null} },
  { id:11, nombre:'Estructura arco',         tipo:'fijo',     activo:true, costeTotal:242,  activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:null,TG13:null,TG25:null} },
  // ECO-08: id:12 "Camisetas voluntarios" eliminado — el gasto se calcula ahora en
  // el bloque Camisetas (categoría "voluntarios", automático desde datos reales).
  { id:13, nombre:'Medalla finisher',        tipo:'variable', modoUniforme:true,  activo:true, activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:2,   TG13:2,   TG25:2  } },
  { id:14, nombre:'Regalo bolsa',            tipo:'variable', modoUniforme:false, activo:true, activoDistancias:{TG7:false,TG13:true, TG25:true},  costePorDistancia:{TG7:0,   TG13:1.8, TG25:1.8} },
  { id:15, nombre:'Dorsal',                  tipo:'variable', modoUniforme:true,  activo:true, activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:0.3, TG13:0.3, TG25:0.3} },
  { id:16, nombre:'Chip',                    tipo:'variable', modoUniforme:true,  activo:false,activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:0,   TG13:0,   TG25:0  } },
  { id:17, nombre:'Avituallamiento 1',       tipo:'variable', modoUniforme:false, activo:true, activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:1,   TG13:2,   TG25:2  } },
  { id:18, nombre:'Avituallamiento 2',       tipo:'variable', modoUniforme:false, activo:true, activoDistancias:{TG7:false,TG13:true, TG25:true},  costePorDistancia:{TG7:0,   TG13:2,   TG25:2  } },
  { id:19, nombre:'2 botes refresco',        tipo:'variable', modoUniforme:true,  activo:true, activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:2,   TG13:2,   TG25:2  } },
  { id:20, nombre:'Tapa final',              tipo:'variable', modoUniforme:true,  activo:true, activoDistancias:{TG7:true, TG13:true, TG25:true},  costePorDistancia:{TG7:3.5, TG13:3.5, TG25:3.5} },
  { id:21, nombre:'App seguimiento',         tipo:'variable', modoUniforme:false, activo:true, activoDistancias:{TG7:true, TG13:true, TG25:false}, costePorDistancia:{TG7:0.36,TG13:0.36,TG25:0  } },
];

export const MAXIMOS_DEFAULT: Record<DistanciaBudget, number> = { TG7:150, TG13:200, TG25:120 };

export const INSCRITOS_DEFAULT = {
  tramos: {
    1: { TG7:20, TG13:25, TG25:15 },
    2: { TG7:25, TG13:30, TG25:20 },
    3: { TG7:20, TG13:25, TG25:20 },
    4: { TG7:15, TG13:20, TG25:15 },
  } as Record<number, Record<DistanciaBudget, number>>,
};

export interface IngresoExtra {
  id: number;
  nombre: string;
  valor: number;
  activo: boolean;
  synced?: boolean;
  syncKey?: string;
}

export const INGRESOS_EXTRA_DEFAULT: IngresoExtra[] = [
  { id:1,  nombre:'Patrocinios captados (confirmado+cobrado)',   valor:0, activo:false, synced:true,  syncKey:'patrocinios' },
  { id:3,  nombre:'Patrocinios cobrados (tesorería real)',       valor:0, activo:true,  synced:true,  syncKey:'patrociniosCobrado' },
  // ECO-08: id:2 "Merchandising total" e id:13 "Balance camisetas técnicas" eliminados —
  // sustituidos por las 6 categorías independientes del bloque Camisetas (ver CAMISETAS_SYNC_CONFIG_DEFAULT).
  { id:10, nombre:'Subvención entidad pública',                  valor:0, activo:true,  synced:true,  syncKey:'subvencionPublica' },
  { id:11, nombre:'Colaboradores en especie (valor estimado)',   valor:0, activo:false, synced:false },
  { id:12, nombre:'Otros ingresos',                              valor:0, activo:false, synced:false },
];

export type SyncConfigKey = 'patrocinios' | 'patrociniosCobrado' | 'subvencionPublica';

export const SYNC_CONFIG_DEFAULT: Record<SyncConfigKey, boolean> = {
  patrocinios:              false,
  patrociniosCobrado:       true,
  subvencionPublica:        true,
};

/**
 * CAMISETAS_SYNC_CONFIG_DEFAULT — ECO-08: toggle independiente por cada una de las
 * 6 categorías económicas del bloque Camisetas dentro de Presupuesto.
 * Sustituye al antiguo SYNC_CONFIG_DEFAULT.camisetas / .balanceCamisetasTecnicas
 * (un único toggle para un beneficio neto agregado).
 */
export type CamisetasSyncConfigKey =
  | 'camCorredores' | 'camNoCorredores' | 'camVentaPublico'
  | 'camOtros' | 'camVoluntarios' | 'camRegalos';

export const CAMISETAS_SYNC_CONFIG_DEFAULT: Record<CamisetasSyncConfigKey, boolean> = {
  camCorredores:    true,
  camNoCorredores:  true,
  camVentaPublico:  true,
  camOtros:         true,
  camVoluntarios:   true,
  camRegalos:       true,
};

export interface Merchandising {
  id: number;
  nombre: string;
  unidades: number;
  costeUnitario: number;
  precioVenta: number;
  activo: boolean;
}

// ECO-10: "Camiseta técnica" eliminada del seed — duplicaba el bloque "Camisetas — Ingresos/
// Gastos" de Presupuesto (que calcula el negocio real de camisetas desde el módulo Camisetas).
// Cualquier evento creado antes de este cambio puede seguir teniendo esa fila guardada en la
// base de datos; revísala y bórrala manualmente en Ingresos → Merchandising si aparece activa.
export const MERCHANDISING_DEFAULT: Merchandising[] = [
  { id:2, nombre:'Buff / Braga cuello',unidades:80, costeUnitario:3.5, precioVenta:8,  activo:true },
  { id:3, nombre:'Gorra trail',        unidades:30, costeUnitario:5,   precioVenta:12, activo:true },
];

export const MARGEN_CONFIG_DEFAULT = {
  tipo:         'porcentaje' as 'porcentaje' | 'absoluto',
  valor:        10,
  alertaActiva: true,
};

export { COSTE_DEFAULT } from '@/components/camisetas/camisetasConstants';

// silence unused import warning — SK_PPTO_ROOT is used via re-export
void SK_PPTO_ROOT;
