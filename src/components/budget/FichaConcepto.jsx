import React, { useState } from "react";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";
import { Toggle }   from "./common/Toggle";
import { fmt, fmtN } from "../../lib/budgetUtils";

// ─── Constantes ───────────────────────────────────────────────────────────────
const ESTADOS_PAGO_FIJO = [
  { id: "pendiente_presupuesto", label: "Pendiente presupuesto", color: "#94a3b8" },
  { id: "presupuestado",         label: "Presupuestado",         color: "#a78bfa" },
  { id: "contratado",            label: "Contratado",            color: "#22d3ee" },
  { id: "pagado",                label: "Pagado",                color: "#34d399" },
];

const ESTADOS_PEDIDO_VAR = [
  { id: "pendiente",   label: "Pendiente",   color: "#94a3b8" },
  { id: "solicitado",  label: "Solicitado",  color: "#a78bfa" },
  { id: "confirmado",  label: "Confirmado",  color: "#22d3ee" },
  { id: "recibido",    label: "Recibido",    color: "#34d399" },
];

const estadoCfg = (estado, lista) =>
  lista.find(e => e.id === estado) || lista[0];

// ─── Row de datos en la ficha ─────────────────────────────────────────────────
const Row = ({ label, value, color }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"0.4rem 0", borderBottom:"1px solid rgba(30,45,80,0.3)" }}>
    <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem", color:"var(--text-muted)", flexShrink:0 }}>
      {label}
    </span>
    <span style={{ fontSize:"0.78rem", fontWeight:600, color: color || "var(--text)",
      textAlign:"right", marginLeft:"0.75rem" }}>
      {value ?? "—"}
    </span>
  </div>
);

