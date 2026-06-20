/**
 * SeccionCamisetasBudget.jsx — ECO-08
 * Sección reutilizable del bloque Camisetas en Presupuesto: 6 categorías
 * independientes (corredores, no corredores, venta público, otros, voluntarios, regalos),
 * cada una con su propio toggle. Solo lectura — los datos reales (uds/precio) se editan
 * en el módulo Camisetas; aquí solo se activa/desactiva su cómputo en el P&L y se navega.
 *
 * Sustituye al antiguo modelo: concepto fijo manual "Camisetas voluntarios" (Costes)
 * + 2 líneas sincronizadas agregadas "Merchandising total" / "Balance camisetas técnicas" (Ingresos).
 *
 * @param {"costes"|"ingresos"} modo - "costes" muestra el lado de gasto de cada categoría
 *   (incluye voluntarios y regalos, que no tienen ingreso). "ingresos" muestra solo las
 *   categorías con ingreso real (corredores, noCorredores, ventaPublico, otros).
 */
import { Toggle } from "./common/Toggle";
import { fmtN } from "../../lib/budgetUtils";

const CATEGORIAS = [
  { key: "corredores",   toggleKey: "camCorredores",   icon: "🏃", label: "Camisetas a corredores",     sub: "Plataforma — uds × precio corredor",      tieneIngreso: true },
  { key: "noCorredores", toggleKey: "camNoCorredores", icon: "🎫", label: "Camisetas a no corredores",  sub: "Plataforma — uds × precio no-corredor",   tieneIngreso: true },
  { key: "ventaPublico", toggleKey: "camVentaPublico", icon: "🏪", label: "Venta al público",           sub: "Precio y cantidad libres",                tieneIngreso: true },
  { key: "otros",        toggleKey: "camOtros",        icon: "📦", label: "Camisetas otros",            sub: "Pedidos extra — pagado + pendiente",      tieneIngreso: true },
  { key: "voluntarios",  toggleKey: "camVoluntarios",  icon: "👥", label: "Camisetas voluntarios",      sub: "Automático — voluntarios con talla",      tieneIngreso: false },
  { key: "regalos",      toggleKey: "camRegalos",      icon: "🎁", label: "Camisetas regalo",           sub: "Pedidos extra — estado regalo",           tieneIngreso: false },
];

export const SeccionCamisetasBudget = ({
  modo = "costes", // "costes" | "ingresos"
  camisetasPresupuesto,
  camSyncConfig,
  setCamSyncConfig,
  totalIngresosCamisetas,
  totalGastosCamisetas,
}) => {
  const cam = camisetasPresupuesto || {};
  const toggle = (toggleKey, value) => setCamSyncConfig(prev => ({ ...prev, [toggleKey]: value }));
  const irACamisetas = () => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "camisetas" } }));

  // En modo "ingresos" solo se muestran categorías con ingreso real.
  const categoriasVisibles = modo === "ingresos" ? CATEGORIAS.filter(c => c.tieneIngreso) : CATEGORIAS;

  return (
    <div className="card">
      <div className="flex-between mb-2">
        <div className="card-title" style={{ color: "var(--orange)" }}>
          👕 Camisetas {modo === "costes" ? "— Gastos" : "— Ingresos"}
        </div>
        <button
          onClick={irACamisetas}
          style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
            color: "var(--orange)", background: "rgba(251,146,60,.1)", border: "1px solid rgba(251,146,60,.3)",
            borderRadius: 6, padding: ".25rem .55rem", cursor: "pointer" }}>
          Editar uds/precio en Camisetas →
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {categoriasVisibles.map(c => {
          const datos = cam[c.key] || { ingreso: 0, gasto: 0, unidades: 0 };
          const activo = camSyncConfig?.[c.toggleKey] !== false;
          const valor = modo === "costes" ? datos.gasto : datos.ingreso;
          const valorColor = modo === "costes" ? "var(--amber)" : "var(--green)";
          return (
            <div key={c.key}
              style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                padding: "0.5rem 0.7rem", borderRadius: 8,
                background: "var(--surface2)", border: "1px solid var(--border)",
                opacity: activo ? 1 : 0.45,
              }}
            >
              <Toggle value={activo} onChange={v => toggle(c.toggleKey, v)} />
              <span style={{ fontSize: "var(--fs-md)", flexShrink: 0 }}>{c.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.label}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", color: "var(--text-muted)" }}>
                  {c.sub} · {datos.unidades} ud
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--fs-sm)",
                color: activo ? valorColor : "var(--text-dim)", flexShrink: 0, minWidth: 80, textAlign: "right" }}>
                {activo ? fmtN(valor) : "0,00"} €
              </span>
            </div>
          );
        })}
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: "0.85rem", paddingTop: "0.75rem",
        borderTop: "2px solid var(--border)",
      }}>
        <span style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>
          {modo === "costes" ? "Gastos totales camisetas" : "Ingresos venta camisetas"}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "var(--fs-md)",
          color: modo === "costes" ? "var(--amber)" : "var(--green)" }}>
          {fmtN(modo === "costes" ? totalGastosCamisetas : totalIngresosCamisetas)} €
        </span>
      </div>
      {/* ECO-09: el gasto total de camisetas se prorratea como un coste fijo más
          (proporcional a inscritos por distancia) e incluye en "Costes Fijos" — no es
          un total aparte, solo se desglosa aquí para ver su composición por categoría. */}
      {modo === "costes" && (
        <div style={{ marginTop: "0.5rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)", color: "var(--text-muted)" }}>
          ℹ️ Ya incluido en el total de Costes Fijos, prorrateado por inscritos.
        </div>
      )}
    </div>
  );
};
