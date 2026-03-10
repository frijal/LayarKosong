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

const getVisitedLinks = (): string[] => {
  try {
    const stored = localStorage.getItem('visitedLinks');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

let visitedLinks: string[] = getVisitedLinks();
let grouped: Record<string, Article[]> = {};

// Helper untuk mengacak urutan
const shuffle = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Index warna 0-31 untuk dipetakan ke variabel CSS --c0 s/d --c31
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

    // Render Categories
    Object.keys(grouped).sort((a, b) => new Date(grouped[b][0].lastmod).getTime() - new Date(grouped[a][0].lastmod).getTime())
    .forEach((cat, index) => {
      const catDiv = document.createElement('div');
      catDiv.className = 'category';

      // Penggunaan mapping warna dari variabel CSS
      const colorIndex = colorIndices[index % 32];
      catDiv.style.setProperty('--category-color', `var(--c${colorIndex})`);

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

    // Event Delegation
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

    // Marquee
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