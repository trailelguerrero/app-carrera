import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { fmtEur2 as fmtEur } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { PedidoCard }     from "@/components/logistica/PedidoCard";
import { ModalPedidoProv } from "@/components/logistica/ModalPedidoProv";
import {
  resolverProveedor, syncHitoPedido, syncStockMaterial,
  calcPrecioUnitario, genPedidoId, ESTADOS_PEDIDO,
} from "@/components/logistica/logisticaHelpers";

// Re-export para retrocompatibilidad (otros módulos importan resolverProveedor desde aquí)
export { resolverProveedor };

export function TabPedidosProv({ pedidos, setPedidos, cont, material = [], setMaterial, conceptosPres = [], totalInscritos, inscritos }) {
  const [modal,    setModal]    = useState(null);
  const [delId,    setDelId]    = useState(null);
  const [expanded, setExpanded] = useState(null);

  const proveedores = (Array.isArray(cont) ? cont : []).filter(c => c.tipo === "proveedor");

  const totalComprometido = pedidos.filter(p => p.estado !== "borrador").reduce((s, p) => s + (p.importeTotal || 0), 0);
  const pendFactura       = pedidos.filter(p => p.estado === "recibido" && !p.factura?.numero).length;

  const pedidosConPrecioDesactualizado = useMemo(() => pedidos.filter(p =>
    (p.articulos || []).some(a => {
      if (!a.conceptoId) return false;
      const c = conceptosPres.find(cc => cc.id === a.conceptoId);
      if (!c || c.tipo !== "variable") return false;
      return Math.abs((a.precioUnit || 0) - calcPrecioUnitario(c, material).precio) > 0.001;
    })
  ), [pedidos, conceptosPres, material]);

  const actualizarPreciosVariables = () => {
    setPedidos(prev => prev.map(p => {
      const arts = (p.articulos || []).map(a => {
        if (!a.conceptoId) return a;
        const c = conceptosPres.find(cc => cc.id === a.conceptoId);
        if (!c || c.tipo !== "variable") return a;
        const precioActual = calcPrecioUnitario(c, material).precio;
        return { ...a, precioUnit: precioActual };
      });
      const nuevoImporte = arts.reduce((s, a) => s + (a.esFijo ? (a.costeTotal || 0) : a.cantidad * (a.precioUnit || 0)), 0);
      return { ...p, articulos: arts, importeTotal: nuevoImporte };
    }));
  };

  const guardar = (p) => {
    if (p.id) {
      const anterior = pedidos.find(x => x.id === p.id);
      const estadoAnt = anterior?.estado ?? p.estado;
      if (estadoAnt !== p.estado && setMaterial) {
        const { pedidoActualizado, materialActualizado } = syncStockMaterial({ ...p, estado: estadoAnt }, p.estado, material);
        setPedidos(prev => prev.map(x => x.id === p.id ? pedidoActualizado : x));
        setMaterial(materialActualizado);
        syncHitoPedido(pedidoActualizado);
      } else {
        setPedidos(prev => prev.map(x => x.id === p.id ? p : x));
        syncHitoPedido(p);
      }
    } else {
      setPedidos(prev => {
        const nuevo = { ...p, id: genPedidoId(prev) };
        syncHitoPedido(nuevo);
        if (nuevo.estado === "recibido" && setMaterial) {
          const { pedidoActualizado, materialActualizado } = syncStockMaterial({ ...nuevo, estado: "borrador" }, "recibido", material);
          setMaterial(materialActualizado);
          return [...prev, pedidoActualizado];
        }
        return [...prev, nuevo];
      });
    }
    setModal(null);
  };

  const eliminar = () => {
    const pedido = pedidos.find(x => x.id === delId);
    if (pedido) syncHitoPedido(pedido, "remove");
    setPedidos(prev => prev.filter(x => x.id !== delId));
    setDelId(null);
  };

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🛒 Pedidos a Proveedores</div>
          <div className="pd">
            {pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""} · {fmtEur(totalComprometido)} comprometido
            {pendFactura > 0 && <span style={{ color: "var(--amber)", marginLeft: ".5rem" }}>· ⚠ {pendFactura} sin factura</span>}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal("nuevo")}>+ Nuevo pedido</button>
      </div>

      {pedidosConPrecioDesactualizado.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem", padding: ".6rem .85rem", borderRadius: 8, marginBottom: ".75rem", background: "rgba(251,191,36,.07)", border: "1px solid rgba(251,191,36,.25)", flexWrap: "wrap" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--amber)" }}>
            ⚡ {pedidosConPrecioDesactualizado.length} pedido{pedidosConPrecioDesactualizado.length > 1 ? "s tienen" : " tiene"} artículos variables con precio desactualizado
            <span style={{ color: "var(--text-muted)", marginLeft: ".4rem" }}>(los inscritos han cambiado desde que se crearon)</span>
          </div>
          <button className="btn btn-sm" style={{ background: "rgba(251,191,36,.15)", color: "var(--amber)", border: "1px solid rgba(251,191,36,.35)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", flexShrink: 0 }} onClick={actualizarPreciosVariables}>
            🔄 Actualizar precios
          </button>
        </div>
      )}

      {pedidos.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)" }}>
          <div style={{ fontSize: "var(--fs-xl)", marginBottom: ".5rem", opacity: .35 }}>🛒</div>
          Sin pedidos aún. Crea el primero con el botón «+ Nuevo pedido».
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
          {pedidos.map(p => (
            <PedidoCard
              key={p.id}
              p={p}
              expanded={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              onEdit={() => setModal(p)}
              onDelete={() => setDelId(p.id)}
              cont={cont}
              material={material}
              setMaterial={setMaterial}
              conceptosPres={conceptosPres}
              setPedidos={setPedidos}
            />
          ))}
        </div>
      )}

      {/* Modal nuevo/editar */}
      {modal && (
        <ModalPedidoProv
          data={modal === "nuevo" ? null : (modal._sugerido ? null : modal)}
          sugerido={modal._sugerido ? modal : null}
          proveedores={proveedores}
          material={material}
          conceptosPres={conceptosPres}
          pedidosActivos={pedidos}
          totalInscritos={totalInscritos}
          inscritos={inscritos}
          onSave={guardar}
          onClose={() => setModal(null)}
        />
      )}

      {/* Confirmar eliminar */}
      {delId && createPortal(
        <div className="modal-backdrop" style={{ zIndex: 200 }} onClick={e => e.target === e.currentTarget && setDelId(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="lp-del-title" style={{ maxWidth: 320, textAlign: "center" }}>
            <div className="modal-body" style={{ paddingTop: "1.5rem" }}>
              <div style={{ fontSize: "var(--fs-xl)", marginBottom: ".5rem" }} aria-hidden="true">⚠️</div>
              <div id="lp-del-title" style={{ fontWeight: 700 }}>¿Eliminar pedido?</div>
              <div className="mono xs muted">Esta acción no se puede deshacer.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDelId(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={eliminar}>Eliminar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
