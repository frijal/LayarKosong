/**
 * Twikoo Loader for Layar Kosong
 * Versi: 1.7.13 (Patched & Optimized)
 * Target: #response
 */
(function() {
    const TWIKOO_ENV_ID = 'https://kom.dalam.web.id';
    const TWIKOO_CONTAINER_ID = '#response';
    const TWIKOO_CDN = 'https://cdn.jsdelivr.net/npm/twikoo@1.7.13/dist/twikoo.all.min.js';

    // 1. Cek Apakah Kontainer Komentar Ada di Halaman Ini
    // Jika tidak ada (misal di halaman utama/arsip), hentikan skrip agar hemat resource
    if (!document.querySelector(TWIKOO_CONTAINER_ID)) return;

    // 2. Fungsi untuk Memuat Script CDN Secara Aman
    function loadScript(url, callback) {
        // Cegah duplikasi suntikan script Twikoo ke dalam <head>
        if (document.querySelector(`script[src="${url}"]`)) {
            const checkExist = setInterval(() => {
                if (typeof twikoo !== 'undefined') {
                    clearInterval(checkExist);
                    callback();
                }
            }, 100);
            return;
        }
        
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = callback;
        document.head.appendChild(script);
    }

    // 3. Fungsi Inisialisasi Utama
    function initTwikoo() {
        if (typeof twikoo !== 'undefined') {
            
            // PENGAMAN TURNSTILE (Mencegah Error 300030 / Hung)
            // Jika skrip mendeteksi window.turnstile sudah ada dari pemuatan sebelumnya (efek PJAX/InstantClick),
            // kita bersihkan memorinya sejenak agar Twikoo bisa memuat ulang Turnstile dengan bersih.
            if (window.turnstile && document.querySelector('.cf-turnstile')) {
                try { window.turnstile.reset(); } catch(e) {}
            }

            twikoo.init({
                envId: TWIKOO_ENV_ID,
                el: TWIKOO_CONTAINER_ID,
                lang: 'id', // KUNCI UTAMA: Memaksa UX ke Bahasa Inggris agar bebas dari Bahasa Mandarin bawaan pabrik!
            });
            
            console.log('Twikoo 1.7.13 berhasil dimuat di #response dengan konfigurasi Bahasa Inggris.');
        }
    }

    // 4. Eksekusi Pemuatan
    if (typeof twikoo !== 'undefined') {
        initTwikoo();
    } else {
        loadScript(TWIKOO_CDN, initTwikoo);
    }
})();
