---
title: "feat: Live Preview Engine"
type: feat
date: 2026-02-18
deepened: 2026-02-18
---

# Live Preview Engine ("Show Me What I'm Building")

## Enhancement Summary

**Deepened on:** 2026-02-18
**Research agents used:** 12 (TypeScript reviewer, Security sentinel, Architecture strategist, Performance oracle, Race condition reviewer, Code simplicity reviewer, Pattern recognition specialist, Frontend design reviewer, Sharp edges analyst, Insecure defaults auditor, Best practices researcher, Framework docs researcher)

### Key Improvements

1. **Simplified v1 scope**: Cut Web Worker from v1 (add only if performance data warrants it), remove sequence IDs (single in-flight request with `isRunning` boolean), merge `xslt-runner.ts` into `orchestrator.ts`, reduce types from 4 to 2, cut Phase 4.3 (estimated vs actual) and Phase 4.4 (auto-tab-switch) — reduces new code by ~30%
2. **Critical security hardening**: XML bomb rejection (strip `<!DOCTYPE` before parsing), iframe `srcdoc` + `sandbox=""` (never Blob URL), Zod schema size limits on all bridge messages, sanitize XSLT HTML output before preview
3. **Architecture correction**: Move React hook from `engine/` to `components/hooks/` (CONVENTIONS.md violation), store XML sample in `useRef` not React state (5 MB string in reducer causes re-render cascades), rename to `usePreviewWorker.ts` (camelCase, not kebab-case)
4. **xslt-processor API correction**: Library now uses class-based API (`new Xslt()`, `new XmlParser()`) not functional (`xmlParse`/`xsltProcess`). License is LGPL-3.0, not MIT. Written in TypeScript (has own types).
5. **Accessibility requirements**: `aria-live="polite"` on status region, `aria-describedby` on disabled Generate button, focus management after generation, `title` on preview iframe

### New Risks Discovered

- **Existing bridge vulnerability**: `SET_ORIGIN_WHITELIST` allows any validated origin to replace the entire whitelist (including injecting `"*"`). `postMessage` falls back to `"*"` before first inbound message. Should be fixed before expanding bridge surface.
- **xslt-processor entity expansion**: Pure JS XML parser may not have browser-level entity expansion limits. Must spike-test with XML bomb payloads before adoption.
- **CSP blocks Workers in production**: `nginx.conf` CSP needs `worker-src 'self' blob:` if Workers are added later.

---

## Overview

A live preview system that lets clients run their XFEB configuration against real XML data and download the actual output file (XLSX, CSV, HTML, Word, etc.) — all in the browser, before deploying to WHATS'ON.

This is the highest-impact enhancement identified during brainstorming: it solves three compounding client pain points simultaneously ("I don't know where to start", "My exports are too big/slow", "I can't validate before deploying").

## Problem Statement

Clients build report configurations blind:

1. **No visibility** — The schema tree is abstract. Clients select fields without seeing what they produce, so they over-select and tweak in raw XSLT.
2. **No validation** — There's no way to know if a config works until it runs in WHATS'ON. XSLT errors, empty columns, and wrong formats are only discovered after deployment.
3. **No concrete feedback** — Current size estimates are helpful but abstract. A downloadable .xlsx is infinitely more convincing than a byte estimate.

## Proposed Solution

Upload (or receive via bridge) a sample XML document, apply the current XFEB configuration (field selection + XSLT generation + post-processing), and produce the actual output file for download — with row count, byte size, column count, and processing errors surfaced inline.

## Technical Approach

### XSLT Runtime Decision

**Critical finding:** All XFEB generators output XSLT 1.0 stylesheets (verified across all 9 format generators). This opens the door to a pure-JavaScript XSLT processor.

Three runtimes were evaluated:

| Runtime | XSLT Version | Browser? | Workers? | Dynamic XSLT? | Size |
|---------|-------------|----------|----------|----------------|------|
| Saxon-JS | 3.0 | Yes (separate download) | No (requires `document`) | No — requires SEF pre-compilation, no browser `compile()` API | ~2.5 MB |
| Native `XSLTProcessor` | 1.0 | Yes | No | Yes | 0 KB |
| `xslt-processor` (npm) | 1.0 | Yes | Yes | Yes | ~50 KB |

