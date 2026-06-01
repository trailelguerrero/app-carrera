/**
 * TabRecorridos.jsx — Gestión de recorridos GPX de la carrera.
 *
 * Permite:
 *  • Subir archivos .gpx (se parsean y simplifican en el cliente)
 *  • Ver los tracks en el mapa de Leaflet
 *  • Editar nombre, color y km de cada recorrido
 *  • Activar/desactivar recorridos (ocultar del mapa sin borrarlos)
 *  • Eliminar recorridos
 *  • Multi-carrera: cada instalación puede tener sus propios recorridos
 *
 * Los tracks se almacenan como arrays de [lat,lng] simplificados
 * (≈100-300 pts por track vs miles en el GPX original), por lo que
 * caben perfectamente en localStorage (~6-15 KB por recorrido).
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { gpxFileToTrack, defaultTrackColor, TRACK_COLORS_DEFAULT } from "@/lib/gpxUtils";

// ─── COMPONENTE MAPA INLINE ───────────────────────────────────────────────────
// Muestra sólo los tracks (sin marcadores) para la vista de gestión de recorridos.

function MapaRecorridos({ recorridos }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const linesRef     = useRef([]);

  // Montar mapa
  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof window.L === "undefined") return;
    const L = window.L;

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({ iconRetinaUrl: "", iconUrl: "", shadowUrl: "" });

    const map = L.map(containerRef.current, {
      center: [40.175, -5.215],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
      tap: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; linesRef.current = []; };
  }, []);

  // Actualizar polylines cuando cambian los recorridos
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof window.L === "undefined") return;
    const L = window.L;

    linesRef.current.forEach(l => l.remove());
    linesRef.current = [];

    const bounds = [];
    recorridos.filter(r => r.activo !== false && r.puntos?.length > 1).forEach(r => {
      const latLngs = r.puntos.map(p => [p[0], p[1]]);
      const line = L.polyline(latLngs, {
        color: r.color || "#22d3ee",
        weight: 3,
        opacity: 0.85,
        smoothFactor: 1,
      }).addTo(map);
      line.bindTooltip(r.nombre, { permanent: false, sticky: true });
      linesRef.current.push(line);
      latLngs.forEach(ll => bounds.push(ll));
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }, [recorridos]);

  const activos = recorridos.filter(r => r.activo !== false && r.puntos?.length > 1).length;

  return (
    <div className="card" style={{ marginBottom: ".85rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem", flexWrap: "wrap", gap: ".4rem" }}>
        <div className="ct">🗺️ Vista de recorridos</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
          {activos} track{activos !== 1 ? "s" : ""} visible{activos !== 1 ? "s" : ""}
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          height: "320px",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border)",
          overflow: "hidden",
          isolation: "isolate",
        }}
      />
    </div>
  );
}

// ─── CARD DE UN RECORRIDO ─────────────────────────────────────────────────────

function RecorridoCard({ recorrido, onEdit, onDelete, onToggle }) {
  const pct = Math.min(100, Math.round((recorrido.puntos?.length || 0) / 3));
  return (
    <div
      className="card"
      style={{
        borderLeft: `3px solid ${recorrido.activo !== false ? recorrido.color : "var(--border)"}`,
        opacity: recorrido.activo !== false ? 1 : 0.55,
        transition: "opacity .18s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: ".5rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap", marginBottom: ".3rem" }}>
            {/* Swatch de color */}
            <span style={{
              width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
              background: recorrido.color, border: "2px solid rgba(255,255,255,.15)",
              boxShadow: `0 0 6px ${recorrido.color}60`,
            }} />
            <span style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>{recorrido.nombre}</span>
            {recorrido.distanciaKm && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                padding: ".1rem .4rem", borderRadius: 20,
                background: `${recorrido.color}18`, color: recorrido.color,
                border: `1px solid ${recorrido.color}40`,
              }}>
                {recorrido.distanciaKm} km
              </span>
            )}
            {recorrido.activo === false && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)",
                padding: ".1rem .35rem", borderRadius: 10,
                background: "rgba(100,100,120,.12)", color: "var(--text-dim)",
                border: "1px solid var(--border)",
              }}>oculto</span>
            )}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
            {recorrido.puntos?.length ?? 0} puntos GPS
            {recorrido.totalOriginal && recorrido.totalOriginal > recorrido.puntos?.length && (
              <span style={{ color: "var(--text-dim)", marginLeft: ".4rem" }}>
                (simplificado de {recorrido.totalOriginal.toLocaleString()})
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: ".3rem", flexShrink: 0 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onToggle(recorrido.id)}
            title={recorrido.activo !== false ? "Ocultar en mapa" : "Mostrar en mapa"}
            style={{ fontSize: "var(--fs-sm)", padding: ".2rem .45rem" }}
          >
            {recorrido.activo !== false ? "👁" : "🙈"}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onEdit(recorrido)}
            style={{ fontSize: "var(--fs-sm)", padding: ".2rem .45rem" }}
          >✏️</button>
          <button
            className="btn btn-red btn-sm"
            onClick={() => onDelete(recorrido.id)}
            style={{ fontSize: "var(--fs-sm)", padding: ".2rem .45rem" }}
          >✕</button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL EDICIÓN ────────────────────────────────────────────────────────────

