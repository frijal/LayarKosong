/**
 * =================================================================================
 * Auto Lightbox Creator v4.0 (Optimized)
 * =================================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const CONFIG = {
    selectors: 'article img, main img, .image-grid img, .albumlb img, .gallery img, .artikel-gambar img',
    minWidth: 50,
    allowedExt: /\.(jpe?g|png|webp|avif)$/i,
    id: 'auto-lightbox'
  };


  let galleryImages = [];
  let currentIndex = 0;
  let lightbox, lightboxImg;

  // 1. Filter gambar yang valid saat halaman dimuat
  const refreshGallery = () => {
    const allImgs = document.querySelectorAll(CONFIG.selectors);
    galleryImages = Array.from(allImgs).filter(img => {
      const isWide = img.naturalWidth >= CONFIG.minWidth || img.width >= CONFIG.minWidth;
      const isAlt = img.src.split('?')[0];
      return isWide && CONFIG.allowedExt.test(isAlt);
    });

    // Set cursor pointer hanya ke gambar yang valid
    galleryImages.forEach(img => img.style.cursor = 'zoom-in');
  };

  const createLightbox = () => {
    if (document.getElementById(CONFIG.id)) return;

    lightbox = document.createElement('div');
    lightbox.id = CONFIG.id;
    // Pakai template literal agar lebih rapi
    lightbox.innerHTML = `
    <style>
    #${CONFIG.id} { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: none; align-items: center; justify-content: center; z-index: 100000; transition: opacity 0.3s; opacity: 0; }
    #${CONFIG.id}.open { display: flex; opacity: 1; }
    .lb-img { max-width: 95vw; max-height: 90vh; object-fit: contain; border-radius: 4px; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
    .lb-close { position: absolute; top: 20px; right: 25px; font-size: 35px; color: #fff; cursor: pointer; background: none; border: none; }
    .lb-nav { position: absolute; width: 100%; display: flex; justify-content: space-between; padding: 0 20px; pointer-events: none; }
    .lb-btn { pointer-events: auto; background: rgba(255,255,255,0.1); color: #fff; border: none; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; font-size: 20px; transition: 0.2s; }
    .lb-btn:hover { background: rgba(255,255,255,0.2); }
    </style>
    <button class="lb-close" aria-label="Close">&times;</button>
    <img class="lb-img" src="" alt="Lightbox">
    <div class="lb-nav">
    <button class="lb-btn lb-prev" aria-label="Previous">&#9664;</button>
    <button class="lb-btn lb-next" aria-label="Next">&#9654;</button>
    </div>
    `;

    document.body.appendChild(lightbox);
    lightboxImg = lightbox.querySelector('.lb-img');

    // Event Listeners Internal
    lightbox.querySelector('.lb-close').onclick = close;
    lightbox.querySelector('.lb-prev').onclick = (e) => { e.stopPropagation(); move(-1); };
    lightbox.querySelector('.lb-next').onclick = (e) => { e.stopPropagation(); move(1); };
    lightbox.onclick = (e) => { if(e.target === lightbox) close(); };
  };

  const updateImg = () => {
    const target = galleryImages[currentIndex];
    if (!target) return;
    // Gunakan data-full jika ada, kalau tidak pakai src asli
    lightboxImg.src = target.dataset.full || target.src;
  };

  const move = (step) => {
    currentIndex = (currentIndex + step + galleryImages.length) % galleryImages.length;
    updateImg();
  };

  const close = () => lightbox.classList.remove('open');

  // --- INIT ---
  refreshGallery();
  if (galleryImages.length < 1) return; // Jangan buat apapun jika tak ada gambar
  createLightbox();

  // Event Delegation: Pantau klik di seluruh body
  document.body.addEventListener('click', (e) => {
    const clickedImg = e.target.closest(CONFIG.selectors);
    if (clickedImg && galleryImages.includes(clickedImg)) {
      currentIndex = galleryImages.indexOf(clickedImg);
      updateImg();
      lightbox.classList.add('open');
    }
  });

  // Shortcut Keyboard
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'ArrowRight') move(1);
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'Escape') close();
  });
});
