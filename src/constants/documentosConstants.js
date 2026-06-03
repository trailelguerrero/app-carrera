/**
 * documentosConstants.js — MEJ-23
 *
 * Fuente canónica de constantes del módulo Documentos.
 * Extraídas de Documentos.jsx para permitir su reutilización
 * en los subcomponentes TabArchivos, TabGestiones y TabSubvenciones.
 */

// ─── Archivos ─────────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
export const ALLOWED_EXT   = ".pdf,.png,.jpg,.jpeg,.webp";

export const CATEGORIAS = [
  { id: "presupuestos",   icon: "💰", label: "Presupuestos proveedores", color: "#34d399" },
  { id: "contratos",      icon: "📝", label: "Contratos",    color: "#f97316" },
  { id: "facturas",       icon: "🧾", label: "Facturas",     color: "#22d3ee" },
  { id: "permisos",       icon: "📋", label: "Permisos",     color: "#a78bfa" },
  { id: "seguros",        icon: "🛡️", label: "Seguros",      color: "#fbbf24" },
  { id: "protocolos",     icon: "📑", label: "Protocolos",   color: "#fb923c" },
  { id: "comunicaciones", icon: "📢", label: "Comunicaciones", color: "#e879f9" },
  { id: "certificados",   icon: "🏆", label: "Certificados", color: "#38bdf8" },
  { id: "rrhh",           icon: "👥", label: "RR.HH.",       color: "#f472b6" },
];

export const CAT_GESTIONES = { id: "gestiones", icon: "🏛️", label: "Gestiones legales", color: "#38bdf8", esGestion: true };
export const TODAS_CATEGORIAS = [...CATEGORIAS, { ...CAT_GESTIONES }]; // solo para búsqueda global

export const SUBCATEGORIAS = {
  permisos:       ["Ayuntamiento", "Diputación", "Medio Ambiente", "Otro"],
  seguros:        ["Accidentes", "Responsabilidad Civil", "Otro"],
  protocolos:     ["Actuación Accidentes", "Actuación RC", "Evacuación", "Otro"],
  comunicaciones: ["Nota de prensa", "Acreditación prensa", "Comunicado oficial", "Redes sociales", "Otro"],
  certificados:   ["Registro federativo", "Declaración responsable", "Certificado oficial", "Otro"],
  rrhh:           ["Contrato colaborador", "Autorización menor", "NDA", "Otro"],
  presupuestos:   [],
  facturas:       [],
  contratos:      [],
  gestiones:      ["Ayuntamiento", "Federación", "Medio Ambiente", "Diputación", "Cruz Roja", "Seguro RC", "Protección Civil", "Otro"],
};

export const ESTADOS_DOC = [
  { id: "pendiente",  label: "Pendiente",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  { id: "en_tramite", label: "En trámite", color: "#22d3ee", bg: "var(--cyan-dim)"  },
  { id: "enviado",    label: "Enviado",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)"   },
  { id: "firmado",    label: "Firmado",    color: "#a78bfa", bg: "var(--violet-dim)" },
  { id: "aprobado",   label: "Aprobado",   color: "#34d399", bg: "var(--green-dim)"  },
  { id: "vigente",    label: "Vigente",    color: "#34d399", bg: "var(--green-dim)"  },
  { id: "denegado",   label: "Denegado",   color: "#f87171", bg: "var(--red-dim)" },
  { id: "vencido",    label: "Vencido",    color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
];

export const getEstadoCfg = (id) => ESTADOS_DOC.find(e => e.id === id) || ESTADOS_DOC[0];

export const FILE_ICONS = {
  "application/pdf": "📄",
  "image/png":  "🖼️",
  "image/jpeg": "🖼️",
  "image/jpg":  "🖼️",
  "image/webp": "🖼️",
};
export const getFileIcon = (mime) => FILE_ICONS[mime] || "📎";

export const formatSize = (bytes) => {
  if (!bytes) return "0 B";
  if (bytes < 1024)       return bytes + " B";
  if (bytes < 1024*1024)  return (bytes/1024).toFixed(1) + " KB";
  return (bytes/(1024*1024)).toFixed(2) + " MB";
};

export const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day:"2-digit", month:"short", year:"numeric" });
};

export const formatImporte = (val) => {
  if (val == null || val === "") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(",","."));
  if (isNaN(n)) return null;
  return new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR", minimumFractionDigits:2 }).format(n);
};

export const diasHasta = (iso) => {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
};

// ─── Gestiones ────────────────────────────────────────────────────────────────

