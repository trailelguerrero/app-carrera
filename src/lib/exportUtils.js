/**
 * exportUtils.js — Utilidades de exportación a Excel
 * Usa ExcelJS en lugar de SheetJS/xlsx para evitar CVE HIGH conocidos
 * (GHSA-4r6h-8v6p-xvw6 Prototype Pollution, GHSA-5pgg-2g8v-p4x9 ReDoS).
 *
 * NEW-02 fix: ExcelJS se carga con import() dinámico para evitar incluirlo
 * en el bundle inicial (~800 KB). Solo se descarga cuando el usuario exporta.
 *
 * Todas las funciones son async porque ExcelJS usa una API basada en Promises.
 *
 * Funciones exportadas:
 *   filaVoluntarioExport(v, puestos)                       → objeto (pura, testeable)
 *   exportarVoluntarios(voluntarios, puestos)              → async
 *   exportarPatrocinadores(pats)                           → async
 *   exportarMaterial(material, asigs, locs, modo, puestos, voluntarios) → async
 *     modo: "completo" (default) | "alertas" | "pendiente"
 *     puestos/voluntarios (opcionales): permiten resolver el destino real
 *     de cada asignación (puesto concreto o voluntario concreto) en la
 *     hoja de detalle, en vez de solo la ubicación maestra.
 */
import { resolverDestinoAsignacion } from '@/components/logistica/logisticaHelpers';
import { ESTADOS } from '@/constants/voluntariosConstants';
import {
  calcPedido, estadoCombinado, TC, EP, EE, TALLAS, TALLAS_NINO, COSTE_DEFAULT,
} from '@/components/camisetas/camisetasConstants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Añade una hoja a partir de un array de objetos planos.
 * La primera fila del array define las columnas (headers).
 */
function addSheet(workbook, sheetName, data = []) {
  const ws = workbook.addWorksheet(sheetName);
  if (data.length === 0) return ws;

  const headers = Object.keys(data[0]);
  ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(h.length + 2, 14) }));

  // Negrita en la fila de cabecera
  ws.getRow(1).font = { bold: true };

  data.forEach((row) => ws.addRow(row));
  return ws;
}

/**
 * Genera el buffer del workbook y lo descarga como archivo .xlsx en el navegador.
 */
async function downloadWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  window.dispatchEvent(
    new CustomEvent('teg-toast', {
      detail: { id: Date.now(), type: 'success', message: 'Excel exportado correctamente', duration: 3000 },
    })
  );
}

// ─── Voluntarios ──────────────────────────────────────────────────────────────

const ROLES_LABEL = { apoyo: 'Apoyo', responsable: 'Responsable' };

/** Etiqueta legible del estado; cae al valor crudo si no está en el mapa. */
function estadoLabel(e) {
  return ESTADOS[e] || (e ? e.charAt(0).toUpperCase() + e.slice(1) : '');
}

/**
 * resolverPuestoVol — Único criterio de resolución puesto↔voluntario.
 * VOL-40: el export usaba `p.id === v.puestoId` (===  estricto) mientras el
 * resto de la app compara con String() coercion. Como puestoId es
 * union(string|number) y los puestos importados/creados pueden tener id de
 * distinto tipo, algunos voluntarios mostraban '—' en el Excel pese a tener
 * puesto asignado en la UI. Se unifica con String() como en Día D / Reasignar.
 */
export function resolverPuestoVol(v, puestos = []) {
  if (v == null || v.puestoId == null) return null;
  return puestos.find((p) => String(p.id) === String(v.puestoId)) || null;
}

/** Edad en años a partir de una fecha ISO (YYYY-MM-DD). '' si no válida. */
export function edadDesde(fechaNacimiento, hoy = new Date()) {
  if (!fechaNacimiento) return '';
  const nac = new Date(fechaNacimiento);
  if (Number.isNaN(nac.getTime())) return '';
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad >= 0 && edad < 120 ? edad : '';
}

/** Horario legible del puesto ("06:30–18:00") o '' si falta. */
function horarioPuesto(p) {
  if (!p) return '';
  if (p.horaInicio && p.horaFin) return `${p.horaInicio}–${p.horaFin}`;
  return p.horaInicio || p.horaFin || '';
}

