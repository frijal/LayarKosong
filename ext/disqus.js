// disqus.js — versi eksternal final
(function () {

  /* ------------------------------------------------------------
     1. Tambahkan CSS custom untuk tombol Disqus (aman & isolated)
  ------------------------------------------------------------ */
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --warna-teks-tombol: #222;
      --warna-bg-tombol: #f5f5f5;
      --warna-border-tombol: #ccc;
      --warna-hover-tombol: #e0e0e0;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --warna-teks-tombol: #eee;
        --warna-bg-tombol: #333;
        --warna-border-tombol: #555;
        --warna-hover-tombol: #444;
      }
    }
    .tombol-tanggapan {
      background-color: var(--warna-bg-tombol);
      border: 1px solid var(--warna-border-tombol);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--warna-teks-tombol);
      font-size: 15px;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color .25s ease;
      user-select: none;
      margin-bottom: 12px;
    }
    .tombol-tanggapan:hover {
      background-color: var(--warna-hover-tombol);
    }
  `;
  document.head.appendChild(style);


  /* ------------------------------------------------------------
     2. Cari elemen #disqus_thread (wajib)
  ------------------------------------------------------------ */
  const disqusDiv = document.getElementById('disqus_thread');
  if (!disqusDiv) return;

  disqusDiv.style.display = 'none';


  /* ------------------------------------------------------------
     3. Buat tombol komentar + counter
  ------------------------------------------------------------ */
  const btn = document.createElement('button');
  btn.className = 'tombol-tanggapan';
  btn.innerHTML = `💬`;

  const countSpan = document.createElement('span');
  countSpan.className = 'jumlah-tanggapan disqus-comment-count';
  countSpan.dataset.disqusIdentifier = location.pathname;

  btn.appendChild(countSpan);

  // Sisipkan tombol sebelum Disqus
  disqusDiv.parentNode.insertBefore(btn, disqusDiv);


  /* ------------------------------------------------------------
     4. Lazy-load count.js (tidak mengganggu render utama)
  ------------------------------------------------------------ */
  function loadCountScript() {
    const sc = document.createElement('script');
    sc.src = 'https://layarkosong.disqus.com/count.js';
    sc.id = 'dsq-count-scr';
    sc.async = true;
    document.head.appendChild(sc);
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadCountScript);
  } else {
    setTimeout(loadCountScript, 200);
  }


  /* ------------------------------------------------------------
     5. Load Disqus embed saat tombol ditekan
  ------------------------------------------------------------ */
  let disqusLoaded = false;

  function loadDisqus() {
    if (disqusLoaded) return;
    disqusLoaded = true;

    window.disqus_config = function () {
      this.page.url = location.href;
      this.page.identifier = location.pathname;
    };

    disqusDiv.style.display = 'block';

    const s = document.createElement('script');
    s.src = 'https://layarkosong.disqus.com/embed.js';
    s.setAttribute('data-timestamp', Date.now());
    (document.body || document.head).appendChild(s);

    btn.remove();
  }

  btn.addEventListener('click', loadDisqus);

})();
