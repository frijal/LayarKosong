// -------------------------------------------------------
// FILE: sitemap-script.ts (V6.9 Compatible)
// Updated: 2026-03-01
// -------------------------------------------------------

// --- INTERFACES ---
interface ArticleItem {
  title: string;
  file: string;
  image: string;
  lastmod: string;
  description: string;
  category: string;
}

interface RawArticleData {
  [category: string]: [string, string, string, string, string?][];
}

// --- STATE ---
const visitedLinks: string[] = JSON.parse(localStorage.getItem('visitedLinks') || '[]');
let grouped: Record<string, ArticleItem[]> = {};

const categoryColors: string[] = [
  'linear-gradient(90deg, #004d40, #26a69a)',
  'linear-gradient(90deg, #00796b, #009688)',
  'linear-gradient(90deg, #00897b, #01579b)',
  'linear-gradient(90deg, #009688, #4db6ac)',
  'linear-gradient(90deg, #00acc1, #26c6da)',
  'linear-gradient(90deg, #0288d1, #03a9f4)',
  'linear-gradient(90deg, #0d47a1, #00bcd4)',
  'linear-gradient(90deg, #0d47a1, #1976d2)',
  'linear-gradient(90deg, #1565c0, #64b5f6)',
  'linear-gradient(90deg, #1976d2, #2196f3)',
  'linear-gradient(90deg, #1a237e, #3949ab)',
  'linear-gradient(90deg, #1b5e20, #4caf50)',
  'linear-gradient(90deg, #212121, #616161)',
  'linear-gradient(90deg, #212121, #455a64)',
  'linear-gradient(90deg, #2196f3, #00bcd4)',
  'linear-gradient(90deg, #2e7d32, #8bc34a)',
  'linear-gradient(90deg, #2e7d32, #4caf50)',
  'linear-gradient(90deg, #33691e, #8bc34a)',
  'linear-gradient(90deg, #37474f, #b0bec5)',
  'linear-gradient(90deg, #388e3c, #4caf50)',
  'linear-gradient(90deg, #3e2723, #a1887f)',
  'linear-gradient(90deg, #3e2723, #ffc107)',
  'linear-gradient(90deg, #607d8b, #9e9e9e)',
  'linear-gradient(90deg, #6d4c41, #ffb300)',
  'linear-gradient(90deg, #b71c1c, #ff7043)',
  'linear-gradient(90deg, #cddc39, #8bc34a)',
  'linear-gradient(90deg, #d32f2f, #f44336)',
  'linear-gradient(90deg, #d84315, #ffca28)',
  'linear-gradient(90deg, #e65100, #ffab00)',
  'linear-gradient(90deg, #f44336, #ff9800)',
  'linear-gradient(90deg, #f57c00, #ff9800)',
  'linear-gradient(90deg, #fbc02d, #ffeb3b)',
];

