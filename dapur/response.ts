/**
 * Twikoo Loader for Layar Kosong
 * Versi: 1.7.13
 * Target: #response
 */
(function() {
    const TWIKOO_ENV_ID = 'https://kom.dalam.web.id';
    const TWIKOO_CONTAINER_ID = '#response';
    const TWIKOO_CDN = 'https://cdn.jsdelivr.net/npm/twikoo@1.7.13/dist/twikoo.all.min.js';

    // Fungsi untuk memuat script
    function loadScript(url, callback) {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = callback;
        document.head.appendChild(script);
    }

    // Fungsi inisialisasi
    function initTwikoo() {
        if (typeof twikoo !== 'undefined') {
            twikoo.init({
                envId: TWIKOO_ENV_ID,
                el: TWIKOO_CONTAINER_ID,
            });
            console.log('Twikoo 1.7.13 muncul di #response!');
        }
    }

    // Cek apakah library sudah ada, kalau belum, load
    if (typeof twikoo !== 'undefined') {
        initTwikoo();
    } else {
        loadScript(TWIKOO_CDN, initTwikoo);
    }
})();
