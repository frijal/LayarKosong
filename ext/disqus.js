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
  
  // 2. CSS untuk Transparansi, Posisi Tengah, dan Font/Warna Inherit
  
  // ❌ Variabel hoverColor telah dihapus karena tidak lagi digunakan.

  btn.style.cssText = `
    /* Hapus Bingkai & Background */
    background:transparent; 
    border:none; 
    
    /* Flexbox untuk penataan ikon dan angka */
    display:inline-flex;
    align-items:center;
    justify-content:center;
    
    /* Warna teks menggunakan inherit */
    color:inherit; 
    border-radius:0; 
    
    /* Font size juga menggunakan inherit */
    font-size:inherit; 
    line-height:1;
    padding:5px 8px; 
    cursor:pointer;
    transition:all 0.3s ease; /* Transisi dipertahankan untuk animasi klik */
    
    /* Gaya lainnya */
    box-shadow:none;
    position:relative;
    overflow:hidden;
  `;
  
  // ❌ Fungsi hover (btn.addEventListener('mouseover')) telah dihilangkan.
  // ❌ Fungsi mouseout (btn.addEventListener('mouseout')) telah dihilangkan.

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
