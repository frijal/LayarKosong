  // Konfigurasi halaman untuk Disqus
  var disqus_config = function () {
    this.page.url = window.location.href;  
    this.page.identifier = window.location.pathname;
  };

  // Fungsi untuk memuat script Disqus
  function loadDisqus() {
    if (window.disqusLoaded) return; // cegah duplikat load
    window.disqusLoaded = true;

    const d = document, s = d.createElement('script');
    s.src = 'https://layarkosong.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
  }

  // Gunakan IntersectionObserver untuk lazy load Disqus
  const komentarSection = document.getElementById('disqus_thread');

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadDisqus();
        observer.unobserve(komentarSection); // berhenti mengamati
      }
    });
  }, { threshold: 1 }); // aktif saat 10% area terlihat

  observer.observe(komentarSection);
