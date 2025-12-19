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
