/**
 * Camisetas.jsx — Orquestador (Tarea 3.4)
 * Gestión de camisetas del evento: resumen, pedido al proveedor,
 * extras/familiares y control de entrega.
 *
 * Estado, cálculos y sub-componentes viven en src/components/camisetas/.
 */
import { createPortal } from "react-dom";
import { useState, useMemo } from "react";
import { useData } from "@/hooks/useData";
import { toast } from "@/lib/toast";
import { genIdNum, fmtEur2, scrollMainToTop } from "@/lib/utils";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { blockCls as cls } from "@/lib/blockStyles";
import { SK_VOL_VOLUNTARIOS, SK_CAM_VENTA_PUBLICO } from "@/constants/storageKeys";

import {
  LS, TALLAS, TALLAS_NINO, CORREDORES_DEFAULT, NINO_DEFAULT,
  PEDIDOS_DEFAULT, COSTE_DEFAULT, FUENTES_DEFAULT, CAM_CSS,
} from "@/components/camisetas/camisetasConstants";

// ── CAM-01: helper — genera preview de tallas de voluntarios ─────────────────
function calcPreviewTallas(vols) {
  const mapa = {};
  TALLAS.forEach(t => { mapa[t] = 0; });
  vols.forEach(v => { if (v.talla && mapa[v.talla] !== undefined) mapa[v.talla]++; });
  return TALLAS.map(t => ({ talla: t, cantidad: mapa[t] })).filter(r => r.cantidad > 0);
}
import { TabDashboard }  from "@/components/camisetas/TabDashboard";
import { TabPedidos }    from "@/components/camisetas/TabPedidos";
import { TabTallas }     from "@/components/camisetas/TabTallas";
import { TabChecklist }  from "@/components/camisetas/TabChecklist";
import { FichaPedido }   from "@/components/camisetas/FichaPedido";
import { ModalPedido }   from "@/components/camisetas/ModalPedido";

