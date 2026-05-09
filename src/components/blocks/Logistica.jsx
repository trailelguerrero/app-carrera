import { createPortal } from "react-dom";
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

import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";
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
    {id:"vehiculos",     icon:"🚗", label:"Vehículos"},
    {id:"localizaciones",icon:"📍", label:"Ubicaciones"},
    {id:"material",      icon:"📦", label:"Material"},
  ];
  // OPERACIONES: ejecución, día de la carrera
  const TABS_OPERACIONES = [
    {id:"timeline",   icon:"⏱️",  label:"Runbook"},
    {id:"checklist",  icon:"✅",  label:"Pre-operativo"},
    {id:"contactos",  icon:"📋",  label:"Directorio"},
    {id:"emergencias",icon:"🚨",  label:"Emergencias"},
    {id:"pedidos",    icon:"🛒",  label:"Pedidos"},
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
          {tab==="dashboard" && <TabDash stats={stats} tl={tl} ck={ck} setTab={setTab} config={config} patsConEspecie={patsConEspecie} material={material} asigs={asigs} />}
          {tab==="material" && <TabMat material={material} setMaterial={setMaterial} asigs={asigs} setAsigs={setAsigs} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenMat} setOrdenAlfa={setOrdenMat} locs={locs} patsConEspecie={patsConEspecie} totalInscritos={totalInscritos} totalMaximos={totalMaximos} rawInscritos={rawInscritos} rawTramos={rawTramos} conceptosPres={conceptosPres} />}
          {tab==="vehiculos" && <TabVeh veh={veh} setVeh={setVeh} rutas={rutas} setRutas={setRutas} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenVeh} setOrdenAlfa={setOrdenVeh} voluntariosConCoche={voluntariosConCoche} />}
          {tab==="timeline" && <TabTL tl={tl} setTl={setTl} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenTL} setOrdenAlfa={setOrdenTL} config={config} />}
          {tab==="contactos"   && <TabDirectorio cont={cont} setCont={setCont} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenCont} setOrdenAlfa={setOrdenCont} tiposContacto={tiposContacto} setTiposContacto={setTiposContacto} />}
          {tab==="emergencias" && <TabEmergencias cont={cont} inc={inc} setInc={setInc} abrirModal={abrirModal} abrirFicha={abrirFicha} tiposContacto={tiposContacto} />}
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

