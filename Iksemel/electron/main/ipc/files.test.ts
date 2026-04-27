// electron/main/ipc/files.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

vi.mock("electron", () => ({
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ["/chosen/dir"] }),
  },
}));

import { registerFilesHandlers } from "./files";

function makeIpcMain() {
  const handlers: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  return {
    handle: vi.fn((channel: string, fn: (...args: unknown[]) => Promise<unknown>) => {
      handlers[channel] = fn;
    }),
    _invoke: async (channel: string, ...args: unknown[]) => {
      const fn = handlers[channel];
      if (!fn) throw new Error(`No handler for ${channel}`);
      return fn({}, ...args);
    },
  };
}

describe("registerFilesHandlers", () => {
  let ipcMain: ReturnType<typeof makeIpcMain>;
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    ipcMain = makeIpcMain();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "iksemel-files-"));
    registerFilesHandlers(ipcMain as any);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("registers 2 channels", () => {
    const channels = ipcMain.handle.mock.calls.map((c) => c[0]);
    expect(channels).toContain("files:chooseOutputDir");
    expect(channels).toContain("files:savePackage");
  });

  it("chooseOutputDir returns selected path", async () => {
    const result = await ipcMain._invoke("files:chooseOutputDir");
    expect(result).toBe("/chosen/dir");
  });

  it("chooseOutputDir returns null when dialog is cancelled", async () => {
    const { dialog } = await import("electron");
    (dialog.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ canceled: true, filePaths: [] });
    const result = await ipcMain._invoke("files:chooseOutputDir");
    expect(result).toBeNull();
  });

  it("savePackage writes files to disk and returns saved paths", async () => {
    const files = {
      "filter.xml": "<filter/>",
      "transform.xsl": "<xsl:stylesheet/>",
    };
    const result = await ipcMain._invoke("files:savePackage", files, tmpDir) as { savedPaths: string[]; outputDir: string };
    expect(result.outputDir).toBe(tmpDir);
    expect(result.savedPaths).toHaveLength(2);
    for (const savedPath of result.savedPaths) {
      expect(fs.existsSync(savedPath)).toBe(true);
    }
    const content = fs.readFileSync(path.join(tmpDir, "filter.xml"), "utf8");
    expect(content).toBe("<filter/>");
  });

  it("savePackage rejects path traversal filenames", async () => {
    await expect(
      ipcMain._invoke("files:savePackage", { "../../evil.txt": "pwned" }, tmpDir),
    ).rejects.toThrow("Rejected unsafe filename");
  });
});
