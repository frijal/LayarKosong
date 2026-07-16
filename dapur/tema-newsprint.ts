/**
 * =================================================================================
 * editorial-index.ts - Dapur Pacu buat Layout "Ecosystem Index"
 * + Auto-grouping by Category (Rubrik)
 * + Max 2 Artikel Terbaru per Rail
 * + Auto Read-Time Estimator & Date Formatting
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
  readTime: number; // Disiapkan untuk UI meta data
}

// Urutan prioritas rail (sesuai masthead navigasi)
const RUBRIK_ORDER = [
  'Warta Tekno', 'Jejak Sejarah', 'Opini Sosial',
  'Gaya Hidup', 'Sistem Terbuka', 'Olah Media', 'Lainnya'
];

async function fetchAndRenderRails(): Promise<void> {
  try {
    const data = await (window as any).siteDataProvider.getFor('editorial-index.ts');
    let groupedData: Record<string, Article[]> = {};

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

        groupedData[readableCat].push({
          category: readableCat,
          categorySlug: catSlug,
          title: cleanTitle,
          url: `/${catSlug}/${fileSlug}`,
          img: smallImage,
          date: item.date ? new Date(item.date) : new Date(),
          summary: summaryText,
          // Estimasi kasar waktu baca (200 kata/menit, minimal 2 menit)
          readTime: Math.max(2, Math.ceil(summaryText.split(/\s+/).length / 30) + 1) 
        });
      });

      // Sort tiap kategori berdasarkan tanggal terbaru (Descending)
      groupedData[readableCat].sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    renderRails(groupedData);

  } catch (e) {
    console.error("Gagal menyajikan menu utama, Chef:", e);
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.innerHTML = "<p class='intro'>Data sedang mogok kerja. Coba muat ulang halaman.</p>";
  }
}

// Helper: Merapikan slug kategori jadi Title Case
function formatCategoryName(slug: string): string {
  if (!slug) return 'Lainnya';
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Helper: Format tanggal ala editorial (e.g., 12 Jul 2026)
function formatEditorialDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Mesin cetak utama
function renderRails(groupedData: Record<string, Article[]>): void {
  const mainEl = document.querySelector('main');
  if (!mainEl) return;

  let htmlContent = '';

  // Sortir keys berdasarkan RUBRIK_ORDER, sisa kategori tak terduga ditaruh di bawah
  const sortedCategories = Object.keys(groupedData).sort((a, b) => {
    const idxA = RUBRIK_ORDER.indexOf(a);
    const idxB = RUBRIK_ORDER.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  sortedCategories.forEach(cat => {
    // Ambil maksimal 2 tulisan teratas
    const latestArticles = groupedData[cat].slice(0, 2);
    if (latestArticles.length === 0) return; // Skip kalau rubrik kosong

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
                <!-- Fallback ke gambar default kalau image error -->
                <img src="${item.img}" alt="Thumb" loading="lazy" 
                     onerror="if(this.src.includes('-sm.webp')) { this.src=this.src.replace('-sm.webp', '.webp'); } else { this.style.display='none'; }"
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px;">
              </div>
              <div class="card-body">
                <span class="card-eyebrow">${formatEditorialDate(item.date)} &middot; ${item.readTime} menit baca</span>
                <h3><a href="${item.url}">${item.title}</a></h3>
                <p>${item.summary.length > 110 ? item.summary.substring(0, 110) + '...' : item.summary}</p>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  });

  // Tembakkan ke DOM
  mainEl.innerHTML = htmlContent;
}

// Inisialisasi
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fetchAndRenderRails);
} else {
  fetchAndRenderRails();
}