function ModalEditarRecorrido({ recorrido, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: recorrido.nombre || "",
    distanciaKm: recorrido.distanciaKm || "",
    color: recorrido.color || "#22d3ee",
  });

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <div style={{ fontWeight: 700 }}>✏️ Editar recorrido</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>Nombre *</span>
            <input
              className="inp" autoFocus
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="ej. TG25"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>Distancia (km)</span>
            <input
              className="inp" type="number" step="0.1" min="0"
              value={form.distanciaKm}
              onChange={e => setForm(f => ({ ...f, distanciaKm: e.target.value }))}
              placeholder="ej. 25"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>Color en el mapa</span>
            <div style={{ display: "flex", gap: ".4rem", alignItems: "center", flexWrap: "wrap" }}>
              {TRACK_COLORS_DEFAULT.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{
                    width: 28, height: 28, borderRadius: "50%", background: c,
                    border: form.color === c ? "3px solid white" : "2px solid transparent",
                    outline: form.color === c ? `2px solid ${c}` : "none",
                    cursor: "pointer", flexShrink: 0,
                  }}
                />
              ))}
              {/* Input de color libre */}
              <label style={{ display: "flex", alignItems: "center", gap: ".3rem", cursor: "pointer" }}>
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  style={{ width: 28, height: 28, border: "none", padding: 0, background: "none", cursor: "pointer", borderRadius: 4 }}
                />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>Personalizado</span>
              </label>
            </div>
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
              onSave(form);
            }}
          >Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── TAB PRINCIPAL ────────────────────────────────────────────────────────────

