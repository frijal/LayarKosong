(function () {
    const d = document;

    // Menentukan target kontainer (id="diskus")
    const container = d.getElementById("diskus");
    if (!container) return; 

    // Ambil URL otomatis dari dataset atau current URL
    const url = container.dataset.href || location.href;

    // Set tampilan awal kontainer
    container.innerHTML = `<div id="disqus_thread"></div>`;

    // Konfigurasi dan Load Disqus
    function loadDisqus() {
        if (window.DISQUS) return;

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

    // Langsung jalankan fungsi muat komentar
    loadDisqus();
})();
