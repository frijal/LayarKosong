// Data artikel dari file JSON
let allArticles = [];
let categories = [];
let archives = {};
let currentPage = 1;
let articlesPerPage = 12;
let currentFilter = { category: null, year: null, month: null, search: null };

// Fungsi untuk memuat dan memproses data
async function loadArticles() {
    try {
        const response = await fetch('artikel.json');
        const data = await response.json();
        
        // Transform data ke format yang lebih mudah diproses
        allArticles = [];
        categories = Object.keys(data);
        
        // Proses setiap kategori
        categories.forEach(category => {
            data[category].forEach(article => {
                const [title, slug, imageUrl, dateStr, summary] = article;
                const date = new Date(dateStr);
                const year = date.getFullYear();
                const month = date.getMonth() + 1; // 1-12
                
                allArticles.push({
                    title,
                    slug,
                    imageUrl,
                    date,
                    dateStr,
                    summary: summary.length > 150 ? summary.substring(0, 150) + '...' : summary,
                    category,
                    year,
                    month,
                    monthName: getMonthName(month)
                });
            });
        });
        
        // Urutkan artikel berdasarkan tanggal (terbaru dulu)
        allArticles.sort((a, b) => b.date - a.date);
        
        // Bangun struktur arsip
        buildArchives();
        
        // Render halaman
        renderCategories();
        renderArchives();
        renderArticles();
        hideLoader();
        
    } catch (error) {
        console.error('Error loading articles:', error);
        document.getElementById('article-grid').innerHTML = 
            '<div class="error-message"><p>Gagal memuat artikel. Silakan coba lagi nanti.</p></div>';
        hideLoader();
    }
}

// Fungsi untuk mendapatkan nama bulan
function getMonthName(month) {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month - 1];
}

// Bangun struktur arsip per tahun/bulan
function buildArchives() {
    archives = {};
    
    allArticles.forEach(article => {
        const year = article.year;
        const month = article.month;
        
        if (!archives[year]) {
            archives[year] = {
                count: 0,
                months: {}
            };
        }
        
        archives[year].count++;
        
        if (!archives[year].months[month]) {
            archives[year].months[month] = {
                name: getMonthName(month),
                count: 0
            };
        }
        
        archives[year].months[month].count++;
    });
}

// Render kategori
function renderCategories() {
    const container = document.getElementById('category-filter');
    if (!container) return;
    
    // Tambahkan "Semua Kategori"
    let html = '<button class="category-btn active" data-category="all">Semua Kategori</button>';
    
    categories.forEach(category => {
        const count = allArticles.filter(a => a.category === category).length;
        html += `<button class="category-btn" data-category="${category}">${category} (${count})</button>`;
    });
    
    container.innerHTML = html;
    
    // Tambahkan event listener
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentFilter.category = btn.dataset.category === 'all' ? null : btn.dataset.category;
            currentPage = 1;
            renderArticles();
            updateArchiveSelection();
        });
    });
}

// Render arsip
function renderArchives() {
    const yearContainer = document.getElementById('year-filter');
    const monthContainer = document.getElementById('month-filter');
    
    if (!yearContainer || !monthContainer) return;
    
    // Render tahun
    let yearHtml = '<option value="all">Semua Tahun</option>';
    Object.keys(archives).sort((a, b) => b - a).forEach(year => {
        yearHtml += `<option value="${year}">${year} (${archives[year].count})</option>`;
    });
    yearContainer.innerHTML = yearHtml;
    
    // Render bulan (akan diupdate berdasarkan tahun yang dipilih)
    updateMonthFilter();
    
    // Event listener untuk filter tahun
    yearContainer.addEventListener('change', () => {
        currentFilter.year = yearContainer.value === 'all' ? null : parseInt(yearContainer.value);
        currentPage = 1;
        updateMonthFilter();
        renderArticles();
    });
    
    // Event listener untuk filter bulan
    monthContainer.addEventListener('change', () => {
        currentFilter.month = monthContainer.value === 'all' ? null : parseInt(monthContainer.value);
        currentPage = 1;
        renderArticles();
    });
}

