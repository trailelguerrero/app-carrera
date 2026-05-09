import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "api/**"] },

  // ── TypeScript / TSX ────────────────────────────────────────────────────────
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // ── JavaScript / JSX (src/) ─────────────────────────────────────────────────
  // NEW-03 fix: el bloque anterior solo cubría TS. Sin este bloque ESLint no
  // sabe parsear JSX en archivos .js/.jsx → 65 "Parsing error: Unexpected token <"
  {
    extends: [js.configs.recommended],
    files: ["src/**/*.{js,jsx}"],
    ignores: ["src/test/**"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-unused-vars": "off",
    },
  },

  // ── Tests (src/test/) ───────────────────────────────────────────────────────
  // Fix NEW-04: los archivos de test usan globals de Node.js (global, process)
  // y Jest (describe, it, expect, beforeEach, afterEach, jest).
  // Sin este bloque ESLint los reporta como "not defined".
  {
    extends: [js.configs.recommended],
    files: ["src/test/**/*.{js,jsx,ts,tsx}", "**/*.{test,spec}.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser, // JSDOM exposes window, document, etc. in test env
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
);
