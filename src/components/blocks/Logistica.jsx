import { createPortal } from "react-dom";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useModalClose } from "@/hooks/useModalClose";
import { exportarMaterial } from "@/lib/exportUtils";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/lib/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { eventDateStr } from "@/lib/eventUtils";
import { LOCS_DEFAULT as LOCS_DEFAULT_SHARED, LOCS_KEY } from "@/constants/localizaciones";
import { useData } from "@/lib/dataService";
import { TabPedidosProv } from "./LogisticaPedidos";

import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LS = "teg_logistica_v1";

const CATS_MATERIAL = ["Avituallamiento","Señalización","Seguridad","Comunicación","Médico","Organización","Infraestructura"];
const CAT_ICONS = { Avituallamiento:"🍎", Señalización:"🚩", Seguridad:"🦺", Comunicación:"📡", Médico:"🏥", Organización:"📋", Infraestructura:"⛺" };
const CAT_COLORS = { Avituallamiento:"var(--green)", Señalización:"var(--amber)", Seguridad:"var(--orange)", Comunicación:"var(--cyan)", Médico:"var(--red)", Organización:"var(--violet)", Infraestructura:"var(--cyan)" };
const ESTADO_ENTREGA = ["pendiente","en tránsito","entregado","recogido"];
const ESTADO_TAREA = ["pendiente","en curso","completado","bloqueado"];
const ESTADO_COLORES = { pendiente:"var(--amber)","en tránsito":"var(--cyan)",entregado:"var(--green)",recogido:"var(--text-muted)","en curso":"var(--cyan)",completado:"var(--green)",bloqueado:"var(--red)" };
const FASES_CHECKLIST = ["3 meses antes","2 meses antes","1 mes antes","Semana antes","Día antes","Mañana carrera","Durante carrera","Post-carrera"];
const PUESTOS_REF = ["Zona Salida/Meta","Avituallamiento KM 4","Avituallamiento KM 9","Avituallamiento KM 16","Control KM 7","Control KM 13","Seguridad Cruce 1","Seguridad Cruce 2","Señalización Ruta Alta","Parking","Zona Llegada/Trofeos","Primeros Auxilios Base"];

const TIPOS_LOC = ["meta", "avituallamiento", "control", "seguridad", "señalización", "parking", "sanidad", "otro"];
const LOC_ICONS = { meta:"🎏", avituallamiento:"🍎", control:"📍", seguridad:"🦸", señalización:"🚩", parking:"🅿️", sanidad:"🏥", otro:"📌" };
const LOC_COLORS = { meta:"var(--green)", avituallamiento:"var(--cyan)", control:"var(--amber)", seguridad:"var(--red)", señalización:"var(--amber)", parking:"var(--cyan)", sanidad:"var(--red)", otro:"var(--text-muted)" };

// LOCS_DEFAULT importado de @/constants/localizaciones

// ─── DATOS DEFAULT ────────────────────────────────────────────────────────────
const MAT0 = [
  {id:1,nombre:"Agua (bidones 8L)",categoria:"Avituallamiento",cantidad:60,unidad:"ud",stock:60},
  {id:2,nombre:"Isotónico (botellas 1.5L)",categoria:"Avituallamiento",cantidad:40,unidad:"ud",stock:40},
  {id:3,nombre:"Fruta (kg)",categoria:"Avituallamiento",cantidad:30,unidad:"kg",stock:30},
  {id:4,nombre:"Geles energéticos",categoria:"Avituallamiento",cantidad:200,unidad:"ud",stock:200},
  {id:5,nombre:"Sándwiches variados",categoria:"Avituallamiento",cantidad:150,unidad:"ud",stock:150},
  {id:6,nombre:"Vasos desechables",categoria:"Avituallamiento",cantidad:2000,unidad:"ud",stock:2000},
  {id:7,nombre:"Cubos de hielo (bolsas)",categoria:"Avituallamiento",cantidad:20,unidad:"ud",stock:20},
  {id:8,nombre:"Mesas plegables",categoria:"Infraestructura",cantidad:12,unidad:"ud",stock:12},
  {id:9,nombre:"Carpas 3x3m",categoria:"Infraestructura",cantidad:8,unidad:"ud",stock:8},
  {id:10,nombre:"Walkie-talkies",categoria:"Comunicación",cantidad:12,unidad:"ud",stock:12},
  {id:11,nombre:"Balizas señalización",categoria:"Señalización",cantidad:300,unidad:"ud",stock:300},
  {id:12,nombre:"Conos de tráfico",categoria:"Señalización",cantidad:40,unidad:"ud",stock:40},
  {id:13,nombre:"Chalecos reflectantes",categoria:"Seguridad",cantidad:20,unidad:"ud",stock:20},
  {id:14,nombre:"Botiquín de campo",categoria:"Médico",cantidad:6,unidad:"ud",stock:6},
  {id:15,nombre:"Camilla de rescate",categoria:"Médico",cantidad:2,unidad:"ud",stock:2},
  {id:16,nombre:"Dorsales impresos",categoria:"Organización",cantidad:650,unidad:"ud",stock:650},
  {id:17,nombre:"Medallas finisher",categoria:"Organización",cantidad:620,unidad:"ud",stock:620},
  {id:18,nombre:"Trofeos pódium",categoria:"Organización",cantidad:18,unidad:"ud",stock:18},
];
const ASIG0 = [
  {id:1,materialId:1,puesto:"Avituallamiento KM 4",cantidad:8,estado:"pendiente"},
  {id:2,materialId:1,puesto:"Avituallamiento KM 9",cantidad:10,estado:"pendiente"},
  {id:3,materialId:1,puesto:"Avituallamiento KM 16",cantidad:15,estado:"pendiente"},
  {id:4,materialId:4,puesto:"Avituallamiento KM 9",cantidad:60,estado:"pendiente"},
  {id:5,materialId:4,puesto:"Avituallamiento KM 16",cantidad:100,estado:"pendiente"},
  {id:6,materialId:10,puesto:"Control KM 7",cantidad:2,estado:"pendiente"},
  {id:7,materialId:10,puesto:"Control KM 13",cantidad:2,estado:"pendiente"},
  {id:8,materialId:10,puesto:"Zona Salida/Meta",cantidad:3,estado:"pendiente"},
  {id:9,materialId:11,puesto:"Señalización Ruta Alta",cantidad:120,estado:"pendiente"},
  {id:10,materialId:14,puesto:"Primeros Auxilios Base",cantidad:3,estado:"pendiente"},
  {id:11,materialId:16,puesto:"Zona Salida/Meta",cantidad:650,estado:"pendiente"},
];
const VEH0 = [
  {id:1,nombre:"Furgoneta Organización",matricula:"1234-ABC",conductor:"Javier López",capacidad:"1.5 ton",telefono:"612000001",notas:"Reparto material avituallamiento"},
  {id:2,nombre:"Pick-up Señalización",matricula:"5678-DEF",conductor:"Pedro Sánchez",capacidad:"500 kg",telefono:"612000002",notas:"Balizas y señalización de ruta"},
  {id:3,nombre:"Todoterreno Dirección",matricula:"9012-GHI",conductor:"Laura Martín",capacidad:"5 personas",telefono:"612000003",notas:"Vehículo de coordinación en ruta"},
  {id:4,nombre:"Ambulancia Cruz Roja",matricula:"CR-001",conductor:"Cruz Roja",capacidad:"2 camillas",telefono:"112",notas:"Servicio de emergencias médicas"},
];
const RUTAS0 = [
  {id:1,vehiculoId:1,nombre:"Ruta Avituallamiento Norte",horaInicio:"05:30",paradas:[
    {puesto:"Avituallamiento KM 9",hora:"06:00",material:"Agua x10, Isotónico x8, Geles x60"},
    {puesto:"Avituallamiento KM 16",hora:"06:45",material:"Agua x15, Isotónico x12, Geles x100, Botiquín x2"},
  ]},
  {id:2,vehiculoId:2,nombre:"Ruta Señalización",horaInicio:"04:30",paradas:[
    {puesto:"Señalización Ruta Alta",hora:"05:00",material:"Balizas x120"},
    {puesto:"Seguridad Cruce 1",hora:"06:00",material:"Conos x15, Chalecos x5"},
  ]},
];
const TL0 = [
  {id:1,hora:"04:30",titulo:"Salida equipo señalización",descripcion:"Pick-up con balizas y conos sale hacia ruta alta",responsable:"Pedro Sánchez",categoria:"logistica",estado:"pendiente"},
  {id:2,hora:"05:00",titulo:"Apertura zona de meta",descripcion:"Montaje carpas, mesas, sistema de cronometraje",responsable:"Javier López",categoria:"organizacion",estado:"pendiente"},
  {id:3,hora:"05:30",titulo:"Briefing voluntarios",descripcion:"Reunión general — zona parking. Entrega de walkies y dorsales de voluntario",responsable:"Coordinación",categoria:"voluntarios",estado:"pendiente"},
  {id:4,hora:"06:00",titulo:"Apertura inscripciones y dorsales",descripcion:"Inicio entrega de dorsales a corredores inscritos",responsable:"Zona Salida/Meta",categoria:"organizacion",estado:"pendiente"},
  {id:5,hora:"06:30",titulo:"Confirmación puestos activos",descripcion:"Todos los puestos confirman por walkie que están operativos",responsable:"Dirección carrera",categoria:"comunicacion",estado:"pendiente"},
  {id:6,hora:"07:00",titulo:"Salida TG25 (élite)",descripcion:"Salida oleada élite TG25 — 70 corredores",responsable:"Juez árbitro",categoria:"carrera",estado:"pendiente"},
  {id:7,hora:"07:30",titulo:"Salida TG13",descripcion:"Salida TG13 — 100 corredores",responsable:"Juez árbitro",categoria:"carrera",estado:"pendiente"},
  {id:8,hora:"08:00",titulo:"Salida TG7",descripcion:"Salida TG7 — 80 corredores",responsable:"Juez árbitro",categoria:"carrera",estado:"pendiente"},
  {id:9,hora:"08:30",titulo:"Primer finisher TG7 (est.)",descripcion:"Estimación llegada primer finisher TG7",responsable:"Cronometraje",categoria:"carrera",estado:"pendiente"},
  {id:10,hora:"11:00",titulo:"Primer finisher TG25 (est.)",descripcion:"Estimación llegada primer finisher TG25",responsable:"Cronometraje",categoria:"carrera",estado:"pendiente"},
  {id:11,hora:"12:00",titulo:"Cierre TG7 (corte tiempo)",descripcion:"Cierre oficial TG7 — retirada balizas segmento inicial",responsable:"Control de ruta",categoria:"carrera",estado:"pendiente"},
  {id:12,hora:"14:00",titulo:"Cierre TG13 (corte tiempo)",descripcion:"Cierre oficial TG13",responsable:"Control de ruta",categoria:"carrera",estado:"pendiente"},
  {id:13,hora:"16:00",titulo:"Cierre TG25 (corte tiempo)",descripcion:"Cierre oficial TG25 — recogida material puestos",responsable:"Control de ruta",categoria:"carrera",estado:"pendiente"},
  {id:14,hora:"17:00",titulo:"Inicio recogida material",descripcion:"Furgoneta inicia recogida de puestos en orden inverso",responsable:"Javier López",categoria:"logistica",estado:"pendiente"},
  {id:15,hora:"17:30",titulo:"Entrega de trofeos y pódios",descripcion:"Ceremonia oficial de trofeos — zona meta",responsable:"Organización",categoria:"organizacion",estado:"pendiente"},
  {id:16,hora:"19:00",titulo:"Cierre del evento",descripcion:"Desmontaje zona meta, recuento material, briefing post-evento",responsable:"Coordinación",categoria:"organizacion",estado:"pendiente"},
];
const CONT0 = [
  {id:1,nombre:"Ayuntamiento de Candeleda",rol:"Administración local",telefono:"920 380 001",email:"ayto@candeleda.es",tipo:"institucional",notas:"Autorización evento, apoyo local"},
  {id:2,nombre:"Guardia Civil Candeleda",rol:"Seguridad vial",telefono:"920 380 100",email:"",tipo:"emergencia",notas:"Corte de tráfico y seguridad en carretera"},
  {id:3,nombre:"Cruz Roja Ávila",rol:"Servicio médico",telefono:"920 350 033",email:"cruzroja@avila.es",tipo:"emergencia",notas:"Ambulancia + 2 sanitarios. Contacto Dr. Ruiz"},
  {id:4,nombre:"112 Emergencias",rol:"Emergencias generales",telefono:"112",email:"",tipo:"emergencia",notas:""},
  {id:5,nombre:"Empresa Cronometraje",rol:"Proveedor cronometraje",telefono:"915 000 111",email:"info@crono.es",tipo:"proveedor",notas:"Contacto: Marcos García. Llegar a las 05:00"},
  {id:6,nombre:"Proveedor Avituallamiento",rol:"Suministro agua e isotónico",telefono:"900 111 222",email:"pedidos@avitu.es",tipo:"proveedor",notas:"Entrega 28 agosto antes de las 18:00"},
  {id:7,nombre:"Miguel Torres",rol:"Delegado TG25",telefono:"611 222 333",email:"miguel@trailelguerrero.es",tipo:"staff",notas:"Responsable seguimiento corredor TG25"},
  {id:8,nombre:"Sofía Ruiz",rol:"Delegada TG13",telefono:"611 333 444",email:"sofia@trailelguerrero.es",tipo:"staff",notas:"Responsable seguimiento corredor TG13"},
  {id:9,nombre:"Rubén Castro",rol:"Delegado TG7",telefono:"611 444 555",email:"ruben@trailelguerrero.es",tipo:"staff",notas:"Responsable seguimiento corredor TG7"},
];
const INC0 = [];
const CK0 = [
  {id:1,fase:"Semana antes",tarea:"Confirmar autorización ayuntamiento",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:""},
  {id:2,fase:"Semana antes",tarea:"Confirmar servicio médico Cruz Roja",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:""},
  {id:3,fase:"Semana antes",tarea:"Revisar todo el material de señalización",responsable:"Pedro Sánchez",estado:"pendiente",prioridad:"alta",notas:""},
  {id:4,fase:"Semana antes",tarea:"Confirmar voluntarios y asignar puestos",responsable:"Coordinación",estado:"pendiente",prioridad:"alta",notas:""},
  {id:5,fase:"Semana antes",tarea:"Pedido avituallamiento confirmado",responsable:"Organización",estado:"pendiente",prioridad:"alta",notas:""},
  {id:6,fase:"Semana antes",tarea:"Imprimir dorsales y números de control",responsable:"Organización",estado:"pendiente",prioridad:"media",notas:""},
  {id:7,fase:"Semana antes",tarea:"Probar sistema de cronometraje",responsable:"Cronometraje",estado:"pendiente",prioridad:"alta",notas:""},
  {id:8,fase:"Semana antes",tarea:"Cargar walkies y verificar cobertura",responsable:"Coordinación",estado:"pendiente",prioridad:"media",notas:""},
  {id:9,fase:"Día antes",tarea:"Señalizar ruta completa (balizas)",responsable:"Pedro Sánchez",estado:"pendiente",prioridad:"alta",notas:""},
  {id:10,fase:"Día antes",tarea:"Montar infraestructura zona meta",responsable:"Javier López",estado:"pendiente",prioridad:"alta",notas:""},
  {id:11,fase:"Día antes",tarea:"Recibir y almacenar avituallamiento",responsable:"Javier López",estado:"pendiente",prioridad:"alta",notas:""},
  {id:12,fase:"Día antes",tarea:"Confirmar asistencia todos los voluntarios",responsable:"Coordinación",estado:"pendiente",prioridad:"alta",notas:""},
  {id:13,fase:"Día antes",tarea:"Preparar kits voluntarios (camiseta+walkie+instrucciones)",responsable:"Organización",estado:"pendiente",prioridad:"media",notas:""},
  {id:14,fase:"Día antes",tarea:"Carga furgoneta material avituallamiento",responsable:"Javier López",estado:"pendiente",prioridad:"alta",notas:""},
  {id:15,fase:"Mañana carrera",tarea:"Briefing voluntarios 05:30",responsable:"Coordinación",estado:"pendiente",prioridad:"alta",notas:""},
  {id:16,fase:"Mañana carrera",tarea:"Entrega dorsales (06:00-07:00)",responsable:"Zona Salida/Meta",estado:"pendiente",prioridad:"alta",notas:""},
  {id:17,fase:"Mañana carrera",tarea:"Todos los puestos operativos confirmados",responsable:"Dirección",estado:"pendiente",prioridad:"alta",notas:""},
  {id:18,fase:"Mañana carrera",tarea:"Ambulancia en posición (06:30)",responsable:"Cruz Roja",estado:"pendiente",prioridad:"alta",notas:""},
  {id:19,fase:"Durante carrera",tarea:"Seguimiento llegada corredores por walkie",responsable:"Dirección",estado:"pendiente",prioridad:"alta",notas:""},
  {id:20,fase:"Durante carrera",tarea:"Control cierres de ruta en horario",responsable:"Control de ruta",estado:"pendiente",prioridad:"alta",notas:""},
  {id:21,fase:"Post-carrera",tarea:"Recogida de todo el material en puestos",responsable:"Javier López",estado:"pendiente",prioridad:"alta",notas:""},
  {id:22,fase:"Post-carrera",tarea:"Retirada señalización de ruta completa",responsable:"Pedro Sánchez",estado:"pendiente",prioridad:"alta",notas:""},
  {id:23,fase:"Post-carrera",tarea:"Entrega resultados oficiales",responsable:"Cronometraje",estado:"pendiente",prioridad:"alta",notas:""},
  {id:24,fase:"Post-carrera",tarea:"Verificar recuento material — ninguna pérdida",responsable:"Organización",estado:"pendiente",prioridad:"media",notas:""},
];

// ─── STORAGE ──────────────────────────────────────────────────────────────────


// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App({ initialSubtab, onSubtabConsumed } = {}) {
  const [eventCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [tab, setTab] = useState("dashboard");
  useEffect(() => {
    if (initialSubtab) {
      setTab(initialSubtab);
      if (onSubtabConsumed) onSubtabConsumed();
    }
  }, [initialSubtab]);
  const [rawMaterial, setMaterial] = useData(LS+"_mat", MAT0);
  const material = Array.isArray(rawMaterial) ? rawMaterial : [];
  const [rawAsigs, setAsigs] = useData(LS+"_asig", ASIG0);
  const asigs = Array.isArray(rawAsigs) ? rawAsigs : [];
  const [rawVeh, setVeh] = useData(LS+"_veh", VEH0);
  const veh = Array.isArray(rawVeh) ? rawVeh : [];
  const [rawRutas, setRutas] = useData(LS+"_rut", RUTAS0);
  const rutas = Array.isArray(rawRutas) ? rawRutas : [];
  const [rawTl, setTl] = useData(LS+"_tl", TL0);
  const tl = Array.isArray(rawTl) ? rawTl : [];
  const [rawCont, setCont] = useData(LS+"_cont", CONT0);
  const cont = Array.isArray(rawCont) ? rawCont : [];
  const [rawInc, setInc] = useData(LS+"_inc", INC0);
  const inc = Array.isArray(rawInc) ? rawInc : [];
  const [rawCk, setCk] = useData(LS+"_ck", CK0);
  const ck = Array.isArray(rawCk) ? rawCk : [];
  // Localizaciones maestras compartidas
  const [rawLocs, setLocs] = useData(LOCS_KEY, LOCS_DEFAULT_SHARED);
  // Tipos de contacto personalizados (extensibles por el usuario)
  const [tiposContacto, setTiposContacto] = useData(LS+"_tipos_cont", []);

  // ── Inscritos del presupuesto — compartido con Material, Pedidos y Dashboard ──
  const [rawTramos]    = useData("teg_presupuesto_v1_tramos",    []);
  const [rawInscritos] = useData("teg_presupuesto_v1_inscritos", { tramos: {} });
  const [rawMaximos]   = useData("teg_presupuesto_v1_maximos",   {});
  const totalInscritos = useMemo(() => {
    const tramos = Array.isArray(rawTramos) ? rawTramos : [];
    let total = 0;
    tramos.forEach(t => {
      ["TG7","TG13","TG25"].forEach(dist => {
        total += rawInscritos?.tramos?.[t.id]?.[dist] || 0;
      });
    });
    return total;
  }, [rawTramos, rawInscritos]);
  const totalMaximos = useMemo(() => {
    return (rawMaximos?.TG7||0) + (rawMaximos?.TG13||0) + (rawMaximos?.TG25||0);
  }, [rawMaximos]);

  // ── Pedidos a proveedores ──────────────────────────────────────────────────
  const [rawPedidosProv, setPedidosProv] = useData(LS+"_pedidos_prov", []);
  const pedidosProv = Array.isArray(rawPedidosProv) ? rawPedidosProv : [];

  // Conceptos REALES del presupuesto (el usuario puede haberlos editado)
  const [rawConceptos] = useData("teg_presupuesto_v1_conceptos", []);
  const conceptosPres = Array.isArray(rawConceptos) && rawConceptos.length > 0
    ? rawConceptos : [];
  const locs = Array.isArray(rawLocs) ? rawLocs : [];
  // Tareas del Proyecto (solo lectura) para vincular con checklist
  const [rawTareasProyecto] = useData("teg_proyecto_v1_tareas", []);
  const tareasProyecto = Array.isArray(rawTareasProyecto) ? rawTareasProyecto : [];

  // Patrocinadores (solo lectura) para sección especie en material
  const [rawPats] = useData("teg_patrocinadores_v1_pats", []);
  const patsConEspecie = useMemo(() => {
    const p = Array.isArray(rawPats) ? rawPats : [];
    return p.filter(pat => pat && (pat.especieItems||[]).length > 0);
  }, [rawPats]);

  // Voluntarios (solo lectura para el pool de vehículos)
  const [rawVols] = useData("teg_voluntarios_v1_voluntarios", []);
  const [rawPuestos] = useData("teg_voluntarios_v1_puestos", []);
  const voluntariosConCoche = useMemo(() => {
    const v = Array.isArray(rawVols) ? rawVols : [];
    return v.filter(vol => vol && vol.coche && vol.estado === "confirmado");
  }, [rawVols]);
  // Voluntarios agrupados por localización para mostrar en TabLocalizaciones
  const volsPorLoc = useMemo(() => {
    const vols = Array.isArray(rawVols) ? rawVols : [];
    const puestos = Array.isArray(rawPuestos) ? rawPuestos : [];
    const map = {}; // localizacionId → [{voluntario, puesto}]
    puestos.forEach(p => {
      if (!p.localizacionId) return;
      const asignados = vols.filter(v0 => v0.puestoId === p.id && v0.estado !== "cancelado");
      if (asignados.length > 0) {
        if (!map[p.localizacionId]) map[p.localizacionId] = [];
        asignados.forEach(v0 => map[p.localizacionId].push({ vol: v0, puesto: p }));
      }
    });
    return map;
  }, [rawVols, rawPuestos]);
  const [saved, setSaved] = useState(false);
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);
  const [ficha, setFicha] = useState(null); // {tipo, data}
  const abrirFicha = (tipo, data) => {
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "instant" });
    setFicha({ tipo, data });
  };
  const abrirModal = (obj) => {
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "instant" });
    setModal(obj);
  };
  // Ordenaciones
  const [ordenMat, setOrdenMat]   = useState(false); // A-Z material
  const [ordenVeh, setOrdenVeh]   = useState(false); // A-Z vehículos
  const [ordenTL,  setOrdenTL]    = useState(false); // A-Z timeline
  const [ordenCont,setOrdenCont]  = useState(false); // A-Z contactos
  const [ordenCK,  setOrdenCK]    = useState(false); // A-Z checklist

  // useData handles saving automatically.

  const stats = useMemo(() => {
    const tlDone = tl.filter(t0 => t0.estado==="completado").length;
    const ckDone = ck.filter(c0 => c0.estado==="completado").length;
    const stockErr = material.filter(m0 => asigs.filter(a=>a.materialId===m0.id).reduce((s,a)=>s+a.cantidad,0) > m0.stock).length;
    const stockBajoMinimo = material.filter(m0 => m0.stockMinimo > 0 && m0.stock < m0.stockMinimo).length;
    const incOpen = inc.filter(i0 => i0.estado==="abierta").length;
    return { tlDone, tlTotal:tl.length, ckDone, ckTotal:ck.length, stockErr, stockBajoMinimo, incOpen };
  }, [tl, ck, material, asigs, inc]);

  // RECURSOS: inventario y planificación
  const TABS_RECURSOS = [
    {id:"dashboard",     icon:"📊", label:"Dashboard"},
    {id:"material",      icon:"📦", label:"Material"},
    {id:"vehiculos",     icon:"🚗", label:"Vehículos"},
    {id:"localizaciones",icon:"📍", label:"Ubicaciones"},
  ];
  // OPERACIONES: ejecución, día de la carrera
  const TABS_OPERACIONES = [
    {id:"timeline",   icon:"⏱️",  label:"Runbook"},
    {id:"pedidos",    icon:"🛒",  label:"Pedidos"},
    {id:"checklist",  icon:"✅",  label:"Pre-operativo"},
    {id:"contactos",  icon:"📋",  label:"Directorio"},
    {id:"emergencias",icon:"🚨",  label:"Emergencias"},
  ];
  // Alias para compatibilidad con código existente
  const TABS_OPERATIVAS = TABS_RECURSOS;
  const TABS_PERSONAS   = [];
  const TABS_CONFIG     = [];
  const TABS = [...TABS_RECURSOS, ...TABS_OPERACIONES];

  const doDelete = () => {
    if (!del) return;
    const { tipo, id } = del;
    const MAP = { material:setMaterial, asig:setAsigs, veh:setVeh, ruta:setRutas, tl:setTl, cont:setCont, inc:setInc, ck:setCk };
    MAP[tipo]?.(prev => prev.filter(x0 => x0.id !== id));
    setDel(null);
    toast.success("Elemento eliminado");
  };

  return (
    <>
      <style>{BLOCK_CSS + CSS}</style>
      <div className="block-container">

        {/* HEADER */}
        <div className="block-header">
          <div>
            <h1 className="block-title">📦 Logística</h1>
            <div className="block-title-sub">{config.nombre} {config.edicion} · Módulo Operativo</div>
          </div>
          <div className="block-actions">
            {stats.stockErr > 0 && (
              <span className="badge badge-red" style={{cursor:"pointer"}}
                onClick={()=>setTab("material")}>⚠ {stats.stockErr} stock</span>
            )}
            {stats.stockBajoMinimo > 0 && (
              <span className="badge badge-amber" style={{cursor:"pointer"}}
                onClick={()=>setTab("material")}
                title="Materiales por debajo del stock mínimo">
                📦 {stats.stockBajoMinimo} bajo mín.
              </span>
            )}
            {stats.incOpen > 0 && (
              <span className="badge badge-amber" style={{cursor:"pointer"}}
                onClick={()=>setTab("emergencias")}>🚨 {stats.incOpen} incidencias</span>
            )}
            <span className="badge badge-cyan" style={{cursor:"pointer"}}
              onClick={()=>setTab("checklist")}
              title="Ir al checklist">
              ✅ {stats.ckDone}/{stats.ckTotal}
            </span>
            <button className="btn btn-ghost btn-sm"
              onClick={() => exportarMaterial(material, asigs, locs)}
              title="Exportar material a Excel">
              📊 Excel
            </button>
          </div>
        </div>

        {/* TABS — dos grupos semánticos con separador */}
        <div className="tabs">
          {/* Grupo 1: RECURSOS */}
          {TABS_RECURSOS.map(t => (
            <button key={t.id} className={cls("tab-btn", tab===t.id && "active")} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
              {t.id==="material" && stats.stockErr>0 && <span className="badge badge-red" style={{marginLeft:"0.3rem"}}>⚠{stats.stockErr}</span>}
              {t.id==="material" && !stats.stockErr && stats.stockBajoMinimo>0 && <span className="badge badge-amber" style={{marginLeft:"0.3rem"}}>📦{stats.stockBajoMinimo}</span>}
            </button>
          ))}
          {/* Separador semántico RECURSOS ↔ OPERACIONES */}
          <span aria-hidden="true" style={{
            display:"inline-flex", alignItems:"center", alignSelf:"center",
            height:18, width:1, margin:"0 .2rem", flexShrink:0,
            background:"var(--border-light)", borderRadius:1, opacity:.7,
          }} />
          {/* Grupo 2: OPERACIONES */}
          {TABS_OPERACIONES.map(t => (
            <button key={t.id} className={cls("tab-btn", tab===t.id && "active")} onClick={() => setTab(t.id)}
              title={
                t.id==="timeline"   ? "Runbook del evento · Ejecución hora a hora el día 29 agosto" :
                t.id==="checklist"  ? "Pre-operativo · Ítems de verificación semanas/días antes del evento" :
                undefined
              }>
              {t.icon} {t.label}
              {t.id==="checklist"  && <span className="badge badge-cyan"  style={{marginLeft:"0.3rem"}}>{stats.ckDone}/{stats.ckTotal}</span>}
              {t.id==="emergencias"&& stats.incOpen>0 && <span className="badge badge-amber" style={{marginLeft:"0.3rem"}}>{stats.incOpen}</span>}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div key={tab}>
          {tab==="dashboard" && <TabDash stats={stats} tl={tl} ck={ck} setTab={setTab} config={config} patsConEspecie={patsConEspecie} material={material} asigs={asigs} />}
          {tab==="material" && <TabMat material={material} setMaterial={setMaterial} asigs={asigs} setAsigs={setAsigs} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenMat} setOrdenAlfa={setOrdenMat} locs={locs} patsConEspecie={patsConEspecie} totalInscritos={totalInscritos} totalMaximos={totalMaximos} rawInscritos={rawInscritos} rawTramos={rawTramos} conceptosPres={conceptosPres} />}
          {tab==="vehiculos" && <TabVeh veh={veh} setVeh={setVeh} rutas={rutas} setRutas={setRutas} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenVeh} setOrdenAlfa={setOrdenVeh} voluntariosConCoche={voluntariosConCoche} />}
          {tab==="timeline" && <TabTL tl={tl} setTl={setTl} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenTL} setOrdenAlfa={setOrdenTL} config={config} />}
          {tab==="contactos"   && <TabDirectorio cont={cont} setCont={setCont} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenCont} setOrdenAlfa={setOrdenCont} tiposContacto={tiposContacto} setTiposContacto={setTiposContacto} />}
          {tab==="emergencias" && <TabEmergencias cont={cont} inc={inc} setInc={setInc} abrirModal={abrirModal} abrirFicha={abrirFicha} setInc2={setInc} tiposContacto={tiposContacto} />}
          {tab==="checklist" && <TabCK ck={ck} setCk={setCk} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenCK} setOrdenAlfa={setOrdenCK} config={config} tareasProyecto={tareasProyecto} setTareasProyecto={(fn)=>{ const next=typeof fn==="function"?fn(tareasProyecto):fn; import("@/lib/dataService").then(m=>m.default.set("teg_proyecto_v1_tareas",next)); }} />}
          {tab==="localizaciones" && <TabLocalizaciones locs={locs} setLocs={setLocs} volsPorLoc={volsPorLoc} />}
          {tab==="pedidos" && <TabPedidosProv
            pedidos={pedidosProv} setPedidos={setPedidosProv}
            cont={cont}
            material={material}
            conceptosPres={conceptosPres}
            totalInscritos={totalInscritos}
            inscritos={(() => {
              const tramos = Array.isArray(rawTramos) ? rawTramos : [];
              const ins = {};
              ["TG7","TG13","TG25"].forEach(dist => {
                ins[dist] = tramos.reduce((s,t) => s + (rawInscritos?.tramos?.[t.id]?.[dist]||0), 0);
              });
              return ins;
            })()}
          />}
        </div>
      </div>

      {ficha && createPortal(<FichaLogistica ficha={ficha} material={material} veh={veh} onClose={()=>setFicha(null)} onEditar={(tipo,data)=>{const m=document.querySelector("main");if(m)m.scrollTo({top:0,behavior:"instant"});setFicha(null);setModal({tipo,data,...(tipo==="ck"?{tareasProyecto}:{}),...(tipo==="mat"?{conceptosPres}:{})});}} onEliminar={(tipo,id)=>{setFicha(null);setDel({tipo,id});}} />, document.body)}
      {modal && createPortal(<ModalRouter key={modal.tipo+(modal.data?.id||"n")} modal={modal} onClose={() => setModal(null)}
          material={material} setMaterial={setMaterial} asigs={asigs} setAsigs={setAsigs}
          veh={veh} setVeh={setVeh} rutas={rutas} setRutas={setRutas}
          tl={tl} setTl={setTl} cont={cont} setCont={setCont}
          inc={inc} setInc={setInc} ck={ck} setCk={setCk}
          locs={locs} tiposContacto={tiposContacto} conceptosPres={conceptosPres} />, document.body)}
      {del && createPortal(
        <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && setDel(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:340,textAlign:"center"}}>
            <div className="modal-body" style={{paddingTop:"1.5rem"}}>
              <div style={{fontSize:"var(--fs-xl)",marginBottom:"0.6rem"}}>⚠️</div>
              <div style={{fontWeight:700,marginBottom:"0.4rem"}}>¿Eliminar elemento?</div>
              <div className="muted mono xs">Esta acción no se puede deshacer.</div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setDel(null)}>Cancelar</button><button className="btn btn-red" onClick={doDelete}>Eliminar</button></div>
          </div>
        </div>
      , document.body)}
    </>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function TabDash({ stats, tl, ck, setTab, config, patsConEspecie, material = [], asigs = [] }) {
  const prox = [...tl].filter(t=>t.estado!=="completado").sort((a,b)=>a.hora.localeCompare(b.hora)).slice(0,6);
  const porFase = FASES_CHECKLIST.map(f0 => { const it=ck.filter(c=>c.fase===f0); const d=it.filter(c=>c.estado==="completado").length; return {f:f0,d,t:it.length,pct:it.length?Math.round(d/it.length*100):0}; });
  const eventoFecha = config?.fecha ? new Date(config.fecha) : new Date(EVENT_CONFIG_DEFAULT.fecha);
  const diasHasta = Math.ceil((eventoFecha - new Date()) / 86400000);
  const yaFue = diasHasta < 0;
  const esSemana = diasHasta >= 0 && diasHasta <= 7;

  const KPIS = [
    { l:"⏱️ Timeline",   v:`${stats.tlDone}/${stats.tlTotal}`,
      s:"tareas completadas",
      color: stats.tlDone===stats.tlTotal && stats.tlTotal>0 ? "green" : "cyan",
      tab:"timeline",
      tip:"Tareas del Timeline completadas sobre el total.\nEl Timeline agrupa todas las acciones del día de carrera ordenadas por hora." },
    { l:"✅ Checklist",  v:`${Math.round(stats.ckDone/Math.max(stats.ckTotal,1)*100)}%`,
      s:`${stats.ckDone} de ${stats.ckTotal} ítems`,
      color: stats.ckDone===stats.ckTotal && stats.ckTotal>0 ? "green" : "cyan",
      tab:"checklist",
      tip:"Porcentaje de ítems completados del checklist pre-carrera.\nEl checklist se organiza por fases temporales: 3 meses antes, 1 mes antes, semana antes, etc." },
    { l:"📦 Stock",      v:stats.stockErr > 0 ? stats.stockErr : stats.stockBajoMinimo > 0 ? `${stats.stockBajoMinimo}⚠` : 0,
      s:"materiales en déficit",
      color: stats.stockErr>0 ? "red" : "green",
      tab:"material",
      tip:"Número de materiales cuya cantidad asignada supera el stock disponible.\nUn déficit significa que hay más asignaciones que unidades en almacén." },
    { l:"⚠️ Incidencias", v:stats.incOpen,
      s:"abiertas sin resolver",
      color: stats.incOpen>0 ? "red" : "green",
      tab:"contactos",
      tip:"Incidencias registradas en Emergencias que siguen abiertas.\nCada incidencia debe resolverse o documentarse antes del cierre del evento." },
  ];

  return (
    <>
      {/* ── KPIs — clases del sistema BLOCK_CSS ── */}
      <div className="kpi-grid mb">
        {KPIS.map(function(kpiItem) { return (
          <div key={kpiItem.l}
            className={`kpi ${kpiItem.color} log-kpi-link`}
            onClick={()=>setTab(kpiItem.tab)}
            title={`Ir a ${kpiItem.l}`}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>
              {kpiItem.l}{kpiItem.tip&&<Tooltip text={kpiItem.tip}><TooltipIcon size={11}/></Tooltip>}
            </div>
            <div className="kpi-value">{kpiItem.v}</div>
            <div className="kpi-sub">{kpiItem.s}</div>
            <div className="log-kpi-arrow">→ ver detalle</div>
          </div>
        );})}
      </div>

      {/* ── Panel de déficit de stock — solo si hay problemas ── */}
      {stats.stockErr > 0 && (() => {
        const enDeficit = material.map(m => {
          const totalAsig = asigs.filter(a0 => a0.materialId === m.id)
            .reduce((s, a) => s + a.cantidad, 0);
          const def = totalAsig - m.stock;
          return def > 0 ? { ...m, def, totalAsig } : null;
        }).filter(Boolean);
        if (!enDeficit.length) return null;
        return (
          <div style={{
            marginBottom: ".85rem", padding: ".65rem .85rem",
            background: "rgba(248,113,113,.05)",
            border: "1px solid rgba(248,113,113,.2)",
            borderLeft: "3px solid var(--red)",
            borderRadius: "var(--r-sm)",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:".45rem" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                fontWeight:700, color:"var(--red)", textTransform:"uppercase",
                letterSpacing:".06em" }}>
                ⚠ Stock insuficiente
              </span>
              <button className="btn btn-ghost btn-sm"
                style={{ fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}
                onClick={() => setTab("material")}>
                Ver material →
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:".3rem" }}>
              {enDeficit.map(m => (
                <div key={m.id} style={{
                  display:"flex", alignItems:"center", gap:".6rem",
                  fontSize:"var(--fs-base)",
                }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    fontWeight:800, color:"var(--red)",
                    background:"rgba(248,113,113,.1)", padding:".08rem .4rem",
                    borderRadius:3, flexShrink:0, minWidth:48, textAlign:"center" }}>
                    -{m.def} {m.unidad}
                  </span>
                  <span style={{ fontWeight:600, flex:1, minWidth:0,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {m.nombre}
                  </span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    color:"var(--text-muted)", flexShrink:0 }}>
                    {m.stock} stock · {m.totalAsig} asig.
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Countdown hero compacto ── */}
      <div className="card mb log-hero" style={{
        background: esSemana
          ? "linear-gradient(135deg,var(--red-dim),var(--red-dim))"
          : "linear-gradient(135deg,var(--cyan-dim),var(--violet-dim))",
        borderColor: esSemana ? "rgba(248,113,113,0.3)" : "var(--border)",
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"0.75rem"}}>
          <div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.2rem"}}>
              🏔️ {config.nombre} {config.edicion} · {config.lugar}, {config.provincia}
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:"0.4rem"}}>
              {yaFue ? (
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-lg)",fontWeight:800,color:"var(--green)"}}>¡Completado!</span>
              ) : (
                <>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"1.8rem",fontWeight:800,
                    color: esSemana ? "var(--red)" : "var(--amber)",lineHeight:1}}>
                    {diasHasta}
                  </span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-muted)"}}>
                    {esSemana ? "⚡ días — SEMANA DE CARRERA" : "días para el evento"}
                  </span>
                </>
              )}
            </div>
          </div>
          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setTab("checklist")}>✅ Checklist</button>
            <button className="btn btn-sm" style={{background:"rgba(248,113,113,0.1)",color:"var(--red)",border:"1px solid rgba(248,113,113,0.25)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)"}}
              onClick={()=>setTab("contactos")}>🚨 Emergencias</button>
          </div>
        </div>
      </div>

      {/* ── Especie de patrocinadores ── */}
      {patsConEspecie && patsConEspecie.length > 0 && (
        <div className="card mb">
          <div className="ct">📦 Material en especie (patrocinadores)</div>
          {patsConEspecie.map(pat => {
            const items = pat.especieItems || [];
            const recibidos = items.filter(i0 => i0.recibido).length;
            return (
              <div key={pat.id} style={{ display: "flex", alignItems: "flex-start", gap: ".6rem", padding: ".45rem 0", borderBottom: "1px solid rgba(30,45,80,.25)" }}>
                <span style={{ fontSize: "var(--fs-md)" }}>📦</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-base)", fontWeight: 700 }}>{pat.nombre}</div>
                  <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginTop: ".2rem" }}>
                    {items.map(i => (
                      <span key={i.id} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".1rem .35rem", borderRadius: 4,
                        background: i.recibido ? "rgba(52,211,153,.12)" : "rgba(251,191,36,.08)",
                        color: i.recibido ? "var(--green)" : "var(--amber)" }}>
                        {i.recibido ? "✓" : "⏳"} {i.nombre} ({i.cantidad} {i.unidad})
                      </span>
                    ))}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: recibidos === items.length ? "var(--green)" : "var(--amber)" }}>
                  {recibidos}/{items.length}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dos columnas: Timeline + Checklist ── */}
      <div className="twocol">
        <div className="card">
          <div className="ct">⏱️ Próximas tareas pendientes</div>
          {prox.length === 0 && (
            <div style={{textAlign:"center",padding:"1rem",color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}>
              ✓ Sin tareas pendientes
            </div>
          )}
          {prox.map(t=>(
            <div key={t.id} className="tlmr">
              <div className="tlh">{t.hora}</div>
              <div className="tld" style={{background:TLC[t.categoria]||"var(--text-muted)"}} />
              <div style={{flex:1,minWidth:0}}>
                <div className="tlt">{t.titulo}</div>
                <div className="tlr">{t.responsable}</div>
              </div>
              <div className="tls" style={{color:ESTADO_COLORES[t.estado]}}>{t.estado}</div>
            </div>
          ))}
          <button className="btn btn-ghost mt1" style={{width:"100%"}} onClick={()=>setTab("timeline")}>Ver timeline completo →</button>
        </div>
        <div className="card">
          <div className="ct">✅ Progreso checklist por fase</div>
          {porFase.map(f=>(
            <div key={f.f} style={{marginBottom:"0.6rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"var(--fs-sm)",marginBottom:"0.2rem"}}>
                <span style={{color: f.pct===100?"var(--text-muted)":"var(--text)"}}>{f.f}</span>
                <span className="mono" style={{color:f.pct===100?"var(--green)":"var(--text-muted)",fontSize:"var(--fs-xs)"}}>{f.d}/{f.t}</span>
              </div>
              <div className="pbar">
                <div className="pfill" style={{width:`${f.pct}%`,background:f.pct===100?"var(--green)":f.pct>50?"var(--cyan)":"var(--amber)"}}/>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost mt1" style={{width:"100%"}} onClick={()=>setTab("checklist")}>Ir al checklist →</button>
        </div>
      </div>
    </>
  );
}

const TLC = {logistica:"var(--amber)",organizacion:"var(--violet)",voluntarios:"var(--green)",carrera:"var(--cyan)",comunicacion:"var(--orange)"};
const TLI = {logistica:"🚚",organizacion:"📋",voluntarios:"👥",carrera:"🏃",comunicacion:"📡"};

// ─── MATERIAL ─────────────────────────────────────────────────────────────────
function TabMat({material,setMaterial,asigs,setAsigs,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,abrirModal,locs,patsConEspecie,totalInscritos=0,totalMaximos=0,rawInscritos={},rawTramos=[],conceptosPres=[]}) {
  const [vistaAsig,setVistaAsig]=useState(false);
  const [vistaKanban,setVistaKanban]=useState(false);
  const [cat,setCat]=useState("todas");
  const [busqMat,setBusqMat]=useState("");

  // (rawTramos, rawInscritos, totalInscritos, totalMaximos vienen del componente padre vía props)

  // Artículos cuyo stock debería escalar con los inscritos
  const ESCALA_CON_INSCRITOS = [
    { patron: /dorsal/i,   label: "dorsales" },
    { patron: /medalla/i,  label: "medallas" },
    { patron: /chip/i,     label: "chips" },
    { patron: /camiseta.*corredor|corredor.*camiseta/i, label: "camisetas corredor" },
  ];
  const ms=useMemo(()=>material.map(m=>{const a=asigs.filter(x=>x.materialId===m.id);const asig=a.reduce((s,x)=>s+x.cantidad,0);const ent=a.filter(x=>x.estado==="entregado").reduce((s,x)=>s+x.cantidad,0);return{...m,asig,ent,def:Math.max(asig-m.stock,0)}}),[material,asigs]);
  const mf=useMemo(()=>{
    let list = ms.filter(m => cat === "todas" || m.categoria === cat);
    if(busqMat.trim()) {
      const q = busqMat.toLowerCase();
      list = list.filter(m => (m.nombre||"").toLowerCase().includes(q) || (m.categoria||"").toLowerCase().includes(q));
    }
    if(ordenAlfa) list=[...list].sort((sa,sb)=>(sa.nombre||"").localeCompare(sb.nombre||"","es"));
    return list;
  },[ms,cat,ordenAlfa,busqMat]);
  const { items: mfPag, total: totalMat, PaginadorUI: PagMat } = usePaginacion(mf, 20);
  const mover=(id,dir)=>{
    if(ordenAlfa) return;
    setMaterial(prev=>{
      const arr=[...prev]; const i=arr.findIndex(x=>x.id===id); const j=i+dir;
      if(j<0||j>=arr.length) return arr;
      [arr[i],arr[j]]=[arr[j],arr[i]]; return arr;
    });
  };
  return(
    <>
      <div className="ph">
        <div><div className="pt">📦 Inventario de Material</div><div className="pd">{material.length} artículos · {asigs.length} asignaciones</div></div>
        <div className="fr g1">
          <button className={cls("btn",!vistaAsig?"btn-cyan":"btn-ghost")} onClick={()=>setVistaAsig(false)}>Catálogo<span style={{marginLeft:"0.3rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",background:!vistaAsig?"rgba(0,0,0,0.15)":"var(--surface3)",padding:"0.05rem 0.35rem",borderRadius:3}}>{material.length}</span></button>
          <button className={cls("btn",vistaAsig?"btn-cyan":"btn-ghost")} onClick={()=>setVistaAsig(true)}>Asignaciones<span style={{marginLeft:"0.3rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",background:vistaAsig?"rgba(0,0,0,0.15)":"var(--surface3)",padding:"0.05rem 0.35rem",borderRadius:3}}>{asigs.length}</span></button>
          {!vistaAsig && (<>
            <div className="filter-pill-group">
              <button className={`filter-pill${!vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(false)}>☰ Lista</button>
              <button className={`filter-pill${vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(true)}>⬛ Kanban</button>
            </div>
            <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          </>)}
          {!vistaAsig && (
            <input type="search" className="inp inp-sm"
              placeholder="Buscar material…"
              value={busqMat} onChange={e=>setBusqMat(e.target.value)}
              style={{maxWidth:160,fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}
            />
          )}
          <button className="btn btn-primary" onClick={()=>abrirModal({tipo:vistaAsig?"asig":"mat",conceptosPres:conceptosPres})}>+ Añadir</button>
        </div>
      </div>
      {!vistaAsig?(<>
        {material.length === 0 && (
          <div style={{ padding:"0 0 .85rem" }}><SkeletonRows n={5} /></div>
        )}
        <div className="chips">
          <button className={cls("chip",cat==="todas"&&"ca")} onClick={()=>setCat("todas")}>Todas</button>
          {CATS_MATERIAL.map(c=><button key={c} className={cls("chip",cat===c&&"ca")} onClick={()=>setCat(c)} style={cat===c?{borderColor:CAT_COLORS[c],color:CAT_COLORS[c],background:`${CAT_COLORS[c]}18`}:{}}>{CAT_ICONS[c]} {c}</button>)}
        </div>
        {vistaKanban?(
          <div className="log-kanban-grid">
            {CATS_MATERIAL.map(catK=>{
              const items=mf.filter(m=>m.categoria===catK);
              if(!items.length) return null;
              const color=CAT_COLORS[catK];
              return(<div key={catK} className="log-k-col">
                <div className="log-k-hdr" style={{borderTopColor:color}}>
                  <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color}}>{CAT_ICONS[catK]} {catK}</span>
                  <span className="log-k-cnt" style={{background:color+"22",color,border:`1px solid ${color}44`}}>{items.length}</span>
                </div>
                {items.map(m=>(<div key={m.id} className="log-k-card" style={{borderLeftColor:color,cursor:"pointer"}} onClick={()=>abrirFicha("mat",m)}>
                  <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".3rem"}}>{m.nombre}</div>
                  <div style={{display:"flex",gap:".5rem",flexWrap:"wrap",fontSize:"var(--fs-xs)",fontFamily:"var(--font-mono)"}}>
                    <span style={{color:"var(--text-muted)"}}>Stock: <span style={{color:"var(--text)",fontWeight:700}}>{m.stock} {m.unidad}</span></span>
                    {m.def>0&&<span style={{color:"var(--red)",fontWeight:700}}>⚠ -{m.def}</span>}
                  </div>
                </div>))}
              </div>);
            })}
          </div>
        ):(<>
          <div className="card p0"><div className="ox"><table className="tbl">
            <thead><tr><th style={{width:22}}></th><th>Material</th><th>Categoría</th><th className="tr">Stock</th><th className="tr">Asignado</th><th className="tr">Déficit</th></tr></thead>
            <tbody>{mfPag.map((m,i,arr)=>(
              <tr key={m.id} className={m.def>0?"ra":""} style={{cursor:"pointer"}} onClick={()=>abrirFicha("mat",m)}>
                <td onClick={e=>e.stopPropagation()} style={{padding:"0.3rem 0.4rem"}}>
                  {/* Icono siempre visible — Kinetik Ops Fase E */}
                  <div className="item-icon-pill-sm" style={{"--pill-color": CAT_COLORS[m.categoria]||"var(--cyan)"}}>
                    <span style={{fontSize:"var(--fs-base)"}}>{CAT_ICONS[m.categoria]||"📦"}</span>
                  </div>
                </td>
                <td className="f6">
                  <div style={{display:"flex",alignItems:"center",gap:".35rem",flexWrap:"wrap"}}>
                    {m.nombre}
                    {m.presupuestoConceptoId && (() => {
                      const conceptoPresu=conceptosPres.find(function(cp){return cp.id===m.presupuestoConceptoId;});
                      return conceptoPresu ? (
                        <button
                          onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("teg-navigate", { detail:{ block:"presupuesto" } })); }}
                          title="Ver en Presupuesto"
                          style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                            padding:".06rem .3rem",borderRadius:10,cursor:"pointer",
                            background:"var(--violet-dim)",color:"var(--violet)",
                            border:"1px solid rgba(167,139,250,.25)"}}>
                          💰 {conceptoPresu.nombre} →
                        </button>
                      ) : null;
                    })()}
                  </div>
                </td>
                <td><span className="badge" style={{background:`${CAT_COLORS[m.categoria]}18`,color:CAT_COLORS[m.categoria],border:`1px solid ${CAT_COLORS[m.categoria]}33`}}>{CAT_ICONS[m.categoria]} {m.categoria}</span></td>
                <td className="tr mono">
                  {m.stock} {m.unidad}
                  {m.stockMinimo > 0 && m.stock < m.stockMinimo && (
                    <span style={{marginLeft:".35rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                      padding:".1rem .35rem",borderRadius:4,
                      background:"var(--red-dim)",color:"var(--red)",fontWeight:700}}>
                      ⚠ bajo mín.
                    </span>
                  )}
                </td>
                <td className="tr mono" style={{color:m.asig>0?"var(--cyan)":"var(--text-muted)"}}>{m.asig} {m.unidad}</td>
                <td className="tr mono">{m.def>0?<span style={{color:"var(--red)",fontWeight:700}}>-{m.def}</span>:<span style={{color:"var(--text-dim)"}}>—</span>}</td>
              </tr>
            ))}</tbody>
          </table></div></div>
          <PagMat />
        </>)}
      </>):(
        <div className="card p0"><div className="ox"><table className="tbl">
          <thead><tr><th>Material</th><th>Puesto destino</th><th className="tr">Cantidad</th><th>Estado</th></tr></thead>
          <tbody>{asigs.map(a=>{const m=material.find(x=>x.id===a.materialId);return(
            <tr key={a.id} style={{cursor:"pointer"}} onClick={()=>abrirFicha("asig",{...a,materialNombre:m?.nombre,unidad:m?.unidad})}>
              <td className="f6">{m?.nombre||"—"}</td>
              <td><span className="pbadge">{a.puesto}</span></td>
              <td className="tr mono">{a.cantidad} {m?.unidad}</td>
              <td onClick={e=>e.stopPropagation()}><select className="isml" value={a.estado} onChange={e=>setAsigs(p=>p.map(x=>x.id===a.id?{...x,estado:e.target.value}:x))} style={{color:ESTADO_COLORES[a.estado]}}>{ESTADO_ENTREGA.map(s=><option key={s} value={s}>{s}</option>)}</select></td>
            </tr>
          );})}
          </tbody>
        </table></div></div>
      )}
    </>
  );
}

