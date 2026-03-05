// -------------------------------------------------------
// FILE: sitemap-script.ts (V6.9 - Final Production Build)
// -------------------------------------------------------

interface Article {
  title: string;
  file: string;
  image: string;
  lastmod: string;
  description: string;
  category: string;
}

interface ArticleData {
  [category: string]: [string, string, string, string, string][];
}

// PROTEKSI: Memastikan visitedLinks selalu diperlakukan sebagai Array murni
const getVisitedLinks = (): string[] => {
  try {
    const stored = localStorage.getItem('visitedLinks');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

let visitedLinks: string[] = getVisitedLinks();
let grouped: Record<string, Article[]> = {};

const categoryColors: string[] = [
  'linear-gradient(90deg, #004d40, #26a69a)', 'linear-gradient(90deg, #00796b, #009688)',
  'linear-gradient(90deg, #00897b, #01579b)', 'linear-gradient(90deg, #009688, #4db6ac)',
  'linear-gradient(90deg, #00acc1, #26c6da)', 'linear-gradient(90deg, #0288d1, #03a9f4)',
  'linear-gradient(90deg, #0d47a1, #00bcd4)', 'linear-gradient(90deg, #0d47a1, #1976d2)',
  'linear-gradient(90deg, #1565c0, #64b5f6)', 'linear-gradient(90deg, #1976d2, #2196f3)',
  'linear-gradient(90deg, #1a237e, #3949ab)', 'linear-gradient(90deg, #1b5e20, #4caf50)',
  'linear-gradient(90deg, #212121, #616161)', 'linear-gradient(90deg, #212121, #455a64)',
  'linear-gradient(90deg, #2196f3, #00bcd4)', 'linear-gradient(90deg, #2e7d32, #8bc34a)',
  'linear-gradient(90deg, #2e7d32, #4caf50)', 'linear-gradient(90deg, #33691e, #8bc34a)',
  'linear-gradient(90deg, #37474f, #b0bec5)', 'linear-gradient(90deg, #388e3c, #4caf50)',
  'linear-gradient(90deg, #3e2723, #a1887f)', 'linear-gradient(90deg, #3e2723, #ffc107)',
  'linear-gradient(90deg, #607d8b, #9e9e9e)', 'linear-gradient(90deg, #6d4c41, #ffb300)',
  'linear-gradient(90deg, #b71c1c, #ff7043)', 'linear-gradient(90deg, #cddc39, #8bc34a)',
  'linear-gradient(90deg, #d32f2f, #f44336)', 'linear-gradient(90deg, #d84315, #ffca28)',
  'linear-gradient(90deg, #e65100, #ffab00)', 'linear-gradient(90deg, #f44336, #ff9800)',
  'linear-gradient(90deg, #f57c00, #ff9800)', 'linear-gradient(90deg, #fbc02d, #ffeb3b)',
];

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

function updateStats(total: number, read: number, term: string = ''): void {
  const totalCountEl = document.getElementById('totalCount');
  if (!totalCountEl) return;
  if (term) {
    totalCountEl.innerHTML = `Menemukan <strong>${total}</strong> artikel dari pencarian "${term}"`;
    return;
  }
  const unread = total - read;
  totalCountEl.innerHTML = `
  <span class="total-stat">Total: <strong>${total}</strong></span>
  <span class="separator">|</span>
  <span class="read-stat">Sudah Dibaca: <strong>${read}</strong> \uD83D\uDC4D</span>
  <span class="separator">|</span>
  <span class="unread-stat">Belum Dibaca: <strong>${unread}</strong> \uD83D\uDCD3</span>
  `;
}

function getCleanUrl(file: string, category: string): string {
  const catSlug = category.toLowerCase().replace(/\s+/g, '-');
  const fileSlug = file.replace('.html', '');
  return `/${catSlug}/${fileSlug}`;
}

const tocToggleBtn = document.getElementById('tocToggle') as HTMLElement | null;

function updateTOCToggleText(): void {
  const allLists = Array.from(document.querySelectorAll('.toc-list')) as HTMLElement[];
  if (allLists.length === 0 || !tocToggleBtn) return;
  const allCollapsed = allLists.every((list) => list.style.display === 'none');
  tocToggleBtn.textContent = allCollapsed ? 'Buka Semua' : 'Tutup Semua';
}

async function loadTOC(): Promise<void> {
  try {
    const res = await fetch('artikel.json');
    const data: ArticleData = await res.json();
    const toc = document.getElementById('toc');
    if (!toc) return;

    toc.innerHTML = '';
    grouped = {};

    Object.keys(data).forEach((cat) => {
      grouped[cat] = data[cat]
      .map((arr) => ({
        title: arr[0],
        file: arr[1],
        image: arr[2],
        lastmod: arr[3],
        description: arr[4],
        category: cat,
      }))
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());
    });

    const allArticles = Object.values(grouped).flat();
    updateStats(allArticles.length, visitedLinks.length);

    const shuffledColors = shuffle(categoryColors);
    const categoryTooltip = document.getElementById('category-tooltip');

    Object.keys(grouped)
    .sort((a, b) => {
      const dateA = new Date(grouped[a][0].lastmod).getTime();
      const dateB = new Date(grouped[b][0].lastmod).getTime();
      return dateB - dateA;
    })
    .forEach((cat, index) => {
      const catDiv = document.createElement('div');
      catDiv.className = 'category';
      const color = shuffledColors[index % shuffledColors.length];
      catDiv.style.setProperty('--category-color', color);
      catDiv.innerHTML = `
      <div class="category-content">
      <div class="category-header">
      ${cat} <span class="badge">${grouped[cat].length}</span>
      </div>
      <div class="toc-list" style="display: none;"></div>
      </div>
      `;

      const catList = catDiv.querySelector('.toc-list') as HTMLElement;
      grouped[cat].forEach((item) => {
        const el = document.createElement('div');
        el.className = 'toc-item';
        el.setAttribute('data-text', item.title.toLowerCase());

        const titleDiv = document.createElement('div');
        titleDiv.className = 'toc-title';

        const a = document.createElement('a');
        a.href = getCleanUrl(item.file, item.category);
        a.textContent = item.title;

        const statusSpan = document.createElement('span');
        // PERBAIKAN CLEAN CODE: Gunakan Unicode agar tidak berubah jadi &amp;
        if (visitedLinks.includes(item.file)) {
          statusSpan.className = 'label-visited';
      statusSpan.textContent = 'sudah dibaca \uD83D\uDC4D';
      a.classList.add('visited');
        } else {
          statusSpan.className = 'label-new';
          statusSpan.textContent = '\uD83D\uDCD3 belum dibaca';
        }

        const dateSpan = document.createElement('span');
        dateSpan.className = 'toc-date';
        dateSpan.textContent = `[${formatDate(item.lastmod)}]`;

        a.addEventListener('click', () => {
          if (!visitedLinks.includes(item.file)) {
            visitedLinks.push(item.file);
            localStorage.setItem('visitedLinks', JSON.stringify(visitedLinks));
            updateStats(allArticles.length, visitedLinks.length);
          }
        });

        const description = item.description || 'Tidak ada deskripsi.';
      a.addEventListener('mouseenter', () => {
        if (categoryTooltip) {
          categoryTooltip.innerHTML = description;
          categoryTooltip.style.display = 'block';
        }
      });
      a.addEventListener('mousemove', (e: MouseEvent) => {
        if (categoryTooltip) {
          categoryTooltip.style.left = (e.clientX + 15) + 'px';
          categoryTooltip.style.top = (e.clientY + 15) + 'px';
        }
      });
      a.addEventListener('mouseleave', () => {
        if (categoryTooltip) categoryTooltip.style.display = 'none';
      });

        titleDiv.appendChild(a);
        titleDiv.appendChild(statusSpan);
        titleDiv.appendChild(dateSpan);
        el.appendChild(titleDiv);
        catList.appendChild(el);
      });

      const catHeader = catDiv.querySelector('.category-header') as HTMLElement;
      catHeader.addEventListener('click', () => {
        const currentDisplay = catList.style.display;
        catList.style.display = currentDisplay === 'block' ? 'none' : 'block';
        updateTOCToggleText();
      });

      toc.appendChild(catDiv);
    });

    const m = document.getElementById('marquee-content');
    if (m) {
      const shuffledMarquee = shuffle(allArticles);
      m.innerHTML = shuffledMarquee
      .map((d) => {
        const cleanDesc = (d.description || 'Tidak ada deskripsi.').replace(/"/g, '&quot;');
        return `<a href="${getCleanUrl(d.file, d.category)}" data-description="${cleanDesc}">${d.title}</a>`;
      })
      .join(' \u2022 '); // Simbol peluru bersih
    }
  } catch (e) {
    console.error('Gagal load artikel.json', e);
  }
}

const searchInput = document.getElementById('search') as HTMLInputElement | null;
const clearBtn = document.getElementById('clearSearch') as HTMLElement | null;

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase();
    if (clearBtn) clearBtn.style.display = term ? 'block' : 'none';

    let countVisible = 0;
    const categories = Array.from(document.querySelectorAll('.category')) as HTMLElement[];

    categories.forEach((category) => {
      let catVisible = false;
      const items = Array.from(category.querySelectorAll('.toc-item')) as HTMLElement[];

      items.forEach((item) => {
        const text = item.getAttribute('data-text') || '';
        const titleLink = item.querySelector('a') as HTMLAnchorElement;

        if (term && text.includes(term)) {
          item.style.display = 'flex';
          catVisible = true;
          countVisible++;

          const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          titleLink.innerHTML = text.replace(
            new RegExp(`(${safeTerm})`, 'gi'),
                                             '<span class="highlight">$1</span>'
          );
        }
        else if (!term) {
          item.style.display = 'flex';
          titleLink.textContent = text;
          catVisible = true;
        } else {
          item.style.display = 'none';
        }
      });

      category.style.display = catVisible ? 'block' : 'none';
      const list = category.querySelector('.toc-list') as HTMLElement;
      if (list) list.style.display = (term && catVisible) ? 'block' : 'none';
    });

      const allArticlesCount = Object.values(grouped).flat().length;
      if (term) updateStats(countVisible, visitedLinks.length, term);
      else updateStats(allArticlesCount, visitedLinks.length);
      updateTOCToggleText();
  });
}

if (clearBtn && searchInput) {
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
  });
}

if (tocToggleBtn) {
  tocToggleBtn.addEventListener('click', () => {
    const lists = Array.from(document.querySelectorAll('.toc-list')) as HTMLElement[];
    const isOpening = tocToggleBtn.textContent === 'Buka Semua';
  lists.forEach((list) => {
    list.style.display = isOpening ? 'block' : 'none';
  });
  updateTOCToggleText();
  });
}

function initDarkMode(): void {
  const darkSwitch = document.getElementById('darkSwitch') as HTMLInputElement | null;
  const setMode = (isDark: boolean) => {
    document.body.classList.toggle('dark-mode', isDark);
    if (darkSwitch) darkSwitch.checked = isDark;
    localStorage.setItem('darkMode', String(isDark));
  };

  const saved = localStorage.getItem('darkMode');
  if (saved !== null) setMode(saved === 'true');
  else setMode(window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (darkSwitch) {
    darkSwitch.addEventListener('change', () => setMode(darkSwitch.checked));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadTOC().then(() => {
    initDarkMode();
    updateTOCToggleText();
  });
});
