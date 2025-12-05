/* =======================================================
   IntenseDebate Ultimate Loader for <div id="comments">
   Fitur:
   - Lazy load ketika terlihat
   - Skeleton loading
   - Dark / Light mode otomatis
   - Fallback error + tombol Retry
   - Auto post_id & post_url
   ======================================================= */

window.idcomments_acct = "23216ee06306d52db2925fa891e29ba3"; // ganti jika perlu
window.idcomments_post_url = location.href;
window.idcomments_post_id = btoa(location.pathname); // auto id unik dari URL

// Loader eksternal JS
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

// Skeleton loading
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

// Fallback error
function showError(el, retryFunction) {
    el.innerHTML = `
        <div style="
            padding:15px;
            background:#ffe0e0;
            border:1px solid #ffb5b5;
            border-radius:10px;
            color:#a10000;
        ">
            ⚠ Komentar gagal dimuat.<br>
            <button id="retry-comments" style="
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

    document.getElementById("retry-comments").onclick = retryFunction;
}

// Dark/light mode otomatis
function applyColorMode() {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.style.setProperty("--id-bg", dark ? "#333" : "#f2f2f2");
}

// MAIN
async function initIntenseDebateComments() {
    applyColorMode();

    const box = document.getElementById("comments");
    if (!box) return;

    // Set skeleton loading
    showSkeleton(box);

    // Tambahkan elemen wajib IntenseDebate
    const titleSpan = document.createElement("span");
    titleSpan.id = "IDCommentsPostTitle";
    titleSpan.style.display = "none";
    box.appendChild(titleSpan);

    // Lazy load saat terlihat
    const observer = new IntersectionObserver(async (entries, obs) => {
        if (!entries[0].isIntersecting) return;

        obs.disconnect();

        async function loadComments() {
            try {
                await loadScript("https://www.intensedebate.com/js/genericCommentWrapperV2.js");
                await loadScript("https://www.intensedebate.com/js/genericLinkWrapperV2.js");

                // Hapus skeleton setelah loaded
                const sk = document.getElementById("id-skeleton");
                if (sk) sk.remove();
            } catch (err) {
                console.error("IntenseDebate Error:", err);
                showError(box, loadComments);
            }
        }

        loadComments();
    });

    observer.observe(box);
}

initIntenseDebateComments();

