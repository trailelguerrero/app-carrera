import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { exportarVoluntarios }  from "@/lib/exportUtils";
import { blockCls as cls }      from "@/lib/blockStyles";
import { getEventDate }         from "@/lib/eventUtils";
import SkeletonBlock             from "@/components/common/SkeletonBlock";
import EmptyState                from "@/components/EmptyState";
import { PanelCompartir }        from "@/components/voluntarios/PanelCompartir";
import { TabDashboard }          from "@/components/voluntarios/TabDashboardVol";
import { TabVoluntarios }        from "@/components/voluntarios/TabVoluntariosList";
import { TabKanbanVol }          from "@/components/voluntarios/TabKanbanVol";
import { TabPuestos }            from "@/components/voluntarios/TabPuestosVol";
import { TabTallas }             from "@/components/voluntarios/TabTallasVol";
import { TabDiaD }               from "@/components/voluntarios/TabDiaDVol";
import { FichaVoluntario, MensajeOrganizadorEdit } from "@/components/voluntarios/FichaVoluntario";
import { FichaPuesto }           from "@/components/voluntarios/FichaPuesto";
import { ModalVoluntario }       from "@/components/voluntarios/ModalVoluntario";
import { ModalPuesto }           from "@/components/voluntarios/ModalPuesto";
import { ModalConfirm }          from "@/components/voluntarios/ModalConfirmar";
import { ModalMensaje }          from "@/components/voluntarios/ModalMensaje";
import { ModalReasignar }        from "@/components/voluntarios/ModalReasignar";
import { useVoluntarios }        from "@/hooks/useVoluntarios";
import { BuscadorSpotlight }     from "@/components/voluntarios/BuscadorSpotlight";

// Re-export para retrocompatibilidad
export { resolverLocalizacionDeVoluntario } from "@/hooks/useVoluntarios";

