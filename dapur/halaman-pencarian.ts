/**
 * halaman-pencarian.ts - Search Engine & UI Manager v8.6 (D1 API Edition)
 */

// Interface tetap dipertahankan untuk type safety jika diperlukan
interface MatchResult {
    title: string;
    id: string;
    image: string;
    date: string;
    description: string;
    category: string;
    snippet_text?: string;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 🛠️ 1. RE-ADJUST PADDING (Header Dynamic Height)
    const header = document.getElementById('main-header');
    if (header) {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
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

    // 🔍 4. SEARCH LOGIC (D1 API Edition)
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
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (resultsContainer) resultsContainer.innerHTML = ''; // Bersihkan container sebelum render

    const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Gagal mengambil data dari server');

    const data = await response.json();
    const matches = data.results || [];

    if (loadingIndicator) loadingIndicator.style.display = 'none';

    renderResults(matches, query);

} catch (err: any) {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
if (resultsContainer) {
    resultsContainer.innerHTML = `<p class="text-center text-red-500">Error: ${err.message}</p>`;
}
}

// 🖌️ 5. RENDERER
function renderResults(matches: any[], query: string) {
    if (!resultsContainer) return;

    if (matches.length === 0) {
        resultsContainer.innerHTML = `<p style="text-align:center; padding: 40px 0;">Tidak ditemukan artikel untuk "${query}"</p>`;
        return;
    }

    // Gunakan innerHTML untuk teks status agar tidak menumpuk saat pencarian ulang
    resultsContainer.innerHTML = `<p class="text-muted" style="margin-bottom:1rem;">Ditemukan ${matches.length} artikel terkait...</p>`;

    const grid = document.createElement('div');
    grid.className = 'search-grid';

matches.forEach(m => {
    const fileSlug = m.id ? m.id.replace('.html', '') : '#';
    // Fallback category jika null
    const categoryName = m.category || 'Lainnya';
    const catSlug = categoryName.toLowerCase().replace(/\s+/g, '-');
    const finalUrl = `/${catSlug}/${fileSlug}`;
    const thumbImg = m.image || '/thumbnail.webp';

const dateStr = m.date ? new Date(m.date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
}) : '';

const card = document.createElement('div');
card.className = 'result-card';
card.innerHTML = `
<a href="${finalUrl}" style="text-decoration:none; color:inherit; display:flex; flex-direction:column; height:100%;">
<img src="${thumbImg}" alt="${m.title}" loading="lazy" onerror="this.src='/thumbnail.webp'">
<div class="card-content">
<span style="font-size: 10px; color: var(--warna-aksen); font-weight: bold; text-transform: uppercase;">${categoryName}</span>
<h3 class="card-title">${m.title}</h3>
<p class="card-desc">${m.snippet_text || m.description || ''}</p>
<div style="margin-top: auto; padding-top: 10px; font-size: 10px; color: gray;">${dateStr}</div>
</div>
</a>`;
grid.appendChild(card);
});

resultsContainer.appendChild(grid);
}
});
