/**
 * halaman-pencarian.ts - Search Engine & UI Manager v11.0 (Live Explorer Edition)
 * Tersinkronisasi penuh dengan search.html & halaman-pencarian.css
 */

interface MatchResult {
    title: string;
    id: string;
    image: string;
    date: string;
    category: string;
    code: string;
    snippet_text?: string;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 🛠️ 1. RE-ADJUST PADDING (Responsif terhadap ukuran header)
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

    // 🔍 3. DOM ELEMENTS SETUP
    const resultsContainer = document.getElementById('search-results') as HTMLElement;
    const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
    const queryDisplay = document.getElementById('search-query-display') as HTMLElement;

    // Hubungkan langsung ke ID input yang baru
    const searchInput = document.getElementById('live-search-box') as HTMLInputElement;

    // --- 🟢 STATE MANAGEMENT ---
    let currentPage = 1;
    const limit = 36;
    let debounceTimer: ReturnType<typeof setTimeout>;

    // Baca URL pertama kali (menangkap parameter ?q=)
    const urlParams = new URLSearchParams(window.location.search);
    let currentQuery = urlParams.get('q')?.trim() || urlParams.get('search')?.trim() || '';

    // Isi kotak input sesuai URL jika ada
    if (searchInput) searchInput.value = currentQuery;

