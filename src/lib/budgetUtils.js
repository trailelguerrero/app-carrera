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
      const prorrata = totalActivos > 0 
        ? c.costeTotal * (totalInscritos[d] / totalActivos) 
        : c.costeTotal / distActivas.length;
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
    cf[d] = totalInscritos[d] > 0 ? costesFijos[d] / totalInscritos[d] : 0;
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
 * Calcular resultado neto (P&L)
 */
export const calculateResultado = (totalInscritos, ingresosPorDistancia, costesFijos, costesVariables, totalIngresosConMerch) => {
  const res = { total: 0, TG7: 0, TG13: 0, TG25: 0 };
  const totalN = totalInscritos.total;
  DISTANCIAS.forEach(d => {
    const prop = totalN > 0 ? totalInscritos[d] / totalN : 1 / DISTANCIAS.length;
    const ingresosExtraProp = totalIngresosConMerch * prop;
    res[d] = ingresosPorDistancia[d] + ingresosExtraProp - costesFijos[d] - costesVariables[d];
  });
  res.total = ingresosPorDistancia.total + totalIngresosConMerch - costesFijos.total - costesVariables.total;
  return res;
};

/**
 * Calcular puntos de equilibrio por distancia
 */
export const calculatePuntoEquilibrio = (totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch) => {
  const pe = {};
  const totalN = totalInscritos.total;
  const proporcion = {};
  DISTANCIAS.forEach(d => {
    proporcion[d] = totalN > 0 ? totalInscritos[d] / totalN : 1 / DISTANCIAS.length;
  });

  DISTANCIAS.forEach(d => {
    const margen = precioMedioDistancia[d] - costesVarPorCorredor[d];
    if (margen <= 0) { pe[d] = "∞"; return; }
    const fijosNetos = costesFijos[d] - totalIngresosConMerch * proporcion[d];
    pe[d] = fijosNetos <= 0 ? 0 : Math.ceil(fijosNetos / margen);
  });
  return pe;
};
