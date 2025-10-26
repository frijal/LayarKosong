/*
  =============================================================
  HEADER LOADER (ALL-IN-ONE)
  Skrip ini akan secara otomatis:
  1. Memuat semua dependensi CSS (Font, Ikon, header.css) ke <head>.
  2. Memuat header.html ke dalam <div id="header-placeholder">.
  3. Menambahkan class 'header-dimuat' ke <body> untuk padding.
  =============================================================
*/

/**
 * Fungsi helper untuk membuat dan menyisipkan tag <link> ke <head>.
 * @param {string} href - URL ke stylesheet
 * @param {string} rel - Tipe rel (misal: 'stylesheet', 'preconnect')
 * @param {string|null} crossOrigin - Nilai crossOrigin (misal: 'anonymous')
 */
function injectLink(href, rel, crossOrigin = null) {
  const link = document.createElement('link');
  link.href = href;
  link.rel = rel;
  if (crossOrigin) {
    link.crossOrigin = crossOrigin;
  }
  document.head.appendChild(link);
}

// --- BAGIAN 1: INJEKSI CSS & FONT ---
// (Ini berjalan segera, tidak perlu menunggu DOM)

// 1. Muat Google Fonts (preconnect)
injectLink('https://fonts.googleapis.com', 'preconnect');
injectLink('https://fonts.gstatic.com', 'preconnect', 'anonymous');

// 2. Muat Google Fonts (stylesheet)
injectLink(
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap',
  'stylesheet'
);

// 3. Muat Font Awesome (ikon)
injectLink(
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
  'stylesheet'
);

// 4. Muat file header.css Anda
//    Pastikan file ini ada di folder yang sama!
injectLink('ext/header.css', 'stylesheet');

// --- BAGIAN 2: INJEKSI HTML & CLASS BODY ---
// (Ini menunggu DOM siap)
document.addEventListener('DOMContentLoaded', () => {
  // 1. Ambil file header.html
  fetch('ext/header.html')
    .then((response) => {
      if (!response.ok) {
        // Jika file tidak ditemukan (error 404) atau error server
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then((data) => {
      // 2. Masukkan HTML header ke dalam placeholder
      const placeholder = document.getElementById('header-placeholder');
      if (placeholder) {
        placeholder.innerHTML = data;
      } else {
        // Beri peringatan jika placeholder tidak ada
        console.error("Elemen dengan ID 'header-placeholder' tidak ditemukan.");
      }

      // 3. Tambahkan class ke <body> untuk padding (didefinisikan di header.css)
      document.body.classList.add('header-dimuat');
    })
    .catch((error) => {
      // Tangani error jika fetch gagal (misal file tidak ada, server mati)
      console.error('Gagal memuat header:', error);
      const placeholder = document.getElementById('header-placeholder');
      if (placeholder) {
        // Tampilkan pesan error di halaman agar mudah di-debug
        placeholder.innerHTML =
          '<p style="color:red; text-align:center; padding: 2rem;">Oops! Gagal memuat header. Pastikan file header.html ada di folder yang sama.</p>';
      }
    });
});


