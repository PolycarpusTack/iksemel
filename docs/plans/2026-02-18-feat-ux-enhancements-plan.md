---
title: "feat: UX Enhancements — 13 Features Across 3 Waves"
type: feat
date: 2026-02-18
brainstorm: docs/brainstorms/2026-02-18-ux-enhancements-brainstorm.md
---

# UX Enhancements — 13 Features Across 3 Waves

## Overview

Implement 13 UX enhancements for the XFEB application, delivered in priority waves. Each wave is independently testable and shippable. Shared infrastructure is built when the first feature needing it arrives.

**Current state:** 642 tests across 31 test files, `tsc --noEmit` clean.

## Technical Approach

### Architecture

All features follow existing patterns:
- **Engine layer** (`engine/`): Pure TS, no React. New selection helpers, history store.
- **Component layer** (`components/`): React UI with CSS Modules. New components for context menu, filter summary, preview pane, breadcrumb, tooltip tour, format compare, history panel.
- **State layer** (`state/`): Discriminated union actions in `AppAction`, handled in `appReducer`. Persist decisions per field.
- **Dependency direction**: engine -> types <- components (never engine -> components).

### Implementation Phases

---

## Wave 1: High-Impact (5 features)

### 1.1 Select Search Results

**What:** Add a "Select N matches" button to TreeToolbar that selects all nodes matching the current search query.

**Files to modify:**
- `src/engine/selection/state.ts` — Add `selectByIds(ids: string[], roots: SchemaNode[], currentSel: SelectionState): SelectionState` that selects the given IDs and their ancestors.
- `src/components/tree/TreeToolbar.tsx` — Add `onSelectSearchResults?: () => void` prop and a conditional button next to the match count.
- `src/App.tsx` — Wire `searchSchema()` results to a handler that calls `selectByIds` and dispatches `SET_SELECTION`.

**Implementation:**

```typescript
// engine/selection/state.ts — new export
export function selectByIds(
  ids: readonly string[],
  roots: readonly SchemaNode[],
  currentSel: SelectionState,
): SelectionState {
  const next = { ...currentSel };
  for (const id of ids) {
    next[id] = true;
  }
  // Ensure ancestors of each selected node are also selected
  for (const id of ids) {
    selectAncestors(id, roots, next);
  }
  return next;
}
```

```typescript
// TreeToolbar.tsx — new button after match count
{searchMatchCount != null && searchMatchCount > 0 && onSelectSearchResults && (
  <Button size="sm" variant="ghost" onClick={onSelectSearchResults}>
    Select {searchMatchCount}
  </Button>
)}
```

```typescript
// App.tsx — handler
const handleSelectSearchResults = useCallback(() => {
  if (!state.schema || !state.searchQuery.trim()) return;
  const results = searchSchema(state.schema, state.searchQuery);
  const ids = results.map((r) => r.node.id);
  const newSel = selectByIds(ids, state.schema, state.selection);
  dispatch({ type: "SET_SELECTION", selection: newSel });
}, [state.schema, state.searchQuery, state.selection, dispatch]);
```

**Tests:**
- `engine/selection/state.test.ts` — Test `selectByIds` selects nodes + ancestors, merges with existing selection.
- TreeToolbar: button appears only when search has matches, calls prop on click.

**Acceptance criteria:**
- [ ] Button appears in toolbar only when search has >0 matches
- [ ] Clicking selects all matching nodes and their ancestors
- [ ] Works with existing undo/redo (selection pushed to history)
- [ ] Button text shows count: "Select 5"

---

### 1.2 Filter Summary Tab

**What:** New "Filters" right-panel tab showing all active filters with operator/value summaries and remove buttons.

**Files to create:**
- `src/components/filter/FilterSummaryTab.tsx` + `FilterSummaryTab.module.css`

