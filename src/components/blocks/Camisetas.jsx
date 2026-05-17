/**
 * Camisetas.jsx — Orquestador (Tarea 3.4)
 * Gestión de camisetas del evento: resumen, pedido al proveedor,
 * extras/familiares y control de entrega.
 *
 * Estado, cálculos y sub-componentes viven en src/components/camisetas/.
 */
import { createPortal } from "react-dom";
import { useState, useMemo } from "react";
import { useData } from "@/hooks/useData";
import { toast } from "@/lib/toast";
import { genIdNum, fmtEur2, scrollMainToTop } from "@/lib/utils";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { blockCls as cls } from "@/lib/blockStyles";
import { SK_VOL_VOLUNTARIOS, SK_CAM_VENTA_PUBLICO } from "@/constants/storageKeys";

import {
  LS, TALLAS, TALLAS_NINO, CORREDORES_DEFAULT, NINO_DEFAULT,
  PEDIDOS_DEFAULT, COSTE_DEFAULT, FUENTES_DEFAULT, CAM_CSS,
  esVoluntarioElegibleCamiseta,
} from "@/components/camisetas/camisetasConstants";

import { TabDashboard }            from "@/components/camisetas/TabDashboard";
import { TabPedidos }              from "@/components/camisetas/TabPedidos";
import { TabTallas }               from "@/components/camisetas/TabTallas";
import { TabChecklist }            from "@/components/camisetas/TabChecklist";
import { TabReparto }              from "@/components/camisetas/TabReparto";
import { ModalImportarTallasVol }  from "@/components/camisetas/ModalImportarTallasVol";
import { FichaPedido }             from "@/components/camisetas/FichaPedido";
import { ModalPedido }             from "@/components/camisetas/ModalPedido";