// ─── VEHÍCULOS ────────────────────────────────────────────────────────────────
function TabVeh({veh,setVeh,rutas,setRutas,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,abrirModal,voluntariosConCoche=[]}) {
  const [vistaKanban,setVistaKanban]=useState(false);
  const [vehColapsado,setVehCol]=useState(true); // colapsado por defecto
  const [rutasColapsadas,setRutasCol]=useState(true); // colapsado por defecto
  const [poolColapsado,setPoolCol]=useState(true); // colapsado por defecto
  const [busqVeh,setBusqVeh]=useState("");
  const moverVeh=(id,dir)=>{
    if(ordenAlfa) return;
    setVeh(prev=>{const arr=[...prev];const i=arr.findIndex(x=>x.id===id);const j=i+dir;if(j<0||j>=arr.length)return arr;[arr[i],arr[j]]=[arr[j],arr[i]];return arr;});
  };
  const vehOrdenado=useMemo(()=>{let list=ordenAlfa?[...veh].sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es")):veh;if(busqVeh.trim()){const q=busqVeh.toLowerCase();list=list.filter(v=>(v.nombre||"").toLowerCase().includes(q)||(v.matricula||"").toLowerCase().includes(q)||(v.conductor||"").toLowerCase().includes(q));}return list;},[veh,ordenAlfa,busqVeh]);
  return(
    <>
      <div className="ph">
        <div><div className="pt">🚗 Vehículos y Rutas</div><div className="pd">{veh.length} vehículos · {rutas.length} rutas</div></div>
        <div className="fr g1">
          <div className="filter-pill-group">
              <button className={`filter-pill${!vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(false)}>☰ Lista</button>
              <button className={`filter-pill${vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(true)}>⬛ Kanban</button>
            </div>
          <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <input type="search" className="inp inp-sm"
            placeholder="Buscar vehículo…"
            value={busqVeh} onChange={e=>setBusqVeh(e.target.value)}
            style={{maxWidth:150,fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}
          />
          <button className="btn btn-primary" onClick={()=>abrirModal({tipo:"veh"})}>+ Vehículo</button>
          <button className="btn btn-amber" onClick={()=>abrirModal({tipo:"ruta"})}>+ Ruta</button>
        </div>
      </div>
      {vistaKanban?(
        <div className="log-kanban-grid" style={{gridTemplateColumns:"repeat(2,1fr)"}}>
          <div className="log-k-col">
            <div className="log-k-hdr" style={{borderTopColor:"var(--cyan)"}}>
              <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color:"var(--cyan)"}}>🚐 Flota</span>
              <span className="log-k-cnt" style={{background:"var(--cyan-dim)",color:"var(--cyan)",border:"1px solid rgba(34,211,238,.3)"}}>{veh.length}</span>
            </div>
            {vehOrdenado.map(v=>(<div key={v.id} className="log-k-card" style={{borderLeftColor:"var(--cyan)",cursor:"pointer"}} onClick={()=>abrirFicha("veh",v)}>
              <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".2rem"}}>{v.nombre}</div>
              <div className="mono xs muted">{v.matricula} · {v.conductor}</div>
              <div className="mono xs" style={{color:"var(--text-muted)",marginTop:".15rem"}}>{v.capacidad}</div>
              {v.notas&&<div style={{fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".2rem",fontStyle:"italic"}}>{v.notas}</div>}
            </div>))}

            {/* SECCIÓN VEHÍCULOS VOLUNTARIOS (POOL) */}
            {voluntariosConCoche.length > 0 && (
              <div style={{marginTop:"1.2rem"}}>
                <div className="log-k-hdr" style={{borderTopColor:"var(--violet)",background:"transparent",padding:"0.6rem 0.2rem"}}>
                  <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color:"var(--violet)"}}>🙋‍♂️ Pool Voluntarios</span>
                  <span className="log-k-cnt" style={{background:"var(--violet-dim)",color:"var(--violet)",border:"1px solid rgba(167,139,250,.3)"}}>{voluntariosConCoche.length}</span>
                </div>
                {voluntariosConCoche.map(vol => (
                  <div key={vol.id} className="log-k-card" style={{borderLeftColor:"var(--violet)",background:"var(--violet-dim)"}}>
                    <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".2rem"}}>{vol.nombre}</div>
                    <div className="mono xs muted">🚙 Vehículo propio</div>
                    <a href={`tel:${vol.telefono}`} style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--violet)",textDecoration:"none"}}>📞 {vol.telefono}</a>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="log-k-col">
            <div className="log-k-hdr" style={{borderTopColor:"var(--amber)"}}>
              <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color:"var(--amber)"}}>🗺️ Rutas</span>
              <span className="log-k-cnt" style={{background:"var(--amber-dim)",color:"var(--amber)",border:"1px solid rgba(251,191,36,.3)"}}>{rutas.length}</span>
            </div>
            {rutas.map(r=>{const v=veh.find(x=>x.id===r.vehiculoId);return(<div key={r.id} className="log-k-card" style={{borderLeftColor:"var(--amber)",cursor:"pointer"}} onClick={()=>abrirFicha("ruta",r)}>
              <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".2rem"}}>{r.nombre}</div>
              <div className="mono xs muted">🚐 {v?.nombre||"—"} · 🕐 {r.horaInicio}</div>
              <div style={{fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".2rem"}}>{(r.paradas||[]).length} paradas</div>
            </div>);})}
          </div>
        </div>
      ):(
        <div className="twocol">
          <div>
            {/* Flota colapsable */}
            <button onClick={()=>setVehCol(v=>!v)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:".5rem",
                padding:".45rem .65rem",marginBottom:".4rem",background:"var(--surface2)",
                border:"1px solid var(--border)",borderRadius:"var(--r-sm)",cursor:"pointer",textAlign:"left"}}>
              <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:"var(--fs-sm)",flex:1}}>🚐 Flota de vehículos</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--cyan)",
                padding:".06rem .35rem",borderRadius:20,background:"var(--cyan-dim)"}}>{veh.length}</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-dim)",
                transform:vehColapsado?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
            </button>
            {!vehColapsado && vehOrdenado.map((v,i,arr)=>(
              <div key={v.id} className="card vcard" style={{cursor:"pointer"}} onClick={()=>abrirFicha("veh",v)}>
                <div className="vh">
                  {!ordenAlfa&&<div className="log-reorder" onClick={e=>e.stopPropagation()}><span onClick={()=>moverVeh(v.id,-1)} style={{opacity:i===0?.2:1}}>▲</span><span onClick={()=>moverVeh(v.id,+1)} style={{opacity:i===arr.length-1?.2:1}}>▼</span></div>}
                  <div className="vi">🚐</div>
                  <div style={{flex:1}}><div className="vn">{v.nombre}</div><div className="vm mono">{v.matricula}</div></div>
                </div>
                <div className="vmeta"><span>👤 {v.conductor}</span><span>📦 {v.capacidad}</span><span>📞 {v.telefono}</span></div>
                {v.notas&&<div className="vnota">{v.notas}</div>}
              </div>
            ))}

            {/* SECCIÓN VEHÍCULOS VOLUNTARIOS (POOL) — LISTA */}
            {voluntariosConCoche.length > 0 && (
              <div style={{marginTop:"1rem"}}>
                <button onClick={()=>setPoolCol(v=>!v)}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:".5rem",
                    padding:".45rem .65rem",marginBottom:".4rem",background:"var(--violet-dim)",
                    border:"1px solid rgba(167,139,250,.25)",borderRadius:"var(--r-sm)",cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:"var(--fs-sm)",color:"var(--violet)",flex:1}}>🙋‍♂️ Pool de Voluntarios</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--violet)",
                    padding:".06rem .35rem",borderRadius:20,background:"rgba(167,139,250,.15)"}}>{voluntariosConCoche.length}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"rgba(167,139,250,.5)",
                    transform:poolColapsado?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
                </button>
                {!poolColapsado && <>
                {voluntariosConCoche.map(vol => (
                  <div key={vol.id} className="card vcard" style={{borderLeft:"2px solid var(--violet)",background:"var(--violet-dim)"}}>
                    <div className="vh" style={{marginBottom:"0.5rem"}}>
                      <div className="vi" style={{color:"var(--violet)"}}>🚙</div>
                      <div style={{flex:1}}><div className="vn">{vol.nombre}</div><div className="vm mono" style={{color:"var(--violet)"}}>Vehículo propio</div></div>
                      <a href={`tel:${vol.telefono}`} className="btn btn-sm" style={{background:"var(--violet-dim)",color:"var(--violet)"}}>📞 Llamar</a>
                    </div>
                  </div>
                ))}
                </>}
              </div>
            )}
          </div>
          <div>
            {/* Rutas colapsable */}
            <button onClick={()=>setRutasCol(v=>!v)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:".5rem",
                padding:".45rem .65rem",marginBottom:".4rem",background:"var(--surface2)",
                border:"1px solid var(--border)",borderRadius:"var(--r-sm)",cursor:"pointer",textAlign:"left"}}>
              <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:"var(--fs-sm)",flex:1}}>🗺️ Rutas de reparto</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--amber)",
                padding:".06rem .35rem",borderRadius:20,background:"var(--amber-dim)"}}>{rutas.length}</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-dim)",
                transform:rutasColapsadas?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
            </button>
            {!rutasColapsadas && <>
            {rutas.map(r=>{const v=veh.find(x=>x.id===r.vehiculoId);return(
              <div key={r.id} className="card rcard" style={{cursor:"pointer"}} onClick={()=>abrirFicha("ruta",r)}>
                <div className="rh">
                  <div><div className="rn">{r.nombre}</div><div className="rm mono">🚐 {v?.nombre||"—"} · 🕐 {r.horaInicio}</div></div>
                </div>
                <div className="plist">{(r.paradas||[]).map((p,i)=>(
                  <div key={i} className="prow">
                    <div className="pcon"><div className="pdot"/>{i<(r.paradas||[]).length-1&&<div className="pline"/>}</div>
                    <div className="pcont">
                      <div className="ptop"><span className="pnom">{p.puesto}</span><span className="phora mono">{p.hora}</span></div>
                      <div className="pmat">{p.material}</div>
                    </div>
                  </div>
                ))}</div>
              </div>
            );})}
            </>}
          </div>
        </div>
      )}
    </>
  );
}