**Files to modify:**
- `src/App.tsx` — Add tab to `TABS` array, render `FilterSummaryTab` in tab content, update `activeTab` type.
- `src/state/app-state.tsx` — Extend `activeTab` union with `"filters"`.
- `src/components/filter/index.ts` — Export new component.

**Implementation:**

```typescript
// FilterSummaryTab.tsx
interface FilterSummaryTabProps {
  filterValues: FilterValuesState;
  schema: readonly SchemaNode[] | null;
  onRemoveFilter: (nodeId: string) => void;
  onClearAll: () => void;
  onFocusNode: (nodeId: string) => void;
}

export function FilterSummaryTab({
  filterValues, schema, onRemoveFilter, onClearAll, onFocusNode,
}: FilterSummaryTabProps) {
  const filters = Object.values(filterValues);

  if (filters.length === 0) {
    return <div className={styles["empty"]}>No active filters.</div>;
  }

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <span>{filters.length} active filter{filters.length !== 1 ? "s" : ""}</span>
        <Button size="sm" variant="ghost" onClick={onClearAll}>Clear All</Button>
      </div>
      <ul className={styles["list"]}>
        {filters.map((f) => (
          <FilterSummaryRow
            key={f.nodeId}
            filter={f}
            schema={schema}
            onRemove={() => onRemoveFilter(f.nodeId)}
            onFocus={() => onFocusNode(f.nodeId)}
          />
        ))}
      </ul>
    </div>
  );
}
```

**Tab wiring in App.tsx:**
```typescript
const TABS = [
  { id: "design", label: "Design" },
  { id: "xslt", label: "XSLT" },
  { id: "filter", label: "Filter" },
  { id: "filters", label: "Filters" },  // NEW — summary tab
  { id: "report", label: "Report" },
  // ...
] as const;
```

The "Filter" tab stays (shows filter XML code). The new "Filters" tab shows the interactive summary. The label distinction is: "Filter" = XML output, "Filters" = active filter management.

**Acceptance criteria:**
- [ ] Tab appears in right panel
- [ ] Lists all active filters with human-readable summaries (e.g., "BroadcastDate BETWEEN 2026-01-01 and 2026-02-01")
- [ ] Remove button per filter dispatches `REMOVE_FILTER_VALUE`
- [ ] "Clear All" button dispatches `CLEAR_ALL_FILTERS`
- [ ] Clicking a filter row focuses the corresponding tree node (dispatches `SET_FOCUSED_NODE`)
- [ ] Empty state when no filters active
- [ ] Filter count badge/indicator would be nice but not required

---

### 1.3 Shift+Click Range Selection

**What:** Hold Shift and click a tree node to select all nodes between the last-clicked node and the current one.

**Files to modify:**
- `src/engine/selection/state.ts` — Add `selectRange(fromIndex: number, toIndex: number, flatNodeIds: readonly string[], roots: SchemaNode[], currentSel: SelectionState): SelectionState`.
- `src/components/tree/TreeNode.tsx` — Pass `shiftKey` through `handleRowClick`, add `onRangeSelect` prop.
- `src/components/tree/SchemaTree.tsx` — Track `lastClickedIndex`, compute range, pass `onRangeSelect` to TreeNode.
- `src/App.tsx` — Wire range selection handler that dispatches `SET_SELECTION`.

**Implementation:**

The range is computed from `flatNodes` in `SchemaTree`:

```typescript
// SchemaTree.tsx — track last clicked index
const lastClickedRef = useRef<number | null>(null);

const handleNodeClick = useCallback((nodeId: string, shiftKey: boolean) => {
  const currentIndex = flatNodes.findIndex((n) => n.node.id === nodeId);
  if (currentIndex === -1) return;

  if (shiftKey && lastClickedRef.current !== null) {
    const from = Math.min(lastClickedRef.current, currentIndex);
    const to = Math.max(lastClickedRef.current, currentIndex);
    const rangeIds = flatNodes.slice(from, to + 1).map((n) => n.node.id);
    onRangeSelect?.(rangeIds);
  } else {
    onToggleSelect(nodeId);
  }
  lastClickedRef.current = currentIndex;
}, [flatNodes, onToggleSelect, onRangeSelect]);
```

