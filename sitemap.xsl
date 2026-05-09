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
                    .container { max-width: 1100px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
                    h1 { color: #2c3e50; margin-bottom: 20px; }

                    /* Header Flexbox */
                    .header-container {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 15px;
                        margin-bottom: 10px;
                    }
                    .total-info { font-size: 14px; margin: 0; color: #555; }

                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background: #3498db; color: white; text-align: left; padding: 12px; font-size: 14px; }
                    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
                    .col-no { width: 60px; color: #999; font-family: monospace; font-weight: bold; }
                    tr:hover { background: #fdfdfd; }

                    /* Image Preview */
                    .img-container { cursor: pointer; display: inline-block; transition: transform 0.2s; }
                    .img-container:hover { transform: scale(1.1); }
                    .img-thumb { width: 60px; height: 45px; object-fit: cover; border-radius: 4px; background: #eee; border: 1px solid #ddd; }

                    /* Pagination */
                    .pagination-wrapper { display: flex; align-items: center; gap: 15px; }
                    .pagination-bottom { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; justify-content: space-between; }
                    .nav-buttons { display: flex; gap: 8px; }
                    .btn { background: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: background 0.2s; }
                    .btn:hover { background: #2980b9; }
                    .btn:disabled { background: #ccc; cursor: not-allowed; }
                    .page-info { font-size: 13px; color: #666; font-weight: 500; }

                    a { color: #3498db; text-decoration: none; font-weight: 600; }
                    a:hover { text-decoration: underline; }
                    .video-info { font-size: 11px; color: #666; margin-top: 5px; display: block; border-left: 2px solid #e74c3c; padding-left: 8px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>XML Sitemap - Layar Kosong</h1>

                    <!-- Header: Total & Navigasi Atas Sejajar -->
                    <div class="header-container">
                        <p class="total-info">Total: <strong id="total-count"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong> Judul Artikel.</p>

                        <div class="pagination-wrapper">
                            <div class="page-info">Halaman <span class="current-page-txt">1</span> dari <span class="total-pages-txt">1</span></div>
                            <div class="nav-buttons">
                                <button class="btn prevBtn" onclick="changePage(-1)">Sebelumnya</button>
                                <button class="btn nextBtn" onclick="changePage(1)">Selanjutnya</button>
                            </div>
                        </div>
                    </div>

                    <table id="sitemap-table">
                        <thead>
                            <tr>
                                <th class="col-no">#</th>
                                <th>Cover</th>
                                <th>URL Artikel</th>
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
                                            <div class="img-container" onclick="openPreview('{image:image/image:loc}')">
                                                <img class="img-thumb" src="{image:image/image:loc}" title="Klik untuk melihat gambarnya..."/>
                                            </div>
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

                    <!-- Navigasi Bawah (Sinkron dengan Atas) -->
                    <div class="pagination-wrapper pagination-bottom">
                        <div class="page-info">Halaman <span class="current-page-txt">1</span> dari <span class="total-pages-txt">1</span></div>
                        <div class="nav-buttons">
                            <button class="btn prevBtn" onclick="changePage(-1)">Sebelumnya</button>
                            <button class="btn nextBtn" onclick="changePage(1)">Selanjutnya</button>
                        </div>
                    </div>
                </div>

                <script type="text/javascript">
                    function openPreview(url) {
                        const width = 850;
                        const height = 650;
                        const left = (screen.width - width) / 2;
                        const top = (screen.height - height) / 2;
                        window.open(url, 'ImagePreview',
                            `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`
                        );
                    }

                    let currentPage = 1;
                    const recordsPerPage = 36;
                    const rows = document.getElementsByClassName('sitemap-row');
                    const totalPages = Math.ceil(rows.length / recordsPerPage);

                    // Ambil semua elemen navigasi (atas dan bawah)
                    const currentPageEles = document.getElementsByClassName('current-page-txt');
                    const totalPagesEles = document.getElementsByClassName('total-pages-txt');
                    const prevBtns = document.getElementsByClassName('prevBtn');
                    const nextBtns = document.getElementsByClassName('nextBtn');

                    function updateDisplay() {
                        const start = (currentPage - 1) * recordsPerPage;
                        const end = start + recordsPerPage;

                        // Tampilkan baris sesuai halaman
                        for (let i = 0; i &lt; rows.length; i++) {
                            rows[i].style.display = (i &gt;= start &amp;&amp; i &lt; end) ? 'table-row' : 'none';
                        }

                        // Update semua teks indikator halaman
                        for (let ele of currentPageEles) ele.innerText = currentPage;
                        for (let ele of totalPagesEles) ele.innerText = totalPages;

                        // Update status semua tombol
                        for (let btn of prevBtns) btn.disabled = (currentPage === 1);
                        for (let btn of nextBtns) btn.disabled = (currentPage === totalPages);

                        window.scrollTo({top: 0, behavior: 'smooth'});
                    }

                    function changePage(direction) {
                        currentPage += direction;
                        if (currentPage &lt; 1) currentPage = 1;
                        if (currentPage &gt; totalPages) currentPage = totalPages;
                        updateDisplay();
                    }

                    // Jalankan saat pertama kali load
                    updateDisplay();
                </script>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>
