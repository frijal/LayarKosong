<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
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
.container { max-width: 1100px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
h1 { color: #2c3e50; margin-bottom: 20px; }
h1 a { color: inherit; text-decoration: none; transition: opacity 0.2s; }
h1 a:hover { opacity: 0.8; text-decoration: none; }

/* Header Flexbox */
.header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3498db; padding-bottom: 15px; margin-bottom: 10px; }
.total-info { font-size: 14px; margin: 0; color: #555; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th { background: #3498db; color: white; text-align: left; padding: 12px; font-size: 14px; }
td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: middle; }
.col-no { width: 60px; color: #000000; font-family: monospace; font-weight: bold; }
tr:hover { background: #fdfdfd; }

/* Image Preview Thumbnail */
.img-container { cursor: zoom-in; display: inline-block; transition: transform 0.2s; }
.img-container:hover { transform: scale(1.05); }
.img-thumb { width: 60px; height: 45px; object-fit: cover; border-radius: 4px; background: #eee; border: 1px solid #ddd; }

/* Lightbox Modal CSS (Multimedia) */
.lightbox-modal { display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.85); backdrop-filter: blur(4px); justify-content: center; align-items: center; }
.lightbox-content { border-radius: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); animation: zoomModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: default; }
img.lightbox-content { max-width: 90%; max-height: 90vh; }
iframe.lightbox-content { width: 85vw; height: 48vw; max-width: 1024px; max-height: 576px; background: #000; border: none; }
.close-lightbox { position: absolute; top: 20px; right: 35px; color: #fff; font-size: 40px; font-weight: bold; cursor: pointer; transition: color 0.2s; }
.close-lightbox:hover { color: #ccc; }
@keyframes zoomModal { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* PaginationLinks */
.pagination-wrapper { display: flex; align-items: center; gap: 15px; }
.pagination-bottom { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; justify-content: space-between; }
.nav-buttons { display: flex; gap: 8px; }
.btn { background: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: background 0.2s; }
.btn:hover { background: #2980b9; }
.btn:disabled { background: #ccc; cursor: not-allowed; }
.page-info { font-size: 13px; color: #666; font-weight: 500; }
a { color: #3498db; text-decoration: none; font-weight: 600; }
a:hover { text-decoration: underline; }
.video-info { font-size: 11px; color: #666; margin-top: 8px; display: inline-block; border-left: 3px solid #e74c3c; padding-left: 8px; cursor: pointer; transition: background 0.2s, padding 0.2s; }
.video-info:hover { background: #fdf0ef; padding-right: 8px; border-radius: 0 4px 4px 0; color: #c0392b; }
.play-icon { color: #e74c3c; margin-right: 3px; }
</style>
</head>
<body>

<div id="lightbox" class="lightbox-modal" style="cursor: zoom-out;" onclick="closeLightbox(event)">
    <span class="close-lightbox">&#215;</span>
    <img id="lightbox-img" class="lightbox-content" src="" style="display: none;" />
    <iframe id="lightbox-video" class="lightbox-content" src="" allow="autoplay; fullscreen; encrypted-media" style="display: none;"></iframe>
</div>

<div class="container">
    <h1>
        <a href="/sitemap.xml">
            <xsl:choose>
                <xsl:when test="sitemap:sitemapindex">XML Sitemap Index - Layar Kosong</xsl:when>
                <xsl:otherwise>XML Sitemap - Layar Kosong</xsl:otherwise>
            </xsl:choose>
        </a>
    </h1>
    <div class="header-container">
        <p class="total-info">Total:
            <strong id="total-count">
                <xsl:choose>
                    <xsl:when test="sitemap:sitemapindex"><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></xsl:when>
                    <xsl:otherwise><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></xsl:otherwise>
                </xsl:choose>
            </strong>
            <xsl:choose>
                <xsl:when test="sitemap:sitemapindex"> File Sitemap.</xsl:when>
                <xsl:otherwise> Judul Artikel.</xsl:otherwise>
            </xsl:choose>
        </p>
        <div class="pagination-wrapper">
            <div class="page-info">Halaman <span class="current-page-txt">1</span> dari <span class="total-pages-txt">1</span></div>
            <div class="nav-buttons">
                <button class="btn prevBtn" onclick="changePage(-1)">Sebelumnya</button>
                <button class="btn nextBtn" onclick="changePage(1)">Selanjutnya</button>
            </div>
        </div>
    </div>

    <table id="sitemap-table">
        <xsl:choose>
            <xsl:when test="sitemap:sitemapindex">
                <thead>
                    <tr>
                        <th class="col-no">#</th>
                        <th>URL Sub-Sitemap</th>
                        <th style="width: 150px;">Total Artikel</th>
                        <th>Last Mods.</th>
                    </tr>
                </thead>
                <tbody>
                    <xsl:variable name="totalIdx" select="count(sitemap:sitemapindex/sitemap:sitemap)" />
                    <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                        <tr class="sitemap-row">
                            <td class="col-no"><xsl:value-of select="$totalIdx - (position() - 1)"/></td>
                            <td>
                                <a href="{sitemap:loc}" class="sub-sitemap-link" target="_blank" rel="noopener noreferrer"><xsl:value-of select="sitemap:loc"/></a>
                            </td>
                            <td>
                                <span class="article-count">⏳ Menghitung...</span>
                            </td>
                            <td><xsl:value-of select="substring(sitemap:lastmod, 1, 10)"/></td>
                        </tr>
                    </xsl:for-each>
                </tbody>
            </xsl:when>

            <xsl:otherwise>
                <thead>
                    <tr>
                        <th class="col-no">#</th>
                        <th>Cover</th>
                        <th>URL Artikel &amp; Media</th>
                        <th>Last Mods.</th>
                    </tr>
                </thead>
                <tbody>
                    <xsl:variable name="total" select="count(sitemap:urlset/sitemap:url)" />
                    <xsl:for-each select="sitemap:urlset/sitemap:url">
                        <tr class="sitemap-row">
                            <td class="col-no"><xsl:value-of select="$total - (position() - 1)"/></td>
                            <td>
                                <xsl:if test="image:image/image:loc">
                                    <div class="img-container" onclick="openImageLightbox('{image:image/image:loc}')">
                                        <img class="img-thumb" src="{image:image/image:loc}" title="Klik untuk lihat memperbesar gambar"/>
                                    </div>
                                </xsl:if>
                            </td>
                            <td>
                                <a href="{sitemap:loc}" target="_blank" rel="noopener noreferrer"><xsl:value-of select="sitemap:loc"/></a>
                                <br/>
                                <xsl:if test="video:video/video:player_loc">
                                    <span class="video-info" onclick="openVideoLightbox('{video:video/video:player_loc}')" title="Klik untuk menonton video">
                                        <strong class="play-icon">&#9654; TONTON VIDEO:</strong> <xsl:value-of select="video:video/video:title"/>
                                    </span>
                                </xsl:if>
                            </td>
                            <td><xsl:value-of select="substring(sitemap:lastmod, 1, 10)"/></td>
                        </tr>
                    </xsl:for-each>
                </tbody>
            </xsl:otherwise>
        </xsl:choose>
    </table>

    <div class="pagination-wrapper pagination-bottom">
        <div class="page-info">Halaman <span class="current-page-txt">1</span> dari <span class="total-pages-txt">1</span></div>
        <div class="nav-buttons">
            <button class="btn prevBtn" onclick="changePage(-1)">Sebelumnya</button>
            <button class="btn nextBtn" onclick="changePage(1)">Selanjutnya</button>
        </div>
    </div>
</div>

<script type="text/javascript">
<![CDATA[
    // -- Fetch Jumlah Artikel di Index --
    async function fetchSitemapCounts() {
        const rows = document.querySelectorAll('.sitemap-row');
        if (!document.querySelector('.sub-sitemap-link')) return;

        for (let row of rows) {
            const link = row.querySelector('.sub-sitemap-link');
            const countSpan = row.querySelector('.article-count');

            if (link && countSpan) {
                try {
                    const response = await fetch(link.href);
                    if (!response.ok) throw new Error('Gagal muat');

                    const xmlText = await response.text();
                    const matches = xmlText.match(/<url[\s>]/g);
                    const count = matches ? matches.length : 0;

                    // Modifikasi innerHTML langsung tanpa addClass styling
                    countSpan.innerHTML = count + ' Artikel';
                } catch (error) {
                    countSpan.innerHTML = 'Error';
                }
            }
        }
    }

    fetchSitemapCounts();

    // -- Lightbox Multimedia Logic --
    function openImageLightbox(url) {
        document.getElementById('lightbox-video').style.display = 'none';
        const lightbox = document.getElementById('lightbox');
        const img = document.getElementById('lightbox-img');
        img.src = url;
        img.style.display = 'block';
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function openVideoLightbox(url) {
        document.getElementById('lightbox-img').style.display = 'none';
        const lightbox = document.getElementById('lightbox');
        const vid = document.getElementById('lightbox-video');
        const autoPlayUrl = url.includes('?') ? url + '&autoplay=1' : url + '?autoplay=1';
        vid.src = autoPlayUrl;
        vid.style.display = 'block';
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox(event) {
        if (!event || (event.target.id !== 'lightbox-img' && event.target.id !== 'lightbox-video')) {
            document.getElementById('lightbox').style.display = 'none';
            document.body.style.overflow = 'auto';
            document.getElementById('lightbox-img').src = '';
            document.getElementById('lightbox-video').src = '';
        }
    }

    document.addEventListener('keydown', function(event){
        if(event.key === "Escape"){
            closeLightbox();
        }
    });

    // -- Pagination Logic --
    let currentPage = 1;
    const recordsPerPage = 36;
    const pgRows = document.getElementsByClassName('sitemap-row');
    const totalPages = Math.ceil(pgRows.length / recordsPerPage) || 1;

    const currentPageEles = document.getElementsByClassName('current-page-txt');
    const totalPagesEles = document.getElementsByClassName('total-pages-txt');
    const prevBtns = document.getElementsByClassName('prevBtn');
    const nextBtns = document.getElementsByClassName('nextBtn');

    function updateDisplay() {
        const start = (currentPage - 1) * recordsPerPage;
        const end = start + recordsPerPage;

        for (let i = 0; i < pgRows.length; i++) {
            pgRows[i].style.display = (i >= start && i < end) ? 'table-row' : 'none';
        }

        for (let ele of currentPageEles) ele.innerText = currentPage;
        for (let ele of totalPagesEles) ele.innerText = totalPages;

        for (let btn of prevBtns) btn.disabled = (currentPage === 1);
        for (let btn of nextBtns) btn.disabled = (currentPage === totalPages);

        window.scrollTo({top: 0, behavior: 'smooth'});
    }

    function changePage(direction) {
        currentPage += direction;
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;
        updateDisplay();
    }

    updateDisplay();
]]>
</script>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
