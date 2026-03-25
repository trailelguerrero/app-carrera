import { useState, useMemo, useCallback, useEffect } from "react";
import dataService, { useData } from "@/lib/dataService";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";
// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LS = "teg_proyecto_v1";
const EVENT_DATE = new Date("2026-08-29");
const TODAY = new Date();
const genId = (arr) => arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
const diasHasta = (fecha) => Math.ceil((new Date(fecha) - TODAY) / 86400000);
const fmt = (d) => d ? new Date(d).toLocaleDateString("es-ES", { day:"2-digit", month:"short" }) : "—";

const AREAS = [
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

const ESTADOS = ["pendiente","en curso","completado","bloqueado"];
const PRIORIDADES = ["alta","media","baja"];

const EST_CFG = {
  pendiente:  { color:"#94a3b8", bg:"rgba(148,163,184,.12)", label:"Pendiente" },
  "en curso": { color:"#22d3ee", bg:"rgba(34,211,238,.12)",  label:"En curso" },
  completado: { color:"#34d399", bg:"rgba(52,211,153,.12)",  label:"Completado" },
  bloqueado:  { color:"#f87171", bg:"rgba(248,113,113,.12)", label:"Bloqueado" },
};
const PRI_CFG = {
  alta:  { color:"#f87171", bg:"rgba(248,113,113,.12)" },
  media: { color:"#fbbf24", bg:"rgba(251,191,36,.12)" },
  baja:  { color:"#94a3b8", bg:"rgba(148,163,184,.12)" },
};

// ─── EQUIPO DEFAULT ───────────────────────────────────────────────────────────
const EQUIPO0 = [
  { id:1, nombre:"Iván García",    rol:"Director General",          area:"diaD",          color:"#22d3ee", email:"ivan@trailelguerrero.es",    telefono:"611 100 001" },
  { id:2, nombre:"María López",    rol:"Coordinadora de Voluntarios",area:"voluntarios",   color:"#f472b6", email:"maria@trailelguerrero.es",   telefono:"611 100 002" },
  { id:3, nombre:"Pedro Sánchez",  rol:"Responsable Logística",     area:"logistica",      color:"#fb923c", email:"pedro@trailelguerrero.es",   telefono:"611 100 003" },
  { id:4, nombre:"Laura Martín",   rol:"Comunicación y RRSS",       area:"comunicacion",   color:"#a78bfa", email:"laura@trailelguerrero.es",   telefono:"611 100 004" },
  { id:5, nombre:"Carlos Ruiz",    rol:"Tesorero y Patrocinadores", area:"economico",      color:"#34d399", email:"carlos@trailelguerrero.es",  telefono:"611 100 005" },
];

// ─── HITOS DEFAULT ────────────────────────────────────────────────────────────
const HITOS0 = [
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
const TAREAS0 = [
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

// ─── STORAGE ──────────────────────────────────────────────────────────────────


// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getArea = (id) => AREAS.find(a => a.id === id) || AREAS[0];
const iniciales = (nombre) => nombre.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase();

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]         = useState("dashboard");
  const [rawTareas, setTareas]   = useData(LS+"_tareas", TAREAS0);
  const [rawHitos, setHitos]     = useData(LS+"_hitos", HITOS0);
  const [rawEquipo, setEquipo]   = useData(LS+"_equipo", EQUIPO0);

  const tareas = Array.isArray(rawTareas) ? rawTareas : [];
  const hitos = Array.isArray(rawHitos) ? rawHitos : [];
  const equipo = Array.isArray(rawEquipo) ? rawEquipo : [];
  const [modal, setModal]     = useState(null);
  const [ficha, setFicha]     = useState(null); // {tipo,data} — vista previa
  const [delConf, setDelConf] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 850);
  const [busquedaGlobal, setBusquedaGlobal] = useState("");
  const [vistaTablon, setVistaTablon] = useState("lista"); // "lista" | "kanban"

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 850);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // filters
  const [filtroArea, setFiltroArea]           = useState("todas");
  const [filtroResponsable, setFiltroResponsable] = useState("todos");
  const [filtroEstado, setFiltroEstado]       = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [busqueda, setBusqueda]               = useState("");

  // Los datos se guardan automáticamente en Neon via useData().
  // Esta función solo sincroniza otras pestañas abiertas.

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const diasEvento = diasHasta("2026-08-29");
    const total = tareas.length;
    const completadas = tareas.filter(t => t.estado === "completado").length;
    const bloqueadas = tareas.filter(t => t.estado === "bloqueado").length;
    const enCurso = tareas.filter(t => t.estado === "en curso").length;
    const pct = total ? Math.round(completadas/total*100) : 0;
    const criticas = tareas.filter(t =>
      t.estado !== "completado" && t.fechaLimite &&
      diasHasta(t.fechaLimite) <= 14 && diasHasta(t.fechaLimite) >= 0
    );
    const vencidas = tareas.filter(t =>
      t.estado !== "completado" && t.fechaLimite && diasHasta(t.fechaLimite) < 0
    );
    const porArea = AREAS.map(a => {
      const at = tareas.filter(t => t.area === a.id);
      const done = at.filter(t => t.estado === "completado").length;
      const blk = at.filter(t => t.estado === "bloqueado").length;
      const venc = at.filter(t => t.estado !== "completado" && t.fechaLimite && diasHasta(t.fechaLimite) < 0).length;
      const semaforo = venc > 0 ? "red" : blk > 0 ? "amber" : done === at.length ? "green" : "blue";
      return { ...a, total:at.length, done, blk, venc, semaforo, pct: at.length ? Math.round(done/at.length*100) : 0 };
    });
    const porPersona = equipo.map(p => {
      const pt = tareas.filter(t => t.responsableId === p.id && t.estado !== "completado");
      const urgentes = pt.filter(t => t.fechaLimite && diasHasta(t.fechaLimite) <= 14);
      return { ...p, pendientes: pt.length, urgentes: urgentes.length };
    }).sort((a,b) => b.urgentes - a.urgentes);
    const hitosProx = [...hitos].filter(h => !h.completado).sort((a,b) => a.fecha.localeCompare(b.fecha)).slice(0,5);
    return { diasEvento, total, completadas, bloqueadas, enCurso, pct, criticas, vencidas, porArea, porPersona, hitosProx };
  }, [tareas, hitos, equipo]);

  // ── Tareas filtradas ───────────────────────────────────────────────────────
  const tareasFiltradas = useMemo(() => {
    return tareas.filter(t => {
      if (filtroArea !== "todas" && t.area !== filtroArea) return false;
      if (filtroResponsable !== "todos" && String(t.responsableId) !== filtroResponsable) return false;
      if (filtroEstado !== "todos" && t.estado !== filtroEstado) return false;
      if (filtroPrioridad !== "todas" && t.prioridad !== filtroPrioridad) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!t.titulo.toLowerCase().includes(q) && !(t.notas||"").toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a,b) => (a.fechaLimite||"").localeCompare(b.fechaLimite||""));
  }, [tareas, filtroArea, filtroResponsable, filtroEstado, filtroPrioridad, busqueda]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const saveTarea = (t) => {
    if (t.id) setTareas(p => p.map(x => x.id===t.id ? t : x));
    else setTareas(p => [...p, {...t, id:genId(p)}]);
    setModal(null);
  };
  const saveHito = (h) => {
    if (h.id) setHitos(p => p.map(x => x.id===h.id ? h : x));
    else setHitos(p => [...p, {...h, id:genId(p)}]);
    setModal(null);
  };
  const savePersona = (p) => {
    if (p.id) setEquipo(prev => prev.map(x => x.id===p.id ? p : x));
    else setEquipo(prev => [...prev, {...p, id:genId(prev)}]);
    setModal(null);
  };
  const doDelete = () => {
    if (!delConf) return;
    const {tipo,id} = delConf;
    if (tipo==="tarea") setTareas(p => p.filter(x => x.id!==id));
    if (tipo==="hito") setHitos(p => p.filter(x => x.id!==id));
    if (tipo==="persona") setEquipo(p => p.filter(x => x.id!==id));
    setDelConf(null);
  };
  const updEstado = (id, estado) => setTareas(p => p.map(t => t.id===id ? {...t,estado} : t));
  const updHito = (id, field, val) => setHitos(p => p.map(h => h.id===id ? {...h,[field]:val} : h));

  const TABS = [
    {id:"dashboard",  icon:"📊", label:"Dashboard"},
    {id:"tablón",     icon:"📋", label:"Tablón"},
    {id:"gantt",      icon:"📅", label:"Calendario"},
    {id:"equipo",     icon:"👥", label:"Equipo"},
    {id:"hitos",      icon:"🏁", label:"Hitos"},
  ];

  return (
    <>
      <style>{BLOCK_CSS + CSS}</style>
      <div className="block-container">

        {/* HEADER */}
        <div className="block-header">
          <div>
            <h1 className="block-title">🏔️ Proyecto</h1>
            <div className="block-title-sub">Gestión & Planificación · {stats.diasEvento} días para la carrera</div>
          </div>
          <div className="block-actions">
            {/* Búsqueda global */}
            <div style={{display:"flex",alignItems:"center",gap:".4rem",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",padding:".28rem .6rem",transition:"border-color .15s"}}
              onFocus={e=>e.currentTarget.style.borderColor="var(--violet)"}
              onBlur={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <span style={{fontSize:".8rem",opacity:.5}}>🔍</span>
              <input
                value={busquedaGlobal}
                onChange={e=>{setBusquedaGlobal(e.target.value); if(e.target.value && tab!=="tablón") setTab("tablón");}}
                placeholder="Buscar en todo el proyecto…"
                style={{background:"none",border:"none",color:"var(--text)",fontFamily:"var(--font-display)",fontSize:".78rem",outline:"none",width: isMobile ? 120 : 200}}
              />
              {busquedaGlobal && <button onClick={()=>setBusquedaGlobal("")} style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:".75rem",padding:0}}>✕</button>}
            </div>
            {busquedaGlobal && tareasFiltradas && (
              <span className="badge badge-violet" style={{whiteSpace:"nowrap"}}>
                🔍 {tareasFiltradas.length} resultado{tareasFiltradas.length !== 1 ? "s" : ""}
              </span>
            )}
            {stats.vencidas.length > 0 && <span className="badge badge-red">⏰ {stats.vencidas.length} vencidas</span>}
            {stats.bloqueadas > 0 && <span className="badge badge-amber">🔒 {stats.bloqueadas} bloqueadas</span>}
            <span className={`badge ${stats.pct>=80?"badge-green":stats.pct>=50?"badge-amber":"badge-red"}`}>{stats.pct}% completado</span>
            <button className="btn btn-primary" onClick={() => setModal({tipo:"tarea",data:null})}>+ Nueva tarea</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid mb">
          <div className="kpi green">
            <div className="kpi-label">✅ Completadas</div>
            <div className="kpi-value" style={{color:"var(--green)"}}>{stats.pct}%</div>
            <div className="kpi-sub">{stats.completadas} de {stats.total} tareas</div>
          </div>
          <div className="kpi cyan">
            <div className="kpi-label">▶️ En curso</div>
            <div className="kpi-value" style={{color:"var(--cyan)"}}>{stats.enCurso}</div>
            <div className="kpi-sub">tareas activas</div>
          </div>
          <div className={`kpi ${stats.vencidas.length>0?"red":"green"}`}>
            <div className="kpi-label">⏰ Vencidas</div>
            <div className="kpi-value" style={{color:stats.vencidas.length>0?"var(--red)":"var(--green)"}}>{stats.vencidas.length}</div>
            <div className="kpi-sub">fecha límite superada</div>
          </div>
          <div className={`kpi ${stats.bloqueadas>0?"amber":"green"}`}>
            <div className="kpi-label">🔒 Bloqueadas</div>
            <div className="kpi-value" style={{color:stats.bloqueadas>0?"var(--amber)":"var(--green)"}}>{stats.bloqueadas}</div>
            <div className="kpi-sub">requieren acción</div>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={cls("tab-btn", tab===t.id && "active")} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
              {t.id==="tablón" && stats.vencidas.length>0 && <span className="badge badge-red" style={{marginLeft:"0.3rem"}}>{stats.vencidas.length}</span>}
              {t.id==="hitos" && <span className="badge badge-cyan" style={{marginLeft:"0.3rem"}}>{hitos.filter(h=>!h.completado).length}</span>}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div key={tab}>
          {tab==="dashboard" && <TabDash stats={stats} equipo={equipo} setTab={setTab} setModal={setModal} setFicha={setFicha} tareas={tareas} hitos={hitos} updEstado={updEstado} isMobile={isMobile} setFiltroArea={setFiltroArea} setFiltroResponsable={setFiltroResponsable} />}
          {tab==="tablón" && <TabTablon tareas={tareasFiltradas} todasTareas={tareas} equipo={equipo}
            filtroArea={filtroArea} setFiltroArea={setFiltroArea}
            filtroResponsable={filtroResponsable} setFiltroResponsable={setFiltroResponsable}
            filtroEstado={filtroEstado} setFiltroEstado={setFiltroEstado}
            filtroPrioridad={filtroPrioridad} setFiltroPrioridad={setFiltroPrioridad}
            busqueda={busquedaGlobal || busqueda} setBusqueda={(v)=>{setBusqueda(v); setBusquedaGlobal(v);}}
            updEstado={updEstado} setModal={setModal} setDelConf={setDelConf} setFicha={setFicha}
            vista={vistaTablon} setVista={setVistaTablon} />}
          {tab==="gantt"  && <TabGantt tareas={tareas} hitos={hitos} equipo={equipo} setModal={setModal} setFicha={setFicha} />}
          {tab==="equipo" && <TabEquipo equipo={equipo} tareas={tareas} setModal={setModal} setDelConf={setDelConf} setFicha={setFicha} />}
          {tab==="hitos"  && <TabHitos hitos={hitos} updHito={updHito} setModal={setModal} setDelConf={setDelConf} setFicha={setFicha} />}
        </div>
      </div>

      {ficha?.tipo==="tarea"   && <FichaProyecto key={"f"+ficha.data.id} ficha={ficha} equipo={equipo} onClose={()=>setFicha(null)} onEditar={()=>{setFicha(null);setModal({tipo:ficha.tipo,data:ficha.data});}} onEliminar={()=>{setFicha(null);setDelConf({tipo:ficha.tipo,id:ficha.data.id});}} />}
      {ficha?.tipo==="hito"    && <FichaProyecto key={"f"+ficha.data.id} ficha={ficha} equipo={equipo} onClose={()=>setFicha(null)} onEditar={()=>{setFicha(null);setModal({tipo:ficha.tipo,data:ficha.data});}} onEliminar={()=>{setFicha(null);setDelConf({tipo:ficha.tipo,id:ficha.data.id});}} />}
      {ficha?.tipo==="persona" && <FichaProyecto key={"f"+ficha.data.id} ficha={ficha} equipo={equipo} onClose={()=>setFicha(null)} onEditar={()=>{setFicha(null);setModal({tipo:ficha.tipo,data:ficha.data});}} onEliminar={()=>{setFicha(null);setDelConf({tipo:ficha.tipo,id:ficha.data.id});}} />}
      {modal?.tipo==="tarea"   && <ModalTarea   key={modal.data?.id||"new"} data={modal.data} equipo={equipo} tareas={tareas} onSave={saveTarea}   onClose={() => setModal(null)} />}
      {modal?.tipo==="hito"    && <ModalHito    key={modal.data?.id||"new"} data={modal.data}                                  onSave={saveHito}    onClose={() => setModal(null)} />}
      {modal?.tipo==="persona" && <ModalPersona key={modal.data?.id||"new"} data={modal.data}                                  onSave={savePersona} onClose={() => setModal(null)} />}
      {delConf && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setDelConf(null)}>
          <div className="modal" style={{maxWidth:340,textAlign:"center"}}>
            <div className="mbody" style={{paddingTop:"1.5rem"}}>
              <div style={{fontSize:"2.5rem",marginBottom:".6rem"}}>⚠️</div>
              <div style={{fontWeight:700,fontSize:".9rem",marginBottom:".4rem"}}>¿Eliminar este elemento?</div>
              <div className="mono xs muted">Esta acción no se puede deshacer.</div>
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={() => setDelConf(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={doDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── TAB DASHBOARD ────────────────────────────────────────────────────────────
function TabDash({ stats, equipo, setTab, setModal, setFicha, tareas, hitos, updEstado, isMobile, setFiltroArea, setFiltroResponsable }) {
  return (
    <>
      {/* Semáforo por área */}
      <div className="card" style={{marginBottom:".85rem"}}>
        <div className="ct">🚦 Estado por área</div>
        <div className="area-grid">
          {stats.porArea.map(a => {
            const sc = {green:"#34d399", amber:"#fbbf24", red:"#f87171", blue:"#22d3ee"}[a.semaforo];
            return (
              <div key={a.id} className="area-card" style={{borderTopColor:a.color}}
                onClick={() => { setFiltroArea(a.id); setTab("tablón"); }}
                title={`Ver tareas de ${a.label}`}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".4rem"}}>
                  <div>
                    <div style={{fontSize:"1.1rem",marginBottom:".15rem"}}>{a.icon}</div>
                    <div style={{fontSize:".72rem",fontWeight:700,color:a.color,lineHeight:1.2}}>{a.label}</div>
                  </div>
                  <div style={{width:10,height:10,borderRadius:"50%",background:sc,boxShadow:`0 0 8px ${sc}88`,flexShrink:0,marginTop:2}}/>
                </div>
                <div className="pbar" style={{marginBottom:".3rem"}}>
                  <div className="pfill" style={{width:`${a.pct}%`,background:a.color}}/>
                </div>
                <div className="mono xs muted">{a.done}/{a.total} · {a.pct}%</div>
                {a.venc > 0 && <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"#f87171",marginTop:".15rem"}}>⚠ {a.venc} vencida{a.venc!==1?"s":""}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="twocol">
        {/* Tareas urgentes */}
        <div className="card">
          <div className="ct">🔴 Urgente — próximos 14 días</div>
          {stats.criticas.length === 0 && stats.vencidas.length === 0 &&
            <div className="empty-sm">Sin tareas urgentes</div>}
          {[...stats.vencidas, ...stats.criticas].slice(0,8).map(t => {
            const area = getArea(t.area);
            const dias = diasHasta(t.fechaLimite);
            const p = equipo.find(e => e.id===t.responsableId);
            return (
              <div key={t.id} className="urg-row" style={{cursor:"pointer"}}
                onClick={() => setFicha({tipo:"tarea", data:t})}
                title="Click para ver ficha de la tarea"
              >
                <div className="urg-dot" style={{background:area.color}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div className="urg-titulo">{t.titulo}</div>
                  <div className="mono xs muted">{area.icon} {area.label} {p ? `· ${p.nombre.split(" ")[0]}` : ""}</div>
                </div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,
                  color:dias<0?"#f87171":dias<=7?"#fbbf24":"#22d3ee",
                  background:dias<0?"rgba(248,113,113,.1)":dias<=7?"rgba(251,191,36,.1)":"rgba(34,211,238,.1)",
                  padding:".1rem .35rem",borderRadius:4,flexShrink:0}}>
                  {dias<0?`-${Math.abs(dias)}d`:`${dias}d`}
                </div>
              </div>
            );
          })}
          <button className="btn btn-ghost mt1 w100" onClick={() => setTab("tablón")}>Ver todas las tareas →</button>
        </div>

        {/* Carga por persona */}
        <div className="card">
          <div className="ct">👥 Carga del equipo</div>
          {stats.porPersona.map(p => (
            <div key={p.id} className="carga-row" style={{cursor:"pointer"}}
              onClick={() => { setFiltroResponsable(String(p.id)); setTab("tablón"); }}
              title={`Ver tareas de ${p.nombre}`}>
              <div className="avatar" style={{background:p.color+"22",border:`2px solid ${p.color}55`,color:p.color}}>
                {iniciales(p.nombre)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:".76rem",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.nombre}</div>
                <div className="mono xs muted">{p.pendientes} pendiente{p.pendientes!==1?"s":""}{p.urgentes>0?` · ${p.urgentes} urgente${p.urgentes!==1?"s":""}`:""}</div>
              </div>
              <div style={{display:"flex",gap:".25rem",flexShrink:0}}>
                {p.urgentes > 0 && <span className="badge" style={{background:"rgba(248,113,113,.12)",color:"#f87171"}}>{p.urgentes}⚡</span>}
                <span className="badge" style={{background:"rgba(148,163,184,.1)",color:"#94a3b8"}}>{p.pendientes}</span>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost mt1 w100" onClick={() => setTab("equipo")}>Ver detalle del equipo →</button>
        </div>
      </div>

      {/* Próximos hitos */}
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem"}}>
          <div className="ct" style={{marginBottom:0}}>🏁 Próximos hitos</div>
          <button className="btn btn-sm btn-ghost" onClick={() => setTab("hitos")}>Ver todos</button>
        </div>
        <div className="hitos-timeline">
          {stats.hitosProx.map((h,i) => {
            const dias = diasHasta(h.fecha);
            const urgente = dias <= 30 && dias >= 0;
            const vencido = dias < 0;
            return (
              <div key={h.id} className="hito-row">
                <div className="hito-fecha">
                  <div className="mono xs" style={{color:vencido?"#f87171":urgente?"#fbbf24":"#22d3ee",fontWeight:700}}>{fmt(h.fecha)}</div>
                  <div className="mono xs muted">{vencido?`-${Math.abs(dias)}d`:`${dias}d`}</div>
                </div>
                <div className="hito-connector">
                  <div className="hito-gem" style={{background:h.critico?"#f87171":"#22d3ee",boxShadow:h.critico?"0 0 8px #f8717166":"0 0 8px #22d3ee66"}}/>
                  {i < stats.hitosProx.length-1 && <div className="hito-line"/>}
                </div>
                <div className="hito-label">
                  <div style={{fontSize:".78rem",fontWeight:h.critico?700:500}}>{h.nombre}</div>
                  {h.critico && <span className="badge" style={{background:"rgba(248,113,113,.1)",color:"#f87171",fontSize:".5rem"}}>CRÍTICO</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── TAB TABLÓN ───────────────────────────────────────────────────────────────
function TabTablon({ tareas, todasTareas, equipo, filtroArea, setFiltroArea, filtroResponsable, setFiltroResponsable, filtroEstado, setFiltroEstado, filtroPrioridad, setFiltroPrioridad, busqueda, setBusqueda, updEstado, setModal, setDelConf, setFicha, vista, setVista }) {
  const hayFiltros = filtroArea!=="todas"||filtroResponsable!=="todos"||filtroEstado!=="todos"||filtroPrioridad!=="todas"||busqueda;
  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📋 Tablón de Tareas</div>
          <div className="pd">{tareas.length} de {todasTareas.length} tareas mostradas · click para editar</div>
        </div>
        <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
          <div style={{display:"flex",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",overflow:"hidden"}}>
            {[["lista","☰ Lista"],["kanban","⬛ Kanban"]].map(([v,ic])=>(
              <button key={v} onClick={()=>setVista(v)}
                style={{padding:".3rem .65rem",border:"none",cursor:"pointer",fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,
                  background: vista===v ? "rgba(167,139,250,.2)" : "transparent",
                  color: vista===v ? "var(--violet)" : "var(--text-muted)",
                  transition:"all .15s", whiteSpace:"nowrap"}}>
                {ic}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setModal({tipo:"tarea",data:null})}>+ Nueva tarea</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card filtros-card">
        <div style={{display:"flex",gap:".5rem",flexWrap:"wrap",alignItems:"center"}}>
          <input className="inp" placeholder="🔍 Buscar tareas..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)} style={{maxWidth:240}}/>
          <select className="inp" value={filtroArea} onChange={e => setFiltroArea(e.target.value)} style={{width:"auto"}}>
            <option value="todas">Todas las áreas</option>
            {AREAS.map(a => <option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
          </select>
          <select className="inp" value={filtroResponsable} onChange={e => setFiltroResponsable(e.target.value)} style={{width:"auto"}}>
            <option value="todos">Todos</option>
            {equipo.map(p => <option key={p.id} value={String(p.id)}>{p.nombre.split(" ")[0]}</option>)}
          </select>
          <select className="inp" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{width:"auto"}}>
            <option value="todos">Todos los estados</option>
            {ESTADOS.map(s => <option key={s} value={s}>{EST_CFG[s].label}</option>)}
          </select>
          <select className="inp" value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)} style={{width:"auto"}}>
            <option value="todas">Toda prioridad</option>
            {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {hayFiltros && <button className="btn btn-ghost btn-sm" onClick={() => {setFiltroArea("todas");setFiltroResponsable("todos");setFiltroEstado("todos");setFiltroPrioridad("todas");setBusqueda("");}}>✕ Limpiar</button>}
        </div>
      </div>

      {/* Vistas */}
      {tareas.length === 0 && <div className="empty">No hay tareas con estos filtros</div>}

      {/* ── VISTA LISTA ── */}
      {vista === "lista" && (
        <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
          {tareas.map(t => {
            const area = getArea(t.area);
            const resp = equipo.find(e => e.id===t.responsableId);
            const dias = t.fechaLimite ? diasHasta(t.fechaLimite) : null;
            const ec = EST_CFG[t.estado];
            const pc = PRI_CFG[t.prioridad];
            const vencida = dias !== null && dias < 0 && t.estado !== "completado";
            const dep = t.dependeDe ? todasTareas.find(x => x.id===t.dependeDe) : null;
            return (
              <div key={t.id} className={cls("tarea-row", vencida&&"tarea-vencida")}
                style={{borderLeftColor:area.color, cursor:"pointer"}}
                onClick={() => setFicha({tipo:"tarea", data:t})}
                title="Click para ver ficha">
                {/* Cambio de estado rápido — clic en el selector NO propaga al modal */}
                <div className="tarea-estado-col" onClick={e => e.stopPropagation()}>
                  <select className="est-sel" value={t.estado}
                    onChange={e => updEstado(t.id, e.target.value)}
                    style={{color:ec.color, background:ec.bg, border:`1px solid ${ec.color}44`}}>
                    {ESTADOS.map(s => <option key={s} value={s}>{EST_CFG[s].label}</option>)}
                  </select>
                </div>
                {/* Contenido */}
                <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:".2rem"}}>
                  <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
                    <span style={{fontSize:".82rem",fontWeight:700,
                      color:t.estado==="completado"?"var(--text-muted)":"var(--text)",
                      textDecoration:t.estado==="completado"?"line-through":"none"}}>{t.titulo}</span>
                    <span className="badge" style={{background:pc.bg,color:pc.color,fontSize:".52rem"}}>{t.prioridad}</span>
                    {dep && dep.estado !== "completado" &&
                      <span className="badge" style={{background:"rgba(248,113,113,.1)",color:"#f87171",fontSize:".52rem"}}>🔒 espera: {dep.titulo.slice(0,25)}…</span>}
                  </div>
                  <div style={{display:"flex",gap:".75rem",flexWrap:"wrap"}}>
                    <span className="mono xs" style={{color:area.color}}>{area.icon} {area.label}</span>
                    {resp && (
                      <span style={{display:"flex",alignItems:"center",gap:".3rem"}}>
                        <div style={{width:14,height:14,borderRadius:"50%",background:resp.color+"33",border:`1px solid ${resp.color}66`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".45rem",fontWeight:700,color:resp.color}}>{iniciales(resp.nombre)}</div>
                        <span className="mono xs muted">{resp.nombre.split(" ")[0]}</span>
                      </span>
                    )}
                    {t.notas && <span className="mono xs muted" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:260}}>{t.notas}</span>}
                  </div>
                </div>
                {/* Fecha + acciones */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".3rem",flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  {dias !== null && (
                    <div style={{fontFamily:"var(--font-mono)",fontSize:".65rem",fontWeight:700,
                      color:vencida?"#f87171":dias<=7?"#fbbf24":dias<=14?"#fb923c":"var(--text-muted)",
                      background:vencida?"rgba(248,113,113,.1)":dias<=14?"rgba(251,191,36,.08)":"transparent",
                      padding:".1rem .35rem",borderRadius:4}}>
                      {vencida?`VENCIDA (${Math.abs(dias)}d)`:dias===0?"Hoy":`${dias}d · ${fmt(t.fechaLimite)}`}
                    </div>
                  )}
                  <div style={{display:"flex",gap:".25rem"}}>
                    <button className="btn btn-sm btn-ghost" onClick={()=>setModal({tipo:"tarea",data:t})}>✏️</button>
                    <button className="btn btn-sm btn-red" onClick={()=>setDelConf({tipo:"tarea",id:t.id})}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── VISTA KANBAN — 3 columnas, Bloqueado como badge ── */}
      {vista === "kanban" && (
        <div className="kanban-grid">
          {["pendiente","en curso","completado"].map(estado => {
            const col = EST_CFG[estado];
            // Las tareas bloqueadas se muestran en "Pendiente" con badge
            const tareasCol = estado === "pendiente"
              ? tareas.filter(t => t.estado === "pendiente" || t.estado === "bloqueado")
              : tareas.filter(t => t.estado === estado);
            return (
              <div key={estado} className="kanban-col">
                {/* Cabecera */}
                <div className="kanban-col-hdr" style={{borderTopColor: col.color}}>
                  <span className="mono" style={{fontSize:".65rem",fontWeight:700,color:col.color,textTransform:"uppercase",letterSpacing:".08em"}}>{col.label}</span>
                  <span className="kanban-cnt" style={{background:col.bg,color:col.color,border:`1px solid ${col.color}44`}}>{tareasCol.length}</span>
                </div>
                {/* Cuerpo */}
                <div className="kanban-body">
                  {tareasCol.length === 0 && (
                    <div className="kanban-empty">Sin tareas</div>
                  )}
                  {tareasCol.map(t => {
                    const area    = getArea(t.area);
                    const resp    = equipo.find(e => e.id===t.responsableId);
                    const dias    = t.fechaLimite ? diasHasta(t.fechaLimite) : null;
                    const vencida = dias !== null && dias < 0 && t.estado !== "completado";
                    const bloq    = t.estado === "bloqueado";
                    const pc      = PRI_CFG[t.prioridad];
                    return (
                      <div key={t.id} className={cls("kanban-card", vencida&&"kanban-card-venc", bloq&&"kanban-card-bloq")}
                        style={{borderLeftColor: area.color}}
                        onClick={() => setFicha({tipo:"tarea",data:t})}>
                        {/* Badge bloqueado */}
                        {bloq && <div className="kanban-bloq-badge">🔒 Bloqueada</div>}
                        <div className="kanban-card-titulo" style={{
                          textDecoration:t.estado==="completado"?"line-through":"none",
                          color:t.estado==="completado"?"var(--text-muted)":"var(--text)",
                          opacity:bloq?0.7:1}}>
                          {t.titulo}
                        </div>
                        <div className="kanban-card-meta">
                          <div style={{display:"flex",gap:".35rem",alignItems:"center",flex:1,minWidth:0}}>
                            <span style={{fontSize:".65rem",flexShrink:0}}>{area.icon}</span>
                            <span className="badge" style={{background:pc.bg,color:pc.color,fontSize:".48rem"}}>{t.prioridad}</span>
                            {resp && (
                              <div className="kanban-avatar" style={{background:resp.color+"33",border:`1px solid ${resp.color}66`,color:resp.color}}>
                                {iniciales(resp.nombre)}
                              </div>
                            )}
                          </div>
                          {dias !== null && (
                            <span className="mono" style={{fontSize:".58rem",fontWeight:700,flexShrink:0,
                              color:vencida?"#f87171":dias<=7?"#fbbf24":"var(--text-muted)"}}>
                              {vencida?`-${Math.abs(dias)}d`:dias===0?"Hoy":`${dias}d`}
                            </span>
                          )}
                        </div>
                        {/* Botones de estado rápido — área táctil >= 36px */}
                        <div className="kanban-acciones" onClick={e=>e.stopPropagation()}>
                          {estado === "pendiente" && !bloq && (
                            <button className="kanban-btn-estado"
                              style={{color:"var(--cyan)",borderColor:"rgba(34,211,238,.3)",background:"rgba(34,211,238,.08)"}}
                              onClick={()=>updEstado(t.id,"en curso")}>▶ En curso</button>
                          )}
                          {estado === "pendiente" && bloq && (
                            <button className="kanban-btn-estado"
                              style={{color:"#94a3b8",borderColor:"rgba(148,163,184,.3)",background:"rgba(148,163,184,.08)"}}
                              onClick={()=>updEstado(t.id,"pendiente")}>🔓 Desbloquear</button>
                          )}
                          {estado === "en curso" && (
                            <>
                              <button className="kanban-btn-estado"
                                style={{color:"var(--green)",borderColor:"rgba(52,211,153,.3)",background:"rgba(52,211,153,.08)"}}
                                onClick={()=>updEstado(t.id,"completado")}>✓ Completar</button>
                              <button className="kanban-btn-estado"
                                style={{color:"#f87171",borderColor:"rgba(248,113,113,.3)",background:"rgba(248,113,113,.08)"}}
                                onClick={()=>updEstado(t.id,"bloqueado")}>🔒 Bloquear</button>
                            </>
                          )}
                          {estado === "completado" && (
                            <button className="kanban-btn-estado"
                              style={{color:"#94a3b8",borderColor:"rgba(148,163,184,.3)",background:"rgba(148,163,184,.08)"}}
                              onClick={()=>updEstado(t.id,"pendiente")}>↩ Reabrir</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── TAB GANTT ────────────────────────────────────────────────────────────────
function TabGantt({ tareas, hitos, equipo, setModal, setFicha }) {
  // Simplified visual calendar: months from today to event + 1
  const months = [];
  let d = new Date(TODAY);
  d.setDate(1);
  while (d <= new Date("2026-09-30")) {
    months.push(new Date(d));
    d.setMonth(d.getMonth()+1);
  }
  const totalDays = Math.ceil((new Date("2026-09-30") - new Date("2026-03-01")) / 86400000);
  const pct = (date) => Math.max(0, Math.min(100, (new Date(date) - new Date("2026-03-01")) / 86400000 / totalDays * 100));

  // Group tasks by area, take earliest fechaLimite and latest fechaLimite per area
  const areaRanges = AREAS.map(a => {
    const at = tareas.filter(t => t.area===a.id && t.fechaLimite);
    if (!at.length) return null;
    const sorted = [...at].sort((x,y) => x.fechaLimite.localeCompare(y.fechaLimite));
    const start = sorted[0].fechaLimite;
    const end = sorted[sorted.length-1].fechaLimite;
    const done = at.filter(t => t.estado==="completado").length;
    return { ...a, start, end, total:at.length, done, pctDone: Math.round(done/at.length*100) };
  }).filter(Boolean);

  const todayPct = pct(TODAY.toISOString().split("T")[0]);

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📅 Calendario del Proyecto</div>
          <div className="pd">Marzo — Septiembre 2026 · Vista por área</div>
        </div>
        <div style={{display:"flex",gap:".5rem"}}>
          <button className="btn btn-ghost" onClick={() => setModal({tipo:"hito",data:null})}>+ Hito</button>
          <button className="btn btn-primary" onClick={() => setModal({tipo:"tarea",data:null})}>+ Tarea</button>
        </div>
      </div>

      <div className="gantt-wrap card">
        {/* Month headers */}
        <div className="gantt-header">
          <div className="gantt-label-col"/>
          <div className="gantt-track">
            {months.map(m => (
              <div key={m.getTime()} className="gantt-month" style={{left:`${pct(m.toISOString().split("T")[0])}%`,width:`${100/months.length}%`}}>
                <span>{m.toLocaleDateString("es-ES",{month:"short"}).toUpperCase()}</span>
              </div>
            ))}
            {/* Today line */}
            <div className="gantt-today" style={{left:`${todayPct}%`}}>
              <div className="gantt-today-label">HOY</div>
            </div>
          </div>
        </div>

        {/* Area rows */}
        {areaRanges.map(a => {
          const left = pct(a.start);
          const right = pct(a.end);
          const width = Math.max(right-left, 1);
          return (
            <div key={a.id} className="gantt-row">
              <div className="gantt-label-col">
                <span style={{color:a.color}}>{a.icon}</span>
                <span className="mono xs" style={{color:"var(--text)"}}>{a.label.split(" ")[0]}</span>
                <span className="mono xs muted">{a.pctDone}%</span>
              </div>
              <div className="gantt-track" style={{position:"relative",height:32}}>
                <div className="gantt-bar" style={{
                  left:`${left}%`, width:`${width}%`,
                  background:`linear-gradient(90deg, ${a.color}cc, ${a.color}66)`,
                  border:`1px solid ${a.color}44`,
                }}>
                  <div className="gantt-bar-fill" style={{width:`${a.pctDone}%`,background:a.color+"99"}}/>
                  <span className="gantt-bar-label">{a.done}/{a.total}</span>
                </div>
                {/* Today line in row */}
                <div style={{position:"absolute",top:0,bottom:0,left:`${todayPct}%`,width:1,background:"rgba(248,113,113,.4)",zIndex:5}}/>
              </div>
            </div>
          );
        })}

        {/* Hitos */}
        <div className="gantt-row" style={{borderTop:"1px solid var(--border)",marginTop:".4rem",paddingTop:".5rem"}}>
          <div className="gantt-label-col">
            <span>🏁</span><span className="mono xs" style={{color:"var(--text)"}}>Hitos</span>
          </div>
          <div className="gantt-track" style={{position:"relative",height:32}}>
            {hitos.map(h => (
              <div key={h.id} className="gantt-hito" style={{
                left:`${pct(h.fecha)}%`,
                transform:"translateX(-50%)",
                color:h.critico?"#f87171":"#22d3ee",
                cursor:"pointer",
              }} title={h.nombre} onClick={() => setFicha({tipo:"hito", data:h})}>
                <div className="gantt-diamond" style={{background:h.completado?"#34d399":h.critico?"#f87171":"#22d3ee"}}/>
                <div className="gantt-hito-label mono">{h.nombre.split(" ").slice(0,3).join(" ")}</div>
              </div>
            ))}
            <div style={{position:"absolute",top:0,bottom:0,left:`${todayPct}%`,width:1,background:"rgba(248,113,113,.4)",zIndex:5}}/>
          </div>
        </div>

        {/* Legend */}
        <div style={{display:"flex",gap:".75rem",padding:".5rem 0 0",flexWrap:"wrap",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:".3rem"}}><div style={{width:8,height:8,borderRadius:"50%",background:"#f87171"}}/><span className="mono xs muted">Hito crítico</span></div>
          <div style={{display:"flex",alignItems:"center",gap:".3rem"}}><div style={{width:8,height:8,borderRadius:"50%",background:"#22d3ee"}}/><span className="mono xs muted">Hito</span></div>
          <div style={{display:"flex",alignItems:"center",gap:".3rem"}}><div style={{width:16,height:3,background:"rgba(248,113,113,.5)"}}/><span className="mono xs muted">Hoy</span></div>
          <div style={{display:"flex",alignItems:"center",gap:".3rem"}}><div style={{width:16,height:8,borderRadius:2,background:"rgba(34,211,238,.3)",border:"1px solid rgba(34,211,238,.3)"}}/><span className="mono xs muted">Rango de tareas (progreso)</span></div>
        </div>
      </div>
    </>
  );
}

// ─── TAB EQUIPO ───────────────────────────────────────────────────────────────
function TabEquipo({ equipo, tareas, setModal, setDelConf, setFicha }) {
  const [vistaEquipo, setVistaEquipo] = useState("cards"); // "cards" | "kanban"
  const areasConPersonas = AREAS.filter(a => equipo.some(p => p.area === a.id));
  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">👥 Equipo Organizador</div>
          <div className="pd">{equipo.length} personas · Trail El Guerrero 2026</div>
        </div>
        <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
          <div style={{display:"flex",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",overflow:"hidden"}}>
            {[["cards","☰ Cards"],["kanban","⬛ Áreas"]].map(([v,ic])=>(
              <button key={v} onClick={()=>setVistaEquipo(v)}
                style={{padding:".3rem .65rem",border:"none",cursor:"pointer",fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,
                  background: vistaEquipo===v ? "rgba(167,139,250,.2)" : "transparent",
                  color: vistaEquipo===v ? "var(--violet)" : "var(--text-muted)",
                  transition:"all .15s"}}>
                {ic}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setModal({tipo:"persona",data:null})}>+ Añadir persona</button>
        </div>
      </div>

      {/* ── KANBAN POR ÁREA ── */}
      {vistaEquipo === "kanban" && (
        <div className="kanban-grid" style={{gridTemplateColumns:`repeat(${Math.min(areasConPersonas.length,3)},1fr)`}}>
          {areasConPersonas.map(area => {
            const personas = equipo.filter(p => p.area === area.id);
            return (
              <div key={area.id} className="kanban-col">
                <div className="kanban-col-hdr" style={{borderTopColor:area.color}}>
                  <span style={{fontSize:".65rem",fontWeight:700,color:area.color}}>{area.icon} {area.label}</span>
                  <span className="kanban-cnt" style={{background:area.color+"22",color:area.color,border:`1px solid ${area.color}44`}}>{personas.length}</span>
                </div>
                <div className="kanban-body">
                  {personas.map(p => {
                    const pt = tareas.filter(t => t.responsableId===p.id && t.estado!=="completado");
                    const urgentes = pt.filter(t => t.fechaLimite && diasHasta(t.fechaLimite)<=14).length;
                    return (
                      <div key={p.id} className="kanban-card" style={{borderLeftColor:p.color,cursor:"pointer"}}
                        onClick={()=>setFicha({tipo:"persona",data:p})}>
                        <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".35rem"}}>
                          <div className="kanban-avatar" style={{background:p.color+"33",border:`1px solid ${p.color}66`,color:p.color}}>
                            {iniciales(p.nombre)}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:".76rem",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                            <div className="mono xs muted">{p.rol}</div>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",marginBottom:".35rem"}}>
                          {pt.length>0 && <span className="badge" style={{background:"rgba(148,163,184,.1)",color:"#94a3b8",fontSize:".5rem"}}>{pt.length} tarea{pt.length!==1?"s":""}</span>}
                          {urgentes>0 && <span className="badge" style={{background:"rgba(251,191,36,.1)",color:"#fbbf24",fontSize:".5rem"}}>⚡{urgentes} urgente{urgentes!==1?"s":""}</span>}
                        </div>
                        <div className="kanban-acciones" onClick={e=>e.stopPropagation()}>
                          <button className="kanban-btn-estado" style={{color:"var(--violet)",borderColor:"rgba(167,139,250,.3)",background:"rgba(167,139,250,.08)"}}
                            onClick={()=>setModal({tipo:"persona",data:p})}>✏️ Editar</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CARDS ── */}
      {vistaEquipo === "cards" && (
      <div className="equipo-grid">
        {equipo.map(p => {
          const pt = tareas.filter(t => t.responsableId===p.id);
          const completadas = pt.filter(t => t.estado==="completado").length;
          const pendientes = pt.filter(t => t.estado!=="completado").length;
          const vencidas = pt.filter(t => t.estado!=="completado" && t.fechaLimite && diasHasta(t.fechaLimite) < 0).length;
          const urgentes = pt.filter(t => t.estado!=="completado" && t.fechaLimite && diasHasta(t.fechaLimite) <= 14 && diasHasta(t.fechaLimite) >= 0).length;
          const pct = pt.length ? Math.round(completadas/pt.length*100) : 0;
          const area = getArea(p.area);
          return (
            <div key={p.id} className="persona-card" style={{borderTopColor:p.color, cursor:"pointer"}}
              onClick={() => setFicha({tipo:"persona", data:p})}
              title={`Ver ficha de ${p.nombre}`}>
              <div style={{display:"flex",gap:".75rem",alignItems:"flex-start",marginBottom:".85rem"}}>
                <div className="avatar-lg" style={{background:p.color+"22",border:`2px solid ${p.color}66`,color:p.color}}>
                  {iniciales(p.nombre)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:".92rem",marginBottom:".15rem"}}>{p.nombre}</div>
                  <div className="mono xs muted" style={{marginBottom:".25rem"}}>{p.rol}</div>
                  <div style={{display:"flex",alignItems:"center",gap:".3rem"}}>
                    <span style={{fontSize:".7rem"}}>{area.icon}</span>
                    <span className="mono xs" style={{color:area.color}}>{area.label}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:".25rem",flexShrink:0}}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setModal({tipo:"persona",data:p})}>✏️</button>
                  <button className="btn btn-sm btn-red" onClick={() => setDelConf({tipo:"persona",id:p.id})}>✕</button>
                </div>
              </div>

              {/* Contacto */}
              <div style={{display:"flex",flexDirection:"column",gap:".2rem",marginBottom:".75rem",padding:".5rem .65rem",background:"var(--surface2)",borderRadius:8}}>
                {p.telefono && <a href={`tel:${p.telefono}`} className="mono xs" style={{color:"var(--cyan)",textDecoration:"none"}}>📞 {p.telefono}</a>}
                {p.email && <a href={`mailto:${p.email}`} className="mono xs" style={{color:"var(--cyan)",textDecoration:"none"}}>✉️ {p.email}</a>}
              </div>

              {/* Progreso */}
              <div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:".3rem"}}>
                  <span className="mono xs muted">Progreso de tareas</span>
                  <span className="mono xs" style={{color:p.color,fontWeight:700}}>{pct}%</span>
                </div>
                <div className="pbar" style={{marginBottom:".5rem"}}>
                  <div className="pfill" style={{width:`${pct}%`,background:p.color}}/>
                </div>
                <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
                  <span className="badge" style={{background:"rgba(52,211,153,.1)",color:"#34d399"}}>{completadas} hechas</span>
                  <span className="badge" style={{background:"rgba(148,163,184,.1)",color:"#94a3b8"}}>{pendientes} pendientes</span>
                  {vencidas > 0 && <span className="badge" style={{background:"rgba(248,113,113,.12)",color:"#f87171"}}>⚠ {vencidas} vencida{vencidas!==1?"s":""}</span>}
                  {urgentes > 0 && <span className="badge" style={{background:"rgba(251,191,36,.1)",color:"#fbbf24"}}>⚡ {urgentes} urgente{urgentes!==1?"s":""}</span>}
                </div>
              </div>

              {/* Próximas tareas */}
              {pt.filter(t => t.estado!=="completado").length > 0 && (
                <div style={{marginTop:".75rem",borderTop:"1px solid var(--border)",paddingTop:".6rem"}}>
                  <div className="mono xs muted" style={{marginBottom:".3rem"}}>Próximas tareas · click para editar</div>
                  {pt.filter(t => t.estado!=="completado" && t.fechaLimite).sort((a,b) => a.fechaLimite.localeCompare(b.fechaLimite)).slice(0,3).map(t => {
                    const dias = diasHasta(t.fechaLimite);
                    return (
                      <div key={t.id}
                        onClick={() => setFicha({tipo:"tarea", data:t})}
                        style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                          padding:".25rem .35rem",borderBottom:"1px solid rgba(30,45,80,.2)",
                          cursor:"pointer",borderRadius:4,transition:"background .12s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="var(--surface3)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <span style={{fontSize:".7rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,paddingRight:".5rem"}}>{t.titulo}</span>
                        <span className="mono xs" style={{color:dias<0?"#f87171":dias<=7?"#fbbf24":"var(--text-muted)",flexShrink:0}}>
                          {dias<0?`-${Math.abs(dias)}d`:`${dias}d`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </>
  );
}

// ─── TAB HITOS ────────────────────────────────────────────────────────────────
function TabHitos({ hitos, updHito, setModal, setDelConf, setFicha }) {
  const sorted = [...hitos].sort((a,b) => a.fecha.localeCompare(b.fecha));
  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🏁 Hitos del Proyecto</div>
          <div className="pd">{hitos.filter(h=>!h.completado).length} pendientes · {hitos.filter(h=>h.completado).length} completados</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({tipo:"hito",data:null})}>+ Nuevo hito</button>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
        {sorted.map((h,i) => {
          const dias = diasHasta(h.fecha);
          const vencido = dias < 0 && !h.completado;
          return (
            <div key={h.id} className={cls("hito-card", h.completado&&"hito-done", vencido&&"hito-vencido")}
              style={{cursor:"pointer"}} onClick={() => setFicha({tipo:"hito", data:h})}
              title="Click para ver ficha del hito">
              <div className="hito-card-gem" style={{background:h.completado?"#34d399":h.critico?"#f87171":"#22d3ee",boxShadow:h.completado?"0 0 8px #34d39966":h.critico?"0 0 8px #f8717166":"0 0 8px #22d3ee66"}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".2rem",flexWrap:"wrap"}}>
                  <span style={{fontSize:".86rem",fontWeight:700,textDecoration:h.completado?"line-through":"none",color:h.completado?"var(--text-muted)":"var(--text)"}}>{h.nombre}</span>
                  {h.critico && !h.completado && <span className="badge" style={{background:"rgba(248,113,113,.1)",color:"#f87171",fontSize:".5rem"}}>CRÍTICO</span>}
                  {h.completado && <span className="badge" style={{background:"rgba(52,211,153,.1)",color:"#34d399",fontSize:".5rem"}}>COMPLETADO</span>}
                </div>
                <div style={{display:"flex",gap:".75rem",alignItems:"center",flexWrap:"wrap"}}>
                  <span className="mono xs" style={{color:vencido?"#f87171":"var(--text-muted)"}}>{fmt(h.fecha)}</span>
                  {!h.completado && <span className="mono xs" style={{color:vencido?"#f87171":dias<=30?"#fbbf24":"#22d3ee",fontWeight:700}}>
                    {vencido?`¡Vencido! (${Math.abs(dias)} días)`:dias===0?"Hoy":dias<=30?`⚡ ${dias} días`:`${dias} días`}
                  </span>}
                </div>
              </div>
              <div style={{display:"flex",gap:".5rem",alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
                {/* Quick-complete: checkbox grande, área táctil 36x36px */}
                <button className="hito-ckbox"
                  title={h.completado ? "Marcar como pendiente" : "Marcar como completado"}
                  style={{borderColor:h.completado?"#34d399":"var(--border)",background:h.completado?"rgba(52,211,153,.15)":"transparent"}}
                  onClick={() => updHito(h.id,"completado",!h.completado)}>
                  {h.completado
                    ? <span style={{color:"#34d399",fontSize:"1rem",lineHeight:1}}>✓</span>
                    : <span style={{color:"var(--text-dim)",fontSize:".75rem",lineHeight:1}}>○</span>
                  }
                </button>
                <button className="btn btn-sm btn-ghost" onClick={()=>setModal({tipo:"hito",data:h})}>✏️</button>
                <button className="btn btn-sm btn-red" onClick={()=>setDelConf({tipo:"hito",id:h.id})}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── MODAL TAREA ──────────────────────────────────────────────────────────────
function ModalTarea({ data, equipo, tareas, onSave, onClose }) {
  const [form, setForm] = useState(data || {
    area:"permisos", titulo:"", responsableId:equipo[0]?.id||1,
    fechaLimite:"", estado:"pendiente", prioridad:"media", notas:"", dependeDe:null,
  });
  const [err, setErr] = useState({});
  const upd = (k,v) => setForm(p => ({...p,[k]:v}));
  const posiblesDeps = tareas.filter(t => t.id !== form.id && t.area === form.area);

  const submit = () => {
    const e = {};
    if (!form.titulo.trim()) e.titulo = "Requerido";
    setErr(e);
    if (!Object.keys(e).length) onSave({...form, responsableId:parseInt(form.responsableId), dependeDe:form.dependeDe?parseInt(form.dependeDe):null});
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="mhdr">
          <span className="mtit">{data?"✏️ Editar tarea":"➕ Nueva tarea"}</span>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="mbody">
          <div>
            <label className="fl" style={{color:err.titulo?"#f87171":undefined}}>Título de la tarea *</label>
            <input className="inp" value={form.titulo} onChange={e=>upd("titulo",e.target.value)} placeholder="Describe la tarea..." />
            {err.titulo && <div className="mono xs" style={{color:"#f87171",marginTop:".2rem"}}>⚠ {err.titulo}</div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
            <div>
              <label className="fl">Área</label>
              <select className="inp" value={form.area} onChange={e=>upd("area",e.target.value)}>
                {AREAS.map(a=><option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="fl">Responsable</label>
              <select className="inp" value={form.responsableId} onChange={e=>upd("responsableId",parseInt(e.target.value))}>
                {equipo.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:".75rem"}}>
            <div>
              <label className="fl">Fecha límite</label>
              <input className="inp" type="date" value={form.fechaLimite||""} onChange={e=>upd("fechaLimite",e.target.value)}/>
            </div>
            <div>
              <label className="fl">Estado</label>
              <select className="inp" value={form.estado} onChange={e=>upd("estado",e.target.value)} style={{color:EST_CFG[form.estado].color}}>
                {ESTADOS.map(s=><option key={s} value={s}>{EST_CFG[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="fl">Prioridad</label>
              <select className="inp" value={form.prioridad} onChange={e=>upd("prioridad",e.target.value)} style={{color:PRI_CFG[form.prioridad].color}}>
                {PRIORIDADES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {posiblesDeps.length > 0 && (
            <div>
              <label className="fl">Depende de (misma área)</label>
              <select className="inp" value={form.dependeDe||""} onChange={e=>upd("dependeDe",e.target.value||null)}>
                <option value="">Sin dependencia</option>
                {posiblesDeps.map(t=><option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="fl">Notas / Descripción</label>
            <textarea className="inp" rows={3} value={form.notas||""} onChange={e=>upd("notas",e.target.value)}
              placeholder="Contexto, detalles, links relevantes..." style={{resize:"vertical"}}/>
          </div>
        </div>
        <div className="mfoot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>{data?"💾 Guardar":"➕ Crear tarea"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL HITO ───────────────────────────────────────────────────────────────
function ModalHito({ data, onSave, onClose }) {
  const [form, setForm] = useState(data || {nombre:"", fecha:"", critico:false, completado:false});
  const [err, setErr] = useState({});
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));
  const submit = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre="Requerido";
    if (!form.fecha) e.fecha="Requerido";
    setErr(e);
    if (!Object.keys(e).length) onSave(form);
  };
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:420}}>
        <div className="mhdr"><span className="mtit">{data?"✏️ Editar hito":"🏁 Nuevo hito"}</span><button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button></div>
        <div className="mbody">
          <div>
            <label className="fl" style={{color:err.nombre?"#f87171":undefined}}>Nombre del hito *</label>
            <input className="inp" value={form.nombre} onChange={e=>upd("nombre",e.target.value)} placeholder="Ej: Apertura de inscripciones"/>
            {err.nombre && <div className="mono xs" style={{color:"#f87171",marginTop:".2rem"}}>⚠ {err.nombre}</div>}
          </div>
          <div>
            <label className="fl" style={{color:err.fecha?"#f87171":undefined}}>Fecha *</label>
            <input className="inp" type="date" value={form.fecha} onChange={e=>upd("fecha",e.target.value)}/>
            {err.fecha && <div className="mono xs" style={{color:"#f87171",marginTop:".2rem"}}>⚠ {err.fecha}</div>}
          </div>
          <div style={{display:"flex",gap:"1rem"}}>
            {[["critico","🔴 Hito crítico"],["completado","✅ Completado"]].map(([k,l])=>(
              <label key={k} style={{display:"flex",alignItems:"center",gap:".5rem",cursor:"pointer",fontSize:".78rem"}}>
                <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${form[k]?"#22d3ee":"var(--border)"}`,background:form[k]?"#22d3ee":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .15s"}}
                  onClick={()=>upd(k,!form[k])}>
                  {form[k]&&<span style={{color:"#000",fontSize:".65rem",fontWeight:800}}>✓</span>}
                </div>
                {l}
              </label>
            ))}
          </div>
        </div>
        <div className="mfoot"><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={submit}>{data?"💾 Guardar":"➕ Crear"}</button></div>
      </div>
    </div>
  );
}

// ─── MODAL PERSONA ────────────────────────────────────────────────────────────
const PERSONA_COLORS = ["#22d3ee","#f472b6","#fb923c","#a78bfa","#34d399","#fbbf24","#f87171","#818cf8","#2dd4bf","#e879f9"];

function ModalPersona({ data, onSave, onClose }) {
  const [form, setForm] = useState(data || {nombre:"", rol:"", area:"diaD", color:PERSONA_COLORS[0], email:"", telefono:""});
  const [err, setErr] = useState({});
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));
  const submit = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre="Requerido";
    if (!form.rol.trim()) e.rol="Requerido";
    setErr(e);
    if (!Object.keys(e).length) onSave(form);
  };
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="mhdr"><span className="mtit">{data?"✏️ Editar persona":"👤 Nueva persona"}</span><button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button></div>
        <div className="mbody">
          <div style={{display:"flex",alignItems:"center",gap:"1rem",padding:".75rem",background:"var(--surface2)",borderRadius:10}}>
            <div className="avatar-lg" style={{background:form.color+"22",border:`2px solid ${form.color}66`,color:form.color,flexShrink:0}}>{iniciales(form.nombre||"??")}</div>
            <div style={{flex:1}}>
              <div className="fl" style={{marginBottom:".4rem"}}>Color de identificación</div>
              <div style={{display:"flex",gap:".3rem",flexWrap:"wrap"}}>
                {PERSONA_COLORS.map(c=>(
                  <div key={c} onClick={()=>upd("color",c)} style={{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",border:form.color===c?"3px solid white":"2px solid transparent",transition:"all .15s",transform:form.color===c?"scale(1.2)":"scale(1)"}}/>
                ))}
              </div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
            <div>
              <label className="fl" style={{color:err.nombre?"#f87171":undefined}}>Nombre completo *</label>
              <input className="inp" value={form.nombre} onChange={e=>upd("nombre",e.target.value)} placeholder="Nombre Apellido"/>
              {err.nombre&&<div className="mono xs" style={{color:"#f87171",marginTop:".2rem"}}>⚠ {err.nombre}</div>}
            </div>
            <div>
              <label className="fl" style={{color:err.rol?"#f87171":undefined}}>Rol en el equipo *</label>
              <input className="inp" value={form.rol} onChange={e=>upd("rol",e.target.value)} placeholder="Director, Coordinador..."/>
              {err.rol&&<div className="mono xs" style={{color:"#f87171",marginTop:".2rem"}}>⚠ {err.rol}</div>}
            </div>
          </div>
          <div>
            <label className="fl">Área principal</label>
            <select className="inp" value={form.area} onChange={e=>upd("area",e.target.value)}>
              {AREAS.map(a=><option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
            <div>
              <label className="fl">Teléfono</label>
              <input className="inp" value={form.telefono||""} onChange={e=>upd("telefono",e.target.value)} placeholder="611 000 000" inputMode="tel"/>
            </div>
            <div>
              <label className="fl">Email</label>
              <input className="inp" value={form.email||""} onChange={e=>upd("email",e.target.value)} placeholder="nombre@email.es"/>
            </div>
          </div>
        </div>
        <div className="mfoot"><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={submit}>{data?"💾 Guardar":"➕ Añadir"}</button></div>
      </div>
    </div>
  );
}

// ─── FICHA PROYECTO ───────────────────────────────────────────────────────────
function FichaProyecto({ ficha, equipo, onClose, onEditar, onEliminar }) {
  const { tipo, data } = ficha;
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "instant" });
    return () => { document.body.style.overflow = prev; };
  }, []);

  const accent = tipo === "tarea" ? "var(--violet)" : tipo === "hito" ? "var(--cyan)" : "var(--green)";
  const icon   = tipo === "tarea" ? "📋" : tipo === "hito" ? "🏁" : "👤";
  const titulo = data.titulo || data.nombre;

  const Row = ({ label, value, color }) => !value ? null : (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
      padding:".45rem 0", borderBottom:"1px solid rgba(30,45,80,.3)" }}>
      <span style={{ fontFamily:"var(--font-mono)", fontSize:".6rem", color:"var(--text-muted)",
        flexShrink:0, marginRight:"1rem" }}>{label}</span>
      <span style={{ fontSize:".78rem", fontWeight:600, textAlign:"right",
        color: color || "var(--text)" }}>{value}</span>
    </div>
  );

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:460 }}>
        <div style={{ borderTop:`3px solid ${accent}`, borderRadius:"12px 12px 0 0" }}>
          <div className="mhdr">
            <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
              <span style={{ fontSize:"1.5rem" }}>{icon}</span>
              <div>
                <div style={{ fontWeight:800, fontSize:".95rem", lineHeight:1.2 }}>{titulo}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:".55rem", color:"var(--text-muted)",
                  marginTop:".1rem", textTransform:"uppercase", letterSpacing:".08em" }}>
                  {tipo === "tarea" ? `Tarea · ${AREAS.find(a=>a.id===data.area)?.label||data.area}` :
                   tipo === "hito"  ? "Hito" : "Miembro del equipo"}
                </div>
              </div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="mbody">
          {tipo === "tarea" && (<>
            <Row label="Estado"      value={EST_CFG[data.estado]?.label}  color={EST_CFG[data.estado]?.color} />
            <Row label="Prioridad"   value={data.prioridad}               color={PRI_CFG[data.prioridad]?.color} />
            <Row label="Responsable" value={equipo.find(p=>p.id===data.responsableId)?.nombre} />
            <Row label="Fecha límite" value={data.fechaLimite
              ? new Date(data.fechaLimite).toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"})
              : null} />
            {data.notas && (
              <div style={{ marginTop:".5rem", background:"var(--surface2)", borderRadius:8,
                padding:".65rem .75rem", borderLeft:`2px solid ${accent}` }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:".55rem", color:"var(--text-muted)",
                  marginBottom:".3rem", textTransform:"uppercase" }}>Notas</div>
                <div style={{ fontSize:".78rem", lineHeight:1.6 }}>{data.notas}</div>
              </div>
            )}
          </>)}
          {tipo === "hito" && (<>
            <Row label="Fecha"   value={data.fecha
              ? new Date(data.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"})
              : "—"} />
            <Row label="Estado"  value={data.completado ? "✓ Completado" : "Pendiente"}
                 color={data.completado ? "var(--green)" : "var(--amber)"} />
            <Row label="Crítico" value={data.critico ? "⚡ Sí, es crítico" : "No"}
                 color={data.critico ? "var(--red)" : undefined} />
          </>)}
          {tipo === "persona" && (<>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:".75rem" }}>
              <div style={{ width:52, height:52, borderRadius:"50%",
                background:(data.color||"#a78bfa")+"22",
                border:`2px solid ${data.color||"#a78bfa"}66`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:800, fontSize:"1.1rem", color:data.color||"#a78bfa" }}>
                {iniciales(data.nombre||"?")}
              </div>
            </div>
            <Row label="Rol"      value={data.rol} />
            <Row label="Área"     value={AREAS.find(a=>a.id===data.area)?.label||data.area} />
            <Row label="Teléfono" value={data.telefono} />
            <Row label="Email"    value={data.email} />
          </>)}
        </div>
        <div className="mfoot" style={{ justifyContent:"space-between" }}>
          <button className="btn btn-red" onClick={onEliminar}>🗑 Eliminar</button>
          <div style={{ display:"flex", gap:".4rem" }}>
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={onEditar}>✏️ Editar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:var(--font-display);min-height:100vh;
    background-image:radial-gradient(ellipse 80% 35% at 15% -5%,rgba(34,211,238,.04) 0%,transparent 55%),
      radial-gradient(ellipse 60% 25% at 85% 5%,rgba(167,139,250,.03) 0%,transparent 50%)}
  .layout{display:flex;min-height:100vh}
  /* SIDEBAR */
  .sidebar{width:220px;min-height:100vh;height:100vh;position:sticky;top:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
  .slogo{padding:1.25rem 1rem .75rem;border-bottom:1px solid var(--border)}
  .sley{font-family:var(--font-mono);font-size:.48rem;color:var(--cyan);letter-spacing:.2em;text-transform:uppercase;margin-bottom:.3rem;opacity:.7}
  .sltitle{font-size:1.5rem;font-weight:800;background:linear-gradient(135deg,#fff 0%,var(--violet) 60%,var(--cyan) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1}
  .slsub{font-family:var(--font-mono);font-size:.55rem;color:var(--text-muted);margin-top:.25rem}
  .scountdown{padding:.85rem 1rem;border-bottom:1px solid var(--border);text-align:center;background:linear-gradient(135deg,rgba(167,139,250,.05),rgba(34,211,238,.04))}
  .scd-label{font-family:var(--font-mono);font-size:.5rem;text-transform:uppercase;letter-spacing:.15em;color:var(--text-muted);margin-bottom:.2rem}
  .scd-val{font-family:var(--font-mono);font-size:2rem;font-weight:800;color:var(--violet);line-height:1}
  .scd-unit{font-family:var(--font-mono);font-size:.6rem;color:var(--text-muted);margin-top:.1rem}
  .sglobal{padding:.75rem 1rem;border-bottom:1px solid var(--border)}
  .sg-label{font-family:var(--font-mono);font-size:.5rem;text-transform:uppercase;letter-spacing:.12em;color:var(--text-muted);margin-bottom:.4rem}
  .sg-pct{font-family:var(--font-mono);font-size:1.1rem;font-weight:800;color:var(--green);margin-bottom:.3rem}
  .sg-bar{height:5px;background:var(--surface3);border-radius:3px;overflow:hidden;margin-bottom:.3rem}
  .sg-fill{height:100%;background:linear-gradient(90deg,var(--green),var(--cyan));border-radius:3px;transition:width .6s}
  .sg-nums{font-family:var(--font-mono);font-size:.55rem;color:var(--text-muted)}
  .snav{flex:1;padding:.5rem .4rem;display:flex;flex-direction:column;gap:.1rem;overflow-y:auto}
  .nitem{display:flex;align-items:center;gap:.5rem;padding:.5rem .7rem;border-radius:var(--r-sm);border:1px solid transparent;cursor:pointer;background:none;color:var(--text-muted);font-family:var(--font-display);font-size:.76rem;font-weight:500;text-align:left;width:100%;transition:all .15s;position:relative}
  .nitem::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:0 2px 2px 0;background:transparent;transition:background .15s}
  .nitem:hover{color:var(--text);background:var(--surface2)} .nitem.active{color:var(--text);background:var(--surface2);border-color:var(--border-light)} .nitem.active::before{background:var(--violet)}
  .nicon{font-size:.85rem;width:18px;text-align:center;flex-shrink:0}
  .nbadge{margin-left:auto;font-size:.52rem;font-family:var(--font-mono);padding:.1rem .3rem;border-radius:3px;font-weight:700}
  .sf{padding:.75rem;border-top:1px solid var(--border)}
  .bsave{width:100%;padding:.5rem;background:rgba(167,139,250,.1);color:var(--violet);border:1px solid rgba(167,139,250,.25);border-radius:var(--r-sm);font-family:var(--font-mono);font-size:.68rem;font-weight:700;cursor:pointer;transition:all .15s}
  .bsave:hover{background:rgba(167,139,250,.18)} .bsave.saved{background:rgba(52,211,153,.12);color:var(--green);border-color:rgba(52,211,153,.25)}
  /* MAIN */
  .main{flex:1;min-width:0;padding:1.5rem 1.25rem 4rem;overflow-x:hidden}
  .tc{animation:fu .2s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  /* PAGE HEADER */
  .ph{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap}
  .pt{font-size:1.3rem;font-weight:800} .pd{font-family:var(--font-mono);font-size:.62rem;color:var(--text-muted);margin-top:.25rem}
  /* KPIs */
  .kgrid4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: .75rem; margin-bottom: 1rem; }
  @media (max-width: 480px) { .kgrid4 { grid-template-columns: 1fr 1fr; gap: 0.5rem; } }
  .kpi:hover{transform:translateY(-2px);border-color:var(--border-light);box-shadow:0 4px 20px rgba(0,0,0,.4)}
  .kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
  .kpi.c-cyan::before,.kpi.c-cyan .kv{background:linear-gradient(90deg,var(--cyan),transparent)}.kpi.c-cyan .kv{background:none;color:var(--cyan)}
  .kpi.c-green::before{background:linear-gradient(90deg,var(--green),transparent)}.kpi.c-green .kv{color:var(--green)}
  .kpi.c-amber::before{background:linear-gradient(90deg,var(--amber),transparent)}.kpi.c-amber .kv{color:var(--amber)}
  .kpi.c-red::before{background:linear-gradient(90deg,var(--red),transparent)}.kpi.c-red .kv{color:var(--red)}
  .kpi.c-violet::before{background:linear-gradient(90deg,var(--violet),transparent)}.kpi.c-violet .kv{color:var(--violet)}
  .ki{font-size:1.2rem;margin-bottom:.4rem} .kl{font-size:.55rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.35rem;font-family:var(--font-mono)}
  .kv{font-size:1.5rem;font-weight:800;font-family:var(--font-mono);line-height:1} .ks{font-size:.58rem;color:var(--text-muted);margin-top:.25rem;font-family:var(--font-mono)}
  /* CARDS */
  .twocol{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-bottom:.85rem}
  @media(max-width:800px){.twocol{grid-template-columns:1fr}}
  .card:hover{border-color:var(--border-light)}
  .ct{font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:.75rem;color:var(--text-muted)}
  .filtros-card{margin-bottom:.75rem}
  /* AREA GRID */
  .area-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.5rem}
  .area-card{background:var(--surface2);border:1px solid var(--border);border-top:2px solid;border-radius:var(--r-sm);padding:.75rem;cursor:pointer;transition:all .15s}
  .area-card:hover{transform:translateY(-2px);border-color:var(--border-light);box-shadow:0 4px 12px rgba(0,0,0,.3)}
  /* PROGRESO */
  .pbar{height:4px;background:var(--surface3);border-radius:2px;overflow:hidden}
  .pfill{height:100%;border-radius:2px;transition:width .5s cubic-bezier(.4,0,.2,1)}
  /* URGENTES */
  .urg-row{display:flex;align-items:center;gap:.6rem;padding:.38rem 0;border-bottom:1px solid rgba(30,45,80,.3)}
  .urg-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .urg-titulo{font-size:.74rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .empty-sm{font-family:var(--font-mono);font-size:.7rem;color:var(--text-dim);padding:.5rem 0;text-align:center}
  /* CARGA */
  .carga-row{display:flex;align-items:center;gap:.6rem;padding:.4rem 0;border-bottom:1px solid rgba(30,45,80,.3)}
  /* AVATARS */
  .avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:.55rem;font-weight:700;flex-shrink:0}
  .avatar-lg{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:.75rem;font-weight:700;flex-shrink:0}
  /* HITOS */
  .hitos-timeline{display:flex;flex-direction:column}
  .hito-row{display:flex;align-items:flex-start;gap:0}
  .hito-fecha{width:64px;flex-shrink:0;padding-top:.6rem;text-align:right;padding-right:.75rem}
  .hito-connector{display:flex;flex-direction:column;align-items:center;padding-top:.55rem}
  .hito-gem{width:12px;height:12px;border-radius:2px;transform:rotate(45deg);flex-shrink:0}
  .hito-line{width:2px;flex:1;background:var(--border);min-height:16px;margin:3px 0}
  .hito-label{padding:.5rem 0 .5rem .75rem;flex:1}
  .hito-card{display:flex;align-items:center;gap:.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:.85rem;transition:all .15s}
  .hito-card:hover{border-color:var(--border-light)} .hito-card.hito-done{opacity:.55} .hito-card.hito-vencido{border-color:rgba(248,113,113,.3);background:rgba(248,113,113,.03)}
  .hito-card-gem{width:14px;height:14px;border-radius:3px;transform:rotate(45deg);flex-shrink:0}
  /* TAREAS */
  .tarea-row{display:flex;align-items:flex-start;gap:.75rem;background:var(--surface);border:1px solid var(--border);border-left:3px solid;border-radius:var(--r);padding:.75rem;transition:all .15s}
  .tarea-row:hover{border-color:var(--border-light)}
  .tarea-row.tarea-vencida{background:rgba(248,113,113,.03);border-color:rgba(248,113,113,.25)}
  .tarea-estado-col{flex-shrink:0}
  .est-sel{border-radius:5px;padding:.2rem .4rem;font-family:var(--font-mono);font-size:.65rem;cursor:pointer;outline:none;font-weight:700}
  /* GANTT */
  .gantt-wrap{padding:1rem;overflow-x:auto}
  .gantt-header{display:flex;margin-bottom:.5rem;height:24px}
  .gantt-label-col{width:140px;flex-shrink:0;display:flex;align-items:center;gap:.35rem;padding-right:.75rem}
  .gantt-track{flex:1;position:relative;min-width:0}
  .gantt-month{position:absolute;top:0;height:100%;border-left:1px solid rgba(30,45,80,.5);display:flex;align-items:center;overflow:hidden}
  .gantt-month span{font-family:var(--font-mono);font-size:.5rem;color:var(--text-muted);padding-left:.25rem;white-space:nowrap}
  .gantt-today{position:absolute;top:-4px;bottom:-4px;width:2px;background:rgba(248,113,113,.7);z-index:10}
  .gantt-today-label{position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-family:var(--font-mono);font-size:.45rem;color:#f87171;white-space:nowrap;font-weight:700}
  .gantt-row{display:flex;align-items:center;margin-bottom:.5rem;min-height:40px}
  .gantt-bar{position:absolute;top:50%;transform:translateY(-50%);height:24px;border-radius:6px;display:flex;align-items:center;overflow:hidden;min-width:4px}
  .gantt-bar-fill{position:absolute;top:0;left:0;height:100%;opacity:.5;border-radius:6px}
  .gantt-bar-label{position:relative;font-family:var(--font-mono);font-size:.55rem;font-weight:700;color:rgba(255,255,255,.9);padding:0 .4rem;white-space:nowrap;z-index:1}
  .gantt-hito{position:absolute;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;cursor:default}
  .gantt-diamond{width:10px;height:10px;border-radius:2px;transform:rotate(45deg)}
  .gantt-hito-label{font-size:.45rem;font-family:var(--font-mono);color:var(--text-muted);white-space:nowrap;margin-top:2px;max-width:60px;overflow:hidden;text-overflow:ellipsis}
  /* EQUIPO GRID */
  .equipo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:.85rem}
  .persona-card{background:var(--surface);border:1px solid var(--border);border-top:3px solid;border-radius:var(--r);padding:1rem;transition:all .15s}
  .persona-card:hover{border-color:var(--border-light);box-shadow:0 4px 16px rgba(0,0,0,.3)}
  /* UTILS */
  .inp:focus{border-color:var(--violet);box-shadow:0 0 0 2px rgba(167,139,250,.1)}
  .btn:hover{transform:translateY(-1px)}
  .btn.primary{background:rgba(167,139,250,.15);color:var(--violet);border:1px solid rgba(167,139,250,.3)} .btn.primary:hover{background:rgba(167,139,250,.25)}
  .btn.ghost{background:transparent;color:var(--text-muted);border:1px solid var(--border)} .btn.ghost:hover{color:var(--text);border-color:var(--border-light)}
  .btn.red{background:rgba(248,113,113,.12);color:#f87171;border:1px solid rgba(248,113,113,.2)}
  .btn.xs{padding:.2rem .4rem;font-size:.65rem}
  .mt1{margin-top:.5rem} .w100{width:100%;justify-content:center}
  .empty{text-align:center;padding:2rem;color:var(--text-muted);font-family:var(--font-mono);font-size:.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--r)}
  /* MODAL */
  @keyframes su{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .mhdr{padding:1.1rem 1.4rem .9rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .mtit{font-size:.95rem;font-weight:700}
  .mbody{padding:1.1rem 1.4rem;display:flex;flex-direction:column;gap:.8rem}
  .mfoot{padding:.9rem 1.4rem;border-top:1px solid var(--border);display:flex;gap:.5rem;justify-content:flex-end}
  .fl{font-size:.72rem;font-weight:600;margin-bottom:.3rem;display:block;color:var(--text-muted)}
  .sidebar-toggle-open{display:none;position:sticky;top:0;z-index:9;width:100%;padding:.75rem;background:var(--surface2);border:none;border-bottom:1px solid var(--border);color:var(--violet);font-family:inherit;font-weight:700;font-size:.76rem;cursor:pointer;text-align:left}
  .sidebar-toggle-close{display:none;position:absolute;top:1rem;right:1rem;background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:var(--surface)}::-webkit-scrollbar-thumb{background:var(--border-light);border-radius:2px}

  @media(max-width:850px){
    .layout{flex-direction:column}
    .sidebar{
      width:100%;height:auto;min-height:initial;position:sticky;top:0;z-index:40;
      border-right:none;border-bottom:1px solid var(--border);
      background:rgba(6,9,18,0.95);backdrop-filter:blur(10px);
    }
    .snav{flex-direction:row;overflow-x:auto;padding:.4rem;gap:.4rem}
    .nitem{flex-shrink:0;width:auto;padding:.4rem .75rem;margin:0;border:1px solid var(--border)}
    .nitem::before{display:none}
    .nitem.active{border-color:var(--violet)}
    .main{padding:1rem .75rem 5rem}
    .kgrid4{grid-template-columns:repeat(2,1fr)}
    .area-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}
    .twocol{grid-template-columns:1fr}
    .ph{align-items:center}
    .pt{font-size:1.1rem}
    .sidebar-toggle-open,.sidebar-toggle-close{display:none}
    .mobile-header-tools{position:absolute;top:1rem;right:.75rem;z-index:50}
  }
  @media(max-width:480px){
    .kgrid4{grid-template-columns:1fr}
    .ph{flex-direction:row;justify-content:space-between;align-items:center;margin-bottom:1rem}
    .pd{display:none}
    .nitem span:not(.nicon){display:none}
    .nitem{padding:.5rem .8rem}
  }  /* ── KANBAN ─────────────────────────────────────────────────────────────── */
  .kanban-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;align-items:start}
  @media(max-width:700px){.kanban-grid{grid-template-columns:1fr}}
  @media(min-width:701px) and (max-width:960px){.kanban-grid{grid-template-columns:1fr 1fr}}
  .kanban-col{background:var(--surface);border:1px solid var(--border);border-top:3px solid;border-radius:var(--r);overflow:hidden;transition:border-color .15s}
  .kanban-col-hdr{padding:.6rem .85rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
  .kanban-cnt{border-radius:10px;font-family:var(--font-mono);font-size:.6rem;font-weight:700;padding:.05rem .45rem}
  .kanban-body{padding:.5rem;display:flex;flex-direction:column;gap:.4rem;min-height:80px}
  .kanban-empty{text-align:center;padding:1.25rem;color:var(--text-dim);font-family:var(--font-mono);font-size:.62rem}
  .kanban-card{background:var(--surface2);border:1px solid var(--border);border-left:3px solid;border-radius:var(--r-sm);padding:.65rem .75rem;cursor:pointer;transition:all .15s;user-select:none;display:flex;flex-direction:column;gap:.35rem}
  .kanban-card:hover{transform:translateY(-2px);box-shadow:0 4px 14px rgba(0,0,0,.35);border-color:var(--border-light)}
  .kanban-card-venc{border-color:rgba(248,113,113,.35)!important;background:rgba(248,113,113,.03)!important}
  .kanban-card-bloq{opacity:.75;border-style:dashed}
  .kanban-bloq-badge{font-family:var(--font-mono);font-size:.52rem;font-weight:700;color:#f87171;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);border-radius:3px;padding:.1rem .35rem;align-self:flex-start}
  .kanban-card-titulo{font-size:.78rem;font-weight:700;line-height:1.35}
  .kanban-card-meta{display:flex;justify-content:space-between;align-items:center;gap:.25rem}
  .kanban-avatar{width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:.42rem;font-weight:700;flex-shrink:0}
  .kanban-acciones{display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.1rem}
  /* Botones de estado — área táctil mínima 36px */
  .kanban-btn-estado{min-height:36px;padding:.1rem .55rem;border-radius:5px;border:1px solid;font-family:var(--font-mono);font-size:.6rem;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap;display:flex;align-items:center;justify-content:center}
  .kanban-btn-estado:hover{filter:brightness(1.2);transform:translateY(-1px)}

  /* ── HITO QUICK-COMPLETE ──────────────────────────────────────────────── */
  .hito-ckbox{width:36px;height:36px;border-radius:8px;border:2px solid;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;background:transparent}
  .hito-ckbox:hover{transform:scale(1.1);box-shadow:0 2px 8px rgba(0,0,0,.3)}


`;
