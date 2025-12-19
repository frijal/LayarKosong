/**
 * File: js/index.js
 * Sinkronisasi dengan CSS Layar Kosong (Modern Dark/Light Mode)
 */

document.addEventListener('DOMContentLoaded', main);

let allArticles = []; 
let originalJsonData = {}; 

async function main() {
    const defaultView = document.getElementById('default-view');
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

        // Hilangkan loading
        if (loadingMessage) loadingMessage.classList.add('hidden');

        // Event Listeners
        document.getElementById('category-filter').addEventListener('change', handleCategoryChange);
        document.getElementById('week-filter').addEventListener('change', applyFilters);

    } catch (error) {
        console.error("Error:", error);
        if (defaultView) {
            defaultView.innerHTML = `<p style="text-align:center; color:var(--text-muted);">Gagal memuat artikel. Periksa koneksi atau file artikel.json.</p>`;
        }
    }
}

function processArticles(jsonData) {
    const articles = [];
    for (const [category, articleList] of Object.entries(jsonData)) {
        articleList.forEach(article => {
            articles.push({
                title: article[0], url: article[1], image: article[2],
                date: new Date(article[3]), description: article[4],
                category: category
            });
        });
    }
    return articles.sort((a, b) => b.date - a.date);
}

// Mengisi dropdown Kategori
function populateCategoryFilter(jsonData) {
    const categorySelect = document.getElementById('category-filter');
    if(!categorySelect) return;
    
    Object.keys(jsonData).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

// Mengisi dropdown Minggu (Fix Regex Bug)
function populateWeekFilter(articles) {
    const weekSelect = document.getElementById('week-filter');
    if(!weekSelect) return;

    weekSelect.innerHTML = '<option value="all">Semua Minggu</option>'; 
    const weekMap = new Map();

    articles.forEach(article => {
        const weekStartISO = getWeekStartDate(article.date);
        if (!weekMap.has(weekStartISO)) {
            const weekStartDate = new Date(weekStartISO + 'T12:00:00Z');
            const weekNum = getWeekNumber(weekStartDate);
            weekMap.set(weekStartISO, `dari ${formatDateForDisplay(weekStartDate)}, minggu ke-${weekNum}`);
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

/**
 * Render Tampilan Utama
 * Sesuai dengan CSS: Menggunakan <section class="category-section">
 */
function renderDefaultView(allArticles, jsonData) {
    const defaultView = document.getElementById('default-view');
    if(!defaultView) return;
    defaultView.innerHTML = ''; 

    // 1. Section Terbaru (Limit 6)
    const top6Articles = allArticles.slice(0, 6);
    const top6Urls = new Set(top6Articles.map(a => a.url));

    const latestSection = createSectionElement('Terbaru ✨', top6Articles);
    defaultView.appendChild(latestSection);

    // 2. Section Per Kategori (Limit 6 per kategori)
    Object.keys(jsonData).sort().forEach(category => {
        const catArticles = allArticles
            .filter(a => a.category === category && !top6Urls.has(a.url))
            .slice(0, 6);

        if (catArticles.length > 0) {
            const catSection = createSectionElement(category, catArticles);
            defaultView.appendChild(catSection);
        }
    });
}

/**
 * Helper untuk membuat Section sesuai CSS Mas Frijal
 */
function createSectionElement(title, articles) {
    const section = document.createElement('section');
    section.className = 'category-section';
    
    const h2 = document.createElement('h2');
    h2.textContent = title;
    section.appendChild(h2);

    const grid = document.createElement('div');
    grid.className = 'article-grid';
    
    articles.forEach(article => {
        grid.appendChild(createCardElement(article));
    });

    section.appendChild(grid);
    return section;
}

function createCardElement(article) {
    const card = document.createElement('a');
    card.className = 'article-card';
    card.href = `artikel/${article.url}`;

    // Area Gambar (Sesuai request 320x180 via CSS)
    const img = document.createElement('img');
    img.src = article.image;
    img.alt = article.title;
    img.loading = 'lazy';
    img.onerror = function() { this.src = 'https://via.placeholder.com/320x180?text=No+Image'; };

    const content = document.createElement('div');
    content.className = 'card-content';

    const h3 = document.createElement('h3');
    h3.textContent = article.title;

    const p = document.createElement('p');
    p.textContent = article.description;

    content.appendChild(h3);
    content.appendChild(p);
    
    card.appendChild(img);
    card.appendChild(content);

    return card;
}

function applyFilters() {
    const categoryValue = document.getElementById('category-filter').value;
    const weekValue = document.getElementById('week-filter').value;
    const defaultView = document.getElementById('default-view');
    const filteredView = document.getElementById('filtered-view');

    if (categoryValue === 'all' && weekValue === 'all') {
        defaultView.classList.remove('hidden');
        filteredView.classList.add('hidden');
        updateFilterInfo([]);
        return;
    }

    defaultView.classList.add('hidden');
    filteredView.classList.remove('hidden');

    let filtered = allArticles;
    if (categoryValue !== 'all') filtered = filtered.filter(a => a.category === categoryValue);
    if (weekValue !== 'all') filtered = filtered.filter(a => getWeekStartDate(a.date) === weekValue);

    updateFilterInfo(filtered);
    
    // Render hasil filter ke dalam grid
    filteredView.innerHTML = '';
    const filterSection = createSectionElement('Hasil Filter', filtered);
    filteredView.appendChild(filterSection);
}

function updateFilterInfo(articlesToShow) {
    const infoElement = document.getElementById('filter-info');
    const weekSelect = document.getElementById('week-filter');
    if(!infoElement) return;

    if (weekSelect.value === 'all') {
        infoElement.classList.add('hidden');
        return;
    }

    infoElement.classList.remove('hidden');
    if (articlesToShow.length === 0) {
        infoElement.textContent = 'Tidak ada artikel untuk periode ini.';
        return;
    }

    const dates = articlesToShow.map(a => a.date.getTime());
    const minD = formatDateForDisplay(new Date(Math.min(...dates)));
    const maxD = formatDateForDisplay(new Date(Math.max(...dates)));
    
    const text = weekSelect.options[weekSelect.selectedIndex].text;
    const mMatch = text.match(/minggu ke-(\d+)/);
    const tMatch = text.match(/(\d{4})/);

    infoElement.innerHTML = `Terdeteksi <b>${articlesToShow.length} judul</b> dari tanggal ${minD} s.d ${maxD} (Minggu ke-${mMatch ? mMatch[1] : '?'}, ${tMatch ? tMatch[1] : ''})`;
}

// --- Native Helpers ---
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
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
