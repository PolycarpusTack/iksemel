# Electron Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing XFEB React app in an Electron window using electron-vite, with a typed empty context bridge preload — all existing features continue working, the web build is unaffected.

**Architecture:** electron-vite builds three targets (main, preload, renderer) from the same source tree. The main process creates a BrowserWindow and loads the renderer. The preload script exposes an empty `window.electronAPI` via `contextBridge` — populated with real methods in Plans 2 and 3. The existing `vite.config.ts` web build is preserved and untouched.

**Tech Stack:** electron ^33, electron-vite ^3, electron-builder ^25, @playwright/test (already installed) for Electron smoke test.

---

## File Map

**New files:**
- `Iksemel/electron.vite.config.ts` — electron-vite build config (main + preload + renderer)
- `Iksemel/tsconfig.electron.json` — TypeScript config for main process (Node target, excludes src/)
- `Iksemel/electron-builder.config.ts` — packaging config (Windows NSIS + macOS dmg, no signing yet)
- `Iksemel/electron/main/index.ts` — BrowserWindow creation, app lifecycle
- `Iksemel/electron/preload/api.ts` — `ElectronAPI` interface (empty, grows in Plans 2+3)
- `Iksemel/electron/preload/index.ts` — `contextBridge.exposeInMainWorld('electronAPI', ...)`
- `Iksemel/src/electron.d.ts` — `window.electronAPI?: ElectronAPI` global type declaration
- `Iksemel/e2e/electron-smoke.spec.ts` — Playwright Electron launch + render check

**Modified files:**
- `Iksemel/package.json` — add electron deps, `"main"` field, `dev:electron`/`build:electron`/`dist:win`/`dist:mac` scripts
- `Iksemel/tsconfig.json` — exclude `electron/**` (uses Node APIs, not browser)
- `Iksemel/.gitignore` — add `out/` and `dist-electron/`

---

## Task 1: Install Electron dependencies

**Files:** `Iksemel/package.json`

- [ ] **Step 1: Install packages**

```bash
cd Iksemel
npm install --save-dev electron@^33 electron-vite@^3 electron-builder@^25
```

Expected: packages added to `devDependencies`, no peer-dep errors.

- [ ] **Step 2: Verify existing tests still pass**

```bash
npx vitest run
```

Expected: same result as before — 568 passing, 4 golden failures (pre-existing).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install electron, electron-vite, electron-builder"
```

---

## Task 2: Configure TypeScript for the Electron main process

**Files:** `Iksemel/tsconfig.json`, `Iksemel/tsconfig.electron.json`

The main process uses Node.js APIs (`path`, `electron`). The browser tsconfig (`lib: ["DOM"]`) rejects these. We need to exclude `electron/` from the browser tsconfig and provide a separate tsconfig for IDE support.

- [ ] **Step 1: Exclude `electron/` from the browser tsconfig**

In `Iksemel/tsconfig.json`, change `"include"` to also exclude the electron directory:

```json
{
  "compilerOptions": { ... },
  "include": ["src", "vite-env.d.ts"],
  "exclude": ["electron", "node_modules", "out", "dist", "dist-electron"]
}
```

- [ ] **Step 2: Create `Iksemel/tsconfig.electron.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "outDir": "out",
    "baseUrl": ".",
    "types": ["node"],
    "esModuleInterop": true
  },
  "include": ["electron/**/*.ts"],
  "exclude": ["src", "node_modules", "out"]
}
```

- [ ] **Step 3: Verify renderer type-check is clean**

```bash
npx tsc --noEmit
```

Expected: same two pre-existing errors only (`handleExportWithWarning` unused, `templates.test.ts` format type). No new errors.

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json tsconfig.electron.json
git commit -m "chore: add tsconfig.electron.json for main process, exclude electron/ from browser tsconfig"
```

---

## Task 3: Create the electron-vite build config

**Files:** `Iksemel/electron.vite.config.ts`

electron-vite builds three targets in one command. The renderer config mirrors the existing `vite.config.ts` so the same React app loads in the Electron window.

- [ ] **Step 1: Create `Iksemel/electron.vite.config.ts`**

```typescript
import { resolve } from "path";
import { readFileSync } from "fs";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

interface PackageJsonLite {
  readonly version: string;
}

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf-8"),
) as PackageJsonLite;

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, "electron/main/index.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, "electron/preload/index.ts"),
      },
    },
  },
  renderer: {
    root: __dirname,
    server: { port: 5654 },
    plugins: [react()],
    define: {
      __XFEB_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@engine": resolve(__dirname, "src/engine"),
        "@components": resolve(__dirname, "src/components"),
        "@types": resolve(__dirname, "src/types"),
        "@utils": resolve(__dirname, "src/utils"),
      },
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            engine: [
              "./src/engine/parser/index.ts",
              "./src/engine/selection/index.ts",
              "./src/engine/analysis/index.ts",
              "./src/engine/generation/index.ts",
            ],
            zip: ["jszip"],
          },
        },
      },
    },
  },
});
```

