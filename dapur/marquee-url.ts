// ----------------------------------------------------------
// FILE: /ext/marquee-url.ts
// Versi V6.9 (Clean URL & Dynamic Category Mapping) - TS Version
// Updated: 2026-03-01 (Converted to TypeScript)
// ----------------------------------------------------------

(function (): void {
  'use strict';

  // --- INTERFACES & TYPES ---
  // Struktur item: [Judul, ID/Filename, Image, Date, Description]
  type ArticleItem = [string, string, string?, string?, string?];

  interface AllData {
    [categoryName: string]: ArticleItem[];
  }

  interface CategoryInfo {
    name: string;
    slug: string;
    list: ArticleItem[];
  }

  // ---------------------------
  // 1. HELPER FUNCTIONS
  // ---------------------------

  function isMobileDevice(): boolean {
    return (
      window.innerWidth <= 768 ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  }

  // Membersihkan ID/Slug (menghapus .html jika ada)
  function cleanSlug(id: string): string {
    return id ? id.replace(/\.html$/, '') : '';
  }

  // Mendapatkan nama file saat ini (sebagai key pencarian di JSON)
  function getCurrentFileName(): string {
    const path: string = window.location.pathname;
    let name: string | undefined = path.split('/').filter(Boolean).pop();

    if (!name || name === 'artikel') return '';
    return name.endsWith('.html') ? name : `${name}.html`;
  }

  // Fungsi Sakti: Mencari URL Lengkap berdasarkan Nama File & Data JSON
  function getFullUrl(fileName: string, allData: AllData): string {
    for (const [catName, articles] of Object.entries(allData)) {
      if (articles.some((a: ArticleItem) => a[1] === fileName)) {
        const catSlug: string = catName.toLowerCase().replace(/\s+/g, '-');
        // Return URL Cantik: /gaya-hidup/nama-artikel/
        return `/${catSlug}/${fileName.replace('.html', '')}/`;
      }
    }
    return `/artikel/${cleanSlug(fileName)}`; // Fallback lama
  }

  // Mendapatkan Slug Kategori untuk Link Header Nav
  function getCategoryInfo(fileName: string, allData: AllData): CategoryInfo | null {
    for (const [catName, articles] of Object.entries(allData)) {
      if (articles.some((a: ArticleItem) => a[1] === fileName)) {
        return {
          name: catName,
          slug: catName.toLowerCase().replace(/\s+/g, '-'),
          list: articles
        };
      }
    }
    return null;
  }

  function adaptMarqueeTextColor(): void {
    const container: HTMLElement | null = document.getElementById('related-marquee-container');
    if (!container) return;
    const bg: string = getComputedStyle(document.body).backgroundColor;
    const [r, g, b]: number[] = (bg.match(/\d+/g) || ['0', '0', '0']).map(Number);
    const luminance: number = 0.299 * r + 0.587 * g + 0.114 * b;
    container.classList.toggle('theme-light', luminance > 128);
  }

  function registerReadTracker(): void {
    const container: HTMLElement | null = document.getElementById('related-marquee-container');
    if (!container) return;
    container.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (!link) return;
      const id: string | undefined = link.dataset.articleId;
      if (!id) return;

      const read: string[] = JSON.parse(localStorage.getItem('read_marquee_articles') || '[]');
      if (!read.includes(id)) {
        read.push(id);
        localStorage.setItem('read_marquee_articles', JSON.stringify(read));
      }
    });
  }

  // ---------------------------
  // 2. PROGRESS BAR
  // ---------------------------
  function initProgressBar(): void {
    const bar: HTMLElement | null = document.getElementById('progress');
    if (!bar) return;
    const onScroll = (): void => {
      const h: HTMLElement = document.documentElement;
      const b: HTMLElement = document.body;
      const scrollTop: number = h.scrollTop || b.scrollTop;
      const scrollHeight: number = h.scrollHeight || b.scrollHeight;
      const clientHeight: number = h.clientHeight;
      const max: number = scrollHeight - clientHeight;
      const perc: number = max > 0 ? (scrollTop / max) * 100 : 0;
      bar.style.width = perc + '%';
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------------------------
  // 3. MARQUEE (DENGAN URL DINAMIS)
  // ---------------------------
  function initCategoryMarquee(allData: AllData, currentFile: string): void {
    const container: HTMLElement | null = document.getElementById('related-marquee-container');
    if (!container) return;

    try {
      const catInfo = getCategoryInfo(currentFile, allData);
      if (!catInfo) return;

      const filtered: ArticleItem[] = catInfo.list.filter((i) => i[1] !== currentFile);
      const read: string[] = JSON.parse(localStorage.getItem('read_marquee_articles') || '[]');
      const unread: ArticleItem[] = filtered.filter((i) => !read.includes(i[1]));

      if (unread.length === 0) {
        container.innerHTML = '<p class="marquee-message">Semua artikel terkait sudah dibaca. 😊</p>';
        return;
      }

      unread.sort(() => 0.5 - Math.random());
      const sep: string = ' • ';
      const isMobile: boolean = isMobileDevice();

      const html: string = unread
        .map(([title, id, , , desc]) => {
          const url: string = getFullUrl(id, allData);
          const tooltip: string = isMobile ? title : (desc || title);
          return `<a href="${url}" data-article-id="${id}" title="${tooltip}">${title}</a>${sep}`;
        })
        .join('');

      container.innerHTML = `<div class="marquee-content">${html.repeat(10)}</div>`;
      const mc = container.querySelector('.marquee-content') as HTMLElement | null;
      if (mc) {
        const w: number = mc.offsetWidth;
        const speed: number = isMobile ? 40 : 75;
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
  function initFloatingSearch(allData: AllData): void {
    const wrap = document.querySelector('.search-floating-container') as HTMLElement | null;
    const input = document.getElementById('floatingSearchInput') as HTMLInputElement | null;
    const clear = wrap?.querySelector('.clear-button') as HTMLElement | null;
    const results = wrap?.querySelector('.floating-results-container') as HTMLElement | null;
    if (!wrap || !input || !clear || !results) return;

    const goToSearchPage = (): void => {
      const query: string = input.value.trim();
      if (query.length > 0) {
        window.location.href = `/search/?q=${encodeURIComponent(query)}`;
      }
    };

    input.addEventListener('input', () => {
      const v: string = input.value.trim();
      clear.style.display = v.length ? 'block' : 'none';

      const q: string = v.toLowerCase();
      if (q.length < 3) { results.style.display = 'none'; return; }

      let matches: ArticleItem[] = [];
      for (const cat in allData) {
        for (const item of allData[cat]) {
          if ((item[0] + ' ' + (item[4] || '')).toLowerCase().includes(q)) {
            matches.push(item);
          }
        }
      }

      if (matches.length > 0) {
        const topMatches = matches.slice(0, 5);
        const html: string = topMatches.map(item => `
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

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        goToSearchPage();
      }
    });

    clear.addEventListener('click', () => {
      input.value = '';
      results.style.display = 'none';
      clear.style.display = 'none';
    });

    document.addEventListener('click', (e: MouseEvent) => {
      if (!wrap.contains(e.target as Node)) results.style.display = 'none';
    });
  }

  // ---------------------------
  // 5. NAV ICONS (DENGAN URL DINAMIS)
  // ---------------------------
  function initNavIcons(allData: AllData, currentFile: string): void {
    const catInfo = getCategoryInfo(currentFile, allData);
    if (!catInfo) return;

    const idx: number = catInfo.list.findIndex(a => a[1] === currentFile);
    const total: number = catInfo.list.length;
    const nextI: number = (idx - 1 + total) % total;
    const prevI: number = (idx + 1) % total;

    const nav = (document.getElementById('dynamic-nav-container') || document.createElement('div')) as HTMLElement;
    nav.id = 'dynamic-nav-container';
    nav.className = 'floating-nav';

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
  function initInternalNav(): void {
    const tocContainer: HTMLElement | null = document.getElementById('internal-nav');
    if (!tocContainer) return;
    const headings: HTMLElement[] = Array.from(document.querySelectorAll('h1, h2, h3, h4')) as HTMLElement[];

    const filteredHeadings = headings.filter(h =>
      h.innerText.trim().length > 0 &&
      !h.closest('.floating-nav') &&
      !tocContainer.contains(h) &&
      !h.closest('#layar-kosong-header')
    );

    if (filteredHeadings.length === 0) { tocContainer.style.display = 'none'; return; }

    let tocHtml: string = '<ul class="nav-list">';
    filteredHeadings.forEach((h, i) => {
      if (!h.id) h.id = h.innerText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `section-${i}`;
      tocHtml += `<li class="nav-item nav-${h.tagName.toLowerCase()}"><a href="#${h.id}" class="nav-link">${h.innerText.trim()}</a></li>`;
    });
    tocContainer.innerHTML = tocHtml + '</ul>';
  }

  function initRelatedGrid(allData: AllData, currentFile: string): void {
    const gridContainer: HTMLElement | null = document.getElementById('related-articles-grid');
    if (!gridContainer) return;

    const catInfo = getCategoryInfo(currentFile, allData);
    if (!catInfo) { gridContainer.style.display = 'none'; return; }

    const related: ArticleItem[] = catInfo.list
      .filter(i => i[1] !== currentFile)
      .sort(() => 0.5 - Math.random())
      .slice(0, 6);

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
  async function initializeApp(): Promise<void> {
    try {
      initInternalNav();
      initProgressBar();

      let data: AllData | null = null;
      const cache: string | null = sessionStorage.getItem('artikel_data_cache');

      if (cache) {
        data = JSON.parse(cache);
      } else {
        const res: Response = await fetch('/artikel.json');
        if (!res.ok) throw new Error('Gagal memuat artikel.json');
        data = await res.json();
        sessionStorage.setItem('artikel_data_cache', JSON.stringify(data));
      }

      if (data) {
        const currentFile: string = getCurrentFileName();
        initCategoryMarquee(data, currentFile);
        initRelatedGrid(data, currentFile);
        initFloatingSearch(data);
        initNavIcons(data, currentFile);
        adaptMarqueeTextColor();
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', adaptMarqueeTextColor);
      }

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