**Decision: `xslt-processor` npm package.**

Rationale:
- Saxon-JS cannot compile dynamically-generated XSLT at runtime in the browser (XSLT must be pre-compiled to SEF format via a Node.js CLI). Since XFEB generates XSLT from user config in real-time, this is a non-starter without a server roundtrip.
- Native `XSLTProcessor` is being removed from Chrome in Chrome 155 (November 2026). Firefox and WebKit will follow. Not a viable long-term path.
- `xslt-processor` is a pure JavaScript XSLT 1.0 implementation with zero native dependencies. It works in Web Workers, handles dynamic XSLT strings directly, and covers all XSLT 1.0 features our generators use.

> **Research Correction:** The `xslt-processor` package now uses a **class-based API** (not the functional API referenced in earlier versions). The correct imports are:
> ```ts
> import { Xslt, XmlParser } from "xslt-processor";
> const parser = new XmlParser();
> const xslt = new Xslt();
> const xmlDoc = parser.xmlParse(xmlSource);
> const xsltDoc = parser.xmlParse(xsltStylesheet);
> const result = await xslt.xsltProcess(xmlDoc, xsltDoc);
> ```
> The package is written in TypeScript and ships its own type declarations. **License is LGPL-3.0** (not MIT). The `fetchFunction` option controls external resource loading for `xsl:import`/`xsl:include` — set to a throwing no-op to deny external loading.

### Architecture

```
XML Sample (upload / bridge / inference reuse)
    |
    v
[Generated XSLT] --xslt-processor--> Transformed output (XML/HTML string)
    |
    v
[Post-Processor] --zip/format--> Final file (XLSX, CSV, HTML, etc.)
    |
    v
[Preview Panel] --stats + download--> Client sees row count, size, downloads file
```

The pipeline reuses existing infrastructure:
- `generateXslt()` from `engine/generation/xslt-registry.ts` produces the XSLT string
- Post-processors from `engine/generation/post-processor-registry.ts` produce `{ data: Uint8Array, mimeType, extension }`
- Default scaffolds from `engine/document-templates/default-scaffolds.ts` provide templates for native formats without requiring user upload

### XML Sample Data Sources (three paths)

1. **Manual upload**: Client drags an XML file into XFEB (existing SchemaUpload flow)
2. **Bridge push**: WHATS'ON sends a representative data slice via a new `LOAD_PREVIEW_DATA` message
3. **Reuse inference sample**: If the schema was loaded from an XML sample via `XmlSampleProvider`, that same XML is the preview data (zero extra work)

### Output Strategy

- **HTML**: Render inline in a sandboxed iframe (`srcdoc` + `sandbox=""`) + offer download
- **CSV**: Show rows in a table (virtualized if large) + offer download
- **XLSX/DOCX/PPTX/ODS/ODT**: Generate the ZIP package using existing native post-processors + offer download (show file card with format badge and size)
- Show **row count**, **output byte size**, **column count**, and **processing time** alongside the download button

### Key Technical Details

1. **Main-thread transform for v1**: XSLT transformation runs on the main thread in v1. The XML sample is capped at 5 MB and typical transforms complete in under 1 second. The codebase has zero existing Workers; adding one introduces bundling, CSP, lifecycle, and fallback complexity for unproven need. The `generatePreview()` function signature is already `async` and Worker-friendly — if users report actual UI freezes on real data, a Worker can be added in v2 without API changes.

2. **Filter application**: The current XSLT generators embed filter logic directly in the stylesheet (via `xsl:if` conditions). The filter XML is a separate deployment artifact, not fed into the transform. So we pass the full XML sample to the XSLT and let the generated stylesheet handle filtering.

3. **Memory safety**: Cap XML sample size at 5 MB with a clear error message. Reject XML containing `<!DOCTYPE` or `<!ENTITY` declarations before parsing (prevents entity expansion attacks). Store XML sample in a `useRef` (not React state) to avoid 5 MB string in the reducer causing re-render cascades on every state change.

4. **Single in-flight request**: Since preview is triggered by an explicit button press (not auto-refresh), use a simple `isRunning` boolean state. Disable the Generate button while running. No sequence IDs needed — there is at most one request in flight at a time. If a Worker is added in v2, sequence IDs can be introduced then.

