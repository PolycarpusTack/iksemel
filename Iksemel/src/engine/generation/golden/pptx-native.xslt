<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xfeb="urn:xfeb:slide-fragment:v1"
    xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <xsl:output method="xml" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <xfeb:SlideFragment xmlns:xfeb="urn:xfeb:slide-fragment:v1">

      <xfeb:Title>Test Export</xfeb:Title>

      <a:tbl>
        <a:tblPr firstRow="1" bandRow="1">
          <a:tableStyleId>{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}</a:tableStyleId>
        </a:tblPr>
        <a:tblGrid>
              <a:gridCol w="1143000"/>
              <a:gridCol w="1428750"/>
              <a:gridCol w="1905000"/>
        </a:tblGrid>

        <!-- Header row -->
        <a:tr h="370840">
          <a:tc>
            <a:txBody>
              <a:bodyPr/>
              <a:p><a:r><a:rPr lang="en-US" b="1" dirty="0"><a:solidFill><a:srgbClr val="ffffff"/></a:solidFill></a:rPr><a:t>Date</a:t></a:r></a:p>
            </a:txBody>
            <a:tcPr><a:solidFill><a:srgbClr val="1a365d"/></a:solidFill></a:tcPr>
          </a:tc>
          <a:tc>
            <a:txBody>
              <a:bodyPr/>
              <a:p><a:r><a:rPr lang="en-US" b="1" dirty="0"><a:solidFill><a:srgbClr val="ffffff"/></a:solidFill></a:rPr><a:t>Start Time</a:t></a:r></a:p>
            </a:txBody>
            <a:tcPr><a:solidFill><a:srgbClr val="1a365d"/></a:solidFill></a:tcPr>
          </a:tc>
          <a:tc>
            <a:txBody>
              <a:bodyPr/>
              <a:p><a:r><a:rPr lang="en-US" b="1" dirty="0"><a:solidFill><a:srgbClr val="ffffff"/></a:solidFill></a:rPr><a:t>Title</a:t></a:r></a:p>
            </a:txBody>
            <a:tcPr><a:solidFill><a:srgbClr val="1a365d"/></a:solidFill></a:tcPr>
          </a:tc>
        </a:tr>

        <!-- Data rows -->
        <xsl:for-each select="//Slot">
          <a:tr h="370840">
          <a:tc>
            <a:txBody>
              <a:bodyPr/>
              <a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t><xsl:value-of select="SlotDate" /></a:t></a:r></a:p>
            </a:txBody>
            <a:tcPr/>
          </a:tc>
          <a:tc>
            <a:txBody>
              <a:bodyPr/>
              <a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t><xsl:value-of select="StartTime" /></a:t></a:r></a:p>
            </a:txBody>
            <a:tcPr/>
          </a:tc>
          <a:tc>
            <a:txBody>
              <a:bodyPr/>
              <a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t><xsl:value-of select="Programme/Title" /></a:t></a:r></a:p>
            </a:txBody>
            <a:tcPr/>
          </a:tc>
          </a:tr>
        </xsl:for-each>
      </a:tbl>

    </xfeb:SlideFragment>
  </xsl:template>
</xsl:stylesheet>
