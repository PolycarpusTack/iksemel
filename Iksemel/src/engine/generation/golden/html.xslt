<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Test Export</title>
        <style>
          /* Reset and base */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Calibri, sans-serif;
            background: #f5f5f7;
            color: #333;
            padding: 32px;
          }

          /* Responsive container */
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 4px rgba(0,0,0,.08);
            overflow: hidden;
          }

          /* Header section */
          .header {
            background: #1a365d;
            color: #ffffff;
            padding: 24px 32px;
          }
          .header h1 {
            font-size: 20px;
            font-weight: 600;
          }
          .header .meta {
            font-size: 12px;
            opacity: .8;
            margin-top: 4px;
          }

          /* Table layout */
          .table-wrap {
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }

          /* Sticky headers */
          th {
            background: #f8f8fa;
            padding: 10px 16px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: .04em;
            border-bottom: 2px solid #e8e8ec;
            position: sticky;
            top: 0;
            z-index: 1;
          }

          /* Data cells */
          td {
            padding: 10px 16px;
            border-bottom: 1px solid #f0f0f2;
            font-size: 13px;
          }

          /* Hover effect */
          tr:hover td {
            background: #f8f9ff;
          }

          /* Alternating rows */
          tbody tr:nth-child(even) td {
            background: #f7f9fc;
          }
          tbody tr:nth-child(even):hover td {
            background: #f0f1ff;
          }

          /* Group rows */
          .group-row td {
            background: #e8edf5;
            font-weight: 600;
            color: #1a365d;
            border-bottom: 2px solid #1a365d20;
            padding: 12px 16px;
          }

          /* Footer */
          .footer {
            padding: 16px 32px;
            font-size: 11px;
            color: #999;
            border-top: 1px solid #eee;
          }

          /* Print stylesheet */
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .container {
              box-shadow: none;
              border-radius: 0;
              max-width: none;
            }
            th {
              position: static;
              background: #1a365d !important;
              color: #ffffff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            tr {
              page-break-inside: avoid;
            }
            .footer {
              page-break-before: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
        <div class="header"><h1>Test Export</h1><div class="meta"><xsl:value-of select="//DateRangeStart" /> &#x2013; <xsl:value-of select="//DateRangeEnd" /> &#160;|&#160; <xsl:value-of select="//SourceSystem" /></div></div>
          <div class="table-wrap">
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
          </div>
        <div class="footer">Generated: <xsl:value-of select="//ExportTimestamp" /></div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
