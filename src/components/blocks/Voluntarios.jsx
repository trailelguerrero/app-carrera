import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  SK_VOL_ROOT, SK_VOL_PUESTOS, SK_VOL_VOLUNTARIOS,
  SK_LOG_MAT, SK_LOG_ASIG, SK_LOG_RUT,
} from "@/constants/storageKeys";
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK } from "@/constants/camisetasConstants";
import { createPortal } from "react-dom";
import { exportarVoluntarios } from "@/lib/exportUtils";
import { toast } from "@/lib/toast";
import { genIdNum, scrollMainToTop } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/hooks/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { getEventDate } from "@/lib/eventUtils";
import { LOCS_DEFAULT, LOCS_KEY } from "@/constants/localizaciones";
import { useData } from "@/hooks/useData";
import { ImagenUploader } from "@/components/common/ImagenUploader";
import { PanelCompartir } from "@/components/voluntarios/PanelCompartir";


// Sprint 2: sub-components extracted to src/components/voluntarios/
import { TabDashboard } from "@/components/voluntarios/TabDashboardVol";
import { TabVoluntarios } from "@/components/voluntarios/TabVoluntariosList";
import { TabPuestos, PuestoCard } from "@/components/voluntarios/TabPuestosVol";
import { TabTallas } from "@/components/voluntarios/TabTallasVol";
import { TabDiaD } from "@/components/voluntarios/TabDiaDVol";
import { FichaVoluntario, MensajeOrganizadorEdit } from "@/components/voluntarios/FichaVoluntario";
import { FichaPuesto } from "@/components/voluntarios/FichaPuesto";
import { ModalVoluntario } from "@/components/voluntarios/ModalVoluntario";
import { ModalPuesto } from "@/components/voluntarios/ModalPuesto";
import { ModalConfirm } from "@/components/voluntarios/ModalConfirmar";
import { ModalMensaje } from "@/components/voluntarios/ModalMensaje";

import { blockCls as cls } from "@/lib/blockStyles";
import SkeletonBlock from "@/components/common/SkeletonBlock";
// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// SK_VOL_ROOT y demás claves importadas de @/constants/storageKeys

// ─── IMÁGENES CAMISETA (base64 placeholders — reemplazar con URLs reales) ──────
// Para producción: sustituir por URLs de tus imágenes reales


const PUESTOS_DEFAULT = [
  { id: 1, nombre: "Zona de Salida / Meta", tipo: "Salida/Meta", distancias: ["Todas"], horaInicio: "06:30", horaFin: "18:00", necesarios: 8, responsableId: null, notas: "Control de dorsales, gestión de salidas escalonadas" },
  { id: 2, nombre: "Avituallamiento KM 4", tipo: "Avituallamiento", distancias: ["TG7","TG13","TG25"], horaInicio: "07:30", horaFin: "14:00", necesarios: 4, responsableId: null, notas: "Agua, isotónico, fruta, barritas" },
  { id: 3, nombre: "Avituallamiento KM 9", tipo: "Avituallamiento", distancias: ["TG13","TG25"], horaInicio: "08:00", horaFin: "15:00", necesarios: 4, responsableId: null, notas: "Agua, isotónico, fruta, geles, sándwiches" },
  { id: 4, nombre: "Avituallamiento KM 16", tipo: "Avituallamiento", distancias: ["TG25"], horaInicio: "08:30", horaFin: "16:00", necesarios: 5, responsableId: null, notas: "Avituallamiento principal TG25 — comida caliente" },
  { id: 5, nombre: "Punto Control KM 7", tipo: "Control", distancias: ["TG13","TG25"], horaInicio: "08:00", horaFin: "13:00", necesarios: 2, responsableId: null, notas: "Registro de dorsales, corte de tiempos" },
  { id: 6, nombre: "Punto Control KM 13", tipo: "Control", distancias: ["TG25"], horaInicio: "09:00", horaFin: "15:00", necesarios: 2, responsableId: null, tiempoLimite: "14:00", notas: "Registro de dorsales, corte de tiempos. Corredores que lleguen después del tiempo límite deben ser retirados de la competición." },
  { id: 7, nombre: "Seguridad Vial Cruce 1", tipo: "Seguridad", distancias: ["Todas"], horaInicio: "07:00", horaFin: "14:00", necesarios: 2, responsableId: null, notas: "Control de tráfico en cruce principal" },
  { id: 8, nombre: "Seguridad Vial Cruce 2", tipo: "Seguridad", distancias: ["TG13","TG25"], horaInicio: "07:30", horaFin: "16:00", necesarios: 2, responsableId: null, notas: "Control de tráfico en cruce secundario" },
  { id: 9, nombre: "Señalización Ruta Alta", tipo: "Señalización", distancias: ["TG25"], horaInicio: "06:00", horaFin: "08:00", necesarios: 3, responsableId: null, notas: "Colocación de balizas tramo alto — madrugada" },
  { id: 10, nombre: "Parking y Accesos", tipo: "Parking", distancias: ["Todas"], horaInicio: "06:00", horaFin: "12:00", necesarios: 4, responsableId: null, notas: "Gestión de aparcamiento y acceso peatonal" },
  { id: 11, nombre: "Zona de Llegada / Trofeos", tipo: "Organización", distancias: ["Todas"], horaInicio: "09:00", horaFin: "18:00", necesarios: 5, responsableId: null, notas: "Recepción finishers, entrega medallas, clasificaciones" },
  { id: 12, nombre: "Primeros Auxilios Base", tipo: "Primeros Auxilios", distancias: ["Todas"], horaInicio: "06:30", horaFin: "18:00", necesarios: 3, responsableId: null, notas: "Titulación requerida: socorrismo o enfermería" },
];

