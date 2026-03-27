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
    // Target navegadores modernos — elimina polyfills innecesarios
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // recharts + d3 — solo los carga Dashboard, van en su propio chunk
          if (id.includes("recharts") || id.includes("/d3-")) {
            return "vendor-charts";
          }
          // framer-motion + lucide — Landing page
          if (id.includes("framer-motion") || id.includes("lucide-react")) {
            return "vendor-ui";
          }
          // React core — chunk estable para caché del navegador
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          // react-router
          if (id.includes("react-router")) {
            return "vendor-router";
          }
          // jspdf + html2canvas — solo se cargan al pulsar el botón PDF
          // (ya son lazy import, pero separamos para que no vayan al vendor principal)
          if (id.includes("jspdf") || id.includes("html2canvas")) {
            return "vendor-pdf";
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
