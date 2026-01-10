// script.js - Client-side data processing for Layar Kosong Portal

class ArticlePortal {
    constructor() {
        this.articles = [];
        this.filteredArticles = [];
        this.categories = new Set();
        this.years = new Set();
        this.months = new Set();
        this.currentCategory = 'all';
        this.currentYear = 'all';
        this.currentMonth = 'all';
        this.currentPage = 1;
        this.articlesPerPage = 9;
        this.searchQuery = '';

        // DOM Elements
        this.articlesGrid = document.getElementById('articles-grid');
        this.categoryFilter = document.getElementById('category-filter');
        this.yearFilter = document.getElementById('year-filter');
        this.monthFilter = document.getElementById('month-filter');
        this.searchInput = document.getElementById('search-input');
        this.paginationContainer = document.getElementById('pagination');
        this.archiveYears = document.getElementById('archive-years');
        this.sidebarNews = document.getElementById('sidebar-news');
        this.loader = document.getElementById('loader');
        this.articleCount = document.getElementById('article-count');
        this.themeToggle = document.getElementById('theme-toggle');

        this.init();
    }

    async init() {
        // Show loader
        this.showLoader();

        try {
            // Load articles from JSON
            const response = await fetch('.artikel.json');
            const data = await response.json();

            // Process all articles into a flat array
            this.processArticles(data);

            // Extract categories, years, months
            this.extractFilters();

            // Render initial view
            this.renderFilters();
            this.renderArchive();
            this.renderSidebarNews();
            this.filterArticles();

            // Hide loader
            setTimeout(() => this.hideLoader(), 500);

            // Setup event listeners
            this.setupEventListeners();

            // Setup theme
            this.setupTheme();

        } catch (error) {
            console.error('Error loading articles:', error);
            this.hideLoader();
            this.articlesGrid.innerHTML = `
            <div class="error-message">
            <h3>⚠️ Gagal memuat artikel</h3>
            <p>Silakan refresh halaman atau coba lagi nanti.</p>
            </div>
            `;
        }
    }

    processArticles(data) {
        this.articles = [];

        // Flatten all categories into a single array
        for (const [category, articles] of Object.entries(data)) {
            articles.forEach(article => {
                const [title, slug, imageUrl, dateString, summary] = article;

                // Parse date
                const date = new Date(dateString);
                const year = date.getFullYear();
                const month = date.getMonth() + 1; // 1-12
                const monthName = this.getMonthName(month);
                const formattedDate = this.formatDate(date);

                // Create article object
                const articleObj = {
                    title,
                    slug,
                    imageUrl,
                    date,
                    dateString: formattedDate,
                    year,
                    month,
                    monthName,
                    summary,
                    category
                };

                this.articles.push(articleObj);
            });
        }

        // Sort by date (newest first)
        this.articles.sort((a, b) => b.date - a.date);
        this.filteredArticles = [...this.articles];
    }

    extractFilters() {
        this.articles.forEach(article => {
            this.categories.add(article.category);
            this.years.add(article.year);
            this.months.add(article.monthName);
        });
    }

    renderFilters() {
        // Render category filter
        this.categoryFilter.innerHTML = `
        <option value="all">Semua Kategori</option>
        ${Array.from(this.categories).map(cat =>
            `<option value="${cat}">${cat}</option>`
        ).join('')}
        `;

        // Render year filter
        const sortedYears = Array.from(this.years).sort((a, b) => b - a);
        this.yearFilter.innerHTML = `
        <option value="all">Semua Tahun</option>
        ${sortedYears.map(year =>
            `<option value="${year}">${year}</option>`
        ).join('')}
        `;

        // Render month filter
        const monthOrder = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const sortedMonths = Array.from(this.months).sort((a, b) =>
        monthOrder.indexOf(a) - monthOrder.indexOf(b)
        );
        this.monthFilter.innerHTML = `
        <option value="all">Semua Bulan</option>
        ${sortedMonths.map(month =>
            `<option value="${month}">${month}</option>`
        ).join('')}
        `;
    }

