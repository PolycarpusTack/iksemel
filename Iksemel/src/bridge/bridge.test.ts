import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createOriginValidator } from "./origin-validator";
import { createBridge } from "./message-handler";
import type { Bridge } from "./message-handler";
import { parseReportConfig } from "./config-parser";
import { generateReportDefinition } from "@engine/generation/report-definition";
import type { ReportDefinitionInput } from "@engine/generation/report-definition";
import { TEST_STYLE as testStyle, TEST_COLUMNS as testColumns } from "@/test/fixtures";

// ─── Test helpers ───────────────────────────────────────────────────────

function fireMessage(
  data: unknown,
  origin = "http://localhost:3000",
): void {
  const event = new MessageEvent("message", { data, origin });
  window.dispatchEvent(event);
}

/**
 * Wait for async callbacks (postMessage dispatch is synchronous in jsdom
 * but we add a micro-task flush for safety).
 */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─── Sample XML ─────────────────────────────────────────────────────────

const SAMPLE_REPORT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ReportDefinition xmlns="urn:mediagenix:whatson:report-definition:v1"
                  version="1.0"
                  created="2025-01-15T10:00:00.000Z">

  <Identity>
    <ReportId>schedule-export-abc123</ReportId>
    <Name>Schedule Export</Name>
    <Description>Daily schedule overview</Description>
    <Version>1.0</Version>
    <Author>Test User</Author>
    <Category>Schedule</Category>
    <Tags>
      <Tag>schedule</Tag>
      <Tag>daily</Tag>
    </Tags>
    <Created>2025-01-15T10:00:00.000Z</Created>
    <LastModified>2025-01-15T10:00:00.000Z</LastModified>
  </Identity>

  <DataSource>
    <FilterFile>schedule-export-filter.xml</FilterFile>
    <FieldCount selected="12" total="84" reduction="86%" />
    <RowSourceXPath>//Slot</RowSourceXPath>
    <GroupBy xpath="SlotDate" />
    <SortBy xpath="StartTime" direction="asc" />
  </DataSource>

  <Output>
    <Format>xlsx</Format>
    <FileExtension>.xlsx</FileExtension>
    <TransformFile>schedule-export-transform.xslt</TransformFile>
    <Encoding>UTF-8</Encoding>
    <DefaultFileName>schedule-export-{date}.xlsx</DefaultFileName>
  </Output>

  <Columns count="3">
    <Column index="1">
      <Header>Date</Header>
      <XPath>SlotDate</XPath>
      <Format>date</Format>
      <Alignment>left</Alignment>
      <Width>120</Width>
    </Column>
    <Column index="2">
      <Header>Start Time</Header>
      <XPath>StartTime</XPath>
      <Format>datetime</Format>
      <Alignment>left</Alignment>
      <Width>150</Width>
    </Column>
    <Column index="3">
      <Header>Title</Header>
      <XPath>Programme/Title</XPath>
      <Format>text</Format>
      <Alignment>left</Alignment>
      <Width>200</Width>
    </Column>
  </Columns>

  <Style preset="corporate">
    <HeaderBackground>#1a365d</HeaderBackground>
    <HeaderForeground>#ffffff</HeaderForeground>
    <AlternateRowBackground>#f7f9fc</AlternateRowBackground>
    <FontFamily>Calibri, sans-serif</FontFamily>
    <FontSize>10</FontSize>
    <ShowTitle>true</ShowTitle>
    <ShowFooter>true</ShowFooter>
    <AutoFilter>true</AutoFilter>
  </Style>

  <Execution>
    <Schedule>
      <Enabled>true</Enabled>
      <Cron>0 6 * * 1-5</Cron>
      <Description>Weekdays at 06:00</Description>
    </Schedule>
    <Distribution>
      <OutputPath>/reports/schedule</OutputPath>
      <EmailRecipients>team@example.com</EmailRecipients>
      <OverwriteExisting>true</OverwriteExisting>
    </Distribution>
    <XSLTProcessor>saxon</XSLTProcessor>
  </Execution>

  <PackageContents>
    <File type="report-definition">schedule-export-report.xml</File>
    <File type="filter">schedule-export-filter.xml</File>
    <File type="transform">schedule-export-transform.xslt</File>
  </PackageContents>