export default function App() {
  const [eventCfg, , loadCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [tab, setTab] = useState("dashboard");
  const [vistaSimpleTallas, setVistaSimpleTallas] = useState(true);
  const [rawP, setPedidos, loadP] = useData(LS + "_pedidos", PEDIDOS_DEFAULT);
  const pedidos = Array.isArray(rawP) ? rawP : [];
  const [coste, setCoste, loadCoste] = useData(LS + "_coste", COSTE_DEFAULT);
  const [fechaPedido, setFechaPedido] = useData(LS + "_fecha_pedido", "");
  const [estadoPedido, setEstadoPedido] = useData(LS + "_estado_pedido", "pendiente");
  const [modal, setModal] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [delId, setDelId] = useState(null);
  const [filtroP, setFiltroP] = useState({ pago: "todos", ent: "todos" });
  // CAM-01: modal de preview de importación de tallas de voluntarios
  const [modalImportVol, setModalImportVol] = useState(false);

  // ─── Fuentes externas ───────────────────────────────────────────────────────
  const [rawCorredores, setCorredores, loadCorredores] = useData(LS + "_corredores", CORREDORES_DEFAULT);
  const corredoresExt = (rawCorredores && typeof rawCorredores === "object" && !Array.isArray(rawCorredores))
    ? { ...CORREDORES_DEFAULT, ...rawCorredores } : CORREDORES_DEFAULT;

  const [rawNino, setNino, loadNino] = useData(LS + "_nino", NINO_DEFAULT);
  const ninoExt = (rawNino && typeof rawNino === "object" && !Array.isArray(rawNino))
    ? { ...NINO_DEFAULT, ...rawNino } : NINO_DEFAULT;

  const [precioPlatExt, setPrecioPlatExt] = useData(LS + "_precio_plataforma", { precio: 15 });
  const precioCorrExt = (precioPlatExt?.precio ?? 15);

  const [rawVentaPublico, setVentaPublico, loadVentaPublico] = useData(SK_CAM_VENTA_PUBLICO, { precio: 20, cantidad: 0 });
  const ventaPublico = (rawVentaPublico && typeof rawVentaPublico === "object")
    ? { precio: rawVentaPublico.precio ?? 20, cantidad: rawVentaPublico.cantidad ?? 0 }
    : { precio: 20, cantidad: 0 };

  const [rawVols, , loadVols] = useData(SK_VOL_VOLUNTARIOS, []);
  const [inclPendientes, setInclPendientes, loadInclP] = useData(LS + "_incluir_pendientes", false);
  const [margenSeguridad, setMargenSeguridad, loadMargen] = useData(LS + "_margen_seguridad", 5);
  const [rawFuentes, setFuentesActivas, loadFuentes] = useData(LS + "_fuentes", FUENTES_DEFAULT);
  const fuentesActivas = (rawFuentes && typeof rawFuentes === "object" && !Array.isArray(rawFuentes))
    ? { ...FUENTES_DEFAULT, ...rawFuentes } : FUENTES_DEFAULT;

  /*
   * INC-01 — cobrosPlataformaRecibidos
   * ────────────────────────────────────
   * Las plataformas de inscripción (Runedia, Sportmaniacs…) cobran al corredor
   * en el momento de la inscripción, pero TRANSFIEREN el dinero al organizador
   * en una liquidación posterior, normalmente tras el evento (2-8 semanas).
   *
   * Este booleano permite al organizador marcar cuándo el dinero ha llegado
   * realmente a su cuenta:
   *   false (por defecto) → iCorExt entra en "proyectado" pero NO en "realizado"
   *   true                → iCorExt entra en "realizado" (liquidación recibida)
   *
   * Sin este campo, beneficioNetoReal estaría sistemáticamente inflado durante
   * todas las semanas previas a la liquidación.
   */
  const [cobrosPlataformaRecibidos, setCobrosPlataformaRecibidos, loadCobros] = useData(LS + "_cobros_plataforma", false);

  const isLoading = loadCfg || loadP || loadCoste || loadCorredores || loadNino || loadVols || loadInclP || loadMargen || loadFuentes || loadVentaPublico || loadCobros;

  // ─── Derivados ──────────────────────────────────────────────────────────────
  const generarPedidosVoluntarios = () => {
    const nombresConPedido = new Set(
      pedidos.flatMap(p =>
        p.lineas.filter(l => l.tipo === "voluntario").map(() =>
          p.nombre.toLowerCase().trim()
        )
      )
    );
    // INT-02: usa el helper centralizado esVoluntarioElegibleCamiseta para que
    // el criterio de elegibilidad sea idéntico al de voluntariosActivos.
    // inclPendientes controla si los voluntarios en estado "pendiente" se incluyen.
    const sinPedido = (Array.isArray(rawVols) ? rawVols : [])
      .filter(v => esVoluntarioElegibleCamiseta(v, inclPendientes) && !nombresConPedido.has(
        `${v.nombre || ""} ${v.apellidos || ""}`.toLowerCase().trim()
      ));
    if (sinPedido.length === 0) { toast.success("Todos los voluntarios con talla ya tienen pedido"); return; }

    /*
     * Estrategia de IDs para generación en lote síncrono
     * ───────────────────────────────────────────────────
     * PROBLEMA: Date.now() + offset no funciona en lotes síncronos porque
     *   - Date.now() devuelve el mismo valor en todas las iteraciones del map().
     *   - Si dos voluntarios tienen v.id próximos, los IDs de pedido colisionan.
     *   - genIdNum(colección) solo ve el max actual; en un map() el array no muta,
     *     por lo que devolvería el mismo valor en cada iteración.
     *
     * SOLUCIÓN: calcular la base UNA sola vez antes del bucle (max ID existente),
     *   luego asignar base + índice*2 al pedido y base + índice*2 + 1 a su línea.
     *   El paso de 2 garantiza que ningún ID de pedido colisione con un ID de línea.
     *   La base parte de los pedidos existentes, garantizando unicidad global.
     */
    const idBase = genIdNum(pedidos); // max(ids existentes) + 1
    const nuevos = sinPedido.map((v, i) => ({
      id: idBase + i * 2,
      nombre: `${v.nombre || ""} ${v.apellidos || ""}`.trim(),
      telefono: v.telefono || "", email: v.email || "",
      notas: `Auto-generado desde Voluntarios · ${new Date().toLocaleDateString("es-ES")}`,
      voluntarioId: v.id,
      lineas: [{ id: idBase + i * 2 + 1, tipo: "voluntario", talla: v.talla || "M",
        cantidad: 1, precioVenta: 0, estadoPago: "regalo", estadoEntrega: "pendiente" }],
    }));
    setPedidos(prev => [...prev, ...nuevos]);
    toast.success(`${nuevos.length} pedidos generados desde voluntarios`);
  };

  // INT-02: voluntariosActivos usa esVoluntarioElegibleCamiseta como única fuente
  // de criterio de elegibilidad. Las variables individuales se mantienen para los
  // props de TabReparto y TabTallas que las necesitan por separado.
  const voluntariosConfirmados = Array.isArray(rawVols) ? rawVols.filter(v => esVoluntarioElegibleCamiseta(v, false)) : [];
  const voluntariosPendientes  = Array.isArray(rawVols) ? rawVols.filter(v => v?.estado === "pendiente" && v?.talla) : [];
  const voluntariosActivos     = Array.isArray(rawVols) ? rawVols.filter(v => esVoluntarioElegibleCamiseta(v, inclPendientes)) : [];

  // ─── Stats calculados ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const uCorExt  = fuentesActivas.corredoresPlat   ? TALLAS.reduce((s, t)      => s + (corredoresExt[t] || 0), 0) : 0;
    const uNinoExt = fuentesActivas.ninoManual        ? TALLAS_NINO.reduce((s, t) => s + (ninoExt[t] || 0),      0) : 0;
    const uVolAuto = fuentesActivas.voluntariosAuto  ? voluntariosActivos.length : 0;
    const extrasLineas = pedidos.flatMap(p => p.lineas);
    const uExtrasCor  = fuentesActivas.extrasCorredor   ? extrasLineas.filter(l => l.tipo === "corredor").reduce((s, l)   => s + l.cantidad, 0) : 0;
    const uExtrasVol  = fuentesActivas.extrasVoluntario ? extrasLineas.filter(l => l.tipo === "voluntario").reduce((s, l) => s + l.cantidad, 0) : 0;
    const uExtrasNino = fuentesActivas.extrasNino       ? extrasLineas.filter(l => l.tipo === "nino").reduce((s, l)       => s + l.cantidad, 0) : 0;
    const totalUnidades = uCorExt + uVolAuto + uExtrasCor + uExtrasVol + uNinoExt + uExtrasNino;

    const iCorExt = uCorExt * precioCorrExt;
    const extrasPagados = extrasLineas.filter(l => l.estadoPago === "pagado" && (
      (l.tipo === "corredor" && fuentesActivas.extrasCorredor) ||
      (l.tipo === "voluntario" && fuentesActivas.extrasVoluntario) ||
      (l.tipo === "nino" && fuentesActivas.extrasNino)
    ));
    const iExtrasReal = extrasPagados.reduce((s, l) => s + l.cantidad * (l.precioVenta || 0), 0);
    const extrasProyectados = extrasLineas.filter(l => (l.estadoPago === "pagado" || l.estadoPago === "pendiente") && (
      (l.tipo === "corredor" && fuentesActivas.extrasCorredor) ||
      (l.tipo === "voluntario" && fuentesActivas.extrasVoluntario) ||
      (l.tipo === "nino" && fuentesActivas.extrasNino)
    ));
    const iExtrasProyectado = extrasProyectados.reduce((s, l) => s + l.cantidad * (l.precioVenta || 0), 0);
    const iVentaPublico  = ventaPublico.cantidad * ventaPublico.precio;
    const gVentaPublico  = ventaPublico.cantidad * (coste.corredor || 0);
    // INC-01: iCorExt entra en "realizado" solo si la plataforma ya ha transferido
    // los fondos (cobrosPlataformaRecibidos). En "proyectado" entra siempre porque
    // el compromiso de pago existe desde la inscripción.
    const iCorExtRealizado = (fuentesActivas.corredoresPlat && cobrosPlataformaRecibidos) ? iCorExt : 0;
    const totalIngresosReal        = iCorExtRealizado + iExtrasReal        + iVentaPublico;
    const totalIngresosProyectado  = (fuentesActivas.corredoresPlat ? iCorExt : 0) + iExtrasProyectado  + iVentaPublico;

    const gCorExt  = uCorExt  * (coste.corredor   || 0);
    const gNinoExt = uNinoExt * (coste.nino        || 0);
    const gVolAuto = uVolAuto * (coste.voluntario  || 0);
    const gExtrasCor  = uExtrasCor  * (coste.corredor   || 0);
    const gExtrasVol  = uExtrasVol  * (coste.voluntario  || 0);
    const gExtrasNino = uExtrasNino * (coste.nino         || 0);
    const totalGastos = gCorExt + gVolAuto + gExtrasCor + gExtrasVol + gNinoExt + gExtrasNino + gVentaPublico;

    const beneficioNetoReal        = totalIngresosReal       - totalGastos;
    const beneficioNetoProyectado  = totalIngresosProyectado - totalGastos;

    const gRegalos = extrasLineas.filter(l => l.estadoPago === "regalo" && (
      (l.tipo === "corredor" && fuentesActivas.extrasCorredor) ||
      (l.tipo === "voluntario" && fuentesActivas.extrasVoluntario) ||
      (l.tipo === "nino" && fuentesActivas.extrasNino)
    )).reduce((s, l) => s + l.cantidad * (coste[l.tipo] || 0), 0);

    const cPendCobro = extrasLineas.filter(l => l.estadoPago === "pendiente" && (
      (l.tipo === "corredor" && fuentesActivas.extrasCorredor) ||
      (l.tipo === "voluntario" && fuentesActivas.extrasVoluntario) ||
      (l.tipo === "nino" && fuentesActivas.extrasNino)
    )).reduce((s, l) => s + l.cantidad * (l.precioVenta || 0), 0);

    const lineasPendEnt = extrasLineas.filter(l => l.estadoEntrega === "pendiente");
    return {
      totalUnidades, totalIngresosReal, totalIngresosProyectado,
      totalGastos, beneficioNetoReal, beneficioNetoProyectado,
      uCorExt, uVolAuto, uExtrasCor, uExtrasVol, uNinoExt, uExtrasNino,
      iCorExt, iExtrasReal, iExtrasProyectado, iVentaPublico,
      gRegalos, cPendCobro,
      totalPedidosExtras: pedidos.length,
      // INC-04: dos métricas de entrega con semántica explícita
      pendEnt:       lineasPendEnt.reduce((s, l) => s + l.cantidad, 0), // UNIDADES físicas
      pendEntLineas: lineasPendEnt.length,                               // LÍNEAS de pedido (personas)
    };
  }, [pedidos, coste, corredoresExt, ninoExt, voluntariosActivos, precioCorrExt, fuentesActivas, ventaPublico, cobrosPlataformaRecibidos]);

  const totalCorredoresConf = TALLAS.reduce((s, t) => s + (corredoresExt[t] || 0), 0);
  const esEstadoInicial = pedidos.length === 0 && totalCorredoresConf === 0;

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const goToTab    = (tabId, filtro) => { scrollMainToTop(); if (filtro) setFiltroP(filtro); setTab(tabId); };
  const abrirFicha = (p) => { scrollMainToTop(); setFicha(p); };
  const abrirModal = (pd) => { scrollMainToTop(); setModal({ data: pd || null }); };
  const abrirEditar = (p) => { scrollMainToTop(); setFicha(null); setModal({ data: p }); };

  const savePedido = (p) => {
    if (p.id) { setPedidos(prev => prev.map(x => x.id === p.id ? p : x)); toast.success("Pedido actualizado"); }
    else       { setPedidos(prev => [...prev, { ...p, id: genIdNum(pedidos) }]); toast.success("Pedido creado"); }
    setModal(null);
  };
  const deletePedido = () => { setPedidos(prev => prev.filter(x => x.id !== delId)); setDelId(null); setFicha(null); toast.success("Pedido eliminado"); };

  const [, setRawVoluntarios] = useData(SK_VOL_VOLUNTARIOS, []);
  const updateLinea = (pedidoId, lineaIdOrObj, campo, valor) => {
    const esObjeto = typeof lineaIdOrObj === "object" && lineaIdOrObj !== null && campo === undefined;

    /*
     * sincronizarEntregaVoluntario — estrategia de reconciliación en tres capas (INT-01)
     * ──────────────────────────────────────────────────────────────────────────────────
     * PROBLEMA ANTERIOR: nc.includes(np) producía falsos positivos.
     *   "Ana García" marcaba también a "Ana García López" como entregada.
     *
     * ESTRATEGIA NUEVA (más específico primero):
     *   CAPA 1 — voluntarioId presente → usar ID directo. Sin comparación de nombres.
     *            Cubre pedidos generados por generarPedidosVoluntarios.
     *   CAPA 2 — pedido individual sin voluntarioId → comparación de nombre ESTRICTA (===).
     *            Sin includes(). El nombre debe coincidir exactamente.
     *   CAPA 3 — importación por bloque (_esImportacionVol) → NO sincronizar.
     *            Un bloque agregado no representa a un voluntario concreto.
     */
    const sincronizarEntregaVoluntario = (pedido, entregado) => {
      if (!pedido) return;

      // Capa 3: bloque agregado → no sincronizar individualmente
      if (pedido._esImportacionVol) return;

      setRawVoluntarios(prev => (Array.isArray(prev) ? prev : []).map(v => {
        // Capa 1: ID directo si el pedido tiene voluntarioId
        if (pedido.voluntarioId != null) {
          return v.id === pedido.voluntarioId ? { ...v, camisetaEntregada: entregado } : v;
        }
        // Capa 2: comparación de nombre estricta (sin includes)
        if (pedido.nombre) {
          const nc = ((v.nombre || "") + " " + (v.apellidos || "")).toLowerCase().trim();
          const np = (pedido.nombre || "").toLowerCase().trim();
          return nc === np ? { ...v, camisetaEntregada: entregado } : v;
        }
        return v;
      }), { force: true });
    };

    if (esObjeto) {
      const lineaNueva = lineaIdOrObj;
      setPedidos(prev => prev.map(p => p.id !== pedidoId ? p : {
        ...p, lineas: p.lineas.map(l => l.id !== lineaNueva.id ? l : { ...l, ...lineaNueva })
      }));
      if ((lineaNueva.tipo === "voluntario" || lineaNueva.tipo === "extra-voluntario") && lineaNueva.estadoEntrega === "entregado") {
        const pedido = pedidos.find(p => p.id === pedidoId);
        sincronizarEntregaVoluntario(pedido, true);
      }
    } else {
      const lineaId = lineaIdOrObj;
      setPedidos(prev => prev.map(p => p.id !== pedidoId ? p : {
        ...p, lineas: p.lineas.map(l => l.id !== lineaId ? l : { ...l, [campo]: valor })
      }));
      if (campo === "estadoEntrega") {
        const pedido = pedidos.find(p => p.id === pedidoId);
        const linea  = pedido?.lineas?.find(l => l.id === lineaId);
        if (linea?.tipo === "voluntario" || linea?.tipo === "extra-voluntario") {
          sincronizarEntregaVoluntario(pedido, valor === "entregado");
        }
      }
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <style>{CAM_CSS}</style>
        <div className="block-container">
          <div className="block-header">
            <div>
              <h1 className="block-title">👕 Camisetas Extra</h1>
              <div className="block-title-sub">Cargando datos de camisetas...</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
            <div className="teg-spinner"></div>
          </div>
        </div>
      </>
    );
  }

  const TABS = [
    { id: "dashboard", icon: "📊", label: "Resumen",             title: "Visión general del estado de las camisetas" },
    { id: "tallas",    icon: "📐", label: "Pedido al proveedor", title: "Consolida las unidades por talla para pedir al fabricante" },
    { id: "pedidos",   icon: "👕", label: "Extras y familiares", title: "Pedidos individuales: staff, familiares y personas fuera de plataforma" },
    { id: "checklist", icon: "📬", label: "Entrega",             title: "Control de entrega el día del evento" },
    { id: "reparto",   icon: "📦", label: "Reparto",             title: "Lista de camisetas pendientes de entregar — para el día del evento" },
  ];

  return (
    <>
      <style>{CAM_CSS}</style>
      <div className="block-container">
        <div className="block-header">
          <div>
            <h1 className="block-title">👕 Camisetas Extra</h1>
            <div className="block-title-sub" style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
              <span>{config.nombre} {config.edicion} · Pedidos externos</span>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "presupuesto" } }))}
                style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".12rem .4rem",
                  borderRadius: 4, border: "1px solid rgba(251,191,36,.3)",
                  background: "rgba(251,191,36,.1)", color: "var(--amber)", cursor: "pointer" }}>
                💰 Ver en presupuesto →
              </button>
            </div>
          </div>
          <div className="block-actions">
            {stats.cPendCobro > 0 && <span className="badge badge-amber">⏳ {fmtEur2(stats.cPendCobro)} pendiente</span>}
            {stats.pendEnt   > 0 && <span className="badge badge-cyan" title={`${stats.pendEnt} camiseta${stats.pendEnt !== 1 ? "s" : ""} pendiente${stats.pendEnt !== 1 ? "s" : ""} · ${stats.pendEntLineas} pedido${stats.pendEntLineas !== 1 ? "s" : ""}`}>📦 {stats.pendEnt} ud por entregar · {stats.pendEntLineas} {stats.pendEntLineas === 1 ? "pedido" : "pedidos"}</span>}
            {/* CAM-01 — botón de importar tallas visible solo en la pestaña de tallas */}
            {tab === "tallas" && (
              <button
                className="btn btn-ghost"
                title="Importar tallas de todos los voluntarios confirmados y crear líneas de pedido por talla"
                onClick={() => setModalImportVol(true)}
              >
                🔄 Importar tallas de voluntarios
              </button>
            )}
            <button className="btn btn-primary" onClick={() => abrirModal(null)}>+ Nuevo pedido</button>
          </div>
        </div>

        {/* Panel de configuración inicial */}
        {esEstadoInicial && (
          <div style={{ background: "linear-gradient(135deg,rgba(34,211,238,.07),rgba(167,139,250,.05))", border: "1px solid rgba(34,211,238,.2)", borderRadius: "var(--r)", padding: "1.25rem 1.5rem", marginBottom: "1rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--cyan)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: ".65rem" }}>
              🚀 Guía de configuración
            </div>
            <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
              Gestiona aquí las camisetas del evento: consolida las tallas de todos los participantes, registra pedidos de extras y controla la entrega el día de carrera.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
              {[
                { n: 1, done: coste.corredor !== 8 || coste.voluntario !== 7, label: "Configura los costes unitarios", sub: "Precio que cobra el proveedor por cada camiseta", tab: "dashboard", cta: "Configurar costes →" },
                { n: 2, done: totalCorredoresConf > 0, label: "Introduce las tallas de corredores", sub: "Exporta los datos de tu plataforma de inscripción e introdúcelos por talla", tab: "tallas", cta: "Ir a Pedido al proveedor →" },
                { n: 3, done: pedidos.length > 0, label: "Registra pedidos de extras", sub: "Familiares, staff y personas fuera de plataforma", tab: "pedidos", cta: "Añadir pedido →" },
                { n: 4, done: stats.pendEnt === 0 && pedidos.length > 0, label: "Gestiona la entrega el día del evento", sub: "Marca cada camiseta como entregada desde la pestaña Entrega", tab: "checklist", cta: "Ver entregas →" },
              ].map(step => (
                <div key={step.n} style={{ display: "flex", alignItems: "flex-start", gap: ".75rem", padding: ".6rem .75rem", borderRadius: 8,
                  background: step.done ? "rgba(52,211,153,.06)" : "var(--surface2)",
                  border: `1px solid ${step.done ? "rgba(52,211,153,.2)" : "var(--border)"}`,
                  opacity: step.done ? .7 : 1 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: step.done ? "var(--green-dim)" : "var(--surface3)",
                    border: `1.5px solid ${step.done ? "var(--green)" : "var(--border-light)"}`,
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                    color: step.done ? "var(--green)" : "var(--text-muted)" }}>
                    {step.done ? "✓" : step.n}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)", textDecoration: step.done ? "line-through" : "none", color: step.done ? "var(--text-muted)" : "var(--text)" }}>{step.label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: ".1rem" }}>{step.sub}</div>
                  </div>
                  {!step.done && (
                    <button onClick={() => setTab(step.tab)} style={{ flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--cyan)", background: "var(--cyan-dim)", border: "1px solid rgba(34,211,238,.2)", borderRadius: 5, padding: ".2rem .5rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                      {step.cta}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="tabs">
          {TABS.map(t => (<button key={t.id} className={cls("tab-btn", tab === t.id && "active")} onClick={() => setTab(t.id)} title={t.title}>{t.icon} {t.label}</button>))}
        </div>

        <div key={tab}>
          {tab === "dashboard" && <TabDashboard stats={stats} pedidos={pedidos} coste={coste} setCoste={setCoste} setTab={setTab} goToTab={goToTab} abrirFicha={abrirFicha}
            fechaPedido={fechaPedido} setFechaPedido={setFechaPedido}
            estadoPedido={estadoPedido} setEstadoPedido={setEstadoPedido}
            precioCorrExt={precioCorrExt} setPrecioCorrExt={(v) => setPrecioPlatExt({ precio: v })}
            ventaPublico={ventaPublico} setVentaPublico={setVentaPublico}
            fuentesActivas={fuentesActivas} setFuentesActivas={setFuentesActivas}
            cobrosPlataformaRecibidos={cobrosPlataformaRecibidos} setCobrosPlataformaRecibidos={setCobrosPlataformaRecibidos}
            corredoresExt={corredoresExt} voluntariosActivos={voluntariosActivos}
            voluntariosConfirmados={voluntariosConfirmados} voluntariosPendientes={voluntariosPendientes}
            ninoExt={ninoExt} />}
          {tab === "pedidos"   && <TabPedidos   pedidos={pedidos} coste={coste} abrirFicha={abrirFicha} abrirModal={abrirModal} filtroExterno={filtroP} onClearFiltro={() => setFiltroP({ pago: "todos", ent: "todos" })} />}
          {tab === "tallas"    && <TabTallas    pedidos={pedidos} corredoresExt={corredoresExt} setCorredores={setCorredores} voluntariosActivos={voluntariosActivos} fuentesActivas={fuentesActivas}
            voluntariosConfirmados={voluntariosConfirmados} voluntariosPendientes={voluntariosPendientes}
            inclPendientes={inclPendientes} setInclPendientes={setInclPendientes}
            ninoExt={ninoExt} setNino={setNino}
            margenSeguridad={margenSeguridad} setMargenSeguridad={setMargenSeguridad}
            vistaSimple={vistaSimpleTallas} setVistaSimple={setVistaSimpleTallas}
            config={config} />}
          {tab === "checklist" && <TabChecklist pedidos={pedidos} updateLinea={updateLinea} abrirFicha={abrirFicha} generarPedidosVoluntarios={generarPedidosVoluntarios} />}
          {tab === "reparto"   && <TabReparto pedidos={pedidos} updateLinea={updateLinea} rawVols={rawVols} />}
        </div>
      </div>

      {ficha && createPortal(<FichaPedido pedido={pedidos.find(p => p.id === ficha.id) || ficha} coste={coste} onClose={() => setFicha(null)} onEditar={() => abrirEditar(pedidos.find(p => p.id === ficha.id) || ficha)} onEliminar={() => { const id = ficha?.id; setFicha(null); if (id) setDelId(id); }} updateLinea={updateLinea} />, document.body)}
      {modal && createPortal(<ModalPedido data={modal.data} coste={coste} onSave={savePedido} onClose={() => setModal(null)} />, document.body)}
      {delId && createPortal(
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDelId(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 340, textAlign: "center" }}>
            <div className="modal-body" style={{ paddingTop: "1.5rem" }}><div style={{ fontSize: "var(--fs-xl)", marginBottom: ".6rem" }}>⚠️</div><div style={{ fontWeight: 700, marginBottom: ".4rem" }}>¿Eliminar pedido?</div><div className="mono xs muted">Esta acción no se puede deshacer.</div></div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setDelId(null)}>Cancelar</button><button className="btn btn-red" onClick={deletePedido}>Eliminar</button></div>
          </div>
        </div>
      , document.body)}

      {/* ── CAM-01: Modal de importación de tallas de voluntarios ── */}
      {modalImportVol && createPortal(
        <ModalImportarTallasVol
          voluntariosConfirmados={voluntariosConfirmados}
          setPedidos={setPedidos}
          pedidos={pedidos}
          onClose={() => setModalImportVol(false)}
        />,
        document.body
      )}
    </>
  );
}
