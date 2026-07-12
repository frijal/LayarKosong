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
function cleanArticleTitle(title: string): string {
  if (!title) return 'Tanpa Judul';
  return title.replace(/\s*-\s*Layar Kosong$/i, '');
}

function isMobileDevice(): boolean {
  return window.matchMedia('(max-width: 1024px)').matches;
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

function attachImageFallback(img: HTMLImageElement, fallbackChain: string[]): void {
  const chain = [...new Set(fallbackChain.filter(Boolean))];
  let step = 0;
  function handleError(): void {
    if (step < chain.length) {
      img.src = chain[step];
      step++;
    } else {
      img.removeEventListener('error', handleError);
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

  let ticking = false;

  const updateProgress = () => {
    const h = document.documentElement;
    const b = document.body;

    const st = h.scrollTop || b.scrollTop;
    const sh = h.scrollHeight || b.scrollHeight;
    const ch = h.clientHeight;
    const max = sh - ch;

    // Menghitung rasio (0.0 sampai 1.0)
    const progressRatio = max > 0 ? (st / max) : 0;

    // Kalkulasi pergeseran (TranslateX)
    const translateValue = (1 - progressRatio) * -100;

    // Terapkan animasi via GPU
    bar.style.transform = `translateX(${translateValue}%)`;

    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateProgress);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  updateProgress(); // Eksekusi pertama kali
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
          const fileSlug = cleanSlug(item.id) || 'tanpa-judul';
          const categoryName = item.category || 'Lainnya';
          const catSlug = categoryName.toLowerCase().replace(/\s+/g, '-');
          const snippet = item.snippet_text ? item.snippet_text.substring(0, 60) + '...' : 'Lihat artikel selengkapnya';

          const cleanTitle = cleanArticleTitle(item.title);

          return `<a href="/${catSlug}/${fileSlug}"><strong>${escapeHTML(cleanTitle)}</strong><small>${escapeHTML(snippet)}</small></a>`;
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
  const cleanTitle = cleanArticleTitle(currentArticle ? currentArticle.title : document.title);

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

// --- KODE BARU: GENERATE GITHUB EDIT URL ---
// Memanfaatkan variabel currentFile yang udah ada format .html-nya
const githubEditUrl = `https://github.com/frijal/LayarKosong/edit/main/artikel/${currentFile}`;

nav.innerHTML = `
<div class="nav-left">
<a href="/${catInfo.slug}" class="category-link visible">${catInfo.name}</a>
</div>
<div class="nav-right">
<!-- Tombol GitHub diselipkan di sini -->
<a href="${githubEditUrl}" target="_blank" rel="noopener noreferrer" title="Edit Artikel" class="btn-emoji">📝</a>

<a href="/" title="Beranda" class="btn-emoji">🏠</a>
<a href="/sitemap" title="Daftar Isi" class="btn-emoji">📚</a>
<a href="/feed" title="RSS Feed" class="btn-emoji">📡</a>
${prevNextHtml}
<div class="lk-share-wrapper">
<button id="btn-share-main" class="lk-share-main-btn btn-emoji" style="padding: 0;" title="Bagikan" aria-label="Bagikan">📨</button>
<div id="lk-share-providers" class="lk-share-providers-hidden">
<a href="https://x.com/intent/post?text=${encodedText}&url=${encodedLink}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke X" aria-label="Bagikan ke X">
<img src="/ext/icons/icon-x.svg" width="20" height="20" alt="X" aria-hidden="true" />
</a>
<a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodedLink}&title=${encodedText}&summary=${encodedText}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=600');return false;" title="Bagikan ke LinkedIn" aria-label="Bagikan ke LinkedIn">
<img src="/ext/icons/icon-linkedin.svg" width="20" height="20" alt="LinkedIn" aria-hidden="true" />
</a>
<a href="https://t.me/share/url?url=${encodedLink}&text=${encodedText}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Telegram" aria-label="Bagikan ke Telegram">
<img src="/ext/icons/icon-telegram.svg" width="20" height="20" alt="Telegram" aria-hidden="true" />
</a>
<a href="https://www.facebook.com/sharer/sharer.php?u=${encodedLink}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Facebook" aria-label="Bagikan ke Facebook">
<img src="/ext/icons/icon-facebook.svg" width="20" height="20" alt="Facebook" aria-hidden="true" />
</a>
<a href="https://api.whatsapp.com/send?text=${encodedText}%0A%0A${encodedLink}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke WhatsApp" aria-label="Bagikan ke WhatsApp">
<img src="/ext/icons/icon-whatsapp.svg" width="20" height="20" alt="WhatsApp" aria-hidden="true" />
</a>
<a href="https://www.threads.com/intent/post?text=${encodedText}&url=${encodedLink}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Threads" aria-label="Bagikan ke Threads">
<img src="/ext/icons/icon-threads.svg" width="20" height="20" alt="Threads" aria-hidden="true" />
</a>
<a href="https://share.flipboard.com/bookmarklet/popout?v=2&title=${encodedText}&url=${encodedLink}&utm_source=dalam.web.id" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=600');return false;" title="Bagikan ke Flipboard" aria-label="Bagikan ke Flipboard">
<img src="/ext/icons/icon-flipboard.svg" width="20" height="20" alt="Flipboard" aria-hidden="true" />
</a>
<a href="https://mastodon.social/share?text=${encodedText}%0A%0A${encodedLink}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Mastodon" aria-label="Bagikan ke Mastodon">
<img src="/ext/icons/icon-mastodon.svg" width="20" height="20" alt="Mastodon" aria-hidden="true" />
</a>
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
  const url = `/${catInfo.slug}/${cleanSlug(item.id)}`;

  const cleanTitle = cleanArticleTitle(item.title);

  return `
  <div class="rel-card-mini">
  <a href="${url}">
  <div class="rel-img-mini">
  <img class="lk-related-thumb" data-fallback-idx="${idx}" src="${rg}" alt="${cleanTitle}" width="120" height="100" loading="lazy" decoding="async">
  </div>
  <div class="rel-info-mini">
  <h4>${cleanTitle}</h4>
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

function renderPlaygroundList(listContainer: HTMLElement) {
  listContainer.innerHTML = '';

const shuffledArticles = [...allPlaygroundArticles]
.sort(() => 0.5 - Math.random())
.slice(0, 7);

shuffledArticles.forEach(article => {
  const item = document.createElement('a');
  item.href = article.url || '#';
  item.className = 'playground-item';

  const origImg = article.image || article.thumbnail || '';
  let smWebpImg = origImg;

  const dotIndex = origImg.lastIndexOf('.');
  if (dotIndex !== -1) {
    smWebpImg = origImg.substring(0, dotIndex) + '-sm.webp';
  }

  const cleanTitle = cleanArticleTitle(article.title);

  item.innerHTML = `
  <img
  class="playground-thumb"
  src="${smWebpImg}"
  data-orig="${origImg}"
  onerror="this.onerror=null; this.src=this.dataset.orig;"
  alt="${cleanTitle}"
  loading="lazy"
  >
  <h4 class="playground-title">${cleanTitle}</h4>
  `;

  listContainer.appendChild(item);
});
}

// FUNGSI INISIALISASI UTAMA
async function initRandomPlayground() {
  let widget = document.getElementById('random-playground-widget');

  if (!widget) {
    widget = document.createElement('aside');
    widget.id = 'random-playground-widget';

    // Bikin Wadah List
    const listContainer = document.createElement('div');
    listContainer.id = 'playground-list';

    // Bikin Wadah Tombol Aksi
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'playground-controls';

    // Tombol Hide
    const hideBtn = document.createElement('button');
    hideBtn.id = 'hide-btn';
    hideBtn.textContent = '❌';
    hideBtn.title = 'Sembunyikan widget';
    hideBtn.setAttribute('aria-label', 'Sembunyikan widget');
    hideBtn.onclick = () => {
      widget.style.display = 'none';
    };

    // Bikin Tombol Shuffle
    const shuffleBtn = document.createElement('button');
    shuffleBtn.id = 'shuffle-btn';
    shuffleBtn.textContent = '♻️ Acak Artikel';
shuffleBtn.onclick = () => {
  renderPlaygroundList(listContainer);
};

controlsContainer.appendChild(hideBtn);
controlsContainer.appendChild(shuffleBtn);

widget.appendChild(listContainer);
widget.appendChild(controlsContainer);

const isMobileLayout = isMobileDevice();

if (isMobileLayout) {
  document.body.appendChild(widget);
} else {
  const mainContent = document.querySelector('.article-content, main, article, #main-wrapper');
  if (mainContent && mainContent.parentNode) {
    mainContent.parentNode.insertBefore(widget, mainContent.nextSibling);
  } else {
    document.body.appendChild(widget);
  }
}
  }

  // Fetch data
  if (typeof allPlaygroundArticles === 'undefined' || allPlaygroundArticles.length === 0) {
    try {
      const data = await window.siteDataProvider.getFor('pemandu.ts');
      if (data) {
        allPlaygroundArticles = [];

        for (const [catSlug, articles] of Object.entries(data)) {
          articles.forEach(art => {
            const fileSlug = cleanSlug(art.id);
            const finalUrl = art.url || `/${catSlug}/${fileSlug}`;

            allPlaygroundArticles.push({
              ...art,
              url: finalUrl
            });
          });
        }
      }
    } catch (e) {
      console.error("Gagal memuat data playground:", e);
      return;
    }
  }

  const listContainer = document.getElementById('playground-list');
  if (listContainer && typeof renderPlaygroundList === 'function') {
    renderPlaygroundList(listContainer);
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

    initRelatedGrid(currentFile);
    initRandomPlayground();

  } catch (err) {
    console.error("Gagal inisialisasi Pemandu:", err);
  }
}

// Cukup satu event listener utama yang mengurus segalanya
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initializeApp) : initializeApp();

})();
