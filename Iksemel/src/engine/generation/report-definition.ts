/**
 * Report definition XML generator.
 *
 * Generates a complete WHATS'ON Report Definition XML document containing
 * all sections required for report packaging and deployment:
 * - Identity: report metadata (name, author, category, tags, etc.)
 * - DataSource: filter reference, row source, grouping, sorting
 * - Output: format, file extension, transform reference
 * - Columns: ordered column definitions with XPath and formatting
 * - Style: visual configuration for the output
 * - Execution: scheduling and distribution settings
 * - PackageContents: manifest of files in the report package
 *
 * All user-provided values are escaped through escXml.
 * XPath expressions are validated through validateXPath.
 */

import type {
  ColumnDefinition,
  ExportFormat,
  ReportMetadata,
  SortConfig,
  StyleConfig,
} from "@/types";
import { escXml } from "@/utils/xml";
import { validateAndReturn } from "./xslt-shared";

/**
 * Input for report definition generation.
 */
export interface ReportDefinitionInput {
  /** Report metadata */
  readonly metadata: ReportMetadata;
  /** Column definitions */
  readonly columns: readonly ColumnDefinition[];
  /** Style configuration */
  readonly style: StyleConfig;
  /** Export format */
  readonly format: ExportFormat;
  /** XPath for row source */
  readonly rowSource: string;
  /** Optional grouping XPath */
  readonly groupBy: string | null;
  /** Optional sort configuration */
  readonly sortBy: SortConfig | null;
  /** Number of fields in the filter */
  readonly filterFieldCount: number;
  /** Total number of fields in the schema */
  readonly totalFieldCount: number;
  /** Payload reduction percentage */
  readonly reductionPct: number;
  /** Whether native format requires post-processing (Stage 2 ZIP assembly) */
  readonly requiresPostProcessing?: boolean;
  /** Document template ID for native formats (null = use default scaffold) */
  readonly documentTemplateId?: string | null;
}

/**
 * File extension mapping for export formats.
 */
const FORMAT_EXTENSIONS: Readonly<Record<ExportFormat, string>> = {
  xlsx: ".xlsx",
  csv: ".csv",
  word: ".doc",
  html: ".html",
  "xlsx-native": ".xlsx",
  "docx-native": ".docx",
  "pptx-native": ".pptx",
  "ods-native": ".ods",
  "odt-native": ".odt",
};

/**
 * MIME types for native document formats.
 */
const NATIVE_MIME_TYPES: Readonly<Partial<Record<ExportFormat, string>>> = {
  "xlsx-native": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "docx-native": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "pptx-native": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "ods-native": "application/vnd.oasis.opendocument.spreadsheet",
  "odt-native": "application/vnd.oasis.opendocument.text",
};

/**
 * Injection target paths for native document formats.
 */
const NATIVE_INJECTION_TARGETS: Readonly<Partial<Record<ExportFormat, string>>> = {
  "xlsx-native": "xl/worksheets/sheet1.xml",
  "docx-native": "word/document.xml",
  "pptx-native": "ppt/slides/slide1.xml",
  "ods-native": "content.xml",
  "odt-native": "content.xml",
};

/**
 * Returns true for formats that require the two-stage post-processing pipeline.
 */
function isNativeFormat(format: ExportFormat): boolean {
  return format.endsWith("-native");
}

/**
 * Generates a WHATS'ON Report Definition XML document.
 *
 * @param input - Report definition generation input
 * @returns Complete XML document string
 *
 * @example
 * ```ts
 * const xml = generateReportDefinition({
 *   metadata: { name: "Daily Schedule", ... },
 *   columns: [...],
 *   style: { ... },
 *   format: "xlsx",
 *   rowSource: "//Slot",
 *   groupBy: "SlotDate",
 *   sortBy: { field: "StartTime", dir: "asc" },
 *   filterFieldCount: 12,
 *   totalFieldCount: 84,
 *   reductionPct: 86,
 * });
 * ```
 */
