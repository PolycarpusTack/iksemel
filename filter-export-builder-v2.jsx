import { useState, useCallback, useMemo, useRef, useEffect } from "react";

// ─── Demo Broadcast Schema (XSD) ───────────────────────────────────────
const DEMO_XSD = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="BroadcastExport">
    <xs:annotation><xs:documentation>Root element for broadcast schedule data export.</xs:documentation></xs:annotation>
    <xs:complexType><xs:sequence>
      <xs:element name="ExportMetadata">
        <xs:annotation><xs:documentation>Metadata about this export run.</xs:documentation></xs:annotation>
        <xs:complexType><xs:sequence>
          <xs:element name="ExportTimestamp" type="xs:dateTime"><xs:annotation><xs:documentation>When this export was generated.</xs:documentation></xs:annotation></xs:element>
          <xs:element name="ExportVersion" type="xs:string"><xs:annotation><xs:documentation>Version of the export format.</xs:documentation></xs:annotation></xs:element>
          <xs:element name="DateRangeStart" type="xs:date"><xs:annotation><xs:documentation>Start of the exported date range.</xs:documentation></xs:annotation></xs:element>
          <xs:element name="DateRangeEnd" type="xs:date"><xs:annotation><xs:documentation>End of the exported date range.</xs:documentation></xs:annotation></xs:element>
          <xs:element name="SourceSystem" type="xs:string"><xs:annotation><xs:documentation>Source scheduling system instance.</xs:documentation></xs:annotation></xs:element>
        </xs:sequence></xs:complexType>
      </xs:element>
      <xs:element name="Channels">
        <xs:annotation><xs:documentation>Collection of broadcast channels.</xs:documentation></xs:annotation>
        <xs:complexType><xs:sequence>
          <xs:element name="Channel" maxOccurs="unbounded">
            <xs:annotation><xs:documentation>A single broadcast channel with schedule.</xs:documentation></xs:annotation>
            <xs:complexType><xs:sequence>
              <xs:element name="ChannelCode" type="xs:string"><xs:annotation><xs:documentation>Unique channel identifier (e.g. BBC1, VTM).</xs:documentation></xs:annotation></xs:element>
              <xs:element name="ChannelName" type="xs:string"><xs:annotation><xs:documentation>Display name of the channel.</xs:documentation></xs:annotation></xs:element>
              <xs:element name="ChannelRegion" type="xs:string" minOccurs="0"><xs:annotation><xs:documentation>Geographic region.</xs:documentation></xs:annotation></xs:element>
              <xs:element name="ChannelLanguage" type="xs:string" minOccurs="0"><xs:annotation><xs:documentation>Primary language (ISO 639-1).</xs:documentation></xs:annotation></xs:element>
              <xs:element name="EPGConfiguration" minOccurs="0">
                <xs:annotation><xs:documentation>EPG settings for this channel.</xs:documentation></xs:annotation>
                <xs:complexType><xs:sequence>
                  <xs:element name="EPGChannelId" type="xs:string"><xs:annotation><xs:documentation>Channel ID in EPG feeds.</xs:documentation></xs:annotation></xs:element>
                  <xs:element name="EPGProvider" type="xs:string"><xs:annotation><xs:documentation>EPG data provider.</xs:documentation></xs:annotation></xs:element>
                  <xs:element name="DVBTriplet" minOccurs="0">
                    <xs:annotation><xs:documentation>DVB service identification.</xs:documentation></xs:annotation>
                    <xs:complexType><xs:sequence>
                      <xs:element name="NetworkId" type="xs:integer"/>
                      <xs:element name="TransportStreamId" type="xs:integer"/>
                      <xs:element name="ServiceId" type="xs:integer"/>
                    </xs:sequence></xs:complexType>
                  </xs:element>
                  <xs:element name="TimeShiftMinutes" type="xs:integer" minOccurs="0"><xs:annotation><xs:documentation>Time shift offset for delayed feeds.</xs:documentation></xs:annotation></xs:element>
                </xs:sequence></xs:complexType>
              </xs:element>
              <xs:element name="Schedule">
                <xs:annotation><xs:documentation>Broadcast schedule with transmission slots.</xs:documentation></xs:annotation>
                <xs:complexType><xs:sequence>
                  <xs:element name="Slot" maxOccurs="unbounded">
                    <xs:annotation><xs:documentation>A single transmission slot.</xs:documentation></xs:annotation>
                    <xs:complexType><xs:sequence>
                      <xs:element name="SlotId" type="xs:string"><xs:annotation><xs:documentation>Unique slot identifier.</xs:documentation></xs:annotation></xs:element>
                      <xs:element name="SlotDate" type="xs:date"><xs:annotation><xs:documentation>Broadcast date.</xs:documentation></xs:annotation></xs:element>
                      <xs:element name="StartTime" type="xs:dateTime"><xs:annotation><xs:documentation>Start time (UTC).</xs:documentation></xs:annotation></xs:element>
                      <xs:element name="EndTime" type="xs:dateTime"><xs:annotation><xs:documentation>End time (UTC).</xs:documentation></xs:annotation></xs:element>
                      <xs:element name="Duration" type="xs:duration"><xs:annotation><xs:documentation>Slot duration (ISO 8601).</xs:documentation></xs:annotation></xs:element>
                      <xs:element name="SlotStatus" type="xs:string"><xs:annotation><xs:documentation>Status: PLANNED, CONFIRMED, AIRED, CANCELLED.</xs:documentation></xs:annotation></xs:element>
                      <xs:element name="SlotType" type="xs:string" minOccurs="0"><xs:annotation><xs:documentation>Type: PROGRAMME, INTERSTITIAL, BREAK, JUNCTION.</xs:documentation></xs:annotation></xs:element>
                      <xs:element name="Programme" minOccurs="0">
                        <xs:annotation><xs:documentation>Content item scheduled in this slot.</xs:documentation></xs:annotation>
                        <xs:complexType><xs:sequence>
                          <xs:element name="ProgrammeId" type="xs:string"><xs:annotation><xs:documentation>Programme ID from catalogue.</xs:documentation></xs:annotation></xs:element>
                          <xs:element name="Title" type="xs:string"><xs:annotation><xs:documentation>Main programme title.</xs:documentation></xs:annotation></xs:element>
                          <xs:element name="EpisodeTitle" type="xs:string" minOccurs="0"><xs:annotation><xs:documentation>Episode title for series.</xs:documentation></xs:annotation></xs:element>
                          <xs:element name="SeriesInfo" minOccurs="0">
                            <xs:annotation><xs:documentation>Series/episode numbering.</xs:documentation></xs:annotation>
                            <xs:complexType><xs:sequence>
                              <xs:element name="SeriesNumber" type="xs:integer" minOccurs="0"/>
                              <xs:element name="EpisodeNumber" type="xs:integer" minOccurs="0"/>
                              <xs:element name="TotalEpisodes" type="xs:integer" minOccurs="0"/>
                              <xs:element name="ProductionYear" type="xs:gYear" minOccurs="0"/>
                            </xs:sequence></xs:complexType>
                          </xs:element>
                          <xs:element name="Synopsis" minOccurs="0">
                            <xs:complexType><xs:sequence>
                              <xs:element name="ShortSynopsis" type="xs:string" minOccurs="0"><xs:annotation><xs:documentation>Up to 90 chars for EPG.</xs:documentation></xs:annotation></xs:element>
                              <xs:element name="MediumSynopsis" type="xs:string" minOccurs="0"><xs:annotation><xs:documentation>Up to 250 chars.</xs:documentation></xs:annotation></xs:element>
                              <xs:element name="LongSynopsis" type="xs:string" minOccurs="0"><xs:annotation><xs:documentation>Full description.</xs:documentation></xs:annotation></xs:element>
                            </xs:sequence></xs:complexType>
                          </xs:element>
                          <xs:element name="Genre" minOccurs="0">
                            <xs:complexType><xs:sequence>
                              <xs:element name="PrimaryGenre" type="xs:string"/>
                              <xs:element name="SecondaryGenre" type="xs:string" minOccurs="0"/>
                              <xs:element name="GenreScheme" type="xs:string" minOccurs="0"/>
                            </xs:sequence></xs:complexType>
                          </xs:element>
                          <xs:element name="ContentRatings" minOccurs="0">
                            <xs:complexType><xs:sequence>
                              <xs:element name="Rating" maxOccurs="unbounded">
                                <xs:complexType><xs:sequence>
                                  <xs:element name="RatingScheme" type="xs:string"/>
                                  <xs:element name="RatingValue" type="xs:string"/>
                                  <xs:element name="ContentDescriptors" type="xs:string" minOccurs="0"/>
                                </xs:sequence></xs:complexType>
                              </xs:element>
                            </xs:sequence></xs:complexType>
                          </xs:element>
                          <xs:element name="Credits" minOccurs="0">
                            <xs:complexType><xs:sequence>
                              <xs:element name="Credit" maxOccurs="unbounded">
                                <xs:complexType><xs:sequence>
                                  <xs:element name="Role" type="xs:string"/>
                                  <xs:element name="PersonName" type="xs:string"/>
                                  <xs:element name="CharacterName" type="xs:string" minOccurs="0"/>
                                </xs:sequence></xs:complexType>
                              </xs:element>
                            </xs:sequence></xs:complexType>
                          </xs:element>
                          <xs:element name="TechnicalSpecs" minOccurs="0">
                            <xs:complexType><xs:sequence>
                              <xs:element name="AspectRatio" type="xs:string" minOccurs="0"/>
                              <xs:element name="AudioFormat" type="xs:string" minOccurs="0"/>
                              <xs:element name="Resolution" type="xs:string" minOccurs="0"/>
                              <xs:element name="IsHD" type="xs:boolean" minOccurs="0"/>
                              <xs:element name="IsUHD" type="xs:boolean" minOccurs="0"/>
                              <xs:element name="HasSubtitles" type="xs:boolean" minOccurs="0"/>
                              <xs:element name="HasAudioDescription" type="xs:boolean" minOccurs="0"/>
                              <xs:element name="HasSignLanguage" type="xs:boolean" minOccurs="0"/>
                              <xs:element name="MaterialId" type="xs:string" minOccurs="0"><xs:annotation><xs:documentation>MAM system reference.</xs:documentation></xs:annotation></xs:element>
                            </xs:sequence></xs:complexType>
                          </xs:element>
                          <xs:element name="Rights" minOccurs="0">
                            <xs:complexType><xs:sequence>
                              <xs:element name="RightsWindow" maxOccurs="unbounded">
                                <xs:complexType><xs:sequence>
                                  <xs:element name="WindowStart" type="xs:dateTime"/>
                                  <xs:element name="WindowEnd" type="xs:dateTime"/>
                                  <xs:element name="Territory" type="xs:string"/>
                                  <xs:element name="Platform" type="xs:string"><xs:annotation><xs:documentation>LINEAR, VOD, CATCHUP, SVOD, ALL.</xs:documentation></xs:annotation></xs:element>
                                  <xs:element name="RemainingRuns" type="xs:integer" minOccurs="0"/>
                                  <xs:element name="TotalRuns" type="xs:integer" minOccurs="0"/>
                                  <xs:element name="Exclusivity" type="xs:string" minOccurs="0"/>
                                  <xs:element name="ContractRef" type="xs:string" minOccurs="0"/>
                                </xs:sequence></xs:complexType>
                              </xs:element>
                            </xs:sequence></xs:complexType>
                          </xs:element>
                        </xs:sequence></xs:complexType>
                      </xs:element>
                      <xs:element name="CommercialBreaks" minOccurs="0">
                        <xs:complexType><xs:sequence>
                          <xs:element name="Break" maxOccurs="unbounded">
                            <xs:complexType><xs:sequence>
                              <xs:element name="BreakType" type="xs:string"/>
                              <xs:element name="BreakPosition" type="xs:string"/>
                              <xs:element name="PlannedDuration" type="xs:duration"/>
                              <xs:element name="ActualDuration" type="xs:duration" minOccurs="0"/>
                            </xs:sequence></xs:complexType>
                          </xs:element>
                        </xs:sequence></xs:complexType>
                      </xs:element>
                      <xs:element name="Annotations" minOccurs="0">
                        <xs:complexType><xs:sequence>
                          <xs:element name="IsLive" type="xs:boolean" minOccurs="0"/>
                          <xs:element name="IsRepeat" type="xs:boolean" minOccurs="0"/>
                          <xs:element name="IsPremiere" type="xs:boolean" minOccurs="0"/>
                          <xs:element name="IsLastChance" type="xs:boolean" minOccurs="0"/>
                          <xs:element name="SchedulerNotes" type="xs:string" minOccurs="0"/>
                          <xs:element name="HighlightFlag" type="xs:string" minOccurs="0"/>
                        </xs:sequence></xs:complexType>
                      </xs:element>
                    </xs:sequence></xs:complexType>
                  </xs:element>
                </xs:sequence></xs:complexType>
              </xs:element>
            </xs:sequence></xs:complexType>
          </xs:element>
        </xs:sequence></xs:complexType>
      </xs:element>
    </xs:sequence></xs:complexType>
  </xs:element>
