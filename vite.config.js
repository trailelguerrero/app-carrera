import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

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

  plugins: [
    react(),
    mode === "development" && componentTagger(),

    VitePWA({
      // El SW se registra solo — eliminar el registro manual de Index.jsx
      registerType: "autoUpdate",

      // Incluir todos los assets del build en el precache
      includeAssets: ["favicon.ico", "logo.webp", "icon-192.webp", "icon-512.webp"],

      // Workbox — configuración de estrategias de cache
      workbox: {
        // Precaching de todos los assets del build
        globPatterns: [
          "**/*.{js,css,html}",           // código app
          "*.{webp,png,svg,ico,json}",    // assets raíz
          "assets/*.{js,css,webp}",       // assets con hash
        ],
        globIgnores: ["**/node_modules/**"],

        // Límite de tamaño por archivo (los bundles JS son grandes)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB

        runtimeCaching: [
          // API de datos (Neon) — NetworkFirst con fallback a cache
          // Si hay red: datos frescos. Sin red: última respuesta cacheada.
          {
            urlPattern: /^https?:\/\/.*\/api\/data\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-data-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // API de documentos (metadatos) — NetworkFirst
          {
            urlPattern: /^https?:\/\/.*\/api\/documents.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-docs-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 24 * 60 * 60, // 1 día
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Vercel Blob — CacheFirst (los archivos no cambian una vez subidos)
          {
            urlPattern: /^https:\/\/.*\.vercel-storage\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "blob-storage-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts — CacheFirst
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // manifest.json generado por el plugin (reemplaza el manual)
      manifest: {
        name: "Trail El Guerrero 2026",
        short_name: "TEG 2026",
        description: "Panel de gestión del Trail El Guerrero 2026",
        start_url: "/",
        display: "standalone",
        background_color: "#080c18",
        theme_color: "#22d3ee",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/icon-192.webp",
            sizes: "192x192",
            type: "image/webp",
            purpose: "any maskable",
          },
          {
            src: "/icon-512.webp",
            sizes: "512x512",
            type: "image/webp",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },

  build: {
    target: "es2020",
    chunkSizeWarningLimit: 600,
  },
}));
