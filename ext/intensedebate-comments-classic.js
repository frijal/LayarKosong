/* =======================================================
   IntenseDebate Ultimate Loader - Classic Compatible
   (Tanpa auto id/post_url, 100% seperti script asli)
   - Lazy load
   - Skeleton loading
   - Dark/Light mode
   - Error fallback
   ======================================================= */

// === Variabel original (WAJIB) ===
var idcomments_acct = "23216ee06306d52db2925fa891e29ba3";
var idcomments_post_id;
var idcomments_post_url;

// === Helper load script eksternal ===
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
    });
}

// === Skeleton Loading ===
function showSkeleton(el) {
    el.innerHTML = `
        <div id="id-skeleton" style="
            padding:15px;
            border-radius:12px;
            background:var(--id-bg);
            animation:pulse 1.6s infinite;
        ">
            <div style="height:20px;width:30%;background:#aaa;border-radius:6px;margin-bottom:8px;"></div>
            <div style="height:14px;background:#cfcfcf;border-radius:6px;margin-bottom:6px;"></div>
            <div style="height:14px;width:90%;background:#dcdcdc;border-radius:6px;"></div>
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

// === Error fallback ===
function showError(el, retryFn) {
    el.innerHTML = `
        <div style="
            padding:15px;
            background:#ffe0e0;
            border:1px solid #ffb5b5;
            border-radius:10px;
            color:#a10000;
        ">
            ⚠ Komentar gagal dimuat.<br>
            <button id="retry-btn" style="
                margin-top:10px;
                padding:8px 12px;
                background:#b10000;
                color:white;
                border:0;
                border-radius:6px;
                cursor:pointer;
            ">Coba Lagi</button>
        </div>
    `;

    document.getElementById("retry-btn").onclick = retryFn;
}

// === Dark/Light Mode ===
function applyTheme() {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.style.setProperty(
        "--id-bg",
        dark ? "#333" : "#f2f2f2"
    );
}

// === MAIN LOADER ===
async function loadIntenseDebate() {
    applyTheme();

    const box = document.getElementById("comments");
    if (!box) return;

    // Skeleton dulu
    showSkeleton(box);

    // Tambahkan <span> wajib IntenseDebate
    const span = document.createElement("span");
    span.id = "IDCommentsPostTitle";
    span.style.display = "none";
    box.appendChild(span);

    // Lazy load
    const observer = new IntersectionObserver(async (entries, obs) => {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();

        async function startLoad() {
            try {
                // === LOAD SCRIPT ASLI INTENSEDEBATE ===
                await loadScript("https://www.intensedebate.com/js/genericCommentWrapperV2.js");
                await loadScript("https://www.intensedebate.com/js/genericLinkWrapperV2.js");

                // Hapus skeleton
                const sk = document.getElementById("id-skeleton");
                if (sk) sk.remove();

            } catch (err) {
                console.error("IntenseDebate error:", err);
                showError(box, startLoad);
            }
        }

        startLoad();
    });

    observer.observe(box);
}

loadIntenseDebate();

