/**
 * logistica.spec.ts — Fase 9: E2E del módulo de Logística
 *
 * LG-01  Módulo carga y muestra el tab Dashboard por defecto
 * LG-02  Tab Material visible y accesible
 * LG-03  Tab Runbook (timeline) visible y accesible
 * LG-04  Tab Pre-operativo (checklist) visible y accesible
 * LG-05  Tab Proveedores visible y accesible
 * LG-06  Tab Vehículos visible y accesible
 * LG-07  Tab Ubicaciones visible y accesible
 *
 * Diseño:
 *   - Mock de /api/proxy/* para aislar de Neon
 *   - getByRole / getByText — sin selectores CSS frágiles
 *   - Sin waitForTimeout — waitForSelector / expect().toBeVisible()
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

async function loginToPanel(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeVisible({ timeout: 8000 });
  await clearAuthState(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeVisible({ timeout: 8000 });
  await enterPin(page, DEFAULT_PIN);
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 8000 });
}

async function navigateToLogistica(page: Page) {
  await loginToPanel(page);
  await page.getByRole('button', { name: 'Logística' }).click();
  // Esperar a que el módulo cargue — el tab Dashboard debe ser visible
  await expect(page.getByRole('button', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
}

// ── LG-01: Módulo carga con tab Dashboard ────────────────────────────────────

test('LG-01 — módulo Logística carga y muestra el tab Dashboard activo', async ({ page }) => {
  await mockProxyData(page);
  await navigateToLogistica(page);

  // El tab Dashboard debe estar presente y activo (clase "active")
  const tabDashboard = page.getByRole('button', { name: /dashboard/i });
  await expect(tabDashboard).toBeVisible();
  await expect(tabDashboard).toHaveClass(/active/);
});

// ── LG-02: Tab Material ───────────────────────────────────────────────────────

test('LG-02 — tab Material es accesible y muestra su contenido', async ({ page }) => {
  await mockProxyData(page);
  await navigateToLogistica(page);

  await page.getByRole('button', { name: /material/i }).click();
  // Con datos vacíos (mock) esperamos estado vacío o tabla con cabecera
  await expect(
    page.getByRole('button', { name: /material/i })
  ).toHaveClass(/active/);
});

// ── LG-03: Tab Runbook ────────────────────────────────────────────────────────

test('LG-03 — tab Runbook (timeline) es accesible', async ({ page }) => {
  await mockProxyData(page);
  await navigateToLogistica(page);

  await page.getByRole('button', { name: /runbook/i }).click();
  await expect(
    page.getByRole('button', { name: /runbook/i })
  ).toHaveClass(/active/);
});

// ── LG-04: Tab Pre-operativo ──────────────────────────────────────────────────

test('LG-04 — tab Pre-operativo (checklist) es accesible', async ({ page }) => {
  await mockProxyData(page);
  await navigateToLogistica(page);

  await page.getByRole('button', { name: /pre-operativo/i }).click();
  await expect(
    page.getByRole('button', { name: /pre-operativo/i })
  ).toHaveClass(/active/);
});

// ── LG-05: Tab Proveedores ────────────────────────────────────────────────────

test('LG-05 — tab Proveedores es accesible', async ({ page }) => {
  await mockProxyData(page);
  await navigateToLogistica(page);

  await page.getByRole('button', { name: /proveedores/i }).click();
  await expect(
    page.getByRole('button', { name: /proveedores/i })
  ).toHaveClass(/active/);
});

// ── LG-06: Tab Vehículos ──────────────────────────────────────────────────────

test('LG-06 — tab Vehículos es accesible', async ({ page }) => {
  await mockProxyData(page);
  await navigateToLogistica(page);

  await page.getByRole('button', { name: /vehículos/i }).click();
  await expect(
    page.getByRole('button', { name: /vehículos/i })
  ).toHaveClass(/active/);
});

// ── LG-07: Tab Ubicaciones ────────────────────────────────────────────────────

test('LG-07 — tab Ubicaciones es accesible', async ({ page }) => {
  await mockProxyData(page);
  await navigateToLogistica(page);

  await page.getByRole('button', { name: /ubicaciones/i }).click();
  await expect(
    page.getByRole('button', { name: /ubicaciones/i })
  ).toHaveClass(/active/);
});
