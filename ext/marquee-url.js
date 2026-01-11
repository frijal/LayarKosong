// ---------------------------
// ---------------------------
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

  // --- DARK MODE INITIALIZATION ---
  function initDarkMode() {
    const darkSwitch = document.getElementById('darkSwitch')
    const saved = localStorage.getItem('darkMode')

    function setDarkMode(isDark) {
      if (isDark) document.body.classList.add('dark-mode')
        else document.body.classList.remove('dark-mode')
          if (darkSwitch) darkSwitch.checked = isDark
    }

    if (saved !== null) {
      setDarkMode(saved === 'true')
    } else {
      setDarkMode(
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches,
      )
    }

    if (darkSwitch) {
      darkSwitch.addEventListener('change', () => {
        localStorage.setItem('darkMode', darkSwitch.checked)
        setDarkMode(darkSwitch.checked)
      })
    }
  }

  // --- TITIPAN: PROGRESS BAR ---
  function initProgressBar() {
    const bar = document.getElementById('progress');
    if (!bar) return; // Supaya gak error kalau elemennya gak ada

    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const perc = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = perc + '%';
    };

    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Jalankan sekali saat load
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
    ? `<div style="padding:12px 15px; font-size:14px;">💡 Ada <strong>${hits}</strong> kata tentang "<strong>${query}</strong>"</div>`
    : `<div style="padding:12px 15px; font-size:14px;">❌ Tidak ditemukan kata "<strong>${query}</strong>"</div>`;
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
          window.location.href = `https://dalam.web.id/search?q=${encodeURIComponent(q)}`;
        }
      }
    });

    results.addEventListener('click', () => {
      const q = input.value.trim();
      if (q.length >= 3) {
        window.location.href = `https://dalam.web.id/search?q=${encodeURIComponent(q)}`;
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
    let list = [], idx = -1, catName = null;

    // 1. Cari data
    for (const [cat, arts] of Object.entries(data)) {
      const i = arts.findIndex(a => a[1] === currentFile);
      if (i !== -1) { [list, idx, catName] = [arts, i, cat]; break; }
    }
    if (idx === -1) return;

    // 2. Siapkan navigasi
    const total = list.length;
    const nextI = (idx - 1 + total) % total;
    const prevI = (idx + 1) % total;
    const getUrl = (f) => `/artikel/${f.replace('.html', '')}`;

    // 3. Render Instant ke satu DIV Utama
    const nav = document.getElementById('dynamic-nav-container') || document.createElement('div');
    nav.id = 'dynamic-nav-container';
    nav.className = 'floating-nav';

    nav.innerHTML = `
    <div class="nav-left">
    <a href="/artikel/-/${catName.toLowerCase().replace(/\s+/g, '-')}" class="category-link visible">${catName}</a>
    </div>
    <div class="nav-right">
    <a href="/" title="Home" class="btn-emoji">🏠</a>
    <a href="/sitemap.html" title="Daftar Isi" class="btn-emoji">📄</a>
    <a href="/feed.html" title="RSS Feed" class="btn-emoji">📡</a>
    ${total > 1 ? `
      <a href="${getUrl(list[nextI][1])}" title="${list[nextI][0]}" class="btn-emoji">⏩</a>
      <a href="${getUrl(list[prevI][1])}" title="${list[prevI][0]}" class="btn-emoji">⏪</a>
      ` : ''}
      </div>`;

      if (!nav.parentElement) document.body.appendChild(nav);
  }

  // ----------------------------------
  // Internal TOC
  // ----------------------------------
  function initInternalNav() {
    // Jalankan hanya setelah DOM siap sepenuhnya
    const runScan = () => {
      const tocContainer = document.getElementById('internal-nav');
      if (!tocContainer) return;

      // 1. Scan headings, tapi filter yang bener-bener punya teks
      // Kita juga kecualikan logo "Layar Kosong" kalau dia pake tag heading
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
      .filter(h => {
        const hasText = h.innerText.trim().length > 0;
        const isNotInsideNav = !tocContainer.contains(h) && !h.closest('.floating-nav');
        const isNotLogo = !h.closest('#layar-kosong-header');
        return hasText && isNotInsideNav && isNotLogo;
      });

      // 2. Jika tidak ada heading yang valid, sembunyikan container
      if (headings.length === 0) {
        tocContainer.style.display = 'none';
        return;
      }

      // Pastikan container terlihat (jika sebelumnya kena display:none)
      tocContainer.style.display = 'block';

      // 3. Bangun HTML List
      let tocHtml = '<ul class="nav-list">';
      headings.forEach((h, i) => {
        // Buat ID unik berdasarkan urutan jika belum ada
        if (!h.id) {
          h.id = 'section-' + i;
        }

        const tag = h.tagName.toLowerCase();
        const text = h.innerText.trim();

        tocHtml += `
        <li class="nav-item nav-${tag}">
        <a href="#${h.id}" class="nav-link">${text}</a>
        </li>`;
      });
      tocHtml += '</ul>';

      // 4. Suntikkan ke DOM
      tocContainer.innerHTML = tocHtml;
    };

    // Pastikan script nunggu browser selesai loading HTML
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runScan);
    } else {
      runScan();
    }
  }

  // Panggil fungsinya
  initInternalNav();

  // ---------------------------
  // RELATED GRID
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

    const related = list.sort(() => 0.6 - Math.random()).slice(0, 6);

    if (related.length === 0) {
      gridContainer.style.display = 'none';
      return;
    }

    gridContainer.innerHTML = related.map(([title, id, img]) => {
      // Menghilangkan .html dari ID jika ada
      const cleanId = id.replace('.html', '');

      return `
      <div class="rel-card-mini">
      <a href="/artikel/${cleanId}">
      <div class="rel-img-mini">
      <img src="${img || '/thumbnail.webp'}" alt="${title}" onerror="this.src='/thumbnail.webp'">
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

      // Panggil semua fungsi
      initDarkMode(); // <--- Dark mode initialization
      initProgressBar();
      initCategoryMarquee(data, current);
      initRelatedGrid(data, current);
      initFloatingSearch(data);
      initNavIcons(data, current);
      adaptMarqueeTextColor();

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', adaptMarqueeTextColor);
    } catch (err) {
      console.error('Init Error:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', initializeApp);
})();
