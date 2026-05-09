import { DISTANCIAS } from "../constants/budgetConstants";

/**
 * Devuelve el importe cobrado real de un patrocinador.
 * Usa importeCobrado si está definido y > 0, si no usa importe.
 * Si el estado es cobrado pero importeCobrado = 0, asume que se cobró el importe total.
 */
export const getImporteCobrado = (pat) => {
  if (pat.importeCobrado != null && pat.importeCobrado > 0) return pat.importeCobrado;
  if (pat.estado === "cobrado") return pat.importe || 0;
  return 0;
};

/**
 * Devuelve el importe comprometido (acordado, puede o no haberse cobrado).
 * Solo cuenta patrocinadores en estado confirmado o cobrado.
 */
export const getImporteComprometido = (pat) =>
  (pat.estado === "confirmado" || pat.estado === "cobrado") ? (pat.importe || 0) : 0;

/**
 * Detecta incoherencias entre estado y campos económicos.
 * Devuelve array de strings con los problemas encontrados.
 */
export const detectarIncoherencias = (pat) => {
  const issues = [];
  if (pat.estado === "cobrado" && !pat.importeCobrado && !pat.importe) {
    issues.push("Estado 'cobrado' pero sin importe registrado");
  }
  if (pat.importeCobrado > 0 && pat.estado === "prospecto") {
    issues.push("Tiene importe cobrado pero sigue como prospecto");
  }
  if (pat.importeCobrado > (pat.importe || 0) && pat.importe > 0) {
    issues.push(`Cobrado (${pat.importeCobrado}€) supera el importe acordado (${pat.importe}€)`);
  }
  if (pat.importeCobrado > 0 && pat.importeCobrado < (pat.importe || 0) && pat.estado === "cobrado") {
    issues.push(`Cobro parcial: cobrado ${pat.importeCobrado}€ de ${pat.importe}€ acordados`);
  }
  return issues;
};

/** Calcula valor estimado total en especie a partir del inventario */
export const calcularTotalEspecie = (especieItems = []) =>
  especieItems.reduce((s, i) => s + ((i.valorUnitario || 0) * (i.cantidad || 0)), 0);