</xs:schema>`;

// ─── XSD Parser ────────────────────────────────────────────────────────
function parseXSD(xsdText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xsdText, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("Invalid XSD: " + doc.querySelector("parsererror").textContent.slice(0, 200));
  const NS = "http://www.w3.org/2001/XMLSchema";
  let idCounter = 0;
  function getDoc(el) { for (const c of el.children) { if (c.localName === "annotation") { for (const d of c.children) { if (d.localName === "documentation") return d.textContent?.trim() || ""; } } } return ""; }
  function childrenByTag(parent, tag) { return [...parent.children].filter(c => c.localName === tag && (c.namespaceURI === NS || !c.namespaceURI)); }
  function parseCT(ctEl) { const kids = []; for (const container of [...childrenByTag(ctEl, "sequence"), ...childrenByTag(ctEl, "all"), ...childrenByTag(ctEl, "choice")]) { for (const el of childrenByTag(container, "element")) { const p = parseEl(el); if (p) kids.push(p); } } return kids; }
  function parseEl(el) {
    const name = el.getAttribute("name"); if (!name) return null;
    const id = `n${idCounter++}`; const minO = el.getAttribute("minOccurs"); const maxO = el.getAttribute("maxOccurs"); const typeAttr = el.getAttribute("type");
    const node = { id, name, documentation: getDoc(el), minOccurs: minO ?? "1", maxOccurs: maxO ?? "1", type: "complex", typeName: "", children: [] };
    const inlineCT = childrenByTag(el, "complexType");
    if (inlineCT.length > 0) { node.children = parseCT(inlineCT[0]); node.type = "complex"; return node; }
    if (typeAttr) { const local = typeAttr.includes(":") ? typeAttr.split(":")[1] : typeAttr; node.type = "simple"; node.typeName = local; }
    return node;
  }
  return childrenByTag(doc.documentElement, "element").map(parseEl).filter(Boolean);
}

// ─── Tree utilities ────────────────────────────────────────────────────
function countDesc(n) { if (!n.children?.length) return 0; return n.children.reduce((s, c) => s + 1 + countDesc(c), 0); }
function countSel(n, sel) { let c = sel[n.id] ? 1 : 0; n.children?.forEach(k => c += countSel(k, sel)); return c; }
function countAll(n) { let c = 1; n.children?.forEach(k => c += countAll(k)); return c; }
function estimateWeight(n) { const rep = n.maxOccurs === "unbounded" ? 50 : parseInt(n.maxOccurs) || 1; if (!n.children?.length) { const sz = { string: 40, dateTime: 25, date: 10, time: 8, duration: 10, integer: 5, boolean: 5, gYear: 4 }; return (sz[n.typeName] || 20) * rep; } return (n.children.reduce((s, c) => s + estimateWeight(c), 0) + 30) * rep; }
function selWeight(n, sel) { if (!sel[n.id]) return 0; const rep = n.maxOccurs === "unbounded" ? 50 : parseInt(n.maxOccurs) || 1; if (!n.children?.length) { const sz = { string: 40, dateTime: 25, date: 10, time: 8, duration: 10, integer: 5, boolean: 5, gYear: 4 }; return (sz[n.typeName] || 20) * rep; } return Math.max(n.children.reduce((s, c) => s + selWeight(c, sel), 0), 30) * rep; }
function getCheckState(n, sel) { if (!n.children?.length) return sel[n.id] ? "checked" : "unchecked"; const states = n.children.map(c => getCheckState(c, sel)); const any = states.some(s => s === "checked" || s === "partial"); const all = states.every(s => s === "checked"); if (!any) return sel[n.id] ? "partial" : "unchecked"; if (all && sel[n.id]) return "checked"; return "partial"; }
function getSelectedLeaves(nodes, sel, path = []) { const leaves = []; for (const n of nodes) { if (!sel[n.id]) continue; const cp = [...path, n.name]; if (!n.children?.length) leaves.push({ id: n.id, name: n.name, path: cp, xpath: cp.join("/"), typeName: n.typeName, node: n }); else leaves.push(...getSelectedLeaves(n.children, sel, cp)); } return leaves; }
function getRepeatingElements(nodes, path = []) { const reps = []; for (const n of nodes) { const cp = [...path, n.name]; if (n.maxOccurs === "unbounded" || parseInt(n.maxOccurs) > 1) reps.push({ id: n.id, name: n.name, path: cp, xpath: cp.join("/"), node: n }); if (n.children?.length) reps.push(...getRepeatingElements(n.children, cp)); } return reps; }
function genFilterXML(nodes, sel, ind = 0) { const pad = "  ".repeat(ind); let xml = ""; for (const n of nodes) { if (!sel[n.id]) continue; if (n.children?.length && n.children.some(c => sel[c.id])) { xml += `${pad}<${n.name}>\n${genFilterXML(n.children, sel, ind + 1)}${pad}</${n.name}>\n`; } else { xml += `${pad}<${n.name} />\n`; } } return xml; }

// ─── XSLT Generators ──────────────────────────────────────────────────
function generateXSLT(format, columns, rowSource, style, groupBy, sortBy, title) {
  const gen = { xlsx: genExcelXSLT, csv: genCSVXSLT, word: genWordXSLT, html: genHTMLXSLT };
  return (gen[format] || genHTMLXSLT)(columns, rowSource, style, groupBy, sortBy, title);
}

function genExcelXSLT(cols, rs, st, gb, sb, title) {
  const srt = sb?.field ? `\n            <xsl:sort select="${sb.field}" order="${sb.dir}" />` : "";
  const rp = rs || "//Slot";
  const grp = gb ? `
              <xsl:if test="not(${gb} = preceding-sibling::*/${gb}) or position()=1">
                <tr><td colspan="${cols.length}" style="background:${st.groupBg || "#e8e8e8"};font-weight:bold;padding:8px 6px;font-size:11pt;border-bottom:2px solid ${st.headerBg};"><xsl:value-of select="${gb}" /></td></tr>
              </xsl:if>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  <xsl:template match="/">
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
          <x:Name>${title || "Export"}</x:Name>
          <x:WorksheetOptions><x:FreezePanes/><x:FrozenNoSplit/><x:SplitHorizontal>1</x:SplitHorizontal><x:TopRowBottomPane>1</x:TopRowBottomPane><x:ActivePane>2</x:ActivePane>${st.autoFilter ? "<x:AutoFilter/>" : ""}</x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>body{font-family:${st.fontFamily || "Calibri, sans-serif"}} table{border-collapse:collapse;width:100%}</style>
      </head>
      <body>
        ${st.showTitle ? `<h2 style="font-family:${st.fontFamily || "Calibri"};color:${st.headerBg};margin-bottom:12px;">${title || "Export"}</h2>` : ""}
        <table>
          <thead><tr>${cols.map(c => `<th style="background:${st.headerBg};color:${st.headerFg};padding:8px 6px;text-align:left;font-size:10pt;font-weight:bold;border-bottom:2px solid ${st.headerBg};width:${c.width || 120}px">${c.header}</th>`).join("")}</tr></thead>
          <tbody>
            <xsl:for-each select="${rp}">${srt}${grp}
              <tr>${cols.map(c => `<td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;font-size:10pt;${c.align ? "text-align:" + c.align + ";" : ""}${c.format === "date" ? "mso-number-format:'yyyy\\-mm\\-dd';" : c.format === "datetime" ? "mso-number-format:'yyyy\\-mm\\-dd hh\\:mm';" : c.format === "number" ? "mso-number-format:'\\#\\,\\#\\#0';" : ""}"><xsl:value-of select="${c.xpath}" /></td>`).join("")}</tr>
            </xsl:for-each>
          </tbody>
        </table>
        ${st.showFooter ? `<p style="font-size:8pt;color:#888;margin-top:16px;">Generated: <xsl:value-of select="//ExportTimestamp" /> | Source: <xsl:value-of select="//SourceSystem" /></p>` : ""}
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;
}

