import { SK_UI_LAST_BACKUP, SK_UI_AUTO_BACKUP_TS } from "@/constants/storageKeys";

export function SeccionBackup({
  exportando, importMsg, setImportMsg,
  handleExport, handleExportVoluntariosCSV, handleExportPatrocinadores, handleImport,
}) {
  const lastBackup = localStorage.getItem(SK_UI_LAST_BACKUP);
  const tsAuto     = localStorage.getItem(SK_UI_AUTO_BACKUP_TS);

  const diasDesde = (iso) => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;
  const diasBackup = diasDesde(lastBackup);
  const diasAuto   = diasDesde(tsAuto);

  return (
    <div className="card cfg-section">
      <div className="cfg-section-title">💾 Backup y exportación de datos</div>

      {/* Estado último backup */}
      {lastBackup === null ? (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", padding: ".4rem .7rem", borderRadius: 6, marginBottom: ".75rem", background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.2)" }}>
          ⚠️ Sin backup reciente — se recomienda exportar una copia de seguridad
        </div>
      ) : (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: diasBackup > 7 ? "var(--amber)" : "var(--green)", marginBottom: ".75rem" }}>
          ✓ Último backup: {diasBackup === 0 ? "hoy" : diasBackup === 1 ? "ayer" : `hace ${diasBackup} días`}
          {" · "}{new Date(lastBackup).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      )}

      {/* CFG-02: backup automático */}
      {tsAuto && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--green)", marginBottom: ".5rem" }}>
          🤖 Backup automático: {diasAuto === 0 ? "hoy" : diasAuto === 1 ? "ayer" : `hace ${diasAuto} días`}
          {" · "}{new Date(tsAuto).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      )}

      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
        Exporta todos los datos de la app a un archivo JSON para hacer copias de seguridad o trasladar los datos a otro dispositivo. El backup automático se genera al abrir esta sección, cada 24 horas.
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", marginBottom: "1rem" }}>
        <button className="backup-btn export" onClick={handleExport} disabled={exportando}>
          {exportando ? "⏳ Exportando…" : "⬇️ Backup completo (JSON)"}
        </button>
        <button className="backup-btn csv" onClick={handleExportVoluntariosCSV}>📋 Voluntarios (CSV)</button>
        <button className="backup-btn csv" onClick={handleExportPatrocinadores}>🤝 Patrocinadores (CSV)</button>
        <label className="backup-btn import" style={{ cursor: "pointer" }}>
          ⬆️ Restaurar backup (JSON)
          <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
        </label>
      </div>

      {importMsg && (
        <div style={{ padding: ".65rem .85rem", borderRadius: 8, background: importMsg.tipo === "ok" ? "var(--green-dim)" : "var(--red-dim)", border: `1px solid ${importMsg.tipo === "ok" ? "rgba(52,211,153,.3)" : "rgba(248,113,113,.3)"}`, color: importMsg.tipo === "ok" ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", lineHeight: 1.6, display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem" }}>
          <span>{importMsg.texto}</span>
          <button onClick={() => setImportMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "var(--fs-md)", padding: 0, flexShrink: 0 }}>✕</button>
        </div>
      )}

      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", lineHeight: 1.7, marginTop: ".75rem" }}>
        ⚠️ Restaurar un backup sobreescribe todos los datos actuales. Exporta primero si quieres conservar los cambios recientes.
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", lineHeight: 1.7, marginTop: ".35rem", padding: ".5rem .65rem", background: "var(--surface2)", borderRadius: 6, border: "1px solid var(--border)" }}>
        📎 <strong style={{ color: "var(--text-muted)" }}>Nota:</strong> El backup incluye todos los datos de la app excepto los archivos PDF/imágenes subidos en Documentos, que se almacenan en Vercel Blob.
      </div>
    </div>
  );
}
