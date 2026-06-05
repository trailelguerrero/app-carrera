/**
 * useFocusTrap.ts — Fase 6 · Accesibilidad
 *
 * Mantiene el foco dentro de un contenedor (modal/dialog) mientras está abierto.
 * Al abrir: mueve el foco al primer elemento enfocable.
 * Al cerrar: devuelve el foco al elemento que lo tenía antes.
 * Tab/Shift+Tab ciclan solo dentro del contenedor.
 *
 * Uso:
 *   const trapRef = useFocusTrap(isOpen);
 *   <div ref={trapRef} role="dialog" ...>...</div>
 */
import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "details > summary",
].join(", ");

export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Guardar el elemento que tenía el foco antes de abrir el modal
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Mover el foco al primer elemento enfocable
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => !el.closest("[hidden]"));

    if (focusable.length > 0) {
      // Pequeño delay para que el modal termine de renderizarse
      requestAnimationFrame(() => focusable[0].focus());
    }

    // Trap: Tab cicla dentro, Shift+Tab al revés
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableEls = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter((el) => !el.closest("[hidden]"));

      if (focusableEls.length === 0) return;

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      // Devolver el foco al elemento anterior al cerrar
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [active]);

  return containerRef;
}
