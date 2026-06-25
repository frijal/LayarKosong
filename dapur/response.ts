// ----------------------------------------------------------
// FILE: /ext/disqus-loader.ts
// Versi V7.0 (Lazy Load + Auto Theme Sync)
// Updated: 2026-06-26
// ----------------------------------------------------------

(function (): void {
    const d = document;

    const container = d.getElementById("response") as HTMLElement | null;
    if (!container) return;

    // 2. Ambil URL halaman dari dataset atau location
    const url: string = container.dataset.href || window.location.href;

    // Tambahkan interface tipis-tipis biar TS nggak protes soal window.disqus_config dan DISQUS
    interface DisqusWindow extends Window {
        disqus_config?: () => void;
        DISQUS?: any;
    }

    const win = window as unknown as DisqusWindow;

    // 3. Fungsi untuk memuat Disqus pertama kali
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

    // 4. 🔥 FUNGSI BARU: Memaksa Disqus ganti baju (Reset Theme) secara dinamis
    function reloadDisqusTheme(): void {
        if (win.DISQUS) {
            win.DISQUS.reset({
                reload: true,
                config: function (this: any) {
                    this.page.url = url;
                    this.page.identifier = url;
                }
            });
        }
    }

    // 5. Logika Viewport (Lazy Load) menggunakan Intersection Observer
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

    // 6. 🔥 PASUKAN PENYELAMAT: Menguping prefers-color-scheme secara Real-Time
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        
        try {
            // Browser Modern
            mediaQuery.addEventListener("change", () => {
                reloadDisqusTheme();
            });
        } catch (e) {
            // Fallback untuk browser iOS / WebKit lama
            mediaQuery.addListener(() => {
                reloadDisqusTheme();
            });
        }
    }
})();
