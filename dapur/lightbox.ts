/**
 * lightbox.ts
 * Auto Lightbox (TypeScript, Bun-build friendly)
 * - Read-only to original DOM (does not wrap or replace <img>)
 * - Compatible with <picture>, srcset, sizes, data-full workflows
 * - Accessible controls, keyboard navigation, mobile-safe
 * - Designed to be built with: bun build lightbox.ts --outfile lightbox.js --minify --format iife --target browser
 */

(() => {
  type Config = {
    selectors: string;
    minWidth: number;
    mobileBreakpoint: number;
    allowedExt: RegExp;
    id: string;
    closeOnEsc: boolean;
    showOnClickWithinLink: boolean;
  };

  const CONFIG: Config = {
    selectors:
    "article img, main img, picture img, .image-grid img, .albumlb img, .gallery img, .artikel-gambar img",
 minWidth: 50,
 mobileBreakpoint: 768,
 allowedExt: /\.(jpe?g|png|webp|avif|svg)$/i,
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

  // Smart caption: alt > title > figcaption > filename
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
    .lb-close:focus { outline: 2px solid rgba(255,255,255,0.12); }
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

    // Close when clicking backdrop
    lightbox.addEventListener("click", (ev) => {
      if (ev.target === lightbox) close();
    });
  }

  function chooseBestSrc(img: HTMLImageElement): string {
    // Priority: data-full > currentSrc (browser-chosen from srcset) > src
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

    // Prepare UI
    lightboxImg.style.opacity = "0";
    lightboxCaption.style.opacity = "0";

    // Choose best src and set attributes
    const srcToUse = chooseBestSrc(target);
    lightboxImg.src = srcToUse;
    lightboxImg.alt = target.alt || target.title || "View Image";
    lightboxCaption.innerText = getCaption(target);

    // If target had srcset/sizes, preserve them for lightbox image (helps high-res)
    preserveSrcsetIfPresent(target);

    // When loaded, fade in
    lightboxImg.onload = () => {
      lightboxImg && (lightboxImg.style.opacity = "1");
      lightboxCaption && (lightboxCaption.style.opacity = "1");
    };

    // Preload neighbor images (best-effort)
    const nextIndex = (currentIndex + 1) % galleryImages.length;
    const prevIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    [nextIndex, prevIndex].forEach((i) => {
      const img = galleryImages[i];
      if (!img) return;
      const url = (img as HTMLImageElement & { dataset: DOMStringMap }).dataset.full || img.currentSrc || img.src;
      if (!url) return;
      const p = new Image();
      p.src = url;
    });
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
    // trap focus on close button for accessibility
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
    // Do not initialize on small screens (configurable)
    if (isMobile()) return;
    createLightbox();

    // Delegated click handler
    document.addEventListener("click", (e: MouseEvent) => {
      if (isMobile()) return;

      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== "IMG") return;

      // Ensure clicked image matches selector
      try {
        if (!target.matches(CONFIG.selectors)) return;
      } catch {
        // Fallback: check presence in NodeList
        const all = document.querySelectorAll(CONFIG.selectors);
        if (!Array.prototype.includes.call(all, target)) return;
      }

      const clickedImg = target as HTMLImageElement;

      // Build fresh gallery list (supports lazy-loaded or dynamically injected images)
      galleryImages = getValidImages().filter((img) => {
        const pathToCheck = img.currentSrc || img.src || "";
        return CONFIG.allowedExt.test(pathToCheck.split("?")[0]);
      });

      // Validate dimensions (prefer naturalWidth)
      const naturalW = clickedImg.naturalWidth || 0;
      const domW = clickedImg.width || 0;
      if (naturalW < CONFIG.minWidth && domW < CONFIG.minWidth) return;

      // Determine index
      const idx = galleryImages.indexOf(clickedImg);
      if (idx === -1) return;

      // If image is inside a link, prevent navigation but allow lightbox
      const anchor = clickedImg.closest("a");
      if (anchor && CONFIG.showOnClickWithinLink) {
        e.preventDefault();
      }

      openAt(idx);
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!isOpen || isMobile()) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        move(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "Escape" && CONFIG.closeOnEsc) {
        e.preventDefault();
        close();
      }
    });

    // Close if window resized to mobile
    window.addEventListener("resize", () => {
      if (!lightbox) return;
      if (isMobile() && isOpen) close();
    });

      // Observe DOM for newly added images (optional, lightweight)
      try {
        const observer = new MutationObserver((mutations) => {
          // If new images are added that match selectors, refresh gallery on next click
          for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length > 0) {
              // no-op: gallery is rebuilt on click, so nothing heavy here
              break;
            }
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      } catch {
        // ignore if MutationObserver not available
      }
  }

  // Auto-init when DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
