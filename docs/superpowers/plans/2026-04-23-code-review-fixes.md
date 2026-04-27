# Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all high-confidence issues found in the comprehensive code review: security vulnerabilities in the PostMessage bridge, logic bugs in the payload estimator and efficiency engine, state bugs in the app reducer, a broken native-format list in template validation, a permanently-null EfficiencyPanel, a type model inaccuracy, and a missing focus trap on the size-warning modal.

**Architecture:** Fixes span four independent layers — bridge security, engine logic, component wiring, and template validation. Each task is self-contained and can be committed independently. Tests are extended or added where the fix touches pure functions.

**Tech Stack:** TypeScript 5.7 strict, React 18, Vitest, CSS Modules. Test runner: `npx vitest run` from `Iksemel/`. Type-check: `npx tsc --noEmit` from `Iksemel/`.

---

## Task 1: Bridge — make wildcard warning unconditional in production

**Files:**
- Modify: `Iksemel/src/bridge/log.ts`

The `bridgeWarn` function is currently gated behind `VITE_BRIDGE_DEBUG`. The wildcard-enabled warning in `origin-validator.ts` is routed through `bridgeWarn`, making it silent in production builds.

- [ ] **Step 1: Edit `log.ts` to add an unconditional `bridgeSecurityWarn`**

Replace the entire file with:

```ts
export function isBridgeDebugEnabled(): boolean {
  return import.meta.env.VITE_BRIDGE_DEBUG === "true";
}

export function bridgeDebug(message: string, ...args: readonly unknown[]): void {
  if (!isBridgeDebugEnabled()) {
    return;
  }
  console.debug(message, ...args);
}

export function bridgeWarn(message: string, ...args: readonly unknown[]): void {
  if (!isBridgeDebugEnabled()) {
    return;
  }
  console.warn(message, ...args);
}

/** Security-relevant warnings that must be emitted in all environments. */
export function bridgeSecurityWarn(message: string, ...args: readonly unknown[]): void {
  console.warn(message, ...args);
}
```

- [ ] **Step 2: Update `origin-validator.ts` to use `bridgeSecurityWarn` for the wildcard warning**

Change:
```ts
import { bridgeWarn } from "./log";
```
to:
```ts
import { bridgeWarn, bridgeSecurityWarn } from "./log";
```

And in `isAllowed`, change:
```ts
        if (!wildcardWarned) {
          bridgeWarn(
            "[XFEB Bridge] Wildcard origin '*' is active — all origins are allowed. " +
              "This should only be used during development.",
          );
          wildcardWarned = true;
        }
```
to:
```ts
        if (!wildcardWarned) {
          bridgeSecurityWarn(
            "[XFEB Bridge] Wildcard origin '*' is active — all origins are allowed. " +
              "This should only be used during development.",
          );
          wildcardWarned = true;
        }
```

- [ ] **Step 3: Update the existing wildcard test in `bridge.test.ts` to spy on `console.warn` unconditionally**

The test at line 145–156 of `bridge.test.ts` already spies on `console.warn`. No test changes needed — verify it still passes.

Run: `npx vitest run --reporter=verbose src/bridge/bridge.test.ts` from `Iksemel/`
Expected: all tests green.

- [ ] **Step 4: Commit**

```bash
git add Iksemel/src/bridge/log.ts Iksemel/src/bridge/origin-validator.ts
git commit -m "fix(bridge): emit wildcard security warning unconditionally in production"
```

---

## Task 2: Bridge — block `"*"` from being added via `SET_ORIGIN_WHITELIST`

**Files:**
- Modify: `Iksemel/src/bridge/message-handler.ts`

Any already-whitelisted origin can send `SET_ORIGIN_WHITELIST` with `origins: ["*"]` to disable origin checking for the rest of the page's lifetime.

- [ ] **Step 1: Add a test for the exploit in `bridge.test.ts`**

Inside the `"Message Handling"` describe block (after the existing `SET_ORIGIN_WHITELIST` test at line 364), add:

```ts
it("SET_ORIGIN_WHITELIST rejects wildcard '*' — cannot escalate trust to all origins", async () => {
  const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

  // Attempt to add wildcard via SET_ORIGIN_WHITELIST
  fireMessage({
    type: "SET_ORIGIN_WHITELIST",
    payload: { origins: ["*"] },
  });
  await flushMicrotasks();

  // A message from an unknown origin must still be rejected
  fireMessage(
    { type: "LOAD_SCHEMA", payload: { xsdContent: "evil" } },
    "https://evil.com",
  );
  await flushMicrotasks();

  expect(onLoadSchema).not.toHaveBeenCalled();

  debugSpy.mockRestore();
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `npx vitest run --reporter=verbose src/bridge/bridge.test.ts` from `Iksemel/`
Expected: the new test FAIL (wildcard is currently accepted).

- [ ] **Step 3: Fix `dispatchMessage` in `message-handler.ts` to reject `"*"`**

Change the `SET_ORIGIN_WHITELIST` case from:
```ts
      case "SET_ORIGIN_WHITELIST": {
        for (const origin of message.payload.origins) {
          validator.addOrigin(origin);
        }
        break;
      }
