<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <xsl:comment>[if gte mso 9]&gt;&lt;xml&gt;&lt;w:WordDocument&gt;&lt;w:View&gt;Print&lt;/w:View&gt;&lt;w:Zoom&gt;100&lt;/w:Zoom&gt;&lt;/w:WordDocument&gt;&lt;/xml&gt;&lt;![endif]</xsl:comment>
        <style>
          @page {
            size: landscape;
            margin: 1in;
          }
          body {
            font-family: Calibri, sans-serif;
            font-size: 10pt;
            color: #333;
            line-height: 1.5;
          }
          h1 {
            color: #1a365d;
            font-size: 18pt;
            border-bottom: 3px solid #1a365d;
            padding-bottom: 8px;
            margin-bottom: 4px;
          }
          .subtitle {
            color: #666;
            font-size: 10pt;
            margin-bottom: 24px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 16px;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
          }
          th {
            background: #1a365d;
            color: #ffffff;
            padding: 8px 10px;
            text-align: left;
            font-weight: bold;
            font-size: 10pt;
          }
          td {
            padding: 6px 10px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 10pt;
            vertical-align: top;
          }
          tr:nth-child(even) td {
            background: #f7f9fc;
          }
          .footer {
            margin-top: 24px;
            font-size: 8pt;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        <h1>Test Export</h1>
        <div class="subtitle">
          Period: <xsl:value-of select="//DateRangeStart" />
          <xsl:text disable-output-escaping="yes"> &amp;#x2013; </xsl:text>
          <xsl:value-of select="//DateRangeEnd" />
          <xsl:text disable-output-escaping="yes"> &amp;#160;|&amp;#160; </xsl:text>
          Generated: <xsl:value-of select="//ExportTimestamp" />
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Start Time</th><th>Title</th></tr>
          </thead>
          <tbody>
            <xsl:for-each select="//Slot">

              <tr><td><xsl:value-of select="SlotDate" /></td><td><xsl:value-of select="StartTime" /></td><td><xsl:value-of select="Programme/Title" /></td></tr>
            </xsl:for-each>
          </tbody>
        </table>
        <div class="footer">
          Source: <xsl:value-of select="//SourceSystem" />
          <xsl:text disable-output-escaping="yes"> &amp;#160;|&amp;#160; </xsl:text>
          Version: <xsl:value-of select="//ExportVersion" />
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
