import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    proxy: {
      "/api": {
        target: "https://appcarrera.vercel.app",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core — chunk estable, el navegador lo cachea entre visitas
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          // recharts + d3 — solo los usa Dashboard, ~330KB fuera del critical path
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("d3/src")) {
            return "vendor-charts";
          }
          // react-router — pequeño pero separado para mejor caché
          if (id.includes("react-router")) {
            return "vendor-router";
          }
          // framer-motion + lucide — animaciones e iconos
          if (id.includes("framer-motion") || id.includes("lucide-react")) {
            return "vendor-ui";
          }
          // resto de node_modules — se precarga en background
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
}));
