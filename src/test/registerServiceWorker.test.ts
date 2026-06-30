/**
 * registerServiceWorker.test.ts — PWA-12
 *
 * Verifica que la auto-actualización del Service Worker no dependa de que
 * el navegador decida por su cuenta cuándo revisar /sw.js: debe forzar la
 * comprobación al registrar, al volver a primer plano y periódicamente,
 * y debe recargar la página una única vez cuando el SW nuevo toma el control.
 *
 * Sin esto, un usuario puede quedarse "atascado" en una versión vieja de la
 * app sin tener que hacer nada manualmente para destrabarlo (ver sw.js:
 * self.skipWaiting() + self.clients.claim() ya gestionan la activación;
 * lo que faltaba era disparar la comprobación con suficiente frecuencia).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wireAutoUpdate, registerServiceWorker, UPDATE_CHECK_INTERVAL_MS } from '@/lib/registerServiceWorker';

function makeFakeDoc(initialVisibility: 'visible' | 'hidden' = 'visible') {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    visibilityState: initialVisibility,
    addEventListener: vi.fn((event: string, cb: () => void) => {
      (listeners[event] ??= []).push(cb);
    }),
    removeEventListener: vi.fn((event: string, cb: () => void) => {
      listeners[event] = (listeners[event] || []).filter((l) => l !== cb);
    }),
    fire(event: string) {
      (listeners[event] || []).forEach((cb) => cb());
    },
  };
}

function makeFakeSwContainer() {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    addEventListener: vi.fn((event: string, cb: () => void) => {
      (listeners[event] ??= []).push(cb);
    }),
    removeEventListener: vi.fn((event: string, cb: () => void) => {
      listeners[event] = (listeners[event] || []).filter((l) => l !== cb);
    }),
    fire(event: string) {
      (listeners[event] || []).forEach((cb) => cb());
    },
  };
}

describe('wireAutoUpdate (PWA-12)', () => {
  let update: ReturnType<typeof vi.fn>;
  let reload: ReturnType<typeof vi.fn>;
  let fakeWin: { location: { reload: ReturnType<typeof vi.fn> } };
  let fakeDoc: ReturnType<typeof makeFakeDoc>;
  let fakeSw: ReturnType<typeof makeFakeSwContainer>;

  beforeEach(() => {
    vi.useFakeTimers();
    update = vi.fn().mockResolvedValue(undefined);
    reload = vi.fn();
    fakeWin = { location: { reload } };
    fakeDoc = makeFakeDoc('visible');
    fakeSw = makeFakeSwContainer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('comprueba si hay versión nueva inmediatamente al registrar', () => {
    wireAutoUpdate({ update }, { win: fakeWin, doc: fakeDoc, swContainer: fakeSw });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('vuelve a comprobar cuando la pestaña pasa a visible', () => {
    wireAutoUpdate({ update }, { win: fakeWin, doc: fakeDoc, swContainer: fakeSw });
    update.mockClear();

    fakeDoc.fire('visibilitychange');

    expect(update).toHaveBeenCalledTimes(1);
  });

  it('NO comprueba si la pestaña pasa a oculta', () => {
    wireAutoUpdate({ update }, { win: fakeWin, doc: fakeDoc, swContainer: fakeSw });
    update.mockClear();

    fakeDoc.visibilityState = 'hidden';
    fakeDoc.fire('visibilitychange');

    expect(update).not.toHaveBeenCalled();
  });

  it('comprueba periódicamente mientras la app sigue abierta', () => {
    wireAutoUpdate({ update }, { win: fakeWin, doc: fakeDoc, swContainer: fakeSw });
    update.mockClear();

    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    expect(update).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS * 2);
    expect(update).toHaveBeenCalledTimes(3);
  });

  it('respeta un intervalo personalizado', () => {
    wireAutoUpdate(
      { update },
      { win: fakeWin, doc: fakeDoc, swContainer: fakeSw, intervalMs: 1000 },
    );
    update.mockClear();

    vi.advanceTimersByTime(3000);
    expect(update).toHaveBeenCalledTimes(3);
  });

  it('recarga la página cuando el SW nuevo toma el control', () => {
    wireAutoUpdate({ update }, { win: fakeWin, doc: fakeDoc, swContainer: fakeSw });

    fakeSw.fire('controllerchange');

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('NO recarga dos veces aunque controllerchange se dispare varias veces (guard anti reload-loop)', () => {
    wireAutoUpdate({ update }, { win: fakeWin, doc: fakeDoc, swContainer: fakeSw });

    fakeSw.fire('controllerchange');
    fakeSw.fire('controllerchange');
    fakeSw.fire('controllerchange');

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('avisa con onUpdateAvailable antes de recargar', () => {
    const onUpdateAvailable = vi.fn();
    wireAutoUpdate(
      { update },
      { win: fakeWin, doc: fakeDoc, swContainer: fakeSw, onUpdateAvailable },
    );

    fakeSw.fire('controllerchange');

    expect(onUpdateAvailable).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('no revienta si registration.update() falla (sin red, p.ej.)', () => {
    const failingUpdate = vi.fn().mockRejectedValue(new Error('offline'));
    expect(() =>
      wireAutoUpdate({ update: failingUpdate }, { win: fakeWin, doc: fakeDoc, swContainer: fakeSw }),
    ).not.toThrow();
  });

  it('stop() detiene el polling y deja de escuchar eventos', () => {
    const handle = wireAutoUpdate({ update }, { win: fakeWin, doc: fakeDoc, swContainer: fakeSw });
    update.mockClear();

    handle.stop();

    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS * 5);
    fakeDoc.fire('visibilitychange');

    expect(update).not.toHaveBeenCalled();
  });
});

describe('registerServiceWorker (PWA-12)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no hace nada si el navegador no soporta Service Worker', () => {
    vi.stubGlobal('navigator', {});
    expect(() => registerServiceWorker()).not.toThrow();
  });
});
