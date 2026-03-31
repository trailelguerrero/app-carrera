import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index.jsx";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import PublicVolunteerForm from "./components/PublicVolunteerForm.jsx";

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
        <Route path="/voluntarios/registro"   element={<PublicVolunteerForm />} />
        <Route path="*"                       element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
