  // --- STATE MANAGEMENT ---
  let allArticles = [];
  let filteredArticles = [];
  let currentPage = 1;
  const itemsPerPage = 10;

  // --- INITIALIZATION ---
  document.addEventListener('DOMContentLoaded', () => {
    loadData(); // Panggil fungsi loadData, bukan langsung render
  });

  // --- LOAD DATA FROM JSON FILE ---
  async function loadData() {
    try {
      // Mengambil file artikel.json
      const response = await fetch('artikel.json');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Konversi teks file menjadi Objek JavaScript
      const jsonData = await response.json();

      // Setelah data didapat, jalankan proses normalisasi dan render
      normalizeData(jsonData);
      setupFilters();
      setupArchive();
      renderHero();
      renderGrid(true);
      renderSidebar();

      // Setup Search Listener
      document.getElementById('searchInput').addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        filteredArticles = allArticles.filter(art =>
        art.title.toLowerCase().includes(keyword) ||
        art.summary.toLowerCase().includes(keyword)
        );
        renderGrid(true);
      });

      // Setup Load More Listener
      document.getElementById('loadMoreBtn').addEventListener('click', () => {
        currentPage++;
        renderGrid(false);
      });

    } catch (error) {
      console.error("Gagal memuat artikel.json:", error);
      document.getElementById('newsGrid').innerHTML =
      `<p style="grid-column: 1/-1; text-align: center; color: red;">
      Gagal memuat data artikel. Pastikan Anda menjalankan ini menggunakan Local Server (bukan double-click file).
      <br>Error: ${error.message}
      </p>`;
    }
  }

  // --- DATA PROCESSING ---
  // Perhatikan: fungsi ini sekarang menerima parameter 'data'
  function normalizeData(data) {
    for (const [category, articles] of Object.entries(data)) {
      articles.forEach(item => {
        const originalLink = item[1] || '';

        allArticles.push({
          category: category,
          title: item[0],
          link: `/artikel/${originalLink.replace(/^\/+/, '')}`,
                         thumbnail: item[2],
                         date: new Date(item[3]),
                         dateStr: item[3],
                         summary: item[4]
        });
      });
    }

    // Sort by Date Descending
    allArticles.sort((a, b) => b.date - a.date);
    filteredArticles = [...allArticles];
  }

  // --- RENDER HERO SECTION (FEATURED) ---
  function renderHero() {
    const hero = document.getElementById('hero-section');
    const featured = allArticles[0]; // Pick newest as featured

    // Remove skeleton class
    hero.classList.remove('skeleton');art.thumbnail
    hero.style.backgroundImage = `url('${featured.thumbnail}')`;

    hero.innerHTML = `
    <div class="hero-content">
    <span class="hero-badge">${featured.category}</span>
    <h1 style="font-size: 2.5rem; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">${featured.title}</h1>
    <p style="font-size: 1.1rem; margin-bottom: 1.5rem; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">${featured.summary.substring(0, 150)}...</p>
    <a href="${featured.link}" class="btn btn-primary">Baca Selengkapnya</a>
    </div>
    `;
  }

  // --- RENDER GRID ---
  function renderGrid(reset = false) {
    const grid = document.getElementById('newsGrid');
    const btn = document.getElementById('loadMoreBtn');

    if (reset) {
      grid.innerHTML = '';
      currentPage = 1;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredArticles.slice(start, end);

    if (pageData.length === 0 && reset) {
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Tidak ada artikel ditemukan.</p>';
      btn.style.display = 'none';
      return;
    }

    pageData.forEach((art, index) => {
      const card = document.createElement('div');
      card.className = 'card skeleton'; // Start with skeleton state
      card.innerHTML = `
      <div class="card-img-wrapper">
      <img src="${art.thumbnail}" alt="${art.title}" class="card-img" onload="this.closest('.card').classList.remove('skeleton')">
      </div>
      <div class="card-body">
      <div class="card-meta">${art.category}</div>
      <h3 class="card-title"><a href="${art.link}">${art.title}</a></h3>
      <p class="card-excerpt">${art.summary}</p>
      <div class="card-footer">
      <span>${art.date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      </div>
      `;

      // Staggered animation effect
      setTimeout(() => {
        grid.appendChild(card);
      }, index * 50);
    });

    // Manage Load More Button
    if (end >= filteredArticles.length) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'inline-block';
    }
  }

  // --- SETUP CATEGORY FILTERS ---
  function setupFilters() {
    const container = document.getElementById('categoryContainer');
    const categories = [...new Set(allArticles.map(a => a.category))];

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'pill';
      btn.textContent = cat;
      btn.onclick = () => filterArticles(cat, btn);
      container.appendChild(btn);
    });
  }

  function filterArticles(category, element) {
    // Update active state
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    if(element) element.classList.add('active');
    else document.querySelector('.pill').classList.add('active'); // "All" button

    if (category === 'all') {
      filteredArticles = [...allArticles];
    } else {
      filteredArticles = allArticles.filter(a => a.category === category);
    }
    renderGrid(true);
  }

  // --- SETUP ARCHIVE DROPDOWNS ---
  function setupArchive() {
    const yearSelect = document.getElementById('yearSelect');
    const monthSelect = document.getElementById('monthSelect');

    const years = [...new Set(allArticles.map(a => a.date.getFullYear()))].sort((a,b) => b-a);

    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    });

    // Populate months (Standard 1-12)
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    monthNames.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = m;
      monthSelect.appendChild(opt);
    });

    const handleArchiveFilter = () => {
      const y = yearSelect.value;
      const m = monthSelect.value;

      filteredArticles = allArticles.filter(a => {
        const matchYear = y ? a.date.getFullYear() == y : true;
        const matchMonth = m !== "" ? a.date.getMonth() == m : true;
        return matchYear && matchMonth;
      });
      renderGrid(true);
    };

    yearSelect.addEventListener('change', handleArchiveFilter);
    monthSelect.addEventListener('change', handleArchiveFilter);
  }

  // --- RENDER SIDEBAR (RANDOM / TRENDING) ---
  function renderSidebar() {
    const container = document.getElementById('sidebarList');
    container.innerHTML = ''; // Bersihkan konten lama jika ada

    // 1. Buat salinan array (agar urutan asli di allArticles tidak berantakan)
    // 2. Acak urutannya
    // 3. Ambil 5 item pertama
    const randomArticles = [...allArticles]
    .sort(() => 0.10 - Math.random())
    .slice(0, 10);

    randomArticles.forEach(art => {
      const div = document.createElement('div');
      div.className = 'mini-card';
      div.innerHTML = `
      <img src="${art.thumbnail}" class="mini-thumb" alt="thumb" loading="lazy">
      <div class="mini-info">
      <h4><a href="${art.link}">${art.title.substring(0, 45)}...</a></h4>
      <span>${art.date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}</span>
      </div>
      `;
      container.appendChild(div);
    });
  }