    // 🛡️ SATPAM XSS: Mencegah injeksi kode berbahaya
    const escapeHTML = (str: string) => {
        return str.replace(/[&<>'"]/g,
                           tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    };

    // --- 🏗️ UI NAVIGATION (PAGINATION) ---
    const navContainer = document.createElement('div');
    navContainer.className = 'search-navigation'; // Style diatur di CSS
    navContainer.style.display = 'none'; // Default sembunyi

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Sebelumnya';
prevBtn.className = 'btn-nav';

const nextBtn = document.createElement('button');
nextBtn.textContent = 'Selanjutnya →';
nextBtn.className = 'btn-nav';

navContainer.appendChild(prevBtn);
navContainer.appendChild(nextBtn);

const paginationBox = document.getElementById('pagination-container');
if (paginationBox) {
    paginationBox.appendChild(navContainer);
} else if (resultsContainer) {
    resultsContainer.parentNode?.insertBefore(navContainer, resultsContainer.nextSibling);
}

// --- 🎭 FUNGSI UPDATE TAMPILAN HEADER PENCARIAN ---
const updateQueryDisplay = (queryStr: string) => {
    if (queryDisplay) {
        queryDisplay.innerHTML = queryStr
        ? `Hasil Pencarian untuk: <span class="font-bold">"${escapeHTML(queryStr)}"</span>`
        : 'Pencarian';
    }
    document.title = queryStr ? `${queryStr} - Cari di Layar Kosong` : 'Pencarian di Layar Kosong';
};

// --- 🚫 FUNGSI RESET KE LAYAR KOSONG (STANDBY) ---
const showStandbyScreen = () => {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    navContainer.style.display = 'none';
    updateQueryDisplay('');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<p style="text-align:center; padding: 40px 0; color: var(--warna-teks-sekunder);">Silakan ketik kata kunci di kolom pencarian...</p>';
    }
};

// --- 🟢 FUNGSI FETCH UTAMA D1 ---
async function fetchResults(queryStr: string, page: number) {
    try {
        if (loadingIndicator) loadingIndicator.style.display = 'block';
if (resultsContainer) resultsContainer.innerHTML = '';
navContainer.style.display = 'none';

const safeQueryForURL = encodeURIComponent(queryStr);
const apiUrl = `/cari?q=${safeQueryForURL}&page=${page}&limit=${limit}`;

const response = await fetch(apiUrl);
if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

const data = await response.json();
const matches: MatchResult[] = data.results || data.data || [];

if (loadingIndicator) loadingIndicator.style.display = 'none';

// Jika hasil kosong
if (matches.length === 0) {
    if (page === 1) {
        if (resultsContainer) resultsContainer.innerHTML = `<p style="text-align:center; padding: 40px 0; color: var(--warna-teks-sekunder); word-break: break-word;">Tidak ditemukan sinyal untuk "<b>${escapeHTML(queryStr)}</b>"</p>`;
    } else {
        if (resultsContainer) resultsContainer.innerHTML = `<p style="text-align:center; padding: 40px 0; color: var(--warna-teks-sekunder);">Tidak ada lagi artikel untuk ditampilkan.</p>`;
    }
    updateNavButtons(0, page);
    return;
}

renderResults(matches, page, queryStr);
updateNavButtons(matches.length, page);

    } catch (err: any) {
        console.error("❌ Gagal Fetch API:", err);
        if (loadingIndicator) loadingIndicator.style.display = 'none';
if (resultsContainer) {
    resultsContainer.innerHTML = `<p style="text-align:center; color: #ff5858;">Error memuat data: ${escapeHTML(err.message)}</p>`;
}
    }
}

// --- 🖌️ RENDERER KARTU (SINKRON DENGAN CSS BARU) ---
function renderResults(matches: MatchResult[], page: number, queryStr: string) {
    if (!resultsContainer) return;

    const startIdx = ((page - 1) * limit) + 1;
    const endIdx = startIdx + matches.length - 1;

    // Teks Informasi Jumlah Hasil
    const infoText = document.createElement('p');
    infoText.style.cssText = 'margin-bottom: 2rem; text-align: center; color: var(--warna-teks-sekunder); font-size: 0.9rem;';
    infoText.textContent = `Menampilkan hasil ${startIdx} - ${endIdx} untuk "${queryStr}"`;
    resultsContainer.appendChild(infoText);

    // Bungkus Grid
    const grid = document.createElement('div');
    grid.className = 'search-grid'; // Memanggil class dari CSS terpisah

matches.forEach(m => {
    const fileSlug = m.id ? m.id.replace('.html', '') : 'tanpa-judul';
    const categoryName = m.category || 'Lainnya';
    const catSlug = categoryName.toLowerCase().replace(/\s+/g, '-');
    const finalUrl = `/${catSlug}/${fileSlug}`;
    const thumbImg = m.image || '/thumbnail.webp';
    const dateStr = m.date ? new Date(m.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

    // Render DOM menggunakan Class CSS
    const card = document.createElement('a');
    card.className = 'result-card';
    card.href = finalUrl;

    card.innerHTML = `
    <div class="card-img-wrapper">
    <img src="${thumbImg}" alt="${escapeHTML(m.title || 'Thumbnail')}" loading="lazy" onerror="this.src='/thumbnail.webp'">
    <span class="card-code">${escapeHTML(m.code || '')}</span>
    </div>
    <div class="card-content">
    <span class="card-tag">${escapeHTML(categoryName.replace(/-/g, ' '))}</span>
    <h3 class="card-title">${escapeHTML(m.title || 'Tanpa Judul')}</h3>
    <p class="card-desc">${m.snippet_text || ''}</p>
    <div class="card-footer">
    <span>${dateStr}</span>
    <span class="card-read-more">Baca →</span>
    </div>
    </div>
    `;
    grid.appendChild(card);
});

resultsContainer.appendChild(grid);
}

// --- ⚙️ LOGIKA TOMBOL NAVIGASI ---
function updateNavButtons(currentMatchCount: number, page: number) {
    navContainer.style.display = (page > 1 || currentMatchCount === limit) ? 'flex' : 'none';
    prevBtn.style.display = page > 1 ? 'block' : 'none';
    nextBtn.style.display = currentMatchCount === limit ? 'block' : 'none';
}

// --- ⚡ LIVE EVENT LISTENERS ---

if (searchInput) {
    // 1. Eksekusi Live Typing pada Kotak Input (Debounce)
    searchInput.addEventListener('input', (e) => {
        currentQuery = (e.target as HTMLInputElement).value;
        currentPage = 1; // Reset halaman ke 1

        // Update URL bar tanpa me-reload halaman
        const newUrl = currentQuery ? `?q=${encodeURIComponent(currentQuery)}` : window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        updateQueryDisplay(currentQuery);
        clearTimeout(debounceTimer);

        if (!currentQuery.trim()) {
            showStandbyScreen();
            return;
        }

        // Delay 300ms buat nahan spam nembak D1
        debounceTimer = setTimeout(() => {
            fetchResults(currentQuery, currentPage);
        }, 300);
    });

    // 💡 2. UX TAMBAHAN: Turunkan Keyboard HP saat tekan "Enter"
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchInput.blur(); // Perintah untuk menghilangkan fokus (menurunkan keyboard)
        }
    });
}

// 3. Navigasi Pagination
nextBtn.addEventListener('click', () => {
    currentPage++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchResults(currentQuery, currentPage);
});

prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        fetchResults(currentQuery, currentPage);
    }
});

// 🚀 Start: Cek apakah ada query dari URL pas pertama kali buka
if (currentQuery) {
    updateQueryDisplay(currentQuery);
    fetchResults(currentQuery, currentPage);
} else {
    showStandbyScreen();
}
});
