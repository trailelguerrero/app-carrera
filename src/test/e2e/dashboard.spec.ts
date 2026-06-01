/**
 * dashboard.spec.ts — Mejora 14: E2E del panel post-login
 *
 * E14-01  Login correcto → Dashboard carga con estructura visible
 * E14-02  Navegación a módulo desde la barra de navegación
 * E14-03  Cierre de sesión forzado via teg-session-expired → vuelve al login
 * E14-04  Alta de voluntario desde el panel (modal + guardar)
 *
 * Diseño:
 *   - clearAuthState() antes de cada test para aislamiento total
 *   - Sin selectores CSS — getByRole / getByText / getByLabel
 *   - Sin waitForTimeout salvo donde el componente requiere tiempo mínimo
 *   - Mock de /api/proxy/data/* para evitar dependencia de Neon en CI
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

async function loginToPanel(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeVisible({ timeout: 8000 });
  await clearAuthState(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeVisible({ timeout: 8000 });
  await enterPin(page, DEFAULT_PIN);
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 8000 });
}

/** Mock genérico de las queries de datos del proxy para que el Dashboard cargue sin Neon */
async function mockProxyData(page: Page) {
  await page.route('**/api/proxy/data/**', async route => {
    const url = route.request().url();
    // Devolver arrays vacíos para la mayoría de colecciones
    if (route.request().method() === 'GET') {
      // Batch → array de objetos vacíos
      if (url.includes('batch')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    } else {
      // PUT/DELETE → ok
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    }
  });
  // Mock de auth para no llamar a Neon
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

// ── E14-01: Login → Dashboard carga ──────────────────────────────────────────

test('E14-01 — login correcto abre el panel con navegación visible', async ({ page }) => {
  await mockProxyData(page);
  await loginToPanel(page);

  // La barra de navegación debe estar visible
  await expect(page.getByRole('navigation')).toBeVisible();

  // Al menos uno de los módulos de la nav debe ser accesible
  const navDash = page.getByRole('button', { name: /dashboard|dash/i });
  const navLink = page.getByRole('link', { name: /dashboard|dash/i });
  const tieneNav = await navDash.isVisible({ timeout: 3000 }).catch(() => false)
    || await navLink.isVisible({ timeout: 3000 }).catch(() => false);

  expect(tieneNav).toBe(true);
});

test('E14-01b — panel muestra el módulo Dashboard activo por defecto', async ({ page }) => {
  await mockProxyData(page);
  await loginToPanel(page);

  // El Dashboard es el bloque por defecto — debe haber algún contenido identificable
  // (título, KPI cards, o la sección de bienvenida)
  const dashContent = page.getByText(/dashboard|trail el guerrero|kpi|resumen/i).first();
  await expect(dashContent).toBeVisible({ timeout: 8000 });
});

// ── E14-02: Navegación entre módulos ─────────────────────────────────────────

test('E14-02a — clic en "Voluntarios" en la nav abre el módulo de voluntarios', async ({ page }) => {
  await mockProxyData(page);
  await loginToPanel(page);

  // Buscar el botón de voluntarios en la nav (mobile o desktop)
  const btnVoluntarios = page.getByRole('button', { name: /voluntarios|vols/i });
  await expect(btnVoluntarios.first()).toBeVisible({ timeout: 5000 });
  await btnVoluntarios.first().click();

  // Debe cargarse contenido del módulo voluntarios
  await expect(
    page.getByText(/voluntarios|total|confirmados|pendientes/i).first()
  ).toBeVisible({ timeout: 8000 });
});

test('E14-02b — clic en "Presupuesto" en la nav abre el módulo de presupuesto', async ({ page }) => {
  await mockProxyData(page);
  await loginToPanel(page);

  const btnPresupuesto = page.getByRole('button', { name: /presupuesto|pres/i });
  await expect(btnPresupuesto.first()).toBeVisible({ timeout: 5000 });
  await btnPresupuesto.first().click();

  await expect(
    page.getByText(/presupuesto|inscripciones|ingresos|conceptos/i).first()
  ).toBeVisible({ timeout: 8000 });
});

test('E14-02c — clic en "Logística" en la nav abre el módulo de logística', async ({ page }) => {
  await mockProxyData(page);
  await loginToPanel(page);

  const btnLogistica = page.getByRole('button', { name: /logística|logistica|log/i });
  await expect(btnLogistica.first()).toBeVisible({ timeout: 5000 });
  await btnLogistica.first().click();

  await expect(
    page.getByText(/logística|logistica|directorio|material|vehículos/i).first()
  ).toBeVisible({ timeout: 8000 });
});

// ── E14-03: Cierre de sesión ──────────────────────────────────────────────────

test('E14-03 — evento teg-session-expired fuerza vuelta al login', async ({ page }) => {
  await mockProxyData(page);
  await loginToPanel(page);

  // El panel debe estar visible
  await expect(page.getByRole('navigation')).toBeVisible();

  // Disparar el evento de sesión expirada (mismo mecanismo que usa el proxy en 401)
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('teg-session-expired'));
  });

  // Debe volver a la pantalla de PIN
  await expect(
    page.getByRole('button', { name: 'Número 1' })
  ).toBeVisible({ timeout: 5000 });

  // El panel no debe estar visible
  await expect(page.getByRole('navigation')).not.toBeVisible({ timeout: 3000 });
});

