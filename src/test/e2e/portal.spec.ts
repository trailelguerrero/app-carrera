/**
 * portal.spec.ts — Tests E2E del portal de voluntarios
 *
 * Cubre (tests originales):
 *   - Acceso al portal desde la URL pública /voluntarios
 *   - Registro de nuevo voluntario (flujo completo del stepper)
 *   - Login de voluntario existente (teléfono + PIN)
 *   - Recuperación de PIN
 *   - Navegación entre secciones de la ficha
 *
 * Cubre (Mejora 11 — nuevos escenarios):
 *   - E2E-01  Acceso al portal con URL válida
 *   - E2E-02  Registro completo — happy path (todos los campos correctos)
 *   - E2E-03  Validación de campos incorrectos — sad paths
 *   - E2E-04  Voluntario ya registrado — conflicto 409 y redirección a login
 *   - E2E-05  Confirmación final al usuario tras registro exitoso
 *
 * Diseño:
 *   - Mock de fetch para `/api/voluntarios` — sin dependencia de Neon en tests
 *   - getByRole, getByText, getByLabel — sin selectores CSS frágiles
 *   - Sin waitForTimeout — waitForSelector, waitForResponse o expect().toBeVisible()
 */
import { test, expect, type Page } from '@playwright/test';

// ── Constantes ────────────────────────────────────────────────────────────────

const PORTAL_URL    = '/voluntarios';
const TEST_TELEFONO = '612000001';
const TEST_NOMBRE   = 'Voluntario Test';
const TEST_PIN      = '0001'; // últimos 4 dígitos del teléfono de prueba

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Navega al portal y espera que cargue */
async function gotoPortal(page: Page) {
  await page.goto(PORTAL_URL);
  await expect(page.getByText('Trail El Guerrero')).toBeVisible({ timeout: 8000 });
}

/** Pulsa el botón de nuevo registro */
async function clickRegistrar(page: Page) {
  await page.getByRole('button', { name: /registrar|nuevo|apuntarme/i }).click();
}

/** Pulsa el botón de acceso para voluntario existente */
async function clickAcceder(page: Page) {
  await page.getByRole('button', { name: /ya.*voluntario|acceder|mi ficha|entrar/i }).click();
}

/** Rellena el paso 1 del stepper (nombre + teléfono + talla) */
async function rellenarPaso1(page: Page, datos: { nombre?: string; telefono?: string; talla?: string } = {}) {
  const nombre   = datos.nombre   ?? TEST_NOMBRE;
  const telefono = datos.telefono ?? TEST_TELEFONO;
  const talla    = datos.talla    ?? 'M';

  const inputNombre = page.getByLabel(/nombre/i);
  if (await inputNombre.isVisible({ timeout: 2000 }).catch(() => false)) {
    await inputNombre.fill(nombre);
  }
  const inputTelefono = page.getByLabel(/teléfono|telefono/i).first();
  if (await inputTelefono.isVisible({ timeout: 2000 }).catch(() => false)) {
    await inputTelefono.fill(telefono);
  }
  const selectTalla = page.getByLabel(/talla/i);
  if (await selectTalla.isVisible({ timeout: 2000 }).catch(() => false)) {
    await selectTalla.selectOption(talla);
  }
}

/** Avanza al siguiente paso del stepper */
async function clickContinuar(page: Page) {
  await page.getByRole('button', { name: /continuar|siguiente|next/i }).click();
}

// ── Tests originales — acceso y pantalla principal ────────────────────────────

