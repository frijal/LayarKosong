/**
 * =================================================================================
 * editorial-index.ts - Dapur Pacu buat Layout "Ecosystem Index"
 * + Auto-grouping by Category (Rubrik)
 * + Max 4 Artikel Terbaru per Rail
 * + Auto-Sort Kategori berdasarkan Update Terbaru
 * + Live Search Filter & Enter Redirect (dengan tombol Clear)
 * + Optimized Image Loading (-rg.webp)
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

        // 🔥 UPDATE: Gunakan -rg.webp (150x84px) yang super enteng
        const microImage = originalImage.replace(/\.(jpg|jpeg|png|webp)$/i, '-rg.webp');

        const cleanTitle = item.title.replace(/\s*-\s*Layar Kosong$/i, '');
        const summaryText = item.description || '';

      const articleObj: Article = {
        category: readableCat,
        categorySlug: catSlug,
        title: cleanTitle,
        url: `/${catSlug}/${fileSlug}`,
        img: microImage,
        date: item.date ? new Date(item.date) : new Date(),
                        summary: summaryText
      };

      groupedData[readableCat].push(articleObj);
      allArticles.push(articleObj);
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
  const containerEl = document.getElementById('railContainer');
  if (!containerEl) return;

  let htmlContent = '';

  const sortedCategories = Object.keys(groupedData).sort((a, b) => {
    const newestA = groupedData[a][0]?.date.getTime() || 0;
    const newestB = groupedData[b][0]?.date.getTime() || 0;
    return newestB - newestA;
  });

  sortedCategories.forEach(cat => {
    // 🔥 UPDATE: Tampilkan maksimal 4 artikel per rail
    const latestArticles = groupedData[cat].slice(0, 4);
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
      <!-- 🔥 UPDATE: Fallback fallback ke -rg.webp -->
      <img src="${item.img}" alt="Thumb" loading="lazy"
      onerror="if(this.src.includes('-rg.webp')) { this.src=this.src.replace('-rg.webp', '.webp'); } else { this.style.display='none'; }"
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

// 🔥 MESIN PENCARIAN & TOMBOL CLEAR
function initSearch(): void {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const clearBtn = document.getElementById('clearSearch');
  const searchResultsSection = document.getElementById('searchResults');
  const searchGrid = document.getElementById('searchGrid');
  const railContainer = document.getElementById('railContainer');
  const searchHeading = document.getElementById('searchHeading');

  if (!searchForm || !searchInput || !searchResultsSection || !searchGrid || !railContainer || !searchHeading || !clearBtn) return;

  // 1. Live Filter (Instant Display)
  searchInput.addEventListener('input', (e: Event) => {
    const val = (e.target as HTMLInputElement).value.toLowerCase().trim();

    if (val.length > 0) {
      clearBtn.style.display = 'block'; // Tampilkan tombol Clear
      railContainer.style.display = 'none';
      searchResultsSection.style.display = 'block';

      // Saring semua data
  const filtered = allArticles.filter(i =>
  i.title.toLowerCase().includes(val) ||
  i.summary.toLowerCase().includes(val)
  );

  // 🔥 UPDATE: Batasi maksimal 28 artikel (7 rubrik x 4 artikel)
  const limitedResults = filtered.slice(0, 28);

  if (limitedResults.length > 0) {
    // Kasih tahu user kalau masih ada sisa hasil yang disembunyikan
    if (filtered.length > 28) {
      searchHeading.textContent = `Menampilkan 28 hasil teratas untuk "${val}". Tekan Enter untuk sisanya.`;
      searchHeading.style.fontSize = "clamp(1rem, 2.5vw, 1.3rem)"; // Dikecilin dikit biar muat
    } else {
      searchHeading.textContent = `Hasil: "${val}"`;
      searchHeading.style.fontSize = "clamp(1.25rem, 3vw, 1.6rem)"; // Ukuran normal
    }

    searchGrid.innerHTML = limitedResults.map(item => `
    <article class="card" style="animation: fadeUp 0.4s ease-out both;">
    <div class="card-thumb">
    <img src="${item.img}" alt="Thumb" loading="lazy"
    onerror="if(this.src.includes('-rg.webp')) { this.src=this.src.replace('-rg.webp', '.webp'); } else { this.style.display='none'; }"
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
    searchHeading.style.fontSize = "clamp(1.25rem, 3vw, 1.6rem)";
    searchGrid.innerHTML = `<p style="grid-column: 1 / -1; color: var(--color-muted); padding-top: 12px;">Maaf, belum ada tulisan yang cocok. Coba kata kunci lain atau tekan Enter untuk pencarian mendalam.</p>`;
  }
    } else {
      resetSearchState();
    }
  });

  // 2. Logika Tombol Clear
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    resetSearchState();
    searchInput.focus(); // Balikkan kursor ke input box
  });

  // Helper fungsi reset
  function resetSearchState() {
    clearBtn!.style.display = 'none';
    railContainer!.style.display = 'block';
    searchResultsSection!.style.display = 'none';
    searchGrid!.innerHTML = '';
  }

  // 3. Redirect ke Halaman Pencarian saat Enter
  searchForm.addEventListener('submit', (e: Event) => {
    e.preventDefault();
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
