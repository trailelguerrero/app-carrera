import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import dataService from "../lib/dataService";
import { 
  TRAMOS_DEFAULT, 
  CONCEPTOS_DEFAULT, 
  INSCRITOS_DEFAULT, 
  INGRESOS_EXTRA_DEFAULT, 
  MERCHANDISING_DEFAULT,
  MAXIMOS_DEFAULT,
  DISTANCIAS
} from "../constants/budgetConstants";
import {
  calculateTotalInscritos,
  calculateIngresosPorDistancia,
  calculatePrecioMedioDistancia,
  calculateCostesFijos,
  calculateCostesVariables,
  calculateCostesVarPorCorredor,
  calculateCostesFijoPorCorredor,
  calculateMerchTotales,
  calculateResultado,
  calculatePuntoEquilibrio
} from "../lib/budgetUtils";

export const useBudgetLogic = () => {
  // ─── STATE ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState("presupuesto");
  const [tramos, setTramos] = useState(TRAMOS_DEFAULT);
  const [conceptos, setConceptos] = useState(CONCEPTOS_DEFAULT);
  const [inscritos, setInscritos] = useState(INSCRITOS_DEFAULT);
  const [ingresosExtra, setIngresosExtra] = useState(INGRESOS_EXTRA_DEFAULT);
  const [merchandising, setMerchandising] = useState(MERCHANDISING_DEFAULT);
  const [maximos, setMaximos] = useState(MAXIMOS_DEFAULT);
  const [saveStatus, setSaveStatus] = useState("idle");

  // ─── DATA PERSISTENCE ───────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          savedTramos, 
          savedConceptos, 
          savedInscritos, 
          savedIngresos, 
          savedMerch, 
          savedMaximos
        ] = await Promise.all([
          dataService.get("teg_presupuesto_v1_tramos"),
          dataService.get("teg_presupuesto_v1_conceptos"),
          dataService.get("teg_presupuesto_v1_inscritos"),
          dataService.get("teg_presupuesto_v1_ingresosExtra"),
          dataService.get("teg_presupuesto_v1_merchandising"),
          dataService.get("teg_presupuesto_v1_maximos")
        ]);

        if (savedTramos) setTramos(savedTramos);
        if (savedConceptos) setConceptos(savedConceptos);
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

  // Emite evento global para el AutosaveIndicator del topbar
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
    if (window.confirm("¿Estás seguro de que quieres restablecer todos los datos a los valores predeterminados?")) {
      setTramos(TRAMOS_DEFAULT);
      setConceptos(CONCEPTOS_DEFAULT);
      setInscritos(INSCRITOS_DEFAULT);
      setIngresosExtra(INGRESOS_EXTRA_DEFAULT);
      setMerchandising(MERCHANDISING_DEFAULT);
      setMaximos(MAXIMOS_DEFAULT);
    }
  }, []);

  // ─── AUTOSAVE (debounced, 2s tras el último cambio) ─────────────────────────
  const autoSaveTimer = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Saltar el primer render (carga inicial de datos)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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
      } catch {
        emitSaveStatus("error");
      }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [tramos, conceptos, inscritos, ingresosExtra, merchandising, maximos]);
  const updateConcepto = (id, field, value) => {
    setConceptos(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const updateCostePorDistancia = (id, dist, value) => {
    setConceptos(prev => prev.map(c => c.id === id ? { 
      ...c, 
      costePorDistancia: { ...c.costePorDistancia, [dist]: value } 
    } : c));
  };

  const updateActivoDistancia = (id, dist, value) => {
    setConceptos(prev => prev.map(c => c.id === id ? { 
      ...c, 
      activoDistancias: { ...c.activoDistancias, [dist]: value } 
    } : c));
  };

  const addConcepto = (tipo) => {
    const id = conceptos.length > 0 ? Math.max(...conceptos.map(c => c.id)) + 1 : 1;
    const nuevo = {
      id,
      tipo,
      nombre: `Nuevo concepto ${tipo}`,
      costeTotal: 0,
      costePorDistancia: { TG7: 0, TG13: 0, TG25: 0 },
      activoDistancias: { TG7: true, TG13: true, TG25: true },
      activo: true,
      modoUniforme: tipo === "variable" ? true : undefined,
      orden: conceptos.length
    };
    setConceptos(prev => [...prev, nuevo]);
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
    setTramos(prev => prev.map(t => t.id === tramoId ? {
      ...t,
      precios: { ...t.precios, [dist]: value }
    } : t));
  };

  const addTramo = () => {
    const id = tramos.length > 0 ? Math.max(...tramos.map(t => t.id)) + 1 : 1;
    setTramos(prev => [...prev, {
      id,
      nombre: `Nuevo Tramo ${id}`,
      fecha: new Date().toISOString().split("T")[0],
      precios: { TG7: 30, TG13: 45, TG25: 65 }
    }]);
  };

  const updateInscritos = (tramoId, dist, value) => {
    setInscritos(prev => ({
      ...prev,
      tramos: {
        ...prev.tramos,
        [tramoId]: { ...prev.tramos[tramoId], [dist]: value }
      }
    }));
  };

  // ─── DERIVED STATE ──────────────────────────────────────────────────────────
  const totalInscritos = useMemo(() => calculateTotalInscritos(tramos, inscritos), [tramos, inscritos]);
  const ingresosPorDistancia = useMemo(() => calculateIngresosPorDistancia(tramos, inscritos), [tramos, inscritos]);
  const precioMedioDistancia = useMemo(() => calculatePrecioMedioDistancia(totalInscritos, ingresosPorDistancia), [totalInscritos, ingresosPorDistancia]);
  const costesFijos = useMemo(() => calculateCostesFijos(conceptos, totalInscritos), [conceptos, totalInscritos]);
  const costesVariables = useMemo(() => calculateCostesVariables(conceptos, totalInscritos), [conceptos, totalInscritos]);
  const costesVarPorCorredor = useMemo(() => calculateCostesVarPorCorredor(conceptos), [conceptos]);
  const costesFijoPorCorredor = useMemo(() => calculateCostesFijoPorCorredor(costesFijos, totalInscritos), [costesFijos, totalInscritos]);
  const merchTotales = useMemo(() => calculateMerchTotales(merchandising), [merchandising]);
  
  const totalIngresosExtra = useMemo(() => 
    ingresosExtra.filter(i => i.activo).reduce((s, i) => s + i.valor, 0), 
    [ingresosExtra]
  );
  
  const totalIngresosConMerch = useMemo(() => totalIngresosExtra + merchTotales.beneficio, [totalIngresosExtra, merchTotales]);
  
  const resultado = useMemo(() => 
    calculateResultado(totalInscritos, ingresosPorDistancia, costesFijos, costesVariables, totalIngresosConMerch),
    [totalInscritos, ingresosPorDistancia, costesFijos, costesVariables, totalIngresosConMerch]
  );

  const puntoEquilibrio = useMemo(() => 
    calculatePuntoEquilibrio(totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch),
    [totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch]
  );

  return {
    tab, setTab,
    tramos, setTramos,
    conceptos, setConceptos,
    inscritos, setInscritos,
    ingresosExtra, setIngresosExtra,
    merchandising, setMerchandising,
    maximos, setMaximos,
    saveStatus,
    saveData,
    resetAllData,
    updateConcepto,
    updateCostePorDistancia,
    updateActivoDistancia,
    addConcepto,
    removeConcepto,
    reorderConceptos,
    updateTramoPrecio,
    addTramo,
    updateInscritos,
    totalInscritos,
    ingresosPorDistancia,
    precioMedioDistancia,
    costesFijos,
    costesVariables,
    costesVarPorCorredor,
    costesFijoPorCorredor,
    merchTotales,
    totalIngresosExtra,
    totalIngresosConMerch,
    resultado,
    puntoEquilibrio
  };
};
