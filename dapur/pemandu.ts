/**
 * =================================================================================
 * pemandu.ts v8.1 (D1 Native + Dual Provider Split + Bun Ready + Random Playground)
 * TypeScript Strict Mode & Optimized for Bun Bundler.
 * =================================================================================
 */

// 🌟 Deklarasi Global agar TypeScript mengenali siteDataProvider bawaan window
declare global {
  interface Window {
    siteDataProvider: {
      getFor: (ui: string) => Promise<Record<string, any[]>>;
      getRelatedLiteData: () => Promise<Record<string, any[]>>;
    };
  }
}

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

function formatCategoryName(slug: string): string {
  if (!slug) return 'Lainnya';
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getCategoryInfo(fileName: string, allData: Record<string, any[]>) {
  for (const [catName, articles] of Object.entries(allData)) {
    if (articles.some((a: any) => a.id === fileName)) {
      return { name: formatCategoryName(catName), slug: catName, list: articles };
    }
  }

  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  if (pathSegments.length > 0) {
    const currentSlug = pathSegments[0];
    for (const [catName, articles] of Object.entries(allData)) {
      if (catName === currentSlug) {
        return { name: formatCategoryName(catName), slug: catName, list: articles };
      }
    }
  }
  return null;
}

// ---------------------------
// 1b. IMAGE FALLBACK CHAIN
// ---------------------------
const BROKEN_IMG_CLASS = 'img-broken-placeholder';
let fallbackStyleInjected = false;

function ensureFallbackStyleInjected(): void {
  if (fallbackStyleInjected) return;
  fallbackStyleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
  .${BROKEN_IMG_CLASS} {
    display: flex !important;
    align-items: center;
    justify-content: center;
    background-color: #1a1a1c;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='M21 15l-5-5L5 21'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 32%;
  }
  `;
  document.head.appendChild(style);
}

function attachImageFallback(img: HTMLImageElement, fallbackChain: string[]): void {
  const chain = [...new Set(fallbackChain.filter(Boolean))];
  let step = 0;
  function handleError(): void {
    if (step < chain.length) {
      img.src = chain[step];
      step++;
    } else {
      img.removeEventListener('error', handleError);
      ensureFallbackStyleInjected();
      img.classList.add(BROKEN_IMG_CLASS);
      img.removeAttribute('src');
      img.alt = img.alt || 'Gambar tidak tersedia';
    }
  }
  img.addEventListener('error', handleError);
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

  if (!clear.innerHTML.trim()) clear.innerHTML = '❌';

  let debounceTimer: ReturnType<typeof setTimeout>;
  const escapeHTML = (str: string) => str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));

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
      const response = await fetch(`/cari?q=${safeQuery}&page=1&limit=10`);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data = await response.json();
      const matches = data.results || data.data || [];

      if (matches.length > 0) {
        results.innerHTML = matches.map((item: any) => {
          const fileSlug = item.id ? item.id.replace('.html', '') : 'tanpa-judul';
          const categoryName = item.category || 'Lainnya';
          const catSlug = categoryName.toLowerCase().replace(/\s+/g, '-');
          const snippet = item.snippet_text ? item.snippet_text.substring(0, 60) + '...' : 'Lihat artikel selengkapnya';

          return `<a href="/${catSlug}/${fileSlug}"><strong>${escapeHTML(item.title || 'Tanpa Judul')}</strong><small>${escapeHTML(snippet)}</small></a>`;
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
      if (query) window.location.href = `/search/?q=${encodeURIComponent(query)}`;
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

function initNavIcons(allData: Record<string, any[]>, currentFile: string): void {
  const grid = document.getElementById('related-articles-grid');
  if (!grid) return;

  const catInfo = getCategoryInfo(currentFile, allData);
  if (!catInfo) return;

  const currentArticle = catInfo.list.find((a: any) => a.id === currentFile);
  const cleanTitle = currentArticle ? currentArticle.title : document.title;

  let cleanDesc = '';
if (currentArticle && currentArticle.description) {
  cleanDesc = currentArticle.description;
} else {
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) cleanDesc = metaDesc.getAttribute('content') || '';
}

const shareText = cleanDesc ? cleanDesc : cleanTitle;
const encodedText = encodeURIComponent(shareText);
const encodedLink = encodeURIComponent(window.location.href);

let nav = document.getElementById('dynamic-nav-container');
if (!nav) {
  nav = document.createElement('div');
  nav.id = 'dynamic-nav-container';
  nav.className = 'floating-nav';

if (grid.parentNode) {
  grid.parentNode.insertBefore(nav, grid.nextSibling);
} else {
  document.body.appendChild(nav);
}
}

const prevTag = document.querySelector('link[rel="prev"]');
const nextTag = document.querySelector('link[rel="next"]');
let prevNextHtml = '';

if (prevTag) {
  const prevTitle = prevTag.getAttribute('title') || 'Artikel Sebelumnya';
  prevNextHtml += `<a href="${prevTag.getAttribute('href')}" title="${prevTitle}" class="btn-emoji">⏪</a>`;
}

if (nextTag) {
  const nextTitle = nextTag.getAttribute('title') || 'Artikel Selanjutnya';
  prevNextHtml += `<a href="${nextTag.getAttribute('href')}" title="${nextTitle}" class="btn-emoji">⏩</a>`;
}

nav.innerHTML = `
<div class="nav-left">
<a href="/${catInfo.slug}" class="category-link visible">${catInfo.name}</a>
</div>
<div class="nav-right">
<a href="/" title="Beranda" class="btn-emoji">🏠</a>
<a href="/sitemap" title="Daftar Isi" class="btn-emoji">📄</a>
<a href="/feed" title="RSS Feed" class="btn-emoji">📡</a>
${prevNextHtml}
<div class="lk-share-wrapper">
<button id="btn-share-main" class="lk-share-main-btn" title="Bagikan" aria-label="Bagikan">
<svg viewBox="0 0 3791 3729" width="20" height="20" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd"><path d="M713 1152c197 0 375 80 504 209 29 29 56 61 80 95l1125-468c-36-85-55-178-55-275 0-197 80-375 209-504S2883 0 3080 0s375 80 504 209 209 307 209 504-80 375-209 504-307 209-504 209-375-80-504-209c-22-22-43-46-62-71l-1132 471c29 77 45 161 45 248 0 54-6 106-17 157l1131 530c11-13 23-26 36-39 129-129 307-209 504-209s375 80 504 209 209 307 209 504-80 375-209 504-307 209-504 209-375-80-504-209-209-307-209-504c0-112 26-219 73-313l-1092-512c-34 66-78 126-130 177-129 129-307 209-504 209s-375-80-504-209S2 2062 2 1865s80-375 209-504 307-209 504-209zm2742-815c-96-96-229-156-376-156s-280 60-376 156-156 229-156 376 60 280 156 376 229 156 376 156 280-60 376-156 156-229 156-376-60-280-156-376zm0 2303c-96-96-229-156-376-156s-280 60-376 156-156 229-156 376 60 280 156 376 229 156 376 156 280-60 376-156 156-229 156-376-60-280-156-376zM1089 1488c-96-96-229-156-376-156s-280 60-376 156-156 229-156 376 60 280 156 376 229 156 376 156 280-60 376-156 156-229 156-376-60-280-156-376z" fill="currentColor" fill-rule="nonzero"/></svg>
</button>
<div id="lk-share-providers" class="lk-share-providers-hidden">
<a href="https://x.com/intent/post?text=${encodedText}&url=${encodedLink}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke X" aria-label="Bagikan ke X"><svg width="20" height="20" viewBox="0 0 512 462.799"><path fill="currentColor" fill-rule="nonzero" d="M403.229 0h78.506L310.219 196.04 512 462.799H354.002L230.261 301.007 88.669 462.799h-78.56l183.455-209.683L0 0h161.999l111.856 147.88L403.229 0zm-27.556 415.805h43.505L138.363 44.527h-46.68l283.99 371.278z"/></svg></a>
<a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodedLink}&title=${encodedText}&summary=${encodedText}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=600');return false;" title="Bagikan ke LinkedIn" aria-label="Bagikan ke LinkedIn"><svg width="20" height="20" viewBox="0 0 122.88 122.31"><path fill="currentColor" d="M27.75,0H95.13a27.83,27.83,0,0,1,27.75,27.75V94.57a27.83,27.83,0,0,1-27.75,27.74H27.75A27.83,27.83,0,0,1,0,94.57V27.75A27.83,27.83,0,0,1,27.75,0Z"/><path fill="#fff" d="M49.19,47.41H64.72v8h.22c2.17-3.88,7.45-8,15.34-8,16.39,0,19.42,23.47V98.94H83.51V74c0-5.71-.12-13.06-8.42-13.06s-9.72,6.21-9.72,12.65v25.4H49.19V47.41ZM40,31.79a8.42,8.42,0,1,1-8.42-8.42A8.43,8.43,0,0,1,40,31.79ZM23.18,47.41H40V98.94H23.18V47.41Z"/></svg></a>
<a href="https://t.me/share/url?url=${encodedLink}&text=${encodedText}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Telegram" aria-label="Bagikan ke Telegram"><svg width="20" height="20" viewBox="0 0 512 512"><circle fill="#229ED9" cx="256" cy="256" r="256"/><path fill="#fff" d="M115.88 253.3c74.63-32.52 124.39-53.95 149.29-64.31 71.1-29.57 85.87-34.71 95.5-34.88 2.12-.03 6.85.49 9.92 2.98 2.59 2.1 3.3 4.94 3.64 6.93.34 2 .77 6.53.43 10.08-3.85 40.48-20.52 138.71-29 184.05-3.59 19.19-10.66 25.62-17.5 26.25-14.86 1.37-26.15-9.83-40.55-19.27-22.53-14.76-35.26-23.96-57.13-38.37-25.28-16.66-8.89-25.81 5.51-40.77 3.77-3.92 69.27-63.5 70.54-68.9.16-.68.31-3.2-1.19-4.53s-3.71-.87-5.3-.51c-2.26.51-38.25 24.3-107.98 71.37-10.22 7.02-19.48 10.43-27.77 10.26-9.14-.2-26.72-5.17-39.79-9.42-16.03-5.21-28.77-7.97-27.66-16.82.57-4.61 6.92-9.32 19.04-14.14z"/></svg></a>
<a href="https://www.facebook.com/sharer/sharer.php?u=${encodedLink}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Facebook" aria-label="Bagikan ke Facebook"><svg width="20" height="20" viewBox="0 0 509 509"><g fill-rule="nonzero"><path fill="#0866FF" d="M509 254.5C509 113.94 395.06 0 254.5 0S0 113.94 0 254.5C0 373.86 82.17 474 193.02 501.51V332.27h-52.48V254.5h52.48v-33.51c0-86.63 39.2-126.78 124.24-126.78 16.13 0 43.95 3.17 55.33 6.33v70.5c-6.01-.63-16.44-.95-29.4-.95-41.73 0-57.86 15.81-57.86 56.91v27.5h83.13l-14.28 77.77h-68.85v174.87C411.35 491.92 509 384.62 509 254.5z"/><path fill="var(--bg-card)" d="M354.18 332.27l14.28-77.77h-83.13V227c0-41.1 16.13-56.91 57.86-56.91 12.96 0 23.39.32 29.4.95v-70.5c-11.38-3.16-39.2-6.33-55.33-6.33-85.04 0-124.24 40.16-124.24 126.78v33.51h-52.48v77.77h52.48v169.24c19.69 4.88 40.28 7.49 61.48 7.49 10.44 0 20.72-.64 30.83-1.86V332.27h68.85z"/></g></svg></a>
<a href="https://api.whatsapp.com/send?text=${encodedText}%0A%0A${encodedLink}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke WhatsApp" aria-label="Bagikan ke WhatsApp"><svg width="20" height="20" viewBox="0 0 240 241.19"><path fill="#25d366" fill-rule="evenodd" d="M205,35.05A118.61,118.61,0,0,0,120.46,0C54.6,0,1,53.61,1,119.51a119.5,119.5,0,0,0,16,59.74L0,241.19l63.36-16.63a119.43,119.43,0,0,0,57.08,14.57h0A119.54,119.54,0,0,0,205,35.07v0ZM120.5,219A99.18,99.18,0,0,1,69.91,205.1l-3.64-2.17-37.6,9.85,10-36.65-2.35-3.76A99.37,99.37,0,0,1,190.79,49.27,99.43,99.43,0,0,1,120.49,219ZM175,144.54c-3-1.51-17.67-8.71-20.39-9.71s-4.72-1.51-6.75,1.51-7.72,9.71-9.46,11.72-3.49,2.27-6.45.76-12.63-4.66-24-14.84A91.1,91.1,0,0,1,91.25,113.3c-1.75-3-.19-4.61,1.33-6.07s3-3.48,4.47-5.23a19.65,19.65,0,0,0,3-5,5.51,5.51,0,0,0-.24-5.23C99,90.27,93,75.57,90.6,69.58s-4.89-5-6.73-5.14-3.73-.09-5.7-.09a11,11,0,0,0-8,3.73C67.48,71.05,59.75,78.3,59.75,93s10.69,28.88,12.19,30.9S93,156.07,123,169c7.12,3.06,12.68,4.9,17,6.32a41.18,41.18,0,0,0,18.8,1.17c5.74-.84,17.66-7.21,20.17-14.18s2.5-13,1.75-14.19-2.69-2.06-5.7-3.59l0,0Z"/></svg></a>
<a href="https://www.threads.com/intent/post?text=${encodedText}&url=${encodedLink}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Threads" aria-label="Bagikan ke Threads"><svg width="20" height="20" viewBox="0 0 512 512"><path d="M105 0h302c57.75 0 105 47.25 105 105v302c0 57.75-47.25 105-105 105H105C47.25 512 0 464.75 0 407V105C0 47.25 47.25 0 105 0z"/><path fill="var(--bg-card)" fill-rule="nonzero" d="M337.36 243.58c-1.46-.7-2.95-1.38-4.46-2.02-2.62-48.36-29.04-76.05-73.41-76.33-25.6-.17-48.52 10.27-62.8 31.94l24.4 16.74c10.15-15.4 26.08-18.68 37.81-18.68h.4c14.61.09 25.64 4.34 32.77 12.62 5.19 6.04 8.67 14.37 10.39 24.89-12.96-2.2-26.96-2.88-41.94-2.02-42.18 2.43-69.3 27.03-67.48 61.21.92 17.35 9.56 32.26 24.32 42.01 12.48 8.24 28.56 12.27 45.26 11.35 22.07-1.2 39.37-9.62 51.45-25.01 9.17-11.69 14.97-26.84 17.53-45.92 10.51 6.34 18.3 14.69 22.61 24.73 7.31 17.06 7.74 45.1-15.14 67.96-20.04 20.03-44.14 28.69-80.55 28.96-40.4-.3-70.95-13.26-90.81-38.51-18.6-23.64-28.21-57.79-28.57-101.5.36-43.71 9.97-77.86 28.57-101.5 19.86-25.25 50.41-38.21 90.81-38.51 40.68.3 71.76 13.32 92.39 38.69 10.11 12.44 17.73 28.09 22.76 46.33l28.59-7.63c-6.09-22.45-15.67-41.8-28.72-57.85-26.44-32.53-65.1-49.19-114.92-49.54h-.2c-49.72.35-87.96 17.08-113.64 49.73-22.86 29.05-34.65 69.48-35.04 120.16v.24c.39 50.68 12.18 91.11 35.04 120.16 25.68 32.65 63.92 49.39 113.64 49.73h.2c44.2-.31 75.36-11.88 101.03-37.53 33.58-33.55 32.57-75.6 21.5-101.42-7.94-18.51-23.08-33.55-43.79-43.48zm-76.32 71.76c-18.48 1.04-37.69-7.26-38.64-25.03-.7-13.18 9.38-27.89 39.78-29.64 3.48-.2 6.9-.3 10.25-.3 11.04 0 21.37 1.07 30.76 3.13-3.5 43.74-24.04 50.84-42.15 51.84z"/></svg></a>
<a href="https://share.flipboard.com/bookmarklet/popout?v=2&title=${encodedText}&url=${encodedLink}&utm_source=dalam.web.id" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=600');return false;" title="Bagikan ke Flipboard" aria-label="Bagikan ke Flipboard"><svg width="20" height="20" viewBox="0 0 122.88 122.88"><path fill="#F52828" d="M0,0v122.88h122.88V0H0L0,0z M98.3,49.15H73.73v24.58H49.15V98.3H24.58V24.58H98.3V49.15L98.3,49.15z"/></svg></a>
</div>
</div>
</div>`;

const btnMain = document.getElementById('btn-share-main');
const providerDrawer = document.getElementById('lk-share-providers');
if (btnMain && providerDrawer) {
  btnMain.addEventListener('click', async () => {
    if (navigator.share && isMobileDevice()) {
      try {
        await navigator.share({ title: cleanTitle, text: shareText, url: window.location.href });
      } catch (err) { console.error(err); }
    } else {
      const isHidden = providerDrawer.classList.contains('lk-share-providers-hidden');
      providerDrawer.classList.toggle('lk-share-providers-hidden', !isHidden);
      providerDrawer.classList.toggle('lk-share-providers-visible', isHidden);
    }
  });
}
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
    if (!h.id) h.id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `section-${i}`;
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
        if (!parentDetails.open) parentDetails.open = true;
        parentDetails = parentDetails.parentElement?.closest('details') || null;
      }
    }
  }
});
}

async function initRelatedGrid(currentFile: string): Promise<void> {
  const grid = document.getElementById('related-articles-grid');
  if (!grid) return;

  try {
    const liteData = await window.siteDataProvider.getRelatedLiteData();
    if (!liteData || Object.keys(liteData).length === 0) {
      grid.style.display = 'none';
      return;
    }

    const catInfo = getCategoryInfo(currentFile, liteData);
    if (!catInfo) {
      grid.style.display = 'none';
      return;
    }

    const STATIC_FALLBACK = '/thumbnail-sm.webp';

const related = catInfo.list
.filter((i: any) => i.id !== currentFile)
.sort(() => 0.5 - Math.random())
.slice(0, 6);

if (related.length === 0) {
  grid.style.display = 'none';
  return;
}

grid.innerHTML = related.map((item: any, idx: number) => {
  const rg = item.image ? `${item.image.replace(/\.[^/.]+$/, '')}-rg.webp` : STATIC_FALLBACK;
  const url = `/${catInfo.slug}/${item.id.replace('.html', '')}`;

  return `
  <div class="rel-card-mini">
  <a href="${url}">
  <div class="rel-img-mini">
  <img class="lk-related-thumb" data-fallback-idx="${idx}" src="${rg}" alt="${item.title}" width="120" height="100" loading="lazy" decoding="async">
  </div>
  <div class="rel-info-mini">
  <h4>${item.title}</h4>
  </div>
  </a>
  </div>
  `;
}).join('');

const imgs = grid.querySelectorAll<HTMLImageElement>('.lk-related-thumb[data-fallback-idx]');
imgs.forEach((img) => {
  const idx = Number(img.dataset.fallbackIdx);
  const item = related[idx];
  if (!item) return;
  const original = item.image || STATIC_FALLBACK;
  attachImageFallback(img, [original, STATIC_FALLBACK]);
});
  } catch (e) {
    console.error(e);
    grid.style.display = 'none';
  }
}

function initKeyboardNav(allData: Record<string, any[]>, currentFile: string): void {
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
      if (targetUrl) window.location.href = targetUrl;
    }
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (isMobileDevice()) return;
    const activeElement = document.activeElement as HTMLElement;
    const isTyping = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable || activeElement.closest('#disqus_thread');
    if (isTyping) return;

    if (e.ctrlKey && e.key === 'ArrowDown') { e.preventDefault(); navigateTo('down'); }
    if (e.ctrlKey && e.key === 'ArrowUp')  { e.preventDefault(); navigateTo('up'); }
    if (e.ctrlKey && e.key === 'ArrowRight') { e.preventDefault(); navigateTo('next'); }
    if (e.ctrlKey && e.key === 'ArrowLeft') { e.preventDefault(); navigateTo('prev'); }
  });
}

// =========================================================================
// 2b. FITUR WIDGET STICKY: PLAYGROUND ARTIKEL ACAK (SHUFFLE)
// =========================================================================

let allPlaygroundArticles: any[] = [];

function injectPlaygroundStyles() {
  if (document.getElementById('playground-styles')) return;
  const style = document.createElement('style');
  style.id = 'playground-styles';

style.innerHTML = `
:root {
  /* Tinggi thumbnail & ruang teks. Kalau ini diubah, semua otomatis ngikut. */
  --thumb-size: 4.5rem;
}

/* POSISI DESKTOP (STICKY) */
#random-playground-widget {
position: fixed;
top: 6rem;
right: 1.25rem;
width: 18.75rem;
background-color: transparent;
border: none;
z-index: 999;
}