const VOLUNTARIOS_DEFAULT = [
  { id: 1, nombre: "María García López", telefono: "612345678", email: "maria@trailelguerrero.es", talla: "S", puestoId: 1, rol: "responsable", estado: "confirmado", coche: true, notas: "Experiencia 3 ediciones anteriores", fechaRegistro: "2026-02-15" },
  { id: 2, nombre: "Carlos Martínez", telefono: "623456789", email: "carlos@trailelguerrero.es", talla: "L", puestoId: 2, rol: "apoyo", estado: "confirmado", coche: false, notas: "", fechaRegistro: "2026-02-20" },
  { id: 3, nombre: "Ana Rodríguez", telefono: "634567890", email: "ana@trailelguerrero.es", talla: "M", puestoId: 3, rol: "responsable", estado: "pendiente", coche: true, notas: "Habla inglés", fechaRegistro: "2026-03-01" },
];

// useData maneja la persistencia automáticamente

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// ── Helper: nombre completo ─────────────────────────────────────────────────
const nombreCompleto = (v) => v ? [v.nombre, v.apellidos].filter(Boolean).join(" ") : "—";

function estadoColor(e) {
  return e === "confirmado" ? "var(--green)" : e === "cancelado" ? "var(--red)" : e === "ausente" ? "var(--orange)" : "var(--amber)";
}
function estadoBg(e) {
  return e === "confirmado" ? "var(--green-dim)" : e === "cancelado" ? "var(--red-dim)" : e === "ausente" ? "var(--orange-dim)" : "var(--amber-dim)";
}


// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [eventCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [vista, setVista] = useState("gestion"); // "gestion" | "formulario"
  const [tab, setTab] = useState("dashboard");
  const [rawPuestos, setPuestos, isLoadingPuestos] = useData(SK_VOL_PUESTOS, PUESTOS_DEFAULT);
  const puestos = Array.isArray(rawPuestos) ? rawPuestos : [];
  const [rawVoluntarios, setVoluntarios, isLoadingVols] = useData(SK_VOL_VOLUNTARIOS, VOLUNTARIOS_DEFAULT);
  const isLoading = isLoadingPuestos || isLoadingVols;
  const voluntarios = useMemo(() => {
    const raw = Array.isArray(rawVoluntarios) ? rawVoluntarios : [];
    return raw.map(v => {
      let out = { ...v };
      // Migrar campo legado contactoEmergencia -> telefonoEmergencia
      if (out.contactoEmergencia && !out.telefonoEmergencia) {
        out = { ...out, telefonoEmergencia: out.contactoEmergencia };
      }
      // CORE-10: migrar nombre completo concatenado -> nombre + apellidos separados
      // Solo actua si apellidos esta vacio/undefined y nombre contiene un espacio
      // Usa lastIndexOf para manejar nombres compuestos ibéricos: "María José García"
      // → nombre="María José", apellidos="García" (en lugar de partir por el primer espacio)
      if (!out.apellidos && out.nombre && out.nombre.trim().includes(" ")) {
        const spaceIdx = out.nombre.trim().lastIndexOf(" ");
        out = {
          ...out,
          nombre:    out.nombre.trim().slice(0, spaceIdx),
          apellidos: out.nombre.trim().slice(spaceIdx + 1),
        };
      }
      return out;
    });
  }, [rawVoluntarios]);
  const [locs] = useData(LOCS_KEY, LOCS_DEFAULT);
  // Material asignado a localizaciones (solo lectura, para mostrar en ficha de puesto)
  const [rawMat]  = useData(SK_LOG_MAT,  []);
  const [rawAsig] = useData(SK_LOG_ASIG, []);
  const [rawRutas] = useData(SK_LOG_RUT, []);
  const rutas = Array.isArray(rawRutas) ? rawRutas : [];
  const matPorLoc = useMemo(() => {
    const mat   = Array.isArray(rawMat)  ? rawMat  : [];
    const asigs = Array.isArray(rawAsig) ? rawAsig : [];
    const lcsArr = Array.isArray(locs)   ? locs    : [];
    // Construir dos mapas: por localizacionId (ID robusto) y por nombre (fallback)
    const mapById = {};   // localizacionId → [{nombre, cantidad, unidad}]
    const mapByName = {}; // locNombre      → [{nombre, cantidad, unidad}]
    asigs.forEach(a => {
      const item = mat.find(m => m.id === a.materialId);
      if (!item) return;
      const entry = { nombre: item.nombre, cantidad: a.cantidad, unidad: item.unidad || "ud" };
      if (a.localizacionId) {
        if (!mapById[a.localizacionId]) mapById[a.localizacionId] = [];
        mapById[a.localizacionId].push(entry);
      }
      if (a.puesto) {
        if (!mapByName[a.puesto]) mapByName[a.puesto] = [];
        mapByName[a.puesto].push(entry);
      }
    });
    // Devolver mapa por nombre para compatibilidad con el código existente,
    // enriquecido con los datos por ID (si el puesto tiene localizacionId)
    const map = { ...mapByName };
    lcsArr.forEach(loc => {
      if (mapById[loc.id]) {
        // Fusionar sin duplicados por nombre
        const existentes = map[loc.nombre] || [];
        const nuevos = mapById[loc.id].filter(n => !existentes.some(e => e.nombre === n.nombre));
        map[loc.nombre] = [...existentes, ...nuevos];
      }
    });
    return map;
  }, [rawMat, rawAsig, locs]);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroPuesto, setFiltroPuesto] = useState("todos");
  const [modalVol, setModalVol] = useState(null); // null | "nuevo" | voluntario
  const [modalPuesto, setModalPuesto] = useState(null);
  const [modalMensaje, setModalMensaje] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeletePuesto, setConfirmDeletePuesto] = useState(null);
  // Ref para capturar el ID a eliminar antes de cualquier setState — solución definitiva al bug de eliminación
  const pendingDeleteRef = useRef(null);

  const ejecutarEliminacion = useCallback((id) => {
    if (id === null || id === undefined) return;
    const sid = String(id);
    // Usar prev para obtener el estado más reciente + force:true para saltarse hasChanged
    setVoluntarios(
      prev => Array.isArray(prev) ? prev.filter(v => String(v.id) !== sid) : prev,
      { force: true }
    );
    setConfirmDelete(null);
    pendingDeleteRef.current = null;
    toast.success('Voluntario eliminado');
  }, [setVoluntarios]);
  const [ficha, setFicha] = useState(null); // {tipo:'vol'|'puesto', data}
  const abrirFicha = (tipo, data) => { scrollMainToTop(); setFicha({ tipo, data }); };

  // ── Métricas ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const vols = voluntarios || [];
    const pts = puestos || [];
    const total = vols.length;
    const confirmados = vols.filter(v => v?.estado === "confirmado").length;
    const pendientes = vols.filter(v => v?.estado === "pendiente").length;
    const cancelados = vols.filter(v => v?.estado === "cancelado").length;
    const totalNecesarios = pts.reduce((s, p) => s + (p?.necesarios || 0), 0);
    const asignados = vols.filter(v => v?.puestoId).length;
    const conCoche = vols.filter(v => v?.coche).length;
    const tallasCount = TALLAS.reduce((acc, t) => {
      acc[t] = vols.filter(v => v?.talla === t && v?.estado !== "cancelado").length;
      return acc;
    }, {});
    const coberturaGlobal = totalNecesarios > 0 ? Math.round((confirmados / totalNecesarios) * 100) : 0;
    const enPuesto = vols.filter(v => v?.enPuesto).length;
    return { total, confirmados, pendientes, cancelados, totalNecesarios, asignados, conCoche, tallasCount, coberturaGlobal, enPuesto };
  }, [voluntarios, puestos]);

  // Sugerencias de reubicación automáticas
  const sugerenciasReubicacion = useMemo(() => {
    const stats = (puestos || []).map(p => {
      const asig = (voluntarios || []).filter(v => v.puestoId === p.id && v.estado !== "cancelado");
      const conf = asig.filter(v => v.estado === "confirmado");
      return {
        ...p,
        exceso:  Math.max(0, conf.length - p.necesarios),
        deficit: Math.max(0, p.necesarios - conf.length),
        confirmados: conf,
      };
    });
    const conExceso  = stats.filter(s => s.exceso > 0).sort((a, b) => b.exceso - a.exceso);
    const conDeficit = stats.filter(s => s.deficit > 0).sort((a, b) => b.deficit - a.deficit);
    const sug = [];
    for (const destino of conDeficit) {
      for (const origen of conExceso) {
        if (sug.length >= 5) break;
        const movibles = Math.min(origen.exceso, destino.deficit);
        if (movibles > 0) {
          const candidatos = origen.confirmados
            // FORMULA-03: responsableId siempre es null (no implementado en ModalPuesto).
            // Usamos v.rol !== "responsable" como proxy null-safe para excluir al responsable
            // del puesto de las sugerencias de reubicacion.
            .filter(v => v.rol !== "responsable")
            .slice(0, movibles);
          if (candidatos.length > 0) {
            sug.push({
              desde:      origen.nombre,
              desdeId:    origen.id,
              hasta:      destino.nombre,
              hastaId:    destino.id,
              candidatos: candidatos.map(v => ({ id: v.id, nombre: v.nombre })),
              n:          candidatos.length,
            });
          }
        }
      }
    }
    return sug;
  }, [puestos, voluntarios]);

  const puestosConStats = useMemo(() => (puestos || []).map(p => {
    const vols = (voluntarios || []).filter(v => v?.puestoId === p?.id && v?.estado !== "cancelado" && v?.estado !== "ausente");
    const confirmados = vols.filter(v => v?.estado === "confirmado").length;
    const cobertura = p?.necesarios > 0 ? Math.round((vols.length / p.necesarios) * 100) : 0;
    const coberturaConf = p?.necesarios > 0 ? Math.round((confirmados / p.necesarios) * 100) : 0;
    return { ...p, voluntariosAsignados: vols, totalAsignados: vols.length, confirmados, cobertura, coberturaConf };
  }), [puestos, voluntarios]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const guardar = () => {
    window.dispatchEvent(new CustomEvent("teg-sync"));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const hashPinLocal = (pin) => { let h=0; for(let i=0;i<pin.length;i++){h=(Math.imul(31,h)+pin.charCodeAt(i))|0;} return String(h); };
  const pinInicialLocal = (tel) => { const d=(tel||'').replace(/\D/g,''); return d.slice(-4)||'0000'; };

  const addVoluntario = (data) => {
    const telNorm = (data.telefono || '').replace(/\D/g, '');
    if (telNorm.length >= 9) {
      const dup = voluntarios.find(v => (v.telefono || '').replace(/\D/g, '') === telNorm);
      if (dup) {
        toast.error(`Ya existe un voluntario con ese teléfono: ${dup.nombre}`);
        return false;
      }
    }
    const pinHash = hashPinLocal(pinInicialLocal(data.telefono || ''));
    const nuevo = { id: genIdNum(voluntarios), camisetaEntregada: false, enPuesto: false, horaLlegada: null, sessionToken: null, pinHash, ...data };
    setVoluntarios(prev => [...prev, nuevo]);
    toast.success("Voluntario añadido");
    return true;
  };

  // Importación masiva desde CSV
  const importarCSV = async (file) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) { toast.error("Archivo vacío"); return; }
    // Detectar separador
    const sep = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g,''));
    const idx = (names) => names.map(n => headers.findIndex(h => h.includes(n))).find(i => i >= 0) ?? -1;
    const iNombre = idx(['nombre','name']);
    const iApel   = idx(['apellido','surname','last']);
    const iTel    = idx(['telefono','phone','tel','móvil','movil','celular']);
    const iTalla  = idx(['talla','size']);
    const iEmail  = idx(['email','correo','mail']);
    if (iTel === -1) { toast.error("El CSV necesita una columna 'telefono'"); return; }

    let added = 0, dupes = 0;
    const genId = () => genIdNum([...voluntarios, ...(new Array(added).fill(0).map((_,i) => ({id: Date.now()+i})))]);

    const nuevos = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.trim().replace(/^['"]+|['"]+$/g,''));
      const tel = cols[iTel] || '';
      if (!tel) continue;
      const telNorm = tel.replace(/\D/g,'');
      const dup = voluntarios.find(v => (v.telefono||'').replace(/\D/g,'') === telNorm) ||
                  nuevos.find(v => (v.telefono||'').replace(/\D/g,'') === telNorm);
      if (dup) { dupes++; continue; }
      const nombre = iNombre >= 0 ? cols[iNombre] : '';
      const apellidos = iApel >= 0 ? cols[iApel] : '';
      const talla = iTalla >= 0 ? cols[iTalla].toUpperCase() : '';
      const email = iEmail >= 0 ? cols[iEmail] : '';
      const pinHash = hashPinLocal(pinInicialLocal(tel));
      nuevos.push({
        id: Date.now() + i,
        nombre, apellidos, telefono: tel, email, talla,
        estado: 'pendiente', camisetaEntregada: false,
        enPuesto: false, horaLlegada: null, sessionToken: null,
        pinHash, fechaRegistro: new Date().toISOString().split('T')[0],
        origenImportacion: 'csv',
      });
      added++;
    }
    if (nuevos.length > 0) {
      setVoluntarios(prev => [...prev, ...nuevos], { force: true });
    }
    toast.success(`Importados: ${added} voluntario${added !== 1 ? "s" : ""}${dupes > 0 ? ` · ${dupes} duplicado${dupes !== 1 ? "s" : ""} omitido${dupes !== 1 ? "s" : ""}` : ""}`);
  };

  // Registrar entrada en el historial de cambios del voluntario
  const registrarHistorial = (volActual, cambios) => {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-ES", { day:"2-digit", month:"2-digit", year:"numeric" });
    const hora  = ahora.toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" });
    const descripcion = [];
    if (cambios.estado !== undefined && cambios.estado !== volActual.estado)
      descripcion.push(`Estado: ${volActual.estado} → ${cambios.estado}`);
    if (cambios.puestoId !== undefined && cambios.puestoId !== volActual.puestoId)
      descripcion.push(`Puesto reasignado`);
    if (cambios.camisetaEntregada !== undefined && cambios.camisetaEntregada !== volActual.camisetaEntregada)
      descripcion.push(cambios.camisetaEntregada ? "Camiseta entregada" : "Camiseta: pendiente");
    if (cambios.mensajeOrganizador !== undefined)
      descripcion.push("Mensaje del organizador actualizado");
    if (cambios.enPuesto !== undefined && cambios.enPuesto)
      descripcion.push(`En puesto${cambios.horaLlegada ? " a las "+cambios.horaLlegada : ""}`);
    if (!descripcion.length) return volActual.historial || [];
    const entrada = { fecha, hora, texto: descripcion.join(" · ") };
    const histPrev = Array.isArray(volActual.historial) ? volActual.historial : [];
    return [entrada, ...histPrev].slice(0, 50); // máximo 50 entradas
  };

  const updateVoluntario = (id, data) => {
    setVoluntarios(prev => prev.map(v => {
      if (v.id !== id) return v;
      const historial = registrarHistorial(v, data);
      return { ...v, ...data, historial };
    }));
    if(data.estado==="confirmado") toast.success("Voluntario confirmado ✓");
    else if(data.estado==="cancelado") toast.warning("Voluntario cancelado");
    else if(!Object.prototype.hasOwnProperty.call(data, "estado")) toast.success("Voluntario actualizado");
  };
  const bulkUpdateVoluntarios = (ids, data) => {
    setVoluntarios(prev => prev.map(v => ids.includes(v.id) ? { ...v, ...data } : v));
    if (data.estado === "confirmado") toast.success(`${ids.length} voluntarios confirmados ✓`);
    else if (data.estado === "cancelado") toast.warning(`${ids.length} voluntarios cancelados`);
    else if (data.estado === "pendiente") toast.info(`${ids.length} voluntarios movidos a pendiente`);
  };
  const updatePuesto = (id, data) => { setPuestos(prev => prev.map(p => p.id === id ? { ...p, ...data } : p)); toast.success("Puesto actualizado"); };
  const addPuesto = (data) => { setPuestos(prev => [...prev, { id: genIdNum(puestos), ...data }]); toast.success("Puesto creado"); };
  const deletePuesto = (id) => { setPuestos(prev => prev.filter(p => p.id !== id)); setVoluntarios(prev => prev.map(v => v.puestoId === id ? { ...v, puestoId: null } : v)); toast.success("Puesto eliminado"); };

  const volsFiltrados = useMemo(() => voluntarios.filter(v => {
    const nombreCompleto = (v.nombre + " " + (v.apellidos||"")).toLowerCase();
    const matchBusqueda = !busqueda || nombreCompleto.includes(busqueda.toLowerCase()) || (v.telefono||"").includes(busqueda);
    const matchEstado = filtroEstado === "todos"
      ? true
      : filtroEstado === "en-puesto"
        ? Boolean(v.enPuesto)
        : v.estado === filtroEstado;
    const matchPuesto = filtroPuesto === "todos" || String(v.puestoId) === filtroPuesto || (filtroPuesto === "sin-asignar" && !v.puestoId);
    return matchBusqueda && matchEstado && matchPuesto;
  }), [voluntarios, busqueda, filtroEstado, filtroPuesto]);

  // ── Formulario público ────────────────────────────────────────────────────
  if (isLoading) return <SkeletonBlock variant="voluntarios" />;

  if (vista === "formulario") return (
    <AppShell>
      <FormularioPublico
        onVolver={() => setVista("gestion")}
        puestos={puestos}
        config={config}
        voluntarios={voluntarios}
        onRegistrar={(data) => { addVoluntario(data); setVista("gestion"); setTab("voluntarios"); }}
      />
    </AppShell>
  );

  // Días hasta el evento — para reordenar tabs en semana de carrera
  const diasHastaEvento = Math.ceil((getEventDate(config) - new Date()) / 86400000);
  const esSemanaCarrera = diasHastaEvento >= 0 && diasHastaEvento <= 7;

  const TABS_BASE = [
    { id: "dashboard",  icon: "📊", label: "Dashboard" },
    { id: "voluntarios",icon: "👥", label: "Voluntarios", badge: stats.total },
    { id: "puestos",    icon: "📍", label: "Puestos",     badge: puestos.length },
    { id: "dia-d",      icon: "🏁", label: esSemanaCarrera ? "🚨 Día de Carrera" : "Día de Carrera",
      badge: stats.enPuesto > 0 ? stats.enPuesto : undefined, badgeColor: "badge-green" },
  ];
  // En semana de carrera, Día de Carrera sube a primera posición
  const TABS_VOL = esSemanaCarrera
    ? [TABS_BASE[3], ...TABS_BASE.slice(0, 3)]
    : TABS_BASE;

  return (
    <AppShell>
      <div className="block-container">

        {/* HEADER */}
        <div className="block-header">
          <div>
            <div style={{display:"flex",alignItems:"center",gap:".65rem",flexWrap:"wrap",marginBottom:".15rem"}}>
              <h1 className="block-title" style={{margin:0}}>👥 Voluntarios</h1>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"proyecto"}}))}
                style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".15rem .45rem",
                  borderRadius:4,border:"1px solid rgba(34,211,238,.3)",
                  background:"rgba(34,211,238,.1)",color:"var(--cyan)",cursor:"pointer"}}>
                📋 Ver en Proyecto →
              </button>
            </div>
            <div className="block-title-sub">
              Módulo de gestión · Trail El Guerrero 2026
              {esSemanaCarrera && <span style={{marginLeft:"0.5rem",color:"var(--red)",fontWeight:700}}>⚡ SEMANA DE CARRERA</span>}
            </div>
          </div>
          <div className="block-actions">
            <span className={`badge ${stats.coberturaGlobal>=80?"badge-green":stats.coberturaGlobal>=50?"badge-amber":"badge-red"}`}>
              🎯 {stats.coberturaGlobal}% cobertura
            </span>
            <button className="btn btn-primary" onClick={() => setModalVol("nuevo")}>+ Voluntario</button>
            <button className="btn btn-ghost btn-sm"
              onClick={() => setModalMensaje(true)}
              title="Generar mensaje de instrucciones para voluntarios">
              📨 Instrucciones
            </button>
            <button className="btn btn-ghost btn-sm"
              onClick={() => exportarVoluntarios(voluntarios, puestos)}
              title="Exportar lista de voluntarios a Excel">
              📊 Excel
            </button>
            <label className="btn btn-ghost btn-sm"
              title="Importar voluntarios desde un archivo CSV (columnas: nombre, apellidos, telefono, talla, email)"
              style={{ cursor:"pointer", margin:0 }}>
              📥 Importar CSV
              <input type="file" accept=".csv,.txt" style={{ display:"none" }}
                onChange={e => { if (e.target.files[0]) { importarCSV(e.target.files[0]); e.target.value = ''; } }} />
            </label>
            {/* Dropdown Compartir portal — consolida 3 acciones */}
            <PanelCompartir portalUrl={window.location.origin + "/voluntarios/mi-ficha"} />
          </div>
        </div>





        {/* OPCIONES FORMULARIO — ir a Configuración */}
        <div className="card mb" style={{ padding: "0.65rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            ⚙️ Configuración formulario público
          </span>
          <button
            className="btn btn-ghost btn-sm"
            title="Ir a Configuración → sección Formulario de voluntarios"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "configuracion" } }));
              // Scroll al ancla tras la navegación
              setTimeout(() => {
                const el = document.getElementById("cfg-formulario");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 300);
            }}>
            Configurar formulario →
          </button>
        </div>


        {/* Buscador global — siempre visible */}
        <div style={{ marginBottom:".6rem", display:"flex", gap:".5rem", alignItems:"center" }}>
          <div style={{ position:"relative", flex:1, maxWidth:380 }}>
            <span style={{ position:"absolute", left:".7rem", top:"50%", transform:"translateY(-50%)",
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-base)", color:"var(--text-dim)",
              pointerEvents:"none" }}>🔍</span>
            <input className="inp" value={busqueda}
              onChange={e => { setBusqueda(e.target.value); if (tab !== "voluntarios") setTab("voluntarios"); }}
              placeholder="Buscar voluntario por nombre o teléfono…"
              style={{ paddingLeft:"2.2rem", fontSize:"var(--fs-base)" }} />
          </div>
          {busqueda && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => setBusqueda("")}
              style={{ color:"var(--text-muted)", flexShrink:0 }}>✕ Limpiar</button>
          )}
        </div>
        {/* TABS */}
        <div className="tabs">
          {TABS_VOL.map(item => (
            <button key={item.id} className={cls("tab-btn", tab===item.id && "active")} onClick={() => setTab(item.id)}>
              {item.icon} {item.label}
              {item.badge !== undefined && (
                <span className={`badge ${item.badgeColor || "badge-cyan"}`} style={{marginLeft:"0.3rem"}}>{item.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div key={tab}>
          {tab==="dashboard" && <TabDashboard stats={stats} puestosConStats={puestosConStats} voluntarios={voluntarios} setTab={setTab} onEditarVol={(v) => abrirFicha("vol", v)} onEditarPuesto={(p) => abrirFicha("puesto", p)} sugerenciasReubicacion={sugerenciasReubicacion} onReasignar={(volId, puestoId) => updateVoluntario(volId, { puestoId })} />}
          {tab==="voluntarios" && (
            <TabVoluntarios
              voluntarios={volsFiltrados} todosVols={voluntarios} puestos={puestos}
              busqueda={busqueda} setBusqueda={setBusqueda}
              filtroEstado={filtroEstado} setFiltroEstado={setFiltroEstado}
              filtroPuesto={filtroPuesto} setFiltroPuesto={setFiltroPuesto}
              onUpdate={updateVoluntario} onBulkUpdate={bulkUpdateVoluntarios} onDelete={(id) => setConfirmDelete(id)}
              onNuevo={() => setModalVol("nuevo")} onEditar={(v) => setModalVol(v)}
              onFicha={(v) => abrirFicha("vol", v)}
            />
          )}
          {tab==="puestos" && (
            <TabPuestos
              puestosConStats={puestosConStats} voluntarios={voluntarios}
              locs={locs}
              onUpdatePuesto={updatePuesto} onDeletePuesto={(id) => setConfirmDeletePuesto(id)}
              onNuevoPuesto={() => setModalPuesto("nuevo")} onEditPuesto={(p) => setModalPuesto(p)}
              onEditarVol={(v) => setModalVol(v)}
              onFichaPuesto={(p) => abrirFicha("puesto", p)}
              onFichaVol={(v) => abrirFicha("vol", v)}
            />
          )}
          {tab==="dia-d"  && <TabDiaD puestosConStats={puestosConStats} voluntarios={voluntarios} onUpdateVol={updateVoluntario} diasHastaEvento={diasHastaEvento} />}
        </div>
      </div>

      {/* MODALES */}
      {ficha?.tipo==="vol" && createPortal(
        <FichaVoluntario
          voluntario={ficha.data} puestos={puestos}
          locs={locs} matPorLoc={matPorLoc}
          config={config}
          onClose={() => setFicha(null)}
          onEditar={() => { const m=document.querySelector("main");if(m)m.scrollTo({top:0,behavior:"instant"}); setFicha(null); setModalVol(ficha.data); }}
          onEliminar={() => {
            const id = ficha.data?.id;
            if (id === null || id === undefined) return;
            pendingDeleteRef.current = id;
            setFicha(null);
            setTimeout(() => setConfirmDelete(id), 30);
          }}
          onEliminarConfirmado={() => {
            const id = ficha.data?.id ?? pendingDeleteRef.current;
            if (id === null || id === undefined) return;
            pendingDeleteRef.current = id;
            setFicha(null);
            setTimeout(() => ejecutarEliminacion(id), 0);
          }}
          onUpdate={(data) => { updateVoluntario(ficha.data.id, data); setFicha(f => ({ ...f, data: { ...f.data, ...data } })); }}
        />
      , document.body)}
      {ficha?.tipo==="puesto" && createPortal(
        <FichaPuesto
          puesto={ficha.data} voluntarios={voluntarios}
          locs={locs} matPorLoc={matPorLoc} rutas={rutas}
          onClose={() => setFicha(null)}
          onFichaVol={(v) => { setFicha(null); setTimeout(() => abrirFicha("vol", v), 50); }}
          onEditar={() => { const m=document.querySelector("main");if(m)m.scrollTo({top:0,behavior:"instant"}); setFicha(null); setModalPuesto(ficha.data); }}
          onEliminar={() => { setFicha(null); setConfirmDeletePuesto(ficha.data.id); }}
        />
      , document.body)}
      {modalVol && createPortal(
        <ModalVoluntario
          key={modalVol==="nuevo" ? "nuevo" : modalVol.id}
          voluntario={modalVol==="nuevo" ? null : modalVol}
          puestos={puestos}
          onSave={(data) => { if (modalVol==="nuevo") addVoluntario(data); else updateVoluntario(modalVol.id, data); setModalVol(null); }}
          onClose={() => setModalVol(null)}
          onEliminar={modalVol!=="nuevo" ? () => { const id = modalVol?.id; if (!id) return; setModalVol(null); setConfirmDelete(id); } : undefined}
        />
      , document.body)}
      {modalPuesto && createPortal(
        <ModalPuesto
          key={modalPuesto==="nuevo" ? "nuevo" : modalPuesto.id}
          puesto={modalPuesto==="nuevo" ? null : modalPuesto}
          locs={locs}
          onSave={(data) => { if (modalPuesto==="nuevo") addPuesto(data); else updatePuesto(modalPuesto.id, data); setModalPuesto(null); }}
          onClose={() => setModalPuesto(null)}
        />
      , document.body)}
      {confirmDelete && createPortal(<ModalConfirm zIndex={400} mensaje="¿Eliminar este voluntario? Esta acción no se puede deshacer." onConfirm={() => ejecutarEliminacion(confirmDelete)} onCancel={() => { setConfirmDelete(null); pendingDeleteRef.current = null; }} />, document.body)}
      {confirmDeletePuesto && createPortal(<ModalConfirm zIndex={400} mensaje="¿Eliminar este puesto? Los voluntarios asignados quedarán sin puesto." onConfirm={() => { deletePuesto(confirmDeletePuesto); setConfirmDeletePuesto(null); }} onCancel={() => setConfirmDeletePuesto(null)} />, document.body)}
      {modalMensaje && <ModalMensaje config={config} onClose={() => setModalMensaje(false)} />}
    </AppShell>
  );
}

// ─── APP SHELL (CSS + fonts) ──────────────────────────────────────────────────
function AppShell({ children }) {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: var(--bg);
          --surface: var(--bg);
          --surface2: #151e35;
          --surface3: #1a2540;
          --border: #263754;
          --border-light: #344d7a;
          --text: #e8eef8;
          --text-muted: #8a9dba;
          --text-dim: #7080a0;
          --cyan: #22d3ee;
          --cyan-dim: rgba(34,211,238,0.1);
          --violet: #a78bfa;
          --violet-dim: rgba(167,139,250,0.1);
          --green: #34d399;
          --green-dim: rgba(52,211,153,0.1);
          --amber: #fbbf24;
          --amber-dim: rgba(251,191,36,0.1);
          --red: #f87171;
          --red-dim: rgba(248,113,113,0.1);
          --orange: #fb923c;
          --font-display: 'Syne', sans-serif;
          --font-mono: 'DM Mono', 'Space Mono', monospace;
          --radius: 12px;
          --radius-sm: 8px;
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font-display); min-height: 100vh;
          background-image: radial-gradient(ellipse 80% 40% at 50% -5%, rgba(34,211,238,0.06) 0%, transparent 55%); }

        /* LAYOUT */
        .layout { display: flex; min-height: 100vh; }
        @media (max-width: 900px) {
          .layout { flex-direction: column; }
          .sidebar { width: 100% !important; height: auto !important; position: relative !important; top: 0 !important; border-right: none !important; border-bottom: 1px solid var(--border); padding-bottom: 1rem !important; }
          .sidebar-nav { display: flex !important; flex-direction: row !important; overflow-x: auto; padding: 0.5rem !important; gap: 0.5rem !important; }
          .nav-item { flex-shrink: 0; width: auto !important; margin-bottom: 0 !important; }
          .sidebar-logo, .sidebar-stats, .sidebar-actions { padding: 0.75rem !important; }
          .sidebar-stats { display: flex; flex-direction: row !important; gap: 0.75rem; overflow-x: auto; }
          .sidebar-stat { flex-shrink: 0; min-width: 100px; border-bottom: none !important; border-right: 1px solid rgba(30,45,80,0.4); padding-right: 0.75rem !important; }
        }

        /* SIDEBAR */
        .sidebar { width: 210px; min-height: 100vh; height: 100vh; position: sticky; top: 0;
          background: var(--surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; flex-shrink: 0; z-index: 10; }
        .sidebar-logo { padding: 1.25rem 1rem 1rem; border-bottom: 1px solid var(--border); }
        .logo-tag { font-family: var(--font-mono); font-size: 0.52rem; color: var(--cyan);
          letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 0.3rem; opacity: 0.8; }
        .logo-title { font-size: 1.25rem; font-weight: 800;
          background: linear-gradient(135deg, #fff 0%, var(--cyan) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; }
        .logo-sub { font-family: var(--font-mono); font-size: 0.58rem; color: var(--text-muted); margin-top: 0.25rem; }
        .sidebar-nav { flex: 1; padding: 0.6rem 0.4rem; display: flex; flex-direction: column; gap: 0.12rem; overflow-y: auto; }
        .nav-label { font-size: 0.52rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;
          color: var(--text-dim); padding: 0.5rem 0.6rem 0.25rem; font-family: var(--font-mono); }
        .nav-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.65rem;
          border-radius: var(--radius-sm); border: 1px solid transparent; cursor: pointer;
          background: none; color: var(--text-muted); font-family: var(--font-display);
          font-size: 0.76rem; font-weight: 600; text-align: left; width: 100%;
          transition: all 0.15s; position: relative; overflow: hidden; }
        .nav-item::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
          border-radius: 0 2px 2px 0; background: transparent; transition: background 0.15s; }
        .nav-item:hover { color: var(--text); background: var(--surface2); }
        .nav-item.active { color: var(--text); background: var(--surface2); border-color: var(--border-light); }
        .nav-item.active::before { background: var(--cyan); }
        .nav-icon { font-size: 0.85rem; width: 18px; text-align: center; flex-shrink: 0; }
        .nav-badge { margin-left: auto; font-size: 0.52rem; font-family: var(--font-mono);
          padding: 0.1rem 0.3rem; border-radius: 3px; font-weight: 700; }
        .nav-badge-cyan { background: var(--cyan-dim); color: var(--cyan); }
        .sidebar-stats { display: flex; flex-direction: column; gap: 0.3rem; padding: 0 0.6rem 0.25rem; }
        .sidebar-stat { display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; border-bottom: 1px solid rgba(30,45,80,0.4); }
        .sidebar-actions { padding: 0.75rem; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 0.4rem; }
        .btn-link-registro { width: 100%; padding: 0.5rem; background: var(--violet-dim); color: var(--violet);
          border: 1px solid rgba(167,139,250,0.25); border-radius: var(--radius-sm); font-family: var(--font-mono);
          font-size: 0.65rem; font-weight: 700; cursor: pointer; transition: all 0.15s; text-align: center; }
        .btn-link-registro:hover { background: rgba(167,139,250,0.18); transform: translateY(-1px); }
        .btn-action { display: flex; align-items: center; justify-content: center; gap: 0.35rem;
          font-family: var(--font-mono); font-size: 0.68rem; font-weight: 700; padding: 0.5rem;
          border-radius: var(--radius-sm); border: none; cursor: pointer; transition: all 0.15s; width: 100%; }
        .btn-save { background: var(--green-dim); color: var(--green); border: 1px solid rgba(52,211,153,0.25); }
        .btn-save:hover { background: rgba(52,211,153,0.2); }
        .btn-save.saved { background: rgba(52,211,153,0.2); }

        /* MAIN */
        .main { flex: 1; min-width: 0; padding: 1.5rem 1.25rem 4rem; overflow-x: hidden; }
        .tab-content { animation: fadeUp 0.2s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        /* PAGE HEADER */
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .page-title { font-size: 1.3rem; font-weight: 800; color: var(--text); }
        .page-desc { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-muted); margin-top: 0.25rem; }

        /* CARDS */
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
          padding: 1.1rem; margin-bottom: 0.85rem; transition: border-color 0.2s; }
        .card:hover { border-color: var(--border-light); }
        .card-title { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.4rem; color: var(--text-muted); }

        /* KPI GRID */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.65rem; margin-bottom: 1.1rem; }
        .kpi { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
          padding: 0.9rem 1rem; position: relative; overflow: hidden; transition: all 0.2s; cursor: default; }
        .kpi:hover { transform: translateY(-2px); border-color: var(--border-light); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
        .kpi::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
        .kpi.c-green::before { background: linear-gradient(90deg, var(--green), transparent); }
        .kpi.c-amber::before { background: linear-gradient(90deg, var(--amber), transparent); }
        .kpi.c-red::before { background: linear-gradient(90deg, var(--red), transparent); }
        .kpi.c-cyan::before { background: linear-gradient(90deg, var(--cyan), transparent); }
        .kpi.c-violet::before { background: linear-gradient(90deg, var(--violet), transparent); }
        .kpi-label { font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.35rem; font-family: var(--font-mono); }
        .kpi-value { font-size: 1.5rem; font-weight: 800; font-family: var(--font-mono); line-height: 1; }
        .kpi.c-green .kpi-value { color: var(--green); }
        .kpi.c-amber .kpi-value { color: var(--amber); }
        .kpi.c-red .kpi-value { color: var(--red); }
        .kpi.c-cyan .kpi-value { color: var(--cyan); }
        .kpi.c-violet .kpi-value { color: var(--violet); }
        .kpi-sub { font-size: 0.6rem; color: var(--text-muted); margin-top: 0.25rem; font-family: var(--font-mono); }

        .tbl td { padding: 0.5rem 0.6rem; border-bottom: 1px solid rgba(30,45,80,0.35); vertical-align: middle; }
        @media (max-width: 768px) {
          .tbl thead { display: none; }
          .tbl tr { display: block; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 0.75rem; padding: 0.75rem; }
          .tbl td { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(30,45,80,0.2); padding: 0.4rem 0; width: 100%; text-align: right; }
          .tbl td::before { content: attr(data-label); font-family: var(--font-mono); font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase; float: left; font-weight: 700; }
          .tbl td:last-child { border-bottom: none; margin-top: 0.5rem; justify-content: flex-end; }
        }
        .tbl tr:last-child td { border-bottom: none; }
        .tbl tr:hover td { background: rgba(34,211,238,0.02); }

        /* INPUTS */
        .inp { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm);
          color: var(--text); font-family: var(--font-display); font-size: 0.78rem; padding: 0.4rem 0.6rem;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s; width: 100%; }
        .inp:focus { border-color: var(--cyan); box-shadow: 0 0 0 2px rgba(34,211,238,0.08); }
        .inp-sm { padding: 0.28rem 0.4rem; font-size: 0.72rem; }
        .pub-input { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm);
          color: var(--text); font-family: var(--font-display); font-size: 0.85rem; padding: 0.55rem 0.75rem;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s; width: 100%; }
        .pub-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34,211,238,0.1); }

        /* BTNS */
        .btn { padding: 0.38rem 0.8rem; border: none; border-radius: var(--radius-sm);
          font-family: var(--font-display); font-size: 0.72rem; font-weight: 700;
          cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 0.3rem; }
        .btn:hover { transform: translateY(-1px); }
        .btn-cyan { background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(34,211,238,0.25); }
        .btn-cyan:hover { background: rgba(34,211,238,0.18); }
        .btn-green { background: var(--green-dim); color: var(--green); border: 1px solid rgba(52,211,153,0.25); }
        .btn-green:hover { background: rgba(52,211,153,0.18); }
        .btn-red { background: var(--red-dim); color: var(--red); border: 1px solid rgba(248,113,113,0.2); }
        .btn-amber { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(251,191,36,0.2); }
        .btn-ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
        .btn-ghost:hover { color: var(--text); border-color: var(--border-light); }

        /* BADGES */
        .badge { display: inline-block; padding: 0.12rem 0.4rem; border-radius: 4px;
          font-size: 0.6rem; font-weight: 700; font-family: var(--font-mono); text-transform: uppercase; }
        .badge-green { background: var(--green-dim); color: var(--green); }
        .badge-amber { background: var(--amber-dim); color: var(--amber); }
        .badge-red { background: var(--red-dim); color: var(--red); }
        .badge-cyan { background: var(--cyan-dim); color: var(--cyan); }
        .badge-violet { background: var(--violet-dim); color: var(--violet); }

        /* PROGRESS */
        .prog-bar { height: 5px; background: var(--surface3); border-radius: 3px; overflow: hidden; }
        .prog-fill { height: 100%; border-radius: 3px; transition: width 0.5s cubic-bezier(0.4,0,0.2,1); }

        /* CHECKBOX / TOGGLE */
        .toggle-pill { width: 42px; height: 22px; border-radius: 11px; border: none; cursor: pointer;
          position: relative; transition: background 0.2s; flex-shrink: 0; }
        .toggle-pill-dot { position: absolute; top: 3px; width: 16px; height: 16px; border-radius: 50%;
          background: #fff; transition: left 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }

        /* TALLAS GRID */
        .tallas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.5rem; }
        .talla-cell { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm);
          padding: 0.65rem 0.5rem; text-align: center; }

        /* CHECKLIST */
        .checklist-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem;
          border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface2);
          margin-bottom: 0.4rem; transition: all 0.15s; }
        .checklist-row.presente { border-color: rgba(52,211,153,0.3); background: rgba(52,211,153,0.05); }
        .checklist-row.ausente { border-color: rgba(248,113,113,0.25); background: var(--red-dim); }

        /* OVERFLOW */
        .overflow-x { overflow-x: auto; }
        .flex-between { display: flex; align-items: center; justify-content: space-between; }
        .flex-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .mono { font-family: var(--font-mono); }
        .text-muted { color: var(--text-muted); }
        .text-xs { font-size: 0.62rem; }
        .mb-1 { margin-bottom: 0.5rem; }
        .mb-2 { margin-bottom: 1rem; }

        /* SCROLLBAR */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: var(--surface); }
        ::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 2px; }
        @media(max-width:900px){.layout{grid-template-columns:1fr;display:flex;flex-direction:column}.sidebar{border-right:none;border-bottom:1px solid rgba(30,45,80,.4);position:relative;height:auto;padding-bottom:.5rem}.sidebar-nav{display:flex;overflow-x:auto;padding-bottom:.5rem}.nav-item{flex-shrink:0}}
      `}</style>
      {children}
    </>
  );
}