```typescript
// TreeNode.tsx — pass shift key
const handleRowClick = useCallback((e: React.MouseEvent) => {
  onSetActive?.(node.id);
  if (e.shiftKey && onShiftClick) {
    onShiftClick(node.id);
    return;
  }
  // existing logic...
}, [...]);
```

**New SchemaTree prop:**
```typescript
onRangeSelect?: (nodeIds: readonly string[]) => void;
```

**New engine function:**
```typescript
// engine/selection/state.ts
export function selectRange(
  nodeIds: readonly string[],
  roots: readonly SchemaNode[],
  currentSel: SelectionState,
): SelectionState {
  return selectByIds(nodeIds, roots, currentSel);
}
```

**TreeNode memo comparison** — add `onShiftClick` to the equality check.

**Acceptance criteria:**
- [ ] Shift+click selects all visible nodes between last click and current click
- [ ] Works with virtual scrolling (uses `flatNodes` indices)
- [ ] Ancestors of selected nodes are auto-selected
- [ ] Selection pushed to undo history
- [ ] Without Shift, normal toggle behavior is preserved
- [ ] Range resets when search/expansion changes

---

### 1.4 Smart Column Auto-ordering

**What:** Add a "Smart Order" button to ColumnConfig that reorders columns by type priority: identifiers first, then dates, then codes, then descriptions.

**Files to modify:**
- `src/components/export/ColumnConfig.tsx` — Add `smartOrder` function and button.

**Implementation:**

```typescript
const TYPE_PRIORITY: Record<string, number> = {
  "integer": 1, "int": 1, "long": 1, "short": 1,  // IDs/codes first
  "date": 2, "dateTime": 2, "time": 2, "gYear": 2,  // Dates second
  "duration": 3,
  "boolean": 4,
  "decimal": 5, "float": 5, "double": 5,
  "string": 6,  // Descriptions last
};

const smartOrder = useCallback(() => {
  const sorted = [...columns].sort((a, b) => {
    // Look up type from selectedLeaves
    const aLeaf = selectedLeaves.find((l) => l.id === a.id);
    const bLeaf = selectedLeaves.find((l) => l.id === b.id);
    const aPriority = TYPE_PRIORITY[aLeaf?.typeName ?? "string"] ?? 6;
    const bPriority = TYPE_PRIORITY[bLeaf?.typeName ?? "string"] ?? 6;
    if (aPriority !== bPriority) return aPriority - bPriority;
    // Within same priority, preserve original order
    return 0;
  });
  onColumnsChange(sorted);
}, [columns, selectedLeaves, onColumnsChange]);
```

```typescript
// In toolbar, after Auto-populate button:
<Button size="sm" variant="ghost" onClick={smartOrder} disabled={columns.length < 2}>
  Smart Order
</Button>
```

**Acceptance criteria:**
- [ ] Button appears in ColumnConfig toolbar, disabled when <2 columns
- [ ] Reorders: identifiers -> dates -> durations -> booleans -> numbers -> strings
- [ ] Preserves relative order within same type group (stable sort)
- [ ] Existing drag-and-drop manual reorder still works after smart ordering

---

### 1.5 Quick-Filter Date Presets

**What:** Add preset buttons to DateRangeControl for common date ranges.

**Files to modify:**
- `src/components/filter/controls/DateRangeControl.tsx` — Add preset buttons.
- `src/components/filter/controls/DateRangeControl.module.css` — Style presets row.

**Implementation:**

```typescript
const DATE_PRESETS = [
  { label: "Today", getRange: () => { const d = isoDate(0); return [d, d]; } },
  { label: "This week", getRange: () => [startOfWeek(), isoDate(0)] },
  { label: "Last 30 days", getRange: () => [isoDate(-30), isoDate(0)] },
  { label: "This month", getRange: () => [startOfMonth(), isoDate(0)] },
  { label: "This year", getRange: () => [startOfYear(), isoDate(0)] },
] as const;

function isoDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
```

