const IDX_TITLE = 0;
const IDX_FILENAME = 1;
const IDX_IMAGE = 2;
const IDX_DATE = 3;
const IDX_DESCRIPTION = 4;
const DEFAULT_THUMBNAIL = '/thumbnail.webp';

const CATEGORY_ICON_MAP = [
  { key: 'Linux & Open Source', icon: '🐧' },
  { key: 'Sejarah & Religi', icon: '📚' },
  { key: 'Multimedia & Editing', icon: '📸' }, 
  { key: 'Lainnya', icon: '🔆' }, 
  { key: 'Kuliner, Gaya Hidup & Kesehatan', icon: '🍜' },
  { key: 'Catatan & Opini Sosial', icon: '📢' }, 
  { key: 'Teknologi Web, AI & Umum', icon: '🖥️' },
];

// 🔹 Ambil ikon sesuai kategori
function getIconAndClass(categoryName) {
  const found = CATEGORY_ICON_MAP.find(m => categoryName.includes(m.key));
  return found || { icon: '📄', cls: 'default' };
}

// 🔹 Ubah nama kategori jadi ID HTML-friendly
function categoryToId(categoryName) {
  return categoryName.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

// 🔹 Format tanggal ke bahasa Indonesia
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return '';
  }
}

// 🔹 Buat kartu artikel
function createArticleCard(item) {
  const title = item[IDX_TITLE];
  const fileName = item[IDX_FILENAME];
  const jsonImage = item[IDX_IMAGE] || '';
  const dateString = formatDate(item[IDX_DATE]);
  const description = item[IDX_DESCRIPTION] || title;
  const articleUrl = `artikel/${fileName}`;

  let thumbnailUrl = jsonImage;
  if (!thumbnailUrl || !/\.(jpe?g|png|gif|webp|avif|svg)$/i.test(thumbnailUrl)) {
    thumbnailUrl = DEFAULT_THUMBNAIL;
  } else if (!/^https?:\/\//i.test(thumbnailUrl)) {
    thumbnailUrl = `img/${thumbnailUrl.split('/').pop()}`;
  }

  const link = document.createElement('a');
  link.href = articleUrl;
  link.className = 'article-card';
  link.title = description;

  link.innerHTML = `
    <img src="${thumbnailUrl}" alt="${title}" loading="lazy"
         onerror="this.onerror=null; this.src='${DEFAULT_THUMBNAIL}';">
    <div class="card-content">
      <h3>${title}</h3>
      <p>${dateString}</p>
    </div>
  `;
  return link;
}

// 🔹 Buat navigasi cepat
function createQuickNav(categories) {
  const quickNav = document.getElementById('quick-nav');
  if (!quickNav) return;

  const navItems = [
    { name: 'Artikel Terbaru', icon: '💥', url: '#terbaru' },
    ...categories.map(categoryName => {
      const { icon } = getIconAndClass(categoryName);
      return { name: categoryName, icon, url: `#${categoryToId(categoryName)}` };
    }),
    { name: 'Daftar Isi', icon: '⛔', url: 'sitemap.html' },
    { name: 'RSS Feed', icon: '📡', url: 'feed.html' },
    { name: 'Cover Artikel', icon: '❌', url: 'img.html' },
    { name: 'Ke Atas', icon: '⚠️', url: '#top' },
  ];

  quickNav.innerHTML = navItems.map(item => `
    <a href="${item.url}" class="nav-button" title="${item.name}">
      <span class="nav-icon">${item.icon}</span>
    </a>
  `).join('');

  quickNav.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      if (this.getAttribute('href') === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

// 🔹 Main: load artikel.json
document.addEventListener('DOMContentLoaded', async () => {
  const mainContainer = document.getElementById('main-container');
  if (!mainContainer) return;

  try {
    const response = await fetch('artikel.json');
    if (!response.ok) throw new Error('Gagal memuat artikel.json');
    const data = await response.json();

    const allCategories = Object.keys(data).sort();
    let allArticles = [];

    for (const category in data) {
      data[category].forEach(item => {
        if (item[IDX_DATE]) {
          allArticles.push({ item, date: new Date(item[IDX_DATE]) });
        }
      });
    }

    allArticles.sort((a, b) => b.date.getTime() - a.date.getTime());

    const displayedInLatest = new Set();

    // 🔹 Artikel Terbaru
    if (allArticles.length > 0) {
      const latestSection = document.createElement('section');
      latestSection.className = 'category-section';
      latestSection.innerHTML = `<h2 id="terbaru"><span>💥</span> Artikel Terbaru</h2><div class="article-grid"></div>`;
      const latestGrid = latestSection.querySelector('.article-grid');
      
      allArticles.slice(0, 12).forEach(articleObj => {
        latestGrid.appendChild(createArticleCard(articleObj.item));
        displayedInLatest.add(articleObj.item[IDX_FILENAME]);
      });
      mainContainer.appendChild(latestSection);
    }

    // 🔹 Artikel per Kategori
    allCategories.forEach(category => {
      const articlesToShow = data[category].filter(item => !displayedInLatest.has(item[IDX_FILENAME]));
      if (articlesToShow.length === 0) return;

      articlesToShow.sort((a, b) => new Date(b[IDX_DATE] || 0) - new Date(a[IDX_DATE] || 0));

      const section = document.createElement('section');
      section.className = 'category-section';
      
      const icon = getIconAndClass(category).icon;
      const categoryTitle = category.replace(/^[^\w\s]*/, '').trim();
      section.innerHTML = `<h2 id="${categoryToId(category)}"><span>${icon}</span> ${categoryTitle}</h2><div class="article-grid"></div>`;
      
      const grid = section.querySelector('.article-grid');
      articlesToShow.forEach(item => {
        grid.appendChild(createArticleCard(item));
      });
      mainContainer.appendChild(section);
    });

    createQuickNav(allCategories);

  } catch (error) {
    console.error('Ada kendala saat memuat artikel.json:', error);
    mainContainer.innerHTML = `<p style="text-align: center; color: red;">Gagal memuat daftar artikel. (${error.message})</p>`;
  }
});
