/**
 * Material ↔ Puestos ↔ Ubicaciones ↔ Voluntarios — Test Suite
 *
 * Cubre el análisis "MEJ-LOG-PUESTO":
 *
 * MLP-01  BUG-LOC-01: resolverNuevaLocParaPuesto — se invocaba solo desde
 *         addPuesto; ahora también la usa updatePuesto (editar puesto).
 * MLP-02  resolverNuevaLocParaPuesto — no crea nada si ya hay localizacionId
 *         o si no viene el flag _crearLoc.
 * MLP-03  migrarAsignacionesAPuesto — migra automáticamente cuando la
 *         ubicación tiene exactamente un puesto (sin ambigüedad).
 * MLP-04  migrarAsignacionesAPuesto — NO migra si la ubicación tiene 0 o 2+
 *         puestos (deja para revisión manual) y es idempotente.
 * MLP-05  resolverDestinoAsignacion — resuelve puesto, voluntario y casos
 *         "necesita revisión" (legado, puesto/voluntario eliminado).
 * MLP-06  contarPuestosPorLocalizacion / otrosPuestosEnMismaUbicacion —
 *         detecta ubicaciones compartidas por varios puestos.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { resolverNuevaLocParaPuesto } from '@/hooks/useVoluntarios';
import {
  migrarAsignacionesAPuesto,
  resolverDestinoAsignacion,
  contarPuestosPorLocalizacion,
} from '@/components/logistica/logisticaHelpers';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

// ── MLP-01/02: BUG-LOC-01 ────────────────────────────────────────────────
describe('MLP-01/02 — resolverNuevaLocParaPuesto (BUG-LOC-01)', () => {
  it('crea una nueva ubicación cuando _crearLoc=true y no hay localizacionId', () => {
    const locs = [{ id: 1, nombre: 'Existente' }];
    const data = { nombre: 'Avituallamiento KM 20', tipo: 'Avituallamiento', _crearLoc: true, lat: 40.1, lng: -5.1 };
    const { localizacionId, nuevaLoc } = resolverNuevaLocParaPuesto(data, locs);
    expect(nuevaLoc).not.toBeNull();
    expect(nuevaLoc.nombre).toBe('Avituallamiento KM 20');
    expect(nuevaLoc.tipo).toBe('Avituallamiento');
    expect(nuevaLoc.lat).toBe(40.1);
    expect(nuevaLoc.id).toBe(2); // siguiente id libre tras el existente
    expect(localizacionId).toBe(nuevaLoc.id);
  });

  it('este es exactamente el caso que fallaba al EDITAR un puesto antes del fix: ahora también funciona', () => {
    // Antes del fix, updatePuesto ignoraba _crearLoc por completo (solo addPuesto
    // lo manejaba). Como ambas funciones ahora llaman a este mismo helper, el
    // resultado de editar un puesto es idéntico al de crearlo.
    const locsActuales = [];
    const puestoEditado = { id: 7, nombre: 'Control de paso KM 16', tipo: 'Control', _crearLoc: true, localizacionId: null };
    const resultado = resolverNuevaLocParaPuesto(puestoEditado, locsActuales);
    expect(resultado.nuevaLoc).not.toBeNull();
    expect(resultado.localizacionId).not.toBeNull();
  });

  it('NO crea nada si ya tiene localizacionId (aunque venga _crearLoc)', () => {
    const data = { nombre: 'X', localizacionId: 5, _crearLoc: true };
    const { localizacionId, nuevaLoc } = resolverNuevaLocParaPuesto(data, []);
    expect(nuevaLoc).toBeNull();
    expect(localizacionId).toBe(5);
  });

  it('NO crea nada si no viene el flag _crearLoc', () => {
    const data = { nombre: 'X', localizacionId: null };
    const { localizacionId, nuevaLoc } = resolverNuevaLocParaPuesto(data, []);
    expect(nuevaLoc).toBeNull();
    expect(localizacionId).toBeNull();
  });

  it('NO crea nada si no hay nombre', () => {
    const data = { nombre: '', _crearLoc: true };
    const { nuevaLoc } = resolverNuevaLocParaPuesto(data, []);
    expect(nuevaLoc).toBeNull();
  });
});

// ── MLP-03/04: migración automática de asignaciones legadas ─────────────
describe('MLP-03/04 — migrarAsignacionesAPuesto', () => {
  const puestos = [
    { id: 10, nombre: 'Avituallamiento KM 16', localizacionId: 100 },
    { id: 11, nombre: 'Control de paso KM 16', localizacionId: 100 }, // comparte ubicación con el 10
    { id: 12, nombre: 'Avituallamiento KM 4',  localizacionId: 200 }, // único en su ubicación
  ];

  it('migra automáticamente cuando la ubicación tiene exactamente un puesto', () => {
    const asigs = [{ id: 1, materialId: 1, localizacionId: 200, puesto: 'Avituallamiento KM 4', cantidad: 8, estado: 'pendiente' }];
    const { asigs: out, cambios } = migrarAsignacionesAPuesto(asigs, puestos);
    expect(cambios).toBe(1);
    expect(out[0].puestoId).toBe(12);
    expect(out[0].tipoDestino).toBe('puesto');
  });

  it('NO migra cuando la ubicación tiene 2+ puestos (ambiguo) — necesita revisión manual', () => {
    const asigs = [{ id: 2, materialId: 1, localizacionId: 100, puesto: 'algo', cantidad: 3, estado: 'pendiente' }];
    const { asigs: out, cambios } = migrarAsignacionesAPuesto(asigs, puestos);
    expect(cambios).toBe(0);
    expect(out[0].puestoId).toBeUndefined();
  });

  it('NO migra cuando la ubicación no tiene ningún puesto', () => {
    const asigs = [{ id: 3, materialId: 1, localizacionId: 999, puesto: 'fantasma', cantidad: 1, estado: 'pendiente' }];
    const { asigs: out, cambios } = migrarAsignacionesAPuesto(asigs, puestos);
    expect(cambios).toBe(0);
    expect(out[0].puestoId).toBeUndefined();
  });

  it('es idempotente: volver a ejecutarla sobre datos ya migrados no cambia nada', () => {
    const asigs = [{ id: 1, materialId: 1, localizacionId: 200, puesto: 'Avituallamiento KM 4', cantidad: 8, estado: 'pendiente' }];
    const primera = migrarAsignacionesAPuesto(asigs, puestos);
    const segunda = migrarAsignacionesAPuesto(primera.asigs, puestos);
    expect(segunda.cambios).toBe(0);
    expect(segunda.asigs).toEqual(primera.asigs);
  });

  it('no toca asignaciones que ya son de tipo voluntario', () => {
    const asigs = [{ id: 4, materialId: 10, tipoDestino: 'voluntario', voluntarioId: 5, localizacionId: 200, cantidad: 1, estado: 'pendiente' }];
    const { cambios } = migrarAsignacionesAPuesto(asigs, puestos);
    expect(cambios).toBe(0);
  });
});

// ── MLP-05: resolverDestinoAsignacion ────────────────────────────────────
describe('MLP-05 — resolverDestinoAsignacion', () => {
  const puestos = [{ id: 10, nombre: 'Avituallamiento KM 16', localizacionId: 100 }];
  const voluntarios = [{ id: 5, nombre: 'Ana', apellidos: 'Gómez' }];
  const locs = [{ id: 100, nombre: 'Punto KM 16' }];

  it('resuelve un destino de tipo puesto', () => {
    const a = { puestoId: 10, tipoDestino: 'puesto' };
    const r = resolverDestinoAsignacion(a, { puestos, voluntarios, locs });
    expect(r.tipo).toBe('puesto');
    expect(r.nombre).toBe('Avituallamiento KM 16');
    expect(r.localizacionId).toBe(100);
    expect(r.necesitaRevision).toBe(false);
  });

  it('resuelve un destino de tipo voluntario', () => {
    const a = { tipoDestino: 'voluntario', voluntarioId: 5 };
    const r = resolverDestinoAsignacion(a, { puestos, voluntarios, locs });
    expect(r.tipo).toBe('voluntario');
    expect(r.nombre).toBe('Ana Gómez');
    expect(r.necesitaRevision).toBe(false);
  });

  it('marca necesitaRevision si el puesto referenciado ya no existe', () => {
    const a = { puestoId: 999, tipoDestino: 'puesto' };
    const r = resolverDestinoAsignacion(a, { puestos, voluntarios, locs });
    expect(r.necesitaRevision).toBe(true);
  });

  it('marca necesitaRevision si el voluntario referenciado ya no existe', () => {
    const a = { tipoDestino: 'voluntario', voluntarioId: 999 };
    const r = resolverDestinoAsignacion(a, { puestos, voluntarios, locs });
    expect(r.necesitaRevision).toBe(true);
  });

  it('caso legado (sin puestoId ni voluntarioId) — necesita revisión, usa el texto/ubicación disponible', () => {
    const a = { puesto: 'Avituallamiento KM 16', localizacionId: 100 };
    const r = resolverDestinoAsignacion(a, { puestos, voluntarios, locs });
    expect(r.tipo).toBe('legacy');
    expect(r.necesitaRevision).toBe(true);
    expect(r.nombre).toBe('Avituallamiento KM 16');
  });
});

// ── MLP-06: ubicaciones compartidas por varios puestos ───────────────────
describe('MLP-06 — contarPuestosPorLocalizacion (ubicación compartida por 2+ puestos)', () => {
  it('cuenta correctamente cuántos puestos hay por ubicación', () => {
    const puestos = [
      { id: 1, localizacionId: 100 },
      { id: 2, localizacionId: 100 },
      { id: 3, localizacionId: 200 },
      { id: 4, localizacionId: null },
    ];
    const conteo = contarPuestosPorLocalizacion(puestos);
    expect(conteo.get(100)).toBe(2);
    expect(conteo.get(200)).toBe(1);
    expect(conteo.has(null)).toBe(false);
  });

  it('caso real: avituallamiento + control de paso en el mismo punto → ambos detectan 1 "otro" puesto', () => {
    const puestos = [
      { id: 10, nombre: 'Avituallamiento KM 16', localizacionId: 100 },
      { id: 11, nombre: 'Control de paso KM 16', localizacionId: 100 },
    ];
    const conteo = contarPuestosPorLocalizacion(puestos);
    // Replica el cálculo de otrosPuestosEnMismaUbicacion (useVoluntarios.js)
    const otros = (p) => Math.max(0, (conteo.get(p.localizacionId) || 1) - 1);
    expect(otros(puestos[0])).toBe(1);
    expect(otros(puestos[1])).toBe(1);
  });
});
