/**
 * halaman-pencarian.ts - Search Engine & UI Manager v6.9 (Provider Edition)
 */

interface MatchResult {
    title: string;
    id: string;        // ini adalah filename
    image: string;
    date: string;      // ini adalah dateISO
    description: string;
    category: string;
    catSlug: string;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 🛠️ 1. RE-ADJUST PADDING
    const header = document.getElementById('main-header');
    if (header) {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                // Menggunakan height dari contentRect untuk padding body
                document.body.style.paddingTop = `${entry.contentRect.height}px`;
            }
        });
        resizeObserver.observe(header);
    }

    // 🌗 2. THEME ENGINE
    const root = document.documentElement;
    const applyTheme = (theme: string) => {
        root.classList.toggle('dark', theme === 'dark');
        root.classList.toggle('light', theme === 'light');
        localStorage.setItem('theme', theme);
    };

    const savedTheme = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    // 🕒 3. FOOTER YEAR
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear().toString();

    // 🔍 4. SEARCH LOGIC
    const resultsContainer = document.getElementById('search-results') as HTMLElement;
    const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
    const queryDisplay = document.getElementById('search-query-display') as HTMLElement;

    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q')?.trim() || '';

if (queryDisplay) {
    queryDisplay.innerHTML = query ? `Hasil Pencarian untuk: <span class="font-bold">"${query}"</span>` : 'Pencarian';
    document.title = query ? `${query} - Cari di Layar Kosong` : 'Pencarian di Layar Kosong';
}

if (!query) {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (resultsContainer) resultsContainer.innerHTML = '<p class="text-center text-red-500 py-10">Silakan ketik kata kunci...</p>';
    return;
}

try {
    // MENGGUNAKAN PROVIDER
    const data = await (window as any).siteDataProvider.getFor('halaman-pencarian.ts');
    const matches: MatchResult[] = [];
    const lowerQuery = query.toLowerCase();

    Object.entries(data).forEach(([category, articles]: [string, any]) => {
        const catSlug = category.toLowerCase().replace(/\s+/g, '-');

        // articles sekarang adalah array of objects (bukan array of arrays)
        articles.forEach((article: any) => {
            if (article.title?.toLowerCase().includes(lowerQuery) ||
                article.description?.toLowerCase().includes(lowerQuery)) {
                matches.push({
                    title: article.title,
                    id: article.id,
                    image: article.image,
                    date: article.date,
                    description: article.description,
                    category: category,
                    catSlug: catSlug
                });
                }
        });
    });

    if (loadingIndicator) loadingIndicator.style.display = 'none';
    renderResults(matches, query);

} catch (err: any) {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
if (resultsContainer) {
    resultsContainer.innerHTML = `<p class="text-center text-red-500">Error: ${err.message}</p>`;
}
}

// 🖌️ 5. RENDERER
function renderResults(matches: MatchResult[], query: string) {
    if (!resultsContainer) return;

    if (matches.length === 0) {
        resultsContainer.innerHTML = `<p style="text-align:center; padding: 40px 0;">Tidak ditemukan artikel untuk "${query}"</p>`;
        return;
    }

    resultsContainer.innerHTML = `<p class="text-muted">ditemukan ${matches.length} judul artikel...</p>`;

    const grid = document.createElement('div');
    grid.className = 'search-grid';

const highlight = (text: string): string => {
    if (!text) return '';
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
};

matches.forEach(m => {
    const fileSlug = m.id ? m.id.replace('.html', '') : '#';
    const finalUrl = `/${m.catSlug}/${fileSlug}`;

    // Format tanggal
    const dateStr = m.date ? new Date(m.date).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    }) : '';

    const card = document.createElement('div');
    card.className = 'result-card';
card.innerHTML = `
<a href="${finalUrl}" style="text-decoration:none; color:inherit; display:flex; flex-direction:column; height:100%;">
<img src="${m.image}" alt="${m.title}" loading="lazy" onerror="this.src='/thumbnail.webp'">
<div class="card-content">
<span style="font-size: 10px; color: var(--color-primary); font-weight: bold; text-transform: uppercase;">${m.category}</span>
<h3 class="card-title">${highlight(m.title)}</h3>
<p class="card-desc">${highlight(m.description)}</p>
<div style="margin-top: auto; padding-top: 10px; font-size: 10px;">${dateStr}</div>
</div>
</a>`;
grid.appendChild(card);
});
resultsContainer.appendChild(grid);
}
});