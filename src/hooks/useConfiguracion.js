import { useState, useEffect, useRef } from "react";
import { useData } from "@/hooks/useData";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { SK_EVENT_CONFIG as LS_KEY_CONFIG } from "@/constants/storageKeys";
import {
  SK_UI_CODIGOS_PROMO, SK_UI_CODIGOS_INIT,
  SK_UI_LAST_BACKUP, SK_UI_AUTO_BACKUP, SK_UI_AUTO_BACKUP_TS,
  SK_PAT_LOG_PREFIX, SK_EVENT_CONFIG,
  SK_PPTO_TRAMOS, SK_PPTO_CONCEPTOS, SK_PPTO_INSCRITOS,
  SK_PPTO_INGRESOS_EXTRA, SK_PPTO_MERCHANDISING, SK_PPTO_MAXIMOS,
  SK_VOL_VOLUNTARIOS, SK_VOL_PUESTOS,
  SK_VOL_IMG_FRONT, SK_VOL_IMG_BACK, SK_VOL_IMG_GUIA_TALLAS,
  SK_VOL_OPCION_PUESTO, SK_VOL_OPCION_VEHICULO,
  SK_VOL_OPCION_EMAIL, SK_VOL_OPCION_EMERGENCIA,
  SK_PAT_PATS, SK_PAT_OBJ,
  SK_LOG_MAT, SK_LOG_ASIG, SK_LOG_VEH, SK_LOG_RUT, SK_LOG_TL,
  SK_LOG_CONT, SK_LOG_INC, SK_LOG_CK, SK_LOG_TIPOS_CONT, SK_LOG_PEDIDOS_PROV,
  SK_LOC_LOCALIZACIONES,
  SK_PROY_TAREAS, SK_PROY_HITOS, SK_PROY_EQUIPO,
  SK_DOC_DOCS, SK_DOC_GESTIONES, SK_DOC_SUBVENCIONES,
  SK_CAM_ROOT, SK_CAM_PEDIDOS, SK_CAM_COSTE, SK_CAM_VENTA_PUBLICO,
  SK_CAM_CORREDORES, SK_CAM_NINO, SK_CAM_PRECIO_PLATAFORMA,
  SK_CAM_FECHA_PEDIDO, SK_CAM_ESTADO_PEDIDO, SK_CAM_INCLUIR_PENDIENTES,
  SK_CAM_MARGEN_SEGURIDAD, SK_CAM_FUENTES,
  SK_PPTO_SYNC_CONFIG, SK_PPTO_MARGEN_CONFIG, SK_PPTO_SCENARIO_ACTIVE, SK_SCENARIOS,
  SK_LOG_RECORRIDOS,
} from "@/constants/storageKeys";
import dataService from "@/lib/dataService";

// ── Todas las claves de datos de la app ──────────────────────────────────────
// ⚠️ Usar siempre constantes SK_. Nunca strings literales "teg_..." aquí.
export const ALL_DATA_KEYS = [
  SK_EVENT_CONFIG,
  SK_PPTO_TRAMOS, SK_PPTO_CONCEPTOS, SK_PPTO_INSCRITOS,
  SK_PPTO_INGRESOS_EXTRA, SK_PPTO_MERCHANDISING, SK_PPTO_MAXIMOS,
  SK_VOL_VOLUNTARIOS, SK_VOL_PUESTOS,
  SK_VOL_IMG_FRONT, SK_VOL_IMG_BACK, SK_VOL_IMG_GUIA_TALLAS,
  SK_VOL_OPCION_PUESTO, SK_VOL_OPCION_VEHICULO,
  SK_PAT_PATS, SK_PAT_OBJ,
  SK_LOG_MAT, SK_LOG_ASIG, SK_LOG_VEH, SK_LOG_RUT, SK_LOG_TL,
  SK_LOG_CONT, SK_LOG_INC, SK_LOG_CK, SK_LOG_TIPOS_CONT, SK_LOG_PEDIDOS_PROV,
  SK_LOC_LOCALIZACIONES,
  SK_PROY_TAREAS, SK_PROY_HITOS, SK_PROY_EQUIPO,
  SK_DOC_DOCS, SK_DOC_GESTIONES, SK_DOC_SUBVENCIONES,
  SK_CAM_ROOT, SK_CAM_PEDIDOS, SK_CAM_COSTE, SK_CAM_VENTA_PUBLICO,
  SK_CAM_CORREDORES, SK_CAM_NINO, SK_CAM_PRECIO_PLATAFORMA,
  SK_CAM_FECHA_PEDIDO, SK_CAM_ESTADO_PEDIDO, SK_CAM_INCLUIR_PENDIENTES,
  SK_CAM_MARGEN_SEGURIDAD, SK_CAM_FUENTES,
  SK_PPTO_SYNC_CONFIG, SK_PPTO_MARGEN_CONFIG, SK_PPTO_SCENARIO_ACTIVE, SK_SCENARIOS,
  SK_VOL_OPCION_EMAIL, SK_VOL_OPCION_EMERGENCIA,
  SK_UI_CODIGOS_PROMO,
  SK_LOG_RECORRIDOS,
];

