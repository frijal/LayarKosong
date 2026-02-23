(function () {
    const d = document;

    // 1. Cari kontainer utama (id="diskus")
    const container = d.getElementById("diskus");
    if (!container) return; 

    // 2. Ambil URL halaman
    const url = container.dataset.href || location.href;

    // 3. Fungsi untuk memuat Disqus
    function loadDisqus() {
        if (window.DISQUS) return;

        // Siapkan "panggung" untuk Disqus di dalam kontainer 'diskus'
        container.innerHTML = `<div id="disqus_thread"></div>`;

        window.disqus_config = function () {
            this.page.url = url;
            this.page.identifier = url;
        };

        const s = d.createElement("script");
        s.src = "https://layarkosong.disqus.com/embed.js";
        s.setAttribute("data-timestamp", +new Date());
        s.async = true;
        d.body.appendChild(s);
    }

    // 4. Logika Viewport (Lazy Load)
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                loadDisqus();
                // Matikan observer kalau sudah dimuat sekali
                observer.unobserve(container);
            }
        }, {
            rootMargin: "0px 0px 300px 0px" // Disqus dimuat pas jaraknya 300px lagi ke bawah (biar user gak nunggu)
        });

        observer.observe(container);
    } else {
        // Fallback buat browser jadul yang gak support Observer
        loadDisqus();
    }
})();