```tsx
{/* Preset buttons */}
<div className={styles["presets"]} role="group" aria-label="Date presets">
  {DATE_PRESETS.map((preset) => (
    <button
      key={preset.label}
      className={styles["presetBtn"]}
      onClick={() => {
        const [start, end] = preset.getRange();
        onChange({ ...filter, rangeStart: start, rangeEnd: end });
      }}
    >
      {preset.label}
    </button>
  ))}
</div>
```

**Acceptance criteria:**
- [ ] 5 preset buttons appear below the date inputs
- [ ] Each fills both start and end date fields
- [ ] Styled as small chips matching type filter chip pattern
- [ ] Only shown for date/dateTime types (already gated by FilterPanel type dispatch)

---

## Wave 2: Medium-Impact (5 features)

### 2.1 Tree Context Menu (Feature 6)

**What:** Right-click on any tree node to show a context menu with tree operations, clipboard actions, and cross-feature shortcuts.

**Files to create:**
- `src/components/tree/ContextMenu.tsx` + `ContextMenu.module.css`

**Files to modify:**
- `src/components/tree/TreeNode.tsx` — Add `onContextMenu` handler, pass to SchemaTree.
- `src/components/tree/SchemaTree.tsx` — Manage context menu state (position, target node), render ContextMenu.
- `src/components/tree/index.ts` — Export ContextMenu if needed.

**Menu items:**
```
Select subtree / Deselect subtree
Expand subtree / Collapse subtree
---
Copy XPath
Copy node name
Copy documentation
---
Focus for filtering (simple nodes only)
Select all [typeName] fields
Add to columns
```

**Implementation pattern:**
- `position: fixed` at click coordinates, `z-index: var(--z-dropdown)`
- Dismiss on outside click, Escape key, or scroll
- `role="menu"` with `role="menuitem"` children
- Focus first item on open, arrow keys to navigate

**Context menu state in SchemaTree:**
```typescript
const [contextMenu, setContextMenu] = useState<{
  x: number; y: number; node: SchemaNode;
} | null>(null);
```

**New SchemaTree props:**
```typescript
onSelectSubtree?: (nodeId: string) => void;
onDeselectSubtree?: (nodeId: string) => void;
onExpandSubtree?: (nodeId: string) => void;
onCollapseSubtree?: (nodeId: string) => void;
onSelectByType?: (typeName: string) => void;
onAddToColumns?: (nodeId: string) => void;
```

**Acceptance criteria:**
- [ ] Right-click opens menu at cursor position
- [ ] All 9 menu items functional
- [ ] Clipboard operations use `navigator.clipboard.writeText()`
- [ ] Menu dismisses on click outside, Escape, or scroll
- [ ] Keyboard navigable (arrow keys, Enter to select)
- [ ] Viewport-aware positioning (flips up/left near edges)

---

### 2.2 Select By Type (Feature 7)

**What:** TreeToolbar dropdown that selects all leaf/simple nodes matching a specific XSD type.

**Files to modify:**
- `src/engine/selection/state.ts` — Add `selectByType(typeName: string, roots: SchemaNode[], currentSel: SelectionState): SelectionState`.
- `src/components/tree/TreeToolbar.tsx` — Add "Select by type" dropdown next to type filter chips. Reuse `TYPE_FILTERS` array.
- `src/App.tsx` — Wire handler.

