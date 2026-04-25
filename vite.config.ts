import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
        target: "https://appcarrera.vercel.app",
        changeOrigin: true,
        secure: false, // In case of localhost routing issues
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