/**
 * filaVoluntarioExport — Fila de export Excel para un voluntario (listado general).
 * VOL-35: Apellidos como columna propia (antes se perdía).
 * VOL-40: puesto resuelto con resolverPuestoVol (String coercion).
 * Sin datos médicos: alergias/medicación van solo a la hoja "Emergencias Día D".
 */
export function filaVoluntarioExport(v, puestos = []) {
  const p = resolverPuestoVol(v, puestos);
  return {
    Nombre:             v.nombre || '',
    Apellidos:          v.apellidos || '',
    Teléfono:           v.telefono || '',
    Email:              v.email || '',
    Grupo:              v.grupoNombre || '',
    Puesto:             p?.nombre || '—',
    'Tipo puesto':      p?.tipo || '',
    Distancias:         Array.isArray(p?.distancias) ? p.distancias.join(', ') : (p?.distancias || ''),
    Horario:            horarioPuesto(p),
    Rol:                ROLES_LABEL[v.rol] || v.rol || '',
    Estado:             estadoLabel(v.estado),
    Talla:              v.talla || '',
    'Camiseta entregada': v.camisetaEntregada ? 'Sí' : 'No',
    Coche:              v.coche ? 'Sí' : 'No',
    Matrícula:          v.cocheMatricula || '',
    'Plazas coche':     v.coche ? (v.cochePlazas || '') : '',
    'Tel. emergencia':  v.telefonoEmergencia || v.contactoEmergencia || '',
    'Fecha nacimiento': v.fechaNacimiento || '',
    Edad:               edadDesde(v.fechaNacimiento),
    'Fecha registro':   v.fechaRegistro || '',
    'En puesto (Día D)': v.enPuesto ? 'Sí' : 'No',
    'Hora llegada':     v.horaLlegada || '',
    Notas:              v.notas || '',
  };
}

/**
 * resumenVoluntarios — Filas de la hoja "Resumen": conteos por estado, por
 * talla (alimenta el pedido de Camisetas) y por puesto. Tabla plana y uniforme
 * para poder filtrar/pivotar en Excel.
 */
export function resumenVoluntarios(voluntarios = [], puestos = []) {
  const filas = [];
  const activos = voluntarios.filter((v) => v.estado !== 'cancelado');

  filas.push({ Categoría: 'Total', Detalle: 'Voluntarios (sin cancelados)', Total: activos.length });
  filas.push({ Categoría: 'Total', Detalle: 'Cancelados', Total: voluntarios.length - activos.length });

  // Por estado (sobre el total, para no ocultar cancelados en el resumen)
  const porEstado = {};
  voluntarios.forEach((v) => { const e = v.estado || 'pendiente'; porEstado[e] = (porEstado[e] || 0) + 1; });
  Object.keys(ESTADOS).forEach((e) => {
    if (porEstado[e]) filas.push({ Categoría: 'Estado', Detalle: estadoLabel(e), Total: porEstado[e] });
  });

  // Por talla (solo activos → refleja el pedido real de camisetas)
  const porTalla = {};
  activos.forEach((v) => { const t = v.talla || 'sin talla'; porTalla[t] = (porTalla[t] || 0) + 1; });
  Object.entries(porTalla)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, n]) => filas.push({ Categoría: 'Talla', Detalle: t, Total: n }));

  // Por puesto (asignados / confirmados / necesarios)
  puestos.forEach((p) => {
    const asignados = activos.filter((v) => String(v.puestoId) === String(p.id));
    if (asignados.length === 0 && !p.necesarios) return;
    const conf = asignados.filter((v) => v.estado === 'confirmado').length;
    const nec = p.necesarios != null ? ` / ${p.necesarios} nec.` : '';
    filas.push({ Categoría: 'Puesto', Detalle: p.nombre || `#${p.id}`, Total: `${asignados.length} asig. (${conf} conf.)${nec}` });
  });

  const sinPuesto = activos.filter((v) => !resolverPuestoVol(v, puestos)).length;
  if (sinPuesto) filas.push({ Categoría: 'Puesto', Detalle: 'Sin asignar', Total: sinPuesto });

  return filas;
}

