(function() {
  // 🔹 Fungsi untuk menghitung kontras sederhana dari warna hex
  function isColorDark(hex) {
    if (!hex) return true;
    hex = hex.replace('#', '');
    if (hex.length === 3)
      hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  // 🔹 Ambil nilai CSS variable --bg dan --fg
  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // 🔹 Tentukan warna yang kontras untuk tombol
  function getContrastColor() {
    const bg = getCSSVar('--bg') || '#000';
    const fg = getCSSVar('--fg') || '#fff';
    const dark = isColorDark(bg);
    return dark ? fg : bg;
  }

  // 🔹 Buat tombol minimalis
  const btn = document.createElement('button');
  btn.id = 'show-comments';
  btn.innerHTML = '💬 <span class="disqus-comment-count" data-disqus-identifier="' + window.location.pathname + '"></span>';
  btn.style.cssText = `
    display:inline-flex;
    align-items:center;
    justify-content:center;
    font: inherit;
    font-size:1.3rem;
    padding:10px 18px;
    border-radius:9999px;
    border:1.8px solid;
    background:transparent;
    cursor:pointer;
    transition:all .25s ease;
    position:relative;
  `;

  // 🔹 Terapkan warna kontras terhadap latar
  function applyTheme() {
    const color = getContrastColor();
    btn.style.color = color;
    btn.style.borderColor = color;
  }
  applyTheme();

  // Efek hover halus
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.08)';
    btn.style.opacity = '0.85';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.opacity = '1';
  });

  // 🔹 Bungkus tombol di tengah
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display:flex;
    justify-content:center;
    align-items:center;
    margin:2.5rem 0;
  `;
  wrapper.appendChild(btn);

  // 🔹 Sembunyikan kolom komentar dulu
  const disqusDiv = document.getElementById('disqus_thread');
  if (disqusDiv) {
    disqusDiv.style.display = 'none';
    disqusDiv.parentNode.insertBefore(wrapper, disqusDiv);
  }

  // 🔹 Muat jumlah komentar (count.js)
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

  // 🔹 Klik tombol untuk menampilkan komentar
  let disqusLoaded = false;
  btn.addEventListener('click', () => {
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
  });

  // 🔹 Deteksi perubahan warna tema (misal via JS atau prefers-color-scheme)
  const observer = new MutationObserver(applyTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
})();
