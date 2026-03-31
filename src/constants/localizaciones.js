/**
 * LOCALIZACIONES — Constantes compartidas entre Logística y Voluntarios.
 * Fuente única de verdad para los puestos maestros de la carrera.
 */
export const LOCS_KEY = "teg_localizaciones_v1";

export const LOCS_DEFAULT = [
  { id:1,  nombre:"Zona Salida/Meta",        tipo:"meta",          descripcion:"Punto de salida y llegada de todas las distancias" },
  { id:2,  nombre:"Avituallamiento KM 4",    tipo:"avituallamiento", descripcion:"Primer avituallamiento líquido TG7/TG13/TG25" },
  { id:3,  nombre:"Avituallamiento KM 9",    tipo:"avituallamiento", descripcion:"Segundo avituallamiento sólido+líquido TG13/TG25" },
  { id:4,  nombre:"Avituallamiento KM 16",   tipo:"avituallamiento", descripcion:"Avituallamiento completo TG25 únicamente" },
  { id:5,  nombre:"Control KM 7",            tipo:"control",       descripcion:"Control de paso TG13/TG25" },
  { id:6,  nombre:"Control KM 13",           tipo:"control",       descripcion:"Control de paso TG25" },
  { id:7,  nombre:"Seguridad Cruce 1",       tipo:"seguridad",     descripcion:"Cruce de carretera peligroso" },
  { id:8,  nombre:"Seguridad Cruce 2",       tipo:"seguridad",     descripcion:"Segundo cruce de carretera" },
  { id:9,  nombre:"Señalización Ruta Alta",  tipo:"señalización",  descripcion:"Zona de cambio de dirección ruta TG25" },
  { id:10, nombre:"Parking",                 tipo:"parking",       descripcion:"Área de aparcamiento para corredores y equipo" },
  { id:11, nombre:"Zona Llegada/Trofeos",    tipo:"meta",          descripcion:"Zona de llegada y entrega de trofeos" },
  { id:12, nombre:"Primeros Auxilios Base",  tipo:"sanidad",       descripcion:"Puesto médico fijo en zona meta" },
];
