import type { PolicyRuntime } from "./policy-runtime";
import { evaluatePolicy } from "./policy-engine";

export const nativePolicyRuntime: PolicyRuntime = {
  name: "native",
  async evaluate(input) {
    return evaluatePolicy(
      input.rules,
      input.filterValues,
      input.schema,
      input.selection,
    );
  },
};
