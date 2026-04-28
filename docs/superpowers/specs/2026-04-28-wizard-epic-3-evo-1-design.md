# Epic 3-EVO.1 — Wizard Framework & Data Source Steps

**Date:** 2026-04-28
**Status:** Approved
**Covers:** Wizard shell, Steps 1–3 (Data Source, Load Data, Business Object), mode toggle, persistence, keyboard navigation

---

## 1. Goal

Non-technical users can build reports through a guided step-flow wizard. Epic 3-EVO.1 delivers the wizard shell and the first three steps: choosing a data source, loading it, and selecting a business object. On completion the user lands in the expert UI with schema and `rowSource` already configured.

---

## 2. Architecture

### 2.1 Approach

The wizard is an alternate entry point to the same AppState/reducer/engine. It does not own any business logic — it dispatches standard `AppActions` in a guided sequence. Wizard-specific ephemeral state (current step, selected source) lives in local React state inside `WizardShell`, not in AppState.

### 2.2 AppState changes

One new field:

```ts
readonly uiMode: "expert" | "wizard";  // default: "expert"
```

Two new actions:

```ts
| { readonly type: "SET_UI_MODE"; readonly uiMode: "expert" | "wizard" }
| { readonly type: "RESET_STATE" }
```

`RESET_STATE` returns `{ ...INITIAL_STATE, uiMode: "wizard" }` — resets schema, selection, rowSource, columns, and all derived state while keeping the app in wizard mode.

`saveSession` and `restoreSession` include `uiMode` so the mode persists across page reloads.

No other AppState fields change.

### 2.3 WizardShell local state

```ts
type WizardStep = 1 | 2 | 3;

interface WizardLocalState {
  step: WizardStep;
  selectedSource: "xsd" | "xml-sample" | null;
}
```

Owned in `useState` inside `<WizardShell>`. Persisted separately under `localStorage["iksemel-wizard"]` via `useEffect` on every change. Cleared when the user chooses "Start Fresh" or exits the wizard before completing.

### 2.4 Component tree

```
App.tsx
├── AppHeader            — adds mode toggle button (right side)
└── uiMode === "expert"
    └── <ExpertUI>       — current layout, no changes
    uiMode === "wizard"
    └── <WizardShell>
        ├── <WizardStepIndicator>
        ├── <WizardStep1DataSource>   (step === 1)
        ├── <WizardStep2LoadData>     (step === 2)
        └── <WizardStep3BusinessObject> (step === 3)
```

All wizard components live under `src/components/wizard/`.

### 2.5 Data flow per step

| Step | Action dispatched | Condition to advance |
|------|-------------------|----------------------|
| 1 — Data Source | none (sets `wizardLocal.selectedSource`) | A source is selected |
| 2 — Load Data | `SET_SCHEMA` (existing action) | Schema parsed successfully |
| 3 — Business Object | `SET_ROW_SOURCE` (existing action) | A candidate is selected |
| Finish | `SET_UI_MODE("expert")` + `SET_ACTIVE_TAB("design")` | Step 3 complete |

---

## 3. Components

### 3.1 AppHeader — mode toggle

A toggle button labelled **"Guided Setup"** (when in expert mode) / **"Expert Mode"** (when in wizard mode) sits on the right side of the existing `AppHeader`.

**Expert → Wizard switch:** If `state.schema !== null`, a confirmation modal appears with two options:
- **"Start Fresh"** — dispatches `RESET_STATE`, clears `localStorage["iksemel-wizard"]`, then `SET_UI_MODE("wizard")`
- **"Continue"** — dispatches `SET_UI_MODE("wizard")`; `WizardShell` on mount reads AppState to fast-forward to the furthest satisfied step

If `state.schema === null`, switches directly without confirmation.

**Wizard → Expert switch:** Dispatches `SET_UI_MODE("expert")` immediately. Wizard local state is preserved in `localStorage["iksemel-wizard"]` so returning to wizard mode resumes where the user left off.

### 3.2 WizardStepIndicator

Stateless component. Props:

```ts
interface WizardStepIndicatorProps {
  currentStep: WizardStep;
  completedSteps: ReadonlySet<WizardStep>;
  onStepClick: (step: WizardStep) => void;
}
```

Renders 3 numbered bubbles connected by lines (layout C from design review):
- **Active step:** accent-filled bubble, `aria-current="step"`
- **Completed step:** filled with checkmark, clickable, `onClick` fires `onStepClick`
- **Locked step:** muted border, `aria-disabled="true"`, click ignored

Labels below each bubble: "Data Source", "Load Data", "Business Object".

### 3.3 WizardStep1DataSource

Renders two selectable horizontal row cards (layout B from design review):

| Card | Label | Detail line |
|------|-------|-------------|
| xsd | XSD Schema | Upload an XML Schema Definition file · Precise field types |
| xml-sample | XML Sample | Infer structure from a real XML file · Good when no XSD available |

Selected card has accent background + checkmark. Selecting a card sets `wizardLocal.selectedSource` and enables the Next button.

### 3.4 WizardStep2LoadData

