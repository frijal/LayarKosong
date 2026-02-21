(function () {
    const d = document, w = window;

    // ==============================================
    // ⚡ INTEGRASI GOOGLE SWG (Tetap jalan di awal)
    // ==============================================
    const isDark = w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)').matches;
    const swgTheme = isDark ? "dark" : "light";

    const swgScript = d.createElement("script");
    swgScript.async = true;
    swgScript.src = "https://news.google.com/swg/js/v1/swg-basic.js";
    d.head.appendChild(swgScript); 

    (self.SWG_BASIC = self.SWG_BASIC || []).push(b => {
        b.init({
            type: "NewsArticle",
            isPartOfType: ["Product"],
            isPartOfProductId: "CAowztjDDA:openaccess",
            clientOptions: { theme: swgTheme, lang: "id" },
        });
    });

    // ==============================================
    // 💬 LOGIKA DISQUS (ID Baru: "diskus")
    // ==============================================
    const container = d.getElementById("diskus"); // ID Baru di sini
    const thread = d.getElementById("disqus_thread");
    
    if (!container || !thread) return;

    // Sembunyikan thread komentar di awal
    thread.style.display = "none";

    // Buat Tombol Interaktif
    const btn = d.createElement("button");
    btn.style.cssText = "padding:8px 14px; font-size:14px; border:1px solid #ccc; border-radius:6px; background-color:white; cursor:pointer; margin-bottom:12px; font-family:inherit; transition: 0.2s;";
    
    // Efek Hover Sederhana
    btn.onmouseover = () => btn.style.borderColor = "#999";
    btn.onmouseout = () => btn.style.borderColor = "#ccc";

    const countSpan = d.createElement("span");
    countSpan.className = "disqus-comment-count";
    countSpan.dataset.disqusIdentifier = location.pathname;
    countSpan.textContent = "Loading comments..."; 
    
    btn.innerHTML = "💬 "; 
    btn.appendChild(countSpan);
    
    // Sisipkan tombol sebelum thread
    container.insertBefore(btn, thread);

    // Muat Script Count (Jumlah Komentar)
    function loadCount() {
        const x = d.createElement("script");
        x.src = "https://layarkosong.disqus.com/count.js";
        x.async = true;
        x.id = "dsq-count-scr";
        d.head.appendChild(x);
    }
    "requestIdleCallback" in w ? requestIdleCallback(loadCount) : setTimeout(loadCount, 300);

    // Event Klik: Muat Disqus Utuh
    let isLoaded = false;
    btn.onclick = function () {
        if (isLoaded) return;
        isLoaded = true;

        thread.style.display = "block";

        w.disqus_config = function () {
            this.page.url = container.dataset.href || location.href;
            this.page.identifier = location.pathname;
        };

        const x = d.createElement("script");
        x.src = "https://layarkosong.disqus.com/embed.js";
        x.setAttribute("data-timestamp", Date.now());
        d.body.appendChild(x);

        btn.remove(); // Hapus tombol setelah diklik
    };
})();
