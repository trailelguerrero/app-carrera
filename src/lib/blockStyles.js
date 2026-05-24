/**
 * blockStyles.js — utilidades de clases CSS compartidas
 *
 * BLOCK_CSS fue eliminado en la Fase 2 (Tarea 2.1).
 * El CSS vive en src/styles/blocks.css, importado una vez en main.tsx.
 *
 * blockCls sigue siendo la única exportación útil de este módulo.
 * Equivale a clsx/cx sin dependencia externa.
 */

export const blockCls = (...args) => args.filter(Boolean).join(" ");
