// ─── FECHA DEL EVENTO ────────────────────────────────────────────────────────
// Fuente única de verdad. Si la fecha cambia, editar SOLO aquí.
export const EVENT_DATE_STR = "2026-08-29";
export const EVENT_DATE     = new Date(EVENT_DATE_STR);

/** @deprecated Usar SK_PPTO_ROOT de @/constants/storageKeys */
export { SK_PPTO_ROOT as LS_KEY } from "@/constants/storageKeys";

export const DISTANCIAS = ["TG7", "TG13", "TG25"];

export const DISTANCIA_LABELS = { 
  TG7: "TG 7 km", 
  TG13: "TG 13 km", 
  TG25: "TG 25 km" 
};

export const DISTANCIA_COLORS = { 
  TG7: "#22d3ee", 
  TG13: "#a78bfa", 
  TG25: "#34d399" 
};

export const TRAMOS_DEFAULT = [
  { id: 1, nombre: "Early Bird", fechaFin: "2026-04-30", precios: { TG7: 18, TG13: 28, TG25: 38 } },
  { id: 2, nombre: "Fase 1", fechaFin: "2026-06-15", precios: { TG7: 22, TG13: 32, TG25: 42 } },
  { id: 3, nombre: "Fase 2", fechaFin: "2026-07-31", precios: { TG7: 25, TG13: 35, TG25: 45 } },
  { id: 4, nombre: "Última semana", fechaFin: "2026-08-27", precios: { TG7: 28, TG13: 38, TG25: 50 } },
];

export const CONCEPTOS_DEFAULT = [
  // FIJOS
  { id: 1, nombre: "Servicio cronometraje", tipo: "fijo", activo: true, costeTotal: 968, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: null, TG13: null, TG25: null } },
  { id: 2, nombre: "Servicio ambulancias", tipo: "fijo", activo: true, costeTotal: 2700, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: null, TG13: null, TG25: null } },
  { id: 3, nombre: "Seguro", tipo: "fijo", activo: true, costeTotal: 600, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: null, TG13: null, TG25: null } },
  { id: 4, nombre: "Megafonía", tipo: "fijo", activo: true, costeTotal: 450, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: null, TG13: null, TG25: null } },
  { id: 5, nombre: "Speaker", tipo: "fijo", activo: true, costeTotal: 300, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: null, TG13: null, TG25: null } },
  { id: 6, nombre: "Fotógrafos", tipo: "fijo", activo: true, costeTotal: 400, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: null, TG13: null, TG25: null } },
  { id: 7, nombre: "Web", tipo: "fijo", activo: true, costeTotal: 226, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: null, TG13: null, TG25: null } },
  { id: 8, nombre: "Trofeos", tipo: "fijo", activo: true, costeTotal: 436, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: null, TG13: null, TG25: null } },
  { id: 9, nombre: "Punto control 1", tipo: "fijo", activo: true, costeTotal: 121, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: null, TG13: null, TG25: null } },
  { id: 10, nombre: "Punto control 2", tipo: "fijo", activo: true, costeTotal: 121, activoDistancias: { TG7: false, TG13: true, TG25: true }, costePorDistancia: { TG7: null, TG13: null, TG25: null } },
  { id: 11, nombre: "Estructura arco", tipo: "fijo", activo: true, costeTotal: 242, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: null, TG13: null, TG25: null } },
  { id: 12, nombre: "Camisetas voluntarios", tipo: "fijo", activo: true, costeTotal: 970, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: null, TG13: null, TG25: null } },
  // VARIABLES
  { id: 13, nombre: "Medalla finisher", tipo: "variable", modoUniforme: true, activo: true, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: 2, TG13: 2, TG25: 2 } },
  { id: 14, nombre: "Regalo bolsa", tipo: "variable", modoUniforme: false, activo: true, activoDistancias: { TG7: false, TG13: true, TG25: true }, costePorDistancia: { TG7: 0, TG13: 1.8, TG25: 1.8 } },
  { id: 15, nombre: "Dorsal", tipo: "variable", modoUniforme: true, activo: true, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: 0.3, TG13: 0.3, TG25: 0.3 } },
  { id: 16, nombre: "Chip", tipo: "variable", modoUniforme: true, activo: false, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: 0, TG13: 0, TG25: 0 } },
  { id: 17, nombre: "Avituallamiento 1", tipo: "variable", modoUniforme: false, activo: true, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: 1, TG13: 2, TG25: 2 } },
  { id: 18, nombre: "Avituallamiento 2", tipo: "variable", modoUniforme: false, activo: true, activoDistancias: { TG7: false, TG13: true, TG25: true }, costePorDistancia: { TG7: 0, TG13: 2, TG25: 2 } },
  { id: 19, nombre: "2 botes refresco", tipo: "variable", modoUniforme: true, activo: true, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: 2, TG13: 2, TG25: 2 } },
  { id: 20, nombre: "Tapa final", tipo: "variable", modoUniforme: true, activo: true, activoDistancias: { TG7: true, TG13: true, TG25: true }, costePorDistancia: { TG7: 3.5, TG13: 3.5, TG25: 3.5 } },
  { id: 21, nombre: "App seguimiento", tipo: "variable", modoUniforme: false, activo: true, activoDistancias: { TG7: true, TG13: true, TG25: false }, costePorDistancia: { TG7: 0.36, TG13: 0.36, TG25: 0 } },
];

