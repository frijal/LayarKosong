// /ext/disqus.js
(function() {
  // Buat elemen tombol/bingkai komentar
  const btn = document.createElement('button');
  btn.id = 'show-comments';
  
  // Perubahan: Menggunakan elemen <span> terpisah untuk teks agar mudah diatur tata letaknya
  // dan mempertahankan ikon 💬 diikuti spasi sebelum angka.
  btn.innerHTML = '💬&nbsp;<span class="disqus-comment-count" data-disqus-identifier="' + window.location.pathname + '">0</span> Komentar';
  
  btn.style.cssText = `
    display:inline-flex;
    align-items:center;
    gap:6px; /* Memberikan jarak antar elemen */
    
    /* Tampilan Bingkai */
    background:transparent; /* Latar belakang transparan */
    color:#333; /* Warna teks gelap */
    border:2px solid #ccc; /* Border sebagai bingkai */
    border-radius:8px; /* Radius sudut untuk tampilan bingkai */
    
    /* Pengaturan umum dan responsif */
    font-size:1rem; /* Ukuran font relatif untuk responsif */
    padding:10px 18px; 
    cursor:pointer;
    transition:all 0.3s ease;
    
    /* Hilangkan efek bayangan dan posisi agar lebih seperti bingkai konten */
    box-shadow:none;
    position:relative;
    overflow:hidden;
  `;

  // Efek hover sederhana (jika diperlukan)
  btn.addEventListener('mouseover', () => {
    btn.style.borderColor = '#0078ff'; // Ubah warna border saat hover
    btn.style.color = '#0078ff'; // Ubah warna teks saat hover
  });
  btn.addEventListener('mouseout', () => {
    btn.style.borderColor = '#ccc'; // Kembalikan warna border
    btn.style.color = '#333'; // Kembalikan warna teks
  });

  // Masukkan tombol di atas kolom komentar
  const disqusDiv = document.getElementById('disqus_thread');
  if (disqusDiv) {
    disqusDiv.style.display = 'none';
    disqusDiv.parentNode.insertBefore(btn, disqusDiv);
  }

  // Muat count.js agar jumlah komentar muncul
  const countScript = document.createElement('script');
  countScript.src = 'https://layarkosong.disqus.com/count.js';
  countScript.id = 'dsq-count-scr';
  countScript.async = true;
  document.head.appendChild(countScript);

  // Fungsi konfigurasi Disqus
  window.disqus_config = function () {
    this.page.url = window.location.href;
    this.page.identifier = window.location.pathname;
  };

  // Fungsi untuk memuat embed Disqus saat tombol diklik
  let disqusLoaded = false;
  function loadDisqus() {
    if (disqusLoaded) return;
    disqusLoaded = true;

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

    // Sembunyikan tombol dengan animasi keluar
    btn.style.transition = 'all 0.5s ease';
    btn.style.transform = 'scale(0.9)';
    btn.style.opacity = '0';
    setTimeout(() => btn.remove(), 500);
  }

  // Klik tombol => buka komentar
  btn.addEventListener('click', loadDisqus);
})();
