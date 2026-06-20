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
 *
 * NOTA DE INVARIANTE (ECO-01):
 * Esta función devuelve el importe de UN patrocinador sin conocer el contexto
 * de qué líneas están activas. El control de doble cómputo entre
 * "Patrocinios captados" (syncKey: patrocinios) y "Subvención entidad pública"
 * (syncKey: subvencionPublica) se aplica en el nivel de agregación de
 * totalPatConfirmado en useBudgetLogic.js:
 *   — Cuando subvencionPublica está activo, totalPatConfirmado excluye el sector
 *     "Administración pública" para evitar que ese importe aparezca dos veces
 *     en la cuenta de resultados.
 *   — No modificar este comportamiento aquí: el filtro de exclusión debe vivir
 *     en el hook para ser reactivo cuando el usuario activa/desactiva el toggle.
 */
export const getImporteComprometido = (pat) =>
  (pat.estado === "confirmado" || pat.estado === "cobrado") ? (pat.importe || 0) : 0;

/**
 * Detecta incoherencias entre estado y campos económicos.
 * Devuelve array de strings con los problemas encontrados.
 *
 * INC-03: Cobertura completa de casos anómalos:
 *   - cobrado sin importe ni especie
 *   - cobrado (importeCobrado) siendo prospecto, negociando o cancelado
 *   - cobrado supera el importe acordado
 *   - cobro parcial registrado como cobrado
 *   - estado cobrado con contraprestaciones aún pendientes
 */
export const detectarIncoherencias = (pat) => {
  const issues = [];

  // — Sin importe de ningún tipo pero marcado como cobrado
  if (pat.estado === "cobrado" && !pat.importeCobrado && !pat.importe && !(pat.especie > 0)) {
    issues.push("Está marcado como cobrado pero no tiene ningún importe ni aportación en especie registrada");
  }

  // — Cobros registrados en estados que no deberían tenerlos
  if (pat.importeCobrado > 0 && pat.estado === "prospecto") {
    issues.push("Tiene importe cobrado registrado pero el acuerdo sigue como prospecto. Revisa el estado.");
  }
  if (pat.importeCobrado > 0 && pat.estado === "negociando") {
    issues.push("Hay un importe cobrado registrado aunque el acuerdo está en negociación y no está firmado.");
  }
  if (pat.importeCobrado > 0 && pat.estado === "cancelado") {
    issues.push("Tiene importe cobrado registrado en un acuerdo cancelado. Verifica si corresponde a una devolución pendiente.");
  }

  // — Cobrado supera el importe acordado
  if (pat.importeCobrado > (pat.importe || 0) && pat.importe > 0) {
    issues.push(`El importe cobrado (${pat.importeCobrado}€) supera el importe acordado (${pat.importe}€)`);
  }

  // — Cobro parcial registrado con estado cobrado
  if (pat.importeCobrado > 0 && pat.importeCobrado < (pat.importe || 0) && pat.estado === "cobrado") {
    issues.push(`Cobro parcial: se han registrado ${pat.importeCobrado}€ de los ${pat.importe}€ acordados. Actualiza el importe cobrado o revisa el estado.`);
  }

  // — Estado cobrado con contraprestaciones todavía pendientes
  if (pat.estado === "cobrado") {
    const pendientes = (pat.contraprestaciones || []).filter(c => c.estado === "pendiente");
    if (pendientes.length > 0) {
      issues.push(`El acuerdo está cobrado pero tiene ${pendientes.length} compromiso${pendientes.length > 1 ? "s" : ""} pendiente${pendientes.length > 1 ? "s" : ""} de entregar: ${pendientes.map(c => c.tipo).join(", ")}.`);
    }
  }

  return issues;
};

/** Calcula valor estimado total en especie a partir del inventario */
export const calcularTotalEspecie = (especieItems = []) =>
  especieItems.reduce((s, i) => s + ((i.valorUnitario || 0) * (i.cantidad || 0)), 0);

/**
 * getEspecieValue — FUENTE ÚNICA DE VERDAD para el valor en especie de un patrocinador.
 *
 * DECISIÓN DE ARQUITECTURA (INC-01) — Opción C: fallback retrocompatible
 * -----------------------------------------------------------------------
 * Hay dos campos que pueden expresar el valor en especie:
 *   1. p.especie         — campo numérico manual (legado, introducido a mano)
 *   2. p.especieItems[]  — inventario detallado con valorUnitario × cantidad
 *
 * Estrategia elegida:
 *   - Si existe al menos un ítem con valorUnitario > 0 → usar calcularTotalEspecie(especieItems)
 *   - En caso contrario → usar p.especie como fallback (compatibilidad con datos sin ítems)
 *
 * Por qué Opción C (y no A ni B):
 *   - Opción A (siempre calcular desde ítems): rompe registros con especie manual sin ítems
 *   - Opción B (especie readonly sincronizado): requiere que todas las escrituras recalculen,
 *     lo que añade complejidad sin beneficio real sobre C
 *   - Opción C: retrocompatible, no requiere migración de datos, converge naturalmente
 *     cuando el usuario añade valorUnitario a los ítems
 *
 * Esta función debe usarse en todos los puntos que consumen el valor en especie:
 *   - stats.especie en Patrocinadores.jsx
 *   - porNivel.total en TabDashboard.jsx
 *   - savePat (para sincronizar p.especie al guardar cuando hay ítems)
 *
 * @param {object} pat - Objeto patrocinador completo
 * @returns {number} Valor en especie en euros
 */
