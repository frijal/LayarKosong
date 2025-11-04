(function() {
  // 🔹 Fungsi: Sesuaikan warna tombol dengan tema situs
  function applyTheme(btn) {
    const root = getComputedStyle(document.documentElement);
    const primary = root.getPropertyValue('--color-primary')?.trim() || '#0078ff';
    const text = root.getPropertyValue('--text-color')?.trim() || '#fff';

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isBodyDark = document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');

    if (isDark || isBodyDark) {
      btn.style.background = primary || '#444';
      btn.style.color = text || '#f1f1f1';
      btn.style.boxShadow = '0 4px 10px rgba(255,255,255,0.1)';
    } else {
      btn.style.background = primary || '#0078ff';
      btn.style.color = text || '#fff';
      btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
    }
  }

  // 🔹 Buat tombol tanggapan
  const btn = document.createElement('button');
  btn.id = 'show-comments';
  btn.innerHTML = '💬 <span class="disqus-comment-count" data-disqus-identifier="' + window.location.pathname + '"></span> tanggapan';
  btn.style.cssText = `
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:6px;
    font-size:1rem;
    padding:10px 20px;
    border:none;
    border-radius:9999px;
    cursor:pointer;
    transition:all 0.3s ease;
    position:relative;
    overflow:hidden;
  `;

  applyTheme(btn);

  // 🔹 Bungkus tombol di tengah
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display:flex;
    justify-content:center;
    align-items:center;
    margin:2rem 0;
  `;
  wrapper.appendChild(btn);

  // 🔹 Sembunyikan Disqus dulu
  const disqusDiv = document.getElementById('disqus_thread');
  if (disqusDiv) {
    disqusDiv.style.display = 'none';
    disqusDiv.parentNode.insertBefore(wrapper, disqusDiv);
  }

  // 🔹 Muat count.js (untuk jumlah tanggapan)
  const countScript = document.createElement('script');
  countScript.src = 'https://layarkosong.disqus.com/count.js';
  countScript.id = 'dsq-count-scr';
  countScript.async = true;
  document.head.appendChild(countScript);

  // 🔹 Konfigurasi dasar Disqus
  window.disqus_config = function () {
    this.page.url = window.location.href;
    this.page.identifier = window.location.pathname;
  };

  // 🔹 Klik tombol = tampilkan tanggapan
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

    // Tombol fade out
    wrapper.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    wrapper.style.transform = 'scale(0.9)';
    wrapper.style.opacity = '0';
    setTimeout(() => wrapper.remove(), 500);
  }

  btn.addEventListener('click', loadDisqus);

  // 🔹 Deteksi perubahan tema otomatis
  const themeWatcher = window.matchMedia('(prefers-color-scheme: dark)');
  themeWatcher.addEventListener('change', () => applyTheme(btn));

  // 🔹 Perbarui warna jika tema situs berubah manual (misal class .dark)
  setInterval(() => applyTheme(btn), 1000);
})();

