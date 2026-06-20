/**
 * TabTallas.jsx — Fase 3, Tarea 3.4
 * Tab "Pedido al proveedor" del bloque Camisetas.
 */
import { useState, useMemo } from "react";
import { fmtEur2 } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { blockCls as cls } from "@/lib/blockStyles";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { TALLAS, TALLAS_NINO, TC, TIPOS, FUENTES_DEFAULT, CORREDORES_DEFAULT, NINO_DEFAULT, NOCORREDOR_DEFAULT, exportarPedidoProveedor } from "./camisetasConstants";
import { detectarDobleComputoNino } from "@/lib/budgetUtils";

export function TabTallas({ pedidos, corredoresExt, setCorredores, voluntariosActivos, vistaSimple=true, setVistaSimple, fuentesActivas, voluntariosConfirmados, voluntariosPendientes, ninoExt = {}, setNino, rawInscritos = { tramos: {} }, noCorredorExt = {}, setNoCorredor }) {
  const [margenSeguridad, setMargenSeguridad] = useState(5); // % de buffer sobre el total
  const [editCorredores, setEditCorredores] = useState(false);
  const [tmpCor, setTmpCor] = useState({ ...corredoresExt });
  const [editNoCorr, setEditNoCorr] = useState(false);
  const [tmpNoCorr, setTmpNoCorr] = useState({ ...NOCORREDOR_DEFAULT, ...noCorredorExt });
  const [editNino, setEditNino] = useState(false);
  const [secColapsadas, setSecCol] = useState({ corredor:true, voluntario:true, nino:true, tabla:false, fuentes:false }); // MEJ-15: tabla abierta por defecto (dato principal del tab) // fuentes abierta por defecto para que Editar sea visible
  const toggleSec = (k) => setSecCol(p => ({...p,[k]:!p[k]}));
  const [tmpNino, setTmpNino] = useState({ ...ninoExt });

  // AUD-CAM-01 (recomendación nº5 de la auditoría): aviso de redundancia de registro si hay
  // tallas en "Niño/a manual" Y al menos un pedido tipo "nino" con estadoPago='regalo'.
  // Desde AUD-CAM-01, "Niño/a manual" no genera gasto (solo informativo) — el aviso ya no
  // señala un riesgo económico, sino que las mismas unidades probablemente están anotadas
  // dos veces y conviene limpiar la pestaña manual para evitar confusión.
  const dobleComputoNino = useMemo(() => detectarDobleComputoNino(ninoExt, pedidos), [ninoExt, pedidos]);

  // ── Asistente de importación desde Presupuesto (M7-02) ──
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPct, setImportPct] = useState(80);
  const [importPreview, setImportPreview] = useState(null);

  // Distribución típica de tallas (suma = 1.0)
  const DIST_TALLAS = { XS: 0.05, S: 0.18, M: 0.27, L: 0.25, XL: 0.15, XXL: 0.07, "3XL": 0.03 };

  const calcImportPreview = (pct) => {
    const tramos = rawInscritos?.tramos || {};
    const totalInscritos = Object.values(tramos).reduce((s, t) => {
      if (typeof t === "object" && t !== null) {
        return s + Object.values(t).reduce((ss, v) => ss + (typeof v === "number" ? v : 0), 0);
      }
      return s + (typeof t === "number" ? t : 0);
    }, 0);
    const conCamiseta = Math.round(totalInscritos * pct / 100);
    const preview = {};
    let assigned = 0;
    TALLAS.forEach((talla, i) => {
      const dist = DIST_TALLAS[talla] ?? 0;
      const val = i === TALLAS.length - 1
        ? Math.max(0, conCamiseta - assigned)
        : Math.round(conCamiseta * dist);
      preview[talla] = val;
      assigned += val;
    });
    return { totalInscritos, conCamiseta, preview };
  };

  const abrirImportModal = () => {
    setImportPreview(calcImportPreview(importPct));
    setShowImportModal(true);
  };

  const confirmarImport = () => {
    if (importPreview) {
      setCorredores({ ...importPreview.preview });
    }
    setShowImportModal(false);
  };

  // Al abrir edición, sincronizar el estado temporal
  const abrirEdicion     = () => { setTmpCor({ ...corredoresExt }); setEditCorredores(true); };
  const guardarCorredores = () => { setCorredores({ ...tmpCor }); setEditCorredores(false); toast.success("Tallas de corredores guardadas"); };
  const abrirEdicionNoCorr = () => { setTmpNoCorr({ ...NOCORREDOR_DEFAULT, ...noCorredorExt }); setEditNoCorr(true); };
  const guardarNoCorr      = () => { setNoCorredor && setNoCorredor({ ...tmpNoCorr }); setEditNoCorr(false); toast.success("Tallas de no corredores guardadas"); };
  const abrirEdicionNino  = () => { setTmpNino({ ...ninoExt }); setEditNino(true); };
  const guardarNino       = () => { setNino && setNino({ ...tmpNino }); setEditNino(false); toast.success("Tallas de niños guardadas"); };

  // Tallas de EXTRAS (pedidos manuales) agrupadas por tipo/modelo de camiseta
  const tallasExtras = useMemo(() => {
    const map = {};
    TALLAS.forEach(t => { map[t] = {}; TIPOS.forEach(tp => { map[t][tp] = 0; }); });
    pedidos.forEach(p => p.lineas.forEach(l => {
      if (map[l.talla]) map[l.talla][l.tipo] = (map[l.talla][l.tipo] || 0) + l.cantidad;
    }));
    return map;
  }, [pedidos]);

  // Tallas de EXTRAS niño (pedidos manuales tipo "nino")
  const tallasExtrasNino = useMemo(() => {
    const map = {};
    TALLAS_NINO.forEach(t => { map[t] = 0; });
    pedidos.forEach(p => p.lineas.forEach(l => {
      if (l.tipo === "nino" && map[l.talla] !== undefined) map[l.talla] += l.cantidad;
    }));
    return map;
  }, [pedidos]);

  // Tallas de VOLUNTARIOS agrupadas (modelo voluntario)
  const tallasVol = useMemo(() => {
    const map = {};
    TALLAS.forEach(t => { map[t] = 0; });
    voluntariosActivos.forEach(v => { if (map[v.talla] !== undefined) map[v.talla]++; });
    return map;
  }, [voluntariosActivos]);

  // TOTALES AL PROVEEDOR por modelo y talla
  const totalCorredor = useMemo(() => {
    const tot = {};
    TALLAS.forEach(t => {
      tot[t] = (corredoresExt[t] || 0) + (tallasExtras[t]?.corredor || 0) + (noCorredorExt[t] || 0);
    });
    return tot;
  }, [corredoresExt, tallasExtras, noCorredorExt]);

  const totalVoluntario = useMemo(() => {
    const tot = {};
    TALLAS.forEach(t => {
      tot[t] = (tallasVol[t] || 0) + (tallasExtras[t]?.voluntario || 0);
    });
    return tot;
  }, [tallasVol, tallasExtras]);

  const grandTotalCor  = TALLAS.reduce((s, t)      => s + (totalCorredor[t]  || 0), 0);
  const grandTotalVol  = TALLAS.reduce((s, t)      => s + (totalVoluntario[t] || 0), 0);
  const grandTotalNino = TALLAS_NINO.reduce((s, t) => s + (ninoExt[t] || 0) + (tallasExtrasNino[t] || 0), 0);
  const grandTallasCor  = useMemo(() => Object.fromEntries(TALLAS.map(t => [t, (corredoresExt[t]||0) + (tallasExtras[t]?.corredor||0) + (noCorredorExt[t]||0)])), [corredoresExt, tallasExtras, noCorredorExt]);
  const grandTallasVol  = useMemo(() => Object.fromEntries(TALLAS.map(t => [t, voluntariosActivos.filter(v=>v.talla===t).length + (tallasExtras[t]?.voluntario||0)])), [voluntariosActivos, tallasExtras]);
  const grandTotal     = grandTotalCor + grandTotalVol + grandTotalNino;

  // Helper: cabecera de sección colapsable
  const ColSec = ({ id, icon, title, total, color, children, action }) => {
    const col = secColapsadas[id];
    return (
      <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${color}2a`,marginBottom:".85rem"}}>
        <button onClick={()=>toggleSec(id)}
          style={{width:"100%",display:"flex",alignItems:"center",gap:".65rem",
            padding:".6rem .9rem",background:`${color}09`,
            border:"none",cursor:"pointer",textAlign:"left",
            borderBottom:col?"none":`1px solid ${color}18`}}>
          <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:"var(--fs-sm)",color,flex:1}}>
            {icon} {title}
          </span>
          {action && <span onClick={e=>e.stopPropagation()}>{action}</span>}
          <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
            color:"var(--text-dim)",padding:".1rem .4rem",borderRadius:20,
            background:"rgba(255,255,255,.05)",flexShrink:0}}>{total} ud</span>
          <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-dim)",
            transform:col?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s",flexShrink:0}}>▼</span>
        </button>
        {!col && <div style={{padding:".75rem .9rem",background:"var(--surface)"}}>{children}</div>}
      </div>
    );
  };

  const SectionTitle = ({ icon, title, subtitle, color, action }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem', gap: '.5rem', flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.08em' }}>{icon} {title}</div>
        {subtitle && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '.1rem' }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );

  const TallaBar = ({ talla, valor, total, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.38rem' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', fontWeight: 700, width: 34, flexShrink: 0 }}>{talla}</span>
      <div style={{ flex: 1, height: 7, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${total > 0 ? (valor / total) * 100 : 0}%`, background: color, borderRadius: 4, transition: 'width .4s ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', fontWeight: 700, color, width: 22, textAlign: 'right' }}>{valor}</span>
    </div>
  );

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📐 Pedido al proveedor</div>
          <div className="pd">{grandTotal} unidades totales · {grandTotalCor} corredor · {grandTotalVol} voluntario{grandTotalNino > 0 ? ` · ${grandTotalNino} niño/a` : ""}</div>
        </div>
        {grandTotal > 0 && (
          <>
          <button
            aria-label="Copiar resumen de tallas para el proveedor"
            onClick={() => {
              const lineas = TALLAS.map(t => {
                const tot = (grandTallasCor[t]||0) + (grandTallasVol[t]||0);
                if(tot === 0) return null;
                return `${t}: ${tot} ud`;
              }).filter(Boolean);
              const txt = "PEDIDO CAMISETAS — " + new Date().toLocaleDateString("es-ES") + "\n" + lineas.join("\n") + "\nTOTAL: " + grandTotal + " unidades";
              navigator.clipboard?.writeText(txt).then(() => toast.success("Resumen copiado al portapapeles"));
            }}
            style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
              color:"var(--cyan)", background:"var(--cyan-dim)", border:"1px solid rgba(34,211,238,.25)",
              borderRadius:6, padding:".35rem .75rem", cursor:"pointer", display:"flex",
              alignItems:"center", gap:".35rem", flexShrink:0 }}>
            📋 Copiar para proveedor
          </button>
          <button
            aria-label="Exportar pedido al proveedor como PDF"
            onClick={() => {
              const ahora = new Date();
              const fecha = ahora.toLocaleDateString("es-ES", {day:"2-digit",month:"long",year:"numeric"});
              const lineasPDF = TALLAS.map(t => {
                const tot = (grandTallasCor[t]||0) + (grandTallasVol[t]||0);
                const corr = grandTallasCor[t]||0;
                const vol  = grandTallasVol[t]||0;
                return tot > 0 ? { talla:t, corr, vol, tot } : null;
              }).filter(Boolean);
              const lineasNino = TALLAS_NINO.map(t => {
                const tot = ninoExt[t]||0;
                return tot > 0 ? { talla:t, tot } : null;
              }).filter(Boolean);
              const totalNino = lineasNino.reduce((acc,l) => acc+l.tot, 0);
              const totalFinal = grandTotal + totalNino;

              const rowsAdulto = lineasPDF.map(l =>
                "<tr><td>" + l.talla + "</td><td>" + (l.corr||"—") + "</td><td>" + (l.vol||"—") + "</td><td>" + l.tot + "</td></tr>"
              ).join("");
              const rowsNino = lineasNino.map(l =>
                "<tr><td>" + l.talla + "</td><td colspan=\"2\"></td><td>" + l.tot + "</td></tr>"
              ).join("");

              const secAdulto = lineasPDF.length > 0
                ? "<div class=\"section-title\">Adulto (corredores + voluntarios)</div>" +
                  "<table><thead><tr><th>Talla</th><th>Corredor</th><th>Voluntario</th><th>TOTAL</th></tr></thead>" +
                  "<tbody>" + rowsAdulto + "</tbody>" +
                  "<tfoot><tr class=\"total-row\"><td>TOTAL ADULTO</td><td>" +
                  lineasPDF.reduce((a,l)=>a+l.corr,0) + "</td><td>" +
                  lineasPDF.reduce((a,l)=>a+l.vol,0) + "</td><td>" + grandTotal + "</td></tr></tfoot></table>"
                : "";

              const secNino = lineasNino.length > 0
                ? "<div class=\"section-title\">Infantil</div>" +
                  "<table><thead><tr><th>Talla</th><th colspan=\"2\"></th><th>TOTAL</th></tr></thead>" +
                  "<tbody>" + rowsNino + "</tbody>" +
                  "<tfoot><tr class=\"total-row\"><td>TOTAL INFANTIL</td><td colspan=\"2\"></td><td>" + totalNino + "</td></tr></tfoot></table>"
                : "";

              const html = "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"UTF-8\">" +
                "<title>Pedido Camisetas — Trail El Guerrero 2026</title>" +
                "<style>*{margin:0;padding:0;box-sizing:border-box}" +
                "body{font-family:Arial,sans-serif;font-size:11pt;color:#111;padding:24px;max-width:600px;margin:0 auto}" +
                "h1{font-size:15pt;font-weight:900;color:#2B5468;margin-bottom:4px}" +
                ".meta{font-size:9pt;color:#555;margin-bottom:20px}" +
                "table{width:100%;border-collapse:collapse;margin-bottom:20px}" +
                "th{background:#2B5468;color:#fff;padding:6px 10px;text-align:right;font-size:10pt}" +
                "th:first-child{text-align:left}" +
                "td{padding:5px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:10pt}" +
                "td:first-child{text-align:left;font-weight:700;font-family:monospace}" +
                ".total-row td{font-weight:800;background:#f9f9f9;border-top:2px solid #2B5468;font-size:12pt}" +
                ".section-title{font-size:11pt;font-weight:700;color:#2B5468;margin:16px 0 8px;border-bottom:2px solid #2B5468;padding-bottom:4px}" +
                "@media print{body{padding:8px}}</style></head><body>" +
                "<h1>\uD83D\uDC55 Pedido de Camisetas — Trail El Guerrero 2026</h1>" +
                "<div class=\"meta\">Generado el " + fecha + " \u00B7 Referencia: TG2026-CAMISETAS</div>" +
                secAdulto + secNino +
                "<div style=\"margin-top:24px;padding:12px;background:#f5f5f5;border-radius:6px;font-size:9pt;color:#555\">" +
                "TOTAL UNIDADES: <strong style=\"font-size:13pt;color:#2B5468\">" + totalFinal + "</strong></div>" +
                "</body></html>";

              const w = window.open("","_blank","width=700,height=800");
              if(w){ w.document.write(html); w.document.close(); setTimeout(()=>w.print(),400); }
            }}
            style={{ display:"flex", alignItems:"center", gap:".35rem", flexShrink:0,
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
              padding:".5rem .85rem", borderRadius:"var(--r-sm)",
              background:"rgba(99,102,241,.08)", color:"var(--primary)",
              border:"1px solid rgba(99,102,241,.25)", cursor:"pointer" }}>
            🖨️ PDF proveedor
          </button>
          </>
        )}
      </div>

      {/* ── PANEL DE FUENTES — orientación antes de la tabla ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
        gap:".5rem", marginBottom:".85rem" }}>
        {[
          { key:"corredoresPlat", icon:"🏃", label:"Corredores", sub:"Datos de corredores importados desde la plataforma de inscripción",
            color:TC.corredor.color, dim:TC.corredor.dim,
            total: fuentesActivas.corredoresPlat ? TALLAS.reduce((s,t)=>s+(corredoresExt[t]||0),0) : 0 },
          { key:"extrasCorredor", icon:"👕", label:"Extras corredor", sub:"Pedidos creados manualmente en esta app",
            color:TC.corredor.color, dim:TC.corredor.dim,
            total: fuentesActivas.extrasCorredor
              ? pedidos.filter(p=>p.lineas?.some(l=>l.tipo==="corredor")).reduce((s,p)=>s+p.lineas.filter(l=>l.tipo==="corredor").reduce((ss,l)=>ss+l.cantidad,0),0)
              : 0 },
          { key:"noCorredoresPlat", icon:"🎫", label:"No corredores", sub:"Modelo corredor vendido a no corredores vía plataforma de inscripción",
            color:"var(--orange)", dim:"var(--orange-dim)",
            total: fuentesActivas.noCorredoresPlat ? TALLAS.reduce((s,t)=>s+(noCorredorExt[t]||0),0) : 0 },
          { key:"voluntariosAuto", icon:"👥", label:"Voluntarios", sub:"Voluntarios con talla asignada en el módulo de Voluntarios",
            color:TC.voluntario.color, dim:TC.voluntario.dim,
            total: fuentesActivas.voluntariosAuto ? voluntariosActivos.length : 0 },
          { key:"extrasVoluntario", icon:"👥+", label:"Extras voluntario", sub:"Pedidos manuales",
            color:TC.voluntario.color, dim:TC.voluntario.dim,
            total: fuentesActivas.extrasVoluntario
              ? pedidos.filter(p=>p.lineas?.some(l=>l.tipo==="voluntario")).reduce((s,p)=>s+p.lineas.filter(l=>l.tipo==="voluntario").reduce((ss,l)=>ss+l.cantidad,0),0)
              : 0 },
          { key:"ninoManual", tab:"tallas", icon:"👶", label:"Niño/a", sub:"Manual — solo consolidación de tallas, sin coste (usa Pedidos para registrar gasto real).",
            color:TC.nino.color, dim:TC.nino.dim,
            total: fuentesActivas.ninoManual ? TALLAS_NINO.reduce((s,t)=>s+(ninoExt[t]||0),0) : 0 },
          { key:"extrasNino", tab:"pedidos", icon:"👶+", label:"Extras niño/a", sub:"Pedidos manuales",
            color:TC.nino.color, dim:TC.nino.dim,
            total: fuentesActivas.extrasNino
              ? pedidos.filter(p=>p.lineas?.some(l=>l.tipo==="nino")).reduce((s,p)=>s+p.lineas.filter(l=>l.tipo==="nino").reduce((ss,l)=>ss+l.cantidad,0),0)
              : 0 },
        ].map(f => (
          <div key={f.key} style={{
            padding:".55rem .75rem", borderRadius:8,
            background: fuentesActivas[f.key] ? f.dim : "var(--surface2)",
            border: `1px solid ${fuentesActivas[f.key] ? f.color+"33" : "var(--border)"}`,
            opacity: fuentesActivas[f.key] ? 1 : 0.5,
          }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              color:"var(--text-muted)", marginBottom:".2rem" }}>
              {f.icon} {f.label}
              {!fuentesActivas[f.key] && <span style={{marginLeft:".35rem",color:"var(--red)"}}>🚫</span>}
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              color:"var(--text-dim)", marginBottom:".3rem" }}>{f.sub}</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-md)",
              fontWeight:800, color: fuentesActivas[f.key] ? f.color : "var(--text-dim)" }}>
              {f.total}
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              color:"var(--text-muted)" }}>unidades</div>
          </div>
        ))}
      </div>

      {/* ── TOTAL POR FUENTE — barra resumen ── */}
      {(() => {
        const fuentesData = [
          { key:"corredoresPlat",  icon:"🏃", label:"Corredor plat.",  color:TC.corredor.color,   dim:TC.corredor.dim,
            total: fuentesActivas.corredoresPlat ? TALLAS.reduce((s,t)=>s+(corredoresExt[t]||0),0) : 0 },
          { key:"extrasCorredor",  icon:"👕", label:"Extras cor.",     color:TC.corredor.color,   dim:TC.corredor.dim,
            total: fuentesActivas.extrasCorredor
              ? pedidos.filter(p=>p.lineas?.some(l=>l.tipo==="corredor")).reduce((s,p)=>s+p.lineas.filter(l=>l.tipo==="corredor").reduce((ss,l)=>ss+l.cantidad,0),0) : 0 },
          { key:"noCorredoresPlat",icon:"🎫", label:"No corredores",  color:"var(--orange)",     dim:"var(--orange-dim)",
            total: fuentesActivas.noCorredoresPlat ? TALLAS.reduce((s,t)=>s+(noCorredorExt[t]||0),0) : 0 },
          { key:"voluntariosAuto", icon:"👥", label:"Voluntarios",     color:TC.voluntario.color, dim:TC.voluntario.dim,
            total: fuentesActivas.voluntariosAuto ? voluntariosActivos.length : 0 },
          { key:"extrasVoluntario",icon:"👥+",label:"Extras vol.",     color:TC.voluntario.color, dim:TC.voluntario.dim,
            total: fuentesActivas.extrasVoluntario
              ? pedidos.filter(p=>p.lineas?.some(l=>l.tipo==="voluntario")).reduce((s,p)=>s+p.lineas.filter(l=>l.tipo==="voluntario").reduce((ss,l)=>ss+l.cantidad,0),0) : 0 },
          { key:"ninoManual",      icon:"👶", label:"Niño/a",          color:TC.nino.color,       dim:TC.nino.dim,
            total: fuentesActivas.ninoManual ? TALLAS_NINO.reduce((s,t)=>s+(ninoExt[t]||0),0) : 0 },
          { key:"extrasNino",      icon:"👶+",label:"Extras niño/a",  color:TC.nino.color,       dim:TC.nino.dim,
            total: fuentesActivas.extrasNino
              ? pedidos.filter(p=>p.lineas?.some(l=>l.tipo==="nino")).reduce((s,p)=>s+p.lineas.filter(l=>l.tipo==="nino").reduce((ss,l)=>ss+l.cantidad,0),0) : 0 },
        ];
        const totalActivo = fuentesData.reduce((s,f)=>s+f.total,0);
        if (totalActivo === 0) return null;
        return (
          <div style={{ marginBottom:".85rem", padding:".6rem .9rem", borderRadius:8,
            background:"var(--surface2)", border:"1px solid var(--border)",
            display:"flex", alignItems:"center", gap:".5rem", flexWrap:"wrap" }}>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
              color:"var(--text-dim)", marginRight:".25rem", flexShrink:0 }}>TOTAL FUENTES:</span>
            {fuentesData.filter(f=>f.total>0).map(f=>(
              <span key={f.key} style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                color:f.color, background:f.dim, border:`1px solid ${f.color}33`,
                borderRadius:4, padding:".15rem .5rem", opacity: fuentesActivas[f.key] ? 1 : 0.45 }}>
                {f.icon} {f.label}: {f.total}
                {!fuentesActivas[f.key] && " 🚫"}
              </span>
            ))}
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", fontWeight:900,
              color:"var(--text)", marginLeft:"auto", flexShrink:0 }}>
              = {totalActivo} ud
            </span>
          </div>
        );
      })()}

      {/* ── TOGGLE vista simple / desglose ── */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:".4rem"}}>
        <div style={{display:"flex",background:"var(--surface2)",borderRadius:8,border:"1px solid var(--border)",overflow:"hidden"}}>
          <button
            className={`btn btn-sm${vistaSimple?" btn-cyan":""}`}
            style={{borderRadius:0,border:"none",margin:0,minHeight:36}}
            onClick={()=>setVistaSimple(true)}>
            📊 Resumen
          </button>
          <button
            className={`btn btn-sm${!vistaSimple?" btn-cyan":""}`}
            style={{borderRadius:0,border:"none",margin:0,minHeight:36,borderLeft:"1px solid var(--border)"}}
            onClick={()=>setVistaSimple(false)}>
            🔍 Ver desglose
          </button>
        </div>
      </div>

      {/* ── TABLA CONSOLIDADA: colapsable ── */}
      <div style={{borderRadius:10,overflow:"hidden",marginBottom:".85rem",
        border:"1px solid rgba(99,102,241,.25)"}}>
        <button onClick={()=>toggleSec("tabla")}
          style={{width:"100%",display:"flex",alignItems:"center",gap:".65rem",
            padding:".65rem .9rem",background:"rgba(99,102,241,.06)",
            border:"none",cursor:"pointer",textAlign:"left",
            borderBottom:secColapsadas.tabla?"none":"1px solid rgba(99,102,241,.15)"}}>
          <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:"var(--fs-sm)",
            color:"var(--primary)",flex:1}}>📦 Pedido Total al Proveedor — desglose por fuente</span>
          <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
            color:"var(--text-dim)",padding:".1rem .4rem",borderRadius:20,
            background:"rgba(255,255,255,.05)",flexShrink:0}}>{grandTotal} ud</span>
          <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-dim)",
            transform:secColapsadas.tabla?"rotate(-90deg)":"rotate(0deg)",
            transition:"transform .18s",flexShrink:0}}>▼</span>
        </button>
        {!secColapsadas.tabla && <div style={{padding:".75rem .9rem",background:"var(--surface)"}}>
        <div className="overflow-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Talla</th>
                {!vistaSimple && <th className="text-right" style={{ color: TC.corredor.color, fontSize: 'var(--fs-xs)', opacity: fuentesActivas.corredoresPlat ? 1 : 0.4 }}>🏃 Corredor<br/><span style={{opacity:.65}}>Plat. ext.</span> {!fuentesActivas.corredoresPlat && "🚫"}</th>}
                {!vistaSimple && <th className="text-right" style={{ color: TC.corredor.color, fontSize: 'var(--fs-xs)', opacity: fuentesActivas.extrasCorredor ? 1 : 0.4 }}>👕 Extras<br/><span style={{opacity:.65}}>Corredor</span> {!fuentesActivas.extrasCorredor && "🚫"}</th>}
                {!vistaSimple && <th className="text-right" style={{ color: TC.voluntario.color, fontSize: 'var(--fs-xs)', opacity: fuentesActivas.voluntariosAuto ? 1 : 0.4 }}>👥 Voluntarios<br/><span style={{opacity:.65}}>Automático</span> {!fuentesActivas.voluntariosAuto && "🚫"}</th>}
                {!vistaSimple && <th className="text-right" style={{ color: TC.voluntario.color, fontSize: 'var(--fs-xs)', opacity: fuentesActivas.extrasVoluntario ? 1 : 0.4 }}>👥 Extras<br/><span style={{opacity:.65}}>Voluntario</span> {!fuentesActivas.extrasVoluntario && "🚫"}</th>}
                <th className="text-right" style={{ fontWeight: 800 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {TALLAS.map(t => {
                const cExt  = corredoresExt[t] || 0;
                const cXtra = tallasExtras[t]?.corredor || 0;
                const vAuto = tallasVol[t] || 0;
                const vXtra = tallasExtras[t]?.voluntario || 0;
                const tot = cExt + cXtra + vAuto + vXtra;
                if (!tot) return null;
                const cell = (v, color, dim) => v > 0
                  ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color, background: dim, padding: '.1rem .4rem', borderRadius: 4 }}>{v}</span>
                  : <span style={{ color: 'var(--text-dim)' }}>—</span>;
                return (
                  <tr key={t}>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{t}</td>
                    {!vistaSimple && <td className="text-right">{cell(cExt,  TC.corredor.color,   TC.corredor.dim)}</td>}
                    {!vistaSimple && <td className="text-right">{cell(cXtra, TC.corredor.color,   TC.corredor.dim)}</td>}
                    {!vistaSimple && <td className="text-right">{cell(vAuto, TC.voluntario.color, TC.voluntario.dim)}</td>}
                    {!vistaSimple && <td className="text-right">{cell(vXtra, TC.voluntario.color, TC.voluntario.dim)}</td>}
                    <td className="text-right"><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 'var(--fs-md)' }}>{tot}</span></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>TOTAL</td>
                {!vistaSimple && <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: TC.corredor.color }}>{TALLAS.reduce((s,t)=>s+(corredoresExt[t]||0),0)}</td>}
                {!vistaSimple && <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: TC.corredor.color }}>{TALLAS.reduce((s,t)=>s+(tallasExtras[t]?.corredor||0),0)}</td>}
                {!vistaSimple && <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: TC.voluntario.color }}>{TALLAS.reduce((s,t)=>s+(tallasVol[t]||0),0)}</td>}
                {!vistaSimple && <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: TC.voluntario.color }}>{TALLAS.reduce((s,t)=>s+(tallasExtras[t]?.voluntario||0),0)}</td>}
                <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 'var(--fs-md)' }}>{grandTotal}</td>
              </tr>
              {!vistaSimple && (
                <tr>
                  <td colSpan={2} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: TC.corredor.color, paddingTop: '.35rem' }}>
                    🏃 Corredor: <strong>{grandTotalCor}</strong>
                  </td>
                  <td colSpan={2} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: TC.voluntario.color, paddingTop: '.35rem' }}>
                    👥 Voluntario: <strong>{grandTotalVol}</strong>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', paddingTop: '.35rem', textAlign: 'right' }}>
                    {grandTotalNino > 0 ? <>👶 <strong>{grandTotalNino}</strong></> : null}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        {/* ── SECCIÓN NIÑO/A — tallas propias ── */}
        {grandTotalNino > 0 || fuentesActivas.ninoManual || fuentesActivas.extrasNino ? (
          <div style={{ marginTop: '.85rem', borderTop: `2px solid ${TC.nino.color}33`,
            paddingTop: '.75rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', fontWeight: 700,
              color: TC.nino.color, textTransform: 'uppercase', letterSpacing: '.08em',
              marginBottom: '.6rem' }}>
              👶 Niño/a — tallas especiales
            </div>
            <div className="overflow-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Talla</th>
                    <th className="text-right" style={{ color: TC.nino.color, fontSize: 'var(--fs-xs)', opacity: fuentesActivas.ninoManual ? 1 : 0.4 }}>
                      👶 Manual {!fuentesActivas.ninoManual && "🚫"}
                    </th>
                    <th className="text-right" style={{ color: TC.nino.color, fontSize: 'var(--fs-xs)', opacity: fuentesActivas.extrasNino ? 1 : 0.4 }}>
                      👶+ Extras {!fuentesActivas.extrasNino && "🚫"}
                    </th>
                    <th className="text-right" style={{ fontWeight: 800 }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {TALLAS_NINO.map(t => {
                    const manual = ninoExt[t] || 0;
                    const extras = tallasExtrasNino[t] || 0;
                    const tot    = manual + extras;
                    if (!tot) return null;
                    const cell = (v) => v > 0
                      ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700,
                          color: TC.nino.color, background: TC.nino.dim,
                          padding: '.1rem .4rem', borderRadius: 4 }}>{v}</span>
                      : <span style={{ color: 'var(--text-dim)' }}>—</span>;
                    return (
                      <tr key={t}>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{t}</td>
                        <td className="text-right">{cell(manual)}</td>
                        <td className="text-right">{cell(extras)}</td>
                        <td className="text-right">
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{tot}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>TOTAL</td>
                    <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: TC.nino.color }}>
                      {TALLAS_NINO.reduce((s,t)=>s+(ninoExt[t]||0),0)}
                    </td>
                    <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: TC.nino.color }}>
                      {TALLAS_NINO.reduce((s,t)=>s+(tallasExtrasNino[t]||0),0)}
                    </td>
                    <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 'var(--fs-md)', color: TC.nino.color }}>
                      {grandTotalNino}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : null}
        </div>}
      </div>

      {/* ── DESGLOSE POR FUENTE — colapsable ── */}
      <div style={{borderRadius:10,overflow:"hidden",marginBottom:".85rem",
        border:"1px solid var(--border)"}}>
        <button onClick={()=>toggleSec("fuentes")}
          style={{width:"100%",display:"flex",alignItems:"center",gap:".65rem",
            padding:".6rem .9rem",background:"var(--surface2)",
            border:"none",cursor:"pointer",textAlign:"left",
            borderBottom:secColapsadas.fuentes?"none":"1px solid var(--border)"}}>
          <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:"var(--fs-sm)",flex:1,
            display:"flex",alignItems:"center",gap:".5rem"}}>
            📋 Desglose por fuente
            <span style={{fontSize:"var(--fs-xs)",fontWeight:500,
              color:Object.values(fuentesActivas).filter(Boolean).length===7?"var(--green)":"var(--amber)",
              padding:".06rem .35rem",borderRadius:10,
              background:Object.values(fuentesActivas).filter(Boolean).length===7?"var(--green-dim)":"var(--amber-dim)"}}>
              {Object.values(fuentesActivas).filter(Boolean).length}/7 activas
            </span>
          </span>
          <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--text-dim)",
            transform:secColapsadas.fuentes?"rotate(-90deg)":"rotate(0deg)",
            transition:"transform .18s",flexShrink:0}}>▼</span>
        </button>
        {!secColapsadas.fuentes && <div style={{padding:".75rem .9rem",background:"var(--surface)"}}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '.85rem' }}>

        {/* ── FUENTE 1: Corredores (plataforma externa) ── */}
        <div className="card">
          <SectionTitle
            icon="🏃" title="Corredor — plataforma externa"
            subtitle="Introduce manualmente los totales de la plataforma de inscripción"
            color={TC.corredor.color}
            action={
              !editCorredores
                ? <div style={{ display: 'flex', gap: '.35rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={abrirImportModal} title="Importar tallas estimadas desde inscritos de Presupuesto">📥 Importar desde Presupuesto</button>
                    <button className="btn btn-ghost btn-sm" onClick={abrirEdicion}>✏️ Editar</button>
                  </div>
                : <div style={{ display: 'flex', gap: '.35rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={guardarCorredores}>✓ Guardar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditCorredores(false)} aria-label="Cerrar">✕</button>
                  </div>
            }
          />
          {editCorredores ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '.4rem' }}>
              {TALLAS.map(t => (
                <label key={t} style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', fontWeight: 700, color: TC.corredor.color }}>{t}</span>
                  <input
                    type="number" min="0" value={tmpCor[t] || 0}
                    onChange={e => setTmpCor(p => ({ ...p, [t]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--r-sm)', padding: '.3rem .4rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-base)', textAlign: 'right', outline: 'none', width: '100%' }}
                  />
                </label>
              ))}
            </div>
          ) : (
            <>
              {TALLAS.filter(t => (corredoresExt[t] || 0) > 0).length === 0
                ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', textAlign: 'center', padding: '1rem 0' }}>Sin datos — haz clic en ✏️ Editar para introducir tallas</div>
                : TALLAS.filter(t => (corredoresExt[t] || 0) > 0).map(t => (
                  <TallaBar key={t} talla={t} valor={corredoresExt[t]} total={TALLAS.reduce((s, tt) => s + (corredoresExt[tt] || 0), 0)} color={TC.corredor.color} />
                ))
              }
              {(tallasExtras && TALLAS.some(t => (tallasExtras[t]?.corredor || 0) > 0)) && (
                <div style={{ marginTop: '.75rem', paddingTop: '.6rem', borderTop: '1px dashed var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: '.4rem' }}>+ Extras modelo corredor (pedidos manuales):</div>
                  {TALLAS.filter(t => (tallasExtras[t]?.corredor || 0) > 0).map(t => (
                    <TallaBar key={t} talla={t} valor={tallasExtras[t].corredor} total={TALLAS.reduce((s, tt) => s + (tallasExtras[tt]?.corredor || 0), 0)} color={TC.corredor.color} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FUENTE: No corredores (modelo corredor, plataforma de inscripción) ── */}
        <div className="card" style={{ borderLeft: `3px solid var(--orange)` }}>
          <SectionTitle
            icon="🎫" title="No corredores — plataforma"
            subtitle="Camisetas modelo corredor vendidas a personas que NO corren, desde la plataforma de inscripción"
            color="var(--orange)"
            action={
              !editNoCorr
                ? <button className="btn btn-ghost btn-sm" onClick={abrirEdicionNoCorr}>✏️ Editar</button>
                : <div style={{ display: 'flex', gap: '.35rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={guardarNoCorr}>✓ Guardar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditNoCorr(false)} aria-label="Cerrar">✕</button>
                  </div>
            }
          />
          {editNoCorr ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '.4rem' }}>
              {TALLAS.map(t => (
                <label key={t} style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--orange)' }}>{t}</span>
                  <input
                    type="number" min="0" value={tmpNoCorr[t] || 0}
                    onChange={e => setTmpNoCorr(p => ({ ...p, [t]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--r-sm)', padding: '.3rem .4rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-base)', textAlign: 'right', outline: 'none', width: '100%' }}
                  />
                </label>
              ))}
            </div>
          ) : (
            TALLAS.filter(t => (noCorredorExt[t] || 0) > 0).length === 0
              ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', textAlign: 'center', padding: '1rem 0' }}>Sin datos — haz clic en ✏️ Editar para introducir tallas</div>
              : TALLAS.filter(t => (noCorredorExt[t] || 0) > 0).map(t => (
                <TallaBar key={t} talla={t} valor={noCorredorExt[t]} total={TALLAS.reduce((s, tt) => s + (noCorredorExt[tt] || 0), 0)} color="var(--orange)" />
              ))
          )}
        </div>

        {/* ── FUENTE 2: Voluntarios (automático) ── */}
        <div className="card">
          <SectionTitle
            icon="👥" title="Voluntario — automático"
            subtitle={`${voluntariosConfirmados?.length || 0} confirmados · ${voluntariosPendientes?.length || 0} pendientes · sincronizado en tiempo real`}
            color={TC.voluntario.color}
          />
          {TALLAS.filter(t => (tallasVol[t] || 0) > 0).length === 0
            ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', textAlign: 'center', padding: '1rem 0' }}>Sin voluntarios con talla asignada aún</div>
            : TALLAS.filter(t => (tallasVol[t] || 0) > 0).map(t => (
              <TallaBar key={t} talla={t} valor={tallasVol[t]} total={voluntariosActivos.length} color={TC.voluntario.color} />
            ))
          }
          {TALLAS.some(t => (tallasExtras[t]?.voluntario || 0) > 0) && (
            <div style={{ marginTop: '.75rem', paddingTop: '.6rem', borderTop: '1px dashed var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: '.4rem' }}>+ Extras modelo voluntario (pedidos manuales):</div>
              {TALLAS.filter(t => (tallasExtras[t]?.voluntario || 0) > 0).map(t => (
                <TallaBar key={t} talla={t} valor={tallasExtras[t].voluntario} total={TALLAS.reduce((s, tt) => s + (tallasExtras[tt]?.voluntario || 0), 0)} color={TC.voluntario.color} />
              ))}
            </div>
          )}
        </div>
        {/* ── FUENTE 3: Niño/a (manual por talla) ── */}
        <div className="card" style={{ borderLeft: `3px solid ${TC.nino.color}` }}>
          <SectionTitle
            icon="👶" title="Niño/a — manual (solo consolidación de tallas)"
            subtitle="Tallas 4-6, 6-8, 8-10, 10-12 — sin coste asociado. Para registrar gasto real (regalo o venta a familiar), usa la pestaña Pedidos."
            color={TC.nino.color}
            action={
              !editNino
                ? <button className="btn btn-ghost btn-sm" onClick={abrirEdicionNino}>✏️ Editar</button>
                : <div style={{ display: 'flex', gap: '.35rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={guardarNino}>✓ Guardar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditNino(false)} aria-label="Cerrar">✕</button>
                  </div>
            }
          />
          {dobleComputoNino.hayRiesgo && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '.5rem',
              background: 'var(--amber-dim)', border: '1px solid var(--amber)',
              borderRadius: 'var(--r-sm)', padding: '.5rem .65rem', marginBottom: '.6rem',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text)',
            }}>
              <span style={{ flexShrink: 0 }}>ℹ️</span>
              <span>
                Hay <strong>{dobleComputoNino.unidadesManual}</strong> unidades registradas aquí (sin coste)
                y <strong>{dobleComputoNino.unidadesRegaloPedidos}</strong> unidades en pedidos de niño
                marcados como regalo (con coste real). Si son las mismas camisetas, puedes vaciar esta
                pestaña — el gasto ya queda correctamente registrado en Pedidos, y mantener ambas es
                redundante.
              </span>
            </div>
          )}
          {editNino ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '.4rem' }}>
              {TALLAS_NINO.map(t => (
                <label key={t} style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', fontWeight: 700, color: TC.nino.color }}>{t}</span>
                  <input
                    type="number" min="0" value={tmpNino[t] || 0}
                    onChange={e => setTmpNino(p => ({ ...p, [t]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)',
                      borderRadius: 'var(--r-sm)', padding: '.3rem .4rem', fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--fs-base)', textAlign: 'right', outline: 'none', width: '100%' }}
                  />
                </label>
              ))}
            </div>
          ) : (
            <>
              {TALLAS_NINO.filter(t => (ninoExt[t] || 0) > 0).length === 0
                ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-dim)',
                    textAlign: 'center', padding: '1rem 0' }}>
                    Sin datos — haz clic en ✏️ Editar para introducir tallas
                  </div>
                : TALLAS_NINO.filter(t => (ninoExt[t] || 0) > 0).map(t => (
                  <TallaBar key={t} talla={t} valor={ninoExt[t]}
                    total={TALLAS_NINO.reduce((s, tt) => s + (ninoExt[tt] || 0), 0)}
                    color={TC.nino.color} />
                ))
              }
              {TALLAS_NINO.some(t => (tallasExtrasNino[t] || 0) > 0) && (
                <div style={{ marginTop: '.75rem', paddingTop: '.6rem', borderTop: '1px dashed var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)',
                    color: 'var(--text-muted)', marginBottom: '.4rem' }}>
                    + Extras niño/a (pedidos manuales):
                  </div>
                  {TALLAS_NINO.filter(t => (tallasExtrasNino[t] || 0) > 0).map(t => (
                    <TallaBar key={t} talla={t} valor={tallasExtrasNino[t]}
                      total={TALLAS_NINO.reduce((s, tt) => s + (tallasExtrasNino[tt] || 0), 0)}
                      color={TC.nino.color} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
        </div>}
      </div>

      {/* ── MODAL: Asistente importación de tallas desde Presupuesto (M7-02) ── */}
      {showImportModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={() => setShowImportModal(false)}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '1.5rem', maxWidth: 480, width: '100%',
            maxHeight: '90vh', overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--fs-md)', marginBottom: '.75rem' }}>
              📥 Importar tallas desde Presupuesto
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Estima las tallas de corredores con camiseta aplicando un porcentaje sobre los inscritos totales de Presupuesto. Revisa los valores antes de confirmar.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-dim)', flexShrink: 0 }}>
                % inscritos con camiseta:
              </label>
              <input
                type="number" min="1" max="100" value={importPct}
                onChange={e => {
                  const v = Math.min(100, Math.max(1, parseInt(e.target.value) || 80));
                  setImportPct(v);
                  setImportPreview(calcImportPreview(v));
                }}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)',
                  borderRadius: 'var(--r-sm)', padding: '.3rem .5rem', fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--fs-base)', width: 72, textAlign: 'right' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>%</span>
            </div>

            {importPreview && (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', marginBottom: '.6rem' }}>
                  Inscritos en Presupuesto: <strong>{importPreview.totalInscritos}</strong>
                  {' → '}con camiseta: <strong style={{ color: 'var(--cyan)' }}>{importPreview.conCamiseta}</strong>
                </div>

                {importPreview.totalInscritos === 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--amber)',
                    background: 'var(--amber-dim)', borderRadius: 6, padding: '.5rem .75rem', marginBottom: '.75rem' }}>
                    ⚠️ No hay inscritos registrados en Presupuesto. Introduce los datos primero.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '.4rem', marginBottom: '1rem' }}>
                  {TALLAS.map(t => (
                    <div key={t} style={{ background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '.4rem .5rem', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', fontWeight: 700,
                        color: TC.corredor.color }}>{t}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-md)', fontWeight: 800 }}>
                        {importPreview.preview[t] ?? 0}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Distribución estimada según proporciones típicas. Puedes editar manualmente después.
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowImportModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary btn-sm"
                disabled={!importPreview || importPreview.totalInscritos === 0}
                onClick={confirmarImport}
              >
                ✓ Confirmar importación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── TAB CHECKLIST ────────────────────────────────────────────────────────────
