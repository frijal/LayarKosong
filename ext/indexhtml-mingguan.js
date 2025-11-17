/**
 * File: js/index.js
 * Deskripsi: Skrip ini memuat, memfilter, dan merender daftar artikel
 * di halaman depan (index.html) secara dinamis.
 * * CATATAN: Ini adalah skrip canggih yang dipindahkan dari tag <script>
 * di index.html, bukan skrip 'js/main.js' yang sederhana sebelumnya.
 */

document.addEventListener('DOMContentLoaded', main);

let allArticles = []; // Cache global untuk semua artikel, terurut
let originalJsonData = {}; // Cache untuk data JSON asli

/**
 * Fungsi utama, dieksekusi setelah DOM siap.
 */
async function main() {
    const container = document.getElementById('article-container');
    const loadingMessage = document.getElementById('loading-message');

    try {
        // 1. Fetch dan proses data
        const response = await fetch('/artikel.json'); // Ambil dari root
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        originalJsonData = await response.json();

        allArticles = processArticles(originalJsonData);

        // 2. Isi dropdown filter
        populateCategoryFilter(originalJsonData);
        populateWeekFilter(allArticles); // Initial population with all weeks

        // 3. Render tampilan default
        renderDefaultView(allArticles, originalJsonData);

        // 4. Sembunyikan pesan loading
        loadingMessage.classList.add('hidden');

        // 5. Tambahkan event listener ke filter
        document.getElementById('category-filter').addEventListener('change', handleCategoryChange);
        document.getElementById('week-filter').addEventListener('change', applyFilters);

    } catch (error) {
        console.error("Gagal memuat atau memproses artikel.json:", error);
        container.innerHTML = `<p class="message">Gagal memuat data artikel. Pastikan file <b>artikel.json</b> ada di root server Anda.</p>`;
    }
}

/**
 * Mengubah data JSON mentah menjadi array objek yang rapi dan terurut.
 * @param {object} jsonData - Data mentah dari artikel.json
 * @returns {Array<object>} Array artikel yang sudah diproses dan diurutkan.
 */
function processArticles(jsonData) {
    const articles = [];
    for (const [category, articleList] of Object.entries(jsonData)) {
        articleList.forEach(article => {
            articles.push({
                title: article[0],
                url: article[1],
                image: article[2],
                date: new Date(article[3]), // Ubah jadi objek Date
                description: article[4],
                category: category
            });
        });
    }
    // Urutkan semua artikel dari terbaru ke terlama
    articles.sort((a, b) => b.date - a.date);
    return articles;
}

/**
 * Mengisi dropdown Kategori.
 * @param {object} jsonData - Data JSON asli.
 */
