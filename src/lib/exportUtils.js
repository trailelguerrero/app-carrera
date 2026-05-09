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
 *   exportarVoluntarios(voluntarios, puestos)   → async
 *   exportarPatrocinadores(pats)                → async
 *   exportarMaterial(material, asigs, locs)     → async
 */

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

  const wb = new ExcelJS.Workbook();
  addSheet(wb, 'Patrocinadores', data);
  if (contData.length > 0) addSheet(wb, 'Contraprestaciones', contData);
  await downloadWorkbook(wb, 'patrocinadores-trail-guerrero-2026.xlsx');
}

// ─── Material de Logística ────────────────────────────────────────────────────

export async function exportarMaterial(material = [], asigs = [], locs = []) {
  const { default: ExcelJS } = await import('exceljs');

  const data = material.map((m) => {
    const asigTotal = asigs
      .filter((a) => String(a.materialId) === String(m.id))
      .reduce((s, a) => s + (a.cantidad || 0), 0);
    const locNombre = locs.find((l) => l.id === m.localizacionId)?.nombre || '';
    return {
      Nombre:         m.nombre || '',
      Categoría:      m.categoria || '',
      'Stock total':  m.stock || 0,
      Asignado:       asigTotal,
      Disponible:     (m.stock || 0) - asigTotal,
      'Stock mínimo': m.stockMinimo || 0,
      Unidad:         m.unidad || '',
      Localización:   locNombre,
      Proveedor:      m.proveedor || '',
      Notas:          m.notas || '',
    };
  });

  // Segunda hoja: asignaciones detalladas
  const asigData = asigs.map((a) => {
    const mat = material.find((m) => String(m.id) === String(a.materialId));
    const loc = locs.find((l) => l.id === a.locId);
    return {
      Material:     mat?.nombre || a.materialId,
      Cantidad:     a.cantidad || 0,
      Unidad:       mat?.unidad || '',
      Localización: loc?.nombre || a.locId || '',
      Notas:        a.notas || '',
    };
  });

  const wb = new ExcelJS.Workbook();
  addSheet(wb, 'Material', data);
  if (asigData.length > 0) addSheet(wb, 'Asignaciones', asigData);
  await downloadWorkbook(wb, 'material-logistica-trail-guerrero-2026.xlsx');
}
