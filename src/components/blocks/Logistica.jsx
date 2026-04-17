import { useState, useMemo, useCallback, useEffect } from "react";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { eventDateStr } from "@/lib/eventUtils";
import { LOCS_DEFAULT as LOCS_DEFAULT_SHARED, LOCS_KEY } from "@/constants/localizaciones";
import { useData } from "@/lib/dataService";

import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LS = "teg_logistica_v1";
const genId = (arr) => arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;

const CATS_MATERIAL = ["Avituallamiento","Señalización","Seguridad","Comunicación","Médico","Organización","Infraestructura"];
const CAT_ICONS = { Avituallamiento:"🍎", Señalización:"🚩", Seguridad:"🦺", Comunicación:"📡", Médico:"🏥", Organización:"📋", Infraestructura:"⛺" };
const CAT_COLORS = { Avituallamiento:"#34d399", Señalización:"#fbbf24", Seguridad:"#fb923c", Comunicación:"#22d3ee", Médico:"#f87171", Organización:"#a78bfa", Infraestructura:"#60a5fa" };
const ESTADO_ENTREGA = ["pendiente","en tránsito","entregado","recogido"];
const ESTADO_TAREA = ["pendiente","en curso","completado","bloqueado"];
const ESTADO_COLORES = { pendiente:"#fbbf24","en tránsito":"#22d3ee",entregado:"#34d399",recogido:"var(--text-muted)","en curso":"#22d3ee",completado:"#34d399",bloqueado:"#f87171" };
const FASES_CHECKLIST = ["3 meses antes","2 meses antes","1 mes antes","Semana antes","Día antes","Mañana carrera","Durante carrera","Post-carrera"];
const PUESTOS_REF = ["Zona Salida/Meta","Avituallamiento KM 4","Avituallamiento KM 9","Avituallamiento KM 16","Control KM 7","Control KM 13","Seguridad Cruce 1","Seguridad Cruce 2","Señalización Ruta Alta","Parking","Zona Llegada/Trofeos","Primeros Auxilios Base"];

