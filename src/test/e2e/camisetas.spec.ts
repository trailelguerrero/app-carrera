/**
 * camisetas.spec.ts — Fase 9: E2E del módulo de Camisetas
 *
 * CAM-01  Módulo carga y muestra el tab Resumen por defecto
 * CAM-02  Tab "Pedido al proveedor" es accesible
 * CAM-03  Tab "Extras y familiares" es accesible
 * CAM-04  Tab "Entrega" es accesible
 * CAM-05  Tab "Reparto" es accesible
 * CAM-06  El wizard de onboarding muestra los 4 pasos cuando no hay datos
 *
 * Diseño:
 *   - Mock de /api/proxy/* para aislar de Neon
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

async function loginToPanel(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeVisible({ timeout: 8000 });
  await clearAuthState(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeVisible({ timeout: 8000 });
  await enterPin(page, DEFAULT_PIN);
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 8000 });
}

async function navigateToCamisetas(page: Page) {
  await loginToPanel(page);
  await page.getByRole('button', { name: 'Camisetas' }).click();
  // Esperar a que el módulo cargue — tab Resumen debe ser visible
  await expect(page.getByRole('button', { name: /resumen/i })).toBeVisible({ timeout: 10000 });
}

// ── CAM-01: Módulo carga ──────────────────────────────────────────────────────

test('CAM-01 — módulo Camisetas carga y muestra el tab Resumen activo', async ({ page }) => {
  await mockProxyData(page);
  await navigateToCamisetas(page);

  const tabResumen = page.getByRole('button', { name: /resumen/i });
  await expect(tabResumen).toBeVisible();
  await expect(tabResumen).toHaveClass(/active/);
});

// ── CAM-02: Tab Pedido al proveedor ──────────────────────────────────────────

test('CAM-02 — tab "Pedido al proveedor" es accesible', async ({ page }) => {
  await mockProxyData(page);
  await navigateToCamisetas(page);

  await page.getByRole('button', { name: /pedido al proveedor/i }).click();
  await expect(
    page.getByRole('button', { name: /pedido al proveedor/i })
  ).toHaveClass(/active/);
});

// ── CAM-03: Tab Extras y familiares ──────────────────────────────────────────

test('CAM-03 — tab "Extras y familiares" es accesible', async ({ page }) => {
  await mockProxyData(page);
  await navigateToCamisetas(page);

  await page.getByRole('button', { name: /extras y familiares/i }).click();
  await expect(
    page.getByRole('button', { name: /extras y familiares/i })
  ).toHaveClass(/active/);
});

// ── CAM-04: Tab Entrega ───────────────────────────────────────────────────────

test('CAM-04 — tab "Entrega" es accesible', async ({ page }) => {
  await mockProxyData(page);
  await navigateToCamisetas(page);

  // Hay varios botones con texto "Entrega", usamos el primero de la barra de tabs
  await page.getByRole('button', { name: /^📬 entrega$/i }).click();
  await expect(
    page.getByRole('button', { name: /^📬 entrega$/i })
  ).toHaveClass(/active/);
});

// ── CAM-05: Tab Reparto ───────────────────────────────────────────────────────

test('CAM-05 — tab "Reparto" es accesible', async ({ page }) => {
  await mockProxyData(page);
  await navigateToCamisetas(page);

  await page.getByRole('button', { name: /reparto/i }).click();
  await expect(
    page.getByRole('button', { name: /reparto/i })
  ).toHaveClass(/active/);
});

// ── CAM-06: Wizard de onboarding ──────────────────────────────────────────────

test('CAM-06 — wizard de onboarding muestra los 4 pasos sin datos', async ({ page }) => {
  await mockProxyData(page);
  // Limpiar datos de camisetas de localStorage para forzar estado vacío
  await page.goto('/');
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter(k => k.includes('cam') || k.includes('camiseta'))
      .forEach(k => localStorage.removeItem(k));
  });
  await navigateToCamisetas(page);

  // Los 4 pasos del wizard deben estar visibles en el tab Resumen
  await expect(page.getByText(/configura los costes unitarios/i)).toBeVisible({ timeout: 6000 });
  await expect(page.getByText(/introduce las tallas de corredores/i)).toBeVisible();
  await expect(page.getByText(/registra pedidos de extras/i)).toBeVisible();
  await expect(page.getByText(/gestiona la entrega/i)).toBeVisible();
});
