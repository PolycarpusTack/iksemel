import { memo } from "react";
import { SchemaTree, TreeToolbar, MetricsBar, AntiPatternWarning } from "@components/tree";
import { FilterPanel } from "@components/filter";
import type { AppState } from "@/state";
import type { AppActions } from "@/app/hooks/useAppActions";
import type { FilterPanelState } from "@/app/hooks/useFilterPanelState";
import { recordRender } from "@/app/perf/perf-tracker";
import type { ValidationWarning } from "@engine/analysis";
import styles from "../../App.module.css";

interface DataEstimate {
  readonly estimatedKb: number;
  readonly source: "data" | "static";
}

export interface LeftPanelProps {
  readonly schema: AppState["schema"];
  readonly selection: AppState["selection"];
  readonly expansion: AppState["expansion"];
  readonly searchQuery: AppState["searchQuery"];
  readonly focusedNodeId: AppState["focusedNodeId"];
  readonly filterValues: AppState["filterValues"];
  readonly referenceData: AppState["referenceData"];
  readonly policy: AppState["policy"];
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
  readonly filterPanel: FilterPanelState;
  readonly actions: AppActions;
  readonly onSelectSearchResults: () => void;
}

export const LeftPanel = memo(function LeftPanel(props: LeftPanelProps) {
  recordRender("LeftPanel");
  const {
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
  } = props;

  return (
    <aside className={styles["leftPanel"]} style={{ width: panelWidth }}>
      <TreeToolbar
        searchQuery={searchQuery}
        onSearchChange={(q) => actions.setSearchQuery(q)}
        onExpandAll={() => actions.expandAll()}
        onCollapseAll={() => actions.collapseAll()}
        onSelectAll={() => actions.selectAll()}
        onClearAll={() => actions.clearAll()}
        onUndo={() => actions.undo()}
        onRedo={() => actions.redo()}
        canUndo={canUndoSelection}
        canRedo={canRedoSelection}
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
        searchMatchCount={searchMatchCount}
        onSelectSearchResults={onSelectSearchResults}
      />
      <MetricsBar
        selectedCount={selectedCount}
        totalCount={totalCount}
        reductionPct={reductionPct}
        filterCount={filterPanel.filterCount}
        rawXmlSize={rawXmlSize}
        reportSize={reportSize}
        payloadExplosions={payloadExplosions}
        validationWarnings={validationWarnings}
        dataEstimate={dataEstimate}
      />
      <AntiPatternWarning reductionPct={reductionPct} threshold={20} />
      <div className={styles["treeContainer"]}>
        <SchemaTree
          schema={schema ?? []}
          selection={selection}
          expansion={expansion}
          searchQuery={searchQuery}
          onToggleSelect={(id) => actions.toggleNode(id)}
          onToggleExpand={(id) => actions.toggleExpansion(id)}
          onFocusNode={(nodeId) => filterPanel.handleFocusNode(nodeId)}
          focusedNodeId={focusedNodeId}
          filteredNodeIds={filterPanel.filteredNodeIds}
          typeFilter={typeFilter}
        />
      </div>
      {filterPanel.focusedNode && filterPanel.focusedNode.type === "simple" && (
        <FilterPanel
          node={filterPanel.focusedNode}
          roots={schema ?? []}
          filterValues={filterValues}
          referenceData={referenceData}
          policy={policy}
          nodePath={filterPanel.focusedNodePath}
          selection={selection}
          onSetFilter={(nodeId, filter) => filterPanel.handleSetFilter(nodeId, filter)}
          onRemoveFilter={(nodeId) => filterPanel.handleRemoveFilter(nodeId)}
          onClose={() => filterPanel.handleCloseFilterPanel()}
        />
      )}
    </aside>
  );
});

(LeftPanel as { whyDidYouRender?: boolean }).whyDidYouRender = true;