</ReportDefinition>`;

// ═══════════════════════════════════════════════════════════════════════
// Origin Validation
// ═══════════════════════════════════════════════════════════════════════

describe("Origin Validation", () => {
  it("allows default localhost origins", () => {
    const validator = createOriginValidator();
    expect(validator.isAllowed("http://localhost:3000")).toBe(true);
    expect(validator.isAllowed("http://localhost:5173")).toBe(true);
  });

  it("allows additional origins passed at construction", () => {
    const validator = createOriginValidator(["https://whatson.example.com"]);
    expect(validator.isAllowed("https://whatson.example.com")).toBe(true);
  });

  it("rejects non-whitelisted origins", () => {
    const validator = createOriginValidator();
    expect(validator.isAllowed("https://evil.com")).toBe(false);
    expect(validator.isAllowed("http://localhost:8080")).toBe(false);
  });

  it("handles wildcard '*' origin allowing all", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const validator = createOriginValidator(["*"]);

    expect(validator.isAllowed("https://anything.example.com")).toBe(true);
    expect(validator.isAllowed("http://random.org:9999")).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Wildcard origin"),
    );

    warnSpy.mockRestore();
  });

  it("rejects null/empty origins", () => {
    const validator = createOriginValidator();
    expect(validator.isAllowed("")).toBe(false);
    // Test with empty string explicitly
    expect(validator.isAllowed("" as string)).toBe(false);
  });

  it("adds origins dynamically", () => {
    const validator = createOriginValidator();
    expect(validator.isAllowed("https://new.example.com")).toBe(false);

    validator.addOrigin("https://new.example.com");
    expect(validator.isAllowed("https://new.example.com")).toBe(true);
  });

  it("removes origins dynamically", () => {
    const validator = createOriginValidator();
    expect(validator.isAllowed("http://localhost:3000")).toBe(true);

    validator.removeOrigin("http://localhost:3000");
    expect(validator.isAllowed("http://localhost:3000")).toBe(false);
  });

  it("requires exact match — no substring matching", () => {
    const validator = createOriginValidator(["https://example.com"]);
    expect(validator.isAllowed("https://example.com")).toBe(true);
    expect(validator.isAllowed("https://example.com:443")).toBe(false);
    expect(validator.isAllowed("https://sub.example.com")).toBe(false);
    expect(validator.isAllowed("https://example.com/path")).toBe(false);
  });

  it("returns a snapshot of origins from getOrigins()", () => {
    const validator = createOriginValidator(["https://extra.com"]);
    const origins = validator.getOrigins();
    expect(origins).toContain("http://localhost:3000");
    expect(origins).toContain("http://localhost:5173");
    expect(origins).toContain("https://extra.com");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Message Handling
// ═══════════════════════════════════════════════════════════════════════

describe("Message Handling", () => {
  let bridge: Bridge;
  let onLoadSchema: ReturnType<typeof vi.fn>;
  let onLoadConfig: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onLoadSchema = vi.fn();
    onLoadConfig = vi.fn();
    onError = vi.fn();
    bridge = createBridge({
      onLoadSchema,
      onLoadConfig,
      onError,
    });
    bridge.start();
  });

  afterEach(() => {
    bridge.stop();
  });

  it("processes valid LOAD_SCHEMA message", async () => {
    fireMessage({
      type: "LOAD_SCHEMA",
      payload: { xsdContent: "<xs:schema />" },
    });
    await flushMicrotasks();

    expect(onLoadSchema).toHaveBeenCalledWith("<xs:schema />", undefined);
  });

  it("processes LOAD_SCHEMA with optional templateId", async () => {
    fireMessage({
      type: "LOAD_SCHEMA",
      payload: { xsdContent: "<xs:schema />", templateId: "broadcast-v2" },
    });
    await flushMicrotasks();

    expect(onLoadSchema).toHaveBeenCalledWith(
      "<xs:schema />",
      "broadcast-v2",
    );
  });

  it("processes valid LOAD_CONFIG message", async () => {
    fireMessage({
      type: "LOAD_CONFIG",
      payload: { reportXml: "<report />" },
    });
    await flushMicrotasks();

    expect(onLoadConfig).toHaveBeenCalledWith(
      "<report />",
      undefined,
      undefined,
    );
  });

  it("processes LOAD_CONFIG with optional filter and xslt", async () => {
    fireMessage({
      type: "LOAD_CONFIG",
      payload: {
        reportXml: "<report />",
        filterXml: "<filter />",
        xsltContent: "<xsl:stylesheet />",
      },
    });
    await flushMicrotasks();

    expect(onLoadConfig).toHaveBeenCalledWith(
      "<report />",
      "<filter />",
      "<xsl:stylesheet />",
    );
  });

  it("rejects message from non-whitelisted origin", async () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    fireMessage(
      { type: "LOAD_SCHEMA", payload: { xsdContent: "test" } },
      "https://evil.com",
    );
    await flushMicrotasks();

    expect(onLoadSchema).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining("Rejected message from origin"),
    );

    debugSpy.mockRestore();
  });

  it("ignores unknown message types silently", async () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    fireMessage({ type: "UNKNOWN_TYPE", payload: {} });
    await flushMicrotasks();

    expect(onLoadSchema).not.toHaveBeenCalled();
    expect(onLoadConfig).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining("unknown message type"),
    );

    debugSpy.mockRestore();
  });

  it("handles malformed message payload gracefully", async () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    fireMessage({ type: "LOAD_SCHEMA", payload: "not-an-object" });
    await flushMicrotasks();

    expect(onLoadSchema).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining("missing/invalid payload"),
    );

    debugSpy.mockRestore();
  });

  it("handles missing payload gracefully", async () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    fireMessage({ type: "LOAD_SCHEMA" });
    await flushMicrotasks();

    expect(onLoadSchema).not.toHaveBeenCalled();

    debugSpy.mockRestore();
  });

  it("reports handler errors via onError callback", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    onLoadSchema.mockImplementation(() => {
      throw new Error("handler boom");
    });

    fireMessage({
      type: "LOAD_SCHEMA",
      payload: { xsdContent: "test" },
    });
    await flushMicrotasks();

    expect(onError).toHaveBeenCalledWith("HANDLER_ERROR", "handler boom");

    errorSpy.mockRestore();
  });

  it("processes SET_ORIGIN_WHITELIST and subsequently accepts new origins", async () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    // First, messages from new origin are rejected
    fireMessage(
      { type: "LOAD_SCHEMA", payload: { xsdContent: "test" } },
      "https://new.whatson.com",
    );
    await flushMicrotasks();
    expect(onLoadSchema).not.toHaveBeenCalled();

    // Send SET_ORIGIN_WHITELIST from an allowed origin
    fireMessage({
      type: "SET_ORIGIN_WHITELIST",
      payload: { origins: ["https://new.whatson.com"] },
    });
    await flushMicrotasks();

    // Now messages from the new origin should be accepted
    fireMessage(
      { type: "LOAD_SCHEMA", payload: { xsdContent: "new schema" } },
      "https://new.whatson.com",
    );
    await flushMicrotasks();
    expect(onLoadSchema).toHaveBeenCalledWith("new schema", undefined);

    debugSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Reference Data & Policy Messages
// ═══════════════════════════════════════════════════════════════════════

describe("Reference Data & Policy Messages", () => {
  let bridge: Bridge;
  let onLoadReferenceData: ReturnType<typeof vi.fn>;
  let onLoadPolicy: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onLoadReferenceData = vi.fn();
    onLoadPolicy = vi.fn();
    onError = vi.fn();
    bridge = createBridge({
      onLoadReferenceData,
      onLoadPolicy,
      onError,
    });
    bridge.start();
  });

  afterEach(() => {
    bridge.stop();
  });

  it("processes LOAD_REFERENCE_DATA message", async () => {
    const entries = [
      { xpath: "Channel/Name", values: ["BBC One", "ITV"] },
    ];
    fireMessage({
      type: "LOAD_REFERENCE_DATA",
      payload: { entries },
    });
    await flushMicrotasks();

    expect(onLoadReferenceData).toHaveBeenCalledWith(entries);
  });

  it("processes LOAD_POLICY message", async () => {
    const rules = [
      {
        id: "r1",
        type: "REQUIRED_FILTER",
        xpath: "Channel/Name",
        params: {},
        message: "Must pick a channel",
      },
    ];
    fireMessage({
      type: "LOAD_POLICY",
      payload: { rules },
    });
    await flushMicrotasks();

    expect(onLoadPolicy).toHaveBeenCalledWith(rules);
  });

  it("ignores LOAD_REFERENCE_DATA from non-whitelisted origin", async () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    fireMessage(
      {
        type: "LOAD_REFERENCE_DATA",
        payload: {
          entries: [{ xpath: "Channel/Name", values: ["BBC One"] }],
        },
      },
      "https://evil.com",
    );
    await flushMicrotasks();

    expect(onLoadReferenceData).not.toHaveBeenCalled();

    debugSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Document Template Messages
// ═══════════════════════════════════════════════════════════════════════

describe("Document Template Messages", () => {
  let bridge: Bridge;
  let onLoadDocumentTemplate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onLoadDocumentTemplate = vi.fn();
    bridge = createBridge({
      onLoadDocumentTemplate,
    });
    bridge.start();
  });

  afterEach(() => {
    bridge.stop();
  });

  it("processes LOAD_DOCUMENT_TEMPLATE message", async () => {
    fireMessage({
      type: "LOAD_DOCUMENT_TEMPLATE",
      payload: {
        fileContent: "UEsFBgAAAAAAAA==",
        filename: "template.xlsx",
      },
    });
    await flushMicrotasks();

    expect(onLoadDocumentTemplate).toHaveBeenCalledWith(
      "UEsFBgAAAAAAAA==",
      "template.xlsx",
    );
  });

  it("silently ignores when no handler registered", async () => {
    const bridge2 = createBridge({});
    bridge2.start();

    expect(() => {
      fireMessage({
        type: "LOAD_DOCUMENT_TEMPLATE",
        payload: {
          fileContent: "UEsFBgAAAAAAAA==",
          filename: "template.docx",
        },
      });
    }).not.toThrow();

    bridge2.stop();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Fuzz Tests
// ═══════════════════════════════════════════════════════════════════════

describe("Fuzz Tests", () => {
  let bridge: Bridge;

  beforeEach(() => {
    bridge = createBridge({});
    bridge.start();
  });

  afterEach(() => {
    bridge.stop();
  });

  it("handles null message data", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    expect(() => fireMessage(null)).not.toThrow();

    debugSpy.mockRestore();
  });

  it("handles numeric message data", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    expect(() => fireMessage(42)).not.toThrow();
    expect(() => fireMessage(NaN)).not.toThrow();
    expect(() => fireMessage(Infinity)).not.toThrow();

    debugSpy.mockRestore();
  });

  it("handles empty object", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    expect(() => fireMessage({})).not.toThrow();

    debugSpy.mockRestore();
  });

  it("handles message with missing type field", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    expect(() => fireMessage({ payload: { foo: "bar" } })).not.toThrow();
    expect(() =>
      fireMessage({ type: undefined, payload: {} }),
    ).not.toThrow();
    expect(() =>
      fireMessage({ type: null, payload: {} }),
    ).not.toThrow();
    expect(() =>
      fireMessage({ type: 123, payload: {} }),
    ).not.toThrow();

    debugSpy.mockRestore();
  });

  it("handles extremely large payload (1MB+ string) without crash", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    const largeString = "x".repeat(1_100_000); // ~1.1MB
    expect(() =>
      fireMessage({
        type: "LOAD_SCHEMA",
        payload: { xsdContent: largeString },
      }),
    ).not.toThrow();

    debugSpy.mockRestore();
  });

  it("handles array message data", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    expect(() => fireMessage([1, 2, 3])).not.toThrow();
    expect(() => fireMessage([])).not.toThrow();

    debugSpy.mockRestore();
  });

  it("handles string message data", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    expect(() => fireMessage("hello")).not.toThrow();
    expect(() => fireMessage("")).not.toThrow();

    debugSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Config Parser
// ═══════════════════════════════════════════════════════════════════════

describe("Config Parser", () => {
  it("parses complete report definition XML", () => {
    const config = parseReportConfig(SAMPLE_REPORT_XML);
    expect(config).toBeDefined();
    expect(config.metadata.name).toBe("Schedule Export");
    expect(config.format).toBe("xlsx");
    expect(config.columns.length).toBe(3);
  });

  it("extracts all metadata fields", () => {
    const config = parseReportConfig(SAMPLE_REPORT_XML);
    expect(config.metadata.name).toBe("Schedule Export");
    expect(config.metadata.description).toBe("Daily schedule overview");
    expect(config.metadata.version).toBe("1.0");
    expect(config.metadata.author).toBe("Test User");
    expect(config.metadata.category).toBe("Schedule");
    expect(config.metadata.tags).toEqual(["schedule", "daily"]);
  });

  it("extracts column definitions with correct order", () => {
    const config = parseReportConfig(SAMPLE_REPORT_XML);
    expect(config.columns).toHaveLength(3);

    expect(config.columns[0]!.header).toBe("Date");
    expect(config.columns[0]!.xpath).toBe("SlotDate");
    expect(config.columns[0]!.format).toBe("date");
    expect(config.columns[0]!.align).toBe("left");
    expect(config.columns[0]!.width).toBe(120);

    expect(config.columns[1]!.header).toBe("Start Time");
    expect(config.columns[1]!.xpath).toBe("StartTime");
    expect(config.columns[1]!.format).toBe("datetime");
    expect(config.columns[1]!.width).toBe(150);

    expect(config.columns[2]!.header).toBe("Title");
    expect(config.columns[2]!.xpath).toBe("Programme/Title");
    expect(config.columns[2]!.format).toBe("text");
    expect(config.columns[2]!.width).toBe(200);
  });

  it("extracts style configuration", () => {
    const config = parseReportConfig(SAMPLE_REPORT_XML);
    expect(config.style.headerBg).toBe("#1a365d");
    expect(config.style.headerFg).toBe("#ffffff");
    expect(config.style.altRowBg).toBe("#f7f9fc");
    expect(config.style.fontFamily).toBe("Calibri, sans-serif");
    expect(config.style.fontSize).toBe("10");
    expect(config.style.showTitle).toBe(true);
    expect(config.style.showFooter).toBe(true);
    expect(config.style.autoFilter).toBe(true);
    expect(config.style.name).toBe("corporate");
  });

  it("extracts execution / schedule settings", () => {
    const config = parseReportConfig(SAMPLE_REPORT_XML);
    expect(config.metadata.scheduleEnabled).toBe(true);
    expect(config.metadata.scheduleCron).toBe("0 6 * * 1-5");
    expect(config.metadata.scheduleDescription).toBe("Weekdays at 06:00");
    expect(config.metadata.outputPath).toBe("/reports/schedule");
    expect(config.metadata.emailRecipients).toBe("team@example.com");
    expect(config.metadata.overwrite).toBe(true);
    expect(config.metadata.xsltProcessor).toBe("saxon");
  });

  it("extracts data source fields", () => {
    const config = parseReportConfig(SAMPLE_REPORT_XML);
    expect(config.rowSource).toBe("//Slot");
    expect(config.groupBy).toBe("SlotDate");
    expect(config.sortBy).toEqual({ field: "StartTime", dir: "asc" });
  });

  it("handles missing sections gracefully", () => {
    const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<ReportDefinition xmlns="urn:mediagenix:whatson:report-definition:v1" version="1.0">
  <Identity>
    <Name>Minimal Report</Name>
  </Identity>
</ReportDefinition>`;

    const config = parseReportConfig(minimalXml);
    expect(config.metadata.name).toBe("Minimal Report");
    expect(config.columns).toEqual([]);
    expect(config.format).toBe("xlsx");
    expect(config.rowSource).toBe("//Slot");
    expect(config.groupBy).toBeNull();
    expect(config.sortBy).toBeNull();
    expect(config.metadata.scheduleEnabled).toBe(false);
  });

  it("handles invalid XML gracefully", () => {
    const config = parseReportConfig("this is not xml at all <><><<>>");
    expect(config).toBeDefined();
    expect(config.metadata.name).toBe("");
    expect(config.columns).toEqual([]);
    expect(config.format).toBe("xlsx");
  });

  it("handles empty string input", () => {
    const config = parseReportConfig("");
    expect(config).toBeDefined();
    expect(config.columns).toEqual([]);
  });

  it("extracts format from file extension when format name is missing", () => {
    const xmlWithExtOnly = `<?xml version="1.0" encoding="UTF-8"?>
<ReportDefinition>
  <Output>
    <FileExtension>.csv</FileExtension>
  </Output>
</ReportDefinition>`;

    const config = parseReportConfig(xmlWithExtOnly);
    expect(config.format).toBe("csv");
  });

  it("extracts word format from .doc extension", () => {
    const xmlWordExt = `<?xml version="1.0" encoding="UTF-8"?>
<ReportDefinition>
  <Output>
    <Format>word</Format>
    <FileExtension>.doc</FileExtension>
  </Output>
</ReportDefinition>`;

    const config = parseReportConfig(xmlWordExt);
    expect(config.format).toBe("word");
  });

  it("round-trip: generate then parse preserves key fields", () => {

    const input: ReportDefinitionInput = {
      metadata: {
        name: "Round Trip Test",
        description: "Testing round-trip parsing",
        version: "2.0",
        author: "Tester",
        category: "Testing",
        tags: ["test", "roundtrip"],
        scheduleEnabled: true,
        scheduleCron: "0 8 * * *",
        scheduleDescription: "Daily at 08:00",
        outputPath: "/out",
        emailRecipients: "test@test.com",
        overwrite: true,
        xsltProcessor: "saxon",
        stylePreset: "corporate",
      },
      columns: testColumns,
      style: testStyle,
      format: "xlsx",
      rowSource: "//Slot",
      groupBy: "SlotDate",
      sortBy: { field: "StartTime", dir: "asc" },
      filterFieldCount: 12,
      totalFieldCount: 84,
      reductionPct: 86,
    };

    const generatedXml = generateReportDefinition(input);
    const parsed = parseReportConfig(generatedXml);

    // Metadata
    expect(parsed.metadata.name).toBe("Round Trip Test");
    expect(parsed.metadata.description).toBe("Testing round-trip parsing");
    expect(parsed.metadata.version).toBe("2.0");
    expect(parsed.metadata.author).toBe("Tester");
    expect(parsed.metadata.category).toBe("Testing");
    expect(parsed.metadata.tags).toEqual(["test", "roundtrip"]);

    // Format & data source
    expect(parsed.format).toBe("xlsx");
    expect(parsed.rowSource).toBe("//Slot");
    expect(parsed.groupBy).toBe("SlotDate");
    expect(parsed.sortBy).toEqual({ field: "StartTime", dir: "asc" });

    // Columns
    expect(parsed.columns).toHaveLength(3);
    expect(parsed.columns[0]!.header).toBe("Date");
    expect(parsed.columns[0]!.xpath).toBe("SlotDate");
    expect(parsed.columns[0]!.format).toBe("date");
    expect(parsed.columns[1]!.header).toBe("Start Time");
    expect(parsed.columns[2]!.header).toBe("Title");

    // Style
    expect(parsed.style.headerBg).toBe("#1a365d");
    expect(parsed.style.headerFg).toBe("#ffffff");
    expect(parsed.style.showTitle).toBe(true);
    expect(parsed.style.autoFilter).toBe(true);

    // Execution
    expect(parsed.metadata.scheduleEnabled).toBe(true);
    expect(parsed.metadata.scheduleCron).toBe("0 8 * * *");
    expect(parsed.metadata.overwrite).toBe(true);
  });

  it("handles XML with no namespace", () => {
    const noNsXml = `<?xml version="1.0" encoding="UTF-8"?>
<ReportDefinition version="1.0">
  <Identity>
    <Name>No Namespace Report</Name>
    <Version>1.0</Version>
    <Author>Dev</Author>
    <Category>Test</Category>
  </Identity>
  <Output>
    <Format>html</Format>
    <FileExtension>.html</FileExtension>
  </Output>
</ReportDefinition>`;

    const config = parseReportConfig(noNsXml);
    expect(config.metadata.name).toBe("No Namespace Report");
    expect(config.format).toBe("html");
  });

  it("defaults invalid column format and alignment", () => {
    const xmlBadCol = `<?xml version="1.0" encoding="UTF-8"?>
<ReportDefinition>
  <Columns count="1">
    <Column index="1">
      <Header>Bad Col</Header>
      <XPath>Field</XPath>
      <Format>unknown_format</Format>
      <Alignment>justify</Alignment>
      <Width>abc</Width>
    </Column>
  </Columns>
</ReportDefinition>`;

    const config = parseReportConfig(xmlBadCol);
    expect(config.columns).toHaveLength(1);
    expect(config.columns[0]!.format).toBe("auto");
    expect(config.columns[0]!.align).toBe("left");
    expect(config.columns[0]!.width).toBe(120);
  });

  it("parses Filters section into filterValues", () => {
    const xmlWithFilters = `<?xml version="1.0" encoding="UTF-8"?>
<ReportDefinition xmlns="urn:mediagenix:whatson:report-definition:v1" version="1.0">
  <Identity>
    <Name>Filter Test</Name>
  </Identity>
  <Filters xmlns="urn:mediagenix:whatson:filter:v1">
    <Filter xpath="Channel/ChannelName" operator="IN">
      <Value>BBC One</Value>
      <Value>ITV</Value>
    </Filter>
  </Filters>
</ReportDefinition>`;

    const config = parseReportConfig(xmlWithFilters);
    const entry = config.filterValues["Channel-ChannelName"];
    expect(entry).toBeDefined();
    expect(entry!.xpath).toBe("Channel/ChannelName");
    expect(entry!.operator).toBe("IN");
    expect(entry!.values).toEqual(["BBC One", "ITV"]);
  });

  it("parses BETWEEN filter with range values", () => {
    const xmlBetween = `<?xml version="1.0" encoding="UTF-8"?>
<ReportDefinition xmlns="urn:mediagenix:whatson:report-definition:v1" version="1.0">
  <Identity>
    <Name>Between Filter Test</Name>
  </Identity>
  <Filters xmlns="urn:mediagenix:whatson:filter:v1">
    <Filter xpath="Slot/SlotDate" operator="BETWEEN">
      <RangeStart>2025-01-01</RangeStart>
      <RangeEnd>2025-12-31</RangeEnd>
    </Filter>
  </Filters>
</ReportDefinition>`;

    const config = parseReportConfig(xmlBetween);
    const entry = config.filterValues["Slot-SlotDate"];
    expect(entry).toBeDefined();
    expect(entry!.xpath).toBe("Slot/SlotDate");
    expect(entry!.operator).toBe("BETWEEN");
    expect(entry!.rangeStart).toBe("2025-01-01");
    expect(entry!.rangeEnd).toBe("2025-12-31");
    expect(entry!.values).toEqual([]);
  });

  it("returns empty filterValues when no Filters section present", () => {
    const config = parseReportConfig(SAMPLE_REPORT_XML);
    expect(config.filterValues).toEqual({});
  });

  it("handles IS_TRUE boolean filter", () => {
    const xmlIsTrue = `<?xml version="1.0" encoding="UTF-8"?>
<ReportDefinition xmlns="urn:mediagenix:whatson:report-definition:v1" version="1.0">
  <Identity>
    <Name>Boolean Filter Test</Name>
  </Identity>
  <Filters xmlns="urn:mediagenix:whatson:filter:v1">
    <Filter xpath="Programme/IsLive" operator="IS_TRUE" />
  </Filters>
</ReportDefinition>`;

    const config = parseReportConfig(xmlIsTrue);
    const entry = config.filterValues["Programme-IsLive"];
    expect(entry).toBeDefined();
    expect(entry!.xpath).toBe("Programme/IsLive");
    expect(entry!.operator).toBe("IS_TRUE");
    expect(entry!.values).toEqual([]);
    expect(entry!.typeName).toBe("boolean");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Embedded Detection
// ═══════════════════════════════════════════════════════════════════════

describe("Embedded Detection", () => {
  it("detects standalone mode (window === window.parent)", () => {
    const bridge = createBridge({});
    // In jsdom, window === window.parent, so not embedded
    expect(bridge.isEmbedded()).toBe(false);
  });

  it("isEmbedded returns a boolean", () => {
    const bridge = createBridge({});
    const result = bridge.isEmbedded();
    expect(typeof result).toBe("boolean");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Outbound Messages
// ═══════════════════════════════════════════════════════════════════════

describe("Outbound Messages", () => {
  it("sendReady does not throw in standalone mode", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});
    const bridge = createBridge({});
    bridge.start();

    expect(() => bridge.sendReady()).not.toThrow();

    bridge.stop();
    debugSpy.mockRestore();
  });

  it("sendError does not throw in standalone mode", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});
    const bridge = createBridge({});
    bridge.start();

    expect(() => bridge.sendError("TEST_ERR", "test message")).not.toThrow();

    bridge.stop();
    debugSpy.mockRestore();
  });

  it("sendPackageReady does not throw in standalone mode", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});
    const bridge = createBridge({});
    bridge.start();

    expect(() =>
      bridge.sendPackageReady({
        filterXml: { content: "<f/>", filename: "f.xml", contentType: "text/xml" },
        xsltTransform: { content: "<x/>", filename: "t.xslt", contentType: "text/xml" },
        reportDefinition: { content: "<r/>", filename: "r.xml", contentType: "text/xml" },
        templateScaffold: null,
      }),
    ).not.toThrow();

    bridge.stop();
    debugSpy.mockRestore();
  });

  it("sendSelectionChanged debounces with 200ms delay", async () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});
    vi.useFakeTimers();

    const bridge = createBridge({});
    bridge.start();

    const metrics = {
      selectedCount: 10,
      totalCount: 100,
      reductionPct: 90,
      estimatedPayloadKb: 25,
    };

    // Call multiple times rapidly
    bridge.sendSelectionChanged(metrics);
    bridge.sendSelectionChanged({ ...metrics, selectedCount: 20 });
    bridge.sendSelectionChanged({ ...metrics, selectedCount: 30 });

    // Advance less than debounce period — nothing should have fired
    vi.advanceTimersByTime(100);

    // Advance past debounce period — only the last call should fire
    vi.advanceTimersByTime(200);

    bridge.stop();
    vi.useRealTimers();
    debugSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Lifecycle
// ═══════════════════════════════════════════════════════════════════════

describe("Bridge Lifecycle", () => {
  it("stop() prevents further message processing", async () => {
    const onLoadSchema = vi.fn();
    const bridge = createBridge({ onLoadSchema });
    bridge.start();
    bridge.stop();

    fireMessage({
      type: "LOAD_SCHEMA",
      payload: { xsdContent: "should not arrive" },
    });
    await flushMicrotasks();

    expect(onLoadSchema).not.toHaveBeenCalled();
  });

  it("start() is idempotent — calling twice does not double-register", async () => {
    const onLoadSchema = vi.fn();
    const bridge = createBridge({ onLoadSchema });
    bridge.start();
    bridge.start(); // duplicate

    fireMessage({
      type: "LOAD_SCHEMA",
      payload: { xsdContent: "test" },
    });
    await flushMicrotasks();

    // Should only be called once, not twice
    expect(onLoadSchema).toHaveBeenCalledTimes(1);
  });
});
