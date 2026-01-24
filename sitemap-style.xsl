<?xml version='1.0' encoding='UTF-8'?>
<xsl:stylesheet version='1.0'
    xmlns:html='http://www.w3.org/TR/REC-html40'
    xmlns:sitemap='http://www.sitemaps.org/schemas/sitemap/0.9'
    xmlns:image='http://www.google.com/schemas/sitemap-image/1.1'
    xmlns:video='http://www.google.com/schemas/sitemap-video/1.1'
    xmlns:xsl='http://www.w3.org/1999/XSL/Transform'>
<xsl:output method='html' version='1.0' encoding='UTF-8' indent='yes'/>

<xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <title>Peta Situs XML</title>
        <style type='text/css'>
            body { font: 14px 'Open Sans', Helvetica, Arial, sans-serif; margin: 0; }
            a { color: #3498db; text-decoration: none; }
            #description { background-color: #f0f2eb; padding: 30px; }
            #content { padding: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { font-size: 12px; padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            .odd { background-color: #f9f9f9; }
            img.sitemap-thumb { max-height: 60px; border: 1px solid #eee; }
        </style>
    </head>
    <body>
        <div id='description'>
            <h1>Peta Situs XML</h1>
            <p>Dibuat oleh <a href="https://dalam.web.id/">Layar Kosong</a> untuk mesin pencari.</p>
        </div>
        <div id='content'>
            <table>
                <xsl:if test="sitemap:sitemapindex">
                    <tr><th>#</th><th>URL Peta Situs</th><th>Last Modified</th></tr>
                    <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                        <tr>
                            <xsl:if test="position() mod 2 = 0"><xsl:attribute name="class">odd</xsl:attribute></xsl:if>
                            <td><xsl:value-of select="position()"/></td>
                            <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                            <td><xsl:value-of select="sitemap:lastmod"/></td>
                        </tr>
                    </xsl:for-each>
                </xsl:if>

                <xsl:if test="sitemap:urlset">
                    <tr><th>#</th><th>Media</th><th>URL Artikel</th><th>Last Modified</th></tr>
                    <xsl:for-each select="sitemap:urlset/sitemap:url">
                        <tr>
                            <xsl:if test="position() mod 2 = 0"><xsl:attribute name="class">odd</xsl:attribute></xsl:if>
                            <td><xsl:value-of select="position()"/></td>
                            <td>
                                <xsl:for-each select="image:image">
                                    <img class="sitemap-thumb" src="{image:loc}" />
                                </xsl:for-each>
                                <xsl:for-each select="video:video">
                                    <img class="sitemap-thumb" src="{video:thumbnail_loc}" title="Video" />
                                </xsl:for-each>
                            </td>
                            <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                            <td><xsl:value-of select="sitemap:lastmod"/></td>
                        </tr>
                    </xsl:for-each>
                </xsl:if>
            </table>
        </div>
    </body>
    </html>
</xsl:template>
</xsl:stylesheet>
