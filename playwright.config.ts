import { defineConfig, devices } from '@playwright/test';

/**
 * playwright.config.ts — Mejora 14
 *
 * Configuración E2E locales y CI.
 * El servidor se levanta con `vite preview` sobre el build de producción
 * para garantizar que los tests corren contra el mismo bundle que Vercel.
 *
 * Comando: npm run test:e2e
 *
 * Proyectos:
 *   - chromium  → suite completa (default local + CI)
 *   - webkit    → solo tests de accesibilidad (formulario-publico.spec.ts)
 *                 activo solo en CI para no ralentizar ejecución local
 */
export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: false,        // los tests de login comparten localStorage — ejecutar en serie
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // Sin video ni screenshot por defecto para mantener los tests rápidos
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // WebKit solo en CI: detecta diferencias de accesibilidad ARIA entre navegadores
    // (aria-invalid, roles de diálogo, navegación por teclado en Safari/iOS)
    ...(process.env.CI ? [{
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      // En CI solo ejecutamos los tests de accesibilidad del formulario público
      testMatch: ['**/formulario-publico.spec.ts'] as string[],
    }] : []),
  ],

  // Levanta el servidor antes de los tests y lo para al terminar
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
