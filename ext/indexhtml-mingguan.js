/**
 * File: js/index.js
 * Deskripsi: Skrip canggih untuk memuat, memfilter, dan mempercantik
 * daftar artikel di index.html (Layar Kosong).
 */

document.addEventListener('DOMContentLoaded', main);

let allArticles = []; 
let originalJsonData = {}; 

async function main() {
    const container = document.getElementById('article-container');
    const loadingMessage = document.getElementById('loading-message');

    try {
        const response = await fetch('/artikel.json'); 
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        originalJsonData = await response.json();
        allArticles = processArticles(originalJsonData);

        populateCategoryFilter(originalJsonData);
        populateWeekFilter(allArticles); 

        // Render tampilan awal
        renderDefaultView(allArticles, originalJsonData);

        // Efek transisi halus saat loading selesai
        loadingMessage.style.opacity = '0';
        setTimeout(() => loadingMessage.classList.add('hidden'), 300);

        // Event Listeners
        document.getElementById('category-filter').addEventListener('change', handleCategoryChange);
        document.getElementById('week-filter').addEventListener('change', applyFilters);

    } catch (error) {
        console.error("Error:", error);
        loadingMessage.innerHTML = `<p class="error-msg">Gagal memuat data. Coba refresh halaman.</p>`;
    }
}

function processArticles(jsonData) {
    const articles = [];
    for (const [category, articleList] of Object.entries(jsonData)) {
        articleList.forEach(article => {
            articles.push({
                title: article[0],
                url: article[1],
                image: article[2],
                date: new Date(article[3]),
                description: article[4],
                category: category
            });
        });
    }
    return articles.sort((a, b) => b.date - a.date);
}