/* POSISI MOBILE (PINDAH KE BAWAH) */
@media (max-width: 1024px) {
  #random-playground-widget {
  position: relative;
  top: auto;
  right: auto;
  width: 100%;
  margin-top: 2rem;
  padding: 1rem;
  border-top: 1px solid var(--border);
  }
}

/* STYLING PLAYGROUND ITEM (SIDE-BY-SIDE) */
.playground-item {
  display: flex;
  align-items: flex-start; /* Ubah ke flex-start biar teks rata atas sama thumbnail */
  gap: 1rem;
  margin-bottom: 1.25rem;
  text-decoration: none;
  color: inherit;
}

.playground-thumb {
  width: var(--thumb-size);
  height: var(--thumb-size);
  object-fit: cover;
  border-radius: 0.5rem;
  flex-shrink: 0;
  background-color: var(--border, #f3f4f6);
}

.playground-title {
  /* Tinggi total disamakan dengan tinggi thumbnail */
  height: var(--thumb-size);
  /* Tinggi per baris persis 1/3 dari total tinggi thumbnail */
  line-height: calc(var(--thumb-size) / 3);
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  flex-grow: 1;

  /* Trik multiline ellipsis (Maksimal 3 baris) */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal; /* Kembalikan ke normal agar bisa turun baris */
}

/* SHUFFLE BUTTON & ANIMATION */
#shuffle-btn {
width: 100%;
padding: 0.75rem;
margin-bottom: 1.5rem;
cursor: pointer;
font-weight: bold;
border-radius: 0.5rem;
background-color: transparent;
border: 1px solid var(--border, #ccc);
transition: all 0.2s ease;
}

#shuffle-btn:hover {
background-color: var(--border, #eee);
}

.shake-anim {
  animation: shakeAndFade 0.4s ease-in-out forwards;
}

@keyframes shakeAndFade {
  0% { transform: translateX(0); opacity: 1; }
  25% { transform: translateX(-5px); opacity: 0.7; }
  50% { transform: translateX(5px); opacity: 0.4; }
  75% { transform: translateX(-5px); opacity: 0.7; }
  100% { transform: translateX(0); opacity: 1; }
}
`;
document.head.appendChild(style);
}



// FUNGSI RENDER (Disisipkan di script utama lo)
function renderPlaygroundList(widget) {
  // Kosongin widget tiap kali render ulang (penting buat fitur shuffle)
  widget.innerHTML = '';

  // 1. Bikin tombol Shuffle
  const shuffleBtn = document.createElement('button');
  shuffleBtn.id = 'shuffle-btn';
  shuffleBtn.textContent = '🎲 Acak Artikel';
shuffleBtn.onclick = () => {
  widget.classList.add('shake-anim');
  setTimeout(() => {
    renderPlaygroundList(widget); // Panggil render lagi buat re-shuffle
    widget.classList.remove('shake-anim');
  }, 400);
};
widget.appendChild(shuffleBtn);

// 2. Ambil 4 artikel random dari array allPlaygroundArticles
const shuffledArticles = [...allPlaygroundArticles]
.sort(() => 0.5 - Math.random())
.slice(0, 4);

// 3. Looping dan bikin elemen HTML-nya
shuffledArticles.forEach(article => {
  const item = document.createElement('a');
  item.href = article.url || '#';
  item.className = 'playground-item';

  // Ambil URL gambar original
  const origImg = article.image || article.thumbnail || '';
  let smWebpImg = origImg;

  // Manipulasi string buat inject suffix -sm.webp
  // (Biar kalau ekstensi aslinya .jpg/.png bisa diganti)
  const dotIndex = origImg.lastIndexOf('.');
  if (dotIndex !== -1) {
    smWebpImg = origImg.substring(0, dotIndex) + '-sm.webp';
  }

  // Pakai atribut `onerror` biar fallback otomatis jalan kalau -sm.webp gagal diload
  item.innerHTML = `
  <img
  class="playground-thumb"
  src="${smWebpImg}"
  data-orig="${origImg}"
  onerror="this.onerror=null; this.src=this.dataset.orig;"
  alt="${article.title || 'Thumbnail Artikel'}"
  loading="lazy"
  >
  <h4 class="playground-title">${article.title || 'Judul Tanpa Kategori'}</h4>
  `;

  widget.appendChild(item);
});
}



async function initRandomPlayground() {
  injectPlaygroundStyles();

  let widget = document.getElementById('random-playground-widget');

  if (!widget) {
    widget = document.createElement('aside');
    widget.id = 'random-playground-widget';

    // 🔥 Pengecekan viewport: Single Source of Truth
    // Nilai 1024px disamain plek ketiplek sama @media di CSS
    const isMobileLayout = window.matchMedia('(max-width: 1024px)').matches;

    if (isMobileLayout) {
      // 📱 MOBILE: Pindahkan ke paling bawah sebelum penutup body
      document.body.appendChild(widget);
    } else {
      // 💻 DESKTOP: Sisipkan di samping konten utama
      const mainContent = document.querySelector('.article-content, main, article, #main-wrapper');

      if (mainContent && mainContent.parentNode) {
        mainContent.parentNode.insertBefore(widget, mainContent.nextSibling);
      } else {
        // Fallback kalau selector main content nggak ketemu
        document.body.appendChild(widget);
      }
    }
  }

  // Fetch data
  if (typeof allPlaygroundArticles === 'undefined' || allPlaygroundArticles.length === 0) {
    try {
      const data = await window.siteDataProvider.getFor('pemandu.ts');
      // Pastikan data valid sebelum di-flat()
      if (data) {
        allPlaygroundArticles = Object.values(data).flat();
      }
    } catch (e) {
      console.error("Gagal memuat data playground:", e);
      return;
    }
  }

  // Render list
  if (typeof renderPlaygroundList === 'function') {
    renderPlaygroundList(widget);
  }
}

// ---------------------------
// 3. MAIN INITIALIZATION
// ---------------------------
async function initializeApp(): Promise<void> {
  try {
    while (!window.siteDataProvider) await new Promise(r => setTimeout(r, 100));

    const allData = await window.siteDataProvider.getFor('pemandu.ts');
    const currentFile = getCurrentFileName();

    if (allData && Object.keys(allData).length > 0) {
      initInternalNav();
      initProgressBar();
      initFloatingSearch();
      initNavIcons(allData, currentFile);
      initKeyboardNav(allData, currentFile);
    }

    // Dieksekusi di akhir agar tidak nge-blok konten utama
    initRelatedGrid(currentFile);

    // 🔥 Panggil Playground secara asinkron di sini!
    initRandomPlayground();

  } catch (err) {
    console.error("Gagal inisialisasi Pemandu:", err);
  }
}

// Cukup satu event listener utama yang mengurus segalanya
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initializeApp) : initializeApp();

})();