5. **Native format post-processing**: Post-processors expect XSLT output as a string (`PostProcessInput.xsltOutput`). The `xslt-processor` returns the result as a string, which is exactly what the post-processors consume. Default scaffolds already exist for all 5 native formats.

6. **HTML preview security**: Use `srcdoc` attribute (not Blob URL) on the iframe. Set `sandbox=""` (empty — most restrictive). Never add `allow-scripts` or `allow-same-origin` together. Sanitize XSLT HTML output before setting `srcdoc` to strip event handlers, `javascript:` URLs, and dangerous CSS.

---

## Research Insights

### Security Hardening (CRITICAL)

**XML Bomb Protection** — Multiple reviewers flagged this as the highest-priority security concern. The `xslt-processor` package uses its own XML parser, not the browser's `DOMParser`. Unlike browser parsers which have built-in entity expansion limits, a pure JS parser may have none. A 1 KB input with nested entity definitions can expand to gigabytes.

**Required mitigation (Phase 1.3):**
```ts
function rejectDtd(xmlSource: string): void {
  if (/<!DOCTYPE/i.test(xmlSource) || /<!ENTITY/i.test(xmlSource)) {
    throw new Error("XML with DOCTYPE/ENTITY declarations is not supported");
  }
}
```
Call this before every `xmlParse()` invocation. Since XFEB operates on well-known WHATS'ON export schemas, DOCTYPE declarations are never required.

**Existing Bridge Vulnerabilities** — Two HIGH-severity issues exist in the current bridge code that should be addressed before expanding the bridge surface with `LOAD_PREVIEW_DATA`:

1. `postMessage` falls back to `"*"` target origin when `lastKnownOrigin` is null (`message-handler.ts:226`). The `XFEB_READY` message broadcasts to any listening window. Fix: queue outbound messages until first validated inbound establishes the origin.
2. `SET_ORIGIN_WHITELIST` allows any validated origin to completely replace the whitelist with arbitrary origins including `"*"` (`message-handler.ts:182-189`). Fix: make additive-only, validate origin format, reject `"*"`.

**Zod Schema Size Limits** — All inbound message Zod schemas lack `.max()` constraints on string fields. A 500 MB string arriving via PostMessage will be fully deserialized and validated by Zod before the application-layer size check rejects it. Add `z.string().max(5_242_880)` to `xmlContent` fields in both `LoadXmlSampleMessageSchema` and `LoadPreviewDataMessageSchema`.

### Architecture Corrections

**Hook placement** — The plan places `use-preview-worker.ts` in `engine/preview/`. This violates the most fundamental rule in CONVENTIONS.md: "Engine modules must NEVER import from components/" and "no React imports allowed" in `engine/`. React hooks with `useState`/`useEffect`/`useRef` belong in `components/hooks/`. The established pattern: `useBridge.ts` lives in `bridge/` (not engine), `usePolicyEvaluation.ts` lives in `components/hooks/`.

**Corrected placement:** `src/components/hooks/usePreview.ts` (camelCase per existing hook naming: `useBridge.ts`, `usePolicyEvaluation.ts`, `useVirtualTree.ts`).

**XML sample storage** — Do NOT add `xmlSampleContent: string | null` to `AppState` (the useReducer state). A 5 MB string in React Context means every state change (toggling a tree node, typing a search query) triggers serialization and comparison of that 5 MB string. Use a `useRef<string | null>` in `App.tsx` with a lightweight version counter in state (`xmlSampleVersion: number`). Components that need the XML content read the ref; the version counter triggers re-renders when it changes.

```ts
// In App.tsx
const xmlSampleRef = useRef<string | null>(null);
// In AppState: xmlSampleVersion: number (incremented when sample changes)
```

**No registry pattern for preview** — The preview module should be a direct export (like `engine/diff/` or `engine/policy/`), not a registry. There is one preview pipeline, not multiple competing strategies. Format-specific behaviour delegates to the existing XSLT generator and post-processor registries.

### Simplification Recommendations

The code simplicity reviewer recommends cutting ~30% of planned new code:

| Item | Verdict | Rationale |
|------|---------|-----------|
| Web Worker (`preview-worker.ts`) | **Cut from v1** | Zero existing Workers. 5 MB XML transforms are fast. Add when real perf data warrants. |
| Worker hook (`use-preview-worker.ts`) | **Cut from v1** | No Worker = no hook needed. Simple `async` call in component. |
| Worker fallback logic | **Cut from v1** | Nothing to fall back from. |
| Sequence ID mechanism | **Cut from v1** | One in-flight request (explicit button). `isRunning` boolean suffices. |
| `PreviewResult` intermediate type | **Merge** into `PreviewFileResult` | Never consumed by UI — only internal pipeline stage. |
| `PreviewError` structured codes | **Replace** with thrown Error | UI displays error message string. No programmatic branching on error type. |
| Separate `xslt-runner.ts` | **Merge** into `preview.ts` | Private helper, not a public API. |
| Phase 4.3 (estimated vs actual) | **Defer to v2** | Polish, not core value. Creates coupling to estimation system. |
| Phase 4.4 (auto-tab-switch) | **Defer to v2** | UX assumption. Users can click the tab. |

### Race Condition Mitigations (for v2 Worker)

When a Worker is introduced in v2, the race condition reviewer identified 8 specific issues to address:

