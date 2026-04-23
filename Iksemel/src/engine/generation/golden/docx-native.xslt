<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xfeb="urn:xfeb:document-fragment:v1"
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <xsl:output method="xml" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <xfeb:DocumentFragment xmlns:xfeb="urn:xfeb:document-fragment:v1">

      <xfeb:Title>Test Export</xfeb:Title>

      <w:tbl>
        <w:tblPr>
          <w:tblStyle w:val="TableGrid"/>
          <w:tblW w:w="0" w:type="auto"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
          </w:tblBorders>
        </w:tblPr>

        <!-- Header row -->
        <w:tr>
              <w:tc>
                <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="1a365d"/></w:tcPr>
                <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="ffffff"/></w:rPr><w:t>Date</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="1a365d"/></w:tcPr>
                <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="ffffff"/></w:rPr><w:t>Start Time</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="1a365d"/></w:tcPr>
                <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="ffffff"/></w:rPr><w:t>Title</w:t></w:r></w:p>
              </w:tc>
        </w:tr>

        <!-- Data rows -->
        <xsl:for-each select="//Slot">
          <w:tr>
            <w:tc>
              <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:t><xsl:value-of select="SlotDate" /></w:t></w:r></w:p>
            </w:tc>
            <w:tc>
              <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:t><xsl:value-of select="StartTime" /></w:t></w:r></w:p>
            </w:tc>
            <w:tc>
              <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:t><xsl:value-of select="Programme/Title" /></w:t></w:r></w:p>
            </w:tc>
          </w:tr>
        </xsl:for-each>
      </w:tbl>

    </xfeb:DocumentFragment>
  </xsl:template>
</xsl:stylesheet>
