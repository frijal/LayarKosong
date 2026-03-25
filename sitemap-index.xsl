<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="id">
      <head>
        <title>Indeks Peta Situs XML</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&amp;family=DM+Sans:wght@300;400;500;600&amp;display=swap" rel="stylesheet"/>
        <style>
          :root {
            --bg: #0d0f12;
            --surface: #13161b;
            --surface2: #1a1e25;
            --border: #2a2f3a;
            --accent: #00e5a0;
            --accent2: #00b8ff;
            --text: #e8eaf0;
            --text-muted: #6b7280;
            --text-dim: #4b5563;
            --danger: #ff4d6d;
            --mono: 'Space Mono', monospace;
            --sans: 'DM Sans', sans-serif;
            --radius: 8px;
            --radius-lg: 16px;
          }

          * { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: var(--sans);
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            line-height: 1.6;
          }

          /* HEADER */
          #header {
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            padding: 32px 40px 24px;
            position: relative;
            overflow: hidden;
          }

          #header::before {
            content: '';
            position: absolute;
            top: -60px; right: -60px;
            width: 300px; height: 300px;
            background: radial-gradient(circle, rgba(0,229,160,0.08) 0%, transparent 70%);
            pointer-events: none;
          }

          #header::after {
            content: '';
            position: absolute;
            bottom: -80px; left: 20%;
            width: 400px; height: 200px;
            background: radial-gradient(circle, rgba(0,184,255,0.05) 0%, transparent 70%);
            pointer-events: none;
          }

          .header-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            flex-wrap: wrap;
          }

          .header-title-group {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .header-icon {
            width: 44px; height: 44px;
            background: linear-gradient(135deg, var(--accent), var(--accent2));
            border-radius: var(--radius);
            display: flex; align-items: center; justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
          }

          h1 {
            font-family: var(--mono);
            font-size: 18px;
            font-weight: 700;
            color: var(--text);
            letter-spacing: -0.3px;
          }

          .header-subtitle {
            font-size: 13px;
            color: var(--text-muted);
            margin-top: 2px;
          }

          .header-meta {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
          }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 12px;
            border-radius: 100px;
            font-size: 12px;
            font-weight: 500;
            font-family: var(--mono);
          }

          .badge-accent {
            background: rgba(0,229,160,0.12);
            border: 1px solid rgba(0,229,160,0.25);
            color: var(--accent);
          }

          .badge-info {
            background: rgba(0,184,255,0.10);
            border: 1px solid rgba(0,184,255,0.20);
            color: var(--accent2);
          }

          .badge-dot {
            width: 6px; height: 6px;
            border-radius: 50%;
            background: currentColor;
            animation: pulse 2s ease-in-out infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }

          .header-desc {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--border);
            font-size: 13px;
            color: var(--text-muted);
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
          }

          .header-desc a {
            color: var(--accent);
            text-decoration: none;
            border-bottom: 1px solid rgba(0,229,160,0.3);
            transition: border-color 0.2s;
          }

          .header-desc a:hover {
            border-color: var(--accent);
          }

          /* TOOLBAR */
          #toolbar {
            padding: 20px 40px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
            background: var(--bg);
            border-bottom: 1px solid var(--border);
          }

          .search-wrap {
            position: relative;
            flex: 1;
            min-width: 220px;
            max-width: 480px;
          }

          .search-icon {
            position: absolute;
            left: 14px; top: 50%;
            transform: translateY(-50%);
            color: var(--text-dim);
            font-size: 14px;
            pointer-events: none;
          }

          #searchInput {
            width: 100%;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 10px 14px 10px 38px;
            font-family: var(--sans);
            font-size: 13px;
            color: var(--text);
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
          }

          #searchInput::placeholder { color: var(--text-dim); }

          #searchInput:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(0,229,160,0.08);
          }

          .toolbar-right {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
          }

          .stat-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            font-size: 12px;
            color: var(--text-muted);
            font-family: var(--mono);
          }

          .stat-chip strong {
            color: var(--accent);
            font-weight: 700;
          }

          #resultCount {
            font-size: 12px;
            color: var(--text-dim);
            font-family: var(--mono);
            white-space: nowrap;
          }

          /* TABLE */
          #content {
            padding: 24px 40px 40px;
          }

          .table-wrap {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            overflow: hidden;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          thead {
            background: var(--surface2);
          }

          th {
            padding: 14px 20px;
            font-family: var(--mono);
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-muted);
            text-align: left;
            white-space: nowrap;
            user-select: none;
            cursor: pointer;
            border-bottom: 1px solid var(--border);
            transition: color 0.2s;
          }

          th:hover { color: var(--accent); }

          th.sort-asc::after  { content: ' ↑'; color: var(--accent); }
          th.sort-desc::after { content: ' ↓'; color: var(--accent); }

          td {
            padding: 14px 20px;
            font-size: 13px;
            border-bottom: 1px solid var(--border);
            vertical-align: middle;
          }

          tr:last-child td { border-bottom: none; }

          tbody tr {
            transition: background 0.15s;
          }

          tbody tr:hover {
            background: rgba(255,255,255,0.025);
          }

          .col-num {
            width: 56px;
            color: var(--text-dim);
            font-family: var(--mono);
            font-size: 12px;
            font-weight: 700;
          }

          .col-url { }

          .col-date {
            width: 160px;
            white-space: nowrap;
          }

          .url-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--accent2);
            text-decoration: none;
            font-size: 13px;
            font-family: var(--mono);
            word-break: break-all;
            transition: color 0.2s;
          }

          .url-link:hover { color: var(--accent); }
          .url-link:hover .link-arrow { transform: translateX(2px); }

          .link-arrow {
            font-size: 11px;
            flex-shrink: 0;
            transition: transform 0.15s;
          }

          .date-text {
            color: var(--text-muted);
            font-family: var(--mono);
            font-size: 12px;
          }

          /* EMPTY STATE */
          #emptyState {
            display: none;
            padding: 60px 20px;
            text-align: center;
          }

          #emptyState.visible { display: block; }

          .empty-icon {
            font-size: 40px;
            margin-bottom: 12px;
            opacity: 0.4;
          }

          .empty-text {
            color: var(--text-dim);
            font-size: 14px;
          }

          /* NO SITEMAP WARNING */
          .warning-box {
            margin: 0 40px 20px;
            padding: 14px 18px;
            background: rgba(255,77,109,0.08);
            border: 1px solid rgba(255,77,109,0.25);
            border-radius: var(--radius);
            font-size: 13px;
            color: #ff8099;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          /* FOOTER */
          #footer {
            padding: 20px 40px;
            border-top: 1px solid var(--border);
            font-size: 12px;
            color: var(--text-dim);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: gap;
            gap: 8px;
          }

          #footer a {
            color: var(--text-muted);
            text-decoration: none;
            transition: color 0.2s;
          }

          #footer a:hover { color: var(--accent); }

          .footer-links {
            display: flex;
            gap: 16px;
          }

          /* RESPONSIVE */
          @media (max-width: 640px) {
            #header, #toolbar, #content, #footer { padding-left: 20px; padding-right: 20px; }
            .warning-box { margin-left: 20px; margin-right: 20px; }
            .col-date { display: none; }
            th:nth-child(3) { display: none; }
          }
        </style>
      </head>
      <body>

        <!-- HEADER -->
        <div id="header">
          <div class="header-top">
            <div class="header-title-group">
              <div class="header-icon">🗺️</div>
              <div>
                <h1>Indeks Peta Situs XML</h1>
                <div class="header-subtitle">XML Sitemap Index</div>
              </div>
            </div>
            <div class="header-meta">
              <span class="badge badge-accent">
                <span class="badge-dot"></span>
                <span id="totalBadge">
                  <xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/> sitemap
                </span>
              </span>
              <span class="badge badge-info">
                XML Index
              </span>
            </div>
          </div>
          <div class="header-desc">
            Dibuat oleh&#160;
            <a href="https://dalam.web.id/">Layar Kosong</a>
            &#160;— Diindeks oleh&#160;
            <a href="https://www.google.com/">Google</a>
            &#160;&amp;&#160;
            <a href="https://www.bing.com/">Bing</a>.
            Info lebih lanjut di&#160;
            <a href="https://sitemaps.org">sitemaps.org</a>
          </div>
        </div>

        <!-- WARNING jika kosong -->
        <xsl:if test="not(sitemap:sitemapindex/sitemap:sitemap)">
          <div class="warning-box">
            ⚠️ Tidak menemukan peta situs. Sistem akan mencoba membuatnya lagi dalam 11 jam.
          </div>
        </xsl:if>

        <!-- TOOLBAR -->
        <div id="toolbar">
          <div class="search-wrap">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              id="searchInput"
              placeholder="Cari URL sitemap..."
              oninput="filterTable()"
              autocomplete="off"
            />
          </div>
          <div class="toolbar-right">
            <div class="stat-chip">
              Total: <strong><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></strong>
            </div>
            <span id="resultCount"></span>
          </div>
        </div>

        <!-- TABLE -->
        <div id="content">
          <div class="table-wrap">
            <table id="sitemapTable">
              <thead>
                <tr>
                  <th class="col-num" onclick="sortTable(0)" title="Sort by nomor">#</th>
                  <th class="col-url" onclick="sortTable(1)" title="Sort by URL">URL Peta Situs</th>
                  <th class="col-date" onclick="sortTable(2)" title="Sort by tanggal">Terakhir Diubah</th>
                </tr>
              </thead>
              <tbody id="tableBody">
                <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                  <tr>
                    <td class="col-num">
                      <xsl:value-of select="position()"/>
                    </td>
                    <td class="col-url">
                      <xsl:variable name="itemURL">
                        <xsl:value-of select="sitemap:loc"/>
                      </xsl:variable>
                      <a class="url-link" href="{$itemURL}">
                        <xsl:value-of select="sitemap:loc"/>
                        <span class="link-arrow">↗</span>
                      </a>
                    </td>
                    <td class="col-date">
                      <span class="date-text">
                        <xsl:value-of select="sitemap:lastmod"/>
                      </span>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
            <div id="emptyState">
              <div class="empty-icon">🔎</div>
              <div class="empty-text">Tidak ada hasil yang cocok dengan pencarian.</div>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div id="footer">
          <span>Dibuat oleh <a href="https://dalam.web.id">Layar Kosong</a></span>
          <div class="footer-links">
            <a href="https://sitemaps.org">sitemaps.org</a>
            <a href="https://www.google.com/search-console">Google Search Console</a>
          </div>
        </div>

        <script>
          // ── SEARCH ──────────────────────────────────────────────
          function filterTable() {
            const q = document.getElementById('searchInput').value.toLowerCase();
            const rows = document.querySelectorAll('#tableBody tr');
            let visible = 0;

            rows.forEach(function(row) {
              const url = row.cells[1] ? row.cells[1].textContent.toLowerCase() : '';
              const match = url.includes(q);
              row.style.display = match ? '' : 'none';
              if (match) visible++;
            });

            const total = rows.length;
            const countEl = document.getElementById('resultCount');
            if (q) {
              countEl.textContent = visible + ' / ' + total + ' ditampilkan';
            } else {
              countEl.textContent = '';
            }

            const empty = document.getElementById('emptyState');
            empty.classList.toggle('visible', visible === 0 &amp;&amp; q !== '');
          }

          // ── SORT ─────────────────────────────────────────────────
          var sortState = { col: -1, dir: 1 };

          function sortTable(colIndex) {
            const tbody = document.getElementById('tableBody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const ths = document.querySelectorAll('thead th');

            if (sortState.col === colIndex) {
              sortState.dir *= -1;
            } else {
              sortState.col = colIndex;
              sortState.dir = 1;
            }

            ths.forEach(function(th) {
              th.classList.remove('sort-asc', 'sort-desc');
            });
            ths[colIndex].classList.add(sortState.dir === 1 ? 'sort-asc' : 'sort-desc');

            rows.sort(function(a, b) {
              const aText = a.cells[colIndex] ? a.cells[colIndex].textContent.trim() : '';
              const bText = b.cells[colIndex] ? b.cells[colIndex].textContent.trim() : '';

              if (colIndex === 0) {
                return (parseInt(aText) - parseInt(bText)) * sortState.dir;
              }
              return aText.localeCompare(bText) * sortState.dir;
            });

            rows.forEach(function(row) { tbody.appendChild(row); });
          }
        </script>

      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