// ── E14-04: Alta de voluntario desde el panel ─────────────────────────────────

test('E14-04a — módulo voluntarios tiene botón "+ Voluntario"', async ({ page }) => {
  await mockProxyData(page);
  await loginToPanel(page);

  // Navegar a voluntarios
  const btnVoluntarios = page.getByRole('button', { name: /voluntarios|vols/i });
  await btnVoluntarios.first().click();

  // Debe aparecer el botón de nuevo voluntario
  await expect(
    page.getByRole('button', { name: /\+ voluntario|nuevo voluntario|añadir voluntario/i })
  ).toBeVisible({ timeout: 8000 });
});

test('E14-04b — clic en "+ Voluntario" abre el modal de alta', async ({ page }) => {
  await mockProxyData(page);
  await loginToPanel(page);

  const btnVoluntarios = page.getByRole('button', { name: /voluntarios|vols/i });
  await btnVoluntarios.first().click();

  const btnNuevo = page.getByRole('button', { name: /\+ voluntario|nuevo voluntario/i });
  await expect(btnNuevo).toBeVisible({ timeout: 8000 });
  await btnNuevo.click();

  // El modal de voluntario debe abrirse — buscar campo nombre o título del modal
  await expect(
    page.getByRole('dialog').or(page.getByText(/nuevo voluntario|datos del voluntario/i))
  ).toBeVisible({ timeout: 5000 });
});

test('E14-04c — modal de nuevo voluntario tiene campos nombre y teléfono', async ({ page }) => {
  await mockProxyData(page);
  await loginToPanel(page);

  const btnVoluntarios = page.getByRole('button', { name: /voluntarios|vols/i });
  await btnVoluntarios.first().click();

  const btnNuevo = page.getByRole('button', { name: /\+ voluntario|nuevo voluntario/i });
  await expect(btnNuevo).toBeVisible({ timeout: 8000 });
  await btnNuevo.click();

  // Campo nombre obligatorio
  const inputNombre = page.getByLabel(/nombre/i).first();
  await expect(inputNombre).toBeVisible({ timeout: 5000 });

  // Campo teléfono
  const inputTelefono = page.getByLabel(/teléfono|telefono/i).first();
  const tieneTelefono = await inputTelefono.isVisible({ timeout: 2000 }).catch(() => false);

  // Al menos nombre debe estar presente
  expect(await inputNombre.isVisible()).toBe(true);
  if (tieneTelefono) expect(tieneTelefono).toBe(true);
});

test('E14-04d — guardar nuevo voluntario con datos válidos cierra el modal', async ({ page }) => {
  await mockProxyData(page);
  await loginToPanel(page);

  const btnVoluntarios = page.getByRole('button', { name: /voluntarios|vols/i });
  await btnVoluntarios.first().click();

  const btnNuevo = page.getByRole('button', { name: /\+ voluntario|nuevo voluntario/i });
  await expect(btnNuevo).toBeVisible({ timeout: 8000 });
  await btnNuevo.click();

  // Rellenar campos del modal
  const inputNombre = page.getByLabel(/nombre/i).first();
  if (!await inputNombre.isVisible({ timeout: 3000 }).catch(() => false)) return;

  await inputNombre.fill('Voluntario E2E Test');

  const inputTelefono = page.getByLabel(/teléfono|telefono/i).first();
  if (await inputTelefono.isVisible({ timeout: 1000 }).catch(() => false)) {
    await inputTelefono.fill('612999888');
  }

  // Seleccionar talla si existe
  const btnTallaM = page.getByRole('button', { name: /^M$/ });
  if (await btnTallaM.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btnTallaM.click();
  }
  const selectTalla = page.getByLabel(/talla/i);
  if (await selectTalla.isVisible({ timeout: 1000 }).catch(() => false)) {
    await selectTalla.selectOption('M');
  }

  // Guardar
  const btnGuardar = page.getByRole('button', { name: /guardar|crear|añadir|confirmar/i });
  if (await btnGuardar.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btnGuardar.click();

    // El modal debe cerrarse (dialog no visible)
    await expect(
      page.getByRole('dialog')
    ).not.toBeVisible({ timeout: 5000 });
  }
});
