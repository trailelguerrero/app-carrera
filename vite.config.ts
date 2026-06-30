import { defineConfig } from "vite";
import { readFileSync } from "fs";
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// El target del proxy se configura por entorno para evitar que dev apunte a producción.
// En local: añade VITE_API_PROXY_TARGET=https://appcarrera.vercel.app en .env.local
// si quieres enrutar a producción, o déjalo vacío para trabajar offline (localStorage).
const API_PROXY_TARGET =
  process.env.VITE_API_PROXY_TARGET ?? "http://localhost:3000";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // VITE_SENTRY_RELEASE: inyectado en CI via env var (e.g. "1.0.1+abc1234")
    // En builds locales sin la variable queda undefined y main.tsx usa __APP_VERSION__
    "import.meta.env.VITE_SENTRY_RELEASE": JSON.stringify(
      process.env.VITE_SENTRY_RELEASE ?? undefined
    ),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    // PWA — estrategia injectManifest para control total sobre sw.js
    // El SW vive en public/sw.js y se copia al dist con el manifest inyectado.
    // En desarrollo el SW no se registra (ver src/main.tsx).
    VitePWA({
      strategies: "injectManifest",
      srcDir: "public",
      filename: "sw.js",
      // No registramos automáticamente — lo hacemos manualmente en
      // src/lib/registerServiceWorker.ts (PWA-12), que fuerza la
      // comprobación de actualizaciones y recarga sola, sin que el
      // usuario tenga que hacer nada.
      injectRegister: false,
      manifest: false, // usamos nuestro public/manifest.json directamente
      injectManifest: {
        // Inyecta self.__WB_MANIFEST en el SW (lista de assets precacheables)
        globPatterns: ["**/*.{js,css,webp,ico,html}"],
        globIgnores: ["**/node_modules/**", "**/sw.js"],
      },
      devOptions: {
        // El SW no se activa en dev para no interferir con el HMR
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // minifyIdentifiers: false fue necesario mientras Logistica.jsx era un monolito
    // (~3800 líneas en un chunk único). Tras su división en sub-componentes bajo
    // src/components/logistica/ el bug TDZ desapareció — build con true verificado.
    // Sin circularidades según madge. Recuperamos el 8-12% de bundle size adicional.
    esbuildOptions: {
      minifyIdentifiers: true,
    },
    // Subir el límite solo para exceljs (938 kB, librería de terceros no divisible)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // exceljs va solo — es el chunk más grande (938 kB) y cambia independientemente
          if (id.includes("exceljs")) return "vendor-exceljs";

          // Gráficas + utilidades de fecha — consumidas principalmente por Dashboard
          if (id.includes("recharts") || id.includes("date-fns")) return "vendor-charts";

          // PDF — consumido solo por módulos de exportación
          if (id.includes("jspdf") || id.includes("jspdf-autotable")) return "vendor-pdf";

          // Leaflet — mapa interactivo, bundleado (no CDN)
          if (id.includes("node_modules/leaflet")) return "vendor-leaflet";

          // QR — pequeño pero puntual
          if (id.includes("qrcode")) return "vendor-qr";

          // Lucide icons — grande (muchos SVGs), cacheable
          if (id.includes("lucide-react")) return "vendor-icons";

          // React ecosystem completo en un solo chunk.
          // Incluye todas las libs que importan react internamente para evitar
          // que Rollup detecte dependencias circulares entre chunks.
          // NOTA: lodash y otras libs sin dependencia de React quedan en el chunk
          // automático de Rollup (sin vendor-misc) para evitar el ciclo.
          if (id.includes("node_modules/react") ||
              id.includes("node_modules/@radix-ui/") ||
              id.includes("node_modules/react-hook-form") ||
              id.includes("node_modules/sonner") ||
              id.includes("node_modules/next-themes") ||
              id.includes("node_modules/@hookform/") ||
              id.includes("node_modules/scheduler/")
          ) return "vendor-react";
        },
      },
    },
  },
}));
