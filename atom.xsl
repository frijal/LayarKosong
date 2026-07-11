<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns:atom="http://www.w3.org/2005/Atom"
exclude-result-prefixes="atom">
<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
<xsl:strip-space elements="*"/>
<xsl:template match="/">
<xsl:variable name="feed" select="/atom:feed"/>
<xsl:variable name="home-link">
    <xsl:choose>
        <xsl:when test="$feed/atom:link[@rel='alternate'][1]/@href"><xsl:value-of select="$feed/atom:link[@rel='alternate'][1]/@href"/></xsl:when>
        <xsl:when test="$feed/atom:link[not(@rel)][1]/@href"><xsl:value-of select="$feed/atom:link[not(@rel)][1]/@href"/></xsl:when>
        <xsl:otherwise><xsl:value-of select="$feed/atom:id"/></xsl:otherwise>
    </xsl:choose>
</xsl:variable>
<xsl:variable name="feed-updated" select="string($feed/atom:updated[1])"/>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title><xsl:value-of select="$feed/atom:title"/> - Atom Feed</title>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<style type="text/css">
/* Memakai warna dasar Hijau kebiruan untuk membedakan dengan RSS (Orange) */
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #333; margin: 0; padding: 40px; background: #f4f7f6; }
.container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
.feed-header { border-bottom: 2px solid #1abc9c; padding-bottom: 20px; margin-bottom: 20px; }

/* 🔥 UPDATE CSS H1: Menambahkan space-between untuk memisah teks (kiri) dan logo (kanan) */
.feed-header h1 { color: #1abc9c; margin: 0 0 10px 0; display: flex; justify-content: space-between; align-items: center; }

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

table { width: 100%; border-collapse: collapse; }
th { background: #1abc9c; color: white; text-align: left; padding: 12px; font-size: 14px; }
td { padding: 15px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
tr:hover { background: #fdfdfd; }

.article-title { font-size: 16px; font-weight: 600; margin: 0 0 5px 0; }
.article-title a { color: #1abc9c; text-decoration: none; }
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
            <span><xsl:value-of select="$feed/atom:title"/></span>

            <a href="/" class="logo-link" title="Kembali ke Beranda">
    <img src="/favicon.svg" alt="Layar Kosong Logo" class="header-logo" />
</a>
        </h1>
        <p>
            <xsl:choose>
                <xsl:when test="$feed/atom:subtitle"><xsl:value-of select="$feed/atom:subtitle"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="$feed/atom:title"/></xsl:otherwise>
            </xsl:choose>
        </p>
        <div class="feed-meta">
            <span>Beranda: <a href="{$home-link}" style="color:#1abc9c;"><xsl:value-of select="$home-link"/></a></span>
            <span>Update: 
                <xsl:choose>
                    <xsl:when test="contains($feed-updated, 'T')"><xsl:value-of select="substring-before($feed-updated, 'T')"/> <xsl:value-of select="substring(substring-after($feed-updated, 'T'), 1, 8)"/></xsl:when>
                    <xsl:otherwise><xsl:value-of select="$feed-updated"/></xsl:otherwise>
                </xsl:choose>
            </span>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 130px;">Cover</th>
                <th>Informasi Artikel</th>
                <th style="width: 110px;">Tanggal</th>
            </tr>
        </thead>
        <tbody>
            <xsl:for-each select="$feed/atom:entry">
                <xsl:variable name="article-link">
                    <xsl:choose>
                        <xsl:when test="atom:link[@rel='alternate'][1]/@href"><xsl:value-of select="atom:link[@rel='alternate'][1]/@href"/></xsl:when>
                        <xsl:when test="atom:link[not(@rel)][1]/@href"><xsl:value-of select="atom:link[not(@rel)][1]/@href"/></xsl:when>
                        <xsl:otherwise><xsl:value-of select="atom:id"/></xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:variable name="image-url">
                    <xsl:choose>
                        <xsl:when test="atom:link[@rel='enclosure'][1]/@href"><xsl:value-of select="atom:link[@rel='enclosure'][1]/@href"/></xsl:when>
                        <xsl:when test="atom:content[1]/@src"><xsl:value-of select="atom:content[1]/@src"/></xsl:when>
                    </xsl:choose>
                </xsl:variable>
                <xsl:variable name="entry-date">
                    <xsl:choose>
                        <xsl:when test="atom:published"><xsl:value-of select="atom:published[1]"/></xsl:when>
                        <xsl:otherwise><xsl:value-of select="atom:updated[1]"/></xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <tr>
                    <td>
                        <xsl:if test="string-length(normalize-space($image-url)) &gt; 0">
                            <div class="img-container" onclick="openLightbox('{$image-url}')">
                                <img class="img-thumb" src="{$image-url}" title="Perbesar Cover" alt="{normalize-space(atom:title)}"/>
                            </div>
                        </xsl:if>
                    </td>
                    <td>
                        <h3 class="article-title"><a href="{$article-link}" target="_blank" rel="noopener noreferrer"><xsl:value-of select="atom:title"/></a></h3>
                        <p class="article-desc">
                            <xsl:choose>
                                <xsl:when test="atom:summary"><xsl:value-of select="atom:summary"/></xsl:when>
                                <xsl:otherwise><xsl:value-of select="atom:content"/></xsl:otherwise>
                            </xsl:choose>
                        </p>
                        <span class="badge">
                            <xsl:choose>
                                <xsl:when test="atom:category[1]/@term"><xsl:value-of select="atom:category[1]/@term"/></xsl:when>
                                <xsl:otherwise><xsl:value-of select="atom:category[1]/@label"/></xsl:otherwise>
                            </xsl:choose>
                        </span>
                    </td>
                    <td style="font-size: 12px; color: #666;">
                        <xsl:choose>
                            <xsl:when test="contains(string($entry-date), 'T')"><xsl:value-of select="substring-before(string($entry-date), 'T')"/></xsl:when>
                            <xsl:otherwise><xsl:value-of select="$entry-date"/></xsl:otherwise>
                        </xsl:choose>
                    </td>
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
