(function () {
    const d = document, w = window;
    const wrap = d.getElementById("metype");
    if (!wrap) return;

    // sembunyikan widget dulu
    wrap.style.display = "none";

    // ----------------------------------------------------
    // 1. Tombol pemicu (mirip seperti contoh Disqus)
    // ----------------------------------------------------
    const btn = d.createElement("button");
    btn.style.cssText =
        "padding:6px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;background-color:white;cursor:pointer;margin-bottom:12px";

    const count = d.createElement("span");
    count.id = "metype-comment-count-text";
    count.textContent = "Komentar…";

    btn.appendChild(count);
    wrap.parentNode.insertBefore(btn, wrap);

    // ----------------------------------------------------
    // 2. Load komentar count (ringan)
    // ----------------------------------------------------
    function loadCount() {
        // Metype tidak punya count.js, jadi kita panggil iframe count mini
        const url = encodeURIComponent(location.href);
        const account = "1004249";

        fetch(`https://www.metype.com/api/v1/comments/count?account_id=${account}&url=${url}`)
            .then(r => r.json())
            .then(j => {
                count.textContent = `${j.count || 0} Komentar`;
            })
            .catch(() => {
                count.textContent = "Komentar";
            });
    }

    "requestIdleCallback" in w
        ? requestIdleCallback(loadCount)
        : setTimeout(loadCount, 200);

    // ----------------------------------------------------
    // 3. Lazy-load Metype widget ketika tombol diklik
    // ----------------------------------------------------
    let loaded = false;

    btn.onclick = function () {
        if (loaded) return;
        loaded = true;

        // tampilkan widget container
        wrap.style.display = "block";

        // isi container
        wrap.innerHTML = `
            <div id="metype-comments"
                data-metype-account-id="1004249"
                data-metype-host="https://www.metype.com/">
            </div>

            <div id="metype-reactions"
                data-metype-account-id="1004249"
                data-metype-host="https://www.metype.com/">
            </div>

            <div id="metype-contributions"
                data-metype-account-id="1004249"
                data-metype-host="https://www.metype.com/">
            </div>
        `;

        // load script metype.js asli
        const s = d.createElement("script");
        s.src = "https://www.metype.com/quintype-metype/assets/metype.js";
        s.async = true;
        d.body.appendChild(s);

        // setelah metype.js siap → pasang widget
        window.talktype = window.talktype || function (f) {
            if (talktype.loaded) f();
            else (talktype.q = talktype.q || []).push(arguments);
        };

        talktype(function () {
            const pageUrl = location.href;
            const accountId = "1004249";
            const host = "https://www.metype.com/";

            // metadata minimal
            const meta = { title: document.title, url: pageUrl };
            talktype.pageMetadataSetter(accountId, pageUrl, meta, host);

            // comments
            const c = d.getElementById("metype-comments");
            c.setAttribute("data-metype-page-url", pageUrl);
            talktype.commentWidgetIframe(c);

            // reactions
            const r = d.getElementById("metype-reactions");
            r.setAttribute("data-metype-page-url", pageUrl);
            talktype.pageReactionsIframe(r);

            // contributions
            const u = d.getElementById("metype-contributions");
            talktype.contributionWidgetIframe(u);
        });

        // hapus tombol
        btn.remove();
    };
})();

