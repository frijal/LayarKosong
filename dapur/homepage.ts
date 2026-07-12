/**
 * =================================================================================
 * homepage.ts — v2: Picture-based images, skeleton loading, SSR-aware hydration
 * =================================================================================
 *
 * Perubahan besar dari versi lama:
 * 1. Hero & card image sekarang <picture><img> asli — bukan background-image.
 *    Ini yang bikin CSS lama (.hero-slide > picture) akhirnya kepakai beneran.
 * 2. Ada mode "hydrate": kalau #newsFeed sudah berisi data-ssr="true" (artinya
 *    komposisi.ts sudah nge-render hero + beberapa card pertama langsung di HTML
 *    statis saat build), homepage.ts TIDAK menimpa DOM itu — cukup nempelin
 *    event listener + tetap fetch data penuh di background buat search/filter/
 *    load more. Kalau data-ssr belum ada, jalan seperti biasa (full client render)
 *    tapi sekarang pakai skeleton placeholder dulu biar nggak CLS.
 * 3. Pill kategori sekarang <button> asli (dibuat di index.html & di sini),
 *    bisa dioperasikan keyboard, ada aria-pressed.
 *
 * TODO(komposisi.ts): buat langkah build baru yang:
 *   - render markup hero-slide pertama + N card pertama pakai fungsi yang sama
 *     polanya dengan pictureMarkup()/cardMarkup() di bawah (idealnya di-share
 *     lewat 1 modul kecil, bukan diketik ulang di 2 tempat)
 *   - suntik ke index.html di titik <!--%%HERO_SSR%%--> dan <!--%%FEED_SSR%%-->
 *   - set atribut data-ssr="true" di #hero dan #newsFeed
 *   - tambahkan <link rel="preload" as="image" href="..." fetchpriority="high">
 *     untuk gambar hero pertama di <head>, karena URL gambar itu baru diketahui
 *     saat build, bukan saat homepage.ts jalan
 */

interface Article {
    category: string;
    title: string;
    id: string;
    url: string;
    img: string;      // Thumbnail (-sm.webp)
    fullImg: string;   // Gambar asli untuk Hero / desktop
    date: Date;
    summary: string;
}

// --- VARIABEL GLOBAL ---
let allData: Article[] = [];
let displayedData: Article[] = [];
let heroData: Article[] = [];
let currentHeroIndex: number = 0;
let heroTimer: ReturnType<typeof setInterval> | null = null;
let limit: number = 6;

const FEED_SKELETON_COUNT = 6;
const SIDEBAR_SKELETON_COUNT = 5;