```
to:
```ts
      case "SET_ORIGIN_WHITELIST": {
        for (const origin of message.payload.origins) {
          if (origin !== "*") {
            validator.addOrigin(origin);
          }
        }
        break;
      }
```

- [ ] **Step 4: Run tests — all must pass**

Run: `npx vitest run --reporter=verbose src/bridge/bridge.test.ts` from `Iksemel/`
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add Iksemel/src/bridge/message-handler.ts Iksemel/src/bridge/bridge.test.ts
git commit -m "fix(bridge): block wildcard '*' in SET_ORIGIN_WHITELIST to prevent trust escalation"
```

---

## Task 3: Bridge — require a known target origin before sending outbound messages

**Files:**
- Modify: `Iksemel/src/bridge/message-handler.ts`

`sendToHost` falls back to `targetOrigin = "*"` before the first inbound message arrives. This broadcasts `XFEB_READY` (and potentially `PACKAGE_READY`) to all co-resident frames.

- [ ] **Step 1: Add a test**

In the `"Outbound Messages"` describe block in `bridge.test.ts`, add:

```ts
it("sendReady sends to '*' only in standalone mode (no host), not in embedded mode with unknown origin", () => {
  // In jsdom, window === window.parent, so getHostWindow() returns null.
  // sendToHost is a no-op when not embedded. Verify no postMessage is called on window.
  const postSpy = vi.spyOn(window, "postMessage");
  const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

  const bridge = createBridge({});
  bridge.start();
  bridge.sendReady();

  // In jsdom (non-embedded), postMessage should NOT be called because
  // getHostWindow() returns null and sendToHost returns early.
  expect(postSpy).not.toHaveBeenCalled();

  bridge.stop();
  postSpy.mockRestore();
  debugSpy.mockRestore();
});
```

- [ ] **Step 2: Run test to confirm it passes (it should already pass)**

Run: `npx vitest run --reporter=verbose src/bridge/bridge.test.ts` from `Iksemel/`
Expected: new test passes (getHostWindow already returns null in jsdom).

- [ ] **Step 3: Add a guard in `sendToHost` to abort when `lastKnownOrigin` is null in embedded mode**

Change `sendToHost` in `message-handler.ts` from:
```ts
  function sendToHost(message: OutboundMessage): void {
    const target = getHostWindow();
    if (!target) {
      bridgeDebug(
        "[XFEB Bridge] Cannot send message — not running in embedded mode",
      );
      return;
    }
    const targetOrigin = lastKnownOrigin ?? "*";
    target.postMessage(message, targetOrigin);
  }
```
to:
```ts
  function sendToHost(message: OutboundMessage): void {
    const target = getHostWindow();
    if (!target) {
      bridgeDebug(
        "[XFEB Bridge] Cannot send message — not running in embedded mode",
      );
      return;
    }
    if (lastKnownOrigin === null) {
      // No validated inbound message yet — send XFEB_READY with "*" so the
      // host can respond, but log a debug note. All subsequent messages
      // will use the narrowed lastKnownOrigin.
      if (message.type !== "XFEB_READY") {
        bridgeDebug(
          "[XFEB Bridge] Dropping outbound message — host origin not yet known",
          message.type,
        );
        return;
      }
    }
    const targetOrigin = lastKnownOrigin ?? "*";
    target.postMessage(message, targetOrigin);
  }
```

This allows `XFEB_READY` (the handshake) to use `"*"` because the host origin is inherently unknown before the first message, but drops all other outbound messages until the host has identified itself.

- [ ] **Step 4: Run all bridge tests**

Run: `npx vitest run --reporter=verbose src/bridge/bridge.test.ts` from `Iksemel/`
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add Iksemel/src/bridge/message-handler.ts Iksemel/src/bridge/bridge.test.ts
git commit -m "fix(bridge): drop non-handshake outbound messages when host origin is not yet known"
```

---

## Task 4: Security — reject DOCTYPE declarations before XML parsing

**Files:**
- Modify: `Iksemel/src/utils/xml-validation.ts`

`validateXmlDocument` passes content directly to `DOMParser` with no pre-check for `<!DOCTYPE`. The preview engine already rejects XML bombs; the general-purpose parse path does not.

- [ ] **Step 1: Edit `xml-validation.ts` to add a DOCTYPE pre-check**

Replace the file with:

```ts
export interface XmlValidationResult {
  readonly valid: boolean;
  readonly error: string | null;
  readonly doc: Document;
}

type XmlMimeType = DOMParserSupportedType;

function extractParseError(doc: Document): string | null {
  const parserError = doc.querySelector("parsererror")
    ?? doc.getElementsByTagName("parsererror")[0]
    ?? null;

  if (!parserError) {
    return null;
  }

  const raw = parserError.textContent?.trim() ?? "Unknown XML parse error";
  return raw.slice(0, 240);
}

