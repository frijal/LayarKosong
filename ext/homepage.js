let allData = [];
let displayedData = [];
let limit = 6;

async function fetchData() {
  try {
    const res = await fetch('artikel.json');
    const data = await res.json();

    // Kosongkan array sebelum mengisi (menghindari duplikasi saat refresh)
    allData = [];

    // Flatten data dari kategori JSON
    for (const cat in data) {
      data[cat].forEach(item => {
        allData.push({
          category: cat,
          title: item[0],
          // Menambahkan folder 'artikel/' sebelum slug file .html
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

    initSite();
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
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');
    const heroSection = document.getElementById('hero');

    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;

      // Tampilkan/Sembunyikan tombol X
      clearBtn.style.display = val.length > 0 ? 'block' : 'none';

      // Sembunyikan Hero jika sedang mencari
      heroSection.style.display = val.length > 0 ? 'none' : 'flex';

      // Jalankan filter
      runSearch(val.toLowerCase());
    });

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      heroSection.style.display = 'flex';

      // Reset data ke awal
      displayedData = [...allData];
      renderFeed(true);
      renderSidebar();
      searchInput.focus();
    });

    function runSearch(keyword) {
      displayedData = allData.filter(i =>
      i.title.toLowerCase().includes(keyword) ||
      i.summary.toLowerCase().includes(keyword)
      );
      renderFeed(true);
      renderSidebar();
    }


    // Logika Otomatis Sembunyikan Hero
    if (val.length > 0) {
      // Jika ada teks di kolom pencarian, sembunyikan hero
      heroSection.style.display = 'none';
    } else {
      // Jika kolom pencarian kosong, tampilkan kembali hero
      heroSection.style.display = 'flex'; // atau 'block' sesuai CSS awal
    }

    // Filter data seperti biasa
    displayedData = allData.filter(i =>
    i.title.toLowerCase().includes(val) ||
    i.summary.toLowerCase().includes(val)
    );

    renderFeed(true);
    renderSidebar(); // Pastikan sidebar juga terupdate tanpa duplikat
  });

  // Archive Change
  document.getElementById('yearFilter').onchange = runFilters;
  document.getElementById('monthFilter').onchange = runFilters;
}

function renderHero() {
  const h = allData[0];
  const el = document.getElementById('hero');
  el.classList.remove('skeleton');
  el.style.backgroundImage = `url('${h.img}')`;
  el.innerHTML = `
  <div class="hero-overlay"></div>
  <div class="hero-content">
  <span class="hero-cat">${h.category}</span>
  <h1 style="font-family:'Montserrat'; font-size:2.5rem; margin:15px 0;">${h.title}</h1>
  <p>${h.summary}</p>
  <a href="${h.url}" class="pill active" style="margin-top:20px; display:inline-block; text-decoration:none;">dimana isinya?</a>
  </div>
  `;
}

function renderFeed(reset = false) {
  if (reset) limit = 6;
  const container = document.getElementById('newsFeed');
  container.innerHTML = '';

  // Ambil judul yang sedang tampil di Hero (artikel paling baru)
  // Kita cek apakah hero sedang tampil (display != 'none')
  const heroSection = document.getElementById('hero');
  const isHeroVisible = heroSection && heroSection.style.display !== 'none';
  const heroTitle = allData.length > 0 ? allData[0].title : null;

  // Filter items agar tidak menyertakan artikel yang ada di hero
  // HANYA jika hero sedang tampil (tidak dalam mode search/filter)
  const items = displayedData
  .filter(item => {
    if (isHeroVisible && item.title === heroTitle) return false;
    return true;
  })
  .slice(0, limit);

  items.forEach(item => {
    container.innerHTML += `
    <div class="card" style="animation: fadeIn 0.5s ease">
    <img src="${item.img}" class="card-img" alt="img" onerror="this.src='thumbnail.webp'">
    <div class="card-body">
    <a href="${item.url}" class="card-link">
    <small style="color:var(--primary); font-weight:bold">
    ${item.category}
    </small>

    <h3 class="card-title">
    ${item.title}
    </h3>

    <p class="card-excerpt">
    ${item.summary.substring(0, 200)}...
    </p>

    <div class="card-footer">
    <time class="card-date" datetime="${item.date.toISOString()}">
    ${item.date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })}
    </time>
    </div>
    </a>
    </div>
    </div>
    `;
  });
}

