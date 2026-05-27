/**
 * semaforoRiesgos.js — MEJ-07
 * Función pura que deriva el panel de riesgo RAG (Rojo/Ámbar/Verde)
 * a partir de los KPIs del dashboard.
 *
 * Cuatro áreas ejecutivas:
 *   1. Permisos    — estado legal y documental
 *   2. Económico   — resultado financiero y desviaciones
 *   3. Logístico   — stock, checklist, cobertura de voluntarios
 *   4. Operativo   — tareas vencidas, hitos, incidencias abiertas
 *
 * Sin efectos secundarios ni dependencias de React.
 */

/** @typedef {"verde"|"ambar"|"rojo"} EstadoRAG */

/**
 * @typedef {object} ZonaRiesgo
 * @property {string}     area     - Nombre del área
 * @property {string}     icon     - Emoji representativo
 * @property {EstadoRAG}  estado   - verde | ambar | rojo
 * @property {string}     razon    - Texto corto explicando el estado
 * @property {number}     score    - 0-100 (100 = sin riesgo)
 * @property {string[]}   detalles - Lista de problemas específicos
 */

const VERDE = "verde";
const AMBAR = "ambar";
const ROJO  = "rojo";

/**
 * Determina el estado RAG a partir de una lista de flags booleanos
 * con peso (rojo > ámbar > verde).
 *
 * @param {{ rojo?: boolean, ambar?: boolean }[]} flags
 * @returns {EstadoRAG}
 */
export function estadoDesdeFlags(flags) {
  if (!Array.isArray(flags) || flags.length === 0) return VERDE;
  if (flags.some(f => f.rojo))  return ROJO;
  if (flags.some(f => f.ambar)) return AMBAR;
  return VERDE;
}

/**
 * Convierte un score numérico (0-100) en estado RAG.
 * @param {number} score
 * @param {{ rojoMax?: number, ambarMax?: number }} umbrales
 */
export function estadoDesdeScore(score, { rojoMax = 40, ambarMax = 70 } = {}) {
  if (typeof score !== "number" || isNaN(score)) return AMBAR;
  if (score <= rojoMax)  return ROJO;
  if (score <= ambarMax) return AMBAR;
  return VERDE;
}

