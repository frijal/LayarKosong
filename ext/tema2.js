// artikel-reader.js - Client-side Article Reader System
class LayarKosongReader {
    constructor() {
        this.articles = [];
        this.filteredArticles = [];
        this.currentPage = 1;
        this.itemsPerPage = 9;
        this.currentCategory = 'all';
        this.currentYear = 'all';
        this.currentMonth = 'all';
        this.searchQuery = '';
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        try {
            this.showLoader();
            await this.loadArticles();
            this.setupEventListeners();
            this.renderCategories();
            this.renderArchives();
            this.filterArticles();
        } catch (error) {
            console.error('Error initializing:', error);
            this.showError('Gagal memuat artikel. Silakan refresh halaman.');
        }
    }

    async loadArticles() {
        const response = await fetch('artikel.json');
        if (!response.ok) throw new Error('Failed to load articles');
        this.articles = await response.json();
        this.filteredArticles = [...this.articles];
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.filterArticles();
            });
        }

        // Category filter
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                this.currentCategory = e.target.dataset.category;
                this.updateActiveCategory(e.target);
                this.filterArticles();
            }
        });

        // Archive filter
        const yearSelect = document.getElementById('yearFilter');
        const monthSelect = document.getElementById('monthFilter');
        
        if (yearSelect) {
            yearSelect.addEventListener('change', (e) => {
                this.currentYear = e.target.value;
                this.updateMonthOptions();
                this.filterArticles();
            });
        }

        if (monthSelect) {
            monthSelect.addEventListener('change', (e) => {
                this.currentMonth = e.target.value;
                this.filterArticles();
            });
        }
    }

    renderCategories() {
        const container = document.getElementById('categoryFilter');
        if (!container) return;

        const categories = ['all', ...new Set(this.articles.map(a => a.category))];
        
        container.innerHTML = categories.map(cat => `
            <button class="category-btn ${cat === 'all' ? 'active' : ''}" 
                    data-category="${cat}">
                ${cat === 'all' ? 'Semua' : cat}
            </button>
        `).join('');
    }

    renderArchives() {
        const yearSelect = document.getElementById('yearFilter');
        if (!yearSelect) return;

        const years = ['all', ...new Set(this.articles.map(a => {
            const date = new Date(a.published_at);
            return date.getFullYear();
        })).sort((a, b) => b - a)];

        yearSelect.innerHTML = years.map(year => `
            <option value="${year}">${year === 'all' ? 'Semua Tahun' : year}</option>
        `).join('');

        this.updateMonthOptions();
    }

    updateMonthOptions() {
        const monthSelect = document.getElementById('monthFilter');
        if (!monthSelect) return;

        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                       'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        if (this.currentYear === 'all') {
            monthSelect.innerHTML = '<option value="all">Semua Bulan</option>';
            monthSelect.disabled = true;
            return;
        }

        monthSelect.disabled = false;
        const availableMonths = new Set(
            this.articles
                .filter(a => new Date(a.published_at).getFullYear() == this.currentYear)
                .map(a => new Date(a.published_at).getMonth())
        );

        monthSelect.innerHTML = '<option value="all">Semua Bulan</option>' +
            months.map((month, idx) => 
                availableMonths.has(idx) ? 
                `<option value="${idx}">${month}</option>` : ''
            ).join('');
    }

    filterArticles() {
        this.filteredArticles = this.articles.filter(article => {
            const matchesCategory = this.currentCategory === 'all' || 
                                   article.category === this.currentCategory;
            
            const articleDate = new Date(article.published_at);
            const matchesYear = this.currentYear === 'all' || 
                               articleDate.getFullYear() == this.currentYear;
            
            const matchesMonth = this.currentMonth === 'all' || 
                                articleDate.getMonth() == this.currentMonth;
            
            const matchesSearch = !this.searchQuery || 
                                 article.title.toLowerCase().includes(this.searchQuery) ||
                                 (article.excerpt && article.excerpt.toLowerCase().includes(this.searchQuery));

            return matchesCategory && matchesYear && matchesMonth && matchesSearch;
        });

        this.currentPage = 1;
        this.renderArticles();
        this.renderPagination();
        this.renderSidebar();
    }

    renderArticles() {
        const container = document.getElementById('articlesGrid');
        if (!container) return;

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageArticles = this.filteredArticles.slice(start, end);

        if (pageArticles.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <p>Tidak ada artikel yang ditemukan.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = pageArticles.map(article => this.createArticleCard(article)).join('');
        
        // Fade in animation
        setTimeout(() => {
            document.querySelectorAll('.article-card').forEach((card, idx) => {
                setTimeout(() => card.classList.add('fade-in'), idx * 50);
            });
        }, 10);
    }

    createArticleCard(article) {
        const date = new Date(article.published_at);
        const formattedDate = date.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });

        return `
            <article class="article-card">
                <a href="${article.url}" class="card-image">
                    <img src="${article.image || 'placeholder.jpg'}" 
                         alt="${article.title}"
                         loading="lazy">
                </a>
                <div class="card-content">
                    <span class="category-badge">${article.category}</span>
                    <h2 class="card-title">
                        <a href="${article.url}">${article.title}</a>
                    </h2>
                    <time class="card-date" datetime="${article.published_at}">
                        ${formattedDate}
                    </time>
                </div>
            </article>
        `;
    }

    renderSidebar() {
        const sidebar = document.getElementById('sidebarThumbnails');
        if (!sidebar) return;

        const recentArticles = [...this.filteredArticles]
            .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
            .slice(0, 8);

        sidebar.innerHTML = recentArticles.map(article => {
            const date = new Date(article.published_at);
            const formattedDate = date.toLocaleDateString('id-ID', { 
                day: 'numeric', 
                month: 'short' 
            });

            return `
                <a href="${article.url}" class="sidebar-item">
                    <img src="${article.image || 'placeholder.jpg'}" alt="${article.title}">
                    <div class="sidebar-content">
                        <h3>${article.title}</h3>
                        <time>${formattedDate}</time>
                    </div>
                </a>
            `;
        }).join('');
    }

    renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredArticles.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button class="page-btn" 
                    ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="reader.goToPage(${this.currentPage - 1})">
                ‹ Sebelumnya
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                paginationHTML += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                            onclick="reader.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
        }

        // Next button
        paginationHTML += `
            <button class="page-btn" 
                    ${this.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="reader.goToPage(${this.currentPage + 1})">
                Selanjutnya ›
            </button>
        `;

        container.innerHTML = paginationHTML;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredArticles.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderArticles();
        this.renderPagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateActiveCategory(activeBtn) {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    showLoader() {
        const container = document.getElementById('articlesGrid');
        if (!container) return;

        container.innerHTML = Array(6).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text short"></div>
                </div>
            </div>
        `).join('');
    }

    showError(message) {
        const container = document.getElementById('articlesGrid');
        if (container) {
            container.innerHTML = `<div class="error-message">${message}</div>`;
        }
    }
}

// Initialize when DOM is ready
let reader;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        reader = new LayarKosongReader();
    });
} else {
    reader = new LayarKosongReader();
}
