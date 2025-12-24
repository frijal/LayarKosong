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
    displayedData = allData.filter(i => i.title.toLowerCase().includes(val));
    renderFeed(true);
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
  <a href="${h.url}" class="pill active" style="margin-top:20px; display:inline-block; text-decoration:none;">Baca Sekarang</a>
  </div>
  `;
}

function renderFeed(reset = false) {
  if(reset) limit = 6;
  const container = document.getElementById('newsFeed');
  container.innerHTML = '';

  const items = displayedData.slice(0, limit);
  items.forEach(item => {
    container.innerHTML += `
    <div class="card" style="animation: fadeIn 0.5s ease">
    <img src="${item.img}" class="card-img" alt="img" onerror="this.src='https://via.placeholder.com/300x180'">
    <div class="card-body">
    <small style="color:var(--primary); font-weight:bold">${item.category}</small>
    <h3 class="card-title">${item.title}</h3>
    <p class="card-excerpt">${item.summary.substring(0, 100)}...</p>
    <a href="${item.url}" style="color:var(--primary); font-weight:600; text-decoration:none; font-size:0.9rem;">Baca Selengkapnya →</a>
    </div>
    </div>
    `;
  });
}

function renderSidebar() {
  const side = document.getElementById('sidebarRandom');
  side.innerHTML = '';
  const randoms = [...allData].sort(() => 0.5 - Math.random()).slice(0, 5);

  randoms.forEach(item => {
    side.innerHTML += `
    <div class="mini-item">
    <img src="${item.img}" class="mini-thumb">
    <div class="mini-text">
    <h4><a href="${item.url}" style="text-decoration:none; color:inherit;">${item.title.substring(0, 50)}...</a></h4>
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
  const years = [...new Set(allData.map(i => i.date.getFullYear()))];
  const ySelect = document.getElementById('yearFilter');
  years.forEach(y => ySelect.innerHTML += `<option value="${y}">${y}</option>`);

  const mSelect = document.getElementById('monthFilter');
  const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  months.forEach((m, i) => mSelect.innerHTML += `<option value="${i}">${m}</option>`);
}

function runFilters() {
  const y = document.getElementById('yearFilter').value;
  const m = document.getElementById('monthFilter').value;

  displayedData = allData.filter(i => {
    const matchY = y ? i.date.getFullYear() == y : true;
    const matchM = m !== "" ? i.date.getMonth() == m : true;
    return matchY && matchM;
  });
  renderFeed(true);
}

function filterByCat(cat, el) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  if(el) el.classList.add('active');

  displayedData = cat === 'All' ? [...allData] : allData.filter(i => i.category === cat);
  renderFeed(true);
}

document.getElementById('loadMore').onclick = () => {
  limit += 6;
  renderFeed();
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