/**
 * filaEmergenciaExport — Fila de la hoja restringida "Emergencias Día D".
 * Contiene datos sensibles (alergias/medicación) — se aísla en su propia hoja
 * y no se mezcla con el listado general para no filtrarla en cada export.
 */
export function filaEmergenciaExport(v, puestos = []) {
  const p = resolverPuestoVol(v, puestos);
  return {
    Voluntario:        [v.nombre, v.apellidos].filter(Boolean).join(' ').trim(),
    Teléfono:          v.telefono || '',
    'Tel. emergencia': v.telefonoEmergencia || v.contactoEmergencia || '',
    Alergias:          v.alergias || '',
    Medicación:        v.medicacion || '',
    Puesto:            p?.nombre || '—',
    Horario:           horarioPuesto(p),
    'En puesto':       v.enPuesto ? 'Sí' : 'No',
    'Hora llegada':    v.horaLlegada || '',
  };
}

/** Aplica cabecera fija + autofiltro a una hoja con datos. */
function conFiltroYFijado(ws) {
  if (!ws || ws.rowCount < 1 || ws.columnCount < 1) return;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const lastCol = ws.getRow(1).cellCount;
  const colLetter = ws.getColumn(lastCol).letter;
  ws.autoFilter = `A1:${colLetter}1`;
}

