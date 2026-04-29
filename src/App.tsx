import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Index from "./pages/Index.jsx";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import VoluntarioPortal from "./pages/VoluntarioPortal.jsx";

// /voluntarios/registro redirige al portal unificado (backward compat)
const App = () => (
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
        <Route path="/voluntarios/registro"   element={<Navigate to="/voluntarios/mi-ficha" replace />} />
        <Route path="/voluntarios/mi-ficha"   element={<VoluntarioPortal />} />
        <Route path="*"                       element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
