import type { PolicyRuntime } from "./policy-runtime";

export async function tryCreateOpaPolicyRuntime(): Promise<PolicyRuntime | null> {
  const packageName = "npm-opa-wasm";

  try {
    const mod = await import(/* @vite-ignore */ packageName) as {
      readonly default?: unknown;
    };

    if (!mod) {
      return null;
    }

    // Placeholder adapter:
    // OPA requires compiled policy bundles (wasm + data). The current app
    // policy model is native rule objects, so runtime bridging is deferred.
    return null;
  } catch {
    return null;
  }
}
