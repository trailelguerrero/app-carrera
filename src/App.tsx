import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Index from "./pages/Index.jsx";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import VoluntarioPortal from "./pages/VoluntarioPortal.jsx";
import DiaCarreraPage from "./pages/DiaCarreraPage.jsx";
import { useBackgroundSync } from "./hooks/useBackgroundSync.js";

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
      <Routes>
        <Route path="/"                       element={<Landing />} />
        <Route path="/panel"                  element={<Index />} />
        <Route path="/voluntarios"            element={<Navigate to="/voluntarios/mi-ficha" replace />} />
        <Route path="/voluntarios/registro"   element={<Navigate to="/voluntarios/mi-ficha" replace />} />
        <Route path="/voluntarios/mi-ficha"   element={<VoluntarioPortal />} />
        <Route path="/dia-carrera"            element={<DiaCarreraPage />} />
        <Route path="*"                       element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
  </AppWithSync>
);

export default App;