function populateCategoryFilter(jsonData) {
    const categorySelect = document.getElementById('category-filter');
    Object.keys(jsonData).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

/**
 * Mengisi dropdown Minggu berdasarkan daftar artikel yang disediakan.
 * @param {Array<object>} articles - Daftar artikel untuk diekstrak minggunya.
 */
function populateWeekFilter(articles) {
    const weekSelect = document.getElementById('week-filter');
    weekSelect.innerHTML = '<option value="all">Semua Minggu</option>'; // Reset

    const weekMap = new Map();

    // Buat daftar minggu unik dari artikel yang diberikan
    articles.forEach(article => {
        const weekStartISO = getWeekStartDate(article.date);
        if (!weekMap.has(weekStartISO)) {
            // Gunakan 'T12:00:00Z' untuk menghindari masalah timezone saat parsing
            const weekStartDate = new Date(weekStartISO + 'T12:00:00Z');
            const weekNum = getWeekNumber(weekStartDate);
            weekMap.set(weekStartISO, `Minggu ${weekNum} (Mulai ${formatDateForDisplay(weekStartDate)})`);
        }
    });

    // Urutkan minggu (terbaru di atas)
    const sortedWeeks = [...weekMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

    // Isi filter Minggu
    sortedWeeks.forEach(([iso, label]) => {
        const option = document.createElement('option');
        option.value = iso;
        option.textContent = label;
        weekSelect.appendChild(option);
    });
}

/**
 * Dipanggil saat filter Kategori berubah (CASCADING).
 */
function handleCategoryChange() {
    const categoryValue = document.getElementById('category-filter').value;

    let articlesForWeekFilter;
    if (categoryValue === 'all') {
        articlesForWeekFilter = allArticles;
    } else {
        articlesForWeekFilter = allArticles.filter(a => a.category === categoryValue);
    }

    // 1. Repopulasi filter Minggu berdasarkan kategori (CASCAADING)
    populateWeekFilter(articlesForWeekFilter);

    // 2. Terapkan filter untuk menampilkan artikel
    applyFilters();
}

/**
 * Merender tampilan default: 30 terbaru + 10 lainnya per kategori.
 * @param {Array<object>} allArticles - Array semua artikel.
 * @param {object} jsonData - Data JSON asli.
 */
function renderDefaultView(allArticles, jsonData) {
    const defaultView = document.getElementById('default-view');
    defaultView.innerHTML = ''; // Hapus "Memuat..."

    // 1. Dapatkan 30 artikel terbaru
    const top30Articles = allArticles.slice(0, 30);
    const top30Urls = new Set(top30Articles.map(a => a.url)); // Set untuk cek duplikat

    // Render 30 terbaru
    defaultView.innerHTML += '<h2>30 Artikel Terbaru</h2>';
    const top30Grid = document.createElement('div');
    top30Grid.className = 'article-grid';
    renderArticles(top30Articles, top30Grid);
    defaultView.appendChild(top30Grid);

    // 2. Render "Artikel Lainnya" per kategori
    for (const category of Object.keys(jsonData).sort()) {
        const otherArticles = allArticles
            .filter(a => a.category === category)      // Filter per kategori
            .filter(a => !top30Urls.has(a.url))  // Hapus yang sudah ada di top 30
            .slice(0, 6);                           // Ambil 6 teratas

        if (otherArticles.length > 0) {
            defaultView.innerHTML += `<h2>Artikel Lainnya di ${category}</h2>`;
            const categoryGrid = document.createElement('div');
            categoryGrid.className = 'article-grid';
            renderArticles(otherArticles, categoryGrid);
            defaultView.appendChild(categoryGrid);
        }
    }
}

/**
 * Menerapkan filter saat dropdown berubah.
 */
function applyFilters() {
    const categoryValue = document.getElementById('category-filter').value;
    const weekValue = document.getElementById('week-filter').value;

    const defaultView = document.getElementById('default-view');
    const filteredView = document.getElementById('filtered-view');

    if (categoryValue === 'all' && weekValue === 'all') {
        defaultView.classList.remove('hidden');
        filteredView.classList.add('hidden');
        filteredView.innerHTML = '';
        updateFilterInfo([]); // Panggil ini untuk menyembunyikan info box
        return;
    }

    defaultView.classList.add('hidden');
    filteredView.classList.remove('hidden');

    let filteredArticles = allArticles;

    if (categoryValue !== 'all') {
        filteredArticles = filteredArticles.filter(a => a.category === categoryValue);
    }
    if (weekValue !== 'all') {
        filteredArticles = filteredArticles.filter(a => getWeekStartDate(a.date) === weekValue);
    }

    // Panggil updateFilterInfo SEKARANG, setelah filteredArticles final
    updateFilterInfo(filteredArticles);

    renderArticles(filteredArticles, filteredView);
}

/**
 * [BARU] Memperbarui teks info di bawah filter.
 * @param {Array<object>} articlesToShow - Artikel yang akan ditampilkan.
 */
function updateFilterInfo(articlesToShow) {
    const infoElement = document.getElementById('filter-info');
    const weekSelect = document.getElementById('week-filter');
    const weekValue = weekSelect.value;

    // Sembunyikan jika "Semua Minggu" dipilih
    if (weekValue === 'all') {
        infoElement.textContent = '';
        infoElement.classList.add('hidden');
        return;
    }

    // Tampilkan jika minggu spesifik dipilih
    infoElement.classList.remove('hidden');
    const jumlah = articlesToShow.length;

    if (jumlah === 0) {
        infoElement.textContent = 'Tidak ada artikel yang ditemukan untuk minggu ini.';
        return;
    }

    // Hitung rentang tanggal dari artikel yang *sebenarnya* difilter
    const dates = articlesToShow.map(a => a.date.getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const startDate = formatDateForDisplay(minDate);
    const endDate = formatDateForDisplay(maxDate);

    // Ambil info minggu & tahun dari teks dropdown yang dipilih
    const selectedOptionText = weekSelect.options[weekSelect.selectedIndex].text;
    const mingguMatch = selectedOptionText.match(/Minggu (\d+)/);
    const tahunMatch = selectedOptionText.match(/(\d{4})/);

    const minggu = mingguMatch ? mingguMatch[1] : '?';
    const tahun = tahunMatch ? tahunMatch[1] : '?';

    // Format string sesuai permintaan
    infoElement.textContent = `Seluruh artikel ini di upload pada tanggal ${startDate} sampai ${endDate}, minggu ke-${minggu}, tahun ${tahun} dengan jumlah ${jumlah} judul.`;
}

/**
 * Merender daftar artikel ke dalam kontainer yang ditentukan.
 * @param {Array<object>} articles - Daftar artikel untuk dirender.
 * @param {HTMLElement} container - Elemen DOM untuk menampung kartu.
 */
function renderArticles(articles, container) {
    container.innerHTML = ''; // Kosongkan kontainer
    if (articles.length === 0) {
        container.innerHTML = '<p class="message">Tidak ada artikel yang ditemukan.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    articles.forEach(article => {
        const card = createCardElement(article);
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
}

/**
 * Membuat satu elemen kartu artikel.
 * @param {object} article - Objek artikel.
 * @returns {HTMLElement} Elemen 'a' (anchor) yang berisi kartu.
 */
function createCardElement(article) {
    const card = document.createElement('a');
    card.className = 'article-card';
    // PENTING: Tautan internal yang dilihat Googlebot sebagai "Halaman Perujuk"
    // Asumsi semua artikel ada di folder /artikel/
    card.href = `artikel/${article.url}`;

    const img = document.createElement('img');
    img.src = article.image;
    img.alt = article.title;
    img.loading = 'lazy';
    img.onerror = (e) => { e.target.style.display = 'none'; };

    const content = document.createElement('div');
    content.className = 'card-content';

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.innerHTML = `
        <span class="category">${article.category}</span>
        <span class="date">${formatDateForDisplay(article.date)}</span>
    `;

    const title = document.createElement('h3');
    title.textContent = article.title;

    const description = document.createElement('p');
    description.className = 'card-description';
    description.textContent = article.description;

    content.appendChild(meta);
    content.appendChild(title);
    content.appendChild(description);

    card.appendChild(img);
    card.appendChild(content);

    return card;
}

// --- Helper Functions ---

/**
 * Mendapatkan tanggal Senin dari minggu tertentu (ISO Date string).
 * @param {Date} d - Objek tanggal.
 * @returns {string} String ISO "YYYY-MM-DD" dari hari Senin.
 */
function getWeekStartDate(d) {
    const date = new Date(d.getTime());
    const day = date.getUTCDay();
    const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1); // Minggu = 0
    const monday = new Date(date.setUTCDate(diff));
    monday.setUTCHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
}

/**
 * Mendapatkan nomor minggu ISO 8601.
 * @param {Date} d - Objek tanggal.
 * @returns {number} Nomor minggu.
 */
function getWeekNumber(d) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

/**
 * Format tanggal untuk ditampilkan.
 * @param {Date} date - Objek tanggal.
 * @returns {string} String format "DD Mon YYYY".
 */
function formatDateForDisplay(date) {
    // Gunakan UTC agar konsisten
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
    });
}