function renderSidebar() {
  const side = document.getElementById('sidebarRandom');
  side.innerHTML = '';

  // 1. Ambil judul yang ada di Hero (jika Hero sedang tampil)
  const heroSection = document.getElementById('hero');
  const isHeroVisible = heroSection && heroSection.style.display !== 'none';
  const heroTitle = (allData.length > 0 && isHeroVisible) ? allData[0].title : null;

  // 2. Ambil semua judul yang saat ini tampil di Feed Utama
  // Sesuai logika renderFeed, kita ambil judul dari displayedData berdasarkan limit
  const displayedTitles = displayedData.slice(0, limit).map(item => item.title);

  // 3. Filter data untuk Sidebar:
  // - Tidak boleh ada di Feed Utama
  // - Tidak boleh ada di Hero (jika Hero aktif)
  const availableForSidebar = allData.filter(item => {
    const isNotDuplicateInFeed = !displayedTitles.includes(item.title);
    const isNotDuplicateInHero = item.title !== heroTitle;

    return isNotDuplicateInFeed && isNotDuplicateInHero;
  });

  // 4. Acak dan ambil 5 artikel
  const randoms = [...availableForSidebar]
  .sort(() => 0.5 - Math.random())
  .slice(0, 5);

  // 5. Render ke HTML
  randoms.forEach(item => {
    const cleanSummary = item.summary.replace(/"/g, '&quot;');

    side.innerHTML += `
    <div class="mini-item" style="animation: fadeIn 0.5s ease">
    <img src="${item.img}" class="mini-thumb" onerror="this.src='thumbnail.webp'">
    <div class="mini-text">
    <h4 data-tooltip="${cleanSummary}">
    <a href="${item.url}" style="text-decoration:none; color:inherit;">
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
  cats.forEach(c => {
    container.innerHTML += `<div class="pill" onclick="filterByCat('${c}', this)">${c}</div>`;
  });
}

function renderArchives() {
  const years = [...new Set(allData.map(i => i.date.getFullYear()))].sort((a, b) => b - a);
  const ySelect = document.getElementById('yearFilter');

  // Reset dan isi Tahun
  ySelect.innerHTML = '<option value="">Pilih Tahun</option>';
  years.forEach(y => ySelect.innerHTML += `<option value="${y}">${y}</option>`);

  // Pastikan dropdown bulan di-reset di awal
  updateMonthDropdown();
}

function updateMonthDropdown() {
  const ySelect = document.getElementById('yearFilter');
  const mSelect = document.getElementById('monthFilter');
  const selectedYear = ySelect.value;
  const monthsName = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  mSelect.innerHTML = '<option value="">Bulan</option>';

  if (selectedYear) {
    // Cari bulan apa saja yang ada di tahun terpilih
    const availableMonths = [...new Set(
      allData
      .filter(i => i.date.getFullYear() == selectedYear)
      .map(i => i.date.getMonth())
    )].sort((a, b) => a - b);

    availableMonths.forEach(m => {
      mSelect.innerHTML += `<option value="${m}">${monthsName[m]}</option>`;
    });
    mSelect.disabled = false;
  } else {
    mSelect.disabled = true; // Matikan bulan jika tahun belum dipilih
  }
}

function runFilters() {
  const ySelect = document.getElementById('yearFilter');
  const mSelect = document.getElementById('monthFilter');
  const heroSection = document.getElementById('hero');

  const y = ySelect.value;
  const m = mSelect.value;

  // --- LOGIKA SEMBUNYIKAN HERO ---
  if (y !== "") {
    // Jika tahun dipilih, sembunyikan hero agar hasil filter naik ke atas
    heroSection.style.display = 'none';
  } else {
    // Jika filter direset ke "Tahun", tampilkan hero lagi
    heroSection.style.display = 'flex';
  }

  // Jalankan filter data
  displayedData = allData.filter(i => {
    const matchY = y ? i.date.getFullYear() == y : true;
    const matchM = m !== "" ? i.date.getMonth() == m : true;
    return matchY && matchM;
  });

  renderFeed(true);
  renderSidebar();
}

// Tambahkan event listener khusus untuk cascading
document.getElementById('yearFilter').addEventListener('change', () => {
  updateMonthDropdown(); // Update list bulan dulu
  runFilters();          // Baru jalankan filter data
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

fetchData();

function showToast(message) {
  // Buat container jika belum ada
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  // Buat elemen toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`;

  container.appendChild(toast);

  // Hilangkan toast otomatis setelah 3 detik
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

function sendToWA() {
  const name = document.getElementById('contact-name').value;
  const email = document.getElementById('contact-email').value;
  const message = document.getElementById('contact-message').value;

  // Validasi sederhana: Nama dan Pesan wajib diisi
  if(!name || !message) {
    alert("Nama dan Pesan jangan dikosongkan ya, Bosku!");
    return;
  }

  // Ganti dengan nomor WhatsApp kamu (format 62...)
  const noWA = "6281578163858";

  // Menyusun format pesan WhatsApp
  const text = `Halo Layar Kosong!%0A%0A*Nama:* ${name}%0A*Email:* ${email}%0A*Pesan:* ${message}`;

  // Panggil notifikasi Toast (fungsi showToast ada di chat sebelumnya)
  showToast("Membuka WhatsApp... Pesan siap dikirim!");

  // Jeda 1 detik agar user bisa lihat notifikasi suksesnya dulu
  setTimeout(() => {
    window.open(`https://wa.me/${noWA}?text=${text}`, '_blank');

    // Bersihkan input setelah berhasil
    document.getElementById('contact-name').value = "";
    document.getElementById('contact-email').value = "";
    document.getElementById('contact-message').value = "";
  }, 1200);
}
