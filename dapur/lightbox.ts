/**
 * =================================================================================
 * Auto Lightbox Creator v4.3 (Final Bun-Ready)
 * =================================================================================
 */

(() => {
  // Interface untuk TypeScript agar Bun Build lebih mantap
  interface Config {
    selectors: string;
    minWidth: number;
    mobileBreakpoint: number;
    allowedExt: RegExp;
    id: string;
  }

  const CONFIG: Config = {
    selectors: 'article img, main img, .image-grid img, .albumlb img, .gallery img, .artikel-gambar img',
 minWidth: 50,
 mobileBreakpoint: 768, // Nonaktif di layar < 768px
 allowedExt: /\.(jpe?g|png|webp|avif)$/i,
 id: 'auto-lightbox'
  };

  let galleryImages: HTMLImageElement[] = [];
  let currentIndex: number = 0;
  let lightbox: HTMLElement | null = null;
  let lightboxImg: HTMLImageElement | null = null;
  let lightboxCaption: HTMLElement | null = null;

  const isMobile = (): boolean => window.innerWidth < CONFIG.mobileBreakpoint;

  // Fungsi Smart Caption: Alt > Title > Figcaption > Filename
  const getCaption = (img: HTMLImageElement): string => {
    if (img.alt?.trim()) return img.alt;
    if (img.title?.trim()) return img.title;
    const figCaption = img.closest('figure')?.querySelector('figcaption');
    if (figCaption) return (figCaption as HTMLElement).innerText;
    const filename = img.src.split('/').pop()?.split('?')[0].split('.')[0] || "View Image";
    return decodeURIComponent(filename).replace(/[-_]/g, ' ');
  };

  const getValidImages = (): HTMLImageElement[] => {
    return Array.from(document.querySelectorAll(CONFIG.selectors)) as HTMLImageElement[];
  };

  const createLightbox = (): void => {
    if (document.getElementById(CONFIG.id)) return;

    lightbox = document.createElement('div');
    lightbox.id = CONFIG.id;
    lightbox.innerHTML = `
    <style>
    #${CONFIG.id} { position: fixed; inset: 0; background: rgba(0,0,0,0.95); display: none; align-items: center; justify-content: center; z-index: 100000; transition: opacity 0.3s; opacity: 0; backdrop-filter: blur(10px); font-family: sans-serif; }
    #${CONFIG.id}.open { display: flex; opacity: 1; }
    .lb-content { position: relative; display: flex; flex-direction: column; align-items: center; }
    .lb-img { max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 4px; box-shadow: 0 0 30px rgba(0,0,0,0.8); cursor: zoom-out; transition: opacity 0.3s; }
    .lb-caption { color: #ccc; margin-top: 15px; font-size: 14px; text-align: center; max-width: 80%; line-height: 1.4; letter-spacing: 0.5px; text-transform: capitalize; transition: opacity 0.3s; }
    .lb-close { position: absolute; top: 20px; right: 25px; font-size: 40px; color: #fff; cursor: pointer; background: none; border: none; z-index: 10; line-height: 1; transition: 0.2s; }
    .lb-close:hover { transform: scale(1.2); color: #ff4d4d; }
    .lb-nav { position: absolute; width: 100%; display: flex; justify-content: space-between; padding: 0 30px; pointer-events: none; top: 50%; transform: translateY(-50%); }
    .lb-btn { pointer-events: auto; background: rgba(255,255,255,0.05); color: #fff; border: none; width: 60px; height: 60px; border-radius: 50%; cursor: pointer; font-size: 24px; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
    .lb-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
    @media (max-width: ${CONFIG.mobileBreakpoint - 1}px) { #${CONFIG.id} { display: none !important; } }
    </style>
    <button class="lb-close" title="Close">&times;</button>
    <div class="lb-content">
    <img class="lb-img" src="" alt="View">
    <div class="lb-caption"></div>
    </div>
    <div class="lb-nav">
    <button class="lb-btn lb-prev">❮</button>
    <button class="lb-btn lb-next">❯</button>
    </div>`;

    document.body.appendChild(lightbox);
    lightboxImg = lightbox.querySelector('.lb-img') as HTMLImageElement;
    lightboxCaption = lightbox.querySelector('.lb-caption') as HTMLElement;

    (lightbox.querySelector('.lb-close') as HTMLElement).onclick = close;
    lightboxImg.onclick = close;
    (lightbox.querySelector('.lb-prev') as HTMLElement).onclick = (e) => { e.stopPropagation(); move(-1); };
    (lightbox.querySelector('.lb-next') as HTMLElement).onclick = (e) => { e.stopPropagation(); move(1); };
    lightbox.onclick = (e) => { if(e.target === lightbox) close(); };
  };

  const updateImg = (): void => {
    const target = galleryImages[currentIndex];
    if (!target || !lightboxImg || !lightboxCaption) return;
    lightboxImg.style.opacity = '0';
    lightboxCaption.style.opacity = '0';
    lightboxImg.src = target.dataset.full || target.src;
    lightboxCaption.innerText = getCaption(target);
    lightboxImg.onload = () => {
      if (lightboxImg) lightboxImg.style.opacity = '1';
      if (lightboxCaption) lightboxCaption.style.opacity = '1';
    };
  };

  const move = (step: number): void => {
    if (galleryImages.length <= 1) return;
    currentIndex = (currentIndex + step + galleryImages.length) % galleryImages.length;
    updateImg();
  };

  const close = (): void => {
    if(!lightbox) return;
    lightbox.classList.remove('open');
    setTimeout(() => { if(lightboxImg) lightboxImg.src = ''; }, 300);
  };

  const init = (): void => {
    if (isMobile()) return;
    createLightbox();

    document.addEventListener('click', (e: MouseEvent) => {
      if (isMobile()) return;
      const clickedImg = (e.target as HTMLElement).closest(CONFIG.selectors) as HTMLImageElement;
      if (!clickedImg) return;

      // Refresh list saat klik agar gambar baru (lazy load) tetap masuk
      galleryImages = getValidImages().filter(img => {
        const isAlt = img.src.split('?')[0];
        return CONFIG.allowedExt.test(isAlt);
      });

      if (clickedImg.naturalWidth < CONFIG.minWidth && clickedImg.width < CONFIG.minWidth) return;
      currentIndex = galleryImages.indexOf(clickedImg);
      if (currentIndex === -1) return;

      updateImg();
      lightbox?.classList.add('open');
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!lightbox || !lightbox.classList.contains('open') || isMobile()) return;
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'Escape') close();
    });
  };

  // Jalankan tanpa menunggu DOMContentLoaded jika sudah siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
