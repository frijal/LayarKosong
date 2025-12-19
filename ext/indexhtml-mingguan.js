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
    
    // Isi Tahun Unik dari data
    const years = [...new Set(allArticles.map(a => a.date.getFullYear()))].sort((a,b) => b-a);
    yearSelect.innerHTML = '<option value="all">Semua Tahun</option>';
    years.forEach(y => yearSelect.innerHTML += `<option value="${y}">${y}</option>`);

    // Inisialisasi dropdown kategori pertama kali
    updateCategoryDropdown(allArticles);
}

function handleYearChange() {
    const year = document.getElementById('filter-year').value;
    const monthSelect = document.getElementById('filter-month');
    
    monthSelect.innerHTML = '<option value="all">Semua Bulan</option>';
    
    if (year === 'all') {
        monthSelect.disabled = true;
        // Jika tahun direset, kategori tampilkan semua yang ada di data
        updateCategoryDropdown(allArticles);
    } else {
        monthSelect.disabled = false;
        
        // Filter artikel berdasarkan tahun terpilih untuk cari bulan & kategori yang tersedia
        const filteredByYear = allArticles.filter(a => a.date.getFullYear().toString() === year);
        
        // Update Dropdown Bulan (Cascading)
        const availableMonths = [...new Set(filteredByYear.map(a => a.date.getMonth()))].sort((a,b) => a-b);
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        availableMonths.forEach(m => {
            monthSelect.innerHTML += `<option value="${m}">${monthNames[m]}</option>`;
        });

        // Update Dropdown Kategori (Cascading berdasarkan Tahun)
        updateCategoryDropdown(filteredByYear);
    }
    applyFilters();
}

// Fungsi baru untuk Cascading Kategori
function updateCategoryDropdown(dataSumber) {
    const catSelect = document.getElementById('filter-category');
    const selectedCat = catSelect.value; // Simpan pilihan user sementara
    
    // Ambil kategori unik dari data yang sudah difilter tahun/bulan
    const availableCats = [...new Set(dataSumber.map(a => a.category))].sort();
    
    catSelect.innerHTML = '<option value="all">Semua Kategori</option>';
    availableCats.forEach(c => {
        catSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });

    // Kembalikan pilihan user jika kategori tersebut masih tersedia di list baru
    if (availableCats.includes(selectedCat)) {
        catSelect.value = selectedCat;
    }
}

function applyFilters() {
    const year = document.getElementById('filter-year').value;
    const month = document.getElementById('filter-month').value;
    const cat = document.getElementById('filter-category').value;

    const isFilterActive = year !== 'all' || month !== 'all' || cat !== 'all';
    
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

    // Proses filtering final
    const filtered = allArticles.filter(a => {
        const matchYear = year === 'all' || a.date.getFullYear().toString() === year;
        const matchMonth = month === 'all' || a.date.getMonth().toString() === month;
        const matchCat = cat === 'all' || a.category === cat;
        return matchYear && matchMonth && matchCat;
    });

    // Jika user sedang pilih bulan, kita persempit lagi kategori yang muncul di dropdown
    if (month !== 'all') {
        const filteredByMonth = allArticles.filter(a => 
            a.date.getFullYear().toString() === year && 
            a.date.getMonth().toString() === month
        );
        updateCategoryDropdown(filteredByMonth);
    }

    renderGrid(filtered, filGrid);
    updateFilterInfo(filtered.length);
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

function resetAllFilters() {
    document.getElementById('filter-year').value = 'all';
    document.getElementById('filter-month').value = 'all';
    document.getElementById('filter-month').disabled = true;
    
    // Reset kategori ke seluruh data
    updateCategoryDropdown(allArticles);
    document.getElementById('filter-category').value = 'all';
    document.getElementById('filter-info').classList.add('hidden');
    document.getElementById('default-view').classList.remove('hidden');
    document.getElementById('filtered-view').classList.add('hidden');
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
