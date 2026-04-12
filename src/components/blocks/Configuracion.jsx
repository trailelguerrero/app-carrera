import { useState } from "react";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/lib/dataService";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import dataService from "@/lib/dataService";

const CFG_CSS = `
  .cfg-section { margin-bottom: 1.75rem; }
  .cfg-section-title {
    font-family: var(--font-mono); font-size: .6rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .1em;
    color: var(--text-muted); margin-bottom: .85rem;
    padding-bottom: .4rem; border-bottom: 1px solid var(--border);
  }
  .cfg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
  @media (max-width: 600px) { .cfg-grid { grid-template-columns: 1fr; } }
  .cfg-field { display: flex; flex-direction: column; gap: .3rem; }
  .cfg-field-full { grid-column: 1 / -1; }
  .cfg-label { font-family: var(--font-mono); font-size: .62rem; color: var(--text-muted); font-weight: 600; }
  .cfg-input {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text); padding: .45rem .65rem;
    font-family: var(--font-display); font-size: .85rem;
    outline: none; transition: border-color .15s; width: 100%; box-sizing: border-box;
  }
  .cfg-input:focus { border-color: var(--cyan); }
  .cfg-input-num { font-family: var(--font-mono); text-align: right; width: 80px; }
  .cfg-hint { font-family: var(--font-mono); font-size: .58rem; color: var(--text-dim); line-height: 1.5; }
  .cfg-threshold-row {
    display: flex; align-items: center; gap: .75rem; padding: .65rem .85rem;
    border-radius: 8px; background: var(--surface2); border: 1px solid var(--border); margin-bottom: .5rem;
  }
  .cfg-threshold-label { flex: 1; }
  .cfg-threshold-name { font-weight: 700; font-size: .82rem; margin-bottom: .15rem; }
  .cfg-threshold-desc { font-family: var(--font-mono); font-size: .6rem; color: var(--text-muted); line-height: 1.5; }
  .cfg-save-bar {
    position: sticky; bottom: 0; background: var(--surface);
    border-top: 1px solid var(--border); padding: .85rem 0;
    margin-top: 1rem; display: flex; justify-content: flex-end; align-items: center; gap: .75rem;
  }
  .cfg-saved { font-family: var(--font-mono); font-size: .65rem; color: var(--green); }
  .backup-btn {
    display: flex; align-items: center; gap: .5rem;
    padding: .55rem 1rem; border-radius: var(--r-sm);
    font-family: var(--font-display); font-size: .78rem; font-weight: 700;
    cursor: pointer; border: 1px solid var(--border); transition: all .15s;
  }
  .backup-btn:disabled { opacity: .5; cursor: not-allowed; }
  .backup-btn.export { background: var(--cyan-dim); color: var(--cyan); border-color: rgba(34,211,238,.3); }
  .backup-btn.export:hover:not(:disabled) { background: var(--cyan); color: var(--bg); }
  .backup-btn.import { background: var(--amber-dim); color: var(--amber); border-color: rgba(251,191,36,.3); }
  .backup-btn.import:hover { background: var(--amber); color: var(--bg); }
  .backup-btn.csv { background: var(--green-dim); color: var(--green); border-color: rgba(52,211,153,.3); }
  .backup-btn.csv:hover { background: var(--green); color: var(--bg); }
`;

