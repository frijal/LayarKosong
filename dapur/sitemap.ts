// -------------------------------------------------------
// FILE: sitemap.ts (FULL FEATURED & OPTIMIZED)
// -------------------------------------------------------

interface Article {
  title: string;
  file: string;
  lastmod: string;
  description?: string;
  category: string;
}

// Daftar gradien langsung di dalam script untuk memastikan warna pasti muncul
const CATEGORY_COLORS = [
  "linear-gradient(90deg, #004d40, #26a69a)", "linear-gradient(90deg, #00796b, #009688)",
  "linear-gradient(90deg, #00897b, #01579b)", "linear-gradient(90deg, #009688, #4db6ac)",
  "linear-gradient(90deg, #00acc1, #26c6da)", "linear-gradient(90deg, #0288d1, #03a9f4)",
  "linear-gradient(90deg, #0d47a1, #00bcd4)", "linear-gradient(90deg, #0d47a1, #1976d2)",
  "linear-gradient(90deg, #1565c0, #64b5f6)", "linear-gradient(90deg, #1976d2, #2196f3)",
  "linear-gradient(90deg, #1a237e, #3949ab)", "linear-gradient(90deg, #1b5e20, #4caf50)",
  "linear-gradient(90deg, #212121, #616161)", "linear-gradient(90deg, #212121, #455a64)",
  "linear-gradient(90deg, #2196f3, #00bcd4)", "linear-gradient(90deg, #2e7d32, #8bc34a)",
  "linear-gradient(90deg, #2e7d32, #4caf50)", "linear-gradient(90deg, #33691e, #8bc34a)",
  "linear-gradient(90deg, #37474f, #b0bec5)", "linear-gradient(90deg, #388e3c, #4caf50)",
  "linear-gradient(90deg, #3e2723, #a1887f)", "linear-gradient(90deg, #3e2723, #ffc107)",
  "linear-gradient(90deg, #607d8b, #9e9e9e)", "linear-gradient(90deg, #6d4c41, #ffb300)",
  "linear-gradient(90deg, #b71c1c, #ff7043)", "linear-gradient(90deg, #cddc39, #8bc34a)",
  "linear-gradient(90deg, #d32f2f, #f44336)", "linear-gradient(90deg, #d84315, #ffca28)",
  "linear-gradient(90deg, #e65100, #ffab00)", "linear-gradient(90deg, #f44336, #ff9800)",
  "linear-gradient(90deg, #f57c00, #ff9800)", "linear-gradient(90deg, #fbc02d, #ffeb3b)"
];

const getVisitedLinks = (): string[] => {
  try {
    const stored = localStorage.getItem('visitedLinks');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

let visitedLinks: string[] = getVisitedLinks();
let grouped: Record<string, Article[]> = {};

const shuffle = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const colorIndices = shuffle([...Array(32).keys()]);

const debounce = (fn: Function, delay: number) => {
  let timeout: number;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => fn(...args), delay);
  };
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;
};

const getCleanUrl = (file: string, category: string): string =>
`/${category.toLowerCase().replace(/\s+/g, '-')}/${file.replace('.html', '')}`;

const updateStats = (total: number, read: number, term: string = ''): void => {
  const el = document.getElementById('totalCount');
  if (!el) return;
  if (term) el.innerHTML = `Menemukan <strong>${total}</strong> artikel dari pencarian "${term}"`;
  else {
    el.innerHTML = `<span class="total-stat">Total: <strong>${total}</strong></span>
    <span class="separator">|</span> <span class="read-stat">Sudah Dibaca: <strong>${read}</strong> 👍</span>
    <span class="separator">|</span> <span class="unread-stat">Belum Dibaca: <strong>${total - read}</strong> 📓</span>`;
  }
};

const updateTOCToggleText = (): void => {
  const btn = document.getElementById('tocToggle');
  const lists = Array.from(document.querySelectorAll('.toc-list'));
  if (!btn) return;
  btn.textContent = lists.every(l => (l as HTMLElement).style.display === 'none') ? 'Buka Semua' : 'Tutup Semua';
};

