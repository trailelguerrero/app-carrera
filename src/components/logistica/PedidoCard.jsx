import { createPortal } from "react-dom";
import { fmtEur2 as fmtEur } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  ESTADOS_PEDIDO, ESTADOS_FACTURA,
  syncStockMaterial, syncHitoPedido, resolverProveedor, calcPrecioUnitario,
} from "./logisticaHelpers";

export function PedidoCard({
  p, expanded, onToggle, onEdit, onDelete,
  cont, material, setMaterial, conceptosPres, setPedidos,
}) {
  const est = ESTADOS_PEDIDO.find(e => e.id === p.estado) || ESTADOS_PEDIDO[0];
  const isExp = expanded;
  const desvPct = p.importeEstimado && p.factura?.importe
    ? ((p.factura.importe - p.importeEstimado) / p.importeEstimado * 100)
    : null;
  const proveedores = (Array.isArray(cont) ? cont : []).filter(c => c.tipo === "proveedor");

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Cabecera clickable */}
      <div
        style={{ display: "flex", alignItems: "center", gap: ".6rem", padding: ".7rem .9rem", cursor: "pointer", borderLeft: `3px solid ${est.color}` }}
        onClick={onToggle}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>{p.nombre}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: ".1rem" }}>
            {p.proveedor || "Sin proveedor"} · {p.articulos?.length || 0} artículo{p.articulos?.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "var(--fs-base)", color: est.color }}>
            {fmtEur(p.importeTotal || 0)}
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".1rem .4rem", borderRadius: 4, background: est.bg, color: est.color, fontWeight: 700 }}>
            {est.label}
          </span>
        </div>
        <span style={{ color: "var(--text-dim)", fontSize: "var(--fs-sm)", flexShrink: 0 }}>{isExp ? "▲" : "▼"}</span>
      </div>

      {/* Detalle expandible */}
      {isExp && (
        <div style={{ borderTop: "1px solid var(--border)", padding: ".75rem .9rem", display: "flex", flexDirection: "column", gap: ".6rem" }}>
          {/* Tarjeta proveedor */}
          {(() => {
            const contacto = resolverProveedor(p, cont);
            if (!contacto) {
              return (p.proveedor && !proveedores.find(pv => pv.nombre === p.proveedor)) ? (
                <div style={{ padding: ".5rem .7rem", borderRadius: 8, background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.2)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--amber)" }}>
                    ⚠ Proveedor «{p.proveedor}» no está en el directorio
                  </div>
                </div>
              ) : null;
            }
            return (
              <div style={{ padding: ".55rem .75rem", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: ".75rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--fs-sm)", display: "flex", alignItems: "center", gap: ".4rem" }}>
                    🏢 {contacto.nombre}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".05rem .3rem", borderRadius: 10, background: "rgba(34,211,238,.1)", color: "var(--cyan)", border: "1px solid rgba(34,211,238,.2)" }}>directorio</span>
                  </div>
                  {contacto.rol && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: ".1rem" }}>{contacto.rol}</div>}
                  {contacto.notas && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: ".2rem", fontStyle: "italic" }}>{contacto.notas}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: ".3rem", flexShrink: 0 }}>
                  {contacto.telefono && <a href={`tel:${contacto.telefono}`} style={{ display: "flex", alignItems: "center", gap: ".35rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--cyan)", textDecoration: "none", padding: ".25rem .5rem", borderRadius: 6, background: "rgba(34,211,238,.06)", border: "1px solid rgba(34,211,238,.18)" }}>📞 {contacto.telefono}</a>}
                  {contacto.email && <a href={`mailto:${contacto.email}`} style={{ display: "flex", alignItems: "center", gap: ".35rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--violet)", textDecoration: "none", padding: ".25rem .5rem", borderRadius: 6, background: "rgba(167,139,250,.06)", border: "1px solid rgba(167,139,250,.18)" }}>✉ {contacto.email}</a>}
                </div>
              </div>
            );
          })()}

          {/* Artículos */}
          {(p.articulos || []).length > 0 && (
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".35rem" }}>Artículos</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Artículo", "Cant.", "€/ud", "Total"].map((h, i) => (
                      <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: ".2rem .4rem", fontWeight: 600, color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.articulos.map((a, i) => {
                    const c = a.conceptoId ? conceptosPres.find(cc => cc.id === a.conceptoId) : null;
                    const precioActual = c?.tipo === "variable" ? calcPrecioUnitario(c, material).precio : null;
                    const hayDesv = precioActual !== null && Math.abs((a.precioUnit || 0) - precioActual) > 0.001;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                        <td style={{ padding: ".3rem .4rem" }}>
                          {a.nombre}
                          {a.stockAcreditado && a.materialId && <span style={{ marginLeft: ".4rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", padding: ".05rem .3rem", borderRadius: 10, background: "rgba(52,211,153,.15)", color: "var(--green)", border: "1px solid rgba(52,211,153,.25)", fontWeight: 700, verticalAlign: "middle" }} title="Stock acreditado">+stock ✓</span>}
                          {!a.stockAcreditado && a.materialId && p.estado === "recibido" && <span style={{ marginLeft: ".4rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", padding: ".05rem .3rem", borderRadius: 10, background: "rgba(251,191,36,.12)", color: "var(--amber)", border: "1px solid rgba(251,191,36,.25)", fontWeight: 700, verticalAlign: "middle" }} title="Pendiente acreditar">stock⚠</span>}
                        </td>
                        <td style={{ textAlign: "right", padding: ".3rem .4rem", fontWeight: 700 }}>{a.cantidad}</td>
                        <td style={{ textAlign: "right", padding: ".3rem .4rem", color: "var(--text-muted)" }}>
                          {fmtEur(a.precioUnit)}
                          {hayDesv && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--amber)", marginLeft: ".3rem", fontWeight: 700 }}>→ {fmtEur(precioActual)}</span>}
                        </td>
                        <td style={{ textAlign: "right", padding: ".3rem .4rem", fontWeight: 700, color: "var(--cyan)" }}>
                          {fmtEur(a.esFijo ? (a.costeTotal || 0) : a.cantidad * (a.precioUnit || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Fechas + Factura */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
            {(() => {
              const dias    = p.fechaLimitePedido ? Math.ceil((new Date(p.fechaLimitePedido) - new Date()) / 86400000) : null;
              const vencida = dias !== null && dias < 0;
              const urgente = dias !== null && dias >= 0 && dias <= 7;
              const color   = vencida ? "var(--red)" : urgente ? "var(--orange)" : "var(--violet)";
              const bg      = vencida ? "rgba(248,113,113,.08)" : urgente ? "rgba(251,146,60,.08)" : "rgba(167,139,250,.06)";
              return (
                <div style={{ padding: ".55rem .7rem", borderRadius: 8, background: p.fechaLimitePedido ? bg : "var(--surface2)", border: `1px solid ${p.fechaLimitePedido ? color + "44" : "var(--border)"}` }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: ".25rem", display: "flex", alignItems: "center", gap: ".3rem" }}>
                    ⏰ Límite pedido
                    {p.fechaLimitePedido && <span style={{ fontSize: "var(--fs-2xs)", padding: ".05rem .25rem", borderRadius: 10, background: color + "22", color, border: `1px solid ${color}44`, fontWeight: 700 }}>→ hito</span>}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 700, color: p.fechaLimitePedido ? color : "var(--text-dim)" }}>
                    {p.fechaLimitePedido || "—"}
                  </div>
                  {dias !== null && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color, marginTop: ".1rem" }}>{vencida ? `⚠ Venció hace ${Math.abs(dias)}d` : dias === 0 ? "⚡ HOY" : `${dias}d restantes`}</div>}
                </div>
              );
            })()}
            <div style={{ padding: ".55rem .7rem", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: ".25rem" }}>📅 Entrega esperada</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 700 }}>{p.fechaEntrega || "—"}</div>
            </div>
            <div style={{ padding: ".55rem .7rem", borderRadius: 8, background: p.factura?.numero ? "var(--green-dim)" : "var(--surface2)", border: `1px solid ${p.factura?.numero ? "rgba(52,211,153,.25)" : "var(--border)"}` }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: ".25rem" }}>🧾 Factura</div>
              {p.factura?.numero ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700 }}>{p.factura.numero}</span>
                    {p.factura.blobUrl && <a href={p.factura.blobUrl} target="_blank" rel="noreferrer" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#38bdf8", textDecoration: "underline" }}>📄 Ver PDF</a>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: ".4rem", marginTop: ".1rem" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>{fmtEur(p.factura.importe)}</span>
                    {desvPct !== null && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: Math.abs(desvPct) <= 0.5 ? "var(--green)" : desvPct > 0 ? "var(--red)" : "var(--green)", fontWeight: 700 }}>
                        {Math.abs(desvPct) <= 0.5 ? "✓ Sin desviación" : `${desvPct > 0 ? "+" : ""}${desvPct.toFixed(1)}% vs estimado`}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: ".15rem" }}>
                    {ESTADOS_FACTURA.map(e => (
                      <span key={e.id} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".08rem .35rem", borderRadius: 3, marginRight: ".25rem", fontWeight: 700, cursor: "pointer", background: p.factura.estado === e.id ? e.color + "22" : "transparent", color: p.factura.estado === e.id ? e.color : "var(--text-dim)", border: `1px solid ${p.factura.estado === e.id ? e.color + "44" : "transparent"}` }}
                        onClick={() => setPedidos(prev => prev.map(x => x.id === p.id ? { ...x, factura: { ...x.factura, estado: e.id } } : x))}>
                        {e.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-dim)" }}>Sin factura registrada</div>
              )}
            </div>
          </div>

          {p.notas && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", padding: ".4rem .6rem", background: "var(--surface2)", borderRadius: 6, borderLeft: "2px solid var(--border)" }}>
              {p.notas}
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: "flex", gap: ".4rem", paddingTop: ".25rem", borderTop: "1px solid var(--border)", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden", flex: "1 1 auto" }}>
              {ESTADOS_PEDIDO.map(e => (
                <button key={e.id}
                  style={{ flex: 1, padding: ".28rem .35rem", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, whiteSpace: "nowrap", background: p.estado === e.id ? e.bg : "transparent", color: p.estado === e.id ? e.color : "var(--text-dim)", transition: "background .12s,color .12s" }}
                  onClick={() => {
                    const { pedidoActualizado, materialActualizado } = syncStockMaterial(p, e.id, material);
                    setPedidos(prev => prev.map(x => x.id === p.id ? pedidoActualizado : x));
                    if (setMaterial) setMaterial(materialActualizado);
                    syncHitoPedido(pedidoActualizado);
                    if (e.id === "recibido") {
                      const acreditados = (pedidoActualizado.articulos || []).filter(a => a.materialId && a.stockAcreditado).length;
                      toast.success(acreditados > 0 ? `Pedido recibido · +stock en ${acreditados} material${acreditados !== 1 ? "es" : ""} ✓` : "Pedido marcado como recibido");
                    }
                  }}>
                  {e.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: ".3rem", flexShrink: 0 }}>
              <button style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 7, cursor: "pointer", background: "var(--surface3)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "var(--fs-base)" }} title="Editar pedido" onClick={onEdit}>✏️</button>
              <button style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 7, cursor: "pointer", background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.25)", color: "var(--red)", fontSize: "var(--fs-base)", fontWeight: 700 }} title="Eliminar pedido" onClick={onDelete}>✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
