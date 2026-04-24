import { test, expect, _electron as electron } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Electron app launches and shows schema upload panel", async () => {
  const appPath = path.join(__dirname, "../out/main/index.js");

  const app = await electron.launch({ args: [appPath] });
  try {
    const page = await app.firstWindow();

    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h2")).toContainText("Load XSD Schema");
  } finally {
    await app.close();
  }
});

test("window.electronAPI is defined in renderer", async () => {
  const appPath = path.join(__dirname, "../out/main/index.js");

  const app = await electron.launch({ args: [appPath] });
  try {
    const page = await app.firstWindow();

    await page.waitForLoadState("domcontentloaded");

    const hasElectronAPI = await page.evaluate(() => typeof window.electronAPI === "object");
    expect(hasElectronAPI).toBe(true);
  } finally {
    await app.close();
  }
});
