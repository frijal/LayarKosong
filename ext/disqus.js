var disqus_config = function () {
    this.page.url = window.location.href;
    this.page.identifier = window.location.pathname;

    // --- LOGIKA DETEKSI TEMA START ---

    // 1. Definisikan Skema Warna Dasar
    var textColorForDark = '#ffffff'; // Teks Putih untuk Dark Mode
    var textColorForLight = '#333333'; // Teks Hitam Gelap untuk Light Mode
    var bgColorForDark = '#1a1a1a'; // Latar Belakang Gelap (sesuaikan dengan warna latar website Anda)
    var bgColorForLight = '#ffffff'; // Latar Belakang Terang

    // 2. Deteksi preferensi tema sistem pengguna
    var isDarkModeActive = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    var textColor = isDarkModeActive ? textColorForDark : textColorForLight;
    var bgColor = isDarkModeActive ? bgColorForDark : bgColorForLight;
    
    // --- LOGIKA DETEKSI TEMA END ---

    // 3. Inject CSS ke dalam Disqus dengan warna yang sudah ditentukan
    this.config.injectCss = `
        /* Warna teks komentar utama */
        .post-body p, 
        .comment-header, 
        .publisher-nav {
            color: ${textColor} !important;
        }

        /* Warna tautan (link) agar terlihat jelas */
        a {
            color: ${isDarkModeActive ? '#90CAF9' : '#1a73e8'} !important; 
        }

        /* Latar Belakang Disqus agar sesuai */
        body, .thread, .comment-box {
            background-color: ${bgColor} !important;
        }

        /* Pastikan elemen UI lain yang mungkin berwarna gelap ikut direset jika dark mode */
        .header, .footer {
            background-color: ${bgColor} !important;
            color: ${textColor} !important;
        }
    `;

    // OPSIONAL: Mengaktifkan mode warna bawaan Disqus berdasarkan deteksi
    this.config.colorScheme = isDarkModeActive ? 'dark' : 'light';
};

(function() { // JANGAN EDIT DI BAWAH BARIS INI
var d = document, s = d.createElement('script');
s.src = 'https://layarkosong.disqus.com/embed.js';
s.setAttribute('data-timestamp', +new Date());
(d.head || d.body).appendChild(s);
})();