1. **Worker crash detection**: Listen for both `message` and `error` events. On `error`, transition immediately to error state (don't wait for 30s timeout).
2. **Unmount during processing**: Use a `cancelToken = { canceled: false }` pattern. Check `cancelToken.canceled` inside `onmessage` before any `setState`.
3. **Rapid click queue buildup**: Worker is single-threaded. 10 queued messages = 10 sequential transforms. Have the Worker check for staleness via `setTimeout(fn, 0)` drain before starting expensive work.
4. **Timeout per request**: Each request needs its own timeout that is cancelled when a new request starts or when a result arrives.
5. **Schema change during transform**: Track a "generation" counter that increments on schema changes. Discard results from a previous generation.
6. **Stale-but-useful results**: Consider showing stale results with an "Updating..." badge rather than a blank spinner while the fresh result is computing.

### Frontend Design Recommendations

**Layout**: Collapse the Status row and Stats row into a single MetricsBar-style strip (matching the existing `MetricsBar` component pattern). Make the preview area `flex: 1` dominant space. Move the download button into the stats strip (right-aligned, `variant="success"` size `sm`).

**Empty state**: Use a centered empty-state layout matching the SchemaUpload dropZone pattern (faint icon, muted text, actionable link). Message: "Upload an XML sample to preview exports" with clickable text that triggers the file picker.

**Error handling**: Categorize errors with distinct visual treatments:
- Configuration errors (missing row source, no columns): amber warning with navigation button
- Generation errors (XSLT compilation failure): red error with collapsible detail section
- Partial success: show download + amber warning strip

**Stale detection**: When config changes after preview was generated, show amber "Stale — regenerate to reflect changes" indicator. Compare `generatorInput` hash at generation time vs current.

**Accessibility requirements (P0)**:
- `aria-live="polite"` on status region (screen readers can't detect state changes without it)
- `aria-describedby` on disabled Generate button explaining why it's disabled
- Focus management: move focus to download button or preview area after generation completes
- `title` attribute on preview iframe: `<iframe title="Export preview - HTML report">`
- Download button: `aria-label="Download report.xlsx, 34 kilobytes"`

### Performance Considerations

- **Blob URL lifecycle**: Revoke previous Blob URL before creating a new one (track in `useRef`). Also revoke on unmount. For downloads, use `setTimeout(() => URL.revokeObjectURL(url), 60_000)` instead of synchronous revocation after `click()` to avoid race conditions on large files.
- **JSZip memory**: Post-processors hold all ZIP entries in memory. For a 5 MB XML transform, peak memory is ~15-25 MB. Use `type: "blob"` instead of `"uint8array"` for better browser memory management. Pre-flight size estimate before ZIP generation.
- **CodeViewer virtualization**: If preview output is displayed in CodeViewer, it splits the entire string into lines and renders each as a React element. For large outputs, this creates tens of thousands of DOM elements. Virtualize if showing raw output.
- **CSP update needed (v2 Worker)**: `nginx.conf` CSP needs `worker-src 'self' blob:` and `frame-src 'self' blob:` added. Configure Vite to emit file-based Workers (`{ type: 'module' }`) for CSP compatibility.

---

## Implementation Phases

### Phase 1: Core Transform Engine

Create the XSLT transform runner as a single module.

#### 1.1 Install `xslt-processor` dependency

**File:** `package.json`

```bash
npm install xslt-processor
```

> **Note:** License is LGPL-3.0. The package is written in TypeScript and ships its own type declarations — no `@types/` package needed.

#### 1.2 Create preview types

**New file:** `src/engine/preview/types.ts`

```ts
import type { ExportFormat } from "@/types";

export interface PreviewRequest {
  readonly xmlSource: string;
  readonly xsltStylesheet: string;
  readonly format: ExportFormat;
}

export interface PreviewFileResult {
  readonly data: Uint8Array;
  readonly mimeType: string;
  readonly extension: string;
  readonly byteSize: number;
  readonly rowCount: number;
  readonly columnCount: number;
  readonly processingTimeMs: number;
}
```

> **Simplified from original plan:** Dropped `PreviewResult` (intermediate type never consumed by UI), `PreviewError` (use thrown Error), and `sequenceId` (single in-flight request with `isRunning` boolean).

#### 1.3 Create preview engine

**New file:** `src/engine/preview/preview.ts`

Core function that runs the full pipeline: XSLT transform → row/column counting → post-processing → file output.

```ts
import { Xslt, XmlParser } from "xslt-processor";

const parser = new XmlParser();
const xslt = new Xslt({ fetchFunction: () => { throw new Error("External loading disabled"); } });

function rejectDtd(xml: string): void {
  if (/<!DOCTYPE/i.test(xml) || /<!ENTITY/i.test(xml)) {
    throw new Error("XML with DOCTYPE/ENTITY declarations is not supported");
  }
}

export async function generatePreview(
  request: PreviewRequest,
  postProcessInput?: Omit<PostProcessInput, "xsltOutput">,
): Promise<PreviewFileResult>
```

Logic:
1. `rejectDtd(request.xmlSource)` — reject XML bombs
2. Parse XML source: `parser.xmlParse(request.xmlSource)`
3. Parse XSLT: `parser.xmlParse(request.xsltStylesheet)`
4. Transform: `xslt.xsltProcess(xmlDoc, xsltDoc)`
5. Count rows and columns from transformed output
6. For native formats: invoke post-processor → return `Uint8Array`
7. For HTML/CSV: encode to UTF-8 `Uint8Array`
8. Return `PreviewFileResult` with stats

> **Merged from original plan:** The separate `xslt-runner.ts` is now a private helper within `preview.ts`, following the pattern of `engine/diff/diff-engine.ts` and `engine/policy/policy-engine.ts` (single file with core logic).

#### 1.4 Barrel export

**New file:** `src/engine/preview/index.ts`

Export types and `generatePreview`.

#### 1.5 Tests

**New file:** `src/engine/preview/preview.test.ts`

- Transform: valid XSLT → correct output
- Transform: invalid XSLT → thrown error with message
- Transform: XML with DOCTYPE → rejected with clear error
- Orchestrator: CSV format → UTF-8 encoded result
- Orchestrator: HTML format → UTF-8 encoded result
- Orchestrator: native format → calls post-processor → Uint8Array
- Row/column counting from transform output

> **Spike test (prerequisite):** Before Phase 1, run existing golden test XSLT through `xslt-processor` to verify compatibility. Also test with XML bomb payloads to verify entity expansion behaviour.

### Phase 2: State & Bridge Integration

Wire the preview engine into app state and the bridge.

#### 2.1 Store XML sample reference in App.tsx

**Modify:** `src/App.tsx`

Add a `useRef<string | null>` for XML sample content (NOT in `AppState` — see Research Insights). Add a lightweight `xmlSampleVersion: number` to `AppState` for triggering re-renders.

```ts
const xmlSampleRef = useRef<string | null>(null);
```

**Modify:** `src/state/app-state.tsx`

Add to `AppState`:
```ts
readonly xmlSampleVersion: number; // incremented when sample changes, default 0
```

Add action:
```ts
| { readonly type: "SET_XML_SAMPLE_VERSION" }
```

Set `xmlSampleRef.current` in `handleXmlSampleLoad` and dispatch `SET_XML_SAMPLE_VERSION`. Clear to `null` when XSD is loaded.

#### 2.2 Add `LOAD_PREVIEW_DATA` bridge message

**Modify:** `src/bridge/types.ts`

Add new inbound message:
```ts
export interface LoadPreviewDataMessage {
  readonly type: "LOAD_PREVIEW_DATA";
  readonly payload: {
    readonly xmlContent: string;
    readonly filename?: string;
  };
}
```

Add to `InboundMessage` union and `INBOUND_MESSAGE_TYPES` set.

**Modify:** `src/bridge/schemas.ts`

Add Zod schema with size limit:
```ts
export const LoadPreviewDataMessageSchema = z.object({
  type: z.literal("LOAD_PREVIEW_DATA"),
  payload: z.object({
    xmlContent: z.string().max(5_242_880),
    filename: z.string().optional(),
  }),
});
```

> **Research insight:** Also add `.max()` constraints to existing schemas: `LOAD_XML_SAMPLE` xmlContent (5 MB), `LOAD_SCHEMA` xsdContent (5 MB), `LOAD_CONFIG` reportXml (1 MB).

**Modify:** `src/bridge/message-handler.ts`

Handle `LOAD_PREVIEW_DATA`: invoke `onLoadPreviewData?.(message.payload)` callback.

#### 2.3 Add "preview" tab to app state

**Modify:** `src/state/app-state.tsx`

Add `"preview"` to the `activeTab` union type.

**Modify:** `src/App.tsx`

Add `{ id: "preview", label: "Preview" }` to the `TABS` array (after "report", before "package").

### Phase 3: Preview UI

Build the Preview panel component.

#### 3.1 Create PreviewPanel component

**New file:** `src/components/preview/PreviewPanel.tsx`
**New file:** `src/components/preview/PreviewPanel.module.css`

Layout (revised per frontend design review):
```
+----------------------------------------------------------+
| [Generate Preview] (primary)  [Format: xlsx v] (select)  |
+----------------------------------------------------------+
| Status: Ready   Rows: 247  Cols: 12  34 KB  1.2s  [DL]  |
+----------------------------------------------------------+
|                                                          |
|               Preview area (flex: 1)                     |
|        HTML: sandboxed iframe (srcdoc)                   |
|        CSV: scrollable table (virtualized if large)      |
|        XLSX/DOCX/etc: file card + download               |
|                                                          |
+----------------------------------------------------------+
| Warnings/errors (conditional, between stats and preview) |
+----------------------------------------------------------+
```

Props:
- `xmlSampleRef: React.RefObject<string | null>` — ref to raw XML
- `xmlSampleVersion: number` — triggers re-render when sample changes
- `xsltOutput: string` — the current generated XSLT
- `format: ExportFormat` — current output format
- `generatorInput: GeneratorInput` — for post-processor template/title
- `documentTemplate: DocumentTemplate | null` — for native format scaffold
- `slug: string` — for download filename

Behaviour:
- **"Generate Preview" button** — explicit trigger, `variant="primary"`
- Button disabled when no XML loaded (with `aria-describedby` explaining why)
- Uses `isRunning` boolean state — button disabled while running
- On success: shows stats in MetricsBar-style strip + download button
- On error: shows error message with actionable hint
- For HTML output: sanitized HTML in `<iframe srcdoc="..." sandbox="" title="Export preview">`
- For CSV output: table with virtualized rows if large
- For binary formats: file icon card with format badge, size, and download button
- `aria-live="polite"` on status region
- Focus moves to download button on completion
- Stale detection: compare `generatorInput` hash at generation time vs current

**Accessibility checklist:**
- [ ] `aria-live="polite"` + `role="status"` on status region
- [ ] `aria-describedby` on disabled Generate button
- [ ] `title` attribute on preview iframe
- [ ] `aria-label` with file format and size on download button
- [ ] Focus management after generation completes
- [ ] Keyboard navigation: Tab → Generate → Format → Download → Preview area

Component state model:
```tsx
const [result, setResult] = useState<PreviewFileResult | null>(null);
const [error, setError] = useState<string | null>(null);
const [isRunning, setIsRunning] = useState(false);
const [isStale, setIsStale] = useState(false);
const blobUrlRef = useRef<string | null>(null);
```

#### 3.2 Barrel export

**New file:** `src/components/preview/index.ts`

#### 3.3 Wire into App.tsx

**Modify:** `src/App.tsx`

In the TabContainer, add the preview tab content:
```tsx
{state.activeTab === "preview" && (
  <PreviewPanel
    xmlSampleRef={xmlSampleRef}
    xmlSampleVersion={state.xmlSampleVersion}
    xsltOutput={xsltOutput}
    format={state.format}
    generatorInput={generatorInput}
    documentTemplate={state.documentTemplate ?? null}
    slug={slug}
  />
)}
```

#### 3.4 Store raw XML in handleXmlSampleLoad

**Modify:** `src/App.tsx`

In `handleXmlSampleLoad`, after `XmlSampleProvider.provide()` succeeds:
```ts
xmlSampleRef.current = xmlText;
dispatch({ type: "SET_XML_SAMPLE_VERSION" });
```

In `handleSchemaLoad` (XSD path):
```ts
xmlSampleRef.current = null;
dispatch({ type: "SET_XML_SAMPLE_VERSION" });
```

### Phase 4: Polish & Error Handling

#### 4.1 XSLT validation as side effect

When the user clicks Generate Preview, attempt to parse the current XSLT with `parser.xmlParse()` first. Surface syntax errors immediately as an error in the panel — this gives "free" XSLT validation without running the full transform.

#### 4.2 Size cap, progress, and XML safety

- Cap XML sample at 5 MB in `handleXmlSampleLoad` and bridge handler (enforced at both Zod schema level and application level)
- Reject `<!DOCTYPE` and `<!ENTITY` before parsing (prevents XML bomb/billion laughs attacks)
- Show elapsed timer during processing
- Standardize download utility: extract `triggerDownload(data: Uint8Array | string, filename: string, mimeType: string)` shared by PreviewPanel, CodeViewer, PackageTab, and App.tsx (currently 3 slightly different patterns)

#### 4.3 ~~Estimated vs actual comparison~~ (Deferred to v2)

> Moved to Future Extensions. Core value is "preview and download", not estimate validation.

#### 4.4 ~~Auto-switch to Preview tab~~ (Deferred to v2)

> Moved to Future Extensions. UX assumption that should be validated, not assumed.

## Acceptance Criteria

### Functional Requirements

- [ ] Client can upload an XML sample and generate a preview of the actual output file
- [ ] Preview works for all 9 export formats (xlsx, csv, html, word, xlsx-native, docx-native, pptx-native, ods-native, odt-native)
- [ ] Preview shows row count, column count, output byte size, and processing time
- [ ] Client can download the generated output file
- [ ] HTML preview renders inline in a sandboxed iframe (`srcdoc` + `sandbox=""`)
- [ ] CSV preview shows rows in a table
- [ ] XSLT syntax errors are surfaced as actionable error messages
- [ ] Preview data can be received via bridge (`LOAD_PREVIEW_DATA` message)
- [ ] XML sample from inference is automatically available for preview (no re-upload)
- [ ] Preview uses explicit "Generate Preview" button (not auto-refresh)
- [ ] XML with DOCTYPE/ENTITY declarations is rejected with clear error message

### Non-Functional Requirements

- [ ] XML sample size capped at 5 MB (enforced at Zod schema level and application level)
- [ ] XML sample stored in `useRef`, not React state
- [ ] Generate button disabled with `aria-describedby` when no XML loaded
- [ ] Status region has `aria-live="polite"` for screen reader announcements
- [ ] Preview iframe has `title` attribute
- [ ] Download Blob URLs tracked in ref and revoked on new generation and unmount
- [ ] Stale preview detected and indicated when config changes after generation

### Quality Gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` passes (all existing + new tests)
- [ ] Spike test: golden test XSLT processed through `xslt-processor` produces correct output
- [ ] Spike test: XML bomb payload rejected before parsing
- [ ] New unit tests for transform runner, orchestrator, DTD rejection
- [ ] Manual test: load XML sample → generate preview → download file → verify file opens correctly
- [ ] Manual test: load XSD (no sample) → Preview tab shows "Upload XML sample to preview" message
- [ ] Manual test: switch format → generate again → verify correct output format
- [ ] Manual test: XSLT with syntax error → clear error message shown

## Dependencies & Prerequisites

- `xslt-processor` npm package (pure JS, LGPL-3.0, ~50 KB, TypeScript, ships own types)
- Existing infrastructure: XSLT generators, post-processor registry, default scaffolds, bridge system
- Phase 2 estimation work (already completed) — data-informed estimates available

**Prerequisite spike (before Phase 1):**
1. Run golden test XSLT through `xslt-processor` to verify feature compatibility
2. Test `xslt-processor` `xmlParse()` with XML bomb payloads to verify entity expansion behaviour
3. Verify `xslt-processor` output serialisation matches what post-processors expect as `PostProcessInput.xsltOutput`

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `xslt-processor` doesn't support an XSLT feature our generators use | Low | High | All generators use standard XSLT 1.0. Spike test verifies compatibility. |
| `xslt-processor` entity expansion attack | Medium | High | Reject `<!DOCTYPE`/`<!ENTITY` before parsing. Disable `fetchFunction`. |
| Large XML samples cause browser OOM | Medium | Medium | 5 MB cap + `useRef` storage (not React state). |
| Web Worker blocked by CSP in embedded iframe | N/A (v1) | N/A | Workers deferred to v2. Main-thread transform in v1. |
| `xslt-processor` abandoned / unmaintained | Low | Medium | Package is pure JS. Can be forked/vendored if needed. LGPL-3.0 allows this. |
| HTML preview XSS via XSLT-generated content | Medium | Medium | `sandbox=""` + `srcdoc` + HTML sanitisation before preview. |
| Existing bridge origin vulnerabilities | Low | High | Fix `"*"` fallback and `SET_ORIGIN_WHITELIST` before expanding bridge. |

## Files Summary (Revised)

| Action | File | Phase |
|--------|------|-------|
| Install | `xslt-processor` npm dependency | 1.1 |
| Create | `src/engine/preview/types.ts` | 1.2 |
| Create | `src/engine/preview/preview.ts` | 1.3 |
| Create | `src/engine/preview/index.ts` | 1.4 |
| Create | `src/engine/preview/preview.test.ts` | 1.5 |
| Modify | `src/state/app-state.tsx` | 2.1, 2.3 |
| Modify | `src/bridge/types.ts` | 2.2 |
| Modify | `src/bridge/schemas.ts` | 2.2 |
| Modify | `src/bridge/message-handler.ts` | 2.2 |
| Modify | `src/App.tsx` | 2.3, 3.3, 3.4 |
| Create | `src/components/preview/PreviewPanel.tsx` | 3.1 |
| Create | `src/components/preview/PreviewPanel.module.css` | 3.1 |
| Create | `src/components/preview/index.ts` | 3.2 |

> **Reduced from original plan:** 13 file operations (down from 16). Eliminated `xslt-runner.ts` (merged), `preview-worker.ts` (deferred), `use-preview-worker.ts` (deferred). Net new files: 7 (down from 10).

## Future Extensions (Not in Scope)

- **Web Worker for transforms**: Add `engine/preview/preview-worker.ts` + `components/hooks/usePreview.ts` if performance data shows main-thread transforms blocking the UI
- **Estimated vs actual comparison**: Show actual output size alongside estimated size to validate estimation accuracy
- **Auto-switch to Preview tab**: When XML sample is loaded and columns are configured
- **Budget mode**: Set a target file size, get warned when preview exceeds it
- **Per-node cost visualisation**: Show each tree node's byte contribution based on actual preview output
- **Smart onboarding**: Use preview results to suggest field removals ("Column 'InternalCode' is empty in 98% of rows")
- **A/B config comparison**: Preview two configs side-by-side

## References

- Brainstorm: `docs/brainstorms/2026-02-18-live-preview-engine-brainstorm.md`
- XSLT registry: `src/engine/generation/xslt-registry.ts`
- Post-processor registry: `src/engine/generation/post-processor-registry.ts`
- Default scaffolds: `src/engine/document-templates/default-scaffolds.ts`
- Bridge types: `src/bridge/types.ts`
- App state: `src/state/app-state.tsx`
- XSLT generators (all output version="1.0"): `src/engine/generation/xslt-*.ts`
- `xslt-processor` GitHub: `https://github.com/DesignLiquido/xslt-processor`
