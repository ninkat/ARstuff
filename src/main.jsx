import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import HandTracking from "./HandTracking.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <div>
      <HandTracking />
    </div>
  </StrictMode>,
);

