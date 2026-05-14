/**
 * QuickNav — Spotlight de módulos (Cmd/Ctrl+K)
 * [NAV-04] F5 — Solo desktop (>768px)
 *
 * Props:
 *   blocks     {Array}    — array BLOCKS de Index.jsx
 *   badges     {Object}   — alertasBadges { [id]: number|boolean }
 *   onNavigate {Function} — (id) => void
 *   onClose    {Function} — () => void
 */
import React, { useState, useEffect, useRef, useCallback } from "react";

export default function QuickNav({ blocks, badges = {}, onNavigate, onClose }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filtro: por label (case-insensitive)
  const filtered = query.trim() === ""
    ? blocks
    : blocks.filter(b => b.label.toLowerCase().includes(query.toLowerCase()));

  // Resetear selección cuando cambia el filtro
  useEffect(() => { setSelectedIdx(0); }, [query]);

  // Focus automático al montar
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Scroll del ítem seleccionado a la vista
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIdx];
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const confirm = useCallback((idx) => {
    const block = filtered[idx ?? selectedIdx];
    if (block) { onNavigate(block.id); onClose(); }
  }, [filtered, selectedIdx, onNavigate, onClose]);

  // Teclado: flechas, Enter, Escape, Tab (focus trap)
  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      confirm();
    } else if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Tab") {
      // Focus trap: Tab/Shift+Tab se queda dentro del overlay
      e.preventDefault();
    }
  }, [filtered.length, confirm, onClose]);

  const itemId = (idx) => `quicknav-item-${idx}`;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Buscar módulo"
        aria-modal="true"
        style={{
          position: "fixed",
          top: "18%", left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9001,
          width: "min(480px, calc(100vw - 2rem))",
          background: "var(--surface)",
          border: "1px solid var(--teg-cyan-border-xs)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px var(--teg-cyan-border-xs)",
          overflow: "hidden",
        }}
      >
        {/* Input de búsqueda */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.6rem",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: "1rem", opacity: 0.5, flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar módulo…"
            aria-activedescendant={filtered.length > 0 ? itemId(selectedIdx) : undefined}
            aria-autocomplete="list"
            aria-controls="quicknav-list"
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)",
              color: "var(--text)",
            }}
          />
          <kbd style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "var(--text-dim)", background: "var(--surface2)",
            border: "1px solid var(--border)", borderRadius: 5,
            padding: "0.1rem 0.4rem", flexShrink: 0,
          }}>ESC</kbd>
        </div>

        {/* Lista de módulos */}
        <ul
          id="quicknav-list"
          ref={listRef}
          role="listbox"
          aria-label="Módulos"
          style={{
            listStyle: "none", margin: 0, padding: "0.4rem",
            maxHeight: 340, overflowY: "auto",
          }}
        >
          {filtered.length === 0 && (
            <li style={{
              padding: "1rem", textAlign: "center",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
              color: "var(--text-dim)",
            }}>
              Sin resultados
            </li>
          )}
          {filtered.map((b, idx) => {
            const isSelected = idx === selectedIdx;
            const badge = badges[b.id];
            return (
              <li
                key={b.id}
                id={itemId(idx)}
                role="option"
                aria-selected={isSelected}
                onClick={() => confirm(idx)}
                onMouseEnter={() => setSelectedIdx(idx)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.55rem 0.75rem",
                  borderRadius: 10,
                  cursor: "pointer",
                  background: isSelected ? "var(--teg-cyan-dim)" : "transparent",
                  border: isSelected ? "1px solid var(--teg-cyan-border-xs)" : "1px solid transparent",
                  transition: "background 0.1s, border-color 0.1s",
                }}
              >
                {/* Icono */}
                <span style={{
                  fontSize: "1.2rem", flexShrink: 0, position: "relative",
                  filter: isSelected ? "none" : "grayscale(0.3)",
                }}>
                  {b.icon}
                  {badge && (
                    <span style={{
                      position: "absolute", top: -3, right: -5,
                      minWidth: 13, height: 13, borderRadius: 7,
                      background: "var(--red)", color: "#fff",
                      fontSize: "var(--fs-2xs)", fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 3px", lineHeight: 1,
                      fontFamily: "var(--font-mono)", border: "1.5px solid var(--surface)",
                    }}>
                      {typeof badge === "number" ? badge : "!"}
                    </span>
                  )}
                </span>

                {/* Label con highlight de búsqueda */}
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "var(--cyan)" : "var(--text)",
                  flex: 1,
                }}>
                  <Highlight text={b.label} query={query} />
                </span>

                {/* Hint Enter */}
                {isSelected && (
                  <kbd style={{
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                    color: "var(--text-dim)", background: "var(--surface2)",
                    border: "1px solid var(--border)", borderRadius: 5,
                    padding: "0.1rem 0.4rem", flexShrink: 0,
                  }}>↵</kbd>
                )}
              </li>
            );
          })}
        </ul>

        {/* Footer hint */}
        <div style={{
          display: "flex", gap: "1rem", alignItems: "center",
          padding: "0.5rem 1rem",
          borderTop: "1px solid var(--border)",
          fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
          color: "var(--text-dim)",
        }}>
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>ESC cerrar</span>
        </div>
      </div>
    </>
  );
}

/** Resalta el fragmento de query dentro del texto */
function Highlight({ text, query }) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{
        background: "rgba(34,211,238,0.25)",
        color: "var(--cyan)",
        borderRadius: 3,
        padding: "0 1px",
      }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
