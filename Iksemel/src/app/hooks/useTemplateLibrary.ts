import { useCallback, useMemo, useState } from "react";
import type { Dispatch } from "react";
import type { AppAction } from "@/state";
import { STANDARD_TEMPLATES, deserializeTemplate, stateToTemplate, serializeTemplate, templateToState } from "@engine/templates";
import type { TemplateSpec } from "@engine/templates";
import { diffConfigs } from "@engine/diff";
import type { ConfigDiffResult, ConfigSnapshot } from "@engine/diff";
import type { ColumnDefinition, ReportMetadata, SelectionState, SortConfig, StyleConfig, StylePresetKey } from "@/types";
import type { ExportFormat } from "@/types";

interface TemplateLibraryInput {
  readonly dispatch: Dispatch<AppAction>;
  readonly addToast: (message: string, variant?: "success" | "error" | "info") => void;
  readonly slug: string;
  readonly state: {
    readonly columns: readonly ColumnDefinition[];
    readonly selection: SelectionState;
    readonly style: StyleConfig;
    readonly metadata: ReportMetadata;
    readonly format: ExportFormat;
    readonly rowSource: string;
    readonly stylePresetKey: StylePresetKey;
    readonly groupBy: string | null;
    readonly sortBy: SortConfig | null;
  };
}

export interface TemplateLibraryResult {
  readonly allTemplates: readonly TemplateSpec[];
  readonly activeDiff: ConfigDiffResult | null;
  handleApplyTemplate(template: TemplateSpec): void;
  handleDiffAcceptAll(): void;
  handleDiffDismiss(): void;
  handleSaveAsTemplate(overrides: { name: string; description: string; category: string }): void;
  handleImportTemplate(json: string): void;
}

export function useTemplateLibrary(input: TemplateLibraryInput): TemplateLibraryResult {
  const { dispatch, addToast, slug, state } = input;
  const [customTemplates, setCustomTemplates] = useState<TemplateSpec[]>([]);
  const [activeDiff, setActiveDiff] = useState<ConfigDiffResult | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateSpec | null>(null);

  const allTemplates = useMemo(() => [...STANDARD_TEMPLATES, ...customTemplates], [customTemplates]);

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

  const handleApplyTemplate = useCallback((template: TemplateSpec) => {
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
  }, [state.columns.length, state.selection, state.style, state.metadata, currentSnapshot, dispatch, addToast]);

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

    const blob = new Blob([serializeTemplate(template)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-template.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Template saved");
  }, [state, slug, addToast]);

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

  return {
    allTemplates,
    activeDiff,
    handleApplyTemplate,
    handleDiffAcceptAll,
    handleDiffDismiss,
    handleSaveAsTemplate,
    handleImportTemplate,
  };
}
