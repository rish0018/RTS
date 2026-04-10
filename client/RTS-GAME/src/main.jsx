import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";   // ← must come BEFORE App so variables are defined first
import App from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(" Root element with id 'root' not found in HTML file. Check index.html.");
}
ReactDOM.createRoot(rootElement).render(
  <App />
);
