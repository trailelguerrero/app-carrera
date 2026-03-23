import { useState } from "react";

const READMES = {
  dashboard: {
    title: "📊 Dashboard Global",
    icon: "📊",
    sections: [
      { title: "Descripción", text: "Panel centralizado con indicadores clave (KPIs) de todos los módulos del Trail El Guerrero 2026. Muestra el estado global del proyecto en un vistazo." },
      { title: "Indicadores", text: "• Countdown: Días restantes hasta la carrera\n• Progreso global: % de tareas completadas\n• Resultado económico: Balance P&L en tiempo real\n• Inscritos: Totales y por distancia (TG7, TG13, TG25)\n• Voluntarios: Confirmados vs necesarios con % cobertura\n• Patrocinio: Comprometido, cobrado y pipeline vs objetivo\n• Checklist logístico: Progreso de verificación" },
      { title: "Alertas automáticas", text: "• 🔴 Tareas vencidas sin completar\n• 🔴 Resultado económico negativo\n• 🔴 Cobertura de voluntarios crítica (<50%)\n• 🟡 Tareas bloqueadas\n• 🟡 Patrocinio por debajo del 50% del objetivo\n• 🟡 Materiales con sobreasignación de stock\n• ⚡ Hitos críticos a menos de 14 días\n• 🔵 Voluntarios pendientes de confirmar\n• 🔵 Contraprestaciones pendientes de entregar" },
      { title: "Interconexiones", text: "• Lee datos en tiempo real de los 5 módulos\n• Se actualiza automáticamente al cambiar de pestaña\n• Los hitos provienen del módulo de Proyecto\n• El balance económico se calcula desde Presupuesto\n• La cobertura se obtiene de Voluntarios\n• El pipeline viene de Patrocinadores\n• El checklist proviene de Logística" },
    ]
  },
  presupuesto: {
    title: "💰 Presupuesto",
    icon: "💰",
    sections: [
      { title: "Descripción", text: "Módulo completo de gestión presupuestaria para el Trail El Guerrero. Permite controlar costes fijos y variables, ingresos por inscripciones, merchandising, patrocinios y otros ingresos." },
      { title: "Pestañas principales", text: "• Presupuesto: Costes fijos (cronometraje, ambulancias, seguro...) y variables (medallas, dorsales, avituallamiento...)\n• Inscripciones: Gestión de tramos de inscripción con precios por distancia (TG7, TG13, TG25)\n• Merchandising: Artículos a la venta con coste/PVP/beneficio\n• Ingresos Extra: Patrocinios, subvenciones, colaboraciones\n• Resumen P&L: Tabla completa de pérdidas y ganancias\n• Punto de Equilibrio: Cálculo del break-even por distancia" },
      { title: "Funcionalidades", text: "• Todos los datos son editables en línea\n• Toggle de activación/desactivación por concepto\n• Reparto de costes fijos por distancia activable\n• Modo uniforme para costes variables\n• Cálculo automático de punto de equilibrio ponderado\n• Añadir/eliminar conceptos, tramos y merchandising\n• Guardar y restablecer datos\n• Exportar a PDF" },
      { title: "Interconexiones", text: "• Los ingresos por patrocinio se vinculan con el módulo de Patrocinadores\n• Los costes de voluntarios (camisetas) se relacionan con el módulo de Voluntarios\n• El presupuesto de logística conecta con el módulo de Logística\n• Las tareas económicas aparecen en el módulo de Proyecto" },
    ]
  },
  voluntarios: {
    title: "👥 Voluntarios",
    icon: "👥",
    sections: [
      { title: "Descripción", text: "Gestión integral de voluntarios del Trail El Guerrero. Incluye registro, asignación a puestos, control de tallas de camisetas y planificación del día de carrera." },
      { title: "Pestañas principales", text: "• Dashboard: KPIs de voluntarios, cobertura global, estadísticas por estado\n• Voluntarios: Lista completa con filtros por estado, puesto y búsqueda\n• Puestos: 12 puestos definidos con cobertura, distancias y horarios\n• Tallas: Distribución de tallas de camisetas con gráfico de barras\n• Día de Carrera: Vista de puestos con horarios y asignaciones" },
      { title: "Funcionalidades", text: "• Formulario público de inscripción para voluntarios\n• CRUD completo de voluntarios y puestos\n• Subir imágenes de camiseta (delantera y trasera)\n• Guía de tallas con medidas\n• Filtros por estado, puesto y búsqueda libre\n• Control de cobertura por puesto\n• Confirmación de eliminación\n• Exportar a PDF" },
      { title: "Interconexiones", text: "• El coste de camisetas de voluntarios se refleja en Presupuesto\n• Las tareas de voluntarios aparecen en el módulo de Proyecto\n• Los puestos de voluntarios se cruzan con los datos de Logística" },
    ]
  },
  logistica: {
    title: "📦 Logística",
    icon: "📦",
    sections: [
      { title: "Descripción", text: "Control logístico completo del evento: inventario de materiales, asignaciones a puestos, vehículos, rutas de reparto, timeline del día de carrera, comunicaciones e incidencias." },
      { title: "Pestañas principales", text: "• Dashboard: KPIs de material, timeline, checklist, stock y alertas\n• Material: Inventario con categorías, stock y asignaciones por puesto\n• Vehículos: Flota de vehículos con datos de conductor y rutas\n• Timeline: Cronograma completo del día de carrera (04:30 a 19:00)\n• Comunicaciones: Directorio de contactos (institucional, emergencias, staff, proveedores)\n• Checklist: Lista de verificación por fases (semana antes → post-carrera)" },
      { title: "Funcionalidades", text: "• CRUD de materiales con categorías y alertas de stock\n• Asignación de material a puestos con control de sobreasignación\n• Rutas de reparto con paradas y horarios\n• Registro de incidencias con prioridad y estado\n• Checklist por fases con progreso\n• Directorio de contactos del evento\n• Exportar a PDF" },
      { title: "Interconexiones", text: "• El inventario se cruza con las necesidades del Presupuesto\n• Los puestos de material coinciden con los del módulo de Voluntarios\n• Las tareas logísticas aparecen en el módulo de Proyecto\n• Los contactos de proveedores pueden ser también patrocinadores" },
    ]
  },
  patrocinadores: {
    title: "🤝 Patrocinadores",
    icon: "🤝",
    sections: [
      { title: "Descripción", text: "Gestión de patrocinadores y sponsors del Trail El Guerrero. Pipeline comercial con niveles (Oro, Plata, Bronce, Colaborador, Especie), estados, contraprestaciones y documentación." },
      { title: "Pestañas principales", text: "• Dashboard: KPIs de ingresos comprometidos, cobrados, en pipeline y especie\n• Listado: Todos los patrocinadores con filtros por nivel y estado\n• Kanban: Vista de pipeline por estado (prospecto → negociando → confirmado → cobrado)\n• Detalle: Ficha completa de cada patrocinador con contraprestaciones" },
      { title: "Funcionalidades", text: "• CRUD completo de patrocinadores\n• 5 niveles con objetivos económicos\n• Pipeline con 5 estados\n• Gestión de contraprestaciones con checklist\n• Subida de documentos (contratos, facturas, acuerdos)\n• Objetivo global de patrocinio configurable\n• Filtros por nivel, estado y búsqueda\n• Exportar a PDF" },
      { title: "Interconexiones", text: "• El total comprometido/cobrado alimenta los 'Ingresos Extra' del Presupuesto\n• Las contraprestaciones de logo en camiseta conectan con Voluntarios\n• Las tareas de patrocinadores aparecen en el módulo de Proyecto\n• Los sponsors de especie se reflejan en el inventario de Logística" },
    ]
  },
  proyecto: {
    title: "🏔️ Proyecto",
    icon: "🏔️",
    sections: [
      { title: "Descripción", text: "Panel de dirección del proyecto Trail El Guerrero 2026. Gestión de tareas, hitos, equipo organizador y seguimiento por áreas funcionales con countdown al evento." },
      { title: "Pestañas principales", text: "• Dashboard: Cuenta atrás, progreso global, semáforo por áreas, tareas críticas\n• Tareas: Lista completa con filtros por área, responsable, estado y prioridad\n• Hitos: Eventos clave del proyecto con fechas y estado\n• Equipo: Miembros del comité organizador con roles y áreas\n• Dependencias: Relaciones entre tareas (bloqueos)" },
      { title: "Funcionalidades", text: "• 8 áreas funcionales: Permisos, Económico, Comunicación, Patrocinadores, Voluntarios, Ruta, Logística, Día D\n• CRUD de tareas con prioridad, dependencias y responsable\n• Gestión de hitos críticos con countdown\n• Equipo con roles, emails y teléfonos\n• Semáforo por área (verde/amarillo/rojo)\n• Búsqueda y filtros avanzados\n• Exportar a PDF" },
      { title: "Interconexiones", text: "• Las áreas del proyecto conectan directamente con cada módulo:\n  - Económico → Presupuesto\n  - Patrocinadores → Patrocinadores\n  - Voluntarios → Voluntarios\n  - Logística → Logística\n• Los responsables del equipo son los mismos en todos los módulos\n• Los hitos marcan deadlines que afectan a todos los bloques" },
    ]
  },
};

