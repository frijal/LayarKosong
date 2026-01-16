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
            resultsContainer.innerHTML = `<p class="text-center py-10 text-gray-500">Tidak ditemukan artikel untuk "${query}"</p>`;
            return;
        }

        resultsContainer.innerHTML = `<p class="mb-4 text-xs opacity-60">Menemukan ${matches.length} hasil.</p>`;

        const grid = document.createElement('div');
        // 4 KOLOM di layar medium, 5 KOLOM di layar besar
        grid.className = 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4';

        const highlight = (text) => {
            if (!text) return '';
            const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${safeQuery})`, 'gi');
            return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-600/50 rounded-sm">$1</mark>');
        };

        matches.forEach(m => {
            // --- HILANGKAN .HTML ---
            const cleanUrl = m.filename ? m.filename.replace('.html', '') : '#';

            const date = m.dateISO ? new Date(m.dateISO).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

            const card = document.createElement('div');
            // Ukuran teks dan padding diperkecil (text-sm & p-3)
            card.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col h-full text-sm';

            card.innerHTML = `
            <a href="artikel/${cleanUrl}" class="aspect-video block overflow-hidden bg-gray-100">
            <img src="${m.imageUrl}" alt="${m.title}" loading="lazy" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
            </a>
            <div class="p-3 flex-grow flex flex-col">
            <span class="text-[9px] uppercase tracking-tighter text-blue-500 font-bold mb-1 opacity-80">${m.category}</span>

            <h3 class="font-bold text-gray-900 dark:text-white leading-tight mb-2 line-clamp-2 text-sm">
            <a href="artikel/${cleanUrl}" class="hover:text-blue-600 transition-colors">${highlight(m.title)}</a>
            </h3>

            <p class="text-[12px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-snug">${highlight(m.description)}</p>

            <div class="mt-auto pt-2 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center text-[10px] text-gray-400">
            <span>${date}</span>
            <a href="artikel/${cleanUrl}" class="font-bold text-blue-500 hover:underline text-[9px]">DETAIL &rarr;</a>
            </div>
            </div>
            `;
            grid.appendChild(card);
        });
        resultsContainer.appendChild(grid);
    }
});
