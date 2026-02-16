import { describe, it, expect } from "vitest";
import type { SchemaNode, SelectionState, ColumnDefinition, FilterValuesState } from "@/types";
import { generateFilterXml } from "./filter-xml";
import { generateXslt, clearRegistry, getRegisteredFormats, registerGenerator } from "./xslt-registry";
import { generateReportDefinition } from "./report-definition";
import type { ReportDefinitionInput } from "./report-definition";
import { makeLeaf, makeContainer, makeGeneratorInput, TEST_STYLE as testStyle, TEST_COLUMNS as testColumns } from "@/test/fixtures";

// Import generators (triggers auto-registration + provides named exports)
import { generateExcelXslt } from "./xslt-excel";
import { generateCsvXslt } from "./xslt-csv";
import { generateWordXslt } from "./xslt-word";
import { generateHtmlXslt } from "./xslt-html";

// ─── Filter XML ────────────────────────────────────────────────────────

describe("generateFilterXml", () => {
  const tree: SchemaNode[] = [
    makeContainer("root", "BroadcastExport", [
      makeContainer("channels", "Channels", [
        makeContainer("channel", "Channel", [
          makeLeaf("code", "ChannelCode"),
          makeLeaf("name", "ChannelName"),
        ], "unbounded"),
      ]),
      makeContainer("meta", "ExportMetadata", [
        makeLeaf("ts", "ExportTimestamp", "dateTime"),
      ]),
    ]),
  ];

  it("generates well-formed XML with declaration", () => {
    const sel: SelectionState = { root: true, channels: true, channel: true, code: true };
    const xml = generateFilterXml(tree, sel);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<BroadcastExport>");
    expect(xml).toContain("</BroadcastExport>");
  });

  it("includes only selected nodes", () => {
    const sel: SelectionState = { root: true, channels: true, channel: true, code: true };
    const xml = generateFilterXml(tree, sel);
    expect(xml).toContain("<ChannelCode />");
    expect(xml).not.toContain("ChannelName");
    expect(xml).not.toContain("ExportMetadata");
  });

  it("nests containers correctly", () => {
    const sel: SelectionState = {
      root: true, channels: true, channel: true, code: true, name: true,
    };
    const xml = generateFilterXml(tree, sel);
    expect(xml).toContain("<Channels>");
    expect(xml).toContain("  <Channel>");
    expect(xml).toContain("    <ChannelCode />");
    expect(xml).toContain("    <ChannelName />");
  });

  it("generates self-closing tags for leaves", () => {
    const sel: SelectionState = { root: true, meta: true, ts: true };
    const xml = generateFilterXml(tree, sel);
    expect(xml).toContain("<ExportTimestamp />");
  });

  it("can omit XML declaration", () => {
    const sel: SelectionState = { root: true, meta: true, ts: true };
    const xml = generateFilterXml(tree, sel, { xmlDeclaration: false });
    expect(xml).not.toContain("<?xml");
  });

  it("returns minimal output for empty selection", () => {
    const xml = generateFilterXml(tree, {});
    expect(xml.trim()).toBe('<?xml version="1.0" encoding="UTF-8"?>');
  });
});

// ─── Filter XML with filterValues ───────────────────────────────────────

