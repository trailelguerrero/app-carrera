import { DISTANCIAS } from "../constants/budgetConstants";

/**
 * Formatear número como moneda EUR
 */
export const fmt = (n) => 
  n === 0 ? "0,00 €" : `${n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;

/**
 * Formatear número con coma decimal
 */
export const fmtN = (n) => n.toFixed(2).replace(".", ",");

/**
 * Unir clases CSS condicionales
 */
export const cls = (...args) => args.filter(Boolean).join(" ");

/**
 * Calcular inscritos totales por tramo y distancia
 */
export const calculateTotalInscritos = (tramos, inscritos) => {
  const tot = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  tramos.forEach(t => {
    DISTANCIAS.forEach(d => {
      const n = inscritos.tramos[t.id]?.[d] || 0;
      tot[d] += n;
      tot.total += n;
    });
  });
  return tot;
};

/**
 * Calcular ingresos por inscripciones
 */
export const calculateIngresosPorDistancia = (tramos, inscritos) => {
  const ing = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  tramos.forEach(t => {
    DISTANCIAS.forEach(d => {
      const n = inscritos.tramos[t.id]?.[d] || 0;
      const precio = t.precios[d] || 0;
      ing[d] += n * precio;
      ing.total += n * precio;
    });
  });
  return ing;
};

/**
 * Calcular precio medio real por distancia
 */
export const calculatePrecioMedioDistancia = (totalInscritos, ingresosPorDistancia) => {
  const pm = {};
  DISTANCIAS.forEach(d => {
    const n = totalInscritos[d];
    pm[d] = n > 0 ? ingresosPorDistancia[d] / n : 0;
  });
  pm.total = totalInscritos.total > 0 ? ingresosPorDistancia.total / totalInscritos.total : 0;
  return pm;
};

/**
 * Calcular costes fijos prorrateados por distancia
 */
export const calculateCostesFijos = (conceptos, totalInscritos) => {
  const costes = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  conceptos.filter(c => c.tipo === "fijo" && c.activo).forEach(c => {
    const distActivas = DISTANCIAS.filter(d => c.activoDistancias[d]);
    const totalActivos = distActivas.reduce((s, d) => s + totalInscritos[d], 0);
    DISTANCIAS.forEach(d => {
      if (!c.activoDistancias[d]) return;
      // Si no hay inscritos en ninguna distancia activa, el coste va a total
      // pero no se asigna a distancias individuales (evita cifras engañosas)
      if (totalActivos === 0) return;
      const prorrata = c.costeTotal * (totalInscritos[d] / totalActivos);
      costes[d] += prorrata;
    });
    costes.total += c.costeTotal;
  });
  return costes;
};

/**
 * Calcular costes variables totales
 */
export const calculateCostesVariables = (conceptos, totalInscritos) => {
  const costes = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  conceptos.filter(c => c.tipo === "variable" && c.activo).forEach(c => {
    DISTANCIAS.forEach(d => {
      // Respetar activoDistancias si existe en el concepto variable
      if (c.activoDistancias && !c.activoDistancias[d]) return;
      const coste = (c.costePorDistancia[d] || 0) * totalInscritos[d];
      costes[d] += coste;
      costes.total += coste;
    });
  });
  return costes;
};

/**
 * Calcular coste variable unitario por corredor
 */
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

/**
 * Calcular coste fijo unitario por corredor
 */
export const calculateCostesFijoPorCorredor = (costesFijos, totalInscritos) => {
  const cf = {};
  DISTANCIAS.forEach(d => {
    // null cuando no hay inscritos: 0 €/corredor sería engañoso,
    // el coste fijo existe igualmente y no está cubierto por nadie
    cf[d] = totalInscritos[d] > 0 ? costesFijos[d] / totalInscritos[d] : null;
  });
  return cf;
};

/**
 * Calcular totales de merchandising
 */
export const calculateMerchTotales = (merchandising) => {
  const activos = merchandising.filter(m => m.activo);
  const ingresos = activos.reduce((s, m) => s + m.unidades * m.precioVenta, 0);
  const costes = activos.reduce((s, m) => s + m.unidades * m.costeUnitario, 0);
  const beneficio = ingresos - costes;
  return { ingresos, costes, beneficio };
};

/**
 * Desglosar ingresos por inscripción en reales (tramos cerrados) y estimados (tramos abiertos/futuros)
 * Un tramo es "cerrado" cuando su fechaFin < hoy — sus inscritos ya han pagado.
 */
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

/**
 * Calcular resultado neto (P&L)
 */
export const calculateResultado = (totalInscritos, ingresosPorDistancia, costesFijos, costesVariables, totalIngresosConMerch) => {
  const res = { total: 0, TG7: 0, TG13: 0, TG25: 0 };
  const totalN = totalInscritos.total;
  const totalIngBase = ingresosPorDistancia.total;
  DISTANCIAS.forEach(d => {
    // Prorrateo de ingresos extra por ingresos de inscripción (no por cabezas):
    // si TG25 genera más ingresos, le corresponde mayor parte de patrocinios/merch
    const prop = totalIngBase > 0
      ? ingresosPorDistancia[d] / totalIngBase
      : 1 / DISTANCIAS.length;
    const ingresosExtraProp = totalIngresosConMerch * prop;
    res[d] = ingresosPorDistancia[d] + ingresosExtraProp - costesFijos[d] - costesVariables[d];
  });
  res.total = ingresosPorDistancia.total + totalIngresosConMerch - costesFijos.total - costesVariables.total;
  return res;
};

/**
 * Calcular puntos de equilibrio por distancia
 */
export const calculatePuntoEquilibrio = (totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch, maximos = {}) => {
  const pe = {};
  const totalN = totalInscritos.total;
  const proporcion = {};
  const totalIngBase = DISTANCIAS.reduce((s, d) =>
    s + (totalInscritos[d] > 0 ? precioMedioDistancia[d] * totalInscritos[d] : 0), 0);
  DISTANCIAS.forEach(d => {
    // Coherente con calculateResultado: prorrateo por ingresos, no por cabezas
    const ingD = precioMedioDistancia[d] * totalInscritos[d];
    proporcion[d] = totalIngBase > 0
      ? ingD / totalIngBase
      : 1 / DISTANCIAS.length;
  });

  DISTANCIAS.forEach(d => {
    const margen = precioMedioDistancia[d] - costesVarPorCorredor[d];
    if (margen <= 0) { pe[d] = "∞"; return; }
    const fijosNetos = costesFijos[d] - totalIngresosConMerch * proporcion[d];
    if (fijosNetos <= 0) { pe[d] = 0; return; }
    const peBruto = Math.ceil(fijosNetos / margen);
    const maximo = maximos[d] || 0;
    // Si el PE supera el máximo de plazas, el equilibrio no es alcanzable
    // solo con esta distancia — marcamos con una bandera especial
    if (maximo > 0 && peBruto > maximo) {
      pe[d] = { valor: peBruto, supera: true, maximo };
    } else {
      pe[d] = peBruto;
    }
  });
  return pe;
};

/**
 * Calcular el Punto de Equilibrio Global real
 *
 * El PE global responde a: "¿cuántos corredores en total necesitamos,
 * manteniendo el mix actual de distancias, para cubrir todos los costes?"
 *
 * Fórmula:
 *   PE_global = Costes_fijos_netos / Margen_contribución_medio_ponderado
 *
 * El mix actual determina cómo se distribuyen esos corredores entre distancias:
 *   PE_distancia_d = PE_global × proporción_d
 *
 * Así el PE NUNCA supera el aforo máximo de forma individual — si el mix
 * es realista, la distribución resultante es alcanzable.
 *
 * Si el PE global supera el aforo total disponible, el evento no es viable
 * con la estructura de costes/precios actual — se informa claramente.
 */
export const calculatePEGlobal = (
  totalInscritos,
  precioMedioDistancia,
  costesVarPorCorredor,
  costesFijos,
  totalIngresosConMerch,
  maximos = {}
) => {
  const totalN    = totalInscritos.total;
  const aforoTotal = DISTANCIAS.reduce((s, d) => s + (maximos[d] || 0), 0);

  // Costes fijos que deben cubrirse con inscripciones
  const fijosNetos = Math.max(costesFijos.total - totalIngresosConMerch, 0);

  // Margen de contribución medio ponderado por el mix actual de inscritos
  // Si no hay inscritos, usamos partes iguales como aproximación
  const margenMedio = totalN > 0
    ? DISTANCIAS.reduce((s, d) => {
        const margen = precioMedioDistancia[d] - costesVarPorCorredor[d];
        const prop   = totalInscritos[d] / totalN;
        return s + margen * prop;
      }, 0)
    : DISTANCIAS.reduce((s, d) =>
        s + (precioMedioDistancia[d] - costesVarPorCorredor[d]) / DISTANCIAS.length, 0);

  // PE global inviable si margen ≤ 0
  if (margenMedio <= 0) {
    return { peGlobal: null, porDistancia: {}, viable: false,
      motivo: "El margen de contribución medio es negativo o cero" };
  }

  // PE global = fijos netos / margen medio
  const peGlobal = fijosNetos <= 0 ? 0 : Math.ceil(fijosNetos / margenMedio);

  // Proporciones del mix actual (o iguales si no hay inscritos)
  const proporciones = {};
  DISTANCIAS.forEach(d => {
    proporciones[d] = totalN > 0
      ? totalInscritos[d] / totalN
      : 1 / DISTANCIAS.length;
  });

  // Distribución del PE global entre distancias según el mix
  const porDistancia = {};
  DISTANCIAS.forEach(d => {
    porDistancia[d] = Math.ceil(peGlobal * proporciones[d]);
  });

  // ¿El PE global es alcanzable con el aforo máximo?
  const superaAforo = aforoTotal > 0 && peGlobal > aforoTotal;

  // ¿Alguna distancia individual supera su máximo con esta distribución?
  const distanciasSuperanMaximo = DISTANCIAS.filter(d =>
    maximos[d] > 0 && porDistancia[d] > maximos[d]
  );

  return {
    peGlobal,
    porDistancia,
    proporciones,
    margenMedio,
    fijosNetos,
    viable: !superaAforo,
    superaAforo,
    aforoTotal,
    distanciasSuperanMaximo,
    // Cuántos corredores faltan o sobran respecto al PE
    diferencia: totalN - peGlobal,
    // Porcentaje de cobertura actual
    coberturaPct: peGlobal > 0 ? Math.min((totalN / peGlobal) * 100, 200) : 100,
  };
};