**Engine function:**
```typescript
export function selectByType(
  typeName: string,
  roots: readonly SchemaNode[],
  currentSel: SelectionState,
): SelectionState {
  const next = { ...currentSel };
  function walk(nodes: readonly SchemaNode[]): void {
    for (const node of nodes) {
      if ((node.type === "simple" || node.isAttribute) &&
          node.typeName.toLowerCase() === typeName.toLowerCase()) {
        next[node.id] = true;
      }
      if (node.children.length > 0) walk(node.children);
    }
  }
  walk(roots);
  // Select ancestors for all newly selected nodes
  for (const [id, selected] of Object.entries(next)) {
    if (selected && !currentSel[id]) {
      selectAncestors(id, roots, next);
    }
  }
  return next;
}
```

**UI:** Convert existing type filter chips to have a second click action — long-press or a small "+" icon that selects by type instead of just filtering visibility. Or add a separate "Select" label in the chip group.

**Acceptance criteria:**
- [ ] Adds to existing selection (does not clear)
- [ ] Selects only leaf/simple/attribute nodes of matching type
- [ ] Auto-selects ancestors
- [ ] Works with undo/redo
- [ ] Also accessible from context menu "Select all [type] fields"

---

### 2.3 Live Preview Side-by-Side (Feature 8)

**What:** Split the Design tab: left = column config + style, right = live preview of generated output.

**Files to create:**
- `src/components/export/PreviewPane.tsx` + `PreviewPane.module.css`

**Files to modify:**
- `src/App.tsx` — Split design tab rendering into two panes.
- `src/App.module.css` — Add `designSplit`, `designLeft`, `designRight` classes.

**Implementation:**

PreviewPane renders a debounced preview of the XSLT output applied to synthetic data:

```typescript
interface PreviewPaneProps {
  xsltOutput: string;
  format: ExportFormat;
  columns: readonly ColumnDefinition[];
  style: StyleConfig;
  title: string;
  groupBy: string | null;
}

export function PreviewPane({ xsltOutput, format, columns, style, title, groupBy }: PreviewPaneProps) {
  // For HTML format: render directly in iframe/div
  // For other formats: show PreviewTable (existing component)
  // Toggle between "Table" and "Code" views
}
```

The Design tab layout changes:
```tsx
{state.activeTab === "design" && (
  <div className={styles["designSplit"]}>
    <div className={styles["designLeft"]}>
      <ExportDesignTab ... />
      <ColumnConfig ... />
      <StylePanel ... />
    </div>
    <div className={styles["designRight"]}>
      <PreviewPane
        xsltOutput={xsltOutput}
        format={state.format}
        columns={state.columns}
        style={state.style}
        title={state.title || state.metadata.name || "Export"}
        groupBy={state.groupBy}
      />
    </div>
  </div>
)}
```

**CSS for split:**
```css
.designSplit {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  height: 100%;
  overflow: hidden;
}
.designLeft { overflow-y: auto; }
.designRight { overflow-y: auto; border-left: 1px solid var(--color-border-primary); }
```

A toggle button hides/shows the preview pane (collapses to single column).

**Acceptance criteria:**
- [ ] Design tab splits into two columns
- [ ] Right pane shows live PreviewTable with current columns/style
- [ ] Preview updates on column/style/format changes (debounced 300ms)
- [ ] Toggle button to hide/show preview pane
- [ ] Responsive: collapses to single column on narrow viewports

---

### 2.4 Guided First-Run Tooltip Tour (Feature 9)

**What:** On first launch, show a step-by-step tooltip tour highlighting key UI areas.

**Files to create:**
- `src/components/shared/TooltipTour.tsx` + `TooltipTour.module.css`

**Files to modify:**
- `src/App.tsx` — Render tour component, detect first run via localStorage.

**Tour steps:**
1. Schema upload area — "Start by loading an XSD schema or XML sample"
2. Tree area — "Browse and select the fields you need"
3. Filter panel — "Click a field to add filters"
4. Tab bar — "Configure output format, preview XSLT, and build packages"
5. MetricsBar — "Track your payload reduction here"

**Implementation pattern:**

