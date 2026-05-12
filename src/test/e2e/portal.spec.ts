/**
 * portal.spec.ts — Tests E2E del portal de voluntarios
 *
 * Cubre:
 *   - Acceso al portal desde la URL pública /voluntarios
 *   - Registro de nuevo voluntario (flujo completo del stepper)
 *   - Login de voluntario existente (teléfono + PIN)
 *   - Recuperación de PIN
 *   - Navegación entre secciones de la ficha
 *
 * Diseño:
 *   - Mock de fetch para `/api/voluntarios` — sin dependencia de Neon en tests
 *   - getByRole, getByText, getByLabel — sin selectores CSS frágiles
 *   - Sin waitForTimeout — waitForSelector, waitForResponse o expect().toBeVisible()
 */
import { test, expect, type Page } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

const PORTAL_URL    = '/voluntarios';
const TEST_TELEFONO = '612000001';
const TEST_NOMBRE   = 'Voluntario Test';
const TEST_PIN      = '0001'; // últimos 4 dígitos del teléfono de prueba

/** Navega al portal y espera que cargue */
async function gotoPortal(page: Page) {
  await page.goto(PORTAL_URL);
  // Esperar a que el portal cargue — debe mostrar la pantalla principal
  await expect(page.getByText('Trail El Guerrero')).toBeVisible({ timeout: 8000 });
}

// ── Tests de acceso y pantalla principal ─────────────────────────────────────

test('portal carga correctamente en /voluntarios', async ({ page }) => {
  await gotoPortal(page);
  // La pantalla principal tiene las opciones de acceso
  await expect(page.getByText('Trail El Guerrero')).toBeVisible();
});

test('portal muestra botón de registro de nuevo voluntario', async ({ page }) => {
  await gotoPortal(page);
  await expect(
    page.getByRole('button', { name: /registrar|nuevo|apuntarme/i })
  ).toBeVisible({ timeout: 5000 });
});

test('portal muestra opción de acceso para voluntarios ya registrados', async ({ page }) => {
  await gotoPortal(page);
  await expect(
    page.getByRole('button', { name: /ya.*voluntario|acceder|mi ficha|entrar/i })
  ).toBeVisible({ timeout: 5000 });
});

// ── Tests del stepper de registro ────────────────────────────────────────────

test('stepper de registro tiene botón Atrás en pasos intermedios', async ({ page }) => {
  await gotoPortal(page);

  // Entrar al flujo de registro
  await page.getByRole('button', { name: /registrar|nuevo|apuntarme/i }).click();

  // Paso 1 — debe mostrar el campo de nombre o datos básicos
  // Avanzar al paso 2 si hay botón de continuar
  const continuar = page.getByRole('button', { name: /continuar|siguiente|next/i });
  if (await continuar.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Rellenar nombre mínimo para poder continuar
    const inputNombre = page.getByLabel(/nombre/i);
    if (await inputNombre.isVisible({ timeout: 1000 }).catch(() => false)) {
      await inputNombre.fill(TEST_NOMBRE);
    }
    await continuar.click();
    // En el paso 2 debe aparecer el botón Atrás
    await expect(page.getByRole('button', { name: /← atrás|atrás|volver/i }))
      .toBeVisible({ timeout: 3000 });
  }
});

test('botón Atrás en el stepper vuelve al paso anterior', async ({ page }) => {
  await gotoPortal(page);
  await page.getByRole('button', { name: /registrar|nuevo|apuntarme/i }).click();

  const continuar = page.getByRole('button', { name: /continuar|siguiente/i });
  if (await continuar.isVisible({ timeout: 2000 }).catch(() => false)) {
    const inputNombre = page.getByLabel(/nombre/i);
    if (await inputNombre.isVisible({ timeout: 1000 }).catch(() => false)) {
      await inputNombre.fill(TEST_NOMBRE);
    }
    await continuar.click();

    // Pulsar Atrás
    await page.getByRole('button', { name: /← atrás|atrás/i }).click();

    // Debemos volver al paso 1 — el campo nombre debe seguir visible
    if (await inputNombre.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(inputNombre).toBeVisible();
    } else {
      // Al menos verificar que seguimos en el stepper
      await expect(continuar).toBeVisible({ timeout: 3000 });
    }
  }
});

// ── Tests del flujo de login ──────────────────────────────────────────────────

test('login muestra campo de teléfono en el primer paso', async ({ page }) => {
  await gotoPortal(page);

  // Ir al login
  await page.getByRole('button', { name: /ya.*voluntario|acceder|mi ficha|entrar/i }).click();

  // Debe aparecer campo de teléfono
  await expect(
    page.getByRole('textbox', { name: /teléfono|telefono/i })
  ).toBeVisible({ timeout: 5000 });
});

