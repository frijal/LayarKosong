/**
* RECOMMENDED CONFIGURATION VARIABLES
* Variabel-variabel ini sekarang diisi secara otomatis.
*/
var disqus_config = function () {

    // Mengambil URL lengkap halaman saat ini
    // contoh: https://domain-anda.com/artikel/tutorial-linux.html
    this.page.url = window.location.href;  
    
    // Mengambil path halaman sebagai ID unik
    // contoh: /artikel/tutorial-linux.html
    this.page.identifier = window.location.pathname; 
};

(function() { // JANGAN EDIT DI BAWAH BARIS INI
var d = document, s = d.createElement('script');
s.src = 'https://layarkosong.disqus.com/embed.js';
s.setAttribute('data-timestamp', +new Date());
(d.head || d.body).appendChild(s);
})();