// 🔥 HELPER: Merapikan tipografi kategori (gaya-hidup -> Gaya Hidup)
function formatCategoryName(slug: string): string {
    if (!slug) return 'Lainnya';
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function escapeAttr(str: string): string {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Bikin markup <picture> asli menggantikan background-image lama.
 * Mobile-first: source kecil untuk layar sempit, <img> fallback pakai gambar penuh
 * (sesuai konvensi -sm.webp / original yang sudah ada di srcset-gambar.ts).
 */
function pictureMarkup(item: Article, opts: {
    className: string;
    priority?: boolean; // true = gambar paling penting di layar (LCP candidate)
width?: number;
height?: number;
}): string {
    const alt = escapeAttr(item.title);
    const loading = opts.priority ? 'eager' : 'lazy';
    const fetchPriority = opts.priority ? ' fetchpriority="high"' : '';
    const w = opts.width ?? 1000;
    const h = opts.height ?? 563;

    return `<picture>
    <source media="(max-width: 640px)" srcset="${item.img}">
    <img src="${item.fullImg}" alt="${alt}" class="${opts.className}" width="${w}" height="${h}" loading="${loading}"${fetchPriority} decoding="async" onerror="if(this.src.includes('-sm.webp')){this.src='${item.img}';}else{this.onerror=null;this.src='/thumbnail-sm.webp';}">
    </picture>`;
}

async function fetchData(): Promise<void> {
    const feedEl = document.getElementById('newsFeed');
    const heroEl = document.getElementById('hero');
    const isPreRendered = feedEl?.dataset.ssr === 'true';

    // Kalau belum di-SSR, tampilkan skeleton dulu sambil nunggu fetch —
    // ini yang mencegah newsFeed & sidebar "meletus" kosong->penuh (CLS).
    if (!isPreRendered) {
        renderFeedSkeleton();
        renderSidebarSkeleton();
    }

    try {
        const data = await (window as any).siteDataProvider.getFor('homepage.ts');
        allData = [];

        for (const cat in data) {
            const catSlug = cat.toLowerCase().replace(/\s+/g, '-');
            const readableCat = formatCategoryName(cat);

            data[cat].forEach((item: any) => {
                const fileSlug = item.id.replace(/\.html$/, '');
                const originalImage = item.image || '/thumbnail.webp';
                const smallImage = originalImage.replace(/\.(jpg|jpeg|png|webp)$/i, '-sm.webp');
                const cleanTitle = item.title.replace(/\s*-\s*Layar Kosong$/i, '');

                allData.push({
                    category: readableCat,
                    title: cleanTitle,
                    id: item.id,
                    url: `/${catSlug}/${fileSlug}`,
                    img: smallImage,
                    fullImg: originalImage,
                    date: item.date ? new Date(item.date) : new Date(),
                             summary: item.description || ''
                });
            });
        }

        allData.sort((a, b) => b.date.getTime() - a.date.getTime());
        displayedData = [...allData];

        const categories = [...new Set(allData.map(item => item.category))];
        heroData = categories.map(cat => allData.find(item => item.category === cat) as Article);

        if (isPreRendered) {
            // Hero & card pertama sudah ada di HTML dari build-time render.
            // Jangan timpa DOM-nya (nanti LCP-nya balik lambat + ada flash),
            // cukup hydrate interaksi dan siapkan slider/nav.
            if (heroEl) heroEl.classList.remove('skeleton');
            renderHeroNav();
            bindEvents();
            startHeroSlider();
        } else {
            initSite();
            startHeroSlider();
        }
    } catch (e) {
        console.error("Gagal ambil data via provider", e);
        if (feedEl) feedEl.innerHTML = "<p class=\"feed-error\">Gagal memuat konten. Coba muat ulang halaman.</p>";
    }
}

function renderFeedSkeleton(): void {
    const container = document.getElementById('newsFeed');
    if (!container) return;
    container.setAttribute('aria-busy', 'true');
    let html = '';
    for (let i = 0; i < FEED_SKELETON_COUNT; i++) {
        html += `<div class="card card-skeleton" aria-hidden="true">
        <div class="card-img skeleton"></div>
        <div class="card-body">
        <div class="skeleton skeleton-line" style="width:40%;height:12px;margin-bottom:12px"></div>
        <div class="skeleton skeleton-line" style="width:90%;height:16px;margin-bottom:8px"></div>
        <div class="skeleton skeleton-line" style="width:70%;height:16px"></div>
        </div>
        </div>`;
    }
    container.innerHTML = html;
}

function renderSidebarSkeleton(): void {
    const side = document.getElementById('sidebarRandom');
    if (!side) return;
    side.setAttribute('aria-busy', 'true');
    let html = '';
    for (let i = 0; i < SIDEBAR_SKELETON_COUNT; i++) {
        html += `<div class="mini-item mini-item-skeleton" aria-hidden="true">
        <div class="mini-thumb skeleton"></div>
        <div class="mini-text" style="flex:1">
        <div class="skeleton skeleton-line" style="width:90%;height:12px;margin-bottom:6px"></div>
        <div class="skeleton skeleton-line" style="width:50%;height:10px"></div>
        </div>
        </div>`;
    }
    side.innerHTML = html;
}

function initSite(): void {
    renderHero();
    renderCategories();
    renderArchives();
    renderSidebar();
    renderFeed();
    bindEvents();
}

function bindEvents(): void {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
    const clearBtn = document.getElementById('clearSearch');
    const heroSection = document.getElementById('hero');

    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = 'true';
        searchInput.addEventListener('input', (e: Event) => {
            const val = (e.target as HTMLInputElement).value.toLowerCase();
            if (val.length > 0) {
                if (heroSection) heroSection.style.display = 'none';
                stopHeroSlider();
            } else {
                if (heroSection) heroSection.style.display = '';
                startHeroSlider();
            }

            displayedData = allData.filter(i =>
            i.title.toLowerCase().includes(val) ||
            (i.summary && i.summary.toLowerCase().includes(val))
            );

            renderFeed(true);
            renderSidebar();
        });
    }

    if (clearBtn && searchInput && !clearBtn.dataset.bound) {
        clearBtn.dataset.bound = 'true';
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            if (heroSection) heroSection.style.display = '';
            displayedData = [...allData];
            renderFeed(true);
            renderSidebar();
            startHeroSlider();
            searchInput.focus();
        });
    }

    const yFilter = document.getElementById('yearFilter') as HTMLSelectElement | null;
    const mFilter = document.getElementById('monthFilter') as HTMLSelectElement | null;

    if (yFilter && !yFilter.dataset.bound) {
        yFilter.dataset.bound = 'true';
        yFilter.addEventListener('change', () => {
            updateMonthDropdown();
            runFilters();
        });
    }
    if (mFilter && !mFilter.dataset.bound) {
        mFilter.dataset.bound = 'true';
        mFilter.addEventListener('change', runFilters);
    }

    const shuffleBtn = document.getElementById('shuffleSidebar');
    if (shuffleBtn && !shuffleBtn.dataset.bound) {
        shuffleBtn.dataset.bound = 'true';
        shuffleBtn.addEventListener('click', () => renderSidebar());
    }
}

