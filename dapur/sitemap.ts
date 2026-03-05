// -------------------------------------------------------
// FILE: sitemap-script.ts (V6.9 Compatible)
// -------------------------------------------------------

interface Article {
  title: string;
  file: string;
  image: string;
  lastmod: string;
  description: string;
  category: string;
}

type RawArticleData = [string, string, string, string, string];

interface ArticleData {
  [category: string]: RawArticleData[];
}

// PROTEKSI: Memastikan visitedLinks selalu berupa Array
const getInitialVisitedLinks = (): string[] => {
  try {
    const saved = localStorage.getItem('visitedLinks');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

let visitedLinks: string[] = getInitialVisitedLinks();
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
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;
}

function updateStats(total: number, read: number, term: string = ''): void {
  const el = document.getElementById('totalCount');
  if (!el) return;
  if (term) {
    el.innerHTML = `Menemukan <strong>${total}</strong> artikel dari pencarian "${term}"`;
    return;
  }
  el.innerHTML = `
  <span class="total-stat">Total: <strong>${total}</strong></span> |
  <span class="read-stat">Sudah Dibaca: <strong>${read}</strong> 👍</span> |
  <span class="unread-stat">Belum Dibaca: <strong>${total - read}</strong> 📚</span>
  `;
}

function getCleanUrl(file: string, category: string): string {
  const catSlug = category.toLowerCase().replace(/\s+/g, '-');
  const fileSlug = file.replace('.html', '');
  return `/${catSlug}/${fileSlug}`;
}

async function loadTOC(): Promise<void> {
  try {
    const res = await fetch('artikel.json');
    if (!res.ok) throw new Error('Gagal fetch artikel.json');
    const data: ArticleData = await res.json();
    const toc = document.getElementById('toc');
    if (!toc) return;

    toc.innerHTML = '';
    grouped = {};

    Object.keys(data).forEach((cat) => {
      grouped[cat] = data[cat].map((arr) => ({
        title: arr[0], file: arr[1], image: arr[2], lastmod: arr[3], description: arr[4], category: cat,
      })).sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());
    });

    const allArticles = Object.values(grouped).flat();
    updateStats(allArticles.length, visitedLinks.length);

    const shuffledColors = shuffle(categoryColors);
    const categoryTooltip = document.getElementById('category-tooltip');

    Object.keys(grouped)
    .sort((a, b) => new Date(grouped[b][0].lastmod).getTime() - new Date(grouped[a][0].lastmod).getTime())
    .forEach((cat, index) => {
      const catDiv = document.createElement('div');
      catDiv.className = 'category';
      catDiv.style.setProperty('--category-color', shuffledColors[index % shuffledColors.length]);

      catDiv.innerHTML = `
      <div class="category-content">
      <div class="category-header">${cat} <span class="badge">${grouped[cat].length}</span></div>
      <div class="toc-list" style="display: none;"></div>
      </div>
      `;

      const catList = catDiv.querySelector('.toc-list') as HTMLElement;
      grouped[cat].forEach((item) => {
        const el = document.createElement('div');
        el.className = 'toc-item';
        el.dataset.text = item.title.toLowerCase();

        const isVisited = visitedLinks.includes(item.file);
        el.innerHTML = `
        <div class="toc-title">
        <a href="${getCleanUrl(item.file, item.category)}" class="${isVisited ? 'visited' : ''}">${item.title}</a>
        <span class="${isVisited ? 'label-visited' : 'label-new'}">${isVisited ? 'sudah dibaca 👍' : '📚 belum dibaca'}</span>
        <span class="toc-date">[${formatDate(item.lastmod)}]</span>
        </div>
        `;

        const a = el.querySelector('a') as HTMLAnchorElement;
        a.addEventListener('click', () => {
          if (!visitedLinks.includes(item.file)) {
            visitedLinks.push(item.file);
            localStorage.setItem('visitedLinks', JSON.stringify(visitedLinks));
          }
        });

        // Tooltip Event
        a.addEventListener('mouseenter', () => {
          if (categoryTooltip) {
            categoryTooltip.innerHTML = item.description || 'Tidak ada deskripsi.';
            categoryTooltip.style.display = 'block';
          }
        });
        a.addEventListener('mousemove', (e) => {
          if (categoryTooltip) {
            categoryTooltip.style.left = e.clientX + 15 + 'px';
            categoryTooltip.style.top = e.clientY + 15 + 'px';
          }
        });
        a.addEventListener('mouseleave', () => { if (categoryTooltip) categoryTooltip.style.display = 'none'; });

        catList.appendChild(el);
      });

      (catDiv.querySelector('.category-header') as HTMLElement).addEventListener('click', () => {
        catList.style.display = catList.style.display === 'block' ? 'none' : 'block';
        updateTOCToggleText();
      });

      toc.appendChild(catDiv);
    });

    const m = document.getElementById('marquee-content');
    if (m) {
      m.innerHTML = shuffle(allArticles).map(d => `<a href="${getCleanUrl(d.file, d.category)}">${d.title}</a>`).join(' &bull; ');
    }
  } catch (e) {
    console.error(e);
  }
}

