// /ext/disqus.js
(function() {
  // 1. Buat elemen tombol komentar
  const btn = document.createElement('button');
  btn.id = 'show-comments';
  
  // Konten: Ikon 💬 diikuti spasi (&nbsp;) dan tempat angka
  btn.innerHTML = '💬&nbsp;'; 
  
  // Span untuk hitungan
  const countSpan = document.createElement('span');
  countSpan.className = 'disqus-comment-count';
  countSpan.setAttribute('data-disqus-identifier', window.location.pathname);
  btn.appendChild(countSpan);
  
  // 2. CSS untuk Transparansi, Posisi Tengah, Adaptasi Tema, dan Font Inherit
  
  // Tentukan warna default (Light Mode)
  let textColor = '#333';
  let hoverColor = '#0078ff';

  // Periksa preferensi tema pengguna (Dark Mode)
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    textColor = '#ddd';
    hoverColor = '#66b3ff';
  }

  btn.style.cssText = `
    /* Hapus Bingkai & Background */
    background:transparent; 
    border:none; 
    
    /* Flexbox untuk penataan ikon dan angka */
    display:inline-flex;
    align-items:center;
    justify-content:center;
    
    /* Adaptasi Tema & Teks */
    color:${textColor}; 
    border-radius:0; 
    
    /* Perubahan: Menggunakan font-size: inherit */
    font-size:inherit; 
    line-height:1;
    padding:5px 8px; /* Padding minimal agar mudah diklik */
    cursor:pointer;
    transition:all 0.3s ease;
    
    /* Gaya lainnya */
    box-shadow:none;
    position:relative;
    overflow:hidden;
  `;
  
  // ❌ Logika pencarian h1 dihilangkan, karena font-size sudah inherit.
  
  // Efek hover sederhana (hanya perubahan warna teks)
  btn.addEventListener('mouseover', () => {
    btn.style.color = hoverColor;
  });
  btn.addEventListener('mouseout', () => {
    btn.style.color = textColor;
  });

  // Masukkan tombol di atas kolom komentar Disqus
  const disqusDiv = document.getElementById('disqus_thread');
  if (disqusDiv) {
    disqusDiv.style.display = 'none';
    disqusDiv.parentNode.insertBefore(btn, disqusDiv);
  }

  // Muat count.js di latar belakang
  const countScript = document.createElement('script');
  countScript.src = 'https://layarkosong.disqus.com/count.js';
  countScript.id = 'dsq-count-scr';
  countScript.async = true;
  document.head.appendChild(countScript);

  // Fungsi untuk memuat embed Disqus saat tombol diklik
  let disqusLoaded = false;
  function loadDisqus() {
    if (disqusLoaded) return;
    disqusLoaded = true;

    // Konfigurasi Disqus
    window.disqus_config = function () {
      this.page.url = window.location.href;
      this.page.identifier = window.location.pathname;
    };
    
    // Animasi transisi muncul
    disqusDiv.style.display = 'block';
    disqusDiv.style.opacity = '0';
    disqusDiv.style.transition = 'opacity 0.6s ease';
    setTimeout(() => disqusDiv.style.opacity = '1', 10);

    // Muat script embed
    const s = document.createElement('script');
    s.src = 'https://layarkosong.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (document.head || document.body).appendChild(s);

    // Sembunyikan tombol
    btn.style.transition = 'all 0.5s ease';
    btn.style.transform = 'scale(0.9)';
    btn.style.opacity = '0';
    setTimeout(() => btn.remove(), 500);
  }

  btn.addEventListener('click', loadDisqus);
})();
