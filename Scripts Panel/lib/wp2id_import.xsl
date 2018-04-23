<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:aid="http://ns.adobe.com/AdobeInDesign/4.0/"
    xmlns:aid5="http://ns.adobe.com/AdobeInDesign/5.0/" version="1.0">
    <xsl:variable name="pxTransformationName">wp2id_import.xsl</xsl:variable>
    <xsl:variable name="pxVersion">2018-04-23 v1.0</xsl:variable>
    <xsl:variable name="pxCreator">Gregor Fellenz – https://www.publishingx.de/</xsl:variable>

    <!--Insert Version Info-->
    <xsl:template match="/html">
        <post xmlns:aid="http://ns.adobe.com/AdobeInDesign/4.0/"
            xmlns:aid5="http://ns.adobe.com/AdobeInDesign/5.0/">
            <xsl:attribute name="postID">
                <xsl:value-of select="head/title"/>
            </xsl:attribute>
            <xsl:copy-of select="@*"/>
            <xsl:comment>
                <xsl:text>XSL-File: </xsl:text><xsl:value-of select="$pxTransformationName"/>
                <xsl:text>; Version: </xsl:text><xsl:value-of select="$pxVersion"/>
                <xsl:text>; Contact: </xsl:text><xsl:value-of select="$pxCreator"/>                
            </xsl:comment>
            <xsl:apply-templates/>
        </post>
    </xsl:template>


    <!--Identity Template -->
    <xsl:template match="@* | node()" priority="-1">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()"/>
        </xsl:copy>
    </xsl:template>

    <!--Remove Elements-->
    <xsl:template match="script | iframe">
        <xsl:comment>
            <xsl:text>skipped element </xsl:text>
            <xsl:value-of select="name()"/>
        </xsl:comment>
    </xsl:template>

    <!-- Strip out Elements -->
    <xsl:template match="div" priority="-1">
        <xsl:apply-templates/>
    </xsl:template>

    <xsl:template match="li/p">
        <xsl:apply-templates/>
    </xsl:template>

    <!--main structure -->
    <xsl:template match="head"/>
    <xsl:template match="body">
        <xsl:apply-templates/>
    </xsl:template>

    <xsl:template match="div[@id = 'content']">
        <content>
            <xsl:apply-templates/>
        </content>
    </xsl:template>

    <xsl:template match="div[@id = 'featuredImage']">
        <featuredImage>
            <xsl:attribute name="src">
                <xsl:apply-templates/>
            </xsl:attribute>
            <!--<xsl:attribute name="ostyle">
                <xsl:text>featuredImage</xsl:text>
            </xsl:attribute>-->
        </featuredImage>
    </xsl:template>


    <!--Simple Block Elements-->
    <xsl:template match="p | title | h1 | h2 | h3 | h4 | h5 | h6 | pre | hr">
        <xsl:variable name="textContents" select="normalize-space(.)"/>

        <!--Remove empty (whitespace only elements) blocks -->
        <xsl:if test="$textContents != ''">
            <xsl:copy>
                <xsl:attribute name="aid:pstyle">
                    <xsl:choose>
                        <xsl:when test="@class">
                            <xsl:value-of select="@class"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="name()"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:attribute>

                <xsl:copy-of select="@*"/>
                <xsl:apply-templates/>
            </xsl:copy>
            <xsl:text>&#x0A;</xsl:text>
        </xsl:if>

    </xsl:template>


    <!--Flatten blockquotes-->
    <xsl:template match="blockquote/p">
        <xsl:element name="blockquote">
            <xsl:attribute name="aid:pstyle">blockquote</xsl:attribute>
            <xsl:copy-of select="@*"/>
            <xsl:apply-templates/>
        </xsl:element>
        <xsl:text>&#x0A;</xsl:text>
    </xsl:template>
    <xsl:template match="blockquote">
        <xsl:apply-templates/>
    </xsl:template>

    <!--Flatten Lists-->
    <xsl:template match="ol/li">
        <xsl:element name="ol">
            <xsl:attribute name="aid:pstyle">orderedList</xsl:attribute>
            <xsl:copy-of select="@*"/>
            <xsl:apply-templates/>
        </xsl:element>
        <xsl:text>&#x0A;</xsl:text>
    </xsl:template>
    <xsl:template match="ol">
        <xsl:apply-templates/>
    </xsl:template>

    <xsl:template match="ul/li">
        <xsl:element name="ul">
            <xsl:attribute name="aid:pstyle">unorderedList</xsl:attribute>
            <xsl:copy-of select="@*"/>
            <xsl:apply-templates/>
        </xsl:element>
        <xsl:text>&#x0A;</xsl:text>
    </xsl:template>
    <xsl:template match="ul">
        <xsl:apply-templates/>
    </xsl:template>


    <!--Inline Elements -->
    <xsl:template match="strong | em">
        <xsl:copy>
            <xsl:attribute name="aid:cstyle">
                <xsl:value-of select="name()"/>
            </xsl:attribute>
            <xsl:copy-of select="@*"/>
            <xsl:apply-templates/>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="span">
        <xsl:copy>
            <xsl:choose>
                <xsl:when test="@class">
                    <xsl:attribute name="aid:cstyle">
                        <xsl:value-of select="@class"/>
                    </xsl:attribute>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:attribute name="aid:cstyle">spanWithoutClass</xsl:attribute>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:copy-of select="@*"/>
            <xsl:apply-templates/>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="code/span | code[count(*) = 0]" priority="2">
        <xsl:copy>
            <xsl:attribute name="aid:cstyle">code</xsl:attribute>
            <xsl:copy-of select="@*"/>
            <xsl:apply-templates/>
        </xsl:copy>
    </xsl:template>
    <xsl:template match="code">
        <xsl:apply-templates/>
    </xsl:template>

    <!--Links are currently ignored -->
    <xsl:template match="a">
        <xsl:apply-templates/>
        <xsl:text>[</xsl:text>
        <xsl:value-of select="@href"/>
        <xsl:text>]</xsl:text>
    </xsl:template>

    <!--Images -->
    <xsl:template match="p[img][count(img) = count(*)] | p[a/img][count(a) = count(*)]">
        <p_img aid:pstyle="p_img">
            <xsl:apply-templates select="descendant::img"/>
        </p_img>
        <xsl:text>&#x0A;</xsl:text>
    </xsl:template>

    <xsl:template match="img">
        <img ostyle="img">
            <xsl:copy-of select="@src"/>
        </img>
    </xsl:template>

    <xsl:template match="figure">
        <p_img aid:pstyle="p_img">
            <xsl:apply-templates select="descendant::img"/>
        </p_img>
        <xsl:text>&#x0A;</xsl:text>
        <xsl:apply-templates select="descendant::figcaption"/>
    </xsl:template>

    <xsl:template match="figcaption">
        <figcaption aid:pstyle="figcaption">
            <xsl:copy-of select="@*"/>
            <xsl:apply-templates/>
        </figcaption>
        <xsl:text>&#x0A;</xsl:text>
    </xsl:template>

    <xsl:template match="video">
        <p_video aid:pstyle="p_video">
            <video ostyle="img">
                <xsl:choose>
                    <xsl:when test="@poster">
                        <xsl:attribute name="src">
                            <xsl:value-of select="@poster"/>
                        </xsl:attribute>
                    </xsl:when>
                </xsl:choose>
            </video>
        </p_video>
        <xsl:text>&#x0A;</xsl:text>
    </xsl:template>

    <!--Tables-->
    <xsl:template match="table">
        <p>Currently not supported</p>
    </xsl:template>


    <!-- Specials -->
    <!-- Worbreak zu Softhyphen -->
    <xsl:template match="wbr">
        <xsl:text>&#x00AD;</xsl:text>
    </xsl:template>

    <xsl:template match="br">
        <xsl:text>&#x2028;</xsl:text>
    </xsl:template>

    <!-- Functions http://www.dpawson.co.uk/xsl/sect2/replace.html#d8766e61 -->
    <xsl:template name="replace-string">
        <xsl:param name="text"/>
        <xsl:param name="replace"/>
        <xsl:param name="with"/>
        <xsl:choose>
            <xsl:when test="contains($text, $replace)">
                <xsl:value-of select="substring-before($text, $replace)"/>
                <xsl:value-of select="$with"/>
                <xsl:call-template name="replace-string">
                    <xsl:with-param name="text" select="substring-after($text, $replace)"/>
                    <xsl:with-param name="replace" select="$replace"/>
                    <xsl:with-param name="with" select="$with"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="$text"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

</xsl:stylesheet>