Note: the renderer dev server uses port **5654** to avoid colliding with the web dev server on **5653**.

- [ ] **Step 2: Verify electron-vite can parse the config**

```bash
npx electron-vite --version
```

Expected: version printed (e.g. `3.x.x`), no config parse error.

- [ ] **Step 3: Commit**

```bash
git add electron.vite.config.ts
git commit -m "chore: add electron.vite.config.ts"
```

---

## Task 4: Create the preload script and API types

**Files:** `Iksemel/electron/preload/api.ts`, `Iksemel/electron/preload/index.ts`, `Iksemel/src/electron.d.ts`

The context bridge exposes `window.electronAPI` to the renderer. The interface is empty now and grows in Plans 2 and 3. `contextIsolation: true` + `nodeIntegration: false` is the secure default.

- [ ] **Step 1: Create `Iksemel/electron/preload/api.ts`**

```typescript
// ElectronAPI is populated incrementally across Plans 2 and 3.
// The empty interface is intentional — it grows as IPC handlers are added.
export interface ElectronAPI {}
```

- [ ] **Step 2: Create `Iksemel/electron/preload/index.ts`**

```typescript
import { contextBridge } from "electron";
import type { ElectronAPI } from "./api";

const api: ElectronAPI = {};

contextBridge.exposeInMainWorld("electronAPI", api);
```

- [ ] **Step 3: Create `Iksemel/src/electron.d.ts`**

This gives the renderer TypeScript knowledge of `window.electronAPI` without importing Node.js modules:

```typescript
import type { ElectronAPI } from "../electron/preload/api";

declare global {
  interface Window {
    readonly electronAPI?: ElectronAPI;
  }
}

export {};
```

- [ ] **Step 4: Verify renderer type-check still clean**

```bash
npx tsc --noEmit
```

Expected: same two pre-existing errors only.

- [ ] **Step 5: Commit**

```bash
git add electron/preload/api.ts electron/preload/index.ts src/electron.d.ts
git commit -m "feat(electron): add empty context bridge preload and window.electronAPI type declaration"
```

---

## Task 5: Create the Electron main process entry

**Files:** `Iksemel/electron/main/index.ts`

The main process creates a `BrowserWindow`. In dev it loads the electron-vite renderer dev server (`ELECTRON_RENDERER_URL` env var set by electron-vite). In production it loads the built `renderer/index.html`.

- [ ] **Step 1: Create `Iksemel/electron/main/index.ts`**

```typescript
import { app, BrowserWindow } from "electron";
import { join } from "path";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "XML Filter & Export Builder",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.on("ready-to-show", () => {
    win.show();
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
```

- [ ] **Step 2: Commit**

```bash
git add electron/main/index.ts
git commit -m "feat(electron): add main process entry with BrowserWindow"
```

---

## Task 6: Update package.json with scripts and metadata

**Files:** `Iksemel/package.json`, `Iksemel/.gitignore`

- [ ] **Step 1: Add `"main"` field and Electron scripts to `package.json`**

Add the following to `Iksemel/package.json` (merge with existing content, do not replace other fields):

```json
{
  "main": "out/main/index.js",
  "scripts": {
    "dev:electron": "electron-vite dev",
    "build:electron": "electron-vite build",
    "preview:electron": "electron-vite preview",
    "dist:win": "npm run build:electron && electron-builder --win --config electron-builder.config.ts",
    "dist:mac": "npm run build:electron && electron-builder --mac --config electron-builder.config.ts"
  }
}
```

The existing `"dev"`, `"build"`, `"test"` scripts are unchanged.

- [ ] **Step 2: Add electron output dirs to `.gitignore`**

Append to `Iksemel/.gitignore`:

```
out/
dist-electron/
```

- [ ] **Step 3: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: add electron scripts and output dirs to gitignore"
```

---

## Task 7: Create electron-builder packaging config

**Files:** `Iksemel/electron-builder.config.ts`

Code signing is omitted for now (Plan 4). This config produces unsigned installers suitable for internal testing.

- [ ] **Step 1: Create `Iksemel/electron-builder.config.ts`**

```typescript
import type { Configuration } from "electron-builder";