    renderArchive() {
        // Group articles by year and month
        const archive = {};

        this.articles.forEach(article => {
            if (!archive[article.year]) {
                archive[article.year] = {};
            }
            if (!archive[article.year][article.monthName]) {
                archive[article.year][article.monthName] = 0;
            }
            archive[article.year][article.monthName]++;
        });

        // Create archive HTML
        let archiveHTML = '';
        const sortedYears = Object.keys(archive).sort((a, b) => b - a);

        sortedYears.forEach(year => {
            archiveHTML += `
            <div class="archive-year">
            <button class="archive-year-btn" data-year="${year}">
            📅 ${year} <span class="archive-count">(${Object.values(archive[year]).reduce((a, b) => a + b, 0)})</span>
            </button>
            <div class="archive-months">
            ${Object.entries(archive[year])
                .sort(([a], [b]) => this.getMonthNumber(a) - this.getMonthNumber(b))
                .map(([month, count]) => `
                <a href="#" class="archive-month" data-year="${year}" data-month="${month}">
                ${month} <span>(${count})</span>
                </a>
                `).join('')}
                </div>
                </div>
                `;
        });

        this.archiveYears.innerHTML = archiveHTML;

        // Add event listeners for archive
        document.querySelectorAll('.archive-year-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const months = e.currentTarget.nextElementSibling;
                months.classList.toggle('show');
                e.currentTarget.classList.toggle('active');
            });
        });

        document.querySelectorAll('.archive-month').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const year = e.currentTarget.dataset.year;
                const month = e.currentTarget.dataset.month;

                this.yearFilter.value = year;
                this.monthFilter.value = month;
                this.currentYear = year;
                this.currentMonth = month;

                this.filterArticles();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    renderSidebarNews() {
        // Get 10 latest articles for sidebar
        const sidebarArticles = this.articles.slice(0, 10);

        this.sidebarNews.innerHTML = sidebarArticles.map(article => `
        <a href="${article.slug}" class="sidebar-article" data-category="${article.category}">
        <div class="sidebar-thumbnail">
        <img src="${article.imageUrl}" alt="${article.title}" loading="lazy">
        <span class="category-badge">${article.category}</span>
        </div>
        <div class="sidebar-content">
        <h4>${this.truncateText(article.title, 60)}</h4>
        <p class="sidebar-date">${article.dateString}</p>
        </div>
        </a>
        `).join('');
    }

    filterArticles() {
        this.currentPage = 1;

        this.filteredArticles = this.articles.filter(article => {
            // Category filter
            if (this.currentCategory !== 'all' && article.category !== this.currentCategory) {
                return false;
            }

            // Year filter
            if (this.currentYear !== 'all' && article.year != this.currentYear) {
                return false;
            }

            // Month filter
            if (this.currentMonth !== 'all' && article.monthName !== this.currentMonth) {
                return false;
            }

            // Search filter
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                return article.title.toLowerCase().includes(query) ||
                article.summary.toLowerCase().includes(query) ||
                article.category.toLowerCase().includes(query);
            }

            return true;
        });

        this.renderArticles();
        this.renderPagination();
        this.updateArticleCount();
    }

    renderArticles() {
        // Calculate articles for current page
        const startIndex = (this.currentPage - 1) * this.articlesPerPage;
        const endIndex = startIndex + this.articlesPerPage;
        const currentArticles = this.filteredArticles.slice(startIndex, endIndex);

        if (currentArticles.length === 0) {
            this.articlesGrid.innerHTML = `
            <div class="no-results">
            <h3>📭 Tidak ada artikel yang ditemukan</h3>
            <p>Coba ubah filter atau kata kunci pencarian.</p>
            </div>
            `;
            return;
        }

        this.articlesGrid.innerHTML = currentArticles.map(article => `
        <article class="article-card" data-category="${article.category}" data-year="${article.year}">
        <a href="${article.slug}" class="article-link">
        <div class="article-thumbnail">
        <img src="${article.imageUrl}" alt="${article.title}" loading="lazy">
        <div class="article-overlay">
        <span class="category-tag">${article.category}</span>
        <span class="date-tag">${article.dateString}</span>
        </div>
        </div>
        <div class="article-content">
        <h3 class="article-title">${article.title}</h3>
        <p class="article-summary">${this.truncateText(article.summary, 120)}</p>
        <div class="article-meta">
        <time datetime="${article.date.toISOString()}">${article.dateString}</time>
        <span class="read-more">Baca selengkapnya →</span>
        </div>
        </div>
        </a>
        </article>
        `).join('');
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredArticles.length / this.articlesPerPage);

        if (totalPages <= 1) {
            this.paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `<button class="pagination-btn prev" data-page="${this.currentPage - 1}">← Sebelumnya</button>`;
        }

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= this.currentPage - 1 && i <= this.currentPage + 1)
            ) {
                paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
                ${i}
                </button>
                `;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="pagination-btn next" data-page="${this.currentPage + 1}">Selanjutnya →</button>`;
        }

        this.paginationContainer.innerHTML = paginationHTML;

        // Add event listeners to pagination buttons
        this.paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.currentPage = parseInt(e.currentTarget.dataset.page);
                this.filterArticles();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    setupEventListeners() {
        // Category filter
        this.categoryFilter.addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            this.filterArticles();
        });

        // Year filter
        this.yearFilter.addEventListener('change', (e) => {
            this.currentYear = e.target.value;
            this.filterArticles();
        });

        // Month filter
        this.monthFilter.addEventListener('change', (e) => {
            this.currentMonth = e.target.value;
            this.filterArticles();
        });

        // Search input
        this.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.trim();
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.filterArticles();
            }, 300);
        });

        // Clear filters button
        document.getElementById('clear-filters').addEventListener('click', (e) => {
            e.preventDefault();
            this.currentCategory = 'all';
            this.currentYear = 'all';
            this.currentMonth = 'all';
            this.searchQuery = '';
            this.searchInput.value = '';
            this.categoryFilter.value = 'all';
            this.yearFilter.value = 'all';
            this.monthFilter.value = 'all';
            this.filterArticles();
        });
    }

    setupTheme() {
        // Check for saved theme preference or system preference
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.themeToggle.innerHTML = '🌙';
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            this.themeToggle.innerHTML = '☀️';
        }

        // Theme toggle button
        this.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.themeToggle.innerHTML = newTheme === 'dark' ? '🌙' : '☀️';
        });
    }

    updateArticleCount() {
        this.articleCount.textContent = `${this.filteredArticles.length} artikel ditemukan`;
    }

    showLoader() {
        if (this.loader) {
            this.loader.style.display = 'flex';
        }
    }

    hideLoader() {
        if (this.loader) {
            this.loader.style.display = 'none';
        }
    }

    // Helper methods
    getMonthName(month) {
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return months[month - 1];
    }

    getMonthNumber(monthName) {
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return months.indexOf(monthName) + 1;
    }

    formatDate(date) {
        const options = {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('id-ID', options);
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

// Initialize portal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ArticlePortal();
});
