import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import dataService from "@/lib/dataService";
import { useData } from "@/hooks/useData";
import {
  TRAMOS_DEFAULT,
  CONCEPTOS_DEFAULT,
  INSCRITOS_DEFAULT,
  INGRESOS_EXTRA_DEFAULT,
  MERCHANDISING_DEFAULT,
  MAXIMOS_DEFAULT,
  SYNC_CONFIG_DEFAULT,
  CAMISETAS_SYNC_CONFIG_DEFAULT,
  MARGEN_CONFIG_DEFAULT
} from "../constants/budgetConstants";
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
  calculatePEGlobal,
  calculateCamisetasPresupuesto,
  calculateInscritosConPago,
  calculatePrecioMedioPago,
} from "../lib/budgetUtils";
import { SK_CAM_PEDIDOS, SK_CAM_COSTE, SK_CAM_CORREDORES, SK_CAM_PRECIO_PLATAFORMA, SK_CAM_NINO, SK_CAM_VENTA_PUBLICO,
  SK_CAM_NO_CORREDOR, SK_CAM_PRECIO_NO_CORREDOR, SK_CAM_INCLUIR_PENDIENTES,
  SK_PAT_PATS,
  SK_PPTO_SYNC_CONFIG, SK_PPTO_CAM_SYNC_CONFIG, SK_PPTO_MARGEN_CONFIG,
  SK_PPTO_TRAMOS, SK_PPTO_CONCEPTOS, SK_PPTO_INSCRITOS,
  SK_PPTO_INGRESOS_EXTRA, SK_PPTO_MERCHANDISING, SK_PPTO_MAXIMOS,
  SK_VOL_VOLUNTARIOS,
} from "../constants/storageKeys";
// ECO-03: COSTE_DEFAULT importado desde su propietario canónico (módulo Camisetas).
// No usar fallbacks hardcoded { corredor:7.5, voluntario:7.5 } — eran incorrectos.
// budgetConstants re-exporta este mismo objeto para compatibilidad con otros imports.
import { COSTE_DEFAULT as CAM_COSTE_DEFAULT, PRECIO_NO_CORREDOR_DEFAULT } from "../components/camisetas/camisetasConstants";

// Claves de persistencia propias del módulo de presupuesto
const LS_PATS = SK_PAT_PATS;

