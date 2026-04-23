import { describe, expect, it } from "vitest";
import type { PolicyRule } from "@/types";
import { evaluatePolicy } from "./policy-engine";
import { evaluatePolicyWithRuntime, resolvePolicyRuntimeMode } from "./runtime-resolver";

describe("policy runtime resolver", () => {
  it("resolves mode safely", () => {
    expect(resolvePolicyRuntimeMode(undefined)).toBe("native");
    expect(resolvePolicyRuntimeMode("native")).toBe("native");
    expect(resolvePolicyRuntimeMode("opa")).toBe("opa");
    expect(resolvePolicyRuntimeMode("unexpected")).toBe("native");
  });

  it("evaluates through runtime and matches native engine by default", async () => {
    const rules: PolicyRule[] = [
      {
        id: "req-channel",
        type: "REQUIRED_FILTER",
        xpath: "Channel/ChannelName",
        params: {},
        message: "Channel filter required.",
      },
    ];

    const native = evaluatePolicy(rules, {}, null, {});
    const runtime = await evaluatePolicyWithRuntime({
      rules,
      filterValues: {},
      schema: null,
      selection: {},
    });

    expect(runtime).toEqual(native);
  });
});
