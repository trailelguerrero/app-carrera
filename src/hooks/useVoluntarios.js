import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  SK_VOL_PUESTOS, SK_VOL_VOLUNTARIOS,
  SK_LOG_MAT, SK_LOG_ASIG, SK_LOG_RUT,
} from "@/constants/storageKeys";
import { TALLAS } from "@/constants/camisetasConstants";
import { toast } from "@/lib/toast";
import { genIdNum, genIdStr } from "@/lib/utils";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { SK_EVENT_CONFIG as LS_KEY_CONFIG } from "@/constants/storageKeys";
import { LOCS_DEFAULT, LOCS_KEY } from "@/constants/localizaciones";
import { useData } from "@/hooks/useData";
import dataService from "@/lib/dataService";
import { PUESTOS_DEFAULT } from "@/constants/puestosConstants";
import { contarPuestosPorLocalizacion } from "@/components/logistica/logisticaHelpers";

// Re-export para retrocompatibilidad (otros módulos importan esto desde Voluntarios.jsx)
export function resolverLocalizacionDeVoluntario(voluntario, puestos = [], locs = []) {
  if (!voluntario) return { puesto: null, localizacion: null };
  const pts   = Array.isArray(puestos) ? puestos : [];
  const lsArr = Array.isArray(locs)    ? locs    : [];
  const puesto = pts.find(p => p.id === voluntario.puestoId) ?? null;
  if (!puesto) return { puesto: null, localizacion: null };
  if (puesto.localizacionId != null) return { puesto, localizacion: lsArr.find(l => l.id === puesto.localizacionId) ?? null };
  return { puesto, localizacion: lsArr.find(l => l.nombre === puesto.nombre) ?? null };
}

// [VOL-AUDIT-3] Extraída del hook para poder testearse directamente (VOL-07 llamaba antes
// a una copia local en el test, con un campo distinto, en vez de a esta lógica real).
export function calcularSugerenciasReubicacion(puestos, voluntarios) {
  const statsP = (puestos || []).map(p => {
    const asig = (voluntarios || []).filter(v => v.puestoId === p.id && v.estado !== "cancelado");
    const conf = asig.filter(v => v.estado === "confirmado");
    return { ...p, exceso: Math.max(0, conf.length - p.necesarios), deficit: Math.max(0, p.necesarios - conf.length), confirmados: conf };
  });
  const conExceso  = statsP.filter(s => s.exceso  > 0).sort((a, b) => b.exceso  - a.exceso);
  const conDeficit = statsP.filter(s => s.deficit > 0).sort((a, b) => b.deficit - a.deficit);
  const sug = [];
  for (const destino of conDeficit) {
    for (const origen of conExceso) {
      if (sug.length >= 5) break;
      const movibles   = Math.min(origen.exceso, destino.deficit);
      const candidatos = origen.confirmados.filter(v => v.rol !== "responsable").slice(0, movibles);
      if (movibles > 0 && candidatos.length > 0) {
        sug.push({ desde: origen.nombre, desdeId: origen.id, hasta: destino.nombre, hastaId: destino.id, candidatos: candidatos.map(v => ({ id: v.id, nombre: v.nombre })), n: candidatos.length });
      }
    }
  }
  return sug;
}

// [BUG-LOC-01] Extraída para que addPuesto y updatePuesto compartan EXACTAMENTE
// la misma lógica al resolver el flag "_crearLoc" (➕ Crear nueva ubicación) — antes
// solo addPuesto sabía hacerlo, y al editar un puesto la ubicación nunca se creaba.
// Pura: no toca estado, solo decide qué localizacionId usar y si hay que crear una
// ubicación nueva (en cuyo caso la devuelve para que el caller la añada a locs).
export function resolverNuevaLocParaPuesto(data, locsActuales) {
  if (data.localizacionId || !data._crearLoc || !data.nombre) {
    return { localizacionId: data.localizacionId ?? null, nuevaLoc: null };
  }
  const nuevaLoc = {
    id: genIdNum(Array.isArray(locsActuales) ? locsActuales : []),
    nombre: data.nombre,
    tipo: data.tipo || "otro",
    descripcion: "",
    ...(data.lat != null && data.lng != null ? { lat: data.lat, lng: data.lng } : {}),
  };
  return { localizacionId: nuevaLoc.id, nuevaLoc };
}

