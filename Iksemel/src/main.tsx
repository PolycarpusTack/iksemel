import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/reset.css";
import { AppProvider } from "@/state";
import { ErrorBoundary } from "@components/shared/ErrorBoundary";
import { ToastProvider } from "@components/shared/Toast";
import { App } from "./App";

// Import generation modules to trigger auto-registration
import "@engine/generation/xslt-excel";
import "@engine/generation/xslt-csv";
import "@engine/generation/xslt-word";
import "@engine/generation/xslt-html";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
