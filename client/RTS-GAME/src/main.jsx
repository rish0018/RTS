import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";   // ← must come BEFORE App so variables are defined first
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);