export async function exportarVoluntarios(voluntarios = [], puestos = []) {
  const { default: ExcelJS } = await import('exceljs');

  const activos = voluntarios.filter((v) => v.estado !== 'cancelado');
  const data = activos.map((v) => filaVoluntarioExport(v, puestos));

  const wb = new ExcelJS.Workbook();

  // Hoja 1 — Resumen (conteos por estado / talla / puesto)
  addSheet(wb, 'Resumen', resumenVoluntarios(voluntarios, puestos));

  // Hoja 2 — Listado general (sin datos médicos)
  const wsVol = addSheet(wb, 'Voluntarios', data);
  conFiltroYFijado(wsVol);

  // Color de fila por estado, igual patrón que el export de Material (MEJ-05)
  const FILL_ESTADO = {
    confirmado: 'FFDCFCE7', // verde claro
    pendiente:  'FFFEF9C3', // amarillo claro
    dudoso:     'FFEDE9FE', // violeta claro
    ausente:    'FFFFEDD5', // naranja claro
  };
  activos.forEach((v, idx) => {
    const argb = FILL_ESTADO[v.estado];
    if (!argb) return;
    wsVol.getRow(idx + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  });

  // Hoja 3 — Emergencias Día D (datos sensibles aislados)
  const emergData = activos.map((v) => filaEmergenciaExport(v, puestos));
  if (emergData.length > 0) {
    const wsEmerg = addSheet(wb, 'Emergencias Día D', emergData);
    conFiltroYFijado(wsEmerg);
  }

  const hoy = new Date().toISOString().split('T')[0];
  await downloadWorkbook(wb, `voluntarios-trail-guerrero-${hoy}.xlsx`);
}

// ─── Patrocinadores ───────────────────────────────────────────────────────────

export async function exportarPatrocinadores(pats = []) {
  const { default: ExcelJS } = await import('exceljs');

  const data = pats.map((p) => ({
    Nombre:               p.nombre || '',
    Nivel:                p.nivel || '',
    Sector:               p.sector || '',
    Estado:               p.estado || '',
    Contacto:             p.contacto || '',
    Teléfono:             p.telefono || '',
    Email:                p.email || '',
    'Importe (€)':        p.importe || 0,
    'Cobrado (€)':        p.importeCobrado || 0,
    'Fecha acuerdo':      p.fechaAcuerdo || '',
    'Fecha vencimiento':  p.fechaVencimiento || '',
    'Próx. seguimiento':  p.proximoContacto || '',
    Notas:                p.notas || '',
    Contraprestaciones:   (p.contraprestaciones || []).length,
    Entregadas:           (p.contraprestaciones || []).filter((c) => c.estado === 'entregado').length,
    'Pend. entrega':      (p.contraprestaciones || []).filter((c) => c.estado === 'pendiente').length,
  }));

  // Segunda hoja: detalle de contraprestaciones
  const contData = [];
  pats.forEach((p) => {
    (p.contraprestaciones || []).forEach((c) => {
      contData.push({
        Patrocinador:    p.nombre || '',
        Nivel:           p.nivel || '',
        Tipo:            c.tipo || '',
        Detalle:         c.detalle || '',
        Estado:          c.estado || '',
        'Fecha entrega': c.fechaEntrega || '',
      });
    });
  });

  // MEJ-09: Tercera hoja — detalle de ítems en especie
  const especieData = [];
  pats.forEach((p) => {
    (p.especieItems || []).forEach((i) => {
      especieData.push({
        Patrocinador:       p.nombre || '',
        Nivel:              p.nivel || '',
        'Nombre ítem':      i.nombre || '',
        Cantidad:           i.cantidad || 0,
        Unidad:             i.unidad || '',
        'Valor unit. (€)':  i.valorUnitario || 0,
        'Total (€)':        ((i.valorUnitario || 0) * (i.cantidad || 0)),
        Recibido:           i.recibido ? 'Sí' : 'No',
      });
    });
  });

  // MEJ-09: Cuarta hoja — historial unificado (cambios de estado + contactos manuales)
  const historialData = [];
  pats.forEach((p) => {
    (p.historial || []).forEach((e) => {
      historialData.push({
        Patrocinador:      p.nombre || '',
        Fecha:             e.fecha ? new Date(e.fecha).toLocaleString('es-ES') : '',
        Tipo:              e.tipo || '',
        Descripción:       e.texto || '',
        'Estado anterior': e.antes || '',
        'Estado nuevo':    e.despues || '',
        'Tipo contacto':   e.tipoContacto || '',
      });
    });
  });

  const wb = new ExcelJS.Workbook();
  addSheet(wb, 'Patrocinadores', data);
  if (contData.length > 0)     addSheet(wb, 'Contraprestaciones', contData);
  if (especieData.length > 0)  addSheet(wb, 'EspecieItems', especieData);
  if (historialData.length > 0) addSheet(wb, 'Historial', historialData);
  await downloadWorkbook(wb, 'patrocinadores-trail-guerrero-2026.xlsx');
}

// ─── Material de Logística ────────────────────────────────────────────────────

/**
 * Calcula el estado de entrega predominante para un material dado sus asignaciones.
 * Devuelve el estado más frecuente entre sus asignaciones, o "sin asignar" si no tiene.
 */
export function calcularEstadoEntrega(materialId, asigs = []) {
  const propias = asigs.filter((a) => String(a.materialId) === String(materialId));
  if (propias.length === 0) return 'sin asignar';

  const conteo = {};
  propias.forEach((a) => {
    const estado = a.estado || 'pendiente';
    conteo[estado] = (conteo[estado] || 0) + 1;
  });

  return Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Determina si un material tiene alerta activa (déficit o stock bajo mínimo).
 * Usado para filtrar en modo "alertas".
 */
export function tieneAlertaMaterial(m, asigTotal) {
  const disponible = (m.stock || 0) - asigTotal;
  const bajoMinimo = (m.stockMinimo || 0) > 0 && (m.stock || 0) < (m.stockMinimo || 0);
  return disponible < 0 || bajoMinimo;
}

/**
 * Exporta el inventario de material a Excel.
 *
 * @param {Array}  material  - Array de objetos de material
 * @param {Array}  asigs     - Array de asignaciones
 * @param {Array}  locs      - Array de localizaciones
 * @param {string} modo      - "completo" (default) | "alertas" | "pendiente"
 *   · "completo":  exporta todo el inventario (comportamiento anterior)
 *   · "alertas":   solo materiales con déficit (disponible < 0) o bajo mínimo
 *   · "pendiente": solo materiales con alguna asignación en estado "pendiente" o "en tránsito"
 */
export async function exportarMaterial(material = [], asigs = [], locs = [], modo = 'completo', puestos = [], voluntarios = []) {
  const { default: ExcelJS } = await import('exceljs');

  // ── Construir filas enriquecidas ──────────────────────────────────────────
  const filas = material.map((m) => {
    const asigTotal = asigs
      .filter((a) => String(a.materialId) === String(m.id))
      .reduce((s, a) => s + (a.cantidad || 0), 0);
    const locNombre = locs.find((l) => l.id === m.localizacionId)?.nombre || '';
    const estadoEntrega = calcularEstadoEntrega(m.id, asigs);
    const disponible = (m.stock || 0) - asigTotal;
    const alerta = tieneAlertaMaterial(m, asigTotal);
    const bajoMinimo = (m.stockMinimo || 0) > 0 && (m.stock || 0) < (m.stockMinimo || 0);

    return {
      _alerta: alerta,           // campo interno, no se exporta como columna
      _bajoMinimo: bajoMinimo,   // campo interno
      _estadoEntrega: estadoEntrega,
      _asigTotal: asigTotal,
      Nombre:              m.nombre || '',
      Categoría:           m.categoria || '',
      'Stock total':       m.stock || 0,
      Asignado:            asigTotal,
      Disponible:          disponible,
      'Stock mínimo':      m.stockMinimo || 0,
      'Estado entrega':    estadoEntrega,
      Unidad:              m.unidad || '',
      Localización:        locNombre,
      Proveedor:           m.proveedor || '',
      Notas:               m.notas || '',
    };
  });

  // ── Filtrar según modo ────────────────────────────────────────────────────
  let filasFiltradas;
  if (modo === 'alertas') {
    filasFiltradas = filas.filter((f) => f._alerta);
  } else if (modo === 'pendiente') {
    const idConPendiente = new Set(
      asigs
        .filter((a) => a.estado === 'pendiente' || a.estado === 'en tránsito')
        .map((a) => String(a.materialId))
    );
    filasFiltradas = filas.filter((f) => {
      const mat = material.find((m) => m.id != null &&
        idConPendiente.has(String(m.id)) &&
        filas.find((ff) => ff.Nombre === m.nombre) === f
      );
      // Buscar por nombre para evitar complicar la lógica
      const matMatch = material.find((m) => m.nombre === f.Nombre);
      return matMatch ? idConPendiente.has(String(matMatch.id)) : false;
    });
  } else {
    // "completo" — comportamiento original
    filasFiltradas = filas;
  }

  // ── Limpiar campos internos para exportar ────────────────────────────────
  const data = filasFiltradas.map(({ _alerta, _bajoMinimo, _estadoEntrega, _asigTotal, ...rest }) => rest);

  // ── Segunda hoja: asignaciones detalladas ────────────────────────────────
  // En modo alertas/pendiente, filtrar asignaciones correspondientes a los materiales incluidos
  const nombresIncluidos = new Set(data.map((d) => d.Nombre));
  const asigsFiltradas = asigs.filter((a) => {
    const mat = material.find((m) => String(m.id) === String(a.materialId));
    return !mat || nombresIncluidos.has(mat.nombre);
  });

  const asigData = asigsFiltradas.map((a) => {
    const mat = material.find((m) => String(m.id) === String(a.materialId));
    const destino = resolverDestinoAsignacion(a, { puestos, voluntarios, locs });
    return {
      Material:        mat?.nombre || a.materialId,
      Cantidad:        a.cantidad || 0,
      Unidad:          mat?.unidad || '',
      'Tipo destino':  destino.tipo === 'voluntario' ? 'Voluntario' : destino.tipo === 'puesto' ? 'Puesto' : 'Sin resolver',
      Destino:         destino.nombre,
      'Estado entrega': a.estado || 'pendiente',
      'Necesita revisión': destino.necesitaRevision ? 'Sí' : '',
      Notas:           a.notas || '',
    };
  });

  // ── Construir workbook ───────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  const ws = addSheet(wb, 'Material', data);

  // MEJ-05 Mejora C — Colorear filas con déficit o bajo mínimo
  if (data.length > 0) {
    filasFiltradas.forEach((fila, idx) => {
      const excelRow = ws.getRow(idx + 2); // +2: fila 1 = header, datos desde fila 2
      if (fila._alerta && (fila._asigTotal > 0 || (fila['Disponible'] < 0))) {
        // Déficit real (disponible < 0) → rojo claro
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        };
      } else if (fila._bajoMinimo) {
        // Bajo mínimo pero sin déficit formal → amarillo claro
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF9C3' },
        };
      }
    });
  }

  if (asigData.length > 0) addSheet(wb, 'Asignaciones', asigData);

  const sufijo = modo !== 'completo' ? `-${modo}` : '';
  await downloadWorkbook(wb, `material-logistica-trail-guerrero-2026${sufijo}.xlsx`);
}
// ─── Camisetas ────────────────────────────────────────────────────────────────

