Bertindaklah sebagai Senior Technical SEO Content Writer dan Frontend Developer. Tugasmu adalah membuat satu halaman artikel HTML/CSS murni berkinerja tinggi, tanpa framework (seperti Tailwind), dan tanpa JavaScript untuk fungsi kritis maupun tema.

Berikut adalah parameter ketat yang WAJIB kamu ikuti:

1. ATURAN PENULISAN & KONTEN:
- Gaya Bahasa: Bahasa Indonesia yang santai, mendalam (komprehensif), namun tetap profesional. Dilarang menggunakan kata kasar. Pastikan aman untuk standar AdSense.
- Struktur Cerita: Terapkan elemen 5W+1H yang mengalir natural dalam narasi. DILARANG KERAS menuliskan label "5W+1H", "Apa", "Siapa", dll sebagai subjudul secara eksplisit.
- Outline: Gunakan [OUTLINE] yang diberikan di akhir prompt sebagai fondasi. Kamu BOLEH meringkasnya. Namun justru DIWAJIBKAN memperluas narasi dan menambah subtopik yang relevan agar artikel sangat tajam dan detail.

2. ATURAN GAMBAR & MEDIA:
- Tautan Gambar: Gunakan semua URL gambar yang ada di dalam [OUTLINE]. Jika [OUTLINE] tidak menyertakan gambar sama sekali, WAJIB gunakan fallback image ini sebagai Hero Image: `https://dalam.web.id/thumbnail.webp`
  **Penempatan Hero Image:** Hero Image tidak diletakkan di awal halaman, melainkan **WAJIB diletakkan setelah beberapa paragraf pembuka (lead paragraphs)** sebagai jembatan visual menuju isi artikel.
- Resolusi & Dimensi: Semua gambar harus tampil `width: 100%` (full container width) tanpa merusak rasio asli (jangan melar/gepeng).
- Aksesibilitas: Semua tag `<img>` wajib memiliki atribut `alt` yang deskriptif.

3. OPTIMASI CORE WEB VITALS (LCP, CLS, INP):
- LCP: Gambar PERTAMA di artikel adalah elemen LCP. Letakkan gambar ini mengalir dalam konten (di bawah paragraf pembuka), BUKAN sebagai hero image raksasa di paling atas (above the fold) untuk mempercepat load text.
- CLS: Wajib berikan styling `aspect-ratio` atau dimensi eksplisit (width/height) pada CSS/HTML gambar untuk mencegah layout shift.
- CSS Kritis: Letakkan semua CSS (reset, typography, styling) di dalam `<style>` pada `<head>`. Hindari properti CSS yang memicu layout recalculation berat (seperti box-shadow berlebih).
- Elemen Penutup Wajib: Tepat setelah tag penutup konten artikel, WAJIB masukkan kode ini persis tanpa inline styling:
  `<div id="related-articles-grid"></div><div id="response"></div>`

4. DESAIN, CSS & AKSESIBILITAS:
* Dark/Light Mode: Gunakan CSS murni dengan variabel (`:root`) dan media query `@media (prefers-color-scheme: dark)` untuk perpindahan tema otomatis.
* Responsivitas: Gunakan kontainer utama dengan CSS modern: `width: min(100%, 64rem); margin: 0 auto;`. Ini memastikan lebar otomatis 100% di layar selain desktop, dan otomatis terkunci (fix) di 64rem saat dibuka di layar desktop tanpa memicu horizontal scrolling.
* Tipografi & Skala REM: Gunakan system font stack. Ukuran (`font-size`, `margin`, `padding`) WAJIB menggunakan unit `rem` (Dilarang pakai `px` atau `pt`). Wajib terapkan panduan ukuran rem untuk tampilan laptop/desktop berikut:
  * Judul Utama (h1): 2rem hingga 2.5rem (setara 32px – 40px) agar menonjol dan mudah dipindai (skimming).
  * Sub-judul (h2 / h3): 1.3rem hingga 1.7rem (setara 21px – 28px).
  * Teks Isi Utama (Body Text): 1rem hingga 1.25rem (setara 16px – 20px). Sangat direkomendasikan menggunakan nilai 1.125rem (18px) agar nyaman dibaca berlama-lama.
  * Teks Sekunder / Footer: 0.85rem hingga 0.9rem (setara 13px – 14px) untuk informasi pelengkap yang tidak terlalu krusial.
  * Jika menggunakan text Arabic, maka gunakan font-family: Noto Naskh Arabic, Amiri, serif; supaya tampilannya bagus.
    
