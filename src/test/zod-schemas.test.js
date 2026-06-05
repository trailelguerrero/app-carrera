/**
 * zod-schemas.test.js — Fase 5
 *
 * Tests para los esquemas Zod de camisetas, logística y presupuesto.
 *
 * CAM-01  nombre requerido en pedidoCamiseta
 * CAM-02  teléfono opcional pero validado si presente
 * CAM-03  email opcional pero validado si presente
 * CAM-04  líneas: mínimo una
 * CAM-05  línea: cantidad mínima 1
 * CAM-06  línea: precioVenta no negativo
 * CAM-07  datos válidos → ok:true
 *
 * LOG-01  nombre requerido en pedidoProveedor
 * LOG-02  artículos: mínimo uno
 * LOG-03  artículo: cantidad mínima 1
 * LOG-04  artículo: precioUnit no negativo
 * LOG-05  estado inválido rechazado
 * LOG-06  datos válidos → ok:true
 * LOG-07  factura null es válida
 *
 * CON-01  nombre requerido en concepto
 * CON-02  tipo 'fijo' valida costeTotal y estadoPago
 * CON-03  tipo 'variable' valida estadoPedido y costeUnitarioReal
 * CON-04  tipo desconocido rechazado
 * CON-05  costeTotal negativo rechazado en fijo
 * CON-06  concepto fijo válido → ok:true
 * CON-07  concepto variable válido → ok:true
 */
import { describe, it, expect } from 'vitest';
import { validarPedidoCamiseta }  from '../lib/schemas/camisetaSchema.js';
import { validarPedidoProveedor } from '../lib/schemas/logisticaSchema.js';
import { validarConcepto }        from '../lib/schemas/conceptoSchema.js';

// ─── Datos base ───────────────────────────────────────────────────────────────

const lineaValida = {
  tipo: 'corredor',
  talla: 'M',
  cantidad: 2,
  precioVenta: 15,
  estadoPago: 'pendiente',
  estadoEntrega: 'pendiente',
};

const pedidoCamisetaValido = {
  nombre: 'María García',
  telefono: '612345678',
  email: 'maria@example.com',
  notas: '',
  lineas: [lineaValida],
};

const articuloValido = {
  nombre: 'Medallas finisher',
  cantidad: 100,
  precioUnit: 3.5,
  fuente: 'manual',
};

const pedidoProveedorValido = {
  nombre: 'Pedido medallas 2026',
  proveedor: 'Medallas España S.L.',
  estado: 'borrador',
  fechaLimitePedido: '2026-03-01',
  fechaEntrega: '2026-04-01',
  articulos: [articuloValido],
  factura: null,
  notas: '',
};

const conceptoFijoValido = {
  tipo: 'fijo',
  nombre: 'Seguros del evento',
  costeTotal: 1200,
  estadoPago: 'presupuestado',
  fechaPago: '2026-06-01',
  numFactura: 'FAC-001',
  proveedor: 'Mapfre',
  activo: true,
};

const conceptoVariableValido = {
  tipo: 'variable',
  nombre: 'Medallas finisher',
  modoUniforme: true,
  estadoPedido: 'pendiente',
  fechaEntrega: '2026-06-15',
  costeUnitarioReal: '',
  activo: true,
};

// ─── CAM: Camisetas ───────────────────────────────────────────────────────────

describe('CAM-01 — nombre requerido en pedidoCamiseta', () => {
  it('nombre vacío → error', () => {
    const r = validarPedidoCamiseta({ ...pedidoCamisetaValido, nombre: '' });
    expect(r.ok).toBe(false);
    expect(r.errors.nombre).toBeTruthy();
  });

  it('nombre ausente → error', () => {
    const { nombre, ...sin } = pedidoCamisetaValido;
    const r = validarPedidoCamiseta(sin);
    expect(r.ok).toBe(false);
    expect(r.errors.nombre).toBeTruthy();
  });
});

describe('CAM-02 — teléfono opcional pero validado si presente', () => {
  it('teléfono vacío → ok', () => {
    const r = validarPedidoCamiseta({ ...pedidoCamisetaValido, telefono: '' });
    expect(r.ok).toBe(true);
  });

  it('teléfono válido → ok', () => {
    const r = validarPedidoCamiseta({ ...pedidoCamisetaValido, telefono: '722345678' });
    expect(r.ok).toBe(true);
  });

  it('teléfono inválido → error', () => {
    const r = validarPedidoCamiseta({ ...pedidoCamisetaValido, telefono: '123' });
    expect(r.ok).toBe(false);
    expect(r.errors.telefono).toBeTruthy();
  });

  it('teléfono con espacios normalizado → ok', () => {
    const r = validarPedidoCamiseta({ ...pedidoCamisetaValido, telefono: '612 345 678' });
    expect(r.ok).toBe(true);
  });
});

