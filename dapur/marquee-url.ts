/**
 * =================================================================================
 * marquee-url.ts v7.0 (Optimized with siteDataProvider)
 * =================================================================================
 */

(function (): void {
  'use strict';

  // ---------------------------
  // 1. HELPER FUNCTIONS
  // ---------------------------
function isMobileDevice(): boolean {
  return (window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
}

function cleanSlug(id: string): string {
  return id ? id.replace(/\.html$/, '') : '';
}

function getCurrentFileName(): string {
  const path = window.location.pathname;
  let name = path.split('/').filter(Boolean).pop();
  if (!name || name === 'artikel') return '';
  return name.endsWith('.html') ? name : `${name}.html`;
}

// LOGIKA URL: Tetap mencari kategori untuk membangun path /kategori/slug/
function getFullUrl(fileName: string, allData: any): string {
  for (const [catName, articles] of Object.entries(allData)) {
    const catArticles = articles as any[];
    if (catArticles.some((a: any) => a.id === fileName)) {
      const catSlug = catName.toLowerCase().replace(/\s+/g, '-');
      return `/${catSlug}/${fileName.replace('.html', '')}/`;
    }
  }
  return `/${cleanSlug(fileName)}/`;
}

function getCategoryInfo(fileName: string, allData: any) {
  for (const [catName, articles] of Object.entries(allData)) {
    const catArticles = articles as any[];
    if (catArticles.some((a: any) => a.id === fileName)) {
      return {
        name: catName,
 slug: catName.toLowerCase().replace(/\s+/g, '-'),
 list: catArticles
      };
    }
  }
  return null;
}

function adaptMarqueeTextColor(): void {
  const container = document.getElementById('related-marquee-container');
  if (!container) return;
  const bg = getComputedStyle(document.body).backgroundColor;
  const [r, g, b] = (bg.match(/\d+/g) || ['0', '0', '0']).map(Number);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  container.classList.toggle('theme-light', luminance > 128);
}

function registerReadTracker(): void {
  const container = document.getElementById('related-marquee-container');
  if (!container) return;
  container.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (!link) return;
    const id = link.dataset.articleId;
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
// 3. MARQUEE
// ---------------------------
function initCategoryMarquee(data: any, currentFile: string): void {
  const container = document.getElementById('related-marquee-container');
  if (!container) return;

  const catInfo = getCategoryInfo(currentFile, data);
  if (!catInfo) return;

  const filtered = catInfo.list.filter((i: any) => i.id !== currentFile);
  const read = JSON.parse(localStorage.getItem('read_marquee_articles') || '[]');
  const unread = filtered.filter((i: any) => !read.includes(i.id));

  if (unread.length === 0) {
    container.innerHTML = '<p class="marquee-message">Semua artikel terkait sudah dibaca. 😊</p>';
    return;
  }

  unread.sort(() => 0.5 - Math.random());
  const isMobile = isMobileDevice();
  const html = unread.map(item => {
    const url = getFullUrl(item.id, data);
    const tooltip = isMobile ? item.title : (item.description || item.title);
    return `<a href="${url}" data-article-id="${item.id}" title="${tooltip}">${item.title}</a> • `;
  }).join('');

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
function initFloatingSearch(allData: any): void {
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

    let matches: any[] = [];
    // Mengakses data sebagai objek, bukan lagi array indeks
    for (const cat in allData) {
      for (const item of allData[cat]) {
        // Akses item.title dan item.description sesuai mapping di data-provider
        if ((item.title + ' ' + (item.description || '')).toLowerCase().includes(q)) {
          matches.push(item);
        }
      }
    }

    if (matches.length > 0) {
      const topMatches = matches.slice(0, 5);
      const html: string = topMatches.map(item => `
      <a href="${getFullUrl(item.id, allData)}">
      <strong>${item.title}</strong>
      <small>${item.description ? item.description.substring(0, 60) + '...' : 'Lihat artikel'}</small>
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
    input.focus();
  });

  document.addEventListener('click', (e: MouseEvent) => {
    if (!wrap.contains(e.target as Node)) results.style.display = 'none';
  });
}

// ---------------------------
// 5. NAV ICONS (DENGAN URL DINAMIS & OBJECT-BASED ACCESS)
// ---------------------------
function initNavIcons(allData: any, currentFile: string): void {
  const catInfo = getCategoryInfo(currentFile, allData);
  if (!catInfo) return;

  // Sekarang mengakses .id alih-alih [1]
  const idx = catInfo.list.findIndex((a: any) => a.id === currentFile);
  const total = catInfo.list.length;
  const nextI = (idx - 1 + total) % total;
  const prevI = (idx + 1) % total;

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
  <a href="${getFullUrl(catInfo.list[nextI].id, allData)}" title="${catInfo.list[nextI].title}" class="btn-emoji">⏩</a>
  <a href="${getFullUrl(catInfo.list[prevI].id, allData)}" title="${catInfo.list[prevI].title}" class="btn-emoji">⏪</a>
  ` : ''}
  </div>`;

  if (!nav.parentElement) document.body.appendChild(nav);
}

// ---------------------------
// 6. INTERNAL TOC & RELATED GRID
// ---------------------------
function initInternalNav(): void {
  const tocContainer = document.getElementById('internal-nav');
  if (!tocContainer) return;

  const headings = Array.from(document.querySelectorAll('h2, h3, h4')) as HTMLElement[];
  const filteredHeadings = headings.filter(h =>
  h.innerText.trim().length > 0 &&
  !h.closest('.floating-nav') &&
  !tocContainer.contains(h) &&
  !h.closest('#layar-kosong-header')
  );

  if (filteredHeadings.length === 0) {
    tocContainer.style.display = 'none';
    return;
  }

  let tocHtml = '<ul class="nav-list">';
filteredHeadings.forEach((h, i) => {
  if (!h.id) {
    h.id = h.innerText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `section-${i}`;
  }
  const level = h.tagName.toLowerCase();
  tocHtml += `
  <li class="nav-item nav-${level}">
  <a href="#${h.id}" class="nav-link">${h.innerText.trim()}</a>
  </li>`;
});
tocContainer.innerHTML = tocHtml + '</ul>';
}

function initRelatedGrid(allData: any, currentFile: string): void {
  const gridContainer = document.getElementById('related-articles-grid');
  if (!gridContainer) return;

  const catInfo = getCategoryInfo(currentFile, allData);
  if (!catInfo) {
    gridContainer.style.display = 'none';
return;
  }

  // Akses properti objek: item.id dan item.image
  const related = catInfo.list
  .filter((i: any) => i.id !== currentFile)
  .sort(() => 0.5 - Math.random())
  .slice(0, 6);

  gridContainer.innerHTML = related.map((item: any) => `
  <div class="rel-card-mini">
  <a href="${getFullUrl(item.id, allData)}">
  <div class="rel-img-mini">
  <img src="${item.image || '/thumbnail.webp'}" alt="${item.title}" loading="lazy" onerror="this.src='/thumbnail.webp'">
  </div>
  <div class="rel-info-mini"><h4>${item.title}</h4></div>
  </a>
  </div>
  `).join('');
}
// ---------------------------
// 7. MAIN INITIALIZATION
// ---------------------------
async function initializeApp(): Promise<void> {
  while (!(window as any).siteDataProvider) await new Promise(r => setTimeout(r, 100));

  // Mengambil data yang sudah dipetakan sesuai kebutuhan UI marquee
  const data = await (window as any).siteDataProvider.getFor('marquee-url.ts');
  const currentFile = getCurrentFileName();

  if (data) {
    initCategoryMarquee(data, currentFile);
    initFloatingSearch(data);
  }
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initializeApp) : initializeApp();
})();