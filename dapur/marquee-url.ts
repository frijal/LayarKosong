/**
 * =================================================================================
 * marquee-url.ts v7.5 (Resilient Core - Canonical URL Path Extraction Fallback)
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
      return `/${catSlug}/${fileName.replace('.html', '')}`;
    }
  }
  return `/${cleanSlug(fileName)}`;
}

/**
 * Mengambil informasi kategori artikel.
 * Diperbarui dengan ekstraksi path URL Canonical untuk menjamin kecocokan key JSON 100%.
 */
function getCategoryInfo(fileName: string, allData: any) {
  // 1. Cari di Database Terdekat (Top 30 Kategori Terbaru)
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

  // 2. FALLBACK 100% AMAN: Ekstrak slug kategori langsung dari URL Canonical!
  const canonicalTag = document.querySelector('link[rel="canonical"]');
  if (canonicalTag) {
    const canonicalUrl = canonicalTag.getAttribute('href');
    if (canonicalUrl) {
      try {
        const urlObj = new URL(canonicalUrl);
        // Pecah URL path (misal: /sistem-terbuka/ubuntu-jogja) menjadi segmen array
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);

        if (pathSegments.length > 0) {
          const catSlug = pathSegments[0]; // Berhasil mengambil "sistem-terbuka", "lainnya", dll.

          // COCOKKAN: Cari apakah slug dari URL ini terdaftar sebagai key di JSON
          if (allData[catSlug]) {
            const metaSection = document.querySelector('meta[property="article:section"]');
            const prettyName = metaSection ? metaSection.getAttribute('content') : catSlug;

            return {
              name: prettyName, // Menampilkan teks cantik "Linux, Open Source" di UI
              slug: catSlug,    // Menjaga link rujukan ke "/sistem-terbuka" tetap akurat
              list: allData[catSlug] as any[] // Mengambil 30 artikel rekomendasi pendukung
            };
          }
        }
      } catch (e) {
        console.error("❌ Gagal memproses URL Canonical:", e);
      }
    }
  }

  return null;
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
// 2. UI COMPONENTS & FEATURES
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

function initFloatingSearch(): void {
  const wrap = document.querySelector('.search-floating-container') as HTMLElement | null;
  const input = document.getElementById('floatingSearchInput') as HTMLInputElement | null;
  const clear = wrap?.querySelector('.clear-button') as HTMLElement | null;
  const results = wrap?.querySelector('.floating-results-container') as HTMLElement | null;

  if (!wrap || !input || !clear || !results) return;

  if (!clear.innerHTML.trim()) {
    clear.innerHTML = '❌';
  }

  let debounceTimer: ReturnType<typeof setTimeout>;

  const escapeHTML = (str: string) => {
    return str.replace(/[&<>'"]/g,
                       tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  };

  input.addEventListener('input', () => {
    const v = input.value.trim();
    clear.style.display = v.length ? 'block' : 'none';

  if (v.length < 3) {
    results.style.display = 'none';
    return;
  }

  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    try {
      results.innerHTML = `<div class="no-results">⏳ Memindai data...</div>`;
      results.style.display = 'block';

      const safeQuery = encodeURIComponent(v);
      const apiUrl = `/cari?q=${safeQuery}&page=1&limit=10`;

      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data = await response.json();
      const matches = data.results || data.data || [];

      if (matches.length > 0) {
        results.innerHTML = matches.map((item: any) => {
          const fileSlug = item.id ? item.id.replace('.html', '') : 'tanpa-judul';
          const categoryName = item.category || 'Lainnya';
          const catSlug = categoryName.toLowerCase().replace(/\s+/g, '-');
          const url = `/${catSlug}/${fileSlug}`;

          const snippet = item.snippet_text
          ? item.snippet_text.substring(0, 60) + '...'
          : 'Lihat artikel selengkapnya';

        return `
        <a href="${url}">
        <strong>${escapeHTML(item.title || 'Tanpa Judul')}</strong>
        <small>${escapeHTML(snippet)}</small>
        </a>
        `;
        }).join('');
      } else {
        results.innerHTML = `<div class="no-results">❌ Pencarian "${escapeHTML(v)}" nihil. Tekan Enter untuk detail.</div>`;
      }
    } catch (err) {
      console.error("❌ Gagal fetch Floating Search D1:", err);
      results.innerHTML = `<div class="no-results">⚠️ Ups, database sedang sibuk. Coba sesaat lagi.</div>`;
    }
  }, 300);
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = input.value.trim();
      if (query) {
        window.location.href = `/search/?q=${encodeURIComponent(query)}`;
      }
    }
  });

  clear.addEventListener('click', () => {
    input.value = '';
    results.style.display = 'none';
    clear.style.display = 'none';
    clearTimeout(debounceTimer);
    input.focus();
  });
}

function initNavIcons(allData: any, currentFile: string): void {
  const grid = document.getElementById('related-articles-grid');
  if (!grid) return;

  const catInfo = getCategoryInfo(currentFile, allData);
  if (!catInfo) return;

  let nav = document.getElementById('dynamic-nav-container');
  if (!nav) {
    nav = document.createElement('div');
    nav.id = 'dynamic-nav-container';
    nav.className = 'floating-nav';
    grid.appendChild(nav);
  }

  const prevTag = document.querySelector('link[rel="prev"]');
  const nextTag = document.querySelector('link[rel="next"]');

  let prevNextHtml = '';
if (prevTag) {
  prevNextHtml += `<a href="${prevTag.getAttribute('href')}" title="Artikel Sebelum" class="btn-emoji">⏪</a>`;
}
if (nextTag) {
  prevNextHtml += `<a href="${nextTag.getAttribute('href')}" title="Artikel Sesudah" class="btn-emoji">⏩</a>`;
}

nav.innerHTML = `
<div class="nav-left"><a href="/${catInfo.slug}" class="category-link visible">${catInfo.name}</a></div>
<div class="nav-right">
<a href="/" title="Home" class="btn-emoji">🏠</a>
<a href="/sitemap" title="Daftar Isi" class="btn-emoji">📄</a>
<a href="/feed" title="RSS Feed" class="btn-emoji">📡</a>
${prevNextHtml}
</div>`;
}

