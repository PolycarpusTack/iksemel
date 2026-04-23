# UX Enhancements Brainstorm

**Date:** 2026-02-18
**Status:** Approved
**Approach:** Priority Waves (high-impact first, then medium, then polish)

## What We're Building

13 UX enhancements for the XFEB application organized in 3 waves:

### Wave 1 — High-Impact (5 features)

1. **Select Search Results** — Button in TreeToolbar: "Select all N matches" when search is active. Uses existing `searchSchema()` results to compute a `SelectionState` merge, dispatches `SET_SELECTION`.

2. **Filter Summary Tab** — New right-panel tab showing all active filters as a list with operator/value summaries and remove (x) buttons. Reads from `filterValues` state. Clicking a filter focuses the corresponding tree node.

3. **Shift+Click Range Selection** — In `TreeNode.handleRowClick`, detect `e.shiftKey`. Compute range from last-clicked node to current click using `flatNodes` array. Merge range into `SelectionState`. Dispatch `SET_SELECTION`.

4. **Smart Column Auto-ordering** — Enhance `ColumnConfig` auto-populate to order columns by schema depth (identifiers first, dates next, descriptions last). Add a "Smart order" button. Existing drag-and-drop remains for manual adjustment.

5. **Quick-Filter Date Presets** — Add preset buttons to `DateRangeControl`: "Today", "This week", "Last 30 days", "This month", "This year". Each sets `rangeStart`/`rangeEnd` values. Minimal UI addition.

### Wave 2 — Medium-Impact (5 features)

6. **Tree Context Menu** — Right-click on any tree node shows a context menu with:
   - Select/Deselect subtree
   - Expand/Collapse subtree
   - Copy XPath
   - Copy node name
   - Copy documentation
   - Focus for filtering (simple type nodes)
   - Select by type (from this node down)
   - Show in preview
   - Add to columns
   Built as a `ContextMenu` component using `position: fixed` + `--z-dropdown` token.

7. **Select By Type** — TreeToolbar dropdown or button group: "Select all dates", "Select all strings", etc. Iterates `flatNodes`, filters by `typeName`, merges into selection. Could also be triggered from context menu.

8. **Live Preview (Side-by-Side)** — Split the Design tab: left = column config, right = live preview. Renders XSLT output with synthetic data (using existing `SyntheticDataProvider`). Updates on field toggle. Debounced rendering (300ms). Toggle to show/hide preview pane.

9. **Guided First-Run Tooltip Tour** — On first launch (no `xfeb-session` in localStorage), show a step-by-step tooltip tour highlighting key UI areas: schema upload, tree selection, filter panel, export tabs. Uses `position: fixed` highlight with a cutout mask. Saves `xfeb-tour-completed` to localStorage.

10. **Clickable Validation Warnings** — Warnings in MetricsBar become clickable. Clicking a payload explosion or validation warning scrolls to and highlights the offending node in the tree. Uses `flatNodes` index to compute scroll offset for virtual tree.

### Wave 3 — Polish (3 features)

11. **Tree Breadcrumb Trail** — Shows the path from root to the currently focused/hovered node as a breadcrumb bar above the tree or below the toolbar. Each segment is clickable to focus that node.

12. **Compare Formats (Two-Pane)** — New tab or sub-view: pick two output formats from dropdowns, see side-by-side XSLT previews with the same synthetic data. Reuses XSLT generators from `engine/generation/`.

13. **Export History (Named + Auto-save)** — Auto-save last 10 unnamed selection snapshots to localStorage. Plus explicit "Save as..." for named configs (selection + filters + columns + format). Recall list in a dropdown or panel. Stored under `xfeb-history` localStorage key.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Filter summary location | Right-panel tab | Keeps left panel focused on tree, gives filter summary full width for readability |
| Live preview style | Side-by-side in Design tab | Instant feedback without tab switching |
| Export history model | Named + auto-save | Most flexible — auto-save for quick recall, named for intentional saves |
| Onboarding style | Tooltip tour | Most engaging, highlights actual UI elements |
| Compare formats | Two-pane | Practical screen space use while still allowing comparison |
| Context menu scope | Full power menu | Maximizes right-click utility — tree ops + clipboard + cross-feature actions |
| Implementation strategy | Priority Waves | Ship value early, each wave is a stable milestone |

## Architecture Notes

### Shared Infrastructure (built as needed)
- **Batch selection helpers** (Wave 1): `selectByIds()`, `selectRange()` functions in `engine/selection/state.ts`
- **Overlay positioning** (Wave 2): Reusable `usePositionedOverlay` hook for context menu, tooltip tour
- **Preview rendering** (Wave 2): Shared `usePreviewRenderer` hook wrapping XSLT generation + synthetic data
- **History store** (Wave 3): `engine/history/` module for localStorage-backed snapshot management

### State Additions
- `AppState.lastClickedNodeId: string | null` — for Shift+click anchor (transient, not persisted)
- `AppState.tourCompleted: boolean` — persisted to localStorage separately
- No new global state needed for context menu, breadcrumb, or date presets (local component state)

### New Components
- `components/filter/FilterSummaryTab.tsx` + CSS Module
- `components/tree/ContextMenu.tsx` + CSS Module
- `components/tree/Breadcrumb.tsx` + CSS Module
- `components/shared/TooltipTour.tsx` + CSS Module
- `components/export/PreviewPane.tsx` + CSS Module
- `components/export/FormatCompare.tsx` + CSS Module
- `components/shared/HistoryPanel.tsx` + CSS Module

### Conventions to Follow
- CSS: camelCase class names, bracket notation, token-only values, array+filter+join for conditional classes
- Overlays: `position: fixed`, z-index tokens, Escape to dismiss, focus trap, `previousActiveRef`
- State: Discriminated union actions, persist decision per field, undo/redo for selection changes
- A11y: `role="dialog"` for modals, `role="menu"` for context menu, `aria-live` for announcements

## Open Questions

1. Should the tooltip tour auto-start or require a "Take tour" button click?
2. Should "Select by type" also clear non-matching selections, or only add to current selection?
3. Should the format compare view reuse the existing PreviewTable or render raw output?
