import { useState } from "react";

const READMES = {

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  dashboard: {
    title: "📊 Dashboard",
    icon: "📊",
    sections: [
      {
        title: "¿Para qué sirve?",
        text: "Es tu centro de mando. Reúne en una sola pantalla el estado real de todos los módulos y te dice exactamente qué tienes que hacer hoy, sin tener que entrar en cada bloque."
      },
      {
        title: "🎯 Haz esto ahora",
        text: "La sección más importante. Genera automáticamente las 5 acciones más urgentes del momento — tramos cerrando, voluntarios sin confirmar, puestos sin cubrir, hitos próximos, stock insuficiente. Cada acción te lleva directamente al bloque donde actuar.\n\n→ Si no aparece esta sección, todo está en orden."
      },
      {
        title: "🚦 Salud del evento",
        text: "Barra de semáforo global (0–100%) calculada con los 5 módulos principales. Verde = en orden, Amber = atención, Rojo = acción urgente.\n\nCada módulo aporta su porcentaje:\n• Presupuesto: resultado positivo o negativo\n• Voluntarios: % de cobertura de puestos\n• Patrocinadores: % del objetivo alcanzado\n• Logística: % del checklist completado\n• Proyecto: % de tareas completadas"
      },
      {
        title: "📋 Alertas y avisos",
        text: "🔴 Alertas críticas — requieren acción inmediata:\n• Resultado económico negativo\n• Documentos o permisos vencidos\n• Cobertura de voluntarios crítica (≤7 días para la carrera)\n• Tareas vencidas sin completar\n• Gestiones legales denegadas\n\n🟡 Avisos — conviene gestionar pronto:\n• Tramos de inscripción a punto de cerrar\n• Patrocinio por debajo del 50% del objetivo\n• Contraprestaciones pendientes de entregar\n• Materiales con stock insuficiente\n\nToca cualquier alerta para ir directamente al bloque."
      },
      {
        title: "⚡ Widget de inscritos",
        text: "Actualiza los inscritos por tramo y distancia directamente desde el Dashboard, sin entrar en Presupuesto. Los KPIs se recalculan al instante."
      },
      {
        title: "🔗 Interconexiones",
        text: "El Dashboard lee en tiempo real de todos los bloques. No almacena datos propios — todo viene de Presupuesto, Voluntarios, Patrocinadores, Logística y Proyecto. Si algo cambia en cualquier bloque, el Dashboard se actualiza solo."
      },
    ]
  },

  // ─── PRESUPUESTO ───────────────────────────────────────────────────────────
  presupuesto: {
    title: "💰 Presupuesto",
    icon: "💰",
    sections: [
      {
        title: "¿Para qué sirve?",
        text: "Modelo financiero completo del evento. Controla todos los costes e ingresos, calcula el punto de equilibrio real respetando los aforos máximos, y te dice exactamente cuántos corredores más necesitas para no perder dinero."
      },
      {
        title: "📑 Pestañas",
        text: "• Tramos: Define los períodos de inscripción con precios por distancia. Los tramos cerrados (fecha pasada) se marcan automáticamente.\n• Inscritos: Cuántos corredores hay en cada tramo y distancia. Actualizable también desde el Dashboard.\n• Costes: Gastos fijos (cronometraje, ambulancias, seguro…) y variables (medallas, dorsales, avituallamiento…).\n• Ingresos: Patrocinios, subvenciones y otros ingresos extra. El patrocinio se sincroniza automáticamente con el bloque Patrocinadores.\n• P&L: Cuenta de resultados completa — ingresos, costes fijos, costes variables, merchandising y resultado neto.\n• Equilibrio: ¿Cuántos corredores necesitas para no perder dinero?"
      },
      {
        title: "💡 Ficha de concepto",
        text: "Toca el nombre de cualquier coste fijo o variable para abrir su ficha completa:\n• Proveedor y contacto\n• Estado de pago o pedido\n• Fecha de pago o entrega\n• Número de factura\n• Notas y observaciones\n\nEl icono 📋 aparece cuando la ficha tiene datos extra."
      },
      {
        title: "⚖️ Punto de equilibrio",
        text: "El cálculo respeta los aforos máximos de cada distancia. El sistema calcula cuántos corredores adicionales necesitas, priorizando las distancias con más margen, sin superar nunca el aforo máximo de ninguna.\n\nSi incluso llenando todas las plazas el evento pierde dinero, te lo avisa claramente con el déficit exacto en euros."
      },
      {
        title: "🔗 Interconexiones",
        text: "• Patrocinadores confirmados/cobrados se sincronizan automáticamente en la línea 'Patrocinio/Sponsor'\n• Los inscritos por distancia alimentan el cálculo de costes variables\n• El resultado neto aparece en el Dashboard en tiempo real\n• Logística lee los inscritos para comparar con el stock de material"
      },
    ]
  },

  // ─── VOLUNTARIOS ───────────────────────────────────────────────────────────
  voluntarios: {
    title: "👥 Voluntarios",
    icon: "👥",
    sections: [
      {
        title: "¿Para qué sirve?",
        text: "Gestión completa del equipo de voluntarios: registro, asignación a puestos, control de cobertura y planificación del día de carrera. Incluye un formulario público para que los voluntarios se registren solos."
      },
      {
        title: "📑 Pestañas",
        text: "• Dashboard: KPIs de cobertura global, puestos con déficit, últimos registros y distribución de tallas.\n• Voluntarios: Lista completa con filtros por estado, puesto y búsqueda libre. Toca cualquier voluntario para ver su ficha.\n• Puestos: Los 12 puestos del evento con cobertura, horario y distancias. Los puestos vinculados a una localización muestran el material asignado en Logística.\n• Tallas: Distribución de tallas de todos los voluntarios activos.\n• Día de Carrera: Vista horaria de puestos y quién está en cada uno."
      },
      {
        title: "📝 Formulario público",
        text: "Botón '🔗 Formulario' en el header — genera un enlace que puedes compartir con los voluntarios. Ellos se registran solos con sus datos, talla de camiseta y preferencia de puesto.\n\nTambién puedes previsualizar el formulario directamente desde el panel."
      },
      {
        title: "📍 Vincular puestos a localizaciones",
        text: "Cada puesto puede vincularse a una Localización Maestra de Logística:\n1. Ve a la pestaña Puestos\n2. Edita cualquier puesto\n3. Selecciona la 'Localización Maestra' en el desplegable\n\nA partir de ahí:\n• El puesto muestra cuánto material hay asignado en esa localización (📦)\n• En Logística → Localizaciones, esa tarjeta muestra los voluntarios asignados"
      },
      {
        title: "🔗 Interconexiones",
        text: "• Las tallas de voluntarios activos (confirmados + pendientes) se leen automáticamente en el bloque Camisetas\n• Los voluntarios con coche confirmados aparecen como pool de conductores en Logística → Vehículos\n• El porcentaje de cobertura alimenta el semáforo del Dashboard\n• Las alertas de voluntarios en el Dashboard se activan según los días configurados en Configuración"
      },
    ]
  },

  // ─── LOGÍSTICA ─────────────────────────────────────────────────────────────
  logistica: {
    title: "📦 Logística",
    icon: "📦",
    sections: [
      {
        title: "¿Para qué sirve?",
        text: "Control operativo completo del evento: qué material hay, dónde va, quién lo lleva, a qué hora sale cada vehículo, y qué tiene que estar listo antes de la carrera."
      },
      {
        title: "📑 Pestañas",
        text: "• Dashboard: Resumen de stock, alertas de sobreasignación, progreso del checklist y próximas tareas del timeline.\n• Material: Inventario completo con categorías. Toca un material para asignarlo a puestos y ver el stock disponible.\n• Vehículos: Flota con conductores y rutas de reparto. Incluye el pool de voluntarios con coche (de Voluntarios).\n• Timeline: Cronograma del día de carrera de 04:30 a 19:00. La fase activa se calcula automáticamente según los días hasta el evento.\n• Comunicaciones: Directorio de contactos — institucionales, emergencias, staff y proveedores.\n• Checklist: Lista de verificación organizada por fases (3 meses antes → post-carrera). La fase activa se resalta automáticamente.\n• Localizaciones: Los 12 puntos físicos del evento. Cada tarjeta muestra los voluntarios asignados a ese punto."
      },
      {
        title: "⚠️ Alertas de stock",
        text: "Si la cantidad asignada a puestos supera el stock disponible de un material, aparece una alerta en el Dashboard. El material se marca en rojo en la pestaña Material.\n\nEl indicador compara stock total vs cantidad asignada a todos los puestos."
      },
      {
        title: "👥 Voluntarios en localizaciones",
        text: "Las tarjetas de Localizaciones muestran automáticamente qué voluntarios están asignados a cada punto:\n• Verde = confirmados\n• Amber = pendientes de confirmar\n• Si no hay nadie asignado, lo indica claramente\n\nPara que aparezcan, los puestos de Voluntarios deben estar vinculados a la localización correspondiente."
      },
      {
        title: "🔗 Interconexiones",
        text: "• Lee los inscritos de Presupuesto para comparar stock de material con la demanda real\n• Lee los voluntarios confirmados con coche para el pool de conductores\n• Las localizaciones son compartidas con Voluntarios — cambios en Logística aparecen en los puestos de voluntarios"
      },
    ]
  },

  // ─── PATROCINADORES ────────────────────────────────────────────────────────
  patrocinadores: {
    title: "🤝 Patrocinadores",
    icon: "🤝",
    sections: [
      {
        title: "¿Para qué sirve?",
        text: "Pipeline comercial completo de patrocinadores y sponsors. Desde el primer contacto hasta el cobro. Gestiona los compromisos que has adquirido con ellos (contraprestaciones) y la documentación asociada."
      },
      {
        title: "📑 Pestañas",
        text: "• Dashboard: KPIs de ingresos comprometidos, cobrados, en negociación y en especie. Progreso vs objetivo global.\n• Patrocinadores: Lista completa con filtros por nivel (Oro/Plata/Bronce/Colaborador/Especie) y estado.\n• Pipeline: Vista Kanban — arrastra patrocinadores entre columnas (Prospecto → Negociando → Confirmado → Cobrado).\n• Compromisos: Todas las contraprestaciones pendientes y entregadas de todos los patrocinadores.\n• Documentos: Contratos, facturas y acuerdos subidos a cada patrocinador."
      },
      {
        title: "💼 Niveles y estados",
        text: "Niveles: Oro · Plata · Bronce · Colaborador · Especie\n\nEstados del pipeline:\n• Prospecto: Identificado, sin contacto\n• Negociando: Conversación activa\n• Confirmado: Acuerdo cerrado, pendiente de cobro\n• Cobrado: Dinero recibido\n• Descartado: No interesado\n\nSolo los estados Confirmado y Cobrado suman al objetivo de patrocinio y se sincronizan con Presupuesto."
      },
      {
        title: "🎁 Contraprestaciones",
        text: "Cada patrocinador puede tener compromisos adquiridos: logo en camiseta, banner en meta, mención en redes, producto en bolsa del corredor…\n\nEstado de cada contraprestación: Pendiente / En proceso / Entregada.\n\nLa pestaña Compromisos agrupa todas las contraprestaciones pendientes de todos los patrocinadores — útil para no olvidar ningún compromiso."
      },
      {
        title: "🔗 Interconexiones",
        text: "• El total de patrocinadores Confirmados + Cobrados se sincroniza automáticamente en la línea 'Patrocinio/Sponsor' del bloque Presupuesto — no hay que introducirlo dos veces\n• Los patrocinadores con aportación en especie (material) aparecen en Logística → Material como fuente adicional de stock"
      },
    ]
  },

  // ─── PROYECTO ──────────────────────────────────────────────────────────────
  proyecto: {
    title: "🏔️ Proyecto",
    icon: "🏔️",
    sections: [
      {
        title: "¿Para qué sirve?",
        text: "Panel de dirección del proyecto. Gestiona todas las tareas pendientes organizadas por 10 áreas funcionales, con responsables, fechas límite, dependencias entre tareas e hitos clave del evento."
      },
      {
        title: "📑 Áreas funcionales",
        text: "Las tareas están organizadas en 10 áreas:\n• Permisos y Legal\n• Económico\n• Comunicación y RRSS\n• Patrocinadores\n• Voluntarios\n• Ruta y Señalización\n• Logística y Material\n• Comercial\n• Sanitario\n• Día de Carrera\n\nCada área tiene su semáforo de progreso (verde/amber/rojo)."
      },
      {
        title: "✅ Gestión de tareas",
        text: "Vista Lista o Vista Tablón (Kanban por estado).\n\nCampos de cada tarea:\n• Área y responsable\n• Estado: Pendiente / En curso / Completado / Bloqueado\n• Prioridad: Alta / Media / Baja\n• Fecha límite (genera alerta si vence)\n• Dependencias: qué tareas deben completarse antes\n• Notas\n\nFiltros: área, responsable, estado, prioridad y búsqueda libre."
      },
      {
        title: "🚩 Hitos",
        text: "Los hitos son eventos clave con fecha fija — no tareas. Aparecen en el Dashboard con el countdown de días.\n\nEjemplos: apertura de inscripciones, cierre Early Bird, envío de dorsales, Trail El Guerrero 2026.\n\nLos hitos marcados como críticos generan alerta en el Dashboard cuando quedan ≤14 días."
      },
      {
        title: "👤 Equipo",
        text: "Directorio del comité organizador con nombre, rol, área principal, email y teléfono.\n\nLos responsables definidos aquí aparecen como opciones en el selector de tareas."
      },
      {
        title: "🔗 Interconexiones",
        text: "• Documentos y gestiones del bloque Documentos aparecen en las tareas de Proyecto como alertas de vencimiento\n• Los hitos críticos próximos generan avisos en el Dashboard\n• Las tareas vencidas generan alertas críticas en el Dashboard\n• El porcentaje de progreso global alimenta el semáforo del Dashboard"
      },
    ]
  },

  // ─── CAMISETAS ─────────────────────────────────────────────────────────────
  camisetas: {
    title: "👕 Camisetas",
    icon: "👕",
    sections: [
      {
        title: "¿Para qué sirve?",
        text: "Centraliza el pedido de camisetas al proveedor. Consolida automáticamente las tallas de los voluntarios con los pedidos manuales de corredores y extras, y calcula el pedido total que necesitas hacer."
      },
      {
        title: "📑 Pestañas",
        text: "• Dashboard: Resumen económico, control de fuentes activas y métricas de producción.\n• Pedidos: Pedidos manuales (corredores con camiseta de pago, regalos, extras).\n• Tallas: La tabla más importante — pedido total al proveedor desglosado por fuente y talla.\n• Producción: Checklist de seguimiento del proceso de fabricación y entrega."
      },
      {
        title: "📊 Fuentes de datos",
        text: "La pestaña Tallas consolida 4 fuentes:\n\n1. 🏃 Inscritos plataforma: Tallas de corredores introducidas manualmente desde la plataforma de inscripción externa.\n2. 👕 Extras corredor: Pedidos manuales con tipo 'corredor'.\n3. 👥 Voluntarios (automático): Se leen directamente de Voluntarios. Muestra confirmados y pendientes por separado.\n4. 👥 Extras voluntario: Pedidos manuales adicionales de voluntario.\n\nPuedes activar/desactivar cada fuente para ver el impacto en el pedido total."
      },
      {
        title: "💡 Voluntarios automáticos",
        text: "Las tallas de voluntarios se sincronizan en tiempo real desde el bloque Voluntarios. No hay que introducirlas manualmente.\n\nSe incluyen confirmados y pendientes. Los cancelados se excluyen automáticamente.\n\nCuando confirmes más voluntarios en el bloque Voluntarios, el pedido de Camisetas se actualiza solo."
      },
      {
        title: "🔗 Interconexiones",
        text: "• Lee tallas automáticamente de teg_voluntarios_v1_voluntarios\n• El beneficio neto de merchandising (si se venden camisetas a corredores) se transfiere al bloque Presupuesto como ingreso extra"
      },
    ]
  },

  // ─── DOCUMENTOS ────────────────────────────────────────────────────────────
  documentos: {
    title: "📁 Documentos",
    icon: "📁",
    sections: [
      {
        title: "¿Para qué sirve?",
        text: "Gestión de permisos, licencias, seguros y documentación oficial del evento. Controla fechas de vencimiento y te alerta cuando algo está próximo a caducar o ya ha caducado."
      },
      {
        title: "Documentos y gestiones",
        text: "Dos tipos de elementos:\n\n• Documentos: Archivos con fecha de vencimiento (seguro RC, licencia federativa, autorización ayuntamiento…). Estado: Pendiente / En trámite / Aprobado / Rechazado.\n\n• Gestiones legales: Trámites con organismos públicos o privados. Mismo ciclo de estados."
      },
      {
        title: "⚠️ Alertas automáticas",
        text: "Los documentos vencidos y las gestiones denegadas generan alertas críticas 🔴 en el Dashboard.\n\nLos documentos que vencen en ≤30 días generan avisos 🟡.\n\nNo necesitas revisar este bloque manualmente — el Dashboard te avisa cuando algo requiere atención."
      },
      {
        title: "🔗 Interconexiones",
        text: "• Los documentos vencidos aparecen como alertas críticas en el Dashboard\n• Las gestiones denegadas generan la alerta de máxima prioridad (🚫)\n• Las fechas de vencimiento próximas se muestran en la sección 'Haz esto ahora' del Dashboard"
      },
    ]
  },

  // ─── CONFIGURACIÓN ─────────────────────────────────────────────────────────
  configuracion: {
    title: "⚙️ Configuración",
    icon: "⚙️",
    sections: [
      {
        title: "¿Para qué sirve?",
        text: "Identidad y parámetros globales del evento. Los datos aquí configurados se propagan automáticamente a todos los bloques — nombre, fecha, lugar, umbrales de alerta y backup de datos."
      },
      {
        title: "🏔️ Identidad del evento",
        text: "• Nombre del evento\n• Edición / Año\n• Fecha del evento ← Fuente única de verdad. Cambiar aquí actualiza el countdown en Dashboard, Logística, Voluntarios y Proyecto.\n• Lugar y Provincia\n• Organizador"
      },
      {
        title: "⏱️ Umbrales de alertas de voluntarios",
        text: "Define cuándo se activan las alertas de cobertura en el Dashboard:\n\n• Alerta crítica 🔴: Activa X días antes de la carrera. Por defecto 7 días.\n• Aviso 🟡: Activa Y días antes. Por defecto 30 días.\n\nAntes del umbral de aviso: sin alertas de voluntarios (es pronto).\nEntre aviso y crítico: avisos amarillos.\nDentro del crítico: alertas rojas que requieren acción inmediata."
      },
      {
        title: "💾 Backup y exportación",
        text: "• ⬇️ Backup completo (JSON): Descarga todos los datos de la app en un archivo. Guárdalo en Google Drive o donde prefieras como copia de seguridad.\n\n• ⬆️ Restaurar backup: Sube un JSON exportado anteriormente para recuperar todos los datos.\n\n• 📋 Voluntarios CSV: Exporta la lista de voluntarios lista para abrir en Excel.\n\n• 🤝 Patrocinadores CSV: Exporta la lista de patrocinadores.\n\n⚠️ Restaurar un backup sobreescribe todos los datos actuales. Exporta primero si no quieres perder los cambios recientes."
      },
      {
        title: "💡 Consejo",
        text: "Exporta un backup completo cada semana durante los meses previos a la carrera. Es la única protección contra pérdida de datos si el navegador limpia el almacenamiento local."
      },
    ]
  },

};