// Search Logic
const searchInput = document.getElementById('search') as HTMLInputElement;
const clearBtn = document.getElementById('clearSearch') as HTMLElement;

if (searchInput) {
  searchInput.addEventListener('input', function(this: HTMLInputElement) {
    const term = this.value.toLowerCase();
    if (clearBtn) clearBtn.style.display = term ? 'block' : 'none';

    let visibleTotal = 0;
    document.querySelectorAll('.category').forEach(cat => {
      const catEl = cat as HTMLElement;
      let hasVisible = false;
      catEl.querySelectorAll('.toc-item').forEach(item => {
        const itemEl = item as HTMLElement;
        const text = itemEl.dataset.text || '';
        const link = itemEl.querySelector('a') as HTMLElement;
        if (text.includes(term)) {
          itemEl.style.display = 'flex';
          hasVisible = true;
          visibleTotal++;
          if (term) link.innerHTML = text.replace(new RegExp(`(${term})`, 'gi'), '<span class="highlight">$1</span>');
          else link.textContent = text;
        } else {
          itemEl.style.display = 'none';
        }
      });
      catEl.style.display = hasVisible ? 'block' : 'none';
      const list = catEl.querySelector('.toc-list') as HTMLElement;
      if (list) list.style.display = term && hasVisible ? 'block' : 'none';
    });

      const allCount = Object.values(grouped).flat().length;
      updateStats(term ? visibleTotal : allCount, visitedLinks.length, term);
      updateTOCToggleText();
  });
}

// TOC Toggle
const tocToggleBtn = document.getElementById('tocToggle') as HTMLElement;
function updateTOCToggleText() {
  if (!tocToggleBtn) return;
  const lists = Array.from(document.querySelectorAll('.toc-list')) as HTMLElement[];
  const allClosed = lists.every(l => l.style.display === 'none');
  tocToggleBtn.textContent = allClosed ? 'Buka Semua' : 'Tutup Semua';
}

if (tocToggleBtn) {
  tocToggleBtn.addEventListener('click', () => {
    const lists = document.querySelectorAll('.toc-list');
    const isOpening = tocToggleBtn.textContent === 'Buka Semua';
    lists.forEach(l => (l as HTMLElement).style.display = isOpening ? 'block' : 'none');
    updateTOCToggleText();
  });
}

// Dark Mode
function initDarkMode() {
  const sw = document.getElementById('darkSwitch') as HTMLInputElement;
  const set = (isDark: boolean) => {
    document.body.classList.toggle('dark-mode', isDark);
    if (sw) sw.checked = isDark;
    localStorage.setItem('darkMode', String(isDark));
  };
  const saved = localStorage.getItem('darkMode');
  if (saved !== null) set(saved === 'true');
  else set(window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (sw) sw.addEventListener('change', () => set(sw.checked));
}

document.addEventListener('DOMContentLoaded', () => {
  loadTOC().then(() => {
    initDarkMode();
    updateTOCToggleText();
  });
});
