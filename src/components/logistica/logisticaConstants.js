// Shared constants and defaults extracted from Logistica.jsx — Sprint 2
// ─── MATERIAL ─────────────────────────────────────────────────────────────────
const CATS_MATERIAL = ["Avituallamiento","Señalización","Seguridad","Comunicación","Médico","Organización","Infraestructura"];
const CAT_ICONS = { Avituallamiento:"🍎", Señalización:"🚩", Seguridad:"🦺", Comunicación:"📡", Médico:"🏥", Organización:"📋", Infraestructura:"⛺" };
const CAT_COLORS = { Avituallamiento:"var(--green)", Señalización:"var(--amber)", Seguridad:"var(--orange)", Comunicación:"var(--cyan)", Médico:"var(--red)", Organización:"var(--violet)", Infraestructura:"var(--cyan)" };

// ─── TIMELINE ─────────────────────────────────────────────────────────────────
const TLC = {logistica:"var(--amber)",organizacion:"var(--violet)",voluntarios:"var(--green)",carrera:"var(--cyan)",comunicacion:"var(--orange)"};
const TLI = {logistica:"🚚",organizacion:"📋",voluntarios:"👥",carrera:"🏃",comunicacion:"📡"};

// ─── PROTOCOLOS DE EMERGENCIA ──────────────────────────────────────────────────
const PROTO_PASOS=[
  {id:1,titulo:"Accidente de corredor en ruta",icon:"🏃",pasos:["Recibir aviso por walkie del puesto más cercano","Confirmar ubicación exacta (KM de ruta + puesto)","Contactar inmediatamente con Cruz Roja: 920 350 033","Notificar a Dirección de carrera","Si hay riesgo vital: llamar al 112","Enviar vehículo todoterreno si es necesario acceder","Registrar incidencia en el módulo"]},
  {id:2,titulo:"Corredor desaparecido / extraviado",icon:"❓",pasos:["Confirmar último control donde fue visto (hora, KM)","Contactar con delegado de la distancia correspondiente","Activar protocolo búsqueda: recorrer tramo a pie/vehículo","Contactar con Guardia Civil Candeleda: 920 380 100","No cerrar el puesto hasta localizar al corredor","Registrar toda la información en incidencias"]},
  {id:3,titulo:"Incidencia meteorológica grave",icon:"⛈️",pasos:["Evaluar gravedad con meteorología local","Consultar con organización y juez árbitro","Si hay peligro: detener la prueba por walkie general","Reunir a corredores en el punto de control más cercano","Activar vehículos de recogida para tramos lejanos","Decisión final de suspensión: Dirección + Juez árbitro"]},
  {id:4,titulo:"Problema en avituallamiento",icon:"🍎",pasos:["Identificar qué falta (agua, isotónico, otro)","Contactar con furgoneta de reparto","Si urgente: enviar voluntario con coche propio","Alternativa: reducir raciones hasta reponer","Registrar en incidencias para próxima edición"]},
];
const ESTADO_ENTREGA = ["pendiente","en tránsito","entregado","recogido"];
const ESTADO_TAREA = ["pendiente","en curso","completado","bloqueado"];
const ESTADO_COLORES = { pendiente:"var(--amber)","en tránsito":"var(--cyan)",entregado:"var(--green)",recogido:"var(--text-muted)","en curso":"var(--cyan)",completado:"var(--green)",bloqueado:"var(--red)","en gestión":"var(--cyan)","abierta":"var(--amber)","resuelta":"var(--green)" };
const FASES_CHECKLIST = ["3 meses antes","2 meses antes","1 mes antes","Semana antes","Día antes","Mañana carrera","Durante carrera","Post-carrera"];
const PUESTOS_REF = ["Zona Salida/Meta","Avituallamiento KM 4","Avituallamiento KM 9","Avituallamiento KM 16","Control KM 7","Control KM 13","Seguridad Cruce 1","Seguridad Cruce 2","Señalización Ruta Alta","Parking","Zona Llegada/Trofeos","Primeros Auxilios Base"];

