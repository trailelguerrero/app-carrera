import { createPortal } from "react-dom";
import {
  SK_LOG_ROOT, SK_LOG_TIPOS_CONT, SK_LOG_PEDIDOS_PROV,
  SK_LOG_MAT, SK_LOG_ASIG, SK_LOG_VEH, SK_LOG_RUT,
  SK_LOG_TL, SK_LOG_CONT, SK_LOG_INC, SK_LOG_CK,
  SK_LOG_RECORRIDOS,
  SK_PPTO_TRAMOS, SK_PPTO_INSCRITOS, SK_PPTO_MAXIMOS, SK_PPTO_CONCEPTOS,
  SK_PROY_TAREAS, SK_PROY_HITOS,
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
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { SK_EVENT_CONFIG as LS_KEY_CONFIG } from "@/constants/storageKeys"; // FIX-DEP: migrado desde alias deprecated
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

// ─── CONSTANTS & DEFAULT DATA — Single Source of Truth: logisticaConstants.js ──
// DIS-03: eliminadas declaraciones locales duplicadas. Importar exclusivamente
// desde logisticaConstants.js para evitar divergencias silenciosas entre fuentes.
import {
  CATS_MATERIAL, CAT_ICONS, CAT_COLORS,
  ESTADO_ENTREGA, ESTADO_TAREA, ESTADO_COLORES,
  FASES_CHECKLIST, PUESTOS_REF,
  TIPOS_LOC, LOC_ICONS, LOC_COLORS,
  MAT0, ASIG0, VEH0, RUTAS0, TL0, CONT0, INC0, CK0,
  syncCkTl,
} from "@/components/logistica/logisticaConstants.js";

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App({ initialSubtab, onSubtabConsumed, initialFilter, onFilterConsumed } = {}) {
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
  const [filtroTareaId, setFiltroTareaId] = useState(null); // GAP-A: filtro por tarea vinculada desde Proyecto
  useEffect(() => {
    if (initialSubtab) {
      setTab(initialSubtab);
      if (onSubtabConsumed) onSubtabConsumed();
    }
    if (initialFilter?.filtroTareaId != null) {
      setFiltroTareaId(initialFilter.filtroTareaId);
      if (onFilterConsumed) onFilterConsumed();
    }
  }, [initialSubtab, onSubtabConsumed, initialFilter, onFilterConsumed]);
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
  // LOC-SYNC-01: rawPuestos necesita escritura para propagar coords desde TabLocalizaciones
  const [rawPuestos, setRawPuestos] = useData(SK_VOL_PUESTOS, []);
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

  // TRACK-01: Recorridos GPX simplificados
  const [rawRecorridos, setRecorridos] = useData(SK_LOG_RECORRIDOS, []);
  const recorridos = Array.isArray(rawRecorridos) ? rawRecorridos : [];

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
  const [isExportingExcel, setIsExportingExcel] = useState(null); // C6: null | 'completo' | 'alertas'
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
    const incOpen = inc.filter(i0 => i0.estado==="abierta" || i0.estado==="en gestión").length;
    return { tlDone, tlTotal:tl.length, ckDone, ckTotal:ck.length, stockErr, stockBajoMinimo, incOpen };
  }, [tl, ck, material, asigs, inc]);

  // RECURSOS: inventario y planificación
  const TABS_RECURSOS = [
    {id:"dashboard",     icon:"📊", label:"Dashboard"},
    {id:"localizaciones",icon:"📍", label:"Ubicaciones"},
    {id:"vehiculos",     icon:"🚗", label:"Vehículos"},
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
              onClick={async () => {
                if (isExportingExcel) return;
                setIsExportingExcel('completo');
                try { await exportarMaterial(material, asigs, locs, 'completo'); }
                finally { setIsExportingExcel(null); }
              }}
              disabled={!!isExportingExcel}
              title="Exportar todo el inventario a Excel">
              {isExportingExcel === 'completo' ? "⏳ Generando…" : "📊 Excel"}
            </button>
            <button className="btn btn-ghost btn-sm"
              onClick={async () => {
                if (isExportingExcel) return;
                setIsExportingExcel('alertas');
                try { await exportarMaterial(material, asigs, locs, 'alertas'); }
                finally { setIsExportingExcel(null); }
              }}
              disabled={!!isExportingExcel}
              title="Exportar solo materiales con alertas (déficit o bajo mínimo)">
              {isExportingExcel === 'alertas' ? "⏳ Generando…" : "⚠️ Alertas"}
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
          {tab==="vehiculos" && <TabVeh veh={veh} setVeh={setVeh} rutas={rutas} setRutas={setRutas} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenVeh} setOrdenAlfa={setOrdenVeh} voluntariosConCoche={voluntariosConCoche} material={material} asigs={asigs} />}
          {tab==="timeline" && <TabTL tl={tl} setTl={setTl} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenTL} setOrdenAlfa={setOrdenTL} config={config}
            onUpdSync={(id, estado, hora) => {
              const { ckNext, ckCambio } = syncCkTl("tl", id, estado, ck, tl, hora);
              if (ckCambio) setCk(ckNext);
            }} />}
          {tab==="emergencias" && <TabEmergencias cont={cont} inc={inc} setInc={setInc} abrirModal={abrirModal} abrirFicha={abrirFicha} tiposContacto={tiposContacto} />}
          {tab==="checklist" && <TabCK ck={ck} setCk={setCk} setModal={setModal} abrirModal={abrirModal} setDel={setDel} abrirFicha={abrirFicha} ordenAlfa={ordenCK} setOrdenAlfa={setOrdenCK} config={config} tareasProyecto={tareasProyecto} filtroTareaId={filtroTareaId} onClearFiltroTarea={()=>setFiltroTareaId(null)} setTareasProyecto={(fn)=>{
              const next=typeof fn==="function"?fn(tareasProyecto):fn;
              import("@/lib/dataService").then(async m=>{
                await m.default.set(SK_PROY_TAREAS, next);
                m.default.notify('proyecto'); // INC-05
                // GAP-B: sincronizar hitos auto-generados de las tareas modificadas
                const { syncHitoTarea } = await import("@/components/blocks/Proyecto.jsx");
                const hitos = await m.default.get(SK_PROY_HITOS, []);
                let hitosNext = Array.isArray(hitos) ? hitos : [];
                const prevMap = new Map(tareasProyecto.map(t => [t.id, t]));
                for (const tarea of next) {
                  const prev = prevMap.get(tarea.id);
                  if (!prev || prev.estado !== tarea.estado) {
                    hitosNext = syncHitoTarea(hitosNext, tarea);
                  }
                }
                const cambiaron = JSON.stringify(hitosNext) !== JSON.stringify(hitos);
                if (cambiaron) {
                  await m.default.set(SK_PROY_HITOS, hitosNext);
                  m.default.notify('proyecto');
                }
              });
            }}
            onToggleSync={(id, estadoNuevo, hora) => {
              const { tlNext, tlCambio } = syncCkTl("ck", id, estadoNuevo, ck, tl, hora);
              if (tlCambio) setTl(tlNext);
            }} />}
          {tab==="localizaciones" && <TabLocalizaciones locs={locs} setLocs={setLocs} volsPorLoc={volsPorLoc} matPorLoc={matPorLoc} recorridos={recorridos} puestos={Array.isArray(rawPuestos) ? rawPuestos : []} setPuestos={setRawPuestos} />}
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
                  material={material} setMaterial={setMaterial}
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

