document.addEventListener('DOMContentLoaded', () => {
    // 🛠️ 1. RE-ADJUST PADDING (Tetap Original)
    const header = document.getElementById('main-header');
    if (header) {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                document.body.style.paddingTop = `${entry.contentRect.height}px`;
            }
        });
        resizeObserver.observe(header);
    }

    // 🌗 2. THEME ENGINE (Tetap Original)
    const root = document.documentElement;
    const applyTheme = (theme) => {
        root.classList.toggle('dark', theme === 'dark');
        root.classList.toggle('light', theme === 'light');
        localStorage.setItem('theme', theme);
    };

    const savedTheme = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    // 🕒 3. FOOTER YEAR (Tetap Original)
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

    // 🔍 4. SEARCH LOGIC
    const resultsContainer = document.getElementById('search-results');
    const loadingIndicator = document.getElementById('loading-indicator');
    const queryDisplay = document.getElementById('search-query-display');
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q')?.trim() || '';

    if (queryDisplay) {
        queryDisplay.innerHTML = query ? `Hasil Pencarian untuk: <span class="font-bold">"${query}"</span>` : 'Pencarian';
        document.title = query ? `${query} - Cari di Layar Kosong` : 'Pencarian di Layar Kosong';
    }

    if (!query) {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        resultsContainer.innerHTML = '<p class="text-center text-red-500 py-10">Silakan ketik kata kunci pada kolom pencarian...</p>';
        return;
    }

    fetch('artikel.json')
    .then(res => { if (!res.ok) throw new Error('Gagal ambil data'); return res.json(); })
    .then(data => {
        const matches = [];
        const lowerQuery = query.toLowerCase();

        Object.entries(data).forEach(([category, articles]) => {
            // V6.9: Buat slug kategori di sini untuk digunakan di URL nanti
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
                        catSlug // Simpan slug kategori ke dalam object match
                    });
                }
            });
        });

        if (loadingIndicator) loadingIndicator.style.display = 'none';
        renderResults(matches, query);
    })
    .catch(err => {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        resultsContainer.innerHTML = `<p class="text-center text-red-500">Error: ${err.message}</p>`;
    });

    // 🖌️ 5. RENDERER & HIGHLIGHTER (V6.9 Updated)
    function renderResults(matches, query) {
        if (matches.length === 0) {
            resultsContainer.innerHTML = `<p style="text-align:center; color:var(--color-fallback-text); padding: 40px 0;">Tidak ditemukan artikel untuk "${query}"</p>`;
            return;
        }

        resultsContainer.innerHTML = `<p class="text-muted">ditemukan ${matches.length} judul artikel...</p>`;

        const grid = document.createElement('div');
        grid.className = 'search-grid';

        const highlight = (text) => {
            if (!text) return '';
            const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${safeQuery})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        };

        matches.forEach(m => {
            // V6.9 Clean URL: /{kategori}/{file}/
            const fileSlug = m.filename ? m.filename.replace('.html', '') : '#';
            const finalUrl = `/${m.catSlug}/${fileSlug}`;

            const date = m.dateISO ? new Date(m.dateISO).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

            const card = document.createElement('div');
            card.className = 'result-card';
            card.style.cssText = "display:flex; flex-direction:column; border-radius:8px; overflow:hidden; height:100%;";

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
