// ----------------------------------------------------------
// FILE: /ext/marquee-url.js
// Versi Final (Refactored) — Logic & Performance Tuned
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

  // Mendapatkan nama file saat ini
  function getCurrentFileName() {
    const path = window.location.pathname;
    // Jika path diakhiri .html, ambil namanya. Jika folder, ambil segmen terakhir + .html
    const name = path.endsWith('.html')
    ? path.split('/').pop()
    : `${path.replace(/\/$/, '').split('/').pop()}.html`;
    return name;
  }

  // Adaptasi warna teks marquee berdasarkan background body
  function adaptMarqueeTextColor() {
    const container = document.getElementById('related-marquee-container');
    if (!container) return;
    const bg = getComputedStyle(document.body).backgroundColor;
    const [r, g, b] = (bg.match(/\d+/g) || [0, 0, 0]).map(Number);
    // Rumus Luminance: jika terang (>128), teks jadi gelap
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    container.classList.toggle('theme-light', luminance > 128);
  }

  // Tracker artikel yang sudah dibaca (disimpan di LocalStorage)
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
    // Jalankan sekali di awal untuk antisipasi reload di tengah halaman
    onScroll();
  }

  // ---------------------------
  // 3. MARQUEE (RUNNING TEXT)
  // ---------------------------
  function initCategoryMarquee(allData, currentFile) {
    const container = document.getElementById('related-marquee-container');
    if (!container) return;

    try {
      let list = [];
      // Cari kategori artikel saat ini
      for (const cat in allData) {
        if (allData[cat].some((item) => item[1] === currentFile)) {
          list = allData[cat];
          break;
        }
      }

      if (list.length === 0) return;

      // Filter: Jangan tampilkan artikel yang sedang dibuka
      const filtered = list.filter((i) => i[1] !== currentFile);

      // Filter: Cek artikel yang sudah dibaca user
      const read = JSON.parse(localStorage.getItem('read_marquee_articles') || '[]');
      const unread = filtered.filter((i) => !read.includes(i[1]));

      if (unread.length === 0) {
        container.innerHTML = '<p class="marquee-message">Semua artikel terkait sudah dibaca. 😊</p>';
        return;
      }

      // Acak urutan biar nggak bosan
      unread.sort(() => 0.5 - Math.random());

      const sep = ' • ';
      const isMobile = isMobileDevice();

      const html = unread
      .map(([title, id, , , desc]) => {
        const url = `/artikel/${cleanSlug(id)}`;
        const tooltip = isMobile ? title : (desc || title);
        return `<a href="${url}" data-article-id="${id}" title="${tooltip}">${title}</a>${sep}`;
      })
      .join('');

      // Render dengan duplikasi agar loop mulus (infinite scroll)
      container.innerHTML = `<div class="marquee-content">${html.repeat(10)}</div>`;

      // Atur kecepatan animasi berdasarkan panjang konten
      const mc = container.querySelector('.marquee-content');
      if (mc) {
        const w = mc.offsetWidth;
        const speed = isMobile ? 40 : 75; // Pixel per detik
        mc.style.animationDuration = `${w / 2 / speed}s`;
      }

      registerReadTracker();
    } catch (err) {
      console.error('Marquee Error:', err);
    }
  }

  // ---------------------------
  // 4. FLOATING SEARCH (UPGRADED)
  // ---------------------------
  function floatingSearchResults(query, data) {
    const container = document.querySelector('.floating-results-container');
    if (!container) return;

    container.innerHTML = '';
    const q = query.trim().toLowerCase();

    if (q.length < 3) {
      container.style.display = 'none';
      return;
    }

    let matches = [];
    const limit = 5; // Batasi hasil biar UI gak kepanjangan

    // Loop mencari kecocokan judul atau deskripsi
    for (const cat in data) {
      for (const item of data[cat]) {
        // item structure: [title, id, image, date, description]
        const title = item[0] || '';
        const desc = item[4] || '';
        const textToSearch = (title + ' ' + desc).toLowerCase();

        if (textToSearch.includes(q)) {
          matches.push(item);
        }
      }
    }

    // Tampilkan hasil
    if (matches.length > 0) {
      // Ambil 5 teratas saja
      const topMatches = matches.slice(0, limit);

      const html = topMatches.map(item => {
        const title = item[0];
        const id = item[1];
        const desc = item[4] ? item[4].substring(0, 60) + '...' : 'Lihat artikel';
        return `
        <a href="/artikel/${cleanSlug(id)}">
        <strong>${title}</strong>
        <small>${desc}</small>
        </a>
        `;
      }).join('');

      // Tambahkan tombol "Lihat semua" jika hasil banyak
      const seeAll = matches.length > limit
      ? `<a href="https://dalam.web.id/search?q=${encodeURIComponent(q)}" style="text-align:center; font-weight:bold; color:#00b0ed;">Lihat semua (${matches.length}) hasil &rarr;</a>`
      : '';

      container.innerHTML = html + seeAll;
    } else {
      container.innerHTML = `<div class="no-results">❌ Tidak ditemukan "<strong>${q}</strong>"</div>`;
    }

    container.style.display = 'block';
  }

  function initFloatingSearch(allData) {
    const wrap = document.querySelector('.search-floating-container');
    const input = document.getElementById('floatingSearchInput');
    const clear = wrap?.querySelector('.clear-button');
    const results = wrap?.querySelector('.floating-results-container');

    if (!wrap || !input || !clear || !results) return;

    clear.innerHTML = '❌';

    // Event saat mengetik
    input.addEventListener('input', () => {
      const v = input.value.trim();
      clear.style.display = v.length ? 'block' : 'none';
      floatingSearchResults(v, allData);
    });

    // Tombol Clear
    clear.addEventListener('click', () => {
      input.value = '';
      clear.style.display = 'none';
      results.style.display = 'none';
      input.focus();
    });

    // Tekan Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = input.value.trim();
        if (q.length >= 3) {
          window.location.href = `https://dalam.web.id/search?q=${encodeURIComponent(q)}`;
        }
      }
    });

    // Klik di luar area search menutup hasil
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) results.style.display = 'none';
    });
  }

  // ---------------------------
  // 5. NAV ICONS & TOC
  // ---------------------------
  function initNavIcons(data, currentFile) {
    let list = [], idx = -1, catName = null;

    // Cari artikel ini ada di kategori mana
    for (const [cat, arts] of Object.entries(data)) {
      const i = arts.findIndex(a => a[1] === currentFile);
      if (i !== -1) {
        list = arts;
        idx = i;
        catName = cat;
        break;
      }
    }

    if (idx === -1) return; // Artikel tidak ditemukan di DB

    const total = list.length;
    const nextI = (idx - 1 + total) % total;
    const prevI = (idx + 1) % total;
    const getUrl = (f) => `/artikel/${cleanSlug(f)}`;

    const nav = document.getElementById('dynamic-nav-container') || document.createElement('div');
    nav.id = 'dynamic-nav-container';
    nav.className = 'floating-nav';

    // Format Kategori URL Friendly
    const catSlug = catName.toLowerCase().replace(/\s+/g, '-');

    nav.innerHTML = `
    <div class="nav-left">
    <a href="/artikel/-/${catSlug}" class="category-link visible">${catName}</a>
    </div>
    <div class="nav-right">
    <a href="/" title="Home" class="btn-emoji">🏠</a>
    <a href="/sitemap/" title="Daftar Isi" class="btn-emoji">📄</a>
    <a href="/feed/" title="RSS Feed" class="btn-emoji">📡</a>
    ${total > 1 ? `
      <a href="${getUrl(list[nextI][1])}" title="${list[nextI][0]}" class="btn-emoji">⏩</a>
      <a href="${getUrl(list[prevI][1])}" title="${list[prevI][0]}" class="btn-emoji">⏪</a>
      ` : ''}
      </div>`;

      if (!nav.parentElement) document.body.appendChild(nav);
  }

  // Internal Table of Contents (Daftar Isi)
  function initInternalNav() {
    const tocContainer = document.getElementById('internal-nav');
    if (!tocContainer) return;

    // Ambil semua heading h1-h4
    // Filter: Harus punya teks, bukan di dalam nav, dan bukan header logo
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
    .filter(h => {
      const hasText = h.innerText.trim().length > 0;
      const isNotInsideNav = !h.closest('.floating-nav') && !tocContainer.contains(h);
      const isNotHeader = !h.closest('#layar-kosong-header');
      // Opsional: Filter H1 jika itu adalah Judul Postingan Utama (biasanya cuma 1)
      // const isNotMainTitle = !h.classList.contains('entry-title');
      return hasText && isNotInsideNav && isNotHeader;
    });

    if (headings.length === 0) {
      tocContainer.style.display = 'none';
      return;
    }

    tocContainer.style.display = 'block';

    let tocHtml = '<ul class="nav-list">';
    headings.forEach((h, i) => {
      // Generate ID jika belum ada
      if (!h.id) {
        // Buat ID yang ramah URL dari teks heading
        const slug = h.innerText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        h.id = slug || `section-${i}`;
      }

      const tag = h.tagName.toLowerCase();
      const text = h.innerText.trim();

      tocHtml += `
      <li class="nav-item nav-${tag}">
      <a href="#${h.id}" class="nav-link">${text}</a>
      </li>`;
    });
    tocHtml += '</ul>';

    tocContainer.innerHTML = tocHtml;
  }

  // ---------------------------
  // 6. RELATED GRID
  // ---------------------------
  function initRelatedGrid(allData, currentFile) {
    const gridContainer = document.getElementById('related-articles-grid');
    if (!gridContainer) return;

    let list = [];
    for (const cat in allData) {
      if (allData[cat].some((item) => item[1] === currentFile)) {
        list = allData[cat].filter((i) => i[1] !== currentFile);
        break;
      }
    }

    if (list.length === 0) {
      gridContainer.style.display = 'none';
      return;
    }

    // Acak dan ambil 6 item
    const related = list.sort(() => 0.5 - Math.random()).slice(0, 6);

    gridContainer.innerHTML = related.map(([title, id, img]) => {
      return `
      <div class="rel-card-mini">
      <a href="/artikel/${cleanSlug(id)}">
      <div class="rel-img-mini">
      <img src="${img || '/thumbnail.webp'}" alt="${title}" loading="lazy" onerror="this.src='/thumbnail.webp'">
      </div>
      <div class="rel-info-mini">
      <h4>${title}</h4>
      </div>
      </a>
      </div>
      `;
    }).join('');
  }

  // ---------------------------
  // 7. MAIN INITIALIZATION
  // ---------------------------
  async function initializeApp() {
    try {
      // 1. Setup Internal TOC (tidak butuh JSON eksternal)
      initInternalNav();

      // 2. Setup Progress Bar
      initProgressBar();

      // 3. Load Data Artikel
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

      // 4. Jalankan fitur berbasis data
      initCategoryMarquee(data, currentFile);
      initRelatedGrid(data, currentFile);
      initFloatingSearch(data);
      initNavIcons(data, currentFile);

      // 5. Setup Theme Listener
      adaptMarqueeTextColor();
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', adaptMarqueeTextColor);

    } catch (err) {
      console.error('Layar Kosong Init Error:', err);
    }
  }

  // Jalankan saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }

})();


