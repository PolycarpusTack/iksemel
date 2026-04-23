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

      <table:table table:name="Test Export">
          <table:table-column table:style-name="co1"/>
          <table:table-column table:style-name="co1"/>
          <table:table-column table:style-name="co1"/>
        <!-- Header row -->
        <table:table-row table:style-name="ro1">
              <table:table-cell table:style-name="header" office:value-type="string"><text:p>Date</text:p></table:table-cell>
              <table:table-cell table:style-name="header" office:value-type="string"><text:p>Start Time</text:p></table:table-cell>
              <table:table-cell table:style-name="header" office:value-type="string"><text:p>Title</text:p></table:table-cell>
        </table:table-row>
        <!-- Data rows -->
        <xsl:for-each select="//Slot">
          <table:table-row>
            <table:table-cell office:value-type="string"><text:p><xsl:value-of select="SlotDate" /></text:p></table:table-cell>
            <table:table-cell office:value-type="string"><text:p><xsl:value-of select="StartTime" /></text:p></table:table-cell>
            <table:table-cell office:value-type="string"><text:p><xsl:value-of select="Programme/Title" /></text:p></table:table-cell>
          </table:table-row>
        </xsl:for-each>
      </table:table>

    </xfeb:OdfFragment>
  </xsl:template>
</xsl:stylesheet>