const config: Configuration = {
  appId: "com.whatson.xfeb",
  productName: "XML Filter & Export Builder",
  copyright: "Copyright © 2026",
  directories: {
    output: "dist-electron",
    buildResources: "build",
  },
  files: [
    "out/**",
    "package.json",
  ],
  extraMetadata: {
    main: "out/main/index.js",
  },
  win: {
    target: [
      { target: "nsis", arch: ["x64"] },
      { target: "zip", arch: ["x64"] },
    ],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
  mac: {
    target: [
      { target: "dmg", arch: ["universal"] },
    ],
    category: "public.app-category.productivity",
    hardenedRuntime: true,
    gatekeeperAssess: false,
  },
  dmg: {
    sign: false,
  },
  publish: {
    provider: "github",
    releaseType: "release",
  },
};

export default config;
```

- [ ] **Step 2: Commit**

```bash
git add electron-builder.config.ts
git commit -m "chore: add electron-builder config (unsigned, Windows + macOS)"
```

---

## Task 8: Write and run the Electron smoke test

**Files:** `Iksemel/e2e/electron-smoke.spec.ts`

Playwright's `_electron` API launches the compiled app and checks that it renders. The existing `e2e/smoke.spec.ts` runs against the web build — this is a separate spec that runs against the Electron build.

- [ ] **Step 1: Write the failing test**

Create `Iksemel/e2e/electron-smoke.spec.ts`:

```typescript
import { test, expect, _electron as electron } from "@playwright/test";
import path from "path";

test("Electron app launches and shows schema upload panel", async () => {
  const appPath = path.join(__dirname, "../out/main/index.js");

  const app = await electron.launch({ args: [appPath] });
  const page = await app.firstWindow();

  await page.waitForLoadState("domcontentloaded");

  await expect(page.locator("h2")).toContainText("Load XSD Schema");

  await app.close();
});

test("window.electronAPI is defined in renderer", async () => {
  const appPath = path.join(__dirname, "../out/main/index.js");

  const app = await electron.launch({ args: [appPath] });
  const page = await app.firstWindow();

  await page.waitForLoadState("domcontentloaded");

  const hasElectronAPI = await page.evaluate(() => typeof window.electronAPI === "object");
  expect(hasElectronAPI).toBe(true);

  await app.close();
});
```

- [ ] **Step 2: Build the Electron app**

```bash
cd Iksemel
npm run build:electron
```

Expected: `out/main/index.js`, `out/preload/index.js`, `out/renderer/index.html` created. No build errors.

- [ ] **Step 3: Run the smoke test**

```bash
npx playwright test e2e/electron-smoke.spec.ts
```

Expected: 2 tests pass.

- [ ] **Step 4: Verify existing web smoke test is unaffected**

```bash
npx vitest run
```

Expected: 568 passing, 4 golden failures (unchanged).

- [ ] **Step 5: Commit**

```bash
git add e2e/electron-smoke.spec.ts
git commit -m "test(electron): add Playwright smoke tests for Electron app launch"
```

---

## Task 9: Manual dev launch verification

This step cannot be automated — it verifies the hot-reload dev workflow works end-to-end.

- [ ] **Step 1: Start the Electron dev session**

```bash
cd Iksemel
npm run dev:electron
```

Expected: an Electron window opens, showing the "Load XSD Schema" upload panel. The existing app features (load demo, XSD paste, design tab, etc.) all work.

- [ ] **Step 2: Verify hot reload**

Make a trivial visible change to any `.tsx` file (e.g. add a space in a label). Save the file. Expected: the Electron window refreshes automatically within 1-2 seconds with the change applied.

- [ ] **Step 3: Verify web build still works independently**

In a separate terminal:

```bash
npm run dev
```

Expected: web app opens at `http://localhost:5653` independently. Both dev servers can run simultaneously without conflict (Electron uses 5654, web uses 5653).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(electron): working Electron shell with electron-vite — all existing features intact"
```

---

## Verification Checklist

Before moving to Plan 2, confirm:

- [ ] `npm run build:electron` completes without errors
- [ ] `npx playwright test e2e/electron-smoke.spec.ts` — 2 tests pass
- [ ] `npx vitest run` — 568 passing, same 4 golden failures as before
- [ ] `npx tsc --noEmit` — same 2 pre-existing errors, no new ones
- [ ] `npm run dev` (web) and `npm run dev:electron` (Electron) can run simultaneously
- [ ] `window.electronAPI` is accessible (but empty) in the Electron renderer

---

## Notes for Plan 2

Plan 2 (Database Layer) adds real methods to `ElectronAPI` in `electron/preload/api.ts` and implements them as IPC handlers in `electron/main/ipc/`. The renderer accesses them via `window.electronAPI.connections.connect(...)` etc. Plan 2 does not touch the UI — it only adds the IPC surface and DB drivers.