// ── CAM-02: Tab "Reparto del día" ────────────────────────────────────────────
function TabReparto({ pedidos, updateLinea, rawVols }) {
  const [busqueda, setBusqueda] = useState("");
  const [soloSinEntregar, setSoloSinEntregar] = useState(true);

  // Construir lista plana de todas las líneas con su pedido padre
  const todasLineas = useMemo(() => {
    const vols = Array.isArray(rawVols) ? rawVols : [];
    return pedidos.flatMap(p =>
      p.lineas.map(l => {
        // Buscar puesto del voluntario si es tipo voluntario
        let puestoNombre = "";
        if (l.tipo === "voluntario" || l.tipo === "extra-voluntario" || l._esImportacionVol) {
          const vol = vols.find(v => {
            const nc = ((v.nombre || "") + " " + (v.apellidos || "")).toLowerCase().trim();
            const np = (p.nombre || "").toLowerCase().trim();
            return nc === np || nc.includes(np) || np.includes(nc);
          });
          if (vol?.puestoId) {
            // puestoNombre se dejará vacío aquí; la info de puesto viene de SK_VOL_PUESTOS que no se tiene aquí
            puestoNombre = `Puesto #${vol.puestoId}`;
          }
        }
        return {
          ...l,
          pedNombre: p.nombre,
          pedTelefono: p.telefono || "",
          pedId: p.id,
          _puestoNombre: puestoNombre,
        };
      })
    );
  }, [pedidos, rawVols]);

  const filtradas = useMemo(() => {
    let lista = todasLineas;
    if (soloSinEntregar) lista = lista.filter(l => (l.estadoEntrega || "pendiente") !== "entregado");
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(l =>
        (l.pedNombre || "").toLowerCase().includes(q) ||
        (l.pedTelefono || "").includes(q) ||
        (l.talla || "").toLowerCase().includes(q)
      );
    }
    // Ordenar: voluntarios primero (por puesto), luego corredores (por tipo/talla), resto
    return [...lista].sort((a, b) => {
      const tipoOrd = t => t === "voluntario" || t === "extra-voluntario" ? 0 : t === "corredor" ? 1 : 2;
      if (tipoOrd(a.tipo) !== tipoOrd(b.tipo)) return tipoOrd(a.tipo) - tipoOrd(b.tipo);
      return (a._puestoNombre || "").localeCompare(b._puestoNombre || "") ||
             (a.pedNombre || "").localeCompare(b.pedNombre || "");
    });
  }, [todasLineas, soloSinEntregar, busqueda]);

  const totalPendientes = todasLineas.filter(l => (l.estadoEntrega || "pendiente") !== "entregado").length;
  const totalEntregados = todasLineas.filter(l => l.estadoEntrega === "entregado").length;
  const pct = todasLineas.length > 0 ? Math.round((totalEntregados / todasLineas.length) * 100) : 0;

  if (todasLineas.length === 0) {
    return (
      <div className="ph" style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, gap: ".5rem" }}>
        <div style={{ fontSize: "var(--fs-xl)" }}>📦</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
          No hay camisetas registradas todavía.
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
          Añade pedidos en la pestaña "Extras y familiares" o importa las tallas de voluntarios.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="ph">
        <div>
          <div className="pt">📦 Reparto del día</div>
          <div className="pd">{totalPendientes} pendientes · {totalEntregados} entregadas · {pct}% completado</div>
        </div>
      </div>

      {/* ── Barra de progreso ── */}
      <div style={{ height: 6, background: "var(--surface2)", borderRadius: 4, margin: "0 0 .85rem", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: pct === 100 ? "var(--green)" : "linear-gradient(90deg, var(--cyan), var(--primary))",
          borderRadius: 4, transition: "width .4s ease",
        }} />
      </div>

      {/* ── Filtros ── */}
      <div style={{ display: "flex", gap: ".6rem", alignItems: "center", marginBottom: ".75rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <input
            className="inp"
            placeholder="🔍 Buscar por nombre, teléfono o talla..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ paddingRight: busqueda ? "2rem" : undefined }}
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} style={{
              position: "absolute", right: ".5rem", top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "var(--fs-sm)",
            }}>×</button>
          )}
        </div>
        <button
          className={`btn btn-sm${soloSinEntregar ? " btn-amber" : " btn-ghost"}`}
          onClick={() => setSoloSinEntregar(v => !v)}
        >
          {soloSinEntregar ? "⏳ Solo pendientes" : "👁 Todas"}
        </button>
      </div>

      {/* ── Lista ── */}
      {filtradas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
          {soloSinEntregar && totalPendientes === 0
            ? "🎉 ¡Todas las camisetas han sido entregadas!"
            : "No hay resultados para esta búsqueda."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
          {filtradas.map((l, i) => {
            const entregado = l.estadoEntrega === "entregado";
            const tipoColor = l.tipo === "voluntario" || l.tipo === "extra-voluntario"
              ? "var(--cyan)" : l.tipo === "corredor" ? "var(--violet)" : "var(--green)";
            const tipoLabel = l.tipo === "voluntario" || l.tipo === "extra-voluntario"
              ? "Voluntario" : l.tipo === "corredor" ? "Corredor" : "Extra";
            return (
              <div key={`${l.pedId}-${l.id}-${i}`} style={{
                display: "flex", alignItems: "center", gap: ".75rem",
                padding: ".65rem .85rem", borderRadius: 8,
                background: entregado ? "rgba(52,211,153,0.04)" : "var(--surface2)",
                border: `1px solid ${entregado ? "rgba(52,211,153,0.2)" : "var(--border)"}`,
                opacity: entregado ? 0.6 : 1,
                transition: "all .15s",
              }}>
                {/* Checkbox táctil grande */}
                <button
                  onClick={() => updateLinea(l.pedId, l.id, "estadoEntrega", entregado ? "pendiente" : "entregado")}
                  title={entregado ? "Marcar como pendiente" : "Marcar como entregada"}
                  style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    border: `2px solid ${entregado ? "var(--green)" : "var(--border-light)"}`,
                    background: entregado ? "var(--green-dim)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all .15s", fontSize: "var(--fs-sm)",
                  }}
                >
                  {entregado ? <span style={{ color: "var(--green)", fontWeight: 900 }}>✓</span> : null}
                </button>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".4rem", marginBottom: ".15rem", flexWrap: "wrap" }}>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--fs-xs)",
                      color: tipoColor, background: tipoColor + "18",
                      border: `1px solid ${tipoColor}30`, padding: ".05rem .3rem", borderRadius: 3,
                    }}>
                      {tipoLabel}
                    </span>
                    {l._puestoNombre && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
                        {l._puestoNombre}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)", color: entregado ? "var(--text-muted)" : "var(--text)", textDecoration: entregado ? "line-through" : "none" }}>
                    {l.pedNombre || "—"}
                  </div>
                  {l.pedTelefono && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
                      {l.pedTelefono}
                    </div>
                  )}
                </div>

                {/* Talla + cantidad */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontWeight: 800,
                    fontSize: "var(--fs-base)", color: entregado ? "var(--text-muted)" : "var(--text)",
                  }}>
                    {l.talla || "?"}
                  </div>
                  {l.cantidad > 1 && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
                      × {l.cantidad}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CAM-01: Modal de preview e importación de tallas de voluntarios ────────────
function ModalImportarTallasVol({ voluntariosConfirmados, setPedidos, pedidos, onClose }) {
  const preview = calcPreviewTallas(voluntariosConfirmados);
  const totalVols = voluntariosConfirmados.length;
  const sinTalla  = voluntariosConfirmados.filter(v => !v.talla).length;

  const confirmar = () => {
    if (preview.length === 0) { onClose(); return; }

    // Buscar si ya existe un pedido "bloque voluntarios importado"
    const NOMBRE_BLOQUE = "Voluntarios (importación automática)";
    const existente = pedidos.find(p => p._esImportacionVol === true);

    const lineas = preview.map((r, i) => ({
      id: Date.now() + i + 1,
      tipo: "voluntario",
      talla: r.talla,
      cantidad: r.cantidad,
      precioVenta: 0,
      estadoPago: "regalo",
      estadoEntrega: "pendiente",
    }));

    if (existente) {
      // Actualizar el bloque existente con las nuevas cantidades
      setPedidos(prev => prev.map(p =>
        p._esImportacionVol ? { ...p, lineas, notas: `Actualizado el ${new Date().toLocaleDateString("es-ES")}` } : p
      ));
      import("@/lib/toast").then(({ toast }) => toast.success("Tallas de voluntarios actualizadas"));
    } else {
      const nuevo = {
        id: Date.now(),
        nombre: NOMBRE_BLOQUE,
        telefono: "",
        email: "",
        notas: `Importado el ${new Date().toLocaleDateString("es-ES")} · ${totalVols} voluntarios confirmados`,
        _esImportacionVol: true,
        lineas,
      };
      setPedidos(prev => [...prev, nuevo]);
      import("@/lib/toast").then(({ toast }) => toast.success(`${totalVols} voluntarios importados en ${preview.length} líneas por talla`));
    }
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "var(--bg)", border: "1px solid #243460", borderRadius: 14,
        width: "100%", maxWidth: 420, overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
      }}>
        {/* Header */}
        <div style={{ padding: "1.1rem 1.4rem .75rem", borderBottom: "1px solid #1e2d50" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "var(--fs-base)", color: "#e8eef8", marginBottom: ".2rem" }}>
            🔄 Importar tallas de voluntarios
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#5a6a8a" }}>
            {totalVols} voluntarios confirmados · {sinTalla > 0 ? `${sinTalla} sin talla asignada` : "todos con talla"}
          </div>
        </div>

        {/* Preview */}
        <div style={{ padding: "1rem 1.4rem" }}>
          {preview.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "1.5rem",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "#5a6a8a",
            }}>
              {totalVols === 0
                ? "No hay voluntarios confirmados todavía."
                : "Ningún voluntario confirmado tiene talla asignada."}
            </div>
          ) : (
            <>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#7a8aaa", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".6rem" }}>
                Preview — líneas que se crearán
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem", marginBottom: ".75rem" }}>
                {preview.map(r => (
                  <div key={r.talla} style={{
                    display: "flex", alignItems: "center", gap: ".4rem",
                    background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)",
                    borderRadius: 6, padding: ".3rem .65rem",
                  }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--fs-sm)", color: "#22d3ee" }}>
                      {r.talla}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#7a8aaa" }}>
                      × {r.cantidad}
                    </span>
                  </div>
                ))}
              </div>
              {sinTalla > 0 && (
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#f59e0b",
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 6, padding: ".4rem .65rem", marginBottom: ".5rem",
                }}>
                  ⚠ {sinTalla} voluntario{sinTalla > 1 ? "s" : ""} sin talla no se incluirá{sinTalla > 1 ? "n" : ""}
                </div>
              )}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#5a6a8a", lineHeight: 1.55 }}>
                Se creará un pedido "<strong style={{ color: "#9aabb8" }}>Voluntarios (importación automática)</strong>" con una línea por talla.
                Estado de pago: <strong style={{ color: "#a78bfa" }}>regalo</strong>.
                Si ya existe, se sobreescribirá con los datos actuales.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: ".75rem 1.4rem", borderTop: "1px solid #1e2d50", display: "flex", justifyContent: "flex-end", gap: ".6rem" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "1px solid #243460", borderRadius: 7,
              padding: ".45rem 1rem", fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: "var(--fs-sm)", color: "#7a8aaa", cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={preview.length === 0}
            style={{
              background: preview.length > 0 ? "rgba(34,211,238,0.15)" : "rgba(34,211,238,0.04)",
              border: `1px solid ${preview.length > 0 ? "rgba(34,211,238,0.4)" : "rgba(34,211,238,0.1)"}`,
              borderRadius: 7, padding: ".45rem 1.1rem",
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: "var(--fs-sm)", color: preview.length > 0 ? "#22d3ee" : "#3a4a6a",
              cursor: preview.length > 0 ? "pointer" : "not-allowed",
            }}
          >
            Importar {preview.length > 0 ? `(${preview.reduce((s, r) => s + r.cantidad, 0)} ud)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [eventCfg, , loadCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [tab, setTab] = useState("dashboard");
  const [vistaSimpleTallas, setVistaSimpleTallas] = useState(true);
  const [rawP, setPedidos, loadP] = useData(LS + "_pedidos", PEDIDOS_DEFAULT);
  const pedidos = Array.isArray(rawP) ? rawP : [];
  const [coste, setCoste, loadCoste] = useData(LS + "_coste", COSTE_DEFAULT);
  const [fechaPedido, setFechaPedido] = useData(LS + "_fecha_pedido", "");
  const [estadoPedido, setEstadoPedido] = useData(LS + "_estado_pedido", "pendiente");
  const [modal, setModal] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [delId, setDelId] = useState(null);
  const [filtroP, setFiltroP] = useState({ pago: "todos", ent: "todos" });
  // CAM-01: modal de preview de importación de tallas de voluntarios
  const [modalImportVol, setModalImportVol] = useState(false);

  // ─── Fuentes externas ───────────────────────────────────────────────────────
  const [rawCorredores, setCorredores, loadCorredores] = useData(LS + "_corredores", CORREDORES_DEFAULT);
  const corredoresExt = (rawCorredores && typeof rawCorredores === "object" && !Array.isArray(rawCorredores))
    ? { ...CORREDORES_DEFAULT, ...rawCorredores } : CORREDORES_DEFAULT;

  const [rawNino, setNino, loadNino] = useData(LS + "_nino", NINO_DEFAULT);
  const ninoExt = (rawNino && typeof rawNino === "object" && !Array.isArray(rawNino))
    ? { ...NINO_DEFAULT, ...rawNino } : NINO_DEFAULT;

  const [precioPlatExt, setPrecioPlatExt] = useData(LS + "_precio_plataforma", { precio: 15 });
  const precioCorrExt = (precioPlatExt?.precio ?? 15);

  const [rawVentaPublico, setVentaPublico, loadVentaPublico] = useData(SK_CAM_VENTA_PUBLICO, { precio: 20, cantidad: 0 });
  const ventaPublico = (rawVentaPublico && typeof rawVentaPublico === "object")
    ? { precio: rawVentaPublico.precio ?? 20, cantidad: rawVentaPublico.cantidad ?? 0 }
    : { precio: 20, cantidad: 0 };

  const [rawVols, , loadVols] = useData(SK_VOL_VOLUNTARIOS, []);
  const [inclPendientes, setInclPendientes, loadInclP] = useData(LS + "_incluir_pendientes", false);
  const [margenSeguridad, setMargenSeguridad, loadMargen] = useData(LS + "_margen_seguridad", 5);
  const [rawFuentes, setFuentesActivas, loadFuentes] = useData(LS + "_fuentes", FUENTES_DEFAULT);
  const fuentesActivas = (rawFuentes && typeof rawFuentes === "object" && !Array.isArray(rawFuentes))
    ? { ...FUENTES_DEFAULT, ...rawFuentes } : FUENTES_DEFAULT;

  const isLoading = loadCfg || loadP || loadCoste || loadCorredores || loadNino || loadVols || loadInclP || loadMargen || loadFuentes || loadVentaPublico;

  // ─── Derivados ──────────────────────────────────────────────────────────────
  const generarPedidosVoluntarios = () => {
    const nombresConPedido = new Set(
      pedidos.flatMap(p =>
        p.lineas.filter(l => l.tipo === "voluntario").map(() =>
          p.nombre.toLowerCase().trim()
        )
      )
    );
    const sinPedido = (Array.isArray(rawVols) ? rawVols : [])
      .filter(v => v.estado !== "cancelado" && v.talla && !nombresConPedido.has(
        `${v.nombre || ""} ${v.apellidos || ""}`.toLowerCase().trim()
      ));
    if (sinPedido.length === 0) { toast.success("Todos los voluntarios con talla ya tienen pedido"); return; }
    const nuevos = sinPedido.map(v => ({
      id: Date.now() + (v.id || Math.random()),
      nombre: `${v.nombre || ""} ${v.apellidos || ""}`.trim(),
      telefono: v.telefono || "", email: v.email || "",
      notas: `Auto-generado desde Voluntarios · ${new Date().toLocaleDateString("es-ES")}`,
      voluntarioId: v.id,
      lineas: [{ id: Date.now() + (v.id || 1) + 1, tipo: "voluntario", talla: v.talla || "M",
        cantidad: 1, precioVenta: 0, estadoPago: "regalo", estadoEntrega: "pendiente" }],
    }));
    setPedidos(prev => [...prev, ...nuevos]);
    toast.success(`${nuevos.length} pedidos generados desde voluntarios`);
  };

  const voluntariosConfirmados = Array.isArray(rawVols) ? rawVols.filter(v => v?.estado === "confirmado" && v?.talla) : [];
  const voluntariosPendientes  = Array.isArray(rawVols) ? rawVols.filter(v => v?.estado === "pendiente"  && v?.talla) : [];
  const voluntariosActivos = inclPendientes
    ? [...voluntariosConfirmados, ...voluntariosPendientes]
    : [...voluntariosConfirmados];

  // ─── Stats calculados ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const uCorExt  = fuentesActivas.corredoresPlat   ? TALLAS.reduce((s, t)      => s + (corredoresExt[t] || 0), 0) : 0;
    const uNinoExt = fuentesActivas.ninoManual        ? TALLAS_NINO.reduce((s, t) => s + (ninoExt[t] || 0),      0) : 0;
    const uVolAuto = fuentesActivas.voluntariosAuto  ? voluntariosActivos.length : 0;
    const extrasLineas = pedidos.flatMap(p => p.lineas);
    const uExtrasCor  = fuentesActivas.extrasCorredor   ? extrasLineas.filter(l => l.tipo === "corredor").reduce((s, l)   => s + l.cantidad, 0) : 0;
    const uExtrasVol  = fuentesActivas.extrasVoluntario ? extrasLineas.filter(l => l.tipo === "voluntario").reduce((s, l) => s + l.cantidad, 0) : 0;
    const uExtrasNino = fuentesActivas.extrasNino       ? extrasLineas.filter(l => l.tipo === "nino").reduce((s, l)       => s + l.cantidad, 0) : 0;
    const totalUnidades = uCorExt + uVolAuto + uExtrasCor + uExtrasVol + uNinoExt + uExtrasNino;

    const iCorExt = uCorExt * precioCorrExt;
    const extrasPagados = extrasLineas.filter(l => l.estadoPago === "pagado" && (
      (l.tipo === "corredor" && fuentesActivas.extrasCorredor) ||
      (l.tipo === "voluntario" && fuentesActivas.extrasVoluntario) ||
      (l.tipo === "nino" && fuentesActivas.extrasNino)
    ));
    const iExtrasReal = extrasPagados.reduce((s, l) => s + l.cantidad * (l.precioVenta || 0), 0);
    const extrasProyectados = extrasLineas.filter(l => (l.estadoPago === "pagado" || l.estadoPago === "pendiente") && (
      (l.tipo === "corredor" && fuentesActivas.extrasCorredor) ||
      (l.tipo === "voluntario" && fuentesActivas.extrasVoluntario) ||
      (l.tipo === "nino" && fuentesActivas.extrasNino)
    ));
    const iExtrasProyectado = extrasProyectados.reduce((s, l) => s + l.cantidad * (l.precioVenta || 0), 0);
    const iVentaPublico  = ventaPublico.cantidad * ventaPublico.precio;
    const gVentaPublico  = ventaPublico.cantidad * (coste.corredor || 0);
    const totalIngresosReal        = (fuentesActivas.corredoresPlat ? iCorExt : 0) + iExtrasReal        + iVentaPublico;
    const totalIngresosProyectado  = (fuentesActivas.corredoresPlat ? iCorExt : 0) + iExtrasProyectado  + iVentaPublico;

    const gCorExt  = uCorExt  * (coste.corredor   || 0);
    const gNinoExt = uNinoExt * (coste.nino        || 0);
    const gVolAuto = uVolAuto * (coste.voluntario  || 0);
    const gExtrasCor  = uExtrasCor  * (coste.corredor   || 0);
    const gExtrasVol  = uExtrasVol  * (coste.voluntario  || 0);
    const gExtrasNino = uExtrasNino * (coste.nino         || 0);
    const totalGastos = gCorExt + gVolAuto + gExtrasCor + gExtrasVol + gNinoExt + gExtrasNino + gVentaPublico;

    const beneficioNetoReal        = totalIngresosReal       - totalGastos;
    const beneficioNetoProyectado  = totalIngresosProyectado - totalGastos;

    const gRegalos = extrasLineas.filter(l => l.estadoPago === "regalo" && (
      (l.tipo === "corredor" && fuentesActivas.extrasCorredor) ||
      (l.tipo === "voluntario" && fuentesActivas.extrasVoluntario) ||
      (l.tipo === "nino" && fuentesActivas.extrasNino)
    )).reduce((s, l) => s + l.cantidad * (coste[l.tipo] || 0), 0);

    const cPendCobro = extrasLineas.filter(l => l.estadoPago === "pendiente" && (
      (l.tipo === "corredor" && fuentesActivas.extrasCorredor) ||
      (l.tipo === "voluntario" && fuentesActivas.extrasVoluntario) ||
      (l.tipo === "nino" && fuentesActivas.extrasNino)
    )).reduce((s, l) => s + l.cantidad * (l.precioVenta || 0), 0);

    return {
      totalUnidades, totalIngresosReal, totalIngresosProyectado,
      totalGastos, beneficioNetoReal, beneficioNetoProyectado,
      uCorExt, uVolAuto, uExtrasCor, uExtrasVol, uNinoExt, uExtrasNino,
      iCorExt, iExtrasReal, iExtrasProyectado, iVentaPublico,
      gRegalos, cPendCobro,
      totalPedidosExtras: pedidos.length,
      pendEnt: extrasLineas.filter(l => l.estadoEntrega === "pendiente").reduce((s, l) => s + l.cantidad, 0),
    };
  }, [pedidos, coste, corredoresExt, ninoExt, voluntariosActivos, precioCorrExt, fuentesActivas, ventaPublico]);

  const totalCorredoresConf = TALLAS.reduce((s, t) => s + (corredoresExt[t] || 0), 0);
  const esEstadoInicial = pedidos.length === 0 && totalCorredoresConf === 0;

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const goToTab    = (tabId, filtro) => { scrollMainToTop(); if (filtro) setFiltroP(filtro); setTab(tabId); };
  const abrirFicha = (p) => { scrollMainToTop(); setFicha(p); };
  const abrirModal = (pd) => { scrollMainToTop(); setModal({ data: pd || null }); };
  const abrirEditar = (p) => { scrollMainToTop(); setFicha(null); setModal({ data: p }); };

  const savePedido = (p) => {
    if (p.id) { setPedidos(prev => prev.map(x => x.id === p.id ? p : x)); toast.success("Pedido actualizado"); }
    else       { setPedidos(prev => [...prev, { ...p, id: genIdNum(pedidos) }]); toast.success("Pedido creado"); }
    setModal(null);
  };
  const deletePedido = () => { setPedidos(prev => prev.filter(x => x.id !== delId)); setDelId(null); setFicha(null); toast.success("Pedido eliminado"); };

  const [, setRawVoluntarios] = useData(SK_VOL_VOLUNTARIOS, []);
  const updateLinea = (pedidoId, lineaIdOrObj, campo, valor) => {
    const esObjeto = typeof lineaIdOrObj === "object" && lineaIdOrObj !== null && campo === undefined;
    if (esObjeto) {
      const lineaNueva = lineaIdOrObj;
      setPedidos(prev => prev.map(p => p.id !== pedidoId ? p : {
        ...p, lineas: p.lineas.map(l => l.id !== lineaNueva.id ? l : { ...l, ...lineaNueva })
      }));
      if ((lineaNueva.tipo === "voluntario" || lineaNueva.tipo === "extra-voluntario") && lineaNueva.estadoEntrega === "entregado") {
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (pedido?.nombre) {
          setRawVoluntarios(prev => (Array.isArray(prev) ? prev : []).map(v => {
            const nc = ((v.nombre || "") + " " + (v.apellidos || "")).toLowerCase().trim();
            const np = (pedido.nombre || "").toLowerCase().trim();
            return (nc === np || nc.includes(np) || np.includes(nc)) ? { ...v, camisetaEntregada: true } : v;
          }), { force: true });
        }
      }
    } else {
      const lineaId = lineaIdOrObj;
      setPedidos(prev => prev.map(p => p.id !== pedidoId ? p : {
        ...p, lineas: p.lineas.map(l => l.id !== lineaId ? l : { ...l, [campo]: valor })
      }));
      if (campo === "estadoEntrega") {
        const pedido = pedidos.find(p => p.id === pedidoId);
        const linea  = pedido?.lineas?.find(l => l.id === lineaId);
        if (pedido?.nombre && (linea?.tipo === "voluntario" || linea?.tipo === "extra-voluntario")) {
          setRawVoluntarios(prev => (Array.isArray(prev) ? prev : []).map(v => {
            const nc = ((v.nombre || "") + " " + (v.apellidos || "")).toLowerCase().trim();
            const np = (pedido.nombre || "").toLowerCase().trim();
            return (nc === np || nc.includes(np) || np.includes(nc)) ? { ...v, camisetaEntregada: valor === "entregado" } : v;
          }), { force: true });
        }
      }
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <style>{CAM_CSS}</style>
        <div className="block-container">
          <div className="block-header">
            <div>
              <h1 className="block-title">👕 Camisetas Extra</h1>
              <div className="block-title-sub">Cargando datos de camisetas...</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
            <div className="teg-spinner"></div>
          </div>
        </div>
      </>
    );
  }

  const TABS = [
    { id: "dashboard", icon: "📊", label: "Resumen",             title: "Visión general del estado de las camisetas" },
    { id: "tallas",    icon: "📐", label: "Pedido al proveedor", title: "Consolida las unidades por talla para pedir al fabricante" },
    { id: "pedidos",   icon: "👕", label: "Extras y familiares", title: "Pedidos individuales: staff, familiares y personas fuera de plataforma" },
    { id: "checklist", icon: "📬", label: "Entrega",             title: "Control de entrega el día del evento" },
    { id: "reparto",   icon: "📦", label: "Reparto",             title: "Lista de camisetas pendientes de entregar — para el día del evento" },
  ];

  return (
    <>
      <style>{CAM_CSS}</style>
      <div className="block-container">
        <div className="block-header">
          <div>
            <h1 className="block-title">👕 Camisetas Extra</h1>
            <div className="block-title-sub" style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
              <span>{config.nombre} {config.edicion} · Pedidos externos</span>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "presupuesto" } }))}
                style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".12rem .4rem",
                  borderRadius: 4, border: "1px solid rgba(251,191,36,.3)",
                  background: "rgba(251,191,36,.1)", color: "var(--amber)", cursor: "pointer" }}>
                💰 Ver en presupuesto →
              </button>
            </div>
          </div>
          <div className="block-actions">
            {stats.cPendCobro > 0 && <span className="badge badge-amber">⏳ {fmtEur2(stats.cPendCobro)} pendiente</span>}
            {stats.pendEnt   > 0 && <span className="badge badge-cyan">📦 {stats.pendEnt} ud por entregar</span>}
            {/* CAM-01 — botón de importar tallas visible solo en la pestaña de tallas */}
            {tab === "tallas" && (
              <button
                className="btn btn-ghost"
                title="Importar tallas de todos los voluntarios confirmados y crear líneas de pedido por talla"
                onClick={() => setModalImportVol(true)}
              >
                🔄 Importar tallas de voluntarios
              </button>
            )}
            <button className="btn btn-primary" onClick={() => abrirModal(null)}>+ Nuevo pedido</button>
          </div>
        </div>

        {/* Panel de configuración inicial */}
        {esEstadoInicial && (
          <div style={{ background: "linear-gradient(135deg,rgba(34,211,238,.07),rgba(167,139,250,.05))", border: "1px solid rgba(34,211,238,.2)", borderRadius: "var(--r)", padding: "1.25rem 1.5rem", marginBottom: "1rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--cyan)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: ".65rem" }}>
              🚀 Guía de configuración
            </div>
            <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
              Gestiona aquí las camisetas del evento: consolida las tallas de todos los participantes, registra pedidos de extras y controla la entrega el día de carrera.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
              {[
                { n: 1, done: coste.corredor !== 8 || coste.voluntario !== 7, label: "Configura los costes unitarios", sub: "Precio que cobra el proveedor por cada camiseta", tab: "dashboard", cta: "Configurar costes →" },
                { n: 2, done: totalCorredoresConf > 0, label: "Introduce las tallas de corredores", sub: "Exporta los datos de tu plataforma de inscripción e introdúcelos por talla", tab: "tallas", cta: "Ir a Pedido al proveedor →" },
                { n: 3, done: pedidos.length > 0, label: "Registra pedidos de extras", sub: "Familiares, staff y personas fuera de plataforma", tab: "pedidos", cta: "Añadir pedido →" },
                { n: 4, done: stats.pendEnt === 0 && pedidos.length > 0, label: "Gestiona la entrega el día del evento", sub: "Marca cada camiseta como entregada desde la pestaña Entrega", tab: "checklist", cta: "Ver entregas →" },
              ].map(step => (
                <div key={step.n} style={{ display: "flex", alignItems: "flex-start", gap: ".75rem", padding: ".6rem .75rem", borderRadius: 8,
                  background: step.done ? "rgba(52,211,153,.06)" : "var(--surface2)",
                  border: `1px solid ${step.done ? "rgba(52,211,153,.2)" : "var(--border)"}`,
                  opacity: step.done ? .7 : 1 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: step.done ? "var(--green-dim)" : "var(--surface3)",
                    border: `1.5px solid ${step.done ? "var(--green)" : "var(--border-light)"}`,
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                    color: step.done ? "var(--green)" : "var(--text-muted)" }}>
                    {step.done ? "✓" : step.n}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)", textDecoration: step.done ? "line-through" : "none", color: step.done ? "var(--text-muted)" : "var(--text)" }}>{step.label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: ".1rem" }}>{step.sub}</div>
                  </div>
                  {!step.done && (
                    <button onClick={() => setTab(step.tab)} style={{ flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--cyan)", background: "var(--cyan-dim)", border: "1px solid rgba(34,211,238,.2)", borderRadius: 5, padding: ".2rem .5rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                      {step.cta}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="tabs">
          {TABS.map(t => (<button key={t.id} className={cls("tab-btn", tab === t.id && "active")} onClick={() => setTab(t.id)} title={t.title}>{t.icon} {t.label}</button>))}
        </div>

        <div key={tab}>
          {tab === "dashboard" && <TabDashboard stats={stats} pedidos={pedidos} coste={coste} setCoste={setCoste} setTab={setTab} goToTab={goToTab} abrirFicha={abrirFicha}
            fechaPedido={fechaPedido} setFechaPedido={setFechaPedido}
            estadoPedido={estadoPedido} setEstadoPedido={setEstadoPedido}
            precioCorrExt={precioCorrExt} setPrecioCorrExt={(v) => setPrecioPlatExt({ precio: v })}
            ventaPublico={ventaPublico} setVentaPublico={setVentaPublico}
            fuentesActivas={fuentesActivas} setFuentesActivas={setFuentesActivas}
            corredoresExt={corredoresExt} voluntariosActivos={voluntariosActivos}
            voluntariosConfirmados={voluntariosConfirmados} voluntariosPendientes={voluntariosPendientes}
            ninoExt={ninoExt} />}
          {tab === "pedidos"   && <TabPedidos   pedidos={pedidos} coste={coste} abrirFicha={abrirFicha} abrirModal={abrirModal} filtroExterno={filtroP} onClearFiltro={() => setFiltroP({ pago: "todos", ent: "todos" })} />}
          {tab === "tallas"    && <TabTallas    pedidos={pedidos} corredoresExt={corredoresExt} setCorredores={setCorredores} voluntariosActivos={voluntariosActivos} fuentesActivas={fuentesActivas}
            voluntariosConfirmados={voluntariosConfirmados} voluntariosPendientes={voluntariosPendientes}
            inclPendientes={inclPendientes} setInclPendientes={setInclPendientes}
            ninoExt={ninoExt} setNino={setNino}
            vistaSimple={vistaSimpleTallas} setVistaSimple={setVistaSimpleTallas} />}
          {tab === "checklist" && <TabChecklist pedidos={pedidos} updateLinea={updateLinea} abrirFicha={abrirFicha} generarPedidosVoluntarios={generarPedidosVoluntarios} />}
          {tab === "reparto"   && <TabReparto pedidos={pedidos} updateLinea={updateLinea} rawVols={rawVols} />}
        </div>
      </div>

      {ficha && createPortal(<FichaPedido pedido={pedidos.find(p => p.id === ficha.id) || ficha} coste={coste} onClose={() => setFicha(null)} onEditar={() => abrirEditar(pedidos.find(p => p.id === ficha.id) || ficha)} onEliminar={() => { const id = ficha?.id; setFicha(null); if (id) setDelId(id); }} updateLinea={updateLinea} />, document.body)}
      {modal && createPortal(<ModalPedido data={modal.data} coste={coste} onSave={savePedido} onClose={() => setModal(null)} />, document.body)}
      {delId && createPortal(
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDelId(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 340, textAlign: "center" }}>
            <div className="modal-body" style={{ paddingTop: "1.5rem" }}><div style={{ fontSize: "var(--fs-xl)", marginBottom: ".6rem" }}>⚠️</div><div style={{ fontWeight: 700, marginBottom: ".4rem" }}>¿Eliminar pedido?</div><div className="mono xs muted">Esta acción no se puede deshacer.</div></div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setDelId(null)}>Cancelar</button><button className="btn btn-red" onClick={deletePedido}>Eliminar</button></div>
          </div>
        </div>
      , document.body)}

      {/* ── CAM-01: Modal de importación de tallas de voluntarios ── */}
      {modalImportVol && createPortal(
        <ModalImportarTallasVol
          voluntariosConfirmados={voluntariosConfirmados}
          setPedidos={setPedidos}
          pedidos={pedidos}
          onClose={() => setModalImportVol(false)}
        />,
        document.body
      )}
    </>
  );
}
