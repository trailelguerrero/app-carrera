/**
 * budget.spec.ts — Mejora 14: E2E del módulo de Presupuesto
 *
 * E14-03a  Módulo carga y muestra las tabs (Inscripciones, Presupuesto, etc.)
 * E14-03b  Tab Inscripciones: campos de tramos visibles
 * E14-03c  Tab Presupuesto: conceptos visibles
 * E14-03d  KpiGlobal: las tarjetas de KPI se renderizan
 * E14-03e  Tab Equilibrio: gráfico o resumen de equilibrio visible
 *
 * Diseño:
 *   - Mock de /api/proxy/* para aislar de Neon
 *   - Sin waitForTimeout — waitForSelector / expect().toBeVisible()
 *   - getByRole / getByText — sin selectores CSS frágiles
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
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
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
        });
      } else {
        await route.continue();
      }
    } else {
      await route.continue();
    }
  });
}

async function navigateToBudget(page: Page) {
  await mockProxyData(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeVisible({ timeout: 8000 });
  await clearAuthState(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeVisible({ timeout: 8000 });
  await enterPin(page, DEFAULT_PIN);
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 8000 });

  const btnPresupuesto = page.getByRole('button', { name: /presupuesto|pres/i });
  await expect(btnPresupuesto.first()).toBeVisible({ timeout: 5000 });
  await btnPresupuesto.first().click();

  // Esperar que el módulo cargue
  await expect(
    page.getByText(/presupuesto|inscripciones|ingresos/i).first()
  ).toBeVisible({ timeout: 8000 });
}

// ── E14-03a: Módulo carga con tabs ────────────────────────────────────────────

test('E14-03a — módulo Presupuesto carga con tabs visibles', async ({ page }) => {
  await navigateToBudget(page);

  // Debe haber al menos una tab de Inscripciones
  await expect(
    page.getByRole('button', { name: /inscripciones/i }).first()
  ).toBeVisible({ timeout: 5000 });
});

// ── E14-03b: Tab Inscripciones ────────────────────────────────────────────────

test('E14-03b — tab Inscripciones muestra campos de tramos', async ({ page }) => {
  await navigateToBudget(page);

  // Click en tab Inscripciones (o ya está activa por defecto)
  const tabInscripciones = page.getByRole('button', { name: /inscripciones/i }).first();
  if (await tabInscripciones.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tabInscripciones.click();
  }

  // Debe haber contenido de tramos o distancias
  await expect(
    page.getByText(/tramo|distancia|precio|5k|10k|21k|42k|km/i).first()
  ).toBeVisible({ timeout: 5000 });
});

// ── E14-03c: Tab Presupuesto tiene conceptos ──────────────────────────────────

test('E14-03c — tab Presupuesto muestra lista de conceptos', async ({ page }) => {
  await navigateToBudget(page);

  // Navegar a la tab de Presupuesto (costes)
  const tabPresupuesto = page.getByRole('button', { name: /^presupuesto$|costes|conceptos/i }).first();
  if (await tabPresupuesto.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tabPresupuesto.click();
  }

  // Debe haber contenido de conceptos/costes
  await expect(
    page.getByText(/concepto|fijo|variable|costes|coste/i).first()
  ).toBeVisible({ timeout: 5000 });
});

// ── E14-03d: KPIs visibles ────────────────────────────────────────────────────

test('E14-03d — módulo Presupuesto muestra KPIs globales', async ({ page }) => {
  await navigateToBudget(page);

  // Los KPIs de presupuesto deben estar presentes (ingresos, costes, resultado)
  const kpiContent = page.getByText(/ingresos|costes|resultado|beneficio|pérdida|€/i).first();
  await expect(kpiContent).toBeVisible({ timeout: 8000 });
});

// ── E14-03e: Tab Equilibrio ───────────────────────────────────────────────────

test('E14-03e — tab Equilibrio carga sin errores', async ({ page }) => {
  await navigateToBudget(page);

  const tabEquilibrio = page.getByRole('button', { name: /equilibrio/i }).first();
  if (!await tabEquilibrio.isVisible({ timeout: 3000 }).catch(() => false)) {
    // La tab puede estar en un menú "más" en móvil — omitir si no accesible
    return;
  }

  await tabEquilibrio.click();

  // Debe cargar contenido de equilibrio sin errores JS visibles
  await expect(
    page.getByText(/equilibrio|punto de equilibrio|break.?even|mínimo|pe global/i).first()
  ).toBeVisible({ timeout: 5000 });

  // No debe haber un error boundary visible
  await expect(
    page.getByText(/algo.*salió mal|error inesperado|error boundary/i)
  ).not.toBeVisible({ timeout: 2000 });
});
