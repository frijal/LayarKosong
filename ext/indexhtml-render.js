import { IDX_TITLE, IDX_FILENAME, IDX_IMAGE, IDX_DATE, IDX_DESCRIPTION, DEFAULT_THUMBNAIL, getIconAndClass, categoryToId, formatDate } from '/ext/indexhtml-util.js';

export function createArticleCard(item) {
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
    <img src="${thumbnailUrl}" alt="${title}" onerror="this.onerror=null; this.src='${DEFAULT_THUMBNAIL}';">
    <div class="card-content">
      <h3>${title}</h3>
      <p>${dateString}</p>
    </div>
  `;
  return link;
}

export function createQuickNav(categories) {
  const quickNav = document.getElementById('quick-nav');
  if (!quickNav) return;

  const navItems = [
    { name: 'Artikel Terbaru', icon: '💥', url: '#terbaru' },
    ...categories.map(categoryName => {
      const { icon } = getIconAndClass(categoryName);
      return { name: categoryName, icon, url: `#${categoryToId(categoryName)}` };
    }),
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
        window.scrollTo(0, 0);
      }
    });
  });
}
