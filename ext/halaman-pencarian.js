document.addEventListener('DOMContentLoaded', () => {
    // Fungsi untuk menyesuaikan padding body berdasarkan tinggi header
    function adjustBodyPadding() {
        const header = document.getElementById('main-header');
        if (header) {
            const headerHeight = header.offsetHeight;
            document.body.style.paddingTop = headerHeight + 'px';
        }
    }

    // Panggil fungsi saat DOM siap dan saat ukuran jendela diubah
    adjustBodyPadding();
    window.addEventListener('resize', adjustBodyPadding);

    // 🌗 --- DETEKSI & ATUR MODE THEME OTOMATIS ---
    const root = document.documentElement;
    const applyTheme = (theme) => {
        root.classList.remove('dark', 'light');
        root.classList.add(theme);
        localStorage.setItem('theme', theme); // Simpan preferensi
    };

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme(prefersDark.matches ? 'dark' : 'light');
    }

    prefersDark.addEventListener('change', (e) => {
        applyTheme(e.matches ? 'dark' : 'light');
    });
    // 🌗 --- SELESAI: THEME DETECTION ---

    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    const resultsContainer = document.getElementById('search-results');
    const loadingIndicator = document.getElementById('loading-indicator');
    const queryDisplay = document.getElementById('search-query-display');
    const canonicalLink = document.getElementById('canonical-link');
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q')?.trim();
    const queryTextSpan = queryDisplay?.querySelector('span');

    if (query && queryTextSpan) {
        queryTextSpan.textContent = `"${query}"`;
        document.title = `Hasil Pencarian untuk "${query}" | f-Page`;
        canonicalLink.href = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(query)}`;
    } else if (queryTextSpan) {
        queryTextSpan.textContent = '(Tidak ada kata kunci)';
        document.title = `Pencarian | f-Page`;
        canonicalLink.href = `${window.location.origin}${window.location.pathname}`;
    }

    if (!query) {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (resultsContainer) resultsContainer.innerHTML = '<p class="text-center text-red-500 dark:text-red-400">silakan ketik kata kunci pada kolom pencarian di sebelah kanan atas...</p>';
        return;
    }

    fetch('artikel.json')
        .then(response => {
            if (!response.ok) throw new Error(`gagal mengambil data: ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            const matches = [];
            const lowerCaseQuery = query.toLowerCase();
            for (const category in data) {
                if (data.hasOwnProperty(category)) {
                    data[category].forEach(article => {
                        const [title, filename, imageUrl, dateISO, description] = article;
                        const lowerCaseTitle = (title || '').toLowerCase();
                        const lowerCaseDescription = (description || '').toLowerCase();
                        if (lowerCaseTitle.includes(lowerCaseQuery) || lowerCaseDescription.includes(lowerCaseQuery)) {
                            matches.push({ title, filename, imageUrl, dateISO, description, category });
                        }
                    });
                }
            }

            loadingIndicator.style.display = 'none';
            resultsContainer.innerHTML = '';
            if (matches.length === 0) {
                resultsContainer.innerHTML = `<p class="text-center text-gray-600 dark:text-gray-300 py-10">Tidak ada artikel yang cocok dengan kata kunci "<span class="font-semibold">${query}</span>".</p>`;
            } else {
                resultsContainer.innerHTML = `<p class="mb-4 text-gray-700 dark:text-gray-300">Menemukan sejumlah ${matches.length} artikel.</p>`;
                const resultsGrid = document.createElement('div');
                resultsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

                matches.forEach(match => {
                    let formattedDate = '';
                    try {
                        if (match.dateISO)
                            formattedDate = new Date(match.dateISO).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
                    } catch (e) {}

                    const highlight = (text) => {
                        if (!text) return '';
                        const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
                        return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-500/60">$1</mark>');
                    };

                    const card = document.createElement('div');
                    card.className = 'result-card rounded-lg shadow overflow-hidden flex flex-col bg-white dark:bg-gray-800 transition-colors duration-300';
                    card.innerHTML = `
                        <a href="artikel/${match.filename || '#'}" class="block group">
                            <div class="w-full overflow-hidden bg-gray-50 dark:bg-gray-700">
                                <img src="${match.imageUrl || 'https://placehold.co/600x400/e2e8f0/a0aec0?text=Gambar?'}"
                                     alt="${match.title || ''}"
                                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                     loading="lazy"
                                     onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'fallback-img text-center text-2xl py-16 text-gray-400 dark:text-gray-500\\'>?</div>';">
                            </div>
                        </a>
                        <div class="p-4 flex flex-col flex-grow">
                            <h3 class="text-lg font-semibold mb-1 text-gray-800 dark:text-gray-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                                <a href="artikel/${match.filename || '#'}" class="hover:underline">
                                    ${highlight(match.title || 'Tanpa Judul')}
                                </a>
                            </h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">${formattedDate ? `• ${formattedDate}` : ''} • ${match.category || 'Lainnya'}</p>
                            <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 flex-grow">${highlight(match.description || '...')}</p>
                            <a href="artikel/${match.filename || '#'}" class="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-3 inline-block self-start">Baca selengkapnya &rarr;</a>
                        </div>
                    `;
                    resultsGrid.appendChild(card);
                });
                resultsContainer.appendChild(resultsGrid);
            }
        })
        .catch(error => {
            loadingIndicator.style.display = 'none';
            resultsContainer.innerHTML = `<p class="text-center text-red-500 dark:text-red-400 py-10">Terjadi kesalahan saat memuat data atau melakukan pencarian: ${error.message}</p>`;
        });
});
