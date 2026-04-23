import { useCallback, useMemo } from "react";
import type { Dispatch } from "react";
import type { AppAction, AppState } from "@/state";
import type { ColumnDefinition, ExportFormat, SortConfig, StyleConfig, StylePresetKey } from "@/types";

export interface AppActions {
  setSearchQuery(query: string): void;
  expandAll(): void;
  collapseAll(): void;
  selectAll(): void;
  clearAll(): void;
  undo(): void;
  redo(): void;
  toggleNode(nodeId: string): void;
  toggleExpansion(nodeId: string): void;
  setActiveTab(tab: AppState["activeTab"]): void;
  setFormat(format: ExportFormat): void;
  setRowSource(rowSource: string): void;
  setGroupBy(groupBy: string | null): void;
  setSortBy(sortBy: SortConfig | null): void;
  setColumns(columns: readonly ColumnDefinition[]): void;
  setStyle(style: Partial<StyleConfig>): void;
  setStylePreset(key: StylePresetKey): void;
  setMetadata(metadata: Partial<AppState["metadata"]>): void;
}

export function useAppActions(dispatch: Dispatch<AppAction>): AppActions {
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: "SET_SEARCH_QUERY", query });
  }, [dispatch]);

  const expandAll = useCallback(() => {
    dispatch({ type: "EXPAND_ALL" });
  }, [dispatch]);

  const collapseAll = useCallback(() => {
    dispatch({ type: "COLLAPSE_ALL" });
  }, [dispatch]);

  const selectAll = useCallback(() => {
    dispatch({ type: "SELECT_ALL" });
  }, [dispatch]);

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
  }, [dispatch]);

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, [dispatch]);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, [dispatch]);

  const toggleNode = useCallback((nodeId: string) => {
    dispatch({ type: "TOGGLE_NODE", nodeId });
  }, [dispatch]);

  const toggleExpansion = useCallback((nodeId: string) => {
    dispatch({ type: "TOGGLE_EXPANSION", nodeId });
  }, [dispatch]);

  const setActiveTab = useCallback((tab: AppState["activeTab"]) => {
    dispatch({ type: "SET_ACTIVE_TAB", tab });
  }, [dispatch]);

  const setFormat = useCallback((format: ExportFormat) => {
    dispatch({ type: "SET_FORMAT", format });
  }, [dispatch]);

  const setRowSource = useCallback((rowSource: string) => {
    dispatch({ type: "SET_ROW_SOURCE", rowSource });
  }, [dispatch]);

  const setGroupBy = useCallback((groupBy: string | null) => {
    dispatch({ type: "SET_GROUP_BY", groupBy });
  }, [dispatch]);

  const setSortBy = useCallback((sortBy: SortConfig | null) => {
    dispatch({ type: "SET_SORT_BY", sortBy });
  }, [dispatch]);

  const setColumns = useCallback((columns: readonly ColumnDefinition[]) => {
    dispatch({ type: "SET_COLUMNS", columns });
  }, [dispatch]);

  const setStyle = useCallback((style: Partial<StyleConfig>) => {
    dispatch({ type: "SET_STYLE", style });
  }, [dispatch]);

  const setStylePreset = useCallback((key: StylePresetKey) => {
    dispatch({ type: "SET_STYLE_PRESET", key });
  }, [dispatch]);

  const setMetadata = useCallback((metadata: Partial<AppState["metadata"]>) => {
    dispatch({ type: "SET_METADATA", metadata });
  }, [dispatch]);

  return useMemo(() => ({
    setSearchQuery,
    expandAll,
    collapseAll,
    selectAll,
    clearAll,
    undo,
    redo,
    toggleNode,
    toggleExpansion,
    setActiveTab,
    setFormat,
    setRowSource,
    setGroupBy,
    setSortBy,
    setColumns,
    setStyle,
    setStylePreset,
    setMetadata,
  }), [
    setSearchQuery,
    expandAll,
    collapseAll,
    selectAll,
    clearAll,
    undo,
    redo,
    toggleNode,
    toggleExpansion,
    setActiveTab,
    setFormat,
    setRowSource,
    setGroupBy,
    setSortBy,
    setColumns,
    setStyle,
    setStylePreset,
    setMetadata,
  ]);
}
