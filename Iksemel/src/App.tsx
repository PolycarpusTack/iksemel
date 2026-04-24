import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/state";
import { useBridge } from "@/bridge";
import { parseXSD } from "@engine/parser";
import { canUndo as checkCanUndo, canRedo as checkCanRedo } from "@engine/selection/history";
import type { SchemaNode, ColumnDefinition } from "@/types";
import { selectByIds, selectRange, selectByType } from "@engine/selection";
import { pushRecent } from "@engine/history";
import type { ConfigSnapshot } from "@engine/history";
import { analyzeFilterEfficiency, searchSchema } from "@engine/analysis";
import type { EfficiencyScore } from "@engine/analysis";
import { SizeWarningModal } from "@components/export/SizeWarningModal";
import { usePolicyEvaluation } from "@components/hooks/usePolicyEvaluation";
import { KeyboardShortcutOverlay } from "@components/shared/KeyboardShortcutOverlay";
import { useToast, ToastContainer } from "@components/shared/Toast";
import { useDataEstimate } from "@/app/hooks/useDataEstimate";
import { useUiShortcuts, useBeforeUnloadWarning } from "@/app/hooks/useUiShortcuts";
import { useFilterPanelState } from "@/app/hooks/useFilterPanelState";
import { useTemplateLibrary } from "@/app/hooks/useTemplateLibrary";
import { useDerivedOutputsWorker } from "@/app/hooks/useDerivedOutputsWorker";
import { useResizablePanel } from "@/app/hooks/useResizablePanel";
import { useAppActions } from "@/app/hooks/useAppActions";
import { useLeftPanelViewModel, useRightTabsViewModel } from "@/app/hooks/usePanelViewModels";
import { recordPerfSample } from "@/app/perf/perf-tracker";
import { AppHeader } from "@/app/components/AppHeader";
import { LeftPanel } from "@/app/components/LeftPanel";
import { RightTabs } from "@/app/components/RightTabs";
import { DiffOverlay } from "@/app/components/DiffOverlay";
import { MainLayout } from "@/app/components/MainLayout";
import { ResizeHandle } from "@/app/components/ResizeHandle";
import { PerfPanel } from "@/app/components/PerfPanel";

import styles from "./App.module.css";

const TABS = [
  { id: "design", label: "Design" },
  { id: "xslt", label: "XSLT" },
  { id: "filter", label: "Filter" },
  { id: "filters", label: "Filters" },
  { id: "report", label: "Report" },
  { id: "package", label: "Package" },
  { id: "templates", label: "Templates" },
  { id: "history", label: "History" },
  { id: "guide", label: "Guide" },
] as const;

function collectSubtreeIds(nodeId: string, nodes: readonly SchemaNode[]): readonly string[] {
  for (const node of nodes) {
    if (node.id === nodeId) {
      const ids: string[] = [];
      const gather = (n: SchemaNode) => { ids.push(n.id); n.children.forEach(gather); };
      gather(node);
      return ids;
    }
    if (node.children.length) {
      const found = collectSubtreeIds(nodeId, node.children);
      if (found.length) return found;
    }
  }
  return [];
}

const LEFT_PANEL_MIN = 240;
const LEFT_PANEL_MAX = 600;

