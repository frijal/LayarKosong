/**
 * =================================================================================
 * Auto Lightbox Creator v3.0 (Final)
 *
 * Deskripsi:
 * - Bekerja dalam dua mode: Melengkapi lightbox yang ada atau Membuat dari nol.
 * - Mendukung atribut `data-full` untuk gambar resolusi tinggi.
 * - [BARU] Lingkup pencarian dibatasi hanya di dalam <body>.
 * - [BARU] Hanya menyertakan gambar dengan ekstensi .jpg, .jpeg, .png, .webp.
 * =================================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // --- [KONFIGURASI UNIVERSAL] ---
  const CONFIG = {
    // [DIPERBARUI] Semua selector kini diawali dengan 'body'
    galleryImageSelectors: [
      'body .image-gallery img',
      'body .gallery-image',
      'body .gallery',
      'body .artikel-gambar',
      'body main .wp-block-image img',
      'body article img',
      'body main img'
    ],

    minImageWidth: 50,
    lightboxId: 'auto-generated-lightbox'
  };
  // -----------------------------

  const findElements = (selectors) => {
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) return elements;
    }
    return document.querySelectorAll('.non-existent-class-for-empty-nodelist');
  };

  // 1. Temukan dan filter semua gambar yang relevan
  const potentialImages = findElements(CONFIG.galleryImageSelectors);
  
  // [DIPERBARUI] Filter kini memeriksa lebar DAN ekstensi file
  const galleryImages = Array.from(potentialImages).filter(img => {
    const isWideEnough = img.naturalWidth >= CONFIG.minImageWidth || img.width >= CONFIG.minImageWidth;
    if (!isWideEnough) return false;

    const allowedExtensions = /\.(jpe?g|png|webp)$/i;
    const srcPath = img.src.split('?')[0];
    return allowedExtensions.test(srcPath);
  });
  
  let currentIndex = 0;

  // 2. [KONDISI UTAMA] Jika tidak cukup gambar valid, hentikan.
  if (galleryImages.length <= 2) {
    return;
  }

  if (document.getElementById(CONFIG.lightboxId)) {
    return;
  }

  let lightbox, lightboxImage;

  const createLightboxHTML = () => {
    lightbox = document.createElement('div');
    lightbox.id = CONFIG.lightboxId;
    lightbox.className = 'auto-lightbox-overlay';
    const closeButton = document.createElement('button');
    closeButton.className = 'auto-lightbox-close';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = closeLightbox;
    lightboxImage = document.createElement('img');
    lightboxImage.className = 'auto-lightbox-image';
    const navContainer = document.createElement('div');
    navContainer.className = 'auto-lightbox-nav';
    const prevButton = document.createElement('button');
    prevButton.className = 'auto-lightbox-nav-btn prev';
    prevButton.innerHTML = '&#9664;';
    prevButton.onclick = showPrevImage;
    const nextButton = document.createElement('button');
    nextButton.className = 'auto-lightbox-nav-btn next';
    nextButton.innerHTML = '&#9654;';
    nextButton.onclick = showNextImage;
    navContainer.appendChild(prevButton);
    navContainer.appendChild(nextButton);
    lightbox.appendChild(closeButton);
    lightbox.appendChild(lightboxImage);
    lightbox.appendChild(navContainer);
    document.body.appendChild(lightbox);
  };

  const injectStyles = () => {
    const style = document.createElement('style');
    style.id = 'auto-lightbox-styles';
    style.innerHTML = `
      .auto-lightbox-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); display: none; align-items: center; justify-content: center; z-index: 99999; }
      .auto-lightbox-overlay.open { display: flex; }
      .auto-lightbox-image { max-width: 90vw; max-height: 85vh; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); }
      .auto-lightbox-close { position: absolute; top: 15px; right: 20px; font-size: 2.5rem; color: white; background: transparent; border: none; cursor: pointer; line-height: 1; }
      .auto-lightbox-nav { position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); display: flex; justify-content: space-between; padding: 0 1rem; pointer-events: none; }
      .auto-lightbox-nav-btn { font-size: 2rem; background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; cursor: pointer; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; user-select: none; pointer-events: auto; }
    `;
    document.head.appendChild(style);
  };

  const openLightbox = (index) => {
    currentIndex = index;
    updateLightboxImage();
    lightbox.classList.add('open');
  };

  const closeLightbox = () => {
    lightbox.classList.remove('open');
  };

  const updateLightboxImage = () => {
    const targetImage = galleryImages[currentIndex];
    let imageUrl = targetImage.dataset.full || targetImage.src;
    imageUrl = imageUrl.replace(/\/s\d+(-c)?\//, '/s0/');
    lightboxImage.src = imageUrl;
  };

  const showNextImage = () => {
    currentIndex = (currentIndex + 1) % galleryImages.length;
    updateLightboxImage();
  };

  const showPrevImage = () => {
    currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    updateLightboxImage();
  };

  const init = () => {
    createLightboxHTML();
    injectStyles();
    galleryImages.forEach((img, index) => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', () => {
        openLightbox(index);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'ArrowRight') showNextImage();
      if (e.key === 'ArrowLeft') showPrevImage();
      if (e.key === 'Escape') closeLightbox();
    });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  };

  init();
});