export const GESTIONES_DEFAULT = [
  { id:"g1", nombre:"Autorización Administración Local", subcategoria:"Ayuntamiento",
    estado:"pendiente", fechaVencimiento:"2026-08-29", nota:"Solicitar autorización al organismo local competente.", url:"", fechaSubida: "", responsable: "" },
  { id:"g2", nombre:"Licencia federativa colectiva", subcategoria:"Federación",
    estado:"pendiente", fechaVencimiento:"2026-08-29", nota:"Federación correspondiente. Requiere seguro RC previo.", url:"", fechaSubida: "", responsable: "" },
  { id:"g3", nombre:"Seguro Responsabilidad Civil", subcategoria:"Seguro RC",
    estado:"pendiente", fechaVencimiento:"2026-08-29", nota:"Mínimo 600.000 € cobertura. Solicitar presupuesto a aseguradoras.", url:"", fechaSubida: "", responsable: "" },
  { id:"g4", nombre:"Autorización Medio Ambiente", subcategoria:"Medio Ambiente",
    estado:"pendiente", fechaVencimiento:"2026-06-30", nota:"Necesaria para uso de montes de utilidad pública.", url:"", fechaSubida: "", responsable: "" },
  { id:"g5", nombre:"Protocolo Servicio médico", subcategoria:"Servicio Médico",
    estado:"pendiente", fechaVencimiento:"2026-08-29", nota:"Ambulancia + 2 sanitarios titulados. Confirmar antes del 15 mayo.", url:"", fechaSubida: "", responsable: "" },
  { id:"g6", nombre:"Plan de autoprotección", subcategoria:"Protección Civil",
    estado:"pendiente", fechaVencimiento:"2026-07-31", nota:"Obligatorio cuando el aforo supera las 1.000 personas. Incluir plano de evacuación, puntos de concentración y protocolo de emergencias. Presentar ante Protección Civil con antelación.", url:"", fechaSubida: "", responsable: "" },
  { id:"g7", nombre:"Notificación de recorrido a Guardia Civil", subcategoria:"Otro",
    estado:"pendiente", fechaVencimiento:"2026-08-15", nota:"Comunicar el recorrido, horarios y número de participantes al puesto de la Guardia Civil correspondiente. Solicitar escolta si el recorrido cruza vías públicas de cierta densidad.", url:"", fechaSubida: "", responsable: "" },
  { id:"g8", nombre:"Aviso a servicios de emergencia (112 / Cruz Roja)", subcategoria:"Cruz Roja",
    estado:"pendiente", fechaVencimiento:"2026-08-22", nota:"Notificar fecha, recorrido y número de participantes a 112 y Cruz Roja. Confirmar disponibilidad de unidades móviles en zonas sin cobertura de ambulancia.", url:"", fechaSubida: "", responsable: "" },
  { id:"g9", nombre:"Permiso de grabación / fotografía profesional", subcategoria:"Otro",
    estado:"pendiente", fechaVencimiento:"2026-08-01", nota:"Necesario si hay cámaras o drones profesionales durante la carrera. Gestionar con la organización y, si el recorrido discurre por zonas protegidas, con Medio Ambiente.", url:"", fechaSubida: "", responsable: "" },
];

// ─── Subvenciones ─────────────────────────────────────────────────────────────

export const ESTADOS_SUBVENCION = [
  { id: "detectada",     label: "Detectada",     color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: "🔍" },
  { id: "solicitada",    label: "Solicitada",     color: "#22d3ee", bg: "var(--cyan-dim)",        icon: "📤" },
  { id: "en_evaluacion", label: "En evaluación",  color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  icon: "⏳" },
  { id: "concedida",     label: "Concedida",      color: "#34d399", bg: "var(--green-dim)",       icon: "✅" },
  { id: "justificada",   label: "Justificada",    color: "#a78bfa", bg: "var(--violet-dim)",      icon: "📋" },
  { id: "cerrada",       label: "Cerrada",        color: "#34d399", bg: "var(--green-dim)",       icon: "🔒" },
  { id: "denegada",      label: "Denegada",       color: "#f87171", bg: "var(--red-dim)",         icon: "❌" },
];

export const ORGANISMOS_SUBVENCION = [
  "Ayuntamiento", "Diputación", "Comunidad Autónoma", "Ministerio",
  "Federación", "Consejo Superior de Deportes", "Fundación privada", "Otro",
];

export const getSvEstado = (id) => ESTADOS_SUBVENCION.find(e => e.id === id) || ESTADOS_SUBVENCION[0];

export const SUBVENCION_EMPTY = {
  id: null, nombre: "", organismo: "Ayuntamiento", convocatoria: "",
  importeSolicitado: "", importeConcedido: "",
  fechaConvocatoria: "", fechaSolicitud: "", fechaResolucion: "", fechaJustificacion: "",
  estado: "detectada", nota: "", url: "", responsable: "", docIds: [], resolucionDoc: null,
};

export const SUBVENCIONES_DEFAULT = [
  {
    id: "sv1", nombre: "Subvención Ayuntamiento", organismo: "Ayuntamiento",
    convocatoria: "", importeSolicitado: "", importeConcedido: "",
    fechaConvocatoria: "", fechaSolicitud: "", fechaResolucion: "", fechaJustificacion: "",
    estado: "detectada", nota: "Solicitar partida presupuestaria para eventos deportivos municipales.", url: "", responsable: "", docIds: [], resolucionDoc: null,
  },
  {
    id: "sv2", nombre: "Subvención Diputación Provincial", organismo: "Diputación",
    convocatoria: "", importeSolicitado: "", importeConcedido: "",
    fechaConvocatoria: "", fechaSolicitud: "", fechaResolucion: "", fechaJustificacion: "",
    estado: "detectada", nota: "Convocatoria anual de promoción del deporte y turismo rural.", url: "", responsable: "", docIds: [], resolucionDoc: null,
  },
  {
    id: "sv3", nombre: "Subvención Consejo Superior de Deportes", organismo: "Consejo Superior de Deportes",
    convocatoria: "", importeSolicitado: "", importeConcedido: "",
    fechaConvocatoria: "", fechaSolicitud: "", fechaResolucion: "", fechaJustificacion: "",
    estado: "detectada", nota: "Programas de fomento de atletismo y deportes de montaña.", url: "", responsable: "", docIds: [], resolucionDoc: null,
  },
];
