// disqus.js
(function() {
  // Sisipkan CSS ke dalam <head>
  const style = document.createElement('style');
  style.textContent = `
    :root {
      /* Light mode defaults */
      --warna-teks-tombol: #222;
      --warna-bg-tombol: #f5f5f5;
      --warna-border-tombol: #ccc;
      --warna-hover-tombol: #e0e0e0;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        /* Dark mode overrides */
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
      justify-content: center;
      color: var(--warna-teks-tombol);
      font-size: inherit;
      line-height: 1;
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.3s, color 0.3s;
    }
    .tombol-tanggapan:hover {
      background-color: var(--warna-hover-tombol);
    }
    .jumlah-tanggapan {
      margin-left: 4px;
      font-weight: 500;
    }
  `;
  document.head.appendChild(style);

  // Buat tombol komentar
  const btn = document.createElement('button');
  btn.className = 'tombol-tanggapan';
  btn.innerHTML = '💬';

  // Span untuk hitungan komentar
  const countSpan = document.createElement('span');
  countSpan.className = 'jumlah-tanggapan disqus-comment-count';
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

    // Tampilkan langsung tanpa animasi
    disqusDiv.style.display = 'block';

    // Muat embed.js
    const s = document.createElement('script');
    s.src = 'https://layarkosong.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (document.head || document.body).appendChild(s);

    // Hilangkan tombol langsung tanpa animasi
    btn.remove();
  }

  btn.addEventListener('click', loadDisqus);
})();
