/**
 * lightbox.ts (Updated: Exclude *-sm.webp)
 * - Menangkap SEMUA img di halaman (Desktop only)
 * - Matikan otomatis di Mobile (< 768px)
 * - EKSKLUSI: Gambar dengan nama file berakhiran *-sm.webp
 */

(() => {
  type Config = {
    selectors: string;
    minWidth: number;
    mobileBreakpoint: number;
    excludeSuffix: string; // Tambahan untuk fleksibilitas
    id: string;
    closeOnEsc: boolean;
    showOnClickWithinLink: boolean;
  };

  const CONFIG: Config = {
    selectors: "img",
 minWidth: 50,
 mobileBreakpoint: 768,
 excludeSuffix: "-sm.webp", // Suffix yang dilarang masuk lightbox
 id: "auto-lightbox",
 closeOnEsc: true,
 showOnClickWithinLink: true,
  };

  let galleryImages: HTMLImageElement[] = [];
  let currentIndex = 0;
  let lightbox: HTMLElement | null = null;
  let lightboxImg: HTMLImageElement | null = null;
  let lightboxCaption: HTMLElement | null = null;
  let isOpen = false;

  const isMobile = (): boolean => window.innerWidth < CONFIG.mobileBreakpoint;

  function getCaption(img: HTMLImageElement): string {
    if (img.alt && img.alt.trim()) return img.alt.trim();
    if (img.title && img.title.trim()) return img.title.trim();
    const fig = img.closest("figure");
    if (fig) {
      const fc = fig.querySelector("figcaption");
      if (fc) return (fc as HTMLElement).innerText.trim();
    }
    const source = img.currentSrc || img.src || "";
    const filename = (source.split("/").pop() || "").split("?")[0].split(".")[0] || "View Image";
    try {
      return decodeURIComponent(filename).replace(/[-_]/g, " ");
    } catch {
      return filename.replace(/[-_]/g, " ");
    }
  }

  function getValidImages(): HTMLImageElement[] {
    return Array.from(document.querySelectorAll(CONFIG.selectors)) as HTMLImageElement[];
  }

  function createLightbox(): void {
    if (document.getElementById(CONFIG.id)) return;
    lightbox = document.createElement("div");
    lightbox.id = CONFIG.id;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.style.zIndex = "100000";
    lightbox.innerHTML = `
    <style>
    #${CONFIG.id} { position: fixed; inset: 0; background: rgba(0,0,0,0.95); display: none; align-items: center; justify-content: center; transition: opacity 0.28s ease; opacity: 0; backdrop-filter: blur(8px); }
    #${CONFIG.id}.open { display:flex; opacity:1; }
    .lb-inner { position: relative; display:flex; flex-direction:column; align-items:center; gap:12px; max-width: 96vw; max-height: 94vh; padding: 18px; box-sizing: border-box; }
    .lb-img { max-width: 100%; max-height: 78vh; object-fit: contain; border-radius: 6px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); cursor: zoom-out; transition: opacity .18s ease; }
    .lb-caption { color: #e6eef8; margin-top: 6px; font-size: 14px; text-align: center; max-width: 86vw; line-height: 1.4; opacity: .95; font-weight: 300; }
    .lb-close { position: absolute; top: 12px; right: 14px; font-size: 30px; color: #fff; background: transparent; border: none; cursor: pointer; padding: 6px; border-radius: 6px; }
    .lb-nav { position: absolute; inset: 0; display:flex; align-items:center; justify-content:space-between; pointer-events:none; }
    .lb-btn { pointer-events:auto; background: rgba(255,255,255,0.04); color: #fff; border: none; width: 56px; height: 56px; border-radius: 50%; cursor: pointer; font-size: 22px; display:flex; align-items:center; justify-content:center; }
    .lb-btn:hover { transform: scale(1.06); background: rgba(255,255,255,0.12); }
    @media (max-width: ${CONFIG.mobileBreakpoint - 1}px) { #${CONFIG.id} { display: none !important; } }
    </style>
    <div class="lb-inner" role="document">
    <button class="lb-close" aria-label="Close lightbox">&times;</button>
    <img class="lb-img" src="" alt="">
    <div class="lb-caption" aria-live="polite"></div>
    </div>
    <div class="lb-nav" aria-hidden="true">
    <button class="lb-btn lb-prev" aria-label="Previous image">❮</button>
    <button class="lb-btn lb-next" aria-label="Next image">❯</button>
    </div>
    `;
    document.body.appendChild(lightbox);
    lightboxImg = lightbox.querySelector(".lb-img") as HTMLImageElement | null;
    lightboxCaption = lightbox.querySelector(".lb-caption") as HTMLElement | null;
    const closeBtn = lightbox.querySelector(".lb-close") as HTMLElement | null;
    const prevBtn = lightbox.querySelector(".lb-prev") as HTMLElement | null;
    const nextBtn = lightbox.querySelector(".lb-next") as HTMLElement | null;
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (lightboxImg) lightboxImg.addEventListener("click", close);
    if (prevBtn) prevBtn.addEventListener("click", (e) => { e.stopPropagation(); move(-1); });
    if (nextBtn) nextBtn.addEventListener("click", (e) => { e.stopPropagation(); move(1); });
    lightbox.addEventListener("click", (ev) => { if (ev.target === lightbox) close(); });
  }

  function chooseBestSrc(img: HTMLImageElement): string {
    const ds = (img as HTMLImageElement & { dataset: DOMStringMap }).dataset;
    if (ds && ds.full) return ds.full;
    if (img.currentSrc) return img.currentSrc;
    return img.src || "";
  }

  function preserveSrcsetIfPresent(target: HTMLImageElement): void {
    if (!lightboxImg) return;
    const s = target.getAttribute("srcset");
    const sz = target.getAttribute("sizes");
    if (s) {
      lightboxImg.setAttribute("srcset", s);
      if (sz) lightboxImg.setAttribute("sizes", sz);
      else lightboxImg.removeAttribute("sizes");
    } else {
      lightboxImg.removeAttribute("srcset");
      lightboxImg.removeAttribute("sizes");
    }
  }

  function updateImg(): void {
    const target = galleryImages[currentIndex];
    if (!target || !lightboxImg || !lightboxCaption || !lightbox) return;
    lightboxImg.style.opacity = "0";
    lightboxCaption.style.opacity = "0";
    const srcToUse = chooseBestSrc(target);
    lightboxImg.src = srcToUse;
    lightboxImg.alt = target.alt || target.title || "View Image";
    lightboxCaption.innerText = getCaption(target);
    preserveSrcsetIfPresent(target);
    lightboxImg.onload = () => {
      lightboxImg && (lightboxImg.style.opacity = "1");
      lightboxCaption && (lightboxCaption.style.opacity = "1");
    };
  }

  function move(step: number): void {
    if (galleryImages.length <= 1) return;
    currentIndex = (currentIndex + step + galleryImages.length) % galleryImages.length;
    updateImg();
  }

  function openAt(index: number): void {
    if (!lightbox) createLightbox();
    if (!lightbox) return;
    currentIndex = index;
    updateImg();
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    isOpen = true;
    const closeBtn = lightbox.querySelector(".lb-close") as HTMLElement | null;
    if (closeBtn) closeBtn.focus();
  }

  function close(): void {
    if (!lightbox) return;
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    isOpen = false;
    setTimeout(() => {
      if (lightboxImg) {
        lightboxImg.src = "";
        lightboxImg.removeAttribute("srcset");
        lightboxImg.removeAttribute("sizes");
      }
    }, 260);
  }

  function init(): void {
    if (isMobile()) return;
    createLightbox();

    document.addEventListener("click", (e: MouseEvent) => {
      if (isMobile()) return;
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== "IMG") return;
      const clickedImg = target as HTMLImageElement;

      // Filter: Ukuran minimal DAN tidak mengandung suffix '-sm.webp'
      galleryImages = getValidImages().filter((img) => {
        const src = img.currentSrc || img.src || "";
        const isSmallFile = src.toLowerCase().includes(CONFIG.excludeSuffix);
        const naturalW = img.naturalWidth || 0;
        const domW = img.width || 0;

        return !isSmallFile && (naturalW >= CONFIG.minWidth || domW >= CONFIG.minWidth);
      });

      const idx = galleryImages.indexOf(clickedImg);
      if (idx === -1) return;

      const anchor = clickedImg.closest("a");
      if (anchor && CONFIG.showOnClickWithinLink) {
        e.preventDefault();
      }
      openAt(idx);
    });

    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!isOpen || isMobile()) return;
      if (e.key === "ArrowRight") { move(1); }
      else if (e.key === "ArrowLeft") { move(-1); }
      else if (e.key === "Escape" && CONFIG.closeOnEsc) { close(); }
    });

    window.addEventListener("resize", () => {
      if (!lightbox) return;
      if (isMobile() && isOpen) close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();