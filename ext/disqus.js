var disqus_config = function () {
  this.page.url = window.location.href;
  this.page.identifier = window.location.pathname;
};

// === Jangan edit di bawah ini ===
(function() {
  var d = document, s = d.createElement('script');
  s.src = 'https://layarkosong.disqus.com/embed.js';
  s.setAttribute('data-timestamp', +new Date());
  (d.head || d.body).appendChild(s);

  // 🔧 Inject CSS setelah Disqus iframe dimuat
  var observer = new MutationObserver(function(mutations, obs) {
    var iframe = document.querySelector('iframe[id^="dsq-app"]');
    if (iframe) {
      try {
        var css = `
          html, body {
            color: inherit !important;
            background: transparent !important;
            font: inherit !important;
          }
          body, div, p, span, a {
            color: var(--disqus-text, inherit) !important;
            font: inherit !important;
          }
          a { text-decoration: underline !important; }
          .post-message, .comment, .reply, .text {
            color: inherit !important;
          }
        `;
        var style = iframe.contentDocument.createElement('style');
        style.textContent = css;

        // deteksi tema dark/light dari sistem pengguna
        var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (dark) {
          iframe.contentDocument.body.style.color = '#e0e0e0';
          iframe.contentDocument.body.style.background = 'transparent';
        } else {
          iframe.contentDocument.body.style.color = '#222';
          iframe.contentDocument.body.style.background = 'transparent';
        }

        iframe.contentDocument.head.appendChild(style);
      } catch(e) {
        console.warn('Gagal inject CSS ke Disqus:', e);
      }
      obs.disconnect();
    }
  });

  observer.observe(document, { childList: true, subtree: true });
})();