export default function ReadmeModal({ block, onClose }) {
  const readme = READMES[block];
  const [seccionAbierta, setSeccionAbierta] = useState(0);

  if (!readme) return null;

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999, padding: "1rem",
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border-light)",
        borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "88vh",
        overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        animation: "readmeSlideUp 0.2s ease",
      }}>
        <style>{`@keyframes readmeSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div style={{
          padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--surface)", position: "sticky", top: 0,
        }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", color: "var(--text)" }}>
              {readme.icon} {readme.title}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.55rem", color: "var(--text-muted)", marginTop: "0.15rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Guía de uso
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "var(--surface2)", border: "1px solid var(--border)",
            color: "var(--text-muted)", cursor: "pointer", fontSize: "0.9rem",
            borderRadius: 8, width: 32, height: 32, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Secciones acordeón */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {readme.sections.map((s, i) => (
            <div key={i} style={{ borderBottom: "1px solid var(--border)" }}>
              <button
                onClick={() => setSeccionAbierta(seccionAbierta === i ? -1 : i)}
                style={{
                  width: "100%", padding: "0.85rem 1.25rem",
                  background: seccionAbierta === i ? "var(--surface2)" : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  transition: "background 0.15s",
                }}>
                <span style={{
                  fontFamily: "var(--font-display)", fontWeight: 700,
                  fontSize: "0.82rem", color: seccionAbierta === i ? "var(--cyan)" : "var(--text)",
                }}>{s.title}</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.65rem",
                  color: "var(--text-muted)", marginLeft: "0.5rem", flexShrink: 0,
                }}>{seccionAbierta === i ? "▲" : "▼"}</span>
              </button>
              {seccionAbierta === i && (
                <div style={{
                  padding: "0.1rem 1.25rem 1rem",
                  fontFamily: "var(--font-mono)", fontSize: "0.72rem",
                  color: "var(--text)", lineHeight: 1.8,
                  whiteSpace: "pre-line",
                }}>
                  {s.text}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "0.75rem 1.25rem", borderTop: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "var(--surface)",
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>
            {readme.sections.length} secciones
          </span>
          <button onClick={onClose} style={{
            background: "var(--cyan-dim)", color: "var(--cyan)",
            border: "1px solid rgba(34,211,238,0.3)", borderRadius: 8,
            padding: "0.45rem 1.2rem", fontFamily: "var(--font-display)",
            fontWeight: 700, fontSize: "0.78rem", cursor: "pointer",
          }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
