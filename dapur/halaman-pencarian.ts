/**
 * halaman-pencarian.ts - Search Engine & UI Manager v10.0 (CSS-First Theme Edition)
 * Theme detection sepenuhnya menggunakan CSS prefers-color-scheme
 */

interface MatchResult {
    title: string;
    id: string;
    image: string;
    date: string;
    category: string;
    snippet_text?: string;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 🛠️ 1. RE-ADJUST PADDING
    const header = document.getElementById('main-header');
    if (header) {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                document.body.style.paddingTop = `${entry.contentRect.height}px`;
            }
        });
        resizeObserver.observe(header);
    }

    // 🕒 2. FOOTER YEAR
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear().toString();

    // 🔍 3. SEARCH SETUP
    const resultsContainer = document.getElementById('search-results') as HTMLElement;
    const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
    const queryDisplay = document.getElementById('search-query-display') as HTMLElement;

    // --- 🟢 STATE PAGINATION ---
    let currentPage = 1;
    const limit = 36;

    const urlParams = new URLSearchParams(window.location.search);
    // Cek juga 'search' kalau-kalau form HTML-nya pakai name="search" bukan "q"
    const query = urlParams.get('q')?.trim() || urlParams.get('search')?.trim() || '';

    // 🛡️ SATPAM XSS: Mengubah karakter berbahaya menjadi HTML Entities
    const escapeHTML = (str: string) => {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    };

    // Buat versi query yang sudah steril
    const safeQuery = escapeHTML(query);

    // 💡 UX FIX 1: Pertahankan teks di kotak input biar pengunjung gampang mengedit ketikannya
    // Mencari elemen input berdasarkan tipe atau nama (sesuaikan jika di HTML beda)
    const searchInput = document.querySelector('input[type="search"], input[name="q"], input[name="search"]') as HTMLInputElement;
    if (searchInput) {
        searchInput.value = query; // Aman pakai 'query' asli karena mengisi property .value, bukan merender HTML
    }

    if (queryDisplay) {
        queryDisplay.innerHTML = query
            ? `Hasil Pencarian untuk: <span class="font-bold">"${safeQuery}"</span>`
            : 'Pencarian';
        // document.title aman menggunakan 'query' asli karena murni teks
        document.title = query ? `${query} - Cari di Layar Kosong` : 'Pencarian di Layar Kosong';
    }

    // --- 🏗️ UI NAVIGATION ---
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
    if (paginationBox) {
        paginationBox.appendChild(navContainer);
    } else if (resultsContainer) {
        // FALLBACK: Kalau pagination-container lupa dibuat di HTML, tempel di bawah resultsContainer
        resultsContainer.parentNode?.insertBefore(navContainer, resultsContainer.nextSibling);
        console.warn("⚠️ Elemen #pagination-container tidak ditemukan. Navigasi ditempel manual.");
    }

    // Jika tidak ada kata kunci, hentikan eksekusi pencarian
    if (!query) {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (resultsContainer) resultsContainer.innerHTML =
            '<p class="text-center text-red-500 py-10" style="text-align:center;">Silakan ketik kata kunci di kolom pencarian...</p>';
        return;
    }

    // --- 🟢 FUNGSI FETCH & REPLACE ---
    async function fetchResults(page: number) {
        try {
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });

            const apiUrl = `/cari?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
            console.log(`🌐 Melakukan Fetch ke: ${apiUrl}`); // DEBUG: Pastikan URL benar

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

            const data = await response.json();
            console.log("📦 Data diterima dari server:", data); // DEBUG: Cek struktur JSON

            // Fallback: Siapa tahu API mereturn array langsung, atau formatnya { data: [] }
            const matches: MatchResult[] = data.results || data.data || (Array.isArray(data) ? data : []);

            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (resultsContainer) resultsContainer.innerHTML = '';

            if (matches.length === 0) {
                if (page === 1) {
                    // 💡 UX FIX 2: Tambahan CSS word-break & overflow-wrap supaya text panjang nggak bikin layout jebol
                    if(resultsContainer) {
                        resultsContainer.innerHTML = `<p style="text-align:center; padding: 40px 0; word-break: break-word; overflow-wrap: break-word;">Tidak ditemukan artikel untuk "<b>${safeQuery}</b>"</p>`;
                    }
                } else {
                    if(resultsContainer) resultsContainer.innerHTML = `<p style="text-align:center; padding: 40px 0;">Tidak ada lagi artikel untuk ditampilkan.</p>`;
                }
                updateNavButtons(0, page);
                return;
            }

            renderResults(matches, page);
            updateNavButtons(matches.length, page);

        } catch (err: any) {
            console.error("❌ Gagal Fetch API:", err); // DEBUG: Cek pesan error aslinya
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (resultsContainer) {
                // Di-escape juga sekalian biar kalau pesan error-nya dari server ngaco, tetap aman
                resultsContainer.innerHTML = `<p style="text-align:center; color: red;">Error memuat data: ${escapeHTML(err.message)}</p>`;
            }
        }
    }

    // --- 🖌️ RENDERER ---
    function renderResults(matches: MatchResult[], page: number) {
        if (!resultsContainer) {
            console.error("❌ Elemen #search-results tidak ditemukan di HTML!");
            return;
        }

        const startIdx = ((page - 1) * limit) + 1;
        const endIdx = startIdx + matches.length - 1;

        const infoText = document.createElement('p');
        infoText.className = 'text-muted';
        infoText.style.cssText = 'margin-bottom: 1rem; text-align: center; color: gray;';
        // Aman menggunakan 'query' asli karena .textContent tidak merender HTML
        infoText.textContent = `Menampilkan hasil ${startIdx} - ${endIdx} untuk "${query}"`;
        resultsContainer.appendChild(infoText);

        const grid = document.createElement('div');
        // Pastikan div ini memiliki styling grid di CSS (misal: display: grid; gap: 20px;)
        grid.className = 'search-grid';

        matches.forEach(m => {
            const fileSlug = m.id ? m.id.replace('.html', '') : 'tanpa-judul';
            const categoryName = m.category || 'Lainnya';
            const catSlug = categoryName.toLowerCase().replace(/\s+/g, '-');
            const finalUrl = `/${catSlug}/${fileSlug}`;
            const thumbImg = m.image || '/thumbnail.webp';

            const dateStr = m.date
                ? new Date(m.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : '';

            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
<a href="${finalUrl}" class="card-link" style="text-decoration:none; color:inherit; display:flex; flex-direction:column; height:100%;">
    <img src="${thumbImg}" alt="${m.title || 'Thumbnail'}" loading="lazy" style="width:100%; height:auto;" onerror="this.src='/thumbnail.webp'">
    <div class="card-content" style="padding: 10px; display:flex; flex-direction:column; flex-grow: 1;">
        <span class="card-tag" style="font-size: 10px; color: var(--warna-aksen, #007bff); font-weight: bold; text-transform: uppercase;">${categoryName}</span>
        <h3 class="card-title" style="margin: 5px 0;">${m.title || 'Tanpa Judul'}</h3>
        <p class="card-desc" style="font-size: 14px; margin-bottom: 10px;">${m.snippet_text || ''}</p>
        <div style="margin-top: auto; font-size: 10px; color: gray;">${dateStr}</div>
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