```typescript
interface TourStep {
  targetSelector: string;  // CSS selector for highlight target
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  { targetSelector: "[data-tour='upload']", title: "Load Schema", ... },
  { targetSelector: "[data-tour='tree']", title: "Select Fields", ... },
  // ...
];
```

Uses a spotlight overlay: full-screen semi-transparent backdrop with a cut-out rectangle around the target element. Tooltip positioned adjacent to the cut-out.

- localStorage key: `"xfeb-tour-completed"`
- Auto-starts when: no `xfeb-session` AND no `xfeb-tour-completed`
- "Take a tour" button in Help menu to restart

**Acceptance criteria:**
- [ ] Auto-starts on first visit (no session, no tour flag)
- [ ] 5 steps with Next/Previous/Skip buttons
- [ ] Spotlight highlights target element with dimmed backdrop
- [ ] Keyboard navigable (Enter = next, Escape = skip)
- [ ] Saves `xfeb-tour-completed` to localStorage on completion or skip
- [ ] Accessible: `role="dialog"`, focus trapped in tooltip

---

### 2.5 Clickable Validation Warnings (Feature 10)

**What:** Warnings in MetricsBar become clickable, scrolling to and highlighting the offending node.

**Files to modify:**
- `src/components/tree/MetricsBar.tsx` — Make warning rows clickable with `onClick` + `cursor: pointer`.
- `src/components/tree/MetricsBar.module.css` — Add hover/focus styles for clickable warnings.
- `src/App.tsx` — Pass `onWarningClick` handler to MetricsBar, wire to tree scroll-to-node.
- `src/components/tree/SchemaTree.tsx` — Expose `scrollToNode` via a ref or callback prop.

**Implementation:**

```typescript
// MetricsBar — new prop
interface MetricsBarProps {
  // ... existing
  onWarningClick?: (nodeId: string) => void;
}

// Warning rows become buttons:
<button
  key={e.nodeId}
  className={styles["warningRow"]}
  role="alert"
  onClick={() => onWarningClick?.(e.nodeId)}
>
  ...
</button>
```

```typescript
// App.tsx — handler that expands ancestors and scrolls
const treeRef = useRef<{ scrollToNode: (nodeId: string) => void }>(null);

const handleWarningClick = useCallback((nodeId: string) => {
  if (!state.schema) return;
  // Expand all ancestors so the node is visible
  const path = findNodePath(nodeId, state.schema);
  if (path) {
    const newExpansion = { ...state.expansion };
    // Ensure all nodes in path are expanded
    // ... walk schema to find ancestor IDs
    dispatch({ type: "SET_EXPANSION", expansion: newExpansion });
  }
  dispatch({ type: "SET_FOCUSED_NODE", nodeId });
  // After expansion renders, scroll to node
  requestAnimationFrame(() => treeRef.current?.scrollToNode(nodeId));
}, [state.schema, state.expansion, dispatch]);
```

**Acceptance criteria:**
- [ ] Clicking a payload explosion warning scrolls to and focuses the offending node
- [ ] Clicking a validation warning scrolls to the node with the missing ancestor
- [ ] Ancestors auto-expanded if node is hidden
- [ ] Visual feedback: pointer cursor, hover highlight on warning rows
- [ ] `aria-label` indicates the row is clickable

---

## Wave 3: Polish (3 features)

### 3.1 Tree Breadcrumb Trail (Feature 11)

**What:** Shows the path from root to the currently focused or active node as a breadcrumb bar.

**Files to create:**
- `src/components/tree/Breadcrumb.tsx` + `Breadcrumb.module.css`

**Files to modify:**
- `src/App.tsx` — Render Breadcrumb between TreeToolbar and MetricsBar (or below MetricsBar).
- `src/components/tree/index.ts` — Export Breadcrumb.

**Implementation:**