export default function Voluntarios() {
  const {
    config, puestos, voluntarios, isLoading,
    locs, rutas, matPorLoc,
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
  } = useVoluntarios();

  const [ficha, setFicha]   = useState(null);
  const [vista, setVista]   = useState("gestion");
  const [modalReasignarVol, setModalReasignarVol] = useState(null); // voluntario a reasignar

  const abrirFicha = (tipo, data) => setFicha({ tipo, data });

  // Handler reasignación rápida (desde puestos o ficha)
  const handleReasignar = (volId, puestoId) => {
    updateVoluntario(volId, { puestoId: puestoId ?? null });
  };
  // Abrir modal reasignar desde PuestoCard
  const handleAbrirReasignar = (voluntarioObj) => {
    setModalReasignarVol(voluntarioObj);
  };

  if (isLoading) return <SkeletonBlock variant="voluntarios" />;

  const diasHastaEvento = Math.ceil((getEventDate(config) - new Date()) / 86400000);
  const esSemanaCarrera = diasHastaEvento >= 0 && diasHastaEvento <= 7;

  const TABS_BASE = [
    { id: "dashboard",   icon: "📊", label: "Dashboard" },
    { id: "voluntarios", icon: "👥", label: "Voluntarios",    badge: stats.total },
    { id: "kanban",      icon: "🗂️", label: "Kanban" },
    { id: "puestos",     icon: "📍", label: "Puestos",        badge: puestos.length },
    { id: "tallas",      icon: "👕", label: "Tallas",         badge: Object.values(stats.tallasCount).reduce((s, v) => s + v, 0) || undefined, badgeColor: "badge-violet" },
    { id: "dia-d",       icon: "🏁", label: esSemanaCarrera ? "🚨 Día de Carrera" : "Día de Carrera", badge: stats.enPuesto > 0 ? stats.enPuesto : undefined, badgeColor: "badge-green" },
  ];
  const TABS_VOL = esSemanaCarrera ? [TABS_BASE[5], ...TABS_BASE.slice(0, 5)] : TABS_BASE;

  return (
    <>
      <div className="block-container">
        {/* HEADER */}
        <div className="block-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: ".65rem", flexWrap: "wrap", marginBottom: ".15rem" }}>
              <h1 className="block-title" style={{ margin: 0 }}>👥 Voluntarios</h1>
              <button onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "proyecto" } }))}
                style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".15rem .45rem", borderRadius: 4, border: "1px solid rgba(34,211,238,.3)", background: "rgba(34,211,238,.1)", color: "var(--cyan)", cursor: "pointer" }}>
                📋 Ver en Proyecto →
              </button>
            </div>
            <div className="block-title-sub">
              Módulo de gestión · Trail El Guerrero 2026
              {esSemanaCarrera && <span style={{ marginLeft: "0.5rem", color: "var(--red)", fontWeight: 700 }}>⚡ SEMANA DE CARRERA</span>}
            </div>
          </div>
          <div className="block-actions">
            <span className={`badge ${stats.coberturaGlobal >= 80 ? "badge-green" : stats.coberturaGlobal >= 50 ? "badge-amber" : "badge-red"}`}>
              🎯 {stats.coberturaGlobal}% cobertura
            </span>
            <button className="btn btn-primary" onClick={() => setModalVol("nuevo")}>+ Voluntario</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setModalMensaje(true)} title="Generar mensaje de instrucciones para voluntarios">📨 Instrucciones</button>
            <button className="btn btn-ghost btn-sm"
              onClick={async () => { if (isExportingExcel) return; setIsExportingExcel(true); try { await exportarVoluntarios(voluntarios, puestos); } finally { setIsExportingExcel(false); } }}
              disabled={isExportingExcel} title="Exportar lista de voluntarios a Excel">
              {isExportingExcel ? "⏳ Generando…" : "📊 Excel"}
            </button>
            <label className="btn btn-ghost btn-sm" title="Importar voluntarios desde CSV" style={{ cursor: "pointer", margin: 0 }}>
              📥 Importar CSV
              <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) { importarCSV(e.target.files[0]); e.target.value = ""; } }} />
            </label>
            <PanelCompartir portalUrl={window.location.origin + "/voluntarios/mi-ficha"} />
          </div>
        </div>

        {/* Enlace a config formulario */}
        <div className="card mb" style={{ padding: "0.65rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>⚙️ Configuración formulario público</span>
          <button className="btn btn-ghost btn-sm" title="Ir a Configuración → sección Formulario de voluntarios"
            onClick={() => { window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "configuracion" } })); setTimeout(() => document.getElementById("cfg-formulario")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300); }}>
            Configurar formulario →
          </button>
        </div>

        {/* Buscador spotlight */}
        <BuscadorSpotlight
          busqueda={busqueda} setBusqueda={setBusqueda}
          voluntarios={voluntarios} puestos={puestos}
          onAbrirFicha={(v) => abrirFicha("vol", v)}
          onVerTodos={() => setTab("voluntarios")}
          onFiltroPuesto={(pId) => { setFiltroPuesto(String(pId)); setTab("voluntarios"); }}
        />

        {/* Tabs */}
        <div className="tabs">
          {TABS_VOL.map(item => (
            <button key={item.id} className={cls("tab-btn", tab === item.id && "active")} onClick={() => setTab(item.id)}>
              {item.icon} {item.label}
              {item.badge !== undefined && <span className={`badge ${item.badgeColor || "badge-cyan"}`} style={{ marginLeft: "0.3rem" }}>{item.badge}</span>}
            </button>
          ))}
        </div>

        {/* Contenido por tab */}
        <div key={tab}>
          {tab === "dashboard" && (
            <TabDashboard stats={stats} puestosConStats={puestosConStats} voluntarios={voluntarios} setTab={setTab}
              onEditarVol={(v) => abrirFicha("vol", v)} onEditarPuesto={(p) => abrirFicha("puesto", p)}
              sugerenciasReubicacion={sugerenciasReubicacion}
              onReasignar={(volId, puestoId) => updateVoluntario(volId, { puestoId })} />
          )}
          {tab === "kanban" && (
            <TabKanbanVol voluntarios={voluntarios} puestos={puestos} onUpdate={updateVoluntario} onFicha={(v) => abrirFicha("vol", v)} />
          )}
          {tab === "voluntarios" && (
            <TabVoluntarios
              voluntarios={volsFiltrados} todosVols={voluntarios} puestos={puestos}
              busqueda={busqueda} setBusqueda={setBusqueda}
              filtroEstado={filtroEstado} setFiltroEstado={setFiltroEstado}
              filtroPuesto={filtroPuesto} setFiltroPuesto={setFiltroPuesto}
              filtroTallas={filtroTallas} setFiltroTallas={setFiltroTallas}
              filtroCoche={filtroCoche} setFiltroCoche={setFiltroCoche}
              filtroDistancias={filtroDistancias} setFiltroDistancias={setFiltroDistancias}
              filtroTipoPuesto={filtroTipoPuesto} setFiltroTipoPuesto={setFiltroTipoPuesto}
              onUpdate={updateVoluntario} onBulkUpdate={bulkUpdateVoluntarios}
              onDelete={(id) => setConfirmDelete(id)}
              onNuevo={() => setModalVol("nuevo")} onEditar={(v) => setModalVol(v)}
              onFicha={(v) => abrirFicha("vol", v)}
            />
          )}
          {tab === "puestos" && (
            <TabPuestos
              puestosConStats={puestosConStats} voluntarios={voluntarios} locs={locs}
              onUpdatePuesto={updatePuesto} onDeletePuesto={(id) => setConfirmDeletePuesto(id)}
              onNuevoPuesto={() => setModalPuesto("nuevo")} onEditPuesto={(p) => setModalPuesto(p)}
              onEditarVol={(v) => setModalVol(v)}
              onFichaPuesto={(p) => abrirFicha("puesto", p)} onFichaVol={(v) => abrirFicha("vol", v)}
              onAddVoluntario={(puestoId) => setModalVol({ _nuevo: true, puestoId })}
              onDesasignarVol={(volId) => handleReasignar(volId, null)}
              onReasignarVol={(volObj) => handleAbrirReasignar(volObj)}
            />
          )}
          {tab === "dia-d"  && <TabDiaD puestosConStats={puestosConStats} voluntarios={voluntarios} onUpdateVol={updateVoluntario} diasHastaEvento={diasHastaEvento} />}
          {tab === "tallas" && <TabTallas stats={stats} voluntarios={voluntarios} puestos={puestos} />}
        </div>
      </div>

      {/* Fichas */}
      {ficha?.tipo === "vol" && createPortal(
        <FichaVoluntario
          voluntario={ficha.data} puestos={puestos} voluntarios={voluntarios} locs={locs} matPorLoc={matPorLoc} config={config}
          onClose={() => setFicha(null)}
          onEditar={() => { document.querySelector("main")?.scrollTo({ top: 0, behavior: "instant" }); setFicha(null); setModalVol(ficha.data); }}
          onEliminar={() => { const id = ficha.data?.id; if (id === null || id === undefined) return; pendingDeleteRef.current = id; setConfirmDelete(id); setFicha(null); }}
          onEliminarConfirmado={() => { const id = ficha.data?.id ?? pendingDeleteRef.current; if (id === null || id === undefined) return; pendingDeleteRef.current = id; setFicha(null); ejecutarEliminacion(id); }}
          onUpdate={(data) => { updateVoluntario(ficha.data.id, data); setFicha(f => ({ ...f, data: { ...f.data, ...data } })); }}
          onReasignar={(volId, puestoId) => { handleReasignar(volId, puestoId); setFicha(f => ({ ...f, data: { ...f.data, puestoId: puestoId ?? null } })); }}
          onIntercambiar={(idA, idB) => { intercambiarVoluntarios(idA, idB); setFicha(null); }}
        />, document.body
      )}
      {ficha?.tipo === "puesto" && createPortal(
        <FichaPuesto
          puesto={ficha.data} voluntarios={voluntarios} puestosConStats={puestosConStats} locs={locs} matPorLoc={matPorLoc} rutas={rutas}
          onClose={() => setFicha(null)}
          onFichaVol={(v) => { setFicha(null); setTimeout(() => abrirFicha("vol", v), 50); }}
          onEditar={() => { document.querySelector("main")?.scrollTo({ top: 0, behavior: "instant" }); setFicha(null); setModalPuesto(ficha.data); }}
          onEliminar={() => { setFicha(null); setConfirmDeletePuesto(ficha.data.id); }}
          onDesasignarVol={(volId) => handleReasignar(volId, null)}
          onReasignarVol={(volId, puestoId) => handleReasignar(volId, puestoId)}
          onIntercambiarVol={(idA, idB) => { intercambiarVoluntarios(idA, idB); setFicha(null); }}
        />, document.body
      )}

      {/* Modales */}
      {modalVol && createPortal(
        <ModalVoluntario
          key={modalVol === "nuevo" || modalVol?._nuevo ? "nuevo" : modalVol.id}
          voluntario={modalVol === "nuevo" || modalVol?._nuevo ? (modalVol?._nuevo ? { puestoId: modalVol.puestoId } : null) : modalVol}
          puestos={puestosConStats}
          onSave={(data) => { if (modalVol === "nuevo" || modalVol?._nuevo) addVoluntario(data); else updateVoluntario(modalVol.id, data); setModalVol(null); }}
          onClose={() => setModalVol(null)}
          onEliminar={modalVol !== "nuevo" && !modalVol?._nuevo ? () => { const id = modalVol?.id; if (id === null || id === undefined) return; pendingDeleteRef.current = id; setModalVol(null); setConfirmDelete(id); } : undefined}
        />, document.body
      )}
      {modalPuesto && createPortal(
        <ModalPuesto
          key={modalPuesto === "nuevo" ? "nuevo" : modalPuesto.id}
          puesto={modalPuesto === "nuevo" ? null : modalPuesto} locs={locs}
          onSave={(data) => { if (modalPuesto === "nuevo") addPuesto(data); else updatePuesto(modalPuesto.id, data); setModalPuesto(null); }}
          onClose={() => setModalPuesto(null)}
        />, document.body
      )}
      {(confirmDelete !== null && confirmDelete !== undefined) && createPortal(<ModalConfirm zIndex={400} mensaje="¿Eliminar este voluntario? Esta acción no se puede deshacer." onConfirm={() => ejecutarEliminacion(pendingDeleteRef.current ?? confirmDelete)} onCancel={() => { setConfirmDelete(null); pendingDeleteRef.current = null; }} />, document.body)}
      {(confirmDeletePuesto !== null && confirmDeletePuesto !== undefined) && createPortal(<ModalConfirm zIndex={400} mensaje="¿Eliminar este puesto? Los voluntarios asignados quedarán sin puesto." onConfirm={() => { deletePuesto(confirmDeletePuesto); setConfirmDeletePuesto(null); }} onCancel={() => setConfirmDeletePuesto(null)} />, document.body)}
      {modalMensaje && <ModalMensaje config={config} onClose={() => setModalMensaje(false)} />}
      {/* Modal reasignación rápida desde vista de puestos */}
      {modalReasignarVol && createPortal(
        <ModalReasignar
          voluntario={modalReasignarVol}
          puestos={puestosConStats}
          voluntarios={voluntarios}
          onReasignar={(volId, puestoId) => { handleReasignar(volId, puestoId); setModalReasignarVol(null); }}
          onIntercambiar={(idA, idB) => { intercambiarVoluntarios(idA, idB); setModalReasignarVol(null); }}
          onClose={() => setModalReasignarVol(null)}
        />,
        document.body
      )}
    </>
  );
}
