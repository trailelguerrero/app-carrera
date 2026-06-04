import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { fmtEur2 as fmtEur } from "@/lib/utils";
import { useData } from "@/hooks/useData";
import { SK_DOC_DOCS } from "@/constants/storageKeys";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { ESTADOS_FACTURA, calcPrecioUnitario } from "./logisticaHelpers";

export function ModalPedidoProv({ data, sugerido, proveedores, onSave, onClose, material = [], conceptosPres = [], pedidosActivos = [], totalInscritos = 0, inscritos = {} }) {
  const esEdit = !!data?.id;
  const [form, setForm] = useState(() => {
    if (data)     return { ...data, articulos: (data.articulos || []).map(a => ({ ...a })) };
    if (sugerido) return { nombre: sugerido.nombre || "", proveedor: sugerido.proveedor || "", articulos: (sugerido.articulos || []).map(a => ({ ...a })), importeEstimado: sugerido.importeEstimado || 0, importeTotal: sugerido.importeTotal || 0, estado: "borrador", fechaLimitePedido: sugerido.fechaLimitePedido || "", fechaEntrega: sugerido.fechaEntrega || "", notas: sugerido.notas || "", factura: null };
    return { nombre: "", proveedor: "", articulos: [{ nombre: "", cantidad: 1, precioUnit: 0 }], importeEstimado: 0, importeTotal: 0, estado: "borrador", fechaLimitePedido: "", fechaEntrega: "", notas: "", factura: null };
  });

  const upd    = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const updArt = (i, k, v) => setForm(p => ({ ...p, articulos: p.articulos.map((a, j) => j === i ? { ...a, [k]: v } : a) }));
  const addArt    = () => setForm(p => ({ ...p, articulos: [...p.articulos, { nombre: "", cantidad: 1, precioUnit: 0, fuente: "manual" }] }));
  const addArtDef = (def) => setForm(p => ({ ...p, articulos: [...p.articulos, def] }));
  const delArt    = (i) => setForm(p => ({ ...p, articulos: p.articulos.filter((_, j) => j !== i) }));

  const importeCalc = form.articulos.reduce((s, a) => s + (a.esFijo ? (a.costeTotal || 0) : a.cantidad * (a.precioUnit || 0)), 0);
  const guardar = () => { if (!form.nombre.trim()) return; onSave({ ...form, importeTotal: importeCalc, importeEstimado: form.importeEstimado || importeCalc }); };

  // Docs vinculables de Documentos
  const [todosLosDocs] = useData(SK_DOC_DOCS, []);
  const docsVinculables = useMemo(() => {
    const docs = Array.isArray(todosLosDocs) ? todosLosDocs : [];
    const todas = docs.filter(d => d.categoria === "facturas" || d.categoria === "presupuestos");
    const nombreProv = (form.proveedor || "").trim().toLowerCase();
    if (!nombreProv) return todas;
    return [...todas.filter(d => (d.emisor || "").trim().toLowerCase() === nombreProv), ...todas.filter(d => (d.emisor || "").trim().toLowerCase() !== nombreProv)];
  }, [todosLosDocs, form.proveedor]);

  const updFactura = (k, v) => upd("factura", { ...(form.factura || {}), [k]: v });

  // Chips de artículos sugeridos del presupuesto
  const chipsSugeridos = useMemo(() => {
    if (esEdit || !conceptosPres.length) return [];
    const base = totalInscritos || 0;
    const PATRONES = [
      { re: /medalla|finisher/i,                          icon: "🏅" },
      { re: /dorsal/i,                                    icon: "🔢" },
      { re: /avituall|nutrici|agua|gel|isotónico/i,       icon: "🍎" },
      { re: /camiseta.*voluntario|voluntario.*camiseta/i, icon: "👕" },
      { re: /trofeo|podio|premio/i,                       icon: "🏆" },
      { re: /cron[eo]metr/i,                              icon: "⏱️" },
      { re: /señali[zs]|baliz/i,                          icon: "🚩" },
    ];
    return conceptosPres.reduce((chips, concepto) => {
      const patron = PATRONES.find(p => p.re.test(concepto.nombre));
      if (!patron) return chips;
      const { precio, esFijo, costeTotal } = calcPrecioUnitario(concepto, material);
      const cantidad = esFijo ? 1 : Math.max(1, base);
      const importe  = esFijo ? costeTotal : cantidad * precio;
      chips.push({ concepto, icon: patron.icon, label: concepto.nombre, cantidad, precio, esFijo, costeTotal, importe,
        yaPedido: pedidosActivos.some(p => p.estado !== "borrador" && p.articulos?.some(a => patron.re.test(a.nombre))),
        yaEnForm: form.articulos.some(a => a.conceptoId === concepto.id) });
      return chips;
    }, []);
  }, [esEdit, conceptosPres, material, totalInscritos, pedidosActivos, form.articulos]);

  const addChip = (chip) => {
    if (chip.yaEnForm) return;
    const art = { nombre: chip.concepto.nombre, conceptoId: chip.concepto.id, cantidad: chip.cantidad, precioUnit: chip.precio, esFijo: chip.esFijo, costeTotal: chip.costeTotal || 0, fuente: "presupuesto" };
    setForm(p => ({ ...p, nombre: p.nombre || chip.concepto.nombre, articulos: [...p.articulos.filter(a => a.nombre !== ""), art] }));
  };

  return createPortal(
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-ficha" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">{esEdit ? "✏️ Editar pedido" : "🛒 Nuevo pedido"}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><span aria-hidden="true">✕</span></button>
        </div>
        <div className="modal-body" style={{ gap: ".65rem" }}>

          {/* Datos básicos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label className="fl">Nombre del pedido *</label>
              <input className="inp" value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="ej. Medallas finisher 2026" />
            </div>
            <div>
              <label className="fl">Proveedor</label>
              <select className="inp"
                value={form.proveedorId ?? (form.proveedor ? (proveedores.find(p => p.nombre === form.proveedor)?.id ?? "") : "")}
                onChange={e => {
                  const id   = e.target.value === "" ? null : e.target.value === "__otro__" ? null : Number(e.target.value);
                  const cont = proveedores.find(p => p.id === id);
                  upd("proveedorId", id);
                  upd("proveedor", cont ? cont.nombre : (e.target.value === "__otro__" ? form.proveedor : ""));
                }}>
                <option value="">Sin asignar</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                <option value="__otro__">Otro (escribir abajo)</option>
              </select>
              {form.proveedorId == null && form.proveedor && !proveedores.find(p => p.nombre === form.proveedor) && (
                <input className="inp" style={{ marginTop: ".4rem" }} placeholder="Nombre del proveedor" value={form.proveedor} onChange={e => upd("proveedor", e.target.value)} />
              )}
            </div>
            <div>
              <label className="fl" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                📅 Fecha límite para realizar el pedido
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", padding: ".05rem .3rem", borderRadius: 10, background: "rgba(167,139,250,.15)", color: "var(--violet)", border: "1px solid rgba(167,139,250,.25)" }}>→ hito automático</span>
              </label>
              <input className="inp" type="date" value={form.fechaLimitePedido || ""} onChange={e => upd("fechaLimitePedido", e.target.value)} />
              {form.fechaLimitePedido && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--violet)", marginTop: ".25rem" }}>✓ Se creará un hito «🛒 Pedido: {form.nombre || "este pedido"}» en Proyecto → Hitos</div>}
            </div>
            <div>
              <label className="fl">Fecha entrega esperada</label>
              <input className="inp" type="date" value={form.fechaEntrega} onChange={e => upd("fechaEntrega", e.target.value)} />
            </div>
          </div>

          {/* Chips sugeridos */}
          {!esEdit && chipsSugeridos.length > 0 && (
            <div style={{ padding: ".6rem .75rem", borderRadius: 8, background: "rgba(34,211,238,.05)", border: "1px solid rgba(34,211,238,.18)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: ".45rem" }}>⚡ Artículos del presupuesto — clic para añadir</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem" }}>
                {chipsSugeridos.map(chip => {
                  const fmtImp = chip.importe > 0 ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(chip.importe) : null;
                  const label  = chip.esFijo ? `${chip.icon} ${chip.label}${fmtImp ? " · " + fmtImp : ""}` : `${chip.icon} ${chip.label} · ×${chip.cantidad}${fmtImp ? " · " + fmtImp : ""}`;
                  if (chip.yaPedido) return <span key={chip.concepto.id} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".22rem .55rem", borderRadius: 20, cursor: "default", background: "var(--green-dim)", color: "var(--green)", border: "1px solid rgba(52,211,153,.25)", textDecoration: "line-through", opacity: .7 }} title="Ya existe un pedido activo">{chip.icon} {chip.label} ✓</span>;
                  if (chip.yaEnForm) return <span key={chip.concepto.id} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".22rem .55rem", borderRadius: 20, cursor: "default", background: "rgba(167,139,250,.15)", color: "var(--violet)", border: "1px solid rgba(167,139,250,.3)" }}>{chip.icon} {chip.label} ↓</span>;
                  return <button key={chip.concepto.id} onClick={() => addChip(chip)} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".22rem .55rem", borderRadius: 20, cursor: "pointer", background: "var(--surface3)", color: "var(--text)", border: "1px solid var(--border)", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(34,211,238,.12)"; e.currentTarget.style.borderColor = "rgba(34,211,238,.4)"; e.currentTarget.style.color = "var(--cyan)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--surface3)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text)"; }}>{label}</button>;
                })}
              </div>
              {totalInscritos > 0 && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", color: "var(--text-dim)", marginTop: ".35rem" }}>Base: {totalInscritos} inscritos</div>}
            </div>
          )}

          {/* Artículos */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".4rem" }}>
              <label className="fl" style={{ margin: 0 }}>Artículos</label>
              <div style={{ display: "flex", gap: ".3rem" }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--fs-xs)", color: "var(--cyan)" }} onClick={() => { const mat = material?.[0]; const c = mat?.presupuestoConceptoId ? conceptosPres.find(cc => cc.id === mat.presupuestoConceptoId) : null; const { precio } = c ? calcPrecioUnitario(c, material) : { precio: 0 }; addArtDef({ nombre: mat?.nombre || "", materialId: mat?.id || null, cantidad: 1, precioUnit: precio, fuente: "material" }); }}>+ de Inventario</button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--fs-xs)", color: "var(--violet)" }} onClick={() => { const c = conceptosPres?.[0]; const { precio, esFijo, costeTotal } = c ? calcPrecioUnitario(c, material) : { precio: 0, esFijo: false, costeTotal: 0 }; addArtDef({ nombre: c?.nombre || "", conceptoId: c?.id || null, cantidad: 1, precioUnit: precio, esFijo, costeTotal, fuente: "presupuesto" }); }}>+ de Presupuesto</button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--fs-xs)" }} onClick={() => addArtDef({ nombre: "", cantidad: 1, precioUnit: 0, fuente: "manual" })}>+ Manual</button>
              </div>
            </div>
            {form.articulos.map((a, i) => (
              <div key={i} style={{ background: "var(--surface2)", borderRadius: 7, padding: ".5rem .65rem", marginBottom: ".4rem", borderLeft: `3px solid ${a.fuente === "material" ? "var(--cyan)" : a.fuente === "presupuesto" ? "var(--violet)" : "var(--border)"}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 28px", gap: ".35rem", alignItems: "end", marginBottom: ".3rem" }}>
                  <div>
                    <label className="fl" style={{ display: "flex", alignItems: "center", gap: ".3rem" }}>
                      Artículo
                      {a.fuente === "material"    && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", padding: ".06rem .3rem", borderRadius: 10, background: "var(--cyan-dim)", color: "var(--cyan)" }}>📦 Inventario</span>}
                      {a.fuente === "presupuesto" && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", padding: ".06rem .3rem", borderRadius: 10, background: "var(--violet-dim)", color: "var(--violet)" }}>💰 Presupuesto</span>}
                    </label>
                    {a.fuente === "material" && material.length > 0 ? (
                      <select className="inp inp-sm" value={a.materialId || ""} onChange={e => {
                        const mat = material.find(m => m.id === parseInt(e.target.value));
                        const c   = mat?.presupuestoConceptoId ? conceptosPres.find(cc => cc.id === mat.presupuestoConceptoId) : null;
                        const { precio, esFijo } = c ? calcPrecioUnitario(c, material) : { precio: a.precioUnit, esFijo: false };
                        updArt(i, "materialId", parseInt(e.target.value)); updArt(i, "nombre", mat?.nombre || ""); updArt(i, "esFijo", esFijo);
                        if (precio > 0) updArt(i, "precioUnit", precio);
                      }}>{material.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select>
                    ) : a.fuente === "presupuesto" && conceptosPres.length > 0 ? (
                      <select className="inp inp-sm" value={a.conceptoId || ""} onChange={e => {
                        const c = conceptosPres.find(cc => cc.id === parseInt(e.target.value));
                        const { precio, esFijo, costeTotal } = c ? calcPrecioUnitario(c, material) : { precio: 0, esFijo: false, costeTotal: 0 };
                        updArt(i, "conceptoId", parseInt(e.target.value)); updArt(i, "nombre", c?.nombre || ""); updArt(i, "esFijo", esFijo); updArt(i, "costeTotal", costeTotal); updArt(i, "precioUnit", precio);
                      }}>{conceptosPres.map(c => <option key={c.id} value={c.id}>[{c.tipo === "variable" ? "var" : "fijo"}] {c.nombre}</option>)}</select>
                    ) : (
                      <input className="inp inp-sm" value={a.nombre} onChange={e => updArt(i, "nombre", e.target.value)} placeholder="Nombre del artículo" />
                    )}
                  </div>
                  <div>
                    <label className="fl">Cant.</label>
                    <input className="inp inp-sm inp-mono" type="number" min="1" value={a.cantidad} onChange={e => { const qty = Math.max(1, parseInt(e.target.value) || 1); updArt(i, "cantidad", qty); if (a.esFijo && (a.costeTotal || 0) > 0) updArt(i, "precioUnit", (a.costeTotal || 0) / qty); }} />
                  </div>
                  <div>
                    <label className="fl" style={{ color: a.esFijo ? "var(--amber)" : undefined }}>{a.esFijo ? "Total lote (€)" : "€/ud"}</label>
                    <input className="inp inp-sm inp-mono" type="number" min="0" step="0.01" value={a.esFijo ? (a.costeTotal || 0) : a.precioUnit} style={{ borderColor: a.esFijo ? "rgba(251,191,36,.4)" : undefined }}
                      onChange={e => { const v = parseFloat(e.target.value) || 0; if (a.esFijo) { updArt(i, "costeTotal", v); updArt(i, "precioUnit", a.cantidad > 0 ? v / a.cantidad : 0); } else updArt(i, "precioUnit", v); }} />
                  </div>
                  <button className="btn btn-red btn-sm" style={{ marginBottom: 1, padding: ".25rem .4rem" }} disabled={form.articulos.length <= 1} onClick={() => delArt(i)}>✕</button>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: ".1rem" }}>
                  {a.esFijo && <span style={{ color: "var(--amber)", fontSize: "var(--fs-xs)" }}>💡 Coste total fijo ({a.cantidad > 0 ? fmtEur((a.costeTotal || 0) / a.cantidad) : "—"}/ud × {a.cantidad} ud)</span>}
                  <span style={{ marginLeft: "auto" }}>Subtotal: {fmtEur(a.esFijo ? (a.costeTotal || 0) : a.cantidad * (a.precioUnit || 0))}</span>
                </div>
              </div>
            ))}
            <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 800, color: "var(--cyan)", marginTop: ".35rem" }}>Total pedido: {fmtEur(importeCalc)}</div>
          </div>

          {/* Factura */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: ".6rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".4rem" }}>🧾 Factura (opcional)</div>
            <div style={{ marginBottom: ".55rem" }}>
              <label className="fl" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                Vincular con factura/presupuesto de Documentos
                <Tooltip text="Selecciona una factura o presupuesto del módulo Documentos."><TooltipIcon size={11} /></Tooltip>
              </label>
              <select className="inp inp-sm" value={form.factura?.docId || ""} onChange={e => {
                const docId = e.target.value;
                if (!docId) { updFactura("docId", null); return; }
                const doc = docsVinculables.find(d => d.id === docId);
                if (!doc) return;
                const imp = doc.importe != null ? (typeof doc.importe === "number" ? doc.importe : parseFloat(String(doc.importe).replace(",", ".")) || 0) : (form.factura?.importe || 0);
                upd("factura", { ...(form.factura || {}), docId, numero: doc.nombreDisplay || doc.nombre || form.factura?.numero || "", importe: imp, blobUrl: doc.blobUrl || null });
              }}>
                <option value="">— Sin vincular —</option>
                {docsVinculables.length === 0 && <option disabled value="">No hay facturas ni presupuestos subidos en Documentos</option>}
                {docsVinculables.map(doc => {
                  const esMismoProv = form.proveedor && (doc.emisor || "").trim().toLowerCase() === form.proveedor.trim().toLowerCase();
                  const catIcon = doc.categoria === "presupuestos" ? "💰" : "🧾";
                  const imp = doc.importe != null ? ` · ${new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(typeof doc.importe === "number" ? doc.importe : parseFloat(String(doc.importe).replace(",", ".")) || 0)}` : "";
                  return <option key={doc.id} value={doc.id}>{esMismoProv ? "★ " : ""}{doc.categoria === "presupuestos" ? "💰" : "🧾"} {doc.nombreDisplay || doc.nombre}{doc.emisor ? ` (${doc.emisor})` : ""}{imp}</option>;
                })}
              </select>
              {form.factura?.docId && form.factura?.blobUrl && <a href={form.factura.blobUrl} target="_blank" rel="noreferrer" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#38bdf8", display: "block", marginTop: ".2rem" }}>📄 Ver documento adjunto</a>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".4rem" }}>
              <div><label className="fl">Nº factura</label><input className="inp inp-sm inp-mono" value={form.factura?.numero || ""} onChange={e => updFactura("numero", e.target.value)} placeholder="FAC-2026-001" /></div>
              <div><label className="fl">Importe real (€)</label><input className="inp inp-sm inp-mono" type="number" min="0" step="0.01" value={form.factura?.importe || ""} onChange={e => updFactura("importe", parseFloat(e.target.value) || 0)} placeholder={fmtEur(importeCalc)} /></div>
              <div><label className="fl">Estado de pago</label><select className="inp inp-sm" value={form.factura?.estado || "pendiente"} onChange={e => updFactura("estado", e.target.value)}>{ESTADOS_FACTURA.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select></div>
              <div><label className="fl">Fecha factura</label><input className="inp inp-sm" type="date" value={form.factura?.fecha || ""} onChange={e => updFactura("fecha", e.target.value)} /></div>
            </div>
            {form.factura?.importe > 0 && importeCalc > 0 && (
              <div style={{ marginTop: ".4rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                Desviación vs estimado:{" "}
                <span style={{ fontWeight: 700, color: Math.abs(form.factura.importe - importeCalc) < 0.01 ? "var(--green)" : form.factura.importe > importeCalc ? "var(--red)" : "var(--green)" }}>
                  {form.factura.importe > importeCalc ? "+" : ""}{fmtEur(form.factura.importe - importeCalc)} ({((form.factura.importe - importeCalc) / importeCalc * 100).toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          <div><label className="fl">Notas</label><textarea className="inp" rows={2} value={form.notas} onChange={e => upd("notas", e.target.value)} placeholder="Condiciones, contacto del proveedor, observaciones…" /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!form.nombre.trim()} style={{ opacity: form.nombre.trim() ? 1 : .5 }} onClick={guardar}>
            {esEdit ? "Guardar cambios" : "Crear pedido"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
