let allData = [];
let displayedData = [];
let heroData = [];
let currentHeroIndex = 0;
let heroTimer;
let limit = 6;

async function fetchData() {
  try {
    const res = await fetch('artikel.json');
    const data = await res.json();

    allData = [];

    // Flatten data & Sesuaikan URL ke V6.9 (Hanya bagian ini yang diubah secara signifikan)
    for (const cat in data) {
      // Buat slug kategori untuk folder (Gaya Hidup -> gaya-hidup)
      const catSlug = cat.toLowerCase().replace(/\s+/g, '-');

      data[cat].forEach(item => {
        let fileName = item[1];
        // Hapus .html jika ada
        let fileSlug = fileName.endsWith('.html') ? fileName.replace(/\.html$/, '') : fileName;

        allData.push({
          category: cat,
          title: item[0],
          // V6.9 Compatible: Mengarah ke folder kategori, bukan lagi folder /artikel/
          url: '/' + catSlug + '/' + fileSlug,
          img: item[2],
          date: new Date(item[3]),
                     summary: item[4] || ''
        });
      });
    }

    allData.sort((a, b) => b.date - a.date);
    displayedData = [...allData];

    const categories = [...new Set(allData.map(item => item.category))];
    heroData = categories.map(cat => allData.find(item => item.category === cat));

    initSite();
    startHeroSlider();
  } catch (e) {
    console.error("Gagal ambil data", e);
    const feed = document.getElementById('newsFeed');
    if(feed) feed.innerHTML = "<p>Gagal memuat konten.</p>";
  }
}

function initSite() {
  renderHero();
  renderCategories();
  renderArchives();
  renderSidebar();
  renderFeed();

  // Search Logic (Versi Selalu Muncul Tombol ❌)
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');
  const heroSection = document.getElementById('hero');

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();

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

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    if (heroSection) heroSection.style.display = 'block';
    displayedData = [...allData];

    renderFeed(true);
    renderSidebar();
    startHeroSlider();
    searchInput.focus();
  });

  document.getElementById('yearFilter').onchange = runFilters;
  document.getElementById('monthFilter').onchange = runFilters;
}

