let allData = [];
let displayedData = [];
let heroData = []; // Menyimpan artikel terbaru dari tiap kategori
let currentHeroIndex = 0;
let heroTimer;
let limit = 6;

async function fetchData() {
  try {
    const res = await fetch('artikel.json');
    const data = await res.json();

    allData = [];

    // Flatten data dari kategori JSON
    for (const cat in data) {
      data[cat].forEach(item => {
        allData.push({
          category: cat,
          title: item[0],
          url: 'artikel/' + item[1],
          img: item[2],
          date: new Date(item[3]),
                     summary: item[4]
        });
      });
    }

    // Sort terbaru (berdasarkan tanggal)
    allData.sort((a, b) => b.date - a.date);
    displayedData = [...allData];

    // --- SETUP HERO DATA (1 terbaru per kategori) ---
    const categories = [...new Set(allData.map(item => item.category))];
    heroData = categories.map(cat => allData.find(item => item.category === cat));

    initSite();
    startHeroSlider(); // Jalankan slider otomatis
  } catch (e) {
    console.error("Gagal ambil data", e);
    document.getElementById('newsFeed').innerHTML = "<p>Gagal memuat konten. Pastikan file JSON tersedia.</p>";
  }
}

function initSite() {
  renderHero();
  renderCategories();
  renderArchives();
  renderSidebar();
  renderFeed();

  // Search Logic
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');
  const heroSection = document.getElementById('hero');

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();

    clearBtn.style.display = val.length > 0 ? 'block' : 'none';

    if (val.length > 0) {
      heroSection.style.display = 'none';
      stopHeroSlider(); // Berhenti slider kalau lagi nyari
    } else {
      heroSection.style.display = 'flex';
      startHeroSlider();
    }

    displayedData = allData.filter(i =>
    i.title.toLowerCase().includes(val) ||
    i.summary.toLowerCase().includes(val)
    );

    renderFeed(true);
    renderSidebar();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    heroSection.style.display = 'flex';
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

  // Kita isi semua slide sekaligus
  wrapper.innerHTML = heroData.map((h, i) => `
  <div class="hero-slide" style="background-image: url('${h.img}')">
  <div class="hero-overlay"></div>
  <div class="hero-content">
  <span class="hero-cat">${h.category}</span>
  <h1 style="font-family:'Montserrat'; font-size:2.5rem; margin:15px 0; line-height:1.2;">${h.title}</h1>
  <p style="opacity: 0.9;">${h.summary.substring(0, 160)}...</p>

  <div class="hero-actions">
  <div class="hero-dots">
  ${heroData.map((_, dotIdx) => `
    <div class="dot ${dotIdx === i ? 'active' : ''}"
    onclick="goToHero(${dotIdx})">
    </div>
    `).join('')}
    </div>
    <a href="${h.url}" class="pill active" style="text-decoration:none;">Baca Artikel</a>
    </div>
    </div>
    </div>
    `).join('');

    updateHeroPosition();
}

function updateHeroPosition() {
  const wrapper = document.getElementById('heroSliderWrapper');
  if (!wrapper) return;

  // Geser container berdasarkan index (0, 100%, 200%, dst)
  const offset = currentHeroIndex * 100;
  wrapper.style.transform = `translateX(-${offset}%)`;

  // Beri class 'active' ke slide yang sedang tampil untuk animasi teks
  const slides = document.querySelectorAll('.hero-slide');
  slides.forEach((slide, idx) => {
    slide.classList.toggle('active', idx === currentHeroIndex);
  });
}

function startHeroSlider() {
  stopHeroSlider();
  heroTimer = setInterval(() => {
    currentHeroIndex = (currentHeroIndex + 1) % heroData.length;
    updateHeroPosition();
  }, 6000); // 6 detik
}

function stopHeroSlider() {
  clearInterval(heroTimer);
}

function goToHero(index) {
  stopHeroSlider();
  currentHeroIndex = index;
  updateHeroPosition(); // Hanya geser, jangan render ulang HTML
  startHeroSlider();
}

function renderFeed(reset = false) {
  if (reset) limit = 6;
  const container = document.getElementById('newsFeed');
  container.innerHTML = '';

  const heroSection = document.getElementById('hero');
  const isHeroVisible = heroSection && heroSection.style.display !== 'none';

  // Ambil semua judul yang sedang mejeng di slider Hero
  const titlesInHero = heroData.map(h => h.title);

  const items = displayedData
  .filter(item => {
    // Jika Hero tampil, jangan tampilkan artikel yang sudah ada di slider Hero
    if (isHeroVisible && titlesInHero.includes(item.title)) return false;
    return true;
  })
  .slice(0, limit);

  items.forEach(item => {
    container.innerHTML += `
    <div class="card" style="animation: fadeIn 0.5s ease">
    <img src="${item.img}" class="card-img" alt="${item.title}" onerror="this.src='thumbnail.webp'">
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
}

// ... (Fungsi renderSidebar, renderCategories, renderArchives, dsb tetap sama seperti sebelumnya)

function renderSidebar() {
  const side = document.getElementById('sidebarRandom');
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
    const cleanSummary = item.summary.replace(/"/g, '&quot;');
    const cleanTitle = item.title.replace(/"/g, '&quot;');
    side.innerHTML += `
    <div class="mini-item" style="animation: fadeIn 0.5s ease">
    <img src="${item.img}" class="mini-thumb" alt="${cleanTitle}" onerror="this.src='thumbnail.webp'">
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
  container.innerHTML = '<div class="pill active" onclick="filterByCat(\'All\', this)">All</div>';
  cats.forEach(c => {
    container.innerHTML += `<div class="pill" onclick="filterByCat('${c}', this)">${c}</div>`;
  });
}

function renderArchives() {
  const years = [...new Set(allData.map(i => i.date.getFullYear()))].sort((a, b) => b - a);
  const ySelect = document.getElementById('yearFilter');
  ySelect.innerHTML = '<option value="">Pilih Tahun</option>';
  years.forEach(y => ySelect.innerHTML += `<option value="${y}">${y}</option>`);
  updateMonthDropdown();
}

function updateMonthDropdown() {
  const ySelect = document.getElementById('yearFilter');
  const mSelect = document.getElementById('monthFilter');
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
    heroSection.style.display = 'none';
    stopHeroSlider();
  } else {
    heroSection.style.display = 'flex';
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

document.getElementById('yearFilter').addEventListener('change', () => {
  updateMonthDropdown();
  runFilters();
});
document.getElementById('monthFilter').addEventListener('change', runFilters);

function filterByCat(cat, el) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  if(el) el.classList.add('active');
  displayedData = cat === 'All' ? [...allData] : allData.filter(i => i.category === cat);
  renderFeed(true);
}

document.getElementById('loadMore').onclick = () => {
  limit += 6;
  renderFeed();
  renderSidebar();
};

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
  const email = document.getElementById('contact-email').value;
  const message = document.getElementById('contact-message').value;
  if(!name || !message) {
    alert("isi aja semua kolomnya Bro... 😀");
    return;
  }
  const noWA = "6281578163858";
  const text = `Halo Layar Kosong!%0A%0A*Nama:* ${name}%0A*Email:* ${email}%0A*Pesan:* ${message}`;
  showToast("Membuka WhatsApp... Pesan siap dikirim!");
  setTimeout(() => {
    window.open(`https://wa.me/${noWA}?text=${text}`, '_blank');
    document.getElementById('contact-name').value = "";
    document.getElementById('contact-email').value = "";
    document.getElementById('contact-message').value = "";
  }, 1200);
}

fetchData();
