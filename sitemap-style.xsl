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
        <meta http-equiv='Content-Type' content='text/html; charset=utf-8'/>
        <style type='text/css'>
            body { font: 14px 'Open Sans', Helvetica, Arial, sans-serif; margin: 0; background-color: #fff; }
            a { color: #3498db; text-decoration: none; }
            h1 { margin: 0; }
            #description { background-color: #f0f2eb; color: #000; padding: 30px 30px 20px; }
            #description a { color: #008710; }
            #content { padding: 10px 30px 30px; }
            a:hover { border-bottom: 1px solid; }
            table { width: 100%; border-collapse: collapse; }
            th, td { font-size: 12px; padding: 10px 15px; text-align: left; border-bottom: 1px solid #eee; }
            th { border-bottom: 2px solid #ccc; }
            tr.odd { background: #f9f9f9; }
            #footer { margin: 20px 30px; font-size: 12px; color: #999; }
            img.sitemap-thumb { max-height: 60px; max-width: 100px; border: 1px solid #ddd; border-radius: 4px; display: block; margin: 5px 0; }
            .sitemap-entry { display: flex; align-items: center; gap: 15px; margin-bottom: 5px; }
            .video-info { max-width: 300px; }
        </style>
    </head>
    <body>
        <div id='description'>
            <h1>Peta Situs XML <xsl:value-of select="local-name(/*)"/></h1>
            <p>Ini adalah Peta Situs XML yang dibuat oleh <a href="https://dalam.web.id/">Layar Kosong</a> untuk mesin pencari.</p>
        </div>
        <div id='content'>
            <table>
                <xsl:if test="sitemap:sitemapindex">
                    <tr>
                        <th>#</th>
                        <th>URL Peta Situs</th>
                        <th>Terakhir Diubah</th>
                    </tr>
                    <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                        <tr>
                            <xsl:if test="position() mod 2 = 0">
                                <xsl:attribute name="class">odd</xsl:attribute>
                            </xsl:if>
                            <td><xsl:value-of select="position()"/></td>
                            <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                            <td><xsl:value-of select="sitemap:lastmod"/></td>
                        </tr>
                    </xsl:for-each>
                </xsl:if>

                <xsl:if test="sitemap:urlset">
                    <tr>
                        <th>#</th>
                        <th>Media</th>
                        <th>URL Artikel</th>
                        <th>Terakhir Diubah</th>
                    </tr>
                    <xsl:for-each select="sitemap:urlset/sitemap:url">
                        <tr>
                            <xsl:if test="position() mod 2 = 0">
                                <xsl:attribute name="class">odd</xsl:attribute>
                            </xsl:if>
                            <td><xsl:value-of select="position()"/></td>
                            <td>
                                <xsl:for-each select="image:image">
                                    <img class="sitemap-thumb" src="{image:loc}" alt="Image" />
                                </xsl:for-each>

                                <xsl:for-each select="video:video">
                                    <div class="sitemap-entry">
                                        <img class="sitemap-thumb" src="{video:thumbnail_loc}" />
                                        <div class="video-info">
                                            <strong><xsl:value-of select="video:title"/></strong>
                                        </div>
                                    </div>
                                </xsl:for-each>
                            </td>
                            <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                            <td><xsl:value-of select="sitemap:lastmod"/></td>
                        </tr>
                    </xsl:for-each>
                </xsl:if>
            </table>
        </div>
        <div id='footer'>
            <p>Dibuat secara otomatis oleh <a href="https://dalam.web.id">Layar Kosong</a></p>
        </div>
    </body>
    </html>
</xsl:template>
</xsl:stylesheet>
