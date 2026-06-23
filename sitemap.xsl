<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                exclude-result-prefixes="sitemap">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  
  <xsl:template match="/">
    <html lang="id">
    <head>
      <title>Sitemap - Layar Kosong</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #333; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
        h1 { color: #111; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; font-size: 1.8rem; }
        p.meta { color: #666; font-size: 0.9rem; margin-top: -0.5rem; margin-bottom: 1.5rem; }
        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 1rem; }
        th, td { padding: 0.75rem; border-bottom: 1px solid #eee; font-size: 0.9rem; }
        th { background: #f9f9f9; font-weight: 600; color: #444; }
        tr:hover td { background: #fafafa; }
        a { color: #0066cc; text-decoration: none; word-break: break-all; }
        a:hover { text-decoration: underline; }
        .count { background: #eef; color: #33a; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
      </style>
    </head>
    <body>
      
      <xsl:if test="sitemap:sitemapindex">
        <h1>Sitemap Index Utama</h1>
        <p class="meta">Daftar indeks sitemap Layar Kosong berdasarkan pengelompokan kategori.</p>
        <table>
          <thead>
            <tr>
              <th>URL Berkas Sitemap</th>
              <th>Terakhir Diperbarui (UTC)</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
              <tr>
                <td>
                  <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                </td>
                <td><xsl:value-of select="sitemap:lastmod"/></td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </xsl:if>
      
      <xsl:if test="sitemap:urlset">
        <h1>Sitemap Kategori</h1>
        <p class="meta">
          Total URL dalam sitemap ini: <span class="count"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></span>
        </p>
        <table>
          <thead>
            <tr>
              <th>Alamat URL Artikel</th>
              <th>Terakhir Diubah (UTC)</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="sitemap:urlset/sitemap:url">
              <tr>
                <td>
                  <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                </td>
                <td><xsl:value-of select="sitemap:lastmod"/></td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </xsl:if>
      
    </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