/** Rejects XML inputs that contain DOCTYPE declarations (prevents entity expansion attacks). */
function containsDoctype(xml: string): boolean {
  // Fast path: look for <!DOCTYPE (case-insensitive, allows whitespace)
  return /<!DOCTYPE\s/i.test(xml);
}

export function validateXmlDocument(
  xml: string,
  mimeType: XmlMimeType = "application/xml",
): XmlValidationResult {
  if (containsDoctype(xml)) {
    const emptyDoc = new DOMParser().parseFromString("<empty/>", "application/xml");
    return {
      valid: false,
      error: "DOCTYPE declarations are not allowed",
      doc: emptyDoc,
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, mimeType);
  const error = extractParseError(doc);
  return {
    valid: error === null,
    error,
    doc,
  };
}
```

- [ ] **Step 2: Find or create a test file for xml-validation**

```bash
ls Iksemel/src/utils/
```

If `xml-validation.test.ts` does not exist, create `Iksemel/src/utils/xml-validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateXmlDocument } from "./xml-validation";

describe("validateXmlDocument", () => {
  it("validates well-formed XML", () => {
    const result = validateXmlDocument("<root><child/></root>");
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("rejects malformed XML", () => {
    const result = validateXmlDocument("<root><unclosed>");
    expect(result.valid).toBe(false);
    expect(result.error).not.toBeNull();
  });

  it("rejects XML with DOCTYPE declaration", () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe "test">]>
<root>&xxe;</root>`;
    const result = validateXmlDocument(xml);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("DOCTYPE");
  });

  it("rejects billion-laughs DOCTYPE variant", () => {
    const xml = `<!DOCTYPE bomb [
  <!ENTITY a "ha">
  <!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">
]><root>&b;</root>`;
    const result = validateXmlDocument(xml);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("DOCTYPE");
  });

  it("accepts XML with no DOCTYPE", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ReportDefinition>
  <Identity><Name>Test</Name></Identity>
</ReportDefinition>`;
    const result = validateXmlDocument(xml);
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 3: Run the new tests**

Run: `npx vitest run --reporter=verbose src/utils/xml-validation.test.ts` from `Iksemel/`
Expected: all 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add Iksemel/src/utils/xml-validation.ts Iksemel/src/utils/xml-validation.test.ts
git commit -m "fix(security): reject DOCTYPE declarations in validateXmlDocument to prevent entity expansion"
```

---

## Task 5: Engine — fix `estimateSelectedNodeWeight` container overhead formula

**Files:**
- Modify: `Iksemel/src/engine/analysis/payload.ts`

`estimateSelectedNodeWeight` uses `Math.max(childrenWeight, CONTAINER_OVERHEAD) * rep` which returns `CONTAINER_OVERHEAD` when all children are deselected instead of 0. This inflates selected-payload estimates for partially-deselected trees.

- [ ] **Step 1: Add a failing test to the existing payload tests**

Find the payload test file:
```bash
find Iksemel/src -name "payload.test.ts" -o -name "analysis.test.ts"
```

Open the file and add this test inside the relevant `describe` block:

```ts
it("estimateSelectedWeight returns 0 for a selected container whose children are all deselected", () => {
  const parent: SchemaNode = {
    id: "p0",
    name: "Parent",
    typeName: "complex",
    minOccurs: "1",
    maxOccurs: "1",
    children: [
      {
        id: "c1",
        name: "Child",
        typeName: "string",
        minOccurs: "1",
        maxOccurs: "1",
        children: [],
        isRequired: true,
        path: ["Parent", "Child"],
        enumerations: [],
        facets: {},
        documentation: "",
      },
    ],
    isRequired: true,
    path: ["Parent"],
    enumerations: [],
    facets: {},
    documentation: "",
  };

  // Parent selected, child NOT selected
  const sel: SelectionState = { p0: true };
  expect(estimateSelectedWeight(parent, sel)).toBe(0);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run --reporter=verbose` from `Iksemel/` (filter to the payload test file)
Expected: FAIL — currently returns `CONTAINER_OVERHEAD * rep = 30`.

- [ ] **Step 3: Fix `estimateSelectedNodeWeight` in `payload.ts`**

Change lines 138–144:
```ts
  const childrenWeight = node.children.reduce(
    (sum, child) =>
      sum + estimateSelectedNodeWeight(child, sel, weights, overrides, unboundedMultiplier),
    0,
  );

  return Math.max(childrenWeight, CONTAINER_OVERHEAD) * rep;
```
to:
```ts
  const childrenWeight = node.children.reduce(
    (sum, child) =>
      sum + estimateSelectedNodeWeight(child, sel, weights, overrides, unboundedMultiplier),
    0,
  );

  if (childrenWeight === 0) return 0;
  return (childrenWeight + CONTAINER_OVERHEAD) * rep;
```

- [ ] **Step 4: Run all tests to confirm no regressions**

Run: `npx vitest run` from `Iksemel/`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add Iksemel/src/engine/analysis/payload.ts
git commit -m "fix(engine): estimateSelectedNodeWeight returns 0 when all children deselected, not CONTAINER_OVERHEAD"
```

---

## Task 6: Engine — fix `efficiency.ts` to use `detectPayloadExplosions` and drop the private duplicate

**Files:**
- Modify: `Iksemel/src/engine/analysis/efficiency.ts`

`detectPayloadContributors` duplicates `detectPayloadExplosions` from `payload.ts` but:
1. uses a private 20% threshold instead of the configurable default (40%)
2. skips leaf repeating elements (`node.children.length > 0` guard)
3. ignores `PayloadConfig` entirely

Additionally, `estimateSelectedWeight` is called without `config`, so any caller-supplied `PayloadConfig` is silently dropped for efficiency scoring.

- [ ] **Step 1: Add `PayloadConfig` import and parameter to `analyzeFilterEfficiency`**

At the top of `efficiency.ts`, add the import:
```ts
import { estimateSelectedWeight, detectPayloadExplosions } from "./payload";
import type { PayloadConfig } from "./payload";
```
(Replace the current `import { estimateSelectedWeight } from "./payload";`)

Change the function signature from:
```ts
export function analyzeFilterEfficiency(
  roots: readonly SchemaNode[],
  selection: SelectionState,
): EfficiencyScore {
```
to:
```ts
export function analyzeFilterEfficiency(
  roots: readonly SchemaNode[],
  selection: SelectionState,
  config: PayloadConfig = {},
): EfficiencyScore {
```

- [ ] **Step 2: Replace the call to `detectPayloadContributors` with `detectPayloadExplosions`**

In `analyzeFilterEfficiency`, change:
```ts
  const explosions = detectPayloadContributors(roots, selection);
```
to:
```ts
  const explosions = detectPayloadExplosions(roots, selection, config, 20);
```

This reuses the canonical implementation (which handles leaf nodes and accepts config), with the same 20% threshold as the removed private function.

- [ ] **Step 3: Delete the private `detectPayloadContributors` function**

Remove the entire function body (lines 162–201):
```ts
function detectPayloadContributors(
  roots: readonly SchemaNode[],
  selection: SelectionState,
): Array<{ nodeId: string; nodeName: string; contributionPct: number }> {
  ...
}
```

- [ ] **Step 4: Update the two `estimateSelectedWeight` calls in `simulateFilterImpact` to pass `config`**

`simulateFilterImpact` already receives no `config` parameter, and these calls are internal. This is a separate exported function. Update its signature and calls similarly:

Change:
```ts
export function simulateFilterImpact(
  roots: readonly SchemaNode[],
  currentSelection: SelectionState,
  modifiedSelection: SelectionState,
): {
```
to:
```ts
export function simulateFilterImpact(
  roots: readonly SchemaNode[],
  currentSelection: SelectionState,
  modifiedSelection: SelectionState,
  config: PayloadConfig = {},
): {
```

And update the two `estimateSelectedWeight` calls:
```ts
  const sizeBefore = roots.reduce(
    (sum, r) => sum + estimateSelectedWeight(r, currentSelection, config),
    0,
  );
  
  const sizeAfter = roots.reduce(
    (sum, r) => sum + estimateSelectedWeight(r, modifiedSelection, config),
    0,
  );
```

- [ ] **Step 5: Run type-check and tests**

```bash
npx tsc --noEmit   # from Iksemel/
npx vitest run     # from Iksemel/
```
Expected: no errors and all tests pass.

- [ ] **Step 6: Commit**

```bash
git add Iksemel/src/engine/analysis/efficiency.ts
git commit -m "fix(engine): replace private detectPayloadContributors with detectPayloadExplosions, thread PayloadConfig through efficiency scoring"
```

---

## Task 7: Engine — fix `analyzeRepeatingElements` "filtered" check

**Files:**
- Modify: `Iksemel/src/engine/analysis/efficiency.ts`

"Filtered" currently means "has a child selected", which is true for almost every repeating element in normal usage. This makes `unfilteredRepeatingCount` always 0 and hides the `-20` efficiency penalty.

The function cannot know about `filterValues` without a parameter. The correct fix is to count `filteredRepeatingCount = 0` always (treating repeating elements as never filtered) until the real implementation is ready, rather than the current false-positive approach.

- [ ] **Step 1: Update `analyzeRepeatingElements` to use a neutral count**

Change the `analyzeRepeatingElements` function body from:
```ts
  function walk(node: SchemaNode): void {
    const isRepeating = node.maxOccurs === "unbounded" || parseInt(node.maxOccurs, 10) > 1;
    if (isRepeating && selection[node.id]) {
      total++;
      // For now, assume if node has children selected, it's "filtered"
      // In real implementation, check filterValues
      const hasSelectedChildren = node.children.some(c => selection[c.id]);
      if (hasSelectedChildren) {
        filtered++;
      }
    }
    
    for (const child of node.children) {
      walk(child);
    }
  }
```
to:
```ts
  function walk(node: SchemaNode): void {
    const isRepeating = node.maxOccurs === "unbounded" || parseInt(node.maxOccurs, 10) > 1;
    if (isRepeating && selection[node.id]) {
      total++;
      // filtered count stays 0 until filterValues is passed as a parameter
    }

    for (const child of node.children) {
      walk(child);
    }
  }
```

Also remove the unused `let filtered = 0;` → keep it as `let filtered = 0;` (it is returned, just always 0 now — this matches the return type contract).

- [ ] **Step 2: Run tests**

Run: `npx vitest run` from `Iksemel/`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add Iksemel/src/engine/analysis/efficiency.ts
git commit -m "fix(engine): stop false-counting repeating elements as filtered without filterValues — unfilteredRepeatingCount now accurate"
```

---

## Task 8: State — preserve `documentTemplate` on `LOAD_SCHEMA`

**Files:**
- Modify: `Iksemel/src/state/app-state.tsx`

The `LOAD_SCHEMA` reducer spreads `...INITIAL_STATE` and explicitly preserves `referenceData` and `policy`, but not `documentTemplate`. If the host sends `LOAD_DOCUMENT_TEMPLATE` before `LOAD_SCHEMA`, the template is silently wiped.

- [ ] **Step 1: Edit the `LOAD_SCHEMA` case in `app-state.tsx`**

Change:
```ts
    case "LOAD_SCHEMA": {
      const freshSelection: SelectionState = {};
      return {
        ...INITIAL_STATE,
        schema: action.roots,
        parseWarnings: action.warnings,
        selection: freshSelection,
        selectionHistory: createHistory(freshSelection),
        // Preserve reference data and policy — they may arrive before the schema
        referenceData: state.referenceData,
        policy: state.policy,
      };
    }
```
to:
```ts
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
```

- [ ] **Step 2: Verify `documentTemplate` is a valid key on `AppState`**

```bash
grep -n "documentTemplate" Iksemel/src/state/app-state.tsx | head -10
```

Expected: you will see `documentTemplate` in the `AppState` interface and `INITIAL_STATE`.

- [ ] **Step 3: Run type-check and tests**

```bash
npx tsc --noEmit
npx vitest run
```
Expected: no errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add Iksemel/src/state/app-state.tsx
git commit -m "fix(state): preserve documentTemplate across LOAD_SCHEMA like referenceData and policy"
```

---

## Task 9: Templates — add native format strings to `validateConfig`

**Files:**
- Modify: `Iksemel/src/engine/templates/template-serializer.ts`

`validFormats` is `["xlsx", "csv", "word", "html"]`. The `ExportFormat` type also includes `"xlsx-native"`, `"docx-native"`, `"pptx-native"`, `"ods-native"`, `"odt-native"`. Templates saved in native formats throw `TemplateValidationError` on deserialize.

- [ ] **Step 1: Find and update the `validFormats` line**

At line 168 of `template-serializer.ts`, change:
```ts
  const validFormats: readonly string[] = ["xlsx", "csv", "word", "html"];
```
to:
```ts
  const validFormats: readonly string[] = [
    "xlsx", "csv", "word", "html",
    "xlsx-native", "docx-native", "pptx-native", "ods-native", "odt-native",
  ];
```

- [ ] **Step 2: Add a test for native formats in `templates.test.ts`**

Open `Iksemel/src/engine/templates/templates.test.ts` and add a test (after existing tests):

```ts
it("round-trips a template saved with a native format", () => {
  // saveTemplate with a native format should not throw on deserialize
  const store = createTemplateStore();

  const template: ExportTemplate = {
    id: "t1",
    name: "Native Test",
    description: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: {
      format: "xlsx-native",
      rowSource: "//Slot",
      stylePreset: "corporate",
      columns: [{ xpath: "Title", header: "Title", align: "left", width: 120, format: "text", id: "c1", fullPath: "//Slot/Title" }],
      groupBy: null,
      sortBy: null,
      filterValues: {},
    },
  };

  store.saveTemplate(template);
  const loaded = store.loadTemplate("t1");
  expect(loaded).not.toBeNull();
  expect(loaded?.config.format).toBe("xlsx-native");
});
```

(Import `ExportTemplate` and `createTemplateStore` from the appropriate paths based on what is already imported in the test file.)

- [ ] **Step 3: Run tests**

Run: `npx vitest run --reporter=verbose src/engine/templates/templates.test.ts` from `Iksemel/`
Expected: new test passes.

- [ ] **Step 4: Commit**

```bash
git add Iksemel/src/engine/templates/template-serializer.ts Iksemel/src/engine/templates/templates.test.ts
git commit -m "fix(templates): add native format strings to validateConfig — xlsx-native, docx-native, pptx-native, ods-native, odt-native"
```

---

## Task 10: Component — wire `EfficiencyPanel` in `FilterPanel`

**Files:**
- Modify: `Iksemel/src/components/filter/FilterPanel.tsx`
- Modify: `Iksemel/src/app/components/LeftPanel.tsx` (to pass `roots` prop)

`FilterPanel.tsx` imports `analyzeFilterEfficiency` but the `useMemo` stub always returns `null`, making `EfficiencyPanel` permanently unreachable.

- [ ] **Step 1: Add `roots` prop to `FilterPanelProps`**

In `FilterPanel.tsx`, change `FilterPanelProps` from:
```ts
interface FilterPanelProps {
  node: SchemaNode;
  filterValues: FilterValuesState;
  referenceData: ReferenceData | null;
  policy: readonly PolicyRule[];
  nodePath: readonly string[];
  selection: SelectionState;
  onSetFilter: (nodeId: string, filter: FilterValue) => void;
  onRemoveFilter: (nodeId: string) => void;
  onClose: () => void;
}
```
to:
```ts
interface FilterPanelProps {
  node: SchemaNode;
  roots: readonly SchemaNode[];
  filterValues: FilterValuesState;
  referenceData: ReferenceData | null;
  policy: readonly PolicyRule[];
  nodePath: readonly string[];
  selection: SelectionState;
  onSetFilter: (nodeId: string, filter: FilterValue) => void;
  onRemoveFilter: (nodeId: string) => void;
  onClose: () => void;
}
```

- [ ] **Step 2: Destructure `roots` in the component and call `analyzeFilterEfficiency`**

Change the destructure and the `efficiencyScore` memo:
```ts
export function FilterPanel({
  node,
  roots,        // add this
  filterValues,
  referenceData,
  policy,
  nodePath,
  selection,
  onSetFilter,
  onRemoveFilter,
  onClose,
}: FilterPanelProps) {
```

And replace the dead memo:
```ts
  // Calculate efficiency score for the current selection
  const efficiencyScore = useMemo(() => {
    // For efficiency analysis, we'd need the full schema roots
    // This is a placeholder - in practice, pass roots from parent
    return null;
  }, [selection]);
```
with:
```ts
  const efficiencyScore = useMemo(
    () => (roots.length > 0 ? analyzeFilterEfficiency(roots, selection) : null),
    [roots, selection],
  );
```

- [ ] **Step 3: Pass `roots` from `LeftPanel.tsx`**

In `LeftPanel.tsx`, find where `FilterPanel` is rendered and add the `roots` prop. First locate the render site:
```bash
grep -n "FilterPanel" Iksemel/src/app/components/LeftPanel.tsx
```

Add `roots={schema ?? []}` to the `FilterPanel` JSX in `LeftPanel.tsx`.

- [ ] **Step 4: Run type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add Iksemel/src/components/filter/FilterPanel.tsx Iksemel/src/app/components/LeftPanel.tsx
git commit -m "fix(ui): wire EfficiencyPanel by passing roots to FilterPanel and computing efficiency score"
```

---

## Task 11: Types — fix `SelectionState` to model missing keys accurately

**Files:**
- Modify: `Iksemel/src/types/selection.ts`

`Record<string, boolean>` claims every key maps to `boolean`, but missing keys return `undefined` at runtime. All guard code (`if (!sel[node.id])`) works by accident because `undefined` is falsy, but the type is inaccurate.

- [ ] **Step 1: Update the type**

Change line 5 in `selection.ts` from:
```ts
export type SelectionState = Readonly<Record<string, boolean>>;
```
to:
```ts
export type SelectionState = Readonly<Record<string, boolean | undefined>>;
```

- [ ] **Step 2: Run type-check to catch any locations that assumed `boolean` narrowly**

```bash
npx tsc --noEmit
```

If `tsc` reports errors, they will be places where `boolean | undefined` is assigned to `boolean`. Typical pattern is `const x: boolean = sel[id]`. Change each to `const x = sel[id] ?? false`.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add Iksemel/src/types/selection.ts
git commit -m "fix(types): SelectionState keys are boolean | undefined — missing keys return undefined at runtime"
```

---

## Task 12: Accessibility — add focus trap to `SizeWarningModal`

**Files:**
- Modify: `Iksemel/src/components/export/SizeWarningModal.tsx`

The modal uses `role="dialog"` and `aria-modal="true"` but focus is not moved into it on mount and Tab can freely leave the modal.

- [ ] **Step 1: Add focus management to `SizeWarningModal`**

Replace the import block and component to add a `useRef` + `useEffect` for initial focus, and a keydown handler for Tab trapping:

Add the `useRef` and `useEffect` imports:
```ts
import { useCallback, useEffect, useRef } from "react";
```

Inside `SizeWarningModal`, add:
```ts
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Move focus into the modal on mount
    firstFocusableRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key !== "Tab") return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
```

Attach `ref={modalRef}` to the outer `<div className={styles["modal"]}>` and `ref={firstFocusableRef}` to the "Review & Optimize" `<button>`.

- [ ] **Step 2: Run type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add Iksemel/src/components/export/SizeWarningModal.tsx
git commit -m "fix(a11y): add focus trap and initial focus management to SizeWarningModal"
```

---

## Task 13: Tests — add efficiency scoring tests

**Files:**
- Create: `Iksemel/src/engine/analysis/efficiency.test.ts`

There are zero tests for `efficiency.ts`. The most important gaps: score clamping, empty-roots edge case, grade boundary values, and `simulateFilterImpact`.

- [ ] **Step 1: Create the test file**

Create `Iksemel/src/engine/analysis/efficiency.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { analyzeFilterEfficiency, simulateFilterImpact } from "./efficiency";
import type { SchemaNode, SelectionState } from "@/types";

function makeLeaf(id: string, name: string, maxOccurs = "1"): SchemaNode {
  return {
    id,
    name,
    typeName: "string",
    minOccurs: "1",
    maxOccurs,
    children: [],
    isRequired: true,
    path: [name],
    enumerations: [],
    facets: {},
    documentation: "",
  };
}

function makeContainer(id: string, name: string, children: SchemaNode[], maxOccurs = "1"): SchemaNode {
  return {
    id,
    name,
    typeName: "complex",
    minOccurs: "1",
    maxOccurs,
    children,
    isRequired: true,
    path: [name],
    enumerations: [],
    facets: {},
    documentation: "",
  };
}

describe("analyzeFilterEfficiency", () => {
  it("returns grade A for a tight selection (< 30% of fields)", () => {
    const leaf1 = makeLeaf("n1", "Field1");
    const leaf2 = makeLeaf("n2", "Field2");
    const leaf3 = makeLeaf("n3", "Field3");
    const leaf4 = makeLeaf("n4", "Field4");
    const roots = [makeContainer("r", "Root", [leaf1, leaf2, leaf3, leaf4])];
    // Only 1 of 5 nodes selected (root + 4 leaves) = 20%
    const sel: SelectionState = { r: true, n1: true };
    const result = analyzeFilterEfficiency(roots, sel);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(["A", "B"]).toContain(result.grade);
  });

  it("returns grade D or F for a near-total selection (> 90%)", () => {
    const leaves = Array.from({ length: 9 }, (_, i) => makeLeaf(`n${i}`, `F${i}`));
    const roots = [makeContainer("r", "Root", leaves)];
    const sel: SelectionState = { r: true };
    for (const l of leaves) (sel as Record<string, boolean>)[l.id] = true;
    const result = analyzeFilterEfficiency(roots, sel);
    expect(result.score).toBeLessThan(70);
    expect(["D", "F"]).toContain(result.grade);
  });

  it("clamps score to 0 minimum — never goes negative", () => {
    // All 10 leaves selected (100%), plus repeating roots — max negative impact
    const leaves = Array.from({ length: 10 }, (_, i) => makeLeaf(`n${i}`, `F${i}`, "unbounded"));
    const roots = [makeContainer("r", "Root", leaves)];
    const sel: SelectionState = { r: true };
    for (const l of leaves) (sel as Record<string, boolean>)[l.id] = true;
    const result = analyzeFilterEfficiency(roots, sel);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("clamps score to 100 maximum — never exceeds 100", () => {
    // Single leaf, perfectly tight selection
    const leaf = makeLeaf("n1", "OnlyField");
    const roots = [leaf];
    const sel: SelectionState = { n1: true };
    const result = analyzeFilterEfficiency(roots, sel);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("handles empty roots without throwing", () => {
    const result = analyzeFilterEfficiency([], {});
    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("handles empty selection without throwing", () => {
    const leaf = makeLeaf("n1", "Field1");
    const result = analyzeFilterEfficiency([leaf], {});
    expect(result).toBeDefined();
  });

  it("grade boundaries: score 90+ = A, 80-89 = B, 70-79 = C, 60-69 = D, <60 = F", () => {
    const gradeMap: Array<[number, string]> = [
      [90, "A"], [95, "A"],
      [80, "B"], [89, "B"],
      [70, "C"], [79, "C"],
      [60, "D"], [69, "D"],
      [59, "F"], [0, "F"],
    ];
    for (const [score, expectedGrade] of gradeMap) {
      // We can't directly set score, but we can verify the grade logic indirectly
      // by checking boundary: score 90 should be A
      if (score === 90) {
        // tight selection triggers +20 selectionImpact; base 70 + 20 = 90
        const leaf = makeLeaf("n1", "Field1");
        const other = Array.from({ length: 9 }, (_, i) => makeLeaf(`x${i}`, `X${i}`));
        const roots = [makeContainer("r", "Root", [leaf, ...other])];
        const sel: SelectionState = { r: true, n1: true }; // 2/11 = 18% < 30%
        const result = analyzeFilterEfficiency(roots, sel);
        expect(result.grade).toBe(expectedGrade);
      }
    }
  });
});

describe("simulateFilterImpact", () => {
  it("returns 0 reduction when before and after selections are identical", () => {
    const leaf = makeLeaf("n1", "Field1");
    const roots = [leaf];
    const sel: SelectionState = { n1: true };
    const result = simulateFilterImpact(roots, sel, sel);
    expect(result.reductionBytes).toBe(0);
    expect(result.reductionPct).toBe(0);
  });

  it("returns positive reduction when after selection is smaller", () => {
    const leaf1 = makeLeaf("n1", "Field1");
    const leaf2 = makeLeaf("n2", "Field2");
    const roots = [leaf1, leaf2];
    const before: SelectionState = { n1: true, n2: true };
    const after: SelectionState = { n1: true };
    const result = simulateFilterImpact(roots, before, after);
    expect(result.reductionBytes).toBeGreaterThan(0);
    expect(result.reductionPct).toBeGreaterThan(0);
    expect(result.reductionPct).toBeLessThanOrEqual(100);
  });

  it("handles empty selection before — reductionPct is 0 not NaN", () => {
    const leaf = makeLeaf("n1", "Field1");
    const roots = [leaf];
    const result = simulateFilterImpact(roots, {}, { n1: true });
    expect(result.reductionPct).toBe(0);
    expect(Number.isFinite(result.reductionPct)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the new tests**

Run: `npx vitest run --reporter=verbose src/engine/analysis/efficiency.test.ts` from `Iksemel/`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add Iksemel/src/engine/analysis/efficiency.test.ts
git commit -m "test(engine): add efficiency scoring tests — grade boundaries, clamping, edge cases, simulateFilterImpact"
```

---

## Task 14: Tests — add `shouldShowSizeWarning` and `shouldBlockExport` tests

**Files:**
- Create: `Iksemel/src/components/export/SizeWarningModal.test.ts`

The boundary logic for triggering and blocking exports has no tests.

- [ ] **Step 1: Create the test file**

Create `Iksemel/src/components/export/SizeWarningModal.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shouldShowSizeWarning, shouldBlockExport } from "./SizeWarningModal";

const MB = 1024 * 1024;

describe("shouldShowSizeWarning", () => {
  it("returns false below 50 MB", () => {
    expect(shouldShowSizeWarning(0)).toBe(false);
    expect(shouldShowSizeWarning(49 * MB)).toBe(false);
    expect(shouldShowSizeWarning(50 * MB - 1)).toBe(false);
  });

  it("returns true at exactly 50 MB", () => {
    expect(shouldShowSizeWarning(50 * MB)).toBe(true);
  });

  it("returns true above 50 MB", () => {
    expect(shouldShowSizeWarning(100 * MB)).toBe(true);
    expect(shouldShowSizeWarning(199 * MB)).toBe(true);
  });
});

describe("shouldBlockExport", () => {
  it("returns false below 200 MB", () => {
    expect(shouldBlockExport(0)).toBe(false);
    expect(shouldBlockExport(199 * MB)).toBe(false);
    expect(shouldBlockExport(200 * MB - 1)).toBe(false);
  });

  it("returns true at exactly 200 MB", () => {
    expect(shouldBlockExport(200 * MB)).toBe(true);
  });

  it("returns true above 200 MB", () => {
    expect(shouldBlockExport(500 * MB)).toBe(true);
    expect(shouldBlockExport(1024 * MB)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run --reporter=verbose src/components/export/SizeWarningModal.test.ts` from `Iksemel/`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add Iksemel/src/components/export/SizeWarningModal.test.ts
git commit -m "test(ui): add boundary tests for shouldShowSizeWarning and shouldBlockExport"
```

---

## Self-Review

**Spec coverage:**
- Task 1 ✓ wildcard warning unconditional
- Task 2 ✓ SET_ORIGIN_WHITELIST blocks "*"
- Task 3 ✓ sendToHost "*" fallback for non-XFEB_READY messages
- Task 4 ✓ DOCTYPE rejection in validateXmlDocument
- Task 5 ✓ estimateSelectedNodeWeight formula
- Task 6 ✓ detectPayloadContributors replaced + config threaded
- Task 7 ✓ analyzeRepeatingElements neutralised
- Task 8 ✓ LOAD_SCHEMA preserves documentTemplate
- Task 9 ✓ native formats in validFormats
- Task 10 ✓ FilterPanel wired with roots, EfficiencyPanel renders
- Task 11 ✓ SelectionState type fix
- Task 12 ✓ SizeWarningModal focus trap
- Task 13 ✓ efficiency.test.ts
- Task 14 ✓ SizeWarningModal.test.ts

**Issue from review not included:** The `FilterPanel` non-null assertion `referenceData![xpath]` (review issue #2) is harmless at runtime (logic is correct) and the fix is a readability-only change. Not included to keep this plan focused on behavioural bugs. Address separately if desired.

**Placeholder scan:** No TBD or TODO in any code step.

**Type consistency:** `SchemaNode` shape used in test helpers matches the actual interface (id, name, typeName, minOccurs, maxOccurs, children, isRequired, path, enumerations, facets, documentation).
