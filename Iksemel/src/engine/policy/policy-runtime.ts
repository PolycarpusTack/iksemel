import type {
  PolicyRule,
  PolicyViolation,
  FilterValuesState,
  SelectionState,
  SchemaNode,
} from "@/types";

export interface PolicyEvaluationInput {
  readonly rules: readonly PolicyRule[];
  readonly filterValues: FilterValuesState;
  readonly schema: readonly SchemaNode[] | null;
  readonly selection: SelectionState;
}

export interface PolicyRuntime {
  readonly name: string;
  evaluate(input: PolicyEvaluationInput): Promise<readonly PolicyViolation[]>;
}