describe("generateFilterXml with filterValues", () => {
  const tree: SchemaNode[] = [
    makeContainer("root", "BroadcastExport", [
      makeContainer("channels", "Channels", [
        makeContainer("channel", "Channel", [
          makeLeaf("code", "ChannelCode"),
          makeLeaf("name", "ChannelName"),
        ], "unbounded"),
      ]),
      makeContainer("meta", "ExportMetadata", [
        makeLeaf("ts", "ExportTimestamp", "dateTime"),
      ]),
    ]),
  ];

  const baseSel: SelectionState = { root: true, channels: true, channel: true, code: true };

  it("appends Filters section when filterValues provided", () => {
    const filterValues: FilterValuesState = {
      name: {
        xpath: "Channel/ChannelName",
        nodeId: "name",
        operator: "IN",
        values: ["BBC One"],
        typeName: "string",
      },
    };
    const xml = generateFilterXml(tree, baseSel, { filterValues });
    expect(xml).toContain('<Filters xmlns="urn:mediagenix:whatson:filter:v1">');
  });

  it("generates IN operator with values", () => {
    const filterValues: FilterValuesState = {
      name: {
        xpath: "Channel/ChannelName",
        nodeId: "name",
        operator: "IN",
        values: ["BBC One", "ITV"],
        typeName: "string",
      },
    };
    const xml = generateFilterXml(tree, baseSel, { filterValues });
    expect(xml).toContain('operator="IN"');
    expect(xml).toContain("<Value>BBC One</Value>");
    expect(xml).toContain("<Value>ITV</Value>");
  });

  it("generates BETWEEN operator with range", () => {
    const filterValues: FilterValuesState = {
      ts: {
        xpath: "ExportMetadata/ExportTimestamp",
        nodeId: "ts",
        operator: "BETWEEN",
        values: [],
        rangeStart: "2025-01-01",
        rangeEnd: "2025-12-31",
        typeName: "dateTime",
      },
    };
    const xml = generateFilterXml(tree, baseSel, { filterValues });
    expect(xml).toContain('operator="BETWEEN"');
    expect(xml).toContain("<RangeStart>2025-01-01</RangeStart>");
    expect(xml).toContain("<RangeEnd>2025-12-31</RangeEnd>");
  });

  it("generates boolean IS_TRUE filter as self-closing", () => {
    const filterValues: FilterValuesState = {
      code: {
        xpath: "Channel/ChannelCode",
        nodeId: "code",
        operator: "IS_TRUE",
        values: [],
        typeName: "boolean",
      },
    };
    const xml = generateFilterXml(tree, baseSel, { filterValues });
    expect(xml).toContain('operator="IS_TRUE" />');
  });

  it("does not append Filters section when filterValues is empty object", () => {
    const xml = generateFilterXml(tree, baseSel, { filterValues: {} });
    expect(xml).not.toContain("<Filters");
  });

  it("escapes XML special characters in values", () => {
    const filterValues: FilterValuesState = {
      name: {
        xpath: "Channel/ChannelName",
        nodeId: "name",
        operator: "IN",
        values: ["<Breaking>", "Tom & Jerry"],
        typeName: "string",
      },
    };
    const xml = generateFilterXml(tree, baseSel, { filterValues });
    expect(xml).toContain("<Value>&lt;Breaking&gt;</Value>");
    expect(xml).toContain("<Value>Tom &amp; Jerry</Value>");
  });
});

// ─── XSLT Registry ─────────────────────────────────────────────────────

describe("XSLT Registry", () => {
  it("has all four formats registered", () => {
    const formats = getRegisteredFormats();
    expect(formats).toContain("xlsx");
    expect(formats).toContain("csv");
    expect(formats).toContain("word");
    expect(formats).toContain("html");
  });

  it("throws for unregistered format", () => {
    clearRegistry();
    expect(() => generateXslt(makeGeneratorInput())).toThrow("No XSLT generator");
    // Re-register all formats after clearing (imports already ran, won't re-run side effects)
    registerGenerator("xlsx", generateExcelXslt);
    registerGenerator("csv", generateCsvXslt);
    registerGenerator("word", generateWordXslt);
    registerGenerator("html", generateHtmlXslt);
  });
});

// ─── Excel XSLT ────────────────────────────────────────────────────────

describe("Excel XSLT generator", () => {
  it("generates well-formed XSLT", () => {
    const xslt = generateExcelXslt(makeGeneratorInput());
    expect(xslt).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xslt).toContain("<xsl:stylesheet");
    expect(xslt).toContain("</xsl:stylesheet>");
  });

  it("includes FreezePanes directives", () => {
    const xslt = generateExcelXslt(makeGeneratorInput());
    expect(xslt).toContain("FreezePanes");
  });

  it("applies mso-number-format for date columns", () => {
    const xslt = generateExcelXslt(makeGeneratorInput());
    expect(xslt).toContain("mso-number-format");
  });

  it("includes column headers", () => {
    const xslt = generateExcelXslt(makeGeneratorInput());
    expect(xslt).toContain("Date");
    expect(xslt).toContain("Start Time");
    expect(xslt).toContain("Title");
  });

  it("uses specified row source", () => {
    const xslt = generateExcelXslt(makeGeneratorInput({ rowSource: "//Channel" }));
    expect(xslt).toContain('select="//Channel"');
  });

  it("generates sort before group-break when grouping", () => {
    const xslt = generateExcelXslt(makeGeneratorInput({ groupBy: "SlotDate" }));
    const sortIdx = xslt.indexOf("xsl:sort");
    const groupIdx = xslt.indexOf("preceding-sibling");
    expect(sortIdx).toBeGreaterThan(-1);
    expect(groupIdx).toBeGreaterThan(-1);
    // Sort MUST come before group-break detection
    expect(sortIdx).toBeLessThan(groupIdx);
  });
});

