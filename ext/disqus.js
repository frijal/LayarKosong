<script>
(function() {
  // ===== Deteksi kecerahan warna =====
  function isColorDark(hex) {
    if (!hex) return true;
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
    return luminance < 0.5;
  }

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function getContrastColor() {
    const bg = getCSSVar('--bg') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? '#000' : '#fff');
    const ink = getCSSVar('--ink') || (isColorDark(bg) ? '#fff' : '#000');
    return isColorDark(bg) ? ink : bg;
  }

  // ===== Wrapper tombol =====
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display:flex;
    justify-content:center;
    align-items:center;
    margin:2.4rem 0;
    width:100%;
    text-align:center;
  `;

  // ===== Tombol 💬 + counter =====
  const btn = document.createElement('button');
  btn.id = 'show-comments';
  btn.style.cssText = `
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:0.4rem;
    font: inherit;
    font-size:1.6rem;
    padding:0 1.2rem;
    height:3.4rem;
    border-radius:2rem;
    border:2px solid;
    background:transparent;
    cursor:pointer;
    transition:transform .25s ease, opacity .25s ease;
    -webkit-tap-highlight-color: transparent;
  `;
  btn.innerHTML = `
    💬&nbsp; <span class="disqus-comment-count" 
      data-disqus-url="${window.location.href}" 
      style="font-size:1.3rem;opacity:0.8;"></span>
  `;

  wrapper.appendChild(btn);

  // ===== Sisipkan sebelum Disqus =====
  function insertButton() {
    const disqusDiv = document.getElementById('disqus_thread');
    if (!disqusDiv || !disqusDiv.parentNode) {
      setTimeout(insertButton, 300);
      return;
    }
    disqusDiv.style.display = 'none';
    disqusDiv.style.transition = 'opacity .6s ease';
    disqusDiv.parentNode.insertBefore(wrapper, disqusDiv);
  }
  insertButton();

  // ===== Tema =====
  function applyTheme() {
    const color = getContrastColor();
    btn.style.color = color;
    btn.style.borderColor = color;
  }
  applyTheme();

  // ===== Efek tekan =====
  function pressEffect() { btn.style.transform = 'scale(0.92)'; btn.style.opacity = '0.6'; }
  function releaseEffect() { btn.style.transform = 'scale(1)'; btn.style.opacity = '1'; }
  btn.addEventListener('touchstart', pressEffect, {passive:true});
  btn.addEventListener('touchend', releaseEffect, {passive:true});
  btn.addEventListener('mousedown', pressEffect);
  btn.addEventListener('mouseup', releaseEffect);
  btn.addEventListener('mouseleave', releaseEffect);

  // ===== Konfigurasi Disqus =====
  window.disqus_config = function () {
    this.page.url = window.location.href;
    this.page.identifier = window.location.pathname;
  };

  // ===== Muat count.js =====
  const countScript = document.createElement('script');
  countScript.src = 'https://layarkosong.disqus.com/count.js';
  countScript.id = 'dsq-count-scr';
  countScript.async = true;
  document.body.appendChild(countScript);

  // ===== Klik untuk tampilkan komentar =====
  let disqusLoaded = false;
  btn.addEventListener('click', () => {
    if (disqusLoaded) return;
    disqusLoaded = true;
    const disqusDiv = document.getElementById('disqus_thread');
    disqusDiv.style.display = 'block';
    setTimeout(() => disqusDiv.style.opacity = '1', 50);

    const s = document.createElement('script');
    s.src = 'https://layarkosong.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (document.head || document.body).appendChild(s);

    wrapper.style.transition = 'opacity .4s ease, transform .4s ease';
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'scale(0.9)';
    setTimeout(() => wrapper.remove(), 400);
  });

  // ===== Pantau perubahan tema =====
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener ? mq.addEventListener('change', applyTheme)
                      : mq.addListener(applyTheme);
})();
</script>

