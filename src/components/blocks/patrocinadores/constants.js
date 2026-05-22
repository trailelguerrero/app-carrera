// ─── PATROCINADORES — CONSTANTS ────────────────────────────────────────────────
// Extraído de Patrocinadores.jsx para reducir deuda técnica (ARQ-01)
// CORE-09: alias LS eliminado — usar SK_PAT_PATS / SK_PAT_OBJ de storageKeys directamente

export const NIVELES = ["Oro", "Plata", "Bronce", "Colaborador", "Especie"];

// SEED-02/MEJ-10: todos los tipos usan los valores canónicos de CONTRAPRESTACIONES_TIPO.
// "Logo en web oficial" → "Mención en web oficial"
// "Mención en RRSS" → "Mención en RRSS (x posts)"
// "Logo en díptico/programa" → "Logo en diptico/programa"
// "Stand en zona exposición" → "Stand/carpa en meta"
// "Producto en bolsa del corredor" → "Producto en bolsa del corredor" (correcto)
export const PLANTILLAS_CONTRAPRESTACION = {
  "Oro":         [
    { tipo:"Logo en camiseta corredores", detalle:"Pecho izq. 8×4cm", estado:"pendiente" },
    { tipo:"Logo en camiseta voluntarios", detalle:"Espalda 6×3cm", estado:"pendiente" },
    { tipo:"Banner en zona meta", detalle:"Banner 2×1m", estado:"pendiente" },
    { tipo:"Mención en RRSS (x posts)", detalle:"5 posts + story Instagram", estado:"pendiente" },
    { tipo:"Stand/carpa en meta", detalle:"3m²", estado:"pendiente" },
  ],
  "Plata":       [
    { tipo:"Logo en camiseta corredores", detalle:"Pecho 6×3cm", estado:"pendiente" },
    { tipo:"Banner en avituallamiento", detalle:"Roll-up 0.85×2m", estado:"pendiente" },
    { tipo:"Mención en RRSS (x posts)", detalle:"3 posts Instagram", estado:"pendiente" },
    { tipo:"Mención en web oficial", detalle:"Sección patrocinadores", estado:"pendiente" },
  ],
  "Bronce":      [
    { tipo:"Logo en diptico/programa", detalle:"Logo 4×2cm", estado:"pendiente" },
    { tipo:"Mención en RRSS (x posts)", detalle:"1 post Instagram", estado:"pendiente" },
    { tipo:"Mención en web oficial", detalle:"Sección colaboradores", estado:"pendiente" },
  ],
  "Colaborador": [
    { tipo:"Mención en web oficial", detalle:"Sección colaboradores", estado:"pendiente" },
    { tipo:"Mención en megafonía", detalle:"Mención durante la carrera", estado:"pendiente" },
  ],
  // INC-02: plantilla para patrocinadores en especie (aportación en productos/servicios).
  // Contraprestaciones orientadas a visibilidad de marca y presencia física del producto,
  // no al aspecto económico (ya que no hay aportación monetaria).
  "Especie": [
    { tipo:"Producto en bolsa del corredor", detalle:"1 unidad por corredor inscrito", estado:"pendiente" },
    { tipo:"Mención en web oficial", detalle:"Sección patrocinadores en especie", estado:"pendiente" },
    { tipo:"Mención en megafonía", detalle:"Mención con nombre de marca durante la carrera", estado:"pendiente" },
    { tipo:"Logo en camiseta voluntarios", detalle:"Logo en manga o espalda", estado:"pendiente" },
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

// INC-02: acceso seguro a la plantilla — devuelve [] si el nivel no tiene plantilla definida
export const getPlantilla = (nivel) => PLANTILLAS_CONTRAPRESTACION[nivel] ?? [];

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
    id: 1, nombre: "Empresa Ejemplo Oro", sector: "Deportes / Outdoor", nivel: "Oro",
    contacto: "Contacto Ejemplo 1", telefono: "600 000 001", email: "contacto1@ejemplo.es",
    importe: 2000, importeCobrado: 0, especie: 0, estado: "confirmado",
    fechaAcuerdo: "2026-02-01", fechaVencimiento: "2026-06-01",
    notas: "",
    contraprestaciones: [
      { id:1, tipo:"Logo en camiseta corredores", detalle:"Logo 8x4cm pecho derecho", estado:"pendiente" },
      { id:2, tipo:"Banner en zona meta", detalle:"Banner 2x1m fondo meta", estado:"pendiente" },
      { id:3, tipo:"Mención en RRSS (x posts)", detalle:"3 posts en Instagram + story apertura inscripciones", estado:"pendiente" },
      { id:4, tipo:"Logo en camiseta voluntarios", detalle:"Espalda 6×3cm — camiseta equipo organizador", estado:"pendiente" },
      { id:5, tipo:"Stand/carpa en meta", detalle:"Stand 3m² zona exposición meta", estado:"pendiente" },
    ],
    docs: [],
  },
  {
    id: 2, nombre: "Institución Ejemplo Plata", sector: "Hostelería / Turismo", nivel: "Plata",
    contacto: "Contacto Ejemplo 2", telefono: "600 000 002", email: "contacto2@ejemplo.es",
    importe: 800, importeCobrado: 800, especie: 0, estado: "cobrado",
    fechaAcuerdo: "2026-01-15", fechaVencimiento: "2026-03-01",
    notas: "",
    contraprestaciones: [
      { id:1, tipo:"Logo en camiseta corredores", detalle:"Logo trasero parte inferior", estado:"entregado" },
      { id:2, tipo:"Mención en web oficial", detalle:"Logo + enlace en sección patrocinadores", estado:"entregado" },
      { id:3, tipo:"Mención en RRSS (x posts)", detalle:"2 posts mencionando la sede", estado:"pendiente" },
    ],
    docs: [],
  },
  {
    id: 3, nombre: "Empresa Ejemplo Bronce", sector: "Salud / Fisioterapia", nivel: "Bronce",
    contacto: "Contacto Ejemplo 3", telefono: "600 000 003", email: "contacto3@ejemplo.es",
    importe: 500, importeCobrado: 0, especie: 0, estado: "negociando",
    fechaAcuerdo: "", fechaVencimiento: "2026-05-01",
    notas: "",
    contraprestaciones: [
      { id:1, tipo:"Banner en avituallamiento", detalle:"Banner KM 16 (tramo TG25)", estado:"pendiente" },
      { id:2, tipo:"Logo en diptico/programa", detalle:"Logo en programa oficial", estado:"pendiente" },
    ],
    docs: [],
  },
  {
    id: 4, nombre: "Proveedor Ejemplo Especie", sector: "Alimentación / Nutrición", nivel: "Especie",
    contacto: "Distribuidor Ejemplo", telefono: "600 000 004", email: "especie@ejemplo.es",
    importe: 0, importeCobrado: 0, especie: 520, estado: "confirmado",
    fechaAcuerdo: "2026-02-20", fechaVencimiento: "",
    notas: "",
    contraprestaciones: [
      { id:1, tipo:"Producto en bolsa del corredor", detalle:"1 gel + 1 barrita en bolsa de cada corredor", estado:"pendiente" },
      { id:2, tipo:"Logo en camiseta voluntarios", detalle:"Logo pequeño manga derecha", estado:"pendiente" },
    ],
    docs: [],
    especieItems: [
      { id:1, nombre:"Geles energéticos", cantidad:250, unidad:"unidades", valorUnitario:1.60, recibido:false },
      { id:2, nombre:"Barritas energéticas", cantidad:100, unidad:"unidades", valorUnitario:1.20, recibido:false },
    ],
  },
  {
    id: 5, nombre: "Empresa Ejemplo Colaboradora 1", sector: "Hostelería / Turismo", nivel: "Colaborador",
    contacto: "Contacto Ejemplo 5", telefono: "600 000 005", email: "contacto5@ejemplo.es",
    importe: 300, importeCobrado: 0, especie: 0, estado: "prospecto",
    fechaAcuerdo: "", fechaVencimiento: "",
    notas: "",
    contraprestaciones: [],
    docs: [],
  },
  {
    id: 6, nombre: "Empresa Ejemplo Colaboradora 2", sector: "Hostelería / Turismo", nivel: "Colaborador",
    contacto: "Contacto Ejemplo 6", telefono: "600 000 006", email: "",
    importe: 150, importeCobrado: 150, especie: 0, estado: "cobrado",
    fechaAcuerdo: "2026-01-10", fechaVencimiento: "2026-02-01",
    notas: "",
    contraprestaciones: [
      { id:1, tipo:"Mención en megafonía", detalle:"Mención en acto inaugural y entrega trofeos", estado:"entregado" },
      { id:2, tipo:"Banner en zona meta", detalle:"Lona 1x0.5m en zona de llegada", estado:"entregado" },
    ],
    docs: [],
  },
];