// ─── CSV XSLT ──────────────────────────────────────────────────────────

describe("CSV XSLT generator", () => {
  it("generates text output method", () => {
    const xslt = generateCsvXslt(makeGeneratorInput({ format: "csv" }));
    expect(xslt).toContain('method="text"');
  });

  it("uses RFC 4180 double-quote escaping (NOT translate)", () => {
    const xslt = generateCsvXslt(makeGeneratorInput({ format: "csv" }));
    expect(xslt).toContain('name="double-quotes"');
    expect(xslt).toContain('name="escape-csv-field"');
    expect(xslt).not.toContain("translate(");
  });

  it("includes headers in quotes", () => {
    const xslt = generateCsvXslt(makeGeneratorInput({ format: "csv" }));
    expect(xslt).toContain("&quot;Date&quot;");
    expect(xslt).toContain("&quot;Title&quot;");
  });

  it("uses escape-csv-field for data values", () => {
    const xslt = generateCsvXslt(makeGeneratorInput({ format: "csv" }));
    expect(xslt).toContain('call-template name="escape-csv-field"');
  });
});

// ─── Word XSLT ─────────────────────────────────────────────────────────

describe("Word XSLT generator", () => {
  it("includes page orientation", () => {
    const xslt = generateWordXslt(makeGeneratorInput({ format: "word" }));
    expect(xslt).toContain("landscape");
  });

  it("includes page-break-inside: avoid", () => {
    const xslt = generateWordXslt(makeGeneratorInput({ format: "word" }));
    expect(xslt).toContain("page-break-inside");
  });

  it("includes report title", () => {
    const xslt = generateWordXslt(makeGeneratorInput({ format: "word", title: "My Report" }));
    expect(xslt).toContain("My Report");
  });
});

// ─── HTML XSLT ─────────────────────────────────────────────────────────

describe("HTML XSLT generator", () => {
  it("includes responsive layout", () => {
    const xslt = generateHtmlXslt(makeGeneratorInput({ format: "html" }));
    expect(xslt).toContain("max-width");
  });

  it("includes sticky headers", () => {
    const xslt = generateHtmlXslt(makeGeneratorInput({ format: "html" }));
    expect(xslt).toContain("sticky");
  });

  it("includes print stylesheet", () => {
    const xslt = generateHtmlXslt(makeGeneratorInput({ format: "html" }));
    expect(xslt).toContain("@media print");
  });

  it("includes hover effects", () => {
    const xslt = generateHtmlXslt(makeGeneratorInput({ format: "html" }));
    expect(xslt).toContain("hover");
  });
});

// ─── XPath injection prevention ─────────────────────────────────────────

describe("XPath injection prevention", () => {
  it("rejects unsafe XPath in row source", () => {
    expect(() =>
      generateExcelXslt(makeGeneratorInput({ rowSource: 'document("http://evil")' })),
    ).toThrow("Unsafe XPath");
  });

  it("rejects unsafe XPath in column xpath", () => {
    const badColumns: ColumnDefinition[] = [
      { id: "c1", xpath: 'system-property("xsl:version")', header: "Evil", format: "auto", align: "left", width: 120, fullPath: "evil" },
    ];
    expect(() =>
      generateExcelXslt(makeGeneratorInput({ columns: badColumns })),
    ).toThrow("Unsafe XPath");
  });

  it("rejects unsafe XPath in groupBy", () => {
    expect(() =>
      generateExcelXslt(makeGeneratorInput({ groupBy: 'document("x")' })),
    ).toThrow("Unsafe XPath");
  });
});

