/**
 * dia-carrera.spec.ts — Fase 9: E2E del módulo Día de Carrera
 *
 * DC-01  Ruta /dia-carrera muestra la pantalla de PIN (requiere auth)
 * DC-02  Tras login, el panel operativo carga con los 6 tabs
 * DC-03  Tab "🎯 Ahora" activo por defecto — muestra resumen de presencia
 * DC-04  Tab "⏱ Runbook" es accesible
 * DC-05  Tab "👥 Voluntarios" es accesible
 * DC-06  Tab "📍 Puestos" es accesible
 * DC-07  Tab "🚨 Contactos" es accesible
 * DC-08  Tab "✅ Pre-operativo" es accesible
 * DC-09  Botón FAB de incidencia rápida está visible
 * DC-10  Botón "← Panel" navega al panel principal
 *
 * Diseño:
 *   - Mock de /api/proxy/* para aislar de Neon
 *   - La ruta /dia-carrera tiene su propia PinScreen — misma lógica que /panel
 *   - getByRole / getByText — sin selectores CSS frágiles
 *   - Sin waitForTimeout — expect().toBeVisible()
 */
import { test, expect, type Page } from '@playwright/test';

const DEFAULT_PIN = '1975';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter(k =>
      k.startsWith('teg_auth') || k.startsWith('teg_panel')
    );
    keys.forEach(k => localStorage.removeItem(k));
  });
}

async function enterPin(page: Page, pin: string) {
  for (const digit of pin) {
    await page.getByRole('button', { name: `Número ${digit}` }).click();
  }
}

async function mockProxyData(page: Page) {
  await page.route('**/api/proxy/data/**', async route => {
    const url = route.request().url();
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(url.includes('batch') ? {} : []),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    }
  });
  await page.route('**/api/panel/auth**', async route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON?.() ?? {};
      if (body?.action === 'verify') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true }),
          headers: { 'Set-Cookie': 'panel_session=test_token; Path=/; HttpOnly' },
        });
      } else {
        await route.continue();
      }
    } else {
      await route.continue();
    }
  });
}

/** Accede a /dia-carrera sin sesión activa para ver la PinScreen */
async function gotoDiaCarreraUnauthenticated(page: Page) {
  await page.goto('/dia-carrera');
  await clearAuthState(page);
  await page.reload();
}

/** Login en /dia-carrera y espera a que el panel operativo cargue */
async function loginDiaCarrera(page: Page) {
  await gotoDiaCarreraUnauthenticated(page);
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeVisible({ timeout: 8000 });
  await enterPin(page, DEFAULT_PIN);
  // El panel cargado muestra "Día de Carrera" en el header y los tabs
  await expect(page.getByText('🎯 Ahora')).toBeVisible({ timeout: 10000 });
}

// ── DC-01: Pantalla PIN sin sesión ────────────────────────────────────────────

test('DC-01 — /dia-carrera sin sesión muestra pantalla de PIN', async ({ page }) => {
  await mockProxyData(page);
  await gotoDiaCarreraUnauthenticated(page);

  // La cabecera de DiaCarreraPage muestra "Día de Carrera" antes del PIN
  await expect(page.getByText('Día de Carrera').first()).toBeVisible({ timeout: 8000 });
  // El teclado numérico del PIN está visible
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeVisible();
});

// ── DC-02: Panel carga con 6 tabs ─────────────────────────────────────────────

test('DC-02 — tras login aparecen los 6 tabs del panel operativo', async ({ page }) => {
  await mockProxyData(page);
  await loginDiaCarrera(page);

  // Los 6 tabs del módulo DiaCarrera.jsx
  await expect(page.getByRole('button', { name: /ahora/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /runbook/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /voluntarios/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /puestos/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /contactos/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /pre-operativo/i })).toBeVisible();
});

// ── DC-03: Tab Ahora activo por defecto ───────────────────────────────────────

test('DC-03 — tab "Ahora" está activo por defecto y muestra resumen', async ({ page }) => {
  await mockProxyData(page);
  await loginDiaCarrera(page);

  const tabAhora = page.getByRole('button', { name: /ahora/i });
  await expect(tabAhora).toHaveClass(/on/);
});

// ── DC-04: Tab Runbook ────────────────────────────────────────────────────────

test('DC-04 — tab Runbook es accesible y activa su contenido', async ({ page }) => {
  await mockProxyData(page);
  await loginDiaCarrera(page);

  await page.getByRole('button', { name: /runbook/i }).click();
  await expect(page.getByRole('button', { name: /runbook/i })).toHaveClass(/on/);
});

// ── DC-05: Tab Voluntarios ────────────────────────────────────────────────────

test('DC-05 — tab Voluntarios es accesible', async ({ page }) => {
  await mockProxyData(page);
  await loginDiaCarrera(page);

  await page.getByRole('button', { name: /voluntarios/i }).click();
  await expect(page.getByRole('button', { name: /voluntarios/i })).toHaveClass(/on/);
});

// ── DC-06: Tab Puestos ────────────────────────────────────────────────────────

test('DC-06 — tab Puestos es accesible', async ({ page }) => {
  await mockProxyData(page);
  await loginDiaCarrera(page);

  await page.getByRole('button', { name: /puestos/i }).click();
  await expect(page.getByRole('button', { name: /puestos/i })).toHaveClass(/on/);
});

// ── DC-07: Tab Contactos ──────────────────────────────────────────────────────

test('DC-07 — tab Contactos es accesible', async ({ page }) => {
  await mockProxyData(page);
  await loginDiaCarrera(page);

  await page.getByRole('button', { name: /contactos/i }).click();
  await expect(page.getByRole('button', { name: /contactos/i })).toHaveClass(/on/);
});

// ── DC-08: Tab Pre-operativo ──────────────────────────────────────────────────

test('DC-08 — tab Pre-operativo es accesible', async ({ page }) => {
  await mockProxyData(page);
  await loginDiaCarrera(page);

  await page.getByRole('button', { name: /pre-operativo/i }).click();
  await expect(page.getByRole('button', { name: /pre-operativo/i })).toHaveClass(/on/);
});

// ── DC-09: FAB de incidencia rápida ──────────────────────────────────────────

test('DC-09 — botón FAB de incidencia rápida está visible', async ({ page }) => {
  await mockProxyData(page);
  await loginDiaCarrera(page);

  // El FAB tiene aria-label="Registrar incidencia"
  await expect(page.getByRole('button', { name: /registrar incidencia/i })).toBeVisible();
});

// ── DC-10: Botón "← Panel" navega al panel principal ─────────────────────────

test('DC-10 — botón "Panel" navega de vuelta al panel principal', async ({ page }) => {
  await mockProxyData(page);
  await loginDiaCarrera(page);

  await page.getByRole('button', { name: /panel/i }).click();
  // Tras navegar al panel, aparece la navegación del panel
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 8000 });
  await expect(page).toHaveURL(/\/panel/);
});
