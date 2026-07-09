/**
 * lightbox.lite.ts (v2 — Gallery Caching + Srcset-Aware Exclude + Zero Forced Layout)
 * - Lazy UI Injection & Lazy Array Collection (Super Ringan)
 * - Menggunakan matchMedia (Lebih efisien dari event resize)
 * - Gallery di-cache, hanya rebuild kalau DOM benar-benar berubah (via MutationObserver lazy)
 * - Exclude logic sadar `srcset`: tidak lagi salah mengecualikan gambar hero responsif
 *   yang kebetulan sedang menampilkan varian -sm/-md karena lebar viewport
 */

(() => {
  const MIN_WIDTH = 610;

  // Suffix ini HANYA dipakai untuk mengecualikan gambar yang TIDAK punya srcset
  // (thumbnail grid -rg dan placeholder statis thumbnail-sm.webp). Gambar hero yang
  // punya srcset TIDAK PERNAH dicek lewat suffix ini — lihat isExcluded() di bawah.
  const SUFFIX_PATTERN = /-(sm|md|rg)\.webp$/i;

  const ID = "auto-lightbox";

  // matchMedia untuk mendeteksi layar mobile tanpa bikin CPU teriak
  const mqMobile = window.matchMedia("(max-width: 767px)");
  const isMobile = () => mqMobile.matches;

  let gallery: HTMLImageElement[] = [];
  let currentIdx = 0;

  // 🔧 FIX: Cache galeri — hindari query + loop ke SEMUA <img> di halaman tiap klik.
  // Ditandai "dirty" di awal (belum pernah dibangun), lalu di-invalidate otomatis
  // kalau DOM berubah (misal grid terkait baru selesai di-render pemandu.ts).
  let galleryDirty = true;
  let observerAttached = false;

  // Cache untuk elemen DOM
  const ui: { box?: HTMLElement, img?: HTMLImageElement, cap?: HTMLElement } = {};

  // One-liner function untuk mengambil caption dengan aman
  const getCaption = (img: HTMLImageElement): string => {
    return (img.alt || img.title || img.closest("figure")?.querySelector("figcaption")?.textContent ||
    (img.currentSrc || img.src).split("/").pop()?.split("?")[0].split(".")[0]?.replace(/[-_]/g, " "))?.trim() || "View Image";
  };

  // 🔧 FIX: Ambil URL resolusi penuh untuk ditampilkan di lightbox.
  // Prioritas: atribut data-full eksplisit (kalau suatu saat generator HTML menambahkannya)
  // -> kandidat terlebar dari srcset (biar tetap nampilin gambar resolusi tinggi walau
  //    currentSrc lagi menunjuk ke varian -md/-sm karena viewport sempit)
  // -> currentSrc/src apa adanya (fallback terakhir untuk gambar tanpa srcset sama sekali).
  const getFullResUrl = (img: HTMLImageElement): string => {
    const explicit = img.getAttribute("data-full");
    if (explicit) return explicit;

    const srcset = img.getAttribute("srcset");
    if (srcset) {
      let bestUrl = "";
      let bestWidth = -1;

      // Split berdasarkan koma, lalu filter bagian yang kosong (jika ada spasi ganda dsb)
      const parts = srcset.split(",").map(s => s.trim()).filter(Boolean);

      for (const part of parts) {
        // Bagi string menjadi array berdasarkan spasi kosong berapapun jumlahnya
        const tokens = part.split(/\s+/);
        const url = tokens[0];
        const descriptor = tokens[1] || "";

        if (!url) continue;

        // Ambil angka dari descriptor (misal "1024w" jadi 1024, "2x" jadi 2)
        // Kalau tidak ada descriptor, default anggap lebarnya 0 (prioritas rendah)
        const widthMatch = descriptor.match(/(\d+)/);
        const width = widthMatch ? parseInt(widthMatch[1], 10) : 0;

        if (width >= bestWidth) {
          bestWidth = width;
          bestUrl = url;
        }
      }
      if (bestUrl) return bestUrl;
    }

    return img.currentSrc || img.src;
  };

  // 🔧 FIX: Satu-satunya tempat logika "apakah gambar ini boleh masuk lightbox".
  // Dipakai baik saat klik pertama maupun saat membangun galeri — supaya konsisten
  // dan tidak ada dua salinan logika yang bisa saling menyimpang di masa depan.
  const isExcluded = (img: HTMLImageElement): boolean => {
    // Gambar dengan srcset adalah bagian dari <picture> responsif untuk konten utama.
    // currentSrc boleh saja kebetulan memilih varian -md/-sm sesuai lebar viewport,
    // tapi itu TETAP gambar konten yang layak dibuka di lightbox — bukan thumbnail.
    if (img.hasAttribute("srcset")) return false;

    const src = img.currentSrc || img.src || "";
    const filename = src.split("/").pop()?.split("?")[0] || "";
    return SUFFIX_PATTERN.test(filename);
  };

  const isEligible = (img: HTMLImageElement): boolean => {
    if (isExcluded(img)) return false;
    // 🔧 FIX: hanya baca naturalWidth (metadata resource, tidak memicu layout reflow).
    // Dulu ada fallback `|| img.width` yang bisa memaksa recalculation layout browser
    // kalau dipanggil berulang dalam loop atas banyak elemen <img>.
    return img.naturalWidth >= MIN_WIDTH;
  };

  const markGalleryDirty = () => { galleryDirty = true; };

  // Observer dipasang SEKALI, baru setelah lightbox pertama kali dipakai —
  // tetap menjaga filosofi "lazy": kalau user tidak pernah klik gambar,
  // observer ini tidak pernah aktif sama sekali.
  const ensureObserver = () => {
    if (observerAttached) return;
    observerAttached = true;
    new MutationObserver(markGalleryDirty).observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  // 🔧 FIX: document.images adalah koleksi native yang sudah di-maintain browser,
  // sedikit lebih ringan dibanding querySelectorAll("img") yang mencocokkan selector dari nol.
  const buildGallery = (): HTMLImageElement[] => {
    return Array.from(document.images).filter(isEligible);
  };

  // LAZY INIT: Cuma dibikin pas user pertama kali klik gambar valid
  const initUI = () => {
    if (ui.box || document.getElementById(ID)) return;

    document.body.insertAdjacentHTML('beforeend', `
    <div id="${ID}" role="dialog" aria-modal="true" aria-hidden="true" style="position:fixed;inset:0;background:rgba(0,0,0,0.95);display:none;align-items:center;justify-content:center;transition:opacity .28s ease;opacity:0;backdrop-filter:blur(8px);z-index:100000;">
    <style>
    #${ID}.open { display:flex !important; opacity:1 !important; }
    .lb-btn { background:rgba(255,255,255,0.04); color:#fff; border:none; width:56px; height:56px; border-radius:50%; cursor:pointer; font-size:22px; pointer-events:auto; transition:transform .2s; }
    .lb-btn:hover { transform:scale(1.06); background:rgba(255,255,255,0.12); }
    @media (max-width:767px) { #${ID} { display:none !important; } }
    </style>
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;max-width:96vw;max-height:94vh;padding:18px;">
    <button id="lb-cls" aria-label="Close" style="position:absolute;top:12px;right:14px;font-size:30px;color:#fff;background:transparent;border:none;cursor:pointer;padding:6px;">&times;</button>
    <img id="lb-img" style="max-width:100%;max-height:78vh;object-fit:contain;border-radius:6px;box-shadow:0 10px 40px rgba(0,0,0,0.6);cursor:zoom-out;transition:opacity .18s;opacity:0;" src="" alt="">
    <div id="lb-cap" aria-live="polite" style="color:#e6eef8;margin-top:6px;font-size:14px;text-align:center;max-width:86vw;line-height:1.4;opacity:0;transition:opacity .18s;font-weight:300;"></div>
    </div>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;pointer-events:none;padding:0 2vw;">
    <button id="lb-prv" class="lb-btn" aria-label="Prev">❮</button>
    <button id="lb-nxt" class="lb-btn" aria-label="Next">❯</button>
    </div>
    </div>
    `);

    ui.box = document.getElementById(ID) as HTMLElement;
    ui.img = document.getElementById("lb-img") as HTMLImageElement;
    ui.cap = document.getElementById("lb-cap") as HTMLElement;

    // EVENT DELEGATION: Nangkap klik di tombol close, prev, next, dan background
    ui.box.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target === ui.box || target.id === "lb-cls" || target.id === "lb-img") close();
      else if (target.id === "lb-prv") move(-1);
      else if (target.id === "lb-nxt") move(1);
    });
  };

  const update = () => {
    const img = gallery[currentIdx];
    if (!img || !ui.img || !ui.cap) return;

    ui.img.style.opacity = "0";
    ui.cap.style.opacity = "0";

    // 🔧 FIX: pakai getFullResUrl(), bukan currentSrc mentah — supaya lightbox selalu
    // menampilkan varian resolusi tertinggi yang tersedia, bukan varian -md/-sm
    // yang kebetulan dipilih browser untuk rendering inline di halaman.
    const src = getFullResUrl(img);
    ui.img.src = src;
    ui.img.alt = img.alt || "View Image";
    ui.cap.textContent = getCaption(img);

    // Pertahankan responsive images jika ada
    const srcset = img.getAttribute("srcset");
    srcset ? ui.img.setAttribute("srcset", srcset) : ui.img.removeAttribute("srcset");
    const sizes = img.getAttribute("sizes");
    sizes ? ui.img.setAttribute("sizes", sizes) : ui.img.removeAttribute("sizes");

    ui.img.onload = () => {
      ui.img!.style.opacity = "1";
      ui.cap!.style.opacity = "1";
    };
  };

  const move = (step: number) => {
    if (gallery.length > 1) {
      currentIdx = (currentIdx + step + gallery.length) % gallery.length;
      update();
    }
  };

  const close = () => {
    if (!ui.box) return;
    ui.box.classList.remove("open");
    ui.box.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      if (ui.img) { ui.img.src = ""; ui.img.removeAttribute("srcset"); ui.img.removeAttribute("sizes"); }
    }, 280);
  };

  // MAIN LISTENER
  document.addEventListener("click", (e) => {
    if (isMobile()) return;
    const target = e.target as HTMLElement;
    if (target.tagName !== "IMG") return;

    const img = target as HTMLImageElement;

    // VALIDASI AWAL: satu fungsi yang sama dipakai di sini dan saat build galeri
    if (!isEligible(img)) return;

    if (img.closest("a")) e.preventDefault();

    initUI(); // Pasang UI ke halaman
    ensureObserver(); // Pasang pemantau perubahan DOM (sekali saja, lazy)

  // 🔧 FIX: hanya rebuild galeri kalau memang ditandai dirty (pertama kali,
  // atau setelah DOM benar-benar berubah). Klik berikutnya ke gambar lain
  // di galeri yang sama tidak perlu query + loop ulang ke seluruh halaman.
  if (galleryDirty) {
    gallery = buildGallery();
    galleryDirty = false;
  }

  currentIdx = gallery.indexOf(img);
  if (currentIdx === -1) return;

  ui.box!.classList.add("open");
    ui.box!.setAttribute("aria-hidden", "false");
    update();
  });

  // Navigasi via Keyboard (Esc, Kiri, Kanan)
  document.addEventListener("keydown", (e) => {
    if (!ui.box?.classList.contains("open") || isMobile()) return;
    if (e.key === "ArrowRight") move(1);
    if (e.key === "ArrowLeft") move(-1);
    if (e.key === "Escape") close();
  });

    // Listener resize pintar: tutup Lightbox otomatis kalau ditarik sampai ukuran mobile
    mqMobile.addEventListener("change", (e) => {
      if (e.matches) close();
    });
})();