// ─── TIMELINE ─────────────────────────────────────────────────────────────────
function TabTL({tl,setTl,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,abrirModal,config}) {
  const [vistaKanban,setVistaKanban]=useState(false);
  const [ahora,setAhora] = useState(new Date());
  const [filtroResp,setFiltroResp] = useState("todos");
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const horaActual = ahora.toTimeString().slice(0,5); // "HH:MM"
  const responsables = useMemo(() =>
    [...new Set(tl.map(t0 => t0.responsable).filter(Boolean))].sort()
  , [tl]);
  const sorted=useMemo(()=>{
    let arr=[...tl];
    if(filtroResp !== "todos") arr = arr.filter(t0 => t0.responsable === filtroResp);
    if(ordenAlfa) arr.sort((a,b)=>(a.titulo||"").localeCompare(b.titulo||"","es"));
    else arr.sort((a,b)=>a.hora.localeCompare(b.hora));
    return arr;
  },[tl,ordenAlfa,filtroResp]);
  const mover=(id,dir)=>{
    if(ordenAlfa) return;
    setTl(prev=>{
      const arr=[...prev].sort((a,b)=>a.hora.localeCompare(b.hora));
      const i=arr.findIndex(x=>x.id===id);const j=i+dir;
      if(j<0||j>=arr.length)return prev;
      // Intercambiar las horas para mantener el orden
      const horaI=arr[i].hora,horaJ=arr[j].hora;
      return prev.map(x=>x.id===arr[i].id?{...x,hora:horaJ}:x.id===arr[j].id?{...x,hora:horaI}:x);
    });
  };
  const upd=(id,estado)=>setTl(p=>p.map(t=>t.id===id?{...t,estado,completadoEn:estado==="completado"?new Date().toTimeString().slice(0,5):undefined}:t));
  return(
    <>
      <div className="ph">
        <div><div className="pt">⏱️ Runbook del Evento</div><div className="pd" style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}><span style={{background:"rgba(251,191,36,.12)",color:"var(--amber)",border:"1px solid rgba(251,191,36,.25)",borderRadius:99,padding:".1rem .5rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700}}>📅 Día del evento</span>{tl.filter(t=>t.estado==="completado").length}/{tl.length} completadas · {config?.fecha ? new Date(config.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"}) : eventDateStr(config)}</div></div>
        <div className="fr g1">
          <div className="filter-pill-group">
              <button className={`filter-pill${!vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(false)}>☰ Lista</button>
              <button className={`filter-pill${vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(true)}>⬛ Kanban</button>
            </div>
          {responsables.length > 0 && (
            <select
              value={filtroResp}
              onChange={e => setFiltroResp(e.target.value)}
              style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", padding:".3rem .6rem",
                borderRadius:6, border:"1px solid var(--border)", background:"var(--surface2)",
                color: filtroResp !== "todos" ? "var(--cyan)" : "var(--text-muted)",
                cursor:"pointer", maxWidth:150 }}
            >
              <option value="todos">👤 Todos</option>
              {responsables.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
          <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={()=>abrirModal({tipo:"tl"})}>+ Tarea</button>
        </div>
      </div>
      {vistaKanban?(
        <div className="log-kanban-grid" style={{gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))"}}>
          {["logistica","organizacion","voluntarios","carrera","comunicacion"].map(cat=>{
            const items=sorted.filter(t=>t.categoria===cat);
            if(!items.length) return null;
            const color=TLC[cat]||"var(--text-muted)";
            return(<div key={cat} className="log-k-col">
              <div className="log-k-hdr" style={{borderTopColor:color}}>
                <span style={{fontSize:"var(--fs-sm)",fontWeight:700,color}}>{TLI[cat]} {cat}</span>
                <span className="log-k-cnt" style={{background:color+"22",color,border:`1px solid ${color}44`}}>{items.length}</span>
              </div>
              {items.map(t=>{const ec=ESTADO_COLORES[t.estado];return(<div key={t.id} className="log-k-card" style={{borderLeftColor:color,cursor:"pointer",opacity:t.estado==="completado"?.55:1}} onClick={()=>abrirFicha("tl",t)}>
                <div className="mono" style={{fontSize:"var(--fs-xs)",color,marginBottom:".2rem"}}>{t.hora}</div>
                <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".2rem"}}>{t.titulo}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:ec,background:ec+"18",padding:".1rem .35rem",borderRadius:4,display:"inline-block"}}>{t.estado}</div>
              </div>);})}
            </div>);
          })}
        </div>
      ):(
      <div className="tlcon">{sorted.map((t,i)=>{
        const color=TLC[t.categoria]||"var(--text-muted)";const ec=ESTADO_COLORES[t.estado];
        // Insertar línea "AHORA" entre la tarea anterior y la actual
        const esPrimeroFuturo = !ordenAlfa && t.hora >= horaActual &&
          (i === 0 || sorted[i-1].hora < horaActual);
        return(
          <div key={t.id} style={{display:"contents"}}>
          {esPrimeroFuturo && (
            <div style={{display:"flex",alignItems:"center",gap:".6rem",margin:".3rem 0",padding:"0 .5rem"}}>
              <div style={{flex:1,height:1,background:"rgba(34,211,238,0.35)"}}/>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                color:"var(--cyan)",padding:".12rem .5rem",borderRadius:20,
                background:"rgba(34,211,238,0.1)",border:"1px solid rgba(34,211,238,0.3)",
                whiteSpace:"nowrap"}}>
                ● AHORA {horaActual}
              </span>
              <div style={{flex:1,height:1,background:"rgba(34,211,238,0.35)"}}/>
            </div>
          )}
          <div className={cls("tlrow",t.estado==="completado"&&"tldone",t.estado==="bloqueado"&&"tlblk")}>
            <div className="tlleft">
              <div className="tltime">{t.hora}</div>
              <div className="tlconn">
                <div className="tlnode" style={{background:color,boxShadow:`0 0 8px ${color}66`}}><span>{TLI[t.categoria]}</span></div>
                {i<sorted.length-1&&<div className="tledge"/>}
              </div>
            </div>
            <div className="tlcard" style={{cursor:"pointer"}} onClick={()=>abrirFicha("tl",t)}>
              <div className="tlch">
                <span className="tlct">{t.titulo}</span>
                <div className="fr g1" onClick={e=>e.stopPropagation()}>
                  <select className="isml" value={t.estado} onChange={e=>upd(t.id,e.target.value)} style={{color:ec,background:`${ec}18`,border:`1px solid ${ec}44`,borderRadius:5,padding:"0.18rem 0.4rem",fontSize:"var(--fs-sm)",fontFamily:"var(--font-mono)",cursor:"pointer"}}>
                    {ESTADO_TAREA.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  
                </div>
              </div>
              <div className="tlcd">{t.descripcion}</div>
              <div className="tlcf">
                <span className="tlchip" style={{borderColor:`${color}44`,color}}>{TLI[t.categoria]} {t.categoria}</span>
                <span className="tlresp">👤 {t.responsable}</span>
              </div>
            </div>
          </div>
          </div>
        );
      })}</div>
      )}
    </>
  );
}

// ─── DIRECTORIO DE CONTACTOS ─────────────────────────────────────────────────
// Todos los contactos del evento, con tipos personalizables
// Helpers extraídos del scope de TabDirectorio para evitar conflictos
// de minimización de nombres (TDZ) con Rollup en producción.
// Al estar en un scope de módulo separado, Rollup les asigna nombres
// distintos a los de las lambdas internas del componente.
function crearIdTipoContacto(nombre) {
  return nombre.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
}
function filtrarContactosDir(lista, excluidos) {
  return lista.filter(function(contacto) { return !excluidos.includes(contacto.tipo); });
}
function ordenarContactosAlfa(lista) {
  return [...lista].sort(function(ca, cb) {
    return (ca.nombre||"").localeCompare(cb.nombre||"","es");
  });
}
function filtrarContactosPorTipo(lista, tipo) {
  return lista.filter(function(contacto) { return contacto.tipo === tipo; });
}

