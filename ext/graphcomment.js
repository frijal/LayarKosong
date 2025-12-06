(function() {
    // 1. Ambil kontainer GraphComment
    const d = document, w = window, e = d.getElementById("graphcomment"); 
    if (!e) return;

    e.style.display = "none";

    // 2. Buat Tombol Pemuatan Komentar
    const b = d.createElement("button");
    b.style.cssText = "padding:6px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;background-color:white;cursor:pointer;margin-bottom:12px";
    
    // HILANGKAN: Menghapus hitungan komentar karena GraphComment tidak mendukung hitungan yang sederhana.
    b.textContent = "tombol komentar, klik disini..."; 
    
    e.parentNode.insertBefore(b, e);

    let L = 0;
    b.onclick = function() {
        if (L) return;
        L = 1;

        e.style.display = "block";

        // 3. Konfigurasi GraphComment (Mengganti disqus_config)
        var __semio__params = {
            graphcommentId: "layarkosong", // GANTI jika ID Anda berbeda
            behaviour: {
                // PENTING: Menggunakan location.pathname sebagai ID unik (seperti identifier di Disqus)
                // PASTIKAN location.pathname UNIK untuk setiap artikel!
                uid: location.pathname, 
            },
        };
        
        // 4. Loader GraphComment (Mengganti embed.js)
        function __semio__onload() {
            __semio__gc_graphlogin_amp(__semio__params);
        }

        const gc = d.createElement('script'); gc.type = 'text/javascript'; gc.async = true;
        gc.onload = __semio__onload; gc.defer = true; 
        gc.src = 'https://integration.graphcomment.com/gc_graphlogin_amp.js?' + Date.now();
        (d.getElementsByTagName('head')[0] || d.getElementsByTagName('body')[0]).appendChild(gc);

        b.remove(); // Hapus tombol setelah diklik
    };
})();
