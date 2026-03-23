import jsPDF from "jspdf";
import "jspdf-autotable";

export function exportBlockToPdf(blockName) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(8, 12, 24);
  doc.rect(0, 0, pageW, 40, "F");
  doc.setTextColor(34, 211, 238);
  doc.setFontSize(10);
  doc.text("TRAIL EL GUERRERO 2026", 14, 15);
  doc.setTextColor(232, 238, 248);
  doc.setFontSize(18);
  doc.text(getBlockTitle(blockName), 14, 28);
  doc.setTextColor(90, 106, 138);
  doc.setFontSize(8);
  doc.text(`Exportado: ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, 14, 35);

  let y = 50;
  const data = getBlockData(blockName);
  
  if (data.tables) {
    data.tables.forEach((table, i) => {
      if (i > 0) y += 8;
      if (y > 250) { doc.addPage(); y = 20; }
      
      doc.setTextColor(167, 139, 250);
      doc.setFontSize(11);
      doc.text(table.title, 14, y);
      y += 6;

      doc.autoTable({
        startY: y,
        head: [table.headers],
        body: table.rows,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 2, textColor: [180, 190, 210], fillColor: [15, 22, 41], lineColor: [30, 45, 80], lineWidth: 0.2 },
        headStyles: { fillColor: [21, 30, 53], textColor: [34, 211, 238], fontStyle: "bold", fontSize: 7 },
        alternateRowStyles: { fillColor: [18, 27, 48] },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    });
  }

  if (data.summary) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setTextColor(52, 211, 153);
    doc.setFontSize(10);
    doc.text("Resumen", 14, y);
    y += 6;
    doc.setTextColor(180, 190, 210);
    doc.setFontSize(8);
    data.summary.forEach(line => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, 14, y);
      y += 5;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(90, 106, 138);
    doc.setFontSize(7);
    doc.text(`Trail El Guerrero 2026 — ${getBlockTitle(blockName)} — Pág. ${i}/${pageCount}`, pageW / 2, 290, { align: "center" });
  }

  doc.save(`TEG2026_${blockName}_${new Date().toISOString().split("T")[0]}.pdf`);
}

function getBlockTitle(name) {
  const titles = {
    presupuesto: "Presupuesto",
    voluntarios: "Voluntarios",
    logistica: "Logística y Material",
    patrocinadores: "Patrocinadores",
    proyecto: "Proyecto",
  };
  return titles[name] || name;
}

function getBlockData(blockName) {
  const LS_KEYS = {
    presupuesto: {
      tables: () => {
        const conceptos = JSON.parse(localStorage.getItem("teg_presupuesto_v1_conceptos") || "[]");
        const tramos = JSON.parse(localStorage.getItem("teg_presupuesto_v1_tramos") || "[]");
        const inscritos = JSON.parse(localStorage.getItem("teg_presupuesto_v1_inscritos") || '{"tramos":{}}');
        const ingresosExtra = JSON.parse(localStorage.getItem("teg_presupuesto_v1_ingresosExtra") || "[]");
        const merchandising = JSON.parse(localStorage.getItem("teg_presupuesto_v1_merchandising") || "[]");
        
        const tables = [];
        
        // Costes fijos
        const fijos = conceptos.filter(c => c.tipo === "fijo" && c.activo);
        if (fijos.length) {
          tables.push({
            title: "Costes Fijos",
            headers: ["Concepto", "Coste Total (€)", "TG7", "TG13", "TG25"],
            rows: fijos.map(c => [c.nombre, c.costeTotal?.toFixed(2) || "0", c.activoDistancias?.TG7 ? "✓" : "—", c.activoDistancias?.TG13 ? "✓" : "—", c.activoDistancias?.TG25 ? "✓" : "—"]),
          });
        }
        
        // Costes variables
        const vars = conceptos.filter(c => c.tipo === "variable" && c.activo);
        if (vars.length) {
          tables.push({
            title: "Costes Variables (€/corredor)",
            headers: ["Concepto", "TG7", "TG13", "TG25"],
            rows: vars.map(c => [c.nombre, c.costePorDistancia?.TG7?.toFixed(2) || "0", c.costePorDistancia?.TG13?.toFixed(2) || "0", c.costePorDistancia?.TG25?.toFixed(2) || "0"]),
          });
        }
        
        // Tramos
        if (tramos.length) {
          tables.push({
            title: "Tramos de Inscripción",
            headers: ["Tramo", "Fecha fin", "Precio TG7", "Precio TG13", "Precio TG25", "Inscritos TG7", "Inscritos TG13", "Inscritos TG25"],
            rows: tramos.map(t => [t.nombre, t.fechaFin, `${t.precios?.TG7}€`, `${t.precios?.TG13}€`, `${t.precios?.TG25}€`, String(inscritos.tramos?.[t.id]?.TG7 || 0), String(inscritos.tramos?.[t.id]?.TG13 || 0), String(inscritos.tramos?.[t.id]?.TG25 || 0)]),
          });
        }
        
        // Merchandising
        if (merchandising.length) {
          tables.push({
            title: "Merchandising",
            headers: ["Artículo", "Unidades", "Coste/ud", "PVP", "Beneficio"],
            rows: merchandising.filter(m => m.activo).map(m => [m.nombre, String(m.unidades), `${m.costeUnitario}€`, `${m.precioVenta}€`, `${((m.precioVenta - m.costeUnitario) * m.unidades).toFixed(0)}€`]),
          });
        }
        
        // Ingresos extra
        if (ingresosExtra.length) {
          tables.push({
            title: "Ingresos Extra",
            headers: ["Concepto", "Valor (€)"],
            rows: ingresosExtra.filter(i => i.activo).map(i => [i.nombre, `${i.valor}€`]),
          });
        }
        
        return tables;
      },
    },
    voluntarios: {
      tables: () => {
        const voluntarios = JSON.parse(localStorage.getItem("teg_voluntarios_v1_voluntarios") || "[]");
        const puestos = JSON.parse(localStorage.getItem("teg_voluntarios_v1_puestos") || "[]");
        const tables = [];
        
        if (voluntarios.length) {
          tables.push({
            title: "Voluntarios",
            headers: ["Nombre", "Teléfono", "Talla", "Estado", "Puesto", "Coche"],
            rows: voluntarios.map(v => {
              const puesto = puestos.find(p => p.id === v.puestoId);
              return [v.nombre, v.telefono, v.talla, v.estado, puesto?.nombre || "Sin asignar", v.coche ? "Sí" : "No"];
            }),
          });
        }
        
        if (puestos.length) {
          tables.push({
            title: "Puestos",
            headers: ["Puesto", "Tipo", "Necesarios", "Horario", "Distancias"],
            rows: puestos.map(p => [p.nombre, p.tipo, String(p.necesarios), `${p.horaInicio}-${p.horaFin}`, p.distancias?.join(", ") || ""]),
          });
        }
        
        return tables;
      },
    },
    logistica: {
      tables: () => {
        const material = JSON.parse(localStorage.getItem("teg_logistica_v1_mat") || "[]");
        const vehiculos = JSON.parse(localStorage.getItem("teg_logistica_v1_veh") || "[]");
        const timeline = JSON.parse(localStorage.getItem("teg_logistica_v1_tl") || "[]");
        const checklist = JSON.parse(localStorage.getItem("teg_logistica_v1_ck") || "[]");
        const contactos = JSON.parse(localStorage.getItem("teg_logistica_v1_cont") || "[]");
        const tables = [];
        
        if (material.length) {
          tables.push({
            title: "Inventario de Material",
            headers: ["Material", "Categoría", "Cantidad", "Stock", "Unidad"],
            rows: material.map(m => [m.nombre, m.categoria, String(m.cantidad), String(m.stock), m.unidad]),
          });
        }
        if (vehiculos.length) {
          tables.push({
            title: "Vehículos",
            headers: ["Vehículo", "Matrícula", "Conductor", "Teléfono", "Capacidad"],
            rows: vehiculos.map(v => [v.nombre, v.matricula, v.conductor, v.telefono, v.capacidad]),
          });
        }
        if (timeline.length) {
          tables.push({
            title: "Timeline Día de Carrera",
            headers: ["Hora", "Evento", "Responsable", "Estado"],
            rows: timeline.sort((a, b) => a.hora.localeCompare(b.hora)).map(t => [t.hora, t.titulo, t.responsable, t.estado]),
          });
        }
        if (contactos.length) {
          tables.push({
            title: "Directorio de Contactos",
            headers: ["Nombre", "Rol", "Teléfono", "Email", "Tipo"],
            rows: contactos.map(c => [c.nombre, c.rol, c.telefono, c.email || "—", c.tipo]),
          });
        }
        if (checklist.length) {
          tables.push({
            title: "Checklist",
            headers: ["Fase", "Tarea", "Responsable", "Estado", "Prioridad"],
            rows: checklist.map(c => [c.fase, c.tarea, c.responsable, c.estado, c.prioridad]),
          });
        }
        
        return tables;
      },
    },
    patrocinadores: {
      tables: () => {
        const pats = JSON.parse(localStorage.getItem("teg_patrocinadores_v1_pats") || "[]");
        const tables = [];
        
        if (pats.length) {
          tables.push({
            title: "Patrocinadores",
            headers: ["Nombre", "Nivel", "Sector", "Importe", "Cobrado", "Especie", "Estado", "Contacto"],
            rows: pats.map(p => [p.nombre, p.nivel, p.sector, `${p.importe}€`, `${p.importeCobrado}€`, `${p.especie || 0}€`, p.estado, p.contacto]),
          });
          
          // Contraprestaciones
          const contras = pats.flatMap(p => (p.contraprestaciones || []).map(c => ({ ...c, patrocinador: p.nombre })));
          if (contras.length) {
            tables.push({
              title: "Contraprestaciones",
              headers: ["Patrocinador", "Tipo", "Detalle", "Estado"],
              rows: contras.map(c => [c.patrocinador, c.tipo, c.detalle || "", c.estado]),
            });
          }
        }
        
        return tables;
      },
    },
    proyecto: {
      tables: () => {
        const tareas = JSON.parse(localStorage.getItem("teg_proyecto_v1_tareas") || "[]");
        const hitos = JSON.parse(localStorage.getItem("teg_proyecto_v1_hitos") || "[]");
        const equipo = JSON.parse(localStorage.getItem("teg_proyecto_v1_equipo") || "[]");
        const tables = [];
        
        if (tareas.length) {
          tables.push({
            title: "Tareas del Proyecto",
            headers: ["Área", "Tarea", "Responsable", "Fecha límite", "Estado", "Prioridad"],
            rows: tareas.map(t => {
              const resp = equipo.find(e => e.id === t.responsableId);
              return [t.area, t.titulo, resp?.nombre || "—", t.fechaLimite || "—", t.estado, t.prioridad];
            }),
          });
        }
        
        if (hitos.length) {
          tables.push({
            title: "Hitos",
            headers: ["Hito", "Fecha", "Crítico", "Completado"],
            rows: hitos.map(h => [h.nombre, h.fecha, h.critico ? "Sí" : "No", h.completado ? "Sí" : "No"]),
          });
        }
        
        if (equipo.length) {
          tables.push({
            title: "Equipo Organizador",
            headers: ["Nombre", "Rol", "Área", "Email", "Teléfono"],
            rows: equipo.map(e => [e.nombre, e.rol, e.area, e.email, e.telefono]),
          });
        }
        
        return tables;
      },
    },
  };

  const blockConfig = LS_KEYS[blockName];
  if (!blockConfig) return { tables: [], summary: [] };
  
  return { tables: blockConfig.tables() };
}
