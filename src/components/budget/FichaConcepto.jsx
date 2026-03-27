import { useState } from "react";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";
import { Toggle }   from "./common/Toggle";
import { fmt, fmtN } from "../../lib/budgetUtils";

const ESTADOS_PAGO = [
  { id: "pendiente_presupuesto", label: "Pendiente presupuesto", color: "#94a3b8" },
  { id: "presupuestado",         label: "Presupuestado",         color: "#a78bfa" },
  { id: "contratado",            label: "Contratado",            color: "#22d3ee" },
  { id: "pagado",                label: "Pagado",                color: "#34d399" },
];
const ESTADOS_PEDIDO = [
  { id: "pendiente",   label: "Pendiente",   color: "#94a3b8" },
  { id: "solicitado",  label: "Solicitado",  color: "#a78bfa" },
  { id: "confirmado",  label: "Confirmado",  color: "#22d3ee" },
  { id: "recibido",    label: "Recibido",    color: "#34d399" },
];

const estadoCfg = (val, lista) => lista.find(e => e.id === val) || lista[0];

// ─── MODAL DE EDICIÓN ─────────────────────────────────────────────────────────
export function ModalEditarConcepto({ concepto: c, totalInscritos, onSave, onClose }) {
  if (!c) return null;
  const esFijo = c.tipo === "fijo";
  const accentColor = esFijo ? "var(--cyan)" : "var(--green)";
  const estadoLista = esFijo ? ESTADOS_PAGO : ESTADOS_PEDIDO;

  const [form, setForm] = useState({
    nombre:           c.nombre    || "",
    activo:           c.activo    ?? true,
    costeTotal:       c.costeTotal || 0,
    activoDistancias: { ...c.activoDistancias },
    costePorDistancia:{ ...c.costePorDistancia },
    modoUniforme:     c.modoUniforme ?? true,
    proveedor:        c.proveedor        || "",
    contacto:         c.contacto         || "",
    notas:            c.notas            || "",
    estadoPago:       c.estadoPago       || "pendiente_presupuesto",
    fechaPago:        c.fechaPago        || "",
    numFactura:       c.numFactura       || "",
    estadoPedido:     c.estadoPedido     || "pendiente",
    fechaEntrega:     c.fechaEntrega     || "",
    costeUnitarioReal: c.costeUnitarioReal ?? "",
  });

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const updDist = (k, d, v) => setForm(p => ({ ...p, [k]: { ...p[k], [d]: v } }));

  const handleGuardar = () => {
    let costeFinal = { ...form.costePorDistancia };
    if (!esFijo && form.modoUniforme) {
      const base = form.costePorDistancia.TG7 || 0;
      DISTANCIAS.forEach(d => { costeFinal[d] = base; });
    }
    onSave({ ...c, ...form, costePorDistancia: costeFinal });
  };

  const FL = ({ children }) => (
    <label style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem",
      color:"var(--text-muted)", display:"block", marginBottom:"0.25rem" }}>
      {children}
    </label>
  );

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:500 }}>
        <div className="modal-header">
          <span className="modal-title">{esFijo ? "📦" : "🔄"} {c.nombre}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ gap:"0.75rem" }}>

          {/* Nombre + activo */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <Toggle value={form.activo} onChange={v => upd("activo", v)} />
            <div style={{ flex:1 }}>
              <FL>Nombre del concepto</FL>
              <input className="inp" value={form.nombre}
                onChange={e => upd("nombre", e.target.value)} />
            </div>
          </div>

          {/* Proveedor y contacto */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
            <div>
              <FL>🏢 Proveedor</FL>
              <input className="inp" value={form.proveedor}
                onChange={e => upd("proveedor", e.target.value)}
                placeholder="Empresa / persona" />
            </div>
            <div>
              <FL>📞 Contacto</FL>
              <input className="inp" value={form.contacto}
                onChange={e => upd("contacto", e.target.value)}
                placeholder="Tel. o email" />
            </div>
          </div>

          {/* Campos por tipo */}
          {esFijo ? (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.5rem" }}>
                <div>
                  <FL>💶 Importe total (€)</FL>
                  <NumInput value={form.costeTotal} onChange={v => upd("costeTotal", v)} step={1} />
                </div>
                <div>
                  <FL>📅 Fecha pago / vto.</FL>
                  <input className="inp" type="date" value={form.fechaPago}
                    onChange={e => upd("fechaPago", e.target.value)} />
                </div>
                <div>
                  <FL>🧾 Nº factura / ref.</FL>
                  <input className="inp" value={form.numFactura}
                    onChange={e => upd("numFactura", e.target.value)}
                    placeholder="FAC-001" />
                </div>
              </div>
              <div>
                <FL>Estado de pago</FL>
                <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
                  {ESTADOS_PAGO.map(e => (
                    <button key={e.id} onClick={() => upd("estadoPago", e.id)}
                      style={{ padding:"0.25rem 0.65rem", borderRadius:20, cursor:"pointer",
                        fontFamily:"var(--font-mono)", fontSize:"0.62rem", fontWeight:700,
                        background: form.estadoPago===e.id ? `${e.color}22` : "var(--surface3)",
                        color: form.estadoPago===e.id ? e.color : "var(--text-muted)",
                        border: `1px solid ${form.estadoPago===e.id ? `${e.color}55` : "var(--border)"}`,
                      }}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FL>Distancias activas</FL>
                <div style={{ display:"flex", gap:"0.75rem" }}>
                  {DISTANCIAS.map(d => (
                    <label key={d} style={{ display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer" }}>
                      <Toggle value={form.activoDistancias[d]}
                        onChange={v => updDist("activoDistancias", d, v)} />
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.65rem",
                        color: form.activoDistancias[d] ? DISTANCIA_COLORS[d] : "var(--text-muted)",
                        fontWeight:700 }}>{DISTANCIA_LABELS[d]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.4rem" }}>
                  <FL>€/corredor por distancia</FL>
                  <button onClick={() => upd("modoUniforme", !form.modoUniforme)}
                    style={{ padding:"0.2rem 0.55rem", borderRadius:5, fontSize:"0.65rem",
                      fontWeight:700, cursor:"pointer", fontFamily:"var(--font-mono)",
                      background: form.modoUniforme ? "var(--violet-dim)" : "var(--surface3)",
                      color: form.modoUniforme ? "var(--violet)" : "var(--text-muted)",
                      border: `1px solid ${form.modoUniforme ? "rgba(167,139,250,0.3)" : "var(--border)"}` }}>
                    {form.modoUniforme ? "= Igual" : "≠ Dist."}
                  </button>
                </div>
                {DISTANCIAS.map((d, i) => (
                  <div key={d} style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                    padding:"0.35rem 0.5rem", marginBottom:"0.3rem",
                    background:"var(--surface2)", borderRadius:8,
                    border:`1px solid ${form.activoDistancias[d] ? `${DISTANCIA_COLORS[d]}22` : "var(--border)"}`,
                    opacity: form.activoDistancias[d] ? 1 : 0.4 }}>
                    <Toggle value={form.activoDistancias[d]}
                      onChange={v => updDist("activoDistancias", d, v)} />
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.72rem",
                      fontWeight:700, color:DISTANCIA_COLORS[d], width:80 }}>
                      {DISTANCIA_LABELS[d]}
                    </span>
                    <div style={{ flex:1, display:"flex", justifyContent:"flex-end" }}>
                      <NumInput
                        value={form.costePorDistancia[d] || 0}
                        onChange={v => {
                          if (form.modoUniforme) {
                            setForm(p => ({ ...p, costePorDistancia:
                              Object.fromEntries(DISTANCIAS.map(dd => [dd, v])) }));
                          } else { updDist("costePorDistancia", d, v); }
                        }}
                        step={0.01} small
                        disabled={form.modoUniforme && i > 0}
                      />
                    </div>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.6rem",
                      color:"var(--text-muted)", width:60, textAlign:"right" }}>
                      = {fmt((form.costePorDistancia[d]||0) * (totalInscritos?.[d]||0))}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.5rem" }}>
                <div>
                  <FL>Estado del pedido</FL>
                  <select className="inp" value={form.estadoPedido}
                    onChange={e => upd("estadoPedido", e.target.value)}
                    style={{ color: estadoCfg(form.estadoPedido, ESTADOS_PEDIDO).color }}>
                    {ESTADOS_PEDIDO.map(e => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FL>📅 Entrega necesaria</FL>
                  <input className="inp" type="date" value={form.fechaEntrega}
                    onChange={e => upd("fechaEntrega", e.target.value)} />
                </div>
                <div>
                  <FL>💶 Coste real (€/ud)</FL>
                  <input className="inp" type="number" min="0" step="0.01"
                    value={form.costeUnitarioReal}
                    onChange={e => upd("costeUnitarioReal", e.target.value==="" ? "" : parseFloat(e.target.value))}
                    placeholder="= estimado" />
                </div>
              </div>
            </>
          )}

          <div>
            <FL>📝 Notas</FL>
            <textarea className="inp" rows={3} value={form.notas}
              onChange={e => upd("notas", e.target.value)}
              placeholder="Condiciones, negociaciones pendientes, observaciones…"
              style={{ resize:"vertical" }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className={`btn ${esFijo ? "btn-cyan" : "btn-green"}`}
            onClick={handleGuardar} disabled={!form.nombre.trim()}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