async function loadTOC(): Promise<void> {
  const toc = document.getElementById('toc');
  if (!toc) return;

  try {
    const data = await (window as any).siteDataProvider.getFor('sitemap.ts');
    const fragment = document.createDocumentFragment();
    const isMobile = window.innerWidth <= 768;
    const allArticles: Article[] = [];

    Object.keys(data).forEach(cat => {
      grouped[cat] = data[cat].map((item: any) => ({
        title: item.title, file: item.id, lastmod: item.date,
        category: cat, description: isMobile ? undefined : item.description
      })).sort((a: Article, b: Article) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());
      allArticles.push(...grouped[cat]);
    });

    Object.keys(grouped).sort((a, b) => new Date(grouped[b][0].lastmod).getTime() - new Date(grouped[a][0].lastmod).getTime())
    .forEach((cat, index) => {
      const catDiv = document.createElement('div');
      catDiv.className = 'category';

      // Mengatur background langsung melalui JS agar tidak ada konflik CSS
      const colorIndex = colorIndices[index % 32];
      catDiv.style.setProperty('background', CATEGORY_COLORS[colorIndex], 'important');
      catDiv.style.borderRadius = '8px';
      catDiv.style.padding = '3px';

    catDiv.innerHTML = `
    <div class="category-content">
    <div class="category-header">${cat} <span class="badge">${grouped[cat].length}</span></div>
    <div class="toc-list" style="display: none;"></div>
    </div>`;

    const catList = catDiv.querySelector('.toc-list') as HTMLElement;
    catList.innerHTML = grouped[cat].map(item => {
      const visited = visitedLinks.includes(item.file);
      return `
      <div class="toc-item" data-text="${item.title.toLowerCase()}">
      <div class="toc-title">
      <a href="${getCleanUrl(item.file, item.category)}" class="${visited ? 'visited' : ''}" data-file="${item.file}">${item.title}</a>
      <span class="${visited ? 'label-visited' : 'label-new'}">${visited ? 'sudah dibaca 👍' : '📓 belum dibaca'}</span>
      <span class="toc-date">[${formatDate(item.lastmod)}]</span>
      </div>
      </div>`;
    }).join('');

    catDiv.querySelector('.category-header')?.addEventListener('click', () => {
      catList.style.display = catList.style.display === 'block' ? 'none' : 'block';
      updateTOCToggleText();
    });
    fragment.appendChild(catDiv);
    });

    toc.appendChild(fragment);
    updateStats(allArticles.length, visitedLinks.length);

    toc.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('a');
      if (target?.dataset.file) {
        if (!visitedLinks.includes(target.dataset.file)) {
          visitedLinks.push(target.dataset.file);
          localStorage.setItem('visitedLinks', JSON.stringify(visitedLinks));
          target.classList.add('visited');
          updateStats(allArticles.length, visitedLinks.length);
        }
      }
    });

    const m = document.getElementById('marquee-content');
    if (m) m.innerHTML = allArticles.map(d => `<a href="${getCleanUrl(d.file, d.category)}">${d.title}</a>`).join(' • ');

  } catch (e) { console.error('Gagal load:', e); }
}

document.addEventListener('DOMContentLoaded', () => {
  const darkSwitch = document.getElementById('darkSwitch') as HTMLInputElement;
  const setMode = (d: boolean) => { document.body.classList.toggle('dark-mode', d); localStorage.setItem('darkMode', String(d)); };
  darkSwitch?.addEventListener('change', () => setMode(darkSwitch.checked));

  document.getElementById('tocToggle')?.addEventListener('click', () => {
    const lists = document.querySelectorAll('.toc-list') as NodeListOf<HTMLElement>;
    const open = document.getElementById('tocToggle')!.textContent === 'Buka Semua';
    lists.forEach(l => l.style.display = open ? 'block' : 'none');
    updateTOCToggleText();
  });

  loadTOC();

  const search = document.getElementById('search') as HTMLInputElement;
  search?.addEventListener('input', debounce(() => {
    const term = search.value.toLowerCase();
    document.querySelectorAll('.toc-item').forEach(item => {
      const isMatch = (item.getAttribute('data-text') || '').includes(term);
      (item as HTMLElement).style.display = isMatch ? 'flex' : 'none';
    });
    updateTOCToggleText();
  }, 200));
});