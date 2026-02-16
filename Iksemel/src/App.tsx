import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppState, useAppDispatch } from "@/state";
import { useBridge } from "@/bridge";
import { parseXSD } from "@engine/parser";
import {
  countAll,
  countSelected,
  getSelectedLeaves,
  getRepeatingElements,
} from "@engine/selection";
import { canUndo as checkCanUndo, canRedo as checkCanRedo } from "@engine/selection/history";
import { computeReduction, estimateTotalSize, estimateSelectedSize, detectPayloadExplosions, searchSchema, validateFilterCompleteness } from "@engine/analysis";
import { estimatePayloadWithData, createDataProvider } from "@engine/data-provider";
import type { DataProvider } from "@engine/data-provider";
import { generateFilterXml } from "@engine/generation/filter-xml";
import { generateXslt } from "@engine/generation/xslt-registry";
import { generateReportDefinition } from "@engine/generation/report-definition";
import { STANDARD_TEMPLATES, deserializeTemplate, stateToTemplate, serializeTemplate, templateToState } from "@engine/templates";
import type { TemplateSpec } from "@engine/templates";
import { diffConfigs } from "@engine/diff";
import type { ConfigDiffResult, ConfigSnapshot } from "@engine/diff";

import { SchemaTree, TreeToolbar, MetricsBar, AntiPatternWarning } from "@components/tree";
import { TabContainer, SchemaUpload } from "@components/shared";
import {
  ExportDesignTab,
  ColumnConfig,
  StylePanel,
  PreviewTable,
  CodeViewer,
} from "@components/export";
import { PackageTab } from "@components/package";
import { FilterPanel } from "@components/filter";
import { TemplateBrowser } from "@components/templates";
import { DiffViewer } from "@components/diff";
import { Button } from "@components/primitives";
import { usePolicyEvaluation } from "@components/hooks/usePolicyEvaluation";
import { KeyboardShortcutOverlay } from "@components/shared/KeyboardShortcutOverlay";
import { useToast, ToastContainer } from "@components/shared/Toast";
import type { ColumnDefinition, GeneratorInput, SchemaNode, FilterValue } from "@/types";
import type { ReportDefinitionInput } from "@engine/generation/report-definition";

import styles from "./App.module.css";

const TABS = [
  { id: "design", label: "Design" },
  { id: "xslt", label: "XSLT" },
  { id: "filter", label: "Filter" },
  { id: "report", label: "Report" },
  { id: "package", label: "Package" },
  { id: "templates", label: "Templates" },
  { id: "guide", label: "Guide" },
] as const;

/**
 * Recursively finds a node by ID in a schema tree.
 */
