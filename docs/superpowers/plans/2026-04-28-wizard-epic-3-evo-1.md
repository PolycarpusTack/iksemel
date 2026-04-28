# Epic 3-EVO.1 — Wizard Framework & Data Source Steps

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a guided 3-step wizard (data source → load data → business object) as an alternate entry point that sets schema + rowSource, then drops the user into the expert UI.

**Architecture:** `AppState` gets one new field (`uiMode`) and one new action (`SET_UI_MODE`). All wizard ephemeral state lives in `useState` inside `WizardShell` and is persisted separately to `localStorage["iksemel-wizard"]`. The wizard dispatches standard `AppActions` (`LOAD_SCHEMA`, `SET_ROW_SOURCE`) — no wizard-specific reducer logic.

**Tech Stack:** React 18, TypeScript 5.7 strict, CSS Modules, Vitest + @testing-library/react. Run tests with `npx vitest run` from `Iksemel/`.

---

## File Map

**Modified:**
- `src/state/app-state.tsx` — add `uiMode` field + `SET_UI_MODE` action + update `saveSession`/`restoreSession`
- `src/app/components/AppHeader.tsx` — add mode toggle button + confirmation modal
- `src/app/components/AppHeader.test.tsx` — extend existing tests
- `src/App.tsx` — read `uiMode` from state, render `<WizardShell>` or expert layout
- `src/engine/parser/index.ts` — export `parseXmlSample`

**Created:**
- `src/engine/parser/parse-xml-sample.ts` — infer `SchemaNode[]` from sample XML text
- `src/engine/parser/parse-xml-sample.test.ts` — unit tests
- `src/components/wizard/index.ts` — barrel export
- `src/components/wizard/WizardShell.tsx` — step coordinator + localStorage persistence
- `src/components/wizard/WizardShell.module.css`
- `src/components/wizard/WizardStep1DataSource.tsx` — source card selector
- `src/components/wizard/WizardStep1DataSource.module.css`
- `src/components/wizard/WizardStep2LoadData.tsx` — wraps SchemaUpload + calls parser
- `src/components/wizard/WizardStep2LoadData.module.css`
- `src/components/wizard/WizardStep3BusinessObject.tsx` — candidate list + preview panel
- `src/components/wizard/WizardStep3BusinessObject.module.css`
- `src/components/wizard/WizardStepIndicator.tsx` — bubble progress indicator
- `src/components/wizard/WizardStepIndicator.module.css`
- `src/components/wizard/__tests__/WizardStepIndicator.test.tsx`
- `src/components/wizard/__tests__/WizardStep1DataSource.test.tsx`
- `src/components/wizard/__tests__/WizardStep2LoadData.test.tsx`
- `src/components/wizard/__tests__/WizardStep3BusinessObject.test.tsx`
- `src/components/wizard/__tests__/WizardShell.test.tsx`

---

## Task 1: AppState — add uiMode and SET_UI_MODE

**Files:**
- Modify: `src/state/app-state.tsx`

- [ ] **Step 1: Write the failing test**

Add to `src/state/app-state.selector.test.tsx` (append inside the outermost `describe` block):

```tsx
it("defaults uiMode to expert", () => {
  const { result } = renderHook(
    () => useAppSelector((s) => s.uiMode),
    { wrapper },
  );
  expect(result.current).toBe("expert");
});

it("SET_UI_MODE switches between modes", () => {
  const { result } = renderHook(
    () => {
      const uiMode = useAppSelector((s) => s.uiMode);
      const dispatch = useAppDispatch();
      return { uiMode, dispatch };
    },
    { wrapper },
  );

  act(() => {
    result.current.dispatch({ type: "SET_UI_MODE", uiMode: "wizard" });
  });
  expect(result.current.uiMode).toBe("wizard");

  act(() => {
    result.current.dispatch({ type: "SET_UI_MODE", uiMode: "expert" });
  });
  expect(result.current.uiMode).toBe("expert");
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/state/app-state.selector.test.tsx
```

Expected: FAIL — `uiMode` not on state, `SET_UI_MODE` not a known action.

- [ ] **Step 3: Add uiMode to AppState**

In `src/state/app-state.tsx`, add to the `AppState` interface after `activeTab`:

```ts
readonly uiMode: "expert" | "wizard";
```

Add to `INITIAL_STATE` after `activeTab: "design"`:

```ts
uiMode: "expert",
```

Add to `AppAction` union (after `SET_ACTIVE_TAB`):

```ts
| { readonly type: "SET_UI_MODE"; readonly uiMode: "expert" | "wizard" }
```

Add reducer case after `case "SET_ACTIVE_TAB"`:

```ts
case "SET_UI_MODE":
  return { ...state, uiMode: action.uiMode };
```

Update `saveSession` — add `uiMode` to the serializable object:

```ts
uiMode: state.uiMode,
```

Update `restoreSession` — add `uiMode` to the validity check comment and trust the spread (the `Partial<AppState>` already handles it).

- [ ] **Step 4: Run to verify tests pass**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/state/app-state.selector.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Type-check**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/state/app-state.tsx src/state/app-state.selector.test.tsx
git commit -m "feat(state): add uiMode field and SET_UI_MODE action"
```

---

## Task 2: Engine — parseXmlSample

**Files:**
- Create: `src/engine/parser/parse-xml-sample.ts`
- Create: `src/engine/parser/parse-xml-sample.test.ts`
- Modify: `src/engine/parser/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/engine/parser/parse-xml-sample.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseXmlSample } from "./parse-xml-sample";

const SIMPLE_XML = `<?xml version="1.0"?>
<Schedule>
  <Programme id="1">
    <Title>Morning News</Title>
    <StartTime>08:00</StartTime>
  </Programme>
  <Programme id="2">
    <Title>Evening News</Title>
    <StartTime>20:00</StartTime>
  </Programme>
</Schedule>`;

const FLAT_XML = `<Items><Item><Name>A</Name></Item></Items>`;

