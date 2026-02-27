(function () {
    const d = document;

// ==============================================
    // ⚡ INTEGRASI GOOGLE SWG (SWG Basic)
    // Diletakkan di awal agar dijalankan di setiap halaman.
    // ==============================================

    // 1. Deteksi tema user secara otomatis (Dark/Light)
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const swgTheme = isDark ? "dark" : "light";

    // 2. Memuat library swg-basic.js secara dinamis
    const swgScript = d.createElement("script");
    swgScript.async = true;
    swgScript.type = "application/javascript";
    swgScript.src = "https://news.google.com/swg/js/v1/swg-basic.js";
    // Memasukkan script ke dalam <head>
    d.head.appendChild(swgScript); 

    // 3. Inisialisasi konfigurasi SwG (Adaptive Theme)
    (self.SWG_BASIC = self.SWG_BASIC || []).push( basicSubscriptions => {
      basicSubscriptions.init({
        type: "NewsArticle",
        isPartOfType: ["Product"],
        isPartOfProductId: "CAowztjDDA:openaccess",
        clientOptions: { 
            theme: swgTheme, // Menggunakan variabel deteksi otomatis
            lang: "id" 
        },
      });
    });

    // ==============================================
    // 💬 KODE KOMENTAR FACEBOOK & DISQUS (Hanya berjalan jika kontainer ada)
    // ==============================================
    const container = d.getElementById("pesbukdiskus");
    // Jika kontainer diskusi tidak ditemukan, script di bawah ini akan berhenti (return)
    if (!container) return; 

    // --------------------------------------------------
    // INITIAL HTML (tabs + hidden comment boxes)
    // --------------------------------------------------
    container.innerHTML = `
        <div style="margin-bottom:12px;">
            <button id="btn-fb" style="padding:6px 12px; margin-right:6px; cursor:pointer;">Facebook</button>
            <button id="btn-dsq" style="padding:6px 12px; cursor:pointer;">Disqus</button>
        </div>
        <div id="fb-box" style="display:none; margin-bottom:12px;"></div>
        <div id="dsq-box" style="display:none; margin-bottom:12px;"></div>
    `;

    const btnFB = d.getElementById("btn-fb");
    const btnDSQ = d.getElementById("btn-dsq");
    const fbBox = d.getElementById("fb-box");
    const dsqBox = d.getElementById("dsq-box");

    // --------------------------------------------------
    // Create fb-root only once
    // --------------------------------------------------
    if (!d.getElementById("fb-root")) {
        const fbroot = d.createElement("div");
        fbroot.id = "fb-root";
        d.body.prepend(fbroot);
    }

    // --------------------------------------------------
    // Auto URL detection
    // --------------------------------------------------
    const url = container.dataset.href || location.href;

    // --------------------------------------------------
    // Load Facebook SDK
    // --------------------------------------------------
function loadFacebook(callback) {
    if (window.FB) return callback && callback();
    const s = d.createElement("script");
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    // Menggunakan v18.0 agar lebih aman
    s.src = "https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v25.0&appId=175216696195384";
    s.onload = () => {
        // Pastikan FB sudah terinisialisasi
        if (window.FB) {
            FB.init({
                appId: '175216696195384',
                xfbml: true,
                version: 'v25.0'
            });
            callback && callback();
        }
    };
    d.body.appendChild(s);
}

    // --------------------------------------------------
    // Load Disqus
    // --------------------------------------------------
    function loadDisqus(callback) {
        if (window.DISQUS) return callback && callback();

        window.disqus_config = function () {
            this.page.url = url;
            this.page.identifier = url;
        };

        const s = d.createElement("script");
        s.src = "https://layarkosong.disqus.com/embed.js";
        s.setAttribute("data-timestamp", +new Date());
        s.async = true;
        s.onload = () => callback && callback();
        d.body.appendChild(s);
    }

    // --------------------------------------------------
    // Event handlers
    // --------------------------------------------------
btnFB.onclick = function () {
    dsqBox.style.display = "none";
    fbBox.style.display = "block";

    if (!fbBox.dataset.loaded) {
        fbBox.dataset.loaded = "1";
        // Gunakan URL absolut untuk testing jika di localhost
        const finalUrl = url.includes('http') ? url : 'https://dalam.web.id'; 
        
        fbBox.innerHTML = `
            <div class="fb-comments"
                data-href="${finalUrl}"
                data-width="100%"
                data-numposts="5">
            </div>
        `;
        
        loadFacebook(() => {
            // Beri sedikit delay agar DOM siap sebelum di-parse
            setTimeout(() => {
                if (window.FB) FB.XFBML.parse(fbBox);
            }, 100);
        });
    }
};

    btnDSQ.onclick = function () {
        fbBox.style.display = "none";
        dsqBox.style.display = "block";

        if (!dsqBox.dataset.loaded) {
            dsqBox.dataset.loaded = "1";
            dsqBox.innerHTML = `<div id="disqus_thread"></div>`;
            loadDisqus();
        }
    };

    // Optional: show Facebook tab by default
    btnFB.click();
})();
