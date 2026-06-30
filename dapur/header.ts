/**
 * =============================================================
 * HEADER LOADER v4.3 (TypeScript Edition)
 * =============================================================
 */

/**
 * Fungsi helper untuk membuat dan menyisipkan tag <link> ke <head>.
 */
function injectLink(href: string, rel: string, crossOrigin: string | null = null): void {
    const link = document.createElement('link');
    link.href = href;
    link.rel = rel;
    if (crossOrigin) {
        link.crossOrigin = crossOrigin;
    }
    document.head.appendChild(link);
}

// --- BAGIAN 1: INJEKSI CSS & FONT ---
// (Berjalan langsung tanpa menunggu DOM agar font/CSS termuat lebih cepat)

// 1. Muat Google Fonts (preconnect)
injectLink('https://fonts.googleapis.com', 'preconnect');
injectLink('https://fonts.gstatic.com', 'preconnect', 'anonymous');

// 2. Muat Google Fonts (stylesheet)
injectLink(
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap',
    'stylesheet'
);

// 3. Muat Font Awesome & Header CSS (Gunakan root-relative path)
injectLink('/ext/fontawesome.css', 'stylesheet');
injectLink('/ext/header.css', 'stylesheet');

// --- BAGIAN 2: INJEKSI HTML & CLASS BODY ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil file header-logo-atas.html
    // Kita tambahkan ekstensi .html secara eksplisit agar fetch lebih pasti
    fetch('/ext/header-logo-atas.html')
        .then((response: Response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then((data: string) => {
            // 2. Masukkan HTML header ke dalam placeholder
            const placeholder = document.getElementById('header-placeholder') as HTMLElement | null;

            if (placeholder) {
                placeholder.innerHTML = data;
                // 3. Tambahkan class ke <body> setelah header berhasil dimasukkan
                document.body.classList.add('header-dimuat');
            } else {
                console.warn("Elemen #header-placeholder tidak ditemukan di HTML.");
            }
        })
        .catch((error: Error) => {
            console.error('Gagal memuat header:', error);
            const placeholder = document.getElementById('header-placeholder');
            if (placeholder) {
                placeholder.innerHTML = `
                    <p style="color:red; text-align:center; padding: 2rem; font-family:sans-serif;">
                        [Error: Gagal memuat header.]<br>
                        <small>Pastikan file <b>/ext/header-logo-atas.html</b> tersedia.</small>
                    </p>`;
            }
        });
});
