/**
 * WidgetInscritos.jsx — extraído de Dashboard.jsx (Tarea 3.4)
 * Widget inline para editar inscritos por tramo directamente desde el Dashboard.
 */
import { useState, useEffect } from "react";
import dataService from "@/lib/dataService";
import { SK_PPTO_INSCRITOS } from "@/constants/storageKeys";

export function WidgetInscritos({ tramos, inscritos, onSave }) {
  const [open, setOpen] = useState(false);
  // Por defecto, usa el último tramo creado (suele ser el 'actual')
  const defaultTramo = tramos && tramos.length > 0 ? tramos[tramos.length - 1].id : "";
  const [tramoSel, setTramoSel] = useState(defaultTramo);
  const [vals, setVals] = useState({ TG7: 0, TG13: 0, TG25: 0 });
  const [saving, setSaving] = useState(false);

  // Sincronizar inputs si cambian de tramo o se abren
  useEffect(() => {
    if (open && tramoSel && inscritos?.tramos?.[tramoSel]) {
      const v = inscritos.tramos[tramoSel];
      setVals({ TG7: v.TG7 || 0, TG13: v.TG13 || 0, TG25: v.TG25 || 0 });
    } else if (open) {
      setVals({ TG7: 0, TG13: 0, TG25: 0 });
    }
  }, [open, tramoSel, inscritos]);

  if (!tramos || tramos.length === 0) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(tramoSel, vals);
    setSaving(false);
    setOpen(false); // Colapsar tras éxito
  };

  return (
    <div className="card mb" style={{ padding: "0.6rem 1rem", borderLeft: "3px solid var(--cyan)" }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
        onClick={() => setOpen(!open)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "var(--fs-lg)" }}>🏃</span>
          <div>
            <div style={{ fontSize: "var(--fs-base)", fontWeight: 700, color: "var(--cyan)" }}>Actualización rápida de inscritos</div>
            <div className="mono xs muted" style={{ marginTop: 2 }}>Volcar datos de la plataforma externa al presupuesto</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ padding: "0.2rem 0.4rem", color: "var(--text-muted)" }}>{open ? "▲ Ocultar" : "▼ Actualizar"}</button>
      </div>

      {open && (
        <div style={{ marginTop: "0.8rem", paddingTop: "0.8rem", borderTop: "1px solid var(--border)", animation: "teg-fade 0.2s ease" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>

            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", fontSize: "var(--fs-xs)", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Tramo activo</label>
              <select
                value={tramoSel}
                onChange={e => setTramoSel(parseInt(e.target.value))}
                style={{ width: "100%", padding: "0.4rem 0.5rem", borderRadius: "var(--r-sm)", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", fontFamily: "var(--font-display)", fontSize: "var(--fs-base)" }}
              >
                {tramos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 2, display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              {["TG7", "TG13", "TG25"].map(dist => (
                <div key={dist} style={{ flex: 1, minWidth: 80 }}>
                  <label style={{ display: "block", fontSize: "var(--fs-xs)", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", color: "var(--cyan)", marginBottom: "0.3rem" }}>{dist}</label>
                  <input
                    type="number" min="0"
                    value={vals[dist]}
                    onChange={e => setVals(prev => ({ ...prev, [dist]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    style={{ width: "100%", padding: "0.4rem 0.5rem", borderRadius: "var(--r-sm)", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", textAlign: "right" }}
                  />
                </div>
              ))}
            </div>

            <div style={{ alignSelf: "flex-end" }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ height: 34, padding: "0 1rem" }}>
                {saving ? "⏳" : "✓ Vuelco rápido"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