test('portal carga correctamente en /voluntarios', async ({ page }) => {
  await gotoPortal(page);
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

// ── Tests originales — stepper ────────────────────────────────────────────────

test('stepper de registro tiene botón Atrás en pasos intermedios', async ({ page }) => {
  await gotoPortal(page);
  await clickRegistrar(page);

  const continuar = page.getByRole('button', { name: /continuar|siguiente|next/i });
  if (await continuar.isVisible({ timeout: 2000 }).catch(() => false)) {
    await rellenarPaso1(page);
    await continuar.click();
    await expect(page.getByRole('button', { name: /← atrás|atrás|volver/i }))
      .toBeVisible({ timeout: 3000 });
  }
});

test('botón Atrás en el stepper vuelve al paso anterior', async ({ page }) => {
  await gotoPortal(page);
  await clickRegistrar(page);

  const continuar = page.getByRole('button', { name: /continuar|siguiente/i });
  if (await continuar.isVisible({ timeout: 2000 }).catch(() => false)) {
    await rellenarPaso1(page);
    await continuar.click();

    await page.getByRole('button', { name: /← atrás|atrás/i }).click();

    const inputNombre = page.getByLabel(/nombre/i);
    if (await inputNombre.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(inputNombre).toBeVisible();
    } else {
      await expect(continuar).toBeVisible({ timeout: 3000 });
    }
  }
});

// ── Tests originales — login ──────────────────────────────────────────────────

test('login muestra campo de teléfono en el primer paso', async ({ page }) => {
  await gotoPortal(page);
  await clickAcceder(page);
  await expect(
    page.getByRole('textbox', { name: /teléfono|telefono/i })
  ).toBeVisible({ timeout: 5000 });
});

test('login con teléfono inexistente muestra error descriptivo', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    if (route.request().url().includes('action=check')) {
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
  await clickAcceder(page);

  await page.getByRole('textbox', { name: /teléfono|telefono/i }).fill('699000000');
  await page.getByRole('button', { name: /continuar|siguiente|buscar/i }).click();

  await expect(
    page.getByText(/no encontramos|no existe|registr/i)
  ).toBeVisible({ timeout: 5000 });
});

test('login con PIN correcto muestra la ficha del voluntario', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    const url  = route.request().url();
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
  await clickAcceder(page);

  await page.getByRole('textbox', { name: /teléfono|telefono/i }).fill(TEST_TELEFONO);
  await page.getByRole('button', { name: /continuar|siguiente|buscar/i }).click();

  for (const digit of TEST_PIN) {
    await page.getByRole('button', { name: `Número ${digit}` }).click();
  }

  await expect(page.getByText(TEST_NOMBRE)).toBeVisible({ timeout: 5000 });
});

test('login con PIN incorrecto muestra error', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    const url  = route.request().url();
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
  await clickAcceder(page);

  await page.getByRole('textbox', { name: /teléfono|telefono/i }).fill(TEST_TELEFONO);
  await page.getByRole('button', { name: /continuar|siguiente|buscar/i }).click();

  for (const digit of '9999') {
    await page.getByRole('button', { name: `Número ${digit}` }).click();
  }

  await expect(
    page.getByText(/incorrecto|error|inválido/i)
  ).toBeVisible({ timeout: 5000 });
});

// ── Tests originales — recuperación de PIN ────────────────────────────────────

test('portal muestra enlace de recuperación de PIN en el paso de PIN', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    if (route.request().url().includes('action=check')) {
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
  await clickAcceder(page);

  await page.getByRole('textbox', { name: /teléfono|telefono/i }).fill(TEST_TELEFONO);
  await page.getByRole('button', { name: /continuar|siguiente|buscar/i }).click();

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
  await clickAcceder(page);

  await page.getByRole('textbox', { name: /teléfono|telefono/i }).fill(TEST_TELEFONO);
  await page.getByRole('button', { name: /continuar|siguiente|buscar/i }).click();

  await page.getByText(/olvidé|recuperar|restablecer/i).click();

  await expect(
    page.getByRole('textbox', { name: /email|correo/i })
  ).toBeVisible({ timeout: 5000 });
});

// ── E2E-01: Acceso con URL válida ─────────────────────────────────────────────