export const getEspecieValue = (pat) => {
  const items = pat.especieItems || [];
  const totalItems = calcularTotalEspecie(items);
  // Usar ítems calculados solo si hay al menos un ítem con valorUnitario definido y > 0
  const tieneItemsConValor = items.some(i => i.valorUnitario > 0);
  return tieneItemsConValor ? totalItems : (pat.especie || 0);
};

/**
 * detectarDobleComputoNino — AUD-CAM-01/02 (validación recomendación nº5 de la auditoría
 * de camisetas): detecta si las tallas de "Niño/a — manual" (ninoExt, fuente de gasto
 * independiente, sin trazabilidad de a quién corresponde) podrían estar duplicando el
 * mismo coste que ya tiene una línea de pedido tipo "nino" con estadoPago='regalo'
 * (la vía CON trazabilidad: fecha, nombre, visible en el checklist de entregas).
 *
 * El audit advierte: si alguna vez se introducen las mismas unidades dos veces — una como
 * "Niño/a Manual" y otra como pedido tipo "niño" con estadoPago='regalo' para tener
 * trazabilidad de a quién se entregó — el coste se cuenta dos veces (categoría "nino" en
 * calculateCamisetasPresupuesto, y "regalos"). Hoy no hay ninguna validación que avise de
 * este solape, a diferencia de otros casos de doble cómputo (patrocinios/subvención) que
 * sí están protegidos explícitamente (ver detectarIncoherencias arriba).
 *
 * Heurística (best-effort, no puede saber con certeza si son las "mismas" unidades, ya que
 * ninoExt no tiene ningún campo que lo vincule a una línea de pedido concreta):
 *   - Si hay unidades en ninoExt (cualquier talla > 0) Y existe al menos una línea de pedido
 *     tipo "nino" con estadoPago='regalo' → aviso. No intenta adivinar cantidades exactas,
 *     porque comparar números (ej. "si coinciden las unidades") daría falsos negativos
 *     en cuanto cualquiera de las dos fuentes tenga cantidades distintas por coincidencia,
 *     y el objetivo es avisar de la posibilidad de solape, no demostrarlo.
 *
 * @param {object} ninoExt    - { '4-6':n, '6-8':n, ... } tallas de niño manuales
 * @param {Array}  camPedidos - Pedidos del módulo Camisetas (líneas con tipo/estadoPago)
 * @returns {{ hayRiesgo: boolean, unidadesManual: number, unidadesRegaloPedidos: number }}
 */
export const detectarDobleComputoNino = (ninoExt = {}, camPedidos = []) => {
  const unidadesManual = Object.values(ninoExt).reduce((s, n) => s + (n || 0), 0);
  const lineas = (Array.isArray(camPedidos) ? camPedidos : []).flatMap(p => Array.isArray(p.lineas) ? p.lineas : []);
  const lineasRegaloNino = lineas.filter(l => l.tipo === "nino" && l.estadoPago === "regalo");
  const unidadesRegaloPedidos = lineasRegaloNino.reduce((s, l) => s + (l.cantidad || 0), 0);
  return {
    hayRiesgo: unidadesManual > 0 && unidadesRegaloPedidos > 0,
    unidadesManual,
    unidadesRegaloPedidos,
  };
};

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

/**
 * calculateInscritosConPago — MEJ-03
 * Cuenta inscritos que tienen precio > 0 en su tramo (excluye inscritos promo / gratuitos).
 * Inferencia: un inscrito es "de pago" si el precio de su tramo para su distancia es > 0.
 *
 * @param {Array}  tramos    - Array de tramos con precios por distancia
 * @param {object} inscritos - { tramos: { [tramoId]: { TG7, TG13, TG25 } } }
 * @returns {{ TG7, TG13, TG25, total, promo: { TG7, TG13, TG25, total } }}
 *   .promo contiene los inscritos con precio 0 (códigos promocionales o tramos gratuitos)
 */
export const calculateInscritosConPago = (tramos, inscritos) => {
  const pago  = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  const promo = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  (Array.isArray(tramos) ? tramos : []).forEach(t => {
    DISTANCIAS.forEach(d => {
      const n      = inscritos.tramos?.[t.id]?.[d] || 0;
      const precio = t.precios?.[d] || 0;
      if (precio > 0) { pago[d]  += n; pago.total  += n; }
      else            { promo[d] += n; promo.total += n; }
    });
  });
  return { ...pago, promo };
};

/**
 * calculatePrecioMedioPago — MEJ-03
 * Precio medio ponderado solo sobre inscritos de pago (precio > 0).
 * Evita la distorsión causada por inscripciones con código promocional (precio 0).
 *
 * Uso en TabEquilibrio: para el PE, usar este precio en lugar del precio medio total.
 * Uso en TabResumen: mostrar nota aclaratoria si hay inscritos promo.
 *
 * Si no hay inscritos promo (todos pagan), devuelve el mismo valor que calculatePrecioMedioDistancia.
 */
