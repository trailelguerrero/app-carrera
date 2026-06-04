import dataService from "@/lib/dataService";
import { SK_EVENT_CONFIG as LS_KEY_CONFIG } from "@/constants/storageKeys";

export function SeccionPeligro({ form, upd, savedConfig, draft, setResetModal, setResetInput }) {
  return (
    <>
      <div className="card cfg-section" style={{ marginBottom: 0 }}>
        <div className="cfg-section-title">🛠️ Herramientas</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: ".55rem .75rem", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text)" }}>🏁 Abrir DíaCarrera al iniciar</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", color: "var(--text-muted)", marginTop: ".1rem" }}>Abre automáticamente el panel del día D tras introducir el PIN</div>
            </div>
            <button
              className={"btn btn-sm " + (form.autoOpenDia ? "btn-cyan" : "btn-ghost")}
              onClick={() => {
                const val = !form.autoOpenDia;
                upd("autoOpenDia", val);
                dataService.set(LS_KEY_CONFIG, { ...savedConfig, ...draft, autoOpenDia: val });
              }}
              style={{ minWidth: 70 }}>
              {form.autoOpenDia ? "Activo" : "Inactivo"}
            </button>
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", lineHeight: 1.7, marginTop: ".6rem" }}>
          Vuelve a ver el tutorial de bienvenida. Útil para nuevos colaboradores o para repasar las funciones principales.
        </div>
      </div>

      <div className="card cfg-section" style={{ border: "1px solid rgba(248,113,113,.35)", background: "rgba(248,113,113,.04)" }}>
        <div className="cfg-section-title" style={{ color: "var(--red)" }}>🗑️ Zona de peligro</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
          Borra todos los datos de la aplicación: voluntarios, presupuesto, logística, patrocinadores, proyecto y configuración del evento. Esta acción es irreversible. Exporta un backup antes de continuar.
        </div>
        <button className="btn btn-red" onClick={() => { setResetInput(""); setResetModal(true); }}>
          🗑️ Borrar todos los datos
        </button>
      </div>
    </>
  );
}
