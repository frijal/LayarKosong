// intensedebate.js (Versi modifikasi)
(function() {
    // ID akun IntenseDebate Anda
    const INTENSEDEBATE_ACCOUNT = '4ec6353c15b32bc16bbd904daf2b11ca';

    // ID elemen kontainer IntenseDebate
    const ID_KONTEN_KOMENTAR = 'IDComments'; // IntenseDebate menggunakan ID ini secara default
    
    // --- Langkah 1: Sisipkan CSS Tombol (Sama seperti sebelumnya) ---
    const style = document.createElement('style');
    style.textContent = `
        :root {
            /* Light mode defaults */
            --warna-teks-tombol: #222;
            --warna-bg-tombol: #f5f5f5;
            --warna-border-tombol: #ccc;
            --warna-hover-tombol: #e0e0e0;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                /* Dark mode overrides */
                --warna-teks-tombol: #eee;
                --warna-bg-tombol: #333;
                --warna-border-tombol: #555;
                --warna-hover-tombol: #444;
            }
        }
        .tombol-tanggapan {
            background-color: var(--warna-bg-tombol);
            border: 1px solid var(--warna-border-tombol);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--warna-teks-tombol);
            font-size: inherit;
            line-height: 1;
            padding: 6px 10px;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.3s, color 0.3s;
        }
        .tombol-tanggapan:hover {
            background-color: var(--warna-hover-tombol);
        }
        .jumlah-tanggapan {
            margin-left: 4px;
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);

    // --- Langkah 2: Buat Tombol Komentar ---
    const btn = document.createElement('button');
    btn.className = 'tombol-tanggapan';
    btn.innerHTML = '💬&nbsp;';

    // Span untuk hitungan komentar
    const countSpan = document.createElement('span');
    countSpan.className = 'jumlah-tanggapan';
    // Catatan: IntenseDebate tidak menggunakan class 'disqus-comment-count',
    // dan menghitung komentar biasanya dilakukan oleh script utamanya,
    // atau memerlukan penyesuaian khusus jika menggunakan skema lazy load.
    // Untuk saat ini, kita akan biarkan kosong.
    btn.appendChild(countSpan);

    // Sisipkan tombol sebelum kolom komentar (Ganti disqus_thread menjadi IDComments)
    const intenseDebateDiv = document.getElementById(ID_KONTEN_KOMENTAR);
    if (intenseDebateDiv) {
        // Sembunyikan kontainer IntenseDebate
        intenseDebateDiv.style.display = 'none';
        intenseDebateDiv.parentNode.insertBefore(btn, intenseDebateDiv);
    } else {
        // Keluar jika kontainer utama tidak ditemukan
        return;
    }

    // --- Langkah 3: Muat Skrip Hitungan (Count Script) ---
    // IntenseDebate biasanya memuat script utamanya untuk menghitung komentar
    // jika Anda menggunakannya di luar skema lazy load. Karena kita lazy load,
    // bagian hitungan mungkin tidak berfungsi secara optimal tanpa modifikasi
    // pada skrip bawaan IntenseDebate. Untuk sementara, kita skip bagian 'count.js' 
    // dan langsung fokus ke pemuatan utama.

    // --- Langkah 4: Fungsi untuk memuat IntenseDebate saat tombol diklik ---
    let intenseDebateLoaded = false;
    function loadIntenseDebate() {
        if (intenseDebateLoaded) return;
        intenseDebateLoaded = true;

        // **PENTING: Variabel Konfigurasi IntenseDebate**
        // IntenseDebate menggunakan variabel global berbeda dari Disqus.
        // Konfigurasi IntenseDebate biasanya diatur melalui objek global IDComments.
        window.IDComments = {
            // URL Halaman (Opsional, IntenseDebate biasanya mendeteksi secara otomatis)
            page_url: window.location.href, 
            // ID Akun Wajib
            account: INTENSEDEBATE_ACCOUNT,
            // ID Kontainer Komentar
            code: ID_KONTEN_KOMENTAR, 
        };
        
        // Tampilkan kontainer
        intenseDebateDiv.style.display = 'block';

        // Muat script IntenseDebate
        const s = document.createElement('script');
        s.src = `https://www.intensedebate.com/js/genericCommentWrapperV2.js`;
        s.setAttribute('data-timestamp', +new Date());
        (document.head || document.body).appendChild(s);

        // Hilangkan tombol
        btn.remove();
    }

    btn.addEventListener('click', loadIntenseDebate);
})();
