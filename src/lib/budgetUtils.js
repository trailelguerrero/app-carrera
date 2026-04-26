import { DISTANCIAS } from "../constants/budgetConstants";

export const fmt = (n) => 
  n === 0 ? "0,00 €" : `${n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;

export const fmtN = (n) => n.toFixed(2).replace(".", ",");

export const cls = (...args) => args.filter(Boolean).join(" ");

export const calculateTotalInscritos = (tramos, inscritos) => {
  const tot = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  tramos.forEach(t => {
    DISTANCIAS.forEach(d => {
      const n = inscritos.tramos[t.id]?.[d] || 0;
      tot[d] += n; tot.total += n;
    });
  });
  return tot;
};

export const calculateIngresosPorDistancia = (tramos, inscritos) => {
  const ing = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  tramos.forEach(t => {
    DISTANCIAS.forEach(d => {
      const n = inscritos.tramos[t.id]?.[d] || 0;
      const precio = t.precios[d] || 0;
      ing[d] += n * precio; ing.total += n * precio;
    });
  });
  return ing;
};

export const calculatePrecioMedioDistancia = (totalInscritos, ingresosPorDistancia) => {
  const pm = {};
  DISTANCIAS.forEach(d => {
    const n = totalInscritos[d];
    pm[d] = n > 0 ? ingresosPorDistancia[d] / n : 0;
  });
  pm.total = totalInscritos.total > 0 ? ingresosPorDistancia.total / totalInscritos.total : 0;
  return pm;
};

export const calculateCostesFijos = (conceptos, totalInscritos) => {
  const costes = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  conceptos.filter(c => c.tipo === "fijo" && c.activo).forEach(c => {
    const distActivas  = DISTANCIAS.filter(d => c.activoDistancias[d]);
    const totalActivos = distActivas.reduce((s, d) => s + totalInscritos[d], 0);
    DISTANCIAS.forEach(d => {
      if (!c.activoDistancias[d]) return;
      const prorrata = totalActivos > 0
        ? c.costeTotal * (totalInscritos[d] / totalActivos)
        : c.costeTotal / distActivas.length;
      costes[d] += prorrata;
    });
    costes.total += c.costeTotal;
  });
  return costes;
};

export const calculateCostesVariables = (conceptos, totalInscritos) => {
  const costes = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  conceptos.filter(c => c.tipo === "variable" && c.activo).forEach(c => {
    DISTANCIAS.forEach(d => {
      if (c.activoDistancias && !c.activoDistancias[d]) return;
      const coste = (c.costePorDistancia[d] || 0) * totalInscritos[d];
      costes[d] += coste; costes.total += coste;
    });
  });
  return costes;
};

export const calculateCostesVarPorCorredor = (conceptos) => {
  const cv = {};
  DISTANCIAS.forEach(d => {
    cv[d] = conceptos
      .filter(c => c.tipo === "variable" && c.activo)
      .filter(c => !c.activoDistancias || c.activoDistancias[d])
      .reduce((s, c) => s + (c.costePorDistancia[d] || 0), 0);
  });
  return cv;
};

export const calculateCostesFijoPorCorredor = (costesFijos, totalInscritos) => {
  const cf = {};
  DISTANCIAS.forEach(d => {
    cf[d] = totalInscritos[d] > 0 ? costesFijos[d] / totalInscritos[d] : null;
  });
  return cf;
};

export const calculateMerchTotales = (merchandising) => {
  const activos = merchandising.filter(m => m.activo);
  const ingresos = activos.reduce((s, m) => s + m.unidades * m.precioVenta, 0);
  const costes = activos.reduce((s, m) => s + m.unidades * m.costeUnitario, 0);
  return { ingresos, costes, beneficio: ingresos - costes };
};

export const calculateIngresosDesglosados = (tramos, inscritos) => {
  const hoy = new Date();
  const real = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  const est  = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  const inscReal = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  const inscEst  = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  tramos.forEach(t => {
    const cerrado = new Date(t.fechaFin) < hoy;
    const bucket  = cerrado ? real : est;
    const bucketI = cerrado ? inscReal : inscEst;
    ["TG7","TG13","TG25"].forEach(d => {
      const n = inscritos.tramos?.[t.id]?.[d] || 0;
      const v = n * (t.precios[d] || 0);
      bucket[d]  += v;  bucket.total  += v;
      bucketI[d] += n;  bucketI.total += n;
    });
  });
  return { ingresosReales: real, ingresosEstimados: est, inscritosReales: inscReal, inscritosEstimados: inscEst };
};

// M1 fix: eliminado dead code `totalN`
export const calculateResultado = (totalInscritos, ingresosPorDistancia, costesFijos, costesVariables, totalIngresosConMerch) => {
  const res = { total: 0, TG7: 0, TG13: 0, TG25: 0 };
  const totalIngBase = ingresosPorDistancia.total;
  DISTANCIAS.forEach(d => {
    const prop = totalIngBase > 0
      ? ingresosPorDistancia[d] / totalIngBase
      : 1 / DISTANCIAS.length;
    const ingresosExtraProp = totalIngresosConMerch * prop;
    res[d] = ingresosPorDistancia[d] + ingresosExtraProp - costesFijos[d] - costesVariables[d];
  });
  res.total = ingresosPorDistancia.total + totalIngresosConMerch - costesFijos.total - costesVariables.total;
  return res;
};

export const calculatePuntoEquilibrio = (totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch, maximos = {}) => {
  const pe = {};
  const totalN = totalInscritos.total;
  const proporcion = {};
  const totalIngBase = DISTANCIAS.reduce((s, d) =>
    s + (totalInscritos[d] > 0 ? precioMedioDistancia[d] * totalInscritos[d] : 0), 0);
  DISTANCIAS.forEach(d => {
    const ingD = precioMedioDistancia[d] * totalInscritos[d];
    proporcion[d] = totalIngBase > 0 ? ingD / totalIngBase : 1 / DISTANCIAS.length;
  });
  DISTANCIAS.forEach(d => {
    const margen = precioMedioDistancia[d] - costesVarPorCorredor[d];
    if (margen <= 0) { pe[d] = "∞"; return; }
    const fijosNetos = costesFijos[d] - totalIngresosConMerch * proporcion[d];
    if (fijosNetos <= 0) { pe[d] = 0; return; }
    const peBruto = Math.ceil(fijosNetos / margen);
    const maximo = maximos[d] || 0;
    if (maximo > 0 && peBruto > maximo) pe[d] = { valor: peBruto, supera: true, maximo };
    else pe[d] = peBruto;
  });
  return pe;
};

export const calculatePEGlobal = (totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch, maximos = {}) => {
  const fijosNetos = Math.max(costesFijos.total - totalIngresosConMerch, 0);
  const margenPorDist = {};
  DISTANCIAS.forEach(d => { margenPorDist[d] = (precioMedioDistancia[d] || 0) - (costesVarPorCorredor[d] || 0); });
  const margenActual = DISTANCIAS.reduce((s, d) => s + Math.max(margenPorDist[d], 0) * (totalInscritos[d] || 0), 0);
  const plazasLibres = {};
  DISTANCIAS.forEach(d => { const max = maximos[d] || 0; plazasLibres[d] = Math.max(max - (totalInscritos[d] || 0), 0); });
  const aforoTotal  = DISTANCIAS.reduce((s, d) => s + (maximos[d] || 0), 0);
  const plazasTotal = DISTANCIAS.reduce((s, d) => s + plazasLibres[d], 0);

  if (fijosNetos <= 0 || margenActual >= fijosNetos) {
    return {
      peGlobal: totalInscritos.total, porDistancia: { ...totalInscritos },
      margenMedio: totalInscritos.total > 0 ? margenActual / totalInscritos.total : 0,
      fijosNetos, viable: true, superaAforo: false, aforoTotal, diferencia: 0, coberturaPct: 100, inscritosNecesarios: {},
    };
  }

  let margenFaltante = fijosNetos - margenActual;
  const distOrdenadas = [...DISTANCIAS].filter(d => margenPorDist[d] > 0).sort((a, b) => margenPorDist[b] - margenPorDist[a]);
  const inscritosNecesarios = {};
  DISTANCIAS.forEach(d => { inscritosNecesarios[d] = 0; });
  for (const d of distOrdenadas) {
    if (margenFaltante <= 0) break;
    const disponibles = plazasLibres[d];
    if (disponibles <= 0) continue;
    const necesarios = Math.ceil(margenFaltante / margenPorDist[d]);
    const aCubrir    = Math.min(necesarios, disponibles);
    inscritosNecesarios[d] = aCubrir;
    margenFaltante -= aCubrir * margenPorDist[d];
  }

  const porDistancia = {}; let peGlobal = 0;
  DISTANCIAS.forEach(d => { porDistancia[d] = (totalInscritos[d] || 0) + inscritosNecesarios[d]; peGlobal += porDistancia[d]; });
  const viable = margenFaltante <= 0;
  const margenMedio = peGlobal > 0 ? DISTANCIAS.reduce((s, d) => s + margenPorDist[d] * porDistancia[d], 0) / peGlobal : 0;
  const diferencia = totalInscritos.total - peGlobal;
  const coberturaPct = peGlobal > 0 ? Math.min((totalInscritos.total / peGlobal) * 100, 200) : 100;

  return {
    peGlobal, porDistancia, inscritosNecesarios, margenMedio, fijosNetos,
    viable, superaAforo: !viable, aforoTotal, plazasTotal, diferencia, coberturaPct,
    margenFaltante: Math.max(margenFaltante, 0),
  };
};

/**
 * calculateResultadoFinanciero — fuente única de verdad para el resultado económico.
 * Usada por useBudgetLogic Y Dashboard, evitando duplicación de lógica.
 *
 * @param {object} p
 * @param {number}  p.totalIngresos      - Ingresos de inscripciones
 * @param {number}  p.totalCostesFijos   - Costes fijos calculados
 * @param {number}  p.totalCostesVars    - Costes variables calculados
 * @param {Array}   p.pats               - Array de patrocinadores
 * @param {Array}   p.ingresosExtra      - Líneas de ingresos extra manuales
 * @param {Array}   p.camPedidos         - Pedidos de camisetas
 * @param {object}  p.camCoste           - { corredor, voluntario } coste unitario
 * @param {Array}   p.merchandising      - Líneas de merchandising manuales
 * @param {object}  p.syncConfig         - { patrocinios: bool, camisetas: bool }
 * @returns {{ totalIngresosExtra, totalMerchBeneficio, totalOtrosIngresos,
 *             resultado, roiGlobal, totalIngresosBrutos }}
 */
export const calculateResultadoFinanciero = ({
  totalIngresos, totalCostesFijos, totalCostesVars,
  pats = [], ingresosExtra = [],
  camPedidos = [], camCoste = { corredor: 7.5, voluntario: 7.5 },
  merchandising = [],
  syncConfig = { patrocinios: true, camisetas: true },
}) => {
  // ── Patrocinios + ingresos extra ─────────────────────────────────────────
  // Replica exactamente la lógica de useBudgetLogic:
  // - línea id=1 (patrocinios synced): si syncConfig.patrocinios, valor = suma de pats confirmados/cobrados
  // - línea id=2 (camisetas synced): gestionado más abajo via totalMerchBeneficio
  // - líneas manuales (id≥10): se suman siempre si están activas y tienen valor
  const patSyncado = syncConfig.patrocinios
    ? pats.filter(p => !p.especie && (p.estado === "cobrado" || p.estado === "confirmado"))
          .reduce((s, p) => s + (p.importe || 0), 0)
    : (ingresosExtra.find(i => i.id === 1 && i.activo)?.valor || 0);
  const ingresosManuales = ingresosExtra
    .filter(i => i.activo && !i.synced && i.id !== 1 && i.id !== 2)
    .reduce((s, i) => s + (i.valor || 0), 0);
  const totalIngresosExtra = patSyncado + ingresosManuales;

  // ── Camisetas (merchandising) ─────────────────────────────────────────────
  let totalMerchBeneficio = 0;
  if (syncConfig.camisetas) {
    const lineas     = (Array.isArray(camPedidos) ? camPedidos : []).flatMap(p => Array.isArray(p.lineas) ? p.lineas : []);
    const ingresos   = lineas.filter(l => l.estadoPago === "pagado").reduce((s, l) => s + (l.precioVenta || 0) * (l.cantidad || 0), 0);
    const costes     = lineas.filter(l => l.estadoPago === "pagado" || l.estadoPago === "pendiente")
                             .reduce((s, l) => s + ((camCoste[l.tipo] ?? 7.5) * (l.cantidad || 0)), 0);
    totalMerchBeneficio = ingresos - costes;
  } else {
    const merch = Array.isArray(merchandising) ? merchandising : [];
    const ingresos = merch.filter(m => m.activo).reduce((s, m) => s + m.unidades * m.precioVenta, 0);
    const costes   = merch.filter(m => m.activo).reduce((s, m) => s + m.unidades * m.costeUnitario, 0);
    totalMerchBeneficio = ingresos - costes;
  }

  const totalOtrosIngresos  = totalIngresosExtra + totalMerchBeneficio;
  const totalIngresosBrutos = totalIngresos + totalOtrosIngresos;
  const resultado           = totalIngresosBrutos - totalCostesFijos - totalCostesVars;
  const costes              = totalCostesFijos + totalCostesVars;
  const roiGlobal           = costes > 0
    ? Math.round(((totalIngresosBrutos - costes) / costes) * 100)
    : 0;

  return {
    totalIngresosExtra, totalMerchBeneficio,
    totalOtrosIngresos, totalIngresosBrutos,
    resultado, roiGlobal,
  };
};