// Update filter bulan berdasarkan tahun yang dipilih
function updateMonthFilter() {
    const monthContainer = document.getElementById('month-filter');
    
    let monthHtml = '<option value="all">Semua Bulan</option>';
    
    if (currentFilter.year && archives[currentFilter.year]) {
        const months = archives[currentFilter.year].months;
        Object.keys(months).sort((a, b) => b - a).forEach(month => {
            monthHtml += `<option value="${month}">${months[month].name} (${months[month].count})</option>`;
        });
    }
    
    monthContainer.innerHTML = monthHtml;
    monthContainer.disabled = !currentFilter.year;
}

// Update seleksi arsip berdasarkan filter aktif
function updateArchiveSelection() {
    const yearSelect = document.getElementById('year-filter');
    const monthSelect = document.getElementById('month-filter');
    
    if (currentFilter.year) {
        yearSelect.value = currentFilter.year;
        updateMonthFilter();
        
        if (currentFilter.month) {
            monthSelect.value = currentFilter.month;
        } else {
            monthSelect.value = 'all';
        }
    } else {
        yearSelect.value = 'all';
        monthSelect.value = 'all';
        monthSelect.disabled = true;
    }
}

// Render artikel dengan pagination
function renderArticles() {
    const container = document.getElementById('article-grid');
    const pagination = document.getElementById('pagination');
    
    if (!container || !pagination) return;
    
    // Filter artikel berdasarkan kriteria
    let filteredArticles = allArticles.filter(article => {
        // Filter kategori
        if (currentFilter.category && article.category !== currentFilter.category) {
            return false;
        }
        
        // Filter tahun
        if (currentFilter.year && article.year !== currentFilter.year) {
            return false;
        }
        
        // Filter bulan
        if (currentFilter.month && article.month !== currentFilter.month) {
            return false;
        }
        
        // Filter pencarian
        if (currentFilter.search) {
            const searchTerm = currentFilter.search.toLowerCase();
            const titleMatch = article.title.toLowerCase().includes(searchTerm);
            const summaryMatch = article.summary.toLowerCase().includes(searchTerm);
            const categoryMatch = article.category.toLowerCase().includes(searchTerm);
            
            if (!titleMatch && !summaryMatch && !categoryMatch) {
                return false;
            }
        }
        
        return true;
    });
    
    // Hitung total halaman
    const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
    
    // Batasi halaman saat ini agar tidak melebihi total halaman
    if (currentPage > totalPages) {
        currentPage = totalPages > 0 ? totalPages : 1;
    }
    
    // Ambil artikel untuk halaman saat ini
    const startIndex = (currentPage - 1) * articlesPerPage;
    const endIndex = startIndex + articlesPerPage;
    const articlesToShow = filteredArticles.slice(startIndex, endIndex);
    
    // Render artikel
    if (articlesToShow.length === 0) {
        container.innerHTML = '<div class="no-results"><p>Tidak ada artikel yang sesuai dengan filter yang dipilih.</p></div>';
    } else {
        let html = '';
        
        articlesToShow.forEach((article, index) => {
            // Tambahkan animasi fade-in dengan delay bertahap
            const delay = index * 0.1;
            
            html += `
                <article class="article-card" style="animation-delay: ${delay}s">
                    <div class="article-image">
                        <img src="${article.imageUrl}" alt="${article.title}" loading="lazy">
                        <span class="article-category">${article.category}</span>
                    </div>
                    <div class="article-content">
                        <div class="article-meta">
                            <time datetime="${article.date.toISOString()}">
                                ${article.date.toLocaleDateString('id-ID', { 
                                    day: 'numeric', 
                                    month: 'long', 
                                    year: 'numeric' 
                                })}
                            </time>
                            <span>•</span>
                            <span>${article.monthName} ${article.year}</span>
                        </div>
                        <h2 class="article-title">${article.title}</h2>
                        <p class="article-summary">${article.summary}</p>
                        <a href="${article.slug}" class="read-more">Baca Selengkapnya</a>
                    </div>
                </article>
            `;
        });
        
        container.innerHTML = html;
    }
    
    // Render pagination
    renderPagination(totalPages, pagination);
    
    // Update info hasil filter
    updateFilterInfo(filteredArticles.length);
}

