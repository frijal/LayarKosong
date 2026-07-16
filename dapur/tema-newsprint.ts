/**
 * =================================================================================
 * editorial-index.ts - Dapur Pacu buat Layout "Ecosystem Index"
 * + Auto-grouping by Category (Rubrik)
 * + Max 2 Artikel Terbaru per Rail
 * + Auto-Sort Kategori berdasarkan Update Terbaru
 * + Live Search Filter & Enter Redirect
 * =================================================================================
 */

interface Article {
  category: string;
  categorySlug: string;
  title: string;
  url: string;
  img: string;
  date: Date;
  summary: string;
}

// Variabel global untuk menyimpan data pencarian mentah
let allArticles: Article[] = [];

async function fetchAndRenderRails(): Promise<void> {
  try {
    const data = await (window as any).siteDataProvider.getFor('editorial-index.ts');
    let groupedData: Record<string, Article[]> = {};

    // Reset array global saat fetch
    allArticles = [];

    for (const cat in data) {
      const catSlug = cat.toLowerCase().replace(/\s+/g, '-');
      const readableCat = formatCategoryName(cat);
      groupedData[readableCat] = [];

      data[cat].forEach((item: any) => {
        const fileSlug = item.id.replace(/\.html$/, '');
        const originalImage = item.image || '/thumbnail.webp';
        const smallImage = originalImage.replace(/\.(jpg|jpeg|png|webp)$/i, '-sm.webp');
        const cleanTitle = item.title.replace(/\s*-\s*Layar Kosong$/i, '');
        const summaryText = item.description || '';

      const articleObj: Article = {
        category: readableCat,
        categorySlug: catSlug,
        title: cleanTitle,
        url: `/${catSlug}/${fileSlug}`,
        img: smallImage,
        date: item.date ? new Date(item.date) : new Date(),
                        summary: summaryText
      };

      groupedData[readableCat].push(articleObj);
      allArticles.push(articleObj); // Simpan ke wadah flat untuk di-search
      });

      // Sort tiap artikel di dalam kategori berdasarkan tanggal terbaru (Descending)
      groupedData[readableCat].sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    renderRails(groupedData);
    initSearch(); // Inisialisasi fitur pencarian setelah data siap

  } catch (e) {
    console.error("Gagal menyajikan menu utama, Chef:", e);
    const container = document.getElementById('railContainer');
    if (container) container.innerHTML = "<p class='intro'>Data sedang mogok kerja. Coba muat ulang halaman.</p>";
  }
}

// Helper: Merapikan slug kategori jadi Title Case
function formatCategoryName(slug: string): string {
  if (!slug) return 'Lainnya';
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Mesin cetak utama
function renderRails(groupedData: Record<string, Article[]>): void {
  // 🔥 PERHATIAN: Sekarang kita render ke dalam #railContainer, bukan langsung ke main
  const containerEl = document.getElementById('railContainer');
  if (!containerEl) return;

  let htmlContent = '';

  const sortedCategories = Object.keys(groupedData).sort((a, b) => {
    const newestA = groupedData[a][0]?.date.getTime() || 0;
    const newestB = groupedData[b][0]?.date.getTime() || 0;
    return newestB - newestA;
  });

  sortedCategories.forEach(cat => {
    const latestArticles = groupedData[cat].slice(0, 2);
    if (latestArticles.length === 0) return;

    const catSlug = latestArticles[0].categorySlug;

    htmlContent += `
    <section class="rail" id="${catSlug}">
    <div class="rail-head">
    <h2>${cat}</h2>
    <a class="rail-more" href="/${catSlug}">Lihat semua &rarr;</a>
    </div>
    <div class="card-grid">
    ${latestArticles.map(item => `
      <article class="card">
      <div class="card-thumb">
      <img src="${item.img}" alt="Thumb" loading="lazy"
      onerror="if(this.src.includes('-sm.webp')) { this.src=this.src.replace('-sm.webp', '.webp'); } else { this.style.display='none'; }"
      style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px;">
      </div>
      <div class="card-body">
      <h3><a href="${item.url}">${item.title}</a></h3>
      <p>${item.summary.length > 110 ? item.summary.substring(0, 110) + '...' : item.summary}</p>
      </div>
      </article>
      `).join('')}
      </div>
      </section>
      `;
  });

  containerEl.innerHTML = htmlContent;
}

// 🔥 MESIN PENCARIAN
function initSearch(): void {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const searchResultsSection = document.getElementById('searchResults');
  const searchGrid = document.getElementById('searchGrid');
  const railContainer = document.getElementById('railContainer');
  const searchHeading = document.getElementById('searchHeading');

  if (!searchForm || !searchInput || !searchResultsSection || !searchGrid || !railContainer || !searchHeading) return;

  // 1. Live Filter (Instant Display)
  searchInput.addEventListener('input', (e: Event) => {
    const val = (e.target as HTMLInputElement).value.toLowerCase().trim();

    if (val.length > 0) {
      // Sembunyikan rubrik utama, tampilkan wadah pencarian
      railContainer.style.display = 'none';
      searchResultsSection.style.display = 'block';

      // Saring data dari array mentah
  const filtered = allArticles.filter(i =>
  i.title.toLowerCase().includes(val) ||
  i.summary.toLowerCase().includes(val)
  );

  if (filtered.length > 0) {
    searchHeading.textContent = `Hasil: "${val}"`;
    // Tampilkan hasil (bisa lebih dari 2 karena ini hasil search)
    searchGrid.innerHTML = filtered.map(item => `
    <article class="card" style="animation: fadeUp 0.4s ease-out both;">
    <div class="card-thumb">
    <img src="${item.img}" alt="Thumb" loading="lazy"
    onerror="if(this.src.includes('-sm.webp')) { this.src=this.src.replace('-sm.webp', '.webp'); } else { this.style.display='none'; }"
    style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px;">
    </div>
    <div class="card-body">
    <span class="card-eyebrow">${item.category}</span>
    <h3><a href="${item.url}">${item.title}</a></h3>
    <p>${item.summary.length > 110 ? item.summary.substring(0, 110) + '...' : item.summary}</p>
    </div>
    </article>
    `).join('');
  } else {
    searchHeading.textContent = `Tidak ditemukan: "${val}"`;
    searchGrid.innerHTML = `<p style="grid-column: 1 / -1; color: var(--color-muted); padding-top: 12px;">Maaf, belum ada tulisan yang cocok. Coba kata kunci lain atau tekan Enter untuk pencarian mendalam.</p>`;
  }
    } else {
      // Jika form dikosongkan, kembalikan ke tampilan semula
      railContainer.style.display = 'block';
      searchResultsSection.style.display = 'none';
      searchGrid.innerHTML = '';
    }
  });

  // 2. Redirect ke Halaman Pencarian saat Enter
  searchForm.addEventListener('submit', (e: Event) => {
    e.preventDefault(); // Cegah reload form default
    const val = searchInput.value.trim();
    if (val.length > 0) {
      window.location.href = `https://dalam.web.id/search/?q=${encodeURIComponent(val)}`;
    }
  });
}

// Inisialisasi
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fetchAndRenderRails);
} else {
  fetchAndRenderRails();
}
