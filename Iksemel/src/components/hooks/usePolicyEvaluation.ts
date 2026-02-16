/**
 * Reactive policy evaluation hook.
 *
 * Evaluates policy rules whenever filter values, policy, or selection
 * change, and dispatches the resulting violations to state.
 */

import { useEffect } from "react";
import type { Dispatch } from "react";
import type { AppAction } from "@/state/app-state";
import type {
  FilterValuesState,
  PolicyRule,
  SelectionState,
  SchemaNode,
} from "@/types";
import { evaluatePolicy } from "@engine/policy";

export function usePolicyEvaluation(
  dispatch: Dispatch<AppAction>,
  policy: readonly PolicyRule[],
  filterValues: FilterValuesState,
  schema: readonly SchemaNode[] | null,
  selection: SelectionState,
): void {
  useEffect(() => {
    if (policy.length === 0) {
      dispatch({ type: "SET_POLICY_VIOLATIONS", violations: [] });
      return;
    }

    const violations = evaluatePolicy(policy, filterValues, schema, selection);
    dispatch({ type: "SET_POLICY_VIOLATIONS", violations });
  }, [dispatch, policy, filterValues, schema, selection]);
}