function renderSidebar(targetCat?: string): void {
    const side = document.getElementById('sidebarRandom');
    if (!side) return;

    const activePill = document.querySelector('.pill[aria-pressed="true"]');
    const currentCategory = targetCat || (activePill ? activePill.textContent?.trim() : 'All');

    const filteredForSidebar = (currentCategory === 'All' || currentCategory === 'Kategori')
    ? [...allData]
    : allData.filter(item => item.category === currentCategory);

    const displayedTitles = displayedData.slice(0, limit).map(item => item.title);
    const finalAvailable = filteredForSidebar.filter(item => !displayedTitles.includes(item.title));
    const randoms = [...finalAvailable].sort(() => 0.5 - Math.random()).slice(0, 10);

    side.removeAttribute('aria-busy');
    side.innerHTML = randoms.map(item => {
        const cleanTitle = escapeAttr(item.title);
        const cleanSummary = escapeAttr(item.summary || '');
        const d = item.date;
        const formattedDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear())}`;
        const pic = pictureMarkup(item, { className: 'mini-thumb', width: 55, height: 55 });

        return `<div class="mini-item">
        ${pic}
        <div class="mini-text">
        <h4 title="${cleanSummary}">
        <a href="${item.url}">${item.title}</a>
        </h4>
        <div class="mini-meta">
        <time datetime="${d.toISOString()}">${formattedDate}</time>
        <span class="mini-cat">${item.category}</span>
        </div>
        </div>
        </div>`;
    }).join('');
}

(window as any).renderSidebar = renderSidebar;

function filterByCat(cat: string, el?: HTMLElement): void {
    document.querySelectorAll('.pill').forEach(p => p.setAttribute('aria-pressed', 'false'));
    if (el) el.setAttribute('aria-pressed', 'true');
    displayedData = cat === 'All' ? [...allData] : allData.filter(i => i.category === cat);
    renderFeed(true);
    renderSidebar(cat);
}

(window as any).filterByCat = filterByCat;

function renderHeroSlides(): void {
    const wrapper = document.getElementById('heroSliderWrapper');
    if (!wrapper || heroData.length === 0) return;

    wrapper.innerHTML = heroData.map((h, idx) => {
        const pic = pictureMarkup(h, { className: 'hero-img', priority: idx === 0, width: 1000, height: 563 });
        return `<a href="${h.url}" class="hero-slide" aria-hidden="${idx === 0 ? 'false' : 'true'}" tabindex="${idx === 0 ? '0' : '-1'}">
        ${pic}
        <div class="hero-overlay"></div>
        <div class="hero-content">
        <span class="hero-cat">${h.category}</span>
        ${idx === 0
            ? `<h2 class="hero-title">${h.title}</h2>`
            : `<p class="hero-title" role="heading" aria-level="2">${h.title}</p>`}
            <p class="hero-summary">${h.summary.substring(0, 270)}...
            <strong class="hero-cta">Ungkap Faktanya →</strong>
            </p>
            </div>
            </a>`;
    }).join('');
}

function renderHeroNav(): void {
    const heroEl = document.getElementById('hero');
    if (!heroEl) return;

    if (!heroEl.querySelector('.hero-nav')) {
        const navHTML = `<div class="hero-nav">
        <button class="nav-btn prev" id="heroPrev" type="button" aria-label="Slide sebelumnya"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
        <button class="nav-btn next" id="heroNext" type="button" aria-label="Slide berikutnya"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
        </div>`;
        heroEl.insertAdjacentHTML('beforeend', navHTML);
    }

    const prevBtn = document.getElementById('heroPrev');
    const nextBtn = document.getElementById('heroNext');
    if (prevBtn && !prevBtn.dataset.bound) {
        prevBtn.dataset.bound = 'true';
        prevBtn.addEventListener('click', (e) => { e.preventDefault(); moveHero(-1); });
    }
    if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.dataset.bound = 'true';
        nextBtn.addEventListener('click', (e) => { e.preventDefault(); moveHero(1); });
    }

    if (!heroEl.dataset.hoverBound) {
        heroEl.dataset.hoverBound = 'true';
        heroEl.addEventListener('mouseenter', stopHeroSlider);
        heroEl.addEventListener('mouseleave', startHeroSlider);
    }
}

function renderHero(skipSlides = false): void {
    if (heroData.length === 0) return;
    const heroEl = document.getElementById('hero');
    if (!heroEl) return;

    heroEl.classList.remove('skeleton');
    if (!skipSlides) renderHeroSlides();
    renderHeroNav();
    updateHeroPosition();
}

function updateHeroPosition(): void {
    const wrapper = document.getElementById('heroSliderWrapper');
    if (!wrapper) return;
    const offset = currentHeroIndex * 100;
    wrapper.style.transform = `translateX(-${offset}%)`;
    const slides = document.querySelectorAll('.hero-slide');
    slides.forEach((slide, idx) => {
        const active = idx === currentHeroIndex;
        slide.classList.toggle('active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        slide.setAttribute('tabindex', active ? '0' : '-1');
    });
}

function startHeroSlider(): void {
    if (heroTimer) clearInterval(heroTimer);
    if (heroData.length <= 1) return;
    heroTimer = setInterval(() => {
        currentHeroIndex = (currentHeroIndex + 1) % heroData.length;
        updateHeroPosition();
    }, 4600);
}

function stopHeroSlider(): void {
    if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
}

function moveHero(direction: number): void {
    currentHeroIndex += direction;
    if (currentHeroIndex >= heroData.length) currentHeroIndex = 0;
    else if (currentHeroIndex < 0) currentHeroIndex = heroData.length - 1;
    updateHeroPosition();
    stopHeroSlider();
    startHeroSlider();
}

function renderFeed(reset: boolean = false): void {
    if (reset) limit = 6;
    const container = document.getElementById('newsFeed');
    if (!container) return;

    const heroSection = document.getElementById('hero');
    const isHeroVisible = !!heroSection && heroSection.style.display !== 'none';
    const titlesInHero = heroData.map(h => h.title);

    const filteredItems = displayedData.filter(item => {
        if (isHeroVisible && titlesInHero.includes(item.title)) return false;
        return true;
    });

    const itemsToDisplay = filteredItems.slice(0, limit);

    container.removeAttribute('aria-busy');
    container.innerHTML = itemsToDisplay.map(item => {
        const cleanTitle = escapeAttr(item.title);
        const pic = pictureMarkup(item, { className: 'card-img', width: 400, height: 225 });

        return `<div class="card">
        ${pic}
        <div class="card-body">
        <a href="${item.url}" class="card-link">
        <div class="card-meta">
        <time datetime="${item.date.toISOString()}">
        ${item.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
        </time>
        <span class="card-category">${item.category}</span>
        </div>
        <h3 class="card-title">${cleanTitle}</h3>
        <p class="card-excerpt">${item.summary.substring(0, 200)}...</p>
        </a>
        </div>
        </div>`;
    }).join('');

    const loadMoreBtn = document.getElementById('loadMore');
    if (loadMoreBtn) {
        if (limit >= filteredItems.length) {
            loadMoreBtn.innerHTML = 'Kembali ke Atas ↑';
            loadMoreBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            loadMoreBtn.innerHTML = 'Klik Selanjutnya...';
            loadMoreBtn.onclick = () => { limit += 6; renderFeed(); renderSidebar(); };
        }
    }
}

function renderCategories(): void {
    const cats = [...new Set(allData.map(i => i.category))];
    const container = document.getElementById('categoryPills');
    if (!container) return;

    container.innerHTML = `<button type="button" class="pill" id="pill-all" aria-pressed="true">Kategori</button>` +
    cats.map(c => `<button type="button" class="pill" id="pill-${c.replace(/\s+/g, '-')}" aria-pressed="false">${c}</button>`).join('');

    document.getElementById('pill-all')?.addEventListener('click', function () { filterByCat('All', this); });
    cats.forEach(c => {
        document.getElementById(`pill-${c.replace(/\s+/g, '-')}`)?.addEventListener('click', function () { filterByCat(c, this); });
    });
}

function renderArchives(): void {
    const years = [...new Set(allData.map(i => i.date.getFullYear()))].sort((a, b) => b - a);
    const ySelect = document.getElementById('yearFilter') as HTMLSelectElement | null;
    if (!ySelect) return;
    ySelect.innerHTML = '<option value="">Pilih Tahun</option>';
    years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y.toString();
        opt.textContent = y.toString();
        ySelect.appendChild(opt);
    });
    updateMonthDropdown();
}

function updateMonthDropdown(): void {
    const ySelect = document.getElementById('yearFilter') as HTMLSelectElement | null;
    const mSelect = document.getElementById('monthFilter') as HTMLSelectElement | null;
    if (!ySelect || !mSelect) return;
    const selectedYear = ySelect.value;
    const monthsName = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    mSelect.innerHTML = '<option value="">Bulan</option>';
    if (selectedYear) {
        const availableMonths = [...new Set(allData.filter(i => i.date.getFullYear().toString() === selectedYear).map(i => i.date.getMonth()))].sort((a, b) => a - b);
        availableMonths.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.toString();
            opt.textContent = monthsName[m];
            mSelect.appendChild(opt);
        });
        mSelect.disabled = false;
    } else {
        mSelect.disabled = true;
    }
}

function runFilters(): void {
    const y = (document.getElementById('yearFilter') as HTMLSelectElement).value;
    const m = (document.getElementById('monthFilter') as HTMLSelectElement).value;
    const heroSection = document.getElementById('hero');
    if (y !== "") { if (heroSection) heroSection.style.display = 'none'; stopHeroSlider(); }
    else { if (heroSection) heroSection.style.display = ''; startHeroSlider(); }
    displayedData = allData.filter(i => {
        const matchY = y ? i.date.getFullYear().toString() === y : true;
        const matchM = m !== "" ? i.date.getMonth().toString() === m : true;
        return matchY && matchM;
    });
    renderFeed(true);
    renderSidebar();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchData);
} else {
    fetchData();
}
