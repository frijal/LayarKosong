/**
 * Takoio Loader for Layar Kosong
 * Versi: 1.0 (Berdasarkan Official README)
 * Target: #response
 */
(function() {
    // 1. Konfigurasi Utama
    const TAKOIO_ENV_ID = 'https://komm.dalam.web.id'; // Ganti dengan custom domain kalau sudah di-set (misal: https://kom.dalam.web.id)
const TAKOIO_CONTAINER_ID = '#response';

// 2. Resource CDN Resmi Takoio (dari README)
const VUE_CDN = 'https://unpkg.com/vue@3/dist/vue.global.prod.js';
const TAKOIO_CDN_JS = 'https://unpkg.com/takoio/dist/takoio.min.js';
const TAKOIO_CDN_CSS = 'https://unpkg.com/takoio/dist/takoio.min.css';

// Cek apakah kontainer komentar ada di halaman ini
if (!document.querySelector(TAKOIO_CONTAINER_ID)) return;

// 3. Muat File CSS Takoio
if (!document.querySelector(`link[href="${TAKOIO_CDN_CSS}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = TAKOIO_CDN_CSS;
    document.head.appendChild(link);
}

// 4. Fungsi Pemuat Script Berurutan (Promise Based)
function loadScript(url, globalVarName) {
    return new Promise((resolve, reject) => {
        // Cek apakah script sudah termuat sebelumnya
        if (window[globalVarName]) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Gagal memuat ${url}`));
        document.head.appendChild(script);
    });
}

// 5. Fungsi Inisialisasi Utama
function initTakoio() {
    // PENGAMAN TURNSTILE
    if (window.turnstile && document.querySelector('.cf-turnstile')) {
        try { window.turnstile.reset(); } catch(e) {}
    }

    takoio.init({
        envId: TAKOIO_ENV_ID,
        el: TAKOIO_CONTAINER_ID,
        lang: 'en', // Sesuai docs, ini valid untuk maksa UX ke bahasa Inggris
    });

    console.log('Takoio berhasil mengudara di Layar Kosong! 🚀');
}

// 6. Eksekusi Pemuatan Berantai
// Muat Vue dulu, setelah selesai baru muat Takoio, baru jalankan inisialisasi
loadScript(VUE_CDN, 'Vue')
.then(() => loadScript(TAKOIO_CDN_JS, 'takoio'))
.then(() => initTakoio())
.catch((error) => console.error('Waduh, ada kendala:', error));
})();
