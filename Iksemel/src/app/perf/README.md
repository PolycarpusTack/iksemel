# XFEB Perf Telemetry

Runtime telemetry is exposed on `window.__XFEB_PERF__` in browser sessions.

Available helpers:
- `window.__XFEB_PERF__.getSamples()`
- `window.__XFEB_PERF__.getSummary()`
- `window.__XFEB_PERF__.clear()`
- `window.__XFEB_PERF__.getRenders()`
- `window.__XFEB_PERF__.clearRenders()`
- `window.__XFEB_PERF__.benchmarkZip(entries)`

Recorded metric per derive cycle:
- `analysisMs`
- `generationMs`
- `totalMs`

Use this to capture local baseline numbers while exercising schema load, selection, and tab workflows.

`why-did-you-render` can be enabled in development via:
- `npm run dev:wdyr`

Optional env toggle (also development-only):
- `VITE_WDYR=true npm run dev`
- `VITE_PERF_PANEL=true npm run dev`
