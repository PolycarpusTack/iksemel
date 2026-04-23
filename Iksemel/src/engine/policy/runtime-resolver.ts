import { nativePolicyRuntime } from "./native-runtime";
import { tryCreateOpaPolicyRuntime } from "./opa-runtime";
import type { PolicyEvaluationInput, PolicyRuntime } from "./policy-runtime";
import type { PolicyViolation } from "@/types";

export type PolicyRuntimeMode = "native" | "opa";

let runtimePromise: Promise<PolicyRuntime> | null = null;

export function resolvePolicyRuntimeMode(mode: string | undefined): PolicyRuntimeMode {
  return mode === "opa" ? "opa" : "native";
}

function preferredRuntimeMode(): PolicyRuntimeMode {
  return resolvePolicyRuntimeMode(import.meta.env.VITE_POLICY_RUNTIME);
}

async function createRuntime(): Promise<PolicyRuntime> {
  if (preferredRuntimeMode() === "opa") {
    const opaRuntime = await tryCreateOpaPolicyRuntime();
    if (opaRuntime) {
      return opaRuntime;
    }
  }

  return nativePolicyRuntime;
}

export async function getPolicyRuntime(): Promise<PolicyRuntime> {
  if (runtimePromise === null) {
    runtimePromise = createRuntime();
  }

  return runtimePromise;
}

export async function evaluatePolicyWithRuntime(
  input: PolicyEvaluationInput,
): Promise<readonly PolicyViolation[]> {
  const runtime = await getPolicyRuntime();
  return runtime.evaluate(input);
}