const TIPOS_LOC = ["meta", "avituallamiento", "control", "seguridad", "señalización", "parking", "sanidad", "otro"];
const LOC_ICONS = { meta:"🎏", avituallamiento:"🍎", control:"📍", seguridad:"🦸", señalización:"🚩", parking:"🅿️", sanidad:"🏥", otro:"📌" };
const LOC_COLORS = { meta:"var(--green)", avituallamiento:"var(--cyan)", control:"var(--amber)", seguridad:"var(--red)", señalización:"var(--amber)", parking:"var(--cyan)", sanidad:"var(--red)", otro:"var(--text-muted)" };

// LOCS_DEFAULT importado de @/constants/localizaciones

// ─── MATERIALES QUE ESCALAN CON INSCRITOS ────────────────────────────────────
// Artículos cuyo stock mínimo necesario es 1 unidad por corredor inscrito.
// Usados en el panel de alertas del Dashboard para detectar déficit respecto
// al número total de inscritos (stock < totalInscritos).
const ESCALA_CON_INSCRITOS = [
  { patron: /dorsal/i,                                  label: "dorsales" },
  { patron: /medalla/i,                                 label: "medallas" },
  { patron: /chip/i,                                    label: "chips" },
  { patron: /camiseta.*corredor|corredor.*camiseta/i,   label: "camisetas corredor" },
];