export function generateReportDefinition(input: ReportDefinitionInput): string {
  const {
    metadata,
    columns,
    style,
    format,
    rowSource,
    groupBy,
    sortBy,
    filterFieldCount,
    totalFieldCount,
    reductionPct,
  } = input;

  const now = new Date().toISOString();
  const slug = buildSlug(metadata.name);
  const ext = FORMAT_EXTENSIONS[format];
  const safeRowSource = validateAndReturn(rowSource || "//Slot");

  const needsPostProcessing = input.requiresPostProcessing ?? isNativeFormat(format);

  const identitySection = buildIdentitySection(metadata, slug, now);
  const dataSourceSection = buildDataSourceSection(
    slug,
    filterFieldCount,
    totalFieldCount,
    reductionPct,
    safeRowSource,
    groupBy,
    sortBy,
  );
  const outputSection = buildOutputSection(format, ext, slug);
  const columnsSection = buildColumnsSection(columns);
  const styleSection = buildStyleSection(style, format, metadata.stylePreset);
  const executionSection = buildExecutionSection(metadata);
  const postProcessingSection = needsPostProcessing
    ? "\n" + buildPostProcessingSection(format, slug, input.documentTemplateId ?? null) + "\n"
    : "";
  const packageSection = buildPackageSection(slug, needsPostProcessing);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  WHATS'ON Report Definition
  Generated by Iksemel
  Created: ${now}
-->
<ReportDefinition xmlns="urn:mediagenix:whatson:report-definition:v1"
                  version="1.0"
                  created="${now}">

${identitySection}

${dataSourceSection}

${outputSection}

${columnsSection}

${styleSection}

${executionSection}
${postProcessingSection}
${packageSection}

</ReportDefinition>
`;
}

/**
 * Creates a URL-safe slug from a report name.
 */
function buildSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Builds the Identity section.
 */
function buildIdentitySection(
  metadata: ReportMetadata,
  slug: string,
  timestamp: string,
): string {
  const reportId = `${slug}-${Date.now().toString(36)}`;
  const tags = metadata.tags
    .map((tag) => `\n      <Tag>${escXml(tag)}</Tag>`)
    .join("");

  return `  <!-- Identity -->
  <Identity>
    <ReportId>${escXml(reportId)}</ReportId>
    <Name>${escXml(metadata.name)}</Name>
    <Description>${escXml(metadata.description)}</Description>
    <Version>${escXml(metadata.version)}</Version>
    <Author>${escXml(metadata.author)}</Author>
    <Category>${escXml(metadata.category)}</Category>
    <Tags>${tags}
    </Tags>
    <Created>${timestamp}</Created>
    <LastModified>${timestamp}</LastModified>
  </Identity>`;
}

/**
 * Builds the DataSource section.
 */
function buildDataSourceSection(
  slug: string,
  filterFieldCount: number,
  totalFieldCount: number,
  reductionPct: number,
  rowSource: string,
  groupBy: string | null,
  sortBy: SortConfig | null,
): string {
  const groupLine = groupBy
    ? `<GroupBy xpath="${escXml(validateAndReturn(groupBy))}" />`
    : "<!-- No grouping configured -->";

  const sortLine =
    sortBy?.field
      ? `<SortBy xpath="${escXml(validateAndReturn(sortBy.field))}" direction="${escXml(sortBy.dir)}" />`
      : "<!-- No sorting configured -->";

  return `  <!-- Data Source Configuration -->
  <DataSource>
    <FilterFile>${escXml(slug)}-filter.xml</FilterFile>
    <FieldCount selected="${String(filterFieldCount)}" total="${String(totalFieldCount)}" reduction="${String(reductionPct)}%" />
    <RowSourceXPath>${escXml(rowSource)}</RowSourceXPath>
    ${groupLine}
    ${sortLine}
  </DataSource>`;
}

/**
 * Builds the Output section.
 */
function buildOutputSection(
  format: ExportFormat,
  ext: string,
  slug: string,
): string {
  return `  <!-- Output Configuration -->
  <Output>
    <Format>${escXml(format)}</Format>
    <FileExtension>${escXml(ext)}</FileExtension>
    <TransformFile>${escXml(slug)}-transform.xslt</TransformFile>
    <Encoding>UTF-8</Encoding>
    <DefaultFileName>${escXml(slug)}-{date}${escXml(ext)}</DefaultFileName>
  </Output>`;
}

/**
 * Builds the Columns section.
 */
function buildColumnsSection(columns: readonly ColumnDefinition[]): string {
  const colEntries = columns
    .map((col, index) => {
      const safeXpath = escXml(validateAndReturn(col.xpath));
      return `    <Column index="${String(index + 1)}">
      <Header>${escXml(col.header)}</Header>
      <XPath>${safeXpath}</XPath>
      <Format>${escXml(col.format)}</Format>
      <Alignment>${escXml(col.align)}</Alignment>
      <Width>${String(col.width)}</Width>
    </Column>`;
    })
    .join("\n");

  return `  <!-- Column Definitions -->
  <Columns count="${String(columns.length)}">
${colEntries}
  </Columns>`;
}

/**
 * Builds the Style section with format-specific options.
 */
function buildStyleSection(
  style: StyleConfig,
  format: ExportFormat,
  preset: string,
): string {
  const formatSpecific = buildFormatSpecificStyleLines(style, format);

  const formatLines = formatSpecific.length > 0
    ? "\n" + formatSpecific.join("\n")
    : "";

  return `  <!-- Style Configuration -->
  <Style preset="${escXml(preset || "custom")}">
    <HeaderBackground>${escXml(style.headerBg)}</HeaderBackground>
    <HeaderForeground>${escXml(style.headerFg)}</HeaderForeground>
    <AlternateRowBackground>${escXml(style.altRowBg)}</AlternateRowBackground>
    <FontFamily>${escXml(style.fontFamily)}</FontFamily>
    <FontSize>${escXml(style.fontSize)}</FontSize>
    <ShowTitle>${style.showTitle ? "true" : "false"}</ShowTitle>
    <ShowFooter>${style.showFooter ? "true" : "false"}</ShowFooter>${formatLines}
  </Style>`;
}

function buildFormatSpecificStyleLines(
  style: StyleConfig,
  format: ExportFormat,
): string[] {
  switch (format) {
    case "xlsx":
      return [
        `    <AutoFilter>${style.autoFilter ? "true" : "false"}</AutoFilter>`,
      ];
    case "word":
      return [
        `    <Orientation>${escXml(style.orientation)}</Orientation>`,
        `    <Margins>${escXml(style.margins)}</Margins>`,
      ];
    case "csv":
      return [
        `    <Delimiter>${escXml(style.delimiter)}</Delimiter>`,
        `    <QuoteCharacter>${escXml(style.quoteChar)}</QuoteCharacter>`,
      ];
    case "xlsx-native":
      return [`    <NativeFormat>SpreadsheetML</NativeFormat>`];
    case "docx-native":
      return [
        `    <NativeFormat>WordprocessingML</NativeFormat>`,
        `    <Orientation>${escXml(style.orientation)}</Orientation>`,
      ];
    case "pptx-native":
      return [`    <NativeFormat>PresentationML</NativeFormat>`];
    case "ods-native":
    case "odt-native":
      return [`    <NativeFormat>OpenDocument</NativeFormat>`];
    default:
      return [];
  }
}

/**
 * Builds the Execution section.
 */
function buildExecutionSection(metadata: ReportMetadata): string {
  const cronLine = metadata.scheduleCron
    ? `<Cron>${escXml(metadata.scheduleCron)}</Cron>`
    : "<!-- No schedule configured -->";

  const descLine = metadata.scheduleDescription
    ? `\n      <Description>${escXml(metadata.scheduleDescription)}</Description>`
    : "";

  const outputLine = metadata.outputPath
    ? `<OutputPath>${escXml(metadata.outputPath)}</OutputPath>`
    : "<!-- Default output path -->";

  const emailLine = metadata.emailRecipients
    ? `\n      <EmailRecipients>${escXml(metadata.emailRecipients)}</EmailRecipients>`
    : "";

  return `  <!-- Execution Settings -->
  <Execution>
    <Schedule>
      <Enabled>${metadata.scheduleEnabled ? "true" : "false"}</Enabled>
      ${cronLine}${descLine}
    </Schedule>
    <Distribution>
      ${outputLine}${emailLine}
      <OverwriteExisting>${metadata.overwrite ? "true" : "false"}</OverwriteExisting>
    </Distribution>
    <XSLTProcessor>${escXml(metadata.xsltProcessor || "system-default")}</XSLTProcessor>
  </Execution>`;
}

/**
 * Builds the PostProcessing section for native formats.
 */
function buildPostProcessingSection(
  format: ExportFormat,
  slug: string,
  documentTemplateId: string | null,
): string {
  const mimeType = NATIVE_MIME_TYPES[format] ?? "application/octet-stream";
  const injectionTarget = NATIVE_INJECTION_TARGETS[format] ?? "";
  const templateLine = documentTemplateId
    ? `<DocumentTemplateId>${escXml(documentTemplateId)}</DocumentTemplateId>`
    : "<!-- Using default scaffold -->";

  return `  <!-- Post-Processing (Two-Stage Pipeline) -->
  <PostProcessing required="true">
    <Stage>xslt-fragment</Stage>
    <TemplateScaffold>${escXml(slug)}-scaffold.zip</TemplateScaffold>
    <InjectionTarget>${escXml(injectionTarget)}</InjectionTarget>
    <OutputMimeType>${escXml(mimeType)}</OutputMimeType>
    ${templateLine}
  </PostProcessing>`;
}

/**
 * Builds the PackageContents section.
 */
function buildPackageSection(slug: string, includeScaffold = false): string {
  const scaffoldLine = includeScaffold
    ? `\n    <File type="template-scaffold">${escXml(slug)}-scaffold.zip</File>`
    : "";

  return `  <!-- Package Files -->
  <PackageContents>
    <File type="report-definition">${escXml(slug)}-report.xml</File>
    <File type="filter">${escXml(slug)}-filter.xml</File>
    <File type="transform">${escXml(slug)}-transform.xslt</File>${scaffoldLine}
  </PackageContents>`;
}

