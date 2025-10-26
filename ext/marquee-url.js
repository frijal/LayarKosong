/**
 * ===============================================================
 * SKRIP GABUNGAN v8.5 — Marquee, Floating Search, dan Navigasi
 * ===============================================================
 * ✅ Aman untuk Cloudflare Pages (Pretty URLs)
 * ✅ Fetch artikel.json hanya sekali + cache sessionStorage
 * ✅ Pencarian cepat, ringan, auto-hide + klik hasil = enter
 * ✅ Navigasi prev/next per kategori
 * ✅ Warna marquee adaptif (dark/light)
 * ===============================================================
 */

(function () {
  'use strict';

  // ---------------------------
  // HELPER FUNCTIONS
  // ---------------------------

  function isMobileDevice() {
    return (
      window.innerWidth <= 768 ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
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
  // MARQUEE
  // ---------------------------

  function initCategoryMarquee(allData, currentFile) {
    const container = document.getElementById('related-marquee-container');
    if (!container) return;
    try {
      let targetCat = null;
      let list = [];

      for (const cat in allData) {
        if (allData[cat].some((item) => item[1] === currentFile)) {
          targetCat = cat;
          list = allData[cat];
          break;
        }
      }

      if (!targetCat) return;

      const filtered = list.filter((i) => i[1] !== currentFile);
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
          const url = `/artikel/${id}`;
          const tip = isMobile ? title : desc || title;
          return `<a href="${url}" data-article-id="${id}" title="${tip}">${title}</a>${sep}`;
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
  // FLOATING SEARCH
  // ---------------------------

  function floatingSearchResults(query, data) {
    const container = document.querySelector('.floating-results-container');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'none';
    const q = query.trim().toLowerCase();
    if (q.length < 3) return;

    let hits = 0;
    for (const cat in data) {
      for (const item of data[cat]) {
        const txt = [item[0], item[4]].filter(Boolean).join(' ');
        const m = txt.toLowerCase().match(new RegExp(q, 'g'));
        if (m) hits += m.length;
      }
    }

    container.innerHTML = hits
      ? `<div style="padding:12px 15px; font-size:14px;">💡 Ada <strong>${hits}</strong> kata tentang “<strong>${query}</strong>”</div>`
      : `<div style="padding:12px 15px; font-size:14px;">❌ Tidak ditemukan kata “<strong>${query}</strong>”</div>`;
    container.style.display = 'block';
  }

  function initFloatingSearch(allData) {
    const wrap = document.querySelector('.search-floating-container');
    const input = document.getElementById('floatingSearchInput');
    const clear = wrap?.querySelector('.clear-button');
    const results = wrap?.querySelector('.floating-results-container');
    if (!wrap || !input || !clear || !results) return;

    clear.innerHTML = '❌';

    input.addEventListener('input', () => {
      const v = input.value.trim();
      clear.style.display = v.length ? 'block' : 'none';
      floatingSearchResults(v, allData);
    });

    clear.addEventListener('click', () => {
      input.value = '';
      clear.style.display = 'none';
      results.style.display = 'none';
      input.focus();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = input.value.trim();
        if (q.length >= 3) {
          window.location.href = `https://frijal.pages.dev/search?q=${encodeURIComponent(q)}`;
        }
      }
    });

    results.addEventListener('click', () => {
      const q = input.value.trim();
      if (q.length >= 3) {
        window.location.href = `https://frijal.pages.dev/search?q=${encodeURIComponent(q)}`;
      }
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) results.style.display = 'none';
    });
  }

  // ---------------------------
  // NAV ICONS
  // ---------------------------

  function initNavIcons(data, currentFile) {
    function slugify(name) {
      return name
        .replace(/^[^\w\s]*/, '')
        .trim()
        .toLowerCase()
        .replace(/ & /g, '-and-')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }

    let list = [];
    let idx = -1;
    let catName = null;

    for (const [cat, arts] of Object.entries(data)) {
      arts.sort((a, b) => new Date(b[3]) - new Date(a[3]));
      const i = arts.findIndex((a) => a[1] === currentFile);
      if (i !== -1) {
        list = arts;
        idx = i;
        catName = cat;
        break;
      }
    }

    const nav = document.createElement('div');
    nav.className = 'floating-nav';
    nav.innerHTML = `
      <div class="nav-left"><a id="category-link" class="category-link"></a></div>
      <div class="nav-right">
        <a href="https://frijal.pages.dev" title="Home" class="btn-emoji">🏠</a>
        <a href="https://frijal.pages.dev/sitemap.html" title="Daftar Isi" class="btn-emoji">📄</a>
        <a href="https://frijal.pages.dev/feed.html" title="Update harian" class="btn-emoji">📡</a>
        <a id="next-article" class="btn-emoji">⏩</a>
        <a id="prev-article" class="btn-emoji">⏪</a>
      </div>`;
    document.body.appendChild(nav);

    const catLink = document.getElementById('category-link');
    const prev = document.getElementById('prev-article');
    const next = document.getElementById('next-article');

    // Ganti bagian di atas dengan ini:
    if (catLink && catName) {
    catLink.textContent = catName;
    catLink.href = `/artikel/-/${slugify(catName)}`;
    catLink.title = `Kategori: ${catName}`;
    // Anda bahkan bisa menambahkan efek animasi di sini jika mau
    // setTimeout(() => catLink.classList.add('visible'), 100);
    } else if (catLink) {
    catLink.style.display = 'none'; // Sembunyikan jika kategori tidak ada
    }
    // Ganti bagian di atas dengan ini:
    
    const total = list.length;
    if (total <= 1) {
      prev.style.display = 'none';
      next.style.display = 'none';
      return;
    }

    const nextI = (idx + 1) % total;
    const prevI = (idx - 1 + total) % total;
    next.href = `/artikel/${list[nextI][1]}`;
    next.title = list[nextI][0];
    prev.href = `/artikel/${list[prevI][1]}`;
    prev.title = list[prevI][0];
  }

  // ---------------------------
  // MAIN INIT
  // ---------------------------

  async function initializeApp() {
    try {
      let data = null;
      const cache = sessionStorage.getItem('artikel_data_cache');
      if (cache) data = JSON.parse(cache);
      else {
        const res = await fetch('/artikel.json');
        if (!res.ok) throw new Error('Gagal memuat artikel.json');
        data = await res.json();
        sessionStorage.setItem('artikel_data_cache', JSON.stringify(data));
      }

      const path = window.location.pathname;
      const current = path.endsWith('.html')
        ? path.split('/').pop()
        : `${path.replace(/\/$/, '').split('/').pop()}.html`;

      initCategoryMarquee(data, current);
      initFloatingSearch(data);
      initNavIcons(data, current);
      adaptMarqueeTextColor();
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', adaptMarqueeTextColor);
    } catch (err) {
      console.error('Init Error:', err);
      const input = document.getElementById('floatingSearchInput');
      if (input) {
        input.placeholder = 'Gagal memuat data';
        input.disabled = true;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', initializeApp);
})();

