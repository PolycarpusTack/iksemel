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
const appRoot = rootElement;

function shouldEnableWdyr(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }

  return import.meta.env.MODE === "wdyr" || import.meta.env.VITE_WDYR === "true";
}

async function bootstrap(): Promise<void> {
  if (shouldEnableWdyr()) {
    const { enableWhyDidYouRender } = await import("@/dev/why-did-you-render");
    await enableWhyDidYouRender();
  }

  createRoot(appRoot).render(
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
}

void bootstrap();
