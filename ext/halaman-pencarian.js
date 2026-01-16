document.addEventListener('DOMContentLoaded', () => {
    // 🛠️ 1. RE-ADJUST PADDING (Lebih halus pakai ResizeObserver)
    const header = document.getElementById('main-header');
    if (header) {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                document.body.style.paddingTop = `${entry.contentRect.height}px`;
            }
        });
        resizeObserver.observe(header);
    }

    // 🌗 2. THEME ENGINE (Dibuat lebih ringkas)
    const root = document.documentElement;
    const applyTheme = (theme) => {
        root.classList.toggle('dark', theme === 'dark');
        root.classList.toggle('light', theme === 'light');
        localStorage.setItem('theme', theme);
    };

    const savedTheme = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) applyTheme(e.matches ? 'dark' : 'light');
    });

        // 🕒 3. FOOTER YEAR
        const currentYearSpan = document.getElementById('current-year');
        if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

        // 🔍 4. SEARCH LOGIC
        const resultsContainer = document.getElementById('search-results');
    const loadingIndicator = document.getElementById('loading-indicator');
    const queryDisplay = document.getElementById('search-query-display');
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q')?.trim() || '';

    // Update UI Awal
    if (queryDisplay) {
        queryDisplay.innerHTML = query ? `Hasil Pencarian untuk: <span class="font-bold">"${query}"</span>` : 'Pencarian';
        document.title = query ? `${query} - Cari di Layar Kosong` : 'Pencarian di Layar Kosong';
    }

    if (!query) {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        resultsContainer.innerHTML = '<p class="text-center text-red-500 py-10">Silakan ketik kata kunci pada kolom pencarian...</p>';
        return;
    }

    // Ambil Data
    fetch('artikel.json')
    .then(res => { if (!res.ok) throw new Error('Gagal ambil data'); return res.json(); })
    .then(data => {
        const matches = [];
        const lowerQuery = query.toLowerCase();

        // Loop Efisien
        Object.entries(data).forEach(([category, articles]) => {
            articles.forEach(article => {
                const [title, filename, imageUrl, dateISO, description] = article;
                if (title?.toLowerCase().includes(lowerQuery) || description?.toLowerCase().includes(lowerQuery)) {
                    matches.push({ title, filename, imageUrl, dateISO, description, category });
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

    // 🖌️ 5. RENDERER & HIGHLIGHTER
    function renderResults(matches, query) {
        if (matches.length === 0) {
            resultsContainer.innerHTML = `<p style="text-align:center; color:var(--color-fallback-text); padding: 40px 0;">Tidak ditemukan artikel untuk "${query}"</p>`;
            return;
        }

        resultsContainer.innerHTML = `<p class="text-muted">Menemukan ${matches.length} hasil.</p>`;

        const grid = document.createElement('div');
        grid.className = 'search-grid'; // Memakai class dari CSS di atas

        const highlight = (text) => {
            if (!text) return '';
            const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${safeQuery})`, 'gi');
            // Tag <mark> otomatis pakai style dari CSS kamu
            return text.replace(regex, '<mark>$1</mark>');
        };

        matches.forEach(m => {
            // Hapus ekstensi .html
            const cleanUrl = m.filename ? m.filename.replace('.html', '') : '#';
            const date = m.dateISO ? new Date(m.dateISO).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

            const card = document.createElement('div');
            card.className = 'result-card'; // Memakai class dari CSS kamu
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.borderRadius = '8px';
            card.style.overflow = 'hidden';
            card.style.height = '100%';

            card.innerHTML = `
            <a href="artikel/${cleanUrl}" style="text-decoration:none; color:inherit; display:flex; flex-direction:column; height:100%;">
            <img src="${m.imageUrl}" alt="${m.title}" loading="lazy" onerror="this.src='/thumbnail.webp'">
            <div class="card-content">
            <span style="font-size: 10px; color: var(--color-primary); font-weight: bold; text-transform: uppercase;">${m.category}</span>
            <h3 class="card-title">${highlight(m.title)}</h3>
            <p class="card-desc" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${highlight(m.description)}
            </p>
            <div style="margin-top: auto; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--color-fallback-text);">
            <span>${date}</span>
            <span style="font-weight: bold; color: var(--color-primary);">Langsung Buka →</span>
            </div>
            </div>
            </a>
            `;
            grid.appendChild(card);
        });
        resultsContainer.appendChild(grid);
    }
});
