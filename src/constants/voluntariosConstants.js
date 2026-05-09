// Shared constants extracted from Voluntarios.jsx — Sprint 2 refactor

export const ESTADOS = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  ausente: "Ausente",
};

export const TIPOS_PUESTO = [
  "Salida/Meta",
  "Avituallamiento",
  "Control",
  "Seguridad",
  "Señalización",
  "Parking",
  "Organización",
  "Primeros Auxilios",
];

export const DISTANCIAS_PUESTO = ["TG7", "TG13", "TG25", "Todas"];

export const DIST_COLORS = {
  TG7: "#22d3ee",
  TG13: "#a78bfa",
  TG25: "#34d399",
  Todas: "#fbbf24",
};

/** Retorna el color del texto según el estado del voluntario. */
export function estadoColor(e) {
  return e === "confirmado"
    ? "var(--green)"
    : e === "cancelado"
    ? "var(--red)"
    : e === "ausente"
    ? "var(--orange)"
    : "var(--amber)";
}

/** Retorna el color de fondo según el estado del voluntario. */
export function estadoBg(e) {
  return e === "confirmado"
    ? "var(--green-dim)"
    : e === "cancelado"
    ? "var(--red-dim)"
    : e === "ausente"
    ? "var(--orange-dim)"
    : "var(--amber-dim)";
}
