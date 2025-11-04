(function() {
  // 🔹 Fungsi: Sesuaikan gaya tombol agar cocok dengan tema situs
  function applyTheme(btn) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isBodyDark = document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');

    if (isDark || isBodyDark) {
      btn.style.color = 'var(--text-color, #f1f1f1)';
      btn.style.borderColor = 'var(--text-color, #f1f1f1)';
    } else {
      btn.style.color = 'var(--text-color, #111)';
      btn.style.borderColor = 'var(--text-color, #111)';
    }
  }

  // 🔹 Buat tombol komentar minimalis
  const btn = document.createElement('button');
  btn.id = 'show-comments';
  btn.innerHTML = '💬 <span class="disqus-comment-count" data-disqus-identifier="' + window.location.pathname + '"></span>';
  btn.style.cssText = `
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:4px;
    font: inherit;
    font-size:1.1rem;
    padding:8px 14px;
    border:1.5px solid currentColor;
    border-radius:9999px;
    background:transparent;
    cursor:pointer;
    transition:all 0.25s ease;
    position:relative;
    overflow:hidden;
  `;

  applyTheme(btn);

  // Efek hover lembut
  btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
  btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');

  // 🔹 Bungkus tombol agar di tengah halaman
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display:flex;
    justify-content:center;
    align-items:center;
    margin:2rem 0;
  `;
  wrapper.appendChild(btn);

  // 🔹 Sembunyikan area komentar Disqus
  const disqusDiv = document.getElementById('disqus_thread');
  if (disqusDiv) {
    disqusDiv.style.display = 'none';
    disqusDiv.parentNode.insertBefore(wrapper, disqusDiv);
  }

  // 🔹 Muat count.js (menampilkan jumlah komentar)
  const countScript = document.createElement('script');
  countScript.src = 'https://layarkosong.disqus.com/count.js';
  countScript.id = 'dsq-count-scr';
  countScript.async = true;
  document.head.appendChild(countScript);

  // 🔹 Konfigurasi Disqus
  window.disqus_config = function () {
    this.page.url = window.location.href;
    this.page.identifier = window.location.pathname;
  };

  // 🔹 Klik tombol untuk memuat komentar
  let disqusLoaded = false;
  function loadDisqus() {
    if (disqusLoaded) return;
    disqusLoaded = true;

    disqusDiv.style.display = 'block';
    disqusDiv.style.opacity = '0';
    disqusDiv.style.transition = 'opacity 0.6s ease';
    setTimeout(() => disqusDiv.style.opacity = '1', 10);

    const s = document.createElement('script');
    s.src = 'https://layarkosong.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (document.head || document.body).appendChild(s);

    wrapper.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    wrapper.style.transform = 'scale(0.9)';
    wrapper.style.opacity = '0';
    setTimeout(() => wrapper.remove(), 400);
  }

  btn.addEventListener('click', loadDisqus);

  // 🔹 Perbarui tema otomatis
  const themeWatcher = window.matchMedia('(prefers-color-scheme: dark)');
  themeWatcher.addEventListener('change', () => applyTheme(btn));
  setInterval(() => applyTheme(btn), 1500);
})();
