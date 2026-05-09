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
  },
}));
