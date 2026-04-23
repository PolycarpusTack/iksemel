/**
 * Reactive policy evaluation hook.
 *
 * Evaluates policy rules whenever filter values, policy, or selection
 * change, and dispatches the resulting violations to state.
 */

import { useEffect } from "react";
import type { Dispatch } from "react";
import type { AppAction } from "@/state";
import type {
  FilterValuesState,
  PolicyRule,
  SelectionState,
  SchemaNode,
} from "@/types";
import { evaluatePolicyWithRuntime } from "@engine/policy";

const POLICY_EVAL_DEBOUNCE_MS = 120;

export function usePolicyEvaluation(
  dispatch: Dispatch<AppAction>,
  policy: readonly PolicyRule[],
  filterValues: FilterValuesState,
  schema: readonly SchemaNode[] | null,
  selection: SelectionState,
): void {
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (policy.length === 0) {
        dispatch({ type: "SET_POLICY_VIOLATIONS", violations: [] });
        return;
      }

      void evaluatePolicyWithRuntime({
        rules: policy,
        filterValues,
        schema,
        selection,
      }).then((violations) => {
        if (!cancelled) {
          dispatch({ type: "SET_POLICY_VIOLATIONS", violations: [...violations] });
        }
      }).catch((error) => {
        console.error("[XFEB] Policy evaluation failed:", error);
        if (!cancelled) {
          dispatch({ type: "SET_POLICY_VIOLATIONS", violations: [] });
        }
      });
    }, POLICY_EVAL_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dispatch, policy, filterValues, schema, selection]);
}
