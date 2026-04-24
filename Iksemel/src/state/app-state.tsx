/* eslint-disable react-refresh/only-export-components */
/**
 * Application state management for XFEB.
 *
 * Provides a React context-based store using useReducer for predictable,
 * centralised state management. All state transitions flow through
 * a single discriminated-union action type and a pure reducer function.
 *
 * Usage:
 *   Wrap the app in <AppProvider> and consume via useAppSelector() / useAppDispatch().
 */

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useSyncExternalStore,
  useCallback,
  type Dispatch,
  type ReactNode,
} from "react";

import type {
  SchemaNode,
  ParseWarning,
  SelectionState,
  ExpansionState,
  ExportFormat,
  ColumnDefinition,
  SortConfig,
  StyleConfig,
  StylePresetKey,
  ReportMetadata,
  FilterValuesState,
  FilterValue,
  ReferenceData,
  ReferenceDataEntry,
  PolicyRule,
  PolicyViolation,
  DocumentTemplate,
} from "@/types";

import {
  toggleNode,
  selectAll,
  clearAll,
} from "@engine/selection/state";

import {
  createHistory,
  pushState,
  undo,
  redo,
} from "@engine/selection/history";
import type { SelectionHistory } from "@engine/selection/history";

import { STYLE_PRESETS } from "./style-presets";
import { templateToState } from "@engine/templates/template-serializer";
import type { TemplateSpec } from "@engine/templates/types";

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

/**
 * Complete application state shape.
 *
 * All properties are readonly to enforce immutable updates through the reducer.
 */
export interface AppState {
  // Schema
  readonly schema: readonly SchemaNode[] | null;
  readonly parseWarnings: readonly ParseWarning[];

  // Selection
  readonly selection: SelectionState;
  readonly expansion: ExpansionState;
  readonly selectionHistory: SelectionHistory;

  // Export config
  readonly format: ExportFormat;
  readonly columns: readonly ColumnDefinition[];
  readonly rowSource: string;
  readonly groupBy: string | null;
  readonly sortBy: SortConfig | null;
  readonly title: string;

  // Style
  readonly style: StyleConfig;
  readonly stylePresetKey: StylePresetKey;

  // Metadata
  readonly metadata: ReportMetadata;

  // Filter values
  readonly filterValues: FilterValuesState;

  // Reference data (channels, genres, etc. — from WHATS'ON)
  readonly referenceData: ReferenceData | null;

  // Document template (for native format generation)
  readonly documentTemplate: DocumentTemplate | null;

  // Policy
  readonly policy: readonly PolicyRule[];
  readonly policyViolations: readonly PolicyViolation[];

  // UI
  readonly activeTab: "design" | "xslt" | "filter" | "filters" | "report" | "package" | "templates" | "guide";
  readonly searchQuery: string;
  readonly focusedNodeId: string | null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Discriminated union of all actions the app reducer can handle.
 */
export type AppAction =
  | { readonly type: "LOAD_SCHEMA"; readonly roots: readonly SchemaNode[]; readonly warnings: readonly ParseWarning[] }
  | { readonly type: "SET_SELECTION"; readonly selection: SelectionState }
  | { readonly type: "TOGGLE_NODE"; readonly nodeId: string }
  | { readonly type: "SELECT_ALL" }
  | { readonly type: "CLEAR_ALL" }
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }
  | { readonly type: "SET_EXPANSION"; readonly expansion: ExpansionState }
  | { readonly type: "TOGGLE_EXPANSION"; readonly nodeId: string }
  | { readonly type: "EXPAND_ALL" }
  | { readonly type: "COLLAPSE_ALL" }
  | { readonly type: "SET_FORMAT"; readonly format: ExportFormat }
  | { readonly type: "SET_COLUMNS"; readonly columns: readonly ColumnDefinition[] }
  | { readonly type: "SET_ROW_SOURCE"; readonly rowSource: string }
  | { readonly type: "SET_GROUP_BY"; readonly groupBy: string | null }
  | { readonly type: "SET_SORT_BY"; readonly sortBy: SortConfig | null }
  | { readonly type: "SET_TITLE"; readonly title: string }
  | { readonly type: "SET_STYLE"; readonly style: Partial<StyleConfig> }
  | { readonly type: "SET_STYLE_PRESET"; readonly key: StylePresetKey }
  | { readonly type: "SET_METADATA"; readonly metadata: Partial<ReportMetadata> }
  | { readonly type: "SET_ACTIVE_TAB"; readonly tab: AppState["activeTab"] }
  | { readonly type: "SET_SEARCH_QUERY"; readonly query: string }
  | { readonly type: "LOAD_CONFIG"; readonly format: ExportFormat; readonly columns: readonly ColumnDefinition[]; readonly rowSource: string; readonly groupBy: string | null; readonly sortBy: SortConfig | null; readonly style?: Partial<StyleConfig>; readonly metadata: Partial<ReportMetadata>; readonly filterValues?: FilterValuesState }
  | { readonly type: "APPLY_TEMPLATE"; readonly template: TemplateSpec }
  | { readonly type: "SET_FILTER_VALUE"; readonly nodeId: string; readonly filter: FilterValue }
  | { readonly type: "REMOVE_FILTER_VALUE"; readonly nodeId: string }
  | { readonly type: "CLEAR_ALL_FILTERS" }
  | { readonly type: "LOAD_REFERENCE_DATA"; readonly entries: readonly ReferenceDataEntry[] }
  | { readonly type: "LOAD_POLICY"; readonly rules: readonly PolicyRule[] }
  | { readonly type: "SET_POLICY_VIOLATIONS"; readonly violations: readonly PolicyViolation[] }
  | { readonly type: "SET_FOCUSED_NODE"; readonly nodeId: string | null }
  | { readonly type: "SET_DOCUMENT_TEMPLATE"; readonly template: DocumentTemplate | null }
  | { readonly type: "CLEAR_DOCUMENT_TEMPLATE" }
  | { readonly type: "RESET" };