// ─── Special character handling ─────────────────────────────────────────

describe("Special character handling", () => {
  it("escapes column headers containing XML special chars", () => {
    const specialCols: ColumnDefinition[] = [
      { id: "c1", xpath: "Title", header: "AT&T <Schedule>", format: "auto", align: "left", width: 120, fullPath: "Title" },
    ];
    const xslt = generateExcelXslt(makeGeneratorInput({ columns: specialCols }));
    expect(xslt).toContain("AT&amp;T &lt;Schedule&gt;");
    expect(xslt).not.toContain("AT&T <Schedule>");
  });

  it("escapes report title containing special chars", () => {
    const xslt = generateExcelXslt(makeGeneratorInput({ title: "R&D \"Report\"" }));
    expect(xslt).toContain("R&amp;D");
  });
});

// ─── Report Definition ─────────────────────────────────────────────────

describe("generateReportDefinition", () => {
  const baseInput: ReportDefinitionInput = {
    metadata: {
      name: "Schedule Export", description: "Daily schedule overview",
      version: "1.0", author: "Test", category: "Schedule",
      tags: ["schedule", "daily"], scheduleEnabled: false,
      scheduleCron: "", scheduleDescription: "", outputPath: "",
      emailRecipients: "", overwrite: true, xsltProcessor: "system-default",
      stylePreset: "corporate",
    },
    columns: testColumns,
    style: testStyle,
    format: "xlsx",
    rowSource: "//Slot",
    groupBy: null,
    sortBy: null,
    filterFieldCount: 12,
    totalFieldCount: 84,
    reductionPct: 86,
  };

  it("generates well-formed XML", () => {
    const xml = generateReportDefinition(baseInput);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<ReportDefinition");
    expect(xml).toContain("</ReportDefinition>");
  });

  it("includes all 7 sections", () => {
    const xml = generateReportDefinition(baseInput);
    expect(xml).toContain("<Identity>");
    expect(xml).toContain("<DataSource>");
    expect(xml).toContain("<Output>");
    expect(xml).toContain("<Columns");
    expect(xml).toContain("<Style");
    expect(xml).toContain("<Execution>");
    expect(xml).toContain("<PackageContents>");
  });

  it("uses slug-based filenames", () => {
    const xml = generateReportDefinition(baseInput);
    expect(xml).toContain("schedule-export-filter.xml");
    expect(xml).toContain("schedule-export-transform.xslt");
    expect(xml).toContain("schedule-export-report.xml");
  });

  it("includes column definitions", () => {
    const xml = generateReportDefinition(baseInput);
    expect(xml).toContain('<Column index="1">');
    expect(xml).toContain("<Header>Date</Header>");
    expect(xml).toContain("<XPath>SlotDate</XPath>");
    expect(xml).toContain('count="3"');
  });

  it("includes field count statistics", () => {
    const xml = generateReportDefinition(baseInput);
    expect(xml).toContain('selected="12"');
    expect(xml).toContain('total="84"');
    expect(xml).toContain('reduction="86%"');
  });

  it("escapes metadata with special characters", () => {
    const input: ReportDefinitionInput = {
      ...baseInput,
      metadata: {
        ...baseInput.metadata,
        name: "R&D Report <v2>",
        description: 'She said "hello"',
      },
    };
    const xml = generateReportDefinition(input);
    expect(xml).toContain("R&amp;D Report &lt;v2&gt;");
    expect(xml).toContain("She said &quot;hello&quot;");
  });

  it("includes scheduling when enabled", () => {
    const input: ReportDefinitionInput = {
      ...baseInput,
      metadata: {
        ...baseInput.metadata,
        scheduleEnabled: true,
        scheduleCron: "0 6 * * 1-5",
        scheduleDescription: "Weekdays at 06:00",
      },
    };
    const xml = generateReportDefinition(input);
    expect(xml).toContain("<Enabled>true</Enabled>");
    expect(xml).toContain("0 6 * * 1-5");
    expect(xml).toContain("Weekdays at 06:00");
  });

  it("includes format-specific style options for xlsx", () => {
    const xml = generateReportDefinition(baseInput);
    expect(xml).toContain("<AutoFilter>true</AutoFilter>");
  });

  it("includes format-specific style options for word", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "word" });
    expect(xml).toContain("<Orientation>");
    expect(xml).toContain("<Margins>");
  });

  it("includes format-specific style options for csv", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "csv" });
    expect(xml).toContain("<Delimiter>");
    expect(xml).toContain("<QuoteCharacter>");
  });

  it("rejects unsafe XPath in row source", () => {
    expect(() =>
      generateReportDefinition({ ...baseInput, rowSource: 'document("evil")' }),
    ).toThrow("Unsafe XPath");
  });

  it("includes report namespace", () => {
    const xml = generateReportDefinition(baseInput);
    expect(xml).toContain("urn:mediagenix:whatson:report-definition:v1");
  });

  // ─── Post-processing (native formats) ──────────────────────────────

  it("includes PostProcessing section for xlsx-native", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "xlsx-native" });
    expect(xml).toContain('<PostProcessing required="true">');
    expect(xml).toContain("<Stage>xslt-fragment</Stage>");
    expect(xml).toContain("schedule-export-scaffold.zip");
    expect(xml).toContain("xl/worksheets/sheet1.xml");
    expect(xml).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });

  it("includes PostProcessing section for docx-native", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "docx-native" });
    expect(xml).toContain('<PostProcessing required="true">');
    expect(xml).toContain("word/document.xml");
    expect(xml).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });

  it("includes PostProcessing section for pptx-native", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "pptx-native" });
    expect(xml).toContain("ppt/slides/slide1.xml");
    expect(xml).toContain("application/vnd.openxmlformats-officedocument.presentationml.presentation");
  });

  it("includes PostProcessing section for ods-native", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "ods-native" });
    expect(xml).toContain("content.xml");
    expect(xml).toContain("application/vnd.oasis.opendocument.spreadsheet");
  });

  it("includes PostProcessing section for odt-native", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "odt-native" });
    expect(xml).toContain("content.xml");
    expect(xml).toContain("application/vnd.oasis.opendocument.text");
  });

  it("does not include PostProcessing for HTML-based formats", () => {
    const xml = generateReportDefinition(baseInput);
    expect(xml).not.toContain("<PostProcessing");
  });

  it("includes template-scaffold in PackageContents for native formats", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "xlsx-native" });
    expect(xml).toContain('type="template-scaffold"');
    expect(xml).toContain("schedule-export-scaffold.zip");
  });

  it("does not include template-scaffold for HTML-based formats", () => {
    const xml = generateReportDefinition(baseInput);
    expect(xml).not.toContain("template-scaffold");
  });

  it("includes DocumentTemplateId when provided", () => {
    const xml = generateReportDefinition({
      ...baseInput,
      format: "xlsx-native",
      documentTemplateId: "tmpl-abc-123",
    });
    expect(xml).toContain("<DocumentTemplateId>tmpl-abc-123</DocumentTemplateId>");
  });

  it("uses default scaffold comment when no template id", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "xlsx-native" });
    expect(xml).toContain("<!-- Using default scaffold -->");
  });

  it("includes NativeFormat style for xlsx-native", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "xlsx-native" });
    expect(xml).toContain("<NativeFormat>SpreadsheetML</NativeFormat>");
  });

  it("includes NativeFormat style for docx-native", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "docx-native" });
    expect(xml).toContain("<NativeFormat>WordprocessingML</NativeFormat>");
    expect(xml).toContain("<Orientation>");
  });

  it("includes NativeFormat style for pptx-native", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "pptx-native" });
    expect(xml).toContain("<NativeFormat>PresentationML</NativeFormat>");
  });

  it("includes NativeFormat style for ods-native", () => {
    const xml = generateReportDefinition({ ...baseInput, format: "ods-native" });
    expect(xml).toContain("<NativeFormat>OpenDocument</NativeFormat>");
  });

  it("allows overriding requiresPostProcessing to false", () => {
    const xml = generateReportDefinition({
      ...baseInput,
      format: "xlsx-native",
      requiresPostProcessing: false,
    });
    expect(xml).not.toContain("<PostProcessing");
    expect(xml).not.toContain("template-scaffold");
  });
});
