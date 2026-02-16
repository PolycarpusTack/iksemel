/**
 * Document template extractor framework.
 *
 * Parses uploaded document files (OOXML/ODF), extracts their structure
 * as scaffold ZIP entries, detects format, and delegates to format-specific
 * extractors for style extraction.
 */

import JSZip from "jszip";
import type { DocumentTemplate, DocumentTemplateFormat, TemplateZipEntry, ExtractedStyles, ExportFormat } from "@/types";
import { extractXlsxStyles } from "./xlsx-extractor";
import { extractDocxStyles } from "./docx-extractor";

/** Maximum decompressed size (50MB) for zip bomb protection. */
const MAX_DECOMPRESSED_SIZE = 50 * 1024 * 1024;

/** File extensions → template format mapping. */
const FORMAT_MAP: Readonly<Record<string, DocumentTemplateFormat>> = {
  ".xlsx": "xlsx",
  ".docx": "docx",
  ".pptx": "pptx",
  ".ods": "ods",
  ".odt": "odt",
};

/** Template format → target export format mapping. */
const TARGET_FORMAT_MAP: Readonly<Record<DocumentTemplateFormat, ExportFormat>> = {
  xlsx: "xlsx-native",
  docx: "docx-native",
  pptx: "pptx-native",
  ods: "ods-native",
  odt: "odt-native",
};

/** Template format → injection target path. */
const INJECTION_TARGETS: Readonly<Record<DocumentTemplateFormat, string>> = {
  xlsx: "xl/worksheets/sheet1.xml",
  docx: "word/document.xml",
  pptx: "ppt/slides/slide1.xml",
  ods: "content.xml",
  odt: "content.xml",
};

/**
 * Extracts a document template from an uploaded file.
 *
 * @param file - The raw file contents as ArrayBuffer
 * @param filename - Original filename (used for format detection)
 * @returns Parsed DocumentTemplate with scaffold entries and extracted styles
 * @throws Error on invalid/unsupported files, zip bombs, or macro-containing files
 */
export async function extractDocumentTemplate(
  file: ArrayBuffer,
  filename: string,
): Promise<DocumentTemplate> {
  // Detect format from extension
  const ext = getExtension(filename);
  const format = FORMAT_MAP[ext];
  if (!format) {
    throw new Error(
      `Unsupported file format "${ext}". ` +
      `Supported: ${Object.keys(FORMAT_MAP).join(", ")}`,
    );
  }

  // Parse ZIP
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error("File is not a valid ZIP archive");
  }

  // Security: check for macros
  await rejectMacros(zip, format);

  // Security: check decompressed size
  await checkDecompressedSize(zip);

  // Validate expected structure
  validateStructure(zip, format);

  // Extract scaffold entries
  const scaffoldEntries = await extractScaffoldEntries(zip);

  // Extract styles (format-specific)
  const extractedStyles = await extractStyles(zip, format);

  const injectionTarget = INJECTION_TARGETS[format];

  return {
    id: `tmpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: filenameWithoutExtension(filename),
    sourceFormat: format,
    targetFormat: TARGET_FORMAT_MAP[format],
    scaffoldEntries,
    injectionTarget,
    injectionXPath: "//sheetData",
    extractedStyles,
    uploadedAt: new Date().toISOString(),
    originalFilename: filename,
  };
}

/**
 * Gets the lowercase file extension including the dot.
 */
function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

/**
 * Gets filename without extension.
 */
function filenameWithoutExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(0, dot) : filename;
}

/**
 * Rejects files containing macros (security measure).
 */
async function rejectMacros(zip: JSZip, format: DocumentTemplateFormat): Promise<void> {
  // OOXML macro check
  if (format === "xlsx" || format === "docx" || format === "pptx") {
    if (zip.file("vbaProject.bin") ?? zip.file(/vbaProject\.bin/).length > 0) {
      throw new Error("Files containing macros (VBA) are not allowed for security reasons");
    }
  }

  // ODF macro check
  if (format === "ods" || format === "odt") {
    if (zip.file("Basic/") ?? zip.file(/\/macro/).length > 0) {
      throw new Error("Files containing macros are not allowed for security reasons");
    }
  }
}

/**
 * Checks that total decompressed size doesn't exceed the limit (zip bomb protection).
 */
async function checkDecompressedSize(zip: JSZip): Promise<void> {
  let totalSize = 0;
  const entries = Object.values(zip.files);
  for (const entry of entries) {
    if (entry.dir) continue;
    const data = await entry.async("uint8array");
    totalSize += data.length;
    if (totalSize > MAX_DECOMPRESSED_SIZE) {
      throw new Error(
        `Decompressed file size exceeds ${String(MAX_DECOMPRESSED_SIZE / (1024 * 1024))}MB limit`,
      );
    }
  }
}

/**
 * Validates that the ZIP contains expected parts for the given format.
 */
function validateStructure(zip: JSZip, format: DocumentTemplateFormat): void {
  const requiredParts: Record<DocumentTemplateFormat, string[]> = {
    xlsx: ["[Content_Types].xml", "xl/workbook.xml"],
    docx: ["[Content_Types].xml", "word/document.xml"],
    pptx: ["[Content_Types].xml", "ppt/presentation.xml"],
    ods: ["content.xml", "META-INF/manifest.xml"],
    odt: ["content.xml", "META-INF/manifest.xml"],
  };

  const required = requiredParts[format];
  for (const part of required) {
    if (!zip.file(part)) {
      throw new Error(
        `Invalid ${format.toUpperCase()} file: missing required part "${part}"`,
      );
    }
  }
}

/**
 * Extracts all ZIP entries as TemplateZipEntry objects.
 */
async function extractScaffoldEntries(zip: JSZip): Promise<TemplateZipEntry[]> {
  const entries: TemplateZipEntry[] = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;

    // Try to read as text first; binary content gets base64
    let content: string | Uint8Array;
    let encoding: "utf-8" | "binary";

    if (isTextFile(path)) {
      content = await entry.async("string");
      encoding = "utf-8";
    } else {
      content = await entry.async("uint8array");
      encoding = "binary";
    }

    entries.push({
      path,
      content,
      encoding,
      isDataTarget: false, // Will be set by the caller based on format
    });
  }

  return entries;
}

/**
 * Determines if a file path is likely a text/XML file.
 */
function isTextFile(path: string): boolean {
  const textExtensions = [".xml", ".rels", ".txt", ".css", ".xsl", ".xslt"];
  const lowerPath = path.toLowerCase();
  return textExtensions.some((ext) => lowerPath.endsWith(ext));
}

/**
 * Delegates to format-specific style extraction.
 */
async function extractStyles(
  zip: JSZip,
  format: DocumentTemplateFormat,
): Promise<ExtractedStyles | null> {
  switch (format) {
    case "xlsx":
      return extractXlsxStyles(zip);
    case "docx":
      return extractDocxStyles(zip);
    default:
      // PPTX, ODS, ODT extractors not yet implemented (Phase 3)
      return null;
  }
}