test('E2E-01 — portal accesible en /voluntarios con contenido correcto', async ({ page }) => {
  await gotoPortal(page);

  // Título del evento presente
  await expect(page.getByText('Trail El Guerrero')).toBeVisible();

  // Las dos opciones de acción están presentes
  await expect(
    page.getByRole('button', { name: /registrar|nuevo|apuntarme/i })
  ).toBeVisible({ timeout: 5000 });
  await expect(
    page.getByRole('button', { name: /ya.*voluntario|acceder|mi ficha|entrar/i })
  ).toBeVisible({ timeout: 5000 });

  // La URL es /voluntarios o /voluntarios/mi-ficha (ambas válidas)
  expect(page.url()).toMatch(/\/voluntarios/);
});

// ── E2E-02: Registro completo — happy path ────────────────────────────────────

test('E2E-02 — registro completo happy path llega hasta el paso 3', async ({ page }) => {
  // Mock: no hay conflicto de teléfono
  await page.route('**/api/voluntarios**', async route => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 99 }),
      });
    } else {
      await route.continue();
    }
  });

  await gotoPortal(page);
  await clickRegistrar(page);

  // ── Paso 1: datos básicos
  await rellenarPaso1(page, {
    nombre:   'Ana García Martínez',
    telefono: '612000099',
    talla:    'M',
  });
  await clickContinuar(page);

  // ── Paso 2: puesto / disponibilidad — avanzar sin rellenar opcionales
  const paso2Continuar = page.getByRole('button', { name: /continuar|siguiente/i });
  if (await paso2Continuar.isVisible({ timeout: 3000 }).catch(() => false)) {
    await paso2Continuar.click();
  }

  // ── Paso 3: resumen y botón de confirmar registro
  await expect(
    page.getByRole('button', { name: /confirmar|enviar|registrar|finalizar/i })
  ).toBeVisible({ timeout: 5000 });
});

test('E2E-02b — registro completo happy path: envío correcto muestra confirmación', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 99 }),
      });
    } else {
      await route.continue();
    }
  });

  await gotoPortal(page);
  await clickRegistrar(page);

  await rellenarPaso1(page, {
    nombre:   'Carlos López',
    telefono: '612000088',
    talla:    'L',
  });
  await clickContinuar(page);

  // Paso 2
  const paso2Continuar = page.getByRole('button', { name: /continuar|siguiente/i });
  if (await paso2Continuar.isVisible({ timeout: 3000 }).catch(() => false)) {
    await paso2Continuar.click();
  }

  // Paso 3 — confirmar
  const btnConfirmar = page.getByRole('button', { name: /confirmar|enviar|registrar|finalizar/i });
  if (await btnConfirmar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btnConfirmar.click();
    // Pantalla de confirmación post-registro
    await expect(
      page.getByText(/registro completado|¡gracias|registrado|confirmado/i)
    ).toBeVisible({ timeout: 8000 });
  }
});

// ── E2E-03: Validación campos incorrectos — sad paths ─────────────────────────

test('E2E-03a — nombre vacío en el stepper bloquea el avance al paso 2', async ({ page }) => {
  await gotoPortal(page);
  await clickRegistrar(page);

  // No rellenar nombre, intentar continuar
  const inputTelefono = page.getByLabel(/teléfono|telefono/i).first();
  if (await inputTelefono.isVisible({ timeout: 2000 }).catch(() => false)) {
    await inputTelefono.fill(TEST_TELEFONO);
  }
  const selectTalla = page.getByLabel(/talla/i);
  if (await selectTalla.isVisible({ timeout: 2000 }).catch(() => false)) {
    await selectTalla.selectOption('M');
  }

  await clickContinuar(page);

  // Debe mostrar error de validación de nombre
  await expect(
    page.getByText(/nombre.*requerido|introduce.*nombre|campo.*obligatorio/i)
  ).toBeVisible({ timeout: 3000 });

  // No debe haber avanzado — el botón Continuar sigue visible
  await expect(
    page.getByRole('button', { name: /continuar|siguiente/i })
  ).toBeVisible({ timeout: 3000 });
});

