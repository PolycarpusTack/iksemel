import { Suspense, lazy, memo, type ReactNode } from "react";
import { TabContainer, HistoryPanel } from "@components/shared";
import {
  ExportDesignTab,
  ColumnConfig,
  StylePanel,
  PreviewTable,
} from "@components/export";
import { FilterSummaryTab } from "@components/filter";
import type { AppState } from "@/state";
import type { AppActions } from "@/app/hooks/useAppActions";
import type { ColumnDefinition, RepeatingElement, SelectedLeaf } from "@/types";
import type { TemplateLibraryResult } from "@/app/hooks/useTemplateLibrary";
import type { ConfigSnapshot } from "@engine/history";
import { recordRender } from "@/app/perf/perf-tracker";
import styles from "../../App.module.css";

const CodeViewerLazy = lazy(async () => {
  const mod = await import("@components/export/MonacoCodeViewer");
  return { default: mod.MonacoCodeViewer };
});

const PackageTabLazy = lazy(async () => {
  const mod = await import("@components/package/PackageTab");
  return { default: mod.PackageTab };
});

const TemplateBrowserLazy = lazy(async () => {
  const mod = await import("@components/templates/TemplateBrowser");
  return { default: mod.TemplateBrowser };
});

function TabSuspense(props: { readonly children: ReactNode }) {
  return (
    <Suspense fallback={<div className={styles["guideIntro"]}>Loading tab...</div>}>
      {props.children}
    </Suspense>
  );
}

export interface RightTabsProps {
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
  readonly tabs: readonly { readonly id: string; readonly label: string }[];
  readonly selectedLeaves: readonly SelectedLeaf[];
  readonly repeatingElements: readonly RepeatingElement[];
  readonly orphanedColumns: readonly ColumnDefinition[];
  readonly selectedCount: number;
  readonly slug: string;
  readonly filterXml: string;
  readonly xsltOutput: string;
  readonly reportXml: string;
  readonly templateLibrary: TemplateLibraryResult;
  readonly actions: AppActions;
  readonly filterValues: AppState["filterValues"];
  readonly schema: AppState["schema"];
  readonly currentSnapshot: ConfigSnapshot;
  readonly onRestoreSnapshot: (snapshot: ConfigSnapshot) => void;
}

export const RightTabs = memo(function RightTabs(props: RightTabsProps) {
  recordRender("RightTabs");
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
    currentSnapshot,
    onRestoreSnapshot,
  } = props;

  return (
    <section className={styles["rightPanel"]}>
      <TabContainer
        activeTab={activeTab}
        onTabChange={(tab) => actions.setActiveTab(tab as AppState["activeTab"])}
        tabs={tabs}
      >
        {activeTab === "design" && (
          <div className={styles["designTab"]}>
            <ExportDesignTab
              format={format}
              rowSource={rowSource}
              groupBy={groupBy}
              sortBy={sortBy}
              repeatingElements={repeatingElements}
              selectedLeaves={selectedLeaves}
              onFormatChange={(f) => actions.setFormat(f)}
              onRowSourceChange={(s) => actions.setRowSource(s)}
              onGroupByChange={(g) => actions.setGroupBy(g)}
              onSortByChange={(s) => actions.setSortBy(s)}
            />
            <ColumnConfig
              columns={columns}
              selectedLeaves={selectedLeaves}
              orphanedColumns={orphanedColumns}
              onColumnsChange={(cols: ColumnDefinition[]) => actions.setColumns(cols)}
            />
            <StylePanel
              style={style}
              stylePresetKey={stylePresetKey}
              format={format}
              onStyleChange={(s) => actions.setStyle(s)}
              onPresetChange={(k) => actions.setStylePreset(k)}
            />
            <PreviewTable
              columns={columns}
              style={style}
              groupBy={groupBy}
              title={title || metadata.name || "Export"}
            />
          </div>
        )}

        {activeTab === "xslt" && (
          <TabSuspense>
            <CodeViewerLazy
              code={xsltOutput}
              filename={`${slug}-transform.xslt`}
              language="xslt"
            />
          </TabSuspense>
        )}

        {activeTab === "filter" && (
          <TabSuspense>
            <CodeViewerLazy
              code={filterXml}
              filename={`${slug}-filter.xml`}
              language="xml"
            />
          </TabSuspense>
        )}

        {activeTab === "filters" && (
          <FilterSummaryTab
            filterValues={filterValues}
            schema={schema}
            onRemoveFilter={(nodeId) => actions.removeFilter(nodeId)}
            onClearAll={() => actions.clearFilters()}
            onFocusNode={(nodeId) => actions.focusNode(nodeId)}
          />
        )}

        {activeTab === "report" && (
          <TabSuspense>
            <CodeViewerLazy
              code={reportXml}
              filename={`${slug}-report.xml`}
              language="xml"
            />
          </TabSuspense>
        )}

        {activeTab === "package" && (
          <TabSuspense>
            <PackageTabLazy
              metadata={metadata}
              style={style}
              format={format}
              slug={slug}
              filterXml={filterXml}
              xsltOutput={xsltOutput}
              reportXml={reportXml}
              hasSelection={selectedCount > 0}
              hasColumns={columns.length > 0}
              policyViolations={policyViolations}
              onMetadataChange={(m) => actions.setMetadata(m)}
              onViewTab={(tab) => actions.setActiveTab(tab as AppState["activeTab"])}
            />
          </TabSuspense>
        )}

        {activeTab === "templates" && (
          <TabSuspense>
            <TemplateBrowserLazy
              templates={templateLibrary.allTemplates}
              onApplyTemplate={(template) => templateLibrary.handleApplyTemplate(template)}
              onSaveAsTemplate={(overrides) => templateLibrary.handleSaveAsTemplate(overrides)}
              onImportTemplate={(json) => templateLibrary.handleImportTemplate(json)}
            />
          </TabSuspense>
        )}

        {activeTab === "history" && (
          <HistoryPanel
            currentSnapshot={currentSnapshot}
            onRestore={onRestoreSnapshot}
          />
        )}

        {activeTab === "guide" && (
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
  );
});

(RightTabs as { whyDidYouRender?: boolean }).whyDidYouRender = true;
