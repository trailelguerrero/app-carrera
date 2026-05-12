/**
 * TEG DESIGN SYSTEM — CSS compartido para todos los bloques
 *
 * @deprecated BLOCK_CSS — Tarea 2.1 (Fase 2)
 * El CSS ha sido movido a src/styles/blocks.css e importado
 * una sola vez en main.tsx. Mantener esta exportación vacía
 * evita romper los imports existentes mientras se eliminan
 * los <style>{BLOCK_CSS...} de cada bloque en Tarea 2.2.
 *
 * blockCls sigue siendo válida y no se depreca.
 */

/** @deprecated — el CSS vive en src/styles/blocks.css */
export const BLOCK_CSS = ``;

export const blockCls = (...args) => args.filter(Boolean).join(" ");
