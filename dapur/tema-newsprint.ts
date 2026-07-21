/**
 * =================================================================================
 * tema-newsprint.ts - Dapur Pacu buat Layout "Ecosystem Index"
 * + Auto-grouping by Category (Rubrik)
 * + Max 4 Artikel Terbaru per Rail
 * + Auto-Sort Kategori berdasarkan Update Terbaru
 * + Live Search Filter & Enter Redirect (dengan tombol Clear)
 * + Optimized Image Loading (-rg.avif)
 * + Native Lightbox Support (Optimized URL replace)
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
    const data = await (window as any).siteDataProvider.getFor('homepage.ts');
    let groupedData: Record<string, Article[]> = {};

    allArticles = [];

    for (const cat in data) {
      const catSlug = cat.toLowerCase().replace(/\s+/g, '-');
      const readableCat = formatCategoryName(cat);
      groupedData[readableCat] = [];

      data[cat].forEach((item: any) => {
        const fileSlug = item.id.replace(/\.html$/, '');
        const originalImage = item.image || '/thumbnail.webp';

        const microImage = originalImage.replace(/\.(jpg|jpeg|png|webp)$/i, '-rg.avif');
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

      groupedData[readableCat].sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    renderRails(groupedData);
    initSearch();

  } catch (e) {
    console.error("Gagal menyajikan menu utama, Chef:", e);
    const container = document.getElementById('railContainer');
    if (container) container.innerHTML = "<p class='intro'>Data sedang mogok kerja. Coba muat ulang halaman.</p>";
  }
}

function formatCategoryName(slug: string): string {
  if (!slug) return 'Lainnya';
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// 🔥 FUNGSI LIGHTBOX
function openLightbox(imageUrl: string): void {
  const dialog = document.getElementById('imageLightbox') as HTMLDialogElement | null;
  const imgEl = document.getElementById('lightboxImg') as HTMLImageElement | null;

  if (dialog && imgEl) {
    imgEl.src = imageUrl;
    dialog.showModal();

    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!isInDialog) dialog.close();
    });
  }
}
(window as any).openLightbox = openLightbox;

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

  // 🔥 UPDATE: Kita pakai loop tradisional supaya gampang menyisipkan iklan di index tertentu
  for (let i = 0; i < sortedCategories.length; i++) {
    const cat = sortedCategories[i];
    const latestArticles = groupedData[cat].slice(0, 4);

    if (latestArticles.length === 0) continue;

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
      <img src="${item.img}" alt="${item.title}" loading="lazy"
      onclick="openLightbox(this.src.replace('-rg', ''))"
      onerror="if(this.src.includes('-rg.avif')) { this.src=this.src.replace('-rg.avif', '.webp'); } else { this.style.display='none'; }"
      style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px; cursor: zoom-in;">
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

      // 💰 ADS SLOT 💰
      if (i === 1) {
        htmlContent += `
        <div class="ad-slot-editorial" style="
        margin: 46px auto 0 auto;
        padding-bottom: 46px;
        border-bottom: 1px solid var(--color-rule);
        text-align: center;
        width: 100%;
        min-height: 140px; /* Anti-CLS: Akan disapu GTM jika kosong */
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        ">
        <span style="display:none;" aria-hidden="true" class="ad-label">Pesan Sponsor</span>
        <ins class="adsbygoogle" style="display: block; width: 100%; max-width: 970px; height: 90px;"
        data-ad-client="ca-pub-8157928740123992"
        data-ad-slot="4812703899"
        data-ad-format="auto"
        data-full-width-responsive="true"></ins>
        </div>
        `;
      }
  }

  containerEl.innerHTML = htmlContent;

  // 💰 Inisialisasi Script AdSense (Satu Baris, Ringkas)
  // Eksekusi push hanya jika elemen <ins> benar-benar ada di dalam container
  if (htmlContent.includes('adsbygoogle')) {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }
}

function initSearch(): void {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const clearBtn = document.getElementById('clearSearch');
  const searchResultsSection = document.getElementById('searchResults');
  const searchGrid = document.getElementById('searchGrid');
  const railContainer = document.getElementById('railContainer');
  const searchHeading = document.getElementById('searchHeading');

  if (!searchForm || !searchInput || !searchResultsSection || !searchGrid || !railContainer || !searchHeading || !clearBtn) return;

  searchInput.addEventListener('input', (e: Event) => {
    const val = (e.target as HTMLInputElement).value.toLowerCase().trim();

    if (val.length > 0) {
      clearBtn.style.display = 'block';
      railContainer.style.display = 'none';
      searchResultsSection.style.display = 'block';

      const filtered = allArticles.filter(i =>
      i.title.toLowerCase().includes(val) ||
      i.summary.toLowerCase().includes(val)
      );

      const limitedResults = filtered.slice(0, 28);

      if (limitedResults.length > 0) {
        if (filtered.length > 28) {
          searchHeading.textContent = `Menampilkan 28 hasil teratas untuk "${val}". Tekan Enter untuk sisanya.`;
          searchHeading.style.fontSize = "clamp(1rem, 2.5vw, 1.3rem)";
        } else {
          searchHeading.textContent = `Hasil: "${val}"`;
          searchHeading.style.fontSize = "clamp(1.25rem, 3vw, 1.6rem)";
        }

        searchGrid.innerHTML = limitedResults.map(item => `
        <article class="card" style="animation: fadeUp 0.4s ease-out both;">
        <div class="card-thumb">
        <!-- 🔥 UPDATE: Sama, ganti jadi this.src.replace('-rg', '') -->
        <img src="${item.img}" alt="${item.title}" loading="lazy"
        onclick="openLightbox(this.src.replace('-rg', ''))"
        onerror="if(this.src.includes('-rg.avif')) { this.src=this.src.replace('-rg.avif', '.webp'); } else { this.style.display='none'; }"
        style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px; cursor: zoom-in;">
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
        searchGrid.innerHTML = `<p style="grid-column: 1 / -1; color: var(--color-muted); padding-top: 12px;">Maaf, belum ada tulisan yang cocok. Coba kata kunci lain atau tekan Enter untuk pencarian lebih lanjut...</p>`;
      }
    } else {
      resetSearchState();
    }
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    resetSearchState();
    searchInput.focus();
  });

  function resetSearchState() {
    clearBtn!.style.display = 'none';
    railContainer!.style.display = 'block';
    searchResultsSection!.style.display = 'none';
    searchGrid!.innerHTML = '';
  }

  searchForm.addEventListener('submit', (e: Event) => {
    e.preventDefault();
    const val = searchInput.value.trim();
    if (val.length > 0) {
      window.location.href = `https://dalam.web.id/search/?q=${encodeURIComponent(val)}`;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fetchAndRenderRails);
} else {
  fetchAndRenderRails();
}
