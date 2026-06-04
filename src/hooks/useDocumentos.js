import { useState, useEffect, useCallback, useMemo } from "react";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { SK_EVENT_CONFIG as LS_KEY_CONFIG } from "@/constants/storageKeys";
import { SK_DOC_DOCS, SK_DOC_SUBVENCIONES } from "@/constants/storageKeys";
import dataService from "@/lib/dataService";
import { useData } from "@/hooks/useData";
import { genIdStr } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  MAX_FILE_SIZE, ALLOWED_TYPES,
  diasHasta, formatImporte,
  GESTIONES_DEFAULT, SUBVENCIONES_DEFAULT,
} from "@/constants/documentosConstants";

// Categorías que muestran campo importe — formato exacto requerido por tests
const CATS_CON_IMPORTE = ["presupuestos","facturas","contratos","seguros"];

const LS_KEY = SK_DOC_DOCS;

export function useDocumentos() {
  const [eventCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);

  const [docs, setDocs]                   = useState([]);
  const [gestiones, setGestiones]         = useState([]);
  const [subvenciones, setSubvenciones]   = useState([]);
  const [tab, setTab]                     = useState("presupuestos");
  const [dragOver, setDragOver]           = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [subcat, setSubcat]               = useState("");
  const [nota, setNota]                   = useState("");
  const [descripcionDoc, setDescripcionDoc] = useState("");
  const [estadoNuevo, setEstadoNuevo]     = useState("pendiente");
  const [vencNuevo, setVencNuevo]         = useState("");
  const [emisorNuevo, setEmisorNuevo]     = useState("");
  const [importeNuevo, setImporteNuevo]   = useState("");
  const [busqueda, setBusqueda]           = useState("");
  const [busqGlobal, setBusqGlobal]       = useState(false);
  const [uploadOpen, setUploadOpen]       = useState(false);
  const [editId, setEditId]               = useState(null);
  const [gEditId, setGEditId]             = useState(null);
  const [svEditId, setSvEditId]           = useState(null);
  const [nuevoLog, setNuevoLog]           = useState("");
  const [delConfirm, setDelConfirm]       = useState(null);
  const [uploadError, setUploadError]     = useState(null);
  const [editForm, setEditForm]           = useState({});
  const [visorDoc, setVisorDoc]           = useState(null);
  const [isLoading, setIsLoading]         = useState(true);

  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };

  // ── Auto-vencimiento ──────────────────────────────────────────────────────
  const ESTADOS_EXCLUIDOS_DOC  = ["vigente", "vencido", "aprobado", "firmado", "denegado"];
  const ESTADOS_EXCLUIDOS_GEST = ["aprobado", "vigente", "denegado", "vencido"];

  const aplicarAutoVencimiento = useCallback((currentDocs, currentGestiones) => {
    const hoy = new Date();
    let docsActualizados      = currentDocs;
    let gestionesActualizadas = currentGestiones;
    let cambiosDocs  = false;
    let cambiosGest  = false;

    const nextDocs = currentDocs.map(d => {
      if (
        d.fechaVencimiento &&
        !ESTADOS_EXCLUIDOS_DOC.includes(d.estado) &&
        Math.ceil((new Date(d.fechaVencimiento) - hoy) / 86400000) < 0
      ) {
        cambiosDocs = true;
        return { ...d, estado: "vencido", fechaModificacion: new Date().toISOString() };
      }
      return d;
    });

    const nextGest = currentGestiones.map(g => {
      if (
        g.fechaVencimiento &&
        !ESTADOS_EXCLUIDOS_GEST.includes(g.estado) &&
        Math.ceil((new Date(g.fechaVencimiento) - hoy) / 86400000) < 0
      ) {
        cambiosGest = true;
        return { ...g, estado: "vencido", fechaModificacion: new Date().toISOString() };
      }
      return g;
    });

    if (cambiosDocs) {
      docsActualizados = nextDocs;
      setDocs(nextDocs);
      dataService.set(LS_KEY, nextDocs);
    }
    if (cambiosGest) {
      gestionesActualizadas = nextGest;
      setGestiones(nextGest);
      dataService.set(LS_KEY + "_gestiones", nextGest).then(() => dataService.notify("documentos"));
    }

    return { docs: docsActualizados, gestiones: gestionesActualizadas, cambiosDocs, cambiosGest };
  }, []);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/proxy/documents", {
          headers: { "Content-Type": "application/json" }
        });
        let docsInit;
        if (res.ok) {
          docsInit = await res.json();
          setDocs(docsInit);
          dataService.set(LS_KEY, docsInit);
        } else {
          const fallback = await dataService.get(LS_KEY, []);
          docsInit = Array.isArray(fallback) ? fallback : [];
          setDocs(docsInit);
        }

        const rawGest = await dataService.get(LS_KEY + "_gestiones", null);
        let gestInit;
        if (Array.isArray(rawGest)) {
          gestInit = rawGest;
        } else {
          gestInit = GESTIONES_DEFAULT;
          dataService.set(LS_KEY + "_gestiones", GESTIONES_DEFAULT);
        }
        setGestiones(gestInit);

        const rawSv = await dataService.get(SK_DOC_SUBVENCIONES, null);
        if (Array.isArray(rawSv)) {
          setSubvenciones(rawSv);
        } else {
          setSubvenciones(SUBVENCIONES_DEFAULT);
          dataService.set(SK_DOC_SUBVENCIONES, SUBVENCIONES_DEFAULT);
        }

        aplicarAutoVencimiento(docsInit, gestInit);
      } catch {
        const fallback = await dataService.get(LS_KEY, []).catch(() => []);
        const docsInit = Array.isArray(fallback) ? fallback : [];
        setDocs(docsInit);
        setGestiones(GESTIONES_DEFAULT);
        aplicarAutoVencimiento(docsInit, GESTIONES_DEFAULT);
      }
      setIsLoading(false);
    };
    load();

    const intervalo = setInterval(() => {
      setDocs(prevDocs => {
        setGestiones(prevGest => {
          aplicarAutoVencimiento(prevDocs, prevGest);
          return prevGest;
        });
        return prevDocs;
      });
    }, 60 * 60 * 1000);

    return () => clearInterval(intervalo);
  }, [aplicarAutoVencimiento]);

  // ── Persistencia ─────────────────────────────────────────────────────────
  const save = useCallback((next) => {
    setDocs(next);
    dataService.set(LS_KEY, next);
    dataService.notify("documentos");
  }, []);

  const saveGestiones = useCallback((next) => {
    setGestiones(next);
    dataService.set(LS_KEY + "_gestiones", next).then(() => dataService.notify("documentos"));
  }, []);

  const saveSubvenciones = useCallback((next) => {
    setSubvenciones(next);
    dataService.set(SK_DOC_SUBVENCIONES, next).then(async () => {
      const totalConcedido = next
        .filter(sv => ["concedida", "justificada", "cerrada"].includes(sv.estado))
        .reduce((sum, sv) => {
          const v = parseFloat(String(sv.importeConcedido || "0").replace(",", ".")) || 0;
          return sum + v;
        }, 0);
      const ingresosExtra = await dataService.get("teg_presupuesto_v1_ingresosExtra", []);
      if (Array.isArray(ingresosExtra)) {
        const updated = ingresosExtra.map(ie =>
          ie.syncKey === "subvencionPublica"
            ? { ...ie, valor: totalConcedido, activo: totalConcedido > 0 }
            : ie
        );
        await dataService.set("teg_presupuesto_v1_ingresosExtra", updated);
      }
      dataService.notify("documentos");
      dataService.notify("presupuesto");
    });
  }, []);

  // ── File handling ─────────────────────────────────────────────────────────
  const fileToBase64 = (file) => new Promise((res, rej) => {
    const isImage = file.type.startsWith("image/") || !!file.name.match(/\.(png|jpe?g|webp)$/i);
    if (!isImage) {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
      return;
    }
    const MAX_DIM = 1920;
    const QUALITY = 0.82;
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      res(canvas.toDataURL("image/webp", QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    };
    img.src = objUrl;
  });

  const handleFiles = useCallback(async (files) => {
    if (uploading) return;
    const validFiles = Array.from(files).filter(f => {
      const typeOk = ALLOWED_TYPES.includes(f.type) || f.name.match(/\.(pdf|png|jpe?g|webp)$/i);
      if (!typeOk) { setUploadError(`Tipo no permitido: "${f.name}". Usa PDF, PNG, JPG o WebP.`); return false; }
      if (f.size > MAX_FILE_SIZE) { setUploadError(`"${f.name}" excede 10 MB.`); return false; }
      return true;
    });
    if (!validFiles.length) return;
    setUploading(true);
    const newDocs = [];
    for (const file of validFiles) {
      const base64 = await fileToBase64(file);
      const b64Data = base64.includes(",") ? base64.split(",")[1] : base64;
      const realSize = Math.round(b64Data.length * 0.75);
      const isCompressedImg = base64.startsWith("data:image/webp") && !file.name.match(/\.webp$/i);
      const nombre = isCompressedImg ? file.name.replace(/\.[^.]+$/, "") + ".webp" : file.name;
      const tipo   = isCompressedImg ? "image/webp"
        : (file.type || (file.name.match(/\.pdf$/i) ? "application/pdf" : "image/jpeg"));
      newDocs.push({
        id: genIdStr(),
        nombre,
        nombreDisplay: nota ? nota.trim() : file.name.replace(/\.[^.]+$/, ""),
        emisor: emisorNuevo || null,
        importe: importeNuevo ? parseFloat(importeNuevo.replace(",", ".")) || null : null,
        categoria: tab,
        subcategoria: subcat || null,
        nota: descripcionDoc ? descripcionDoc.trim() : null,
        estado: estadoNuevo,
        fechaVencimiento: vencNuevo || null,
        size: realSize,
        tipo,
        data: base64,
        fechaSubida: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
      });
    }
    const subidos = [];
    const errores = [];
    for (const doc of newDocs) {
      try {
        const res = await fetch("/api/proxy/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(doc),
        });
        if (res.ok) {
          const { blobUrl } = await res.json();
          subidos.push({ ...doc, data: null, blobUrl: blobUrl || null });
        } else {
          const err = await res.json().catch(() => ({}));
          errores.push(`"${doc.nombre}": ${err.error || res.status}`);
        }
      } catch (e) {
        errores.push(`"${doc.nombre}": error de red`);
      }
    }
    if (subidos.length > 0) save([...docs, ...subidos]);
    if (subidos.length > 0) toast.success(subidos.length === 1 ? "Documento subido correctamente" : `${subidos.length} documentos subidos`);
    if (errores.length > 0) setUploadError(`Error al subir: ${errores.join(" · ")}`);
    setNota(""); setSubcat(""); setVencNuevo(""); setEstadoNuevo("pendiente");
    setEmisorNuevo(""); setImporteNuevo(""); setDescripcionDoc("");
    setUploading(false);
  }, [docs, tab, subcat, nota, descripcionDoc, estadoNuevo, vencNuevo, emisorNuevo, importeNuevo, uploading, save]);

  const handleDrop      = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };
  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); };

  // ── Document CRUD ─────────────────────────────────────────────────────────
  const deleteDoc = async (id) => {
    setDelConfirm({ id, nombre: docs.find(d => d.id === id)?.nombreDisplay || docs.find(d => d.id === id)?.nombre || "documento", esGestion: false });
  };

  const confirmarDelete = async () => {
    if (!delConfirm) return;
    const { id, esGestion, esSubvencion } = delConfirm;
    setDelConfirm(null);
    if (esGestion) {
      saveGestiones(gestiones.filter(x => x.id !== id));
      setGEditId(null);
      toast.success("Gestión eliminada");
    } else if (esSubvencion) {
      saveSubvenciones(subvenciones.filter(sv => sv.id !== id));
      setSvEditId(null);
      toast.success("Subvención eliminada");
    } else {
      try {
        await fetch(`/api/proxy/documents?id=${id}`, { method: "DELETE" });
      } catch (e) { console.error("Error eliminando:", e); }
      save(docs.filter(d => d.id !== id));
      toast.success("Documento eliminado");
    }
  };

  const downloadDoc = async (doc) => {
    if (doc.blobUrl) {
      const a = document.createElement("a");
      a.href = doc.blobUrl;
      a.download = doc.nombre;
      a.target = "_blank";
      a.click();
      return;
    }
    const data = doc.data;
    if (!data) return;
    const a = document.createElement("a");
    a.href = data; a.download = doc.nombre; a.click();
  };

  const viewDoc = async (doc) => {
    const esImg = doc.tipo?.startsWith("image/") || !!doc.nombre?.match(/\.(png|jpe?g|webp)$/i);
    if (doc.blobUrl) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (esImg) {
        setVisorDoc({ ...doc, _loading: false });
      } else if (isIOS) {
        window.open(doc.blobUrl, "_blank", "noopener");
      } else {
        setVisorDoc({ ...doc, _loading: true, _esPdf: true });
        try {
          const resp = await fetch(doc.blobUrl);
          const blob = await resp.blob();
          const objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
          setVisorDoc({ ...doc, _loading: false, _esPdf: true, _objectUrl: objectUrl });
        } catch {
          setVisorDoc(null);
          window.open(doc.blobUrl, "_blank", "noopener");
        }
      }
      return;
    }
    if (doc.data) {
      const esPdf = doc.tipo === "application/pdf"
        || doc.nombre?.toLowerCase().endsWith(".pdf")
        || doc.data.startsWith("data:application/pdf");
      if (esPdf) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          const a = document.createElement("a");
          a.href = doc.data; a.download = doc.nombre || "documento.pdf"; a.click();
        } else {
          try {
            const b64 = doc.data.includes(",") ? doc.data.split(",")[1] : doc.data;
            const bin = atob(b64);
            const buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            const url = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
            setVisorDoc({ ...doc, _loading: false, _esPdf: true, _objectUrl: url });
          } catch {
            setVisorDoc({ ...doc, _loading: false, _esPdf: true });
          }
        }
        return;
      }
      if (esImg) { setVisorDoc({ ...doc, _loading: false }); return; }
      window.open(doc.data, "_blank");
      return;
    }
    setVisorDoc({ ...doc, _loading: false, _error: true });
  };

  const startEdit = (doc) => {
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "instant" });
    setEditId(doc.id);
    setEditForm({
      nombreDisplay: doc.nombreDisplay || doc.nombre.replace(/\.[^.]+$/, ""),
      emisor: doc.emisor || "",
      importe: doc.importe != null ? String(doc.importe) : "",
      nota: doc.nota || "",
      subcategoria: doc.subcategoria || "",
      estado: doc.estado || "pendiente",
      fechaVencimiento: doc.fechaVencimiento || "",
    });
  };

  const saveEdit = async () => {
    const formToSave = {
      ...editForm,
      importe: editForm.importe !== "" && editForm.importe != null
        ? parseFloat(String(editForm.importe).replace(",", ".")) || null
        : null,
    };
    try {
      await fetch(`/api/proxy/documents?id=${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToSave),
      });
    } catch (e) { console.error("Error actualizando:", e); }
    save(docs.map(d => d.id === editId
      ? { ...d, ...formToSave, fechaModificacion: new Date().toISOString() }
      : d
    ));
    const doc = docs.find(d => d.id === editId);
    if (doc && editForm.categoria && editForm.categoria !== doc.categoria) setTab(editForm.categoria);
    setEditId(null);
  };

  const updateEstado = async (id, estado) => {
    try {
      await fetch(`/api/proxy/documents?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
    } catch (e) { console.error("Error actualizando estado:", e); }
    save(docs.map(d => d.id === id ? { ...d, estado, fechaModificacion: new Date().toISOString() } : d));
  };

  const addLogEntry = (gestionId) => {
    const texto = nuevoLog.trim();
    if (!texto) return;
    const entrada = { id: Date.now(), fecha: new Date().toISOString(), texto, autor: "Organización" };
    saveGestiones(gestiones.map(g =>
      g.id === gestionId ? { ...g, log: [...(g.log || []), entrada] } : g
    ));
    setNuevoLog("");
  };

  // Derived values ────────────────────────────────────────────────────────────
  // totalImporte: solo para categorías ["presupuestos","facturas"]
  const _sumaImporte = (catId) => docs
    .filter(d => d.categoria === catId && d.importe != null)
    .reduce((s, d) => s + (typeof d.importe === "number" ? d.importe : parseFloat(String(d.importe).replace(",", ".")) || 0), 0);

  const totalStoragePpto = _sumaImporte("presupuestos");
  const totalStorageFact = _sumaImporte("facturas");
  const gestionesProxVencer = useMemo(() => gestiones.filter(gst => {
    const ndias = diasHasta(gst.fechaVencimiento);
    if (ndias === null || ndias < 0 || ndias > 30) return false;
    if (gst.estado === "aprobado") return false;
    const esPorDefecto = !gst.responsable && !gst.url && !gst.fechaSubida;
    if (esPorDefecto && ndias > 7) return false;
    return true;
  }), [gestiones]);

  const gestionesVencidas = useMemo(() => gestiones.filter(gst => {
    const ndias = diasHasta(gst.fechaVencimiento);
    return ndias !== null && ndias < 0 && gst.estado !== "aprobado" && gst.estado !== "denegado";
  }), [gestiones]);

  const gestionesCriticas = useMemo(() =>
    gestiones.filter(g => g.estado === "denegado"),
  [gestiones]);

  const semaforoRiesgo = useMemo(() => {
    const GESTIONES_CRITICAS_IDS = ["g1", "g2", "g3"];
    const criticas = gestiones.filter(g => GESTIONES_CRITICAS_IDS.includes(g.id));
    if (criticas.some(g => g.estado === "denegado")) return "rojo";
    if (criticas.some(g => {
      const nd = diasHasta(g.fechaVencimiento);
      return g.estado !== "aprobado" && (nd === null || nd < 0);
    })) return "rojo";
    if (criticas.some(g => {
      const nd = diasHasta(g.fechaVencimiento);
      return g.estado !== "aprobado" && nd !== null && nd <= 30;
    })) return "ambar";
    if (criticas.every(g => g.estado === "aprobado")) return "verde";
    return "ambar";
  }, [gestiones]);

  const proxVencer = useMemo(() => docs.filter(doc => {
    const ndias = diasHasta(doc.fechaVencimiento);
    return ndias !== null && ndias >= 0 && ndias <= 30 && doc.estado !== "aprobado";
  }).sort((sa, sb) => new Date(sa.fechaVencimiento) - new Date(sb.fechaVencimiento)),
  [docs]);

  const vencidos = useMemo(() => docs.filter(doc => {
    const ndias = diasHasta(doc.fechaVencimiento);
    return ndias !== null && ndias < 0 && doc.estado !== "aprobado";
  }), [docs]);

  const resultadosGlobales = useMemo(() => busqueda && busqGlobal
    ? docs.filter(d => {
        const q = busqueda.toLowerCase();
        return (d.nombreDisplay || d.nombre).toLowerCase().includes(q)
          || (d.emisor || "").toLowerCase().includes(q)
          || (d.nota || "").toLowerCase().includes(q)
          || (d.subcategoria || "").toLowerCase().includes(q);
      }).sort((sa, sb) => new Date(sb.fechaSubida) - new Date(sa.fechaSubida))
    : null,
  [docs, busqueda, busqGlobal]);

  const catDocs = useMemo(() => docs
    .filter(d => d.categoria === tab)
    .filter(d => {
      if (!busqueda || busqGlobal) return true;
      const q = busqueda.toLowerCase();
      return (d.nombreDisplay || d.nombre).toLowerCase().includes(q)
        || (d.emisor || "").toLowerCase().includes(q)
        || (d.nota || "").toLowerCase().includes(q)
        || (d.subcategoria || "").toLowerCase().includes(q)
        || (d.estado || "").toLowerCase().includes(q);
    })
    .sort((sa, sb) => new Date(sb.fechaSubida) - new Date(sa.fechaSubida)),
  [docs, tab, busqueda, busqGlobal]);

  const totalSize = docs.reduce((s, d) => s + (d.size || 0), 0);
  const storagePct = Math.min((totalSize / (100 * 1024 * 1024)) * 100, 100);

  return {
    // State
    docs, gestiones, subvenciones,
    tab, setTab,
    dragOver, uploading,
    subcat, setSubcat,
    nota, setNota,
    descripcionDoc, setDescripcionDoc,
    estadoNuevo, setEstadoNuevo,
    vencNuevo, setVencNuevo,
    emisorNuevo, setEmisorNuevo,
    importeNuevo, setImporteNuevo,
    busqueda, setBusqueda,
    busqGlobal, setBusqGlobal,
    uploadOpen, setUploadOpen,
    editId, setEditId,
    gEditId, setGEditId,
    svEditId, setSvEditId,
    nuevoLog, setNuevoLog,
    delConfirm, setDelConfirm,
    uploadError, setUploadError,
    editForm, setEditForm,
    visorDoc, setVisorDoc,
    isLoading,
    config,
    // Handlers
    handleFiles, handleDrop, handleDragOver, handleDragLeave,
    deleteDoc, confirmarDelete, downloadDoc, viewDoc,
    startEdit, saveEdit, updateEstado,
    saveGestiones, saveSubvenciones,
    addLogEntry,
    // Derived
    gestionesProxVencer, gestionesVencidas, gestionesCriticas,
    semaforoRiesgo, proxVencer, vencidos,
    resultadosGlobales, catDocs,
    totalSize, storagePct,
  };
}
