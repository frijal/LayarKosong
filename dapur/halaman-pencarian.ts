/**
 * halaman-pencarian.ts - Search Engine & UI Manager v9.0 (Paginated D1 Edition)
 */

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

    // 🔍 4. SEARCH SETUP
    const resultsContainer = document.getElementById('search-results') as HTMLElement;
    const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
    const queryDisplay = document.getElementById('search-query-display') as HTMLElement;

    // --- 🟢 STATE PAGINATION ---
    let currentPage = 1;
    const limit = 48;

    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q')?.trim() || '';

    if (queryDisplay) {
        queryDisplay.innerHTML = query
            ? `Hasil Pencarian untuk: <span class="font-bold">"${query}"</span>`
            : 'Pencarian';
        document.title = query
            ? `${query} - Cari di Layar Kosong`
            : 'Pencarian di Layar Kosong';
    }

    // --- 🏗️ UI NAVIGATION (Container Tombol) ---
    const navContainer = document.createElement('div');
    navContainer.className = 'search-navigation';
    navContainer.style.cssText = 'display: flex; justify-content: center; gap: 20px; margin: 40px 0;';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Sebelumnya';
    prevBtn.className = 'btn-nav';
    prevBtn.style.display = 'none';

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Selanjutnya →';
    nextBtn.className = 'btn-nav';
    nextBtn.style.display = 'none';

    navContainer.appendChild(prevBtn);
    navContainer.appendChild(nextBtn);
const paginationBox = document.getElementById('pagination-container');
if (paginationBox) paginationBox.appendChild(navContainer);
    if (!query) {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (resultsContainer) resultsContainer.innerHTML =
            '<p class="text-center text-red-500 py-10">Silakan ketik kata kunci...</p>';
        return;
    }

// --- 🟢 FUNGSI FETCH & REPLACE ---
async function fetchResults(page: number) {
    try {
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        
        // Pindahkan scroll ke atas saat mulai memuat
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const response = await fetch(`/cari?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
        if (!response.ok) throw new Error('Gagal mengambil data dari server');

        const data = await response.json();
        const matches: MatchResult[] = data.results || [];

        if (loadingIndicator) loadingIndicator.style.display = 'none';

        // Bersihkan container
        if (resultsContainer) resultsContainer.innerHTML = '';

        if (matches.length === 0) {
            if (page === 1) {
                resultsContainer.innerHTML = `<p style="text-align:center; padding: 40px 0;">Tidak ditemukan artikel untuk "${query}"</p>`;
            } else {
                resultsContainer.innerHTML = `<p style="text-align:center; padding: 40px 0;">Tidak ada lagi artikel untuk ditampilkan.</p>`;
            }
            updateNavButtons(0, page);
            return;
        }

        renderResults(matches, page); // Tambahkan parameter page
        updateNavButtons(matches.length, page);

    } catch (err: any) {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (resultsContainer) {
            resultsContainer.innerHTML = `<p class="text-center text-red-500">Error: ${err.message}</p>`;
        }
    }
}

// --- 🖌️ RENDERER ---
function renderResults(matches: MatchResult[], page: number) {
    if (!resultsContainer) return;

    // Info Halaman yang lebih akurat
    const startIdx = ((page - 1) * limit) + 1;
    const endIdx = startIdx + matches.length - 1;
    
    const infoText = document.createElement('p');
    infoText.className = 'text-muted';
    infoText.style.marginBottom = '1rem';
    infoText.textContent = `Menampilkan hasil ${startIdx} - ${endIdx} untuk "${query}"`;
    resultsContainer.appendChild(infoText);

    const grid = document.createElement('div');
    grid.className = 'search-grid';

      matches.forEach(m => {
        const fileSlug = m.id ? m.id.replace('.html', '') : '#';
        const categoryName = m.category || 'Lainnya';
        const catSlug = categoryName.toLowerCase().replace(/\s+/g, '-');
        const finalUrl = `/${catSlug}/${fileSlug}`;
            const thumbImg = m.image || '/thumbnail.webp';

            const dateStr = m.date
                ? new Date(m.date).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric'
                })
                : '';

            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
                <a href="${finalUrl}" class="card-link" style="text-decoration:none; color:inherit; display:flex; flex-direction:column; height:100%;">
                    <img src="${thumbImg}" alt="${m.title}" loading="lazy" onerror="this.src='/thumbnail.webp'">
                    <div class="card-content">
                        <span class="card-tag" style="font-size: 10px; color: var(--warna-aksen); font-weight: bold; text-transform: uppercase;">${categoryName}</span>
                        <h3 class="card-title">${m.title}</h3>
                        <p class="card-desc">${m.snippet_text || m.description || ''}</p>
                        <div style="margin-top: auto; padding-top: 10px; font-size: 10px; color: gray;">${dateStr}</div>
                    </div>
                </a>`;
            grid.appendChild(card);
        });

        resultsContainer.appendChild(grid);
    }

    // --- ⚙️ LOGIKA TOMBOL NAVIGASI ---
    function updateNavButtons(currentMatchCount: number, page: number) {
        prevBtn.style.display = page > 1 ? 'block' : 'none';
        nextBtn.style.display = currentMatchCount === limit ? 'block' : 'none';
    }

    // --- 🟢 EVENT LISTENERS ---
    nextBtn.addEventListener('click', () => {
        currentPage++;
        fetchResults(currentPage);
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchResults(currentPage);
        }
    });

    // 🚀 Start halaman pertama
    fetchResults(currentPage);
});