describe('CAM-03 — email opcional pero validado si presente', () => {
  it('email vacío → ok', () => {
    const r = validarPedidoCamiseta({ ...pedidoCamisetaValido, email: '' });
    expect(r.ok).toBe(true);
  });

  it('email válido → ok', () => {
    const r = validarPedidoCamiseta({ ...pedidoCamisetaValido, email: 'test@test.com' });
    expect(r.ok).toBe(true);
  });

  it('email inválido → error', () => {
    const r = validarPedidoCamiseta({ ...pedidoCamisetaValido, email: 'no-es-email' });
    expect(r.ok).toBe(false);
    expect(r.errors.email).toBeTruthy();
  });
});

describe('CAM-04 — líneas: mínimo una', () => {
  it('array vacío → error', () => {
    const r = validarPedidoCamiseta({ ...pedidoCamisetaValido, lineas: [] });
    expect(r.ok).toBe(false);
    expect(r.errors.lineas).toBeTruthy();
  });
});

describe('CAM-05 — línea: cantidad mínima 1', () => {
  it('cantidad 0 → error', () => {
    const r = validarPedidoCamiseta({
      ...pedidoCamisetaValido,
      lineas: [{ ...lineaValida, cantidad: 0 }],
    });
    expect(r.ok).toBe(false);
  });

  it('cantidad -1 → error', () => {
    const r = validarPedidoCamiseta({
      ...pedidoCamisetaValido,
      lineas: [{ ...lineaValida, cantidad: -1 }],
    });
    expect(r.ok).toBe(false);
  });
});

describe('CAM-06 — línea: precioVenta no negativo', () => {
  it('precioVenta negativo → error', () => {
    const r = validarPedidoCamiseta({
      ...pedidoCamisetaValido,
      lineas: [{ ...lineaValida, precioVenta: -5 }],
    });
    expect(r.ok).toBe(false);
  });

  it('precioVenta 0 → ok (regalo)', () => {
    const r = validarPedidoCamiseta({
      ...pedidoCamisetaValido,
      lineas: [{ ...lineaValida, precioVenta: 0 }],
    });
    expect(r.ok).toBe(true);
  });
});

describe('CAM-07 — datos válidos → ok:true', () => {
  it('pedido mínimo → ok', () => {
    const r = validarPedidoCamiseta({ nombre: 'Juan', lineas: [lineaValida] });
    expect(r.ok).toBe(true);
  });

  it('pedido completo → ok y datos normalizados', () => {
    const r = validarPedidoCamiseta(pedidoCamisetaValido);
    expect(r.ok).toBe(true);
    expect(r.data.nombre).toBe('María García');
    expect(r.data.lineas).toHaveLength(1);
  });
});

// ─── LOG: Logística ───────────────────────────────────────────────────────────

describe('LOG-01 — nombre requerido en pedidoProveedor', () => {
  it('nombre vacío → error', () => {
    const r = validarPedidoProveedor({ ...pedidoProveedorValido, nombre: '' });
    expect(r.ok).toBe(false);
    expect(r.errors.nombre).toBeTruthy();
  });
});

describe('LOG-02 — artículos: mínimo uno', () => {
  it('array vacío → error', () => {
    const r = validarPedidoProveedor({ ...pedidoProveedorValido, articulos: [] });
    expect(r.ok).toBe(false);
    expect(r.errors.articulos).toBeTruthy();
  });
});

describe('LOG-03 — artículo: cantidad mínima 1', () => {
  it('cantidad 0 → error', () => {
    const r = validarPedidoProveedor({
      ...pedidoProveedorValido,
      articulos: [{ ...articuloValido, cantidad: 0 }],
    });
    expect(r.ok).toBe(false);
  });
});

describe('LOG-04 — artículo: precioUnit no negativo', () => {
  it('precioUnit negativo → error', () => {
    const r = validarPedidoProveedor({
      ...pedidoProveedorValido,
      articulos: [{ ...articuloValido, precioUnit: -1 }],
    });
    expect(r.ok).toBe(false);
  });

  it('precioUnit 0 → ok', () => {
    const r = validarPedidoProveedor({
      ...pedidoProveedorValido,
      articulos: [{ ...articuloValido, precioUnit: 0 }],
    });
    expect(r.ok).toBe(true);
  });
});

describe('LOG-05 — estado inválido rechazado', () => {
  it('estado desconocido → error', () => {
    const r = validarPedidoProveedor({ ...pedidoProveedorValido, estado: 'inexistente' });
    expect(r.ok).toBe(false);
    expect(r.errors.estado).toBeTruthy();
  });
});

