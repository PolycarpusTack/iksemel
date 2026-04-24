import type { SelectionState } from "@/types/selection";
import type { FilterValuesState } from "@/types/filter";
import type { ColumnDefinition, ExportFormat } from "@/types/export";

export interface ConfigSnapshot {
  readonly selection: SelectionState;
  readonly filterValues: FilterValuesState;
  readonly columns: readonly ColumnDefinition[];
  readonly format: ExportFormat;
  readonly timestamp: number;
}

export interface NamedConfig extends ConfigSnapshot {
  readonly id: string;
  readonly name: string;
}

export interface ConfigHistory {
  readonly recent: readonly ConfigSnapshot[];
  readonly named: readonly NamedConfig[];
}
