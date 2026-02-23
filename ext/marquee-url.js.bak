// ----------------------------------------------------------
// FILE: /ext/marquee-url.js
// Versi V6.9 (Clean URL & Dynamic Category Mapping)
// Updated: 2026-01-11
// ----------------------------------------------------------

(function () {
  'use strict';

  // ---------------------------
  // 1. HELPER FUNCTIONS
  // ---------------------------

  function isMobileDevice() {
    return (
      window.innerWidth <= 768 ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  }

  // Membersihkan ID/Slug (menghapus .html jika ada)
  function cleanSlug(id) {
    return id ? id.replace(/\.html$/, '') : '';
  }

  // Mendapatkan nama file saat ini (sebagai key pencarian di JSON)
  function getCurrentFileName() {
    const path = window.location.pathname;
    // Jika path berakhir dengan / (folder), ambil segmen terakhir + .html
    // Jika path berakhir .html, ambil nama filenya saja.
    let name = path.split('/').filter(Boolean).pop();
    if (!name || name === 'artikel') return '';
    return name.endsWith('.html') ? name : `${name}.html`;
  }

  // Fungsi Sakti: Mencari URL Lengkap berdasarkan Nama File & Data JSON
  function getFullUrl(fileName, allData) {
    for (const [catName, articles] of Object.entries(allData)) {
      if (articles.some(a => a[1] === fileName)) {
        const catSlug = catName.toLowerCase().replace(/\s+/g, '-');
        // Return URL Cantik: /gaya-hidup/nama-artikel/
        return `/${catSlug}/${fileName.replace('.html', '')}/`;
      }
    }
    return `/artikel/${cleanSlug(fileName)}`; // Fallback lama
  }

  // Mendapatkan Slug Kategori untuk Link Header Nav
  function getCategoryInfo(fileName, allData) {
    for (const [catName, articles] of Object.entries(allData)) {
      if (articles.some(a => a[1] === fileName)) {
        return {
          name: catName,
 slug: catName.toLowerCase().replace(/\s+/g, '-'),
 list: articles
        };
      }
    }
    return null;
  }

  function adaptMarqueeTextColor() {
    const container = document.getElementById('related-marquee-container');
    if (!container) return;
    const bg = getComputedStyle(document.body).backgroundColor;
    const [r, g, b] = (bg.match(/\d+/g) || [0, 0, 0]).map(Number);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    container.classList.toggle('theme-light', luminance > 128);
  }

  function registerReadTracker() {
    const container = document.getElementById('related-marquee-container');
    if (!container) return;
    container.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      const id = link.dataset.articleId;
      if (!id) return;

      const read = JSON.parse(localStorage.getItem('read_marquee_articles') || '[]');
      if (!read.includes(id)) {
        read.push(id);
        localStorage.setItem('read_marquee_articles', JSON.stringify(read));
      }
    });
  }

  // ---------------------------
  // 2. PROGRESS BAR
  // ---------------------------
  function initProgressBar() {
    const bar = document.getElementById('progress');
    if (!bar) return;
    const onScroll = () => {
      const h = document.documentElement;
      const b = document.body;
      const scrollTop = h.scrollTop || b.scrollTop;
      const scrollHeight = h.scrollHeight || b.scrollHeight;
      const clientHeight = h.clientHeight;
      const max = scrollHeight - clientHeight;
      const perc = max > 0 ? (scrollTop / max) * 100 : 0;
      bar.style.width = perc + '%';
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------------------------
  // 3. MARQUEE (DENGAN URL DINAMIS)
  // ---------------------------
  function initCategoryMarquee(allData, currentFile) {
    const container = document.getElementById('related-marquee-container');
    if (!container) return;

    try {
      const catInfo = getCategoryInfo(currentFile, allData);
      if (!catInfo) return;

      const filtered = catInfo.list.filter((i) => i[1] !== currentFile);
      const read = JSON.parse(localStorage.getItem('read_marquee_articles') || '[]');
      const unread = filtered.filter((i) => !read.includes(i[1]));

      if (unread.length === 0) {
        container.innerHTML = '<p class="marquee-message">Semua artikel terkait sudah dibaca. 😊</p>';
        return;
      }

      unread.sort(() => 0.5 - Math.random());
      const sep = ' • ';
      const isMobile = isMobileDevice();

      const html = unread
      .map(([title, id, , , desc]) => {
        const url = getFullUrl(id, allData); // Menggunakan URL dinamis
        const tooltip = isMobile ? title : (desc || title);
        return `<a href="${url}" data-article-id="${id}" title="${tooltip}">${title}</a>${sep}`;
      })
      .join('');

      container.innerHTML = `<div class="marquee-content">${html.repeat(10)}</div>`;
      const mc = container.querySelector('.marquee-content');
      if (mc) {
        const w = mc.offsetWidth;
        const speed = isMobile ? 40 : 75;
        mc.style.animationDuration = `${w / 2 / speed}s`;
      }
      registerReadTracker();
    } catch (err) {
      console.error('Marquee Error:', err);
    }
  }

  // ---------------------------
  // 4. FLOATING SEARCH (DENGAN URL DINAMIS & ENTER REDIRECT)
  // ---------------------------
  function initFloatingSearch(allData) {
    const wrap = document.querySelector('.search-floating-container');
    const input = document.getElementById('floatingSearchInput');
    const clear = wrap?.querySelector('.clear-button');
    const results = wrap?.querySelector('.floating-results-container');
    if (!wrap || !input || !clear || !results) return;

    // Fungsi untuk lompat ke halaman pencarian utama
    const goToSearchPage = () => {
      const query = input.value.trim();
      if (query.length > 0) {
        window.location.href = `/search/?q=${encodeURIComponent(query)}`;
      }
    };

    input.addEventListener('input', () => {
      const v = input.value.trim();
      clear.style.display = v.length ? 'block' : 'none';

      const q = v.toLowerCase();
      // Tampilkan hasil instan jika minimal 3 karakter
      if (q.length < 3) { results.style.display = 'none'; return; }

      let matches = [];
      for (const cat in allData) {
        for (const item of allData[cat]) {
          if ((item[0] + ' ' + (item[4] || '')).toLowerCase().includes(q)) {
            matches.push(item);
          }
        }
      }

      if (matches.length > 0) {
        const topMatches = matches.slice(0, 5);
        const html = topMatches.map(item => `
        <a href="${getFullUrl(item[1], allData)}">
        <strong>${item[0]}</strong>
        <small>${item[4] ? item[4].substring(0, 60) + '...' : 'Lihat artikel'}</small>
        </a>
        `).join('');
        results.innerHTML = html;
        results.style.display = 'block';
      } else {
        results.innerHTML = `<div class="no-results">❌ Tidak ditemukan</div>`;
        results.style.display = 'block';
      }
    });

    // ⚡ FITUR BARU: Tekan ENTER untuk ke halaman pencarian
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Mencegah reload form default
        goToSearchPage();
      }
    });

    clear.addEventListener('click', () => {
      input.value = '';
      results.style.display = 'none';
      clear.style.display = 'none';
    });

    // Opsional: Klik luar untuk tutup hasil instan
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) results.style.display = 'none';
    });
  }

  // ---------------------------
  // 5. NAV ICONS (DENGAN URL DINAMIS)
  // ---------------------------
  function initNavIcons(allData, currentFile) {
    const catInfo = getCategoryInfo(currentFile, allData);
    if (!catInfo) return;

    const idx = catInfo.list.findIndex(a => a[1] === currentFile);
    const total = catInfo.list.length;
    const nextI = (idx - 1 + total) % total;
    const prevI = (idx + 1) % total;

    const nav = document.getElementById('dynamic-nav-container') || document.createElement('div');
    nav.id = 'dynamic-nav-container';
    nav.className = 'floating-nav';

    // Perbaikan: Link kategori sekarang ke /slug/ (Landing Page baru)
    nav.innerHTML = `
    <div class="nav-left">
    <a href="/${catInfo.slug}/" class="category-link visible">${catInfo.name}</a>
    </div>
    <div class="nav-right">
    <a href="/" title="Home" class="btn-emoji">🏠</a>
    <a href="/sitemap/" title="Daftar Isi" class="btn-emoji">📄</a>
    <a href="/feed/" title="RSS Feed" class="btn-emoji">📡</a>
    ${total > 1 ? `
      <a href="${getFullUrl(catInfo.list[prevI][1], allData)}" title="${catInfo.list[prevI][0]}" class="btn-emoji">⏩</a>
      <a href="${getFullUrl(catInfo.list[nextI][1], allData)}" title="${catInfo.list[nextI][0]}" class="btn-emoji">⏪</a>
      ` : ''}
      </div>`;

      if (!nav.parentElement) document.body.appendChild(nav);
  }

  // ---------------------------
  // 6. INTERNAL TOC & RELATED GRID
  // ---------------------------
  function initInternalNav() {
    const tocContainer = document.getElementById('internal-nav');
    if (!tocContainer) return;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
    .filter(h => h.innerText.trim().length > 0 && !h.closest('.floating-nav') && !tocContainer.contains(h) && !h.closest('#layar-kosong-header'));

    if (headings.length === 0) { tocContainer.style.display = 'none'; return; }

    let tocHtml = '<ul class="nav-list">';
    headings.forEach((h, i) => {
      if (!h.id) h.id = h.innerText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `section-${i}`;
      tocHtml += `<li class="nav-item nav-${h.tagName.toLowerCase()}"><a href="#${h.id}" class="nav-link">${h.innerText.trim()}</a></li>`;
    });
    tocContainer.innerHTML = tocHtml + '</ul>';
  }

  function initRelatedGrid(allData, currentFile) {
    const gridContainer = document.getElementById('related-articles-grid');
    if (!gridContainer) return;

    const catInfo = getCategoryInfo(currentFile, allData);
    if (!catInfo) { gridContainer.style.display = 'none'; return; }

    const related = catInfo.list.filter(i => i[1] !== currentFile).sort(() => 0.5 - Math.random()).slice(0, 6);

    gridContainer.innerHTML = related.map(([title, id, img]) => `
    <div class="rel-card-mini">
    <a href="${getFullUrl(id, allData)}">
    <div class="rel-img-mini"><img src="${img || '/thumbnail.webp'}" alt="${title}" loading="lazy" onerror="this.src='/thumbnail.webp'"></div>
    <div class="rel-info-mini"><h4>${title}</h4></div>
    </a>
    </div>
    `).join('');
  }

  // ---------------------------
  // 7. MAIN INITIALIZATION
  // ---------------------------
  async function initializeApp() {
    try {
      initInternalNav();
      initProgressBar();

      let data = null;
      const cache = sessionStorage.getItem('artikel_data_cache');
      if (cache) {
        data = JSON.parse(cache);
      } else {
        const res = await fetch('/artikel.json');
        if (!res.ok) throw new Error('Gagal memuat artikel.json');
        data = await res.json();
        sessionStorage.setItem('artikel_data_cache', JSON.stringify(data));
      }

      const currentFile = getCurrentFileName();
      initCategoryMarquee(data, currentFile);
      initRelatedGrid(data, currentFile);
      initFloatingSearch(data);
      initNavIcons(data, currentFile);
      adaptMarqueeTextColor();
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', adaptMarqueeTextColor);

    } catch (err) {
      console.error('Layar Kosong Init Error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }

})();