const tipoLabelCam    = (t) => TC[t]?.label || t || '';
const pagoLabelCam    = (e) => EP[e || 'pendiente']?.label || e || '';
const entregaLabelCam = (e) => EE[e || 'pendiente']?.label || e || '';

/** Tallas válidas para un tipo (niño usa su propia escala). */
function tallasDeTipo(tipo) {
  return tipo === 'nino' ? TALLAS_NINO : TALLAS;
}

/**
 * resumenCamisetas — Filas de la hoja "Resumen": unidades por tipo, por estado
 * de pago y de entrega, más el bloque económico (venta / coste / beneficio /
 * coste de regalos). Tabla plana y uniforme para pivotar.
 */
export function resumenCamisetas(pedidos = [], coste = COSTE_DEFAULT) {
  const lineas = pedidos.flatMap((p) => p.lineas || []);
  const filas = [];
  const uds = (arr) => arr.reduce((s, l) => s + (l.cantidad || 0), 0);

  filas.push({ Categoría: 'Total', Detalle: 'Pedidos (personas)', Total: pedidos.length });
  filas.push({ Categoría: 'Total', Detalle: 'Unidades', Total: uds(lineas) });

  // Por tipo
  ['corredor', 'voluntario', 'nino'].forEach((t) => {
    const n = uds(lineas.filter((l) => l.tipo === t));
    if (n) filas.push({ Categoría: 'Tipo', Detalle: tipoLabelCam(t), Total: n });
  });

  // Por estado de pago
  ['pendiente', 'pagado', 'regalo'].forEach((e) => {
    const n = uds(lineas.filter((l) => (l.estadoPago || 'pendiente') === e));
    if (n) filas.push({ Categoría: 'Pago', Detalle: pagoLabelCam(e), Total: n });
  });

  // Por estado de entrega
  ['pendiente', 'entregado'].forEach((e) => {
    const n = uds(lineas.filter((l) => (l.estadoEntrega || 'pendiente') === e));
    if (n) filas.push({ Categoría: 'Entrega', Detalle: entregaLabelCam(e), Total: n });
  });

  // Económico (agregado — el detalle por línea NO lleva importes por decisión de producto)
  const agg = pedidos.reduce((acc, p) => {
    const c = calcPedido(p, coste);
    acc.venta += c.totalVenta; acc.coste += c.totalCoste;
    acc.beneficio += c.beneficio; acc.regalos += c.costeRegalos;
    return acc;
  }, { venta: 0, coste: 0, beneficio: 0, regalos: 0 });
  filas.push({ Categoría: 'Económico', Detalle: 'Venta (€)',           Total: Number(agg.venta.toFixed(2)) });
  filas.push({ Categoría: 'Económico', Detalle: 'Coste (€)',           Total: Number(agg.coste.toFixed(2)) });
  filas.push({ Categoría: 'Económico', Detalle: 'Beneficio (€)',       Total: Number(agg.beneficio.toFixed(2)) });
  filas.push({ Categoría: 'Económico', Detalle: 'Coste regalos (€)',   Total: Number(agg.regalos.toFixed(2)) });

  return filas;
}