export function TabRecorridos({ recorridos, setRecorridos }) {
  const [editando, setEditando] = useState(null);     // recorrido en edición
  const [deleting, setDeleting] = useState(null);     // id a eliminar
  const [cargando, setCargando] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setCargando(true);
    const nuevos = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".gpx")) {
        toast.error(`${file.name} no es un archivo GPX válido`);
        continue;
      }
      try {
        const { puntos, totalOriginal, nombre } = await gpxFileToTrack(file);
        const idx   = recorridos.length + nuevos.length;
        nuevos.push({
          id:            Date.now() + idx,
          nombre,
          distanciaKm:   "",
          color:         defaultTrackColor(idx),
          puntos,
          totalOriginal,
          activo:        true,
          creadoEn:      new Date().toISOString(),
        });
        toast.success(`✅ ${nombre} — ${puntos.length} pts (de ${totalOriginal.toLocaleString()})`);
      } catch (err) {
        toast.error(`Error en ${file.name}: ${err.message}`);
      }
    }

    if (nuevos.length > 0) {
      setRecorridos(prev => [...(Array.isArray(prev) ? prev : []), ...nuevos]);
    }

    setCargando(false);
    // Reset input para permitir subir el mismo archivo de nuevo
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [recorridos, setRecorridos]);

  const handleEdit = useCallback((recorrido) => setEditando(recorrido), []);

  const handleSaveEdit = useCallback((updates) => {
    setRecorridos(prev => prev.map(r =>
      r.id === editando.id ? { ...r, ...updates } : r
    ));
    setEditando(null);
    toast.success("Recorrido actualizado");
  }, [editando, setRecorridos]);

  const handleToggle = useCallback((id) => {
    setRecorridos(prev => prev.map(r =>
      r.id === id ? { ...r, activo: r.activo === false ? true : false } : r
    ));
  }, [setRecorridos]);

  const handleDelete = useCallback((id) => setDeleting(id), []);

  const confirmDelete = useCallback(() => {
    setRecorridos(prev => prev.filter(r => r.id !== deleting));
    setDeleting(null);
    toast.success("Recorrido eliminado");
  }, [deleting, setRecorridos]);

  const lista = Array.isArray(recorridos) ? recorridos : [];

  return (
    <>
      {/* ── Cabecera ── */}
      <div className="ph">
        <div>
          <div className="pt">🗺️ Recorridos GPX</div>
          <div className="pd">
            {lista.length} recorrido{lista.length !== 1 ? "s" : ""} ·
            Sube los archivos .gpx de cada modalidad — se simplifican y guardan automáticamente
          </div>
        </div>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          <label
            className={`btn btn-primary${cargando ? " disabled" : ""}`}
            style={{ cursor: cargando ? "not-allowed" : "pointer" }}
          >
            {cargando ? "⏳ Procesando…" : "+ Subir GPX"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".gpx,application/gpx+xml"
              multiple
              onChange={handleFileUpload}
              disabled={cargando}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      {/* ── Mapa de preview ── */}
      {lista.length > 0 && <MapaRecorridos recorridos={lista} />}

      {/* ── Lista de recorridos ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
        {lista.map(r => (
          <RecorridoCard
            key={r.id}
            recorrido={r}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        ))}

        {lista.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: ".75rem" }}>🗺️</div>
            <div style={{ fontWeight: 700, marginBottom: ".4rem" }}>Sin recorridos</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-dim)", lineHeight: 1.7, marginBottom: "1rem", maxWidth: 360, margin: "0 auto .85rem" }}>
              Sube los archivos <strong>.gpx</strong> de cada modalidad (TG7, TG13, TG25…).
              Los tracks se simplifican para ocupar poco espacio y se superponen
              sobre el mapa de localizaciones.
            </div>
            <label className="btn btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
              + Subir primer recorrido
              <input
                type="file" accept=".gpx,application/gpx+xml" multiple
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>
        )}
      </div>

      {/* ── Leyenda / info ── */}
      {lista.length > 0 && (
        <div className="card" style={{ marginTop: ".85rem", background: "rgba(34,211,238,.04)", borderColor: "rgba(34,211,238,.15)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", lineHeight: 1.7 }}>
            💡 <strong style={{ color: "var(--text-muted)" }}>Consejo:</strong> Los recorridos aparecen automáticamente
            sobre el mapa de Localizaciones Maestras (pestaña "Ubicaciones"). Puedes ocultar un track
            con el botón 👁 sin eliminarlo. Para actualizar un recorrido, bórralo y sube el nuevo GPX.
          </div>
        </div>
      )}

      {/* ── Modal edición ── */}
      {editando && (
        <ModalEditarRecorrido
          recorrido={editando}
          onSave={handleSaveEdit}
          onClose={() => setEditando(null)}
        />
      )}

      {/* ── Confirm delete ── */}
      {deleting && (
        <div className="modal-backdrop" style={{ zIndex: 200 }} onClick={e => e.target === e.currentTarget && setDeleting(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 320, textAlign: "center" }}>
            <div className="modal-body" style={{ paddingTop: "1.5rem" }}>
              <div style={{ fontSize: "var(--fs-xl)", marginBottom: ".5rem" }}>🗑️</div>
              <div style={{ fontWeight: 700, marginBottom: ".3rem" }}>¿Eliminar recorrido?</div>
              <div className="mono xs muted">Esta acción no se puede deshacer. El archivo GPX original no se verá afectado.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={confirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