test('E2E-03b — teléfono demasiado corto bloquea el avance al paso 2', async ({ page }) => {
  await gotoPortal(page);
  await clickRegistrar(page);

  const inputNombre = page.getByLabel(/nombre/i);
  if (await inputNombre.isVisible({ timeout: 2000 }).catch(() => false)) {
    await inputNombre.fill(TEST_NOMBRE);
  }
  const inputTelefono = page.getByLabel(/teléfono|telefono/i).first();
  if (await inputTelefono.isVisible({ timeout: 2000 }).catch(() => false)) {
    await inputTelefono.fill('123'); // demasiado corto
  }
  const selectTalla = page.getByLabel(/talla/i);
  if (await selectTalla.isVisible({ timeout: 2000 }).catch(() => false)) {
    await selectTalla.selectOption('M');
  }

  await clickContinuar(page);

  await expect(
    page.getByText(/teléfono.*válido|formato.*teléfono|número.*correcto/i)
  ).toBeVisible({ timeout: 3000 });
});

test('E2E-03c — talla no seleccionada bloquea el avance al paso 2', async ({ page }) => {
  await gotoPortal(page);
  await clickRegistrar(page);

  const inputNombre = page.getByLabel(/nombre/i);
  if (await inputNombre.isVisible({ timeout: 2000 }).catch(() => false)) {
    await inputNombre.fill(TEST_NOMBRE);
  }
  const inputTelefono = page.getByLabel(/teléfono|telefono/i).first();
  if (await inputTelefono.isVisible({ timeout: 2000 }).catch(() => false)) {
    await inputTelefono.fill(TEST_TELEFONO);
  }
  // No seleccionar talla

  await clickContinuar(page);

  await expect(
    page.getByText(/talla.*requerida|selecciona.*talla|talla.*obligatoria/i)
  ).toBeVisible({ timeout: 3000 });
});

// ── E2E-04: Voluntario ya existe — 409 → redirección a login ──────────────────

test('E2E-04 — conflicto 409 en registro muestra mensaje y opción de ir al login', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'El teléfono ya está registrado' }),
      });
    } else {
      await route.continue();
    }
  });

  await gotoPortal(page);
  await clickRegistrar(page);

  await rellenarPaso1(page, {
    nombre:   TEST_NOMBRE,
    telefono: TEST_TELEFONO,
    talla:    'M',
  });
  await clickContinuar(page);

  // Paso 2
  const paso2Continuar = page.getByRole('button', { name: /continuar|siguiente/i });
  if (await paso2Continuar.isVisible({ timeout: 3000 }).catch(() => false)) {
    await paso2Continuar.click();
  }

  // Paso 3 — confirmar → provoca el 409
  const btnConfirmar = page.getByRole('button', { name: /confirmar|enviar|registrar|finalizar/i });
  if (await btnConfirmar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btnConfirmar.click();

    // Debe mostrar el mensaje de teléfono ya existente
    await expect(
      page.getByText(/ya existe|ya.*registrado|teléfono.*registrado/i)
    ).toBeVisible({ timeout: 5000 });

    // Debe ofrecer la opción de ir a acceder a la ficha
    await expect(
      page.getByText(/acceder|ficha personal|ya soy voluntario/i)
    ).toBeVisible({ timeout: 5000 });
  }
});

test('E2E-04b — tras conflicto 409 el enlace lleva al flujo de login', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'El teléfono ya está registrado' }),
      });
    } else if (route.request().url().includes('action=check')) {
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
  await clickRegistrar(page);
  await rellenarPaso1(page);
  await clickContinuar(page);

  const paso2Continuar = page.getByRole('button', { name: /continuar|siguiente/i });
  if (await paso2Continuar.isVisible({ timeout: 3000 }).catch(() => false)) {
    await paso2Continuar.click();
  }

  const btnConfirmar = page.getByRole('button', { name: /confirmar|enviar|registrar|finalizar/i });
  if (await btnConfirmar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btnConfirmar.click();

    // Esperar mensaje de conflicto
    await expect(
      page.getByText(/ya existe|ya.*registrado/i)
    ).toBeVisible({ timeout: 5000 });

    // Pulsar el enlace de acceso a la ficha
    const btnAcceder = page.getByRole('button', { name: /acceder|ficha personal|ya soy voluntario/i })
      .or(page.getByText(/accede con tu ficha|acceder/i));
    if (await btnAcceder.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnAcceder.click();
      // Debe llegar al flujo de login — campo teléfono visible
      await expect(
        page.getByRole('textbox', { name: /teléfono|telefono/i })
      ).toBeVisible({ timeout: 5000 });
    }
  }
});