export const calculatePrecioMedioPago = (inscritosConPago, ingresosPorDistancia) => {
  const pm = {};
  DISTANCIAS.forEach(d => {
    const n = inscritosConPago[d];
    pm[d] = n > 0 ? ingresosPorDistancia[d] / n : 0;
  });
  const totalPago = inscritosConPago.total;
  pm.total = totalPago > 0 ? ingresosPorDistancia.total / totalPago : 0;
  return pm;
};

/**
 * calculateCostesFijos — prorrata dinámica de costes fijos entre distancias.
 *
 * MEJ-04 — DOCUMENTACIÓN PARA EL ORGANIZADOR:
 * --------------------------------------------
 * Un coste fijo (p.ej. cronometraje: 968 €) no depende del número de corredores,
 * pero sí hay que asignarlo entre las distancias para saber cuánto "pesa" en cada una.
 *
 * ALGORITMO DE PRORRATA:
 *   Para cada concepto fijo activo en las distancias A, B, C:
 *     prorrata[A] = costeTotal × (inscritos[A] / (inscritos[A] + inscritos[B] + inscritos[C]))
 *
 *   Si no hay inscritos todavía → se reparte a partes iguales entre las distancias activas.
 *
 * POR QUÉ ES DINÁMICO (y puede cambiar al añadir inscritos):
 *   La prorrata refleja la "carga" que cada distancia asume del coste común.
 *   Si TG7 tiene 100 inscritos y TG25 tiene 10, TG7 absorbe ~91% del coste fijo compartido.
 *   Al añadir 50 inscritos a TG25, la proporción cambia → el coste por distancia varía.
 *
 * IMPLICACIÓN PARA EL ANÁLISIS:
 *   El TOTAL de costes fijos (costes.total) es siempre fijo e invariable — ese es el número
 *   a vigilar. El desglose por distancia es ORIENTATIVO: muestra la estructura de costes
 *   con la composición actual de inscritos, pero cambiará a medida que se confirmen más.
 *   → Para decisiones financieras, usar siempre el resultado TOTAL, no el de una distancia.
 *
 * @param {Array}  conceptos     - Array de conceptos presupuestarios
 * @param {object} totalInscritos - { TG7, TG13, TG25, total } inscritos actuales
 * @returns {{ TG7, TG13, TG25, total }} costes fijos prorrateados
 */
/**
 * calculateCostesFijos — prorrata dinámica de costes fijos entre distancias.
 *
 * @param {Array}  conceptos
 * @param {object} totalInscritos
 * @param {number} extraFijo - ECO-09: coste fijo adicional no asociado a un concepto editable
 *   (p.ej. gasto total de camisetas calculado por calculateCamisetasPresupuesto). Se trata como
 *   un concepto fijo virtual activo en las 3 distancias: se prorratea dinámicamente por
 *   inscritos igual que cualquier otro concepto fijo. Default 0 — sin efecto si se omite.
 */