```typescript
interface BreadcrumbProps {
  path: readonly string[];  // node names from root to active node
  nodeIds: readonly string[];  // corresponding node IDs for click handling
  onNavigate: (nodeId: string) => void;
}

export function Breadcrumb({ path, nodeIds, onNavigate }: BreadcrumbProps) {
  if (path.length === 0) return null;

  return (
    <nav className={styles["breadcrumb"]} aria-label="Schema path">
      {path.map((name, i) => (
        <span key={nodeIds[i]}>
          {i > 0 && <span className={styles["separator"]} aria-hidden="true">/</span>}
          <button
            className={styles["segment"]}
            onClick={() => onNavigate(nodeIds[i]!)}
          >
            {name}
          </button>
        </span>
      ))}
    </nav>
  );
}
```

**Acceptance criteria:**
- [ ] Shows breadcrumb when a node is focused/active
- [ ] Each segment is clickable — scrolls to and focuses that node
- [ ] Hidden when no node is focused
- [ ] Compact styling: small text, inline, doesn't take much vertical space

---

### 3.2 Compare Formats Two-Pane (Feature 12)

**What:** New tab or sub-view showing two format previews side by side.

**Files to create:**
- `src/components/export/FormatCompare.tsx` + `FormatCompare.module.css`

**Files to modify:**
- `src/App.tsx` — Add to TABS or as a sub-view within the XSLT tab.
- `src/state/app-state.tsx` — Extend `activeTab` if adding as new tab.

**Implementation:**

```typescript
interface FormatCompareProps {
  columns: readonly ColumnDefinition[];
  rowSource: string;
  style: StyleConfig;
  groupBy: string | null;
  sortBy: SortConfig | null;
  title: string;
  documentTemplate: DocumentTemplate | null;
}

export function FormatCompare({ columns, ... }: FormatCompareProps) {
  const [leftFormat, setLeftFormat] = useState<ExportFormat>("xlsx");
  const [rightFormat, setRightFormat] = useState<ExportFormat>("html");

  const leftXslt = useMemo(() => {
    try { return generateXslt({ ...input, format: leftFormat }); }
    catch { return "<!-- Not available -->"; }
  }, [input, leftFormat]);

  const rightXslt = useMemo(() => {
    try { return generateXslt({ ...input, format: rightFormat }); }
    catch { return "<!-- Not available -->"; }
  }, [input, rightFormat]);

  return (
    <div className={styles["container"]}>
      <div className={styles["pane"]}>
        <FormatSelector value={leftFormat} onChange={setLeftFormat} />
        <CodeViewer code={leftXslt} ... />
      </div>
      <div className={styles["pane"]}>
        <FormatSelector value={rightFormat} onChange={setRightFormat} />
        <CodeViewer code={rightXslt} ... />
      </div>
    </div>
  );
}
```

**Acceptance criteria:**
- [ ] Two-pane layout with format dropdown in each pane
- [ ] Each pane shows generated XSLT for the selected format
- [ ] Uses existing CodeViewer for rendering
- [ ] Available formats from `getRegisteredFormats()`

---

### 3.3 Export History — Named + Auto-save (Feature 13)

**What:** Auto-save recent selection snapshots + explicit named saves to localStorage.

**Files to create:**
- `src/engine/history/config-history.ts` — localStorage-backed history store.
- `src/engine/history/types.ts` — HistoryEntry, NamedConfig types.
- `src/engine/history/index.ts` — Barrel exports.
- `src/components/shared/HistoryPanel.tsx` + `HistoryPanel.module.css`

**Files to modify:**
- `src/App.tsx` — Integrate history panel (dropdown or section in Templates tab).

**Types:**
```typescript
interface ConfigSnapshot {
  readonly selection: SelectionState;
  readonly filterValues: FilterValuesState;
  readonly columns: readonly ColumnDefinition[];
  readonly format: ExportFormat;
  readonly timestamp: number;
}

interface NamedConfig extends ConfigSnapshot {
  readonly name: string;
  readonly id: string;
}

interface ConfigHistory {
  readonly recent: readonly ConfigSnapshot[];  // auto-saved, max 10
  readonly named: readonly NamedConfig[];       // user-saved
}
```

