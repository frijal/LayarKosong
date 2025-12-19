let allArticles = [];
let articlesByCat = {};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('artikel.json');
        const data = await response.json();
        articlesByCat = data;
        
        // 1. Proses data untuk keperluan Filter
        for (const cat in articlesByCat) {
            articlesByCat[cat].forEach(item => {
                allArticles.push({
                    title: item[0], url: item[1], image: item[2],
                    date: new Date(item[3]), desc: item[4], category: cat
                });
            });
        }
        allArticles.sort((a, b) => b.date - a.date);

        // 2. Jalankan Inisialisasi
        initFilters();
        renderDefault();
        initFloatingSearch(data); // Inisialisasi fitur cari dari Mas Frijal
        
        // 3. Pasang Event Listeners (PENTING: Pastikan ID sesuai di HTML)
        document.getElementById('filter-year').addEventListener('change', handleYearChange);
        document.getElementById('filter-month').addEventListener('change', applyFilters);
        document.getElementById('filter-category').addEventListener('change', applyFilters);
        
        const btnReset = document.getElementById('btn-reset');
        if(btnReset) {
            btnReset.addEventListener('click', resetAllFilters);
        }

    } catch (e) { console.error("Data error", e); }
});

/* ==========================================
   LOGIKA FILTER & GRID
   ========================================== */
function renderGrid(articles, container) {
    container.innerHTML = '';
    articles.forEach(a => {
        const card = document.createElement('a');
        card.className = 'article-card';
        card.href = `artikel/${a.url}`; 
        card.setAttribute('title', `Baca: ${a.title}`);
        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${a.image}" alt="${a.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/320x180?text=Layar+Kosong'">
            </div>
            <div class="card-content">
                <div class="card-meta">
                    <span class="category">${a.category}</span>
                    <span class="date">${a.date.toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</span>
                </div>
                <h3>${a.title}</h3>
                <p class="card-description">${a.desc}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

function initFilters() {
    const yearSelect = document.getElementById('filter-year');
    const years = [...new Set(allArticles.map(a => a.date.getFullYear()))].sort((a,b) => b-a);
    yearSelect.innerHTML = '<option value="all">Semua Tahun</option>';
    years.forEach(y => yearSelect.innerHTML += `<option value="${y}">${y}</option>`);
    updateCategoryDropdown(allArticles);
}

function handleYearChange() {
    const year = document.getElementById('filter-year').value;
    const monthSelect = document.getElementById('filter-month');
    monthSelect.innerHTML = '<option value="all">Semua Bulan</option>';
    
    if (year === 'all') {
        monthSelect.disabled = true;
        updateCategoryDropdown(allArticles);
    } else {
        monthSelect.disabled = false;
        const filteredByYear = allArticles.filter(a => a.date.getFullYear().toString() === year);
        const availableMonths = [...new Set(filteredByYear.map(a => a.date.getMonth()))].sort((a,b) => a-b);
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        availableMonths.forEach(m => {
            monthSelect.innerHTML += `<option value="${m}">${monthNames[m]}</option>`;
        });
        updateCategoryDropdown(filteredByYear);
    }
    applyFilters();
}

function updateCategoryDropdown(dataSumber) {
    const catSelect = document.getElementById('filter-category');
    const selectedCat = catSelect.value;
    const availableCats = [...new Set(dataSumber.map(a => a.category))].sort();
    catSelect.innerHTML = '<option value="all">Semua Kategori</option>';
    availableCats.forEach(c => {
        catSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });
    if (availableCats.includes(selectedCat)) catSelect.value = selectedCat;
}

function applyFilters() {
    const year = document.getElementById('filter-year').value;
    const month = document.getElementById('filter-month').value;
    const cat = document.getElementById('filter-category').value;
    const isFilterActive = year !== 'all' || month !== 'all' || cat !== 'all';
    
    document.getElementById('default-view').classList.toggle('hidden', isFilterActive);
    document.getElementById('filtered-view').classList.toggle('hidden', !isFilterActive);

    if (isFilterActive) {
        const filtered = allArticles.filter(a => {
            const matchYear = year === 'all' || a.date.getFullYear().toString() === year;
            const matchMonth = month === 'all' || a.date.getMonth().toString() === month;
            const matchCat = cat === 'all' || a.category === cat;
            return matchYear && matchMonth && matchCat;
        });
        renderGrid(filtered, document.getElementById('filtered-grid'));
        
        const info = document.getElementById('filter-info');
        info.classList.remove('hidden');
        info.innerHTML = `Ditemukan <strong>${filtered.length}</strong> artikel.`;
    }
}

function renderDefault() {
    const top6 = allArticles.slice(0, 6);
    renderGrid(top6, document.getElementById('global-grid'));
    const displayedUrls = new Set(top6.map(a => a.url));
    const container = document.getElementById('category-sections');
    container.innerHTML = '';
    
    Object.keys(articlesByCat).sort().forEach(c => {
        const catArticles = allArticles.filter(a => a.category === c && !displayedUrls.has(a.url)).slice(0, 6);
        if (catArticles.length > 0) {
            const sec = document.createElement('section');
            sec.innerHTML = `<h2>${c}</h2>`;
            const grid = document.createElement('div');
            grid.className = 'article-grid';
            renderGrid(catArticles, grid);
            sec.appendChild(grid);
            container.appendChild(sec);
        }
    });
}

/* ==========================================
   TOMBOL RESET (KHUSUS DROPDOWN)
   ========================================== */
function resetAllFilters() {
    document.getElementById('filter-year').value = 'all';
    document.getElementById('filter-month').value = 'all';
    document.getElementById('filter-month').disabled = true;
    
    updateCategoryDropdown(allArticles);
    document.getElementById('filter-category').value = 'all';

    document.getElementById('filter-info').classList.add('hidden');
    document.getElementById('default-view').classList.remove('hidden');
    document.getElementById('filtered-view').classList.add('hidden');
    
    console.log("Filter Dropdown direset! Kolom cari aman.");
}

/* ==========================================
   TEMA DARK MODE
   ========================================== */
const themeToggle = document.getElementById('theme-toggle');
if (localStorage.getItem('theme')) document.body.classList.add(localStorage.getItem('theme'));
themeToggle.addEventListener('click', () => {
    const newTheme = document.body.classList.contains('dark-mode') ? 'light-mode' : 'dark-mode';
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
});
