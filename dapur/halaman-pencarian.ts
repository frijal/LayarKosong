/**
 * =================================================================================
 * Search Engine & UI Manager v6.9 (TypeScript Edition)
 * =================================================================================
 */

// Struktur data artikel sesuai JSON
type ArticleArray = [string, string, string, string, string]; // [title, filename, imageUrl, dateISO, description]
interface ArtikelData {
    [category: string]: ArticleArray[];
}

interface MatchResult {
    title: string;
    filename: string;
    imageUrl: string;
    dateISO: string;
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
        if (resultsContainer) {
            resultsContainer.innerHTML = '<p class="text-center text-red-500 py-10">Silakan ketik kata kunci pada kolom pencarian...</p>';
        }
        return;
    }

    fetch('artikel.json')
        .then(res => { if (!res.ok) throw new Error('Gagal ambil data'); return res.json() as Promise<ArtikelData>; })
        .then(data => {
            const matches: MatchResult[] = [];
            const lowerQuery = query.toLowerCase();

            Object.entries(data).forEach(([category, articles]) => {
                // V6.9: Buat slug kategori
                const catSlug = category.toLowerCase().replace(/\s+/g, '-');

                articles.forEach(article => {
                    const [title, filename, imageUrl, dateISO, description] = article;
                    if (title?.toLowerCase().includes(lowerQuery) || description?.toLowerCase().includes(lowerQuery)) {
                        matches.push({
                            title,
                            filename,
                            imageUrl,
                            dateISO,
                            description,
                            category,
                            catSlug
                        });
                    }
                });
            });

            if (loadingIndicator) loadingIndicator.style.display = 'none';
            renderResults(matches, query);
        })
        .catch(err => {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (resultsContainer) {
                resultsContainer.innerHTML = `<p class="text-center text-red-500">Error: ${err.message}</p>`;
            }
        });

    // 🖌️ 5. RENDERER & HIGHLIGHTER
    function renderResults(matches: MatchResult[], query: string) {
        if (!resultsContainer) return;

        if (matches.length === 0) {
            resultsContainer.innerHTML = `<p style="text-align:center; color:var(--color-fallback-text); padding: 40px 0;">Tidak ditemukan artikel untuk "${query}"</p>`;
            return;
        }

        resultsContainer.innerHTML = `<p class="text-muted">ditemukan ${matches.length} judul artikel...</p>`;

        const grid = document.createElement('div');
        grid.className = 'search-grid';

        const highlight = (text: string): string => {
            if (!text) return '';
            // Escape karakter regex agar aman
            const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${safeQuery})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        };

        matches.forEach(m => {
            // V6.9 Clean URL: /{kategori}/{file}/
            const fileSlug = m.filename ? m.filename.replace('.html', '') : '#';
            const finalUrl = `/${m.catSlug}/${fileSlug}`;

            const date = m.dateISO ? new Date(m.dateISO).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }) : '';

            const card = document.createElement('div');
            card.className = 'result-card';
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.borderRadius = "8px";
            card.style.overflow = "hidden";
            card.style.height = "100%";

            card.innerHTML = `
            <a href="${finalUrl}" style="text-decoration:none; color:inherit; display:flex; flex-direction:column; height:100%;">
                <img src="${m.imageUrl}" alt="${m.title}" loading="lazy" onerror="this.src='/thumbnail.webp'">
                <div class="card-content">
                    <span style="font-size: 10px; color: var(--color-primary); font-weight: bold; text-transform: uppercase;">${m.category}</span>
                    <h3 class="card-title">${highlight(m.title)}</h3>
                    <p class="card-desc" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${highlight(m.description)}
                    </p>
                    <div style="margin-top: auto; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--color-fallback-text);">
                        <span>${date}</span>
                    </div>
                </div>
            </a>
            `;
            grid.appendChild(card);
        });
        resultsContainer.appendChild(grid);
    }
});
