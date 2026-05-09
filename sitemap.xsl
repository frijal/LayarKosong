<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
    <xsl:template match="/">
        <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <title>XML Sitemap - Layar Kosong</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <style type="text/css">
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; background: #f4f7f6; }
                    .container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
                    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #3498db; color: white; text-align: left; padding: 12px; font-size: 14px; }
                    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
                    tr:hover { background: #fdfdfd; }
                    a { color: #3498db; text-decoration: none; font-weight: 600; }
                    .img-thumb { width: 60px; height: 45px; object-fit: cover; border-radius: 4px; background: #eee; }
                    .video-info { font-size: 11px; color: #666; margin-top: 5px; display: block; border-left: 2px solid #e74c3c; padding-left: 8px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>XML Sitemap - Layar Kosong</h1>
                    <p>Halaman ini adalah indeks konten untuk mesin pencari. Total: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URL.</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Preview</th>
                                <th>URL &amp; Deskripsi</th>
                                <th>Last Mod</th>
                            </tr>
                        </thead>
                        <tbody>
                            <xsl:for-each select="sitemap:urlset/sitemap:url">
                                <tr>
                                    <td>
                                        <xsl:if test="image:image/image:loc">
                                            <img class="img-thumb" src="{image:image/image:loc}"/>
                                        </xsl:if>
                                    </td>
                                    <td>
                                        <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                                        <xsl:if test="video:video/video:title">
                                            <span class="video-info">
                                                <strong>VIDEO: </strong> <xsl:value-of select="video:video/video:title"/>
                                            </span>
                                        </xsl:if>
                                    </td>
                                    <td><xsl:value-of select="substring(sitemap:lastmod, 0, 11)"/></td>
                                </tr>
                            </xsl:for-each>
                        </tbody>
                    </table>
                </div>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>
