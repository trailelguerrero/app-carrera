import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
// QRCode se importa dinámicamente para evitar crash si no está disponible
import { blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import {
  SK_UI_CODIGOS_PROMO,
  SK_UI_CODIGOS_INIT,
  SK_UI_LAST_BACKUP,
  SK_UI_ONBOARDING_DONE,
  SK_PAT_LOG_PREFIX,
  SK_EVENT_CONFIG,
  // Presupuesto
  SK_PPTO_TRAMOS,
  SK_PPTO_CONCEPTOS,
  SK_PPTO_INSCRITOS,
  SK_PPTO_INGRESOS_EXTRA,
  SK_PPTO_MERCHANDISING,
  SK_PPTO_MAXIMOS,
  // Voluntarios
  SK_VOL_VOLUNTARIOS,
  SK_VOL_PUESTOS,
  SK_VOL_IMG_FRONT,
  SK_VOL_IMG_BACK,
  SK_VOL_IMG_GUIA_TALLAS,
  SK_VOL_OPCION_PUESTO,
  SK_VOL_OPCION_VEHICULO,
  SK_VOL_OPCION_EMAIL,
  SK_VOL_OPCION_EMERGENCIA,
  // Patrocinadores
  SK_PAT_PATS,
  SK_PAT_OBJ,
  // Logística
  SK_LOG_MAT,
  SK_LOG_ASIG,
  SK_LOG_VEH,
  SK_LOG_RUT,
  SK_LOG_TL,
  SK_LOG_CONT,
  SK_LOG_INC,
  SK_LOG_CK,
  SK_LOG_TIPOS_CONT,
  SK_LOG_PEDIDOS_PROV,
  // Localización
  SK_LOC_LOCALIZACIONES,
  // Proyecto
  SK_PROY_TAREAS,
  SK_PROY_HITOS,
  SK_PROY_EQUIPO,
  // Documentos
  SK_DOC_DOCS,
  SK_DOC_GESTIONES,
  // Camisetas
  SK_CAM_ROOT,
  SK_CAM_PEDIDOS,
  SK_CAM_COSTE,
} from "@/constants/storageKeys";
import dataService from "@/lib/dataService";

export default function Configuracion() {
  // useData: mismo patrón que todos los bloques — carga síncrona desde localStorage
  const [savedConfig, setSavedConfig] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(savedConfig || {}) };

  const [draft, setDraft] = useState(null);

  // ── Códigos promocionales ──────────────────────────────────────────────────
  const [rawCodigos, setCodigos] = useData(SK_UI_CODIGOS_PROMO, []);
  const codigos = Array.isArray(rawCodigos) ? rawCodigos : [];
  const [codigosTab, setCodigosTab] = useState("todos");
  const [importText, setImportText] = useState("");
  const [importDist, setImportDist] = useState("TG7");
  const [importMsg2, setImportMsg2] = useState(null);
  const [busquedaCod, setBusquedaCod] = useState("");
  const [saved, setSaved] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [importMsg, setImportMsg] = useState(null); // {tipo:'ok'|'error', texto}
  const [importPreview, setImportPreview] = useState(null); // {datos, resumen} — preview antes de aplicar
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrGenerando, setQrGenerando] = useState(false);

  // ── Imágenes de camisetas (portal de voluntarios) ─────────────────────────
  const [imgFront,     setImgFront]     = useData(SK_VOL_IMG_FRONT, null);
  const [imgBack,      setImgBack]      = useData(SK_VOL_IMG_BACK, null);
  const [imgGuia,      setImgGuia]      = useData(SK_VOL_IMG_GUIA_TALLAS, null);
  const [imgPreviews,  setImgPreviews]  = useState({ front: null, back: null, guia: null });
  const [imgError,     setImgError]     = useState({ front: null, back: null, guia: null });
  const [imgSaving,    setImgSaving]    = useState({ front: false, back: false, guia: false });
  const [resetModal,   setResetModal]   = useState(false); // modal zona de peligro
  const [resetInput,   setResetInput]   = useState('');
  const imgInputRef = { front: null, back: null, guia: null };

  // ── Opciones del formulario público de voluntarios ────────────────────────
  const [opcionPuesto,     setOpcionPuesto]     = useData(SK_VOL_OPCION_PUESTO,     true);
  const [opcionVehiculo,   setOpcionVehiculo]   = useData(SK_VOL_OPCION_VEHICULO,   true);
  const [opcionEmail,      setOpcionEmail]      = useData(SK_VOL_OPCION_EMAIL,      false);
  const [opcionEmergencia, setOpcionEmergencia] = useData(SK_VOL_OPCION_EMERGENCIA, false);

  const MAX_IMG_BYTES = 500 * 1024; // 500 KB
  const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

  const handleImgFile = (slot) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validar MIME
    if (!ACCEPTED_MIME.includes(file.type)) {
      setImgError(prev => ({ ...prev, [slot]: 'Solo se permiten imágenes JPEG, PNG o WEBP' }));
      e.target.value = '';
      return;
    }
    // Validar tamaño
    if (file.size > MAX_IMG_BYTES) {
      setImgError(prev => ({ ...prev, [slot]: `La imagen supera el límite de 500 KB (${(file.size/1024).toFixed(0)} KB)` }));
      e.target.value = '';
      return;
    }
    setImgError(prev => ({ ...prev, [slot]: null }));
    // Preview local con URL de objeto (no consume memoria innecesariamente)
    const previewUrl = URL.createObjectURL(file);
    setImgPreviews(prev => ({ ...prev, [slot]: previewUrl }));
    // Leer como base64 para persistir
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setImgSaving(prev => ({ ...prev, [slot]: true }));
      if (slot === 'front') setImgFront(dataUrl);
      if (slot === 'back')  setImgBack(dataUrl);
      if (slot === 'guia')  setImgGuia(dataUrl);
      setImgSaving(prev => ({ ...prev, [slot]: false }));
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // limpiar input para permitir re-selección del mismo archivo
  };

  const handleImgRemove = (slot) => {
    setImgPreviews(prev => ({ ...prev, [slot]: null }));
    if (slot === 'front') setImgFront(null);
    if (slot === 'back')  setImgBack(null);
    if (slot === 'guia')  setImgGuia(null);
  };

  const form = draft ?? config;
  const upd = (k, v) => setDraft(p => ({ ...(p ?? config), [k]: v }));
  const dirty = draft !== null;

  // Cargar los códigos iniciales si el array está vacío
  // Usamos useEffect para evitar side effects en render
  const codigosRef = useRef(codigos);
  useEffect(() => {
    const yaInicializado = localStorage.getItem(SK_UI_CODIGOS_INIT);
    if (codigosRef.current.length === 0 && !yaInicializado) {
      const CODIGOS_INICIALES = [
        // TG7
        { id: "7G7-1", codigo: "7G7", distancia: "TG7", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "KDZ145OX", codigo: "KDZ145OX", distancia: "TG7", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "LHNHNP8O", codigo: "LHNHNP8O", distancia: "TG7", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "Y24SA1TO", codigo: "Y24SA1TO", distancia: "TG7", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "H4D95XXK", codigo: "H4D95XXK", distancia: "TG7", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "INWPP2FZ", codigo: "INWPP2FZ", distancia: "TG7", estado: "disponible", usadoPor: null, fechaUso: null },
        // TG13
        { id: "UBUQ4P9H", codigo: "UBUQ4P9H", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "E4AXY9BB", codigo: "E4AXY9BB", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "CFW8V4YX", codigo: "CFW8V4YX", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "OSEQZJW8", codigo: "OSEQZJW8", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "AAWKNOY8", codigo: "AAWKNOY8", distancia: "TG13", estado: "disponible", usadoPor: null, fechaUso: null },
        // TG25
        { id: "L3BBI448", codigo: "L3BBI448", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "E3Z05H0D", codigo: "E3Z05H0D", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "40ACCVZF", codigo: "40ACCVZF", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "K5RBRVHK", codigo: "K5RBRVHK", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
        { id: "UUCTJWSV", codigo: "UUCTJWSV", distancia: "TG25", estado: "disponible", usadoPor: null, fechaUso: null },
      ];
      setCodigos(CODIGOS_INICIALES);
      localStorage.setItem(SK_UI_CODIGOS_INIT, "1");
    }
  }, [setCodigos]); // setCodigos es estable; codigosRef.current evita re-ejecución por cambios de estado

  const handleSave = async () => {
    const merged = { ...EVENT_CONFIG_DEFAULT, ...form };
    setSavedConfig(merged);
    await dataService.set(LS_KEY_CONFIG, merged);
    setDraft(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };


  // ── Todas las claves de datos de la app ──────────────────────────────────
  // ⚠️ Usar siempre constantes SK_. Nunca strings literales "teg_..." aquí.
  const ALL_DATA_KEYS = [
    SK_EVENT_CONFIG,
    // Presupuesto
    SK_PPTO_TRAMOS,
    SK_PPTO_CONCEPTOS,
    SK_PPTO_INSCRITOS,
    SK_PPTO_INGRESOS_EXTRA,
    SK_PPTO_MERCHANDISING,
    SK_PPTO_MAXIMOS,
    // Voluntarios
    SK_VOL_VOLUNTARIOS,
    SK_VOL_PUESTOS,
    SK_VOL_IMG_FRONT,
    SK_VOL_IMG_BACK,
    SK_VOL_IMG_GUIA_TALLAS,
    SK_VOL_OPCION_PUESTO,
    SK_VOL_OPCION_VEHICULO,
    // Patrocinadores
    SK_PAT_PATS,
    SK_PAT_OBJ,
    // Logística
    SK_LOG_MAT,
    SK_LOG_ASIG,
    SK_LOG_VEH,
    SK_LOG_RUT,
    SK_LOG_TL,
    SK_LOG_CONT,
    SK_LOG_INC,
    SK_LOG_CK,
    SK_LOG_TIPOS_CONT,
    SK_LOG_PEDIDOS_PROV,
    // Localización
    SK_LOC_LOCALIZACIONES,
    // Proyecto
    SK_PROY_TAREAS,
    SK_PROY_HITOS,
    SK_PROY_EQUIPO,
    // Documentos
    SK_DOC_DOCS,
    SK_DOC_GESTIONES,
    // Camisetas
    SK_CAM_ROOT,
    SK_CAM_PEDIDOS,
    SK_CAM_COSTE,
  ];

  // ── Exportar todos los datos como JSON ───────────────────────────────────
  const handleExport = async () => {
    setExportando(true);
    try {
      const backup = {
        version: "1.0",
        fecha: new Date().toISOString(),
        evento: form.nombre + " " + form.edicion,
        datos: {}
      };
      for (const key of ALL_DATA_KEYS) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) backup.datos[key] = JSON.parse(raw);
        } catch (e) { /* clave no parseable — se omite del backup */ }
      }
      // Logs dinámicos de patrocinadores (SK_PAT_LOG_PREFIX + <id>)
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(SK_PAT_LOG_PREFIX)) {
          try { const raw = localStorage.getItem(k); if (raw) backup.datos[k] = JSON.parse(raw); } catch (e) { /* clave no parseable — se omite */ }
        }
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fecha = new Date().toISOString().split("T")[0];
      a.download = `backup_${(form.nombre || "evento").replace(/\s+/g, "-").toLowerCase()}_${fecha}.json`;
      a.click();
      URL.revokeObjectURL(url);
      localStorage.setItem(SK_UI_LAST_BACKUP, new Date().toISOString());
    } finally {
      setExportando(false);
    }
  };

  // ── Exportar voluntarios como CSV ────────────────────────────────────────
  const handleExportVoluntariosCSV = () => {
    try {
      const raw = localStorage.getItem(SK_VOL_VOLUNTARIOS);
      const vols = raw ? JSON.parse(raw) : [];
      if (!vols.length) { setImportMsg({ tipo: "error", texto: "No hay voluntarios para exportar" }); return; }
      const cols = ["id", "nombre", "telefono", "email", "talla", "estado", "rol", "puestoId", "coche", "notas", "fechaRegistro"];
      const csv = [cols.join(";"),
      ...vols.map(v => cols.map(c => `"${(v[c] ?? "")}"`).join(";"))
      ].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `voluntarios_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    } catch { setImportMsg({ tipo: "error", texto: "Error exportando voluntarios" }); }
  };

  // ── Exportar patrocinadores como CSV ─────────────────────────────────────
  const handleExportPatrocinadores = () => {
    try {
      const raw = localStorage.getItem(SK_PAT_PATS);
      const pats = raw ? JSON.parse(raw) : [];
      if (!pats.length) { setImportMsg({ tipo: "error", texto: "No hay patrocinadores para exportar" }); return; }
      const cols = ["id", "nombre", "nivel", "importe", "estado", "contacto", "email", "telefono", "notas"];
      const csv = [cols.join(";"),
      ...pats.map(p => cols.map(c => `"${(p[c] ?? "")}"`).join(";"))
      ].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `patrocinadores_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    } catch { setImportMsg({ tipo: "error", texto: "Error exportando patrocinadores" }); }
  };

  // ── Importar backup JSON ──────────────────────────────────────────────────
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
        // Construir resumen por módulo
        const modulosMap = {};
        for (const [key, value] of Object.entries(backup.datos)) {
          if (!ALL_DATA_KEYS.includes(key)) continue;
          const modulo = claveAModulo(key);
          if (!modulosMap[modulo]) modulosMap[modulo] = { claves: [], items: 0 };
          modulosMap[modulo].claves.push(key);
          modulosMap[modulo].items += Array.isArray(value) ? value.length : 1;
        }
        const resumen = Object.entries(modulosMap).map(([modulo, { claves, items }]) => ({
          modulo, claves: claves.length, items,
        }));
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
      if (ALL_DATA_KEYS.includes(key)) {
        localStorage.setItem(key, JSON.stringify(value));
        count++;
      }
    }
    setImportPreview(null);
    setImportMsg({ tipo: "ok", texto: `✓ Backup restaurado — ${count} colecciones importadas. Recarga la app para ver los cambios.` });
    window.dispatchEvent(new CustomEvent("teg-sync", { detail: {} })); // INC-06: CustomEvent uniforme
  };

  const fechaEvento = form.fecha ? new Date(form.fecha) : null;

  const urlFormulario = typeof window !== "undefined"
    ? `${window.location.origin}/voluntarios/registro`
    : "https://appcarrera.vercel.app/voluntarios/registro";

  const generarQR = async () => {
    setQrGenerando(true);
    try {
      // Usar la API de QR de Google Charts — sin dependencia npm, funciona en cualquier entorno
      const size = 256;
      const encoded = encodeURIComponent(urlFormulario);
      const url = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encoded}&chld=M|2`;
      // Cargar la imagen y convertir a dataURL para poder descargarla
      const resp = await fetch(url);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onloadend = () => { setQrDataUrl(reader.result); };
      reader.readAsDataURL(blob);
    } catch {
      // Fallback: usar la URL directamente como src del img
      const size = 256;
      const encoded = encodeURIComponent(urlFormulario);
      setQrDataUrl(`https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encoded}&chld=M|2`);
    } finally {
      setQrGenerando(false);
    }
  };
  const diasRestantes = fechaEvento ? Math.ceil((fechaEvento - new Date()) / 86400000) : null;

  return (
    <>
      <div className="block-container">

        <div className="block-header">
          <div>
            <h1 className="block-title">⚙️ Configuración</h1>
            <div className="block-title-sub">
              {form.nombre} {form.edicion} · {form.lugar}
              {diasRestantes !== null && (
                <span style={{ marginLeft: ".75rem", color: diasRestantes <= 30 ? "var(--amber)" : "var(--text-dim)" }}>
                  · {diasRestantes > 0 ? `${diasRestantes} días` : "¡Hoy!"}
                </span>
              )}
            </div>
          </div>
          {dirty && (
            <div className="block-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>Descartar</button>
              <button className="btn btn-primary" onClick={handleSave}>Guardar cambios</button>
            </div>
          )}
        </div>

        <div className="card cfg-section">
          <div className="cfg-section-title">🏔️ Identidad del evento</div>
          <div className="cfg-grid">
            <div className="cfg-field cfg-field-full">
              <label className="cfg-label">Nombre del evento</label>
              <input className="cfg-input" value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Ej: Trail del Pirineo" />
            </div>
            <div className="cfg-field">
              <label className="cfg-label">Edición / Año</label>
              <input className="cfg-input" value={form.edicion} onChange={e => upd("edicion", e.target.value)} placeholder="2026" />
            </div>
            <div className="cfg-field">
              <label className="cfg-label">Fecha del evento</label>
              <input className="cfg-input" type="date" value={form.fecha} onChange={e => upd("fecha", e.target.value)} />
              {diasRestantes !== null && (
                <div className="cfg-hint">
                  {diasRestantes > 0 ? `${diasRestantes} días hasta la carrera`
                    : diasRestantes === 0 ? "¡La carrera es hoy!"
                      : `La carrera fue hace ${Math.abs(diasRestantes)} días`}
                </div>
              )}
            </div>
            <div className="cfg-field">
              <label className="cfg-label">Lugar</label>
              <input className="cfg-input" value={form.lugar} onChange={e => upd("lugar", e.target.value)} placeholder="Ej: Candeleda" />
            </div>
            <div className="cfg-field">
              <label className="cfg-label">Provincia / Región</label>
              <input className="cfg-input" value={form.provincia} onChange={e => upd("provincia", e.target.value)} placeholder="Ej: Ávila" />
            </div>
            <div className="cfg-field">
              <label className="cfg-label">Organizador</label>
              <input className="cfg-input" value={form.organizador} onChange={e => upd("organizador", e.target.value)} placeholder="Ej: Club Trail El Guerrero" />
            </div>
            <div className="cfg-field">
              <label className="cfg-label">Email de contacto</label>
              <input className="cfg-input" type="email" value={form.emailContacto || ""} onChange={e => upd("emailContacto", e.target.value)} placeholder="info@trailelguerrero.es" />
            </div>
            <div className="cfg-field">
              <label className="cfg-label">Teléfono de contacto</label>
              <input className="cfg-input" type="tel" value={form.telefonoContacto || ""} onChange={e => upd("telefonoContacto", e.target.value)} placeholder="+34 600 000 000" />
            </div>
            <div className="cfg-field" style={{ gridColumn: "1/-1" }}>
              <label className="cfg-label" style={{ color: "var(--cyan)", fontSize: ".72rem", fontWeight: 800 }}>
                👥 Contactos visibles para los voluntarios en su portal
              </label>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)",
                marginBottom: ".65rem", lineHeight: 1.7,
                background: "rgba(34,211,238,.05)", padding: ".5rem .75rem",
                borderRadius: 8, borderLeft: "2px solid var(--cyan)"
              }}>
                💡 Los voluntarios verán estos nombres y teléfonos en la sección "📞 Contacto organizadores" de su ficha personal.
                Añade el nombre y teléfono de cada coordinador.
              </div>
              {(form.organizadores || []).length === 0 && (
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--amber)",
                  padding: ".4rem .75rem", borderRadius: 6, background: "var(--amber-dim)",
                  border: "1px solid var(--amber-border)", marginBottom: ".5rem"
                }}>
                  ⚠ Sin contactos configurados — los voluntarios no verán a quién llamar
                </div>
              )}
              {(form.organizadores || []).map((org, i) => (
                <div key={i} style={{ display: "flex", gap: ".4rem", marginBottom: ".4rem", alignItems: "center", flexWrap: "wrap" }}>
                  <input className="cfg-input" style={{ flex: "2 1 120px", minWidth: 100 }}
                    placeholder="Nombre" value={org.nombre || ""}
                    onChange={e => { const arr = [...(form.organizadores || [])]; arr[i] = { ...arr[i], nombre: e.target.value }; upd("organizadores", arr); }} />
                  <input className="cfg-input" style={{ flex: "2 1 120px", minWidth: 100 }}
                    placeholder="Teléfono" type="tel" value={org.telefono || ""}
                    onChange={e => { const arr = [...(form.organizadores || [])]; arr[i] = { ...arr[i], telefono: e.target.value }; upd("organizadores", arr); }} />
                  <input className="cfg-input" style={{ flex: "3 1 150px", minWidth: 120 }}
                    placeholder="Email (opcional)" type="email" value={org.email || ""}
                    onChange={e => { const arr = [...(form.organizadores || [])]; arr[i] = { ...arr[i], email: e.target.value }; upd("organizadores", arr); }} />
                  <button className="btn btn-red btn-sm" style={{ flexShrink: 0, padding: ".25rem .5rem" }}
                    onClick={() => { const arr = [...(form.organizadores || [])]; arr.splice(i, 1); upd("organizadores", arr); }}>✕</button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ marginTop: ".3rem" }}
                onClick={() => upd("organizadores", [...(form.organizadores || []), { nombre: "", telefono: "", email: "" }])}>
                + Añadir organizador
              </button>
            </div>
            <div className="cfg-field">
              <label className="cfg-label">Web del evento</label>
              <input className="cfg-input" type="url" value={form.webEvento || ""} onChange={e => upd("webEvento", e.target.value)} placeholder="https://trailelguerrero.es" />
            </div>
          </div>
        </div>

        <div className="card cfg-section">
          <div className="cfg-section-title">⏱️ Umbrales de alerta de voluntarios</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
            Define cuándo se activan las alertas de cobertura de voluntarios en el Dashboard.
            Ajústalos según tu proceso de captación.
          </div>

          <div className="cfg-threshold-row">
            <div className="cfg-threshold-label">
              <div className="cfg-threshold-name" style={{ color: "var(--red)" }}>🔴 Alerta crítica</div>
              <div className="cfg-threshold-desc">
                Puestos sin cubrir generan alerta roja. Acción inmediata requerida.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexShrink: 0 }}>
              <input type="number" min={1} max={365} className="cfg-input cfg-input-num"
                value={form.volDiasCritico}
                onChange={e => upd("volDiasCritico", Math.max(1, parseInt(e.target.value) || 1))} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>días antes</span>
            </div>
          </div>

          <div className="cfg-threshold-row">
            <div className="cfg-threshold-label">
              <div className="cfg-threshold-name" style={{ color: "var(--amber)" }}>🟡 Aviso</div>
              <div className="cfg-threshold-desc">
                Puestos sin cubrir generan aviso amarillo. Conviene ir gestionando.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexShrink: 0 }}>
              <input type="number" min={1} max={365} className="cfg-input cfg-input-num"
                value={form.volDiasAviso}
                onChange={e => upd("volDiasAviso", Math.max((form.volDiasCritico || 1) + 1, parseInt(e.target.value) || 1))} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>días antes</span>
            </div>
          </div>

          {fechaEvento && (
            <div style={{ marginTop: "1rem", padding: ".75rem .85rem", background: "var(--surface2)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: ".5rem", textTransform: "uppercase", letterSpacing: ".06em" }}>
                Ventanas de alerta
              </div>
              {[
                { label: "Sin alertas", color: "var(--green)", desde: "Hoy", hasta: `${form.volDiasAviso}d antes` },
                { label: "Aviso amarillo", color: "var(--amber)", desde: `${form.volDiasAviso}d antes`, hasta: `${form.volDiasCritico}d antes` },
                { label: "Alerta roja", color: "var(--red)", desde: `${form.volDiasCritico}d antes`, hasta: "Día carrera" },
              ].map(w => (
                <div key={w.label} style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: ".3rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: w.color, fontWeight: 700, width: 110 }}>{w.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>{w.desde} → {w.hasta}</span>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* ── Backup y exportación ─────────────────────────────────────── */}
        <div className="card cfg-section">
          <div className="cfg-section-title">💾 Backup y exportación de datos</div>
          {(() => {
            const lastBackup = localStorage.getItem(SK_UI_LAST_BACKUP);
            if (!lastBackup) return (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)",
                padding: ".4rem .7rem", borderRadius: 6, marginBottom: ".75rem",
                background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.2)"
              }}>
                ⚠️ Sin backup reciente — se recomienda exportar una copia de seguridad
              </div>
            );
            const dias = Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000);
            const color = dias > 7 ? "var(--amber)" : "var(--green)";
            return (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color,
                marginBottom: ".75rem"
              }}>
                ✓ Último backup: {dias === 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`}
                {" · "}{new Date(lastBackup).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            );
          })()}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
            Exporta todos los datos de la app a un archivo JSON para hacer copias de seguridad
            o trasladar los datos a otro dispositivo. También puedes exportar listas concretas a CSV.
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", marginBottom: "1rem" }}>
            <button className="backup-btn export" onClick={handleExport} disabled={exportando}>
              {exportando ? "⏳ Exportando…" : "⬇️ Backup completo (JSON)"}
            </button>
            <button className="backup-btn csv" onClick={handleExportVoluntariosCSV}>
              📋 Voluntarios (CSV)
            </button>
            <button className="backup-btn csv" onClick={handleExportPatrocinadores}>
              🤝 Patrocinadores (CSV)
            </button>
            <label className="backup-btn import" style={{ cursor: "pointer" }}>
              ⬆️ Restaurar backup (JSON)
              <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
            </label>
          </div>

          {importMsg && (
            <div style={{
              padding: ".65rem .85rem", borderRadius: 8,
              background: importMsg.tipo === "ok" ? "var(--green-dim)" : "var(--red-dim)",
              border: `1px solid ${importMsg.tipo === "ok" ? "rgba(52,211,153,.3)" : "rgba(248,113,113,.3)"}`,
              color: importMsg.tipo === "ok" ? "var(--green)" : "var(--red)",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", lineHeight: 1.6,
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem"
            }}>
              <span>{importMsg.texto}</span>
              <button onClick={() => setImportMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "var(--fs-md)", padding: 0, flexShrink: 0 }}>✕</button>
            </div>
          )}

          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", lineHeight: 1.7, marginTop: ".75rem" }}>
            ⚠️ Restaurar un backup sobreescribe todos los datos actuales. Exporta primero si quieres conservar los cambios recientes.
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", lineHeight: 1.7, marginTop: ".35rem",
            padding: ".5rem .65rem", background: "var(--surface2)", borderRadius: 6,
            border: "1px solid var(--border)"
          }}>
            📎 <strong style={{ color: "var(--text-muted)" }}>Nota:</strong> El backup incluye todos los datos de la app excepto los archivos PDF/imágenes subidos en Documentos, que se almacenan en Vercel Blob y no se pueden exportar desde aquí. Para hacer copia de esos archivos, descárgalos individualmente desde el bloque Documentos.
          </div>
        </div>

        {/* ── Formulario de voluntarios ── */}
        <div id="cfg-formulario" className="card cfg-section">
          <div className="cfg-section-title">👥 Formulario de voluntarios</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: ".75rem", lineHeight: 1.6 }}>
            Comparte este enlace o QR con los voluntarios para que puedan registrarse.
          </div>
          <div style={{ display: "flex", gap: ".5rem", alignItems: "stretch", marginBottom: ".75rem" }}>
            <input
              className="cfg-input"
              readOnly
              value={urlFormulario}
              style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--cyan)", cursor: "text" }}
            />
            <button className="backup-btn export" style={{ flexShrink: 0, padding: ".45rem .85rem" }}
              onClick={() => {
                navigator.clipboard?.writeText(urlFormulario).then(() => {
                  const btn = document.activeElement;
                  const prev = btn.textContent;
                  btn.textContent = "✓ Copiado";
                  setTimeout(() => { btn.textContent = prev; }, 1500);
                });
              }}>
              📋 Copiar enlace
            </button>
            <button className="backup-btn export" style={{ flexShrink: 0, padding: ".45rem .85rem" }}
              onClick={generarQR} disabled={qrGenerando}>
              {qrGenerando ? "⏳" : "🔲 QR"}
            </button>
          </div>

          {/* QR generado */}
          {qrDataUrl && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: ".65rem", padding: ".85rem", background: "var(--surface2)",
              borderRadius: 10, border: "1px solid var(--border)", marginBottom: ".75rem",
            }}>
              <img
                src={qrDataUrl}
                alt="QR formulario voluntarios"
                style={{ width: 200, height: 200, borderRadius: 8, border: "4px solid #fff", display: "block" }}
              />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", textAlign: "center" }}>
                Escanea para acceder al formulario de registro
              </div>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <a href={qrDataUrl} download="qr-voluntarios-trail-guerrero.png" className="backup-btn export"
                  style={{ textDecoration: "none", padding: ".38rem .75rem", fontSize: "var(--fs-sm)" }}>
                  ⬇ Descargar imagen
                </a>
                <button className="backup-btn" style={{ padding: ".38rem .75rem", fontSize: "var(--fs-sm)", background: "var(--surface3)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  onClick={() => setQrDataUrl(null)}>
                  ✕ Cerrar QR
                </button>
              </div>
            </div>
          )}

          {/* ── Campos opcionales ── */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: ".85rem", marginTop: ".25rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".65rem" }}>
              Campos opcionales
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".45rem" }}>
              {[
                { label: "Puesto preferido", desc: "El voluntario puede indicar en qué puesto quiere trabajar", val: opcionPuesto,     set: setOpcionPuesto     },
                { label: "Vehículo propio",  desc: "Pregunta si dispone de coche para llegar a puestos remotos",  val: opcionVehiculo,   set: setOpcionVehiculo   },
                { label: "Email",            desc: "Campo opcional de correo para comunicaciones previas",         val: opcionEmail,      set: setOpcionEmail      },
                { label: "Teléfono emergencia", desc: "Contacto a avisar en caso de incidente el día del evento",  val: opcionEmergencia, set: setOpcionEmergencia },
              ].map(({ label, desc, val, set }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: ".55rem .75rem", borderRadius: 8,
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  gap: ".75rem",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--text)" }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: ".1rem" }}>{desc}</div>
                  </div>
                  <button
                    className={`btn btn-sm ${val ? "btn-cyan" : "btn-ghost"}`}
                    style={{ minWidth: 72, flexShrink: 0 }}
                    onClick={() => set(!val)}
                  >
                    {val ? "Activo" : "Inactivo"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Textos del formulario ── */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: ".85rem", marginTop: ".75rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".65rem" }}>
              Textos del formulario
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
              <div className="cfg-field">
                <label className="cfg-label">Subtítulo del formulario</label>
                <input
                  className="cfg-input"
                  value={form.formSubtitulo ?? "Formulario de inscripción de voluntarios"}
                  onChange={e => upd("formSubtitulo", e.target.value)}
                  placeholder="Formulario de inscripción de voluntarios"
                />
                <div className="cfg-hint">Aparece bajo el nombre del evento en la cabecera del formulario.</div>
              </div>
              <div className="cfg-field">
                <label className="cfg-label">Texto del botón de envío</label>
                <input
                  className="cfg-input"
                  value={form.formBoton ?? "✓ Registrarme como voluntario"}
                  onChange={e => upd("formBoton", e.target.value)}
                  placeholder="✓ Registrarme como voluntario"
                />
              </div>
              <div className="cfg-field">
                <label className="cfg-label">Mensaje de confirmación (tras el registro)</label>
                <textarea
                  className="cfg-input"
                  rows={3}
                  value={form.formConfirmacion ?? "Gracias por apuntarte como voluntario. El equipo organizador se pondrá en contacto contigo próximamente."}
                  onChange={e => upd("formConfirmacion", e.target.value)}
                  placeholder="Mensaje que verá el voluntario tras completar el registro…"
                  style={{ resize: "vertical", lineHeight: 1.6 }}
                />
                <div className="cfg-hint">Visible en la pantalla de confirmación tras el envío del formulario.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Imágenes de camisetas ── */}
        <div className="card cfg-section">
          <div className="cfg-section-title">👕 Imágenes de camisetas</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
            Estas imágenes se muestran en el portal de voluntarios al elegir talla.<br />
            Formatos: JPEG, PNG, WEBP · Máximo 500 KB por imagen.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { slot: "front", label: "Camiseta delantera", stored: imgFront },
              { slot: "back",  label: "Camiseta trasera",   stored: imgBack  },
              { slot: "guia",  label: "Guía de tallas",     stored: imgGuia  },
            ].map(({ slot, label, stored }) => {
              const preview = imgPreviews[slot] || stored;
              const error   = imgError[slot];
              const saving  = imgSaving[slot];
              return (
                <div key={slot} style={{
                  display: "flex", gap: "1rem", alignItems: "flex-start",
                  padding: ".85rem", borderRadius: 10,
                  background: "var(--surface2)", border: "1px solid var(--border)"
                }}>
                  {/* Previsualización */}
                  <div style={{
                    width: 80, height: 80, flexShrink: 0, borderRadius: 8,
                    background: "var(--surface3)", border: "1px solid var(--border)",
                    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    {preview
                      ? <img src={preview} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: "1.6rem", opacity: 0.4 }}>🖼️</span>
                    }
                  </div>
                  {/* Controles */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--text)", marginBottom: ".3rem" }}>
                      {label}
                    </div>
                    {error && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", marginBottom: ".4rem" }}>
                        ⚠️ {error}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                      <label className="backup-btn export" style={{ cursor: "pointer", padding: ".38rem .75rem", fontSize: "var(--fs-sm)" }}>
                        {saving ? "⏳ Guardando…" : preview ? "🔄 Cambiar" : "📂 Subir imagen"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          style={{ display: "none" }}
                          onChange={handleImgFile(slot)}
                        />
                      </label>
                      {preview && (
                        <button
                          className="backup-btn"
                          style={{ padding: ".38rem .75rem", fontSize: "var(--fs-sm)", background: "var(--surface3)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                          onClick={() => handleImgRemove(slot)}
                        >
                          🗑 Eliminar
                        </button>
                      )}
                    </div>
                    {stored && !imgPreviews[slot] && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: ".3rem" }}>
                        ✓ Imagen guardada
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Seguridad de acceso ── */}
        <div className="card cfg-section">
          <div className="cfg-section-title">🔐 Seguridad de acceso</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: ".75rem", lineHeight: 1.6 }}>
            El panel de gestión está protegido por un PIN numérico.
            Cámbialo regularmente y no lo compartas con personas ajenas al equipo organizador.
          </div>
          <button className="backup-btn export" style={{ padding: ".45rem .9rem" }}
            onClick={() => window.dispatchEvent(new CustomEvent("teg-open-changepin"))}>
            🔑 Cambiar PIN de acceso
          </button>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: ".6rem", lineHeight: 1.6 }}>
            ⚠️ El hash del PIN se almacena en este dispositivo. Para acceder desde otro dispositivo necesitarás el PIN actual o restaurar un backup.
          </div>
        </div>

        {/* ── Otras opciones ── */}
        <div className="card cfg-section" style={{ marginBottom: 0 }}>
          <div className="cfg-section-title">🛠️ Herramientas</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem" }}>
            {/* ── Modo arranque directo ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: ".55rem .75rem", borderRadius: 8,
              background: "var(--surface2)", border: "1px solid var(--border)"
            }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text)" }}>
                  🏁 Abrir DíaCarrera al iniciar
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", color: "var(--text-muted)", marginTop: ".1rem" }}>
                  Abre automáticamente el panel del día D tras introducir el PIN
                </div>
              </div>
              <button
                className={"btn btn-sm " + (form.autoOpenDia ? "btn-cyan" : "btn-ghost")}
                onClick={() => {
                  const val = !form.autoOpenDia;
                  upd("autoOpenDia", val);
                  // Guardar inmediatamente (no esperar a Guardar)
                  dataService.set(LS_KEY_CONFIG, { ...savedConfig, ...draft, autoOpenDia: val });
                }}
                style={{ minWidth: 70 }}>
                {form.autoOpenDia ? "Activo" : "Inactivo"}
              </button>
            </div>
            <button
              className="backup-btn"
              style={{
                background: "var(--violet-dim)", color: "var(--violet)",
                border: "1px solid rgba(167,139,250,.3)"
              }}
              onClick={() => {
                localStorage.removeItem(SK_UI_ONBOARDING_DONE);
                window.location.reload();
              }}>
              🎓 Ver tutorial de inicio
            </button>
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "var(--text-dim)", lineHeight: 1.7, marginTop: ".6rem"
          }}>
            Vuelve a ver el tutorial de bienvenida. Útil para nuevos colaboradores o para repasar las funciones principales.
          </div>
        </div>

        {/* ── Zona de peligro ─────────────────────────────────────────── */}
        <div className="card cfg-section" style={{ border: "1px solid rgba(248,113,113,.35)", background: "rgba(248,113,113,.04)" }}>
          <div className="cfg-section-title" style={{ color: "var(--red)" }}>🗑️ Zona de peligro</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
            Borra todos los datos de la aplicación: voluntarios, presupuesto, logística, patrocinadores, proyecto y configuración del evento. Esta acción es irreversible. Exporta un backup antes de continuar.
          </div>
          <button
            className="btn btn-red"
            onClick={() => { setResetInput(''); setResetModal(true); }}
          >
            🗑️ Borrar todos los datos
          </button>
        </div>

        <div className="cfg-save-bar">
          {saved && (
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
              <span className="cfg-saved">✓ Cambios guardados</span>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "var(--fs-sm)" }}
                onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "dashboard" } }))}>
                ← Dashboard
              </button>
            </div>
          )}
          <button className={cls("btn", dirty ? "btn-primary" : "btn-ghost")}
            onClick={handleSave} disabled={!dirty} style={{ opacity: dirty ? 1 : .45 }}>
            {dirty ? "Guardar cambios" : "Sin cambios pendientes"}
          </button>
        </div>

      </div>

      {/* ── MODAL PREVIEW IMPORT ─────────────────────────────────────────── */}
      {importPreview && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setImportPreview(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span className="mtit">⬆️ Confirmar restauración</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setImportPreview(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ gap: ".65rem" }}>
              {/* Meta del backup */}
              <div style={{
                background: "var(--surface2)", borderRadius: 8,
                padding: ".65rem .85rem", fontSize: "var(--fs-sm)",
                fontFamily: "var(--font-mono)", lineHeight: 1.7,
                border: "1px solid var(--border)",
              }}>
                <div><span style={{ color: "var(--text-muted)" }}>Versión backup:</span> <strong>{importPreview.meta.version}</strong></div>
                <div><span style={{ color: "var(--text-muted)" }}>Fecha de creación:</span> <strong>{importPreview.meta.fecha}</strong></div>
                <div><span style={{ color: "var(--text-muted)" }}>Evento:</span> <strong>{importPreview.meta.evento}</strong></div>
              </div>

              {/* Aviso */}
              <div style={{
                background: "var(--amber-dim)", borderRadius: 6,
                padding: ".55rem .75rem", fontSize: "var(--fs-sm)",
                fontFamily: "var(--font-mono)", color: "var(--amber)",
                border: "1px solid rgba(251,191,36,.25)",
                display: "flex", alignItems: "flex-start", gap: ".5rem",
              }}>
                <span style={{ flexShrink: 0, fontSize: "var(--fs-base)" }}>⚠️</span>
                <span>Se sobreescribirán los datos actuales con los del backup. Esta acción <strong>no se puede deshacer</strong>.</span>
              </div>

              {/* Resumen por módulo */}
              <div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)",
                  marginBottom: ".4rem"
                }}>
                  Colecciones a restaurar ({importPreview.totalClaves})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
                  {importPreview.resumen.map(r => (
                    <div key={r.modulo} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: ".3rem .5rem", borderRadius: 4,
                      background: "var(--surface2)", border: "1px solid var(--border)",
                      fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                    }}>
                      <span style={{ color: "var(--text)" }}>{r.modulo}</span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {r.claves} colecc. · {r.items} registros
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setImportPreview(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={aplicarImport}>
                🔄 Restaurar y sobreescribir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RESET COMPLETO (portal) ───────────────────────────────── */}
      {resetModal && createPortal(
        <div
          className="modal-backdrop"
          onClick={e => e.target === e.currentTarget && setResetModal(false)}
          style={{ zIndex: 9999 }}
        >
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span className="mtit" style={{ color: "var(--red)" }}>⚠️ Esta acción no tiene vuelta atrás</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setResetModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ gap: ".75rem" }}>
              <div style={{
                background: "rgba(248,113,113,.08)", borderRadius: 8,
                padding: ".65rem .85rem", fontSize: "var(--fs-sm)",
                fontFamily: "var(--font-mono)", lineHeight: 1.7,
                border: "1px solid rgba(248,113,113,.3)", color: "var(--text)",
              }}>
                Se borrarán permanentemente los siguientes datos:
                <ul style={{ margin: ".4rem 0 0 1rem", padding: 0, color: "var(--text-muted)" }}>
                  <li>👥 Voluntarios y puestos</li>
                  <li>💰 Presupuesto e inscripciones</li>
                  <li>📦 Logística y materiales</li>
                  <li>🤝 Patrocinadores</li>
                  <li>🏔️ Proyecto, tareas e hitos</li>
                  <li>⚙️ Configuración del evento</li>
                </ul>
              </div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                color: "var(--text-muted)", lineHeight: 1.6,
              }}>
                Escribe <strong style={{ color: "var(--red)" }}>BORRAR</strong> para confirmar:
              </div>
              <input
                className="cfg-input"
                type="text"
                placeholder="Escribe BORRAR para confirmar"
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                autoFocus
                style={{ fontFamily: "var(--font-mono)", letterSpacing: ".05em" }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setResetModal(false)}>Cancelar</button>
              <button
                className="btn btn-red"
                disabled={resetInput.trim() !== "BORRAR"}
                style={{ opacity: resetInput.trim() === "BORRAR" ? 1 : .4, cursor: resetInput.trim() === "BORRAR" ? "pointer" : "not-allowed" }}
                onClick={() => {
                  for (const key of ALL_DATA_KEYS) {
                    localStorage.removeItem(key);
                  }
                  // Limpiar también logs dinámicos de patrocinadores
                  const keysToRemove = [];
                  for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(SK_PAT_LOG_PREFIX)) keysToRemove.push(k);
                  }
                  keysToRemove.forEach(k => localStorage.removeItem(k));
                  setResetModal(false);
                  setResetInput('');
                  window.location.reload();
                }}
              >
                🗑️ Borrar todo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
