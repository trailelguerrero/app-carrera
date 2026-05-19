import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

export default defineConfig({
  plugins: [react()],
  define: {
    // fix(runtime): __APP_VERSION__ inyectado por vite.config pero no por vitest.config.
    // PinScreen lo referencia en el footer — sin este define lanza ReferenceError en tests.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    exclude: ["src/test/e2e/**"],  // los tests E2E los ejecuta Playwright, no Vitest
    testTimeout: 20000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
