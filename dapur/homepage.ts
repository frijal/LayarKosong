// ----------------------------------------------------------
// FILE: /ext/blog-engine.ts
// Versi V6.9 (Dynamic Feed & Hero Slider)
// Updated: 2026-03-01 (TS Conversion)
// ----------------------------------------------------------

// --- INTERFACES ---
interface Article {
  category: string;
  title: string;
  url: string;
  img: string;
  date: Date;
  summary: string;
}

// Struktur dari artikel.json: [Judul, Filename, Image, Date, Description]
type RawArticleData = [string, string, string, string, string?];

interface RawData {
  [category: string]: RawArticleData[];
}

// --- GLOBAL STATE ---
let allData: Article[] = [];
let displayedData: Article[] = [];
let heroData: Article[] = [];
let currentHeroIndex: number = 0;
let heroTimer: ReturnType<typeof setInterval> | null = null;
let limit: number = 6;

// --- FUNCTIONS ---

async function fetchData(): Promise<void> {
  try {
    const res = await fetch('artikel.json');
    if (!res.ok) throw new Error("Gagal load JSON");
    const data: RawData = await res.json();

    allData = [];

    // Flatten data & Sesuaikan URL ke V6.9
    for (const cat in data) {
      const catSlug = cat.toLowerCase().replace(/\s+/g, '-');

      data[cat].forEach(item => {
        const fileName = item[1];
        const fileSlug = fileName.endsWith('.html') ? fileName.replace(/\.html$/, '') : fileName;

        allData.push({
          category: cat,
          title: item[0],
          url: `/${catSlug}/${fileSlug}`, // URL Cantik V6.9
          img: item[2],
          date: new Date(item[3]),
          summary: item[4] || ''
        });
      });
    }

    allData.sort((a, b) => b.date.getTime() - a.date.getTime());
    displayedData = [...allData];

    // Ambil 1 artikel terbaru dari setiap kategori untuk Hero
    const categories = [...new Set(allData.map(item => item.category))];
    heroData = categories.map(cat => allData.find(item => item.category === cat) as Article);

    initSite();
    startHeroSlider();
  } catch (e) {
    console.error("Gagal ambil data", e);
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
  const heroSection = document.getElementById('hero') as HTMLElement | null;

  if (searchInput) {
    searchInput.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const val = target.value.toLowerCase();

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

  const clearBtn = document.getElementById('clearSearch');
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

  // Casting ke any karena assigned langsung ke properti onchange
  const yFilter = document.getElementById('yearFilter') as HTMLSelectElement | null;
  const mFilter = document.getElementById('monthFilter') as HTMLSelectElement | null;

  if (yFilter) yFilter.onchange = runFilters;
  if (mFilter) mFilter.onchange = runFilters;
}

function renderHero(): void {
  if (heroData.length === 0) return;
  const heroEl = document.getElementById('hero') as HTMLElement | null;
  const wrapper = document.getElementById('heroSliderWrapper') as HTMLElement | null;
  if (!heroEl || !wrapper) return;

  heroEl.classList.remove('skeleton');

  wrapper.innerHTML = heroData.map((h) => `
    <a href="${h.url}" class="hero-slide" style="background-image: url('${h.img}')">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <span class="hero-cat">${h.category}</span>
        <h1 class="hero-title">${h.title}</h1>
        <p class="hero-summary">
          ${h.summary.substring(0, 270)}...
          <strong style="color:var(--secondary);">Ungkap Faktanya →</strong>
        </p>
      </div>
    </a>
  `).join('');

  const navHTML = `
    <div class="hero-nav">
      <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
      <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
  `;

  const existingNav = heroEl.querySelector('.hero-nav');
  if (existingNav) existingNav.remove();
  heroEl.insertAdjacentHTML('beforeend', navHTML);

  // Re-attach event listeners (lebih aman daripada inline onclick di TS)
  document.getElementById('heroPrev')?.addEventListener('click', (e) => { e.preventDefault(); moveHero(-1); });
  document.getElementById('heroNext')?.addEventListener('click', (e) => { e.preventDefault(); moveHero(1); });

  heroEl.addEventListener('mouseenter', stopHeroSlider);
  heroEl.addEventListener('mouseleave', startHeroSlider);

  updateHeroPosition();
}

function updateHeroPosition(): void {
  const wrapper = document.getElementById('heroSliderWrapper') as HTMLElement | null;
  if (!wrapper) return;
  const offset = currentHeroIndex * 100;
  wrapper.style.transform = `translateX(-${offset}%)`;

  const slides = document.querySelectorAll('.hero-slide');
  slides.forEach((slide, idx) => {
    slide.classList.toggle('active', idx === currentHeroIndex);
  });
}

function startHeroSlider(): void {
  if (heroTimer) clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    currentHeroIndex = (currentHeroIndex + 1) % heroData.length;
    updateHeroPosition();
  }, 6000);
}

