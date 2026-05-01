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
  SYNC_CONFIG_DEFAULT
} from "../constants/budgetConstants";
const LS_PATS = "teg_patrocinadores_v1_pats";
const LS_CAM_PEDIDOS = "teg_camisetas_v1_pedidos";
const LS_CAM_COSTE = "teg_camisetas_v1_coste";
import {
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
  const [ingresosExtra, setIngresosExtra] = useState(INGRESOS_EXTRA_DEFAULT);
  const [merchandising, setMerchandising] = useState(MERCHANDISING_DEFAULT);
  const [maximos, setMaximos] = useState(MAXIMOS_DEFAULT);
  const [syncConfig, setSyncConfig] = useData("teg_presupuesto_v1_syncConfig", SYNC_CONFIG_DEFAULT);
  const [saveStatus, setSaveStatus] = useState("idle");

  const [rawPats] = useData(LS_PATS, []);
  const [rawCamPedidos] = useData(LS_CAM_PEDIDOS, []);
  const [rawCamCoste] = useData(LS_CAM_COSTE, { corredor: 7.5, voluntario: 7.5 });

  // Captado: confirmado + cobrado (compromiso firmado, aunque no cobrado aún)
  const totalPatConfirmado = useMemo(() => {
    if (!syncConfig.patrocinios) return 0;
    const pats = Array.isArray(rawPats) ? rawPats : [];
    return pats
      .filter(p => !p.especie && (p.estado === "confirmado" || p.estado === "cobrado"))
      .reduce((s, p) => s + (p.importe || 0), 0);
  }, [rawPats, syncConfig.patrocinios]);

  // Cobrado real: solo estado cobrado (tesorería — dinero ya en cuenta)
  const totalPatCobrado = useMemo(() => {
    if (!syncConfig.patrociniosCobrado) return 0;
    const pats = Array.isArray(rawPats) ? rawPats : [];
    return pats
      .filter(p => !p.especie && p.estado === "cobrado")
      .reduce((s, p) => s + ((p.importeCobrado != null ? p.importeCobrado : p.importe) || 0), 0);
  }, [rawPats, syncConfig.patrociniosCobrado]);

  const totalMerchBeneficio = useMemo(() => {
    if (!syncConfig.camisetas) return 0;
    const pedidos = Array.isArray(rawCamPedidos) ? rawCamPedidos : [];
    const coste = rawCamCoste || { corredor: 7.5, voluntario: 7.5 };
    const lineas = pedidos.flatMap(p => p.lineas);
    const ingresos = lineas.filter(l => l.estadoPago === "pagado")
                           .reduce((s, l) => s + (l.cantidad * (l.precioVenta || 0)), 0);
    const costeFab = lineas.filter(l => l.estadoPago === "pagado" || l.estadoPago === "pendiente")
                           .reduce((s, l) => s + (l.cantidad * (coste[l.tipo] || 7.5)), 0);
    return ingresos - costeFab;
  }, [rawCamPedidos, rawCamCoste, syncConfig.camisetas]);

  useEffect(() => {
    setIngresosExtra(prev => prev.map(ie => {
      if (ie.id === 1 && syncConfig.patrocinios) return { ...ie, valor: totalPatConfirmado, synced: true };
      if (ie.id === 2 && syncConfig.camisetas)   return { ...ie, valor: totalMerchBeneficio, synced: true };
      return ie;
    }));
  }, [totalPatConfirmado, totalMerchBeneficio, syncConfig]);

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
          dataService.get("teg_presupuesto_v1_maximos")
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
        if (savedIngresos) setIngresosExtra(savedIngresos);
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
    setSaveStatus("saving");
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
    setMaximos(MAXIMOS_DEFAULT); // C1 fix: restablecer aforos máximos
  }, []);

  const autoSaveTimer = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    emitSaveStatus("saving");
    autoSaveTimer.current = setTimeout(async () => {
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
        campo,
        valorAntes: String(valorAntes ?? ""),
        valorNuevo: String(valorNuevo ?? ""),
        tipo:       concepto.tipo ?? null,
      }),
    }).catch(() => {});
  };

  const updateConcepto = (id, field, value) => {
    setConceptos(prev => {
      const next = prev.map(c => {
        if (c.id !== id) return c;
        const camposLog = ["nombre","activo","costeTotal","modoUniforme",
                           "estadoPago","estadoPedido","proveedor","contacto",
                           "fechaPago","fechaEntrega","costeUnitarioReal"];
        if (camposLog.includes(field) && c[field] !== value) logCambio(c, field, c[field], value);
        return { ...c, [field]: value };
      });
      return next;
    });
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

  const _inscritos = scenarioInscritos ?? inscritos;
  const _conceptos = scenarioConceptos ?? conceptos;
  const _ingresosExtra = scenarioIngresosExtra ?? ingresosExtra;
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

  const totalIngresosExtra = useMemo(() =>
    _ingresosExtra.filter(i => i.activo).reduce((s, i) => s + i.valor, 0), [_ingresosExtra]);

  const totalIngresosConMerch = useMemo(() => totalIngresosExtra + merchTotales.beneficio, [totalIngresosExtra, merchTotales]);

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
    syncConfig, setSyncConfig,
    conceptos, setConceptos,
    inscritos, setInscritos,
    ingresosExtra, setIngresosExtra,
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
    ingresosDesglosados, // C2 fix
    realTotalInscritos, realResultado
  };
};