export const calculateCostesFijos = (conceptos, totalInscritos, extraFijo = 0) => {
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
  // ECO-09: el extra (camisetas) se prorratea igual que un concepto fijo activo en TG7/TG13/TG25,
  // así el desglose por distancia sigue sumando exactamente el total.
  if (extraFijo > 0) {
    const totalActivos = DISTANCIAS.reduce((s, d) => s + totalInscritos[d], 0);
    DISTANCIAS.forEach(d => {
      const prorrata = totalActivos > 0
        ? extraFijo * (totalInscritos[d] / totalActivos)
        : extraFijo / DISTANCIAS.length;
      costes[d] += prorrata;
    });
    costes.total += extraFijo;
  }
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

export const calculatePEGlobal = (totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch, maximos = {}, margenConfig = { tipo: "porcentaje", valor: 0 }) => {
  const fijosNetos = Math.max(costesFijos.total - totalIngresosConMerch, 0);
  const margenPorDist = {};
  DISTANCIAS.forEach(d => { margenPorDist[d] = (precioMedioDistancia[d] || 0) - (costesVarPorCorredor[d] || 0); });
  const margenActual = DISTANCIAS.reduce((s, d) => s + Math.max(margenPorDist[d], 0) * (totalInscritos[d] || 0), 0);
  const plazasLibres = {};
  DISTANCIAS.forEach(d => { const max = maximos[d] || 0; plazasLibres[d] = Math.max(max - (totalInscritos[d] || 0), 0); });
  const aforoTotal  = DISTANCIAS.reduce((s, d) => s + (maximos[d] || 0), 0);
  const plazasTotal = DISTANCIAS.reduce((s, d) => s + plazasLibres[d], 0);

  // MEJ-05: Calcular los fijos netos con margen de seguridad (mismo algoritmo, mayor objetivo)
  // Si margenConfig.valor === 0, fijosNetosConMargen === fijosNetos → comportamiento idéntico al anterior.
  const margenValor = margenConfig?.valor || 0;
  let fijosNetosConMargen;
  if (margenValor > 0) {
    if ((margenConfig?.tipo || "porcentaje") === "porcentaje") {
      // El colchón es un % del total de costes fijos
      fijosNetosConMargen = Math.max(costesFijos.total * (1 + margenValor / 100) - totalIngresosConMerch, 0);
    } else {
      // El colchón es un valor absoluto en euros
      fijosNetosConMargen = Math.max(costesFijos.total + margenValor - totalIngresosConMerch, 0);
    }
  } else {
    fijosNetosConMargen = fijosNetos;
  }

  if (fijosNetos <= 0 || margenActual >= fijosNetos) {
    // PE puro ya alcanzado — calcular si también se alcanza el PE con margen
    const peConMargenAlcanzado = margenActual >= fijosNetosConMargen;
    return {
      peGlobal: totalInscritos.total, porDistancia: { ...totalInscritos },
      margenMedio: totalInscritos.total > 0 ? margenActual / totalInscritos.total : 0,
      fijosNetos, viable: true, superaAforo: false, aforoTotal, diferencia: 0, coberturaPct: 100, inscritosNecesarios: {},
      // MEJ-05 extras:
      fijosNetosConMargen,
      peGlobalConMargen: totalInscritos.total,
      porDistanciaConMargen: { ...totalInscritos },
      peConMargenAlcanzado,
    };
  }

  let margenFaltante = fijosNetos - margenActual;
  // MEJ-05: también calcular cuánto falta para el PE con margen
  let margenFaltanteConMargen = fijosNetosConMargen - margenActual;
  const distOrdenadas = [...DISTANCIAS].filter(d => margenPorDist[d] > 0).sort((a, b) => margenPorDist[b] - margenPorDist[a]);
  const inscritosNecesarios = {};
  const inscritosNecesariosConMargen = {};
  DISTANCIAS.forEach(d => { inscritosNecesarios[d] = 0; inscritosNecesariosConMargen[d] = 0; });

  // Resolver PE puro
  const margenFaltantePuro = fijosNetos - margenActual;
  let restoPuro = margenFaltantePuro;
  for (const d of distOrdenadas) {
    if (restoPuro <= 0) break;
    const disponibles = plazasLibres[d];
    if (disponibles <= 0) continue;
    const necesarios = Math.ceil(restoPuro / margenPorDist[d]);
    const aCubrir    = Math.min(necesarios, disponibles);
    inscritosNecesarios[d] = aCubrir;
    restoPuro -= aCubrir * margenPorDist[d];
  }

  // Resolver PE con margen (solo si es diferente al PE puro)
  if (margenValor > 0) {
    let restoMargen = margenFaltanteConMargen;
    for (const d of distOrdenadas) {
      if (restoMargen <= 0) break;
      const disponibles = plazasLibres[d];
      if (disponibles <= 0) continue;
      const necesarios = Math.ceil(restoMargen / margenPorDist[d]);
      const aCubrir    = Math.min(necesarios, disponibles);
      inscritosNecesariosConMargen[d] = aCubrir;
      restoMargen -= aCubrir * margenPorDist[d];
    }
    margenFaltanteConMargen = Math.max(restoMargen, 0);
  } else {
    DISTANCIAS.forEach(d => { inscritosNecesariosConMargen[d] = inscritosNecesarios[d]; });
    margenFaltanteConMargen = Math.max(restoPuro, 0);
  }

  margenFaltante = Math.max(restoPuro, 0);

  const porDistancia = {}; let peGlobal = 0;
  DISTANCIAS.forEach(d => { porDistancia[d] = (totalInscritos[d] || 0) + inscritosNecesarios[d]; peGlobal += porDistancia[d]; });

  const porDistanciaConMargen = {}; let peGlobalConMargen = 0;
  DISTANCIAS.forEach(d => { porDistanciaConMargen[d] = (totalInscritos[d] || 0) + inscritosNecesariosConMargen[d]; peGlobalConMargen += porDistanciaConMargen[d]; });

  const viable = margenFaltante <= 0;
  const margenMedio = peGlobal > 0 ? DISTANCIAS.reduce((s, d) => s + margenPorDist[d] * porDistancia[d], 0) / peGlobal : 0;
  const diferencia = totalInscritos.total - peGlobal;
  const coberturaPct = peGlobal > 0 ? Math.min((totalInscritos.total / peGlobal) * 100, 200) : 100;
  const peConMargenAlcanzado = margenFaltanteConMargen <= 0;

  return {
    peGlobal, porDistancia, inscritosNecesarios, margenMedio, fijosNetos,
    viable, superaAforo: !viable, aforoTotal, plazasTotal, diferencia, coberturaPct,
    margenFaltante,
    // MEJ-05 extras: PE con margen de seguridad
    fijosNetosConMargen,
    peGlobalConMargen,
    porDistanciaConMargen,
    inscritosNecesariosConMargen,
    margenFaltanteConMargen,
    peConMargenAlcanzado,
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
  // ECO-03: valores por defecto deben coincidir con COSTE_DEFAULT en camisetasConstants.js
  // (fuente canónica). Si cambian allí, actualizar también estos defaults de parámetro.
  camCoste = { corredor: 8, voluntario: 7, nino: 6 },
  camPedidos = [],
  corredoresExt = {},
  precioCorrExt = 0,
  ninoExt = {},
  voluntariosActivos = [],
  // ECO-04: venta al público general. Default seguro: sin efecto cuando no hay datos.
  // Si ventaPublico = { precio:0, cantidad:0 }, el resultado es idéntico al anterior.
  ventaPublico = { precio: 0, cantidad: 0 },
} = {}) => {
  const costeCU = { corredor: camCoste.corredor || 8, voluntario: camCoste.voluntario || 7, nino: camCoste.nino || 6 };

  // Unidades por fuente
  const unidCorrExt = Object.values(corredoresExt).reduce((s, n) => s + (n || 0), 0);
  const unidNino    = Object.values(ninoExt).reduce((s, n) => s + (n || 0), 0);
  const unidVol     = voluntariosActivos.length;

  // Líneas de pedidos — se excluyen las canceladas para no inflar el coste
  const lineas = camPedidos.flatMap(p => Array.isArray(p.lineas) ? p.lineas : []);
  const extrasLineas = lineas.filter(l => l.estadoPago !== "cancelado"); // FIX BUG-ECO-03
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

  // ECO-04: venta al público general — ingresos por precio libre, coste al precio de corredor
  const cantVentaPublica    = (ventaPublico.cantidad || 0);
  const ingresoVentaPublica = cantVentaPublica * (ventaPublico.precio || 0);
  const costeVentaPublica   = cantVentaPublica * costeCU.corredor;

  const costeTotal    = costeCorredor + costeVoluntario + costeNino + costeExtras + costeVentaPublica;
  const ingresoTotal  = ingresosExterno + ingresosPedidos + ingresoVentaPublica;
  const beneficioNeto = ingresoTotal - costeTotal;

  return {
    costeCorredor, costeVoluntario, costeNino, costeExtras, costeVentaPublica,
    ingresosExterno, ingresosPedidos, ingresoVentaPublica,
    costeTotal, ingresoTotal, beneficioNeto,
    unidCorredor: unidCorrExt, unidVoluntario: unidVol, unidNino, unidExtras,
  };
};

/**
 * calculateCamisetasPresupuesto — ECO-08: desglose de camisetas en 6 categorías
 * independientes con ingreso/gasto propio y toggle propio, para sustituir el
 * antiguo modelo de un único "beneficio neto" agregado (calculateCosteCamisetasDesglosado).
 *
 * Categorías (cada una con su propia fuente de datos real del módulo Camisetas):
 *   1. corredores      — SK_CAM_CORREDORES (uds/talla) × precio plataforma. Ingreso + gasto.
 *   2. noCorredores     — SK_CAM_NO_CORREDOR (uds/talla) × precio no-corredor. Ingreso + gasto.
 *   3. ventaPublico     — SK_CAM_VENTA_PUBLICO (precio×cantidad libre). Ingreso + gasto.
 *   4. otros            — líneas de Pedidos con estadoPago pagado/pendiente, tipo activo según
 *                          fuentesExtras (corredor/voluntario/niño). Ingreso + gasto.
 *   5. voluntarios       — SOLO cálculo automático (voluntariosActivos × coste.voluntario). Solo gasto.
 *   6. regalos          — líneas de Pedidos con estadoPago='regalo', tipo activo según
 *                          fuentesExtras (corredor/voluntario/niño). Solo gasto.
 *
 * Invariante de diseño: ninguna unidad real puede contarse en dos categorías a la vez.
 * - "corredores"/"noCorredores" son EXCLUSIVAMENTE plataforma (no incluyen extras de Pedidos).
 * - "otros"/"regalos" son EXCLUSIVAMENTE extras de Pedidos, separados por estadoPago Y por tipo
 *   (AUD-CAM-04: antes solo se separaban por estadoPago; ver parámetro fuentesExtras).
 * - "voluntarios" es EXCLUSIVAMENTE el cálculo automático; los extras de Pedidos tipo
 *   "voluntario" caen en "otros" o "regalos" según su estadoPago, nunca aquí.
 *
 * @param {object} p
 * @param {object} p.camCoste        - { corredor, voluntario, nino } coste unitario de fabricación
 * @param {Array}  p.camPedidos      - Pedidos del módulo Camisetas (líneas con tipo/estadoPago)
 * @param {object} p.corredoresExt   - { XXS:n, ... } tallas de corredores vía plataforma
 * @param {number} p.precioCorrExt   - Precio de venta por corredor (plataforma)
 * @param {object} p.noCorredorExt   - { XXS:n, ... } tallas de no-corredores vía plataforma
 * @param {number} p.precioNoCorrExt - Precio de venta por no-corredor (plataforma)
 * @param {object} p.ventaPublico    - { precio, cantidad } venta al público general
 * @param {Array}  p.voluntariosActivos - Voluntarios confirmados/pendientes con talla asignada
 * @param {object} p.toggles        - { corredores, noCorredores, ventaPublico, otros, voluntarios, regalos } activo/inactivo por categoría
 * @param {object} p.fuentesExtras  - AUD-CAM-04: { extrasCorredor, extrasVoluntario, extrasNino } activo/inactivo
 *   por TIPO dentro de "otros" y "regalos". Antes estas dos categorías solo tenían el toggle agregado
 *   `toggles.otros`/`toggles.regalos` (todo o nada) y no respetaban los 3 toggles por tipo que el propio
 *   módulo Camisetas ya expone en `fuentesActivas.extrasCorredor/extrasVoluntario/extrasNino` — desactivar
 *   uno de esos 3 en el panel de Camisetas cambiaba sus KPIs internos pero Presupuesto/Dashboard seguían
 *   sumando esas mismas líneas igual. Default `{ extrasCorredor: true, extrasVoluntario: true, extrasNino: true }`
 *   para no alterar el comportamiento de llamantes que no pasen este parámetro.
 * @returns {{
 *   corredores:    {ingreso:number, gasto:number, unidades:number},
 *   noCorredores:  {ingreso:number, gasto:number, unidades:number},
 *   ventaPublico:  {ingreso:number, gasto:number, unidades:number},
 *   otros:         {ingreso:number, gasto:number, unidades:number},
 *   voluntarios:   {ingreso:number, gasto:number, unidades:number},
 *   regalos:       {ingreso:number, gasto:number, unidades:number},
 *   totalIngresos: number,
 *   totalGastos:   number,
 *   beneficioNeto: number,
 * }}
 */
export const calculateCamisetasPresupuesto = ({
  camCoste = { corredor: 8, voluntario: 7, nino: 6 },
  camPedidos = [],
  corredoresExt = {},
  precioCorrExt = 0,
  noCorredorExt = {},
  precioNoCorrExt = 0,
  ventaPublico = { precio: 0, cantidad: 0 },
  voluntariosActivos = [],
  // ECO-11: ninoExt — tallas de niño introducidas manualmente en el módulo Camisetas
  // (pestaña "Pedido al proveedor"). Antes esta fuente NUNCA llegaba al presupuesto:
  // calculateCamisetasPresupuesto no recibía este parámetro, así que cualquier pedido
  // de camisetas de niño hecho por esta vía generaba coste real al proveedor que no
  // aparecía en ningún lado del balance económico del evento.
  ninoExt = {},
  toggles = { corredores: true, noCorredores: true, ventaPublico: true, otros: true, voluntarios: true, regalos: true, nino: true },
  // AUD-CAM-04: ver doc del parámetro arriba.
  fuentesExtras = { extrasCorredor: true, extrasVoluntario: true, extrasNino: true },
} = {}) => {
  const costeCU = { corredor: camCoste.corredor || 8, voluntario: camCoste.voluntario || 7, nino: camCoste.nino || 6 };

  // ── 1. Camisetas a corredores (plataforma) ──
  const unidCorredores = Object.values(corredoresExt).reduce((s, n) => s + (n || 0), 0);
  const corredores = {
    unidades: unidCorredores,
    ingreso: toggles.corredores ? unidCorredores * (precioCorrExt || 0) : 0,
    gasto:   toggles.corredores ? unidCorredores * costeCU.corredor : 0,
  };

  // ── 2. Camisetas a no corredores (plataforma) ──
  const unidNoCorredores = Object.values(noCorredorExt).reduce((s, n) => s + (n || 0), 0);
  const noCorredores = {
    unidades: unidNoCorredores,
    ingreso: toggles.noCorredores ? unidNoCorredores * (precioNoCorrExt || 0) : 0,
    gasto:   toggles.noCorredores ? unidNoCorredores * costeCU.corredor : 0,
  };

  // ── 3. Venta al público general ──
  const unidVentaPublico = ventaPublico.cantidad || 0;
  const ventaPublicoCat = {
    unidades: unidVentaPublico,
    ingreso: toggles.ventaPublico ? unidVentaPublico * (ventaPublico.precio || 0) : 0,
    gasto:   toggles.ventaPublico ? unidVentaPublico * costeCU.corredor : 0,
  };

  // ── Líneas de Pedidos (extras), separadas por estadoPago ──
  // AUD-CAM-04 (fix Hallazgo 4): además del filtro por estadoPago, se respeta el toggle
  // por tipo (extrasCorredor/extrasVoluntario/extrasNino) que el módulo Camisetas ya
  // aplica internamente. Antes, una línea de tipo "nino" con extrasNino desactivado
  // seguía sumando en "otros"/"regalos" aquí, aunque el panel de Camisetas ya no la contara —
  // los dos módulos mostraban beneficio neto distinto para los mismos datos.
  const tipoActivo = (tipo) => {
    if (tipo === "corredor")   return fuentesExtras.extrasCorredor   !== false;
    if (tipo === "voluntario") return fuentesExtras.extrasVoluntario !== false;
    if (tipo === "nino")       return fuentesExtras.extrasNino       !== false;
    return true; // tipo desconocido: no se filtra, igual que antes
  };
  const lineas = camPedidos.flatMap(p => Array.isArray(p.lineas) ? p.lineas : []);
  const lineasVendidas = lineas.filter(l => (l.estadoPago === "pagado" || l.estadoPago === "pendiente") && tipoActivo(l.tipo));
  const lineasRegalo   = lineas.filter(l => l.estadoPago === "regalo" && tipoActivo(l.tipo));

  // ── 4. Camisetas otros (extras vendidos: pagado + pendiente, cualquier tipo) ──
  const unidOtros = lineasVendidas.reduce((s, l) => s + (l.cantidad || 0), 0);
  const otros = {
    unidades: unidOtros,
    ingreso: toggles.otros ? lineasVendidas.reduce((s, l) => s + (l.cantidad || 0) * (l.precioVenta || 0), 0) : 0,
    gasto:   toggles.otros ? lineasVendidas.reduce((s, l) => s + (l.cantidad || 0) * (costeCU[l.tipo] || costeCU.corredor), 0) : 0,
  };

  // ── 5. Camisetas voluntarios (SOLO automático, sin extras de Pedidos) ──
  const unidVoluntarios = voluntariosActivos.length;
  const voluntarios = {
    unidades: unidVoluntarios,
    ingreso: 0,
    gasto: toggles.voluntarios ? unidVoluntarios * costeCU.voluntario : 0,
  };

  // ── 6. Camisetas regalo (extras con estadoPago='regalo', cualquier tipo) ──
  const unidRegalos = lineasRegalo.reduce((s, l) => s + (l.cantidad || 0), 0);
  const regalos = {
    unidades: unidRegalos,
    ingreso: 0,
    gasto: toggles.regalos ? lineasRegalo.reduce((s, l) => s + (l.cantidad || 0) * (costeCU[l.tipo] || costeCU.corredor), 0) : 0,
  };

  // ── 7. Camisetas niño/a (manual, plataforma) — ECO-11: solo gasto, sin ingreso,
  // igual tratamiento que "voluntarios" porque no hay precio de venta asociado a
  // esta fuente (son tallas consolidadas para el pedido al proveedor, no ventas).
  const unidNino = Object.values(ninoExt).reduce((s, n) => s + (n || 0), 0);
  const nino = {
    unidades: unidNino,
    ingreso: 0,
    gasto: toggles.nino ? unidNino * costeCU.nino : 0,
  };

  const totalIngresos = corredores.ingreso + noCorredores.ingreso + ventaPublicoCat.ingreso + otros.ingreso;
  const totalGastos   = corredores.gasto + noCorredores.gasto + ventaPublicoCat.gasto + otros.gasto + voluntarios.gasto + regalos.gasto + nino.gasto;
  const beneficioNeto = totalIngresos - totalGastos;

  return {
    corredores, noCorredores, ventaPublico: ventaPublicoCat, otros, voluntarios, regalos, nino,
    totalIngresos, totalGastos, beneficioNeto,
  };
};

/**
 * calculateROI — fuente única de verdad para el KPI de ROI (ECO-05).
 *
 * Definición adoptada:
 *   ROI = (ingresosBrutos − costes) / costes × 100
 *   donde ingresosBrutos = inscripciones + patrocinios/extras activos + beneficio neto camisetas
 *
 * Esta función es intencionadamente simple (dos parámetros) para no crear acoplamiento
 * con los componentes internos de cada módulo. Cada llamante es responsable de calcular
 * correctamente su totalIngresosBrutos antes de invocarla.
 *
 * Usada por: calculateResultadoFinanciero (módulo Presupuesto) y useDashboardKpis (Dashboard).
 * Si se añaden nuevas fuentes de ingresos al P&L, solo hay que incluirlas en el
 * totalIngresosBrutos que cada llamante construye — la fórmula de ROI no cambia.
 *
 * @param {number} totalIngresosBrutos - Ingresos totales (inscripciones + extras + merch)
 * @param {number} costes              - Costes totales (fijos + variables)
 * @returns {number} ROI en puntos porcentuales, redondeado a entero. 0 si costes = 0.
 */
export const calculateROI = (totalIngresosBrutos, costes) =>
  costes > 0 ? Math.round(((totalIngresosBrutos - costes) / costes) * 100) : 0;

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
  // ECO-04: venta al público desde módulo Camisetas. Default seguro: sin efecto si no hay datos.
  camVentaPublico = { precio: 0, cantidad: 0 },
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
  // FIX-DASH-02b: syncConfig.camisetas es la fuente canónica (igual que useBudgetLogic y useDashboardKpis).
  // ie.activo puede estar desfasado respecto al toggle → usar syncConfig directamente.
  const camisetasActivo = syncConfig.camisetas ?? true;
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
      // ECO-04: venta al público propagada al cálculo de P&L
      ventaPublico: camVentaPublico,
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
  const costes    = totalCostesFijos + totalCostesVars;
  // ECO-05: usar calculateROI (fuente única de verdad) en lugar de fórmula inline.
  const roiGlobal = calculateROI(totalIngresosBrutos, costes);

  return {
    totalIngresosExtra, totalMerchBeneficio,
    totalOtrosIngresos, totalIngresosBrutos,
    resultado, roiGlobal,
    camisetasDesglose, // null si camisetas inactivo o modo legado
  };
};

