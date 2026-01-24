<?xml version='1.0' encoding='UTF-8'?>
<xsl:stylesheet version='2.0'
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
            body { font: 14px 'Open Sans', Helvetica, Arial, sans-serif; margin: 0; }
            a { color: #3498db; text-decoration: none; }
            h1 { margin: 0; }
            #description { background-color: #f0f2eb; color: #000; padding: 30px 30px 20px; }
            #description a { color: #008710; }
            #content { padding: 10px 30px 30px; background: #fff; }
            a:hover { border-bottom: 1px solid; }
            th, td { font-size: 12px; padding: 10px 15px; text-align: left; }
            th { border-bottom: 1px solid #ccc; }
            .odd { background: linear-gradient( 159.87deg, #f6f6f4 7.24%, #f7f4ea 64.73%, #ddedd5 116.53% ); }
            #footer { margin: 20px 30px; font-size: 12px; color: #999; }
            #footer a { color: inherit; border-bottom: 1px solid; }
            #description a:hover, #footer a:hover { border-bottom: none; }
            img.sitemap-thumb { max-height: 100px; max-width: 100px; border: 1px solid #eee; display: block; margin: 0 auto; }
            .sitemap-entry { display: flex; align-items: center; gap: 15px; }
            .sitemap-entry div { flex-grow: 1; }
            .video-info { max-width: 250px; } /* Untuk membatasi lebar kolom video */
        </style>
    </head>
    <body>
        <div id='description'>
            <h1>Peta Situs XML <xsl:value-of select="local-name(.)"/></h1>
            <p>Ini adalah Peta Situs XML yang dibuat oleh <a href="https://dalam.web.id/">Layar Kosong</a>, ditujukan untuk diindeks oleh mesin pencari seperti <a href="https://www.google.com/">Google</a> atau <a href="https://www.bing.com/">Bing</a>.</p>
            <p>Anda dapat mencari lebih banyak informasi tentang peta situs XML di <a href="https://sitemaps.org">sitemaps.org</a></p>
        </div>
        <div id='content'>
            <table>
                <xsl:if test='sitemap:sitemapindex/sitemap:sitemap'>
                    <tr>
                        <th>#</th>
                        <th>URL Peta Situs</th>
                        <th>Terakhir Diubah</th>
                    </tr>
                    <xsl:for-each select='sitemap:sitemapindex/sitemap:sitemap'>
                        <tr class="{ (position() mod 2 = 1) ? '' : 'odd' }">
                            <td><xsl:value-of select = "position()" /></td>
                            <td>
                                <xsl:variable name='itemURL'><xsl:value-of select='sitemap:loc'/></xsl:variable>
                                <a href='{$itemURL}'><xsl:value-of select='sitemap:loc'/></a>
                            </td>
                            <td><xsl:value-of select='sitemap:lastmod'/></td>
                        </tr>
                    </xsl:for-each>
                </xsl:if>

                <xsl:if test='sitemap:urlset/sitemap:url'>
                    <tr>
                        <th>#</th>
                        <th>Gambar</th>
                        <th>Video</th>
                        <th>URL Artikel</th>
                        <th>Terakhir Diubah</th>
                    </tr>
                    <xsl:for-each select='sitemap:urlset/sitemap:url'>
                        <tr class="{ (position() mod 2 = 1) ? '' : 'odd' }">
                            <td><xsl:value-of select = "position()" /></td>
                            <td>
                                <xsl:for-each select="image:image">
                                    <img class="sitemap-thumb" src="{image:loc}" alt="Gambar Artikel" />
                                </xsl:for-each>
                            </td>
                            <td>
                                <xsl:for-each select="video:video">
                                    <div class="sitemap-entry">
                                        <img class="sitemap-thumb" src="{video:thumbnail_loc}" alt="Thumbnail Video" />
                                        <div class="video-info">
                                            <a href="{video:player_loc}"><xsl:value-of select="video:title"/></a>
                                            <p style="font-size:10px; color:#666;"><xsl:value-of select="substring(video:description, 1, 100)"/><xsl:if test="string-length(video:description) > 100">...</xsl:if></p>
                                        </div>
                                    </div>
                                    <xsl:if test="position() &lt; last()"><hr style="border:0; border-top:1px dashed #eee; margin:10px 0;"/></xsl:if>
                                </xsl:for-each>
                            </td>
                            <td>
                                <xsl:variable name='articleURL'><xsl:value-of select='sitemap:loc'/></xsl:variable>
                                <a href='{$articleURL}'><xsl:value-of select='sitemap:loc'/></a>
                            </td>
                            <td><xsl:value-of select='sitemap:lastmod'/></td>
                        </tr>
                    </xsl:for-each>
                </xsl:if>

                <xsl:if test="rss/channel">
                    <tr><th>#</th><th>Judul RSS</th><th>Link</th><th>Publikasi</th></tr>
                    <xsl:for-each select="rss/channel/item">
                        <tr class="{ (position() mod 2 = 1) ? '' : 'odd' }">
                            <td><xsl:value-of select="position()"/></td>
                            <td><xsl:value-of select="title"/></td>
                            <td><a href="{link}"><xsl:value-of select="link"/></a></td>
                            <td><xsl:value-of select="pubDate"/></td>
                        </tr>
                    </xsl:for-each>
                </xsl:if>

            </table>
        </div>
        <div id='footer'>
            <p>Dibuat secara otomatis oleh generator <a href="https://dalam.web.id">Layar Kosong</a></p>
        </div>
    </body>
    </html>
</xsl:template>
</xsl:stylesheet>
