// intensedebate_official_script.js

(function() {
    // --- 1. Variabel Konfigurasi dari IntenseDebate ---
    // ID Akun Intensedebate Anda
    const ID_ACCT = '4ec6353c15b32bc16bbd904daf2b11ca';
    
    // Variabel post ID dan URL IntenseDebate diatur ke nilai halaman saat ini
    const ID_POST_URL = window.location.href;
    const ID_POST_ID = window.location.pathname; 

    // ID elemen kontainer IntenseDebate (IDComments adalah default)
    const ID_KONTEN_KOMENTAR = 'IDComments'; 
    // Catatan: Anda juga memiliki span id="IDCommentsPostTitle" di HTML Anda (disembunyikan oleh ID), 
    // yang akan digunakan secara otomatis oleh skrip ID saat dimuat.

    // --- 2. Sisipkan CSS Tombol (Tidak Berubah) ---
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
        .id_comment_link {
            text-decoration: none;
            color: inherit;
        }
    `;
    document.head.appendChild(style);

    // --- 3. Buat Tombol dan Kontainer Hitungan ---
    // Di HTML Anda, pastikan Anda memiliki: <div id="IDComments">...</div>
    const intenseDebateDiv = document.getElementById(ID_KONTEN_KOMENTAR);
    if (!intenseDebateDiv) return;

    // Sembunyikan kontainer IntenseDebate
    intenseDebateDiv.style.display = 'none';

    // Buat Tombol Komentar Utama
    const btn = document.createElement('button');
    btn.className = 'tombol-tanggapan';
    btn.innerHTML = '💬&nbsp;';
    
    // Kontainer Hitungan menggunakan IDCommentsLink agar dibaca oleh genericLinkWrapperV2.js
    const countLink = document.createElement('a');
    countLink.className = 'id_comment_link';
    countLink.id = 'IDCommentsLink'; 
    countLink.href = 'javascript:void(0);'; 
    
    const countSpan = document.createElement('span');
    countSpan.className = 'jumlah-tanggapan';
    countSpan.textContent = 'Tanggapan'; 
    countLink.appendChild(countSpan);
    
    btn.appendChild(countLink);
    intenseDebateDiv.parentNode.insertBefore(btn, intenseDebateDiv);


    // --- 4. Muat Skrip Hitungan (Link Wrapper) saat Idle ---
    function loadCountScript() {
        // Atur variabel global IntenseDebate untuk hitungan komentar
        window.idcomments_acct = ID_ACCT;
window.idcomments_post_id = ID_POST_ID.replace(/\//g, '_'); // <--- PENTING
        window.idcomments_post_url = ID_POST_URL;
        
        // Muat script resmi untuk hitungan komentar
        const countScript = document.createElement('script');
        countScript.src = 'https://www.intensedebate.com/js/genericLinkWrapperV2.js';
        countScript.type = 'text/javascript';
        countScript.async = true;
        document.head.appendChild(countScript);
    }
    
    if ('requestIdleCallback' in window) {
        requestIdleCallback(loadCountScript);
    } else {
        setTimeout(loadCountScript, 200);
    }

    // --- 5. Fungsi untuk memuat Embed Komentar saat tombol diklik ---
    let intenseDebateLoaded = false;
    function loadIntenseDebateEmbed() {
        if (intenseDebateLoaded) return;
        intenseDebateLoaded = true;

        // Tampilkan kontainer
        intenseDebateDiv.style.display = 'block';
        
        // Atur variabel global IntenseDebate untuk konten embed
        window.idcomments_acct = ID_ACCT;
        window.idcomments_post_id = ID_POST_ID;
        window.idcomments_post_url = ID_POST_URL;
        
        // Muat script resmi untuk konten komentar
        const s = document.createElement('script');
        s.src = 'https://www.intensedebate.com/js/genericCommentWrapperV2.js'; 
        
        s.setAttribute('data-timestamp', +new Date());
        (document.head || document.body).appendChild(s);

        // Hilangkan tombol setelah dimuat
        btn.remove();
    }

    btn.addEventListener('click', loadIntenseDebateEmbed);
})();