describe('LOG-06 — datos válidos → ok:true', () => {
  it('pedido mínimo → ok', () => {
    const r = validarPedidoProveedor({
      nombre: 'Medallas',
      articulos: [{ nombre: 'Medalla', cantidad: 1, precioUnit: 5 }],
    });
    expect(r.ok).toBe(true);
  });

  it('pedido completo → ok y nombre normalizado', () => {
    const r = validarPedidoProveedor(pedidoProveedorValido);
    expect(r.ok).toBe(true);
    expect(r.data.nombre).toBe('Pedido medallas 2026');
  });
});

describe('LOG-07 — factura null es válida', () => {
  it('sin factura → ok', () => {
    const r = validarPedidoProveedor({ ...pedidoProveedorValido, factura: null });
    expect(r.ok).toBe(true);
  });

  it('factura con datos → ok', () => {
    const r = validarPedidoProveedor({
      ...pedidoProveedorValido,
      factura: { numero: 'FAC-001', importe: 350, estado: 'pendiente', fecha: '2026-05-01' },
    });
    expect(r.ok).toBe(true);
  });
});

// ─── CON: Conceptos de presupuesto ───────────────────────────────────────────

describe('CON-01 — nombre requerido en concepto', () => {
  it('nombre vacío en fijo → error', () => {
    const r = validarConcepto({ ...conceptoFijoValido, nombre: '' });
    expect(r.ok).toBe(false);
    expect(r.errors.nombre).toBeTruthy();
  });

  it('nombre vacío en variable → error', () => {
    const r = validarConcepto({ ...conceptoVariableValido, nombre: '' });
    expect(r.ok).toBe(false);
    expect(r.errors.nombre).toBeTruthy();
  });
});

describe('CON-02 — tipo fijo valida costeTotal y estadoPago', () => {
  it('estadoPago inválido → error', () => {
    const r = validarConcepto({ ...conceptoFijoValido, estadoPago: 'xxx' });
    expect(r.ok).toBe(false);
    expect(r.errors.estadoPago).toBeTruthy();
  });
});

describe('CON-03 — tipo variable valida estadoPedido', () => {
  it('estadoPedido inválido → error', () => {
    const r = validarConcepto({ ...conceptoVariableValido, estadoPedido: 'xxx' });
    expect(r.ok).toBe(false);
    expect(r.errors.estadoPedido).toBeTruthy();
  });

  it('costeUnitarioReal vacío → ok (= estimado)', () => {
    const r = validarConcepto({ ...conceptoVariableValido, costeUnitarioReal: '' });
    expect(r.ok).toBe(true);
  });

  it('costeUnitarioReal número → ok', () => {
    const r = validarConcepto({ ...conceptoVariableValido, costeUnitarioReal: 3.5 });
    expect(r.ok).toBe(true);
  });
});

describe('CON-04 — tipo desconocido rechazado', () => {
  it('tipo "mixto" → error', () => {
    const r = validarConcepto({ ...conceptoFijoValido, tipo: 'mixto' });
    expect(r.ok).toBe(false);
  });
});

describe('CON-05 — costeTotal negativo rechazado en fijo', () => {
  it('costeTotal -1 → error', () => {
    const r = validarConcepto({ ...conceptoFijoValido, costeTotal: -1 });
    expect(r.ok).toBe(false);
    expect(r.errors.costeTotal).toBeTruthy();
  });

  it('costeTotal 0 → ok (sin coste todavía)', () => {
    const r = validarConcepto({ ...conceptoFijoValido, costeTotal: 0 });
    expect(r.ok).toBe(true);
  });
});

describe('CON-06 — concepto fijo válido → ok:true', () => {
  it('datos completos → ok', () => {
    const r = validarConcepto(conceptoFijoValido);
    expect(r.ok).toBe(true);
    expect(r.data.tipo).toBe('fijo');
    expect(r.data.nombre).toBe('Seguros del evento');
  });

  it('datos mínimos → ok', () => {
    const r = validarConcepto({ tipo: 'fijo', nombre: 'Coste mínimo' });
    expect(r.ok).toBe(true);
  });
});

describe('CON-07 — concepto variable válido → ok:true', () => {
  it('datos completos → ok', () => {
    const r = validarConcepto(conceptoVariableValido);
    expect(r.ok).toBe(true);
    expect(r.data.tipo).toBe('variable');
    expect(r.data.nombre).toBe('Medallas finisher');
  });

  it('datos mínimos → ok', () => {
    const r = validarConcepto({ tipo: 'variable', nombre: 'Chip cronometraje' });
    expect(r.ok).toBe(true);
  });
});