function TabDirectorio({cont,setCont,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,tiposContacto=[],setTiposContacto}) {
  const [filtroTipo,setFiltroTipo] = useState("todos");
  const [modalTipo,setModalTipo]   = useState(false);
  const [nuevoTipo,setNuevoTipo]   = useState({nombre:"",icono:"🏷️",color:"var(--text-muted)"});
  const [busqCont,setBusqCont]     = useState("");

  const TIPOS_BASE = [
    {id:"emergencia",  nombre:"Emergencia",    icono:"🚨", color:"var(--red)"},
    {id:"medico",      nombre:"Médico",        icono:"🏥", color:"var(--green)"},
    {id:"proveedor",   nombre:"Proveedor",     icono:"🏭", color:"var(--amber)"},
    {id:"staff",       nombre:"Staff",         icono:"👤", color:"var(--cyan)"},
    {id:"institucional",nombre:"Institucional",icono:"🏛️",color:"var(--violet)"},
    {id:"media",       nombre:"Media/Prensa",  icono:"📸", color:"var(--orange)"},
    {id:"voluntario",  nombre:"Voluntario",    icono:"🙋", color:"#818cf8"},
  ];
  const tiposCustom   = Array.isArray(tiposContacto) ? tiposContacto : [];
  const todosLosTipos = [...TIPOS_BASE, ...tiposCustom];
  function getTipo(tkId){return todosLosTipos.find(function(ttItem){return ttItem.id===tkId;})||{nombre:tkId,icono:"🏷️",color:"var(--text-muted)"};}

  // Excluir emergencia y médico del directorio (están en la pestaña Emergencias)
  const TIPOS_EXCLUIDOS_DIR = ["emergencia","medico"];
  const contDir      = filtrarContactosDir(cont, TIPOS_EXCLUIDOS_DIR);
  const contOrdenado = ordenAlfa ? ordenarContactosAlfa(contDir) : contDir;
  const contFiltradoPorTipo = filtroTipo==="todos" ? contOrdenado : filtrarContactosPorTipo(contOrdenado, filtroTipo);
  const contFiltrado = busqCont.trim()
    ? contFiltradoPorTipo.filter(function(ctDir) {
        var qDir2 = busqCont.toLowerCase();
        return (ctDir.nombre||"").toLowerCase().includes(qDir2)
          || (ctDir.rol||"").toLowerCase().includes(qDir2)
          || (ctDir.telefono||"").toLowerCase().includes(qDir2)
          || (ctDir.email||"").toLowerCase().includes(qDir2);
      })
    : contFiltradoPorTipo;

  const guardarTipo = () => {
    if (!nuevoTipo.nombre.trim()) return;
    const nuevoId = crearIdTipoContacto(nuevoTipo.nombre);
    if (todosLosTipos.find(t=>t.id===nuevoId)) return;
    setTiposContacto(prev=>[...(Array.isArray(prev)?prev:[]),{...nuevoTipo,id:nuevoId}]);
    setNuevoTipo({nombre:"",icono:"🏷️",color:"var(--text-muted)"});
    setModalTipo(false);
    toast.success("Tipo de contacto creado");
  };

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📋 Directorio de Contactos</div>
          <div className="pd">{contDir.length} contacto{contDir.length!==1?"s":""} · Los urgentes están en Emergencias</div>
        </div>
        <div style={{display:"flex",gap:".4rem",flexWrap:"wrap"}}>
          <button className="btn btn-ghost btn-sm"
            style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)"}}
            onClick={()=>setModalTipo(true)}>+ Tipo</button>
          <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")}
            onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={()=>setModal({tipo:"cont"})}>+ Contacto</button>
        </div>
      </div>

      {/* Filtros por tipo */}
      <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",marginBottom:".65rem"}}>
        <button onClick={()=>setFiltroTipo("todos")}
          style={{padding:".2rem .55rem",borderRadius:20,cursor:"pointer",
            fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
            border:`1px solid ${filtroTipo==="todos"?"var(--cyan)":"var(--border)"}`,
            background:filtroTipo==="todos"?"var(--cyan-dim)":"transparent",
            color:filtroTipo==="todos"?"var(--cyan)":"var(--text-muted)"}}>
          Todos ({contDir.length})
        </button>
        {todosLosTipos.filter(t=>!TIPOS_EXCLUIDOS_DIR.includes(t.id)).map(t => {
          const n = contDir.filter(c=>c.tipo===t.id).length;
          if (!n) return null;
          return (
            <button key={t.id} onClick={()=>setFiltroTipo(filtroTipo===t.id?"todos":t.id)}
              style={{padding:".2rem .55rem",borderRadius:20,cursor:"pointer",
                fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                border:`1px solid ${filtroTipo===t.id?t.color:t.color+"55"}`,
                background:filtroTipo===t.id?t.color+"20":"transparent",
                color:filtroTipo===t.id?t.color:t.color+"cc",
                display:"flex",alignItems:"center",gap:".25rem"}}>
              {t.icono} {t.nombre}
              <span style={{background:t.color+"30",padding:"0 .3rem",borderRadius:10}}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* Tipos personalizados activos */}
      {tiposCustom.length > 0 && (
        <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",marginBottom:".5rem",
          padding:".35rem .6rem",background:"var(--surface2)",borderRadius:6,
          border:"1px solid var(--border)"}}>
          <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
            color:"var(--text-dim)",alignSelf:"center"}}>Tipos propios:</span>
          {tiposCustom.map(t=>(
            <span key={t.id} style={{display:"inline-flex",alignItems:"center",gap:".25rem",
              padding:".12rem .45rem",borderRadius:20,
              background:t.color+"18",color:t.color,
              border:`1px solid ${t.color}33`,fontFamily:"var(--font-mono)",
              fontSize:"var(--fs-xs)",fontWeight:700}}>
              {t.icono} {t.nombre}
              <button onClick={()=>setTiposContacto(function(tcPrev){return(Array.isArray(tcPrev)?tcPrev:[]).filter(function(tcItm){return tcItm.id!==t.id;});})}
                style={{background:"none",border:"none",cursor:"pointer",
                  color:"var(--text-dim)",fontSize:"var(--fs-xs)",padding:0,lineHeight:1}}>✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Grid de contactos */}
      {contFiltrado.length === 0 ? (
        <div className="card" style={{textAlign:"center",padding:"2rem",
          color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}>
          Sin contactos{filtroTipo!=="todos"?` de tipo "${getTipo(filtroTipo).nombre}"`:""}
        </div>
      ) : (
        <div className="cgrid">
          {contFiltrado.map(citem=>{
            const t = getTipo(citem.tipo);
            return (
              <div key={citem.id} className="ccard"
                style={{borderTopColor:t.color,cursor:"pointer"}}
                onClick={()=>abrirFicha("cont",citem)}>
                <div className="cch">
                  <div className="ccti" style={{fontSize:"var(--fs-lg)"}}>{t.icono}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="ccn">{citem.nombre}</div>
                    <div className="ccr">{citem.rol}</div>
                  </div>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                    padding:".1rem .35rem",borderRadius:10,flexShrink:0,
                    background:t.color+"18",color:t.color,border:`1px solid ${t.color}33`}}>
                    {t.nombre}
                  </span>
                </div>
                <div className="ccd">
                  <a href={`tel:${citem.telefono}`} className="ctel">📞 {citem.telefono}</a>
                  {citem.email&&<a href={`mailto:${citem.email}`} className="ceml">✉️ {citem.email}</a>}
                </div>
                {citem.web&&<div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",marginTop:".2rem"}}>
                  <a href={citem.web} target="_blank" rel="noreferrer"
                    style={{color:"var(--cyan)",textDecoration:"none"}}
                    onClick={e=>e.stopPropagation()}>🌐 {citem.web}</a>
                </div>}
                {citem.notas&&<div className="cnota">{citem.notas}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuevo tipo personalizado */}
      {modalTipo && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModalTipo(false)}>
          <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:360}}>
            <div className="modal-header">
              <span className="modal-title">🏷️ Nuevo tipo de contacto</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setModalTipo(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body" style={{gap:".5rem"}}>
              <div>
                <label className="fl">Nombre *</label>
                <input className="inp" placeholder="ej. Federación, Media, Patrocinador..."
                  value={nuevoTipo.nombre}
                  onChange={e=>setNuevoTipo(p=>({...p,nombre:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&guardarTipo()} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem"}}>
                <div>
                  <label className="fl">Emoji / Icono</label>
                  <input className="inp" placeholder="🏷️" maxLength={4}
                    value={nuevoTipo.icono}
                    onChange={e=>setNuevoTipo(p=>({...p,icono:e.target.value}))} />
                </div>
                <div>
                  <label className="fl">Color</label>
                  <div style={{display:"flex",gap:".35rem",alignItems:"center"}}>
                    <input type="color" value={nuevoTipo.color}
                      onChange={e=>setNuevoTipo(p=>({...p,color:e.target.value}))}
                      style={{width:36,height:32,border:"1px solid var(--border)",
                        borderRadius:6,cursor:"pointer",background:"none",padding:2}} />
                    <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                      color:"var(--text-muted)"}}>{nuevoTipo.color}</span>
                  </div>
                </div>
              </div>
              <div style={{padding:".4rem .6rem",borderRadius:6,
                background:"var(--surface2)",border:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  color:"var(--text-muted)",marginRight:".4rem"}}>Vista previa:</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                  padding:".12rem .45rem",borderRadius:20,
                  background:nuevoTipo.color+"20",color:nuevoTipo.color,
                  border:`1px solid ${nuevoTipo.color}44`}}>
                  {nuevoTipo.icono} {nuevoTipo.nombre||"Mi tipo"}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModalTipo(false)}>Cancelar</button>
              <button className="btn btn-primary"
                disabled={!nuevoTipo.nombre.trim()}
                style={{opacity:nuevoTipo.nombre.trim()?1:.5}}
                onClick={guardarTipo}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── EMERGENCIAS — solo urgencias reales: directorio urgente + protocolo + incidencias
function TabEmergencias({cont,inc,setInc,abrirModal,abrirFicha,tiposContacto=[]}) {
  const [sub,setSub]     = useState("urgentes");
  const [proto,setProto] = useState(null);

  const TIPOS_BASE = [
    {id:"emergencia",icono:"🚨",color:"var(--red)"},
    {id:"medico",    icono:"🏥",color:"var(--green)"},
  ];
  const todosLosTipos = [...TIPOS_BASE,...(Array.isArray(tiposContacto)?tiposContacto:[])];
  const getTipo = (id) => todosLosTipos.find(t=>t.id===id)||{icono:"📞",color:"var(--text-muted)"};

  // Contactos urgentes = emergencia + médico
  const contUrgentes = cont.filter(c=>c.tipo==="emergencia"||c.tipo==="medico");
  const incAbiertas  = inc.filter(i=>i.estado==="abierta").length;

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🚨 Emergencias</div>
          <div className="pd">
            {contUrgentes.length} contactos urgentes · {inc.length} incidencias
            {incAbiertas>0&&<span style={{color:"var(--red)",marginLeft:".4rem"}}>· ⚠ {incAbiertas} abiertas</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:".4rem",flexWrap:"wrap"}}>
          <button className="btn btn-ghost btn-sm" aria-label="Exportar directorio de emergencias a PDF"
            onClick={() => {
              const tiposOrden = ["emergencia","medico",...todosLosTipos.filter(t=>t.id!=="emergencia"&&t.id!=="medico").map(t=>t.id)];
              const grupos = tiposOrden.map(tid => {
                const tipo = getTipo(tid);
                const items = cont.filter(c=>c.tipo===tid);
                if(!items.length) return null;
                return {tipo, items};
              }).filter(Boolean);
              const ahora = new Date();
              const fecha = ahora.toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"});
              const hora  = ahora.toTimeString().slice(0,5);

              const gruposHtml = grupos.map(g => {
                const rowsHtml = g.items.map(c => {
                  const telLink = c.telefono ? "<a href=\"tel:" + (c.telefono||"").replace(/\s/g,"") + "\">" + (c.telefono||"—") + "</a>" : "—";
                  const emailHtml = c.email ? "<br><span style=\"font-size:9pt;font-weight:400\">" + c.email + "</span>" : "";
                  return "<tr><td class=\"nombre\">" + (c.nombre||"—") + "</td><td class=\"rol\">" + (c.rol||"") + "</td><td class=\"tel\">" + telLink + emailHtml + "</td></tr>";
                }).join("");
                return "<div class=\"grupo\"><div class=\"grupo-header\">" + (g.tipo.icono||"📞") + " " + (g.tipo.nombre||g.tipo.id) + "</div><table>" + rowsHtml + "</table></div>";
              }).join("");

              const html = "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"UTF-8\">" +
                "<title>Directorio Emergencias — Trail El Guerrero 2026</title>" +
                "<style>*{margin:0;padding:0;box-sizing:border-box}" +
                "body{font-family:Arial,sans-serif;font-size:11pt;color:#111;padding:20px;max-width:700px;margin:0 auto}" +
                "h1{font-size:16pt;font-weight:900;color:#c00;margin-bottom:4px}" +
                ".meta{font-size:9pt;color:#666;margin-bottom:16px}" +
                ".alert{background:#fff0f0;border:2px solid #c00;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-weight:700;color:#c00;font-size:12pt;text-align:center}" +
                ".grupo{margin-bottom:14px;break-inside:avoid}" +
                ".grupo-header{background:#f5f5f5;border-left:4px solid #c00;padding:5px 10px;font-weight:700;font-size:10pt;margin-bottom:6px}" +
                "table{width:100%;border-collapse:collapse}" +
                "td{padding:5px 8px;border-bottom:1px solid #e5e5e5;font-size:10pt;vertical-align:top}" +
                "td.nombre{font-weight:700;width:35%}td.rol{color:#555;width:30%}td.tel{font-family:monospace;font-weight:700;font-size:11pt;width:35%}" +
                "a{color:#111;text-decoration:none}" +
                ".footer{margin-top:20px;padding-top:10px;border-top:1px solid #ccc;font-size:8pt;color:#888;text-align:center}" +
                "@media print{body{padding:0}.footer{position:fixed;bottom:0;width:100%}}</style></head><body>" +
                "<h1>\uD83D\uDEA8 Directorio de Emergencias</h1>" +
                "<div class=\"meta\">Trail El Guerrero 2026 \u00B7 Candeleda, \u00C1vila \u00B7 Impreso el " + fecha + " a las " + hora + "</div>" +
                "<div class=\"alert\">\u26A0\uFE0F EMERGENCIA GRAVE \u2192 llama al 112 PRIMERO</div>" +
                gruposHtml +
                "<div class=\"footer\">Trail El Guerrero 2026 \u00B7 Club Deportivo Trail Candeleda \u00B7 Documento confidencial para uso interno del equipo organizador</div>" +
                "</body></html>";
              const w = window.open("","_blank","width=750,height=900");
              if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
            }}
            style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
              color:"var(--cyan)", background:"var(--cyan-dim)", border:"1px solid rgba(34,211,238,.25)",
              borderRadius:6, padding:".35rem .75rem", cursor:"pointer", display:"flex",
              alignItems:"center", gap:".35rem", flexShrink:0 }}>
            🖨️ PDF emergencias
          </button>
          {sub==="incidencias" && (
            <button className="btn btn-sm"
              style={{background:"var(--red-dim)",color:"var(--red)",
                border:"1px solid rgba(248,113,113,.2)"}}
              onClick={()=>abrirModal({tipo:"inc"})}>+ Incidencia</button>
          )}
        </div>
      </div>

      {/* Banner 112 siempre visible */}
      <div style={{padding:".5rem .85rem",borderRadius:8,marginBottom:".75rem",
        background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",
        fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--red)",
        fontWeight:700,display:"flex",alignItems:"center",gap:".6rem"}}>
        🚨 Emergencia grave → llama al <a href="tel:112" style={{color:"var(--red)",fontWeight:900,textDecoration:"underline"}}>112</a> primero
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",gap:".3rem",marginBottom:".75rem",
        borderBottom:"1px solid var(--border)",paddingBottom:".4rem"}}>
        {[
          {id:"urgentes",  label:"📞 Contactos urgentes"},
          {id:"protocolo", label:"📘 Protocolos"},
          {id:"incidencias",label:"⚠️ Incidencias",
           badge:incAbiertas>0?incAbiertas:null,badgeColor:"var(--red)"},
        ].map(t=>(
          <button key={t.id} onClick={()=>setSub(t.id)}
            style={{padding:".3rem .7rem",borderRadius:6,border:"none",cursor:"pointer",
              fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",fontWeight:700,
              background:sub===t.id?"rgba(248,113,113,.12)":"transparent",
              color:sub===t.id?"var(--red)":"var(--text-muted)",
              borderBottom:sub===t.id?"2px solid var(--red)":"2px solid transparent",
              display:"flex",alignItems:"center",gap:".3rem"}}>
            {t.label}
            {t.badge&&<span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
              padding:".05rem .35rem",borderRadius:10,fontWeight:800,
              background:t.badgeColor+"22",color:t.badgeColor}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Contactos urgentes */}
      {sub==="urgentes" && (
        <>
          <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
            color:"var(--text-muted)",marginBottom:".5rem"}}>
            Solo contactos de tipo <strong>Emergencia</strong> y <strong>Médico</strong>.
            El resto están en la pestaña Contactos.
          </div>
          {contUrgentes.length===0 ? (
            <div className="card" style={{textAlign:"center",padding:"2rem",
              color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}>
              Sin contactos de emergencia. Añádelos en Contactos con tipo Emergencia o Médico.
            </div>
          ) : (
            <div className="cgrid">
              {contUrgentes.map(c=>{
                const t=getTipo(c.tipo);
                return (
                  <div key={c.id} className="ccard"
                    style={{borderTopColor:t.color,cursor:"pointer",
                      borderLeft:`3px solid ${t.color}`}}
                    onClick={()=>abrirFicha("cont",c)}>
                    <div className="cch">
                      <div className="ccti">{t.icono}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="ccn">{c.nombre}</div>
                        <div className="ccr">{c.rol}</div>
                      </div>
                    </div>
                    <div className="ccd">
                      <a href={`tel:${c.telefono}`} className="ctel"
                        style={{background:t.color+"18",color:t.color,
                          border:`1px solid ${t.color}33`,borderRadius:6,
                          padding:".3rem .7rem",fontWeight:800,fontSize:"var(--fs-base)",
                          textDecoration:"none",display:"inline-flex",
                          alignItems:"center",gap:".35rem"}}>
                        📞 {c.telefono}
                      </a>
                    </div>
                    {c.notas&&<div className="cnota">{c.notas}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Protocolos */}
      {sub==="protocolo" && (
        <div>
          <div className="pgrid">
            {PROTO_PASOS.map(p=>(
              <button key={p.id} className={cls("pbtn",proto===p.id&&"pactive")}
                onClick={()=>setProto(proto===p.id?null:p.id)}>
                <span style={{fontSize:"var(--fs-lg)"}}>{p.icon}</span><span>{p.titulo}</span>
              </button>
            ))}
          </div>
          {proto&&(
            <div className="psteps">
              <div className="pst">{PROTO_PASOS.find(p=>p.id===proto)?.icon} {PROTO_PASOS.find(p=>p.id===proto)?.titulo}</div>
              {PROTO_PASOS.find(p=>p.id===proto)?.pasos.map((ps,i)=>(
                <div key={i} className="ps"><div className="psn">{i+1}</div><div className="pst2">{ps}</div></div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Incidencias */}
      {sub==="incidencias" && (
        <>
          <div className="pd" style={{marginBottom:".65rem"}}>
            {inc.length} incidencia{inc.length!==1?"s":""} · {incAbiertas} abierta{incAbiertas!==1?"s":""}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
            {inc.map(ic=>(
              <div key={ic.id} className={cls("icard",ic.estado==="resuelta"&&"ires")}
                style={{cursor:"pointer"}} onClick={()=>abrirFicha("inc",ic)}>
                <div className="ich">
                  <div className="fr g1">
                    <span className="mono" style={{fontSize:"var(--fs-sm)",color:"var(--amber)"}}>{ic.hora}</span>
                    <span className="badge" style={{
                      background:ic.gravedad==="alta"?"var(--red-dim)":ic.gravedad==="media"?"var(--amber-dim)":"var(--green-dim)",
                      color:ic.gravedad==="alta"?"var(--red)":ic.gravedad==="media"?"var(--amber)":"var(--green)"}}>
                      {ic.gravedad}
                    </span>
                    <span className="badge" style={{background:"var(--cyan-dim)",color:"var(--cyan)"}}>{ic.tipo}</span>
                  </div>
                  <div className="fr g1" onClick={e=>e.stopPropagation()}>
                    <button className="btn btn-sm"
                      style={{background:"var(--green-dim)",color:"var(--green)",
                        border:"1px solid rgba(52,211,153,.2)"}}
                      onClick={()=>setInc(p=>p.map(x=>x.id===ic.id
                        ?{...x,estado:x.estado==="resuelta"?"abierta":"resuelta"}:x))}>
                      {ic.estado==="resuelta"?"✓ Resuelta":"Marcar resuelta"}
                    </button>
                  </div>
                </div>
                <div style={{fontWeight:600,fontSize:"var(--fs-base)",margin:".3rem 0"}}>{ic.descripcion}</div>
                {ic.responsable&&<div className="muted xs mono">👤 {ic.responsable}</div>}
                {ic.resolucion&&<div className="ires-txt">✓ {ic.resolucion}</div>}
              </div>
            ))}
            {inc.length===0&&<div className="empty">✅ Sin incidencias registradas</div>}
          </div>
        </>
      )}
    </>
  );
}

// ─── COMUNICACIONES ───────────────────────────────────────────────────────────
const TIC={emergencia:"var(--red)",proveedor:"var(--amber)",staff:"var(--cyan)",institucional:"var(--violet)"};
const TICI={emergencia:"🚨",proveedor:"🏭",staff:"👤",institucional:"🏛️"};
const PROTO_PASOS=[
  {id:1,titulo:"Accidente de corredor en ruta",icon:"🏃",pasos:["Recibir aviso por walkie del puesto más cercano","Confirmar ubicación exacta (KM de ruta + puesto)","Contactar inmediatamente con Cruz Roja: 920 350 033","Notificar a Dirección de carrera","Si hay riesgo vital: llamar al 112","Enviar vehículo todoterreno si es necesario acceder","Registrar incidencia en el módulo"]},
  {id:2,titulo:"Corredor desaparecido / extraviado",icon:"❓",pasos:["Confirmar último control donde fue visto (hora, KM)","Contactar con delegado de la distancia correspondiente","Activar protocolo búsqueda: recorrer tramo a pie/vehículo","Contactar con Guardia Civil Candeleda: 920 380 100","No cerrar el puesto hasta localizar al corredor","Registrar toda la información en incidencias"]},
  {id:3,titulo:"Incidencia meteorológica grave",icon:"⛈️",pasos:["Evaluar gravedad con meteorología local","Consultar con organización y juez árbitro","Si hay peligro: detener la prueba por walkie general","Reunir a corredores en el punto de control más cercano","Activar vehículos de recogida para tramos lejanos","Decisión final de suspensión: Dirección + Juez árbitro"]},
  {id:4,titulo:"Problema en avituallamiento",icon:"🍎",pasos:["Identificar qué falta (agua, isotónico, otro)","Contactar con furgoneta de reparto","Si urgente: enviar voluntario con coche propio","Alternativa: reducir raciones hasta reponer","Registrar en incidencias para próxima edición"]},
];

function TabCont({cont,setCont,inc,setInc,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,abrirModal,tiposContacto=[],setTiposContacto}) {
  const [sub,setSub]           = useState("directorio");
  const [proto,setProto]       = useState(null);
  const [filtroTipo,setFiltroTipo] = useState("todos");
  const [modalTipo,setModalTipo]   = useState(false); // modal añadir tipo personalizado
  const [nuevoTipo,setNuevoTipo]   = useState({nombre:"",icono:"🏷️",color:"var(--text-muted)"});

  // Tipos base (siempre presentes) + personalizados del usuario
  const TIPOS_BASE = [
    {id:"emergencia",  nombre:"Emergencia",   icono:"🚨", color:"var(--red)"},
    {id:"proveedor",   nombre:"Proveedor",    icono:"🏭", color:"var(--amber)"},
    {id:"staff",       nombre:"Staff",        icono:"👤", color:"var(--cyan)"},
    {id:"institucional",nombre:"Institucional",icono:"🏛️",color:"var(--violet)"},
    {id:"medico",      nombre:"Médico",       icono:"🏥", color:"var(--green)"},
    {id:"media",       nombre:"Media/Prensa", icono:"📸", color:"var(--orange)"},
  ];
  const tiposCustom  = Array.isArray(tiposContacto) ? tiposContacto : [];
  const todosLosTipos = [...TIPOS_BASE, ...tiposCustom];
  const getTipo = (tkid) => todosLosTipos.find(tt=>tt.id===tkid) || {nombre:tkid,icono:"🏷️",color:"var(--text-muted)"};

  const contOrdenado = ordenAlfa
    ? [...cont].sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es"))
    : cont;
  const contFiltrado = filtroTipo==="todos"
    ? contOrdenado
    : contOrdenado.filter(c=>c.tipo===filtroTipo);

  const guardarTipo = () => {
    if (!nuevoTipo.nombre.trim()) return;
    const id = nuevoTipo.nombre.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    if (todosLosTipos.find(t=>t.id===id)) return;
    setTiposContacto(prev=>[...(Array.isArray(prev)?prev:[]),{...nuevoTipo,id}]);
    setNuevoTipo({nombre:"",icono:"🏷️",color:"var(--text-muted)"});
    setModalTipo(false);
    toast.success("Tipo de contacto creado");
  };
  const eliminarTipo = (id) => {
    setTiposContacto(function(tcPrev){return(Array.isArray(tcPrev)?tcPrev:[]).filter(function(tcItm){return tcItm.id!==id;});});
    toast.success("Tipo de contacto eliminado");
  };

  const incAbiertas = inc.filter(i=>i.estado==="abierta").length;

  return(
    <>
      <div className="ph">
        <div>
          <div className="pt">🚨 Emergencias</div>
          <div className="pd">
            {cont.length} contactos · {inc.length} incidencias
            {incAbiertas>0 && <span style={{color:"var(--red)",marginLeft:".4rem"}}>· ⚠ {incAbiertas} abiertas</span>}
          </div>
        </div>
        <div className="fr g1">
          {sub==="directorio" && (
            <input type="search" className="inp inp-sm"
              placeholder="Buscar contacto…"
              value={busqCont} onChange={e=>setBusqCont(e.target.value)}
              style={{maxWidth:150,fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}
            />
          )}
          <button className="btn btn-primary" onClick={()=>abrirModal({tipo:"cont"})}>+ Contacto</button>
          {sub==="incidencias" && (
            <button className="btn btn-sm" style={{background:"var(--red-dim)",color:"var(--red)",border:"1px solid rgba(248,113,113,0.2)"}}
              onClick={()=>abrirModal({tipo:"inc"})}>+ Incidencia</button>
          )}
        </div>
      </div>

      {/* Sub-tabs — Kinetik filter-pills */}
      <div className="filter-pill-group" style={{marginBottom:".85rem"}}>
        {[
          {id:"directorio",  label:"📋 Directorio",  badge:cont.length},
          {id:"protocolo",   label:"📘 Protocolos",  badge:null},
          {id:"incidencias", label:"⚠️ Incidencias", badge:incAbiertas||null, badgeColor:"var(--red)"},
        ].map(t=>(
          <button key={t.id}
            className={"filter-pill" + (sub===t.id?" active":"")}
            onClick={()=>setSub(t.id)}
            style={sub===t.id&&t.badgeColor?{color:t.badgeColor,borderColor:t.badgeColor+"66",background:t.badgeColor+"18"}:{}}>
            {t.label}
            {t.badge!=null && t.badge>0 && (
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                padding:".05rem .35rem",borderRadius:10,fontWeight:800,
                background:t.badgeColor?t.badgeColor+"22":"rgba(34,211,238,.15)",
                color:t.badgeColor||"var(--cyan)"}}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── DIRECTORIO ── */}
      {sub==="directorio" && (
        <>
          {/* Filtros por tipo */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            gap:".5rem",flexWrap:"wrap",marginBottom:".65rem"}}>
            <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",flex:1}}>
              <button
                onClick={()=>setFiltroTipo("todos")}
                style={{padding:".22rem .6rem",borderRadius:20,border:`1px solid ${filtroTipo==="todos"?"var(--cyan)":"var(--border)"}`,
                  background:filtroTipo==="todos"?"var(--cyan-dim)":"transparent",
                  color:filtroTipo==="todos"?"var(--cyan)":"var(--text-muted)",
                  fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,cursor:"pointer"}}>
                Todos ({contDir.length})
              </button>
              {todosLosTipos.map(t=>{
                const n = cont.filter(c=>c.tipo===t.id).length;
                if (!n && !tiposCustom.find(tc=>tc.id===t.id)) return null;
                return (
                  <button key={t.id}
                    onClick={()=>setFiltroTipo(filtroTipo===t.id?"todos":t.id)}
                    style={{padding:".22rem .6rem",borderRadius:20,
                      border:`1px solid ${filtroTipo===t.id?t.color:t.color+"44"}`,
                      background:filtroTipo===t.id?t.color+"20":"transparent",
                      color:filtroTipo===t.id?t.color:t.color+"bb",
                      fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,cursor:"pointer",
                      display:"flex",alignItems:"center",gap:".25rem"}}>
                    {t.icono} {t.nombre}
                    {n>0 && <span style={{background:t.color+"33",padding:"0 .3rem",borderRadius:10}}>{n}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
              <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")}
                onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
              <button className="btn btn-ghost btn-sm"
                onClick={()=>setModalTipo(true)}
                style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)"}}>
                + Tipo
              </button>
            </div>
          </div>

          {/* Tipos personalizados */}
          {tiposCustom.length > 0 && (
            <div style={{display:"flex",gap:".35rem",flexWrap:"wrap",
              marginBottom:".6rem",padding:".4rem .6rem",
              background:"var(--surface2)",borderRadius:6,
              border:"1px solid var(--border)"}}>
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                color:"var(--text-dim)",alignSelf:"center"}}>
                Tipos personalizados:
              </span>
              {tiposCustom.map(t=>(
                <span key={t.id} style={{display:"inline-flex",alignItems:"center",gap:".25rem",
                  padding:".15rem .5rem",borderRadius:20,
                  background:t.color+"15",color:t.color,
                  border:`1px solid ${t.color}33`,
                  fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700}}>
                  {t.icono} {t.nombre}
                  <button onClick={()=>eliminarTipo(t.id)}
                    style={{background:"none",border:"none",cursor:"pointer",
                      color:"var(--text-dim)",fontSize:"var(--fs-xs)",padding:0,lineHeight:1}}>✕</button>
                </span>
              ))}
            </div>
          )}

          {/* Grid de contactos */}
          {contFiltrado.length === 0 ? (
            <div className="card" style={{textAlign:"center",padding:"2rem",
              color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}>
              Sin contactos {filtroTipo!=="todos"?`de tipo "${getTipo(filtroTipo).nombre}"`:""}
            </div>
          ) : (
            <div className="cgrid">
              {contFiltrado.map(c=>{
                const t = getTipo(c.tipo);
                return (
                  <div key={conceptoPresu.id} className="ccard"
                    style={{borderTopColor:t.color,cursor:"pointer"}}
                    onClick={()=>abrirFicha("cont",c)}>
                    <div className="cch">
                      <div className="ccti" style={{fontSize:"var(--fs-lg)"}}>{t.icono}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="ccn">{citem.nombre}</div>
                        <div className="ccr">{citem.rol}</div>
                      </div>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                        padding:".1rem .4rem",borderRadius:10,flexShrink:0,
                        background:t.color+"18",color:t.color,border:`1px solid ${t.color}33`}}>
                        {t.nombre}
                      </span>
                    </div>
                    <div className="ccd">
                      <a href={`tel:${citem.telefono}`} className="ctel">📞 {citem.telefono}</a>
                      {citem.email&&<a href={`mailto:${citem.email}`} className="ceml">✉️ {citem.email}</a>}
                    </div>
                    {conceptoPresu.web&&<div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                      color:"var(--cyan)",marginTop:".2rem"}}>
                      <a href={citem.web} target="_blank" rel="noreferrer"
                        style={{color:"var(--cyan)",textDecoration:"none"}}
                        onClick={e=>e.stopPropagation()}>🌐 {citem.web}</a>
                    </div>}
                    {citem.notas&&<div className="cnota">{citem.notas}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── PROTOCOLOS ── */}
      {sub==="protocolo" && (
        <div>
          <div className="pintro">
            <span style={{fontSize:"var(--fs-lg)"}}>🚨</span>
            <div>
              <div style={{fontWeight:700,marginBottom:".2rem"}}>Protocolo de emergencias</div>
              <div className="muted xs mono">Selecciona el tipo de incidencia para ver los pasos</div>
            </div>
          </div>
          <div className="pgrid">
            {PROTO_PASOS.map(p=>(
              <button key={p.id} className={cls("pbtn",proto===p.id&&"pactive")} onClick={()=>setProto(proto===p.id?null:p.id)}>
                <span style={{fontSize:"var(--fs-lg)"}}>{p.icon}</span><span>{p.titulo}</span>
              </button>
            ))}
          </div>
          {proto && (
            <div className="psteps">
              <div className="pst">{PROTO_PASOS.find(p=>p.id===proto)?.icon} {PROTO_PASOS.find(p=>p.id===proto)?.titulo}</div>
              {PROTO_PASOS.find(p=>p.id===proto)?.pasos.map((ps,i)=>(
                <div key={i} className="ps"><div className="psn">{i+1}</div><div className="pst2">{ps}</div></div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INCIDENCIAS ── */}
      {sub==="incidencias" && (
        <>
          <div className="pd" style={{marginBottom:".75rem"}}>
            {inc.length} incidencia{inc.length!==1?"s":""} ·{" "}
            {incAbiertas} abierta{incAbiertas!==1?"s":""}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:".55rem"}}>
            {inc.map(ic=>(
              <div key={ic.id} className={cls("icard",ic.estado==="resuelta"&&"ires")} style={{cursor:"pointer"}} onClick={()=>abrirFicha("inc",ic)}>
                <div className="ich">
                  <div className="fr g1">
                    <span className="mono" style={{fontSize:"var(--fs-sm)",color:"var(--amber)"}}>{ic.hora}</span>
                    <span className="badge" style={{background:ic.gravedad==="alta"?"var(--red-dim)":ic.gravedad==="media"?"var(--amber-dim)":"var(--green-dim)",color:ic.gravedad==="alta"?"var(--red)":ic.gravedad==="media"?"var(--amber)":"var(--green)"}}>{ic.gravedad}</span>
                    <span className="badge" style={{background:"var(--cyan-dim)",color:"var(--cyan)"}}>{ic.tipo}</span>
                  </div>
                  <div className="fr g1" onClick={e=>e.stopPropagation()}>
                    <button className="btn btn-sm" style={{background:"var(--green-dim)",color:"var(--green)",border:"1px solid rgba(52,211,153,0.2)"}}
                      onClick={()=>setInc(p=>p.map(x=>x.id===ic.id?{...x,estado:x.estado==="resuelta"?"abierta":"resuelta"}:x))}>
                      {ic.estado==="resuelta"?"✓ Resuelta":"Marcar resuelta"}
                    </button>
                  </div>
                </div>
                <div style={{fontWeight:600,fontSize:"var(--fs-base)",margin:".3rem 0"}}>{ic.descripcion}</div>
                {ic.responsable&&<div className="muted xs mono">👤 {ic.responsable}</div>}
                {ic.resolucion&&<div className="ires-txt">✓ {ic.resolucion}</div>}
              </div>
            ))}
            {inc.length===0&&<div className="empty">✅ Sin incidencias registradas</div>}
          </div>
        </>
      )}

      {/* Modal nuevo tipo de contacto */}
      {modalTipo && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModalTipo(false)}>
          <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:360}}>
            <div className="modal-header">
              <span className="modal-title">🏷️ Nuevo tipo de contacto</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setModalTipo(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body" style={{gap:".5rem"}}>
              <div>
                <label className="fl">Nombre del tipo *</label>
                <input className="inp" placeholder="ej. Federación, Patrocinador, Media..."
                  value={nuevoTipo.nombre}
                  onChange={e=>setNuevoTipo(p=>({...p,nombre:e.target.value}))} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem"}}>
                <div>
                  <label className="fl">Icono (emoji)</label>
                  <input className="inp" placeholder="🏷️" maxLength={2}
                    value={nuevoTipo.icono}
                    onChange={e=>setNuevoTipo(p=>({...p,icono:e.target.value}))} />
                </div>
                <div>
                  <label className="fl">Color</label>
                  <div style={{display:"flex",gap:".3rem",alignItems:"center"}}>
                    <input type="color" value={nuevoTipo.color}
                      onChange={e=>setNuevoTipo(p=>({...p,color:e.target.value}))}
                      style={{width:36,height:32,border:"1px solid var(--border)",borderRadius:6,cursor:"pointer",background:"none",padding:2}} />
                    <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                      color:"var(--text-muted)"}}>{nuevoTipo.color}</span>
                  </div>
                </div>
              </div>
              <div style={{padding:".4rem .6rem",borderRadius:6,
                background:"var(--surface2)",border:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  color:"var(--text-muted)",marginRight:".4rem"}}>Vista previa:</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                  padding:".12rem .45rem",borderRadius:20,
                  background:nuevoTipo.color+"20",color:nuevoTipo.color,
                  border:`1px solid ${nuevoTipo.color}44`}}>
                  {nuevoTipo.icono} {nuevoTipo.nombre||"Tipo"}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModalTipo(false)}>Cancelar</button>
              <button className="btn btn-primary"
                disabled={!nuevoTipo.nombre.trim()}
                style={{opacity:nuevoTipo.nombre.trim()?1:.5}}
                onClick={guardarTipo}>Crear tipo</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


function TabCK({ck,setCk,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,abrirModal,config,tareasProyecto=[],setTareasProyecto}) {
  const eventFecha = config?.fecha ? new Date(config.fecha) : new Date(EVENT_CONFIG_DEFAULT.fecha);
  const diasHasta = Math.ceil((eventFecha - new Date()) / 86400000);
  const faseActiva = (() => {
    if (diasHasta < 0)    return "Post-carrera";
    if (diasHasta <= 1)   return "Mañana carrera";
    if (diasHasta <= 2)   return "Día antes";
    if (diasHasta <= 7)   return "Semana antes";
    if (diasHasta <= 30)  return "1 mes antes";
    if (diasHasta <= 60)  return "2 meses antes";
    return "3 meses antes";
  })();
  const [fase,setFase]=useState(faseActiva);
  const [vistaKanban,setVistaKanban]=useState(false);
  function toggle(ckId) {
    var ckNow = new Date().toTimeString().slice(0,5);
    setCk(function(ckPrev) {
      var ckNext = ckPrev.map(function(ckItm) {
        var nuevoEstado = ckItm.id===ckId ? (ckItm.estado==="completado" ? "pendiente" : "completado") : ckItm.estado;
        return ckItm.id===ckId ? {...ckItm, estado: nuevoEstado, completadoEn: nuevoEstado==="completado" ? ckNow : undefined} : ckItm;
      });
      var ckHit = ckNext.find(function(ckItm) { return ckItm.id===ckId; });
      if (ckHit && ckHit.proyectoTareaId && setTareasProyecto) {
        var ckNuevoEst = ckHit.estado==="completado" ? "completado" : "en curso";
        setTareasProyecto(function(ckTrPrev) {
          return ckTrPrev.map(function(ckTr) {
            return ckTr.id===ckHit.proyectoTareaId ? {...ckTr, estado: ckNuevoEst} : ckTr;
          });
        });
      }
      return ckNext;
    });
  }
  const upd=(id,f,v)=>setCk(p=>p.map(c=>c.id===id?{...c,[f]:v}:c));
  const pf=FASES_CHECKLIST.map(f=>{const it=ck.filter(c=>c.fase===f);const d=it.filter(c=>c.estado==="completado").length;return{f,it,d,t:it.length,pct:it.length?Math.round(d/it.length*100):0};});
  const fd=pf.find(x=>x.f===fase);
  return(
    <>
      <div className="ph">
        <div><div className="pt">✅ Pre-operativo</div><div className="pd" style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}><span style={{background:"rgba(167,139,250,.12)",color:"var(--violet)",border:"1px solid rgba(167,139,250,.25)",borderRadius:99,padding:".1rem .5rem",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700}}>📋 Semanas/días antes</span>{ck.filter(c=>c.estado==="completado").length}/{ck.length} completados</div></div>
        <div className="fr g1">
          <div style={{display:"flex",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",overflow:"hidden"}}>
            {[["lista","☰"],["kanban","⬛"]].map(([v,ic])=>(
              <button key={v} onClick={()=>setVistaKanban(v==="kanban")}
                style={{padding:".3rem .55rem",border:"none",cursor:"pointer",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                  background:(vistaKanban&&v==="kanban")||(!vistaKanban&&v==="lista")?"rgba(34,211,238,.2)":"transparent",
                  color:(vistaKanban&&v==="kanban")||(!vistaKanban&&v==="lista")?"var(--cyan)":"var(--text-muted)"}}>
                {ic}
              </button>
            ))}
          </div>
          <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={()=>abrirModal({tipo:"ck",fase:fase,tareasProyecto:tareasProyecto})}>+ Tarea</button>
        </div>
      </div>
      <div className="ftabs">
        {pf.map(f=>(
          <button key={f.f} className={cls("ftab",fase===f.f&&"fa",f.f===faseActiva&&"ftab-activa")} onClick={()=>setFase(f.f)}>
            <div style={{display:"flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.15rem"}}>
              <span style={{fontSize:"var(--fs-sm)",fontWeight:600}}>{f.f}</span>
              {f.f===faseActiva && (
                <span style={{fontFamily:"var(--font-mono)",fontSize:"0.5rem",fontWeight:700,
                  background:"var(--cyan-dim)",color:"var(--cyan)",
                  border:"1px solid rgba(34,211,238,0.3)",borderRadius:3,
                  padding:"0.05rem 0.3rem",lineHeight:1.2,flexShrink:0}}>AHORA</span>
              )}
            </div>
            <span className="fprog mono" style={{color:f.pct===100?"var(--green)":f.pct>50?"var(--cyan)":"var(--text-muted)"}}>{f.d}/{f.t}</span>
            <div className="fbar"><div className="ffill" style={{width:`${f.pct}%`,background:f.pct===100?"var(--green)":f.pct>50?"var(--cyan)":"var(--amber)"}}/></div>
          </button>
        ))}
      </div>

      {/* ── KANBAN: columnas por fase ── */}
      {vistaKanban ? (
        <div style={{overflowX:"auto",paddingBottom:".5rem"}}>
          <div style={{display:"flex",gap:".6rem",minWidth:"max-content"}}>
            {pf.filter(f=>f.t>0).map(f=>{
              const esActiva = f.f===faseActiva;
              const color = f.pct===100?"var(--green)":esActiva?"var(--cyan)":"var(--text-muted)";
              const items = ordenAlfa ? [...f.it].sort((a,b)=>(a.tarea||"").localeCompare(b.tarea||"","es")) : f.it;
              return(
                <div key={f.f} style={{width:220,flexShrink:0,background:"var(--surface)",border:`1px solid ${esActiva?"rgba(34,211,238,.3)":"var(--border)"}`,borderTop:`2px solid ${color}`,borderRadius:"var(--r)",overflow:"hidden"}}>
                  <div style={{padding:".6rem .75rem",background:"var(--surface2)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:"var(--fs-sm)",fontWeight:700,color}}>{f.f}</div>
                      {esActiva && <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-2xs)",color:"var(--cyan)",marginTop:".1rem"}}>● AHORA</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".15rem"}}>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color,fontWeight:700}}>{f.d}/{f.t}</span>
                      <div style={{width:40,height:3,background:"var(--surface3)",borderRadius:2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${f.pct}%`,background:color,borderRadius:2}}/>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:".35rem .4rem",display:"flex",flexDirection:"column",gap:".3rem"}}>
                    {items.map(item=>{
                      const ec = item.estado==="completado"?"var(--green)":item.estado==="bloqueado"?"var(--red)":"var(--amber)";
                      return(
                        <div key={item.id} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:`3px solid ${ec}`,borderRadius:7,padding:".5rem .6rem",cursor:"pointer",opacity:item.estado==="completado"?.55:1}}
                          onClick={()=>abrirFicha("ck",item)}>
                          <div style={{fontSize:"var(--fs-sm)",fontWeight:600,marginBottom:".2rem",textDecoration:item.estado==="completado"?"line-through":"none",color:item.estado==="completado"?"var(--text-muted)":"var(--text)"}}>{item.tarea}{item.proyectoTareaId && <span title="Vinculada a tarea de Planificación" style={{marginLeft:".35rem",fontSize:"var(--fs-xs)",color:"var(--green)",fontFamily:"var(--font-mono)",verticalAlign:"middle"}}>↗ Proyecto</span>}</div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>👤 {item.responsable}</span>
                            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".08rem .3rem",borderRadius:3,background:item.prioridad==="alta"?"var(--red-dim)":"var(--amber-dim)",color:item.prioridad==="alta"?"var(--red)":"var(--amber)"}}>{item.prioridad}</span>
                          </div>
                          <div style={{marginTop:".3rem"}} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>toggle(item.id)}
                              style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,border:`1px solid ${item.estado==="completado"?"rgba(248,113,113,.3)":"rgba(52,211,153,.3)"}`,background:item.estado==="completado"?"var(--red-dim)":"var(--green-dim)",color:item.estado==="completado"?"var(--red)":"var(--green)",cursor:"pointer"}}>
                              {item.estado==="completado"?"↩ Reabrir":"✓ Completar"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {items.length===0 && <div style={{padding:".75rem",textAlign:"center",fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-dim)"}}>—</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* ── LISTA: items de la fase seleccionada ── */}
          <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
            {(ordenAlfa?[...(fd?.it||[])].sort((a,b)=>(a.tarea||"").localeCompare(b.tarea||"","es")):fd?.it||[]).map(item=>(
              <div key={item.id} className={cls("cki",item.estado==="completado"&&"ckd",item.estado==="bloqueado"&&"ckb")} style={{cursor:"pointer"}} onClick={()=>abrirFicha("ck",item)}>
                <button className="ckbox" onClick={e=>{e.stopPropagation();toggle(item.id)}} style={{borderColor:item.estado==="completado"?"var(--green)":item.estado==="bloqueado"?"var(--red)":"var(--border)",background:item.estado==="completado"?"var(--green)":"transparent"}}>
                  {item.estado==="completado"&&<span style={{color:"#000",fontSize:"var(--fs-base)",fontWeight:800}}>✓</span>}
                  {item.estado==="bloqueado"&&<span style={{color:"var(--red)",fontSize:"var(--fs-base)"}}>!</span>}
                </button>
                <div style={{flex:1,minWidth:0}}>
                  <div className={cls("cktarea",item.estado==="completado"&&"ckdone")}>{item.tarea}</div>
                  <div className="ckmeta">👤 {item.responsable}{item.notas&&` · ${item.notas}`}</div>
                </div>
                <div className="fr g1" onClick={e=>e.stopPropagation()}>
                  <span className="badge" style={{background:item.prioridad==="alta"?"var(--red-dim)":"var(--amber-dim)",color:item.prioridad==="alta"?"var(--red)":"var(--amber)",fontSize:"var(--fs-xs)"}}>{item.prioridad}</span>
                  <select className="isml" value={item.estado} onChange={e=>upd(item.id,"estado",e.target.value)} style={{color:ESTADO_COLORES[item.estado],fontSize:"var(--fs-xs)",padding:"0.15rem 0.3rem"}}>
                    {ESTADO_TAREA.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ─── LOCALIZACIONES MAESTRAS ─────────────────────────────────────────────────
function TabLocalizaciones({ locs, setLocs, volsPorLoc = {} }) {
    const [modal, setModal] = useState(null); // null | {data: loc|null}
  const [del, setDel] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [form, setForm] = useState({ nombre: "", tipo: "otro", descripcion: "" });

  const locsF = filtroTipo === "todos" ? locs : locs.filter(l0 => l0.tipo === filtroTipo);

  const openNueva = () => { setForm({ nombre: "", tipo: "otro", descripcion: "" }); setModal({ data: null }); };
  const openEditar = (l) => { setForm({ nombre: l.nombre, tipo: l.tipo, descripcion: l.descripcion || "" }); setModal({ data: l }); };
  const save = () => {
    if (!form.nombre.trim()) return;
    if (modal.data) {
      setLocs(function(locsPrev){return locsPrev.map(function(locItm){return locItm.id===modal.data.id?{...locItm,...form}:locItm;});});
      toast.success("Localización actualizada");
    } else {
      setLocs(function(locsPrev){return [...locsPrev,{id:genIdNum(locsPrev),...form}];});
      toast.success("Localización creada");
    }
    setModal(null);
  };

  return (
    <>
      <div className="ph">
        <div><div className="pt">📍 Localizaciones Maestras</div><div className="pd">{locs.length} ubicaciones · Compartidas con Voluntarios · <span style={{cursor:"pointer",color:"var(--text-dim)"}} onClick={()=>window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"configuracion"}}))} title="Abrir Configuración">⚙️ Configuración</span></div></div>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          <select style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--r-sm)", padding: ".3rem .5rem" }}
            value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="todos">Todos los tipos</option>
            {TIPOS_LOC.map(t0 => <option key={t0} value={t0}>{LOC_ICONS[t0]} {t0}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openNueva}>+ Nueva</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: ".65rem" }}>
        {locsF.map(l => {
          const color = LOC_COLORS[l.tipo] || "var(--text-muted)";
          const icon  = LOC_ICONS[l.tipo]  || "📌";
          return (
            <div key={l.id} className="card" style={{ borderLeft: `3px solid ${color}`, cursor: "pointer" }} onClick={() => openEditar(l)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: ".4rem" }}>
                <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "var(--fs-lg)" }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>{l.nombre}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color, textTransform: "uppercase", letterSpacing: ".06em" }}>{l.tipo}</div>
                  </div>
                </div>
                <button className="btn btn-sm btn-red" onClick={e => { e.stopPropagation(); setDel(l.id); }}
                  style={{ flexShrink: 0, padding: ".15rem .4rem", fontSize: "var(--fs-sm)" }}>✕</button>
              </div>
              {l.descripcion && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", fontStyle: "italic", marginTop: ".2rem" }}>{l.descripcion}</div>}
              {(() => {
                const asig = volsPorLoc[l.id] || [];
                if (!asig.length) return (
                  <div style={{ marginTop: ".45rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                    color: "var(--text-dim)", borderTop: "1px solid var(--border)", paddingTop: ".4rem" }}>
                    👥 Sin voluntarios asignados
                  </div>
                );
                const conf = asig.filter(a0 => a0.vol.estado === "confirmado");
                const pend = asig.filter(a0 => a0.vol.estado === "pendiente");
                return (
                  <div style={{ marginTop: ".45rem", borderTop: "1px solid var(--border)", paddingTop: ".4rem" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)",
                      marginBottom: ".3rem", display: "flex", alignItems: "center", gap: ".4rem", flexWrap:"wrap" }}>
                      👥 <span style={{ fontWeight: 700 }}>{asig.length} voluntario{asig.length!==1?"s":""}</span>
                      {conf.length > 0 && <span style={{ color: "var(--green)", fontWeight: 700 }}>· {conf.length} ✓</span>}
                      {pend.length > 0 && <span style={{ color: "var(--amber)" }}>· {pend.length} pend.</span>}
                      <button
                        onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"voluntarios"}})); }}
                        style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", padding:".06rem .3rem",
                          borderRadius:3, border:"1px solid rgba(34,211,238,.3)",
                          background:"rgba(34,211,238,.1)", color:"var(--cyan)", cursor:"pointer",
                          marginLeft:"auto", flexShrink:0 }}>
                        Ver →
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: ".18rem" }}>
                      {asig.slice(0,4).map((a, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: ".4rem",
                          fontSize: "var(--fs-xs)", fontFamily: "var(--font-mono)" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                            background: a.vol.estado === "confirmado" ? "var(--green)" :
                              a.vol.estado === "pendiente" ? "var(--amber)" : "var(--text-dim)" }} />
                          <span style={{ color: "var(--text)", fontWeight: 600 }}>{a.vol.nombre}</span>
                          <span style={{ color: "var(--text-dim)", fontSize: "var(--fs-xs)" }}>— {a.puesto.nombre}</span>
                        </div>
                      ))}
                      {asig.length > 4 && (
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-dim)", fontFamily: "var(--font-mono)", paddingLeft: ".6rem" }}>
                          +{asig.length-4} más…
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
        {locsF.length === 0 && locs.length > 0 && (
          <div className="card" style={{ textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", padding: "2rem" }}>
            Sin localizaciones con ese filtro
          </div>
        )}
        {locs.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "var(--fs-lg)", marginBottom: ".5rem" }}>📍</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 700, marginBottom: ".4rem" }}>
              Sin localizaciones maestras
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-dim)", lineHeight: 1.6, marginBottom: ".75rem" }}>
              Las localizaciones definen dónde están los puestos de voluntarios
              y el material asignado. Puedes crearlas aquí o desde Configuración.
            </div>
            <button className="btn btn-ghost btn-sm"
              onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "configuracion" } }))}>
              ⚙️ Ir a Configuración
            </button>
          </div>
        )}
      </div>

      {/* Resumen por tipo */}
      <div className="card" style={{ marginTop: ".85rem" }}>
        <div className="ct" style={{ marginBottom: ".5rem" }}>📊 Resumen por tipo</div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          {TIPOS_LOC.map(t => {
            const n = locs.filter(l0 => l0.tipo === t).length;
            if (!n) return null;
            const color = LOC_COLORS[t] || "var(--text-muted)";
            return (
              <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", padding: ".2rem .6rem", borderRadius: 20,
                background: `${color}15`, color, border: `1px solid ${color}33`, cursor: "pointer" }}
                onClick={() => setFiltroTipo(filtroTipo === t ? "todos" : t)}>
                {LOC_ICONS[t]} {t} ({n})
              </span>
            );
          })}
        </div>
      </div>

      {/* Modal edición */}
      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div style={{ fontWeight: 700 }}>{modal.data ? "✏️ Editar localización" : "📍 Nueva localización"}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>Nombre *</span>
                <input className="inp" placeholder="ej. Avituallamiento KM 4" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>Tipo</span>
                <select className="inp" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS_LOC.map(t0 => <option key={t0} value={t0}>{LOC_ICONS[t0]} {t0}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>Descripción</span>
                <textarea className="inp" rows={2} placeholder="Descripción opcional" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>{modal.data ? "Guardar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {del && (
        <div className="modal-backdrop" style={{ zIndex: 200 }} onClick={e => e.target === e.currentTarget && setDel(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 320, textAlign: "center" }}>
            <div className="modal-body" style={{ paddingTop: "1.5rem" }}>
              <div style={{ fontSize: "var(--fs-xl)", marginBottom: ".5rem" }}>⚠️</div>
              <div style={{ fontWeight: 700 }}>¿Eliminar localización?</div>
              <div className="mono xs muted">Los puestos de voluntarios que la referenciaban quedarán sin localización maestra.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDel(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={() => { setLocs(function(locsPrev){return locsPrev.filter(function(locItm){return locItm.id!==del;});}); setDel(null); }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── FICHA LOGÍSTICA ──────────────────────────────────────────────────────────
function FichaLogistica({ ficha, material, veh, onClose, onEditar, onEliminar }) {
  const { tipo, data } = ficha;
  const accents = { tl:"var(--amber)", ck:"var(--green)", mat:"var(--cyan)", veh:"var(--violet)", ruta:"var(--amber)", cont:"var(--cyan)", asig:"var(--cyan)", inc:"var(--red)" };
  const icons   = { tl:"⏱️", ck:"✅", mat:"📦", veh:"🚐", ruta:"🗺️", cont:"📞", asig:"📍", inc:"⚠️" };
  const accent  = accents[tipo] || "var(--cyan)";
  const titulo  = data.titulo || data.tarea || data.nombre || data.descripcion || "—";

  const Row = ({label, value, color}) => !value ? null : (
    <div style={{display:"flex",justifyContent:"space-between",padding:".4rem 0",borderBottom:"1px solid rgba(30,45,80,.3)"}}>
      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",flexShrink:0,marginRight:"1rem"}}>{label}</span>
      <span style={{fontSize:"var(--fs-base)",fontWeight:600,textAlign:"right",color:color||"var(--text)"}}>{value}</span>
    </div>
  );

  const matNombre = tipo==="asig" ? (material.find(m=>m.id===data.materialId)?.nombre || data.materialNombre) : null;
  const vehNombre = tipo==="ruta" ? (veh.find(v=>v.id===data.vehiculoId)?.nombre || "—") : null;

  return (
    <>
      <style>{``}</style>
      <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="modal modal-ficha">
          <div style={{borderTop:`3px solid ${accent}`,borderRadius:"16px 16px 0 0"}}>
            <div style={{padding:"1.1rem 1.4rem .9rem",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
                <span style={{fontSize:"var(--fs-lg)"}}>{icons[tipo]}</span>
                <div>
                  <div style={{fontWeight:800,fontSize:"var(--fs-md)",lineHeight:1.2}}>{titulo}</div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".1rem",textTransform:"uppercase"}}>
                    {tipo==="tl"?"Entrada Runbook":tipo==="ck"?"Pre-operativo":tipo==="mat"?"Material":tipo==="veh"?"Vehículo":tipo==="ruta"?"Ruta":tipo==="cont"?"Contacto":tipo==="asig"?"Asignación":"Incidencia"}
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost" style={{padding:".2rem .5rem"}} onClick={onClose} aria-label="Cerrar">✕</button>
            </div>
          </div>
          <div style={{padding:"1.1rem 1.4rem",display:"flex",flexDirection:"column",gap:".4rem"}}>
            {tipo==="tl" && (<>
              <Row label="Hora"        value={data.hora} color={accent} />
              <Row label="Estado"      value={data.estado} color={ESTADO_COLORES[data.estado]} />
              <Row label="Categoría"   value={`${TLI[data.categoria]} ${data.categoria}`} />
              <Row label="Responsable" value={data.responsable} />
              {data.descripcion && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:`2px solid ${accent}`,marginTop:".25rem"}}><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Descripción</div><div style={{fontSize:"var(--fs-base)",lineHeight:1.5}}>{data.descripcion}</div></div>}
            </>)}
            {tipo==="ck" && (<>
              <Row label="Fase"        value={data.fase} />
              <Row label="Estado"      value={data.estado} color={ESTADO_COLORES[data.estado]} />
              <Row label="Prioridad"   value={data.prioridad} color={data.prioridad==="alta"?"var(--red)":data.prioridad==="media"?"var(--amber)":"var(--green)"} />
              <Row label="Responsable" value={data.responsable} />
              {data.notas && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:`2px solid ${accent}`,marginTop:".25rem"}}><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div><div style={{fontSize:"var(--fs-base)",lineHeight:1.5}}>{data.notas}</div></div>}
            </>)}
            {tipo==="mat" && (<>
              <Row label="Categoría"   value={`${CAT_ICONS[data.categoria]} ${data.categoria}`} />
              <Row label="Stock total" value={`${data.stock} ${data.unidad}`} />
              <Row label="Asignado"    value={`${data.asig||0} ${data.unidad}`} />
              {(data.def||0)>0 && <Row label="⚠️ Déficit" value={`-${data.def} ${data.unidad}`} color="var(--red)" />}
            </>)}
            {tipo==="asig" && (<>
              <Row label="Material"    value={matNombre} />
              <Row label="Puesto"      value={data.puesto} />
              <Row label="Cantidad"    value={`${data.cantidad} ${data.unidad||""}`} />
              <Row label="Estado"      value={data.estado} color={ESTADO_COLORES[data.estado]} />
            </>)}
            {tipo==="veh" && (<>
              <Row label="Matrícula"   value={data.matricula} />
              <Row label="Conductor"   value={data.conductor} />
              <Row label="Capacidad"   value={data.capacidad} />
              <Row label="Teléfono"    value={data.telefono} />
              {data.notas && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:`2px solid ${accent}`}}><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div><div style={{fontSize:"var(--fs-base)",lineHeight:1.5}}>{data.notas}</div></div>}
            </>)}
            {tipo==="ruta" && (<>
              <Row label="Vehículo"    value={vehNombre} />
              <Row label="Hora inicio" value={data.horaInicio} />
              <Row label="Paradas"     value={`${(data.paradas||[]).length} paradas`} />
              {(data.paradas||[]).length>0 && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",marginTop:".25rem"}}>{(data.paradas||[]).map((p,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:".25rem 0",borderBottom:i<data.paradas.length-1?"1px solid rgba(30,45,80,.2)":"none",fontSize:"var(--fs-sm)"}}><span style={{fontWeight:600}}>{p.puesto}</span><span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--cyan)"}}>{p.hora}</span></div>)}</div>}
            </>)}
            {tipo==="cont" && (<>
              <Row label="Rol"         value={data.rol} />
              <Row label="Tipo"        value={`${({"emergencia":"🚨","proveedor":"🏭","staff":"👤","institucional":"🏛️"})[data.tipo]||""} ${data.tipo}`} />
              <Row label="Teléfono"    value={data.telefono} color="var(--cyan)" />
              <Row label="Email"       value={data.email} />
              {data.notas && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:`2px solid ${accent}`}}><div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div><div style={{fontSize:"var(--fs-base)",lineHeight:1.5}}>{data.notas}</div></div>}
            </>)}
            {tipo==="inc" && (<>
              <Row label="Hora"        value={data.hora} />
              <Row label="Tipo"        value={data.tipo} />
              <Row label="Gravedad"    value={data.gravedad} color={data.gravedad==="alta"?"var(--red)":data.gravedad==="media"?"var(--amber)":"var(--green)"} />
              <Row label="Estado"      value={data.estado} color={data.estado==="resuelta"?"var(--green)":"var(--amber)"} />
              <Row label="Responsable" value={data.responsable} />
              {data.resolucion && <Row label="Resolución" value={data.resolucion} color="var(--green)" />}
              {/* Protocolo de escalado automático según gravedad */}
              {data.gravedad && data.estado !== "resuelta" && (
                <div style={{marginTop:".5rem",padding:".6rem .75rem",borderRadius:8,
                  background:data.gravedad==="alta"?"var(--red-dim)":data.gravedad==="media"?"var(--amber-dim)":"var(--green-dim)",
                  border:`1px solid ${data.gravedad==="alta"?"rgba(248,113,113,0.25)":data.gravedad==="media"?"rgba(251,191,36,0.25)":"rgba(52,211,153,0.25)"}`}}>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                    color:data.gravedad==="alta"?"var(--red)":data.gravedad==="media"?"var(--amber)":"var(--green)",
                    marginBottom:".35rem",textTransform:"uppercase",letterSpacing:".06em"}}>
                    {data.gravedad==="alta"?"🔴 Protocolo ALTA — acción inmediata":
                     data.gravedad==="media"?"🟡 Protocolo MEDIA — monitorizar":
                     "🟢 Protocolo BAJA — registrar y gestionar"}
                  </div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--text-muted)",lineHeight:1.6}}>
                    {data.gravedad==="alta" && "1. Notificar Dirección de carrera inmediatamente · 2. Contactar Cruz Roja / 112 si hay riesgo vital · 3. No mover al afectado sin personal sanitario · 4. Mantener línea abierta por walkie hasta resolución"}
                    {data.gravedad==="media" && "1. Informar a Coordinación en próxima comunicación · 2. Evaluar si requiere apoyo de otro puesto · 3. Registrar evolución cada 15 min · 4. Escalar a ALTA si empeora"}
                    {data.gravedad==="baja" && "1. Gestionar en el propio puesto · 2. Registrar para informe post-carrera · 3. Informar a Coordinación al finalizar la jornada"}
                  </div>
                </div>
              )}
            </>)}
          </div>
          <div style={{padding:".9rem 1.4rem",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:".5rem"}}>
            <button className="btn btn-red" onClick={()=>onEliminar(tipo==="mat"?"material":tipo==="asig"?"asig":tipo==="veh"?"veh":tipo==="ruta"?"ruta":tipo==="cont"?"cont":tipo==="inc"?"inc":tipo==="tl"?"tl":"ck", data.id)}>🗑 Eliminar</button>
            <div style={{display:"flex",gap:".4rem"}}>
              <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
              <button className="btn btn-cyan" onClick={()=>onEditar(tipo,data)}>✏️ Editar</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


function ModalRouter({modal,onClose,material,setMaterial,asigs,setAsigs,veh,setVeh,rutas,setRutas,tl,setTl,cont,setCont,inc,setInc,ck,setCk,locs,tiposContacto=[],conceptosPres=[]}) {
  useEffect(() => {
    const t = setTimeout(() => {
      const firstField = document.querySelector(".modal-backdrop .modal-body input, .modal-backdrop .modal-body select, .modal-backdrop .modal-body textarea");
      if (firstField) firstField.focus();
    }, 80);
    return () => clearTimeout(t);
  }, []);
  const {tipo,data}=modal;
  const locNames = locs && locs.length > 0 ? locs.map(function(locItem){return locItem.nombre;}) : PUESTOS_REF;
  const TIPO_LABELS = { material:"Material", asig:"Asignación", veh:"Vehículo", ruta:"Ruta", tl:"Entrada de runbook", cont:"Contacto", inc:"Incidencia", ck:"Tarea pre-operativa" };
  const sv=(stFn,stArr,stItem,tipo="elemento")=>{ const esNuevo=!stItem.id; if(esNuevo) stFn(prev=>[...prev,{...stItem,id:genIdNum(stArr)}]); else stFn(prev=>prev.map(x=>x.id===stItem.id?stItem:x)); onClose(); toast.success(esNuevo?`${TIPO_LABELS[tipo]||tipo} creado`:`${TIPO_LABELS[tipo]||tipo} actualizado`); };

  if(tipo==="mat") {
    const matConceptos = modal.matConceptosres || [];
    const camposConcepto = matConceptos.length > 0 ? [{
      k:"presupuestoConceptoId", l:"Concepto del presupuesto (opcional)",
      t:"sel",
      o:[null,...matConceptos.map(c=>c.id)],
      lb:["— Sin vínculo",...matConceptos.map(c=>`[${c.tipo==="variable"?"var":"fijo"}] ${c.nombre}`)],
      num:true, nullable:true,
    }] : [];
    return <MF title={data?"✏️ Editar material":"📦 Nuevo material"} onClose={onClose}
      fields={[
        {k:"nombre",l:"Nombre *",t:"text"},
        {k:"categoria",l:"Categoría",t:"sel",o:CATS_MATERIAL},
        {k:"stock",l:"Stock total (unidades en almacén)",t:"num"},
        {k:"stockMinimo",l:"Stock mínimo (alerta)",t:"num"},
        {k:"unidad",l:"Unidad (ud/kg/rollos...)",t:"text"},
        ...camposConcepto,
      ]}
      init={data||{nombre:"",categoria:"Avituallamiento",stock:0,stockMinimo:0,unidad:"ud",presupuestoConceptoId:null}}
      onSave={v=>sv(setMaterial,material,{...v,presupuestoConceptoId:v.presupuestoConceptoId?parseInt(v.presupuestoConceptoId):null},"material")} />;
  }

  if(tipo==="asig") return <MF title={data?"✏️ Editar asignación":"📍 Nueva asignación"} onClose={onClose}
    fields={[{k:"materialId",l:"Material",t:"sel",o:material.map(m=>m.id),lb:material.map(m=>m.nombre),num:true},{k:"puesto",l:"Puesto destino",t:"sel",o:locNames},{k:"cantidad",l:"Cantidad",t:"num"},{k:"estado",l:"Estado entrega",t:"sel",o:ESTADO_ENTREGA}]}
    init={data||{materialId:material[0]?.id||1,puesto:locNames[0],cantidad:1,estado:"pendiente"}}
    onSave={v=>sv(setAsigs,asigs,{...v,materialId:parseInt(v.materialId)},"asig")} />;

  if(tipo==="veh") return <MF title={data?"✏️ Editar vehículo":"🚗 Nuevo vehículo"} onClose={onClose}
    fields={[{k:"nombre",l:"Nombre *",t:"text"},{k:"matricula",l:"Matrícula",t:"text"},{k:"conductor",l:"Conductor",t:"text"},{k:"capacidad",l:"Capacidad",t:"text"},{k:"telefono",l:"Teléfono",t:"text"},{k:"notas",l:"Notas",t:"text"}]}
    init={data||{nombre:"",matricula:"",conductor:"",capacidad:"",telefono:"",notas:""}}
    onSave={v=>sv(setVeh,veh,v,"veh")} />;

  if(tipo==="ruta") return <ModalRuta data={data} veh={veh} rutas={rutas} setRutas={setRutas} onClose={onClose} locs={locs} />;

  if(tipo==="tl") return <MF title={data?"✏️ Editar entrada":"⏱️ Nueva entrada del Runbook"} onClose={onClose}
    fields={[{k:"hora",l:"Hora",t:"time"},{k:"titulo",l:"Título *",t:"text"},{k:"descripcion",l:"Descripción",t:"text"},{k:"responsable",l:"Responsable",t:"text"},{k:"categoria",l:"Categoría",t:"sel",o:["logistica","organizacion","voluntarios","carrera","comunicacion"]},{k:"estado",l:"Estado",t:"sel",o:ESTADO_TAREA}]}
    init={data||{hora:"08:00",titulo:"",descripcion:"",responsable:"",categoria:"organizacion",estado:"pendiente"}}
    onSave={v=>sv(setTl,tl,v,"tl")} />;

  if(tipo==="cont") {
    const TIPOS_BASE_IDS = ["emergencia","proveedor","staff","institucional","medico","media"];
    const tiposBase = [
      {id:"emergencia",nombre:"Emergencia"},{id:"proveedor",nombre:"Proveedor"},
      {id:"staff",nombre:"Staff"},{id:"institucional",nombre:"Institucional"},
      {id:"medico",nombre:"Médico"},{id:"media",nombre:"Media/Prensa"},
    ];
    const tiposMerge = [...tiposBase, ...(tiposContacto||[])];
    return <MF title={data?"✏️ Editar contacto":"📞 Nuevo contacto"} onClose={onClose}
      fields={[
        {k:"nombre",l:"Nombre *",t:"text"},
        {k:"rol",l:"Rol / Cargo",t:"text"},
        {k:"telefono",l:"Teléfono *",t:"text"},
        {k:"email",l:"Email",t:"text"},
        {k:"web",l:"Web",t:"text"},
        {k:"tipo",l:"Tipo",t:"sel",o:tiposMerge.map(t=>t.id),lb:tiposMerge.map(t=>t.nombre)},
        {k:"notas",l:"Notas",t:"text"},
      ]}
      init={data||{nombre:"",rol:"",telefono:"",email:"",web:"",tipo:"staff",notas:""}}
      onSave={v=>sv(setCont,cont,v,"cont")} />;
  }

  if(tipo==="inc") return <MF title={data?"✏️ Editar incidencia":"⚠️ Registrar incidencia"} onClose={onClose}
    fields={[{k:"hora",l:"Hora",t:"time"},{k:"tipo",l:"Tipo",t:"sel",o:["médica","señalización","avituallamiento","corredor perdido","meteorológica","otra"]},{k:"gravedad",l:"Gravedad",t:"sel",o:["baja","media","alta"]},{k:"descripcion",l:"Descripción *",t:"text"},{k:"responsable",l:"Responsable",t:"text"},{k:"estado",l:"Estado",t:"sel",o:["abierta","resuelta"]},{k:"resolucion",l:"Resolución",t:"text"}]}
    init={data||{hora:new Date().toTimeString().slice(0,5),tipo:"médica",gravedad:"media",descripcion:"",responsable:"",estado:"abierta",resolucion:""}}
    onSave={v=>sv(setInc,inc,v,"inc")} />;

  if(tipo==="ck") {
    const tareasProy = Array.isArray(modal.tareasProyecto) ? modal.tareasProyecto : [];
    const camposVinculo = tareasProy.length > 0 ? [{
      k:"proyectoTareaId", l:"Vincular tarea de Proyecto (opcional)",
      t:"sel",
      o:[null,...tareasProy.map(t=>t.id)],
      lb:["— Sin vínculo",...tareasProy.map(t=>`[${t.area||""}] ${(t.titulo||"").slice(0,40)}`)],
      num:true, nullable:true
    }] : [];
    return <MF title={data?"✏️ Editar ítem":"✅ Nuevo ítem pre-operativo"} onClose={onClose}
      fields={[
        {k:"tarea",l:"Tarea *",t:"text"},
        {k:"fase",l:"Fase",t:"sel",o:FASES_CHECKLIST},
        {k:"responsable",l:"Responsable",t:"text"},
        {k:"prioridad",l:"Prioridad",t:"sel",o:["alta","media","baja"]},
        {k:"estado",l:"Estado",t:"sel",o:ESTADO_TAREA},
        ...camposVinculo,
        {k:"notas",l:"Notas",t:"text"},
      ]}
      init={data||{tarea:"",fase:modal.fase||"Semana antes",responsable:"",prioridad:"media",estado:"pendiente",proyectoTareaId:null,notas:""}}
      onSave={v=>sv(setCk,ck,{...v,proyectoTareaId:v.proyectoTareaId?parseInt(v.proyectoTareaId):null},"ck")} />;
  }

  return null;
}

function MF({title,fields,init,onSave,onClose}) {
  const { closing: mfClosing, handleClose: mfHandleClose } = useModalClose(onClose);
  const [form,setForm]=useState({...init});
  const [errs,setErrs]=useState({});
  function upd(fldKey,fldVal){ setForm(function(fPrev){return {...fPrev,[fldKey]:fldVal};}); if(errs[fldKey]) setErrs(function(ePrev){return {...ePrev,[fldKey]:null};}); }

  const validar=()=>{
    const mfErrs={};
    fields.forEach(function(mfFld){
      if(!mfFld.l.includes("*")) return;
      const mfVal=form[mfFld.k];
      if(mfFld.t==="num"){ if(!mfVal && mfVal!==0) mfErrs[mfFld.k]="Requerido"; }
      else if(!mfVal || (typeof mfVal==="string" && !mfVal.trim())) mfErrs[mfFld.k]="Requerido";
    });
    setErrs(mfErrs);
    return Object.keys(mfErrs).length===0;
  };

  // sin scroll-lock — causa freeze en Android
  useEffect(() => {
    const m = document.querySelector("main");
    if (m) m.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return(
    <div className={`modal-backdrop${mfClosing ? " modal-backdrop-closing" : ""}`} onClick={e=>e.target===e.currentTarget&&mfHandleClose()}>
      <div className={`modal modal-ficha${mfClosing ? " modal-closing" : ""}`}>
        <div className="modal-header"><span className="mtit">{title}</span><button className="btn btn-sm btn-ghost" aria-label="Cerrar formulario" onClick={mfHandleClose}><span aria-hidden="true">✕</span></button></div>
        <div className="modal-body">
          {fields.map(f=>(
            <div key={f.k}>
              <label className="fl" style={errs[f.k]?{color:"var(--red)"}:{}}>{f.l}</label>
              {f.t==="sel"?(
                <select className="inp" value={form[f.k]} onChange={e=>upd(f.k,f.num?parseInt(e.target.value):e.target.value)}
                  style={errs[f.k]?{borderColor:"var(--red)"}:{}}>
                  {(f.o||[]).map((o,i)=><option key={o} value={o}>{f.lb?.[i]||o}</option>)}
                </select>
              ):(
                <input className="inp" type={f.t==="num"?"number":f.t||"text"} value={form[f.k]||""}
                  onChange={e=>upd(f.k,f.t==="num"?parseFloat(e.target.value)||0:e.target.value)}
                  placeholder={f.l.replace(" *","")}
                  style={errs[f.k]?{borderColor:"var(--red)"}:{}} />
              )}
              {errs[f.k] && <div className="xs mono" style={{color:"var(--red)",marginTop:".2rem"}}>⚠ {errs[f.k]}</div>}
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={mfHandleClose}>Cancelar</button>
          <button className="btn btn-cyan" onClick={()=>{ if(validar()) onSave(form); }}>
            {init?.id?"💾 Guardar":"➕ Añadir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalRuta({data,veh,rutas,setRutas,onClose,locs}) {
  const locNames = locs && locs.length > 0 ? locs.map(function(locItem){return locItem.nombre;}) : PUESTOS_REF;
  const [form,setForm]=useState(() => {
    const base = data || {nombre:"",vehiculoId:veh[0]?.id||1,horaInicio:"05:00",paradas:[]};
    return { ...base, paradas: Array.isArray(base.paradas) ? base.paradas : [] };
  });
  const { closing: rutaClosing, handleClose: rutaHandleClose } = useModalClose(onClose);
  const [formErr,setFormErr]=useState(false);
  function upd(kUpd,vUpd){setForm(function(rpUpd2){return {...rpUpd2,[kUpd]:vUpd};});}
  function addP(){setForm(function(rpAdd){return {...rpAdd,paradas:[...rpAdd.paradas,{puesto:locNames[0],hora:"06:00",material:""}]};});}
  function updP(iIdx,kKey,vVal){setForm(function(rpUpd){return {...rpUpd,paradas:rpUpd.paradas.map(function(xx,jj){return jj===iIdx?{...xx,[kKey]:vVal}:xx;})};});}
  function delP(iDel){setForm(function(rpDel){return {...rpDel,paradas:rpDel.paradas.filter(function(_,jj){return jj!==iDel;})};});}
  const save=()=>{
    if(!form.nombre){ setFormErr(true); return; }
    const rutaItem={...form,vehiculoId:parseInt(form.vehiculoId)};
    if(rutaItem.id) {
      setRutas(function(rsPrev){return rsPrev.map(function(rsItm){return rsItm.id===rutaItem.id?rutaItem:rsItm;});});
      toast.success("Ruta actualizada");
    }
    else {
      setRutas(function(rsPrev){return [...rsPrev,{...rutaItem,id:genIdNum(rutas)}];});
      toast.success("Ruta creada");
    }
    onClose();
  };
  // sin scroll-lock — causa freeze en Android
  return(
    <div className={`modal-backdrop${rutaClosing ? " modal-backdrop-closing" : ""}`} onClick={e=>e.target===e.currentTarget&&rutaHandleClose()}>
      <div className={`modal modal-ficha${rutaClosing ? " modal-closing" : ""}`} style={{maxWidth:560}}>
        <div className="modal-header"><span className="mtit">{data?"✏️ Editar ruta":"🗺️ Nueva ruta"}</span><button className="btn btn-sm btn-ghost" onClick={rutaHandleClose}><span aria-hidden="true">✕</span></button></div>
        <div className="modal-body">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
            <div>
              <label className="fl" style={{color:!form.nombre&&formErr?"var(--red)":undefined}}>Nombre *</label>
              <input className="inp" autoFocus value={form.nombre} onChange={e=>{upd("nombre",e.target.value);setFormErr(false);}}
                placeholder="Nombre de la ruta"
                style={{borderColor:!form.nombre&&formErr?"var(--red)":undefined}}/>
              {!form.nombre&&formErr&&<div className="xs mono" style={{color:"var(--red)",marginTop:".2rem"}}>⚠ El nombre es obligatorio</div>}
            </div>
            <div><label className="fl">Hora de salida</label><input className="inp" type="time" value={form.horaInicio} onChange={e=>upd("horaInicio",e.target.value)}/></div>
          </div>
          <div><label className="fl">Vehículo</label>
            <select className="inp" value={form.vehiculoId} onChange={e=>upd("vehiculoId",parseInt(e.target.value))}>
              {veh.map(v=><option key={v.id} value={v.id}>{v.nombre} — {v.conductor}</option>)}
            </select>
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.4rem"}}>
              <label className="fl" style={{margin:0}}>Paradas ({form.paradas.length})</label>
              <button className="btn btn-cyan" style={{fontSize:"var(--fs-sm)",padding:"0.2rem 0.6rem"}} onClick={addP}>+ Parada</button>
            </div>
            {Array.isArray(form.paradas) && form.paradas.map((p,i)=>(
              <div key={i} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"0.6rem",marginBottom:"0.4rem"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"0.4rem",marginBottom:"0.3rem",alignItems:"start"}}>
                  <select className="inp isml" style={{width:"100%",fontSize:"var(--fs-base)"}} value={p.puesto} onChange={e=>updP(i,"puesto",e.target.value)}>
                    {PUESTOS_REF.map(pr=><option key={pr} value={pr}>{pr}</option>)}
                  </select>
                  <div style={{display:"flex",gap:"0.3rem",alignItems:"center"}}>
                    <input className="inp isml" type="time" value={p.hora} onChange={e=>updP(i,"hora",e.target.value)} style={{width:80}}/>
                    <button className="btn btn-sm btn-red" onClick={()=>delP(i)} aria-label="Cerrar">✕</button>
                  </div>
                </div>
                <input className="inp isml" value={p.material} onChange={e=>updP(i,"material",e.target.value)} placeholder="Material a entregar..." style={{width:"100%",fontSize:"var(--fs-sm)"}}/>
              </div>
            ))}
            {form.paradas.length===0&&<div className="empty" style={{padding:"0.75rem"}}>Sin paradas — pulsa + Parada</div>}
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-cyan" onClick={save}>{data?"💾 Guardar":"➕ Crear ruta"}</button></div>
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:'Syne',sans-serif;min-height:100vh;
    background-image:radial-gradient(ellipse 80% 40% at 50% -5%,var(--cyan-dim) 0%,transparent 55%)}
  .layout{display:flex;min-height:100vh}
  .sidebar{width:200px;min-height:100vh;height:100vh;position:sticky;top:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;z-index:10}
  .sidebar-logo{padding:1.2rem 1rem;border-bottom:1px solid var(--border)}
  .logo-eyebrow{font-family:var(--font-mono);font-size:0.5rem;color:var(--cyan);letter-spacing:0.15em;text-transform:uppercase;margin-bottom:0.3rem;opacity:.8}
  .logo-title{font-size:1.4rem;font-weight:800;background:linear-gradient(135deg,#fff 0%,var(--cyan) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1}
  .logo-sub{font-family:var(--font-mono);font-size:0.58rem;color:var(--text-muted);margin-top:.25rem}
  .sidebar-nav{flex:1;padding:.5rem .4rem;display:flex;flex-direction:column;gap:.1rem;overflow-y:auto}
  .nav-item{display:flex;align-items:center;gap:.5rem;padding:.5rem .6rem;border-radius:var(--r-sm);border:1px solid transparent;cursor:pointer;background:none;color:var(--text-muted);font-family:'Syne',sans-serif;font-size:.76rem;font-weight:600;text-align:left;width:100%;transition:all .15s;position:relative}
  .nav-item::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:0 2px 2px 0;background:transparent;transition:background .15s}
  .nav-item:hover{color:var(--text);background:var(--surface2)}
  .nav-item.active{color:var(--text);background:var(--surface2);border-color:var(--border-light)}
  .nav-item.active::before{background:var(--cyan)}
  .nav-icon{font-size:.85rem;width:18px;text-align:center;flex-shrink:0}
  .nbadge{margin-left:auto;font-size:.52rem;font-family:var(--font-mono);padding:.1rem .3rem;border-radius:3px;font-weight:700}
  .nbg{background:var(--green-dim);color:var(--green)} .nbd{background:var(--red-dim);color:var(--red)}
  .sf{padding:.75rem;border-top:1px solid var(--border)}
  .bsave{width:100%;padding:.5rem;background:var(--green-dim);color:var(--green);border:1px solid rgba(52,211,153,.25);border-radius:var(--r-sm);font-family:var(--font-mono);font-size:.68rem;font-weight:700;cursor:pointer;transition:all .15s}
  .bsave:hover{background:rgba(52,211,153,.2)} .bsave.saved{background:rgba(52,211,153,.2)}
  .main{flex:1;min-width:0;padding:1.5rem 1.25rem 4rem;overflow-x:hidden}
  .tc{animation:fu .2s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .ph{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap}
  .pt{font-size:1.5rem;font-weight:900;letter-spacing:-0.02em} .pd{font-family:var(--font-mono);font-size:.62rem;color:var(--text-muted);margin-top:.25rem}
  .twocol{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-bottom:.85rem}
  @media(max-width:800px){.twocol{grid-template-columns:1fr}}
  .card:hover{border-color:var(--border-light)} .card.p0{padding:0}
  .ct{font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.85rem;color:var(--text-muted)}
  .tbl{width:100%;border-collapse:collapse;font-size:.76rem}
  .tbl th{text-align:left;padding:.5rem .6rem;font-size:.58rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);background:var(--surface2);border-bottom:1px solid var(--border);white-space:nowrap}
  .tbl td{padding:.5rem .6rem;border-bottom:1px solid rgba(30,45,80,.35);vertical-align:middle}
  .tbl tr:last-child td{border-bottom:none} .tbl tr:hover td{background:rgba(34,211,238,.02)}
  .tbl .ra td{background:rgba(248,113,113,.04)}
  .inp:focus{border-color:var(--cyan);box-shadow:0 0 0 2px rgba(34,211,238,.08)}
  .isml{background:var(--surface2);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:var(--font-mono);font-size:.68rem;padding:.22rem .4rem;outline:none;cursor:pointer}
  .btn:hover{transform:translateY(-1px)}
  .btn.cyan{background:var(--cyan-dim);color:var(--cyan);border:1px solid rgba(34,211,238,.25)} .btn.cyan:hover{background:rgba(34,211,238,.18)}
  .btn.amber{background:var(--amber-dim);color:var(--amber);border:1px solid rgba(251,191,36,.2)} .btn.amber:hover{background:rgba(251,191,36,.18)}
  .btn.red{background:var(--red-dim);color:var(--red);border:1px solid rgba(248,113,113,.2)}
  .btn.ghost{background:transparent;color:var(--text-muted);border:1px solid var(--border)} .btn.ghost:hover{color:var(--text);border-color:var(--border-light)}
  .btn.xs{padding:.2rem .4rem;font-size:.65rem}
  .mt1{margin-top:.5rem} .mb1{margin-bottom:.75rem}
  .pbar{height:4px;background:var(--surface3);border-radius:2px;overflow:hidden}
  .pfill{height:100%;border-radius:2px;transition:width .5s cubic-bezier(.4,0,.2,1)}
  .ox{overflow-x:auto} .fr{display:flex;align-items:center;flex-wrap:wrap} .fb{display:flex;align-items:center;justify-content:space-between}
  .g1{gap:.5rem} .f6{font-weight:600} .tr{text-align:right} .mono{font-family:var(--font-mono)} .muted{color:var(--text-muted)} .xs{font-size:.62rem}
  .sl{font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--text-dim);margin-bottom:.5rem;font-family:var(--font-mono)}
  .chips{display:flex;gap:.35rem;flex-wrap:wrap;margin-bottom:.85rem}
  .chip{padding:.28rem .7rem;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text-muted);font-family:var(--font-mono);font-size:.62rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .15s;min-height:28px;display:inline-flex;align-items:center;gap:.3rem}
  .chip:hover{border-color:var(--border-light);color:var(--text)}
  .chip.ca{border-color:rgba(34,211,238,.45);color:var(--cyan);background:rgba(34,211,238,.1);box-shadow:0 0 10px rgba(34,211,238,.1)}
  .pbadge{background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:.12rem .4rem;font-family:var(--font-mono);font-size:.6rem;color:var(--text-muted)}
  .vcard{padding:.85rem;margin-bottom:.5rem} .vh{display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem}
  .vi{font-size:1.5rem;flex-shrink:0} .vn{font-weight:700;font-size:.88rem} .vm{font-size:.62rem;color:var(--text-muted)}
  .vmeta{display:flex;flex-wrap:wrap;gap:.75rem;font-family:var(--font-mono);font-size:.62rem;color:var(--text-muted);margin-bottom:.3rem}
  .vnota{font-size:.7rem;color:var(--text-muted);font-style:italic;margin-top:.25rem}
  .rcard{padding:.85rem;margin-bottom:.5rem} .rh{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:.6rem}
  .rn{font-weight:700;font-size:.88rem;margin-bottom:.15rem} .rm{font-family:var(--font-mono);font-size:.62rem;color:var(--text-muted)}
  .plist{padding-left:.25rem} .prow{display:flex;gap:.6rem;margin-bottom:.1rem}
  .pcon{display:flex;flex-direction:column;align-items:center;padding-top:.2rem}
  .pdot{width:8px;height:8px;border-radius:50%;background:var(--cyan);border:2px solid var(--surface);flex-shrink:0}
  .pline{width:2px;flex:1;background:var(--border);min-height:16px;margin:2px 0}
  .pcont{flex:1;padding-bottom:.4rem}
  .ptop{display:flex;justify-content:space-between;align-items:center;margin-bottom:.15rem}
  .pnom{font-size:.75rem;font-weight:600} .phora{font-family:var(--font-mono);font-size:.62rem;color:var(--cyan)}
  .pmat{font-family:var(--font-mono);font-size:.6rem;color:var(--text-muted)}
  .tlcon{display:flex;flex-direction:column}
  .tlrow{display:flex;gap:0;margin-bottom:0}
  .tlleft{display:flex;flex-direction:column;align-items:center;width:70px;flex-shrink:0}
  .tltime{font-family:var(--font-mono);font-size:.72rem;color:var(--cyan);font-weight:700;padding-top:.85rem;text-align:center}
  .tlconn{display:flex;flex-direction:column;align-items:center;flex:1;padding-top:.75rem}
  .tlnode{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;flex-shrink:0}
  .tledge{width:2px;flex:1;background:var(--border);min-height:16px;margin:4px 0}
  .tlcard{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:.75rem 1rem;margin:.35rem 0 .35rem .5rem;transition:all .15s}
  .tlcard:hover{border-color:var(--border-light)}
  .tlrow.tldone .tlcard{opacity:.55} .tlrow.tlblk .tlcard{border-color:rgba(248,113,113,.3);background:rgba(248,113,113,.03)}
  .tlch{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.3rem;flex-wrap:wrap}
  .tlct{font-size:.82rem;font-weight:700} .tlcd{font-family:var(--font-mono);font-size:.62rem;color:var(--text-muted);margin-bottom:.4rem;line-height:1.5}
  .tlcf{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
  .tlchip{font-family:var(--font-mono);font-size:.58rem;padding:.1rem .4rem;border-radius:4px;border:1px solid;font-weight:700}
  .tlresp{font-family:var(--font-mono);font-size:.62rem;color:var(--text-muted)}
  .cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:.65rem}
  .ccard{background:var(--surface);border:1px solid var(--border);border-top:2px solid;border-radius:var(--r);padding:.85rem;transition:all .15s}
  .ccard:hover{border-color:var(--border-light)}
  .cch{display:flex;align-items:flex-start;gap:.6rem;margin-bottom:.5rem}
  .ccti{font-size:1.4rem;flex-shrink:0} .ccn{font-weight:700;font-size:.85rem} .ccr{font-family:var(--font-mono);font-size:.6rem;color:var(--text-muted)}
  .ccd{display:flex;flex-direction:column;gap:.25rem;margin-bottom:.4rem}
  .ctel,.ceml{font-family:var(--font-mono);font-size:.7rem;color:var(--cyan);text-decoration:none}
  .ctel:hover,.ceml:hover{text-decoration:underline}
  .cnota{font-size:.68rem;color:var(--text-muted);font-style:italic;padding-top:.3rem;border-top:1px solid var(--border)}
  .ctbadge{font-family:var(--font-mono);font-size:.6rem;font-weight:700;padding:.15rem .5rem;border-radius:4px;text-transform:uppercase}
  .pintro{display:flex;align-items:center;gap:.75rem;background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.15);border-radius:var(--r);padding:.85rem 1rem;margin-bottom:1rem}
  .pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.5rem;margin-bottom:1rem}
  .pbtn{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:.85rem;text-align:left;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:.6rem;font-family:'Syne',sans-serif;font-size:.78rem;font-weight:600;color:var(--text-muted)}
  .pbtn:hover{border-color:var(--border-light);color:var(--text)} .pbtn.pactive{border-color:rgba(248,113,113,.4);background:rgba(248,113,113,.06);color:var(--red)}
  .psteps{background:var(--surface);border:1px solid rgba(248,113,113,.2);border-radius:var(--r);padding:1rem}
  .pst{font-size:.85rem;font-weight:700;margin-bottom:.75rem;color:var(--red)} .pst2{font-family:var(--font-mono);font-size:.72rem;line-height:1.5}
  .ps{display:flex;gap:.6rem;margin-bottom:.5rem;align-items:flex-start}
  .psn{width:20px;height:20px;border-radius:50%;background:var(--red-dim);color:var(--red);border:1px solid rgba(248,113,113,.3);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:.6rem;font-weight:700;flex-shrink:0}
  .icard{background:var(--surface);border:1px solid rgba(248,113,113,.2);border-radius:var(--r);padding:.85rem}
  .icard.ires{opacity:.55;border-color:var(--border)}
  .ich{display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem;flex-wrap:wrap;gap:.4rem}
  .ires-txt{font-family:var(--font-mono);font-size:.62rem;color:var(--green);margin-top:.3rem;padding:.3rem .5rem;background:var(--green-dim);border-radius:4px}
  .ftabs{display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}
  .ftab{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);padding:.5rem .75rem;cursor:pointer;text-align:left;transition:all .15s;min-width:110px}
  .ftab:hover{border-color:var(--border-light)} .ftab.fa{border-color:var(--cyan);background:var(--cyan-dim)}
  .ftab>span:first-child{display:block;font-size:.72rem;font-weight:600;margin-bottom:.15rem}
  .ftab-activa{border-color:rgba(34,211,238,0.35) !important;background:var(--cyan-dim) !important;}
  .kpi[style*="cursor:pointer"]:hover{transform:translateY(-2px);border-color:var(--border-light);box-shadow:0 4px 16px rgba(0,0,0,.3)}
  .fprog{display:block;font-family:var(--font-mono);font-size:.62rem;margin-bottom:.25rem}
  .fbar{height:3px;background:var(--surface3);border-radius:2px;overflow:hidden}
  .ffill{height:100%;border-radius:2px;transition:width .5s}
  .cki{display:flex;align-items:center;gap:.65rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);padding:.6rem .75rem;transition:all .15s}
  .cki:hover{border-color:var(--border-light)} .cki.ckd{opacity:.6} .cki.ckb{border-color:rgba(248,113,113,.25);background:rgba(248,113,113,.03)}
  .ckbox{width:22px;height:22px;border-radius:5px;border:2px solid;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
  .cktarea{font-size:.78rem;font-weight:600} .ckdone{text-decoration:line-through;color:var(--text-muted)}
  .ckmeta{font-family:var(--font-mono);font-size:.6rem;color:var(--text-muted);margin-top:.15rem}
  .tlmr{display:flex;align-items:center;gap:.6rem;padding:.4rem 0;border-bottom:1px solid rgba(30,45,80,.3)}
  .tlh{font-family:var(--font-mono);font-size:.68rem;color:var(--cyan);width:40px;flex-shrink:0}
  .tld{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .tlt{font-size:.76rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tlr{font-family:var(--font-mono);font-size:.58rem;color:var(--text-muted)} .tls{font-family:var(--font-mono);font-size:.6rem;white-space:nowrap}
  .empty{text-align:center;padding:1.5rem;color:var(--text-muted);font-family:var(--font-mono);font-size:.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--r)}to{opacity:1}}to{opacity:1;transform:translateY(0)}}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:var(--surface)}::-webkit-scrollbar-thumb{background:var(--border-light);border-radius:2px}
  /* ── Dashboard clases del sistema ─────────────────────────────── */
  .log-kpi-link { cursor: pointer; }
  .log-kpi-link:hover { transform: translateY(-2px); border-color: var(--border-light); box-shadow: 0 4px 16px rgba(0,0,0,.3); }
  .log-kpi-arrow { font-family: var(--font-mono); font-size: 0.55rem; color: var(--text-dim); margin-top: 0.35rem; }
  .log-kpi-link:hover .log-kpi-arrow { color: var(--cyan); }
  .log-hero { padding: 1rem 1.1rem; }

  @media(max-width:850px){
    .layout{flex-direction:column}
    .sidebar{width:100%;height:auto;position:sticky;top:0;border-right:none;border-bottom:1px solid var(--border);flex-direction:row;align-items:center;padding:0.55rem;overflow-x:auto;backdrop-filter:blur(10px)}
    .sidebar-logo{display:none}
    .sidebar-nav{flex-direction:row;padding:0;gap:0.4rem;overflow:visible}
    .nav-item{padding:0.35rem 0.7rem;white-space:nowrap;width:auto;font-size:0.68rem}
    .nav-item::before{bottom:0;top:auto;width:auto;height:3px;left:0.35rem;right:0.35rem}
    .main{padding:1rem 0.75rem 5rem}
    .ph{flex-direction:column;align-items:flex-start;gap:0.75rem}
    .twocol{grid-template-columns:1fr}
  }
  /* ── Kanban logística ──────────────────────────────────────────── */
  .log-kanban-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.65rem;margin-bottom:.85rem}
  .log-k-col{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
  .log-k-hdr{padding:.6rem .75rem;border-top:2px solid;display:flex;align-items:center;justify-content:space-between;background:var(--surface2)}
  .log-k-cnt{font-family:var(--font-mono);font-size:.58rem;font-weight:700;padding:.1rem .35rem;border-radius:4px}
  .log-k-card{margin:.4rem .4rem 0;background:var(--surface2);border:1px solid var(--border);border-left:3px solid;border-radius:8px;padding:.6rem .7rem;transition:all .15s}
  .log-k-card:last-child{margin-bottom:.4rem}
  .log-k-card:hover{border-color:var(--border-light);box-shadow:0 2px 8px rgba(0,0,0,.2)}
  .log-k-actions{display:flex;gap:.3rem;margin-top:.4rem}
  /* ── Vista toggle ────────────────────────────────────────────────── */
  .log-vista-toggle{display:flex;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);overflow:hidden}
  /* ── Reorder ▲▼ ──────────────────────────────────────────────────── */
  .log-reorder{display:flex;flex-direction:column;gap:1px}
  .log-reorder span{display:block;width:18px;height:14px;line-height:14px;text-align:center;font-size:.6rem;background:var(--surface3);border:1px solid var(--border);border-radius:3px;color:var(--text-muted);cursor:pointer;transition:all .1s}
  .log-reorder span:hover{background:var(--cyan-dim);border-color:var(--cyan);color:var(--cyan)}
  .log-reorder span:active{transform:scale(.9)}
  .muted{color:var(--text-muted)}
`;