// ─── DATOS DEFAULT ────────────────────────────────────────────────────────────
const MAT0 = [
  // cantidadInicial: stock original al inicio de la temporada (solo referencia,
  // no se usa en cálculos — el campo operativo es "stock")
  {id:1,nombre:"Agua (bidones 8L)",categoria:"Avituallamiento",cantidadInicial:60,unidad:"ud",stock:60},
  {id:2,nombre:"Isotónico (botellas 1.5L)",categoria:"Avituallamiento",cantidadInicial:40,unidad:"ud",stock:40},
  {id:3,nombre:"Fruta (kg)",categoria:"Avituallamiento",cantidadInicial:30,unidad:"kg",stock:30},
  {id:4,nombre:"Geles energéticos",categoria:"Avituallamiento",cantidadInicial:200,unidad:"ud",stock:200},
  {id:5,nombre:"Sándwiches variados",categoria:"Avituallamiento",cantidadInicial:150,unidad:"ud",stock:150},
  {id:6,nombre:"Vasos desechables",categoria:"Avituallamiento",cantidadInicial:2000,unidad:"ud",stock:2000},
  {id:7,nombre:"Cubos de hielo (bolsas)",categoria:"Avituallamiento",cantidadInicial:20,unidad:"ud",stock:20},
  {id:8,nombre:"Mesas plegables",categoria:"Infraestructura",cantidadInicial:12,unidad:"ud",stock:12},
  {id:9,nombre:"Carpas 3x3m",categoria:"Infraestructura",cantidadInicial:8,unidad:"ud",stock:8},
  {id:10,nombre:"Walkie-talkies",categoria:"Comunicación",cantidadInicial:12,unidad:"ud",stock:12},
  {id:11,nombre:"Balizas señalización",categoria:"Señalización",cantidadInicial:300,unidad:"ud",stock:300},
  {id:12,nombre:"Conos de tráfico",categoria:"Señalización",cantidadInicial:40,unidad:"ud",stock:40},
  {id:13,nombre:"Chalecos reflectantes",categoria:"Seguridad",cantidadInicial:20,unidad:"ud",stock:20},
  {id:14,nombre:"Botiquín de campo",categoria:"Médico",cantidadInicial:6,unidad:"ud",stock:6},
  {id:15,nombre:"Camilla de rescate",categoria:"Médico",cantidadInicial:2,unidad:"ud",stock:2},
  {id:16,nombre:"Dorsales impresos",categoria:"Organización",cantidadInicial:650,unidad:"ud",stock:650},
  {id:17,nombre:"Medallas finisher",categoria:"Organización",cantidadInicial:650,unidad:"ud",stock:650},
  {id:18,nombre:"Trofeos pódium",categoria:"Organización",cantidadInicial:18,unidad:"ud",stock:18},
];
const ASIG0 = [
  {id:1,materialId:1, localizacionId:2,  puesto:"Avituallamiento KM 4",   cantidad:8,  estado:"pendiente"},
  {id:2,materialId:1, localizacionId:3,  puesto:"Avituallamiento KM 9",   cantidad:10, estado:"pendiente"},
  {id:3,materialId:1, localizacionId:4,  puesto:"Avituallamiento KM 16",  cantidad:15, estado:"pendiente"},
  {id:4,materialId:4, localizacionId:3,  puesto:"Avituallamiento KM 9",   cantidad:60, estado:"pendiente"},
  {id:5,materialId:4, localizacionId:4,  puesto:"Avituallamiento KM 16",  cantidad:100,estado:"pendiente"},
  {id:6,materialId:10,localizacionId:5,  puesto:"Control KM 7",           cantidad:2,  estado:"pendiente"},
  {id:7,materialId:10,localizacionId:6,  puesto:"Control KM 13",          cantidad:2,  estado:"pendiente"},
  {id:8,materialId:10,localizacionId:1,  puesto:"Zona Salida/Meta",        cantidad:3,  estado:"pendiente"},
  {id:9,materialId:11,localizacionId:9,  puesto:"Señalización Ruta Alta",  cantidad:120,estado:"pendiente"},
  {id:10,materialId:14,localizacionId:12,puesto:"Primeros Auxilios Base",  cantidad:3,  estado:"pendiente"},
  {id:11,materialId:16,localizacionId:1, puesto:"Zona Salida/Meta",        cantidad:650,estado:"pendiente"},
  {id:12,materialId:17,localizacionId:11,puesto:"Zona Llegada/Trofeos",    cantidad:650,estado:"pendiente"},
];
const VEH0 = [
  {id:1,nombre:"Furgoneta Organización",matricula:"0000-AAA",conductor:"Conductor Ejemplo 1",capacidad:"1.5 ton",telefono:"600 000 001",notas:"Reparto material avituallamiento"},
  {id:2,nombre:"Pick-up Señalización",matricula:"0000-BBB",conductor:"Conductor Ejemplo 2",capacidad:"500 kg",telefono:"600 000 002",notas:"Balizas y señalización de ruta"},
  {id:3,nombre:"Todoterreno Dirección",matricula:"0000-CCC",conductor:"Conductor Ejemplo 3",capacidad:"5 personas",telefono:"600 000 003",notas:"Vehículo de coordinación en ruta"},
  {id:4,nombre:"Ambulancia Servicio Médico",matricula:"0000-DDD",conductor:"Servicio Médico",capacidad:"2 camillas",telefono:"112",notas:"Servicio de emergencias médicas"},
];
const RUTAS0 = [
  {id:1,vehiculoId:1,nombre:"Ruta Avituallamiento Norte",horaInicio:"05:30",paradas:[
    {puesto:"Avituallamiento KM 4",hora:"05:45",material:"Agua x8",asigIds:[1]},
    {puesto:"Avituallamiento KM 9",hora:"06:00",material:"Agua x10, Isotónico x8, Geles x60",asigIds:[2,4]},
    {puesto:"Avituallamiento KM 16",hora:"06:45",material:"Agua x15, Isotónico x12, Geles x100",asigIds:[3,5]},
  ]},
  {id:2,vehiculoId:2,nombre:"Ruta Señalización",horaInicio:"04:30",paradas:[
    {puesto:"Señalización Ruta Alta",hora:"05:00",material:"Balizas x120",asigIds:[9]},
    {puesto:"Seguridad Cruce 1",hora:"06:00",material:"Conos x15, Chalecos x5",asigIds:[]},
  ]},
];
const TL0 = [
  {id:1,hora:"04:30",titulo:"Salida equipo señalización",descripcion:"Pick-up con balizas y conos sale hacia ruta alta",responsable:"Pedro Sánchez",categoria:"logistica",estado:"pendiente"},
  {id:2,hora:"05:00",titulo:"Apertura zona de meta",descripcion:"Montaje carpas, mesas, sistema de cronometraje",responsable:"Coordinación",categoria:"organizacion",estado:"pendiente"},
  {id:3,hora:"05:30",titulo:"Briefing voluntarios",descripcion:"Reunión general — zona parking. Entrega de walkies y dorsales de voluntario",responsable:"Coordinación",categoria:"voluntarios",estado:"pendiente",_ckId:15},
  {id:4,hora:"06:00",titulo:"Apertura inscripciones y dorsales",descripcion:"Inicio entrega de dorsales a corredores inscritos",responsable:"Zona Salida/Meta",categoria:"organizacion",estado:"pendiente",_ckId:16},
  {id:5,hora:"06:30",titulo:"Confirmación puestos activos",descripcion:"Todos los puestos confirman por walkie que están operativos",responsable:"Dirección carrera",categoria:"comunicacion",estado:"pendiente",_ckId:17},
  {id:6,hora:"07:00",titulo:"Salida TG25 (élite)",descripcion:"Salida oleada élite TG25 — 70 corredores",responsable:"Juez árbitro",categoria:"carrera",estado:"pendiente"},
  {id:7,hora:"07:30",titulo:"Salida TG13",descripcion:"Salida TG13 — 100 corredores",responsable:"Juez árbitro",categoria:"carrera",estado:"pendiente"},
  {id:8,hora:"08:00",titulo:"Salida TG7",descripcion:"Salida TG7 — 80 corredores",responsable:"Juez árbitro",categoria:"carrera",estado:"pendiente"},
  {id:9,hora:"08:50",titulo:"Primer finisher TG7 (est.)",descripcion:"Estimación llegada primer finisher TG7 (~50 min desde salida, ritmo ~7:08 min/km en trail)",responsable:"Cronometraje",categoria:"carrera",estado:"pendiente"},
  {id:10,hora:"11:00",titulo:"Primer finisher TG25 (est.)",descripcion:"Estimación llegada primer finisher TG25",responsable:"Cronometraje",categoria:"carrera",estado:"pendiente"},
  {id:11,hora:"12:00",titulo:"Cierre TG7 (corte tiempo)",descripcion:"Cierre oficial TG7 — retirada balizas segmento inicial",responsable:"Control de ruta",categoria:"carrera",estado:"pendiente"},
  {id:12,hora:"14:00",titulo:"Cierre TG13 (corte tiempo)",descripcion:"Cierre oficial TG13",responsable:"Control de ruta",categoria:"carrera",estado:"pendiente"},
  {id:13,hora:"16:00",titulo:"Cierre TG25 (corte tiempo)",descripcion:"Cierre oficial TG25 — recogida material puestos",responsable:"Control de ruta",categoria:"carrera",estado:"pendiente"},
  {id:14,hora:"18:00",titulo:"Inicio recogida material",descripcion:"Furgoneta inicia recogida de puestos en orden inverso (tras ceremonia trofeos)",responsable:"Javier López",categoria:"logistica",estado:"pendiente",_ckId:21},
  {id:15,hora:"17:30",titulo:"Entrega de trofeos y pódios",descripcion:"Ceremonia oficial de trofeos — zona meta",responsable:"Organización",categoria:"organizacion",estado:"pendiente"},
  {id:16,hora:"19:00",titulo:"Cierre del evento",descripcion:"Desmontaje zona meta, recuento material, briefing post-evento",responsable:"Coordinación",categoria:"organizacion",estado:"pendiente"},
];
const CONT0 = [
  {id:1,nombre:"Administración Local",rol:"Administración local",telefono:"600 000 001",email:"admin@ejemplo.es",tipo:"institucional",notas:"Autorización evento, apoyo local"},
  {id:2,nombre:"Seguridad Vial",rol:"Seguridad vial",telefono:"600 000 002",email:"",tipo:"emergencia",notas:"Corte de tráfico y seguridad en carretera"},
  {id:3,nombre:"Servicio Médico",rol:"Servicio médico",telefono:"600 000 003",email:"medico@ejemplo.es",tipo:"emergencia",notas:"Ambulancia + 2 sanitarios"},
  {id:4,nombre:"112 Emergencias",rol:"Emergencias generales",telefono:"112",email:"",tipo:"emergencia",notas:""},
  {id:5,nombre:"Empresa Cronometraje",rol:"Proveedor cronometraje",telefono:"600 000 004",email:"crono@ejemplo.es",tipo:"proveedor",notas:"Llegar a las 05:00"},
  {id:6,nombre:"Proveedor Avituallamiento",rol:"Suministro agua e isotónico",telefono:"600 000 005",email:"avitu@ejemplo.es",tipo:"proveedor",notas:"Entrega antes de las 18:00"},
  {id:7,nombre:"Delegado Distancia Larga",rol:"Delegado TG25",telefono:"600 000 006",email:"delegado1@ejemplo.es",tipo:"staff",notas:"Responsable seguimiento corredor TG25"},
  {id:8,nombre:"Delegada Distancia Media",rol:"Delegada TG13",telefono:"600 000 007",email:"delegada2@ejemplo.es",tipo:"staff",notas:"Responsable seguimiento corredor TG13"},
  {id:9,nombre:"Delegado Distancia Corta",rol:"Delegado TG7",telefono:"600 000 008",email:"delegado3@ejemplo.es",tipo:"staff",notas:"Responsable seguimiento corredor TG7"},
];
const INC0 = [];
const CK0 = [
  // proyectoTareaId vincula con la tarea equivalente en TAREAS0 (proyectoConstants.js)
  // para que completar el ítem operativo actualice automáticamente el estado en Proyecto.
  {id:1,fase:"Semana antes",tarea:"Confirmar autorización ayuntamiento",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:"",proyectoTareaId:1},
  {id:2,fase:"Semana antes",tarea:"Confirmar servicio médico Cruz Roja",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:"",proyectoTareaId:41},
  {id:3,fase:"Semana antes",tarea:"Revisar todo el material de señalización",responsable:"Pedro Sánchez",estado:"pendiente",prioridad:"alta",notas:""},
  {id:4,fase:"Semana antes",tarea:"Confirmar voluntarios y asignar puestos",responsable:"Coordinación",estado:"pendiente",prioridad:"alta",notas:""},
  {id:5,fase:"Semana antes",tarea:"Pedido avituallamiento confirmado",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:"",proyectoTareaId:42},
  {id:6,fase:"Semana antes",tarea:"Imprimir dorsales y números de control",responsable:"Organización",estado:"pendiente",prioridad:"media",notas:""},
  {id:7,fase:"Semana antes",tarea:"Probar sistema de cronometraje",responsable:"Cronometraje",estado:"pendiente",prioridad:"alta",notas:"",proyectoTareaId:40},
  {id:8,fase:"Semana antes",tarea:"Cargar walkies y verificar cobertura",responsable:"Coordinación",estado:"pendiente",prioridad:"media",notas:""},
  {id:9,fase:"Día antes",tarea:"Señalizar ruta completa (balizas)",responsable:"Pedro Sánchez",estado:"pendiente",prioridad:"alta",notas:"",proyectoTareaId:35},
  {id:10,fase:"Día antes",tarea:"Montar infraestructura zona meta",responsable:"Javier López",estado:"pendiente",prioridad:"alta",notas:"",proyectoTareaId:48},
  {id:11,fase:"Día antes",tarea:"Recibir y almacenar avituallamiento",responsable:"Javier López",estado:"pendiente",prioridad:"alta",notas:""},
  {id:12,fase:"Día antes",tarea:"Confirmar asistencia todos los voluntarios",responsable:"Coordinación",estado:"pendiente",prioridad:"alta",notas:"",proyectoTareaId:31},
  {id:13,fase:"Día antes",tarea:"Preparar kits voluntarios (camiseta+walkie+instrucciones)",responsable:"Organización",estado:"pendiente",prioridad:"media",notas:""},
  {id:14,fase:"Día antes",tarea:"Carga furgoneta material avituallamiento",responsable:"Javier López",estado:"pendiente",prioridad:"alta",notas:"",proyectoTareaId:45},
  {id:15,fase:"Mañana carrera",tarea:"Briefing voluntarios 05:30",responsable:"Coordinación",estado:"pendiente",prioridad:"alta",notas:"",proyectoTareaId:32,_tlId:3},
  {id:16,fase:"Mañana carrera",tarea:"Entrega dorsales (06:00-07:00)",responsable:"Zona Salida/Meta",estado:"pendiente",prioridad:"alta",notas:"",_tlId:4},
  {id:17,fase:"Mañana carrera",tarea:"Todos los puestos operativos confirmados",responsable:"Dirección",estado:"pendiente",prioridad:"alta",notas:"",_tlId:5},
  {id:18,fase:"Mañana carrera",tarea:"Ambulancia en posición (06:30)",responsable:"Cruz Roja",estado:"pendiente",prioridad:"alta",notas:""},
  {id:19,fase:"Durante carrera",tarea:"Seguimiento llegada corredores por walkie",responsable:"Dirección",estado:"pendiente",prioridad:"alta",notas:""},
  {id:20,fase:"Durante carrera",tarea:"Control cierres de ruta en horario",responsable:"Control de ruta",estado:"pendiente",prioridad:"alta",notas:""},
  {id:21,fase:"Post-carrera",tarea:"Recogida de todo el material en puestos",responsable:"Javier López",estado:"pendiente",prioridad:"alta",notas:"",proyectoTareaId:49,_tlId:14},
  {id:22,fase:"Post-carrera",tarea:"Retirada señalización de ruta completa",responsable:"Pedro Sánchez",estado:"pendiente",prioridad:"alta",notas:""},
  {id:23,fase:"Post-carrera",tarea:"Entrega resultados oficiales",responsable:"Cronometraje",estado:"pendiente",prioridad:"alta",notas:""},
  {id:24,fase:"Post-carrera",tarea:"Verificar recuento material — ninguna pérdida",responsable:"Organización",estado:"pendiente",prioridad:"media",notas:""},
  {id:25,fase:"3 meses antes",tarea:"Obtener autorización ayuntamiento y permisos de uso de monte",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:"Solicitar con antelación suficiente al Ayuntamiento de Candeleda y a la administración forestal",proyectoTareaId:1},
  {id:26,fase:"3 meses antes",tarea:"Contratar servicio médico (Cruz Roja) y confirmar disponibilidad",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:"Confirmar ambulancia y ATS en zona meta durante toda la prueba",proyectoTareaId:41},
  {id:27,fase:"3 meses antes",tarea:"Abrir inscripciones en plataforma online",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:"Activar formulario de inscripción con cupos por modalidad TG7/TG13/TG25"},
  {id:28,fase:"3 meses antes",tarea:"Confirmar recorrido y realizar balizamiento provisional",responsable:"Pedro Sánchez",estado:"pendiente",prioridad:"media",notas:"Reconocer el trazado completo y marcar puntos críticos de señalización"},
  {id:29,fase:"2 meses antes",tarea:"Revisar y confirmar presupuesto general del evento",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:"Incluir material, avituallamiento, servicio médico y cronometraje"},
  {id:30,fase:"2 meses antes",tarea:"Contratar empresa de cronometraje y confirmar sistema chip",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:"Verificar compatibilidad con plataforma de resultados online",proyectoTareaId:40},
  {id:31,fase:"2 meses antes",tarea:"Enviar comunicación informativa a corredores inscritos",responsable:"Organización",estado:"pendiente",prioridad:"media",notas:"Detalles de recorrido, normas, avituallamiento y logística del día"},
  {id:32,fase:"2 meses antes",tarea:"Confirmar patrocinadores y acuerdos de material en especie",responsable:"Organización",estado:"pendiente",prioridad:"media",notas:"Cerrar acuerdos de avituallamiento, trofeos y material de organización"},
  {id:33,fase:"1 mes antes",tarea:"Cierre de inscripciones y publicación listado definitivo de corredores",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:"Confirmar número de dorsales a imprimir por modalidad"},
  {id:34,fase:"1 mes antes",tarea:"Confirmar voluntarios suficientes para todos los puestos",responsable:"Coordinación",estado:"pendiente",prioridad:"alta",notas:"Mínimo 1 voluntario por puesto de avituallamiento y 2 en meta",proyectoTareaId:30},
  {id:35,fase:"1 mes antes",tarea:"Encargar dorsales, medallas y material de organización",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:"Dorsales x650, medallas finisher x650, camisetas voluntarios",proyectoTareaId:39},
  {id:36,fase:"1 mes antes",tarea:"Reunión de coordinación interna del equipo organizador",responsable:"Dirección",estado:"pendiente",prioridad:"media",notas:"Revisar plan operativo, asignar responsabilidades y resolver dudas pendientes"},
];


