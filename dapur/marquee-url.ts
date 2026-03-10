/**
 * =================================================================================
 * marquee-url.ts v7.1 (Fixed & Full Integrated)
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
// 2. UI COMPONENTS
// ---------------------------
function initProgressBar(): void {
  const bar = document.getElementById('progress');
  if (!bar) return;
  const onScroll = () => {
    const h = document.documentElement, b = document.body;
    const st = h.scrollTop || b.scrollTop, sh = h.scrollHeight || b.scrollHeight, ch = h.clientHeight;
    const max = sh - ch;
    bar.style.width = max > 0 ? (st / max) * 100 + '%' : '0%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

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
    const w = mc.offsetWidth;
    const speed = isMobile ? 40 : 75;
    mc.style.animationDuration = `${w / 2 / speed}s`;
  }
  registerReadTracker();
}

function initFloatingSearch(allData: any): void {
  const wrap = document.querySelector('.search-floating-container') as HTMLElement | null;
  const input = document.getElementById('floatingSearchInput') as HTMLInputElement | null;
  const clear = wrap?.querySelector('.clear-button') as HTMLElement | null;
  const results = wrap?.querySelector('.floating-results-container') as HTMLElement | null;

  if (!wrap || !input || !clear || !results) return;

  input.addEventListener('input', () => {
    const v = input.value.trim().toLowerCase();
    clear.style.display = v.length ? 'block' : 'none';
  if (v.length < 3) { results.style.display = 'none'; return; }

  let matches: any[] = [];
  for (const cat in allData) {
    for (const item of allData[cat]) {
      if ((item.title + ' ' + (item.description || '')).toLowerCase().includes(v)) {
        matches.push(item);
      }
    }
  }

  if (matches.length > 0) {
    results.innerHTML = matches.slice(0, 5).map(item => `
    <a href="${getFullUrl(item.id, allData)}">
    <strong>${item.title}</strong>
    <small>${item.description ? item.description.substring(0, 60) + '...' : 'Lihat artikel'}</small>
    </a>
    `).join('');
    results.style.display = 'block';
  } else {
    results.innerHTML = `<div class="no-results">❌ Tidak ditemukan</div>`;
    results.style.display = 'block';
  }
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      window.location.href = `/search/?q=${encodeURIComponent(input.value)}`;
    }
  });

  clear.addEventListener('click', () => {
    input.value = '';
    results.style.display = 'none';
    clear.style.display = 'none';
  });
}

function initNavIcons(allData: any, currentFile: string): void {
  const catInfo = getCategoryInfo(currentFile, allData);
  if (!catInfo) return;

  const idx = catInfo.list.findIndex((a: any) => a.id === currentFile);
  if (idx === -1) return;

  const total = catInfo.list.length;
  const nextI = (idx - 1 + total) % total;
  const prevI = (idx + 1) % total;

  let nav = document.getElementById('dynamic-nav-container');
  if (!nav) {
    nav = document.createElement('div');
    nav.id = 'dynamic-nav-container';
    nav.className = 'floating-nav';
    document.body.appendChild(nav);
  }

  nav.innerHTML = `
  <div class="nav-left"><a href="/${catInfo.slug}/" class="category-link visible">${catInfo.name}</a></div>
  <div class="nav-right">
  <a href="/" title="Home" class="btn-emoji">🏠</a>
  <a href="/sitemap/" title="Daftar Isi" class="btn-emoji">📄</a>
  <a href="/feed/" title="RSS Feed" class="btn-emoji">📡</a>
  ${total > 1 ? `
    <a href="${getFullUrl(catInfo.list[nextI].id, allData)}" title="${catInfo.list[nextI].title}" class="btn-emoji">⏩</a>
    <a href="${getFullUrl(catInfo.list[prevI].id, allData)}" title="${catInfo.list[prevI].title}" class="btn-emoji">⏪</a>
    ` : ''}
    </div>`;
}

function initInternalNav(): void {
  const tocContainer = document.getElementById('internal-nav');
  if (!tocContainer) return;
  const headings = Array.from(document.querySelectorAll('h2, h3, h4')) as HTMLElement[];
  const filtered = headings.filter(h => h.innerText.trim().length > 0 && !h.closest('.floating-nav') && !tocContainer.contains(h));

  if (filtered.length === 0) { tocContainer.style.display = 'none'; return; }

  tocContainer.innerHTML = '<ul class="nav-list">' + filtered.map((h, i) => {
    if (!h.id) h.id = h.innerText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `section-${i}`;
    return `<li class="nav-item nav-${h.tagName.toLowerCase()}"><a href="#${h.id}" class="nav-link">${h.innerText.trim()}</a></li>`;
  }).join('') + '</ul>';
}

function initRelatedGrid(allData: any, currentFile: string): void {
  const grid = document.getElementById('related-articles-grid');
  if (!grid) return;
  const catInfo = getCategoryInfo(currentFile, allData);
  if (!catInfo) { grid.style.display = 'none'; return; }

  const related = catInfo.list.filter((i: any) => i.id !== currentFile).sort(() => 0.5 - Math.random()).slice(0, 6);
  grid.innerHTML = related.map((item: any) => `
  <div class="rel-card-mini">
  <a href="${getFullUrl(item.id, allData)}">
  <div class="rel-img-mini"><img src="${item.image || '/thumbnail.webp'}" alt="${item.title}" loading="lazy" onerror="this.src='/thumbnail.webp'"></div>
  <div class="rel-info-mini"><h4>${item.title}</h4></div>
  </a>
  </div>
  `).join('');
}

// ---------------------------
// 3. MAIN INITIALIZATION
// ---------------------------
async function initializeApp(): Promise<void> {
  // Tunggu sampai provider siap
  while (!(window as any).siteDataProvider) await new Promise(r => setTimeout(r, 100));

  const data = await (window as any).siteDataProvider.getFor('marquee-url.ts');
  const currentFile = getCurrentFileName();

  if (data) {
    initInternalNav();
    initProgressBar();
    initCategoryMarquee(data, currentFile);
    initFloatingSearch(data);
    initNavIcons(data, currentFile);
    initRelatedGrid(data, currentFile);
    adaptMarqueeTextColor();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', adaptMarqueeTextColor);
  }
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initializeApp) : initializeApp();
})();