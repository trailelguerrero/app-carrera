import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index.jsx";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import PublicVolunteerForm from "./components/PublicVolunteerForm.jsx";

// App limpio — sin ThemeProvider (interfiere con design system propio),
// sin QueryClientProvider (no se usa), sin Toaster/Sonner (no se usan)
const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/"                       element={<Landing />} />
      <Route path="/panel"                  element={<Index />} />
      <Route path="/voluntarios/registro"   element={<PublicVolunteerForm />} />
      <Route path="*"                       element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