// ---------------------------------------------------------------------------
// Default / initial state
// ---------------------------------------------------------------------------

const DEFAULT_PRESET_KEY: StylePresetKey = "corporate";
const DEFAULT_PRESET = STYLE_PRESETS[DEFAULT_PRESET_KEY];

const DEFAULT_STYLE: StyleConfig = {
  ...DEFAULT_PRESET,
  showTitle: true,
  showFooter: true,
  autoFilter: true,
  orientation: "landscape",
  delimiter: ",",
  quoteChar: '"',
  margins: "1cm",
};

const DEFAULT_METADATA: ReportMetadata = {
  name: "",
  description: "",
  version: "1.0.0",
  author: "",
  category: "",
  tags: [],
  scheduleEnabled: false,
  scheduleCron: "",
  scheduleDescription: "",
  outputPath: "",
  emailRecipients: "",
  overwrite: false,
  xsltProcessor: "Saxon-HE",
  stylePreset: DEFAULT_PRESET_KEY,
};

/**
 * The initial application state used when no prior state exists.
 */
export const INITIAL_STATE: AppState = {
  // Schema
  schema: null,
  parseWarnings: [],

  // Selection
  selection: {},
  expansion: {},
  selectionHistory: createHistory({}),

  // Export config
  format: "xlsx",
  columns: [],
  rowSource: "",
  groupBy: null,
  sortBy: null,
  title: "",

  // Style
  style: DEFAULT_STYLE,
  stylePresetKey: DEFAULT_PRESET_KEY,

  // Metadata
  metadata: DEFAULT_METADATA,

  // Filter values
  filterValues: {},

  // Document template
  documentTemplate: null,

  // Reference data
  referenceData: null,

  // Policy
  policy: [],
  policyViolations: [],

  // UI
  activeTab: "design",
  searchQuery: "",
  focusedNodeId: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collects all node IDs from a schema tree.
 * Used by EXPAND_ALL / COLLAPSE_ALL to build expansion state.
 */
function collectAllNodeIds(nodes: readonly SchemaNode[]): ExpansionState {
  const result: Record<string, boolean> = {};
  function walk(items: readonly SchemaNode[]): void {
    for (const node of items) {
      if (node.children.length > 0) {
        result[node.id] = true;
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return result;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Pure reducer function for all application state transitions.
 *
 * Each case returns a new state object; the previous state is never mutated.
 * Complexity is inherently high for reducers with many action types.
 */
// eslint-disable-next-line complexity
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // ----- Schema -----

    case "LOAD_SCHEMA": {
      const freshSelection: SelectionState = {};
      return {
        ...INITIAL_STATE,
        schema: action.roots,
        parseWarnings: action.warnings,
        selection: freshSelection,
        selectionHistory: createHistory(freshSelection),
        // Preserve fields that may arrive before the schema via bridge messages
        referenceData: state.referenceData,
        policy: state.policy,
        documentTemplate: state.documentTemplate,
      };
    }

    // ----- Selection -----

    case "SET_SELECTION": {
      return {
        ...state,
        selection: action.selection,
        selectionHistory: pushState(state.selectionHistory, action.selection),
      };
    }

    case "TOGGLE_NODE": {
      if (!state.schema) return state;

      // Find the target node in the tree
      const target = findNode(action.nodeId, state.schema);
      if (!target) return state;

      const newSelection = toggleNode(target, state.schema, state.selection);
      return {
        ...state,
        selection: newSelection,
        selectionHistory: pushState(state.selectionHistory, newSelection),
      };
    }

    case "SELECT_ALL": {
      if (!state.schema) return state;

      const newSelection = selectAll(state.schema);
      return {
        ...state,
        selection: newSelection,
        selectionHistory: pushState(state.selectionHistory, newSelection),
      };
    }

    case "CLEAR_ALL": {
      const newSelection = clearAll();
      return {
        ...state,
        selection: newSelection,
        selectionHistory: pushState(state.selectionHistory, newSelection),
      };
    }

    case "UNDO": {
      const newHistory = undo(state.selectionHistory);
      return {
        ...state,
        selection: newHistory.present,
        selectionHistory: newHistory,
      };
    }

    case "REDO": {
      const newHistory = redo(state.selectionHistory);
      return {
        ...state,
        selection: newHistory.present,
        selectionHistory: newHistory,
      };
    }

    // ----- Expansion -----

    case "SET_EXPANSION":
      return { ...state, expansion: action.expansion };

    case "TOGGLE_EXPANSION": {
      const current = state.expansion[action.nodeId] ?? false;
      return {
        ...state,
        expansion: { ...state.expansion, [action.nodeId]: !current },
      };
    }

    case "EXPAND_ALL": {
      if (!state.schema) return state;
      return { ...state, expansion: collectAllNodeIds(state.schema) };
    }

    case "COLLAPSE_ALL":
      return { ...state, expansion: {} };

    // ----- Export config -----

    case "SET_FORMAT":
      return { ...state, format: action.format };

    case "SET_COLUMNS":
      return { ...state, columns: action.columns };

    case "SET_ROW_SOURCE":
      return { ...state, rowSource: action.rowSource };

    case "SET_GROUP_BY":
      return { ...state, groupBy: action.groupBy };

    case "SET_SORT_BY":
      return { ...state, sortBy: action.sortBy };

    case "SET_TITLE":
      return { ...state, title: action.title };

    // ----- Style -----

    case "SET_STYLE":
      return {
        ...state,
        style: { ...state.style, ...action.style },
      };

    case "SET_STYLE_PRESET": {
      const preset = STYLE_PRESETS[action.key];
      return {
        ...state,
        stylePresetKey: action.key,
        style: { ...state.style, ...preset },
        metadata: { ...state.metadata, stylePreset: action.key },
      };
    }

    // ----- Metadata -----

    case "SET_METADATA":
      return {
        ...state,
        metadata: { ...state.metadata, ...action.metadata },
      };

    // ----- UI -----

    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.tab };

    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.query };

    // ----- Bulk config load (bridge import) -----

    case "LOAD_CONFIG": {
      return {
        ...state,
        format: action.format,
        columns: action.columns,
        rowSource: action.rowSource,
        groupBy: action.groupBy,
        sortBy: action.sortBy,
        ...(action.style ? { style: { ...state.style, ...action.style } } : {}),
        metadata: { ...state.metadata, ...action.metadata },
        ...(action.filterValues ? { filterValues: action.filterValues } : {}),
      };
    }

    // ----- Templates -----

    case "APPLY_TEMPLATE": {
      const applied = templateToState(action.template);
      const presetKey = (applied.stylePresetKey in STYLE_PRESETS
        ? applied.stylePresetKey
        : DEFAULT_PRESET_KEY) as StylePresetKey;
      const presetStyle = STYLE_PRESETS[presetKey];
      return {
        ...state,
        columns: applied.columns,
        format: applied.format,
        rowSource: applied.rowSource,
        groupBy: applied.groupBy,
        sortBy: applied.sortBy,
        stylePresetKey: presetKey,
        style: { ...state.style, ...presetStyle, ...applied.style },
        metadata: { ...state.metadata, ...applied.metadata },
      };
    }

    // ----- Filter values -----

    case "SET_FILTER_VALUE":
      return {
        ...state,
        filterValues: { ...state.filterValues, [action.nodeId]: action.filter },
      };

    case "REMOVE_FILTER_VALUE": {
      const { [action.nodeId]: _, ...rest } = state.filterValues;
      return { ...state, filterValues: rest };
    }

    case "CLEAR_ALL_FILTERS":
      return { ...state, filterValues: {} };

    // ----- Reference data & policy -----

    case "LOAD_REFERENCE_DATA": {
      const rd: Record<string, ReferenceDataEntry> = {};
      for (const entry of action.entries) {
        rd[entry.xpath] = entry;
      }
      return { ...state, referenceData: rd };
    }

    case "LOAD_POLICY":
      return { ...state, policy: action.rules };

    case "SET_POLICY_VIOLATIONS":
      return { ...state, policyViolations: action.violations };

    // ----- Document template -----

    case "SET_DOCUMENT_TEMPLATE":
      return { ...state, documentTemplate: action.template };

    case "CLEAR_DOCUMENT_TEMPLATE":
      return { ...state, documentTemplate: null };

    // ----- Focused node -----

    case "SET_FOCUSED_NODE":
      return { ...state, focusedNodeId: action.nodeId };

    // ----- Reset -----

    case "RESET":
      return { ...INITIAL_STATE };
  }
}

// ---------------------------------------------------------------------------
// Tree node lookup helper
// ---------------------------------------------------------------------------

/**
 * Recursively searches for a node by ID in a schema tree.
 * Returns the node if found, or undefined otherwise.
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

// ---------------------------------------------------------------------------
// React context
// ---------------------------------------------------------------------------

const AppStateContext = createContext<AppState | null>(null);
const AppDispatchContext = createContext<Dispatch<AppAction> | null>(null);

interface AppStore {
  getState(): AppState;
  subscribe(listener: () => void): () => void;
}

const AppStoreContext = createContext<AppStore | null>(null);

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

interface AppProviderProps {
  readonly children: ReactNode;
  /** Optional initial state override (useful for testing). */
  readonly initialState?: AppState;
}

