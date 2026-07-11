<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns:atom="http://www.w3.org/2005/Atom"
xmlns:content="http://purl.org/rss/1.0/modules/content/"
xmlns:media="http://search.yahoo.com/mrss/"
xmlns:dc="http://purl.org/dc/elements/1.1/"
exclude-result-prefixes="atom content media dc">
<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
<xsl:strip-space elements="*"/>
<xsl:template match="/">
<xsl:variable name="channel" select="/rss/channel"/>
<xsl:variable name="home-link" select="normalize-space($channel/link[1])"/>
<xsl:variable name="feed-updated">
    <xsl:choose>
        <xsl:when test="$channel/lastBuildDate"><xsl:value-of select="$channel/lastBuildDate[1]"/></xsl:when>
        <xsl:when test="$channel/pubDate"><xsl:value-of select="$channel/pubDate[1]"/></xsl:when>
        <xsl:otherwise><xsl:value-of select="$channel/item[1]/pubDate[1]"/></xsl:otherwise>
    </xsl:choose>
</xsl:variable>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title><xsl:value-of select="$channel/title"/> - RSS Feed</title>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<style type="text/css">
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #333; margin: 0; padding: 40px; background: #f4f7f6; }
.container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
.feed-header { border-bottom: 2px solid #e67e22; padding-bottom: 20px; margin-bottom: 20px; }

/* 🔥 UPDATE CSS H1: Menambahkan space-between */
.feed-header h1 { color: #e67e22; margin: 0 0 10px 0; display: flex; justify-content: space-between; align-items: center; }

/* CSS tambahan agar Icon RSS bawaan dan Teks tetap berdekatan (gap) */
.feed-header h1 .title-group { display: flex; align-items: center; gap: 10px; }

/* 🔥 CSS BARU: Styling untuk Logo SVG */
.header-logo { height: 1.1em; width: auto; object-fit: contain; opacity: 0.9; }
/* Wrapper link untuk logo agar bebas styling dan rapi di dalam flexbox */
.logo-link {
    display: inline-flex;
    align-items: center;
    text-decoration: none !important;
    border: none;
}
.logo-link:hover .header-logo {
    opacity: 1;
    transform: scale(1.05);
    transition: all 0.2s ease;
}
.feed-header p { margin: 0; color: #666; font-size: 15px; line-height: 1.5; }
.feed-meta { display: flex; justify-content: space-between; font-size: 13px; color: #888; margin-top: 15px; }

/* Table Style */
table { width: 100%; border-collapse: collapse; }
th { background: #e67e22; color: white; text-align: left; padding: 12px; font-size: 14px; }
td { padding: 15px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
tr:hover { background: #fdfdfd; }

/* Content Style */
.article-title { font-size: 16px; font-weight: 600; margin: 0 0 5px 0; }
.article-title a { color: #e67e22; text-decoration: none; }
.article-title a:hover { text-decoration: underline; }
.article-desc { font-size: 13px; color: #555; margin: 0 0 8px 0; line-height: 1.4; }
.badge { display: inline-block; background: #eee; color: #555; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }

/* Image ThumbnailLightbox */
.img-container { cursor: zoom-in; display: inline-block; transition: transform 0.2s; }
.img-container:hover { transform: scale(1.05); }
.img-thumb { width: 120px; height: 80px; object-fit: cover; border-radius: 6px; background: #eee; border: 1px solid #ddd; }
.lightbox-modal { display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.85); backdrop-filter: blur(4px); justify-content: center; align-items: center; }
.lightbox-content { max-width: 90%; max-height: 90vh; border-radius: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); animation: zoomModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: default; }
.close-lightbox { position: absolute; top: 20px; right: 35px; color: #fff; font-size: 40px; font-weight: bold; cursor: pointer; }
@keyframes zoomModal { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
</head>
<body>

<div id="lightbox" class="lightbox-modal" style="cursor: zoom-out;" onclick="closeLightbox(event)">
    <span class="close-lightbox">&#215;</span>
    <img id="lightbox-img" class="lightbox-content" src="" />
</div>

<div class="container">
    <div class="feed-header">
        <h1>
            <span class="title-group">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
                <xsl:value-of select="$channel/title"/>
            </span>

            <a href="/" class="logo-link" title="Kembali ke Beranda">
    <img src="/favicon.svg" alt="Layar Kosong Logo" class="header-logo" />
</a>
        </h1>
        <p>
            <xsl:choose>
                <xsl:when test="$channel/description"><xsl:value-of select="$channel/description"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="$channel/title"/></xsl:otherwise>
            </xsl:choose>
        </p>
        <div class="feed-meta">
            <span>Beranda: <a href="{$home-link}" style="color:#e67e22;"><xsl:value-of select="$home-link"/></a></span>
            <span>Update: <xsl:value-of select="$feed-updated"/></span>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 130px;">Cover</th>
                <th>Informasi Artikel</th>
                <th style="width: 140px;">Tanggal</th>
            </tr>
        </thead>
        <tbody>
            <xsl:for-each select="$channel/item">
                <xsl:variable name="article-link">
                    <xsl:choose>
                        <xsl:when test="normalize-space(link[1]) != ''"><xsl:value-of select="normalize-space(link[1])"/></xsl:when>
                        <xsl:otherwise><xsl:value-of select="normalize-space(guid[1])"/></xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:variable name="image-url">
                    <xsl:choose>
                        <xsl:when test="enclosure[1]/@url"><xsl:value-of select="enclosure[1]/@url"/></xsl:when>
                        <xsl:when test="media:content[1]/@url"><xsl:value-of select="media:content[1]/@url"/></xsl:when>
                        <xsl:when test="media:thumbnail[1]/@url"><xsl:value-of select="media:thumbnail[1]/@url"/></xsl:when>
                    </xsl:choose>
                </xsl:variable>
                <xsl:variable name="item-date">
                    <xsl:choose>
                        <xsl:when test="pubDate"><xsl:value-of select="pubDate[1]"/></xsl:when>
                        <xsl:otherwise><xsl:value-of select="dc:date[1]"/></xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <tr>
                    <td>
                        <xsl:if test="string-length(normalize-space($image-url)) &gt; 0">
                            <div class="img-container" onclick="openLightbox('{$image-url}')">
                                <img class="img-thumb" src="{$image-url}" title="Perbesar Cover" alt="{normalize-space(title)}"/>
                            </div>
                        </xsl:if>
                    </td>
                    <td>
                        <h3 class="article-title"><a href="{$article-link}" target="_blank" rel="noopener noreferrer"><xsl:value-of select="title"/></a></h3>
                        <p class="article-desc">
                            <xsl:choose>
                                <xsl:when test="description"><xsl:value-of select="description"/></xsl:when>
                                <xsl:otherwise><xsl:value-of select="content:encoded"/></xsl:otherwise>
                            </xsl:choose>
                        </p>
                        <span class="badge"><xsl:value-of select="category[1]"/></span>
                    </td>
                    <td style="font-size: 12px; color: #666;"><xsl:value-of select="$item-date"/></td>
                </tr>
            </xsl:for-each>
        </tbody>
    </table>
</div>

<script type="text/javascript">
<![CDATA[
    function openLightbox(url) {
        document.getElementById('lightbox-img').src = url;
        document.getElementById('lightbox').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    function closeLightbox(event) {
        if (!event || event.target.id !== 'lightbox-img') {
            document.getElementById('lightbox').style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
    document.addEventListener('keydown', function(e){ if(e.key === "Escape") closeLightbox(); });
]]>
</script>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
