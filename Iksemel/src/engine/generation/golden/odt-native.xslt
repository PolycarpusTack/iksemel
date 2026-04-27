<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xfeb="urn:xfeb:odf-fragment:v1"
    xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
    xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
    xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0">
  <xsl:output method="xml" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <xfeb:OdfFragment xmlns:xfeb="urn:xfeb:odf-fragment:v1">

      <xfeb:Title>Test Export</xfeb:Title>

      <text:p text:style-name="Heading_20_1">Test Export</text:p>

      <table:table table:name="Test Export" table:style-name="TableGrid">
          <table:table-column/>
          <table:table-column/>
          <table:table-column/>
        <!-- Header row -->
        <table:table-row>
              <table:table-cell table:style-name="header"><text:p text:style-name="Table_20_Heading">Date</text:p></table:table-cell>
              <table:table-cell table:style-name="header"><text:p text:style-name="Table_20_Heading">Start Time</text:p></table:table-cell>
              <table:table-cell table:style-name="header"><text:p text:style-name="Table_20_Heading">Title</text:p></table:table-cell>
        </table:table-row>
        <!-- Data rows -->
        <xsl:for-each select="//Slot">

          <table:table-row>
            <table:table-cell><text:p text:style-name="Table_20_Contents"><xsl:value-of select="SlotDate" /></text:p></table:table-cell>
            <table:table-cell><text:p text:style-name="Table_20_Contents"><xsl:value-of select="StartTime" /></text:p></table:table-cell>
            <table:table-cell><text:p text:style-name="Table_20_Contents"><xsl:value-of select="Programme/Title" /></text:p></table:table-cell>
          </table:table-row>
        </xsl:for-each>
      </table:table>

    </xfeb:OdfFragment>
  </xsl:template>
</xsl:stylesheet>
