/**
 * puestosConstants.js — MEJ-21
 *
 * Fuente canónica de PUESTOS_DEFAULT para toda la aplicación.
 * Importar desde aquí en lugar de definir localmente en cada módulo.
 *
 * Consumidores:
 *   - src/components/blocks/Voluntarios.jsx
 *   - src/components/blocks/OnboardingModal.jsx
 */

export const PUESTOS_DEFAULT = [
  { id: 1,  nombre: "Zona de Salida / Meta",    tipo: "Salida/Meta",      distancias: ["Todas"],            horaInicio: "06:30", horaFin: "18:00", necesarios: 8,  responsableId: null, localizacionId: 1,  notas: "Control de dorsales, gestión de salidas escalonadas" },
  { id: 2,  nombre: "Avituallamiento KM 4",     tipo: "Avituallamiento",  distancias: ["TG7","TG13","TG25"],horaInicio: "07:30", horaFin: "14:00", necesarios: 4,  responsableId: null, localizacionId: 2,  notas: "Agua, isotónico, fruta, barritas" },
  { id: 3,  nombre: "Avituallamiento KM 9",     tipo: "Avituallamiento",  distancias: ["TG13","TG25"],      horaInicio: "08:00", horaFin: "15:00", necesarios: 4,  responsableId: null, localizacionId: 3,  notas: "Agua, isotónico, fruta, geles, sándwiches" },
  { id: 4,  nombre: "Avituallamiento KM 16",    tipo: "Avituallamiento",  distancias: ["TG25"],             horaInicio: "08:30", horaFin: "16:00", necesarios: 5,  responsableId: null, localizacionId: 4,  notas: "Avituallamiento principal TG25 — comida caliente" },
  { id: 5,  nombre: "Punto Control KM 7",       tipo: "Control",          distancias: ["TG13","TG25"],      horaInicio: "08:00", horaFin: "13:00", necesarios: 2,  responsableId: null, localizacionId: 5,  notas: "Registro de dorsales, corte de tiempos" },
  { id: 6,  nombre: "Punto Control KM 13",      tipo: "Control",          distancias: ["TG25"],             horaInicio: "09:00", horaFin: "15:00", necesarios: 2,  responsableId: null, localizacionId: 6,  tiempoLimite: "14:00", notas: "Registro de dorsales, corte de tiempos. Corredores que lleguen después del tiempo límite deben ser retirados de la competición." },
  { id: 7,  nombre: "Seguridad Vial Cruce 1",   tipo: "Seguridad",        distancias: ["Todas"],            horaInicio: "07:00", horaFin: "14:00", necesarios: 2,  responsableId: null, localizacionId: 7,  notas: "Control de tráfico en cruce principal" },
  { id: 8,  nombre: "Seguridad Vial Cruce 2",   tipo: "Seguridad",        distancias: ["TG13","TG25"],      horaInicio: "07:30", horaFin: "16:00", necesarios: 2,  responsableId: null, localizacionId: 8,  notas: "Control de tráfico en cruce secundario" },
  { id: 9,  nombre: "Señalización Ruta Alta",   tipo: "Señalización",     distancias: ["TG25"],             horaInicio: "06:00", horaFin: "08:00", necesarios: 3,  responsableId: null, localizacionId: 9,  notas: "Colocación de balizas tramo alto — madrugada" },
  { id: 10, nombre: "Parking y Accesos",        tipo: "Parking",          distancias: ["Todas"],            horaInicio: "06:00", horaFin: "12:00", necesarios: 4,  responsableId: null, localizacionId: 10, notas: "Gestión de aparcamiento y acceso peatonal" },
  { id: 11, nombre: "Zona de Llegada / Trofeos",tipo: "Organización",     distancias: ["Todas"],            horaInicio: "09:00", horaFin: "18:00", necesarios: 5,  responsableId: null, localizacionId: 11, notas: "Recepción finishers, entrega medallas, clasificaciones" },
  { id: 12, nombre: "Primeros Auxilios Base",   tipo: "Primeros Auxilios",distancias: ["Todas"],            horaInicio: "06:30", horaFin: "18:00", necesarios: 3,  responsableId: null, localizacionId: 12, notas: "Titulación requerida: socorrismo o enfermería" },
];
