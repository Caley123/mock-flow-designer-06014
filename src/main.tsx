import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Importar función de verificación para debugging
import "./lib/utils/verificarEstudiante";

createRoot(document.getElementById("root")!).render(<App />);
