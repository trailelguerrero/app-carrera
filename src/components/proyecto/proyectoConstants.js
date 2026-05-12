/**
 * proyectoConstants.js — Tarea 3.3
 * Constantes, datos semilla, helpers y configuración del módulo Proyecto.
 */

export const diasHasta = (fecha) => Math.ceil((new Date(fecha) - new Date()) / 86400000);
export const fmt = (d) => d ? new Date(d).toLocaleDateString("es-ES", { day:"2-digit", month:"short" }) : "—";

export const AREAS = [
  { id:"permisos",      label:"Permisos y Legal",      icon:"🏛️", color:"#818cf8" },
  { id:"economico",     label:"Económico",              icon:"💰", color:"#f59e0b" },
  { id:"comunicacion",  label:"Comunicación y RRSS",    icon:"📣", color:"#f472b6" },
  { id:"patrocinadores",label:"Patrocinadores",         icon:"🤝", color:"#34d399" },
  { id:"voluntarios",   label:"Voluntarios",            icon:"👥", color:"#22d3ee" },
  { id:"ruta",          label:"Ruta y Señalización",    icon:"🏔️", color:"#fb923c" },
  { id:"logistica",     label:"Logística y Material",   icon:"📦", color:"#a78bfa" },
  { id:"comercial",     label:"Comercial",              icon:"🛒", color:"#2dd4bf" },
  { id:"sanitario",     label:"Sanitario",              icon:"🏥", color:"#f43f5e" },
  { id:"diaD",          label:"Día de Carrera",         icon:"🏁", color:"#f87171" },
];

export const ESTADOS = ["pendiente","en curso","completado","bloqueado"];
export const PRIORIDADES = ["alta","media","baja"];

export const EST_CFG = {
  pendiente:  { color:"#94a3b8", bg:"var(--surface3)", label:"Pendiente" },
  "en curso": { color:"#22d3ee", bg:"var(--cyan-dim)",  label:"En curso" },
  completado: { color:"#34d399", bg:"var(--green-dim)",  label:"Completado" },
  bloqueado:  { color:"#f87171", bg:"var(--red-dim)", label:"Bloqueado" },
};
export const PRI_CFG = {
  alta:  { color:"#f87171", bg:"var(--red-dim)" },
  media: { color:"#fbbf24", bg:"var(--amber-dim)" },
  baja:  { color:"#94a3b8", bg:"var(--surface3)" },
};

// ─── EQUIPO DEFAULT ───────────────────────────────────────────────────────────
export const EQUIPO0 = [
  { id:1, nombre:"Iván García",    rol:"Director General",          area:"diaD",          color:"#22d3ee", email:"ivan@trailelguerrero.es",    telefono:"611 100 001" },
  { id:2, nombre:"María López",    rol:"Coordinadora de Voluntarios",area:"voluntarios",   color:"#f472b6", email:"maria@trailelguerrero.es",   telefono:"611 100 002" },
  { id:3, nombre:"Pedro Sánchez",  rol:"Responsable Logística",     area:"logistica",      color:"#fb923c", email:"pedro@trailelguerrero.es",   telefono:"611 100 003" },
  { id:4, nombre:"Laura Martín",   rol:"Comunicación y RRSS",       area:"comunicacion",   color:"#a78bfa", email:"laura@trailelguerrero.es",   telefono:"611 100 004" },
  { id:5, nombre:"Carlos Ruiz",    rol:"Tesorero y Patrocinadores", area:"economico",      color:"#34d399", email:"carlos@trailelguerrero.es",  telefono:"611 100 005" },
];