function initInternalNav(): void {
  const tocContainer = document.getElementById('internal-nav');
  if (!tocContainer) return;

  const headings = Array.from(document.querySelectorAll('h2, h3, h4')) as HTMLElement[];
  const filtered = headings.filter(h => {
    const text = (h.textContent || '').trim();
    return text.length > 0 && !h.closest('.floating-nav') && !tocContainer.contains(h);
  });

  if (filtered.length === 0) {
    tocContainer.style.display = 'none';
    return;
  }

  tocContainer.innerHTML = '<ul class="nav-list">' + filtered.map((h, i) => {
    const text = (h.textContent || '').trim();
    if (!h.id) {
      h.id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `section-${i}`;
    }
    return `<li class="nav-item nav-${h.tagName.toLowerCase()}"><a href="#${h.id}" class="nav-link">${text}</a></li>`;
  }).join('') + '</ul>';

tocContainer.addEventListener('click', (e: Event) => {
  const target = e.target as HTMLElement;
  if (target.tagName.toLowerCase() === 'a' && target.classList.contains('nav-link')) {
    const href = target.getAttribute('href');
    if (!href || !href.startsWith('#')) return;

    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      let parentDetails = targetElement.closest('details');
      while (parentDetails) {
        if (!parentDetails.open) {
          parentDetails.open = true;
        }
        parentDetails = parentDetails.parentElement?.closest('details') || null;
      }
    }
  }
});
}

function initRelatedGrid(allData: any, currentFile: string): void {
  const grid = document.getElementById('related-articles-grid');
  if (!grid) return;
  const catInfo = getCategoryInfo(currentFile, allData);
  if (!catInfo) { grid.style.display = 'none'; return; }

  const related = catInfo.list.filter((i: any) => i.id !== currentFile).sort(() => 0.5 - Math.random()).slice(0, 6);

  grid.innerHTML = related.map((item: any) => {
    const smUrl = item.image
    ? item.image.replace(/\.[^/.]+$/, '') + '-sm.webp'
    : null;

    const thumbSrc = smUrl ?? '/thumbnail-sm.webp';

  const fallbackChain = item.image
  ? `this.onerror=function(){this.onerror=function(){this.onerror=null;this.src='/thumbnail.webp'};this.src='/thumbnail-sm.webp'};this.src='${item.image}'`
  : `this.onerror=null;this.src='/thumbnail.webp'`;

  return `
  <div class="rel-card-mini">
  <a href="${getFullUrl(item.id, allData)}">
  <div class="rel-img-mini">
  <img
  class="lk-related-thumb"
  src="${thumbSrc}"
  alt="${item.title}"
  loading="eager"
  decoding="async"
  fetchpriority="low"
  onerror="${fallbackChain}">
  </div>
  <div class="rel-info-mini">
  <h4>${item.title}</h4>
  </div>
  </a>
  </div>
  `;
  }).join('');
}

function initKeyboardNav(allData: any, currentFile: string): void {
  function navigateTo(direction: 'next' | 'prev' | 'up' | 'down'): void {
    if (direction === 'down') {
      window.location.href = '/';
      return;
    }
    if (direction === 'up') {
      const catInfo = getCategoryInfo(currentFile, allData);
      if (catInfo) window.location.href = `/${catInfo.slug}`;
      return;
    }

    const targetTag = document.querySelector(`link[rel="${direction}"]`);
    if (targetTag) {
      const targetUrl = targetTag.getAttribute('href');
      if (targetUrl) {
        window.location.href = targetUrl;
      }
    }
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (isMobileDevice()) return;

    const activeElement = document.activeElement as HTMLElement;
    const isTyping = activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.isContentEditable ||
    activeElement.closest('#disqus_thread');

    if (isTyping) return;

    if (e.ctrlKey && e.key === 'ArrowDown') { e.preventDefault(); navigateTo('down'); }
    if (e.ctrlKey && e.key === 'ArrowUp')   { e.preventDefault(); navigateTo('up'); }
    if (e.ctrlKey && e.key === 'ArrowRight') { e.preventDefault(); navigateTo('next'); }
    if (e.ctrlKey && e.key === 'ArrowLeft')  { e.preventDefault(); navigateTo('prev'); }
  });
}

// ---------------------------
// 3. MAIN INITIALIZATION
// ---------------------------
async function initializeApp(): Promise<void> {
  while (!(window as any).siteDataProvider) await new Promise(r => setTimeout(r, 100));

  const data = await (window as any).siteDataProvider.getFor('marquee-url.ts');
  const currentFile = getCurrentFileName();

  if (data) {
    initInternalNav();
    initProgressBar();
    initFloatingSearch();
    initRelatedGrid(data, currentFile);
    initNavIcons(data, currentFile);
    initKeyboardNav(data, currentFile);
  }
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initializeApp) : initializeApp();
})();
