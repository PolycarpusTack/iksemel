import { useMemo } from "react";
import type { AppState } from "@/state";
import type { LeftPanelProps } from "@/app/components/LeftPanel";
import type { RightTabsProps } from "@/app/components/RightTabs";
import type { AppActions } from "@/app/hooks/useAppActions";
import type { FilterPanelState } from "@/app/hooks/useFilterPanelState";
import type { TemplateLibraryResult } from "@/app/hooks/useTemplateLibrary";
import type { ValidationWarning } from "@engine/analysis";
import type { DerivedOutputs } from "@/app/hooks/useDerivedOutputs";

interface DataEstimate {
  readonly estimatedKb: number;
  readonly source: "data" | "static";
}

interface LeftPanelViewModelInput {
  readonly schema: AppState["schema"];
  readonly selection: AppState["selection"];
  readonly expansion: AppState["expansion"];
  readonly searchQuery: AppState["searchQuery"];
  readonly focusedNodeId: AppState["focusedNodeId"];
  readonly filterValues: AppState["filterValues"];
  readonly referenceData: AppState["referenceData"];
  readonly policy: AppState["policy"];
  readonly actions: AppActions;
  readonly filterPanel: FilterPanelState;
  readonly panelWidth: number;
  readonly canUndoSelection: boolean;
  readonly canRedoSelection: boolean;
  readonly typeFilter: string | null;
  readonly onTypeFilterChange: (value: string | null) => void;
  readonly searchMatchCount: number | null;
  readonly selectedCount: number;
  readonly totalCount: number;
  readonly reductionPct: number;
  readonly rawXmlSize: number;
  readonly reportSize: number;
  readonly payloadExplosions: readonly {
    readonly nodeId: string;
    readonly nodeName: string;
    readonly contributionPct: number;
  }[];
  readonly validationWarnings: readonly ValidationWarning[];
  readonly dataEstimate: DataEstimate | null;
  readonly onSelectSearchResults: () => void;
  readonly onRangeSelect: (nodeIds: readonly string[]) => void;
  readonly onSelectSubtree: (nodeId: string) => void;
  readonly onDeselectSubtree: (nodeId: string) => void;
  readonly onExpandSubtree: (nodeId: string) => void;
  readonly onCollapseSubtree: (nodeId: string) => void;
  readonly onSelectByType: (typeName: string) => void;
  readonly onAddToColumns: (nodeId: string) => void;
}

interface RightTabsViewModelInput {
  readonly activeTab: AppState["activeTab"];
  readonly format: AppState["format"];
  readonly rowSource: AppState["rowSource"];
  readonly groupBy: AppState["groupBy"];
  readonly sortBy: AppState["sortBy"];
  readonly columns: AppState["columns"];
  readonly style: AppState["style"];
  readonly stylePresetKey: AppState["stylePresetKey"];
  readonly title: AppState["title"];
  readonly metadata: AppState["metadata"];
  readonly policyViolations: AppState["policyViolations"];
  readonly actions: AppActions;
  readonly templateLibrary: TemplateLibraryResult;
  readonly tabs: readonly { readonly id: string; readonly label: string }[];
  readonly selectedLeaves: DerivedOutputs["selectedLeaves"];
  readonly repeatingElements: DerivedOutputs["repeatingElements"];
  readonly orphanedColumns: DerivedOutputs["orphanedColumns"];
  readonly selectedCount: number;
  readonly slug: string;
  readonly filterXml: string;
  readonly xsltOutput: string;
  readonly reportXml: string;
  readonly filterValues: AppState["filterValues"];
  readonly schema: AppState["schema"];
}

export function useLeftPanelViewModel(input: LeftPanelViewModelInput): LeftPanelProps {
  const {
    schema,
    selection,
    expansion,
    searchQuery,
    focusedNodeId,
    filterValues,
    referenceData,
    policy,
    actions,
    filterPanel,
    panelWidth,
    canUndoSelection,
    canRedoSelection,
    typeFilter,
    onTypeFilterChange,
    searchMatchCount,
    selectedCount,
    totalCount,
    reductionPct,
    rawXmlSize,
    reportSize,
    payloadExplosions,
    validationWarnings,
    dataEstimate,
    onSelectSearchResults,
    onRangeSelect,
    onSelectSubtree,
    onDeselectSubtree,
    onExpandSubtree,
    onCollapseSubtree,
    onSelectByType,
    onAddToColumns,
  } = input;

  return useMemo(() => ({
    schema,
    selection,
    expansion,
    searchQuery,
    focusedNodeId,
    filterValues,
    referenceData,
    policy,
    panelWidth,
    canUndoSelection,
    canRedoSelection,
    typeFilter,
    onTypeFilterChange,
    searchMatchCount,
    selectedCount,
    totalCount,
    reductionPct,
    rawXmlSize,
    reportSize,
    payloadExplosions,
    validationWarnings,
    dataEstimate,
    filterPanel,
    actions,
    onSelectSearchResults,
    onRangeSelect,
    onSelectSubtree,
    onDeselectSubtree,
    onExpandSubtree,
    onCollapseSubtree,
    onSelectByType,
    onAddToColumns,
  }), [
    schema,
    selection,
    expansion,
    searchQuery,
    focusedNodeId,
    filterValues,
    referenceData,
    policy,
    actions,
    filterPanel,
    panelWidth,
    canUndoSelection,
    canRedoSelection,
    typeFilter,
    onTypeFilterChange,
    searchMatchCount,
    selectedCount,
    totalCount,
    reductionPct,
    rawXmlSize,
    reportSize,
    payloadExplosions,
    validationWarnings,
    dataEstimate,
    onSelectSearchResults,
    onRangeSelect,
    onSelectSubtree,
    onDeselectSubtree,
    onExpandSubtree,
    onCollapseSubtree,
    onSelectByType,
    onAddToColumns,
  ]);
}

export function useRightTabsViewModel(input: RightTabsViewModelInput): RightTabsProps {
  const {
    activeTab,
    format,
    rowSource,
    groupBy,
    sortBy,
    columns,
    style,
    stylePresetKey,
    title,
    metadata,
    policyViolations,
    actions,
    templateLibrary,
    tabs,
    selectedLeaves,
    repeatingElements,
    orphanedColumns,
    selectedCount,
    slug,
    filterXml,
    xsltOutput,
    reportXml,
    filterValues,
    schema,
  } = input;

  return useMemo(() => ({
    activeTab,
    format,
    rowSource,
    groupBy,
    sortBy,
    columns,
    style,
    stylePresetKey,
    title,
    metadata,
    policyViolations,
    tabs,
    selectedLeaves,
    repeatingElements,
    orphanedColumns,
    selectedCount,
    slug,
    filterXml,
    xsltOutput,
    reportXml,
    templateLibrary,
    actions,
    filterValues,
    schema,
  }), [
    activeTab,
    format,
    rowSource,
    groupBy,
    sortBy,
    columns,
    style,
    stylePresetKey,
    title,
    metadata,
    policyViolations,
    actions,
    templateLibrary,
    tabs,
    selectedLeaves,
    repeatingElements,
    orphanedColumns,
    selectedCount,
    slug,
    filterXml,
    xsltOutput,
    reportXml,
    filterValues,
    schema,
  ]);
}
