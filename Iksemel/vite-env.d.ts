/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WDYR?: "true" | "false";
  readonly VITE_ZIP_BACKEND?: "jszip" | "fflate";
  readonly VITE_POLICY_RUNTIME?: "native" | "opa";
  readonly VITE_CODE_VIEWER?: "classic" | "monaco";
  readonly VITE_DERIVED_WORKER?: "true" | "false";
  readonly VITE_PERF_PANEL?: "true" | "false";
  readonly VITE_BRIDGE_DEBUG?: "true" | "false";
}
