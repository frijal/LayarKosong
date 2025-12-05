/* ============================================
   JS-Kit Comments Ultimate Loader
   - Lazy load
   - Dark/Light mode auto
   - Skeleton loading
   - Graceful error fallback
   ============================================ */

function loadJSKit(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
    });
}

function addSkeleton(el) {
    el.innerHTML = `
        <div id="jskit-skeleton" style="
            padding:15px;
            border-radius:10px;
            background:var(--jsk-bg);
            animation:pulse 1.6s infinite;
        ">
            <div style="height:20px;width:40%;background:#bbb;border-radius:6px;margin-bottom:10px;"></div>
            <div style="height:14px;background:#cfcfcf;border-radius:6px;margin-bottom:6px;"></div>
            <div style="height:14px;width:85%;background:#dadada;border-radius:6px;"></div>
        </div>

        <style>
        @keyframes pulse {
            0% {opacity:.6;}
            50% {opacity:.3;}
            100% {opacity:.6;}
        }
        </style>
    `;
}

function showError(el) {
    el.innerHTML = `
        <div style="
            padding:15px;
            border-radius:8px;
            background:#ffe0e0;
            color:#a10000;
            border:1px solid #ffb5b5;
        ">
            ⚠ Komentar gagal dimuat.  
            Silakan refresh atau coba lagi nanti.
        </div>
    `;
}

function setColorMode() {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.style.setProperty(
        "--jsk-bg",
        dark ? "#2b2b2b" : "#f3f3f3"
    );
}

async function initJSKitComments() {
    setColorMode();

    const box = document.getElementById("comments");
    if (!box) return;

    // Default attributes
    box.classList.add("js-kit-comments");
    box.setAttribute("label", "Tinggalkan Komentar");
    box.setAttribute("permalink", window.location.href);

    // Skeleton tampil dulu
    addSkeleton(box);

    // Lazy Load on scroll
    const observer = new IntersectionObserver(async (entries, obs) => {
        if (!entries[0].isIntersecting) return;

        obs.disconnect();

        try {
            await loadJSKit("https://js-kit.com/comments.js");
            const sk = document.getElementById("jskit-skeleton");
            if (sk) sk.remove();
        } catch (err) {
            console.error("JS-Kit load error:", err);
            showError(box);
        }
    });

    observer.observe(box);
}

// Jalankan
initJSKitComments();