function findNode(
  nodeId: string,
  nodes: readonly SchemaNode[],
): SchemaNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (node.children.length > 0) {
      const found = findNode(nodeId, node.children);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Finds the path (parent names) leading to a node by ID.
 */
function findNodePath(
  nodeId: string,
  nodes: readonly SchemaNode[],
  path: string[] = [],
): string[] | null {
  for (const node of nodes) {
    if (node.id === nodeId) return path;
    if (node.children.length > 0) {
      const found = findNodePath(nodeId, node.children, [...path, node.name]);
      if (found) return found;
    }
  }
  return null;
}

/** Minimum and maximum width for the left panel in pixels. */
const LEFT_PANEL_MIN = 240;
const LEFT_PANEL_MAX = 600;

export function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  // ── Data provider for cardinality-aware estimates ─────────────────────
  const dataProviderRef = useRef<DataProvider>(createDataProvider());
  const [dataEstimate, setDataEstimate] = useState<{ estimatedKb: number; source: "data" | "static" } | null>(null);

  useEffect(() => {
    if (!state.schema || Object.keys(state.selection).length === 0) {
      setDataEstimate(null);
      return;
    }
    let cancelled = false;
    estimatePayloadWithData(state.schema, state.selection, dataProviderRef.current)
      .then((result) => { if (!cancelled) setDataEstimate(result); })
      .catch(() => { if (!cancelled) setDataEstimate(null); });
    return () => { cancelled = true; };
  }, [state.schema, state.selection]);

  // ── Undo / redo availability ──────────────────────────────────────────
  const canUndoSelection = checkCanUndo(state.selectionHistory);
  const canRedoSelection = checkCanRedo(state.selectionHistory);

  // ── Keyboard shortcut overlay ─────────────────────────────────────────
  const [showShortcuts, setShowShortcuts] = useState(false);

  // ── Type filter for tree ──────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // ── Diff viewer state ─────────────────────────────────────────────────
  const [activeDiff, setActiveDiff] = useState<ConfigDiffResult | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateSpec | null>(null);

  // ── Resizable left panel ──────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem("xfeb-panel-width");
    return saved ? Math.max(LEFT_PANEL_MIN, Math.min(LEFT_PANEL_MAX, Number(saved))) : 360;
  });
  const resizing = useRef(false);
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(LEFT_PANEL_MIN, Math.min(LEFT_PANEL_MAX, startWidth + ev.clientX - startX));
      setPanelWidth(w);
    };
    const onUp = () => {
      resizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setPanelWidth((w) => { localStorage.setItem("xfeb-panel-width", String(w)); return w; });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [panelWidth]);

  // ── Global keyboard shortcuts ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      // Ctrl+Z → undo
      if (ctrl && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }
      // Ctrl+Shift+Z or Ctrl+Y → redo
      if ((ctrl && e.shiftKey && e.key === "Z") || (ctrl && e.key === "y")) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }
      // Shift+? → keyboard shortcut overlay
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  // ── beforeunload: warn when unsaved work exists ───────────────────────
  const hasSchema = state.schema !== null;
  useEffect(() => {
    if (!hasSchema) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasSchema]);

  const handleSchemaLoad = useCallback(
    (xsdText: string) => {
      const result = parseXSD(xsdText);
      dispatch({ type: "LOAD_SCHEMA", roots: result.roots, warnings: result.warnings });
    },
    [dispatch],
  );

  const totalCount = useMemo(
    () => (state.schema ? countAll(state.schema) : 0),
    [state.schema],
  );

  const selectedCount = useMemo(
    () => (state.schema ? countSelected(state.schema, state.selection) : 0),
    [state.schema, state.selection],
  );

  const reductionPct = useMemo(
    () => (state.schema ? computeReduction(state.schema, state.selection) : 0),
    [state.schema, state.selection],
  );

  const rawXmlSize = useMemo(
    () => (state.schema ? estimateTotalSize(state.schema) : 0),
    [state.schema],
  );

  const reportSize = useMemo(
    () => (state.schema ? estimateSelectedSize(state.schema, state.selection) : 0),
    [state.schema, state.selection],
  );

  const payloadExplosions = useMemo(
    () => (state.schema ? detectPayloadExplosions(state.schema, state.selection) : []),
    [state.schema, state.selection],
  );

  const searchMatchCount = useMemo(
    () => (state.schema && state.searchQuery.trim() ? searchSchema(state.schema, state.searchQuery).length : null),
    [state.schema, state.searchQuery],
  );

  const validationWarnings = useMemo(
    () => (state.schema ? validateFilterCompleteness(state.schema, state.selection) : []),
    [state.schema, state.selection],
  );

  const selectedLeaves = useMemo(
    () => (state.schema ? getSelectedLeaves(state.schema, state.selection) : []),
    [state.schema, state.selection],
  );

  const repeatingElements = useMemo(
    () => (state.schema ? getRepeatingElements(state.schema) : []),
    [state.schema],
  );

  const orphanedColumns = useMemo(() => {
    if (state.columns.length === 0 || selectedLeaves.length === 0) return [];
    const leafXpaths = new Set(selectedLeaves.map((l) => l.xpath));
    return state.columns.filter((col) => !leafXpaths.has(col.xpath));
  }, [state.columns, selectedLeaves]);

  const generatorInput = useMemo((): GeneratorInput => ({
    format: state.format,
    columns: state.columns,
    rowSource: state.rowSource,
    style: state.style,
    groupBy: state.groupBy,
    sortBy: state.sortBy,
    title: state.title || state.metadata.name || "Export",
    documentTemplate: state.documentTemplate ?? null,
  }), [state.format, state.columns, state.rowSource, state.style, state.groupBy, state.sortBy, state.title, state.metadata.name, state.documentTemplate]);

  const filterXml = useMemo(
    () => (state.schema ? generateFilterXml(state.schema, state.selection, {
      filterValues: state.filterValues,
    }) : ""),
    [state.schema, state.selection, state.filterValues],
  );

  const xsltOutput = useMemo(() => {
    if (state.columns.length === 0) return "";
    try {
      return generateXslt(generatorInput);
    } catch {
      return "<!-- Error generating XSLT -->";
    }
  }, [generatorInput, state.columns.length]);

  const reportXml = useMemo(() => {
    if (!state.metadata.name) return "";
    try {
      const input: ReportDefinitionInput = {
        metadata: state.metadata,
        columns: state.columns,
        style: state.style,
        format: state.format,
        rowSource: state.rowSource,
        groupBy: state.groupBy,
        sortBy: state.sortBy,
        filterFieldCount: selectedCount,
        totalFieldCount: totalCount,
        reductionPct,
      };
      return generateReportDefinition(input);
    } catch {
      return "<!-- Error generating report definition -->";
    }
  }, [state.metadata, state.columns, state.style, state.format, state.rowSource, state.groupBy, state.sortBy, selectedCount, totalCount, reductionPct]);

  const slug = useMemo(
    () =>
      (state.title || state.metadata.name || "export")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    [state.title, state.metadata.name],
  );

  // Policy evaluation
  usePolicyEvaluation(
    dispatch,
    state.policy,
    state.filterValues,
    state.schema,
    state.selection,
  );

  const hasPolicyErrors = state.policyViolations.some((v) => v.severity === "error");

  const { isEmbedded, sendPackageReady } = useBridge({
    dispatch,
    schema: state.schema,
    selection: state.selection,
    filterXml,
    xsltOutput,
    reportXml,
    slug,
    filterValues: state.filterValues,
    policyViolations: state.policyViolations,
  });

  // Filter panel state
  const focusedNode = useMemo(
    () => (state.focusedNodeId && state.schema ? findNode(state.focusedNodeId, state.schema) : null),
    [state.focusedNodeId, state.schema],
  );

  const focusedNodePath = useMemo(
    () => (state.focusedNodeId && state.schema ? (findNodePath(state.focusedNodeId, state.schema) ?? []) : []),
    [state.focusedNodeId, state.schema],
  );

  const filterCount = useMemo(
    () => Object.keys(state.filterValues).length,
    [state.filterValues],
  );

  const filteredNodeIds = useMemo(
    () => new Set(Object.keys(state.filterValues)),
    [state.filterValues],
  );

  const handleFocusNode = useCallback(
    (nodeId: string) => dispatch({ type: "SET_FOCUSED_NODE", nodeId }),
    [dispatch],
  );

  const handleSetFilter = useCallback(
    (nodeId: string, filter: FilterValue) => dispatch({ type: "SET_FILTER_VALUE", nodeId, filter }),
    [dispatch],
  );

  const handleRemoveFilter = useCallback(
    (nodeId: string) => dispatch({ type: "REMOVE_FILTER_VALUE", nodeId }),
    [dispatch],
  );

  const handleCloseFilterPanel = useCallback(
    () => dispatch({ type: "SET_FOCUSED_NODE", nodeId: null }),
    [dispatch],
  );

  // Template library
  const [customTemplates, setCustomTemplates] = useState<TemplateSpec[]>([]);
  const allTemplates = useMemo(
    () => [...STANDARD_TEMPLATES, ...customTemplates],
    [customTemplates],
  );

  const currentSnapshot = useMemo((): ConfigSnapshot => ({
    selection: state.selection,
    columns: state.columns as ColumnDefinition[],
    format: state.format,
    rowSource: state.rowSource,
    style: state.style,
    groupBy: state.groupBy,
    sortBy: state.sortBy,
    metadata: state.metadata,
  }), [state.selection, state.columns, state.format, state.rowSource, state.style, state.groupBy, state.sortBy, state.metadata]);

  const handleApplyTemplate = useCallback(
    (template: TemplateSpec) => {
      // If there's existing config, show diff first
      if (state.columns.length > 0 || Object.keys(state.selection).length > 0) {
        const applied = templateToState(template);
        const templateSnapshot: ConfigSnapshot = {
          selection: {},
          columns: applied.columns as ColumnDefinition[],
          format: applied.format,
          rowSource: applied.rowSource,
          style: { ...state.style, ...applied.style },
          groupBy: applied.groupBy,
          sortBy: applied.sortBy,
          metadata: { ...state.metadata, ...applied.metadata },
        };
        const result = diffConfigs(currentSnapshot, templateSnapshot);
        if (!result.isIdentical) {
          setActiveDiff(result);
          setPendingTemplate(template);
          return;
        }
      }
      dispatch({ type: "APPLY_TEMPLATE", template });
      dispatch({ type: "SET_ACTIVE_TAB", tab: "design" });
      addToast("Template applied");
    },
    [dispatch, state.columns.length, state.selection, state.style, state.metadata, currentSnapshot, addToast],
  );

  const handleDiffAcceptAll = useCallback(() => {
    if (pendingTemplate) {
      dispatch({ type: "APPLY_TEMPLATE", template: pendingTemplate });
      dispatch({ type: "SET_ACTIVE_TAB", tab: "design" });
      addToast("Template applied");
    }
    setActiveDiff(null);
    setPendingTemplate(null);
  }, [dispatch, pendingTemplate, addToast]);

  const handleDiffDismiss = useCallback(() => {
    setActiveDiff(null);
    setPendingTemplate(null);
  }, []);

  const handleSaveAsTemplate = useCallback((overrides: { name: string; description: string; category: string }) => {
    const template = stateToTemplate({
      name: overrides.name || state.metadata.name || "Untitled Template",
      description: overrides.description || state.metadata.description || "",
      category: (overrides.category || "custom") as "schedule" | "epg" | "rights" | "compliance" | "commercial" | "custom",
      author: state.metadata.author || "User",
      selection: state.selection,
      columns: state.columns,
      format: state.format,
      rowSource: state.rowSource,
      stylePreset: state.stylePresetKey,
      style: state.style,
      groupBy: state.groupBy,
      sortBy: state.sortBy,
      metadata: state.metadata,
    });
    setCustomTemplates((prev) => [...prev, template]);

    // Also trigger download
    const blob = new Blob([serializeTemplate(template)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-template.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Template saved");
  }, [state.metadata, state.selection, state.columns, state.format, state.rowSource, state.stylePresetKey, state.style, state.groupBy, state.sortBy, slug, addToast]);

  const handleImportTemplate = useCallback((json: string) => {
    try {
      const template = deserializeTemplate(json);
      setCustomTemplates((prev) => [...prev, template]);
      addToast("Template imported");
    } catch (err) {
      console.error("[XFEB] Failed to import template:", err);
      addToast("Failed to import template", "error");
    }
  }, [addToast]);

  return (
    <div className={styles["app"]}>
      <header className={styles["header"]}>
        <div className={styles["logo"]}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="18" height="18" rx="3" stroke="var(--color-accent-green)" strokeWidth="1.5" />
            <path d="M7 8h8M7 11h5M7 14h6" stroke="var(--color-accent-green)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className={styles["title"]}>XML Filter &amp; Export Builder</span>
        </div>
        <span className={styles["subtitle"]}>Schema &rarr; Filter &rarr; Transform &rarr; Package</span>
        <div className={styles["spacer"]} />
        {isEmbedded && hasSchema && (
          <Button variant="success" size="sm" onClick={sendPackageReady} disabled={hasPolicyErrors}>
            Save to WHATS&apos;ON
          </Button>
        )}
        {hasSchema && !isEmbedded && (
          <SchemaUpload onSchemaLoad={handleSchemaLoad} hasSchema={true} />
        )}
        <Button size="sm" variant="ghost" onClick={() => setShowShortcuts(true)} aria-label="Keyboard shortcuts (Shift+?)">
          ?
        </Button>
      </header>

      <main className={styles["main"]}>
        {!hasSchema ? (
          <div className={styles["uploadContainer"]}>
            {isEmbedded ? (
              <p className={styles["embeddedWaiting"]}>Waiting for schema from WHATS&apos;ON...</p>
            ) : (
              <SchemaUpload onSchemaLoad={handleSchemaLoad} hasSchema={false} />
            )}
          </div>
        ) : (
          <>
            <aside className={styles["leftPanel"]} style={{ width: panelWidth }}>
              <TreeToolbar
                searchQuery={state.searchQuery}
                onSearchChange={(q) => dispatch({ type: "SET_SEARCH_QUERY", query: q })}
                onExpandAll={() => dispatch({ type: "EXPAND_ALL" })}
                onCollapseAll={() => dispatch({ type: "COLLAPSE_ALL" })}
                onSelectAll={() => dispatch({ type: "SELECT_ALL" })}
                onClearAll={() => dispatch({ type: "CLEAR_ALL" })}
                onUndo={() => dispatch({ type: "UNDO" })}
                onRedo={() => dispatch({ type: "REDO" })}
                canUndo={canUndoSelection}
                canRedo={canRedoSelection}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                searchMatchCount={searchMatchCount}
              />
              <MetricsBar
                selectedCount={selectedCount}
                totalCount={totalCount}
                reductionPct={reductionPct}
                filterCount={filterCount}
                rawXmlSize={rawXmlSize}
                reportSize={reportSize}
                payloadExplosions={payloadExplosions}
                validationWarnings={validationWarnings}
                dataEstimate={dataEstimate}
              />
              <AntiPatternWarning
                reductionPct={reductionPct}
                threshold={20}
              />
              <div className={styles["treeContainer"]}>
                <SchemaTree
                  schema={state.schema}
                  selection={state.selection}
                  expansion={state.expansion}
                  searchQuery={state.searchQuery}
                  onToggleSelect={(id) => dispatch({ type: "TOGGLE_NODE", nodeId: id })}
                  onToggleExpand={(id) => dispatch({ type: "TOGGLE_EXPANSION", nodeId: id })}
                  onFocusNode={handleFocusNode}
                  focusedNodeId={state.focusedNodeId}
                  filteredNodeIds={filteredNodeIds}
                  typeFilter={typeFilter}
                />
              </div>
              {focusedNode && focusedNode.type === "simple" && (
                <FilterPanel
                  node={focusedNode}
                  filterValues={state.filterValues}
                  referenceData={state.referenceData}
                  policy={state.policy}
                  nodePath={focusedNodePath}
                  onSetFilter={handleSetFilter}
                  onRemoveFilter={handleRemoveFilter}
                  onClose={handleCloseFilterPanel}
                />
              )}
            </aside>

            <div
              className={styles["resizeHandle"]}
              onMouseDown={handleResizeStart}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panel"
              tabIndex={0}
            />

            <section className={styles["rightPanel"]}>
              <TabContainer
                activeTab={state.activeTab}
                onTabChange={(tab) => dispatch({ type: "SET_ACTIVE_TAB", tab: tab as typeof state.activeTab })}
                tabs={TABS}
              >
                {state.activeTab === "design" && (
                  <div className={styles["designTab"]}>
                    <ExportDesignTab
                      format={state.format}
                      rowSource={state.rowSource}
                      groupBy={state.groupBy}
                      sortBy={state.sortBy}
                      repeatingElements={repeatingElements}
                      selectedLeaves={selectedLeaves}
                      onFormatChange={(f) => dispatch({ type: "SET_FORMAT", format: f })}
                      onRowSourceChange={(s) => dispatch({ type: "SET_ROW_SOURCE", rowSource: s })}
                      onGroupByChange={(g) => dispatch({ type: "SET_GROUP_BY", groupBy: g })}
                      onSortByChange={(s) => dispatch({ type: "SET_SORT_BY", sortBy: s })}
                    />
                    <ColumnConfig
                      columns={state.columns}
                      selectedLeaves={selectedLeaves}
                      orphanedColumns={orphanedColumns}
                      onColumnsChange={(cols: ColumnDefinition[]) =>
                        dispatch({ type: "SET_COLUMNS", columns: cols })
                      }
                    />
                    <StylePanel
                      style={state.style}
                      stylePresetKey={state.stylePresetKey}
                      format={state.format}
                      onStyleChange={(s) => dispatch({ type: "SET_STYLE", style: s })}
                      onPresetChange={(k) => dispatch({ type: "SET_STYLE_PRESET", key: k })}
                    />
                    <PreviewTable
                      columns={state.columns}
                      style={state.style}
                      groupBy={state.groupBy}
                      title={state.title || state.metadata.name || "Export"}
                    />
                  </div>
                )}

                {state.activeTab === "xslt" && (
                  <CodeViewer
                    code={xsltOutput}
                    filename={`${slug}-transform.xslt`}
                    language="xslt"
                  />
                )}

                {state.activeTab === "filter" && (
                  <CodeViewer
                    code={filterXml}
                    filename={`${slug}-filter.xml`}
                    language="xml"
                  />
                )}

                {state.activeTab === "report" && (
                  <CodeViewer
                    code={reportXml}
                    filename={`${slug}-report.xml`}
                    language="xml"
                  />
                )}

                {state.activeTab === "package" && (
                  <PackageTab
                    metadata={state.metadata}
                    style={state.style}
                    format={state.format}
                    slug={slug}
                    filterXml={filterXml}
                    xsltOutput={xsltOutput}
                    reportXml={reportXml}
                    hasSelection={selectedCount > 0}
                    hasColumns={state.columns.length > 0}
                    policyViolations={state.policyViolations}
                    onMetadataChange={(m) => dispatch({ type: "SET_METADATA", metadata: m })}
                    onViewTab={(tab) => dispatch({ type: "SET_ACTIVE_TAB", tab: tab as typeof state.activeTab })}
                  />
                )}

                {state.activeTab === "templates" && (
                  <TemplateBrowser
                    templates={allTemplates}
                    onApplyTemplate={handleApplyTemplate}
                    onSaveAsTemplate={handleSaveAsTemplate}
                    onImportTemplate={handleImportTemplate}
                  />
                )}

                {state.activeTab === "guide" && (
                  <div className={styles["guideContent"]}>
                    <h2>Workflow Guide</h2>
                    <p className={styles["guideIntro"]}>
                      Build XML filter and XSLT export packages for WHATS&apos;ON in five steps:
                    </p>
                    <ol>
                      <li><strong>Load Schema</strong> — Upload an XSD file, paste XSD text, or load the demo broadcast schema.</li>
                      <li><strong>Select Fields</strong> — Check only the fields you need in the tree panel. Fewer fields means smaller payloads and faster exports.</li>
                      <li><strong>Configure Export</strong> — Choose a format (Excel, CSV, Word, HTML), configure columns, and pick a style preset in the Design tab.</li>
                      <li><strong>Review Output</strong> — Inspect the generated XSLT, Filter XML, and Report Definition in the viewer tabs.</li>
                      <li><strong>Package &amp; Download</strong> — Fill in report metadata in the Package tab, then download all three files.</li>
                    </ol>

                    <h3>Package File Structure</h3>
                    <pre className={styles["guideCode"]}>{
`${slug || "my-report"}/
  ${slug || "my-report"}-filter.xml      Filter definition
  ${slug || "my-report"}-transform.xslt  XSLT stylesheet
  ${slug || "my-report"}-report.xml      Report definition`
                    }</pre>

                    <h3>Importing into WHATS&apos;ON</h3>
                    <ol>
                      <li>Open WHATS&apos;ON Export Configuration Manager</li>
                      <li>Click &ldquo;Import Package&rdquo;</li>
                      <li>Select all three files from the downloaded package</li>
                      <li>Verify the configuration in the preview panel</li>
                      <li>Click &ldquo;Save &amp; Activate&rdquo;</li>
                    </ol>
                  </div>
                )}
              </TabContainer>
            </section>
          </>
        )}
      </main>

      {showShortcuts && (
        <KeyboardShortcutOverlay onClose={() => setShowShortcuts(false)} />
      )}

      {activeDiff && (
        <div className={styles["diffOverlay"]}>
          <div className={styles["diffModal"]}>
            <DiffViewer
              diff={activeDiff}
              onAcceptChange={() => {}}
              onAcceptAll={handleDiffAcceptAll}
              onDismiss={handleDiffDismiss}
            />
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
