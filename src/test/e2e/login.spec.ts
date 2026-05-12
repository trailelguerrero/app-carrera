/**
 * login.spec.ts — Tests E2E del flujo de autenticación del panel
 *
 * Cubre:
 *   - Login correcto con PIN por defecto
 *   - Login incorrecto (PIN erróneo)
 *   - Lockout tras MAX_FAILS intentos fallidos
 *   - Persistencia del lockout tras recarga de página
 *   - Cambio de PIN desde el panel
 *
 * Diseño:
 *   - Sin selectores CSS frágiles — getByRole, getByText, getByLabel
 *   - Sin waitForTimeout — waitForSelector o expect().toBeVisible()
 *   - Limpieza de localStorage antes de cada test para aislamiento
 */
import { test, expect, type Page } from '@playwright/test';

const DEFAULT_PIN = '1975';
const WRONG_PIN   = '0000';
const MAX_FAILS   = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Limpia el estado de auth y lockout en localStorage */
async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter(k =>
      k.startsWith('teg_auth') || k.startsWith('teg_panel')
    );
    keys.forEach(k => localStorage.removeItem(k));
  });
}

/** Introduce un PIN dígito a dígito en el teclado numérico */
async function enterPin(page: Page, pin: string) {
  for (const digit of pin) {
    await page.getByRole('button', { name: `Número ${digit}` }).click();
  }
}

/** Espera a que aparezca la pantalla del panel (post-login) */
async function expectPanelVisible(page: Page) {
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 5000 });
}

/** Espera a que aparezca la pantalla de login */
async function expectLoginVisible(page: Page) {
  await expect(page.getByText('Trail El Guerrero')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeVisible();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expectLoginVisible(page);
  await clearAuthState(page);
  await page.reload();
  await expectLoginVisible(page);
});

// ── Login correcto ─────────────────────────────────────────────────────────

test('login correcto con PIN por defecto abre el panel', async ({ page }) => {
  await enterPin(page, DEFAULT_PIN);
  await expectPanelVisible(page);
});

test('sesión persiste tras recargar página (dentro del TTL de 8h)', async ({ page }) => {
  await enterPin(page, DEFAULT_PIN);
  await expectPanelVisible(page);

  await page.reload();
  // No debe pedir PIN de nuevo — la sesión sigue activa
  await expectPanelVisible(page);
});

// ── Login incorrecto ───────────────────────────────────────────────────────

test('PIN incorrecto muestra mensaje de error', async ({ page }) => {
  await enterPin(page, WRONG_PIN);
  // El mensaje aparece y el teclado sigue activo
  await expect(page.getByText('PIN incorrecto')).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeEnabled();
});

test('PIN incorrecto no abre el panel', async ({ page }) => {
  await enterPin(page, WRONG_PIN);
  // Esperar el feedback y verificar que seguimos en la pantalla de login
  await expect(page.getByText('PIN incorrecto')).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole('navigation')).not.toBeVisible();
});

// ── Lockout ────────────────────────────────────────────────────────────────

test(`lockout tras ${MAX_FAILS} intentos fallidos deshabilita el teclado`, async ({ page }) => {
  // Introducir MAX_FAILS PINs incorrectos
  for (let i = 0; i < MAX_FAILS; i++) {
    await enterPin(page, WRONG_PIN);
    // Esperar a que el teclado se reactive antes del siguiente intento
    // (el componente tiene un timeout de 900ms para resetear)
    if (i < MAX_FAILS - 1) {
      await page.waitForTimeout(950);
    }
  }

  // El teclado debe estar deshabilitado y mostrarse el countdown
  await expect(page.getByText('Panel bloqueado')).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeDisabled();
});

test('lockout persiste tras recargar la página', async ({ page }) => {
  // Provocar lockout
  for (let i = 0; i < MAX_FAILS; i++) {
    await enterPin(page, WRONG_PIN);
    if (i < MAX_FAILS - 1) await page.waitForTimeout(950);
  }
  await expect(page.getByText('Panel bloqueado')).toBeVisible({ timeout: 3000 });

  // Recargar — el lockout debe persistir (guardado en localStorage)
  await page.reload();
  await expect(page.getByText('Panel bloqueado')).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole('button', { name: 'Número 1' })).toBeDisabled();
});

// ── Cambio de PIN ──────────────────────────────────────────────────────────

test('cambio de PIN funciona y el nuevo PIN permite el acceso', async ({ page }) => {
  const NEW_PIN = '2468';

  // 1. Hacer login
  await enterPin(page, DEFAULT_PIN);
  await expectPanelVisible(page);

  // 2. Abrir el modal de cambio de PIN
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('teg-open-changepin'))
  );
  await expect(page.getByText('Cambiar PIN')).toBeVisible({ timeout: 3000 });

  // 3. Introducir PIN actual
  await enterPin(page, DEFAULT_PIN);

  // 4. Introducir nuevo PIN
  await enterPin(page, NEW_PIN);

  // 5. Confirmar nuevo PIN
  await enterPin(page, NEW_PIN);

  // 6. Verificar confirmación de éxito
  await expect(page.getByText('PIN actualizado')).toBeVisible({ timeout: 3000 });

  // 7. Cerrar sesión y volver al login
  await clearAuthState(page);
  await page.reload();
  await expectLoginVisible(page);

  // 8. El nuevo PIN debe funcionar
  await enterPin(page, NEW_PIN);
  await expectPanelVisible(page);

  // Limpiar: restaurar PIN por defecto para no afectar otros tests
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('teg-open-changepin'))
  );
  await enterPin(page, NEW_PIN);
  await enterPin(page, DEFAULT_PIN);
  await enterPin(page, DEFAULT_PIN);
});
