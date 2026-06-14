import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Landing from "./pages/Landing.tsx";
import { useBackgroundSync } from "./hooks/useBackgroundSync.js";

// PERF-F3: code-splitting por ruta. Landing (raíz) queda eager para primer paint
// inmediato; las rutas pesadas se cargan bajo demanda en su propio chunk, de modo
// que el portal del voluntario no arrastra el bundle del panel admin (Index/Recharts/exceljs).
const Index           = lazy(() => import("./pages/Index.jsx"));
const VoluntarioPortal = lazy(() => import("./pages/VoluntarioPortal.jsx"));
const DiaCarreraPage  = lazy(() => import("./pages/DiaCarreraPage.jsx"));
const NotFound        = lazy(() => import("./pages/NotFound.tsx"));

// Fallback mínimo mientras carga el chunk de la ruta (sin dependencias de CSS de bloques)
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--cyan, #22d3ee)",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: "var(--fs-sm, 0.85rem)",
        letterSpacing: ".04em",
      }}
    >
      Cargando…
    </div>
  );
}

// Hook de Background Sync activo en toda la app
// Escucha teg-save-status y registra tareas sync en el SW automáticamente
function AppWithSync({ children }: { children: React.ReactNode }) {
  useBackgroundSync();
  return <>{children}</>;
}

// /voluntarios/registro redirige al portal unificado (backward compat)
const App = () => (
  <AppWithSync>
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    storageKey="teg-theme"
    disableTransitionOnChange={false}
  >
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/"                       element={<Landing />} />
          <Route path="/panel"                  element={<Index />} />
          <Route path="/voluntarios"            element={<Navigate to="/voluntarios/mi-ficha" replace />} />
          <Route path="/voluntarios/registro"   element={<Navigate to="/voluntarios/mi-ficha" replace />} />
          <Route path="/voluntarios/mi-ficha"   element={<VoluntarioPortal />} />
          <Route path="/dia-carrera"            element={<DiaCarreraPage />} />
          <Route path="*"                       element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </ThemeProvider>
  </AppWithSync>
);

export default App;
