import { useState, useMemo, useCallback, useEffect } from "react";
import { useData } from "@/lib/dataService";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LS = "teg_logistica_v1";
const genId = (arr) => arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;

const CATS_MATERIAL = ["Avituallamiento","Señalización","Seguridad","Comunicación","Médico","Organización","Infraestructura"];
const CAT_ICONS = { Avituallamiento:"🍎", Señalización:"🚩", Seguridad:"🦺", Comunicación:"📡", Médico:"🏥", Organización:"📋", Infraestructura:"⛺" };
const CAT_COLORS = { Avituallamiento:"#34d399", Señalización:"#fbbf24", Seguridad:"#fb923c", Comunicación:"#22d3ee", Médico:"#f87171", Organización:"#a78bfa", Infraestructura:"#60a5fa" };
const ESTADO_ENTREGA = ["pendiente","en tránsito","entregado","recogido"];
const ESTADO_TAREA = ["pendiente","en curso","completado","bloqueado"];
const ESTADO_COLORES = { pendiente:"#fbbf24","en tránsito":"#22d3ee",entregado:"#34d399",recogido:"#5a6a8a","en curso":"#22d3ee",completado:"#34d399",bloqueado:"#f87171" };
const FASES_CHECKLIST = ["Semana antes","Día antes","Mañana carrera","Durante carrera","Post-carrera"];
const PUESTOS_REF = ["Zona Salida/Meta","Avituallamiento KM 4","Avituallamiento KM 9","Avituallamiento KM 16","Control KM 7","Control KM 13","Seguridad Cruce 1","Seguridad Cruce 2","Señalización Ruta Alta","Parking","Zona Llegada/Trofeos","Primeros Auxilios Base"];

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
  const [saved, setSaved] = useState(false);
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);

  // useData handles saving automatically.

  const stats = useMemo(() => {
    const tlDone = tl.filter(t => t.estado==="completado").length;
    const ckDone = ck.filter(c => c.estado==="completado").length;
    const stockErr = material.filter(m => asigs.filter(a=>a.materialId===m.id).reduce((s,a)=>s+a.cantidad,0) > m.stock).length;
    const incOpen = inc.filter(i => i.estado==="abierta").length;
    return { tlDone, tlTotal:tl.length, ckDone, ckTotal:ck.length, stockErr, incOpen };
  }, [tl, ck, material, asigs, inc]);

  const TABS = [
    {id:"dashboard",icon:"📊",label:"Dashboard"},
    {id:"material",icon:"📦",label:"Material"},
    {id:"vehiculos",icon:"🚗",label:"Vehículos"},
    {id:"timeline",icon:"⏱️",label:"Timeline"},
    {id:"contactos",icon:"📡",label:"Comunicaciones"},
    {id:"checklist",icon:"✅",label:"Checklist"},
  ];

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
            <div className="block-title-sub">Módulo Operativo · Trail El Guerrero 2026</div>
          </div>
          <div className="block-actions">
            {stats.stockErr > 0 && <span className="badge badge-red" style={{cursor:"pointer"}} onClick={()=>setTab("material")}>⚠ {stats.stockErr} stock</span>}
            {stats.incOpen > 0 && <span className="badge badge-amber" style={{cursor:"pointer"}} onClick={()=>setTab("contactos")}>📡 {stats.incOpen} incidencias</span>}
            <span className="badge badge-cyan">✅ {stats.ckDone}/{stats.ckTotal}</span>
            <button className="btn btn-sm" style={{background:"rgba(248,113,113,0.1)",color:"var(--red)",border:"1px solid rgba(248,113,113,0.25)",fontFamily:"var(--font-mono)",fontSize:"0.62rem"}}
              onClick={()=>{setTab("contactos");}}>
              🚨 Emergencias
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={cls("tab-btn", tab===t.id && "active")} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
              {t.id==="checklist" && <span className="badge badge-cyan" style={{marginLeft:"0.3rem"}}>{stats.ckDone}/{stats.ckTotal}</span>}
              {t.id==="material" && stats.stockErr>0 && <span className="badge badge-red" style={{marginLeft:"0.3rem"}}>⚠{stats.stockErr}</span>}
              {t.id==="contactos" && stats.incOpen>0 && <span className="badge badge-amber" style={{marginLeft:"0.3rem"}}>{stats.incOpen}</span>}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div key={tab}>
          {tab==="dashboard" && <TabDash stats={stats} tl={tl} ck={ck} setTab={setTab} />}
          {tab==="material" && <TabMat material={material} setMaterial={setMaterial} asigs={asigs} setAsigs={setAsigs} setModal={setModal} setDel={setDel} />}
          {tab==="vehiculos" && <TabVeh veh={veh} setVeh={setVeh} rutas={rutas} setRutas={setRutas} setModal={setModal} setDel={setDel} />}
          {tab==="timeline" && <TabTL tl={tl} setTl={setTl} setModal={setModal} setDel={setDel} />}
          {tab==="contactos" && <TabCont cont={cont} setCont={setCont} inc={inc} setInc={setInc} setModal={setModal} setDel={setDel} />}
          {tab==="checklist" && <TabCK ck={ck} setCk={setCk} setModal={setModal} setDel={setDel} />}
        </div>
      </div>

      {modal && (
        <ModalRouter key={modal.tipo+(modal.data?.id||"n")} modal={modal} onClose={() => setModal(null)}
          material={material} setMaterial={setMaterial} asigs={asigs} setAsigs={setAsigs}
          veh={veh} setVeh={setVeh} rutas={rutas} setRutas={setRutas}
          tl={tl} setTl={setTl} cont={cont} setCont={setCont}
          inc={inc} setInc={setInc} ck={ck} setCk={setCk} />
      )}
      {del && (
        <div className="overlay" style={{zIndex:200}} onClick={e => e.target===e.currentTarget && setDel(null)}>
          <div className="modal" style={{maxWidth:340,textAlign:"center"}}>
            <div className="mbody" style={{paddingTop:"1.5rem"}}>
              <div style={{fontSize:"2.5rem",marginBottom:"0.6rem"}}>⚠️</div>
              <div style={{fontWeight:700,marginBottom:"0.4rem"}}>¿Eliminar elemento?</div>
              <div className="muted mono xs">Esta acción no se puede deshacer.</div>
            </div>
            <div className="mfoot"><button className="btn btn-ghost" onClick={() => setDel(null)}>Cancelar</button><button className="btn btn-red" onClick={doDelete}>Eliminar</button></div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function TabDash({ stats, tl, ck, setTab }) {
  const prox = [...tl].filter(t=>t.estado!=="completado").sort((a,b)=>a.hora.localeCompare(b.hora)).slice(0,6);
  const porFase = FASES_CHECKLIST.map(f => { const it=ck.filter(c=>c.fase===f); const d=it.filter(c=>c.estado==="completado").length; return {f,d,t:it.length,pct:it.length?Math.round(d/it.length*100):0}; });
  const diasHasta = Math.ceil((new Date("2026-08-29") - new Date()) / 86400000);
  const yaFue = diasHasta < 0;
  const esSemana = diasHasta >= 0 && diasHasta <= 7;

  const KPIS = [
    { l:"⏱️ Timeline",   v:`${stats.tlDone}/${stats.tlTotal}`,
      s:"tareas completadas",
      color: stats.tlDone===stats.tlTotal && stats.tlTotal>0 ? "green" : "cyan",
      tab:"timeline" },
    { l:"✅ Checklist",  v:`${Math.round(stats.ckDone/Math.max(stats.ckTotal,1)*100)}%`,
      s:`${stats.ckDone} de ${stats.ckTotal} ítems`,
      color: stats.ckDone===stats.ckTotal && stats.ckTotal>0 ? "green" : "cyan",
      tab:"checklist" },
    { l:"📦 Stock",      v:stats.stockErr,
      s:"materiales en déficit",
      color: stats.stockErr>0 ? "red" : "green",
      tab:"material" },
    { l:"⚠️ Incidencias", v:stats.incOpen,
      s:"abiertas sin resolver",
      color: stats.incOpen>0 ? "red" : "green",
      tab:"contactos" },
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
            <div className="kpi-label">{k.l}</div>
            <div className="kpi-value">{k.v}</div>
            <div className="kpi-sub">{k.s}</div>
            <div className="log-kpi-arrow">→ ver detalle</div>
          </div>
        ))}
      </div>

      {/* ── Countdown hero compacto ── */}
      <div className="card mb log-hero" style={{
        background: esSemana
          ? "linear-gradient(135deg,rgba(248,113,113,0.08),rgba(248,113,113,0.03))"
          : "linear-gradient(135deg,rgba(34,211,238,0.06),rgba(167,139,250,0.04))",
        borderColor: esSemana ? "rgba(248,113,113,0.3)" : "var(--border)",
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"0.75rem"}}>
          <div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:"0.55rem",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.2rem"}}>
              🏔️ Trail El Guerrero 2026 · Candeleda, Ávila
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
              <div className="tld" style={{background:TLC[t.categoria]||"#5a6a8a"}} />
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
function TabMat({material,setMaterial,asigs,setAsigs,setModal,setDel}) {
  const [vistaAsig,setVistaAsig]=useState(false);
  const [cat,setCat]=useState("todas");
  const [ordenAlfa,setOrdenAlfa]=useState(false);
  const ms=useMemo(()=>material.map(m=>{const a=asigs.filter(x=>x.materialId===m.id);const asig=a.reduce((s,x)=>s+x.cantidad,0);const ent=a.filter(x=>x.estado==="entregado").reduce((s,x)=>s+x.cantidad,0);return{...m,asig,ent,def:Math.max(asig-m.stock,0)}}),[material,asigs]);
  const mf=useMemo(()=>{
    let list=cat==="todas"?ms:ms.filter(m=>m.categoria===cat);
    if(ordenAlfa) list=[...list].sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es"));
    return list;
  },[ms,cat,ordenAlfa]);
  return(
    <>
      <div className="ph">
        <div><div className="pt">📦 Inventario de Material</div><div className="pd">{material.length} artículos · {asigs.length} asignaciones</div></div>
        <div className="fr g1">
          <button className={cls("btn",!vistaAsig?"btn-cyan":"btn-ghost")} onClick={()=>setVistaAsig(false)}>
            Catálogo
            <span style={{marginLeft:"0.3rem",fontFamily:"var(--font-mono)",fontSize:"0.6rem",
              background:!vistaAsig?"rgba(0,0,0,0.15)":"var(--surface3)",
              padding:"0.05rem 0.35rem",borderRadius:3}}>{material.length}</span>
          </button>
          <button className={cls("btn",vistaAsig?"btn-cyan":"btn-ghost")} onClick={()=>setVistaAsig(true)}>
            Asignaciones
            <span style={{marginLeft:"0.3rem",fontFamily:"var(--font-mono)",fontSize:"0.6rem",
              background:vistaAsig?"rgba(0,0,0,0.15)":"var(--surface3)",
              padding:"0.05rem 0.35rem",borderRadius:3}}>{asigs.length}</span>
          </button>
          {!vistaAsig && (
            <button className={cls("btn btn-sm",ordenAlfa?"btn-cyan":"btn-ghost")}
              onClick={()=>setOrdenAlfa(v=>!v)} title={ordenAlfa?"Quitar orden A-Z":"Ordenar A-Z"}>
              {ordenAlfa?"A-Z ✓":"A-Z"}
            </button>
          )}
          <button className="btn btn-cyan" onClick={()=>setModal({tipo:vistaAsig?"asig":"mat"})}>+ Añadir</button>
        </div>
      </div>
      {!vistaAsig?(
        <>
          <div className="chips">
            <button className={cls("chip",cat==="todas"&&"ca")} onClick={()=>setCat("todas")}>Todas</button>
            {CATS_MATERIAL.map(c=><button key={c} className={cls("chip",cat===c&&"ca")} onClick={()=>setCat(c)} style={cat===c?{borderColor:CAT_COLORS[c],color:CAT_COLORS[c],background:`${CAT_COLORS[c]}18`}:{}}>{CAT_ICONS[c]} {c}</button>)}
          </div>
          <div className="card p0"><div className="ox"><table className="tbl">
            <thead><tr><th>Material</th><th>Categoría</th><th className="tr">Stock</th><th className="tr">Asignado</th><th className="tr">Entregado</th><th className="tr">Déficit</th><th></th></tr></thead>
            <tbody>{mf.map(m=>(
              <tr key={m.id} className={m.def>0?"ra":""}>
                <td className="f6">{m.nombre}</td>
                <td><span className="badge" style={{background:`${CAT_COLORS[m.categoria]}18`,color:CAT_COLORS[m.categoria],border:`1px solid ${CAT_COLORS[m.categoria]}33`}}>{CAT_ICONS[m.categoria]} {m.categoria}</span></td>
                <td className="tr mono">{m.stock} {m.unidad}</td>
                <td className="tr mono" style={{color:m.asig>0?"var(--cyan)":"var(--text-muted)"}}>{m.asig} {m.unidad}</td>
                <td className="tr mono" style={{color:"var(--green)"}}>{m.ent} {m.unidad}</td>
                <td className="tr mono">{m.def>0?<span style={{color:"var(--red)",fontWeight:700}}>-{m.def}</span>:<span style={{color:"var(--text-dim)"}}>—</span>}</td>
                <td><div className="fr g1"><button className="btn btn-sm btn-ghost" onClick={()=>setModal({tipo:"mat",data:m})}>✏️</button><button className="btn btn-sm btn-red" onClick={()=>setDel({tipo:"material",id:m.id})}>✕</button></div></td>
              </tr>
            ))}</tbody>
          </table></div></div>
        </>
      ):(
        <div className="card p0"><div className="ox"><table className="tbl">
          <thead><tr><th>Material</th><th>Puesto destino</th><th className="tr">Cantidad</th><th>Estado</th><th></th></tr></thead>
          <tbody>{asigs.map(a=>{const m=material.find(x=>x.id===a.materialId);return(
            <tr key={a.id}>
              <td className="f6">{m?.nombre||"—"}</td>
              <td><span className="pbadge">{a.puesto}</span></td>
              <td className="tr mono">{a.cantidad} {m?.unidad}</td>
              <td><select className="isml" value={a.estado} onChange={e=>setAsigs(p=>p.map(x=>x.id===a.id?{...x,estado:e.target.value}:x))} style={{color:ESTADO_COLORES[a.estado]}}>{ESTADO_ENTREGA.map(s=><option key={s} value={s}>{s}</option>)}</select></td>
              <td><div className="fr g1"><button className="btn btn-sm btn-ghost" onClick={()=>setModal({tipo:"asig",data:a})}>✏️</button><button className="btn btn-sm btn-red" onClick={()=>setDel({tipo:"asig",id:a.id})}>✕</button></div></td>
            </tr>
          );})}
          </tbody>
        </table></div></div>
      )}
    </>
  );
}

// ─── VEHÍCULOS ────────────────────────────────────────────────────────────────
function TabVeh({veh,setVeh,rutas,setRutas,setModal,setDel}) {
  return(
    <>
      <div className="ph">
        <div><div className="pt">🚗 Vehículos y Rutas</div><div className="pd">{veh.length} vehículos · {rutas.length} rutas</div></div>
        <div className="fr g1">
          <button className="btn btn-cyan" onClick={()=>setModal({tipo:"veh"})}>+ Vehículo</button>
          <button className="btn btn-amber" onClick={()=>setModal({tipo:"ruta"})}>+ Ruta</button>
        </div>
      </div>
      <div className="twocol">
        <div>
          <div className="sl">Flota de vehículos</div>
          {veh.map(v=>(
            <div key={v.id} className="card vcard">
              <div className="vh"><div className="vi">🚐</div>
                <div style={{flex:1}}><div className="vn">{v.nombre}</div><div className="vm mono">{v.matricula}</div></div>
                <div className="fr g1"><button className="btn btn-sm btn-ghost" onClick={()=>setModal({tipo:"veh",data:v})}>✏️</button><button className="btn btn-sm btn-red" onClick={()=>setDel({tipo:"veh",id:v.id})}>✕</button></div>
              </div>
              <div className="vmeta"><span>👤 {v.conductor}</span><span>📦 {v.capacidad}</span><span>📞 {v.telefono}</span></div>
              {v.notas&&<div className="vnota">{v.notas}</div>}
            </div>
          ))}
        </div>
        <div>
          <div className="sl">Rutas de reparto</div>
          {rutas.map(r=>{const v=veh.find(x=>x.id===r.vehiculoId);return(
            <div key={r.id} className="card rcard">
              <div className="rh">
                <div><div className="rn">{r.nombre}</div><div className="rm mono">🚐 {v?.nombre||"—"} · 🕐 {r.horaInicio}</div></div>
                <div className="fr g1"><button className="btn btn-sm btn-ghost" onClick={()=>setModal({tipo:"ruta",data:r})}>✏️</button><button className="btn btn-sm btn-red" onClick={()=>setDel({tipo:"ruta",id:r.id})}>✕</button></div>
              </div>
              <div className="plist">{(r.paradas || []).map((p,i)=>(
                <div key={i} className="prow">
                  <div className="pcon"><div className="pdot"/>{i<(r.paradas || []).length-1&&<div className="pline"/>}</div>
                  <div className="pcont">
                    <div className="ptop"><span className="pnom">{p.puesto}</span><span className="phora mono">{p.hora}</span></div>
                    <div className="pmat">{p.material}</div>
                  </div>
                </div>
              ))}</div>
            </div>
          );})}
        </div>
      </div>
    </>
  );
}

// ─── TIMELINE ─────────────────────────────────────────────────────────────────
function TabTL({tl,setTl,setModal,setDel}) {
  const sorted=useMemo(()=>[...tl].sort((a,b)=>a.hora.localeCompare(b.hora)),[tl]);
  const upd=(id,estado)=>setTl(p=>p.map(t=>t.id===id?{...t,estado}:t));
  return(
    <>
      <div className="ph">
        <div><div className="pt">⏱️ Timeline del Día</div><div className="pd">{tl.filter(t=>t.estado==="completado").length}/{tl.length} completadas · 29 agosto 2026</div></div>
        <button className="btn btn-cyan" onClick={()=>setModal({tipo:"tl"})}>+ Tarea</button>
      </div>
      <div className="tlcon">{sorted.map((t,i)=>{
        const color=TLC[t.categoria]||"#5a6a8a";const ec=ESTADO_COLORES[t.estado];
        return(
          <div key={t.id} className={cls("tlrow",t.estado==="completado"&&"tldone",t.estado==="bloqueado"&&"tlblk")}>
            <div className="tlleft">
              <div className="tltime">{t.hora}</div>
              <div className="tlconn">
                <div className="tlnode" style={{background:color,boxShadow:`0 0 8px ${color}66`}}><span>{TLI[t.categoria]}</span></div>
                {i<sorted.length-1&&<div className="tledge"/>}
              </div>
            </div>
            <div className="tlcard" style={{cursor:"pointer"}} onClick={()=>setModal({tipo:"tl",data:t})}>
              <div className="tlch">
                <span className="tlct">{t.titulo}</span>
                <div className="fr g1" onClick={e=>e.stopPropagation()}>
                  <select className="isml" value={t.estado} onChange={e=>upd(t.id,e.target.value)} style={{color:ec,background:`${ec}18`,border:`1px solid ${ec}44`,borderRadius:5,padding:"0.18rem 0.4rem",fontSize:"0.65rem",fontFamily:"var(--font-mono)",cursor:"pointer"}}>
                    {ESTADO_TAREA.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn btn-sm btn-ghost" onClick={e=>{e.stopPropagation();setModal({tipo:"tl",data:t})}}>✏️</button>
                  <button className="btn btn-sm btn-red" onClick={e=>{e.stopPropagation();setDel({tipo:"tl",id:t.id})}}>✕</button>
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

function TabCont({cont,setCont,inc,setInc,setModal,setDel}) {
  const [sub,setSub]=useState("directorio");
  const [proto,setProto]=useState(null);
  return(
    <>
      <div className="ph">
        <div><div className="pt">📡 Comunicaciones</div><div className="pd">Directorio · Protocolo de emergencia · Incidencias</div></div>
        <div className="fr g1">
          {["directorio","protocolo","incidencias"].map(s=>(
            <button key={s} className={cls("btn",sub===s?"btn-cyan":"btn-ghost")} onClick={()=>setSub(s)}>
              {s==="incidencias"?"Incidencias"+(inc.filter(i=>i.estado==="abierta").length>0?" ⚠️":""):s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {sub==="directorio"&&(
        <>
          <div className="fb mb1"><div className="fr g1">{Object.entries(TICI).map(([t,i])=><span key={t} className="ctbadge" style={{background:`${TIC[t]}15`,color:TIC[t],border:`1px solid ${TIC[t]}33`}}>{i} {t}</span>)}</div>
            <button className="btn btn-cyan" onClick={()=>setModal({tipo:"cont"})}>+ Contacto</button>
          </div>
          <div className="cgrid">{cont.map(c=>(
            <div key={c.id} className="ccard" style={{borderTopColor:TIC[c.tipo]}}>
              <div className="cch">
                <div className="ccti">{TICI[c.tipo]}</div>
                <div style={{flex:1,minWidth:0}}><div className="ccn">{c.nombre}</div><div className="ccr">{c.rol}</div></div>
                <div className="fr g1"><button className="btn btn-sm btn-ghost" onClick={()=>setModal({tipo:"cont",data:c})}>✏️</button><button className="btn btn-sm btn-red" onClick={()=>setDel({tipo:"cont",id:c.id})}>✕</button></div>
              </div>
              <div className="ccd">
                <a href={`tel:${c.telefono}`} className="ctel">📞 {c.telefono}</a>
                {c.email&&<a href={`mailto:${c.email}`} className="ceml">✉️ {c.email}</a>}
              </div>
              {c.notas&&<div className="cnota">{c.notas}</div>}
            </div>
          ))}</div>
        </>
      )}

      {sub==="protocolo"&&(
        <div>
          <div className="pintro"><span style={{fontSize:"1.5rem"}}>🚨</span><div><div style={{fontWeight:700,marginBottom:"0.2rem"}}>Protocolo de emergencias</div><div className="muted xs mono">Selecciona el tipo de incidencia para ver los pasos</div></div></div>
          <div className="pgrid">{PROTO_PASOS.map(p=>(
            <button key={p.id} className={cls("pbtn",proto===p.id&&"pactive")} onClick={()=>setProto(proto===p.id?null:p.id)}>
              <span style={{fontSize:"1.4rem"}}>{p.icon}</span><span>{p.titulo}</span>
            </button>
          ))}</div>
          {proto&&(
            <div className="psteps">
              <div className="pst">{PROTO_PASOS.find(p=>p.id===proto)?.icon} {PROTO_PASOS.find(p=>p.id===proto)?.titulo}</div>
              {PROTO_PASOS.find(p=>p.id===proto)?.pasos.map((s,i)=>(
                <div key={i} className="ps"><div className="psn">{i+1}</div><div className="pst2">{s}</div></div>
              ))}
            </div>
          )}
        </div>
      )}

      {sub==="incidencias"&&(
        <>
          <div className="fb mb1">
            <div className="pd">{inc.length} incidencias registradas</div>
            <button className="btn" style={{background:"var(--red-dim)",color:"var(--red)",border:"1px solid rgba(248,113,113,0.2)"}} onClick={()=>setModal({tipo:"inc"})}>+ Registrar incidencia</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.55rem"}}>
            {inc.map(ic=>(
              <div key={ic.id} className={cls("icard",ic.estado==="resuelta"&&"ires")}>
                <div className="ich">
                  <div className="fr g1">
                    <span className="mono" style={{fontSize:"0.72rem",color:"var(--amber)"}}>{ic.hora}</span>
                    <span className="badge" style={{background:ic.gravedad==="alta"?"var(--red-dim)":ic.gravedad==="media"?"var(--amber-dim)":"var(--green-dim)",color:ic.gravedad==="alta"?"var(--red)":ic.gravedad==="media"?"var(--amber)":"var(--green)"}}>{ic.gravedad}</span>
                    <span className="badge" style={{background:"var(--cyan-dim)",color:"var(--cyan)"}}>{ic.tipo}</span>
                  </div>
                  <div className="fr g1">
                    <button className="btn btn-sm" style={{background:"var(--green-dim)",color:"var(--green)",border:"1px solid rgba(52,211,153,0.2)"}} onClick={()=>setInc(p=>p.map(x=>x.id===ic.id?{...x,estado:x.estado==="resuelta"?"abierta":"resuelta"}:x))}>{ic.estado==="resuelta"?"✓ Resuelta":"Marcar resuelta"}</button>
                    <button className="btn btn-sm btn-ghost" onClick={()=>setModal({tipo:"inc",data:ic})}>✏️</button>
                    <button className="btn btn-sm btn-red" onClick={()=>setDel({tipo:"inc",id:ic.id})}>✕</button>
                  </div>
                </div>
                <div style={{fontWeight:600,fontSize:"0.78rem",margin:"0.3rem 0"}}>{ic.descripcion}</div>
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

// ─── CHECKLIST ────────────────────────────────────────────────────────────────
function TabCK({ck,setCk,setModal,setDel}) {
  // Detectar fase activa según la fecha actual
  const diasHasta = Math.ceil((new Date("2026-08-29") - new Date()) / 86400000);
  const faseActiva = (() => {
    if (diasHasta < 0)   return "Post-carrera";
    if (diasHasta === 0) return "Mañana carrera";
    if (diasHasta <= 1)  return "Mañana carrera";
    if (diasHasta <= 2)  return "Día antes";
    if (diasHasta <= 7)  return "Semana antes";
    return "Semana antes"; // por defecto, la primera fase
  })();
  const [fase,setFase]=useState(faseActiva);
  const toggle=(id)=>setCk(p=>p.map(c=>c.id===id?{...c,estado:c.estado==="completado"?"pendiente":"completado"}:c));
  const upd=(id,f,v)=>setCk(p=>p.map(c=>c.id===id?{...c,[f]:v}:c));
  const pf=FASES_CHECKLIST.map(f=>{const it=ck.filter(c=>c.fase===f);const d=it.filter(c=>c.estado==="completado").length;return{f,it,d,t:it.length,pct:it.length?Math.round(d/it.length*100):0};});
  const fd=pf.find(x=>x.f===fase);
  return(
    <>
      <div className="ph">
        <div><div className="pt">✅ Checklist Pre-Carrera</div><div className="pd">{ck.filter(c=>c.estado==="completado").length}/{ck.length} completados</div></div>
        <button className="btn btn-cyan" onClick={()=>setModal({tipo:"ck",fase:fase})}>+ Tarea</button>
      </div>
      <div className="ftabs">
        {pf.map(f=>(
          <button key={f.f} className={cls("ftab",fase===f.f&&"fa",f.f===faseActiva&&"ftab-activa")} onClick={()=>setFase(f.f)}>
            <div style={{display:"flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.15rem"}}>
              <span style={{fontSize:"0.72rem",fontWeight:600}}>{f.f}</span>
              {f.f===faseActiva && (
                <span style={{fontFamily:"var(--font-mono)",fontSize:"0.5rem",fontWeight:700,
                  background:"rgba(34,211,238,0.15)",color:"var(--cyan)",
                  border:"1px solid rgba(34,211,238,0.3)",borderRadius:3,
                  padding:"0.05rem 0.3rem",lineHeight:1.2,flexShrink:0}}>AHORA</span>
              )}
            </div>
            <span className="fprog mono" style={{color:f.pct===100?"var(--green)":f.pct>50?"var(--cyan)":"var(--text-muted)"}}>{f.d}/{f.t}</span>
            <div className="fbar"><div className="ffill" style={{width:`${f.pct}%`,background:f.pct===100?"var(--green)":f.pct>50?"var(--cyan)":"var(--amber)"}}/></div>
          </button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
        {fd?.it.map(item=>(
          <div key={item.id} className={cls("cki",item.estado==="completado"&&"ckd",item.estado==="bloqueado"&&"ckb")} style={{cursor:"pointer"}} onClick={()=>setModal({tipo:"ck",data:item})}>
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
              <button className="btn btn-sm btn-ghost" onClick={e=>{e.stopPropagation();setModal({tipo:"ck",data:item})}}>✏️</button>
              <button className="btn btn-sm btn-red" onClick={e=>{e.stopPropagation();setDel({tipo:"ck",id:item.id})}}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── MODAL ROUTER ─────────────────────────────────────────────────────────────
function ModalRouter({modal,onClose,material,setMaterial,asigs,setAsigs,veh,setVeh,rutas,setRutas,tl,setTl,cont,setCont,inc,setInc,ck,setCk}) {
  const {tipo,data}=modal;
  const sv=(setter,arr,item)=>{ if(item.id) setter(p=>p.map(x=>x.id===item.id?item:x)); else setter(p=>[...p,{...item,id:genId(arr)}]); onClose(); };

  if(tipo==="mat") return <MF title={data?"✏️ Editar material":"📦 Nuevo material"} onClose={onClose}
    fields={[{k:"nombre",l:"Nombre *",t:"text"},{k:"categoria",l:"Categoría",t:"sel",o:CATS_MATERIAL},{k:"cantidad",l:"Cantidad disponible",t:"num"},{k:"stock",l:"Stock total",t:"num"},{k:"unidad",l:"Unidad (ud/kg/rollos...)",t:"text"}]}
    init={data||{nombre:"",categoria:"Avituallamiento",cantidad:0,stock:0,unidad:"ud"}}
    onSave={v=>sv(setMaterial,material,v)} />;

  if(tipo==="asig") return <MF title={data?"✏️ Editar asignación":"📍 Nueva asignación"} onClose={onClose}
    fields={[{k:"materialId",l:"Material",t:"sel",o:material.map(m=>m.id),lb:material.map(m=>m.nombre),num:true},{k:"puesto",l:"Puesto destino",t:"sel",o:PUESTOS_REF},{k:"cantidad",l:"Cantidad",t:"num"},{k:"estado",l:"Estado entrega",t:"sel",o:ESTADO_ENTREGA}]}
    init={data||{materialId:material[0]?.id||1,puesto:PUESTOS_REF[0],cantidad:1,estado:"pendiente"}}
    onSave={v=>sv(setAsigs,asigs,{...v,materialId:parseInt(v.materialId)})} />;

  if(tipo==="veh") return <MF title={data?"✏️ Editar vehículo":"🚗 Nuevo vehículo"} onClose={onClose}
    fields={[{k:"nombre",l:"Nombre *",t:"text"},{k:"matricula",l:"Matrícula",t:"text"},{k:"conductor",l:"Conductor",t:"text"},{k:"capacidad",l:"Capacidad",t:"text"},{k:"telefono",l:"Teléfono",t:"text"},{k:"notas",l:"Notas",t:"text"}]}
    init={data||{nombre:"",matricula:"",conductor:"",capacidad:"",telefono:"",notas:""}}
    onSave={v=>sv(setVeh,veh,v)} />;

  if(tipo==="ruta") return <ModalRuta data={data} veh={veh} rutas={rutas} setRutas={setRutas} onClose={onClose} />;

  if(tipo==="tl") return <MF title={data?"✏️ Editar tarea":"⏱️ Nueva tarea"} onClose={onClose}
    fields={[{k:"hora",l:"Hora",t:"time"},{k:"titulo",l:"Título *",t:"text"},{k:"descripcion",l:"Descripción",t:"text"},{k:"responsable",l:"Responsable",t:"text"},{k:"categoria",l:"Categoría",t:"sel",o:["logistica","organizacion","voluntarios","carrera","comunicacion"]},{k:"estado",l:"Estado",t:"sel",o:ESTADO_TAREA}]}
    init={data||{hora:"08:00",titulo:"",descripcion:"",responsable:"",categoria:"organizacion",estado:"pendiente"}}
    onSave={v=>sv(setTl,tl,v)} />;

  if(tipo==="cont") return <MF title={data?"✏️ Editar contacto":"📞 Nuevo contacto"} onClose={onClose}
    fields={[{k:"nombre",l:"Nombre *",t:"text"},{k:"rol",l:"Rol / Cargo",t:"text"},{k:"telefono",l:"Teléfono *",t:"text"},{k:"email",l:"Email",t:"text"},{k:"tipo",l:"Tipo",t:"sel",o:["emergencia","proveedor","staff","institucional"]},{k:"notas",l:"Notas",t:"text"}]}
    init={data||{nombre:"",rol:"",telefono:"",email:"",tipo:"staff",notas:""}}
    onSave={v=>sv(setCont,cont,v)} />;

  if(tipo==="inc") return <MF title={data?"✏️ Editar incidencia":"⚠️ Registrar incidencia"} onClose={onClose}
    fields={[{k:"hora",l:"Hora",t:"time"},{k:"tipo",l:"Tipo",t:"sel",o:["médica","señalización","avituallamiento","corredor perdido","meteorológica","otra"]},{k:"gravedad",l:"Gravedad",t:"sel",o:["baja","media","alta"]},{k:"descripcion",l:"Descripción *",t:"text"},{k:"responsable",l:"Responsable",t:"text"},{k:"estado",l:"Estado",t:"sel",o:["abierta","resuelta"]},{k:"resolucion",l:"Resolución",t:"text"}]}
    init={data||{hora:new Date().toTimeString().slice(0,5),tipo:"médica",gravedad:"media",descripcion:"",responsable:"",estado:"abierta",resolucion:""}}
    onSave={v=>sv(setInc,inc,v)} />;

  if(tipo==="ck") return <MF title={data?"✏️ Editar tarea":"✅ Nueva tarea checklist"} onClose={onClose}
    fields={[{k:"tarea",l:"Tarea *",t:"text"},{k:"fase",l:"Fase",t:"sel",o:FASES_CHECKLIST},{k:"responsable",l:"Responsable",t:"text"},{k:"prioridad",l:"Prioridad",t:"sel",o:["alta","media","baja"]},{k:"estado",l:"Estado",t:"sel",o:ESTADO_TAREA},{k:"notas",l:"Notas",t:"text"}]}
    init={data||{tarea:"",fase:modal.fase||"Semana antes",responsable:"",prioridad:"media",estado:"pendiente",notas:""}}
    onSave={v=>sv(setCk,ck,v)} />;

  return null;
}

function MF({title,fields,init,onSave,onClose}) {
  const [form,setForm]=useState({...init});
  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));
  const req=fields.find(f=>f.l.includes("*"));
  // Bloquear scroll del fondo y desplazar al top al abrir el modal
  React.useEffect(()=>{
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    // Scroll al top del contenedor principal para que el modal sea visible
    const main=document.querySelector("main");
    if(main) main.scrollTo({top:0,behavior:"instant"});
    return()=>{ document.body.style.overflow=prev; };
  },[]);
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="mhdr"><span className="mtit">{title}</span><button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button></div>
        <div className="mbody">
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
        <div className="mfoot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-cyan" onClick={()=>{if(!req||form[req.k])onSave(form);}}>
            {init?.id?"💾 Guardar":"➕ Añadir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalRuta({data,veh,rutas,setRutas,onClose}) {
  const [form,setForm]=useState(() => {
    const base = data || {nombre:"",vehiculoId:veh[0]?.id||1,horaInicio:"05:00",paradas:[]};
    return { ...base, paradas: Array.isArray(base.paradas) ? base.paradas : [] };
  });
  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));
  const addP=()=>setForm(p=>({...p,paradas:[...p.paradas,{puesto:PUESTOS_REF[0],hora:"06:00",material:""}]}));
  const updP=(i,k,v)=>setForm(p=>({...p,paradas:p.paradas.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const delP=(i)=>setForm(p=>({...p,paradas:p.paradas.filter((_,j)=>j!==i)}));
  const save=()=>{
    if(!form.nombre)return;
    const item={...form,vehiculoId:parseInt(form.vehiculoId)};
    if(item.id)setRutas(p=>p.map(r=>r.id===item.id?item:r));
    else setRutas(p=>[...p,{...item,id:genId(rutas)}]);
    onClose();
  };
  React.useEffect(()=>{
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const main=document.querySelector("main");
    if(main) main.scrollTo({top:0,behavior:"instant"});
    return()=>{ document.body.style.overflow=prev; };
  },[]);
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:560}}>
        <div className="mhdr"><span className="mtit">{data?"✏️ Editar ruta":"🗺️ Nueva ruta"}</span><button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button></div>
        <div className="mbody">
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
        <div className="mfoot"><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-cyan" onClick={save}>{data?"💾 Guardar":"➕ Crear ruta"}</button></div>
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:'Syne',sans-serif;min-height:100vh;
    background-image:radial-gradient(ellipse 80% 40% at 50% -5%,rgba(34,211,238,0.05) 0%,transparent 55%)}
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
  .chips{display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.85rem}
  .chip{padding:.3rem .7rem;border-radius:20px;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);font-family:var(--font-mono);font-size:.62rem;font-weight:700;cursor:pointer;transition:all .15s}
  .chip:hover{border-color:var(--border-light);color:var(--text)} .chip.ca{border-color:var(--cyan);color:var(--cyan);background:var(--cyan-dim)}
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
  .ftab-activa{border-color:rgba(34,211,238,0.35) !important;background:rgba(34,211,238,0.04) !important;}
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
  .empty{text-align:center;padding:1.5rem;color:var(--text-muted);font-family:var(--font-mono);font-size:.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--r)}
  @keyframes fi{from{opacity:0}to{opacity:1}}
  @keyframes su{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .mhdr{padding:1.1rem 1.4rem .9rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .mtit{font-size:.95rem;font-weight:800}
  .mbody{padding:1.1rem 1.4rem;display:flex;flex-direction:column;gap:.8rem}
  .mfoot{padding:.9rem 1.4rem;border-top:1px solid var(--border);display:flex;gap:.5rem;justify-content:flex-end}
  .fl{font-size:.72rem;font-weight:600;margin-bottom:.3rem;display:block;color:var(--text-muted)}
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
  @media(max-width:480px){
    .pt{font-size:1.1rem}
  }
`;