// ─── MEJ-03: costes reales vs estimados desde pedidos a proveedores ────────────

/**
 * Estados de pedido que representan gasto comprometido (pedido en curso).
 * El proveedor ya tiene el encargo pero aún no se ha recibido ni facturado.
 */
export const ESTADOS_COMPROMETIDO = new Set(["confirmado"]);

/**
 * Estados de pedido que representan gasto real (materializado).
 */
export const ESTADOS_REAL = new Set(["recibido", "facturado"]);

/**
 * calcCostesRealesDesdePedidos — fuente única de verdad para costes reales vs estimados.
 *
 * Para cada concepto de presupuesto (fijo o variable), agrega los importes de
 * los artículos de pedido vinculados (via conceptoId) según su estado:
 *   - comprometido: pedido confirmado (encargado, no recibido aún)
 *   - real:         pedido recibido o facturado
 *
 * Un pedido sin conceptoId en sus artículos va al bucket "sin clasificar".
 *
 * @param {Array} pedidos   - Array de pedidos a proveedores (SK_LOG_PEDIDOS_PROV)
 * @param {Array} conceptos - Array de conceptos de presupuesto (SK_PPTO_CONCEPTOS)
 * @returns {{
 *   porConcepto: Array<{
 *     conceptoId: number,
 *     nombre: string,
 *     tipo: string,
 *     costeEstimado: number,
 *     costeComprometido: number,
 *     costeReal: number,
 *     desviacion: number,       // costeReal - costeEstimado (negativo = ahorro)
 *     pct: number|null,         // desviacion / costeEstimado * 100, null si estimado=0
 *     pedidosVinculados: Array  // pedidos que tienen al menos un artículo de este concepto
 *   }>,
 *   sinClasificar: { costeComprometido, costeReal },
 *   totales: { costeEstimado, costeComprometido, costeReal, desviacion, pct }
 * }}
 */
