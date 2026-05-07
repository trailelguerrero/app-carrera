// Auto-extracted from Voluntarios.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK, GUIA_TALLAS } from "@/constants/camisetasConstants";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/lib/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";

// ─── MODAL PUESTO ─────────────────────────────────────────────────────────────
function ModalPuesto({ puesto, locs, onSave, onClose }) {
  const firstInputRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => firstInputRef.current?.focus(), 60); return () => clearTimeout(t); }, []);
  const { closing: mpuClosing, handleClose: mpuHandleClose } = useModalClose(onClose);
  const [form, setForm] = useState(puesto || {
    nombre: "", tipo: "Avituallamiento", distancias: ["Todas"],
    horaInicio: "08:00", horaFin: "15:00", necesarios: 3, responsableId: null, tiempoLimite: "", notas: ""
  });
  const [errMP, setErrMP] = useState({});
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleDist = (d) => setForm(p => ({
    ...p, distancias: p.distancias.includes(d) ? p.distancias.filter(x => x !== d) : [...p.distancias, d]
  }));
  const validarPuesto = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "El nombre del puesto es obligatorio";
    if (!form.necesarios || form.necesarios < 1) e.necesarios = "Mínimo 1 voluntario necesario";
    if (!form.distancias || form.distancias.length === 0) e.distancias = "Selecciona al menos una distancia";
    setErrMP(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className={`modal-backdrop${mpuClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target === e.currentTarget && mpuHandleClose()}>
      <div className={`modal modal-ficha${mpuClosing ? " modal-closing" : ""}`}>
        <div className="modal-header">
          <span className="modal-title">{puesto ? "✏️ Editar puesto" : "📍 Nuevo puesto"}</span>
          <button className="btn btn-ghost" style={{ padding: "0.2rem 0.5rem" }} onClick={mpuHandleClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: "0.5rem" }}>
            <label className="field-label">📍 Localización Maestra (opcional)</label>
            <select className="inp" value={form.localizacionId || ""} 
              onChange={e => {
                const locId = e.target.value ? parseInt(e.target.value) : null;
                const loc = locs.find(l => l.id === locId);
                const newData = { localizacionId: locId };
                if (loc && !form.nombre) newData.nombre = loc.nombre;
                if (loc) newData.tipo = loc.tipo;
                setForm(p => ({ ...p, ...newData }));
              }}>
              <option value="">-- Sin vincular --</option>
              {locs.map(l => <option key={l.id} value={l.id}>{l.nombre} ({l.tipo})</option>)}
            </select>
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
              Vincular a una localización maestra sincroniza el tipo y facilita la logística.
            </div>
          </div>
          <div>
            <label className="field-label" style={{ color: errMP.nombre ? "var(--red)" : undefined }}>Nombre del puesto *</label>
            <input ref={firstInputRef} className="inp" autoFocus value={form.nombre}
              onChange={e => { upd("nombre", e.target.value); if (e.target.value.trim()) setErrMP(p=>({...p,nombre:undefined})); }}
              placeholder="Ej: Avituallamiento KM 7"
              style={{ borderColor: errMP.nombre ? "var(--red)" : undefined }} />
            {errMP.nombre && <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--red)", marginTop:".2rem" }}>⚠ {errMP.nombre}</div>}
          </div>
          <div className="field-row">
            <div>
              <label className="field-label">Tipo</label>
              <select className="inp" value={form.tipo} onChange={e => upd("tipo", e.target.value)}>
                {TIPOS_PUESTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Voluntarios necesarios</label>
              <input className="inp" type="number" min={1} value={form.necesarios} onChange={e => upd("necesarios", parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <div className="field-row">
            <div><label className="field-label">Hora de inicio (voluntario)</label><input className="inp" type="time" value={form.horaInicio} onChange={e => upd("horaInicio", e.target.value)} /></div>
            <div><label className="field-label">Hora de fin (voluntario)</label><input className="inp" type="time" value={form.horaFin} onChange={e => upd("horaFin", e.target.value)} /></div>
          </div>
          {form.tipo === "Control" && (
            <div style={{ background: "var(--amber-dim)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 8, padding: "0.65rem 0.85rem" }}>
              <label className="field-label" style={{ color: "var(--amber)" }}>⏱ Tiempo límite de paso (corredor)</label>
              <input className="inp" type="time" value={form.tiempoLimite || ""} onChange={e => upd("tiempoLimite", e.target.value)}
                placeholder="Hora máxima de paso" />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                Corredores que lleguen después de esta hora deben ser retirados de la competición.
              </div>
            </div>
          )}
          <div>
            <label className="field-label" style={{ color: errMP.distancias ? "var(--red)" : undefined }}>Distancias *</label>
            {errMP.distancias && <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--red)", marginBottom:".25rem" }}>⚠ {errMP.distancias}</div>}
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {DISTANCIAS_PUESTO.map(d => (
                <button key={d} onClick={() => toggleDist(d)}
                  style={{ padding: "0.3rem 0.65rem", borderRadius: 6, border: `1px solid ${form.distancias.includes(d) ? DIST_COLORS[d] : "var(--border)"}`, background: form.distancias.includes(d) ? `${DIST_COLORS[d]}18` : "var(--surface2)", color: form.distancias.includes(d) ? DIST_COLORS[d] : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div><label className="field-label">Notas / Instrucciones</label>
            <textarea className="inp" rows={2} value={form.notas} onChange={e => upd("notas", e.target.value)} placeholder="Material necesario, instrucciones específicas..." style={{ resize: "vertical" }} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-cyan" onClick={() => { if (validarPuesto()) onSave(form); }}>
            {puesto ? "Guardar cambios" : "Crear puesto"}
          </button>
        </div>
      </div>
    </div>
  );
}


// Exports
export { ModalPuesto };
