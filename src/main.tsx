import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/blocks.css";
import "./styles/dashboard.css";
import "./styles/logistica.css";
import "./styles/proyecto.css";
import "./styles/diacarrera.css";
import "./styles/voluntario-portal.css";

createRoot(document.getElementById("root")!).render(<App />);