/** Fila por persona (vista humana; dinero agregado a nivel pedido). */
export function filaPedidoCamiseta(p, coste = COSTE_DEFAULT) {
  const c = calcPedido(p, coste);
  const todoEntregado = (p.lineas || []).length > 0 &&
    (p.lineas || []).every((l) => (l.estadoEntrega || 'pendiente') === 'entregado');
  return {
    Nombre:            p.nombre || '',
    Teléfono:          p.telefono || '',
    Email:             p.email || '',
    Líneas:            (p.lineas || []).length,
    Unidades:          c.totalUnid,
    'Venta (€)':       Number(c.totalVenta.toFixed(2)),
    'Coste (€)':       Number(c.totalCoste.toFixed(2)),
    'Beneficio (€)':   Number(c.beneficio.toFixed(2)),
    'Estado pago':     estadoCombinado(p.lineas || []).label,
    'Estado entrega':  todoEntregado ? 'Entregado' : 'Pendiente',
    Notas:             (p.notas || '').replace(/\n/g, ' '),
  };
}

/**
 * filasLineasCamiseta — 1 fila por PRENDA (línea). Resuelve el caso de personas
 * con varias camisetas/tallas: tabla pivotable por talla/tipo/estado.
 * SIN importes por decisión de producto (operativa, no financiera).
 */
