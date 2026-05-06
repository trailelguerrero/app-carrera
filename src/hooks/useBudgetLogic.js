import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import dataService, { useData } from "../lib/dataService";
import { 
  TRAMOS_DEFAULT, 
  CONCEPTOS_DEFAULT, 
  INSCRITOS_DEFAULT, 
  INGRESOS_EXTRA_DEFAULT, 
  MERCHANDISING_DEFAULT,
  MAXIMOS_DEFAULT,
  DISTANCIAS,
  SYNC_CONFIG_DEFAULT,
  MARGEN_CONFIG_DEFAULT
} from "../constants/budgetConstants";
const LS_PATS = "teg_patrocinadores_v1_pats";
const LS_CAM_PEDIDOS = "teg_camisetas_v1_pedidos";
const LS_CAM_COSTE = "teg_camisetas_v1_coste";
import {
  getImporteCobrado,
  getImporteComprometido,
  calculateTotalInscritos,
  calculateIngresosPorDistancia,
  calculatePrecioMedioDistancia,
  calculateCostesFijos,
  calculateCostesVariables,
  calculateCostesVarPorCorredor,
  calculateCostesFijoPorCorredor,
  calculateMerchTotales,
  calculateIngresosDesglosados,
  calculateResultado,
  calculatePuntoEquilibrio,
  calculatePEGlobal
} from "../lib/budgetUtils";