Renders the existing `<SchemaUpload>` component unchanged. `SchemaUpload` calls `onSchemaLoad(rawText: string)` with the file contents. `WizardStep2LoadData` owns the parsing step:

- If `wizardLocal.selectedSource === "xsd"`: calls `parseXSD(rawText)` → `SchemaNode[]`
- If `wizardLocal.selectedSource === "xml-sample"`: calls the inference builder → `SchemaNode[]`

On success, dispatches `SET_SCHEMA(nodes)` and advances the wizard to step 3. On parse error, displays the error inline (same error display pattern as the expert UI).

No changes to `SchemaUpload` required.

### 3.5 WizardStep3BusinessObject

Layout C from design review: compact name+count list on the left, live field preview panel on the right.

**Candidates:** derived from `state.schema` — top-level nodes only (direct children of the schema root). Each candidate shows:
- Element name
- Field count (direct children of the candidate node)

**Preview panel:** shows the hovered or selected candidate's direct child fields with their inferred types. Updates on hover; locks on selection.

**Selecting a candidate:** dispatches `SET_ROW_SOURCE("//ElementName")`. Enables the **"Finish"** button.

**Finish:** dispatches `SET_UI_MODE("expert")` + `SET_ACTIVE_TAB("design")`.

### 3.6 WizardShell — step restoration on mount

When mounting with "Continue" chosen (or returning from expert mode):

```
if state.schema !== null && state.rowSource !== ""  → start at step 3
if state.schema !== null && state.rowSource === ""  → start at step 3 (schema loaded, no object chosen)
if state.schema === null                            → start at step 1
```

Also reads `localStorage["iksemel-wizard"]` to restore `selectedSource` from a previous session.

---

## 4. Navigation

### 4.1 Step progression

- **Forward:** Next button enabled only when current step is valid (strict linear)
- **Backward:** Back button always enabled; step indicator bubbles for completed steps are clickable
- **Exit:** "Exit to Expert Mode" link available on all steps; switches mode without resetting state

### 4.2 Keyboard navigation

| Key | Behaviour |
|-----|-----------|
| `Tab` / `Shift+Tab` | Move focus between interactive elements within the step |
| `Enter` / `Space` | Select focused card; activate focused button |
| `Enter` on Next | Advance step (when valid) |
| `Escape` | Go back one step; on Step 1, open exit confirmation |
| `Arrow keys` | Navigate between source/candidate cards (roving tabindex) |

---

## 5. Persistence

| Key | Contents | Cleared when |
|-----|----------|--------------|
| `iksemel-wizard` | `{ step, selectedSource }` | "Start Fresh" chosen; wizard completes (Finish pressed) |
| `iksemel-session` | Existing expert session (includes `uiMode`) | Unchanged |

The two keys are independent. The expert session remembers which mode the user was in; the wizard key remembers wizard-specific progress.

---

## 6. Error handling

- Schema parse errors in Step 2: shown inline below `<SchemaUpload>` (existing error display, no changes)
- Empty schema (no top-level candidates) in Step 3: show a message "No root elements found in this schema" with a Back button — no crash
- `localStorage` unavailable: wizard degrades gracefully (no persistence, but fully functional)

---

## 7. Accessibility

- Step indicator: `aria-current="step"` on active bubble; `aria-disabled="true"` on locked bubbles
- Cards: `role="radio"` + `aria-checked` within a `role="radiogroup"`
- Modal: focus trapped while open; `aria-modal="true"`; `Escape` closes
- All interactive elements reachable by keyboard
- Passes axe audit at zero violations

---

## 8. Testing

- **Unit — WizardShell:** step transitions, localStorage round-trip, fast-forward on mount
- **Unit — WizardStepIndicator:** completed vs locked bubble states, click handling
- **Unit — WizardStep1DataSource:** card selection, Next button enabled state
- **Unit — WizardStep3BusinessObject:** candidate derivation from schema nodes, preview panel updates, `SET_ROW_SOURCE` dispatch
- **Unit — AppHeader toggle:** confirmation modal shown only when schema loaded; "Start Fresh" resets state
- **Coverage:** ≥ 80% across all wizard components (per evolution plan QG-3E.1)

---

## 9. File layout

```
src/components/wizard/
  WizardShell.tsx
  WizardShell.module.css
  WizardStepIndicator.tsx
  WizardStepIndicator.module.css
  WizardStep1DataSource.tsx
  WizardStep1DataSource.module.css
  WizardStep2LoadData.tsx
  WizardStep3BusinessObject.tsx
  WizardStep3BusinessObject.module.css
  index.ts
```

Tests co-located under `src/components/wizard/__tests__/`.

---

## 10. Out of scope (Epic 3-EVO.1)

- Steps 4–6 (field selection, filters, output format) — Epic 3-EVO.2
- Template presets and onboarding tour — Epic 3-EVO.3
- Smart root detection / heuristic ranking — deferred (Step 3 shows a flat list)
- Wizard analytics — Epic 3-EVO.3
- E2E Playwright wizard tests — Epic 3-EVO.3