export function App() {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();
  const schema = useAppSelector((state) => state.schema);
  const selection = useAppSelector((state) => state.selection);
  const expansion = useAppSelector((state) => state.expansion);
  const selectionHistory = useAppSelector((state) => state.selectionHistory);
  const searchQuery = useAppSelector((state) => state.searchQuery);
  const activeTab = useAppSelector((state) => state.activeTab);
  const format = useAppSelector((state) => state.format);
  const rowSource = useAppSelector((state) => state.rowSource);
  const groupBy = useAppSelector((state) => state.groupBy);
  const sortBy = useAppSelector((state) => state.sortBy);
  const columns = useAppSelector((state) => state.columns);
  const style = useAppSelector((state) => state.style);
  const stylePresetKey = useAppSelector((state) => state.stylePresetKey);
  const title = useAppSelector((state) => state.title);
  const metadata = useAppSelector((state) => state.metadata);
  const filterValues = useAppSelector((state) => state.filterValues);
  const referenceData = useAppSelector((state) => state.referenceData);
  const policy = useAppSelector((state) => state.policy);
  const policyViolations = useAppSelector((state) => state.policyViolations);
  const focusedNodeId = useAppSelector((state) => state.focusedNodeId);
  const documentTemplate = useAppSelector((state) => state.documentTemplate);

  const dataEstimate = useDataEstimate(schema, selection);

  const canUndoSelection = checkCanUndo(selectionHistory);
  const canRedoSelection = checkCanRedo(selectionHistory);

  const { showShortcuts, setShowShortcuts } = useUiShortcuts(dispatch);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const resizablePanel = useResizablePanel({
    minWidth: LEFT_PANEL_MIN,
    maxWidth: LEFT_PANEL_MAX,
    defaultWidth: 360,
    storageKey: "xfeb-panel-width",
  });

  const hasSchema = schema !== null;
  useBeforeUnloadWarning(hasSchema);
  const actions = useAppActions(dispatch);

  const handleSchemaLoad = useCallback((xsdText: string) => {
    const result = parseXSD(xsdText);
    dispatch({ type: "LOAD_SCHEMA", roots: result.roots, warnings: result.warnings });
  }, [dispatch]);

  const {
    totalCount,
    selectedCount,
    reductionPct,
    rawXmlSize,
    reportSize,
    payloadExplosions,
    searchMatchCount,
    validationWarnings,
    selectedLeaves,
    repeatingElements,
    orphanedColumns,
    filterXml,
    xsltOutput,
    reportXml,
    slug,
    perf,
  } = useDerivedOutputsWorker({
    schema,
    selection,
    searchQuery,
    columns,
    format,
    rowSource,
    style,
    groupBy,
    sortBy,
    title,
    metadata,
    documentTemplate,
    filterValues,
  });

  useEffect(() => {
    recordPerfSample(perf);
  }, [perf]);

  usePolicyEvaluation(
    dispatch,
    policy,
    filterValues,
    schema,
    selection,
  );

  const hasPolicyErrors = policyViolations.some((v) => v.severity === "error");
  const showPerfPanel = import.meta.env.DEV && import.meta.env.VITE_PERF_PANEL === "true";

  const { isEmbedded, sendPackageReady } = useBridge({
    dispatch,
    schema,
    selection,
    filterXml,
    xsltOutput,
    reportXml,
    slug,
    filterValues,
    policyViolations,
  });

  const filterPanel = useFilterPanelState({
    schema,
    focusedNodeId,
    filterValues,
    dispatch,
  });

  const templateLibrary = useTemplateLibrary({
    dispatch,
    addToast,
    slug,
    state: {
      columns,
      selection,
      style,
      metadata,
      format,
      rowSource,
      stylePresetKey,
      groupBy,
      sortBy,
    },
  });

  const efficiencyScore = useMemo<EfficiencyScore | null>(
    () => schema ? analyzeFilterEfficiency(schema, selection) : null,
    [schema, selection],
  );

  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [pendingExport, setPendingExport] = useState<(() => void) | null>(null);

  const handleRangeSelect = useCallback((nodeIds: readonly string[]) => {
    if (!schema) return;
    const newSel = selectRange(nodeIds, schema, selection);
    dispatch({ type: "SET_SELECTION", selection: newSel });
  }, [schema, selection, dispatch]);

  const handleSelectSearchResults = useCallback(() => {
    if (!schema || !searchQuery.trim()) return;
    const results = searchSchema(schema, searchQuery);
    const ids = results.map((r) => r.node.id);
    const newSel = selectByIds(ids, schema, selection);
    dispatch({ type: "SET_SELECTION", selection: newSel });
  }, [schema, searchQuery, selection, dispatch]);

  const handleSelectSubtree = useCallback((nodeId: string) => {
    if (!schema) return;
    const ids = collectSubtreeIds(nodeId, schema);
    if (!ids.length) return;
    dispatch({ type: "SET_SELECTION", selection: selectByIds(ids, schema, selection) });
  }, [schema, selection, dispatch]);

  const handleDeselectSubtree = useCallback((nodeId: string) => {
    if (!schema) return;
    const ids = collectSubtreeIds(nodeId, schema);
    if (!ids.length) return;
    const next = { ...selection } as Record<string, boolean | undefined>;
    for (const id of ids) { delete next[id]; }
    dispatch({ type: "SET_SELECTION", selection: next });
  }, [schema, selection, dispatch]);

  const handleExpandSubtree = useCallback((nodeId: string) => {
    if (!schema) return;
    const ids = collectSubtreeIds(nodeId, schema);
    if (!ids.length) return;
    const next = { ...expansion } as Record<string, boolean>;
    for (const id of ids) { next[id] = true; }
    dispatch({ type: "SET_EXPANSION", expansion: next });
  }, [schema, expansion, dispatch]);

  const handleCollapseSubtree = useCallback((nodeId: string) => {
    if (!schema) return;
    const ids = collectSubtreeIds(nodeId, schema);
    if (!ids.length) return;
    const next = { ...expansion } as Record<string, boolean>;
    for (const id of ids) { delete next[id]; }
    dispatch({ type: "SET_EXPANSION", expansion: next });
  }, [schema, expansion, dispatch]);

  const handleSelectByType = useCallback((typeName: string) => {
    if (!schema) return;
    dispatch({ type: "SET_SELECTION", selection: selectByType(typeName, schema, selection) });
  }, [schema, selection, dispatch]);

  const handleAddToColumns = useCallback((nodeId: string) => {
    if (columns.some((c) => c.id === nodeId)) return;
    const leaf = selectedLeaves.find((l) => l.id === nodeId);
    if (!leaf) return;
    const newCol: ColumnDefinition = {
      id: leaf.id,
      xpath: leaf.xpath,
      header: leaf.name,
      format: "auto",
      align: "left",
      width: 120,
      fullPath: leaf.path.join("/"),
    };
    actions.setColumns([...columns, newCol]);
  }, [columns, selectedLeaves, actions]);

  const currentSnapshot = useMemo<ConfigSnapshot>(() => ({
    selection,
    filterValues,
    columns,
    format,
    timestamp: Date.now(),
  }), [selection, filterValues, columns, format]);

  const handleRestoreSnapshot = useCallback((snapshot: ConfigSnapshot) => {
    dispatch({ type: "RESTORE_SNAPSHOT", selection: snapshot.selection, filterValues: snapshot.filterValues, columns: snapshot.columns, format: snapshot.format });
  }, [dispatch]);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!schema) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      pushRecent({ selection, filterValues, columns, format, timestamp: Date.now() });
    }, 2000);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [selection, schema, filterValues, columns, format]);

  const leftPanelViewModel = useLeftPanelViewModel({
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
    panelWidth: resizablePanel.panelWidth,
    canUndoSelection,
    canRedoSelection,
    typeFilter,
    onTypeFilterChange: setTypeFilter,
    searchMatchCount,
    selectedCount,
    totalCount,
    reductionPct,
    rawXmlSize,
    reportSize,
    payloadExplosions,
    validationWarnings,
    dataEstimate,
    onSelectSearchResults: handleSelectSearchResults,
    onRangeSelect: handleRangeSelect,
    onSelectSubtree: handleSelectSubtree,
    onDeselectSubtree: handleDeselectSubtree,
    onExpandSubtree: handleExpandSubtree,
    onCollapseSubtree: handleCollapseSubtree,
    onSelectByType: handleSelectByType,
    onAddToColumns: handleAddToColumns,
  });

  const rightTabsViewModel = useRightTabsViewModel({
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
    tabs: TABS,
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
    currentSnapshot,
    onRestoreSnapshot: handleRestoreSnapshot,
  });

  const handleExportWithWarning = useCallback((exportFn: () => void) => {
    const SIZE_WARNING_THRESHOLD = 50 * 1024 * 1024; // 50 MB
    if (reportSize >= SIZE_WARNING_THRESHOLD) {
      setPendingExport(() => exportFn);
      setShowSizeWarning(true);
    } else {
      exportFn();
    }
  }, [reportSize]);

  const handleProceedWithExport = useCallback(() => {
    setShowSizeWarning(false);
    if (pendingExport) {
      pendingExport();
      setPendingExport(null);
    }
  }, [pendingExport]);

  const handleCancelExport = useCallback(() => {
    setShowSizeWarning(false);
    setPendingExport(null);
  }, []);

  const handleOptimizeExport = useCallback(() => {
    setShowSizeWarning(false);
    setPendingExport(null);
    dispatch({ type: "SET_ACTIVE_TAB", tab: "filter" });
  }, [dispatch]);

  return (
    <div className={styles["app"]}>
      <AppHeader
        isEmbedded={isEmbedded}
        hasSchema={hasSchema}
        hasPolicyErrors={hasPolicyErrors}
        onSendPackageReady={sendPackageReady}
        onSchemaLoad={handleSchemaLoad}
        onShowShortcuts={() => setShowShortcuts(true)}
      />

      <MainLayout
        hasSchema={hasSchema}
        isEmbedded={isEmbedded}
        onSchemaLoad={handleSchemaLoad}
      >
        <>
          <LeftPanel {...leftPanelViewModel} />

          <ResizeHandle
            className={styles["resizeHandle"] ?? ""}
            minWidth={LEFT_PANEL_MIN}
            maxWidth={LEFT_PANEL_MAX}
            width={resizablePanel.panelWidth}
            onMouseDown={(event) => resizablePanel.handleResizeStart(event)}
            onKeyDown={(event) => resizablePanel.handleResizeKeyDown(event)}
          />

          <RightTabs {...rightTabsViewModel} />
        </>
      </MainLayout>

      {showShortcuts && (
        <KeyboardShortcutOverlay onClose={() => setShowShortcuts(false)} />
      )}

      <DiffOverlay
        diff={templateLibrary.activeDiff}
        onAcceptAll={() => templateLibrary.handleDiffAcceptAll()}
        onDismiss={() => templateLibrary.handleDiffDismiss()}
      />

      {showSizeWarning && (
        <SizeWarningModal
          estimatedSize={reportSize}
          efficiencyScore={efficiencyScore}
          onProceed={handleProceedWithExport}
          onCancel={handleCancelExport}
          onOptimize={handleOptimizeExport}
        />
      )}

      {showPerfPanel && (
        <PerfPanel
          slug={slug}
          filterXml={filterXml}
          xsltOutput={xsltOutput}
          reportXml={reportXml}
        />
      )}

      <ToastContainer />
    </div>
  );
}