function genCSVXSLT(cols, rs, st) {
  const d = st.delimiter || ","; const q = st.quoteChar || '"';
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="text" encoding="UTF-8" /><xsl:strip-space elements="*" />
  <xsl:template match="/">
    <xsl:text>${cols.map(c => `${q}${c.header}${q}`).join(d)}&#10;</xsl:text>
    <xsl:for-each select="${rs || "//Slot"}">
      ${cols.map((c, i) => `<xsl:text>${i > 0 ? d : ""}${q}</xsl:text><xsl:value-of select="translate(${c.xpath}, '${q}', '\\'')" /><xsl:text>${q}</xsl:text>`).join("\n      ")}
      <xsl:text>&#10;</xsl:text>
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>`;
}

function genWordXSLT(cols, rs, st, gb, sb, title) {
  const srt = sb?.field ? `\n            <xsl:sort select="${sb.field}" order="${sb.dir}" />` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  <xsl:template match="/">
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
        <style>
          @page{size:${st.orientation === "landscape" ? "landscape" : "portrait"};margin:${st.margins || "1in"}}
          body{font-family:${st.fontFamily || "Calibri, serif"};font-size:${st.fontSize || "11"}pt;color:#333;line-height:1.5}
          h1{color:${st.headerBg};font-size:18pt;border-bottom:3px solid ${st.headerBg};padding-bottom:8px;margin-bottom:4px}
          .subtitle{color:#666;font-size:10pt;margin-bottom:24px}
          table{border-collapse:collapse;width:100%;margin-top:16px;page-break-inside:auto}
          tr{page-break-inside:avoid} th{background:${st.headerBg};color:${st.headerFg};padding:8px 10px;text-align:left;font-weight:bold;font-size:10pt}
          td{padding:6px 10px;border-bottom:1px solid #e0e0e0;font-size:10pt;vertical-align:top}
          tr:nth-child(even) td{background:${st.altRowBg || "#f9f9f9"}}
          .footer{margin-top:24px;font-size:8pt;color:#888;border-top:1px solid #ddd;padding-top:8px}
        </style>
      </head>
      <body>
        <h1>${title || "Schedule Export"}</h1>
        <div class="subtitle">Period: <xsl:value-of select="//DateRangeStart" /> &#x2013; <xsl:value-of select="//DateRangeEnd" /> &#160;|&#160; Generated: <xsl:value-of select="//ExportTimestamp" /></div>
        <table><thead><tr>${cols.map(c => `<th>${c.header}</th>`).join("")}</tr></thead>
          <tbody><xsl:for-each select="${rs || "//Slot"}">${srt}
              ${gb ? `<xsl:if test="not(${gb} = preceding-sibling::*/${gb}) or position()=1"><tr><td colspan="${cols.length}" style="background:#f0f0f0;font-weight:bold;padding:10px;font-size:11pt;border-bottom:2px solid ${st.headerBg}"><xsl:value-of select="${gb}" /></td></tr></xsl:if>` : ""}
              <tr>${cols.map(c => `<td><xsl:value-of select="${c.xpath}" /></td>`).join("")}</tr>
          </xsl:for-each></tbody>
        </table>
        <div class="footer">Source: <xsl:value-of select="//SourceSystem" /> &#160;|&#160; Version: <xsl:value-of select="//ExportVersion" /></div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;
}

function genHTMLXSLT(cols, rs, st, gb, sb, title) {
  const srt = sb?.field ? `\n            <xsl:sort select="${sb.field}" order="${sb.dir}" />` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  <xsl:template match="/">
    <html lang="en"><head><meta charset="UTF-8" /><title>${title || "Export"}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box} body{font-family:${st.fontFamily || "'Segoe UI', sans-serif"};background:#f5f5f7;color:#333;padding:32px}
        .container{max-width:1200px;margin:0 auto;background:white;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);overflow:hidden}
        .header{background:${st.headerBg};color:${st.headerFg};padding:24px 32px} .header h1{font-size:20px;font-weight:600} .header .meta{font-size:12px;opacity:.8;margin-top:4px}
        table{width:100%;border-collapse:collapse} th{background:#f8f8fa;padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #e8e8ec;position:sticky;top:0}
        td{padding:10px 16px;border-bottom:1px solid #f0f0f2;font-size:13px} tr:hover td{background:#f8f9ff}
        .footer{padding:16px 32px;font-size:11px;color:#999;border-top:1px solid #eee}
      </style>
    </head>
    <body><div class="container">
      <div class="header"><h1>${title || "Schedule Export"}</h1><div class="meta"><xsl:value-of select="//DateRangeStart" /> &#x2013; <xsl:value-of select="//DateRangeEnd" /> &#160;|&#160; <xsl:value-of select="//SourceSystem" /></div></div>
      <table><thead><tr>${cols.map(c => `<th>${c.header}</th>`).join("")}</tr></thead>
        <tbody><xsl:for-each select="${rs || "//Slot"}">${srt}
            ${gb ? `<xsl:if test="not(${gb} = preceding-sibling::*/${gb}) or position()=1"><tr><td colspan="${cols.length}" style="background:#f0f4ff;font-weight:600;color:${st.headerBg};border-bottom:2px solid ${st.headerBg}20;padding:12px 16px"><xsl:value-of select="${gb}" /></td></tr></xsl:if>` : ""}
            <tr>${cols.map(c => `<td><xsl:value-of select="${c.xpath}" /></td>`).join("")}</tr>
        </xsl:for-each></tbody>
      </table>
      <div class="footer">Generated: <xsl:value-of select="//ExportTimestamp" /></div>
    </div></body></html>
  </xsl:template>
</xsl:stylesheet>`;
}

