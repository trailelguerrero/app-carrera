// Auto-extracted from Voluntarios.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK, GUIA_TALLAS } from "@/constants/camisetasConstants";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { blockCls as cls } from "@/lib/blockStyles";
import { ESTADOS, TIPOS_PUESTO, DISTANCIAS_PUESTO, estadoColor, estadoBg } from "@/constants/voluntariosConstants";
import { TabKanbanVol } from "@/components/voluntarios/TabKanbanVol";

// ─── TAB VOLUNTARIOS ──────────────────────────────────────────────────────────
function TabVoluntarios({
  voluntarios, todosVols, puestos,
  busqueda, setBusqueda,
  filtroEstado, setFiltroEstado,
  filtroPuesto, setFiltroPuesto,
  filtroTallas = [], setFiltroTallas,
  filtroCoche = "todos", setFiltroCoche,
  filtroDistancias = [], setFiltroDistancias,
  filtroTipoPuesto = [], setFiltroTipoPuesto,
  onUpdate, onBulkUpdate, onDelete, onNuevo, onEditar, onFicha,
}) {
  const [vistaKanban, setVistaKanban] = useState(false);
  const [filtrosAvanzadosAbiertos, setFiltrosAvanzadosAbiertos] = useState(true);
  const [seleccionados, setSeleccionados] = useState([]);
  const [modoSeleccion, setModoSeleccion] = useState(false);

  const toggleSeleccion = (id) => setSeleccionados(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
  const seleccionarTodos = () => setSeleccionados(voluntarios.map(v => v.id));
  const deseleccionarTodos = () => setSeleccionados([]);
  const salirModo = () => { setModoSeleccion(false); setSeleccionados([]); };
  const [orden, setOrden]           = useState("nombre");
  const [colapsados, setColapsados] = useState({});

  const toggleGrupo = (id) => setColapsados(prev => ({ ...prev, [id]: !prev[id] }));

  // js-index-maps: Map para el sort por puesto (evita n² .find() al ordenar)
  const puestosMapSort = useMemo(
    () => new Map(puestos.map(p => [p.id, p])),
    [puestos]
  );

  const volsOrdenados = useMemo(() => [...voluntarios].sort((a, b) => {
    if (orden === "nombre") return (a.nombre || "").localeCompare(b.nombre || "", "es");
    if (orden === "puesto") {
      const pa = puestosMapSort.get(a.puestoId)?.nombre || "zzz";
      const pb = puestosMapSort.get(b.puestoId)?.nombre || "zzz";
      return pa.localeCompare(pb, "es");
    }
    if (orden === "fecha") return (b.fechaRegistro || "").localeCompare(a.fechaRegistro || "");
    return 0;
  }), [voluntarios, orden, puestosMapSort]);

  // Expandir grupos automáticamente al cambiar filtros u orden — muestra resultados sin colapsar manualmente
  useEffect(() => {
    setColapsados({});
  }, [busqueda, filtroEstado, filtroPuesto, filtroTallas, filtroCoche, filtroDistancias, filtroTipoPuesto, orden]); // eslint-disable-line react-hooks/exhaustive-deps

  // Grupos para la vista agrupada por estado
  const GRUPOS_ESTADO = [
    { id:"confirmado", label:"Confirmados", color:"var(--green)",  bg:"rgba(52,211,153,.08)"  },
    { id:"pendiente",  label:"Pendientes",  color:"var(--amber)",  bg:"rgba(251,191,36,.08)"  },
    { id:"cancelado",  label:"Cancelados",  color:"var(--red)",    bg:"rgba(248,113,113,.06)" },
  ];

  // js-index-maps: Map O(1) en vez de .find() O(n) por cada row render
  const puestosMap = useMemo(
    () => new Map(puestos.map(p => [p.id, p])),
    [puestos]
  );

  // Tipos de puesto disponibles: predefinidos + personalizados existentes en los puestos actuales
  const tiposPuestoDisponibles = useMemo(() => {
    const tiposCustom = puestos
      .map(p => p.tipo)
      .filter(t => t && !TIPOS_PUESTO.includes(t));
    return [...TIPOS_PUESTO, ...new Set(tiposCustom)];
  }, [puestos]);

  // Puestos ordenados por nombre — usados en la vista agrupada "Por puesto"
  const puestosOrdenados = useMemo(
    () => [...puestos].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es")),
    [puestos]
  );

  // Paginación por grupo: cuántos items mostrar por cada grupo (estado o puesto+estado)
  const ITEMS_INICIALES = 20;
  const ITEMS_INCREMENTO = 20;
  const [visiblePorGrupo, setVisiblePorGrupo] = useState({});

  // Resetear visibilidad cuando cambian los filtros u orden
  useEffect(() => {
    setVisiblePorGrupo({});
  }, [busqueda, filtroEstado, filtroPuesto, filtroTallas, filtroCoche, filtroDistancias, filtroTipoPuesto, orden]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargarMasGrupo = useCallback((grupoId, total) => {
    setVisiblePorGrupo(prev => ({
      ...prev,
      [grupoId]: Math.min(prev[grupoId] + ITEMS_INCREMENTO, total),
    }));
  }, []);

  // Grupos a renderizar: por defecto, agrupados por estado.
  // Si orden === "puesto", se agrupa primero por puesto (alfabético, "Sin asignar" al final)
  // y dentro de cada puesto se sub-agrupa por estado (mismo render que el resto).
  const gruposARenderizar = useMemo(() => {
    if (orden !== "puesto") {
      return GRUPOS_ESTADO.map(grupo => ({
        clave: grupo.id,
        titulo: grupo.label,
        color: grupo.color,
        bg: grupo.bg,
        items: volsOrdenados.filter(v => v.estado === grupo.id),
        totalSinFiltrar: todosVols.filter(v => v.estado === grupo.id).length,
      }));
    }
    // Vista "Por puesto": una sección por puesto (alfabético) + "Sin asignar" al final.
    // Cada sección contiene sub-grupos por estado (confirmado/pendiente/cancelado).
    const porPuestoId = new Map();
    volsOrdenados.forEach(v => {
      const clave = v.puestoId ? String(v.puestoId) : "sin-asignar";
      if (!porPuestoId.has(clave)) porPuestoId.set(clave, []);
      porPuestoId.get(clave).push(v);
    });
    const secciones = puestosOrdenados
      .filter(p => porPuestoId.has(String(p.id)))
      .map(p => ({ id: String(p.id), nombre: p.nombre }));
    if (porPuestoId.has("sin-asignar")) {
      secciones.push({ id: "sin-asignar", nombre: "Sin asignar" });
    }
    return secciones.flatMap(seccion => {
      const volsSeccion = porPuestoId.get(seccion.id) || [];
      return GRUPOS_ESTADO.map(grupo => ({
        clave: `${seccion.id}::${grupo.id}`,
        titulo: `📍 ${seccion.nombre} — ${grupo.label}`,
        color: grupo.color,
        bg: grupo.bg,
        items: volsSeccion.filter(v => v.estado === grupo.id),
        totalSinFiltrar: todosVols.filter(v => {
          const claveV = v.puestoId ? String(v.puestoId) : "sin-asignar";
          return claveV === seccion.id && v.estado === grupo.id;
        }).length,
      }));
    });
  }, [orden, volsOrdenados, todosVols, puestosOrdenados]);

  const colapsarTodos = useCallback(() => {
    setColapsados(Object.fromEntries(gruposARenderizar.map(g => [g.clave, true])));
  }, [gruposARenderizar]);
  const descolapsarTodos = useCallback(() => {
    setColapsados(Object.fromEntries(gruposARenderizar.map(g => [g.clave, false])));
  }, [gruposARenderizar]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">👥 Voluntarios</div>
          <div className="page-desc">{todosVols.length} registrados · {voluntarios.length} mostrados · click para abrir ficha</div>
        </div>
        <div style={{ display:"flex", gap:".5rem" }}>
          {/* Toggle Lista / Kanban */}
          <div style={{
            display:"flex", border:"1px solid var(--border)",
            borderRadius:8, overflow:"hidden", flexShrink:0,
          }}>
            <button
              className={`btn btn-sm${!vistaKanban ? " btn-cyan" : " btn-ghost"}`}
              style={{ borderRadius:0, border:"none", padding:".3rem .65rem" }}
              title="Vista lista"
              onClick={() => setVistaKanban(false)}
            >☰ Lista</button>
            <button
              className={`btn btn-sm${vistaKanban ? " btn-cyan" : " btn-ghost"}`}
              style={{ borderRadius:0, border:"none", borderLeft:"1px solid var(--border)", padding:".3rem .65rem" }}
              title="Vista Kanban"
              onClick={() => setVistaKanban(true)}
            >⬛ Kanban</button>
          </div>
          <button className="btn btn-ghost" aria-label="Exportar lista de voluntarios"
            onClick={() => {
              const activos = todosVols.filter(v => v.estado !== "cancelado");
              const rows = [["Nombre","Teléfono","Email","Puesto","Talla","Rol","Estado","Tel.Emergencia","Vehículo","Notas","Alergias","Medicación","Mensaje voluntario"]];
              activos.forEach(v => {
                const puesto = puestos.find(p => p.id === v.puestoId);
                rows.push([
                  v.nombre||"", v.telefono||"", v.email||"",
                  puesto?.nombre||"Sin asignar", v.talla||"",
                  v.rol||"apoyo", v.estado||"pendiente",
                  v.telefonoEmergencia||v.contactoEmergencia||"",
                  v.coche?"Sí":"No", (v.notas||"").replace(/\n/g," "),
                  (v.alergias||"").replace(/\n/g," "),
                  (v.medicacion||"").replace(/\n/g," "),
                  (v.mensajeParaOrganizador||"").replace(/\n/g," ")
                ]);
              });
              const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
              const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "voluntarios_trail_el_guerrero.csv"; a.click();
              URL.revokeObjectURL(url);
            }}>
            📥 Exportar CSV
          </button>
          <button className={`btn btn-sm ${modoSeleccion ? "btn-cyan" : "btn-ghost"}`}
            onClick={() => modoSeleccion ? salirModo() : setModoSeleccion(true)}
            title="Selección masiva">
            {modoSeleccion ? `✕ Salir (${seleccionados.length})` : "☑ Seleccionar"}
          </button>
          <button className="btn btn-primary" onClick={onNuevo}>+ Nuevo voluntario</button>
        </div>
      </div>

      {/* Toolbar de acciones masivas */}
      {modoSeleccion && (
        <div style={{
          display:"flex", alignItems:"center", gap:".5rem", flexWrap:"wrap",
          padding:".65rem .85rem", background:"var(--cyan-dim)", borderRadius:8,
          border:"1px solid var(--cyan-border)", marginBottom:".65rem"
        }}>
          <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan)", fontWeight:700, flexShrink:0 }}>
            {seleccionados.length > 0 ? `${seleccionados.length} seleccionados` : "Haz click en filas para seleccionar"}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={seleccionarTodos}>Selec. todos ({voluntarios.length})</button>
          {seleccionados.length > 0 && (<>
            <div style={{ width:1, height:16, background:"var(--border)" }}/>
            <button className="btn btn-green btn-sm"
              onClick={() => { onBulkUpdate(seleccionados, { estado:"confirmado" }); salirModo(); }}>
              ✓ Confirmar
            </button>
            <button className="btn btn-ghost btn-sm"
              onClick={() => { onBulkUpdate(seleccionados, { estado:"pendiente" }); salirModo(); }}>
              ⏳ Pendiente
            </button>
            <button className="btn btn-red btn-sm"
              onClick={() => { onBulkUpdate(seleccionados, { estado:"cancelado" }); salirModo(); }}>
              ✕ Cancelar
            </button>
            <div style={{ width:1, height:16, background:"var(--border)" }}/>
            <button className="btn btn-ghost btn-sm"
              onClick={() => {
                // Exportar solo seleccionados
                const sels = todosVols.filter(v => seleccionados.includes(v.id));
                const rows = [["Nombre","Teléfono","Estado","Puesto","Talla"]];
                sels.forEach(v => {
                  const puesto = puestos.find(p => p.id === v.puestoId);
                  rows.push([v.nombre||"", v.telefono||"", v.estado||"", puesto?.nombre||"Sin asignar", v.talla||""]);
                });
                const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
                const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "seleccion_voluntarios.csv"; a.click();
                salirModo();
              }}>
              📊 Exportar CSV
            </button>
          </>)}
        </div>
      )}

      {/* Filtros + ordenación — Kinetik Ops quick-filter pills */}
      <div style={{ marginBottom:"0.85rem", display:"flex", flexDirection:"column", gap:"0.5rem" }}>
        {/* Búsqueda */}
        <input className="inp" placeholder="Buscar por nombre o teléfono…" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ maxWidth: 320, fontSize:"var(--fs-base)" }} />
        {/* Pills de estado */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"0.35rem", alignItems:"center" }}>
          {[
            { id:"todos",      label:"Todos",       count: todosVols.length,                                            color:"var(--text-muted)",  bg:"rgba(255,255,255,.08)" },
            { id:"confirmado", label:"Confirmados", count: todosVols.filter(v=>v.estado==="confirmado").length, color:"var(--green)",         bg:"rgba(52,211,153,.15)"  },
            { id:"pendiente",  label:"Pendientes",  count: todosVols.filter(v=>v.estado==="pendiente").length,  color:"var(--amber)",         bg:"rgba(251,191,36,.15)"  },
            { id:"cancelado",  label:"Cancelados",  count: todosVols.filter(v=>v.estado==="cancelado").length,  color:"var(--red)",           bg:"rgba(248,113,113,.15)" },
            { id:"en-puesto",  label:"En puesto",   count: todosVols.filter(v=>v.enPuesto).length,               color:"var(--green)",         bg:"rgba(52,211,153,.15)"  },
          ].filter(pill => pill.id !== "en-puesto" || pill.count > 0).map(({ id, label, count, color, bg }) => (
            <button key={id}
              className={`filter-pill${filtroEstado === id ? " active" : ""}`}
              onClick={() => setFiltroEstado(id)}>
              {label}
              <span style={{
                fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                color: filtroEstado === id ? color : "var(--text-dim)",
                background: filtroEstado === id ? bg : "transparent",
                borderRadius:10, padding:"0 .3rem", marginLeft:".15rem",
                minWidth:16, display:"inline-block", textAlign:"center",
                transition:"all .15s",
              }}>
                {count}
              </span>
            </button>
          ))}
          <div className="filter-pill-sep" />
          {/* Pills de puesto */}
          <button className={`filter-pill${filtroPuesto === "todos" ? " active" : ""}`}
            onClick={() => setFiltroPuesto("todos")}>Todos los puestos</button>
          <button className={`filter-pill${filtroPuesto === "asignado" ? " active" : ""}`}
            onClick={() => setFiltroPuesto("asignado")}>Asignados</button>
          <button className={`filter-pill${filtroPuesto === "sin-asignar" ? " active" : ""}`}
            onClick={() => setFiltroPuesto("sin-asignar")}>Sin asignar</button>
          <div className="filter-pill-sep" />
          {/* Ordenación / Vista agrupada */}
          <button className={`filter-pill${orden === "nombre" ? " active" : ""}`}
            onClick={() => setOrden("nombre")}>A–Z</button>
          <button className={`filter-pill${orden === "puesto" ? " active" : ""}`}
            onClick={() => setOrden("puesto")}>Por puesto</button>
          <button className={`filter-pill${orden === "fecha" ? " active" : ""}`}
            onClick={() => setOrden("fecha")}>Más recientes</button>
          {/* Botón filtros avanzados */}
          {(() => {
            const avanzadosActivos = filtroTallas.length > 0 || filtroCoche !== "todos" || filtroDistancias.length > 0 || filtroTipoPuesto.length > 0;
            return (
              <button
                className={`filter-pill${avanzadosActivos ? " active" : ""}`}
                onClick={() => setFiltrosAvanzadosAbiertos(v => !v)}
                style={avanzadosActivos ? { color:"var(--cyan)", borderColor:"rgba(34,211,238,.4)", background:"rgba(34,211,238,.1)" } : {}}
              >
                {filtrosAvanzadosAbiertos ? "▲" : "▼"} Filtros{avanzadosActivos ? ` (${filtroTallas.length + (filtroCoche !== "todos" ? 1 : 0) + filtroDistancias.length + filtroTipoPuesto.length})` : ""}
              </button>
            );
          })()}
          {(busqueda || filtroEstado !== "todos" || filtroPuesto !== "todos" || filtroTallas.length > 0 || filtroCoche !== "todos" || filtroDistancias.length > 0 || filtroTipoPuesto.length > 0) && (
            <button className="filter-pill"
              onClick={() => {
                setBusqueda(""); setFiltroEstado("todos"); setFiltroPuesto("todos");
                setFiltroTallas([]); setFiltroCoche("todos"); setFiltroDistancias([]); setFiltroTipoPuesto([]);
              }}
              style={{ color:"var(--red)", borderColor:"rgba(248,113,113,0.3)" }}>
              ✕ Limpiar todo
            </button>
          )}
          <div className="filter-pill-sep" />
          <button className="filter-pill" onClick={colapsarTodos} title="Colapsar todos los grupos">⊟ Colapsar</button>
          <button className="filter-pill" onClick={descolapsarTodos} title="Expandir todos los grupos">⊞ Expandir</button>
        </div>

        {/* ── Panel filtros avanzados ────────────────────────────────── */}
        {filtrosAvanzadosAbiertos && (
          <div style={{
            padding: ".75rem .85rem", borderRadius: 8,
            background: "var(--surface2)", border: "1px solid var(--border)",
            marginTop: ".35rem", display: "flex", flexDirection: "column", gap: ".6rem",
          }}>
            {/* Talla */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: ".65rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 700, minWidth: 80, paddingTop: ".2rem" }}>
                👕 Talla
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem" }}>
                {["XXS","XS","S","M","L","XL","XXL","3XL","4XL"].map(t => {
                  const active = filtroTallas.includes(t);
                  return (
                    <button key={t}
                      onClick={() => setFiltroTallas(prev => active ? prev.filter(x => x !== t) : [...prev, t])}
                      style={{
                        padding: ".2rem .55rem", borderRadius: 5, cursor: "pointer",
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                        border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`,
                        background: active ? "var(--cyan-dim)" : "var(--surface)",
                        color: active ? "var(--cyan)" : "var(--text-muted)",
                        transition: "all .12s",
                      }}>
                      {t}
                    </button>
                  );
                })}
                {filtroTallas.length > 0 && (
                  <button onClick={() => setFiltroTallas([])} style={{ padding: ".2rem .45rem", borderRadius: 5, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", border: "1px solid rgba(248,113,113,.3)", background: "transparent", color: "var(--red)" }}>✕</button>
                )}
              </div>
            </div>

            {/* Vehículo */}
            <div style={{ display: "flex", alignItems: "center", gap: ".65rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 700, minWidth: 80 }}>
                🚗 Vehículo
              </span>
              <div style={{ display: "flex", gap: ".3rem", flexWrap: "wrap" }}>
                {[
                  ["todos",  "Todos",        todosVols.length],
                  ["si",     "Con vehículo", todosVols.filter(v => v.coche).length],
                  ["no",     "Sin vehículo", todosVols.filter(v => !v.coche).length],
                ].map(([v, lbl, count]) => {
                  const active = filtroCoche === v;
                  return (
                    <button key={v} onClick={() => setFiltroCoche(v)}
                      style={{
                        padding: ".2rem .55rem", borderRadius: 5, cursor: "pointer",
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                        border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`,
                        background: active ? "var(--cyan-dim)" : "var(--surface)",
                        color: active ? "var(--cyan)" : "var(--text-muted)",
                        transition: "all .12s",
                        display: "flex", alignItems: "center", gap: ".3rem",
                      }}>
                      {lbl}
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                        color: active ? "var(--cyan)" : "var(--text-dim)",
                        background: active ? "rgba(34,211,238,.15)" : "transparent",
                        borderRadius: 10, padding: "0 .3rem",
                        minWidth: 16, display: "inline-block", textAlign: "center",
                        transition: "all .15s",
                      }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Distancia */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: ".65rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 700, minWidth: 80, paddingTop: ".2rem" }}>
                🏃 Distancia
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem" }}>
                {DISTANCIAS_PUESTO.map(d => {
                  const active = filtroDistancias.includes(d);
                  return (
                    <button key={d}
                      onClick={() => setFiltroDistancias(prev => active ? prev.filter(x => x !== d) : [...prev, d])}
                      style={{
                        padding: ".2rem .55rem", borderRadius: 5, cursor: "pointer",
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                        border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`,
                        background: active ? "var(--cyan-dim)" : "var(--surface)",
                        color: active ? "var(--cyan)" : "var(--text-muted)",
                        transition: "all .12s",
                      }}>
                      {d}
                    </button>
                  );
                })}
                {filtroDistancias.length > 0 && (
                  <button onClick={() => setFiltroDistancias([])} style={{ padding: ".2rem .45rem", borderRadius: 5, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", border: "1px solid rgba(248,113,113,.3)", background: "transparent", color: "var(--red)" }}>✕</button>
                )}
              </div>
            </div>

            {/* Tipo de puesto */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: ".65rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 700, minWidth: 80, paddingTop: ".2rem" }}>
                📍 Tipo puesto
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem" }}>
                {tiposPuestoDisponibles.map(t => {
                  const active = filtroTipoPuesto.includes(t);
                  return (
                    <button key={t}
                      onClick={() => setFiltroTipoPuesto(prev => active ? prev.filter(x => x !== t) : [...prev, t])}
                      style={{
                        padding: ".2rem .55rem", borderRadius: 5, cursor: "pointer",
                        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                        border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`,
                        background: active ? "var(--cyan-dim)" : "var(--surface)",
                        color: active ? "var(--cyan)" : "var(--text-muted)",
                        transition: "all .12s",
                      }}>
                      {t}
                    </button>
                  );
                })}
                {filtroTipoPuesto.length > 0 && (
                  <button onClick={() => setFiltroTipoPuesto([])} style={{ padding: ".2rem .45rem", borderRadius: 5, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", border: "1px solid rgba(248,113,113,.3)", background: "transparent", color: "var(--red)" }}>✕</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Acciones masivas — visible cuando hay filtro activo ── */}
      {onBulkUpdate && voluntarios.length > 0 && (filtroEstado !== "todos" || filtroPuesto !== "todos" || busqueda) && (
        <div style={{ display:"flex", alignItems:"center", gap:".6rem", padding:".55rem .85rem",
          borderRadius:8, background:"var(--surface2)", border:"1px solid var(--border)",
          marginBottom:".65rem", flexWrap:"wrap" }}>
          <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", flex:1, minWidth:120 }}>
            {voluntarios.length} voluntario{voluntarios.length===1?"":"s"} con este filtro
          </span>
          {filtroEstado === "pendiente" && (
            <button className="btn btn-green btn-sm"
              onClick={() => onBulkUpdate(voluntarios.map(v=>v.id), { estado:"confirmado" })}>
              ✓ Confirmar todos
            </button>
          )}
          {filtroEstado === "pendiente" && (
            <button className="btn btn-ghost btn-sm"
              style={{ color:"var(--red)", borderColor:"rgba(248,113,113,.3)" }}
              onClick={() => onBulkUpdate(voluntarios.map(v=>v.id), { estado:"cancelado" })}>
              ✕ Cancelar todos
            </button>
          )}
          {filtroEstado === "cancelado" && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => onBulkUpdate(voluntarios.map(v=>v.id), { estado:"pendiente" })}>
              ↩ Mover a pendiente
            </button>
          )}
          {filtroEstado === "confirmado" && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => onBulkUpdate(voluntarios.map(v=>v.id), { estado:"pendiente" })}>
              ↩ Mover todos a pendiente
            </button>
          )}
        </div>
      )}
      {/* Vista Kanban — renderizada en lugar del listado cuando está activa */}
      {vistaKanban && (
        <TabKanbanVol
          voluntarios={voluntarios}
          puestos={puestos}
          onUpdate={onUpdate}
          onFicha={onFicha}
        />
      )}

      {/* Listado agrupado por estado — cada grupo colapsable */}
      {!vistaKanban && (volsOrdenados.length === 0 ? (
        <EmptyState
          svg="people" color="var(--cyan)"
          title="Sin voluntarios"
          sub="No hay voluntarios que coincidan con los filtros activos"
          action={<button className="btn btn-ghost btn-sm" onClick={onNuevo}>+ Añadir voluntario</button>}
        />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
          {gruposARenderizar.map(grupo => {
            const items = grupo.items;
            if (items.length === 0) return null;
            const collapsed = colapsados[grupo.clave];
            return (
              <div key={grupo.clave} style={{
                borderRadius:10, overflow:"hidden",
                border:`1px solid ${grupo.color}2a`,
              }}>
                {/* Cabecera del grupo */}
                <button
                  onClick={() => toggleGrupo(grupo.clave)}
                  style={{
                    width:"100%", display:"flex", alignItems:"center",
                    gap:".65rem", padding:".55rem .85rem",
                    background: grupo.bg, border:"none",
                    cursor:"pointer", textAlign:"left",
                    borderBottom: collapsed ? "none" : `1px solid ${grupo.color}1a`,
                  }}>
                  <span style={{
                    width:8, height:8, borderRadius:"50%",
                    background: grupo.color, flexShrink:0, display:"inline-block",
                  }}/>
                  <span style={{
                    fontFamily:"var(--font-mono)", fontWeight:700, fontSize:"var(--fs-base)",
                    color: grupo.color, flex:1,
                  }}>
                    {grupo.titulo}
                  </span>
                  <span style={{
                    fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                    color: grupo.color, fontWeight:700,
                    padding:".1rem .5rem", borderRadius:20,
                    background:`${grupo.color}18`,
                    border:`1px solid ${grupo.color}30`,
                  }}>
                    {items.length !== grupo.totalSinFiltrar
                      ? `${items.length} / ${grupo.totalSinFiltrar}`
                      : items.length}
                  </span>
                  <span style={{
                    fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                    color:"var(--text-dim)", flexShrink:0,
                    transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    transition:"transform .18s",
                  }}>▼</span>
                </button>

                {/* Cards del grupo — paginadas: máximo visiblePorGrupo[grupo.clave] en DOM */}
                {!collapsed && (() => {
                  const visible = visiblePorGrupo[grupo.clave] ?? ITEMS_INICIALES;
                  const itemsVisibles = items.slice(0, visible);
                  const quedan = items.length - itemsVisibles.length;
                  return (
                  <div style={{
                    display:"flex", flexDirection:"column", gap:"0",
                    background:"var(--surface)",
                  }}>
                    {itemsVisibles.map((v, idx) => {
                      const puesto = puestosMap.get(v.puestoId); // O(1) Map lookup
                      return (
                        <div key={v.id}
                          className="list-item-anim"
                          onClick={() => modoSeleccion ? toggleSeleccion(v.id) : onFicha(v)}
                          style={{
                            background: seleccionados.includes(v.id) ? "rgba(34,211,238,.07)" : "var(--surface)",
                            padding:"0.65rem 0.85rem",
                            cursor:"pointer", transition:"background .12s",
                            borderLeft:`3px solid ${seleccionados.includes(v.id) ? "var(--cyan)" : grupo.color}`,
                            borderBottom: idx < items.length-1 ? "1px solid var(--border)" : "none",
                          }}
                          onMouseEnter={e=>e.currentTarget.style.background=seleccionados.includes(v.id)?"rgba(34,211,238,.12)":"var(--surface2)"}
                          onMouseLeave={e=>e.currentTarget.style.background=seleccionados.includes(v.id)?"rgba(34,211,238,.07)":"var(--surface)"}>
                          <div style={{ display:"flex", alignItems:"center", gap:"0.65rem" }}>
                            {/* Checkbox modo selección */}
                            {modoSeleccion && (
                              <div onClick={e => { e.stopPropagation(); toggleSeleccion(v.id); }}
                                style={{
                                  width:20, height:20, borderRadius:5, flexShrink:0, cursor:"pointer",
                                  border:`2px solid ${seleccionados.includes(v.id) ? "var(--cyan)" : "var(--border)"}`,
                                  background: seleccionados.includes(v.id) ? "var(--cyan)" : "transparent",
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  transition:"all .12s"
                                }}>
                                {seleccionados.includes(v.id) && (
                                  <span style={{ color:"#0f172a", fontSize:"var(--fs-2xs)", fontWeight:900 }}>✓</span>
                                )}
                              </div>
                            )}
                            {/* Avatar Kinetik Ops — pill cuadrado redondeado con iniciales */}
                            <div style={{ position:"relative", flexShrink:0 }}>
                              <div style={{
                                width:34, height:34, borderRadius:10,
                                background: v.estado==="confirmado"
                                  ? "rgba(52,211,153,0.1)"
                                  : v.estado==="cancelado"
                                  ? "rgba(248,113,113,0.1)"
                                  : "rgba(251,191,36,0.1)",
                                border: `1px solid ${v.estado==="confirmado" ? "rgba(52,211,153,0.3)" : v.estado==="cancelado" ? "rgba(248,113,113,0.3)" : "rgba(251,191,36,0.3)"}`,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:"var(--fs-xs)", fontWeight:800,
                                color: v.estado==="confirmado" ? "var(--green)" : v.estado==="cancelado" ? "var(--red)" : "var(--amber)",
                                fontFamily:"var(--font-mono)",
                              }}>
                                {([v.nombre, v.apellidos].filter(Boolean).map(n=>n[0]).slice(0,2).join("").toUpperCase() || "V")}
                              </div>
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:"0.45rem",
                                flexWrap:"wrap", marginBottom:"0.2rem" }}>
                                <span style={{ fontWeight:700, fontSize:"var(--fs-sm)",
                                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                  {[v.nombre, v.apellidos].filter(Boolean).join(" ") || "Sin nombre"}
                                </span>
                                <span className={`badge ${v.rol==="responsable"?"badge-violet":"badge-cyan"}`}
                                  style={{ fontSize:"var(--fs-2xs)" }}>
                                  {v.rol||"apoyo"}
                                </span>
                                {v.coche && <span style={{ fontSize:"var(--fs-sm)" }} title="Tiene vehículo">🚗</span>}
                                {v.enPuesto && <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", fontWeight:700, color:"var(--green)", background:"rgba(52,211,153,.12)", border:"1px solid rgba(52,211,153,.25)", borderRadius:3, padding:"0 .3rem" }} title={`En puesto${v.horaLlegada ? " desde las "+v.horaLlegada : ""}`}>📍 EN PUESTO</span>}
                                {v.notaVoluntario && <span style={{ fontSize:"var(--fs-sm)" }} title={"Nota: "+v.notaVoluntario}>📝</span>}
                                {v.mensajeParaOrganizador && <span style={{ fontSize:"var(--fs-sm)" }} title={"Mensaje: "+v.mensajeParaOrganizador}>💬</span>}
                              </div>
                              <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
                                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                                  color:"var(--text-muted)" }}>{v.telefono||"—"}</span>
                                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                                  color:puesto?"var(--text-muted)":"var(--text-dim)" }}>
                                  📍 {puesto?puesto.nombre:"Sin asignar"}
                                </span>
                                {v.talla && (
                                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                                    color:"var(--cyan)" }}>👕 {v.talla}</span>
                                )}
                                {v.fechaRegistro && (() => {
                                  const dias = Math.floor((new Date() - new Date(v.fechaRegistro)) / 86400000);
                                  if (dias > 7) return null;
                                  return <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan)", fontWeight:700, background:"var(--cyan-dim)", borderRadius:4, padding:"0 .3rem" }}>
                                    🆕 {dias===0?"hoy":`${dias}d`}
                                  </span>;
                                })()}
                              </div>
                            </div>
                            <div onClick={e=>e.stopPropagation()} style={{ display:"flex",
                              alignItems:"center", gap:"0.3rem", flexShrink:0 }}>
                              <select className="inp inp-sm" value={v.estado}
                                onClick={e=>e.stopPropagation()}
                                onChange={e=>onUpdate(v.id,{estado:e.target.value})}
                                style={{ width:"auto", color:estadoColor(v.estado),
                                  background:estadoBg(v.estado), fontSize:"var(--fs-sm)" }}>
                                {Object.entries(ESTADOS).map(([k,lbl])=><option key={k} value={k}>{lbl}</option>)}
                              </select>
                              <button className="btn btn-ghost"
                                style={{ padding:"0.22rem 0.38rem", fontSize:"var(--fs-sm)" }}
                                onClick={e=>{e.stopPropagation();onEditar(v);}}>✏️</button>
                              <button className="btn btn-red"
                                style={{ padding:"0.22rem 0.38rem", fontSize:"var(--fs-sm)" }}
                                onClick={e=>{e.stopPropagation();onDelete(v.id);}}>✕</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Botón "Ver más" si quedan items fuera del DOM */}
                    {quedan > 0 && (
                      <button
                        onClick={() => cargarMasGrupo(grupo.clave, items.length)}
                        style={{
                          width: "100%", padding: ".55rem",
                          background: "transparent",
                          border: "none", borderTop: `1px solid ${grupo.color}1a`,
                          cursor: "pointer", textAlign: "center",
                          fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                          fontWeight: 700, color: grupo.color,
                          transition: "background .12s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${grupo.color}08`}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        Ver {Math.min(quedan, ITEMS_INCREMENTO)} más de {quedan} restantes ↓
                      </button>
                    )}
                  </div>
                  );
                })()}
              </div>
            );
          })}
      </div>
      ))}

    </>
  );
}

// Exports
export { TabVoluntarios };