// ─── FICHA (solo lectura) ─────────────────────────────────────────────────────
export function FichaConcepto({ concepto: c, totalInscritos, onClose, onEditar, onEliminar }) {
  if (!c) return null;
  const esFijo = c.tipo === "fijo";
  const accentColor = esFijo ? "var(--cyan)" : "var(--green)";
  const estadoLista = esFijo ? ESTADOS_PAGO_FIJO : ESTADOS_PEDIDO_VAR;
  const ecfg = estadoCfg(c.estadoPago || c.estadoPedido, estadoLista);

  // Calcular datos por distancia
  const distActivas = DISTANCIAS.filter(d => c.activoDistancias?.[d]);
  const totalActivos = distActivas.reduce((s, d) => s + (totalInscritos?.[d] || 0), 0);

  const costeRealUnitario = c.costeUnitarioReal != null ? c.costeUnitarioReal : null;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        {/* Accent top */}
        <div style={{ borderTop: `3px solid ${accentColor}`, borderRadius:"16px 16px 0 0" }}>
          <div className="modal-header">
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
              <div style={{ width:44, height:44, borderRadius:10,
                background: esFijo ? "var(--cyan-dim)" : "var(--green-dim)",
                border: `2px solid ${accentColor}44`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"1.4rem", flexShrink:0 }}>
                {esFijo ? "📦" : "🔄"}
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:"1rem" }}>{c.nombre}</div>
                <div style={{ display:"flex", gap:"0.5rem", alignItems:"center", marginTop:"0.2rem", flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.58rem",
                    padding:"0.1rem 0.45rem", borderRadius:20,
                    background: `${accentColor}18`, color: accentColor,
                    border: `1px solid ${accentColor}33`, fontWeight:700 }}>
                    {esFijo ? "Coste fijo" : "Coste variable"}
                  </span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.58rem",
                    padding:"0.1rem 0.45rem", borderRadius:20,
                    background: `${ecfg.color}18`, color: ecfg.color,
                    border: `1px solid ${ecfg.color}33`, fontWeight:700 }}>
                    {ecfg.label}
                  </span>
                  {!c.activo && (
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.58rem",
                      padding:"0.1rem 0.45rem", borderRadius:20,
                      background:"rgba(90,106,138,0.15)", color:"var(--text-dim)",
                      border:"1px solid rgba(90,106,138,0.3)", fontWeight:700 }}>
                      Desactivado
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding:"0.2rem 0.5rem", fontSize:"1rem" }}
              onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body" style={{ gap:"0" }}>

          {/* Proveedor y contacto */}
          {(c.proveedor || c.contacto) && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem", marginBottom:"0.5rem" }}>
              {c.proveedor && <Row label="🏢 Proveedor" value={c.proveedor} />}
              {c.contacto  && <Row label="📞 Contacto"  value={c.contacto}  />}
            </div>
          )}

          {/* Datos económicos */}
          <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem", marginBottom:"0.5rem" }}>
            {esFijo ? (
              <>
                <Row label="💶 Importe total" value={fmt(c.costeTotal)} color={accentColor} />
                {c.numFactura && <Row label="🧾 Nº factura / ref." value={c.numFactura} />}
                {c.fechaPago  && <Row label="📅 Fecha pago / vto." value={c.fechaPago} />}
              </>
            ) : (
              <>
                {DISTANCIAS.filter(d => c.activoDistancias?.[d]).map(d => {
                  const unidades = totalInscritos?.[d] || 0;
                  const costeEst = c.costePorDistancia?.[d] || 0;
                  const costeReal = costeRealUnitario ?? costeEst;
                  return (
                    <div key={d} style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", padding:"0.35rem 0",
                      borderBottom:"1px solid rgba(30,45,80,0.3)" }}>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.62rem",
                        color: DISTANCIA_COLORS[d], fontWeight:700 }}>
                        {DISTANCIA_LABELS[d]}
                      </span>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.72rem", fontWeight:700 }}>
                          {unidades} ud · {fmtN(costeEst)} €/ud = {fmt(costeEst * unidades)}
                        </div>
                        {costeRealUnitario != null && costeRealUnitario !== costeEst && (
                          <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.58rem",
                            color:"var(--amber)" }}>
                            Real: {fmtN(costeReal)} €/ud = {fmt(costeReal * unidades)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {c.fechaEntrega && <Row label="📅 Entrega necesaria" value={c.fechaEntrega} />}
                {c.estadoPedido && <Row label="📦 Estado del pedido"
                  value={estadoCfg(c.estadoPedido, ESTADOS_PEDIDO_VAR).label}
                  color={estadoCfg(c.estadoPedido, ESTADOS_PEDIDO_VAR).color} />}
              </>
            )}
          </div>

          {/* Distancias activas */}
          <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem", marginBottom:"0.5rem" }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.58rem", color:"var(--text-muted)",
              textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"0.4rem" }}>
              Distancias activas
            </div>
            <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
              {DISTANCIAS.map(d => (
                <span key={d} style={{
                  fontFamily:"var(--font-mono)", fontSize:"0.65rem", fontWeight:700,
                  padding:"0.2rem 0.6rem", borderRadius:20,
                  background: c.activoDistancias?.[d] ? `${DISTANCIA_COLORS[d]}18` : "var(--surface3)",
                  color: c.activoDistancias?.[d] ? DISTANCIA_COLORS[d] : "var(--text-dim)",
                  border: `1px solid ${c.activoDistancias?.[d] ? `${DISTANCIA_COLORS[d]}44` : "var(--border)"}`,
                }}>
                  {c.activoDistancias?.[d] ? "✓" : "✕"} {DISTANCIA_LABELS[d]}
                </span>
              ))}
            </div>
          </div>

          {/* Notas */}
          {c.notas && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--border)" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"0.55rem", color:"var(--text-muted)",
                marginBottom:"0.25rem", textTransform:"uppercase" }}>Notas</div>
              <div style={{ fontSize:"0.78rem", lineHeight:1.55, color:"var(--text-muted)" }}>{c.notas}</div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent:"space-between" }}>
          <button className="btn btn-red" onClick={onEliminar}>🗑 Eliminar</button>
          <div style={{ display:"flex", gap:"0.4rem" }}>
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            <button className={`btn ${esFijo ? "btn-cyan" : "btn-green"}`} onClick={onEditar}>✏️ Editar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL EDITAR ─────────────────────────────────────────────────────────────
export function ModalEditarConcepto({ concepto: c, totalInscritos, onSave, onClose }) {
  if (!c) return null;
  const esFijo = c.tipo === "fijo";
  const accentColor = esFijo ? "var(--cyan)" : "var(--green)";
  const estadoLista = esFijo ? ESTADOS_PAGO_FIJO : ESTADOS_PEDIDO_VAR;

  const [form, setForm] = useState({
    // Campos base
    nombre:    c.nombre    || "",
    activo:    c.activo    ?? true,
    costeTotal: c.costeTotal || 0,
    activoDistancias: { ...c.activoDistancias },
    costePorDistancia: { ...c.costePorDistancia },
    modoUniforme: c.modoUniforme ?? true,
    // Campos nuevos
    proveedor:        c.proveedor        || "",
    contacto:         c.contacto         || "",
    notas:            c.notas            || "",
    // Fijo
    estadoPago:       c.estadoPago       || "pendiente_presupuesto",
    fechaPago:        c.fechaPago        || "",
    numFactura:       c.numFactura       || "",
    // Variable
    estadoPedido:     c.estadoPedido     || "pendiente",
    fechaEntrega:     c.fechaEntrega     || "",
    costeUnitarioReal: c.costeUnitarioReal ?? "",
  });

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const updDist = (k, d, v) => setForm(p => ({ ...p, [k]: { ...p[k], [d]: v } }));

  const handleGuardar = () => {
    // Modo uniforme: propagar el precio de TG7 a todas las distancias activas
    let costeFinal = { ...form.costePorDistancia };
    if (!esFijo && form.modoUniforme) {
      const basePrice = form.costePorDistancia.TG7 || 0;
      DISTANCIAS.forEach(d => { costeFinal[d] = basePrice; });
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
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <span className="modal-title">
            {esFijo ? "📦" : "🔄"} Editar — {c.nombre}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ gap:"0.75rem" }}>

          {/* Nombre + activo */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <Toggle value={form.activo} onChange={v => upd("activo", v)} />
            <div style={{ flex:1 }}>
              <FL>Nombre del concepto</FL>
              <input className="inp" value={form.nombre} onChange={e => upd("nombre", e.target.value)} />
            </div>
          </div>

          {/* Proveedor y contacto */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
            <div>
              <FL>🏢 Proveedor</FL>
              <input className="inp" value={form.proveedor}
                onChange={e => upd("proveedor", e.target.value)}
                placeholder="Nombre empresa / persona" />
            </div>
            <div>
              <FL>📞 Contacto</FL>
              <input className="inp" value={form.contacto}
                onChange={e => upd("contacto", e.target.value)}
                placeholder="Tel. o email" />
            </div>
          </div>

          {/* Campos específicos por tipo */}
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
                  {ESTADOS_PAGO_FIJO.map(e => (
                    <button key={e.id} onClick={() => upd("estadoPago", e.id)}
                      style={{ padding:"0.25rem 0.65rem", borderRadius:20, cursor:"pointer",
                        fontFamily:"var(--font-mono)", fontSize:"0.62rem", fontWeight:700,
                        background: form.estadoPago === e.id ? `${e.color}22` : "var(--surface3)",
                        color: form.estadoPago === e.id ? e.color : "var(--text-muted)",
                        border: `1px solid ${form.estadoPago === e.id ? `${e.color}55` : "var(--border)"}`,
                      }}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Distancias activas */}
              <div>
                <FL>Distancias activas</FL>
                <div style={{ display:"flex", gap:"0.75rem" }}>
                  {DISTANCIAS.map(d => (
                    <label key={d} style={{ display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer" }}>
                      <Toggle value={form.activoDistancias[d]}
                        onChange={v => updDist("activoDistancias", d, v)} />
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.65rem",
                        color: form.activoDistancias[d] ? DISTANCIA_COLORS[d] : "var(--text-muted)",
                        fontWeight:700 }}>
                        {DISTANCIA_LABELS[d]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Costes por distancia */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.4rem" }}>
                  <FL>€/corredor por distancia</FL>
                  <button
                    onClick={() => upd("modoUniforme", !form.modoUniforme)}
                    style={{ padding:"0.2rem 0.55rem", borderRadius:5, fontSize:"0.65rem",
                      fontWeight:700, cursor:"pointer", fontFamily:"var(--font-mono)",
                      background: form.modoUniforme ? "var(--violet-dim)" : "var(--surface3)",
                      color: form.modoUniforme ? "var(--violet)" : "var(--text-muted)",
                      border: `1px solid ${form.modoUniforme ? "rgba(167,139,250,0.3)" : "var(--border)"}`,
                    }}>
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
                      fontWeight:700, color: DISTANCIA_COLORS[d], width:80 }}>
                      {DISTANCIA_LABELS[d]}
                    </span>
                    <div style={{ flex:1, display:"flex", justifyContent:"flex-end" }}>
                      <NumInput
                        value={form.costePorDistancia[d] || 0}
                        onChange={v => {
                          if (form.modoUniforme) {
                            setForm(p => ({ ...p, costePorDistancia:
                              Object.fromEntries(DISTANCIAS.map(dd => [dd, v])) }));
                          } else {
                            updDist("costePorDistancia", d, v);
                          }
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
                    style={{ color: estadoCfg(form.estadoPedido, ESTADOS_PEDIDO_VAR).color }}>
                    {ESTADOS_PEDIDO_VAR.map(e => (
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
                  <input className="inp inp-mono" type="number" min="0" step="0.01"
                    value={form.costeUnitarioReal}
                    onChange={e => upd("costeUnitarioReal", e.target.value === "" ? "" : parseFloat(e.target.value))}
                    placeholder="= estimado" />
                </div>
              </div>
            </>
          )}

          {/* Notas — común a ambos */}
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
