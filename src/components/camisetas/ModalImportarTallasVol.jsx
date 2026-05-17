/**
 * ModalImportarTallasVol.jsx — Modal de preview e importación de tallas (MEJ-04)
 * Muestra un resumen de las tallas de los voluntarios confirmados y permite
 * crear o actualizar el pedido de bloque "Voluntarios (importación automática)".
 *
 * Props:
 *   voluntariosConfirmados {Array}    — voluntarios filtrados por elegibilidad
 *   pedidos                {Array}    — pedidos actuales (para detectar bloque existente)
 *   setPedidos             {Function} — setter del array de pedidos
 *   onClose                {Function} — cierra el modal
 *
 * Extraído de Camisetas.jsx (líneas 241-407) como parte de MEJ-04.
 */
import { genIdNum } from "@/lib/utils";
import { TALLAS } from "@/components/camisetas/camisetasConstants";

// ── helper local — genera preview de tallas de voluntarios ──────────────────
function calcPreviewTallas(vols) {
  const mapa = {};
  TALLAS.forEach(t => { mapa[t] = 0; });
  vols.forEach(v => { if (v.talla && mapa[v.talla] !== undefined) mapa[v.talla]++; });
  return TALLAS.map(t => ({ talla: t, cantidad: mapa[t] })).filter(r => r.cantidad > 0);
}

export function ModalImportarTallasVol({ voluntariosConfirmados, setPedidos, pedidos, onClose }) {
  const preview = calcPreviewTallas(voluntariosConfirmados);
  const totalVols = voluntariosConfirmados.length;
  const sinTalla  = voluntariosConfirmados.filter(v => !v.talla).length;

  const confirmar = () => {
    if (preview.length === 0) { onClose(); return; }

    // Buscar si ya existe un pedido "bloque voluntarios importado"
    const NOMBRE_BLOQUE = "Voluntarios (importación automática)";
    const existente = pedidos.find(p => p._esImportacionVol === true);

    /*
     * Estrategia de IDs para líneas de importación en bloque (ERR-04)
     * ────────────────────────────────────────────────────────────────
     * PROBLEMA: Date.now() + i + 1 colisiona si la importación se ejecuta dos
     *   veces en el mismo segundo, produciendo IDs idénticos a los anteriores.
     *   updateLinea opera por lineaId: una colisión marca/desmarca la línea errónea.
     *
     * SOLUCIÓN: calcular la base global (max de todos los IDs de línea existentes)
     *   antes del map(), luego asignar base + i + 1.
     *   Así cada reimportación genera IDs estrictamente mayores que cualquier
     *   línea previa en cualquier pedido.
     */
    const todasLineas = pedidos.flatMap(p => p.lineas);
    const lineaIdBase = todasLineas.length
      ? Math.max(...todasLineas.map(l => Number(l.id) || 0)) + 1
      : 1;

    const lineas = preview.map((r, i) => ({
      id: lineaIdBase + i,
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
        id: genIdNum(pedidos),
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
