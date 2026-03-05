// -------------------------------------------------------
// FILE: sitemap-script.ts (V6.9.2 - Debugged & Robust)
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

const getVisitedLinks = (): string[] => {
  try {
    const stored = localStorage.getItem('visitedLinks');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
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
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;
}

function updateStats(total: number, read: number, term: string = ''): void {
  const el = document.getElementById('totalCount');
  if (!el) return;
  if (term) {
    el.innerHTML = `Menemukan <strong>${total}</strong> artikel dari "${term}"`;
    return;
  }
  el.innerHTML = `Total: <strong>${total}</strong> | Dibaca: <strong>${read}</strong> \uD83D\uDC4D | Sisa: <strong>${total - read}</strong> \uD83D\uDCD3`;
}

function getCleanUrl(file: string, category: string): string {
  const catSlug = category.toLowerCase().replace(/\s+/g, '-');
  return `/${catSlug}/${file.replace('.html', '')}`;
}

const tocToggleBtn = document.getElementById('tocToggle') as HTMLElement | null;

function updateTOCToggleText(): void {
  const lists = Array.from(document.querySelectorAll('.toc-list')) as HTMLElement[];
  if (!lists.length || !tocToggleBtn) return;
  tocToggleBtn.textContent = lists.every(l => l.style.display === 'none') ? 'Buka Semua' : 'Tutup Semua';
}

async function loadTOC() {
  try {
    const res = await fetch('artikel.json');
    const data: ArticleData = await res.json();
    const toc = document.getElementById('toc');
    if (!toc) return;

    toc.innerHTML = '';
    grouped = {};

    Object.keys(data).forEach(cat => {
      grouped[cat] = data[cat].map(arr => ({
        title: arr[0], file: arr[1], image: arr[2], lastmod: arr[3], description: arr[4], category: cat
      })).sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());
    });

    const allArticles = Object.values(grouped).flat();
    updateStats(allArticles.length, visitedLinks.length);

    const colors = shuffle(categoryColors);
    const tooltip = document.getElementById('category-tooltip');

    Object.keys(grouped).sort((a, b) => new Date(grouped[b][0].lastmod).getTime() - new Date(grouped[a][0].lastmod).getTime()).forEach((cat, idx) => {
      const catDiv = document.createElement('div');
      catDiv.className = 'category';
      catDiv.style.setProperty('--category-color', colors[idx % colors.length]);
      catDiv.innerHTML = `<div class="category-content"><div class="category-header">${cat} <span class="badge">${grouped[cat].length}</span></div><div class="toc-list" style="display: none;"></div></div>`;

      const list = catDiv.querySelector('.toc-list') as HTMLElement;
      grouped[cat].forEach(item => {
        const row = document.createElement('div');
        row.className = 'toc-item';
        row.setAttribute('data-text', item.title.toLowerCase());
        row.setAttribute('data-title-raw', item.title);

        const a = document.createElement('a');
        a.href = getCleanUrl(item.file, item.category);
        a.textContent = item.title;
        if (visitedLinks.includes(item.file)) a.classList.add('visited');

        const status = document.createElement('span');
        if (visitedLinks.includes(item.file)) {
          status.className = 'label-visited';
          status.textContent = 'sudah dibaca \uD83D\uDC4D';
        } else {
          status.className = 'label-new';
          status.textContent = '\uD83D\uDCD3 belum dibaca';
        }

        const date = document.createElement('span');
        date.className = 'toc-date';
        date.textContent = `[${formatDate(item.lastmod)}]`;

        a.onclick = () => {
          if (!visitedLinks.includes(item.file)) {
            visitedLinks.push(item.file);
            localStorage.setItem('visitedLinks', JSON.stringify(visitedLinks));
            updateStats(allArticles.length, visitedLinks.length);
          }
        };

        if (tooltip) {
          a.onmouseenter = () => { tooltip.innerHTML = item.description || '...'; tooltip.style.display = 'block'; };
          a.onmousemove = (e) => { tooltip.style.left = (e.clientX + 15) + 'px'; tooltip.style.top = (e.clientY + 15) + 'px'; };
          a.onmouseleave = () => tooltip.style.display = 'none';
        }

        const titleWrap = document.createElement('div');
        titleWrap.className = 'toc-title';
        titleWrap.append(a, status, date);
        row.appendChild(titleWrap);
        list.appendChild(row);
      });

      const header = catDiv.querySelector('.category-header') as HTMLElement;
      header.onclick = () => { list.style.display = (list.style.display === 'block' ? 'none' : 'block'); updateTOCToggleText(); };
      toc.appendChild(catDiv);
    });

    const m = document.getElementById('marquee-content');
    if (m) {
      m.innerHTML = shuffle(allArticles).map(d => `<a href="${getCleanUrl(d.file, d.category)}">${d.title}</a>`).join(' \u2022 ');
    }
  } catch (err) { console.error("Crash loadTOC:", err); }
}

const searchInput = document.getElementById('search') as HTMLInputElement | null;
if (searchInput) {
  searchInput.oninput = () => {
    const val = searchInput.value.toLowerCase();
    let found = 0;
    Array.from(document.querySelectorAll('.category')).forEach(c => {
      let hasItem = false;
      const items = Array.from(c.querySelectorAll('.toc-item')) as HTMLElement[];
      items.forEach(i => {
        const raw = i.getAttribute('data-title-raw') || "";
        const low = (i.getAttribute('data-text') || "").toLowerCase();
        const a = i.querySelector('a');
        if (!a) return;
        if (val && low.includes(val)) {
          i.style.display = 'flex'; hasItem = true; found++;
          const reg = new RegExp(`(${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          a.innerHTML = raw.replace(reg, '<span class="highlight">$1</span>');
        } else if (!val) {
          i.style.display = 'flex'; hasItem = true; a.textContent = raw;
        } else { i.style.display = 'none'; }
      });
      (c as HTMLElement).style.display = hasItem ? 'block' : 'none';
      const l = c.querySelector('.toc-list') as HTMLElement;
      if (l && val) l.style.display = hasItem ? 'block' : 'none';
    });
      updateStats(val ? found : Object.values(grouped).flat().length, visitedLinks.length, val);
      updateTOCToggleText();
  };
}

const clr = document.getElementById('clearSearch');
if (clr && searchInput) clr.onclick = () => { searchInput.value = ''; searchInput.oninput!(new Event('input') as any); };

if (tocToggleBtn) {
  tocToggleBtn.onclick = () => {
    const isBuka = tocToggleBtn.textContent === 'Buka Semua';
    Array.from(document.querySelectorAll('.toc-list')).forEach(l => (l as HTMLElement).style.display = isBuka ? 'block' : 'none');
    updateTOCToggleText();
  };
}

function initDark() {
  const sw = document.getElementById('darkSwitch') as HTMLInputElement | null;
  const set = (d: boolean) => { document.body.classList.toggle('dark-mode', d); if(sw) sw.checked = d; localStorage.setItem('darkMode', String(d)); };
  const s = localStorage.getItem('darkMode');
  if (s !== null) set(s === 'true'); else set(window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (sw) sw.onchange = () => set(sw.checked);
}

document.addEventListener('DOMContentLoaded', () => { loadTOC().then(initDark); });
