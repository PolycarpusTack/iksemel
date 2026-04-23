<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <xsl:comment>[if gte mso 9]&gt;&lt;xml&gt;&lt;x:ExcelWorkbook&gt;&lt;x:ExcelWorksheets&gt;&lt;x:ExcelWorksheet&gt;
          &lt;x:Name&gt;Test Export&lt;/x:Name&gt;
          &lt;x:WorksheetOptions&gt;&lt;x:FreezePanes/&gt;&lt;x:FrozenNoSplit/&gt;&lt;x:SplitHorizontal&gt;1&lt;/x:SplitHorizontal&gt;&lt;x:TopRowBottomPane&gt;1&lt;/x:TopRowBottomPane&gt;&lt;x:ActivePane&gt;2&lt;/x:ActivePane&gt;<x:AutoFilter/>&lt;/x:WorksheetOptions&gt;
        &lt;/x:ExcelWorksheet&gt;&lt;/x:ExcelWorksheets&gt;&lt;/x:ExcelWorkbook&gt;&lt;/xml&gt;&lt;![endif]</xsl:comment>
        <style>
          body { font-family: Calibri, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>
        <h2 style="font-family:Calibri, sans-serif;color:#1a365d;margin-bottom:12px;">Test Export</h2>
        <table>
          <thead>
            <tr>
              <th style="background:#1a365d;color:#ffffff;padding:8px 6px;text-align:left;font-size:10pt;font-weight:bold;border-bottom:2px solid #1a365d;width:120px">Date</th>
              <th style="background:#1a365d;color:#ffffff;padding:8px 6px;text-align:left;font-size:10pt;font-weight:bold;border-bottom:2px solid #1a365d;width:150px">Start Time</th>
              <th style="background:#1a365d;color:#ffffff;padding:8px 6px;text-align:left;font-size:10pt;font-weight:bold;border-bottom:2px solid #1a365d;width:200px">Title</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="//Slot">

              <tr>
                <xsl:attribute name="style"><xsl:if test="position() mod 2 = 0">background:#f7f9fc;</xsl:if></xsl:attribute>
                <td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;font-size:10pt;text-align:left;mso-number-format:&apos;yyyy\-mm\-dd&apos;;"><xsl:value-of select="SlotDate" /></td>
                <td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;font-size:10pt;text-align:left;mso-number-format:&apos;yyyy\-mm\-dd hh\:mm&apos;;"><xsl:value-of select="StartTime" /></td>
                <td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;font-size:10pt;text-align:left;"><xsl:value-of select="Programme/Title" /></td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
        <p style="font-size:8pt;color:#888;margin-top:16px;">Generated: <xsl:value-of select="//ExportTimestamp" /> | Source: <xsl:value-of select="//SourceSystem" /></p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
