/**
 * voluntario-auth-guard.test.js — FIX-PIN-RACE
 *
 * Tests para lib/voluntarioAuthGuard.js
 *
 * Bug que corrige: el panel de organizador guarda el array de voluntarios
 * entero desde estado en memoria. Si esa copia es anterior a un reset-pin,
 * cambio de PIN del voluntario, o login, el PUT siguiente revertía
 * silenciosamente pinHash/pinPersonalizado/sessionToken al valor viejo.
 *
 * VAG-01  isVoluntariosCollection: identifica correctamente la colección
 * VAG-02  protegerCamposAuth: preserva pinHash/pinPersonalizado de BD
 * VAG-03  protegerCamposAuth: preserva sessionToken/sessionTokenExpiry de BD
 * VAG-04  protegerCamposAuth: respeta cambios de campos NO relacionados con auth
 * VAG-05  protegerCamposAuth: altas nuevas (no presentes en BD) pasan intactas
 * VAG-06  protegerCamposAuth: bajas (presentes en BD pero no en incoming) se eliminan con normalidad
 * VAG-07  protegerCamposAuth: maneja arrays vacíos/no-array con gracia
 * VAG-08  protegerCamposAuth: empareja por id aunque el orden del array cambie
 */
import { describe, it, expect } from 'vitest';
import { isVoluntariosCollection, protegerCamposAuth } from '../../lib/voluntarioAuthGuard.js';

describe('VAG-01 — isVoluntariosCollection', () => {
  it('identifica la clave exacta de la colección de voluntarios', () => {
    expect(isVoluntariosCollection('teg_voluntarios_v1_voluntarios')).toBe(true);
  });

  it('no confunde otras colecciones que empiezan igual', () => {
    expect(isVoluntariosCollection('teg_voluntarios_v1_puestos')).toBe(false);
    expect(isVoluntariosCollection('teg_logistica_v1_mat')).toBe(false);
    expect(isVoluntariosCollection('')).toBe(false);
    expect(isVoluntariosCollection(undefined)).toBe(false);
  });
});

describe('VAG-02 — protegerCamposAuth preserva pinHash/pinPersonalizado de BD', () => {
  it('ignora el pinHash que trae el panel y conserva el de BD (reset-pin reciente)', () => {
    const current = [
      { id: 1, nombre: 'Ana', pinHash: '$2b$10$RESETEADO', pinPersonalizado: false },
    ];
    // El panel tiene en memoria la versión vieja, con el PIN custom aún activo
    const incoming = [
      { id: 1, nombre: 'Ana', talla: 'M', pinHash: '$2b$10$VIEJOCUSTOM', pinPersonalizado: true },
    ];
    const result = protegerCamposAuth(incoming, current);
    expect(result[0].pinHash).toBe('$2b$10$RESETEADO');
    expect(result[0].pinPersonalizado).toBe(false);
    // El resto de campos del panel sí se respetan
    expect(result[0].talla).toBe('M');
  });
});

describe('VAG-03 — protegerCamposAuth preserva sessionToken/sessionTokenExpiry de BD', () => {
  it('conserva el sessionToken vigente aunque el panel lo traiga distinto o vacío', () => {
    const current = [
      { id: 7, nombre: 'Luis', sessionToken: 'tok-real-de-bd', sessionTokenExpiry: '2026-12-01T00:00:00.000Z' },
    ];
    const incoming = [
      { id: 7, nombre: 'Luis', coche: true, sessionToken: null, sessionTokenExpiry: null },
    ];
    const result = protegerCamposAuth(incoming, current);
    expect(result[0].sessionToken).toBe('tok-real-de-bd');
    expect(result[0].sessionTokenExpiry).toBe('2026-12-01T00:00:00.000Z');
    expect(result[0].coche).toBe(true);
  });
});

describe('VAG-04 — protegerCamposAuth respeta cambios de campos no-auth', () => {
  it('aplica con normalidad ediciones legítimas del panel (talla, puesto, notas...)', () => {
    const current = [
      { id: 2, nombre: 'Marta', puestoId: 3, talla: 'S', pinHash: 'h1', pinPersonalizado: false },
    ];
    const incoming = [
      { id: 2, nombre: 'Marta', puestoId: 5, talla: 'L', notaVoluntario: 'alergia frutos secos', pinHash: 'h1', pinPersonalizado: false },
    ];
    const result = protegerCamposAuth(incoming, current);
    expect(result[0].puestoId).toBe(5);
    expect(result[0].talla).toBe('L');
    expect(result[0].notaVoluntario).toBe('alergia frutos secos');
  });
});

