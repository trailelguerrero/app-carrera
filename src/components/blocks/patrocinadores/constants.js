// ─── PATROCINADORES — CONSTANTS ────────────────────────────────────────────────
// Extraído de Patrocinadores.jsx para reducir deuda técnica (ARQ-01)

import { SK_PAT_ROOT } from "../../../constants/storageKeys";
/** @deprecated Usar SK_PAT_ROOT de storageKeys */
export const LS = SK_PAT_ROOT;

export const NIVELES = ["Oro", "Plata", "Bronce", "Colaborador", "Especie"];

export const PLANTILLAS_CONTRAPRESTACION = {
  "Oro":         [
    { tipo:"Logo en camiseta corredores", detalle:"Pecho izq. 8×4cm", estado:"pendiente" },
    { tipo:"Logo en camiseta voluntarios", detalle:"Espalda 6×3cm", estado:"pendiente" },
    { tipo:"Banner en zona meta", detalle:"Banner 2×1m", estado:"pendiente" },
    { tipo:"Mención en RRSS", detalle:"5 posts + story Instagram", estado:"pendiente" },
    { tipo:"Stand en zona exposición", detalle:"3m²", estado:"pendiente" },
  ],
  "Plata":       [
    { tipo:"Logo en camiseta corredores", detalle:"Pecho 6×3cm", estado:"pendiente" },
    { tipo:"Banner en avituallamiento", detalle:"Roll-up 0.85×2m", estado:"pendiente" },
    { tipo:"Mención en RRSS", detalle:"3 posts Instagram", estado:"pendiente" },
    { tipo:"Logo en web oficial", detalle:"Sección patrocinadores", estado:"pendiente" },
  ],
  "Bronce":      [
    { tipo:"Logo en díptico/programa", detalle:"Logo 4×2cm", estado:"pendiente" },
    { tipo:"Mención en RRSS", detalle:"1 post Instagram", estado:"pendiente" },
    { tipo:"Logo en web oficial", detalle:"Sección colaboradores", estado:"pendiente" },
  ],
  "Colaborador": [
    { tipo:"Logo en web oficial", detalle:"Sección colaboradores", estado:"pendiente" },
    { tipo:"Mención en megafonía", detalle:"Mención durante la carrera", estado:"pendiente" },
  ],
};

