(function() {
  /* ====== DETEKSI WARNA & KONTRAS ====== */
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

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function getContrastColor() {
    const bg = getCSSVar('--bg') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? '#000' : '#fff');
    const ink = getCSSVar('--ink') || (isColorDark(bg) ? '#fff' : '#000');
    return isColorDark(bg) ? ink : bg;
  }

  /* ====== CSS TAMBAHAN UNTUK DISQUS ====== */
  const style = document.createElement('style');
  style.textContent = `
  /* ====== TOMBOL KOMENTAR ====== */
  .comment-button-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 2.8rem 0;
  }

  .comment-button {
    font: inherit;
    background: none;
    border: 2px solid currentColor;
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    cursor: pointer;
    font-size: 1.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    backdrop-filter: blur(6px);
  }

  .comment-button:hover {
    transform: scale(1.08);
    opacity: 0.8;
  }

  /* ====== DISQUS THEME ADAPTATION ====== */
  #disqus_thread {
    transition: background-color 0.4s ease, color 0.4s ease;
    font-family: inherit !important;
    padding: 1rem;
    border-radius: 12px;
    margin-top: 1rem;
  }

  /* Light mode */
  @media (prefers-color-scheme: light) {
    #disqus_thread,
    #disqus_thread .post-content,
    #disqus_thread .post-body-inner,
    #disqus_thread .post-message {
      background: linear-gradient(to bottom right, #ffffff, #f7f7f7);
      color: #111 !important;
    }
    #disqus_thread a {
      color: #0366d6 !important;
    }
    #disqus_thread .author,
    #disqus_thread .time-ago,
    #disqus_thread .comment-footer__action {
      color: #222 !important;
    }
    #disqus_thread .post,
    #disqus_thread .post-body,
    #disqus_thread .post-content {
      border-color: rgba(0,0,0,0.1) !important;
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    #disqus_thread,
    #disqus_thread .post-content,
    #disqus_thread .post-body-inner,
    #disqus_thread .post-message {
      background: linear-gradient(to bottom right, #111, #1a1a1a);
      color: #e4e4e4 !important;
    }
    #disqus_thread a {
      color: #58a6ff !important;
    }
    #disqus_thread .author,
    #disqus_thread .time-ago,
    #disqus_thread .comment-footer__action {
      color: #ccc !important;
    }
    #disqus_thread .post,
    #disqus_thread .post-body,
    #disqus_thread .post-content {
      border-color: rgba(255,255,255,0.1) !important;
    }
    #disqus_thread .user {
      background-color: #333 !important;
      color: #fff !important;
    }
  }
  `;
  document.head.appendChild(style);

  /* ====== BUAT TOMBOL 💬 ====== */
  const wrapper = document.createElement('div');
  wrapper.className = 'comment-button-wrapper';

  const btn = document.createElement('button');
  btn.className = 'comment-button';
  btn.innerHTML = '💬';
  wrapper.appendChild(btn);

  const disqusDiv = document.getElementById('disqus_thread');
  disqusDiv.parentNode.insertBefore(wrapper, disqusDiv);

  function applyTheme() {
    const color = getContrastColor();
    btn.style.color = color;
    btn.style.borderColor = color;
  }
  applyTheme();

  const observer = new MutationObserver(applyTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  /* ====== DISQUS CONFIG ====== */
  window.disqus_config = function () {
    this.page.url = window.location.href;
    this.page.identifier = window.location.pathname;
  };

  /* ====== MUAT KOMENTAR SAAT TOMBOL DIKLIK ====== */
  let loaded = false;
  btn.addEventListener('click', () => {
    if (loaded) return;
    loaded = true;
    disqusDiv.style.display = 'block';
    setTimeout(() => disqusDiv.style.opacity = '1', 30);
    btn.disabled = true;
    wrapper.style.transition = 'opacity .4s ease, transform .4s ease';
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'scale(0.9)';
    setTimeout(() => wrapper.remove(), 400);

    const s = document.createElement('script');
    s.src = 'https://layarkosong.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (document.head || document.body).appendChild(s);
  });

  /* ====== MUAT COUNT.JS ====== */
  const countScript = document.createElement('script');
  countScript.src = 'https://layarkosong.disqus.com/count.js';
  countScript.id = 'dsq-count-scr';
  countScript.async = true;
  document.head.appendChild(countScript);
})();
