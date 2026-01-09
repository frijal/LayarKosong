// Konfigurasi
const BASE_URL = "https://dalam.web.id/artikel/";
const PRIMARY_COLOR = "#00b0ed";

let allArticles = [];
let filteredArticles = [];

// 1. Fetch & Initialize
async function initPortal() {
    renderSkeleton(6);
    try {
        const response = await fetch('artikel.json');
        const data = await response.json();
        
        // Flatten data dari kategori ke array tunggal
        allArticles = Object.entries(data).flatMap(([category, items]) => 
            items.map(item => ({
                category,
                title: item[0],
                slug: item[1].replace('.html', ''), // Hilangkan .html
                image: item[2],
                date: new Date(item[3]),
                desc: item[4]
            }))
        ).sort((a, b) => b.date - a.date);

        filteredArticles = [...allArticles];
        renderArticles(filteredArticles);
        renderSidebar(allArticles.slice(0, 8));
        generateFilters(data);
        generateArchive(allArticles);
    } catch (error) {
        console.error("Gagal memuat artikel:", error);
        document.getElementById('main-grid').innerHTML = "<p>Gagal memuat konten. Silakan coba lagi nanti.</p>";
    }
}

// 2. Render Fungsi
function renderArticles(articles) {
    const container = document.getElementById('main-grid');
    container.innerHTML = articles.map(art => `
        <article class="card fade-in">
            <div class="card-img">
                <img src="${art.image}" alt="${art.title}" loading="lazy">
                <span class="badge">${art.category}</span>
            </div>
            <div class="card-content">
                <small>${art.date.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</small>
                <h3><a href="${BASE_URL}${art.slug}">${art.title}</a></h3>
                <p>${art.desc.substring(0, 100)}...</p>
                <a href="${BASE_URL}${art.slug}" class="btn-link">Baca Selengkapnya →</a>
            </div>
        </article>
    `).join('');
}

function renderSidebar(articles) {
    const sidebar = document.getElementById('sidebar-recent');
    sidebar.innerHTML = articles.map(art => `
        <div class="side-item fade-in">
            <img src="${art.image}" alt="thumb">
            <div>
                <h4><a href="${BASE_URL}${art.slug}">${art.title}</a></h4>
                <small>${art.category}</small>
            </div>
        </div>
    `).join('');
}

// 3. Filter & Sort Logic
function filterByCategory(cat) {
    filteredArticles = cat === 'all' ? allArticles : allArticles.filter(a => a.category === cat);
    renderArticles(filteredArticles);
}

function filterByArchive(year, month) {
    filteredArticles = allArticles.filter(a => {
        const d = a.date;
        return d.getFullYear() == year && (month === null || d.getMonth() == month);
    });
    renderArticles(filteredArticles);
}

// 4. Helper UI
function renderSkeleton(count) {
    const container = document.getElementById('main-grid');
    container.innerHTML = Array(count).fill('<div class="skeleton card"></div>').join('');
}

function generateFilters(data) {
    const container = document.getElementById('category-tags');
    const categories = Object.keys(data);
    container.innerHTML = `<button onclick="filterByCategory('all')" class="tag active">Semua</button>` + 
        categories.map(cat => `<button onclick="filterByCategory('${cat}')" class="tag">${cat}</button>`).join('');
}

function generateArchive(articles) {
    const archiveList = document.getElementById('archive-list');
    const tree = {};
    articles.forEach(a => {
        const y = a.date.getFullYear();
        const m = a.date.getMonth();
        if(!tree[y]) tree[y] = new Set();
        tree[y].add(m);
    });

    archiveList.innerHTML = Object.keys(tree).sort((a,b)=>b-a).map(year => `
        <div class="archive-year">
            <strong>${year}</strong>
            <ul>
                ${Array.from(tree[year]).sort((a,b)=>b-a).map(month => `
                    <li onclick="filterByArchive(${year}, ${month})">
                        ${new Date(0, month).toLocaleString('id-ID', {month:'long'})}
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', initPortal);