export const MAXIMOS_DEFAULT = { TG7: 150, TG13: 200, TG25: 120 };

export const INSCRITOS_DEFAULT = {
  tramos: {
    1: { TG7: 20, TG13: 25, TG25: 15 },
    2: { TG7: 25, TG13: 30, TG25: 20 },
    3: { TG7: 20, TG13: 25, TG25: 20 },
    4: { TG7: 15, TG13: 20, TG25: 15 },
  }
};

export const INGRESOS_EXTRA_DEFAULT = [
  // ── Sincronizados automáticamente desde otros bloques ──────────────────────
  { id: 1,  nombre: "Patrocinios captados (confirmado+cobrado)", valor: 0, activo: true,  synced: true,  syncKey: "patrocinios" },
  { id: 3,  nombre: "Patrocinios cobrados (tesorería real)",     valor: 0, activo: false, synced: true,  syncKey: "patrociniosCobrado" },
  { id: 2,  nombre: "Merchandising total (camisetas + productos)", valor: 0, activo: true,  synced: true,  syncKey: "camisetas" },
  { id: 13, nombre: "Balance camisetas técnicas",                valor: 0, activo: false, synced: true,  syncKey: "balanceCamisetasTecnicas" },
  // ── Ingresos manuales — editar directamente ────────────────────────────────
  // Sincronizada desde patrocinadores con sector "Administración pública"
  { id: 10, nombre: "Subvención entidad pública",                valor: 0, activo: true,  synced: true,  syncKey: "subvencionPublica" },
  { id: 11, nombre: "Colaboradores en especie (valor estimado)", valor: 0, activo: false, synced: false },
  { id: 12, nombre: "Otros ingresos",                           valor: 0, activo: false, synced: false },
];

// ECO-02 FIX: SYNC_CONFIG_DEFAULT es la fuente de verdad canónica para el estado
// inicial (primera instalación) de cada toggle sincronizado. Sus valores DEBEN
// coincidir con el campo `activo` del ítem correspondiente en INGRESOS_EXTRA_DEFAULT.
//
// Invariante obligatorio:
//   SYNC_CONFIG_DEFAULT[syncKey] === INGRESOS_EXTRA_DEFAULT.find(ie => ie.syncKey === syncKey).activo
//
// Si divergen, syncConfig siempre gana (ver ingresosExtraConValores en useBudgetLogic.js),
// lo que provoca que el toggle definido en INGRESOS_EXTRA_DEFAULT quede ignorado
// silenciosamente en primera instalación y en migraciones desde versiones antiguas.
//
// Análisis de escenarios (ECO-02):
//   a) Usuario nuevo (localStorage vacío): useData inicializa con este objeto.
//      El valor aquí ES el estado de primera carga. Antes: patrociniosCobrado=true
//      provocaba doble cómputo inmediato con la línea "patrocinios" (también activa).
//   b) Usuario con syncConfig antiguo sin la clave: el merge inyecta el valor de aquí
//      para claves ausentes. Antes: activaba el toggle sin que el usuario lo hubiese
//      elegido al migrar a una versión que añadió esa clave.
//   c) Usuario que ya guardó su preferencia: syncConfigRaw sobrescribe este default.
//      No se ve afectado por este cambio.
export const SYNC_CONFIG_DEFAULT = {
  patrocinios: true,            // Captado (confirmado+cobrado)   — coincide con INGRESOS_EXTRA id=1  activo:true
  patrociniosCobrado: false,    // Solo cobrado (tesorería real)  — coincide con INGRESOS_EXTRA id=3  activo:false
                                // CAMBIADO true→false (ECO-02): el usuario activa esta vista
                                // explícitamente. Activa por defecto suma el cobrado dos veces.
  camisetas: true,              // Merchandising total            — coincide con INGRESOS_EXTRA id=2  activo:true
  subvencionPublica: true,      // Sector Administración pública  — coincide con INGRESOS_EXTRA id=10 activo:true
  balanceCamisetasTecnicas: false, // Camisetas técnicas neto     — coincide con INGRESOS_EXTRA id=13 activo:false
};

export const MERCHANDISING_DEFAULT = [
  { id: 1, nombre: "Camiseta técnica", unidades: 50, costeUnitario: 8, precioVenta: 18, activo: true },
  { id: 2, nombre: "Buff / Braga cuello", unidades: 80, costeUnitario: 3.5, precioVenta: 8, activo: true },
  { id: 3, nombre: "Gorra trail", unidades: 30, costeUnitario: 5, precioVenta: 12, activo: true },
];

export const MARGEN_CONFIG_DEFAULT = {
  tipo:         "porcentaje",  // "porcentaje" | "absoluto"
  valor:        10,            // 10% de los costes totales
  alertaActiva: true,
};

// Coste de fabricación por tipo de camiseta — compartido con Camisetas.jsx y Dashboard
export const COSTE_DEFAULT = { corredor: 8, voluntario: 7, nino: 6 };
