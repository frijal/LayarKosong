// /ext/disqus.js
(function() {
  // 1. Buat elemen bingkai/tombol komentar (💬)
  const btn = document.createElement('button');
  btn.id = 'show-comments';
  
  // Hanya menampilkan ikon 💬. Span hitungan disembunyikan secara visual.
  btn.innerHTML = '💬'; 
  
  // Span untuk hitungan (tetap diperlukan agar count.js tahu data mana yang akan di-update)
  const countSpan = document.createElement('span');
  countSpan.className = 'disqus-comment-count';
  countSpan.setAttribute('data-disqus-identifier', window.location.pathname);
  countSpan.style.display = 'none'; // Sembunyikan angka hitungan
  btn.appendChild(countSpan);
  
  // 2. CSS untuk Bingkai, Responsif, dan Dark/Light Theme
  
  // Tentukan warna default (Light Mode)
  let textColor = '#333';
  let borderColor = '#ccc';
  let hoverColor = '#0078ff';

  // Periksa preferensi tema pengguna (Dark Mode)
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    textColor = '#ddd';
    borderColor = '#555';
    hoverColor = '#66b3ff';
  }

  btn.style.cssText = `
    /* Flexbox untuk penataan ikon */
    display:inline-flex;
    align-items:center;
    justify-content:center;
    
    /* Tampilan Bingkai dan Adaptasi Tema */
    background:transparent; 
    color:${textColor}; 
    border:2px solid ${borderColor}; /* Warna border adaptif */
    border-radius:8px; 
    
    /* Pengaturan umum dan responsif */
    font-size:1.2rem; /* Ukuran ikon relatif */
    line-height:1;
    padding:8px 10px; /* Padding yang lebih kecil untuk ikon saja */
    cursor:pointer;
    transition:all 0.3s ease;
    
    /* Gaya lainnya */
    box-shadow:none;
    position:relative;
    overflow:hidden;
    /* Pastikan tampilan responsive di mobile */
    min-width:40px; 
    height:40px;
  `;

  // Efek hover sederhana (adaptif)
  btn.addEventListener('mouseover', () => {
    btn.style.borderColor = hoverColor;
    btn.style.color = hoverColor;
  });
  btn.addEventListener('mouseout', () => {
    btn.style.borderColor = borderColor;
    btn.style.color = textColor;
  });

  // Masukkan tombol di atas kolom komentar Disqus
  const disqusDiv = document.getElementById('disqus_thread');
  if (disqusDiv) {
    disqusDiv.style.display = 'none';
    disqusDiv.parentNode.insertBefore(btn, disqusDiv);
  }

  // Muat count.js di latar belakang, *sebelum* diklik, agar jumlahnya bisa dihitung
  // Meskipun angkanya disembunyikan, skrip ini perlu dimuat agar data Disqus siap.
  const countScript = document.createElement('script');
  countScript.src = 'https://layarkosong.disqus.com/count.js';
  countScript.id = 'dsq-count-scr';
  countScript.async = true;
  document.head.appendChild(countScript);

  // 3. Fungsi untuk memuat embed Disqus saat tombol diklik (Fungsi Kedua)
  let disqusLoaded = false;
  function loadDisqus() {
    if (disqusLoaded) return;
    disqusLoaded = true;

    // Konfigurasi Disqus (sesuai permintaan Anda)
    window.disqus_config = function () {
      this.page.url = window.location.href;
      this.page.identifier = window.location.pathname;
    };
    
    // Animasi transisi muncul untuk kolom komentar
    disqusDiv.style.display = 'block';
    disqusDiv.style.opacity = '0';
    disqusDiv.style.transition = 'opacity 0.6s ease';
    setTimeout(() => disqusDiv.style.opacity = '1', 10);

    // Muat script embed (fungsi kedua)
    const s = document.createElement('script');
    s.src = 'https://layarkosong.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (document.head || document.body).appendChild(s);

    // Sembunyikan tombol dengan animasi keluar (agar tombol menghilang)
    btn.style.transition = 'all 0.5s ease';
    btn.style.transform = 'scale(0.9)';
    btn.style.opacity = '0';
    setTimeout(() => btn.remove(), 500);
  }

  // Klik tombol => buka komentar
  btn.addEventListener('click', loadDisqus);
})();