// --- HELPERS ---

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function decodeHTML(text: string): string {
  const txt = document.createElement("textarea");
  txt.innerHTML = text;
  return txt.value;
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
    <span class="read-stat">Sudah Dibaca: <strong>${read}</strong> 👍</span>
    <span class="separator">|</span>
    <span class="unread-stat">Belum Dibaca: <strong>${unread}</strong> 📚</span>
  `;
}

function getCleanUrl(file: string, category: string): string {
  const catSlug = category.toLowerCase().replace(/\s+/g, '-');
  const fileSlug = file.replace('.html', '');
  return `/${catSlug}/${fileSlug}`;
}
// Tambahkan pengaman pada regex search
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// --- CORE LOGIC ---

async function loadTOC(): Promise<void> {
  try {
    const res = await fetch('artikel.json');
    if (!res.ok) throw new Error("File artikel.json tidak ditemukan"); // Tambahkan validasi fetch

    const data: RawArticleData = await res.json();
    const toc = document.getElementById('toc');
    if (!toc) return;

    toc.innerHTML = '';
    grouped = {};

    // Mapping data
    Object.keys(data).forEach((cat) => {
      grouped[cat] = data[cat]
      .map((arr) => ({
        title: decodeHTML(arr[0]),
                     file: arr[1],
                     image: arr[2],
                     lastmod: arr[3],
                     description: decodeHTML(arr[4] || ''),
                     category: cat,
      }))
      .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());
    });

    // Hitung total
    const totalArticles = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
    updateStats(totalArticles, visitedLinks.length);

    const shuffledColors = shuffle([...categoryColors]);
    const categoryTooltip = document.getElementById('category-tooltip');

    // Render Kategori
    Object.keys(grouped)
    .sort((a, b) => new Date(grouped[b][0].lastmod).getTime() - new Date(grouped[a][0].lastmod).getTime())
    .forEach((cat, index) => {
      const catDiv = document.createElement('div');
      catDiv.className = 'category';
      const color = shuffledColors[index % shuffledColors.length];
      catDiv.style.setProperty('--category-color', color);

      catDiv.innerHTML = `
      <div class="category-content">
      <div class="category-header" style="cursor:pointer">
      ${cat} <span class="badge">${grouped[cat].length}</span>
      </div>
      <div class="toc-list" style="display: none;"></div>
      </div>
      `;

      const catList = catDiv.querySelector('.toc-list') as HTMLElement;

      // Render Item Artikel
      grouped[cat].forEach((item) => {
        const el = document.createElement('div');
        el.className = 'toc-item';
        el.dataset.text = item.title.toLowerCase();

        const a = document.createElement('a');
        a.href = getCleanUrl(item.file, item.category);
        const cleanTitle = item.title;
        a.textContent = cleanTitle;
        a.setAttribute('data-original-title', cleanTitle);

        // Logika Visited
        const isVisited = visitedLinks.includes(item.file);
        const statusHTML = isVisited
        ? '<span class="label-visited">sudah dibaca 👍</span>'
        : '<span class="label-new">📚 belum dibaca</span>';

      el.innerHTML = `
      <div class="toc-title">
      ${a.outerHTML}
      ${statusHTML}
      <span class="toc-date"> [${formatDate(item.lastmod)}]</span>
      </div>
      `;

      // Re-binding event listener karena kita menggunakan innerHTML
      const newA = el.querySelector('a') as HTMLAnchorElement;
      newA.addEventListener('click', () => {
        if (!visitedLinks.includes(item.file)) {
          visitedLinks.push(item.file);
          localStorage.setItem('visitedLinks', JSON.stringify(visitedLinks));
        }
      });

      // Tooltip
      newA.addEventListener('mouseenter', (e) => {
        if (categoryTooltip) {
          categoryTooltip.innerHTML = item.description || 'Tidak ada deskripsi.';
          categoryTooltip.style.display = 'block';
        }
      });

      catList.appendChild(el);
      });

      // Event Toggle Header
      const catHeader = catDiv.querySelector('.category-header') as HTMLElement;
      catHeader.addEventListener('click', () => {
        const isHidden = catList.style.display === 'none';
        catList.style.display = isHidden ? 'block' : 'none';
        updateTOCToggleText();
      });

      toc.appendChild(catDiv);
    });

  } catch (e) {
    console.error('Kritis: Gagal memuat sitemap', e);
  }
}

// --- INTERACTIVE ELEMENTS ---

const searchInput = document.getElementById('search') as HTMLInputElement;
const clearBtn = document.getElementById('clearSearch') as HTMLElement;

if (searchInput) {
  searchInput.addEventListener('input', function(this: HTMLInputElement) {
    const term = this.value.toLowerCase();
    if (clearBtn) clearBtn.style.display = this.value ? 'block' : 'none';

    let countVisible = 0;
    const allArticlesCount = Object.values(grouped).flat().length;

    document.querySelectorAll('.category').forEach((categoryEl) => {
      const category = categoryEl as HTMLElement;
      let catVisible = false;

      category.querySelectorAll('.toc-item').forEach((itemEl) => {
        const item = itemEl as HTMLElement;
        const text = item.dataset.text || '';
        const titleLink = item.querySelector('a') as HTMLElement;

        if (term && text.includes(term)) {
          item.style.display = 'flex';
          catVisible = true;
          countVisible++;

          // Ambil teks asli yang sudah bersih (bukan dari dataset yang mungkin ter-encode)
          const originalTitle = item.querySelector('a')?.getAttribute('data-original-title') || text;
          const regex = new RegExp(`(${term})`, 'gi');

          if (titleLink) {
            titleLink.innerHTML = originalTitle.replace(regex, '<span class="highlight">$1</span>');
          }
        } else if (!term) {
          item.style.display = 'flex';
          // Kembalikan ke teks asli tanpa span highlight
          titleLink.textContent = item.querySelector('a')?.getAttribute('data-original-title') || text;
          catVisible = true;
        } else {
          item.style.display = 'none';
        }
      });

      category.style.display = catVisible ? 'block' : 'none';
      const tocList = category.querySelector('.toc-list') as HTMLElement;
      if (tocList) {
        tocList.style.display = term && catVisible ? 'block' : 'none';
      }
    });

    if (term) {
      updateStats(countVisible, visitedLinks.length, term);
    } else {
      updateStats(allArticlesCount, visitedLinks.length);
    }
    updateTOCToggleText();
  });
}

if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
    }
  });
}

const tocToggleBtn = document.getElementById('tocToggle') as HTMLElement;
let tocCollapsed = false;

function updateTOCToggleText(): void {
  if (!tocToggleBtn) return;
  const allLists = Array.from(document.querySelectorAll('.toc-list')) as HTMLElement[];
  if (allLists.length === 0) return;

  const allCollapsed = allLists.every((list) => list.style.display === 'none');
  tocCollapsed = allCollapsed;
  tocToggleBtn.textContent = tocCollapsed ? 'Buka Semua' : 'Tutup Semua';
}

if (tocToggleBtn) {
  tocToggleBtn.addEventListener('click', () => {
    tocCollapsed = !tocCollapsed;
    (document.querySelectorAll('.toc-list') as NodeListOf<HTMLElement>).forEach((list) => {
      list.style.display = tocCollapsed ? 'none' : 'block';
    });
    updateTOCToggleText();
  });
}

function initDarkMode(): void {
  const darkSwitch = document.getElementById('darkSwitch') as HTMLInputElement | null;
  const saved = localStorage.getItem('darkMode');

  const setDarkMode = (isDark: boolean) => {
    if (isDark) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    if (darkSwitch) darkSwitch.checked = isDark;
  };

  if (saved !== null) {
    setDarkMode(saved === 'true');
  } else {
    setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  if (darkSwitch) {
    darkSwitch.addEventListener('change', () => {
      localStorage.setItem('darkMode', darkSwitch.checked.toString());
      setDarkMode(darkSwitch.checked);
    });
  }
}

// --- INIT ---

document.addEventListener('DOMContentLoaded', () => {
  loadTOC().then(() => {
    initDarkMode();
    updateTOCToggleText();
  });
});
