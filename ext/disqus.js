// /ext/disqus.js
(function() {
  // 1. Buat elemen bingkai/tombol komentar (💬)
  const btn = document.createElement('button');
  btn.id = 'show-comments';
  
  // Perubahan: Tambahkan spasi non-breaking space (&nbsp;) antara ikon dan tempat angka
  btn.innerHTML = '💬&nbsp;'; 
  
  // Span untuk hitungan (sekarang akan terlihat)
  const countSpan = document.createElement('span');
  countSpan.className = 'disqus-comment-count';
  countSpan.setAttribute('data-disqus-identifier', window.location.pathname);
  // countSpan.style.display = 'none'; // Baris ini dihapus untuk menampilkan angka
  btn.appendChild(countSpan);
  
  // 2. CSS untuk Bingkai, Responsif, dan Dark/Light Theme
  
  // Tentukan warna default (Light Mode)
  let textColor = '#333';
  let borderColor = '#ccc';
  let hoverColor = '#0078ff';

  // Periksa preferensi tema pengguna (Dark Mode)
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    textColor = '#ddd';
   /* borderColor = '#555'; */
    hoverColor = '#66b3ff';
  }

  btn.style.cssText = `
    /* Flexbox untuk penataan ikon dan angka */
    display:inline-flex;
    align-items:center;
    justify-content:center; /* Perubahan: Mengatur konten di tengah horizontal */
    
    /* Tampilan Bingkai dan Adaptasi Tema */
    background:transparent; 
    color:${textColor}; 
  /*  border:2px solid ${borderColor};  */
/*    border-radius:8px; */
    
    /* Perubahan: Menggunakan unit viewport (vw) atau unit relatif besar, 
       atau lebih baik menggunakan properti 'inherit' atau '1.5rem' yang besar */
    font-size:1.5rem; 
    line-height:1;
    padding:10px 18px; /* Padding disesuaikan */
    cursor:pointer;
    transition:all 0.3s ease;
    
    /* Gaya lainnya */
    box-shadow:none;
    position:center;
    overflow:hidden;
    /* Pastikan tampilan responsive di mobile */
    min-width:60px; /* Ukuran sentuh yang lebih besar */
    height:auto; /* Tinggi disesuaikan dengan padding dan font */
  `;
  
  // Perubahan: Atur agar font size tombol mengikuti ukuran H1
  // Ini adalah cara yang lebih baik untuk mengikuti ukuran elemen lain
  const h1Element = document.querySelector('h1');
  if (h1Element) {
    btn.style.fontSize = getComputedStyle(h1Element).fontSize;
    btn.style.padding = '10px 18px'; // Sesuaikan padding agar terlihat bagus dengan font besar
  } else {
    // Jika H1 tidak ada, gunakan ukuran default besar yang responsif
    btn.style.fontSize = '1.5rem'; 
  }

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

  // Muat count.js di latar belakang
  const countScript = document.createElement('script');
  countScript.src = 'https://layarkosong.disqus.com/count.js';
  countScript.id = 'dsq-count-scr';
  countScript.async = true;
  document.head.appendChild(countScript);

  // ... (Fungsi loadDisqus dan event listener tetap sama)
  
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