// ─── MEJ-05: sincronización CK ↔ TL (checklist ↔ timeline día D) ─────────────
/**
 * syncCkTl — función pura que propaga un cambio de estado entre CK y TL.
 *
 * Cuando un ítem CK con _tlId cambia de estado, actualiza el TL vinculado.
 * Cuando un ítem TL con _ckId cambia de estado, actualiza el CK vinculado.
 *
 * Mapeo de estados:
 *   CK "completado"  → TL "completado"
 *   CK otro          → TL "pendiente"
 *   TL "completado"  → CK "completado"
 *   TL otro          → CK "pendiente"
 *
 * @param {"ck"|"tl"} origen  - qué sistema disparó el cambio
 * @param {number}    id      - id del ítem que cambió
 * @param {string}    estado  - nuevo estado del ítem que cambió
 * @param {Array}     ck      - lista actual de ítems CK
 * @param {Array}     tl      - lista actual de ítems TL
 * @param {string}    [hora]  - hora actual HH:MM para completadoEn (solo TL)
 * @returns {{ ckNext: Array, tlNext: Array, ckCambio: boolean, tlCambio: boolean }}
 */
export function syncCkTl(origen, id, estado, ck, tl, hora = "") {
  const ckList = Array.isArray(ck) ? ck : [];
  const tlList = Array.isArray(tl) ? tl : [];

  if (origen === "ck") {
    const item = ckList.find(c => c.id === id);
    if (!item?._tlId) return { ckNext: ckList, tlNext: tlList, ckCambio: false, tlCambio: false };

    const tlEstado = estado === "completado" ? "completado" : "pendiente";
    let tlCambio = false;
    const tlNext = tlList.map(t => {
      if (t.id !== item._tlId) return t;
      if (t.estado === tlEstado) return t;          // sin cambio real
      tlCambio = true;
      return { ...t, estado: tlEstado,
        completadoEn: tlEstado === "completado" ? (hora || t.completadoEn) : undefined };
    });
    return { ckNext: ckList, tlNext, ckCambio: false, tlCambio };
  }

  if (origen === "tl") {
    const item = tlList.find(t => t.id === id);
    if (!item?._ckId) return { ckNext: ckList, tlNext: tlList, ckCambio: false, tlCambio: false };

    const ckEstado = estado === "completado" ? "completado" : "pendiente";
    let ckCambio = false;
    const ckNext = ckList.map(c => {
      if (c.id !== item._ckId) return c;
      if (c.estado === ckEstado) return c;           // sin cambio real
      ckCambio = true;
      return { ...c, estado: ckEstado,
        completadoEn: ckEstado === "completado" ? (hora || c.completadoEn) : undefined };
    });
    return { ckNext, tlNext: tlList, ckCambio, tlCambio: false };
  }

  return { ckNext: ckList, tlNext: tlList, ckCambio: false, tlCambio: false };
}

export {
  ESTADO_ENTREGA, ESTADO_TAREA, ESTADO_COLORES, FASES_CHECKLIST,
  PUESTOS_REF, TIPOS_LOC, LOC_ICONS, LOC_COLORS,
  MAT0, ASIG0, VEH0, RUTAS0, TL0, CONT0, INC0, CK0,
  CATS_MATERIAL, CAT_ICONS, CAT_COLORS,
  TLC, TLI, PROTO_PASOS,
  ESCALA_CON_INSCRITOS
};
