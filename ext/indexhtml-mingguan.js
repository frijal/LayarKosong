async function loadArticles() {
    try {
        const response = await fetch('artikel.json');
        const data = await response.json();
        
        let allArticles = [];
        let displayedIds = new Set(); // Untuk melacak artikel yang sudah tampil

        // 1. Gabungkan semua artikel dari setiap kategori ke satu array besar
        for (const category in data) {
            data[category].forEach(item => {
                allArticles.push({
                    title: item[0],
                    url: item[1],
                    thumbnail: item[2],
                    date: new Date(item[3]),
                    desc: item[4],
                    category: category
                });
            });
        }

        // Urutkan berdasarkan tanggal terbaru
        allArticles.sort((a, b) => b.date - a.date);

        // 2. Tampilkan 6 Artikel Terbaru Global
        const globalGrid = document.getElementById('global-grid');
        const latestGlobal = allArticles.slice(0, 6);
        
        latestGlobal.forEach(art => {
            globalGrid.appendChild(createCard(art));
            displayedIds.add(art.url); // Simpan URL sebagai ID unik
        });

        // 3. Tampilkan 6 Artikel Terbaru per Kategori (yang belum tampil)
        const container = document.getElementById('category-sections');
        
        for (const category in data) {
            // Filter artikel dalam kategori ini yang belum muncul di Global
            const categoryArticles = data[category]
                .map(item => ({
                    title: item[0],
                    url: item[1],
                    thumbnail: item[2],
                    date: new Date(item[3]),
                    desc: item[4]
                }))
                .filter(art => !displayedIds.has(art.url)) // Cek duplikat
                .slice(0, 6); // Ambil 6 saja

            if (categoryArticles.length > 0) {
                const section = document.createElement('section');
                section.innerHTML = `<h2>Kategori: ${category}</h2>`;
                
                const grid = document.createElement('div');
                grid.className = 'article-grid';
                
                categoryArticles.forEach(art => {
                    grid.appendChild(createCard(art));
                });
                
                section.appendChild(grid);
                container.appendChild(section);
            }
        }

    } catch (error) {
        console.error("Gagal memuat data artikel:", error);
    }
}

function createCard(article) {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.innerHTML = `
        <img src="${article.thumbnail}" alt="${article.title}">
        <div class="card-content">
            <h3>${article.title}</h3>
            <p>${article.desc}</p>
        </div>
    `;
    return card;
}

loadArticles();

let allArticles = [];
let articlesByCat = {};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('artikel.json');
        articlesByCat = await response.json();
        
        // Flatten data untuk memudahkan pencarian
        for (const cat in articlesByCat) {
            articlesByCat[cat].forEach(item => {
                allArticles.push({
                    title: item[0],
                    url: item[1],
                    image: item[2],
                    date: new Date(item[3]),
                    desc: item[4],
                    category: cat
                });
            });
        }
        allArticles.sort((a, b) => b.date - a.date);

        initFilters();
        renderDefault();
        
        // Listeners
        document.getElementById('search-input').addEventListener('input', applyFilters);
        document.getElementById('filter-year').addEventListener('change', handleYearChange);
        document.getElementById('filter-month').addEventListener('change', applyFilters);
        document.getElementById('filter-category').addEventListener('change', applyFilters);

    } catch (e) { console.error("Data error", e); }
});

function initFilters() {
    const yearSelect = document.getElementById('filter-year');
    const catSelect = document.getElementById('filter-category');
    
    // Isi Tahun Unik
    const years = [...new Set(allArticles.map(a => a.date.getFullYear()))].sort((a,b) => b-a);
    years.forEach(y => yearSelect.innerHTML += `<option value="${y}">${y}</option>`);

    // Isi Kategori Unik
    const cats = Object.keys(articlesByCat).sort();
    cats.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
}

function handleYearChange() {
    const year = document.getElementById('filter-year').value;
    const monthSelect = document.getElementById('filter-month');
    
    monthSelect.innerHTML = '<option value="all">Semua Bulan</option>';
    
    if (year === 'all') {
        monthSelect.disabled = true;
    } else {
        monthSelect.disabled = false;
        // Cascading: Ambil bulan yang hanya ada di tahun terpilih
        const availableMonths = [...new Set(allArticles
            .filter(a => a.date.getFullYear().toString() === year)
            .map(a => a.date.getMonth())
        )].sort((a,b) => a-b);

        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        availableMonths.forEach(m => {
            monthSelect.innerHTML += `<option value="${m}">${monthNames[m]}</option>`;
        });
    }
    applyFilters();
}

function applyFilters() {
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    const year = document.getElementById('filter-year').value;
    const month = document.getElementById('filter-month').value;
    const cat = document.getElementById('filter-category').value;

    const isFilterActive = searchQuery || year !== 'all' || cat !== 'all';
    
    const defView = document.getElementById('default-view');
    const filView = document.getElementById('filtered-view');
    const filGrid = document.getElementById('filtered-grid');

    if (!isFilterActive) {
        defView.classList.remove('hidden');
        filView.classList.add('hidden');
        return;
    }

    defView.classList.add('hidden');
    filView.classList.remove('hidden');

    const filtered = allArticles.filter(a => {
        const matchSearch = a.title.toLowerCase().includes(searchQuery);
        const matchYear = year === 'all' || a.date.getFullYear().toString() === year;
        const matchMonth = month === 'all' || a.date.getMonth().toString() === month;
        const matchCat = cat === 'all' || a.category === cat;
        return matchSearch && matchYear && matchMonth && matchCat;
    });

    renderGrid(filtered, filGrid);
    updateFilterInfo(filtered.length);
}

function updateFilterInfo(count) {
    const info = document.getElementById('filter-info');
    info.classList.remove('hidden');
    info.innerHTML = `Ditemukan <strong>${count}</strong> artikel yang sesuai kriteria kamu.`;
    if (count === 0) info.innerHTML = "Yah, artikelnya nggak ketemu nih, Mas. Coba ganti filternya. 😔";
}

function renderDefault() {
    const globalGrid = document.getElementById('global-grid');
    const catSections = document.getElementById('category-sections');
    
    const top6 = allArticles.slice(0, 6);
    renderGrid(top6, globalGrid);

    const displayedUrls = new Set(top6.map(a => a.url));

    Object.keys(articlesByCat).sort().forEach(c => {
        const catArticles = allArticles
            .filter(a => a.category === c && !displayedUrls.has(a.url))
            .slice(0, 6);

        if (catArticles.length > 0) {
            const sec = document.createElement('section');
            sec.innerHTML = `<h2>${c}</h2>`;
            const grid = document.createElement('div');
            grid.className = 'article-grid';
            renderGrid(catArticles, grid);
            sec.appendChild(grid);
            catSections.appendChild(sec);
        }
    });
}

function renderGrid(articles, container) {
    container.innerHTML = '';
    articles.forEach(a => {
        const card = document.createElement('a');
        card.className = 'article-card';
        card.href = `artikel/${a.url}`;
        card.innerHTML = `
            <img src="${a.image}" alt="${a.title}" onerror="this.src='https://via.placeholder.com/320x180?text=Layar+Kosong'">
            <div class="card-content">
                <div class="card-meta"><small>${a.category}</small> | <small>${a.date.toLocaleDateString('id-ID')}</small></div>
                <h3>${a.title}</h3>
                <p class="card-description">${a.desc}</p>
            </div>
        `;
        container.appendChild(card);
    });
}