export function calcCostesRealesDesdePedidos(pedidos = [], conceptos = []) {
  const peds   = Array.isArray(pedidos)   ? pedidos   : [];
  const concs  = Array.isArray(conceptos) ? conceptos : [];

  // Acumuladores por conceptoId
  const acum = {}; // conceptoId → { comprometido, real, pedidosIds: Set }
  let sinClaComprometido = 0;
  let sinClaReal         = 0;

  for (const pedido of peds) {
    const esComprometido = ESTADOS_COMPROMETIDO.has(pedido.estado);
    const esReal         = ESTADOS_REAL.has(pedido.estado);
    if (!esComprometido && !esReal) continue;

    const articulos = Array.isArray(pedido.articulos) ? pedido.articulos : [];

    // Si el pedido no tiene artículos con conceptoId, usar importeTotal como sin clasificar
    const tieneConceptos = articulos.some(a => a.conceptoId != null);
    if (!tieneConceptos) {
      const imp = pedido.importeTotal || 0;
      if (esComprometido) sinClaComprometido += imp;
      if (esReal)         sinClaReal         += imp;
      continue;
    }

    for (const art of articulos) {
      if (art.conceptoId == null) continue;
      const imp = art.esFijo
        ? (art.costeTotal || 0)
        : (art.cantidad || 0) * (art.precioUnit || 0);

      if (!acum[art.conceptoId]) {
        acum[art.conceptoId] = { comprometido: 0, real: 0, pedidosIds: new Set() };
      }
      if (esComprometido) acum[art.conceptoId].comprometido += imp;
      if (esReal)         acum[art.conceptoId].real         += imp;
      acum[art.conceptoId].pedidosIds.add(pedido.id);
    }
  }

  // Construir porConcepto para todos los conceptos activos
  const porConcepto = concs
    .filter(c => c.activo !== false)
    .map(c => {
      const a               = acum[c.id] || { comprometido: 0, real: 0, pedidosIds: new Set() };
      const costeEstimado   = c.costeTotal || 0;
      const costeComprometido = a.comprometido;
      const costeReal       = a.real;
      const desviacion      = costeReal - costeEstimado;
      const pct             = costeEstimado > 0
        ? Math.round((desviacion / costeEstimado) * 100)
        : null;
      return {
        conceptoId:         c.id,
        nombre:             c.nombre,
        tipo:               c.tipo,
        costeEstimado,
        costeComprometido,
        costeReal,
        desviacion,
        pct,
        pedidosVinculados:  [...(a.pedidosIds || new Set())],
      };
    });

  // Totales globales (solo conceptos activos)
  const totEstimado      = porConcepto.reduce((s, r) => s + r.costeEstimado,    0);
  const totComprometido  = porConcepto.reduce((s, r) => s + r.costeComprometido, 0) + sinClaComprometido;
  const totReal          = porConcepto.reduce((s, r) => s + r.costeReal,         0) + sinClaReal;
  const totDesviacion    = totReal - totEstimado;
  const totPct           = totEstimado > 0
    ? Math.round((totDesviacion / totEstimado) * 100)
    : null;

  return {
    porConcepto,
    sinClasificar: { costeComprometido: sinClaComprometido, costeReal: sinClaReal },
    totales: {
      costeEstimado:      totEstimado,
      costeComprometido:  totComprometido,
      costeReal:          totReal,
      desviacion:         totDesviacion,
      pct:                totPct,
    },
  };
}