// ─── HITOS DEFAULT ────────────────────────────────────────────────────────────
export const HITOS0 = [
  { id:1, nombre:"Apertura inscripciones Early Bird", fecha:"2026-05-01", critico:true,  completado:false },
  { id:2, nombre:"Cierre de inscripciones",           fecha:"2026-08-15", critico:true,  completado:false },
  { id:3, nombre:"Entrega seguro federativo",         fecha:"2026-05-15", critico:true,  completado:false },
  { id:4, nombre:"Briefing general voluntarios",      fecha:"2026-08-28", critico:true,  completado:false },
  { id:5, nombre:"Trail El Guerrero 2026",            fecha:"2026-08-29", critico:true,  completado:false },
  { id:6, nombre:"Primer cobro patrocinadores",       fecha:"2026-06-01", critico:false, completado:false },
  { id:7, nombre:"Cierre diseño camisetas",           fecha:"2026-06-15", critico:false, completado:false },
  { id:8, nombre:"Pedido material avituallamiento",   fecha:"2026-07-15", critico:false, completado:false },
];

// ─── TAREAS DEFAULT ───────────────────────────────────────────────────────────
export const TAREAS0 = [
  // PERMISOS
  { id:1,  area:"permisos", titulo:"Solicitud autorización Ayuntamiento Candeleda", responsableId:1, fechaLimite:"2026-04-01", estado:"en curso",   prioridad:"alta",  notas:"Reunión prevista con alcaldía el 25 marzo", dependeDe:null },
  { id:2,  area:"permisos", titulo:"Contratación seguro RC del evento",             responsableId:5, fechaLimite:"2026-04-15", estado:"pendiente", prioridad:"alta",  notas:"Mínimo 600.000€ cobertura. Pedir presupuesto a Mapfre y Allianz", dependeDe:null },
  { id:3,  area:"permisos", titulo:"Tramitar licencia federativa colectiva",        responsableId:1, fechaLimite:"2026-05-10", estado:"pendiente", prioridad:"alta",  notas:"FEMM — Federación Española Montaña y Escalada", dependeDe:2 },
  { id:4,  area:"permisos", titulo:"Permiso de corte de tráfico Guardia Civil",    responsableId:1, fechaLimite:"2026-06-01", estado:"pendiente", prioridad:"alta",  notas:"Presentar plano de ruta y horario de corte", dependeDe:null },
  { id:5,  area:"permisos", titulo:"Comunicación a Protección Civil",              responsableId:1, fechaLimite:"2026-06-15", estado:"pendiente", prioridad:"media", notas:"Incluir plan de emergencias y contacto Cruz Roja", dependeDe:null },
  { id:6,  area:"permisos", titulo:"Aprobación bases del reglamento",              responsableId:1, fechaLimite:"2026-04-10", estado:"en curso",   prioridad:"alta",  notas:"Revisar con asesor deportivo. Publicar en web antes de abrir inscripciones", dependeDe:null },
  // ECONÓMICO
  { id:7,  area:"economico", titulo:"Cierre presupuesto definitivo 2026",          responsableId:5, fechaLimite:"2026-04-01", estado:"en curso",   prioridad:"alta",  notas:"Módulo de presupuesto actualizado — exportar resumen ejecutivo", dependeDe:null },
  { id:8,  area:"economico", titulo:"Apertura cuenta bancaria del evento",         responsableId:5, fechaLimite:"2026-04-15", estado:"pendiente", prioridad:"media", notas:"Cuenta separada para ingresos y gastos del evento", dependeDe:null },
  { id:9,  area:"economico", titulo:"Configurar plataforma de pago inscripciones", responsableId:5, fechaLimite:"2026-04-20", estado:"pendiente", prioridad:"alta",  notas:"SportEntry o Runnea — revisar comisiones", dependeDe:null },
  { id:10, area:"economico", titulo:"Primer seguimiento cobro patrocinadores",     responsableId:5, fechaLimite:"2026-06-01", estado:"pendiente", prioridad:"alta",  notas:"Confirmados deben tener primera transferencia recibida", dependeDe:null },
  { id:11, area:"economico", titulo:"Revisión P&L a mitad de inscripciones",       responsableId:5, fechaLimite:"2026-07-01", estado:"pendiente", prioridad:"media", notas:"Comparar inscritos reales vs escenario del presupuesto", dependeDe:null },
  { id:12, area:"economico", titulo:"Cierre económico post-evento",                responsableId:5, fechaLimite:"2026-09-15", estado:"pendiente", prioridad:"alta",  notas:"Balance final, facturas pendientes, informe para patrocinadores", dependeDe:null },
  // COMUNICACIÓN
  { id:13, area:"comunicacion", titulo:"Diseño identidad visual 2026 (logo, paleta)", responsableId:4, fechaLimite:"2026-04-01", estado:"en curso",   prioridad:"alta",  notas:"Actualizar logo con año. Definir paleta colores de la edición", dependeDe:null },
  { id:14, area:"comunicacion", titulo:"Lanzamiento web trail 2026 actualizada",      responsableId:4, fechaLimite:"2026-04-15", estado:"pendiente", prioridad:"alta",  notas:"Incluir bases, recorridos, fotos edición anterior", dependeDe:6 },
  { id:15, area:"comunicacion", titulo:"Campaña anuncio apertura inscripciones",      responsableId:4, fechaLimite:"2026-04-28", estado:"pendiente", prioridad:"alta",  notas:"Post Instagram + Facebook + historia + newsletter. Programar con 3 días de antelación", dependeDe:null },
  { id:16, area:"comunicacion", titulo:"Diseño y producción cartel oficial",          responsableId:4, fechaLimite:"2026-05-15", estado:"pendiente", prioridad:"media", notas:"Formato A3 para impresión + versión digital RRSS", dependeDe:13 },
  { id:17, area:"comunicacion", titulo:"Vídeo promo para RRSS (60s)",                responsableId:4, fechaLimite:"2026-06-01", estado:"pendiente", prioridad:"media", notas:"Usar footage edición 2025. Incluir corredores y paisaje Gredos", dependeDe:null },
  { id:18, area:"comunicacion", titulo:"Comunicado cierre inscripciones + lista espera",responsableId:4, fechaLimite:"2026-08-16", estado:"pendiente", prioridad:"media", notas:"Publicar listado provisional de inscritos por distancia", dependeDe:null },
  { id:19, area:"comunicacion", titulo:"Dossier info corredores (PDF)",               responsableId:4, fechaLimite:"2026-08-20", estado:"pendiente", prioridad:"alta",  notas:"Recogida dorsales, parking, avituallamiento, normas, contacto emergencias", dependeDe:null },
  { id:20, area:"comunicacion", titulo:"Publicación resultados oficiales",             responsableId:4, fechaLimite:"2026-08-30", estado:"pendiente", prioridad:"alta",  notas:"Subir a web + publicar clasificación en RRSS dentro de las 24h", dependeDe:null },
  // PATROCINADORES
  { id:21, area:"patrocinadores", titulo:"Dossier de patrocinio 2026",               responsableId:5, fechaLimite:"2026-03-31", estado:"en curso",   prioridad:"alta",  notas:"Incluir métricas edición anterior, propuesta de valor, niveles y contraprestaciones", dependeDe:null },
  { id:22, area:"patrocinadores", titulo:"Contacto patrocinadores habituales edición anterior", responsableId:5, fechaLimite:"2026-04-01", estado:"en curso", prioridad:"alta", notas:"Llamar antes de enviar dossier. Turismo Candeleda, Decathlon, Bar El Guerrero", dependeDe:21 },
  { id:23, area:"patrocinadores", titulo:"Prospección nuevos patrocinadores locales", responsableId:5, fechaLimite:"2026-04-15", estado:"pendiente", prioridad:"media", notas:"Empresas de Candeleda y Ávila. Preparar lista de 20 prospectos", dependeDe:21 },
  { id:24, area:"patrocinadores", titulo:"Cierre acuerdos patrocinio nivel Oro",     responsableId:5, fechaLimite:"2026-05-01", estado:"pendiente", prioridad:"alta",  notas:"Necesario para bloquear espacio en camiseta antes de diseño", dependeDe:null },
  { id:25, area:"patrocinadores", titulo:"Firma contratos y facturas patrocinadores", responsableId:5, fechaLimite:"2026-05-15", estado:"pendiente", prioridad:"alta",  notas:"Todos los confirmados deben tener contrato firmado antes del 15 mayo", dependeDe:22 },
  { id:26, area:"patrocinadores", titulo:"Entrega contraprestaciones digitales",      responsableId:4, fechaLimite:"2026-07-01", estado:"pendiente", prioridad:"media", notas:"Logos en web, menciones en RRSS, newsletter patrocinadores", dependeDe:25 },
  // VOLUNTARIOS
  { id:27, area:"voluntarios", titulo:"Definir estructura de puestos y necesidades",  responsableId:2, fechaLimite:"2026-04-15", estado:"completado", prioridad:"alta",  notas:"Hecho — 12 puestos, 41 voluntarios necesarios", dependeDe:null },
  { id:28, area:"voluntarios", titulo:"Abrir formulario público de inscripción voluntarios", responsableId:2, fechaLimite:"2026-05-01", estado:"pendiente", prioridad:"alta", notas:"Usar módulo de voluntarios. Publicar enlace en web y RRSS", dependeDe:27 },
  { id:29, area:"voluntarios", titulo:"Diseño y pedido camisetas voluntarios",        responsableId:2, fechaLimite:"2026-06-15", estado:"pendiente", prioridad:"alta",  notas:"Necesitar logos patrocinadores cerrados. Mínimo 6 semanas fabricación", dependeDe:24 },
  { id:30, area:"voluntarios", titulo:"Cierre de plazas de voluntarios (objetivo 45)",responsableId:2, fechaLimite:"2026-07-15", estado:"pendiente", prioridad:"alta",  notas:"Confirmar por escrito — carta informativa con puesto asignado y horario", dependeDe:28 },
  { id:31, area:"voluntarios", titulo:"Envío instrucciones y documentación voluntarios",responsableId:2, fechaLimite:"2026-08-20", estado:"pendiente", prioridad:"alta",  notas:"PDF con puesto, horario, punto de encuentro, walkie asignado, protocolo emergencias", dependeDe:30 },
  { id:32, area:"voluntarios", titulo:"Briefing presencial voluntarios",              responsableId:2, fechaLimite:"2026-08-28", estado:"pendiente", prioridad:"alta",  notas:"18:00h. Sede social. Entrega camisetas, walkies, documentación de emergencias", dependeDe:31 },
  // RUTA
  { id:33, area:"ruta", titulo:"Revisión y homologación recorridos TG7/TG13/TG25",   responsableId:3, fechaLimite:"2026-04-30", estado:"pendiente", prioridad:"alta",  notas:"Recorrer a pie y medir con GPS. Subir track oficial a web", dependeDe:null },
  { id:34, area:"ruta", titulo:"Solicitar informe de riesgo de incendio (verano)",    responsableId:1, fechaLimite:"2026-06-01", estado:"pendiente", prioridad:"alta",  notas:"Obligatorio en Castilla y León para eventos estivales en zona forestal", dependeDe:null },
  { id:35, area:"ruta", titulo:"Colocación señalización permanente de prueba",        responsableId:3, fechaLimite:"2026-08-25", estado:"pendiente", prioridad:"alta",  notas:"Balizas de control, señales de dirección en cruces principales", dependeDe:33 },
  { id:36, area:"ruta", titulo:"Inspección final de ruta completa",                   responsableId:3, fechaLimite:"2026-08-27", estado:"pendiente", prioridad:"alta",  notas:"Recorrer con vehículo. Confirmar que todos los puntos son accesibles para emergencias", dependeDe:35 },
  { id:37, area:"ruta", titulo:"Señalización día de carrera (balizas)",               responsableId:3, fechaLimite:"2026-08-29", estado:"pendiente", prioridad:"alta",  notas:"Salida 04:30h. Seguir protocolo logística. Pick-up señalización cargado el día anterior", dependeDe:36 },
  // LOGÍSTICA
  { id:38, area:"logistica", titulo:"Inventario y revisión material del año anterior", responsableId:3, fechaLimite:"2026-04-30", estado:"pendiente", prioridad:"media", notas:"Revisar estado de carpas, mesas, walkie-talkies, material médico", dependeDe:null },
  { id:39, area:"logistica", titulo:"Lista definitiva de material necesario",          responsableId:3, fechaLimite:"2026-05-15", estado:"pendiente", prioridad:"alta",  notas:"Cruzar con módulo de inventario. Identificar qué hay que comprar o alquilar", dependeDe:38 },
  { id:40, area:"logistica", titulo:"Contratación empresa cronometraje",              responsableId:1, fechaLimite:"2026-05-01", estado:"pendiente", prioridad:"alta",  notas:"Solicitar presupuesto a 3 empresas. Experiencia en trail obligatoria", dependeDe:null },
  { id:41, area:"logistica", titulo:"Confirmación servicio médico (Cruz Roja)",       responsableId:1, fechaLimite:"2026-05-15", estado:"pendiente", prioridad:"alta",  notas:"Ambulancia + 2 sanitarios titulados. Protocolo de comunicación", dependeDe:null },
  { id:42, area:"logistica", titulo:"Pedido avituallamiento y material fungible",     responsableId:3, fechaLimite:"2026-07-15", estado:"pendiente", prioridad:"alta",  notas:"Agua, isotónico, fruta, geles. Confirmar cantidades con módulo logística", dependeDe:39 },
  { id:43, area:"logistica", titulo:"Organización parking y accesos",                 responsableId:3, fechaLimite:"2026-07-30", estado:"pendiente", prioridad:"media", notas:"Coordinación con Ayuntamiento para habilitación zona parking extra", dependeDe:4 },
  { id:44, area:"logistica", titulo:"Preparar plan de rutas de vehículos (día D)",   responsableId:3, fechaLimite:"2026-08-15", estado:"pendiente", prioridad:"alta",  notas:"Módulo logística — rutas de reparto y recogida por puesto y horario", dependeDe:42 },
  { id:45, area:"logistica", titulo:"Carga de vehículos y verificación material",    responsableId:3, fechaLimite:"2026-08-28", estado:"pendiente", prioridad:"alta",  notas:"Verificar con checklist logística. Todo listo antes de las 22:00", dependeDe:44 },
  // DÍA D
  { id:46, area:"diaD", titulo:"Reunión final de coordinación equipo organizador",   responsableId:1, fechaLimite:"2026-08-22", estado:"pendiente", prioridad:"alta",  notas:"Revisar todos los módulos. Confirmar que todo está en verde. Presencial.", dependeDe:null },
  { id:47, area:"diaD", titulo:"Impresión y preparación de dorsales",               responsableId:2, fechaLimite:"2026-08-25", estado:"pendiente", prioridad:"alta",  notas:"Ordenar por distancia y número. Preparar bolsas con chip, dorsal y obsequio", dependeDe:null },
  { id:48, area:"diaD", titulo:"Montaje zona meta y salida",                        responsableId:3, fechaLimite:"2026-08-29", estado:"pendiente", prioridad:"alta",  notas:"Inicio 05:00h. Carpas, arco, cronometraje, megafonía, señalización zona", dependeDe:45 },
  { id:49, area:"diaD", titulo:"Recogida de material post-evento",                  responsableId:3, fechaLimite:"2026-08-29", estado:"pendiente", prioridad:"alta",  notas:"Inicio a partir de cierre TG25. Vehículo recorre puestos en orden inverso", dependeDe:null },
  { id:50, area:"diaD", titulo:"Informe post-evento y memoria",                     responsableId:1, fechaLimite:"2026-09-15", estado:"pendiente", prioridad:"media", notas:"Balance, incidencias, estadísticas, valoración de mejoras para 2027", dependeDe:null },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const getArea   = (id) => AREAS.find(a => a.id === id) || AREAS[0];
export const iniciales = (nombre) => nombre.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase();
