(function() {
    const d = document, w = window, e = d.getElementById("graphcomment"); 
    if (!e) return;

    e.style.display = "none";

    // ... (Logika pembuatan tombol tetap sama) ...
    const b = d.createElement("button");
    b.style.cssText = "padding:6px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;background-color:white;cursor:pointer;margin-bottom:12px";
    b.textContent = "Lihat Komentar"; 
    
    e.parentNode.insertBefore(b, e);

    let L = 0;
    b.onclick = function() {
        if (L) return;
        L = 1;

        e.style.display = "block";

        // 1. DEFINISI GLOBAL UNTUK GRAPHCOMMENT
        // Variabel harus didefinisikan secara global agar script loader bisa melihatnya.
        w.__semio__params = { 
            graphcommentId: "layarkosong", // GANTI jika ID Anda berbeda
            behaviour: {
                // PENTING: ID permanen untuk pemetaan URL
                uid: location.pathname, 
            },
        };
        
        // 2. Loader GraphComment
        function __semio__onload() {
            w.__semio__gc_graphlogin_amp(w.__semio__params); // Panggil fungsi dengan variabel global
        }

        const gc = d.createElement('script'); gc.type = 'text/javascript'; gc.async = true;
        gc.onload = __semio__onload; gc.defer = true; 
        gc.src = 'https://integration.graphcomment.com/gc_graphlogin_amp.js?' + Date.now();
        (d.getElementsByTagName('head')[0] || d.getElementsByTagName('body')[0]).appendChild(gc);

        b.remove();
    };
})();