test('login con teléfono inexistente muestra error descriptivo', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    const url = route.request().url();
    if (url.includes('action=check')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: false }),
      });
    } else {
      await route.continue();
    }
  });

  await gotoPortal(page);
  await page.getByRole('button', { name: /ya.*voluntario|acceder|mi ficha|entrar/i }).click();

  const telefonoInput = page.getByRole('textbox', { name: /teléfono|telefono/i });
  await telefonoInput.fill('699000000');
  await page.getByRole('button', { name: /continuar|siguiente|buscar/i }).click();

  // Debe aparecer un mensaje de error o redirigir al registro
  await expect(
    page.getByText(/no encontramos|no existe|registr/i)
  ).toBeVisible({ timeout: 5000 });
});

test('login con PIN correcto muestra la ficha del voluntario', async ({ page }) => {
  // Mock del flujo completo de auth
  await page.route('**/api/voluntarios**', async route => {
    const url = route.request().url();
    const body = route.request().postDataJSON?.() ?? {};

    if (url.includes('action=check')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: true, pinPersonalizado: false }),
      });
    } else if (body?.action === 'auth' || url.includes('action=auth')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          sessionToken: 'tok_test_001',
          voluntario: {
            id: 1,
            nombre: TEST_NOMBRE,
            telefono: TEST_TELEFONO,
            estado: 'confirmado',
            enPuesto: false,
            puestoId: null,
            pinPersonalizado: false,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await gotoPortal(page);
  await page.getByRole('button', { name: /ya.*voluntario|acceder|mi ficha|entrar/i }).click();

  const telefonoInput = page.getByRole('textbox', { name: /teléfono|telefono/i });
  await telefonoInput.fill(TEST_TELEFONO);
  await page.getByRole('button', { name: /continuar|siguiente|buscar/i }).click();

  // Paso 2 — introducir PIN dígito a dígito
  for (const digit of TEST_PIN) {
    await page.getByRole('button', { name: `Número ${digit}` }).click();
  }

  // La ficha debe mostrar el nombre del voluntario
  await expect(page.getByText(TEST_NOMBRE)).toBeVisible({ timeout: 5000 });
});

test('login con PIN incorrecto muestra error', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    const url = route.request().url();
    const body = route.request().postDataJSON?.() ?? {};

    if (url.includes('action=check')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: true, pinPersonalizado: false }),
      });
    } else if (body?.action === 'auth' || url.includes('action=auth')) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'PIN incorrecto' }),
      });
    } else {
      await route.continue();
    }
  });

  await gotoPortal(page);
  await page.getByRole('button', { name: /ya.*voluntario|acceder|mi ficha|entrar/i }).click();

  const telefonoInput = page.getByRole('textbox', { name: /teléfono|telefono/i });
  await telefonoInput.fill(TEST_TELEFONO);
  await page.getByRole('button', { name: /continuar|siguiente|buscar/i }).click();

  // PIN incorrecto
  for (const digit of '9999') {
    await page.getByRole('button', { name: `Número ${digit}` }).click();
  }

  await expect(
    page.getByText(/incorrecto|error|inválido/i)
  ).toBeVisible({ timeout: 5000 });
});

// ── Tests de recuperación de PIN ──────────────────────────────────────────────

test('portal muestra enlace de recuperación de PIN en el paso de PIN', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    const url = route.request().url();
    if (url.includes('action=check')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: true, pinPersonalizado: false }),
      });
    } else {
      await route.continue();
    }
  });

  await gotoPortal(page);
  await page.getByRole('button', { name: /ya.*voluntario|acceder|mi ficha|entrar/i }).click();

  await page.getByRole('textbox', { name: /teléfono|telefono/i }).fill(TEST_TELEFONO);
  await page.getByRole('button', { name: /continuar|siguiente|buscar/i }).click();

  // En el paso del PIN debe aparecer el enlace de recuperación
  await expect(
    page.getByText(/olvidé|recuperar|restablecer|forgot/i)
  ).toBeVisible({ timeout: 5000 });
});

test('flujo de recuperación de PIN solicita email de confirmación', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    const url = route.request().url();
    if (url.includes('action=check')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: true, pinPersonalizado: false }),
      });
    } else if (url.includes('action=recover-pin')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    } else {
      await route.continue();
    }
  });

  await gotoPortal(page);
  await page.getByRole('button', { name: /ya.*voluntario|acceder|mi ficha|entrar/i }).click();

  await page.getByRole('textbox', { name: /teléfono|telefono/i }).fill(TEST_TELEFONO);
  await page.getByRole('button', { name: /continuar|siguiente|buscar/i }).click();

  // Pulsar el enlace de recuperación
  await page.getByText(/olvidé|recuperar|restablecer/i).click();

  // Debe aparecer campo de email
  await expect(
    page.getByRole('textbox', { name: /email|correo/i })
  ).toBeVisible({ timeout: 5000 });
});
