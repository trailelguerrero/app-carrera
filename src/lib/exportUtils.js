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
 *   exportarVoluntarios(voluntarios, puestos)              → async
 *   exportarPatrocinadores(pats)                           → async
 *   exportarMaterial(material, asigs, locs, modo, puestos, voluntarios) → async
 *     modo: "completo" (default) | "alertas" | "pendiente"
 *     puestos/voluntarios (opcionales): permiten resolver el destino real
 *     de cada asignación (puesto concreto o voluntario concreto) en la
 *     hoja de detalle, en vez de solo la ubicación maestra.
 */
import { resolverDestinoAsignacion } from '@/components/logistica/logisticaHelpers';

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

export async function exportarVoluntarios(voluntarios = [], puestos = []) {
  const { default: ExcelJS } = await import('exceljs');

  const activos = voluntarios.filter((v) => v.estado !== 'cancelado');
  const data = activos.map((v) => ({
    Nombre:             v.nombre || '',
    Teléfono:           v.telefono || '',
    Email:              v.email || '',
    Puesto:             puestos.find((p) => p.id === v.puestoId)?.nombre || '—',
    Rol:                v.rol || '',
    Estado:             v.estado || '',
    Talla:              v.talla || '',
    Coche:              v.coche ? 'Sí' : 'No',
    'Tel. emergencia':  v.telefonoEmergencia || v.contactoEmergencia || '',
    'Fecha nacimiento': v.fechaNacimiento || '',
    'Fecha registro':   v.fechaRegistro || '',
    Notas:              v.notas || '',
  }));

  const wb = new ExcelJS.Workbook();
  addSheet(wb, 'Voluntarios', data);
  await downloadWorkbook(wb, 'voluntarios-trail-guerrero-2026.xlsx');
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
