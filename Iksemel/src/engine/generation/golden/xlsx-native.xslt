<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xfeb="urn:xfeb:spreadsheet-fragment:v1">
  <xsl:output method="xml" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <xfeb:SheetFragment xmlns:xfeb="urn:xfeb:spreadsheet-fragment:v1">

      <xfeb:Rows>
        <!-- Header row -->
        <row r="1">
          <c r="A1" t="s" s="1"><v>0</v></c>
          <c r="B1" t="s" s="1"><v>1</v></c>
          <c r="C1" t="s" s="1"><v>2</v></c>
        </row>
        <!-- Data rows -->
        <xsl:for-each select="//Slot">

          <row>
            <xsl:attribute name="r"><xsl:value-of select="position() + 1" /></xsl:attribute>
          <c r="A{{position() + 1}}" t="d" s="3"><v><xsl:value-of select="SlotDate" /></v></c>
          <c r="B{{position() + 1}}" t="d" s="3"><v><xsl:value-of select="StartTime" /></v></c>
          <c r="C{{position() + 1}}" t="inlineStr" s="2"><is><t><xsl:value-of select="Programme/Title" /></t></is></c>
          </row>
        </xsl:for-each>
      </xfeb:Rows>

      <xfeb:SharedStrings>
        <si><t>Date</t></si>
        <si><t>Start Time</t></si>
        <si><t>Title</t></si>
      </xfeb:SharedStrings>

      <xfeb:Metadata>
        <xfeb:Title>Test Export</xfeb:Title>
        <xfeb:ColumnCount>3</xfeb:ColumnCount>
        <xfeb:Author>Test</xfeb:Author>
        <xfeb:HeaderStyleIndex>1</xfeb:HeaderStyleIndex>
      </xfeb:Metadata>

    </xfeb:SheetFragment>
  </xsl:template>
</xsl:stylesheet>
