// ----------------------------------------------------------
// FILE: /ext/disqus-loader.ts
// Versi V7.2 (Lazy Load + Strict Theme Enforcement)
// Updated: 2026-06-26
// ----------------------------------------------------------

(function (): void {
    const d = document;

    // Kunci ID: Tetap "response" sesuai script awal
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

    // Helper internal untuk mendeteksi Dark Mode secara realtime dari sistem
    const isDarkModeActive = (): boolean => {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    // 3. Fungsi untuk memuat Disqus
    function loadDisqus(): void {
        if (win.DISQUS) return;

        // Siapkan "panggung" untuk Disqus - ID tetap "disqus_thread" sesuai script awal
        container!.innerHTML = `<div id="disqus_thread"></div>`;

        // FORCE COMPUTED STYLE: Intervensi inline style pada #response sebelum embed.js meliriknya
        if (isDarkModeActive()) {
            container!.style.color = '#ffffff';
            container!.style.colorScheme = 'dark';
        } else {
            container!.style.color = '#121214';
            container!.style.colorScheme = 'light';
        }

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

    // Fungsi untuk memaksa Disqus memperbarui penampilannya jika tema berubah di tengah jalan
    function forceRefreshDisqusTheme(): void {
        if (win.DISQUS) {
            if (isDarkModeActive()) {
                container!.style.color = '#ffffff';
                container!.style.colorScheme = 'dark';
            } else {
                container!.style.color = '#121214';
                container!.style.colorScheme = 'light';
            }

            win.DISQUS.reset({
                reload: true,
                config: function (this: any) {
                    this.page.url = url;
                    this.page.identifier = url;
                }
            });
        }
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

    // 5. Pantau perubahan skema warna secara live di latar belakang
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        try {
            mediaQuery.addEventListener("change", forceRefreshDisqusTheme);
        } catch (e) {
            mediaQuery.addListener(forceRefreshDisqusTheme);
        }
    }
})();
