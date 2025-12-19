let allArticles = [];
let articlesByCat = {};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('artikel.json');
        articlesByCat = await response.json();
        
        for (const cat in articlesByCat) {
            articlesByCat[cat].forEach(item => {
                allArticles.push({
                    title: item[0], url: item[1], image: item[2],
                    date: new Date(item[3]), desc: item[4], category: cat
                });
            });
        }
        allArticles.sort((a, b) => b.date - a.date);

        initFilters();
        renderDefault();
        
        document.getElementById('filter-year').addEventListener('change', handleYearChange);
        document.getElementById('filter-month').addEventListener('change', applyFilters);
        document.getElementById('filter-category').addEventListener('change', applyFilters);
    } catch (e) { console.error("Data error", e); }
});

function renderGrid(articles, container) {
    container.innerHTML = '';
    articles.forEach(a => {
        // SELURUH KARTU ADALAH LINK (<a>)
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

// ... (Fungsi initFilters, handleYearChange, applyFilters, renderDefault tetap sama seperti sebelumnya) ...

function initFilters() {
    const yearSelect = document.getElementById('filter-year');
    const catSelect = document.getElementById('filter-category');
    const years = [...new Set(allArticles.map(a => a.date.getFullYear()))].sort((a,b) => b-a);
    years.forEach(y => yearSelect.innerHTML += `<option value="${y}">${y}</option>`);
    const cats = Object.keys(articlesByCat).sort();
    cats.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
}

function handleYearChange() {
    const year = document.getElementById('filter-year').value;
    const monthSelect = document.getElementById('filter-month');
    monthSelect.innerHTML = '<option value="all">Semua Bulan</option>';
    if (year === 'all') { monthSelect.disabled = true; } 
    else {
        monthSelect.disabled = false;
        const availableMonths = [...new Set(allArticles.filter(a => a.date.getFullYear().toString() === year).map(a => a.date.getMonth()))].sort((a,b) => a-b);
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        availableMonths.forEach(m => { monthSelect.innerHTML += `<option value="${m}">${monthNames[m]}</option>`; });
    }
    applyFilters();
}

function applyFilters() {
    const year = document.getElementById('filter-year').value;
    const month = document.getElementById('filter-month').value;
    const cat = document.getElementById('filter-category').value;
    const isFilterActive = year !== 'all' || cat !== 'all';
    
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

// Logika Dark Mode
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
if (localStorage.getItem('theme')) body.classList.add(localStorage.getItem('theme'));
themeToggle.addEventListener('click', () => {
    const newTheme = body.classList.contains('dark-mode') ? 'light-mode' : 'dark-mode';
    body.classList.remove('light-mode', 'dark-mode');
    body.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
});
