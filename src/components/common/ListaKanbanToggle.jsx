/**
 * ListaKanbanToggle — Mejora 9
 * Toggle reutilizable ☰ Lista / ⬛ Kanban usado en múltiples tabs de Logística.
 * Sustituye el patrón duplicado en TabMaterial, TabTimeline, TabVehiculos y TabComunicaciones.
 */

/**
 * @param {{ vistaKanban: boolean, setVistaKanban: (v: boolean) => void }} props
 */
export function ListaKanbanToggle({ vistaKanban, setVistaKanban }) {
  return (
    <div className="filter-pill-group">
      <button
        className={`filter-pill${!vistaKanban ? " active" : ""}`}
        onClick={() => setVistaKanban(false)}
        aria-pressed={!vistaKanban}
      >
        ☰ Lista
      </button>
      <button
        className={`filter-pill${vistaKanban ? " active" : ""}`}
        onClick={() => setVistaKanban(true)}
        aria-pressed={vistaKanban}
      >
        ⬛ Kanban
      </button>
    </div>
  );
}
