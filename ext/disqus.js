(function() {
  // Fungsi bantu untuk mendeteksi kecerahan warna
  function isColorDark(hex) {
    if (!hex) return true;
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  // Ambil CSS variable
  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // Warna bingkai otomatis berlawanan dengan background
  function getContrastColor() {
    const bg = getCSSVar('--bg') || '#000';
    const ink = getCSSVar('--ink') || '#fff';
    return isColorDark(bg) ? ink : bg;
  }

  // Buat tombol 💬
  const btn = document.createElement('button');
  btn.id = 'show-comments';
  btn.innerHTML = '💬&nbsp;<span class="disqus-comment-count" data-disqus-identifier="' + window.location.pathname + '"></span>';
  btn.style.cssText = `
    display:inline-flex;
    align-items:center;
    justify-content:center;
    font: inherit;
    font-size:1.4rem;
    padding:10px 18px;
    border-radius:9999px;
    border:1.8px solid;
    background:transparent;
    cursor:pointer;
    transition:all .3s ease;
    position:relative;
    backdrop-filter: blur(6px);
  `;

  // Terapkan warna otomatis kontras dengan background
  function applyTheme() {
    const color = getContrastColor();
    btn.style.color = color;
    btn.style.borderColor = color;
  }
  applyTheme();

  // Efek hover halus
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.08)';
    btn.style.opacity = '0.8';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.opacity = '1';
  });

  // Bungkus di tengah
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display:flex;
    justify-content:center;
    align-items:center;
    margin:2.8rem 0;
  `;
  wrapper.appendChild(btn);

  // Tempat komentar
  const disqusDiv = document.getElementById('disqus_thread');
  if (disqusDiv) {
    disqusDiv.style.display = 'none';
    disqusDiv.style.transition = 'opacity .6s ease';
    disqusDiv.parentNode.insertBefore(wrapper, disqusDiv);
  }

  // Muat count.js untuk menghitung komentar
  const countScript = document.createElement('script');
  countScript.src = 'https://layarkosong.disqus.com/count.js';
  countScript.id = 'dsq-count-scr';
  countScript.async = true;
  document.head.appendChild(countScript);

  // Konfigurasi Disqus
  window.disqus_config = function () {
    this.page.url = window.location.href;
    this.page.identifier = window.location.pathname;
  };

  // Klik tombol untuk menampilkan kolom komentar
  let disqusLoaded = false;
  btn.addEventListener('click', () => {
    if (disqusLoaded) return;
    disqusLoaded = true;
    disqusDiv.style.display = 'block';
    setTimeout(() => disqusDiv.style.opacity = '1', 30);

    const s = document.createElement('script');
    s.src = 'https://layarkosong.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (document.head || document.body).appendChild(s);

    wrapper.style.transition = 'opacity .4s ease, transform .4s ease';
    wrapper.style.transform = 'scale(0.9)';
    wrapper.style.opacity = '0';
    setTimeout(() => wrapper.remove(), 400);
  });

  // Perhatikan perubahan tema (prefers-color-scheme, dsb)
  const observer = new MutationObserver(applyTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
})();

