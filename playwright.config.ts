import { defineConfig, devices } from '@playwright/test';

/**
 * playwright.config.ts — Tarea 7.2
 *
 * Configuración mínima para E2E locales.
 * El servidor se levanta con `vite preview` sobre el build de producción
 * para garantizar que los tests corren contra el mismo bundle que Vercel.
 *
 * Comando: npm run test:e2e
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
  ],

  // Levanta el servidor antes de los tests y lo para al terminar
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