// Mapa canónico id → syncKey para migrar datos legados sin syncKey.
// Constante de módulo (estática) — no debe declararse dentro del hook
// para evitar advertencias de react-hooks/exhaustive-deps.
// ECO-08: 'camisetas' (id:2) y 'balanceCamisetasTecnicas' (id:13) eliminados del mapa —
// esos ids ya no se migran a syncKey, se filtran en la carga (ver loadData).
const ID_TO_SYNCKEY = { 1: "patrocinios", 3: "patrociniosCobrado", 10: "subvencionPublica" };
// Ids legados de líneas sincronizadas eliminadas — se filtran al cargar datos guardados.
const LEGACY_REMOVED_INGRESO_IDS = new Set([2, 13]);
// Id legado del concepto fijo "Camisetas voluntarios" — se filtra al cargar conceptos guardados.
const LEGACY_REMOVED_CONCEPTO_ID = 12;

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
  const [syncConfigRaw, setSyncConfigRaw] = useData(SK_PPTO_SYNC_CONFIG, SYNC_CONFIG_DEFAULT);

  // Merge con defaults para añadir claves nuevas que no existían en datos guardados.
  // useMemo estabiliza la referencia para que los useMemo hijos no se re-ejecuten
  // innecesariamente cuando syncConfigRaw no ha cambiado.
  const syncConfig = useMemo(
    () => ({ ...SYNC_CONFIG_DEFAULT, ...(syncConfigRaw || {}) }),
    [syncConfigRaw]
  );

  // setSyncConfig actualiza el estado raw (que también persiste en LS).
  // useCallback con dependencia mínima [setSyncConfigRaw] — estable entre renders,
  // evita re-renders innecesarios en TabEquilibrio cuando cambia otro estado.
  const setSyncConfig = useCallback((updater) => {
    setSyncConfigRaw(prev => {
      const prevMerged = { ...SYNC_CONFIG_DEFAULT, ...(prev || {}) };
      const next = updater instanceof Function ? updater(prevMerged) : updater;
      return next;
    });
    // FIX-DASH-SYNC: los toggles de syncConfig persisten vía useData (sin notify
    // propio) y no siempre disparan el autosave de abajo — notificar explícito.
    dataService.notify("presupuesto");
  }, [setSyncConfigRaw]);
  // ECO-08: syncConfig de las 6 categorías de camisetas, independiente del syncConfig general
  const [camSyncConfigRaw, setCamSyncConfigRaw] = useData(SK_PPTO_CAM_SYNC_CONFIG, CAMISETAS_SYNC_CONFIG_DEFAULT);
  const camSyncConfig = useMemo(
    () => ({ ...CAMISETAS_SYNC_CONFIG_DEFAULT, ...(camSyncConfigRaw || {}) }),
    [camSyncConfigRaw]
  );
  const setCamSyncConfig = useCallback((updater) => {
    setCamSyncConfigRaw(prev => {
      const prevMerged = { ...CAMISETAS_SYNC_CONFIG_DEFAULT, ...(prev || {}) };
      const next = updater instanceof Function ? updater(prevMerged) : updater;
      return next;
    });
    // FIX-DASH-SYNC: camSyncConfig no forma parte de las deps del autosave
    // (solo tramos/conceptos/inscritos/ingresosExtra/merchandising/maximos),
    // así que sin esto el Dashboard nunca se enteraba de estos toggles.
    dataService.notify("presupuesto");
  }, [setCamSyncConfigRaw]);
  const [margenConfig, setMargenConfig] = useData(SK_PPTO_MARGEN_CONFIG, MARGEN_CONFIG_DEFAULT);
  const [saveStatus, setSaveStatus] = useState("idle");

  const [rawPats] = useData(LS_PATS, []);
  const [rawCamPedidos] = useData(SK_CAM_PEDIDOS, []);
  const [rawCamCoste] = useData(SK_CAM_COSTE, CAM_COSTE_DEFAULT);
  const [rawCamCorredores] = useData(SK_CAM_CORREDORES, {});
  const [rawCamPrecioPlatObj] = useData(SK_CAM_PRECIO_PLATAFORMA, { precio: 0 });
  const [rawCamNino] = useData(SK_CAM_NINO, {});
  // ECO-04: venta al público general del módulo Camisetas
  const [rawCamVentaPublico] = useData(SK_CAM_VENTA_PUBLICO, { precio: 0, cantidad: 0 });
  // ECO-08: no-corredores (plataforma) — fuente real ya existente en Camisetas, antes no usada en Presupuesto
  const [rawCamNoCorredor] = useData(SK_CAM_NO_CORREDOR, {});
  const [rawCamPrecioNoCorrObj] = useData(SK_CAM_PRECIO_NO_CORREDOR, { precio: PRECIO_NO_CORREDOR_DEFAULT });
  const [rawVoluntarios] = useData(SK_VOL_VOLUNTARIOS, []);
  // ECO-11: respeta el toggle "incluir pendientes" del módulo Camisetas — antes este
  // hook siempre contaba confirmado+pendiente sin consultar SK_CAM_INCLUIR_PENDIENTES,
  // desincronizado del panel informativo de Camisetas que sí lo respeta.
  const [rawCamInclPendientes] = useData(SK_CAM_INCLUIR_PENDIENTES, false);

  // ── Valores calculados en tiempo real desde otros bloques ────────────────
  //
  // ECO-01 FIX: totalPatConfirmado excluye el sector "Administración pública"
  // cuando syncConfig.subvencionPublica está activo, para evitar doble cómputo
  // con totalSubvencionPublica.
  //
  // Invariante: un euro real solo puede aparecer una vez en la cuenta de resultados.
  // Si subvencionPublica está activo, los patrocinadores públicos ya se contabilizan
  // en la línea "Subvención entidad pública". Incluirlos también en "Patrocinios captados"
  // inflaría el resultado neto por el importe de esos patrocinadores.
  const totalPatConfirmado = useMemo(() => {
    const pats = Array.isArray(rawPats) ? rawPats : [];
    // Si subvencionPublica está activo, excluir sector público para evitar doble cómputo
    // con totalSubvencionPublica. Si está inactivo, incluir todos (solo una línea suma).
    const excluirPublicos = syncConfig.subvencionPublica === true;
    return pats
      .filter(p => !p.especie && (!excluirPublicos || p.sector !== "Administración pública"))
      .reduce((s, p) => s + getImporteComprometido(p), 0);
  }, [rawPats, syncConfig.subvencionPublica]);

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

  // ECO-08: unificar cálculo de camisetas con la misma función que usa el Dashboard.
  // [DUDOSO] cuenta siempre (como confirmado), independientemente del toggle de pendientes.
  const _camVoluntariosActivos = useMemo(() =>
    (Array.isArray(rawVoluntarios) ? rawVoluntarios : [])
      .filter(v => (v.estado === "confirmado" || v.estado === "dudoso" || (rawCamInclPendientes && v.estado === "pendiente")) && v.talla),
    [rawVoluntarios, rawCamInclPendientes]
  );

  // ECO-08: desglose de camisetas en 6 categorías independientes con toggle propio
  // (sustituye a totalMerchBeneficio / totalBalanceCamisetasTecnicas, que mezclaban
  // todas las fuentes en un único "beneficio neto" sin poder activar/desactivar por separado).
  const camisetasPresupuesto = useMemo(() => calculateCamisetasPresupuesto({
    camCoste: rawCamCoste || CAM_COSTE_DEFAULT,
    camPedidos: Array.isArray(rawCamPedidos) ? rawCamPedidos : [],
    corredoresExt: rawCamCorredores || {},
    precioCorrExt: rawCamPrecioPlatObj?.precio ?? 0,
    noCorredorExt: rawCamNoCorredor || {},
    precioNoCorrExt: rawCamPrecioNoCorrObj?.precio ?? PRECIO_NO_CORREDOR_DEFAULT,
    ventaPublico: rawCamVentaPublico || { precio: 0, cantidad: 0 },
    voluntariosActivos: _camVoluntariosActivos,
    // ECO-11: ninoExt ahora SÍ llega al cálculo de presupuesto (antes faltaba este
    // parámetro y el gasto de tallas de niño manuales nunca aparecía en el balance).
    ninoExt: rawCamNino || {},
    toggles: {
      corredores:   camSyncConfig.camCorredores,
      noCorredores: camSyncConfig.camNoCorredores,
      ventaPublico: camSyncConfig.camVentaPublico,
      otros:        camSyncConfig.camOtros,
      voluntarios:  camSyncConfig.camVoluntarios,
      regalos:      camSyncConfig.camRegalos,
      nino:         camSyncConfig.camNino,
    },
  }), [rawCamPedidos, rawCamCoste, rawCamCorredores, rawCamPrecioPlatObj, rawCamNoCorredor,
      rawCamPrecioNoCorrObj, rawCamVentaPublico, _camVoluntariosActivos, rawCamNino, camSyncConfig]);

  // Beneficio neto del merchandising local (Venta de Productos en TabIngresos) —
  // independiente de las 6 categorías de camisetas, se suma aparte en totalIngresosConMerch.
  const merchLocalBeneficio = useMemo(() => {
    const merch = Array.isArray(merchandising) ? merchandising.filter(m => m.activo) : [];
    const ing   = merch.reduce((s, m) => s + m.unidades * (m.precioVenta   || 0), 0);
    const coste = merch.reduce((s, m) => s + m.unidades * (m.costeUnitario || 0), 0);
    return ing - coste;
  }, [merchandising]);

  // Totales agregados que pide Ivan: "Ingresos venta camisetas" y "Gastos totales camisetas"
  const totalIngresosCamisetas = camisetasPresupuesto.totalIngresos;
  const totalGastosCamisetas   = camisetasPresupuesto.totalGastos;
  // Mantener el nombre histórico totalMerchBeneficio (beneficio neto camisetas + merch local)
  // como suma agregada para el P&L general — ya no es una línea sincronizada en Ingresos Extra,
  // sino la suma directa de las 6 categorías (con sus toggles ya aplicados) + merch local.
  const totalMerchBeneficio = camisetasPresupuesto.beneficioNeto + merchLocalBeneficio;

  // ── Función que devuelve el valor actualizado de una línea sincronizada ──
  // Esta función es la ÚNICA fuente de verdad para los valores de las líneas
  const getValorSincronizado = useCallback((ie) => {
    const key = ie.syncKey || (ie.id === 1 ? "patrocinios" : null);
    if (!key) return ie.valor; // manual: valor del estado
    if (key === "patrocinios") return totalPatConfirmado;
    if (key === "patrociniosCobrado") return totalPatCobrado;
    if (key === "subvencionPublica") return totalSubvencionPublica;
    return ie.valor;
  }, [totalPatConfirmado, totalPatCobrado, totalSubvencionPublica]);

  // ── ingresosExtraConValores: array con valores en tiempo real ────────────
  // No es estado — se calcula en cada render. Esto GARANTIZA que los KPIs
  // son coherentes con los toggles sin depender de efectos asíncronos.
  // ID_TO_SYNCKEY se declara a nivel de módulo (ver arriba) para evitar exhaustive-deps.
  //
  // ECO-02 INVARIANTE de fuente de verdad por tipo de línea:
  //   — Líneas CON syncKey: `activo` proviene SIEMPRE de syncConfig[key].
  //     syncConfig es la fuente canónica para estas líneas.
  //     ie.activo actúa como documentación del estado por defecto, no como fuente.
  //   — Líneas SIN syncKey (manuales): `activo` proviene de ie.activo.
  //     No tienen entrada en syncConfig.
  //
  // ECO-08: 'camisetas' y 'balanceCamisetasTecnicas' ya no son syncKeys válidos aquí —
  // ese dominio económico ahora vive en camisetasPresupuesto/camSyncConfig (ver arriba).

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
      const valor = key === "patrocinios" ? totalPatConfirmado
        : key === "patrociniosCobrado" ? totalPatCobrado
          : key === "subvencionPublica" ? totalSubvencionPublica
            : ie.valor;

      return { ...ie, syncKey: key, valor, activo, synced: true };
    });
  }, [ingresosExtra, scenarioIngresosExtra, syncConfig,
    totalPatConfirmado, totalPatCobrado, totalSubvencionPublica]);

  // ── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          savedTramos, savedConceptos, savedInscritos,
          savedIngresos, savedMerch, savedMaximos
        ] = await Promise.all([
          dataService.get(SK_PPTO_TRAMOS),
          dataService.get(SK_PPTO_CONCEPTOS),
          dataService.get(SK_PPTO_INSCRITOS),
          dataService.get(SK_PPTO_INGRESOS_EXTRA),
          dataService.get(SK_PPTO_MERCHANDISING),
          dataService.get(SK_PPTO_MAXIMOS),
        ]);
        if (Array.isArray(savedTramos) && savedTramos.length > 0) setTramos(savedTramos);
        if (savedConceptos) {
          // ECO-08: filtrar el concepto fijo legado id:12 "Camisetas voluntarios" —
          // ese gasto ahora se calcula en el bloque Camisetas (categoría "voluntarios").
          setConceptos(
            savedConceptos
              .filter(c => c.id !== LEGACY_REMOVED_CONCEPTO_ID)
              .map(c => ({
                ...c,
                activo: c.activo !== false,
                activoDistancias: c.activoDistancias ?? { TG7: true, TG13: true, TG25: true },
                costePorDistancia: c.costePorDistancia ?? { TG7: 0, TG13: 0, TG25: 0 },
              }))
          );
        }
        if (savedInscritos) setInscritos(savedInscritos);
        if (savedIngresos) {
          // ECO-08: filtrar líneas legadas id:2 ("camisetas") e id:13 ("balanceCamisetasTecnicas") —
          // ese dominio económico ahora vive en las 6 categorías de camisetasPresupuesto/camSyncConfig.
          const sinLegado = savedIngresos.filter(ie => !LEGACY_REMOVED_INGRESO_IDS.has(ie.id));

          // 1. Migrar datos legados: añadir syncKey si falta
          const migrated = sinLegado.map(ie => {
            if (ie.syncKey) return ie;
            const syncKey = ID_TO_SYNCKEY[ie.id];
            if (!syncKey) return ie;
            return { ...ie, syncKey, synced: true };
          });

          // 2. Garantizar que todos los ítems del DEFAULT existan en los datos guardados
          //    Si el usuario nunca ha tenido id=10 (subvencionPublica), se añade desde
          //    INGRESOS_EXTRA_DEFAULT para que siempre aparezca en la UI
          const savedIds = new Set(migrated.map(ie => ie.id));
          const missingDefaults = INGRESOS_EXTRA_DEFAULT.filter(ie => !savedIds.has(ie.id));
          const merged = [...migrated, ...missingDefaults];

          setIngresosExtra(merged);
        }
        if (savedMerch) setMerchandising(savedMerch);
        if (savedMaximos) setMaximos(savedMaximos);

        // FIX-RESET-3: Marcar carga completada — el autosave ya puede dispararse.
        dataLoadedFromNeon.current = true;
      } catch (error) {
        console.error("Error loading budget data:", error);
        // Aunque falle, permitir autosave para no bloquear la app.
        dataLoadedFromNeon.current = true;
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
      // FIX DIVERGENCIA DASHBOARD: se guardan ingresosExtraConValores (valores calculados en tiempo real)
      // en lugar del estado base ingresosExtra (que tiene valor:0 para líneas sincronizadas).
      // El Dashboard lee este snapshot y suma ie.valor directamente → necesita los valores reales.
      // ingresosExtraConValores tiene los mismos campos estructurales + valor actualizado (patrocinios, camisetas…).
      await Promise.all([
        dataService.set(SK_PPTO_TRAMOS, tramos),
        dataService.set(SK_PPTO_CONCEPTOS, conceptos),
        dataService.set(SK_PPTO_INSCRITOS, inscritos),
        dataService.set(SK_PPTO_INGRESOS_EXTRA, ingresosExtraConValores),
        dataService.set(SK_PPTO_MERCHANDISING, merchandising),
        dataService.set(SK_PPTO_MAXIMOS, maximos),
      ]);
      // FIX-DASH-SYNC: notificar al Dashboard tras guardado manual — sin esto,
      // su caché de React Query (staleTime 60s) no se invalida y sigue mostrando
      // el resultado/KPIs anteriores hasta que expire por tiempo o haya remount.
      dataService.notify("presupuesto");
      setSaveStatus("saved");
      emitSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving budget data:", error);
      setSaveStatus("error");
      emitSaveStatus("error");
    }
  }, [tramos, conceptos, inscritos, ingresosExtraConValores, merchandising, maximos]);

  // BUG-P4 fix: resetAllData ahora también limpia syncConfig y margenConfig
  // FIX-RESET-1: Antes de resetear, guarda backup en Neon con timestamp.
  // La colección teg_auto_backup_presupuesto_v1 puede recuperarse manualmente si el reset fue accidental.
  const backupBeforeReset = useCallback(async (currentTramos, currentConceptos, currentInscritos, currentIngresosExtra, currentMerchandising, currentMaximos) => {
    try {
      const backupKey = 'teg_auto_backup_presupuesto_v1';
      const backup = {
        timestamp: new Date().toISOString(),
        tramos: currentTramos,
        conceptos: currentConceptos,
        inscritos: currentInscritos,
        ingresosExtra: currentIngresosExtra,
        merchandising: currentMerchandising,
        maximos: currentMaximos,
      };
      await dataService.set(backupKey, backup);
      console.debug('[useBudgetLogic] Backup pre-reset guardado en Neon ✓', backup.timestamp);
      return true;
    } catch (e) {
      console.error('[useBudgetLogic] Error guardando backup pre-reset:', e);
      return false;
    }
  }, []);

  const resetAllData = useCallback(() => {
    setTramos(TRAMOS_DEFAULT);
    setConceptos(CONCEPTOS_DEFAULT);
    setInscritos(INSCRITOS_DEFAULT);
    setIngresosExtra(INGRESOS_EXTRA_DEFAULT);
    setMerchandising(MERCHANDISING_DEFAULT);
    setMaximos(MAXIMOS_DEFAULT);
    setSyncConfigRaw(SYNC_CONFIG_DEFAULT);
    // ECO-08: camSyncConfigRaw también debe resetearse — antes faltaba, dejando
    // los 6 toggles de camisetas en su último valor guardado tras un reset.
    setCamSyncConfigRaw(CAMISETAS_SYNC_CONFIG_DEFAULT);
    setMargenConfig(MARGEN_CONFIG_DEFAULT);
  }, [setSyncConfigRaw, setCamSyncConfigRaw, setMargenConfig]);

  const autoSaveTimer = useRef(null);
  const isFirstRender = useRef(true);
  // FIX-RESET-3: El autosave NO corre hasta que la carga inicial desde Neon complete.
  // Previene que los defaults en memoria sobreescriban datos reales si Neon tarda.
  const dataLoadedFromNeon = useRef(false);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    // FIX-RESET-4: No autosave hasta que la carga inicial desde Neon haya completado.
    // Si dataLoadedFromNeon es false, los estados aún pueden tener defaults y guardarlos
    // sobreescribiría datos reales en Neon (causa raíz de los resets accidentales).
    if (!dataLoadedFromNeon.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    // Capturar snapshot de ingresosExtraConValores en el momento del cambio (cierre léxico).
    // Esto garantiza que el autosave y el cleanup usan el mismo valor que disparó el efecto.
    const ingresosExtraSnapshot = ingresosExtraConValores;
    autoSaveTimer.current = setTimeout(async () => {
      autoSaveTimer.current = null;
      emitSaveStatus("saving");
      try {
        // FIX DIVERGENCIA DASHBOARD: guardar ingresosExtraConValores (valores en tiempo real)
        // para que el snapshot de localStorage tenga ie.valor correcto (no 0).
        await Promise.all([
          dataService.set(SK_PPTO_TRAMOS, tramos),
          dataService.set(SK_PPTO_CONCEPTOS, conceptos),
          dataService.set(SK_PPTO_INSCRITOS, inscritos),
          dataService.set(SK_PPTO_INGRESOS_EXTRA, ingresosExtraSnapshot),
          dataService.set(SK_PPTO_MERCHANDISING, merchandising),
          dataService.set(SK_PPTO_MAXIMOS, maximos)
        ]);
        // FIX-DASH-SYNC: notificar al Dashboard tras autosave — ver nota en saveData().
        dataService.notify("presupuesto");
        emitSaveStatus("saved");
      } catch { emitSaveStatus("error"); }
    }, 800);
    // Cleanup: si el componente desmonta con un timer pendiente (usuario navegó a otro bloque),
    // guardar inmediatamente en lugar de cancelar para no perder los datos.
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
        // Guardado síncrono al desmontar — no esperamos promesa para no bloquear
        Promise.all([
          dataService.set(SK_PPTO_TRAMOS, tramos),
          dataService.set(SK_PPTO_CONCEPTOS, conceptos),
          dataService.set(SK_PPTO_INSCRITOS, inscritos),
          dataService.set(SK_PPTO_INGRESOS_EXTRA, ingresosExtraSnapshot),
          dataService.set(SK_PPTO_MERCHANDISING, merchandising),
          dataService.set(SK_PPTO_MAXIMOS, maximos),
        ]).then(() => dataService.notify("presupuesto"))
          .catch(() => { /* ignorar errores al desmontar */ });
      }
    };
  }, [tramos, conceptos, inscritos, ingresosExtraConValores, merchandising, maximos]);

  const logCambio = (concepto, campo, valorAntes, valorNuevo) => {
    // SEC-01: el proxy BFF inyecta la x-api-key server-side
    fetch("/api/proxy/budget-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conceptoId: concepto.id,
        concepto: concepto.nombre || `#${concepto.id}`,
        campo, valorAntes: String(valorAntes ?? ""), valorNuevo: String(valorNuevo ?? ""),
        tipo: concepto.tipo ?? null,
      }),
    }).catch(() => { });
  };

  const updateConcepto = (id, field, value) => {
    setConceptos(prev => prev.map(c => {
      if (c.id !== id) return c;
      const camposLog = ["nombre", "activo", "costeTotal", "modoUniforme",
        "estadoPago", "estadoPedido", "proveedor", "contacto",
        "fechaPago", "fechaEntrega", "costeUnitarioReal"];
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
        return { ...c, costePorDistancia: Object.fromEntries(["TG7", "TG13", "TG25"].map(d => [d, value])) };
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
      activo: true, modoUniforme: tipo === "variable" ? true : undefined,
      categoria: "", orden: conceptos.length
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
    const today = new Date().toISOString().split("T")[0];
    // MEJ-01: nuevos tramos incluyen fechaInicio (hoy por defecto → abierto desde ya).
    // El campo es opcional: tramos guardados sin fechaInicio siguen funcionando
    // (getTramoStatus los trata como si fechaInicio ≤ hoy, es decir, ya abiertos).
    setTramos(prev => [...prev, { id, nombre: `Nuevo Tramo ${id}`, fechaInicio: today, fechaFin: today, precios: { TG7: 30, TG13: 45, TG25: 65 } }]);
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
  // MEJ-03: inscritos y precio medio solo para los que pagan (excluye tramos con precio 0)
  const inscritosConPago  = useMemo(() => calculateInscritosConPago(tramos, _inscritos),               [tramos, _inscritos]);
  const precioMedioPago   = useMemo(() => calculatePrecioMedioPago(inscritosConPago, ingresosPorDistancia), [inscritosConPago, ingresosPorDistancia]);
  // ECO-09: costesFijos incluye el gasto total de camisetas como coste fijo adicional,
  // prorrateado dinámicamente por inscritos igual que cualquier concepto fijo (no tiene
  // activoDistancias propio porque no depende de la distancia, pero su prorrata sí se
  // reparte por inscritos para que TG7+TG13+TG25 siga sumando exactamente el total).
  const costesFijos = useMemo(() => calculateCostesFijos(_conceptos, totalInscritos, totalGastosCamisetas), [_conceptos, totalInscritos, totalGastosCamisetas]);
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

  // ECO-09: totalIngresosConMerch suma el INGRESO BRUTO de camisetas (no el beneficio neto) —
  // el gasto ya no se resta aquí porque ahora vive dentro de costesFijos.total. Sumarlo aquí
  // neto Y en costesFijos sería doble cómputo del gasto; sumarlo bruto aquí y el gasto en
  // costesFijos es la cuenta correcta una sola vez. merchLocalBeneficio (buffs/gorras) es un
  // dominio aparte y se mantiene como beneficio neto, sin cambios.
  const totalIngresosConMerch = totalIngresosExtra + totalIngresosCamisetas + merchLocalBeneficio;

  const resultado = useMemo(() =>
    calculateResultado(totalInscritos, ingresosPorDistancia, costesFijos, costesVariables, totalIngresosConMerch),
    [totalInscritos, ingresosPorDistancia, costesFijos, costesVariables, totalIngresosConMerch]);

  const puntoEquilibrio = useMemo(() =>
    calculatePuntoEquilibrio(totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch, maximos),
    [totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch, maximos]);

  const peGlobal = useMemo(() =>
    // MEJ-05: se pasa margenConfig para calcular también el PE con colchón de seguridad.
    calculatePEGlobal(totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch, maximos, margenConfig),
    [totalInscritos, precioMedioDistancia, costesVarPorCorredor, costesFijos, totalIngresosConMerch, maximos, margenConfig]);

  const realTotalInscritos = useMemo(() => calculateTotalInscritos(tramos, inscritos), [tramos, inscritos]);
  const realIngresosPorDistancia = useMemo(() => calculateIngresosPorDistancia(tramos, inscritos), [tramos, inscritos]);
  // ECO-09: realCostesFijos también incluye el gasto de camisetas — camisetasPresupuesto
  // no tiene una variante "real" vs "escenario" separada (no usa datos de escenarios),
  // así que el mismo totalGastosCamisetas aplica aquí.
  const realCostesFijos = useMemo(() => calculateCostesFijos(conceptos, realTotalInscritos, totalGastosCamisetas), [conceptos, realTotalInscritos, totalGastosCamisetas]);
  const realCostesVariables = useMemo(() => calculateCostesVariables(conceptos, realTotalInscritos), [conceptos, realTotalInscritos]);

  // BUG-P3 fix: calcular ingresos extra "reales" independientemente del escenario activo
  // Así realResultado no se contamina con los valores del escenario hipotético
  // ECO-08: 'camisetas'/'balanceCamisetasTecnicas' eliminados de ID_TO_SYNCKEY — ese dominio
  // económico ya no pasa por aquí, vive en camisetasPresupuesto.
  // ECO-09: el gasto de camisetas SÍ entra en realCostesFijos (arriba), así que el ingreso
  // bruto debe sumarse aquí también para no descompensar realResultado — camisetasPresupuesto
  // no tiene variante "real" separada, se usa el mismo totalIngresosCamisetas/merchLocalBeneficio.
  const realIngresosExtraConValores = useMemo(() =>
    ingresosExtra.map(ie => {
      const key = ie.syncKey || ID_TO_SYNCKEY[ie.id] || null;
      if (!key) return { ...ie };
      const activo = syncConfig[key] !== undefined ? syncConfig[key] : ie.activo;
      const valor = key === "patrocinios" ? totalPatConfirmado
        : key === "patrociniosCobrado" ? totalPatCobrado
        : key === "subvencionPublica" ? totalSubvencionPublica
        : ie.valor;
      return { ...ie, syncKey: key, valor, activo, synced: true };
    }),
    [ingresosExtra, syncConfig, totalPatConfirmado, totalPatCobrado, totalSubvencionPublica]
  );

  const realTotalIngresosExtra = useMemo(() =>
    realIngresosExtraConValores.filter(i => i.activo).reduce((s, i) => s + i.valor, 0) + totalIngresosCamisetas + merchLocalBeneficio,
    [realIngresosExtraConValores, totalIngresosCamisetas, merchLocalBeneficio]
  );

  const realResultado = useMemo(() =>
    calculateResultado(realTotalInscritos, realIngresosPorDistancia, realCostesFijos, realCostesVariables, realTotalIngresosExtra),
    [realTotalInscritos, realIngresosPorDistancia, realCostesFijos, realCostesVariables, realTotalIngresosExtra]);

  // ECO-08: el bloque ECO-07 de detección de doble cómputo se elimina — ya no puede
  // existir estructuralmente. El gasto de "Camisetas voluntarios" pertenece ahora a una
  // única categoría (camisetasPresupuesto.voluntarios), no a un concepto fijo manual
  // que pudiera solaparse con una línea sincronizada distinta.

  return {
    tab, setTab, tramos, setTramos,
    totalPatConfirmado, totalPatCobrado, totalMerchBeneficio,
    camisetasPresupuesto, camSyncConfig, setCamSyncConfig,
    totalIngresosCamisetas, totalGastosCamisetas,
    syncConfig, setSyncConfig,
    totalSubvencionPublica,
    margenConfig, setMargenConfig,
    conceptos, setConceptos,
    inscritos, setInscritos,
    ingresosExtra: ingresosExtraConValores, // exponer la versión con valores en tiempo real
    setIngresosExtra,
    merchandising, setMerchandising,
    maximos, setMaximos,
    saveStatus, saveData, resetAllData, backupBeforeReset,
    updateConcepto, updateCostePorDistancia, updateActivoDistancia,
    addConcepto, removeConcepto, reorderConceptos,
    updateTramoPrecio, addTramo, updateInscritos,
    totalInscritos, ingresosPorDistancia, precioMedioDistancia,
    inscritosConPago, precioMedioPago,
    costesFijos, costesVariables, costesVarPorCorredor, costesFijoPorCorredor,
    merchTotales, totalIngresosExtra, totalIngresosConMerch,
    resultado, puntoEquilibrio, peGlobal,
    ingresosDesglosados,
    realTotalInscritos, realResultado,
    getValorSincronizado,
  };
};
