// /ext/disqus.js
(function() {
  // 🔹 Fungsi untuk menentukan warna tombol sesuai tema
  function applyTheme(btn) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      btn.style.background = '#333';
      btn.style.color = '#f1f1f1';
      btn.style.boxShadow = '0 4px 10px rgba(255,255,255,0.1)';
    } else {
      btn.style.background = '#0078ff';
      btn.style.color = '#fff';
      btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
    }
  }

  // 🔹 Buat elemen tombol komentar
  const btn = document.createElement('button');
  btn.id = 'show-comments';
  btn.innerHTML = '💬 <span class="disqus-comment-count" data-disqus-identifier="' + window.location.pathname + '">0</span> Komentar';
  btn.style.cssText = `
    display:inline-flex;
    align-items:center;
    gap:6px;
    font-size:1rem;
    padding:10px 18px;
    border:none;
    border-radius:9999px;
    cursor:pointer;
    transition:all 0.3s ease;
    position:relative;
    overflow:hidden;
  `;

  // Terapkan warna awal sesuai tema
  applyTheme(btn);

  // 🔹 Efek hover animasi lembut
  btn.addEventListener('mouseover', () => {
    btn.style.transform = 'scale(1.05)';
  });
  btn.addEventListener('mouseout', () => {
    btn.style.transform = 'scale(1)';
  });

  // 🔹 Masukkan tombol sebelum kolom komentar
  const disqusDiv = document.getElementById('disqus_thread');
  if (disqusDiv) {
    disqusDiv.style.display = 'none';
    disqusDiv.parentNode.insertBefore(btn, disqusDiv);
  }

  // 🔹 Muat count.js agar jumlah komentar muncul
  const countScript = document.createElement('script');
  countScript.src = 'https://layarkosong.disqus.com/count.js';
  countScript.id = 'dsq-count-scr';
  countScript.async = true;
  document.head.appendChild(countScript);

  // 🔹 Fungsi konfigurasi Disqus
  window.disqus_config = function () {
    this.page.url = window.location.href;
    this.page.identifier = window.location.pathname;
  };

  // 🔹 Fungsi untuk memuat embed Disqus saat tombol diklik
  let disqusLoaded = false;
  function loadDisqus() {
    if (disqusLoaded) return;
    disqusLoaded = true;

    // Efek animasi muncul untuk komentar
    disqusDiv.style.display = 'block';
    disqusDiv.style.opacity = '0';
    disqusDiv.style.transition = 'opacity 0.6s ease';
    setTimeout(() => disqusDiv.style.opacity = '1', 10);

    // Muat script embed Disqus
    const s = document.createElement('script');
    s.src = 'https://layarkosong.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (document.head || document.body).appendChild(s);

    // Tombol menghilang dengan animasi lembut
    btn.style.transition = 'all 0.5s ease';
    btn.style.transform = 'scale(0.9)';
    btn.style.opacity = '0';
    setTimeout(() => btn.remove(), 500);
  }

  btn.addEventListener('click', loadDisqus);

  // 🔹 Pantau perubahan tema sistem secara realtime
  const themeWatcher = window.matchMedia('(prefers-color-scheme: dark)');
  themeWatcher.addEventListener('change', () => applyTheme(btn));
})();