describe('VAG-05 — protegerCamposAuth con altas nuevas', () => {
  it('un voluntario nuevo (no existe en BD aún) pasa intacto, incluido su pinHash inicial', () => {
    const current = [
      { id: 1, nombre: 'Ana', pinHash: 'hashAna', pinPersonalizado: false },
    ];
    const incoming = [
      { id: 1, nombre: 'Ana', pinHash: 'hashAna', pinPersonalizado: false },
      { id: 99, nombre: 'Nuevo Voluntario', pinHash: 'hashNuevo', pinPersonalizado: false },
    ];
    const result = protegerCamposAuth(incoming, current);
    const nuevo = result.find(v => v.id === 99);
    expect(nuevo.pinHash).toBe('hashNuevo');
    expect(nuevo.nombre).toBe('Nuevo Voluntario');
  });
});

describe('VAG-06 — protegerCamposAuth con bajas', () => {
  it('un voluntario eliminado desde el panel no reaparece (las bajas siguen funcionando)', () => {
    const current = [
      { id: 1, nombre: 'Ana', pinHash: 'h1' },
      { id: 2, nombre: 'Marta', pinHash: 'h2' },
    ];
    const incoming = [
      { id: 1, nombre: 'Ana', pinHash: 'h1' },
    ];
    const result = protegerCamposAuth(incoming, current);
    expect(result).toHaveLength(1);
    expect(result.find(v => v.id === 2)).toBeUndefined();
  });
});

describe('VAG-07 — protegerCamposAuth maneja entradas no estándar con gracia', () => {
  it('devuelve incoming tal cual si no es array', () => {
    expect(protegerCamposAuth(null, [])).toBe(null);
    expect(protegerCamposAuth(undefined, [])).toBe(undefined);
  });

  it('devuelve incoming tal cual si current está vacío o no es array (colección nueva)', () => {
    const incoming = [{ id: 1, nombre: 'Ana', pinHash: 'h1' }];
    expect(protegerCamposAuth(incoming, [])).toBe(incoming);
    expect(protegerCamposAuth(incoming, null)).toBe(incoming);
    expect(protegerCamposAuth(incoming, undefined)).toBe(incoming);
  });

  it('ignora entradas sin id en el array incoming sin lanzar error', () => {
    const current = [{ id: 1, nombre: 'Ana', pinHash: 'h1' }];
    const incoming = [{ nombre: 'Sin id' }, { id: 1, nombre: 'Ana', pinHash: 'viejo' }];
    const result = protegerCamposAuth(incoming, current);
    expect(result[0]).toEqual({ nombre: 'Sin id' });
    expect(result[1].pinHash).toBe('h1');
  });
});

describe('VAG-08 — protegerCamposAuth empareja por id independientemente del orden', () => {
  it('el orden del array incoming puede diferir del orden en BD', () => {
    const current = [
      { id: 1, nombre: 'Ana', pinHash: 'h-ana' },
      { id: 2, nombre: 'Marta', pinHash: 'h-marta' },
      { id: 3, nombre: 'Luis', pinHash: 'h-luis' },
    ];
    // El panel reordenó (p.ej. tras un sort por nombre) y trae hashes obsoletos
    const incoming = [
      { id: 3, nombre: 'Luis', pinHash: 'obsoleto-luis' },
      { id: 1, nombre: 'Ana', pinHash: 'obsoleto-ana' },
      { id: 2, nombre: 'Marta', pinHash: 'obsoleto-marta' },
    ];
    const result = protegerCamposAuth(incoming, current);
    expect(result.find(v => v.id === 1).pinHash).toBe('h-ana');
    expect(result.find(v => v.id === 2).pinHash).toBe('h-marta');
    expect(result.find(v => v.id === 3).pinHash).toBe('h-luis');
  });

  it('compara ids como string para tolerar number vs string', () => {
    const current = [{ id: 5, nombre: 'Ana', pinHash: 'h-real' }];
    const incoming = [{ id: '5', nombre: 'Ana', pinHash: 'h-viejo' }];
    const result = protegerCamposAuth(incoming, current);
    expect(result[0].pinHash).toBe('h-real');
  });
});
