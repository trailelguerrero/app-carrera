import React, { useState, useRef } from "react";
import { useData } from "@/hooks/useData";
import { SK_UI_CODIGOS_PROMO } from "@/constants/storageKeys";
import { PanelPlazas }       from "./PanelPlazas";
import { TimelineTramos }    from "./TimelineTramos";
import { TablaTramos }       from "./TablaTramos";
import { CodigosPromo }      from "./CodigosPromo";
import { ModalConfirmDelete } from "./ModalConfirmDelete";
import { ModalCsvImport }    from "./ModalCsvImport";

// MEJ-01: getTramoStatus — ver TimelineTramos.jsx para implementación completa
const DISTANCIAS = ["TG7", "TG13", "TG25"];
const tramoStats = (t, inscritos) => {
  const total    = DISTANCIAS.reduce((s, d) => s + (inscritos?.tramos?.[t.id]?.[d] || 0), 0);
  const ingresos = DISTANCIAS.reduce((s, d) => s + (inscritos?.tramos?.[t.id]?.[d] || 0) * (t.precios[d] || 0), 0);
  return { total, ingresos };
};

export const TabInscripciones = ({
  tramos, setTramos, updateTramoPrecio, addTramo,
  inscritos, setInscritos, updateInscritos,
  totalInscritos, ingresosPorDistancia,
  maximos, setMaximos,
}) => {
  const [rawCodigos] = useData(SK_UI_CODIGOS_PROMO, []);
  const codigos = Array.isArray(rawCodigos) ? rawCodigos : [];

  const [pendingDelete, setPendingDelete] = useState(null);

  // CSV import state
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvPreview,   setCsvPreview]   = useState(null);
  const [csvMergeMode, setCsvMergeMode] = useState("reemplazar");
  const [csvMsg,       setCsvMsg]       = useState(null);

  const parseCsv = (text) => {
    const firstLine = text.split(/\r?\n/)[0] || "";
    const sep = (firstLine.split(";").length - 1) > (firstLine.split(",").length - 1) ? ";" : ",";
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return { rows: [], errors: ["El archivo no tiene datos o solo tiene cabecera."] };

    const rawHeaders = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/\s+/g, ""));
    const idxDistancia = rawHeaders.findIndex(h => h === "distancia");
    const idxTramo     = rawHeaders.findIndex(h => h === "tramo");
    const idxNumero    = rawHeaders.findIndex(h => h === "numero" || h === "número");

    const missing = [];
    if (idxDistancia < 0) missing.push("distancia");
    if (idxTramo     < 0) missing.push("tramo");
    if (idxNumero    < 0) missing.push("numero");
    if (missing.length > 0) return { rows: [], errors: [`Columnas no encontradas: ${missing.join(", ")}. Cabeceras detectadas: ${rawHeaders.join(", ")}`] };

    const DIST_VALID = ["TG7", "TG13", "TG25"];
    const rows = []; const errors = [];
    lines.slice(1).forEach((line, i) => {
      if (!line) return;
      const cells     = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ""));
      const distancia = (cells[idxDistancia] || "").toUpperCase();
      const tramo     = cells[idxTramo] || "";
      const numero    = parseInt(cells[idxNumero] || "", 10);
      if (!DIST_VALID.includes(distancia)) { errors.push(`Fila ${i + 2}: distancia inválida "${cells[idxDistancia]}"`); return; }
      if (!tramo) { errors.push(`Fila ${i + 2}: tramo vacío`); return; }
      if (isNaN(numero) || numero < 0) { errors.push(`Fila ${i + 2}: número inválido "${cells[idxNumero]}"`); return; }
      rows.push({ distancia, tramo, numero });
    });
    return { rows, errors };
  };

  const handleCsvFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setCsvMsg({ type: "error", text: "El archivo supera el límite de 2 MB." }); return; }
    setCsvMsg(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows, errors } = parseCsv(ev.target.result);
      setCsvPreview({ rows, errors });
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleCsvConfirm = () => {
    if (!csvPreview?.rows?.length) return;
    const { rows } = csvPreview;
    const grouped = {};
    rows.forEach(({ distancia, tramo, numero }) => {
      if (!grouped[tramo]) grouped[tramo] = {};
      grouped[tramo][distancia] = (grouped[tramo][distancia] || 0) + numero;
    });
    setInscritos(prev => {
      const prevTramos = prev.tramos || {};
      const newTramos  = { ...prevTramos };
      Object.entries(grouped).forEach(([nombreTramo, distMap]) => {
        const tramoMatch = tramos.find(t => t.nombre.trim().toLowerCase() === nombreTramo.trim().toLowerCase());
        if (!tramoMatch) return;
        const tid      = tramoMatch.id;
        const prevDists = newTramos[tid] || {};
        const merged   = { ...prevDists };
        Object.entries(distMap).forEach(([dist, n]) => {
          merged[dist] = csvMergeMode === "sumar" ? (prevDists[dist] || 0) + n : n;
        });
        newTramos[tid] = merged;
      });
      return { ...prev, tramos: newTramos };
    });
    const ignored = csvPreview.rows.filter(r => !tramos.find(t => t.nombre.trim().toLowerCase() === r.tramo.trim().toLowerCase())).length;
    setCsvMsg({ type: "success", text: `✅ ${rows.length - ignored} inscritos importados (modo: ${csvMergeMode}). ${ignored > 0 ? `${ignored} filas ignoradas por tramo no encontrado.` : ""} ${csvPreview.errors.length > 0 ? `${csvPreview.errors.length} filas con error de formato.` : ""}` });
    setCsvPreview(null);
    setCsvModalOpen(false);
  };

  return (
    <>
      <style>{`
        .input-inline { background: transparent; border: 1px solid transparent; color: var(--text); padding: 0.15rem 0.3rem; border-radius: 4px; font-family: var(--font-display); font-weight: 700; width: 100%; min-width: 90px; outline: none; transition: background 0.15s; }
        .input-inline:focus { background: var(--surface2); border-color: var(--border); }
        .date-inline { background: transparent; color: var(--text-muted); border: none; outline: none; font-family: var(--font-mono); font-size: 0.72rem; cursor: pointer; padding: 0.1rem; }
        .date-inline::-webkit-calendar-picker-indicator { cursor: pointer; filter: invert(0.6); }
        .cell-group { display: flex; flex-direction: column; gap: 0.35rem; align-items: flex-end; justify-content: center; }
      `}</style>

      <PanelPlazas totalInscritos={totalInscritos} maximos={maximos} setMaximos={setMaximos} />

      <TimelineTramos tramos={tramos} />

      <TablaTramos
        tramos={tramos} setTramos={setTramos}
        updateTramoPrecio={updateTramoPrecio}
        inscritos={inscritos} updateInscritos={updateInscritos}
        totalInscritos={totalInscritos} ingresosPorDistancia={ingresosPorDistancia}
        maximos={maximos} codigos={codigos}
        addTramo={addTramo}
        onRequestDelete={(t, stats) => setPendingDelete({ tramo: t, stats })}
        onOpenCsv={() => { setCsvPreview(null); setCsvMsg(null); setCsvModalOpen(true); }}
      />

      <CodigosPromo />

      {pendingDelete && (
        <ModalConfirmDelete
          tramo={pendingDelete.tramo}
          stats={pendingDelete.stats}
          onConfirm={() => {
            const id = pendingDelete.tramo.id;
            setTramos(prev => prev.filter(x => x.id !== id));
            setInscritos(prev => { const { [id]: _dropped, ...restTramos } = prev.tramos || {}; return { ...prev, tramos: restTramos }; });
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <ModalCsvImport
        open={csvModalOpen} onClose={() => setCsvModalOpen(false)}
        tramos={tramos} inscritos={inscritos}
        csvPreview={csvPreview} setCsvPreview={setCsvPreview}
        csvMergeMode={csvMergeMode} setCsvMergeMode={setCsvMergeMode}
        onFileChange={handleCsvFile} onConfirm={handleCsvConfirm}
      />

      {csvMsg && !csvModalOpen && (
        <div style={{ position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", zIndex: 9997, maxWidth: 520, background: csvMsg.type === "success" ? "rgba(52,211,153,.12)" : "rgba(248,113,113,.12)", border: `1px solid ${csvMsg.type === "success" ? "rgba(52,211,153,.35)" : "rgba(248,113,113,.35)"}`, color: csvMsg.type === "success" ? "var(--green)" : "var(--red)", borderRadius: 10, padding: ".75rem 1.1rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, display: "flex", alignItems: "center", gap: ".75rem", boxShadow: "0 8px 32px rgba(0,0,0,.4)" }}>
          <span style={{ flex: 1 }}>{csvMsg.text}</span>
          <button onClick={() => setCsvMsg(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontSize: "var(--fs-base)", opacity: .7 }}>✕</button>
        </div>
      )}
    </>
  );
};
