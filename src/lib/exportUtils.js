/**
 * exportUtils.js — Utilidades de exportación a Excel
 * Usa la librería xlsx (SheetJS) para generar archivos .xlsx en cliente.
 *
 * Funciones exportadas:
 *   exportarVoluntarios(voluntarios, puestos)
 *   exportarPatrocinadores(pats)
 *   exportarMaterial(material, asigs, locs)
 */
import * as XLSX from 'xlsx';

const wb = () => XLSX.utils.book_new();

const writeFile = (workbook, filename) => {
  XLSX.writeFile(workbook, filename);
  window.dispatchEvent(new CustomEvent("teg-toast", { detail: { id: Date.now(), type: "success", message: "Excel exportado correctamente", duration: 3000 } }));
};

const sheet = (data) => XLSX.utils.json_to_sheet(data);

// ─── Voluntarios ─────────────────────────────────────────────────────────────
export function exportarVoluntarios(voluntarios = [], puestos = []) {
  const activos = voluntarios.filter(v => v.estado !== 'cancelado');
  const data = activos.map(v => ({
    'Nombre':              v.nombre || '',
    'Teléfono':            v.telefono || '',
    'Email':               v.email || '',
    'Puesto':              puestos.find(p => p.id === v.puestoId)?.nombre || '—',
    'Rol':                 v.rol || '',
    'Estado':              v.estado || '',
    'Talla':               v.talla || '',
    'Coche':               v.coche ? 'Sí' : 'No',
    'Tel. emergencia':     v.telefonoEmergencia || v.contactoEmergencia || '',
    'Fecha nacimiento':    v.fechaNacimiento || '',
    'Fecha registro':      v.fechaRegistro || '',
    'Notas':               v.notas || '',
  }));

  const book = wb();
  XLSX.utils.book_append_sheet(book, sheet(data), 'Voluntarios');
  writeFile(book, 'voluntarios-trail-guerrero-2026.xlsx');
}

// ─── Patrocinadores ──────────────────────────────────────────────────────────
export function exportarPatrocinadores(pats = []) {
  const data = pats.map(p => ({
    'Nombre':              p.nombre || '',
    'Nivel':               p.nivel || '',
    'Sector':              p.sector || '',
    'Estado':              p.estado || '',
    'Contacto':            p.contacto || '',
    'Teléfono':            p.telefono || '',
    'Email':               p.email || '',
    'Importe (€)':         p.importe || 0,
    'Cobrado (€)':         p.importeCobrado || 0,
    'Fecha acuerdo':       p.fechaAcuerdo || '',
    'Fecha vencimiento':   p.fechaVencimiento || '',
    'Próx. seguimiento':   p.proximoContacto || '',
    'Notas':               p.notas || '',
    'Contraprestaciones':  (p.contraprestaciones || []).length,
    'Entregadas':          (p.contraprestaciones || []).filter(c => c.estado === 'entregado').length,
    'Pend. entrega':       (p.contraprestaciones || []).filter(c => c.estado === 'pendiente').length,
  }));

  // Segunda hoja: detalle de contraprestaciones
  const contData = [];
  pats.forEach(p => {
    (p.contraprestaciones || []).forEach(c => {
      contData.push({
        'Patrocinador':  p.nombre || '',
        'Nivel':         p.nivel || '',
        'Tipo':          c.tipo || '',
        'Detalle':       c.detalle || '',
        'Estado':        c.estado || '',
        'Fecha entrega': c.fechaEntrega || '',
      });
    });
  });

  const book = wb();
  XLSX.utils.book_append_sheet(book, sheet(data), 'Patrocinadores');
  if (contData.length > 0) {
    XLSX.utils.book_append_sheet(book, sheet(contData), 'Contraprestaciones');
  }
  writeFile(book, 'patrocinadores-trail-guerrero-2026.xlsx');
}

// ─── Material de Logística ───────────────────────────────────────────────────
export function exportarMaterial(material = [], asigs = [], locs = []) {
  const data = material.map(m => {
    const asigTotal = asigs
      .filter(a => String(a.materialId) === String(m.id))
      .reduce((s, a) => s + (a.cantidad || 0), 0);
    const locNombre = locs.find(l => l.id === m.localizacionId)?.nombre || '';
    return {
      'Nombre':          m.nombre || '',
      'Categoría':       m.categoria || '',
      'Stock total':     m.stock || 0,
      'Asignado':        asigTotal,
      'Disponible':      (m.stock || 0) - asigTotal,
      'Stock mínimo':    m.stockMinimo || 0,
      'Unidad':          m.unidad || '',
      'Localización':    locNombre,
      'Proveedor':       m.proveedor || '',
      'Notas':           m.notas || '',
    };
  });

  // Segunda hoja: asignaciones detalladas
  const asigData = asigs.map(a => {
    const mat = material.find(m => String(m.id) === String(a.materialId));
    const loc = locs.find(l => l.id === a.locId);
    return {
      'Material':      mat?.nombre || a.materialId,
      'Cantidad':      a.cantidad || 0,
      'Unidad':        mat?.unidad || '',
      'Localización':  loc?.nombre || a.locId || '',
      'Notas':         a.notas || '',
    };
  });

  const book = wb();
  XLSX.utils.book_append_sheet(book, sheet(data), 'Material');
  if (asigData.length > 0) {
    XLSX.utils.book_append_sheet(book, sheet(asigData), 'Asignaciones');
  }
  writeFile(book, 'material-logistica-trail-guerrero-2026.xlsx');
}