// ─── Report Definition Generator ───────────────────────────────────────
function generateReportDefinition(meta, columns, style, exportFormat, rowSource, groupBy, sortBy, filterFieldCount, totalFieldCount, reductionPct) {
  const now = new Date().toISOString();
  const slug = meta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const ext = { xlsx: ".xlsx", csv: ".csv", word: ".doc", html: ".html" }[exportFormat] || ".html";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  WHATS'ON Report Definition
  Generated by XML Filter & Export Builder
  Created: ${now}
-->
<ReportDefinition xmlns="urn:mediagenix:whatson:report-definition:v1"
                  version="1.0"
                  created="${now}">

  <!-- ═══ Report Identity ═══ -->
  <Identity>
    <ReportId>${slug}-${Date.now().toString(36)}</ReportId>
    <Name>${escXml(meta.name)}</Name>
    <Description>${escXml(meta.description)}</Description>
    <Version>${escXml(meta.version)}</Version>
    <Author>${escXml(meta.author)}</Author>
    <Category>${escXml(meta.category)}</Category>
    <Tags>${meta.tags.map(t => `\n      <Tag>${escXml(t)}</Tag>`).join("")}
    </Tags>
    <Created>${now}</Created>
    <LastModified>${now}</LastModified>
  </Identity>

  <!-- ═══ Data Source Configuration ═══ -->
  <DataSource>
    <FilterFile>${slug}-filter.xml</FilterFile>
    <FieldCount selected="${filterFieldCount}" total="${totalFieldCount}" reduction="${reductionPct}%" />
    <RowSourceXPath>${escXml(rowSource || "//Slot")}</RowSourceXPath>
    ${groupBy ? `<GroupBy xpath="${escXml(groupBy)}" />` : "<!-- No grouping configured -->"}
    ${sortBy?.field ? `<SortBy xpath="${escXml(sortBy.field)}" direction="${sortBy.dir}" />` : "<!-- No sorting configured -->"}
  </DataSource>

  <!-- ═══ Output Configuration ═══ -->
  <Output>
    <Format>${exportFormat}</Format>
    <FileExtension>${ext}</FileExtension>
    <TransformFile>${slug}-transform.xslt</TransformFile>
    <Encoding>UTF-8</Encoding>
    <DefaultFileName>${slug}-{date}{ext}</DefaultFileName>
  </Output>

  <!-- ═══ Column Definitions ═══ -->
  <Columns count="${columns.length}">${columns.map((c, i) => `
    <Column index="${i + 1}">
      <Header>${escXml(c.header)}</Header>
      <XPath>${escXml(c.xpath)}</XPath>
      <Format>${c.format || "auto"}</Format>
      <Alignment>${c.align || "left"}</Alignment>
      <Width>${c.width || 120}</Width>
    </Column>`).join("")}
  </Columns>

  <!-- ═══ Style Configuration ═══ -->
  <Style preset="${meta.stylePreset || "custom"}">
    <HeaderBackground>${style.headerBg}</HeaderBackground>
    <HeaderForeground>${style.headerFg}</HeaderForeground>
    <AlternateRowBackground>${style.altRowBg || "#f9f9f9"}</AlternateRowBackground>
    <FontFamily>${escXml(style.fontFamily || "Calibri, sans-serif")}</FontFamily>
    <FontSize>${style.fontSize || "10"}</FontSize>
    <ShowTitle>${style.showTitle ? "true" : "false"}</ShowTitle>
    <ShowFooter>${style.showFooter ? "true" : "false"}</ShowFooter>
    ${exportFormat === "xlsx" ? `<AutoFilter>${style.autoFilter ? "true" : "false"}</AutoFilter>` : ""}
    ${exportFormat === "word" ? `<Orientation>${style.orientation || "portrait"}</Orientation>\n    <Margins>${style.margins || "1in"}</Margins>` : ""}
    ${exportFormat === "csv" ? `<Delimiter>${escXml(style.delimiter || ",")}</Delimiter>\n    <QuoteCharacter>${escXml(style.quoteChar || '"')}</QuoteCharacter>` : ""}
  </Style>

  <!-- ═══ Execution Settings ═══ -->
  <Execution>
    <Schedule>
      <Enabled>${meta.scheduleEnabled ? "true" : "false"}</Enabled>
      ${meta.scheduleCron ? `<Cron>${escXml(meta.scheduleCron)}</Cron>` : "<!-- No schedule configured -->"}
      ${meta.scheduleDescription ? `<Description>${escXml(meta.scheduleDescription)}</Description>` : ""}
    </Schedule>
    <Distribution>
      ${meta.outputPath ? `<OutputPath>${escXml(meta.outputPath)}</OutputPath>` : "<!-- Default output path -->"}
      ${meta.emailRecipients ? `<EmailRecipients>${escXml(meta.emailRecipients)}</EmailRecipients>` : ""}
      <OverwriteExisting>${meta.overwrite ? "true" : "false"}</OverwriteExisting>
    </Distribution>
    <XSLTProcessor>${escXml(meta.xsltProcessor || "system-default")}</XSLTProcessor>
  </Execution>

  <!-- ═══ Package Files ═══ -->
  <PackageContents>
    <File type="report-definition">${slug}-report.xml</File>
    <File type="filter">${slug}-filter.xml</File>
    <File type="transform">${slug}-transform.xslt</File>
  </PackageContents>

</ReportDefinition>`;
}

function escXml(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

// ─── Style Presets ─────────────────────────────────────────────────────
const PRESETS = {
  corporate: { name: "Corporate", headerBg: "#1a365d", headerFg: "#ffffff", altRowBg: "#f7f9fc", groupBg: "#e8edf5", fontFamily: "Calibri, Arial, sans-serif", fontSize: "10" },
  broadcast: { name: "Broadcast", headerBg: "#1a1a2e", headerFg: "#60d394", altRowBg: "#f5f5fa", groupBg: "#e8e8f0", fontFamily: "'Segoe UI', sans-serif", fontSize: "10" },
  clean: { name: "Clean Minimal", headerBg: "#333333", headerFg: "#ffffff", altRowBg: "#fafafa", groupBg: "#f0f0f0", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "10" },
  warm: { name: "Warm Report", headerBg: "#8b4513", headerFg: "#fff8ee", altRowBg: "#fdf6ee", groupBg: "#f0e4d4", fontFamily: "Georgia, serif", fontSize: "11" },
  modern: { name: "Modern Tech", headerBg: "#6c5ce7", headerFg: "#ffffff", altRowBg: "#f8f7ff", groupBg: "#ede8ff", fontFamily: "'SF Pro Display', system-ui", fontSize: "10" },
};

// ─── Shared styles ─────────────────────────────────────────────────────
const S = {
  btn: { padding: "3px 8px", borderRadius: 3, fontSize: 10, cursor: "pointer", background: "#14141e", color: "#707080", border: "1px solid #1e1e2e" },
  code: { padding: "1px 5px", borderRadius: 3, fontSize: 11, background: "#14141e", color: "#a0a0d0", border: "1px solid #1e1e2e", fontFamily: "'JetBrains Mono', monospace" },
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
  sans: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
};
const TC = { string: { bg: "#1a2e1a", fg: "#6ecf6e", bd: "#2d4a2d" }, dateTime: { bg: "#1a1a2e", fg: "#6e8fcf", bd: "#2d2d4a" }, date: { bg: "#1a1a2e", fg: "#6e8fcf", bd: "#2d2d4a" }, time: { bg: "#1a1a2e", fg: "#6e8fcf", bd: "#2d2d4a" }, duration: { bg: "#2e1a2e", fg: "#cf6ecf", bd: "#4a2d4a" }, integer: { bg: "#2e2a1a", fg: "#cfb36e", bd: "#4a3d2d" }, boolean: { bg: "#2e1a1a", fg: "#cf6e6e", bd: "#4a2d2d" }, gYear: { bg: "#1a2e2e", fg: "#6ecfcf", bd: "#2d4a4a" }, complex: { bg: "#1e1e2e", fg: "#a0a0d0", bd: "#33334d" } };
function getTS(n) { return (n.type === "complex" && n.children?.length) ? TC.complex : TC[n.typeName] || TC.string; }

// ─── Download helper ───────────────────────────────────────────────────
function downloadFile(content, filename, mimeType = "application/xml") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── Components ────────────────────────────────────────────────────────
function Tri({ state, onChange }) {
  const c = { checked: "#60d394", partial: "#f0c35e", unchecked: "#555" };
  return (<div onClick={e => { e.stopPropagation(); onChange(); }} style={{ width: 15, height: 15, borderRadius: 3, cursor: "pointer", flexShrink: 0, border: `2px solid ${c[state]}`, background: state === "checked" ? c.checked : state === "partial" ? c.partial + "30" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
    {state === "checked" && <svg width="9" height="9" viewBox="0 0 10 10"><path d="M2 5L4.5 7.5L8 3" stroke="#0a0a0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
    {state === "partial" && <div style={{ width: 7, height: 2, background: "#f0c35e", borderRadius: 1 }} />}
  </div>);
}

function TNode({ node, sel, exp, onToggle, onExp, depth, maxW }) {
  const has = node.children?.length > 0; const isE = exp[node.id]; const cs = getCheckState(node, sel); const ts = getTS(node);
  const isRep = node.maxOccurs === "unbounded" || parseInt(node.maxOccurs) > 1; const w = estimateWeight(node); const dc = countDesc(node); const [h, setH] = useState(false);
  const card = (() => { const min = node.minOccurs, max = node.maxOccurs === "unbounded" ? "∞" : node.maxOccurs; return (min === "1" && max === "1") ? null : `${min}..${max}`; })();
  return (<div>
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={() => has && onExp(node.id)}
      style={{ display: "flex", alignItems: "center", gap: 7, padding: `5px 10px 5px ${14 + depth * 18}px`, cursor: has ? "pointer" : "default", background: h ? "#14141e" : "transparent", transition: "background .1s", userSelect: "none" }}>
      <div style={{ width: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {has && <svg width="9" height="9" viewBox="0 0 10 10" style={{ transform: isE ? "rotate(90deg)" : "rotate(0)", transition: "transform .15s" }}><path d="M3 1L8 5L3 9" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <Tri state={cs} onChange={() => onToggle(node)} />
      <span style={{ fontFamily: S.mono, fontSize: 12, fontWeight: sel[node.id] ? 600 : 400, color: sel[node.id] ? "#e0e0f0" : "#808090" }}>{node.name}</span>
      <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: ts.bg, color: ts.fg, border: `1px solid ${ts.bd}`, fontFamily: S.mono, flexShrink: 0 }}>{has ? `${dc}` : node.typeName || "complex"}</span>
      {card && <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 3, background: isRep ? "#2e1a1a" : "#1a1a1e", color: isRep ? "#e08080" : "#707080", border: `1px solid ${isRep ? "#4a2d2d" : "#2a2a34"}`, fontFamily: S.mono, flexShrink: 0 }}>{card}</span>}
      {node.minOccurs !== "0" && <span style={{ fontSize: 9, color: "#e08080", flexShrink: 0 }}>●</span>}
      <div style={{ flex: 1 }} />
      <div style={{ width: 28, height: 3, background: "#1a1a24", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ width: `${Math.min(w / maxW, 1) * 100}%`, height: "100%", borderRadius: 2, transition: "width .3s", background: w / maxW < .15 ? "#60d394" : w / maxW < .4 ? "#f0c35e" : "#e06060" }} />
      </div>
      {h && node.documentation && <div style={{ position: "absolute", right: 20, marginTop: 40, padding: "8px 12px", background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 6, fontSize: 11, color: "#a0a0b0", maxWidth: 300, zIndex: 100, lineHeight: 1.5, boxShadow: "0 8px 24px rgba(0,0,0,.4)", pointerEvents: "none" }}>{node.documentation}</div>}
    </div>
    {has && isE && <div style={{ borderLeft: "1px solid #1a1a2e", marginLeft: 14 + depth * 18 + 6 }}>{node.children.map(c => <TNode key={c.id} node={c} sel={sel} exp={exp} onToggle={onToggle} onExp={onExp} depth={depth + 1} maxW={maxW} />)}</div>}
  </div>);
}

function ColRow({ col, index, total, onUpdate, onRemove, onMove }) {
  const [ed, setEd] = useState(false);
  return (<div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", background: index % 2 === 0 ? "#0d0d14" : "#101018", borderBottom: "1px solid #14141e", fontSize: 11 }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
      <button disabled={index === 0} onClick={() => onMove(index, index - 1)} style={{ ...S.btn, padding: "0 4px", fontSize: 8, opacity: index === 0 ? .3 : 1 }}>▲</button>
      <button disabled={index === total - 1} onClick={() => onMove(index, index + 1)} style={{ ...S.btn, padding: "0 4px", fontSize: 8, opacity: index === total - 1 ? .3 : 1 }}>▼</button>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      {ed ? <input value={col.header} onChange={e => onUpdate(index, { ...col, header: e.target.value })} onBlur={() => setEd(false)} autoFocus style={{ width: "100%", padding: "2px 6px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 3, color: "#e0e0f0", fontSize: 11, fontFamily: S.sans, outline: "none" }} />
        : <div onClick={() => setEd(true)} style={{ cursor: "pointer", color: "#c0c0d0", fontWeight: 500 }}>{col.header}</div>}
      <div style={{ fontSize: 9, color: "#505060", fontFamily: S.mono, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.xpath}</div>
    </div>
    <select value={col.format || "auto"} onChange={e => onUpdate(index, { ...col, format: e.target.value })} style={{ padding: "2px 4px", background: "#14141e", border: "1px solid #1e1e2e", borderRadius: 3, color: "#808090", fontSize: 9, outline: "none" }}>
      <option value="auto">Auto</option><option value="text">Text</option><option value="date">Date</option><option value="datetime">DateTime</option><option value="number">Number</option>
    </select>
    <select value={col.align || "left"} onChange={e => onUpdate(index, { ...col, align: e.target.value })} style={{ padding: "2px 4px", background: "#14141e", border: "1px solid #1e1e2e", borderRadius: 3, color: "#808090", fontSize: 9, outline: "none" }}>
      <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
    </select>
    <input type="number" value={col.width || 120} min={40} max={400} onChange={e => onUpdate(index, { ...col, width: parseInt(e.target.value) || 120 })} style={{ width: 42, padding: "2px 4px", background: "#14141e", border: "1px solid #1e1e2e", borderRadius: 3, color: "#808090", fontSize: 9, outline: "none", textAlign: "center" }} />
    <button onClick={() => onRemove(index)} style={{ ...S.btn, color: "#e06060", borderColor: "#3a1a1a", padding: "2px 6px" }}>×</button>
  </div>);
}

function PreviewTable({ columns, style: st }) {
  const rows = [
    { Channel: "VTM", Date: "2026-02-15", Start: "20:00", Title: "Het Journaal", Episode: "", Genre: "News", Status: "CONFIRMED", S: "1", E: "45", Synopsis: "Evening news", HD: "true" },
    { Channel: "VTM", Date: "2026-02-15", Start: "20:35", Title: "Familie", Episode: "S28E142", Genre: "Drama", Status: "CONFIRMED", S: "28", E: "142", Synopsis: "Daily drama", HD: "true" },
    { Channel: "één", Date: "2026-02-15", Start: "21:00", Title: "De Afspraak", Episode: "", Genre: "Talk Show", Status: "PLANNED", S: "", E: "", Synopsis: "Current affairs", HD: "true" },
  ];
  const guess = (col, row) => { const f = col.xpath.split("/").pop(); const m = { ChannelName: "Channel", ChannelCode: "Channel", SlotDate: "Date", StartTime: "Start", Title: "Title", EpisodeTitle: "Episode", PrimaryGenre: "Genre", SlotStatus: "Status", SeriesNumber: "S", EpisodeNumber: "E", ShortSynopsis: "Synopsis", IsHD: "HD" }; return row[m[f]] || "—"; };
  return (<div style={{ border: "1px solid #1e1e2e", borderRadius: 6, overflow: "hidden", fontSize: 10 }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{columns.map((c, i) => <th key={i} style={{ background: st.headerBg, color: st.headerFg, padding: "6px 8px", textAlign: "left", fontWeight: 600, fontSize: 10, whiteSpace: "nowrap" }}>{c.header}</th>)}</tr></thead>
      <tbody>{rows.map((r, ri) => <tr key={ri}>{columns.map((c, ci) => <td key={ci} style={{ padding: "5px 8px", borderBottom: "1px solid #1a1a24", color: "#a0a0b0", textAlign: c.align || "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{guess(c, r)}</td>)}</tr>)}</tbody>
    </table>
  </div>);
}

// ─── Input Field component ─────────────────────────────────────────────
function Field({ label, desc, value, onChange, type = "text", placeholder = "" }) {
  return (<div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: "#808090", marginBottom: 3 }}>{label} {desc && <span style={{ fontWeight: 400, color: "#404050" }}>— {desc}</span>}</div>
    {type === "textarea" ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
        style={{ width: "100%", padding: "6px 10px", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 4, color: "#c0c0d0", fontSize: 11, fontFamily: S.sans, outline: "none", resize: "vertical" }} />
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "6px 10px", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 4, color: "#c0c0d0", fontSize: 11, fontFamily: S.sans, outline: "none" }} />
    )}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════
export default function XMLFilterBuilder() {
  const [tree, setTree] = useState([]);
  const [sel, setSel] = useState({});
  const [exp, setExp] = useState({});
  const [error, setError] = useState("");
  const [schemaSource, setSchemaSource] = useState("demo");
  const [customXSD, setCustomXSD] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [rightTab, setRightTab] = useState("export");
  const fileRef = useRef(null);

  const [exportFormat, setExportFormat] = useState("xlsx");
  const [exportTitle, setExportTitle] = useState("Schedule Export");
  const [columns, setColumns] = useState([]);
  const [stylePreset, setStylePreset] = useState("broadcast");
  const [customStyle, setCustomStyle] = useState({ ...PRESETS.broadcast, showTitle: true, showFooter: true, autoFilter: true, orientation: "landscape", delimiter: ",", quoteChar: '"', margins: "1in" });
  const [rowSource, setRowSource] = useState("");
  const [groupBy, setGroupBy] = useState("");
  const [sortBy, setSortBy] = useState({ field: "", dir: "asc" });
  const [downloadStatus, setDownloadStatus] = useState("");

  // Report metadata
  const [reportMeta, setReportMeta] = useState({
    name: "Schedule Export", description: "Daily schedule overview report for editorial review",
    version: "1.0", author: "", category: "Schedule", tags: ["schedule", "daily"],
    scheduleEnabled: false, scheduleCron: "", scheduleDescription: "",
    outputPath: "", emailRecipients: "", overwrite: true, xsltProcessor: "system-default", stylePreset: "broadcast",
  });

  useEffect(() => { loadSchema(DEMO_XSD); }, []);

  function loadSchema(xsdText) {
    try {
      const parsed = parseXSD(xsdText); if (!parsed.length) throw new Error("No root elements found.");
      setTree(parsed); setSel({}); setExp({}); setError("");
      const ie = {}; parsed.forEach(n => ie[n.id] = true); setExp(ie);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => {
    const leaves = getSelectedLeaves(tree, sel);
    const reps = getRepeatingElements(tree).filter(r => sel[r.id]);
    if (reps.length > 0 && !rowSource) { const d = reps.reduce((a, b) => b.path.length > a.path.length ? b : a); setRowSource("//" + d.name); }
    if (leaves.length > 0 && columns.length === 0) {
      setColumns(leaves.slice(0, 20).map(l => ({ id: l.id, xpath: l.xpath.split("/").slice(-2).join("/").replace(/^.*?(Slot|Channel)\//, ""), header: l.name.replace(/([A-Z])/g, " $1").trim(), format: "auto", align: "left", width: 120, fullPath: l.xpath })));
    }
  }, [sel]);

  const toggleNode = useCallback((node) => {
    setSel(prev => {
      const next = { ...prev }; const shouldSel = getCheckState(node, prev) !== "checked";
      const setAll = (n, v) => { next[n.id] = v; n.children?.forEach(c => setAll(c, v)); };
      const selParents = (tid, nodes, path = []) => { for (const n of nodes) { if (n.id === tid) { path.forEach(p => next[p.id] = true); return true; } if (n.children && selParents(tid, n.children, [...path, n])) return true; } return false; };
      setAll(node, shouldSel); if (shouldSel) selParents(node.id, tree);
      return next;
    });
    setColumns([]);
  }, [tree]);

  const toggleExp = useCallback((id) => setExp(p => ({ ...p, [id]: !p[id] })), []);
  const expandAll = useCallback(() => { const all = {}; const w = ns => ns.forEach(n => { if (n.children?.length) { all[n.id] = true; w(n.children); } }); w(tree); setExp(all); }, [tree]);
  const collapseAll = useCallback(() => setExp({}), []);
  const selectNone = useCallback(() => { setSel({}); setColumns([]); }, []);
  const selectAll = useCallback(() => { const all = {}; const w = ns => ns.forEach(n => { all[n.id] = true; if (n.children) w(n.children); }); w(tree); setSel(all); setColumns([]); }, [tree]);

  const totalN = useMemo(() => tree.reduce((s, n) => s + countAll(n), 0), [tree]);
  const selN = useMemo(() => tree.reduce((s, n) => s + countSel(n, sel), 0), [tree, sel]);
  const totalW = useMemo(() => tree.reduce((s, n) => s + estimateWeight(n), 0), [tree]);
  const selW = useMemo(() => tree.reduce((s, n) => s + selWeight(n, sel), 0), [tree, sel]);
  const redPct = totalW > 0 ? Math.round((1 - selW / totalW) * 100) : 0;
  const maxNW = useMemo(() => Math.max(...tree.map(n => estimateWeight(n)), 1), [tree]);
  const repeatingEls = useMemo(() => getRepeatingElements(tree), [tree]);

  const filterXML = useMemo(() => {
    if (selN === 0) return "<!-- No elements selected -->";
    return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Filter: ${selN}/${totalN} fields (${redPct}% reduction) -->\n<FilterDefinition>\n${genFilterXML(tree, sel, 1)}</FilterDefinition>`;
  }, [tree, sel, selN, totalN, redPct]);

  const xsltOutput = useMemo(() => {
    if (columns.length === 0) return "<!-- Configure columns first -->";
    return generateXSLT(exportFormat, columns, rowSource, customStyle, groupBy || null, sortBy.field ? sortBy : null, exportTitle);
  }, [exportFormat, columns, rowSource, customStyle, groupBy, sortBy, exportTitle]);

  const reportDefXML = useMemo(() => {
    return generateReportDefinition({ ...reportMeta, stylePreset }, columns, customStyle, exportFormat, rowSource, groupBy, sortBy, selN, totalN, redPct);
  }, [reportMeta, columns, customStyle, exportFormat, rowSource, groupBy, sortBy, selN, totalN, redPct, stylePreset]);

  function handleFileUpload(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { const t = ev.target.result; setCustomXSD(t); loadSchema(t); setSchemaSource("custom"); setShowImport(false); }; r.readAsText(f); }

  function applyPreset(key) { setStylePreset(key); setCustomStyle(prev => ({ ...prev, ...PRESETS[key] })); }

  function autoPopulateCols() {
    const leaves = getSelectedLeaves(tree, sel);
    setColumns(leaves.slice(0, 20).map(l => {
      const parts = l.xpath.split("/"); const rsn = (rowSource || "//Slot").replace("//", "");
      const ri = parts.indexOf(rsn); const rel = ri >= 0 ? parts.slice(ri + 1).join("/") : parts.slice(-2).join("/");
      return { id: l.id, xpath: rel || l.name, header: l.name.replace(/([A-Z])/g, " $1").trim(),
        format: ["dateTime", "date"].includes(l.typeName) ? (l.typeName === "dateTime" ? "datetime" : "date") : ["integer", "int"].includes(l.typeName) ? "number" : "auto",
        align: ["integer", "int"].includes(l.typeName) ? "right" : "left", width: 120, fullPath: l.xpath };
    }));
  }

  const slug = reportMeta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "report";
  const isReady = selN > 0 && columns.length > 0;

  function downloadAll() {
    downloadFile(filterXML, `${slug}-filter.xml`);
    setTimeout(() => downloadFile(xsltOutput, `${slug}-transform.xslt`), 300);
    setTimeout(() => downloadFile(reportDefXML, `${slug}-report.xml`), 600);
    setDownloadStatus("✓ 3 files downloaded");
    setTimeout(() => setDownloadStatus(""), 3000);
  }

  const fmtMeta = {
    xlsx: { icon: "📊", label: "Excel", desc: "HTML-based Excel with frozen headers and auto-filter" },
    csv: { icon: "📝", label: "CSV", desc: "Plain text with configurable delimiter" },
    word: { icon: "📄", label: "Word", desc: "Styled document for Microsoft Word" },
    html: { icon: "🌐", label: "HTML", desc: "Responsive report for web viewing" },
  };

  const TABS = [
    { key: "export", label: "Export Design" },
    { key: "package", label: "Package" },
    { key: "xslt", label: "XSLT" },
    { key: "filter", label: "Filter" },
    { key: "guide", label: "Guide" },
  ];

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0f", color: "#c0c0d0", fontFamily: S.sans }}>
      {/* Header */}
      <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #1a1a2e", background: "#0d0d14", flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><rect x="2" y="2" width="18" height="18" rx="3" stroke="#60d394" strokeWidth="1.5" /><path d="M7 8h8M7 11h5M7 14h6" stroke="#60d394" strokeWidth="1.5" strokeLinecap="round" /></svg>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.02em", color: "#e0e0f0" }}>XML Filter &amp; Export Builder</span>
        <span style={{ fontSize: 10, color: "#505068" }}>Schema → Filter → Transform → Package</span>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: schemaSource === "demo" ? "#1a2e1a" : "#1a1a2e", color: schemaSource === "demo" ? "#60d394" : "#6e8fcf", border: `1px solid ${schemaSource === "demo" ? "#2d4a2d" : "#2d2d4a"}` }}>{schemaSource === "demo" ? "Demo: Broadcast" : "Custom Schema"}</div>
        <button onClick={() => setShowImport(!showImport)} style={{ ...S.btn, padding: "5px 12px", fontWeight: 600 }}>Load Schema</button>
      </div>

      {showImport && (
        <div style={{ padding: 16, borderBottom: "1px solid #1a1a2e", background: "#0d0d16", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { loadSchema(DEMO_XSD); setSchemaSource("demo"); setShowImport(false); }} style={{ ...S.btn, padding: "6px 14px", background: "#1a2e1a", color: "#60d394", borderColor: "#2d4a2d" }}>Demo Schema</button>
            <button onClick={() => fileRef.current?.click()} style={{ ...S.btn, padding: "6px 14px", background: "#1a1a2e", color: "#6e8fcf", borderColor: "#2d2d4a" }}>Upload .xsd</button>
            <input ref={fileRef} type="file" accept=".xsd,.xml" onChange={handleFileUpload} style={{ display: "none" }} />
          </div>
          <textarea value={customXSD} onChange={e => setCustomXSD(e.target.value)} placeholder="Or paste XSD content..." style={{ width: "100%", height: 100, padding: 10, borderRadius: 5, resize: "vertical", background: "#0a0a12", color: "#a0a0b0", border: "1px solid #1a1a2e", fontFamily: S.mono, fontSize: 10, outline: "none" }} />
          <button onClick={() => { if (customXSD.trim()) { loadSchema(customXSD); setSchemaSource("custom"); setShowImport(false); } }} disabled={!customXSD.trim()} style={{ ...S.btn, padding: "6px 16px", fontWeight: 600, alignSelf: "flex-start", background: customXSD.trim() ? "#60d394" : "#1a1a2e", color: customXSD.trim() ? "#0a0a0f" : "#404050", border: "none" }}>Parse &amp; Load</button>
          {error && <div style={{ fontSize: 11, color: "#e06060", padding: "6px 10px", background: "#2e1a1a", borderRadius: 4 }}>{error}</div>}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT: Schema tree */}
        <div style={{ flex: "1 1 50%", display: "flex", flexDirection: "column", borderRight: "1px solid #1a1a2e", minWidth: 0 }}>
          <div style={{ padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #14141e", background: "#0d0d12", flexShrink: 0, flexWrap: "wrap" }}>
            <button onClick={expandAll} style={S.btn}>Expand</button><button onClick={collapseAll} style={S.btn}>Collapse</button>
            <span style={{ color: "#1e1e2e" }}>│</span>
            <button onClick={selectAll} style={S.btn}>Select All</button><button onClick={selectNone} style={S.btn}>Clear</button>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 9, color: "#404050" }}>● req &#160; 0..∞ repeats &#160; hover=docs</div>
          </div>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #14141e", display: "flex", gap: 16, alignItems: "center", flexShrink: 0, background: "#0c0c12" }}>
            <div><div style={{ fontSize: 9, color: "#404050", textTransform: "uppercase", letterSpacing: ".06em" }}>Fields</div><div style={{ fontSize: 16, fontWeight: 700, color: "#e0e0f0", fontFamily: S.mono }}>{selN}<span style={{ fontSize: 11, color: "#404050", fontWeight: 400 }}>/{totalN}</span></div></div>
            <div><div style={{ fontSize: 9, color: "#404050", textTransform: "uppercase", letterSpacing: ".06em" }}>Reduction</div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: S.mono, color: redPct > 60 ? "#60d394" : redPct > 30 ? "#f0c35e" : selN > 0 ? "#e08080" : "#252530" }}>{selN > 0 ? `${redPct}%` : "—"}</div></div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 5, background: "#14141e", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${totalW > 0 ? (selW / totalW) * 100 : 0}%`, height: "100%", borderRadius: 3, transition: "all .3s", background: selW / totalW < .3 ? "#60d394" : selW / totalW < .6 ? "#f0c35e" : "#e08080" }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#303038", marginTop: 2 }}><span>Minimal</span><span>Full extract</span></div>
            </div>
          </div>
          {selN > 0 && redPct < 20 && <div style={{ margin: "0 8px", padding: "6px 10px", background: "#2e1a1a", border: "1px solid #4a2020", borderRadius: 4, fontSize: 10, color: "#e08080", lineHeight: 1.4, flexShrink: 0 }}>⚠ Selecting most of the schema — "whole store to the register" anti-pattern.</div>}
          <div style={{ flex: 1, overflow: "auto", paddingTop: 2, paddingBottom: 20 }}>
            {tree.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "#404050", fontSize: 12 }}>No schema loaded</div>
              : tree.map(n => <TNode key={n.id} node={n} sel={sel} exp={exp} onToggle={toggleNode} onExp={toggleExp} depth={0} maxW={maxNW} />)}
          </div>
        </div>

        {/* RIGHT: Tabs */}
        <div style={{ flex: "1 1 50%", display: "flex", flexDirection: "column", background: "#0b0b12", minWidth: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid #14141e", flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setRightTab(t.key)} style={{
                flex: 1, padding: "7px 4px", fontSize: 10, fontWeight: 600, cursor: "pointer", border: "none", transition: "all .1s",
                background: rightTab === t.key ? "#14141e" : "transparent", color: rightTab === t.key ? "#e0e0f0" : "#505068",
                borderBottom: rightTab === t.key ? "2px solid #60d394" : "2px solid transparent" }}>{t.label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>

            {/* ═══ EXPORT DESIGN ═══ */}
            {rightTab === "export" && (
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#a0a0b0", marginBottom: 6 }}>Output Format</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {Object.entries(fmtMeta).map(([k, v]) => (
                      <button key={k} onClick={() => setExportFormat(k)} style={{ padding: "8px 10px", borderRadius: 5, cursor: "pointer", textAlign: "left", transition: "all .15s", background: exportFormat === k ? "#1a1a2e" : "#0d0d14", border: `1px solid ${exportFormat === k ? "#3a3a5a" : "#1a1a2e"}`, color: exportFormat === k ? "#e0e0f0" : "#606070" }}>
                        <div style={{ fontSize: 13 }}>{v.icon} <span style={{ fontSize: 11, fontWeight: 600 }}>{v.label}</span></div>
                        <div style={{ fontSize: 9, color: "#505060", marginTop: 2 }}>{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#808090", marginBottom: 3 }}>Row Source</div>
                  <select value={rowSource} onChange={e => { setRowSource(e.target.value); setColumns([]); }} style={{ width: "100%", padding: "6px 10px", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 4, color: "#e0e0f0", fontSize: 11, fontFamily: S.mono, outline: "none" }}>
                    <option value="">Auto-detect</option>
                    {repeatingEls.map(r => <option key={r.id} value={"//" + r.name}>{r.xpath} (0..∞)</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><div style={{ fontSize: 10, color: "#505060", marginBottom: 3 }}>Group by</div>
                    <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ width: "100%", padding: "4px 6px", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 3, color: "#a0a0b0", fontSize: 10, outline: "none" }}><option value="">None</option>{columns.map(c => <option key={c.id} value={c.xpath}>{c.header}</option>)}</select></div>
                  <div><div style={{ fontSize: 10, color: "#505060", marginBottom: 3 }}>Sort by</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <select value={sortBy.field} onChange={e => setSortBy(p => ({ ...p, field: e.target.value }))} style={{ flex: 1, padding: "4px 6px", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 3, color: "#a0a0b0", fontSize: 10, outline: "none" }}><option value="">None</option>{columns.map(c => <option key={c.id} value={c.xpath}>{c.header}</option>)}</select>
                      <select value={sortBy.dir} onChange={e => setSortBy(p => ({ ...p, dir: e.target.value }))} style={{ width: 50, padding: "4px", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 3, color: "#a0a0b0", fontSize: 10, outline: "none" }}><option value="asc">A→Z</option><option value="desc">Z→A</option></select>
                    </div></div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#808090", marginBottom: 4 }}>Style</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {Object.entries(PRESETS).map(([k, v]) => <button key={k} onClick={() => applyPreset(k)} style={{ padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: 500, background: stylePreset === k ? v.headerBg : "#0d0d14", color: stylePreset === k ? v.headerFg : "#606070", border: `1px solid ${stylePreset === k ? v.headerBg : "#1e1e2e"}` }}>{v.name}</button>)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8 }}>
                    <div><div style={{ fontSize: 9, color: "#404050", marginBottom: 2 }}>Header BG</div><input type="color" value={customStyle.headerBg} onChange={e => setCustomStyle(p => ({ ...p, headerBg: e.target.value }))} style={{ width: 32, height: 20, border: "none", cursor: "pointer", padding: 0 }} /></div>
                    <div><div style={{ fontSize: 9, color: "#404050", marginBottom: 2 }}>Header FG</div><input type="color" value={customStyle.headerFg} onChange={e => setCustomStyle(p => ({ ...p, headerFg: e.target.value }))} style={{ width: 32, height: 20, border: "none", cursor: "pointer", padding: 0 }} /></div>
                    <div><div style={{ fontSize: 9, color: "#404050", marginBottom: 2 }}>Font</div><select value={customStyle.fontFamily?.split(",")[0]?.replace(/'/g, "") || "Calibri"} onChange={e => setCustomStyle(p => ({ ...p, fontFamily: `${e.target.value}, sans-serif` }))} style={{ width: "100%", padding: "2px 4px", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 3, color: "#808090", fontSize: 9, outline: "none" }}>{["Calibri", "Arial", "Helvetica", "Georgia", "Segoe UI", "Verdana"].map(f => <option key={f}>{f}</option>)}</select></div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                    {(exportFormat !== "csv") && <><label style={{ fontSize: 10, color: "#606070", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><input type="checkbox" checked={customStyle.showTitle} onChange={e => setCustomStyle(p => ({ ...p, showTitle: e.target.checked }))} />Title</label>
                      <label style={{ fontSize: 10, color: "#606070", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><input type="checkbox" checked={customStyle.showFooter} onChange={e => setCustomStyle(p => ({ ...p, showFooter: e.target.checked }))} />Footer</label></>}
                    {exportFormat === "xlsx" && <label style={{ fontSize: 10, color: "#606070", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><input type="checkbox" checked={customStyle.autoFilter} onChange={e => setCustomStyle(p => ({ ...p, autoFilter: e.target.checked }))} />Auto-filter</label>}
                    {exportFormat === "word" && <label style={{ fontSize: 10, color: "#606070", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><input type="checkbox" checked={customStyle.orientation === "landscape"} onChange={e => setCustomStyle(p => ({ ...p, orientation: e.target.checked ? "landscape" : "portrait" }))} />Landscape</label>}
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#808090" }}>Columns ({columns.length})</div>
                    <div style={{ display: "flex", gap: 4 }}><button onClick={autoPopulateCols} style={{ ...S.btn, fontSize: 9, color: "#60d394", borderColor: "#2d4a2d" }}>↻ Auto from selection</button><button onClick={() => setColumns([])} style={{ ...S.btn, fontSize: 9 }}>Clear</button></div>
                  </div>
                  {columns.length === 0 ? <div style={{ padding: 16, textAlign: "center", color: "#404050", fontSize: 10, background: "#0d0d14", borderRadius: 5, border: "1px dashed #1e1e2e" }}>Select fields → "Auto from selection" to populate columns</div>
                    : <div style={{ border: "1px solid #1e1e2e", borderRadius: 5, overflow: "hidden" }}>
                      {columns.map((c, i) => <ColRow key={c.id + i} col={c} index={i} total={columns.length} onUpdate={(i, c) => setColumns(p => { const n = [...p]; n[i] = c; return n; })} onRemove={i => setColumns(p => p.filter((_, j) => j !== i))} onMove={(f, t) => setColumns(p => { const n = [...p]; const it = n.splice(f, 1)[0]; n.splice(t, 0, it); return n; })} />)}
                    </div>}
                </div>
                {columns.length > 0 && <div><div style={{ fontSize: 10, fontWeight: 600, color: "#808090", marginBottom: 6 }}>Preview</div><PreviewTable columns={columns} style={customStyle} /></div>}
              </div>
            )}

            {/* ═══ PACKAGE TAB ═══ */}
            {rightTab === "package" && (
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0f0", marginBottom: 2 }}>Report Package</div>
                <div style={{ fontSize: 11, color: "#606070", lineHeight: 1.5 }}>
                  Configure the report metadata, then download all three files as a package for import into WHATS'ON.
                </div>

                {/* Report metadata */}
                <div style={{ background: "#0d0d16", borderRadius: 6, padding: 12, border: "1px solid #1a1a2e" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#60d394", marginBottom: 10 }}>Report Identity</div>
                  <Field label="Report Name" value={reportMeta.name} onChange={v => { setReportMeta(p => ({ ...p, name: v })); setExportTitle(v); }} placeholder="e.g. Daily Schedule Overview" />
                  <Field label="Description" type="textarea" value={reportMeta.description} onChange={v => setReportMeta(p => ({ ...p, description: v }))} placeholder="What this report is used for..." />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Field label="Version" value={reportMeta.version} onChange={v => setReportMeta(p => ({ ...p, version: v }))} />
                    <Field label="Author" value={reportMeta.author} onChange={v => setReportMeta(p => ({ ...p, author: v }))} placeholder="Your name" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Field label="Category" value={reportMeta.category} onChange={v => setReportMeta(p => ({ ...p, category: v }))} placeholder="e.g. Schedule, Rights, EPG" />
                    <Field label="Tags" desc="comma-separated" value={reportMeta.tags.join(", ")} onChange={v => setReportMeta(p => ({ ...p, tags: v.split(",").map(t => t.trim()).filter(Boolean) }))} />
                  </div>
                </div>

                {/* Execution settings */}
                <div style={{ background: "#0d0d16", borderRadius: 6, padding: 12, border: "1px solid #1a1a2e" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6e8fcf", marginBottom: 10 }}>Execution &amp; Distribution</div>
                  <label style={{ fontSize: 10, color: "#808090", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 8 }}>
                    <input type="checkbox" checked={reportMeta.scheduleEnabled} onChange={e => setReportMeta(p => ({ ...p, scheduleEnabled: e.target.checked }))} />
                    Enable scheduled execution
                  </label>
                  {reportMeta.scheduleEnabled && (
                    <div style={{ marginLeft: 20, marginBottom: 8 }}>
                      <Field label="Cron Expression" value={reportMeta.scheduleCron} onChange={v => setReportMeta(p => ({ ...p, scheduleCron: v }))} placeholder="0 6 * * * (daily at 6 AM)" />
                      <Field label="Schedule Description" value={reportMeta.scheduleDescription} onChange={v => setReportMeta(p => ({ ...p, scheduleDescription: v }))} placeholder="e.g. Daily at 06:00 UTC" />
                    </div>
                  )}
                  <Field label="Output Path" desc="leave blank for default" value={reportMeta.outputPath} onChange={v => setReportMeta(p => ({ ...p, outputPath: v }))} placeholder="/exports/reports/" />
                  <Field label="Email Recipients" desc="optional auto-delivery" value={reportMeta.emailRecipients} onChange={v => setReportMeta(p => ({ ...p, emailRecipients: v }))} placeholder="scheduling@broadcaster.tv" />
                  <label style={{ fontSize: 10, color: "#808090", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={reportMeta.overwrite} onChange={e => setReportMeta(p => ({ ...p, overwrite: e.target.checked }))} />
                    Overwrite existing files
                  </label>
                </div>

                {/* Package files & download */}
                <div style={{ background: "#0d0d16", borderRadius: 6, padding: 12, border: "1px solid #1a1a2e" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#f0c35e", marginBottom: 10 }}>Package Contents</div>

                  {[
                    { name: `${slug}-report.xml`, type: "Report Definition", desc: "Metadata, columns, style, schedule", content: reportDefXML, icon: "📋", ready: true },
                    { name: `${slug}-filter.xml`, type: "XML Filter", desc: `${selN} of ${totalN} fields selected (${redPct}% reduction)`, content: filterXML, icon: "🔍", ready: selN > 0 },
                    { name: `${slug}-transform.xslt`, type: "XSLT Transformation", desc: `${fmtMeta[exportFormat]?.label} output with ${columns.length} columns`, content: xsltOutput, icon: fmtMeta[exportFormat]?.icon || "📄", ready: columns.length > 0 },
                  ].map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 2 ? "1px solid #14141e" : "none" }}>
                      <span style={{ fontSize: 18 }}>{f.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: f.ready ? "#c0c0d0" : "#404050", fontFamily: S.mono }}>{f.name}</div>
                        <div style={{ fontSize: 10, color: f.ready ? "#606070" : "#303040" }}>{f.type} — {f.desc}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setRightTab(i === 0 ? "reportdef" : i === 1 ? "filter" : "xslt")} style={{ ...S.btn, fontSize: 9 }}>View</button>
                        <button onClick={() => downloadFile(f.content, f.name)} disabled={!f.ready}
                          style={{ ...S.btn, fontSize: 9, opacity: f.ready ? 1 : .3, color: f.ready ? "#60d394" : "#404050", borderColor: f.ready ? "#2d4a2d" : "#1e1e2e" }}>Download</button>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={downloadAll} disabled={!isReady}
                      style={{ padding: "10px 24px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: isReady ? "pointer" : "default",
                        background: isReady ? "linear-gradient(135deg, #60d394, #4ab87a)" : "#1a1a2e",
                        color: isReady ? "#0a0a0f" : "#404050", border: "none", boxShadow: isReady ? "0 2px 12px rgba(96,211,148,.3)" : "none",
                        transition: "all .2s" }}>
                      Download All 3 Files
                    </button>
                    {downloadStatus && <span style={{ fontSize: 11, color: "#60d394", fontWeight: 600 }}>{downloadStatus}</span>}
                    {!isReady && <span style={{ fontSize: 10, color: "#505060" }}>
                      {selN === 0 ? "Select fields in the schema tree first" : "Configure columns in Export Design tab"}
                    </span>}
                  </div>
                </div>

                {/* Import instructions */}
                <div style={{ background: "#0d0d16", borderRadius: 6, padding: 12, border: "1px solid #1a1a2e" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#60d394", marginBottom: 6 }}>Import into WHATS'ON</div>
                  <div style={{ fontSize: 10, color: "#808090", lineHeight: 1.7 }}>
                    <strong style={{ color: "#c0c0d0" }}>1.</strong> Place all three files in the same directory accessible to your WHATS'ON instance.<br />
                    <strong style={{ color: "#c0c0d0" }}>2.</strong> In WHATS'ON, navigate to the export/report configuration module.<br />
                    <strong style={{ color: "#c0c0d0" }}>3.</strong> Import the <code style={S.code}>{slug}-report.xml</code> — this is the master file that references the filter and XSLT.<br />
                    <strong style={{ color: "#c0c0d0" }}>4.</strong> The system reads the filter definition to know which XML elements to extract, and the XSLT to know how to format the output.<br />
                    <strong style={{ color: "#c0c0d0" }}>5.</strong> If scheduled execution is configured, the report runs automatically at the specified cron interval.<br /><br />
                    <em style={{ color: "#606070" }}>
                      Note: The report definition XML uses a proposed namespace <code style={S.code}>urn:mediagenix:whatson:report-definition:v1</code>.
                      For production integration, adapt the schema to match your WHATS'ON import format.
                      The file names in the PackageContents section must match the actual filenames.
                    </em>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ XSLT ═══ */}
            {rightTab === "xslt" && (
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #14141e", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "#808090" }}>{fmtMeta[exportFormat]?.icon} XSLT for <strong style={{ color: "#c0c0d0" }}>{fmtMeta[exportFormat]?.label}</strong></div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => navigator.clipboard?.writeText(xsltOutput)} style={{ ...S.btn, padding: "4px 10px" }}>Copy</button>
                    <button onClick={() => downloadFile(xsltOutput, `${slug}-transform.xslt`)} style={{ ...S.btn, padding: "4px 10px", color: "#60d394", borderColor: "#2d4a2d" }}>Download</button>
                  </div>
                </div>
                <pre style={{ flex: 1, padding: "12px 14px", margin: 0, fontFamily: S.mono, fontSize: 10, lineHeight: 1.7, color: "#a0a0b0", whiteSpace: "pre-wrap", wordBreak: "break-word", overflow: "auto" }}>{xsltOutput}</pre>
              </div>
            )}

            {/* ═══ FILTER ═══ */}
            {rightTab === "filter" && (
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #14141e", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "#808090" }}>🔍 Filter Definition — {selN} fields</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => navigator.clipboard?.writeText(filterXML)} style={{ ...S.btn, padding: "4px 10px" }}>Copy</button>
                    <button onClick={() => downloadFile(filterXML, `${slug}-filter.xml`)} style={{ ...S.btn, padding: "4px 10px", color: "#60d394", borderColor: "#2d4a2d" }}>Download</button>
                  </div>
                </div>
                <pre style={{ flex: 1, padding: "12px 14px", margin: 0, fontFamily: S.mono, fontSize: 10, lineHeight: 1.7, color: "#a0a0b0", whiteSpace: "pre-wrap", wordBreak: "break-word", overflow: "auto" }}>{filterXML}</pre>
              </div>
            )}

            {/* ═══ REPORT DEF ═══ */}
            {rightTab === "reportdef" && (
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #14141e", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "#808090" }}>📋 Report Definition</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => navigator.clipboard?.writeText(reportDefXML)} style={{ ...S.btn, padding: "4px 10px" }}>Copy</button>
                    <button onClick={() => downloadFile(reportDefXML, `${slug}-report.xml`)} style={{ ...S.btn, padding: "4px 10px", color: "#60d394", borderColor: "#2d4a2d" }}>Download</button>
                  </div>
                </div>
                <pre style={{ flex: 1, padding: "12px 14px", margin: 0, fontFamily: S.mono, fontSize: 10, lineHeight: 1.7, color: "#a0a0b0", whiteSpace: "pre-wrap", wordBreak: "break-word", overflow: "auto" }}>{reportDefXML}</pre>
              </div>
            )}

            {/* ═══ GUIDE ═══ */}
            {rightTab === "guide" && (
              <div style={{ padding: 14, fontSize: 11, lineHeight: 1.7, color: "#808090" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0f0", marginBottom: 10 }}>Complete Workflow</div>
                {[
                  { title: "1. Load Schema", color: "#60d394", text: "Export the XSD from your WHATS'ON export template configuration. Upload or paste it here. No XSD? Use trang to infer one from a sample XML export." },
                  { title: "2. Select Fields", color: "#60d394", text: "Expand progressively. Check only what you need. Watch the reduction meter — aim for 50%+. Repeating elements (0..∞) are where payload explodes." },
                  { title: "3. Design Export", color: "#60d394", text: "Choose output format, set row source, auto-populate columns, then customize headers, formats, ordering, and style." },
                  { title: "4. Configure Package", color: "#6e8fcf", text: "Switch to Package tab. Set report name, description, version, author, category. Optionally configure scheduled execution and email delivery." },
                  { title: "5. Download & Import", color: "#f0c35e", text: "Download all 3 files (report definition + filter + XSLT). Place them in your WHATS'ON export directory and import the report definition. The system links filter and transform automatically." },
                ].map((s, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, color: s.color, marginBottom: 3 }}>{s.title}</div>
                    <div>{s.text}</div>
                  </div>
                ))}
                <div style={{ padding: 10, borderRadius: 5, background: "#141420", border: "1px solid #1e1e2e", marginTop: 12 }}>
                  <div style={{ fontWeight: 600, color: "#f0c35e", marginBottom: 4, fontSize: 10 }}>Package File Structure</div>
                  <pre style={{ fontSize: 10, fontFamily: S.mono, color: "#808090", lineHeight: 1.6 }}>{`your-report/
├── ${slug}-report.xml      ← Master: metadata, columns, style, schedule
├── ${slug}-filter.xml      ← Data: which XML elements to extract
└── ${slug}-transform.xslt  ← Format: how to render the output`}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
