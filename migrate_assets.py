mapping = {
    # 1. Pindahkan semua Prism ke Highlight.js (Github Dark atau Atom One)
    r'https?://.*/prism-vsc-dark-plus\.min\.css': '/ext/github-dark.min.css',
    r'https?://.*/prism-tomorrow\.min\.css': '/ext/atom-one-dark.min.css',
    r'https?://.*/prism\.min?\.css': '/ext/github.min.css',
    r'https?://.*/prism-okaidia\.min\.css': '/ext/monokai.min.css',
    
    # 2. Rapikan Font Awesome yang masih "jajan" di luar
    r'https?://site-assets\.fontawesome\.com/releases/v7\.0\.0/css/all\.css': '/ext/fontawesome.css',
    r'https?://cdn\.jsdelivr\.net/npm/@fortawesome/.*all\.min\.css': '/ext/fontawesome.css',
    
    # 3. Konsolidasi Highlight.js versi lama ke /ext/ lokal
    r'https?://.*/highlight\.js/@11\.9\.0/.*\.css': '/ext/github-dark-dimmed.min.css',
    r'https?://.*/highlight\.js/11\.11\.1/styles/atom-one-dark\.min\.css': '/ext/atom-one-dark.min.css',
    
    # 4. Tangkap sisa-sisa plugin lain
    r'https?://.*/basiclightbox@.*/basicLightbox\.min\.css': '/ext/lightbox.css',
}