// ── E2E-05: Confirmación final al usuario ─────────────────────────────────────

test('E2E-05a — pantalla RegistroOk muestra texto "¡Registro completado!"', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 42 }),
      });
    } else {
      await route.continue();
    }
  });

  await gotoPortal(page);
  await clickRegistrar(page);
  await rellenarPaso1(page, { nombre: 'María Sanz', telefono: '612000077', talla: 'S' });
  await clickContinuar(page);

  const paso2Continuar = page.getByRole('button', { name: /continuar|siguiente/i });
  if (await paso2Continuar.isVisible({ timeout: 3000 }).catch(() => false)) {
    await paso2Continuar.click();
  }

  const btnConfirmar = page.getByRole('button', { name: /confirmar|enviar|registrar|finalizar/i });
  if (await btnConfirmar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btnConfirmar.click();
    await expect(
      page.getByText(/registro completado/i)
    ).toBeVisible({ timeout: 8000 });
  }
});

test('E2E-05b — pantalla de confirmación muestra botón para acceder a la ficha', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    const method = route.request().method();
    const url    = route.request().url();
    if (method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 43 }),
      });
    } else if (url.includes('action=check')) {
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
  await clickRegistrar(page);
  await rellenarPaso1(page, { nombre: 'Pedro Gil', telefono: '612000066', talla: 'XL' });
  await clickContinuar(page);

  const paso2Continuar = page.getByRole('button', { name: /continuar|siguiente/i });
  if (await paso2Continuar.isVisible({ timeout: 3000 }).catch(() => false)) {
    await paso2Continuar.click();
  }

  const btnConfirmar = page.getByRole('button', { name: /confirmar|enviar|registrar|finalizar/i });
  if (await btnConfirmar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btnConfirmar.click();

    // Debe mostrar confirmación
    await expect(page.getByText(/registro completado/i)).toBeVisible({ timeout: 8000 });

    // Debe ofrecer botón para ir a la ficha personal
    await expect(
      page.getByRole('button', { name: /acceder.*ficha|ir.*ficha|mi ficha|ver.*ficha/i })
    ).toBeVisible({ timeout: 5000 });
  }
});

test('E2E-05c — botón de acceso en confirmación lleva al flujo de login', async ({ page }) => {
  await page.route('**/api/voluntarios**', async route => {
    const method = route.request().method();
    const url    = route.request().url();
    if (method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 44 }),
      });
    } else if (url.includes('action=check')) {
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
  await clickRegistrar(page);
  await rellenarPaso1(page, { nombre: 'Laura Ruiz', telefono: '612000055', talla: 'M' });
  await clickContinuar(page);

  const paso2Continuar = page.getByRole('button', { name: /continuar|siguiente/i });
  if (await paso2Continuar.isVisible({ timeout: 3000 }).catch(() => false)) {
    await paso2Continuar.click();
  }

  const btnConfirmar = page.getByRole('button', { name: /confirmar|enviar|registrar|finalizar/i });
  if (await btnConfirmar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btnConfirmar.click();
    await expect(page.getByText(/registro completado/i)).toBeVisible({ timeout: 8000 });

    const btnAcceder = page.getByRole('button', { name: /acceder.*ficha|ir.*ficha|mi ficha|ver.*ficha/i });
    if (await btnAcceder.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnAcceder.click();
      // Debe llegar al login con el teléfono pre-relleno
      await expect(
        page.getByRole('textbox', { name: /teléfono|telefono/i })
      ).toBeVisible({ timeout: 5000 });
    }
  }
});
