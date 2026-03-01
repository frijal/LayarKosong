// ----------------------------------------------------------
// FILE: /ext/disqus-loader.ts
// Versi V6.9 (Lazy Load Disqus)
// Updated: 2026-03-01
// ----------------------------------------------------------

(function (): void {
    const d = document;

    const container = d.getElementById("response") as HTMLElement | null;
    if (!container) return;

    // 2. Ambil URL halaman dari dataset atau location
    const url: string = container.dataset.href || window.location.href;

    // Tambahkan interface tipis-tipis biar TS nggak protes soal window.disqus_config
    interface DisqusWindow extends Window {
        disqus_config?: () => void;
        DISQUS?: any;
    }

    const win = window as unknown as DisqusWindow;

    // 3. Fungsi untuk memuat Disqus
    function loadDisqus(): void {
        if (win.DISQUS) return;

        // Siapkan "panggung" untuk Disqus
        container!.innerHTML = `<div id="disqus_thread"></div>`;

        win.disqus_config = function (this: any) {
            this.page.url = url;
            this.page.identifier = url;
        };

        const s: HTMLScriptElement = d.createElement("script");
        s.src = "https://layarkosong.disqus.com/embed.js";
        s.setAttribute("data-timestamp", (+new Date()).toString());
        s.async = true;
        d.body.appendChild(s);
    }

    // 4. Logika Viewport (Lazy Load) menggunakan Intersection Observer
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
            if (entries[0].isIntersecting) {
                loadDisqus();
                // Matikan observer kalau sudah dimuat sekali
                observer.unobserve(container!);
            }
        }, {
            rootMargin: "0px 0px 300px 0px" // Disqus dimuat pas jaraknya 300px sebelum masuk viewport
        });

        observer.observe(container!);
    } else {
        // Fallback buat browser purba
        loadDisqus();
    }
})();
