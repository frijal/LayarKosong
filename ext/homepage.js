// --- STATE MANAGEMENT ---
let allArticles = [];
let filteredArticles = [];
let currentPage = 1;
const itemsPerPage = 10;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', loadData);

// --- LOAD DATA FROM JSON FILE ---
async function loadData() {
  try {
    const response = await fetch('./artikel.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const jsonData = await response.json();

    normalizeData(jsonData);
    setupFilters();
    setupArchive();
    renderHero();
    renderGrid(true);
    renderSidebar();

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        filteredArticles = allArticles.filter(a =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q)
        );
        renderGrid(true);
      });
    }

    // Load more
    document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
      currentPage++;
      renderGrid(false);
    });

  } catch (err) {
    console.error(err);
    document.getElementById('newsGrid').innerHTML = `
      <p style="grid-column:1/-1;text-align:center;color:red">
        Gagal memuat artikel.<br>${err.message}
      </p>`;
  }
}

// --- DATA NORMALIZATION ---
function normalizeData(data) {
  allArticles = [];

  for (const [category, articles] of Object.entries(data)) {
    articles.forEach(item => {
      const rawLink = item[1] || '';
      const dateObj = new Date(item[3]);

      if (isNaN(dateObj)) return;

      allArticles.push({
        category,
        title: item[0] || 'Tanpa Judul',
        link: `/artikel/${rawLink.replace(/^\/+/, '')}`,
        thumbnail: item[2] || './thumbnail.webp',
        date: dateObj,
        dateStr: item[3],
        summary: item[4] || ''
      });
    });
  }

  allArticles.sort((a, b) => b.date - a.date);
  filteredArticles = [...allArticles];
}

// --- HERO ---
function renderHero() {
  if (!allArticles.length) return;

  const hero = document.getElementById('hero-section');
  const featured = allArticles[0];

  hero.classList.remove('skeleton');
  hero.style.backgroundImage = `url('${featured.thumbnail}')`;

  hero.innerHTML = `
    <div class="hero-content">
      <span class="hero-badge">${featured.category}</span>
      <h1>${featured.title}</h1>
      <p>${featured.summary.substring(0,150)}...</p>
      <a href="${featured.link}" class="btn btn-primary">Baca Selengkapnya</a>
    </div>`;
}

// --- GRID ---
function renderGrid(reset = false) {
  const grid = document.getElementById('newsGrid');
  const btn = document.getElementById('loadMoreBtn');

  if (reset) {
    grid.innerHTML = '';
    currentPage = 1;
  }

  const start = (currentPage - 1) * itemsPerPage;
  const pageData = filteredArticles.slice(start, start + itemsPerPage);

  if (!pageData.length && reset) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center">Tidak ada artikel.</p>`;
    btn.style.display = 'none';
    return;
  }

  pageData.forEach((art, i) => {
    const card = document.createElement('div');
    card.className = 'card skeleton';
    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${art.thumbnail}" onload="this.closest('.card').classList.remove('skeleton')">
      </div>
      <div class="card-body">
        <div class="card-meta">${art.category}</div>
        <h3><a href="${art.link}">${art.title}</a></h3>
        <p>${art.summary}</p>
        <small>${art.date.toLocaleDateString('id-ID')}</small>
      </div>`;
    setTimeout(() => grid.appendChild(card), i * 40);
  });

  btn.style.display =
    start + itemsPerPage >= filteredArticles.length ? 'none' : 'inline-block';
}

// --- CATEGORY FILTER ---
function setupFilters() {
  const container = document.getElementById('categoryContainer');
  if (!container) return;

  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'pill active';
  allBtn.textContent = 'Semua';
  allBtn.onclick = () => filterArticles('all', allBtn);
  container.appendChild(allBtn);

  [...new Set(allArticles.map(a => a.category))].forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.textContent = cat;
    btn.onclick = () => filterArticles(cat, btn);
    container.appendChild(btn);
  });
}

function filterArticles(category, el) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');

  filteredArticles =
    category === 'all'
      ? [...allArticles]
      : allArticles.filter(a => a.category === category);

  renderGrid(true);
}

// --- ARCHIVE ---
function setupArchive() {
  const yearSel = document.getElementById('yearSelect');
  const monthSel = document.getElementById('monthSelect');
  if (!yearSel || !monthSel) return;

  yearSel.innerHTML = `<option value="">Tahun</option>`;
  monthSel.innerHTML = `<option value="">Bulan</option>`;

  [...new Set(allArticles.map(a => a.date.getFullYear()))]
    .sort((a,b)=>b-a)
    .forEach(y => yearSel.add(new Option(y, y)));

  const months = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ];
  months.forEach((m,i)=>monthSel.add(new Option(m,i)));

  const apply = () => {
    const y = yearSel.value;
    const m = monthSel.value;

    filteredArticles = allArticles.filter(a =>
      (!y || a.date.getFullYear()==y) &&
      (m==='' || a.date.getMonth()==m)
    );
    renderGrid(true);
  };

  yearSel.onchange = apply;
  monthSel.onchange = apply;
}

// --- SIDEBAR ---
function renderSidebar() {
  const el = document.getElementById('sidebarList');
  if (!el) return;

  el.innerHTML = '';

  [...allArticles]
    .sort(()=>0.5-Math.random())
    .slice(0,10)
    .forEach(a => {
      el.insertAdjacentHTML('beforeend', `
        <div class="mini-card">
          <img src="${a.thumbnail}" loading="lazy">
          <div>
            <h4><a href="${a.link}">${a.title.substring(0,45)}...</a></h4>
            <small>${a.date.toLocaleDateString('id-ID',{month:'short',day:'numeric'})}</small>
          </div>
        </div>`);
    });
}