// ─────────────────────────────────────────────────────────────────────────────
// ÁREA 1 — PERMISOS
// Inputs: gestiones (denegadas, vencidas, urgentes), documentos vencidos
// ─────────────────────────────────────────────────────────────────────────────
export function calcAreaPermisos(kpis) {
  const {
    gestionesDenegadas = [],
    gestionesVencidas  = [],
    gestionesUrgentes  = [],
    docsVencidos       = [],
    docsProxVencer     = [],
  } = kpis || {};

  const detalles = [];
  const flags    = [];

  if (gestionesDenegadas.length > 0) {
    detalles.push(`${gestionesDenegadas.length} gestión${gestionesDenegadas.length > 1 ? "es" : ""} denegada${gestionesDenegadas.length > 1 ? "s" : ""}`);
    flags.push({ rojo: true });
  }
  if (gestionesVencidas.length > 0) {
    detalles.push(`${gestionesVencidas.length} permiso${gestionesVencidas.length > 1 ? "s" : ""} vencido${gestionesVencidas.length > 1 ? "s" : ""} sin aprobar`);
    flags.push({ rojo: true });
  }
  if (docsVencidos.length > 0) {
    detalles.push(`${docsVencidos.length} documento${docsVencidos.length > 1 ? "s" : ""} vencido${docsVencidos.length > 1 ? "s" : ""}`);
    flags.push({ rojo: true });
  }
  if (gestionesUrgentes.length > 0) {
    detalles.push(`${gestionesUrgentes.length} gestión${gestionesUrgentes.length > 1 ? "es" : ""} con plazo ≤30 días`);
    flags.push({ ambar: true });
  }
  if (docsProxVencer.length > 0) {
    detalles.push(`${docsProxVencer.length} documento${docsProxVencer.length > 1 ? "s" : ""} por vencer`);
    flags.push({ ambar: true });
  }

  const estado = estadoDesdeFlags(flags);
  const rojos  = gestionesDenegadas.length + gestionesVencidas.length + docsVencidos.length;
  const total  = rojos + gestionesUrgentes.length + docsProxVencer.length;
  const score  = total === 0 ? 100 : Math.max(0, Math.round((1 - rojos / Math.max(total, 1)) * 100));

  return {
    area:     "Permisos",
    icon:     "🏛️",
    estado,
    razon:    detalles.length === 0 ? "Documentación al día" : detalles[0],
    score,
    detalles,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ÁREA 2 — ECONÓMICO
// Inputs: resultado, totalCostesFijos, totalCostesVars, patComprometido, objetivo
// ─────────────────────────────────────────────────────────────────────────────
export function calcAreaEconomico(kpis) {
  const {
    resultado          = 0,
    totalCostesFijos   = 0,
    totalCostesVars    = 0,
    patComprometido    = 0,
    objetivo           = 0,
    totalInscritos     = { total: 0 },
  } = kpis || {};

  const totalCostes = (totalCostesFijos || 0) + (totalCostesVars || 0);
  const inscritos   = (totalInscritos?.total ?? totalInscritos) || 0;
  const detalles = [];
  const flags    = [];

  if (resultado < 0) {
    detalles.push(`Resultado negativo: ${resultado.toFixed(0)} €`);
    flags.push({ rojo: true });
  }
  if (objetivo > 0 && patComprometido < objetivo * 0.5) {
    detalles.push(`Patrocinio al ${Math.round(patComprometido / objetivo * 100)}% del objetivo`);
    flags.push({ rojo: resultado < 0 ? false : true, ambar: resultado >= 0 });
  }
  if (resultado >= 0 && totalCostes > 0 && resultado < totalCostes * 0.1) {
    detalles.push("Margen ajustado (<10% sobre costes)");
    flags.push({ ambar: true });
  }
  if (inscritos === 0 && totalCostes > 0) {
    detalles.push("Sin inscritos con costes activos");
    flags.push({ ambar: true });
  }

  const estado = estadoDesdeFlags(flags);
  // Score: 100 si resultado >= 0, se degrada proporcionalmente en déficit
  const score = totalCostes > 0
    ? Math.max(0, Math.min(100, Math.round(100 + (resultado / totalCostes) * 100)))
    : resultado >= 0 ? 100 : 0;

  return {
    area:     "Económico",
    icon:     "💰",
    estado,
    razon:    detalles.length === 0 ? "Resultado positivo" : detalles[0],
    score,
    detalles,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ÁREA 3 — LOGÍSTICO
// Inputs: stockAlerts, materialesBajoMinimo, ckDone, ckTotal, coberturaVol, puestosAlerta
// ─────────────────────────────────────────────────────────────────────────────
export function calcAreaLogistico(kpis) {
  const {
    stockAlerts          = [],
    materialesBajoMinimo = [],
    ckDone               = 0,
    ckTotal              = 0,
    coberturaVol         = 0,
    puestosAlerta        = [],
    diasHasta            = 999,
  } = kpis || {};

  const ckPct    = ckTotal > 0 ? Math.round(ckDone / ckTotal * 100) : 100;
  const detalles = [];
  const flags    = [];

  if (stockAlerts.length > 0) {
    detalles.push(`${stockAlerts.length} material${stockAlerts.length > 1 ? "es" : ""} con sobreasignación`);
    flags.push({ ambar: true });
  }
  if (materialesBajoMinimo.length > 0) {
    detalles.push(`${materialesBajoMinimo.length} material${materialesBajoMinimo.length > 1 ? "es" : ""} bajo mínimo`);
    flags.push({ rojo: diasHasta <= 30, ambar: diasHasta > 30 });
  }
  if (ckTotal > 0 && ckPct < 50) {
    detalles.push(`Pre-operativo al ${ckPct}%`);
    flags.push({ rojo: diasHasta <= 7, ambar: diasHasta > 7 });
  } else if (ckTotal > 0 && ckPct < 80) {
    detalles.push(`Pre-operativo al ${ckPct}%`);
    flags.push({ ambar: true });
  }
  if (coberturaVol < 50) {
    detalles.push(`Cobertura voluntarios ${coberturaVol}%`);
    flags.push({ rojo: diasHasta <= 30, ambar: diasHasta > 30 });
  } else if (coberturaVol < 80) {
    detalles.push(`Cobertura voluntarios ${coberturaVol}%`);
    flags.push({ ambar: true });
  }
  if (puestosAlerta.length > 0) {
    detalles.push(`${puestosAlerta.length} puesto${puestosAlerta.length > 1 ? "s" : ""} sin cobertura`);
    flags.push({ rojo: diasHasta <= 14, ambar: diasHasta > 14 });
  }

  const estado = estadoDesdeFlags(flags);
  // Score: promedio ponderado entre checklist y cobertura voluntarios
  const score = Math.round((ckPct * 0.5) + (Math.min(coberturaVol, 100) * 0.5));

  return {
    area:     "Logístico",
    icon:     "📦",
    estado,
    razon:    detalles.length === 0 ? "Logística bajo control" : detalles[0],
    score,
    detalles,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ÁREA 4 — OPERATIVO
// Inputs: tareasVencidas, tareasBloqueadas, progresoGlobal, incidenciasActivas, hitosProximos
// ─────────────────────────────────────────────────────────────────────────────
export function calcAreaOperativo(kpis) {
  const {
    tareasVencidas      = 0,
    tareasBloqueadas    = 0,
    progresoGlobal      = 0,
    incidenciasActivas  = 0,
    hitosProximos       = [],
    diasHasta           = 999,
  } = kpis || {};

  const hitosUrgentes = hitosProximos.filter(h => {
    const dias = Math.ceil((new Date(h.fecha) - new Date()) / 86400000);
    return !h.completado && h.critico && dias >= 0 && dias <= 14;
  });

  const detalles = [];
  const flags    = [];

  if (tareasVencidas > 0) {
    detalles.push(`${tareasVencidas} tarea${tareasVencidas > 1 ? "s" : ""} vencida${tareasVencidas > 1 ? "s" : ""}`);
    flags.push({ rojo: true });
  }
  if (incidenciasActivas > 0) {
    detalles.push(`${incidenciasActivas} incidencia${incidenciasActivas > 1 ? "s" : ""} abierta${incidenciasActivas > 1 ? "s" : ""}`);
    flags.push({ rojo: incidenciasActivas >= 3, ambar: incidenciasActivas < 3 });
  }
  if (hitosUrgentes.length > 0) {
    detalles.push(`${hitosUrgentes.length} hito${hitosUrgentes.length > 1 ? "s" : ""} crítico${hitosUrgentes.length > 1 ? "s" : ""} en ≤14 días`);
    flags.push({ ambar: true });
  }
  if (tareasBloqueadas > 0) {
    detalles.push(`${tareasBloqueadas} tarea${tareasBloqueadas > 1 ? "s" : ""} bloqueada${tareasBloqueadas > 1 ? "s" : ""}`);
    flags.push({ ambar: true });
  }
  if (progresoGlobal < 30 && diasHasta <= 60) {
    detalles.push(`Planificación al ${progresoGlobal}% con ${diasHasta} días`);
    flags.push({ rojo: diasHasta <= 14, ambar: diasHasta > 14 });
  }

  const estado = estadoDesdeFlags(flags);

  return {
    area:     "Operativo",
    icon:     "🏁",
    estado,
    razon:    detalles.length === 0 ? "Planificación en marcha" : detalles[0],
    score:    progresoGlobal,
    detalles,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * calcSemaforoRiesgos — derivar el semáforo de riesgo completo desde los KPIs.
 *
 * @param {object} kpis - retorno de useDashboardKpis (o subset equivalente)
 * @returns {{
 *   zonas: ZonaRiesgo[],
 *   estadoGlobal: EstadoRAG,
 *   scoreGlobal: number,
 *   razonGlobal: string
 * }}
 */
export function calcSemaforoRiesgos(kpis) {
  if (!kpis) {
    return {
      zonas:        [],
      estadoGlobal: VERDE,
      scoreGlobal:  100,
      razonGlobal:  "Sin datos",
    };
  }

  const zonas = [
    calcAreaPermisos(kpis),
    calcAreaEconomico(kpis),
    calcAreaLogistico(kpis),
    calcAreaOperativo(kpis),
  ];

  const scoreGlobal  = Math.round(zonas.reduce((s, z) => s + z.score, 0) / zonas.length);
  const estadoGlobal = zonas.some(z => z.estado === ROJO)  ? ROJO
                     : zonas.some(z => z.estado === AMBAR) ? AMBAR
                     : VERDE;

  const zonaMasRisgosa = [...zonas].sort((a, b) => a.score - b.score)[0];
  const razonGlobal    = estadoGlobal === VERDE
    ? "Todos los ámbitos bajo control"
    : `${zonaMasRisgosa.area}: ${zonaMasRisgosa.razon}`;

  return { zonas, estadoGlobal, scoreGlobal, razonGlobal };
}
