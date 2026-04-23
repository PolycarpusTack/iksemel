<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="text" encoding="UTF-8" />
  <xsl:strip-space elements="*" />

  <!--
    RFC 4180 CSV field escaping template.
    Fields containing double quotes, the delimiter, or newlines are enclosed
    in double quotes. Internal double quotes are doubled per RFC 4180 Section 2.
  -->

  <!-- Named template: double all double-quote characters in a string -->
  <xsl:template name="double-quotes">
    <xsl:param name="text" />
    <xsl:choose>
      <xsl:when test="contains($text, '&quot;')">
        <xsl:value-of select="substring-before($text, '&quot;')" />
        <xsl:text>&quot;&quot;</xsl:text>
        <xsl:call-template name="double-quotes">
          <xsl:with-param name="text" select="substring-after($text, '&quot;')" />
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$text" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!--
    Named template: escape a CSV field per RFC 4180.
    If the value contains a double quote, the delimiter character, or a newline,
    wrap the entire field in double quotes and double any internal quotes.
  -->
  <xsl:template name="escape-csv-field">
    <xsl:param name="value" />
    <xsl:choose>
      <xsl:when test="contains($value, '&quot;') or contains($value, ',') or contains($value, '&#10;') or contains($value, '&#13;')">
        <xsl:text>&quot;</xsl:text>
        <xsl:call-template name="double-quotes">
          <xsl:with-param name="text" select="$value" />
        </xsl:call-template>
        <xsl:text>&quot;</xsl:text>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$value" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="/">
    <!-- Header row -->
    <xsl:text>&quot;Date&quot;,&quot;Start Time&quot;,&quot;Title&quot;&#13;&#10;</xsl:text>

    <!-- Data rows -->
    <xsl:for-each select="//Slot">

      <xsl:call-template name="escape-csv-field">
        <xsl:with-param name="value" select="SlotDate" />
      </xsl:call-template>
      <xsl:text>,</xsl:text>
      <xsl:call-template name="escape-csv-field">
        <xsl:with-param name="value" select="StartTime" />
      </xsl:call-template>
      <xsl:text>,</xsl:text>
      <xsl:call-template name="escape-csv-field">
        <xsl:with-param name="value" select="Programme/Title" />
      </xsl:call-template>
      <xsl:text>&#13;&#10;</xsl:text>
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>