export const useBudgetLogic = ({ scenarioInscritos, scenarioConceptos, scenarioIngresosExtra, scenarioMerchandising } = {}) => {
  const [tab, setTab] = useState("inscripciones");
  const [tramos, setTramos] = useState(TRAMOS_DEFAULT);
  const [conceptos, setConceptos] = useState(CONCEPTOS_DEFAULT);
  const [inscritos, setInscritos] = useState(INSCRITOS_DEFAULT);
  // ingresosExtra: solo almacena datos de líneas manuales + nombre de las sincronizadas
  // los valores de líneas sincronizadas se calculan en tiempo real en el useMemo abajo
  const [ingresosExtra, setIngresosExtra] = useState(INGRESOS_EXTRA_DEFAULT);
  const [merchandising, setMerchandising] = useState(MERCHANDISING_DEFAULT);
  const [maximos, setMaximos] = useState(MAXIMOS_DEFAULT);
  // Usar useData con defaultValue que se merge con cualquier valor guardado en LS
  // para garantizar que nuevas claves (subvencionPublica) existan aunque el dato sea antiguo
  const [syncConfigRaw, setSyncConfigRaw] = useData("teg_presupuesto_v1_syncConfig", SYNC_CONFIG_DEFAULT);

  // Merge con defaults para añadir claves nuevas que no existían en datos guardados
  const syncConfig = { ...SYNC_CONFIG_DEFAULT, ...(syncConfigRaw || {}) };

  // setSyncConfig actualiza el estado raw (que también persiste en LS)
  const setSyncConfig = (updater) => {
    setSyncConfigRaw(prev => {
      const prevMerged = { ...SYNC_CONFIG_DEFAULT, ...(prev || {}) };
      const next = updater instanceof Function ? updater(prevMerged) : updater;
      return next;
    });
  };
  const [margenConfig, setMargenConfig] = useData("teg_presupuesto_v1_margenConfig", MARGEN_CONFIG_DEFAULT);
  const [saveStatus, setSaveStatus] = useState("idle");

  const [rawPats] = useData(LS_PATS, []);
  const [rawCamPedidos] = useData(LS_CAM_PEDIDOS, []);
  const [rawCamCoste] = useData(LS_CAM_COSTE, { corredor: 7.5, voluntario: 7.5 });

  // ── Valores calculados en tiempo real desde otros bloques ────────────────
  const totalPatConfirmado = useMemo(() => {
    const pats = Array.isArray(rawPats) ? rawPats : [];
    return pats.filter(p => !p.especie).reduce((s, p) => s + getImporteComprometido(p), 0);
  }, [rawPats]);

  const totalPatCobrado = useMemo(() => {
    const pats = Array.isArray(rawPats) ? rawPats : [];
    return pats.filter(p => !p.especie && p.estado === "cobrado").reduce((s, p) => s + getImporteCobrado(p), 0);
  }, [rawPats]);

  const totalSubvencionPublica = useMemo(() => {
    const pats = Array.isArray(rawPats) ? rawPats : [];
    return pats
      .filter(p => p.sector === "Administración pública" && !p.especie)
      .reduce((s, p) => s + getImporteComprometido(p), 0);
  }, [rawPats]);

  const totalMerchBeneficio = useMemo(() => {
    // Parte 1: Pedidos del bloque Camisetas (teg_camisetas_v1_pedidos)
    const pedidos = Array.isArray(rawCamPedidos) ? rawCamPedidos : [];
    const coste = rawCamCoste || { corredor: 7.5, voluntario: 7.5 };
    const lineas = pedidos.flatMap(p => p.lineas || []);
    const ingPedidos = lineas.filter(l => l.estadoPago === "pagado")
                             .reduce((s, l) => s + (l.cantidad * (l.precioVenta || 0)), 0);
    const costePedidos = lineas.filter(l => l.estadoPago === "pagado" || l.estadoPago === "pendiente")
                               .reduce((s, l) => s + (l.cantidad * (coste[l.tipo] || 7.5)), 0);
    const beneficioPedidos = ingPedidos - costePedidos;

    // Parte 2: Merchandising local (TabIngresos — "Venta de Productos")
    const merch = Array.isArray(merchandising) ? merchandising.filter(m => m.activo) : [];
    const ingMerch = merch.reduce((s, m) => s + m.unidades * (m.precioVenta || 0), 0);
    const costeMerch = merch.reduce((s, m) => s + m.unidades * (m.costeUnitario || 0), 0);
    const beneficioMerch = ingMerch - costeMerch;

    // Total combinado: ambas fuentes
    return beneficioPedidos + beneficioMerch;
  }, [rawCamPedidos, rawCamCoste, merchandising]);

  // Balance de camisetas técnicas: unidades corredor del bloque Camisetas
  // + unidades de items "Camiseta técnica" del merchandising local
  const totalBalanceCamisetasTecnicas = useMemo(() => {
    // Beneficio neto de camisetas técnicas (tipo corredor) del bloque Camisetas
    const pedidos = Array.isArray(rawCamPedidos) ? rawCamPedidos : [];
    const coste = rawCamCoste || { corredor: 7.5, voluntario: 7.5 };
    const lineasCorredor = pedidos.flatMap(p => p.lineas || []).filter(l => l.tipo === "corredor");
    const ingCorredor = lineasCorredor.filter(l => l.estadoPago === "pagado")
                                      .reduce((s, l) => s + (l.cantidad * (l.precioVenta || 0)), 0);
    const costeCorredor = lineasCorredor.filter(l => l.estadoPago === "pagado" || l.estadoPago === "pendiente")
                                        .reduce((s, l) => s + (l.cantidad * (coste.corredor || 7.5)), 0);
    const beneficioPedidosCor = ingCorredor - costeCorredor;

    // Beneficio neto de "Camiseta técnica" del merchandising local (nombre contiene "camiseta")
    const merch = Array.isArray(merchandising) ? merchandising.filter(m => m.activo) : [];
    const camisetasMerch = merch.filter(m => m.nombre?.toLowerCase().includes("camiseta"));
    const ingCamisetasMerch = camisetasMerch.reduce((s, m) => s + m.unidades * (m.precioVenta || 0), 0);
    const costeCamisetasMerch = camisetasMerch.reduce((s, m) => s + m.unidades * (m.costeUnitario || 0), 0);
    const beneficioCamisetasMerch = ingCamisetasMerch - costeCamisetasMerch;

    return beneficioPedidosCor + beneficioCamisetasMerch;
  }, [rawCamPedidos, rawCamCoste, merchandising]);

  // ── Función que devuelve el valor actualizado de una línea sincronizada ──
  // Esta función es la ÚNICA fuente de verdad para los valores de las líneas
  const getValorSincronizado = useCallback((ie) => {
    const key = ie.syncKey || (ie.id === 1 ? "patrocinios" : ie.id === 2 ? "camisetas" : null);
    if (!key) return ie.valor; // manual: valor del estado
    if (key === "patrocinios")        return totalPatConfirmado;
    if (key === "patrociniosCobrado") return totalPatCobrado;
    if (key === "camisetas")          return totalMerchBeneficio;
    if (key === "subvencionPublica")  return totalSubvencionPublica;
    return ie.valor;
  }, [totalPatConfirmado, totalPatCobrado, totalMerchBeneficio, totalSubvencionPublica]);

  // ── ingresosExtraConValores: array con valores en tiempo real ────────────
  // No es estado — se calcula en cada render. Esto GARANTIZA que los KPIs
  // son coherentes con los toggles sin depender de efectos asíncronos.
  // Mapa canónico id → syncKey para migrar datos antiguos sin syncKey
  const ID_TO_SYNCKEY = { 1: "patrocinios", 2: "camisetas", 3: "patrociniosCobrado", 10: "subvencionPublica", 13: "balanceCamisetasTecnicas" };

  const ingresosExtraConValores = useMemo(() => {
    const base = scenarioIngresosExtra ?? ingresosExtra;
    return base.map(ie => {
      // Routing: primero syncKey del dato, luego fallback por id para datos legados
      const key = ie.syncKey || ID_TO_SYNCKEY[ie.id] || null;
      if (!key) return { ...ie, synced: false }; // línea manual: respeta ie.activo

      // Para líneas sincronizadas: activo viene de syncConfig (fuente de verdad del toggle)
      // syncConfig se actualiza síncronamente vía useData.setValue → setState
      const activo = syncConfig[key] !== undefined ? syncConfig[key] : ie.activo;

      // Valor calculado en tiempo real desde otros bloques
      const valor = key === "patrocinios"            ? totalPatConfirmado
                  : key === "patrociniosCobrado"     ? totalPatCobrado
                  : key === "camisetas"              ? totalMerchBeneficio
                  : key === "subvencionPublica"      ? totalSubvencionPublica
                  : key === "balanceCamisetasTecnicas" ? totalBalanceCamisetasTecnicas
                  : ie.valor;

      return { ...ie, syncKey: key, valor, activo, synced: true };
    });
  }, [ingresosExtra, scenarioIngresosExtra, syncConfig,
      totalPatConfirmado, totalPatCobrado, totalMerchBeneficio,
    totalBalanceCamisetasTecnicas, totalSubvencionPublica, totalBalanceCamisetasTecnicas]);

  // ── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          savedTramos, savedConceptos, savedInscritos,
          savedIngresos, savedMerch, savedMaximos
        ] = await Promise.all([
          dataService.get("teg_presupuesto_v1_tramos"),
          dataService.get("teg_presupuesto_v1_conceptos"),
          dataService.get("teg_presupuesto_v1_inscritos"),
          dataService.get("teg_presupuesto_v1_ingresosExtra"),
          dataService.get("teg_presupuesto_v1_merchandising"),
          dataService.get("teg_presupuesto_v1_maximos"),
        ]);
        if (savedTramos) setTramos(savedTramos);
        if (savedConceptos) {
          setConceptos(savedConceptos.map(c => ({
            ...c,
            activo: c.activo !== false,
            activoDistancias: c.activoDistancias ?? { TG7: true, TG13: true, TG25: true },
            costePorDistancia: c.costePorDistancia ?? { TG7: 0, TG13: 0, TG25: 0 },
          })));
        }
        if (savedInscritos) setInscritos(savedInscritos);
        if (savedIngresos) {
          // Migrar datos legados: añadir syncKey si falta (versiones antiguas no lo tenían)
          const ID_TO_SYNCKEY_LOAD = { 1: "patrocinios", 2: "camisetas", 3: "patrociniosCobrado", 10: "subvencionPublica", 13: "balanceCamisetasTecnicas" };
          const migrated = savedIngresos.map(ie => {
            if (ie.syncKey) return ie; // ya tiene syncKey, no migrar
            const syncKey = ID_TO_SYNCKEY_LOAD[ie.id];
            if (!syncKey) return ie; // línea manual, dejar como está
            return { ...ie, syncKey, synced: true }; // migrar
          });
          setIngresosExtra(migrated);
        }
        if (savedMerch) setMerchandising(savedMerch);
        if (savedMaximos) setMaximos(savedMaximos);
      } catch (error) {
        console.error("Error loading budget data:", error);
      }
    };
    loadData();
  }, []);

  const emitSaveStatus = (status) => {
    window.dispatchEvent(new CustomEvent("teg-save-status", { detail: { status } }));
  };

  const saveData = useCallback(async () => {
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
    setSaveStatus("saving");
    emitSaveStatus("saving");
    try {
      await Promise.all([
        dataService.set("teg_presupuesto_v1_tramos",       tramos),
        dataService.set("teg_presupuesto_v1_conceptos",    conceptos),
        dataService.set("teg_presupuesto_v1_inscritos",    inscritos),
        dataService.set("teg_presupuesto_v1_ingresosExtra", ingresosExtra),
        dataService.set("teg_presupuesto_v1_merchandising", merchandising),
        dataService.set("teg_presupuesto_v1_maximos",      maximos),
      ]);
      setSaveStatus("saved");
      emitSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving budget data:", error);
      setSaveStatus("error");
      emitSaveStatus("error");
    }
  }, [tramos, conceptos, inscritos, ingresosExtra, merchandising, maximos]);

  const resetAllData = useCallback(() => {
    setTramos(TRAMOS_DEFAULT);
    setConceptos(CONCEPTOS_DEFAULT);
    setInscritos(INSCRITOS_DEFAULT);
    setIngresosExtra(INGRESOS_EXTRA_DEFAULT);
    setMerchandising(MERCHANDISING_DEFAULT);
    setMaximos(MAXIMOS_DEFAULT);
  }, []);

  const autoSaveTimer = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      emitSaveStatus("saving");
      try {
        await Promise.all([
          dataService.set("teg_presupuesto_v1_tramos", tramos),
          dataService.set("teg_presupuesto_v1_conceptos", conceptos),
          dataService.set("teg_presupuesto_v1_inscritos", inscritos),
          dataService.set("teg_presupuesto_v1_ingresosExtra", ingresosExtra),
          dataService.set("teg_presupuesto_v1_merchandising", merchandising),
          dataService.set("teg_presupuesto_v1_maximos", maximos)
        ]);
        emitSaveStatus("saved");
      } catch { emitSaveStatus("error"); }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [tramos, conceptos, inscritos, ingresosExtra, merchandising, maximos]);

  const logCambio = (concepto, campo, valorAntes, valorNuevo) => {
    const apiKey = import.meta.env.VITE_API_KEY;
    fetch("/api/budget-log", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        conceptoId: concepto.id,
        concepto:   concepto.nombre || `#${concepto.id}`,
        campo, valorAntes: String(valorAntes ?? ""), valorNuevo: String(valorNuevo ?? ""),
        tipo: concepto.tipo ?? null,
      }),
    }).catch(() => {});
  };

  const updateConcepto = (id, field, value) => {
    setConceptos(prev => prev.map(c => {
      if (c.id !== id) return c;
      const camposLog = ["nombre","activo","costeTotal","modoUniforme",
                         "estadoPago","estadoPedido","proveedor","contacto",
                         "fechaPago","fechaEntrega","costeUnitarioReal"];
      if (camposLog.includes(field) && c[field] !== value) logCambio(c, field, c[field], value);
      return { ...c, [field]: value };
    }));
  };

  const updateCostePorDistancia = (id, dist, value) => {
    setConceptos(prev => prev.map(c => {
      if (c.id !== id) return c;
      if (c.modoUniforme) {
        const antes = c.costePorDistancia.TG7;
        if (antes !== value) logCambio(c, "precio (todas las distancias)", antes, value);
        return { ...c, costePorDistancia: Object.fromEntries(["TG7","TG13","TG25"].map(d => [d, value])) };
      }
      const antes = c.costePorDistancia[dist];
      if (antes !== value) logCambio(c, `precio ${dist}`, antes, value);
      return { ...c, costePorDistancia: { ...c.costePorDistancia, [dist]: value } };
    }));
  };

  const updateActivoDistancia = (id, dist, value) => {
    setConceptos(prev => prev.map(c => {
      if (c.id !== id) return c;
      if (c.activoDistancias[dist] !== value) logCambio(c, `${dist} activo`, c.activoDistancias[dist], value);
      return { ...c, activoDistancias: { ...c.activoDistancias, [dist]: value } };
    }));
  };

  const addConcepto = (tipo) => {
    const id = conceptos.length > 0 ? Math.max(...conceptos.map(c => c.id)) + 1 : 1;
    setConceptos(prev => [...prev, {
      id, tipo, nombre: `Nuevo concepto ${tipo}`,
      costeTotal: 0, costePorDistancia: { TG7: 0, TG13: 0, TG25: 0 },
      activoDistancias: { TG7: true, TG13: true, TG25: true },
      activo: true, modoUniforme: tipo === "variable" ? true : undefined, orden: conceptos.length
    }]);
  };

  const removeConcepto = (id) => setConceptos(prev => prev.filter(c => c.id !== id));

  const reorderConceptos = (tipo, fromId, toId) => {
    if (fromId === toId) return;
    setConceptos(prev => {
      const arr = [...prev];
      const fi = arr.findIndex(c => c.id === fromId);
      const ti = arr.findIndex(c => c.id === toId);
      const [moved] = arr.splice(fi, 1);
      arr.splice(ti, 0, moved);
      return arr;
    });
  };

  const updateTramoPrecio = (tramoId, dist, value) => {
    setTramos(prev => prev.map(t => t.id === tramoId ? { ...t, precios: { ...t.precios, [dist]: value } } : t));
  };

  const addTramo = () => {
    const id = tramos.length > 0 ? Math.max(...tramos.map(t => t.id)) + 1 : 1;
    setTramos(prev => [...prev, { id, nombre: `Nuevo Tramo ${id}`, fechaFin: new Date().toISOString().split("T")[0], precios: { TG7: 30, TG13: 45, TG25: 65 } }]);
  };

  const updateInscritos = (tramoId, dist, value) => {
    setInscritos(prev => ({ ...prev, tramos: { ...prev.tramos, [tramoId]: { ...prev.tramos[tramoId], [dist]: value } } }));
  };

  // ── Valores base (con soporte de escenarios) ────────────────────────────
  const _inscritos = scenarioInscritos ?? inscritos;
  const _conceptos = scenarioConceptos ?? conceptos;
  // _ingresosExtra = ingresosExtraConValores (ya tiene escenario aplicado y valores en tiempo real)
  const _merchandising = scenarioMerchandising ?? merchandising;

  const totalInscritos = useMemo(() => calculateTotalInscritos(tramos, _inscritos), [tramos, _inscritos]);
  const ingresosPorDistancia = useMemo(() => calculateIngresosPorDistancia(tramos, _inscritos), [tramos, _inscritos]);
  const precioMedioDistancia = useMemo(() => calculatePrecioMedioDistancia(totalInscritos, ingresosPorDistancia), [totalInscritos, ingresosPorDistancia]);
  const costesFijos = useMemo(() => calculateCostesFijos(_conceptos, totalInscritos), [_conceptos, totalInscritos]);
  const costesVariables = useMemo(() => calculateCostesVariables(_conceptos, totalInscritos), [_conceptos, totalInscritos]);
  const costesVarPorCorredor = useMemo(() => calculateCostesVarPorCorredor(_conceptos), [_conceptos]);
  const costesFijoPorCorredor = useMemo(() => calculateCostesFijoPorCorredor(costesFijos, totalInscritos), [costesFijos, totalInscritos]);
  const merchTotales = useMemo(() => calculateMerchTotales(_merchandising), [_merchandising]);
  const ingresosDesglosados = useMemo(() => calculateIngresosDesglosados(tramos, _inscritos), [tramos, _inscritos]);

  // totalIngresosExtra se calcula directamente de ingresosExtraConValores
  // que ya tiene los valores en tiempo real y respeta ie.activo/syncConfig
  const totalIngresosExtra = useMemo(() =>
    ingresosExtraConValores.filter(i => i.activo).reduce((s, i) => s + i.valor, 0),
    [ingresosExtraConValores]);

  const totalIngresosConMerch = totalIngresosExtra;

  const resultado = useMemo(() =>
    calculateResultado(totalInscritos, ingresosPorDistancia, costesFijos, costesVariables, totalIngresosConMerch),
    [totalInscritos, ingresosPorDistancia, costesFijos, costesVariables, totalIngresosConMerch]);

  const puntoEquilibrio = useMemo(() =>
    calculatePuntoEquilibrio(totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch, maximos),
    [totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch, maximos]);

  const peGlobal = useMemo(() =>
    calculatePEGlobal(totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch, maximos),
    [totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch, maximos]);

  const realTotalInscritos = useMemo(() => calculateTotalInscritos(tramos, inscritos), [tramos, inscritos]);
  const realIngresosPorDistancia = useMemo(() => calculateIngresosPorDistancia(tramos, inscritos), [tramos, inscritos]);
  const realCostesFijos = useMemo(() => calculateCostesFijos(conceptos, realTotalInscritos), [conceptos, realTotalInscritos]);
  const realCostesVariables = useMemo(() => calculateCostesVariables(conceptos, realTotalInscritos), [conceptos, realTotalInscritos]);
  const realResultado = useMemo(() =>
    calculateResultado(realTotalInscritos, realIngresosPorDistancia, realCostesFijos, realCostesVariables, totalIngresosConMerch),
    [realTotalInscritos, realIngresosPorDistancia, realCostesFijos, realCostesVariables, totalIngresosConMerch]);

  return {
    tab, setTab, tramos, setTramos,
    totalPatConfirmado, totalPatCobrado, totalMerchBeneficio,
    totalBalanceCamisetasTecnicas,
    syncConfig, setSyncConfig,
    totalSubvencionPublica,
    margenConfig, setMargenConfig,
    conceptos, setConceptos,
    inscritos, setInscritos,
    ingresosExtra: ingresosExtraConValores, // exponer la versión con valores en tiempo real
    setIngresosExtra,
    merchandising, setMerchandising,
    maximos, setMaximos,
    saveStatus, saveData, resetAllData,
    updateConcepto, updateCostePorDistancia, updateActivoDistancia,
    addConcepto, removeConcepto, reorderConceptos,
    updateTramoPrecio, addTramo, updateInscritos,
    totalInscritos, ingresosPorDistancia, precioMedioDistancia,
    costesFijos, costesVariables, costesVarPorCorredor, costesFijoPorCorredor,
    merchTotales, totalIngresosExtra, totalIngresosConMerch,
    resultado, puntoEquilibrio, peGlobal,
    ingresosDesglosados,
    realTotalInscritos, realResultado,
    getValorSincronizado,
  };
};