export default function Configuracion() {
  // useData: mismo patrón que todos los bloques — carga síncrona desde localStorage
  const [savedConfig, setSavedConfig] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(savedConfig || {}) };

  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [importMsg, setImportMsg] = useState(null); // {tipo:'ok'|'error', texto}

  const form = draft ?? config;
  const upd  = (k, v) => setDraft(p => ({ ...(p ?? config), [k]: v }));
  const dirty = draft !== null;

  const handleSave = async () => {
    const merged = { ...EVENT_CONFIG_DEFAULT, ...form };
    setSavedConfig(merged);
    await dataService.set(LS_KEY_CONFIG, merged);
    setDraft(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };


  // ── Todas las claves de datos de la app ──────────────────────────────────
  const ALL_DATA_KEYS = [
    "teg_event_config_v1",
    "teg_presupuesto_v1_tramos",
    "teg_presupuesto_v1_conceptos",
    "teg_presupuesto_v1_inscritos",
    "teg_presupuesto_v1_ingresosExtra",
    "teg_presupuesto_v1_merchandising",
    "teg_presupuesto_v1_maximos",
    "teg_voluntarios_v1_voluntarios",
    "teg_voluntarios_v1_puestos",
    "teg_voluntarios_v1_imgFront",
    "teg_voluntarios_v1_imgBack",
    "teg_voluntarios_v1_imgGuiaTallas",
    "teg_voluntarios_v1_opcionPuesto",
    "teg_voluntarios_v1_opcionVehiculo",
    "teg_patrocinadores_v1_pats",
    "teg_patrocinadores_v1_obj",
    "teg_logistica_v1_mat",
    "teg_logistica_v1_asig",
    "teg_logistica_v1_veh",
    "teg_logistica_v1_rut",
    "teg_logistica_v1_tl",
    "teg_logistica_v1_cont",
    "teg_logistica_v1_inc",
    "teg_logistica_v1_ck",
    "teg_localizaciones_v1",
    "teg_proyecto_v1_tareas",
    "teg_proyecto_v1_hitos",
    "teg_proyecto_v1_equipo",
    "teg_documentos_v1",
    "teg_documentos_v1_gestiones",
    "teg_camisetas_v1",
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
        } catch {}
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      const fecha = new Date().toISOString().split("T")[0];
      a.download = `backup_${(form.nombre||"evento").replace(/\s+/g,"-").toLowerCase()}_${fecha}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  };

  // ── Exportar voluntarios como CSV ────────────────────────────────────────
  const handleExportVoluntariosCSV = () => {
    try {
      const raw = localStorage.getItem("teg_voluntarios_v1_voluntarios");
      const vols = raw ? JSON.parse(raw) : [];
      if (!vols.length) { setImportMsg({tipo:"error",texto:"No hay voluntarios para exportar"}); return; }
      const cols = ["id","nombre","telefono","email","talla","estado","rol","puestoId","coche","notas","fechaRegistro"];
      const csv  = [cols.join(";"),
        ...vols.map(v => cols.map(c => `"${(v[c]??"")}"`).join(";"))
      ].join("\n");
      const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `voluntarios_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    } catch { setImportMsg({tipo:"error",texto:"Error exportando voluntarios"}); }
  };

  // ── Exportar patrocinadores como CSV ─────────────────────────────────────
  const handleExportPatrocinadores = () => {
    try {
      const raw = localStorage.getItem("teg_patrocinadores_v1_pats");
      const pats = raw ? JSON.parse(raw) : [];
      if (!pats.length) { setImportMsg({tipo:"error",texto:"No hay patrocinadores para exportar"}); return; }
      const cols = ["id","nombre","nivel","importe","estado","contacto","email","telefono","notas"];
      const csv  = [cols.join(";"),
        ...pats.map(p => cols.map(c => `"${(p[c]??"")}"`).join(";"))
      ].join("\n");
      const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `patrocinadores_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    } catch { setImportMsg({tipo:"error",texto:"Error exportando patrocinadores"}); }
  };

  // ── Importar backup JSON ──────────────────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);
        if (!backup.datos || typeof backup.datos !== "object")
          throw new Error("Formato de backup no reconocido");
        let count = 0;
        for (const [key, value] of Object.entries(backup.datos)) {
          if (ALL_DATA_KEYS.includes(key)) {
            localStorage.setItem(key, JSON.stringify(value));
            count++;
          }
        }
        setImportMsg({ tipo: "ok", texto: `✓ Backup restaurado — ${count} colecciones importadas. Recarga la app para ver los cambios.` });
        window.dispatchEvent(new Event("teg-sync"));
      } catch (err) {
        setImportMsg({ tipo: "error", texto: `Error al importar: ${err.message}` });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const fechaEvento   = form.fecha ? new Date(form.fecha) : null;
  const diasRestantes = fechaEvento ? Math.ceil((fechaEvento - new Date()) / 86400000) : null;

  return (
    <>
      <style>{BLOCK_CSS + CFG_CSS}</style>
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
          </div>
        </div>

        <div className="card cfg-section">
          <div className="cfg-section-title">⏱️ Umbrales de alerta de voluntarios</div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:".68rem", color:"var(--text-muted)", marginBottom:"1rem", lineHeight:1.6 }}>
            Define cuándo se activan las alertas de cobertura de voluntarios en el Dashboard.
            Ajústalos según tu proceso de captación.
          </div>

          <div className="cfg-threshold-row">
            <div className="cfg-threshold-label">
              <div className="cfg-threshold-name" style={{ color:"var(--red)" }}>🔴 Alerta crítica</div>
              <div className="cfg-threshold-desc">
                Puestos sin cubrir generan alerta roja. Acción inmediata requerida.
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:".5rem", flexShrink:0 }}>
              <input type="number" min={1} max={365} className="cfg-input cfg-input-num"
                value={form.volDiasCritico}
                onChange={e => upd("volDiasCritico", Math.max(1, parseInt(e.target.value)||1))} />
              <span style={{ fontFamily:"var(--font-mono)", fontSize:".7rem", color:"var(--text-muted)" }}>días antes</span>
            </div>
          </div>

          <div className="cfg-threshold-row">
            <div className="cfg-threshold-label">
              <div className="cfg-threshold-name" style={{ color:"var(--amber)" }}>🟡 Aviso</div>
              <div className="cfg-threshold-desc">
                Puestos sin cubrir generan aviso amarillo. Conviene ir gestionando.
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:".5rem", flexShrink:0 }}>
              <input type="number" min={1} max={365} className="cfg-input cfg-input-num"
                value={form.volDiasAviso}
                onChange={e => upd("volDiasAviso", Math.max((form.volDiasCritico||1)+1, parseInt(e.target.value)||1))} />
              <span style={{ fontFamily:"var(--font-mono)", fontSize:".7rem", color:"var(--text-muted)" }}>días antes</span>
            </div>
          </div>

          {fechaEvento && (
            <div style={{ marginTop:"1rem", padding:".75rem .85rem", background:"var(--surface2)", borderRadius:8, border:"1px solid var(--border)" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:".6rem", color:"var(--text-muted)", marginBottom:".5rem", textTransform:"uppercase", letterSpacing:".06em" }}>
                Ventanas de alerta
              </div>
              {[
                { label:"Sin alertas",    color:"var(--green)",  desde:"Hoy",                               hasta:`${form.volDiasAviso}d antes` },
                { label:"Aviso amarillo", color:"var(--amber)",  desde:`${form.volDiasAviso}d antes`,       hasta:`${form.volDiasCritico}d antes` },
                { label:"Alerta roja",    color:"var(--red)",    desde:`${form.volDiasCritico}d antes`,     hasta:"Día carrera" },
              ].map(w => (
                <div key={w.label} style={{ display:"flex", alignItems:"center", gap:".6rem", marginBottom:".3rem" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:w.color, flexShrink:0 }} />
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:".65rem", color:w.color, fontWeight:700, width:110 }}>{w.label}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:".62rem", color:"var(--text-dim)" }}>{w.desde} → {w.hasta}</span>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* ── Backup y exportación ─────────────────────────────────────── */}
        <div className="card cfg-section">
          <div className="cfg-section-title">💾 Backup y exportación de datos</div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:".68rem", color:"var(--text-muted)", marginBottom:"1rem", lineHeight:1.6 }}>
            Exporta todos los datos de la app a un archivo JSON para hacer copias de seguridad
            o trasladar los datos a otro dispositivo. También puedes exportar listas concretas a CSV.
          </div>

          <div style={{ display:"flex", flexWrap:"wrap", gap:".6rem", marginBottom:"1rem" }}>
            <button className="backup-btn export" onClick={handleExport} disabled={exportando}>
              {exportando ? "⏳ Exportando…" : "⬇️ Backup completo (JSON)"}
            </button>
            <button className="backup-btn csv" onClick={handleExportVoluntariosCSV}>
              📋 Voluntarios (CSV)
            </button>
            <button className="backup-btn csv" onClick={handleExportPatrocinadores}>
              🤝 Patrocinadores (CSV)
            </button>
            <label className="backup-btn import" style={{ cursor:"pointer" }}>
              ⬆️ Restaurar backup (JSON)
              <input type="file" accept=".json" onChange={handleImport} style={{ display:"none" }} />
            </label>
          </div>

          {importMsg && (
            <div style={{
              padding:".65rem .85rem", borderRadius:8,
              background: importMsg.tipo === "ok" ? "var(--green-dim)" : "var(--red-dim)",
              border: `1px solid ${importMsg.tipo === "ok" ? "rgba(52,211,153,.3)" : "rgba(248,113,113,.3)"}`,
              color: importMsg.tipo === "ok" ? "var(--green)" : "var(--red)",
              fontFamily:"var(--font-mono)", fontSize:".72rem", lineHeight:1.6,
              display:"flex", justifyContent:"space-between", alignItems:"center", gap:".5rem"
            }}>
              <span>{importMsg.texto}</span>
              <button onClick={() => setImportMsg(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", fontSize:"1rem", padding:0, flexShrink:0 }}>✕</button>
            </div>
          )}

          <div style={{ fontFamily:"var(--font-mono)", fontSize:".58rem", color:"var(--text-dim)", lineHeight:1.7, marginTop:".75rem" }}>
            ⚠️ Restaurar un backup sobreescribe todos los datos actuales. Exporta primero si quieres conservar los cambios recientes.
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:".58rem", color:"var(--text-dim)", lineHeight:1.7, marginTop:".35rem",
            padding:".5rem .65rem", background:"var(--surface2)", borderRadius:6,
            border:"1px solid var(--border)" }}>
            📎 <strong style={{color:"var(--text-muted)"}}>Nota:</strong> El backup incluye todos los datos de la app excepto los archivos PDF/imágenes subidos en Documentos, que se almacenan en Vercel Blob y no se pueden exportar desde aquí. Para hacer copia de esos archivos, descárgalos individualmente desde el bloque Documentos.
          </div>
        </div>

        {/* ── Otras opciones ── */}
        <div className="card cfg-section" style={{marginBottom:0}}>
          <div className="cfg-section-title">🛠️ Herramientas</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:".6rem"}}>
            <button
              className="backup-btn"
              style={{background:"var(--violet-dim)",color:"var(--violet)",
                border:"1px solid rgba(167,139,250,.3)"}}
              onClick={() => {
                localStorage.removeItem("teg_onboarding_done");
                window.location.reload();
              }}>
              🎓 Ver tutorial de inicio
            </button>
          </div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",
            color:"var(--text-dim)",lineHeight:1.7,marginTop:".6rem"}}>
            Vuelve a ver el tutorial de bienvenida. Útil para nuevos colaboradores o para repasar las funciones principales.
          </div>
        </div>

        <div className="cfg-save-bar">
          {saved && <span className="cfg-saved">✓ Guardado</span>}
          <button className={cls("btn", dirty ? "btn-primary" : "btn-ghost")}
            onClick={handleSave} disabled={!dirty} style={{ opacity: dirty ? 1 : .45 }}>
            {dirty ? "Guardar cambios" : "Sin cambios pendientes"}
          </button>
        </div>

      </div>
    </>
  );
}