export const NIVEL_CFG = {
  Oro:         { color: "#f59e0b", dim: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", icon: "🥇", objetivo: 2000 },
  Plata:       { color: "#94a3b8", dim: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)", icon: "🥈", objetivo: 1000 },
  Bronce:      { color: "#c47b3a", dim: "rgba(196,123,58,0.12)", border: "rgba(196,123,58,0.3)", icon: "🥉", objetivo: 500 },
  Colaborador: { color: "#34d399", dim: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.25)", icon: "🤝", objetivo: 200 },
  Especie:     { color: "#a78bfa", dim: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)", icon: "📦", objetivo: 0 },
};

export const getCfg = (nivel) => NIVEL_CFG[nivel] || NIVEL_CFG.Colaborador;

export const ESTADOS = ["prospecto", "negociando", "confirmado", "cobrado", "cancelado"];

export const ESTADO_CFG = {
  prospecto:  { color: "var(--text-muted)", bg: "rgba(90,106,138,0.12)", label: "Prospecto" },
  negociando: { color: "#fbbf24", bg: "var(--amber-dim)",  label: "Negociando" },
  confirmado: { color: "#22d3ee", bg: "var(--cyan-dim)",  label: "Confirmado" },
  cobrado:    { color: "#34d399", bg: "var(--green-dim)",  label: "Cobrado" },
  cancelado:  { color: "#f87171", bg: "var(--red-dim)", label: "Cancelado" },
};

export const CONTRAPRESTACIONES_TIPO = [
  "Logo en camiseta voluntarios",
  "Logo en camiseta corredores",
  "Banner en zona meta",
  "Banner en avituallamiento",
  "Mención en RRSS (x posts)",
  "Mención en web oficial",
  "Dorsales gratuitos",
  "Stand/carpa en meta",
  "Logo en diptico/programa",
  "Mención en megafonía",
  "Logo en medallas",
  "Producto en bolsa del corredor",
];

export const TIPOS_DOC = [
  "Contrato","Presupuesto","Factura","Justificante de pago",
  "Póliza de seguro","Cobertura seguro","Acuerdo patrocinio","Otro",
];

export const SECTORES = [
  "Deportes / Outdoor", "Alimentación / Nutrición", "Salud / Fisioterapia",
  "Hostelería / Turismo", "Comercio local", "Administración pública",
  "Transporte / Automoción", "Tecnología", "Medios / Comunicación", "Otro",
];

// ─── DATOS SEMILLA ─────────────────────────────────────────────────────────────
export const PAT0 = [
  {
    id: 1, nombre: "Decathlon Ávila", sector: "Deportes / Outdoor", nivel: "Oro",
    contacto: "Carlos Méndez", telefono: "920 111 222", email: "cmendez@decathlon.es",
    importe: 2000, importeCobrado: 0, especie: 0, estado: "confirmado",
    fechaAcuerdo: "2026-02-01", fechaVencimiento: "2026-06-01",
    notas: "Interesados en imagen de marca en camiseta y banner en meta. Reunión el 3 de marzo.",
    contraprestaciones: [
      { id:1, tipo:"Logo en camiseta corredores", detalle:"Logo 8x4cm pecho derecho", estado:"pendiente" },
      { id:2, tipo:"Banner en zona meta", detalle:"Banner 2x1m fondo meta", estado:"pendiente" },
      { id:3, tipo:"Mención en RRSS (x posts)", detalle:"3 posts en Instagram + story apertura inscripciones", estado:"pendiente" },
    ],
    docs: [],
  },
  {
    id: 2, nombre: "Turismo Candeleda", sector: "Hostelería / Turismo", nivel: "Plata",
    contacto: "Ana Rodríguez (Ayuntamiento)", telefono: "920 380 001", email: "turismo@candeleda.es",
    importe: 800, importeCobrado: 800, especie: 0, estado: "cobrado",
    fechaAcuerdo: "2026-01-15", fechaVencimiento: "2026-03-01",
    notas: "Apoyo institucional confirmado. Importe ya transferido. Piden mención en todos los comunicados.",
    contraprestaciones: [
      { id:1, tipo:"Logo en camiseta corredores", detalle:"Logo trasero parte inferior", estado:"entregado" },
      { id:2, tipo:"Mención en web oficial", detalle:"Logo + enlace en sección patrocinadores", estado:"entregado" },
      { id:3, tipo:"Mención en RRSS (x posts)", detalle:"2 posts mencionando Candeleda como sede", estado:"pendiente" },
    ],
    docs: [],
  },
  {
    id: 3, nombre: "Clínica Fisio TrailRun", sector: "Salud / Fisioterapia", nivel: "Bronce",
    contacto: "Marta Jiménez", telefono: "612 333 444", email: "marta@fisiotrailrun.es",
    importe: 500, importeCobrado: 0, especie: 0, estado: "negociando",
    fechaAcuerdo: "", fechaVencimiento: "2026-05-01",
    notas: "Ofrecen servicio de fisio gratuito en meta además del patrocinio económico. Pendiente firma contrato.",
    contraprestaciones: [
      { id:1, tipo:"Banner en avituallamiento", detalle:"Banner KM 16 (tramo TG25)", estado:"pendiente" },
      { id:2, tipo:"Logo en diptico/programa", detalle:"Logo en programa oficial", estado:"pendiente" },
    ],
    docs: [],
  },
  {
    id: 4, nombre: "GU Energy Labs", sector: "Alimentación / Nutrición", nivel: "Especie",
    contacto: "Distribuidor ES", telefono: "93 000 1111", email: "iberia@guenergy.com",
    importe: 0, importeCobrado: 0, especie: 800, estado: "confirmado",
    fechaAcuerdo: "2026-02-20", fechaVencimiento: "",
    notas: "Patrocinio en especie: 250 geles + 100 barritas para avituallamiento TG25 y TG13. Envío previsto julio.",
    contraprestaciones: [
      { id:1, tipo:"Producto en bolsa del corredor", detalle:"1 gel + 1 barrita en bolsa de cada corredor", estado:"pendiente" },
      { id:2, tipo:"Logo en camiseta voluntarios", detalle:"Logo pequeño manga derecha", estado:"pendiente" },
    ],
    docs: [],
    especieItems: [
      { id:1, nombre:"Geles energéticos", cantidad:250, unidad:"unidades", recibido:false },
      { id:2, nombre:"Barritas energéticas", cantidad:100, unidad:"unidades", recibido:false },
    ],
  },
  {
    id: 5, nombre: "Hotel Gredos Sierra", sector: "Hostelería / Turismo", nivel: "Colaborador",
    contacto: "José Luis Parra", telefono: "920 380 050", email: "jlparra@hotelgredos.es",
    importe: 300, importeCobrado: 0, especie: 0, estado: "prospecto",
    fechaAcuerdo: "", fechaVencimiento: "",
    notas: "Primera toma de contacto por correo. Sin respuesta aún. Seguimiento pendiente.",
    contraprestaciones: [],
    docs: [],
  },
  {
    id: 6, nombre: "Bar Restaurante El Guerrero", sector: "Hostelería / Turismo", nivel: "Colaborador",
    contacto: "Pedro Alonso", telefono: "920 380 090", email: "",
    importe: 150, importeCobrado: 150, especie: 0, estado: "cobrado",
    fechaAcuerdo: "2026-01-10", fechaVencimiento: "2026-02-01",
    notas: "Colaborador local histórico. Cede el local para la pasta-party pre-carrera.",
    contraprestaciones: [
      { id:1, tipo:"Mención en megafonía", detalle:"Mención en acto inaugural y entrega trofeos", estado:"pendiente" },
      { id:2, tipo:"Banner en zona meta", detalle:"Lona 1x0.5m en zona de llegada", estado:"pendiente" },
    ],
    docs: [],
  },
];
