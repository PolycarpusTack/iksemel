# Brainstorm: Live Preview Engine ("Show Me What I'm Building")

**Date:** 2026-02-18
**Status:** Brainstorm complete, ready for planning

## What We're Building

A live preview system that lets clients run their XFEB configuration against real XML data and download the actual output file (XLSX, CSV, HTML, Word, etc.) — all in the browser, before deploying to WHATS'ON.

### The Problem

Clients face three compounding pain points:

1. **"I don't know where to start"** — They select all fields and tweak in XSLT, because the schema tree is abstract. They can't see what their choices produce until production.
2. **"My exports are too big/slow"** — Selecting everything creates bloated payloads. Current size estimates are helpful but abstract — clients need to see the real output to understand the cost.
3. **"I can't validate before deploying"** — There's no way to know if a config actually works until it runs in WHATS'ON. XSLT errors, empty columns, and wrong formats are only discovered after deployment.

### The Solution

Upload (or receive via bridge) a sample XML document, apply the current XFEB configuration (field selection + filters + XSLT + post-processing), and produce the actual output file for download — with row count, byte size, and any processing errors surfaced inline.

## Why This Approach

- **Highest impact per feature**: Solves all three pain points simultaneously.
- **Concrete over abstract**: A downloadable .xlsx file is infinitely more convincing than a byte estimate.
- **Builds on existing work**: The inference engine already walks XML samples. The generation engine already produces XSLT for 9 formats. The native post-processors already produce ZIP packages. We're connecting existing pipes.
- **Saxon-JS matches production**: Using the same XSLT 3.0 processor as the server means preview fidelity equals production fidelity.

## Key Decisions

### 1. Saxon-JS for in-browser XSLT processing

- Full XSLT 3.0 support matching the production Saxon processor
- Adds ~500 KB dependency (acceptable for the value it delivers)
- Requires compiling XSLT to SEF (Saxon Execution Format) — can be done client-side with `SaxonJS.compile()` or we pre-compile at generation time
- Native `XSLTProcessor` was considered but limited to XSLT 1.0 (our generators use 2.0/3.0 features)

### 2. XML sample data sources (three paths)

- **Manual upload**: Client drags an XML file into XFEB (existing SchemaUpload flow)
- **Bridge push**: WHATS'ON sends a representative data slice via a new `LOAD_PREVIEW_DATA` message when the schema loads
- **Reuse inference sample**: If the schema was loaded from an XML sample, that same XML is the preview data (zero extra work for the client)

### 3. Full output file download (not just a table render)

- For **HTML**: render inline in an iframe + offer download
- For **CSV**: show first N rows in a table + offer download
- For **XLSX/DOCX/PPTX/ODS/ODT**: generate the ZIP package in-browser using the existing native post-processors + offer download (these can't be meaningfully rendered inline)
- Show **row count**, **output byte size**, **column count**, and **processing time** alongside the download

### 4. XSLT validation as a side effect

- Saxon-JS compilation will catch syntax errors, undefined variables, and type mismatches
- Surface these as actionable error messages in the UI before the client even attempts a preview
- This gives "free" XSLT validation without a separate validation step

## Architecture Sketch

```
XML Sample (upload / bridge / inference)
    |
    v
[Filter XML] --apply--> Filtered XML subset
    |
    v
[Generated XSLT] --Saxon-JS.transform()--> Transformed output
    |
    v
[Post-Processor] --zip/format--> Final file (XLSX, CSV, HTML, etc.)
    |
    v
[Preview Panel] --stats + download--> Client sees row count, size, downloads file
```

### Components Involved

**New:**
- `engine/preview/` — preview orchestrator (coordinates filter → transform → post-process pipeline)
- `engine/preview/saxon-runner.ts` — Saxon-JS wrapper (compile SEF, run transform, capture errors)
- `engine/preview/filter-applier.ts` — applies filter XML to source XML (may use Saxon-JS XPath or DOM filtering)
- `components/preview/PreviewPanel.tsx` — UI panel showing stats, errors, and download button
- Bridge: new `LOAD_PREVIEW_DATA` inbound message type

**Existing (reused):**
- `engine/generation/xslt-registry.ts` — generates the XSLT
- `engine/generation/filter-xml.ts` — generates the filter XML
- `engine/generation/post-processor-*.ts` — produces final output files
- `engine/inference/estimation-config.ts` — data-informed size estimation (for comparison with actual)

### Key Technical Questions

1. **Saxon-JS SEF compilation**: Can `SaxonJS.compile()` run in a Web Worker to avoid blocking the main thread? (Likely yes — Saxon-JS supports worker contexts.)
2. **Filter application**: Our filter XML is declarative. Do we apply it as an XSLT pre-pass, as DOM filtering, or let the main XSLT handle it? (The current XSLT generators embed filter logic, so probably just pass the full XML and let the XSLT filter.)
3. **Memory limits**: Large XML samples (5-10 MB) transformed in-browser could hit memory limits. Need a safety cap + progress indicator.
4. **Native format post-processing**: The post-processors currently expect XSLT output as strings. Need to verify they work with Saxon-JS output serialisation.

## Open Questions

1. Should the preview panel be a new tab or a modal/drawer? (Leaning toward a new "Preview" tab next to the existing XSLT/Filter/Report tabs.)
2. Should we show a "diff" between estimated size and actual size? (e.g. "Estimated: 847 KB / Actual: 912 KB" — builds trust in estimates over time.)
3. Should preview auto-refresh when the config changes, or only run on explicit "Generate Preview" button press? (Leaning toward explicit — transforms are expensive.)
4. For the bridge path: should WHATS'ON send preview data automatically on schema load, or should the client request it? (Could be both — auto-send a small slice, client requests full sample.)

## Future Extensions (Not in Scope Now)

- **Budget mode**: Set a target file size, get warned when preview exceeds it (builds on this + estimation work)
- **Per-node cost visualisation**: Show each tree node's byte contribution based on actual preview output
- **Smart onboarding**: Use preview results to suggest field removals ("Column 'InternalCode' is empty in 98% of rows — remove?")
- **A/B config comparison**: Preview two configs side-by-side to compare output
- **Guardrails theme (Approach B)**: Budget mode + per-node cost + smarter warnings (complementary, can be built incrementally after preview exists)
- **Smart Onboarding theme (Approach C)**: Use-case templates + auto-select (independent workstream)