export default function ReadmeModal({ block, onClose }) {
  const readme = READMES[block];
  if (!readme) return null;
  
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "1rem",
    }}>
      <div style={{
        background: "#0f1629", border: "1px solid #243460", borderRadius: 16,
        width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "hidden",
        display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        animation: "readmeSlideUp 0.2s ease",
      }}>
        <style>{`@keyframes readmeSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{
          padding: "1.1rem 1.4rem", borderBottom: "1px solid #1e2d50",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1rem" }}>
            {readme.icon} {readme.title} — README
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#5a6a8a", cursor: "pointer", fontSize: "1.2rem",
          }}>✕</button>
        </div>
        <div style={{ padding: "1rem 1.4rem", overflowY: "auto", flex: 1 }}>
          {readme.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: "1.2rem" }}>
              <div style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.85rem",
                color: "#22d3ee", marginBottom: "0.4rem",
              }}>{s.title}</div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#e8eef8",
                lineHeight: 1.7, whiteSpace: "pre-line", opacity: 0.85,
              }}>{s.text}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "0.75rem 1.4rem", borderTop: "1px solid #1e2d50", textAlign: "right" }}>
          <button onClick={onClose} style={{
            background: "rgba(34,211,238,0.12)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)",
            borderRadius: 8, padding: "0.5rem 1.2rem", fontFamily: "'Syne', sans-serif",
            fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