// Render pagination
function renderPagination(totalPages, container) {
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Tombol previous
    html += `<button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
              ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                Sebelumnya
            </button>`;
    
    // Tampilkan halaman 1, halaman saat ini, dan halaman terakhir
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Sesuaikan jika tidak cukup halaman
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Halaman pertama jika tidak terlihat
    if (startPage > 1) {
        html += `<button class="pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // Halaman yang terlihat
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    
    // Halaman terakhir jika tidak terlihat
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
        html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    // Tombol next
    html += `<button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
              ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
                Berikutnya
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </button>`;
    
    container.innerHTML = html;
    
    // Tambahkan event listener untuk tombol pagination
    container.querySelectorAll('.pagination-btn:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.page) {
                currentPage = parseInt(btn.dataset.page);
                renderArticles();
                
                // Scroll ke atas grid artikel
                const articleGrid = document.getElementById('article-grid');
                if (articleGrid) {
                    articleGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
}

// Update informasi filter
function updateFilterInfo(count) {
    const infoElement = document.getElementById('filter-info');
    if (!infoElement) return;
    
    let infoText = `Menampilkan ${count} artikel`;
    
    if (currentFilter.category) {
        infoText += ` dalam kategori "${currentFilter.category}"`;
    }
    
    if (currentFilter.year) {
        infoText += ` pada tahun ${currentFilter.year}`;
        
        if (currentFilter.month) {
            infoText += ` bulan ${getMonthName(currentFilter.month)}`;
        }
    }
    
    if (currentFilter.search) {
        infoText += ` untuk pencarian "${currentFilter.search}"`;
    }
    
    infoElement.textContent = infoText;
    
    // Tampilkan tombol reset jika ada filter aktif
    const resetBtn = document.getElementById('reset-filter');
    if (resetBtn) {
        const hasActiveFilter = currentFilter.category || currentFilter.year || currentFilter.month || currentFilter.search;
        resetBtn.style.display = hasActiveFilter ? 'inline-block' : 'none';
    }
}

// Reset semua filter
function resetFilters() {
    // Reset filter
    currentFilter = { category: null, year: null, month: null, search: null };
    currentPage = 1;
    
    // Reset UI
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === 'all');
    });
    
    document.getElementById('year-filter').value = 'all';
    document.getElementById('month-filter').value = 'all';
    document.getElementById('month-filter').disabled = true;
    document.getElementById('search-input').value = '';
    
    // Render ulang
    renderArticles();
}

// Skeleton loader
function showLoader() {
    const container = document.getElementById('article-grid');
    if (!container) return;
    
    let html = '';
    for (let i = 0; i < articlesPerPage; i++) {
        html += `
            <div class="article-card skeleton">
                <div class="article-image skeleton-item"></div>
                <div class="article-content">
                    <div class="article-meta skeleton-item" style="width: 40%"></div>
                    <h2 class="article-title skeleton-item" style="width: 90%"></h2>
                    <p class="article-summary">
                        <span class="skeleton-item" style="width: 100%"></span>
                        <span class="skeleton-item" style="width: 80%"></span>
                        <span class="skeleton-item" style="width: 60%"></span>
                    </p>
                    <div class="read-more skeleton-item" style="width: 30%"></div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function hideLoader() {
    // Artikel sudah dirender oleh renderArticles()
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Tampilkan skeleton loader
    showLoader();
    
    // Setup event listener untuk pencarian
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    if (searchInput) {
        // Pencarian saat tombol ditekan
        searchBtn.addEventListener('click', () => {
            currentFilter.search = searchInput.value.trim();
            currentPage = 1;
            renderArticles();
        });
        
        // Pencarian saat tekan Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                currentFilter.search = searchInput.value.trim();
                currentPage = 1;
                renderArticles();
            }
        });
    }
    
    // Setup tombol reset filter
    const resetBtn = document.getElementById('reset-filter');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
    
    // Setup toggle sidebar di mobile
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
        });
        
        // Tutup sidebar saat klik di luar di mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    // Setup dark/light mode toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Cek preferensi sistem
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Cek apakah ada preferensi yang disimpan
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (prefersDark.matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        // Update ikon toggle
        updateThemeIcon();
        
        // Toggle tema saat tombol ditekan
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon();
        });
    }
    
    // Muat artikel
    loadArticles();
    
    // Update tahun hak cipta
    document.getElementById('current-year').textContent = new Date().getFullYear();
});

// Update ikon tema
function updateThemeIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const icon = themeToggle.querySelector('.theme-icon');
    
    if (icon) {
        if (currentTheme === 'dark') {
            icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        } else {
            icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        }
    }
}
