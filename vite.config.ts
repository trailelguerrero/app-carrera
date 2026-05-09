import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// El target del proxy se configura por entorno para evitar que dev apunte a producción.
// En local: añade VITE_API_PROXY_TARGET=https://appcarrera.vercel.app en .env.local
// si quieres enrutar a producción, o déjalo vacío para trabajar offline (localStorage).
const API_PROXY_TARGET =
  process.env.VITE_API_PROXY_TARGET ?? "http://localhost:3000";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Desactivar el renombrado de identificadores para evitar TDZ en módulos grandes.
    // Logistica.jsx (~3800 líneas, chunk único) agota los identificadores de 1 letra
    // y el minificador crea colisiones de scope → TDZ en runtime en Vercel.
    // El coste es ~8-12% de bundle size adicional, aceptable para el proyecto.
    esbuildOptions: {
      minifyIdentifiers: false,
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