function renderHero() {
  if (heroData.length === 0) return;
  const heroEl = document.getElementById('hero');
  const wrapper = document.getElementById('heroSliderWrapper');

  heroEl.classList.remove('skeleton');

  wrapper.innerHTML = heroData.map((h, i) => `
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

  heroEl.addEventListener('mouseenter', stopHeroSlider);
  heroEl.addEventListener('mouseleave', startHeroSlider);

  updateHeroPosition();
}

function updateHeroPosition() {
  const wrapper = document.getElementById('heroSliderWrapper');
  if (!wrapper) return;
  const offset = currentHeroIndex * 100;
  wrapper.style.transform = `translateX(-${offset}%)`;

  const slides = document.querySelectorAll('.hero-slide');
  slides.forEach((slide, idx) => {
    slide.classList.toggle('active', idx === currentHeroIndex);
  });
}

function startHeroSlider() {
  if (heroTimer) clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    currentHeroIndex = (currentHeroIndex + 1) % heroData.length;
    updateHeroPosition();
  }, 6000);
}

function stopHeroSlider() {
  clearInterval(heroTimer);
  heroTimer = null;
}

function goToHero(index) {
  currentHeroIndex = index;
  updateHeroPosition();
  stopHeroSlider();
  startHeroSlider();
}

function renderFeed(reset = false) {
  if (reset) limit = 6;
  const container = document.getElementById('newsFeed');
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
      loadMoreBtn.classList.add('is-top');
      loadMoreBtn.onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    } else {
      loadMoreBtn.innerHTML = 'Muat Lebih Banyak';
      loadMoreBtn.classList.remove('is-top');
      loadMoreBtn.onclick = () => {
        limit += 6;
        renderFeed();
        renderSidebar();
      };
    }
  }
}

function renderSidebar() {
  const side = document.getElementById('sidebarRandom');
  if(!side) return;
  side.innerHTML = '';

  const heroSection = document.getElementById('hero');
  const isHeroVisible = heroSection && heroSection.style.display !== 'none';
  const titlesInHero = heroData.map(h => h.title);
  const displayedTitles = displayedData.slice(0, limit).map(item => item.title);

  const availableForSidebar = allData.filter(item => {
    const isNotDuplicateInFeed = !displayedTitles.includes(item.title);
    const isNotDuplicateInHero = !titlesInHero.includes(item.title);
    return isNotDuplicateInFeed && isNotDuplicateInHero;
  });

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

function renderCategories() {
  const cats = [...new Set(allData.map(i => i.category))];
  const container = document.getElementById('categoryPills');
  if(!container) return;
  const pillsHTML = cats.map(c =>
  `<div class="pill" onclick="filterByCat('${c}', this)">${c}</div>`
  ).join('');

  container.innerHTML = `<div class="pill active" onclick="filterByCat('All', this)">Kategori</div>` + pillsHTML;
}

function renderArchives() {
  const years = [...new Set(allData.map(i => i.date.getFullYear()))].sort((a, b) => b - a);
  const ySelect = document.getElementById('yearFilter');
  if(!ySelect) return;
  ySelect.innerHTML = '<option value="">Pilih Tahun</option>';
  years.forEach(y => ySelect.innerHTML += `<option value="${y}">${y}</option>`);
  updateMonthDropdown();
}

function updateMonthDropdown() {
  const ySelect = document.getElementById('yearFilter');
  const mSelect = document.getElementById('monthFilter');
  if(!ySelect || !mSelect) return;
  const selectedYear = ySelect.value;
  const monthsName = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  mSelect.innerHTML = '<option value="">Bulan</option>';
  if (selectedYear) {
    const availableMonths = [...new Set(allData.filter(i => i.date.getFullYear() == selectedYear).map(i => i.date.getMonth()))].sort((a, b) => a - b);
    availableMonths.forEach(m => { mSelect.innerHTML += `<option value="${m}">${monthsName[m]}</option>`; });
    mSelect.disabled = false;
  } else {
    mSelect.disabled = true;
  }
}

function runFilters() {
  const y = document.getElementById('yearFilter').value;
  const m = document.getElementById('monthFilter').value;
  const heroSection = document.getElementById('hero');

  if (y !== "") {
    if(heroSection) heroSection.style.display = 'none';
    stopHeroSlider();
  } else {
    if(heroSection) heroSection.style.display = 'flex';
    startHeroSlider();
  }

  displayedData = allData.filter(i => {
    const matchY = y ? i.date.getFullYear() == y : true;
    const matchM = m !== "" ? i.date.getMonth() == m : true;
    return matchY && matchM;
  });
  renderFeed(true);
  renderSidebar();
}

// Handler event filter
const yFilter = document.getElementById('yearFilter');
const mFilter = document.getElementById('monthFilter');
if(yFilter) {
  yFilter.addEventListener('change', () => {
    updateMonthDropdown();
    runFilters();
  });
}
if(mFilter) mFilter.addEventListener('change', runFilters);

function filterByCat(cat, el) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  if(el) el.classList.add('active');
  displayedData = cat === 'All' ? [...allData] : allData.filter(i => i.category === cat);
  renderFeed(true);
}

function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

function sendToWA() {
  const name = document.getElementById('contact-name').value;
  const message = document.getElementById('contact-message').value;

  if(!name || !message) {
    alert("Isi nama dan pesannya dulu dong, Bro... 😀");
    return;
  }

  const noWA = "6281578163858";
  const text = `Halo Layar Kosong!%0A%0A*Nama:* ${name}%0A*Pesan:* ${message}`;

  showToast("Membuka WhatsApp... Pesan siap dikirim!");

  setTimeout(() => {
    window.open(`https://wa.me/${noWA}?text=${text}`, '_blank');
    document.getElementById('contact-name').value = "";
    document.getElementById('contact-message').value = "";
  }, 1200);
}

fetchData();
