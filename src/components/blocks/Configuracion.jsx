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
`;

export default function Configuracion() {
  // useData: mismo patrón que todos los bloques — carga síncrona desde localStorage
  const [savedConfig, setSavedConfig] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(savedConfig || {}) };

  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);

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