function populateCategoryFilter(jsonData) {
    const categorySelect = document.getElementById('category-filter');
    Object.keys(jsonData).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

function populateWeekFilter(articles) {
    const weekSelect = document.getElementById('week-filter');
    weekSelect.innerHTML = '<option value="all">Semua Minggu</option>'; 

    const weekMap = new Map();
    articles.forEach(article => {
        const weekStartISO = getWeekStartDate(article.date);
        if (!weekMap.has(weekStartISO)) {
            const weekStartDate = new Date(weekStartISO + 'T12:00:00Z');
            const weekNum = getWeekNumber(weekStartDate);
            // Format label yang konsisten
            weekMap.set(weekStartISO, `dari ${formatDateForDisplay(weekStartDate)}, pada minggu ke-${weekNum}`);
        }
    });

    [...weekMap.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .forEach(([iso, label]) => {
            const option = document.createElement('option');
            option.value = iso;
            option.textContent = label;
            weekSelect.appendChild(option);
        });
}

function handleCategoryChange() {
    const categoryValue = document.getElementById('category-filter').value;
    const articlesForWeekFilter = categoryValue === 'all' 
        ? allArticles 
        : allArticles.filter(a => a.category === categoryValue);

    populateWeekFilter(articlesForWeekFilter);
    applyFilters();
}

function renderDefaultView(allArticles, jsonData) {
    const defaultView = document.getElementById('default-view');
    defaultView.innerHTML = ''; 

    // 1. Top Section (Highlight)
    const top6Articles = allArticles.slice(0, 6);
    const top6Urls = new Set(top6Articles.map(a => a.url));

    const sectionTitle = document.createElement('h2');
    sectionTitle.textContent = 'Terbaru di Layar Kosong';
    sectionTitle.className = 'section-title fade-in';
    defaultView.appendChild(sectionTitle);

    const top6Grid = document.createElement('div');
    top6Grid.className = 'article-grid';
    renderArticles(top6Articles, top6Grid);
    defaultView.appendChild(top6Grid);

    // 2. Per Kategori
    for (const category of Object.keys(jsonData).sort()) {
        const otherArticles = allArticles
            .filter(a => a.category === category && !top6Urls.has(a.url))
            .slice(0, 6);

        if (otherArticles.length > 0) {
            const catTitle = document.createElement('h2');
            catTitle.innerHTML = `Lainnya di <span class="highlight-text">${category}</span>`;
            catTitle.className = 'section-title fade-in';
            defaultView.appendChild(catTitle);

            const categoryGrid = document.createElement('div');
            categoryGrid.className = 'article-grid';
            renderArticles(otherArticles, categoryGrid);
            defaultView.appendChild(categoryGrid);
        }
    }
}

function applyFilters() {
    const categoryValue = document.getElementById('category-filter').value;
    const weekValue = document.getElementById('week-filter').value;
    const defaultView = document.getElementById('default-view');
    const filteredView = document.getElementById('filtered-view');

    if (categoryValue === 'all' && weekValue === 'all') {
        defaultView.classList.remove('hidden');
        filteredView.classList.add('hidden');
        filteredView.innerHTML = '';
        updateFilterInfo([]); 
        return;
    }

    defaultView.classList.add('hidden');
    filteredView.classList.remove('hidden');

    let filteredArticles = allArticles;
    if (categoryValue !== 'all') filteredArticles = filteredArticles.filter(a => a.category === categoryValue);
    if (weekValue !== 'all') filteredArticles = filteredArticles.filter(a => getWeekStartDate(a.date) === weekValue);

    updateFilterInfo(filteredArticles);
    renderArticles(filteredArticles, filteredView);
}

function updateFilterInfo(articlesToShow) {
    const infoElement = document.getElementById('filter-info');
    const weekSelect = document.getElementById('week-filter');
    
    if (weekSelect.value === 'all') {
        infoElement.classList.add('hidden');
        return;
    }

    infoElement.classList.remove('hidden');
    
    if (articlesToShow.length === 0) {
        infoElement.innerHTML = '<span class="warning-text">Tidak ada artikel ditemukan untuk periode ini.</span>';
        return;
    }

    const dates = articlesToShow.map(a => a.date.getTime());
    const minDate = formatDateForDisplay(new Date(Math.min(...dates)));
    const maxDate = formatDateForDisplay(new Date(Math.max(...dates)));

    const selectedText = weekSelect.options[weekSelect.selectedIndex].text;
    
    // REGEX FIX SUDAH DITERAPKAN DI SINI
    const mingguMatch = selectedText.match(/minggu ke-(\d+)/);
    const tahunMatch = selectedText.match(/(\d{4})/);
    const minggu = mingguMatch ? mingguMatch[1] : '?';
    const tahun = tahunMatch ? tahunMatch[1] : '?';

    infoElement.innerHTML = `
        Terdapat <strong>${articlesToShow.length} judul</strong> artikel yang diunggah antara 
        <strong>${minDate}</strong> s.d. <strong>${maxDate}</strong> 
        (Minggu ke-${minggu}, Tahun ${tahun}).
    `;
}

function renderArticles(articles, container) {
    container.innerHTML = ''; 
    if (articles.length === 0) {
        container.innerHTML = '<div class="empty-state">Artikel tidak ditemukan 😔</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    
    // Kita gunakan index 'i' untuk mengatur delay animasi
    articles.forEach((article, i) => {
        const card = createCardElement(article, i);
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
}

function createCardElement(article, index) {
    const card = document.createElement('a');
    card.className = 'article-card';
    card.href = `artikel/${article.url}`;
    
    // Style animasi: Staggered delay (kartu muncul berurutan)
    // Delay maksimal dibatasi agar tidak terlalu lama menunggu
    const delay = Math.min(index * 50, 500); 
    card.style.animationDelay = `${delay}ms`;

    // Buat slug kategori untuk class CSS warna-warni (misal: "cat-ekonomi")
    const categorySlug = 'cat-' + article.category.toLowerCase().replace(/\s+/g, '-');

    // Image dengan handling error
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'card-image-wrapper';
    
    const img = document.createElement('img');
    img.src = article.image;
    img.alt = article.title;
    img.loading = 'lazy';
    img.onerror = function() { 
        this.src = 'https://via.placeholder.com/400x250?text=Layar+Kosong'; // Gambar cadangan
    };
    imgWrapper.appendChild(img);

    const content = document.createElement('div');
    content.className = 'card-content';

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    
    // Tambahkan class kategori spesifik
    meta.innerHTML = `
        <span class="category ${categorySlug}">${article.category}</span>
        <span class="date">${formatDateForDisplay(article.date)}</span>
    `;

    const title = document.createElement('h3');
    title.textContent = article.title;

    const description = document.createElement('p');
    description.className = 'card-description';
    // Potong deskripsi biar rapi (opsional, kalau CSS line-clamp gagal)
    description.textContent = article.description.length > 120 
        ? article.description.substring(0, 120) + '...' 
        : article.description;

    content.appendChild(meta);
    content.appendChild(title);
    content.appendChild(description);

    card.appendChild(imgWrapper);
    card.appendChild(content);

    return card;
}

// --- Helpers ---
function getWeekStartDate(d) {
    const date = new Date(d.getTime());
    const day = date.getUTCDay();
    const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setUTCDate(diff));
    monday.setUTCHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
}

function getWeekNumber(d) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function formatDateForDisplay(date) {
    return date.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
    });
}