function stopHeroSlider(): void {
  if (heroTimer) {
    clearInterval(heroTimer);
    heroTimer = null;
  }
}

function moveHero(direction: number): void {
  currentHeroIndex += direction;
  if (currentHeroIndex >= heroData.length) {
    currentHeroIndex = 0;
  } else if (currentHeroIndex < 0) {
    currentHeroIndex = heroData.length - 1;
  }
  updateHeroPosition();
  stopHeroSlider();
  startHeroSlider();
}

function renderFeed(reset: boolean = false): void {
  if (reset) limit = 6;
  const container = document.getElementById('newsFeed') as HTMLElement | null;
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
    container.innerHTML += `
      <div class="card" style="animation: fadeIn 0.5s ease">
        <img src="${item.img}" class="card-img" alt="${item.title}" onerror="this.src='/thumbnail.webp'">
        <div class="card-body">
          <a href="${item.url}" class="card-link">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${item.category}</small>
              <time style="font-size: 0.8rem; opacity: 0.7;" datetime="${item.date.toISOString()}">
                ${item.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
              </time>
            </div>
            <h3 class="card-title">${item.title}</h3>
            <p class="card-excerpt">${item.summary.substring(0, 200)}...</p>
          </a>
        </div>
      </div>
    `;
  });

  const loadMoreBtn = document.getElementById('loadMore') as HTMLElement | null;
  if (loadMoreBtn) {
    const remaining = filteredItems.length - limit; // Hitung sisa artikel

    if (remaining <= 0) {
      // Jika sudah habis atau pas
      loadMoreBtn.innerHTML = 'Semua konten sudah dimuat • Kembali ke Atas ↑';
      loadMoreBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Jika masih ada sisa, tampilkan counter N
      // Di dalam fungsi renderFeed(), bagian else untuk loadMoreBtn
      loadMoreBtn.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0;">
      <span style="font-weight: bold;">Muat Lebih Banyak,</span>
      <span style="opacity: 0.8; font-size: 0.85rem; line-height: 1.2; max-width: 90%; margin: 0 auto;">
      Masih ada ${remaining} judul di bawah ini...
      </span>
      </div>
      `;

      loadMoreBtn.onclick = () => {
        // Efek loading sederhana saat diklik
        loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membuka artikel...';

        setTimeout(() => {
          limit += 6;
          renderFeed();
          renderSidebar();
        }, 300); // Delay 300ms buat gimmick loading biar smooth
      };
    }
  }
}

function renderSidebar(): void {
  const side = document.getElementById('sidebarRandom') as HTMLElement | null;
  if (!side) return;
  side.innerHTML = '';

  const titlesInHero = heroData.map(h => h.title);
  const displayedTitles = displayedData.slice(0, limit).map(item => item.title);

  const availableForSidebar = allData.filter(item =>
    !displayedTitles.includes(item.title) && !titlesInHero.includes(item.title)
  );

  const randoms = [...availableForSidebar].sort(() => 0.5 - Math.random()).slice(0, 5);

  randoms.forEach(item => {
    const cleanSummary = (item.summary || '').replace(/"/g, '&quot;');
    const cleanTitle = item.title.replace(/"/g, '&quot;');
    side.innerHTML += `
      <div class="mini-item" style="animation: fadeIn 0.5s ease">
        <img src="${item.img}" class="mini-thumb" alt="${cleanTitle}" onerror="this.src='/thumbnail.webp'">
        <div class="mini-text">
          <h4 data-tooltip="${cleanSummary}">
            <a href="${item.url}" title="${cleanTitle}" style="text-decoration:none; color:inherit;">
              ${item.title.substring(0, 50)}...
            </a>
          </h4>
          <small style="color:var(--text-muted)">${item.date.toLocaleDateString('id-ID')}</small>
        </div>
      </div>
    `;
  });
}

function renderCategories(): void {
  const cats = [...new Set(allData.map(i => i.category))];
  const container = document.getElementById('categoryPills');
  if (!container) return;

  const pillsHTML = cats.map(c =>
    `<div class="pill" id="pill-${c.replace(/\s+/g, '')}">${c}</div>`
  ).join('');

  container.innerHTML = `<div class="pill active" id="pill-all">Kategori</div>` + pillsHTML;

  // Re-attach listeners
  document.getElementById('pill-all')?.addEventListener('click', function(this: HTMLElement) { filterByCat('All', this); });
  cats.forEach(c => {
    document.getElementById(`pill-${c.replace(/\s+/g, '')}`)?.addEventListener('click', function(this: HTMLElement) {
      filterByCat(c, this);
    });
  });
}

function renderArchives(): void {
  const years = [...new Set(allData.map(i => i.date.getFullYear()))].sort((a, b) => b - a);
  const ySelect = document.getElementById('yearFilter') as HTMLSelectElement | null;
  if (!ySelect) return;
  ySelect.innerHTML = '<option value="">Pilih Tahun</option>';
  years.forEach(y => ySelect.innerHTML += `<option value="${y}">${y}</option>`);
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
    const availableMonths = [...new Set(allData.filter(i => i.date.getFullYear().toString() == selectedYear).map(i => i.date.getMonth()))].sort((a, b) => a - b);
    availableMonths.forEach(m => { mSelect.innerHTML += `<option value="${m}">${monthsName[m]}</option>`; });
    mSelect.disabled = false;
  } else {
    mSelect.disabled = true;
  }
}

function runFilters(): void {
  const y = (document.getElementById('yearFilter') as HTMLSelectElement).value;
  const m = (document.getElementById('monthFilter') as HTMLSelectElement).value;
  const heroSection = document.getElementById('hero');

  if (y !== "") {
    if (heroSection) heroSection.style.display = 'none';
    stopHeroSlider();
  } else {
    if (heroSection) heroSection.style.display = 'flex';
    startHeroSlider();
  }

  displayedData = allData.filter(i => {
    const matchY = y ? i.date.getFullYear().toString() === y : true;
    const matchM = m !== "" ? i.date.getMonth().toString() === m : true;
    return matchY && matchM;
  });
  renderFeed(true);
  renderSidebar();
}

function filterByCat(cat: string, el: HTMLElement): void {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  displayedData = cat === 'All' ? [...allData] : allData.filter(i => i.category === cat);
  renderFeed(true);
}

// Global functions for HTML access
(window as any).sendToWA = function(): void {
  const nameInput = document.getElementById('contact-name') as HTMLInputElement;
  const messageInput = document.getElementById('contact-message') as HTMLTextAreaElement;
  const name = nameInput.value;
  const message = messageInput.value;

  if (!name || !message) {
    alert("Isi nama dan pesannya dulu dong, Bro... 😀");
    return;
  }

  const noWA = "6281578163858";
  const text = `Halo Layar Kosong!%0A%0A*Nama:* ${name}%0A*Pesan:* ${message}`;

  // Implementasi toast sederhana atau panggil showToast jika ada
  window.open(`https://wa.me/${noWA}?text=${text}`, '_blank');
  nameInput.value = "";
  messageInput.value = "";
};

fetchData();