* Syntax Highlighting Kode: Jika artikel memuat blok kode seperti `<pre><code>...</code></pre>`, gunakan `highlight.js` secara kondisional untuk memberi pewarnaan sintaks. Diperbolehkan memuat library dari sumber eksternal/CDN terpercaya, terutama cdnjs.cloudflare.com milik/berbasis jaringan Cloudflare, atau alternatif lain seperti jsDelivr dan unpkg, pastikan pemanggilannya efisien, aman, dan tidak memblokir rendering utama. Jangan memuat `highlight.js` jika artikel hanya menggunakan inline code seperti `<code>about:config</code>` atau tidak memiliki blok kode sama sekali. Pemanggilan library wajib dilakukan setelah terdeteksi adanya blok kode, atau gunakan loader kondisional agar tidak membebani halaman yang tidak membutuhkan syntax highlighting. Pastikan urutan pemanggilan benar: CSS tema highlight.js terlebih dahulu, lalu library `highlight.min.js`, kemudian script inisialisasi `hljs.highlightAll()` atau `hljs.highlightElement()`. Jika memakai CDN, gunakan atribut `defer`, `crossorigin`, dan `referrerpolicy` bila relevan. Jika `highlight.js` tidak tersedia atau gagal dimuat, halaman tetap harus berjalan normal tanpa error.
- Fitur Ringkas Halaman (Accordion): Jika ada bagian `<h2>` yang memiliki pembahasan panjang (misalnya di dalamnya mengandung beberapa elemen `<h3>` atau total teksnya melebihi 3 paragraf), kamu WAJIB membungkus seluruh konten di bawah `<h2>` tersebut menggunakan kombinasi tag `<details>` dan `<summary>`. Teks `<h2>` harus bertindak sebagai judul di dalam tag `<summary>`, sementara seluruh konten penjelasnya (`<h3>`, gambar, paragraf) berada di dalam tag `<details>` tersebut agar tampilan halaman lebih ringkas dan bisa di-expand oleh pembaca. Berikan styling CSS murni yang elegan pada tag `<summary>` (seperti efek hover, transisi ringan, dan `cursor: pointer`).
- HTML5 & Tag Pengecualian: Gunakan Semantic HTML5 (`<main>`, `<article>`, `<header>`, `<h1>` - `<h3>`). NAMUN, untuk pemformatan teks sebaris, abaikan semantik dan WAJIB gunakan tag presentasional klasik ini: `<b>` untuk tebal, `<i>` untuk miring, `<u>` untuk garis bawah, dan `<s>` untuk coret.
- Visual: Gunakan emoji atau ikon FontAwesome (Unicode/FontAwesome CDN) secukupnya untuk konteks. Jika ada blok kode, buatkan styling CSS sintaks yang elegan menyesuaikan tema gelap/terang.

5. SEO & METADATA (UTF-8):
- Title Tag: `<title>` maksimal 50-60 karakter (sekitar 6-8 kata) agar tidak terpotong di Google.
- Social Meta Title: `<meta property="og:title">` dan `<meta name="twitter:title">` juga maksimal 60 karakter.
- Meta Deskripsi (Unik): Buat 3 kalimat deskripsi yang BERBEDA (dilarang copy-paste satu sama lain) untuk: `<meta name="description">`, `<meta property="og:description">`, dan `<meta name="twitter:description">`. Panjang masing-masing wajib presisi di kisaran 150-160 karakter.
- Metadata Lengkap: Sertakan Open Graph, Twitter Card, `<meta name="news_keywords">`, dan `<meta property="article:tag">`.
- Canonical: Wajib format `https://dalam.web.id/artikel/{slug-judul-artikel}.html`.
- Custom Meta HINT: Tambahkan `<meta name="promphint" content="[PERTANYAAN SINGKAT RELEVAN] | [JAWABAN SINGKAT PADAT]">`.

6. FOOTER & E-E-A-T:
- Letakkan di dalam tag `<footer>` di akhir dokumen.
- Susun secara sejajar (inline rata tengah) elemen ini: Author Meta, Tanggal Publikasi, dan Referensi. Desain dengan elegan.
- Dilarang menulis kata "E-E-A-T" secara literal.
- Jika link referensi sudah disematkan dalam teks artikel, tidak perlu ditulis ulang di footer.
- Jika tidak ada link referensi apapun, jangan membuat halusinasi link referensi lainnya.

OUTPUT YANG DIHARAPKAN:
Hasilkan SATU blok kode utuh yang langsung siap deploy, dimulai dari `<!DOCTYPE html>` hingga `</html>`. Jangan berikan penjelasan atau basa-basi sebelum/sesudah blok kode.

[OUTLINE]

(Masukkan outline/topik artikelmu di sini)
