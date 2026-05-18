import { createPortal } from "react-dom";
import {
  SK_LOG_ROOT, SK_LOG_TIPOS_CONT, SK_LOG_PEDIDOS_PROV,
  SK_LOG_MAT, SK_LOG_ASIG, SK_LOG_VEH, SK_LOG_RUT,
  SK_LOG_TL, SK_LOG_CONT, SK_LOG_INC, SK_LOG_CK,
  SK_PPTO_TRAMOS, SK_PPTO_INSCRITOS, SK_PPTO_MAXIMOS, SK_PPTO_CONCEPTOS,
  SK_PROY_TAREAS,
  SK_PAT_PATS,
  SK_VOL_VOLUNTARIOS, SK_VOL_PUESTOS,
} from "@/constants/storageKeys";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useModalClose } from "@/hooks/useModalClose";
import { exportarMaterial } from "@/lib/exportUtils";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/hooks/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { eventDateStr } from "@/lib/eventUtils";
import { LOCS_DEFAULT as LOCS_DEFAULT_SHARED, LOCS_KEY } from "@/constants/localizaciones";
import { useData } from "@/hooks/useData";
import { TabPedidosProv } from "./LogisticaPedidos";

import { blockCls as cls } from "@/lib/blockStyles";
// Sprint 2: sub-components extracted to src/components/logistica/
import { TabDash } from "@/components/logistica/TabDashLog";
import { TabMat } from "@/components/logistica/TabMaterial";
import { TabVeh } from "@/components/logistica/TabVehiculos";
import { TabTL } from "@/components/logistica/TabTimeline";
import { TabDirectorio } from "@/components/logistica/TabDirectorio";
import { TabEmergencias } from "@/components/logistica/TabEmergencias";
import { TabCont, TabCK } from "@/components/logistica/TabComunicaciones";
import { TabLocalizaciones } from "@/components/logistica/TabLocalizaciones";
import { FichaLogistica, ModalRouter } from "@/components/logistica/FichaLogistica";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// SK_LOG_ROOT y demás claves importadas de @/constants/storageKeys

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
  {id:17,nombre:"Medallas finisher",categoria:"Organización",cantidad:650,unidad:"ud",stock:650},
  {id:18,nombre:"Trofeos pódium",categoria:"Organización",cantidad:18,unidad:"ud",stock:18},
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
  {id:1,nombre:"Furgoneta Organización",matricula:"1234-ABC",conductor:"Javier López",capacidad:"1.5 ton",telefono:"612000001",notas:"Reparto material avituallamiento"},
  {id:2,nombre:"Pick-up Señalización",matricula:"5678-DEF",conductor:"Pedro Sánchez",capacidad:"500 kg",telefono:"612000002",notas:"Balizas y señalización de ruta"},
  {id:3,nombre:"Todoterreno Dirección",matricula:"9012-GHI",conductor:"Laura Martín",capacidad:"5 personas",telefono:"612000003",notas:"Vehículo de coordinación en ruta"},
  {id:4,nombre:"Ambulancia Cruz Roja",matricula:"CR-001",conductor:"Cruz Roja",capacidad:"2 camillas",telefono:"112",notas:"Servicio de emergencias médicas"},
];
const RUTAS0 = [
  {id:1,vehiculoId:1,nombre:"Ruta Avituallamiento Norte",horaInicio:"05:30",paradas:[
    {puesto:"Avituallamiento KM 4",hora:"05:45",material:"Agua x8"},
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
  // 5.1 Scroll indicator para tabs
  const tabsScrollRef = useRef(null);
  const [tabsScrolled, setTabsScrolled] = useState(false);
  const [tabsHasMore,  setTabsHasMore]  = useState(true); // recalculado en mount+resize

  useEffect(() => {
    const check = () => {
      const el = tabsScrollRef.current;
      if (!el) return;
      setTabsScrolled(el.scrollLeft > 8);
      setTabsHasMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [eventCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [tab, setTab] = useState("dashboard");
  useEffect(() => {
    if (initialSubtab) {
      setTab(initialSubtab);
      if (onSubtabConsumed) onSubtabConsumed();
    }
  }, [initialSubtab, onSubtabConsumed]);
  const [rawMaterial, setMaterial] = useData(SK_LOG_MAT,  MAT0);
  const material = Array.isArray(rawMaterial) ? rawMaterial : [];
  const [rawAsigs, setAsigs] = useData(SK_LOG_ASIG, ASIG0);
  const asigs = Array.isArray(rawAsigs) ? rawAsigs : [];
  const [rawVeh, setVeh] = useData(SK_LOG_VEH, VEH0);
  const veh = Array.isArray(rawVeh) ? rawVeh : [];
  const [rawRutas, setRutas] = useData(SK_LOG_RUT, RUTAS0);
  const rutas = Array.isArray(rawRutas) ? rawRutas : [];
  const [rawTl, setTl] = useData(SK_LOG_TL, TL0);
  const tl = Array.isArray(rawTl) ? rawTl : [];
  const [rawCont, setCont] = useData(SK_LOG_CONT, CONT0);
  const cont = Array.isArray(rawCont) ? rawCont : [];
  const [rawInc, setInc] = useData(SK_LOG_INC, INC0);
  const inc = Array.isArray(rawInc) ? rawInc : [];
  const [rawCk, setCk] = useData(SK_LOG_CK, CK0);
  const ck = Array.isArray(rawCk) ? rawCk : [];
  // Localizaciones maestras compartidas
  const [rawLocs, setLocs] = useData(LOCS_KEY, LOCS_DEFAULT_SHARED);
  // Tipos de contacto personalizados (extensibles por el usuario)
  const [tiposContacto, setTiposContacto] = useData(SK_LOG_TIPOS_CONT, []);

  // ── Inscritos del presupuesto — compartido con Material, Pedidos y Dashboard ──
  const [rawTramos]    = useData(SK_PPTO_TRAMOS,    []);
  const [rawInscritos] = useData(SK_PPTO_INSCRITOS, { tramos: {} });
  const [rawMaximos]   = useData(SK_PPTO_MAXIMOS,   {});
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
  const [rawPedidosProv, setPedidosProv] = useData(SK_LOG_PEDIDOS_PROV, []);
  const pedidosProv = Array.isArray(rawPedidosProv) ? rawPedidosProv : [];

  // Conceptos REALES del presupuesto (el usuario puede haberlos editado)
  const [rawConceptos] = useData(SK_PPTO_CONCEPTOS, []);
  const conceptosPres = Array.isArray(rawConceptos) && rawConceptos.length > 0
    ? rawConceptos : [];
  const locs = Array.isArray(rawLocs) ? rawLocs : [];
  // Tareas del Proyecto (solo lectura) para vincular con checklist
  const [rawTareasProyecto] = useData(SK_PROY_TAREAS, []);
  const tareasProyecto = Array.isArray(rawTareasProyecto) ? rawTareasProyecto : [];

  // Patrocinadores (solo lectura) para sección especie en material
  const [rawPats] = useData(SK_PAT_PATS, []);
  const patsConEspecie = useMemo(() => {
    const p = Array.isArray(rawPats) ? rawPats : [];
    return p.filter(pat => pat && (pat.especieItems||[]).length > 0);
  }, [rawPats]);

  // Voluntarios (solo lectura para el pool de vehículos)
  const [rawVols] = useData(SK_VOL_VOLUNTARIOS, []);
  const [rawPuestos] = useData(SK_VOL_PUESTOS, []);
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

  // Material agrupado por localización: localizacionId → [{nombre, cantidad, unidad}]
  const matPorLoc = useMemo(() => {
    const map = {};
    asigs.forEach(a => {
      if (!a.localizacionId) return;
      const mat = material.find(m0 => m0.id === a.materialId);
      if (!mat) return;
      if (!map[a.localizacionId]) map[a.localizacionId] = [];
      map[a.localizacionId].push({ nombre: mat.nombre, cantidad: a.cantidad, unidad: mat.unidad || "ud" });
    });
    return map;
  }, [asigs, material]);

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
    {id:"vehiculos",     icon:"🚗", label:"Vehículos"},
    {id:"localizaciones",icon:"📍", label:"Ubicaciones"},
    {id:"material",      icon:"📦", label:"Material"},
  ];
  // OPERACIONES: ejecución, día de la carrera
  const TABS_OPERACIONES = [
    {id:"timeline",   icon:"⏱️",  label:"Runbook"},
    {id:"checklist",  icon:"✅",  label:"Pre-operativo"},
    {id:"proveedores", icon:"🏢",  label:"Proveedores"},
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

        {/* TABS — dos grupos semánticos con separador + indicador de scroll en móvil */}
        <div style={{ position:"relative" }}>
          <div className="tabs" ref={tabsScrollRef}
            style={{ overflowX:"auto", scrollbarWidth:"none", msOverflowStyle:"none" }}
            onScroll={e => {
              const el = e.currentTarget;
              setTabsScrolled(el.scrollLeft > 8);
              setTabsHasMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
            }}>
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
          {/* Gradiente izquierda — indica tabs hacia la izquierda */}
          {tabsScrolled && (
            <div style={{ position:"absolute", left:0, top:0, bottom:0, width:28,
              background:"linear-gradient(to right, var(--surface), transparent)",
              pointerEvents:"none", zIndex:2 }} />
          )}
          {/* Gradiente + flecha derecha — indica más tabs a la derecha */}
          {tabsHasMore && (
            <div style={{ position:"absolute", right:0, top:0, bottom:0, width:36,
              background:"linear-gradient(to left, var(--surface), transparent)",
              pointerEvents:"none", zIndex:2,
              display:"flex", alignItems:"center", justifyContent:"flex-end",
              paddingRight:4 }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-md)",
                color:"var(--text-muted)", fontWeight:700 }}>›</span>
            </div>
          )}
        </div>

        {/* CONTENIDO */}
        <div key={tab}>
          {tab==="dashboard" && <TabDash stats={stats} tl={tl} ck={ck} setTab={setTab} config={config} patsConEspecie={patsConEspecie} material={material} asigs={asigs} totalInscritos={totalInscritos} />}
          {tab==="material" && <TabMat material={material} setMaterial={setMaterial} asigs={asigs} setAsigs={setAsigs} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenMat} setOrdenAlfa={setOrdenMat} locs={locs} patsConEspecie={patsConEspecie} totalInscritos={totalInscritos} totalMaximos={totalMaximos} rawInscritos={rawInscritos} rawTramos={rawTramos} conceptosPres={conceptosPres} />}
          {tab==="vehiculos" && <TabVeh veh={veh} setVeh={setVeh} rutas={rutas} setRutas={setRutas} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenVeh} setOrdenAlfa={setOrdenVeh} voluntariosConCoche={voluntariosConCoche} />}
          {tab==="timeline" && <TabTL tl={tl} setTl={setTl} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenTL} setOrdenAlfa={setOrdenTL} config={config} />}
          {tab==="emergencias" && <TabEmergencias cont={cont} inc={inc} setInc={setInc} abrirModal={abrirModal} abrirFicha={abrirFicha} tiposContacto={tiposContacto} />}
          {tab==="checklist" && <TabCK ck={ck} setCk={setCk} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenCK} setOrdenAlfa={setOrdenCK} config={config} tareasProyecto={tareasProyecto} setTareasProyecto={(fn)=>{ const next=typeof fn==="function"?fn(tareasProyecto):fn; import("@/lib/dataService").then(m=>{ m.default.set(SK_PROY_TAREAS, next); m.default.notify(); /* INC-05: notificar a Proyecto.jsx del cambio externo */ }); }} />}
          {tab==="localizaciones" && <TabLocalizaciones locs={locs} setLocs={setLocs} volsPorLoc={volsPorLoc} matPorLoc={matPorLoc} />}
          {tab==="proveedores" && (
            <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
              {/* ── Directorio de contactos ── */}
              <div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)",
                  textTransform:"uppercase", letterSpacing:".08em", marginBottom:".6rem", paddingLeft:".1rem" }}>
                  📋 Directorio de contactos
                </div>
                <TabDirectorio cont={cont} setCont={setCont} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenCont} setOrdenAlfa={setOrdenCont} tiposContacto={tiposContacto} setTiposContacto={setTiposContacto} />
              </div>
              {/* ── Separador ── */}
              <div style={{ borderTop:"1px solid var(--border)" }} />
              {/* ── Pedidos a proveedores ── */}
              <div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)",
                  textTransform:"uppercase", letterSpacing:".08em", marginBottom:".6rem", paddingLeft:".1rem" }}>
                  🛒 Pedidos a proveedores
                </div>
                <TabPedidosProv
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
                />
              </div>
            </div>
          )}
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

// ─── CSS ──────────────────────────────────────────────────────────────────────