const MODULO_LABELS = {
  teg_event_config: "Configuración del evento",
  teg_presupuesto: "Presupuesto",
  teg_voluntarios: "Voluntarios",
  teg_patrocinadores: "Patrocinadores",
  teg_logistica: "Logística",
  teg_localizaciones: "Localizaciones",
  teg_proyecto: "Proyecto",
  teg_documentos: "Documentos",
  teg_camisetas: "Camisetas",
};

const claveAModulo = (clave) => {
  const match = Object.keys(MODULO_LABELS).find(k => clave.startsWith(k));
  return match ? MODULO_LABELS[match] : clave;
};

export function useConfiguracion() {
  const [savedConfig, setSavedConfig] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(savedConfig || {}) };
  const [draft, setDraft] = useState(null);

  // ── Códigos promocionales ────────────────────────────────────────────────
  const [rawCodigos, setCodigos, codigosLoading] = useData(SK_UI_CODIGOS_PROMO, []);
  const [rawCodigosInit, setCodigosInit] = useData(SK_UI_CODIGOS_INIT, null);
  const codigos = Array.isArray(rawCodigos) ? rawCodigos : [];

  // ── Recorridos GPX ───────────────────────────────────────────────────────
  const [rawRecorridos, setRecorridos] = useData(SK_LOG_RECORRIDOS, []);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [codigosTab, setCodigosTab] = useState("todos");
  const [importText, setImportText] = useState("");
  const [importDist, setImportDist] = useState("TG7");
  const [importMsg2, setImportMsg2] = useState(null);
  const [busquedaCod, setBusquedaCod] = useState("");
  const [saved, setSaved] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrGenerando, setQrGenerando] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [resetInput, setResetInput] = useState("");

  // ── Imágenes de camisetas ────────────────────────────────────────────────
  const [imgFront, setImgFront] = useData(SK_VOL_IMG_FRONT, null);
  const [imgBack,  setImgBack]  = useData(SK_VOL_IMG_BACK, null);
  const [imgGuia,  setImgGuia]  = useData(SK_VOL_IMG_GUIA_TALLAS, null);
  const [imgPreviews, setImgPreviews] = useState({ front: null, back: null, guia: null });
  const [imgError,    setImgError]    = useState({ front: null, back: null, guia: null });
  const [imgSaving,   setImgSaving]   = useState({ front: false, back: false, guia: false });

  // ── Opciones formulario público ──────────────────────────────────────────
  const [opcionPuesto,     setOpcionPuesto]     = useData(SK_VOL_OPCION_PUESTO,     true);
  const [opcionVehiculo,   setOpcionVehiculo]   = useData(SK_VOL_OPCION_VEHICULO,   true);
  const [opcionEmail,      setOpcionEmail]      = useData(SK_VOL_OPCION_EMAIL,      false);
  const [opcionEmergencia, setOpcionEmergencia] = useData(SK_VOL_OPCION_EMERGENCIA, false);

  const MAX_IMG_BYTES = 500 * 1024;
  const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

  const form = draft ?? config;
  const upd  = (k, v) => setDraft(p => ({ ...(p ?? config), [k]: v }));
  const dirty = draft !== null;

  // ── CFG-02: Backup automático cada 24h ───────────────────────────────────
  useEffect(() => {
    const INTERVALO_MS = 24 * 60 * 60 * 1000;
    const tsAnterior = localStorage.getItem(SK_UI_AUTO_BACKUP_TS);
    const hasPasado24h = !tsAnterior || (Date.now() - new Date(tsAnterior).getTime()) >= INTERVALO_MS;
    if (!hasPasado24h) return;

    const autoBackup = {
      version: "1.0", tipo: "automatico",
      fecha: new Date().toISOString(),
      evento: form.nombre + " " + form.edicion,
      datos: {}
    };
    const keysAuto = [
      SK_EVENT_CONFIG, SK_PPTO_TRAMOS, SK_PPTO_CONCEPTOS, SK_PPTO_INSCRITOS,
      SK_PPTO_INGRESOS_EXTRA, SK_PPTO_MERCHANDISING, SK_PPTO_MAXIMOS,
      SK_VOL_VOLUNTARIOS, SK_VOL_PUESTOS,
      SK_PAT_PATS, SK_PAT_OBJ,
      SK_LOG_MAT, SK_LOG_ASIG, SK_LOG_VEH, SK_LOG_RUT, SK_LOG_TL,
      SK_LOG_CONT, SK_LOG_INC, SK_LOG_CK,
      SK_LOC_LOCALIZACIONES,
      SK_PROY_TAREAS, SK_PROY_HITOS, SK_PROY_EQUIPO,
      SK_DOC_DOCS, SK_DOC_GESTIONES,
      SK_CAM_PEDIDOS, SK_CAM_COSTE,
    ];
    for (const key of keysAuto) {
      try { const raw = localStorage.getItem(key); if (raw) autoBackup.datos[key] = JSON.parse(raw); } catch { /* omite */ }
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SK_PAT_LOG_PREFIX)) {
        try { const raw = localStorage.getItem(k); if (raw) autoBackup.datos[k] = JSON.parse(raw); } catch { /* omite */ }
      }
    }
    try {
      localStorage.setItem(SK_UI_AUTO_BACKUP, JSON.stringify(autoBackup));
      localStorage.setItem(SK_UI_AUTO_BACKUP_TS, autoBackup.fecha);
      localStorage.setItem(SK_UI_LAST_BACKUP, autoBackup.fecha);
      dataService.set(SK_UI_AUTO_BACKUP, autoBackup).catch(err =>
        console.warn("[CFG-02] Auto-backup no guardado en Neon:", err)
      );
    } catch { console.warn("[CFG-02] Backup automático no guardado (sin espacio)"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── FIX BUG-PROMO-02: inicializar códigos ────────────────────────────────
  const codigosRef = useRef(codigos);
  useEffect(() => { codigosRef.current = codigos; });
  useEffect(() => {
    if (codigosLoading) return;
    const yaInicializado = rawCodigosInit !== null && rawCodigosInit !== undefined;
    if (codigosRef.current.length === 0 && !yaInicializado) {
      const CODIGOS_INICIALES = [
        { id: "7G7-1",    codigo: "7G7",      distancia: "TG7",  estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "KDZ145OX", codigo: "KDZ145OX", distancia: "TG7",  estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "LHNHNP8O", codigo: "LHNHNP8O", distancia: "TG7",  estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "Y24SA1TO", codigo: "Y24SA1TO", distancia: "TG7",  estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "H4D95XXK", codigo: "H4D95XXK", distancia: "TG7",  estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "INWPP2FZ", codigo: "INWPP2FZ", distancia: "TG7",  estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "UBUQ4P9H", codigo: "UBUQ4P9H", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "E4AXY9BB", codigo: "E4AXY9BB", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "CFW8V4YX", codigo: "CFW8V4YX", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "OSEQZJW8", codigo: "OSEQZJW8", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "AAWKNOY8", codigo: "AAWKNOY8", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "L3BBI448", codigo: "L3BBI448", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "E3Z05H0D", codigo: "E3Z05H0D", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "40ACCVZF", codigo: "40ACCVZF", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "K5RBRVHK", codigo: "K5RBRVHK", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "UUCTJWSV", codigo: "UUCTJWSV", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
      ];
      setCodigos(CODIGOS_INICIALES);
      setCodigosInit("1");
    }
  }, [codigosLoading, rawCodigosInit, setCodigos, setCodigosInit]);

  // ── Handlers de configuración ────────────────────────────────────────────
  const handleSave = async () => {
    const merged = { ...EVENT_CONFIG_DEFAULT, ...form };
    setSavedConfig(merged);
    await dataService.set(LS_KEY_CONFIG, merged);
    setDraft(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ── Imágenes de camisetas ────────────────────────────────────────────────
  const handleImgFile = (slot) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_MIME.includes(file.type)) {
      setImgError(prev => ({ ...prev, [slot]: "Solo se permiten imágenes JPEG, PNG o WEBP" }));
      e.target.value = ""; return;
    }
    if (file.size > MAX_IMG_BYTES) {
      setImgError(prev => ({ ...prev, [slot]: `La imagen supera el límite de 500 KB (${(file.size / 1024).toFixed(0)} KB)` }));
      e.target.value = ""; return;
    }
    setImgError(prev => ({ ...prev, [slot]: null }));
    const previewUrl = URL.createObjectURL(file);
    setImgPreviews(prev => ({ ...prev, [slot]: previewUrl }));
    const reader = new FileReader();
    reader.onload = async () => {
      setImgSaving(prev => ({ ...prev, [slot]: true }));
      try {
        const dataUrl  = reader.result;
        const ext      = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const filename = `camiseta-${slot}-${Date.now()}.${ext}`;
        const resp     = await fetch("/api/proxy/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64: dataUrl, filename, mimeType: file.type }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const { url } = await resp.json();
        if (slot === "front") setImgFront(url);
        if (slot === "back")  setImgBack(url);
        if (slot === "guia")  setImgGuia(url);
      } catch (err) {
        setImgError(prev => ({ ...prev, [slot]: "Error al subir la imagen. Inténtalo de nuevo." }));
      } finally {
        setImgSaving(prev => ({ ...prev, [slot]: false }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleImgRemove = (slot) => {
    const currentUrl = slot === "front" ? imgFront : slot === "back" ? imgBack : imgGuia;
    if (currentUrl && currentUrl.startsWith("http")) {
      fetch("/api/proxy/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentUrl }),
      }).catch(() => {});
    }
    setImgPreviews(prev => ({ ...prev, [slot]: null }));
    if (slot === "front") setImgFront(null);
    if (slot === "back")  setImgBack(null);
    if (slot === "guia")  setImgGuia(null);
  };

  // ── Export / Import ──────────────────────────────────────────────────────
  const handleExport = async () => {
    setExportando(true);
    try {
      const backup = { version: "1.0", fecha: new Date().toISOString(), evento: form.nombre + " " + form.edicion, datos: {} };
      for (const key of ALL_DATA_KEYS) {
        try { const raw = localStorage.getItem(key); if (raw) backup.datos[key] = JSON.parse(raw); } catch { /* omite */ }
      }
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(SK_PAT_LOG_PREFIX)) {
          try { const raw = localStorage.getItem(k); if (raw) backup.datos[k] = JSON.parse(raw); } catch { /* omite */ }
        }
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `backup_${(form.nombre || "evento").replace(/\s+/g, "-").toLowerCase()}_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      localStorage.setItem(SK_UI_LAST_BACKUP, new Date().toISOString());
    } finally { setExportando(false); }
  };

  const handleExportVoluntariosCSV = () => {
    try {
      const raw  = localStorage.getItem(SK_VOL_VOLUNTARIOS);
      const vols = raw ? JSON.parse(raw) : [];
      if (!vols.length) { setImportMsg({ tipo: "error", texto: "No hay voluntarios para exportar" }); return; }
      const cols = ["id", "nombre", "telefono", "email", "talla", "estado", "rol", "puestoId", "coche", "notas", "fechaRegistro"];
      const csv  = [cols.join(";"), ...vols.map(v => cols.map(c => `"${(v[c] ?? "")}"`).join(";"))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const a    = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `voluntarios_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    } catch { setImportMsg({ tipo: "error", texto: "Error exportando voluntarios" }); }
  };

  const handleExportPatrocinadores = () => {
    try {
      const raw  = localStorage.getItem(SK_PAT_PATS);
      const pats = raw ? JSON.parse(raw) : [];
      if (!pats.length) { setImportMsg({ tipo: "error", texto: "No hay patrocinadores para exportar" }); return; }
      const cols = ["id", "nombre", "nivel", "importe", "estado", "contacto", "email", "telefono", "notas"];
      const csv  = [cols.join(";"), ...pats.map(p => cols.map(c => `"${(p[c] ?? "")}"`).join(";"))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const a    = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `patrocinadores_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    } catch { setImportMsg({ tipo: "error", texto: "Error exportando patrocinadores" }); }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);
        if (!backup || typeof backup !== "object" || !backup.datos || typeof backup.datos !== "object") {
          setImportMsg({ tipo: "error", texto: "Formato de backup inválido. El archivo no tiene la estructura esperada." });
          return;
        }
        const modulosMap = {};
        for (const [key, value] of Object.entries(backup.datos)) {
          if (!ALL_DATA_KEYS.includes(key)) continue;
          const modulo = claveAModulo(key);
          if (!modulosMap[modulo]) modulosMap[modulo] = { claves: [], items: 0 };
          modulosMap[modulo].claves.push(key);
          modulosMap[modulo].items += Array.isArray(value) ? value.length : 1;
        }
        const resumen = Object.entries(modulosMap).map(([modulo, { claves, items }]) => ({ modulo, claves: claves.length, items }));
        const meta = {
          version: backup.version || "desconocida",
          fecha: backup.fecha ? new Date(backup.fecha).toLocaleDateString("es-ES") : "desconocida",
          evento: backup.evento || "—",
        };
        setImportPreview({ datos: backup.datos, resumen, meta, totalClaves: resumen.reduce((s, r) => s + r.claves, 0) });
        setImportMsg(null);
      } catch (err) {
        setImportMsg({ tipo: "error", texto: `Error al leer el archivo: ${err.message}` });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const aplicarImport = () => {
    if (!importPreview) return;
    let count = 0;
    for (const [key, value] of Object.entries(importPreview.datos)) {
      if (ALL_DATA_KEYS.includes(key)) { localStorage.setItem(key, JSON.stringify(value)); count++; }
    }
    setImportPreview(null);
    setImportMsg({ tipo: "ok", texto: `✓ Backup restaurado — ${count} colecciones importadas. Recarga la app para ver los cambios.` });
    dataService.notify("configuracion");
  };

  const generarQR = async () => {
    setQrGenerando(true);
    try {
      const size    = 256;
      const encoded = encodeURIComponent(urlFormulario);
      const url     = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encoded}&chld=M|2`;
      const resp    = await fetch(url);
      const blob    = await resp.blob();
      const reader  = new FileReader();
      reader.onloadend = () => { setQrDataUrl(reader.result); };
      reader.readAsDataURL(blob);
    } catch {
      const size    = 256;
      const encoded = encodeURIComponent(urlFormulario);
      setQrDataUrl(`https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encoded}&chld=M|2`);
    } finally { setQrGenerando(false); }
  };

  const handleReset = () => {
    for (const key of ALL_DATA_KEYS) {
      localStorage.removeItem(key);
      dataService.remove(key).catch(() => {});
    }
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SK_PAT_LOG_PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => { localStorage.removeItem(k); dataService.remove(k).catch(() => {}); });
    setResetModal(false);
    setResetInput("");
    window.location.reload();
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const fechaEvento   = form.fecha ? new Date(form.fecha) : null;
  const diasRestantes = fechaEvento ? Math.ceil((fechaEvento - new Date()) / 86400000) : null;
  const esConfigInicial = !savedConfig?.nombre || savedConfig.nombre === EVENT_CONFIG_DEFAULT.nombre;

  const urlFormulario = typeof window !== "undefined"
    ? `${window.location.origin}/voluntarios/registro`
    : "https://appcarrera.vercel.app/voluntarios/registro";

  return {
    form, upd, dirty,
    saved, savedConfig,
    draft, setDraft,
    codigos, rawRecorridos, setRecorridos,
    codigosTab, setCodigosTab,
    importText, setImportText,
    importDist, setImportDist,
    importMsg2, setImportMsg2,
    busquedaCod, setBusquedaCod,
    exportando,
    importMsg, setImportMsg,
    importPreview, setImportPreview,
    qrDataUrl, setQrDataUrl, qrGenerando,
    resetModal, setResetModal,
    resetInput, setResetInput,
    imgFront, imgBack, imgGuia,
    imgPreviews, imgError, imgSaving,
    opcionPuesto, setOpcionPuesto,
    opcionVehiculo, setOpcionVehiculo,
    opcionEmail, setOpcionEmail,
    opcionEmergencia, setOpcionEmergencia,
    fechaEvento, diasRestantes, esConfigInicial,
    urlFormulario,
    handleSave, handleExport,
    handleExportVoluntariosCSV, handleExportPatrocinadores,
    handleImport, aplicarImport,
    handleImgFile, handleImgRemove,
    generarQR, handleReset,
  };
}
