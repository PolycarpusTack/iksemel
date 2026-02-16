/**
 * Shared test fixtures and factory helpers.
 *
 * Provides canonical instances of StyleConfig, ReportMetadata,
 * ColumnDefinition[], and SchemaNode factories used across test suites.
 */

import type {
  SchemaNode,
  StyleConfig,
  ReportMetadata,
  ColumnDefinition,
  GeneratorInput,
  DocumentTemplate,
  TemplateZipEntry,
} from "@/types";

// ─── Style ──────────────────────────────────────────────────────────────

export const TEST_STYLE: StyleConfig = {
  name: "Test",
  headerBg: "#1a365d",
  headerFg: "#ffffff",
  altRowBg: "#f7f9fc",
  groupBg: "#e8edf5",
  fontFamily: "Calibri, sans-serif",
  fontSize: "10",
  showTitle: true,
  showFooter: true,
  autoFilter: true,
  orientation: "landscape",
  delimiter: ",",
  quoteChar: '"',
  margins: "1in",
};

// ─── Metadata ───────────────────────────────────────────────────────────

export const TEST_METADATA: ReportMetadata = {
  name: "Test Report",
  description: "A test report",
  version: "1.0.0",
  author: "Tester",
  category: "Schedule",
  tags: ["test"],
  scheduleEnabled: false,
  scheduleCron: "",
  scheduleDescription: "",
  outputPath: "",
  emailRecipients: "",
  overwrite: false,
  xsltProcessor: "saxon",
  stylePreset: "corporate",
};

// ─── Columns ────────────────────────────────────────────────────────────

export const TEST_COLUMNS: ColumnDefinition[] = [
  { id: "c1", xpath: "SlotDate", header: "Date", format: "date", align: "left", width: 120, fullPath: "Slot/SlotDate" },
  { id: "c2", xpath: "StartTime", header: "Start Time", format: "datetime", align: "left", width: 150, fullPath: "Slot/StartTime" },
  { id: "c3", xpath: "Programme/Title", header: "Title", format: "text", align: "left", width: 200, fullPath: "Slot/Programme/Title" },
];

// ─── SchemaNode factories ───────────────────────────────────────────────

export function makeLeaf(
  id: string,
  name: string,
  typeName = "string",
  maxOccurs = "1",
): SchemaNode {
  return {
    id, name, documentation: "",
    minOccurs: "1", maxOccurs,
    type: "simple", typeName,
    children: [], isRequired: true,
  };
}

export function makeContainer(
  id: string,
  name: string,
  children: SchemaNode[],
  maxOccurs = "1",
): SchemaNode {
  return {
    id, name, documentation: "",
    minOccurs: "1", maxOccurs,
    type: "complex", typeName: "",
    children, isRequired: true,
  };
}

// ─── Column factory ─────────────────────────────────────────────────────

export function makeColumn(
  id: string,
  header: string,
  overrides?: Partial<ColumnDefinition>,
): ColumnDefinition {
  return {
    id, xpath: id, header,
    format: "text", align: "left", width: 120, fullPath: id,
    ...overrides,
  };
}

// ─── GeneratorInput factory ─────────────────────────────────────────────

export function makeGeneratorInput(
  overrides: Partial<GeneratorInput> = {},
): GeneratorInput {
  return {
    format: "xlsx",
    columns: TEST_COLUMNS,
    rowSource: "//Slot",
    style: TEST_STYLE,
    groupBy: null,
    sortBy: null,
    title: "Test Export",
    documentTemplate: null,
    ...overrides,
  };
}

// ─── Document template factory ───────────────────────────────────────────

export function makeDocumentTemplate(
  overrides: Partial<DocumentTemplate> = {},
): DocumentTemplate {
  return {
    id: "test-template-1",
    name: "Test Template",
    sourceFormat: "xlsx",
    targetFormat: "xlsx-native",
    scaffoldEntries: MINIMAL_XLSX_SCAFFOLD,
    injectionTarget: "xl/worksheets/sheet1.xml",
    injectionXPath: "//sheetData",
    extractedStyles: null,
    uploadedAt: new Date().toISOString(),
    originalFilename: "test-template.xlsx",
    ...overrides,
  };
}

export const MINIMAL_XLSX_SCAFFOLD: TemplateZipEntry[] = [
  {
    path: "[Content_Types].xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`,
    encoding: "utf-8",
    isDataTarget: false,
  },
  {
    path: "_rels/.rels",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    encoding: "utf-8",
    isDataTarget: false,
  },
  {
    path: "xl/workbook.xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    encoding: "utf-8",
    isDataTarget: false,
  },
  {
    path: "xl/_rels/workbook.xml.rels",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`,
    encoding: "utf-8",
    isDataTarget: false,
  },
  {
    path: "xl/styles.xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1A365D"/></patternFill></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"/>
  </cellXfs>
</styleSheet>`,
    encoding: "utf-8",
    isDataTarget: false,
  },
  {
    path: "xl/sharedStrings.xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>`,
    encoding: "utf-8",
    isDataTarget: false,
  },
  {
    path: "xl/worksheets/sheet1.xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData/>
</worksheet>`,
    encoding: "utf-8",
    isDataTarget: true,
  },
];

// ─── XSD wrapper ────────────────────────────────────────────────────────

export function xsd(content: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">${content}</xs:schema>`;
}