/**
 * Global Theme Toggle Script for Layar Kosong
 * Fitur: Dark Mode, Auto-Hide (>80px), LocalStorage Memory, Font Awesome Support
 */

(function() {
  // 1. INJECT CSS KE DALAM HEAD
  const css = `
  :root {
    --tk-bg: #ffffff;
    --tk-text: #1e293b;
    --tk-border: #e2e8f0;
    --tk-shadow: rgba(0,0,0,0.1);
  }
  .dark {
    --tk-bg: #0f172a;
    --tk-text: #f1f5f9;
    --tk-border: #334155;
    --tk-shadow: rgba(0,0,0,0.3);
  }
  .theme-toggle-btn {
    position: fixed;
    top: 70px;
    right: 20px;
    z-index: 99999;
    padding: 10px 18px;
    border-radius: 50px;
    cursor: pointer;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--tk-border);
    background: var(--tk-bg);
    color: var(--tk-text);
    box-shadow: 0 4px 15px var(--tk-shadow);
    transition: all 0.4s ease-in-out;
    opacity: 1;
    visibility: visible;
  }
  .theme-toggle-btn.hidden-btn {
    opacity: 0;
    visibility: hidden;
    transform: translateY(-20px);
  }
  .theme-toggle-btn:hover {
    transform: scale(1.05);
    border-color: #dc2626;
  }
  @media (max-width: 600px) {
    .theme-toggle-btn { top: 70px; right: 20px; }
  }
  `;

  const styleHead = document.createElement('style');
  styleHead.innerHTML = css;
  document.head.appendChild(styleHead);

  // 2. INJECT TOMBOL KE DALAM BODY
  const btn = document.createElement('button');
  btn.className = 'theme-toggle-btn';
  btn.setAttribute('aria-label', 'Ganti Tema');
  btn.innerHTML = '<i class="fas fa-circle-half-stroke"></i> <span>Ganti Tema</span>';
  document.body.appendChild(btn);

  // 3. LOGIKA DARK MODE & MEMORY
  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  };

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  btn.addEventListener('click', toggleDarkMode);

  // 4. LOGIKA AUTO-HIDE (Scroll > 80px)
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      btn.classList.add('hidden-btn');
    } else {
      btn.classList.remove('hidden-btn');
    }
  });

  // Jalankan Inisialisasi
  initTheme();
})();