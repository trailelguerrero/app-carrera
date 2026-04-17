/**
 * usePaginacion — hook reutilizable de paginación estilo Kinetik Ops
 * Uso: const { pagina, setPagina, items, total, porPagina, PaginadorUI } = usePaginacion(arrayCompleto, 15)
 */
import { useState, useEffect } from 'react';

export function usePaginacion(items, porPagina = 15) {
  const [pagina, setPagina] = useState(1);

  // Resetear a página 1 cuando cambia el array (filtros aplicados)
  useEffect(() => { setPagina(1); }, [items.length]);

  const total    = items.length;
  const paginas  = Math.max(1, Math.ceil(total / porPagina));
  const paginaReal = Math.min(pagina, paginas);
  const desde    = (paginaReal - 1) * porPagina;
  const itemsPag = items.slice(desde, desde + porPagina);

  // Componente de paginación inline — Kinetik Ops style
  function PaginadorUI() {
    if (total <= porPagina) return null;
    const hayAnterior = paginaReal > 1;
    const haySiguiente = paginaReal < paginas;

    // Generar páginas a mostrar (máximo 5 números)
    const rango = [];
    let ini = Math.max(1, paginaReal - 2);
    let fin = Math.min(paginas, ini + 4);
    if (fin - ini < 4) ini = Math.max(1, fin - 4);
    for (let i = ini; i <= fin; i++) rango.push(i);

    const btnBase = {
      fontFamily: 'var(--font-mono)', fontSize: '.65rem', fontWeight: 700,
      padding: '.28rem .6rem', borderRadius: 8, border: '1px solid var(--border)',
      cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)',
      transition: 'all .15s', minWidth: 32, minHeight: 30,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    };
    const btnActivo = {
      ...btnBase,
      background: 'rgba(34,211,238,0.12)', color: 'var(--cyan)',
      borderColor: 'rgba(34,211,238,0.4)', boxShadow: '0 0 8px rgba(34,211,238,0.1)',
    };

    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '.65rem 0 .25rem', flexWrap: 'wrap', gap: '.5rem',
      }}>
        {/* Contador estilo Kinetik */}
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '.62rem', color: 'var(--text-dim)',
          letterSpacing: '.04em',
        }}>
          Mostrando{' '}
          <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>
            {desde + 1}–{Math.min(desde + porPagina, total)}
          </span>
          {' '}de{' '}
          <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{total}</span>
        </span>

        {/* Controles de página */}
        <div style={{ display: 'flex', gap: '.3rem', alignItems: 'center' }}>
          <button style={{ ...btnBase, opacity: hayAnterior ? 1 : 0.3, cursor: hayAnterior ? 'pointer' : 'default' }}
            onClick={() => hayAnterior && setPagina(p => p - 1)}
            disabled={!hayAnterior}>‹</button>

          {ini > 1 && <>
            <button style={btnBase} onClick={() => setPagina(1)}>1</button>
            {ini > 2 && <span style={{ ...btnBase, cursor: 'default', border: 'none' }}>…</span>}
          </>}

          {rango.map(n => (
            <button key={n}
              style={n === paginaReal ? btnActivo : btnBase}
              onClick={() => setPagina(n)}>
              {n}
            </button>
          ))}

          {fin < paginas && <>
            {fin < paginas - 1 && <span style={{ ...btnBase, cursor: 'default', border: 'none' }}>…</span>}
            <button style={btnBase} onClick={() => setPagina(paginas)}>{paginas}</button>
          </>}

          <button style={{ ...btnBase, opacity: haySiguiente ? 1 : 0.3, cursor: haySiguiente ? 'pointer' : 'default' }}
            onClick={() => haySiguiente && setPagina(p => p + 1)}
            disabled={!haySiguiente}>›</button>
        </div>
      </div>
    );
  }

  return { pagina: paginaReal, setPagina, items: itemsPag, total, porPagina, paginas, PaginadorUI };
}