const STORAGE_KEY = "xfeb-session";
const SAVE_DEBOUNCE_MS = 1000;

/**
 * Attempts to restore a saved session from localStorage.
 * Returns the restored state or null if none exists / parsing fails.
 */
function restoreSession(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    // Basic validity check: must have a schema to be useful
    if (!parsed.schema) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Saves serializable parts of state to localStorage.
 * Omits selectionHistory (large, reconstructable) and referenceData (bridge-supplied).
 */
function saveSession(state: AppState): void {
  if (!state.schema) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  try {
    const serializable = {
      schema: state.schema,
      parseWarnings: state.parseWarnings,
      selection: state.selection,
      expansion: state.expansion,
      format: state.format,
      columns: state.columns,
      rowSource: state.rowSource,
      groupBy: state.groupBy,
      sortBy: state.sortBy,
      title: state.title,
      style: state.style,
      stylePresetKey: state.stylePresetKey,
      metadata: state.metadata,
      filterValues: state.filterValues,
      activeTab: state.activeTab,
      searchQuery: state.searchQuery,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/**
 * Provides application state and dispatch to the component tree.
 *
 * @example
 * ```tsx
 * <AppProvider>
 *   <App />
 * </AppProvider>
 * ```
 */
export function AppProvider({ children, initialState }: AppProviderProps): ReactNode {
  const [state, dispatch] = useReducer(appReducer, initialState ?? INITIAL_STATE, (init) => {
    if (initialState) return init;
    const restored = restoreSession();
    if (!restored) return init;
    return {
      ...init,
      ...restored,
      selectionHistory: createHistory(restored.selection ?? {}),
    };
  });
  const stateRef = useRef(state);
  const listenersRef = useRef(new Set<() => void>());

  useLayoutEffect(() => {
    stateRef.current = state;
    for (const listener of listenersRef.current) {
      listener();
    }
  }, [state]);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getState = useCallback(() => stateRef.current, []);
  const store = useMemo<AppStore>(() => ({ getState, subscribe }), [getState, subscribe]);

  // Debounced auto-save to localStorage
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSession(state), SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  return (
    <AppStoreContext.Provider value={store}>
      <AppStateContext.Provider value={state}>
        <AppDispatchContext.Provider value={dispatch}>
          {children}
        </AppDispatchContext.Provider>
      </AppStateContext.Provider>
    </AppStoreContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Returns the current application state.
 *
 * Must be called within an <AppProvider>.
 * @throws Error if called outside the provider tree.
 */
export function useAppState(): AppState {
  const state = useContext(AppStateContext);
  if (state === null) {
    throw new Error("useAppState must be used within an <AppProvider>");
  }
  return state;
}

/**
 * Returns the dispatch function for application actions.
 *
 * Must be called within an <AppProvider>.
 * @throws Error if called outside the provider tree.
 */
export function useAppDispatch(): Dispatch<AppAction> {
  const dispatch = useContext(AppDispatchContext);
  if (dispatch === null) {
    throw new Error("useAppDispatch must be used within an <AppProvider>");
  }
  return dispatch;
}

/**
 * Subscribes to a selected slice of application state.
 *
 * Selector consumers only rerender when the selected value changes by Object.is.
 * Must be called within an <AppProvider>.
 */
export function useAppSelector<T>(selector: (state: AppState) => T): T {
  const store = useContext(AppStoreContext);
  if (store === null) {
    throw new Error("useAppSelector must be used within an <AppProvider>");
  }

  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
