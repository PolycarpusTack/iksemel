import { describe, expect, it } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExportFormat } from "@/types";
import { makeGeneratorInput, makeDocumentTemplate } from "@/test/fixtures";
import { generateXslt } from "./xslt-registry";

import "./xslt-excel";
import "./xslt-csv";
import "./xslt-word";
import "./xslt-html";
import "./xslt-xlsx-native";
import "./xslt-docx-native";
import "./xslt-pptx-native";
import "./xslt-ods-native";
import "./xslt-odt-native";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const GOLDEN_DIR = join(__dirname, "golden");
const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === "true";

interface GoldenCase {
  readonly id: string;
  readonly format: ExportFormat;
}

const GOLDEN_CASES: readonly GoldenCase[] = [
  { id: "xlsx", format: "xlsx" },
  { id: "csv", format: "csv" },
  { id: "word", format: "word" },
  { id: "html", format: "html" },
  { id: "xlsx-native", format: "xlsx-native" },
  { id: "docx-native", format: "docx-native" },
  { id: "pptx-native", format: "pptx-native" },
  { id: "ods-native", format: "ods-native" },
  { id: "odt-native", format: "odt-native" },
];

function normalizeXml(value: string): string {
  return `${value.replace(/\r\n/g, "\n").trim()}\n`;
}

function buildXslt(format: ExportFormat): string {
  const input = makeGeneratorInput({
    format,
    ...(format === "xlsx-native"
      ? { documentTemplate: makeDocumentTemplate() }
      : {}),
  });
  return normalizeXml(generateXslt(input));
}

describe("XSLT golden outputs", () => {
  it("matches committed golden files", async () => {
    await mkdir(GOLDEN_DIR, { recursive: true });

    for (const testCase of GOLDEN_CASES) {
      const actual = buildXslt(testCase.format);
      const fixturePath = join(GOLDEN_DIR, `${testCase.id}.xslt`);

      if (UPDATE_GOLDEN) {
        await writeFile(fixturePath, actual, "utf8");
        continue;
      }

      const expected = await readFile(fixturePath, "utf8");
      expect(actual).toBe(normalizeXml(expected));
    }
  });
});
