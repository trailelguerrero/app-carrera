import { useState, useMemo } from "react";
import { ESTADOS, ESTADO_CFG, getCfg } from "./constants.js";
import { fmtEur } from "@/lib/utils";

// MEJ-17: obtener fecha del último contacto manual en pat.historial
function ultimoContactoFecha(pat) {
  const contactos = (pat.historial || []).filter(h => h.tipo === "contacto");
  if (!contactos.length) return null;
  return contactos.reduce((max, h) => (h.fecha > max ? h.fecha : max), contactos[0].fecha);
}

// MEJ-17: días transcurridos desde una fecha ISO (null si sin contacto)
function diasDesde(fechaIso) {
  if (!fechaIso) return null;
  const ms = Date.now() - new Date(fechaIso).getTime();
  return Math.floor(ms / 86400000);
}

const ORDENES = [
  { id: "default",         label: "Por defecto" },
  { id: "importe-desc",    label: "Mayor importe" },
  { id: "contacto-asc",    label: "Sin contacto reciente" },
];

// ─── TAB PIPELINE ─────────────────────────────────────────────────────────────
export default function TabPipeline({ pats, onEditar, onDetalle, updateEstado, ordenAlfa, onNuevo }) {
  const [orden, setOrden] = useState("default");

  // INC-05: el total de columna usa la MISMA lógica que la tarjeta:
  //   mostrar especie si > 0, si no mostrar importe.
  // Así el usuario puede sumar mentalmente las tarjetas y llegar al total de la cabecera.
  const valorTarjeta = (p) => p.especie > 0 ? (p.especie || 0) : (p.importe || 0);

  // MEJ-17: ordenación local con useMemo — no re-ordena en cada render
  const patsOrdenados = useMemo(() => {
    const base = ordenAlfa ? [...pats].sort((a,b) => a.nombre.localeCompare(b.nombre,"es")) : [...pats];
    if (orden === "importe-desc") {
      return base.sort((a,b) => valorTarjeta(b) - valorTarjeta(a));
    }
    if (orden === "contacto-asc") {
      return base.sort((a,b) => {
        const da = diasDesde(ultimoContactoFecha(a)) ?? 9999;
        const db = diasDesde(ultimoContactoFecha(b)) ?? 9999;
        return db - da; // más días sin contacto primero
      });
    }
    return base;
  }, [pats, ordenAlfa, orden]);

  const porEstado = ESTADOS.map(e => ({
    e, cfg: ESTADO_CFG[e],
    pats: patsOrdenados.filter(p => p.estado === e),
    total: patsOrdenados.filter(p => p.estado === e).reduce((s, p) => s + valorTarjeta(p), 0),
  }));

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🔀 Pipeline Comercial</div>
          <div className="pd">Vista kanban del estado · {ORDENES.find(o=>o.id===orden)?.label}</div>
        </div>
        <div style={{ display:"flex", gap:".5rem", alignItems:"center" }}>
          {/* MEJ-17: selector de ordenación */}
          <select
            className="inp inp-sm"
            value={orden}
            onChange={e => setOrden(e.target.value)}
            style={{ fontSize:"var(--fs-xs)", fontFamily:"var(--font-mono)" }}
            title="Ordenar tarjetas dentro de cada columna"
          >
            {ORDENES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          {ordenAlfa && <span className="badge badge-amber">A-Z ✓</span>}
          <button className="btn btn-primary btn-sm" onClick={onNuevo}>+ Nuevo patrocinador</button>
        </div>
      </div>

      <div className="kanban">
        {porEstado.map(col => {
          const esCancelado = col.e === "cancelado";
          return (
          <div key={col.e} className="kancol" style={esCancelado ? { opacity: 0.65 } : {}}>
            <div className="kancol-header" style={{ borderTopColor: col.cfg.color }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "var(--fs-base)", color: col.cfg.color }}>{col.cfg.label}</span>
                <span className="badge" style={{ background: col.cfg.bg, color: col.cfg.color }}>{col.pats.length}</span>
              </div>
              {/* MEJ-08: cancelado muestra el total en estilo "histórico", no como valor de pipeline */}
              {col.total > 0 && !esCancelado && (
                <div className="mono xs" style={{ color: col.cfg.color, marginTop: ".2rem" }}>{fmtEur(col.total)}</div>
              )}
              {col.total > 0 && esCancelado && (
                <div className="mono xs" style={{ color: "var(--text-dim)", marginTop: ".2rem", fontStyle: "italic" }}>
                  {fmtEur(col.total)} histórico
                </div>
              )}
            </div>
            <div className="kancol-body">
              {col.pats.length === 0 && (
                <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)" }}>—</div>
              )}
              {col.pats.map(p => {
                const ncfg = getCfg(p.nivel);
                // MEJ-17: badge días sin contacto
                const diasSinContacto = diasDesde(ultimoContactoFecha(p));
                const badgeColor = diasSinContacto === null || diasSinContacto > 14
                  ? "var(--red)" : diasSinContacto > 7 ? "#f59e0b" : null;
                return (
                  <div key={p.id} className="kancard" style={{ borderTopColor: ncfg.color, cursor:"pointer" }} onClick={()=>onDetalle(p)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: ".35rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "var(--fs-base)", flex: 1, paddingRight: ".5rem" }}>{p.nombre}</span>
                      <span style={{ fontSize: "var(--fs-base)" }}>{ncfg.icon}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:".35rem", marginBottom:".5rem", flexWrap:"wrap" }}>
                      <span className="mono xs muted">{p.sector}</span>
                      {badgeColor && (
                        <span style={{
                          fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", fontWeight:700,
                          padding:".1rem .35rem", borderRadius:20, flexShrink:0,
                          background: badgeColor + "18", color: badgeColor,
                          border: `1px solid ${badgeColor}44`,
                        }} title="Días desde el último contacto registrado">
                          {diasSinContacto === null ? "sin contacto" : `${diasSinContacto}d sin contacto`}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 700, color: ncfg.color }}>
                        {p.especie > 0 ? fmtEur(p.especie) : fmtEur(p.importe)}
                      </span>
                    </div>
                    {/* Mover de estado */}
                    <div style={{ marginTop: ".5rem", display: "flex", gap: ".25rem", flexWrap: "wrap" }}>
                      {ESTADOS.filter(s => s !== p.estado && s !== "cancelado").slice(0, 2).map(s => (
                        <button key={s} className="btn btn-sm btn-ghost" style={{ fontSize: "var(--fs-xs)", padding: ".1rem .35rem" }}
                          onClick={e=>{e.stopPropagation();updateEstado(p.id, s)}}>
                          → {ESTADO_CFG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </>
  );
}