export const fmt = (n) => 
  n === 0 ? "0,00 €" : `${n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;

export const fmtN = (n) => n.toFixed(2).replace(".", ",");

export const cls = (...args) => args.filter(Boolean).join(" ");

export const calculateTotalInscritos = (tramos, inscritos) => {
  const tot = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  (Array.isArray(tramos) ? tramos : []).forEach(t => {
    DISTANCIAS.forEach(d => {
      const n = inscritos.tramos[t.id]?.[d] || 0;
      tot[d] += n; tot.total += n;
    });
  });
  return tot;
};

export const calculateIngresosPorDistancia = (tramos, inscritos) => {
  const ing = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  (Array.isArray(tramos) ? tramos : []).forEach(t => {
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
  (Array.isArray(tramos) ? tramos : []).forEach(t => {
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
 * calculateCosteCamisetasDesglosado — calcula el coste total de camisetas desglosado por tipo.
 *
 * Incluye:
 *  - Camisetas de corredor (plataforma externa × precio externo) → coste de fabricación
 *  - Camisetas de voluntario (regalo automático)
 *  - Camisetas de niño (regalo / venta externa)
 *  - Extras (pedidos adicionales con cualquier estado de pago)
 *
 * @param {object} p
 * @param {object}  p.camCoste          - { corredor, voluntario, nino } coste unitario
 * @param {Array}   p.camPedidos        - Pedidos del módulo Camisetas
 * @param {object}  p.corredoresExt     - { XXS:n, XS:n, ... } tallas de corredores plataforma
 * @param {number}  p.precioCorrExt     - Precio venta por corredor externo (para calcular ingresos)
 * @param {object}  p.ninoExt           - { '4-6':n, '6-8':n, ... } tallas de niño manual
 * @param {Array}   p.voluntariosActivos - Array de voluntarios activos con talla
 * @returns {{
 *   costeCorredor, costeVoluntario, costeNino, costeExtras,
 *   ingresosExterno, ingresosPedidos,
 *   costeTotal, ingresoTotal, beneficioNeto,
 *   unidCorredor, unidVoluntario, unidNino, unidExtras
 * }}
 */
export const calculateCosteCamisetasDesglosado = ({
  camCoste = { corredor: 8, voluntario: 7, nino: 6 },
  camPedidos = [],
  corredoresExt = {},
  precioCorrExt = 0,
  ninoExt = {},
  voluntariosActivos = [],
} = {}) => {
  const costeCU = { corredor: camCoste.corredor || 8, voluntario: camCoste.voluntario || 7, nino: camCoste.nino || 6 };

  // Unidades por fuente
  const unidCorrExt = Object.values(corredoresExt).reduce((s, n) => s + (n || 0), 0);
  const unidNino    = Object.values(ninoExt).reduce((s, n) => s + (n || 0), 0);
  const unidVol     = voluntariosActivos.length;

  // Líneas de pedidos
  const lineas = camPedidos.flatMap(p => Array.isArray(p.lineas) ? p.lineas : []);
  const extrasLineas = lineas; // todos los pedidos manuales son "extras"
  const unidExtras = extrasLineas.reduce((s, l) => s + (l.cantidad || 0), 0);

  // Costes por tipo
  const costeCorredor   = unidCorrExt * costeCU.corredor;
  const costeVoluntario = unidVol * costeCU.voluntario;
  const costeNino       = unidNino * costeCU.nino;
  const costeExtras     = extrasLineas.reduce((s, l) => s + (l.cantidad || 0) * (costeCU[l.tipo] || costeCU.corredor), 0);

  // Ingresos: corredor externo (precio plataforma × unidades) + líneas pagadas de pedidos
  const ingresosExterno  = unidCorrExt * (precioCorrExt || 0);
  const ingresosPedidos  = extrasLineas
    .filter(l => l.estadoPago === "pagado")
    .reduce((s, l) => s + (l.cantidad || 0) * (l.precioVenta || 0), 0);

  const costeTotal    = costeCorredor + costeVoluntario + costeNino + costeExtras;
  const ingresoTotal  = ingresosExterno + ingresosPedidos;
  const beneficioNeto = ingresoTotal - costeTotal;

  return {
    costeCorredor, costeVoluntario, costeNino, costeExtras,
    ingresosExterno, ingresosPedidos,
    costeTotal, ingresoTotal, beneficioNeto,
    unidCorredor: unidCorrExt, unidVoluntario: unidVol, unidNino, unidExtras,
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
 * @param {object}  p.camCoste           - { corredor, voluntario, nino } coste unitario
 * @param {object}  p.camCorredoresExt   - Tallas de corredores externos { XXS:n, … }
 * @param {number}  p.camPrecioCorrExt   - Precio venta corredor externo
 * @param {object}  p.camNinoExt         - Tallas de niño { '4-6':n, … }
 * @param {Array}   p.camVoluntarios      - Voluntarios activos con talla
 * @param {Array}   p.merchandising      - Líneas de merchandising manuales
 * @param {object}  p.syncConfig         - { patrocinios: bool, camisetas: bool }
 * @returns {{ totalIngresosExtra, totalMerchBeneficio, totalOtrosIngresos,
 *             resultado, roiGlobal, totalIngresosBrutos,
 *             camisetasDesglose }}
 */
export const calculateResultadoFinanciero = ({
  totalIngresos, totalCostesFijos, totalCostesVars,
  pats = [], ingresosExtra = [],
  camPedidos = [], camCoste = { corredor: 8, voluntario: 7, nino: 6 },
  camCorredoresExt = {}, camPrecioCorrExt = 0, camNinoExt = {}, camVoluntarios = [],
  merchandising = [],
  syncConfig = { patrocinios: true, patrociniosCobrado: false, camisetas: true, subvencionPublica: true },
}) => {
  // ── Fuente única de verdad: se usa ingresosExtra.activo como campo canónico ──
  // ingresosExtra.activo ES la fuente de verdad del toggle del usuario
  // toggleSync actualiza ie.activo Y syncConfig a la vez (via TabIngresos.toggleSync)
  // Dashboard lee ingresosExtra de localStorage que ya tiene activo correcto
  
  // Calcular valores actualizados para líneas sincronizadas (en caso de que venga desde Dashboard
  // donde ingresosExtra puede estar desactualizado respecto a los cálculos en vivo)
  const getSyncedValor = (ie) => {
    if (!ie.syncKey) return ie.valor;
    if (ie.syncKey === "patrocinios") {
      return pats.filter(p => !p.especie).reduce((s, p) => s + getImporteComprometido(p), 0);
    }
    if (ie.syncKey === "patrociniosCobrado") {
      return pats.filter(p => !p.especie && p.estado === "cobrado").reduce((s, p) => s + getImporteCobrado(p), 0);
    }
    if (ie.syncKey === "subvencionPublica") {
      return pats.filter(p => p.sector === "Administración pública" && !p.especie).reduce((s, p) => s + getImporteComprometido(p), 0);
    }
    if (ie.syncKey === "camisetas") {
      // Se calcula abajo con la lógica de camisetas
      return ie.valor; // placeholder, se recalcula abajo
    }
    return ie.valor;
  };

  // ── Suma todos los ingresos extra activos (respetando ie.activo del usuario) ──
  const totalIngresosExtra = ingresosExtra
    .filter(ie => ie.activo && ie.syncKey !== "camisetas") // camisetas se suma por separado
    .reduce((s, ie) => s + getSyncedValor(ie), 0);

  // ── Camisetas — cálculo completo con desglose (corredor+regalo+niño) ─────
  const camisetasIe = ingresosExtra.find(ie => ie.syncKey === "camisetas");
  const camisetasActivo = camisetasIe ? camisetasIe.activo : (syncConfig.camisetas ?? true);
  let totalMerchBeneficio = 0;
  let camisetasDesglose = null;
  if (camisetasActivo) {
    camisetasDesglose = calculateCosteCamisetasDesglosado({
      camCoste,
      camPedidos: Array.isArray(camPedidos) ? camPedidos : [],
      corredoresExt: camCorredoresExt,
      precioCorrExt: camPrecioCorrExt,
      ninoExt: camNinoExt,
      voluntariosActivos: camVoluntarios,
    });
    totalMerchBeneficio = camisetasDesglose.beneficioNeto;
    // Fallback: si no hay datos de camisetas, usar modelo simple de merchandising
    if (camisetasDesglose.costeTotal === 0 && camisetasDesglose.ingresoTotal === 0
        && Array.isArray(merchandising) && merchandising.length > 0) {
      const merch = merchandising.filter(m => m.activo);
      const mi = merch.reduce((s, m) => s + m.unidades * m.precioVenta, 0);
      const mc = merch.reduce((s, m) => s + m.unidades * m.costeUnitario, 0);
      totalMerchBeneficio = mi - mc;
      camisetasDesglose = null; // sin desglose en modo legado
    }
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
    camisetasDesglose, // null si camisetas inactivo o modo legado
  };
};