describe("parseXmlSample", () => {
  it("returns a ParseResult with roots", () => {
    const result = parseXmlSample(SIMPLE_XML);
    expect(result.roots.length).toBeGreaterThan(0);
  });

  it("root node name matches document element", () => {
    const result = parseXmlSample(SIMPLE_XML);
    expect(result.roots[0].name).toBe("Schedule");
  });

  it("top-level child names are inferred from repeated elements", () => {
    const result = parseXmlSample(SIMPLE_XML);
    const schedule = result.roots[0];
    expect(schedule.children.some((c) => c.name === "Programme")).toBe(true);
  });

  it("leaf nodes from sample values are simple type", () => {
    const result = parseXmlSample(SIMPLE_XML);
    const programme = result.roots[0].children.find((c) => c.name === "Programme");
    const title = programme?.children.find((c) => c.name === "Title");
    expect(title?.type).toBe("simple");
  });

  it("complex nodes with children are complex type", () => {
    const result = parseXmlSample(SIMPLE_XML);
    const programme = result.roots[0].children.find((c) => c.name === "Programme");
    expect(programme?.type).toBe("complex");
  });

  it("attributes become child nodes with @ prefix", () => {
    const result = parseXmlSample(SIMPLE_XML);
    const programme = result.roots[0].children.find((c) => c.name === "Programme");
    expect(programme?.children.some((c) => c.name === "@id")).toBe(true);
  });

  it("returns empty warnings array on valid XML", () => {
    const result = parseXmlSample(SIMPLE_XML);
    expect(result.warnings).toEqual([]);
  });

  it("returns a warning on invalid XML", () => {
    const result = parseXmlSample("<broken><unclosed>");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.roots).toEqual([]);
  });

  it("assigns unique sequential node IDs starting with n0", () => {
    const result = parseXmlSample(FLAT_XML);
    const ids = new Set<string>();
    function collect(nodes: typeof result.roots): void {
      for (const n of nodes) { ids.add(n.id); collect(n.children); }
    }
    collect(result.roots);
    expect(ids.has("n0")).toBe(true);
    expect(ids.size).toBe(ids.size); // all unique — checked by Set size vs flat count
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/engine/parser/parse-xml-sample.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement parseXmlSample**

Create `src/engine/parser/parse-xml-sample.ts`:

```ts
import type { SchemaNode } from "@/types";
import type { ParseResult, ParseWarning } from "@/types";

let nodeCounter = 0;

function nextId(): string {
  return `n${nodeCounter++}`;
}

function buildNode(element: Element): SchemaNode {
  const children: SchemaNode[] = [];

  // Attributes become child nodes with @ prefix
  for (const attr of Array.from(element.attributes)) {
    children.push({
      id: nextId(),
      name: `@${attr.name}`,
      documentation: "",
      minOccurs: "0",
      maxOccurs: "1",
      type: "simple",
      typeName: "string",
      children: [],
      isRequired: false,
      isAttribute: true,
    });
  }

  // Deduplicate child element names — only one representative per name
  const seen = new Set<string>();
  for (const child of Array.from(element.children)) {
    if (!seen.has(child.localName)) {
      seen.add(child.localName);
      children.push(buildNode(child));
    }
  }

  const hasElementChildren = element.children.length > 0;

  return {
    id: nextId(),
    name: element.localName,
    documentation: "",
    minOccurs: "0",
    maxOccurs: "unbounded",
    type: hasElementChildren ? "complex" : "simple",
    typeName: hasElementChildren ? "" : "string",
    children,
    isRequired: false,
  };
}

export function parseXmlSample(xmlText: string): ParseResult {
  nodeCounter = 0;
  const warnings: ParseWarning[] = [];

  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    warnings.push({ message: parseError.textContent ?? "XML parse error", path: "" });
    return { roots: [], warnings };
  }

  const root = doc.documentElement;
  if (!root) {
    warnings.push({ message: "No root element found", path: "" });
    return { roots: [], warnings };
  }

  return { roots: [buildNode(root)], warnings };
}
```

- [ ] **Step 4: Run to verify tests pass**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/engine/parser/parse-xml-sample.test.ts
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Export from parser index**

Add to `src/engine/parser/index.ts`:

```ts
export { parseXmlSample } from "./parse-xml-sample";
```

- [ ] **Step 6: Type-check**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/engine/parser/parse-xml-sample.ts src/engine/parser/parse-xml-sample.test.ts src/engine/parser/index.ts
git commit -m "feat(engine): parseXmlSample — infer SchemaNode tree from XML sample"
```

---

## Task 3: WizardStepIndicator

**Files:**
- Create: `src/components/wizard/WizardStepIndicator.tsx`
- Create: `src/components/wizard/WizardStepIndicator.module.css`
- Create: `src/components/wizard/__tests__/WizardStepIndicator.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/wizard/__tests__/WizardStepIndicator.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardStepIndicator } from "../WizardStepIndicator";

const STEPS = ["Data Source", "Load Data", "Business Object"] as const;

describe("WizardStepIndicator", () => {
  it("renders all three step labels", () => {
    render(
      <WizardStepIndicator
        currentStep={1}
        completedSteps={new Set()}
        onStepClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Data Source")).toBeInTheDocument();
    expect(screen.getByText("Load Data")).toBeInTheDocument();
    expect(screen.getByText("Business Object")).toBeInTheDocument();
  });

  it("marks active step with aria-current=step", () => {
    render(
      <WizardStepIndicator
        currentStep={2}
        completedSteps={new Set([1])}
        onStepClick={vi.fn()}
      />,
    );
    const active = screen.getByRole("button", { name: /Load Data/ });
    expect(active).toHaveAttribute("aria-current", "step");
  });

  it("completed steps are clickable and fire onStepClick", () => {
    const onStepClick = vi.fn();
    render(
      <WizardStepIndicator
        currentStep={3}
        completedSteps={new Set([1, 2])}
        onStepClick={onStepClick}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Data Source/ }));
    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it("locked future steps have aria-disabled=true and do not fire onStepClick", () => {
    const onStepClick = vi.fn();
    render(
      <WizardStepIndicator
        currentStep={1}
        completedSteps={new Set()}
        onStepClick={onStepClick}
      />,
    );
    const locked = screen.getByRole("button", { name: /Business Object/ });
    expect(locked).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(locked);
    expect(onStepClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardStepIndicator.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create WizardStepIndicator.tsx**

Create `src/components/wizard/WizardStepIndicator.tsx`:

```tsx
import styles from "./WizardStepIndicator.module.css";

type WizardStep = 1 | 2 | 3;

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Data Source",
  2: "Load Data",
  3: "Business Object",
};

interface WizardStepIndicatorProps {
  readonly currentStep: WizardStep;
  readonly completedSteps: ReadonlySet<WizardStep>;
  readonly onStepClick: (step: WizardStep) => void;
}

export function WizardStepIndicator({ currentStep, completedSteps, onStepClick }: WizardStepIndicatorProps) {
  const steps: WizardStep[] = [1, 2, 3];

  return (
    <nav className={styles["indicator"]} aria-label="Wizard steps">
      {steps.map((step, index) => {
        const isActive = step === currentStep;
        const isCompleted = completedSteps.has(step);
        const isLocked = !isActive && !isCompleted;

        return (
          <div key={step} className={styles["stepWrapper"]}>
            {index > 0 && (
              <div
                className={`${styles["connector"]} ${isCompleted || isActive ? styles["connectorDone"] : ""}`}
              />
            )}
            <div className={styles["stepItem"]}>
              <button
                className={`${styles["bubble"]} ${isActive ? styles["bubbleActive"] : ""} ${isCompleted ? styles["bubbleCompleted"] : ""} ${isLocked ? styles["bubbleLocked"] : ""}`}
                aria-current={isActive ? "step" : undefined}
                aria-disabled={isLocked ? "true" : undefined}
                aria-label={`${STEP_LABELS[step]}${isCompleted ? " (completed)" : isActive ? " (current)" : " (not yet available)"}`}
                onClick={() => { if (!isLocked) onStepClick(step); }}
              >
                {isCompleted ? "✓" : step}
              </button>
              <span className={`${styles["label"]} ${isActive ? styles["labelActive"] : ""} ${isLocked ? styles["labelLocked"] : ""}`}>
                {STEP_LABELS[step]}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Create WizardStepIndicator.module.css**

Create `src/components/wizard/WizardStepIndicator.module.css`:

```css
.indicator {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  padding: 1.5rem 1rem 1rem;
}

.stepWrapper {
  display: flex;
  align-items: flex-start;
}

.connector {
  width: 3rem;
  height: 2px;
  background: var(--color-border-primary);
  margin-top: 0.9rem;
  flex-shrink: 0;
}

.connectorDone {
  background: var(--color-accent-green);
}

.stepItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.bubble {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  border: 2px solid var(--color-border-primary);
  background: var(--color-bg-secondary);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
}

.bubbleActive {
  background: var(--color-accent-green);
  border-color: var(--color-accent-green);
  color: var(--color-bg-primary);
  cursor: default;
}

.bubbleCompleted {
  background: var(--color-accent-green-dim);
  border-color: var(--color-accent-green-dim);
  color: var(--color-bg-primary);
  cursor: pointer;
}

.bubbleCompleted:hover {
  background: var(--color-accent-green);
  border-color: var(--color-accent-green);
}

.bubbleLocked {
  opacity: 0.4;
  cursor: not-allowed;
}

.label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.labelActive {
  color: var(--color-accent-green);
  font-weight: 600;
}

.labelLocked {
  color: var(--color-text-ghost);
}
```

- [ ] **Step 5: Run to verify tests pass**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardStepIndicator.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/wizard/WizardStepIndicator.tsx src/components/wizard/WizardStepIndicator.module.css src/components/wizard/__tests__/WizardStepIndicator.test.tsx
git commit -m "feat(wizard): WizardStepIndicator — bubble progress indicator"
```

---

## Task 4: WizardStep1DataSource

**Files:**
- Create: `src/components/wizard/WizardStep1DataSource.tsx`
- Create: `src/components/wizard/WizardStep1DataSource.module.css`
- Create: `src/components/wizard/__tests__/WizardStep1DataSource.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/wizard/__tests__/WizardStep1DataSource.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardStep1DataSource } from "../WizardStep1DataSource";

describe("WizardStep1DataSource", () => {
  it("renders both source options", () => {
    render(<WizardStep1DataSource selectedSource={null} onSelect={vi.fn()} />);
    expect(screen.getByText("XSD Schema")).toBeInTheDocument();
    expect(screen.getByText("XML Sample")).toBeInTheDocument();
  });

  it("calls onSelect with xsd when XSD card is clicked", () => {
    const onSelect = vi.fn();
    render(<WizardStep1DataSource selectedSource={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio", { name: /XSD Schema/ }));
    expect(onSelect).toHaveBeenCalledWith("xsd");
  });

  it("calls onSelect with xml-sample when XML card is clicked", () => {
    const onSelect = vi.fn();
    render(<WizardStep1DataSource selectedSource={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio", { name: /XML Sample/ }));
    expect(onSelect).toHaveBeenCalledWith("xml-sample");
  });

  it("marks selected card with aria-checked=true", () => {
    render(<WizardStep1DataSource selectedSource="xsd" onSelect={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /XSD Schema/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /XML Sample/ })).toHaveAttribute("aria-checked", "false");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardStep1DataSource.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create WizardStep1DataSource.tsx**

Create `src/components/wizard/WizardStep1DataSource.tsx`:

```tsx
import styles from "./WizardStep1DataSource.module.css";

type SourceType = "xsd" | "xml-sample";

interface WizardStep1DataSourceProps {
  readonly selectedSource: SourceType | null;
  readonly onSelect: (source: SourceType) => void;
}

const SOURCES: { id: SourceType; label: string; detail: string }[] = [
  {
    id: "xsd",
    label: "XSD Schema",
    detail: "Upload an XML Schema Definition file · Precise field types",
  },
  {
    id: "xml-sample",
    label: "XML Sample",
    detail: "Infer structure from a real XML file · Good when no XSD available",
  },
];

export function WizardStep1DataSource({ selectedSource, onSelect }: WizardStep1DataSourceProps) {
  return (
    <div className={styles["step"]}>
      <h2 className={styles["heading"]}>Choose your data source</h2>
      <div className={styles["list"]} role="radiogroup" aria-label="Data source">
        {SOURCES.map(({ id, label, detail }) => {
          const isSelected = selectedSource === id;
          return (
            <button
              key={id}
              role="radio"
              aria-checked={isSelected}
              aria-label={label}
              className={`${styles["card"]} ${isSelected ? styles["cardSelected"] : ""}`}
              onClick={() => onSelect(id)}
            >
              <div className={styles["cardBody"]}>
                <span className={styles["cardLabel"]}>{label}</span>
                <span className={styles["cardDetail"]}>{detail}</span>
              </div>
              {isSelected && <span className={styles["check"]} aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create WizardStep1DataSource.module.css**

Create `src/components/wizard/WizardStep1DataSource.module.css`:

```css
.step {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 2rem;
}

.heading {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--color-border-primary);
  background: var(--color-bg-secondary);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  width: 100%;
}

.card:hover {
  border-color: var(--color-accent-green-dim);
  background: var(--color-bg-hover);
}

.cardSelected {
  border-color: var(--color-accent-green);
  background: var(--color-accent-green-bg);
}

.cardBody {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
}

.cardLabel {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.cardDetail {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.check {
  color: var(--color-accent-green);
  font-size: 1rem;
  flex-shrink: 0;
}
```

- [ ] **Step 5: Run to verify tests pass**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardStep1DataSource.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/wizard/WizardStep1DataSource.tsx src/components/wizard/WizardStep1DataSource.module.css src/components/wizard/__tests__/WizardStep1DataSource.test.tsx
git commit -m "feat(wizard): WizardStep1DataSource — source card selector"
```

---

## Task 5: WizardStep2LoadData

**Files:**
- Create: `src/components/wizard/WizardStep2LoadData.tsx`
- Create: `src/components/wizard/WizardStep2LoadData.module.css`
- Create: `src/components/wizard/__tests__/WizardStep2LoadData.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/wizard/__tests__/WizardStep2LoadData.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardStep2LoadData } from "../WizardStep2LoadData";

vi.mock("@components/shared", () => ({
  SchemaUpload: ({ onSchemaLoad }: { onSchemaLoad: (text: string) => void }) => (
    <button onClick={() => onSchemaLoad("<root><item/></root>")}>Upload</button>
  ),
}));

vi.mock("@engine/parser", () => ({
  parseXSD: vi.fn(() => ({ roots: [{ id: "n0", name: "Root", children: [], type: "complex", typeName: "", documentation: "", minOccurs: "1", maxOccurs: "1", isRequired: true }], warnings: [] })),
  parseXmlSample: vi.fn(() => ({ roots: [{ id: "n0", name: "Root", children: [], type: "complex", typeName: "", documentation: "", minOccurs: "0", maxOccurs: "unbounded", isRequired: false }], warnings: [] })),
}));

describe("WizardStep2LoadData", () => {
  it("renders the SchemaUpload component", () => {
    render(<WizardStep2LoadData source="xsd" onLoaded={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });

  it("calls parseXSD for xsd source and fires onLoaded with roots", async () => {
    const { parseXSD } = await import("@engine/parser");
    const onLoaded = vi.fn();
    render(<WizardStep2LoadData source="xsd" onLoaded={onLoaded} />);
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(parseXSD).toHaveBeenCalled();
    expect(onLoaded).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: "Root" })]),
      [],
    );
  });

  it("calls parseXmlSample for xml-sample source", async () => {
    const { parseXmlSample } = await import("@engine/parser");
    const onLoaded = vi.fn();
    render(<WizardStep2LoadData source="xml-sample" onLoaded={onLoaded} />);
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(parseXmlSample).toHaveBeenCalled();
  });

  it("shows parse error inline when parse returns warnings", async () => {
    const { parseXSD } = await import("@engine/parser");
    vi.mocked(parseXSD).mockReturnValueOnce({ roots: [], warnings: [{ message: "Bad schema", path: "" }] });
    render(<WizardStep2LoadData source="xsd" onLoaded={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(screen.getByText(/Bad schema/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardStep2LoadData.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create WizardStep2LoadData.tsx**

Create `src/components/wizard/WizardStep2LoadData.tsx`:

```tsx
import { useState, useCallback } from "react";
import { SchemaUpload } from "@components/shared";
import { parseXSD, parseXmlSample } from "@engine/parser";
import type { SchemaNode, ParseWarning } from "@/types";
import styles from "./WizardStep2LoadData.module.css";

interface WizardStep2LoadDataProps {
  readonly source: "xsd" | "xml-sample";
  readonly onLoaded: (roots: readonly SchemaNode[], warnings: readonly ParseWarning[]) => void;
}

export function WizardStep2LoadData({ source, onLoaded }: WizardStep2LoadDataProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSchemaLoad = useCallback(
    (rawText: string) => {
      setError(null);
      const result = source === "xsd" ? parseXSD(rawText) : parseXmlSample(rawText);
      if (result.roots.length === 0 && result.warnings.length > 0) {
        setError(result.warnings[0].message);
        return;
      }
      onLoaded(result.roots, result.warnings);
    },
    [source, onLoaded],
  );

  return (
    <div className={styles["step"]}>
      <h2 className={styles["heading"]}>
        {source === "xsd" ? "Upload your XSD schema" : "Upload an XML sample file"}
      </h2>
      <SchemaUpload onSchemaLoad={handleSchemaLoad} hasSchema={false} />
      {error && <p className={styles["error"]} role="alert">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Create WizardStep2LoadData.module.css**

Create `src/components/wizard/WizardStep2LoadData.module.css`:

```css
.step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 2rem;
}

.heading {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
}

.error {
  color: var(--color-accent-red);
  font-size: 0.8rem;
  margin-top: 0.25rem;
}
```

- [ ] **Step 5: Run to verify tests pass**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardStep2LoadData.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/wizard/WizardStep2LoadData.tsx src/components/wizard/WizardStep2LoadData.module.css src/components/wizard/__tests__/WizardStep2LoadData.test.tsx
git commit -m "feat(wizard): WizardStep2LoadData — schema upload + parse dispatch"
```

---

## Task 6: WizardStep3BusinessObject

**Files:**
- Create: `src/components/wizard/WizardStep3BusinessObject.tsx`
- Create: `src/components/wizard/WizardStep3BusinessObject.module.css`
- Create: `src/components/wizard/__tests__/WizardStep3BusinessObject.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/wizard/__tests__/WizardStep3BusinessObject.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardStep3BusinessObject } from "../WizardStep3BusinessObject";
import type { SchemaNode } from "@/types";

function makeNode(name: string, children: SchemaNode[] = []): SchemaNode {
  return {
    id: `n-${name}`,
    name,
    documentation: "",
    minOccurs: "0",
    maxOccurs: "unbounded",
    type: children.length > 0 ? "complex" : "simple",
    typeName: children.length > 0 ? "" : "string",
    children,
    isRequired: false,
  };
}

const SCHEMA: SchemaNode[] = [
  makeNode("Schedule", [
    makeNode("Programme", [makeNode("Title"), makeNode("StartTime")]),
    makeNode("Channel", [makeNode("Name")]),
  ]),
];

describe("WizardStep3BusinessObject", () => {
  it("renders top-level element candidates from schema children", () => {
    render(<WizardStep3BusinessObject schema={SCHEMA} selectedXPath={null} onSelect={vi.fn()} />);
    expect(screen.getByText("Programme")).toBeInTheDocument();
    expect(screen.getByText("Channel")).toBeInTheDocument();
  });

  it("shows field count for each candidate", () => {
    render(<WizardStep3BusinessObject schema={SCHEMA} selectedXPath={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/2 fields/)).toBeInTheDocument();
  });

  it("clicking a candidate calls onSelect with //ElementName xpath", () => {
    const onSelect = vi.fn();
    render(<WizardStep3BusinessObject schema={SCHEMA} selectedXPath={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Programme/ }));
    expect(onSelect).toHaveBeenCalledWith("//Programme");
  });

  it("shows preview panel with child fields when candidate is selected", () => {
    render(<WizardStep3BusinessObject schema={SCHEMA} selectedXPath="//Programme" onSelect={vi.fn()} />);
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("StartTime")).toBeInTheDocument();
  });

  it("shows empty state when schema has no candidates", () => {
    render(<WizardStep3BusinessObject schema={[makeNode("Root", [])]} selectedXPath={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/No root elements found/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardStep3BusinessObject.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create WizardStep3BusinessObject.tsx**

Create `src/components/wizard/WizardStep3BusinessObject.tsx`:

```tsx
import { useState } from "react";
import type { SchemaNode } from "@/types";
import styles from "./WizardStep3BusinessObject.module.css";

interface WizardStep3BusinessObjectProps {
  readonly schema: readonly SchemaNode[];
  readonly selectedXPath: string | null;
  readonly onSelect: (xpath: string) => void;
}

function getCandidates(schema: readonly SchemaNode[]): readonly SchemaNode[] {
  if (schema.length === 0) return [];
  return schema[0].children.filter((n) => !n.isAttribute);
}

export function WizardStep3BusinessObject({ schema, selectedXPath, onSelect }: WizardStep3BusinessObjectProps) {
  const candidates = getCandidates(schema);
  const [hovered, setHovered] = useState<string | null>(null);

  if (candidates.length === 0) {
    return (
      <div className={styles["step"]}>
        <p className={styles["empty"]}>No root elements found in this schema. Go back and load a different file.</p>
      </div>
    );
  }

  const previewKey = selectedXPath
    ? selectedXPath.replace("//", "")
    : hovered;
  const previewNode = candidates.find((c) => c.name === previewKey) ?? candidates[0];
  const previewFields = previewNode.children.filter((c) => !c.isAttribute);

  return (
    <div className={styles["step"]}>
      <h2 className={styles["heading"]}>Choose your business object</h2>
      <p className={styles["sub"]}>Select the element that represents one row in your report</p>
      <div className={styles["layout"]}>
        <div className={styles["list"]} role="listbox" aria-label="Business object candidates">
          {candidates.map((candidate) => {
            const xpath = `//${candidate.name}`;
            const isSelected = selectedXPath === xpath;
            const fieldCount = candidate.children.filter((c) => !c.isAttribute).length;
            return (
              <button
                key={candidate.name}
                role="option"
                aria-selected={isSelected}
                aria-label={`${candidate.name} — ${fieldCount} fields`}
                className={`${styles["item"]} ${isSelected ? styles["itemSelected"] : ""}`}
                onClick={() => onSelect(xpath)}
                onMouseEnter={() => setHovered(candidate.name)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className={styles["itemName"]}>{candidate.name}</span>
                <span className={styles["itemCount"]}>{fieldCount} fields</span>
              </button>
            );
          })}
        </div>
        <div className={styles["preview"]}>
          <p className={styles["previewTitle"]}>{previewNode.name}</p>
          {previewFields.length === 0 ? (
            <p className={styles["previewEmpty"]}>No child fields</p>
          ) : (
            <ul className={styles["fieldList"]}>
              {previewFields.map((f) => (
                <li key={f.id} className={styles["fieldItem"]}>
                  <span className={styles["fieldName"]}>{f.name}</span>
                  <span className={styles["fieldType"]}>{f.typeName || "complex"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create WizardStep3BusinessObject.module.css**

Create `src/components/wizard/WizardStep3BusinessObject.module.css`:

```css
.step {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 2rem;
}

.heading {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
}

.sub {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-align: center;
  margin: 0;
}

.layout {
  display: flex;
  gap: 0.75rem;
  min-height: 200px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 160px;
  flex-shrink: 0;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.5rem 0.75rem;
  border-radius: 5px;
  border: 1px solid var(--color-border-primary);
  background: var(--color-bg-secondary);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.1s, background 0.1s;
}

.item:hover {
  border-color: var(--color-accent-green-dim);
  background: var(--color-bg-hover);
}

.itemSelected {
  border-color: var(--color-accent-green);
  background: var(--color-accent-green-bg);
}

.itemName {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.itemCount {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.preview {
  flex: 1;
  background: var(--color-bg-tertiary);
  border-radius: 5px;
  padding: 0.75rem;
  overflow-y: auto;
}

.previewTitle {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent-green);
  margin: 0 0 0.5rem;
}

.previewEmpty {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 0;
}

.fieldList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.fieldItem {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.75rem;
}

.fieldName {
  color: var(--color-text-secondary);
}

.fieldType {
  color: var(--color-text-muted);
  font-size: 0.7rem;
}

.empty {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  text-align: center;
  padding: 2rem;
}
```

- [ ] **Step 5: Run to verify tests pass**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardStep3BusinessObject.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/wizard/WizardStep3BusinessObject.tsx src/components/wizard/WizardStep3BusinessObject.module.css src/components/wizard/__tests__/WizardStep3BusinessObject.test.tsx
git commit -m "feat(wizard): WizardStep3BusinessObject — candidate list + preview panel"
```

---

## Task 7: WizardShell

**Files:**
- Create: `src/components/wizard/WizardShell.tsx`
- Create: `src/components/wizard/WizardShell.module.css`
- Create: `src/components/wizard/__tests__/WizardShell.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/wizard/__tests__/WizardShell.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppProvider, useAppDispatch, useAppSelector } from "@/state";
import { WizardShell } from "../WizardShell";
import type { SchemaNode } from "@/types";

function wrapper(props: { readonly children: ReactNode }) {
  return <AppProvider>{props.children}</AppProvider>;
}

function renderShell() {
  return render(<WizardShell />, { wrapper });
}

const MOCK_SCHEMA: readonly SchemaNode[] = [
  {
    id: "n0",
    name: "Schedule",
    documentation: "",
    minOccurs: "1",
    maxOccurs: "1",
    type: "complex",
    typeName: "",
    children: [
      { id: "n1", name: "Programme", documentation: "", minOccurs: "0", maxOccurs: "unbounded", type: "complex", typeName: "", children: [{ id: "n2", name: "Title", documentation: "", minOccurs: "0", maxOccurs: "1", type: "simple", typeName: "string", children: [], isRequired: false }], isRequired: false },
    ],
    isRequired: true,
  },
];

beforeEach(() => {
  localStorage.clear();
});

describe("WizardShell", () => {
  it("starts at step 1 by default", () => {
    renderShell();
    expect(screen.getByRole("radio", { name: /XSD Schema/ })).toBeInTheDocument();
  });

  it("Next button is disabled when no source selected on step 1", () => {
    renderShell();
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
  });

  it("Next button is enabled after selecting a source", () => {
    renderShell();
    fireEvent.click(screen.getByRole("radio", { name: /XSD Schema/ }));
    expect(screen.getByRole("button", { name: /Next/ })).not.toBeDisabled();
  });

  it("advances to step 2 after selecting source and clicking Next", () => {
    renderShell();
    fireEvent.click(screen.getByRole("radio", { name: /XSD Schema/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText(/Upload your XSD schema/)).toBeInTheDocument();
  });

  it("Back button on step 2 returns to step 1", () => {
    renderShell();
    fireEvent.click(screen.getByRole("radio", { name: /XSD Schema/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByRole("radio", { name: /XSD Schema/ })).toBeInTheDocument();
  });

  it("persists wizard progress to localStorage", () => {
    renderShell();
    fireEvent.click(screen.getByRole("radio", { name: /XSD Schema/ }));
    const stored = JSON.parse(localStorage.getItem("iksemel-wizard") ?? "{}") as { selectedSource?: string };
    expect(stored.selectedSource).toBe("xsd");
  });

  it("restores selectedSource from localStorage on mount", () => {
    localStorage.setItem("iksemel-wizard", JSON.stringify({ step: 1, selectedSource: "xml-sample" }));
    renderShell();
    expect(screen.getByRole("radio", { name: /XML Sample/ })).toHaveAttribute("aria-checked", "true");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardShell.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create WizardShell.tsx**

Create `src/components/wizard/WizardShell.tsx`:

```tsx
import { useState, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/state";
import type { SchemaNode, ParseWarning } from "@/types";
import { WizardStepIndicator } from "./WizardStepIndicator";
import { WizardStep1DataSource } from "./WizardStep1DataSource";
import { WizardStep2LoadData } from "./WizardStep2LoadData";
import { WizardStep3BusinessObject } from "./WizardStep3BusinessObject";
import styles from "./WizardShell.module.css";

type WizardStep = 1 | 2 | 3;
type SourceType = "xsd" | "xml-sample";

const WIZARD_STORAGE_KEY = "iksemel-wizard";

interface WizardLocalState {
  step: WizardStep;
  selectedSource: SourceType | null;
}

function loadWizardState(): WizardLocalState {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WizardLocalState>;
      return {
        step: (parsed.step as WizardStep) ?? 1,
        selectedSource: parsed.selectedSource ?? null,
      };
    }
  } catch {
    // ignore
  }
  return { step: 1, selectedSource: null };
}

function saveWizardState(state: WizardLocalState): void {
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearWizardState(): void {
  try {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function WizardShell() {
  const dispatch = useAppDispatch();
  const schema = useAppSelector((s) => s.schema);
  const rowSource = useAppSelector((s) => s.rowSource);

  const [local, setLocal] = useState<WizardLocalState>(() => {
    const saved = loadWizardState();
    // Fast-forward based on AppState
    if (schema !== null) {
      return { ...saved, step: 3 };
    }
    return saved;
  });

  useEffect(() => {
    saveWizardState(local);
  }, [local]);

  const completedSteps = new Set<WizardStep>();
  if (local.step > 1) completedSteps.add(1);
  if (local.step > 2) completedSteps.add(2);
  if (rowSource) completedSteps.add(3);

  const handleStepClick = useCallback((step: WizardStep) => {
    setLocal((prev) => ({ ...prev, step }));
  }, []);

  const handleSourceSelect = useCallback((source: SourceType) => {
    setLocal((prev) => ({ ...prev, selectedSource: source }));
  }, []);

  const handleSchemaLoaded = useCallback(
    (roots: readonly SchemaNode[], warnings: readonly ParseWarning[]) => {
      dispatch({ type: "LOAD_SCHEMA", roots, warnings });
      setLocal((prev) => ({ ...prev, step: 3 }));
    },
    [dispatch],
  );

  const handleCandidateSelect = useCallback(
    (xpath: string) => {
      dispatch({ type: "SET_ROW_SOURCE", rowSource: xpath });
    },
    [dispatch],
  );

  const handleFinish = useCallback(() => {
    clearWizardState();
    dispatch({ type: "SET_UI_MODE", uiMode: "expert" });
    dispatch({ type: "SET_ACTIVE_TAB", tab: "design" });
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (local.step < 3) setLocal((prev) => ({ ...prev, step: (prev.step + 1) as WizardStep }));
    if (local.step === 3) handleFinish();
  }, [local.step, handleFinish]);

  const handleBack = useCallback(() => {
    if (local.step > 1) setLocal((prev) => ({ ...prev, step: (prev.step - 1) as WizardStep }));
  }, [local.step]);

  const handleExitToExpert = useCallback(() => {
    dispatch({ type: "SET_UI_MODE", uiMode: "expert" });
  }, [dispatch]);

  const isNextEnabled =
    (local.step === 1 && local.selectedSource !== null) ||
    (local.step === 2 && schema !== null) ||
    (local.step === 3 && rowSource !== "");

  return (
    <div className={styles["shell"]}>
      <WizardStepIndicator
        currentStep={local.step}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      <div className={styles["content"]}>
        {local.step === 1 && (
          <WizardStep1DataSource
            selectedSource={local.selectedSource}
            onSelect={handleSourceSelect}
          />
        )}
        {local.step === 2 && local.selectedSource && (
          <WizardStep2LoadData
            source={local.selectedSource}
            onLoaded={handleSchemaLoaded}
          />
        )}
        {local.step === 3 && (
          <WizardStep3BusinessObject
            schema={schema ?? []}
            selectedXPath={rowSource || null}
            onSelect={handleCandidateSelect}
          />
        )}
      </div>

      <div className={styles["nav"]}>
        <button
          className={styles["exitLink"]}
          onClick={handleExitToExpert}
        >
          Exit to Expert Mode
        </button>
        <div className={styles["navButtons"]}>
          {local.step > 1 && (
            <button className={styles["backBtn"]} onClick={handleBack}>
              ← Back
            </button>
          )}
          <button
            className={styles["nextBtn"]}
            onClick={handleNext}
            disabled={!isNextEnabled}
          >
            {local.step === 3 ? "Finish" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create WizardShell.module.css**

Create `src/components/wizard/WizardShell.module.css`:

```css
.shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 0 1rem 1rem;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-primary);
}

.navButtons {
  display: flex;
  gap: 0.5rem;
}

.exitLink {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.exitLink:hover {
  color: var(--color-text-secondary);
}

.backBtn {
  padding: 0.45rem 1rem;
  border-radius: 5px;
  border: 1px solid var(--color-border-primary);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
}

.backBtn:hover {
  border-color: var(--color-border-focus);
}

.nextBtn {
  padding: 0.45rem 1.25rem;
  border-radius: 5px;
  border: 1px solid var(--color-accent-green);
  background: var(--color-accent-green);
  color: var(--color-bg-primary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.nextBtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nextBtn:not(:disabled):hover {
  background: var(--color-accent-green-dim);
  border-color: var(--color-accent-green-dim);
}
```

- [ ] **Step 5: Run to verify tests pass**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardShell.test.tsx
```

Expected: all 7 tests PASS.

- [ ] **Step 6: Create the barrel export**

Create `src/components/wizard/index.ts`:

```ts
export { WizardShell } from "./WizardShell";
```

- [ ] **Step 7: Commit**

```bash
git add src/components/wizard/WizardShell.tsx src/components/wizard/WizardShell.module.css src/components/wizard/__tests__/WizardShell.test.tsx src/components/wizard/index.ts
git commit -m "feat(wizard): WizardShell — step coordinator with localStorage persistence"
```

---

## Task 8: AppHeader mode toggle

**Files:**
- Modify: `src/app/components/AppHeader.tsx`
- Modify: `src/app/components/AppHeader.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to the `describe("AppHeader")` block in `src/app/components/AppHeader.test.tsx`:

```tsx
it("shows Guided Setup button when in expert mode", () => {
  render(
    <AppHeader
      isEmbedded={false}
      hasSchema={false}
      hasPolicyErrors={false}
      onSendPackageReady={() => {}}
      onSchemaLoad={() => {}}
      onShowShortcuts={() => {}}
      uiMode="expert"
      onRequestModeSwitch={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: /Guided Setup/ })).toBeInTheDocument();
});

it("shows Expert Mode button when in wizard mode", () => {
  render(
    <AppHeader
      isEmbedded={false}
      hasSchema={false}
      hasPolicyErrors={false}
      onSendPackageReady={() => {}}
      onSchemaLoad={() => {}}
      onShowShortcuts={() => {}}
      uiMode="wizard"
      onRequestModeSwitch={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: /Expert Mode/ })).toBeInTheDocument();
});

it("fires onRequestModeSwitch when toggle button is clicked", () => {
  const onRequestModeSwitch = vi.fn();
  render(
    <AppHeader
      isEmbedded={false}
      hasSchema={false}
      hasPolicyErrors={false}
      onSendPackageReady={() => {}}
      onSchemaLoad={() => {}}
      onShowShortcuts={() => {}}
      uiMode="expert"
      onRequestModeSwitch={onRequestModeSwitch}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Guided Setup/ }));
  expect(onRequestModeSwitch).toHaveBeenCalledTimes(1);
});
```

Also update the existing tests in this file to pass `uiMode="expert"` and `onRequestModeSwitch={() => {}}` to all existing `<AppHeader ... />` renders (required because the props are now required).

- [ ] **Step 2: Run to verify new tests fail**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/app/components/AppHeader.test.tsx
```

Expected: FAIL on the new tests.

- [ ] **Step 3: Update AppHeader to add uiMode toggle**

In `src/app/components/AppHeader.tsx`, update the interface:

```ts
interface AppHeaderProps {
  readonly isEmbedded: boolean;
  readonly hasSchema: boolean;
  readonly hasPolicyErrors: boolean;
  readonly onSendPackageReady: () => void;
  readonly onSchemaLoad: (xsdText: string) => void;
  readonly onShowShortcuts: () => void;
  readonly onStartTour?: () => void;
  readonly uiMode: "expert" | "wizard";
  readonly onRequestModeSwitch: () => void;
}
```

Destructure the new props:

```ts
const { isEmbedded, hasSchema, hasPolicyErrors, onSendPackageReady, onSchemaLoad, onShowShortcuts, onStartTour, uiMode, onRequestModeSwitch } = props;
```

Add the toggle button before the `?` button, inside the `<header>` return:

```tsx
<Button size="sm" variant="ghost" onClick={onRequestModeSwitch}>
  {uiMode === "expert" ? "Guided Setup" : "Expert Mode"}
</Button>
```

- [ ] **Step 4: Run to verify tests pass**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/app/components/AppHeader.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Type-check**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx tsc --noEmit
```

Fix any TypeScript errors from the new required props (App.tsx will need updating in the next task).

- [ ] **Step 6: Commit**

```bash
git add src/app/components/AppHeader.tsx src/app/components/AppHeader.test.tsx
git commit -m "feat(header): add uiMode toggle button to AppHeader"
```

---

## Task 9: App.tsx — wire wizard + confirmation modal

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add uiMode selector and wizard imports**

At the top of `src/App.tsx`, add:

```ts
import { WizardShell, clearWizardState } from "@components/wizard";
```

Inside the `App` function, add after the existing selectors:

```ts
const uiMode = useAppSelector((state) => state.uiMode);
const [showModeConfirm, setShowModeConfirm] = useState(false);
```

- [ ] **Step 2: Add the confirmation modal JSX**

In the `return` block, add after the `<DiffOverlay>`:

```tsx
{showModeConfirm && (
  <div className={styles["modalOverlay"]} role="dialog" aria-modal="true" aria-label="Switch to Guided Setup">
    <div className={styles["modal"]}>
      <p>You have a schema loaded. Start a new guided setup, or continue from your current configuration?</p>
      <div className={styles["modalButtons"]}>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            clearWizardState();
            dispatch({ type: "RESET" });
            dispatch({ type: "SET_UI_MODE", uiMode: "wizard" });
            setShowModeConfirm(false);
          }}
        >
          Start Fresh
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            dispatch({ type: "SET_UI_MODE", uiMode: "wizard" });
            setShowModeConfirm(false);
          }}
        >
          Continue
        </Button>
        <Button size="sm" onClick={() => setShowModeConfirm(false)}>
          Cancel
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Add the handleRequestModeSwitch callback**

Inside the `App` function, add:

```ts
const handleRequestModeSwitch = useCallback(() => {
  if (uiMode === "wizard") {
    dispatch({ type: "SET_UI_MODE", uiMode: "expert" });
    return;
  }
  if (schema !== null) {
    setShowModeConfirm(true);
  } else {
    dispatch({ type: "SET_UI_MODE", uiMode: "wizard" });
  }
}, [uiMode, schema, dispatch]);
```

- [ ] **Step 4: Pass new props to AppHeader and switch render based on uiMode**

Update the `<AppHeader>` call to pass:

```tsx
uiMode={uiMode}
onRequestModeSwitch={handleRequestModeSwitch}
```

Wrap the `<MainLayout>` block in a conditional:

```tsx
{uiMode === "wizard" ? (
  <WizardShell />
) : (
  <MainLayout hasSchema={hasSchema} isEmbedded={isEmbedded} onSchemaLoad={handleSchemaLoad}>
    <>
      <LeftPanel {...leftPanelViewModel} />
      <ResizeHandle ... />
      <RightTabs {...rightTabsViewModel} />
    </>
  </MainLayout>
)}
```

- [ ] **Step 5: Add modal CSS to App.module.css**

Append to `src/App.module.css`:

```css
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal p {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

.modalButtons {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
```

- [ ] **Step 6: Type-check and run full test suite**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx tsc --noEmit && npx vitest run
```

Expected: 0 type errors; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.module.css
git commit -m "feat(app): wire wizard shell and mode-switch confirmation modal"
```

---

## Task 10: Keyboard navigation

**Files:**
- Modify: `src/components/wizard/WizardStep1DataSource.tsx`
- Modify: `src/components/wizard/WizardStep3BusinessObject.tsx`
- Modify: `src/components/wizard/WizardShell.tsx`

- [ ] **Step 1: Write failing tests for arrow key navigation in Step 1**

Append to `src/components/wizard/__tests__/WizardStep1DataSource.test.tsx`:

```tsx
it("ArrowDown moves focus from XSD card to XML Sample card", () => {
  render(<WizardStep1DataSource selectedSource={null} onSelect={vi.fn()} />);
  const xsdCard = screen.getByRole("radio", { name: /XSD Schema/ });
  xsdCard.focus();
  fireEvent.keyDown(xsdCard, { key: "ArrowDown" });
  expect(document.activeElement).toBe(screen.getByRole("radio", { name: /XML Sample/ }));
});

it("ArrowUp wraps to last card from first card", () => {
  render(<WizardStep1DataSource selectedSource={null} onSelect={vi.fn()} />);
  const xsdCard = screen.getByRole("radio", { name: /XSD Schema/ });
  xsdCard.focus();
  fireEvent.keyDown(xsdCard, { key: "ArrowUp" });
  expect(document.activeElement).toBe(screen.getByRole("radio", { name: /XML Sample/ }));
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardStep1DataSource.test.tsx
```

Expected: FAIL on the 2 new tests.

- [ ] **Step 3: Add roving tabindex + arrow key handler to WizardStep1DataSource**

In `src/components/wizard/WizardStep1DataSource.tsx`, add `useRef` and `useCallback` imports, then replace the component body:

```tsx
import { useRef, useCallback } from "react";
import styles from "./WizardStep1DataSource.module.css";

type SourceType = "xsd" | "xml-sample";

interface WizardStep1DataSourceProps {
  readonly selectedSource: SourceType | null;
  readonly onSelect: (source: SourceType) => void;
}

const SOURCES: { id: SourceType; label: string; detail: string }[] = [
  { id: "xsd", label: "XSD Schema", detail: "Upload an XML Schema Definition file · Precise field types" },
  { id: "xml-sample", label: "XML Sample", detail: "Infer structure from a real XML file · Good when no XSD available" },
];

export function WizardStep1DataSource({ selectedSource, onSelect }: WizardStep1DataSourceProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      refs.current[(index + 1) % SOURCES.length]?.focus();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      refs.current[(index - 1 + SOURCES.length) % SOURCES.length]?.focus();
    }
  }, []);

  return (
    <div className={styles["step"]}>
      <h2 className={styles["heading"]}>Choose your data source</h2>
      <div className={styles["list"]} role="radiogroup" aria-label="Data source">
        {SOURCES.map(({ id, label, detail }, index) => {
          const isSelected = selectedSource === id;
          return (
            <button
              key={id}
              ref={(el) => { refs.current[index] = el; }}
              role="radio"
              aria-checked={isSelected}
              aria-label={label}
              className={`${styles["card"]} ${isSelected ? styles["cardSelected"] : ""}`}
              onClick={() => onSelect(id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <div className={styles["cardBody"]}>
                <span className={styles["cardLabel"]}>{label}</span>
                <span className={styles["cardDetail"]}>{detail}</span>
              </div>
              {isSelected && <span className={styles["check"]} aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify Step 1 keyboard tests pass**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardStep1DataSource.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Add Escape key handler to WizardShell**

In `src/components/wizard/WizardShell.tsx`, add a `useEffect` after the existing effects:

```ts
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== "Escape") return;
    if (local.step > 1) {
      setLocal((prev) => ({ ...prev, step: (prev.step - 1) as WizardStep }));
    } else {
      dispatch({ type: "SET_UI_MODE", uiMode: "expert" });
    }
  }
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [local.step, dispatch]);
```

- [ ] **Step 6: Write failing test for Escape in WizardShell**

Append to `src/components/wizard/__tests__/WizardShell.test.tsx`:

```tsx
it("Escape on step 2 goes back to step 1", () => {
  renderShell();
  fireEvent.click(screen.getByRole("radio", { name: /XSD Schema/ }));
  fireEvent.click(screen.getByRole("button", { name: /Next/ }));
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.getByRole("radio", { name: /XSD Schema/ })).toBeInTheDocument();
});
```

- [ ] **Step 7: Run to verify it passes**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run src/components/wizard/__tests__/WizardShell.test.tsx
```

Expected: all 8 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/wizard/WizardStep1DataSource.tsx src/components/wizard/WizardShell.tsx src/components/wizard/__tests__/WizardStep1DataSource.test.tsx src/components/wizard/__tests__/WizardShell.test.tsx
git commit -m "feat(wizard): keyboard navigation — arrow keys and Escape"
```

---

## Task 11: Full verification

- [ ] **Step 1: Run the full test suite**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run
```

Expected: all tests pass (existing 640+ and all new wizard tests).

- [ ] **Step 2: Type-check**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Verify wizard coverage**

```bash
cd /mnt/c/Projects/iksemel/Iksemel && npx vitest run --coverage --reporter=verbose src/components/wizard
```

Expected: ≥ 80% coverage across wizard components.

- [ ] **Step 4: Commit any final fixups**

```bash
git add -p   # stage only actual changes
git commit -m "chore(wizard): 3-EVO.1 complete — wizard shell, steps 1–3, mode toggle"
```
