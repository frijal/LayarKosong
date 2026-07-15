/**
 * =================================================================================
 * homepage.ts - Versi Integrasi Penuh dengan siteDataProvider (Optimized Images & Typography)
 * + Fitur Search Enter Redirect (Menggunakan Form Submit)
 * + WCAG AA Typography Compliance (Menggunakan var(--text-muted))
 * =================================================================================
 */

interface Article {
  category: string;
  title: string;
  id: string;
  url: string;
  img: string;      // Thumbnail (-sm.webp)
  fullImg: string;  // Gambar asli untuk Hero
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
let currentActiveCategory: string = 'All';

// 🔥 HELPER BARU: Merapikan tipografi kategori (gaya-hidup -> Gaya Hidup)
function formatCategoryName(slug: string): string {
  if (!slug) return 'Lainnya';
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

async function fetchData(): Promise<void> {
  try {
    const data = await (window as any).siteDataProvider.getFor('homepage.ts');
    allData = [];

    for (const cat in data) {
      // catSlug: Murni untuk URL (tetap huruf kecil dan pakai setrip)
      const catSlug = cat.toLowerCase().replace(/\s+/g, '-');

      // readableCat: Tipografi cantik untuk ditampilkan ke UI
      const readableCat = formatCategoryName(cat);

      data[cat].forEach((item: any) => {
        const fileSlug = item.id.replace(/\.html$/, '');

        const originalImage = item.image || '/thumbnail.webp';
        const smallImage = originalImage.replace(/\.(jpg|jpeg|png|webp)$/i, '-sm.webp');

        // 🔥 FIX: Bersihkan embel-embel "- Layar Kosong" dari judul
        const cleanTitle = item.title.replace(/\s*-\s*Layar Kosong$/i, '');

        allData.push({
          category: readableCat,
          title: cleanTitle, // Gunakan judul yang sudah bersih
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

    // Ekstrak kategori unik berdasarkan yang sudah dirapikan
    const categories = [...new Set(allData.map(item => item.category))];
    heroData = categories.map(cat => allData.find(item => item.category === cat) as Article);

    initSite();
    startHeroSlider();
  } catch (e) {
    console.error("Gagal ambil data via provider", e);
    const feed = document.getElementById('newsFeed');
    if (feed) feed.innerHTML = "<p>Gagal memuat konten.</p>";
  }
}

function initSite(): void {
  renderHero();
  renderCategories();
  renderArchives();
  renderSidebar();
  renderFeed();

  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const clearBtn = document.getElementById('clearSearch');
  const heroSection = document.getElementById('hero');
  const searchForm = document.getElementById('searchForm'); // Tambahan elemen form

  if (searchInput) {
    // 1. Live Filter (Tetap dipertahankan biar UI responsif)
    searchInput.addEventListener('input', (e: Event) => {
      const val = (e.target as HTMLInputElement).value.toLowerCase();
      if (val.length > 0) {
        if (heroSection) heroSection.style.display = 'none';
        stopHeroSlider();
      } else {
        if (heroSection) heroSection.style.display = 'block';
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

  // 2. 🔥 FITUR BARU: Event Submit Form untuk Redirect saat Enter/Klik Search di HP
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e: Event) => {
      e.preventDefault(); // Mencegah form nge-reload halaman default
      const val = searchInput.value.trim();
      if (val.length > 0) {
        // Redirect ke halaman pencarian dengan query yang di-encode
        window.location.href = `https://dalam.web.id/search/?q=${encodeURIComponent(val)}`;
      }
    });
  }

  if (clearBtn && searchInput) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      if (heroSection) heroSection.style.display = 'block';
      displayedData = [...allData];
      renderFeed(true);
      renderSidebar();
      startHeroSlider();
      searchInput.focus();
    });
  }

  const yFilter = document.getElementById('yearFilter') as HTMLSelectElement | null;
  const mFilter = document.getElementById('monthFilter') as HTMLSelectElement | null;

  if (yFilter) {
    yFilter.addEventListener('change', () => {
      updateMonthDropdown();
      runFilters();
    });
  }
  if (mFilter) {
    mFilter.addEventListener('change', runFilters);
  }
}

function renderSidebar(targetCat?: string) {
  const side = document.getElementById('sidebarRandom');
  if (!side) return;
  side.innerHTML = '';

  const activePill = document.querySelector('.pill.active');
  const currentCategory = targetCat || (activePill ? activePill.textContent?.trim() : 'All');

  let filteredForSidebar = (currentCategory === 'All' || currentCategory === 'Kategori')
  ? [...allData]
  : allData.filter(item => item.category === currentCategory);

  const displayedTitles = displayedData.slice(0, limit).map(item => item.title);
  const finalAvailable = filteredForSidebar.filter(item => !displayedTitles.includes(item.title));
  const randoms = [...finalAvailable].sort(() => 0.5 - Math.random()).slice(0, 10);

  side.innerHTML = randoms.map(item => {
    const cleanSummary = (item.summary || '').replace(/"/g, '&quot;');
    const cleanTitle = item.title.replace(/"/g, '&quot;');
    const d = item.date;
    const formattedDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear())}`;

    return `
    <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <img src="${item.img}" class="mini-thumb" alt="${cleanTitle}" onerror="if(this.src.includes('-sm.webp')) { this.src='${item.fullImg}'; } else { this.onerror=null; this.src='/thumbnail-sm.webp'; }" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; flex-shrink:0;">
    <div class="mini-text">
    <h4 title="${cleanSummary}" style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3; font-weight: 600;">
    <a href="${item.url}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${item.title}
    </a>
    </h4>
    <div style="display: flex; align-items: center; gap: 5px;">
    <small style="color: var(--text-muted); font-size: 0.65rem;">${formattedDate} •</small>
    <span style="color: var(--primary); font-weight: bold; font-size: 0.65rem; text-transform: uppercase;">${item.category}</span>
    </div>
    </div>
    </div>`;
  }).join('');
}

(window as any).renderSidebar = renderSidebar;

function filterByCat(cat: string, el?: HTMLElement): void {
  if (el) {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
  }
  displayedData = cat === 'All' ? [...allData] : allData.filter(i => i.category === cat);
  renderFeed(true);
  renderSidebar(cat);
}

(window as any).filterByCat = filterByCat;

function renderHero(): void {
  if (heroData.length === 0) return;
  const heroEl = document.getElementById('hero');
  const wrapper = document.getElementById('heroSliderWrapper');
  if (!heroEl || !wrapper) return;

  heroEl.classList.remove('skeleton');

  wrapper.innerHTML = heroData.map((h) => `
  <a href="${h.url}" class="hero-slide" style="background-image: url('${h.fullImg}')">
  <div class="hero-overlay"></div>
  <div class="hero-content">
  <span class="hero-cat">${h.category}</span>
  <h1 class="hero-title">${h.title}</h1>
  <p class="hero-summary">
  ${h.summary.substring(0, 270)}...
  <strong style="color:var(--secondary);">Ungkap Faktanya →</strong>
  </p>
  </div>
  </a>`).join('');

  const navHTML = `
  <div class="hero-nav">
  <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
  </div>`;

  const existingNav = heroEl.querySelector('.hero-nav');
  if (existingNav) existingNav.remove();
  heroEl.insertAdjacentHTML('beforeend', navHTML);

  document.getElementById('heroPrev')?.addEventListener('click', (e) => { e.preventDefault(); moveHero(-1); });
  document.getElementById('heroNext')?.addEventListener('click', (e) => { e.preventDefault(); moveHero(1); });

  heroEl.addEventListener('mouseenter', stopHeroSlider);
  heroEl.addEventListener('mouseleave', startHeroSlider);

  updateHeroPosition();
}

function updateHeroPosition(): void {
  const wrapper = document.getElementById('heroSliderWrapper');
  if (!wrapper) return;
  const offset = currentHeroIndex * 100;
  wrapper.style.transform = `translateX(-${offset}%)`;
  const slides = document.querySelectorAll('.hero-slide');
  slides.forEach((slide, idx) => { slide.classList.toggle('active', idx === currentHeroIndex); });
}

function startHeroSlider(): void {
  if (heroTimer) clearInterval(heroTimer);
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
  if (currentHeroIndex >= heroData.length) { currentHeroIndex = 0; }
  else if (currentHeroIndex < 0) { currentHeroIndex = heroData.length - 1; }
  updateHeroPosition();
  stopHeroSlider();
  startHeroSlider();
}

function renderFeed(reset: boolean = false): void {
  if (reset) limit = 6;
  const container = document.getElementById('newsFeed');
  if (!container) return;
  container.innerHTML = '';

  const heroSection = document.getElementById('hero');
  const isHeroVisible = heroSection && heroSection.style.display !== 'none';
  const titlesInHero = heroData.map(h => h.title);

  const filteredItems = displayedData.filter(item => {
    if (isHeroVisible && titlesInHero.includes(item.title)) return false;
    return true;
  });

  const itemsToDisplay = filteredItems.slice(0, limit);

  itemsToDisplay.forEach(item => {
    const cleanTitle = item.title.replace(/"/g, '&quot;');
    container.innerHTML += `
    <div class="card" style="animation: fadeIn 0.5s ease">
    <img src="${item.img}" class="card-img" alt="${cleanTitle}" onerror="if(this.src.includes('-sm.webp')) { this.src='${item.fullImg}'; } else { this.onerror=null; this.src='/thumbnail-sm.webp'; }">
    <div class="card-body">
    <a href="${item.url}" class="card-link">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <time style="color: var(--text-muted); font-size: 0.8rem;" datetime="${item.date.toISOString()}">
    ${item.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
    </time>
    <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${item.category}</small>
    </div>
    <h3 class="card-title">${item.title}</h3>
    <p class="card-excerpt">${item.summary.substring(0, 200)}...</p>
    </a>
    </div>
    </div>`;
  });

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
  container.innerHTML = `<div class="pill active" id="pill-all">Kategori</div>`;
  cats.forEach(c => {
    // Pastikan ID valid tanpa spasi
    const pillId = `pill-${c.replace(/\s+/g, '-')}`;
    container.innerHTML += `<div class="pill" id="${pillId}">${c}</div>`;
  });
  document.getElementById('pill-all')?.addEventListener('click', function() { filterByCat('All', this); });
  cats.forEach(c => {
    const pillId = `pill-${c.replace(/\s+/g, '-')}`;
    document.getElementById(pillId)?.addEventListener('click', function() { filterByCat(c, this); });
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
  } else { mSelect.disabled = true; }
}

function runFilters(): void {
  const y = (document.getElementById('yearFilter') as HTMLSelectElement).value;
  const m = (document.getElementById('monthFilter') as HTMLSelectElement).value;
  const heroSection = document.getElementById('hero');
  if (y !== "") { if (heroSection) heroSection.style.display = 'none'; stopHeroSlider(); }
  else { if (heroSection) heroSection.style.display = 'block'; startHeroSlider(); }
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
