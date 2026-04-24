import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { INITIAL_STATE } from "@/state";
import { useLeftPanelViewModel, useRightTabsViewModel } from "./usePanelViewModels";

function createActions() {
  return {
    setSearchQuery: vi.fn(),
    expandAll: vi.fn(),
    collapseAll: vi.fn(),
    selectAll: vi.fn(),
    clearAll: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    toggleNode: vi.fn(),
    toggleExpansion: vi.fn(),
    setActiveTab: vi.fn(),
    setFormat: vi.fn(),
    setRowSource: vi.fn(),
    setGroupBy: vi.fn(),
    setSortBy: vi.fn(),
    setColumns: vi.fn(),
    setStyle: vi.fn(),
    setStylePreset: vi.fn(),
    setMetadata: vi.fn(),
    removeFilter: vi.fn(),
    clearFilters: vi.fn(),
    focusNode: vi.fn(),
  };
}

function createFilterPanelState() {
  return {
    focusedNode: null,
    focusedNodePath: [],
    focusedBreadcrumb: [],
    filterCount: 0,
    filteredNodeIds: new Set<string>(),
    handleFocusNode: vi.fn(),
    handleSetFilter: vi.fn(),
    handleRemoveFilter: vi.fn(),
    handleCloseFilterPanel: vi.fn(),
  };
}

function createTemplateLibrary() {
  return {
    allTemplates: [],
    activeDiff: null,
    handleApplyTemplate: vi.fn(),
    handleDiffAcceptAll: vi.fn(),
    handleDiffDismiss: vi.fn(),
    handleSaveAsTemplate: vi.fn(),
    handleImportTemplate: vi.fn(),
  };
}

describe("usePanelViewModels", () => {
  it("memoizes left panel view model until relevant deps change", () => {
    const actions = createActions();
    const filterPanel = createFilterPanelState();
    const payloadExplosions: Parameters<typeof useLeftPanelViewModel>[0]["payloadExplosions"] = [];
    const validationWarnings: Parameters<typeof useLeftPanelViewModel>[0]["validationWarnings"] = [];
    const input: Parameters<typeof useLeftPanelViewModel>[0] = {
      schema: INITIAL_STATE.schema,
      selection: INITIAL_STATE.selection,
      expansion: INITIAL_STATE.expansion,
      searchQuery: INITIAL_STATE.searchQuery,
      focusedNodeId: INITIAL_STATE.focusedNodeId,
      filterValues: INITIAL_STATE.filterValues,
      referenceData: INITIAL_STATE.referenceData,
      policy: INITIAL_STATE.policy,
      actions,
      filterPanel,
      panelWidth: 360,
      canUndoSelection: false,
      canRedoSelection: false,
      typeFilter: null,
      onTypeFilterChange: vi.fn(),
      searchMatchCount: null,
      selectedCount: 0,
      totalCount: 0,
      reductionPct: 0,
      rawXmlSize: 0,
      reportSize: 0,
      payloadExplosions,
      validationWarnings,
      dataEstimate: null,
      onSelectSearchResults: vi.fn(),
      onRangeSelect: vi.fn(),
      onSelectSubtree: vi.fn(),
      onDeselectSubtree: vi.fn(),
      onExpandSubtree: vi.fn(),
      onCollapseSubtree: vi.fn(),
      onSelectByType: vi.fn(),
      onAddToColumns: vi.fn(),
    };

    const { result, rerender } = renderHook(
      (props: Parameters<typeof useLeftPanelViewModel>[0]) => useLeftPanelViewModel(props),
      { initialProps: input },
    );
    const first = result.current;

    rerender({ ...input });
    expect(result.current).toBe(first);

    rerender({ ...input, selectedCount: 1 });
    expect(result.current).not.toBe(first);
    expect(result.current.selectedCount).toBe(1);
  });

  it("memoizes right tabs view model until relevant deps change", () => {
    const actions = createActions();
    const templateLibrary = createTemplateLibrary();
    const input: Parameters<typeof useRightTabsViewModel>[0] = {
      activeTab: INITIAL_STATE.activeTab,
      format: INITIAL_STATE.format,
      rowSource: INITIAL_STATE.rowSource,
      groupBy: INITIAL_STATE.groupBy,
      sortBy: INITIAL_STATE.sortBy,
      columns: INITIAL_STATE.columns,
      style: INITIAL_STATE.style,
      stylePresetKey: INITIAL_STATE.stylePresetKey,
      title: INITIAL_STATE.title,
      metadata: INITIAL_STATE.metadata,
      policyViolations: INITIAL_STATE.policyViolations,
      actions,
      templateLibrary,
      tabs: [{ id: "design", label: "Design" }],
      selectedLeaves: [],
      repeatingElements: [],
      orphanedColumns: [],
      selectedCount: 0,
      slug: "test",
      filterXml: "<filter/>",
      xsltOutput: "<xsl:stylesheet/>",
      reportXml: "<report/>",
      filterValues: INITIAL_STATE.filterValues,
      schema: INITIAL_STATE.schema,
    };

    const { result, rerender } = renderHook(
      (props: Parameters<typeof useRightTabsViewModel>[0]) => useRightTabsViewModel(props),
      { initialProps: input },
    );
    const first = result.current;

    rerender({ ...input });
    expect(result.current).toBe(first);

    rerender({ ...input, activeTab: "xslt" });
    expect(result.current).not.toBe(first);
    expect(result.current.activeTab).toBe("xslt");
  });
});