const TIPOS_LOC = ["meta", "avituallamiento", "control", "seguridad", "señalización", "parking", "sanidad", "otro"];
const LOC_ICONS = { meta:"🎏", avituallamiento:"🍎", control:"📍", seguridad:"🦸", señalización:"🚩", parking:"🅿️", sanidad:"🏥", otro:"📌" };
const LOC_COLORS = { meta:"var(--green)", avituallamiento:"var(--cyan)", control:"var(--amber)", seguridad:"var(--red)", señalización:"#fbbf24", parking:"#60a5fa", sanidad:"#f87171", otro:"var(--text-muted)" };

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
  {id:7,nombre:"Miguel Torres",rol:"Delegado TG25",telefono:"611 222 333",email:"miguel@email.com",tipo:"staff",notas:"Responsable seguimiento corredor TG25"},
  {id:8,nombre:"Sofía Ruiz",rol:"Delegada TG13",telefono:"611 333 444",email:"sofia@email.com",tipo:"staff",notas:"Responsable seguimiento corredor TG13"},
  {id:9,nombre:"Rubén Castro",rol:"Delegado TG7",telefono:"611 444 555",email:"ruben@email.com",tipo:"staff",notas:"Responsable seguimiento corredor TG7"},
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
export default function App() {
  const [eventCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [tab, setTab] = useState("dashboard");
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
      ["TG7","TG13","TG25"].forEach(d => {
        total += rawInscritos?.tramos?.[t.id]?.[d] || 0;
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
      const asignados = vols.filter(v => v.puestoId === p.id && v.estado !== "cancelado");
      if (asignados.length > 0) {
        if (!map[p.localizacionId]) map[p.localizacionId] = [];
        asignados.forEach(v => map[p.localizacionId].push({ vol: v, puesto: p }));
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
    const tlDone = tl.filter(t => t.estado==="completado").length;
    const ckDone = ck.filter(c => c.estado==="completado").length;
    const stockErr = material.filter(m => asigs.filter(a=>a.materialId===m.id).reduce((s,a)=>s+a.cantidad,0) > m.stock).length;
    const incOpen = inc.filter(i => i.estado==="abierta").length;
    return { tlDone, tlTotal:tl.length, ckDone, ckTotal:ck.length, stockErr, incOpen };
  }, [tl, ck, material, asigs, inc]);

  // Operativas: las que se usan en el día a día
  const TABS_OPERATIVAS = [
    {id:"dashboard",  icon:"📊", label:"Dashboard"},
    {id:"material",   icon:"📦", label:"Material"},
    {id:"vehiculos",  icon:"🚗", label:"Vehículos"},
    {id:"timeline",   icon:"⏱️", label:"Timeline"},
    {id:"pedidos",    icon:"🛒", label:"Pedidos"},
    {id:"checklist",  icon:"✅", label:"Checklist"},
  ];
  // Personas: contactos y emergencias
  const TABS_PERSONAS = [
    {id:"contactos",   icon:"📋", label:"Contactos"},
    {id:"emergencias", icon:"🚨", label:"Emergencias"},
  ];
  // Configuración
  const TABS_CONFIG = [
    {id:"localizaciones", icon:"📍", label:"Localizaciones"},
  ];
  const TABS = [...TABS_OPERATIVAS, ...TABS_PERSONAS, ...TABS_CONFIG];

  const doDelete = () => {
    if (!del) return;
    const { tipo, id } = del;
    const MAP = { material:setMaterial, asig:setAsigs, veh:setVeh, ruta:setRutas, tl:setTl, cont:setCont, inc:setInc, ck:setCk };
    MAP[tipo]?.(prev => prev.filter(x => x.id !== id));
    setDel(null);
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
            {stats.incOpen > 0 && (
              <span className="badge badge-amber" style={{cursor:"pointer"}}
                onClick={()=>setTab("emergencias")}>🚨 {stats.incOpen} incidencias</span>
            )}
            <span className="badge badge-cyan" style={{cursor:"pointer"}}
              onClick={()=>setTab("checklist")}
              title="Ir al checklist">
              ✅ {stats.ckDone}/{stats.ckTotal}
            </span>
          </div>
        </div>

        {/* TABS — operativas + configuración separadas */}
        <div className="tabs">
          {TABS_OPERATIVAS.map(t => (
            <button key={t.id} className={cls("tab-btn", tab===t.id && "active")} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
              {t.id==="checklist" && <span className="badge badge-cyan" style={{marginLeft:"0.3rem"}}>{stats.ckDone}/{stats.ckTotal}</span>}
              {t.id==="material" && stats.stockErr>0 && <span className="badge badge-red" style={{marginLeft:"0.3rem"}}>⚠{stats.stockErr}</span>}
              {t.id==="emergencias" && stats.incOpen>0 && <span className="badge badge-amber" style={{marginLeft:"0.3rem"}}>{stats.incOpen}</span>}
            </button>
          ))}
          {/* Separador visual — Localizaciones es configuración, no operación */}
          <span style={{
            display:"inline-flex", alignItems:"center",
            padding:"0 .25rem", color:"var(--border)",
            fontSize:"1rem", userSelect:"none", flexShrink:0,
          }}>│</span>
          {TABS_CONFIG.map(t => (
            <button key={t.id} className={cls("tab-btn", tab===t.id && "active")}
              onClick={() => setTab(t.id)}
              style={{ opacity: tab === t.id ? 1 : 0.65 }}>
              {t.icon} {t.label}
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
              ["TG7","TG13","TG25"].forEach(d => {
                ins[d] = tramos.reduce((s,t) => s + (rawInscritos?.tramos?.[t.id]?.[d]||0), 0);
              });
              return ins;
            })()}
          />}
        </div>
      </div>

      {ficha && <FichaLogistica ficha={ficha} material={material} veh={veh} onClose={()=>setFicha(null)} onEditar={(tipo,data)=>{const m=document.querySelector("main");if(m)m.scrollTo({top:0,behavior:"instant"});setFicha(null);setModal({tipo,data,...(tipo==="ck"?{tareasProyecto}:{}),...(tipo==="mat"?{conceptosPres}:{})});}} onEliminar={(tipo,id)=>{setFicha(null);setDel({tipo,id});}} />}
      {modal && (
        <ModalRouter key={modal.tipo+(modal.data?.id||"n")} modal={modal} onClose={() => setModal(null)}
          material={material} setMaterial={setMaterial} asigs={asigs} setAsigs={setAsigs}
          veh={veh} setVeh={setVeh} rutas={rutas} setRutas={setRutas}
          tl={tl} setTl={setTl} cont={cont} setCont={setCont}
          inc={inc} setInc={setInc} ck={ck} setCk={setCk}
          locs={locs} tiposContacto={tiposContacto} conceptosPres={conceptosPres} />
      )}
      {del && (
        <div className="modal-backdrop" style={{zIndex:200}} onClick={e => e.target===e.currentTarget && setDel(null)}>
          <div className="modal" style={{maxWidth:340,textAlign:"center"}}>
            <div className="modal-body" style={{paddingTop:"1.5rem"}}>
              <div style={{fontSize:"2.5rem",marginBottom:"0.6rem"}}>⚠️</div>
              <div style={{fontWeight:700,marginBottom:"0.4rem"}}>¿Eliminar elemento?</div>
              <div className="muted mono xs">Esta acción no se puede deshacer.</div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setDel(null)}>Cancelar</button><button className="btn btn-red" onClick={doDelete}>Eliminar</button></div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function TabDash({ stats, tl, ck, setTab, config, patsConEspecie, material = [], asigs = [] }) {
  const prox = [...tl].filter(t=>t.estado!=="completado").sort((a,b)=>a.hora.localeCompare(b.hora)).slice(0,6);
  const porFase = FASES_CHECKLIST.map(f => { const it=ck.filter(c=>c.fase===f); const d=it.filter(c=>c.estado==="completado").length; return {f,d,t:it.length,pct:it.length?Math.round(d/it.length*100):0}; });
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
    { l:"📦 Stock",      v:stats.stockErr,
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
        {KPIS.map(k => (
          <div key={k.l}
            className={`kpi ${k.color} log-kpi-link`}
            onClick={()=>setTab(k.tab)}
            title={`Ir a ${k.l}`}>
            <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>
              {k.l}{k.tip&&<Tooltip text={k.tip}><TooltipIcon size={11}/></Tooltip>}
            </div>
            <div className="kpi-value">{k.v}</div>
            <div className="kpi-sub">{k.s}</div>
            <div className="log-kpi-arrow">→ ver detalle</div>
          </div>
        ))}
      </div>

      {/* ── Panel de déficit de stock — solo si hay problemas ── */}
      {stats.stockErr > 0 && (() => {
        const enDeficit = material.map(m => {
          const totalAsig = asigs.filter(a => a.materialId === m.id)
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
              <span style={{ fontFamily:"var(--font-mono)", fontSize:".6rem",
                fontWeight:700, color:"var(--red)", textTransform:"uppercase",
                letterSpacing:".06em" }}>
                ⚠ Stock insuficiente
              </span>
              <button className="btn btn-ghost btn-sm"
                style={{ fontSize:".6rem", color:"var(--text-dim)" }}
                onClick={() => setTab("material")}>
                Ver material →
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:".3rem" }}>
              {enDeficit.map(m => (
                <div key={m.id} style={{
                  display:"flex", alignItems:"center", gap:".6rem",
                  fontSize:".75rem",
                }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:".6rem",
                    fontWeight:800, color:"var(--red)",
                    background:"rgba(248,113,113,.1)", padding:".08rem .4rem",
                    borderRadius:3, flexShrink:0, minWidth:48, textAlign:"center" }}>
                    -{m.def} {m.unidad}
                  </span>
                  <span style={{ fontWeight:600, flex:1, minWidth:0,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {m.nombre}
                  </span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:".6rem",
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
            <div style={{fontFamily:"var(--font-mono)",fontSize:"0.55rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.2rem"}}>
              🏔️ {config.nombre} {config.edicion} · {config.lugar}, {config.provincia}
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:"0.4rem"}}>
              {yaFue ? (
                <span style={{fontFamily:"var(--font-mono)",fontSize:"1.4rem",fontWeight:800,color:"var(--green)"}}>¡Completado!</span>
              ) : (
                <>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"1.8rem",fontWeight:800,
                    color: esSemana ? "var(--red)" : "var(--amber)",lineHeight:1}}>
                    {diasHasta}
                  </span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:"0.7rem",color:"var(--text-muted)"}}>
                    {esSemana ? "⚡ días — SEMANA DE CARRERA" : "días para el evento"}
                  </span>
                </>
              )}
            </div>
          </div>
          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setTab("checklist")}>✅ Checklist</button>
            <button className="btn btn-sm" style={{background:"rgba(248,113,113,0.1)",color:"var(--red)",border:"1px solid rgba(248,113,113,0.25)",fontFamily:"var(--font-mono)",fontSize:"0.62rem"}}
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
            const recibidos = items.filter(i => i.recibido).length;
            return (
              <div key={pat.id} style={{ display: "flex", alignItems: "flex-start", gap: ".6rem", padding: ".45rem 0", borderBottom: "1px solid rgba(30,45,80,.25)" }}>
                <span style={{ fontSize: "1rem" }}>📦</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: ".78rem", fontWeight: 700 }}>{pat.nombre}</div>
                  <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginTop: ".2rem" }}>
                    {items.map(i => (
                      <span key={i.id} style={{ fontFamily: "var(--font-mono)", fontSize: ".58rem", padding: ".1rem .35rem", borderRadius: 4,
                        background: i.recibido ? "rgba(52,211,153,.12)" : "rgba(251,191,36,.08)",
                        color: i.recibido ? "#34d399" : "#fbbf24" }}>
                        {i.recibido ? "✓" : "⏳"} {i.nombre} ({i.cantidad} {i.unidad})
                      </span>
                    ))}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: ".62rem", color: recibidos === items.length ? "#34d399" : "#fbbf24" }}>
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
            <div style={{textAlign:"center",padding:"1rem",color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontSize:"0.7rem"}}>
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
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.72rem",marginBottom:"0.2rem"}}>
                <span style={{color: f.pct===100?"var(--text-muted)":"var(--text)"}}>{f.f}</span>
                <span className="mono" style={{color:f.pct===100?"var(--green)":"var(--text-muted)",fontSize:"0.62rem"}}>{f.d}/{f.t}</span>
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

const TLC = {logistica:"#fbbf24",organizacion:"#a78bfa",voluntarios:"#34d399",carrera:"#22d3ee",comunicacion:"#fb923c"};
const TLI = {logistica:"🚚",organizacion:"📋",voluntarios:"👥",carrera:"🏃",comunicacion:"📡"};

// ─── MATERIAL ─────────────────────────────────────────────────────────────────
function TabMat({material,setMaterial,asigs,setAsigs,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,abrirModal,locs,patsConEspecie,totalInscritos=0,totalMaximos=0,rawInscritos={},rawTramos=[],conceptosPres=[]}) {
  const [vistaAsig,setVistaAsig]=useState(false);
  const [vistaKanban,setVistaKanban]=useState(false);
  const [cat,setCat]=useState("todas");

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
    let list=cat==="todas"?ms:ms.filter(m=>m.categoria===cat);
    if(ordenAlfa) list=[...list].sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es"));
    return list;
  },[ms,cat,ordenAlfa]);
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
          <button className={cls("btn",!vistaAsig?"btn-cyan":"btn-ghost")} onClick={()=>setVistaAsig(false)}>Catálogo<span style={{marginLeft:"0.3rem",fontFamily:"var(--font-mono)",fontSize:"0.6rem",background:!vistaAsig?"rgba(0,0,0,0.15)":"var(--surface3)",padding:"0.05rem 0.35rem",borderRadius:3}}>{material.length}</span></button>
          <button className={cls("btn",vistaAsig?"btn-cyan":"btn-ghost")} onClick={()=>setVistaAsig(true)}>Asignaciones<span style={{marginLeft:"0.3rem",fontFamily:"var(--font-mono)",fontSize:"0.6rem",background:vistaAsig?"rgba(0,0,0,0.15)":"var(--surface3)",padding:"0.05rem 0.35rem",borderRadius:3}}>{asigs.length}</span></button>
          {!vistaAsig && (<>
            <div className="filter-pill-group">
              <button className={`filter-pill${!vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(false)}>☰ Lista</button>
              <button className={`filter-pill${vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(true)}>⬛ Kanban</button>
            </div>
            <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          </>)}
          <button className="btn btn-primary" onClick={()=>abrirModal({tipo:vistaAsig?"asig":"mat",conceptosPres:conceptosPres})}>+ Añadir</button>
        </div>
      </div>
      {!vistaAsig?(<>
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
                  <span style={{fontSize:".65rem",fontWeight:700,color}}>{CAT_ICONS[catK]} {catK}</span>
                  <span className="log-k-cnt" style={{background:color+"22",color,border:`1px solid ${color}44`}}>{items.length}</span>
                </div>
                {items.map(m=>(<div key={m.id} className="log-k-card" style={{borderLeftColor:color,cursor:"pointer"}} onClick={()=>abrirFicha("mat",m)}>
                  <div style={{fontWeight:700,fontSize:".76rem",marginBottom:".3rem"}}>{m.nombre}</div>
                  <div style={{display:"flex",gap:".5rem",flexWrap:"wrap",fontSize:".62rem",fontFamily:"var(--font-mono)"}}>
                    <span style={{color:"var(--text-muted)"}}>Stock: <span style={{color:"var(--text)",fontWeight:700}}>{m.stock} {m.unidad}</span></span>
                    {m.def>0&&<span style={{color:"var(--red)",fontWeight:700}}>⚠ -{m.def}</span>}
                  </div>
                </div>))}
              </div>);
            })}
          </div>
        ):(
          <div className="card p0"><div className="ox"><table className="tbl">
            <thead><tr><th style={{width:22}}></th><th>Material</th><th>Categoría</th><th className="tr">Stock</th><th className="tr">Asignado</th><th className="tr">Déficit</th></tr></thead>
            <tbody>{mf.map((m,i,arr)=>(
              <tr key={m.id} className={m.def>0?"ra":""} style={{cursor:"pointer"}} onClick={()=>abrirFicha("mat",m)}>
                <td onClick={e=>e.stopPropagation()} style={{padding:"0.3rem 0.2rem"}}>
                  {!ordenAlfa&&<div className="log-reorder"><span onClick={()=>mover(m.id,-1)} style={{opacity:i===0?.2:1}}>▲</span><span onClick={()=>mover(m.id,+1)} style={{opacity:i===arr.length-1?.2:1}}>▼</span></div>}
                </td>
                <td className="f6">
                  <div style={{display:"flex",alignItems:"center",gap:".35rem",flexWrap:"wrap"}}>
                    {m.nombre}
                    {m.presupuestoConceptoId && (() => {
                      const c=conceptosPres.find(c=>c.id===m.presupuestoConceptoId);
                      return c ? (
                        <span style={{fontFamily:"var(--font-mono)",fontSize:".55rem",
                          padding:".06rem .3rem",borderRadius:10,
                          background:"var(--violet-dim)",color:"var(--violet)",
                          border:"1px solid rgba(167,139,250,.25)"}}>
                          💰 {c.nombre}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </td>
                <td><span className="badge" style={{background:`${CAT_COLORS[m.categoria]}18`,color:CAT_COLORS[m.categoria],border:`1px solid ${CAT_COLORS[m.categoria]}33`}}>{CAT_ICONS[m.categoria]} {m.categoria}</span></td>
                <td className="tr mono">{m.stock} {m.unidad}</td>
                <td className="tr mono" style={{color:m.asig>0?"var(--cyan)":"var(--text-muted)"}}>{m.asig} {m.unidad}</td>
                <td className="tr mono">{m.def>0?<span style={{color:"var(--red)",fontWeight:700}}>-{m.def}</span>:<span style={{color:"var(--text-dim)"}}>—</span>}</td>
              </tr>
            ))}</tbody>
          </table></div></div>
        )}
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
  const [vehColapsado,setVehCol]=useState(false);
  const [rutasColapsadas,setRutasCol]=useState(false);
  const [poolColapsado,setPoolCol]=useState(false);
  const moverVeh=(id,dir)=>{
    if(ordenAlfa) return;
    setVeh(prev=>{const arr=[...prev];const i=arr.findIndex(x=>x.id===id);const j=i+dir;if(j<0||j>=arr.length)return arr;[arr[i],arr[j]]=[arr[j],arr[i]];return arr;});
  };
  const vehOrdenado=useMemo(()=>ordenAlfa?[...veh].sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es")):veh,[veh,ordenAlfa]);
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
          <button className="btn btn-primary" onClick={()=>abrirModal({tipo:"veh"})}>+ Vehículo</button>
          <button className="btn btn-amber" onClick={()=>abrirModal({tipo:"ruta"})}>+ Ruta</button>
        </div>
      </div>
      {vistaKanban?(
        <div className="log-kanban-grid" style={{gridTemplateColumns:"repeat(2,1fr)"}}>
          <div className="log-k-col">
            <div className="log-k-hdr" style={{borderTopColor:"var(--cyan)"}}>
              <span style={{fontSize:".65rem",fontWeight:700,color:"var(--cyan)"}}>🚐 Flota</span>
              <span className="log-k-cnt" style={{background:"var(--cyan-dim)",color:"var(--cyan)",border:"1px solid rgba(34,211,238,.3)"}}>{veh.length}</span>
            </div>
            {vehOrdenado.map(v=>(<div key={v.id} className="log-k-card" style={{borderLeftColor:"var(--cyan)",cursor:"pointer"}} onClick={()=>abrirFicha("veh",v)}>
              <div style={{fontWeight:700,fontSize:".76rem",marginBottom:".2rem"}}>{v.nombre}</div>
              <div className="mono xs muted">{v.matricula} · {v.conductor}</div>
              <div className="mono xs" style={{color:"var(--text-muted)",marginTop:".15rem"}}>{v.capacidad}</div>
              {v.notas&&<div style={{fontSize:".62rem",color:"var(--text-muted)",marginTop:".2rem",fontStyle:"italic"}}>{v.notas}</div>}
            </div>))}

            {/* SECCIÓN VEHÍCULOS VOLUNTARIOS (POOL) */}
            {voluntariosConCoche.length > 0 && (
              <div style={{marginTop:"1.2rem"}}>
                <div className="log-k-hdr" style={{borderTopColor:"var(--violet)",background:"transparent",padding:"0.6rem 0.2rem"}}>
                  <span style={{fontSize:".65rem",fontWeight:700,color:"var(--violet)"}}>🙋‍♂️ Pool Voluntarios</span>
                  <span className="log-k-cnt" style={{background:"var(--violet-dim)",color:"var(--violet)",border:"1px solid rgba(167,139,250,.3)"}}>{voluntariosConCoche.length}</span>
                </div>
                {voluntariosConCoche.map(vol => (
                  <div key={vol.id} className="log-k-card" style={{borderLeftColor:"var(--violet)",background:"var(--violet-dim)"}}>
                    <div style={{fontWeight:700,fontSize:".76rem",marginBottom:".2rem"}}>{vol.nombre}</div>
                    <div className="mono xs muted">🚙 Vehículo propio</div>
                    <a href={`tel:${vol.telefono}`} style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--violet)",textDecoration:"none"}}>📞 {vol.telefono}</a>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="log-k-col">
            <div className="log-k-hdr" style={{borderTopColor:"var(--amber)"}}>
              <span style={{fontSize:".65rem",fontWeight:700,color:"var(--amber)"}}>🗺️ Rutas</span>
              <span className="log-k-cnt" style={{background:"var(--amber-dim)",color:"var(--amber)",border:"1px solid rgba(251,191,36,.3)"}}>{rutas.length}</span>
            </div>
            {rutas.map(r=>{const v=veh.find(x=>x.id===r.vehiculoId);return(<div key={r.id} className="log-k-card" style={{borderLeftColor:"var(--amber)",cursor:"pointer"}} onClick={()=>abrirFicha("ruta",r)}>
              <div style={{fontWeight:700,fontSize:".76rem",marginBottom:".2rem"}}>{r.nombre}</div>
              <div className="mono xs muted">🚐 {v?.nombre||"—"} · 🕐 {r.horaInicio}</div>
              <div style={{fontSize:".62rem",color:"var(--text-muted)",marginTop:".2rem"}}>{(r.paradas||[]).length} paradas</div>
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
              <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:".68rem",flex:1}}>🚐 Flota de vehículos</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--cyan)",
                padding:".06rem .35rem",borderRadius:20,background:"var(--cyan-dim)"}}>{veh.length}</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-dim)",
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
                  <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:".68rem",color:"var(--violet)",flex:1}}>🙋‍♂️ Pool de Voluntarios</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--violet)",
                    padding:".06rem .35rem",borderRadius:20,background:"rgba(167,139,250,.15)"}}>{voluntariosConCoche.length}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"rgba(167,139,250,.5)",
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
              <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:".68rem",flex:1}}>🗺️ Rutas de reparto</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--amber)",
                padding:".06rem .35rem",borderRadius:20,background:"var(--amber-dim)"}}>{rutas.length}</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-dim)",
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
  const sorted=useMemo(()=>{
    let arr=[...tl];
    if(ordenAlfa) arr.sort((a,b)=>(a.titulo||"").localeCompare(b.titulo||"","es"));
    else arr.sort((a,b)=>a.hora.localeCompare(b.hora));
    return arr;
  },[tl,ordenAlfa]);
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
  const upd=(id,estado)=>setTl(p=>p.map(t=>t.id===id?{...t,estado}:t));
  return(
    <>
      <div className="ph">
        <div><div className="pt">⏱️ Timeline del Día</div><div className="pd">{tl.filter(t=>t.estado==="completado").length}/{tl.length} completadas · {config?.fecha ? new Date(config.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"}) : eventDateStr(config)}</div></div>
        <div className="fr g1">
          <div className="filter-pill-group">
              <button className={`filter-pill${!vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(false)}>☰ Lista</button>
              <button className={`filter-pill${vistaKanban ? " active" : ""}`}
                onClick={() => setVistaKanban(true)}>⬛ Kanban</button>
            </div>
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
                <span style={{fontSize:".65rem",fontWeight:700,color}}>{TLI[cat]} {cat}</span>
                <span className="log-k-cnt" style={{background:color+"22",color,border:`1px solid ${color}44`}}>{items.length}</span>
              </div>
              {items.map(t=>{const ec=ESTADO_COLORES[t.estado];return(<div key={t.id} className="log-k-card" style={{borderLeftColor:color,cursor:"pointer",opacity:t.estado==="completado"?.55:1}} onClick={()=>abrirFicha("tl",t)}>
                <div className="mono" style={{fontSize:".62rem",color,marginBottom:".2rem"}}>{t.hora}</div>
                <div style={{fontWeight:700,fontSize:".76rem",marginBottom:".2rem"}}>{t.titulo}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:ec,background:ec+"18",padding:".1rem .35rem",borderRadius:4,display:"inline-block"}}>{t.estado}</div>
              </div>);})}
            </div>);
          })}
        </div>
      ):(
      <div className="tlcon">{sorted.map((t,i)=>{
        const color=TLC[t.categoria]||"var(--text-muted)";const ec=ESTADO_COLORES[t.estado];
        return(
          <div key={t.id} className={cls("tlrow",t.estado==="completado"&&"tldone",t.estado==="bloqueado"&&"tlblk")}>
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
                  <select className="isml" value={t.estado} onChange={e=>upd(t.id,e.target.value)} style={{color:ec,background:`${ec}18`,border:`1px solid ${ec}44`,borderRadius:5,padding:"0.18rem 0.4rem",fontSize:"0.65rem",fontFamily:"var(--font-mono)",cursor:"pointer"}}>
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
        );
      })}</div>
      )}
    </>
  );
}

// ─── DIRECTORIO DE CONTACTOS ─────────────────────────────────────────────────
// Todos los contactos del evento, con tipos personalizables
function TabDirectorio({cont,setCont,setModal,setDel,abrirFicha,ordenAlfa,setOrdenAlfa,tiposContacto=[],setTiposContacto}) {
  const [filtroTipo,setFiltroTipo] = useState("todos");
  const [modalTipo,setModalTipo]   = useState(false);
  const [nuevoTipo,setNuevoTipo]   = useState({nombre:"",icono:"🏷️",color:"#94a3b8"});

  const TIPOS_BASE = [
    {id:"emergencia",  nombre:"Emergencia",    icono:"🚨", color:"#f87171"},
    {id:"medico",      nombre:"Médico",        icono:"🏥", color:"#34d399"},
    {id:"proveedor",   nombre:"Proveedor",     icono:"🏭", color:"#fbbf24"},
    {id:"staff",       nombre:"Staff",         icono:"👤", color:"#22d3ee"},
    {id:"institucional",nombre:"Institucional",icono:"🏛️",color:"#a78bfa"},
    {id:"media",       nombre:"Media/Prensa",  icono:"📸", color:"#fb923c"},
    {id:"voluntario",  nombre:"Voluntario",    icono:"🙋", color:"#818cf8"},
  ];
  const tiposCustom   = Array.isArray(tiposContacto) ? tiposContacto : [];
  const todosLosTipos = [...TIPOS_BASE, ...tiposCustom];
  const getTipo = (id) => todosLosTipos.find(t=>t.id===id) || {nombre:id,icono:"🏷️",color:"var(--text-muted)"};

  // Excluir emergencia y médico del directorio (están en la pestaña Emergencias)
  const TIPOS_EXCLUIDOS_DIR = ["emergencia","medico"];
  const contDir = cont.filter(c => !TIPOS_EXCLUIDOS_DIR.includes(c.tipo));
  const contOrdenado = ordenAlfa
    ? [...contDir].sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es"))
    : contDir;
  const contFiltrado = filtroTipo==="todos" ? contOrdenado : contOrdenado.filter(c=>c.tipo===filtroTipo);

  const guardarTipo = () => {
    if (!nuevoTipo.nombre.trim()) return;
    const id = nuevoTipo.nombre.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    if (todosLosTipos.find(t=>t.id===id)) return;
    setTiposContacto(prev=>[...(Array.isArray(prev)?prev:[]),{...nuevoTipo,id}]);
    setNuevoTipo({nombre:"",icono:"🏷️",color:"#94a3b8"});
    setModalTipo(false);
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
            style={{fontFamily:"var(--font-mono)",fontSize:".62rem"}}
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
            fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,
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
                fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,
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
          <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
            color:"var(--text-dim)",alignSelf:"center"}}>Tipos propios:</span>
          {tiposCustom.map(t=>(
            <span key={t.id} style={{display:"inline-flex",alignItems:"center",gap:".25rem",
              padding:".12rem .45rem",borderRadius:20,
              background:t.color+"18",color:t.color,
              border:`1px solid ${t.color}33`,fontFamily:"var(--font-mono)",
              fontSize:".6rem",fontWeight:700}}>
              {t.icono} {t.nombre}
              <button onClick={()=>setTiposContacto(prev=>(Array.isArray(prev)?prev:[]).filter(x=>x.id!==t.id))}
                style={{background:"none",border:"none",cursor:"pointer",
                  color:"var(--text-dim)",fontSize:".6rem",padding:0,lineHeight:1}}>✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Grid de contactos */}
      {contFiltrado.length === 0 ? (
        <div className="card" style={{textAlign:"center",padding:"2rem",
          color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:".72rem"}}>
          Sin contactos{filtroTipo!=="todos"?` de tipo "${getTipo(filtroTipo).nombre}"`:""}
        </div>
      ) : (
        <div className="cgrid">
          {contFiltrado.map(c=>{
            const t = getTipo(c.tipo);
            return (
              <div key={c.id} className="ccard"
                style={{borderTopColor:t.color,cursor:"pointer"}}
                onClick={()=>abrirFicha("cont",c)}>
                <div className="cch">
                  <div className="ccti" style={{fontSize:"1.1rem"}}>{t.icono}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="ccn">{c.nombre}</div>
                    <div className="ccr">{c.rol}</div>
                  </div>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:".55rem",
                    padding:".1rem .35rem",borderRadius:10,flexShrink:0,
                    background:t.color+"18",color:t.color,border:`1px solid ${t.color}33`}}>
                    {t.nombre}
                  </span>
                </div>
                <div className="ccd">
                  <a href={`tel:${c.telefono}`} className="ctel">📞 {c.telefono}</a>
                  {c.email&&<a href={`mailto:${c.email}`} className="ceml">✉️ {c.email}</a>}
                </div>
                {c.web&&<div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",marginTop:".2rem"}}>
                  <a href={c.web} target="_blank" rel="noreferrer"
                    style={{color:"var(--cyan)",textDecoration:"none"}}
                    onClick={e=>e.stopPropagation()}>🌐 {c.web}</a>
                </div>}
                {c.notas&&<div className="cnota">{c.notas}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuevo tipo personalizado */}
      {modalTipo && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModalTipo(false)}>
          <div className="modal" style={{maxWidth:360}}>
            <div className="modal-header">
              <span className="modal-title">🏷️ Nuevo tipo de contacto</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setModalTipo(false)}>✕</button>
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
                    <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
                      color:"var(--text-muted)"}}>{nuevoTipo.color}</span>
                  </div>
                </div>
              </div>
              <div style={{padding:".4rem .6rem",borderRadius:6,
                background:"var(--surface2)",border:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
                  color:"var(--text-muted)",marginRight:".4rem"}}>Vista previa:</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,
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
    {id:"emergencia",icono:"🚨",color:"#f87171"},
    {id:"medico",    icono:"🏥",color:"#34d399"},
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
        {sub==="incidencias" && (
          <button className="btn btn-sm"
            style={{background:"var(--red-dim)",color:"var(--red)",
              border:"1px solid rgba(248,113,113,.2)"}}
            onClick={()=>abrirModal({tipo:"inc"})}>+ Incidencia</button>
        )}
      </div>

      {/* Banner 112 siempre visible */}
      <div style={{padding:".5rem .85rem",borderRadius:8,marginBottom:".75rem",
        background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",
        fontFamily:"var(--font-mono)",fontSize:".68rem",color:"var(--red)",
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
              fontFamily:"var(--font-mono)",fontSize:".68rem",fontWeight:700,
              background:sub===t.id?"rgba(248,113,113,.12)":"transparent",
              color:sub===t.id?"var(--red)":"var(--text-muted)",
              borderBottom:sub===t.id?"2px solid var(--red)":"2px solid transparent",
              display:"flex",alignItems:"center",gap:".3rem"}}>
            {t.label}
            {t.badge&&<span style={{fontFamily:"var(--font-mono)",fontSize:".55rem",
              padding:".05rem .35rem",borderRadius:10,fontWeight:800,
              background:t.badgeColor+"22",color:t.badgeColor}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Contactos urgentes */}
      {sub==="urgentes" && (
        <>
          <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
            color:"var(--text-muted)",marginBottom:".5rem"}}>
            Solo contactos de tipo <strong>Emergencia</strong> y <strong>Médico</strong>.
            El resto están en la pestaña Contactos.
          </div>
          {contUrgentes.length===0 ? (
            <div className="card" style={{textAlign:"center",padding:"2rem",
              color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:".72rem"}}>
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
                          padding:".3rem .7rem",fontWeight:800,fontSize:".8rem",
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
                <span style={{fontSize:"1.4rem"}}>{p.icon}</span><span>{p.titulo}</span>
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
                    <span className="mono" style={{fontSize:".72rem",color:"var(--amber)"}}>{ic.hora}</span>
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
                <div style={{fontWeight:600,fontSize:".78rem",margin:".3rem 0"}}>{ic.descripcion}</div>
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
const TIC={emergencia:"#f87171",proveedor:"#fbbf24",staff:"#22d3ee",institucional:"#a78bfa"};
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
  const [nuevoTipo,setNuevoTipo]   = useState({nombre:"",icono:"🏷️",color:"#94a3b8"});

  // Tipos base (siempre presentes) + personalizados del usuario
  const TIPOS_BASE = [
    {id:"emergencia",  nombre:"Emergencia",   icono:"🚨", color:"#f87171"},
    {id:"proveedor",   nombre:"Proveedor",    icono:"🏭", color:"#fbbf24"},
    {id:"staff",       nombre:"Staff",        icono:"👤", color:"#22d3ee"},
    {id:"institucional",nombre:"Institucional",icono:"🏛️",color:"#a78bfa"},
    {id:"medico",      nombre:"Médico",       icono:"🏥", color:"#34d399"},
    {id:"media",       nombre:"Media/Prensa", icono:"📸", color:"#fb923c"},
  ];
  const tiposCustom  = Array.isArray(tiposContacto) ? tiposContacto : [];
  const todosLosTipos = [...TIPOS_BASE, ...tiposCustom];
  const getTipo = (id) => todosLosTipos.find(t=>t.id===id) || {nombre:id,icono:"🏷️",color:"var(--text-muted)"};

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
    setNuevoTipo({nombre:"",icono:"🏷️",color:"#94a3b8"});
    setModalTipo(false);
  };
  const eliminarTipo = (id) => {
    setTiposContacto(prev=>(Array.isArray(prev)?prev:[]).filter(t=>t.id!==id));
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
            <button className="btn btn-primary" onClick={()=>abrirModal({tipo:"cont"})}>+ Contacto</button>
          )}
          {sub==="incidencias" && (
            <button className="btn btn-sm" style={{background:"var(--red-dim)",color:"var(--red)",border:"1px solid rgba(248,113,113,0.2)"}}
              onClick={()=>abrirModal({tipo:"inc"})}>+ Incidencia</button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",gap:".3rem",marginBottom:".85rem",
        borderBottom:"1px solid var(--border)",paddingBottom:".5rem",flexWrap:"wrap"}}>
        {[
          {id:"directorio",  label:"📋 Directorio",  badge:cont.length},
          {id:"protocolo",   label:"📘 Protocolos",  badge:null},
          {id:"incidencias", label:"⚠️ Incidencias", badge:incAbiertas||null, badgeColor:"var(--red)"},
        ].map(t=>(
          <button key={t.id}
            onClick={()=>setSub(t.id)}
            style={{padding:".35rem .8rem",borderRadius:6,border:"none",cursor:"pointer",
              fontFamily:"var(--font-mono)",fontSize:".68rem",fontWeight:700,
              background:sub===t.id?"rgba(34,211,238,.12)":"transparent",
              color:sub===t.id?"var(--cyan)":"var(--text-muted)",
              borderBottom:sub===t.id?"2px solid var(--cyan)":"2px solid transparent",
              display:"flex",alignItems:"center",gap:".3rem"}}>
            {t.label}
            {t.badge!=null && t.badge>0 && (
              <span style={{fontFamily:"var(--font-mono)",fontSize:".55rem",
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
                  fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,cursor:"pointer"}}>
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
                      fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,cursor:"pointer",
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
                style={{fontFamily:"var(--font-mono)",fontSize:".6rem"}}>
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
              <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                color:"var(--text-dim)",alignSelf:"center"}}>
                Tipos personalizados:
              </span>
              {tiposCustom.map(t=>(
                <span key={t.id} style={{display:"inline-flex",alignItems:"center",gap:".25rem",
                  padding:".15rem .5rem",borderRadius:20,
                  background:t.color+"15",color:t.color,
                  border:`1px solid ${t.color}33`,
                  fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700}}>
                  {t.icono} {t.nombre}
                  <button onClick={()=>eliminarTipo(t.id)}
                    style={{background:"none",border:"none",cursor:"pointer",
                      color:"var(--text-dim)",fontSize:".6rem",padding:0,lineHeight:1}}>✕</button>
                </span>
              ))}
            </div>
          )}

          {/* Grid de contactos */}
          {contFiltrado.length === 0 ? (
            <div className="card" style={{textAlign:"center",padding:"2rem",
              color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:".72rem"}}>
              Sin contactos {filtroTipo!=="todos"?`de tipo "${getTipo(filtroTipo).nombre}"`:""}
            </div>
          ) : (
            <div className="cgrid">
              {contFiltrado.map(c=>{
                const t = getTipo(c.tipo);
                return (
                  <div key={c.id} className="ccard"
                    style={{borderTopColor:t.color,cursor:"pointer"}}
                    onClick={()=>abrirFicha("cont",c)}>
                    <div className="cch">
                      <div className="ccti" style={{fontSize:"1.1rem"}}>{t.icono}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="ccn">{c.nombre}</div>
                        <div className="ccr">{c.rol}</div>
                      </div>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:".55rem",
                        padding:".1rem .4rem",borderRadius:10,flexShrink:0,
                        background:t.color+"18",color:t.color,border:`1px solid ${t.color}33`}}>
                        {t.nombre}
                      </span>
                    </div>
                    <div className="ccd">
                      <a href={`tel:${c.telefono}`} className="ctel">📞 {c.telefono}</a>
                      {c.email&&<a href={`mailto:${c.email}`} className="ceml">✉️ {c.email}</a>}
                    </div>
                    {c.web&&<div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
                      color:"var(--cyan)",marginTop:".2rem"}}>
                      <a href={c.web} target="_blank" rel="noreferrer"
                        style={{color:"var(--cyan)",textDecoration:"none"}}
                        onClick={e=>e.stopPropagation()}>🌐 {c.web}</a>
                    </div>}
                    {c.notas&&<div className="cnota">{c.notas}</div>}
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
            <span style={{fontSize:"1.5rem"}}>🚨</span>
            <div>
              <div style={{fontWeight:700,marginBottom:".2rem"}}>Protocolo de emergencias</div>
              <div className="muted xs mono">Selecciona el tipo de incidencia para ver los pasos</div>
            </div>
          </div>
          <div className="pgrid">
            {PROTO_PASOS.map(p=>(
              <button key={p.id} className={cls("pbtn",proto===p.id&&"pactive")} onClick={()=>setProto(proto===p.id?null:p.id)}>
                <span style={{fontSize:"1.4rem"}}>{p.icon}</span><span>{p.titulo}</span>
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
                    <span className="mono" style={{fontSize:".72rem",color:"var(--amber)"}}>{ic.hora}</span>
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
                <div style={{fontWeight:600,fontSize:".78rem",margin:".3rem 0"}}>{ic.descripcion}</div>
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
          <div className="modal" style={{maxWidth:360}}>
            <div className="modal-header">
              <span className="modal-title">🏷️ Nuevo tipo de contacto</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setModalTipo(false)}>✕</button>
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
                    <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
                      color:"var(--text-muted)"}}>{nuevoTipo.color}</span>
                  </div>
                </div>
              </div>
              <div style={{padding:".4rem .6rem",borderRadius:6,
                background:"var(--surface2)",border:"1px solid var(--border)"}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:".62rem",
                  color:"var(--text-muted)",marginRight:".4rem"}}>Vista previa:</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,
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
  const toggle=(id)=>setCk(p=>{
    const next=p.map(c=>c.id===id?{...c,estado:c.estado==="completado"?"pendiente":"completado"}:c);
    // Sincronizar con Proyecto si hay vínculo
    const item=next.find(c=>c.id===id);
    if(item?.proyectoTareaId && setTareasProyecto) {
      const nuevoEstado=item.estado==="completado"?"completado":"en curso";
      setTareasProyecto(prev=>prev.map(t=>t.id===item.proyectoTareaId?{...t,estado:nuevoEstado}:t));
    }
    return next;
  });
  const upd=(id,f,v)=>setCk(p=>p.map(c=>c.id===id?{...c,[f]:v}:c));
  const pf=FASES_CHECKLIST.map(f=>{const it=ck.filter(c=>c.fase===f);const d=it.filter(c=>c.estado==="completado").length;return{f,it,d,t:it.length,pct:it.length?Math.round(d/it.length*100):0};});
  const fd=pf.find(x=>x.f===fase);
  return(
    <>
      <div className="ph">
        <div><div className="pt">✅ Checklist Pre-Carrera</div><div className="pd">{ck.filter(c=>c.estado==="completado").length}/{ck.length} completados</div></div>
        <div className="fr g1">
          <div style={{display:"flex",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",overflow:"hidden"}}>
            {[["lista","☰"],["kanban","⬛"]].map(([v,ic])=>(
              <button key={v} onClick={()=>setVistaKanban(v==="kanban")}
                style={{padding:".3rem .55rem",border:"none",cursor:"pointer",fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,
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
              <span style={{fontSize:"0.72rem",fontWeight:600}}>{f.f}</span>
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
                      <div style={{fontSize:".65rem",fontWeight:700,color}}>{f.f}</div>
                      {esActiva && <div style={{fontFamily:"var(--font-mono)",fontSize:".5rem",color:"var(--cyan)",marginTop:".1rem"}}>● AHORA</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".15rem"}}>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color,fontWeight:700}}>{f.d}/{f.t}</span>
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
                          <div style={{fontSize:".72rem",fontWeight:600,marginBottom:".2rem",textDecoration:item.estado==="completado"?"line-through":"none",color:item.estado==="completado"?"var(--text-muted)":"var(--text)"}}>{item.tarea}</div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)"}}>👤 {item.responsable}</span>
                            <span style={{fontFamily:"var(--font-mono)",fontSize:".55rem",padding:".08rem .3rem",borderRadius:3,background:item.prioridad==="alta"?"var(--red-dim)":"var(--amber-dim)",color:item.prioridad==="alta"?"var(--red)":"var(--amber)"}}>{item.prioridad}</span>
                          </div>
                          <div style={{marginTop:".3rem"}} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>toggle(item.id)}
                              style={{fontFamily:"var(--font-mono)",fontSize:".58rem",padding:".1rem .35rem",borderRadius:4,border:`1px solid ${item.estado==="completado"?"rgba(248,113,113,.3)":"rgba(52,211,153,.3)"}`,background:item.estado==="completado"?"var(--red-dim)":"var(--green-dim)",color:item.estado==="completado"?"var(--red)":"var(--green)",cursor:"pointer"}}>
                              {item.estado==="completado"?"↩ Reabrir":"✓ Completar"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {items.length===0 && <div style={{padding:".75rem",textAlign:"center",fontFamily:"var(--font-mono)",fontSize:".62rem",color:"var(--text-dim)"}}>—</div>}
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
                  {item.estado==="completado"&&<span style={{color:"#000",fontSize:"0.75rem",fontWeight:800}}>✓</span>}
                  {item.estado==="bloqueado"&&<span style={{color:"var(--red)",fontSize:"0.75rem"}}>!</span>}
                </button>
                <div style={{flex:1,minWidth:0}}>
                  <div className={cls("cktarea",item.estado==="completado"&&"ckdone")}>{item.tarea}</div>
                  <div className="ckmeta">👤 {item.responsable}{item.notas&&` · ${item.notas}`}</div>
                </div>
                <div className="fr g1" onClick={e=>e.stopPropagation()}>
                  <span className="badge" style={{background:item.prioridad==="alta"?"var(--red-dim)":"var(--amber-dim)",color:item.prioridad==="alta"?"var(--red)":"var(--amber)",fontSize:"0.55rem"}}>{item.prioridad}</span>
                  <select className="isml" value={item.estado} onChange={e=>upd(item.id,"estado",e.target.value)} style={{color:ESTADO_COLORES[item.estado],fontSize:"0.62rem",padding:"0.15rem 0.3rem"}}>
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
  const genId = (arr) => arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
  const [modal, setModal] = useState(null); // null | {data: loc|null}
  const [del, setDel] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [form, setForm] = useState({ nombre: "", tipo: "otro", descripcion: "" });

  const locsF = filtroTipo === "todos" ? locs : locs.filter(l => l.tipo === filtroTipo);

  const openNueva = () => { setForm({ nombre: "", tipo: "otro", descripcion: "" }); setModal({ data: null }); };
  const openEditar = (l) => { setForm({ nombre: l.nombre, tipo: l.tipo, descripcion: l.descripcion || "" }); setModal({ data: l }); };
  const save = () => {
    if (!form.nombre.trim()) return;
    if (modal.data) {
      setLocs(prev => prev.map(l => l.id === modal.data.id ? { ...l, ...form } : l));
    } else {
      setLocs(prev => [...prev, { id: genId(prev), ...form }]);
    }
    setModal(null);
  };

  return (
    <>
      <div className="ph">
        <div><div className="pt">📍 Localizaciones Maestras</div><div className="pd">{locs.length} ubicaciones · Compartidas con Voluntarios</div></div>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          <select style={{ fontFamily: "var(--font-mono)", fontSize: ".72rem", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--r-sm)", padding: ".3rem .5rem" }}
            value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="todos">Todos los tipos</option>
            {TIPOS_LOC.map(t => <option key={t} value={t}>{LOC_ICONS[t]} {t}</option>)}
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
                  <span style={{ fontSize: "1.2rem" }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: ".82rem" }}>{l.nombre}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: ".58rem", color, textTransform: "uppercase", letterSpacing: ".06em" }}>{l.tipo}</div>
                  </div>
                </div>
                <button className="btn btn-sm btn-red" onClick={e => { e.stopPropagation(); setDel(l.id); }}
                  style={{ flexShrink: 0, padding: ".15rem .4rem", fontSize: ".65rem" }}>✕</button>
              </div>
              {l.descripcion && <div style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: ".2rem" }}>{l.descripcion}</div>}
              {(() => {
                const asig = volsPorLoc[l.id] || [];
                if (!asig.length) return (
                  <div style={{ marginTop: ".45rem", fontFamily: "var(--font-mono)", fontSize: ".58rem",
                    color: "var(--text-dim)", borderTop: "1px solid var(--border)", paddingTop: ".4rem" }}>
                    👥 Sin voluntarios asignados
                  </div>
                );
                const conf = asig.filter(a => a.vol.estado === "confirmado");
                const pend = asig.filter(a => a.vol.estado === "pendiente");
                return (
                  <div style={{ marginTop: ".45rem", borderTop: "1px solid var(--border)", paddingTop: ".4rem" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: ".58rem", color: "var(--text-muted)",
                      marginBottom: ".3rem", display: "flex", alignItems: "center", gap: ".4rem", flexWrap:"wrap" }}>
                      👥 <span style={{ fontWeight: 700 }}>{asig.length} voluntario{asig.length!==1?"s":""}</span>
                      {conf.length > 0 && <span style={{ color: "var(--green)", fontWeight: 700 }}>· {conf.length} ✓</span>}
                      {pend.length > 0 && <span style={{ color: "var(--amber)" }}>· {pend.length} pend.</span>}
                      <button
                        onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"voluntarios"}})); }}
                        style={{ fontFamily:"var(--font-mono)", fontSize:".5rem", padding:".06rem .3rem",
                          borderRadius:3, border:"1px solid rgba(34,211,238,.3)",
                          background:"rgba(34,211,238,.1)", color:"var(--cyan)", cursor:"pointer",
                          marginLeft:"auto", flexShrink:0 }}>
                        Ver →
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: ".18rem" }}>
                      {asig.slice(0,4).map((a, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: ".4rem",
                          fontSize: ".62rem", fontFamily: "var(--font-mono)" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                            background: a.vol.estado === "confirmado" ? "var(--green)" :
                              a.vol.estado === "pendiente" ? "var(--amber)" : "var(--text-dim)" }} />
                          <span style={{ color: "var(--text)", fontWeight: 600 }}>{a.vol.nombre}</span>
                          <span style={{ color: "var(--text-dim)", fontSize: ".55rem" }}>— {a.puesto.nombre}</span>
                        </div>
                      ))}
                      {asig.length > 4 && (
                        <div style={{ fontSize: ".58rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", paddingLeft: ".6rem" }}>
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
        {locsF.length === 0 && (
          <div className="card" style={{ textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: ".7rem", padding: "2rem" }}>
            Sin localizaciones con ese filtro
          </div>
        )}
      </div>

      {/* Resumen por tipo */}
      <div className="card" style={{ marginTop: ".85rem" }}>
        <div className="ct" style={{ marginBottom: ".5rem" }}>📊 Resumen por tipo</div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          {TIPOS_LOC.map(t => {
            const n = locs.filter(l => l.tipo === t).length;
            if (!n) return null;
            const color = LOC_COLORS[t] || "var(--text-muted)";
            return (
              <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem", padding: ".2rem .6rem", borderRadius: 20,
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
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div style={{ fontWeight: 700 }}>{modal.data ? "✏️ Editar localización" : "📍 Nueva localización"}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem", color: "var(--text-muted)" }}>Nombre *</span>
                <input className="inp" placeholder="ej. Avituallamiento KM 4" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem", color: "var(--text-muted)" }}>Tipo</span>
                <select className="inp" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS_LOC.map(t => <option key={t} value={t}>{LOC_ICONS[t]} {t}</option>)}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem", color: "var(--text-muted)" }}>Descripción</span>
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
          <div className="modal" style={{ maxWidth: 320, textAlign: "center" }}>
            <div className="modal-body" style={{ paddingTop: "1.5rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: ".5rem" }}>⚠️</div>
              <div style={{ fontWeight: 700 }}>¿Eliminar localización?</div>
              <div className="mono xs muted">Los puestos de voluntarios que la referenciaban quedarán sin localización maestra.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDel(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={() => { setLocs(prev => prev.filter(l => l.id !== del)); setDel(null); }}>Eliminar</button>
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
  const accents = { tl:"#fbbf24", ck:"#34d399", mat:"var(--cyan)", veh:"#a78bfa", ruta:"var(--amber)", cont:"#22d3ee", asig:"var(--cyan)", inc:"#f87171" };
  const icons   = { tl:"⏱️", ck:"✅", mat:"📦", veh:"🚐", ruta:"🗺️", cont:"📞", asig:"📍", inc:"⚠️" };
  const accent  = accents[tipo] || "var(--cyan)";
  const titulo  = data.titulo || data.tarea || data.nombre || data.descripcion || "—";

  const Row = ({label, value, color}) => !value ? null : (
    <div style={{display:"flex",justifyContent:"space-between",padding:".4rem 0",borderBottom:"1px solid rgba(30,45,80,.3)"}}>
      <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--text-muted)",flexShrink:0,marginRight:"1rem"}}>{label}</span>
      <span style={{fontSize:".76rem",fontWeight:600,textAlign:"right",color:color||"var(--text)"}}>{value}</span>
    </div>
  );

  const matNombre = tipo==="asig" ? (material.find(m=>m.id===data.materialId)?.nombre || data.materialNombre) : null;
  const vehNombre = tipo==="ruta" ? (veh.find(v=>v.id===data.vehiculoId)?.nombre || "—") : null;

  return (
    <>
      <style>{``}</style>
      <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="modal">
          <div style={{borderTop:`3px solid ${accent}`,borderRadius:"16px 16px 0 0"}}>
            <div style={{padding:"1.1rem 1.4rem .9rem",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
                <span style={{fontSize:"1.4rem"}}>{icons[tipo]}</span>
                <div>
                  <div style={{fontWeight:800,fontSize:".95rem",lineHeight:1.2}}>{titulo}</div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginTop:".1rem",textTransform:"uppercase"}}>
                    {tipo==="tl"?"Tarea timeline":tipo==="ck"?"Tarea checklist":tipo==="mat"?"Material":tipo==="veh"?"Vehículo":tipo==="ruta"?"Ruta":tipo==="cont"?"Contacto":tipo==="asig"?"Asignación":"Incidencia"}
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost" style={{padding:".2rem .5rem"}} onClick={onClose}>✕</button>
            </div>
          </div>
          <div style={{padding:"1.1rem 1.4rem",display:"flex",flexDirection:"column",gap:".4rem"}}>
            {tipo==="tl" && (<>
              <Row label="Hora"        value={data.hora} color={accent} />
              <Row label="Estado"      value={data.estado} color={ESTADO_COLORES[data.estado]} />
              <Row label="Categoría"   value={`${TLI[data.categoria]} ${data.categoria}`} />
              <Row label="Responsable" value={data.responsable} />
              {data.descripcion && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:`2px solid ${accent}`,marginTop:".25rem"}}><div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Descripción</div><div style={{fontSize:".78rem",lineHeight:1.5}}>{data.descripcion}</div></div>}
            </>)}
            {tipo==="ck" && (<>
              <Row label="Fase"        value={data.fase} />
              <Row label="Estado"      value={data.estado} color={ESTADO_COLORES[data.estado]} />
              <Row label="Prioridad"   value={data.prioridad} color={data.prioridad==="alta"?"var(--red)":data.prioridad==="media"?"var(--amber)":"var(--green)"} />
              <Row label="Responsable" value={data.responsable} />
              {data.notas && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:`2px solid ${accent}`,marginTop:".25rem"}}><div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div><div style={{fontSize:".78rem",lineHeight:1.5}}>{data.notas}</div></div>}
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
              {data.notas && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:`2px solid ${accent}`}}><div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div><div style={{fontSize:".78rem",lineHeight:1.5}}>{data.notas}</div></div>}
            </>)}
            {tipo==="ruta" && (<>
              <Row label="Vehículo"    value={vehNombre} />
              <Row label="Hora inicio" value={data.horaInicio} />
              <Row label="Paradas"     value={`${(data.paradas||[]).length} paradas`} />
              {(data.paradas||[]).length>0 && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",marginTop:".25rem"}}>{(data.paradas||[]).map((p,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:".25rem 0",borderBottom:i<data.paradas.length-1?"1px solid rgba(30,45,80,.2)":"none",fontSize:".72rem"}}><span style={{fontWeight:600}}>{p.puesto}</span><span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--cyan)"}}>{p.hora}</span></div>)}</div>}
            </>)}
            {tipo==="cont" && (<>
              <Row label="Rol"         value={data.rol} />
              <Row label="Tipo"        value={`${({"emergencia":"🚨","proveedor":"🏭","staff":"👤","institucional":"🏛️"})[data.tipo]||""} ${data.tipo}`} />
              <Row label="Teléfono"    value={data.telefono} color="var(--cyan)" />
              <Row label="Email"       value={data.email} />
              {data.notas && <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:`2px solid ${accent}`}}><div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div><div style={{fontSize:".78rem",lineHeight:1.5}}>{data.notas}</div></div>}
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
                  <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,
                    color:data.gravedad==="alta"?"var(--red)":data.gravedad==="media"?"var(--amber)":"var(--green)",
                    marginBottom:".35rem",textTransform:"uppercase",letterSpacing:".06em"}}>
                    {data.gravedad==="alta"?"🔴 Protocolo ALTA — acción inmediata":
                     data.gravedad==="media"?"🟡 Protocolo MEDIA — monitorizar":
                     "🟢 Protocolo BAJA — registrar y gestionar"}
                  </div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:".62rem",color:"var(--text-muted)",lineHeight:1.6}}>
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
  const {tipo,data}=modal;
  const locNames = locs && locs.length > 0 ? locs.map(l => l.nombre) : PUESTOS_REF;
  const sv=(setter,arr,item)=>{ if(item.id) setter(p=>p.map(x=>x.id===item.id?item:x)); else setter(p=>[...p,{...item,id:genId(arr)}]); onClose(); };

  if(tipo==="mat") {
    const conceptosP = modal.conceptosPres || [];
    const camposConcepto = conceptosP.length > 0 ? [{
      k:"presupuestoConceptoId", l:"Concepto del presupuesto (opcional)",
      t:"sel",
      o:[null,...conceptosP.map(c=>c.id)],
      lb:["— Sin vínculo",...conceptosP.map(c=>`[${c.tipo==="variable"?"var":"fijo"}] ${c.nombre}`)],
      num:true, nullable:true,
    }] : [];
    return <MF title={data?"✏️ Editar material":"📦 Nuevo material"} onClose={onClose}
      fields={[
        {k:"nombre",l:"Nombre *",t:"text"},
        {k:"categoria",l:"Categoría",t:"sel",o:CATS_MATERIAL},
        {k:"cantidad",l:"Cantidad disponible",t:"num"},
        {k:"stock",l:"Stock total",t:"num"},
        {k:"unidad",l:"Unidad (ud/kg/rollos...)",t:"text"},
        ...camposConcepto,
      ]}
      init={data||{nombre:"",categoria:"Avituallamiento",cantidad:0,stock:0,unidad:"ud",presupuestoConceptoId:null}}
      onSave={v=>sv(setMaterial,material,{...v,presupuestoConceptoId:v.presupuestoConceptoId?parseInt(v.presupuestoConceptoId):null})} />;
  }

  if(tipo==="asig") return <MF title={data?"✏️ Editar asignación":"📍 Nueva asignación"} onClose={onClose}
    fields={[{k:"materialId",l:"Material",t:"sel",o:material.map(m=>m.id),lb:material.map(m=>m.nombre),num:true},{k:"puesto",l:"Puesto destino",t:"sel",o:locNames},{k:"cantidad",l:"Cantidad",t:"num"},{k:"estado",l:"Estado entrega",t:"sel",o:ESTADO_ENTREGA}]}
    init={data||{materialId:material[0]?.id||1,puesto:locNames[0],cantidad:1,estado:"pendiente"}}
    onSave={v=>sv(setAsigs,asigs,{...v,materialId:parseInt(v.materialId)})} />;

  if(tipo==="veh") return <MF title={data?"✏️ Editar vehículo":"🚗 Nuevo vehículo"} onClose={onClose}
    fields={[{k:"nombre",l:"Nombre *",t:"text"},{k:"matricula",l:"Matrícula",t:"text"},{k:"conductor",l:"Conductor",t:"text"},{k:"capacidad",l:"Capacidad",t:"text"},{k:"telefono",l:"Teléfono",t:"text"},{k:"notas",l:"Notas",t:"text"}]}
    init={data||{nombre:"",matricula:"",conductor:"",capacidad:"",telefono:"",notas:""}}
    onSave={v=>sv(setVeh,veh,v)} />;

  if(tipo==="ruta") return <ModalRuta data={data} veh={veh} rutas={rutas} setRutas={setRutas} onClose={onClose} locs={locs} />;

  if(tipo==="tl") return <MF title={data?"✏️ Editar tarea":"⏱️ Nueva tarea"} onClose={onClose}
    fields={[{k:"hora",l:"Hora",t:"time"},{k:"titulo",l:"Título *",t:"text"},{k:"descripcion",l:"Descripción",t:"text"},{k:"responsable",l:"Responsable",t:"text"},{k:"categoria",l:"Categoría",t:"sel",o:["logistica","organizacion","voluntarios","carrera","comunicacion"]},{k:"estado",l:"Estado",t:"sel",o:ESTADO_TAREA}]}
    init={data||{hora:"08:00",titulo:"",descripcion:"",responsable:"",categoria:"organizacion",estado:"pendiente"}}
    onSave={v=>sv(setTl,tl,v)} />;

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
      onSave={v=>sv(setCont,cont,v)} />;
  }

  if(tipo==="inc") return <MF title={data?"✏️ Editar incidencia":"⚠️ Registrar incidencia"} onClose={onClose}
    fields={[{k:"hora",l:"Hora",t:"time"},{k:"tipo",l:"Tipo",t:"sel",o:["médica","señalización","avituallamiento","corredor perdido","meteorológica","otra"]},{k:"gravedad",l:"Gravedad",t:"sel",o:["baja","media","alta"]},{k:"descripcion",l:"Descripción *",t:"text"},{k:"responsable",l:"Responsable",t:"text"},{k:"estado",l:"Estado",t:"sel",o:["abierta","resuelta"]},{k:"resolucion",l:"Resolución",t:"text"}]}
    init={data||{hora:new Date().toTimeString().slice(0,5),tipo:"médica",gravedad:"media",descripcion:"",responsable:"",estado:"abierta",resolucion:""}}
    onSave={v=>sv(setInc,inc,v)} />;

  if(tipo==="ck") {
    const tareasProy = Array.isArray(modal.tareasProyecto) ? modal.tareasProyecto : [];
    const camposVinculo = tareasProy.length > 0 ? [{
      k:"proyectoTareaId", l:"Vincular tarea de Proyecto (opcional)",
      t:"sel",
      o:[null,...tareasProy.map(t=>t.id)],
      lb:["— Sin vínculo",...tareasProy.map(t=>`[${t.area||""}] ${(t.titulo||"").slice(0,40)}`)],
      num:true, nullable:true
    }] : [];
    return <MF title={data?"✏️ Editar tarea":"✅ Nueva tarea checklist"} onClose={onClose}
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
      onSave={v=>sv(setCk,ck,{...v,proyectoTareaId:v.proyectoTareaId?parseInt(v.proyectoTareaId):null})} />;
  }

  return null;
}

function MF({title,fields,init,onSave,onClose}) {
  const [form,setForm]=useState({...init});
  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));
  const req=fields.find(f=>f.l.includes("*"));
  // Bloquear scroll del fondo y desplazar al top al abrir el modal
  // sin scroll-lock — causa freeze en Android
  useEffect(() => {
    const m = document.querySelector("main");
    if (m) m.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return(
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header"><span className="mtit">{title}</span><button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          {fields.map(f=>(
            <div key={f.k}>
              <label className="fl">{f.l}</label>
              {f.t==="sel"?(
                <select className="inp" value={form[f.k]} onChange={e=>upd(f.k,f.num?parseInt(e.target.value):e.target.value)}>
                  {(f.o||[]).map((o,i)=><option key={o} value={o}>{f.lb?.[i]||o}</option>)}
                </select>
              ):(
                <input className="inp" type={f.t==="num"?"number":f.t||"text"} value={form[f.k]||""} onChange={e=>upd(f.k,f.t==="num"?parseFloat(e.target.value)||0:e.target.value)} placeholder={f.l.replace(" *","")} />
              )}
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-cyan" onClick={()=>{if(!req||form[req.k])onSave(form);}}>
            {init?.id?"💾 Guardar":"➕ Añadir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalRuta({data,veh,rutas,setRutas,onClose,locs}) {
  const locNames = locs && locs.length > 0 ? locs.map(l => l.nombre) : PUESTOS_REF;
  const [form,setForm]=useState(() => {
    const base = data || {nombre:"",vehiculoId:veh[0]?.id||1,horaInicio:"05:00",paradas:[]};
    return { ...base, paradas: Array.isArray(base.paradas) ? base.paradas : [] };
  });
  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));
  const addP=()=>setForm(p=>({...p,paradas:[...p.paradas,{puesto:locNames[0],hora:"06:00",material:""}]}));
  const updP=(i,k,v)=>setForm(p=>({...p,paradas:p.paradas.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const delP=(i)=>setForm(p=>({...p,paradas:p.paradas.filter((_,j)=>j!==i)}));
  const save=()=>{
    if(!form.nombre)return;
    const item={...form,vehiculoId:parseInt(form.vehiculoId)};
    if(item.id)setRutas(p=>p.map(r=>r.id===item.id?item:r));
    else setRutas(p=>[...p,{...item,id:genId(rutas)}]);
    onClose();
  };
  // sin scroll-lock — causa freeze en Android
  return(
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:560}}>
        <div className="modal-header"><span className="mtit">{data?"✏️ Editar ruta":"🗺️ Nueva ruta"}</span><button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
            <div><label className="fl">Nombre *</label><input className="inp" value={form.nombre} onChange={e=>upd("nombre",e.target.value)} placeholder="Nombre de la ruta"/></div>
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
              <button className="btn btn-cyan" style={{fontSize:"0.68rem",padding:"0.2rem 0.6rem"}} onClick={addP}>+ Parada</button>
            </div>
            {Array.isArray(form.paradas) && form.paradas.map((p,i)=>(
              <div key={i} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"0.6rem",marginBottom:"0.4rem"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"0.4rem",marginBottom:"0.3rem",alignItems:"start"}}>
                  <select className="inp isml" style={{width:"100%",fontSize:"0.75rem"}} value={p.puesto} onChange={e=>updP(i,"puesto",e.target.value)}>
                    {PUESTOS_REF.map(pr=><option key={pr} value={pr}>{pr}</option>)}
                  </select>
                  <div style={{display:"flex",gap:"0.3rem",alignItems:"center"}}>
                    <input className="inp isml" type="time" value={p.hora} onChange={e=>updP(i,"hora",e.target.value)} style={{width:80}}/>
                    <button className="btn btn-sm btn-red" onClick={()=>delP(i)}>✕</button>
                  </div>
                </div>
                <input className="inp isml" value={p.material} onChange={e=>updP(i,"material",e.target.value)} placeholder="Material a entregar..." style={{width:"100%",fontSize:"0.72rem"}}/>
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
  .pt{font-size:1.3rem;font-weight:800} .pd{font-family:var(--font-mono);font-size:.62rem;color:var(--text-muted);margin-top:.25rem}
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


// ─── TAB PEDIDOS A PROVEEDORES ────────────────────────────────────────────────
const ESTADOS_PEDIDO = [
  { id:"borrador",    label:"Borrador",    color:"var(--text-muted)", bg:"var(--surface2)" },
  { id:"confirmado",  label:"Confirmado",  color:"var(--cyan)",       bg:"var(--cyan-dim)" },
  { id:"recibido",    label:"Recibido",    color:"var(--green)",      bg:"var(--green-dim)" },
  { id:"facturado",   label:"Facturado",   color:"var(--violet)",     bg:"var(--violet-dim)" },
];
const ESTADOS_FACTURA = [
  { id:"pendiente", label:"Pendiente", color:"var(--amber)" },
  { id:"pagada",    label:"Pagada",    color:"var(--green)" },
];
const genPedidoId = (arr) => arr.length ? Math.max(...arr.map(x=>x.id||0))+1 : 1;
const fmtEur = (n) => new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",minimumFractionDigits:2}).format(n||0);

function TabPedidosProv({ pedidos, setPedidos, cont, material=[], conceptosPres=[], totalInscritos, inscritos }) {
  const [modal, setModal]   = useState(null); // null | "nuevo" | {pedido}
  const [delId, setDelId]   = useState(null);
  const [expanded, setExpanded] = useState(null);

  // Precio unitario de medalla: buscar PRIMERO en conceptos variables (€/corredor)
  // Un concepto fijo "Medallas Zamac" es el precio de compra al proveedor — diferente.
  const conceptoMedalla = conceptosPres.find(c =>
    /medalla/i.test(c.nombre) && c.tipo === "variable"
  ) || conceptosPres.find(c => /medalla/i.test(c.nombre));

  const precioMedalla = (() => {
    if (!conceptoMedalla) return 0;
    if (conceptoMedalla.tipo === "variable") {
      // Variable: usar costePorDistancia — ya es €/unidad
      return calcPrecioUnitario(conceptoMedalla, material).precio;
    }
    // Fijo: solo si hay material vinculado con stock > 0
    const { precio } = calcPrecioUnitario(conceptoMedalla, material);
    return precio; // será 0 si no hay vínculo de material
  })();

  // Trofeos: concepto fijo — precio unitario solo si hay material vinculado con stock
  const conceptoTrofeos = conceptosPres.find(c => /trofeo/i.test(c.nombre));
  const costeTrofeoUnit = conceptoTrofeos
    ? calcPrecioUnitario(conceptoTrofeos, material).precio
    : 0;
  // El coste total de trofeos para referencia en el panel
  const costeTrofeoTotal = conceptoTrofeos?.costeTotal || 0;

  // Dorsales: concepto variable (€/corredor)
  const conceptoDorsal = conceptosPres.find(c => /dorsal/i.test(c.nombre) && c.tipo === "variable");
  const precioDorsal = conceptoDorsal ? calcPrecioUnitario(conceptoDorsal, material).precio : 0;

  // Avituallamiento: buscar conceptos variables de avituallamiento (puede haber varios)
  const conceptosAvit = conceptosPres.filter(c =>
    /avituallamiento|avituall|nutrición|agua|gel|isotónico/i.test(c.nombre) && c.tipo === "variable"
  );
  const precioAvitTotal = conceptosAvit.reduce((s, c) => {
    const { precio } = calcPrecioUnitario(c, material);
    return s + precio;
  }, 0); // coste total por corredor sumando todos los avituallamientos

  // Proveedores del directorio de Emergencias
  const proveedores = (Array.isArray(cont) ? cont : []).filter(c => c.tipo === "proveedor");

  const totalPedidos = pedidos.length;
  const pendFactura  = pedidos.filter(p => p.estado === "recibido" && !p.factura?.numero).length;
  const totalComprometido = pedidos
    .filter(p => p.estado !== "borrador")
    .reduce((s,p) => s + (p.importeTotal||0), 0);

  // Detectar pedidos con artículos variables que difieren del precio actual
  const pedidosConPrecioDesactualizado = pedidos.filter(p =>
    (p.articulos||[]).some(a => {
      if (!a.conceptoId) return false;
      const c = conceptosPres.find(cc => cc.id === a.conceptoId);
      if (!c || c.tipo !== "variable") return false;
      const precioActual = calcPrecioUnitario(c, material).precio;
      return Math.abs((a.precioUnit||0) - precioActual) > 0.001;
    })
  );

  const actualizarPreciosVariables = () => {
    setPedidos(prev => prev.map(p => {
      const articulosActualizados = (p.articulos||[]).map(a => {
        if (!a.conceptoId) return a;
        const c = conceptosPres.find(cc => cc.id === a.conceptoId);
        if (!c || c.tipo !== "variable") return a;
        const precioActual = calcPrecioUnitario(c, material).precio;
        const nuevoTotal = a.esFijo ? (a.costeTotal||0) : a.cantidad * precioActual;
        return { ...a, precioUnit: precioActual };
      });
      // Recalcular importeTotal
      const nuevoImporte = articulosActualizados.reduce(
        (s,a) => s + (a.esFijo ? (a.costeTotal||0) : a.cantidad*(a.precioUnit||0)), 0
      );
      return { ...p, articulos: articulosActualizados, importeTotal: nuevoImporte };
    }));
  };

  const abrirNuevo = () => setModal("nuevo");
  const abrirEditar = (p) => setModal(p);
  const guardar = (p) => {
    if (p.id) setPedidos(prev => prev.map(x => x.id===p.id ? p : x));
    else setPedidos(prev => [...prev, { ...p, id: genPedidoId(prev) }]);
    setModal(null);
  };
  const eliminar = () => {
    setPedidos(prev => prev.filter(x => x.id !== delId));
    setDelId(null);
  };

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🛒 Pedidos a Proveedores</div>
          <div className="pd">
            {totalPedidos} pedido{totalPedidos!==1?"s":""} ·{" "}
            {fmtEur(totalComprometido)} comprometido
            {pendFactura > 0 && <span style={{color:"var(--amber)",marginLeft:".5rem"}}>· ⚠ {pendFactura} sin factura</span>}
          </div>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo pedido</button>
      </div>

      {/* Banner: precios variables desactualizados */}
      {pedidosConPrecioDesactualizado.length > 0 && (
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          gap:".75rem",padding:".6rem .85rem",borderRadius:8,marginBottom:".75rem",
          background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.25)",
          flexWrap:"wrap",
        }}>
          <div style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--amber)"}}>
            ⚡ {pedidosConPrecioDesactualizado.length} pedido{pedidosConPrecioDesactualizado.length>1?"s tienen":"  tiene"} artículos variables con precio desactualizado
            <span style={{color:"var(--text-muted)",marginLeft:".4rem"}}>
              (los inscritos han cambiado desde que se crearon)
            </span>
          </div>
          <button className="btn btn-sm"
            style={{background:"rgba(251,191,36,.15)",color:"var(--amber)",
              border:"1px solid rgba(251,191,36,.35)",fontFamily:"var(--font-mono)",
              fontSize:".62rem",flexShrink:0}}
            onClick={actualizarPreciosVariables}>
            🔄 Actualizar precios
          </button>
        </div>
      )}

      {/* ── Sugerencias automáticas ── */}
      <SugerenciasMedallas
        inscritos={inscritos}
        totalInscritos={totalInscritos}
        precioMedalla={precioMedalla}
        conceptoMedalla={conceptoMedalla}
        pedidos={pedidos}
        onCrear={(sugerido) => setModal(sugerido)}
      />
      {(conceptoDorsal || conceptosAvit.length > 0) && (
        <SugerenciasSimples
          inscritos={inscritos}
          totalInscritos={totalInscritos}
          conceptoDorsal={conceptoDorsal}
          precioDorsal={precioDorsal}
          conceptosAvit={conceptosAvit}
          precioAvitTotal={precioAvitTotal}
          pedidos={pedidos}
          onCrear={(sugerido) => setModal(sugerido)}
        />
      )}

      {/* ── Lista de pedidos ── */}
      {pedidos.length === 0 ? (
        <div className="card" style={{textAlign:"center",padding:"2.5rem 1rem",
          color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:".75rem"}}>
          <div style={{fontSize:"2rem",marginBottom:".5rem",opacity:.35}}>🛒</div>
          Sin pedidos aún. Usa las sugerencias de arriba o crea uno manualmente.
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
          {pedidos.map(p => {
            const est = ESTADOS_PEDIDO.find(e=>e.id===p.estado)||ESTADOS_PEDIDO[0];
            const isExp = expanded===p.id;
            const desvPct = p.importeEstimado && p.factura?.importe
              ? ((p.factura.importe - p.importeEstimado) / p.importeEstimado * 100)
              : null;
            return (
              <div key={p.id} className="card" style={{padding:0,overflow:"hidden"}}>
                {/* Cabecera clickable */}
                <div style={{display:"flex",alignItems:"center",gap:".6rem",
                  padding:".7rem .9rem",cursor:"pointer",
                  borderLeft:`3px solid ${est.color}`}}
                  onClick={()=>setExpanded(isExp?null:p.id)}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:".82rem"}}>{p.nombre}</div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
                      color:"var(--text-muted)",marginTop:".1rem"}}>
                      {p.proveedor||"Sin proveedor"} · {p.articulos?.length||0} artículo{p.articulos?.length!==1?"s":""}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:"var(--font-mono)",fontWeight:800,
                      fontSize:".85rem",color:est.color}}>
                      {fmtEur(p.importeTotal||0)}
                    </div>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                      padding:".1rem .4rem",borderRadius:4,
                      background:est.bg,color:est.color,fontWeight:700}}>
                      {est.label}
                    </span>
                  </div>
                  <span style={{color:"var(--text-dim)",fontSize:".7rem",flexShrink:0}}>
                    {isExp?"▲":"▼"}
                  </span>
                </div>

                {/* Detalle expandible */}
                {isExp && (
                  <div style={{borderTop:"1px solid var(--border)",
                    padding:".75rem .9rem",display:"flex",flexDirection:"column",gap:".6rem"}}>

                    {/* Artículos */}
                    {(p.articulos||[]).length > 0 && (
                      <div>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                          color:"var(--text-muted)",textTransform:"uppercase",
                          letterSpacing:".06em",marginBottom:".35rem"}}>
                          Artículos
                        </div>
                        <table style={{width:"100%",borderCollapse:"collapse",
                          fontFamily:"var(--font-mono)",fontSize:".72rem"}}>
                          <thead>
                            <tr style={{borderBottom:"1px solid var(--border)"}}>
                              <th style={{textAlign:"left",padding:".2rem .4rem",
                                fontWeight:600,color:"var(--text-muted)"}}>Artículo</th>
                              <th style={{textAlign:"right",padding:".2rem .4rem",
                                fontWeight:600,color:"var(--text-muted)"}}>Cant.</th>
                              <th style={{textAlign:"right",padding:".2rem .4rem",
                                fontWeight:600,color:"var(--text-muted)"}}>€/ud</th>
                              <th style={{textAlign:"right",padding:".2rem .4rem",
                                fontWeight:600,color:"var(--text-muted)"}}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.articulos.map((a,i) => (
                              <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                                <td style={{padding:".3rem .4rem"}}>{a.nombre}</td>
                                <td style={{textAlign:"right",padding:".3rem .4rem",
                                  fontWeight:700}}>{a.cantidad}</td>
                                <td style={{textAlign:"right",padding:".3rem .4rem",
                                  color:"var(--text-muted)"}}>
                                  {fmtEur(a.precioUnit)}
                                  {(() => {
                                    if (!a.conceptoId) return null;
                                    const c = conceptosPres.find(cc=>cc.id===a.conceptoId);
                                    if (!c || c.tipo!=="variable") return null;
                                    const actual = calcPrecioUnitario(c, material).precio;
                                    if (Math.abs((a.precioUnit||0)-actual) < 0.001) return null;
                                    return (
                                      <span style={{fontFamily:"var(--font-mono)",
                                        fontSize:".55rem",color:"var(--amber)",
                                        marginLeft:".3rem",fontWeight:700}}>
                                        → {fmtEur(actual)}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td style={{textAlign:"right",padding:".3rem .4rem",
                                  fontWeight:700,color:"var(--cyan)"}}>
                                  {fmtEur(a.esFijo?(a.costeTotal||0):a.cantidad*(a.precioUnit||0))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Factura */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                      <div style={{padding:".55rem .7rem",borderRadius:8,
                        background:"var(--surface2)",border:"1px solid var(--border)"}}>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                          color:"var(--text-muted)",marginBottom:".25rem"}}>
                          📅 Entrega esperada
                        </div>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:".75rem",fontWeight:700}}>
                          {p.fechaEntrega||"—"}
                        </div>
                      </div>
                      <div style={{padding:".55rem .7rem",borderRadius:8,
                        background: p.factura?.numero?"var(--green-dim)":"var(--surface2)",
                        border:`1px solid ${p.factura?.numero?"rgba(52,211,153,.25)":"var(--border)"}`}}>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                          color:"var(--text-muted)",marginBottom:".25rem"}}>
                          🧾 Factura
                        </div>
                        {p.factura?.numero ? (
                          <div>
                            <div style={{fontFamily:"var(--font-mono)",fontSize:".72rem",fontWeight:700}}>
                              {p.factura.numero}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:".4rem",marginTop:".1rem"}}>
                              <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",
                                color:"var(--text-muted)"}}>
                                {fmtEur(p.factura.importe)}
                              </span>
                              {desvPct!==null && Math.abs(desvPct)>0.5 && (
                                <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                                  color:desvPct>0?"var(--red)":"var(--green)",fontWeight:700}}>
                                  {desvPct>0?"+":""}{desvPct.toFixed(1)}% vs estimado
                                </span>
                              )}
                              {desvPct!==null && Math.abs(desvPct)<=0.5 && (
                                <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                                  color:"var(--green)",fontWeight:700}}>✓ Sin desviación</span>
                              )}
                            </div>
                            <div style={{marginTop:".15rem"}}>
                              {ESTADOS_FACTURA.map(e => (
                                <span key={e.id} style={{
                                  fontFamily:"var(--font-mono)",fontSize:".58rem",
                                  padding:".08rem .35rem",borderRadius:3,marginRight:".25rem",
                                  fontWeight:700,cursor:"pointer",
                                  background: p.factura.estado===e.id ? e.color+"22" : "transparent",
                                  color: p.factura.estado===e.id ? e.color : "var(--text-dim)",
                                  border:`1px solid ${p.factura.estado===e.id?e.color+"44":"transparent"}`,
                                }} onClick={()=>{
                                  const upd={...p,factura:{...p.factura,estado:e.id}};
                                  setPedidos(prev=>prev.map(x=>x.id===p.id?upd:x));
                                }}>{e.label}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{fontFamily:"var(--font-mono)",fontSize:".68rem",
                            color:"var(--text-dim)"}}>Sin factura registrada</div>
                        )}
                      </div>
                    </div>

                    {/* Notas */}
                    {p.notas && (
                      <div style={{fontFamily:"var(--font-mono)",fontSize:".65rem",
                        color:"var(--text-muted)",padding:".4rem .6rem",
                        background:"var(--surface2)",borderRadius:6,
                        borderLeft:"2px solid var(--border)"}}>
                        {p.notas}
                      </div>
                    )}

                    {/* Acciones — estado a la izquierda, editar/borrar a la derecha */}
                    <div style={{display:"flex",gap:".4rem",
                      paddingTop:".25rem",borderTop:"1px solid var(--border)",
                      flexWrap:"wrap",alignItems:"center"}}>
                      {/* Segmented control de estado */}
                      <div style={{display:"flex",background:"var(--surface2)",
                        border:"1px solid var(--border)",borderRadius:7,overflow:"hidden",
                        flex:"1 1 auto"}}>
                        {ESTADOS_PEDIDO.map(e => (
                          <button key={e.id}
                            style={{flex:1,padding:".28rem .35rem",border:"none",
                              cursor:"pointer",fontFamily:"var(--font-mono)",
                              fontSize:".58rem",fontWeight:700,whiteSpace:"nowrap",
                              background: p.estado===e.id ? e.bg : "transparent",
                              color: p.estado===e.id ? e.color : "var(--text-dim)",
                              transition:"background .12s,color .12s",
                            }}
                            onClick={()=>setPedidos(prev=>prev.map(x=>x.id===p.id?{...x,estado:e.id}:x))}>
                            {e.label}
                          </button>
                        ))}
                      </div>
                      {/* Editar + Eliminar */}
                      <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
                        <button
                          style={{display:"flex",alignItems:"center",justifyContent:"center",
                            width:36,height:36,borderRadius:7,cursor:"pointer",
                            background:"var(--surface3)",border:"1px solid var(--border)",
                            color:"var(--text-muted)",fontSize:".78rem"}}
                          title="Editar pedido"
                          onClick={()=>abrirEditar(p)}>✏️</button>
                        <button
                          style={{display:"flex",alignItems:"center",justifyContent:"center",
                            width:36,height:36,borderRadius:7,cursor:"pointer",
                            background:"rgba(248,113,113,.1)",
                            border:"1px solid rgba(248,113,113,.25)",
                            color:"var(--red)",fontSize:".78rem",fontWeight:700}}
                          title="Eliminar pedido"
                          onClick={()=>setDelId(p.id)}>✕</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuevo/editar */}
      {modal && modal !== "nuevo" && typeof modal === "object" && (
        <ModalPedidoProv
          data={modal._sugerido ? null : modal}
          sugerido={modal._sugerido ? modal : null}
          proveedores={proveedores}
          material={material}
          conceptosPres={conceptosPres}
          onSave={guardar}
          onClose={()=>setModal(null)}
        />
      )}
      {modal === "nuevo" && (
        <ModalPedidoProv
          data={null} sugerido={null}
          proveedores={proveedores}
          material={material}
          conceptosPres={conceptosPres}
          onSave={guardar}
          onClose={()=>setModal(null)}
        />
      )}

      {/* Confirmar eliminar */}
      {delId && (
        <div className="modal-backdrop" style={{zIndex:200}}
          onClick={e=>e.target===e.currentTarget&&setDelId(null)}>
          <div className="modal" style={{maxWidth:320,textAlign:"center"}}>
            <div className="modal-body" style={{paddingTop:"1.5rem"}}>
              <div style={{fontSize:"2rem",marginBottom:".5rem"}}>⚠️</div>
              <div style={{fontWeight:700}}>¿Eliminar pedido?</div>
              <div className="mono xs muted">Esta acción no se puede deshacer.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setDelId(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={eliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Panel de sugerencias simples: dorsales + avituallamiento ──────────────────
function SugerenciasSimples({ inscritos, totalInscritos, conceptoDorsal, precioDorsal, conceptosAvit, precioAvitTotal, pedidos, onCrear }) {
  const [colapsado, setColapsado] = useState(true); // colapsado por defecto para no saturar
  const baseTotal = totalInscritos || 0;

  const yaTieneDorsal = pedidos.some(p =>
    p.articulos?.some(a => /dorsal/i.test(a.nombre)) && p.estado !== "borrador"
  );
  const yaTieneAvit = pedidos.some(p =>
    p.articulos?.some(a => /avituall|nutrición|agua/i.test(a.nombre)) && p.estado !== "borrador"
  );

  const sugerencias = [
    conceptoDorsal && {
      key: "dorsal",
      icon: "🔢",
      label: "Dorsales",
      cantidad: baseTotal,
      precio: precioDorsal,
      concepto: conceptoDorsal,
      yaConfirmado: yaTieneDorsal,
    },
    ...conceptosAvit.map(c => ({
      key: c.id,
      icon: "🍎",
      label: c.nombre,
      cantidad: baseTotal,
      precio: calcPrecioUnitario(c, []).precio,
      concepto: c,
      yaConfirmado: yaTieneAvit,
    })),
  ].filter(Boolean);

  if (!sugerencias.length) return null;

  return (
    <div className="card mb" style={{padding:0,overflow:"hidden",
      borderLeft:"3px solid var(--cyan)",marginBottom:".5rem"}}>
      <button
        onClick={() => setColapsado(v => !v)}
        style={{width:"100%",display:"flex",alignItems:"center",gap:".65rem",
          padding:".7rem .9rem",background:"rgba(34,211,238,.04)",
          border:"none",cursor:"pointer",textAlign:"left"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:".82rem"}}>
            📦 Sugerencias — Dorsales y Avituallamiento
          </div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
            color:"var(--text-muted)",marginTop:".1rem"}}>
            {sugerencias.length} concepto{sugerencias.length!==1?"s":""} · {baseTotal} corredores base
          </div>
        </div>
        <span style={{fontFamily:"var(--font-mono)",fontSize:".7rem",
          color:"var(--text-dim)",flexShrink:0,
          transform:colapsado?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
      </button>

      {!colapsado && (
        <div style={{borderTop:"1px solid var(--border)",padding:".75rem .9rem",
          display:"flex",flexDirection:"column",gap:".5rem"}}>
          {sugerencias.map(sg => (
            <div key={sg.key} style={{
              display:"flex",alignItems:"center",gap:".75rem",
              padding:".55rem .75rem",borderRadius:8,
              background:"var(--surface2)",border:"1px solid var(--border)",
              flexWrap:"wrap"}}>
              <span style={{fontSize:"1.2rem",flexShrink:0}}>{sg.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:".78rem"}}>{sg.label}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
                  color:"var(--text-muted)",marginTop:".1rem"}}>
                  {sg.cantidad} ud
                  {sg.precio > 0 && ` · ${fmtEur(sg.precio)}/ud = ${fmtEur(sg.cantidad * sg.precio)}`}
                  {sg.precio === 0 && " · precio no configurado en presupuesto"}
                </div>
              </div>
              {sg.yaConfirmado ? (
                <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
                  padding:".1rem .4rem",borderRadius:4,fontWeight:700,
                  background:"var(--green-dim)",color:"var(--green)",
                  border:"1px solid rgba(52,211,153,.2)",flexShrink:0}}>
                  ✓ Pedido confirmado
                </span>
              ) : (
                <button
                  className="btn btn-sm"
                  style={{background:"rgba(34,211,238,.15)",color:"var(--cyan)",
                    border:"1px solid rgba(34,211,238,.3)",fontSize:".6rem",
                    flexShrink:0,whiteSpace:"nowrap"}}
                  onClick={() => onCrear({
                    _sugerido: true,
                    nombre: `Pedido ${sg.label}`,
                    articulos: [{
                      nombre: sg.label,
                      cantidad: sg.cantidad,
                      precioUnit: sg.precio,
                      conceptoId: sg.concepto?.id || null,
                      esFijo: false,
                    }],
                    importeEstimado: sg.cantidad * sg.precio,
                    importeTotal: sg.cantidad * sg.precio,
                    estado: "borrador",
                    fechaEntrega: "", proveedor: "",
                    notas: `Generado automáticamente. Base: ${baseTotal} corredores.`,
                    factura: null,
                  })}>
                  Crear pedido →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Panel de sugerencias automáticas de medallas ──────────────────────────────
function SugerenciasMedallas({ inscritos, totalInscritos, precioMedalla, conceptoMedalla, pedidos, onCrear, onEliminar }) {
  const [margen, setMargen]       = useState(20);
  const [modo,   setModo]         = useState("fijo");
  const [collapsed, setCollapsed] = useState(false);

  const baseTotal       = totalInscritos || 0;
  const extra           = modo === "pct" ? Math.ceil(baseTotal * margen / 100) : margen;
  const cantidadSugerida = baseTotal + extra;
  const costeEstimado    = cantidadSugerida * precioMedalla;

  const pedidoExistente = pedidos.find(p =>
    p.articulos?.some(a => /medalla/i.test(a.nombre)) && p.estado !== "borrador"
  );

  // El pedido sugerido guardado (si existe en la lista)
  const pedidoGuardado = pedidos.find(p => p._esSugerido);

  return (
    <div className="card mb" style={{padding:0,overflow:"hidden",
      borderLeft:"3px solid var(--amber)",marginBottom:".5rem"}}>

      {/* ── Cabecera — mismo patrón que pedidos guardados ── */}
      <div style={{
        display:"flex", alignItems:"center", gap:".65rem",
        padding:".7rem .9rem", cursor:"pointer",
        background:"rgba(251,191,36,.04)",
      }} onClick={()=>setCollapsed(v=>!v)}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
            <span style={{fontWeight:700,fontSize:".82rem"}}>
              🏅 Sugerencia — Medallas finisher
            </span>
            {pedidoExistente && (
              <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                padding:".1rem .4rem",borderRadius:4,fontWeight:700,
                background:"var(--green-dim)",color:"var(--green)",
                border:"1px solid rgba(52,211,153,.2)"}}>
                ✓ Pedido confirmado
              </span>
            )}
          </div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
            color:"var(--text-muted)",marginTop:".1rem"}}>
            {baseTotal} inscritos · sugerido: {cantidadSugerida} ud
            {precioMedalla > 0 && ` · ${fmtEur(costeEstimado)} estimado`}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          {precioMedalla > 0 ? (
            <div style={{fontFamily:"var(--font-mono)",fontWeight:800,
              fontSize:".85rem",color:"var(--amber)"}}>
              {fmtEur(costeEstimado)}
            </div>
          ) : (
            <div style={{fontFamily:"var(--font-mono)",fontSize:".68rem",
              color:"var(--text-dim)"}}>sin precio</div>
          )}
          <span style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
            padding:".1rem .4rem",borderRadius:4,
            background:"rgba(251,191,36,.15)",color:"var(--amber)",fontWeight:700}}>
            Sugerido
          </span>
        </div>
        <span style={{color:"var(--text-dim)",fontSize:".75rem",flexShrink:0,
          transition:"transform .2s",transform:collapsed?"rotate(-90deg)":"rotate(0)"}}>
          ▼
        </span>
      </div>

      {/* ── Detalle colapsable ── */}
      {!collapsed && (
        <div style={{borderTop:"1px solid var(--border)",
          padding:".75rem .9rem",display:"flex",flexDirection:"column",gap:".65rem"}}>

          {/* Desglose por distancia */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:".4rem"}}>
            {["TG7","TG13","TG25"].map(d => (
              <div key={d} style={{padding:".45rem .6rem",borderRadius:7,
                background:"var(--surface2)",border:"1px solid var(--border)",
                textAlign:"center"}}>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                  color:"var(--text-muted)",marginBottom:".1rem"}}>{d}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"1rem",
                  fontWeight:800,color:"var(--amber)"}}>{inscritos?.[d]||0}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",
                  color:"var(--text-dim)"}}>inscritos</div>
              </div>
            ))}
          </div>

          {/* Margen */}
          <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
            <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",
              color:"var(--text-muted)",flexShrink:0}}>Margen extra:</span>
            <div style={{display:"flex",background:"var(--surface2)",
              border:"1px solid var(--border)",borderRadius:6,overflow:"hidden"}}>
              {[["fijo","ud"],["pct","%"]].map(([v,l])=>(
                <button key={v} onClick={e=>{e.stopPropagation();setModo(v);}}
                  style={{padding:".22rem .55rem",border:"none",cursor:"pointer",
                    fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,
                    background:modo===v?"rgba(251,191,36,.2)":"transparent",
                    color:modo===v?"var(--amber)":"var(--text-muted)"}}>
                  {l}
                </button>
              ))}
            </div>
            <input type="number" min="0" max={modo==="pct"?100:500} value={margen}
              onClick={e=>e.stopPropagation()}
              onChange={e=>setMargen(Math.max(0,parseInt(e.target.value)||0))}
              style={{width:56,background:"var(--surface2)",border:"1px solid var(--border)",
                color:"var(--amber)",borderRadius:6,padding:".22rem .4rem",
                fontFamily:"var(--font-mono)",fontSize:".72rem",textAlign:"right",outline:"none"}}
            />
            <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",
              color:"var(--text-muted)"}}>
              {modo==="pct" ? `% = +${extra} ud` : "ud extra"}
            </span>
          </div>

          {/* Resumen */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            gap:"1rem",flexWrap:"wrap",padding:".55rem .75rem",borderRadius:8,
            background:"rgba(251,191,36,.06)",border:"1px solid rgba(251,191,36,.18)"}}>
            <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
              <div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                  color:"var(--text-muted)",textTransform:"uppercase",
                  letterSpacing:".06em",marginBottom:".15rem"}}>
                  BASE INSCRITOS
                </div>
                <div style={{fontFamily:"var(--font-mono)",fontWeight:800,fontSize:"1rem"}}>
                  {baseTotal}
                </div>
              </div>
              <div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                  color:"var(--text-muted)",textTransform:"uppercase",
                  letterSpacing:".06em",marginBottom:".15rem"}}>
                  + MARGEN
                </div>
                <div style={{fontFamily:"var(--font-mono)",fontWeight:800,fontSize:"1rem",
                  color:"var(--amber)"}}>
                  +{extra}
                </div>
              </div>
              <div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                  color:"var(--text-muted)",textTransform:"uppercase",
                  letterSpacing:".06em",marginBottom:".15rem"}}>
                  = PEDIR AL PROVEEDOR
                </div>
                <div style={{fontFamily:"var(--font-mono)",fontWeight:800,fontSize:"1rem",
                  color:"var(--cyan)"}}>
                  {cantidadSugerida}
                </div>
              </div>
              {precioMedalla > 0 && (
                <div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
                    color:"var(--text-muted)",textTransform:"uppercase",
                    letterSpacing:".06em",marginBottom:".15rem"}}>
                    COSTE ESTIMADO ({fmtEur(precioMedalla)}/UD)
                  </div>
                  <div style={{fontFamily:"var(--font-mono)",fontWeight:800,fontSize:"1rem",
                    color:"var(--amber)"}}>
                    {fmtEur(costeEstimado)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Acciones — mismo patrón que pedidos guardados */}
          <div style={{display:"flex",gap:".4rem",justifyContent:"flex-end",
            paddingTop:".25rem",borderTop:"1px solid var(--border)",flexWrap:"wrap"}}>
            <button className="btn btn-ghost btn-sm"
              style={{fontSize:".6rem",color:"var(--text-muted)"}}
              onClick={e=>{e.stopPropagation();setCollapsed(true);}}>
              Colapsar
            </button>
            <button className="btn btn-sm"
              style={{fontSize:".6rem",
                background:"rgba(251,191,36,.15)",color:"var(--amber)",
                border:"1px solid rgba(251,191,36,.3)",marginLeft:"auto"}}
              onClick={e=>{
                e.stopPropagation();
                onCrear({
                  _sugerido: true,
                  nombre:"Pedido medallas finisher",
                  articulos:[{
                    nombre:"Medalla finisher",
                    cantidad: cantidadSugerida,
                    precioUnit: precioMedalla,
                    esFijo: false,
                    notas:`Base: ${baseTotal} inscritos + ${extra} margen`
                  }],
                  importeEstimado: costeEstimado,
                  importeTotal: costeEstimado,
                  estado:"borrador",
                  fechaEntrega:"",
                  proveedor:"",
                  notas:`Generado automáticamente. Base: ${baseTotal} inscritos (TG7:${inscritos?.TG7||0} + TG13:${inscritos?.TG13||0} + TG25:${inscritos?.TG25||0}) + ${extra} ud de margen.`,
                  factura:null,
                });
              }}>
              Crear pedido con esta cantidad →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Modal crear/editar pedido ─────────────────────────────────────────────────
// Calcula el precio UNITARIO correcto de un concepto del presupuesto
// - Variable: costePorDistancia (ya es €/corredor)
// - Fijo con material vinculado: costeTotal ÷ stock del artículo
// - Fijo sin vínculo: 0 (el usuario debe introducirlo manualmente)
function calcPrecioUnitario(concepto, material=[]) {
  if (!concepto) return { precio:0, esFijo:false, costeTotal:0 };

  if (concepto.tipo === "variable") {
    // Variable: costePorDistancia ya es precio €/unidad (€/corredor)
    const dists = ["TG7","TG13","TG25"].filter(d =>
      concepto.activoDistancias?.[d] && (concepto.costePorDistancia?.[d]||0) > 0
    );
    if (!dists.length) return { precio: 0, esFijo: false, costeTotal: 0 };
    // Si es uniforme usar TG7, sino media de distancias activas
    const precio = concepto.modoUniforme
      ? (concepto.costePorDistancia?.TG7 || 0)
      : dists.reduce((s,d) => s + (concepto.costePorDistancia[d]||0), 0) / dists.length;
    return { precio, esFijo: false, costeTotal: 0 };
  }

  // Concepto FIJO: costeTotal es el precio del LOTE COMPLETO.
  // El precio unitario solo se puede conocer si hay un artículo de Material vinculado con stock.
  // Si no hay vínculo, precio=0 — el usuario lo introduce manualmente.
  const matVinculado = material.find(m => m.presupuestoConceptoId === concepto.id);
  const unidades = matVinculado?.stock || 0;
  if (unidades > 0) {
    return {
      precio: concepto.costeTotal / unidades,
      esFijo: true,
      costeTotal: concepto.costeTotal,
      unidades,
    };
  }
  // Sin vínculo: precio unitario desconocido → el usuario lo introduce
  return { precio: 0, esFijo: true, costeTotal: concepto.costeTotal, unidades: 0 };
}

function ModalPedidoProv({ data, sugerido, proveedores, onSave, onClose, material=[], conceptosPres=[] }) {
  const esEdit = !!data?.id;
  const [form, setForm] = useState(() => {
    if (data) return { ...data, articulos: (data.articulos||[]).map(a=>({...a})) };
    if (sugerido) return {
      nombre: sugerido.nombre||"",
      proveedor: sugerido.proveedor||"",
      articulos: (sugerido.articulos||[]).map(a=>({...a})),
      importeEstimado: sugerido.importeEstimado||0,
      importeTotal: sugerido.importeTotal||0,
      estado: "borrador",
      fechaEntrega: sugerido.fechaEntrega||"",
      notas: sugerido.notas||"",
      factura: null,
    };
    return {
      nombre:"", proveedor:"", articulos:[{nombre:"",cantidad:1,precioUnit:0}],
      importeEstimado:0, importeTotal:0, estado:"borrador",
      fechaEntrega:"", notas:"", factura:null,
    };
  });

  const upd = (k,v) => setForm(p=>({...p,[k]:v}));
  const updArt = (i,k,v) => setForm(p=>({
    ...p,
    articulos: p.articulos.map((a,j) => j===i ? {...a,[k]:v} : a)
  }));
  const addArt    = () => setForm(p=>({...p,articulos:[...p.articulos,{nombre:"",cantidad:1,precioUnit:0,fuente:"manual"}]}));
  const addArtDef = (def) => setForm(p=>({...p,articulos:[...p.articulos,def]}));
  const delArt = (i) => setForm(p=>({...p,articulos:p.articulos.filter((_,j)=>j!==i)}));

  // Recalcular importe total cuando cambian los artículos
  const importeCalc = form.articulos.reduce((s,a)=>s+(a.esFijo?(a.costeTotal||0):a.cantidad*(a.precioUnit||0)),0);

  const guardar = () => {
    if (!form.nombre.trim()) return;
    onSave({...form, importeTotal: importeCalc, importeEstimado: form.importeEstimado||importeCalc });
  };

  const updFactura = (k,v) => upd("factura", {...(form.factura||{}), [k]:v });

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:520}}>
        <div className="modal-header">
          <span className="modal-title">{esEdit?"✏️ Editar pedido":"🛒 Nuevo pedido"}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{gap:".65rem"}}>

          {/* Datos básicos */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
            <div style={{gridColumn:"1/-1"}}>
              <label className="fl">Nombre del pedido *</label>
              <input className="inp" value={form.nombre}
                onChange={e=>upd("nombre",e.target.value)}
                placeholder="ej. Medallas finisher 2026" />
            </div>
            <div>
              <label className="fl">Proveedor</label>
              <select className="inp" value={form.proveedor}
                onChange={e=>upd("proveedor",e.target.value)}>
                <option value="">Sin asignar</option>
                {proveedores.map(p=>(
                  <option key={p.id} value={p.nombre}>{p.nombre}</option>
                ))}
                <option value="__otro__">Otro (escribir abajo)</option>
              </select>
            </div>
            <div>
              <label className="fl">Fecha entrega esperada</label>
              <input className="inp" type="date" value={form.fechaEntrega}
                onChange={e=>upd("fechaEntrega",e.target.value)} />
            </div>
          </div>

          {/* Artículos — selector dual material / presupuesto */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:".4rem"}}>
              <label className="fl" style={{margin:0}}>Artículos</label>
              <div style={{display:"flex",gap:".3rem"}}>
                <button className="btn btn-ghost btn-sm"
                  style={{fontSize:".6rem",color:"var(--cyan)"}}
                  onClick={()=>{
                    // Añadir desde inventario de Material
                    const mat=material&&material.length>0?material[0]:null;
                    const concepto=mat?.presupuestoConceptoId
                      ? conceptosPres.find(c=>c.id===mat.presupuestoConceptoId) : null;
                    const { precio, esTotal } = concepto
                      ? calcPrecioUnitario(concepto, material)
                      : { precio: 0, esTotal: false };
                    addArtDef({nombre:mat?.nombre||"",materialId:mat?.id||null,
                      cantidad:1,precioUnit:precio,esTotal,fuente:"material"});
                  }}>
                  + de Inventario
                </button>
                <button className="btn btn-ghost btn-sm"
                  style={{fontSize:".6rem",color:"var(--violet)"}}
                  onClick={()=>{
                    const c=conceptosPres&&conceptosPres.length>0?conceptosPres[0]:null;
                    const { precio:precioC, esFijo:esFijoC, costeTotal:ct } = c
                      ? calcPrecioUnitario(c, material)
                      : { precio:0, esFijo:false };
                    addArtDef({nombre:c?.nombre||"",conceptoId:c?.id||null,
                      cantidad:1,precioUnit:precioC,esFijo:esFijoC,
                      costeTotal:ct,fuente:"presupuesto"});
                  }}>
                  + de Presupuesto
                </button>
                <button className="btn btn-ghost btn-sm"
                  style={{fontSize:".6rem"}}
                  onClick={()=>addArtDef({nombre:"",cantidad:1,precioUnit:0,fuente:"manual"})}>
                  + Manual
                </button>
              </div>
            </div>
            {form.articulos.map((a,i)=>(
              <div key={i} style={{background:"var(--surface2)",borderRadius:7,
                padding:".5rem .65rem",marginBottom:".4rem",
                borderLeft:`3px solid ${a.fuente==="material"?"var(--cyan)":a.fuente==="presupuesto"?"var(--violet)":"var(--border)"}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 28px",
                  gap:".35rem",alignItems:"end",marginBottom:".3rem"}}>
                  <div>
                    <label className="fl" style={{display:"flex",alignItems:"center",gap:".3rem"}}>
                      Artículo
                      {a.fuente==="material" && <span style={{fontFamily:"var(--font-mono)",fontSize:".5rem",padding:".06rem .3rem",borderRadius:10,background:"var(--cyan-dim)",color:"var(--cyan)"}}>📦 Inventario</span>}
                      {a.fuente==="presupuesto" && <span style={{fontFamily:"var(--font-mono)",fontSize:".5rem",padding:".06rem .3rem",borderRadius:10,background:"var(--violet-dim)",color:"var(--violet)"}}>💰 Presupuesto</span>}
                    </label>
                    {a.fuente==="material" && material.length>0 ? (
                      <select className="inp inp-sm" value={a.materialId||""}
                        onChange={e=>{
                          const mat=material.find(m=>m.id===parseInt(e.target.value));
                          const concepto=mat?.presupuestoConceptoId
                            ? conceptosPres.find(c=>c.id===mat.presupuestoConceptoId) : null;
                          const { precio:precioM, esFijo:esFijoM } = concepto
                            ? calcPrecioUnitario(concepto, material)
                            : { precio: a.precioUnit, esFijo: false };
                          updArt(i,"materialId",parseInt(e.target.value));
                          updArt(i,"nombre",mat?.nombre||"");
                          updArt(i,"esFijo",esFijoM);
                          if(precioM>0) updArt(i,"precioUnit",precioM);
                        }}>
                        {material.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    ) : a.fuente==="presupuesto" && conceptosPres.length>0 ? (
                      <select className="inp inp-sm" value={a.conceptoId||""}
                        onChange={e=>{
                          const c=conceptosPres.find(cc=>cc.id===parseInt(e.target.value));
                          const { precio:precioP, esFijo:esFijoP, costeTotal:ctP } = c
                            ? calcPrecioUnitario(c, material)
                            : { precio:0, esFijo:false };
                          updArt(i,"conceptoId",parseInt(e.target.value));
                          updArt(i,"nombre",c?.nombre||"");
                          updArt(i,"esFijo",esFijoP);
                          updArt(i,"costeTotal",ctP);
                          updArt(i,"precioUnit",precioP);
                        }}>
                        {conceptosPres.map(c=><option key={c.id} value={c.id}>[{c.tipo==="variable"?"var":"fijo"}] {c.nombre}</option>)}
                      </select>
                    ) : (
                      <input className="inp inp-sm" value={a.nombre}
                        onChange={e=>updArt(i,"nombre",e.target.value)}
                        placeholder="Nombre del artículo" />
                    )}
                  </div>
                  <div>
                    <label className="fl">Cant.</label>
                    <input className="inp inp-sm inp-mono" type="number" min="1"
                      value={a.cantidad}
                      onChange={e=>{
                        const qty = Math.max(1,parseInt(e.target.value)||1);
                        updArt(i,"cantidad", qty);
                        // Para conceptos fijos: precio unitario = costeTotal / cantidad
                        if (a.esFijo && (a.costeTotal||0) > 0) {
                          updArt(i,"precioUnit", (a.costeTotal||0) / qty);
                        }
                      }} />
                  </div>
                  <div>
                    <label className="fl" style={{color:a.esFijo?"var(--amber)":undefined}}>
                      {a.esFijo ? "Total lote (€)" : "€/ud"}
                    </label>
                    <input className="inp inp-sm inp-mono" type="number" min="0" step="0.01"
                      value={a.esFijo ? (a.costeTotal||0) : a.precioUnit}
                      style={{borderColor: a.esFijo?"rgba(251,191,36,.4)":undefined}}
                      onChange={e => {
                        const v = parseFloat(e.target.value)||0;
                        if (a.esFijo) {
                          // Para fijos: guardar el total y recalcular precio unitario
                          updArt(i,"costeTotal", v);
                          updArt(i,"precioUnit", a.cantidad > 0 ? v / a.cantidad : 0);
                        } else {
                          updArt(i,"precioUnit", v);
                        }
                      }} />
                  </div>
                  <button className="btn btn-red btn-sm"
                    style={{marginBottom:1,padding:".25rem .4rem"}}
                    disabled={form.articulos.length<=1}
                    onClick={()=>delArt(i)}>✕</button>
                </div>

                <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
                  color:"var(--text-muted)",display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginTop:".1rem"}}>
                  {a.esFijo && (
                    <span style={{color:"var(--amber)",fontSize:".58rem"}}>
                      💡 Coste total fijo — €/ud se calcula automáticamente
                      ({a.cantidad>0?fmtEur((a.costeTotal||0)/a.cantidad):"—"}/ud × {a.cantidad} ud)
                    </span>
                  )}
                  <span style={{marginLeft:"auto"}}>
                    Subtotal: {fmtEur(a.esFijo ? (a.costeTotal||0) : a.cantidad*(a.precioUnit||0))}
                  </span>
                </div>
              </div>
            ))}
            <div style={{textAlign:"right",fontFamily:"var(--font-mono)",
              fontSize:".72rem",fontWeight:800,color:"var(--cyan)",marginTop:".35rem"}}>
              Total pedido: {fmtEur(importeCalc)}
            </div>
          </div>

          {/* Factura */}
          <div style={{borderTop:"1px solid var(--border)",paddingTop:".6rem"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,
              color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".06em",
              marginBottom:".4rem"}}>🧾 Factura (opcional)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem"}}>
              <div>
                <label className="fl">Nº factura</label>
                <input className="inp inp-sm inp-mono"
                  value={form.factura?.numero||""}
                  onChange={e=>updFactura("numero",e.target.value)}
                  placeholder="FAC-2026-001" />
              </div>
              <div>
                <label className="fl">Importe real (€)</label>
                <input className="inp inp-sm inp-mono" type="number" min="0" step="0.01"
                  value={form.factura?.importe||""}
                  onChange={e=>updFactura("importe",parseFloat(e.target.value)||0)}
                  placeholder={fmtEur(importeCalc)} />
              </div>
              <div>
                <label className="fl">Estado de pago</label>
                <select className="inp inp-sm"
                  value={form.factura?.estado||"pendiente"}
                  onChange={e=>updFactura("estado",e.target.value)}>
                  {ESTADOS_FACTURA.map(e=>(
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="fl">Fecha factura</label>
                <input className="inp inp-sm" type="date"
                  value={form.factura?.fecha||""}
                  onChange={e=>updFactura("fecha",e.target.value)} />
              </div>
            </div>
            {form.factura?.importe > 0 && importeCalc > 0 && (
              <div style={{marginTop:".4rem",fontFamily:"var(--font-mono)",
                fontSize:".62rem",color:"var(--text-muted)"}}>
                Desviación vs estimado:{" "}
                <span style={{fontWeight:700,
                  color: Math.abs(form.factura.importe-importeCalc)<0.01
                    ? "var(--green)"
                    : form.factura.importe > importeCalc ? "var(--red)" : "var(--green)"}}>
                  {form.factura.importe > importeCalc ? "+" : ""}
                  {fmtEur(form.factura.importe - importeCalc)}
                  {" "}({((form.factura.importe-importeCalc)/importeCalc*100).toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="fl">Notas</label>
            <textarea className="inp" rows={2} value={form.notas}
              onChange={e=>upd("notas",e.target.value)}
              placeholder="Condiciones, contacto del proveedor, observaciones…" />
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary"
            disabled={!form.nombre.trim()}
            style={{opacity:form.nombre.trim()?1:.5}}
            onClick={guardar}>
            {esEdit?"Guardar cambios":"Crear pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