export function filasLineasCamiseta(pedidos = []) {
  const filas = [];
  pedidos.forEach((p) => {
    (p.lineas || []).forEach((l) => {
      filas.push({
        Persona:          p.nombre || '',
        Teléfono:         p.telefono || '',
        Tipo:             tipoLabelCam(l.tipo),
        Talla:            l.talla || '',
        Cantidad:         l.cantidad || 0,
        'Estado pago':    pagoLabelCam(l.estadoPago),
        'Estado entrega': entregaLabelCam(l.estadoEntrega),
      });
    });
  });
  return filas;
}

/** Consolidado tipo×talla de los extras: unidades totales / pendientes / entregadas. */
export function consolidadoTallasCamiseta(pedidos = []) {
  const lineas = pedidos.flatMap((p) => p.lineas || []);
  const filas = [];
  ['corredor', 'voluntario', 'nino'].forEach((tipo) => {
    tallasDeTipo(tipo).forEach((talla) => {
      const props = lineas.filter((l) => l.tipo === tipo && l.talla === talla);
      const total = props.reduce((s, l) => s + (l.cantidad || 0), 0);
      if (total <= 0) return;
      const entregadas = props
        .filter((l) => (l.estadoEntrega || 'pendiente') === 'entregado')
        .reduce((s, l) => s + (l.cantidad || 0), 0);
      filas.push({
        Tipo:        tipoLabelCam(tipo),
        Talla:       talla,
        Unidades:    total,
        Entregadas:  entregadas,
        Pendientes:  total - entregadas,
      });
    });
  });
  return filas;
}

/** Pick-list de entrega Día D: 1 fila por prenda, ordenado por persona. */
export function filasEntregaCamiseta(pedidos = []) {
  return [...pedidos]
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'))
    .flatMap((p) =>
      (p.lineas || []).map((l) => ({
        Persona:    p.nombre || '',
        Teléfono:   p.telefono || '',
        Tipo:       tipoLabelCam(l.tipo),
        Talla:      l.talla || '',
        Cantidad:   l.cantidad || 0,
        Entregado:  (l.estadoEntrega || 'pendiente') === 'entregado' ? 'Sí' : 'No',
      }))
    );
}

/**
 * exportarCamisetas — Workbook completo de camisetas extra/familiares.
 * Sustituye al CSV plano que colapsaba todas las tallas de una persona en una
 * sola celda de texto (no pivotable).
 */
export async function exportarCamisetas(pedidos = [], coste = COSTE_DEFAULT) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();

  addSheet(wb, 'Resumen', resumenCamisetas(pedidos, coste));

  const wsPed = addSheet(wb, 'Pedidos', pedidos.map((p) => filaPedidoCamiseta(p, coste)));
  conFiltroYFijado(wsPed);

  const wsLin = addSheet(wb, 'Líneas', filasLineasCamiseta(pedidos));
  conFiltroYFijado(wsLin);

  const consol = consolidadoTallasCamiseta(pedidos);
  if (consol.length > 0) conFiltroYFijado(addSheet(wb, 'Por talla', consol));

  const entrega = filasEntregaCamiseta(pedidos);
  if (entrega.length > 0) {
    const wsEnt = addSheet(wb, 'Entrega Día D', entrega);
    conFiltroYFijado(wsEnt);
    // Verde para prendas ya entregadas
    entrega.forEach((fila, idx) => {
      if (fila.Entregado === 'Sí') {
        wsEnt.getRow(idx + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      }
    });
  }

  const hoy = new Date().toISOString().split('T')[0];
  await downloadWorkbook(wb, `camisetas-extra-trail-guerrero-${hoy}.xlsx`);
}
