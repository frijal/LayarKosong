// disqus.js
(function() {
  // Sisipkan CSS ke dalam <head>
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --btn-text-color: #222; /* default untuk light mode */
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --btn-text-color: #eee; /* default untuk dark mode */
      }
    }
    #show-comments {
      background: transparent;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--btn-text-color);
      font-size: inherit;
      line-height: 1;
      padding: 5px 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
  `;
  document.head.appendChild(style);

  // Buat tombol komentar
  const btn = document.createElement('button');
  btn.id = 'show-comments';
  btn.innerHTML = '💬&nbsp;';

  // Span untuk hitungan komentar
  const countSpan = document.createElement('span');
  countSpan.className = 'disqus-comment-count';
  countSpan.dataset.disqusIdentifier = window.location.pathname;
  btn.appendChild(countSpan);

  // Sisipkan tombol sebelum kolom komentar
  const disqusDiv = document.getElementById('disqus_thread');
  if (disqusDiv) {
    disqusDiv.style.display = 'none';
    disqusDiv.parentNode.insertBefore(btn, disqusDiv);
  }

  // Muat count.js saat idle (optimisasi)
  function loadCountScript() {
    const countScript = document.createElement('script');
    countScript.src = 'https://layarkosong.disqus.com/count.js';
    countScript.id = 'dsq-count-scr';
    countScript.async = true;
    document.head.appendChild(countScript);
  }
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadCountScript);
  } else {
    setTimeout(loadCountScript, 200);
  }

  // Fungsi untuk memuat embed Disqus saat tombol diklik
  let disqusLoaded = false;
  function loadDisqus() {
    if (disqusLoaded) return;
    disqusLoaded = true;

    window.disqus_config = function () {
      this.page.url = window.location.href;
      this.page.identifier = window.location.pathname;
    };

    // Animasi fade-in
    disqusDiv.style.display = 'block';
    disqusDiv.style.opacity = '0';
    disqusDiv.style.transition = 'opacity 0.6s ease';
    setTimeout(() => disqusDiv.style.opacity = '1', 10);

    // Muat embed.js
    const s = document.createElement('script');
    s.src = 'https://layarkosong.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (document.head || document.body).appendChild(s);

    // Hilangkan tombol dengan animasi
    btn.style.transition = 'all 0.5s ease';
    btn.style.transform = 'scale(0.9)';
    btn.style.opacity = '0';
    setTimeout(() => btn.remove(), 500);
  }

  btn.addEventListener('click', loadDisqus);
})();
