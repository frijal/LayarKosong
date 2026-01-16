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
            resultsContainer.innerHTML = `<p class="text-center py-10">Tidak ditemukan artikel untuk "${query}"</p>`;
            return;
        }

        resultsContainer.innerHTML = `<p class="mb-4 opacity-70">Menemukan ${matches.length} artikel.</p>`;

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

        // Fungsi Highlight Aman (XSS Safe-ish)
        const highlight = (text) => {
            if (!text) return '';
            const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${safeQuery})`, 'gi');
            return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-600/50 rounded-sm">$1</mark>');
        };

        matches.forEach(m => {
            const date = m.dateISO ? new Date(m.dateISO).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col';
            card.innerHTML = `
            <a href="artikel/${m.filename}" class="aspect-video block overflow-hidden bg-gray-100">
            <img src="${m.imageUrl}" alt="${m.title}" loading="lazy" class="w-full h-full object-cover hover:scale-105 transition-transform">
            </a>
            <div class="p-4 flex-grow flex flex-col">
            <span class="text-[10px] uppercase tracking-wider text-blue-500 font-bold mb-1">${m.category}</span>
            <h3 class="font-bold text-gray-900 dark:text-white leading-snug mb-2 line-clamp-2">
            <a href="artikel/${m.filename}" class="hover:text-blue-600 transition-colors">${highlight(m.title)}</a>
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 text-justify">${highlight(m.description)}</p>
            <div class="mt-auto pt-3 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center text-[11px] text-gray-400">
            <span>${date}</span>
            <a href="artikel/${m.filename}" class="text-blue-500 font-semibold hover:underline">BACA &rarr;</a>
            </div>
            </div>
            `;
            grid.appendChild(card);
        });
        resultsContainer.appendChild(grid);
    }
});
