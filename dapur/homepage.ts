// ----------------------------------------------------------
// FILE: /ext/blog-engine.ts
// Versi V6.9 (Dynamic Feed & Hero Slider)
// Updated: 2026-03-03 (Fix Minify & Filter Logic)
// ----------------------------------------------------------

interface Article {
  category: string;
  title: string;
  url: string;
  img: string;
  date: Date;
  summary: string;
}

type RawArticleData = [string, string, string, string, string?];

interface RawData {
  [category: string]: RawArticleData[];
}

let allData: Article[] = [];
let displayedData: Article[] = [];
let heroData: Article[] = [];
let currentHeroIndex: number = 0;
let heroTimer: ReturnType<typeof setInterval> | null = null;
let limit: number = 6;

async function fetchData(): Promise<void> {
  try {
    const res = await fetch('artikel.json');
    if (!res.ok) throw new Error("Gagal load JSON");
    const data: RawData = await res.json();

    allData = [];

    for (const cat in data) {
      const catSlug = cat.toLowerCase().replace(/\s+/g, '-');

      data[cat].forEach(item => {
        const fileName = item[1];
        const fileSlug = fileName.endsWith('.html') ? fileName.replace(/\.html$/, '') : fileName;

        allData.push({
          category: cat,
          title: item[0],
          url: `/${catSlug}/${fileSlug}`,
          img: item[2],
          date: new Date(item[3]),
                     summary: item[4] || ''
        });
      });
    }

    allData.sort((a, b) => b.date.getTime() - a.date.getTime());
    displayedData = [...allData];

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
  const clearBtn = document.getElementById('clearSearch');
  const heroSection = document.getElementById('hero');

  if (searchInput) {
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

  // --- Filter Logic Fix ---
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

function renderHero(): void {
  if (heroData.length === 0) return;
  const heroEl = document.getElementById('hero');
  const wrapper = document.getElementById('heroSliderWrapper');
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

  const loadMoreBtn = document.getElementById('loadMore');
  if (loadMoreBtn) {
    if (limit >= filteredItems.length) {
      loadMoreBtn.innerHTML = 'Kembali ke Atas ↑';
      loadMoreBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      loadMoreBtn.innerHTML = 'Klik Selanjutnya...';
      loadMoreBtn.onclick = () => {
        limit += 6;
        renderFeed();
        renderSidebar();
      };
    }
  }
}

function renderSidebar(): void {
  const side = document.getElementById('sidebarRandom');
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

  container.innerHTML = `<div class="pill active" id="pill-all">Kategori</div>`;
  cats.forEach(c => {
    const pillId = `pill-${c.replace(/\s+/g, '-')}`;
    container.innerHTML += `<div class="pill" id="${pillId}">${c}</div>`;
  });

  // Re-attach listeners (Safety from minify)
  document.getElementById('pill-all')?.addEventListener('click', function() { filterByCat('All', this); });
  cats.forEach(c => {
    const pillId = `pill-${c.replace(/\s+/g, '-')}`;
    document.getElementById(pillId)?.addEventListener('click', function() {
      filterByCat(c, this);
    });
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

  if (y !== "") {
    if (heroSection) heroSection.style.display = 'none';
    stopHeroSlider();
  } else {
    if (heroSection) heroSection.style.display = 'block';
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

// Global Exports (Supaya bisa dipanggil dari HTML kalau terpaksa)
(window as any).sendToWA = function(): void {
  const name = (document.getElementById('contact-name') as HTMLInputElement).value;
  const message = (document.getElementById('contact-message') as HTMLTextAreaElement).value;

  if (!name || !message) {
    alert("Isi nama dan pesannya dulu dong, Bro... 😀");
    return;
  }

  const noWA = "6281578163858";
  const text = `Halo Layar Kosong!%0A%0A*Nama:* ${name}%0A*Pesan:* ${message}`;

  // Membuka WA
  window.open(`https://wa.me/${noWA}?text=${text}`, '_blank');
  (document.getElementById('contact-name') as HTMLInputElement).value = "";
  (document.getElementById('contact-message') as HTMLTextAreaElement).value = "";
};

fetchData();