**Engine functions:**
```typescript
export function loadHistory(): ConfigHistory { ... }
export function pushRecent(snapshot: ConfigSnapshot): void { ... }
export function saveNamed(name: string, snapshot: ConfigSnapshot): void { ... }
export function deleteNamed(id: string): void { ... }
```

**localStorage key:** `"xfeb-history"`

**Auto-save trigger:** On `SET_SELECTION` action (debounced 2s), push to recent. Cap at 10, FIFO eviction.

**Acceptance criteria:**
- [ ] Auto-saves last 10 selection snapshots
- [ ] "Save as..." dialog for named configs
- [ ] History panel shows recent + named configs
- [ ] Clicking a config restores selection + filters + columns
- [ ] Named configs can be deleted
- [ ] Stored in localStorage under `xfeb-history`

---

## Shared Infrastructure Summary

Built incrementally as features need them:

| Infrastructure | First needed by | Files |
|---|---|---|
| `selectByIds()` | 1.1 Select Search Results | `engine/selection/state.ts` |
| `selectRange()` | 1.3 Shift+Click | `engine/selection/state.ts` (reuses selectByIds) |
| `selectByType()` | 2.2 Select By Type | `engine/selection/state.ts` |
| Context menu component | 2.1 Context Menu | `components/tree/ContextMenu.tsx` |
| Tooltip tour component | 2.4 First Run | `components/shared/TooltipTour.tsx` |
| Preview rendering | 2.3 Live Preview | `components/export/PreviewPane.tsx` |
| History store | 3.3 Export History | `engine/history/` |

## State Changes

New `AppAction` variants needed:
- None for Wave 1 (uses existing `SET_SELECTION`, `SET_FOCUSED_NODE`, etc.)
- None for Wave 2 (context menu uses existing actions, tour is local state)
- None for Wave 3 (history is localStorage-managed, not in AppState)

New `AppState` fields:
- None needed. All new state is either local component state or localStorage.

## Testing Strategy

Each feature gets:
1. **Engine tests** for new pure functions (`selectByIds`, `selectByType`, `selectRange`, date preset helpers, config history CRUD)
2. **Component smoke tests** where applicable (FilterSummaryTab renders filters, ContextMenu renders menu items)
3. **Integration** via existing golden test patterns if output changes

**Target:** ~700+ tests after all 3 waves (from current 642).

## Quality Gates

- [ ] `npx vitest run` — all tests pass
- [ ] `npx tsc --noEmit` — no type errors
- [ ] All new components follow CSS Modules conventions (token-only values, camelCase, bracket notation)
- [ ] All interactive elements have ARIA labels
- [ ] All overlays dismiss on Escape
- [ ] `prefers-reduced-motion` respected for new transitions

## References

### Key Files
- App layout: `src/App.tsx:47` (TABS), `src/App.tsx:604` (left panel), `src/App.tsx:716` (right panel)
- Selection engine: `src/engine/selection/state.ts` (all selection functions)
- Tree components: `src/components/tree/SchemaTree.tsx`, `TreeNode.tsx`, `TreeToolbar.tsx`, `MetricsBar.tsx`, `flattenTree.ts`
- Filter: `src/components/filter/FilterPanel.tsx`, `controls/DateRangeControl.tsx`
- Export: `src/components/export/ColumnConfig.tsx`, `PreviewTable.tsx`, `CodeViewer.tsx`
- State: `src/state/app-state.tsx:72` (AppState), `src/state/app-state.tsx:127` (AppAction)
- XSLT: `src/engine/generation/xslt-registry.ts` (generateXslt, getRegisteredFormats)
- CSS tokens: `src/styles/tokens.css`
- Overlay pattern: `src/components/shared/KeyboardShortcutOverlay.tsx`

### Brainstorm
- `docs/brainstorms/2026-02-18-ux-enhancements-brainstorm.md`