const VOLUNTARIOS_DEFAULT = [
  { id: 1, nombre: "Voluntario Ejemplo 1", telefono: "600 000 001", email: "voluntario1@ejemplo.es", talla: "S", puestoId: 1, rol: "responsable", estado: "confirmado", coche: true,  notas: "", fechaRegistro: "2026-02-15" },
  { id: 2, nombre: "Voluntario Ejemplo 2", telefono: "600 000 002", email: "voluntario2@ejemplo.es", talla: "L", puestoId: 2, rol: "apoyo",       estado: "confirmado", coche: false, notas: "", fechaRegistro: "2026-02-20" },
  { id: 3, nombre: "Voluntario Ejemplo 3", telefono: "600 000 003", email: "voluntario3@ejemplo.es", talla: "M", puestoId: 3, rol: "responsable", estado: "pendiente",  coche: true,  notas: "", fechaRegistro: "2026-03-01" },
];

export function useVoluntarios() {
  const [eventCfg]  = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };

  const [rawPuestos, setPuestos, isLoadingPuestos] = useData(SK_VOL_PUESTOS, PUESTOS_DEFAULT);
  const puestos = Array.isArray(rawPuestos) ? rawPuestos : [];

  const [rawVoluntarios, setVoluntarios, isLoadingVols] = useData(SK_VOL_VOLUNTARIOS, VOLUNTARIOS_DEFAULT);
  const isLoading = isLoadingPuestos || isLoadingVols;

  const voluntarios = useMemo(() => {
    const raw = Array.isArray(rawVoluntarios) ? rawVoluntarios : [];
    return raw.map(v => {
      let out = { ...v };
      if (out.contactoEmergencia && !out.telefonoEmergencia) out = { ...out, telefonoEmergencia: out.contactoEmergencia };
      if (!out.apellidos && out.nombre && out.nombre.trim().includes(" ")) {
        const spaceIdx = out.nombre.trim().lastIndexOf(" ");
        out = { ...out, nombre: out.nombre.trim().slice(0, spaceIdx), apellidos: out.nombre.trim().slice(spaceIdx + 1) };
      }
      return out;
    });
  }, [rawVoluntarios]);

  const [locs, setLocs] = useData(LOCS_KEY, LOCS_DEFAULT);
  const [rawMat]   = useData(SK_LOG_MAT,  []);
  const [rawAsig]  = useData(SK_LOG_ASIG, []);
  const [rawRutas] = useData(SK_LOG_RUT,  []);
  const rutas = Array.isArray(rawRutas) ? rawRutas : [];

  const matPorLoc = useMemo(() => {
    const mat    = Array.isArray(rawMat)  ? rawMat  : [];
    const asigs  = Array.isArray(rawAsig) ? rawAsig : [];
    const lcsArr = Array.isArray(locs)    ? locs    : [];
    const mapById = {}, mapByName = {};
    asigs.forEach(a => {
      const item = mat.find(m => m.id === a.materialId);
      if (!item) return;
      const entry = { nombre: item.nombre, cantidad: a.cantidad, unidad: item.unidad || "ud" };
      if (a.localizacionId) { if (!mapById[a.localizacionId]) mapById[a.localizacionId] = []; mapById[a.localizacionId].push(entry); }
      if (a.puesto)         { if (!mapByName[a.puesto])       mapByName[a.puesto]       = []; mapByName[a.puesto].push(entry); }
    });
    const map = { ...mapByName };
    lcsArr.forEach(loc => {
      if (mapById[loc.id]) {
        const existentes = map[loc.nombre] || [];
        const nuevos     = mapById[loc.id].filter(n => !existentes.some(e => e.nombre === n.nombre));
        map[loc.nombre]  = [...existentes, ...nuevos];
      }
    });
    return map;
  }, [rawMat, rawAsig, locs]);

  // MEJ-LOG-PUESTO: material agrupado por PUESTO real (no por nombre de ubicación).
  // Esto es lo que corrige la mezcla de material cuando dos puestos comparten la
  // misma ubicación maestra (ej. avituallamiento + control de paso en el mismo punto):
  // cada uno tiene su propia lista, en vez de compartir la de la ubicación.
  const matPorPuesto = useMemo(() => {
    const mat   = Array.isArray(rawMat)  ? rawMat  : [];
    const asigs = Array.isArray(rawAsig) ? rawAsig : [];
    const map = {};
    asigs.forEach(a => {
      if (a.tipoDestino === "voluntario" || a.puestoId == null) return;
      const item = mat.find(m => m.id === a.materialId);
      if (!item) return;
      if (!map[a.puestoId]) map[a.puestoId] = [];
      map[a.puestoId].push({ nombre: item.nombre, cantidad: a.cantidad, unidad: item.unidad || "ud", estado: a.estado });
    });
    return map;
  }, [rawMat, rawAsig]);

  // Material asignado directamente a una persona (ej. su walkie-talkie individual),
  // independiente del material de su puesto.
  const matPorVoluntario = useMemo(() => {
    const mat   = Array.isArray(rawMat)  ? rawMat  : [];
    const asigs = Array.isArray(rawAsig) ? rawAsig : [];
    const map = {};
    asigs.forEach(a => {
      if (a.tipoDestino !== "voluntario" || a.voluntarioId == null) return;
      const item = mat.find(m => m.id === a.materialId);
      if (!item) return;
      if (!map[a.voluntarioId]) map[a.voluntarioId] = [];
      map[a.voluntarioId].push({ nombre: item.nombre, cantidad: a.cantidad, unidad: item.unidad || "ud", estado: a.estado });
    });
    return map;
  }, [rawMat, rawAsig]);

  // F4-01: Polling 30s en tabs dashboard/diaD
  const [tab, setTab] = useState("dashboard");
  useEffect(() => {
    if (tab !== "dashboard" && tab !== "diaD") return;
    const interval = setInterval(async () => {
      // [VOL-AUDIT-DUP] No pisar el estado local si hay una escritura en curso
      // (debounce de guardado activo) — si no, un dato más nuevo en memoria
      // (p.ej. una eliminación recién hecha) podía sobreescribirse con la
      // copia todavía-no-actualizada de Neon, haciendo "revivir" un registro
      // que el usuario acababa de borrar.
      if (dataService.hasPendingWrite(SK_VOL_VOLUNTARIOS)) return;
      const fresco = await dataService.get(SK_VOL_VOLUNTARIOS, []);
      if (JSON.stringify(fresco) !== JSON.stringify(rawVoluntarios)) setVoluntarios(fresco);
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [tab, rawVoluntarios]); // eslint-disable-line react-hooks/exhaustive-deps

  // [VOL-AUDIT-DUP] Reparación de voluntarios con id nulo/indefinido en datos ya existentes.
  // Caso reportado: Judith Castañar — varias entradas duplicadas, y al pulsar "Eliminar"
  // ni siquiera aparecía el aviso de confirmación.
  // Causa: el código que abre ese aviso y el que ejecuta el borrado comprueban
  // explícitamente `id === null || id === undefined` y NO HACEN NADA si no hay
  // un id válido (es una protección para no operar "a ciegas" sobre un registro
  // sin identificador — pero como protección, también bloquea por completo
  // cualquier acción sobre un registro que ya tenía ese problema de origen).
  // Esta reparación, una sola vez al cargar, asigna un id nuevo y único a
  // cualquier voluntario sin id válido, para que vuelva a poder eliminarse,
  // editarse y comportarse con normalidad en el resto de la app.
  const idsReparadosRef = useRef(false);
  useEffect(() => {
    if (isLoading || idsReparadosRef.current) return;
    if (!Array.isArray(rawVoluntarios) || rawVoluntarios.length === 0) return;
    const sinId = rawVoluntarios.filter(v => v?.id === null || v?.id === undefined);
    idsReparadosRef.current = true;
    if (sinId.length === 0) return;
    const reparados = rawVoluntarios.map(v =>
      (v?.id === null || v?.id === undefined) ? { ...v, id: genIdStr() } : v
    );
    setVoluntarios(reparados, { force: true });
    toast.success(`Reparados ${sinId.length} voluntario(s) sin identificador válido — ya se pueden eliminar y editar con normalidad.`);
  }, [isLoading, rawVoluntarios, setVoluntarios]);

  const [saveStatus,       setSaveStatus]       = useState("idle");
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [busqueda,         setBusqueda]         = useState("");
  const [filtroEstado,     setFiltroEstado]     = useState("todos");
  const [filtroPuesto,     setFiltroPuesto]     = useState("todos");
  const [filtroTallas,     setFiltroTallas]     = useState([]);
  const [filtroCoche,      setFiltroCoche]      = useState("todos");
  const [filtroDistancias, setFiltroDistancias] = useState([]);
  const [filtroTipoPuesto, setFiltroTipoPuesto] = useState([]);
  const [modalVol,         setModalVol]         = useState(null);
  const [modalPuesto,      setModalPuesto]      = useState(null);
  const [modalMensaje,     setModalMensaje]     = useState(false);
  const [confirmDelete,    setConfirmDelete]    = useState(null);
  const [confirmDeletePuesto, setConfirmDeletePuesto] = useState(null);
  const pendingDeleteRef = useRef(null);

  const ejecutarEliminacion = useCallback((id) => {
    if (id === null || id === undefined) return;
    const sid = String(id);
    setVoluntarios(prev => Array.isArray(prev) ? prev.filter(v => String(v.id) !== sid) : prev, { force: true });
    setConfirmDelete(null);
    pendingDeleteRef.current = null;
    toast.success("Voluntario eliminado");
  }, [setVoluntarios]);

  // ── Métricas ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const vols = voluntarios || [], pts = puestos || [];
    const total           = vols.length;
    const confirmados     = vols.filter(v => v?.estado === "confirmado").length;
    const pendientes      = vols.filter(v => v?.estado === "pendiente").length;
    const cancelados      = vols.filter(v => v?.estado === "cancelado").length;
    const totalNecesarios = pts.reduce((s, p) => s + (p?.necesarios || 0), 0);
    const asignados       = vols.filter(v => v?.puestoId).length;
    const conCoche        = vols.filter(v => v?.coche).length;
    const tallasCount     = TALLAS.reduce((acc, t) => { acc[t] = vols.filter(v => v?.talla === t && v?.estado !== "cancelado").length; return acc; }, {});
    const coberturaGlobal = totalNecesarios > 0 ? Math.round((confirmados / totalNecesarios) * 100) : 0;
    const enPuesto        = vols.filter(v => v?.enPuesto).length;
    return { total, confirmados, pendientes, cancelados, totalNecesarios, asignados, conCoche, tallasCount, coberturaGlobal, enPuesto };
  }, [voluntarios, puestos]);

  const sugerenciasReubicacion = useMemo(
    () => calcularSugerenciasReubicacion(puestos, voluntarios),
    [puestos, voluntarios]
  );

  const puestosConStats = useMemo(() => {
    const conteoPorLoc = contarPuestosPorLocalizacion(puestos);
    return (puestos || []).map(p => {
      // [DUDOSO] No cuenta para cobertura hasta confirmarse — mismo trato que "ausente".
      const vols        = (voluntarios || []).filter(v => v?.puestoId === p?.id && v?.estado !== "cancelado" && v?.estado !== "ausente" && v?.estado !== "dudoso");
      const confirmados = vols.filter(v => v?.estado === "confirmado").length;
      const cobertura     = p?.necesarios > 0 ? Math.round((vols.length / p.necesarios) * 100) : 0;
      const coberturaConf = p?.necesarios > 0 ? Math.round((confirmados / p.necesarios) * 100) : 0;
      // MEJ-LOG-PUESTO: cuántos OTROS puestos comparten su misma ubicación maestra
      // (ej. avituallamiento + control de paso en el mismo punto del recorrido).
      const otrosPuestosEnMismaUbicacion = p?.localizacionId != null
        ? Math.max(0, (conteoPorLoc.get(p.localizacionId) || 1) - 1)
        : 0;
      return { ...p, voluntariosAsignados: vols, totalAsignados: vols.length, confirmados, cobertura, coberturaConf, otrosPuestosEnMismaUbicacion };
    });
  }, [puestos, voluntarios]);

  // ── Helpers PIN ──────────────────────────────────────────────────────────
  const hashPinLocal  = (pin) => { let h = 0; for (let i = 0; i < pin.length; i++) h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0; return String(h); };
  const pinInicialLocal = (tel) => { const d = (tel || "").replace(/\D/g, ""); return d.slice(-4) || "0000"; };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const guardar = () => { dataService.notify("voluntarios"); setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2500); };

  const addVoluntario = (data) => {
    const telNorm = (data.telefono || "").replace(/\D/g, "");
    if (telNorm.length >= 9) {
      const dup = voluntarios.find(v => (v.telefono || "").replace(/\D/g, "") === telNorm);
      if (dup) { toast.error(`Ya existe un voluntario con ese teléfono: ${dup.nombre}`); return false; }
    }
    const pinHash = hashPinLocal(pinInicialLocal(data.telefono || ""));
    const nuevo   = { id: genIdNum(voluntarios), camisetaEntregada: false, enPuesto: false, horaLlegada: null, sessionToken: null, pinHash, ...data };
    setVoluntarios(prev => [...prev, nuevo]);
    toast.success("Voluntario añadido");
    dataService.notify("voluntarios");
    return true;
  };

  const importarCSV = async (file) => {
    const text  = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) { toast.error("Archivo vacío"); return; }
    const sep     = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    const idx     = (names) => names.map(n => headers.findIndex(h => h.includes(n))).find(i => i >= 0) ?? -1;
    const iNombre = idx(["nombre", "name"]);
    const iApel   = idx(["apellido", "surname", "last"]);
    const iTel    = idx(["telefono", "phone", "tel", "móvil", "movil", "celular"]);
    const iTalla  = idx(["talla", "size"]);
    const iEmail  = idx(["email", "correo", "mail"]);
    if (iTel === -1) { toast.error("El CSV necesita una columna 'telefono'"); return; }
    let added = 0, dupes = 0;
    const nuevos = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.trim().replace(/^['"]+|['"]+$/g, ""));
      const tel  = cols[iTel] || "";
      if (!tel) continue;
      const telNorm = tel.replace(/\D/g, "");
      if (voluntarios.find(v => (v.telefono || "").replace(/\D/g, "") === telNorm) || nuevos.find(v => (v.telefono || "").replace(/\D/g, "") === telNorm)) { dupes++; continue; }
      const pinHash = hashPinLocal(pinInicialLocal(tel));
      nuevos.push({ id: Date.now() + i, nombre: iNombre >= 0 ? cols[iNombre] : "", apellidos: iApel >= 0 ? cols[iApel] : "", telefono: tel, email: iEmail >= 0 ? cols[iEmail] : "", talla: iTalla >= 0 ? cols[iTalla].toUpperCase() : "", estado: "pendiente", camisetaEntregada: false, enPuesto: false, horaLlegada: null, sessionToken: null, pinHash, fechaRegistro: new Date().toISOString().split("T")[0], origenImportacion: "csv" });
      added++;
    }
    if (nuevos.length > 0) { setVoluntarios(prev => [...prev, ...nuevos], { force: true }); dataService.notify("voluntarios"); }
    toast.success(`Importados: ${added} voluntario${added !== 1 ? "s" : ""}${dupes > 0 ? ` · ${dupes} duplicado${dupes !== 1 ? "s" : ""} omitido${dupes !== 1 ? "s" : ""}` : ""}`);
  };

  const registrarHistorial = (volActual, cambios) => {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    const hora  = ahora.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const descripcion = [];
    if (cambios.estado !== undefined && cambios.estado !== volActual.estado) descripcion.push(`Estado: ${volActual.estado} → ${cambios.estado}`);
    if (cambios.puestoId !== undefined && cambios.puestoId !== volActual.puestoId) descripcion.push("Puesto reasignado");
    if (cambios.camisetaEntregada !== undefined && cambios.camisetaEntregada !== volActual.camisetaEntregada) descripcion.push(cambios.camisetaEntregada ? "Camiseta entregada" : "Camiseta: pendiente");
    if (cambios.mensajeOrganizador !== undefined) descripcion.push("Mensaje del organizador actualizado");
    if (cambios.enPuesto !== undefined && cambios.enPuesto) descripcion.push(`En puesto${cambios.horaLlegada ? " a las " + cambios.horaLlegada : ""}`);
    if (!descripcion.length) return volActual.historial || [];
    return [{ fecha, hora, texto: descripcion.join(" · ") }, ...(Array.isArray(volActual.historial) ? volActual.historial : [])].slice(0, 50);
  };

  const updateVoluntario = (id, data) => {
    setVoluntarios(prev => prev.map(v => v.id !== id ? v : { ...v, ...data, historial: registrarHistorial(v, data) }));
    if      (data.estado === "confirmado") toast.success("Voluntario confirmado ✓");
    else if (data.estado === "cancelado")  toast.warning("Voluntario cancelado");
    else if (!Object.prototype.hasOwnProperty.call(data, "estado")) toast.success("Voluntario actualizado");
    dataService.notify("voluntarios");
  };

  const bulkUpdateVoluntarios = (ids, data) => {
    setVoluntarios(prev => prev.map(v => ids.includes(v.id) ? { ...v, ...data } : v));
    if      (data.estado === "confirmado") toast.success(`${ids.length} voluntarios confirmados ✓`);
    else if (data.estado === "cancelado")  toast.warning(`${ids.length} voluntarios cancelados`);
    else if (data.estado === "pendiente")  toast.info(`${ids.length} voluntarios movidos a pendiente`);
    dataService.notify("voluntarios");
  };

  // Intercambia los puestos de dos voluntarios en una sola operación atómica
  const intercambiarVoluntarios = (idA, idB) => {
    setVoluntarios(prev => {
      const volA = prev.find(v => v.id === idA);
      const volB = prev.find(v => v.id === idB);
      if (!volA || !volB) return prev;
      const puestoA = volA.puestoId ?? null;
      const puestoB = volB.puestoId ?? null;
      return prev.map(v => {
        if (v.id === idA) return { ...v, puestoId: puestoB };
        if (v.id === idB) return { ...v, puestoId: puestoA };
        return v;
      });
    });
    toast.success("Voluntarios intercambiados ↔");
    dataService.notify("voluntarios");
  };

  const updatePuesto = (id, data) => {
    // BUG-LOC-01: al editar un puesto, "_crearLoc" (➕ Crear nueva ubicación) se
    // ignoraba por completo — solo addPuesto lo gestionaba. Resultado: no se creaba
    // la ubicación Y además el puesto se quedaba sin localizacionId. Ahora ambas
    // funciones llaman al mismo helper puro (resolverNuevaLocParaPuesto) para que
    // no puedan volver a divergir.
    const { localizacionId: locId, nuevaLoc } = resolverNuevaLocParaPuesto(data, locs);
    if (nuevaLoc) {
      setLocs(prev => [...(Array.isArray(prev) ? prev : []), nuevaLoc]);
      dataService.notify("logistica");
    }
    const payload = { ...data, localizacionId: locId };
    delete payload._crearLoc;
    setPuestos(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p));
    if (payload.localizacionId && payload.lat != null && payload.lng != null) {
      setLocs(prev => prev.map(l => l.id === payload.localizacionId ? { ...l, lat: payload.lat, lng: payload.lng } : l));
      setPuestos(prev => prev.map(p => p.id !== id && p.localizacionId === payload.localizacionId ? { ...p, lat: payload.lat, lng: payload.lng } : p));
    }
    toast.success("Puesto actualizado");
    dataService.notify("voluntarios");
  };

  const addPuesto = (data) => {
    const { localizacionId: locId, nuevaLoc } = resolverNuevaLocParaPuesto(data, locs);
    if (nuevaLoc) {
      setLocs(prev => [...(Array.isArray(prev) ? prev : []), nuevaLoc]);
      dataService.notify("logistica");
    }
    const puestoFinal = { id: genIdNum(puestos), ...data, localizacionId: locId };
    delete puestoFinal._crearLoc;
    setPuestos(prev => [...prev, puestoFinal]);
    if (locId && data.lat != null && data.lng != null) {
      setLocs(prev => prev.map(l => l.id === locId ? { ...l, lat: data.lat, lng: data.lng } : l));
    }
    toast.success("Puesto creado");
    dataService.notify("voluntarios");
  };

  const deletePuesto = (id) => {
    setPuestos(prev => prev.filter(p => p.id !== id));
    setVoluntarios(prev => prev.map(v => v.puestoId === id ? { ...v, puestoId: null } : v));
    toast.success("Puesto eliminado");
    dataService.notify("voluntarios");
  };

  // ── Filtros ───────────────────────────────────────────────────────────────
  const volsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return voluntarios.filter(v => {
      if (q) {
        const nombreComp    = ((v.nombre || "") + " " + (v.apellidos || "")).toLowerCase();
        const apellNomb     = ((v.apellidos || "") + " " + (v.nombre || "")).toLowerCase();
        const tel           = (v.telefono || "").replace(/\s/g, "");
        const email         = (v.email || "").toLowerCase();
        const puestoNombre  = (puestos.find(p => p.id === v.puestoId)?.nombre || "").toLowerCase();
        const notas         = (v.notas || "").toLowerCase();
        const match = nombreComp.includes(q) || apellNomb.includes(q) || tel.includes(q.replace(/\s/g, "")) || email.includes(q) || puestoNombre.includes(q) || notas.includes(q);
        if (!match) return false;
      }
      const matchEstado   = filtroEstado === "todos" ? true : filtroEstado === "en-puesto" ? Boolean(v.enPuesto) : v.estado === filtroEstado;
      const matchPuesto   = filtroPuesto === "todos" || String(v.puestoId) === filtroPuesto
        || (filtroPuesto === "sin-asignar" && !v.puestoId)
        || (filtroPuesto === "asignado" && Boolean(v.puestoId));
      const matchTalla    = filtroTallas.length === 0 || filtroTallas.includes(v.talla || "");
      const matchCoche    = filtroCoche === "todos" || (filtroCoche === "si" ? Boolean(v.coche) : !v.coche);
      const matchDist     = filtroDistancias.length === 0 || (() => { const p = puestos.find(p => String(p.id) === String(v.puestoId)); return p ? (p.distancias || []).some(d => filtroDistancias.includes(d)) : false; })();
      const matchTipoPues = filtroTipoPuesto.length === 0 || (() => { const p = puestos.find(p => String(p.id) === String(v.puestoId)); return p ? filtroTipoPuesto.includes(p.tipo || "") : false; })();
      return matchEstado && matchPuesto && matchTalla && matchCoche && matchDist && matchTipoPues;
    });
  }, [voluntarios, puestos, busqueda, filtroEstado, filtroPuesto, filtroTallas, filtroCoche, filtroDistancias, filtroTipoPuesto]);

  return {
    config, puestos, voluntarios, isLoading,
    locs, rutas, matPorLoc, matPorPuesto, matPorVoluntario,
    tab, setTab,
    saveStatus, isExportingExcel, setIsExportingExcel,
    busqueda, setBusqueda,
    filtroEstado, setFiltroEstado,
    filtroPuesto, setFiltroPuesto,
    filtroTallas, setFiltroTallas,
    filtroCoche, setFiltroCoche,
    filtroDistancias, setFiltroDistancias,
    filtroTipoPuesto, setFiltroTipoPuesto,
    modalVol, setModalVol,
    modalPuesto, setModalPuesto,
    modalMensaje, setModalMensaje,
    confirmDelete, setConfirmDelete,
    confirmDeletePuesto, setConfirmDeletePuesto,
    pendingDeleteRef,
    stats, sugerenciasReubicacion, puestosConStats, volsFiltrados,
    guardar, addVoluntario, importarCSV,
    updateVoluntario, bulkUpdateVoluntarios, intercambiarVoluntarios,
    updatePuesto, addPuesto, deletePuesto,
    ejecutarEliminacion,
    setVoluntarios, setPuestos,
  };
}
